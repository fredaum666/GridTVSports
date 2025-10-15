# AI Build Prompt: Multi-Sport Live Games & Sports Bar Mode Application

## Project Overview
Build a comprehensive real-time sports monitoring web application supporting **NFL, NBA, MLB, and NHL** with two primary viewing modes:
1. **Standard Live Games View** - Scrollable list showing all live and upcoming games with detailed statistics for each sport
2. **Sports Bar Mode** - Full-screen multi-game grid view (2/4/6 games simultaneously) optimized for watching multiple games at once across all sports

**Design Reference**: Follow the exact layout, styling, and functionality pattern from `LiveGames.html` (attached) for consistency across all sports.

---

## Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: NOT REQUIRED (in-memory caching only)
- **API**: ESPN API (FREE - No tracking needed)
- **Cron Jobs**: node-cron for scheduled background updates
- **Dependencies**: express, axios, cors, node-cron

### Frontend  
- **Pure HTML/CSS/JavaScript** (no frameworks like React/Vue)
- **Design Pattern**: Match LiveGames.html structure exactly
- **Responsive Design**: Mobile-first approach
- **Real-time Updates**: 15-second polling intervals
- **Animations**: CSS keyframes for score changes and play alerts

---

## ESPN API Integration (FREE - No Limits)

### NFL Endpoints
```javascript
// Scoreboard
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
Params: ?week=1 (optional)

// Game Summary
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary
Params: ?event={gameId}
```

### NBA Endpoints
```javascript
// Scoreboard
GET https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
Params: ?dates=20241014 (YYYYMMDD format)

// Game Summary
GET https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary
Params: ?event={gameId}
```

### MLB Endpoints
```javascript
// Scoreboard
GET https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard
Params: ?dates=20241014 (YYYYMMDD format)

// Game Summary
GET https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary
Params: ?event={gameId}
```

### NHL Endpoints
```javascript
// Scoreboard
GET https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard
Params: ?dates=20241014 (YYYYMMDD format)

// Game Summary
GET https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/summary
Params: ?event={gameId}
```

---

## Server-Side Implementation

### Backend Structure (server.js)

