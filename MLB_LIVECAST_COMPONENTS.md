# MLB Live Cast - Component Breakdown

Visual hierarchy and component reference for the MLB Live Cast interface.

## 📐 Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                           [LIVE] Indicator│
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ BALLS ●●○○  STRIKES ●●○  OUTS ●○○    INNING: Top 5th       │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  MAIN CONTENT                                                    │
│  ┌──────────────────────────────┬─────────────────────────────┐ │
│  │ LEFT PANEL                   │ RIGHT PANEL                 │ │
│  │                              │                             │ │
│  │ ┌──────────────────────────┐ │ ┌─────────────────────────┐ │ │
│  │ │  MATCHUP                 │ │ │  BASE RUNNERS           │ │ │
│  │ │  Pitcher  VS  Batter     │ │ │     ◇                   │ │ │
│  │ └──────────────────────────┘ │ │    ◇ ◇ ◇                │ │ │
│  │                              │ │  ON DECK: Player Name   │ │ │
│  │ ┌──────────────────────────┐ │ └─────────────────────────┘ │ │
│  │ │  STRIKE ZONE             │ │                             │ │
│  │ │                          │ │ ┌─────────────────────────┐ │ │
│  │ │     ╔═══╦═══╦═══╗        │ │ │  PITCH HISTORY          │ │ │
│  │ │     ║ 1 ║ 2 ║ 3 ║        │ │ │  ┌───────────────────┐ │ │ │
│  │ │     ╠═══╬═══╬═══╣        │ │ │  │ ➊ Strike Looking  │ │ │ │
│  │ │     ║ 4 ║ 5 ║ 6 ║        │ │ │  │   Sinker • 95 MPH │ │ │ │
│  │ │     ╠═══╬═══╬═══╣        │ │ │  └───────────────────┘ │ │ │
│  │ │     ║ 7 ║ 8 ║ 9 ║        │ │ │  ┌───────────────────┐ │ │ │
│  │ │     ╚═══╩═══╩═══╝        │ │ │  │ ➋ Ball            │ │ │ │
│  │ │      Pitches: ➊➋➌       │ │ │  │   Slider • 88 MPH │ │ │ │
│  │ └──────────────────────────┘ │ │  └───────────────────┘ │ │ │
│  │                              │ │         ↓↓↓             │ │ │
│  │ ┌──────────────────────────┐ │ │                         │ │ │
│  │ │ PITCH COUNT: 47          │ │ │  (Scrollable List)      │ │ │
│  │ └──────────────────────────┘ │ └─────────────────────────┘ │ │
│  └──────────────────────────────┴─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 Component Hierarchy

### 1. Header Components

#### **Game State Display**
```
.game-state
├── .count-display
│   ├── .count-group (Balls)
│   ├── .count-group (Strikes)
│   └── .count-group (Outs)
└── .inning-display
```

**Key Features:**
- Animated dots for count indicators
- Neon glow effect on active indicators
- Teko font for numbers
- Pulse animation on live updates

#### **Live Indicator**
```
.live-indicator
├── .live-dot (pulsing red circle)
└── .live-text ("LIVE")
```

**Styling:**
- Positioned absolute (top-right)
- Red color (#ff0000)
- Pulsing animation
- Backdrop blur

### 2. Left Panel Components

#### **Matchup Display**
```
.matchup-display
├── .pitcher-info
│   ├── .player-label
│   ├── .player-name (Teko, 36px)
│   ├── .player-stats
│   └── .player-hand
├── .vs-divider ("VS")
└── .batter-info
    ├── .player-label
    ├── .player-name
    ├── .player-stats
    └── .player-hand
```

**Styling:**
- Grid layout (1fr auto 1fr)
- Glassmorphism background
- Orange gradient border (top)
- Large Teko font for names

#### **Strike Zone Container**
```
.strike-zone-container
├── .zone-label ("STRIKE ZONE")
└── #strikeZoneSVG
    └── SVGStrikeZone (JavaScript class)
        ├── Strike zone box (200x280px)
        ├── Grid lines (3x3)
        ├── Zone numbers (1-9)
        ├── Home plate (pentagon)
        └── Pitch markers (dynamic)
```

**SVG Elements:**
- Outer glow filter
- Zone gradient background
- Animated pitch rings
- Color-coded pitch dots
- Numbered sequence

**Pitch Colors:**
```
Fastball (FF):  #FF4444 (red)
Sinker (SI):    #FF6B6B (light red)
Cutter (FC):    #FF8888 (pale red)
Slider (SL):    #4444FF (blue)
Curveball (CU): #6B6BFF (light blue)
Changeup (CH):  #44FF44 (green)
Splitter (FS):  #6BFF6B (light green)
```

#### **Pitch Count Display**
```
.pitch-count-display
├── .pitch-count-label ("PITCH COUNT")
└── .pitch-count-value (48px Teko)
```

### 3. Right Panel Components

#### **Runners Display**
```
.runners-display
├── .runners-label ("ON BASE")
├── .diamond-container
│   └── .baseball-diamond (SVG)
│       ├── Diamond path
│       ├── Base squares (1B, 2B, 3B, Home)
│       └── Base labels
└── .ondeck-display
    ├── .ondeck-label ("ON DECK")
    └── .ondeck-name
```

**Base States:**
- `.base` - Empty (dim)
- `.base.occupied` - Runner on base (orange glow)
- `.base.home-base` - Always white

#### **Pitch History**
```
.pitch-history
├── .history-header
│   ├── .history-label ("PITCH HISTORY")
│   └── .history-count ("5 pitches")
└── .pitch-list (scrollable)
    └── .pitch-item (×N)
        ├── .pitch-number (colored square)
        └── .pitch-details
            ├── .pitch-result
            └── .pitch-meta
                ├── .pitch-type
                └── .pitch-speed
```

**Pitch Item Layout:**
```
┌─────┬────────────────────────┐
│  ➊  │ Strike Looking         │
│     │ Sinker • 95 MPH        │
└─────┴────────────────────────┘
```

**Hover Effects:**
- Background lightens
- Orange border glow
- Slides right 4px
- Highlights corresponding pitch on strike zone

## 🎭 Animations

### Entrance Animations

```css
/* Pitch item slide-in */
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### Continuous Animations

```css
/* Live dot pulse */
@keyframes live-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

/* Count dot pulse (when active) */
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.9; }
}

