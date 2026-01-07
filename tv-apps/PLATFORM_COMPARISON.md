# GridTV Sports - Platform Comparison Guide

This guide compares the Android and iOS app implementations to help you understand both platforms.

## Project Structure Comparison

### Android (`tv-apps/android-tv/`)
```
android-tv/
├── app/
│   ├── src/main/
│   │   ├── java/com/gridtvsports/tv/
│   │   │   ├── MainActivity.kt           ← Main app logic
│   │   │   └── GridTVFirebaseService.kt  ← Push notifications
│   │   ├── res/
│   │   │   ├── layout/
│   │   │   │   └── activity_main.xml     ← WebView layout
│   │   │   ├── values/
│   │   │   │   ├── strings.xml
│   │   │   │   ├── colors.xml
│   │   │   │   └── themes.xml
│   │   │   └── mipmap-*/                 ← App icons (various DPIs)
│   │   └── AndroidManifest.xml           ← App configuration
│   ├── src/mobile/AndroidManifest.xml    ← Mobile-specific settings
│   ├── src/tv/AndroidManifest.xml        ← TV-specific settings
│   └── build.gradle                      ← Build configuration
├── build.gradle                          ← Project-level build config
└── README.md
```

### iOS (`tv-apps/ios-mobile/`)
```
ios-mobile/
├── GridTVSports.xcodeproj/
│   ├── project.pbxproj                   ← Project configuration
│   └── project.xcworkspace/
├── GridTVSports/
│   ├── AppDelegate.swift                 ← App lifecycle
│   ├── SceneDelegate.swift               ← Scene management (iOS 13+)
│   ├── ViewController.swift              ← Main app logic
│   ├── Info.plist                        ← App configuration
│   ├── Assets.xcassets/
│   │   ├── AppIcon.appiconset/           ← App icons (all sizes)
│   │   └── AccentColor.colorset/
│   └── Base.lproj/
│       ├── Main.storyboard               ← Interface layout
│       └── LaunchScreen.storyboard       ← Launch screen
├── build.sh                              ← Build script
├── README.md
└── QUICKSTART.md
```

## Code Comparison

### Main Activity/View Controller

#### Android - MainActivity.kt
```kotlin
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        setupWebView()
        webView.loadUrl(url)
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            // ...more settings
        }
    }
}
```

#### iOS - ViewController.swift
```swift
class ViewController: UIViewController, WKNavigationDelegate {
    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
        loadApp()
    }

    private func setupWebView() {
        let configuration = WKWebViewConfiguration()
        configuration.preferences.javaScriptEnabled = true
        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.navigationDelegate = self
        view.addSubview(webView)
    }

    private func loadApp() {
        let url = URL(string: mobileLoginUrl)!
        webView.load(URLRequest(url: url))
    }
}
```

### JavaScript Bridge

#### Android
```kotlin
// In MainActivity.kt
webView.addJavascriptInterface(WebAppInterface(), "AndroidApp")

inner class WebAppInterface {
    @JavascriptInterface
    fun getFCMToken(): String {
        return fcmToken ?: ""
    }

    @JavascriptInterface
    fun isAndroidApp(): Boolean {
        return true
    }
}
```

```javascript
// In web app (JavaScript)
if (window.AndroidApp) {
    const token = window.AndroidApp.getFCMToken();
    const isAndroid = window.AndroidApp.isAndroidApp();
}
```

#### iOS
```swift
// In ViewController.swift
let userContentController = configuration.userContentController
userContentController.add(self, name: "iosApp")

extension ViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        if let body = message.body as? [String: Any],
           let method = body["method"] as? String {
            switch method {
            case "getFCMToken":
                let token = fcmToken ?? ""
                webView.evaluateJavaScript("window.iosAppCallback('\(token)')")
            default:
                break
            }
        }
    }
}
```

```javascript
// In web app (JavaScript)
if (window.webkit?.messageHandlers?.iosApp) {
    window.webkit.messageHandlers.iosApp.postMessage({
        method: 'getFCMToken'
    });

    window.iosAppCallback = function(token) {
        console.log('Token:', token);
    };
}
```

