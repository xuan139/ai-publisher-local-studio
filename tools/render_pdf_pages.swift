import AppKit
import Foundation
import PDFKit

guard CommandLine.arguments.count >= 4 else {
    fputs("usage: swift render_pdf_pages.swift input.pdf output_prefix count\n", stderr)
    exit(1)
}

let pdfURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputPrefix = CommandLine.arguments[2]
let count = Int(CommandLine.arguments[3]) ?? 1

guard let document = PDFDocument(url: pdfURL) else {
    fputs("failed to open pdf\n", stderr)
    exit(1)
}

let pages = min(count, document.pageCount)

for index in 0..<pages {
    guard let page = document.page(at: index) else { continue }
    let box = page.bounds(for: .mediaBox)
    let scale: CGFloat = 2.0
    let width = Int(box.width * scale)
    let height = Int(box.height * scale)

    guard
        let rep = NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: width,
            pixelsHigh: height,
            bitsPerSample: 8,
            samplesPerPixel: 4,
            hasAlpha: true,
            isPlanar: false,
            colorSpaceName: .deviceRGB,
            bytesPerRow: 0,
            bitsPerPixel: 0
        )
    else {
        fputs("bitmap init failed\n", stderr)
        exit(1)
    }

    rep.size = NSSize(width: box.width, height: box.height)

    NSGraphicsContext.saveGraphicsState()
    guard let ctx = NSGraphicsContext(bitmapImageRep: rep) else {
        fputs("graphics context failed\n", stderr)
        exit(1)
    }
    NSGraphicsContext.current = ctx

    ctx.cgContext.setFillColor(NSColor.white.cgColor)
    ctx.cgContext.fill(CGRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height)))
    ctx.cgContext.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: ctx.cgContext)

    NSGraphicsContext.restoreGraphicsState()

    guard let pngData = rep.representation(using: .png, properties: [:]) else {
        fputs("png encode failed\n", stderr)
        exit(1)
    }

    let outputPath = "\(outputPrefix)-\(String(format: "%02d", index + 1)).png"
    try pngData.write(to: URL(fileURLWithPath: outputPath))
    print("rendered \(outputPath)")
}
