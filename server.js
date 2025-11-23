const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { pool } = require('./db');
require('dotenv').config();

// Initialize Stripe (optional - only if keys are configured)
let stripe = null;
const stripeConfigured = process.env.STRIPE_SECRET_KEY &&
                         !process.env.STRIPE_SECRET_KEY.includes('your_stripe');
if (stripeConfigured) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized');
} else {
  console.log('⚠️ Stripe not configured - subscription features disabled');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet security headers (configured for development/production)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://a.espncdn.com", "https://*.espncdn.com", "https://*.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting - general API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGIN : true,
  credentials: true
}));
app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));

// ============================================
// SESSION CONFIGURATION
// ============================================

const sessionSecret = process.env.SESSION_SECRET || 'gridtv-sports-secret-change-in-production';

app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15 // Prune expired sessions every 15 minutes
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset session expiration on every request
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (extended from 24 hours)
    sameSite: 'lax'
  },
  name: 'gridtv.sid'
}));

// Set UTF-8 for all responses
app.use((_req, res, next) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }

  // Check if it's an API request
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Redirect to login for page requests
  return res.redirect('/login.html');
}

// ============================================
// AUTH ROUTES
// ============================================

// Check authentication status
app.get('/api/auth/check', async (req, res) => {
  if (req.session && req.session.userId) {
    try {
      // Get subscription status
      const result = await pool.query(
        'SELECT subscription_status, subscription_plan, trial_ends_at FROM users WHERE id = $1',
        [req.session.userId]
      );

      const user = result.rows[0] || {};
      const now = new Date();
      let daysRemaining = 0;

      if (user.subscription_status === 'trial' && user.trial_ends_at) {
        const trialEnd = new Date(user.trial_ends_at);
        if (trialEnd > now) {
          daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        }
      }

      return res.json({
        authenticated: true,
        user: {
          id: req.session.userId,
          email: req.session.userEmail,
          displayName: req.session.displayName
        },
        subscription: {
          status: user.subscription_status || 'trial',
          plan: user.subscription_plan,
          daysRemaining
        }
      });
    } catch (error) {
      console.error('Auth check error:', error);
      return res.json({
        authenticated: true,
        user: {
          id: req.session.userId,
          email: req.session.userEmail,
          displayName: req.session.displayName
        }
      });
    }
  }
  res.status(401).json({ authenticated: false });
});

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, display_name, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Set session
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.displayName = user.display_name;

    console.log(`✅ User logged in: ${user.email}`);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Register
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if email already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Calculate trial end date (10 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 10);

    // Create user with trial period
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, subscription_status, trial_ends_at)
       VALUES ($1, $2, $3, 'trial', $4)
       RETURNING id, email, display_name, subscription_status, trial_ends_at`,
      [email.toLowerCase(), passwordHash, displayName || email.split('@')[0], trialEndsAt]
    );

    console.log(`✅ New user registered: ${email} (Trial ends: ${trialEndsAt.toDateString()})`);

    res.json({
      success: true,
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        displayName: result.rows[0].display_name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const userEmail = req.session?.userEmail;

  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    res.clearCookie('gridtv.sid');
    console.log(`👋 User logged out: ${userEmail || 'unknown'}`);
    res.json({ success: true });
  });
});

// ============================================
// SUBSCRIPTION MIDDLEWARE
// ============================================

async function checkSubscription(req, res, next) {
  if (!req.session || !req.session.userId) {
    return next(); // Auth middleware will handle this
  }

  try {
    const result = await pool.query(
      'SELECT subscription_status, trial_ends_at, subscription_ends_at FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return next();
    }

    const user = result.rows[0];
    const now = new Date();

    // Check if user has active subscription
    if (user.subscription_status === 'active') {
      return next();
    }

    // Check if trial is still valid
    if (user.subscription_status === 'trial' && user.trial_ends_at) {
      if (new Date(user.trial_ends_at) > now) {
        return next(); // Trial still active
      } else {
        // Trial expired - update status
        await pool.query(
          "UPDATE users SET subscription_status = 'expired' WHERE id = $1",
          [req.session.userId]
        );
      }
    }

    // Subscription expired or trial ended
    req.subscriptionExpired = true;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    next();
  }
}

// ============================================
// SUBSCRIPTION API ROUTES
// ============================================

// Get subscription status
app.get('/api/subscription/status', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await pool.query(
      `SELECT subscription_status, subscription_plan, trial_ends_at, subscription_ends_at, stripe_customer_id
       FROM users WHERE id = $1`,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const now = new Date();

    // Calculate days remaining
    let daysRemaining = 0;
    let isActive = false;

    if (user.subscription_status === 'trial' && user.trial_ends_at) {
      const trialEnd = new Date(user.trial_ends_at);
      if (trialEnd > now) {
        daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        isActive = true;
      }
    } else if (user.subscription_status === 'active' && user.subscription_ends_at) {
      const subEnd = new Date(user.subscription_ends_at);
      if (subEnd > now) {
        daysRemaining = Math.ceil((subEnd - now) / (1000 * 60 * 60 * 24));
        isActive = true;
      }
    }

    res.json({
      status: user.subscription_status,
      plan: user.subscription_plan,
      trialEndsAt: user.trial_ends_at,
      subscriptionEndsAt: user.subscription_ends_at,
      daysRemaining,
      isActive,
      hasStripeCustomer: !!user.stripe_customer_id
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Get available plans
app.get('/api/subscription/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'monthly',
        name: 'Monthly',
        price: 9.99,
        priceId: process.env.STRIPE_MONTHLY_PRICE_ID,
        interval: 'month',
        features: [
          'All live sports games',
          'NFL, NBA, MLB, NHL coverage',
          'College sports included',
          'Real-time score updates'
        ]
      },
      {
        id: 'yearly',
        name: 'Yearly',
        price: 99.99,
        priceId: process.env.STRIPE_YEARLY_PRICE_ID,
        interval: 'year',
        savings: '17%',
        features: [
          'All live sports games',
          'NFL, NBA, MLB, NHL coverage',
          'College sports included',
          'Real-time score updates',
          '2 months free!'
        ]
      }
    ]
  });
});

// Create checkout session
app.post('/api/subscription/create-checkout', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment system not configured. Please try again later.' });
  }

  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { planId } = req.body;

    if (!planId || !['monthly', 'yearly'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const priceId = planId === 'monthly'
      ? process.env.STRIPE_MONTHLY_PRICE_ID
      : process.env.STRIPE_YEARLY_PRICE_ID;

    // Get user info
    const userResult = await pool.query(
      'SELECT email, stripe_customer_id FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    let customerId = user.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: req.session.userId.toString() }
      });
      customerId = customer.id;

      // Save customer ID to database
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, req.session.userId]
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.protocol}://${req.get('host')}/subscription?success=true`,
      cancel_url: `${req.protocol}://${req.get('host')}/pricing?canceled=true`,
      metadata: {
        userId: req.session.userId.toString(),
        planId: planId
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create customer portal session (for managing subscription)
app.post('/api/subscription/portal', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment system not configured. Please try again later.' });
  }

  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const userResult = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userResult.rows[0].stripe_customer_id,
      return_url: `${req.protocol}://${req.get('host')}/subscription`,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get Stripe publishable key
app.get('/api/subscription/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// ============================================
// STRIPE WEBHOOK HANDLER
// ============================================

// Note: Webhook needs raw body, so we handle it before JSON parsing
app.post('/api/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (userId) {
          try {
            // Get subscription details
            const subscription = await stripe.subscriptions.retrieve(session.subscription);

            await pool.query(
              `UPDATE users SET
                subscription_status = 'active',
                subscription_plan = $1,
                subscription_ends_at = to_timestamp($2)
               WHERE id = $3`,
              [planId, subscription.current_period_end, userId]
            );

            // Save subscription to subscriptions table
            await pool.query(
              `INSERT INTO subscriptions
                (user_id, stripe_subscription_id, stripe_price_id, plan_type, status, current_period_start, current_period_end)
               VALUES ($1, $2, $3, $4, 'active', to_timestamp($5), to_timestamp($6))
               ON CONFLICT (stripe_subscription_id) DO UPDATE SET
                status = 'active',
                current_period_start = to_timestamp($5),
                current_period_end = to_timestamp($6),
                updated_at = NOW()`,
              [userId, subscription.id, subscription.items.data[0].price.id, planId,
               subscription.current_period_start, subscription.current_period_end]
            );

            console.log(`✅ Subscription activated for user ${userId} (${planId})`);
          } catch (error) {
            console.error('Error updating subscription:', error);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;

        try {
          // Find user by Stripe customer ID
          const userResult = await pool.query(
            'SELECT id FROM users WHERE stripe_customer_id = $1',
            [subscription.customer]
          );

          if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].id;
            const status = subscription.status === 'active' ? 'active' :
                          subscription.status === 'canceled' ? 'canceled' :
                          subscription.status;

            await pool.query(
              `UPDATE users SET
                subscription_status = $1,
                subscription_ends_at = to_timestamp($2)
               WHERE id = $3`,
              [status, subscription.current_period_end, userId]
            );

            // Update subscriptions table
            await pool.query(
              `UPDATE subscriptions SET
                status = $1,
                current_period_end = to_timestamp($2),
                cancel_at_period_end = $3,
                updated_at = NOW()
               WHERE stripe_subscription_id = $4`,
              [status, subscription.current_period_end, subscription.cancel_at_period_end, subscription.id]
            );

            console.log(`📝 Subscription updated for user ${userId}: ${status}`);
          }
        } catch (error) {
          console.error('Error handling subscription update:', error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        try {
          const userResult = await pool.query(
            'SELECT id FROM users WHERE stripe_customer_id = $1',
            [subscription.customer]
          );

          if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].id;

            await pool.query(
              `UPDATE users SET
                subscription_status = 'expired',
                subscription_plan = NULL
               WHERE id = $1`,
              [userId]
            );

            await pool.query(
              `UPDATE subscriptions SET
                status = 'canceled',
                canceled_at = NOW(),
                updated_at = NOW()
               WHERE stripe_subscription_id = $1`,
              [subscription.id]
            );

            console.log(`❌ Subscription canceled for user ${userId}`);
          }
        } catch (error) {
          console.error('Error handling subscription deletion:', error);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;

        try {
          const userResult = await pool.query(
            'SELECT id FROM users WHERE stripe_customer_id = $1',
            [invoice.customer]
          );

          if (userResult.rows.length > 0) {
            await pool.query(
              `INSERT INTO payment_history
                (user_id, stripe_payment_id, stripe_invoice_id, amount, currency, status, description)
               VALUES ($1, $2, $3, $4, $5, 'succeeded', $6)`,
              [userResult.rows[0].id, invoice.payment_intent, invoice.id,
               invoice.amount_paid, invoice.currency, invoice.lines?.data[0]?.description]
            );
          }
        } catch (error) {
          console.error('Error recording payment:', error);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;

        try {
          const userResult = await pool.query(
            'SELECT id FROM users WHERE stripe_customer_id = $1',
            [invoice.customer]
          );

          if (userResult.rows.length > 0) {
            await pool.query(
              `UPDATE users SET subscription_status = 'past_due' WHERE id = $1`,
              [userResult.rows[0].id]
            );

            await pool.query(
              `INSERT INTO payment_history
                (user_id, stripe_invoice_id, amount, currency, status, description)
               VALUES ($1, $2, $3, $4, 'failed', $5)`,
              [userResult.rows[0].id, invoice.id, invoice.amount_due,
               invoice.currency, 'Payment failed']
            );

            console.log(`⚠️ Payment failed for user ${userResult.rows[0].id}`);
          }
        } catch (error) {
          console.error('Error handling failed payment:', error);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  }
);

// ============================================
// ADMIN MIDDLEWARE
// ============================================

async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// ============================================
// ADMIN API ROUTES
// ============================================

// Get admin dashboard statistics
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    // Get user counts
    const userStats = await pool.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN subscription_status = 'trial' THEN 1 END) as trial_users,
        COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_subscribers,
        COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END) as expired_users,
        COUNT(CASE WHEN subscription_status = 'canceled' THEN 1 END) as canceled_users,
        COUNT(CASE WHEN subscription_plan = 'monthly' THEN 1 END) as monthly_subscribers,
        COUNT(CASE WHEN subscription_plan = 'yearly' THEN 1 END) as yearly_subscribers,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as new_today,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month
      FROM users
    `);

    // Get revenue statistics
    const revenueStats = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '24 hours' AND status = 'succeeded' THEN amount END), 0) as revenue_today,
        COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '7 days' AND status = 'succeeded' THEN amount END), 0) as revenue_week,
        COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days' AND status = 'succeeded' THEN amount END), 0) as revenue_month,
        COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '365 days' AND status = 'succeeded' THEN amount END), 0) as revenue_year,
        COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount END), 0) as revenue_total,
        COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments
      FROM payment_history
    `);

    // Get recent signups
    const recentSignups = await pool.query(`
      SELECT id, email, display_name, subscription_status, subscription_plan, created_at, last_login
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Get monthly revenue breakdown (last 12 months)
    const monthlyRevenue = await pool.query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as revenue,
        COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as transactions
      FROM payment_history
      WHERE created_at > NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN subscription_plan = 'monthly' THEN 999 ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN subscription_plan = 'yearly' THEN 833 ELSE 0 END), 0) as mrr
      FROM users
      WHERE subscription_status = 'active'
    `);

    res.json({
      users: userStats.rows[0],
      revenue: {
        ...revenueStats.rows[0],
        mrr: mrr.rows[0]?.mrr || 0
      },
      recentSignups: recentSignups.rows,
      monthlyRevenue: monthlyRevenue.rows
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get all users (paginated)
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    let whereClause = '';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE (email ILIKE $${params.length} OR display_name ILIKE $${params.length})`;
    }

    if (status) {
      params.push(status);
      whereClause += whereClause ? ` AND subscription_status = $${params.length}` : `WHERE subscription_status = $${params.length}`;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );

    // Get users
    params.push(limit, offset);
    const usersResult = await pool.query(
      `SELECT id, email, display_name, role, subscription_status, subscription_plan,
              trial_ends_at, subscription_ends_at, created_at, last_login, is_active
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get payment history (paginated)
app.get('/api/admin/payments', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) as total FROM payment_history');

    const paymentsResult = await pool.query(`
      SELECT ph.*, u.email, u.display_name
      FROM payment_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      ORDER BY ph.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      payments: paymentsResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Update user status (activate/deactivate)
app.patch('/api/admin/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active, role, subscription_status } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (typeof is_active === 'boolean') {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (role && ['user', 'admin'].includes(role)) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (subscription_status) {
      updates.push(`subscription_status = $${paramIndex++}`);
      values.push(subscription_status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(userId);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ============================================
// STATIC FILE SERVING (with auth protection)
// ============================================

// Public routes (no auth required)
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/scripts', express.static(path.join(__dirname, 'public', 'scripts')));
app.use('/styles', express.static(path.join(__dirname, 'public', 'styles')));

// List of valid page routes (without .html)
const pageRoutes = ['nfl', 'nba', 'mlb', 'nhl', 'ncaa', 'ncaab', 'LiveGames', 'customize-colors', 'pricing', 'subscription', 'admin'];

// Protected static files (require auth)
app.use((req, res, next) => {
  // Skip auth check for login page, assets, auth API, and OPTIONS requests
  if (req.path === '/login' ||
      req.path === '/login.html' ||
      req.path.startsWith('/assets/') ||
      req.path.startsWith('/css/') ||
      req.path.startsWith('/scripts/') ||
      req.path.startsWith('/styles/') ||
      req.path.startsWith('/api/auth/') ||
      req.method === 'OPTIONS') {
    return next();
  }

  // Check if authenticated
  if (!req.session || !req.session.userId) {
    // Check if it's a page request (clean URL or .html)
    const cleanPath = req.path.replace(/^\//, '').replace(/\.html$/, '');
    const isPageRequest = req.path === '/' ||
                          req.path.endsWith('.html') ||
                          pageRoutes.includes(cleanPath);

    if (isPageRequest) {
      return res.redirect('/login');
    }
    // For API requests, return 401
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
  }

  next();
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// ============================================
// CLEAN URL ROUTES (no .html extension)
// ============================================

// Login page (public)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Redirect .html to clean URLs
app.get('/*.html', (req, res) => {
  const cleanPath = req.path.replace('.html', '');
  res.redirect(301, cleanPath);
});

// Clean URL routes for league pages (protected by middleware above)
pageRoutes.forEach(route => {
  app.get(`/${route}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${route}.html`));
  });
});

// Serve static files (protected by middleware above)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// SMART CACHING SYSTEM (In-Memory)
// ============================================

const sportsCache = {
  nfl: { data: new Map(), activeWeeks: new Set() },
  ncaa: { data: new Map(), activeWeeks: new Set() },
  nba: { data: new Map(), activeDates: new Set() },
  ncaab: { data: new Map(), activeDates: new Set() },
  mlb: { data: new Map(), activeDates: new Set() },
  nhl: { data: new Map(), activeDates: new Set() },
  CACHE_DURATION: 15000, // 15 seconds for live games
  COMPLETED_CACHE_DURATION: 3600000 // 1 hour for completed
};

// ============================================
// FINAL GAMES STORAGE (In-Memory)
// ============================================

const finalGamesStore = {
  nfl: new Map(),
  ncaa: new Map(),
  nba: new Map(),
  ncaab: new Map(),
  mlb: new Map(),
  nhl: new Map()
};

// ============================================
// ESPN API HELPERS
// ============================================

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

async function fetchESPN(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'GridTVSports/2.0' }
    });
    return response.data;
  } catch (error) {
    console.error(`ESPN API Error: ${error.message}`);
    throw error;
  }
}

// ============================================
// NFL HELPERS
// ============================================

function getCurrentNFLWeek() {
  // 2025 NFL Season started September 4, 2025 (Thursday Night Football)
  const seasonStart = new Date('2025-09-04');
  const now = new Date();
  const diffDays = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  
  console.log(`📅 NFL Week Calculation: Days since season start = ${diffDays}, Calculated week = ${week}`);
  
  // Return week 1-18
  return Math.max(1, Math.min(week, 18));
}

function areAllGamesComplete(scoreboard) {
  if (!scoreboard || !scoreboard.events) return false;
  return scoreboard.events.every(e => e.status?.type?.state === 'post');
}

// Cleanup function to remove invalid dates from active tracking
function cleanupActiveDates() {
  const today = getTodayDate();
  const yesterday = getYesterdayDate();
  const tomorrow = getTomorrowDate();
  const validDates = new Set([yesterday, today, tomorrow]);
  
  // Remove any dates that aren't yesterday, today, or tomorrow
  for (const date of sportsCache.nba.activeDates) {
    if (!validDates.has(date)) {
      console.log(`🧹 Removing stale NBA date: ${date}`);
      sportsCache.nba.activeDates.delete(date);
    }
  }
  
  for (const date of sportsCache.mlb.activeDates) {
    if (!validDates.has(date)) {
      console.log(`🧹 Removing stale MLB date: ${date}`);
      sportsCache.mlb.activeDates.delete(date);
    }
  }
  
  for (const date of sportsCache.nhl.activeDates) {
    if (!validDates.has(date)) {
      console.log(`🧹 Removing stale NHL date: ${date}`);
      sportsCache.nhl.activeDates.delete(date);
    }
  }
}

// ============================================
// DATE HELPERS (NBA, MLB, NHL)
// ============================================

function getTodayDate() {
  // Use local time zone instead of UTC to get correct date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  console.log(`📅 Current Date: ${dateStr} (${now.toLocaleDateString()})`);
  return dateStr; // YYYYMMDD
}

function getYesterdayDate() {
  const now = new Date();
  now.setDate(now.getDate() - 1); // Subtract one day
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`; // YYYYMMDD
}

function getTomorrowDate() {
  const now = new Date();
  now.setDate(now.getDate() + 1); // Add one day
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`; // YYYYMMDD
}

// ============================================
// API ROUTES - NFL
// ============================================

app.get('/api/nfl/scoreboard', async (req, res) => {
  try {
    const week = req.query.week || getCurrentNFLWeek();
    const cacheKey = `week-${week}`;
    const cached = sportsCache.nfl.data.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
      return res.json(cached.data);
    }

    const url = `${ESPN_BASE}/football/nfl/scoreboard?week=${week}`;
    const data = await fetchESPN(url);
    const isComplete = areAllGamesComplete(data);
    
    // Count game statuses for better logging
    const statusCount = data.events?.reduce((acc, e) => {
      const state = e.status?.type?.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {}) || {};
    
    console.log(`[NFL] Week ${week} - Games: ${data.events?.length || 0}, Statuses:`, statusCount, `Complete: ${isComplete}`);

    sportsCache.nfl.data.set(cacheKey, { data, timestamp: now, isComplete });
    
    if (!isComplete) {
      sportsCache.nfl.activeWeeks.add(week);
    } else {
      sportsCache.nfl.activeWeeks.delete(week);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nfl/summary/:gameId', async (req, res) => {
  try {
    const url = `${ESPN_BASE}/football/nfl/summary?event=${req.params.gameId}`;
    const data = await fetchESPN(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nfl/current-week', (req, res) => {
  res.json({ week: getCurrentNFLWeek() });
});

// ============================================
// API ROUTES - NCAA COLLEGE FOOTBALL
// ============================================

app.get('/api/ncaa/scoreboard', async (req, res) => {
  try {
    const week = req.query.week || getCurrentNFLWeek(); // Using same week logic as NFL
    const cacheKey = `week-${week}`;
    const cached = sportsCache.ncaa.data.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
      return res.json(cached.data);
    }

    const url = `${ESPN_BASE}/football/college-football/scoreboard?week=${week}&groups=80`; // Division I FBS
    const data = await fetchESPN(url);
    const isComplete = areAllGamesComplete(data);
    
    const statusCount = data.events?.reduce((acc, e) => {
      const state = e.status?.type?.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {}) || {};
    
    console.log(`[NCAA] Week ${week} - Games: ${data.events?.length || 0}, Statuses:`, statusCount, `Complete: ${isComplete}`);

    sportsCache.ncaa.data.set(cacheKey, { data, timestamp: now, isComplete });
    
    if (!isComplete) {
      sportsCache.ncaa.activeWeeks.add(week);
    } else {
      sportsCache.ncaa.activeWeeks.delete(week);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ncaa/summary/:gameId', async (req, res) => {
  try {
    const url = `${ESPN_BASE}/football/college-football/summary?event=${req.params.gameId}`;
    const data = await fetchESPN(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ncaa/current-week', (req, res) => {
  res.json({ week: getCurrentNFLWeek() }); // Using same week logic as NFL
});

// ============================================
// API ROUTES - NBA
// ============================================

app.get('/api/nba/scoreboard', async (req, res) => {
  try {
    const requestedDate = req.query.date;
    
    if (requestedDate) {
      // If specific date requested, use it
      const cacheKey = `date-${requestedDate}`;
      const cached = sportsCache.nba.data.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
        return res.json(cached.data);
      }

      const url = `${ESPN_BASE}/basketball/nba/scoreboard?dates=${requestedDate}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);

      const statusCount = data.events?.reduce((acc, e) => {
        const state = e.status?.type?.state || 'unknown';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {}) || {};

      console.log(`[NBA] Date ${requestedDate} - Games: ${data.events?.length || 0}, Statuses:`, statusCount, `Complete: ${isComplete}`);

      sportsCache.nba.data.set(cacheKey, { data, timestamp: now, isComplete });
      
      if (!isComplete) {
        sportsCache.nba.activeDates.add(requestedDate);
      } else {
        sportsCache.nba.activeDates.delete(requestedDate);
      }

      return res.json(data);
    }

    // No specific date - fetch yesterday, today, AND tomorrow to catch live and upcoming games
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    const tomorrow = getTomorrowDate();
    
    const [todayUrl, yesterdayUrl, tomorrowUrl] = [
      `${ESPN_BASE}/basketball/nba/scoreboard?dates=${today}`,
      `${ESPN_BASE}/basketball/nba/scoreboard?dates=${yesterday}`,
      `${ESPN_BASE}/basketball/nba/scoreboard?dates=${tomorrow}`
    ];

    const [todayData, yesterdayData, tomorrowData] = await Promise.all([
      fetchESPN(todayUrl),
      fetchESPN(yesterdayUrl),
      fetchESPN(tomorrowUrl)
    ]);

    // Merge games from all three days, prioritizing live games
    const allGames = [
      ...(yesterdayData.events || []),
      ...(todayData.events || []),
      ...(tomorrowData.events || [])
    ];

    // Create combined response
    const combinedData = {
      ...todayData,
      events: allGames
    };

    const statusCount = allGames.reduce((acc, e) => {
      const state = e.status?.type?.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    console.log(`[NBA] Combined (${yesterday} + ${today} + ${tomorrow}) - Games: ${allGames.length}, Statuses:`, statusCount);

    // Cache all three dates
    const now = Date.now();
    const todayComplete = areAllGamesComplete(todayData);
    const yesterdayComplete = areAllGamesComplete(yesterdayData);
    const tomorrowComplete = areAllGamesComplete(tomorrowData);

    sportsCache.nba.data.set(`date-${today}`, { data: todayData, timestamp: now, isComplete: todayComplete });
    sportsCache.nba.data.set(`date-${yesterday}`, { data: yesterdayData, timestamp: now, isComplete: yesterdayComplete });
    sportsCache.nba.data.set(`date-${tomorrow}`, { data: tomorrowData, timestamp: now, isComplete: tomorrowComplete });

    if (!todayComplete) sportsCache.nba.activeDates.add(today);
    else sportsCache.nba.activeDates.delete(today);
    
    if (!yesterdayComplete) sportsCache.nba.activeDates.add(yesterday);
    else sportsCache.nba.activeDates.delete(yesterday);

    if (!tomorrowComplete) sportsCache.nba.activeDates.add(tomorrow);
    else sportsCache.nba.activeDates.delete(tomorrow);

    res.json(combinedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nba/summary/:gameId', async (req, res) => {
  try {
    const url = `${ESPN_BASE}/basketball/nba/summary?event=${req.params.gameId}`;
    const data = await fetchESPN(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - COLLEGE BASKETBALL (NCAAB)
// ============================================

app.get('/api/ncaab/scoreboard', async (req, res) => {
  try {
    const requestedDate = req.query.date;

    if (requestedDate) {
      // If specific date requested, use it
      const cacheKey = `date-${requestedDate}`;
      const cached = sportsCache.ncaab.data.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
        return res.json(cached.data);
      }

      const url = `${ESPN_BASE}/basketball/mens-college-basketball/scoreboard?dates=${requestedDate}&limit=200`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);

      const statusCount = data.events?.reduce((acc, e) => {
        const state = e.status?.type?.state || 'unknown';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {}) || {};

      console.log(`[NCAAB] Date ${requestedDate} - Games: ${data.events?.length || 0}, Statuses:`, statusCount, `Complete: ${isComplete}`);

      sportsCache.ncaab.data.set(cacheKey, { data, timestamp: now, isComplete });

      if (!isComplete) {
        sportsCache.ncaab.activeDates.add(requestedDate);
      } else {
        sportsCache.ncaab.activeDates.delete(requestedDate);
      }

      return res.json(data);
    }

    // No specific date - fetch yesterday, today, AND tomorrow to catch live and upcoming games
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    const tomorrow = getTomorrowDate();

    const [todayUrl, yesterdayUrl, tomorrowUrl] = [
      `${ESPN_BASE}/basketball/mens-college-basketball/scoreboard?dates=${today}&limit=200`,
      `${ESPN_BASE}/basketball/mens-college-basketball/scoreboard?dates=${yesterday}&limit=200`,
      `${ESPN_BASE}/basketball/mens-college-basketball/scoreboard?dates=${tomorrow}&limit=200`
    ];

    const [todayData, yesterdayData, tomorrowData] = await Promise.all([
      fetchESPN(todayUrl),
      fetchESPN(yesterdayUrl),
      fetchESPN(tomorrowUrl)
    ]);

    // Merge games from all three days, prioritizing live games
    const allGames = [
      ...(yesterdayData.events || []),
      ...(todayData.events || []),
      ...(tomorrowData.events || [])
    ];

    // Create combined response
    const combinedData = {
      ...todayData,
      events: allGames
    };

    const statusCount = allGames.reduce((acc, e) => {
      const state = e.status?.type?.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    console.log(`[NCAAB] Combined (${yesterday} + ${today} + ${tomorrow}) - Games: ${allGames.length}, Statuses:`, statusCount);

    // Cache all three dates
    const now = Date.now();
    const todayComplete = areAllGamesComplete(todayData);
    const yesterdayComplete = areAllGamesComplete(yesterdayData);
    const tomorrowComplete = areAllGamesComplete(tomorrowData);

    sportsCache.ncaab.data.set(`date-${today}`, { data: todayData, timestamp: now, isComplete: todayComplete });
    sportsCache.ncaab.data.set(`date-${yesterday}`, { data: yesterdayData, timestamp: now, isComplete: yesterdayComplete });
    sportsCache.ncaab.data.set(`date-${tomorrow}`, { data: tomorrowData, timestamp: now, isComplete: tomorrowComplete });

    if (!todayComplete) sportsCache.ncaab.activeDates.add(today);
    else sportsCache.ncaab.activeDates.delete(today);

    if (!yesterdayComplete) sportsCache.ncaab.activeDates.add(yesterday);
    else sportsCache.ncaab.activeDates.delete(yesterday);

    if (!tomorrowComplete) sportsCache.ncaab.activeDates.add(tomorrow);
    else sportsCache.ncaab.activeDates.delete(tomorrow);

    res.json(combinedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ncaab/summary/:gameId', async (req, res) => {
  try {
    const url = `${ESPN_BASE}/basketball/mens-college-basketball/summary?event=${req.params.gameId}`;
    const data = await fetchESPN(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - MLB
// ============================================

app.get('/api/mlb/scoreboard', async (req, res) => {
  try {
    const requestedDate = req.query.date;
    
    if (requestedDate) {
      // If specific date requested, use it
      const cacheKey = `date-${requestedDate}`;
      const cached = sportsCache.mlb.data.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
        return res.json(cached.data);
      }

      const url = `${ESPN_BASE}/baseball/mlb/scoreboard?dates=${requestedDate}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);

      const statusCount = data.events?.reduce((acc, e) => {
        const state = e.status?.type?.state || 'unknown';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {}) || {};

      console.log(`[MLB] Date ${requestedDate} - Games: ${data.events?.length || 0}, Statuses:`, statusCount, `Complete: ${isComplete}`);

      sportsCache.mlb.data.set(cacheKey, { data, timestamp: now, isComplete });
      
      if (!isComplete) {
        sportsCache.mlb.activeDates.add(requestedDate);
      } else {
        sportsCache.mlb.activeDates.delete(requestedDate);
      }

      return res.json(data);
    }

    // No specific date - fetch today AND yesterday to catch live games
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    
    const [todayUrl, yesterdayUrl] = [
      `${ESPN_BASE}/baseball/mlb/scoreboard?dates=${today}`,
      `${ESPN_BASE}/baseball/mlb/scoreboard?dates=${yesterday}`
    ];

    const [todayData, yesterdayData] = await Promise.all([
      fetchESPN(todayUrl),
      fetchESPN(yesterdayUrl)
    ]);

    // Merge games from both days
    const allGames = [
      ...(yesterdayData.events || []),
      ...(todayData.events || [])
    ];

    const combinedData = {
      ...todayData,
      events: allGames
    };

    const statusCount = allGames.reduce((acc, e) => {
      const state = e.status?.type?.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    console.log(`[MLB] Combined (${yesterday} + ${today}) - Games: ${allGames.length}, Statuses:`, statusCount);

    // Cache both dates
    const now = Date.now();
    const todayComplete = areAllGamesComplete(todayData);
    const yesterdayComplete = areAllGamesComplete(yesterdayData);

    sportsCache.mlb.data.set(`date-${today}`, { data: todayData, timestamp: now, isComplete: todayComplete });
    sportsCache.mlb.data.set(`date-${yesterday}`, { data: yesterdayData, timestamp: now, isComplete: yesterdayComplete });

    if (!todayComplete) sportsCache.mlb.activeDates.add(today);
    else sportsCache.mlb.activeDates.delete(today);
    
    if (!yesterdayComplete) sportsCache.mlb.activeDates.add(yesterday);
    else sportsCache.mlb.activeDates.delete(yesterday);

    res.json(combinedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mlb/summary/:gameId', async (req, res) => {
  try {
    const url = `${ESPN_BASE}/baseball/mlb/summary?event=${req.params.gameId}`;
    const data = await fetchESPN(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - NHL
// ============================================

app.get('/api/nhl/scoreboard', async (req, res) => {
  try {
    const requestedDate = req.query.date;
    
    if (requestedDate) {
      // If specific date requested, use it
      const cacheKey = `date-${requestedDate}`;
      const cached = sportsCache.nhl.data.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
        return res.json(cached.data);
      }

      const url = `${ESPN_BASE}/hockey/nhl/scoreboard?dates=${requestedDate}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);

      const statusCount = data.events?.reduce((acc, e) => {
        const state = e.status?.type?.state || 'unknown';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {}) || {};

      console.log(`[NHL] Date ${requestedDate} - Games: ${data.events?.length || 0}, Statuses:`, statusCount, `Complete: ${isComplete}`);

      sportsCache.nhl.data.set(cacheKey, { data, timestamp: now, isComplete });
      
      if (!isComplete) {
        sportsCache.nhl.activeDates.add(requestedDate);
      } else {
        sportsCache.nhl.activeDates.delete(requestedDate);
      }

      return res.json(data);
    }

    // No specific date - fetch today AND yesterday to catch live games
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    
    const [todayUrl, yesterdayUrl] = [
      `${ESPN_BASE}/hockey/nhl/scoreboard?dates=${today}`,
      `${ESPN_BASE}/hockey/nhl/scoreboard?dates=${yesterday}`
    ];

    const [todayData, yesterdayData] = await Promise.all([
      fetchESPN(todayUrl),
      fetchESPN(yesterdayUrl)
    ]);

    // Merge games from both days
    const allGames = [
      ...(yesterdayData.events || []),
      ...(todayData.events || [])
    ];

    const combinedData = {
      ...todayData,
      events: allGames
    };

    const statusCount = allGames.reduce((acc, e) => {
      const state = e.status?.type?.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    console.log(`[NHL] Combined (${yesterday} + ${today}) - Games: ${allGames.length}, Statuses:`, statusCount);

    // Cache both dates
    const now = Date.now();
    const todayComplete = areAllGamesComplete(todayData);
    const yesterdayComplete = areAllGamesComplete(yesterdayData);

    sportsCache.nhl.data.set(`date-${today}`, { data: todayData, timestamp: now, isComplete: todayComplete });
    sportsCache.nhl.data.set(`date-${yesterday}`, { data: yesterdayData, timestamp: now, isComplete: yesterdayComplete });

    if (!todayComplete) sportsCache.nhl.activeDates.add(today);
    else sportsCache.nhl.activeDates.delete(today);
    
    if (!yesterdayComplete) sportsCache.nhl.activeDates.add(yesterday);
    else sportsCache.nhl.activeDates.delete(yesterday);

    res.json(combinedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nhl/summary/:gameId', async (req, res) => {
  try {
    const url = `${ESPN_BASE}/hockey/nhl/summary?event=${req.params.gameId}`;
    const data = await fetchESPN(url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BACKGROUND JOBS - AUTO CACHE UPDATES
// ============================================

// Update NFL cache every 15 seconds for active weeks
cron.schedule('*/15 * * * * *', async () => {
  for (const week of sportsCache.nfl.activeWeeks) {
    try {
      const url = `${ESPN_BASE}/football/nfl/scoreboard?week=${week}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);
      
      sportsCache.nfl.data.set(`week-${week}`, { 
        data, 
        timestamp: Date.now(), 
        isComplete 
      });
      
      if (isComplete) {
        sportsCache.nfl.activeWeeks.delete(week);
        console.log(`[NFL] Week ${week} marked complete - removed from active tracking`);
      }
      
      // Count live and upcoming games
      const liveGames = data.events?.filter(e => e.status?.type?.state === 'in').length || 0;
      const upcomingGames = data.events?.filter(e => e.status?.type?.state === 'pre').length || 0;
      
      console.log(`[NFL] Week ${week} - Live: ${liveGames}, Upcoming: ${upcomingGames}, Complete: ${isComplete}`);
    } catch (error) {
      console.error(`[NFL] Failed to update week ${week}:`, error.message);
    }
  }
});

// Update NBA cache every 15 seconds for active dates
cron.schedule('*/15 * * * * *', async () => {
  for (const date of sportsCache.nba.activeDates) {
    try {
      const url = `${ESPN_BASE}/basketball/nba/scoreboard?dates=${date}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);
      
      sportsCache.nba.data.set(`date-${date}`, { 
        data, 
        timestamp: Date.now(), 
        isComplete 
      });
      
      if (isComplete) {
        sportsCache.nba.activeDates.delete(date);
      }
      
      // Enhanced logging
      const liveGames = data.events?.filter(e => e.status?.type?.state === 'in').length || 0;
      const upcomingGames = data.events?.filter(e => e.status?.type?.state === 'pre').length || 0;
      
      console.log(`[NBA] Date ${date} - Live: ${liveGames}, Upcoming: ${upcomingGames}, Complete: ${isComplete}`);
    } catch (error) {
      console.error(`[NBA] Failed to update ${date}:`, error.message);
    }
  }
});

// Update MLB cache every 15 seconds for active dates
cron.schedule('*/15 * * * * *', async () => {
  for (const date of sportsCache.mlb.activeDates) {
    try {
      const url = `${ESPN_BASE}/baseball/mlb/scoreboard?dates=${date}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);
      
      sportsCache.mlb.data.set(`date-${date}`, { 
        data, 
        timestamp: Date.now(), 
        isComplete 
      });
      
      if (isComplete) {
        sportsCache.mlb.activeDates.delete(date);
      }
      
      // Enhanced logging
      const liveGames = data.events?.filter(e => e.status?.type?.state === 'in').length || 0;
      const upcomingGames = data.events?.filter(e => e.status?.type?.state === 'pre').length || 0;
      
      console.log(`[MLB] Date ${date} - Live: ${liveGames}, Upcoming: ${upcomingGames}, Complete: ${isComplete}`);
    } catch (error) {
      console.error(`[MLB] Failed to update ${date}:`, error.message);
    }
  }
});

// Update NHL cache every 15 seconds for active dates
cron.schedule('*/15 * * * * *', async () => {
  for (const date of sportsCache.nhl.activeDates) {
    try {
      const url = `${ESPN_BASE}/hockey/nhl/scoreboard?dates=${date}`;
      const data = await fetchESPN(url);
      const isComplete = areAllGamesComplete(data);
      
      sportsCache.nhl.data.set(`date-${date}`, { 
        data, 
        timestamp: Date.now(), 
        isComplete 
      });
      
      if (isComplete) {
        sportsCache.nhl.activeDates.delete(date);
      }
      
      // Enhanced logging
      const liveGames = data.events?.filter(e => e.status?.type?.state === 'in').length || 0;
      const upcomingGames = data.events?.filter(e => e.status?.type?.state === 'pre').length || 0;
      
      console.log(`[NHL] Date ${date} - Live: ${liveGames}, Upcoming: ${upcomingGames}, Complete: ${isComplete}`);
    } catch (error) {
      console.error(`[NHL] Failed to update ${date}:`, error.message);
    }
  }
});

// ============================================
// FINAL GAMES API ENDPOINTS
// ============================================

// Save a final game to storage
app.post('/api/final-games/save', (req, res) => {
  try {
    const { sport, gameId, gameData, week } = req.body;
    
    if (!sport || !gameId || !gameData) {
      return res.status(400).json({ error: 'Missing required fields: sport, gameId, gameData' });
    }
    
    if (!finalGamesStore[sport]) {
      return res.status(400).json({ error: 'Invalid sport. Must be: nfl, nba, mlb, or nhl' });
    }
    
    finalGamesStore[sport].set(gameId, {
      ...gameData,
      savedAt: Date.now(),
      week: week || null
    });
    
    console.log(`💾 Saved final game: ${sport.toUpperCase()} - ${gameId}`);
    res.json({ success: true, gameId });
  } catch (error) {
    console.error('Error saving final game:', error);
    res.status(500).json({ error: 'Failed to save final game' });
  }
});

// Get all final games for a sport
app.get('/api/final-games/:sport', (req, res) => {
  try {
    const { sport } = req.params;
    
    if (!finalGamesStore[sport]) {
      return res.status(400).json({ error: 'Invalid sport' });
    }
    
    const games = Array.from(finalGamesStore[sport].values());
    res.json({ games, count: games.length });
  } catch (error) {
    console.error('Error fetching final games:', error);
    res.status(500).json({ error: 'Failed to fetch final games' });
  }
});

// Clear final games (optionally by week)
app.delete('/api/final-games/clear/:sport', (req, res) => {
  try {
    const { sport } = req.params;
    const { week } = req.query;
    
    if (!finalGamesStore[sport]) {
      return res.status(400).json({ error: 'Invalid sport' });
    }
    
    if (week) {
      // Clear only games from previous weeks
      let cleared = 0;
      for (const [gameId, gameData] of finalGamesStore[sport]) {
        if (gameData.week && gameData.week < parseInt(week)) {
          finalGamesStore[sport].delete(gameId);
          cleared++;
        }
      }
      console.log(`🗑️ Cleared ${cleared} old final games for ${sport.toUpperCase()} (before week ${week})`);
    } else {
      // Clear all
      const count = finalGamesStore[sport].size;
      finalGamesStore[sport].clear();
      console.log(`🗑️ Cleared all ${count} final games for ${sport.toUpperCase()}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing final games:', error);
    res.status(500).json({ error: 'Failed to clear final games' });
  }
});



// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`✅ GridTV Sports Multi-Sport Server running on port ${PORT}`);
  console.log(`🏈 NFL API: http://localhost:${PORT}/api/nfl/scoreboard`);
  console.log(`� NCAA API: http://localhost:${PORT}/api/ncaa/scoreboard`);
  console.log(`�🏀 NBA API: http://localhost:${PORT}/api/nba/scoreboard`);
  console.log(`⚾ MLB API: http://localhost:${PORT}/api/mlb/scoreboard`);
  console.log(`🏒 NHL API: http://localhost:${PORT}/api/nhl/scoreboard`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  
  // Clean up any stale dates from cache
  cleanupActiveDates();
});
