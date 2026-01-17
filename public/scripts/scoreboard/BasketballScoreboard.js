/**
 * GridTV Scoreboard - Basketball (NBA & NCAAB)
 * Extends base with period scoring grid, bonus, timeouts
 *
 * @class BasketballScoreboard
 * @extends Scoreboard
 */

import { Scoreboard } from './Scoreboard.js';

export class BasketballScoreboard extends Scoreboard {
    constructor(container, config = {}) {
        super(container, {
            ...config,
            league: config.league || 'nba'
        });

        this.element.classList.add('scoreboard--basketball');

        // NCAA uses halves, NBA uses quarters
        this.periodsCount = config.league === 'ncaab' ? 2 : 4;
    }

    /**
     * Get CSS classes for basketball scoreboard
     * @returns {string} Space-separated class names
     */
    getBaseClasses() {
        const base = super.getBaseClasses();
        return `${base} scoreboard--basketball${this.config.league === 'ncaab' ? ' scoreboard--ncaab' : ''}`;
    }

    /**
     * Render the full basketball scoreboard
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
     * Render team panel with bonus indicator and timeouts
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
     * Render score box with logo and timeouts below
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
                ${this.renderTimeouts(team, side)}
            </div>
        `;
    }

    /**
     * Get bonus state for team
     * @param {Object} team - Team data
     * @returns {string|null} 'bonus', 'double', or null
     */
    getBonusState(team) {
        const fouls = team.fouls || 0;

        if (this.config.league === 'ncaab') {
            // NCAA: bonus at 7, double bonus at 10
            if (fouls >= 10) return 'double';
            if (fouls >= 7) return 'bonus';
        } else {
            // NBA: bonus at 5 (no double bonus)
            if (fouls >= 5) return 'bonus';
        }

        return null;
    }

    /**
     * Render bonus indicator
     * @param {string} type - 'bonus' or 'double'
     * @returns {string} HTML string
     */
    renderBonus(type) {
        const doubleClass = type === 'double' ? 'scoreboard__bonus--double' : '';
        const text = type === 'double' ? '2X BONUS' : 'BONUS';

        return `<div class="scoreboard__bonus ${doubleClass}">${text}</div>`;
    }

    /**
     * Render timeout indicators (circles for basketball)
     * @param {Object} team - Team data
     * @param {string} side - 'away' or 'home'
     * @returns {string} HTML string
     */
    renderTimeouts(team, side) {
        if (!this.config.showTimeouts) return '';

        const timeouts = team.timeouts ?? (this.config.league === 'ncaab' ? 4 : 7);
        const maxTimeouts = this.config.league === 'ncaab' ? 4 : 7;

        let dots = '';
        for (let i = 0; i < maxTimeouts; i++) {
            const activeClass = i < timeouts ? 'scoreboard__timeout--active' : '';
            dots += `<div class="scoreboard__timeout ${activeClass}"></div>`;
        }

        return `<div class="scoreboard__timeouts">${dots}</div>`;
    }

