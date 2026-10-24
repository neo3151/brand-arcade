/**
 * Island button routing: each action clicks the existing control and
 * pushes an immediate activity update. It does not mint hints.
 * Run: node tests/arcade-island-intent.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

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
    setInterval,
    clearInterval,
    Promise,
    Date,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
  }, extra || {});
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/arcade-island.js'), 'utf8'), sandbox, { filename: 'arcade-island.js' });
  return sandbox;
}

function el(className, text) {
  return {
    className: className || '',
    textContent: text || '',
    dataset: {},
    style: {},
    clicks: 0,
    click() { this.clicks += 1; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

function page(ids, lists) {
  return {
    documentElement: { dataset: {} },
    body: { dataset: {} },
    getElementById(id) { return (ids && ids[id]) || null; },
    querySelector() { return null; },
    querySelectorAll(sel) { return (lists && lists[sel]) || []; }
  };
}

async function main() {
  const calls = [];
  const ios = load({
    Capacitor: {
      getPlatform() { return 'ios'; },
      Plugins: {
        ArcadeIsland: {
          start(payload) { calls.push(['start', payload]); return Promise.resolve({ ok: true }); },
          update(payload) { calls.push(['update', payload]); return Promise.resolve({ ok: true }); },
          end(payload) { calls.push(['end', payload]); return Promise.resolve({ ok: true }); }
        }
      }
    }
  });

  const rotate = el('', '3');
  const pause = el('pause-btn');
  const resume = el('resume-btn');
  const pauseModal = el('pause-modal');
  const board = page({
    'powerup-rotate-btn': rotate,
    'pause-btn': pause,
    'resume-btn': resume,
    'pause-modal': pauseModal,
    'badge-rotate': rotate,
    'hud-score': el('', '40'),
    'hud-combo-text': el('', ''),
    'hud-best-score': el('', '100'),
    'tray-slot-0': el(''),
    'tray-slot-1': el(''),
    'tray-slot-2': el('')
  });
  rotate.click = function () {
    this.clicks += 1;
    const n = parseInt(this.textContent, 10) || 0;
    this.textContent = String(Math.max(0, n - 1));
  };

  await ios.ArcadeIsland.start(ios.ArcadeIsland.read(board, 'blockblast'));
  const rotated = await ios.ArcadeIsland.applyIntent({ game: 'blockblast', action: 'rotate' }, board);
  assert.strictEqual(rotated.ok, true);
  assert.strictEqual(rotated.reason, 'applied');
  assert.strictEqual(rotate.clicks, 1);
  assert.strictEqual(rotate.textContent, '2');
  const pushed = calls.filter(row => row[0] === 'update');
  assert.strictEqual(pushed.length, 1);
  assert.strictEqual(pushed[0][1].supply, 2);
  assert.ok(pushed[0][1].actions.indexOf('rotate') !== -1);

  const paused = await ios.ArcadeIsland.applyIntent({ game: 'blockblast', action: 'pause' }, board);
  assert.strictEqual(paused.ok, true);
  assert.strictEqual(pause.clicks, 1);
  assert.strictEqual(resume.clicks, 0);
  pauseModal.className = 'pause-modal active';
  const resumed = await ios.ArcadeIsland.applyIntent({ game: 'blockblast', action: 'pause' }, board);
  assert.strictEqual(resume.clicks, 1);
  assert.strictEqual(resumed.reason, 'applied');
  assert.strictEqual(pause.clicks, 1);

  const hint = el('', '4');
  const draw = el('');
  const solitaire = page({
    'btn-hint': hint,
    'stock-slot': draw,
    'badge-hints': hint,
    'hint-text': el('', 'Move the red five')
  }, { '.foundation-slot': [] });
  hint.click = function () {
    this.clicks += 1;
    this.textContent = String((parseInt(this.textContent, 10) || 0) - 1);
  };
  const hinted = await ios.ArcadeIsland.applyIntent({ game: 'solitaire', action: 'hint' }, solitaire);
  assert.strictEqual(hinted.ok, true);
  assert.strictEqual(hint.textContent, '3');
  const drawn = await ios.ArcadeIsland.applyIntent({ game: 'solitaire', action: 'draw' }, solitaire);
  assert.strictEqual(drawn.ok, true);
  assert.strictEqual(draw.clicks, 1);
  assert.strictEqual(hint.textContent, '3');

  let pauses = 0;
  ios.ArcadeIslandHooks = {
    togglePause() { pauses += 1; return true; }
  };
  const reveal = el('');
  const sudokuHint = el('');
  const sudoku = page({
    'hint-btn': sudokuHint,
    'reveal-btn': reveal,
    'timer': el('', '00:10'),
    'hint-explanation-text': el('', 'Row 3 column 4 is 7')
  }, { '.cell--given, .cell--filled': new Array(10), '.hint-count': [el('hint-count', '2')] });
  const sudokuResult = await ios.ArcadeIsland.applyIntent({ game: 'sudoku', action: 'hint' }, sudoku);
  assert.strictEqual(sudokuResult.ok, true);
  assert.strictEqual(sudokuHint.clicks, 1);
  assert.strictEqual(reveal.clicks, 1);
  const sudokuPause = await ios.ArcadeIsland.applyIntent({ game: 'sudoku', action: 'pause' }, sudoku);
  assert.strictEqual(sudokuPause.ok, true);
  assert.strictEqual(pauses, 1);

  const row = el('', '5');
  const apply = el('');
  const nonogram = page({
    'pwr-hint-btn': row,
    'hint-apply-btn': apply,
    'badge-hints': row,
    'hint-text': el('', 'Fill r2 c3')
  }, { '.grid-matrix .grid-cell': [el('grid-cell filled'), el('grid-cell')] });
  row.click = function () {
    this.clicks += 1;
  };
  apply.click = function () {
    this.clicks += 1;
    const n = parseInt(row.textContent, 10) || 0;
    row.textContent = String(n - 1);
  };
  const rowResult = await ios.ArcadeIsland.applyIntent({ game: 'nonogram', action: 'row' }, nonogram);
  assert.strictEqual(rowResult.ok, true);
  assert.strictEqual(row.clicks, 1);
  assert.strictEqual(apply.clicks, 1);
  assert.strictEqual(row.textContent, '4');

  const flag = el('mode-flag');
  const dig = el('mode-dig is-active');
  const led = el('', '012');
  let running = true;
  const timer = {
    get running() { return running; },
    pause() { running = false; },
    start() { running = true; }
  };
  ios.Game = { State: { timer: timer } };
  const mines = page({
    'mode-flag': flag,
    'mode-dig': dig,
    'led-timer': led,
    'led-mines': el('', '010')
  });
  const flagged = await ios.ArcadeIsland.applyIntent({ game: 'minesweeper', action: 'flag' }, mines);
  assert.strictEqual(flagged.ok, true);
  assert.strictEqual(flag.clicks, 1);
  flag.className = 'mode-flag is-active';
  dig.className = 'mode-dig';
  const digging = await ios.ArcadeIsland.applyIntent({ game: 'minesweeper', action: 'flag' }, mines);
  assert.strictEqual(digging.ok, true);
  assert.strictEqual(dig.clicks, 1);
  const held = await ios.ArcadeIsland.applyIntent({ game: 'minesweeper', action: 'pause' }, mines);
  assert.strictEqual(held.ok, true);
  assert.strictEqual(running, false);
  assert.strictEqual(led.dataset.paused, '1');
  await ios.ArcadeIsland.applyIntent({ game: 'minesweeper', action: 'pause' }, mines);
  assert.strictEqual(running, true);
  assert.strictEqual(led.dataset.paused, '');

  const mjHint = el('', '2');
  const shuffle = el('');
  const tileA = el('mj-tile mj-tile--hint', '東');
  const tileB = el('mj-tile mj-tile--hint', '東');
  const mahjong = page({
    'btn-hint': mjHint,
    'btn-shuffle': shuffle,
    'badge-hint': mjHint,
    'pairs-left-display': el('', '12')
  }, { '.mj-tile--hint': [tileA, tileB] });
  mjHint.click = function () {
    this.clicks += 1;
    this.textContent = String((parseInt(this.textContent, 10) || 0) - 1);
  };
  const pair = await ios.ArcadeIsland.applyIntent({ game: 'mahjong', action: 'hint' }, mahjong);
  assert.strictEqual(pair.ok, true);
  assert.strictEqual(mjHint.textContent, '1');
  const reading = ios.ArcadeIsland.read(mahjong, 'mahjong');
  assert.strictEqual(reading.caption, '東 + 東');
  const shuffled = await ios.ArcadeIsland.applyIntent({ game: 'mahjong', action: 'shuffle' }, mahjong);
  assert.strictEqual(shuffled.ok, true);
  assert.strictEqual(shuffle.clicks, 1);

  const pegExact = el('feedback-peg feedback-peg--exact');
  const pegPartial = el('feedback-peg feedback-peg--partial');
  const pegMiss = el('feedback-peg');
  const submitted = {
    className: 'guess-row guess-row--submitted',
    querySelectorAll(sel) {
      if (sel === '.feedback-peg') return [pegExact, pegPartial, pegMiss];
      return [];
    }
  };
  const decrypt = el('', '1');
  const vault = page({
    'btn-equip-decrypt': decrypt,
    'badge-decrypt': decrypt
  }, {
    '.guess-row': new Array(10),
    '.guess-row--submitted': [submitted]
  });
  decrypt.click = function () {
    this.clicks += 1;
    this.textContent = '0';
  };
  const cracked = await ios.ArcadeIsland.applyIntent({ game: 'codebreaker', action: 'decrypt' }, vault);
  assert.strictEqual(cracked.ok, true);
  assert.strictEqual(decrypt.textContent, '0');
  const pegs = ios.ArcadeIsland.read(vault, 'codebreaker');
  assert.deepStrictEqual(Array.from(pegs.pieces), ['exact', 'partial', 'miss']);
  assert.strictEqual(pegs.caption, '1 exact · 1 partial');

  const jade = el('word-item', 'JADE');
  const onyx = el('word-item', 'ONYX');
  const found = el('word-item found', 'AMBER');
  const wordHint = el('', '6');
  const words = page({
    'hint-btn': wordHint,
    'hint-count': wordHint,
    'found-counter': el('', '1/3')
  }, {
    '.word-item': [found, jade, onyx],
    '.word-item.found': [found],
    '.word-item.island-next': []
  });
  wordHint.click = function () { this.clicks += 1; };
  const lists = words.querySelectorAll;
  words.querySelectorAll = function (sel) {
    if (sel === '.word-item.island-next') {
      return [jade, onyx].filter(item => item.className.indexOf('island-next') !== -1);
    }
    return lists.call(words, sel);
  };
  const first = await ios.ArcadeIsland.applyIntent({ game: 'wordsearch', action: 'cycle' }, words);
  assert.strictEqual(first.ok, true);
  assert.strictEqual(wordHint.clicks, 0);
  assert.ok(jade.className.indexOf('island-next') !== -1);
  const cycled = ios.ArcadeIsland.read(words, 'wordsearch');
  assert.strictEqual(cycled.caption, 'Next J');
  const second = await ios.ArcadeIsland.applyIntent({ game: 'wordsearch', action: 'cycle' }, words);
  assert.strictEqual(second.ok, true);
  assert.ok(onyx.className.indexOf('island-next') !== -1);
  assert.ok(jade.className.indexOf('island-next') === -1);
  assert.strictEqual(wordHint.clicks, 0);
  const spent = await ios.ArcadeIsland.applyIntent({ game: 'wordsearch', action: 'hint' }, words);
  assert.strictEqual(spent.ok, true);
  assert.strictEqual(wordHint.clicks, 1);

  const deal = el('');
  const spiderHint = el('', '2');
  const spider = page({
    'stock-card-slot': deal,
    'pwr-hint-btn': spiderHint,
    'badge-hints': spiderHint,
    'stock-deals-count': el('', '4 deals'),
    'timer-val': el('', '01:00')
  }, { '.foundation-slot.completed': [] });
  const dealt = await ios.ArcadeIsland.applyIntent({ game: 'spidersolitaire', action: 'deal' }, spider);
  assert.strictEqual(dealt.ok, true);
  assert.strictEqual(deal.clicks, 1);
  assert.strictEqual(spiderHint.clicks, 0);
  const spiderHinted = await ios.ArcadeIsland.applyIntent({ game: 'spidersolitaire', action: 'hint' }, spider);
  assert.strictEqual(spiderHinted.ok, true);
  assert.strictEqual(spiderHint.clicks, 1);

  const card = el('card playable', 'AS');
  const other = el('card', 'KH');
  const spades = page({
    'score-us': el('', '10'),
    'score-them': el('', '20'),
    'tricks-us-counter': el('', '1/3'),
    'tricks-them-counter': el('', '0/3'),
    'trick-status-text': el('', 'Your turn'),
    'trick-slot-north': el('', '10H'),
    'trick-slot-west': el('', ''),
    'trick-slot-east': el('', ''),
    'trick-slot-south': el('', '')
  }, {
    '#human-hand .playable': [card],
    '#human-hand .playable, #human-hand .card': [card, other],
    '#human-hand .card': [card, other]
  });
  const played = await ios.ArcadeIsland.applyIntent({ game: 'spades', action: 'play' }, spades);
  assert.strictEqual(played.ok, true);
  assert.strictEqual(card.clicks, 1);
  assert.strictEqual(other.clicks, 0);
  const hand = ios.ArcadeIsland.read(spades, 'spades');
  assert.ok(hand.caption.indexOf('2 in hand') !== -1);
  assert.ok(hand.caption.indexOf('Your turn') !== -1);
  assert.ok(hand.caption.indexOf('10H') !== -1);

  const missed = await ios.ArcadeIsland.applyIntent({ game: 'spades', action: 'hint' }, spades);
  assert.strictEqual(missed.ok, false);
  assert.strictEqual(missed.reason, 'unknown-action');
  assert.strictEqual(card.clicks, 1);

  const emptyHand = page({
    'score-us': el('', '0'),
    'score-them': el('', '0')
  }, { '#human-hand .playable': [] });
  const blocked = await ios.ArcadeIsland.applyIntent({ game: 'spades', action: 'play' }, emptyHand);
  assert.strictEqual(blocked.reason, 'unavailable');

  const web = load();
  const webHint = el('');
  const webBoard = page({ 'btn-hint': webHint, 'badge-hints': el('', '1') }, { '.foundation-slot': [] });
  const webResult = await web.ArcadeIsland.applyIntent({ game: 'solitaire', action: 'hint' }, webBoard);
  assert.strictEqual(webResult.ok, true);
  assert.strictEqual(webHint.clicks, 1);
  const android = load({
    Capacitor: {
      getPlatform() { return 'android'; },
      Plugins: { ArcadeIsland: { update() { throw new Error('should not run'); } } }
    }
  });
  const androidHint = el('');
  const androidResult = await android.ArcadeIsland.applyIntent(
    { game: 'solitaire', action: 'hint' },
    page({ 'btn-hint': androidHint }, { '.foundation-slot': [] })
  );
  assert.strictEqual(androidResult.ok, true);
  assert.strictEqual(androidHint.clicks, 1);

  const won = ios.ArcadeIsland.present('solitaire', { phase: 'won', primary: '52', chime: true, caption: 'Won' });
  assert.strictEqual(won.celebrate, true);
  assert.strictEqual(won.chime, true);
  assert.strictEqual(/\$\d/.test(JSON.stringify(won)), false);
  const quiet = ios.ArcadeIsland.present('minesweeper', { phase: 'playing', alert: true, primary: '003' });
  assert.strictEqual(quiet.chime, false);
  assert.strictEqual(quiet.alert, true);

  const project = fs.readFileSync(path.join(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
  assert.ok(project.includes('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;'));
  assert.ok(project.includes('CODE_SIGN_ENTITLEMENTS = "../ArcadeIslandWidget/ArcadeIslandWidget.entitlements";'));
  assert.ok(project.includes('ArcadeIslandIntent.swift'));
  assert.ok(project.includes('ArcadeIslandInbox.swift'));
  ['ios/App/App/App.entitlements', 'ios/ArcadeIslandWidget/ArcadeIslandWidget.entitlements'].forEach(function (file) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(text.includes('group.com.gamingempire.benchmarkarcade'), file);
  });
  const widget = fs.readFileSync(path.join(root, 'ios/ArcadeIslandWidget/ArcadeIslandWidget.swift'), 'utf8');
  assert.ok(widget.includes('LiveActivityIntent') === false);
  assert.ok(widget.includes('#available(iOS 17.0, *)'));
  assert.ok(widget.includes('contentTransition(.numericText())'));
  const intent = fs.readFileSync(path.join(root, 'ios/ArcadeIslandWidget/ArcadeIslandIntent.swift'), 'utf8');
  assert.ok(intent.includes('LiveActivityIntent'));
  assert.ok(intent.includes('openAppWhenRun'));

  console.log('arcade-island-intent: ten games, supply clicks, signing group passed');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
