import UIKit
import WebKit

// MARK: - Rotating on-device log

/// Append-only diagnostics log kept in Application Support.
///
/// Testers install this build on devices we cannot attach a debugger to, so
/// failures are only visible if the app writes them down. The log rotates at
/// 256 KB into a single `.1` backup so it can never grow without bound, and it
/// is written from a serial queue so JS messages, navigation callbacks and the
/// process-death handler never interleave partial lines.
final class DiagnosticsLog {

    static let shared = DiagnosticsLog()

    static let messageHandlerName = "omnitapsDiag"

    private let queue = DispatchQueue(label: "com.onouh.omnitaps.diagnostics")
    private let maxBytes: UInt64 = 256 * 1024
    private let maxMessageLength = 4000

    private let formatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private lazy var fileURL: URL? = {
        let manager = FileManager.default
        guard let base = manager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return nil
        }
        let directory = base.appendingPathComponent("OmniTaps", isDirectory: true)
        try? manager.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory.appendingPathComponent("diagnostics.log")
    }()

    /// The path is surfaced in the diagnostics screen so a tester can describe
    /// where the file lives if they use Finder / Xcode to pull it.
    var logPath: String { fileURL?.path ?? "(unavailable)" }

    func record(_ category: String, _ message: String) {
        let line = "\(formatter.string(from: Date())) [\(category)] \(sanitize(message))\n"
        queue.async { [weak self] in
            self?.append(line)
        }
    }

    func recordSessionStart(url: URL) {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        let device = UIDevice.current
        record(
            "session",
            "OmniTaps \(version) (\(build)) · \(device.systemName) \(device.systemVersion) · \(device.model) · start \(url.absoluteString)"
        )
    }

    func read() -> String {
        queue.sync {
            guard let url = fileURL, let text = try? String(contentsOf: url, encoding: .utf8) else {
                return "No diagnostics recorded yet.\n\nLog path: \(logPath)"
            }
            return "Log path: \(logPath)\n\n\(text)"
        }
    }

    func clear() {
        queue.sync {
            guard let url = fileURL else { return }
            try? FileManager.default.removeItem(at: url)
            try? FileManager.default.removeItem(at: url.appendingPathExtension("1"))
        }
    }

    // MARK: private

    private func sanitize(_ message: String) -> String {
        let trimmed = String(message.prefix(maxMessageLength))
            .replacingOccurrences(of: "\n", with: " ⏎ ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return message.count > maxMessageLength ? trimmed + " …(truncated)" : trimmed
    }

    private func append(_ line: String) {
        guard let url = fileURL, let data = line.data(using: .utf8) else { return }
        rotateIfNeeded(url)

        if let handle = try? FileHandle(forWritingTo: url) {
            defer { try? handle.close() }
            _ = try? handle.seekToEnd()
            try? handle.write(contentsOf: data)
            // Crash diagnostics are worthless if the tail sits in a buffer.
            try? handle.synchronize()
        } else {
            try? data.write(to: url, options: .atomic)
        }
    }

    private func rotateIfNeeded(_ url: URL) {
        let attributes = try? FileManager.default.attributesOfItem(atPath: url.path)
        let size = attributes?[.size] as? UInt64 ?? 0
        guard size > maxBytes else { return }

        let backup = url.appendingPathExtension("1")
        try? FileManager.default.removeItem(at: backup)
        try? FileManager.default.moveItem(at: url, to: backup)
    }
}

// MARK: - JS -> native bridge

/// Receives `window.webkit.messageHandlers.omnitapsDiag` payloads.
final class DiagnosticsMessageHandler: NSObject, WKScriptMessageHandler {

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == DiagnosticsLog.messageHandlerName else { return }

        if let body = message.body as? [String: Any], let kind = body["kind"] as? String {
            let detail = body["detail"] as? String ?? "(no detail)"
            DiagnosticsLog.shared.record(kind, detail)
        } else {
            DiagnosticsLog.shared.record("js-unknown", String(describing: message.body))
        }
    }
}

/// Installed at document start, before any app code runs, so boot-time errors
/// (module evaluation, early render crashes) are captured too.
enum DiagnosticsBootstrap {

    static func userScript() -> WKUserScript {
        WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    }

