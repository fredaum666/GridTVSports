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
