/**
 * GridTV Scoreboard - Base Class
 * Core scoreboard functionality shared across all sports
 *
 * @class Scoreboard
 */

import { getTeamColors, getScoreboardColors } from '../teams-data.js';

export class Scoreboard {
    /**
     * Create a new Scoreboard instance
     * @param {HTMLElement} container - DOM element to render into
     * @param {Object} config - Configuration options
     * @param {string} config.league - League identifier (nfl, nba, nhl, mlb, ncaa, ncaab)
     * @param {string} config.variant - Display variant (regular, compact, fullscreen)
     * @param {string} [config.awayAbbr] - Away team abbreviation
     * @param {string} [config.homeAbbr] - Home team abbreviation
     */
    constructor(container, config = {}) {
        this.container = container;
        this.config = {
            league: 'nfl',
            variant: 'regular',
            showRecord: true,
            showTimeouts: true,
            animated: true,
            ...config
        };

        this.element = null;
        this.gameData = null;
        this._previousScores = { away: null, home: null };
        this._animationTimeouts = [];

        this.init();
    }

    /**
     * Initialize the scoreboard
     */
    init() {
        this.element = document.createElement('div');
        this.element.className = this.getBaseClasses();
        this.applyColors();

        if (this.config.animated) {
            this.element.classList.add('scoreboard--enter');
        }

        this.container.appendChild(this.element);
    }

    /**
     * Get CSS classes for the scoreboard element
     * @returns {string} Space-separated class names
     */
    getBaseClasses() {
        const classes = ['scoreboard', `scoreboard--${this.config.league}`];

        if (this.config.variant !== 'regular') {
            classes.push(`scoreboard--${this.config.variant}`);
        }

        return classes.join(' ');
    }

    /**
     * Apply team colors as CSS custom properties
     * @param {string} [awayAbbr] - Away team abbreviation
     * @param {string} [homeAbbr] - Home team abbreviation
     */
    applyColors(awayAbbr, homeAbbr) {
        const away = awayAbbr || this.config.awayAbbr;
        const home = homeAbbr || this.config.homeAbbr;

        if (!away && !home && !this.gameData) return;

        const colors = getScoreboardColors(
            this.config.league,
            away || this.gameData?.away?.abbr,
            home || this.gameData?.home?.abbr
        );

        this.element.style.setProperty('--sb-away-primary', colors.awayPrimary);
        this.element.style.setProperty('--sb-away-secondary', colors.awaySecondary);
        this.element.style.setProperty('--sb-home-primary', colors.homePrimary);
        this.element.style.setProperty('--sb-home-secondary', colors.homeSecondary);
    }

    /**
     * Render the scoreboard HTML
     * Override in subclasses for sport-specific rendering
     */
    render() {
        if (!this.gameData) {
            this.element.innerHTML = this.renderEmpty();
            return;
        }

        this.element.innerHTML = `
            ${this.renderTeamPanel('away')}
            ${this.renderTeamPanel('home')}
            ${this.renderCenter()}
        `;

        this.applyColors();
        this.updateWinnerState();
    }

    /**
     * Render floating logos above the scoreboard (outside team panels to avoid clip-path)
     * @returns {string} HTML string
     */
    renderLogos() {
        const awayTeam = this.gameData.away;
        const homeTeam = this.gameData.home;
        const awayLogo = awayTeam?.logo || this.getDefaultLogo(awayTeam?.abbr);
        const homeLogo = homeTeam?.logo || this.getDefaultLogo(homeTeam?.abbr);

        return `
            <div class="scoreboard__logos">
                <div class="scoreboard__logo scoreboard__logo--away">
                    <img class="scoreboard__logo-img"
                         src="${awayLogo}"
                         alt="${awayTeam?.name || awayTeam?.abbr || ''}"
                         loading="lazy"
                         onerror="this.style.display='none'">
                </div>
                <div class="scoreboard__logo scoreboard__logo--home">
                    <img class="scoreboard__logo-img"
                         src="${homeLogo}"
                         alt="${homeTeam?.name || homeTeam?.abbr || ''}"
                         loading="lazy"
                         onerror="this.style.display='none'">
                </div>
            </div>
        `;
    }

