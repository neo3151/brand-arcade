/**
 * Loads the Capacitor + RevenueCat bridge when the vendor bundle is present,
 * then asks ArcadeStore to configure itself. A missing bundle, a web browser,
 * or a failed import leaves the store unavailable and does not throw.
 */
(async function () {
  try {
    const mod = await import('./vendor/arcade-purchases.js');
    if (mod && mod.Capacitor) {
      window.Capacitor = window.Capacitor || mod.Capacitor;
    }
    window.ArcadeStoreNative = {
      Capacitor: mod && mod.Capacitor,
      Purchases: mod && mod.Purchases
    };
  } catch (e) {
    /* Web/PWA and tests keep running with the store unavailable. */
  }
  if (window.ArcadeStore && typeof window.ArcadeStore.init === 'function') {
    try {
      await window.ArcadeStore.init();
    } catch (e) {
      /* init reports failure on its return value */
    }
  }
})();
