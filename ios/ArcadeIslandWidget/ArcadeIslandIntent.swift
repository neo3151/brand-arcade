import AppIntents
import ArcadeIslandKit

/// iOS 17 interactive control. Opens the app so the web game can apply the
/// action, then the game pushes a fresh Live Activity.
@available(iOS 17.0, *)
struct ArcadeIslandActionIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Arcade action"
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Game")
    var gameId: String

    @Parameter(title: "Action")
    var action: String

    init() {
        gameId = ""
        action = ""
    }

    init(gameId: String, action: String) {
        self.gameId = gameId
        self.action = action
    }

    func perform() async throws -> some IntentResult {
        _ = ArcadeIslandInbox.write(gameId: gameId, action: action)
        return .result()
    }
}
