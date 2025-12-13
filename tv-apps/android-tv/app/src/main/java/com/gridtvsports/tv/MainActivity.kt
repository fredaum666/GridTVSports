package com.gridtvsports.tv

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var loadingView: View
    private lateinit var loadingText: TextView
    private lateinit var progressBar: ProgressBar

    // ========================================
    // CHANGE THIS TO YOUR PRODUCTION URL
    // ========================================
    private val TV_RECEIVER_URL = "https://gridtvsports.com/tv-receiver.html"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make fullscreen
        setupFullscreen()

        // Create the UI programmatically
        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#0a0e1a"))
        }

        // Create WebView
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#0a0e1a"))
        }
        rootLayout.addView(webView)

        // Create loading overlay
        loadingView = createLoadingView()
        rootLayout.addView(loadingView)

        setContentView(rootLayout)

        // Configure WebView
        configureWebView()

        // Load the TV receiver page
        webView.loadUrl(TV_RECEIVER_URL)
    }

    private fun setupFullscreen() {
        // Hide system bars
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).let { controller ->
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        // Keep screen on
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun createLoadingView(): View {
        return FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#0a0e1a"))

            // Center container
            val centerLayout = FrameLayout(context).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    gravity = android.view.Gravity.CENTER
                }
            }

            // Title
            val titleText = TextView(context).apply {
                text = "GridTV Sports"
                textSize = 48f
                setTextColor(Color.parseColor("#6366f1"))
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                gravity = android.view.Gravity.CENTER
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    gravity = android.view.Gravity.CENTER_HORIZONTAL
                    topMargin = 0
                }
            }
            centerLayout.addView(titleText)

            // Loading text
            loadingText = TextView(context).apply {
                text = "Loading..."
                textSize = 24f
                setTextColor(Color.parseColor("#94a3b8"))
                gravity = android.view.Gravity.CENTER
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    gravity = android.view.Gravity.CENTER_HORIZONTAL
                    topMargin = 200
                }
            }
            centerLayout.addView(loadingText)

            // Progress bar
            progressBar = ProgressBar(context).apply {
                layoutParams = FrameLayout.LayoutParams(
                    100,
                    100
                ).apply {
                    gravity = android.view.Gravity.CENTER_HORIZONTAL
                    topMargin = 320
                }
                indeterminateTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#6366f1"))
            }
            centerLayout.addView(progressBar)

            addView(centerLayout)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            loadWithOverviewMode = true
            useWideViewPort = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false

            // Allow file access for local storage
            allowFileAccess = true
            allowContentAccess = true

            // User agent to identify as TV app
            userAgentString = "$userAgentString GridTVSports/1.0 AndroidTV"
        }

        // Enable hardware acceleration
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        // Handle page loading
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Hide loading after a brief delay to ensure content is rendered
                webView.postDelayed({
                    loadingView.visibility = View.GONE
                }, 500)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    showError("Connection failed. Press OK to retry.")
                }
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                // Keep all navigation within the WebView
                return false
            }
        }

        // Handle JavaScript dialogs
        webView.webChromeClient = object : WebChromeClient() {
            override fun onJsAlert(
                view: WebView?,
                url: String?,
                message: String?,
                result: JsResult?
            ): Boolean {
                result?.confirm()
                return true
            }

            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                // Log WebView console messages for debugging
                consoleMessage?.let {
                    android.util.Log.d("GridTV-WebView", "${it.message()} [${it.lineNumber()}]")
                }
                return true
            }
        }
    }

    private fun showError(message: String) {
        runOnUiThread {
            loadingView.visibility = View.VISIBLE
            loadingText.text = message
            progressBar.visibility = View.GONE
        }
    }

    private fun retryLoading() {
        loadingView.visibility = View.VISIBLE
        loadingText.text = "Loading..."
        progressBar.visibility = View.VISIBLE
        webView.loadUrl(TV_RECEIVER_URL)
    }

    // Handle TV remote navigation
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_CENTER,
            KeyEvent.KEYCODE_ENTER,
            KeyEvent.KEYCODE_NUMPAD_ENTER -> {
                // If showing error, retry on OK press
                if (loadingView.visibility == View.VISIBLE && progressBar.visibility == View.GONE) {
                    retryLoading()
                    return true
                }
                // Otherwise pass to WebView
                webView.dispatchKeyEvent(event)
                return true
            }
            KeyEvent.KEYCODE_BACK -> {
                if (webView.canGoBack()) {
                    webView.goBack()
                    return true
                }
                // Exit app on back if can't go back
                return super.onKeyDown(keyCode, event)
            }
            // Pass D-pad navigation to WebView
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT -> {
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
