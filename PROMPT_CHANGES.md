# 🎯 AI Build Prompt - Updated for Multi-Sport Application

## ✅ What Changed

The AI_BUILD_PROMPT.md has been **completely rewritten** to match your requirements:

---

## 🏈🏀⚾🏒 Key Changes

### 1. **Multi-Sport Support**
- **Before**: NFL only
- **After**: NFL, NBA, MLB, NHL (all 4 sports)

### 2. **API Integration**
- **Before**: RapidAPI (paid, 9000 calls/day limit, tracking required)
- **After**: ESPN API (FREE, unlimited, no tracking needed)

### 3. **Design Pattern**
- **Before**: Generic structure
- **After**: **Follow LiveGames.html exactly** - same layout, styling, and functionality

### 4. **Technology Stack**
- **Before**: PostgreSQL database, JWT authentication, complex setup
- **After**: 
  - No database (in-memory caching only)
  - No authentication
  - Simple Node.js + Express
  - Pure HTML/CSS/JavaScript (no React)

### 5. **Sports Bar Mode**
- **Before**: NFL only
- **After**: Works with all 4 sports, each with sport-specific stats:
  - **NFL**: Down/Distance, Field Position, Quarter scores
  - **NBA**: Team fouls, Leading scorers, Quarter scores
  - **MLB**: Balls/Strikes/Outs, Runners on base, Inning scores
  - **NHL**: Shots on goal, Power play, Period scores

---

## 📋 New ESPN API Endpoints

### NFL
```
GET /api/nfl/scoreboard?week=18
GET /api/nfl/summary/:gameId
GET /api/nfl/current-week
```

### NBA
```
GET /api/nba/scoreboard?date=20241014
GET /api/nba/summary/:gameId
```

### MLB
```
GET /api/mlb/scoreboard?date=20241014
GET /api/mlb/summary/:gameId
```

### NHL
```
GET /api/nhl/scoreboard?date=20241014
GET /api/nhl/summary/:gameId
```

---

## 🎨 Design Requirements

### Exact Match to LiveGames.html:

1. **Color Scheme**
   - Dark background: `#0a0e1a`
   - Card gradient: `#1a1f2e` to `#2d3748`
   - Live red: `#dc2626`
   - Winning green: `#22c55e`

2. **Layout**
   - Game cards with team logos
   - Quarter/Period/Inning breakdown
   - Large scores
   - Status indicators

3. **Sports Bar Mode**
   - 2/4/6 grid layouts
   - Fullscreen with hover controls
   - Auto-refresh every 15 seconds
   - Sport-specific stats displayed

4. **Animations**
   - Score updates (pulse)
   - Play animations (touchdown, 3-pointer, home run, goal)
   - Live indicators (blink)
   - Refresh spinner

---

## 📁 New File Structure

```
GridTVSports/
├── server.js              # Multi-sport backend
├── public/
│   ├── index.html         # Sport navigation
│   ├── nfl.html          # NFL (LiveGames.html pattern)
│   ├── nba.html          # NBA (adapted)
│   ├── mlb.html          # MLB (adapted)
│   ├── nhl.html          # NHL (adapted)
│   ├── styles/
│   │   ├── main.css      # Global
│   │   ├── nfl.css       # NFL-specific
│   │   ├── nba.css       # NBA-specific
│   │   ├── mlb.css       # MLB-specific
│   │   └── nhl.css       # NHL-specific
│   └── scripts/
│       ├── common.js     # Shared
│       ├── nfl.js
│       ├── nba.js
│       ├── mlb.js
│       └── nhl.js
```

---

## 🎯 Sport-Specific Features

### NFL
- Down & Distance
- Field Position
- Possession indicator (animated football)
- Play types: Touchdown, Field Goal, Interception, Safety

### NBA
- Quarter times
- Team fouls
- Leading scorers
- Play types: 3-Pointer, Dunk, Block, Steal

### MLB  
- Balls, Strikes, Outs
- Runners on base (diamond graphic)
- Current pitcher/batter
- Play types: Home Run, Strikeout, Stolen Base, Double Play

### NHL
- Period times
- Shots on goal
- Power play indicator
- Play types: Goal, Penalty, Save, Hat Trick

---

## 🚀 Implementation Steps

1. ✅ Start with **NFL** using LiveGames.html as exact template
2. ✅ Get NFL working perfectly (standard + sports bar mode)
3. ✅ Adapt pattern for NBA
4. ✅ Adapt pattern for MLB
5. ✅ Adapt pattern for NHL
6. ✅ Test Sports Bar Mode with mixed sports
7. ✅ Add all sport-specific animations
8. ✅ Test responsive design
9. ✅ Deploy

---

## ✅ Key Benefits

| Feature | Before | After |
|---------|--------|-------|
| **Sports** | NFL only | 4 sports (NFL, NBA, MLB, NHL) |
| **API** | RapidAPI ($) | ESPN (FREE) |
| **API Tracking** | Required | Not needed |
| **Database** | PostgreSQL | None (in-memory) |
| **Auth** | JWT cookies | None |
| **Frontend** | Generic | LiveGames.html pattern |
| **Complexity** | High | Simple |
| **Setup Time** | Hours | Minutes |

---

## 🎨 Design Reference

**LiveGames.html** provides the complete pattern for:
- Game card layout
- Score display
- Team information
- Status indicators
- Fullscreen grid
- Hover controls
- Play animations
- Responsive design

**All 4 sports will use this same beautiful design!**

---

## 📝 Quick Start Commands

```bash
# 1. Install dependencies
npm install express axios cors node-cron

# 2. Create server.js (from prompt)

# 3. Create public/ folder with HTML files

# 4. Start server
node server.js

# 5. Open browser
http://localhost:3001
```

---

## 🎯 Success Criteria

- ✅ NFL, NBA, MLB, NHL all working
- ✅ Design matches LiveGames.html
- ✅ Sports Bar Mode works for all sports
- ✅ Can mix sports in Sports Bar Mode (e.g., NFL + NBA together)
- ✅ 15-second auto-refresh
- ✅ Sport-specific stats displayed correctly
- ✅ Animations for all play types
- ✅ Mobile responsive
- ✅ No API errors (ESPN is free)

---

## 🔥 Ready to Build!

The updated prompt provides:
1. ✅ Complete backend server code (Node.js + ESPN API)
2. ✅ Exact design pattern (LiveGames.html)
3. ✅ Sport-specific requirements
4. ✅ File structure
5. ✅ Implementation priority
6. ✅ Success criteria

**You can now start building the complete multi-sport application!** 🏈🏀⚾🏒
