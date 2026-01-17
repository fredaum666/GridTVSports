/**
 * GridTV Scoreboard - Hockey (NHL)
 * Extends base with period grid, power play, shots on goal
 *
 * @class HockeyScoreboard
 * @extends Scoreboard
 */

import { Scoreboard } from './Scoreboard.js';

export class HockeyScoreboard extends Scoreboard {
    constructor(container, config = {}) {
        super(container, {
            ...config,
            league: 'nhl'
        });

        this.element.classList.add('scoreboard--hockey');
    }

    /**
     * Get CSS classes for hockey scoreboard
     * @returns {string} Space-separated class names
     */
    getBaseClasses() {
        return `${super.getBaseClasses()} scoreboard--hockey`;
    }

    /**
     * Render the full hockey scoreboard
     * Note: Situation bar (power play, SOG) removed - ESPN scoreboard API
     * does not provide this data.
     */
    render() {
        if (!this.gameData) {
            this.element.innerHTML = this.renderEmpty();
            return;
        }

        const showGrid = this.config.variant !== 'compact';

        this.element.innerHTML = `
            ${this.renderTeamPanel('away')}
            ${this.renderTeamPanel('home')}
            ${this.renderCenter()}
            ${showGrid ? this.renderPeriodGrid() : ''}
        `;

        this.applyColors();
        this.updateWinnerState();
    }

    /**
     * Render team panel with power play/penalty kill indicators
     * @param {string} side - 'away' or 'home'
     * @returns {string} HTML string
     */
    renderTeamPanel(side) {
        const team = this.gameData[side];
        const isWinner = team.winner === true;
        const winnerClass = isWinner ? 'scoreboard__team--winner' : '';

        const content = side === 'away'
            ? this.renderTeamContent(team, side)
            : this.renderTeamContentReverse(team, side);

        return `
            <div class="scoreboard__team scoreboard__team--${side} ${winnerClass}">
                ${content}
            </div>
        `;
    }

    /**
     * Check if team has power play
     * @param {string} side - 'away' or 'home'
     * @returns {boolean} True if team has power play
     */
    hasPowerPlay(side) {
        const situation = this.gameData.situation || {};
        const strength = situation.strength || '';

        // Parse strength like "5v4", "5v3"
        const parts = strength.toLowerCase().split('v');
        if (parts.length !== 2) return false;

        const [first, second] = parts.map(p => parseInt(p) || 5);

        if (side === 'away') {
            return first > second;
        }
        return second > first;
    }

    /**
     * Check if team is on penalty kill
     * @param {string} side - 'away' or 'home'
     * @returns {boolean} True if team is on penalty kill
     */
    hasPenaltyKill(side) {
        const situation = this.gameData.situation || {};
        const strength = situation.strength || '';

        const parts = strength.toLowerCase().split('v');
        if (parts.length !== 2) return false;

        const [first, second] = parts.map(p => parseInt(p) || 5);

        if (side === 'away') {
            return first < second;
        }
        return second < first;
    }

    /**
     * Render power play badge
     * @param {Object} situation - Game situation data
     * @returns {string} HTML string
     */
    renderPowerPlayBadge(situation) {
        const strength = situation.strength || '';
        const timeRemaining = situation.powerPlayTime || '';

        return `
            <div class="scoreboard__powerplay">
                <span class="scoreboard__powerplay-icon">PP</span>
                ${strength ? `<span class="scoreboard__powerplay-strength">${strength}</span>` : ''}
                ${timeRemaining ? `<span class="scoreboard__powerplay-time">${timeRemaining}</span>` : ''}
            </div>
        `;
    }

    /**
     * Render penalty kill badge
     * @returns {string} HTML string
     */
    renderPenaltyKillBadge() {
        return `<div class="scoreboard__penaltykill">PK</div>`;
    }

    /**
     * Render empty net badge
     * @returns {string} HTML string
     */
    renderEmptyNetBadge() {
        return `<div class="scoreboard__emptynet">EN</div>`;
    }

    /**
     * Render period scoring grid (scores only, no headers)
     * @returns {string} HTML string
     */
    renderPeriodGrid() {
        const periods = this.getPeriodsData();
        const currentPeriod = this.getCurrentPeriod();

        return `
            <div class="scoreboard__hockey-grid">
                ${this.renderPeriodRow('away', periods, currentPeriod)}
                ${this.renderPeriodRow('home', periods, currentPeriod)}
            </div>
        `;
    }