```javascript
const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// SMART CACHING SYSTEM (In-Memory)
// ============================================

const sportsCache = {
  nfl: { data: new Map(), activeWeeks: new Set() },
  nba: { data: new Map(), activeDates: new Set() },
  mlb: { data: new Map(), activeDates: new Set() },
  nhl: { data: new Map(), activeDates: new Set() },
  CACHE_DURATION: 15000, // 15 seconds for live games
  COMPLETED_CACHE_DURATION: 3600000 // 1 hour for completed
};

// ============================================
// ESPN API HELPERS
// ============================================

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

async function fetchESPN(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'GridTVSports/2.0' }
    });
    return response.data;
  } catch (error) {
    console.error(`ESPN API Error: ${error.message}`);
    throw error;
  }
}

// ============================================
// NFL HELPERS
// ============================================

function getCurrentNFLWeek() {
  const seasonStart = new Date('2024-09-05');
  const now = new Date();
  const diffDays = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return Math.max(1, Math.min(week, 18));
}

function areAllGamesComplete(scoreboard) {
  if (!scoreboard || !scoreboard.events) return false;
  return scoreboard.events.every(e => e.status?.type?.state === 'post');
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
// API ROUTES - NBA
// ============================================

app.get('/api/nba/scoreboard', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0].replace(/-/g, '');
    const cacheKey = `date-${date}`;
    const cached = sportsCache.nba.data.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
      return res.json(cached.data);
    }

    const url = `${ESPN_BASE}/basketball/nba/scoreboard?dates=${date}`;
    const data = await fetchESPN(url);
    const isComplete = areAllGamesComplete(data);

    sportsCache.nba.data.set(cacheKey, { data, timestamp: now, isComplete });
    
    if (!isComplete) {
      sportsCache.nba.activeDates.add(date);
    } else {
      sportsCache.nba.activeDates.delete(date);
    }

    res.json(data);
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
// API ROUTES - MLB
// ============================================

app.get('/api/mlb/scoreboard', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0].replace(/-/g, '');
    const cacheKey = `date-${date}`;
    const cached = sportsCache.mlb.data.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
      return res.json(cached.data);
    }

    const url = `${ESPN_BASE}/baseball/mlb/scoreboard?dates=${date}`;
    const data = await fetchESPN(url);
    const isComplete = areAllGamesComplete(data);

    sportsCache.mlb.data.set(cacheKey, { data, timestamp: now, isComplete });
    
    if (!isComplete) {
      sportsCache.mlb.activeDates.add(date);
    } else {
      sportsCache.mlb.activeDates.delete(date);
    }

    res.json(data);
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
    const date = req.query.date || new Date().toISOString().split('T')[0].replace(/-/g, '');
    const cacheKey = `date-${date}`;
    const cached = sportsCache.nhl.data.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < sportsCache.CACHE_DURATION) {
      return res.json(cached.data);
    }

    const url = `${ESPN_BASE}/hockey/nhl/scoreboard?dates=${date}`;
    const data = await fetchESPN(url);
    const isComplete = areAllGamesComplete(data);

    sportsCache.nhl.data.set(cacheKey, { data, timestamp: now, isComplete });
    
    if (!isComplete) {
      sportsCache.nhl.activeDates.add(date);
    } else {
      sportsCache.nhl.activeDates.delete(date);
    }

    res.json(data);
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
// CACHE STATUS
// ============================================

app.get('/api/cache-status', (req, res) => {
  res.json({
    nfl: {
      activeWeeks: Array.from(sportsCache.nfl.activeWeeks),
      cachedCount: sportsCache.nfl.data.size
    },
    nba: {
      activeDates: Array.from(sportsCache.nba.activeDates),
      cachedCount: sportsCache.nba.data.size
    },
    mlb: {
      activeDates: Array.from(sportsCache.mlb.activeDates),
      cachedCount: sportsCache.mlb.data.size
    },
    nhl: {
      activeDates: Array.from(sportsCache.nhl.activeDates),
      cachedCount: sportsCache.nhl.data.size
    }
  });
});

// ============================================
// BACKGROUND JOBS - Update Active Games
// ============================================

async function updateNFLCache() {
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
        console.log(`✅ NFL Week ${week} complete - removed from active`);
      }
    } catch (error) {
      console.error(`❌ Error updating NFL week ${week}:`, error.message);
    }
  }
}

async function updateNBACache() {
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
        console.log(`✅ NBA ${date} complete - removed from active`);
      }
    } catch (error) {
      console.error(`❌ Error updating NBA ${date}:`, error.message);
    }
  }
}

async function updateMLBCache() {
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
        console.log(`✅ MLB ${date} complete - removed from active`);
      }
    } catch (error) {
      console.error(`❌ Error updating MLB ${date}:`, error.message);
    }
  }
}

async function updateNHLCache() {
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
        console.log(`✅ NHL ${date} complete - removed from active`);
      }
    } catch (error) {
      console.error(`❌ Error updating NHL ${date}:`, error.message);
    }
  }
}

// Run every 15 seconds
cron.schedule('*/15 * * * * *', async () => {
  console.log('🔄 Updating active games...');
  await Promise.all([
    updateNFLCache(),
    updateNBACache(),
    updateMLBCache(),
    updateNHLCache()
  ]);
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🏈🏀⚾🏒 Multi-Sport GridTV Server');
  console.log('='.repeat(50));
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`API: ESPN (FREE - No limits)`);
  console.log(`Sports: NFL, NBA, MLB, NHL`);
  console.log('='.repeat(50));
});
```

---

## Frontend HTML Structure

### Main Navigation (index.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GridTV Sports - Multi-Sport Live Games</title>
  <link rel="stylesheet" href="styles/main.css">
</head>
<body>
  <div class="header">
    <h1>🏈🏀⚾🏒 GridTV Sports</h1>
    <nav class="sport-nav">
      <button class="sport-btn active" data-sport="nfl">🏈 NFL</button>
      <button class="sport-btn" data-sport="nba">🏀 NBA</button>
      <button class="sport-btn" data-sport="mlb">⚾ MLB</button>
      <button class="sport-btn" data-sport="nhl">🏒 NHL</button>
    </nav>
  </div>
  
  <main id="main-content">
    <!-- Sport-specific content loaded here -->
  </main>
