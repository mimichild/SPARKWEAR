import Foundation
import UIKit
import Capacitor
import PhotosUI
import UniformTypeIdentifiers

@objc(PhotoStorageBridgePlugin)
public class PhotoStorageBridgePlugin: CAPPlugin, CAPBridgedPlugin, PHPickerViewControllerDelegate {
    public let identifier = "PhotoStorageBridgePlugin"
    public let jsName = "PhotoStorageBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pickImages", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getImageSrc", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStorageStats", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cleanupOrphans", returnType: CAPPluginReturnPromise)
    ]
    private var pendingPickCall: CAPPluginCall?

    @objc public func pickImages(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var config = PHPickerConfiguration(photoLibrary: .shared())
            config.filter = .images
            let limit = max(1, call.getInt("limit") ?? 20)
            config.selectionLimit = limit
            let picker = PHPickerViewController(configuration: config)
            picker.delegate = self
            self.pendingPickCall = call
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    @objc public func saveImage(_ call: CAPPluginCall) {
        let tempUri = call.getString("tempUri") ?? ""
        let dataUrl = call.getString("dataUrl") ?? ""
        var imageData: Data?
        if !tempUri.isEmpty {
            imageData = try? Data(contentsOf: normalizePath(tempUri))
        } else if !dataUrl.isEmpty {
            imageData = decodeDataUrl(dataUrl)
        }
        let profileName = call.getString("profile") ?? "grid"
        guard let imageData, let decoded = UIImage(data: imageData) else {
            call.reject("Failed to decode image")
            return
        }
        let source = normalizedOrientationImage(decoded)
        let profile = Profile.from(profileName)
        guard let rendered = transformImage(source, profile: profile),
              let jpegData = rendered.jpegData(compressionQuality: profile.quality) else {
            call.reject("Failed to process image")
            return
        }
        do {
            let dir = try photosDirectory()
            let id = UUID().uuidString
            let fileURL = dir.appendingPathComponent("\(id).jpg")
            try jpegData.write(to: fileURL, options: .atomic)
            cleanupTempUri(tempUri)

            call.resolve([
                "id": id,
                "path": fileURL.absoluteString,
                "mimeType": "image/jpeg",
                "size": jpegData.count,
                "width": Int(rendered.size.width),
                "height": Int(rendered.size.height),
                "profile": profile.name,
                "createdAt": String(Int(Date().timeIntervalSince1970 * 1000)),
                "storage": "native"
            ])
        } catch {
            call.reject("saveImage failed: \(error.localizedDescription)")
        }
    }

    @objc public func getImageSrc(_ call: CAPPluginCall) {
        let path = call.getString("path") ?? ""
        call.resolve([
            "path": path,
            "webSrc": path
        ])
    }

    @objc public func readImage(_ call: CAPPluginCall) {
        let path = call.getString("path") ?? ""
        if path.isEmpty {
            call.reject("path is required")
            return
        }
        let url = normalizePath(path)
        do {
            let data = try Data(contentsOf: url)
            let ext = url.pathExtension.lowercased()
            let mimeType = ext == "png" ? "image/png" : "image/jpeg"
            call.resolve([
                "dataUrl": "data:\(mimeType);base64,\(data.base64EncodedString())",
                "mimeType": mimeType,
                "size": data.count
            ])
        } catch {
            call.reject("readImage failed: \(error.localizedDescription)")
        }
    }

    @objc public func deleteImage(_ call: CAPPluginCall) {
        let path = call.getString("path") ?? ""
        if path.isEmpty {
            call.reject("path is required")
            return
        }
        let fileURL = normalizePath(path)
        let fm = FileManager.default
        if fm.fileExists(atPath: fileURL.path) {
            do {
                try fm.removeItem(at: fileURL)
                call.resolve(["deleted": true])
            } catch {
                call.reject("deleteImage failed: \(error.localizedDescription)")
            }
            return
        }
        call.resolve(["deleted": true])
    }

    @objc public func getStorageStats(_ call: CAPPluginCall) {
        do {
            let dir = try photosDirectory()
            let fm = FileManager.default
            let urls = try fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.fileSizeKey], options: [.skipsHiddenFiles])
            var count = 0
            var bytes = 0
            for url in urls {
                let values = try url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
                if values.isRegularFile == true {
                    count += 1
                    bytes += values.fileSize ?? 0
                }
            }
            call.resolve([
                "count": count,
                "bytes": bytes,
                "path": dir.path
            ])
        } catch {
            call.reject("getStorageStats failed: \(error.localizedDescription)")
        }
    }

    @objc public func cleanupOrphans(_ call: CAPPluginCall) {
        do {
            let keep = Set((call.getArray("referencedPaths", String.self) ?? []).map { normalizePath($0).path })
            let dir = try photosDirectory()
            let urls = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.isRegularFileKey], options: [.skipsHiddenFiles])
            var deleted = 0
            for url in urls {
                let values = try url.resourceValues(forKeys: [.isRegularFileKey])
                if values.isRegularFile != true { continue }
                if keep.contains(url.path) { continue }
                try FileManager.default.removeItem(at: url)
                deleted += 1
            }
            call.resolve(["deleted": deleted])
        } catch {
            call.reject("cleanupOrphans failed: \(error.localizedDescription)")
        }
    }

    public func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        picker.dismiss(animated: true)
        guard let call = pendingPickCall else { return }
        pendingPickCall = nil
        if results.isEmpty {
            call.resolve(["images": []])
            return
        }

        let group = DispatchGroup()
        let lock = NSLock()
        var images: [[String: Any]] = []

        for item in results {
            group.enter()
            let provider = item.itemProvider
            let type = UTType.image.identifier
            provider.loadFileRepresentation(forTypeIdentifier: type) { url, _ in
                defer { group.leave() }
                guard let srcUrl = url else { return }
                do {
                    let tempDir = try self.pickTempDirectory()
                    let id = UUID().uuidString
                    let ext = srcUrl.pathExtension.isEmpty ? "jpg" : srcUrl.pathExtension
                    let dst = tempDir.appendingPathComponent("\(id).\(ext)")
                    if FileManager.default.fileExists(atPath: dst.path) {
                        try FileManager.default.removeItem(at: dst)
                    }
                    try FileManager.default.copyItem(at: srcUrl, to: dst)
                    let attrs = try FileManager.default.attributesOfItem(atPath: dst.path)
                    let size = (attrs[.size] as? NSNumber)?.intValue ?? 0
                    let row: [String: Any] = [
                        "id": id,
                        "tempUri": dst.absoluteString,
                        "mimeType": "image/\(ext.lowercased())",
                        "name": dst.lastPathComponent,
                        "size": size
                    ]
                    lock.lock()
                    images.append(row)
                    lock.unlock()
                } catch {
                    // Skip failed item and continue.
                }
            }
        }

        group.notify(queue: .main) {
            call.resolve(["images": images])
        }
    }

    private func decodeDataUrl(_ dataUrl: String) -> Data? {
        let payload: String
        if let comma = dataUrl.firstIndex(of: ",") {
            payload = String(dataUrl[dataUrl.index(after: comma)...])
        } else {
            payload = dataUrl
        }
        return Data(base64Encoded: payload, options: .ignoreUnknownCharacters)
    }

    private func normalizePath(_ raw: String) -> URL {
        if raw.hasPrefix("file://"), let url = URL(string: raw) {
            return url
        }
        return URL(fileURLWithPath: raw)
    }

    private func photosDirectory() throws -> URL {
        let base = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let dir = base.appendingPathComponent("photos", isDirectory: true)
        if !FileManager.default.fileExists(atPath: dir.path) {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        }
        return dir
    }

    private func pickTempDirectory() throws -> URL {
        let base = FileManager.default.temporaryDirectory
        let dir = base.appendingPathComponent("pick_tmp", isDirectory: true)
        if !FileManager.default.fileExists(atPath: dir.path) {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        }
        return dir
    }

    private func cleanupTempUri(_ tempUri: String) {
        guard !tempUri.isEmpty else { return }
        let url = normalizePath(tempUri)
        let parent = url.deletingLastPathComponent().lastPathComponent
        guard parent == "pick_tmp" else { return }
        try? FileManager.default.removeItem(at: url)
    }

    private func transformImage(_ image: UIImage, profile: Profile) -> UIImage? {
        let srcSize = image.size
        if profile.name == "backup-lite" {
            let longEdge = max(srcSize.width, srcSize.height)
            let ratio = longEdge > profile.maxLongEdge ? (profile.maxLongEdge / longEdge) : 1.0
            let outSize = CGSize(width: max(1, floor(srcSize.width * ratio)), height: max(1, floor(srcSize.height * ratio)))
            return draw(image: image, cropRect: CGRect(origin: .zero, size: srcSize), outSize: outSize)
        }

        let targetRatio = profile.width / profile.height
        let srcRatio = srcSize.width / srcSize.height
        var cropRect = CGRect(origin: .zero, size: srcSize)
        if srcRatio > targetRatio {
            let cropW = srcSize.height * targetRatio
            cropRect.origin.x = max(0, (srcSize.width - cropW) / 2)
            cropRect.size.width = cropW
        } else {
            let cropH = srcSize.width / targetRatio
            cropRect.origin.y = max(0, (srcSize.height - cropH) / 2)
            cropRect.size.height = cropH
        }
        return draw(
            image: image,
            cropRect: cropRect,
            outSize: CGSize(width: profile.width, height: profile.height)
        )
    }

    private func draw(image: UIImage, cropRect: CGRect, outSize: CGSize) -> UIImage? {
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: outSize, format: format)
        return renderer.image { _ in
            let drawRect = CGRect(
                x: -(cropRect.origin.x / cropRect.size.width) * outSize.width,
                y: -(cropRect.origin.y / cropRect.size.height) * outSize.height,
                width: (image.size.width / cropRect.size.width) * outSize.width,
                height: (image.size.height / cropRect.size.height) * outSize.height
            )
            image.draw(in: drawRect)
        }
    }

    private func normalizedOrientationImage(_ image: UIImage) -> UIImage {
        if image.imageOrientation == .up { return image }
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = image.scale
        let renderer = UIGraphicsImageRenderer(size: image.size, format: format)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: image.size))
        }
    }
}

private struct Profile {
    let name: String
    let width: CGFloat
    let height: CGFloat
    let quality: CGFloat
    let maxLongEdge: CGFloat

    static func from(_ name: String) -> Profile {
        switch name {
        case "thumb":
            return Profile(name: "thumb", width: 320, height: 427, quality: 0.66, maxLongEdge: 0)
        case "detail":
            return Profile(name: "detail", width: 1080, height: 1440, quality: 0.82, maxLongEdge: 0)
        case "backup-lite":
            return Profile(name: "backup-lite", width: 0, height: 0, quality: 0.86, maxLongEdge: 1600)
        default:
            return Profile(name: "grid", width: 720, height: 960, quality: 0.76, maxLongEdge: 0)
        }
    }
}
