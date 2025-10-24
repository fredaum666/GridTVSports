# Timeout Bars Fix - NFL Games

> **Note**: This document covers NFL timeout bars specifically. For NBA timeout bars implementation and API limitations, see [NBA_TIMEOUT_BARS_IMPLEMENTATION.md](NBA_TIMEOUT_BARS_IMPLEMENTATION.md).

## Issue

Timeout bars on live NFL games were not updating correctly with the ESPN API data.

## Root Cause

The code was looking for timeout data in the wrong location:

**❌ Old (Incorrect) Code:**
```javascript
const awayTimeouts = awayTeam?.timeoutsUsed !== undefined ? 3 - (awayTeam.timeoutsUsed || 0) : 3;
const homeTimeouts = homeTeam?.timeoutsUsed !== undefined ? 3 - (homeTeam.timeoutsUsed || 0) : 3;
```

The code was trying to find `timeoutsUsed` on the competitor object, but this property doesn't exist in the ESPN API response.

## ESPN API Structure

Looking at a live game (MIN @ LAC), the actual API structure is:

```json
{
  "competitions": [{
    "situation": {
      "homeTimeouts": 2,
      "awayTimeouts": 3,
      "possession": "24",
      ...
    }
  }]
}
```

The timeout information is in `situation.homeTimeouts` and `situation.awayTimeouts`, NOT in the competitor objects.

## Solution

Updated the code to use the correct API structure:

**✅ New (Correct) Code:**
```javascript
// Get timeout information - ESPN API provides this in the situation object
const awayTimeouts = comp?.situation?.awayTimeouts ?? 3;
const homeTimeouts = comp?.situation?.homeTimeouts ?? 3;
```

## Files Modified

### 1. [nfl.html](public/nfl.html)

**Line 3660-3662:** Fixed initial timeout rendering
```javascript
// Old
const awayTimeouts = awayTeam?.timeoutsUsed !== undefined ? 3 - (awayTeam.timeoutsUsed || 0) : 3;
const homeTimeouts = homeTeam?.timeoutsUsed !== undefined ? 3 - (homeTeam.timeoutsUsed || 0) : 3;

// New
const awayTimeouts = comp?.situation?.awayTimeouts ?? 3;
const homeTimeouts = comp?.situation?.homeTimeouts ?? 3;
```

**Line 4072-4074:** Fixed timeout updates during auto-refresh
```javascript
// Old
const awayTimeoutsRemaining = awayTeam?.timeoutsUsed !== undefined ? 3 - (awayTeam.timeoutsUsed || 0) : 3;
const homeTimeoutsRemaining = homeTeam?.timeoutsUsed !== undefined ? 3 - (homeTeam.timeoutsUsed || 0) : 3;

// New
const awayTimeoutsRemaining = comp?.situation?.awayTimeouts ?? 3;
const homeTimeoutsRemaining = comp?.situation?.homeTimeouts ?? 3;
```

### 2. [LiveGames.html](public/LiveGames.html)

**Line 2000-2002:** Fixed timeout rendering for mixed sports mode
```javascript
// Old
const awayTimeouts = awayTeam?.timeoutsUsed !== undefined ? 3 - (awayTeam.timeoutsUsed || 0) : 3;
const homeTimeouts = homeTeam?.timeoutsUsed !== undefined ? 3 - (homeTeam.timeoutsUsed || 0) : 3;

// New
const awayTimeouts = comp?.situation?.awayTimeouts ?? 3;
const homeTimeouts = comp?.situation?.homeTimeouts ?? 3;
```

Note: LiveGames.html's update function (`updateFullscreenGames()`) calls `renderFullscreenGames()` which re-renders all cards from scratch, so the fix to the initial rendering automatically fixes the updates too.

## How Timeout Bars Work

Each team in an NFL game gets 3 timeouts per half. The timeout bars display:

- **Filled bar** (white background): Timeout available
- **Empty bar** (transparent background): Timeout used

The bars are updated every 15 seconds during live games via the auto-refresh functionality.

## Testing

To verify the fix works:

1. **Open** `/nfl.html` during a live NFL game
2. **Click** "Sports Bar Mode"
3. **Select** a live game in fullscreen
4. **Check** the timeout bars under each team
5. **Wait** for a team to use a timeout during the game
6. **Verify** the timeout bar changes from filled to empty

The timeout bars should now accurately reflect the current timeout situation in live games.

## Example

For the MIN @ LAC game on 2025-10-23:
- **LA Chargers (Home)**: 2 timeouts remaining → 2 filled bars, 1 empty bar
- **Minnesota Vikings (Away)**: 3 timeouts remaining → 3 filled bars

## Benefits

✅ Timeout bars now display accurate real-time data
✅ Updates automatically during live games
✅ Uses correct ESPN API structure
✅ Works for both single-league and mixed sports bar modes
