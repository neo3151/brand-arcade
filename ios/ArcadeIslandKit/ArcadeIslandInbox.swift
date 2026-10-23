import Foundation

/// App Group handoff from an interactive Live Activity into the running app.
/// The widget writes one pending action; the app takes it and asks the web
/// game to apply the same control the player would tap.
public enum ArcadeIslandInbox {
    public static let suiteName = "group.com.gamingempire.benchmarkarcade"
    public static let pendingKey = "island.pending"
    public static let darwinName = "com.gamingempire.benchmarkarcade.island"

    public static var onPending: (@Sendable () -> Void)?

    @discardableResult
    public static func write(gameId: String, action: String) -> Bool {
        let game = filter(gameId, lettersAndDigits: true)
        let name = filter(action, lettersAndDigits: false)
        guard !game.isEmpty, !name.isEmpty else { return false }
        guard let defaults = UserDefaults(suiteName: suiteName) else { return false }
        defaults.set([
            "id": UUID().uuidString,
            "game": game,
            "action": name
        ], forKey: pendingKey)
        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName(darwinName as CFString),
            nil,
            nil,
            true
        )
        return true
    }

    public static func take() -> [String: String]? {
        guard let defaults = UserDefaults(suiteName: suiteName) else { return nil }
        guard let raw = defaults.dictionary(forKey: pendingKey) else { return nil }
        defaults.removeObject(forKey: pendingKey)
        var out: [String: String] = [:]
        for (key, value) in raw {
            if let text = value as? String {
                out[key] = text
            }
        }
        if out["action"] == nil || out["action"]?.isEmpty == true { return nil }
        return out
    }

    public static func start() {
        CFNotificationCenterAddObserver(
            CFNotificationCenterGetDarwinNotifyCenter(),
            nil,
            islandDarwinCallback,
            darwinName as CFString,
            nil,
            .deliverImmediately
        )
    }

    private static func filter(_ raw: String, lettersAndDigits: Bool) -> String {
        String(raw.filter { ch in
            ch.isLetter || (lettersAndDigits && ch.isNumber)
        }).lowercased()
    }
}

private func islandDarwinCallback(
    _ center: CFNotificationCenter?,
    _ observer: UnsafeMutableRawPointer?,
    _ name: CFNotificationName?,
    _ object: UnsafeRawPointer?,
    _ userInfo: CFDictionary?
) {
    let pending = ArcadeIslandInbox.onPending
    DispatchQueue.main.async {
        pending?()
    }
}