### Platform Detection in Web App

```javascript
// Detect which platform the app is running on
function detectPlatform() {
    // Check for Android app
    if (window.AndroidApp && window.AndroidApp.isAndroidApp()) {
        return 'android';
    }

    // Check for iOS app
    if (window.webkit?.messageHandlers?.iosApp) {
        return 'ios';
    }

    // Check for Android TV
    const ua = navigator.userAgent;
    if (ua.includes('GridTVSports-AndroidTV')) {
        return 'androidtv';
    }

    // Regular web browser
    return 'web';
}

// Usage
const platform = detectPlatform();
console.log('Running on:', platform);

// Platform-specific code
switch(platform) {
    case 'android':
        const token = window.AndroidApp.getFCMToken();
        break;
    case 'ios':
        window.webkit.messageHandlers.iosApp.postMessage({
            method: 'getFCMToken'
        });
        break;
    case 'web':
        // Use web-only features
        break;
}
```

## Development Environment

### Android
- **IDE**: Android Studio (free)
- **Platforms**: Windows, macOS, Linux
- **Emulator**: Android Emulator (fast, includes TV)
- **Language**: Kotlin (modern, concise)
- **Package Manager**: Gradle
- **Device Install**: ADB or direct APK install
- **Min Version**: Android 5.0 (API 21)
- **Cost**: $25 one-time for Play Store

### iOS
- **IDE**: Xcode (free, Mac App Store)
- **Platforms**: macOS ONLY
- **Emulator**: iOS Simulator (very fast)
- **Language**: Swift (modern, safe)
- **Package Manager**: Swift Package Manager / CocoaPods
- **Device Install**: Xcode (requires signing)
- **Min Version**: iOS 13.0
- **Cost**: $99/year for App Store

## Build & Release Process

### Android - Build APK

```bash
# Command line
cd tv-apps/android-tv
./gradlew assembleDebug

# Output: app/build/outputs/apk/debug/app-debug.apk

# Install directly to device
adb install app-debug.apk

# For Google Play (production)
./gradlew assembleRelease
# Then sign with keystore
```

**Release to Google Play:**
1. Create app in Play Console
2. Upload signed APK or AAB
3. Fill in store listing
4. Submit for review (~hours to few days)

### iOS - Build IPA

```bash
# Command line (builds but doesn't package)
cd tv-apps/ios-mobile
./build.sh

# For device/App Store, use Xcode:
# 1. Product > Archive
# 2. Distribute App > App Store Connect
```

**Release to App Store:**
1. Join Apple Developer Program ($99/year)
2. Archive app in Xcode
3. Upload to App Store Connect
4. Fill in store listing (screenshots, description)
5. Submit for review (~1-3 days)

## Push Notifications

### Android - Firebase Cloud Messaging (FCM)

```kotlin
// Get FCM token
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val token = task.result
        // Send to your server
    }
}

// Handle incoming messages
class GridTVFirebaseService : FirebaseMessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Show notification
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(remoteMessage.notification?.title)
            .setContentText(remoteMessage.notification?.body)
            .build()

        notificationManager.notify(notificationId, notification)
    }
}
```

### iOS - Apple Push Notification service (APNs)

```swift
// Request permission
UNUserNotificationCenter.current()
    .requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
    if granted {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}

// Get device token
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    // Send to your server
}

// Handle received notifications
func userNotificationCenter(_ center: UNUserNotificationCenter,
                           willPresent notification: UNNotification,
                           withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.banner, .sound, .badge])
}
```

## Configuration Files

### Android - AndroidManifest.xml
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.gridtvsports.tv">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.GridTVSports">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### iOS - Info.plist
```xml
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>GridTV Sports</string>

    <key>CFBundleIdentifier</key>
    <string>com.gridtvsports.mobile</string>

    <!-- Allow HTTP for local development -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
        <key>NSAllowsLocalNetworking</key>
        <true/>
    </dict>

    <key>UILaunchStoryboardName</key>
    <string>LaunchScreen</string>
</dict>
</plist>
```

## Testing

### Android
```bash
# Run in emulator
./gradlew installDebug

# Run tests
./gradlew test

# View logs
adb logcat | grep GridTVSports
```

