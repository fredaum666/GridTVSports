-- GridTV Sports Database Schema
-- PostgreSQL Database Schema for storing game data

-- Create games table for all sports
CREATE TABLE IF NOT EXISTS games (
  id VARCHAR(50) PRIMARY KEY,
  sport VARCHAR(10) NOT NULL,
  game_date DATE NOT NULL,
  week_number INT,
  season INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  home_team VARCHAR(100) NOT NULL,
  home_team_id VARCHAR(50),
  home_score INT DEFAULT 0,
  away_team VARCHAR(100) NOT NULL,
  away_team_id VARCHAR(50),
  away_score INT DEFAULT 0,
  raw_data JSONB,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_sport_date ON games(sport, game_date);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_season ON games(season);
CREATE INDEX IF NOT EXISTS idx_games_updated ON games(last_updated);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(50) PRIMARY KEY,
  sport VARCHAR(10) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  short_name VARCHAR(50),
  abbreviation VARCHAR(10),
  logo_url VARCHAR(500),
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on teams
CREATE INDEX IF NOT EXISTS idx_teams_sport ON teams(sport);

-- Create game_stats table for detailed statistics
CREATE TABLE IF NOT EXISTS game_stats (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(50) REFERENCES games(id) ON DELETE CASCADE,
  team_id VARCHAR(50),
  stat_type VARCHAR(50) NOT NULL,
  stat_value JSONB,
  period INT,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create indexes for game_stats
CREATE INDEX IF NOT EXISTS idx_stats_game ON game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_stats_team ON game_stats(team_id);

-- Sample query to get completed games
-- SELECT * FROM games WHERE status = 'completed' AND sport = 'NFL' ORDER BY game_date DESC LIMIT 10;

-- Sample query to get today's games
-- SELECT * FROM games WHERE game_date = CURRENT_DATE AND sport = 'NBA';

-- Sample query to get games by week (NFL)
-- SELECT * FROM games WHERE sport = 'NFL' AND week_number = 1 AND season = 2025;

-- Sample query to get all games for a team
-- SELECT * FROM games WHERE home_team_id = 'LAL' OR away_team_id = 'LAL' ORDER BY game_date DESC;

COMMENT ON TABLE games IS 'Stores all game data for NFL, NBA, MLB, NHL';
COMMENT ON TABLE teams IS 'Stores team information and logo URLs';
COMMENT ON TABLE game_stats IS 'Stores detailed game statistics';

COMMENT ON COLUMN games.raw_data IS 'Full ESPN API response in JSON format for historical reference';
COMMENT ON COLUMN games.status IS 'Game status: scheduled, live, completed';
COMMENT ON COLUMN games.week_number IS 'NFL week number (NULL for other sports)';

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Create index for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create session table for express-session with connect-pg-simple
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

COMMENT ON TABLE users IS 'Stores user authentication data';
COMMENT ON TABLE session IS 'Stores session data for authenticated users';
COMMENT ON COLUMN users.role IS 'User role: admin, user';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hashed password';

-- ============================================
-- SUBSCRIPTION TABLES
-- ============================================

-- Add subscription fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP;

-- Create subscriptions table for tracking subscription history
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),
  plan_type VARCHAR(50) NOT NULL, -- 'monthly' or 'yearly'
  status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due', 'trialing', 'expired'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  amount INT NOT NULL, -- Amount in cents
  currency VARCHAR(10) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL, -- 'succeeded', 'failed', 'pending', 'refunded'
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for payment_history
CREATE INDEX IF NOT EXISTS idx_payments_user ON payment_history(user_id);

-- Create subscription_plans table for storing plan details
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  stripe_price_id VARCHAR(255) UNIQUE NOT NULL,
  plan_type VARCHAR(50) NOT NULL, -- 'monthly' or 'yearly'
  price INT NOT NULL, -- Price in cents
  currency VARCHAR(10) DEFAULT 'usd',
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE subscriptions IS 'Stores user subscription data';
COMMENT ON TABLE payment_history IS 'Stores payment transaction history';
COMMENT ON TABLE subscription_plans IS 'Stores available subscription plans';
COMMENT ON COLUMN users.subscription_status IS 'Subscription status: trial, active, canceled, expired';
COMMENT ON COLUMN users.trial_ends_at IS 'Trial period end date (10 days from registration)';

-- ============================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for password reset tokens
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);

COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens for users';
COMMENT ON COLUMN password_reset_tokens.token IS 'Secure random token sent via email';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (1 hour from creation)';

-- ============================================
-- FAVORITE TEAMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS favorite_teams (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  team_id VARCHAR(50) NOT NULL,
  team_name VARCHAR(100) NOT NULL,
  team_abbreviation VARCHAR(10),
  team_logo VARCHAR(500),
  league VARCHAR(20) NOT NULL, -- 'NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'
  rank INT NOT NULL CHECK (rank >= 1 AND rank <= 6),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, team_id),
  UNIQUE(user_id, league, rank)
);

-- Create indexes for favorite teams
CREATE INDEX IF NOT EXISTS idx_favorite_teams_user ON favorite_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_teams_league ON favorite_teams(league);
CREATE INDEX IF NOT EXISTS idx_favorite_teams_rank ON favorite_teams(user_id, rank);

COMMENT ON TABLE favorite_teams IS 'Stores user favorite teams with ranking';
COMMENT ON COLUMN favorite_teams.rank IS 'Ranking 1-6, order of selection';
COMMENT ON COLUMN favorite_teams.league IS 'League: NFL, NBA, MLB, NHL, NCAAF, NCAAB';

-- ============================================
-- PRICING CONFIGURATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pricing_config (
  id SERIAL PRIMARY KEY,
  plan_type VARCHAR(50) UNIQUE NOT NULL, -- 'monthly' or 'yearly'
  price DECIMAL(10, 2) NOT NULL,
  discount_percentage INT DEFAULT 0,
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default pricing if not exists
INSERT INTO pricing_config (plan_type, price, discount_percentage, features, is_active)
VALUES
  ('monthly', 7.99, 0, '["Watch up to 8 games in one view", "All leagues (NFL, NBA, MLB, NHL, NCAA)", "No ads or interruptions", "Sports Bar Mode with custom layouts", "Access to historical game data", "Mobile-responsive design"]'::jsonb, true),
  ('yearly', 76.70, 20, '["Watch up to 8 games in one view", "All leagues (NFL, NBA, MLB, NHL, NCAA)", "No ads or interruptions", "Sports Bar Mode with custom layouts", "Access to historical game data", "Mobile-responsive design", "20% savings vs monthly"]'::jsonb, true)
ON CONFLICT (plan_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_pricing_active ON pricing_config(is_active);

COMMENT ON TABLE pricing_config IS 'Stores pricing configuration for subscription plans (admin editable)';
COMMENT ON COLUMN pricing_config.price IS 'Price in dollars (e.g., 7.99)';
COMMENT ON COLUMN pricing_config.discount_percentage IS 'Discount percentage shown on pricing page';
COMMENT ON COLUMN pricing_config.features IS 'JSON array of feature strings';

-- ============================================
-- TV QR CODE AUTHENTICATION TABLES
-- ============================================

-- Temporary QR auth tokens (short-lived, for initial TV authentication)
CREATE TABLE IF NOT EXISTS tv_auth_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) UNIQUE NOT NULL,
  device_id VARCHAR(64) NOT NULL,
  device_name VARCHAR(100) DEFAULT 'TV Receiver',
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  socket_id VARCHAR(100),
  expires_at TIMESTAMP NOT NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for tv_auth_tokens
CREATE INDEX IF NOT EXISTS idx_tv_auth_token ON tv_auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tv_auth_device ON tv_auth_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_tv_auth_status ON tv_auth_tokens(status);
CREATE INDEX IF NOT EXISTS idx_tv_auth_expires ON tv_auth_tokens(expires_at);

COMMENT ON TABLE tv_auth_tokens IS 'Stores temporary QR code tokens for TV authentication';
COMMENT ON COLUMN tv_auth_tokens.token IS 'Secure 32-byte random token displayed in QR code';
COMMENT ON COLUMN tv_auth_tokens.device_id IS 'Unique identifier generated by TV app stored in localStorage';
COMMENT ON COLUMN tv_auth_tokens.status IS 'Token status: pending, approved, expired, used';
COMMENT ON COLUMN tv_auth_tokens.socket_id IS 'Socket.IO connection ID for real-time auth notification';

-- Persistent TV sessions (long-lived, survives app restarts)
CREATE TABLE IF NOT EXISTS tv_sessions (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(64) UNIQUE NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(100) DEFAULT 'TV Receiver',
  session_token VARCHAR(128) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Indexes for tv_sessions
CREATE INDEX IF NOT EXISTS idx_tv_sessions_device ON tv_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_tv_sessions_user ON tv_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tv_sessions_token ON tv_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_tv_sessions_active ON tv_sessions(is_active);

COMMENT ON TABLE tv_sessions IS 'Stores persistent authenticated TV sessions';
COMMENT ON COLUMN tv_sessions.device_id IS 'Unique identifier for the TV device (from localStorage)';
COMMENT ON COLUMN tv_sessions.session_token IS 'Long-lived session token stored in TV localStorage';
COMMENT ON COLUMN tv_sessions.is_active IS 'Whether the session is currently active';

-- ============================================
-- PUSH NOTIFICATION SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  subscription_type VARCHAR(20) DEFAULT 'web', -- 'web' for Web Push, 'fcm' for Firebase Cloud Messaging
  endpoint TEXT, -- For web push (NULL for FCM)
  p256dh_key TEXT, -- For web push (NULL for FCM)
  auth_key TEXT, -- For web push (NULL for FCM)
  fcm_token TEXT, -- For FCM (NULL for web push)
  device_id VARCHAR(100), -- Unique device identifier
  device_info JSONB, -- Device metadata (model, manufacturer, etc.)
  user_agent VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(endpoint),
  UNIQUE(fcm_token)
);

-- Create indexes for push_subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_fcm_token ON push_subscriptions(fcm_token);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_type ON push_subscriptions(subscription_type);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  game_start_alerts BOOLEAN DEFAULT TRUE,
  minutes_before_game INT DEFAULT 15,
  notify_favorite_teams_only BOOLEAN DEFAULT TRUE,
  notify_leagues JSONB DEFAULT '["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB"]'::jsonb,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for notification_preferences
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- Notification log table (for tracking sent notifications)
CREATE TABLE IF NOT EXISTS notification_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  game_id VARCHAR(50),
  notification_type VARCHAR(50) NOT NULL, -- 'game_start', 'score_update', etc.
  title VARCHAR(255),
  body TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered BOOLEAN DEFAULT NULL,
  clicked BOOLEAN DEFAULT FALSE
);

