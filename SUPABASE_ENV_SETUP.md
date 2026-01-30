# Supabase Environment Configuration

## Current Architecture

Your app currently uses **direct PostgreSQL connections** via the `pg` Pool (in [db.js](db.js)). This is perfectly fine with Supabase and will continue to work after enabling RLS.

## Important: Connection String Types

Supabase provides different connection strings for different use cases:

### 1. **Session Mode (Supavisor)** - RECOMMENDED for Backend ✅
```bash
DATABASE_URL="postgresql://postgres.PROJECT_REF:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```
- **Use this for your backend server** (current setup in db.js)
- Connects with `postgres` role (bypasses RLS)
- Optimized for serverless/connection pooling
- Find it: Supabase Dashboard → Settings → Database → Connection String → "Session mode"

### 2. **Direct Connection** - For Migrations
```bash
DATABASE_URL="postgresql://postgres.PROJECT_REF:[PASSWORD]@db.PROJECT_REF.supabase.co:5432/postgres"
```
- Use for running migrations and admin tasks
- Direct connection to database
- Find it: Supabase Dashboard → Settings → Database → Connection String → "Direct connection"

### 3. **Transaction Mode** - NOT for your use case
```bash
# Don't use this - it's for short-lived serverless functions
```

## Update Your .env File

Your current `.env` should have one of these formats:

```bash
# OPTION 1: Session Mode (Recommended for your backend)
DATABASE_URL=postgresql://postgres.PROJECT_REF:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# OPTION 2: Direct Connection (Also works)
DATABASE_URL=postgresql://postgres.PROJECT_REF:[PASSWORD]@db.PROJECT_REF.supabase.co:5432/postgres

# Other required env vars
PORT=3001
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
SESSION_SECRET=...
```

## How RLS Affects Your App

### ✅ Your Backend Will Still Work

Since you're using the `postgres` role (superuser) via DATABASE_URL, your backend queries **bypass RLS**:

```javascript
// This continues to work - postgres role bypasses RLS
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### 🔒 But PostgREST API is Now Secured

The security issue Supabase flagged is about **PostgREST API exposure**, not your backend code:

- **Before RLS:** Anyone could access `https://PROJECT.supabase.co/rest/v1/users` and see all data
- **After RLS:** PostgREST API respects RLS policies, securing direct API access

## Verify Your Setup

After applying the RLS migration, verify everything works:

### 1. Check Your Connection String
```bash
# In your project directory
grep DATABASE_URL .env

# Should see one of:
# - *.pooler.supabase.com (Session mode - recommended)
# - db.*.supabase.co (Direct - also fine)
```

### 2. Test Database Connection
```bash
npm run test-db

# Should output:
# ✅ Database connected successfully
```

### 3. Test Your Backend APIs
```bash
# Start server
npm run dev

# Test a few endpoints
curl http://localhost:3001/api/nfl/scoreboard
curl http://localhost:3001/api/teams/NFL

# All should return data normally
```

### 4. Verify RLS is Active
Go to Supabase Dashboard → Database → Linter and re-run the security check. All errors should be resolved.

## Migration Application Options

### Option A: Supabase Dashboard (Easiest)
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
2. Copy contents of `supabase/migrations/fix_rls_security.sql`
3. Paste and click "Run"
4. Check for success message

### Option B: psql Command Line
```bash
# Get your Direct Connection string from Supabase Dashboard
psql "postgresql://postgres.PROJECT_REF:[PASSWORD]@db.PROJECT_REF.supabase.co:5432/postgres" \
  -f supabase/migrations/fix_rls_security.sql
```

### Option C: Supabase CLI
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migration
supabase db push
```

## What Changes After Migration?

### ✅ No Impact (Your Backend)
- Your Express.js server continues working normally
- All API endpoints work the same
- Database queries execute unchanged
- No code changes needed in server.js or db.js

### 🔒 Secured (PostgREST API)
- Direct Supabase API access is now protected by RLS
- Unauthorized users can't query tables directly
- Sensitive data (tokens, sessions) is blocked from API access

## Troubleshooting

### Error: "permission denied for table X"

This means your connection is using a non-superuser role. Fix:

1. Check your DATABASE_URL uses `postgres` user (not `anon` or other role)
2. Verify password is correct
3. Use Session Mode or Direct Connection string format shown above

### Error: "SSL connection required"

Add SSL config to db.js (already present):
```javascript
ssl: {
  rejectUnauthorized: false
}
```

### Backend works but Supabase linter still shows errors

1. Clear browser cache
2. Re-run linter: Dashboard → Database → Linter → Refresh
3. Verify migration ran successfully: Check Tables → any table → Policies tab

## Next Steps

1. ✅ Verify your DATABASE_URL is in correct format (Session Mode recommended)
2. ✅ Apply the RLS migration via Supabase Dashboard
3. ✅ Test your backend APIs to ensure they still work
4. ✅ Re-run Supabase security linter to verify all issues resolved
5. ✅ Monitor application logs for any unexpected errors

## Support Resources

- Supabase Connection Strings: https://supabase.com/docs/guides/database/connecting-to-postgres
- Row Level Security: https://supabase.com/docs/guides/auth/row-level-security
- PostgreSQL Roles: https://supabase.com/docs/guides/database/postgres/roles

---

**Important:** Keep your DATABASE_URL secure and never commit it to git. Your .gitignore should already exclude .env files.
