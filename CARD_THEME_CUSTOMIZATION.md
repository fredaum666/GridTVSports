# Card Theme Customization Guide

## Overview
All game cards (regular and fullscreen) across all pages (MLB, NFL, NBA, NHL, LiveGames, Sports Bar Mode) are fully customizable based on the selected theme. Each theme defines its own color palette and styling for all card elements.

## Quick Reference

### Regular Cards
- ✅ Team names, scores (customizable)
- ✅ Winning team emphasis (green)
- ✅ Game status, time display
- ✅ Live indicators (red)
- ✅ Quarter/period/inning labels & scores
- ✅ Game clocks & timers
- ✅ Card backgrounds & borders

### Fullscreen (Sports Bar Mode)
- ✅ Fullscreen team names, scores (customizable)
- ✅ Fullscreen winning teams (green)
- ✅ Fullscreen status displays
- ✅ Fullscreen live indicators (red)
- ✅ Team records, VS separator
- ✅ Down/distance, possession (football)
- ✅ All text elements themed

**See also:** [FULLSCREEN_THEME_GUIDE.md](./FULLSCREEN_THEME_GUIDE.md) for detailed fullscreen customization

## Customizable Card Elements

### 1. Team Names
**Classes:** `.team-name`, `.team-info h3`, `.team h3`
- **Default Dark Theme:** Light gray (`--text-primary: #e0e0e0`)
- **Apple UI Theme:** Dark gray (`--text-primary: #2c2c2e`)
- **Font Weight:** 600 (Semi-bold)

### 2. Scores
**Classes:** `.score`, `.team-score`, `.score-display`
- **Default Dark Theme:** Light gray (`--text-primary: #e0e0e0`)
- **Apple UI Theme:** Dark gray (`--text-primary: #2c2c2e`)
- **Font Weight:** 700 (Bold)

### 3. Winning Team Indicator
**Classes:** `.team.winning .team-name`, `.team.winning .score`, `.team-score.winning`
- **Default Dark Theme:** Bright green (`--accent-green: #22c55e`)
- **Apple UI Theme:** Apple green (`--accent-green: #0066cc`)
- **Font Weight:** 700 (Bold) for scores, 600 for names
- **Semantic Meaning:** Green indicates the winning/leading team

### 4. Game Status & Time
**Classes:** `.game-status`, `.game-time`, `.time-status`, `.status-text`
- **Default Dark Theme:** Medium gray (`--text-secondary: #94a3b8`)
- **Apple UI Theme:** Medium gray (`--text-secondary: #3a3a3c`)
- **Font Weight:** 500 (Medium)
- **Usage:** Shows game start time, "Final", "Postponed", etc.

### 5. Live Game Indicator
**Classes:** `.status-live`, `.live-indicator`
- **Default Dark Theme:** Bright red (`--accent-red: #ef4444`)
- **Apple UI Theme:** Apple red (`--accent-red: #ff3b30`)
- **Font Weight:** 700 (Bold)
- **Semantic Meaning:** Red indicates live/in-progress games

### 6. Quarter/Period/Inning Labels
**Classes:** `.quarter-label`, `.period-label`, `.inning-label`
- **Default Dark Theme:** Medium gray (`--text-secondary: #94a3b8`)
- **Apple UI Theme:** Medium gray (`--text-secondary: #3a3a3c`)
- **Font Weight:** 600 (Semi-bold)
- **Usage:** Header labels like "Q1", "Q2", "P1", "P2", "Top 1", "Bot 1"

### 7. Quarter/Period/Inning Scores
**Classes:** `.quarter-score`, `.period-score`, `.inning-score`
- **Default Dark Theme:** Light gray (`--text-primary: #e0e0e0`)
- **Apple UI Theme:** Dark gray (`--text-primary: #2c2c2e`)
- **Font Weight:** 600 (Semi-bold)
- **Usage:** Individual period scores in breakdown

### 8. Game Clock/Timer
**Classes:** `.quarter-clock`, `.period-time`, `.game-clock`
- **Default Dark Theme:** Muted gray (`--text-muted: #64748b`)
- **Apple UI Theme:** Light gray (`--text-muted: #6e6e73`)
- **Font Weight:** 500 (Medium)
- **Usage:** Shows remaining time in period, "Final", "End 3rd", etc.

### 9. Card Backgrounds
**Classes:** `.game-card`, `.sport-card`
- **Default Dark Theme:** Gradient (`linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)`)
- **Apple UI Theme:** Clean white (`#ffffff`)
- **Borders:** 
  - Default: Solid border (`#334155`)
  - Apple: Subtle border (`rgba(0, 0, 0, 0.1)`)
