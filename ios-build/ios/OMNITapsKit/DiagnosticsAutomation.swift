#if DEBUG
import UIKit
import WebKit

/// Launch-argument hooks that exercise the tester-diagnostics paths without
/// hand-tapping anything. Debug builds only; see README "Automation hooks".
///
///   -OmniTapsDeepLink YES            start on omnitaps://local/demo
///   -OmniTapsDiagnosticsSelfTest YES throw a real JS error + rejection
///   -OmniTapsBadNavigation YES       load a bundle path the handler cannot read
///   -OmniTapsDiagnosticsUITest YES   tap the bubble and run Copy/Share/Clear
enum DiagnosticsAutomation {

    private static var arguments: [String] { ProcessInfo.processInfo.arguments }

    /// `-OmniTapsDeepLink YES` starts on a real client-side route, which proves
    /// the SPA fallback still serves `BrowserRouter` paths.
    static var startURLOverride: URL? {
        guard arguments.contains("-OmniTapsDeepLink") else { return nil }
        return URL(string: "\(WebBundleSchemeHandler.scheme)://\(WebBundleSchemeHandler.host)/demo")
    }

    static func run(webView: WKWebView, anchor: UIViewController?, button: UIButton?) {
        if arguments.contains("-OmniTapsDiagnosticsSelfTest") {
            throwSyntheticErrors(in: webView)
        }
        if arguments.contains("-OmniTapsBadNavigation") {
            loadUnreadableBundlePath(in: webView)
        }
        if arguments.contains("-OmniTapsDiagnosticsUITest") {
            runUITest(anchor: anchor, button: button)
        }
    }

    // MARK: - JS error capture

    private static func throwSyntheticErrors(in webView: WKWebView) {
        let script = """
        setTimeout(function () { throw new Error('omnitaps diagnostics self-test'); }, 0);
        Promise.reject(new Error('omnitaps diagnostics self-test rejection'));
        null;
        """
        webView.evaluateJavaScript(script) { _, _ in
            DiagnosticsLog.shared.record("self-test", "synthetic js-error and unhandled-rejection dispatched")
        }
    }

    // MARK: - Navigation failure capture

    private static func loadUnreadableBundlePath(in webView: WKWebView) {
        // Two triggers do NOT work here: WebKit silently ignores an unregistered
        // scheme, and a refused TCP connection (https://127.0.0.1:1/) becomes
        // about:blank plus didFinish. A path the scheme handler cannot read
        // fails for real: task.didFailWithError surfaces as a navigation
        // failure with the attempted URL, domain and code.
        let failing = URL(string: "\(WebBundleSchemeHandler.scheme)://\(WebBundleSchemeHandler.host)/assets")!
        DiagnosticsLog.shared.record("self-test", "loading unreadable bundle path \(failing.absoluteString)")
        webView.load(URLRequest(url: failing))
    }

    // MARK: - Diagnostics UI flow

    private static func runUITest(anchor: UIViewController?, button: UIButton?) {
        guard let anchor, let button else {
            NSLog("[OMNITAPS_DIAG_UI] {\"present\":false,\"reason\":\"missing anchor or button\"}")
            return
        }

        button.sendActions(for: .touchUpInside)

        guard let navigation = anchor.presentedViewController as? UINavigationController,
              let diagnostics = navigation.viewControllers.first as? DiagnosticsViewController else {
            NSLog("[OMNITAPS_DIAG_UI] {\"present\":false,\"reason\":\"sheet did not present\"}")
            return
        }

        // Bar items and the toolbar are built in viewDidLoad, which has not run
        // at the instant present() returns.
        diagnostics.loadViewIfNeeded()

        let logBefore = DiagnosticsLog.shared.read()

        fire(diagnostics.navigationItem.leftBarButtonItem, on: diagnostics)   // Copy
        // Never read UIPasteboard.general back here: on iOS 26 that blocks the
        // main thread on a paste-permission alert when the clipboard was last
        // written by another process. The host verifies with `simctl pbpaste`.
        let copied = DiagnosticsLog.shared.read()
        let copyOk = copied.contains("[session]") && copied.contains("Log path:")

        // The sheet is still animating in, so a present() in the same turn is
        // dropped. Share after the transition and poll for the activity
        // controller — a slow simulator can take seconds to attach it.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            Self.fire(diagnostics.navigationItem.rightBarButtonItem, on: diagnostics)   // Share
            Self.waitForActivity(in: diagnostics, anchor: anchor, attemptsLeft: 15) { activity in
                Self.fire(diagnostics.toolbarItems?.first, on: diagnostics)             // Clear
                let afterClear = DiagnosticsLog.shared.read()
                let clearOk = !afterClear.contains("[session]") && !afterClear.contains("[navigation]")

                NSLog(
                    "[OMNITAPS_DIAG_UI] {\"present\":true,\"copyChars\":%d,\"copyHasLogLines\":%@,\"logCharsBefore\":%d,\"sharePresented\":%@,\"popoverAnchor\":\"%@\",\"clearEmptied\":%@}",
                    copied.count,
                    copyOk ? "true" : "false",
                    logBefore.count,
                    activity != nil ? "true" : "false",
                    popoverAnchor(for: activity),
                    clearOk ? "true" : "false"
                )
            }
        }
    }

    private static func popoverAnchor(for activity: UIActivityViewController?) -> String {
        guard let activity else { return "none" }
        guard let popover = activity.popoverPresentationController else { return "no-popover" }
        if popover.barButtonItem != nil { return "barButtonItem" }
        if popover.sourceView != nil { return "sourceView" }
        return "unanchored"
    }

    /// UIKit may attach the activity controller to the navigation controller or
    /// the anchor rather than to the child controller, so look down each chain.
    private static func waitForActivity(
        in diagnostics: UIViewController,
        anchor: UIViewController,
        attemptsLeft: Int,
        completion: @escaping (UIActivityViewController?) -> Void
    ) {
        if let activity = findActivity(in: diagnostics)
            ?? findActivity(in: diagnostics.navigationController)
            ?? findActivity(in: anchor) {
            completion(activity)
            return
        }
        guard attemptsLeft > 0 else {
            completion(nil)
            return
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            Self.waitForActivity(
                in: diagnostics,
                anchor: anchor,
                attemptsLeft: attemptsLeft - 1,
                completion: completion
            )
        }
    }

    private static func findActivity(in controller: UIViewController?) -> UIActivityViewController? {
        var current = controller
        while let candidate = current {
            if let activity = candidate as? UIActivityViewController {
                return activity
            }
            current = candidate.presentedViewController
        }
        return nil
    }

    /// Runs the real target/action of a bar button item. `sendAction` did not
    /// reach these private @objc handlers from an automation launch, so the
    /// selector is performed on the item's own target (the diagnostics
    /// controller) — the same wiring a tap uses.
    private static func fire(_ item: UIBarButtonItem?, on controller: UIViewController) {
        guard let item, let action = item.action else { return }
        let target = (item.target as? NSObject) ?? controller
        _ = target.perform(action, with: item)
    }
}
#endif
