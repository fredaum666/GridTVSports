package com.gridtvsports.tv

import android.annotation.SuppressLint
import android.os.Bundle
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
    private val TV_HOME_URL = "https://gridtvsports.com/tv-home.html"

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
        webView.settings.apply {
            // Enable JavaScript (required for the app)
            javaScriptEnabled = true

            // Enable DOM storage for localStorage
            domStorageEnabled = true

            // Enable cache
            cacheMode = WebSettings.LOAD_DEFAULT

            // Allow media playback
            mediaPlaybackRequiresUserGesture = false

            // Enable responsive layout
            useWideViewPort = true
            loadWithOverviewMode = true
            layoutAlgorithm = WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING

            // Enable zoom controls (disabled for TV)
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false

            // Set user agent to identify as TV app
            userAgentString = "$userAgentString GridTVSports-AndroidTV/1.0"

            // Allow mixed content (http resources on https page)
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

            // Database storage
            databaseEnabled = true
        }

        // Handle page loading
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
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