    /**
     * Render empty/loading state
     * @returns {string} HTML string
     */
    renderEmpty() {
        return `
            <div class="scoreboard__team scoreboard__team--away">
                <div class="scoreboard__info">
                    <span class="scoreboard__name">---</span>
                </div>
                <div class="scoreboard__score-wrapper">
                    <div class="scoreboard__logo">
                        <div class="scoreboard__logo-placeholder"></div>
                    </div>
                    <div class="scoreboard__score">
                        <span class="scoreboard__score-value">-</span>
                    </div>
                </div>
            </div>
            <div class="scoreboard__team scoreboard__team--home">
                <div class="scoreboard__score-wrapper">
                    <div class="scoreboard__logo">
                        <div class="scoreboard__logo-placeholder"></div>
                    </div>
                    <div class="scoreboard__score">
                        <span class="scoreboard__score-value">-</span>
                    </div>
                </div>
                <div class="scoreboard__info">
                    <span class="scoreboard__name">---</span>
                </div>
            </div>
            <div class="scoreboard__center">
                <div class="scoreboard__status">
                    <span class="scoreboard__time">--:--</span>
                </div>
            </div>
        `;
    }

    /**
     * Render a team panel (away or home)
     * @param {string} side - 'away' or 'home'
     * @returns {string} HTML string
     */
    renderTeamPanel(side) {
        const team = this.gameData[side];
        const isWinner = team.winner === true;
        const hasPossession = this.gameData.possession === team.abbr;

        const winnerClass = isWinner ? 'scoreboard__team--winner' : '';
        const possessionClass = hasPossession ? 'scoreboard__team--possession' : '';

        return `
            <div class="scoreboard__team scoreboard__team--${side} ${winnerClass} ${possessionClass}">
                ${side === 'away' ? this.renderTeamContent(team, side) : this.renderTeamContentReverse(team, side)}
            </div>
        `;
    }

    /**
     * Render team content (info, score) - normal order for away team
     * Note: Logos are rendered separately at scoreboard container level
     * @param {Object} team - Team data
     * @param {string} side - 'away' or 'home'
     * @returns {string} HTML string
     */
    renderTeamContent(team, side) {
        return `
            ${this.renderTeamInfo(team)}
            ${this.renderScore(team, side)}
        `;
    }

    /**
     * Render team content in reverse order (for home team)
     * Note: Logos are rendered separately at scoreboard container level
     * @param {Object} team - Team data
     * @param {string} side - 'away' or 'home'
     * @returns {string} HTML string
     */
    renderTeamContentReverse(team, side) {
        return `
            ${this.renderScore(team, side)}
            ${this.renderTeamInfo(team)}
        `;
    }

    /**
     * Render team logo
     * @param {Object} team - Team data
     * @returns {string} HTML string
     */
    renderLogo(team) {
        const logoSrc = team.logo || this.getDefaultLogo(team.abbr);

        return `
            <div class="scoreboard__logo">
                <img class="scoreboard__logo-img"
                     src="${logoSrc}"
                     alt="${team.name || team.abbr}"
                     loading="lazy"
                     onerror="this.style.display='none'">
            </div>
        `;
    }

    /**
     * Get default logo path based on team abbreviation
     * @param {string} abbr - Team abbreviation
     * @returns {string} Logo URL
     */
    getDefaultLogo(abbr) {
        if (!abbr) return '';

        // Map league to ESPN logo path with 500 subdirectory for better quality
        const leagueMap = {
            'nfl': 'nfl/500',
            'nba': 'nba/500',
            'mlb': 'mlb/500',
            'nhl': 'nhl/500',
            'ncaa': 'ncaa/500',      // NCAA Football
            'ncaab': 'ncaa/500'      // NCAA Basketball
        };

        const logoPath = leagueMap[this.config.league] || `${this.config.league}/500`;

        // ESPN logo URL pattern
        return `https://a.espncdn.com/i/teamlogos/${logoPath}/${abbr.toLowerCase()}.png`;
    }

