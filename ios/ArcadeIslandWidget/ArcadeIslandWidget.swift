import ActivityKit
import ArcadeIslandKit
import SwiftUI
import WidgetKit

@main
struct ArcadeIslandBundle: WidgetBundle {
    var body: some Widget {
        ArcadeIslandLiveActivity()
    }
}

struct ArcadeIslandLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ArcadeIslandAttributes.self) { context in
            IslandLockScreen(name: context.attributes.gameName, gameId: context.attributes.gameId, state: context.state)
                .widgetURL(url(context.attributes.deepLink))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    IslandMark(gameId: context.attributes.gameId, accent: context.state.accent)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.celebrate ? "Won" : context.state.primary)
                        .font(.headline.monospacedDigit())
                        .foregroundStyle(Color(hex: context.state.alert ? "#ff5a5a" : context.state.ink))
                        .contentTransition(.numericText())
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 1) {
                        Text(context.attributes.gameName)
                            .font(.caption.weight(.semibold))
                            .lineLimit(1)
                        if context.state.streak > 0 {
                            Text("Daily \(context.state.streak)")
                                .font(.caption2)
                                .foregroundStyle(Color(hex: context.state.accent))
                        }
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    IslandExpanded(gameId: context.attributes.gameId, state: context.state)
                }
            } compactLeading: {
                IslandMark(gameId: context.attributes.gameId, accent: context.state.accent)
            } compactTrailing: {
                Text(context.state.primary)
                    .font(.caption.monospacedDigit().weight(.bold))
                    .foregroundStyle(Color(hex: context.state.alert ? "#ff5a5a" : context.state.ink))
                    .contentTransition(.numericText())
            } minimal: {
                IslandMark(gameId: context.attributes.gameId, accent: context.state.accent)
            }
            .widgetURL(url(context.attributes.deepLink))
            .keylineTint(Color(hex: context.state.accent))
        }
    }
}

private func url(_ raw: String) -> URL? {
    URL(string: raw)
}

struct IslandLockScreen: View {
    let name: String
    let gameId: String
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                IslandMark(gameId: gameId, accent: state.accent)
                Text(name)
                    .font(.headline)
                    .foregroundStyle(Color(hex: state.ink))
                Spacer()
                Text(state.celebrate ? "Won" : state.primary)
                    .font(.title3.monospacedDigit().weight(.bold))
                    .foregroundStyle(Color(hex: state.alert ? "#ff5a5a" : state.ink))
                    .contentTransition(.numericText())
            }
            IslandExpanded(gameId: gameId, state: state)
            if state.streak > 0 {
                Text("Daily streak \(state.streak)")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color(hex: state.accent))
            }
        }
        .padding(14)
        .activityBackgroundTint(Color(hex: state.surface))
        .activitySystemActionForegroundColor(Color(hex: state.ink))
    }
}

struct IslandExpanded: View {
    let gameId: String
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            gameBody
            IslandFooter(gameId: gameId, state: state)
        }
        .animation(.easeInOut(duration: 0.35), value: state.progress)
    }

    @ViewBuilder
    private var gameBody: some View {
        switch gameId {
        case "blockblast":
            BlockBlastIsland(state: state)
        case "solitaire":
            SolitaireIsland(state: state)
        case "sudoku":
            SudokuIsland(state: state)
        case "nonogram":
            NonogramIsland(state: state)
        case "minesweeper":
            MinesweeperIsland(state: state)
        case "mahjong":
            MahjongIsland(state: state)
        case "codebreaker":
            CodebreakerIsland(state: state)
        case "wordsearch":
            WordSearchIsland(state: state)
        case "spidersolitaire":
            SpiderIsland(state: state)
        case "spades":
            SpadesIsland(state: state)
        default:
            Text(state.secondary)
                .font(.caption)
                .foregroundStyle(Color(hex: state.ink))
        }
    }
}

struct IslandMark: View {
    let gameId: String
    let accent: String

