/**
 * Developer unlock: every catalog entitlement is owned, the cache stays empty,
 * and the release check rejects a true flag.
 * Run: node tests/arcade-dev-unlock.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const checker = require('../scripts/check-dev-unlock');

const root = path.join(__dirname, '..');

function memory() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function el() {
  return {
    style: { setProperty(name, value) { this[name] = value; } },
    setAttribute() {},
    removeAttribute() {},
    dataset: {},
    innerHTML: '',
    hidden: true,
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

function load(files, extra) {
  const storage = memory();
  const html = el();
  const body = el();
  const modal = el();
  const sandbox = Object.assign({
    console,
    localStorage: storage,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    location: { pathname: '/blockblast/www/game.html', search: '', hash: '' },
    document: {
      readyState: 'loading',
      documentElement: html,
      body: body,
      addEventListener() {},
      getElementById(id) { return id === 'modal-passport' ? modal : null; },
      querySelectorAll() { return []; },
      createElement() { return el(); }
    }
  }, extra || {});
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  files.forEach(file => {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
  });
  sandbox.storage = storage;
  sandbox.html = html;
  sandbox.modal = modal;
  return sandbox;
}

function main() {
  const off = checker.checkSource('root.ARCADE_DEV_UNLOCK_ALL = false;', 'release');
  assert.strictEqual(off.ok, true);
  const on = checker.checkSource('root.ARCADE_DEV_UNLOCK_ALL = true;', 'dev');
  assert.strictEqual(on.ok, false);
  assert.ok(on.message.includes('must be false'));
  const missing = checker.checkSource('root.ARCADE_STORE_CONFIG = {};', 'empty');
  assert.strictEqual(missing.ok, false);

  const config = fs.readFileSync(path.join(root, 'assets/arcade-store-config.js'), 'utf8');
  assert.strictEqual(checker.flagFrom(config), true, 'this branch ships the unlock on');
  assert.ok(config.includes('TODO: set false before release'));
  const live = checker.checkSource(config, 'assets/arcade-store-config.js');
  assert.strictEqual(live.ok, false, 'the shipping check fails while the flag is true');

  const page = load([
    'assets/arcade-store-config.js',
    'assets/arcade-store.js',
    'assets/arcade-shop.js',
    'assets/arcade-cosmetics.js',
    'assets/arcade-content.js'
  ]);
  const store = page.ArcadeStore;
  assert.strictEqual(store.devUnlockAll(), true);
  const entitlements = store.CATALOG.map(item => item.entitlementId).filter(Boolean);
  assert.ok(entitlements.length >= 20);
  entitlements.forEach(id => {
    assert.strictEqual(store.owns(id), true, id);
  });
  assert.strictEqual(store.owns('future_skin'), false);
  assert.strictEqual(store.owns(''), false);
  assert.strictEqual(page.storage.getItem('arcade_entitlements'), null);

  let purchases = 0;
  page.ArcadeStoreNative = {
    Capacitor: {
      isNativePlatform() { return true; },
      getPlatform() { return 'ios'; }
    },
    Purchases: {
      async configure() { purchases += 1; },
      async purchasePackage() { purchases += 1; return {}; }
    }
  };
  entitlements.forEach(id => store.owns(id));
  assert.strictEqual(purchases, 0);
  assert.strictEqual(page.storage.getItem('arcade_entitlements'), null);

  assert.strictEqual(store.tipCount(), 3);
  assert.strictEqual(store.supporterTier().id, 'house');
  assert.strictEqual(store.supporterTier().name, 'House Favorite');
  assert.strictEqual(page.storage.getItem('arcade_entitlements'), null);

  const html = page.ArcadeShop.render();
  assert.ok(html.includes('DEV UNLOCK'));
  assert.ok(html.includes('data-dev-unlock="1"'));
  assert.ok(html.includes('Owned'));
  assert.strictEqual(/\$\d+\.\d{2}/.test(html), false);

  page.location.pathname = '/blockblast/www/game.html';
  const equipped = page.ArcadeCosmetics.equip('marble');
  assert.strictEqual(equipped.ok, true);
  assert.strictEqual(page.html.dataset.paidSkin, 'marble');
  assert.strictEqual(page.ArcadeCosmetics.equip('walnut').ok, true);
  assert.strictEqual(page.ArcadeContent.allowsWord('parks', 3, 'expert'), true);
  assert.strictEqual(page.ArcadeContent.allowsLayout('lotus'), true);
  assert.strictEqual(page.ArcadeContent.allowsPicture('holiday', 5), true);
  assert.strictEqual(page.ArcadeContent.allowsMission(4), true);
  assert.strictEqual(page.storage.getItem('arcade_entitlements'), null);

  page.ARCADE_DEV_UNLOCK_ALL = false;
  assert.strictEqual(store.owns('arcade_patron'), false);
  assert.strictEqual(store.owns('blockblast_skin_marble'), false);
  assert.strictEqual(store.owns('bundle_complete'), false);
  assert.strictEqual(store.tipCount(), 0);
  assert.strictEqual(store.supporterTier(), null);
  assert.strictEqual(page.ArcadeCosmetics.equip('marble').ok, false);
  assert.strictEqual(page.ArcadeContent.allowsWord('parks', 3, 'expert'), false);
  assert.strictEqual(page.storage.getItem('arcade_entitlements'), null);
  assert.strictEqual(page.ArcadeShop.render().includes('DEV UNLOCK'), false);

  const passport = load([
    'assets/arcade-store-config.js',
    'assets/arcade-store.js',
    'assets/arcade-passport.js'
  ]);
  assert.strictEqual(passport.ArcadePassport.applyTheme('vectrex', false), true);
  assert.strictEqual(passport.ArcadePassport.state.theme, 'vectrex');
  assert.strictEqual(passport.ArcadePassport.applyTheme('tron', false), true);
  assert.strictEqual(passport.ArcadePassport.applyTheme('c64', false), true);
  passport.ArcadePassport.renderModalContent();
  assert.ok(passport.modal.innerHTML.includes('DEV UNLOCK'));
  assert.ok(passport.modal.innerHTML.includes('data-dev-unlock="1"'));
  assert.ok(passport.modal.innerHTML.includes('ARCADE PATRON'));
  assert.ok(passport.modal.innerHTML.includes('HOUSE FAVORITE'));
  assert.strictEqual(passport.storage.getItem('arcade_entitlements'), null);
  passport.ARCADE_DEV_UNLOCK_ALL = false;
  assert.strictEqual(passport.ArcadePassport.applyTheme('vectrex', false), false);
  passport.ArcadePassport.renderModalContent();
  assert.strictEqual(passport.modal.innerHTML.includes('DEV UNLOCK'), false);

  console.log('arcade-dev-unlock: catalog owned, cache untouched, release check rejects true');
}

main();