- **Shadow:**
  - Default: Prominent shadow (`0 2px 8px rgba(0, 0, 0, 0.3)`)
  - Apple: Minimal shadow (`0 1px 3px rgba(0, 0, 0, 0.08)`)

### 10. Score Container
**Classes:** `.score-container`
- **Default Dark Theme:** Uses card gradient
- **Apple UI Theme:** Light gray background (`--bg-tertiary: #fafafa`)

### 11. Game Title/Header
**Classes:** `.game-title`
- **Default Dark Theme:** Inherits from card
- **Apple UI Theme:** Transparent with bottom border
- **Text Color:** 
  - Default: Medium gray (`--text-secondary`)
  - Apple: Medium gray (`--text-secondary`)

### 12. Game Status Row
**Classes:** `.game-status-row`
- **Default Dark Theme:** Inherits from card
- **Apple UI Theme:** Transparent with top border
- **Purpose:** Contains game time, status, and additional info

## CSS Variable System

### Default Dark Theme Variables
```css
--bg-primary: #0a0e1a;
--bg-secondary: #1a1f2e;
--bg-tertiary: #2d3748;
--bg-card: linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%);

--text-primary: #e0e0e0;
--text-secondary: #94a3b8;
--text-muted: #64748b;

--accent-green: #22c55e;  /* Winning teams */
--accent-red: #ef4444;    /* Live games */
```

### Apple UI Theme Variables
```css
--bg-primary: #f5f5f7;
--bg-secondary: #ffffff;
--bg-tertiary: #fafafa;
--bg-card: #ffffff;

--text-primary: #2c2c2e;
--text-secondary: #3a3a3c;
--text-muted: #6e6e73;

--accent-green: #34c759;  /* Winning teams */
--accent-red: #ff3b30;    /* Live games */
```

## Semantic Color Usage

### Green (Success/Winning)
- **Purpose:** Indicates winning or leading team
- **Applied to:** Team names and scores of winning teams
- **Default:** `#22c55e`
- **Apple:** `#34c759`

### Red (Live/Active)
- **Purpose:** Indicates live, in-progress games
- **Applied to:** Live indicators, status badges
- **Default:** `#ef4444`
- **Apple:** `#ff3b30`

### Gray Hierarchy
- **Primary:** Main content (team names, scores)
- **Secondary:** Supporting content (status, labels)
- **Muted:** Tertiary content (timestamps, clocks)

## Card Hover Effects

### Default Dark Theme
- **Scale:** 1.05 (5% larger)
- **Border:** Changes to hover color (`#475569`)
- **Shadow:** Increases slightly
- **Transition:** Smooth 0.3s ease

### Apple UI Theme
- **Scale:** 1.02 (2% larger - more subtle)
- **Border:** Changes to darker (`rgba(0, 0, 0, 0.2)`)
- **Shadow:** Minimal increase
- **Transition:** Smooth 0.3s ease
- **Additional:** Slight upward movement (-2px translateY)

## Adding New Themes

To add a new theme, follow this pattern:

```css
/* New Theme Name */
body[data-theme="new-theme-name"] {
  /* Background colors */
  --bg-primary: #your-color;
  --bg-secondary: #your-color;
  --bg-tertiary: #your-color;
  --bg-card: #your-color;
  
  /* Text colors */
  --text-primary: #your-color;
  --text-secondary: #your-color;
  --text-muted: #your-color;
  
  /* Semantic colors */
  --accent-green: #your-color;
  --accent-red: #your-color;
}

/* Card customization */
body[data-theme="new-theme-name"] .team-name,
body[data-theme="new-theme-name"] .team-info h3,
body[data-theme="new-theme-name"] .team h3 {
  color: var(--text-primary);
  font-weight: 600;
}

/* Continue with other elements... */
```

## Theme Application

All themes are applied via:
1. **CSS Variables:** Define colors and properties
2. **Data Attribute:** `body[data-theme="theme-name"]`
3. **JavaScript:** Theme manager handles switching and persistence
4. **LocalStorage:** Selected theme persists across sessions

## Fullscreen (Sports Bar Mode) Customization

All text elements in Sports Bar Mode are fully customizable by theme:

### 13. Fullscreen Team Names
**Classes:** `.fullscreen-team-name`
- **Default Dark Theme:** Light gray (`--text-primary: #e0e0e0`)
- **Apple UI Theme:** Dark gray (`--text-primary: #2c2c2e`)
- **Font Weight:** 700 (Bold)

### 14. Fullscreen Scores
**Classes:** `.fullscreen-score`
- **Default Dark Theme:** Light gray (`--text-primary: #e0e0e0`)
- **Apple UI Theme:** Dark gray (`--text-primary: #2c2c2e`)
- **Font Weight:** 700 (Bold)

