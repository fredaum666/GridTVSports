/**
 * GridTV Scoreboard - Baseball (MLB)
 * Extends base with inning grid, diamond bases, count, outs
 *
 * @class BaseballScoreboard
 * @extends Scoreboard
 */

import { Scoreboard } from './Scoreboard.js';

export class BaseballScoreboard extends Scoreboard {
    constructor(container, config = {}) {
        super(container, {
            ...config,
            league: 'mlb'
        });

        this.element.classList.add('scoreboard--baseball');
    }

    /**
     * Get CSS classes for baseball scoreboard
     * @returns {string} Space-separated class names
     */
    getBaseClasses() {
        return `${super.getBaseClasses()} scoreboard--baseball`;
    }

    /**
     * Render the full baseball scoreboard
     */
    render() {
        if (!this.gameData) {
            this.element.innerHTML = this.renderEmpty();
            return;
        }

        const isLive = this.gameData.state?.toLowerCase() === 'in';
        const showGrid = this.config.variant !== 'compact';
        const showSituation = isLive || this.config.variant === 'fullscreen';
        const isFullscreen = this.config.variant === 'fullscreen';

        // For fullscreen, render grid and situation separately (different grid positions)
        // For regular/compact, wrap them in a container for the situation area
        const gridAndSituation = isFullscreen
            ? `${showGrid ? this.renderInningGrid() : ''}
               ${showSituation && isLive ? this.renderSituation() : ''}`
            : `<div class="scoreboard__baseball-extras">
                   ${showGrid ? this.renderInningGrid() : ''}
                   ${showSituation && isLive ? this.renderSituation() : ''}
               </div>`;

        this.element.innerHTML = `
            ${this.renderTeamPanel('away')}
            ${this.renderTeamPanel('home')}
            ${this.renderCenter()}
            ${gridAndSituation}
        `;

        this.applyColors();
        this.updateWinnerState();
    }

    /**
     * Render the inning-by-inning scoring grid
     * @returns {string} HTML string
     */
    renderInningGrid() {
        const innings = this.getInningsData();
        const currentInning = this.getCurrentInning();

        return `
            <div class="scoreboard__inning-grid">
                ${this.renderInningHeaders(innings, currentInning)}
                ${this.renderInningRow('away', innings, currentInning)}
                ${this.renderInningRow('home', innings, currentInning)}
            </div>
        `;
    }

    /**
     * Get innings data from game data
     * @returns {number} Number of innings to display
     */
    getInningsData() {
        const linescores = this.gameData.linescores || {};
        const awayScores = linescores.away || [];
        const homeScores = linescores.home || [];

        return Math.max(awayScores.length, homeScores.length, 9);
    }

    /**
     * Get current inning number
     * @returns {number} Current inning
     */
    getCurrentInning() {
        return this.gameData.status?.period || this.gameData.situation?.inning || 1;
    }

    /**
     * Check if it's top or bottom of inning
     * @returns {boolean} True if top of inning
     */
    isTopOfInning() {
        const half = this.gameData.situation?.half || this.gameData.status?.half;
        return half === 'top' || half === 1;
    }

    /**
     * Render inning header row
     * @param {number} totalInnings - Total innings to display
     * @param {number} currentInning - Current inning number
     * @returns {string} HTML string
     */
    renderInningHeaders(totalInnings, currentInning) {
        const isLive = this.gameData.state?.toLowerCase() === 'in';

        let headers = '';
        for (let i = 1; i <= totalInnings; i++) {
            const isCurrent = i === currentInning && isLive;
            const currentClass = isCurrent ? 'scoreboard__inning-header--current' : '';
            headers += `<div class="scoreboard__inning-header ${currentClass}">${i}</div>`;
        }

        return `
            <div class="scoreboard__inning-headers">
                <div class="scoreboard__inning-team"></div>
                ${headers}
                <div class="scoreboard__inning-header scoreboard__inning-header--stat">R</div>
                <div class="scoreboard__inning-header scoreboard__inning-header--stat">H</div>
                <div class="scoreboard__inning-header scoreboard__inning-header--stat">E</div>
            </div>
        `;
    }

