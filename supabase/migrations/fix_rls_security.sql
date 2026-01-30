-- =============================================================================
-- FIX RLS SECURITY ISSUES - GridTVSports
-- =============================================================================
-- This migration enables Row Level Security (RLS) on all public tables
-- and creates appropriate policies based on data sensitivity and access patterns
-- =============================================================================

-- =============================================================================
-- 1. PUBLIC READ-ONLY DATA (Sports Information)
-- =============================================================================
-- These tables contain public sports data that anyone can read

-- Teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are publicly readable"
  ON public.teams
  FOR SELECT
  USING (true);

-- Games table
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games are publicly readable"
  ON public.games
  FOR SELECT
  USING (true);

-- Game stats table
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game stats are publicly readable"
  ON public.game_stats
  FOR SELECT
  USING (true);

-- Game drives table
ALTER TABLE public.game_drives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game drives are publicly readable"
  ON public.game_drives
  FOR SELECT
  USING (true);

-- Game plays table
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game plays are publicly readable"
  ON public.game_plays
  FOR SELECT
  USING (true);

-- Subscription plans table (pricing info - public read)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscription plans are publicly readable"
  ON public.subscription_plans
  FOR SELECT
  USING (true);

-- Pricing config table (public read)
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pricing config is publicly readable"
  ON public.pricing_config
  FOR SELECT
  USING (true);

-- =============================================================================
-- 2. USER-SPECIFIC DATA (Must be authenticated, own data only)
-- =============================================================================

-- Users table - users can only read/update their own record
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  USING (auth.uid()::text = id::text OR auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid()::text = id::text OR auth.uid()::text = user_id::text);

-- Favorite teams - users can manage their own favorites
ALTER TABLE public.favorite_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own favorites"
  ON public.favorite_teams
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own favorites"
  ON public.favorite_teams
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own favorites"
  ON public.favorite_teams
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Notification preferences - users can manage their own preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Notification log - users can read their own notifications
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notification_log
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Push subscriptions - users can manage their own push subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- =============================================================================
-- 3. SENSITIVE USER DATA (Subscription & Payment Info)
-- =============================================================================

-- Subscriptions - users can only see their own subscription
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Payment history - users can only see their own payment history
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payment history"
  ON public.payment_history
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- =============================================================================
-- 4. AUTHENTICATION & SESSION DATA (Backend/Service Role Only)
-- =============================================================================
-- These tables should NOT be accessible via PostgREST at all
-- Only your backend server with service role key should access these

-- Session table - no public access, backend only
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;

-- No policies = no access via API (service role bypasses RLS)

-- Password reset tokens - no public access, backend only
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No policies = no access via API

-- TV auth tokens - no public access, backend only
ALTER TABLE public.tv_auth_tokens ENABLE ROW LEVEL SECURITY;

-- No policies = no access via API

-- TV sessions - no public access, backend only
ALTER TABLE public.tv_sessions ENABLE ROW LEVEL SECURITY;

-- No policies = no access via API

-- =============================================================================
-- 5. TEST/UTILITY TABLES
-- =============================================================================

-- Connection test table - public read for health checks
ALTER TABLE public.connection_test ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connection test is publicly readable"
  ON public.connection_test
  FOR SELECT
  USING (true);

-- =============================================================================
-- SUMMARY OF SECURITY MODEL
-- =============================================================================
--
-- PUBLIC READ (Anyone can read):
--   - teams, games, game_stats, game_drives, game_plays
--   - subscription_plans, pricing_config
--   - connection_test
--
-- USER DATA (Authenticated users, own data only):
--   - users (read/update own)
--   - favorite_teams (full CRUD on own)
--   - notification_preferences (read/update/insert own)
--   - notification_log (read own)
--   - push_subscriptions (full CRUD on own)
--   - subscriptions (read own)
--   - payment_history (read own)
--
-- BACKEND ONLY (No API access, service role only):
--   - session
--   - password_reset_tokens
--   - tv_auth_tokens
--   - tv_sessions
--
-- =============================================================================
-- IMPORTANT: Update your backend code
-- =============================================================================
-- After applying this migration:
--
-- 1. Use SERVICE ROLE key for server-side operations that need to bypass RLS
-- 2. Use ANON key for public data access (games, teams, etc.)
-- 3. Use authenticated user's JWT for user-specific operations
-- 4. Never expose service role key to frontend
--
-- Example in your backend:
--   const { createClient } = require('@supabase/supabase-js')
--
--   // For backend operations (bypasses RLS)
--   const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY)
--
--   // For user operations (respects RLS)
--   const supabaseClient = createClient(url, ANON_KEY, {
--     auth: { persistSession: false }
--   })
-- =============================================================================
