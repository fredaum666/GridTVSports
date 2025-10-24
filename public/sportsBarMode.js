/**
 * Unified Sports Bar Mode Component
 * Handles both mixed sports and league-specific sports bar modes
 */

class SportsBarMode {
    constructor(options = {}) {
        this.mode = options.mode || 'mixed'; // 'mixed' or 'league'
        this.sport = options.sport || null; // 'nfl', 'nba', 'mlb', 'nhl' for league mode
        this.games = [];
        this.gridLayout = 1;
        this.gridGames = {};
        this.fullscreenActive = false;
        this.updateInterval = null;
    }

    /**
     * Get shared CSS styles
     */
    getStyles() {
        return `
            .sports-bar-button {
                background: var(--accent-blue);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 12px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: var(--shadow-md);
                transition: all 0.3s ease;
                margin: 20px auto;
                display: block;
            }

            .sports-bar-button:hover {
                background: var(--btn-sports-bar-hover);
                transform: translateY(-2px);
                box-shadow: var(--shadow-lg);
            }

            .sports-bar-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }

            .sports-bar-modal.active {
                display: flex;
            }

            .modal-content {
                background: var(--bg-secondary);
                border: 1px solid var(--border-primary);
                border-radius: 20px;
                padding: 40px;
                max-width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
            }

            .modal-header h2 {
                margin: 0;
                color: var(--text-primary);
                font-size: 28px;
            }

            .close-modal {
                background: none;
                border: none;
                font-size: 32px;
                cursor: pointer;
                color: var(--text-secondary);
                transition: color 0.3s;
            }

            .close-modal:hover {
                color: var(--text-primary);
            }

            .layout-options {
                display: flex;
                gap: 15px;
                margin-bottom: 30px;
                flex-wrap: wrap;
            }

            .layout-option {
                flex: 1;
                min-width: 100px;
            }

            .layout-option input[type="radio"] {
                display: none;
            }

            .layout-option label {
                display: block;
                padding: 15px;
                border: 2px solid var(--border-primary);
                border-radius: 10px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
                font-weight: 600;
                background: var(--bg-tertiary);
                color: var(--text-primary);
            }

            .layout-option input[type="radio"]:checked + label {
                background: var(--accent-blue);
                color: white;
                border-color: var(--accent-blue);
            }

            .grid-preview {
                display: grid;
                gap: 20px;
                margin-bottom: 30px;
                min-height: 200px;
            }

            .grid-preview.layout-1 {
                grid-template-columns: 1fr;
            }

            .grid-preview.layout-2 {
                grid-template-columns: repeat(2, 1fr);
            }

            .grid-preview.layout-4 {
                grid-template-columns: repeat(2, 1fr);
            }

            .grid-preview.layout-6 {
                grid-template-columns: repeat(3, 1fr);
            }

            .grid-slot {
                border: 2px dashed var(--border-primary);
                border-radius: 10px;
                padding: 20px;
                min-height: 100px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                background: var(--bg-tertiary);
            }

            .game-selector {
                width: 100%;
                padding: 10px;
                border: 2px solid var(--border-primary);
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: border-color 0.3s;
                background: var(--bg-secondary);
                color: var(--text-primary);
            }

            .game-selector:focus {
                outline: none;
                border-color: var(--accent-blue);
            }

            .enter-fullscreen-btn {
                background: var(--accent-blue);
                color: white;
                border: none;
                padding: 15px 40px;
                border-radius: 10px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
                transition: all 0.3s;
            }

            .enter-fullscreen-btn:hover:not(:disabled) {
                background: var(--btn-modal-primary-hover);
                transform: translateY(-2px);
                box-shadow: var(--shadow-lg);
            }

            .enter-fullscreen-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .fullscreen-grid {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: var(--bg-primary);
                z-index: 2000;
                display: none;
                padding: 20px;
                box-sizing: border-box;
            }

            .fullscreen-grid.active {
                display: grid;
                gap: 20px;
            }

            .fullscreen-grid.layout-1 {
                grid-template-columns: 1fr;
            }

            .fullscreen-grid.layout-2 {
                grid-template-columns: repeat(2, 1fr);
            }

            .fullscreen-grid.layout-4 {
                grid-template-columns: repeat(2, 1fr);
                grid-template-rows: repeat(2, 1fr);
            }

            .fullscreen-grid.layout-6 {
                grid-template-columns: repeat(3, 1fr);
                grid-template-rows: repeat(2, 1fr);
            }

            .game-card {
                background: var(--fullscreen-card-bg);
                border: 2px solid var(--fullscreen-card-border);
                border-radius: 15px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                color: var(--text-primary);
                position: relative;
                overflow: hidden;
                box-shadow: var(--fullscreen-card-shadow);
            }

            .game-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: var(--accent-blue);
            }

            .game-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .game-status {
                font-size: 14px;
                font-weight: 600;
                padding: 6px 12px;
                border-radius: 20px;
                background: var(--bg-tertiary);
                color: var(--fullscreen-status);
            }

            .game-status.live {
                background: var(--card-live-indicator);
                color: white;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            .teams-container {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 15px;
            }

            .team-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: var(--bg-tertiary);
                border-radius: 10px;
            }

            .team-info {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .team-logo {
                width: 40px;
                height: 40px;
                object-fit: contain;
            }

            .team-name {
                font-size: 18px;
                font-weight: 600;
                color: var(--fullscreen-team-name);
            }

            .team-row.winning .team-name {
                color: var(--fullscreen-winning-name);
            }

            .team-score {
                font-size: 32px;
                font-weight: 700;
                min-width: 60px;
                text-align: right;
                color: var(--fullscreen-score);
            }

            .team-row.winning .team-score {
                color: var(--fullscreen-winning-score);
            }

            .game-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid var(--border-primary);
            }

            .game-time {
                font-size: 14px;
                opacity: 0.8;
                color: var(--fullscreen-status);
            }

            .sport-badge {
                font-size: 12px;
                font-weight: 600;
                padding: 4px 10px;
                border-radius: 12px;
                background: var(--accent-blue);
                color: white;
                text-transform: uppercase;
            }

            .empty-slot {
                background: var(--bg-tertiary);
                border: 2px dashed var(--border-primary);
                border-radius: 15px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 20px;
            }

            .empty-slot-logo {
                width: 80px;
                height: 80px;
                opacity: 0.3;
            }

            .exit-fullscreen {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--accent-red);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                z-index: 2001;
                transition: all 0.3s;
            }

            .exit-fullscreen:hover {
                opacity: 0.9;
                transform: scale(1.05);
            }

            @media (max-width: 768px) {
                .fullscreen-grid.layout-2,
                .fullscreen-grid.layout-4,
                .fullscreen-grid.layout-6 {
                    grid-template-columns: 1fr;
                }

                .grid-preview.layout-2,
                .grid-preview.layout-4,
                .grid-preview.layout-6 {
                    grid-template-columns: 1fr;
                }
            }
        `;
    }

