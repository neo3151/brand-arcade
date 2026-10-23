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

`sync-hub.js` copies `assets/` (including `arcade-store.js`, `arcade-cosmetics.js`, `arcade-cosmetics.css`, `arcade-content.js`, `arcade-content.css`, the config, the boot script, and `assets/vendor/arcade-purchases.js`) into `www/`, then copies each game’s `www/` into `www/<game>/www/`. After changing the plugin version, rebuild the bridge bundle:

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

## Content packs

These are additional **non-consumables** on the same hub app. They add puzzles beside the free ones. Deals 1–1,000, the original word lists, Turtle / Dragon / Fortress, the 5,000 nonogram levels, and the three clearances stay free and unlocked. Nothing in this table adds hints, scores, or easier rules. Enter the **store price** in App Store Connect and Play Console. The hub shows that localized `priceString` plus Buy. The website shows **Unavailable**.

Each picker shows the pack with a lock, the localized price (or Unavailable), and one or two sample items that can be played before buying. A direct link to a locked item stops on a lock screen instead of opening a free board under another name. `Arcade Words` in Word Search is a free gift and is not part of World Explorer.

Mindful Puzzler (`mindful_pack_puzzler`) unlocks Holiday Pictures, Animal Pictures, Jade Layouts, and World Explorer. It does not unlock Curated Deals or the Heist. Owning one of those four packs does not unlock the others.

| Product | Product ID | Entitlement | Store price | What the player gets |
| --- | --- | --- | --- | --- |
| World Explorer | `com.gamingempire.benchmarkarcade.wordsearch.pack.explorer` | `wordsearch_pack_explorer` | $1.99 | Mythology, Cooking, US National Parks, Ocean Life, Kids' Words |
| Jade Layouts | `com.gamingempire.benchmarkarcade.mahjong.pack.layouts` | `mahjong_pack_layouts` | $1.99 | 10 solvable 144-tile layouts |
| Holiday Pictures | `com.gamingempire.benchmarkarcade.nonogram.pack.holiday` | `nonogram_pack_holiday` | $2.99 | 25 uniquely solvable holiday pictures |
| Animal Pictures | `com.gamingempire.benchmarkarcade.nonogram.pack.animals` | `nonogram_pack_animals` | $2.99 | 25 uniquely solvable animal pictures |
| Curated Deals | `com.gamingempire.benchmarkarcade.solitaire.pack.curated` | `solitaire_pack_curated` | $1.99 | 100 verified draw-1 deals outside 1–1,000 |
| Heist Campaign | `com.gamingempire.benchmarkarcade.codebreaker.pack.heist` | `codebreaker_pack_heist` | $1.99 | 15 hand-written missions with story text |
| Mindful Puzzler | `com.gamingempire.benchmarkarcade.mindful.pack.puzzler` | `mindful_pack_puzzler` | $4.99 | Both picture packs, Jade Layouts, and World Explorer |

Samples that stay playable while locked: Word Search beginner level 1 of Mythology and Cooking, Mahjong Pagoda and Moon Bridge, nonogram picture 1 and 2 of each pack, the first two curated deals, and Heist missions 1 and 2.

## App Store Connect

1. Open the app whose bundle ID is `com.gamingempire.benchmarkarcade`.
2. Confirm the Paid Apps agreement, tax, and banking are active.
3. Create every **Non-Consumable** in the tables above, plus the Complete Collection non-consumable. Create Coffee, Lunch, and Dinner as **Consumables**. Do not create subscriptions or XP packs.
4. Add a display name, a description, and a price for each. The localized `priceString` from StoreKit is what the hub shows.
5. Submit the products with the app version (or clear them for review, depending on the current App Store state).
6. Create a Sandbox Apple ID under Users and Access → Sandbox.

## Play Console