### iOS
```bash
# Build
./build.sh

# Run in simulator (use Xcode)
# View logs in Xcode: View > Debug Area > Show Debug Area (⇧⌘Y)

# Or command line logs
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "GridTVSports"'
```

## Common Tasks

### Update App Name

**Android**: Edit `app/src/main/res/values/strings.xml`
```xml
<string name="app_name">GridTV Sports</string>
```

**iOS**: Edit `GridTVSports/Info.plist`
```xml
<key>CFBundleDisplayName</key>
<string>GridTV Sports</string>
```

### Update App Icon

**Android**: Replace files in `app/src/main/res/mipmap-*/ic_launcher.png`
- hdpi: 72x72
- xhdpi: 96x96
- xxhdpi: 144x144
- xxxhdpi: 192x192

**iOS**: Add images to `Assets.xcassets/AppIcon.appiconset/`
- 2x: 120x120
- 3x: 180x180
- App Store: 1024x1024

### Change Bundle Identifier

**Android**: Edit `app/build.gradle`
```gradle
android {
    defaultConfig {
        applicationId "com.yourcompany.gridtvsports"
    }
}
```

**iOS**: Edit in Xcode project settings
- Select project > GridTVSports target > General
- Change "Bundle Identifier"
- Also update in `Info.plist`

### Enable/Disable Local Development

**Android**: Edit `MainActivity.kt`
```kotlin
private val useLocalServer = true  // or false
private val localServerIP = "192.168.1.100"
```

**iOS**: Edit `ViewController.swift`
```swift
private let useLocalServer = true  // or false
private let localServerIP = "192.168.1.100"
```

## Key Differences Summary

| Feature | Android | iOS |
|---------|---------|-----|
| **WebView Component** | `android.webkit.WebView` | `WKWebView` |
| **JavaScript Bridge** | `addJavascriptInterface()` | `WKScriptMessageHandler` |
| **Call from JS → Native** | `window.AndroidApp.method()` | `window.webkit.messageHandlers.iosApp.postMessage()` |
| **Call from Native → JS** | `webView.evaluateJavascript()` | `webView.evaluateJavaScript()` |
| **Layout** | XML files in `res/layout/` | Storyboard files or programmatic |
| **Strings** | `res/values/strings.xml` | `Info.plist` or localization files |
| **Icons** | Multiple DPI folders | `Assets.xcassets` catalog |
| **Permissions** | `AndroidManifest.xml` | `Info.plist` + runtime requests |
| **Notifications** | Firebase (FCM) | Apple (APNs) |
| **Background** | Services, WorkManager | Background fetch, URLSession |
| **Dev on Windows?** | ✅ Yes | ❌ No (Mac only) |
| **Free Testing?** | ✅ Yes | ✅ Yes (with free Apple ID) |
| **Store Cost** | $25 once | $99/year |

## Which Platform to Develop First?

### Start with Android if:
- You have Windows/Linux (no Mac)
- You want faster iteration (easier testing)
- You want to reach Android TV users
- You want lower store costs

### Start with iOS if:
- You have a Mac
- Your users are primarily iPhone users
- You want the App Store's premium user base
- You're comfortable with Apple's ecosystem

### Do Both Because:
- Maximum market reach (iOS + Android = ~99% of mobile users)
- Similar codebases (both are WebView wrappers)
- Can reuse web app logic (main codebase)
- Only wrapper code differs (~500 lines each)

## Getting Help

- **Android**: [tv-apps/android-tv/README.md](android-tv/README.md)
- **iOS**: [tv-apps/ios-mobile/README.md](ios-mobile/README.md)
- **iOS Quick Start**: [tv-apps/ios-mobile/QUICKSTART.md](ios-mobile/QUICKSTART.md)

## Next Steps

1. **Choose your platform** (or do both!)
2. **Set up development environment**
   - Android: Install Android Studio
   - iOS: Install Xcode (Mac only)
3. **Clone and build the app**
4. **Test in emulator/simulator**
5. **Test on real device**
6. **Customize for your needs**
7. **Submit to app store**
