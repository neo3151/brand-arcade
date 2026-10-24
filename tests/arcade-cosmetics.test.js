/**
 * Paid per-game cosmetics: catalog, Card Room, web prices, previews.
 * Run: node tests/arcade-cosmetics.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const MARBLE = 'com.gamingempire.benchmarkarcade.blockblast.skin.marble';
const ATELIER = 'com.gamingempire.benchmarkarcade.solitaire.pack.atelier';
const CARDROOM = 'com.gamingempire.benchmarkarcade.cardroom.pack.cardroom';

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function loadPage(storage, location) {
  const shelf = { id: 'paid-cosmetic-shelf', innerHTML: '' };
  const body = { dataset: {} };
  const html = { dataset: {} };
  const sandbox = {
    localStorage: storage,
    console,
    URLSearchParams,
    location,
    document: {
      readyState: 'complete',
      documentElement: html,
      body,
      getElementById(id) { return id === 'paid-cosmetic-shelf' ? shelf : null; },
      addEventListener() {}
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-store-config.js'), 'utf8'), sandbox, { filename: 'arcade-store-config.js' });
  sandbox.ARCADE_DEV_UNLOCK_ALL = false;
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-store.js'), 'utf8'), sandbox, { filename: 'arcade-store.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-cosmetics.js'), 'utf8'), sandbox, { filename: 'arcade-cosmetics.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'blockblast/js/progress.js'), 'utf8'), sandbox, { filename: 'progress.js' });
  sandbox.shelf = shelf;
  sandbox.body = body;
  sandbox.htmlEl = html;
  return sandbox;
}

function grant(storage, entitlements) {
  storage.setItem('arcade_entitlements', JSON.stringify({ entitlements, prices: {} }));
}

const expectedProducts = [
  ['com.gamingempire.benchmarkarcade.blockblast.skin.marble', 'blockblast_skin_marble'],
  ['com.gamingempire.benchmarkarcade.blockblast.skin.walnut', 'blockblast_skin_walnut'],
  ['com.gamingempire.benchmarkarcade.blockblast.skin.stainedglass', 'blockblast_skin_stainedglass'],
  ['com.gamingempire.benchmarkarcade.solitaire.pack.atelier', 'solitaire_pack_atelier'],
  ['com.gamingempire.benchmarkarcade.spidersolitaire.pack.atelier', 'spidersolitaire_pack_atelier'],
  ['com.gamingempire.benchmarkarcade.cardroom.pack.cardroom', 'cardroom_pack'],
  ['com.gamingempire.benchmarkarcade.spades.pack.salon', 'spades_pack_salon'],
  ['com.gamingempire.benchmarkarcade.mahjong.pack.tiles', 'mahjong_pack_tiles'],
  ['com.gamingempire.benchmarkarcade.minesweeper.pack.sectors', 'minesweeper_pack_sectors'],
  ['com.gamingempire.benchmarkarcade.codebreaker.pack.terminals', 'codebreaker_pack_terminals'],
  ['com.gamingempire.benchmarkarcade.sudoku.pack.ink', 'sudoku_pack_ink'],
  ['com.gamingempire.benchmarkarcade.nonogram.pack.mosaic', 'nonogram_pack_mosaic'],
  ['com.gamingempire.benchmarkarcade.wordsearch.pack.atlas', 'wordsearch_pack_atlas']
];

function testCatalogAndWiring() {
  const page = loadPage(createMemoryStorage(), { pathname: '/blockblast/store.html', search: '' });
  const catalog = page.ArcadeStore.CATALOG;
  expectedProducts.forEach(([productId, entitlementId]) => {
    const row = catalog.find(item => item.productId === productId);
    assert.ok(row, 'missing catalog row ' + productId);
    assert.strictEqual(row.entitlementId, entitlementId);
    assert.ok(page.ArcadeCosmetics.PRODUCTS.some(item => item.productId === productId && item.entitlementId === entitlementId));
  });
  page.ArcadeCosmetics.SKINS.forEach(skin => {
    assert.ok(catalog.some(item => item.productId === skin.productId), skin.id + ' product is not for sale');
  });
  assert.strictEqual(page.ArcadeCosmetics.shouldLoad('/index.html'), false);
  assert.strictEqual(page.ArcadeCosmetics.shouldLoad('/blockblast/index.html'), true);
  assert.strictEqual(page.ArcadeCosmetics.shouldLoad('/blockblast/www/game.html'), true);
  assert.strictEqual(page.ArcadeCosmetics.shouldLoad('/www/mahjong/www/index.html'), true);
  assert.strictEqual(page.ArcadeCosmetics.detectGame('/www/spidersolitaire/www/store.html'), 'spidersolitaire');
  assert.strictEqual(page.ArcadeCosmetics.detectGame('/solitaire/game.html'), 'solitaire');

  const games = ['blockblast', 'solitaire', 'sudoku', 'nonogram', 'minesweeper', 'mahjong', 'codebreaker', 'wordsearch', 'spidersolitaire', 'spades'];
  games.forEach(game => {
    ['index.html', 'game.html', 'store.html'].forEach(file => {
      const html = fs.readFileSync(path.join(root, game, file), 'utf8');
      assert.ok(html.includes('arcade-cosmetics-loader'), game + '/' + file + ' missing loader');
      assert.ok(html.includes('if (parts.length < 1) return;'), game + '/' + file + ' missing standalone guard');
    });
    const store = fs.readFileSync(path.join(root, game, 'store.html'), 'utf8');
    assert.ok(store.includes('id="paid-cosmetic-shelf"'), game + ' store missing shelf');
  });

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.dependencies['@capacitor/core'], '8.5.3');
  assert.strictEqual(pkg.dependencies['@revenuecat/purchases-capacitor'], '13.7.6');
  const podfile = fs.readFileSync(path.join(root, 'ios/App/Podfile'), 'utf8');
  assert.ok(podfile.includes('RevenuecatPurchasesCapacitor'));
  const docs = fs.readFileSync(path.join(root, 'docs/iap-setup.md'), 'utf8');
  expectedProducts.forEach(([productId, entitlementId]) => {
    assert.ok(docs.includes(productId), 'docs missing ' + productId);
    assert.ok(docs.includes(entitlementId), 'docs missing ' + entitlementId);
  });
  assert.ok(docs.includes('cardroom'));
  assert.ok(!fs.readFileSync(path.join(root, 'assets/arcade-cosmetics.js'), 'utf8').match(/\$\d+\.\d{2}/));
  const spadesStore = fs.readFileSync(path.join(root, 'spades/js/store.js'), 'utf8');
  assert.ok(spadesStore.includes("id: 'imperial_gold'"));
  assert.ok(spadesStore.includes('price: 400'));
  assert.ok(!spadesStore.includes('benchmarkarcade'));
  const coinThemes = fs.readFileSync(path.join(root, 'blockblast/store.html'), 'utf8');
  assert.ok(coinThemes.includes("id: 'neon'"));
  assert.ok(coinThemes.includes('cost: 150'));
  assert.ok(!coinThemes.includes("id: 'marble'"));
}

async function testOwnershipPreviewAndCoins() {
  const storage = createMemoryStorage();
  const location = { pathname: '/blockblast/store.html', search: '' };
  const page = loadPage(storage, location);
  const cosmetics = page.ArcadeCosmetics;

  assert.strictEqual(cosmetics.ownsSkin('marble'), false);
  assert.strictEqual(cosmetics.equip('marble').reason, 'locked');
  assert.strictEqual(storage.getItem('arcade_cosmetic_v1'), null);
  assert.ok(page.shelf.innerHTML.includes('Arcade Shop'));
  assert.ok(page.shelf.innerHTML.includes('Preview'));
  assert.ok(page.shelf.innerHTML.includes('Marble'));
  assert.ok(!page.shelf.innerHTML.match(/\$\d+\.\d{2}/));
  assert.strictEqual(page.shelf.innerHTML.includes('data-paid-action="buy"'), false);

  page.ArcadeStore.getPrice = () => '¥480';
  cosmetics.renderShelf();
  assert.strictEqual(page.shelf.innerHTML.includes('¥480'), false);
  page.ArcadeStore.getPrice = () => null;

  const webBuy = await cosmetics.buy(MARBLE);
  assert.strictEqual(webBuy.ok, false);
  assert.strictEqual(webBuy.reason, 'unavailable');
  assert.strictEqual(storage.getItem('arcade_cosmetic_v1'), null);

  location.search = '?theme=walnut';
  cosmetics.applyActive();
  assert.strictEqual(page.body.dataset.theme, 'walnut');
  assert.strictEqual(page.htmlEl.dataset.paidPreview, '1');
  assert.strictEqual(storage.getItem('arcade_cosmetic_v1'), null);
  location.search = '';

  grant(storage, { blockblast_skin_marble: true });
  page.ArcadeStore.loadCache();
  assert.strictEqual(cosmetics.equip('walnut').reason, 'locked');
  assert.strictEqual(cosmetics.equip('marble').ok, true);
  assert.strictEqual(page.body.dataset.theme, 'marble');
  assert.ok(storage.getItem('arcade_cosmetic_v1').includes('marble'));
  assert.strictEqual(cosmetics.equippedId('blockblast'), 'marble');

  location.search = '?theme=stainedglass';
  cosmetics.applyActive();
  assert.strictEqual(page.body.dataset.theme, 'stainedglass');
  assert.ok(storage.getItem('arcade_cosmetic_v1').includes('"marble"') || storage.getItem('arcade_cosmetic_v1').includes('marble'));
  location.search = '';
  cosmetics.applyActive();
  assert.strictEqual(page.body.dataset.theme, 'marble');

  assert.strictEqual(page.Progress.setSelectedTheme('marble'), false);
  assert.strictEqual(cosmetics.equippedId('blockblast'), 'marble');
  assert.strictEqual(page.Progress.spendCoins(150), true);
  assert.strictEqual(page.Progress.getCoins(), 0);
  page.Progress.addCoins(200);
  page.Progress.unlockTheme('neon');
  assert.ok(page.Progress.getUnlockedThemes().includes('neon'));
  assert.strictEqual(page.Progress.setSelectedTheme('neon'), true);
  assert.strictEqual(page.Progress.getSelectedTheme(), 'neon');
  assert.strictEqual(cosmetics.equippedId('blockblast'), '');
  assert.strictEqual(page.body.dataset.theme, 'neon');
  assert.strictEqual(page.Progress.setSelectedTheme('stainedglass'), false);
  assert.strictEqual(page.Progress.getSelectedTheme(), 'neon');
}

function testCardRoom() {
  const storage = createMemoryStorage();
  const page = loadPage(storage, { pathname: '/spades/store.html', search: '' });
  grant(storage, { solitaire_pack_atelier: true });
  page.ArcadeStore.loadCache();
  assert.strictEqual(page.ArcadeCosmetics.ownsSkin('solitaire-noir'), true);
  assert.strictEqual(page.ArcadeCosmetics.ownsSkin('solitaire-burgundy'), true);
  assert.strictEqual(page.ArcadeCosmetics.ownsSkin('spider-violet'), false);
  assert.strictEqual(page.ArcadeCosmetics.ownsSkin('montecarlo'), false);

  grant(storage, { cardroom_pack: true });
  page.ArcadeStore.loadCache();
  ['solitaire-noir', 'solitaire-burgundy', 'spider-violet', 'spider-emerald', 'montecarlo', 'artdeco'].forEach(id => {
    assert.strictEqual(page.ArcadeCosmetics.ownsSkin(id), true, id);
  });
  assert.strictEqual(page.ArcadeCosmetics.ownsSkin('marble'), false);
  assert.strictEqual(page.ArcadeCosmetics.ownsSkin('ivory'), false);
  assert.strictEqual(page.ArcadeCosmetics.ownsPack(page.ArcadeCosmetics.PRODUCTS.find(item => item.id === 'cardroom')), true);
  assert.strictEqual(page.ArcadeCosmetics.equip('montecarlo').ok, true);
  assert.strictEqual(page.htmlEl.dataset.paidSkin, 'montecarlo');

  const solitaire = loadPage(createMemoryStorage(), { pathname: '/solitaire/store.html', search: '' });
  assert.ok(solitaire.shelf.innerHTML.includes(ATELIER));
  assert.ok(solitaire.shelf.innerHTML.includes(CARDROOM));
  assert.ok(!solitaire.shelf.innerHTML.includes('spades.pack.salon'));
  assert.ok(solitaire.shelf.innerHTML.includes('Noir Atelier'));
  assert.ok(solitaire.shelf.innerHTML.includes('Burgundy Felt'));
}

async function main() {
  testCatalogAndWiring();
  await testOwnershipPreviewAndCoins();
  testCardRoom();
  console.log('arcade-cosmetics: catalog, card room, preview, and coin themes ok');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