    var body: some View {
        Image(systemName: symbol)
            .font(.caption.weight(.bold))
            .foregroundStyle(Color(hex: accent))
            .frame(width: 16, height: 16)
    }

    private var symbol: String {
        switch gameId {
        case "blockblast": return "square.grid.3x3.fill"
        case "solitaire": return "suit.spade.fill"
        case "sudoku": return "square.grid.3x3"
        case "nonogram": return "square.grid.2x2.fill"
        case "minesweeper": return "flag.fill"
        case "mahjong": return "square.stack.3d.up.fill"
        case "codebreaker": return "lock.fill"
        case "wordsearch": return "textformat"
        case "spidersolitaire": return "circle.hexagongrid.fill"
        case "spades": return "suit.club.fill"
        default: return "gamecontroller.fill"
        }
    }
}

private struct BlockBlastIsland: View {
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(state.secondary)
                .font(.caption2)
                .foregroundStyle(Color(hex: state.ink))
            HStack(spacing: 3) {
                ForEach(0..<5, id: \.self) { index in
                    Capsule()
                        .fill(index < comboPips ? Color(hex: state.accent) : Color(hex: state.ink).opacity(0.2))
                        .frame(width: 14, height: 5)
                }
                Spacer(minLength: 0)
                Text(state.detail)
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(Color(hex: state.accent))
            }
        }
        .padding(6)
        .background(wood)
    }

    private var comboPips: Int {
        min(5, Int((state.marks.first ?? 0) * 5))
    }

    private var wood: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(Color(hex: state.surface).opacity(0.35))
            .overlay(
                Canvas { context, size in
                    var y: CGFloat = 2
                    while y < size.height {
                        var path = Path()
                        path.move(to: CGPoint(x: 0, y: y))
                        path.addLine(to: CGPoint(x: size.width, y: y + 1))
                        context.stroke(path, with: .color(Color(hex: state.accent).opacity(0.35)), lineWidth: 1)
                        y += 4
                    }
                }
            )
    }
}

private struct SolitaireIsland: View {
    let state: ArcadeIslandAttributes.ContentState
    private let suits = ["♠", "♥", "♦", "♣"]

    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<4, id: \.self) { index in
                VStack(spacing: 2) {
                    Text(suits[index])
                        .font(.caption.weight(.bold))
                        .foregroundStyle(index == 1 || index == 2 ? Color(hex: "#e23d3d") : Color(hex: state.ink))
                    Capsule()
                        .fill(Color(hex: state.accent))
                        .frame(width: 18, height: 4)
                        .opacity(mark(index))
                }
            }
            Spacer(minLength: 0)
            Text(state.secondary)
                .font(.caption2)
                .foregroundStyle(Color(hex: state.ink))
        }
    }

    private func mark(_ index: Int) -> Double {
        index < state.marks.count ? max(0.25, state.marks[index]) : 0.25
    }
}

private struct SudokuIsland: View {
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(state.secondary)
                .font(.caption2)
                .foregroundStyle(Color(hex: state.ink))
            ZStack(alignment: .leading) {
                Capsule().fill(Color(hex: state.ink).opacity(0.15)).frame(height: 3)
                Capsule().fill(Color(hex: state.accent)).frame(width: nil, height: 3)
                    .scaleEffect(x: CGFloat(max(0.04, state.progress)), y: 1, anchor: .leading)
            }
            Text(state.detail)
                .font(.custom("Snell Roundhand", size: 12))
                .foregroundStyle(Color(hex: state.accent))
                .lineLimit(1)
        }
    }
}

private struct NonogramIsland: View {
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        HStack(spacing: 8) {
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(8), spacing: 1), count: 8), spacing: 1) {
                ForEach(0..<64, id: \.self) { index in
                    Rectangle()
                        .fill(cell(index))
                        .frame(width: 8, height: 8)
                }
            }
            .frame(width: 71)
            Text(state.secondary)
                .font(.caption2)
                .foregroundStyle(Color(hex: state.ink))
                .lineLimit(2)
            Spacer(minLength: 0)
        }
    }

    private func cell(_ index: Int) -> Color {
        let value = index < state.grid.count ? state.grid[index] : 0
        if value == 1 { return Color(hex: state.accent) }
        if value == 2 { return Color(hex: state.ink).opacity(0.18) }
        return Color(hex: state.ink).opacity(0.08)
    }
}

