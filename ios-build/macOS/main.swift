import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate {

    private var window: NSWindow?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // The web app is bundled at Contents/Resources/www (see stage-web.sh).
        guard let www = Bundle.main.resourceURL?.appendingPathComponent("www", isDirectory: true) else {
            presentFatal("The bundled web app (Resources/www) is missing.")
            return
        }

        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(
            WebBundleSchemeHandler(root: www),
            forURLScheme: WebBundleSchemeHandler.scheme
        )

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.load(URLRequest(url: WebBundleSchemeHandler.startURL()))

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1200, height: 800),
            styleMask: [.titled, .resizable, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "OmniTaps"
        window.minSize = NSSize(width: 480, height: 480)
        window.center()
        window.contentView = webView
        window.makeKeyAndOrderFront(nil)
        self.window = window

        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    private func presentFatal(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "OmniTaps could not start"
        alert.informativeText = message
        alert.runModal()
        NSApp.terminate(nil)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
