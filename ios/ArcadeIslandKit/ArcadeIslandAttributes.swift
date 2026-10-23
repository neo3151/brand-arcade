import ActivityKit
import Foundation

/// Shared Live Activity model. Compiled once in ArcadeIslandKit so the app and
/// the widget extension see the same ActivityAttributes type.
@available(iOS 16.1, *)
public struct ArcadeIslandAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var phase: String
        public var headline: String
        public var primary: String
        public var secondary: String
        public var detail: String
        public var progress: Double
        public var alert: Bool
        public var streak: Int
        public var marks: [Double]
        public var grid: [Int]
        public var accent: String
        public var surface: String
        public var ink: String

        enum CodingKeys: String, CodingKey {
            case phase, headline, primary, secondary, detail, progress, alert, streak, marks, grid, accent, surface, ink
        }

        public init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            phase = try c.decode(String.self, forKey: .phase)
            headline = try c.decode(String.self, forKey: .headline)
            primary = try c.decode(String.self, forKey: .primary)
            secondary = try c.decode(String.self, forKey: .secondary)
            detail = try c.decode(String.self, forKey: .detail)
            progress = try c.decode(Double.self, forKey: .progress)
            alert = try c.decode(Bool.self, forKey: .alert)
            streak = try c.decode(Int.self, forKey: .streak)
            marks = try c.decode([Double].self, forKey: .marks)
            grid = try c.decode([Int].self, forKey: .grid)
            accent = try c.decode(String.self, forKey: .accent)
            surface = try c.decode(String.self, forKey: .surface)
            ink = try c.decode(String.self, forKey: .ink)
        }

        public func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encode(phase, forKey: .phase)
            try c.encode(headline, forKey: .headline)
            try c.encode(primary, forKey: .primary)
            try c.encode(secondary, forKey: .secondary)
            try c.encode(detail, forKey: .detail)
            try c.encode(progress, forKey: .progress)
            try c.encode(alert, forKey: .alert)
            try c.encode(streak, forKey: .streak)
            try c.encode(marks, forKey: .marks)
            try c.encode(grid, forKey: .grid)
            try c.encode(accent, forKey: .accent)
            try c.encode(surface, forKey: .surface)
            try c.encode(ink, forKey: .ink)
        }

        public static func == (lhs: ContentState, rhs: ContentState) -> Bool {
            lhs.phase == rhs.phase && lhs.headline == rhs.headline && lhs.primary == rhs.primary
                && lhs.secondary == rhs.secondary && lhs.detail == rhs.detail && lhs.progress == rhs.progress
                && lhs.alert == rhs.alert && lhs.streak == rhs.streak && lhs.marks == rhs.marks
                && lhs.grid == rhs.grid && lhs.accent == rhs.accent && lhs.surface == rhs.surface
                && lhs.ink == rhs.ink
        }

        public func hash(into hasher: inout Hasher) {
            hasher.combine(phase)
            hasher.combine(headline)
            hasher.combine(primary)
            hasher.combine(secondary)
            hasher.combine(detail)
            hasher.combine(progress)
            hasher.combine(alert)
            hasher.combine(streak)
            hasher.combine(marks)
            hasher.combine(grid)
            hasher.combine(accent)
            hasher.combine(surface)
            hasher.combine(ink)
        }

        public init(
            phase: String,
            headline: String,
            primary: String,
            secondary: String,
            detail: String,
            progress: Double,
            alert: Bool,
            streak: Int,
            marks: [Double],
            grid: [Int],
            accent: String,
            surface: String,
            ink: String
        ) {
            self.phase = phase
            self.headline = headline
            self.primary = primary
            self.secondary = secondary
            self.detail = detail
            self.progress = progress
            self.alert = alert
            self.streak = streak
            self.marks = marks
            self.grid = grid
            self.accent = accent
            self.surface = surface
            self.ink = ink
        }
    }

    public var gameId: String
    public var gameName: String
    public var deepLink: String

    public init(gameId: String, gameName: String, deepLink: String) {
        self.gameId = gameId
        self.gameName = gameName
        self.deepLink = deepLink
    }
}