    /**
     * Get modal HTML structure
     */
    getModalHTML() {
        return `
            <div id="sportsBarModal" class="sports-bar-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>⚡ Sports Bar Mode</h2>
                        <button class="close-modal" onclick="sportsBarMode.closeModal()">&times;</button>
                    </div>

                    <div class="layout-options">
                        <div class="layout-option">
                            <input type="radio" id="layout1" name="layout" value="1" checked>
                            <label for="layout1">1 Game</label>
                        </div>
                        <div class="layout-option">
                            <input type="radio" id="layout2" name="layout" value="2">
                            <label for="layout2">2 Games</label>
                        </div>
                        <div class="layout-option">
                            <input type="radio" id="layout4" name="layout" value="4">
                            <label for="layout4">4 Games</label>
                        </div>
                        <div class="layout-option">
                            <input type="radio" id="layout6" name="layout" value="6">
                            <label for="layout6">6 Games</label>
                        </div>
                    </div>

                    <div id="gridPreview" class="grid-preview layout-1"></div>

                    <button id="enterFullscreen" class="enter-fullscreen-btn" disabled>
                        Enter Sports Bar Mode
                    </button>
                </div>
            </div>

            <div id="fullscreenGrid" class="fullscreen-grid layout-1"></div>
        `;
    }

