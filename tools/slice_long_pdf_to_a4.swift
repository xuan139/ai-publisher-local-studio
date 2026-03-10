import AppKit
import CoreGraphics
import Foundation
import PDFKit

struct Slice {
    let sourcePageIndex: Int
    let offsetFromTop: CGFloat
    let cropHeight: CGFloat
}

guard CommandLine.arguments.count >= 3 else {
    fputs("usage: swift slice_long_pdf_to_a4.swift input.pdf output.pdf\n", stderr)
    exit(1)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

guard let sourceDocument = PDFDocument(url: inputURL) else {
    fputs("failed to open input pdf\n", stderr)
    exit(1)
}

let pageWidth: CGFloat = 595.2
let pageHeight: CGFloat = 841.8
let headerHeight: CGFloat = 34
let footerHeight: CGFloat = 28
let contentTopGap: CGFloat = 16
let contentBottomGap: CGFloat = 16
let contentRect = CGRect(
    x: 0,
    y: footerHeight + contentBottomGap,
    width: pageWidth,
    height: pageHeight - headerHeight - footerHeight - contentTopGap - contentBottomGap
)

var slices: [Slice] = []

for pageIndex in 0..<sourceDocument.pageCount {
    guard let page = sourceDocument.page(at: pageIndex) else { continue }
    let bounds = page.bounds(for: .mediaBox)
    let sourceSliceHeight = contentRect.height * (bounds.width / contentRect.width)
    var consumedTop: CGFloat = 0

    while consumedTop < bounds.height {
        let remaining = bounds.height - consumedTop
        let cropHeight = min(sourceSliceHeight, remaining)
        slices.append(Slice(sourcePageIndex: pageIndex, offsetFromTop: consumedTop, cropHeight: cropHeight))
        consumedTop += cropHeight
    }
}

guard let consumer = CGDataConsumer(url: outputURL as CFURL) else {
    fputs("failed to create output consumer\n", stderr)
    exit(1)
}

var mediaBox = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)
guard let pdfContext = CGContext(consumer: consumer, mediaBox: &mediaBox, nil) else {
    fputs("failed to create pdf context\n", stderr)
    exit(1)
}

let headerAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 9, weight: .medium),
    .foregroundColor: NSColor(calibratedWhite: 0.42, alpha: 1.0)
]
let footerAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 9, weight: .regular),
    .foregroundColor: NSColor(calibratedWhite: 0.46, alpha: 1.0)
]

for (index, slice) in slices.enumerated() {
    guard let page = sourceDocument.page(at: slice.sourcePageIndex) else { continue }
    let sourceBounds = page.bounds(for: .mediaBox)
    let scale = contentRect.width / sourceBounds.width

    pdfContext.beginPDFPage(nil)
    pdfContext.setFillColor(NSColor.white.cgColor)
    pdfContext.fill(mediaBox)

    pdfContext.setStrokeColor(NSColor(calibratedWhite: 0.86, alpha: 1.0).cgColor)
    pdfContext.setLineWidth(1)
    pdfContext.move(to: CGPoint(x: 20, y: pageHeight - headerHeight))
    pdfContext.addLine(to: CGPoint(x: pageWidth - 20, y: pageHeight - headerHeight))
    pdfContext.strokePath()
    pdfContext.move(to: CGPoint(x: 20, y: footerHeight))
    pdfContext.addLine(to: CGPoint(x: pageWidth - 20, y: footerHeight))
    pdfContext.strokePath()

    pdfContext.saveGState()
    pdfContext.addRect(contentRect)
    pdfContext.clip()
    pdfContext.translateBy(x: contentRect.minX, y: contentRect.minY)
    pdfContext.scaleBy(x: scale, y: scale)
    pdfContext.translateBy(x: 0, y: -slice.offsetFromTop)
    page.draw(with: .mediaBox, to: pdfContext)
    pdfContext.restoreGState()

    let graphics = NSGraphicsContext(cgContext: pdfContext, flipped: false)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = graphics

    let headerLeft = NSString(string: "Audiobook Platform Functional Manual")
    headerLeft.draw(at: CGPoint(x: 24, y: pageHeight - 23), withAttributes: headerAttrs)

    let headerRight = NSString(string: "Phase 1 / Internal Planning Edition")
    let headerRightSize = headerRight.size(withAttributes: headerAttrs)
    headerRight.draw(
        at: CGPoint(x: pageWidth - 24 - headerRightSize.width, y: pageHeight - 23),
        withAttributes: headerAttrs
    )

    let footerLeft = NSString(string: "AI Publisher Studio Planning Pack")
    footerLeft.draw(at: CGPoint(x: 24, y: 10), withAttributes: footerAttrs)

    let footerRight = NSString(string: "Page \(index + 1) / \(slices.count)")
    let footerRightSize = footerRight.size(withAttributes: footerAttrs)
    footerRight.draw(
        at: CGPoint(x: pageWidth - 24 - footerRightSize.width, y: 10),
        withAttributes: footerAttrs
    )

    NSGraphicsContext.restoreGraphicsState()
    pdfContext.endPDFPage()
}

pdfContext.closePDF()
print("sliced \(outputURL.path) with \(slices.count) pages")
