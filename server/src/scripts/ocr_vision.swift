// 词舟 · macOS 原生 Vision OCR 命令行工具
// 用法: vision_ocr <图片路径>
// 输出: 识别出的文本行（每行一条）
// 编译: swiftc -O ocr_vision.swift -o vision_ocr
// 说明: 使用 Apple Vision 框架，无需任何第三方依赖

import Foundation
import Vision
import ImageIO

let args = CommandLine.arguments
guard args.count > 1 else {
    print("usage: vision_ocr <image_path>")
    exit(1)
}

let path = args[1]
let url = URL(fileURLWithPath: path) as CFURL

guard let source = CGImageSourceCreateWithURL(url, nil),
      let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    print("cannot load image: \(path)")
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["en-US"]

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
    try handler.perform([request])
} catch {
    print("ocr error: \(error)")
    exit(1)
}

// 按自上而下、自左而右排序输出，保持阅读顺序
let results = request.results ?? []
let sorted = results.sorted { a, b in
    let ay = a.boundingBox.midY
    let by = b.boundingBox.midY
    if abs(ay - by) > 0.01 { return ay > by }
    return a.boundingBox.minX < b.boundingBox.minX
}

for observation in sorted {
    if let candidate = observation.topCandidates(1).first {
        print(candidate.string)
    }
}
