/**
 * Dynamic Island bridge: web/Android no-op, per-game readings, no prices.
 * Run: node tests/arcade-island.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function memory() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function tameTimeout(fn, ms) {
  const handle = setTimeout(fn, ms);
  if (handle && typeof handle.unref === 'function') handle.unref();
  return handle;
}

function load(extra) {
  const sandbox = Object.assign({
    console,
    setTimeout: tameTimeout,
    clearTimeout,
    Promise,
    Date,
    localStorage: memory()
  }, extra || {});
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-island.js'), 'utf8'), sandbox, { filename: 'arcade-island.js' });
  return sandbox;
}

function node(className, text, cards) {
  return {
    className: className || '',
    textContent: text || '',
    querySelectorAll(sel) {
      if (sel === '.card') return cards || [];
      return [];
    }
  };
}

function doc(ids, lists) {
  return {
    documentElement: { dataset: {} },
    body: { dataset: {} },
    getElementById(id) { return ids[id] || null; },
    querySelector() { return null; },
    querySelectorAll(sel) { return (lists && lists[sel]) || []; }
  };
}

async function main() {
  const web = load();
  const missing = await web.ArcadeIsland.start({ game: 'sudoku', primary: '00:01' });
  assert.strictEqual(missing.ok, false);
  assert.strictEqual(missing.reason, 'unavailable');
  const ended = await web.ArcadeIsland.end({ game: 'sudoku' });
  assert.strictEqual(ended.ok, false);
  assert.strictEqual(ended.reason, 'unavailable');
  await web.ArcadeIsland.update({ game: 'sudoku', primary: '00:02' });
  await web.ArcadeIsland.support();

  let androidCalls = 0;
  const android = load({
    Capacitor: {
      getPlatform() { return 'android'; },
      Plugins: {
        ArcadeIsland: {
          start() { androidCalls += 1; return Promise.resolve({ ok: true }); },
          update() { androidCalls += 1; return Promise.resolve({ ok: true }); },
          end() { androidCalls += 1; return Promise.resolve({ ok: true }); }
        }
      }
    }
  });
  const androidResult = await android.ArcadeIsland.start({ game: 'spades', primary: '10' });
  assert.strictEqual(androidResult.reason, 'unavailable');
  assert.strictEqual(androidCalls, 0);

  const calls = [];
  const ios = load({
    Capacitor: {
      getPlatform() { return 'ios'; },
      Plugins: {
        ArcadeIsland: {
          start(payload) { calls.push(['start', payload]); return Promise.resolve({ ok: true }); },
          update(payload) { calls.push(['update', payload]); return Promise.resolve({ ok: true }); },
          end(payload) { calls.push(['end', payload]); return Promise.resolve({ ok: true }); },
          support() { return Promise.resolve({ ok: false, reason: 'no-island' }); }
        }
      }
    }
  });
  ios.localStorage.setItem('arcade_daily_streak', '4');
  const started = await ios.ArcadeIsland.start({
    game: 'blockblast',
    skinId: 'walnut',
    primary: '120',
    secondary: 'Combo x2',
    progress: 0.2,
    marks: [0.4]
  });
  assert.strictEqual(started.ok, true);
  assert.strictEqual(calls[0][1].gameId, 'blockblast');
  assert.strictEqual(calls[0][1].deepLink, 'benchmarkarcade://play/blockblast');
  assert.strictEqual(calls[0][1].accent, '#c4a574');
  assert.strictEqual(calls[0][1].streak, 4);
  assert.strictEqual(calls[0][1].generation, 1);
  assert.strictEqual(/\$\d/.test(JSON.stringify(calls[0][1])), false);

  const held = await ios.ArcadeIsland.update({ game: 'blockblast', primary: '240', secondary: 'Combo x3' });
  assert.strictEqual(held.throttled, true);
  assert.strictEqual(calls.filter(row => row[0] === 'update').length, 0);

  const hot = await ios.ArcadeIsland.update({
    game: 'minesweeper',
    primary: '003',
    alert: true,
    immediate: true
  });
  assert.strictEqual(hot.ok, true);
  assert.strictEqual(calls.filter(row => row[0] === 'update').length, 1);
  assert.strictEqual(calls[calls.length - 1][1].alert, true);
  await ios.ArcadeIsland.end({ game: 'minesweeper', phase: 'lost' });
  assert.strictEqual(calls[calls.length - 1][0], 'end');

  const broken = load({
    Capacitor: {
      getPlatform() { return 'ios'; },
      Plugins: {
        ArcadeIsland: {
          start() { throw new Error('native down'); }
        }
      }
    }
  });
  const failed = await broken.ArcadeIsland.start({ game: 'mahjong', primary: '70' });
  assert.strictEqual(failed.ok, false);
  assert.strictEqual(failed.reason, 'unavailable');

  const unknown = await web.ArcadeIsland.start({ game: 'chess' });
  assert.strictEqual(unknown.reason, 'unknown-game');

  const island = web.ArcadeIsland;
  const games = [
    ['blockblast', doc({
      'hud-score': node('', '1280'),
      'hud-combo-text': node('', 'COMBO x4')
    }), '1280', 'Combo x4'],
    ['solitaire', doc({}, {
      '.foundation-slot': [
        node('foundation-slot', '', [1, 2, 3]),
        node('foundation-slot', '', [1]),
        node('foundation-slot', '', []),
        node('foundation-slot', '', [1, 2])
      ]
    }), '6', '6 to foundation'],
    ['sudoku', doc({ timer: node('', '01:02') }, {
      '.cell--given, .cell--filled': new Array(40)
    }), '01:02', '41 cells left'],
    ['nonogram', doc({ 'game-timer-val': node('', '00:40') }, {
      '.grid-matrix .grid-cell': [
        node('grid-cell filled'), node('grid-cell'), node('grid-cell crossed'), node('grid-cell filled')
      ]
    }), '50%', 'Picture'],
    ['minesweeper', doc({
      'led-mines': node('', '010'),
      'led-timer': node('', '012')
    }, { '.cell--num-3, .cell--num-4, .cell--num-5, .cell--num-6, .cell--num-7, .cell--num-8': [node('cell--num-4')] }), '010', '10 mines'],
    ['mahjong', doc({ 'pairs-left-display': node('', '40') }), '40', '40 pairs'],
    ['codebreaker', doc({}, {
      '.guess-row': new Array(10),
      '.guess-row--submitted': new Array(3)
    }), '7', '7 attempts'],
    ['wordsearch', doc({ 'found-counter': node('', '2 / 8') }, {
      '.word-item.found': [node('word-item found', 'JADE')],
      '.word-item': new Array(8)
    }), '2/8', '2 / 8'],
    ['spidersolitaire', doc({ 'timer-val': node('', '03:00') }, {
      '.foundation-slot.completed': new Array(3)
    }), '3/8', '3 runs'],
    ['spades', doc({
      'score-us': node('', '120'),
      'score-them': node('', '80'),
      'tricks-us-counter': node('', '2/4'),
      'tricks-them-counter': node('', '1/3')
    }), '120', '80']
  ];

  games.forEach(function (row) {
    const reading = island.read(row[1], row[0]);
    assert.strictEqual(reading.primary, row[2], row[0] + ' primary');
    assert.strictEqual(reading.secondary, row[3], row[0] + ' secondary');
    const payload = island.present(row[0], reading);
    assert.strictEqual(payload.gameId, row[0]);
    assert.strictEqual(payload.deepLink, 'benchmarkarcade://play/' + row[0]);
    assert.strictEqual(/\$\d/.test(JSON.stringify(payload)), false, row[0]);
    assert.ok(payload.accent.indexOf('#') === 0, row[0]);
  });

  const mineReading = island.read(games[4][1], 'minesweeper');
  assert.strictEqual(mineReading.alert, true);
  const spadesWon = island.read(doc({
    'score-us': node('', '500'),
    'score-them': node('', '320'),
    'gameover-modal': node('modal-backdrop active'),
    'gameover-title': node('', 'Match Victory!')
  }), 'spades');
  assert.strictEqual(spadesWon.phase, 'won');
  const spadesLost = island.read(doc({
    'score-us': node('', '210'),
    'score-them': node('', '500'),
    'gameover-modal': node('modal-backdrop active'),
    'gameover-title': node('', 'Match Defeat')
  }), 'spades');
  assert.strictEqual(spadesLost.phase, 'lost');
  const wood = island.present('blockblast', { skinId: 'marble', primary: '1' });
  assert.strictEqual(wood.surface, '#eef3ef');
  const nonogram = island.read(games[3][1], 'nonogram');
  assert.strictEqual(nonogram.grid.length, 64);
  assert.ok(nonogram.grid.indexOf(1) !== -1);

  // Verify live in-game Dynamic Island HUD renders compact wings + expanded telemetry & action buttons
  let mountedIsland = null;
  const liveDoc = {
    documentElement: {
      dataset: {},
      style: { getPropertyValue(k) { return k === '--safe-top' ? '59px' : ''; } }
    },
    body: {
      dataset: {},
      appendChild(child) { mountedIsland = child; }
    },
    getElementById(id) { return id === 'arcade-live-island' ? mountedIsland : null; },
    createElement() {
      return {
        id: '',
        innerHTML: '',
        style: { setProperty(k, v) { this[k] = v; } },
        classList: {
          _set: new Set(),
          toggle(cls, on) { if (on) this._set.add(cls); else this._set.delete(cls); },
          contains(cls) { return this._set.has(cls); },
          remove(cls) { this._set.delete(cls); }
        },
        setAttribute() {},
        addEventListener() {}
      };
    },
    addEventListener() {}
  };
  island.renderLiveIsland(liveDoc, 'blockblast', {
    game: 'blockblast',
    primary: '1420',
    secondary: 'Combo x3',
    marks: [0.6],
    pieces: ['11/10', '111', '1'],
    actions: ['rotate', 'pause'],
    supply: 12
  });
  assert.ok(mountedIsland, 'in-game live island mounted');
  assert.ok(mountedIsland.innerHTML.includes('island-compact'));
  assert.ok(mountedIsland.innerHTML.includes('island-expanded-body'));
  assert.ok(mountedIsland.innerHTML.includes('1420'));
  assert.ok(mountedIsland.innerHTML.includes('Combo x3'));
  assert.ok(mountedIsland.innerHTML.includes('data-island-action="rotate"'));
  assert.ok(mountedIsland.innerHTML.includes('12 left'));

  const quiet = load();
  quiet.location = { pathname: '/blockblast/www/store.html' };
  quiet.ArcadeIsland.watch({ getElementById() { return null; }, querySelectorAll() { return []; } });

  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-island-hooks.js'), 'utf8'), quiet, { filename: 'arcade-island-hooks.js' });

  const plist = fs.readFileSync(path.join(root, 'ios/App/App/Info.plist'), 'utf8');
  assert.ok(plist.includes('<key>NSSupportsLiveActivities</key>'));
  assert.ok(plist.includes('benchmarkarcade'));
  const project = fs.readFileSync(path.join(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
  assert.ok(project.includes('DEVELOPMENT_TEAM = X5H4YHJUU6;'));
  assert.ok(project.includes('com.gamingempire.benchmarkarcade.ArcadeIsland'));
  assert.ok(project.includes('ArcadeIslandPlugin.swift'));
  assert.strictEqual(project.includes('PRODUCT_BUNDLE_IDENTIFIER = com.gamingempire.benchmarkarcade;'), true);

  console.log('arcade-island: no-op bridge, ten readings, signing ids passed');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
