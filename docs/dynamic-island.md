# Dynamic Island

Live Activities for the hub app (`com.gamingempire.benchmarkarcade`). Each of the 10 games has its own Island layout. The activity is a status display: it does not change rules, hints, scores, or offer a purchase.

## What ships

- `ArcadeIslandKit` — shared `ArcadeIslandAttributes` plus `ArcadeIslandClient`. The app and the widget extension link this framework, so ActivityKit sees one type.
- `ArcadeIslandWidget` — WidgetKit extension. Compact leading, compact trailing, minimal, expanded (leading / trailing / center / bottom), and the Lock Screen presentation.
- `ArcadeIslandPlugin` — Capacitor plugin `window.Capacitor.Plugins.ArcadeIsland` with `support`, `start`, `update`, and `end`.
- `assets/arcade-island.js` — `window.ArcadeIsland.start/update/end`. On the web, on Android, and when the native side reports it cannot run, the calls resolve and do not throw.
- Game pages read the on-screen state (score, foundations, cells, mines, pairs, attempts, words, runs, bids) and push it. Updates are throttled to about one every two seconds unless the round ends or Minesweeper danger flips on. The activity starts on `game.html`, and ends on a win, a loss, or leaving the page.
- Tapping the Island opens `benchmarkarcade://play/<game>`, and the app navigates to `/<game>/www/game.html`.
- Equipped cosmetic skins recolor the activity from the palette in `arcade-island.js`. The daily streak (`arcade_daily_streak`) is shown when it is greater than zero.
- `NSSupportsLiveActivities` is set on the app. No App Group is used; the activity content itself carries the state.

Live Activities use `ActivityContent`, which needs iOS 16.2. Earlier systems, including iOS 16.1, take the same no-op path. A phone without a Dynamic Island (status-bar inset under 51pt, including notch phones and iPad) also no-ops. The Lock Screen layout is part of the same activity, so it appears on Island phones together with the Island.

## Signing

All three targets use automatic signing and team `X5H4YHJUU6`:

| Target | Bundle ID |
| --- | --- |
| App | `com.gamingempire.benchmarkarcade` |
| ArcadeIslandKit | `com.gamingempire.benchmarkarcade.ArcadeIslandKit` |
| ArcadeIslandWidget | `com.gamingempire.benchmarkarcade.ArcadeIsland` |

`ArcadeIslandKit` deployment target stays iOS 15.0 and weak-links ActivityKit. The widget target is iOS 16.1.

## Steps in Xcode 27.1

This repo was edited on Linux, so the iOS project has not been compiled here.

1. On a Mac, from the repo root, run `npm run cap:sync`. That copies `www` into the iOS app and then puts `ArcadeIslandPlugin` back into `ios/App/App/capacitor.config.json`. A plain `npx cap sync` drops that class, because Capacitor only scans CocoaPods plugins.
2. Open `ios/App/App.xcworkspace` (the workspace, so CocoaPods stays wired). Do not open the `.xcodeproj` by itself.
3. Confirm three targets: App, ArcadeIslandKit, ArcadeIslandWidget. For each, Signing & Capabilities should be Automatically manage signing, Team `X5H4YHJUU6`.
4. Let Xcode register the two new bundle IDs if it asks. No App Group, Push Notifications, or extra capability is required.
5. Select the App scheme and an iPhone 14 Pro or later (or that simulator). Product > Build.
6. On a device, allow Live Activities for Benchmark Arcade if iOS asks. Start any hub game. The Island should show that game's layout and update as the board changes. Leave the game, or win or lose, and the activity ends. Tap it to return to that game.

If the widget target is missing after a merge, the target is `ArcadeIslandWidget` in `ios/App/App.xcodeproj` and the sources are `ios/ArcadeIslandWidget` and `ios/ArcadeIslandKit`. Build the App target; it depends on the other two.

## Layouts

| Game | Island |
| --- | --- |
| Block Blast | Score and combo pips on a wood-grain bar |
| Solitaire | Four suit pips filling toward the foundation |
| Sudoku | Elapsed time, cells left, ink-brush progress |
| Nonogram | 8×8 sample of the picture being filled |
| Minesweeper | Mines left, timer, red pulse when a reveal sits next to several mines |
| Mahjong | Pairs remaining on a jade bar |
| Codebreaker | Attempts left as vault tumblers |
| Word Search | Words found / total and the latest word |
| Spider | Completed suit runs as web strands |
| Spades | Your score, the AI score, and both trick lines |
