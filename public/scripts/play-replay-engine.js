/**
 * Play Replay Engine
 * Manages playback of parsed ESPN play-by-play data
 * Simulates live game updates for SVG field animation testing
 */

class PlayReplayEngine {
  constructor(gameId, plays, metadata) {
    this.gameId = gameId;
    this.plays = plays || [];
    this.metadata = metadata || {};
    this.currentPlayIndex = 0;
    this.isPlaying = false;
    this.playExecuted = false; // Track if current play animation has been shown
    this.playbackSpeed = 3000; // ms between plays
    this.playbackTimer = null;
    this.onPlayUpdate = null; // Callback function
    this.onGameEnd = null;
    this.wasPlayingBeforeAnimation = false; // Track if we should resume after animation
  }

  /**
   * Get current play data
   */
  getCurrentPlay() {
    if (this.currentPlayIndex >= this.plays.length) {
      return null;
    }
    return this.plays[this.currentPlayIndex];
  }

  /**
   * Get previous play (for animation comparison)
   */
  getPreviousPlay() {
    if (this.currentPlayIndex <= 0) {
      return null;
    }
    return this.plays[this.currentPlayIndex - 1];
  }

  /**
   * Get next play (for play list preview)
   */
  getNextPlay() {
    if (this.currentPlayIndex >= this.plays.length - 1) {
      return null;
    }
    return this.plays[this.currentPlayIndex + 1];
  }

  /**
   * Convert current play to game state format (mimics ESPN API response)
   */
  getCurrentGameState() {
    const play = this.getCurrentPlay();
    if (!play) {
      return this.getFinalGameState();
    }

    // Determine if this is a special teams play
    const isKickoff = play.isKickoff || play.type === 'kickoff' || /kicks\s+\d+\s+yards?\s+from/i.test(play.text || '');
    const isPunt = play.isPunt || play.type === 'punt' || /punts\s+\d+\s+yards?/i.test(play.text || '');
    const isSpecialTeams = isKickoff || isPunt;

    // Parse possession from play data
    // For kickoffs/punts BEFORE execution, show kicking team's possession
    // After execution, show receiving team's possession (stored in play.possession)
    let possession = play.possession || 'home';
    let kickingTeam = play.kickingTeam;

    // If kickingTeam not set, try to infer from play text
    if (isSpecialTeams && !kickingTeam) {
      const awayAbbr = this.normalizeTeamAbbr(this.metadata.away?.abbr || '');
      const homeAbbr = this.normalizeTeamAbbr(this.metadata.home?.abbr || '');
      const playText = play.text || '';

      // Parse "from TEAM YARD" to determine kicking team
      const fromMatch = playText.match(/from\s+([A-Z]{2,4})\s+\d+/i);
      if (fromMatch) {
        const kickTeamAbbr = this.normalizeTeamAbbr(fromMatch[1]);
        if (kickTeamAbbr === awayAbbr) {
          kickingTeam = 'away';
        } else if (kickTeamAbbr === homeAbbr) {
          kickingTeam = 'home';
        }
      }
    }

    if (isSpecialTeams && !this.playExecuted && kickingTeam) {
      // Before kick executes, the kicking team has the ball
      possession = kickingTeam;
    }

    // Get timeouts from play data or use defaults based on period
    // NFL teams get 3 timeouts per half (reset at halftime)
    const awayTimeouts = play.awayTimeouts !== undefined ? play.awayTimeouts :
                         (play.period <= 2 ? 3 : 3); // Default to 3 per half
    const homeTimeouts = play.homeTimeouts !== undefined ? play.homeTimeouts :
                         (play.period <= 2 ? 3 : 3); // Default to 3 per half

    // Build game state matching the format used by Desktop-tv-sports-bar.html
    return {
      id: this.gameId,
      league: 'nfl',
      state: 'in', // Always in-progress during replay
      status: `Q${play.period} ${play.clock}`,
      away: {
        abbr: this.metadata.away?.abbr || 'AWAY',
        name: this.metadata.away?.name || 'Away Team',
        logo: this.metadata.away?.logo || '',
        score: play.awayScore || 0,
        record: this.metadata.away?.record || '',
        timeouts: awayTimeouts
      },
      home: {
        abbr: this.metadata.home?.abbr || 'HOME',
        name: this.metadata.home?.name || 'Home Team',
        logo: this.metadata.home?.logo || '',
        score: play.homeScore || 0,
        record: this.metadata.home?.record || '',
        timeouts: homeTimeouts
      },
      possession: possession,
      // Use ESPN's downDistanceText if available, extract short form or calculate as fallback
      downDistance: this.getDownDistance(play),
      // Before play executes, show starting position; after, show ending position
      fieldPosition: this.playExecuted ? this.formatFieldPosition(play) : this.formatFieldPositionStart(play),
      yardLine: this.playExecuted ? (play.endYard || play.yardLine || 50) : (play.startYard || play.endYard || 50),
      down: play.down || 0,
      yardsToGo: play.distance || 10,
      possessionOnOwn: this.isPossessionOnOwn(play),
      lastPlay: play.text || '',
      // Additional replay-specific data
      playType: play.type || 'unknown',
      startYard: play.startYard,
      endYard: play.endYard,
      // ESPN's pre-formatted position text (for animation calculations)
      possessionText: play.possessionText,
      startPossessionText: play.startPossessionText,
      isTouchdown: play.isTouchdown || false,
      isTurnover: play.isTurnover || false,
      isTurnoverOnDowns: play.isTurnoverOnDowns || false,
      turnoverType: play.turnoverType || null,
      // Kickoff/Punt specific data for animations
      kickLandingYard: play.kickLandingYard,
      returnYards: play.returnYards || 0,
      isTouchback: play.isTouchback || /touchback/i.test(play.text || ''),
      isFairCatch: play.isFairCatch || /fair\s*catch/i.test(play.text || ''),
      kickingTeam: play.kickingTeam,
      isKickoff: isKickoff,
      isPunt: isPunt,
      // Flag to indicate if play animation has been shown
      playExecuted: this.playExecuted
    };
  }

