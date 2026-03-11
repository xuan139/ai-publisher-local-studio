import Foundation
import WebKit
import AppKit

final class Inspector: NSObject, WKNavigationDelegate {
    private let webView: WKWebView
    private let url: URL
    private var stage = 0

    init(url: URL, token: String) {
        self.url = url
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        controller.addUserScript(WKUserScript(source: """
        window.__codexErrors = [];
        window.addEventListener('error', function(event) {
          window.__codexErrors.push(String(event.message || event.error || 'unknown'));
        });
        window.addEventListener('unhandledrejection', function(event) {
          const reason = event.reason && (event.reason.message || event.reason.toString()) || 'unknown';
          window.__codexErrors.push('UNHANDLED:' + reason);
        });
        localStorage.setItem('ai-publisher-token', '\(token)');
        """, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = controller
        self.webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 1440, height: 1200), configuration: config)
        super.init()
        webView.navigationDelegate = self
    }

    func start() {
        webView.load(URLRequest(url: url))
        NSApplication.shared.run()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if stage == 0 {
            stage = 1
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                self.inspectRoute(label: "initial")
            }
            return
        }
    }

    private func inspectRoute(label: String) {
        evaluate("""
        ({
          title: document.querySelector('h1') ? document.querySelector('h1').innerText : '',
          routeButtons: Array.from(document.querySelectorAll('.nav-button span')).map(node => node.innerText),
          pageText: document.querySelector('.page-content') ? document.querySelector('.page-content').innerText.slice(0, 800) : '',
          errors: window.__codexErrors || []
        })
        """) { payload in
            print("=== \(label) ===")
            print(payload)
            if label == "initial" {
                self.clickAndInspect(menuLabel: "文本準備", label: "text")
            } else if label == "text" {
                self.clickAndInspect(menuLabel: "角色設定", label: "characters")
            } else {
                NSApplication.shared.terminate(nil)
            }
        }
    }

    private func clickAndInspect(menuLabel: String, label: String) {
        evaluate("""
        (() => {
          const buttons = Array.from(document.querySelectorAll('.nav-button'));
          const target = buttons.find((button) => button.innerText.includes('\(menuLabel)'));
          if (!target) return { clicked: false, reason: 'not-found' };
          target.click();
          return { clicked: true };
        })()
        """) { payload in
            print("click \(menuLabel): \(payload)")
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                self.inspectRoute(label: label)
            }
        }
    }

    private func evaluate(_ script: String, completion: @escaping (String) -> Void) {
        webView.evaluateJavaScript(script) { value, error in
            if let error {
                completion("JS_ERROR: \(error.localizedDescription)")
                return
            }
            if let value {
                completion(String(describing: value))
            } else {
                completion("nil")
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("navigation failed: \(error.localizedDescription)")
        NSApplication.shared.terminate(nil)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("provisional failed: \(error.localizedDescription)")
        NSApplication.shared.terminate(nil)
    }
}

func loginToken(baseURL: URL) -> String {
    var request = URLRequest(url: baseURL.appendingPathComponent("api/auth/login"))
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try! JSONSerialization.data(withJSONObject: [
        "email": "admin@example.com",
        "password": "admin123",
    ])

    let semaphore = DispatchSemaphore(value: 0)
    var result = ""
    URLSession.shared.dataTask(with: request) { data, _, error in
        defer { semaphore.signal() }
        guard error == nil, let data else { return }
        if let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            result = payload["token"] as? String ?? ""
        }
    }.resume()
    semaphore.wait()
    return result
}

let baseURL = URL(string: "http://127.0.0.1:8000/")!
let token = loginToken(baseURL: baseURL)
guard !token.isEmpty else {
    fputs("failed to login\n", stderr)
    exit(1)
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let inspector = Inspector(url: baseURL, token: token)
inspector.start()
