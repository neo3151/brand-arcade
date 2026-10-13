# Brand Arcade — 100% Free & Ad-Free Games Ecosystem

A modern, centralized web and mobile games hub containing 10 casual, mindful games with zero advertisements, zero subscriptions, and offline capability. Designed as a brand acquisition and consumer trust flywheel.

---

## 🏛️ Centralized Arcade Hub Features
* **Universal Daily Challenge (P1):** Zero-server deterministic daily runs derived from date strings using Mulberry32 PRNG.
* **Wordle-Style Emoji Share Grid:** 1-click clipboard copy of formatted emoji scorecards (`🟩🟩🟩🟨⬜`) for organic, viral social sharing.
* **Zero-Ad Guarantee:** No banners, no interstitial video ads, and no tracking cookies.
* **Retro Arcade 3D Stage & Wall Matrix:** Physical arcade cabinet spotlight with 3D perspective, CRT phosphor scanlines, and tactile controls.
* **Player Retention & Streaks:** Tracks daily challenge streaks, total play sessions, and bookmarked ROM cartridges in local storage.
* **Interactive Filtering & Search:** Quick-session vibe pills (*2-4m Blitz*, *5-10m Break*, *10-20m Deep*, *Daily Run*, *Roulette Drop*).
* **Customizable Branding:** Personalize the brand name directly in the UI settings dialog.
* **Offline PWA Ready:** Installable to mobile home screens and desktop with `manifest.json` and `sw.js`.
* **Procedural Sound FX:** Retro 8-bit procedural Web Audio synthesizer (coin inserts, microswitch clacks, roulette ticks).

---

## 🎮 Included Games Portfolio
1. 🧱 **Timber Block Blast** (`blockblast/www/`) — 8×8 tactical wood block puzzle
2. 🃏 **Curious Solitaire** (`solitaire/www/`) — Classic Klondike (1,000 deals, Victorian fantasy)
3. 🔢 **Classic Sudoku** (`sudoku/www/`) — Japanese ink minimalist logic (5 difficulties)
4. 🖼️ **Zen Nonogram** (`nonogram/www/`) — 5,000-level Picross pixel art tapestry
5. 💣 **Inferno Sweeper** (`minesweeper/www/`) — Tactical 90s demonic sci-fi minefield
6. 🀄 **Celestial Jade** (`mahjong/www/`) — Imperial jade 3D tile-matching sanctuary
7. 🔐 **Black Vault** (`codebreaker/www/`) — Cyber heist mastermind codebreaker
8. 🔤 **Word Search Classic** (`wordsearch/www/`) — Artisan coffee house word hunt
9. 🕷️ **Spider Solitaire** (`spidersolitaire/www/`) — Cobweb Manor 1, 2, and 4 suits
10. ♠️ **Royal Spades** (`spades/www/`) — 4-player AI trick-taking (2's Wild)

---

## 📄 Strategy & Release Roadmap
* **Executive Roadmap PDF:** [`BRAND_GAMES_ROADMAP.pdf`](file:///Users/sam/Developer/games/BRAND_GAMES_ROADMAP.pdf)
* **Roadmap Web Source:** [`docs/roadmap.html`](file:///Users/sam/Developer/games/docs/roadmap.html)

---

## 🚀 How to Play / Run Locally

### Option 1: Open Directly in Browser
Double-click or open [`index.html`](file:///Users/sam/Developer/games/index.html) in any modern browser.

### Option 2: Local HTTP Server
```bash
python3 -m http.server 8085
# or
npx serve -l 8085 .
```
Then visit `http://localhost:8085/`.

