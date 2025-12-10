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
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { pool } = require('./db');
require('dotenv').config();

// Email transporter configuration
let emailTransporter = null;
const emailConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
if (emailConfigured) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log('✅ Email transporter configured');
  console.log('   Host:', process.env.SMTP_HOST);
  console.log('   User:', process.env.SMTP_USER);
} else {
  console.log('⚠️ Email not configured. Missing variables:');
  if (!process.env.SMTP_HOST) console.log('   - SMTP_HOST is missing');
  if (!process.env.SMTP_USER) console.log('   - SMTP_USER is missing');
  if (!process.env.SMTP_PASS) console.log('   - SMTP_PASS is missing');
}

// Initialize Stripe (optional - only if keys are configured)
let stripe = null;
console.log('🔍 STRIPE_SECRET_KEY value:', process.env.STRIPE_SECRET_KEY ?
  (process.env.STRIPE_SECRET_KEY.substring(0, 20) + '...') : 'undefined');
console.log('🔍 STRIPE_SECRET_KEY type:', typeof process.env.STRIPE_SECRET_KEY);

const stripeConfigured = process.env.STRIPE_SECRET_KEY &&
  !process.env.STRIPE_SECRET_KEY.includes('your_stripe') &&
  !process.env.STRIPE_SECRET_KEY.includes('@Microsoft.KeyVault');
if (stripeConfigured) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized successfully');
} else {
  console.log('⚠️ Stripe not configured - subscription features disabled');
  console.log('   Reason: Key contains placeholder or KeyVault reference');
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

// Rate limiting - general API (very high limit for authenticated users)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 10000 requests per windowMs (allows ~11 hours of 15-second refreshes)
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Handle IPs with ports (azure/load balancer issue)
    return req.ip ? req.ip.replace(/:\d+$/, '') : req.ip;
  },
  validate: { ip: false } // Disable IPv6 check since we sanitize manually
});

// Rate limiting - auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased to 100 for testing/debugging
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Handle IPs with ports (azure/load balancer issue)
    return req.ip ? req.ip.replace(/:\d+$/, '') : req.ip;
  },
  validate: { ip: false } // Disable IPv6 check since we sanitize manually
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGIN : true,
  credentials: true
}));

