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

Plugin: `@revenuecat/purchases-capacitor` **9.2.2**, which peers `@capacitor/core` `^6.0.0` (this hub is Capacitor 6.2.x). Releases 10 and newer require Capacitor 7+.

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

`sync-hub.js` copies `assets/` (including `arcade-store.js`, the config, the boot script, and `assets/vendor/arcade-purchases.js`) into `www/`. After changing the plugin version, rebuild the bridge bundle:

```bash
npm run bundle:store
node sync-hub.js
```

Register the native plugin with the iOS and Android projects (generated Capacitor files such as `android/capacitor.settings.gradle` stay gitignored):

```bash
npm run cap:sync
```

## App Store Connect

1. Open the app whose bundle ID is `com.gamingempire.benchmarkarcade`.
2. Confirm the Paid Apps agreement, tax, and banking are active.
3. Create four **Non-Consumable** in-app purchases. Use the product IDs in the table above exactly. Do not create consumables, subscriptions, or XP packs.
4. Add a display name, a description, and a price for each. The localized `priceString` from StoreKit is what the hub shows.
5. Submit the products with the app version (or clear them for review, depending on the current App Store state).
6. Create a Sandbox Apple ID under Users and Access → Sandbox.

## Play Console

1. Open the app with application ID `com.gamingempire.benchmarkarcade`.
2. Set up a merchant account if one is not already active.
3. Create four **one-time** in-app products (not subscriptions) with the same product IDs.
4. Activate each product and set a price.
5. Add license testers so the sandbox account can buy without a charge.

## RevenueCat dashboard

1. Create or open a project and add two apps: iOS (bundle ID `com.gamingempire.benchmarkarcade`) and Android (same application ID).
2. Copy each app’s **public** SDK key into `assets/arcade-store-config.js`.
3. Create entitlements `arcade_patron`, `arcade_crt_vectrex`, `arcade_crt_c64`, and `arcade_crt_tron`.
4. Import or attach the store products and attach each product to its matching entitlement. One product, one entitlement.
5. Create an offering with identifier `arcade` and mark it **current**.
6. Add four packages to that offering (custom identifiers `patron`, `crt_vectrex`, `crt_c64`, `crt_tron` are fine). Point each package at the matching store product.
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
