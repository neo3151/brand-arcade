/**
 * Paid content packs: entitlements, samples, and solvability.
 * Run: node tests/arcade-content.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const { solveDeal } = require('../scripts/klondike-solve');
const { countSolutions, lineSolved } = require('../scripts/nonogram-unique');
const pictures = require('../nonogram/js/picture-packs');
const curated = require('../solitaire/js/curated-deals');
const heist = require('../codebreaker/js/heist');

const PRODUCTS = [
  ['com.gamingempire.benchmarkarcade.wordsearch.pack.explorer', 'wordsearch_pack_explorer'],
  ['com.gamingempire.benchmarkarcade.mahjong.pack.layouts', 'mahjong_pack_layouts'],
  ['com.gamingempire.benchmarkarcade.nonogram.pack.holiday', 'nonogram_pack_holiday'],
  ['com.gamingempire.benchmarkarcade.nonogram.pack.animals', 'nonogram_pack_animals'],
  ['com.gamingempire.benchmarkarcade.solitaire.pack.curated', 'solitaire_pack_curated'],
  ['com.gamingempire.benchmarkarcade.codebreaker.pack.heist', 'codebreaker_pack_heist'],
  ['com.gamingempire.benchmarkarcade.mindful.pack.puzzler', 'mindful_pack_puzzler']
];

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function loadHub(storage) {
  const shelf = {
    id: 'content-pack-shelf',
    game: 'wordsearch',
    innerHTML: '',
    getAttribute(name) { return name === 'data-game' ? this.game : null; },
    querySelectorAll() { return []; }
  };
  const sandbox = {
    localStorage: storage,
    console,
    URLSearchParams,
    location: { pathname: '/wordsearch/index.html', search: '' },
    document: {
      readyState: 'loading',
      getElementById() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {},
      createElement() { return { innerHTML: '' }; },
      body: { appendChild() {} }
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-store-config.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-store.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-content.js'), 'utf8'), sandbox);
  sandbox.shelf = shelf;
  sandbox.CuratedDeals = curated;
  sandbox.PicturePacks = pictures;
  sandbox.HeistCampaign = heist;
  return sandbox;
}

function grant(storage, entitlements) {
  storage.setItem('arcade_entitlements', JSON.stringify({ entitlements, prices: {} }));
}

function testCatalogPinsAndWiring() {
  const page = loadHub(createMemoryStorage());
  const catalog = page.ArcadeStore.CATALOG;
  PRODUCTS.forEach(([productId, entitlementId]) => {
    const row = catalog.find(item => item.productId === productId);
    assert.ok(row, productId);
    assert.strictEqual(row.entitlementId, entitlementId);
    assert.strictEqual(row.kind, 'content');
  });
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.dependencies['@capacitor/core'], '8.5.3');
  assert.strictEqual(pkg.dependencies['@revenuecat/purchases-capacitor'], '13.7.6');
  const docs = fs.readFileSync(path.join(root, 'docs/iap-setup.md'), 'utf8');
  PRODUCTS.forEach(([productId, entitlementId]) => {
    assert.ok(docs.includes(productId), productId);
    assert.ok(docs.includes(entitlementId), entitlementId);
  });
  assert.ok(docs.includes('`puzzler`'));
  const contentJs = fs.readFileSync(path.join(root, 'assets/arcade-content.js'), 'utf8');
  assert.strictEqual(/\$\d+\.\d{2}/.test(contentJs), false);
  ['wordsearch', 'mahjong', 'nonogram', 'solitaire', 'codebreaker'].forEach(game => {
    ['index.html', 'game.html', 'store.html'].forEach(page => {
      const html = fs.readFileSync(path.join(root, game, page), 'utf8');
      assert.ok(html.includes('arcade-content.js'), game + ' ' + page);
      if (page !== 'game.html') assert.ok(html.includes('data-content-shelf'), game + ' ' + page);
    });
  });
  const block = fs.readFileSync(path.join(root, 'blockblast/index.html'), 'utf8');
  assert.strictEqual(block.includes('arcade-content.js'), false);
}

function testGating() {
  const storage = createMemoryStorage();
  const page = loadHub(storage);
  const content = page.ArcadeContent;
  assert.strictEqual(page.ArcadeStore.getPrice(PRODUCTS[0][0]), null);
  return page.ArcadeStore.purchase(PRODUCTS[0][0]).then(result => {
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, 'unavailable');
    assert.strictEqual(content.allowsWord('animals', 40, 'master'), true);
    assert.strictEqual(content.allowsWord('brand', 3, 'easy'), true);
    assert.strictEqual(content.allowsWord('mythology', 1, 'beginner'), true);
    assert.strictEqual(content.allowsWord('cooking', 1, 'beginner'), true);
    assert.strictEqual(content.allowsWord('mythology', 2, 'beginner'), false);
    assert.strictEqual(content.allowsWord('parks', 1, 'beginner'), false);
    assert.strictEqual(content.allowsLayout('turtle'), true);
    assert.strictEqual(content.allowsLayout('pagoda'), true);
    assert.strictEqual(content.allowsLayout('bridge'), true);
    assert.strictEqual(content.allowsLayout('lotus'), false);
    assert.strictEqual(content.allowsPicture('holiday', 1), true);
    assert.strictEqual(content.allowsPicture('holiday', 2), true);
    assert.strictEqual(content.allowsPicture('animals', 3), false);
    assert.strictEqual(content.allowsDeal(1), true);
    assert.strictEqual(content.allowsDeal(1000), true);
    assert.strictEqual(content.allowsDeal(curated.deals[0]), true);
    assert.strictEqual(content.allowsDeal(curated.deals[1]), true);
    assert.strictEqual(content.allowsDeal(curated.deals[2]), false);
    assert.strictEqual(content.allowsMission(1), true);
    assert.strictEqual(content.allowsMission(2), true);
    assert.strictEqual(content.allowsMission(3), false);
    assert.strictEqual(content.ownsPack('curated'), false);
    assert.strictEqual(content.ownsPack('heist'), false);

    grant(storage, { wordsearch_pack_explorer: true });
    page.ArcadeStore.loadCache();
    assert.strictEqual(content.ownsPack('explorer'), true);
    assert.strictEqual(content.allowsWord('kids', 80, 'hard'), true);
    assert.strictEqual(content.ownsPack('holiday'), false);
    assert.strictEqual(content.allowsPicture('holiday', 9), false);

    grant(storage, { mindful_pack_puzzler: true });
    page.ArcadeStore.loadCache();
    assert.strictEqual(content.ownsPack('explorer'), true);
    assert.strictEqual(content.ownsPack('layouts'), true);
    assert.strictEqual(content.ownsPack('holiday'), true);
    assert.strictEqual(content.ownsPack('animals'), true);
    assert.strictEqual(content.ownsPack('curated'), false);
    assert.strictEqual(content.ownsPack('heist'), false);
    assert.strictEqual(content.allowsLayout('river'), true);
    assert.strictEqual(content.allowsPicture('animals', 25), true);
    assert.strictEqual(content.allowsMission(4), false);
    assert.strictEqual(content.allowsDeal(curated.deals[9]), false);

    page.shelf.game = 'nonogram';
    content.mount(page.shelf);
    assert.ok(page.shelf.innerHTML.includes('Holiday Pictures'));
    assert.ok(page.shelf.innerHTML.includes('Mindful Puzzler'));
    assert.ok(page.shelf.innerHTML.includes('Owned'));
    assert.ok(page.shelf.innerHTML.includes('data-product-id="com.gamingempire.benchmarkarcade.nonogram.pack.holiday"'));
    assert.strictEqual(/\$\d+\.\d{2}/.test(page.shelf.innerHTML), false);

    grant(storage, {});
    page.ArcadeStore.loadCache();
    page.shelf.game = 'solitaire';
    content.mount(page.shelf);
    assert.ok(page.shelf.innerHTML.includes('Arcade Shop'));
    assert.strictEqual(page.shelf.innerHTML.includes('Unavailable'), false);
    assert.ok(page.shelf.innerHTML.includes('Sample'));
    assert.ok(page.shelf.innerHTML.includes('Locked'));
    assert.ok(page.shelf.innerHTML.includes('Deal ' + curated.deals[0]));
    assert.ok(!page.shelf.innerHTML.includes('>Deal ' + curated.deals[2] + '<'));
  });
}

function testWords() {
  const sandbox = { console, Object, Array, Set };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'wordsearch/js/words.js'), 'utf8'), sandbox);
  const before = Object.keys(sandbox.WORDS);
  ['animals', 'sports', 'food', 'science', 'geography', 'movies', 'music', 'history', 'space', 'nature', 'holidays', 'health', 'jobs', 'technology', 'colors'].forEach(name => {
    assert.ok(before.includes(name), name);
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'wordsearch/js/pack-words.js'), 'utf8'), sandbox);
  ['mythology', 'cooking', 'parks', 'ocean', 'kids', 'brand'].forEach(name => {
    const words = sandbox.WORDS[name];
    assert.ok(words && words.length >= 70, name);
    const seen = new Set();
    words.forEach(word => {
      assert.ok(/^[A-Z]{3,12}$/.test(word), name + ' ' + word);
      assert.strictEqual(seen.has(word), false, word);
      seen.add(word);
    });
    assert.ok(words.filter(word => word.length >= 5 && word.length <= 12).length >= 16, name + ' master');
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'wordsearch/js/ws-gen.js'), 'utf8'), sandbox);
  ['mythology', 'cooking', 'parks', 'ocean', 'kids', 'brand'].forEach(category => {
    const puzzle = sandbox.WSGen.generatePuzzle(category, 'beginner', 1);
    assert.ok(puzzle.words.length >= 4, category + ' placed ' + puzzle.words.length);
    puzzle.words.forEach(word => assert.ok(sandbox.WORDS[category].includes(word), word));
    assert.notStrictEqual(puzzle.seed, sandbox.WSGen.generatePuzzle('animals', 'beginner', 1).seed);
  });
}

function testMahjong() {
  const sandbox = { console, Math, Object, Array, Error, Set, parseInt, JSON, Date };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'mahjong/js/mahjong-tiles.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'mahjong/js/board-engine.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'mahjong/js/layouts.js'), 'utf8'), sandbox);
  const defs = sandbox.MahjongLayouts.DEFINITIONS;
  ['turtle', 'dragon', 'fortress'].forEach(id => assert.strictEqual(defs[id].builder().length, 144, id));
  ['pagoda', 'bridge', 'lotus', 'gate', 'compass', 'wave', 'lantern', 'garden', 'crown', 'river'].forEach(id => {
    const tiles = defs[id].builder();
    assert.strictEqual(tiles.length, 144, id);
    const seen = new Set();
    tiles.forEach(tile => {
      const key = tile.x + ',' + tile.y + ',' + tile.z;
      assert.strictEqual(seen.has(key), false, id + ' overlap ' + key);
      seen.add(key);
      if (tile.z > 0) {
        const supported = tiles.some(other => other.x === tile.x && other.y === tile.y && other.z === tile.z - 1);
        assert.strictEqual(supported, true, id + ' float ' + key);
      }
    });
    const board = sandbox.BoardEngine.generateSolvableBoard(tiles, 40);
    assert.strictEqual(board.length, 144, id + ' deal');
  });
}

function testPictures() {
  ['holiday', 'animals'].forEach(packId => {
    const pack = pictures[packId];
    assert.ok(pack.puzzles.length >= 24 && pack.puzzles.length <= 26, packId + ' ' + pack.puzzles.length);
    pack.puzzles.forEach(puzzle => {
      assert.strictEqual(puzzle.size, 10);
      assert.strictEqual(puzzle.solution.length, 10);
      assert.strictEqual(countSolutions(puzzle.solution, 2), 1, packId + ' ' + puzzle.name);
      const logical = lineSolved(puzzle.solution);
      assert.strictEqual(typeof logical, 'boolean');
    });
  });
}

function testDeals() {
  assert.strictEqual(curated.deals.length, 100);
  const seen = new Set();
  curated.deals.forEach(deal => {
    assert.ok(deal > 1000, String(deal));
    assert.strictEqual(seen.has(deal), false);
    seen.add(deal);
    assert.strictEqual(solveDeal(deal, 6000), true, 'deal ' + deal);
  });
  assert.strictEqual(curated.contains(1), false);
  assert.strictEqual(curated.contains(1000), false);
}

function testHeist() {
  assert.strictEqual(heist.missions.length, 15);
  const symbols = ['crimson', 'amber', 'emerald', 'cobalt', 'amethyst', 'cyan', 'silver', 'onyx'];
  heist.missions.forEach(mission => {
    assert.ok(mission.story && mission.story.length > 20, mission.title);
    assert.ok(mission.code.length >= 4 && mission.code.length <= 5, mission.title);
    assert.strictEqual(mission.allowDuplicates, false);
    const pool = symbols.slice(0, mission.poolSize);
    const used = new Set();
    mission.code.forEach(pin => {
      assert.ok(pool.includes(pin), mission.title + ' ' + pin);
      assert.strictEqual(used.has(pin), false, mission.title);
      used.add(pin);
    });
  });
  assert.deepStrictEqual(heist.samples, [1, 2]);
}

Promise.resolve()
  .then(testCatalogPinsAndWiring)
  .then(testGating)
  .then(testWords)
  .then(testMahjong)
  .then(testPictures)
  .then(testDeals)
  .then(testHeist)
  .then(() => {
    console.log('arcade-content.test.js passed');
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
