/**
 * Mobile Fullscreen Paging System
 * Handles swipeable pages for fullscreen mode on phones
 * Max 2 cards per page, works in portrait and landscape
 */

class MobileFullscreenPaging {
    constructor() {
        this.currentPage = 0;
        this.totalPages = 0;
        this.games = [];
        this.isPhone = window.innerWidth <= 768;
        this.isDragging = false;
        this.startX = 0;
        this.currentTranslate = 0;
        this.prevTranslate = 0;
        this.animationID = 0;
        this.swiped = false;

        // Maximum games allowed (8 games = 4 pages of 2 cards each)
        this.MAX_GAMES = 8;

        this.init();
    }

    init() {
        // Only initialize on phones
        if (!this.isPhone) return;

        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 200);
        });

        // Listen for resize (in case user rotates)
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768 && !this.isPhone) {
                this.isPhone = true;
                this.rebuild();
            } else if (window.innerWidth > 768 && this.isPhone) {
                this.isPhone = false;
                this.destroy();
            }
        });
    }

    /**
     * Setup paging for given games
     * @param {Array} games - Array of game objects
     * @param {HTMLElement} container - Fullscreen container element
     */
    setup(games, container) {
        if (!this.isPhone) return false;

        // Cap games at MAX_GAMES
        this.games = games.slice(0, this.MAX_GAMES);
        this.container = container;

        // Calculate total pages (2 cards per page)
        this.totalPages = Math.ceil(this.games.length / 2);
        this.currentPage = 0;

        // Add mobile-paging class to container
        this.container.classList.add('mobile-paging');

        // Build paging structure
        this.buildPages();
        this.buildPageIndicators();
        // this.buildGameCount(); // Removed - not needed for phone layout
        this.buildSwipeHints();
        this.attachEventListeners();

        return true;
    }

    /**
     * Build page structure
     */
    buildPages() {
        const fullscreenGrid = this.container.querySelector('.fullscreen-grid') ||
                              this.container.querySelector('#fullscreenGrid');

        if (!fullscreenGrid) return;

        // Create pages wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'fullscreen-pages-wrapper';
        wrapper.id = 'pagesWrapper';

        // Store original cards
        const originalCards = Array.from(fullscreenGrid.querySelectorAll('.fullscreen-game-card'));

        // Clear the grid
        fullscreenGrid.innerHTML = '';

        // Create pages
        for (let pageIndex = 0; pageIndex < this.totalPages; pageIndex++) {
            const page = this.createPage(pageIndex, originalCards);
            wrapper.appendChild(page);
        }

        // Add wrapper to grid
        fullscreenGrid.appendChild(wrapper);
    }

    /**
     * Create a single page with up to 2 cards
     */
    createPage(pageIndex, allCards) {
        const page = document.createElement('div');
        page.className = 'fullscreen-page';
        page.dataset.page = pageIndex;

        const grid = document.createElement('div');
        grid.className = 'fullscreen-page-grid';

        // Get cards for this page (2 cards max)
        const startIdx = pageIndex * 2;
        const endIdx = Math.min(startIdx + 2, allCards.length);
        const pageCards = allCards.slice(startIdx, endIdx);

        // Add single-card class if only one card
        if (pageCards.length === 1) {
            grid.classList.add('single-card');
        }

        // Add cards to grid
        pageCards.forEach((card) => {
            const clonedCard = card.cloneNode(true);
            grid.appendChild(clonedCard);
        });

        page.appendChild(grid);
        return page;
    }

    /**
     * Build page indicators (dots)
     */
    buildPageIndicators() {
        // Remove existing indicators
        const existing = document.querySelector('.fullscreen-page-indicators');
        if (existing) existing.remove();

        // Don't show indicators if only one page
        if (this.totalPages <= 1) return;

        const indicators = document.createElement('div');
        indicators.className = 'fullscreen-page-indicators';

        for (let i = 0; i < this.totalPages; i++) {
            const dot = document.createElement('div');
            dot.className = 'page-indicator-dot';
            if (i === 0) dot.classList.add('active');
            dot.setAttribute('aria-label', `Page ${i + 1} of ${this.totalPages}`);
            dot.dataset.page = i;

            // Make indicators tappable
            dot.addEventListener('click', () => this.goToPage(i));

            indicators.appendChild(dot);
        }

        this.container.appendChild(indicators);
    }

    /**
     * Build game count indicator
     */
    buildGameCount() {
        // Remove existing
        const existing = document.querySelector('.fullscreen-game-count');
        if (existing) existing.remove();

        const gameCount = document.createElement('div');
        gameCount.className = 'fullscreen-game-count';
        gameCount.textContent = `${this.games.length} / ${this.MAX_GAMES} Games`;

        this.container.appendChild(gameCount);
    }

    /**
     * Build swipe hints (arrows)
     */
    buildSwipeHints() {
        if (this.totalPages <= 1) return;

        // Right arrow
        const rightHint = document.createElement('div');
        rightHint.className = 'swipe-hint right';
        rightHint.innerHTML = '&rarr;';
        this.container.appendChild(rightHint);
    }

    /**
     * Attach touch/mouse event listeners for swiping
     */
    attachEventListeners() {
        const wrapper = document.getElementById('pagesWrapper');
        if (!wrapper) return;

        // Touch events
        wrapper.addEventListener('touchstart', this.touchStart.bind(this), { passive: true });
        wrapper.addEventListener('touchmove', this.touchMove.bind(this), { passive: false });
        wrapper.addEventListener('touchend', this.touchEnd.bind(this));

        // Mouse events (for testing on desktop)
        wrapper.addEventListener('mousedown', this.touchStart.bind(this));
        wrapper.addEventListener('mousemove', this.touchMove.bind(this));
        wrapper.addEventListener('mouseup', this.touchEnd.bind(this));
        wrapper.addEventListener('mouseleave', this.touchEnd.bind(this));

        // Prevent context menu on long press
        wrapper.addEventListener('contextmenu', (e) => {
            if (this.isDragging) e.preventDefault();
        });
    }

    /**
     * Touch/Mouse start handler
     */
    touchStart(event) {
        if (this.totalPages <= 1) return;

        this.isDragging = true;
        this.startX = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;

        const wrapper = document.getElementById('pagesWrapper');
        wrapper.classList.add('dragging');

        this.animationID = requestAnimationFrame(this.animation.bind(this));
    }

    /**
     * Touch/Mouse move handler
     */
    touchMove(event) {
        if (!this.isDragging) return;

        const currentX = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        const diff = currentX - this.startX;
        this.currentTranslate = this.prevTranslate + diff;

        // Prevent default to stop scrolling
        if (Math.abs(diff) > 10) {
            event.preventDefault();
        }
    }

    /**
     * Touch/Mouse end handler
     */
    touchEnd() {
        if (!this.isDragging) return;

        this.isDragging = false;
        cancelAnimationFrame(this.animationID);

        const wrapper = document.getElementById('pagesWrapper');
        wrapper.classList.remove('dragging');

        const movedBy = this.currentTranslate - this.prevTranslate;

        // Swipe threshold: 50px
        if (movedBy < -50 && this.currentPage < this.totalPages - 1) {
            this.currentPage += 1;
            this.markSwiped();
        }

        if (movedBy > 50 && this.currentPage > 0) {
            this.currentPage -= 1;
            this.markSwiped();
        }

        this.setPositionByPage();
    }

    /**
     * Animation loop for smooth dragging
     */
    animation() {
        const wrapper = document.getElementById('pagesWrapper');
        if (wrapper) {
            wrapper.style.setProperty('transform', `translateX(${this.currentTranslate}px)`, 'important');
        }
        if (this.isDragging) {
            requestAnimationFrame(this.animation.bind(this));
        }
    }

    /**
     * Set position based on current page
     */
    setPositionByPage() {
        this.currentTranslate = this.currentPage * -window.innerWidth;
        this.prevTranslate = this.currentTranslate;

        const wrapper = document.getElementById('pagesWrapper');
        if (wrapper) {
            wrapper.style.setProperty('transform', `translateX(${this.currentTranslate}px)`, 'important');
        }

        this.updatePageIndicators();
    }

    /**
     * Go to specific page
     */
    goToPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= this.totalPages) return;

        this.currentPage = pageIndex;
        this.setPositionByPage();
        this.markSwiped();
    }

    /**
     * Update page indicator dots
     */
    updatePageIndicators() {
        const dots = document.querySelectorAll('.page-indicator-dot');
        dots.forEach((dot, index) => {
            if (index === this.currentPage) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    /**
     * Mark as swiped (hide hints)
     */
    markSwiped() {
        if (!this.swiped) {
            this.swiped = true;
            this.container.classList.add('swiped');
        }
    }

    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        // Rebuild pages with new orientation
        this.container.classList.add('transitioning');

        // Reset position
        this.currentPage = 0;
        this.currentTranslate = 0;
        this.prevTranslate = 0;

        // Rebuild
        this.buildPages();
        this.setPositionByPage();

        setTimeout(() => {
            this.container.classList.remove('transitioning');
        }, 300);
    }

    /**
     * Rebuild entire paging system
     */
    rebuild() {
        if (!this.container || !this.games.length) return;

        this.destroy();
        this.setup(this.games, this.container);
    }

    /**
     * Update cards with new game data (for live updates)
     */
    updateCards(games) {
        if (!this.isPhone) return;

        this.games = games.slice(0, this.MAX_GAMES);

        // Update each page
        const pages = document.querySelectorAll('.fullscreen-page');
        pages.forEach((page, pageIndex) => {
            const startIdx = pageIndex * 2;
            const endIdx = Math.min(startIdx + 2, this.games.length);
            const pageGames = this.games.slice(startIdx, endIdx);

            const cards = page.querySelectorAll('.fullscreen-game-card');
            cards.forEach((card, cardIndex) => {
                if (pageGames[cardIndex]) {
                    // Update card with new game data
                    // This will be called by the main update function
                }
            });
        });
    }

    /**
     * Destroy paging system
     */
    destroy() {
        // Remove event listeners
        const wrapper = document.getElementById('pagesWrapper');
        if (wrapper) {
            wrapper.remove();
        }

        // Remove indicators
        const indicators = document.querySelector('.fullscreen-page-indicators');
        if (indicators) indicators.remove();

        // Remove game count
        const gameCount = document.querySelector('.fullscreen-game-count');
        if (gameCount) gameCount.remove();

        // Remove hints
        const hints = document.querySelectorAll('.swipe-hint');
        hints.forEach(hint => hint.remove());

        // Remove mobile-paging class
        if (this.container) {
            this.container.classList.remove('mobile-paging', 'swiped');
        }

        // Reset state
        this.currentPage = 0;
        this.totalPages = 0;
        this.games = [];
        this.isDragging = false;
        this.swiped = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileFullscreenPaging;
}
