import AppKit
import Foundation
import WebKit

struct LoginResponse: Decodable {
    let token: String
}

enum CaptureError: Error, LocalizedError {
    case invalidArguments
    case invalidResponse
    case jsReturnedFalse(String)
    case timeout(String)

    var errorDescription: String? {
        switch self {
        case .invalidArguments:
            return "usage: swift capture_manual_screenshots.swift <base_url> <project_title> <output_dir> [width] [height] [scale]"
        case .invalidResponse:
            return "invalid response payload"
        case .jsReturnedFalse(let message):
            return message
        case .timeout(let message):
            return message
        }
    }
}

@MainActor
final class ManualScreenshotCapture: NSObject, WKNavigationDelegate {
    private enum Phase {
        case boot
        case waitingForAuthReload
        case capturing
        case finished
    }

    private let baseURL: URL
    private let projectTitle: String
    private let outputDirectory: URL
    private let width: CGFloat
    private let height: CGFloat
    private let scale: CGFloat
    private let webView: WKWebView

    private var token = ""
    private var phase: Phase = .boot

    init(baseURL: URL, projectTitle: String, outputDirectory: URL, width: CGFloat, height: CGFloat, scale: CGFloat) {
        self.baseURL = baseURL
        self.projectTitle = projectTitle
        self.outputDirectory = outputDirectory
        self.width = width
        self.height = height
        self.scale = scale

        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        self.webView = WKWebView(frame: CGRect(x: 0, y: 0, width: width, height: height), configuration: config)
        super.init()
        self.webView.navigationDelegate = self
    }

    func start() {
        Task {
            do {
                try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
                token = try await login()
                let request = URLRequest(url: baseURL)
                webView.load(request)
            } catch {
                fail(error)
            }
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        Task {
            do {
                switch phase {
                case .boot:
                    try await sleep(seconds: 0.6)
                    try await setAuthenticatedLocalState()
                    phase = .waitingForAuthReload
                    _ = try await evaluate("location.reload(); true;")
                case .waitingForAuthReload:
                    phase = .capturing
                    try await sleep(seconds: 1.2)
                    try await waitForText(projectTitle, timeout: 30)
                    try await captureAll()
                    phase = .finished
                    print("captured manual screenshots in \(outputDirectory.path)")
                    NSApp.terminate(nil)
                case .capturing, .finished:
                    break
                }
            } catch {
                fail(error)
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        fail(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        fail(error)
    }

    private func login() async throws -> String {
        var request = URLRequest(url: baseURL.appending(path: "api/auth/login"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "email": "admin@example.com",
            "password": "admin123",
        ])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200 ..< 300).contains(httpResponse.statusCode) else {
            throw CaptureError.invalidResponse
        }
        let payload = try JSONDecoder().decode(LoginResponse.self, from: data)
        return payload.token
    }

    private func setAuthenticatedLocalState() async throws {
        let script = """
        (() => {
          localStorage.setItem("ai-publisher-token", \(jsString(token)));
          localStorage.setItem("ai-publisher-locale", "zh-Hant");
          document.documentElement.lang = "zh-Hant";
          return true;
        })();
        """
        _ = try await evaluate(script)
    }

    private func captureAll() async throws {
        try await openProjectsAndSelectTarget()
        try await capture(named: "01_projects_overview.png")

        try await openRoute("文本準備", waitFor: "專案預設聲線")
        try await scrollPageContent(to: 380)
        try await sleep(seconds: 0.5)
        try await capture(named: "02_text_prep.png")

        try await openRoute("聲線設定", waitFor: "建立本地聲線設定")
        try await capture(named: "03_voice_setup.png")

        try await openRoute("生成任務", waitFor: "生成目前章節")
        try await capture(named: "04_generate_console.png")

        try await openRoute("審核校對", waitFor: "審核佇列")
        try await capture(named: "05_review_console.png")

        try await openRoute("匯出交付", waitFor: "專案匯出")
        try await waitForText("下載整書 TXT", timeout: 20)
        try await capture(named: "06_assemble_export.png")
    }

    private func openProjectsAndSelectTarget() async throws {
        try await clickText("專案")
        try await waitForText("專案列表", timeout: 20)
        try await clickText(projectTitle)
        try await waitForText(projectTitle, timeout: 20)
        try await waitForText("用全屏向導建立整本電子書", timeout: 20)
        try await scrollToTop()
        try await sleep(seconds: 0.5)
    }

    private func openRoute(_ routeLabel: String, waitFor waitText: String) async throws {
        try await clickText(routeLabel)
        try await waitForText(waitText, timeout: 20)
        try await scrollToTop()
        try await sleep(seconds: 0.5)
    }

    private func scrollToTop() async throws {
        let script = """
        (() => {
          window.scrollTo(0, 0);
          document.querySelector(".page-content")?.scrollTo(0, 0);
          document.querySelector(".main")?.scrollTo(0, 0);
          document.querySelector(".ebook-wizard-side")?.scrollTo(0, 0);
          document.querySelector(".ebook-wizard-stage")?.scrollTo(0, 0);
          return true;
        })();
        """
        _ = try await evaluate(script)
    }

    private func scrollPageContent(to offset: Double) async throws {
        let script = """
        (() => {
          const target = \(offset);
          window.scrollTo(0, target);
          document.querySelector(".page-content")?.scrollTo(0, target);
          document.querySelector(".main")?.scrollTo(0, target);
          return true;
        })();
        """
        _ = try await evaluate(script)
    }

    private func clickText(_ text: String, exact: Bool = true) async throws {
        let script = """
        (() => {
          const needle = \(jsString(text));
          const exact = \(exact ? "true" : "false");
          const candidates = Array.from(document.querySelectorAll("button, a, [role='button'], .text-action, .project-button, .nav-button"));
          const visible = candidates.filter((element) => {
            if (!element) return false;
            if (element.offsetParent !== null) return true;
            const style = window.getComputedStyle(element);
            return style.position === "fixed" || style.position === "sticky";
          });
          const target = visible.find((element) => {
            const label = (element.innerText || element.textContent || "").replace(/\\s+/g, " ").trim();
            return exact ? label === needle : label.includes(needle);
          });
          if (!target) return false;
          target.scrollIntoView({ block: "center", inline: "center" });
          target.click();
          return true;
        })();
        """
        guard try await evaluateBool(script) else {
            throw CaptureError.jsReturnedFalse("Could not click text: \(text)")
        }
        try await sleep(seconds: 0.65)
    }

    private func waitForText(_ text: String, timeout: TimeInterval) async throws {
        let predicate = """
        (() => {
          const needle = \(jsString(text));
          const elements = Array.from(document.querySelectorAll("body *"));
          return elements.some((element) => {
            const label = (element.innerText || element.textContent || "").replace(/\\s+/g, " ").trim();
            if (!label) return false;
            if (element.offsetParent === null) return false;
            return label.includes(needle);
          });
        })();
        """
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if try await evaluateBool(predicate) {
                return
            }
            try await sleep(seconds: 0.25)
        }
        throw CaptureError.timeout("Timed out while waiting for text: \(text)")
    }

    private func capture(named fileName: String) async throws {
        let outputURL = outputDirectory.appending(path: fileName)
        let configuration = WKSnapshotConfiguration()
        configuration.rect = CGRect(x: 0, y: 0, width: width, height: height)
        configuration.snapshotWidth = NSNumber(value: Double(width * scale))

        let image = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<NSImage, Error>) in
            webView.takeSnapshot(with: configuration) { image, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let image else {
                    continuation.resume(throwing: CaptureError.invalidResponse)
                    return
                }
                continuation.resume(returning: image)
            }
        }

        guard
            let tiffData = image.tiffRepresentation,
            let bitmap = NSBitmapImageRep(data: tiffData),
            let pngData = bitmap.representation(using: .png, properties: [:])
        else {
            throw CaptureError.invalidResponse
        }

        try pngData.write(to: outputURL)
        print("rendered \(outputURL.path)")
    }