    /**
     * Initialize the sports bar mode
     */
    init() {
        // Inject styles
        const styleElement = document.createElement('style');
        styleElement.textContent = this.getStyles();
        document.head.appendChild(styleElement);

        // Inject modal HTML
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = this.getModalHTML();
        document.body.appendChild(modalContainer);

        // Attach event listeners
        this.attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Layout radio buttons
        document.querySelectorAll('input[name="layout"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.gridLayout = parseInt(e.target.value);
                this.renderGridPreview();
            });
        });

        // Enter fullscreen button
        document.getElementById('enterFullscreen')?.addEventListener('click', () => {
            this.enterFullscreen();
        });
    }

    /**
     * Set games data
     */
    setGames(games) {
        this.games = games;
    }

    /**
     * Open the modal
     */
    openModal() {
        this.gridGames = {};
        this.gridLayout = 1;
        document.getElementById('sportsBarModal').classList.add('active');
        this.renderGridPreview();
    }

    /**
     * Close the modal
     */
    closeModal() {
        document.getElementById('sportsBarModal').classList.remove('active');
    }

    /**
     * Render the grid preview with game selectors
     */
    renderGridPreview() {
        const preview = document.getElementById('gridPreview');
        preview.className = `grid-preview layout-${this.gridLayout}`;
        preview.innerHTML = '';

        for (let i = 0; i < this.gridLayout; i++) {
            const slot = document.createElement('div');
            slot.className = 'grid-slot';

            const label = document.createElement('div');
            label.textContent = `Slot ${i + 1}`;
            label.style.marginBottom = '10px';
            label.style.fontWeight = '600';

            const selector = document.createElement('select');
            selector.className = 'game-selector';
            selector.dataset.slot = i;

            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Select Game --';
            selector.appendChild(defaultOption);

            // Add games to selector
            this.games.forEach(game => {
                const option = document.createElement('option');
                option.value = game.id;
                option.textContent = this.getGameDisplayText(game);
                selector.appendChild(option);
            });

            selector.addEventListener('change', (e) => {
                const slotIndex = parseInt(e.target.dataset.slot);
                const gameId = e.target.value;

                if (gameId) {
                    this.gridGames[slotIndex] = gameId;
                } else {
                    delete this.gridGames[slotIndex];
                }

                this.updateAllGameSelectors();
                this.checkAllSlotsSelected();
            });

            // Restore selection if exists
            if (this.gridGames[i]) {
                selector.value = this.gridGames[i];
            }

            slot.appendChild(label);
            slot.appendChild(selector);
            preview.appendChild(slot);
        }

        this.checkAllSlotsSelected();
    }

    /**
     * Get display text for a game
     */
    getGameDisplayText(game) {
        const away = game.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away');
        const home = game.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home');
        const awayTeam = away?.team?.abbreviation || 'TBD';
        const homeTeam = home?.team?.abbreviation || 'TBD';

        let text = `${awayTeam} @ ${homeTeam}`;

        if (this.mode === 'mixed' && game.sport) {
            text += ` (${game.sport.toUpperCase()})`;
        }

        return text;
    }

    /**
     * Update all game selectors to prevent duplicate selections
     */
    updateAllGameSelectors() {
        const selectedGameIds = Object.values(this.gridGames);

        document.querySelectorAll('.game-selector').forEach(selector => {
            const currentValue = selector.value;

            Array.from(selector.options).forEach(option => {
                if (option.value && option.value !== currentValue) {
                    option.disabled = selectedGameIds.includes(option.value);
                }
            });
        });
    }

    /**
     * Check if all slots have games selected
     */
    checkAllSlotsSelected() {
        const allSelected = Object.keys(this.gridGames).length === this.gridLayout;
        document.getElementById('enterFullscreen').disabled = !allSelected;
    }

    /**
     * Enter fullscreen mode
     */
    enterFullscreen() {
        this.closeModal();

        const fullscreenGrid = document.getElementById('fullscreenGrid');
        fullscreenGrid.className = `fullscreen-grid layout-${this.gridLayout} active`;

        // Add exit button
        let exitBtn = document.querySelector('.exit-fullscreen');
        if (!exitBtn) {
            exitBtn = document.createElement('button');
            exitBtn.className = 'exit-fullscreen';
            exitBtn.textContent = '✕ Exit';
            exitBtn.onclick = () => this.exitFullscreen();
            document.body.appendChild(exitBtn);
        }
        exitBtn.style.display = 'block';

        this.fullscreenActive = true;
        this.renderFullscreenGames();

        // Start auto-update
        this.startAutoUpdate();
    }

    /**
     * Exit fullscreen mode
     */
    exitFullscreen() {
        document.getElementById('fullscreenGrid').classList.remove('active');
        document.querySelector('.exit-fullscreen').style.display = 'none';
        this.fullscreenActive = false;
        this.stopAutoUpdate();
    }

    /**
     * Render games in fullscreen grid
     */
    renderFullscreenGames() {
        const fullscreenGrid = document.getElementById('fullscreenGrid');
        fullscreenGrid.innerHTML = '';

        for (let i = 0; i < this.gridLayout; i++) {
            const gameId = this.gridGames[i];
            const game = this.games.find(g => g.id === gameId);

            if (game) {
                const gameCard = this.createGameCard(game, i);
                fullscreenGrid.appendChild(gameCard);
            } else {
                const emptyCard = this.createEmptySlot(i);
                fullscreenGrid.appendChild(emptyCard);
            }
        }
    }

    /**
     * Create a game card
     */
    createGameCard(game, slotIndex) {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.dataset.slot = slotIndex;

        const competition = game.competitions?.[0];
        const status = competition?.status;
        const competitors = competition?.competitors || [];

        const away = competitors.find(c => c.homeAway === 'away');
        const home = competitors.find(c => c.homeAway === 'home');

        // Status
        const isLive = status?.type?.state === 'in';
        const statusClass = isLive ? 'live' : '';
        const statusText = isLive ?
            `${status.type.shortDetail}` :
            status?.type?.shortDetail || 'Scheduled';

        // Header
        const header = document.createElement('div');
        header.className = 'game-header';
        header.innerHTML = `
            <div class="game-status ${statusClass}">${statusText}</div>
            ${this.mode === 'mixed' && game.sport ? `<div class="sport-badge">${game.sport}</div>` : ''}
        `;
        card.appendChild(header);

        // Teams
        const teamsContainer = document.createElement('div');
        teamsContainer.className = 'teams-container';

        // Determine winning team
        const awayScore = parseInt(away?.score) || 0;
        const homeScore = parseInt(home?.score) || 0;
        const awayWinning = awayScore > homeScore;
        const homeWinning = homeScore > awayScore;

        // Away team
        const awayRow = document.createElement('div');
        awayRow.className = `team-row ${awayWinning ? 'winning' : ''}`;
        awayRow.innerHTML = `
            <div class="team-info">
                <img src="${away?.team?.logo}" alt="${away?.team?.abbreviation}" class="team-logo">
                <div class="team-name">${away?.team?.abbreviation || 'TBD'}</div>
            </div>
            <div class="team-score">${away?.score || '0'}</div>
        `;
        teamsContainer.appendChild(awayRow);

        // Home team
        const homeRow = document.createElement('div');
        homeRow.className = `team-row ${homeWinning ? 'winning' : ''}`;
        homeRow.innerHTML = `
            <div class="team-info">
                <img src="${home?.team?.logo}" alt="${home?.team?.abbreviation}" class="team-logo">
                <div class="team-name">${home?.team?.abbreviation || 'TBD'}</div>
            </div>
            <div class="team-score">${home?.score || '0'}</div>
        `;
        teamsContainer.appendChild(homeRow);

        card.appendChild(teamsContainer);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'game-footer';
        footer.innerHTML = `
            <div class="game-time">${this.formatGameTime(game)}</div>
        `;
        card.appendChild(footer);

        return card;
    }

    /**
     * Create empty slot card
     */
    createEmptySlot(slotIndex) {
        const card = document.createElement('div');
        card.className = 'empty-slot';
        card.dataset.slot = slotIndex;

        // Get logo based on mode
        let logoSrc = '/images/logo.png';
        if (this.mode === 'league' && this.sport) {
            const logos = {
                'nfl': '/images/nfl-logo.png',
                'nba': '/images/nba-logo.png',
                'mlb': '/images/mlb-logo.png',
                'nhl': '/images/nhl-logo.png'
            };
            logoSrc = logos[this.sport] || logoSrc;
        }

        card.innerHTML = `
            <img src="${logoSrc}" alt="Logo" class="empty-slot-logo">
            <select class="game-selector" data-slot="${slotIndex}">
                <option value="">-- Select Game --</option>
            </select>
        `;

        // Populate selector
        const selector = card.querySelector('.game-selector');
        this.games.forEach(game => {
            const option = document.createElement('option');
            option.value = game.id;
            option.textContent = this.getGameDisplayText(game);
            selector.appendChild(option);
        });

        // Add change listener
        selector.addEventListener('change', (e) => {
            const gameId = e.target.value;
            if (gameId) {
                this.gridGames[slotIndex] = gameId;
                this.renderFullscreenGames();
            }
        });

        return card;
    }

    /**
     * Format game time
     */
    formatGameTime(game) {
        const date = new Date(game.date);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    /**
     * Update scores in fullscreen mode
     */
    async updateScores() {
        if (!this.fullscreenActive) return;

        // This will be implemented by the page that uses this component
        // by calling setGames() with fresh data
        this.renderFullscreenGames();
    }

    /**
     * Start auto-update interval
     */
    startAutoUpdate() {
        this.stopAutoUpdate();
        this.updateInterval = setInterval(() => {
            if (this.fullscreenActive) {
                // Trigger custom event for parent to refresh data
                window.dispatchEvent(new CustomEvent('sportsBarUpdateNeeded'));
            }
        }, 15000); // 15 seconds
    }

    /**
     * Stop auto-update interval
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// Initialize global instance
let sportsBarMode = null;

/**
 * Initialize sports bar mode
 * @param {Object} options - Configuration options
 * @param {string} options.mode - 'mixed' or 'league'
 * @param {string} options.sport - Sport type for league mode ('nfl', 'nba', 'mlb', 'nhl')
 * @returns {SportsBarMode} Instance of SportsBarMode
 */
function initSportsBarMode(options = {}) {
    sportsBarMode = new SportsBarMode(options);
    sportsBarMode.init();
    return sportsBarMode;
}
