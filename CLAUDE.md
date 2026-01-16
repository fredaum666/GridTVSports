# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role & Tone

- Act as a senior full-stack developer with expertise in real-time sports applications
- Be concise and direct in responses
- Prioritize working code over lengthy explanations
- When suggesting changes, show the actual code rather than describing it
- Assume familiarity with the codebase structure and conventions

## Tech Stack

**Backend:**
- Node.js with Express.js
- PostgreSQL with connection pooling
- Socket.io for real-time communication
- Stripe for payments
- Web Push + Firebase Cloud Messaging

**Frontend:**
- Vanilla JavaScript (no framework for main app)
- React (admin tools only - `/public/grid-config/`)
- CSS with responsive design
- SVG animations for field visualizations

**Native Apps:**
- Android TV/Mobile (Kotlin)
- iOS/Apple TV (Swift)
- Roku (BrightScript)
- Samsung Tizen / LG webOS (Web-based)

**External APIs:**
- ESPN API for live sports data

## Build & Development Commands

```bash
npm run dev          # Start development server with nodemon (auto-reload)
npm run start        # Start production server
npm run build        # Webpack production build (outputs to /public/dist/)
npm run setup-db     # Initialize PostgreSQL database schema
npm run test-db      # Test database connection
```

Server runs on port 3001 (configurable via .env PORT variable).

## Architecture & File Structure

GridTVSports is a multi-sport live games platform that displays real-time scores across NFL, NBA, MLB, NHL, NCAA Football, and NCAA Basketball.

### Backend (server.js)
- **Express.js** server with 100+ API endpoints
- **PostgreSQL** database with connection pooling (db.js)
- **ESPN API** integration with 30-second cron refresh for live games
- **Stripe** subscription management with webhook handling
- **Socket.io** for real-time updates and TV casting
- **Web Push + Firebase Cloud Messaging** for notifications

### Frontend Architecture
```
/public/
├── index.html              # Main responsive app (desktop/tablet/mobile)
├── tv-sports-bar.html      # TV display mode
├── Phone-sports-bar.html   # Phone-optimized display
├── Desktop-tv-sports-bar.html
├── scripts/
│   ├── field-visualizer-svg.js  # SVG football field with animations
│   ├── play-animations.js       # Turnover, TD, penalty animations
│   └── push-notifications.js    # Web push integration
├── grid-config/            # React admin tool for layout customization
└── assets/                 # Team logos (all 32 NFL teams, plus other leagues)
```

### Native TV Apps
```
/tv-apps/
├── android-tv/      # Android TV & Mobile
├── ios-mobile/      # iOS app
├── roku/            # Roku TV
├── samsung-tizen/   # Samsung TV
├── lg-webos/        # LG TV
└── apple-tv/        # Apple TV
```

## Key API Endpoints

**Sports Data:**
- `GET /api/{sport}/scoreboard` - Live scores (nfl, nba, mlb, nhl, ncaa, ncaab)
- `GET /api/{sport}/summary/:gameId` - Detailed game stats

**Authentication:**
- `POST /api/auth/login`, `/register`, `/logout`
- `GET /api/auth/check` - Session validation

**Subscriptions:**
- `POST /api/webhook/stripe` - Stripe webhook (raw body required)
- `GET /api/subscription/status` - User subscription status

**TV Casting:**
- `POST /api/tv/generate-qr-token` - QR code for TV pairing
- `POST /api/tv/approve` - Approve TV pairing

## SVG Field Visualizer

The `SVGFieldVisualizer` class (`field-visualizer-svg.js`) provides ESPN-style football field animations:

```javascript
const visualizer = new SVGFieldVisualizer(container, {
    compressed: true,           // Compact mode for grids 3-8
    showGoalPosts: true,
    showYardNumbers: false,     // Use compact yard markers instead
    awayColor: '#003594',
    homeColor: '#000000'
});

// Animation methods
visualizer.animatePass(fromYard, toYard, arcHeight, duration);
visualizer.animateRush(fromYard, toYard, duration);
visualizer.animateKickoff(fromYard, toYard, returnYards, duration);
visualizer.animatePunt(fromYard, toYard, returnYards, duration);
visualizer.animatePenalty(fromYard, toYard, duration, { isGain: true });
visualizer.animateFieldGoal(fromYard, direction, duration);
visualizer.animateTouchdown(playType, fromYard, toYard, duration);

// Position updates
visualizer.setBallPosition(yardPosition);  // 0-100 (0=away goal, 100=home goal)
visualizer.setFirstDownPosition(yardPosition, visible);
```

**Coordinate System:** Yard positions 0-100 where 0 = away team's end zone, 100 = home team's end zone.

## Display Pages Configuration

Each display page initializes field visualizers with device-specific settings:
- **TV/Desktop:** Full field with yard numbers and one-yard lines
- **Phone:** Always compressed with larger yard markers (12px font)
- **Grids 3-8:** Compact field with 10-yard markers below

## Environment Variables Required

```
DATABASE_URL          # PostgreSQL connection string
PORT                  # Server port (default 3001)
STRIPE_SECRET_KEY     # Stripe API key
STRIPE_WEBHOOK_SECRET # Stripe webhook signature
VAPID_PUBLIC_KEY      # Web push public key
VAPID_PRIVATE_KEY     # Web push private key
SESSION_SECRET        # Express session encryption
```

## Data Flow

1. **Cron jobs** (every 30 seconds) fetch live game data from ESPN API
2. **Cache layer** stores responses to reduce API calls
3. **Frontend** polls `/api/{sport}/scoreboard` for updates
4. **Socket.io** pushes real-time updates for TV casting
5. **Play animations** trigger based on game state changes (turnovers, TDs, penalties)

## Grid System

Games display in configurable grids:
- Grid 1: Single game fullscreen
- Grid 2: 2 games
- Grids 3-8: Multiple games with compact field visualizers

The `driveToward` property in animation data indicates drive direction (0 = toward away end zone, 100 = toward home end zone) for correct first down line calculations.

## Coding Rules & Standards

**JavaScript:**
- Use ES6+ syntax (const/let, arrow functions, template literals)
- Prefer async/await over raw Promises
- Use descriptive variable names (e.g., `gameData` not `gd`)
- Add JSDoc comments for complex functions

**CSS:**
- Use CSS custom properties for colors and spacing
- Mobile-first responsive design
- Avoid `!important` except for critical overrides

**File Naming:**
- kebab-case for files: `field-visualizer-svg.js`
- PascalCase for classes: `SVGFieldVisualizer`
- camelCase for functions/variables: `animatePass`, `ballPosition`

**Error Handling:**
- Always wrap async operations in try/catch
- Log errors with context: `console.error('Failed to fetch game:', gameId, error)`
- Return meaningful error responses from API endpoints

**Performance:**
- Cache ESPN API responses (30-second refresh cycle)
- Use connection pooling for database queries
- Minimize DOM manipulation in animations (use requestAnimationFrame)
- Avoid blocking the main thread with heavy computations

**Security:**
- Validate all user input on the server
- Use parameterized queries for PostgreSQL
- Never expose API keys in frontend code
- Verify Stripe webhook signatures
