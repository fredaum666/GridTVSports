# GridTV Sports - iOS Mobile App

A native iOS WebView wrapper app for iPhone and iPad that provides:
- **League Navigation** - Browse NFL, NBA, MLB, NHL, NCAA on your iPhone
- **Sports Bar Mode** - Set up multi-game displays
- **TV Remote** - Use your iPhone to control Sports Bar mode on TV
- **Touch Navigation** - Full touch support optimized for iOS
- **Push Notifications** - Get alerts for game starts

## Prerequisites

1. **macOS** - iOS development requires a Mac
2. **Xcode** - Download from the Mac App Store (free)
   - Minimum version: Xcode 14.0 or later
   - Includes iOS SDK and simulator
3. **Apple Developer Account** (free or paid)
   - Free account: Can test on your own devices
   - Paid account ($99/year): Can publish to App Store

## Quick Start

### Option 1: Open in Xcode (Recommended)

1. Open Xcode
2. Click **File > Open**
3. Navigate to and select: `tv-apps/ios-mobile/GridTVSports.xcodeproj`
4. Wait for Xcode to index the project (first time only)
5. Select a simulator device from the top toolbar (e.g., "iPhone 15")
6. Click the **Run** button (▶️) or press **⌘+R**

The app will build and launch in the iOS Simulator!

### Option 2: Build from Command Line

```bash
cd tv-apps/ios-mobile
./build.sh
```

This builds the app but doesn't run it. You'll need to use Xcode to run it in the simulator.

## Configuration

