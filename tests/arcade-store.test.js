/**
 * Hub store: mocked RevenueCat, web fallback, Passport reset isolation.
 * Run: node tests/arcade-store.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function element() {
  return {
    style: { setProperty(name, value) { this[name] = value; } },
    setAttribute() {},
    removeAttribute() {},
    hidden: true
  };
}

function loadStore(storage) {
  const sandbox = {
    localStorage: storage,
    console,
    setTimeout,
    clearTimeout,
    document: {
      readyState: 'loading',
      documentElement: element(),
      body: element(),
      addEventListener() {},
      getElementById() { return null; }
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-store-config.js'), 'utf8'), sandbox, { filename: 'arcade-store-config.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-store.js'), 'utf8'), sandbox, { filename: 'arcade-store.js' });
  return sandbox;
}

function customerInfo(activeIds) {
  const active = {};
  activeIds.forEach(id => { active[id] = { identifier: id, isActive: true }; });
  return { entitlements: { active: active, all: active } };
}

function packageFor(productId, priceString, entitlementId) {
  return {
    identifier: productId,
    entitlementId: entitlementId,
    product: { identifier: productId, priceString: priceString }
  };
}

function mockSdk(seed) {
  const calls = [];
  const state = {
    entitlements: seed.entitlements.slice(),
    products: seed.products
  };
  const sdk = {
    calls: calls,
    state: state,
    async configure(config) {
      calls.push(['configure', config]);
    },
    async getCustomerInfo() {
      calls.push(['getCustomerInfo']);
      return { customerInfo: customerInfo(state.entitlements) };
    },
    async getOfferings() {
      calls.push(['getOfferings']);
      return {
        current: {
          identifier: 'arcade',
          availablePackages: state.products.map(item => packageFor(item.productId, item.priceString, item.entitlementId))
        }
      };
    },
    async purchasePackage(options) {
      calls.push(['purchasePackage', options]);
      const productId = options.aPackage.product.identifier;
      const item = state.products.find(entry => entry.productId === productId);
      if (item && state.entitlements.indexOf(item.entitlementId) < 0) {
        state.entitlements.push(item.entitlementId);
      }
      return { customerInfo: customerInfo(state.entitlements) };
    },
    async restorePurchases() {
      calls.push(['restorePurchases']);
      return { customerInfo: customerInfo(state.entitlements) };
    },
    async addCustomerInfoUpdateListener() {
      calls.push(['addCustomerInfoUpdateListener']);
      return 'listener';
    }
  };
  return sdk;
}

function nativeBridge(sdk, platform) {
  return {
    Capacitor: {
      isNativePlatform() { return true; },
      getPlatform() { return platform || 'ios'; }
    },
    Purchases: sdk
  };
}

const PATRON = 'com.gamingempire.benchmarkarcade.arcade.patron';
const VECTREX = 'com.gamingempire.benchmarkarcade.arcade.crt.vectrex';

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.dependencies['@capacitor/core'], '8.5.3');
  assert.strictEqual(pkg.dependencies['@capacitor/ios'], '8.5.3');
  assert.strictEqual(pkg.dependencies['@capacitor/android'], '8.5.3');
  assert.strictEqual(pkg.dependencies['@revenuecat/purchases-capacitor'], '13.7.6');
  const pluginPkg = JSON.parse(fs.readFileSync(
    path.join(root, 'node_modules/@revenuecat/purchases-capacitor/package.json'),
    'utf8'
  ));
  assert.strictEqual(pluginPkg.peerDependencies['@capacitor/core'], '>=8.0.0');
  const podspec = fs.readFileSync(
    path.join(root, 'node_modules/@revenuecat/purchases-capacitor/RevenuecatPurchasesCapacitor.podspec'),
    'utf8'
  );
  assert.ok(podspec.includes("PurchasesHybridCommon', '19.15.0'"));
  const podfile = fs.readFileSync(path.join(root, 'ios/App/Podfile'), 'utf8');
  assert.ok(podfile.includes('RevenuecatPurchasesCapacitor'));

  fs.readdirSync(root).forEach(name => {
    const file = path.join(root, name, 'package.json');
    if (!fs.existsSync(file)) return;
    const gamePkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const deps = Object.assign({}, gamePkg.dependencies, gamePkg.devDependencies);
    assert.strictEqual(deps['@revenuecat/purchases-capacitor'], undefined, name + ' must stay free');
  });

  const storeSrc = fs.readFileSync(path.join(root, 'assets/arcade-store.js'), 'utf8');
  assert.strictEqual(/appl_[A-Za-z0-9]/.test(storeSrc), false);
  assert.strictEqual(/goog_[A-Za-z0-9]/.test(storeSrc), false);
  const configSrc = fs.readFileSync(path.join(root, 'assets/arcade-store-config.js'), 'utf8');
  assert.ok(configSrc.includes('REPLACE_WITH_REVENUECAT_IOS_PUBLIC_SDK_KEY'));
  assert.ok(configSrc.includes('REPLACE_WITH_REVENUECAT_ANDROID_PUBLIC_SDK_KEY'));

  const hub = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const shop = fs.readFileSync(path.join(root, 'shop.html'), 'utf8');
  assert.ok(shop.includes('id="arcade-shop"'));
  assert.ok(fs.readFileSync(path.join(root, 'assets/arcade-shop.js'), 'utf8').includes('id="btn-restore-purchases"'));
  assert.strictEqual(hub.includes('id="btn-restore-purchases"'), false);
  assert.strictEqual(/localStorage\.removeItem\('arcade_entitlements'\)/.test(hub), false);
  assert.strictEqual(/localStorage\.clear\(/.test(hub), false);

  // Web / PWA: items are unavailable and RevenueCat is never called.
  {
    const storage = createMemoryStorage();
    const ctx = loadStore(storage);
    let called = false;
    ctx.ARCADE_STORE_CONFIG = { iosApiKey: 'test_ios_public_key', androidApiKey: 'test_android_public_key' };
    ctx.ArcadeStoreNative = {
      Capacitor: { isNativePlatform() { return false; }, getPlatform() { return 'web'; } },
      Purchases: { configure() { called = true; throw new Error('configure on web'); } }
    };
    const store = ctx.ArcadeStore.createStore();
    const result = await store.init();
    assert.strictEqual(result.platform, 'web');
    assert.strictEqual(result.configured, false);
    assert.strictEqual(called, false);
    assert.strictEqual(store.getPrice(PATRON), null);
    const purchase = await store.purchase(PATRON);
    assert.strictEqual(purchase.reason, 'unavailable');
    const restored = await store.restore();
    assert.strictEqual(restored.reason, 'unavailable');
    assert.strictEqual(store.owns('arcade_patron'), false);
  }

  // Native placeholder keys do not configure, and a cached entitlement survives.
  {
    const storage = createMemoryStorage();
    storage.setItem('arcade_entitlements', JSON.stringify({
      entitlements: { arcade_patron: true },
      prices: { [PATRON]: '€2.99' }
    }));
    const ctx = loadStore(storage);
    let configured = false;
    ctx.ArcadeStoreNative = nativeBridge({
      configure() { configured = true; return Promise.resolve(); }
    }, 'ios');
    const store = ctx.ArcadeStore.createStore();
    const result = await store.init();
    assert.strictEqual(result.reason, 'placeholder-api-key');
    assert.strictEqual(configured, false);
    assert.strictEqual(store.owns('arcade_patron'), true);
    assert.strictEqual(store.getPrice(PATRON), null);
    assert.strictEqual((await store.purchase(PATRON)).reason, 'unavailable');
  }

  // Native mock: localized price, purchase, restore, and a date-independent cache.
  {
    const storage = createMemoryStorage();
    storage.setItem('arcade_entitlements', JSON.stringify({
      entitlements: { arcade_patron: true },
      prices: {}
    }));
    storage.setItem('arcade_passport_state', JSON.stringify({ xp: 40, theme: 'default', achievements: {} }));
    const ctx = loadStore(storage);
    const sdk = mockSdk({
      entitlements: ['arcade_crt_vectrex'],
      products: [
        { productId: PATRON, entitlementId: 'arcade_patron', priceString: '¥480' },
        { productId: VECTREX, entitlementId: 'arcade_crt_vectrex', priceString: '€1,99' }
      ]
    });
    ctx.ARCADE_STORE_CONFIG = { iosApiKey: 'test_ios_public_key', androidApiKey: 'test_android_public_key' };
    ctx.ArcadeStoreNative = nativeBridge(sdk, 'android');
    const store = ctx.ArcadeStore.createStore();
    assert.strictEqual(store.owns('arcade_patron'), true, 'cache is visible before refresh');

    let changes = 0;
    store.on('change', () => { changes += 1; });
    const ready = await store.init();
    assert.strictEqual(ready.configured, true);
    assert.strictEqual(sdk.calls[0][0], 'configure');
    assert.strictEqual(sdk.calls[0][1].apiKey, 'test_android_public_key');
    assert.strictEqual(sdk.calls[0][1].appUserID, null);
    assert.strictEqual(store.owns('arcade_patron'), false, 'startup refresh replaces the cache');
    assert.strictEqual(store.owns('arcade_crt_vectrex'), true);
    assert.strictEqual(store.getPrice(PATRON), '¥480');
    assert.strictEqual(store.getPrice(VECTREX), '€1,99');
    assert.ok(changes > 0);

    const bought = await store.purchase(PATRON);
    assert.strictEqual(bought.ok, true);
    assert.strictEqual(store.owns('arcade_patron'), true);
    assert.ok(storage.getItem('arcade_entitlements').includes('arcade_patron'));

    sdk.state.entitlements = ['arcade_crt_vectrex'];
    const restored = await store.restore();
    assert.strictEqual(restored.ok, true);
    assert.strictEqual(store.owns('arcade_patron'), false);
    assert.strictEqual(store.owns('arcade_crt_vectrex'), true);

    const before = storage.getItem('arcade_entitlements');
    storage.removeItem('arcade_passport_state');
    assert.strictEqual(storage.getItem('arcade_entitlements'), before);
    assert.strictEqual(store.owns('arcade_crt_vectrex'), true);

    sdk.purchasePackage = async function () {
      const error = new Error('cancelled');
      error.code = '1';
      error.userCancelled = true;
      throw error;
    };
    const cancelled = await store.purchase(PATRON);
    assert.strictEqual(cancelled.reason, 'cancelled');
    assert.strictEqual(store.owns('arcade_patron'), false);

    const missing = await store.purchase('com.example.not-a-product');
    assert.strictEqual(missing.reason, 'unavailable');
  }

  // Passport: locked themes are refused, preview does not equip, reset keeps purchases.
  {
    const storage = createMemoryStorage();
    const painted = {};
    const modal = {
      open: true,
      innerHTML: '',
      querySelector() { return null; },
      querySelectorAll() { return []; },
      close() {}
    };
    const sandbox = {
      localStorage: storage,
      console,
      setTimeout,
      clearTimeout,
      document: {
        readyState: 'loading',
        documentElement: {
          style: { setProperty(name, value) { painted[name] = value; } },
          setAttribute() {},
          removeAttribute() {}
        },
        body: { setAttribute() {} },
        addEventListener() {},
        getElementById(id) { return id === 'modal-passport' ? modal : null; }
      }
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-store.js'), 'utf8'), sandbox, { filename: 'arcade-store.js' });
    vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-passport.js'), 'utf8'), sandbox, { filename: 'arcade-passport.js' });
    const passport = sandbox.ArcadePassport;
    assert.strictEqual(passport.applyTheme('vectrex', false), false);
    assert.strictEqual(passport.state.theme, 'default');
    assert.strictEqual(passport.state.xp, 0);
    assert.strictEqual(passport.previewTheme('vectrex'), true);
    assert.strictEqual(passport.state.theme, 'default');
    assert.strictEqual(painted['--neon-cyan'], '#7CFFCB');

    storage.setItem('arcade_entitlements', JSON.stringify({
      entitlements: { arcade_crt_vectrex: true, arcade_patron: true },
      prices: {}
    }));
    sandbox.ArcadeStore.loadCache();
    assert.strictEqual(passport.applyTheme('vectrex', false), true);
    assert.strictEqual(passport.state.theme, 'vectrex');
    assert.strictEqual(passport.state.xp, 0);
    assert.strictEqual(painted['--arcade-bezel'], '#3d2b08');
    assert.strictEqual(painted['--arcade-border'], '#e6b325');

    passport.renderModalContent();
    assert.ok(modal.innerHTML.includes('Vectrex Vector'));
    assert.ok(modal.innerHTML.includes('Commodore 64'));
    assert.ok(modal.innerHTML.includes('Tron Grid'));
    assert.ok(modal.innerHTML.includes('Thank you for keeping the marquee lit'));
    assert.ok(modal.innerHTML.includes('0 XP'));
    assert.ok(modal.innerHTML.includes('Arcade Shop'));
    assert.strictEqual(modal.innerHTML.includes('RESTORE PURCHASES'), false);
    assert.strictEqual(modal.innerHTML.includes('btn-buy-patron'), false);
    assert.strictEqual(/\$\d+\.\d{2}/.test(modal.innerHTML), false);
    assert.strictEqual(modal.innerHTML.includes('arcade_entitlements'), false);

    const exportJson = JSON.stringify(passport.state);
    assert.strictEqual(exportJson.includes('arcade_patron'), false);
    passport.resetPassport();
    assert.strictEqual(passport.state.xp, 0);
    assert.strictEqual(passport.state.theme, 'default');
    assert.ok(storage.getItem('arcade_entitlements').includes('arcade_patron'));
    assert.strictEqual(sandbox.ArcadeStore.owns('arcade_patron'), true);
  }

  console.log('arcade-store: owns, restore, reset isolation, and web fallback passed');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
