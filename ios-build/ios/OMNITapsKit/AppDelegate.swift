import UIKit
import WebKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var webView: WKWebView?
    private var diagnosticsMessageHandler: DiagnosticsMessageHandler?
    private weak var presentationAnchor: UIViewController?
    private var diagnosticsButton: UIButton?
    private var lastRequestedURL: URL?
    private var reloadAttempts = 0

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        self.window = window

        // The web app is bundled at OmniTaps.app/www (see stage-web.sh).
        guard let www = Bundle.main.resourceURL?.appendingPathComponent("www", isDirectory: true) else {
            DiagnosticsLog.shared.record("fatal", "bundled web app (www) is missing")
            window.rootViewController = fallback("The bundled web app (www) is missing.")
            window.makeKeyAndVisible()
            return true
        }

        // Debug hook: start on a real client-side route.
        //   xcrun simctl launch <udid> com.onouh.omnitaps -OmniTapsDeepLink YES
        #if DEBUG
        let startURL = DiagnosticsAutomation.startURLOverride ?? WebBundleSchemeHandler.startURL()
        #else
        let startURL = WebBundleSchemeHandler.startURL()
        #endif
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(
            WebBundleSchemeHandler(root: www),
            forURLScheme: WebBundleSchemeHandler.scheme
        )

        // Diagnostics bridge: installed before any app code runs, so boot-time
        // module/parse errors are captured too.
        let handler = DiagnosticsMessageHandler()
        configuration.userContentController.add(handler, name: DiagnosticsLog.messageHandlerName)
        configuration.userContentController.addUserScript(DiagnosticsBootstrap.userScript())
        self.diagnosticsMessageHandler = handler

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.isOpaque = false
        webView.navigationDelegate = self
        webView.load(URLRequest(url: startURL))
        self.webView = webView

        DiagnosticsLog.shared.recordSessionStart(url: startURL)

        let controller = UIViewController()
        controller.view.backgroundColor = .systemBackground
        controller.view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: controller.view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: controller.view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: controller.view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: controller.view.trailingAnchor)
        ])

        let diagnosticsButton = DiagnosticsPresenter.makeButton(
            target: self,
            action: #selector(showDiagnostics)
        )
        controller.view.addSubview(diagnosticsButton)
        NSLayoutConstraint.activate([
            diagnosticsButton.trailingAnchor.constraint(
                equalTo: controller.view.safeAreaLayoutGuide.trailingAnchor, constant: -12
            ),
            diagnosticsButton.bottomAnchor.constraint(
                equalTo: controller.view.safeAreaLayoutGuide.bottomAnchor, constant: -12
            )
        ])

        self.diagnosticsButton = diagnosticsButton
        presentationAnchor = controller
        window.rootViewController = controller
        window.makeKeyAndVisible()
        return true
    }

    @objc private func showDiagnostics() {
        guard let anchor = presentationAnchor else { return }
        let presenter = anchor.presentedViewController ?? anchor
        DiagnosticsPresenter.present(from: presenter)
    }

    private func fallback(_ message: String) -> UIViewController {
        let controller = UIViewController()
        controller.view.backgroundColor = .systemBackground
        let label = UILabel(frame: controller.view.bounds)
        label.text = message
        label.textAlignment = .center
        label.numberOfLines = 0
        label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        controller.view.addSubview(label)
        return controller
    }
}

extension AppDelegate: WKNavigationDelegate {

    /// The URL a failure refers to is the one that was *attempted*; after a
    /// provisional failure `webView.url` still points at the previous page.
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        lastRequestedURL = navigationAction.request.url
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        reloadAttempts = 0
        DiagnosticsLog.shared.record("navigation", "didFinish \(webView.url?.absoluteString ?? "?")")
        #if DEBUG
        // didFinish fires before React mounts, and the app plays a short
        // "network boot" intro, so sampling here reports a loading screen.
        // Poll until the DOM settles on real content instead.
        pollForSettledPage(webView, attempt: 0, lastText: nil, stableCount: 0)
        #endif
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        recordNavigationFailure("didFail", webView: webView, error: error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        recordNavigationFailure("didFailProvisionalNavigation", webView: webView, error: error)
    }

    /// The classic silent white screen: WebKit kills the content process under
    /// memory pressure and the view stays blank with no error callback.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        let url = webView.url?.absoluteString ?? "?"
        DiagnosticsLog.shared.record(
            "web-process-terminated",
            "WebKit content process died at \(url) (reload attempt \(reloadAttempts + 1))"
        )

