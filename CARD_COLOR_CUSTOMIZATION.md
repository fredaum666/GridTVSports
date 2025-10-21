# Card Color Customization Guide

## Overview
All card colors (regular cards and fullscreen Sports Bar Mode cards) are now fully customizable through intuitive CSS variables in `themes.css`. Simply edit the variable values to instantly change colors across all pages!

## 📍 Where to Edit
**File:** `/public/styles/themes.css`

Look for the sections marked with:
```css
/* ====================================
   CARD COLORS - Easy to customize!
   ==================================== */
```

## 🎨 Available Color Variables

### Regular Game Cards

#### Card Container
```css
--card-bg: #color                /* Card background */
--card-border: #color            /* Card border */
--card-border-hover: #color      /* Border on hover */
--card-shadow: 0 4px 12px...     /* Card shadow */
--card-shadow-hover: 0 6px...    /* Shadow on hover */
```

#### Card Text
```css
--card-team-name: #color         /* Team name color */
--card-score: #color             /* Score color */
--card-status: #color            /* Game status text */
--card-time: #color              /* Game time text */
```

#### Winning Team
```css
--card-winning-name: #color      /* Winning team name */
--card-winning-score: #color     /* Winning team score */
--card-winning-glow: rgba(...)   /* Glow effect */
```

#### Live Games
```css
--card-live-indicator: #color    /* Live dot/badge */
--card-live-text: #color         /* "LIVE" text */
--card-live-glow: rgba(...)      /* Live glow effect */
```

### Fullscreen Cards (Sports Bar Mode)

#### Fullscreen Container
```css
--fullscreen-card-bg: #color     /* Fullscreen card background */
--fullscreen-card-border: #color /* Fullscreen card border */
--fullscreen-card-shadow: 0...   /* Fullscreen card shadow */
```

#### Fullscreen Text
```css
--fullscreen-team-name: #color   /* Team name in fullscreen */
--fullscreen-score: #color       /* Score in fullscreen */
--fullscreen-status: #color      /* Quarter/period/inning */
--fullscreen-vs: #color          /* "VS" separator */
--fullscreen-record: #color      /* Win-loss record */
```

#### Fullscreen Winning
```css
--fullscreen-winning-name: #color   /* Winning team name */
--fullscreen-winning-score: #color  /* Winning team score */
```

#### Fullscreen Special
```css
--fullscreen-possession: #color     /* Possession indicator (football) */
--fullscreen-live: #color           /* Live game indicator */
--fullscreen-timeout-bar: rgba(...) /* Timeout bar (filled) */
--fullscreen-timeout-used: trans... /* Timeout bar (used) */
--fullscreen-timeout-border: rgba() /* Timeout bar border */
```

## 💡 How to Customize

### Example 1: Change Card Background Color

**Default Dark Theme:**
```css
body[data-theme="default"] {
  /* Find this variable */
  --card-bg: linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%);
  
  /* Change to solid color */
  --card-bg: #1a1f2e;
  
  /* Or different gradient */
  --card-bg: linear-gradient(135deg, #0a0e1a 0%, #1e293b 100%);
}
```

**Apple UI Theme:**
```css
body[data-theme="apple"] {
  /* Find this variable */
  --card-bg: #ffffff;
  
  /* Change to light gray */
  --card-bg: #f5f5f7;
}
```

### Example 2: Change Winning Team Color

**Make winning teams blue instead of green:**
```css
body[data-theme="default"] {
  /* From green */
  --card-winning-name: #22c55e;
  --card-winning-score: #22c55e;
  
  /* To blue */
  --card-winning-name: #3b82f6;
  --card-winning-score: #3b82f6;
}
```

### Example 3: Change Live Indicator Color

**Make live indicators orange instead of red:**
```css
body[data-theme="default"] {
  /* From red */
  --card-live-indicator: #ef4444;
  --card-live-text: #ef4444;
  
  /* To orange */
  --card-live-indicator: #f97316;
  --card-live-text: #f97316;
}
```

### Example 4: Change All Team Names

**Make team names brighter:**
```css
body[data-theme="default"] {
  /* Regular cards */
  --card-team-name: #ffffff;  /* Pure white */
  
  /* Fullscreen cards */
  --fullscreen-team-name: #ffffff;  /* Pure white */
}
```

### Example 5: Custom Timeout Bar Colors

**Apple theme with colored timeouts:**
```css
body[data-theme="apple"] {
  /* From gray */
  --fullscreen-timeout-bar: rgba(0, 0, 0, 0.8);
  --fullscreen-timeout-border: rgba(0, 0, 0, 0.6);
  
  /* To blue */
  --fullscreen-timeout-bar: rgba(0, 102, 204, 0.9);
  --fullscreen-timeout-border: rgba(0, 102, 204, 1);
}
```

## 🔄 Both Themes at Once

To keep themes consistent, edit both:

```css
/* Default Dark Theme */
body[data-theme="default"] {
  --card-winning-name: #22c55e;  /* Green */
  --card-live-indicator: #ef4444; /* Red */
}

/* Apple UI Theme */
body[data-theme="apple"] {
  --card-winning-name: #34c759;  /* Apple Green */
  --card-live-indicator: #ff3b30; /* Apple Red */
}
```

