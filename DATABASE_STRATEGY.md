# 💾 Database Strategy for GridTV Sports

## Current Architecture
- ✅ In-memory caching (15s for live, 1hr for completed)
- ✅ Background jobs updating every 15 seconds
- ❌ No persistent storage
- ❌ Data lost on server restart
- ❌ No historical data

---

## 🎯 What to Store in Database

### 1. **Game Results & Historical Data** (HIGH PRIORITY)
**Why**: Completed games don't change, perfect for permanent storage

**Tables**:
```sql
-- games table
CREATE TABLE games (
  id VARCHAR(50) PRIMARY KEY,
  sport VARCHAR(10) NOT NULL, -- 'NFL', 'NBA', 'MLB', 'NHL'
  game_date DATE NOT NULL,
  week_number INT, -- NFL only
  season INT NOT NULL,
  status VARCHAR(20), -- 'scheduled', 'live', 'completed'
  home_team VARCHAR(100),
  away_team VARCHAR(100),
  home_score INT,
  away_score INT,
  raw_data JSONB, -- Full ESPN API response
  last_updated TIMESTAMP,
  INDEX idx_sport_date (sport, game_date),
  INDEX idx_status (status)
);
```

**Benefits**:
- ✅ No need to re-fetch completed games from ESPN
- ✅ Instant load for historical games
- ✅ Reduces ESPN API calls by 70-80%
- ✅ Data persists across server restarts

**Impact**: **HUGE** - Most API calls are for games that are already complete

---

### 2. **Team Information & Logos** (MEDIUM PRIORITY)
**Why**: Team data rarely changes, fetching repeatedly is wasteful

**Tables**:
```sql
-- teams table
CREATE TABLE teams (
  id VARCHAR(50) PRIMARY KEY,
  sport VARCHAR(10) NOT NULL,
  full_name VARCHAR(100),
  short_name VARCHAR(50),
  abbreviation VARCHAR(10),
  logo_url VARCHAR(500),
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  last_updated TIMESTAMP,
  INDEX idx_sport (sport)
);
```

**Benefits**:
- ✅ Consistent logo URLs
- ✅ Faster page rendering
- ✅ Fallback if ESPN CDN is down
- ✅ Can add custom branding/colors

**Impact**: **MEDIUM** - Improves UX, reduces external dependencies

---

### 3. **Game Statistics Cache** (MEDIUM PRIORITY)
**Why**: Detailed stats don't change frequently during live games

**Tables**:
```sql
-- game_stats table
CREATE TABLE game_stats (
  game_id VARCHAR(50),
  team_id VARCHAR(50),
  stat_type VARCHAR(50), -- 'passing', 'rushing', 'scoring', etc.
  stat_value JSONB,
  quarter_period INT,
  last_updated TIMESTAMP,
  PRIMARY KEY (game_id, team_id, stat_type),
  FOREIGN KEY (game_id) REFERENCES games(id)
);
```

**Benefits**:
- ✅ Reduce detailed stat API calls
- ✅ Cache box scores, leaders, etc.
- ✅ Historical stat analysis possible
- ✅ Better for modal/detail views

**Impact**: **MEDIUM** - Reduces API calls for game details by 50%

---

### 4. **Play-by-Play Data** (LOW-MEDIUM PRIORITY)
**Why**: Historical plays are interesting for analysis but not critical

**Tables**:
```sql
-- plays table
CREATE TABLE plays (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(50),
  play_number INT,
  quarter_period INT,
  clock VARCHAR(20),
  play_type VARCHAR(50), -- 'touchdown', 'field_goal', '3-pointer', etc.
  description TEXT,
  home_score INT,
  away_score INT,
  created_at TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id),
  INDEX idx_game_id (game_id)
);
```

**Benefits**:
- ✅ Replay game timeline
- ✅ Analyze scoring patterns
- ✅ Show "key plays" highlights
- ✅ No need to re-fetch for completed games

**Impact**: **MEDIUM** - Good for features, reduces API load

---

### 5. **User Preferences** (LOW PRIORITY - Future)
**Why**: Personalization improves UX

**Tables**:
```sql
-- user_preferences table
CREATE TABLE user_preferences (
  user_id VARCHAR(50) PRIMARY KEY,
  favorite_teams JSONB, -- ['Lakers', 'Cowboys', ...]
  favorite_sports JSONB, -- ['NBA', 'NFL']
  default_layout VARCHAR(10), -- '2', '4', '6'
  theme VARCHAR(20), -- 'dark', 'light'
  auto_refresh BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Benefits**:
- ✅ Remember Sports Bar Mode preferences
- ✅ Filter games by favorite teams
- ✅ Personalized notifications
- ✅ Better user retention

**Impact**: **LOW** (no users yet) - **HIGH** (once app grows)

---

### 6. **API Request Log** (LOW PRIORITY - Analytics)
**Why**: Monitor ESPN API usage and performance

**Tables**:
```sql
-- api_logs table
CREATE TABLE api_logs (
  id SERIAL PRIMARY KEY,
  sport VARCHAR(10),
  endpoint VARCHAR(200),
  response_time_ms INT,
  status_code INT,
  error_message TEXT,
  created_at TIMESTAMP,
  INDEX idx_sport_created (sport, created_at),
  INDEX idx_endpoint (endpoint)
);
```

**Benefits**:
- ✅ Track API performance
- ✅ Identify slow endpoints
- ✅ Debug API errors
- ✅ Usage analytics

**Impact**: **LOW** - Nice to have for monitoring

---

## 📊 Impact Analysis

### Without Database (Current):
```
ESPN API Calls per Day:
- Live games refresh: 240 calls/hour × 6 hours = 1,440 calls
- Completed games re-fetch: 200 calls/hour × 18 hours = 3,600 calls
- Detail views: ~500 calls/day
Total: ~5,540 calls/day
```

### With Database (Optimized):
```
ESPN API Calls per Day:
- Live games refresh: 240 calls/hour × 6 hours = 1,440 calls
- Completed games (from DB): 0 calls
- Detail views (70% from DB): ~150 calls/day
Total: ~1,590 calls/day

