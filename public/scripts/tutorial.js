/**
 * GridTV Sports - First-Time User Tutorial
 * A guided tour teaching users how to use the application
 */

class GridTVTutorial {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.overlay = null;
    this.tooltip = null;
    this.spotlight = null;
    this.clickIndicator = null;
    this.resizeTimeout = null;

    // Tutorial steps configuration
    this.steps = [
      {
        id: 'welcome',
        type: 'welcome',
        icon: '👋',
        title: 'Welcome to GridTV Sports!',
        content: `
          <p>Watch <strong>multiple live games</strong> at once with real-time scores from NFL, NBA, MLB, NHL and college sports.</p>
          <p style="margin-top: 10px; opacity: 0.8;">Quick tour - less than 30 seconds!</p>
        `,
        showBack: false,
        nextText: "Let's Go!"
      },
      {
        id: 'nfl-card',
        type: 'highlight',
        target: '.sport-card.nfl',
        icon: '🏈',
        title: 'League Cards',
        content: `
          <p>Click any <strong>league card</strong> to see live games, scores, and schedules.</p>
          <p>Each league page includes a <span class="highlight">Sports Bar Mode</span> button to watch multiple games at once.</p>
        `,
        position: 'bottom',
        showBack: true,
        nextText: 'Next'
      },
      {
        id: 'mixed-sports-bar',
        type: 'highlight',
        target: '.mixed-sports-btn',
        icon: '📺',
        title: 'Mixed Sports Bar Mode',
        content: `
          <p><strong>Watch games from different sports together!</strong></p>
          <p>Mix NFL, NBA, MLB, and NHL games on one screen - up to 8 games at once.</p>
        `,
        position: 'top',
        showBack: true,
        nextText: 'Next'
      },
      {
        id: 'user-menu',
        type: 'highlight',
        target: '.user-menu',
        icon: '👤',
        title: 'Account Menu',
        content: `
          <p>Click your avatar to access:</p>
          <p>• Edit profile & manage subscription<br>• Set favorite teams<br>• Restart this tutorial</p>
        `,
        position: 'bottom',
        showBack: true,
        nextText: 'Next'
      },
      {
        id: 'complete',
        type: 'welcome',
        icon: '🎉',
        title: "You're All Set!",
        content: `
          <p>Click a league to see today's games, or try <strong>Mixed Sports Bar Mode</strong> for the ultimate multi-game experience!</p>
          <p style="margin-top: 10px; opacity: 0.8;">You can restart this tutorial anytime from your account menu.</p>
        `,
        showBack: true,
        nextText: 'Start Watching',
        isLast: true
      }
    ];

