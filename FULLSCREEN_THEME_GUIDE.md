# Fullscreen Sports Bar Mode Theme Customization

## Overview
All text elements in Sports Bar Mode (fullscreen display) are now fully customizable based on the selected theme. This ensures consistent styling across regular cards and fullscreen views.

## Fullscreen Text Elements

### Team Information
- **`.fullscreen-team-name`** - Team display names
  - Default: Light gray (#e0e0e0)
  - Apple: Dark gray (#2c2c2e)
  - Weight: 700 (Bold)

- **`.fullscreen-team-record`** - Win-loss records
  - Default: Medium gray (#94a3b8)
  - Apple: Medium gray (#3a3a3c)
  - Weight: 500 (Medium)

### Scores
- **`.fullscreen-score`** - Main score display
  - Default: Light gray (#e0e0e0)
  - Apple: Dark gray (#2c2c2e)
  - Weight: 700 (Bold)

### Winning Team Emphasis
- **`.fullscreen-team.winning .fullscreen-team-name`**
- **`.fullscreen-team.winning .fullscreen-score`**
  - Default: Bright green (#22c55e)
  - Apple: Apple green (#34c759)
  - Weight: 700 (Bold)
  - **Semantic:** Green indicates winning/leading team

### Game Status Elements
- **`.fullscreen-quarter`** - Quarter/period display (NFL/NBA/NHL)
  - Default: Medium gray (#94a3b8)
  - Apple: Medium gray (#3a3a3c)
  - Weight: 600 (Semi-bold)

- **`.fullscreen-period`** - Period display (NHL)
  - Default: Medium gray (#94a3b8)
  - Apple: Medium gray (#3a3a3c)
  - Weight: 600 (Semi-bold)

- **`.fullscreen-inning`** - Inning display (MLB)
  - Default: Medium gray (#94a3b8)
  - Apple: Medium gray (#3a3a3c)
  - Weight: 600 (Semi-bold)

### Live Indicators
- **`.fullscreen-inning.live`**
- **`.fullscreen-status.live`**
  - Default: Bright red (#ef4444)
  - Apple: Apple red (#ff3b30)
  - Weight: 700 (Bold)
  - **Semantic:** Red indicates live/in-progress games

### Supporting Elements
- **`.fullscreen-vs`** - VS separator between teams
  - Default: Muted gray (#64748b)
  - Apple: Light gray (#6e6e73)
  - Weight: 600 (Semi-bold)

- **`.fullscreen-down-distance`** - Football down & distance
  - Default: Muted gray (#64748b)
  - Apple: Light gray (#6e6e73)
  - Weight: 500 (Medium)

- **`.fullscreen-clock`** - Game clock/timer
  - Default: Muted gray (#64748b)
  - Apple: Light gray (#6e6e73)
  - Weight: 500 (Medium)

- **`.fullscreen-time`** - Time display
  - Default: Muted gray (#64748b)
  - Apple: Light gray (#6e6e73)
  - Weight: 500 (Medium)

### Special Indicators
- **`.fullscreen-possession`** - Possession indicator (Football)
  - Default: Yellow (#fbbf24)
  - Apple: Orange (#ff9500)
  - Shows which team has the ball

### Controls & Selectors
- **`.fs-game-selector`** - Game selector dropdown
  - Default: 
    - Background: Dark blue-gray (#1a1f2e)
    - Text: Light gray (#e0e0e0)
    - Border: Cyan blue (#17a2b8)
    - Focus: Green border (#22c55e) with glow
  - Apple:
    - Background: White (#ffffff)
    - Text: Dark gray (#2c2c2e)
    - Border: Science Blue (#0066cc)
    - Focus: Blue border with subtle shadow
  - Usage: Allows changing games in each grid slot

## Theme Variables Used

### Default Dark Theme
```css
--text-primary: #e0e0e0    /* Main text - team names, scores */
--text-secondary: #94a3b8  /* Supporting - records, status */
--text-muted: #64748b      /* Tertiary - clock, down/distance */
--accent-green: #22c55e    /* Winning teams */
--accent-red: #ef4444      /* Live games */
--accent-yellow: #fbbf24   /* Possession */
```

### Apple UI Theme
```css
--text-primary: #2c2c2e    /* Main text - team names, scores */
--text-secondary: #3a3a3c  /* Supporting - records, status */
--text-muted: #6e6e73      /* Tertiary - clock, down/distance */
--accent-green: #34c759    /* Winning teams */
--accent-red: #ff3b30      /* Live games */
--accent-yellow: #ff9500   /* Possession */
```

## Text Hierarchy

### Primary (Bold, Most Prominent)
- Team names (`.fullscreen-team-name`)
- Scores (`.fullscreen-score`)
- Winning team names and scores (green)

### Secondary (Semi-bold, Supporting Info)
- Quarter/Period/Inning (`.fullscreen-quarter`, etc.)
- Team records (`.fullscreen-team-record`)
- VS separator (`.fullscreen-vs`)

### Tertiary (Medium, Contextual Info)
- Down & distance (`.fullscreen-down-distance`)
- Game clock (`.fullscreen-clock`)
- Time display (`.fullscreen-time`)

## Semantic Color Usage

### Green (Success/Winning)
- **Purpose:** Indicates the team that's currently winning
- **Applied to:** 
  - `.fullscreen-team.winning .fullscreen-team-name`
  - `.fullscreen-team.winning .fullscreen-score`
- **Why:** Provides instant visual feedback on game status

### Red (Live/Active)
- **Purpose:** Indicates live, in-progress games
- **Applied to:**
  - `.fullscreen-inning.live`
  - `.fullscreen-status.live`
- **Why:** Draws attention to games that are actively being played

### Yellow/Orange (Possession)
- **Purpose:** Shows which team has possession (football)
- **Applied to:**
  - `.fullscreen-possession`
- **Why:** Important game state indicator for football

## Background Customization

In addition to text colors, fullscreen backgrounds are themed:

```css
/* Default Dark Theme */
.fullscreen-container {
  background: #0a0e1a;  /* Dark blue-black */
}

.fullscreen-game-card {
  background: linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%);
}

/* Apple UI Theme */
.fullscreen-container {
  background: #f5f5f7;  /* Light gray */
}

.fullscreen-game-card {
  background: #ffffff;  /* Clean white */
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
```

## Implementation Notes

### How It Works
1. User selects theme from dropdown
2. Theme manager updates `body[data-theme="..."]` attribute
3. All fullscreen elements inherit colors from CSS variables
4. Winning/losing states dynamically change colors
5. Live status updates in real-time with proper color coding

### Sport-Specific Elements
- **NFL:** Uses `.fullscreen-quarter`, `.fullscreen-down-distance`, `.fullscreen-possession`
- **NBA:** Uses `.fullscreen-quarter`
- **NHL:** Uses `.fullscreen-period`
- **MLB:** Uses `.fullscreen-inning`, `.fullscreen-inning.live`

### Consistency Across Views
- Regular cards and fullscreen cards use the same color variables
- Winning teams show green in both views
- Live indicators show red in both views
- Text hierarchy is consistent

## Testing Checklist

When adding or modifying themes, verify:
- ✅ Team names are readable in both themes
- ✅ Scores are prominent and clear
- ✅ Winning teams show in green
- ✅ Live indicators show in red
- ✅ Text hierarchy is clear (primary > secondary > tertiary)
- ✅ Contrast meets WCAG standards
- ✅ All sports display correctly (NFL, NBA, NHL, MLB)
- ✅ Possession indicators visible (football)
- ✅ Game status elements legible

## Future Enhancements

Potential improvements:
- Team-specific accent colors (use actual team colors)
- High contrast mode for accessibility
- Color blind friendly palettes
- Animated color transitions for score changes
- Dimmed styling for postponed/cancelled games
- Pulsing effect for live games
