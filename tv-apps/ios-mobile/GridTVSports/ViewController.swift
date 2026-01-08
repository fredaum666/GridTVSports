import UIKit
import WebKit
import UserNotifications

class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {

    private var webView: WKWebView!
    private var progressView: UIProgressView!
    private var loadingView: UIView!
    private var loadingLabel: UILabel!
    private var activityIndicator: UIActivityIndicatorView!

    // Set to true for local development, false for production
    private let useLocalServer = false

    // Local server configuration
    // Use your Mac's IP address (e.g., 192.168.x.x) for physical devices
    // Or use localhost with proper network configuration
    private let localServerIP = "localhost"
    private let localServerPort = "3001"

    // Production URLs
    private let prodMobileLoginUrl = "https://www.gridtvsports.com/login"

    // Local development URLs
    private var localMobileLoginUrl: String {
        return "http://\(localServerIP):\(localServerPort)/login"
    }

    // Active URL based on configuration
    private var mobileLoginUrl: String {
        return useLocalServer ? localMobileLoginUrl : prodMobileLoginUrl
    }

    private var fcmToken: String?

    override func viewDidLoad() {
        super.viewDidLoad()

        // Set view background to match app theme
        view.backgroundColor = UIColor(red: 0.1, green: 0.1, blue: 0.15, alpha: 1.0)

        setupWebView()
        setupLoadingView()
        setupProgressView()

        loadApp()
        requestNotificationPermission()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        // Hide status bar for fullscreen experience
        UIApplication.shared.isStatusBarHidden = false
    }