    /**
     * Render team info (name, record)
     * Includes both full name and abbreviation for responsive toggle
     * @param {Object} team - Team data
     * @returns {string} HTML string
     */
    renderTeamInfo(team) {
        const fullName = team.name || team.abbr || '---';
        const abbr = team.abbr || '---';
        const record = this.config.showRecord && team.record
            ? `<span class="scoreboard__record">${team.record}</span>`
            : '';

        return `
            <div class="scoreboard__info">
                <span class="scoreboard__name">
                    <span class="scoreboard__name-full">${fullName}</span>
                    <span class="scoreboard__name-abbr">${abbr}</span>
                </span>
                ${record}
            </div>
        `;
    }

    /**
     * Render score box with logo wrapper
     * Logo is positioned above the score box within the same container
     * @param {Object} team - Team data
     * @param {string} side - 'away' or 'home'
     * @returns {string} HTML string
     */
    renderScore(team, side) {
        const score = team.score ?? '-';
        const scoreId = `score-${side}`;
        const logoSrc = team.logo || this.getDefaultLogo(team.abbr);

        return `
            <div class="scoreboard__score-wrapper">
                <div class="scoreboard__logo">
                    <img class="scoreboard__logo-img"
                         src="${logoSrc}"
                         alt="${team.name || team.abbr || ''}"
                         loading="lazy"
                         onerror="this.style.display='none'">
                </div>
                <div class="scoreboard__score" id="${scoreId}-box">
                    <span class="scoreboard__score-value" id="${scoreId}">${score}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render center status area with clock
     * @returns {string} HTML string
     */
    renderCenter() {
        const status = this.getStatusInfo();

        return `
            <div class="scoreboard__clock-wrapper">
                <div class="scoreboard__clock ${status.className}">
                    <div class="scoreboard__clock-display">
                        ${status.liveDot || ''}
                        <span class="scoreboard__clock-time">${status.time}</span>
                    </div>
                    ${status.period ? `<div class="scoreboard__clock-period">${status.period}</div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Get status information for the game
     * @returns {Object} Status info with className, time, period, and liveDot
     */
    getStatusInfo() {
        const state = this.gameData.state?.toLowerCase() || 'pre';
        const status = this.gameData.status || {};

        // Pre-game / Scheduled
        if (state === 'pre') {
            const time = status.time || status.shortDetail || '--:--';
            return {
                className: 'scoreboard__clock--scheduled',
                time: time,
                period: status.date || ''
            };
        }

        // Final
        if (state === 'post') {
            const detail = status.shortDetail || 'Final';
            return {
                className: 'scoreboard__clock--final',
                time: detail,
                period: 'Final'
            };
        }

        // In progress (live)
        const time = status.displayClock || status.time || '--:--';
        const period = this.formatPeriod(status.period);
        const isHalftime = status.type?.name === 'STATUS_HALFTIME';

        if (isHalftime) {
            return {
                className: 'scoreboard__clock--halftime',
                time: 'Halftime',
                period: ''
            };
        }

        return {
            className: 'scoreboard__clock--live',
            time: time,
            period: period,
            liveDot: '<span class="scoreboard__live-dot"></span>'
        };
    }

    /**
     * Format period display based on league
     * Override in subclasses for sport-specific formatting
     * @param {number|string} period - Period number or name
     * @returns {string} Formatted period string
     */
    formatPeriod(period) {
        if (!period) return '';
        return `Period ${period}`;
    }

    /**
     * Update the scoreboard with new game data
     * @param {Object} gameData - New game data
     */
    update(gameData) {
        const previousData = this.gameData;
        this.gameData = gameData;

        // Check for score changes
        if (previousData && this.config.animated) {
            this.checkScoreUpdates(previousData);
        }

        this.render();
    }

    /**
     * Check for score changes and trigger animations
     * @param {Object} previousData - Previous game data
     */
    checkScoreUpdates(previousData) {
        const awayChanged = previousData.away?.score !== this.gameData.away?.score;
        const homeChanged = previousData.home?.score !== this.gameData.home?.score;

        if (awayChanged) {
            this.scheduleScoreAnimation('away');
        }
        if (homeChanged) {
            this.scheduleScoreAnimation('home');
        }
    }

    /**
     * Schedule score animation after render
     * @param {string} side - 'away' or 'home'
     */
    scheduleScoreAnimation(side) {
        // Clear any pending animations
        this._animationTimeouts.forEach(t => clearTimeout(t));

        // Wait for render, then animate
        const timeout = setTimeout(() => {
            this.animateScore(side);
        }, 50);

        this._animationTimeouts.push(timeout);
    }

    /**
     * Animate score update
     * @param {string} side - 'away' or 'home'
     */
    animateScore(side) {
        const scoreEl = this.element.querySelector(`#score-${side}`);
        const boxEl = this.element.querySelector(`#score-${side}-box`);

        if (scoreEl) {
            scoreEl.classList.add('scoreboard__score-value--updated');
            setTimeout(() => {
                scoreEl.classList.remove('scoreboard__score-value--updated');
            }, 500);
        }

        if (boxEl) {
            boxEl.classList.add('scoreboard__score--updated');
            setTimeout(() => {
                boxEl.classList.remove('scoreboard__score--updated');
            }, 500);
        }
    }

    /**
     * Set score for a team with animation
     * @param {string} side - 'away' or 'home'
     * @param {number|string} score - New score value
     */
    setScore(side, score) {
        if (!this.gameData) return;

        const previousScore = this.gameData[side]?.score;
        this.gameData[side].score = score;

        const scoreEl = this.element.querySelector(`#score-${side}`);
        if (scoreEl) {
            scoreEl.textContent = score;

            if (previousScore !== score && this.config.animated) {
                this.animateScore(side);
            }
        }

        this.updateWinnerState();
    }

    /**
     * Update winner state based on current scores
     */
    updateWinnerState() {
        if (!this.gameData) return;

        const awayScore = parseInt(this.gameData.away?.score) || 0;
        const homeScore = parseInt(this.gameData.home?.score) || 0;
        const isFinal = this.gameData.state?.toLowerCase() === 'post';

        const awayPanel = this.element.querySelector('.scoreboard__team--away');
        const homePanel = this.element.querySelector('.scoreboard__team--home');

        if (awayPanel) {
            awayPanel.classList.toggle('scoreboard__team--winner',
                isFinal && awayScore > homeScore);
        }
        if (homePanel) {
            homePanel.classList.toggle('scoreboard__team--winner',
                isFinal && homeScore > awayScore);
        }
    }

    /**
     * Set the display variant
     * @param {string} variant - 'regular', 'compact', or 'fullscreen'
     */
    setVariant(variant) {
        this.element.classList.remove(
            'scoreboard--regular',
            'scoreboard--compact',
            'scoreboard--fullscreen'
        );

        this.config.variant = variant;

        if (variant !== 'regular') {
            this.element.classList.add(`scoreboard--${variant}`);
        }
    }

    /**
     * Clean up and remove the scoreboard
     */
    destroy() {
        // Clear all pending animations
        this._animationTimeouts.forEach(t => clearTimeout(t));
        this._animationTimeouts = [];

        // Remove from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.element = null;
        this.gameData = null;
    }

    /**
     * Get current game data
     * @returns {Object} Current game data
     */
    getData() {
        return this.gameData;
    }

    /**
     * Get the scoreboard DOM element
     * @returns {HTMLElement} Scoreboard element
     */
    getElement() {
        return this.element;
    }
}

export default Scoreboard;