1. Open the app with application ID `com.gamingempire.benchmarkarcade`.
2. Set up a merchant account if one is not already active.
3. Create every one-time product with the same product IDs. Coffee, Lunch, and Dinner are consumable; every other row is a one-time product. Do not create subscriptions.
4. Activate each product and set a price.
5. Add license testers so the sandbox account can buy without a charge.

## RevenueCat dashboard

1. Create or open a project and add two apps: iOS (bundle ID `com.gamingempire.benchmarkarcade`) and Android (same application ID).
2. Copy each app’s **public** SDK key into `assets/arcade-store-config.js`.
3. Create the entitlements in both tables below, including `bundle_complete`. Tips have no entitlement.
4. Import or attach the store products and attach each product to its matching entitlement. One product, one entitlement. Card Room attaches only to `cardroom_pack`. The hub treats that entitlement as the Solitaire atelier, the Spider atelier, and the Spades salon. Mindful Puzzler attaches only to `mindful_pack_puzzler`. The hub treats that entitlement as Holiday Pictures, Animal Pictures, Jade Layouts, and World Explorer. You do not need to attach those included entitlements to the bundle products.
5. Create an offering with identifier `arcade` and mark it **current**.
6. Add one package per product and point it at that store product. Custom identifiers that match the catalog ids are fine: `patron`, `vectrex`, `c64`, `tron`, `marble`, `walnut`, `stainedglass`, `solitaire-atelier`, `spider-atelier`, `cardroom`, `spades-salon`, `mahjong-tiles`, `minesweeper-sectors`, `codebreaker-terminals`, `sudoku-ink`, `nonogram-mosaic`, `wordsearch-atlas`, `explorer`, `layouts`, `holiday`, `animals`, `curated`, `heist`, `puzzler`, `complete`, `tip-coffee`, `tip-lunch`, `tip-dinner`. Mark the three tip packages as consumable.
7. The hub reads `offerings.current.availablePackages[].product.priceString` and purchases with `Purchases.purchasePackage({ aPackage })`. Restore uses `Purchases.restorePurchases()`.

Anonymous App User IDs are fine. The hub passes `appUserID: null` and does not link purchases to a Passport account.

## Sandbox checklist

- With placeholder keys, a native build still launches. Prices say Unavailable, and RevenueCat is not configured.
- In a desktop browser, the Passport shows Patron and the three premium phosphors and links to the Arcade Shop. It has no buy button and no restore button. The shop shows Unavailable, with no console error. `getPrice` returns null.
- Preview a locked phosphor. The cabinet colors change. Closing the Passport returns the equipped theme. `applyTheme('vectrex')` returns false until that entitlement is active.
- Sandbox-buy Arcade Patron. The Passport gains the thank-you row, trophy progress stays at 0/8, XP does not increase from the purchase, and the header frame uses the gold bezel (`#3d2b08` / `#e6b325`).
- Sandbox-buy one CRT from the Arcade Shop. In the Passport the button becomes **Use this phosphor**. Equipping it is allowed.
- Delete and reinstall, then tap **Restore purchases** on the Arcade Shop. The same entitlements return.
- Reset the Passport (0/8) and export it to the clipboard. `arcade_entitlements` is still present, and the clipboard JSON is only the Passport state.
- Confirm no product grants XP, a trophy, or a gameplay consumable.
- Open a hub game store. Locked cabinet skins show the localized price and Buy, or Unavailable on the web. Preview with `game.html?theme=` and confirm the look is not saved. Coin themes still spend coins. Card Room unlocks the solitaire, spider, and spades salon looks. A standalone game opened at `/index.html` does not load the store.
- Open a hub picker for Word Search, Mahjong, Nonogram, Solitaire, or Codebreaker. The content pack shows a lock and a link to the Arcade Shop, plus one or two samples. The shelf itself has no buy button. Buying Mindful Puzzler in the sandbox unlocks both picture packs, the layouts, and World Explorer, and leaves Curated Deals and the Heist locked. A locked direct link does not start a free board.
- Open the Arcade Shop. It lists Patron, Complete Collection, Card Room, Mindful Puzzler, the tip jar, a link to each game shelf, and Restore. On the web every buy button says Unavailable. Sandbox-buy Complete Collection and confirm Patron, every CRT, every cosmetic (including Card Room), and every content pack unlock without a second purchase. The Passport and the game shelves do not show a buy or restore button.
- Sandbox-buy Coffee, then Lunch, then Dinner. The Passport supporter stamp moves from Supporter to Regular to House Favorite. XP stays unchanged. Restore on a reinstall counts the tip transactions RevenueCat returns in `nonSubscriptionTransactions`.

