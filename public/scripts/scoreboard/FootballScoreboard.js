/**
 * GridTV Scoreboard - Football (NFL & NCAA)
 * Extends base with timeouts, down/distance, possession, red zone
 *
 * @class FootballScoreboard
 * @extends Scoreboard
 */

import { Scoreboard } from './Scoreboard.js';

export class FootballScoreboard extends Scoreboard {
    constructor(container, config = {}) {
        super(container, {
            ...config,
            league: config.league || 'nfl'
        });

        this.element.classList.add('scoreboard--football');
    }

    /**
     * Get CSS classes for football scoreboard
     * @returns {string} Space-separated class names
     */
    getBaseClasses() {
        return `${super.getBaseClasses()} scoreboard--football`;
    }

    /**
     * Render the full football scoreboard
     */
    render() {
        if (!this.gameData) {
            this.element.innerHTML = this.renderEmpty();
            return;
        }

        const isLive = this.gameData.state?.toLowerCase() === 'in';
        const showSituation = isLive && this.config.variant !== 'compact';

        this.element.innerHTML = `
            ${this.renderTeamPanel('away')}
            ${this.renderTeamPanel('home')}
            ${this.renderCenter()}
            ${showSituation ? this.renderSituation() : ''}
        `;

        this.applyColors();
        this.updateWinnerState();
    }

    /**
     * Render team panel with timeouts inline
     * Order: Away = [Info] [Score] [Timeouts]
     *        Home = [Timeouts] [Score] [Info]
     * @param {string} side - 'away' or 'home'
     * @returns {string} HTML string
     */
    renderTeamPanel(side) {
        const team = this.gameData[side];
        const isWinner = team.winner === true;
        const hasPossession = this.gameData.possession === team.abbr ||
                             this.gameData.possession === team.id;

        const winnerClass = isWinner ? 'scoreboard__team--winner' : '';
        const possessionClass = hasPossession ? 'scoreboard__team--possession' : '';

        // Away: Info → Score → Timeouts (info at outer edge, score in middle, timeouts near clock)
        // Home: Info → Score → Timeouts in HTML, row-reverse CSS makes it display as Timeouts → Score → Info
        const content = side === 'away'
            ? `${this.renderTeamInfo(team)}${this.renderScore(team, side)}${this.renderTimeouts(team, side)}`
            : `${this.renderTeamInfo(team)}${this.renderScore(team, side)}${this.renderTimeouts(team, side)}`;

        return `
            <div class="scoreboard__team scoreboard__team--${side} ${winnerClass} ${possessionClass}">
                ${content}
            </div>
        `;
    }

    /**
     * Render timeout indicators
     * @param {Object} team - Team data
     * @param {string} side - 'away' or 'home'
     * @returns {string} HTML string
     */
    renderTimeouts(team, side) {
        if (!this.config.showTimeouts) return '';

        const timeouts = team.timeouts ?? 3;
        const maxTimeouts = this.config.league === 'ncaa' ? 3 : 3;

        let dots = '';
        for (let i = 0; i < maxTimeouts; i++) {
            const activeClass = i < timeouts ? 'scoreboard__timeout--active' : '';
            dots += `<div class="scoreboard__timeout ${activeClass}"></div>`;
        }

        return `<div class="scoreboard__timeouts">${dots}</div>`;
    }

