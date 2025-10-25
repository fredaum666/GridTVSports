/* ====================================
   GRIDTV SPORTS - COLOR CUSTOMIZER
   ==================================== */

const ColorCustomizer = {
  currentSport: null,
  customColors: {},
  
  // Storage key
  STORAGE_KEY: 'gridtv-custom-colors',
  
  // Color definitions for each sport
  colorDefinitions: {
    nfl: {
      regular: {
        'Card Background': '--card-bg',
        'Card Border': '--card-border',
        'Team Name': '--card-team-name',
        'Score': '--card-score',
        'Winning Team Name': '--card-winning-name',
        'Winning Score': '--card-winning-score',
        'Game Status': '--card-status',
        'Live Indicator': '--card-live-indicator',
        'Quarter Clock': '--card-quarter-clock',
        'Down & Distance': '--card-down-distance',
        'Yard Line': '--card-yard-line',
        'Quarter Label': '--card-quarter-label',
        'Quarter Score': '--card-quarter-score',
        'Timeouts': '--card-timeouts'
      },
      fullscreen: {
        'Card Background': '--fullscreen-card-bg',
        'Card Border': '--fullscreen-card-border',
        'Team Name': '--fullscreen-team-name',
        'Score': '--fullscreen-score',
        'Winning Team Name': '--fullscreen-winning-name',
        'Winning Score': '--fullscreen-winning-score',
        'Game Status': '--fullscreen-status',
        'VS Text': '--fullscreen-vs',
        'Live Indicator': '--fullscreen-live',
        'Down & Distance': '--fullscreen-down-distance',
        'Yard Line': '--fullscreen-yard-line',
        'Quarter': '--fullscreen-quarter',
        'Timeouts': '--fullscreen-timeouts'
      }
    },
    nba: {
      regular: {
        'Card Background': '--card-bg',
        'Card Border': '--card-border',
        'Team Name': '--card-team-name',
        'Score': '--card-score',
        'Winning Team Name': '--card-winning-name',
        'Winning Score': '--card-winning-score',
        'Game Status': '--card-status',
        'Quarter & Time': '--card-quarter-clock',
        'Live Indicator': '--card-live-indicator',
        'Fouls': '--card-fouls',
        'Turnovers': '--card-turnovers',
        'Quarter': '--card-quarter-nba',
        'Assists': '--card-assists',
        'Rebounds': '--card-rebounds',
        'Blocks': '--card-blocks',
        'Steals': '--card-steals'
      },
      fullscreen: {
        'Card Background': '--fullscreen-card-bg',
        'Card Border': '--fullscreen-card-border',
        'Team Name': '--fullscreen-team-name',
        'Score': '--fullscreen-score',
        'Winning Team Name': '--fullscreen-winning-name',
        'Winning Score': '--fullscreen-winning-score',
        'Game Status': '--fullscreen-status',
        'VS Text': '--fullscreen-vs',
        'Live Indicator': '--fullscreen-live',
        'Fouls': '--fullscreen-fouls',
        'Turnovers': '--fullscreen-turnovers',
        'Quarter': '--fullscreen-quarter-nba',
        'Assists': '--fullscreen-assists',
        'Rebounds': '--fullscreen-rebounds',
        'Blocks': '--fullscreen-blocks',
        'Steals': '--fullscreen-steals'
      }
    },
    nhl: {
      regular: {
        'Card Background': '--card-bg',
        'Card Border': '--card-border',
        'Team Name': '--card-team-name',
        'Score': '--card-score',
        'Winning Team Name': '--card-winning-name',
        'Winning Score': '--card-winning-score',
        'Game Status': '--card-status',
        'Live Indicator': '--card-live-indicator',
        'Period Label': '--card-period-label',
        'Period Score': '--card-period-score',
        'Period Clock': '--card-period-clock',
        'Shots': '--card-shots',
        'Power Play': '--card-power-play',
        'Penalty': '--card-penalty'
      },
      fullscreen: {
        'Card Background': '--fullscreen-card-bg',
        'Card Border': '--fullscreen-card-border',
        'Team Name': '--fullscreen-team-name',
        'Score': '--fullscreen-score',
        'Winning Team Name': '--fullscreen-winning-name',
        'Winning Score': '--fullscreen-winning-score',
        'Game Status': '--fullscreen-status',
        'VS Text': '--fullscreen-vs',
        'Live Indicator': '--fullscreen-live',
        'Period Label': '--fullscreen-period-label',
        'Period Clock': '--fullscreen-period-clock',
        'Shots': '--fullscreen-shots',
        'Power Play': '--fullscreen-power-play',
        'Penalty': '--fullscreen-penalty'
      }
    },
    mlb: {
      regular: {
        'Card Background': '--card-bg',
        'Card Border': '--card-border',
        'Team Name': '--card-team-name',
        'Score': '--card-score',
        'Winning Team Name': '--card-winning-name',
        'Winning Score': '--card-winning-score',
        'Game Status': '--card-status',
        'Live Indicator': '--card-live-indicator',
        'Balls & Strikes': '--card-balls-strikes',
        'Outs': '--card-outs',
        'Runners On Base': '--card-runners-on',
        'Inning Label': '--card-inning-label',
        'Inning Score': '--card-inning-score',
        'Pitcher': '--card-pitcher',
        'Batter': '--card-batter'
      },
      fullscreen: {
        'Card Background': '--fullscreen-card-bg',
        'Card Border': '--fullscreen-card-border',
        'Team Name': '--fullscreen-team-name',
        'Score': '--fullscreen-score',
        'Winning Team Name': '--fullscreen-winning-name',
        'Winning Score': '--fullscreen-winning-score',
        'Game Status': '--fullscreen-status',
        'VS Text': '--fullscreen-vs',
        'Live Indicator': '--fullscreen-live',
        'Balls & Strikes': '--fullscreen-balls-strikes',
        'Outs': '--fullscreen-outs',
        'Runners On Base': '--fullscreen-runners-on',
        'Inning': '--fullscreen-inning',
        'Pitcher': '--fullscreen-pitcher',
        'Batter': '--fullscreen-batter'
      }
    }
  },

  // Initialize
  init() {
    // Load the current theme from theme-manager (or default to default/dark)
    const currentTheme = document.body.getAttribute('data-theme') || 'default';
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = currentTheme;
    }
    
    this.loadCustomColors();
    this.setupEventListeners();
    
    // Auto-select first sport if user has custom colors
    const sportSelect = document.getElementById('sport-select');
    if (Object.keys(this.customColors).length > 0) {
      const firstSport = Object.keys(this.customColors)[0];
      sportSelect.value = firstSport;
      this.selectSport(firstSport);
    }
  },

  // Setup event listeners
  setupEventListeners() {
    const sportSelect = document.getElementById('sport-select');
    const themeSelect = document.getElementById('theme-select');
    const resetBtn = document.getElementById('reset-btn');
    const saveBtn = document.getElementById('save-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const previewBtn = document.getElementById('preview-btn');

    sportSelect.addEventListener('change', (e) => {
      this.selectSport(e.target.value);
    });

    themeSelect.addEventListener('change', (e) => {
      this.switchBaseTheme(e.target.value);
    });

    resetBtn.addEventListener('click', () => this.resetColors());
    saveBtn.addEventListener('click', () => this.saveColors());
    exportBtn.addEventListener('click', () => this.exportColors());
    importBtn.addEventListener('click', () => this.importColors());
    previewBtn.addEventListener('click', () => this.previewOnLivePage());
  },

  // Select sport
  selectSport(sport) {
    if (!sport) {
      document.getElementById('customization-area').style.display = 'none';
      document.getElementById('placeholder').style.display = 'block';
      return;
    }

    this.currentSport = sport;
    document.getElementById('customization-area').style.display = 'block';
    document.getElementById('placeholder').style.display = 'none';

    // Reapply custom colors for this sport
    if (this.customColors[sport]) {
      Object.entries(this.customColors[sport]).forEach(([variable, color]) => {
        document.documentElement.style.setProperty(variable, color);
        document.body.style.setProperty(variable, color);
        
        // Also apply to preview cards
        const regularCard = document.getElementById('regular-card-preview');
        const fullscreenCard = document.getElementById('fullscreen-card-preview');
        if (regularCard) regularCard.style.setProperty(variable, color);
        if (fullscreenCard) fullscreenCard.style.setProperty(variable, color);
      });
    }

    this.renderColorOptions();
    
    // Small delay to ensure CSS variables are computed
    setTimeout(() => {
      this.updatePreview();
    }, 100);
  },

  // Switch base theme (Dark or Light)
  switchBaseTheme(theme) {
    // Apply the selected theme
    document.body.setAttribute('data-theme', theme);
    
    // Save theme to localStorage so it persists across pages
    localStorage.setItem('gridtv-theme', theme);
    
    const themeName = theme === 'default' ? '🌙 Dark Theme' : '☀️ Light Theme';
    console.log(`🎨 Switched to ${themeName} as baseline`);
    console.log(`💾 Theme saved to localStorage`);
    console.log(`ℹ️ Your custom colors will be applied on top of this theme`);
    console.log(`ℹ️ The original theme remains unchanged`);
    
    // If user has a sport selected, refresh the color options and preview
    if (this.currentSport) {
      // Reapply any custom colors they have
      if (this.customColors[this.currentSport]) {
        Object.entries(this.customColors[this.currentSport]).forEach(([variable, color]) => {
          document.documentElement.style.setProperty(variable, color);
          document.body.style.setProperty(variable, color);
          
          // Also apply to preview cards
          const regularCard = document.getElementById('regular-card-preview');
          const fullscreenCard = document.getElementById('fullscreen-card-preview');
          if (regularCard) regularCard.style.setProperty(variable, color);
          if (fullscreenCard) fullscreenCard.style.setProperty(variable, color);
        });
        console.log(`✅ Reapplied ${Object.keys(this.customColors[this.currentSport]).length} custom colors for ${this.currentSport.toUpperCase()}`);
      }
      
      // Re-render the color options to show the new base theme colors
      this.renderColorOptions();
      
      // Update preview with new theme
      setTimeout(() => {
        this.updatePreview();
      }, 100);
    }
  },

  // Render color options
  renderColorOptions() {
    const regularContainer = document.getElementById('regular-colors');
    const fullscreenContainer = document.getElementById('fullscreen-colors');

    regularContainer.innerHTML = '';
    fullscreenContainer.innerHTML = '';

    const sportColors = this.colorDefinitions[this.currentSport];

    // Regular card colors
    Object.entries(sportColors.regular).forEach(([label, variable]) => {
      regularContainer.appendChild(this.createColorOption(label, variable));
    });

    // Fullscreen card colors
    Object.entries(sportColors.fullscreen).forEach(([label, variable]) => {
      fullscreenContainer.appendChild(this.createColorOption(label, variable));
    });
  },

  // Create color option element
  createColorOption(label, variable) {
    const option = document.createElement('div');
    option.className = 'color-option';

    const currentColor = this.getColorValue(variable);
    const hexColor = this.rgbToHex(currentColor);

    option.innerHTML = `
      <div class="color-picker-wrapper">
        <div class="color-swatch" style="background-color: ${currentColor};" data-variable="${variable}"></div>
        <input type="color" value="${hexColor}" data-variable="${variable}">
      </div>
      <div style="flex: 1;">
        <div class="color-label">${label}</div>
        <div class="color-value">${variable}</div>
        <input type="text" class="hex-input" value="${hexColor}" maxlength="7" placeholder="#000000" style="
          width: 90px;
          padding: 4px 8px;
          margin-top: 5px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          font-weight: 600;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 4px;
          color: var(--text-primary);
          text-transform: uppercase;
        ">
      </div>
    `;

    const colorInput = option.querySelector('input[type="color"]');
    const colorSwatch = option.querySelector('.color-swatch');
    const hexInput = option.querySelector('.hex-input');

    // Update on every input change (real-time as user drags)
    colorInput.addEventListener('input', (e) => {
      const newColor = e.target.value;
      colorSwatch.style.backgroundColor = newColor;
      hexInput.value = newColor.toUpperCase();
      this.updateColor(variable, newColor);
    });

    // Also update when color picker is closed/changed
    colorInput.addEventListener('change', (e) => {
      const newColor = e.target.value;
      colorSwatch.style.backgroundColor = newColor;
      hexInput.value = newColor.toUpperCase();
      this.updateColor(variable, newColor);
    });

    // Update when HEX input is changed
    hexInput.addEventListener('input', (e) => {
      let hex = e.target.value;
      // Auto-add # if user forgets
      if (hex && !hex.startsWith('#')) {
        hex = '#' + hex;
        hexInput.value = hex;
      }
      // Validate hex color (3 or 6 digits after #)
      if (/^#[0-9A-Fa-f]{6}$/.test(hex) || /^#[0-9A-Fa-f]{3}$/.test(hex)) {
        colorInput.value = hex;
        colorSwatch.style.backgroundColor = hex;
        this.updateColor(variable, hex);
      }
    });

    // Format HEX on blur
    hexInput.addEventListener('blur', (e) => {
      let hex = e.target.value;
      if (!hex.startsWith('#')) {
        hex = '#' + hex;
      }
      hexInput.value = hex.toUpperCase();
    });

    colorSwatch.addEventListener('click', () => {
      colorInput.click();
    });

    return option;
  },

  // Get current color value
  getColorValue(variable) {
    // Check if there's a custom color
    if (this.customColors[this.currentSport] && this.customColors[this.currentSport][variable]) {
      return this.customColors[this.currentSport][variable];
    }

    // Get from CSS variables
    const value = getComputedStyle(document.body).getPropertyValue(variable).trim();
    
    // Handle gradients and complex values - extract first color or return a default
    if (value.startsWith('linear-gradient') || value.startsWith('radial-gradient')) {
      // Extract first color from gradient
      const match = value.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\)|rgba\([^)]+\)/);
      if (match) {
        return this.rgbToHex(match[0]);
      }
      return '#1a1f2e'; // Default dark color
    }
    
    return value || '#000000';
  },

  // Update color in real-time
  updateColor(variable, color) {
    // Apply to document root immediately
    document.documentElement.style.setProperty(variable, color);
    
    // Also apply to body for immediate effect
    document.body.style.setProperty(variable, color);
    
    // Apply directly to preview cards
    const regularCard = document.getElementById('regular-card-preview');
    const fullscreenCard = document.getElementById('fullscreen-card-preview');
    if (regularCard) regularCard.style.setProperty(variable, color);
    if (fullscreenCard) fullscreenCard.style.setProperty(variable, color);

    // Store in temporary customColors
    if (!this.customColors[this.currentSport]) {
      this.customColors[this.currentSport] = {};
    }
    this.customColors[this.currentSport][variable] = color;

    // Verify the variable was set
    const verifyValue = getComputedStyle(document.documentElement).getPropertyValue(variable);
    console.log(`🎨 Updated ${variable} to ${color} (verified: ${verifyValue.trim()})`);

    // Force re-render of preview cards to show changes immediately
    this.updatePreview();
  },

  // Convert RGB to Hex
  rgbToHex(rgb) {
    // Already hex
    if (rgb.startsWith('#')) return rgb;
    
    // Handle rgba
    if (rgb.startsWith('rgba')) {
      const values = rgb.match(/[\d.]+/g);
      if (values && values.length >= 3) {
        const r = parseInt(values[0]);
        const g = parseInt(values[1]);
        const b = parseInt(values[2]);
        return '#' + [r, g, b].map(x => {
          const hex = x.toString(16).padStart(2, '0');
          return hex;
        }).join('');
      }
    }
    
    // Handle rgb
    if (rgb.startsWith('rgb')) {
      const values = rgb.match(/\d+/g);
      if (values && values.length >= 3) {
        const r = parseInt(values[0]);
        const g = parseInt(values[1]);
        const b = parseInt(values[2]);
        return '#' + [r, g, b].map(x => {
          const hex = x.toString(16).padStart(2, '0');
          return hex;
        }).join('');
      }
    }

    // Default fallback
    return '#000000';
  },

  // Save colors to localStorage
  saveColors() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.customColors));
    this.applyCustomColors();
    
    const themeSelect = document.getElementById('theme-select');
    const baseTheme = themeSelect ? themeSelect.value : 'default';
    const themeName = baseTheme === 'default' ? 'Dark' : 'Light';
    
    alert(`✅ Custom colors saved!\n\nYour customizations are applied on top of the ${themeName} theme.\nThe original ${themeName} theme remains unchanged.`);
  },

  // Load custom colors from localStorage
  loadCustomColors() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.customColors = JSON.parse(saved);
        this.applyCustomColors();
      } catch (e) {
        console.error('Failed to load custom colors:', e);
      }
    }
  },

  // Apply custom colors to page
  applyCustomColors() {
    Object.values(this.customColors).forEach(sportColors => {
      Object.entries(sportColors).forEach(([variable, color]) => {
        document.documentElement.style.setProperty(variable, color);
        document.body.style.setProperty(variable, color);
        
        // Also apply to preview cards directly
        const regularCard = document.getElementById('regular-card-preview');
        const fullscreenCard = document.getElementById('fullscreen-card-preview');
        if (regularCard) regularCard.style.setProperty(variable, color);
        if (fullscreenCard) fullscreenCard.style.setProperty(variable, color);
      });
    });
    
    // Update preview if a sport is selected
    if (this.currentSport) {
      // Use a small delay to ensure CSS variables are applied
      setTimeout(() => {
        this.updatePreview();
      }, 50);
    }
  },

  // Reset colors to theme defaults
  resetColors() {
    const themeSelect = document.getElementById('theme-select');
    const baseTheme = themeSelect ? themeSelect.value : 'default';
    const themeName = baseTheme === 'default' ? 'Dark' : 'Light';
    
    if (confirm(`Reset ${this.currentSport.toUpperCase()} custom colors?\n\nThis will remove your customizations and return to the ${themeName} theme defaults.\nThe ${themeName} theme itself will not be modified.`)) {
      if (this.customColors[this.currentSport]) {
        delete this.customColors[this.currentSport];
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.customColors));
      
      // Reload page to apply theme defaults
      window.location.reload();
    }
  },

  // Export colors as JSON
  exportColors() {
    const dataStr = JSON.stringify(this.customColors, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gridtv-custom-colors.json';
    link.click();
    
    URL.revokeObjectURL(url);
    alert('✅ Colors exported successfully!');
  },

  // Import colors from JSON
  importColors() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          this.customColors = imported;
          this.saveColors();
          alert('✅ Colors imported successfully! Page will reload.');
          window.location.reload();
        } catch (error) {
          alert('❌ Failed to import colors. Please check the file format.');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    });
    
    input.click();
  },

  // Preview on live page
  previewOnLivePage() {
    const sportPages = {
      nfl: '/nfl.html',
      nba: '/nba.html',
      nhl: '/nhl.html',
      mlb: '/mlb.html'
    };

    if (this.currentSport && sportPages[this.currentSport]) {
      window.open(sportPages[this.currentSport], '_blank');
    }
  },

  // Update preview cards
  updatePreview() {
    const sportPreviews = {
      nfl: {
        regular: this.getNFLRegularCard(),
        regularPage2: this.getNFLRegularCardPage2(),
        fullscreen: this.getNFLFullscreenCard()
      },
      nba: {
        regular: this.getNBARegularCard(),
        fullscreen: this.getNBAFullscreenCard()
      },
      nhl: {
        regular: this.getNHLRegularCard(),
        fullscreen: this.getNHLFullscreenCard()
      },
      mlb: {
        regular: this.getMLBRegularCard(),
        fullscreen: this.getMLBFullscreenCard()
      }
    };

    const preview = sportPreviews[this.currentSport];
    if (!preview) return;

    // Update both card previews
    const regularCard = document.getElementById('regular-card-preview');
    const fullscreenCard = document.getElementById('fullscreen-card-preview');
    const regularCardPage2 = document.getElementById('regular-card-page2-preview');
    
    if (regularCard && fullscreenCard) {
      regularCard.innerHTML = preview.regular;
      fullscreenCard.innerHTML = preview.fullscreen;
      
      // Show/hide page 2 for NFL only
      if (regularCardPage2) {
        if (this.currentSport === 'nfl' && preview.regularPage2) {
          regularCardPage2.innerHTML = preview.regularPage2;
          regularCardPage2.style.display = 'block';
        } else {
          regularCardPage2.style.display = 'none';
        }
      }
      
      // Force browser to recompute styles immediately
      void regularCard.offsetHeight;
      void fullscreenCard.offsetHeight;
      if (regularCardPage2) void regularCardPage2.offsetHeight;
      
      // Use requestAnimationFrame for even smoother updates
      requestAnimationFrame(() => {
        void regularCard.offsetHeight;
        void fullscreenCard.offsetHeight;
        if (regularCardPage2) void regularCardPage2.offsetHeight;
      });
    }
  },

  // NFL Regular Card HTML
  getNFLRegularCard() {
    return `
      <div style="padding: 10px;">
        <div style="text-align: center; margin-bottom: 8px;">
          <div style="display: inline-block; background: var(--card-live-indicator, #ef4444); color: white; padding: 3px 10px; border-radius: 10px; font-size: 9px; font-weight: 700; text-transform: uppercase;">
            <span style="display: inline-block; width: 5px; height: 5px; background: white; border-radius: 50%; margin-right: 4px; animation: blink 1.5s infinite;"></span>LIVE
          </div>
          <div style="color: var(--card-quarter-clock, #9ca3af); font-size: 10px; margin-top: 3px; font-weight: 600;">
            4th - 2:34
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <img src="/assets/NFL-logo.png" alt="MIN" style="width: 50px; height: 50px; object-fit: contain;">
            <div style="font-size: 16px; font-weight: 700; color: var(--card-team-name, #e5e7eb); line-height: 1.1; text-align: center;">MIN</div>
            <div style="font-size: 11px; color: #9ca3af; font-weight: 600; text-align: center;">3-3</div>
          </div>
          <div style="font-size: 48px; font-weight: 700; color: var(--card-score, #e5e7eb); min-width: 60px; text-align: center; line-height: 1;">10</div>
          <div style="font-size: 14px; font-weight: 700; color: #6b7280; padding: 0 4px;">VS</div>
          <div style="font-size: 48px; font-weight: 700; color: var(--card-winning-score, #10b981); min-width: 60px; text-align: center; line-height: 1;">37</div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <div style="position: relative;">
              <img src="/assets/NFL-logo.png" alt="LAC" style="width: 50px; height: 50px; object-fit: contain;">
              <span style="position: absolute; top: -5px; right: -5px; font-size: 20px; line-height: 1; animation: blink 1.5s infinite; filter: drop-shadow(0 0 3px rgba(251, 191, 36, 0.8));">🏈</span>
            </div>
            <div style="font-size: 16px; font-weight: 700; color: var(--card-winning-name, #10b981); line-height: 1.1; text-align: center;">LAC</div>
            <div style="font-size: 11px; color: #9ca3af; font-weight: 600; text-align: center;">4-3</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: center; text-align: center; margin-top: 4px;">
          <span style="font-size: 12px; font-weight: 700; color: var(--card-down-distance, #f59e0b);">2nd & 10 at MIN 45</span>
        </div>
      </div>
    `;
  },

  // NFL Regular Card Page 2 (Quarter Breakdown)
  getNFLRegularCardPage2() {
    return `
      <div style="padding: 15px 10px;">
        <!-- Quarter Header -->
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <div style="flex: 1;"></div>
          <div style="display: flex; gap: 20px; padding-right: 8px;">
            <span style="color: var(--card-quarter-label, #94a3b8); font-size: 11px; font-weight: 600; width: 20px; text-align: center;">1</span>
            <span style="color: var(--card-quarter-label, #94a3b8); font-size: 11px; font-weight: 600; width: 20px; text-align: center;">2</span>
            <span style="color: var(--card-quarter-label, #94a3b8); font-size: 11px; font-weight: 600; width: 20px; text-align: center;">3</span>
            <span style="color: var(--card-quarter-label, #94a3b8); font-size: 11px; font-weight: 600; width: 20px; text-align: center;">4</span>
            <span style="color: var(--card-quarter-label, #94a3b8); font-size: 11px; font-weight: 600; width: 20px; text-align: center;">T</span>
          </div>
        </div>

        <!-- Away Team Row -->
        <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 8px; background: var(--card-bg, rgba(26, 31, 46, 0.6)); border-radius: 8px;">
          <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
            <img src="/assets/NFL-logo.png" alt="MIN" style="width: 30px; height: 30px; object-fit: contain;">
            <span style="color: var(--card-team-name, #e5e7eb); font-size: 13px; font-weight: 600;">MIN</span>
          </div>
          <div style="display: flex; gap: 20px;">
            <span style="color: var(--card-quarter-score, #e0e0e0); font-size: 13px; font-weight: 600; width: 20px; text-align: center;">0</span>
            <span style="color: var(--card-quarter-score, #e0e0e0); font-size: 13px; font-weight: 600; width: 20px; text-align: center;">3</span>
            <span style="color: var(--card-quarter-score, #e0e0e0); font-size: 13px; font-weight: 600; width: 20px; text-align: center;">0</span>
            <span style="color: var(--card-quarter-score, #e0e0e0); font-size: 13px; font-weight: 600; width: 20px; text-align: center;">7</span>
            <span style="color: var(--card-score, #e5e7eb); font-size: 14px; font-weight: 700; width: 20px; text-align: center;">10</span>
          </div>
        </div>

        <!-- Home Team Row (Winning) -->
        <div style="display: flex; align-items: center; padding: 8px; background: var(--card-bg, rgba(26, 31, 46, 0.6)); border-radius: 8px;">
          <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
            <img src="/assets/NFL-logo.png" alt="LAC" style="width: 30px; height: 30px; object-fit: contain;">
            <span style="color: var(--card-winning-name, #10b981); font-size: 13px; font-weight: 600;">LAC</span>
          </div>
          <div style="display: flex; gap: 20px;">
            <span style="color: var(--card-quarter-score, #e0e0e0); font-size: 13px; font-weight: 600; width: 20px; text-align: center;">14</span>
            <span style="color: var(--card-quarter-score, #e0e0e0); font-size: 13px; font-weight: 600; width: 20px; text-align: center;">10</span>
            <span style="color: var(--card-quarter-score, #e0e0e0); font-size: 13px; font-weight: 600; width: 20px; text-align: center;">7</span>
            <span style="color: var(--card-quarter-score, #e0e0e0); font-size: 13px; font-weight: 600; width: 20px; text-align: center;">6</span>
            <span style="color: var(--card-winning-score, #10b981); font-size: 14px; font-weight: 700; width: 20px; text-align: center;">37</span>
          </div>
        </div>
      </div>
    `;
  },

  // NFL Fullscreen Card HTML
  getNFLFullscreenCard() {
    return `
      <div class="fullscreen-quarter">4th - 2:34</div>
      
      <div class="fullscreen-teams">
        <div class="fullscreen-team winning">
          <div class="fullscreen-team-header">
            <div class="fullscreen-team-record">10-2</div>
            <div style="position: relative; display: inline-block;">
              <img src="/assets/NFL-logo.png" alt="Patriots" class="fullscreen-team-logo">
              <span style="position: absolute; top: -8px; right: -8px; font-size: 24px; line-height: 1; animation: blink 1.5s infinite; filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.8));">🏈</span>
            </div>
            <div class="fullscreen-team-name">Patriots</div>
          </div>
          <div class="fullscreen-timeouts">
            <div class="timeout-bar"></div>
            <div class="timeout-bar"></div>
            <div class="timeout-bar used"></div>
          </div>
          <div class="fullscreen-score">24</div>
        </div>

        <div class="fullscreen-vs">VS</div>

        <div class="fullscreen-team">
          <div class="fullscreen-team-header">
            <div class="fullscreen-team-record">9-3</div>
            <img src="/assets/NFL-logo.png" alt="Chiefs" class="fullscreen-team-logo">
            <div class="fullscreen-team-name">Chiefs</div>
          </div>
          <div class="fullscreen-timeouts">
            <div class="timeout-bar"></div>
            <div class="timeout-bar"></div>
            <div class="timeout-bar"></div>
          </div>
          <div class="fullscreen-score">17</div>
        </div>
      </div>

      <div class="fullscreen-down-distance">2nd & 7 at NE 42</div>
    `;
  },

  // NBA Regular Card HTML
  getNBARegularCard() {
    return `
      <div class="game-header">
        <span class="game-status" style="color: var(--card-quarter-clock);">Q3 - 5:21</span>
        <span class="live-badge">
          <span class="live-dot"></span>
          LIVE
        </span>
      </div>
      <div class="teams">
        <div class="team winning">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="/assets/NBA-Logo.png" alt="Lakers" class="team-logo">
            <span class="team-name">Lakers</span>
          </div>
          <span class="team-score">89</span>
        </div>
        <div class="team">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="/assets/NBA-Logo.png" alt="Celtics" class="team-logo">
            <span class="team-name">Celtics</span>
          </div>
          <span class="team-score">76</span>
        </div>
      </div>
      <div class="game-details">
        <span class="detail-item" style="color: var(--card-fouls);">Fouls: 12</span>
        <span class="detail-item" style="color: var(--card-turnovers);">TO: 8</span>
        <span class="detail-item" style="color: var(--card-assists);">Assists: 15</span>
      </div>
    `;
  },

  // NBA Fullscreen Card HTML
  getNBAFullscreenCard() {
    return `
      <div class="fullscreen-quarter">3rd Quarter - 5:21</div>
      
      <div class="fullscreen-teams">
        <div class="fullscreen-team winning">
          <div class="fullscreen-team-header">
            <div class="fullscreen-team-record">25-10</div>
            <img src="/assets/NBA-Logo.png" alt="Lakers" class="fullscreen-team-logo">
            <div class="fullscreen-team-name">Lakers</div>
          </div>
          <div class="fullscreen-score">89</div>
        </div>

        <div class="fullscreen-vs">VS</div>

        <div class="fullscreen-team">
          <div class="fullscreen-team-header">
            <div class="fullscreen-team-record">22-12</div>
            <img src="/assets/NBA-Logo.png" alt="Celtics" class="fullscreen-team-logo">
            <div class="fullscreen-team-name">Celtics</div>
          </div>
          <div class="fullscreen-score">76</div>
        </div>
      </div>

      <div class="fullscreen-status" style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
        <span style="color: var(--fullscreen-fouls);">Fouls: 12</span>
        <span style="color: var(--fullscreen-turnovers);">Turnovers: 8</span>
        <span style="color: var(--fullscreen-assists);">Assists: 15</span>
      </div>
    `;
  },

  // NHL Regular Card HTML
  getNHLRegularCard() {
    return `
      <div class="game-header">
        <span class="game-status" style="color: var(--card-period-clock);">P2 - 12:45</span>
        <span class="live-badge">
          <span class="live-dot"></span>
          LIVE
        </span>
      </div>
      <div class="teams">
        <div class="team winning">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="/assets/NHL-Logo.png" alt="Bruins" class="team-logo">
            <span class="team-name">Bruins</span>
          </div>
          <span class="team-score">3</span>
        </div>
        <div class="team">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="/assets/NHL-Logo.png" alt="Rangers" class="team-logo">
            <span class="team-name">Rangers</span>
          </div>
          <span class="team-score">2</span>
        </div>
      </div>
      <div class="game-details">
        <span class="detail-item" style="color: var(--card-shots);">SOG: 18-15</span>
        <span class="detail-item" style="color: var(--card-power-play);">PP: 1/3</span>
        <span class="detail-item" style="color: var(--card-period-clock);">12:45</span>
      </div>
    `;
  },

  // NHL Fullscreen Card HTML
  getNHLFullscreenCard() {
    return `
      <div class="fullscreen-quarter">2nd Period - 12:45</div>
      
      <div class="fullscreen-teams">
        <div class="fullscreen-team winning">
          <div class="fullscreen-team-header">
            <div class="fullscreen-team-record">28-8-3</div>
            <img src="/assets/NHL-Logo.png" alt="Bruins" class="fullscreen-team-logo">
            <div class="fullscreen-team-name">Bruins</div>
          </div>
          <div class="fullscreen-score">3</div>
        </div>

        <div class="fullscreen-vs">VS</div>

        <div class="fullscreen-team">
          <div class="fullscreen-team-header">
            <div class="fullscreen-team-record">24-11-4</div>
            <img src="/assets/NHL-Logo.png" alt="Rangers" class="fullscreen-team-logo">
            <div class="fullscreen-team-name">Rangers</div>
          </div>
          <div class="fullscreen-score">2</div>
        </div>
      </div>

      <div class="fullscreen-status" style="display: flex; justify-content: center; gap: 15px;">
        <span style="color: var(--fullscreen-shots);">SOG: 18-15</span>
        <span style="color: var(--fullscreen-power-play);">PP: 1/3</span>
      </div>
    `;
  },

  // MLB Regular Card HTML
  getMLBRegularCard() {
    return `
      <div style="padding: 12px;">
        <!-- Game Title/Series Info -->
        <div style="color: var(--card-game-note, #94a3b8); font-size: 11px; font-weight: 600; text-align: center; margin-bottom: 8px; text-transform: uppercase;">
          AL East Division
        </div>
        
        <!-- Score Display -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
          <!-- Away Team -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
              <img src="/assets/MLB-Logo.png" alt="Yankees" style="width: 35px; height: 35px; object-fit: contain;">
              <div style="color: var(--card-team-name, #e5e7eb); font-size: 13px; font-weight: 600;">Yankees</div>
            </div>
            <div style="color: var(--card-winning-score, #10b981); font-size: 32px; font-weight: 700; min-width: 40px; text-align: right;">5</div>
          </div>
          
          <!-- Score Divider -->
          <div style="text-align: center; color: #6b7280; font-size: 14px; font-weight: 700; margin: -4px 0;">-</div>
          
          <!-- Home Team -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="color: var(--card-score, #e5e7eb); font-size: 32px; font-weight: 700; min-width: 40px; text-align: left;">3</div>
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; justify-content: flex-end;">
              <div style="color: var(--card-team-name, #e5e7eb); font-size: 13px; font-weight: 600;">Red Sox</div>
              <img src="/assets/MLB-Logo.png" alt="Red Sox" style="width: 35px; height: 35px; object-fit: contain;">
            </div>
          </div>
        </div>
        
        <!-- Game Status -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="color: var(--card-live-indicator, #ef4444); font-size: 11px; font-weight: 700; background: var(--card-live-indicator, #ef4444); color: white; padding: 3px 8px; border-radius: 10px;">
              <span style="display: inline-block; width: 4px; height: 4px; background: white; border-radius: 50%; margin-right: 4px; animation: blink 1.5s infinite;"></span>LIVE
            </div>
            <div style="color: var(--card-inning, #94a3b8); font-size: 11px; font-weight: 600; margin-left: 6px;">Top 7th</div>
          </div>
          
          <!-- Baseball Diamond -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="40" height="40" viewBox="0 -8 42 50" style="transform: rotate(45deg);">
              <rect x="13" y="-4" width="12" height="12" fill="var(--card-runner-on-base, #fbbf24)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
              <rect x="28" y="20" width="12" height="12" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
              <rect x="0" y="20" width="12" height="12" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
            </svg>
            <div style="display: flex; flex-direction: column; gap: 2px; font-size: 10px; font-weight: 600;">
              <span style="color: var(--card-balls-strikes, #94a3b8);">B:2</span>
              <span style="color: var(--card-balls-strikes, #94a3b8);">S:1</span>
              <span style="color: var(--card-outs, #ef4444);">O:2</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // MLB Fullscreen Card HTML
  getMLBFullscreenCard() {
    return `
      <img src="/assets/MLB-logo.png" alt="MLB" style="position: absolute; top: 10px; left: 10px; width: 35px; height: 35px; opacity: 0.7;">
      
      <!-- Game Title -->
      <div style="color: var(--fullscreen-game-note, #94a3b8); font-size: 14px; font-weight: 700; text-align: center; margin-bottom: 15px; text-transform: uppercase;">
        AL East Division
      </div>
      
      <!-- Inning Display -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 20px;">
        <div style="background: var(--fullscreen-live-indicator, #ef4444); color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
          <span style="display: inline-block; width: 5px; height: 5px; background: white; border-radius: 50%; animation: blink 1.5s infinite;"></span>LIVE
        </div>
        <div style="color: var(--fullscreen-inning, #94a3b8); font-size: 16px; font-weight: 700;">Top 7th</div>
      </div>
      
      <!-- Teams -->
      <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
        <!-- Away Team (Winning) -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="/assets/MLB-Logo.png" alt="Yankees" style="width: 50px; height: 50px; object-fit: contain;">
            <div style="color: var(--fullscreen-winning-name, #10b981); font-size: 22px; font-weight: 700;">Yankees</div>
          </div>
          <div style="color: var(--fullscreen-winning-score, #10b981); font-size: 48px; font-weight: 700;">5</div>
        </div>

        <!-- VS Divider -->
        <div style="text-align: center; color: #6b7280; font-size: 18px; font-weight: 700; margin: -5px 0;">VS</div>

        <!-- Home Team -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 20px;">
          <div style="color: var(--fullscreen-score, #e5e7eb); font-size: 48px; font-weight: 700;">3</div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="color: var(--fullscreen-team-name, #e5e7eb); font-size: 22px; font-weight: 700;">Red Sox</div>
            <img src="/assets/MLB-Logo.png" alt="Red Sox" style="width: 50px; height: 50px; object-fit: contain;">
          </div>
        </div>
      </div>

      <!-- Baseball Status -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-top: 20px;">
        <!-- Diamond -->
        <svg width="50" height="50" viewBox="0 -8 42 50" style="transform: rotate(45deg);">
          <rect x="13" y="-4" width="16" height="16" fill="var(--fullscreen-runner-on-base, #fbbf24)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
          <rect x="28" y="20" width="16" height="16" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
          <rect x="0" y="20" width="16" height="16" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
        </svg>
        
        <!-- Count -->
        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 14px; font-weight: 700;">
          <span style="color: var(--fullscreen-balls-strikes, #94a3b8);">B:2</span>
          <span style="color: var(--fullscreen-balls-strikes, #94a3b8);">S:1</span>
          <span style="color: var(--fullscreen-outs, #ef4444);">O:2</span>
        </div>
      </div>
    `;
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ColorCustomizer.init());
} else {
  ColorCustomizer.init();
}

// Expose to global scope
window.ColorCustomizer = ColorCustomizer;