</body>
</html>
```

### Sport Pages (Follow LiveGames.html Pattern)

Create separate HTML files for each sport, following the **exact structure** from LiveGames.html:

#### 1. NFL.html (Use LiveGames.html as template)
- Quarter-by-quarter scoring
- Down & Distance display
- Field position
- Possession indicator
- Live play animations (touchdown, field goal, interception, fumble)

#### 2. NBA.html (Adapted from LiveGames.html)
- Quarter-by-quarter scoring (Q1, Q2, Q3, Q4, OT)
- Current time remaining in quarter
- Team fouls
- Possession indicator
- Leading scorers for each team
- Play animations (3-pointer, dunk, block, steal)

#### 3. MLB.html (Adapted from LiveGames.html)
- Inning-by-inning scoring (9+ innings)
- Current inning (Top/Bottom)
- Balls, Strikes, Outs
- Runners on base indicator
- Pitcher stats (ERA, Strikeouts)
- Batter stats (AVG, HR, RBI)
- Play animations (home run, strikeout, stolen base, double play)

#### 4. NHL.html (Adapted from LiveGames.html)
- Period-by-period scoring (P1, P2, P3, OT, SO)
- Current time remaining in period
- Shots on goal
- Power play indicator
- Penalty information
- Leading scorers
- Play animations (goal, penalty, save, fight)

---

## Sports Bar Mode - Sport-Specific Features

### NFL Sports Bar Mode
```javascript
// Display Elements
- Quarter & time clock
- Down & Distance & Field Position
- Team logos & scores (large)
- Possession indicator (animated football)
- Red zone indicator
- Play animations:
  * Touchdown: Gold/Green explosion
  * Field Goal: Blue arc
  * Interception: Red flash
  * Safety: Purple flash
```

### NBA Sports Bar Mode
```javascript
// Display Elements
- Quarter & time clock
- Team logos & scores (large)
- Team fouls
- Leading scorer for each team
- Possession indicator (animated basketball)
- Play animations:
  * 3-Pointer: Orange arc with "BANG!"
  * Dunk: Purple slam effect
  * Block: Red "REJECTED!"
  * Buzzer Beater: Gold explosion
```

### MLB Sports Bar Mode
```javascript
// Display Elements
- Inning (Top/Bottom)
- Outs, Balls, Strikes
- Team logos & scores (large)
- Runners on base (diamond graphic)
- Current pitcher & batter
- Play animations:
  * Home Run: Gold trail with fireworks
  * Strikeout: Red "K"
  * Stolen Base: Green speed lines
  * Double Play: Blue "DP!"
```

### NHL Sports Bar Mode
```javascript
// Display Elements
- Period & time clock
- Team logos & scores (large)
- Shots on goal
- Power play indicator
- Goalie saves
- Play animations:
  * Goal: Red horn flash
  * Penalty: Yellow card effect
  * Hat Trick: Falling hats animation
  * Overtime Goal: Sudden death gold flash
```

---

## CSS Design Requirements

### Follow LiveGames.html Styling Exactly:

1. **Color Scheme**
   - Background: `#0a0e1a` (dark blue-black)
   - Cards: `linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)`
   - Text: `#e0e0e0` (light gray)
   - Accent: `#17a2b8` (cyan)
   - Live indicator: `#dc2626` (red)
   - Winning team: `#22c55e` (green)

2. **Game Card Layout** (from LiveGames.html)
   ```css
   .game-card {
     background: linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%);
     border-radius: 12px;
     padding: 20px;
     border: 2px solid #334155;
     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
   }
   ```

3. **Fullscreen Grid** (from LiveGames.html)
   ```css
   .fullscreen-grid.grid-2 { grid-template-columns: repeat(2, 1fr); }
   .fullscreen-grid.grid-4 { grid-template-columns: repeat(2, 1fr); }
   .fullscreen-grid.grid-6 { grid-template-columns: repeat(3, 1fr); }
   ```

4. **Animations** (from LiveGames.html)
   - Score update pulse
   - Play animations (fadeOut, bounceScale, gradientShift)
   - Live indicator blink
   - Refresh spin

---

## JavaScript Implementation

### Core Functions (Apply to All Sports)

```javascript
// 1. Fetch scoreboard with caching
async function fetchScoreboard(sport) {
  const response = await fetch(`/api/${sport}/scoreboard`);
  return response.json();
}

// 2. Render games list
function renderGamesList(games, sport) {
  // Use LiveGames.html renderGamesList pattern
  // Adapt for sport-specific stats
}

// 3. Sports Bar Mode
function enterSportsBarMode(sport, selectedGames, layout) {
  // Use LiveGames.html fullscreen pattern
  // Show sport-specific stats in each card
}

// 4. Play animations
function showPlayAnimation(card, playType) {
  // Use LiveGames.html animation system
  // Customize icons/text per sport
}

// 5. Auto-refresh (15 seconds)
setInterval(() => fetchScoreboard(currentSport), 15000);
```

