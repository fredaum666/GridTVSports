# Sports Bar Mode Unification Guide

## Overview

This guide explains how to update your existing sports pages to use the unified sports bar mode component with integrated color customization support.

## Key Features

✅ **Unified Interface**: Same UI for mixed and league-specific modes
✅ **Shared Code**: One source of truth for all sports bar functionality
✅ **Color Customization**: Uses CSS variables from themes.css - changes on customization page apply everywhere
✅ **Theme Support**: Works with both Dark and Light themes
✅ **Easy Maintenance**: Update once, applies to all pages
✅ **Consistent Behavior**: Same features across all modes

## What's Been Created

### 1. Shared Component: `sportsBarMode.js`
Located at: [sportsBarMode.js](public/sportsBarMode.js)

This component handles:
- Modal UI for game selection
- Grid layout options (1, 2, 4, 6 games)
- Fullscreen display
- Game cards rendering
- Auto-refresh every 15 seconds
- Both mixed and league-specific modes
- **Uses CSS variables from themes.css for all colors**

### 2. CSS Variables Integration
The component now uses CSS variables from [themes.css](public/styles/themes.css) for all styling:

**Fullscreen Card Colors (Customizable via customize-colors.html):**
- `--fullscreen-card-bg` - Card background
- `--fullscreen-card-border` - Card border color
- `--fullscreen-card-shadow` - Card shadow
- `--fullscreen-team-name` - Team name color
- `--fullscreen-score` - Score color
- `--fullscreen-winning-name` - Winning team name (green)
- `--fullscreen-winning-score` - Winning team score (green)
- `--fullscreen-status` - Game status text color
- `--card-live-indicator` - Live indicator background (red)
- `--accent-blue` - Primary accent color
- `--accent-red` - Exit button color

**When you modify colors on the customization page, changes automatically apply to:**
- Mixed sports bar mode (LiveGames.html)
- NFL sports bar mode
- NBA sports bar mode
- MLB sports bar mode
- NHL sports bar mode

### 3. Example Files

- **[LiveGames_updated.html](public/LiveGames_updated.html)** - Mixed sports mode example
- **[nfl_sportsbar_example.html](public/nfl_sportsbar_example.html)** - League-specific mode example

Both examples include:
- `<link rel="stylesheet" href="/styles/themes.css">` - Theme CSS variables
- `<script src="/scripts/theme-manager.js"></script>` - Theme management
- `<script src="/sportsBarMode.js"></script>` - Sports bar component

## Key Differences Between Modes

### Mixed Mode (from index page)
```javascript
initSportsBarMode({
  mode: 'mixed',
  sport: null
});
```
- Shows games from all sports (NFL, NBA, MLB, NHL)
- Each game displays a sport badge
- Users can mix games from different sports

### League-Specific Mode (from league pages)
```javascript
initSportsBarMode({
  mode: 'league',
  sport: 'nfl' // or 'nba', 'mlb', 'nhl'
});
```
- Shows only games from that specific league
- No sport badge needed
- Users can only select games from that league

## Integration Steps

### For Each HTML File (nfl.html, nba.html, mlb.html, nhl.html, LiveGames.html)

#### Step 1: Include Required Files

Add these links/scripts in your `<head>` and before your page-specific scripts:

```html
<head>
  <!-- ... other head content ... -->

  <!-- Theme CSS with CSS variables -->
  <link rel="stylesheet" href="/styles/themes.css">
</head>

<body>
  <!-- ... your page content ... -->

  <!-- Theme manager (must load before sportsBarMode.js) -->
  <script src="/scripts/theme-manager.js"></script>

  <!-- Sports bar mode component -->
  <script src="/sportsBarMode.js"></script>

  <!-- Your page-specific scripts -->
  <script>
    // Your code here
  </script>
</body>
```

**Important:** The order matters!
1. `themes.css` provides CSS variables
2. `theme-manager.js` handles theme switching
3. `sportsBarMode.js` uses the CSS variables

#### Step 2: Remove Duplicate Code

Remove the following from each file:
- Sports bar modal CSS (`.sports-bar-button`, `.sports-bar-modal`, etc.)
- Sports bar modal HTML
- Fullscreen container HTML
- JavaScript functions:
  - `openGameSelectionModal()`
  - `renderGridPreview()`
  - `updateAllGameSelectors()`
  - `checkAllSlotsSelected()`
  - `enterFullScreenMode()` / `enterFullscreen()`
  - `renderFullScreenGames()`
  - `createFullScreenGameCard()`
  - `createEmptySlotCard()`
  - `populateFullScreenGameSelector()`

#### Step 3: Initialize the Component

Replace initialization code with:

**For Mixed Mode (LiveGames.html):**
```javascript
let barMode;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize sports bar mode
  barMode = initSportsBarMode({
    mode: 'mixed',
    sport: null
  });

  // Load your games
  await loadAllGames();

  // Setup button click
  document.getElementById('sportsBarButton').addEventListener('click', () => {
    barMode.setGames(allGames);
    barMode.openModal();
  });

  // Listen for auto-refresh
  window.addEventListener('sportsBarUpdateNeeded', async () => {
    await loadAllGames();
    barMode.setGames(allGames);
    barMode.updateScores();
  });
});
```

