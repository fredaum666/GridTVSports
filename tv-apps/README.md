# GridTV Sports - Mobile & TV Apps

Native wrapper apps for GridTV Sports across mobile and TV platforms.

## How It Works

Each app is a WebView wrapper that loads the GridTV Sports web application:
- **Mobile apps**: Load login page, provide touch navigation, Sports Bar remote
- **TV apps**: Load TV receiver page, display PIN for pairing, show live games

## Available Apps

### Mobile Apps

| Platform | Folder | Store | Notes |
|----------|--------|-------|-------|
| **iOS Mobile** | `ios-mobile/` | Apple App Store | iPhone & iPad, iOS 13.0+ |
| **Android Mobile** | `android-tv/` | Google Play | Android 5.0+ phones & tablets |

### TV Apps

| Platform | Folder | Store | Notes |
|----------|--------|-------|-------|
| Android TV / Google TV | `android-tv/` | Google Play | Also works on Fire TV via sideload |
| Amazon Fire TV | `android-tv/` | Amazon App Store | Same APK as Android TV |
| Roku | `roku/` | Roku Channel Store | BrightScript + SceneGraph |
| Samsung Tizen | `samsung-tizen/` | Samsung Galaxy Store | 2015+ Samsung TVs |
| LG webOS | `lg-webos/` | LG Content Store | 2014+ LG TVs |
| Apple TV | `apple-tv/` | App Store | Requires Mac + Xcode |

## Quick Start

### iOS Mobile App (iPhone/iPad)

1. Open Xcode on your Mac:
   ```bash
   cd ios-mobile
   open GridTVSports.xcodeproj
   ```
2. Select iPhone simulator and click Run (▶️)
3. For real device: Connect iPhone, select it, configure signing with Apple ID

📖 **Detailed Guide**: [ios-mobile/QUICKSTART.md](ios-mobile/QUICKSTART.md)

### Android Mobile/TV App

1. Install Android Studio
2. Open `android-tv/` project
3. Build APK
4. Install via ADB:
   ```bash
   cd android-tv
   ./gradlew assembleDebug
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

📖 **Detailed Guide**: [android-tv/README.md](android-tv/README.md)

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

Update URLs in each app before building:

### Mobile Apps
- **iOS Mobile**: `ViewController.swift` - `useLocalServer`, `localServerIP`, `prodMobileLoginUrl`
- **Android Mobile**: `MainActivity.kt` - `useLocalServer`, `localServerIP`, `prodMobileLoginUrl`

### TV Apps
- **Android TV**: `MainActivity.kt` - `TV_RECEIVER_URL` or `tvHomeUrl`
- **Roku**: `MainScene.xml` - `url` attribute
- **Samsung**: `index.html` - `TV_RECEIVER_URL`
- **LG**: `index.html` - `TV_RECEIVER_URL`
- **Apple TV**: `ContentView.swift` - `tvReceiverURL`

## Additional Documentation

- **Platform Comparison**: [PLATFORM_COMPARISON.md](PLATFORM_COMPARISON.md) - Detailed Android vs iOS comparison
- **iOS Quick Start**: [ios-mobile/QUICKSTART.md](ios-mobile/QUICKSTART.md) - 5-minute iOS setup guide
- **iOS Full Guide**: [ios-mobile/README.md](ios-mobile/README.md) - Complete iOS documentation
- **Android Guide**: [android-tv/README.md](android-tv/README.md) - Android mobile & TV documentation