    private static let source = """
    (function () {
      if (window.__omnitapsDiagnosticsInstalled) { return; }
      window.__omnitapsDiagnosticsInstalled = true;

      var consoleErrorBudget = 40;

      function send(kind, detail) {
        try {
          if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.omnitapsDiag) {
            window.webkit.messageHandlers.omnitapsDiag.postMessage({
              kind: kind,
              detail: String(detail)
            });
          }
        } catch (e) { /* never let logging throw into the app */ }
      }

      function describe(value) {
        try {
          if (value instanceof Error) {
            return value.name + ': ' + value.message + (value.stack ? '\\n' + value.stack : '');
          }
          if (typeof value === 'string') { return value; }
          return JSON.stringify(value);
        } catch (e) {
          return String(value);
        }
      }

      window.addEventListener('error', function (event) {
        var target = event.target;
        if (target && target !== window && (target.src || target.href)) {
          send('resource-error', (target.tagName || '?') + ' ' + (target.src || target.href));
          return;
        }
        var where = (event.filename || '?') + ':' + (event.lineno || 0) + ':' + (event.colno || 0);
        var stack = event.error && event.error.stack ? '\\n' + event.error.stack : '';
        send('js-error', (event.message || 'unknown error') + ' @ ' + where + stack);
      }, true);

      window.addEventListener('unhandledrejection', function (event) {
        send('unhandled-rejection', describe(event.reason));
      });

      if (window.console && typeof window.console.error === 'function') {
        var nativeError = window.console.error.bind(window.console);
        window.console.error = function () {
          if (consoleErrorBudget > 0) {
            consoleErrorBudget -= 1;
            var parts = [];
            for (var i = 0; i < arguments.length; i += 1) { parts.push(describe(arguments[i])); }
            send('console-error', parts.join(' '));
          }
          nativeError.apply(null, arguments);
        };
      }

      send('page-load', location.href);
    })();
    """
}

// MARK: - Diagnostics screen

final class DiagnosticsViewController: UIViewController {

    private let textView = UITextView()

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Diagnostics"
        view.backgroundColor = .systemBackground

        textView.isEditable = false
        textView.alwaysBounceVertical = true
        textView.font = .monospacedSystemFont(ofSize: 12, weight: .regular)
        textView.textContainerInset = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        textView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(textView)
        NSLayoutConstraint.activate([
            textView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            textView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            textView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            textView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])

        navigationItem.leftBarButtonItem = UIBarButtonItem(
            title: "Copy", style: .plain, target: self, action: #selector(copyLog)
        )
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .action, target: self, action: #selector(shareLog(_:))
        )
        navigationItem.rightBarButtonItem?.accessibilityLabel = "Share diagnostics"

        toolbarItems = [
            UIBarButtonItem(title: "Clear", style: .plain, target: self, action: #selector(clearLog)),
            UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil),
            UIBarButtonItem(title: "Close", style: .done, target: self, action: #selector(close))
        ]
        navigationController?.isToolbarHidden = false

        reload()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if isBeingDismissed || navigationController?.isBeingDismissed == true {
            navigationController?.isToolbarHidden = true
        }
    }

    private func reload() {
        textView.text = DiagnosticsLog.shared.read()
        textView.scrollRangeToVisible(NSRange(location: 0, length: 0))
    }

    /// Also driven by the debug UI test through the real bar button target.
    /// Returns the text that was copied so callers can report it without
    /// reading the pasteboard back (iOS 26 blocks on a paste-permission prompt
    /// when the pasteboard was last written by another process).
    @discardableResult
    func copyToPasteboard() -> String {
        let text = DiagnosticsLog.shared.read()
        UIPasteboard.general.string = text
        return text
    }

    func presentShareSheet(from sender: UIBarButtonItem?) {
        let text = DiagnosticsLog.shared.read()
        let activity = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        if let popover = activity.popoverPresentationController {
            if let sender {
                popover.barButtonItem = sender
            } else {
                // iPad requires an anchor; a bar button is preferred, this keeps
                // the presentation legal if the item ever disappears.
                popover.sourceView = view
                popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            }
        }
        present(activity, animated: true)
    }

    func clearLogAndReload() {
        DiagnosticsLog.shared.clear()
        reload()
    }

    @objc private func copyLog() {
        copyToPasteboard()
        let feedback = UINotificationFeedbackGenerator()
        feedback.notificationOccurred(.success)
        navigationItem.leftBarButtonItem?.title = "Copied"
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.navigationItem.leftBarButtonItem?.title = "Copy"
        }
    }

    @objc private func shareLog(_ sender: UIBarButtonItem) {
        presentShareSheet(from: sender)
    }

    @objc private func clearLog() {
        clearLogAndReload()
    }

    @objc private func close() {
        dismiss(animated: true)
    }
}

// MARK: - Entry point used by the shell

enum DiagnosticsPresenter {

    /// Small, low-contrast affordance so the log is reachable on a tester's
    /// device without stealing space from the web UI.
    static func makeButton(target: Any, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setImage(UIImage(systemName: "exclamationmark.bubble"), for: .normal)
        button.tintColor = .white
        button.backgroundColor = UIColor.black.withAlphaComponent(0.38)
        button.layer.cornerRadius = 19
        button.alpha = 0.55
        button.accessibilityLabel = "Diagnostics log"
        button.accessibilityHint = "Shows recent app errors. Copy or share them."
        button.addTarget(target, action: action, for: .touchUpInside)
        NSLayoutConstraint.activate([
            button.widthAnchor.constraint(equalToConstant: 38),
            button.heightAnchor.constraint(equalToConstant: 38)
        ])
        return button
    }

    static func present(from viewController: UIViewController) {
        let controller = DiagnosticsViewController()
        let navigation = UINavigationController(rootViewController: controller)
        navigation.modalPresentationStyle = .pageSheet
        viewController.present(navigation, animated: true)
    }
}
