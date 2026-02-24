/**
 * MLB Live Cast Controller
 * Real-time pitch-by-pitch game visualization
 */

// MLB Team Colors
const MLB_COLORS = {
  ARI: { primary: '#A71930', secondary: '#E3D4AD' },
  ATL: { primary: '#CE1141', secondary: '#13274F' },
  BAL: { primary: '#DF4601', secondary: '#000000' },
  BOS: { primary: '#BD3039', secondary: '#0C2340' },
  CHC: { primary: '#0E3386', secondary: '#CC3433' },
  CWS: { primary: '#27251F', secondary: '#C4CED4' },
  CIN: { primary: '#C6011F', secondary: '#000000' },
  CLE: { primary: '#E31937', secondary: '#0C2340' },
  COL: { primary: '#33006F', secondary: '#C4CED4' },
  DET: { primary: '#0C2340', secondary: '#FA4616' },
  HOU: { primary: '#002D62', secondary: '#EB6E1F' },
  KC: { primary: '#004687', secondary: '#BD9B60' },
  LAA: { primary: '#BA0021', secondary: '#003263' },
  LAD: { primary: '#005A9C', secondary: '#EF3E42' },
  MIA: { primary: '#00A3E0', secondary: '#EF3340' },
  MIL: { primary: '#FFC52F', secondary: '#12284B' },
  MIN: { primary: '#002B5C', secondary: '#D31145' },
  NYM: { primary: '#002D72', secondary: '#FF5910' },
  NYY: { primary: '#0C2340', secondary: '#C4CED4' },
  OAK: { primary: '#003831', secondary: '#EFB21E' },
  PHI: { primary: '#E81828', secondary: '#002D72' },
  PIT: { primary: '#FDB827', secondary: '#27251F' },
  SD: { primary: '#2F241D', secondary: '#FFC425' },
  SF: { primary: '#FD5A1E', secondary: '#27251F' },
  SEA: { primary: '#0C2C56', secondary: '#005C5C' },
  STL: { primary: '#C41E3A', secondary: '#0C2340' },
  TB: { primary: '#092C5C', secondary: '#8FBCE6' },
  TEX: { primary: '#003278', secondary: '#C0111F' },
  TOR: { primary: '#134A8E', secondary: '#1D2D5C' },
  WSH: { primary: '#AB0003', secondary: '#14225A' }
};

class MLBLiveCast {
  constructor(gameId, container) {
    this.gameId = gameId;
    this.container = container;
    this.strikeZone = null;
    this.currentPlay = null;
    this.gameData = null;
    this.updateInterval = null;
    this.isActive = false;
    this.totalPitches = 0;
    this.lastAtBatIndex = null;
    this.lastPitchCount = 0;
    this.wpData = [];

    // UI elements
    this.elements = {};

    this.init();
  }

  async init() {
    this.createUI();
    await Promise.all([this.fetchGameData(), this.fetchWinProbability()]);
    this.startAutoUpdate();
  }