    /**
     * Render the situation bar (down, distance, yard line)
     * Moves left/right based on which team has possession
     * @returns {string} HTML string
     */
    renderSituation() {
        const situation = this.gameData.situation || {};
        const possession = this.gameData.possession;

        // Determine which team has possession
        const isAwayPossession = possession === this.gameData.away?.abbr ||
                                 possession === this.gameData.away?.id;
        const isHomePossession = possession === this.gameData.home?.abbr ||
                                 possession === this.gameData.home?.id;

        // Get possession team data and color variable
        const possTeam = isAwayPossession ? this.gameData.away : this.gameData.home;
        const teamColorVar = isAwayPossession ? '--sb-away-primary' : '--sb-home-primary';

        // Position class: away = left, home = right
        const positionClass = isAwayPossession
            ? 'scoreboard__situation-wrapper--away'
            : (isHomePossession ? 'scoreboard__situation-wrapper--home' : '');

        const downDistance = this.formatDownDistance(situation);
        const yardLine = this.formatYardLine(situation);

        return `
            <div class="scoreboard__situation-wrapper ${positionClass}">
                <div class="scoreboard__situation"
                     style="--situation-bg: var(${teamColorVar});">
                    ${downDistance ? `<div class="scoreboard__down-distance">${downDistance}</div>` : ''}
                    ${yardLine ? `<div class="scoreboard__yardline">${yardLine}</div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render possession badge with team logo
     * @param {Object} team - Team data for possession team
     * @returns {string} HTML string
     */
    renderPossessionBadge(team) {
        if (!team) return '';

        const logoSrc = team.logo || this.getDefaultLogo(team.abbr);

        return `
            <div class="scoreboard__possession-badge">
                <img src="${logoSrc}"
                     alt="${team.abbr || ''}"
                     onerror="this.style.display='none'">
            </div>
        `;
    }

    /**
     * Format down and distance
     * @param {Object} situation - Situation data
     * @returns {string} HTML string
     */
    formatDownDistance(situation) {
        const down = situation.down;
        const distance = situation.distance || situation.yardLine;
        const downDistanceText = situation.downDistanceText || situation.shortDownDistanceText;

        // Use pre-formatted text if available
        if (downDistanceText) {
            return `<span class="scoreboard__down">${downDistanceText}</span>`;
        }

        if (!down) return '';

        const ordinals = ['', '1st', '2nd', '3rd', '4th'];
        const downText = ordinals[down] || `${down}th`;

        let distanceText = distance;
        if (distance === 'Goal' || situation.isGoal) {
            distanceText = '<span class="scoreboard__distance--goal">Goal</span>';
        } else if (distance) {
            distanceText = `${distance}`;
        }

        return `
            <span class="scoreboard__down">${downText}</span>
            <span class="scoreboard__distance-separator">&</span>
            <span class="scoreboard__distance">${distanceText}</span>
        `;
    }

    /**
     * Format yard line display
     * @param {Object} situation - Situation data
     * @returns {string} HTML string
     */
    formatYardLine(situation) {
        const yardLine = situation.yardLine;
        const possessionText = situation.possessionText;

        if (!yardLine && !possessionText) return '';

        // Full possession text if available
        if (possessionText) {
            return `
                <span class="scoreboard__yardline-value">${possessionText}</span>
            `;
        }

        // Just yard line
        if (yardLine) {
            const side = yardLine > 50 ? 'OPP' : 'OWN';
            const displayYard = yardLine > 50 ? 100 - yardLine : yardLine;

            return `
                <span class="scoreboard__yardline-side">${side}</span>
                <span class="scoreboard__yardline-value">${displayYard}</span>
            `;
        }

        return '';
    }

    /**
     * Render play clock (if available)
     * @returns {string} HTML string
     */
    renderPlayClock() {
        const situation = this.gameData.situation || {};
        const playClock = situation.playClock;

        if (!playClock && playClock !== 0) return '';

        const urgentClass = playClock <= 10 ? 'scoreboard__playclock--urgent' : '';

        return `
            <div class="scoreboard__playclock ${urgentClass}">
                <span class="scoreboard__playclock-value">${playClock}</span>
                <span class="scoreboard__playclock-label">Play</span>
            </div>
        `;
    }

    /**
     * Format period for football (quarters)
     * @param {number|string} period - Period number
     * @returns {string} Formatted period string
     */
    formatPeriod(period) {
        if (!period) return '';

        const periodNum = parseInt(period);
        if (periodNum <= 4) {
            const ordinals = ['', '1st', '2nd', '3rd', '4th'];
            return `${ordinals[periodNum]} Qtr`;
        }

        // Overtime
        const otNum = periodNum - 4;
        if (otNum === 1) return 'OT';
        return `${otNum}OT`;
    }

    /**
     * Get status info with football-specific formatting
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

        // Check for end of quarter
        if (status.type?.name === 'STATUS_END_PERIOD') {
            const period = status.period || 1;
            return {
                className: 'scoreboard__clock--halftime',
                time: `End ${this.formatPeriod(period)}`,
                period: ''
            };
        }

        return super.getStatusInfo();
    }

    /**
     * Update possession indicator
     * @param {string} teamAbbr - Team abbreviation with possession
     */
    setPossession(teamAbbr) {
        if (!this.gameData) return;

        this.gameData.possession = teamAbbr;

        // Update possession classes on team panels
        const awayPanel = this.element.querySelector('.scoreboard__team--away');
        const homePanel = this.element.querySelector('.scoreboard__team--home');

        const isAway = teamAbbr === this.gameData.away?.abbr ||
                       teamAbbr === this.gameData.away?.id;

        if (awayPanel) {
            awayPanel.classList.toggle('scoreboard__team--possession', isAway);
        }
        if (homePanel) {
            homePanel.classList.toggle('scoreboard__team--possession', !isAway);
        }

        // Re-render situation wrapper if visible (includes position and color updates)
        if (this.gameData.state?.toLowerCase() === 'in' && this.config.variant !== 'compact') {
            const situationWrapper = this.element.querySelector('.scoreboard__situation-wrapper');
            if (situationWrapper) {
                situationWrapper.outerHTML = this.renderSituation();
            }
        }
    }

    /**
     * Update down and distance
     * @param {number} down - Current down
     * @param {number|string} distance - Distance to first down
     * @param {number} yardLine - Current yard line
     */
    setDownDistance(down, distance, yardLine) {
        if (!this.gameData) return;

        this.gameData.situation = {
            ...this.gameData.situation,
            down,
            distance,
            yardLine,
            isRedZone: yardLine <= 20
        };

        // Re-render situation wrapper if visible
        if (this.gameData.state?.toLowerCase() === 'in' && this.config.variant !== 'compact') {
            const situationWrapper = this.element.querySelector('.scoreboard__situation-wrapper');
            if (situationWrapper) {
                situationWrapper.outerHTML = this.renderSituation();
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

export default FootballScoreboard;