/* Strike zone glow */
@keyframes zone-glow {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(255, 107, 0, 0.3)); }
  50% { filter: drop-shadow(0 0 8px rgba(255, 107, 0, 0.5)); }
}

/* Pitch ring pulse (on new pitch) */
@keyframes ring-pulse {
  0% { r: 10; opacity: 0.8; }
  100% { r: 20; opacity: 0; }
}

/* Base glow (when occupied) */
@keyframes base-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

## 🎨 Color System

### Primary Colors
```css
--bg-primary: #0a0a0a;           /* Main background */
--bg-card: rgba(255,255,255,0.02); /* Card backgrounds */
--accent-primary: #FF6B00;        /* Orange accent */
```

### Text Colors
```css
--text-primary: #ffffff;          /* Main text */
--text-secondary: rgba(255,255,255,0.6); /* Secondary text */
--text-dim: rgba(255,255,255,0.4);       /* Dim labels */
```

### Semantic Colors
```css
--live-red: #ff0000;             /* Live indicator */
--pitch-fastball: #FF4444;       /* Fastball pitches */
--pitch-breaking: #4444FF;       /* Breaking balls */
--pitch-offspeed: #44FF44;       /* Offspeed pitches */
```

## 📱 Responsive Breakpoints

```css
/* Desktop: Full layout */
@media (min-width: 1400px) {
  .livecast-main {
    grid-template-columns: 1fr 400px;
  }
}

/* Tablet: Narrower right panel */
@media (max-width: 1400px) {
  .livecast-main {
    grid-template-columns: 1fr 350px;
  }
}

/* Small tablet: Stacked layout */
@media (max-width: 1200px) {
  .livecast-main {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
}

/* Mobile: Condensed UI */
@media (max-width: 768px) {
  .player-name { font-size: 28px; }
  .pitch-count-value { font-size: 36px; }
  .count-display { gap: 20px; }
}
```

## 🔧 JavaScript API

### MLBStrikeZone Class

```javascript
const strikeZone = new MLBStrikeZone(container, {
  width: 400,
  height: 500,
  teamColors: { home: '#FF6B00', away: '#00A8E8' }
});

// Add a pitch
strikeZone.addPitch({
  type: 'SI',              // Pitch type code
  speed: 94.9,             // MPH
  result: 'Strike Looking',
  coordinates: { pX: -0.71, pZ: 3.63 },
  count: { balls: 2, strikes: 3 }
});

// Clear all pitches
strikeZone.clearPitches();

// Highlight specific pitch
strikeZone.highlightPitch(2); // Index

// Reset highlights
strikeZone.resetHighlight();
```

### MLBLiveCast Class

```javascript
const liveCast = new MLBLiveCast(gameId, container);

// Manual data refresh
await liveCast.fetchGameData();

// Stop auto-updates
liveCast.stopAutoUpdate();

// Clean up
liveCast.destroy();
```

## 📊 Performance Considerations

### Optimization Strategies

1. **SVG Rendering**
   - Use `createElementNS` for SVG elements
   - Batch DOM updates
   - CSS transforms over position changes

2. **Auto-Updates**
   - 3-second interval (configurable)
   - Stops when destroyed
   - Minimal DOM manipulation

3. **Animations**
   - CSS-only (GPU accelerated)
   - Use `transform` and `opacity`
   - Avoid `width`, `height`, `top`, `left`

4. **Data Processing**
   - Cache parsed data
   - Filter pitch events once
   - Reuse DOM elements where possible

---

**Component count:** 15 major components
**Animation count:** 6 keyframe animations
**Color variables:** 10+ semantic colors
**Responsive breakpoints:** 4 levels