  createUI() {
    const html = `
      <div class="mlb-livecast">

        <!-- Matchup Header -->
        <div class="matchup-header">
          <div class="pitcher-section">
            <div class="team-logo-container pitcher-logo">
              <img class="team-logo-img" data-pitcher-logo src="" alt="Pitcher Team" style="display: none;">
            </div>
            <div class="player-details">
              <div class="player-role">Pitcher</div>
              <div class="player-name" data-pitcher-name>Loading...</div>
              <div class="player-stats" data-pitcher-stats>-</div>
            </div>
          </div>

          <div class="vs-divider">VS</div>

          <div class="batter-section">
            <div class="player-details">
              <div class="player-role">Batter</div>
              <div class="player-name" data-batter-name>Loading...</div>
              <div class="player-stats" data-batter-stats>-</div>
            </div>
            <div class="team-logo-container batter-logo">
              <img class="team-logo-img" data-batter-logo src="" alt="Batter Team" style="display: none;">
            </div>
          </div>
        </div>

        <!-- BSO Count -->
        <div class="bso-row">
          <div class="bso-group">
            <span class="bso-label">B</span>
            <div class="bso-dots" data-ball-indicator>
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </div>
          <div class="bso-group">
            <span class="bso-label">S</span>
            <div class="bso-dots" data-strike-indicator>
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </div>
          <div class="bso-group">
            <span class="bso-label">O</span>
            <div class="bso-dots" data-out-indicator>
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </div>
        </div>

        <!-- Info Bar: Pitch Count · On Deck -->
        <div class="sub-header">
          <div class="pitch-count-info">
            Pitches <span data-pitch-count>--</span>
          </div>
          <div class="ondeck-info">
            On Deck <span data-ondeck>—</span>
          </div>
        </div>

        <!-- Body: Bases | Strike Zone | Pitch History -->
        <div class="livecast-body">

          <!-- Base Runners (Left) -->
          <div class="bases-panel">
            <div class="base-diamond-display">
              <div class="base-node" data-base="2"></div>
              <div class="base-node" data-base="3"></div>
              <div class="base-node" data-base="1"></div>
            </div>
            <div class="base-runner-list">
              <div class="base-runner-row empty" data-runner-row="1">
                <span class="base-runner-label">1B</span>
                <span class="base-runner-name" data-runner-name="1">—</span>
              </div>
              <div class="base-runner-row empty" data-runner-row="2">
                <span class="base-runner-label">2B</span>
                <span class="base-runner-name" data-runner-name="2">—</span>
              </div>
              <div class="base-runner-row empty" data-runner-row="3">
                <span class="base-runner-label">3B</span>
                <span class="base-runner-name" data-runner-name="3">—</span>
              </div>
            </div>
          </div>

          <!-- Strike Zone (Center) -->
          <div class="strike-zone-section">
            <div id="strikeZoneSVG"></div>
          </div>

          <!-- Pitch History (Right) -->
          <div class="pitch-history-panel" data-pitch-list></div>

        </div>
      </div>
    `;

    this.container.innerHTML = html;

    // Cache element references
    this.elements = {
      pitcherName: this.container.querySelector('[data-pitcher-name]'),
      pitcherStats: this.container.querySelector('[data-pitcher-stats]'),
      batterName: this.container.querySelector('[data-batter-name]'),
      batterStats: this.container.querySelector('[data-batter-stats]'),
      pitcherLogo: this.container.querySelector('[data-pitcher-logo]'),
      batterLogo: this.container.querySelector('[data-batter-logo]'),
      pitcherSection: this.container.querySelector('.pitcher-section'),
      batterSection: this.container.querySelector('.batter-section'),
      pitchCount: this.container.querySelector('[data-pitch-count]'),
      ondeck: this.container.querySelector('[data-ondeck]'),
      ballIndicator: this.container.querySelector('[data-ball-indicator]'),
      strikeIndicator: this.container.querySelector('[data-strike-indicator]'),
      outIndicator: this.container.querySelector('[data-out-indicator]'),
      pitchList: this.container.querySelector('[data-pitch-list]'),
      baseNodes: {
        1: this.container.querySelector('.base-node[data-base="1"]'),
        2: this.container.querySelector('.base-node[data-base="2"]'),
        3: this.container.querySelector('.base-node[data-base="3"]')
      },
      runnerRows: {
        1: this.container.querySelector('[data-runner-row="1"]'),
        2: this.container.querySelector('[data-runner-row="2"]'),
        3: this.container.querySelector('[data-runner-row="3"]')
      },
      runnerNames: {
        1: this.container.querySelector('[data-runner-name="1"]'),
        2: this.container.querySelector('[data-runner-name="2"]'),
        3: this.container.querySelector('[data-runner-name="3"]')
      }
    };

    // Initialize strike zone (smaller)
    const strikeZoneContainer = this.container.querySelector('#strikeZoneSVG');
    this.strikeZone = new MLBStrikeZone(strikeZoneContainer, {
      width: 200,
      height: 260
    });

    // Inject win probability chart watermark as first child of .fs-scoreboard
    // .fs-scoreboard has position:relative and overflow:visible so the chart
    // can extend upward (negative top) behind the team logos
    const scoreboard = this.container.closest('.fullscreen-game-card')?.querySelector('.fs-scoreboard');
    if (scoreboard) {
      const wpEl = document.createElement('div');
      wpEl.className = 'wp-chart-watermark';
      wpEl.setAttribute('data-wp-chart', '');
      scoreboard.insertBefore(wpEl, scoreboard.firstChild);
      this.wpChartEl = wpEl;
    } else {
      console.warn('[MLB LiveCast] Could not find .fs-scoreboard for win probability chart');
    }

    this.isActive = true;
  }

