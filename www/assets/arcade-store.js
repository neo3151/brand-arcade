/**
 * arcade-store.js — Hub-only RevenueCat store.
 * Phase 1: Arcade Patron and premium CRT phosphors.
 * Phase 2: per-game cosmetic skins and packs. Gameplay stays free.
 * Phase 3: extra content packs. Existing free boards stay unlocked.
 * Phase 4: Complete Collection, tip jar, and the Arcade Shop screen.
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

  // listPrice is the planned App Store / Play amount for setup. The shop
  // never reads it. getPrice() stays the localized store string, or null on the web.
  const CATALOG = [
    {
      id: 'patron',
      productId: 'com.gamingempire.benchmarkarcade.arcade.patron',
      entitlementId: 'arcade_patron',
      kind: 'patron',
      listPrice: '$4.99',
      name: 'Arcade Patron'
    },
    {
      id: 'vectrex',
      productId: 'com.gamingempire.benchmarkarcade.arcade.crt.vectrex',
      entitlementId: 'arcade_crt_vectrex',
      kind: 'theme',
      themeId: 'vectrex',
      listPrice: '$0.99',
      name: 'Vectrex Vector'
    },
    {
      id: 'c64',
      productId: 'com.gamingempire.benchmarkarcade.arcade.crt.c64',
      entitlementId: 'arcade_crt_c64',
      kind: 'theme',
      themeId: 'c64',
      listPrice: '$0.99',
      name: 'Commodore 64'
    },
    {
      id: 'tron',
      productId: 'com.gamingempire.benchmarkarcade.arcade.crt.tron',
      entitlementId: 'arcade_crt_tron',
      kind: 'theme',
      themeId: 'tron',
      listPrice: '$0.99',
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
    },
    {
      id: 'explorer',
      productId: 'com.gamingempire.benchmarkarcade.wordsearch.pack.explorer',
      entitlementId: 'wordsearch_pack_explorer',
      kind: 'content',
      name: 'World Explorer'
    },
    {
      id: 'layouts',
      productId: 'com.gamingempire.benchmarkarcade.mahjong.pack.layouts',
      entitlementId: 'mahjong_pack_layouts',
      kind: 'content',
      name: 'Jade Layouts'
    },
    {
      id: 'holiday',
      productId: 'com.gamingempire.benchmarkarcade.nonogram.pack.holiday',
      entitlementId: 'nonogram_pack_holiday',
      kind: 'content',
      name: 'Holiday Pictures'
    },
    {
      id: 'animals',
      productId: 'com.gamingempire.benchmarkarcade.nonogram.pack.animals',
      entitlementId: 'nonogram_pack_animals',
      kind: 'content',
      name: 'Animal Pictures'
    },
    {
      id: 'curated',
      productId: 'com.gamingempire.benchmarkarcade.solitaire.pack.curated',
      entitlementId: 'solitaire_pack_curated',
      kind: 'content',
      name: 'Curated Deals'
    },
    {
      id: 'heist',
      productId: 'com.gamingempire.benchmarkarcade.codebreaker.pack.heist',
      entitlementId: 'codebreaker_pack_heist',
      kind: 'content',
      name: 'Heist Campaign'
    },
    {
      id: 'puzzler',
      productId: 'com.gamingempire.benchmarkarcade.mindful.pack.puzzler',
      entitlementId: 'mindful_pack_puzzler',
      kind: 'content',
      bundle: true,
      name: 'Mindful Puzzler'
    },
    {
      id: 'complete',
      productId: 'com.gamingempire.benchmarkarcade.bundle.complete',
      entitlementId: 'bundle_complete',
      kind: 'bundle',
      bundle: true,
      name: 'Complete Collection'
    },
    {
      id: 'tip-coffee',
      productId: 'com.gamingempire.benchmarkarcade.tip.coffee',
      kind: 'tip',
      consumable: true,
      name: 'Coffee'
    },
    {
      id: 'tip-lunch',
      productId: 'com.gamingempire.benchmarkarcade.tip.lunch',
      kind: 'tip',
      consumable: true,
      name: 'Lunch'
    },
    {
      id: 'tip-dinner',
      productId: 'com.gamingempire.benchmarkarcade.tip.dinner',
      kind: 'tip',
      consumable: true,
      name: 'Dinner'
    }
  ];

  // Deliberate opt-in. A future catalog row stays out of Complete Collection
  // until its id is added here. Tips and the bundle itself are not members.
  const IN_COMPLETE = [
    'patron', 'vectrex', 'c64', 'tron',
    'marble', 'walnut', 'stainedglass',
    'solitaire-atelier', 'spider-atelier', 'cardroom', 'spades-salon',
    'mahjong-tiles', 'minesweeper-sectors', 'codebreaker-terminals',
    'sudoku-ink', 'nonogram-mosaic', 'wordsearch-atlas',
    'explorer', 'layouts', 'holiday', 'animals', 'curated', 'heist', 'puzzler'
  ];

  CATALOG.forEach(item => {
    if (IN_COMPLETE.indexOf(item.id) !== -1) item.inCompleteCollection = true;
    if (item.id === 'cardroom') item.bundle = true;
  });

  const TIP_LEAD = {
    'tip-coffee': 'Thanks for the coffee.',
    'tip-lunch': 'Thanks for lunch.',
    'tip-dinner': 'Thanks for dinner.'
  };

  function findProduct(productId) {
    for (let i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].productId === productId) return CATALOG[i];
    }
    return null;
  }

  function completeGrants() {
    const ids = [];
    CATALOG.forEach(item => {
      if (item.inCompleteCollection && item.entitlementId && ids.indexOf(item.entitlementId) < 0) {
        ids.push(item.entitlementId);
      }
    });
    return ids;
  }

  function tipThanks(item) {
    const lead = TIP_LEAD[item.id] || 'Thank you.';
    return lead + ' This supporter stamp is a thank-you. It grants 0 XP and does not change gameplay, hints, or scores.';
  }

  function supporterTier(count) {
    const n = Number(count) || 0;
    if (n <= 0) return null;
    if (n === 1) return { id: 'supporter', name: 'Supporter', count: n };
    if (n === 2) return { id: 'regular', name: 'Regular', count: n };
    return { id: 'house', name: 'House Favorite', count: n };
  }

  function shopHref() {
    let path = '';
    try {
      path = (root.location && root.location.pathname) || '';
    } catch (e) { path = ''; }
    const parts = String(path).split('/').filter(Boolean);
    const depth = Math.max(0, parts.length - 1);
    let prefix = '';
    for (let i = 0; i < depth; i++) prefix += '../';
    return prefix + 'shop.html';
  }

  function emptyTips() {
    return { count: 0, applied: {}, unmatched: 0, lastMessage: '' };
  }

  function tipTransactionsFrom(source) {
    const out = [];
    if (!source || typeof source !== 'object') return out;
    const buckets = [];
    const seenNodes = [];
    function take(node) {
      if (!node || typeof node !== 'object' || seenNodes.indexOf(node) !== -1) return;
      seenNodes.push(node);
      if (Array.isArray(node.nonSubscriptionTransactions)) buckets.push(node.nonSubscriptionTransactions);
      if (Array.isArray(node.nonSubscriptions)) buckets.push(node.nonSubscriptions);
      if (node.transaction && typeof node.transaction === 'object') buckets.push([node.transaction]);
      if (node.customerInfo) take(node.customerInfo);
    }
    take(source);
    const allowed = {};
    CATALOG.forEach(item => { if (item.kind === 'tip') allowed[item.productId] = true; });
    const seen = {};
    buckets.forEach(list => {
      list.forEach(tx => {
        if (!tx) return;
        const productId = tx.productIdentifier || tx.productId;
        if (!allowed[productId]) return;
        const id = tx.transactionIdentifier || tx.transactionId || tx.id ||
          (productId + '@' + (tx.purchaseDate || tx.purchaseDateMillis || ''));
        if (!id || seen[id]) return;
        seen[id] = true;
        out.push({ id: String(id), productId: productId });
      });
    });
    return out;
  }

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
      amounts: {},
      tips: emptyTips(),
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
      state.amounts = (saved && saved.amounts && typeof saved.amounts === 'object')
        ? Object.assign({}, saved.amounts)
        : {};
      const tips = emptyTips();
      const rawTips = saved && saved.tips;
      if (rawTips && typeof rawTips === 'object') {
        if (rawTips.applied && typeof rawTips.applied === 'object') {
          Object.keys(rawTips.applied).forEach(id => { tips.applied[id] = String(rawTips.applied[id]); });
        }
        tips.unmatched = Math.max(0, Math.floor(Number(rawTips.unmatched) || 0));
        tips.lastMessage = typeof rawTips.lastMessage === 'string' ? rawTips.lastMessage : '';
        const fromIds = Object.keys(tips.applied).length;
        const stored = Math.max(0, Math.floor(Number(rawTips.count) || 0));
        tips.count = Math.max(stored, fromIds + tips.unmatched);
      }
      state.tips = tips;
      return saved;
    }

    function writeCache() {
      const store = storage();
      if (!store) return;
      try {
        store.setItem(STORAGE_KEY, JSON.stringify({
          entitlements: state.entitlements,
          prices: state.prices,
          amounts: state.amounts,
          tips: state.tips,
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
      absorbTips(tipTransactionsFrom(info));
      writeCache();
      emit();
    }

    function absorbTips(list) {
      (list || []).forEach(tx => {
        if (!tx || !tx.id || state.tips.applied[tx.id]) return;
        state.tips.applied[tx.id] = tx.productId;
        if (state.tips.unmatched > 0) state.tips.unmatched -= 1;
      });
      state.tips.count = Object.keys(state.tips.applied).length + state.tips.unmatched;
    }

    function rememberTipPurchase(productId, result) {
      const txs = tipTransactionsFrom(result).filter(tx => tx.productId === productId);
      const before = state.tips.count;
      absorbTips(txs);
      if (!txs.length && state.tips.count === before) {
        state.tips.unmatched += 1;
        state.tips.count += 1;
      }
      const item = findProduct(productId);
      state.tips.lastMessage = item ? tipThanks(item) : tipThanks({ id: '' });
      writeCache();
      emit();
    }

    function rememberPackage(pkg) {
      if (!pkg || !pkg.product) return;
      const id = pkg.product.identifier || pkg.product.productIdentifier;
      if (!id || state.packages[id]) return;
      state.packages[id] = pkg;
      if (pkg.product.priceString) state.prices[id] = String(pkg.product.priceString);
      const amount = pkg.product.price;
      const currency = pkg.product.currencyCode || pkg.product.currency;
      if (typeof amount === 'number' && isFinite(amount) && currency) {
        state.amounts[id] = { price: amount, currency: String(currency) };
      }
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
      if (!entitlementId) return false;
      if (state.entitlements[entitlementId]) return true;
      if (state.entitlements.bundle_complete && completeGrants().indexOf(entitlementId) !== -1) return true;
      return false;
    }

    function savings() {
      if (state.mode !== 'native' || !state.configured) return null;
      const complete = findProduct('com.gamingempire.benchmarkarcade.bundle.complete');
      if (!complete) return null;
      const bundle = state.amounts[complete.productId];
      if (!bundle || typeof bundle.price !== 'number' || !bundle.currency) return null;
      const parts = CATALOG.filter(item => item.inCompleteCollection);
      let sum = 0;
      for (let i = 0; i < parts.length; i++) {
        const amount = state.amounts[parts[i].productId];
        if (!amount || amount.currency !== bundle.currency || typeof amount.price !== 'number') return null;
        sum += amount.price;
      }
      const diff = Math.round((sum - bundle.price) * 100) / 100;
      if (!(diff > 0)) return null;
      let formatted = null;
      try {
        formatted = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: bundle.currency
        }).format(diff);
      } catch (e) {
        return null;
      }
      return { amount: diff, currency: bundle.currency, formatted: formatted, pieces: parts.length };
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
        applyCustomerInfo(unwrapCustomerInfo(result) || result);
        const item = findProduct(productId);
        if (item && item.kind === 'tip') {
          rememberTipPurchase(productId, result);
          return {
            ok: true,
            tip: true,
            message: state.tips.lastMessage,
            count: state.tips.count
          };
        }
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
        applyCustomerInfo(unwrapCustomerInfo(result) || result);
        absorbTips(tipTransactionsFrom(result));
        writeCache();
        emit();
        return { ok: true, tips: state.tips.count };
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
      completeGrants: completeGrants,
      savings: savings,
      tipCount: function () { return state.tips.count || 0; },
      supporterTier: function () { return supporterTier(state.tips.count || 0); },
      lastTipMessage: function () { return state.tips.lastMessage || ''; },
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
  api.completeGrants = completeGrants;
  api.shopHref = shopHref;

  root.ArcadeStore = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
