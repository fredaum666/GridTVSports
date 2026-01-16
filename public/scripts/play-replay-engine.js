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
    this.playbackSpeed = 3000; // ms between plays
    this.playbackTimer = null;
    this.onPlayUpdate = null; // Callback function
    this.onGameEnd = null;
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
   * Convert current play to game state format (mimics ESPN API response)
   */
  getCurrentGameState() {
    const play = this.getCurrentPlay();
    if (!play) {
      return this.getFinalGameState();
    }

    // Parse possession from play data
    const possession = play.possession || 'home';

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
      downDistance: play.down > 0 ? `${this.ordinal(play.down)} & ${play.distance}` : '',
      fieldPosition: this.formatFieldPosition(play),
      yardLine: play.endYard || play.yardLine || 50,
      yardsToGo: play.distance || 10,
      possessionOnOwn: this.isPossessionOnOwn(play),
      lastPlay: play.text || '',
      // Additional replay-specific data
      playType: play.type || 'unknown',
      startYard: play.startYard,
      endYard: play.endYard,
      isTouchdown: play.isTouchdown || false,
      isTurnover: play.isTurnover || false,
      turnoverType: play.turnoverType || null
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
   * Format field position string
   */
  formatFieldPosition(play) {
    if (!play || play.yardLine === undefined) return '';

    const yardLine = play.yardLine;
    const possession = play.possession;

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
