# Sport-Specific Scoring Headers Fix

## Issue
Game cards were showing incorrect number of score columns for each sport's scoring system.

## Sport Scoring Systems

### NFL (American Football)
- **Quarters**: 4
- **Headers**: 1, 2, 3, 4, T
- **Status**: ✅ FIXED

### NBA (Basketball)
- **Quarters**: 4
- **Headers**: 1, 2, 3, 4, T
- **Status**: ✅ FIXED (was showing only 1, 2, 3, T)

### NHL (Hockey)
- **Periods**: 3
- **Headers**: 1, 2, 3, T
- **Status**: ✅ CORRECT (already using period-label)

### MLB (Baseball)
- **Innings**: 9 (standard game)
- **Headers**: 1, 2, 3, 4, 5, 6, 7, 8, 9, T
- **Status**: ✅ FIXED (was showing only 1, 2, 3, T)

## Changes Made

### NBA (nba.html)
**Before**:
```html
<div class="scores-header">
  <span class="quarter-label">1</span>
  <span class="quarter-label">2</span>
  <span class="quarter-label">3</span>
  <span class="quarter-label">T</span>
</div>
```

**After**:
```html
<div class="scores-header">
  <span class="quarter-label">1</span>
  <span class="quarter-label">2</span>
  <span class="quarter-label">3</span>
  <span class="quarter-label">4</span>
  <span class="quarter-label">T</span>
</div>
```

**Score display**:
```javascript
<span class="quarter-score">${awayLineScores[0]?.value || 0}</span>
<span class="quarter-score">${awayLineScores[1]?.value || 0}</span>
<span class="quarter-score">${awayLineScores[2]?.value || 0}</span>
<span class="quarter-score">${awayLineScores[3]?.value || 0}</span>
<span class="quarter-score total-score">${awayScore}</span>
```

### MLB (mlb.html)
**Before**:
```html
<div class="scores-header">
  <span class="inning-label">1</span>
  <span class="inning-label">2</span>
  <span class="inning-label">3</span>
  <span class="inning-label">T</span>
</div>
```

**After**:
```html
<div class="scores-header">
  <span class="inning-label">1</span>
  <span class="inning-label">2</span>
  <span class="inning-label">3</span>
  <span class="inning-label">4</span>
  <span class="inning-label">5</span>
  <span class="inning-label">6</span>
  <span class="inning-label">7</span>
  <span class="inning-label">8</span>
  <span class="inning-label">9</span>
  <span class="inning-label">T</span>
</div>
```

**Score display**:
```javascript
<span class="inning-score">${awayLineScores[0]?.value || 0}</span>
<span class="inning-score">${awayLineScores[1]?.value || 0}</span>
<span class="inning-score">${awayLineScores[2]?.value || 0}</span>
<span class="inning-score">${awayLineScores[3]?.value || 0}</span>
<span class="inning-score">${awayLineScores[4]?.value || 0}</span>
<span class="inning-score">${awayLineScores[5]?.value || 0}</span>
<span class="inning-score">${awayLineScores[6]?.value || 0}</span>
<span class="inning-score">${awayLineScores[7]?.value || 0}</span>
<span class="inning-score">${awayLineScores[8]?.value || 0}</span>
<span class="inning-score total-score">${homeScore}</span>
```

## CSS Classes Used

Each sport uses appropriate class names:
- **NFL/NBA**: `.quarter-label`, `.quarter-score`, `.quarter-scores`
- **NHL**: `.period-label`, `.period-score`, `.period-scores`
- **MLB**: `.inning-label`, `.inning-score`, `.inning-scores`

## Data Source
All scores come from ESPN API's `linescores` array:
- `linescores[0]` = 1st quarter/period/inning
- `linescores[1]` = 2nd quarter/period/inning
- `linescores[2]` = 3rd quarter/period/inning
- `linescores[3]` = 4th quarter/inning (NFL/NBA/MLB only)
- `linescores[4-8]` = 5th-9th innings (MLB only)

## Extra Innings/Overtime Handling
**MLB**: Games can go into extra innings (10+)
- Current implementation shows innings 1-9 + Total
- Extra innings data is in `linescores[9]`, `linescores[10]`, etc.
- Future enhancement: Dynamically show extra inning columns when present

**NFL/NBA**: Overtime periods
- NFL: One 10-minute OT period (sudden death)
- NBA: 5-minute OT periods (can be multiple)
- Overtime scores appear in additional `linescores` entries
- Current implementation: OT scores added to total but not shown separately

**NHL**: Overtime and shootout
- 5-minute sudden death OT
- If still tied, shootout
- Overtime/shootout goals added to total score
- Not typically shown as separate column

## Testing
Refresh each page to verify:
- ✅ NFL: Shows quarters 1, 2, 3, 4, T with proper scores
- ✅ NBA: Shows quarters 1, 2, 3, 4, T with proper scores
- ✅ NHL: Shows periods 1, 2, 3, T with proper scores
- ✅ MLB: Shows innings 1-9, T with proper scores

---
**Date**: January 2025  
**Status**: All sports now display correct number of scoring periods