    /**
     * Render a single team's inning score row
     * @param {string} side - 'away' or 'home'
     * @param {number} totalInnings - Total innings
     * @param {number} currentInning - Current inning
     * @returns {string} HTML string
     */
    renderInningRow(side, totalInnings, currentInning) {
        const team = this.gameData[side];
        const linescores = this.gameData.linescores || {};
        const scores = linescores[side] || [];
        const isWinner = team.winner === true;
        const isLive = this.gameData.state?.toLowerCase() === 'in';

        const winnerClass = isWinner ? 'scoreboard__inning-row--winner' : '';

        let values = '';
        for (let i = 0; i < totalInnings; i++) {
            const score = scores[i] ?? (i < currentInning - 1 ? '0' : '-');
            const isCurrent = i + 1 === currentInning && isLive;
            const currentClass = isCurrent ? 'scoreboard__inning-value--current' : '';
            values += `<div class="scoreboard__inning-value ${currentClass}">${score}</div>`;
        }

        // R H E stats
        const runs = team.score ?? '-';
        const hits = team.hits ?? '-';
        const errors = team.errors ?? '-';

        return `
            <div class="scoreboard__inning-row scoreboard__inning-row--${side} ${winnerClass}">
                <div class="scoreboard__inning-team">${team.abbr || '---'}</div>
                ${values}
                <div class="scoreboard__inning-value scoreboard__inning-value--stat scoreboard__inning-value--runs">${runs}</div>
                <div class="scoreboard__inning-value scoreboard__inning-value--stat">${hits}</div>
                <div class="scoreboard__inning-value scoreboard__inning-value--stat">${errors}</div>
            </div>
        `;
    }

    /**
     * Render the situation bar (diamond, count, outs)
     * @returns {string} HTML string
     */
    renderSituation() {
        return `
            <div class="scoreboard__baseball-situation">
                ${this.renderInningIndicator()}
                ${this.renderDiamond()}
                ${this.renderCount()}
            </div>
        `;
    }

    /**
     * Render inning indicator with top/bottom arrows
     * @returns {string} HTML string
     */
    renderInningIndicator() {
        const inning = this.getCurrentInning();
        const isTop = this.isTopOfInning();

        return `
            <div class="scoreboard__inning-indicator">
                <div class="scoreboard__inning-half scoreboard__inning-half--top ${isTop ? 'scoreboard__inning-half--active' : ''}"></div>
                <span class="scoreboard__inning-number">${inning}</span>
                <div class="scoreboard__inning-half scoreboard__inning-half--bottom ${!isTop ? 'scoreboard__inning-half--active' : ''}"></div>
            </div>
        `;
    }

    /**
     * Render diamond bases SVG
     * @returns {string} HTML string
     */
    renderDiamond() {
        const situation = this.gameData.situation || {};
        const bases = {
            first: situation.first || situation.onFirst || false,
            second: situation.second || situation.onSecond || false,
            third: situation.third || situation.onThird || false
        };

        return `
            <div class="scoreboard__diamond">
                <svg class="scoreboard__diamond-svg" viewBox="0 0 50 50">
                    <!-- Base lines -->
                    <path class="scoreboard__baselines" d="M25 5 L45 25 L25 45 L5 25 Z" />

                    <!-- Home plate (pentagon) -->
                    <polygon class="scoreboard__home-plate" points="25,45 21,42 21,38 29,38 29,42" />

                    <!-- Second base (top) -->
                    <rect class="scoreboard__base ${bases.second ? 'scoreboard__base--occupied' : ''}"
                          x="21" y="1" width="8" height="8" transform="rotate(45 25 5)" />

                    <!-- Third base (left) -->
                    <rect class="scoreboard__base ${bases.third ? 'scoreboard__base--occupied' : ''}"
                          x="1" y="21" width="8" height="8" transform="rotate(45 5 25)" />

                    <!-- First base (right) -->
                    <rect class="scoreboard__base ${bases.first ? 'scoreboard__base--occupied' : ''}"
                          x="41" y="21" width="8" height="8" transform="rotate(45 45 25)" />
                </svg>
            </div>
        `;
    }

    /**
     * Render balls, strikes, outs count
     * @returns {string} HTML string
     */
    renderCount() {
        const situation = this.gameData.situation || {};
        const balls = situation.balls ?? 0;
        const strikes = situation.strikes ?? 0;
        const outs = situation.outs ?? 0;

        return `
            <div class="scoreboard__count">
                ${this.renderCountRow('B', balls, 4, 'ball')}
                ${this.renderCountRow('S', strikes, 3, 'strike')}
                ${this.renderCountRow('O', outs, 3, 'out')}
            </div>
        `;
    }