private struct MinesweeperIsland: View {
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        HStack(spacing: 8) {
            TimelineView(.periodic(from: .now, by: 0.7)) { timeline in
                let on = state.alert && Int(timeline.date.timeIntervalSinceReferenceDate / 0.7) % 2 == 0
                Image(systemName: state.alert ? "exclamationmark.triangle.fill" : "flag.fill")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Color(hex: state.alert ? (on ? "#ff2a2a" : "#7a1818") : state.accent))
                    .modifier(IslandPulse(on: state.alert))
            }
            Text(state.secondary)
                .font(.caption.monospacedDigit())
                .foregroundStyle(Color(hex: state.alert ? "#ff8a8a" : state.ink))
            Spacer(minLength: 0)
            Text(state.detail)
                .font(.caption2.monospacedDigit())
                .foregroundStyle(Color(hex: state.ink))
        }
    }
}

private struct MahjongIsland: View {
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(state.secondary)
                .font(.caption2)
                .foregroundStyle(Color(hex: state.ink))
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(hex: "#0b3a28"))
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(hex: state.accent))
                        .frame(width: geo.size.width * CGFloat(max(0.04, state.progress)))
                }
            }
            .frame(height: 8)
        }
    }
}

private struct CodebreakerIsland: View {
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .bottom, spacing: 4) {
                ForEach(0..<6, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color(hex: state.accent).opacity(mark(index) > 0.5 ? 1 : 0.28))
                        .frame(width: 8, height: 6 + CGFloat(mark(index)) * 12)
                }
                Spacer(minLength: 4)
                Text(state.secondary)
                    .font(.caption2)
                    .foregroundStyle(Color(hex: state.ink))
                    .lineLimit(2)
            }
            if !state.pieces.isEmpty {
                HStack(spacing: 3) {
                    ForEach(Array(state.pieces.prefix(8).enumerated()), id: \.offset) { _, peg in
                        Circle()
                            .fill(pegColor(peg))
                            .frame(width: 7, height: 7)
                    }
                }
            }
        }
    }

    private func pegColor(_ peg: String) -> Color {
        if peg == "exact" { return Color(hex: state.accent) }
        if peg == "partial" { return Color(hex: state.ink) }
        return Color(hex: state.ink).opacity(0.28)
    }

    private func mark(_ index: Int) -> Double {
        index < state.marks.count ? state.marks[index] : 0
    }
}

private struct WordSearchIsland: View {
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(state.secondary)
                .font(.caption2.monospacedDigit())
                .foregroundStyle(Color(hex: state.ink))
            Text(state.detail.isEmpty ? "Searching" : state.detail)
                .font(.caption.weight(.bold))
                .foregroundStyle(Color(hex: state.accent))
                .lineLimit(1)
        }
    }
}

private struct SpiderIsland: View {
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        HStack(alignment: .bottom, spacing: 3) {
            ForEach(0..<8, id: \.self) { index in
                Strand(on: index < filled)
                    .stroke(Color(hex: index < filled ? state.accent : state.ink).opacity(index < filled ? 0.95 : 0.25), lineWidth: 1.2)
                    .frame(width: 10, height: 16)
            }
            Spacer(minLength: 4)
            Text(state.secondary)
                .font(.caption2)
                .foregroundStyle(Color(hex: state.ink))
        }
    }

    private var filled: Int {
        min(8, Int((state.marks.first ?? state.progress) * 8 + 0.001))
    }
}

private struct Strand: Shape {
    var on: Bool
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.addQuadCurve(
            to: CGPoint(x: rect.midX, y: rect.minY),
            control: CGPoint(x: on ? rect.maxX : rect.minX, y: rect.midY)
        )
        return path
    }
}