**For League-Specific (nfl.html, nba.html, mlb.html, nhl.html):**
```javascript
let barMode;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize sports bar mode
  barMode = initSportsBarMode({
    mode: 'league',
    sport: 'nfl' // Change to 'nba', 'mlb', or 'nhl' as needed
  });

  // Load your games
  await loadGames();

  // Setup button click
  document.getElementById('sportsBarButton').addEventListener('click', () => {
    barMode.setGames(games); // Use your existing games array
    barMode.openModal();
  });

  // Listen for auto-refresh
  window.addEventListener('sportsBarUpdateNeeded', async () => {
    await loadGames();
    barMode.setGames(games);
    barMode.updateScores();
  });
});
```

#### Step 4: Update Your Sports Bar Button HTML

Replace your existing sports bar button with:

```html
<button id="sportsBarButton" class="sports-bar-button">
  📺 Sports Bar Mode
</button>
```

The styles will be automatically injected by the component.

## Benefits of This Approach

✅ **Unified Interface**: Same UI for mixed and league-specific modes
✅ **Shared Code**: One source of truth for all sports bar functionality
✅ **Easy Maintenance**: Update once, applies to all pages
✅ **Consistent Behavior**: Same features across all modes
✅ **Smaller Files**: Removed ~500-800 lines of duplicate code per file

## Game Data Format

Your games array should follow the ESPN API format:

```javascript
{
  id: "unique-game-id",
  date: "2025-10-23T20:00:00Z",
  sport: "nfl", // Only needed for mixed mode
  competitions: [{
    status: {
      type: {
        state: "in", // "pre", "in", "post"
        shortDetail: "Q2 5:23"
      }
    },
    competitors: [
      {
        homeAway: "away",
        team: {
          abbreviation: "KC",
          logo: "https://..."
        },
        score: "14"
      },
      {
        homeAway: "home",
        team: {
          abbreviation: "SF",
          logo: "https://..."
        },
        score: "17"
      }
    ]
  }]
}
```

## Testing Checklist

After integration, test:

- [ ] Sports bar button appears correctly
- [ ] Modal opens with layout options
- [ ] Game selectors populate correctly
- [ ] Can select different layouts (1, 2, 4, 6)
- [ ] Can't select duplicate games
- [ ] Fullscreen mode displays correctly
- [ ] Game cards show correct data
- [ ] Scores update automatically
- [ ] Exit button works
- [ ] Mobile responsive (if applicable)

## File-Specific Notes

### LiveGames.html (Mixed Mode)
- Load games from all 4 sports APIs
- Add `sport` property to each game
- Games will show sport badge in fullscreen

### nfl.html, nba.html, mlb.html, nhl.html (League-Specific)
- Load games from single sport API only
- No need to add `sport` property
- No sport badge shown in fullscreen

## Migration Order

Recommended order to update files:

1. **Test with examples first**: Use `LiveGames_updated.html` and `nfl_sportsbar_example.html` to verify the component works
2. **Update one league page**: Start with NFL as a pilot
3. **Update remaining league pages**: NBA, MLB, NHL
4. **Update mixed mode**: LiveGames.html last (most complex)

## Color Customization

### How It Works

1. **Base Themes**: Choose between Dark or Light theme
2. **CSS Variables**: All colors are defined as CSS variables in `themes.css`
3. **Customization Page**: [customize-colors.html](public/customize-colors.html) allows per-sport color overrides
4. **Storage**: Custom colors are saved in localStorage per sport
5. **Application**: Colors automatically apply to both regular cards AND fullscreen sports bar cards

### Customizing Sports Bar Mode Colors

1. Navigate to the customization page: `/customize-colors.html`
2. Select a sport (NFL, NBA, MLB, NHL)
3. Choose base theme (Dark or Light)
4. Scroll to **"Fullscreen Card Colors"** section
5. Click any color swatch to change:
   - Card Background
   - Team Name
   - Score
   - Winning Name/Score
   - Status Text
   - Live Indicator
   - etc.
6. Click **"Save Changes"**
7. Your changes apply immediately to sports bar mode!

### Available Fullscreen Color Variables

```css
/* Card Structure */
--fullscreen-card-bg: background color
--fullscreen-card-border: border color
--fullscreen-card-shadow: shadow effect

/* Text Colors */
--fullscreen-team-name: team name color
--fullscreen-score: score color
--fullscreen-status: game status color
--fullscreen-vs: "VS" text color

/* Winning State */
--fullscreen-winning-name: winning team name (default: green)
--fullscreen-winning-score: winning team score (default: green)

/* Special Elements */
--card-live-indicator: live game background (default: red)
--accent-blue: primary buttons and accents
--accent-red: exit button
```

### Testing Customizations

1. Make color changes on customization page
2. Open sports bar mode (mixed or league-specific)
3. Your custom colors should be visible immediately
4. Changes apply to all sports bar views that use that sport's customization

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify `sportsBarMode.js` is loaded correctly
3. Ensure `themes.css` is loaded before `sportsBarMode.js`
4. Verify games array has correct format
5. Check that initialization happens after DOM loads
6. Make sure `theme-manager.js` is loaded for color customizations to work
