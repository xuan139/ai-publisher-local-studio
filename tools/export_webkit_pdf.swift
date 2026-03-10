import AppKit
import Foundation
import WebKit

final class PDFExporter: NSObject, WKNavigationDelegate {
    private let inputURL: URL
    private let outputURL: URL
    private let webView: WKWebView

    init(inputURL: URL, outputURL: URL) {
        self.inputURL = inputURL
        self.outputURL = outputURL
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        self.webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 1280, height: 1800), configuration: config)
        super.init()
        self.webView.navigationDelegate = self
    }

    func start() {
        webView.loadFileURL(inputURL, allowingReadAccessTo: inputURL.deletingLastPathComponent())
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.evaluateJavaScript("window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0;") { _, _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                let config = WKPDFConfiguration()
                webView.createPDF(configuration: config) { result in
                    switch result {
                    case .success(let data):
                        do {
                            try data.write(to: self.outputURL)
                            print("exported \(self.outputURL.path)")
                        } catch {
                            fputs("write failed: \(error.localizedDescription)\n", stderr)
                            exit(1)
                        }
                    case .failure(let error):
                        fputs("pdf export failed: \(error.localizedDescription)\n", stderr)
                        exit(1)
                    }

                    NSApp.terminate(nil)
                }
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        fputs("navigation failed: \(error.localizedDescription)\n", stderr)
        NSApp.terminate(nil)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        fputs("provisional navigation failed: \(error.localizedDescription)\n", stderr)
        NSApp.terminate(nil)
    }
}

guard CommandLine.arguments.count >= 3 else {
    fputs("usage: swift export_webkit_pdf.swift input.html output.pdf\n", stderr)
    exit(1)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

NSApplication.shared.setActivationPolicy(.prohibited)

var exporter: PDFExporter?
exporter = PDFExporter(inputURL: inputURL, outputURL: outputURL)

DispatchQueue.main.async {
    exporter?.start()
}

NSApplication.shared.run()