  async fetchGameData() {
    try {
      const response = await fetch(`/api/mlb/livecast/${this.gameId}`);
      const data = await response.json();

      this.gameData = data;
      this.updateUI(data);
    } catch (error) {
      console.error('[MLB LiveCast] Error fetching game data:', error);
    }
  }

  async fetchWinProbability() {
    try {
      const response = await fetch(`/api/mlb/win-probability/${this.gameId}`);
      const data = await response.json();
      console.log(`[WP] game ${this.gameId}: ${data.wpa?.length ?? 0} points`);
      if (Array.isArray(data.wpa) && data.wpa.length > 0) {
        this.wpData = data.wpa;
        // gameData may not be set yet on first parallel load — teams come from updateWinProbability call in updateUI instead
        const teams = this.gameData?.gameData?.teams;
        this.updateWinProbability(teams);
      }
    } catch (error) {
      console.error('[WP] fetch error:', error);
    }
  }

  updateUI(data) {
    if (!data.liveData) return;

    const { plays, linescore } = data.liveData;
    const currentPlay = plays ? plays.currentPlay : null;

    // Get team info
    const awayTeam = data.gameData?.teams?.away;
    const homeTeam = data.gameData?.teams?.home;

    // Update matchup
    if (currentPlay && currentPlay.matchup) {
      const { pitcher, batter } = currentPlay.matchup;

      if (this.elements.pitcherName) {
        this.elements.pitcherName.textContent = pitcher.fullName;
      }

      if (this.elements.batterName) {
        this.elements.batterName.textContent = batter.fullName;
      }

      // Determine which team each player belongs to and update logos
      const inningHalf = linescore?.inningHalf || 'Top';
      const pitchingTeam = inningHalf === 'Top' ? homeTeam : awayTeam;
      const battingTeam = inningHalf === 'Top' ? awayTeam : homeTeam;

      if (pitchingTeam && this.elements.pitcherLogo) {
        const logoPath = `https://www.mlbstatic.com/team-logos/${pitchingTeam.id}.svg`;
        this.elements.pitcherLogo.style.display = '';
        this.elements.pitcherLogo.src = logoPath;
        this.elements.pitcherLogo.onerror = () => {
          this.elements.pitcherLogo.style.display = 'none';
        };

        // Update pitcher section background color
        const pitchingColors = MLB_COLORS[pitchingTeam.abbreviation];
        if (pitchingColors && this.elements.pitcherSection) {
          this.elements.pitcherSection.style.background = `linear-gradient(135deg, ${pitchingColors.primary}22 0%, ${pitchingColors.primary}33 100%)`;
        }
      }

      if (battingTeam && this.elements.batterLogo) {
        const logoPath = `https://www.mlbstatic.com/team-logos/${battingTeam.id}.svg`;
        this.elements.batterLogo.style.display = '';
        this.elements.batterLogo.src = logoPath;
        this.elements.batterLogo.onerror = () => {
          this.elements.batterLogo.style.display = 'none';
        };

        // Update batter section background color
        const battingColors = MLB_COLORS[battingTeam.abbreviation];
        if (battingColors && this.elements.batterSection) {
          this.elements.batterSection.style.background = `linear-gradient(135deg, ${battingColors.primary}22 0%, ${battingColors.primary}33 100%)`;
        }
      }

      // Get pitcher stats
      if (data.liveData.boxscore && this.elements.pitcherStats) {
        const pitcherStats = this.getPitcherStats(data.liveData.boxscore, pitcher.id);
        this.elements.pitcherStats.textContent = pitcherStats;
      }

      // Get batter stats from boxscore
      if (data.liveData.boxscore && this.elements.batterStats) {
        const batterStats = this.getBatterStats(data.liveData.boxscore, batter.id);
        this.elements.batterStats.textContent = batterStats;
      }
    } else if (data.gameData) {
      // Pre-game: show probable pitchers if available
      const probPitchers = data.gameData.probablePitchers;
      if (probPitchers) {
        if (probPitchers.away && this.elements.pitcherName) {
          this.elements.pitcherName.textContent = probPitchers.away.fullName || 'TBD';
          if (this.elements.pitcherStats) {
            this.elements.pitcherStats.textContent = 'Probable Starter';
          }
        }
        if (probPitchers.home && this.elements.batterName) {
          this.elements.batterName.textContent = probPitchers.home.fullName || 'TBD';
          if (this.elements.batterStats) {
            this.elements.batterStats.textContent = 'Probable Starter';
          }
        }
      } else {
        if (this.elements.pitcherName) this.elements.pitcherName.textContent = 'TBD';
        if (this.elements.batterName) this.elements.batterName.textContent = 'TBD';
      }

      // Show game status
      const status = data.gameData.status;
      if (status && this.elements.pitchCount) {
        if (status.abstractGameState === 'Preview') {
          this.elements.pitchCount.textContent = '--';
        }
      }
    }

    // Update pitch history
    if (currentPlay && currentPlay.playEvents) {
      this.updatePitchHistory(currentPlay.playEvents, currentPlay.atBatIndex);

      // Update pitch count
      const pitchEvents = currentPlay.playEvents.filter(e => e.isPitch);
      this.elements.pitchCount.textContent = pitchEvents.length;
    }

    // Update BSO count
    const count = currentPlay?.count || {};
    this.updateCount('ball', count.balls ?? 0);
    this.updateCount('strike', count.strikes ?? 0);
    this.updateCount('out', linescore?.outs ?? count.outs ?? 0);

    // Update base runners
    if (linescore && linescore.offense) {
      this.updateRunners(linescore.offense);
    } else {
      this.updateRunners(null);
    }

    // Update on deck batter
    if (linescore && linescore.offense && linescore.offense.onDeck) {
      const onDeckBatter = linescore.offense.onDeck;
      this.elements.ondeck.textContent = onDeckBatter.fullName || onDeckBatter.lastName || 'TBD';
    } else {
      this.elements.ondeck.textContent = '-';
    }

    // Re-render chart if wpData is already loaded (handles timing gap between parallel fetches)
    if (this.wpData.length > 0) {
      this.updateWinProbability(data.gameData?.teams);
    }
  }