// ============================================
// STRIPE WEBHOOK (MUST BE BEFORE express.json())
// ============================================
// Stripe webhook needs raw body for signature verification
// This MUST be defined before app.use(express.json()) to access raw body
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
        console.log('💳 Webhook received: checkout.session.completed');
        // Note: Subscription creation is handled by customer.subscription.created event
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        console.log('🆕 Webhook received: customer.subscription.created');
        console.log('🔍 Full subscription object:', JSON.stringify(subscription, null, 2));

        try {
          // Get user from customer ID
          const userResult = await pool.query(
            'SELECT id FROM users WHERE stripe_customer_id = $1',
            [subscription.customer]
          );

          if (userResult.rows.length === 0) {
            console.error('❌ User not found for customer:', subscription.customer);
            return res.status(404).send('User not found');
          }

          const userId = userResult.rows[0].id;

          // Period dates are in the subscription items, not at the top level
          const subscriptionItem = subscription.items.data[0];
          const periodEnd = subscriptionItem.current_period_end;
          const periodStart = subscriptionItem.current_period_start;
          const planType = subscriptionItem.price.recurring.interval;

          console.log('📋 Subscription details:', {
            id: subscription.id,
            status: subscription.status,
            current_period_end: periodEnd,
            current_period_start: periodStart,
            interval: planType
          });

          // Validate subscription data
          if (!periodEnd || !periodStart) {
            console.error('❌ Invalid subscription data - missing period dates');
            return res.status(500).send('Invalid subscription data');
          }

          const periodEndDate = new Date(periodEnd * 1000);
          const periodStartDate = new Date(periodStart * 1000);

          // Update user subscription status
          await pool.query(`
            UPDATE users
            SET subscription_status = 'active',
                subscription_plan = $1,
                subscription_ends_at = $2
            WHERE id = $3
          `, [
            planType,
            periodEndDate,
            userId
          ]);

          // Create subscription record
          await pool.query(`
            INSERT INTO subscriptions (
              user_id,
              stripe_subscription_id,
              plan_type,
              status,
              current_period_start,
              current_period_end
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (stripe_subscription_id)
            DO UPDATE SET
              status = EXCLUDED.status,
              current_period_end = EXCLUDED.current_period_end
          `, [
            userId,
            subscription.id,
            planType,
            subscription.status,
            periodStartDate,
            periodEndDate
          ]);

          console.log(`✅ Subscription created for user ${userId} - ${planType} plan`);
        } catch (error) {
          console.error('❌ Error handling customer.subscription.created:', error);
          return res.status(500).send('Internal server error');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('🔄 Webhook received: customer.subscription.updated');
        console.log('🔍 Subscription cancel_at_period_end:', subscription.cancel_at_period_end);
        console.log('🔍 Subscription cancel_at:', subscription.cancel_at);
        console.log('🔍 Subscription status:', subscription.status);

        try {
          // Period dates are in the subscription items, not at the top level
          const subscriptionItem = subscription.items?.data?.[0];
          const periodEnd = subscriptionItem?.current_period_end;

          // Check if subscription is set to cancel (either method)
          const isCanceling = subscription.cancel_at_period_end || subscription.cancel_at !== null;

          // Update subscription record
          await pool.query(`
            UPDATE subscriptions
            SET status = $1,
                current_period_end = $2,
                cancel_at_period_end = $3
            WHERE stripe_subscription_id = $4
          `, [
            subscription.status,
            periodEnd ? new Date(periodEnd * 1000) : null,
            isCanceling,
            subscription.id
          ]);

          console.log('✅ Updated subscription with cancel_at_period_end =', isCanceling);

          // Update user subscription status
          await pool.query(`
            UPDATE users
            SET subscription_status = $1,
                subscription_ends_at = $2
            WHERE stripe_customer_id = $3
          `, [
            subscription.status,
            periodEnd ? new Date(periodEnd * 1000) : null,
            subscription.customer
          ]);

          console.log('✅ Subscription updated:', subscription.id);
        } catch (error) {
          console.error('❌ Error handling customer.subscription.updated:', error);
          return res.status(500).send('Internal server error');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('❌ Webhook received: customer.subscription.deleted');

        try {
          // Update subscription record
          await pool.query(`
            UPDATE subscriptions
            SET status = 'canceled'
            WHERE stripe_subscription_id = $1
          `, [subscription.id]);

          // Update user subscription status
          await pool.query(`
            UPDATE users
            SET subscription_status = 'canceled'
            WHERE stripe_customer_id = $1
          `, [subscription.customer]);

          console.log('✅ Subscription canceled:', subscription.id);
        } catch (error) {
          console.error('❌ Error handling customer.subscription.deleted:', error);
          return res.status(500).send('Internal server error');
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('💰 Webhook received: invoice.payment_succeeded');

        try {
          // Get user from customer ID
          const userResult = await pool.query(
            'SELECT id FROM users WHERE stripe_customer_id = $1',
            [invoice.customer]
          );

          if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].id;

            // Record payment
            await pool.query(`
              INSERT INTO payment_history (
                user_id,
                stripe_payment_id,
                amount,
                status
              ) VALUES ($1, $2, $3, $4)
            `, [
              userId,
              invoice.payment_intent,
              invoice.amount_paid,
              'succeeded'
            ]);

            console.log('✅ Payment recorded for user', userId);
          }
        } catch (error) {
          console.error('❌ Error handling invoice.payment_succeeded:', error);
          return res.status(500).send('Internal server error');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('⚠️ Webhook received: invoice.payment_failed');

        try {
          // Get user from customer ID
          const userResult = await pool.query(
            'SELECT id FROM users WHERE stripe_customer_id = $1',
            [invoice.customer]
          );

          if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].id;

            // Record failed payment
            await pool.query(`
              INSERT INTO payment_history (
                user_id,
                stripe_payment_id,
                amount,
                status
              ) VALUES ($1, $2, $3, $4)
            `, [
              userId,
              invoice.payment_intent,
              invoice.amount_due,
              'failed'
            ]);

            console.log('⚠️ Failed payment recorded for user', userId);
          }
        } catch (error) {
          console.error('❌ Error handling invoice.payment_failed:', error);
          return res.status(500).send('Internal server error');
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Return 200 OK to acknowledge receipt
    res.json({ received: true });
  }
);

