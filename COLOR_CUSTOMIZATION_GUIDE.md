# 🎨 Color Customization System - User Guide

## Overview
The GridTV Sports Color Customization System allows users to personalize every color aspect of their sports viewing experience. Users can customize colors for each sport individually, with changes applied in real-time across all pages.

## Features

### ✨ Key Capabilities
- **Sport-Specific Customization**: Customize NFL, NBA, NHL, and MLB independently
- **Dual Preview System**: See changes in both regular cards and fullscreen (Sports Bar Mode)
- **Real-Time Updates**: Colors update instantly as you change them
- **Persistent Storage**: All customizations are saved to browser localStorage
- **Export/Import**: Save and share your color schemes
- **Reset Function**: Return to default theme colors anytime

## How to Use

### 1. Access the Customization Page
- From the home page, click the **"🎨 Customize Colors"** button (located below the theme selector)
- Or navigate directly to `/customize-colors.html`

### 2. Select a Sport
- Choose from the dropdown: NFL, NBA, NHL, or MLB
- The page will display preview cards and all available color options

### 3. Customize Colors
- Click on any color swatch to open the color picker
- Choose your desired color
- Changes apply instantly to the preview cards
- Customize both regular cards and fullscreen cards

### 4. Save Your Changes
- Click **"💾 Save Changes"** to persist your customizations
- Colors are saved to browser localStorage
- Changes apply across all pages automatically

### 5. Preview on Live Page
- Click **"👁️ Preview on Live Page"** to open the actual sport page in a new tab
- See your customizations in action with real game data

## Available Color Options

### NFL Customization
**Regular Card Colors:**
- Card Background & Border
- Team Names & Scores
- Winning Team Highlights
- Game Status & Live Indicators
- Down & Distance, Yard Line
- Possession Indicator
- Quarter Labels & Scores
- Timeouts

**Fullscreen Colors:**
- All regular card options
- Fullscreen-specific layouts
- VS text styling
- Quarter display
- Possession indicators

### NBA Customization
**Regular Card Colors:**
- Card Background & Border
- Team Names & Scores
- Winning Team Highlights
- Game Status & Live Indicators
- Fouls & Turnovers
- Quarter Display
- Assists, Rebounds, Blocks, Steals

**Fullscreen Colors:**
- All regular card options
- Fullscreen-specific layouts
- VS text styling
- Quarter display
- All stat displays

### NHL Customization
**Regular Card Colors:**
- Card Background & Border
- Team Names & Scores
- Winning Team Highlights
- Game Status & Live Indicators
- Period Labels & Scores
- Period Clock
- Shots on Goal
- Power Play & Penalty Indicators

**Fullscreen Colors:**
- All regular card options
- Fullscreen-specific layouts
- VS text styling
- Period display
- All stat displays

### MLB Customization
**Regular Card Colors:**
- Card Background & Border
- Team Names & Scores
- Winning Team Highlights
- Game Status & Live Indicators
- Balls & Strikes Count
- Outs Display
- Runners on Base
- Inning Labels & Scores
- Pitcher & Batter Info

**Fullscreen Colors:**
- All regular card options
- Fullscreen-specific layouts
- VS text styling
- Inning display
- All stat displays

## Advanced Features

### Export Colors
1. Click **"Export Colors"**
2. A JSON file will be downloaded with all your customizations
3. Share this file with others or keep as backup

### Import Colors
1. Click **"Import Colors"**
2. Select a previously exported JSON file
3. All colors will be applied and saved
4. Page will reload to show changes

### Reset to Defaults
1. Click **"Reset to Defaults"**
2. Confirm the action
3. All customizations for the selected sport will be removed
4. Page reloads to apply theme defaults

## Technical Details

### Storage
- **Location**: Browser localStorage
- **Key**: `gridtv-custom-colors`
- **Format**: JSON object with sport-specific color mappings
- **Persistence**: Colors persist across sessions until cleared

### Color Format
- Colors are stored as HEX values (#RRGGBB)
- Supports all standard CSS color formats
- Gradients and rgba values are converted to HEX where possible

### CSS Variables
All customizations use CSS custom properties (variables):
- `--card-*` for regular game cards
- `--fullscreen-*` for Sports Bar Mode
- Sport-specific variables (e.g., `--card-down-distance`, `--fullscreen-shots`)

### Browser Compatibility
- Modern browsers with localStorage support
- CSS custom properties support required
- Color input type support required

## Tips & Best Practices

### Color Selection
- **Contrast**: Ensure good contrast between text and backgrounds
- **Consistency**: Use similar color schemes across sports for coherent experience
- **Readability**: Test colors with the live preview feature
- **Accessibility**: Consider color-blind friendly palettes

### Performance
- Color changes apply instantly with no page reload
- Minimal performance impact
- Stored colors load on page initialization

### Sharing
- Export your color scheme to share with friends
- Import popular color schemes from the community
- Keep backups before major changes

### Troubleshooting
- **Colors not saving**: Check browser localStorage is enabled
- **Colors not applying**: Try clearing cache and reloading
- **Import fails**: Verify JSON file format is correct
- **Reset issues**: Clear localStorage manually if needed

## Example Workflows

### Creating a Dark Mode NFL Theme
1. Select NFL from dropdown
2. Set Card Background to `#000000`
3. Set Team Names to `#ffffff`
4. Set Down & Distance to `#ffd700` (gold)
5. Set Winning Team to `#00ff00` (bright green)
6. Save changes

### Creating a Light Mode MLB Theme
1. Select MLB from dropdown
2. Set Card Background to `#ffffff`
3. Set Team Names to `#000000`
4. Set Balls & Strikes to `#0066cc` (blue)
5. Set Outs to `#ff0000` (red)
6. Set Runners On to `#00cc00` (green)
7. Save changes

### Team-Specific Colors
1. Choose your favorite team's colors
2. Set Winning Team colors to match team colors
3. Set accents (yard line, shots, etc.) to team secondary colors
4. Export for backup

## Future Enhancements (Potential)
- Pre-made color themes
- Team-based color presets
- Community color scheme sharing
- Dark/Light mode detection
- More granular control options

## Support
For issues or questions:
- Check browser console for error messages
- Verify localStorage is enabled
- Try resetting to defaults
- Clear browser cache if problems persist

---

**Version**: 1.0  
**Last Updated**: October 2025  
**Compatibility**: All modern browsers with ES6+ support