## 📋 Quick Reference Table

| Element | Default Dark | Apple UI | Purpose |
|---------|--------------|----------|---------|
| **Regular Cards** |
| Card BG | Gradient | White | Card background |
| Team Name | #e0e0e0 | #2c2c2e | Team display name |
| Score | #e0e0e0 | #2c2c2e | Score numbers |
| Winning | #22c55e | #34c759 | Winning team |
| Live | #ef4444 | #ff3b30 | Live games |
| **Fullscreen Cards** |
| Card BG | Gradient | White | Fullscreen background |
| Team Name | #e0e0e0 | #2c2c2e | Team name |
| Score | #e0e0e0 | #2c2c2e | Score numbers |
| VS | #64748b | #6e6e73 | VS separator |
| Winning | #22c55e | #34c759 | Winning team |
| Live | #ef4444 | #ff3b30 | Live indicator |
| Possession | #fbbf24 | #ff9500 | Has ball (NFL) |
| Timeout Bar | white | gray | Timeout indicator |

## 🎯 Common Customizations

### High Contrast Mode
```css
body[data-theme="default"] {
  --card-team-name: #ffffff;  /* Pure white */
  --card-score: #ffffff;
  --card-winning-name: #00ff00; /* Bright green */
  --card-live-indicator: #ff0000; /* Bright red */
}
```

### Pastel Theme
```css
body[data-theme="apple"] {
  --card-bg: #fefcff;
  --card-team-name: #4a5568;
  --card-winning-name: #81c784; /* Soft green */
  --card-live-indicator: #e57373; /* Soft red */
}
```

### Neon Theme
```css
body[data-theme="default"] {
  --card-bg: #0a0a0a;
  --card-border: #00ffff;
  --card-team-name: #00ffff;
  --card-winning-name: #39ff14; /* Neon green */
  --card-live-indicator: #ff073a; /* Neon red */
}
```

### Team Color Theme (Example: Lakers)
```css
body[data-theme="default"] {
  --card-bg: linear-gradient(135deg, #552583 0%, #FDB927 100%); /* Purple & Gold */
  --card-team-name: #FDB927;
  --card-score: #ffffff;
  --card-winning-name: #FDB927;
}
```

## 🛠️ Testing Your Changes

1. **Save the file** after editing CSS variables
2. **Refresh the browser** (Ctrl+F5 or Cmd+Shift+R)
3. **Switch themes** using the dropdown to see both
4. **Check all pages:**
   - Main dashboard (index.html)
   - MLB, NFL, NBA, NHL pages
   - Mixed Sports page (LiveGames.html)
   - Sports Bar Mode (fullscreen)

## ⚠️ Important Notes

### Color Format
CSS variables accept any valid CSS color:
```css
--card-bg: #ffffff;                /* Hex */
--card-bg: rgb(255, 255, 255);    /* RGB */
--card-bg: rgba(255, 255, 255, 0.9); /* RGBA */
--card-bg: hsl(0, 0%, 100%);      /* HSL */
--card-bg: white;                  /* Named color */
--card-bg: linear-gradient(...);   /* Gradient */
```

### Transparency
For glows and subtle effects, use rgba():
```css
--card-winning-glow: rgba(34, 197, 94, 0.3);
/* rgba(red, green, blue, opacity) */
```

### Gradients
For card backgrounds:
```css
--card-bg: linear-gradient(135deg, #color1 0%, #color2 100%);
/* 135deg = diagonal, adjust colors as needed */
```

## 📱 Applies Across All Devices

Changes apply to:
- ✅ Desktop (all screen sizes)
- ✅ Tablets
- ✅ Mobile phones
- ✅ All browsers

## 🔍 Finding Elements

If you're not sure which variable controls an element:

1. **Open browser DevTools** (F12)
2. **Inspect the element** (right-click → Inspect)
3. **Look for the CSS variable** in the Styles panel
4. **Search themes.css** for that variable name

## 🚀 Creating New Themes

To add a third theme:

1. **Copy the Default theme section**
2. **Rename to your theme:** `body[data-theme="mytheme"]`
3. **Change all color values**
4. **Add option to theme selector** in HTML files
5. **Update theme-manager.js** to recognize new theme

Example:
```css
/* My Custom Theme */
body[data-theme="oceanic"] {
  --card-bg: #1a2332;
  --card-team-name: #88c0d0;
  --card-winning-name: #81a1c1;
  --card-live-indicator: #bf616a;
  /* ...etc */
}
```

## 💾 Backup Before Editing

Always keep a backup:
```bash
cp themes.css themes.css.backup
```

Then edit freely! You can always restore if needed.

## Summary

**It's this easy:**
1. Open `/public/styles/themes.css`
2. Find the "CARD COLORS" section
3. Change color values
4. Save and refresh
5. Done! ✨

All colors update automatically across:
- All league pages (MLB, NFL, NBA, NHL)
- Mixed Sports page
- Sports Bar Mode (fullscreen)
- Regular and fullscreen cards
- All text elements
- All special indicators

**No HTML changes needed!** Just CSS variables. 🎨