    /**
     * Get periods data from game data
     * @returns {Array} Array of period labels
     */
    getPeriodsData() {
        const linescores = this.gameData.linescores || {};
        const awayScores = linescores.away || [];
        const homeScores = linescores.home || [];

        const periodsPlayed = Math.max(awayScores.length, homeScores.length, 3);
        const periods = [];

        for (let i = 1; i <= periodsPlayed; i++) {
            if (i <= 3) {
                periods.push(`P${i}`);
            } else if (i === 4) {
                periods.push('OT');
            } else {
                periods.push('SO');
            }
        }

        return periods;
    }

    /**
     * Get current period number
     * @returns {number} Current period
     */
    getCurrentPeriod() {
        return this.gameData.status?.period || 1;
    }

    /**
     * Render period header row
     * @param {Array} periods - Period labels
     * @param {number} currentPeriod - Current period number
     * @returns {string} HTML string
     */
    renderPeriodHeaders(periods, currentPeriod) {
        const isLive = this.gameData.state?.toLowerCase() === 'in';

        const headers = periods.map((period, i) => {
            const isCurrent = i + 1 === currentPeriod && isLive;
            const currentClass = isCurrent ? 'scoreboard__hockey-header--current' : '';
            return `<div class="scoreboard__hockey-header ${currentClass}">${period}</div>`;
        });

        return `
            <div class="scoreboard__hockey-headers">
                ${headers.join('')}
                <div class="scoreboard__hockey-header scoreboard__hockey-header--total">T</div>
            </div>
        `;
    }

    /**
     * Render a single team's period score row
     * @param {string} side - 'away' or 'home'
     * @param {Array} periods - Period labels
     * @param {number} currentPeriod - Current period number
     * @returns {string} HTML string
     */
    renderPeriodRow(side, periods, currentPeriod) {
        const team = this.gameData[side];
        const linescores = this.gameData.linescores || {};
        const scores = linescores[side] || [];
        const isWinner = team.winner === true;
        const isLive = this.gameData.state?.toLowerCase() === 'in';

        const winnerClass = isWinner ? 'scoreboard__hockey-row--winner' : '';

        const values = periods.map((_, i) => {
            const score = scores[i] ?? '-';
            const isCurrent = i + 1 === currentPeriod && isLive;
            const currentClass = isCurrent ? 'scoreboard__hockey-value--current' : '';
            return `<div class="scoreboard__hockey-value ${currentClass}">${score}</div>`;
        });

        const total = team.score ?? '-';

        return `
            <div class="scoreboard__hockey-row scoreboard__hockey-row--${side} ${winnerClass}">
                <div class="scoreboard__hockey-team">${team.abbr || '---'}</div>
                <div class="scoreboard__hockey-values">
                    ${values.join('')}
                    <div class="scoreboard__hockey-value scoreboard__hockey-value--total">${total}</div>
                </div>
            </div>
        `;
    }

    /**
     * Render situation bar (shots on goal)
     * Note: Power play display removed - ESPN scoreboard API does not provide
     * strength/powerPlayTime data. Only possession is available.
     * @returns {string} HTML string
     */
    renderSituation() {
        return `
            <div class="scoreboard__hockey-situation">
                ${this.renderShotsOnGoal()}
            </div>
        `;
    }

    /**
     * Render power play status in situation bar
     * @returns {string} HTML string
     */
    renderPowerPlayStatus() {
        const situation = this.gameData.situation || {};
        const strength = situation.strength || '';
        const time = situation.powerPlayTime || '';

        return `
            <div class="scoreboard__powerplay">
                <span class="scoreboard__powerplay-strength">${strength}</span>
                ${time ? `<span class="scoreboard__powerplay-time">${time}</span>` : ''}
            </div>
        `;
    }

    /**
     * Render shots on goal display
     * @returns {string} HTML string
     */
    renderShotsOnGoal() {
        const awayShots = this.gameData.away?.shots ?? '-';
        const homeShots = this.gameData.home?.shots ?? '-';

        return `
            <div class="scoreboard__shots">
                <span class="scoreboard__shots-label">SOG</span>
                <div class="scoreboard__shots-values">
                    <span class="scoreboard__shots-away">${awayShots}</span>
                    <span class="scoreboard__shots-divider">-</span>
                    <span class="scoreboard__shots-home">${homeShots}</span>
                </div>
            </div>
        `;
    }

