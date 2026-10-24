# Dynamic Island

Live Activities for the hub app (`com.gamingempire.benchmarkarcade`). Each of the 10 games has its own Island layout. On iOS 17 the expanded Island can run a small action. That action clicks the same control the game already uses, so a hint or power-up spends the daily supply once. It does not add a second free pile, and it does not offer a purchase. iOS 16.2 keeps the same layout without buttons.

## What ships

- `ArcadeIslandKit` — shared `ArcadeIslandAttributes`, `ArcadeIslandClient`, and `ArcadeIslandInbox`. The app and the widget extension link this framework, so ActivityKit sees one type.
- `ArcadeIslandWidget` — WidgetKit extension. Compact leading, compact trailing, minimal, expanded (leading / trailing / center / bottom), and the Lock Screen presentation. iOS 17 adds `Button` and `Toggle` backed by `ArcadeIslandActionIntent` (`LiveActivityIntent`).
- `ArcadeIslandPlugin` — Capacitor plugin `window.Capacitor.Plugins.ArcadeIsland` with `support`, `start`, `update`, and `end`.
- `assets/arcade-island.js` — `window.ArcadeIsland.start/update/end` and `applyIntent`. On the web, on Android, and when the native side reports it cannot run, the calls resolve and do not throw.
- Game pages read the on-screen state and push it. Updates are throttled to about one every two seconds unless the round ends, Minesweeper danger flips on, or an Island button just ran. The activity starts on `game.html`, and ends on a win, a loss, or leaving the page.
- Tapping the Island opens `benchmarkarcade://play/<game>`, and the app navigates to `/<game>/www/game.html`. An action button also opens the app (`openAppWhenRun`) so the page can apply the click, then pushes a fresh activity. The Island should match the board within about a second.
- Equipped cosmetic skins recolor the activity from the palette in `arcade-island.js`. The daily streak (`arcade_daily_streak`) is shown when it is greater than zero.
- A win, or a Block Blast score that passes the shown best, sets `chime`. The app then updates the activity with `alertConfiguration` (title, caption, default sound). Minesweeper danger stays a visual pulse so a near-miss does not fire a banner on every tick.
- `NSSupportsLiveActivities` is set on the app. The pending button action is the only thing stored in the App Group. The activity content itself still travels in `ContentState`.

The web view is edge to edge (`ios.contentInset` `never` in `capacitor.config.json`). Pages use `viewport-fit=cover` and `assets/arcade-safe.css`. The return bar on a phone is a full-width strip under the island, each control at least 44pt, and the strip does not take taps inside the island band. The DEV HUD opens from that bar. The bottom DEV HUD pill is hidden while that button is on screen. If `env(safe-area-inset-*)` measures 0 on an iPhone, the page uses a 59pt top and 34pt bottom inset so controls are not drawn under the island.

Live Activities use `ActivityContent`, which needs iOS 16.2. Earlier systems, including iOS 16.1, take the same no-op path. A phone without a Dynamic Island (status-bar inset under 51pt, including notch phones and iPad) also no-ops. The Lock Screen layout is part of the same activity, so it appears on Island phones together with the Island. Buttons render only on iOS 17. iOS 16.2 still shows the score, caption, pieces, pegs, pixel preview, numeric text transitions, and the progress animation.

## How a button reaches the game

1. The widget runs `ArcadeIslandActionIntent`. It writes `{ id, game, action }` into the App Group suite `group.com.gamingempire.benchmarkarcade` (`island.pending`) and posts Darwin notification `com.gamingempire.benchmarkarcade.island`.
2. The app observes that notification and also checks the inbox when the scene becomes active. It evaluates `window.ArcadeIsland.applyIntent({ game, action, id })` in the web view, retrying for a few seconds if the page is not ready yet.
3. `applyIntent` clicks the existing control (or the small timer hook where the game has no pause button). The game's own handler spends the daily hint or power-up.
4. The page pushes `update` immediately. The native client applies `alertConfiguration` only when `chime` is set.

`ArcadeIslandKit` does not get the App Group entitlement. The App target and the widget extension do, because those are the two processes that read and write the suite.

## Signing

Automatic signing, team `X5H4YHJUU6`:

| Target | Bundle ID | App Group |
| --- | --- | --- |
| App | `com.gamingempire.benchmarkarcade` | `group.com.gamingempire.benchmarkarcade` |
| ArcadeIslandKit | `com.gamingempire.benchmarkarcade.ArcadeIslandKit` | none |
| ArcadeIslandWidget | `com.gamingempire.benchmarkarcade.ArcadeIsland` | `group.com.gamingempire.benchmarkarcade` |

`ArcadeIslandKit` deployment target stays iOS 15.0 and weak-links ActivityKit. The widget target is iOS 16.1. Entitlement files:

- `ios/App/App/App.entitlements`
- `ios/ArcadeIslandWidget/ArcadeIslandWidget.entitlements`