    private func evaluate(_ script: String) async throws -> Any? {
        try await withCheckedThrowingContinuation { continuation in
            webView.evaluateJavaScript(script) { result, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: result)
            }
        }
    }

    private func evaluateBool(_ script: String) async throws -> Bool {
        let value = try await evaluate(script)
        if let number = value as? NSNumber {
            return number.boolValue
        }
        if let bool = value as? Bool {
            return bool
        }
        return false
    }

    private func sleep(seconds: TimeInterval) async throws {
        try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
    }

    private func jsString(_ value: String) -> String {
        let encoded = try? JSONSerialization.data(withJSONObject: [value], options: [])
        guard
            let encoded,
            let arrayString = String(data: encoded, encoding: .utf8),
            arrayString.count >= 2
        else {
            return "\"\""
        }
        return String(arrayString.dropFirst().dropLast())
    }

    private func fail(_ error: Error) {
        fputs("capture failed: \(error.localizedDescription)\n", stderr)
        exit(1)
    }
}

guard CommandLine.arguments.count >= 4 else {
    fputs("\(CaptureError.invalidArguments.localizedDescription)\n", stderr)
    exit(1)
}

let baseURL = URL(string: CommandLine.arguments[1])!
let projectTitle = CommandLine.arguments[2]
let outputDirectory = URL(fileURLWithPath: CommandLine.arguments[3], isDirectory: true)
let width = CGFloat(Double(CommandLine.arguments.dropFirst(4).first ?? "1100") ?? 1100)
let height = CGFloat(Double(CommandLine.arguments.dropFirst(5).first ?? "662.5") ?? 662.5)
let scale = CGFloat(Double(CommandLine.arguments.dropFirst(6).first ?? "2") ?? 2)

var captureInstance: ManualScreenshotCapture?

DispatchQueue.main.async {
    NSApplication.shared.setActivationPolicy(.prohibited)
    captureInstance = ManualScreenshotCapture(
        baseURL: baseURL,
        projectTitle: projectTitle,
        outputDirectory: outputDirectory,
        width: width,
        height: height,
        scale: scale
    )
    captureInstance?.start()
}

NSApplication.shared.run()
