package com.gridtvsports.tv

import android.annotation.SuppressLint
import android.content.pm.ApplicationInfo
import android.os.Bundle
import android.util.DisplayMetrics
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var loadingText: TextView
    private lateinit var loadingOverlay: View

    // Production URL - TV Home with league navigation
    private val TV_HOME_URL = "https://gridtvsports.com/tv-home"

    // For Android Emulator: use 10.0.2.2 to reach host machine's localhost
    //private val TV_HOME_URL = "http://10.0.2.2:3001/tv-home"

    // For physical Android TV device on same network, use your computer's IP:
    // private val TV_HOME_URL = "http://192.168.1.100:3001/tv-home"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make fullscreen
        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        )
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        loadingText = findViewById(R.id.loadingText)
        loadingOverlay = findViewById(R.id.loadingOverlay)

        setupWebView()
        loadTVHome()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        // Get actual screen metrics
        val displayMetrics = DisplayMetrics()
        windowManager.defaultDisplay.getRealMetrics(displayMetrics)
        val screenWidth = displayMetrics.widthPixels
        val screenHeight = displayMetrics.heightPixels
        val density = displayMetrics.density

        Log.d("MainActivity", "Screen: ${screenWidth}x${screenHeight}, Density: $density, DPI: ${displayMetrics.densityDpi}")
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

            // Disable zoom for TV
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false

            // Set user agent to identify as TV app with actual screen resolution
            userAgentString = "$userAgentString GridTVSports-AndroidTV/1.0 TVScreen/${screenWidth}x${screenHeight}"

            // Allow mixed content (http resources on https page)
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

            // Database storage
            databaseEnabled = true
        }

        // Set initial scale to 100% (no zoom)
        webView.setInitialScale(100)

        Log.d("MainActivity", "WebView configured for TV mode")

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
    }

    private fun loadTVHome() {
        showLoading()
        Log.d("MainActivity", "Loading URL: $TV_HOME_URL")

        // Simply load the URL directly - the web page handles TV detection
        webView.loadUrl(TV_HOME_URL)
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
            loadTVHome()
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
