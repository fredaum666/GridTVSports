# GridTV Sports - LG webOS TV App

WebView-based wrapper app for LG Smart TVs running webOS.

## Requirements

- **webOS TV SDK** (latest version)
- LG Developer Account
- LG TV for testing (or webOS TV Emulator)

## Project Structure

```
lg-webos/
├── appinfo.json    # App configuration
├── index.html      # Main app wrapper (loads web app in iframe)
├── icon.png        # App icon (80x80)
├── largeIcon.png   # Large icon (130x130)
├── bgImage.png     # Background image (optional, 1920x1080)
├── webOSTVjs-1.2.4/  # webOS TV JavaScript library
└── README.md
```

## Setup Instructions

### 1. Install webOS TV SDK

Download from: https://webostv.developer.lge.com/develop/tools/sdk-introduction

The SDK includes:
- CLI tools (ares-*)
- webOS TV Emulator
- IDE plugins

### 2. Download webOS TV JS Library

1. Download from: https://webostv.developer.lge.com/develop/tools/webos-tv-js-library
2. Extract to `webOSTVjs-1.2.4/` folder in project

### 3. Create App Icons

Create these image files:
- `icon.png` (80x80 pixels)
- `largeIcon.png` (130x130 pixels)
- `bgImage.png` (1920x1080 pixels, optional)

### 4. Package the App

```bash
# Install ares CLI tools with webOS SDK

# Package the app
ares-package lg-webos/

# This creates: com.gridtvsports.tv_1.0.4_all.ipk
```

## Testing

### On TV Emulator
```bash
# Launch emulator from SDK
# Then install and run:
ares-install --device emulator com.gridtvsports.tv_1.0.4_all.ipk
ares-launch --device emulator com.gridtvsports.tv
```

### On Physical TV

1. Enable Developer Mode on your LG TV:
   - Install "Developer Mode" app from LG Content Store
   - Sign in with LG Developer account
   - Enable Developer Mode and set Key Server to your PC's IP

2. Setup device:
```bash
ares-setup-device
# Add your TV with its IP address
```

3. Install and run:
```bash
ares-install --device tv com.gridtvsports.tv_1.0.4_all.ipk
ares-launch --device tv com.gridtvsports.tv
```

## LG Seller Lounge Submission

### 1. Create Seller Account
https://seller.lgappstv.com/

### 2. Prepare Assets
- App icon (80x80, 130x130 PNG)
- Screenshots (1920x1080)
- App description
- Privacy policy URL
- Video preview (optional)

### 3. Submit App
1. Log into LG Seller Lounge
2. Register New App
3. Upload .ipk file
4. Fill in app details
5. Submit for review

## Remote Control Keys

The app handles these LG TV remote keys:
- **BACK (461)**: Back navigation / Exit on error screen
- **Arrow keys**: D-pad navigation (handled by web app)
- **Enter/OK**: Select (handled by web app)
- **Media keys (412-417)**: Passed to web app

## App Configuration (appinfo.json)

| Field | Description |
|-------|-------------|
| id | Unique app ID (reverse domain) |
| version | App version |
| type | "web" for web apps |
| main | Entry HTML file |
| title | Display name |
| resolution | "1920x1080" for Full HD |

## Troubleshooting

### App not loading
- Check internet connection on TV
- Verify `gridtvsports.com` is accessible
- Use ares-inspect for debugging

### Remote not working
- Ensure iframe has focus
- Check key codes in console

### Build/Package errors
- Verify appinfo.json syntax
- Check all required files exist
- Ensure icons are correct size

### Debug Mode
```bash
# Inspect running app
ares-inspect --device tv com.gridtvsports.tv

# View logs
ares-log --device tv
```

## webOS Version Compatibility

| webOS Version | TV Year | Notes |
|---------------|---------|-------|
| webOS 3.x | 2016 | Minimum supported |
| webOS 4.x | 2018 | Good support |
| webOS 5.x | 2020 | Full support |
| webOS 6.x | 2021+ | Full support |
