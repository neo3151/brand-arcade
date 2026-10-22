# Hub in-app purchases (RevenueCat)

Purchases belong to the hub app only: `com.gamingempire.benchmarkarcade` (Benchmark Arcade). Standalone game apps stay free and do not depend on `@revenuecat/purchases-capacitor`. The website and installed PWA stay free: `ArcadeStore.init()` configures RevenueCat only when `Capacitor.isNativePlatform()` is true and a real public SDK key is present. Everywhere else, catalog rows show **Unavailable** and no purchase call is made.

Gameplay hints, undos, and power-ups stay on the Fair Play daily refill. This phase sells two kinds of one-time non-consumables:

| Product | Product ID | Entitlement | What the player gets |
| --- | --- | --- | --- |
| Arcade Patron | `com.gamingempire.benchmarkarcade.arcade.patron` | `arcade_patron` | Passport badge row, gold `--arcade-bezel` / `--arcade-border`, thank-you note. **0 XP.** Not a trophy. |
| Vectrex Vector | `com.gamingempire.benchmarkarcade.arcade.crt.vectrex` | `arcade_crt_vectrex` | Premium CRT phosphor |
| Commodore 64 | `com.gamingempire.benchmarkarcade.arcade.crt.c64` | `arcade_crt_c64` | Premium CRT phosphor |
| Tron Grid | `com.gamingempire.benchmarkarcade.arcade.crt.tron` | `arcade_crt_tron` | Premium CRT phosphor |

The four original phosphors (Cyberpunk Neon, Game Boy DMG-01, Amber Phosphor CRT, Midnight Synthwave) have no entitlement and stay free. Locked themes can be previewed. `applyTheme` refuses them until the entitlement is active. XP and achievements are never products.

## Per-game cosmetic packs

These are additional **non-consumables** on the same hub app. Coin-earnable themes stay coin-earnable. Paid looks sit beside them. Nothing in this table changes hints, levels, or rules. Enter the **store price** in App Store Connect and Play Console. The hub shows that localized `priceString` plus Buy. The website and the installed PWA show **Unavailable** and do not hard-code these amounts.

`game.html?theme=<skin id>` previews a look without saving it. Equipping writes `localStorage['arcade_cosmetic_v1']` only after `ArcadeStore.owns` the entitlement. Card Room (`cardroom_pack`) also unlocks the Solitaire atelier, Spider atelier, and Spades salon looks. Owning one of those packs does not unlock the others.

| Product | Product ID | Entitlement | Store price | What the player gets |
| --- | --- | --- | --- | --- |
| Marble | `com.gamingempire.benchmarkarcade.blockblast.skin.marble` | `blockblast_skin_marble` | $0.99 | Block Blast stone cabinet |
| Walnut Inlay | `com.gamingempire.benchmarkarcade.blockblast.skin.walnut` | `blockblast_skin_walnut` | $0.99 | Block Blast burl cabinet |
| Stained Glass | `com.gamingempire.benchmarkarcade.blockblast.skin.stainedglass` | `blockblast_skin_stainedglass` | $0.99 | Block Blast leaded cabinet |
| Solitaire Atelier | `com.gamingempire.benchmarkarcade.solitaire.pack.atelier` | `solitaire_pack_atelier` | $1.99 | Noir Atelier and Burgundy Felt (backs and cloth) |
| Spider Atelier | `com.gamingempire.benchmarkarcade.spidersolitaire.pack.atelier` | `spidersolitaire_pack_atelier` | $1.99 | Violet Web and Emerald Cloth (backs and cloth) |
| Card Room | `com.gamingempire.benchmarkarcade.cardroom.pack.cardroom` | `cardroom_pack` | $4.99 | Both atelier packs plus Monte Carlo and Art Deco |
| Spades Salon | `com.gamingempire.benchmarkarcade.spades.pack.salon` | `spades_pack_salon` | $1.99 | Monte Carlo and Art Deco felts and decks |
| Mahjong Tiles | `com.gamingempire.benchmarkarcade.mahjong.pack.tiles` | `mahjong_pack_tiles` | $1.99 | Ivory, Bamboo, Porcelain Blue |
| Minesweeper Sectors | `com.gamingempire.benchmarkarcade.minesweeper.pack.sectors` | `minesweeper_pack_sectors` | $1.99 | Europa Ice and Venus Acid, including flag and blast colors |
| Codebreaker Terminals | `com.gamingempire.benchmarkarcade.codebreaker.pack.terminals` | `codebreaker_pack_terminals` | $1.99 | Green phosphor, amber, hacker red |
| Sudoku Ink | `com.gamingempire.benchmarkarcade.sudoku.pack.ink` | `sudoku_pack_ink` | $1.99 | Washi, Night Ink, Sumi-e |
| Nonogram Mosaic | `com.gamingempire.benchmarkarcade.nonogram.pack.mosaic` | `nonogram_pack_mosaic` | $1.99 | Kintsugi and Indigo Mosaic |
| Word Search Atlas | `com.gamingempire.benchmarkarcade.wordsearch.pack.atlas` | `wordsearch_pack_atlas` | $1.99 | Atlas and Neon Ink |

