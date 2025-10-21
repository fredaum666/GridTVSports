# Fullscreen Game Selector Theme Customization

## Overview
The fullscreen game selector (dropdown that appears in Sports Bar Mode grid slots) now follows the selected theme's color scheme, matching the style of grid radio buttons and other theme-based controls.

## Element
**Class:** `.fs-game-selector`

## Purpose
Allows users to select and change which games appear in each grid slot of Sports Bar Mode. The dropdown appears when hovering over a game card in fullscreen view.

## Theme Styling

### Default Dark Theme
```css
body[data-theme="default"] .fs-game-selector {
  background: var(--bg-secondary);      /* #1a1f2e - Dark blue-gray */
  color: var(--text-primary);           /* #e0e0e0 - Light gray text */
  border: 2px solid var(--accent-blue); /* #17a2b8 - Cyan blue */
  box-shadow: var(--shadow-md);         /* Medium shadow */
}

body[data-theme="default"] .fs-game-selector:focus {
  border-color: var(--accent-green);    /* #22c55e - Green focus */
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3); /* Green glow */
}

body[data-theme="default"] .fs-game-selector option {
  background: var(--bg-secondary);      /* #1a1f2e - Match dropdown */
  color: var(--text-primary);           /* #e0e0e0 - Light gray */
}
```

**Visual Character:**
- Dark background fits fullscreen view
- Cyan blue border matches theme accent
- Green focus state matches winning teams
- Medium shadow for depth

### Apple UI Theme
```css
body[data-theme="apple"] .fs-game-selector {
  background: var(--bg-secondary);      /* #ffffff - Clean white */
  color: var(--text-primary);           /* #2c2c2e - Dark gray text */
  border: 2px solid var(--accent-blue); /* #0066cc - Science Blue */
  box-shadow: var(--shadow-sm);         /* Subtle shadow */
}

body[data-theme="apple"] .fs-game-selector:focus {
  border-color: var(--accent-blue);     /* #0066cc - Stay blue */
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.3); /* Blue glow */
}

body[data-theme="apple"] .fs-game-selector option {
  background: var(--bg-secondary);      /* #ffffff - White options */
  color: var(--text-primary);           /* #2c2c2e - Dark gray */
}
```

**Visual Character:**
- Clean white background (Apple style)
- Science Blue border (primary action color)
- Blue focus state (consistency with brand)
- Minimal shadow for elegance

## Comparison with Grid Radio Buttons

The fs-game-selector follows the same theme pattern as the grid layout radio buttons:

### Default Dark Theme
- **Radio Buttons:** Cyan border, green when selected
- **Game Selector:** Cyan border, green on focus
- **Consistency:** Both use cyan for default, green for active state

### Apple UI Theme
- **Radio Buttons:** Gray neutral, blue when selected
- **Game Selector:** Blue border, blue on focus
- **Consistency:** Both use Science Blue for primary/active state

## States

### Normal State
- Border in theme's accent-blue color
- Background matches theme
- Text follows text-primary variable

### Focus State (When Dropdown is Open)
- **Default:** Green border with green glow (matches winning teams)
- **Apple:** Blue border with blue glow (matches primary actions)

### Options/Dropdown Items
- Background matches selector background
- Text color matches selector text
- Maintains theme consistency when expanded

## Integration

### Location in Code
- **CSS Definitions:** `/public/styles/themes.css`
  - Lines ~189-209: Default Dark theme
  - Lines ~560-580: Apple UI theme

### HTML Element
- **File:** `/public/LiveGames.html`
- **Structure:**
  ```html
  <div class="fs-game-selector-container">
    <select class="fs-game-selector" data-slot="0">
      <option value="">-- Select Game --</option>
      <option value="game-id">Team A @ Team B</option>
    </select>
  </div>
  ```

## Behavior

### Visibility
- Hidden by default
- Appears on hover over fullscreen game card
- Positioned at bottom of card (absolute positioning)

### Functionality
- Lists all available games
- Shows game status (LIVE, FINAL, time)
- Filters out games already selected in other slots
- Updates grid when selection changes

### Theme Integration
- Colors update instantly when theme changes
- No page reload needed
- LocalStorage persists theme choice

## Design Rationale

### Why Theme the Selector?

1. **Consistency:** Matches the rest of the themed UI
2. **Visibility:** Light background wouldn't work in dark theme
3. **Professional:** Cohesive design across all controls
4. **Accessibility:** Proper contrast in both themes
5. **User Experience:** No jarring color mismatches

### Why Different Focus Colors?

- **Default Dark:** Green focus matches the winning team color and provides good contrast
- **Apple UI:** Blue focus maintains brand consistency (Science Blue is the primary action color)

## Testing Checklist

When verifying the game selector theme:
- ✅ Selector appears on hover in Sports Bar Mode
- ✅ Background color matches theme
- ✅ Text color is readable in both themes
- ✅ Border color matches theme's accent blue
- ✅ Focus state shows proper color and glow
- ✅ Dropdown options have matching background
- ✅ Theme changes update selector instantly
- ✅ Contrast meets WCAG standards
- ✅ Works on mobile devices
- ✅ Works in all grid layouts (1, 2, 4, 8 games)

## Related Components

Other themed controls in Sports Bar Mode:
- Grid layout radio buttons (1x1, 2x1, 2x2, 4x2)
- Fullscreen control buttons
- Exit button
- Cast button
- Theme selector dropdown

All follow the same color system for consistency.

## Future Enhancements

Potential improvements:
- Highlight live games in dropdown (red text)
- Show winning team in green in dropdown
- Add sport icons to dropdown options
- Keyboard shortcuts for quick selection
- Search/filter functionality for many games
- Recently selected games at top
