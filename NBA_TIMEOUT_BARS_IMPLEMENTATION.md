# NBA and NFL Timeout Bars Implementation

## Overview

This document explains how timeout bars are implemented for NBA and NFL games, including ESPN API limitations and workarounds.

## NFL Timeout Bars - ✅ Real-Time Updates

### How It Works

NFL timeout data is provided by the ESPN API in real-time through the `situation` object:

```javascript
{
  "competitions": [{
    "situation": {
      "homeTimeouts": 2,    // Number of timeouts remaining
      "awayTimeouts": 3,    // Number of timeouts remaining
      "possession": "24",
      ...
    }
  }]
}
```

### Implementation

**File**: [nfl.html](public/nfl.html), [LiveGames.html](public/LiveGames.html)

```javascript
// Get timeout information from ESPN API
const awayTimeouts = comp?.situation?.awayTimeouts ?? 3;
const homeTimeouts = comp?.situation?.homeTimeouts ?? 3;
```

### NFL Timeout Rules

- Each team gets **3 timeouts per half**
- Timeouts reset at halftime
- Unused timeouts do NOT carry over to the next half
- Teams cannot have more than 3 timeouts at any time

### Display

**Bars Shown**: 3 timeout bars per team
- **Filled bar** (white background): Timeout available
- **Empty bar** (transparent background): Timeout used

### Auto-Update

Timeout bars update automatically every 15 seconds during live games via the ESPN API.

---

## NBA Timeout Bars - ⚠️ Static Display (API Limitation)

### ESPN API Limitation

**IMPORTANT**: The ESPN NBA API **does not provide real-time timeout counts** in the `situation` object or anywhere else in the API response.

#### What We Searched For

1. ✗ `situation.homeTimeouts` / `situation.awayTimeouts` - NOT available for NBA
2. ✗ `competitors[].timeoutsUsed` - NOT available
3. ✗ Box score statistics - NOT included
4. ✗ Play-by-play summary - Would require complex parsing

### Workaround Implementation

Since real-time data is unavailable, we display a **static indicator** showing all 7 timeouts as available:

```javascript
// NBA: ESPN API doesn't provide real-time timeout counts
if (game.sport === 'nba') {
  awayTimeouts = 7;  // Always show 7 (not updated)
  homeTimeouts = 7;  // Always show 7 (not updated)
}
```

### NBA Timeout Rules

- Each team gets **7 timeouts per game** (changed from 6 in 2017-18 season)
- No more than 4 timeouts in the 4th quarter
- Maximum of 2 timeouts in the final 3 minutes of regulation
- Maximum of 2 timeouts in the final 2 minutes of any overtime period

### Display

**Bars Shown**: 7 timeout bars per team
- All bars show as **filled** (available)
- Bars do **NOT update** during live games due to API limitation

**CSS Adjustments** for 7 bars:
```css
/* NBA timeout bars are smaller to fit 7 bars */
.fullscreen-game-card[data-sport="nba"] .timeout-bar {
  width: 16px;   /* vs 24px for NFL */
  height: 6px;   /* vs 8px for NFL */
  gap: 4px;      /* vs 6px for NFL */
}
```

### Why Static Display?

**Options Considered**:

1. **❌ Don't show timeout bars** - Removes useful visual element
2. **❌ Parse play-by-play** - Too complex, unreliable, performance impact
3. **❌ Use third-party API** - Additional dependencies, cost, rate limits
4. **✅ Show static 7 bars** - Simple, informative, honest about limitations

We chose option 4 because:
- Users know NBA teams have 7 timeouts
- Visual consistency with NFL implementation
- Clear documentation of limitation
- No misleading "fake" real-time updates

---

## Files Modified

### 1. [nfl.html](public/nfl.html)

**Lines 3660-3662**: Fixed initial timeout rendering
```javascript
// Old: Looked for non-existent timeoutsUsed property
const awayTimeouts = awayTeam?.timeoutsUsed !== undefined ? 3 - (awayTeam.timeoutsUsed || 0) : 3;

// New: Uses correct API structure
const awayTimeouts = comp?.situation?.awayTimeouts ?? 3;
```

**Lines 4072-4074**: Fixed timeout updates during auto-refresh
```javascript
// Old: Looked for non-existent timeoutsUsed property
const awayTimeoutsRemaining = awayTeam?.timeoutsUsed !== undefined ? 3 - (awayTeam.timeoutsUsed || 0) : 3;

// New: Uses correct API structure
const awayTimeoutsRemaining = comp?.situation?.awayTimeouts ?? 3;
```

### 2. [LiveGames.html](public/LiveGames.html)

**Lines 2000-2015**: Sport-specific timeout handling
```javascript
let awayTimeouts, homeTimeouts;
if (game.sport === 'nfl') {
  awayTimeouts = comp?.situation?.awayTimeouts ?? 3;  // Real-time from API
  homeTimeouts = comp?.situation?.homeTimeouts ?? 3;
} else if (game.sport === 'nba') {
  awayTimeouts = 7;  // Static - API doesn't provide
  homeTimeouts = 7;
}
```

