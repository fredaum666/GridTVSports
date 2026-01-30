# Supabase Security Fix - Quick Action Checklist

## 🚨 Issues to Fix
- **23 security errors** - All RLS-related
- **19 tables** without Row Level Security enabled
- **4 tables** with sensitive data exposed (tokens, auth keys)

## ✅ Step-by-Step Fix

### Step 1: Apply RLS Migration (5 minutes)

**Option A: Supabase Dashboard (Recommended)**
1. Open: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
2. Open file: [`supabase/migrations/fix_rls_security.sql`](supabase/migrations/fix_rls_security.sql)
3. Copy entire contents
4. Paste into SQL Editor
5. Click **"Run"**
6. Verify success message (should see "Success. No rows returned")

**Option B: psql Command**
```bash
# Get Direct Connection string from Supabase Dashboard → Settings → Database
psql "YOUR_DIRECT_CONNECTION_STRING" -f supabase/migrations/fix_rls_security.sql
```

### Step 2: Verify Database Connection (2 minutes)

Check your `.env` file has the correct DATABASE_URL format:

```bash
# Should be one of these formats:
# Session Mode (recommended):
DATABASE_URL=postgresql://postgres.PROJECT_REF:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Or Direct Connection:
DATABASE_URL=postgresql://postgres.PROJECT_REF:[PASSWORD]@db.PROJECT_REF.supabase.co:5432/postgres
```

If unsure, get it from: Supabase Dashboard → Settings → Database → Connection String

### Step 3: Test Your Backend (3 minutes)

```bash
# Start your server
npm run dev

# In another terminal, test endpoints
curl http://localhost:3001/api/nfl/scoreboard
curl http://localhost:3001/api/teams/NFL

# Both should return data successfully
```

If errors occur, check:
- [ ] DATABASE_URL uses `postgres` user (not `anon`)
- [ ] Password is correct
- [ ] SSL is configured (already in db.js)

### Step 4: Verify Security Issues Resolved (2 minutes)

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/database/linter
2. Click **"Refresh"** or **"Run Linter"**
3. Verify: **0 errors** (all 23 RLS errors should be gone)

### Step 5: Verify RLS Policies Exist (1 minute)

Quick check via SQL Editor:
```sql
-- Count RLS policies created
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public';

-- Should return approximately 30+ policies
```

Or check visually:
1. Go to: Database → Tables → `users` → Policies
2. Should see policies like "Users can read own data"

## 📋 Verification Checklist

After completing all steps, verify:

- [ ] Migration applied successfully (no SQL errors)
- [ ] Backend server starts without errors
- [ ] API endpoints return data correctly
- [ ] Supabase linter shows 0 security errors
- [ ] All 19 tables have RLS enabled
- [ ] Policies exist for each table type

## 🔒 What Was Fixed

### Tables Now Protected:

**Public Read-Only Data** (anyone can read):
- ✅ teams, games, game_stats, game_drives, game_plays
- ✅ subscription_plans, pricing_config, connection_test

**User-Specific Data** (users can only access their own):
- ✅ users, favorite_teams, notification_preferences
- ✅ notification_log, push_subscriptions
- ✅ subscriptions, payment_history

**Backend-Only Data** (no API access):
- ✅ session, password_reset_tokens
- ✅ tv_auth_tokens, tv_sessions

### Sensitive Columns Now Secured:
- ✅ `password_reset_tokens.token` - blocked from API
- ✅ `push_subscriptions.auth_key` - user-restricted
- ✅ `tv_auth_tokens.token` - blocked from API
- ✅ `tv_sessions.session_token` - blocked from API

## 🚫 What Did NOT Change

Your backend code requires **zero changes**:
- ❌ No changes needed in server.js
- ❌ No changes needed in db.js
- ❌ No changes needed in API endpoints
- ❌ No changes needed in frontend code

Your backend uses the `postgres` superuser role which **bypasses RLS**. The security issue was about PostgREST API exposure, not your backend.

## ⚠️ If Something Goes Wrong

### Rollback (Emergency Only)
```sql
-- ONLY use if absolutely necessary
-- This re-exposes the security vulnerability

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.session DISABLE ROW LEVEL SECURITY;
-- ... etc for other tables

-- Then investigate the issue and re-enable with fixes
```

### Common Issues

**"Permission denied for table X"**
- Fix: Check DATABASE_URL uses `postgres` user
- Get correct string: Supabase Dashboard → Settings → Database

**"SSL connection required"**
- Already fixed in db.js with `ssl: { rejectUnauthorized: false }`

**Backend works but linter still shows errors**
- Clear browser cache and refresh Supabase Dashboard
- Re-run linter
- Verify migration completed (check for SQL errors)

## 📚 Reference Documents

- [Fix RLS Security Migration](supabase/migrations/fix_rls_security.sql) - SQL to apply
- [Implementation Guide](SUPABASE_SECURITY_IMPLEMENTATION.md) - Detailed guide
- [Environment Setup](SUPABASE_ENV_SETUP.md) - Connection string config

## 🎯 Success Criteria

You're done when:
1. ✅ Supabase linter shows **0 errors**
2. ✅ All backend APIs work normally
3. ✅ No application errors in logs
4. ✅ Tables have RLS enabled (verify in Dashboard)

---

**Estimated Total Time:** 10-15 minutes

**Risk Level:** Low - your backend code doesn't need changes

**Rollback Available:** Yes - can disable RLS if needed (not recommended)