Reduction: 71% fewer API calls! 🎉
```

---

## 🚀 Implementation Priority

### Phase 1: **Essential** (Implement First)
1. ✅ **Games table** - Store completed games
2. ✅ **Teams table** - Cache team info
3. ✅ **Game stats table** - Cache box scores

**Effort**: 2-3 days  
**Impact**: 70% reduction in API calls

### Phase 2: **Enhancement** (Implement Later)
4. ✅ **Plays table** - Store play-by-play
5. ✅ **User preferences** - Personalization

**Effort**: 1-2 days  
**Impact**: Better UX, features

### Phase 3: **Analytics** (Optional)
6. ✅ **API logs** - Monitoring

**Effort**: 1 day  
**Impact**: Observability

---

## 🛠️ Recommended Tech Stack

### Option 1: **PostgreSQL** (Recommended)
**Pros**:
- ✅ JSONB support (perfect for ESPN API data)
- ✅ Powerful indexing
- ✅ Battle-tested reliability
- ✅ Free tier on Heroku, Railway, Supabase

**Cons**:
- ⚠️ More setup required
- ⚠️ Need connection pooling

### Option 2: **MongoDB**
**Pros**:
- ✅ Schema-less (flexible for API data)
- ✅ JSON native
- ✅ Easy to set up
- ✅ Free tier on MongoDB Atlas

**Cons**:
- ⚠️ Less relational (harder for complex queries)
- ⚠️ Larger storage footprint

### Option 3: **SQLite** (Simple Start)
**Pros**:
- ✅ No server needed
- ✅ File-based
- ✅ Zero configuration
- ✅ Fast for reads

**Cons**:
- ⚠️ Single writer (concurrency issues)
- ⚠️ Not ideal for production at scale

**Recommendation**: **PostgreSQL** for production, **SQLite** for quick start

---

## 💡 Caching Strategy with Database

### Hybrid Approach (Best Performance):
```javascript
async function getGameData(gameId, sport) {
  // 1. Check in-memory cache (fastest)
  if (memoryCache.has(gameId)) {
    return memoryCache.get(gameId);
  }
  
  // 2. Check database (fast)
  const dbGame = await db.query('SELECT * FROM games WHERE id = ?', [gameId]);
  if (dbGame && dbGame.status === 'completed') {
    memoryCache.set(gameId, dbGame); // Cache in memory
    return dbGame;
  }
  
  // 3. Fetch from ESPN API (slow)
  const apiData = await fetchESPN(sport, gameId);
  
  // 4. Store in database
  await db.query('INSERT INTO games ... ON CONFLICT UPDATE', apiData);
  
  // 5. Cache in memory
  memoryCache.set(gameId, apiData);
  
  return apiData;
}
```

### Cache Layers:
1. **Memory**: 15 seconds (live games)
2. **Database**: Permanent (completed games)
3. **ESPN API**: Fallback

---

## 📈 Expected Performance Improvements

| Metric | Before DB | With DB | Improvement |
|--------|-----------|---------|-------------|
| **API Calls/Day** | 5,540 | 1,590 | **71% ↓** |
| **Page Load Time** | 800ms | 120ms | **85% ↓** |
| **Server Restart Recovery** | Lost all data | Instant | **100% ↑** |
| **Historical Games** | Re-fetch each time | Instant | **100% ↑** |
| **Data Persistence** | None | Full | **∞% ↑** |

---

## 🎯 Quick Win Implementation

### Start with Games Table Only:
```javascript
// server.js - Add this
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Update cache to check DB first
async function getCachedGame(gameId, sport) {
  // Check DB for completed games
  const result = await pool.query(
    'SELECT * FROM games WHERE id = $1 AND status = $2',
    [gameId, 'completed']
  );
  
  if (result.rows.length > 0) {
    return result.rows[0].raw_data; // Return stored ESPN data
  }
  
  return null; // Fetch from API
}
```

**Effort**: 2 hours  
**Impact**: Immediate 50-60% reduction in API calls

---

## 🎬 Summary

### Must Store:
1. ✅ **Completed games** - Biggest impact
2. ✅ **Team data** - Second biggest impact
3. ✅ **Game statistics** - Third biggest impact

### Nice to Store:
4. ⚠️ **Play-by-play** - Good for features
5. ⚠️ **User preferences** - Future growth
6. ⚠️ **API logs** - Monitoring

### Don't Store:
- ❌ Live game data (changes too frequently)
- ❌ Current scores (use in-memory cache)
- ❌ Active game situations (15-second refresh already handles this)

---

## 🚦 Action Plan

### This Week:
1. Add PostgreSQL (Supabase free tier)
2. Create `games` table
3. Store completed games automatically
4. Update cache to check DB first

### Next Week:
1. Add `teams` table
2. Add `game_stats` table
3. Implement hybrid caching

### Future:
1. Add user preferences
2. Add play-by-play storage
3. Add analytics

---

**Bottom Line**: Storing **completed games** in a database would reduce ESPN API calls by **70%+** and make the app much faster and more reliable! 🚀