        guard reloadAttempts < 3 else {
            DiagnosticsLog.shared.record("web-process-terminated", "giving up after \(reloadAttempts) reloads")
            return
        }
        reloadAttempts += 1
        webView.reload()
    }

    private func recordNavigationFailure(_ phase: String, webView: WKWebView, error: Error) {
        let url = lastRequestedURL?.absoluteString ?? webView.url?.absoluteString ?? "?"
        DiagnosticsLog.shared.record(
            "navigation-failed",
            "\(phase) at \(url): \(error.localizedDescription) · \((error as NSError).domain) \((error as NSError).code)"
        )
        NSLog("[OMNITAPS_SMOKE_FAIL] %@ failed: %@", phase, error.localizedDescription)
    }

    #if DEBUG
    private static let pollInterval: TimeInterval = 0.4
    private static let maxPolls = 75           // ~30s
    private static let minimumTextLength = 250
    private static let requiredStableSamples = 3

    private static let bootMarkers = ["Connecting your", "NETWORK BOOT", "Loading…", "Loading..."]

    private func pollForSettledPage(
        _ webView: WKWebView,
        attempt: Int,
        lastText: String?,
        stableCount: Int
    ) {
        let script = """
        (() => {
          const root = document.getElementById('root');
          return JSON.stringify({
            rootChildren: root ? root.children.length : -1,
            text: document.body.innerText.replace(/\\s+/g, ' ').trim(),
            readyState: document.readyState,
            url: location.href
          });
        })()
        """

        webView.evaluateJavaScript(script) { [weak self] result, error in
            guard let self else { return }

            var sample: [String: Any] = [:]
            if let json = result as? String,
               let data = json.data(using: .utf8),
               let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                sample = parsed
            }

            let text = sample["text"] as? String ?? ""
            let children = sample["rootChildren"] as? Int ?? -1
            let isBootScreen = Self.bootMarkers.contains {
                text.range(of: $0, options: .caseInsensitive) != nil
            }

            let isStableSample = !isBootScreen
                && children > 0
                && text.count >= Self.minimumTextLength
                && text == lastText
            let newStableCount = isStableSample ? stableCount + 1 : 0

            if newStableCount >= Self.requiredStableSamples - 1 {
                self.reportSettled(webView, text: text, children: children, url: sample["url"] as? String ?? "")
                return
            }

            if attempt >= Self.maxPolls {
                DiagnosticsLog.shared.record(
                    "render-stalled",
                    "page never settled after \(attempt) polls (rootChildren=\(children), text=\(String(text.prefix(160))))"
                )
                NSLog(
                    "[OMNITAPS_SMOKE_FAIL] page never settled after %d polls (rootChildren=%d, text=%@)",
                    attempt, children, String(text.prefix(160))
                )
                return
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + Self.pollInterval) {
                self.pollForSettledPage(
                    webView,
                    attempt: attempt + 1,
                    lastText: text,
                    stableCount: newStableCount
                )
            }
            _ = error
        }
    }

    private func reportSettled(_ webView: WKWebView, text: String, children: Int, url: String) {
        let script = """
        (() => {
          const root = document.getElementById('root');
          const fullText = document.body.innerText.replace(/\\s+/g, ' ').trim();
          let storage = 'ok';
          try { localStorage.setItem('__probe', '1'); localStorage.removeItem('__probe'); }
          catch (e) { storage = 'THROWS: ' + e.name; }
          let pushState = 'ok';
          try { history.pushState({}, '', '/demo'); } catch (e) { pushState = 'THROWS: ' + e.name; }
          // Unified logging truncates long messages, which would drop the
          // storage/pushState keys. Send a bounded prefix plus the full length.
          return JSON.stringify({
            url: location.href,
            rootChildren: root ? root.children.length : -1,
            textLength: fullText.length,
            text: fullText.slice(0, 600),
            storage,
            pushState
          });
        })()
        """

        webView.evaluateJavaScript(script) { [weak self] result, error in
            if let json = result as? String {
                NSLog("[OMNITAPS_SMOKE] %@", json)
            } else {
                NSLog(
                    "[OMNITAPS_SMOKE] {\"url\":\"%@\",\"rootChildren\":%d,\"text\":\"%@\",\"note\":\"postMountProbeFailed %@\"}",
                    url, children, text.replacingOccurrences(of: "\"", with: "'"),
                    error?.localizedDescription ?? "unknown"
                )
            }
            #if DEBUG
            DiagnosticsAutomation.run(
                webView: webView,
                anchor: self?.presentationAnchor,
                button: self?.diagnosticsButton
            )
            #endif
        }
    }

    #endif
}