### 15. Fullscreen Winning Teams
**Classes:** `.fullscreen-team.winning .fullscreen-team-name`, `.fullscreen-team.winning .fullscreen-score`
- **Default Dark Theme:** Bright green (`--accent-green: #22c55e`)
- **Apple UI Theme:** Apple green (`--accent-green: #34c759`)
- **Font Weight:** 700 (Bold)

### 16. Fullscreen Quarter/Period/Inning
**Classes:** `.fullscreen-quarter`, `.fullscreen-period`, `.fullscreen-inning`
- **Default Dark Theme:** Medium gray (`--text-secondary: #94a3b8`)
- **Apple UI Theme:** Medium gray (`--text-secondary: #3a3a3c`)
- **Font Weight:** 600 (Semi-bold)

### 17. Fullscreen "VS" Separator
**Classes:** `.fullscreen-vs`
- **Default Dark Theme:** Muted gray (`--text-muted: #64748b`)
- **Apple UI Theme:** Light gray (`--text-muted: #6e6e73`)
- **Font Weight:** 600 (Semi-bold)

### 18. Fullscreen Team Records
**Classes:** `.fullscreen-team-record`
- **Default Dark Theme:** Medium gray (`--text-secondary: #94a3b8`)
- **Apple UI Theme:** Medium gray (`--text-secondary: #3a3a3c`)
- **Font Weight:** 500 (Medium)

### 19. Fullscreen Down/Distance/Clock
**Classes:** `.fullscreen-down-distance`, `.fullscreen-clock`, `.fullscreen-time`
- **Default Dark Theme:** Muted gray (`--text-muted: #64748b`)
- **Apple UI Theme:** Light gray (`--text-muted: #6e6e73`)
- **Font Weight:** 500 (Medium)

### 20. Fullscreen Possession Indicator
**Classes:** `.fullscreen-possession`
- **Default Dark Theme:** Yellow (`--accent-yellow: #fbbf24`)
- **Apple UI Theme:** Orange/Yellow (`--accent-yellow: #0066cc`)
- **Usage:** Football possession indicator

### 21. Fullscreen Live Status
**Classes:** `.fullscreen-inning.live`, `.fullscreen-status.live`
- **Default Dark Theme:** Bright red (`--accent-red: #ef4444`)
- **Apple UI Theme:** Apple red (`--accent-red: #ff3b30`)
- **Font Weight:** 700 (Bold)
- **Semantic Meaning:** Indicates live/in-progress state

### 22. Fullscreen Game Selector
**Classes:** `.fs-game-selector`
- **Default Dark Theme:** 
  - Background: Dark blue-gray (`--bg-secondary: #1a1f2e`)
  - Text: Light gray (`--text-primary: #e0e0e0`)
  - Border: Cyan blue (`--accent-blue: #17a2b8`)
  - Focus: Green border (`--accent-green: #22c55e`)
- **Apple UI Theme:**
  - Background: White (`--bg-secondary: #ffffff`)
  - Text: Dark gray (`--text-primary: #2c2c2e`)
  - Border: Science Blue (`--accent-blue: #0066cc`)
  - Focus: Science Blue with subtle shadow
- **Usage:** Dropdown to select/change games in Sports Bar Mode slots

## Pages Covered

The theme system and card customization apply to all pages:
- ✅ **index.html** - Main dashboard
- ✅ **mlb.html** - Baseball games
- ✅ **nfl.html** - Football games
- ✅ **nba.html** - Basketball games
- ✅ **nhl.html** - Hockey games
- ✅ **LiveGames.html** - Mixed sports view
- ✅ **Sports Bar Mode** - Fullscreen display (all sports)

## Implementation Details

### File Locations
- **Theme Definitions:** `/public/styles/themes.css`
- **Theme Manager:** `/public/scripts/theme-manager.js`
- **Integration:** Each HTML page includes both files

### How It Works
1. User selects theme from dropdown
2. Theme manager updates `data-theme` attribute on `<body>`
3. CSS variables change based on theme
4. All card elements inherit new colors
5. Selection saved to localStorage
6. Theme persists across page navigation

## Best Practices

1. **Always use CSS variables** - Don't hardcode colors in card styles
2. **Semantic colors** - Use green for winning, red for live
3. **Consistent hierarchy** - Primary > Secondary > Muted
4. **Test both themes** - Ensure good contrast in light and dark
5. **Font weights** - Use appropriate weights for emphasis
6. **Accessibility** - Maintain WCAG contrast ratios

## Future Enhancements

Potential additions to the theme system:
- High Contrast theme for accessibility
- Team-specific color themes
- Dark OLED theme (pure blacks)
- Custom theme builder
- Per-sport color variations
- Time-based auto-switching (day/night)