// Now apply JSON parsing for all other routes
app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));

// ============================================
// SESSION CONFIGURATION
// ============================================

// Trust first proxy (required for secure cookies behind Azure/load balancer)
app.set('trust proxy', 1);

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
    // maxAge removed - session lasts until browser closes (no timeout)
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
// PASSWORD RESET ENDPOINTS
// ============================================

// Request password reset
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, display_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration attacks
    if (userResult.rows.length === 0) {
      console.log(`🔒 Password reset requested for non-existent email: ${email}`);
      return res.json({ success: true, message: 'If an account exists with this email, a reset link will be sent.' });
    }

    const user = userResult.rows[0];

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Invalidate any existing tokens for this user
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
      [user.id]
    );

    // Store the token
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    // Build reset URL
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Send email or log to console
    if (emailTransporter) {
      await emailTransporter.sendMail({
        from: process.env.SMTP_FROM || '"GridTV Sports" <noreply@gridtvsports.com>',
        to: user.email,
        subject: 'Reset Your Password - GridTV Sports',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #6366f1; margin: 0;">GridTV Sports</h1>
            </div>
            <h2 style="color: #333;">Reset Your Password</h2>
            <p style="color: #666; font-size: 16px;">Hi ${user.display_name || 'there'},</p>
            <p style="color: #666; font-size: 16px;">We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">GridTV Sports - Live Sports Streaming Platform</p>
          </div>
        `,
        text: `Reset your password for GridTV Sports.\n\nClick this link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`,
      });
      console.log(`📧 Password reset email sent to: ${user.email}`);
    } else {
      // Log reset link to console for development
      console.log('='.repeat(60));
      console.log('📧 PASSWORD RESET LINK (Email not configured)');
      console.log(`User: ${user.email}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log('='.repeat(60));
    }

    res.json({ success: true, message: 'If an account exists with this email, a reset link will be sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// Verify reset token
app.get('/api/auth/verify-reset-token', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const result = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const tokenData = result.rows[0];

    if (tokenData.used) {
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired' });
    }

    res.json({ valid: true, email: tokenData.email });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Reset password with token
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    // Verify token
    const tokenResult = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const tokenData = tokenResult.rows[0];

    if (tokenData.used) {
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired' });
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, tokenData.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
      [tokenData.id]
    );

    console.log(`🔐 Password reset successful for: ${tokenData.email}`);
    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// Update user profile
app.post('/api/auth/update-profile', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { displayName } = req.body;

  if (!displayName || displayName.trim().length === 0) {
    return res.status(400).json({ error: 'Display name is required' });
  }

  if (displayName.length > 100) {
    return res.status(400).json({ error: 'Display name must be 100 characters or less' });
  }

  try {
    await pool.query(
      'UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2',
      [displayName.trim(), req.session.userId]
    );

    // Update session
    req.session.displayName = displayName.trim();

    console.log(`✏️ Profile updated for user ID: ${req.session.userId}`);
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile. Please try again.' });
  }
});

// ============================================
// FAVORITE TEAMS API ROUTES
// ============================================

// Get user's favorite teams
app.get('/api/favorites', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await pool.query(
      `SELECT id, team_id, team_name, team_abbreviation, team_logo, league, rank
       FROM favorite_teams
       WHERE user_id = $1
       ORDER BY rank ASC`,
      [req.session.userId]
    );
    res.json({ favorites: result.rows });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Add a favorite team
app.post('/api/favorites', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { teamId, teamName, teamAbbreviation, teamLogo, league } = req.body;

  if (!teamId || !teamName || !league) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if user already has 6 favorites for this league
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM favorite_teams WHERE user_id = $1 AND league = $2',
      [req.session.userId, league]
    );

    if (parseInt(countResult.rows[0].count) >= 6) {
      return res.status(400).json({ error: `Maximum 6 favorite teams allowed per league` });
    }

    // Check if team is already a favorite
    const existingResult = await pool.query(
      'SELECT id FROM favorite_teams WHERE user_id = $1 AND team_id = $2',
      [req.session.userId, teamId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Team is already in favorites' });
    }

    // Get the next rank number for this league
    const rankResult = await pool.query(
      'SELECT COALESCE(MAX(rank), 0) + 1 as next_rank FROM favorite_teams WHERE user_id = $1 AND league = $2',
      [req.session.userId, league]
    );
    const nextRank = rankResult.rows[0].next_rank;

    // Insert the new favorite
    const insertResult = await pool.query(
      `INSERT INTO favorite_teams (user_id, team_id, team_name, team_abbreviation, team_logo, league, rank)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, team_id, team_name, team_abbreviation, team_logo, league, rank`,
      [req.session.userId, teamId, teamName, teamAbbreviation || '', teamLogo || '', league, nextRank]
    );

    res.json({ favorite: insertResult.rows[0] });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Remove a favorite team
app.delete('/api/favorites/:teamId', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { teamId } = req.params;

  try {
    // Get the rank and league of the team being deleted
    const rankResult = await pool.query(
      'SELECT rank, league FROM favorite_teams WHERE user_id = $1 AND team_id = $2',
      [req.session.userId, teamId]
    );

    if (rankResult.rows.length === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    const deletedRank = rankResult.rows[0].rank;
    const league = rankResult.rows[0].league;

    // Delete the favorite
    await pool.query(
      'DELETE FROM favorite_teams WHERE user_id = $1 AND team_id = $2',
      [req.session.userId, teamId]
    );

    // Reorder remaining favorites in the same league to fill the gap
    await pool.query(
      `UPDATE favorite_teams
       SET rank = rank - 1
       WHERE user_id = $1 AND league = $2 AND rank > $3`,
      [req.session.userId, league, deletedRank]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// Reorder favorite teams within a league
app.post('/api/favorites/reorder', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { teamIds, league } = req.body; // Array of team IDs in new order and the league

  if (!Array.isArray(teamIds) || teamIds.length === 0 || teamIds.length > 6 || !league) {
    return res.status(400).json({ error: 'Invalid team IDs or league' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Temporarily set all ranks to negative for this league to avoid unique constraint conflicts
    await client.query(
      `UPDATE favorite_teams SET rank = -rank WHERE user_id = $1 AND league = $2`,
      [req.session.userId, league]
    );

    // Update each team's rank based on position in array
    for (let i = 0; i < teamIds.length; i++) {
      await client.query(
        `UPDATE favorite_teams SET rank = $1 WHERE user_id = $2 AND team_id = $3 AND league = $4`,
        [i + 1, req.session.userId, teamIds[i], league]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reordering favorites:', error);
    res.status(500).json({ error: 'Failed to reorder favorites' });
  } finally {
    client.release();
  }
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

    // Check if subscription is set to cancel
    let cancelAtPeriodEnd = false;
    if (user.subscription_status === 'active') {
      const subResult = await pool.query(
        `SELECT cancel_at_period_end FROM subscriptions
         WHERE user_id = $1 AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
        [req.session.userId]
      );
      if (subResult.rows.length > 0) {
        cancelAtPeriodEnd = subResult.rows[0].cancel_at_period_end;
      }
    }

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

    const responseData = {
      status: user.subscription_status,
      plan: user.subscription_plan,
      trialEndsAt: user.trial_ends_at,
      subscriptionEndsAt: user.subscription_ends_at,
      daysRemaining,
      isActive,
      hasStripeCustomer: !!user.stripe_customer_id,
      cancelAtPeriodEnd
    };

    console.log('📊 Subscription status response:', JSON.stringify(responseData, null, 2));

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Get user access permissions based on subscription
app.get('/api/subscription/access', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await pool.query(
      `SELECT subscription_status, subscription_plan, trial_ends_at, subscription_ends_at
       FROM users WHERE id = $1`,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const now = new Date();

    let hasAccess = false;
    let isTrial = false;
    let allowedLeagues = [];
    let allowedGrids = [];
    let lockedLeagues = [];

    // Check if user has active trial
    if (user.subscription_status === 'trial' && user.trial_ends_at) {
      const trialEnd = new Date(user.trial_ends_at);
      if (trialEnd > now) {
        hasAccess = true;
        isTrial = true;
        // Trial users: only NFL and NBA, max 2 grids
        allowedLeagues = ['nfl', 'nba'];
        allowedGrids = [1, 2];
        lockedLeagues = ['mlb', 'nhl', 'ncaa', 'ncaab'];
      }
    }

    // Check if user has active paid subscription
    if (user.subscription_status === 'active' && user.subscription_ends_at) {
      const subEnd = new Date(user.subscription_ends_at);
      if (subEnd > now) {
        hasAccess = true;
        isTrial = false;
        // Paid users: full access to everything
        allowedLeagues = ['nfl', 'nba', 'mlb', 'nhl', 'ncaa', 'ncaab'];
        allowedGrids = [1, 2, 3, 4, 6, 8];
        lockedLeagues = [];
      }
    }

    res.json({
      hasAccess,
      isTrial,
      isPaid: hasAccess && !isTrial,
      allowedLeagues,
      allowedGrids,
      lockedLeagues
    });
  } catch (error) {
    console.error('Error fetching access permissions:', error);
    res.status(500).json({ error: 'Failed to fetch access permissions' });
  }
});

// Get available plans
app.get('/api/subscription/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'monthly',
        name: 'Monthly',
        price: 7.99,
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
        price: 76.70,
        priceId: process.env.STRIPE_YEARLY_PRICE_ID,
        interval: 'year',
        savings: '20%',
        features: [
          'All live sports games',
          'NFL, NBA, MLB, NHL coverage',
          'College sports included',
          'Real-time score updates',
          'Save 20% annually!'
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

// Sync subscription status from Stripe (bypass webhooks)
app.post('/api/subscription/sync', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment system not configured' });
  }

  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    console.log('🔄 Syncing subscription status from Stripe...');

    // Get user's Stripe customer ID
    const userResult = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) {
      return res.status(404).json({ error: 'No Stripe customer found' });
    }

    const customerId = userResult.rows[0].stripe_customer_id;
    console.log('👤 Customer ID:', customerId);

    // Get active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      console.log('❌ No active subscriptions found in Stripe');
      return res.json({
        synced: false,
        message: 'No active subscriptions found'
      });
    }

    const sub = subscriptions.data[0];
    console.log('✅ Found subscription:', sub.id);
    console.log('🔍 Stripe cancel_at_period_end:', sub.cancel_at_period_end);
    console.log('🔍 Stripe cancel_at:', sub.cancel_at);

    // Check if subscription is set to cancel (either method)
    const isCanceling = sub.cancel_at_period_end || sub.cancel_at !== null;

    // Update database with REAL Stripe data
    await pool.query(
      `UPDATE subscriptions
       SET cancel_at_period_end = $1
       WHERE stripe_subscription_id = $2`,
      [isCanceling, sub.id]
    );

    console.log('✅ Database updated with cancel_at_period_end =', isCanceling);

    res.json({
      synced: true,
      cancel_at_period_end: isCanceling,
      subscription_id: sub.id
    });
  } catch (error) {
    console.error('❌ Sync error:', error);
    res.status(500).json({ error: 'Sync failed: ' + error.message });
  }
});

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

// Localhost-only middleware for sensitive admin operations
function requireLocalhost(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || '';
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';

  if (!isLocalhost) {
    return res.status(403).json({ error: 'This endpoint is only accessible from localhost' });
  }
  next();
}

// Update user subscription (full control) - LOCALHOST ONLY
app.patch('/api/admin/users/:userId/subscription', requireAdmin, requireLocalhost, async (req, res) => {
  try {
    const { userId } = req.params;
    const { subscription_status, subscription_plan, trial_ends_at, subscription_ends_at } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    // Subscription status
    if (subscription_status !== undefined) {
      const validStatuses = ['trial', 'active', 'expired', 'canceled'];
      if (!validStatuses.includes(subscription_status)) {
        return res.status(400).json({ error: 'Invalid subscription status' });
      }
      updates.push(`subscription_status = $${paramIndex++}`);
      values.push(subscription_status);
    }

    // Subscription plan
    if (subscription_plan !== undefined) {
      if (subscription_plan && !['monthly', 'yearly'].includes(subscription_plan)) {
        return res.status(400).json({ error: 'Invalid subscription plan' });
      }
      updates.push(`subscription_plan = $${paramIndex++}`);
      values.push(subscription_plan || null);
    }

    // Trial end date
    if (trial_ends_at !== undefined) {
      updates.push(`trial_ends_at = $${paramIndex++}`);
      values.push(trial_ends_at ? new Date(trial_ends_at) : null);
    }

    // Subscription end date
    if (subscription_ends_at !== undefined) {
      updates.push(`subscription_ends_at = $${paramIndex++}`);
      values.push(subscription_ends_at ? new Date(subscription_ends_at) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING id, email, subscription_status, subscription_plan, trial_ends_at, subscription_ends_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[Admin] Subscription updated for user ${result.rows[0].email} by admin ${req.session.userId}`);
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
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
const pageRoutes = ['nfl', 'nba', 'mlb', 'nhl', 'ncaa', 'ncaab', 'LiveGames', 'customize-colors', 'pricing', 'subscription', 'admin', 'admin-subscriptions'];

// Protected static files (require auth)
app.use((req, res, next) => {
  // Skip auth check for login page, assets, auth API, and OPTIONS requests
  if (req.path === '/login' ||
    req.path === '/login.html' ||
    req.path === '/reset-password.html' ||
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
  const queryString = req.url.slice(req.path.length);
  res.redirect(301, cleanPath + queryString);
});

// Access control middleware for protected league pages
async function checkLeagueAccess(req, res, next) {
  const league = req.params.league;

  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }

  try {
    const result = await pool.query(
      `SELECT subscription_status, trial_ends_at, subscription_ends_at
       FROM users WHERE id = $1`,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.redirect('/login');
    }

    const user = result.rows[0];
    const now = new Date();
    let allowedLeagues = [];

    // Check trial access
    if (user.subscription_status === 'trial' && user.trial_ends_at) {
      const trialEnd = new Date(user.trial_ends_at);
      if (trialEnd > now) {
        allowedLeagues = ['nfl', 'nba'];
      }
    }

    // Check paid subscription access
    if (user.subscription_status === 'active' && user.subscription_ends_at) {
      const subEnd = new Date(user.subscription_ends_at);
      if (subEnd > now) {
        allowedLeagues = ['nfl', 'nba', 'mlb', 'nhl', 'ncaa', 'ncaab'];
      }
    }

    // Check if user has access to this league
    if (allowedLeagues.includes(league)) {
      next();
    } else {
      res.redirect('/pricing');
    }
  } catch (error) {
    console.error('Error checking league access:', error);
    res.redirect('/pricing');
  }
}

// Clean URL routes for league pages
// Protected leagues (trial users: locked, paid users: unlocked)
const protectedLeagues = ['mlb', 'nhl', 'ncaa', 'ncaab'];
protectedLeagues.forEach(league => {
  app.get(`/${league}`, (req, res, next) => {
    req.params.league = league;
    checkLeagueAccess(req, res, next);
  }, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${league}.html`));
  });
});

// Open leagues (accessible to both trial and paid users)
const openLeagues = ['nfl', 'nba'];
openLeagues.forEach(league => {
  app.get(`/${league}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${league}.html`));
  });
});

// Other pages (no access control)
const otherPages = ['LiveGames', 'customize-colors', 'pricing', 'subscription', 'admin', 'favorites', 'reset-password'];
otherPages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
  });
});

// Admin subscription management page - LOCALHOST ONLY
app.get('/admin-subscriptions', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || '';
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';

  if (!isLocalhost) {
    return res.status(403).send('This page is only accessible from localhost');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin-subscriptions.html'));
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
  CACHE_DURATION: 30000, // 30 seconds for live games (increased to avoid ESPN rate limits)
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

// ESPN API Metrics Tracking
const espnMetrics = {
  totalCalls: 0,
  successCalls: 0,
  failedCalls: 0,
  rateLimitHits: 0,
  errorsByStatus: {},
  lastError: null,
  lastErrorTime: null,
  startTime: Date.now()
};

// Enhanced ESPN fetch with retry logic and detailed error handling
async function fetchESPN(url, retries = 3) {
  espnMetrics.totalCalls++;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'GridTVSports/2.0' }
      });

      // Capture rate limit headers (if ESPN provides them)
      const rateLimitHeaders = {
        limit: response.headers['x-ratelimit-limit'],
        remaining: response.headers['x-ratelimit-remaining'],
        reset: response.headers['x-ratelimit-reset'],
        retryAfter: response.headers['retry-after']
      };

      if (rateLimitHeaders.remaining) {
        console.log(`📊 ESPN Rate Limit: ${rateLimitHeaders.remaining}/${rateLimitHeaders.limit} remaining`);
      }

      espnMetrics.successCalls++;
      return response.data;

    } catch (error) {
      const isLastAttempt = attempt === retries;

      // Enhanced error logging
      if (error.response) {
        const status = error.response.status;
        espnMetrics.errorsByStatus[status] = (espnMetrics.errorsByStatus[status] || 0) + 1;

        console.error(`❌ ESPN API Error ${status} (Attempt ${attempt}/${retries}): ${url}`);

        if (status === 429) {
          espnMetrics.rateLimitHits++;
          const retryAfter = error.response.headers['retry-after'] || Math.pow(2, attempt);
          const waitTime = parseInt(retryAfter) * 1000;

          console.error(`⏳ Rate limited! Waiting ${waitTime}ms before retry...`);
          console.error(`Rate limit headers:`, error.response.headers);

          if (!isLastAttempt) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry
          }
        } else if (status === 404) {
          console.error(`🔍 404 Not Found - Check if endpoint/parameters are valid`);
          console.error(`URL: ${url}`);
        }

        // Log response data for debugging
        if (error.response.data) {
          console.error(`Response data:`, error.response.data);
        }
      } else if (error.request) {
        console.error(`❌ ESPN API No Response (Attempt ${attempt}/${retries}): ${url}`);
        console.error(`Network error:`, error.message);
      } else {
        console.error(`❌ ESPN API Request Error (Attempt ${attempt}/${retries}):`, error.message);
      }

      // Store last error for monitoring
      espnMetrics.lastError = {
        url,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
      espnMetrics.lastErrorTime = new Date();

      if (isLastAttempt) {
        espnMetrics.failedCalls++;
        throw error;
      }

      // Wait before retry (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
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

    // Only log when saving a NEW game (not updating existing)
    const isNewGame = !finalGamesStore[sport].has(gameId);

    finalGamesStore[sport].set(gameId, {
      ...gameData,
      savedAt: Date.now(),
      week: week || null
    });

    if (isNewGame) {
      console.log(`💾 Saved final game: ${sport.toUpperCase()} - ${gameId}`);
    }
    res.json({ success: true, gameId, isNew: isNewGame });
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
// HEALTH & MONITORING ENDPOINTS
// ============================================

// ESPN API Health Monitor
app.get('/api/health/espn', (req, res) => {
  const uptime = Date.now() - espnMetrics.startTime;
  const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);

  const successRate = espnMetrics.totalCalls > 0
    ? ((espnMetrics.successCalls / espnMetrics.totalCalls) * 100).toFixed(2)
    : 100;

  const health = {
    status: successRate > 95 ? 'healthy' : successRate > 80 ? 'degraded' : 'unhealthy',
    uptime: `${uptimeHours} hours`,
    uptimeMs: uptime,
    metrics: {
      totalCalls: espnMetrics.totalCalls,
      successCalls: espnMetrics.successCalls,
      failedCalls: espnMetrics.failedCalls,
      successRate: `${successRate}%`,
      rateLimitHits: espnMetrics.rateLimitHits,
      errorsByStatus: espnMetrics.errorsByStatus
    },
    cache: {
      nfl: {
        activeWeeks: Array.from(sportsCache.nfl.activeWeeks),
        cachedWeeks: sportsCache.nfl.data.size
      },
      ncaa: {
        activeWeeks: Array.from(sportsCache.ncaa.activeWeeks),
        cachedWeeks: sportsCache.ncaa.data.size
      },
      nba: {
        activeDates: Array.from(sportsCache.nba.activeDates),
        cachedDates: sportsCache.nba.data.size
      },
      ncaab: {
        activeDates: Array.from(sportsCache.ncaab.activeDates),
        cachedDates: sportsCache.ncaab.data.size
      },
      mlb: {
        activeDates: Array.from(sportsCache.mlb.activeDates),
        cachedDates: sportsCache.mlb.data.size
      },
      nhl: {
        activeDates: Array.from(sportsCache.nhl.activeDates),
        cachedDates: sportsCache.nhl.data.size
      }
    },
    lastError: espnMetrics.lastError ? {
      ...espnMetrics.lastError,
      occurredAt: espnMetrics.lastErrorTime
    } : null
  };

  res.json(health);
});

// Overall System Health
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbResult = await pool.query('SELECT NOW()');
    const dbHealthy = dbResult.rows.length > 0;

    // Check ESPN API health
    const espnSuccessRate = espnMetrics.totalCalls > 0
      ? ((espnMetrics.successCalls / espnMetrics.totalCalls) * 100)
      : 100;

    const overallStatus =
      dbHealthy && espnSuccessRate > 95 ? 'healthy' :
        dbHealthy && espnSuccessRate > 80 ? 'degraded' : 'unhealthy';

    res.json({
      status: overallStatus,
      timestamp: new Date(),
      components: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        espnAPI: espnSuccessRate > 95 ? 'healthy' : espnSuccessRate > 80 ? 'degraded' : 'unhealthy',
        cache: 'healthy'
      },
      metrics: {
        espnAPISuccessRate: `${espnSuccessRate.toFixed(2)}%`,
        espnAPICalls: espnMetrics.totalCalls,
        activeSports: [
          sportsCache.nfl.activeWeeks.size > 0 ? 'NFL' : null,
          sportsCache.ncaa.activeWeeks.size > 0 ? 'NCAA' : null,
          sportsCache.nba.activeDates.size > 0 ? 'NBA' : null,
          sportsCache.ncaab.activeDates.size > 0 ? 'NCAAB' : null,
          sportsCache.mlb.activeDates.size > 0 ? 'MLB' : null,
          sportsCache.nhl.activeDates.size > 0 ? 'NHL' : null
        ].filter(Boolean)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
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