## Steps in Xcode 27.1

This repo was edited on Linux, so the iOS project has not been compiled here.

1. On a Mac, from the repo root, run `npm run cap:sync`. That copies `www` into the iOS app and then puts `ArcadeIslandPlugin` back into `ios/App/App/capacitor.config.json`. A plain `npx cap sync` drops that class, because Capacitor only scans CocoaPods plugins.
2. Open `ios/App/App.xcworkspace` (the workspace, so CocoaPods stays wired). Do not open the `.xcodeproj` by itself. Do not add the widget or the kit to the Podfile.
3. Confirm three targets: App, ArcadeIslandKit, ArcadeIslandWidget. For each, Signing & Capabilities should be Automatically manage signing, Team `X5H4YHJUU6`.
4. On **App** and **ArcadeIslandWidget**, open Signing & Capabilities, add **App Groups** if it is not already listed, and enable `group.com.gamingempire.benchmarkarcade`. The entitlement files in the repo already name that group. Let Xcode register it for both bundle IDs. If signing fails with a missing group, use the capability's fix button so the App ID picks it up, then build again.
5. Leave ArcadeIslandKit without an App Group. If ActivityKit fails to load on an iOS 15 device, set ActivityKit to Optional on that target (the project already weak-links it).
6. Select the App scheme and an iPhone 14 Pro or later. Product > Build.
7. On a device, allow Live Activities for Benchmark Arcade if iOS asks. Start any hub game. The Island should show that game's layout and update as the board changes. Leave the game, or win or lose, and the activity ends. Tap the Island to return to that game. On iOS 17, expand the Island and try the buttons below.

If Xcode 27.1 rejects `Toggle(isOn:intent:)`, `Button(intent:)`, `symbolEffect`, `contentTransition`, or `AlertConfiguration`, those call sites are in `ios/ArcadeIslandWidget/ArcadeIslandWidget.swift` and `ios/ArcadeIslandKit/ArcadeIslandClient.swift`. The iOS 16.2 path is the same layout with the `#available(iOS 17.0, *)` controls omitted.

If the widget target is missing after a merge, the target is `ArcadeIslandWidget` in `ios/App/App.xcodeproj` and the sources are `ios/ArcadeIslandWidget` and `ios/ArcadeIslandKit`. Build the App target; it depends on the other two.

## What to try on device

Start a round, leave it long enough for the Island to appear, then long-press to expand.

| Game | Expanded Island | Button |
| --- | --- | --- |
| Block Blast | Score, combo pips, the 3 tray pieces | **Rotate** spends one rotate power-up. **Pause** / **Resume** uses the pause modal |
| Solitaire | Four suit pips, hint sentence | **Hint** spends one hint and shows the move. **Draw** flips the stock |
| Sudoku | Timer, cells left, the filled cell | **Pause** / **Resume** holds the timer. **Hint** spends one hint and fills the shown cell |
| Nonogram | Larger 8×8 picture sample, hint sentence | **Hint** spends one hint and fills the one cell the in-game hint chose |
| Minesweeper | Mines, timer, pulsing danger when a reveal sits next to several mines | **Flag** switches flag and dig. **Pause** holds the timer. Danger is the pulse, not a banner |
| Mahjong | Pairs left, the hinted pair glyphs | **Shuffle** spends one shuffle. **Hint** spends one hint |
| Codebreaker | Attempts as tumblers, last-guess pegs (`N exact · N partial`) | **Decrypt** spends one decryptor |
| Word Search | Found / total, latest word, next word's first letter | **Next** cycles the remaining words and does not spend a hint. **Hint** spends one hint and names the word, the same as the in-game button |
| Spider | Completed runs, deals left | **Deal** lays the next row. **Hint** spends one hint |
| Spades | Your score, the AI score, cards in hand, cards in the current trick | **Play** plays the first legal card, and only on your turn |

Hint, Rotate, Shuffle, and Decrypt use the buttons already on the board. If the daily supply is empty, the game shows its own "out of hints" toast and the count does not go up. Win a round, or beat the Block Blast best score, and the Island plays the celebratory alert.

## Layouts

| Game | Island |
| --- | --- |
| Block Blast | Score and combo pips on a wood-grain bar, plus the three upcoming pieces |
| Solitaire | Four suit pips filling toward the foundation, plus the hint line |
| Sudoku | Elapsed time, cells left, ink-brush progress |
| Nonogram | Larger 8×8 sample of the picture being filled |
| Minesweeper | Mines left, timer, red symbol pulse when a reveal sits next to several mines |
| Mahjong | Pairs remaining on a jade bar, plus the hinted pair |
| Codebreaker | Attempts left as vault tumblers, plus the last guess's pegs |
| Word Search | Words found / total, the latest word, and the next word's first letter |
| Spider | Completed suit runs as web strands |
| Spades | Your score, the AI score, hand count, and the current trick |