Skin ids used by `?theme=` are `marble`, `walnut`, `stainedglass`, `solitaire-noir`, `solitaire-burgundy`, `spider-violet`, `spider-emerald`, `montecarlo`, `artdeco`, `ivory`, `bamboo`, `porcelain`, `europa`, `venus`, `phosphor`, `amber`, `hacker`, `washi`, `nightink`, `sumie`, `kintsugi`, `indigo`, `atlas`, and `neonink`.

Hub game pages are served from `www/<game>/www/` (see `sync-hub.js`). That path is deep enough for the page loader to pull `assets/arcade-store.js`, `assets/arcade-cosmetics.js`, and `assets/arcade-cosmetics.css` out of the hub webDir. A standalone game webview opens `/index.html`. The loader returns before it requests those files, so the standalone app stays free and makes no store call.

Plugin pin: `@revenuecat/purchases-capacitor` **13.7.6** on Capacitor **8.5.3** (hub only). That plugin pins `PurchasesHybridCommon` **19.15.0**, which pins RevenueCat iOS **5.98.0**. Standalone game apps stay on their own Capacitor 6 projects and do not depend on this plugin.

`purchases-capacitor` 9.2.2 (Capacitor 6) pulls `PurchasesHybridCommon` 13.26.0 / RevenueCat 5.20.0, which does not compile on Xcode 27.1 (`invalid redeclaration of synthesized memberwise init(stringRepresentation:)` in `PaywallColor.swift`, and the matching ambiguous init in `CustomerCenterConfigData.swift`). Plugin 10.0.2 does not fix that: it still depends on `PurchasesHybridCommon` 13.17.1. The newest Capacitor 7 plugin, 11.3.3, stops at RevenueCat 5.67.1, which still has the same synthesized-init bug. RevenueCat 5.89.0 moved the designated initializer into the struct body, and 5.98.0 is the version `PurchasesHybridCommon` 19.15.0 requires. Reaching that pod means Capacitor 8.

## Where API keys go

Edit `assets/arcade-store-config.js`:

```js
window.ARCADE_STORE_CONFIG = {
  iosApiKey: 'appl_...',      // RevenueCat public iOS SDK key
  androidApiKey: 'goog_...'   // RevenueCat public Android SDK key
};
```

These are the public SDK keys from RevenueCat → Project → API keys. They are not server secrets. Do not commit live keys; leave the `REPLACE_WITH_` placeholders in git. `ArcadeStore` will not call `Purchases.configure` while a key still starts with `REPLACE_WITH_`.

Entitlements are cached in `localStorage['arcade_entitlements']`. Passport progress stays in IndexedDB `BrandArcadePassportDB` and `localStorage['arcade_passport_state']`. Resetting or exporting the Passport does not read or delete the entitlement cache. The hub “reset coin credits” button does not clear it either.

`sync-hub.js` copies `assets/` (including `arcade-store.js`, `arcade-cosmetics.js`, `arcade-cosmetics.css`, the config, the boot script, and `assets/vendor/arcade-purchases.js`) into `www/`, then copies each game’s `www/` into `www/<game>/www/`. After changing the plugin version, rebuild the bridge bundle:

```bash
npm run bundle:store
node sync-hub.js
```

The hub iOS deployment target is already 15.0, which matches the plugin. Android Gradle is the Capacitor 8.5 template (AGP 8.13.0, Gradle 8.14.3, compileSdk 36, minSdk 24). `ios/App/Podfile` includes the `RevenuecatPurchasesCapacitor` pod.

After pulling this branch, refresh native deps from the hub repo root. A stale `Pods/` directory from the Capacitor 6 plugin will keep compiling RevenueCat 5.20.0.

```bash
npm install
npm run bundle:store
npm run cap:sync
```

`cap sync` copies `www/` and runs `pod install` on macOS. If sync is not convenient, from `ios/App` run `pod install --repo-update`, then in Xcode use Product → Clean Build Folder and build again. `Podfile.lock` should show `RevenueCat` 5.98.0 and `PurchasesHybridCommon` 19.15.0.

