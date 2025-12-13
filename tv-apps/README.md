# GridTV Sports - TV Apps

Simple wrapper apps that load the TV receiver page on various Smart TV platforms.

## How It Works

Each app is essentially a full-screen WebView that:
1. Opens `https://gridtvsports.com/tv-receiver.html`
2. Displays the PIN for pairing
3. Receives game data via WebSocket
4. Displays live games on the TV

## Available Platforms

| Platform | Folder | Store | Notes |
|----------|--------|-------|-------|
| Android TV / Google TV | `android-tv/` | Google Play | Also works on Fire TV via sideload |
| Amazon Fire TV | `android-tv/` | Amazon App Store | Same APK as Android TV |
| Roku | `roku/` | Roku Channel Store | BrightScript + SceneGraph |
| Samsung Tizen | `samsung-tizen/` | Samsung Galaxy Store | 2015+ Samsung TVs |
| LG webOS | `lg-webos/` | LG Content Store | 2014+ LG TVs |
| Apple TV | `apple-tv/` | App Store | Requires Mac + Xcode |

## Quick Start

### Easiest: Android TV (works on Fire TV too)

1. Install Android Studio
2. Open `android-tv/` project
3. Build APK
4. Install via ADB:
   ```bash
   adb connect <TV_IP>
   adb install app-debug.apk
   ```

### For Roku

1. Enable Developer Mode on Roku
2. Zip the `roku/` contents
3. Upload via `http://<ROKU_IP>`

### For Samsung

1. Install Tizen Studio
2. Enable Developer Mode on TV
3. Import and run project

### For LG

1. Install webOS TV SDK
2. Enable Developer Mode on TV
3. Use ares-cli to deploy

### For Apple TV

1. Open in Xcode on Mac
2. Build and run on Simulator or device

## App Store Submission

Each platform has its own submission process:

- **Google Play**: https://play.google.com/console
- **Amazon**: https://developer.amazon.com/apps-and-games
- **Roku**: https://developer.roku.com/
- **Samsung**: https://seller.samsungapps.com/tv
- **LG**: https://seller.lgappstv.com/
- **Apple**: https://developer.apple.com/tvos/

## Required Assets

Each platform needs specific image assets:

### Android TV
- `ic_launcher.png` - App icon (various sizes)
- `banner.png` - 320x180 banner for TV launcher

### Roku
- `icon_hd.png` - 336x210
- `splash_hd.png` - 1920x1080

### Samsung Tizen
- `icon.png` - 512x423
- `splash.png` - 1920x1080

### LG webOS
- `icon.png` - 80x80
- `largeIcon.png` - 130x130
- `splash.png` - 1920x1080

### Apple TV
- App Icon (various sizes via Asset Catalog)
- Top Shelf Image - 1920x720

## Configuration

Update the TV receiver URL in each app before building:

- **Android**: `MainActivity.kt` - `TV_RECEIVER_URL`
- **Roku**: `MainScene.xml` - `url` attribute
- **Samsung**: `index.html` - `TV_RECEIVER_URL`
- **LG**: `index.html` - `TV_RECEIVER_URL`
- **Apple TV**: `ContentView.swift` - `tvReceiverURL`
