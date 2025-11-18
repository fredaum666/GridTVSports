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
    console.log(`🔄 Switching theme to: ${theme}`);
    
    // CRITICAL: Clear ALL inline styles that might override CSS variables
    document.documentElement.removeAttribute('style');
    document.body.removeAttribute('style');
    
    // Remove any <style> tags that might contain custom colors
    const customStyleTags = document.querySelectorAll('style[data-custom-colors]');
    customStyleTags.forEach(tag => tag.remove());
    
    // Apply the theme via data attribute
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.updateThemeSelector(theme);
    
    console.log(`✅ Theme applied: ${theme}`);
    console.log(`📊 Body data-theme:`, document.body.getAttribute('data-theme'));
    
    // Only apply custom colors if we're in the SAME theme they were created for
    // This prevents custom colors from overriding the new theme
    const customColorsTheme = localStorage.getItem('gridtv-custom-colors-theme');
    if (customColorsTheme === theme) {
      console.log(`🎨 Loading custom colors for ${theme} theme`);
      this.loadCustomColors();
    } else if (customColorsTheme) {
      console.log(`⚠️ Skipping custom colors - they were created for '${customColorsTheme}' theme, not '${theme}'`);
    }
  },
  
  // Initialize theme on page load
  init() {
    // One-time cleanup: Remove custom colors if they're causing issues
    // This fixes the theme switching problem
    const hasCustomColors = localStorage.getItem('gridtv-custom-colors');
    const customColorsTheme = localStorage.getItem('gridtv-custom-colors-theme');
    const currentTheme = this.getCurrentTheme();
    
    if (hasCustomColors && !customColorsTheme) {
      // Old custom colors without theme tracking - remove them
      console.log('🧹 Cleaning up old custom colors...');
      localStorage.removeItem('gridtv-custom-colors');
    }
    
    // Apply the saved theme
    const savedTheme = this.getCurrentTheme();
    this.setTheme(savedTheme);
    
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
