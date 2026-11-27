import Foundation
import WebKit

/// Serves the bundled web app from a custom scheme instead of file://.
///
/// file:// cannot host this app: WebKit refuses to load ES modules from a file
/// origin (opaque origin -> CORS failure), and BrowserRouter needs a real origin
/// for the History API. A WKURLSchemeHandler gives both. This replaces a
/// file:///Users/<name>/... absolute path, so the app works wherever it is
/// installed.
final class WebBundleSchemeHandler: NSObject, WKURLSchemeHandler {

    static let scheme = "omnitaps"
    static let host = "local"

    /// URL to load once the handler is registered. The path must be "/" so
    /// BrowserRouter resolves the Home route; "/index.html" would fall through
    /// to the catch-all NotFound route.
    static func startURL() -> URL {
        URL(string: "\(scheme)://\(host)/")!
    }

    private let root: URL

    init(root: URL) {
        self.root = root.standardizedFileURL
        super.init()
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else {
            return fail(task, "missing url")
        }

        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }

        // Reject traversal outside the bundle root.
        let candidate = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard candidate.path == root.path || candidate.path.hasPrefix(root.path + "/") else {
            return fail(task, "path outside bundle")
        }

        // SPA fallback: only extensionless paths (client-side routes such as
        // /demo) render index.html. A missing asset keeps its 404: answering
        // /_vercel/insights/script.js with HTML would make the browser parse
        // markup as JavaScript and report a bogus SyntaxError.
        var fileURL = candidate
        if !FileManager.default.fileExists(atPath: fileURL.path) {
            guard url.pathExtension.isEmpty else {
                return notFound(task, url)
            }
            fileURL = root.appendingPathComponent("index.html")
        }

        guard let data = try? Data(contentsOf: fileURL) else {
            return fail(task, "cannot read \(fileURL.lastPathComponent)")
        }

        let mime = Self.mimeType(forExtension: fileURL.pathExtension)
        let response = URLResponse(
            url: url,
            mimeType: mime,
            expectedContentLength: data.count,
            textEncodingName: mime.hasPrefix("text/") || mime.contains("json") ? "utf-8" : nil
        )
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private func notFound(_ task: WKURLSchemeTask, _ url: URL) {
        let body = Data("Not found\n".utf8)
        let response = HTTPURLResponse(
            url: url,
            statusCode: 404,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "text/plain; charset=utf-8"]
        )!
        task.didReceive(response)
        task.didReceive(body)
        task.didFinish()
    }

    private func fail(_ task: WKURLSchemeTask, _ message: String) {
        task.didFailWithError(
            NSError(domain: "WebBundleSchemeHandler", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: message])
        )
    }

    private static func mimeType(forExtension ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html"
        case "js", "mjs": return "text/javascript"
        case "css": return "text/css"
        case "json", "webmanifest": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "gif": return "image/gif"
        case "ico": return "image/x-icon"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        case "ttf": return "font/ttf"
        case "otf": return "font/otf"
        case "mp4": return "video/mp4"
        case "webm": return "video/webm"
        case "txt": return "text/plain"
        default: return "application/octet-stream"
        }
    }
}
