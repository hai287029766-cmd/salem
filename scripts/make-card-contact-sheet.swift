import AppKit
import CoreGraphics
import Foundation
import ImageIO

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let inputDir = root.appendingPathComponent("packages/client/src/assets/cards/physical")
let outputURL = root.appendingPathComponent("packages/client/src/assets/cards/physical/contact-sheet.jpg")

let files = try FileManager.default.contentsOfDirectory(at: inputDir, includingPropertiesForKeys: nil)
  .filter { $0.pathExtension.lowercased() == "jpg" && $0.lastPathComponent != "contact-sheet.jpg" }
  .sorted { $0.lastPathComponent < $1.lastPathComponent }

let cellWidth = 220
let cellHeight = 350
let labelHeight = 36
let columns = 5
let rows = Int(ceil(Double(files.count) / Double(columns)))
let sheetWidth = columns * cellWidth
let sheetHeight = rows * (cellHeight + labelHeight)

let image = NSImage(size: NSSize(width: sheetWidth, height: sheetHeight))
image.lockFocus()
NSColor(calibratedWhite: 0.08, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: sheetWidth, height: sheetHeight).fill()

let attrs: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: 14, weight: .semibold),
  .foregroundColor: NSColor.white
]

for (index, file) in files.enumerated() {
  guard let src = NSImage(contentsOf: file) else { continue }
  let col = index % columns
  let row = index / columns
  let x = col * cellWidth
  let y = sheetHeight - (row + 1) * (cellHeight + labelHeight)

  let srcSize = src.size
  let scale = min(Double(cellWidth - 24) / srcSize.width, Double(cellHeight - 18) / srcSize.height)
  let drawWidth = srcSize.width * scale
  let drawHeight = srcSize.height * scale
  let drawRect = NSRect(
    x: CGFloat(x) + (CGFloat(cellWidth) - drawWidth) / 2,
    y: CGFloat(y) + CGFloat(labelHeight) + (CGFloat(cellHeight) - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight
  )

  src.draw(in: drawRect)
  NSColor(calibratedWhite: 0.22, alpha: 1).setStroke()
  NSBezierPath(rect: NSRect(x: x, y: y, width: cellWidth, height: cellHeight + labelHeight)).stroke()
  NSString(string: file.deletingPathExtension().lastPathComponent)
    .draw(in: NSRect(x: x + 8, y: y + 8, width: cellWidth - 16, height: labelHeight - 10), withAttributes: attrs)
}

image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let jpeg = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.86]) else {
  throw NSError(domain: "ContactSheet", code: 1)
}

try jpeg.write(to: outputURL)
print(outputURL.path)
