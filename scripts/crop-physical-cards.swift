import AppKit
import CoreGraphics
import Foundation
import ImageIO

struct Crop {
  let source: String
  let output: String
  let x: Int
  let y: Int
  let width: Int
  let height: Int
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let rawDir = root.appendingPathComponent("packages/client/src/assets/cards/raw")
let outDir = root.appendingPathComponent("packages/client/src/assets/cards/physical")

try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let crops: [Crop] = [
  // physical-01-game-tryal.jpg, 4096x3416.
  Crop(source: "physical-01-game-tryal.jpg", output: "card-conspiracy.jpg", x: 340, y: 720, width: 690, height: 1760),
  Crop(source: "physical-01-game-tryal.jpg", output: "card-night.jpg", x: 1280, y: 575, width: 760, height: 1710),
  Crop(source: "physical-01-game-tryal.jpg", output: "card-evidence.jpg", x: 2380, y: 675, width: 730, height: 1560),
  Crop(source: "physical-01-game-tryal.jpg", output: "card-accusation.jpg", x: 3380, y: 650, width: 700, height: 1550),
  Crop(source: "physical-01-game-tryal.jpg", output: "card-witness.jpg", x: 500, y: 2050, width: 720, height: 1230),
  Crop(source: "physical-01-game-tryal.jpg", output: "tryal-constable.jpg", x: 1330, y: 2050, width: 750, height: 1190),
  Crop(source: "physical-01-game-tryal.jpg", output: "tryal-witch.jpg", x: 2190, y: 2050, width: 740, height: 1190),
  Crop(source: "physical-01-game-tryal.jpg", output: "tryal-not-witch.jpg", x: 3060, y: 2050, width: 740, height: 1190),

  // physical-04-blue.jpg, 3072x4440.
  Crop(source: "physical-04-blue.jpg", output: "card-matchmaker.jpg", x: 105, y: 1245, width: 830, height: 1510),
  Crop(source: "physical-04-blue.jpg", output: "card-asylum.jpg", x: 1085, y: 1235, width: 835, height: 1510),
  Crop(source: "physical-04-blue.jpg", output: "card-black-cat.jpg", x: 2050, y: 1235, width: 835, height: 1510),
  Crop(source: "physical-04-blue.jpg", output: "card-piety.jpg", x: 120, y: 2700, width: 830, height: 1470),

  // physical-05-green.jpg, 3072x4440.
  Crop(source: "physical-05-green.jpg", output: "card-curse.jpg", x: 110, y: 1265, width: 840, height: 1500),
  Crop(source: "physical-05-green.jpg", output: "card-robbery.jpg", x: 1100, y: 1260, width: 835, height: 1500),
  Crop(source: "physical-05-green.jpg", output: "card-scapegoat.jpg", x: 2055, y: 1255, width: 850, height: 1505),
  Crop(source: "physical-05-green.jpg", output: "card-alibi.jpg", x: 200, y: 2700, width: 830, height: 1470),
  Crop(source: "physical-05-green.jpg", output: "card-stocks.jpg", x: 2020, y: 2700, width: 850, height: 1470),
]

func writeJpeg(_ image: CGImage, to url: URL) throws {
  guard let destination = CGImageDestinationCreateWithURL(
    url as CFURL,
    kUTTypeJPEG,
    1,
    nil
  ) else {
    throw NSError(domain: "CropPhysicalCards", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot create JPEG destination"])
  }

  let options: [CFString: Any] = [
    kCGImageDestinationLossyCompressionQuality: 0.88
  ]
  CGImageDestinationAddImage(destination, image, options as CFDictionary)
  if !CGImageDestinationFinalize(destination) {
    throw NSError(domain: "CropPhysicalCards", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot write JPEG"])
  }
}

for crop in crops {
  let sourceURL = rawDir.appendingPathComponent(crop.source)
  let outputURL = outDir.appendingPathComponent(crop.output)

  guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    throw NSError(domain: "CropPhysicalCards", code: 3, userInfo: [NSLocalizedDescriptionKey: "Cannot open \(crop.source)"])
  }

  let rect = CGRect(x: crop.x, y: crop.y, width: crop.width, height: crop.height)
    .intersection(CGRect(x: 0, y: 0, width: image.width, height: image.height))

  guard let cropped = image.cropping(to: rect) else {
    throw NSError(domain: "CropPhysicalCards", code: 4, userInfo: [NSLocalizedDescriptionKey: "Cannot crop \(crop.output)"])
  }

  try writeJpeg(cropped, to: outputURL)
  print("wrote \(crop.output)")
}
