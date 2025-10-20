# Final Games Feature - Week-Based Display Logic

## Overview
This document explains how final games are displayed differently in **Mixed Sports Bar Mode** vs **Individual Sport Pages**.

## Two Different Display Systems

### 1. Mixed Sports Bar Mode (LiveGames.html)
**Purpose**: Show only games that are currently relevant for live sports bar viewing

**Display Rules**:
- ✅ **Live games**: Show immediately
- ✅ **Upcoming games**: Show within next time window
- ✅ **Final games**: Show for **2 hours after completion**, then hide
- ❌ **Old final games**: Hide after 2-hour window expires

**Implementation**: Lines ~1671-1720 in LiveGames.html
```javascript
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const now = Date.now();

// Filter out completed games older than 2 hours
if (game.status.type.completed) {
  const gameEndTime = new Date(game.date).getTime();
  const timeSinceEnd = now - gameEndTime;
  
  if (timeSinceEnd > TWO_HOURS_MS) {
    return false; // Exclude from mixed mode
  }
}
```

### 2. Individual Sport Pages (nfl.html, nba.html, etc.)
**Purpose**: Show complete picture of current week's games

**Display Rules**:
- ✅ **Live games**: Show in "Live Games" section
- ✅ **Upcoming games**: Show in "Upcoming Games" section (within 36 hours)
- ✅ **Final games**: Show in "Final Games" section **for entire current week**
- ❌ **Previous week games**: Hide when week advances

**Implementation**: Lines 2153-2223 in nfl.html
```javascript
async function renderFinalGames() {
  const response = await fetch('/api/final-games/nfl');
  const { games } = await response.json();
  
  // Filter to only show current week
  const currentWeekGames = games.filter(game => game.week === currentWeek);
  
  // Display all final games from current week
  currentWeekGames.forEach(game => {
    // Render final game card
  });
}
```

## Game Lifecycle Example (NFL Week 7)

### Thursday Night Game (Oct 17)
- **Thursday 8:00 PM**: Game is LIVE → Shows in Live section
- **Thursday 11:30 PM**: Game ends → Saved to database, shows in Final Games section
- **Friday 1:30 AM**: 2 hours elapsed → Hidden from Mixed Sports Bar Mode
- **Sunday-Monday**: Still shows in NFL page Final Games section (same week)
- **Tuesday (Week 8 starts)**: Hidden from Final Games section (previous week)

### Sunday Games (Oct 20)
- **Sunday 1:00 PM**: 13 games LIVE → Show in Live section
- **Sunday 4:30 PM**: Early games finish → Saved to database, show in Final Games section
- **Sunday 6:30 PM**: 2 hours elapsed → Hidden from Mixed Sports Bar Mode
- **Sunday-Monday**: Still show in NFL page Final Games section (same week)
- **Tuesday (Week 8 starts)**: Hidden from Final Games section (previous week)

### Monday Night Game (Oct 21)
- **Monday 8:00 PM**: Game is LIVE → Shows in Live section
- **Monday 11:30 PM**: Game ends → Saved to database, shows in Final Games section
- **Tuesday 1:30 AM**: 2 hours elapsed → Hidden from Mixed Sports Bar Mode
- **Tuesday (Week 8 starts)**: Week 7 ends, ALL Week 7 final games hidden

## Database Storage

### Save Endpoint: POST /api/final-games/save
**When called**: Immediately when a game's status becomes "Final" or "Completed"

**Payload**:
```javascript
{
  sport: 'nfl',
  gameId: '401671760',
  gameData: { /* full game object */ },
  week: 7
}
```

**Storage Structure**:
```javascript
finalGamesStore = {
  nfl: Map {
    '401671760' => { ...gameData, savedAt: 1729468800000, week: 7 },
    '401671761' => { ...gameData, savedAt: 1729468900000, week: 7 },
    // ... more games
  },
  nba: Map { ... },
  mlb: Map { ... },
  nhl: Map { ... }
}
```

### Retrieve Endpoint: GET /api/final-games/:sport
**Returns**: ALL final games for the sport (client filters by week)

**Response**:
```javascript
{
  games: [
    { ...gameData, savedAt: 1729468800000, week: 7 },
    { ...gameData, savedAt: 1729468900000, week: 7 },
    { ...gameData, savedAt: 1728864000000, week: 6 } // Previous week
  ],
  count: 3
}
```

**Client-side filtering**:
```javascript
const currentWeekGames = games.filter(game => game.week === currentWeek);
```

### Clear Endpoint: DELETE /api/final-games/clear/:sport
**Purpose**: Clean up old games when week advances

**Usage**:
```javascript
// Clear all games for a sport
DELETE /api/final-games/clear/nfl

// Clear specific week (optional)
DELETE /api/final-games/clear/nfl?week=6
```

## Current Status (Oct 20, 2025 - Week 7)

### What's Working ✅
- Mixed Sports Bar Mode: 2-hour filter active in LiveGames.html
- NFL Page: Final games saved to database when completed
- NFL Page: Final games filtered to show only current week
- Server API: All three endpoints (save, get, clear) functional

### What Needs Implementation ⏳
1. **Week advance detection**: Automatically clear previous week's games
2. **NBA/MLB/NHL pages**: Apply same final games logic
3. **Clear old games**: Call DELETE endpoint when new week starts

## Week Advance Logic (To Be Implemented)

### Detection Strategy
```javascript
// Store last known week in localStorage
const lastKnownWeek = localStorage.getItem('lastWeek');

if (lastKnownWeek && parseInt(lastKnownWeek) !== currentWeek) {
  console.log(`📅 Week changed from ${lastKnownWeek} to ${currentWeek}`);
  
  // Clear previous week's final games
  await fetch(`/api/final-games/clear/nfl?week=${lastKnownWeek}`, {
    method: 'DELETE'
  });
  
  // Update stored week
  localStorage.setItem('lastWeek', currentWeek);
}
```

### When to Check
- On page load (fetchLiveGames initialization)
- On auto-refresh interval (every 15 seconds)
- On manual refresh button click

## Testing Checklist

### Individual NFL Page
- [ ] Load page during week with some games completed
- [ ] Verify final games show in "Final Games" section
- [ ] Verify live games show in "Live Games" section  
- [ ] Verify upcoming games show in "Upcoming Games" section
- [ ] Wait for week to advance (or manually change currentWeek)
- [ ] Verify previous week's final games disappear

### Mixed Sports Bar Mode
- [ ] Load LiveGames.html within 2 hours of game ending
- [ ] Verify game appears in selection
- [ ] Wait 2 hours after game end
- [ ] Verify game disappears from selection

### Database Persistence
- [ ] Verify games saved when status changes to Final
- [ ] Refresh page, verify final games still display
- [ ] Check console for save confirmations
- [ ] Verify week property saved correctly

---
**Date**: January 2025  
**Status**: NFL page implemented, other sports pending
