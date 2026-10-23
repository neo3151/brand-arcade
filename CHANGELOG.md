# Changelog

Hub app only (`com.gamingempire.benchmarkarcade`). Standalone game apps stay free. The final RevenueCat catalog has **28 products**.

## Phase 0 — Fair Play

Replaced simulated coin shops for hints and power-ups with a morning refill of 15 consumables. Level unlocks sit at 1,000 coins. No real-money products.

## Phase 1 — Hub store

RevenueCat store for Arcade Patron and three premium CRT phosphors (Vectrex Vector, Commodore 64, Tron Grid). The four original phosphors stay free. Purchases grant 0 XP. Capacitor is pinned at 8.5.3 and `@revenuecat/purchases-capacitor` at 13.7.6 (PurchasesHybridCommon 19.15.0, RevenueCat iOS 5.98.0) so the hub builds on Xcode 27.

## Phase 2 — Cosmetic skins

Paid looks beside the coin themes for all 10 games: Block Blast cabinets, solitaire and spider ateliers, Card Room, Spades salon, mahjong tiles, minesweeper sectors, codebreaker terminals, sudoku ink, nonogram mosaic, and word search atlas. Card Room grants the two ateliers and the salon. Skins do not change rules or hints.

## Phase 3 — Content packs

Extra puzzles beside the free boards: World Explorer, Jade Layouts, Holiday Pictures, Animal Pictures, Curated Deals, the Heist, and the Mindful Puzzler bundle (both picture packs, the layouts, and World Explorer). Samples stay playable. A locked direct link does not fall through to a free board. Arcade Words is a free Word Search gift.

## Phase 4 — Complete Collection, tips, and the Arcade Shop

Complete Collection (`com.gamingempire.benchmarkarcade.bundle.complete`, $14.99, entitlement `bundle_complete`) grants every catalog row opted into `inCompleteCollection`: Patron, the premium CRTs, every Phase 2 skin and pack including Card Room, and every Phase 3 content pack. A future product stays out until it is opted in. The shop shows savings against buying those items separately when localized prices share a currency.

The tip jar is three consumables: Coffee $1.99, Lunch $4.99, Dinner $9.99. Each tip adds a Passport supporter stamp that upgrades with the tip count (Supporter, Regular, House Favorite), shows a thank-you, and grants 0 XP. Tips do not change gameplay. The count is stored locally and filled in from RevenueCat `nonSubscriptionTransactions` on restore when that history is present.

`shop.html` is the only screen with buy buttons, tip buttons, and restore. It lists Patron, Complete Collection, the bundles, the tip jar, and a link to each game's shelf. Passport and the game shelves do not sell.
