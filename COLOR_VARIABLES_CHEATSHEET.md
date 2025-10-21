# Card Color Variables - Quick Cheat Sheet

## 📍 Location
**File:** `/public/styles/themes.css`

## 🎨 Complete Variable List

### REGULAR CARDS

```css
/* Container */
--card-bg                    /* Background color/gradient */
--card-border                /* Border color */
--card-border-hover          /* Border color on hover */
--card-shadow                /* Box shadow */
--card-shadow-hover          /* Shadow on hover */

/* Text */
--card-team-name             /* Team names */
--card-score                 /* Score numbers */
--card-status                /* Game status (Q4, Final, etc) */
--card-time                  /* Game time */

/* States */
--card-winning-name          /* Winning team name color */
--card-winning-score         /* Winning team score color */
--card-winning-glow          /* Glow effect for winners */
--card-live-indicator        /* Live badge/dot color */
--card-live-text             /* "LIVE" text color */
--card-live-glow             /* Glow effect for live */
```

### FULLSCREEN CARDS (Sports Bar Mode)

```css
/* Container */
--fullscreen-card-bg         /* Fullscreen background */
--fullscreen-card-border     /* Fullscreen border */
--fullscreen-card-shadow     /* Fullscreen shadow */

/* Text */
--fullscreen-team-name       /* Team names */
--fullscreen-score           /* Score numbers */
--fullscreen-status          /* Quarter/Period/Inning */
--fullscreen-vs              /* "VS" separator */
--fullscreen-record          /* Win-loss record */

/* States */
--fullscreen-winning-name    /* Winning team name */
--fullscreen-winning-score   /* Winning team score */

/* Special Elements */
--fullscreen-possession      /* Ball possession (NFL) */
--fullscreen-live            /* Live game indicator */
--fullscreen-timeout-bar     /* Timeout bar (filled) */
--fullscreen-timeout-used    /* Timeout bar (empty) */
--fullscreen-timeout-border  /* Timeout bar border */
```

## 🔧 Quick Examples

### Change Card Background
```css
body[data-theme="default"] {
  --card-bg: #1a2332;  /* Change this line */
}
```

### Change Winning Team Color
```css
body[data-theme="default"] {
  --card-winning-name: #3b82f6;   /* Blue instead of green */
  --card-winning-score: #3b82f6;
}
```

### Change Live Indicator
```css
body[data-theme="default"] {
  --card-live-indicator: #f97316;  /* Orange instead of red */
}
```

### Make Text Brighter
```css
body[data-theme="default"] {
  --card-team-name: #ffffff;        /* Pure white */
  --fullscreen-team-name: #ffffff;  /* Pure white */
}
```

## 📊 Default Values

### Default Dark Theme
```css
body[data-theme="default"] {
  /* Regular Cards */
  --card-bg: linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%);
  --card-border: #334155;
  --card-team-name: #e0e0e0;
  --card-score: #e0e0e0;
  --card-winning-name: #22c55e;
  --card-live-indicator: #ef4444;
  
  /* Fullscreen Cards */
  --fullscreen-card-bg: linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%);
  --fullscreen-team-name: #e0e0e0;
  --fullscreen-score: #e0e0e0;
  --fullscreen-winning-name: #22c55e;
  --fullscreen-live: #ef4444;
  --fullscreen-possession: #fbbf24;
  --fullscreen-timeout-bar: rgba(255, 255, 255, 0.9);
}
```

### Apple UI Theme
```css
body[data-theme="apple"] {
  /* Regular Cards */
  --card-bg: #ffffff;
  --card-border: rgba(0, 0, 0, 0.1);
  --card-team-name: #2c2c2e;
  --card-score: #2c2c2e;
  --card-winning-name: #34c759;
  --card-live-indicator: #ff3b30;
  
  /* Fullscreen Cards */
  --fullscreen-card-bg: #ffffff;
  --fullscreen-team-name: #2c2c2e;
  --fullscreen-score: #2c2c2e;
  --fullscreen-winning-name: #34c759;
  --fullscreen-live: #ff3b30;
  --fullscreen-possession: #ff9500;
  --fullscreen-timeout-bar: rgba(0, 0, 0, 0.8);
}
```

## ⚡ Most Common Customizations

### 1. Change Card Background
```css
--card-bg: #your-color;
--fullscreen-card-bg: #your-color;
```

