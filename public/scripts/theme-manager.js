/* ====================================
   GRIDTV SPORTS - THEME MANAGER
   ==================================== */

// Theme Manager
const ThemeManager = {
  STORAGE_KEY: 'gridtv-theme',
  DEFAULT_THEME: 'default',
  
  // Get current theme from localStorage or default
  getCurrentTheme() {
    return localStorage.getItem(this.STORAGE_KEY) || this.DEFAULT_THEME;
  },
  
  // Set and apply theme
  setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.updateThemeSelector(theme);
    console.log(`🎨 Theme changed to: ${theme}`);
  },
  
  // Initialize theme on page load
  init() {
    const savedTheme = this.getCurrentTheme();
    this.setTheme(savedTheme);
    
    // Load and apply custom colors
    this.loadCustomColors();
    
    // Setup theme selector if it exists
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = savedTheme;
      themeSelect.addEventListener('change', (e) => {
        this.setTheme(e.target.value);
      });
    }
  },
  
  // Load and apply custom colors
  loadCustomColors() {
    const customColors = localStorage.getItem('gridtv-custom-colors');
    if (customColors) {
      try {
        const colors = JSON.parse(customColors);
        let totalColors = 0;
        
        // Apply all custom colors
        Object.values(colors).forEach(sportColors => {
          Object.entries(sportColors).forEach(([variable, color]) => {
            document.documentElement.style.setProperty(variable, color);
            document.body.style.setProperty(variable, color);
            totalColors++;
          });
        });
        
        const currentTheme = this.getCurrentTheme();
        const themeName = currentTheme === 'default' ? 'Dark' : 'Light';
        console.log(`🎨 Custom colors loaded (${totalColors} variables)`);
        console.log(`✨ Applied on top of ${themeName} theme`);
      } catch (e) {
        console.error('Failed to load custom colors:', e);
      }
    }
  },
  
  // Update theme selector value
  updateThemeSelector(theme) {
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect && themeSelect.value !== theme) {
      themeSelect.value = theme;
    }
  },
  
  // Toggle between themes (for testing)
  toggle() {
    const current = this.getCurrentTheme();
    const newTheme = current === 'default' ? 'apple' : 'default';
    this.setTheme(newTheme);
  }
};

// Initialize theme when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
  ThemeManager.init();
}

// Expose to global scope for easy access
window.ThemeManager = ThemeManager;