Before building, update the server URL in [ViewController.swift:15-30](GridTVSports/ViewController.swift#L15-L30):

```swift
// For local development
private let useLocalServer = true
private let localServerIP = "192.168.1.100"  // Your Mac's IP address
private let localServerPort = "3001"

// For production
private let useLocalServer = false
private let prodMobileLoginUrl = "https://gridtvsports.com/login"
```

### Finding Your Mac's IP Address

For testing on a physical iPhone/iPad, you need your Mac's local IP:

1. Open **System Settings > Network**
2. Select your active connection (Wi-Fi or Ethernet)
3. Your IP address is shown (e.g., 192.168.1.100)
4. Update `localServerIP` in [ViewController.swift:24](GridTVSports/ViewController.swift#L24)

## Running on Physical iPhone/iPad

### First Time Setup

1. Connect your iPhone/iPad to your Mac via USB
2. Open the project in Xcode
3. In Xcode, go to **Xcode > Settings > Accounts**
4. Click **+** and sign in with your Apple ID
5. Back in the project, select your device from the device menu
6. Click on **GridTVSports** in the left sidebar (blue icon)
7. Go to **Signing & Capabilities** tab
8. Under **Team**, select your Apple ID
9. Xcode will automatically create a provisioning profile

### Enable Developer Mode on iPhone (iOS 16+)

If using iOS 16 or later, you need to enable Developer Mode:

1. On your iPhone, go to **Settings > Privacy & Security**
2. Scroll down and tap **Developer Mode**
3. Turn on Developer Mode
4. Restart your iPhone when prompted
5. After restart, confirm you want to enable Developer Mode

### Run on Device

1. Select your connected device from the device menu
2. Click **Run** (▶️) or press **⌘+R**
3. On your iPhone/iPad, you may see "Untrusted Developer"
4. Go to **Settings > General > VPN & Device Management**
5. Tap your Apple ID and tap **Trust**
6. Return to the app and it will launch

## Building for App Store

### 1. Prepare App Icons

Create app icons in these sizes and add them to [Assets.xcassets/AppIcon.appiconset](GridTVSports/Assets.xcassets/AppIcon.appiconset):

- iPhone: 120x120, 180x180
- iPad: 152x152, 167x167
- App Store: 1024x1024

You can use tools like:
- [AppIcon.co](https://appicon.co) - Generates all sizes from one image
- [MakeAppIcon](https://makeappicon.com) - Free icon generator

### 2. Update App Information

In [Info.plist](GridTVSports/Info.plist):
- Update `CFBundleDisplayName` (app name on home screen)
- Update `CFBundleIdentifier` (must be unique, e.g., com.yourcompany.gridtvsports)

In Xcode project settings:
- Update **Bundle Identifier** to match your domain
- Set **Version** and **Build** numbers

### 3. Join Apple Developer Program

1. Go to https://developer.apple.com/programs/
2. Enroll in the Apple Developer Program ($99/year)
3. Complete enrollment (may take 24-48 hours)

### 4. Create App Store Connect Record

1. Go to https://appstoreconnect.apple.com
2. Click **My Apps** > **+** > **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: GridTV Sports (or your app name)
   - **Primary Language**: English
   - **Bundle ID**: Select the one from your Xcode project
   - **SKU**: Any unique identifier (e.g., gridtvsports-ios-001)
4. Click **Create**

### 5. Archive and Upload

In Xcode:

1. Select **Any iOS Device (arm64)** as the build target (not a simulator)
2. Go to **Product > Archive**
3. Wait for the archive to complete
4. In the Archives window, select your archive
5. Click **Distribute App**
6. Select **App Store Connect** > **Upload**
7. Follow the prompts to sign and upload
8. Wait for upload to complete (can take 10-30 minutes)

### 6. Submit for Review

1. Return to App Store Connect
2. Select your app
3. Fill in required information:
   - Screenshots (iPhone and iPad)
   - Description
   - Keywords
   - Support URL
   - Privacy Policy URL
4. Click **Submit for Review**
5. Wait for Apple's review (typically 1-3 days)

## App Features

### JavaScript Bridge

The iOS app provides a JavaScript bridge for communication between the web app and native iOS:

```javascript
// Check if running in iOS app
if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.iosApp) {
    console.log('Running in iOS app');

    // Send message to iOS
    window.webkit.messageHandlers.iosApp.postMessage({
        method: 'getFCMToken'
    });

    // Receive response (callback set by native side)
    window.iosAppCallback = function(result) {
        console.log('FCM Token:', result);
    };
}
```

Available methods:
- `getFCMToken` - Get Firebase Cloud Messaging token for push notifications
- `isIOSApp` - Returns true
- `getDeviceInfo` - Returns device model, iOS version

### Push Notifications

The app supports push notifications through Apple Push Notification service (APNs):

1. Enable push notifications in Xcode:
   - Select project > **Signing & Capabilities**
   - Click **+ Capability**
   - Add **Push Notifications**

2. Get device token in JavaScript:
```javascript
window.webkit.messageHandlers.iosApp.postMessage({
    method: 'getFCMToken'
});
```

3. Send notifications using your backend with the device token

### Custom User Agent

The app sets a custom User-Agent to identify itself:
```
GridTVSports-iOS/1.0 Screen/{width}x{height}
```

You can detect the iOS app in your web code:
```javascript
const isIOSApp = navigator.userAgent.includes('GridTVSports-iOS');
```

## Troubleshooting

### "No provisioning profile found"
- Make sure you've signed in with your Apple ID in Xcode Settings > Accounts
- Select your Team in Signing & Capabilities
- Xcode will automatically create a development profile

### "Untrusted Developer" on iPhone
- Go to Settings > General > VPN & Device Management
- Tap your Apple ID and tap Trust
- Return to the app

### "Unable to install"
- Make sure your iOS version is 13.0 or later
- Try restarting both your Mac and iPhone
- Disconnect and reconnect the USB cable

### Simulator is slow
- Close other apps to free up RAM
- In Simulator, go to Device > Erase All Content and Settings
- Restart your Mac
- Consider testing on a physical device instead

### WebView shows blank page
- Check the URL in [ViewController.swift:26](GridTVSports/ViewController.swift#L26)
- Make sure your Mac and iPhone are on the same WiFi network (for local testing)
- Check that your local server is running: `npm start` in the main project
- Open Safari on your iPhone and try loading the URL directly

### Build errors in Xcode
- Clean build folder: **Product > Clean Build Folder** (⇧⌘K)
- Delete derived data: **Xcode > Settings > Locations > Derived Data** > Click arrow and delete folder
- Restart Xcode
- Update to the latest Xcode version

### Network requests failing
- The app allows HTTP connections for local development (see [Info.plist:62-66](GridTVSports/Info.plist#L62-L66))
- For production, use HTTPS URLs
- Check that `NSAppTransportSecurity` settings are correct in Info.plist

## App Store Review Tips

1. **Test Thoroughly** - Make sure all features work before submitting
2. **Provide Demo Account** - If login is required, provide test credentials in review notes
3. **Clear Description** - Explain what the app does and why it's useful
4. **Quality Screenshots** - Use the iOS Simulator to capture perfect screenshots
5. **Privacy Policy** - Required if you collect any user data
6. **Support URL** - Provide a working support website or email

## Testing with Different iOS Versions

In Xcode Simulator, you can test with different iOS versions:

1. Go to **Xcode > Settings > Platforms**
2. Click **+** to download additional simulators
3. Select the iOS version you want to test
4. Change the simulator in the device menu

The app supports iOS 13.0 and later, so test on:
- iOS 13 (minimum supported version)
- iOS 15 (widely used)
- iOS 17 (latest)

## File Structure

```
ios-mobile/
├── GridTVSports.xcodeproj/          # Xcode project file
│   ├── project.pbxproj               # Project configuration
│   └── project.xcworkspace/          # Workspace settings
├── GridTVSports/                     # Source code
│   ├── AppDelegate.swift             # App lifecycle and notifications
│   ├── SceneDelegate.swift           # Scene management (iOS 13+)
│   ├── ViewController.swift          # Main WebView controller
│   ├── Info.plist                    # App configuration
│   ├── Assets.xcassets/              # App icons and images
│   └── Base.lproj/                   # Storyboards
│       ├── Main.storyboard           # Main interface
│       └── LaunchScreen.storyboard   # Launch screen
├── build.sh                          # Build script
└── README.md                         # This file
```

## Comparison with Android Version

| Feature | iOS | Android |
|---------|-----|---------|
| WebView | WKWebView | Android WebView |
| Language | Swift | Kotlin |
| IDE | Xcode | Android Studio |
| Min Version | iOS 13.0 | Android 5.0 (API 21) |
| Push Notifications | APNs | Firebase (FCM) |
| Development OS | macOS only | Windows, Mac, Linux |
| Deployment | App Store | Google Play, APK |
| Developer Fee | $99/year | $25 one-time |

## Next Steps

1. **Test the app** - Run in simulator and on your device
2. **Customize** - Update colors, icons, and URLs
3. **Add features** - Enhance the JavaScript bridge as needed
4. **Deploy** - Follow the App Store submission process

## Getting Help

- **Xcode Help** - Help menu in Xcode
- **Apple Developer Forums** - https://developer.apple.com/forums/
- **iOS Documentation** - https://developer.apple.com/documentation/

## License

Same license as the main GridTV Sports project.