-- Create indexes for notification_log
CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_game ON notification_log(game_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent ON notification_log(sent_at);

COMMENT ON TABLE push_subscriptions IS 'Stores push subscription data for Web Push and FCM';
COMMENT ON COLUMN push_subscriptions.subscription_type IS 'Type of subscription: web (Web Push API) or fcm (Firebase Cloud Messaging)';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL (Web Push only)';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'Public key for encryption - base64 (Web Push only)';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Authentication secret - base64 (Web Push only)';
COMMENT ON COLUMN push_subscriptions.fcm_token IS 'Firebase Cloud Messaging token (FCM only)';
COMMENT ON COLUMN push_subscriptions.device_id IS 'Unique device identifier';
COMMENT ON COLUMN push_subscriptions.device_info IS 'Device metadata JSON (model, manufacturer, sdk version, etc.)';

COMMENT ON TABLE notification_preferences IS 'Stores user notification preferences';
COMMENT ON COLUMN notification_preferences.minutes_before_game IS 'How many minutes before game start to send alert';
COMMENT ON COLUMN notification_preferences.notify_leagues IS 'JSON array of leagues to receive notifications for';

COMMENT ON TABLE notification_log IS 'Tracks sent notifications for analytics and deduplication';

-- ============================================
-- GAME REPLAY TABLES (Drives & Plays)
-- ============================================

-- Add tracking columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS has_play_data BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS play_count INT DEFAULT 0;

-- Game drives (groups plays by team possession)
CREATE TABLE IF NOT EXISTS game_drives (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(50) NOT NULL,
  sport VARCHAR(10) NOT NULL,           -- 'nfl', 'ncaa'
  drive_sequence INT NOT NULL,          -- Order within game (1, 2, 3...)
  team_abbr VARCHAR(10),
  team_id VARCHAR(50),
  start_period INT,
  start_clock VARCHAR(10),
  start_yard INT,                       -- Field position (0-100)
  end_period INT,
  end_clock VARCHAR(10),
  end_yard INT,
  result VARCHAR(50),                   -- 'TOUCHDOWN', 'FIELD GOAL', 'PUNT', 'TURNOVER', etc.
  is_scoring BOOLEAN DEFAULT FALSE,
  play_count INT DEFAULT 0,
  yards_gained INT DEFAULT 0,
  time_of_possession VARCHAR(10),
  raw_data JSONB,                       -- Full ESPN drive data
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(game_id, drive_sequence)       -- Prevent duplicate drives
);

-- Create indexes for game_drives
CREATE INDEX IF NOT EXISTS idx_drives_game ON game_drives(game_id);
CREATE INDEX IF NOT EXISTS idx_drives_sport ON game_drives(sport);
CREATE INDEX IF NOT EXISTS idx_drives_team ON game_drives(team_abbr);
CREATE INDEX IF NOT EXISTS idx_drives_scoring ON game_drives(is_scoring);

-- Individual plays within drives
CREATE TABLE IF NOT EXISTS game_plays (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(50) NOT NULL,
  drive_id INT REFERENCES game_drives(id) ON DELETE CASCADE,
  espn_play_id VARCHAR(50),             -- ESPN's play identifier
  sport VARCHAR(10) NOT NULL,
  play_sequence INT NOT NULL,           -- Global sequence within game
  drive_play_sequence INT,              -- Sequence within drive

  -- Time & Period
  period INT NOT NULL,
  clock VARCHAR(10),

  -- Field Position (0-100 coordinate system: 0=away endzone, 100=home endzone)
  start_yard INT,
  end_yard INT,
  yards_gained INT,

  -- Down & Distance
  down INT,
  distance INT,

  -- Play Details
  play_type VARCHAR(30),                -- 'pass', 'rush', 'kickoff', 'punt', 'field_goal', 'penalty', etc.
  play_text TEXT,

  -- Team Info
  possession_team_abbr VARCHAR(10),
  possession_team_id VARCHAR(50),

  -- Scoring & Turnovers
  is_scoring BOOLEAN DEFAULT FALSE,
  score_value INT DEFAULT 0,            -- 6 for TD, 3 for FG, 2 for safety/2pt, 1 for XP
  away_score INT DEFAULT 0,
  home_score INT DEFAULT 0,
  is_touchdown BOOLEAN DEFAULT FALSE,
  is_turnover BOOLEAN DEFAULT FALSE,
  turnover_type VARCHAR(20),            -- 'interception', 'fumble', 'downs'
  is_penalty BOOLEAN DEFAULT FALSE,
  penalty_yards INT,

  -- Animation Data (pre-computed for replay)
  animation_type VARCHAR(30),           -- Matches play-animations.js types
  animation_data JSONB,                 -- { fromYard, toYard, direction, etc. }

  raw_data JSONB,                       -- Full ESPN play data
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(game_id, play_sequence)        -- Prevent duplicate plays
);

-- Create indexes for game_plays
CREATE INDEX IF NOT EXISTS idx_plays_game ON game_plays(game_id);
CREATE INDEX IF NOT EXISTS idx_plays_drive ON game_plays(drive_id);
CREATE INDEX IF NOT EXISTS idx_plays_sport ON game_plays(sport);
CREATE INDEX IF NOT EXISTS idx_plays_type ON game_plays(play_type);
CREATE INDEX IF NOT EXISTS idx_plays_scoring ON game_plays(is_scoring);
CREATE INDEX IF NOT EXISTS idx_plays_period ON game_plays(period);
CREATE INDEX IF NOT EXISTS idx_plays_sequence ON game_plays(game_id, play_sequence);

COMMENT ON TABLE game_drives IS 'Stores drive data from ESPN API for NFL/NCAA games, grouped by team possession';
COMMENT ON TABLE game_plays IS 'Stores play-by-play data with pre-computed animation info for game replay';
COMMENT ON COLUMN game_drives.drive_sequence IS 'Order of drive within the game (1, 2, 3...)';
COMMENT ON COLUMN game_drives.start_yard IS 'Field position 0-100 where 0=away endzone, 100=home endzone';
COMMENT ON COLUMN game_plays.play_sequence IS 'Global play number within the game';
COMMENT ON COLUMN game_plays.animation_data IS 'Pre-computed animation parameters for SVGFieldVisualizer';