private struct SpadesIsland: View {
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 1) {
                Text("US")
                    .font(.caption2)
                    .foregroundStyle(Color(hex: state.accent))
                Text(state.primary)
                    .font(.caption.monospacedDigit().weight(.bold))
                    .foregroundStyle(Color(hex: state.ink))
            }
            Spacer()
            Text(state.detail)
                .font(.caption2.monospacedDigit())
                .foregroundStyle(Color(hex: state.ink))
                .lineLimit(1)
            Spacer()
            VStack(alignment: .trailing, spacing: 1) {
                Text("AI")
                    .font(.caption2)
                    .foregroundStyle(Color(hex: "#f87171"))
                Text(state.secondary)
                    .font(.caption.monospacedDigit().weight(.bold))
                    .foregroundStyle(Color(hex: state.ink))
            }
        }
    }
}

private struct IslandFooter: View {
    let gameId: String
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if gameId == "blockblast" {
                HStack(spacing: 6) {
                    ForEach(Array(state.pieces.prefix(3).enumerated()), id: \.offset) { _, code in
                        PieceGlyph(code: code, accent: state.accent)
                    }
                }
            }
            if !state.caption.isEmpty {
                Text(state.caption)
                    .font(.caption2)
                    .foregroundStyle(Color(hex: state.ink))
                    .lineLimit(2)
            }
            if state.supply > 0 {
                Text("\(state.supply) left")
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(Color(hex: state.accent))
                    .contentTransition(.numericText())
            }
            IslandControls(gameId: gameId, state: state)
        }
    }
}

private struct PieceGlyph: View {
    let code: String
    let accent: String

    var body: some View {
        let rows = code.split(separator: "/")
        VStack(spacing: 1) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                HStack(spacing: 1) {
                    ForEach(Array(row.enumerated()), id: \.offset) { _, bit in
                        RoundedRectangle(cornerRadius: 1)
                            .fill(Color(hex: accent).opacity(bit == "1" ? 1 : 0.18))
                            .frame(width: 4, height: 4)
                    }
                }
            }
        }
    }
}

private struct IslandControls: View {
    let gameId: String
    let state: ArcadeIslandAttributes.ContentState

    var body: some View {
        if #available(iOS 17.0, *) {
            HStack(spacing: 6) {
                ForEach(state.actions.prefix(3), id: \.self) { action in
                    if action == "pause" || action == "flag" {
                        Toggle(isOn: action == "flag" ? state.flagMode : state.paused, intent: ArcadeIslandActionIntent(gameId: gameId, action: action)) {
                            Text(action == "pause" && state.paused ? "Resume" : IslandControls.label(action))
                                .font(.caption2.weight(.bold))
                        }
                        .toggleStyle(.button)
                    } else {
                        Button(intent: ArcadeIslandActionIntent(gameId: gameId, action: action)) {
                            Text(IslandControls.label(action))
                                .font(.caption2.weight(.bold))
                        }
                        .buttonStyle(.bordered)
                    }
                }
            }
        }
    }

    static func label(_ action: String) -> String {
        switch action {
        case "rotate": return "Rotate"
        case "pause": return "Pause"
        case "hint": return "Hint"
        case "draw": return "Draw"
        case "row": return "Hint"
        case "flag": return "Flag"
        case "shuffle": return "Shuffle"
        case "decrypt": return "Decrypt"
        case "cycle": return "Next"
        case "deal": return "Deal"
        case "play": return "Play"
        default: return action
        }
    }
}

private struct IslandPulse: ViewModifier {
    var on: Bool
    func body(content: Content) -> some View {
        if #available(iOS 17.0, *), on {
            content.symbolEffect(.pulse)
        } else {
            content
        }
    }
}

extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)
        let red = Double((value >> 16) & 0xff) / 255
        let green = Double((value >> 8) & 0xff) / 255
        let blue = Double(value & 0xff) / 255
        self.init(red: red, green: green, blue: blue)
    }
}
