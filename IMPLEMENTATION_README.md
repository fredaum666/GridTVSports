# ⚡ GridTV Sports - Multi-Sport Live Games & Sports Bar Mode

> Real-time sports monitoring application for NFL, NBA, MLB, and NHL with immersive Sports Bar Mode

![Status](https://img.shields.io/badge/status-in%20progress-yellow)
![Node](https://img.shields.io/badge/node-18%2B-green)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 🎯 Features

### ✅ Completed
- ✅ **Multi-Sport Backend** - ESPN API integration for all 4 sports
- ✅ **Smart Caching System** - 15-second refresh for live games, 1-hour for completed
- ✅ **Background Jobs** - Auto-updates via node-cron every 15 seconds
- ✅ **Main Navigation** - Beautiful sport selection page
- ✅ **NFL Live Games** - Complete implementation with Sports Bar Mode
- ✅ **REST API** - Endpoints for NFL, NBA, MLB, NHL

### 🚧 In Progress  
- 🏀 NBA Live Games page
- ⚾ MLB Live Games page
- 🏒 NHL Live Games page
- 🎨 Sport-specific animations
- 📱 Mobile responsive design testing

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Server
```bash
npm start
# Server runs on http://localhost:3001
```

### 3. Development Mode (with nodemon)
```bash
npm run dev:backend
```

### 4. Open Browser
```
http://localhost:3001
```

---

## 📁 Project Structure

```
GridTVSports/
├── server.js              # Multi-sport Express backend
├── package.json           # Dependencies & scripts
├── public/                # Frontend files (pure HTML/CSS/JS)
│   ├── index.html        # Sport selection navigation
│   ├── nfl.html          # NFL live games (✅ Complete)
│   ├── nba.html          # NBA live games (🚧 In Progress)
│   ├── mlb.html          # MLB live games (🚧 In Progress)
│   ├── nhl.html          # NHL live games (🚧 In Progress)
│   ├── styles/           # CSS files
│   └── scripts/          # JavaScript files
└── LiveGames.html         # Reference design template
```

---

## 🔌 API Endpoints

### NFL
```
GET /api/nfl/scoreboard?week=18
GET /api/nfl/summary/:gameId
GET /api/nfl/current-week
```

### NBA
```
GET /api/nba/scoreboard?date=20241014
GET /api/nba/summary/:gameId
```

### MLB
```
GET /api/mlb/scoreboard?date=20241014
GET /api/mlb/summary/:gameId
```

### NHL
```
GET /api/nhl/scoreboard?date=20241014
GET /api/nhl/summary/:gameId
```

---

## 🏈 Sports Supported

### NFL (✅ Complete)
- ✅ Live game tracking
- ✅ Quarter-by-quarter scores
- ✅ Down & distance display
- ✅ Field position tracking
- ✅ Possession indicators
- ✅ Sports Bar Mode (2/4/6 games)
- ✅ Play animations (TD, FG, INT, Fumble)

### NBA (🚧 70% Complete - Backend Ready)
- ✅ Backend API ready
- 🚧 Quarter-by-quarter scores
- 🚧 Team fouls display
- 🚧 Leading scorers
- 🚧 Shot clock
- 🚧 Animations (3-pointer, dunk, block, steal)

### MLB (🚧 70% Complete - Backend Ready)
- ✅ Backend API ready
- 🚧 Inning-by-inning scores
- 🚧 Balls/Strikes/Outs count
- 🚧 Runners on base diamond
- 🚧 Current pitcher/batter
- 🚧 Animations (HR, strikeout, steal, DP)

### NHL (🚧 70% Complete - Backend Ready)
- ✅ Backend API ready
- 🚧 Period-by-period scores
- 🚧 Shots on goal
- 🚧 Power play indicator
- 🚧 Penalty tracking
- 🚧 Animations (goal, penalty, save, hat trick)

---

## 📺 Sports Bar Mode

### Features
- **2-Game Grid**: Side-by-side comparison
- **4-Game Grid**: Quad view (2x2)
- **6-Game Grid**: Six-pack view (3x2)
- **Fullscreen**: Immersive experience
- **Auto-Refresh**: Every 15 seconds
- **Sport-Specific Stats**: Unique to each sport
- **Mixed Sports**: Watch NFL + NBA simultaneously
- **Hover Controls**: Hidden controls reveal on hover

### Usage
1. Click "📺 Sports Bar Mode" button
2. Select layout (2, 4, or 6 games)
3. Choose which games to watch
4. Enter fullscreen
5. Hover at top to change games or exit

---

## 🎨 Design System

### Color Palette
```css
Background:     #0a0e1a  /* Dark navy */
Card:           #1a1f2e  /* Slate */
Accent NFL:     #17a2b8  /* Cyan */
Accent NBA:     #ef4444  /* Red */
Accent MLB:     #fbbf24  /* Amber */
Accent NHL:     #22c55e  /* Green */
Live Indicator: #dc2626  /* Bright red */
Winning:        #22c55e  /* Green */
```

### Typography
```
Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
```

---

## 🔧 Tech Stack

### Backend
- **Node.js 18+** - Runtime
- **Express.js** - Web framework
- **Axios** - HTTP client for ESPN API
- **node-cron** - Scheduled background jobs
- **CORS** - Cross-origin support

### Frontend
- **Pure HTML/CSS/JavaScript** - No frameworks
- **CSS Grid & Flexbox** - Responsive layouts
- **CSS Animations** - Smooth transitions
- **Fetch API** - Real-time data updates

### API
- **ESPN Sports API** - FREE, unlimited, no tracking

---

## ⏱️ Auto-Refresh System

### Smart Caching
```javascript
Live Games:      15 seconds  (Active polling)
Completed Games: 1 hour      (Long-term cache)
```

### Background Jobs
- NFL: Updates active weeks every 15s
- NBA: Updates active dates every 15s
- MLB: Updates active dates every 15s
- NHL: Updates active dates every 15s

---

## 🎯 Roadmap

### Phase 1: Backend (✅ Complete)
- [x] Multi-sport server setup
- [x] ESPN API integration (all 4 sports)
- [x] Smart caching system
- [x] Background auto-updates
- [x] REST API endpoints

### Phase 2: NFL (✅ Complete)
- [x] NFL live games page
- [x] Sports Bar Mode
- [x] Play animations
- [x] Real-time updates

### Phase 3: NBA (🚧 In Progress - 30%)
- [x] Backend API ready
- [ ] NBA live games page (copy nfl.html pattern)
- [ ] Quarter display
- [ ] Team fouls & scorers
- [ ] Basketball-specific animations

### Phase 4: MLB (🚧 Pending - 30%)
- [x] Backend API ready
- [ ] MLB live games page
- [ ] Inning display
- [ ] Count & runners
- [ ] Baseball-specific animations

### Phase 5: NHL (🚧 Pending - 30%)
- [x] Backend API ready
- [ ] NHL live games page
- [ ] Period display
- [ ] Shots & penalties
- [ ] Hockey-specific animations

### Phase 6: Testing & Polish
- [ ] Cross-browser testing
- [ ] Mobile responsive fixes
- [ ] Performance optimization
- [ ] Documentation

---

## 📝 Scripts

```bash
# Start production server
npm start

# Development with auto-restart
npm run dev:backend

# Install dependencies
npm install

# Run both frontend & backend (Vite + Node)
npm run dev
```

---

## 🌐 Deployment

### Current Status
- ✅ Local development ready
- ✅ Production build capable
- 🚧 Cloud deployment pending

### Deployment Options
- **Heroku**: Simple deployment
- **Azure**: Enterprise-grade hosting
- **AWS**: Scalable infrastructure
- **DigitalOcean**: Cost-effective option

---

## 📊 Progress Tracker

| Component | Status | Progress |
|-----------|--------|----------|
| Backend Server | ✅ Complete | 100% |
| NFL Frontend | ✅ Complete | 100% |
| NBA Frontend | 🚧 In Progress | 30% |
| MLB Frontend | 🚧 Pending | 30% |
| NHL Frontend | 🚧 Pending | 30% |
| Sports Bar Mode | ✅ Complete | 100% |
| Mobile Design | 🚧 Pending | 50% |
| Testing | 🚧 Pending | 20% |

**Overall Progress: 60%**

---

## 🐛 Known Issues

- [ ] NBA/MLB/NHL pages need to be created (backend ready)
- [ ] Sport-specific animations pending for NBA/MLB/NHL
- [ ] Mobile testing incomplete

---

## 🤝 Contributing

This is a work-in-progress project. Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

---

## 📜 License

MIT License - Feel free to use this project as you wish.

---

## 🙏 Credits

- **ESPN API** - Free sports data
- **LiveGames.html** - Design reference template
- **GridTV Sports Team** - Development

---

## 📞 Support

For questions or issues:
1. Check the documentation
2. Review the code comments
3. Open an issue on GitHub

---

**Built with ❤️ for sports fans everywhere** 🏈🏀⚾🏒