    this.init();
  }

  init() {
    // Create DOM elements
    this.createOverlay();
    this.createTooltip();
    this.createSpotlight();
    this.createClickIndicator();

    // Bind methods
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'tutorial-overlay';
    this.overlay.id = 'tutorialOverlay';
    // Ensure hidden by default (in case CSS doesn't load)
    this.overlay.style.display = 'none';
    document.body.appendChild(this.overlay);
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tutorial-tooltip';
    this.tooltip.id = 'tutorialTooltip';
    // Ensure hidden by default (in case CSS doesn't load)
    this.tooltip.style.display = 'none';
    document.body.appendChild(this.tooltip);
  }

  createSpotlight() {
    this.spotlight = document.createElement('div');
    this.spotlight.className = 'tutorial-spotlight';
    this.spotlight.id = 'tutorialSpotlight';
    // Ensure hidden by default
    this.spotlight.style.display = 'none';
    document.body.appendChild(this.spotlight);
  }

  createClickIndicator() {
    this.clickIndicator = document.createElement('div');
    this.clickIndicator.className = 'tutorial-click-indicator';
    this.clickIndicator.id = 'tutorialClickIndicator';
    this.clickIndicator.innerHTML = '👆';
    this.clickIndicator.style.display = 'none';
    document.body.appendChild(this.clickIndicator);
  }

  // Check if user has completed tutorial
  static hasCompletedTutorial() {
    return localStorage.getItem('gridtv-tutorial-completed') === 'true';
  }

  // Mark tutorial as completed
  static markCompleted() {
    localStorage.setItem('gridtv-tutorial-completed', 'true');
  }

  // Reset tutorial (for restart)
  static reset() {
    localStorage.removeItem('gridtv-tutorial-completed');
  }

  // Start the tutorial
  start() {
    if (this.isActive) return;

    this.isActive = true;
    this.currentStep = 0;
    document.body.classList.add('tutorial-active');

    // Show the tutorial elements
    this.overlay.style.display = 'block';
    this.tooltip.style.display = 'block';

    // Add event listeners
    document.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('resize', this.handleResize);

    // Show first step
    this.showStep(0);
  }

  // Stop the tutorial
  stop() {
    this.isActive = false;
    document.body.classList.remove('tutorial-active');

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('resize', this.handleResize);

    // Hide all elements
    this.overlay.style.display = 'none';
    this.overlay.classList.remove('active');
    this.tooltip.style.display = 'none';
    this.tooltip.classList.remove('active');
    this.spotlight.style.display = 'none';
    this.clickIndicator.style.display = 'none';

    // Remove any interactive classes
    document.querySelectorAll('.tutorial-interactive').forEach(el => {
      el.classList.remove('tutorial-interactive');
    });
  }

  // Show a specific step
  showStep(index) {
    if (index < 0 || index >= this.steps.length) return;

    this.currentStep = index;
    const step = this.steps[index];

    // Remove previous interactive elements
    document.querySelectorAll('.tutorial-interactive').forEach(el => {
      el.classList.remove('tutorial-interactive');
    });

    // Update tooltip content
    this.updateTooltipContent(step);

    // Position based on step type
    if (step.type === 'welcome' || step.type === 'info') {
      this.showCenteredTooltip(step);
    } else if (step.type === 'highlight') {
      this.showHighlightedStep(step);
    }

    // Show overlay
    this.overlay.classList.add('active');

    // Animate tooltip in
    setTimeout(() => {
      this.tooltip.classList.add('active');
    }, 100);
  }

  updateTooltipContent(step) {
    const totalSteps = this.steps.length;
    const progressDots = this.steps.map((_, i) => {
      let className = 'tutorial-progress-dot';
      if (i === this.currentStep) className += ' active';
      else if (i < this.currentStep) className += ' completed';
      return `<div class="${className}"></div>`;
    }).join('');

    this.tooltip.innerHTML = `
      <div class="tutorial-header">
        <span class="tutorial-icon">${step.icon}</span>
        <span class="tutorial-title">${step.title}</span>
        ${step.type !== 'welcome' ? `<span class="tutorial-step-counter">${this.currentStep + 1} / ${totalSteps}</span>` : ''}
      </div>
      <div class="tutorial-content">
        ${step.content}
      </div>
      <div class="tutorial-actions">
        <button class="tutorial-btn tutorial-btn-skip" onclick="window.gridTVTutorial.skip()">
          Skip Tour
        </button>
        ${step.showBack ? `
          <button class="tutorial-btn tutorial-btn-back" onclick="window.gridTVTutorial.prev()">
            ← Back
          </button>
        ` : ''}
        <button class="tutorial-btn ${step.isLast ? 'tutorial-btn-finish' : (this.currentStep === 0 ? 'tutorial-btn-start' : 'tutorial-btn-next')}"
                onclick="window.gridTVTutorial.${step.isLast ? 'complete' : 'next'}()">
          ${step.nextText || 'Next'} ${!step.isLast ? '→' : ''}
        </button>
      </div>
      <div class="tutorial-progress">
        ${progressDots}
      </div>
    `;
  }

  showCenteredTooltip(step) {
    // Hide spotlight for centered dialogs
    this.spotlight.style.display = 'none';
    this.clickIndicator.style.display = 'none';

    // Center the tooltip
    this.tooltip.className = 'tutorial-tooltip welcome';
    this.tooltip.style.top = '50%';
    this.tooltip.style.left = '50%';
    this.tooltip.style.right = 'auto';
    this.tooltip.style.bottom = 'auto';
  }

  showHighlightedStep(step) {
    const target = step.targetIndex !== undefined
      ? document.querySelectorAll(step.target)[step.targetIndex]
      : document.querySelector(step.target);

    if (!target) {
      console.warn(`Tutorial target not found: ${step.target}`);
      this.next();
      return;
    }

    // Make target interactive
    target.classList.add('tutorial-interactive');

    // Position spotlight
    const rect = target.getBoundingClientRect();
    const padding = 12;

    this.spotlight.style.display = 'block';
    this.spotlight.style.top = `${rect.top - padding}px`;
    this.spotlight.style.left = `${rect.left - padding}px`;
    this.spotlight.style.width = `${rect.width + padding * 2}px`;
    this.spotlight.style.height = `${rect.height + padding * 2}px`;
    this.spotlight.classList.add('pulse');

    // Position tooltip relative to target
    this.positionTooltip(rect, step.position || 'bottom');
  }

  positionTooltip(targetRect, position) {
    const tooltip = this.tooltip;
    const margin = 15;

    // Reset all positioning
    tooltip.className = 'tutorial-tooltip';
    tooltip.style.top = 'auto';
    tooltip.style.left = 'auto';
    tooltip.style.right = 'auto';
    tooltip.style.bottom = 'auto';
    tooltip.style.transform = 'none';

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Get tooltip dimensions after content is set
    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'block';
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = Math.min(tooltipRect.width, 380);
    const tooltipHeight = tooltipRect.height;
    tooltip.style.visibility = 'visible';

    // Calculate center of target
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    // Determine best position based on available space
    const spaceAbove = targetRect.top;
    const spaceBelow = viewportHeight - targetRect.bottom;
    const spaceLeft = targetRect.left;
    const spaceRight = viewportWidth - targetRect.right;

    let finalPosition = position;

    // Auto-adjust if specified position doesn't have enough space
    if (position === 'bottom' && spaceBelow < tooltipHeight + margin) {
      finalPosition = 'top';
    } else if (position === 'top' && spaceAbove < tooltipHeight + margin) {
      finalPosition = 'bottom';
    }

    // Calculate tooltip position
    let top, left;

    switch (finalPosition) {
      case 'top':
        top = targetRect.top - tooltipHeight - margin;
        left = targetCenterX - tooltipWidth / 2;
        tooltip.classList.add('arrow-bottom');
        break;

      case 'bottom':
      default:
        top = targetRect.bottom + margin;
        left = targetCenterX - tooltipWidth / 2;
        tooltip.classList.add('arrow-top');
        break;

      case 'left':
        top = targetCenterY - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - margin;
        tooltip.classList.add('arrow-right');
        break;

      case 'right':
        top = targetCenterY - tooltipHeight / 2;
        left = targetRect.right + margin;
        tooltip.classList.add('arrow-left');
        break;

      case 'bottom-left':
        top = targetRect.bottom + margin;
        left = viewportWidth - tooltipWidth - margin;
        tooltip.classList.add('arrow-top');
        break;
    }

    // Constrain to viewport
    left = Math.max(margin, Math.min(left, viewportWidth - tooltipWidth - margin));
    top = Math.max(margin, Math.min(top, viewportHeight - tooltipHeight - margin));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.maxWidth = `${Math.min(380, viewportWidth - margin * 2)}px`;

    // Position the arrow to point at target center
    const arrowOffset = targetCenterX - left;
    tooltip.style.setProperty('--arrow-left', `${Math.max(20, Math.min(arrowOffset, tooltipWidth - 20))}px`);
  }

  // Navigation methods
  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.tooltip.classList.remove('active');
      setTimeout(() => {
        this.showStep(this.currentStep + 1);
      }, 200);
    }
  }

  prev() {
    if (this.currentStep > 0) {
      this.tooltip.classList.remove('active');
      setTimeout(() => {
        this.showStep(this.currentStep - 1);
      }, 200);
    }
  }

  skip() {
    GridTVTutorial.markCompleted();
    this.stop();
  }

  complete() {
    GridTVTutorial.markCompleted();
    this.stop();
  }

  // Event handlers
  handleKeydown(e) {
    if (!this.isActive) return;

    switch (e.key) {
      case 'Escape':
        this.skip();
        break;
      case 'ArrowRight':
      case 'Enter':
        if (this.steps[this.currentStep].isLast) {
          this.complete();
        } else {
          this.next();
        }
        break;
      case 'ArrowLeft':
        this.prev();
        break;
    }
  }

  handleResize() {
    if (!this.isActive) return;

    // Debounce resize handling to avoid excessive recalculations
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      // Ensure tooltip stays visible during resize
      this.tooltip.style.display = 'block';

      // Reposition current step based on type
      const step = this.steps[this.currentStep];
      if (step.type === 'highlight') {
        this.showHighlightedStep(step);
      } else if (step.type === 'welcome' || step.type === 'info') {
        this.showCenteredTooltip(step);
      }

      // Ensure tooltip is still active/visible
      this.tooltip.classList.add('active');
    }, 50);
  }
}

// Initialize tutorial when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.gridTVTutorial = new GridTVTutorial();
});

// Auto-start tutorial for first-time users after auth check
function checkAndStartTutorial() {
  // Wait a bit for the page to fully load and auth to complete
  setTimeout(() => {
    // Check if user menu is visible (user is logged in)
    const userMenu = document.getElementById('userMenu');
    if (userMenu && userMenu.style.display !== 'none') {
      // Check if this is first time
      if (!GridTVTutorial.hasCompletedTutorial()) {
        // Check if this is the first login (just registered)
        const isFirstLogin = localStorage.getItem('gridtv-first-login') === 'true';
        if (isFirstLogin) {
          localStorage.removeItem('gridtv-first-login');
          window.gridTVTutorial.start();
        }
      }
    }
  }, 1000);
}

// Export for use in other scripts
window.GridTVTutorial = GridTVTutorial;
window.checkAndStartTutorial = checkAndStartTutorial;
