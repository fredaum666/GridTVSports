# iOS App - Quick Start Guide

## 5-Minute Setup

### 1. Open in Xcode
```bash
# Navigate to the iOS project
cd tv-apps/ios-mobile

# Open the project (macOS only)
open GridTVSports.xcodeproj
```

### 2. Configure Server URL

Edit [GridTVSports/ViewController.swift](GridTVSports/ViewController.swift):

```swift
// Line 15 - Set to true for local dev, false for production
private let useLocalServer = true

// Line 24 - Your Mac's IP address (for testing on real iPhone)
private let localServerIP = "192.168.1.100"  // Change this!
```

To find your Mac's IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### 3. Build & Run

**In Xcode:**
1. Select a simulator (e.g., iPhone 15) from the top bar
2. Click the ▶️ Run button (or press ⌘+R)
3. Wait for build to complete
4. App launches in simulator automatically

**First time:**
- May take 2-3 minutes to build
- Subsequent builds are faster (~30 seconds)

## Testing on Your iPhone

### Prerequisites
- iPhone with iOS 13 or later
- USB cable (Lightning or USB-C)
- Free Apple ID

### Steps

1. **Connect iPhone** to your Mac via USB

2. **Trust Computer** (on iPhone when prompted)

3. **Sign in to Xcode**
   - Xcode > Settings > Accounts
   - Click **+** > Add Apple ID
   - Sign in

4. **Select Your Device**
   - In Xcode, top bar, change from simulator to your iPhone name

5. **Configure Signing**
   - Click project name in left sidebar (blue icon)
   - Select "GridTVSports" target
   - Go to "Signing & Capabilities" tab
   - Under Team, select your Apple ID
   - Xcode will auto-create signing certificate

6. **Enable Developer Mode** (iOS 16+)
   - On iPhone: Settings > Privacy & Security > Developer Mode
   - Turn ON and restart iPhone

7. **Run** (Click ▶️ or ⌘+R)

8. **Trust Developer** (first time only)
   - On iPhone: Settings > General > VPN & Device Management
   - Tap your Apple ID > Trust

## Common Commands

```bash
# Build from command line
cd tv-apps/ios-mobile
./build.sh

# Clean build (if you have issues)
# In Xcode: Product > Clean Build Folder (⇧⌘K)

# Find your Mac's IP for local testing
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
```

## What's Different from Android?

| Aspect | Android | iOS |
|--------|---------|-----|
| **IDE** | Android Studio | Xcode |
| **Language** | Kotlin | Swift |
| **Platform** | Windows/Mac/Linux | **macOS only** |
| **Emulator** | Android Emulator | iOS Simulator |
| **WebView** | WebView | WKWebView |
| **Install** | ADB or APK file | Xcode or TestFlight |
| **Store Fee** | $25 once | $99/year |

## File You'll Edit Most

- [**ViewController.swift**](GridTVSports/ViewController.swift) - Main app logic, equivalent to Android's `MainActivity.kt`

## Need More Help?

See full [README.md](README.md) for:
- App Store submission process
- Push notification setup
- Troubleshooting guide
- JavaScript bridge documentation

## Pro Tips

1. **Use Real Device** - Simulator is good for quick tests, but test on real iPhone before releasing
2. **WiFi Same Network** - When testing locally, Mac and iPhone must be on same WiFi
3. **HTTPS in Production** - Change `useLocalServer = false` and use HTTPS URL for production
4. **Clear Cache** - In simulator: Device > Erase All Content and Settings (if app misbehaves)
5. **Logs** - View logs in Xcode: View > Debug Area > Show Debug Area (⇧⌘Y)

## Checklist Before Release

- [ ] Changed `useLocalServer` to `false`
- [ ] Set production URL (`prodMobileLoginUrl`)
- [ ] Added app icons (all sizes in Assets.xcassets)
- [ ] Updated Bundle Identifier to your domain
- [ ] Tested on real iPhone (not just simulator)
- [ ] Tested with HTTPS URL
- [ ] Configured push notifications (if using)
- [ ] Updated version and build numbers
- [ ] Created screenshots for App Store

## Quick Debug

**App crashes on launch?**
- Check Xcode console for errors
- Verify URL is correct
- Try cleaning build folder

**Blank white screen?**
- URL might be wrong
- Server might not be running
- Check Xcode console for network errors

**Can't install on iPhone?**
- Make sure Developer Mode is ON (iOS 16+)
- Check USB cable is working
- Try different USB port
- Restart both Mac and iPhone

## Resources

- [Apple Developer](https://developer.apple.com/)
- [Xcode Help](https://help.apple.com/xcode/)
- [TestFlight](https://developer.apple.com/testflight/) - Beta testing before App Store release
