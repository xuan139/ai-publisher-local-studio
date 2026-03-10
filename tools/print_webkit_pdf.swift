import AppKit
import Foundation
import WebKit

final class PDFPrinter: NSObject, WKNavigationDelegate {
    private let inputURL: URL
    private let outputURL: URL
    private let webView: WKWebView

    init(inputURL: URL, outputURL: URL) {
        self.inputURL = inputURL
        self.outputURL = outputURL
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        self.webView = WKWebView(frame: CGRect(x: 0, y: 0, width: 1024, height: 1440), configuration: config)
        super.init()
        self.webView.navigationDelegate = self
    }

    func start() {
        webView.loadFileURL(inputURL, allowingReadAccessTo: inputURL.deletingLastPathComponent())
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            self.export()
        }
    }

    private func export() {
        let printInfo = NSPrintInfo()
        let a4 = NSSize(width: 595.2, height: 841.8)
        printInfo.paperSize = a4
        printInfo.orientation = .portrait
        printInfo.topMargin = 36
        printInfo.bottomMargin = 30
        printInfo.leftMargin = 28
        printInfo.rightMargin = 28
        printInfo.horizontalPagination = .automatic
        printInfo.verticalPagination = .automatic
        printInfo.isHorizontallyCentered = false
        printInfo.isVerticallyCentered = false
        printInfo.jobDisposition = .save
        printInfo.dictionary()[NSPrintInfo.AttributeKey.jobSavingURL] = outputURL.absoluteURL

        let operation = webView.printOperation(with: printInfo)
        operation.showsPrintPanel = false
        operation.showsProgressPanel = false

        if operation.run() {
          print("printed \(outputURL.path)")
        } else {
          fputs("print operation failed\n", stderr)
          exit(1)
        }

        NSApp.terminate(nil)
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
    fputs("usage: swift print_webkit_pdf.swift input.html output.pdf\n", stderr)
    exit(1)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

NSApplication.shared.setActivationPolicy(.prohibited)

var printer: PDFPrinter?
printer = PDFPrinter(inputURL: inputURL, outputURL: outputURL)

DispatchQueue.main.async {
    printer?.start()
}

NSApplication.shared.run()
