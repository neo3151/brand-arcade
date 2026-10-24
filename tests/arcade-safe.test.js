/**
 * Safe-area layout for the Dynamic Island.
 * Run: node tests/arcade-safe.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const css = read('assets/arcade-safe.css');
const nav = read('assets/arcade-nav.js');
const shop = read('shop.html');
const hub = read('index.html');
const cap = JSON.parse(read('capacitor.config.json'));
const iosCap = JSON.parse(read('ios/App/App/capacitor.config.json'));
const solitaire = read('solitaire/css/game.css');
const spider = read('spidersolitaire/css/game.css');

assert.ok(css.includes('env(safe-area-inset-top, 0px)'));
assert.ok(css.includes('--arcade-bar: 52px'));
assert.ok(css.includes('min-width: 44px'));
assert.ok(css.includes('min-height: 44px'));
assert.ok(css.includes('pointer-events: none'));
assert.ok(css.includes('[data-dev-unlock]'));
assert.ok(css.includes('#arcade-inspector-pill'));
assert.ok(css.includes('.device-screen'));
assert.ok(css.includes('.modal-backdrop'));
assert.ok(css.includes('.victory-overlay'));

assert.ok(nav.includes('arcade-bar-on'));
assert.ok(nav.includes('arcade-hub-floating-btn'));
assert.ok(nav.includes('arcade-nav-dev-btn'));
assert.ok(!nav.includes("minHeight: '36px'"));
assert.ok(nav.includes('marginLeft'));

assert.ok(shop.includes('viewport-fit=cover'));
assert.ok(shop.includes('arcade-safe.css'));
assert.ok(read('assets/arcade-shop.js').includes('data-dev-unlock="1"'));
assert.ok(read('assets/arcade-shop.js').includes('DEV UNLOCK'));
assert.ok(read('assets/arcade-passport.js').includes('data-dev-unlock="1"'));

assert.ok(hub.includes('viewport-fit=cover'));
assert.ok(hub.includes('arcade-safe.css'));
assert.ok(hub.includes('min-height: 44px'));

assert.strictEqual(cap.ios.contentInset, 'never');
assert.strictEqual(iosCap.ios.contentInset, 'never');
assert.ok(iosCap.packageClassList.includes('PurchasesPlugin'));
assert.ok(iosCap.packageClassList.includes('ArcadeIslandPlugin'));

assert.ok(solitaire.includes('grid-template-columns: repeat(7, minmax(0, 1fr))'));
assert.ok(solitaire.includes('aspect-ratio: 5 / 7'));
assert.ok(spider.includes('width: 48px'));
assert.ok(spider.includes('height: 67px'));

const games = [
  'blockblast', 'solitaire', 'sudoku', 'nonogram', 'minesweeper',
  'mahjong', 'codebreaker', 'wordsearch', 'spidersolitaire', 'spades'
];
games.forEach((game) => {
  ['index.html', 'game.html', 'store.html'].forEach((file) => {
    const html = read(path.join(game, file));
    assert.ok(html.includes('viewport-fit=cover'), game + '/' + file + ' viewport');
    assert.ok(html.includes('arcade-nav.js'), game + '/' + file + ' nav');
  });
});

console.log('arcade-safe: ok');