The Fair Play branch (`cursor/fair-play-economy-19bc`) does not reference RevenueCat in `package.json` or `ios/App/Podfile`.

## App Store Connect

1. Open the app whose bundle ID is `com.gamingempire.benchmarkarcade`.
2. Confirm the Paid Apps agreement, tax, and banking are active.
3. Create every **Non-Consumable** in the tables above. Use the product IDs exactly. Do not create consumables, subscriptions, or XP packs.
4. Add a display name, a description, and a price for each. The localized `priceString` from StoreKit is what the hub shows.
5. Submit the products with the app version (or clear them for review, depending on the current App Store state).
6. Create a Sandbox Apple ID under Users and Access → Sandbox.

## Play Console

1. Open the app with application ID `com.gamingempire.benchmarkarcade`.
2. Set up a merchant account if one is not already active.
3. Create every **one-time** in-app product (not subscriptions) with the same product IDs.
4. Activate each product and set a price.
5. Add license testers so the sandbox account can buy without a charge.

## RevenueCat dashboard

1. Create or open a project and add two apps: iOS (bundle ID `com.gamingempire.benchmarkarcade`) and Android (same application ID).
2. Copy each app’s **public** SDK key into `assets/arcade-store-config.js`.
3. Create the entitlements in both tables: `arcade_patron`, `arcade_crt_vectrex`, `arcade_crt_c64`, `arcade_crt_tron`, and every cosmetic entitlement (`blockblast_skin_marble`, `blockblast_skin_walnut`, `blockblast_skin_stainedglass`, `solitaire_pack_atelier`, `spidersolitaire_pack_atelier`, `cardroom_pack`, `spades_pack_salon`, `mahjong_pack_tiles`, `minesweeper_pack_sectors`, `codebreaker_pack_terminals`, `sudoku_pack_ink`, `nonogram_pack_mosaic`, `wordsearch_pack_atlas`).
4. Import or attach the store products and attach each product to its matching entitlement. One product, one entitlement. Card Room attaches only to `cardroom_pack`. The hub treats that entitlement as the Solitaire atelier, the Spider atelier, and the Spades salon. You do not need to attach those three entitlements to the Card Room product.
5. Create an offering with identifier `arcade` and mark it **current**.
6. Add one package per product and point it at that store product. Custom identifiers that match the catalog ids are fine: `patron`, `crt_vectrex`, `crt_c64`, `crt_tron`, `marble`, `walnut`, `stainedglass`, `solitaire-atelier`, `spider-atelier`, `cardroom`, `spades-salon`, `mahjong-tiles`, `minesweeper-sectors`, `codebreaker-terminals`, `sudoku-ink`, `nonogram-mosaic`, `wordsearch-atlas`.
7. The hub reads `offerings.current.availablePackages[].product.priceString` and purchases with `Purchases.purchasePackage({ aPackage })`. Restore uses `Purchases.restorePurchases()`.

Anonymous App User IDs are fine. The hub passes `appUserID: null` and does not link purchases to a Passport account.

## Sandbox checklist

- With placeholder keys, a native build still launches. Prices say Unavailable, and RevenueCat is not configured.
- In a desktop browser, the Passport shows Patron, the three premium phosphors, and **Restore Purchases**, all Unavailable, with no console error. `getPrice` returns null.
- Preview a locked phosphor. The cabinet colors change. Closing the Passport returns the equipped theme. `applyTheme('vectrex')` returns false until that entitlement is active.
- Sandbox-buy Arcade Patron. The Passport gains the thank-you row, trophy progress stays at 0/8, XP does not increase from the purchase, and the header frame uses the gold bezel (`#3d2b08` / `#e6b325`).
- Sandbox-buy one CRT. The price button becomes **Use this phosphor**. Equipping it is allowed.
- Delete and reinstall, then tap **Restore Purchases** in Passport or in Cabinet Setup. The same entitlements return.
- Reset the Passport (0/8) and export it to the clipboard. `arcade_entitlements` is still present, and the clipboard JSON is only the Passport state.
- Confirm no product grants XP, a trophy, or a gameplay consumable.
- Open a hub game store. Locked cabinet skins show the localized price and Buy, or Unavailable on the web. Preview with `game.html?theme=` and confirm the look is not saved. Coin themes still spend coins. Card Room unlocks the solitaire, spider, and spades salon looks. A standalone game opened at `/index.html` does not load the store.