## Final catalog (28 products)

The hub `ArcadeStore.CATALOG` is the source of truth. Complete Collection grants every row opted in with `inCompleteCollection`. Tips and the collection itself are not in that list, so a future product stays out until someone opts it in. The Arcade Shop at `shop.html` is the only screen with a buy button, a tip button, or restore. Shelves and the Passport link there.

Enter the **store price** in App Store Connect and Play Console. The shop shows the localized `priceString`. When every included product and the collection share a currency, the shop also shows the localized difference versus buying those items separately. The website never prints these amounts.

| Product | Product ID | Entitlement | Type | Store price | In Complete Collection |
| --- | --- | --- | --- | --- | --- |
| Arcade Patron | `com.gamingempire.benchmarkarcade.arcade.patron` | `arcade_patron` | Non-consumable | Set in the stores | Yes |
| Vectrex Vector | `com.gamingempire.benchmarkarcade.arcade.crt.vectrex` | `arcade_crt_vectrex` | Non-consumable | Set in the stores | Yes |
| Commodore 64 | `com.gamingempire.benchmarkarcade.arcade.crt.c64` | `arcade_crt_c64` | Non-consumable | Set in the stores | Yes |
| Tron Grid | `com.gamingempire.benchmarkarcade.arcade.crt.tron` | `arcade_crt_tron` | Non-consumable | Set in the stores | Yes |
| Marble | `com.gamingempire.benchmarkarcade.blockblast.skin.marble` | `blockblast_skin_marble` | Non-consumable | $0.99 | Yes |
| Walnut Inlay | `com.gamingempire.benchmarkarcade.blockblast.skin.walnut` | `blockblast_skin_walnut` | Non-consumable | $0.99 | Yes |
| Stained Glass | `com.gamingempire.benchmarkarcade.blockblast.skin.stainedglass` | `blockblast_skin_stainedglass` | Non-consumable | $0.99 | Yes |
| Solitaire Atelier | `com.gamingempire.benchmarkarcade.solitaire.pack.atelier` | `solitaire_pack_atelier` | Non-consumable | $1.99 | Yes |
| Spider Atelier | `com.gamingempire.benchmarkarcade.spidersolitaire.pack.atelier` | `spidersolitaire_pack_atelier` | Non-consumable | $1.99 | Yes |
| Card Room | `com.gamingempire.benchmarkarcade.cardroom.pack.cardroom` | `cardroom_pack` | Non-consumable | $4.99 | Yes |
| Spades Salon | `com.gamingempire.benchmarkarcade.spades.pack.salon` | `spades_pack_salon` | Non-consumable | $1.99 | Yes |
| Mahjong Tiles | `com.gamingempire.benchmarkarcade.mahjong.pack.tiles` | `mahjong_pack_tiles` | Non-consumable | $1.99 | Yes |
| Minesweeper Sectors | `com.gamingempire.benchmarkarcade.minesweeper.pack.sectors` | `minesweeper_pack_sectors` | Non-consumable | $1.99 | Yes |
| Codebreaker Terminals | `com.gamingempire.benchmarkarcade.codebreaker.pack.terminals` | `codebreaker_pack_terminals` | Non-consumable | $1.99 | Yes |
| Sudoku Ink | `com.gamingempire.benchmarkarcade.sudoku.pack.ink` | `sudoku_pack_ink` | Non-consumable | $1.99 | Yes |
| Nonogram Mosaic | `com.gamingempire.benchmarkarcade.nonogram.pack.mosaic` | `nonogram_pack_mosaic` | Non-consumable | $1.99 | Yes |
| Word Search Atlas | `com.gamingempire.benchmarkarcade.wordsearch.pack.atlas` | `wordsearch_pack_atlas` | Non-consumable | $1.99 | Yes |
| World Explorer | `com.gamingempire.benchmarkarcade.wordsearch.pack.explorer` | `wordsearch_pack_explorer` | Non-consumable | $1.99 | Yes |
| Jade Layouts | `com.gamingempire.benchmarkarcade.mahjong.pack.layouts` | `mahjong_pack_layouts` | Non-consumable | $1.99 | Yes |
| Holiday Pictures | `com.gamingempire.benchmarkarcade.nonogram.pack.holiday` | `nonogram_pack_holiday` | Non-consumable | $2.99 | Yes |
| Animal Pictures | `com.gamingempire.benchmarkarcade.nonogram.pack.animals` | `nonogram_pack_animals` | Non-consumable | $2.99 | Yes |
| Curated Deals | `com.gamingempire.benchmarkarcade.solitaire.pack.curated` | `solitaire_pack_curated` | Non-consumable | $1.99 | Yes |
| Heist Campaign | `com.gamingempire.benchmarkarcade.codebreaker.pack.heist` | `codebreaker_pack_heist` | Non-consumable | $1.99 | Yes |
| Mindful Puzzler | `com.gamingempire.benchmarkarcade.mindful.pack.puzzler` | `mindful_pack_puzzler` | Non-consumable | $4.99 | Yes |
| Complete Collection | `com.gamingempire.benchmarkarcade.bundle.complete` | `bundle_complete` | Non-consumable | $14.99 | No (it is the grant) |
| Coffee | `com.gamingempire.benchmarkarcade.tip.coffee` | — | Consumable | $1.99 | No |
| Lunch | `com.gamingempire.benchmarkarcade.tip.lunch` | — | Consumable | $4.99 | No |
| Dinner | `com.gamingempire.benchmarkarcade.tip.dinner` | — | Consumable | $9.99 | No |

