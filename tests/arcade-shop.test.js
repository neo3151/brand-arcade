/**
 * Complete Collection, tip jar, and the Arcade Shop.
 * Run: node tests/arcade-shop.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const COMPLETE = 'com.gamingempire.benchmarkarcade.bundle.complete';
const COFFEE = 'com.gamingempire.benchmarkarcade.tip.coffee';
const LUNCH = 'com.gamingempire.benchmarkarcade.tip.lunch';
const DINNER = 'com.gamingempire.benchmarkarcade.tip.dinner';

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function customerInfo(activeIds, transactions) {
  const active = {};
  activeIds.forEach(id => { active[id] = { identifier: id, isActive: true }; });
  return {
    entitlements: { active: active, all: active },
    nonSubscriptionTransactions: transactions || []
  };
}

function packageFor(item, amount) {
  return {
    identifier: item.productId,
    product: {
      identifier: item.productId,
      priceString: amount == null ? null : ('US$' + amount.toFixed(2)),
      price: amount,
      currencyCode: amount == null ? null : 'USD'
    }
  };
}

function load(storage) {
  const host = {
    id: 'arcade-shop',
    innerHTML: '',
    querySelectorAll() { return []; }
  };
  const sandbox = {
    localStorage: storage,
    console,
    setTimeout,
    clearTimeout,
    document: {
      readyState: 'complete',
      getElementById(id) { return id === 'arcade-shop' ? host : null; },
      addEventListener() {}
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-store-config.js'), 'utf8'), sandbox);
  sandbox.ARCADE_DEV_UNLOCK_ALL = false;
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-store.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-shop.js'), 'utf8'), sandbox);
  sandbox.host = host;
  return sandbox;
}

async function main() {
  const ctx = load(createMemoryStorage());
  const catalog = ctx.ArcadeStore.CATALOG;
  assert.strictEqual(catalog.length, 28, 'final product count');
  assert.strictEqual(catalog.find(item => item.id === 'patron').listPrice, '$4.99');
  ['vectrex', 'c64', 'tron'].forEach(id => {
    assert.strictEqual(catalog.find(item => item.id === id).listPrice, '$0.99');
  });
  const tips = catalog.filter(item => item.kind === 'tip');
  assert.strictEqual(Array.prototype.map.call(tips, item => item.productId).join('|'), [COFFEE, LUNCH, DINNER].join('|'));
  tips.forEach(item => {
    assert.strictEqual(item.consumable, true);
    assert.strictEqual(item.inCompleteCollection, undefined);
    assert.strictEqual(item.entitlementId, undefined);
  });
  const complete = catalog.find(item => item.productId === COMPLETE);
  assert.strictEqual(complete.entitlementId, 'bundle_complete');
  assert.strictEqual(complete.inCompleteCollection, undefined);

  const grants = ctx.ArcadeStore.completeGrants();
  assert.strictEqual(grants.length, 24);
  assert.ok(grants.includes('arcade_patron'));
  assert.ok(grants.includes('arcade_crt_vectrex'));
  assert.ok(grants.includes('arcade_crt_c64'));
  assert.ok(grants.includes('arcade_crt_tron'));
  assert.ok(grants.includes('cardroom_pack'));
  assert.ok(grants.includes('mindful_pack_puzzler'));
  assert.ok(grants.includes('wordsearch_pack_explorer'));
  assert.ok(grants.includes('solitaire_pack_curated'));
  assert.ok(grants.includes('codebreaker_pack_heist'));
  assert.strictEqual(grants.includes('bundle_complete'), false);
  catalog.filter(item => item.inCompleteCollection).forEach(item => {
    assert.ok(grants.includes(item.entitlementId));
  });

  const future = {
    id: 'future-skin',
    productId: 'com.gamingempire.benchmarkarcade.future.skin',
    entitlementId: 'future_skin',
    kind: 'cosmetic',
    name: 'Future'
  };
  catalog.push(future);
  assert.strictEqual(ctx.ArcadeStore.completeGrants().includes('future_skin'), false);
  future.inCompleteCollection = true;
  assert.ok(ctx.ArcadeStore.completeGrants().includes('future_skin'));
  catalog.pop();

  const products = catalog.map(item => ({
    item: item,
    amount: item.productId === COMPLETE ? 14.99 : (item.kind === 'tip' ? 1.99 : 2)
  }));
  let txSeq = 0;
  const history = [];
  const active = ['bundle_complete'];
  const sdk = {
    async configure() {},
    async getCustomerInfo() {
      return { customerInfo: customerInfo(active, history) };
    },
    async getOfferings() {
      return {
        current: {
          identifier: 'arcade',
          availablePackages: products.filter(row => row.amount != null).map(row => packageFor(row.item, row.amount))
        }
      };
    },
    async purchasePackage(options) {
      const productId = options.aPackage.product.identifier;
      const item = catalog.find(entry => entry.productId === productId);
      if (item && item.entitlementId && active.indexOf(item.entitlementId) < 0) active.push(item.entitlementId);
      if (item && item.kind === 'tip') {
        txSeq += 1;
        history.push({
          productIdentifier: productId,
          transactionIdentifier: 'tx-' + txSeq,
          purchaseDate: '2026-10-22T00:00:00Z'
        });
      }
      return {
        customerInfo: customerInfo(active, history),
        transaction: history[history.length - 1] || null
      };
    },
    async restorePurchases() {
      return { customerInfo: customerInfo(active, history.slice()) };
    },
    async addCustomerInfoUpdateListener() { return 'listener'; }
  };

  const storage = createMemoryStorage();
  storage.setItem('arcade_passport_state', JSON.stringify({ xp: 12, theme: 'default', achievements: {} }));
  const native = load(storage);
  native.ARCADE_STORE_CONFIG = { iosApiKey: 'test_ios_public_key', androidApiKey: 'test_android_public_key' };
  native.ArcadeStoreNative = {
    Capacitor: {
      isNativePlatform() { return true; },
      getPlatform() { return 'ios'; }
    },
    Purchases: sdk
  };
  const store = native.ArcadeStore.createStore();
  await store.init();
  assert.strictEqual(store.owns('bundle_complete'), true);
  assert.strictEqual(store.owns('arcade_patron'), true);
  assert.strictEqual(store.owns('cardroom_pack'), true);
  assert.strictEqual(store.owns('nonogram_pack_holiday'), true);
  assert.strictEqual(store.owns('future_skin'), false);
  const saved = store.savings();
  assert.ok(saved);
  assert.strictEqual(saved.currency, 'USD');
  assert.strictEqual(saved.pieces, 24);
  assert.strictEqual(saved.amount, 33.01);
  assert.ok(saved.formatted.length > 0);

  const passportBefore = storage.getItem('arcade_passport_state');
  const first = await store.purchase(COFFEE);
  assert.strictEqual(first.ok, true);
  assert.strictEqual(first.tip, true);
  assert.ok(first.message.includes('Thanks for the coffee'));
  assert.ok(first.message.includes('0 XP'));
  assert.ok(first.message.includes('nothing') || first.message.includes('does not change gameplay'));
  assert.strictEqual(first.count, 1);
  assert.strictEqual(store.supporterTier().name, 'Supporter');
  assert.strictEqual(storage.getItem('arcade_passport_state'), passportBefore);

  await store.purchase(LUNCH);
  assert.strictEqual(store.tipCount(), 2);
  assert.strictEqual(store.supporterTier().id, 'regular');
  await store.purchase(DINNER);
  assert.strictEqual(store.tipCount(), 3);
  assert.strictEqual(store.supporterTier().name, 'House Favorite');

  const persisted = native.ArcadeStore.createStore();
  assert.strictEqual(persisted.tipCount(), 3);

  history.push({
    productIdentifier: COFFEE,
    transactionIdentifier: 'tx-restored',
    purchaseDate: '2026-10-21T00:00:00Z'
  });
  const restored = await store.restore();
  assert.strictEqual(restored.ok, true);
  assert.strictEqual(store.tipCount(), 4);
  assert.strictEqual(store.owns('arcade_crt_tron'), true);
  assert.strictEqual(native.ArcadeStore.createStore().tipCount(), 4);

  const web = load(createMemoryStorage());
  web.ArcadeShop.boot();
  const html = web.host.innerHTML;
  assert.ok(html.includes('Complete Collection'));
  assert.ok(html.includes('Coffee'));
  assert.ok(html.includes('Lunch'));
  assert.ok(html.includes('Dinner'));
  assert.ok(html.includes('Card Room'));
  assert.ok(html.includes('Mindful Puzzler'));
  assert.ok(html.includes('id="btn-restore-purchases"'));
  assert.ok(html.includes('Unavailable'));
  assert.ok(html.includes('blockblast/www/store.html'));
  assert.ok(html.includes('spades/www/store.html'));
  assert.ok(html.includes('nothing functional') || html.includes('Nothing functional'));
  assert.strictEqual(/\$\d+\.\d{2}/.test(html), false);
  assert.ok(html.includes('localized prices'));

  const docs = fs.readFileSync(path.join(root, 'docs/iap-setup.md'), 'utf8');
  [COMPLETE, COFFEE, LUNCH, DINNER, 'bundle_complete'].forEach(id => {
    assert.ok(docs.includes(id), id);
  });
  assert.ok(docs.includes('| Arcade Patron | `com.gamingempire.benchmarkarcade.arcade.patron` | `arcade_patron` | Non-consumable | $4.99 | Yes |'));
  assert.ok(docs.includes('| Tron Grid | `com.gamingempire.benchmarkarcade.arcade.crt.tron` | `arcade_crt_tron` | Non-consumable | $0.99 | Yes |'));
  assert.strictEqual(docs.includes('Set in the stores'), false);
  assert.strictEqual(docs.includes('I invented'), false);
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('Fair Play'));
  assert.ok(changelog.includes('Complete Collection'));
  assert.ok(changelog.includes('28'));
  assert.ok(changelog.includes('daily refill to 15'));
  assert.ok(changelog.includes('unlocked all levels 1–1,000'));
  assert.strictEqual(changelog.includes('1,000 coins'), false);

  // Verify deep-link shopHref, return-to-game banner, and Passport/Daily engagement fixes
  assert.strictEqual(ctx.ArcadeStore.shopHref(), 'shop.html');
  assert.strictEqual(ctx.ArcadeStore.shopHref('marble', 'blockblast'), 'shop.html?from=blockblast#shop-marble');

  const engagementStorage = createMemoryStorage();
  const engagementCtx = {
    localStorage: engagementStorage,
    console,
    setTimeout,
    clearTimeout,
    setInterval() { return 1; },
    clearInterval() {},
    URLSearchParams,
    location: { origin: 'capacitor://localhost', pathname: '/index.html', search: '', hash: '' },
    document: {
      readyState: 'complete',
      documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {}, dataset: {} },
      body: { setAttribute() {}, appendChild() {}, style: {} },
      getElementById() { return null; },
      querySelectorAll() { return []; },
      createElement() { return { style: {}, setAttribute() {} }; },
      addEventListener() {}
    },
    addEventListener() {}
  };
  engagementCtx.window = engagementCtx;
  engagementCtx.globalThis = engagementCtx;
  vm.createContext(engagementCtx);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-passport.js'), 'utf8'), engagementCtx);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-daily.js'), 'utf8'), engagementCtx);

  // 1. Page-load recordPlay (completed=false) does NOT prematurely unlock speedrun_120
  engagementCtx.ArcadePassport.recordPlay('sudoku', 0, 0, false, 'deep', false);
  assert.strictEqual(engagementCtx.ArcadePassport.isUnlocked('first_coin'), true);
  assert.strictEqual(engagementCtx.ArcadePassport.isUnlocked('speedrun_120'), false);

  // 2. Direct console calls to unlockAchievement without meeting preconditions are rejected
  assert.strictEqual(engagementCtx.ArcadePassport.unlockAchievement('grandmaster'), false);
  assert.strictEqual(engagementCtx.ArcadePassport.unlockAchievement('speedrun_120'), false);
  assert.strictEqual(engagementCtx.ArcadePassport.unlockAchievement('arcade_triathlon'), false);
  assert.strictEqual(engagementCtx.ArcadePassport.unlockAchievement('streak_3'), false);
  assert.strictEqual(engagementCtx.ArcadePassport.unlockAchievement('daily_3star'), false);
  assert.strictEqual(engagementCtx.ArcadePassport.isUnlocked('grandmaster'), false);

  // 3. Impossible <3s speedrun exploits are rejected, while legitimate <=120s wins unlock speedrun_120
  engagementCtx.ArcadePassport.recordWin('sudoku', 1, 3200, false, 3);
  assert.strictEqual(engagementCtx.ArcadePassport.isUnlocked('speedrun_120'), false);
  engagementCtx.ArcadePassport.recordWin('sudoku', 95, 3200, false, 3);
  assert.strictEqual(engagementCtx.ArcadePassport.isUnlocked('speedrun_120'), true);

  // 4. Forging localStorage streak or daily history without a seal is rejected
  engagementStorage.setItem('arcade_daily_streak', '99');
  engagementStorage.setItem('arcade_streak_days', '99');
  engagementCtx.ArcadePassport.recordWin('sudoku', 150, 3200, false, 3);
  assert.strictEqual(engagementCtx.ArcadePassport.isUnlocked('streak_3'), false);
  assert.strictEqual(engagementCtx.ArcadeDaily.getDailyStreak(), 1);

  engagementStorage.setItem('arcade_daily_history', JSON.stringify({
    '2026-10-20': { date: '2026-10-20', dayNumber: 293, gameId: 'sudoku', score: 99999, timeSeconds: 10, stars: 3, _seal: 'forged' }
  }));
  assert.strictEqual(Object.keys(engagementCtx.ArcadeDaily.getHistory()).length, 0);

  // 5. Completing 3 consecutive sealed Daily Runs unlocks daily_3star and streak_3
  const mission = engagementCtx.ArcadeDaily.getTodayMission('2026-10-23');
  assert.ok(mission.launchUrl.includes('/www/game.html?'), 'daily mission launches game.html directly');
  assert.ok(mission.launchUrl.includes('daily=2026-10-23'));
  engagementCtx.ArcadeDaily.recordCompletion(3800, 115, 3, '2026-10-21');
  engagementCtx.ArcadeDaily.recordCompletion(3900, 112, 3, '2026-10-22');
  engagementCtx.ArcadeDaily.recordCompletion(4100, 110, 3, '2026-10-23');
  assert.strictEqual(engagementCtx.ArcadeDaily.getDailyStreak(), 3);
  assert.strictEqual(engagementCtx.ArcadePassport.isUnlocked('daily_3star'), true);
  assert.strictEqual(engagementCtx.ArcadePassport.isUnlocked('streak_3'), true);

  // 6. Tampering with XP or achievements in localStorage is scrubbed by sanitizeState / getPlayerLevel
  engagementCtx.ArcadePassport.state.xp = 999999;
  assert.strictEqual(engagementCtx.ArcadePassport.getPlayerLevel().level <= 5, true);
  assert.strictEqual(engagementCtx.ArcadePassport.state.xp, 525); // 400 achievement XP + 125 daily task XP (paced + variety_2)

  const tamperedRaw = JSON.parse(engagementStorage.getItem('arcade_passport_state'));
  tamperedRaw.xp = 999999;
  tamperedRaw.achievements.grandmaster = { unlocked: true, unlockedAt: '2026-10-23T00:00:00Z', _seal: 'forged' };
  engagementStorage.setItem('arcade_passport_state', JSON.stringify(tamperedRaw));
  const reloadedState = engagementCtx.ArcadePassport.loadLocalBackup();
  assert.strictEqual(reloadedState.xp, 0);
  assert.strictEqual(!!reloadedState.achievements.grandmaster, false);

  // 7. Share card replaces capacitor://localhost with canonical URL and uses custom brand name
  engagementStorage.setItem('arcade_brand_name', 'ACME');
  const shareCard = engagementCtx.ArcadeDaily.generateShareCard('2026-10-23');
  assert.ok(shareCard.includes('ACME ARCADE'));
  assert.strictEqual(shareCard.includes('localhost'), false);

  // 8. Seeded Daily Cabinet Tasks & anti-tamper task XP verification
  engagementCtx.ArcadePassport.resetPassport();
  assert.strictEqual(engagementCtx.ArcadePassport.state.xp, 0);
  const todayTasks = engagementCtx.ArcadePassport.getDailyCabinetTasks();
  assert.strictEqual(todayTasks.length, 3);
  assert.strictEqual(todayTasks.every(t => !t.completed), true);

  // Playing 2 distinct games completes the Double Feature (variety_2) task (+50 XP) + first_coin (+50 XP)
  engagementCtx.ArcadePassport.recordPlay('sudoku', 0, 0, false, 'deep', false);
  engagementCtx.ArcadePassport.recordPlay('solitaire', 0, 0, false, 'coffee', false);
  const afterVariety = engagementCtx.ArcadePassport.getDailyCabinetTasks();
  const varietyTask = afterVariety.find(t => t.id === 'variety_2');
  assert.ok(varietyTask && varietyTask.completed, 'Double Feature task completed after 2 cabinets');
  assert.strictEqual(engagementCtx.ArcadePassport.state.xp, 250); // first_coin(50) + streak_3(150) + variety_2(50)

  // Forging a completed task in localStorage is stripped by sanitizeState
  const rawWithForgedTask = JSON.parse(engagementStorage.getItem('arcade_passport_state'));
  rawWithForgedTask.dailyTasks.completed.forged_task = { completedAt: '2026-10-23T00:00:00Z', xp: 5000, _seal: 'bad' };
  engagementStorage.setItem('arcade_passport_state', JSON.stringify(rawWithForgedTask));
  assert.strictEqual(engagementCtx.ArcadePassport.loadLocalBackup().xp, 0);

  // 9. In-Game Victory Banner (Daily Share Button, Brand Sign-Off, and Skin Preview Upsell)
  const victoryModal = {
    id: 'victory-modal',
    children: [],
    querySelector() { return null; },
    appendChild(child) { this.children.push(child); }
  };
  let bannerEl = null;
  engagementCtx.location.pathname = '/sudoku/www/game.html';
  engagementCtx.document.documentElement.dataset = { paidPreview: '1', paidSkin: 'sumie' };
  engagementCtx.ArcadeCosmetics = ctx.ArcadeCosmetics || {
    SKINS: [{ id: 'sumie', name: 'Sumi-e', packId: 'sudoku-ink', game: 'sudoku' }]
  };
  engagementCtx.ArcadeStore = ctx.ArcadeStore;
  engagementCtx.document.getElementById = function (id) {
    if (id === 'victory-modal') return victoryModal;
    if (id === 'arcade-victory-banner') return bannerEl;
    return null;
  };
  engagementCtx.document.createElement = function () {
    const node = { id: '', style: {}, innerHTML: '', querySelector() { return null; } };
    bannerEl = node;
    return node;
  };
  engagementCtx.ArcadePassport.injectVictoryEnhancements('sudoku', 3200, 95, true);
  assert.ok(bannerEl, 'victory banner injected');
  assert.ok(bannerEl.innerHTML.includes('DAILY MISSION COMPLETE'));
  assert.ok(bannerEl.innerHTML.includes('Copy Emoji Scorecard'));
  assert.ok(bannerEl.innerHTML.includes('data-preview-upsell="sumie"'));
  assert.ok(bannerEl.innerHTML.includes('shop.html?from=sudoku#shop-sudoku-ink'));
  assert.ok(bannerEl.innerHTML.includes('ACME'));

  console.log('arcade-shop: 28 products, grants, tips, and shop copy passed');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