**Lines 2077-2093**: Conditional timeout bar rendering (away team)
```javascript
${game.sport === 'nba' ? `
  <!-- 7 timeout bars for NBA -->
  <div class="timeout-bar ${awayTimeouts >= 1 ? '' : 'used'}"></div>
  <div class="timeout-bar ${awayTimeouts >= 2 ? '' : 'used'}"></div>
  ...
  <div class="timeout-bar ${awayTimeouts >= 7 ? '' : 'used'}"></div>
` : `
  <!-- 3 timeout bars for NFL -->
  <div class="timeout-bar ${awayTimeouts >= 1 ? '' : 'used'}"></div>
  <div class="timeout-bar ${awayTimeouts >= 2 ? '' : 'used'}"></div>
  <div class="timeout-bar ${awayTimeouts >= 3 ? '' : 'used'}"></div>
`}
```

**Lines 2108-2124**: Conditional timeout bar rendering (home team)
- Same structure as away team

**Lines 663-672**: NBA-specific CSS styling
```css
.fullscreen-game-card[data-sport="nba"] .timeout-bar {
  width: 16px;
  height: 6px;
  border-width: 1.5px;
}

.fullscreen-game-card[data-sport="nba"] .fullscreen-timeouts {
  gap: 4px;
}
```

**Line 2058**: Added data-sport attribute for CSS targeting
```javascript
div.dataset.sport = game.sport;
```

---

## Testing

### NFL Timeout Bars (Real-Time)

1. **Open** `/nfl.html` during a live NFL game
2. **Click** "Sports Bar Mode"
3. **Select** a live game and enter fullscreen
4. **Verify** timeout bars show correct count (check against live broadcast)
5. **Wait** for a team to use a timeout
6. **Verify** timeout bar changes from filled to empty (updates within 15 seconds)

**Example** (MIN @ LAC on 2025-10-23):
- LA Chargers: 2 timeouts → 2 filled bars, 1 empty bar ✅
- Minnesota Vikings: 3 timeouts → 3 filled bars ✅

### NBA Timeout Bars (Static)

1. **Open** `/LiveGames.html` during a live NBA game
2. **Click** "Open Sports Bar Mode"
3. **Select** an NBA game
4. **Verify** 7 timeout bars are shown for each team
5. **Verify** all bars remain filled throughout the game
6. **Verify** bars are smaller than NFL bars (16px vs 24px width)

**Example** (OKC @ IND on 2025-10-23):
- Indiana Pacers: 7 filled bars (static) ✅
- Oklahoma City Thunder: 7 filled bars (static) ✅

---

## User Communication

### Recommendations

When presenting this feature to users:

**NFL**:
- "Real-time timeout tracking"
- "Updates automatically every 15 seconds"
- "See exactly how many timeouts each team has remaining"

**NBA**:
- "Timeout indicator shows all 7 timeouts per team"
- "Note: ESPN API does not provide real-time NBA timeout counts"
- "For accurate timeout info, refer to the live broadcast"

---

## Future Enhancements

### Potential Improvements

1. **Manual Timeout Tracking** (Advanced)
   - Add buttons to manually decrement timeouts
   - Store in localStorage per game
   - Reset on page reload or game end

2. **Play-by-Play Parsing** (Complex)
   - Fetch play-by-play data from ESPN
   - Parse for timeout keywords
   - Auto-decrement when timeout detected
   - High complexity, potential for errors

3. **Third-Party API** (Cost)
   - Use NBA.com official API
   - Use SportsData.io or similar service
   - Requires API key, rate limits, potential cost

4. **WebSocket/Real-Time Feeds** (Advanced)
   - Listen to ESPN real-time feeds if available
   - Requires reverse engineering ESPN's WebSocket protocol
   - May violate terms of service

### Current Recommendation

Keep the static display until ESPN adds timeout counts to their NBA API. The current implementation is:
- ✅ Simple and maintainable
- ✅ Accurate to NBA rules (7 timeouts)
- ✅ Visually consistent with NFL
- ✅ Honest about limitations

---

## Summary

| Feature | NFL | NBA |
|---------|-----|-----|
| **Timeouts Per Game** | 3 per half (6 total) | 7 per game |
| **Bars Displayed** | 3 | 7 |
| **Real-Time Updates** | ✅ Yes (ESPN API) | ❌ No (API limitation) |
| **Data Source** | `situation.awayTimeouts` | Static value (7) |
| **Update Frequency** | Every 15 seconds | N/A |
| **Bar Size** | 24px × 8px | 16px × 6px |
| **Gap Between Bars** | 6px | 4px |

---

## Related Documentation

- [TIMEOUT_BARS_FIX.md](TIMEOUT_BARS_FIX.md) - NFL timeout bars fix
- [nfl.html](public/nfl.html) - NFL implementation
- [LiveGames.html](public/LiveGames.html) - Mixed sports implementation
- [ESPN NFL API Docs](https://gist.github.com/akeaswaran/b48b02f1c94f873c6655e7129910fc3b)