Offering `arcade` (current) maps one package to each row: `patron`, `vectrex`, `c64`, `tron`, `marble`, `walnut`, `stainedglass`, `solitaire-atelier`, `spider-atelier`, `cardroom`, `spades-salon`, `mahjong-tiles`, `minesweeper-sectors`, `codebreaker-terminals`, `sudoku-ink`, `nonogram-mosaic`, `wordsearch-atlas`, `explorer`, `layouts`, `holiday`, `animals`, `curated`, `heist`, `puzzler`, `complete`, `tip-coffee`, `tip-lunch`, `tip-dinner`.

I used the earlier phase prices for Patron and the CRT themes as $2.99 and $0.99. Let me verify the original docs didn't specify patron/crt dollar prices in the first table... The first table didn't include store prices for patron and CRTs. I invented $2.99 and $0.99. The user only specified Complete Collection $14.99 and tips $1.99/$4.99/$9.99. I should NOT invent patron and CRT prices if they weren't specified.

Looking at the original docs table, Patron and CRTs don't have a store price column. Phase 2 and 3 have prices. I should mark Patron and CRT store prices as "set in the store" or look at passport/code for a price. The user didn't specify them. I'll put "Set in App Store Connect" or leave the price blank / "store price" rather than inventing $2.99 and $0.99.

If earlier phases documented them somewhere... The first table doesn't have prices. I'll use an em dash or "store price" for those four so I don't invent numbers. The final table can say the amount only where a phase specified it.

I'll fix the table prices for patron and CRTs to not invent dollars. "Set in the stores" is honest.

Also I should check phase 1 if a price was mentioned in conversation. The summary didn't list patron price. I'll change those four cells.
