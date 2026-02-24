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
const webpush = require('web-push');
const {
  pool,
  saveGame,
  saveDrives,
  savePlays,
  getGameDrives,
  getGamePlays,
  getGamesWithPlays,
  markGameHasPlays,
  hasCompletePlays,
  getGameForReplay
} = require('./db');
require('dotenv').config();

// Firebase Admin SDK for FCM (Firebase Cloud Messaging)
let firebaseAdmin = null;
let fcmConfigured = false;
const firebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const firebaseServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (firebaseServiceAccountPath || firebaseServiceAccountJson) {
  try {
    const admin = require('firebase-admin');
    let serviceAccount;

    if (firebaseServiceAccountJson) {
      // Parse JSON from environment variable (recommended for cloud deployments)
      serviceAccount = JSON.parse(firebaseServiceAccountJson);
      console.log('   Using FIREBASE_SERVICE_ACCOUNT_JSON environment variable');
    } else {
      // Load from file path (good for local development)
      serviceAccount = require(firebaseServiceAccountPath);
      console.log('   Using file:', firebaseServiceAccountPath);
    }

    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    fcmConfigured = true;
    console.log('✅ Firebase Admin SDK initialized for FCM');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.log('   Make sure Firebase credentials are valid');
  }
} else {
  console.log('⚠️ Firebase Cloud Messaging not configured');
  console.log('   Set FIREBASE_SERVICE_ACCOUNT_PATH (file) or FIREBASE_SERVICE_ACCOUNT_JSON (JSON string)');
  console.log('   Android push notifications will not work without FCM');
}

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

// Web Push configuration
let webPushConfigured = false;
const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@gridtvsports.com';

// Debug: Log if VAPID keys are present (not the actual values for security)
console.log(`[VAPID] Public key present: ${!!vapidPublic}, Private key present: ${!!vapidPrivate}`);

if (vapidPublic && vapidPrivate) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    webPushConfigured = true;
    console.log('✅ Web Push notifications configured');
  } catch (error) {
    console.error('❌ Failed to configure Web Push:', error.message);
  }
} else {
  console.log('⚠️ Web Push not configured - VAPID keys missing');
  if (!vapidPublic) console.log('   Missing: VAPID_PUBLIC_KEY');
  if (!vapidPrivate) console.log('   Missing: VAPID_PRIVATE_KEY');
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
// SERVICE WORKER & JS FILES (MUST BE BEFORE HELMET/SECURITY MIDDLEWARE)
// ============================================
app.get('/service-worker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'service-worker.js'));
});

// Serve JavaScript files with correct MIME type
app.get('/scripts/*.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', req.path));
});

app.get('/js/*.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', req.path));
});

// Serve manifest.json with correct MIME type for PWA
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Serve SVG files with correct MIME type
app.get('/assets/*.svg', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.sendFile(path.join(__dirname, 'public', req.path));
});

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet security headers (configured for development/production)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://a.espncdn.com", "https://*.espncdn.com", "https://*.stripe.com", "https://www.mlbstatic.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://statsapi.mlb.com", "wss:", "ws:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com", "http://localhost:3001", "https://localhost:3001"],
      frameAncestors: ["'self'", "http://localhost:3001", "https://localhost:3001"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "same-origin" },
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
  validate: false // Disable validation warnings for custom keyGenerator
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
  validate: false // Disable validation warnings for custom keyGenerator
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

  // Redirect to landing page for page requests
  return res.redirect('/landing');
}

// ============================================
// AUTH ROUTES
// ============================================

// Check authentication status
app.get('/api/auth/check', async (req, res) => {
  // Check for web session first
  let userId = req.session?.userId;

  // If no web session, check for TV session token (since this endpoint bypasses auth middleware)
  if (!userId) {
    const tvSessionToken = req.query.tvSession || req.headers['x-tv-session'];
    if (tvSessionToken) {
      try {
        const tvResult = await pool.query(
          'SELECT user_id FROM tv_sessions WHERE session_token = $1 AND is_active = TRUE',
          [tvSessionToken]
        );
        if (tvResult.rows.length > 0) {
          userId = tvResult.rows[0].user_id;
        }
      } catch (err) {
        console.error('TV session check error in /api/auth/check:', err);
      }
    }
  }

  if (userId) {
    try {
      // Get subscription status and user info
      const result = await pool.query(
        'SELECT id, email, display_name, subscription_status, subscription_plan, trial_ends_at FROM users WHERE id = $1',
        [userId]
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
          id: userId,
          email: req.session?.userEmail || user.email,
          displayName: req.session?.displayName || user.display_name
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
          id: userId,
          email: req.session?.userEmail,
          displayName: req.session?.displayName
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
// PUSH NOTIFICATIONS API
// ============================================

// Get VAPID public key for client subscription
app.get('/api/push/vapid-public-key', (req, res) => {
  if (!webPushConfigured) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
app.post('/api/push/subscribe', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!webPushConfigured) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }

  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Invalid subscription data' });
  }

  try {
    // Upsert subscription using UPDATE-then-INSERT pattern
    // (ON CONFLICT requires UNIQUE constraint which may not exist)
    const userAgent = req.headers['user-agent'] || null;

    // First try to update existing record
    const updateResult = await pool.query(`
      UPDATE push_subscriptions
      SET user_id = $1, p256dh_key = $3, auth_key = $4, user_agent = $5, is_active = TRUE, updated_at = NOW()
      WHERE endpoint = $2
      RETURNING id
    `, [req.session.userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent]);

    // If no rows updated, insert new record (with race condition handling)
    if (updateResult.rowCount === 0) {
      try {
        await pool.query(`
          INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `, [req.session.userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent]);
      } catch (insertError) {
        // Handle race condition: if another request inserted the same endpoint, update instead
        if (insertError.code === '23505') { // unique_violation
          await pool.query(`
            UPDATE push_subscriptions
            SET user_id = $1, p256dh_key = $3, auth_key = $4, user_agent = $5, is_active = TRUE, updated_at = NOW()
            WHERE endpoint = $2
          `, [req.session.userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent]);
        } else {
          throw insertError;
        }
      }
    }

    // Create default notification preferences if not exists
    await pool.query(`
      INSERT INTO notification_preferences (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [req.session.userId]);

    console.log(`[Push] User ${req.session.userId} subscribed to push notifications`);
    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Unsubscribe from push notifications
app.post('/api/push/unsubscribe', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  try {
    await pool.query(
      'UPDATE push_subscriptions SET is_active = FALSE, updated_at = NOW() WHERE endpoint = $1 AND user_id = $2',
      [endpoint, req.session.userId]
    );
    console.log(`[Push] User ${req.session.userId} unsubscribed from push notifications`);
    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// ============================================
// FCM (Firebase Cloud Messaging) ENDPOINTS
// ============================================

// Register FCM token (for Android app)
app.post('/api/push/fcm/register', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { fcm_token, device_id, device_info } = req.body;
  if (!fcm_token) {
    return res.status(400).json({ error: 'FCM token is required' });
  }

  try {
    // Upsert FCM subscription using UPDATE-then-INSERT pattern
    // (ON CONFLICT requires UNIQUE constraint which may not exist)
    const deviceInfoJson = device_info ? JSON.stringify(device_info) : null;
    const userAgent = req.headers['user-agent'] || null;

    // First try to update existing record
    const updateResult = await pool.query(`
      UPDATE push_subscriptions
      SET user_id = $1, device_id = $3, device_info = $4::jsonb, user_agent = $5, is_active = TRUE, updated_at = NOW()
      WHERE fcm_token = $2
      RETURNING id
    `, [req.session.userId, fcm_token, device_id || null, deviceInfoJson, userAgent]);

    // If no rows updated, insert new record (with race condition handling)
    if (updateResult.rowCount === 0) {
      try {
        await pool.query(`
          INSERT INTO push_subscriptions (user_id, subscription_type, fcm_token, device_id, device_info, user_agent, updated_at)
          VALUES ($1, 'fcm', $2, $3, $4::jsonb, $5, NOW())
        `, [req.session.userId, fcm_token, device_id || null, deviceInfoJson, userAgent]);
      } catch (insertError) {
        // Handle race condition: if another request inserted the same token, update instead
        if (insertError.code === '23505') { // unique_violation
          await pool.query(`
            UPDATE push_subscriptions
            SET user_id = $1, device_id = $3, device_info = $4::jsonb, user_agent = $5, is_active = TRUE, updated_at = NOW()
            WHERE fcm_token = $2
          `, [req.session.userId, fcm_token, device_id || null, deviceInfoJson, userAgent]);
        } else {
          throw insertError;
        }
      }
    }

    // Create default notification preferences if not exists
    await pool.query(`
      INSERT INTO notification_preferences (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [req.session.userId]);

    console.log(`[FCM] User ${req.session.userId} registered FCM token (device: ${device_id || 'unknown'})`);
    res.json({ success: true, message: 'FCM token registered successfully' });
  } catch (error) {
    console.error('Error saving FCM subscription:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to register FCM token', details: error.message });
  }
});

// Unregister FCM token
app.post('/api/push/fcm/unregister', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { fcm_token } = req.body;
  if (!fcm_token) {
    return res.status(400).json({ error: 'FCM token is required' });
  }

  try {
    await pool.query(
      'UPDATE push_subscriptions SET is_active = FALSE, updated_at = NOW() WHERE fcm_token = $1 AND user_id = $2',
      [fcm_token, req.session.userId]
    );
    console.log(`[FCM] User ${req.session.userId} unregistered FCM token`);
    res.json({ success: true, message: 'FCM token unregistered' });
  } catch (error) {
    console.error('Error removing FCM subscription:', error);
    res.status(500).json({ error: 'Failed to unregister FCM token' });
  }
});

// Get FCM status for current user
app.get('/api/push/fcm/status', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = $1 AND subscription_type = $2 AND is_active = TRUE',
      [req.session.userId, 'fcm']
    );
    const hasActiveToken = parseInt(result.rows[0].count) > 0;
    res.json({
      fcmConfigured: fcmConfigured,
      hasActiveToken: hasActiveToken
    });
  } catch (error) {
    console.error('Error checking FCM status:', error);
    res.status(500).json({ error: 'Failed to check FCM status' });
  }
});