  /**
   * Get final game state (when replay is complete)
   */
  getFinalGameState() {
    const lastPlay = this.plays[this.plays.length - 1];
    return {
      id: this.gameId,
      league: 'nfl',
      state: 'post',
      status: 'Final',
      away: {
        abbr: this.metadata.away?.abbr || 'AWAY',
        name: this.metadata.away?.name || 'Away Team',
        logo: this.metadata.away?.logo || '',
        score: lastPlay?.awayScore || 0,
        record: this.metadata.away?.record || ''
      },
      home: {
        abbr: this.metadata.home?.abbr || 'HOME',
        name: this.metadata.home?.name || 'Home Team',
        logo: this.metadata.home?.logo || '',
        score: lastPlay?.homeScore || 0,
        record: this.metadata.home?.record || ''
      }
    };
  }

  /**
   * Format field position string (end position - after play)
   */
  formatFieldPosition(play) {
    if (!play) return '';

    // Use ESPN's pre-formatted possessionText directly (most accurate)
    if (play.possessionText) {
      return play.possessionText;
    }

    // Fallback: calculate from endYard (legacy support)
    const yardLine = play.endYard || play.yardLine;
    if (yardLine === undefined || yardLine === null) return '';

    // Determine which team's side of the field
    // 0-50 = away team's side, 50-100 = home team's side
    if (yardLine <= 50) {
      const awayAbbr = this.metadata.away?.abbr || 'AWAY';
      return `${awayAbbr} ${yardLine}`;
    } else {
      const homeAbbr = this.metadata.home?.abbr || 'HOME';
      return `${homeAbbr} ${100 - yardLine}`;
    }
  }

  /**
   * Format field position string for starting position (before play)
   */
  formatFieldPositionStart(play) {
    if (!play) return '';

    // Use ESPN's pre-formatted startPossessionText directly (most accurate)
    if (play.startPossessionText) {
      return play.startPossessionText;
    }

    // Fallback: calculate from startYard (legacy support)
    const yardLine = play.startYard;
    if (yardLine === undefined || yardLine === null) {
      // Fall back to end position if no start position
      return this.formatFieldPosition(play);
    }

    // Determine which team's side of the field
    // 0-50 = away team's side, 50-100 = home team's side
    if (yardLine <= 50) {
      const awayAbbr = this.metadata.away?.abbr || 'AWAY';
      return `${awayAbbr} ${yardLine}`;
    } else {
      const homeAbbr = this.metadata.home?.abbr || 'HOME';
      return `${homeAbbr} ${100 - yardLine}`;
    }
  }

  /**
   * Get down and distance string
   * Uses ESPN's text when available, falls back to calculation
   */
  getDownDistance(play) {
    if (!play) return '';

    // If ESPN provided downDistanceText, extract short form (e.g., "1st & 10" from "1st & 10 at HOU 26")
    if (play.downDistanceText) {
      // Extract just the down & distance part (before " at ")
      const match = play.downDistanceText.match(/^(\d+\w+\s*&\s*\d+)/);
      if (match) return match[1];
      return play.downDistanceText;
    }

    // Fallback: calculate from down and distance values
    if (play.down > 0) {
      return `${this.ordinal(play.down)} & ${play.distance}`;
    }

    return '';
  }

