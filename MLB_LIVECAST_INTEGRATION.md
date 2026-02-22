# MLB Live Cast Integration Guide

ESPN-quality pitch-by-pitch game visualization for GridTV Sports.

## 🎯 Features

- **Real-time pitch tracking** with MLB Stats API
- **Interactive strike zone** showing pitch locations with numbered sequence
- **Broadcast-style UI** with kinetic animations
- **Pitch history** with type, speed, and result
- **Base runners visualization** with live updates
- **Game state display** (balls, strikes, outs)
- **Pitcher vs Batter matchup** with stats

## 📁 Files Created

```
/public/scripts/mlb-strike-zone.js    - Strike zone SVG visualization
/public/scripts/mlb-livecast.js       - Main live cast controller
/public/styles/mlb-livecast.css       - Broadcast-quality styles
/public/mlb-livecast-demo.html        - Standalone demo page
```

## 🚀 Quick Start

### Option 1: Standalone Demo

Visit: `http://localhost:3001/mlb-livecast-demo.html`

Enter any MLB game ID from today's schedule:
```bash
# Get today's games
curl "https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-02-20" | jq '.dates[0].games[].gamePk'
```

### Option 2: Direct URL

```
http://localhost:3001/mlb-livecast-demo.html?gameId=832034
```

## 🔌 Integration with Existing Game Cards

### Step 1: Add Scripts to HTML

In `index.html`, `tv-sports-bar.html`, etc., add before closing `</body>`:

```html
<!-- MLB Live Cast -->
<link rel="stylesheet" href="/styles/mlb-livecast.css">
<script src="/scripts/mlb-strike-zone.js"></script>
<script src="/scripts/mlb-livecast.js"></script>
```

### Step 2: Trigger Live Cast on Card Click

Add to your existing game card click handler:

```javascript
// In your game card click handler
function onGameCardClick(gameData, cardElement) {
  const sport = gameData.sport;
  const gameId = gameData.gameId;

  // Only activate live cast for MLB games
  if (sport !== 'MLB') {
    // Handle other sports normally
    return;
  }

  // Get the MLB game ID (from ESPN API)
  // Note: You'll need to map ESPN game IDs to MLB Stats API game IDs
  const mlbGameId = await getMlbGameId(gameId);

  // Create fullscreen container
  const container = document.createElement('div');
  container.id = 'fullscreen-livecast';
  container.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: #0a0a0a;
  `;
  document.body.appendChild(container);

  // Initialize live cast
  const liveCast = new MLBLiveCast(mlbGameId, container);

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    color: white;
    font-size: 24px;
    cursor: pointer;
    z-index: 10001;
  `;
  closeBtn.onclick = () => {
    liveCast.destroy();
    container.remove();
  };
  container.appendChild(closeBtn);
}
```

### Step 3: Map ESPN Game IDs to MLB Stats API IDs

ESPN and MLB Stats API use different game ID formats. You'll need to either:

**Option A: Store both IDs in database**
```javascript
// When fetching from ESPN API, also fetch MLB Stats API game ID
const espnGameId = event.id;
const mlbGameId = await fetchMLBGameId(event.date, event.teams);
```

**Option B: Use date/team matching**
```javascript
async function getMlbGameId(espnGameId, gameDate, teams) {
  // Fetch MLB schedule for the date
  const mlbSchedule = await fetch(
    `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${gameDate}`
  ).then(r => r.json());

  // Find matching game by teams
  const game = mlbSchedule.dates[0]?.games.find(g => {
    const homeTeam = g.teams.home.team.abbreviation;
    const awayTeam = g.teams.away.team.abbreviation;
    return (homeTeam === teams.home && awayTeam === teams.away);
  });

  return game?.gamePk;
}
```

## 🎨 Customization

### Theme Colors

Edit CSS variables in `mlb-livecast.css`:

```css
.mlb-livecast {
  --accent-primary: #FF6B00;  /* Change orange accent */
  --bg-primary: #0a0a0a;      /* Change background */
}
```

### Pitch Colors

Edit `getPitchColor()` in `mlb-strike-zone.js`:

```javascript
getPitchColor(pitchType) {
  const colors = {
    'FF': '#FF4444',  // Four-seam fastball (red)
    'SL': '#4444FF',  // Slider (blue)
    'CH': '#44FF44',  // Changeup (green)
    // Add more pitch types...
  };
  return colors[pitchType] || '#888888';
}
```

### Update Interval

Change refresh rate in `mlb-livecast.js`:

```javascript
startAutoUpdate() {
  this.updateInterval = setInterval(() => {
    this.fetchGameData();
  }, 3000); // Change to 5000 for 5 seconds, etc.
}
```

## 📊 Data Structure

### MLB Stats API Response

```javascript
{
  liveData: {
    plays: {
      currentPlay: {
        matchup: {
          pitcher: { id, fullName },
          batter: { id, fullName },
          pitchHand: { code, description },
          batSide: { code, description }
        },
        playEvents: [
          {
            isPitch: true,
            details: {
              type: { code: 'FF', description: 'Four-Seam Fastball' },
              call: { description: 'Strike Looking' }
            },
            pitchData: {
              startSpeed: 94.9,
              coordinates: { pX: -0.71, pZ: 3.63, x: 144.05, y: 140.81 }
            },
            count: { balls: 2, strikes: 3, outs: 2 }
          }
        ]
      }
    },
    linescore: {
      balls: 2,
      strikes: 3,
      outs: 2,
      currentInning: 5,
      currentInningOrdinal: 'Top 5th'
    }
  }
}
```

## 🔧 Troubleshooting

### "Game data not loading"
- Check if the game ID is valid and the game is live/recent
- Verify MLB Stats API is accessible: `curl https://statsapi.mlb.com/api/v1/game/832034/feed/live`

### "Strike zone not showing pitches"
- Ensure `pitchData.coordinates` exists in the API response
- Check console for errors in coordinate mapping

### "Styles not applying"
- Verify CSS file is loaded: check Network tab in DevTools
- Ensure Teko font is loading from Google Fonts

### "Updates not happening"
- Check auto-update interval is running
- Verify network requests are succeeding (Network tab)

## 🎯 Future Enhancements

- [ ] Add pitch trajectory animations (flight path)
- [ ] Hot/cold zones visualization
- [ ] Pitcher repertoire breakdown
- [ ] Swing/contact animations
- [ ] Replay previous pitches
- [ ] Sound effects for strikes/balls
- [ ] Mobile-optimized layout
- [ ] Integration with other sports (NFL play-by-play, NBA shot chart)

## 📚 API Documentation

- **MLB Stats API**: https://github.com/toddrob99/MLB-StatsAPI
- **Pitch Types Reference**: https://library.fangraphs.com/pitch-type-abbreviations-classifications/
- **Statcast Data**: https://baseballsavant.mlb.com/

## 🎨 Design Philosophy

This live cast uses a **broadcast sports aesthetic**:
- Bold typography (Teko font for stadium feel)
- Kinetic energy with smooth animations
- Data-dense but organized layout
- High contrast for TV-style visibility
- Neon accents for live indicators
- Glassmorphism for depth

Inspired by ESPN GameCast, NFL RedZone, and modern sports broadcasting.

---

Built for GridTV Sports with ⚾ and 🔥