    /**
     * Render period scoring grid (scores only, no headers)
     * @returns {string} HTML string
     */
    renderPeriodGrid() {
        const periods = this.getPeriodsData();
        const currentPeriod = this.getCurrentPeriod();

        return `
            <div class="scoreboard__period-grid">
                ${this.renderPeriodScores(periods, currentPeriod)}
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

        const periodsPlayed = Math.max(awayScores.length, homeScores.length, this.periodsCount);
        const periods = [];

        for (let i = 1; i <= periodsPlayed; i++) {
            if (i <= this.periodsCount) {
                periods.push(this.config.league === 'ncaab' ? `H${i}` : `Q${i}`);
            } else {
                const otNum = i - this.periodsCount;
                periods.push(otNum === 1 ? 'OT' : `${otNum}OT`);
            }
        }

        return periods;
    }

    /**
     * Get current period number
     * @returns {number} Current period (1-indexed)
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
        const headers = periods.map((period, i) => {
            const isCurrent = i + 1 === currentPeriod && this.gameData.state?.toLowerCase() === 'in';
            const currentClass = isCurrent ? 'scoreboard__period-header--current' : '';
            return `<div class="scoreboard__period-header ${currentClass}">${period}</div>`;
        });

        return `
            <div class="scoreboard__period-headers">
                ${headers.join('')}
                <div class="scoreboard__period-header scoreboard__period-header--total">T</div>
            </div>
        `;
    }

    /**
     * Render period scores for both teams
     * @param {Array} periods - Period labels
     * @param {number} currentPeriod - Current period number
     * @returns {string} HTML string
     */
    renderPeriodScores(periods, currentPeriod) {
        const linescores = this.gameData.linescores || {};

        return `
            <div class="scoreboard__period-scores">
                ${this.renderPeriodRow('away', periods, linescores.away || [], currentPeriod)}
                ${this.renderPeriodRow('home', periods, linescores.home || [], currentPeriod)}
            </div>
        `;
    }

    /**
     * Render a single team's period score row
     * @param {string} side - 'away' or 'home'
     * @param {Array} periods - Period labels
     * @param {Array} scores - Period scores
     * @param {number} currentPeriod - Current period number
     * @returns {string} HTML string
     */
    renderPeriodRow(side, periods, scores, currentPeriod) {
        const team = this.gameData[side];
        const isWinner = team.winner === true;
        const winnerClass = isWinner ? 'scoreboard__period-row--winner' : '';

        const values = periods.map((_, i) => {
            const score = scores[i] ?? '-';
            const isCurrent = i + 1 === currentPeriod && this.gameData.state?.toLowerCase() === 'in';
            const currentClass = isCurrent ? 'scoreboard__period-value--current' : '';
            return `<div class="scoreboard__period-value ${currentClass}">${score}</div>`;
        });

        const total = team.score ?? '-';

        return `
            <div class="scoreboard__period-row scoreboard__period-row--${side} ${winnerClass}">
                <div class="scoreboard__period-team">${team.abbr || '---'}</div>
                <div class="scoreboard__period-values">
                    ${values.join('')}
                    <div class="scoreboard__period-value scoreboard__period-value--total">${total}</div>
                </div>
            </div>
        `;
    }

    /**
     * Format period for basketball
     * @param {number|string} period - Period number
     * @returns {string} Formatted period string
     */
    formatPeriod(period) {
        if (!period) return '';

        const periodNum = parseInt(period);

        if (this.config.league === 'ncaab') {
            // NCAA: halves
            if (periodNum <= 2) {
                return periodNum === 1 ? '1st Half' : '2nd Half';
            }
            const otNum = periodNum - 2;
            return otNum === 1 ? 'OT' : `${otNum}OT`;
        } else {
            // NBA: quarters
            if (periodNum <= 4) {
                const ordinals = ['', '1st', '2nd', '3rd', '4th'];
                return `${ordinals[periodNum]} Qtr`;
            }
            const otNum = periodNum - 4;
            return otNum === 1 ? 'OT' : `${otNum}OT`;
        }
    }

    /**
     * Get status info with basketball-specific formatting
     * @returns {Object} Status info with className, time, period, and liveDot
     */
    getStatusInfo() {
        const state = this.gameData.state?.toLowerCase() || 'pre';
        const status = this.gameData.status || {};

        // Check for halftime
        if (status.type?.name === 'STATUS_HALFTIME' ||
            status.shortDetail?.toLowerCase().includes('halftime')) {
            return {
                className: 'scoreboard__clock--halftime',
                time: 'Halftime',
                period: ''
            };
        }

        // Check for end of period
        if (status.type?.name === 'STATUS_END_PERIOD') {
            const period = status.period || 1;
            return {
                className: 'scoreboard__clock--halftime',
                time: `End ${this.formatPeriod(period)}`,
                period: ''
            };
        }

        // Overtime indicator
        if (state === 'in' && status.period > this.periodsCount) {
            const time = status.displayClock || status.time || '--:--';
            const otNum = status.period - this.periodsCount;
            const otText = otNum === 1 ? 'OT' : `${otNum}OT`;
            return {
                className: 'scoreboard__clock--live',
                time: time,
                period: otText,
                liveDot: '<span class="scoreboard__live-dot"></span>'
            };
        }

        return super.getStatusInfo();
    }

    /**
     * Update team fouls
     * @param {string} side - 'away' or 'home'
     * @param {number} fouls - Number of team fouls
     */
    setFouls(side, fouls) {
        if (!this.gameData) return;

        this.gameData[side].fouls = fouls;

        // Update bonus display
        const teamPanel = this.element.querySelector(`.scoreboard__team--${side}`);
        if (teamPanel) {
            const existingBonus = teamPanel.querySelector('.scoreboard__bonus');
            const newBonus = this.getBonusState(this.gameData[side]);

            if (existingBonus) {
                existingBonus.remove();
            }

            if (newBonus) {
                const bonusHtml = this.renderBonus(newBonus);
                teamPanel.insertAdjacentHTML('beforeend', bonusHtml);
            }
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

        // Re-render period grid if visible
        if (this.config.variant !== 'compact') {
            const gridEl = this.element.querySelector('.scoreboard__period-grid');
            if (gridEl) {
                gridEl.outerHTML = this.renderPeriodGrid();
            }
        }
    }

    /**
     * Update timeouts for a team
     * @param {string} side - 'away' or 'home'
     * @param {number} count - Number of remaining timeouts
     */
    setTimeouts(side, count) {
        if (!this.gameData) return;

        this.gameData[side].timeouts = count;

        // Update timeout display
        const teamPanel = this.element.querySelector(`.scoreboard__team--${side}`);
        if (teamPanel) {
            const timeoutsEl = teamPanel.querySelector('.scoreboard__timeouts');
            if (timeoutsEl) {
                timeoutsEl.outerHTML = this.renderTimeouts(this.gameData[side], side);
            }
        }
    }
}

export default BasketballScoreboard;
