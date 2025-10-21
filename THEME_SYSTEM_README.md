# GridTV Sports - Theme System Implementation

## 🎨 Overview
A comprehensive theme system has been implemented across the entire GridTV Sports application, allowing users to switch between different visual styles seamlessly.

## ✅ Implemented Features

### 1. Theme Files Created
- **`/public/styles/themes.css`** - Central theme stylesheet with CSS variables
- **`/public/scripts/theme-manager.js`** - JavaScript theme management system

### 2. Available Themes

#### Default Dark Theme
- Dark blue/gray background (#0a0e1a)
- Current existing style
- Sports-focused with vibrant accents
- High contrast for visibility

#### Apple UI Theme
- Light, clean background (#f5f5f7)
- Apple-inspired design language
- Subtle shadows and borders
- SF Pro-like typography feel
- Glassmorphism effects
- Smooth animations

### 3. Theme System Features

**Persistent Selection:**
- Theme choice saved in localStorage
- Automatically applied on page load
- Syncs across all pages

**Smooth Transitions:**
- 0.3s transitions for color changes
- No jarring switches
- Professional feel

**CSS Variables:**
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--border-primary`, `--border-hover`
- `--accent-blue`, `--accent-green`, `--accent-yellow`, `--accent-red`
- `--shadow-sm`, `--shadow-md`, `--shadow-lg`

### 4. Pages Updated

✅ **index.html** - Main homepage with theme selector
✅ **mlb.html** - MLB live games page
✅ **nfl.html** - NFL live games page
✅ **nba.html** - NBA live games page
✅ **nhl.html** - NHL live games page
✅ **LiveGames.html** - Mixed Sports Bar Mode page

### 5. Theme Selector Placement

**Main Page (index.html):**
- Below "Mixed Sports Bar Mode" button
- Centered with emoji icon
- Full dropdown styling

**Sport Pages:**
- Top right header
- Next to Sports Bar Mode button
- Compact dropdown

## 🎯 Apple UI Theme Characteristics

### Visual Changes:
1. **Background**: Light gradient (#f5f5f7 → #ffffff)
2. **Cards**: Pure white with subtle shadows
3. **Typography**: Lighter weight, better letter spacing
4. **Borders**: Thin, light gray (#d2d2d7)
5. **Shadows**: Softer, more refined
6. **Buttons**: Rounded corners (12px), minimal shadows
7. **Hover Effects**: Subtle scale (1.02x)
8. **Accents**: Apple blue (#0071e3), green (#30d158)

### Design Principles:
- Minimalism and clarity
- Emphasis on content
- Subtle depth through shadows
- High-quality blur effects (backdrop-filter)
- Smooth, natural animations

## 💻 Technical Implementation

### Theme Manager API:
```javascript
// Get current theme
ThemeManager.getCurrentTheme();

// Set theme
ThemeManager.setTheme('apple');

// Toggle themes (for testing)
ThemeManager.toggle();
```

### HTML Structure:
```html
<link rel="stylesheet" href="/styles/themes.css">
<script src="/scripts/theme-manager.js"></script>

<select id="theme-select" class="theme-select">
  <option value="default">Default Dark</option>
  <option value="apple">Apple UI</option>
</select>
```

### CSS Usage:
```css
body[data-theme="default"] {
  --bg-primary: #0a0e1a;
  /* ... */
}

body[data-theme="apple"] {
  --bg-primary: #f5f5f7;
  /* ... */
}

/* Use variables in components */
background: var(--bg-primary);
color: var(--text-primary);
```

## 🚀 How to Use

### For Users:
1. Select theme from dropdown on any page
2. Theme automatically saves and persists
3. All pages reflect the chosen theme

### For Developers:
1. All theme CSS is in `/styles/themes.css`
2. Use CSS variables for any new components
3. Test in both themes before deploying
4. Follow the existing pattern for new themes

## 📝 Adding New Themes

To add a new theme:

1. Add theme definition in `themes.css`:
```css
body[data-theme="newtheme"] {
  --bg-primary: #yourcolor;
  /* ... define all variables */
}
```

2. Add specific overrides if needed:
```css
body[data-theme="newtheme"] .component {
  /* specific styling */
}
```

3. Add option to all theme selectors:
```html
<option value="newtheme">New Theme</option>
```

## 🎨 Theme Variable Reference

### Background Colors:
- `--bg-primary`: Main page background
- `--bg-secondary`: Card/panel backgrounds
- `--bg-tertiary`: Nested elements
- `--bg-card`: Game card background

### Text Colors:
- `--text-primary`: Main text color
- `--text-secondary`: Secondary/muted text
- `--text-muted`: Very subtle text

### Border Colors:
- `--border-primary`: Default borders
- `--border-hover`: Hover state borders

### Accent Colors:
- `--accent-blue`: Blue accent (#17a2b8 / #0071e3)
- `--accent-green`: Green accent (#22c55e / #30d158)
- `--accent-yellow`: Yellow accent (#fbbf24 / #ffcc00)
- `--accent-red`: Red accent (#ef4444 / #ff3b30)
- `--accent-purple`: Purple accent (#a855f7 / #bf5af2)

### Shadows:
- `--shadow-sm`: Small shadow for subtle depth
- `--shadow-md`: Medium shadow for cards
- `--shadow-lg`: Large shadow for modals

### Special:
- `--header-bg`: Header background
- `--card-hover-scale`: Scale factor on hover

## ✨ Benefits

1. **User Choice**: Users can pick their preferred visual style
2. **Consistency**: Same theme across entire application
3. **Maintainability**: Central theme management
4. **Extensibility**: Easy to add new themes
5. **Professional**: Modern design patterns
6. **Accessibility**: Both light and dark options

## 🔮 Future Enhancements

Potential additions:
- More theme options (Dark OLED, High Contrast, etc.)
- Per-sport color schemes
- Custom theme builder
- Time-based auto-switching
- Team color themes
- Accessibility-focused themes
