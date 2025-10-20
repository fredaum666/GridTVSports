# NBA Upcoming Games Fix

## Issue
NBA page was not showing upcoming games scheduled for tomorrow, even though they are within the 36-hour window.

## Root Cause
The NBA scoreboard endpoint in `server.js` was only fetching **yesterday and today**, but not **tomorrow**. This meant games scheduled for tomorrow couldn't be displayed as upcoming games.

## Changes Made

### 1. Added `getTomorrowDate()` Helper Function (server.js)
```javascript
function getTomorrowDate() {
  const now = new Date();
  now.setDate(now.getDate() + 1); // Add one day
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`; // YYYYMMDD
}
```

### 2. Updated NBA Scoreboard Endpoint (server.js lines 228-278)
**Before**: Fetched yesterday + today (2 days)
```javascript
const [todayUrl, yesterdayUrl] = [
  `${ESPN_BASE}/basketball/nba/scoreboard?dates=${today}`,
  `${ESPN_BASE}/basketball/nba/scoreboard?dates=${yesterday}`
];
```

**After**: Fetches yesterday + today + tomorrow (3 days)
```javascript
const [todayUrl, yesterdayUrl, tomorrowUrl] = [
  `${ESPN_BASE}/basketball/nba/scoreboard?dates=${today}`,
  `${ESPN_BASE}/basketball/nba/scoreboard?dates=${yesterday}`,
  `${ESPN_BASE}/basketball/nba/scoreboard?dates=${tomorrow}`
];
```

### 3. Updated Cache Cleanup Function (server.js lines 80-105)
**Before**: Only kept yesterday and today
```javascript
const validDates = new Set([today, yesterday]);
```

**After**: Keeps yesterday, today, and tomorrow
```javascript
const validDates = new Set([yesterday, today, tomorrow]);
```

### 4. Fixed NBA Live Game Detection Bug (nba.html lines 2062-2098)
**Same bug as NFL** - completed games were being marked as "live" because `period > 0` didn't exclude completed games.

**Before**:
```javascript
const isLive = statusState === 'in' || comp.status.period > 0;
```

**After**:
```javascript
const isLive = statusState === 'in' || (comp.status.period > 0 && !isCompleted && !isFinal);
```

### 5. Added Final Games Save Logic (nba.html)
**Before**: Completed games were excluded entirely
```javascript
if (isCompleted || isFinal) {
  console.log(`🏀 ${game.name}: COMPLETED - Excluded ❌`);
  return false;
}
```

**After**: Completed games saved to database for Final Games section
```javascript
if (isFinal || isCompleted) {
  fetch('/api/final-games/save', {
    method: 'POST',
    body: JSON.stringify({
      sport: 'nba',
      gameId: game.id,
      gameData: game
    })
  });
  console.log(`🏀 ${game.name}: COMPLETED - Will show in Final Games section ✅`);
}
```

## How It Works Now

### Date Window
The NBA scoreboard endpoint now fetches a **3-day rolling window**:
- **Yesterday**: Catch late games that might still be live
- **Today**: All of today's games (live or upcoming)
- **Tomorrow**: Upcoming games within 36 hours

### Game Display Logic
1. **Live Games**: `statusState === 'in'` OR `(period > 0 AND not completed)`
2. **Upcoming Games**: `statusState === 'pre'` AND within 36 hours
3. **Completed Games**: Saved to database, excluded from live section

### Example Timeline (Oct 20, 2025)
- **Yesterday (Oct 19)**: Late games might still be finishing
- **Today (Oct 20)**: All today's games (live or upcoming)
- **Tomorrow (Oct 21)**: Games starting within 36 hours show as "UPCOMING"

## Testing
To verify the fix:
1. Navigate to NBA page
2. Should see tomorrow's games with yellow "UPCOMING" badges
3. Game cards should show:
   - Team logos and names
   - Quarter-by-quarter scores (once games start)
   - Game start time badge (date and time)

## Similar Updates Needed
The same fix should be applied to:
- ❌ **MLB** (currently only fetches yesterday + today)
- ❌ **NHL** (currently only fetches yesterday + today)

Both MLB and NHL endpoints need:
1. `getTomorrowDate()` integration
2. Fetch tomorrow's games
3. Update cache cleanup to include tomorrow
4. Fix `period > 0` bug to exclude completed games
5. Add Final Games save logic

---
**Date**: January 2025  
**Status**: NBA FIXED - MLB and NHL pending same updates