### Sport-Specific Rendering

```javascript
// NFL
function renderNFLGame(game) {
  // Quarter-by-quarter scores
  // Down & distance
  // Field position
}

// NBA
function renderNBAGame(game) {
  // Quarter-by-quarter scores
  // Leading scorers
  // Team fouls
}

// MLB
function renderMLBGame(game) {
  // Inning-by-inning scores
  // Count (balls/strikes/outs)
  // Runners on base
}

// NHL
function renderNHLGame(game) {
  // Period-by-period scores
  // Shots on goal
  // Power play status
}
```

---

## File Structure

```
GridTVSports/
├── server.js              # Node.js backend (ESPN API)
├── package.json           # Dependencies
├── public/
│   ├── index.html         # Main navigation
│   ├── nfl.html          # NFL page (based on LiveGames.html)
│   ├── nba.html          # NBA page (based on LiveGames.html)
│   ├── mlb.html          # MLB page (based on LiveGames.html)
│   ├── nhl.html          # NHL page (based on LiveGames.html)
│   ├── styles/
│   │   ├── main.css      # Global styles
│   │   ├── nfl.css       # NFL-specific (from LiveGames.html)
│   │   ├── nba.css       # NBA-specific
│   │   ├── mlb.css       # MLB-specific
│   │   └── nhl.css       # NHL-specific
│   └── scripts/
│       ├── common.js     # Shared functions
│       ├── nfl.js        # NFL logic
│       ├── nba.js        # NBA logic
│       ├── mlb.js        # MLB logic
│       └── nhl.js        # NHL logic
└── README.md
```

---

## Key Requirements Summary

✅ **4 Sports**: NFL, NBA, MLB, NHL  
✅ **ESPN API Only**: Free, no tracking needed  
✅ **Design**: Follow LiveGames.html exactly  
✅ **Sports Bar Mode**: 2/4/6 grids for all sports  
✅ **Pure HTML/CSS/JS**: No React/frameworks  
✅ **Smart Caching**: In-memory, 15-second updates  
✅ **Animations**: Score changes, plays, live indicators  
✅ **Responsive**: Mobile to 4K displays  
✅ **No Database**: All data in-memory cache  
✅ **Sport-Specific Stats**: Each sport shows relevant data  

---

## ESPN API Response Structure

### Common Fields (All Sports)
```javascript
{
  events: [{
    id: "401547404",
    name: "Team A at Team B",
    date: "2024-10-14T20:00Z",
    status: {
      type: { state: "in" | "pre" | "post" },
      displayClock: "12:45",
      period: 2
    },
    competitions: [{
      competitors: [{
        homeAway: "home",
        team: {
          displayName: "Team Name",
          abbreviation: "TM",
          logo: "https://..."
        },
        score: "21",
        linescores: [
          { value: 7 },  // Q1/Period1/Inning1
          { value: 14 }  // Q2/Period2/Inning2
        ]
      }]
    }]
  }]
}
```

---

## Implementation Priority

1. ✅ Setup Node.js server with Express
2. ✅ Implement NFL (use LiveGames.html as exact template)
3. ✅ Test NFL Sports Bar Mode
4. ✅ Implement NBA (adapt LiveGames.html pattern)
5. ✅ Implement MLB (adapt LiveGames.html pattern)
6. ✅ Implement NHL (adapt LiveGames.html pattern)
7. ✅ Test all sports in Sports Bar Mode
8. ✅ Add sport-specific animations
9. ✅ Mobile responsive testing
10. ✅ Deploy to production

---

## Success Criteria

- ✅ All 4 sports display live games correctly
- ✅ Sports Bar Mode works with any combination of sports
- ✅ Design matches LiveGames.html styling
- ✅ 15-second auto-refresh works
- ✅ Play animations show for all sports
- ✅ No API rate limits (ESPN is free)
- ✅ Mobile responsive
- ✅ Fullscreen mode works on all devices

---

**START WITH NFL FIRST** - Use LiveGames.html as the exact template, then adapt the same pattern for NBA, MLB, and NHL!