### 2. Change Team Name & Score Colors
```css
--card-team-name: #your-color;
--card-score: #your-color;
--fullscreen-team-name: #your-color;
--fullscreen-score: #your-color;
```

### 3. Change Winning Team Color
```css
--card-winning-name: #your-color;
--card-winning-score: #your-color;
--fullscreen-winning-name: #your-color;
--fullscreen-winning-score: #your-color;
```

### 4. Change Live Indicator
```css
--card-live-indicator: #your-color;
--card-live-text: #your-color;
--fullscreen-live: #your-color;
```

### 5. Change Borders
```css
--card-border: #your-color;
--fullscreen-card-border: #your-color;
```

## 🎭 Theme Presets

### High Contrast
```css
--card-team-name: #ffffff;
--card-winning-name: #00ff00;
--card-live-indicator: #ff0000;
```

### Pastel
```css
--card-winning-name: #81c784;
--card-live-indicator: #e57373;
```

### Neon
```css
--card-border: #00ffff;
--card-winning-name: #39ff14;
--card-live-indicator: #ff073a;
```

### Monochrome
```css
--card-team-name: #ffffff;
--card-score: #ffffff;
--card-winning-name: #ffffff;
--card-live-indicator: #ffffff;
```

## 💡 Pro Tips

1. **Keep Regular & Fullscreen Consistent**
   ```css
   --card-winning-name: #22c55e;
   --fullscreen-winning-name: #22c55e;  /* Same color */
   ```

2. **Use Semi-Transparent Glows**
   ```css
   --card-winning-glow: rgba(34, 197, 94, 0.3);  /* 30% opacity */
   ```

3. **Test Both Themes**
   - Edit Default Dark first
   - Then edit Apple UI to match
   - Use theme dropdown to compare

4. **Save Before Major Changes**
   ```bash
   cp themes.css themes.css.backup
   ```

5. **Refresh to See Changes**
   - Ctrl+F5 (Windows/Linux)
   - Cmd+Shift+R (Mac)

## 🔍 Find in File

To quickly find a variable in `themes.css`:

1. Press **Ctrl+F** (Windows/Linux) or **Cmd+F** (Mac)
2. Search for variable name (e.g., `--card-bg`)
3. You'll find it in both theme sections

## ✅ Checklist for Customization

- [ ] Open `/public/styles/themes.css`
- [ ] Find the "CARD COLORS" section
- [ ] Edit Default Dark theme variables
- [ ] Edit Apple UI theme variables  
- [ ] Save the file
- [ ] Refresh browser (Ctrl+F5)
- [ ] Test with theme dropdown
- [ ] Check all pages (MLB, NFL, NBA, NHL, Mixed)
- [ ] Check Sports Bar Mode (fullscreen)
- [ ] Verify regular cards updated
- [ ] Verify fullscreen cards updated

## 📱 Applies To

- ✅ All league pages (MLB, NFL, NBA, NHL)
- ✅ Mixed Sports page (LiveGames.html)
- ✅ Main dashboard (index.html)
- ✅ Regular card view
- ✅ Fullscreen Sports Bar Mode
- ✅ Desktop, tablet, mobile
- ✅ All browsers

## 🆘 Troubleshooting

**Colors not changing?**
- Hard refresh: Ctrl+F5
- Clear browser cache
- Check variable name spelling
- Make sure you're editing the right theme

**Variables not defined?**
- Check you're inside `body[data-theme="..."]`
- Each theme needs ALL variables defined

**Only one theme working?**
- Did you edit both themes?
- Default AND Apple need changes

## 🎯 Quick Reference Summary

| What You Want | Variables to Change |
|---------------|-------------------|
| Card background | `--card-bg`, `--fullscreen-card-bg` |
| Team names | `--card-team-name`, `--fullscreen-team-name` |
| Scores | `--card-score`, `--fullscreen-score` |
| Winning teams | `--card-winning-*`, `--fullscreen-winning-*` |
| Live indicators | `--card-live-*`, `--fullscreen-live` |
| Borders | `--card-border*`, `--fullscreen-card-border` |
| Timeouts | `--fullscreen-timeout-*` |
| Possession | `--fullscreen-possession` |

---

**That's it! Edit one file (`themes.css`), change variables, see results everywhere!** 🎨✨
