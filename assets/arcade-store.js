/**
 * arcade-store.js — Hub-only RevenueCat store.
 * Phase 1: Arcade Patron and premium CRT phosphors.
 * Phase 2: per-game cosmetic skins and packs. Gameplay stays free.
 *
 * Standalone game apps do not load this file. On the web and the installed
 * PWA, init() sees a non-native platform and leaves every price unavailable.
 * Entitlements live in localStorage under arcade_entitlements, separate from
 * the Passport IndexedDB / arcade_passport_state, so a Passport reset or
 * clipboard export does not touch purchases.
 *
 * API keys come from window.ARCADE_STORE_CONFIG (assets/arcade-store-config.js).
 * Placeholder values are not sent to RevenueCat.
 */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'arcade_entitlements';
  const PATRON_BEZEL = '#3d2b08';
  const PATRON_BORDER = '#e6b325';

  const CATALOG = [
    {
      id: 'patron',
      productId: 'com.gamingempire.benchmarkarcade.arcade.patron',
      entitlementId: 'arcade_patron',
      kind: 'patron',
      name: 'Arcade Patron'
    },
    {
      id: 'vectrex',
      productId: 'com.gamingempire.benchmarkarcade.arcade.crt.vectrex',
      entitlementId: 'arcade_crt_vectrex',
      kind: 'theme',
      themeId: 'vectrex',
      name: 'Vectrex Vector'
    },
    {
      id: 'c64',
      productId: 'com.gamingempire.benchmarkarcade.arcade.crt.c64',
      entitlementId: 'arcade_crt_c64',
      kind: 'theme',
      themeId: 'c64',
      name: 'Commodore 64'
    },
    {
      id: 'tron',
      productId: 'com.gamingempire.benchmarkarcade.arcade.crt.tron',
      entitlementId: 'arcade_crt_tron',
      kind: 'theme',
      themeId: 'tron',
      name: 'Tron Grid'
    },
    {
      id: 'marble',
      productId: 'com.gamingempire.benchmarkarcade.blockblast.skin.marble',
      entitlementId: 'blockblast_skin_marble',
      kind: 'cosmetic',
      name: 'Marble'
    },
    {
      id: 'walnut',
      productId: 'com.gamingempire.benchmarkarcade.blockblast.skin.walnut',
      entitlementId: 'blockblast_skin_walnut',
      kind: 'cosmetic',
      name: 'Walnut Inlay'
    },
    {
      id: 'stainedglass',
      productId: 'com.gamingempire.benchmarkarcade.blockblast.skin.stainedglass',
      entitlementId: 'blockblast_skin_stainedglass',
      kind: 'cosmetic',
      name: 'Stained Glass'
    },
    {
      id: 'solitaire-atelier',
      productId: 'com.gamingempire.benchmarkarcade.solitaire.pack.atelier',
      entitlementId: 'solitaire_pack_atelier',
      kind: 'cosmetic',
      name: 'Solitaire Atelier'
    },
    {
      id: 'spider-atelier',
      productId: 'com.gamingempire.benchmarkarcade.spidersolitaire.pack.atelier',
      entitlementId: 'spidersolitaire_pack_atelier',
      kind: 'cosmetic',
      name: 'Spider Atelier'
    },
    {
      id: 'cardroom',
      productId: 'com.gamingempire.benchmarkarcade.cardroom.pack.cardroom',
      entitlementId: 'cardroom_pack',
      kind: 'cosmetic',
      name: 'Card Room'
    },
    {
      id: 'spades-salon',
      productId: 'com.gamingempire.benchmarkarcade.spades.pack.salon',
      entitlementId: 'spades_pack_salon',
      kind: 'cosmetic',
      name: 'Spades Salon'
    },
    {
      id: 'mahjong-tiles',
      productId: 'com.gamingempire.benchmarkarcade.mahjong.pack.tiles',
      entitlementId: 'mahjong_pack_tiles',
      kind: 'cosmetic',
      name: 'Mahjong Tiles'
    },
    {
      id: 'minesweeper-sectors',
      productId: 'com.gamingempire.benchmarkarcade.minesweeper.pack.sectors',
      entitlementId: 'minesweeper_pack_sectors',
      kind: 'cosmetic',
      name: 'Minesweeper Sectors'
    },
    {
      id: 'codebreaker-terminals',
      productId: 'com.gamingempire.benchmarkarcade.codebreaker.pack.terminals',
      entitlementId: 'codebreaker_pack_terminals',
      kind: 'cosmetic',
      name: 'Codebreaker Terminals'
    },
    {
      id: 'sudoku-ink',
      productId: 'com.gamingempire.benchmarkarcade.sudoku.pack.ink',
      entitlementId: 'sudoku_pack_ink',
      kind: 'cosmetic',
      name: 'Sudoku Ink'
    },
    {
      id: 'nonogram-mosaic',
      productId: 'com.gamingempire.benchmarkarcade.nonogram.pack.mosaic',
      entitlementId: 'nonogram_pack_mosaic',
      kind: 'cosmetic',
      name: 'Nonogram Mosaic'
    },
    {
      id: 'wordsearch-atlas',
      productId: 'com.gamingempire.benchmarkarcade.wordsearch.pack.atlas',
      entitlementId: 'wordsearch_pack_atlas',
      kind: 'cosmetic',
      name: 'Word Search Atlas'
    }
  ];

  function storage() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    } catch (e) { /* private mode */ }
    return null;
  }

  function usableKey(key) {
    return typeof key === 'string' && key.length > 0 && key.indexOf('REPLACE_WITH_') !== 0;
  }

  function unwrapCustomerInfo(result) {
    if (!result) return null;
    if (result.customerInfo && result.customerInfo.entitlements) return result.customerInfo;
    if (result.entitlements) return result;
    return null;
  }

  function normalizeOfferings(result) {
    if (!result) return null;
    if (result.current || result.all) return result;
    if (result.offerings && (result.offerings.current || result.offerings.all)) return result.offerings;
    return null;
  }

  function failure(error) {
    const code = error && (error.code != null ? error.code : (error.error && error.error.code));
    const cancelled = code === '1' || code === 1 || !!(error && error.userCancelled);
    if (cancelled) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'failed' };
  }

  function createStore() {
    const listeners = [];
    const state = {
      mode: 'web',
      configured: false,
      entitlements: {},
      prices: {},
      packages: {},
      sdk: null,
      configuring: null,
      listening: false
    };

    function emit() {
      listeners.slice().forEach(entry => {
        try { entry.cb(); } catch (e) { /* a listener cannot break the store */ }
      });
    }

    function readRaw() {
      const store = storage();
      if (!store) return null;
      try {
        const raw = store.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }

    function loadCache() {
      const saved = readRaw();
      state.entitlements = (saved && saved.entitlements && typeof saved.entitlements === 'object')
        ? Object.assign({}, saved.entitlements)
        : {};
      state.prices = (saved && saved.prices && typeof saved.prices === 'object')
        ? Object.assign({}, saved.prices)
        : {};
      return saved;
    }

    function writeCache() {
      const store = storage();
      if (!store) return;
      try {
        store.setItem(STORAGE_KEY, JSON.stringify({
          entitlements: state.entitlements,
          prices: state.prices,
          updatedAt: new Date().toISOString()
        }));
      } catch (e) { /* quota or private mode */ }
    }

    function applyCustomerInfo(info) {
      if (!info || !info.entitlements) return;
      const active = info.entitlements.active || {};
      const next = {};
      Object.keys(active).forEach(id => {
        const row = active[id];
        if (row && row.isActive === false) return;
        next[id] = true;
      });
      state.entitlements = next;
      writeCache();
      emit();
    }

    function rememberPackage(pkg) {
      if (!pkg || !pkg.product) return;
      const id = pkg.product.identifier || pkg.product.productIdentifier;
      if (!id || state.packages[id]) return;
      state.packages[id] = pkg;
      if (pkg.product.priceString) state.prices[id] = String(pkg.product.priceString);
    }

    function readOfferings(offerings) {
      state.packages = {};
      if (!offerings) return;
      const lists = [];
      if (offerings.current && offerings.current.availablePackages) {
        lists.push(offerings.current.availablePackages);
      }
      if (offerings.all) {
        Object.keys(offerings.all).forEach(key => {
          const offering = offerings.all[key];
          if (offering && offering.availablePackages) lists.push(offering.availablePackages);
        });
      }
      lists.forEach(list => (list || []).forEach(rememberPackage));
      writeCache();
    }

    function resolveNative() {
      const injected = root.ArcadeStoreNative;
      const cap = (injected && injected.Capacitor) || root.Capacitor;
      if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) {
        return null;
      }
      const Purchases = (injected && injected.Purchases) || (cap.Plugins && cap.Plugins.Purchases) || null;
      const platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'native';
      const cfg = root.ARCADE_STORE_CONFIG || {};
      const apiKey = platform === 'android' ? cfg.androidApiKey : cfg.iosApiKey;
      return { Purchases: Purchases, platform: platform, apiKey: apiKey };
    }

    function listenForUpdates() {
      if (state.listening || !state.sdk || typeof state.sdk.addCustomerInfoUpdateListener !== 'function') return;
      state.listening = true;
      try {
        const pending = state.sdk.addCustomerInfoUpdateListener(info => {
          applyCustomerInfo(unwrapCustomerInfo(info) || (info && info.entitlements ? info : null));
        });
        if (pending && typeof pending.catch === 'function') pending.catch(() => {});
      } catch (e) { /* listener is optional */ }
    }

    async function refreshFromRevenueCat() {
      if (!state.sdk) return { platform: state.mode, configured: state.configured };
      try {
        const infoResult = await state.sdk.getCustomerInfo();
        applyCustomerInfo(unwrapCustomerInfo(infoResult));
      } catch (e) {
        emit();
      }
      try {
        const offerings = normalizeOfferings(await state.sdk.getOfferings());
        readOfferings(offerings);
        emit();
      } catch (e) {
        emit();
      }
      return { platform: state.mode, configured: state.configured };
    }

    async function configureAndRefresh(native) {
      await native.Purchases.configure({ apiKey: native.apiKey, appUserID: null });
      state.sdk = native.Purchases;
      state.mode = 'native';
      state.configured = true;
      listenForUpdates();
      return refreshFromRevenueCat();
    }

    function init() {
      try {
        loadCache();
        const native = resolveNative();
        if (!native) {
          state.mode = 'web';
          state.configured = false;
          state.sdk = null;
          emit();
          return Promise.resolve({ platform: 'web', configured: false });
        }
        if (!native.Purchases || typeof native.Purchases.configure !== 'function') {
          state.mode = 'native';
          state.configured = false;
          emit();
          return Promise.resolve({ platform: native.platform, configured: false, reason: 'missing-plugin' });
        }
        if (!usableKey(native.apiKey)) {
          state.mode = 'native';
          state.configured = false;
          emit();
          return Promise.resolve({ platform: native.platform, configured: false, reason: 'placeholder-api-key' });
        }
        if (state.configured && state.sdk) return refreshFromRevenueCat();
        if (state.configuring) return state.configuring;
        state.configuring = configureAndRefresh(native).catch(() => {
          state.configured = false;
          emit();
          return { platform: native.platform, configured: false, reason: 'failed' };
        }).finally(() => {
          state.configuring = null;
        });
        return state.configuring;
      } catch (e) {
        state.configured = false;
        emit();
        return Promise.resolve({ platform: state.mode || 'web', configured: false, reason: 'failed' });
      }
    }

    function owns(entitlementId) {
      return !!state.entitlements[entitlementId];
    }

    function getPrice(productId) {
      if (state.mode !== 'native' || !state.configured) return null;
      return state.prices[productId] || null;
    }

    async function purchase(productId) {
      try {
        if (state.mode !== 'native' || !state.configured || !state.sdk) {
          return { ok: false, reason: 'unavailable' };
        }
        const known = CATALOG.some(item => item.productId === productId);
        const pkg = state.packages[productId];
        if (!known || !pkg) return { ok: false, reason: 'unavailable' };
        const result = await state.sdk.purchasePackage({ aPackage: pkg });
        applyCustomerInfo(unwrapCustomerInfo(result));
        return { ok: true };
      } catch (error) {
        return failure(error);
      }
    }

    async function restore() {
      try {
        if (state.mode !== 'native' || !state.configured || !state.sdk) {
          return { ok: false, reason: 'unavailable' };
        }
        const result = await state.sdk.restorePurchases();
        applyCustomerInfo(unwrapCustomerInfo(result));
        return { ok: true };
      } catch (error) {
        return failure(error);
      }
    }

    function on(event, cb) {
      if (event !== 'change' || typeof cb !== 'function') return function () {};
      const entry = { event: event, cb: cb };
      listeners.push(entry);
      return function () {
        const index = listeners.indexOf(entry);
        if (index >= 0) listeners.splice(index, 1);
      };
    }

    loadCache();

    return {
      CATALOG: CATALOG,
      STORAGE_KEY: STORAGE_KEY,
      PATRON_BEZEL: PATRON_BEZEL,
      PATRON_BORDER: PATRON_BORDER,
      init: init,
      owns: owns,
      purchase: purchase,
      restore: restore,
      getPrice: getPrice,
      on: on,
      loadCache: loadCache
    };
  }

  const api = createStore();
  api.createStore = createStore;
  api.CATALOG = CATALOG;
  api.STORAGE_KEY = STORAGE_KEY;
  api.PATRON_BEZEL = PATRON_BEZEL;
  api.PATRON_BORDER = PATRON_BORDER;

  root.ArcadeStore = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