  /**
   * Mark the current play as executed (animation has been shown)
   */
  markPlayExecuted() {
    this.playExecuted = true;
  }

  /**
   * Check if possession team is on their own side
   */
  isPossessionOnOwn(play) {
    if (!play) return false;
    const yardLine = play.endYard || play.yardLine || 50;
    const possession = play.possession;

    // Away team (possession='away') owns 0-50 side
    // Home team (possession='home') owns 50-100 side
    if (possession === 'away') {
      return yardLine <= 50;
    } else {
      return yardLine > 50;
    }
  }

  /**
   * Get ordinal suffix for down number
   */
  ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /**
   * Normalize team abbreviations (ESPN uses different abbreviations in different places)
   * Maps to ESPN standard abbreviations used in play text
   */
  normalizeTeamAbbr(abbr) {
    if (!abbr) return '';
    const normalized = abbr.toUpperCase();
    const TEAM_ABBR_MAP = {
      // Houston Texans - ESPN uses HST in play text
      'HST': 'HOU', 'HOU': 'HOU',
      // New England Patriots
      'NWE': 'NE', 'NE': 'NE',
      // Jacksonville Jaguars - ESPN uses JAX in play text
      'JAC': 'JAX', 'JAX': 'JAX',
      // Las Vegas Raiders
      'LV': 'LV', 'LVR': 'LV', 'OAK': 'LV',
      // LA Rams
      'LAR': 'LA', 'LA': 'LA',
      // Washington Commanders
      'WSH': 'WAS', 'WAS': 'WAS',
      // San Francisco 49ers
      'SFO': 'SF', 'SF': 'SF',
      // Green Bay Packers
      'GNB': 'GB', 'GB': 'GB',
      // Kansas City Chiefs
      'KAN': 'KC', 'KC': 'KC',
      // Tampa Bay Buccaneers
      'TAM': 'TB', 'TB': 'TB',
      // New Orleans Saints
      'NOR': 'NO', 'NO': 'NO',
      // LA Chargers
      'SDG': 'LAC', 'LAC': 'LAC',
      // Historical
      'STL': 'LA'
    };
    return TEAM_ABBR_MAP[normalized] || normalized;
  }

  // ==========================================
  // PLAYBACK CONTROLS
  // ==========================================

  /**
   * Start automatic playback
   */
  play() {
    if (this.isPlaying) return;
    if (this.currentPlayIndex >= this.plays.length) {
      this.currentPlayIndex = 0; // Reset to beginning
    }

    this.isPlaying = true;
    this.scheduleNextPlay();
    this.emitUpdate();
  }

  /**
   * Pause playback
   */
  pause() {
    this.isPlaying = false;
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  /**
   * Pause for animation overlay - remembers if we were playing to resume after
   */
  pauseForAnimation() {
    this.wasPlayingBeforeAnimation = this.isPlaying;
    if (this.isPlaying) {
      this.pause();
    }
  }

  /**
   * Resume after animation overlay completes - only if we were playing before
   * Note: We don't call play() because that would re-emit the current play
   * Instead, just schedule the next play advancement
   */
  resumeFromAnimation() {
    if (this.wasPlayingBeforeAnimation) {
      this.wasPlayingBeforeAnimation = false;
      this.isPlaying = true;
      this.scheduleNextPlay(); // Just schedule next, don't re-emit current play
    }
  }

  /**
   * Toggle play/pause
   */
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  /**
   * Advance to next play
   */
  nextPlay() {
    if (this.currentPlayIndex < this.plays.length - 1) {
      this.currentPlayIndex++;
      this.playExecuted = false; // Reset for new play
      this.emitUpdate();
      return true;
    }
    return false;
  }

  /**
   * Go back to previous play
   */
  previousPlay() {
    if (this.currentPlayIndex > 0) {
      this.currentPlayIndex--;
      this.playExecuted = false; // Reset for new play
      this.emitUpdate();
      return true;
    }
    return false;
  }

  /**
   * Jump to specific play index
   */
  jumpToPlay(index) {
    if (index >= 0 && index < this.plays.length) {
      this.currentPlayIndex = index;
      this.playExecuted = false; // Reset for new play
      this.emitUpdate();
      return true;
    }
    return false;
  }

  /**
   * Set playback speed
   */
  setSpeed(ms) {
    this.playbackSpeed = Math.max(500, Math.min(10000, ms));

    // If currently playing, reschedule with new speed
    if (this.isPlaying && this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.scheduleNextPlay();
    }
  }

  /**
   * Reset to beginning
   */
  reset() {
    this.pause();
    this.currentPlayIndex = 0;
    this.playExecuted = false; // Reset for first play
    this.emitUpdate();
  }

  // ==========================================
  // INTERNAL METHODS
  // ==========================================

  /**
   * Schedule the next play advancement
   */
  scheduleNextPlay() {
    this.playbackTimer = setTimeout(() => {
      if (!this.isPlaying) return;

      if (this.currentPlayIndex < this.plays.length - 1) {
        this.currentPlayIndex++;
        this.playExecuted = false; // Reset for new play (same as manual nextPlay())
        this.emitUpdate();
        this.scheduleNextPlay();
      } else {
        // Reached end
        this.isPlaying = false;
        if (this.onGameEnd) {
          this.onGameEnd(this.gameId);
        }
      }
    }, this.playbackSpeed);
  }

  /**
   * Emit play update to callback
   */
  emitUpdate() {
    if (this.onPlayUpdate) {
      const gameState = this.getCurrentGameState();
      const prevPlay = this.getPreviousPlay();
      this.onPlayUpdate(this.gameId, gameState, prevPlay);
    }
  }

  /**
   * Get playback progress
   */
  getProgress() {
    return {
      currentIndex: this.currentPlayIndex,
      totalPlays: this.plays.length,
      percentage: this.plays.length > 0
        ? Math.round((this.currentPlayIndex / (this.plays.length - 1)) * 100)
        : 0,
      isPlaying: this.isPlaying,
      currentPlay: this.getCurrentPlay(),
      gameState: this.getCurrentGameState()
    };
  }

  /**
   * Destroy the engine and clean up
   */
  destroy() {
    this.pause();
    this.onPlayUpdate = null;
    this.onGameEnd = null;
  }
}

// ==========================================
// REPLAY MANAGER (manages multiple game replays)
// ==========================================

class ReplayManager {
  constructor() {
    this.engines = new Map(); // gameId -> PlayReplayEngine
    this.globalSpeed = 3000;
    this.onGameUpdate = null; // Called when any game updates
  }

