import Foundation
import WebKit
import AppKit

final class Tester: NSObject, WKNavigationDelegate {
    private let webView: WKWebView
    private let url: URL
    private var phase = 0

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
        if phase == 0 {
            phase = 1
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                self.openCharacters()
            }
        }
    }

    private func openCharacters() {
        evaluate("""
        (() => {
          const button = Array.from(document.querySelectorAll('.nav-button')).find(node => node.innerText.includes('角色設定'));
          if (!button) return { step: 'open', ok: false };
          button.click();
          return { step: 'open', ok: true };
        })()
        """) { payload in
            print(payload)
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                self.fillAndSubmit()
            }
        }
    }

    private func fillAndSubmit() {
        evaluate("""
        (() => {
          const textInputs = Array.from(document.querySelectorAll('input.input'));
          const textareas = Array.from(document.querySelectorAll('textarea.textarea'));
          const selects = Array.from(document.querySelectorAll('select.select'));
          const nameInput = textInputs[0];
          if (nameInput) nameInput.value = 'UI角色保存驗證';
          if (nameInput) nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (nameInput) nameInput.dispatchEvent(new Event('change', { bubbles: true }));
          const titleInput = textInputs[1];
          if (titleInput) titleInput.value = '測試職稱';
          if (titleInput) titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (titleInput) titleInput.dispatchEvent(new Event('change', { bubbles: true }));
          const voiceSelect = selects[0];
          if (voiceSelect && voiceSelect.options.length > 1) {
            voiceSelect.value = voiceSelect.options[1].value;
            voiceSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
          const summary = textareas[0];
          if (summary) summary.value = '從 UI 自動填寫的角色摘要';
          if (summary) summary.dispatchEvent(new Event('input', { bubbles: true }));
          if (summary) summary.dispatchEvent(new Event('change', { bubbles: true }));
          const button = Array.from(document.querySelectorAll('button')).find(node => node.innerText.trim() === '建立角色');
          if (!button) return { step: 'submit', ok: false, reason: 'button-not-found' };
          button.click();
          return { step: 'submit', ok: true };
        })()
        """) { payload in
            print(payload)
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                self.inspect()
            }
        }
    }

    private func inspect() {
        evaluate("""
        ({
          title: document.querySelector('h1') ? document.querySelector('h1').innerText : '',
          pageText: document.querySelector('.page-content') ? document.querySelector('.page-content').innerText.slice(0, 1200) : '',
          errors: window.__codexErrors || [],
          flash: Array.from(document.querySelectorAll('.flash')).map(node => node.innerText)
        })
        """) { payload in
            print(payload)
            NSApplication.shared.terminate(nil)
        }
    }

    private func evaluate(_ script: String, completion: @escaping (String) -> Void) {
        webView.evaluateJavaScript(script) { value, error in
            if let error {
                completion("JS_ERROR: \(error.localizedDescription)")
                return
            }
            completion(String(describing: value ?? "nil"))
        }
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
    URLSession.shared.dataTask(with: request) { data, _, _ in
        defer { semaphore.signal() }
        guard let data else { return }
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
    fputs("login failed\n", stderr)
    exit(1)
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let tester = Tester(url: baseURL, token: token)
tester.start()