    /**
     * Format period for hockey
     * @param {number|string} period - Period number
     * @returns {string} Formatted period string
     */
    formatPeriod(period) {
        if (!period) return '';

        const periodNum = parseInt(period);
        if (periodNum <= 3) {
            const ordinals = ['', '1st', '2nd', '3rd'];
            return `${ordinals[periodNum]} Period`;
        }

        if (periodNum === 4) return 'Overtime';
        if (periodNum === 5) return 'Shootout';

        return `${periodNum - 3}OT`;
    }

    /**
     * Get status info with hockey-specific formatting
     * @returns {Object} Status info with className, time, period, and liveDot
     */
    getStatusInfo() {
        const state = this.gameData.state?.toLowerCase() || 'pre';
        const status = this.gameData.status || {};

        // Intermission
        if (status.type?.name === 'STATUS_END_PERIOD' ||
            status.shortDetail?.toLowerCase().includes('intermission')) {
            const period = status.period || 1;
            const ordinals = ['', '1st', '2nd', '3rd'];
            const periodText = ordinals[period] || `${period}th`;

            return {
                className: 'scoreboard__clock--halftime',
                time: `${periodText} Intermission`,
                period: ''
            };
        }

        // Overtime
        if (state === 'in' && status.period === 4) {
            const time = status.displayClock || status.time || '--:--';
            return {
                className: 'scoreboard__clock--live',
                time: time,
                period: 'Overtime',
                liveDot: '<span class="scoreboard__live-dot"></span>'
            };
        }

        // Shootout
        if (state === 'in' && status.period === 5) {
            return {
                className: 'scoreboard__clock--live',
                time: 'Shootout',
                period: '',
                liveDot: '<span class="scoreboard__live-dot"></span>'
            };
        }

        // Final with OT/SO indicator
        if (state === 'post') {
            const period = status.period || 3;
            let detail = status.shortDetail || 'Final';

            // Add OT/SO suffix if not already present
            if (!detail.includes('/')) {
                if (period === 4) detail = 'Final/OT';
                else if (period === 5) detail = 'Final/SO';
                else if (period > 5) detail = `Final/${period - 3}OT`;
            }

            return {
                className: 'scoreboard__clock--final',
                time: detail,
                period: ''
            };
        }

        return super.getStatusInfo();
    }

    /**
     * Update power play status
     * @param {string} strength - Strength string (e.g., '5v4', '5v3')
     * @param {string} [time] - Time remaining on power play
     */
    setPowerPlay(strength, time) {
        if (!this.gameData) return;

        this.gameData.situation = {
            ...this.gameData.situation,
            strength,
            powerPlayTime: time
        };

        // Re-render if live
        if (this.gameData.state?.toLowerCase() === 'in') {
            this.render();
        }
    }

    /**
     * Update shots on goal
     * @param {number} awayShots - Away team shots
     * @param {number} homeShots - Home team shots
     */
    setShots(awayShots, homeShots) {
        if (!this.gameData) return;

        this.gameData.away.shots = awayShots;
        this.gameData.home.shots = homeShots;

        // Update shots display
        const shotsEl = this.element.querySelector('.scoreboard__shots');
        if (shotsEl) {
            shotsEl.outerHTML = this.renderShotsOnGoal();
        }
    }

    /**
     * Update period scores
     * @param {string} side - 'away' or 'home'
     * @param {Array} scores - Array of period scores
     */
    setPeriodScores(side, scores) {
        if (!this.gameData) return;

        if (!this.gameData.linescores) {
            this.gameData.linescores = {};
        }

        this.gameData.linescores[side] = scores;

        // Re-render grid if visible
        if (this.config.variant !== 'compact') {
            const gridEl = this.element.querySelector('.scoreboard__hockey-grid');
            if (gridEl) {
                gridEl.outerHTML = this.renderPeriodGrid();
            }
        }
    }

    /**
     * Set empty net status for a team
     * @param {string} side - 'away' or 'home'
     * @param {boolean} isEmpty - True if empty net
     */
    setEmptyNet(side, isEmpty) {
        if (!this.gameData) return;

        this.gameData[side].emptyNet = isEmpty;

        // Re-render team panel
        const teamPanel = this.element.querySelector(`.scoreboard__team--${side}`);
        if (teamPanel) {
            teamPanel.outerHTML = this.renderTeamPanel(side);
        }
    }
}

export default HockeyScoreboard;
