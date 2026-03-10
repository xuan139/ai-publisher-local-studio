import AppKit
import Foundation
import WebKit

final class SnapshotRenderer: NSObject, WKNavigationDelegate {
    private let inputURL: URL
    private let outputURL: URL
    private let width: CGFloat
    private let height: CGFloat
    private let scale: CGFloat
    private let webView: WKWebView

    init(inputURL: URL, outputURL: URL, width: CGFloat, height: CGFloat, scale: CGFloat) {
        self.inputURL = inputURL
        self.outputURL = outputURL
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
        webView.loadFileURL(inputURL, allowingReadAccessTo: inputURL.deletingLastPathComponent())
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            self.capture()
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

    private func capture() {
        let config = WKSnapshotConfiguration()
        config.rect = CGRect(x: 0, y: 0, width: width, height: height)
        config.snapshotWidth = NSNumber(value: Double(width * scale))

        webView.takeSnapshot(with: config) { image, error in
            if let error {
                fputs("snapshot failed: \(error.localizedDescription)\n", stderr)
                NSApp.terminate(nil)
                return
            }

            guard
                let image,
                let tiffData = image.tiffRepresentation,
                let bitmap = NSBitmapImageRep(data: tiffData),
                let pngData = bitmap.representation(using: .png, properties: [:])
            else {
                fputs("failed to encode png\n", stderr)
                NSApp.terminate(nil)
                return
            }

            do {
                try pngData.write(to: self.outputURL)
                print("rendered \(self.outputURL.path)")
            } catch {
                fputs("write failed: \(error.localizedDescription)\n", stderr)
            }

            NSApp.terminate(nil)
        }
    }
}

guard CommandLine.arguments.count >= 3 else {
    fputs("usage: swift render_html.swift input.html output.png [width] [height] [scale]\n", stderr)
    exit(1)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let width = CGFloat(Double(CommandLine.arguments.dropFirst(3).first ?? "1600") ?? 1600)
let height = CGFloat(Double(CommandLine.arguments.dropFirst(4).first ?? "944") ?? 944)
let scale = CGFloat(Double(CommandLine.arguments.dropFirst(5).first ?? "2") ?? 2)

NSApplication.shared.setActivationPolicy(.prohibited)

var renderer: SnapshotRenderer?
renderer = SnapshotRenderer(
    inputURL: inputURL,
    outputURL: outputURL,
    width: width,
    height: height,
    scale: scale
)

DispatchQueue.main.async {
    renderer?.start()
}

NSApplication.shared.run()
