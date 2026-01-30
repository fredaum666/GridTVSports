# Supabase Security Implementation Guide

## Overview
This guide addresses all 23 security issues identified by Supabase's security linter. All issues are related to missing Row Level Security (RLS) on public tables.

## Security Issues Summary

### Critical (4 tables with sensitive data exposed):
- ❌ `password_reset_tokens` - exposed token column
- ❌ `push_subscriptions` - exposed auth_key column
- ❌ `tv_auth_tokens` - exposed token column
- ❌ `tv_sessions` - exposed session_token column

### High Priority (15 tables without RLS):
- ❌ `users`, `session`, `subscriptions`, `payment_history`
- ❌ `teams`, `games`, `game_stats`, `game_drives`, `game_plays`
- ❌ `subscription_plans`, `pricing_config`
- ❌ `favorite_teams`, `notification_preferences`, `notification_log`
- ❌ `connection_test`

## Implementation Steps

### Step 1: Apply the RLS Migration

Run the migration via Supabase Dashboard or CLI:

#### Option A: Via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
2. Copy contents of `supabase/migrations/fix_rls_security.sql`
3. Paste and run the migration
4. Verify no errors in output

#### Option B: Via Supabase CLI
```bash
# Apply the migration
supabase db push

# Or if using migration files
supabase migration up
```

### Step 2: Update Backend Authentication

Your Node.js backend needs TWO Supabase clients:

#### Create `supabase-config.js`:
```javascript
const { createClient } = require('@supabase/supabase-js');

// Service role client (bypasses RLS) - NEVER expose to frontend
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Anonymous client (respects RLS) - safe for public operations
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = { supabaseAdmin, supabaseAnon };
```

#### Update `.env`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here  # Keep secret!
```

### Step 3: Update Backend Code Patterns

#### Pattern 1: Public Sports Data (READ-ONLY)
Use anonymous client for games, teams, stats:

```javascript
const { supabaseAnon } = require('./supabase-config');

// ✅ Public read - use anon client
app.get('/api/nfl/scoreboard', async (req, res) => {
  const { data, error } = await supabaseAnon
    .from('games')
    .select('*')
    .eq('sport', 'nfl');

  res.json(data);
});
```

#### Pattern 2: User-Specific Data
Use admin client with explicit user_id filtering:

```javascript
const { supabaseAdmin } = require('./supabase-config');

// ✅ User data - use admin client with user_id filter
app.get('/api/favorites', async (req, res) => {
  const userId = req.session.userId; // From your session

  const { data, error } = await supabaseAdmin
    .from('favorite_teams')
    .select('*')
    .eq('user_id', userId);

  res.json(data);
});

// ✅ Insert user data
app.post('/api/favorites', async (req, res) => {
  const userId = req.session.userId;

  const { data, error } = await supabaseAdmin
    .from('favorite_teams')
    .insert({
      user_id: userId,
      team_id: req.body.team_id,
      sport: req.body.sport
    });

  res.json(data);
});
```

#### Pattern 3: Sensitive Backend-Only Data
Use admin client for sessions, tokens, auth:

```javascript
const { supabaseAdmin } = require('./supabase-config');

// ✅ Backend-only tables - use admin client
app.post('/api/tv/generate-qr-token', async (req, res) => {
  const token = generateSecureToken();

  const { data, error } = await supabaseAdmin
    .from('tv_auth_tokens')
    .insert({
      token,
      user_id: req.session.userId,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

  res.json({ token });
});

// ✅ Session management
app.post('/api/auth/login', async (req, res) => {
  // ... validate credentials ...

  const sessionId = generateSessionId();

  await supabaseAdmin
    .from('session')
    .insert({
      sid: sessionId,
      sess: { userId: user.id },
      expire: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

  req.session.userId = user.id;
  res.json({ success: true });
});
```

#### Pattern 4: Subscription & Payment Data
Use admin client with user_id filtering:

```javascript
const { supabaseAdmin } = require('./supabase-config');

// ✅ Subscription status - admin client with user filter
app.get('/api/subscription/status', async (req, res) => {
  const userId = req.session.userId;

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  res.json(data);
});

// ✅ Payment history - admin client with user filter
app.get('/api/payment/history', async (req, res) => {
  const userId = req.session.userId;

  const { data, error } = await supabaseAdmin
    .from('payment_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  res.json(data);
});
```

### Step 4: Verify Security

After implementation, verify RLS is working:

#### Test 1: Verify RLS is Enabled
```sql
-- Run in Supabase SQL Editor
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- All tables should show rowsecurity = true
```

#### Test 2: Verify Policies Exist
```sql
-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

#### Test 3: Test Anonymous Access
```javascript
// This should work (public data)
const { data } = await supabaseAnon
  .from('games')
  .select('*');
console.log('Public games:', data.length); // Should return results

// This should return empty (no policy = no access)
const { data: sessions } = await supabaseAnon
  .from('session')
  .select('*');
console.log('Sessions:', sessions); // Should be [] or null
```

#### Test 4: Re-run Supabase Linter
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/database/linter
2. Click "Refresh" to re-run security checks
3. All RLS errors should be resolved ✅

### Step 5: Frontend Considerations

**IMPORTANT:** Your frontend should NOT have direct Supabase access for this architecture. All data should flow through your Express.js API endpoints which handle RLS via the backend.

If you do add direct frontend Supabase access in the future:
- Only use ANON key (never service role)
- Only access public tables (games, teams, stats)
- Use Supabase Auth for authenticated user operations

## Security Best Practices

### ✅ DO:
- Use `supabaseAdmin` (service role) for all backend operations
- Always filter by `user_id` when accessing user-specific data
- Keep service role key in `.env` and NEVER expose to frontend
- Use session/JWT validation before database operations
- Validate all user input before database queries

### ❌ DON'T:
- Don't expose service role key to frontend/client
- Don't trust client-provided `user_id` - always use session
- Don't disable RLS to "fix" access issues
- Don't create overly permissive policies like `USING (true)` for sensitive data

## Rollback Plan

If issues occur after migration:

```sql
-- Emergency rollback (NOT RECOMMENDED - fixes security issue)
-- Only use temporarily while debugging

ALTER TABLE public.session DISABLE ROW LEVEL SECURITY;
-- ... repeat for other tables

-- Then investigate and re-enable with proper policies
```

## Monitoring

After implementation, monitor:
1. Application errors related to database access
2. Supabase Dashboard > Database > Linter (should show 0 errors)
3. API response times (RLS adds minimal overhead)
4. User reports of access issues

## Support

- Supabase RLS Docs: https://supabase.com/docs/guides/auth/row-level-security
- Supabase Linter: https://supabase.com/docs/guides/database/database-linter
- Project-specific questions: Check server.js and db.js for current patterns
