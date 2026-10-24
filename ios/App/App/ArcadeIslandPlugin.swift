import ArcadeIslandKit
import Capacitor
import Foundation

@objc(ArcadeIslandPlugin)
public class ArcadeIslandPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ArcadeIslandPlugin"
    public let jsName = "ArcadeIsland"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "support", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    private func payload(_ call: CAPPluginCall) -> [String: Any] {
        guard let options = call.options as? [AnyHashable: Any] else { return [:] }
        var out: [String: Any] = [:]
        for (key, value) in options {
            if let key = key as? String {
                out[key] = value
            }
        }
        return out
    }

    @objc func support(_ call: CAPPluginCall) {
        call.resolve(["ok": ArcadeIslandClient.support() == "ready", "reason": ArcadeIslandClient.support()])
    }

    @objc func start(_ call: CAPPluginCall) {
        let payload = payload(call)
        Task { @MainActor in
            call.resolve(await ArcadeIslandClient.start(payload))
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        let payload = payload(call)
        Task { @MainActor in
            call.resolve(await ArcadeIslandClient.update(payload))
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        let payload = payload(call)
        Task { @MainActor in
            call.resolve(await ArcadeIslandClient.end(payload))
        }
    }
}
