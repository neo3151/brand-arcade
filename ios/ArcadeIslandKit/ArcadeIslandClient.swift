import ActivityKit
import Foundation
import UIKit

/// Starts, updates, and ends the one arcade Live Activity. Safe to call on
/// iOS 15: ActivityKit is weak-linked and every entry no-ops below 16.2.
public enum ArcadeIslandClient {
    public static let games: Set<String> = [
        "blockblast", "solitaire", "sudoku", "nonogram", "minesweeper",
        "mahjong", "codebreaker", "wordsearch", "spidersolitaire", "spades"
    ]

    private static var ticket = 0

    public static func support() -> String {
        if #available(iOS 16.2, *) {
            if !hasIsland() { return "no-island" }
            if !ActivityAuthorizationInfo().areActivitiesEnabled { return "disabled" }
            return "ready"
        }
        return "unavailable"
    }

    /// Dynamic Island phones use a taller status-bar inset than notch phones.
    public static func hasIsland() -> Bool {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let window = scenes.flatMap { $0.windows }.first { $0.isKeyWindow } ?? scenes.first?.windows.first
        return (window?.safeAreaInsets.top ?? 0) >= 51
    }

    @MainActor
    public static func start(_ payload: [String: Any]) async -> [String: Any] {
        let gate = support()
        if gate != "ready" { return ["ok": false, "reason": gate] }
        guard #available(iOS 16.2, *) else {
            return ["ok": false, "reason": "unavailable"]
        }
        guard let gameId = payload["gameId"] as? String, games.contains(gameId) else {
            return ["ok": false, "reason": "unknown-game"]
        }
        ticket += 1
        let mine = ticket
        let attributes = ArcadeIslandAttributes(
            gameId: gameId,
            gameName: clip(payload["gameName"] as? String ?? gameId, 40),
            deepLink: clip(payload["deepLink"] as? String ?? "benchmarkarcade://play/\(gameId)", 180)
        )
        let state = contentState(from: payload)
        do {
            await endAll(dismissal: .immediate)
            if ticket != mine { return ["ok": false, "reason": "replaced", "generation": mine] }
            let content = ActivityContent(state: state, staleDate: nil)
            _ = try Activity.request(attributes: attributes, content: content, pushType: nil)
            return ["ok": true, "generation": mine]
        } catch {
            return ["ok": false, "reason": "failed", "generation": mine]
        }
    }

    @MainActor
    public static func update(_ payload: [String: Any]) async -> [String: Any] {
        let gate = support()
        if gate != "ready" { return ["ok": false, "reason": gate] }
        guard #available(iOS 16.2, *) else {
            return ["ok": false, "reason": "unavailable"]
        }
        let claimed = intValue(payload["generation"]) ?? ticket
        if claimed != ticket { return ["ok": true, "stale": true] }
        let state = contentState(from: payload)
        let content = ActivityContent(state: state, staleDate: nil)
        for activity in Activity<ArcadeIslandAttributes>.activities {
            await activity.update(content)
        }
        return ["ok": true]
    }

    @MainActor
    public static func end(_ payload: [String: Any]) async -> [String: Any] {
        guard #available(iOS 16.2, *) else {
            return ["ok": false, "reason": "unavailable"]
        }
        if let claimed = intValue(payload["generation"]), claimed != ticket {
            return ["ok": true, "stale": true]
        }
        let state = contentState(from: payload)
        await endAll(dismissal: .after(Date().addingTimeInterval(8)), final: state)
        return ["ok": true]
    }

    @available(iOS 16.2, *)
    @MainActor
    private static func endAll(
        dismissal: ActivityUIDismissalPolicy,
        final: ArcadeIslandAttributes.ContentState? = nil
    ) async {
        for activity in Activity<ArcadeIslandAttributes>.activities {
            if let final {
                await activity.end(ActivityContent(state: final, staleDate: nil), dismissalPolicy: dismissal)
            } else {
                let cleared: ActivityContent<ArcadeIslandAttributes.ContentState>? = nil
                await activity.end(cleared, dismissalPolicy: dismissal)
            }
        }
    }

    @available(iOS 16.1, *)
    private static func contentState(from payload: [String: Any]) -> ArcadeIslandAttributes.ContentState {
        ArcadeIslandAttributes.ContentState(
            phase: clip(payload["phase"] as? String ?? "playing", 16),
            headline: clip(payload["headline"] as? String ?? "", 48),
            primary: clip(payload["primary"] as? String ?? "", 24),
            secondary: clip(payload["secondary"] as? String ?? "", 48),
            detail: clip(payload["detail"] as? String ?? "", 48),
            progress: clamp((payload["progress"] as? NSNumber)?.doubleValue ?? (payload["progress"] as? Double) ?? 0),
            alert: (payload["alert"] as? Bool) ?? ((payload["alert"] as? NSNumber)?.boolValue ?? false),
            streak: max(0, intValue(payload["streak"]) ?? 0),
            marks: numbers(payload["marks"]).prefix(8).map { clamp($0) },
            grid: ints(payload["grid"]).prefix(64).map { min(2, max(0, $0)) },
            accent: clip(payload["accent"] as? String ?? "#e6b325", 9),
            surface: clip(payload["surface"] as? String ?? "#140e09", 9),
            ink: clip(payload["ink"] as? String ?? "#f6e7c1", 9)
        )
    }

    private static func intValue(_ raw: Any?) -> Int? {
        if let number = raw as? Int { return number }
        if let number = raw as? NSNumber { return number.intValue }
        return nil
    }

    private static func clip(_ value: String, _ maxLen: Int) -> String {
        if value.count <= maxLen { return value }
        return String(value.prefix(maxLen))
    }

    private static func clamp(_ value: Double) -> Double {
        if value.isNaN { return 0 }
        return min(1, max(0, value))
    }

    private static func numbers(_ raw: Any?) -> [Double] {
        guard let list = raw as? [Any] else { return [] }
        return list.compactMap { item in
            if let number = item as? NSNumber { return number.doubleValue }
            if let number = item as? Double { return number }
            if let number = item as? Int { return Double(number) }
            return nil
        }
    }

    private static func ints(_ raw: Any?) -> [Int] {
        return numbers(raw).map { Int($0.rounded()) }
    }
}
