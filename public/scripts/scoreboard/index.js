/**
 * GridTV Scoreboard Module
 * Factory and exports for the centralized scoreboard system
 *
 * Usage:
 *   import { createScoreboard, FootballScoreboard } from '/scripts/scoreboard/index.js';
 *
 *   // Factory (recommended)
 *   const scoreboard = createScoreboard(container, {
 *       league: 'nfl',
 *       variant: 'fullscreen'
 *   });
 *
 *   // Direct class usage
 *   const sb = new FootballScoreboard(container, { variant: 'compact' });
 */

// Import all scoreboard classes
import { Scoreboard } from './Scoreboard.js';
import { FootballScoreboard } from './FootballScoreboard.js';
import { BasketballScoreboard } from './BasketballScoreboard.js';
import { BaseballScoreboard } from './BaseballScoreboard.js';
import { HockeyScoreboard } from './HockeyScoreboard.js';

// Import team data utilities
import {
    getTeamColors,
    getScoreboardColors,
    areColorsSimilar,
    NFL_TEAM_COLORS,
    NBA_TEAM_COLORS,
    NHL_TEAM_COLORS,
    MLB_TEAM_COLORS,
    NCAA_TEAM_COLORS
} from '../teams-data.js';

/**
 * Factory function to create the appropriate scoreboard based on league
 *
 * @param {HTMLElement} container - DOM element to render scoreboard into
 * @param {Object} config - Configuration options
 * @param {string} config.league - League identifier (nfl, nba, nhl, mlb, ncaa, ncaab)
 * @param {string} [config.variant='regular'] - Display variant (regular, compact, fullscreen)
 * @param {string} [config.awayAbbr] - Away team abbreviation for initial colors
 * @param {string} [config.homeAbbr] - Home team abbreviation for initial colors
 * @param {boolean} [config.animated=true] - Enable animations
 * @param {boolean} [config.showRecord=true] - Show team records
 * @param {boolean} [config.showTimeouts=true] - Show timeout indicators
 * @returns {Scoreboard} Appropriate scoreboard instance
 */
export function createScoreboard(container, config = {}) {
    const league = config.league?.toLowerCase() || 'nfl';

    switch (league) {
        case 'nfl':
        case 'ncaa':
            return new FootballScoreboard(container, { ...config, league });

        case 'nba':
        case 'ncaab':
            return new BasketballScoreboard(container, { ...config, league });

        case 'mlb':
            return new BaseballScoreboard(container, config);

        case 'nhl':
            return new HockeyScoreboard(container, config);

        default:
            // Fall back to base scoreboard for unknown leagues
            console.warn(`Unknown league "${league}", using base scoreboard`);
            return new Scoreboard(container, config);
    }
}

/**
 * Get the appropriate scoreboard class for a league
 *
 * @param {string} league - League identifier
 * @returns {Function} Scoreboard class constructor
 */
export function getScoreboardClass(league) {
    const leagueLower = league?.toLowerCase() || 'nfl';

    switch (leagueLower) {
        case 'nfl':
        case 'ncaa':
            return FootballScoreboard;

        case 'nba':
        case 'ncaab':
            return BasketballScoreboard;

        case 'mlb':
            return BaseballScoreboard;

        case 'nhl':
            return HockeyScoreboard;

        default:
            return Scoreboard;
    }
}

/**
 * Create multiple scoreboards from an array of game data
 *
 * @param {HTMLElement} container - Parent container for all scoreboards
 * @param {Array} games - Array of game data objects
 * @param {Object} config - Shared configuration
 * @returns {Map} Map of game ID to scoreboard instance
 */
export function createScoreboards(container, games, config = {}) {
    const scoreboards = new Map();

    games.forEach(game => {
        const wrapper = document.createElement('div');
        wrapper.className = 'scoreboard-wrapper';
        wrapper.dataset.gameId = game.id;
        container.appendChild(wrapper);

        const scoreboard = createScoreboard(wrapper, {
            ...config,
            league: game.league,
            awayAbbr: game.away?.abbr,
            homeAbbr: game.home?.abbr
        });

        scoreboard.update(game);
        scoreboards.set(game.id, scoreboard);
    });

    return scoreboards;
}

/**
 * Update multiple scoreboards with new game data
 *
 * @param {Map} scoreboards - Map of game ID to scoreboard instance
 * @param {Array} games - Array of updated game data
 */
export function updateScoreboards(scoreboards, games) {
    games.forEach(game => {
        const scoreboard = scoreboards.get(game.id);
        if (scoreboard) {
            scoreboard.update(game);
        }
    });
}

/**
 * Destroy all scoreboards in a map
 *
 * @param {Map} scoreboards - Map of game ID to scoreboard instance
 */
export function destroyScoreboards(scoreboards) {
    scoreboards.forEach(scoreboard => {
        scoreboard.destroy();
    });
    scoreboards.clear();
}

// Export all classes
export {
    Scoreboard,
    FootballScoreboard,
    BasketballScoreboard,
    BaseballScoreboard,
    HockeyScoreboard
};

// Export team data utilities
export {
    getTeamColors,
    getScoreboardColors,
    areColorsSimilar,
    NFL_TEAM_COLORS,
    NBA_TEAM_COLORS,
    NHL_TEAM_COLORS,
    MLB_TEAM_COLORS,
    NCAA_TEAM_COLORS
};

// Global export for non-module pages (backward compatibility)
if (typeof window !== 'undefined') {
    window.GridTV = {
        // Factory functions
        createScoreboard,
        createScoreboards,
        updateScoreboards,
        destroyScoreboards,
        getScoreboardClass,

        // Classes
        Scoreboard,
        FootballScoreboard,
        BasketballScoreboard,
        BaseballScoreboard,
        HockeyScoreboard,

        // Team data
        getTeamColors,
        getScoreboardColors,
        areColorsSimilar,
        NFL_TEAM_COLORS,
        NBA_TEAM_COLORS,
        NHL_TEAM_COLORS,
        MLB_TEAM_COLORS,
        NCAA_TEAM_COLORS
    };
}
