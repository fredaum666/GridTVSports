# GridTV Sports - Android TV / Fire TV App

A WebView wrapper app that loads the TV receiver page on Android TV and Amazon Fire TV.

## Prerequisites

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java JDK 17** - Usually bundled with Android Studio

## Building the APK

### Option 1: Using Android Studio (Recommended)

1. Open Android Studio
2. Click "Open" and select this `android-tv` folder
3. Wait for Gradle sync to complete (may take a few minutes first time)
4. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**
5. APK will be at: `app/build/outputs/apk/debug/app-debug.apk`

### Option 2: Using Command Line

```bash
# Windows
cd tv-apps\android-tv
gradlew.bat assembleDebug

# Mac/Linux
cd tv-apps/android-tv
./gradlew assembleDebug
```

APK location: `app/build/outputs/apk/debug/app-debug.apk`

## Installing on Android TV

### Method 1: Using ADB (Android Debug Bridge)

1. **Enable Developer Options on your TV:**
   - Go to Settings > Device Preferences > About
   - Click on "Build" 7 times to enable Developer Options

2. **Enable ADB Debugging:**
   - Go to Settings > Device Preferences > Developer Options
   - Enable "Network debugging" or "USB debugging"
   - Note the IP address shown

3. **Connect and Install:**
   ```bash
   # Connect to TV
   adb connect <TV_IP_ADDRESS>:5555

   # Install the APK
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

4. The app "GridTV Sports" will appear in your TV's app list

### Method 2: Using USB Drive

1. Copy the APK to a USB drive
2. Plug into your Android TV
3. Use a file manager app (like "File Commander") to install

### Method 3: Using Send Files to TV App

1. Install "Send Files to TV" on both your phone and TV (from Play Store)
2. Send the APK from your phone to TV
3. Open and install on TV

## Installing on Amazon Fire TV

Fire TV runs a modified Android, so the same APK works!

1. **Enable Developer Options:**
   - Settings > My Fire TV > Developer Options
   - Enable "Apps from Unknown Sources"
   - Enable "ADB debugging"

2. **Get Fire TV IP Address:**
   - Settings > My Fire TV > About > Network

3. **Install via ADB:**
   ```bash
   adb connect <FIRE_TV_IP>:5555
   adb install app-debug.apk
   ```

4. The app will appear in "Your Apps & Channels" (may be in "See All")

## Configuration

Before building, update the URL in `MainActivity.kt`:

```kotlin
// Line 28 - Change this to your production URL
private val TV_RECEIVER_URL = "https://gridtvsports.com/tv-receiver.html"
```

For local testing, you can use your local network IP:
```kotlin
private val TV_RECEIVER_URL = "http://192.168.1.100:3001/tv-receiver.html"
```

## Troubleshooting

### "App not installed" error
- Make sure "Install from unknown sources" is enabled
- Uninstall any previous version first: `adb uninstall com.gridtvsports.tv`

### Can't connect via ADB
- Make sure TV and computer are on same network
- Try: `adb kill-server` then `adb start-server`
- Check firewall settings

### WebView shows blank/error
- Check that TV has internet access
- Verify the URL is correct and accessible
- Check Android Studio Logcat for errors

## Publishing to Google Play

1. Create a signed release APK:
   - Build > Generate Signed Bundle/APK
   - Create a new keystore or use existing
   - Select "release" build type

2. Go to https://play.google.com/console

3. Create a new app, select "TV" as form factor

4. Upload your signed APK

## Publishing to Amazon App Store

1. Build the release APK (same as above)

2. Go to https://developer.amazon.com/apps-and-games

3. Create a new app, select "Fire TV"

4. Upload your APK and fill in store listing
