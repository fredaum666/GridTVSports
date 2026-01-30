-- =============================================================================
-- FIX RLS SECURITY ISSUES - GridTVSports (Corrected for Custom Auth)
-- =============================================================================
-- This migration enables Row Level Security (RLS) on all public tables.
--
-- ARCHITECTURE NOTE:
-- Your app uses custom Express session authentication, not Supabase Auth.
-- Your backend connects with 'postgres' role (bypasses RLS).
-- These policies protect against unauthorized PostgREST API access (anon role).
-- =============================================================================

-- =============================================================================
-- 1. PUBLIC READ-ONLY DATA (Sports Information)
-- =============================================================================
-- Allow anonymous (API) access to read public sports data

-- Teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are publicly readable"
  ON public.teams
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Games table
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games are publicly readable"
  ON public.games
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Game stats table
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game stats are publicly readable"
  ON public.game_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Game drives table
ALTER TABLE public.game_drives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game drives are publicly readable"
  ON public.game_drives
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Game plays table
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game plays are publicly readable"
  ON public.game_plays
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Subscription plans table (pricing info - public read)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscription plans are publicly readable"
  ON public.subscription_plans
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Pricing config table (public read)
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pricing config is publicly readable"
  ON public.pricing_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Connection test table (public read for health checks)
ALTER TABLE public.connection_test ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connection test is publicly readable"
  ON public.connection_test
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================================================
-- 2. USER-SPECIFIC DATA (Backend Access Only via API)
-- =============================================================================
-- These tables should NOT be accessible via PostgREST API.
-- Your backend will access them using postgres role (which bypasses RLS).
-- We enable RLS but create NO policies for anon/authenticated roles = blocked.

-- Users table - backend only
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- No policies = anon/authenticated cannot access via API

-- Subscriptions table - backend only
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
-- No policies = blocked from API

-- Payment history - backend only
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
-- No policies = blocked from API

-- Favorite teams - backend only
ALTER TABLE public.favorite_teams ENABLE ROW LEVEL SECURITY;
-- No policies = blocked from API

-- Notification preferences - backend only
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
-- No policies = blocked from API

-- Notification log - backend only
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
-- No policies = blocked from API

-- Push subscriptions - backend only
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- No policies = blocked from API

-- =============================================================================
-- 3. SENSITIVE AUTHENTICATION DATA (Backend Only)
-- =============================================================================
-- Critical: These contain tokens/secrets and must be completely blocked from API

-- Session table - backend only
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
-- No policies = completely blocked from API

-- Password reset tokens - backend only
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
-- No policies = completely blocked from API

-- TV auth tokens - backend only
ALTER TABLE public.tv_auth_tokens ENABLE ROW LEVEL SECURITY;
-- No policies = completely blocked from API

-- TV sessions - backend only
ALTER TABLE public.tv_sessions ENABLE ROW LEVEL SECURITY;
-- No policies = completely blocked from API

-- =============================================================================
-- SUMMARY OF SECURITY MODEL
-- =============================================================================
--
-- PUBLIC READ (PostgREST API can read):
--   ✅ teams, games, game_stats, game_drives, game_plays
--   ✅ subscription_plans, pricing_config, connection_test
--
-- BLOCKED FROM API (Backend postgres role only):
--   🚫 users, subscriptions, payment_history
--   🚫 favorite_teams, notification_preferences, notification_log
--   🚫 push_subscriptions
--   🚫 session, password_reset_tokens
--   🚫 tv_auth_tokens, tv_sessions
--
-- HOW THIS WORKS:
--   - Your backend uses 'postgres' role → bypasses RLS → full access
--   - PostgREST API uses 'anon' role → respects RLS → limited access
--   - Tables with no policies = no access for anon/authenticated roles
--   - Tables with SELECT policies = read-only access for anon/authenticated
--
-- YOUR BACKEND CODE:
--   ✅ No changes needed - continues working exactly as before
--   ✅ All queries from server.js work normally
--   ✅ postgres role bypasses all RLS restrictions
--
-- SECURITY IMPROVEMENT:
--   ✅ PostgREST API can no longer access sensitive tables
--   ✅ Tokens, passwords, user data protected from direct API access
--   ✅ Only public sports data exposed via API
--
-- =============================================================================