  /**
   * Add a game to replay
   */
  addGame(gameId, plays, metadata) {
    const engine = new PlayReplayEngine(gameId, plays, metadata);
    engine.setSpeed(this.globalSpeed);

    // Set up callback to propagate updates
    engine.onPlayUpdate = (id, gameState, prevPlay) => {
      if (this.onGameUpdate) {
        this.onGameUpdate(id, gameState, prevPlay);
      }
    };

    this.engines.set(gameId, engine);
    return engine;
  }

  /**
   * Get engine for a specific game
   */
  getEngine(gameId) {
    return this.engines.get(gameId);
  }

  /**
   * Remove a game from replay
   */
  removeGame(gameId) {
    const engine = this.engines.get(gameId);
    if (engine) {
      engine.destroy();
      this.engines.delete(gameId);
    }
  }

  /**
   * Start all games
   */
  playAll() {
    this.engines.forEach(engine => engine.play());
  }

  /**
   * Pause all games
   */
  pauseAll() {
    this.engines.forEach(engine => engine.pause());
  }

  /**
   * Set global playback speed
   */
  setGlobalSpeed(ms) {
    this.globalSpeed = ms;
    this.engines.forEach(engine => engine.setSpeed(ms));
  }

  /**
   * Reset all games
   */
  resetAll() {
    this.engines.forEach(engine => engine.reset());
  }

  /**
   * Get all game states
   */
  getAllGameStates() {
    const states = [];
    this.engines.forEach((engine, gameId) => {
      states.push(engine.getCurrentGameState());
    });
    return states;
  }

  /**
   * Load games from sessionStorage (set by replay-setup.html)
   */
  loadFromSessionStorage() {
    try {
      const data = sessionStorage.getItem('gridtv_replay_data');
      if (!data) {
        console.warn('No replay data found in sessionStorage');
        return false;
      }

      const replayData = JSON.parse(data);

      // Clear existing engines
      this.engines.forEach(engine => engine.destroy());
      this.engines.clear();

      // Add each game
      if (replayData.games && Array.isArray(replayData.games)) {
        replayData.games.forEach((gameData, index) => {
          const gameId = gameData.id || `replay-game-${index + 1}`;
          this.addGame(gameId, gameData.plays, gameData.metadata);
        });
      }

      console.log(`Loaded ${this.engines.size} replay games from sessionStorage`);
      return true;
    } catch (e) {
      console.error('Failed to load replay data:', e);
      return false;
    }
  }

  /**
   * Destroy all engines and clean up
   */
  destroy() {
    this.engines.forEach(engine => engine.destroy());
    this.engines.clear();
    this.onGameUpdate = null;
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.PlayReplayEngine = PlayReplayEngine;
  window.ReplayManager = ReplayManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PlayReplayEngine, ReplayManager };
}