  updateWinProbability(teams) {
    if (!this.wpChartEl || !this.wpData.length) return;

    // wpData is Baseball Savant gameWpa array: [{ homeTeamWinProbability, atBatIndex, i }, ...]
    const points = this.wpData
      .filter(p => typeof p.homeTeamWinProbability === 'number')
      .map(p => ({ homeWP: p.homeTeamWinProbability }));

    if (points.length < 2) {
      this.wpChartEl.innerHTML = '';
      return;
    }


    // Get team abbreviations for coloring
    const awayAbbr = teams?.away?.abbreviation || 'AWAY';
    const homeAbbr = teams?.home?.abbreviation || 'HOME';
    const awayColor = MLB_COLORS[awayAbbr]?.primary || '#6b7280';
    const homeColor = MLB_COLORS[homeAbbr]?.primary || '#6b7280';

    // Vertical chart: time flows bottom→top (first play at bottom, latest at top)
    // x-axis = win probability (0=away wins left, 100=home wins right, 50=center)
    // away color fills left of center line, home color fills right of center line
    const W = 100, H = 240;
    const n = points.length;
    const yScale = i => H - (i / (n - 1)) * H;      // play index → y (bottom=start, top=now)
    const xScale = v => (v / 100) * W;               // homeWP% → x (0=left, 100=right)
    const mid = xScale(50).toFixed(1);               // x=50 (center)

    // Away fill: left of center line (away winning = homeWP < 50)
    const awayFillPts = [
      `${mid},0`,
      ...points.map((p, i) => `${xScale(p.homeWP).toFixed(1)},${yScale(i).toFixed(1)}`),
      `${mid},${H}`
    ].join(' ');

    // Home fill: right of center line (home winning = homeWP > 50)
    const homeFillPts = [
      `${mid},0`,
      ...points.map((p, i) => `${xScale(p.homeWP).toFixed(1)},${yScale(i).toFixed(1)}`),
      `${mid},${H}`
    ].join(' ');

    const linePts = points.map((p, i) => `${xScale(p.homeWP).toFixed(1)},${yScale(i).toFixed(1)}`).join(' ');

    // Use unique gradient IDs per game to avoid DOM collisions with multiple live games
    const uid = `wp-${this.gameId}`;
    this.wpChartEl.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
           style="background:transparent;display:block;width:100%;height:100%"
           xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${uid}-away-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="${awayColor}" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="${awayColor}" stop-opacity="0.05"/>
          </linearGradient>
          <linearGradient id="${uid}-home-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="${homeColor}" stop-opacity="0.05"/>
            <stop offset="100%" stop-color="${homeColor}" stop-opacity="0.8"/>
          </linearGradient>
          <clipPath id="${uid}-away-clip">
            <rect x="0" y="0" width="${mid}" height="${H}"/>
          </clipPath>
          <clipPath id="${uid}-home-clip">
            <rect x="${mid}" y="0" width="${W - parseFloat(mid)}" height="${H}"/>
          </clipPath>
        </defs>
        <!-- Away fill (left of center) -->
        <polygon points="${awayFillPts}" fill="url(#${uid}-away-grad)" clip-path="url(#${uid}-away-clip)"/>
        <!-- Home fill (right of center) -->
        <polygon points="${homeFillPts}" fill="url(#${uid}-home-grad)" clip-path="url(#${uid}-home-clip)"/>
        <!-- WP line -->
        <polyline points="${linePts}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        <!-- 50% center line -->
        <line x1="${mid}" y1="0" x2="${mid}" y2="${H}" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="8 5"/>
        <!-- Title — uses userSpaceOnUse to avoid preserveAspectRatio distortion -->
        <text x="${mid}" y="60" text-anchor="middle"
              font-family="system-ui, sans-serif" font-size="14" font-weight="600" letter-spacing="1"
              fill="rgba(255,255,255,0.55)">WIN %</text>
      </svg>
    `;
  }

  updateCount(type, value) {
    const indicator = this.elements[`${type}Indicator`];
    if (!indicator) return;

    const dots = indicator.querySelectorAll('.dot');

    dots.forEach((dot, index) => {
      if (index < value) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  updatePitchHistory(playEvents, atBatIndex) {
    // Filter only pitch events
    const pitchEvents = playEvents.filter(event => event.isPitch);
    const pitchCount = pitchEvents.length;

    const atBatChanged = atBatIndex !== undefined && atBatIndex !== this.lastAtBatIndex;
    const newPitches = pitchCount - this.lastPitchCount;

    // Nothing changed — skip all DOM work to prevent flickering
    if (!atBatChanged && newPitches <= 0) return;

    if (atBatChanged) {
      // New at-bat: full reset of strike zone and pitch list
      this.strikeZone.clearPitches();
      this.elements.pitchList.innerHTML = '';
      this.lastAtBatIndex = atBatIndex;
      this.lastPitchCount = 0;

      // Draw all pitches from scratch
      this.totalPitches = pitchCount;
      pitchEvents.forEach((event, index) => {
        if (event.pitchData && event.pitchData.coordinates) {
          this.strikeZone.addPitch({
            type: event.details.type?.code || 'XX',
            callCode: event.details.call?.code || '',
            speed: event.pitchData.startSpeed || 0,
            result: event.details.call?.description || 'Unknown',
            coordinates: {
              pX: event.pitchData.coordinates.pX || 0,
              pZ: event.pitchData.coordinates.pZ || 2.5
            },
            count: event.count
          });
        }
      });

      // Build list newest-first
      for (let i = pitchCount - 1; i >= 0; i--) {
        const pitchItem = this.createPitchHistoryItem(pitchEvents[i], i + 1);
        this.elements.pitchList.appendChild(pitchItem);
      }
    } else {
      // Same at-bat, only new pitches appended — add incrementally
      this.totalPitches = pitchCount;

      // Add new pitch marks to strike zone (they were appended at the end)
      const startIndex = this.lastPitchCount;
      for (let i = startIndex; i < pitchCount; i++) {
        const event = pitchEvents[i];
        if (event.pitchData && event.pitchData.coordinates) {
          this.strikeZone.addPitch({
            type: event.details.type?.code || 'XX',
            callCode: event.details.call?.code || '',
            speed: event.pitchData.startSpeed || 0,
            result: event.details.call?.description || 'Unknown',
            coordinates: {
              pX: event.pitchData.coordinates.pX || 0,
              pZ: event.pitchData.coordinates.pZ || 2.5
            },
            count: event.count
          });
        }

        // Prepend to pitch list (newest pitch goes on top)
        const pitchItem = this.createPitchHistoryItem(event, i + 1);
        this.elements.pitchList.insertBefore(pitchItem, this.elements.pitchList.firstChild);
      }
    }

    this.lastPitchCount = pitchCount;
    if (atBatIndex !== undefined) this.lastAtBatIndex = atBatIndex;
  }

  getPitchResultClass(callCode) {
    // Map MLB Statsapi call codes to result color classes
    // B=Ball, C=Called Strike, S=Swinging Strike, F=Foul, T=Foul Tip,
    // X=In play out, D=In play no out, E=In play error, H=Hit by pitch,
    // L=Foul bunt, O=Swinging bunt out, R=Foul bunt out, W=Swinging pitchout
    const map = {
      'B': 'pitch-result-ball',
      'H': 'pitch-result-hbp',
      'C': 'pitch-result-strike',
      'S': 'pitch-result-swinging',
      'W': 'pitch-result-swinging',
      'O': 'pitch-result-swinging',
      'Q': 'pitch-result-swinging',
      'F': 'pitch-result-foul',
      'T': 'pitch-result-foultip',
      'L': 'pitch-result-foultipbunt',
      'R': 'pitch-result-foultipbunt',
      'M': 'pitch-result-foultipbunt',
      'X': 'pitch-result-inplay',
      'D': 'pitch-result-inplay',
      'E': 'pitch-result-inplay',
    };
    return map[callCode] || 'pitch-result-unknown';
  }

  createPitchHistoryItem(event, number) {
    const div = document.createElement('div');
    div.className = 'pitch-card';

    const pitchSpeed = event.pitchData?.startSpeed || 0;
    const result = event.details.call?.description || 'Unknown';
    const callCode = event.details.call?.code || '';
    const resultClass = this.getPitchResultClass(callCode);

    div.innerHTML = `
      <div class="pitch-card-number ${resultClass}">${number}</div>
      <div class="pitch-card-info">
        <div class="pitch-card-result">${result}</div>
        <div class="pitch-card-meta">${event.details.type?.description || 'Unknown'} &middot; ${Math.round(pitchSpeed)} mph</div>
      </div>
    `;

    // Add hover effect to highlight on strike zone
    div.addEventListener('mouseenter', () => {
      this.strikeZone.highlightPitch(this.totalPitches - number);
    });

    div.addEventListener('mouseleave', () => {
      this.strikeZone.resetHighlight();
    });

    return div;
  }

  updateRunners(offense) {
    // Reset all bases
    [1, 2, 3].forEach(base => {
      const node = this.elements.baseNodes[base];
      const row = this.elements.runnerRows[base];
      const name = this.elements.runnerNames[base];
      if (!node) return;

      node.classList.remove('occupied');
      if (row) row.classList.add('empty');
      if (name) name.textContent = '---';
    });

    if (!offense) return;

    // Set occupied bases with runner names
    const baseMap = { first: 1, second: 2, third: 3 };
    for (const [key, baseNum] of Object.entries(baseMap)) {
      if (offense[key]) {
        const runner = offense[key];
        const node = this.elements.baseNodes[baseNum];
        const row = this.elements.runnerRows[baseNum];
        const name = this.elements.runnerNames[baseNum];

        if (node) node.classList.add('occupied');
        if (row) row.classList.remove('empty');
        if (name) {
          name.textContent = runner.fullName || runner.lastName || '---';
        }
      }
    }
  }

  getPitcherStats(boxscore, pitcherId) {
    // Search both teams' pitchers in boxscore
    const teams = boxscore.teams || {};
    for (const side of ['away', 'home']) {
      const players = teams[side]?.players || {};
      const key = `ID${pitcherId}`;
      const player = players[key];
      if (player && player.stats && player.stats.pitching) {
        const p = player.stats.pitching;
        // inningsPitched may be "0.1", "1.2", etc.
        const ip = p.inningsPitched !== undefined ? p.inningsPitched : '-';
        const h = p.hits !== undefined ? p.hits : '-';
        const er = p.earnedRuns !== undefined ? p.earnedRuns : '-';
        const bb = p.baseOnBalls !== undefined ? p.baseOnBalls : '-';
        const k = p.strikeOuts !== undefined ? p.strikeOuts : '-';
        return `${ip} IP  ${h} H  ${er} ER  ${bb} BB  ${k} K`;
      }
    }
    return '-';
  }

  getBatterStats(boxscore, batterId) {
    const teams = boxscore.teams || {};
    for (const side of ['away', 'home']) {
      const players = teams[side]?.players || {};
      const key = `ID${batterId}`;
      const player = players[key];
      if (player && player.stats && player.stats.batting) {
        const b = player.stats.batting;
        const h = b.hits !== undefined ? b.hits : 0;
        const ab = b.atBats !== undefined ? b.atBats : 0;
        const hr = b.homeRuns || 0;
        const rbi = b.rbi !== undefined ? b.rbi : 0;
        const bb = b.baseOnBalls !== undefined ? b.baseOnBalls : 0;
        let line = `${h}-${ab}`;
        if (hr > 0) line += `  ${hr} HR`;
        if (rbi > 0) line += `  ${rbi} RBI`;
        if (bb > 0) line += `  ${bb} BB`;
        return line;
      }
    }
    return '-';
  }

  startAutoUpdate() {
    this.updateInterval = setInterval(() => {
      if (this.isActive) {
        this.fetchGameData();
      }
    }, 3000);

    // Win probability updates less frequently — once per 30s is enough
    this.wpInterval = setInterval(() => {
      if (this.isActive) {
        this.fetchWinProbability();
      }
    }, 30000);
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.wpInterval) {
      clearInterval(this.wpInterval);
      this.wpInterval = null;
    }
  }

  destroy() {
    this.isActive = false;
    this.stopAutoUpdate();
    if (this.wpChartEl) {
      this.wpChartEl.remove();
      this.wpChartEl = null;
    }
    this.container.innerHTML = '';
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MLBLiveCast;
}