    /**
     * Render a single count row (balls, strikes, or outs)
     * @param {string} label - Row label (B, S, O)
     * @param {number} count - Current count
     * @param {number} max - Maximum dots
     * @param {string} type - Type for styling (ball, strike, out)
     * @returns {string} HTML string
     */
    renderCountRow(label, count, max, type) {
        let dots = '';
        for (let i = 0; i < max; i++) {
            const activeClass = i < count
                ? `scoreboard__count-dot--${type} scoreboard__count-dot--active`
                : '';
            dots += `<div class="scoreboard__count-dot ${activeClass}"></div>`;
        }

        return `
            <div class="scoreboard__count-row">
                <span class="scoreboard__count-label">${label}</span>
                <div class="scoreboard__count-dots">${dots}</div>
            </div>
        `;
    }

    /**
     * Format period for baseball (innings)
     * @param {number|string} period - Inning number
     * @returns {string} Formatted inning string
     */
    formatPeriod(period) {
        if (!period) return '';

        const inning = parseInt(period);
        const half = this.isTopOfInning() ? 'Top' : 'Bot';

        if (inning > 9) {
            return `${half} ${inning}th (Extra)`;
        }

        const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
        return `${half} ${ordinals[inning] || `${inning}th`}`;
    }

    /**
     * Get status info with baseball-specific formatting
     * @returns {Object} Status info with className, time, period, and liveDot
     */
    getStatusInfo() {
        const state = this.gameData.state?.toLowerCase() || 'pre';
        const status = this.gameData.status || {};

        // Rain delay
        if (status.type?.name === 'STATUS_RAIN_DELAY' ||
            status.shortDetail?.toLowerCase().includes('delay')) {
            return {
                className: 'scoreboard__clock--halftime',
                time: 'Rain Delay',
                period: ''
            };
        }

        // Extra innings indicator for final
        if (state === 'post') {
            const inning = status.period || 9;
            if (inning > 9) {
                return {
                    className: 'scoreboard__clock--final',
                    time: `F/${inning}`,
                    period: ''
                };
            }
        }

        return super.getStatusInfo();
    }

    /**
     * Update count (balls, strikes, outs)
     * @param {number} balls - Ball count
     * @param {number} strikes - Strike count
     * @param {number} outs - Out count
     */
    setCount(balls, strikes, outs) {
        if (!this.gameData) return;

        this.gameData.situation = {
            ...this.gameData.situation,
            balls,
            strikes,
            outs
        };

        // Update count display
        const countEl = this.element.querySelector('.scoreboard__count');
        if (countEl) {
            countEl.outerHTML = this.renderCount();
        }
    }

    /**
     * Update base runners
     * @param {boolean} first - Runner on first
     * @param {boolean} second - Runner on second
     * @param {boolean} third - Runner on third
     */
    setBases(first, second, third) {
        if (!this.gameData) return;

        this.gameData.situation = {
            ...this.gameData.situation,
            first,
            second,
            third
        };

        // Update diamond display
        const diamondEl = this.element.querySelector('.scoreboard__diamond');
        if (diamondEl) {
            diamondEl.outerHTML = this.renderDiamond();
        }
    }

    /**
     * Update inning
     * @param {number} inning - Current inning
     * @param {boolean} isTop - True if top of inning
     */
    setInning(inning, isTop) {
        if (!this.gameData) return;

        this.gameData.situation = {
            ...this.gameData.situation,
            inning,
            half: isTop ? 'top' : 'bottom'
        };

        this.gameData.status = {
            ...this.gameData.status,
            period: inning
        };

        // Update inning indicator
        const indicatorEl = this.element.querySelector('.scoreboard__inning-indicator');
        if (indicatorEl) {
            indicatorEl.outerHTML = this.renderInningIndicator();
        }

        // Update inning grid headers for current inning highlight
        if (this.config.variant !== 'compact') {
            const gridEl = this.element.querySelector('.scoreboard__inning-grid');
            if (gridEl) {
                gridEl.outerHTML = this.renderInningGrid();
            }
        }
    }

    /**
     * Update hits and errors
     * @param {string} side - 'away' or 'home'
     * @param {number} hits - Hit count
     * @param {number} errors - Error count
     */
    setHitsErrors(side, hits, errors) {
        if (!this.gameData) return;

        this.gameData[side].hits = hits;
        this.gameData[side].errors = errors;

        // Re-render grid if visible
        if (this.config.variant !== 'compact') {
            const gridEl = this.element.querySelector('.scoreboard__inning-grid');
            if (gridEl) {
                gridEl.outerHTML = this.renderInningGrid();
            }
        }
    }
}

export default BaseballScoreboard;
