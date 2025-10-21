# Timeout Indicators - Before & After

## The Problem

Mixed Sports Bar Mode (LiveGames.html) was missing timeout indicator blocks that appeared in the NFL page's Sports Bar Mode.

### Before - Mixed Sports Bar Mode
```
┌─────────────────────────────┐
│  🏈 NFL                      │
│                              │
│  Q4 - 2:35                   │
│                              │
│  Away Team          24       │
│  (missing timeouts)          │
│                              │
│         VS                   │
│                              │
│  Home Team          21       │
│  (missing timeouts)          │
│                              │
│  3rd & 7 at OPP 42          │
└─────────────────────────────┘
```

### After - Mixed Sports Bar Mode
```
┌─────────────────────────────┐
│  🏈 NFL                      │
│                              │
│  Q4 - 2:35                   │
│                              │
│  Away Team          24       │
│  ▬▬ ▬▬ ▬▬  ← Timeout bars    │
│                              │
│         VS                   │
│                              │
│  Home Team          21       │
│  ▬▬ __ __  ← 1 timeout used  │
│                              │
│  3rd & 7 at OPP 42          │
└─────────────────────────────┘
```

## Implementation

### CSS Added
```css
.fullscreen-timeouts {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
}

.timeout-bar {
  width: 24px;
  height: 8px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.9);
}

.timeout-bar.used {
  background: transparent;
}
```

### JavaScript Logic
```javascript
// Extract timeout data from ESPN API
const awayTimeouts = awayTeam?.timeoutsUsed !== undefined 
  ? 3 - (awayTeam.timeoutsUsed || 0) 
  : 3;
const homeTimeouts = homeTeam?.timeoutsUsed !== undefined 
  ? 3 - (homeTeam.timeoutsUsed || 0) 
  : 3;
```

### HTML Template
```html
<!-- Only show for NFL and NBA -->
${(game.sport === 'nfl' || game.sport === 'nba') ? `
  <div class="fullscreen-timeouts">
    <div class="timeout-bar ${awayTimeouts >= 1 ? '' : 'used'}"></div>
    <div class="timeout-bar ${awayTimeouts >= 2 ? '' : 'used'}"></div>
    <div class="timeout-bar ${awayTimeouts >= 3 ? '' : 'used'}"></div>
  </div>
` : ''}
```

## Timeout States

### All 3 Timeouts Remaining
```
▬▬ ▬▬ ▬▬
```
All bars filled (white background)

### 2 Timeouts Remaining
```
▬▬ ▬▬ __
```
First two filled, last empty

### 1 Timeout Remaining
```
▬▬ __ __
```
First filled, last two empty

### No Timeouts Remaining
```
__ __ __
```
All bars empty (transparent)

## Sport-Specific Display

### 🏈 NFL
```
✅ SHOWS TIMEOUTS
- 3 timeouts per half
- Critical game management
- Strategy indicator
```

### 🏀 NBA
```
✅ SHOWS TIMEOUTS
- Simplified 3-bar display
- Based on timeoutsUsed data
- Important for close games
```

### ⚾ MLB
```
❌ NO TIMEOUTS
- Baseball doesn't have timeouts
- Not applicable
- Indicator not shown
```

### 🏒 NHL
```
❌ NO TIMEOUTS (currently)
- Only 1 timeout per game
- Could be added if needed
- Not critical to show
```

## Real Game Examples

### NFL - Late Game Scenario
```
┌─────────────────────────────┐
│  Chiefs              27      │
│  ▬▬ __ __  (1 timeout)       │
│                              │
│         VS                   │
│                              │
│  Bills               24      │
│  ▬▬ ▬▬ ▬▬  (3 timeouts)      │
│                              │
│  Q4 - 1:45                   │
│  2nd & 10 at KC 38          │
└─────────────────────────────┘
```
**Analysis:** Bills have all timeouts, Chiefs down to 1

### NBA - Fourth Quarter
```
┌─────────────────────────────┐
│  Lakers              98      │
│  __ __ __  (0 timeouts)      │
│                              │
│         VS                   │
│                              │
│  Warriors            94      │
│  ▬▬ ▬▬ __  (2 timeouts)      │
│                              │
│  Q4 - 3:22                   │
└─────────────────────────────┘
```
**Analysis:** Warriors have timeout advantage late

## Comparison: NFL Page vs Mixed Mode

### NFL Page (nfl.html)
```javascript
// Has timeout indicators
const awayTimeouts = awayTeam?.timeoutsUsed !== undefined 
  ? 3 - (awayTeam.timeoutsUsed || 0) 
  : 3;

<div class="fullscreen-timeouts">
  <div class="timeout-bar ${awayTimeouts >= 1 ? '' : 'used'}"></div>
  <div class="timeout-bar ${awayTimeouts >= 2 ? '' : 'used'}"></div>
  <div class="timeout-bar ${awayTimeouts >= 3 ? '' : 'used'}"></div>
</div>
```

### Mixed Mode (LiveGames.html) - Before
```javascript
// Missing timeout indicators
// ❌ No timeout extraction
// ❌ No timeout HTML
```

### Mixed Mode (LiveGames.html) - After
```javascript
// Now has timeout indicators
// ✅ Timeout extraction added
// ✅ Timeout HTML added
// ✅ Sport-conditional (NFL/NBA only)
```

## Visual Consistency

### Before Fix
- ❌ NFL page: Has timeouts
- ❌ Mixed mode NFL: Missing timeouts
- ❌ Inconsistent experience

### After Fix
- ✅ NFL page: Has timeouts
- ✅ Mixed mode NFL: Has timeouts
- ✅ NBA also shows timeouts
- ✅ MLB/NHL correctly don't show
- ✅ Consistent experience

## Technical Details

### Bar Dimensions
- Width: 24px
- Height: 8px
- Border: 2px solid white
- Gap: 6px between bars
- Margin-top: 8px below team name

### Color States
- **Available:** White background (`rgba(255, 255, 255, 0.9)`)
- **Used:** Transparent background
- **Border:** Always visible (`rgba(255, 255, 255, 0.8)`)

### Animation
- Transition: `background 0.3s ease`
- Smooth fade when timeout is used

### Positioning
- Below team name/logo
- Above score
- Centered horizontally
- Part of `.fullscreen-team` container

## Benefits

✅ **Complete Information:** Users see full game state
✅ **Strategic Value:** Timeout management visible
✅ **Consistency:** Matches individual league pages
✅ **Professional:** No missing features
✅ **Sport-Aware:** Only shows when relevant

## Result

Mixed Sports Bar Mode now has **full feature parity** with individual league Sports Bar Modes for timeout display. The implementation is clean, sport-aware, and provides valuable game state information to users watching live games.