// Get notification preferences
app.get('/api/push/preferences', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      // Return defaults
      return res.json({
        game_start_alerts: true,
        minutes_before_game: 15,
        notify_favorite_teams_only: true,
        notify_leagues: ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'],
        quiet_hours_start: null,
        quiet_hours_end: null,
        score_update_alerts: false
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update notification preferences
app.put('/api/push/preferences', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const {
    game_start_alerts,
    minutes_before_game,
    notify_favorite_teams_only,
    notify_leagues,
    quiet_hours_start,
    quiet_hours_end,
    score_update_alerts
  } = req.body;

  try {
    await pool.query(`
      INSERT INTO notification_preferences (
        user_id, game_start_alerts, minutes_before_game, notify_favorite_teams_only,
        notify_leagues, quiet_hours_start, quiet_hours_end, score_update_alerts, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        game_start_alerts = COALESCE($2, notification_preferences.game_start_alerts),
        minutes_before_game = COALESCE($3, notification_preferences.minutes_before_game),
        notify_favorite_teams_only = COALESCE($4, notification_preferences.notify_favorite_teams_only),
        notify_leagues = COALESCE($5, notification_preferences.notify_leagues),
        quiet_hours_start = $6,
        quiet_hours_end = $7,
        score_update_alerts = COALESCE($8, notification_preferences.score_update_alerts),
        updated_at = NOW()
    `, [
      req.session.userId,
      game_start_alerts,
      minutes_before_game,
      notify_favorite_teams_only,
      notify_leagues ? JSON.stringify(notify_leagues) : null,
      quiet_hours_start || null,
      quiet_hours_end || null,
      score_update_alerts
    ]);

    res.json({ success: true, message: 'Preferences updated' });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get push subscription status
app.get('/api/push/status', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = $1 AND is_active = TRUE',
      [req.session.userId]
    );

    res.json({
      configured: webPushConfigured,
      subscribed: parseInt(result.rows[0].count) > 0,
      deviceCount: parseInt(result.rows[0].count)
    });
  } catch (error) {
    console.error('Error checking push status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Send test notification (for debugging)
app.post('/api/push/test', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Check if at least one notification system is configured
  if (!webPushConfigured && !fcmConfigured) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }

  try {
    const subscriptions = await pool.query(
      'SELECT * FROM push_subscriptions WHERE user_id = $1 AND is_active = TRUE',
      [req.session.userId]
    );

    if (subscriptions.rows.length === 0) {
      return res.status(400).json({ error: 'No active push subscriptions found' });
    }

    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const sub of subscriptions.rows) {
      try {
        if (sub.subscription_type === 'fcm' && sub.fcm_token && fcmConfigured) {
          // Send via Firebase Cloud Messaging
          const admin = require('firebase-admin');
          const fcmMessage = {
            token: sub.fcm_token,
            notification: {
              title: '🏈 GridTV Sports Test',
              body: 'Push notifications are working!'
            },
            android: {
              notification: {
                icon: 'ic_notification',
                color: '#FF6B00',
                channelId: 'gridtv_game_alerts'
              }
            },
            data: {
              type: 'test',
              url: 'https://gridtvsports.com'
            }
          };

          await admin.messaging().send(fcmMessage);
          console.log(`[FCM] Test notification sent to user ${req.session.userId}`);
          sent++;
        } else if (sub.subscription_type === 'web' && sub.endpoint && webPushConfigured) {
          // Send via Web Push
          const payload = JSON.stringify({
            title: '🏈 GridTV Sports Test',
            body: 'Push notifications are working!',
            icon: '/logos/gridtv-icon-192.png',
            tag: 'test-notification'
          });

          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key
            }
          };

          await webpush.sendNotification(pushSubscription, payload);
          console.log(`[WebPush] Test notification sent to user ${req.session.userId}`);
          sent++;
        }
      } catch (error) {
        console.error('[Push] Failed to send test notification:', error.message);
        console.error('[Push] Error details:', JSON.stringify({
          code: error.code,
          errorInfo: error.errorInfo,
          statusCode: error.statusCode
        }, null, 2));
        failed++;
        errors.push({
          type: sub.subscription_type,
          code: error.code || 'unknown',
          message: error.message
        });
        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404 ||
            error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/mismatched-credential') {
          if (sub.subscription_type === 'fcm') {
            await pool.query(
              'UPDATE push_subscriptions SET is_active = FALSE WHERE fcm_token = $1',
              [sub.fcm_token]
            );
          } else {
            await pool.query(
              'UPDATE push_subscriptions SET is_active = FALSE WHERE endpoint = $1',
              [sub.endpoint]
            );
          }
        }
      }
    }

    res.json({ success: sent > 0, sent, failed, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Debug endpoint to check notification configuration
app.get('/api/push/debug', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const userId = req.session.userId;
    const now = Date.now();

    // Get user's notification preferences
    const prefsResult = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    // Get user's favorite teams
    const favTeamsResult = await pool.query(
      'SELECT team_id, team_name, team_abbreviation, league, rank FROM favorite_teams WHERE user_id = $1 ORDER BY rank',
      [userId]
    );

    // Get active push subscriptions
    const subsResult = await pool.query(
      'SELECT subscription_type, is_active, created_at FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );

    // Get upcoming games (same logic as cron job)
    const upcomingGames = [];
    const maxMinutesBefore = 30;

    const extractUpcomingGames = (cache, sport) => {
      for (const [key, cachedData] of cache.data.entries()) {
        if (!cachedData?.data?.events) continue;
        for (const event of cachedData.data.events) {
          const competition = event.competitions?.[0];
          if (!competition) continue;

          const gameTime = new Date(event.date || competition.date);
          const minutesUntilStart = (gameTime.getTime() - now) / (1000 * 60);

          if (minutesUntilStart > 0 && minutesUntilStart <= maxMinutesBefore) {
            const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
            const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');

            if (homeTeam && awayTeam) {
              upcomingGames.push({
                gameId: event.id,
                sport: sport.toUpperCase(),
                homeTeam: {
                  id: homeTeam.team?.id,
                  name: homeTeam.team?.displayName,
                  abbreviation: homeTeam.team?.abbreviation
                },
                awayTeam: {
                  id: awayTeam.team?.id,
                  name: awayTeam.team?.displayName,
                  abbreviation: awayTeam.team?.abbreviation
                },
                gameTime: gameTime.toISOString(),
                minutesUntilStart: Math.round(minutesUntilStart),
                shortName: event.shortName || `${awayTeam.team?.abbreviation} @ ${homeTeam.team?.abbreviation}`
              });
            }
          }
        }
      }
    };

    extractUpcomingGames(sportsCache.nfl, 'NFL');
    extractUpcomingGames(sportsCache.nba, 'NBA');
    extractUpcomingGames(sportsCache.mlb, 'MLB');
    extractUpcomingGames(sportsCache.nhl, 'NHL');
    extractUpcomingGames(sportsCache.ncaa, 'NCAAF');
    extractUpcomingGames(sportsCache.ncaab, 'NCAAB');

    // Check which games match user's favorite teams
    const prefs = prefsResult.rows[0] || {};
    // Include BOTH team_id and team_abbreviation for flexible matching
    const favoriteTeamIds = favTeamsResult.rows.flatMap(r => {
      const ids = [];
      if (r.team_id) ids.push(r.team_id);
      if (r.team_abbreviation) ids.push(r.team_abbreviation);
      return ids;
    });
    const minutesBefore = prefs.minutes_before_game || 15;
    const notifyLeagues = prefs.notify_leagues || ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];

    const matchingGames = upcomingGames.filter(game => {
      // Check league filter
      if (!notifyLeagues.includes(game.sport)) return false;

      // Check notification window
      if (game.minutesUntilStart > minutesBefore) return false;

      // Check favorite team match (if enabled)
      if (prefs.notify_favorite_teams_only !== false && favoriteTeamIds.length > 0) {
        // Check multiple ID formats (same logic as cron job):
        const homeMatch = favoriteTeamIds.includes(game.homeTeam.id) ||
          favoriteTeamIds.includes(`${game.sport}-${game.homeTeam.id}`) ||
          favoriteTeamIds.includes(game.homeTeam.abbreviation);
        const awayMatch = favoriteTeamIds.includes(game.awayTeam.id) ||
          favoriteTeamIds.includes(`${game.sport}-${game.awayTeam.id}`) ||
          favoriteTeamIds.includes(game.awayTeam.abbreviation);
        return homeMatch || awayMatch;
      }

      return true;
    });

    res.json({
      userId,
      pushConfigured: {
        webPush: webPushConfigured,
        fcm: fcmConfigured
      },
      preferences: prefsResult.rows[0] || { message: 'No preferences set (using defaults)' },
      favoriteTeams: favTeamsResult.rows,
      subscriptions: subsResult.rows,
      upcomingGames,
      matchingGames,
      analysis: {
        hasActiveSubscriptions: subsResult.rows.some(s => s.is_active),
        hasFavoriteTeams: favTeamsResult.rows.length > 0,
        gameStartAlertsEnabled: prefs.game_start_alerts !== false,
        notificationWindow: `${minutesBefore} minutes before game`,
        favoriteTeamsOnly: prefs.notify_favorite_teams_only !== false,
        enabledLeagues: notifyLeagues,
        gamesInWindow: upcomingGames.length,
        gamesMatchingPreferences: matchingGames.length
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Failed to get debug info', details: error.message });
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
  // Support both web session and TV session authentication
  const userId = req.session?.userId || req.tvUserId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await pool.query(
      `SELECT subscription_status, subscription_plan, trial_ends_at, subscription_ends_at
       FROM users WHERE id = $1`,
      [userId]
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

// Validate sports bar mode access
app.post('/api/subscription/validate-grid', async (req, res) => {
  // Support both web session and TV session authentication
  const userId = req.session?.userId || req.tvUserId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated', allowed: false });
  }

  const { gridSize } = req.body;

  try {
    const result = await pool.query(
      `SELECT subscription_status, subscription_plan, trial_ends_at, subscription_ends_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found', allowed: false });
    }

    const user = result.rows[0];
    const now = new Date();

    let allowedGrids = [];

    // Check if user has active trial
    if (user.subscription_status === 'trial' && user.trial_ends_at) {
      const trialEnd = new Date(user.trial_ends_at);
      if (trialEnd > now) {
        allowedGrids = [1, 2];
      }
    }

    // Check if user has active paid subscription
    if (user.subscription_status === 'active' && user.subscription_ends_at) {
      const subEnd = new Date(user.subscription_ends_at);
      if (subEnd > now) {
        allowedGrids = [1, 2, 3, 4, 6, 8];
      }
    }

    const allowed = allowedGrids.includes(parseInt(gridSize));

    if (!allowed) {
      console.log(`🚫 Grid validation failed: User ${userId} tried to access ${gridSize}-grid (allowed: ${allowedGrids.join(', ')})`);
    }

    res.json({
      allowed,
      allowedGrids,
      maxGrid: Math.max(...allowedGrids, 0),
      message: allowed ? 'Access granted' : 'Upgrade to access this grid size'
    });
  } catch (error) {
    console.error('Error validating grid access:', error);
    res.status(500).json({ error: 'Failed to validate access', allowed: false });
  }
});

// Debug endpoint to check Stripe configuration (TEMPORARY - for troubleshooting)
app.get('/api/debug/stripe-status', (req, res) => {
  const debugInfo = {
    stripeInitialized: !!stripe,
    environmentVariables: {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      secretKeyStart: process.env.STRIPE_SECRET_KEY ?
        process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...' : 'NOT SET',
      secretKeyLength: process.env.STRIPE_SECRET_KEY ?
        process.env.STRIPE_SECRET_KEY.length : 0,
      containsKeyVault: process.env.STRIPE_SECRET_KEY ?
        process.env.STRIPE_SECRET_KEY.includes('@Microsoft.KeyVault') : false,
      containsPlaceholder: process.env.STRIPE_SECRET_KEY ?
        process.env.STRIPE_SECRET_KEY.includes('your_stripe') : false,
      hasPublishableKey: !!process.env.STRIPE_PUBLISHABLE_KEY,
      publishableKeyStart: process.env.STRIPE_PUBLISHABLE_KEY ?
        process.env.STRIPE_PUBLISHABLE_KEY.substring(0, 7) + '...' : 'NOT SET',
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      webhookSecretStart: process.env.STRIPE_WEBHOOK_SECRET ?
        process.env.STRIPE_WEBHOOK_SECRET.substring(0, 7) + '...' : 'NOT SET',
      hasMonthlyPriceId: !!process.env.STRIPE_MONTHLY_PRICE_ID,
      monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID || 'NOT SET',
      hasYearlyPriceId: !!process.env.STRIPE_YEARLY_PRICE_ID,
      yearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID || 'NOT SET',
    },
    nodeEnv: process.env.NODE_ENV || 'not set',
    timestamp: new Date().toISOString()
  };

  console.log('🔍 Stripe Debug Info:', JSON.stringify(debugInfo, null, 2));
  res.json(debugInfo);
});

// Get available plans (from database)
app.get('/api/subscription/plans', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT plan_type, price, discount_percentage, features
      FROM pricing_config
      WHERE is_active = true
      ORDER BY plan_type
    `);

    const plans = result.rows.map(row => {
      const isYearly = row.plan_type === 'yearly';
      return {
        id: row.plan_type,
        name: row.plan_type.charAt(0).toUpperCase() + row.plan_type.slice(1),
        price: parseFloat(row.price),
        priceId: isYearly ? process.env.STRIPE_YEARLY_PRICE_ID : process.env.STRIPE_MONTHLY_PRICE_ID,
        interval: isYearly ? 'year' : 'month',
        savings: row.discount_percentage > 0 ? `${row.discount_percentage}%` : null,
        features: row.features || []
      };
    });

    res.json({ plans });
  } catch (error) {
    console.error('❌ Error fetching pricing plans:', error);
    // Fallback to hardcoded values if database fails
    res.json({
      plans: [
        {
          id: 'monthly',
          name: 'Monthly',
          price: 7.99,
          priceId: process.env.STRIPE_MONTHLY_PRICE_ID,
          interval: 'month',
          features: [
            'Watch up to 8 games in one view',
            'All leagues (NFL, NBA, MLB, NHL, NCAA)',
            'No ads or interruptions',
            'Sports Bar Mode with custom layouts'
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
            'Watch up to 8 games in one view',
            'All leagues (NFL, NBA, MLB, NHL, NCAA)',
            'No ads or interruptions',
            'Sports Bar Mode with custom layouts',
            '20% savings vs monthly'
          ]
        }
      ]
    });
  }
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
    console.log('🏛️ Creating portal session for user:', req.session.userId);

    const userResult = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.session.userId]
    );

    console.log('📊 Portal - User query result:', userResult.rows.length > 0 ? 'User found' : 'User not found');

    if (userResult.rows.length === 0) {
      console.log('❌ Portal - User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userResult.rows[0].stripe_customer_id) {
      console.log('⚠️ Portal - User has no Stripe customer ID');
      return res.status(400).json({ error: 'No subscription found - please subscribe first' });
    }

    console.log('👤 Portal - Creating session for customer:', userResult.rows[0].stripe_customer_id);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userResult.rows[0].stripe_customer_id,
      return_url: `${req.protocol}://${req.get('host')}/subscription`,
    });

    console.log('✅ Portal session created:', portalSession.id);

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('❌ Portal error:', error.message);
    console.error('Portal error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create portal session: ' + error.message });
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
    console.log('🔄 Syncing subscription status from Stripe for user:', req.session.userId);

    // Get user's Stripe customer ID
    const userResult = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.session.userId]
    );

    console.log('📊 User query result:', userResult.rows.length > 0 ? 'User found' : 'User not found');

    if (userResult.rows.length === 0) {
      console.log('❌ User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userResult.rows[0].stripe_customer_id) {
      console.log('⚠️ User has no Stripe customer ID - not subscribed yet');
      return res.json({
        synced: false,
        message: 'No Stripe customer found - user has not subscribed yet'
      });
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
// ADMIN PRICING MANAGEMENT
// ============================================

// Get pricing configuration for admin
app.get('/api/admin/pricing', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, plan_type, price, discount_percentage, features, is_active, updated_at
      FROM pricing_config
      ORDER BY plan_type
    `);

    res.json({ pricing: result.rows });
  } catch (error) {
    console.error('❌ Error fetching pricing config:', error);
    res.status(500).json({ error: 'Failed to fetch pricing configuration' });
  }
});

// Update pricing configuration
app.put('/api/admin/pricing/:planType', requireAdmin, async (req, res) => {
  try {
    const { planType } = req.params;
    const { price, discount_percentage, features } = req.body;

    // Validate inputs
    if (price !== undefined && (isNaN(price) || price < 0)) {
      return res.status(400).json({ error: 'Invalid price value' });
    }

    if (discount_percentage !== undefined && (isNaN(discount_percentage) || discount_percentage < 0 || discount_percentage > 100)) {
      return res.status(400).json({ error: 'Discount must be between 0 and 100' });
    }

    if (features && !Array.isArray(features)) {
      return res.status(400).json({ error: 'Features must be an array' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      values.push(price);
    }

    if (discount_percentage !== undefined) {
      updates.push(`discount_percentage = $${paramIndex++}`);
      values.push(discount_percentage);
    }

    if (features) {
      updates.push(`features = $${paramIndex++}`);
      values.push(JSON.stringify(features));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(planType);

    const result = await pool.query(
      `UPDATE pricing_config
       SET ${updates.join(', ')}
       WHERE plan_type = $${paramIndex}
       RETURNING id, plan_type, price, discount_percentage, features, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pricing plan not found' });
    }

    console.log(`[Admin] Pricing updated for ${planType} plan by admin ${req.session.userId}`);
    res.json({ success: true, pricing: result.rows[0] });
  } catch (error) {
    console.error('❌ Error updating pricing:', error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
});

// ============================================
// GRID CONFIGURATION API (Admin Tool)
// ============================================

// Get current grid configuration
app.get('/api/admin/grid-config', requireLocalhost, async (req, res) => {
  try {
    const fs = require('fs').promises;
    const cssPath = path.join(__dirname, 'public', 'styles', 'fullscreen-cards.css');

    // Read the CSS file
    const cssContent = await fs.readFile(cssPath, 'utf8');

    // Parse CSS variables (basic parsing)
    const configVars = {};
    const varRegex = /--fs-([^:]+):\s*([^;]+);/g;
    let match;

    while ((match = varRegex.exec(cssContent)) !== null) {
      configVars[match[1]] = match[2].trim();
    }

    res.json({
      success: true,
      config: configVars,
      cssPath: 'public/styles/fullscreen-cards.css'
    });
  } catch (error) {
    console.error('❌ Error reading grid config:', error);
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

// Save grid configuration to CSS file
app.post('/api/admin/grid-config', requireLocalhost, async (req, res) => {
  try {
    const fs = require('fs').promises;
    const cssPath = path.join(__dirname, 'public', 'styles', 'fullscreen-cards.css');
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'No configuration provided' });
    }

    // Read current CSS file
    let cssContent = await fs.readFile(cssPath, 'utf8');

    // Backup the original file
    const backupPath = cssPath + '.backup';
    await fs.writeFile(backupPath, cssContent);

    // Generate CSS variables from config
    const cssVariables = [];
    const devices = ['mobile', 'tablet', 'desktop', 'tv'];
    const grids = [1, 2, 3, 4, 5, 6, 7, 8];

    devices.forEach(device => {
      grids.forEach(grid => {
        const gridConfig = config[device]?.[grid];
        if (gridConfig) {
          Object.entries(gridConfig).forEach(([element, props]) => {
            Object.entries(props).forEach(([prop, value]) => {
              if (value && typeof value === 'object') {
                const varName = `--fs-${element}-${prop}-${device}-grid-${grid}`;
                const clampValue = `clamp(${value.min}${value.unit}, ${value.preferred}vmin, ${value.max}${value.unit})`;
                cssVariables.push(`  ${varName}: ${clampValue};`);
              }
            });
          });
        }
      });
    });

    // Check if :root section exists with grid config comment
    const gridConfigSection = `/* Grid Configuration Tool Variables */`;
    const endComment = `/* End Grid Config */`;

    if (cssContent.includes(gridConfigSection)) {
      // Replace existing section
      const startIndex = cssContent.indexOf(gridConfigSection);
      const endIndex = cssContent.indexOf(endComment);

      if (endIndex > startIndex) {
        cssContent = cssContent.substring(0, startIndex) +
          gridConfigSection + '\n' +
          cssVariables.join('\n') + '\n' +
          endComment +
          cssContent.substring(endIndex + endComment.length);
      }
    } else {
      // Add new section at the beginning of :root
      const rootIndex = cssContent.indexOf(':root {');
      if (rootIndex !== -1) {
        const insertIndex = cssContent.indexOf('{', rootIndex) + 1;
        cssContent = cssContent.substring(0, insertIndex) + '\n' +
          '  ' + gridConfigSection + '\n' +
          cssVariables.join('\n') + '\n' +
          '  ' + endComment + '\n' +
          cssContent.substring(insertIndex);
      }
    }

    // Write updated CSS
    await fs.writeFile(cssPath, cssContent);

    console.log(`[Admin] Grid configuration saved to ${cssPath}`);
    res.json({
      success: true,
      message: 'Configuration saved successfully',
      variablesCount: cssVariables.length
    });
  } catch (error) {
    console.error('❌ Error saving grid config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// ============================================
// STATIC FILE SERVING (with auth protection)
// ============================================

// Public routes (no auth required)
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets'), {
  setHeaders: (res, filePath) => {
    // Ensure correct MIME types for images
    if (filePath.endsWith('.jpeg') || filePath.endsWith('.jpg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/dist', express.static(path.join(__dirname, 'public', 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));
app.use('/scripts', express.static(path.join(__dirname, 'public', 'scripts'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));
app.use('/styles', express.static(path.join(__dirname, 'public', 'styles'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// List of valid page routes (without .html)
const pageRoutes = ['nfl', 'nba', 'mlb', 'nhl', 'ncaa', 'ncaab', 'LiveGames', 'customize-colors', 'pricing', 'subscription', 'admin', 'admin-subscriptions'];

// Protected static files (require auth)
app.use((req, res, next) => {
  // Skip auth check for public pages, assets, auth API, and OPTIONS requests
  if (req.path === '/' ||
    req.path === '/landing' ||
    req.path === '/landing.html' ||
    req.path === '/login' ||
    req.path === '/login.html' ||
    req.path === '/pricing' ||
    req.path === '/pricing.html' ||
    req.path === '/reset-password.html' ||
    req.path === '/tv-receiver' ||
    req.path === '/tv-receiver.html' ||
    req.path === '/tv-auth' ||
    req.path === '/tv-auth.html' ||
    req.path === '/tv-home' ||
    req.path === '/tv-home.html' ||
    req.path === '/tv-sports-bar' ||
    req.path === '/tv-sports-bar.html' ||
    req.path.startsWith('/assets/') ||
    req.path.startsWith('/css/') ||
    req.path.startsWith('/dist/') ||
    req.path.startsWith('/scripts/') ||
    req.path.startsWith('/styles/') ||
    req.path.startsWith('/api/auth/') ||
    // Public game data APIs (for TV receiver and public access)
    req.path.startsWith('/api/nfl/') ||
    req.path.startsWith('/api/nba/') ||
    req.path.startsWith('/api/mlb/') ||
    req.path.startsWith('/api/nhl/') ||
    req.path.startsWith('/api/ncaa/') ||
    req.path.startsWith('/api/ncaab/') ||
    req.path.startsWith('/api/health') ||
    req.path.startsWith('/api/final-games/') ||
    // TV authentication APIs (must be public for QR code flow)
    req.path.startsWith('/api/tv/') ||
    // Replay APIs (for game replay testing)
    req.path.startsWith('/api/replay/') ||
    req.method === 'OPTIONS') {
    return next();
  }

  // Check if authenticated via web session
  if (req.session && req.session.userId) {
    return next();
  }

  // Check for TV mode authentication via session token
  const tvSessionToken = req.query.tvSession || req.headers['x-tv-session'];
  const isTV = req.query.tv === '1' ||
    (req.headers['user-agent'] && (
      req.headers['user-agent'].includes('AndroidTV') ||
      req.headers['user-agent'].includes('FireTV') ||
      req.headers['user-agent'].includes('GridTVSports-AndroidTV')
    ));

  // Debug logging for TV auth
  if (isTV || tvSessionToken) {
    console.log(`📺 TV Auth Check: path=${req.path}, isTV=${isTV}, hasToken=${!!tvSessionToken}, tokenPrefix=${tvSessionToken?.substring(0, 8) || 'none'}`);
  }

  // Accept TV session token for authentication (don't require isTV flag for API calls)
  // This allows tvFetch() to work by just adding the x-tv-session header
  if (tvSessionToken) {
    // Validate TV session token asynchronously
    pool.query(
      'SELECT user_id FROM tv_sessions WHERE session_token = $1 AND is_active = TRUE',
      [tvSessionToken]
    ).then(result => {
      console.log(`📺 TV Session validation: found=${result.rows.length > 0}, path=${req.path}`);
      if (result.rows.length > 0) {
        // Valid TV session - allow access
        req.tvUserId = result.rows[0].user_id;
        next();
      } else {
        // Invalid TV session - redirect to tv-home for re-auth
        console.log(`📺 TV Session INVALID - token not found or inactive: ${tvSessionToken.substring(0, 8)}...`);
        const cleanPath = req.path.replace(/^\//, '').replace(/\.html$/, '');
        const isPageRequest = req.path === '/' ||
          req.path.endsWith('.html') ||
          pageRoutes.includes(cleanPath);

        if (isPageRequest) {
          return res.redirect('/tv-home?expired=1');
        }
        return res.status(401).json({ error: 'TV session expired' });
      }
    }).catch(err => {
      console.error('TV session validation error:', err);
      return res.status(500).json({ error: 'Server error' });
    });
    return; // Wait for async validation
  }

  // Not authenticated - redirect or return 401
  const cleanPath = req.path.replace(/^\//, '').replace(/\.html$/, '');
  const isPageRequest = req.path === '/' ||
    req.path.endsWith('.html') ||
    pageRoutes.includes(cleanPath);

  if (isPageRequest) {
    // If TV mode, redirect to tv-home instead of landing
    if (isTV) {
      return res.redirect('/tv-home');
    }
    return res.redirect('/landing');
  }
  // For API requests, return 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  next();
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// ============================================
// CLEAN URL ROUTES (no .html extension)
// ============================================

// Landing page (public)
app.get('/landing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

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

  // Check for web session OR TV session
  const userId = req.session?.userId || req.tvUserId;
  const isTV = req.query.tv === '1' || !!req.tvUserId;

  if (!userId) {
    return res.redirect(isTV ? '/tv-home' : '/landing');
  }

  try {
    const result = await pool.query(
      `SELECT subscription_status, trial_ends_at, subscription_ends_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.redirect(isTV ? '/tv-home' : '/landing');
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
      res.redirect(isTV ? '/tv-home' : '/pricing');
    }
  } catch (error) {
    console.error('Error checking league access:', error);
    res.redirect(isTV ? '/tv-home' : '/pricing');
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
const otherPages = ['LiveGames', 'customize-colors', 'pricing', 'subscription', 'admin', 'favorites', 'reset-password', 'scoreboard-demo', 'notification-debug', 'mlb-livecast-demo'];
otherPages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
  });
});

// Debug console page - Admin only (direct URL access)
app.get('/debug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'debug.html'));
});

// Test field perspective page
app.get('/test-field', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-field.html'));
});

// Test field animations page
app.get('/test-field-animations', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-field-animations.html'));
});

// V2 Homepage Preview (redesigned UI - no auth required for preview)
app.get('/v2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index-v2.html'));
});

app.get('/index-v2', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index-v2.html'));
});

// Replay setup page for play-by-play testing
app.get('/replay-setup', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'replay-setup.html'));
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

// Admin Grid Configuration Tool - LOCALHOST ONLY
app.get('/admin/grid-config', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || '';
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';

  if (!isLocalhost) {
    return res.status(403).send('This page is only accessible from localhost');
  }
  res.type('text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'public', 'admin-grid-config.html'));
});

// ============================================
// DYNAMIC JS SERVING (PRODUCTION OBFUSCATION)
// ============================================
// Serve obfuscated sportsBarMode.js in production, original in development
app.get('/sportsBarMode.js', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const filePath = isProduction
    ? path.join(__dirname, 'public/dist/sportsBarMode.min.js')
    : path.join(__dirname, 'public/sportsBarMode.js');

  console.log(`🔧 Serving sportsBarMode.js: ${isProduction ? 'PRODUCTION (obfuscated)' : 'DEVELOPMENT (original)'}`);

  res.type('application/javascript');
  res.sendFile(filePath);
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
  CACHE_DURATION: 30000, // Not used for client requests anymore - clients always get cache
  COMPLETED_CACHE_DURATION: 3600000, // 1 hour for completed
  BACKGROUND_POLL_INTERVAL: 30000, // 30 seconds - background polling interval
  initialized: false, // Track if initial cache population is done
  lastUpdate: null // Track last background update time
};

// Game Stats/Summary Cache - stores detailed game stats (boxscore, play-by-play, etc.)
// Key format: "{league}-{gameId}" e.g., "nfl-401772977"
const gameStatsCache = {
  data: new Map(),
  STATS_CACHE_DURATION: 30000, // 30 seconds for live game stats
  COMPLETED_STATS_CACHE_DURATION: 3600000 // 1 hour for completed games
};

// Cache statistics for monitoring
const cacheStats = {
  hits: 0,
  misses: 0,
  statsHits: 0,
  statsMisses: 0,
  backgroundUpdates: 0,
  statsUpdates: 0,
  lastBackgroundUpdate: null,
  startTime: Date.now()
};

// ============================================
// SOCKET.IO GAME UPDATE BROADCASTING
// ============================================

// Track last broadcast data hash per sport/cacheKey for change detection
const broadcastHashes = new Map();

/**
 * Generate a simple hash of game scores for change detection
 * Only broadcasts when scores or game states actually change
 */
function generateScoreboardHash(data) {
  if (!data?.events) return '';
  return data.events.map(e => {
    const comp = e.competitions?.[0];
    const home = comp?.competitors?.find(c => c.homeAway === 'home');
    const away = comp?.competitors?.find(c => c.homeAway === 'away');
    const status = e.status?.type?.state || 'pre';
    const clock = e.status?.displayClock || '';
    const period = e.status?.period || 0;
    return `${e.id}:${away?.score || 0}-${home?.score || 0}:${status}:${period}:${clock}`;
  }).join('|');
}

/**
 * Broadcast game update to subscribed clients
 * Only sends if data has actually changed
 */
function broadcastGameUpdate(sport, cacheKey, data) {
  if (!global.io) return false;

  const hashKey = `${sport}:${cacheKey}`;
  const newHash = generateScoreboardHash(data);
  const oldHash = broadcastHashes.get(hashKey);

  // Skip broadcast if nothing changed
  if (newHash === oldHash) {
    return false;
  }

  broadcastHashes.set(hashKey, newHash);

  // Broadcast to sport-level room
  const roomName = `games:${sport}`;
  const payload = {
    sport,
    cacheKey,
    data,
    timestamp: Date.now()
  };

  global.io.to(roomName).emit('games:update', payload);

  // Count connected clients for logging
  const room = global.io.sockets.adapter.rooms.get(roomName);
  const clientCount = room ? room.size : 0;

  if (clientCount > 0) {
    console.log(`[Socket.io] Broadcast ${sport}/${cacheKey} to ${clientCount} clients`);
  }

  return true;
}

// ============================================
// CRON JOB HEALTH MONITORING
// ============================================

// Track cron job heartbeats to detect if they stop running
const cronHealthMonitor = {
  nfl: { lastRun: null, lastSuccess: null, consecutiveFailures: 0, totalRuns: 0 },
  ncaa: { lastRun: null, lastSuccess: null, consecutiveFailures: 0, totalRuns: 0 },
  nba: { lastRun: null, lastSuccess: null, consecutiveFailures: 0, totalRuns: 0 },
  mlb: { lastRun: null, lastSuccess: null, consecutiveFailures: 0, totalRuns: 0 },
  nhl: { lastRun: null, lastSuccess: null, consecutiveFailures: 0, totalRuns: 0 },
  ncaab: { lastRun: null, lastSuccess: null, consecutiveFailures: 0, totalRuns: 0 }
};

// Helper to update heartbeat
function recordCronRun(sport, success = true) {
  const now = Date.now();
  cronHealthMonitor[sport].lastRun = now;
  cronHealthMonitor[sport].totalRuns++;

  if (success) {
    cronHealthMonitor[sport].lastSuccess = now;
    cronHealthMonitor[sport].consecutiveFailures = 0;
  } else {
    cronHealthMonitor[sport].consecutiveFailures++;
  }
}

// Check if cron jobs are healthy (ran within last 2 minutes)
function getCronHealth() {
  const now = Date.now();
  const maxAge = 120000; // 2 minutes
  const health = {};

  for (const [sport, data] of Object.entries(cronHealthMonitor)) {
    const age = data.lastRun ? now - data.lastRun : null;
    const successAge = data.lastSuccess ? now - data.lastSuccess : null;

    health[sport] = {
      status: age && age < maxAge ? 'healthy' : 'stale',
      lastRunAgo: age ? Math.round(age / 1000) + 's' : 'never',
      lastSuccessAgo: successAge ? Math.round(successAge / 1000) + 's' : 'never',
      consecutiveFailures: data.consecutiveFailures,
      totalRuns: data.totalRuns,
      isActive: (sport === 'nfl' && sportsCache.nfl.activeWeeks.size > 0) ||
                (sport === 'ncaa' && sportsCache.ncaa.activeWeeks.size > 0) ||
                (sport === 'nba' && sportsCache.nba.activeDates.size > 0) ||
                (sport === 'mlb' && sportsCache.mlb.activeDates.size > 0) ||
                (sport === 'nhl' && sportsCache.nhl.activeDates.size > 0) ||
                (sport === 'ncaab' && sportsCache.ncaab.activeDates.size > 0)
    };
  }

  return health;
}

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
          console.error(`🔍 404 Not Found - Skipping retries (game may not exist yet): ${url}`);
          espnMetrics.failedCalls++;
          throw error; // Don't retry 404s - they won't recover
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

// NFL Postseason schedule (approximate dates for 2024-2025 season)
// Wild Card: January 11-13, 2025
// Divisional: January 18-19, 2025
// Conference Championships: January 26, 2025
// Super Bowl: February 9, 2025

function getNFLSeasonInfo() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const year = now.getFullYear();

  // Determine the NFL season year (season starts in September)
  // If we're in Jan-Feb, we're in the previous year's season
  const seasonYear = (month >= 9) ? year : year - 1;

  // Offseason: mid-February through August — no NFL games
  if ((month === 2 && day > 15) || (month >= 3 && month <= 8)) {
    return {
      seasonType: 2,
      week: 0,
      seasonYear: seasonYear,
      isPostseason: false,
      isOffseason: true,
      postseasonRound: null
    };
  }

  // Check if we're in postseason (January through early February)
  // Week 18 is typically first weekend of January (Jan 4-5)
  // Wild Card starts second weekend (Jan 11-12)
  if (month === 1 || (month === 2 && day <= 15)) {
    // First week of January is still Week 18 regular season
    if (month === 1 && day <= 7) {
      return {
        seasonType: 2,
        week: 18,
        seasonYear: seasonYear,
        isPostseason: false,
        postseasonRound: null
      };
    }

    // Postseason period
    // Wild Card Weekend: ~Jan 11-13
    // Divisional Round: ~Jan 18-19
    // Conference Championships: ~Jan 26
    // Super Bowl: ~Feb 9

    let postseasonWeek;
    if (month === 1 && day <= 14) {
      postseasonWeek = 1; // Wild Card
    } else if (month === 1 && day <= 21) {
      postseasonWeek = 2; // Divisional
    } else if (month === 1 && day <= 27) {
      postseasonWeek = 3; // Conference Championships
    } else {
      // Late January (28+) through early February = Super Bowl week
      postseasonWeek = 5; // Super Bowl (skip Pro Bowl week 4)
    }

    return {
      seasonType: 3, // Postseason
      week: postseasonWeek,
      seasonYear: seasonYear,
      isPostseason: true,
      postseasonRound: getPostseasonRoundName(postseasonWeek)
    };
  }

  // Regular season calculation
  // NFL Season typically starts first Thursday of September
  // 2024: September 5, 2025: September 4
  const seasonStart = new Date(`${seasonYear}-09-04`);
  const diffDays = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;

  // If week > 18, we might be in the gap between regular season and playoffs
  if (week > 18) {
    return {
      seasonType: 2,
      week: 18, // Show week 18 games
      seasonYear: seasonYear,
      isPostseason: false,
      postseasonRound: null
    };
  }

  return {
    seasonType: 2, // Regular season
    week: Math.max(1, Math.min(week, 18)),
    seasonYear: seasonYear,
    isPostseason: false,
    postseasonRound: null
  };
}

function getPostseasonRoundName(week) {
  switch (week) {
    case 1: return 'Wild Card';
    case 2: return 'Divisional';
    case 3: return 'Conference Championships';
    case 4: return 'Pro Bowl';
    case 5: return 'Super Bowl';
    default: return 'Postseason';
  }
}

function getCurrentNFLWeek() {
  const info = getNFLSeasonInfo();
  console.log(`📅 NFL Season Info: ${info.isPostseason ? info.postseasonRound : 'Week ' + info.week} (seasonType=${info.seasonType})`);
  return info.week;
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

// Use US Eastern time for all date calculations so the server
// returns the correct "today" regardless of where it is hosted.
function getUSEasternDate(offsetDays = 0) {
  const now = new Date();
  if (offsetDays) now.setDate(now.getDate() + offsetDays);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}${month}${day}`;
}

function getTodayDate() {
  const dateStr = getUSEasternDate(0);
  console.log(`📅 Current Date (US Eastern): ${dateStr}`);
  return dateStr; // YYYYMMDD
}

function getYesterdayDate() {
  return getUSEasternDate(-1); // YYYYMMDD
}

function getTomorrowDate() {
  return getUSEasternDate(1); // YYYYMMDD
}

// ============================================
// BACKGROUND CACHE FETCH FUNCTIONS
// ============================================
// These functions fetch data from ESPN and populate the cache.
// They are called by background jobs and on cache miss.

async function fetchNFLDataForCache(cacheKey, seasonType, week) {
  const url = `${ESPN_BASE}/football/nfl/scoreboard?seasontype=${seasonType}&week=${week}`;
  console.log(`[NFL Cache] Fetching: ${url}`);

  let data = await fetchESPN(url);
  let isComplete = areAllGamesComplete(data);

  // If current week is complete, also fetch next week for upcoming games
  if (isComplete) {
    let nextUrl;
    if (seasonType === 2 && week < 18) {
      nextUrl = `${ESPN_BASE}/football/nfl/scoreboard?seasontype=2&week=${week + 1}`;
    } else if (seasonType === 2 && week === 18) {
      nextUrl = `${ESPN_BASE}/football/nfl/scoreboard?seasontype=3&week=1`;
    } else if (seasonType === 3 && week < 5) {
      nextUrl = `${ESPN_BASE}/football/nfl/scoreboard?seasontype=3&week=${week + 1}`;
    }

    if (nextUrl) {
      try {
        const nextData = await fetchESPN(nextUrl);
        if (nextData.events && nextData.events.length > 0) {
          data.events = [...(data.events || []), ...nextData.events];
          isComplete = false;
        }
      } catch (e) {
        // Ignore errors fetching next week
      }
    }
  }

  const now = Date.now();
  sportsCache.nfl.data.set(cacheKey, { data, timestamp: now, isComplete });
  cacheStats.backgroundUpdates++;
  cacheStats.lastBackgroundUpdate = now;

  // Broadcast to subscribed clients
  broadcastGameUpdate('nfl', cacheKey, data);

  if (isComplete) {
    sportsCache.nfl.activeWeeks.delete(cacheKey);
  } else {
    sportsCache.nfl.activeWeeks.add(cacheKey);
  }

  return data;
}

async function fetchNCAADataForCache(cacheKey, seasonType, week) {
  let url;
  // seasonType can be 3 (postseason/bowls), 2 (regular season), or 'bowl' string
  if (seasonType === 3 || seasonType === 'bowl') {
    url = `${ESPN_BASE}/football/college-football/scoreboard?seasontype=3&week=1&groups=80&limit=100`;
  } else {
    url = `${ESPN_BASE}/football/college-football/scoreboard?seasontype=2&week=${week}&groups=80&limit=100`;
  }

  console.log(`[NCAA Cache] Fetching: ${url}`);
  const data = await fetchESPN(url);
  const isComplete = areAllGamesComplete(data);
  const now = Date.now();

  sportsCache.ncaa.data.set(cacheKey, { data, timestamp: now, isComplete });
  cacheStats.backgroundUpdates++;
  cacheStats.lastBackgroundUpdate = now;

  // Broadcast to subscribed clients
  broadcastGameUpdate('ncaa', cacheKey, data);

  if (isComplete) {
    sportsCache.ncaa.activeWeeks.delete(cacheKey);
  } else {
    sportsCache.ncaa.activeWeeks.add(cacheKey);
  }

  return data;
}

async function fetchNBADataForCache(date) {
  const url = `${ESPN_BASE}/basketball/nba/scoreboard?dates=${date}`;
  console.log(`[NBA Cache] Fetching: ${url}`);

  const data = await fetchESPN(url);
  const isComplete = areAllGamesComplete(data);
  const now = Date.now();

  sportsCache.nba.data.set(`date-${date}`, { data, timestamp: now, isComplete });
  cacheStats.backgroundUpdates++;
  cacheStats.lastBackgroundUpdate = now;

  // Broadcast to subscribed clients
  broadcastGameUpdate('nba', `date-${date}`, data);

  if (isComplete) {
    sportsCache.nba.activeDates.delete(date);
  } else {
    sportsCache.nba.activeDates.add(date);
  }

  return data;
}

async function fetchNCAABDataForCache(date) {
  const url = `${ESPN_BASE}/basketball/mens-college-basketball/scoreboard?dates=${date}&groups=50&limit=100`;
  console.log(`[NCAAB Cache] Fetching: ${url}`);

  const data = await fetchESPN(url);
  const isComplete = areAllGamesComplete(data);
  const now = Date.now();

  sportsCache.ncaab.data.set(`date-${date}`, { data, timestamp: now, isComplete });
  cacheStats.backgroundUpdates++;
  cacheStats.lastBackgroundUpdate = now;

  // Broadcast to subscribed clients
  broadcastGameUpdate('ncaab', `date-${date}`, data);

  if (isComplete) {
    sportsCache.ncaab.activeDates.delete(date);
  } else {
    sportsCache.ncaab.activeDates.add(date);
  }

  return data;
}

// MLB logo URL builder using mlbstatic.com (no ESPN needed)
function mlbLogoUrl(teamId) {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

// Convert a Statsapi game object into the ESPN competition event shape
// that the rest of the app (updateGameFromEvent, notification cron, etc.) expects.
function statsapiGameToESPNEvent(g) {
  const awayTeam = g.teams?.away;
  const homeTeam = g.teams?.home;
  const ls = g.linescore || {};

  // Map Statsapi abstractGameState → ESPN state
  const stateMap = { Preview: 'pre', Live: 'in', Final: 'post' };
  const state = stateMap[g.status?.abstractGameState] || 'pre';

  // Build shortDetail string matching ESPN format (e.g. "Top 3rd", "Bot 7th", "Final")
  let shortDetail = g.status?.detailedState || '';
  if (state === 'in' && ls.currentInningOrdinal) {
    const half = ls.isTopInning ? 'Top' : 'Bot';
    shortDetail = `${half} ${ls.currentInningOrdinal}`;
  } else if (state === 'post') {
    shortDetail = 'Final';
  } else if (state === 'pre' && g.gameDate) {
    // Format start time for display
    const d = new Date(g.gameDate);
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h % 12) || 12);
    shortDetail = `${h12}:${m.toString().padStart(2, '0')} ${ampm} ET`;
  }

  // Build per-inning linescore arrays for BaseballScoreboard
  const awayInnings = (ls.innings || []).map(inn => inn.away?.runs ?? '-');
  const homeInnings = (ls.innings || []).map(inn => inn.home?.runs ?? '-');

  // Build situation block (live games only)
  let situation = null;
  if (state === 'in' && ls) {
    const offense = ls.offense || {};
    const defense = ls.defense || {};
    situation = {
      balls: ls.balls || 0,
      strikes: ls.strikes || 0,
      outs: ls.outs || 0,
      onFirst: !!offense.first,
      onSecond: !!offense.second,
      onThird: !!offense.third,
      periodType: ls.isTopInning ? 'top' : 'bot',
      batter: offense.batter ? { athlete: { shortName: offense.batter.fullName, displayName: offense.batter.fullName } } : null,
      pitcher: defense.pitcher ? { athlete: { shortName: defense.pitcher.fullName, displayName: defense.pitcher.fullName } } : null
    };
  }

  const awayId = awayTeam?.team?.id;
  const homeId = homeTeam?.team?.id;

  const awayLR = awayTeam?.leagueRecord;
  const homeLR = homeTeam?.leagueRecord;
  const awayRecordStr = awayLR ? `${awayLR.wins}-${awayLR.losses}` : '';
  const homeRecordStr = homeLR ? `${homeLR.wins}-${homeLR.losses}` : '';

  const competitors = [
    {
      homeAway: 'away',
      id: String(awayId || ''),
      score: String(awayTeam?.score ?? 0),
      winner: state === 'post' && (awayTeam?.score ?? 0) > (homeTeam?.score ?? 0),
      hits: ls.teams?.away?.hits ?? 0,
      errors: ls.teams?.away?.errors ?? 0,
      linescores: awayInnings,
      records: awayRecordStr ? [{ summary: awayRecordStr, displayValue: awayRecordStr, type: 'total' }] : [],
      team: {
        id: String(awayId || ''),
        abbreviation: awayTeam?.team?.abbreviation || '',
        displayName: awayTeam?.team?.name || '',
        logo: awayId ? mlbLogoUrl(awayId) : '',
        logos: awayId ? [{ href: mlbLogoUrl(awayId) }] : []
      }
    },
    {
      homeAway: 'home',
      id: String(homeId || ''),
      score: String(homeTeam?.score ?? 0),
      winner: state === 'post' && (homeTeam?.score ?? 0) > (awayTeam?.score ?? 0),
      hits: ls.teams?.home?.hits ?? 0,
      errors: ls.teams?.home?.errors ?? 0,
      linescores: homeInnings,
      records: homeRecordStr ? [{ summary: homeRecordStr, displayValue: homeRecordStr, type: 'total' }] : [],
      team: {
        id: String(homeId || ''),
        abbreviation: homeTeam?.team?.abbreviation || '',
        displayName: homeTeam?.team?.name || '',
        logo: homeId ? mlbLogoUrl(homeId) : '',
        logos: homeId ? [{ href: mlbLogoUrl(homeId) }] : []
      }
    }
  ];

  const awayAbbr = awayTeam?.team?.abbreviation || '';
  const homeAbbr = homeTeam?.team?.abbreviation || '';

  return {
    id: String(g.gamePk),
    name: `${awayTeam?.team?.name || awayAbbr} at ${homeTeam?.team?.name || homeAbbr}`,
    shortName: `${awayAbbr}@${homeAbbr}`,
    date: g.gameDate,
    status: {
      type: {
        state,
        shortDetail,
        detail: shortDetail,
        name: g.status?.abstractGameState || 'pre'
      },
      period: ls.currentInning || 1,
      displayClock: ''
    },
    competitions: [
      {
        status: {
          type: {
            state,
            shortDetail,
            detail: shortDetail
          },
          period: ls.currentInning || 1,
          displayClock: ''
        },
        competitors,
        situation
      }
    ]
  };
}

async function fetchMLBDataForCache(date) {
  // date is YYYYMMDD (e.g. "20260222") — convert to MM/DD/YYYY for Statsapi
  const year = date.slice(0, 4);
  const month = date.slice(4, 6);
  const day = date.slice(6, 8);
  const statsapiDate = `${month}/${day}/${year}`;
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${statsapiDate}&hydrate=team,linescore,flags`;
  console.log(`[MLB Cache] Fetching Statsapi: ${url}`);

  let data;
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const games = response.data?.dates?.[0]?.games || [];
    const events = games.map(statsapiGameToESPNEvent);
    data = { events };
  } catch (error) {
    console.error(`[MLB Cache] Statsapi fetch failed for ${date}:`, error.message);
    data = { events: [] };
  }

  const isComplete = areAllGamesComplete(data);
  const now = Date.now();

  sportsCache.mlb.data.set(`date-${date}`, { data, timestamp: now, isComplete });
  cacheStats.backgroundUpdates++;
  cacheStats.lastBackgroundUpdate = now;

  // Broadcast to subscribed clients
  broadcastGameUpdate('mlb', `date-${date}`, data);

  if (isComplete) {
    sportsCache.mlb.activeDates.delete(date);
  } else {
    sportsCache.mlb.activeDates.add(date);
  }

  return data;
}

async function fetchNHLDataForCache(date) {
  const url = `${ESPN_BASE}/hockey/nhl/scoreboard?dates=${date}`;
  console.log(`[NHL Cache] Fetching: ${url}`);

  const data = await fetchESPN(url);
  const isComplete = areAllGamesComplete(data);
  const now = Date.now();

  sportsCache.nhl.data.set(`date-${date}`, { data, timestamp: now, isComplete });
  cacheStats.backgroundUpdates++;
  cacheStats.lastBackgroundUpdate = now;

  // Broadcast to subscribed clients
  broadcastGameUpdate('nhl', `date-${date}`, data);

  if (isComplete) {
    sportsCache.nhl.activeDates.delete(date);
  } else {
    sportsCache.nhl.activeDates.add(date);
  }

  return data;
}

// ============================================
// GAME STATS/SUMMARY CACHE FUNCTIONS
// ============================================
// Fetches detailed game stats (boxscore, play-by-play) and caches them

async function fetchGameStatsForCache(league, gameId, isComplete = false) {
  const cacheKey = `${league}-${gameId}`;

  // Skip mock games used for testing
  if (gameId.toString().startsWith('mock')) {
    return null;
  }

  // MLB uses Statsapi (gamePk-based), not ESPN - ESPN doesn't recognize Statsapi gamePk IDs
  if (league === 'mlb') {
    try {
      const url = `https://statsapi.mlb.com/api/v1.1/game/${gameId}/feed/live`;
      const response = await axios.get(url, { timeout: 8000 });
      const data = response.data;
      const now = Date.now();
      gameStatsCache.data.set(cacheKey, { data, timestamp: now, isComplete, league, gameId });
      cacheStats.statsUpdates++;
      return data;
    } catch (error) {
      console.error(`[Stats Cache] Failed to fetch MLB stats for ${cacheKey}:`, error.message);
      return null;
    }
  }

  // Determine the correct ESPN endpoint based on league
  const leagueEndpoints = {
    'nfl': `${ESPN_BASE}/football/nfl/summary?event=${gameId}`,
    'ncaa': `${ESPN_BASE}/football/college-football/summary?event=${gameId}`,
    'nba': `${ESPN_BASE}/basketball/nba/summary?event=${gameId}`,
    'ncaab': `${ESPN_BASE}/basketball/mens-college-basketball/summary?event=${gameId}`,
    'nhl': `${ESPN_BASE}/hockey/nhl/summary?event=${gameId}`
  };

  const url = leagueEndpoints[league];
  if (!url) {
    console.error(`[Stats Cache] Unknown league: ${league}`);
    return null;
  }

  try {
    const data = await fetchESPN(url);
    const now = Date.now();

    gameStatsCache.data.set(cacheKey, {
      data,
      timestamp: now,
      isComplete,
      league,
      gameId
    });

    cacheStats.statsUpdates++;

    // For football games (NFL and NCAA), save plays to database in the background
    // This runs without blocking the cache update
    if ((league === 'nfl' || league === 'ncaa') && data && data.drives) {
      saveGamePlaysToDB(gameId, league, data).catch(err => {
        // Silent fail - don't affect main functionality
        console.error(`[Replay] Background play save failed for ${gameId}:`, err.message);
      });
    }

    return data;
  } catch (error) {
    console.error(`[Stats Cache] Failed to fetch stats for ${cacheKey}:`, error.message);
    return null;
  }
}

/**
 * Save game plays to database in the background (non-blocking)
 * Used during live game updates to continuously save plays
 */
async function saveGamePlaysToDB(gameId, sport, summaryData) {
  if (!summaryData || !summaryData.drives) {
    return;
  }

  // Get team info from boxscore
  const boxscore = summaryData.boxscore;
  const competitors = boxscore?.teams || [];
  let awayTeam = null;
  let homeTeam = null;

  competitors.forEach(team => {
    if (team.homeAway === 'away') {
      awayTeam = {
        abbr: team.team?.abbreviation || '',
        id: team.team?.id || '',
        name: team.team?.displayName || team.team?.name || '',
        score: team.score || 0
      };
    } else if (team.homeAway === 'home') {
      homeTeam = {
        abbr: team.team?.abbreviation || '',
        id: team.team?.id || '',
        name: team.team?.displayName || team.team?.name || '',
        score: team.score || 0
      };
    }
  });

  if (!awayTeam?.abbr || !homeTeam?.abbr) {
    return;
  }

  // Extract game date and status from header if available
  const header = summaryData.header;
  const competition = header?.competitions?.[0];
  const gameDate = competition?.date || new Date().toISOString();
  const status = competition?.status?.type?.description || 'in';

  // Ensure game exists in games table (upsert)
  try {
    await saveGame({
      id: gameId,
      sport: sport,
      game_date: gameDate,
      week_number: null,
      season: new Date().getFullYear(),
      status: status,
      home_team: homeTeam.name || homeTeam.abbr,
      home_team_id: homeTeam.id,
      home_score: parseInt(homeTeam.score) || 0,
      away_team: awayTeam.name || awayTeam.abbr,
      away_team_id: awayTeam.id,
      away_score: parseInt(awayTeam.score) || 0,
      raw_data: { boxscore: summaryData.boxscore, header: summaryData.header }
    });
  } catch (err) {
    console.error(`[Replay] Failed to save game record for ${gameId}:`, err.message);
  }

  // Parse drives and plays
  const { drives, plays } = parseESPNDrivesToDB(summaryData, sport, awayTeam.abbr, homeTeam.abbr);

  if (drives.length === 0 && plays.length === 0) {
    return;
  }

  // Save drives first to get their IDs
  const savedDrives = await saveDrives(gameId, sport, drives);

  // Create map of drive_sequence -> database drive_id
  const driveIdMap = new Map();
  savedDrives.forEach(d => {
    driveIdMap.set(d.drive_sequence, d.id);
  });

  // Save plays with drive references (upsert handles duplicates)
  const playCount = await savePlays(gameId, sport, plays, driveIdMap);

  // Mark game as having play data
  if (playCount > 0) {
    await markGameHasPlays(gameId, playCount);
  }

  console.log(`[Replay] Saved ${plays.length} plays for live game ${gameId}`);
}

// Pre-fetch stats for all live games in a scoreboard response
async function prefetchLiveGameStats(league, scoreboardData) {
  if (!scoreboardData?.events) return;

  const liveGames = scoreboardData.events.filter(e => e.status?.type?.state === 'in');

  if (liveGames.length === 0) return;

  // Fetch stats for all live games in parallel
  const fetchPromises = liveGames.map(async (game) => {
    const cacheKey = `${league}-${game.id}`;
    const cached = gameStatsCache.data.get(cacheKey);
    const now = Date.now();

    // Skip if recently fetched (within 15 seconds)
    if (cached && (now - cached.timestamp) < 15000) {
      return;
    }

    try {
      await fetchGameStatsForCache(league, game.id, false);
    } catch (e) {
      // Ignore individual failures
    }
  });

  await Promise.allSettled(fetchPromises);
}

// Initialize cache on server startup
async function initializeCache() {
  console.log('[Cache] Initializing cache with current data...');
  const today = getTodayDate();
  const yesterday = getYesterdayDate();
  const tomorrow = getTomorrowDate();

  // Store scoreboard data for stats pre-fetching
  let nflData = null;
  let ncaaData = null;
  let nbaData = null;
  let nhlData = null;
  let mlbData = null;
  let ncaabData = null;

  try {
    // NFL - fetch current week
    const nflSeason = getNFLSeasonInfo();
    const nflCacheKey = nflSeason.seasonType === 3
      ? `postseason-week-${nflSeason.week}`
      : `regular-week-${nflSeason.week}`;
    nflData = await fetchNFLDataForCache(nflCacheKey, nflSeason.seasonType, nflSeason.week);
    console.log(`[Cache] NFL initialized: ${nflCacheKey}`);
  } catch (e) {
    console.error('[Cache] Failed to initialize NFL:', e.message);
  }

  try {
    // NCAA Football - fetch current week or bowl season
    const ncaaWeek = getCurrentNCAAWeek();
    const isBowl = isCollegeBowlSeason();
    const ncaaCacheKey = isBowl ? 'bowl-season' : `week-${ncaaWeek}`;
    const seasonType = isBowl ? 3 : 2;
    ncaaData = await fetchNCAADataForCache(ncaaCacheKey, seasonType, ncaaWeek);
    console.log(`[Cache] NCAA initialized: ${ncaaCacheKey}`);
  } catch (e) {
    console.error('[Cache] Failed to initialize NCAA:', e.message);
  }

  // Use Promise.allSettled to ensure partial failures don't block entire sport initialization
  // Also add small delays between sports to avoid ESPN rate limiting

  try {
    // NBA - fetch today, yesterday, tomorrow
    const nbaResults = await Promise.allSettled([
      fetchNBADataForCache(today),
      fetchNBADataForCache(yesterday),
      fetchNBADataForCache(tomorrow)
    ]);
    const nbaSuccess = nbaResults.filter(r => r.status === 'fulfilled').length;
    if (nbaResults[0].status === 'fulfilled') nbaData = nbaResults[0].value;
    console.log(`[Cache] NBA initialized: ${nbaSuccess}/3 dates fetched`);
  } catch (e) {
    console.error('[Cache] Failed to initialize NBA:', e.message);
  }

  // Small delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    // NHL - fetch today, yesterday, tomorrow
    const nhlResults = await Promise.allSettled([
      fetchNHLDataForCache(today),
      fetchNHLDataForCache(yesterday),
      fetchNHLDataForCache(tomorrow)
    ]);
    const nhlSuccess = nhlResults.filter(r => r.status === 'fulfilled').length;
    if (nhlResults[0].status === 'fulfilled') nhlData = nhlResults[0].value;
    console.log(`[Cache] NHL initialized: ${nhlSuccess}/3 dates fetched`);
  } catch (e) {
    console.error('[Cache] Failed to initialize NHL:', e.message);
  }

  // Small delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    // MLB - fetch today, yesterday, tomorrow
    const mlbResults = await Promise.allSettled([
      fetchMLBDataForCache(today),
      fetchMLBDataForCache(yesterday),
      fetchMLBDataForCache(tomorrow)
    ]);
    const mlbSuccess = mlbResults.filter(r => r.status === 'fulfilled').length;
    if (mlbResults[0].status === 'fulfilled') mlbData = mlbResults[0].value;
    console.log(`[Cache] MLB initialized: ${mlbSuccess}/3 dates fetched`);
  } catch (e) {
    console.error('[Cache] Failed to initialize MLB:', e.message);
  }

  // Small delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    // NCAAB - fetch today, yesterday, tomorrow
    const ncaabResults = await Promise.allSettled([
      fetchNCAABDataForCache(today),
      fetchNCAABDataForCache(yesterday),
      fetchNCAABDataForCache(tomorrow)
    ]);
    const ncaabSuccess = ncaabResults.filter(r => r.status === 'fulfilled').length;
    if (ncaabResults[0].status === 'fulfilled') ncaabData = ncaabResults[0].value;
    console.log(`[Cache] NCAAB initialized: ${ncaabSuccess}/3 dates fetched`);
  } catch (e) {
    console.error('[Cache] Failed to initialize NCAAB:', e.message);
  }

  sportsCache.initialized = true;
  sportsCache.lastUpdate = Date.now();
  console.log('[Cache] Initialization complete');

  // Pre-fetch stats for live games (run in background, don't block startup)
  console.log('[Cache] Pre-fetching stats for live games...');
  const statsPrefetchPromises = [];

  if (nflData) statsPrefetchPromises.push(prefetchLiveGameStats('nfl', nflData).catch(() => {}));
  if (ncaaData) statsPrefetchPromises.push(prefetchLiveGameStats('ncaa', ncaaData).catch(() => {}));
  if (nbaData) statsPrefetchPromises.push(prefetchLiveGameStats('nba', nbaData).catch(() => {}));
  if (nhlData) statsPrefetchPromises.push(prefetchLiveGameStats('nhl', nhlData).catch(() => {}));
  if (mlbData) statsPrefetchPromises.push(prefetchLiveGameStats('mlb', mlbData).catch(() => {}));
  if (ncaabData) statsPrefetchPromises.push(prefetchLiveGameStats('ncaab', ncaabData).catch(() => {}));

  Promise.all(statsPrefetchPromises).then(() => {
    console.log('[Cache] Stats pre-fetch complete');
  });
}

// ============================================
// API ROUTES - NFL
// ============================================

app.get('/api/nfl/scoreboard', async (req, res) => {
  try {
    const seasonInfo = getNFLSeasonInfo();
    const requestedWeek = req.query.week;
    const requestedSeasonType = req.query.seasontype;

    // NFL offseason — return empty scoreboard
    if (seasonInfo.isOffseason && !requestedWeek) {
      return res.json({ events: [], _offseason: true });
    }

    // Determine cache key
    let week, seasonType, cacheKey;

    if (requestedWeek === 'playoffs' || requestedWeek === 'postseason') {
      seasonType = 3;
      week = requestedSeasonType ? parseInt(requestedSeasonType) : seasonInfo.week;
      cacheKey = `postseason-week-${week}`;
    } else if (requestedWeek) {
      week = parseInt(requestedWeek);
      if (week > 18) {
        seasonType = 3;
        week = week - 18;
        cacheKey = `postseason-week-${week}`;
      } else {
        seasonType = 2;
        cacheKey = `regular-week-${week}`;
      }
    } else {
      seasonType = seasonInfo.seasonType;
      week = seasonInfo.week;
      cacheKey = seasonType === 3 ? `postseason-week-${week}` : `regular-week-${week}`;
    }

    // ALWAYS serve from cache - never trigger ESPN API calls from client requests
    const cached = sportsCache.nfl.data.get(cacheKey);

    if (cached) {
      cacheStats.hits++;
      const cacheAge = Date.now() - cached.timestamp;
      // Add cache metadata to response
      const response = {
        ...cached.data,
        _cache: {
          hit: true,
          age: cacheAge,
          ageSeconds: Math.round(cacheAge / 1000),
          key: cacheKey,
          timestamp: cached.timestamp,
          isComplete: cached.isComplete
        }
      };
      return res.json(response);
    }

    // Cache miss - trigger background fetch and return empty/waiting response
    cacheStats.misses++;
    console.log(`[NFL] Cache miss for ${cacheKey} - triggering background fetch`);

    // Add to active weeks so background job picks it up
    sportsCache.nfl.activeWeeks.add(cacheKey);

    // Trigger immediate background fetch
    fetchNFLDataForCache(cacheKey, seasonType, week).catch(err => {
      console.error(`[NFL] Background fetch failed for ${cacheKey}:`, err.message);
    });

    // Return response indicating cache is being populated
    res.json({
      events: [],
      _cache: {
        hit: false,
        message: 'Cache is being populated. Data will be available shortly.',
        key: cacheKey,
        retryAfter: 2 // Suggest client retry after 2 seconds
      }
    });
  } catch (error) {
    console.error('[NFL] Error in scoreboard endpoint:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nfl/summary/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;

    // Return empty data for mock games used in testing
    if (gameId.startsWith('mock')) {
      return res.json({ _isMock: true });
    }

    const cacheKey = `nfl-${gameId}`;
    const cached = gameStatsCache.data.get(cacheKey);

    if (cached) {
      cacheStats.statsHits++;
      const cacheAge = Date.now() - cached.timestamp;
      return res.json({
        ...cached.data,
        _cache: {
          hit: true,
          age: cacheAge,
          ageSeconds: Math.round(cacheAge / 1000),
          key: cacheKey
        }
      });
    }

    // Cache miss - trigger background fetch and return waiting response
    cacheStats.statsMisses++;
    console.log(`[NFL Stats] Cache miss for ${cacheKey} - triggering background fetch`);

    // Trigger immediate background fetch
    fetchGameStatsForCache('nfl', gameId, false).catch(err => {
      console.error(`[NFL Stats] Background fetch failed for ${cacheKey}:`, err.message);
    });

    // Return response indicating cache is being populated
    res.json({
      _cache: {
        hit: false,
        message: 'Stats are being fetched. Data will be available shortly.',
        key: cacheKey,
        retryAfter: 2
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nfl/current-week', (req, res) => {
  const info = getNFLSeasonInfo();
  res.json({
    week: info.week,
    seasonType: info.seasonType,
    isPostseason: info.isPostseason,
    postseasonRound: info.postseasonRound,
    seasonYear: info.seasonYear
  });
});

// Cache for last successfully fetched playoff standings (used as fallback)
let lastFetchedPlayoffStandings = {
  afc: [],
  nfc: [],
  lastUpdated: null
};

// NFL Playoff Bracket endpoint
app.get('/api/nfl/playoff-bracket', async (req, res) => {
  try {
    const cacheKey = 'playoff-bracket';
    const cached = sportsCache.nfl.data.get(cacheKey);
    const now = Date.now();

    // Cache for 30 seconds
    if (cached && (now - cached.timestamp) < 30000) {
      return res.json(cached.data);
    }

    // Fetch all playoff rounds: Wild Card (1), Divisional (2), Conference (3), Super Bowl (5)
    const rounds = [1, 2, 3, 5];
    const roundData = await Promise.all(
      rounds.map(week =>
        fetchESPN(`${ESPN_BASE}/football/nfl/scoreboard?seasontype=3&week=${week}`)
          .catch(err => {
            console.log(`[NFL Bracket] Week ${week} fetch failed:`, err.message);
            return { events: [] };
          })
      )
    );

    // AFC and NFC team lists for conference detection
    const AFC_TEAMS = ['BAL', 'BUF', 'CIN', 'CLE', 'DEN', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'MIA', 'NE', 'NYJ', 'PIT', 'TEN'];
    const NFC_TEAMS = ['ARI', 'ATL', 'CAR', 'CHI', 'DAL', 'DET', 'GB', 'LAR', 'MIN', 'NO', 'NYG', 'PHI', 'SF', 'SEA', 'TB', 'WSH'];

    function getConference(teamAbbr) {
      if (AFC_TEAMS.includes(teamAbbr)) return 'AFC';
      if (NFC_TEAMS.includes(teamAbbr)) return 'NFC';
      return null;
    }

    function transformGame(event) {
      if (!event) return null;
      const competition = event.competitions?.[0];
      if (!competition) return null;

      const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
      const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');
      const isComplete = event.status?.type?.completed === true;

      let winner = null;
      if (isComplete && homeTeam && awayTeam) {
        const homeScore = parseInt(homeTeam.score) || 0;
        const awayScore = parseInt(awayTeam.score) || 0;
        winner = homeScore > awayScore ? homeTeam.team?.abbreviation : awayTeam.team?.abbreviation;
      }

      return {
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        status: event.status?.type?.state, // pre, in, post
        isComplete,
        homeTeam: homeTeam ? {
          id: homeTeam.id,
          abbreviation: homeTeam.team?.abbreviation,
          displayName: homeTeam.team?.displayName,
          shortDisplayName: homeTeam.team?.shortDisplayName,
          logo: homeTeam.team?.logo,
          score: homeTeam.score,
          seed: homeTeam.curatedRank?.current || homeTeam.rank,
          winner: winner === homeTeam.team?.abbreviation
        } : null,
        awayTeam: awayTeam ? {
          id: awayTeam.id,
          abbreviation: awayTeam.team?.abbreviation,
          displayName: awayTeam.team?.displayName,
          shortDisplayName: awayTeam.team?.shortDisplayName,
          logo: awayTeam.team?.logo,
          score: awayTeam.score,
          seed: awayTeam.curatedRank?.current || awayTeam.rank,
          winner: winner === awayTeam.team?.abbreviation
        } : null,
        winner,
        conference: homeTeam ? getConference(homeTeam.team?.abbreviation) : null
      };
    }

    function transformRound(data, roundName) {
      const games = (data.events || []).map(transformGame).filter(g => g !== null);
      return {
        roundName,
        afc: games.filter(g => g.conference === 'AFC'),
        nfc: games.filter(g => g.conference === 'NFC'),
        superBowl: roundName === 'Super Bowl' ? games[0] || null : null
      };
    }

    const roundNames = ['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl'];
    const bracket = {
      wildCard: transformRound(roundData[0], roundNames[0]),
      divisional: transformRound(roundData[1], roundNames[1]),
      conference: transformRound(roundData[2], roundNames[2]),
      superBowl: transformRound(roundData[3], roundNames[3]),
      currentRound: 1
    };

    // If Wild Card games don't have real teams yet, fetch standings to populate playoff teams
    if (bracket.wildCard.afc.length === 0 && bracket.wildCard.nfc.length === 0) {
      console.log('[NFL Bracket] No Wild Card teams found, fetching from standings...');

      // 2024-25 NFL Playoff Standings (manually updated)
      const CURRENT_PLAYOFF_STANDINGS = {
        afc: [
          { seed: 1, abbreviation: 'DEN', displayName: 'Denver Broncos', shortDisplayName: 'Broncos', wins: 13, losses: 3, clinched: 'y' },
          { seed: 2, abbreviation: 'NE', displayName: 'New England Patriots', shortDisplayName: 'Patriots', wins: 12, losses: 3, clinched: 'y' },
          { seed: 3, abbreviation: 'JAX', displayName: 'Jacksonville Jaguars', shortDisplayName: 'Jaguars', wins: 11, losses: 4, clinched: 'y' },
          { seed: 4, abbreviation: 'PIT', displayName: 'Pittsburgh Steelers', shortDisplayName: 'Steelers', wins: 9, losses: 6, clinched: 'x' },
          { seed: 5, abbreviation: 'LAC', displayName: 'Los Angeles Chargers', shortDisplayName: 'Chargers', wins: 11, losses: 4, clinched: 'y' },
          { seed: 6, abbreviation: 'BUF', displayName: 'Buffalo Bills', shortDisplayName: 'Bills', wins: 11, losses: 4, clinched: 'y' },
          { seed: 7, abbreviation: 'HOU', displayName: 'Houston Texans', shortDisplayName: 'Texans', wins: 10, losses: 5, clinched: 'x' }
        ],
        nfc: [
          { seed: 1, abbreviation: 'SEA', displayName: 'Seattle Seahawks', shortDisplayName: 'Seahawks', wins: 12, losses: 3, clinched: 'y' },
          { seed: 2, abbreviation: 'CHI', displayName: 'Chicago Bears', shortDisplayName: 'Bears', wins: 11, losses: 4, clinched: 'y' },
          { seed: 3, abbreviation: 'PHI', displayName: 'Philadelphia Eagles', shortDisplayName: 'Eagles', wins: 10, losses: 5, clinched: 'z' },
          { seed: 4, abbreviation: 'CAR', displayName: 'Carolina Panthers', shortDisplayName: 'Panthers', wins: 8, losses: 7, clinched: 'x' },
          { seed: 5, abbreviation: 'SF', displayName: 'San Francisco 49ers', shortDisplayName: '49ers', wins: 11, losses: 4, clinched: 'y' },
          { seed: 6, abbreviation: 'LAR', displayName: 'Los Angeles Rams', shortDisplayName: 'Rams', wins: 11, losses: 4, clinched: 'y' },
          { seed: 7, abbreviation: 'GB', displayName: 'Green Bay Packers', shortDisplayName: 'Packers', wins: 9, losses: 6, clinched: 'y' }
        ]
      };

      try {
        // Fetch NFL standings to get playoff-clinched teams
        // Note: Standings API uses a different base URL path (v2 instead of site/v2)
        const standingsUrl = 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2025&seasontype=2';
        const standingsData = await fetchESPN(standingsUrl);
        console.log('[NFL Bracket] Standings response children:', standingsData.children?.length);

        // Parse standings to get playoff seeds
        let afcTeams = [];
        let nfcTeams = [];

        if (standingsData.children) {
          for (const conference of standingsData.children) {
            const confName = conference.name || conference.abbreviation;
            const isAFC = confName?.includes('AFC') || confName?.includes('American');

            // Standings entries are directly under each conference
            if (conference.standings?.entries) {
              for (const entry of conference.standings.entries) {
                const team = entry.team;
                const stats = entry.stats || [];
                const clincherStat = stats.find(s => s.name === 'clincher');
                const playoffSeedStat = stats.find(s => s.name === 'playoffSeed');
                const clincher = clincherStat?.displayValue || clincherStat?.value;
                const playoffSeed = playoffSeedStat?.value;

                // Check if team has clinched playoffs (x, y, z, * indicators or has a playoff seed 1-7)
                if (clincher || (playoffSeed && playoffSeed <= 7)) {
                  const teamData = {
                    abbreviation: team.abbreviation,
                    displayName: team.displayName,
                    shortDisplayName: team.shortDisplayName,
                    logo: team.logos?.[0]?.href,
                    seed: playoffSeed || null,
                    clinched: clincher || 'p'
                  };

                  if (isAFC) {
                    afcTeams.push(teamData);
                  } else {
                    nfcTeams.push(teamData);
                  }
                }
              }
            }
          }
        }

        // Sort by seed
        afcTeams.sort((a, b) => (a.seed || 99) - (b.seed || 99));
        nfcTeams.sort((a, b) => (a.seed || 99) - (b.seed || 99));

        // If API didn't return enough teams with proper seeds 1-7, use cached/static data
        const afcHasValidSeeds = afcTeams.slice(0, 7).every((t, i) => t.seed === i + 1);
        const nfcHasValidSeeds = nfcTeams.slice(0, 7).every((t, i) => t.seed === i + 1);

        if (afcTeams.length < 7 || !afcHasValidSeeds) {
          // Use last fetched data if available, otherwise use hardcoded fallback
          if (lastFetchedPlayoffStandings.afc.length >= 7) {
            console.log('[NFL Bracket] Using last fetched AFC standings (cached)');
            afcTeams = lastFetchedPlayoffStandings.afc;
          } else {
            console.log('[NFL Bracket] Using hardcoded AFC standings fallback');
            afcTeams = CURRENT_PLAYOFF_STANDINGS.afc;
          }
        } else {
          // Save successful fetch for future fallback
          lastFetchedPlayoffStandings.afc = afcTeams.slice(0, 7);
          lastFetchedPlayoffStandings.lastUpdated = new Date().toISOString();
        }

        if (nfcTeams.length < 7 || !nfcHasValidSeeds) {
          // Use last fetched data if available, otherwise use hardcoded fallback
          if (lastFetchedPlayoffStandings.nfc.length >= 7) {
            console.log('[NFL Bracket] Using last fetched NFC standings (cached)');
            nfcTeams = lastFetchedPlayoffStandings.nfc;
          } else {
            console.log('[NFL Bracket] Using hardcoded NFC standings fallback');
            nfcTeams = CURRENT_PLAYOFF_STANDINGS.nfc;
          }
        } else {
          // Save successful fetch for future fallback
          lastFetchedPlayoffStandings.nfc = nfcTeams.slice(0, 7);
          lastFetchedPlayoffStandings.lastUpdated = new Date().toISOString();
        }

        console.log(`[NFL Bracket] Found ${afcTeams.length} AFC and ${nfcTeams.length} NFC playoff teams from standings`);
        if (afcTeams.length > 0) console.log('[NFL Bracket] AFC teams:', afcTeams.map(t => `#${t.seed} ${t.abbreviation}`).join(', '));
        if (nfcTeams.length > 0) console.log('[NFL Bracket] NFC teams:', nfcTeams.map(t => `#${t.seed} ${t.abbreviation}`).join(', '));

        // Create Wild Card matchups based on seeding
        // AFC Wild Card: 2 vs 7, 3 vs 6, 4 vs 5 (1 seed gets bye)
        // NFC Wild Card: 2 vs 7, 3 vs 6, 4 vs 5 (1 seed gets bye)
        function createWildCardGames(teams) {
          const games = [];
          if (teams.length >= 7) {
            // Game 1: #2 vs #7
            games.push({
              id: `wc-${teams[1]?.abbreviation}-${teams[6]?.abbreviation}`,
              name: `${teams[1]?.displayName || 'TBD'} vs ${teams[6]?.displayName || 'TBD'}`,
              status: 'pre',
              isComplete: false,
              homeTeam: teams[1] ? { ...teams[1], seed: 2 } : { abbreviation: 'TBD' },
              awayTeam: teams[6] ? { ...teams[6], seed: 7 } : { abbreviation: 'TBD' },
              winner: null,
              conference: AFC_TEAMS.includes(teams[1]?.abbreviation) ? 'AFC' : 'NFC'
            });
            // Game 2: #3 vs #6
            games.push({
              id: `wc-${teams[2]?.abbreviation}-${teams[5]?.abbreviation}`,
              name: `${teams[2]?.displayName || 'TBD'} vs ${teams[5]?.displayName || 'TBD'}`,
              status: 'pre',
              isComplete: false,
              homeTeam: teams[2] ? { ...teams[2], seed: 3 } : { abbreviation: 'TBD' },
              awayTeam: teams[5] ? { ...teams[5], seed: 6 } : { abbreviation: 'TBD' },
              winner: null,
              conference: AFC_TEAMS.includes(teams[2]?.abbreviation) ? 'AFC' : 'NFC'
            });
            // Game 3: #4 vs #5
            games.push({
              id: `wc-${teams[3]?.abbreviation}-${teams[4]?.abbreviation}`,
              name: `${teams[3]?.displayName || 'TBD'} vs ${teams[4]?.displayName || 'TBD'}`,
              status: 'pre',
              isComplete: false,
              homeTeam: teams[3] ? { ...teams[3], seed: 4 } : { abbreviation: 'TBD' },
              awayTeam: teams[4] ? { ...teams[4], seed: 5 } : { abbreviation: 'TBD' },
              winner: null,
              conference: AFC_TEAMS.includes(teams[3]?.abbreviation) ? 'AFC' : 'NFC'
            });
          }
          return games;
        }

        if (afcTeams.length >= 7) {
          bracket.wildCard.afc = createWildCardGames(afcTeams);
        }
        if (nfcTeams.length >= 7) {
          bracket.wildCard.nfc = createWildCardGames(nfcTeams);
        }

        // Store the #1 seeds for bye display
        bracket.afcBye = afcTeams[0] || null;
        bracket.nfcBye = nfcTeams[0] || null;

        // Store all playoff teams for reference
        bracket.playoffTeams = {
          afc: afcTeams.slice(0, 7),
          nfc: nfcTeams.slice(0, 7)
        };

      } catch (standingsError) {
        console.log('[NFL Bracket] Could not fetch standings for playoff teams:', standingsError.message);
        console.log('[NFL Bracket] Using static playoff standings as fallback');

        // Use static data as fallback
        const afcTeams = CURRENT_PLAYOFF_STANDINGS.afc;
        const nfcTeams = CURRENT_PLAYOFF_STANDINGS.nfc;

        // Create Wild Card matchups using static data
        function createWildCardGamesFallback(teams, conference) {
          const games = [];
          if (teams.length >= 7) {
            games.push({
              id: `wc-${teams[1].abbreviation}-${teams[6].abbreviation}`,
              name: `${teams[1].displayName} vs ${teams[6].displayName}`,
              status: 'pre',
              isComplete: false,
              homeTeam: { ...teams[1], seed: 2 },
              awayTeam: { ...teams[6], seed: 7 },
              winner: null,
              conference
            });
            games.push({
              id: `wc-${teams[2].abbreviation}-${teams[5].abbreviation}`,
              name: `${teams[2].displayName} vs ${teams[5].displayName}`,
              status: 'pre',
              isComplete: false,
              homeTeam: { ...teams[2], seed: 3 },
              awayTeam: { ...teams[5], seed: 6 },
              winner: null,
              conference
            });
            games.push({
              id: `wc-${teams[3].abbreviation}-${teams[4].abbreviation}`,
              name: `${teams[3].displayName} vs ${teams[4].displayName}`,
              status: 'pre',
              isComplete: false,
              homeTeam: { ...teams[3], seed: 4 },
              awayTeam: { ...teams[4], seed: 5 },
              winner: null,
              conference
            });
          }
          return games;
        }

        bracket.wildCard.afc = createWildCardGamesFallback(afcTeams, 'AFC');
        bracket.wildCard.nfc = createWildCardGamesFallback(nfcTeams, 'NFC');
        bracket.afcBye = afcTeams[0];
        bracket.nfcBye = nfcTeams[0];
        bracket.playoffTeams = { afc: afcTeams, nfc: nfcTeams };
      }
    }

    // Determine current round based on game states
    if (bracket.superBowl.superBowl?.isComplete) {
      bracket.currentRound = 5;
    } else if (bracket.conference.afc.length > 0 && bracket.conference.afc.every(g => g.isComplete)) {
      bracket.currentRound = 5;
    } else if (bracket.divisional.afc.length > 0 && bracket.divisional.afc.every(g => g.isComplete)) {
      bracket.currentRound = 3;
    } else if (bracket.wildCard.afc.length > 0 && bracket.wildCard.afc.every(g => g.isComplete)) {
      bracket.currentRound = 2;
    }

    // Find conference champions
    bracket.afcChampion = bracket.conference.afc.find(g => g.isComplete)?.winner || null;
    bracket.nfcChampion = bracket.conference.nfc.find(g => g.isComplete)?.winner || null;
    bracket.superBowlWinner = bracket.superBowl.superBowl?.winner || null;

    // If bye teams aren't set but we have Wild Card games from ESPN, fetch standings to get #1 seeds
    if (!bracket.afcBye && !bracket.nfcBye && (bracket.wildCard.afc.length > 0 || bracket.wildCard.nfc.length > 0)) {
      console.log('[NFL Bracket] Wild Card games found but no bye teams - fetching #1 seeds from standings...');
      try {
        const standingsUrl = 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2025&seasontype=2';
        const standingsData = await fetchESPN(standingsUrl);

        let afcTopSeed = null;
        let nfcTopSeed = null;

        if (standingsData.children) {
          for (const conference of standingsData.children) {
            const confName = conference.name || conference.abbreviation;
            const isAFC = confName?.includes('AFC') || confName?.includes('American');

            if (conference.standings?.entries) {
              // Find the #1 seed (playoffSeed = 1)
              for (const entry of conference.standings.entries) {
                const team = entry.team;
                const stats = entry.stats || [];
                const playoffSeedStat = stats.find(s => s.name === 'playoffSeed');
                const playoffSeed = playoffSeedStat?.value;

                if (playoffSeed === 1) {
                  const teamData = {
                    seed: 1,
                    abbreviation: team.abbreviation,
                    displayName: team.displayName,
                    shortDisplayName: team.shortDisplayName,
                    logo: team.logos?.[0]?.href
                  };

                  if (isAFC) {
                    afcTopSeed = teamData;
                  } else {
                    nfcTopSeed = teamData;
                  }
                }
              }
            }
          }
        }

        // Fallback to hardcoded if API didn't return proper seeds
        if (!afcTopSeed) {
          afcTopSeed = { seed: 1, abbreviation: 'KC', displayName: 'Kansas City Chiefs', shortDisplayName: 'Chiefs' };
        }
        if (!nfcTopSeed) {
          nfcTopSeed = { seed: 1, abbreviation: 'DET', displayName: 'Detroit Lions', shortDisplayName: 'Lions' };
        }

        bracket.afcBye = afcTopSeed;
        bracket.nfcBye = nfcTopSeed;
        console.log(`[NFL Bracket] Set bye teams: AFC #1 ${afcTopSeed?.abbreviation}, NFC #1 ${nfcTopSeed?.abbreviation}`);

        // Also populate seeds for Wild Card teams if missing
        // Build a seed map from standings
        const seedMap = new Map();
        if (standingsData.children) {
          for (const conference of standingsData.children) {
            if (conference.standings?.entries) {
              for (const entry of conference.standings.entries) {
                const team = entry.team;
                const stats = entry.stats || [];
                const playoffSeedStat = stats.find(s => s.name === 'playoffSeed');
                if (playoffSeedStat?.value) {
                  seedMap.set(team.abbreviation, playoffSeedStat.value);
                }
              }
            }
          }
        }

        // Apply seeds to Wild Card games
        for (const game of [...bracket.wildCard.afc, ...bracket.wildCard.nfc]) {
          if (game.homeTeam && !game.homeTeam.seed) {
            game.homeTeam.seed = seedMap.get(game.homeTeam.abbreviation) || null;
          }
          if (game.awayTeam && !game.awayTeam.seed) {
            game.awayTeam.seed = seedMap.get(game.awayTeam.abbreviation) || null;
          }
        }
        console.log('[NFL Bracket] Applied seeds to Wild Card teams from standings');
      } catch (err) {
        console.log('[NFL Bracket] Could not fetch standings for bye teams:', err.message);
        // Use fallback
        bracket.afcBye = { seed: 1, abbreviation: 'KC', displayName: 'Kansas City Chiefs', shortDisplayName: 'Chiefs' };
        bracket.nfcBye = { seed: 1, abbreviation: 'DET', displayName: 'Detroit Lions', shortDisplayName: 'Lions' };
      }
    }

    console.log(`[NFL Bracket] Fetched - WC: ${bracket.wildCard.afc.length + bracket.wildCard.nfc.length} games, Div: ${bracket.divisional.afc.length + bracket.divisional.nfc.length} games, Conf: ${bracket.conference.afc.length + bracket.conference.nfc.length} games, SB: ${bracket.superBowl.superBowl ? 1 : 0} games`);

    sportsCache.nfl.data.set(cacheKey, { data: bracket, timestamp: now });
    res.json(bracket);
  } catch (error) {
    console.error('[NFL Bracket] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - NCAA COLLEGE FOOTBALL
// ============================================

// Helper to determine if we're in bowl season
function isCollegeBowlSeason() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // Bowl season: December 14 - January 20 (approximately)
  // CFP runs through mid-January
  if (month === 12 && day >= 14) return true;
  if (month === 1 && day <= 20) return true;
  return false;
}

// Get current NCAA week or bowl indicator
function getCurrentNCAAWeek() {
  if (isCollegeBowlSeason()) {
    return 'bowl'; // Special indicator for bowl season
  }

  // College football regular season starts late August
  // Week 1 is typically the last week of August / first week of September
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Determine season year (season starts in August)
  const seasonYear = (month >= 8) ? year : year - 1;

  // Season typically starts around August 24 (Week 0/1)
  const seasonStart = new Date(`${seasonYear}-08-24`);
  const diffDays = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;

  // Regular season is weeks 1-15 (conference championships in week 15)
  return Math.max(1, Math.min(week, 15));
}

app.get('/api/ncaa/scoreboard', async (req, res) => {
  try {
    const requestedWeek = req.query.week;
    const isBowlRequest = requestedWeek === 'bowl' || (!requestedWeek && isCollegeBowlSeason());

    let cacheKey, url;

    if (isBowlRequest) {
      // Bowl season - use postseason API
      cacheKey = 'bowl-season';
      url = `${ESPN_BASE}/football/college-football/scoreboard?seasontype=3&groups=80`;
      console.log(`[NCAA] Fetching bowl games (postseason)`);
    } else {
      // Regular season
      const week = requestedWeek || getCurrentNCAAWeek();
      cacheKey = `week-${week}`;
      url = `${ESPN_BASE}/football/college-football/scoreboard?week=${week}&groups=80`;
    }

    const cached = sportsCache.ncaa.data.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
      // Log cache hit with upcoming count for debugging
      const cachedUpcoming = cached.data.events?.filter(e => e.status?.type?.state === 'pre').length || 0;
      console.log(`[NCAA] CACHE HIT - ${cacheKey}, Upcoming: ${cachedUpcoming}, Total: ${cached.data.events?.length || 0}`);
      return res.json(cached.data);
    }

    const data = await fetchESPN(url);
    const isComplete = areAllGamesComplete(data);

    const statusCount = data.events?.reduce((acc, e) => {
      const state = e.status?.type?.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {}) || {};

    // Log detailed info for upcoming games
    const upcomingGames = data.events?.filter(e => e.status?.type?.state === 'pre') || [];
    const upcomingNames = upcomingGames.slice(0, 5).map(e => e.shortName || e.name).join(', ');

    console.log(`[NCAA] FRESH FETCH - ${isBowlRequest ? 'Bowl Season' : 'Week ' + (requestedWeek || getCurrentNCAAWeek())} - Games: ${data.events?.length || 0}, Statuses:`, statusCount);
    console.log(`[NCAA] Upcoming (${upcomingGames.length}): ${upcomingNames || 'none'}`);

    sportsCache.ncaa.data.set(cacheKey, { data, timestamp: now, isComplete });

    if (!isComplete) {
      sportsCache.ncaa.activeWeeks.add(cacheKey);
    } else {
      sportsCache.ncaa.activeWeeks.delete(cacheKey);
    }

    res.json(data);
  } catch (error) {
    console.error('[NCAA] Error fetching scoreboard:', error.message);

    // Return stale cache if available rather than failing
    const requestedWeek = req.query.week;
    const isBowlRequest = requestedWeek === 'bowl' || (!requestedWeek && isCollegeBowlSeason());
    const staleCacheKey = isBowlRequest ? 'bowl-season' : `week-${requestedWeek || getCurrentNCAAWeek()}`;
    const staleCache = sportsCache.ncaa.data.get(staleCacheKey);

    if (staleCache) {
      console.log(`[NCAA] Returning stale cache (${staleCacheKey}) due to fetch error`);
      return res.json(staleCache.data);
    }

    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ncaa/summary/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;

    // Return empty data for mock games used in testing
    if (gameId.startsWith('mock')) {
      return res.json({ _isMock: true });
    }

    const cacheKey = `ncaa-${gameId}`;
    const cached = gameStatsCache.data.get(cacheKey);

    if (cached) {
      cacheStats.statsHits++;
      const cacheAge = Date.now() - cached.timestamp;
      return res.json({
        ...cached.data,
        _cache: { hit: true, age: cacheAge, ageSeconds: Math.round(cacheAge / 1000), key: cacheKey }
      });
    }

    cacheStats.statsMisses++;
    fetchGameStatsForCache('ncaa', gameId, false).catch(err => console.error(`[NCAA Stats] Background fetch failed:`, err.message));

    res.json({ _cache: { hit: false, message: 'Stats are being fetched.', key: cacheKey, retryAfter: 2 } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ncaa/current-week', (req, res) => {
  const week = getCurrentNCAAWeek();
  res.json({
    week: week,
    isBowlSeason: isCollegeBowlSeason()
  });
});

// College Football Playoff Bracket endpoint
app.get('/api/ncaa/playoff-bracket', async (req, res) => {
  try {
    const cacheKey = 'cfp-bracket';
    const cached = sportsCache.ncaa.data.get(cacheKey);
    const now = Date.now();

    // Cache for 30 seconds
    if (cached && (now - cached.timestamp) < 30000) {
      return res.json(cached.data);
    }

    // Fetch postseason games (seasontype=3)
    const url = `${ESPN_BASE}/football/college-football/scoreboard?seasontype=3&groups=80`;
    const data = await fetchESPN(url);

    // CFP game identifiers in notes/headlines
    const CFP_KEYWORDS = [
      'CFP', 'College Football Playoff', 'Playoff',
      'Quarterfinal', 'Semifinal', 'Championship',
      'First Round', 'Fiesta Bowl', 'Peach Bowl',
      'Rose Bowl', 'Sugar Bowl', 'Orange Bowl', 'Cotton Bowl'
    ];

    // Major bowl games that are part of CFP rotation
    const CFP_BOWLS = ['Fiesta Bowl', 'Peach Bowl', 'Rose Bowl', 'Sugar Bowl', 'Orange Bowl', 'Cotton Bowl'];

    function isCFPGame(event) {
      const notes = event.competitions?.[0]?.notes || [];
      const headline = notes[0]?.headline || '';
      const name = event.name || '';
      const shortName = event.shortName || '';

      // Check if it's explicitly a CFP game
      if (headline.includes('CFP') || headline.includes('College Football Playoff') ||
          headline.includes('Quarterfinal') || headline.includes('Semifinal') ||
          headline.includes('First Round') || headline.includes('National Championship')) {
        return true;
      }

      // Check for CFP bowl games
      for (const bowl of CFP_BOWLS) {
        if (headline.includes(bowl) || name.includes(bowl)) {
          // During CFP, major bowls are playoff games
          return true;
        }
      }

      return false;
    }

    function getCFPRound(event) {
      const notes = event.competitions?.[0]?.notes || [];
      const headline = notes[0]?.headline || '';
      const name = event.name || '';

      if (headline.includes('National Championship') || name.includes('National Championship')) {
        return 'championship';
      }
      if (headline.includes('Semifinal')) {
        return 'semifinal';
      }
      if (headline.includes('Quarterfinal')) {
        return 'quarterfinal';
      }
      if (headline.includes('First Round')) {
        return 'firstRound';
      }

      // For major bowls, determine based on date or structure
      // During CFP, Rose/Sugar are typically semifinals, others are quarterfinals
      for (const bowl of ['Rose Bowl', 'Sugar Bowl']) {
        if (headline.includes(bowl) || name.includes(bowl)) {
          return 'semifinal';
        }
      }
      for (const bowl of ['Fiesta Bowl', 'Peach Bowl', 'Orange Bowl', 'Cotton Bowl']) {
        if (headline.includes(bowl) || name.includes(bowl)) {
          return 'quarterfinal';
        }
      }

      return 'firstRound';
    }

    function transformGame(event) {
      if (!event) return null;
      const competition = event.competitions?.[0];
      if (!competition) return null;

      const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
      const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');
      const isComplete = event.status?.type?.completed === true;
      const notes = competition.notes || [];
      const bowlName = notes[0]?.headline || '';

      let winner = null;
      if (isComplete && homeTeam && awayTeam) {
        const homeScore = parseInt(homeTeam.score) || 0;
        const awayScore = parseInt(awayTeam.score) || 0;
        winner = homeScore > awayScore ? homeTeam.team?.abbreviation : awayTeam.team?.abbreviation;
      }

      return {
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        bowlName,
        status: event.status?.type?.state,
        statusDetail: event.status?.type?.shortDetail,
        isComplete,
        date: event.date,
        homeTeam: homeTeam ? {
          id: homeTeam.id,
          abbreviation: homeTeam.team?.abbreviation,
          displayName: homeTeam.team?.displayName,
          shortDisplayName: homeTeam.team?.shortDisplayName,
          logo: homeTeam.team?.logo,
          score: homeTeam.score,
          seed: homeTeam.curatedRank?.current || homeTeam.rank,
          winner: winner === homeTeam.team?.abbreviation
        } : null,
        awayTeam: awayTeam ? {
          id: awayTeam.id,
          abbreviation: awayTeam.team?.abbreviation,
          displayName: awayTeam.team?.displayName,
          shortDisplayName: awayTeam.team?.shortDisplayName,
          logo: awayTeam.team?.logo,
          score: awayTeam.score,
          seed: awayTeam.curatedRank?.current || awayTeam.rank,
          winner: winner === awayTeam.team?.abbreviation
        } : null,
        winner,
        round: getCFPRound(event)
      };
    }

    // Filter and transform CFP games
    const allGames = (data.events || []);
    const cfpGames = allGames
      .filter(isCFPGame)
      .map(transformGame)
      .filter(g => g !== null);

    // Organize by round
    const bracket = {
      firstRound: cfpGames.filter(g => g.round === 'firstRound'),
      quarterfinal: cfpGames.filter(g => g.round === 'quarterfinal'),
      semifinal: cfpGames.filter(g => g.round === 'semifinal'),
      championship: cfpGames.find(g => g.round === 'championship') || null,
      currentRound: 'firstRound',
      champion: null
    };

    // Sort games by seed (lower seed = higher in bracket)
    const sortBySeed = (a, b) => {
      const seedA = Math.min(a.homeTeam?.seed || 99, a.awayTeam?.seed || 99);
      const seedB = Math.min(b.homeTeam?.seed || 99, b.awayTeam?.seed || 99);
      return seedA - seedB;
    };

    bracket.firstRound.sort(sortBySeed);
    bracket.quarterfinal.sort(sortBySeed);
    bracket.semifinal.sort(sortBySeed);

    // Determine current round
    if (bracket.championship?.isComplete) {
      bracket.currentRound = 'complete';
      bracket.champion = bracket.championship.winner;
    } else if (bracket.championship) {
      bracket.currentRound = 'championship';
    } else if (bracket.semifinal.length > 0 && bracket.semifinal.every(g => g.isComplete)) {
      bracket.currentRound = 'championship';
    } else if (bracket.semifinal.length > 0) {
      bracket.currentRound = 'semifinal';
    } else if (bracket.quarterfinal.length > 0 && bracket.quarterfinal.every(g => g.isComplete)) {
      bracket.currentRound = 'semifinal';
    } else if (bracket.quarterfinal.length > 0) {
      bracket.currentRound = 'quarterfinal';
    } else if (bracket.firstRound.length > 0 && bracket.firstRound.every(g => g.isComplete)) {
      bracket.currentRound = 'quarterfinal';
    }

    console.log(`[CFP Bracket] Fetched - First Round: ${bracket.firstRound.length}, Quarterfinals: ${bracket.quarterfinal.length}, Semifinals: ${bracket.semifinal.length}, Championship: ${bracket.championship ? 1 : 0}`);

    sportsCache.ncaa.data.set(cacheKey, { data: bracket, timestamp: now });
    res.json(bracket);
  } catch (error) {
    console.error('[CFP Bracket] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - NBA
// ============================================

app.get('/api/nba/scoreboard', async (req, res) => {
  try {
    const requestedDate = req.query.date;
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    const tomorrow = getTomorrowDate();

    if (requestedDate) {
      // Specific date requested - serve from cache only
      const cacheKey = `date-${requestedDate}`;
      const cached = sportsCache.nba.data.get(cacheKey);

      if (cached) {
        cacheStats.hits++;
        const cacheAge = Date.now() - cached.timestamp;
        return res.json({
          ...cached.data,
          _cache: { hit: true, age: cacheAge, ageSeconds: Math.round(cacheAge / 1000), key: cacheKey }
        });
      }

      // Cache miss - trigger background fetch
      cacheStats.misses++;
      sportsCache.nba.activeDates.add(requestedDate);
      fetchNBADataForCache(requestedDate).catch(err => console.error(`[NBA] Background fetch failed:`, err.message));

      return res.json({
        events: [],
        _cache: { hit: false, message: 'Cache is being populated.', key: cacheKey, retryAfter: 2 }
      });
    }

    // No specific date - combine yesterday, today, tomorrow from cache
    const cachedYesterday = sportsCache.nba.data.get(`date-${yesterday}`);
    const cachedToday = sportsCache.nba.data.get(`date-${today}`);
    const cachedTomorrow = sportsCache.nba.data.get(`date-${tomorrow}`);

    const allGames = [
      ...(cachedYesterday?.data?.events || []),
      ...(cachedToday?.data?.events || []),
      ...(cachedTomorrow?.data?.events || [])
    ];

    const oldestTimestamp = Math.min(
      cachedYesterday?.timestamp || Date.now(),
      cachedToday?.timestamp || Date.now(),
      cachedTomorrow?.timestamp || Date.now()
    );

    cacheStats.hits++;
    const cacheAge = Date.now() - oldestTimestamp;

    res.json({
      events: allGames,
      _cache: {
        hit: true,
        age: cacheAge,
        ageSeconds: Math.round(cacheAge / 1000),
        sources: { yesterday, today, tomorrow }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nba/summary/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;

    // Return empty data for mock games used in testing
    if (gameId.startsWith('mock')) {
      return res.json({ _isMock: true });
    }

    const cacheKey = `nba-${gameId}`;
    const cached = gameStatsCache.data.get(cacheKey);

    if (cached) {
      cacheStats.statsHits++;
      const cacheAge = Date.now() - cached.timestamp;
      return res.json({
        ...cached.data,
        _cache: {
          hit: true,
          age: cacheAge,
          ageSeconds: Math.round(cacheAge / 1000),
          key: cacheKey
        }
      });
    }

    // Cache miss - trigger background fetch and return waiting response
    cacheStats.statsMisses++;
    console.log(`[NBA Stats] Cache miss for ${cacheKey} - triggering background fetch`);

    // Trigger immediate background fetch
    fetchGameStatsForCache('nba', gameId, false).catch(err => {
      console.error(`[NBA Stats] Background fetch failed for ${cacheKey}:`, err.message);
    });

    // Return response indicating cache is being populated
    res.json({
      boxscore: null,
      _cache: {
        hit: false,
        message: 'Stats are being fetched. Please retry in 2 seconds.',
        key: cacheKey,
        retryAfter: 2
      }
    });
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
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    const tomorrow = getTomorrowDate();

    if (requestedDate) {
      // Specific date requested - serve from cache only
      const cacheKey = `date-${requestedDate}`;
      const cached = sportsCache.ncaab.data.get(cacheKey);

      if (cached) {
        cacheStats.hits++;
        const cacheAge = Date.now() - cached.timestamp;
        return res.json({
          ...cached.data,
          _cache: { hit: true, age: cacheAge, ageSeconds: Math.round(cacheAge / 1000), key: cacheKey }
        });
      }

      // Cache miss - trigger background fetch
      cacheStats.misses++;
      sportsCache.ncaab.activeDates.add(requestedDate);
      fetchNCAABDataForCache(requestedDate).catch(err => console.error(`[NCAAB] Background fetch failed:`, err.message));

      return res.json({
        events: [],
        _cache: { hit: false, message: 'Cache is being populated.', key: cacheKey, retryAfter: 2 }
      });
    }

    // No specific date - combine yesterday, today, tomorrow from cache
    const cachedYesterday = sportsCache.ncaab.data.get(`date-${yesterday}`);
    const cachedToday = sportsCache.ncaab.data.get(`date-${today}`);
    const cachedTomorrow = sportsCache.ncaab.data.get(`date-${tomorrow}`);

    const allGames = [
      ...(cachedYesterday?.data?.events || []),
      ...(cachedToday?.data?.events || []),
      ...(cachedTomorrow?.data?.events || [])
    ];

    const oldestTimestamp = Math.min(
      cachedYesterday?.timestamp || Date.now(),
      cachedToday?.timestamp || Date.now(),
      cachedTomorrow?.timestamp || Date.now()
    );

    cacheStats.hits++;
    const cacheAge = Date.now() - oldestTimestamp;

    res.json({
      events: allGames,
      _cache: {
        hit: true,
        age: cacheAge,
        ageSeconds: Math.round(cacheAge / 1000),
        sources: { yesterday, today, tomorrow }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ncaab/summary/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;

    // Return empty data for mock games used in testing
    if (gameId.startsWith('mock')) {
      return res.json({ _isMock: true });
    }
    const cacheKey = `ncaab-${gameId}`;
    const cached = gameStatsCache.data.get(cacheKey);

    if (cached) {
      cacheStats.statsHits++;
      const cacheAge = Date.now() - cached.timestamp;
      return res.json({
        ...cached.data,
        _cache: {
          hit: true,
          age: cacheAge,
          ageSeconds: Math.round(cacheAge / 1000),
          key: cacheKey
        }
      });
    }

    // Cache miss - trigger background fetch and return waiting response
    cacheStats.statsMisses++;
    console.log(`[NCAAB Stats] Cache miss for ${cacheKey} - triggering background fetch`);

    // Trigger immediate background fetch
    fetchGameStatsForCache('ncaab', gameId, false).catch(err => {
      console.error(`[NCAAB Stats] Background fetch failed for ${cacheKey}:`, err.message);
    });

    // Return response indicating cache is being populated
    res.json({
      boxscore: null,
      _cache: {
        hit: false,
        message: 'Stats are being fetched. Please retry in 2 seconds.',
        key: cacheKey,
        retryAfter: 2
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - GAME REPLAY (Drives & Plays)
// ============================================

/**
 * Detect play type from play text
 */
function detectPlayTypeFromText(text) {
  if (!text) return 'unknown';
  const lower = text.toLowerCase();
  // Kickoff detection: "kickoff", "kicks off", or "kicks X yards from" pattern
  if (lower.includes('kickoff') || lower.includes('kicks off') || /kicks\s+\d+\s+yards?\s+from/i.test(text)) return 'kickoff';
  if (lower.includes('punt')) return 'punt';
  if (lower.includes('field goal')) return 'field_goal';
  if (lower.includes('extra point')) return 'extra_point';
  if (lower.includes('two-point')) return 'two_point';
  if (lower.includes('pass') || lower.includes('incomplete') || lower.includes('sacked')) return 'pass';
  if (lower.includes('rush') || lower.includes('up the middle') || lower.includes('left end') || lower.includes('right end') || lower.includes('left guard') || lower.includes('right guard') || lower.includes('left tackle') || lower.includes('right tackle')) return 'rush';
  if (lower.includes('penalty')) return 'penalty';
  if (lower.includes('timeout')) return 'timeout';
  if (lower.includes('kneel') || lower.includes('kneels')) return 'kneel';
  return 'unknown';
}

/**
 * Normalize team abbreviations (ESPN uses different abbreviations in different places)
 */
function normalizeTeamAbbr(abbr) {
  if (!abbr) return '';
  const normalized = abbr.toUpperCase();
  const TEAM_ABBR_MAP = {
    'HST': 'HOU', 'HOU': 'HOU',
    'NWE': 'NE', 'NE': 'NE',
    'JAC': 'JAX', 'JAX': 'JAX',
    'LV': 'LV', 'LVR': 'LV', 'OAK': 'LV',
    'LAR': 'LA', 'LA': 'LA',
    'WSH': 'WAS', 'WAS': 'WAS',
    'SFO': 'SF', 'SF': 'SF',
    'GNB': 'GB', 'GB': 'GB',
    'KAN': 'KC', 'KC': 'KC',
    'TAM': 'TB', 'TB': 'TB',
    'NOR': 'NO', 'NO': 'NO',
    'SDG': 'LAC', 'LAC': 'LAC',
    'STL': 'LA'
  };
  return TEAM_ABBR_MAP[normalized] || normalized;
}

/**
 * Parse ESPN possessionText (e.g., "NE 31", "HOU 15") to 0-100 field position
 * 0 = away team's end zone, 100 = home team's end zone
 */
function parsePossessionTextToFieldPosition(possessionText, awayAbbr, homeAbbr) {
  if (!possessionText) return null;

  // Parse "TEAM YARD" format (e.g., "NE 31", "HOU 15", "50" for midfield)
  const match = possessionText.match(/^([A-Z]{2,4})\s+(\d+)$/i);
  if (!match) {
    // Handle special case "50" for midfield
    if (possessionText.trim() === '50') return 50;
    return null;
  }

  const teamAbbr = normalizeTeamAbbr(match[1]);
  const yardLine = parseInt(match[2]);
  const normalizedAway = normalizeTeamAbbr(awayAbbr);
  const normalizedHome = normalizeTeamAbbr(homeAbbr);

  // If on away team's side (0-50 on field)
  if (teamAbbr === normalizedAway) {
    return yardLine;
  }
  // If on home team's side (50-100 on field)
  if (teamAbbr === normalizedHome) {
    return 100 - yardLine;
  }

  // Unknown team, return null
  console.warn(`[Parser] Unknown team in possessionText: ${possessionText} (away: ${awayAbbr}, home: ${homeAbbr})`);
  return null;
}

/**
 * Convert ESPN yard line to 0-100 field position (fallback when possessionText unavailable)
 * 0 = away team's end zone, 100 = home team's end zone
 */
function convertYardLineToFieldPosition(yardLine, teamAbbr, awayAbbr, homeAbbr) {
  if (yardLine === undefined || yardLine === null) return null;

  const normalizedTeam = normalizeTeamAbbr(teamAbbr);
  const normalizedAway = normalizeTeamAbbr(awayAbbr);
  const normalizedHome = normalizeTeamAbbr(homeAbbr);

  // If on away team's side (0-50 on field)
  if (normalizedTeam === normalizedAway) {
    return yardLine;
  }
  // If on home team's side (50-100 on field)
  if (normalizedTeam === normalizedHome) {
    return 100 - yardLine;
  }
  // Default to midfield if unknown
  return 50;
}

/**
 * Parse ESPN drives data into database format
 */
function parseESPNDrivesToDB(summaryData, sport, awayAbbr, homeAbbr) {
  const drivesPrevious = summaryData.drives?.previous || [];
  const drivesCurrent = summaryData.drives?.current;

  // Combine previous drives with current drive if exists
  const allDrives = drivesCurrent ? [...drivesPrevious, drivesCurrent] : drivesPrevious;

  const parsedDrives = [];
  const parsedPlays = [];
  let globalPlaySequence = 0;

  allDrives.forEach((drive, driveIndex) => {
    const teamAbbr = drive.team?.abbreviation || null;
    const isAwayTeam = teamAbbr === awayAbbr;

    // Parse drive
    const parsedDrive = {
      drive_sequence: driveIndex + 1,
      team_abbr: teamAbbr,
      team_id: drive.team?.id || null,
      start_period: drive.start?.period?.number || null,
      start_clock: drive.start?.clock?.displayValue || null,
      start_yard: convertYardLineToFieldPosition(
        drive.start?.yardLine,
        drive.start?.team?.abbreviation || teamAbbr,
        awayAbbr,
        homeAbbr
      ),
      end_period: drive.end?.period?.number || null,
      end_clock: drive.end?.clock?.displayValue || null,
      end_yard: convertYardLineToFieldPosition(
        drive.end?.yardLine,
        drive.end?.team?.abbreviation || teamAbbr,
        awayAbbr,
        homeAbbr
      ),
      result: drive.displayResult || drive.result || null,
      is_scoring: drive.isScore || false,
      play_count: drive.offensivePlays || drive.plays?.length || 0,
      yards_gained: drive.yards || 0,
      time_of_possession: drive.timeOfPossession?.displayValue || null,
      raw_data: drive
    };
    parsedDrives.push(parsedDrive);

    // Parse plays within this drive
    const drivePlays = drive.plays || [];
    drivePlays.forEach((play, playIndexInDrive) => {
      globalPlaySequence++;

      const playText = play.text || '';
      const playType = detectPlayTypeFromText(playText);
      const isTouchdown = /touchdown/i.test(playText);
      const isInterception = /intercept/i.test(playText);
      const isFumble = /fumble/i.test(playText);
      const isTurnover = isInterception || isFumble;
      const isPenalty = /penalty/i.test(playText);

      // Detect possession change by comparing start and end teams
      const startTeamAbbr = normalizeTeamAbbr(play.start?.team?.abbreviation || teamAbbr);
      const endTeamAbbr = normalizeTeamAbbr(play.end?.team?.abbreviation || teamAbbr);
      const possessionChanged = startTeamAbbr !== endTeamAbbr;

      // Turnover on downs: possession changed on non-fumble/interception play (typically 4th down failure)
      const isTurnoverOnDowns = possessionChanged && !isTurnover && !isTouchdown && playType !== 'punt' && playType !== 'kickoff';

      // Use END team for possession if possession changed (turnover of any kind)
      const actualPossessionTeam = possessionChanged ? endTeamAbbr : teamAbbr;

      // Calculate score value
      let scoreValue = 0;
      if (play.scoringPlay) {
        if (isTouchdown) scoreValue = 6;
        else if (playType === 'field_goal') scoreValue = 3;
        else if (playType === 'extra_point') scoreValue = 1;
        else if (playType === 'two_point') scoreValue = 2;
        else if (/safety/i.test(playText)) scoreValue = 2;
      }

      // Compute yards gained
      const yardsMatch = playText.match(/for\s+(-?\d+)\s+yard/i);
      const yardsGained = yardsMatch ? parseInt(yardsMatch[1]) : null;

      // Field positions - prefer possessionText which is always accurate
      // Fall back to yardLine calculation only if possessionText unavailable
      const startYard = parsePossessionTextToFieldPosition(
        play.start?.possessionText,
        awayAbbr,
        homeAbbr
      ) ?? convertYardLineToFieldPosition(
        play.start?.yardLine,
        play.start?.team?.abbreviation || teamAbbr,
        awayAbbr,
        homeAbbr
      );
      const endYard = parsePossessionTextToFieldPosition(
        play.end?.possessionText,
        awayAbbr,
        homeAbbr
      ) ?? convertYardLineToFieldPosition(
        play.end?.yardLine,
        play.end?.team?.abbreviation || teamAbbr,
        awayAbbr,
        homeAbbr
      );

      // Pre-compute animation data
      const driveDirection = isAwayTeam ? 1 : -1; // Away drives toward 100, home toward 0
      const animationData = {
        type: playType,
        fromYard: startYard,
        toYard: endYard,
        direction: driveDirection,
        isTouchdown,
        isTurnover,
        turnoverType: isInterception ? 'interception' : (isFumble ? 'fumble' : null)
      };

      const parsedPlay = {
        drive_sequence: driveIndex + 1,
        espn_play_id: play.id || null,
        play_sequence: globalPlaySequence,
        drive_play_sequence: playIndexInDrive + 1,
        period: play.period?.number || play.period || 1,
        clock: play.clock?.displayValue || null,
        start_yard: startYard,
        end_yard: endYard,
        yards_gained: yardsGained,
        // Use play.end for state AFTER the play (correct down & distance for display)
        down: play.end?.down || null,
        distance: play.end?.distance || null,
        // Store ESPN's pre-formatted text directly (e.g., "1st & 10 at HOU 26", "HOU 26")
        down_distance_text: play.end?.downDistanceText || play.end?.shortDownDistanceText || null,
        possession_text: play.end?.possessionText || null,
        // Store START position text for pre-play display (during animation)
        start_down_distance_text: play.start?.downDistanceText || play.start?.shortDownDistanceText || null,
        start_possession_text: play.start?.possessionText || null,
        play_type: playType,
        play_text: playText,
        // Use actualPossessionTeam which reflects END state (important for turnovers/turnover on downs)
        possession_team_abbr: actualPossessionTeam,
        possession_team_id: drive.team?.id || null,
        is_scoring: play.scoringPlay || false,
        score_value: scoreValue,
        away_score: play.awayScore || 0,
        home_score: play.homeScore || 0,
        is_touchdown: isTouchdown,
        is_turnover: isTurnover,
        is_turnover_on_downs: isTurnoverOnDowns,
        turnover_type: isInterception ? 'interception' : (isFumble ? 'fumble' : null),
        is_penalty: isPenalty,
        penalty_yards: isPenalty ? (playText.match(/(\d+)\s+yard(?:s)?\s+penalty/i)?.[1] || null) : null,
        animation_type: playType,
        animation_data: animationData,
        raw_data: play
      };
      parsedPlays.push(parsedPlay);
    });
  });

  return { drives: parsedDrives, plays: parsedPlays };
}

/**
 * POST /api/replay/save-plays/:gameId
 * Fetch and save all plays for a game from ESPN
 */
app.post('/api/replay/save-plays/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const sport = req.query.sport || 'nfl';

    console.log(`[Replay] Saving plays for game ${gameId} (${sport})`);

    // Determine ESPN endpoint based on sport
    const sportEndpoints = {
      'nfl': `${ESPN_BASE}/football/nfl/summary?event=${gameId}`,
      'ncaa': `${ESPN_BASE}/football/college-football/summary?event=${gameId}`
    };

    const url = sportEndpoints[sport];
    if (!url) {
      return res.status(400).json({ error: 'Invalid sport. Use nfl or ncaa.' });
    }

    // Fetch game summary from ESPN
    const summaryData = await fetchESPN(url);

    if (!summaryData || !summaryData.drives) {
      return res.status(404).json({ error: 'No drive data found for this game' });
    }

    // Get team abbreviations
    const boxscore = summaryData.boxscore;
    const competitors = boxscore?.teams || [];
    let awayAbbr = '';
    let homeAbbr = '';

    competitors.forEach(team => {
      if (team.homeAway === 'away') {
        awayAbbr = team.team?.abbreviation || '';
      } else if (team.homeAway === 'home') {
        homeAbbr = team.team?.abbreviation || '';
      }
    });

    // Parse drives and plays
    const { drives, plays } = parseESPNDrivesToDB(summaryData, sport, awayAbbr, homeAbbr);

    console.log(`[Replay] Parsed ${drives.length} drives and ${plays.length} plays for game ${gameId}`);

    // Save drives first to get their IDs
    const savedDrives = await saveDrives(gameId, sport, drives);

    // Create map of drive_sequence -> database drive_id
    const driveIdMap = new Map();
    savedDrives.forEach(d => {
      driveIdMap.set(d.drive_sequence, d.id);
    });

    // Save plays with drive references
    const playCount = await savePlays(gameId, sport, plays, driveIdMap);

    // Mark game as having play data
    await markGameHasPlays(gameId, playCount);

    res.json({
      success: true,
      gameId,
      sport,
      drivesCount: drives.length,
      playsCount: playCount,
      awayTeam: awayAbbr,
      homeTeam: homeAbbr
    });
  } catch (error) {
    console.error('[Replay] Error saving plays:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/replay/games
 * List games that have play data saved
 */
app.get('/api/replay/games', async (req, res) => {
  try {
    const filters = {
      sport: req.query.sport || null,
      dateFrom: req.query.date_from || null,
      dateTo: req.query.date_to || null,
      team: req.query.team || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };

    const games = await getGamesWithPlays(filters);

    res.json({
      games: games.map(g => ({
        id: g.id,
        sport: g.sport,
        game_date: g.game_date,
        week_number: g.week_number,
        status: g.status,
        home_team: g.home_team,
        home_team_id: g.home_team_id,
        home_score: g.home_score,
        away_team: g.away_team,
        away_team_id: g.away_team_id,
        away_score: g.away_score,
        play_count: g.play_count || g.saved_play_count,
        has_play_data: g.has_play_data
      })),
      count: games.length
    });
  } catch (error) {
    console.error('[Replay] Error fetching games:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/replay/game/:gameId
 * Get complete game data for replay (drives + plays)
 */
app.get('/api/replay/game/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;

    const gameData = await getGameForReplay(gameId);

    if (!gameData) {
      return res.status(404).json({ error: 'Game not found or no play data saved' });
    }

    // Determine away/home team abbreviations for possession detection
    // Try to get abbreviations from raw_data first (most reliable source)
    let awayTeamAbbr = null;
    let homeTeamAbbr = null;

    // Try raw_data which has actual team abbreviations
    let rawData = gameData.game.raw_data;
    if (rawData) {
      try {
        const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        // Try boxscore teams format
        const boxscoreTeams = parsed.boxscore?.teams || [];
        boxscoreTeams.forEach(team => {
          if (team.homeAway === 'away' && team.team?.abbreviation) {
            awayTeamAbbr = team.team.abbreviation;
          } else if (team.homeAway === 'home' && team.team?.abbreviation) {
            homeTeamAbbr = team.team.abbreviation;
          }
        });
        // Try header competitions format as fallback
        if (!awayTeamAbbr || !homeTeamAbbr) {
          const competitors = parsed.header?.competitions?.[0]?.competitors || [];
          competitors.forEach(comp => {
            if (comp.homeAway === 'away' && comp.team?.abbreviation) {
              awayTeamAbbr = awayTeamAbbr || comp.team.abbreviation;
            } else if (comp.homeAway === 'home' && comp.team?.abbreviation) {
              homeTeamAbbr = homeTeamAbbr || comp.team.abbreviation;
            }
          });
        }
      } catch (e) {
        console.warn('[Replay] Failed to parse raw_data for team abbreviations:', e.message);
      }
    }

    // Fallback: get unique team abbreviations from drives
    if (!awayTeamAbbr || !homeTeamAbbr) {
      const driveTeams = new Set();
      gameData.drives.forEach(drive => {
        if (drive.team_abbr) driveTeams.add(drive.team_abbr);
      });
      const teamAbbrs = Array.from(driveTeams);
      if (teamAbbrs.length >= 2) {
        // Convention: first team alphabetically is away (fallback heuristic)
        const sorted = teamAbbrs.sort();
        awayTeamAbbr = awayTeamAbbr || sorted[0];
        homeTeamAbbr = homeTeamAbbr || sorted[1];
      }
    }

    // Final fallback: use possession_team_abbr from first play
    if (!awayTeamAbbr && gameData.plays.length > 0) {
      const uniqueTeams = new Set(gameData.plays.map(p => p.possession_team_abbr).filter(Boolean));
      const teamAbbrs = Array.from(uniqueTeams);
      if (teamAbbrs.length >= 2) {
        awayTeamAbbr = teamAbbrs[0];
        homeTeamAbbr = teamAbbrs[1];
      }
    }

    console.log(`[Replay] Game ${gameId} - Away: ${awayTeamAbbr}, Home: ${homeTeamAbbr}`);

    // Format plays for PlayReplayEngine compatibility
    const formattedPlays = gameData.plays.map(play => ({
      sequenceNumber: play.play_sequence,
      period: play.period,
      clock: play.clock,
      type: play.play_type,
      text: play.play_text,
      startYard: play.start_yard,
      endYard: play.end_yard,
      yardLine: play.end_yard,
      down: play.down,
      distance: play.distance,
      // ESPN's pre-formatted text (preferred for display) - END position
      downDistanceText: play.down_distance_text,
      possessionText: play.possession_text,
      // ESPN's pre-formatted text - START position (for during animation)
      startDownDistanceText: play.start_down_distance_text,
      startPossessionText: play.start_possession_text,
      possession: play.possession_team_abbr === awayTeamAbbr ? 'away' :
                  play.possession_team_abbr === homeTeamAbbr ? 'home' : 'away',
      awayScore: play.away_score,
      homeScore: play.home_score,
      scoringPlay: play.is_scoring,
      isTouchdown: play.is_touchdown,
      isTurnover: play.is_turnover,
      isTurnoverOnDowns: play.is_turnover_on_downs,
      turnoverType: play.turnover_type,
      isInterception: play.turnover_type === 'interception',
      isFumble: play.turnover_type === 'fumble',
      animationData: play.animation_data
    }));

    // Extract team info from raw_data if available, or use stored team names
    // Note: rawData was already parsed above for team abbreviation detection

    // Default team info using the abbreviations we already extracted
    const awayAbbr = awayTeamAbbr || gameData.game.away_team || 'AWAY';
    const homeAbbr = homeTeamAbbr || gameData.game.home_team || 'HOME';
    let awayTeamInfo = { abbr: awayAbbr, name: gameData.game.away_team || awayAbbr, logo: '', record: '' };
    let homeTeamInfo = { abbr: homeAbbr, name: gameData.game.home_team || homeAbbr, logo: '', record: '' };

    // Helper to extract team info from parsed data
    const extractTeamInfoFromData = (parsed) => {
      // Try boxscore teams format first
      const boxscoreTeams = parsed.boxscore?.teams || [];
      boxscoreTeams.forEach(team => {
        if (team.homeAway === 'away') {
          awayTeamInfo = {
            abbr: team.team?.abbreviation || awayAbbr,
            name: team.team?.displayName || team.team?.name || gameData.game.away_team,
            logo: team.team?.logo || '',
            record: ''
          };
        } else if (team.homeAway === 'home') {
          homeTeamInfo = {
            abbr: team.team?.abbreviation || homeAbbr,
            name: team.team?.displayName || team.team?.name || gameData.game.home_team,
            logo: team.team?.logo || '',
            record: ''
          };
        }
      });

      // Try header competitions format for records
      const competitors = parsed.header?.competitions?.[0]?.competitors || [];
      if (competitors.length > 0) {
        competitors.forEach(comp => {
          if (comp.homeAway === 'away') {
            awayTeamInfo.logo = awayTeamInfo.logo || comp.team?.logo || '';
            awayTeamInfo.record = comp.record?.[0]?.summary || comp.records?.[0]?.summary || '';
          } else if (comp.homeAway === 'home') {
            homeTeamInfo.logo = homeTeamInfo.logo || comp.team?.logo || '';
            homeTeamInfo.record = comp.record?.[0]?.summary || comp.records?.[0]?.summary || '';
          }
        });
      }
    };

    if (rawData) {
      const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      extractTeamInfoFromData(parsed);
    }

    // If logos are still missing, fetch fresh data from ESPN
    if (!awayTeamInfo.logo || !homeTeamInfo.logo) {
      console.log(`[Replay] Missing team logos for game ${gameId}, fetching from ESPN...`);
      try {
        const sport = gameData.game.sport || 'nfl';
        const endpoint = sport === 'ncaa'
          ? `${ESPN_BASE}/football/college-football/summary?event=${gameId}`
          : `${ESPN_BASE}/football/nfl/summary?event=${gameId}`;

        const summaryData = await fetchESPN(endpoint);

        if (summaryData) {
          // Build fresh raw_data
          const freshRawData = {
            boxscore: summaryData.boxscore,
            header: summaryData.header
          };

          extractTeamInfoFromData(freshRawData);

          // Update database with fresh raw_data for future requests
          try {
            await pool.query(
              'UPDATE games SET raw_data = $1 WHERE id = $2',
              [JSON.stringify(freshRawData), gameId]
            );
            console.log(`[Replay] Updated raw_data for game ${gameId}`);
          } catch (updateErr) {
            console.error(`[Replay] Failed to update raw_data for game ${gameId}:`, updateErr.message);
          }
        }
      } catch (fetchErr) {
        console.error(`[Replay] Failed to fetch fresh data for game ${gameId}:`, fetchErr.message);
      }
    }

    res.json({
      id: gameData.game.id,
      type: 'game',
      metadata: {
        away: awayTeamInfo,
        home: homeTeamInfo
      },
      plays: formattedPlays,
      drives: gameData.drives.map(d => ({
        sequence: d.drive_sequence,
        team: d.team_abbr,
        result: d.result,
        isScoring: d.is_scoring,
        playCount: d.play_count,
        yards: d.yards_gained,
        startPeriod: d.start_period,
        startClock: d.start_clock,
        endPeriod: d.end_period,
        endClock: d.end_clock
      })),
      totalPlays: formattedPlays.length,
      totalDrives: gameData.drives.length
    });
  } catch (error) {
    console.error('[Replay] Error fetching game for replay:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/replay/game/:gameId/plays
 * Get just plays for a game (lighter endpoint)
 */
app.get('/api/replay/game/:gameId/plays', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const options = {
      period: req.query.period ? parseInt(req.query.period) : null,
      fromSequence: req.query.from ? parseInt(req.query.from) : null,
      limit: req.query.limit ? parseInt(req.query.limit) : null
    };

    const plays = await getGamePlays(gameId, options);

    res.json({
      gameId,
      plays: plays.map(p => ({
        sequence: p.play_sequence,
        period: p.period,
        clock: p.clock,
        type: p.play_type,
        text: p.play_text,
        startYard: p.start_yard,
        endYard: p.end_yard,
        down: p.down,
        distance: p.distance,
        // ESPN's pre-formatted text (preferred for display) - END position
        downDistanceText: p.down_distance_text,
        possessionText: p.possession_text,
        // ESPN's pre-formatted text - START position (for during animation)
        startDownDistanceText: p.start_down_distance_text,
        startPossessionText: p.start_possession_text,
        awayScore: p.away_score,
        homeScore: p.home_score,
        isScoring: p.is_scoring,
        isTouchdown: p.is_touchdown,
        isTurnover: p.is_turnover,
        isTurnoverOnDowns: p.is_turnover_on_downs
      })),
      count: plays.length
    });
  } catch (error) {
    console.error('[Replay] Error fetching plays:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/replay/sync-completed
 * Sync plays for recently completed games (background job endpoint)
 */
app.post('/api/replay/sync-completed', async (req, res) => {
  try {
    const sport = req.query.sport || 'nfl';
    const limit = parseInt(req.query.limit) || 10;

    console.log(`[Replay] Syncing completed ${sport} games...`);

    // Find completed games without play data
    const query = `
      SELECT id, sport FROM games
      WHERE status = 'completed'
        AND sport = $1
        AND (has_play_data IS NULL OR has_play_data = FALSE)
      ORDER BY game_date DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [sport, limit]);
    const gamesToSync = result.rows;

    console.log(`[Replay] Found ${gamesToSync.length} games to sync`);

    const syncResults = [];
    for (const game of gamesToSync) {
      try {
        // Fetch and save plays
        const sportEndpoints = {
          'nfl': `${ESPN_BASE}/football/nfl/summary?event=${game.id}`,
          'ncaa': `${ESPN_BASE}/football/college-football/summary?event=${game.id}`
        };

        const summaryData = await fetchESPN(sportEndpoints[game.sport]);

        if (summaryData && summaryData.drives) {
          const boxscore = summaryData.boxscore;
          const competitors = boxscore?.teams || [];
          let awayAbbr = '';
          let homeAbbr = '';

          competitors.forEach(team => {
            if (team.homeAway === 'away') awayAbbr = team.team?.abbreviation || '';
            else if (team.homeAway === 'home') homeAbbr = team.team?.abbreviation || '';
          });

          const { drives, plays } = parseESPNDrivesToDB(summaryData, game.sport, awayAbbr, homeAbbr);
          const savedDrives = await saveDrives(game.id, game.sport, drives);

          const driveIdMap = new Map();
          savedDrives.forEach(d => driveIdMap.set(d.drive_sequence, d.id));

          const playCount = await savePlays(game.id, game.sport, plays, driveIdMap);
          await markGameHasPlays(game.id, playCount);

          syncResults.push({ gameId: game.id, success: true, playCount });
        } else {
          syncResults.push({ gameId: game.id, success: false, error: 'No drive data' });
        }

        // Rate limit between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`[Replay] Failed to sync game ${game.id}:`, err.message);
        syncResults.push({ gameId: game.id, success: false, error: err.message });
      }
    }

    res.json({
      synced: syncResults.filter(r => r.success).length,
      failed: syncResults.filter(r => !r.success).length,
      results: syncResults
    });
  } catch (error) {
    console.error('[Replay] Error in sync-completed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/replay/game/:gameId
 * Delete a game and all its related replay data (drives and plays)
 */
app.delete('/api/replay/game/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;

    console.log(`[Replay] Deleting game ${gameId} and its replay data`);

    // Delete plays first (foreign key constraint)
    await pool.query('DELETE FROM game_plays WHERE game_id = $1', [gameId]);

    // Delete drives
    await pool.query('DELETE FROM game_drives WHERE game_id = $1', [gameId]);

    // Delete game
    const result = await pool.query('DELETE FROM games WHERE id = $1 RETURNING *', [gameId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    console.log(`[Replay] Successfully deleted game ${gameId}`);

    res.json({
      success: true,
      gameId,
      message: 'Game and replay data deleted successfully'
    });
  } catch (error) {
    console.error('[Replay] Error deleting game:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - MLB
// ============================================

app.get('/api/mlb/scoreboard', async (req, res) => {
  try {
    const requestedDate = req.query.date;
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    const tomorrow = getTomorrowDate();

    if (requestedDate) {
      // Specific date requested - serve from cache only
      const cacheKey = `date-${requestedDate}`;
      const cached = sportsCache.mlb.data.get(cacheKey);

      if (cached) {
        cacheStats.hits++;
        const cacheAge = Date.now() - cached.timestamp;
        return res.json({
          ...cached.data,
          _cache: { hit: true, age: cacheAge, ageSeconds: Math.round(cacheAge / 1000), key: cacheKey }
        });
      }

      // Cache miss - trigger background fetch
      cacheStats.misses++;
      sportsCache.mlb.activeDates.add(requestedDate);
      fetchMLBDataForCache(requestedDate).catch(err => console.error(`[MLB] Background fetch failed:`, err.message));

      return res.json({
        events: [],
        _cache: { hit: false, message: 'Cache is being populated.', key: cacheKey, retryAfter: 2 }
      });
    }

    // No specific date - combine yesterday, today, tomorrow from cache
    const cachedYesterday = sportsCache.mlb.data.get(`date-${yesterday}`);
    const cachedToday = sportsCache.mlb.data.get(`date-${today}`);
    const cachedTomorrow = sportsCache.mlb.data.get(`date-${tomorrow}`);

    const allGames = [
      ...(cachedYesterday?.data?.events || []),
      ...(cachedToday?.data?.events || []),
      ...(cachedTomorrow?.data?.events || [])
    ];

    const oldestTimestamp = Math.min(
      cachedYesterday?.timestamp || Date.now(),
      cachedToday?.timestamp || Date.now(),
      cachedTomorrow?.timestamp || Date.now()
    );

    cacheStats.hits++;
    const cacheAge = Date.now() - oldestTimestamp;

    res.json({
      events: allGames,
      _cache: {
        hit: true,
        age: cacheAge,
        ageSeconds: Math.round(cacheAge / 1000),
        sources: { yesterday, today, tomorrow }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mlb/summary/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;

    // Return empty data for mock games used in testing
    if (gameId.startsWith('mock')) {
      return res.json({ _isMock: true });
    }

    const cacheKey = `mlb-${gameId}`;
    const cached = gameStatsCache.data.get(cacheKey);

    if (cached) {
      cacheStats.statsHits++;
      const cacheAge = Date.now() - cached.timestamp;
      return res.json({
        ...cached.data,
        _cache: {
          hit: true,
          age: cacheAge,
          ageSeconds: Math.round(cacheAge / 1000),
          key: cacheKey
        }
      });
    }

    // Cache miss - trigger background fetch and return waiting response
    cacheStats.statsMisses++;
    console.log(`[MLB Stats] Cache miss for ${cacheKey} - triggering background fetch`);

    // Trigger immediate background fetch
    fetchGameStatsForCache('mlb', gameId, false).catch(err => {
      console.error(`[MLB Stats] Background fetch failed for ${cacheKey}:`, err.message);
    });

    // Return response indicating cache is being populated
    res.json({
      boxscore: null,
      _cache: {
        hit: false,
        message: 'Stats are being fetched. Please retry in 2 seconds.',
        key: cacheKey,
        retryAfter: 2
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MLB LiveCast proxy - forwards to Statsapi feed/live endpoint
// Avoids CORS issues and keeps Statsapi calls server-side
app.get('/api/mlb/livecast/:gamePk', async (req, res) => {
  try {
    const { gamePk } = req.params;
    if (!gamePk || !/^\d+$/.test(gamePk)) {
      return res.status(400).json({ error: 'Invalid gamePk' });
    }
    const url = `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;
    const response = await axios.get(url, { timeout: 8000 });
    res.json(response.data);
  } catch (error) {
    console.error(`[MLB LiveCast] Proxy error for ${req.params.gamePk}:`, error.message);
    res.status(502).json({ error: 'Failed to fetch live game data' });
  }
});

// MLB Win Probability proxy - fetches from Baseball Savant
app.get('/api/mlb/win-probability/:gamePk', async (req, res) => {
  try {
    const { gamePk } = req.params;
    if (!gamePk || !/^\d+$/.test(gamePk)) {
      return res.status(400).json({ error: 'Invalid gamePk' });
    }
    const url = `https://baseballsavant.mlb.com/gf?game_pk=${gamePk}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://baseballsavant.mlb.com/'
      }
    });
    // Live games: scoreboard.stats.wpa.gameWpa; completed games: stats.wpa.gameWpa
    const wpa = response.data?.scoreboard?.stats?.wpa?.gameWpa
      || response.data?.stats?.wpa?.gameWpa;
    if (!wpa || !wpa.length) return res.json({ wpa: [] });
    res.json({ wpa });
  } catch (error) {
    console.error(`[MLB WP] Proxy error for ${req.params.gamePk}:`, error.message);
    res.status(502).json({ error: 'Failed to fetch win probability data' });
  }
});

// ============================================
// API ROUTES - NHL
// ============================================

app.get('/api/nhl/scoreboard', async (req, res) => {
  try {
    const requestedDate = req.query.date;
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    const tomorrow = getTomorrowDate();

    if (requestedDate) {
      // Specific date requested - serve from cache only
      const cacheKey = `date-${requestedDate}`;
      const cached = sportsCache.nhl.data.get(cacheKey);

      if (cached) {
        cacheStats.hits++;
        const cacheAge = Date.now() - cached.timestamp;
        return res.json({
          ...cached.data,
          _cache: { hit: true, age: cacheAge, ageSeconds: Math.round(cacheAge / 1000), key: cacheKey }
        });
      }

      // Cache miss - trigger background fetch
      cacheStats.misses++;
      sportsCache.nhl.activeDates.add(requestedDate);
      fetchNHLDataForCache(requestedDate).catch(err => console.error(`[NHL] Background fetch failed:`, err.message));

      return res.json({
        events: [],
        _cache: { hit: false, message: 'Cache is being populated.', key: cacheKey, retryAfter: 2 }
      });
    }

    // No specific date - combine yesterday, today, tomorrow from cache
    const cachedYesterday = sportsCache.nhl.data.get(`date-${yesterday}`);
    const cachedToday = sportsCache.nhl.data.get(`date-${today}`);
    const cachedTomorrow = sportsCache.nhl.data.get(`date-${tomorrow}`);

    const allGames = [
      ...(cachedYesterday?.data?.events || []),
      ...(cachedToday?.data?.events || []),
      ...(cachedTomorrow?.data?.events || [])
    ];

    const oldestTimestamp = Math.min(
      cachedYesterday?.timestamp || Date.now(),
      cachedToday?.timestamp || Date.now(),
      cachedTomorrow?.timestamp || Date.now()
    );

    cacheStats.hits++;
    const cacheAge = Date.now() - oldestTimestamp;

    res.json({
      events: allGames,
      _cache: {
        hit: true,
        age: cacheAge,
        ageSeconds: Math.round(cacheAge / 1000),
        sources: { yesterday, today, tomorrow }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/nhl/summary/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;

    // Return empty data for mock games used in testing
    if (gameId.startsWith('mock')) {
      return res.json({ _isMock: true });
    }
    const cacheKey = `nhl-${gameId}`;
    const cached = gameStatsCache.data.get(cacheKey);

    if (cached) {
      cacheStats.statsHits++;
      const cacheAge = Date.now() - cached.timestamp;
      return res.json({
        ...cached.data,
        _cache: {
          hit: true,
          age: cacheAge,
          ageSeconds: Math.round(cacheAge / 1000),
          key: cacheKey
        }
      });
    }

    // Cache miss - trigger background fetch and return waiting response
    cacheStats.statsMisses++;
    console.log(`[NHL Stats] Cache miss for ${cacheKey} - triggering background fetch`);

    // Trigger immediate background fetch
    fetchGameStatsForCache('nhl', gameId, false).catch(err => {
      console.error(`[NHL Stats] Background fetch failed for ${cacheKey}:`, err.message);
    });

    // Return response indicating cache is being populated
    res.json({
      boxscore: null,
      _cache: {
        hit: false,
        message: 'Stats are being fetched. Please retry in 2 seconds.',
        key: cacheKey,
        retryAfter: 2
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ADAPTIVE POLLING SYSTEM - INTELLIGENT CACHE UPDATES
// ============================================
// These background jobs are the ONLY way data is fetched from ESPN.
// Client API requests NEVER trigger ESPN calls - they only read from cache.
//
// Polling intervals are dynamically adjusted based on game state:
// - No games today: Skip entirely
// - All games upcoming (>1hr): Every 5 minutes
// - Games starting soon (<1hr): Every 2 minutes
// - Games in progress: Every 30 seconds
// - Critical moments (close game, final 2 min, OT): Every 15 seconds
// - All games completed: Stop polling

// Polling interval constants (in milliseconds)
const POLL_INTERVALS = {
  CRITICAL: 15000,    // 15 seconds - close games, final minutes, overtime
  LIVE: 30000,        // 30 seconds - games in progress
  STARTING_SOON: 120000, // 2 minutes - games starting within 1 hour
  UPCOMING: 300000,   // 5 minutes - games more than 1 hour away
  IDLE: 600000        // 10 minutes - fallback when no games scheduled
};

// Track polling state for each sport
const adaptivePolling = {
  nfl: { timeout: null, lastInterval: null, running: false },
  ncaa: { timeout: null, lastInterval: null, running: false },
  nba: { timeout: null, lastInterval: null, running: false },
  ncaab: { timeout: null, lastInterval: null, running: false },
  mlb: { timeout: null, lastInterval: null, running: false },
  nhl: { timeout: null, lastInterval: null, running: false }
};

/**
 * Analyze game states and determine optimal polling interval
 * @param {Object} data - Scoreboard data with events array
 * @param {string} sport - Sport type for sport-specific logic
 * @returns {Object} { interval: number, reason: string, stats: Object }
 */
function analyzeGameStates(data, sport) {
  if (!data?.events || data.events.length === 0) {
    return { interval: POLL_INTERVALS.IDLE, reason: 'no-games', stats: { total: 0 } };
  }

  const now = Date.now();
  const events = data.events;

  let liveGames = 0;
  let criticalGames = 0;
  let upcomingWithin1Hr = 0;
  let upcomingLater = 0;
  let completedGames = 0;

  for (const event of events) {
    const state = event.status?.type?.state;
    const comp = event.competitions?.[0];

    if (state === 'post') {
      completedGames++;
      continue;
    }

    if (state === 'in') {
      liveGames++;

      // Check for critical moments
      if (isCriticalMoment(event, sport)) {
        criticalGames++;
      }
      continue;
    }

    if (state === 'pre') {
      const startTime = new Date(event.date).getTime();
      const timeUntilStart = startTime - now;

      if (timeUntilStart <= 3600000) { // Within 1 hour
        upcomingWithin1Hr++;
      } else {
        upcomingLater++;
      }
    }
  }

  const stats = {
    total: events.length,
    live: liveGames,
    critical: criticalGames,
    startingSoon: upcomingWithin1Hr,
    upcoming: upcomingLater,
    completed: completedGames
  };

  // Determine interval based on priority
  if (criticalGames > 0) {
    return { interval: POLL_INTERVALS.CRITICAL, reason: 'critical-moments', stats };
  }

  if (liveGames > 0) {
    return { interval: POLL_INTERVALS.LIVE, reason: 'live-games', stats };
  }

  if (upcomingWithin1Hr > 0) {
    return { interval: POLL_INTERVALS.STARTING_SOON, reason: 'starting-soon', stats };
  }

  if (upcomingLater > 0) {
    return { interval: POLL_INTERVALS.UPCOMING, reason: 'upcoming', stats };
  }

  // All games completed
  return { interval: 0, reason: 'all-completed', stats };
}

/**
 * Check if a game is in a critical moment (close score, final minutes, overtime)
 * @param {Object} event - Game event data
 * @param {string} sport - Sport type
 * @returns {boolean}
 */
function isCriticalMoment(event, sport) {
  const comp = event.competitions?.[0];
  if (!comp) return false;

  const status = event.status;
  const period = status?.period || 0;
  const clock = status?.displayClock || '';
  const clockSeconds = parseClockToSeconds(clock);

  // Get scores
  const home = comp.competitors?.find(c => c.homeAway === 'home');
  const away = comp.competitors?.find(c => c.homeAway === 'away');
  const homeScore = parseInt(home?.score || 0);
  const awayScore = parseInt(away?.score || 0);
  const scoreDiff = Math.abs(homeScore - awayScore);

  // Sport-specific critical moment detection
  switch (sport) {
    case 'nfl':
    case 'ncaa':
      // Football: 4th quarter with <5 min and close score, or overtime
      const isFootballCritical = (period >= 4 && clockSeconds <= 300 && scoreDiff <= 8) ||
                                  period > 4; // Overtime
      return isFootballCritical;

    case 'nba':
    case 'ncaab':
      // Basketball: 4th quarter/2nd half with <3 min and close score, or overtime
      const isBballCritical = (period >= 4 && clockSeconds <= 180 && scoreDiff <= 6) ||
                              period > 4; // Overtime
      return isBballCritical;

    case 'nhl':
      // Hockey: 3rd period with <5 min and close score, or overtime
      const isHockeyCritical = (period >= 3 && clockSeconds <= 300 && scoreDiff <= 1) ||
                                period > 3; // Overtime/Shootout
      return isHockeyCritical;

    case 'mlb':
      // Baseball: 9th inning or later with close score
      const isBaseballCritical = period >= 9 && scoreDiff <= 2;
      return isBaseballCritical;

    default:
      return false;
  }
}

/**
 * Parse clock string to seconds
 * @param {string} clock - Clock display string (e.g., "5:23", "0:45")
 * @returns {number} Total seconds
 */
function parseClockToSeconds(clock) {
  if (!clock) return 0;
  const parts = clock.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return parseInt(clock) || 0;
}

/**
 * Format interval for logging
 */
function formatInterval(ms) {
  if (ms >= 60000) return `${ms / 60000}min`;
  return `${ms / 1000}s`;
}

/**
 * Create adaptive polling function for a sport
 */
function createAdaptivePoller(sport, fetchFunction, getActiveKeys, getCacheKey) {
  const poller = adaptivePolling[sport];

  async function poll() {
    poller.running = true;

    let activeKeys = getActiveKeys();

    // For date-based sports (NBA, NHL, MLB, NCAAB), always ensure today/tomorrow are being checked
    // even if activeDates is empty to discover newly scheduled games
    if (activeKeys.size === 0 && ['nba', 'nhl', 'mlb', 'ncaab'].includes(sport)) {
      const today = getTodayDate();
      const tomorrow = getTomorrowDate();

      // Add to the persistent activeDates Set so they persist across polls
      const cache = sportsCache[sport];
      if (cache.activeDates) {
        cache.activeDates.add(today);
        cache.activeDates.add(tomorrow);
      }

      activeKeys = new Set([today, tomorrow]);
      console.log(`[${sport.toUpperCase()} Adaptive] No active dates, adding today/tomorrow: ${today}, ${tomorrow}`);
    }

    if (activeKeys.size === 0) {
      // No active data, schedule next check in 1 minute
      poller.running = false;
      poller.timeout = setTimeout(poll, 60000);
      return;
    }

    let hadSuccess = false;
    let hadFailure = false;
    let combinedAnalysis = { interval: POLL_INTERVALS.UPCOMING, reason: 'default', stats: {} };

    for (const key of activeKeys) {
      try {
        const data = await fetchFunction(key);

        // Analyze game states for this data
        const analysis = analyzeGameStates(data, sport);

        // Use the most urgent interval
        if (analysis.interval > 0 && analysis.interval < combinedAnalysis.interval) {
          combinedAnalysis = analysis;
        } else if (analysis.interval === 0 && combinedAnalysis.reason !== 'critical-moments' &&
                   combinedAnalysis.reason !== 'live-games') {
          // All completed for this key, but might have other active keys
        }

        const liveGames = data.events?.filter(e => e.status?.type?.state === 'in').length || 0;
        if (liveGames > 0) {
          console.log(`[${sport.toUpperCase()} Adaptive] ${key} - Live: ${liveGames}, Critical: ${analysis.stats.critical || 0}`);
          prefetchLiveGameStats(sport, data).catch(() => {});
        }
        hadSuccess = true;
      } catch (error) {
        console.error(`[${sport.toUpperCase()} Adaptive] Failed to update ${key}:`, error.message);
        hadFailure = true;
      }
    }

    recordCronRun(sport, hadSuccess && !hadFailure);

    // Determine next poll interval
    let nextInterval = combinedAnalysis.interval;
    if (nextInterval === 0) {
      // All games completed, check again in 5 minutes in case new games added
      nextInterval = POLL_INTERVALS.UPCOMING;
    }

    // Log interval changes
    if (poller.lastInterval !== nextInterval) {
      console.log(`[${sport.toUpperCase()} Adaptive] Interval changed: ${formatInterval(poller.lastInterval || 30000)} → ${formatInterval(nextInterval)} (${combinedAnalysis.reason})`);
      poller.lastInterval = nextInterval;
    }

    poller.running = false;
    poller.timeout = setTimeout(poll, nextInterval);
  }

  return poll;
}

// ============================================
// SPORT-SPECIFIC POLLING INITIALIZERS
// ============================================

// NFL Adaptive Polling
const pollNFL = createAdaptivePoller(
  'nfl',
  async (cacheKey) => {
    const isPostseason = cacheKey.startsWith('postseason-');
    const weekMatch = cacheKey.match(/week-(\d+)/);
    const weekNum = parseInt(weekMatch ? weekMatch[1] : '1');
    const seasonType = isPostseason ? 3 : 2;
    return await fetchNFLDataForCache(cacheKey, seasonType, weekNum);
  },
  () => sportsCache.nfl.activeWeeks,
  (key) => key
);

// NCAA Football Adaptive Polling
const pollNCAA = createAdaptivePoller(
  'ncaa',
  async (cacheKey) => {
    const isBowlSeason = cacheKey === 'bowl-season' || cacheKey.startsWith('bowl');
    const weekMatch = cacheKey.match(/week-(\d+)/);
    const weekNum = parseInt(weekMatch ? weekMatch[1] : '1');
    const seasonType = isBowlSeason ? 3 : 2;
    return await fetchNCAADataForCache(cacheKey, seasonType, weekNum);
  },
  () => sportsCache.ncaa.activeWeeks,
  (key) => key
);

// NBA Adaptive Polling
const pollNBA = createAdaptivePoller(
  'nba',
  async (date) => await fetchNBADataForCache(date),
  () => sportsCache.nba.activeDates,
  (date) => `date-${date}`
);

// NCAAB Adaptive Polling
const pollNCAAB = createAdaptivePoller(
  'ncaab',
  async (date) => await fetchNCAABDataForCache(date),
  () => sportsCache.ncaab.activeDates,
  (date) => `date-${date}`
);

// MLB Adaptive Polling
const pollMLB = createAdaptivePoller(
  'mlb',
  async (date) => await fetchMLBDataForCache(date),
  () => sportsCache.mlb.activeDates,
  (date) => `date-${date}`
);

// NHL Adaptive Polling
const pollNHL = createAdaptivePoller(
  'nhl',
  async (date) => await fetchNHLDataForCache(date),
  () => sportsCache.nhl.activeDates,
  (date) => `date-${date}`
);

// Start all pollers
function startAdaptivePolling() {
  console.log('');
  console.log('🔄 ====== ADAPTIVE POLLING SYSTEM INITIALIZED ======');
  console.log('📊 Polling intervals adjust based on game state:');
  console.log('   • Critical (close/final/OT): 15 seconds');
  console.log('   • Live games: 30 seconds');
  console.log('   • Starting soon (<1hr): 2 minutes');
  console.log('   • Upcoming (>1hr): 5 minutes');
  console.log('   • No games: Idle check every 10 minutes');
  console.log('🔄 ==================================================');
  console.log('');

  // Start each poller with slight offset to avoid thundering herd
  setTimeout(pollNFL, 1000);
  setTimeout(pollNCAA, 2000);
  setTimeout(pollNBA, 3000);
  setTimeout(pollNCAAB, 4000);
  setTimeout(pollMLB, 5000);
  setTimeout(pollNHL, 6000);
}

// Initialize adaptive polling
startAdaptivePolling();

// ============================================
// WATCHDOG TIMER - AUTO RECOVERY
// ============================================
// Monitors cron job health every minute and triggers manual refresh if stale

let watchdogEnabled = true;
let watchdogRecoveryAttempts = 0;
const MAX_WATCHDOG_RECOVERIES = 10; // Prevent infinite recovery loop

setInterval(async () => {
  if (!watchdogEnabled) return;

  const now = Date.now();
  const maxAge = 90000; // 90 seconds - cron runs every 30s, so 90s is concerning

  // Check each sport's cron health
  for (const [sport, monitor] of Object.entries(cronHealthMonitor)) {
    const cache = sportsCache[sport];
    const hasActiveData = (cache.activeWeeks?.size > 0) || (cache.activeDates?.size > 0);

    // Only check if this sport has active data to fetch
    if (!hasActiveData) continue;

    const age = monitor.lastSuccess ? now - monitor.lastSuccess : null;

    // If cron hasn't run successfully in 90+ seconds, trigger manual refresh
    if (!age || age > maxAge) {
      const ageStr = age ? Math.round(age / 1000) + 's' : 'never';
      console.warn(`⚠️ [Watchdog] ${sport.toUpperCase()} cron appears stale (last success: ${ageStr})`);

      if (watchdogRecoveryAttempts < MAX_WATCHDOG_RECOVERIES) {
        watchdogRecoveryAttempts++;
        console.log(`🔧 [Watchdog] Attempting recovery ${watchdogRecoveryAttempts}/${MAX_WATCHDOG_RECOVERIES} for ${sport.toUpperCase()}...`);

        try {
          // Trigger manual cache refresh
          if (sport === 'nfl' || sport === 'ncaa') {
            for (const cacheKey of cache.activeWeeks) {
              const isPostseason = cacheKey.startsWith('postseason-');
              const weekMatch = cacheKey.match(/week-(\d+)/);
              const weekNum = parseInt(weekMatch ? weekMatch[1] : '1');
              const seasonType = isPostseason ? 3 : 2;

              if (sport === 'nfl') {
                await fetchNFLDataForCache(cacheKey, seasonType, weekNum);
              } else {
                await fetchNCAADataForCache(cacheKey, seasonType, weekNum);
              }
              console.log(`✅ [Watchdog] Manually refreshed ${sport.toUpperCase()} ${cacheKey}`);
            }
          } else {
            // NBA, MLB, NHL, NCAAB use dates
            for (const date of cache.activeDates) {
              if (sport === 'nba') await fetchNBADataForCache(date);
              else if (sport === 'mlb') await fetchMLBDataForCache(date);
              else if (sport === 'nhl') await fetchNHLDataForCache(date);
              else if (sport === 'ncaab') await fetchNCAABDataForCache(date);

              console.log(`✅ [Watchdog] Manually refreshed ${sport.toUpperCase()} ${date}`);
            }
          }

          // Update monitor to reflect successful recovery
          recordCronRun(sport, true);
        } catch (error) {
          console.error(`❌ [Watchdog] Recovery failed for ${sport.toUpperCase()}:`, error.message);
        }
      } else {
        console.error(`❌ [Watchdog] Max recovery attempts reached. Manual intervention required.`);
        console.error(`Run 'watchdogRecoveryAttempts = 0' in Node REPL to reset.`);
      }
    }
  }

  // Reset recovery counter if all sports are healthy
  const health = getCronHealth();
  const allHealthy = Object.values(health).every(h => h.status === 'healthy' || !h.isActive);
  if (allHealthy && watchdogRecoveryAttempts > 0) {
    console.log(`✅ [Watchdog] All cron jobs healthy. Resetting recovery counter.`);
    watchdogRecoveryAttempts = 0;
  }
}, 60000); // Check every minute

console.log('✅ Watchdog timer initialized (60s interval)');

// ============================================
// AUTO-SAVE PLAYS FOR COMPLETED FOOTBALL GAMES
// ============================================

// Track recently completed games that we've already saved plays for
const savedPlayGames = new Set();

// Check for completed NFL/NCAA games and save plays every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    // Find recently completed NFL/NCAA games without play data
    const query = `
      SELECT id, sport FROM games
      WHERE status = 'completed'
        AND sport IN ('nfl', 'ncaa')
        AND (has_play_data IS NULL OR has_play_data = FALSE)
        AND game_date >= NOW() - INTERVAL '7 days'
      ORDER BY game_date DESC
      LIMIT 5
    `;

    const result = await pool.query(query);
    const gamesToSave = result.rows.filter(g => !savedPlayGames.has(g.id));

    if (gamesToSave.length === 0) return;

    console.log(`[Replay Auto-Save] Found ${gamesToSave.length} games to save plays for`);

    for (const game of gamesToSave) {
      try {
        const sportEndpoints = {
          'nfl': `${ESPN_BASE}/football/nfl/summary?event=${game.id}`,
          'ncaa': `${ESPN_BASE}/football/college-football/summary?event=${game.id}`
        };

        const summaryData = await fetchESPN(sportEndpoints[game.sport]);

        if (summaryData && summaryData.drives) {
          const boxscore = summaryData.boxscore;
          const competitors = boxscore?.teams || [];
          let awayAbbr = '';
          let homeAbbr = '';

          competitors.forEach(team => {
            if (team.homeAway === 'away') awayAbbr = team.team?.abbreviation || '';
            else if (team.homeAway === 'home') homeAbbr = team.team?.abbreviation || '';
          });

          const { drives, plays } = parseESPNDrivesToDB(summaryData, game.sport, awayAbbr, homeAbbr);
          const savedDrives = await saveDrives(game.id, game.sport, drives);

          const driveIdMap = new Map();
          savedDrives.forEach(d => driveIdMap.set(d.drive_sequence, d.id));

          const playCount = await savePlays(game.id, game.sport, plays, driveIdMap);
          await markGameHasPlays(game.id, playCount);

          savedPlayGames.add(game.id);
          console.log(`[Replay Auto-Save] Saved ${playCount} plays for ${game.sport} game ${game.id}`);
        }

        // Rate limit between API calls
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`[Replay Auto-Save] Failed to save game ${game.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[Replay Auto-Save] Error in cron job:', error.message);
  }
});

// ============================================
// GAME START NOTIFICATION SCHEDULER
// ============================================

// Track games we've already sent notifications for
const sentGameNotifications = new Set();

// Check for upcoming games and send notifications every minute
cron.schedule('* * * * *', async () => {
  if (!webPushConfigured && !fcmConfigured) return;

  try {
    // Get all users with active push subscriptions and their preferences
    const usersResult = await pool.query(`
      SELECT DISTINCT
        ps.user_id,
        np.game_start_alerts,
        np.minutes_before_game,
        np.notify_favorite_teams_only,
        np.notify_leagues,
        np.quiet_hours_start,
        np.quiet_hours_end
      FROM push_subscriptions ps
      LEFT JOIN notification_preferences np ON ps.user_id = np.user_id
      WHERE ps.is_active = TRUE
    `);

    if (usersResult.rows.length === 0) return;

    // Get upcoming games from all caches
    const upcomingGames = [];
    const now = Date.now();
    const maxMinutesBefore = 30; // Look for games starting within 30 minutes

    // Helper to extract games from cache
    const extractUpcomingGames = (cache, sport) => {
      for (const [key, cachedData] of cache.data.entries()) {
        if (!cachedData?.data?.events) continue;
        for (const event of cachedData.data.events) {
          const competition = event.competitions?.[0];
          if (!competition) continue;

          const gameTime = new Date(event.date || competition.date);
          const minutesUntilStart = (gameTime.getTime() - now) / (1000 * 60);

          // Check if game is starting soon (between 0 and maxMinutesBefore)
          if (minutesUntilStart > 0 && minutesUntilStart <= maxMinutesBefore) {
            const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
            const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');

            if (homeTeam && awayTeam) {
              upcomingGames.push({
                gameId: event.id,
                sport: sport.toUpperCase(),
                league: sport.toUpperCase(),
                homeTeam: {
                  id: homeTeam.team?.id,
                  name: homeTeam.team?.displayName,
                  abbreviation: homeTeam.team?.abbreviation,
                  logo: homeTeam.team?.logo
                },
                awayTeam: {
                  id: awayTeam.team?.id,
                  name: awayTeam.team?.displayName,
                  abbreviation: awayTeam.team?.abbreviation,
                  logo: awayTeam.team?.logo
                },
                gameTime,
                minutesUntilStart: Math.round(minutesUntilStart),
                shortName: event.shortName || `${awayTeam.team?.abbreviation} @ ${homeTeam.team?.abbreviation}`
              });
            }
          }
        }
      }
    };

    // Extract from all sport caches
    extractUpcomingGames(sportsCache.nfl, 'NFL');
    extractUpcomingGames(sportsCache.nba, 'NBA');
    extractUpcomingGames(sportsCache.mlb, 'MLB');
    extractUpcomingGames(sportsCache.nhl, 'NHL');
    extractUpcomingGames(sportsCache.ncaa, 'NCAAF');
    extractUpcomingGames(sportsCache.ncaab, 'NCAAB');

    if (upcomingGames.length === 0) return;

    console.log(`[Push] Found ${upcomingGames.length} games starting within 30 min:`,
      upcomingGames.map(g => `${g.shortName} (${g.league}) in ${g.minutesUntilStart}m`).join(', '));

    // Process each user
    for (const user of usersResult.rows) {
      // Skip if user disabled game start alerts
      if (user.game_start_alerts === false) continue;

      const minutesBefore = user.minutes_before_game || 15;
      const notifyLeagues = user.notify_leagues || ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];

      // Check quiet hours
      if (user.quiet_hours_start && user.quiet_hours_end) {
        const currentTime = new Date();
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        const currentTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        if (currentTimeStr >= user.quiet_hours_start || currentTimeStr < user.quiet_hours_end) {
          continue; // Skip during quiet hours
        }
      }

      // Get user's favorite teams if needed
      let favoriteTeamIds = [];
      if (user.notify_favorite_teams_only !== false) {
        const favResult = await pool.query(
          'SELECT team_id, team_abbreviation FROM favorite_teams WHERE user_id = $1',
          [user.user_id]
        );
        // Include BOTH team_id and team_abbreviation for flexible matching
        favoriteTeamIds = favResult.rows.flatMap(r => {
          const ids = [];
          if (r.team_id) ids.push(r.team_id);
          if (r.team_abbreviation) ids.push(r.team_abbreviation);
          return ids;
        });
        if (favoriteTeamIds.length > 0) {
          console.log(`[Push] User ${user.user_id} favorite teams (IDs + abbrevs): ${favoriteTeamIds.join(', ')}`);
        }
      }

      // Get user's push subscriptions (both web push and FCM)
      const subsResult = await pool.query(
        'SELECT subscription_type, endpoint, p256dh_key, auth_key, fcm_token FROM push_subscriptions WHERE user_id = $1 AND is_active = TRUE',
        [user.user_id]
      );

      if (subsResult.rows.length === 0) continue;

      // Find games to notify about
      for (const game of upcomingGames) {
        // Check if we should notify for this league
        if (!notifyLeagues.includes(game.league)) continue;

        // Check if game is within user's notification window
        if (game.minutesUntilStart > minutesBefore) continue;

        // Check if this is a favorite team game (if required)
        if (user.notify_favorite_teams_only !== false && favoriteTeamIds.length > 0) {
          // Check multiple ID formats for home team:
          // 1. Direct ESPN ID (e.g., "10")
          // 2. Prefixed format (e.g., "MLB-10")
          // 3. Team abbreviation (e.g., "NYY")
          const homeTeamMatch = favoriteTeamIds.includes(game.homeTeam.id) ||
            favoriteTeamIds.includes(`${game.league}-${game.homeTeam.id}`) ||
            favoriteTeamIds.includes(game.homeTeam.abbreviation);

          const awayTeamMatch = favoriteTeamIds.includes(game.awayTeam.id) ||
            favoriteTeamIds.includes(`${game.league}-${game.awayTeam.id}`) ||
            favoriteTeamIds.includes(game.awayTeam.abbreviation);

          if (!homeTeamMatch && !awayTeamMatch) {
            console.log(`[Push] User ${user.user_id}: ${game.shortName} not a favorite team match. Home: ${game.homeTeam.id}/${game.homeTeam.abbreviation}, Away: ${game.awayTeam.id}/${game.awayTeam.abbreviation}. Favorites: ${favoriteTeamIds.join(', ')}`);
            continue;
          } else {
            console.log(`[Push] User ${user.user_id}: ${game.shortName} IS a favorite! Match found.`);
          }
        }

        // Create unique key for this user/game combo
        const notificationKey = `${user.user_id}-${game.gameId}`;
        if (sentGameNotifications.has(notificationKey)) {
          console.log(`[Push] User ${user.user_id}: Already sent notification for ${game.shortName}`);
          continue;
        }

        // Mark as sent
        sentGameNotifications.add(notificationKey);
        console.log(`[Push] User ${user.user_id}: Sending notification for ${game.shortName} (${game.minutesUntilStart}m before)`);

        // Create notification title and body
        const notificationTitle = `${game.league}: ${game.shortName}`;
        const notificationBody = `Game starts in ${game.minutesUntilStart} minutes!`;

        // Create web push payload with team logos for rich notification
        const webPushPayload = JSON.stringify({
          type: 'game_start',
          title: notificationTitle,
          body: notificationBody,
          icon: game.awayTeam.logo || game.homeTeam.logo || '/assets/icon-192.png',
          badge: '/assets/icon-192.png',
          // image shows a wider banner - use home team logo for visual impact
          image: game.homeTeam.logo || null,
          tag: `game-${game.gameId}`,
          gameId: game.gameId,
          league: game.league,
          url: `/${game.league.toLowerCase()}.html`,
          homeTeam: game.homeTeam.abbreviation,
          awayTeam: game.awayTeam.abbreviation,
          homeLogo: game.homeTeam.logo || null,
          awayLogo: game.awayTeam.logo || null
        });

        // Send to all user's devices (both web push and FCM)
        for (const sub of subsResult.rows) {
          try {
            if (sub.subscription_type === 'fcm' && sub.fcm_token && fcmConfigured) {
              // Send via Firebase Cloud Messaging
              const admin = require('firebase-admin');
              const fcmMessage = {
                token: sub.fcm_token,
                notification: {
                  title: notificationTitle,
                  body: notificationBody
                },
                data: {
                  gameId: game.gameId,
                  league: game.league,
                  url: `/${game.league.toLowerCase()}.html`,
                  homeTeam: game.homeTeam.abbreviation,
                  awayTeam: game.awayTeam.abbreviation
                },
                android: {
                  priority: 'high',
                  notification: {
                    channelId: 'gridtv_game_alerts',
                    icon: 'ic_notification',
                    color: '#FF6B00'
                  }
                }
              };

              await admin.messaging().send(fcmMessage);

              // Log the notification
              await pool.query(`
                INSERT INTO notification_log (user_id, game_id, notification_type, title, body, delivered)
                VALUES ($1, $2, 'game_start_fcm', $3, $4, TRUE)
              `, [user.user_id, game.gameId, notificationTitle, notificationBody]);

              console.log(`[FCM] Sent game start notification to user ${user.user_id} for ${game.shortName}`);

            } else if (sub.subscription_type === 'web' || (!sub.subscription_type && sub.endpoint)) {
              // Send via Web Push
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh_key,
                  auth: sub.auth_key
                }
              };

              await webpush.sendNotification(pushSubscription, webPushPayload);

              // Log the notification
              await pool.query(`
                INSERT INTO notification_log (user_id, game_id, notification_type, title, body, delivered)
                VALUES ($1, $2, 'game_start', $3, $4, TRUE)
              `, [user.user_id, game.gameId, notificationTitle, notificationBody]);

              console.log(`[Push] Sent game start notification to user ${user.user_id} for ${game.shortName}`);
            }
          } catch (error) {
            console.error(`[Push/FCM] Failed to send notification:`, error.message);
            if (error.statusCode === 410 || error.statusCode === 404) {
              // Web Push subscription expired
              await pool.query(
                'UPDATE push_subscriptions SET is_active = FALSE WHERE endpoint = $1',
                [sub.endpoint]
              );
            } else if (error.code === 'messaging/registration-token-not-registered' ||
                       error.code === 'messaging/invalid-registration-token') {
              // FCM token invalid
              await pool.query(
                'UPDATE push_subscriptions SET is_active = FALSE WHERE fcm_token = $1',
                [sub.fcm_token]
              );
            }
          }
        }
      }
    }

    // Cleanup old notification keys (keep only last hour)
    const oneHourAgo = now - (60 * 60 * 1000);
    for (const key of sentGameNotifications) {
      const gameId = key.split('-').slice(1).join('-');
      // Simple cleanup - remove entries older than 1 hour based on set size
      if (sentGameNotifications.size > 10000) {
        sentGameNotifications.clear();
      }
    }

  } catch (error) {
    console.error('[Push] Error in game notification scheduler:', error);
  }
});

// ============================================
// LIVE SCORE UPDATE NOTIFICATIONS
// ============================================

// Track last sent score per game to avoid duplicate notifications
// Key: `${userId}-${gameId}`, Value: `${homeScore}-${awayScore}`
const sentScoreStates = new Map();

// Check for score changes in live games every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  if (!webPushConfigured && !fcmConfigured) return;

  try {
    // Get users who have score_update_alerts enabled
    const usersResult = await pool.query(`
      SELECT DISTINCT
        ps.user_id,
        np.score_update_alerts,
        np.notify_leagues,
        np.quiet_hours_start,
        np.quiet_hours_end
      FROM push_subscriptions ps
      LEFT JOIN notification_preferences np ON ps.user_id = np.user_id
      WHERE ps.is_active = TRUE
        AND np.score_update_alerts = TRUE
    `);

    if (usersResult.rows.length === 0) return;

    // Collect all live (in-progress) games from caches
    const liveGames = [];

    const extractLiveGames = (cache, sport) => {
      for (const [key, cachedData] of cache.data.entries()) {
        if (!cachedData?.data?.events) continue;
        for (const event of cachedData.data.events) {
          const competition = event.competitions?.[0];
          if (!competition) continue;

          // Only include live/in-progress games
          // Accepts both ESPN status names and Statsapi-normalized state ('in')
          const statusName = competition.status?.type?.name || event.status?.type?.name;
          const statusState = competition.status?.type?.state || event.status?.type?.state;
          const isLive = statusState === 'in' ||
                         statusName === 'STATUS_IN_PROGRESS' ||
                         statusName === 'STATUS_HALFTIME' ||
                         statusName === 'STATUS_END_PERIOD';
          if (!isLive) continue;

          const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
          const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');
          if (!homeTeam || !awayTeam) continue;

          const homeScore = homeTeam.score || '0';
          const awayScore = awayTeam.score || '0';
          const period = competition.status?.period || event.status?.period;
          const clock = competition.status?.displayClock || event.status?.displayClock || '';

          liveGames.push({
            gameId: event.id,
            sport: sport.toUpperCase(),
            league: sport.toUpperCase(),
            homeTeam: {
              id: homeTeam.team?.id,
              name: homeTeam.team?.displayName,
              abbreviation: homeTeam.team?.abbreviation,
              logo: homeTeam.team?.logo
            },
            awayTeam: {
              id: awayTeam.team?.id,
              name: awayTeam.team?.displayName,
              abbreviation: awayTeam.team?.abbreviation,
              logo: awayTeam.team?.logo
            },
            homeScore,
            awayScore,
            period,
            clock,
            shortName: event.shortName || `${awayTeam.team?.abbreviation} @ ${homeTeam.team?.abbreviation}`
          });
        }
      }
    };

    extractLiveGames(sportsCache.nfl, 'NFL');
    extractLiveGames(sportsCache.nba, 'NBA');
    extractLiveGames(sportsCache.mlb, 'MLB');
    extractLiveGames(sportsCache.nhl, 'NHL');
    extractLiveGames(sportsCache.ncaa, 'NCAAF');
    extractLiveGames(sportsCache.ncaab, 'NCAAB');

    if (liveGames.length === 0) return;

    // Process each user
    for (const user of usersResult.rows) {
      const notifyLeagues = user.notify_leagues || ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];

      // Check quiet hours
      if (user.quiet_hours_start && user.quiet_hours_end) {
        const currentTime = new Date();
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        const currentTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        if (currentTimeStr >= user.quiet_hours_start || currentTimeStr < user.quiet_hours_end) {
          continue;
        }
      }

      // Get user's favorite teams
      const favResult = await pool.query(
        'SELECT team_id, team_abbreviation FROM favorite_teams WHERE user_id = $1',
        [user.user_id]
      );
      const favoriteTeamIds = favResult.rows.flatMap(r => {
        const ids = [];
        if (r.team_id) ids.push(r.team_id);
        if (r.team_abbreviation) ids.push(r.team_abbreviation);
        return ids;
      });

      if (favoriteTeamIds.length === 0) continue;

      // Get user's push subscriptions
      const subsResult = await pool.query(
        'SELECT subscription_type, endpoint, p256dh_key, auth_key, fcm_token FROM push_subscriptions WHERE user_id = $1 AND is_active = TRUE',
        [user.user_id]
      );
      if (subsResult.rows.length === 0) continue;

      for (const game of liveGames) {
        if (!notifyLeagues.includes(game.league)) continue;

        // Only notify for favorite teams
        const homeMatch = favoriteTeamIds.includes(game.homeTeam.id) ||
          favoriteTeamIds.includes(`${game.league}-${game.homeTeam.id}`) ||
          favoriteTeamIds.includes(game.homeTeam.abbreviation);
        const awayMatch = favoriteTeamIds.includes(game.awayTeam.id) ||
          favoriteTeamIds.includes(`${game.league}-${game.awayTeam.id}`) ||
          favoriteTeamIds.includes(game.awayTeam.abbreviation);

        if (!homeMatch && !awayMatch) continue;

        // Check if score has changed since last notification
        const stateKey = `${user.user_id}-${game.gameId}`;
        const currentState = `${game.homeScore}-${game.awayScore}`;
        const lastState = sentScoreStates.get(stateKey);

        if (lastState === currentState) continue; // No change

        sentScoreStates.set(stateKey, currentState);

        // Don't notify on first check (no previous state to compare)
        if (!lastState) continue;

        // Build notification
        const clockStr = game.clock ? ` • ${game.clock}` : '';
        const periodStr = game.period ? ` Q${game.period}` : '';
        const notificationTitle = `${game.awayTeam.abbreviation} ${game.awayScore} — ${game.homeTeam.abbreviation} ${game.homeScore}`;
        const notificationBody = `${game.league}${periodStr}${clockStr}`;

        const webPushPayload = JSON.stringify({
          type: 'score_update',
          title: notificationTitle,
          body: notificationBody,
          icon: game.awayTeam.logo || game.homeTeam.logo || '/assets/icon-192.png',
          badge: '/assets/icon-192.png',
          tag: `score-${game.gameId}`,
          gameId: game.gameId,
          league: game.league,
          url: `/${game.league.toLowerCase()}.html`,
          homeTeam: game.homeTeam.abbreviation,
          awayTeam: game.awayTeam.abbreviation,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          homeLogo: game.homeTeam.logo || null,
          awayLogo: game.awayTeam.logo || null,
          period: game.period,
          clock: game.clock
        });

        for (const sub of subsResult.rows) {
          try {
            if (sub.subscription_type === 'fcm' && sub.fcm_token && fcmConfigured) {
              const admin = require('firebase-admin');
              await admin.messaging().send({
                token: sub.fcm_token,
                notification: { title: notificationTitle, body: notificationBody },
                data: {
                  type: 'score_update',
                  gameId: game.gameId,
                  league: game.league,
                  url: `/${game.league.toLowerCase()}.html`,
                  homeTeam: game.homeTeam.abbreviation,
                  awayTeam: game.awayTeam.abbreviation,
                  homeScore: String(game.homeScore),
                  awayScore: String(game.awayScore)
                },
                android: {
                  priority: 'normal',
                  notification: { channelId: 'gridtv_score_updates', icon: 'ic_notification', color: '#FF6B00' }
                }
              });
            } else if (sub.subscription_type === 'web' || (!sub.subscription_type && sub.endpoint)) {
              const pushSubscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } };
              await webpush.sendNotification(pushSubscription, webPushPayload);
            }
          } catch (error) {
            console.error(`[ScoreUpdate] Failed to send notification:`, error.message);
            if (error.statusCode === 410 || error.statusCode === 404) {
              await pool.query('UPDATE push_subscriptions SET is_active = FALSE WHERE endpoint = $1', [sub.endpoint]);
            } else if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token') {
              await pool.query('UPDATE push_subscriptions SET is_active = FALSE WHERE fcm_token = $1', [sub.fcm_token]);
            }
          }
        }
      }
    }

    // Cleanup stale score states for finished games
    if (sentScoreStates.size > 5000) {
      sentScoreStates.clear();
    }

  } catch (error) {
    console.error('[ScoreUpdate] Error in score update scheduler:', error);
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

// Cache Status Endpoint - shows cache health and stats
app.get('/api/health/cache', (req, res) => {
  const now = Date.now();
  const uptime = now - cacheStats.startTime;

  // Calculate cache ages for each sport
  const getCacheAges = (cache, keyPrefix = 'date-') => {
    const ages = {};
    for (const [key, data] of cache.data.entries()) {
      const age = now - data.timestamp;
      ages[key] = {
        ageSeconds: Math.round(age / 1000),
        isComplete: data.isComplete,
        gameCount: data.data?.events?.length || 0,
        liveGames: data.data?.events?.filter(e => e.status?.type?.state === 'in').length || 0
      };
    }
    return ages;
  };

  res.json({
    status: sportsCache.initialized ? 'ready' : 'initializing',
    architecture: {
      description: 'Background polling feeds cache, clients read from cache only',
      pollInterval: '30 seconds',
      clientsNeverCallESPN: true
    },
    stats: {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: cacheStats.hits + cacheStats.misses > 0
        ? `${((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2)}%`
        : 'N/A',
      backgroundUpdates: cacheStats.backgroundUpdates,
      lastBackgroundUpdate: cacheStats.lastBackgroundUpdate
        ? new Date(cacheStats.lastBackgroundUpdate).toISOString()
        : null,
      uptimeSeconds: Math.round(uptime / 1000)
    },
    caches: {
      nfl: {
        activeWeeks: Array.from(sportsCache.nfl.activeWeeks),
        entries: getCacheAges(sportsCache.nfl)
      },
      nba: {
        activeDates: Array.from(sportsCache.nba.activeDates),
        entries: getCacheAges(sportsCache.nba)
      },
      nhl: {
        activeDates: Array.from(sportsCache.nhl.activeDates),
        entries: getCacheAges(sportsCache.nhl)
      },
      mlb: {
        activeDates: Array.from(sportsCache.mlb.activeDates),
        entries: getCacheAges(sportsCache.mlb)
      },
      ncaab: {
        activeDates: Array.from(sportsCache.ncaab.activeDates),
        entries: getCacheAges(sportsCache.ncaab)
      },
      ncaa: {
        activeWeeks: Array.from(sportsCache.ncaa.activeWeeks),
        entries: getCacheAges(sportsCache.ncaa)
      }
    }
  });
});

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

    // Check cron job health
    const cronHealth = getCronHealth();
    const activeCronJobs = Object.entries(cronHealth).filter(([_, data]) => data.isActive);
    const staleCronJobs = activeCronJobs.filter(([_, data]) => data.status === 'stale');
    const cronHealthy = staleCronJobs.length === 0;

    const overallStatus =
      dbHealthy && espnSuccessRate > 95 && cronHealthy ? 'healthy' :
        dbHealthy && espnSuccessRate > 80 ? 'degraded' : 'unhealthy';

    res.json({
      status: overallStatus,
      timestamp: new Date(),
      components: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        espnAPI: espnSuccessRate > 95 ? 'healthy' : espnSuccessRate > 80 ? 'degraded' : 'unhealthy',
        cache: 'healthy',
        cronJobs: cronHealthy ? 'healthy' : 'stale'
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
        ].filter(Boolean),
        cronJobs: cronHealth,
        watchdog: {
          enabled: watchdogEnabled,
          recoveryAttempts: watchdogRecoveryAttempts,
          maxRecoveries: MAX_WATCHDOG_RECOVERIES
        }
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
// TV QR CODE AUTHENTICATION API
// ============================================

// Rate limiter for TV auth (10 requests per minute per IP)
const tvAuthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ? req.ip.replace(/:\d+$/, '') : req.ip,
  validate: false
});

// Clean up expired TV auth tokens every 5 minutes
setInterval(async () => {
  try {
    const result = await pool.query(
      "UPDATE tv_auth_tokens SET status = 'expired' WHERE status = 'pending' AND expires_at < NOW()"
    );
    if (result.rowCount > 0) {
      console.log(`🧹 Cleaned up ${result.rowCount} expired TV auth tokens`);
    }
  } catch (error) {
    console.error('TV auth token cleanup error:', error);
  }
}, 5 * 60 * 1000);

// Generate QR token (TV calls this to get a new QR code)
app.post('/api/tv/generate-qr-token', tvAuthLimiter, async (req, res) => {
  try {
    const { deviceId, deviceName } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Generate secure token (32 bytes = 64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate ALL existing tokens for this device (pending AND approved)
    // This forces a fresh authentication flow
    await pool.query(
      "UPDATE tv_auth_tokens SET status = 'expired' WHERE device_id = $1 AND status IN ('pending', 'approved')",
      [deviceId]
    );

    // Also deactivate any existing sessions for this device
    // This ensures the new QR flow creates a completely fresh session
    await pool.query(
      "UPDATE tv_sessions SET is_active = FALSE WHERE device_id = $1",
      [deviceId]
    );

    // Insert new token
    await pool.query(
      `INSERT INTO tv_auth_tokens (token, device_id, device_name, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [token, deviceId, deviceName || 'TV Receiver', expiresAt]
    );

    // Build QR code URL - auto-detect from request
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.get('host');
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;
    const authUrl = `${appUrl}/tv-auth?token=${token}`;

    console.log(`📺 QR token generated for device: ${deviceId.substring(0, 8)}...`);

    res.json({
      success: true,
      token,
      authUrl,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Generate QR token error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to generate authentication token', details: error.message });
  }
});

// Verify QR token (Mobile authorization page calls this)
app.get('/api/tv/verify-token', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const result = await pool.query(
      `SELECT id, device_id, device_name, status, expires_at
       FROM tv_auth_tokens
       WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }

    const tokenData = result.rows[0];

    if (tokenData.status !== 'pending') {
      return res.status(400).json({ error: 'Token has already been used or expired' });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    res.json({
      valid: true,
      deviceId: tokenData.device_id,
      deviceName: tokenData.device_name,
      expiresAt: tokenData.expires_at
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Approve TV (Mobile authorization page calls this after user logs in)
app.post('/api/tv/approve', requireAuth, async (req, res) => {
  const { token } = req.body;
  const userId = req.session.userId;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    // Get and validate token
    const tokenResult = await pool.query(
      `SELECT id, device_id, device_name, status, expires_at, socket_id
       FROM tv_auth_tokens
       WHERE token = $1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    const tokenData = tokenResult.rows[0];

    if (tokenData.status !== 'pending') {
      return res.status(400).json({ error: 'Token has already been used' });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    // Generate long-lived session token for TV
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Update auth token to approved
    await pool.query(
      `UPDATE tv_auth_tokens
       SET status = 'approved', user_id = $1, approved_at = NOW()
       WHERE id = $2`,
      [userId, tokenData.id]
    );

    // Create or update TV session - MUST set is_active = TRUE for new sessions
    await pool.query(
      `INSERT INTO tv_sessions (device_id, user_id, device_name, session_token, is_active, created_at, last_seen_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
       ON CONFLICT (device_id)
       DO UPDATE SET user_id = $2, session_token = $4, is_active = TRUE, last_seen_at = NOW()`,
      [tokenData.device_id, userId, tokenData.device_name, sessionToken]
    );

    // Get user info for TV
    const userResult = await pool.query(
      'SELECT email, display_name FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    console.log(`📺 TV approved for user ${userId}, device: ${tokenData.device_id.substring(0, 8)}...`);

    // Notify TV via Socket.IO if connected (io is defined later, but available via closure)
    if (tokenData.socket_id && global.io) {
      global.io.to(tokenData.socket_id).emit('tv:auth-approved', {
        sessionToken,
        userId,
        userEmail: user?.email,
        displayName: user?.display_name
      });
    }

    res.json({
      success: true,
      message: 'TV has been authorized',
      deviceName: tokenData.device_name
    });
  } catch (error) {
    console.error('Approve TV error:', error);
    res.status(500).json({ error: 'Failed to approve TV' });
  }
});

// Validate TV session (TV calls this on startup to check stored session)
app.post('/api/tv/validate-session', async (req, res) => {
  const { deviceId, sessionToken } = req.body;

  // Session token is required, device ID is optional for backwards compatibility
  if (!sessionToken) {
    return res.status(400).json({ error: 'Session token required' });
  }

  try {
    // First try with device_id if provided (stricter validation)
    let result;
    if (deviceId) {
      result = await pool.query(
        `SELECT ts.id, ts.user_id, ts.device_name, ts.is_active,
                u.email, u.display_name, u.subscription_status
         FROM tv_sessions ts
         JOIN users u ON ts.user_id = u.id
         WHERE ts.device_id = $1 AND ts.session_token = $2 AND ts.is_active = TRUE`,
        [deviceId, sessionToken]
      );
    }

    // If no device_id or device_id match failed, try with just session_token
    // This ensures consistency with the auth middleware that only checks session_token
    if (!result || result.rows.length === 0) {
      result = await pool.query(
        `SELECT ts.id, ts.user_id, ts.device_name, ts.is_active,
                u.email, u.display_name, u.subscription_status
         FROM tv_sessions ts
         JOIN users u ON ts.user_id = u.id
         WHERE ts.session_token = $1 AND ts.is_active = TRUE`,
        [sessionToken]
      );
    }

    if (result.rows.length === 0) {
      console.log(`📺 validate-session: FAILED for token ${sessionToken.substring(0, 8)}...`);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const session = result.rows[0];
    console.log(`📺 validate-session: SUCCESS for user ${session.user_id}, token ${sessionToken.substring(0, 8)}...`);

    // Update last seen
    await pool.query(
      'UPDATE tv_sessions SET last_seen_at = NOW() WHERE id = $1',
      [session.id]
    );

    res.json({
      valid: true,
      userId: session.user_id,
      userEmail: session.email,
      displayName: session.display_name,
      subscriptionStatus: session.subscription_status
    });
  } catch (error) {
    console.error('Validate session error:', error);
    res.status(500).json({ error: 'Failed to validate session' });
  }
});

// Sign out TV (TV calls this to clear its session)
app.post('/api/tv/sign-out', async (req, res) => {
  const { deviceId, sessionToken } = req.body;

  if (!deviceId || !sessionToken) {
    return res.status(400).json({ error: 'Device ID and session token required' });
  }

  try {
    await pool.query(
      'UPDATE tv_sessions SET is_active = FALSE WHERE device_id = $1 AND session_token = $2',
      [deviceId, sessionToken]
    );

    console.log(`📺 TV signed out: ${deviceId.substring(0, 8)}...`);

    res.json({ success: true, message: 'Signed out successfully' });
  } catch (error) {
    console.error('TV sign out error:', error);
    res.status(500).json({ error: 'Failed to sign out' });
  }
});

// TV Login with email/password (for remote-based login on TV)
app.post('/api/tv/login', tvAuthLimiter, async (req, res) => {
  const { email, password, deviceId } = req.body;

  if (!email || !password || !deviceId) {
    return res.status(400).json({ success: false, message: 'Email, password, and device ID required' });
  }

  try {
    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email, display_name, password_hash, subscription_status FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // Verify password
    const bcrypt = require('bcryptjs');
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Create or update session for this device (upsert pattern)
    const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    await pool.query(
      `INSERT INTO tv_sessions (user_id, device_id, device_name, session_token, is_active, created_at, last_seen_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
       ON CONFLICT (device_id)
       DO UPDATE SET user_id = $1, session_token = $4, is_active = TRUE, last_seen_at = NOW()`,
      [user.id, deviceId, 'GridTV Android TV', sessionToken]
    );

    console.log(`📺 TV login successful for: ${user.email}`);

    res.json({
      success: true,
      sessionToken,
      userEmail: user.email,
      displayName: user.display_name,
      subscriptionStatus: user.subscription_status
    });
  } catch (error) {
    console.error('TV login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// ============================================
// SERVE STATIC PAGES (Clean URLs)
// ============================================

// Serve TV Auth page (mobile authorization page)
app.get('/tv-auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tv-auth.html'));
});

// Serve TV Receiver page without .html extension (NO AUTH REQUIRED for TVs)
app.get('/tv-receiver', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tv-receiver.html'));
});

// Serve TV Home page without .html extension (NO AUTH REQUIRED for TVs)
app.get('/tv-home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tv-home.html'));
});

// Serve TV Sports Bar page without .html extension (NO AUTH REQUIRED for TVs)
app.get('/tv-sports-bar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tv-sports-bar.html'));
});

// Serve Privacy Policy page (NO AUTH REQUIRED - needed for app store listings)
app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

// Serve Delete Account page (NO AUTH REQUIRED - needed for app store listings)
app.get('/delete-account', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'delete-account.html'));
});

// API endpoint for account deletion requests
app.post('/api/account/delete-request', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Log the deletion request
    console.log(`📧 Account deletion request received for: ${email}`);

    // Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (userResult.rows.length > 0) {
      console.log(`✅ User found. Account deletion scheduled for: ${email}`);
      // TODO: Implement actual deletion logic (mark for deletion, send email, etc.)
    }

    // Always return success to prevent email enumeration
    res.json({ success: true, message: 'Deletion request received' });
  } catch (error) {
    console.error('Error processing deletion request:', error);
    res.json({ success: true, message: 'Deletion request received' });
  }
});

// Serve public folder for all other static files
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root to landing page
app.get('/', (req, res) => {
  res.redirect('/landing');
});

// Serve index.html for /home (authenticated app)
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve Desktop-tv-sports-bar.html (without .html extension)
app.get('/Desktop-tv-sports-bar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Desktop-tv-sports-bar.html'));
});

// Serve Phone-sports-bar.html (without .html extension)
app.get('/Phone-sports-bar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Phone-sports-bar.html'));
});

// ============================================
// START SERVER
// ============================================

const httpServer = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ GridTV Sports Multi-Sport Server running on port ${PORT} (bound to 0.0.0.0)`);
  console.log(`🏈 NFL API: http://localhost:${PORT}/api/nfl/scoreboard`);
  console.log(`🏈 NCAA API: http://localhost:${PORT}/api/ncaa/scoreboard`);
  console.log(`🏀 NBA API: http://localhost:${PORT}/api/nba/scoreboard`);
  console.log(`⚾ MLB API: http://localhost:${PORT}/api/mlb/scoreboard`);
  console.log(`🏒 NHL API: http://localhost:${PORT}/api/nhl/scoreboard`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`📺 TV Receiver: http://localhost:${PORT}/tv-receiver.html`);

  // Clean up any stale dates from cache
  cleanupActiveDates();

  // Initialize cache with current data on server startup
  // This ensures clients get data immediately without waiting for background jobs
  console.log('🔄 Initializing server cache...');
  await initializeCache();
  console.log('✅ Server cache initialized - clients will now receive cached data');

  // Display health monitoring status
  console.log('');
  console.log('🏥 ====== HEALTH MONITORING ACTIVE ======');
  console.log('📊 Cron heartbeat tracking: ENABLED');
  console.log('🔧 Auto-recovery watchdog: ENABLED (60s checks)');
  console.log('🌐 Health endpoints:');
  console.log(`   • /api/health - Overall system health`);
  console.log(`   • /api/health/cache - Cache status`);
  console.log(`   • /api/health/espn - ESPN API metrics`);
  console.log('🏥 ========================================');
  console.log('');
  console.log('🎉 GridTV Sports server is fully operational!');
  console.log('');
});

// ============================================
// SOCKET.IO SETUP FOR CASTING
// ============================================

const { Server } = require('socket.io');
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGIN : true,
    credentials: true
  }
});

// Make io globally available for TV auth notifications
global.io = io;

// In-memory casting session store
const castingSessions = new Map();

// Generate 6-digit PIN
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Session cleanup - remove expired sessions every minute
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of castingSessions.entries()) {
    if (session.expiresAt < now) {
      console.log(`🧹 Cleaning up expired casting session: ${sessionId}`);
      castingSessions.delete(sessionId);
      // Notify connected clients
      io.to(sessionId).emit('cast:session-expired');
    }
  }
}, 60000);

// Socket.IO authentication middleware - REMOVED
// TV Receivers need to connect without authentication
// Controllers are authenticated when they join a session (userId check in 'cast:join-session')


// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`🔌 WebSocket connected: ${socket.id}`);

  // ============================================
  // GAME UPDATE SUBSCRIPTIONS
  // ============================================

  // Subscribe to game updates for specific sports
  socket.on('games:subscribe', (data, callback) => {
    try {
      const { sports } = data; // Array of sport names: ['nfl', 'nba', ...]

      if (!Array.isArray(sports) || sports.length === 0) {
        return callback?.({ success: false, error: 'Invalid sports array' });
      }

      const validSports = ['nfl', 'ncaa', 'nba', 'ncaab', 'mlb', 'nhl'];
      const joinedRooms = [];

      sports.forEach(sport => {
        if (validSports.includes(sport)) {
          const roomName = `games:${sport}`;
          socket.join(roomName);
          joinedRooms.push(roomName);
        }
      });

      console.log(`[Socket.io] Client ${socket.id} subscribed to: ${joinedRooms.join(', ')}`);
      callback?.({ success: true, rooms: joinedRooms });
    } catch (error) {
      console.error('[Socket.io] Subscribe error:', error);
      callback?.({ success: false, error: error.message });
    }
  });

  // Unsubscribe from game updates
  socket.on('games:unsubscribe', (data, callback) => {
    try {
      const { sports } = data;

      if (!Array.isArray(sports)) {
        return callback?.({ success: false, error: 'Invalid sports array' });
      }

      sports.forEach(sport => {
        const roomName = `games:${sport}`;
        socket.leave(roomName);
      });

      console.log(`[Socket.io] Client ${socket.id} unsubscribed from: ${sports.join(', ')}`);
      callback?.({ success: true });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  // Request immediate data for subscribed sports (on reconnect)
  socket.on('games:request-current', (data, callback) => {
    try {
      const { sports } = data;
      const results = {};

      sports.forEach(sport => {
        const cache = sportsCache[sport];
        if (cache && cache.data) {
          results[sport] = {};
          for (const [key, value] of cache.data.entries()) {
            results[sport][key] = value.data;
          }
        }
      });

      callback?.({ success: true, data: results });
    } catch (error) {
      callback?.({ success: false, error: error.message });
    }
  });

  // ============================================
  // TV CASTING
  // ============================================

  // TV Receiver creates a session and displays PIN (NO LOGIN REQUIRED)
  // The TV just displays a PIN and waits for an authenticated controller to connect
  socket.on('cast:create-session', (data, callback) => {
    try {
      const { deviceName } = data;
      const sessionId = crypto.randomBytes(16).toString('hex');
      const pin = generatePIN();

      const session = {
        sessionId,
        pin,
        userId: null,  // Will be set when controller joins
        deviceName: deviceName || 'TV Receiver',
        controllerSocketId: null,  // Controller joins later
        receiverSocketId: socket.id,  // TV receiver creates the session
        state: {
          layout: 2,
          games: {},
          isActive: false
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + (4 * 60 * 60 * 1000) // 4 hours
      };

      castingSessions.set(sessionId, session);
      socket.join(sessionId);

      console.log(`📺 TV Receiver created session ${sessionId} with PIN ${pin}`);

      callback({ success: true, sessionId, pin });
    } catch (error) {
      console.error('Error creating session:', error);
      callback({ success: false, error: error.message });
    }
  });

  // ============================================
  // TV QR CODE AUTHENTICATION SOCKET EVENTS
  // ============================================

  // TV registers its socket for QR auth notifications
  socket.on('tv:register-for-auth', async (data, callback) => {
    try {
      const { token } = data;

      if (!token) {
        return callback({ success: false, error: 'Token is required' });
      }

      // Update the token record with this socket ID
      await pool.query(
        "UPDATE tv_auth_tokens SET socket_id = $1 WHERE token = $2 AND status = 'pending'",
        [socket.id, token]
      );

      console.log(`📺 TV registered socket ${socket.id} for auth token`);
      callback({ success: true });
    } catch (error) {
      console.error('Register for auth error:', error);
      callback({ success: false, error: error.message });
    }
  });

  // TV polls for auth status (backup for Socket.IO issues)
  socket.on('tv:check-auth-status', async (data, callback) => {
    try {
      const { token } = data;

      if (!token) {
        return callback({ success: false, error: 'Token is required' });
      }

      const result = await pool.query(
        `SELECT status, user_id, device_id FROM tv_auth_tokens WHERE token = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        return callback({ success: false, error: 'Token not found' });
      }

      const tokenData = result.rows[0];

      if (tokenData.status === 'approved') {
        // Get session token - must match device_id AND be active
        const sessionResult = await pool.query(
          `SELECT session_token FROM tv_sessions
           WHERE user_id = $1 AND device_id = $2 AND is_active = TRUE
           ORDER BY created_at DESC LIMIT 1`,
          [tokenData.user_id, tokenData.device_id]
        );

        // Get user info
        const userResult = await pool.query(
          'SELECT email, display_name FROM users WHERE id = $1',
          [tokenData.user_id]
        );
        const user = userResult.rows[0];

        let sessionToken = sessionResult.rows[0]?.session_token;
        console.log(`📺 check-auth-status: user=${tokenData.user_id}, device=${tokenData.device_id?.substring(0, 8)}, hasSession=${!!sessionToken}`);

        // If no active session found, the approval created a session without is_active=TRUE
        // This can happen with old approvals. Create a fresh session now.
        if (!sessionToken) {
          console.log(`📺 check-auth-status: No active session found, creating new one...`);
          const crypto = require('crypto');
          sessionToken = crypto.randomBytes(32).toString('hex');
          await pool.query(
            `INSERT INTO tv_sessions (device_id, user_id, device_name, session_token, is_active, created_at, last_seen_at)
             VALUES ($1, $2, 'GridTV', $3, TRUE, NOW(), NOW())
             ON CONFLICT (device_id)
             DO UPDATE SET user_id = $2, session_token = $3, is_active = TRUE, last_seen_at = NOW()`,
            [tokenData.device_id, tokenData.user_id, sessionToken]
          );
          console.log(`📺 check-auth-status: Created new session with token ${sessionToken.substring(0, 8)}...`);
        }

        callback({
          success: true,
          status: 'approved',
          sessionToken: sessionToken,
          userEmail: user?.email,
          displayName: user?.display_name
        });
      } else {
        callback({ success: true, status: tokenData.status });
      }
    } catch (error) {
      console.error('Check auth status error:', error);
      callback({ success: false, error: error.message });
    }
  });

  // ============================================
  // CASTING SOCKET EVENTS
  // ============================================

  // Controller (LiveGames) joins a session by entering PIN
  // Controller MUST be authenticated - they provide the userId
  socket.on('cast:join-session', (data, callback) => {
    try {
      const { pin, userId, deviceName } = data;

      if (!userId) {
        return callback({ success: false, error: 'Authentication required' });
      }

      // Find session by PIN only (no userId check since TV doesn't have one)
      let targetSession = null;
      let targetSessionId = null;

      for (const [sessionId, session] of castingSessions.entries()) {
        if (session.pin === pin) {
          // Check if session is already claimed by another user
          if (session.userId && session.userId !== userId) {
            return callback({ success: false, error: 'This TV is already connected to another user' });
          }
          targetSession = session;
          targetSessionId = sessionId;
          break;
        }
      }

      if (!targetSession) {
        return callback({ success: false, error: 'Invalid PIN. Check the code on your TV.' });
      }

      // Claim the session for this user
      targetSession.userId = userId;
      targetSession.controllerSocketId = socket.id;
      targetSession.controllerDeviceName = deviceName || 'Control Device';
      socket.join(targetSessionId);

      console.log(`📺 Controller (user ${userId}) joined session ${targetSessionId}`);

      // Notify TV receiver that controller connected
      if (targetSession.receiverSocketId) {
        io.to(targetSession.receiverSocketId).emit('cast:receiver-connected', {
          sessionId: targetSessionId,
          deviceName: deviceName || 'Control Device'
        });
      }

      callback({
        success: true,
        sessionId: targetSessionId,
        state: targetSession.state,
        deviceName: targetSession.deviceName
      });
    } catch (error) {
      console.error('Error joining session:', error);
      callback({ success: false, error: error.message });
    }
  });

  // Receiver reconnects to update socket ID (e.g., after redirect to tv-sports-bar)
  socket.on('cast:receiver-reconnect', (data, callback) => {
    try {
      const { sessionId } = data;

      if (!sessionId) {
        return callback({ success: false, error: 'Session ID required' });
      }

      const session = castingSessions.get(sessionId);
      if (!session) {
        return callback({ success: false, error: 'Session not found' });
      }

      // Update receiver socket ID to this new socket
      session.receiverSocketId = socket.id;
      socket.join(sessionId);

      console.log(`📺 Receiver reconnected to session ${sessionId} with new socket ${socket.id}`);

      // Notify controller that receiver reconnected (so it can re-sync state)
      if (session.controllerSocketId) {
        io.to(session.controllerSocketId).emit('cast:receiver-reconnected', {
          sessionId: sessionId
        });
      }

      // Send current state to the new receiver socket
      callback({
        success: true,
        state: session.state
      });
    } catch (error) {
      console.error('Error reconnecting receiver:', error);
      callback({ success: false, error: error.message });
    }
  });

  // Sync state from controller to TV
  socket.on('cast:sync-state', (data) => {
    const { sessionId, state } = data;
    const session = castingSessions.get(sessionId);

    if (session && session.controllerSocketId === socket.id) {
      session.state = { ...session.state, ...state };

      // Broadcast to receiver
      if (session.receiverSocketId) {
        io.to(session.receiverSocketId).emit('cast:state-updated', { state: session.state });
      }
    }
  });

  // End casting session
  socket.on('cast:end-session', (data) => {
    const { sessionId } = data;
    const session = castingSessions.get(sessionId);

    if (session) {
      console.log(`📺 Ending casting session ${sessionId}`);

      // Notify all clients in the session
      io.to(sessionId).emit('cast:session-ended');

      // Remove session
      castingSessions.delete(sessionId);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket disconnected: ${socket.id}`);

    // Find and update any sessions this socket was part of
    for (const [sessionId, session] of castingSessions.entries()) {
      if (session.controllerSocketId === socket.id) {
        console.log(`📺 Controller disconnected from session ${sessionId}`);
        // Notify receiver
        if (session.receiverSocketId) {
          io.to(session.receiverSocketId).emit('cast:controller-disconnected');
        }
        // Remove session after 30 seconds if controller doesn't reconnect
        setTimeout(() => {
          if (castingSessions.has(sessionId)) {
            castingSessions.delete(sessionId);
            io.to(sessionId).emit('cast:session-ended');
          }
        }, 30000);
      } else if (session.receiverSocketId === socket.id) {
        console.log(`📺 Receiver disconnected from session ${sessionId}`);
        session.receiverSocketId = null;
        // Notify controller
        if (session.controllerSocketId) {
          io.to(session.controllerSocketId).emit('cast:receiver-disconnected');
        }
      }
    }
  });
});

console.log('✅ Socket.IO casting server initialized');
