import Capacitor
import UIKit

/// Opens `benchmarkarcade://play/<game>` back into that game's hub page.
enum ArcadeIslandRouter {
    private static let games: Set<String> = [
        "blockblast", "solitaire", "sudoku", "nonogram", "minesweeper",
        "mahjong", "codebreaker", "wordsearch", "spidersolitaire", "spades"
    ]
    private static var pending: URL?
    private static var attempts = 0

    @discardableResult
    static func handle(_ url: URL) -> Bool {
        guard url.scheme == "benchmarkarcade" else { return false }
        pending = url
        attempts = 0
        flush()
        return true
    }

    static func flush() {
        guard let url = pending, let path = destination(for: url) else { return }
        guard let webView = bridgeController()?.bridge?.webView else {
            attempts += 1
            if attempts < 15 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { flush() }
            }
            return
        }
        pending = nil
        attempts = 0
        let js = "window.location.assign('\(path)')"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    private static func destination(for url: URL) -> String? {
        let game: String
        if url.host == "play" {
            game = url.path.split(separator: "/").first.map(String.init) ?? ""
        } else {
            game = url.host ?? ""
        }
        guard games.contains(game) else { return nil }
        return "/\(game)/www/game.html"
    }

    private static func bridgeController() -> CAPBridgeViewController? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        for scene in scenes {
            for window in scene.windows {
                if let controller = window.rootViewController as? CAPBridgeViewController {
                    return controller
                }
            }
        }
        return nil
    }
}