    override var prefersStatusBarHidden: Bool {
        return false
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    private func setupWebView() {
        // Configure WKWebView with custom settings
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        // Enable JavaScript and other features
        let preferences = WKPreferences()
        preferences.javaScriptEnabled = true
        configuration.preferences = preferences

        // Enable JavaScript bridge
        let userContentController = configuration.userContentController
        userContentController.add(self, name: "iosApp")

        // Inject viewport meta tag to disable zoom
        let disableZoomScript = """
            var meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.getElementsByTagName('head')[0].appendChild(meta);
        """
        let disableZoomUserScript = WKUserScript(source: disableZoomScript, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        userContentController.addUserScript(disableZoomUserScript)

        // Create the webview with proper frame
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false

        // Set background color to match app background
        webView.backgroundColor = UIColor(red: 0.1, green: 0.1, blue: 0.15, alpha: 1.0)
        webView.isOpaque = false
        webView.scrollView.backgroundColor = UIColor(red: 0.1, green: 0.1, blue: 0.15, alpha: 1.0)

        // Disable zoom
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.maximumZoomScale = 1.0
        webView.scrollView.bouncesZoom = false

        // IMPORTANT: Respect safe area insets (status bar, notch, home indicator)
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic

        // Set custom user agent
        let screenSize = UIScreen.main.bounds.size
        let scale = UIScreen.main.scale
        let customUserAgent = "GridTVSports-iOS/1.0 Screen/\(Int(screenSize.width * scale))x\(Int(screenSize.height * scale))"
        webView.customUserAgent = customUserAgent

        view.addSubview(webView)

        // Use Auto Layout to properly position WebView with safe area
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        print("📱 iOS App - WebView configured")
        print("📱 Screen size: \(screenSize.width)x\(screenSize.height) @ \(scale)x")
    }

    private func setupLoadingView() {
        // Create loading overlay
        loadingView = UIView(frame: view.bounds)
        loadingView.backgroundColor = UIColor(red: 0.1, green: 0.1, blue: 0.15, alpha: 1.0)
        loadingView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        // Activity indicator
        if #available(iOS 13.0, *) {
            activityIndicator = UIActivityIndicatorView(style: .large)
        } else {
            activityIndicator = UIActivityIndicatorView(style: .whiteLarge)
        }
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        activityIndicator.color = .white
        activityIndicator.startAnimating()
        loadingView.addSubview(activityIndicator)

        // Loading label
        loadingLabel = UILabel()
        loadingLabel.translatesAutoresizingMaskIntoConstraints = false
        loadingLabel.text = "Loading GridTV Sports..."
        loadingLabel.textColor = .white
        loadingLabel.textAlignment = .center
        loadingLabel.font = UIFont.systemFont(ofSize: 16)
        loadingView.addSubview(loadingLabel)

        // Add constraints
        NSLayoutConstraint.activate([
            activityIndicator.centerXAnchor.constraint(equalTo: loadingView.centerXAnchor),
            activityIndicator.centerYAnchor.constraint(equalTo: loadingView.centerYAnchor, constant: -30),
            loadingLabel.centerXAnchor.constraint(equalTo: loadingView.centerXAnchor),
            loadingLabel.topAnchor.constraint(equalTo: activityIndicator.bottomAnchor, constant: 20),
            loadingLabel.leadingAnchor.constraint(equalTo: loadingView.leadingAnchor, constant: 20),
            loadingLabel.trailingAnchor.constraint(equalTo: loadingView.trailingAnchor, constant: -20)
        ])

        view.addSubview(loadingView)
    }

    private func setupProgressView() {
        progressView = UIProgressView(progressViewStyle: .bar)
        progressView.translatesAutoresizingMaskIntoConstraints = false
        progressView.progressTintColor = UIColor(red: 0.0, green: 0.48, blue: 1.0, alpha: 1.0)
        view.addSubview(progressView)

        NSLayoutConstraint.activate([
            progressView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progressView.heightAnchor.constraint(equalToConstant: 2)
        ])

        // Observe loading progress
        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "estimatedProgress" {
            progressView.progress = Float(webView.estimatedProgress)
            if webView.estimatedProgress >= 1.0 {
                UIView.animate(withDuration: 0.3, delay: 0.1, options: .curveEaseOut, animations: {
                    self.progressView.alpha = 0
                }, completion: { _ in
                    self.progressView.progress = 0
                    self.progressView.alpha = 1
                })
            }
        }
    }

    private func loadApp() {
        showLoading()
        guard let url = URL(string: mobileLoginUrl) else {
            showError("Invalid URL")
            return
        }

        print("📱 Loading URL: \(mobileLoginUrl)")
        let request = URLRequest(url: url)
        webView.load(request)
    }

    private func showLoading() {
        loadingView.isHidden = false
        activityIndicator.startAnimating()
    }

    private func hideLoading() {
        UIView.animate(withDuration: 0.3) {
            self.loadingView.alpha = 0
        } completion: { _ in
            self.loadingView.isHidden = true
            self.loadingView.alpha = 1
        }
    }

    private func showError(_ message: String) {
        loadingLabel.text = message
        activityIndicator.stopAnimating()

        // Retry after 5 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
            self.loadApp()
        }
    }

    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                print("📱 Notification permission granted")
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            } else {
                print("📱 Notification permission denied")
            }
        }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("📱 Page loaded: \(webView.url?.absoluteString ?? "unknown")")

        // Log viewport info for debugging
        webView.evaluateJavaScript("""
            (function() {
                console.log('📱 iOS App - Viewport: ' + window.innerWidth + 'x' + window.innerHeight);
                console.log('📱 iOS App - Screen: ' + screen.width + 'x' + screen.height);
                console.log('📱 iOS App - DevicePixelRatio: ' + window.devicePixelRatio);
            })();
        """)

        hideLoading()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("📱 Navigation failed: \(error.localizedDescription)")
        showError("Connection error: \(error.localizedDescription)")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("📱 Provisional navigation failed: \(error.localizedDescription)")
        showError("Connection error: \(error.localizedDescription)")
    }

    // MARK: - WKUIDelegate

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        // Handle window.open() by loading in the same webview
        if navigationAction.targetFrame == nil {
            webView.load(navigationAction.request)
        }
        return nil
    }

    // Handle JavaScript alerts
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            completionHandler()
        })
        present(alert, animated: true)
    }

    // Handle JavaScript confirms
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            completionHandler(true)
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in
            completionHandler(false)
        })
        present(alert, animated: true)
    }

    deinit {
        webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
    }
}

// MARK: - WKScriptMessageHandler

extension ViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "iosApp" else { return }

        // Handle messages from JavaScript
        if let body = message.body as? [String: Any] {
            if let method = body["method"] as? String {
                switch method {
                case "getFCMToken":
                    // Return FCM token to JavaScript
                    let token = fcmToken ?? ""
                    webView.evaluateJavaScript("window.iosAppCallback('\(token)')")

                case "isIOSApp":
                    webView.evaluateJavaScript("window.iosAppCallback(true)")

                case "getDeviceInfo":
                    let deviceInfo: [String: Any] = [
                        "model": UIDevice.current.model,
                        "systemVersion": UIDevice.current.systemVersion,
                        "isIOS": true
                    ]
                    if let jsonData = try? JSONSerialization.data(withJSONObject: deviceInfo),
                       let jsonString = String(data: jsonData, encoding: .utf8) {
                        webView.evaluateJavaScript("window.iosAppCallback(\(jsonString))")
                    }

                default:
                    print("📱 Unknown method: \(method)")
                }
            }
        }
    }
}
