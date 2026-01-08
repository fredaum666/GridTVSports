# Mobile Fullscreen Paging System

## Overview

The Mobile Fullscreen Paging System enables a Sports Bar-like experience on phone screens with swipeable pages containing up to 2 game cards each. This system works with the existing Desktop-tv-sports-bar.html card layouts.

## Features

- **Maximum 2 cards per page** - Portrait (stacked vertically) or Landscape (side by side)
- **Swipeable navigation** - Smooth swipe gestures between pages
- **Up to 8 games total** - Maximum of 4 pages (8 games ÷ 2 cards per page)
- **Desktop card layout** - Uses the same scoreboard layout as Desktop-tv-sports-bar.html
- **Page indicators** - Visual dots showing current page
- **Auto-adapts to orientation** - Rebuilds layout on portrait/landscape changes

## File Structure

```
/public/styles/
├── fullscreen-cards.css           # Desktop card layout (scoreboard, team logos, etc.)
├── mobile-fullscreen.css          # Mobile card sizing for different grid layouts
└── mobile-fullscreen-paging.css   # NEW: Paging system for phones

/public/js/
└── mobile-fullscreen-paging.js    # NEW: Paging logic and swipe handling
```

## Installation

### 1. Add CSS Files (in order)

```html
<!-- Existing files -->
<link rel="stylesheet" href="/styles/fullscreen-cards.css">
<link rel="stylesheet" href="/styles/mobile-fullscreen.css">

<!-- NEW: Mobile paging -->
<link rel="stylesheet" href="/styles/mobile-fullscreen-paging.css">
```

### 2. Add JavaScript

```html
<!-- Before closing </body> tag -->
<script src="/js/mobile-fullscreen-paging.js"></script>
```

### 3. Update Your Sports Bar Mode Code

```javascript
// In your sportsBarMode.js or similar file

// When entering fullscreen on mobile
if (window.innerWidth <= 768 && typeof MobileFullscreenPaging !== 'undefined') {
    this.mobilePaging = new MobileFullscreenPaging();

    // Get selected games (max 8)
    const selectedGames = this.getSelectedGames().slice(0, 8);

    // Setup paging
    const container = document.querySelector('.fullscreen-container');
    this.mobilePaging.setup(selectedGames, container);
}

// When exiting fullscreen
if (this.mobilePaging) {
    this.mobilePaging.destroy();
    this.mobilePaging = null;
}
```

## How It Works

### Grid Layout Logic

| Total Games | Pages | Cards Per Page | Layout |
|------------|-------|----------------|---------|
| 1-2        | 1     | 1-2            | Single page |
| 3-4        | 2     | 2 each         | 2 pages |
| 5-6        | 3     | 2 each         | 3 pages |
| 7-8        | 4     | 2 each         | 4 pages |

### Page Structure

```html
<div class="fullscreen-container mobile-paging">
    <div class="fullscreen-grid">
        <div class="fullscreen-pages-wrapper">
            <!-- Page 1 -->
            <div class="fullscreen-page">
                <div class="fullscreen-page-grid">
                    <div class="fullscreen-game-card">Game 1</div>
                    <div class="fullscreen-game-card">Game 2</div>
                </div>
            </div>
            <!-- Page 2 -->
            <div class="fullscreen-page">
                <div class="fullscreen-page-grid">
                    <div class="fullscreen-game-card">Game 3</div>
                    <div class="fullscreen-game-card">Game 4</div>
                </div>
            </div>
            <!-- ... more pages -->
        </div>
    </div>
    <!-- Page indicators -->
    <div class="fullscreen-page-indicators">
        <div class="page-indicator-dot active"></div>
        <div class="page-indicator-dot"></div>
    </div>
    <!-- Game count -->
    <div class="fullscreen-game-count">4 / 8 Games</div>
</div>
```

## Orientation Support

### Portrait Mode
- 2 cards **stacked vertically** (1 column, 2 rows)
- Single card centers on page

### Landscape Mode
- 2 cards **side by side** (2 columns, 1 row)
- Single card centers on page with max-width constraint

## User Interactions

### Swipe Gestures
- **Swipe left** - Go to next page
- **Swipe right** - Go to previous page
- **Tap indicator** - Jump to specific page

### Visual Feedback
- Active page indicator expands horizontally
- Swipe hints appear on first load (arrows)
- Smooth transitions between pages

## API Reference

### MobileFullscreenPaging Class

#### Constructor
```javascript
const paging = new MobileFullscreenPaging();
```

#### Methods

**setup(games, container)**
- Initialize paging for given games
- `games`: Array of game objects (max 8)
- `container`: HTML element (fullscreen container)
- Returns: `true` if initialized (on phone), `false` otherwise

**goToPage(pageIndex)**
- Navigate to specific page
- `pageIndex`: Page number (0-based)

**updateCards(games)**
- Update game data in existing cards
- `games`: Updated array of game objects

**destroy()**
- Remove paging system and cleanup

#### Properties

- `currentPage` - Current page index (0-based)
- `totalPages` - Total number of pages
- `games` - Array of game objects
- `MAX_GAMES` - Maximum games allowed (8)

## Game Selection Cap

The system automatically caps game selection at **8 games maximum**. This is enforced in:

1. **JavaScript** - `sportsBarMode.js`
   ```javascript
   this.MAX_GAMES = 8;
   const maxSlots = Math.min(this.gridLayout, this.MAX_GAMES);
   ```

2. **Mobile Paging** - `mobile-fullscreen-paging.js`
   ```javascript
   this.games = games.slice(0, this.MAX_GAMES);
   ```

## Styling Customization

### Page Indicators
```css
.page-indicator-dot {
    width: 8px;
    height: 8px;
    background: rgba(255, 255, 255, 0.3);
}

.page-indicator-dot.active {
    width: 24px;
    background: #3b82f6;
}
```

### Swipe Hints
```css
.swipe-hint {
    font-size: 24px;
    opacity: 0.3;
    color: white;
}
```

### Game Count
```css
.fullscreen-game-count {
    background: rgba(10, 14, 26, 0.8);
    color: rgba(255, 255, 255, 0.7);
    padding: 6px 12px;
    border-radius: 12px;
    font-size: 12px;
}
```

## Troubleshooting

### Cards not showing correct layout
- Ensure fullscreen-cards.css is loaded first
- Check that cards have class `fullscreen-game-card`
- Verify `has-scoreboard` class is present

### Swipe not working
- Check MobileFullscreenPaging is defined
- Verify totalPages > 1
- Test on actual device (not desktop)

### Page indicators missing
- Only shows when totalPages > 1
- Check container has `mobile-paging` class
- Verify JavaScript setup() was called

### Orientation change issues
- System automatically rebuilds on orientation change
- Wait 200ms after orientationchange event
- Check console for errors during rebuild

## Browser Support

- ✅ iOS Safari 12+
- ✅ Chrome Mobile (Android) 80+
- ✅ Samsung Internet 11+
- ✅ Firefox Mobile 68+

## Performance

- **GPU Acceleration** - Uses `transform: translateZ(0)` and `will-change`
- **Smooth Scrolling** - CSS transitions with cubic-bezier easing
- **Efficient Rendering** - Only renders visible pages
- **Touch Optimized** - Passive event listeners where possible

## Example Implementation

See `LiveGames.html` or `Desktop-tv-sports-bar.html` for complete implementation examples.

## License

Part of GridTV Sports application. Proprietary.
