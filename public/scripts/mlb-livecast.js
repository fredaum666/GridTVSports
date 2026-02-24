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

    // UI elements
    this.elements = {};

    this.init();
  }

  async init() {
    this.createUI();
    await this.fetchGameData();
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
      this.updatePitchHistory(currentPlay.playEvents);

      // Update pitch count
      const pitchEvents = currentPlay.playEvents.filter(e => e.isPitch);
      this.elements.pitchCount.textContent = pitchEvents.length;
    }

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

  updatePitchHistory(playEvents) {
    // Filter only pitch events
    const pitchEvents = playEvents.filter(event => event.isPitch);

    // Store total count for hover handlers
    this.totalPitches = pitchEvents.length;

    // Clear strike zone
    this.strikeZone.clearPitches();

    // Clear pitch list
    this.elements.pitchList.innerHTML = '';

    // Add pitches in reverse order (newest first)
    pitchEvents.reverse().forEach((event, index) => {
      const pitchNumber = pitchEvents.length - index;

      // Add to strike zone
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

      // Add to pitch list
      const pitchItem = this.createPitchHistoryItem(event, pitchNumber);
      this.elements.pitchList.appendChild(pitchItem);
    });
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
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  destroy() {
    this.isActive = false;
    this.stopAutoUpdate();
    this.container.innerHTML = '';
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MLBLiveCast;
}
