package com.gridtvsports.tv

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.UiModeManager
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.view.WindowMetrics
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var loadingText: TextView
    private lateinit var loadingOverlay: View

    // Production URLs
    private val TV_HOME_URL = "https://gridtvsports.com/tv-home"
    private val MOBILE_LOGIN_URL = "https://gridtvsports.com/login"

    // For Android Emulator: use 10.0.2.2 to reach host machine's localhost
    //private val TV_HOME_URL = "http://10.0.2.2:3001/tv-home"
    //private val MOBILE_LOGIN_URL = "http://10.0.2.2:3001/login"

    // For physical device on same network, use your computer's IP:
    // private val TV_HOME_URL = "http://192.168.1.100:3001/tv-home"
    // private val MOBILE_LOGIN_URL = "http://192.168.1.100:3001/login"

    private var isTV = false
    private var fcmToken: String? = null

    // Permission request launcher for Android 13+
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            Log.d("MainActivity", "Notification permission granted")
            initializeFCM()
        } else {
            Log.d("MainActivity", "Notification permission denied")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Detect if running on TV
        isTV = detectTVDevice()
        Log.d("MainActivity", "Device type: ${if (isTV) "TV" else "Phone/Tablet"}")

        // Make fullscreen and keep screen on (for TV)
        if (isTV) {
            WindowCompat.setDecorFitsSystemWindows(window, false)
            WindowInsetsControllerCompat(window, window.decorView).let { controller ->
                controller.hide(WindowInsetsCompat.Type.systemBars())
                controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }

        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        loadingText = findViewById(R.id.loadingText)
        loadingOverlay = findViewById(R.id.loadingOverlay)

        try {
            setupWebView()
            loadAppropriateUrl()

            // Initialize FCM for push notifications
            createNotificationChannel()
            requestNotificationPermission()
        } catch (e: Exception) {
            Log.e("MainActivity", "Error setting up WebView: ${e.message}", e)
            // Show error message
            loadingText.text = "Error loading app. Please restart."
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                GridTVFirebaseService.CHANNEL_ID,
                GridTVFirebaseService.CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for game start alerts"
                enableLights(true)
                enableVibration(true)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
            Log.d("MainActivity", "Notification channel created")
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            when {
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED -> {
                    Log.d("MainActivity", "Notification permission already granted")
                    initializeFCM()
                }
                shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) -> {
                    // User previously denied, but we can ask again
                    requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
                else -> {
                    // First time asking
                    requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
        } else {
            // Below Android 13, no runtime permission needed
            initializeFCM()
        }
    }

    private fun initializeFCM() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w("MainActivity", "FCM token fetch failed", task.exception)
                return@addOnCompleteListener
            }

            fcmToken = task.result
            Log.d("MainActivity", "FCM Token: $fcmToken")

            // Store token locally
            getSharedPreferences("fcm_prefs", Context.MODE_PRIVATE)
                .edit()
                .putString("fcm_token", fcmToken)
                .apply()
        }
    }

    private fun detectTVDevice(): Boolean {
        val uiModeManager = getSystemService(Context.UI_MODE_SERVICE) as UiModeManager
        return uiModeManager.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        // Get actual screen metrics (compatible with all Android versions)
        val screenWidth: Int
        val screenHeight: Int
        val density: Float

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val windowMetrics: WindowMetrics = windowManager.currentWindowMetrics
            screenWidth = windowMetrics.bounds.width()
            screenHeight = windowMetrics.bounds.height()
            density = resources.displayMetrics.density
        } else {
            @Suppress("DEPRECATION")
            val displayMetrics = android.util.DisplayMetrics()
            @Suppress("DEPRECATION")
            windowManager.defaultDisplay.getRealMetrics(displayMetrics)
            screenWidth = displayMetrics.widthPixels
            screenHeight = displayMetrics.heightPixels
            density = displayMetrics.density
        }

        Log.d("MainActivity", "Screen: ${screenWidth}x${screenHeight}, Density: $density")
        Log.d("MainActivity", "CSS Viewport will be: ${(screenWidth / density).toInt()}x${(screenHeight / density).toInt()}")

        // Enable WebView debugging only for debug builds
        if (0 != (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE)) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        webView.settings.apply {
            // Enable JavaScript (required for the app)
            javaScriptEnabled = true

            // Enable DOM storage for localStorage
            domStorageEnabled = true

            // Enable cache
            cacheMode = WebSettings.LOAD_DEFAULT

            // Allow media playback
            mediaPlaybackRequiresUserGesture = false

            // CRITICAL: Enable wide viewport to allow custom viewport width
            // This makes the WebView respect the viewport meta tag width value
            useWideViewPort = true
            loadWithOverviewMode = true

            // Disable text auto-sizing
            textZoom = 100

            // Configure zoom based on device type
            if (isTV) {
                // Disable zoom for TV (D-pad navigation)
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
            } else {
                // Enable zoom for mobile/tablet (pinch to zoom)
                setSupportZoom(true)
                builtInZoomControls = true
                displayZoomControls = false // Hide zoom buttons, allow pinch
            }

            // Set user agent to identify device type with actual screen resolution
            userAgentString = if (isTV) {
                "$userAgentString GridTVSports-AndroidTV/1.0 TVScreen/${screenWidth}x${screenHeight}"
            } else {
                "$userAgentString GridTVSports-Mobile/1.0 Screen/${screenWidth}x${screenHeight}"
            }

            // Allow mixed content (http resources on https page)
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

            // Database storage
            databaseEnabled = true
        }

        // Set initial scale to 0 (auto) for mobile, 100 for TV
        webView.setInitialScale(if (isTV) 100 else 0)

        Log.d("MainActivity", "WebView configured for ${if (isTV) "TV" else "Mobile"} mode")

        // Handle page loading
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Log viewport info for debugging
                if (0 != (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE)) {
                    view?.evaluateJavascript("""
                        (function() {
                            console.log('📺 TV App - Viewport: ' + window.innerWidth + 'x' + window.innerHeight);
                            console.log('📺 TV App - Screen: ' + screen.width + 'x' + screen.height);
                            console.log('📺 TV App - DevicePixelRatio: ' + window.devicePixelRatio);
                        })();
                    """.trimIndent(), null)
                }
                hideLoading()
            }

            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                showError("Connection error: $description")
            }
        }

        // Handle JavaScript dialogs and progress
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                progressBar.progress = newProgress
                if (newProgress >= 100) {
                    hideLoading()
                }
            }
        }

        // Make WebView focusable for D-pad navigation
        webView.isFocusable = true
        webView.isFocusableInTouchMode = true
        webView.requestFocus()

        // Add JavaScript interface for FCM communication
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidApp")
    }

    // JavaScript interface for web page communication
    inner class WebAppInterface(private val context: Context) {

        @JavascriptInterface
        fun getFCMToken(): String {
            return fcmToken ?: getSharedPreferences("fcm_prefs", Context.MODE_PRIVATE)
                .getString("fcm_token", "") ?: ""
        }

        @JavascriptInterface
        fun isAndroidApp(): Boolean {
            return true
        }

        @JavascriptInterface
        fun isTV(): Boolean {
            return isTV
        }

        @JavascriptInterface
        fun getDeviceInfo(): String {
            return """{"model":"${Build.MODEL}","manufacturer":"${Build.MANUFACTURER}","sdk":${Build.VERSION.SDK_INT},"isTV":$isTV}"""
        }
    }

    private fun loadAppropriateUrl() {
        showLoading()
        val url = if (isTV) TV_HOME_URL else MOBILE_LOGIN_URL
        Log.d("MainActivity", "Loading URL: $url (isTV: $isTV)")
        webView.loadUrl(url)
    }

    private fun showLoading() {
        loadingOverlay.visibility = View.VISIBLE
        progressBar.progress = 0
        loadingText.text = getString(R.string.loading)
    }

    private fun hideLoading() {
        loadingOverlay.visibility = View.GONE
    }

    private fun showError(message: String) {
        loadingText.text = message
        // Retry after 5 seconds
        loadingOverlay.postDelayed({
            loadAppropriateUrl()
        }, 5000)
    }

    // Handle D-pad remote control
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                if (webView.canGoBack()) {
                    webView.goBack()
                    return true
                }
            }
            // Pass D-pad events to WebView
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT,
            KeyEvent.KEYCODE_DPAD_CENTER,
            KeyEvent.KEYCODE_ENTER -> {
                webView.dispatchKeyEvent(event)
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
