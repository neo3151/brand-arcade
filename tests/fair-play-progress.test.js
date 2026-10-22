/**
 * Progress integration: daily refill, no reduction, and open levels.
 * Run: node tests/fair-play-progress.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function loadScripts(storage, files) {
  const sandbox = {
    localStorage: storage,
    console,
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  files.forEach(file => {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), sandbox, { filename: file });
  });
  return sandbox;
}

function setRefillDate(storage, gameId, date) {
  const all = JSON.parse(storage.getItem('fairplay_supply_v1') || '{}');
  all[gameId] = Object.assign({ lastRefillDate: null, milestoneTier: 0 }, all[gameId], { lastRefillDate: date });
  storage.setItem('fairplay_supply_v1', JSON.stringify(all));
}

// Sudoku: old locked save with 2 hints refills to 15 and opens every difficulty.
{
  const storage = createMemoryStorage();
  const difficulty = {};
  ['beginner', 'easy', 'medium', 'hard', 'master'].forEach(d => {
    difficulty[d] = { unlocked: 1, completed: [], bestTimes: {} };
  });
  storage.setItem('sudoku_progress_v1', JSON.stringify({
    hints: 2,
    difficulty,
    streak: { lastPlayed: null, count: 0 },
    stats: { totalPuzzlesSolved: 4, totalHintsUsed: 0, totalTimePlayed: 0 }
  }));
  setRefillDate(storage, 'sudoku', '2000-01-01');
  const ctx = loadScripts(storage, ['assets/fair-play.js', 'sudoku/js/progress.js']);
  assert.strictEqual(ctx.window.Progress.getHints(), 15);
  assert.strictEqual(ctx.window.Progress.getUnlockedLevel('master'), 1000);
  assert.strictEqual(ctx.window.Progress.getUnlockedLevel('beginner'), 1000);

  ctx.window.Progress.useHint();
  assert.strictEqual(ctx.window.Progress.getHints(), 14, 'same-day spend is not refilled');

  ctx.window.Progress.completeLevel('hard', 40, 30);
  assert.strictEqual(ctx.window.Progress.getHints(), 19, '5th clear grants 5 hints');
  assert.strictEqual(ctx.window.Progress.getUnlockedLevel('hard'), 1000);
}

// Surplus above the floor is kept when the stored date changes.
{
  const storage = createMemoryStorage();
  const ctx = loadScripts(storage, ['assets/fair-play.js', 'sudoku/js/progress.js']);
  ctx.window.Progress.getHints();
  const progress = JSON.parse(storage.getItem('sudoku_progress_v1'));
  progress.hints = 40;
  storage.setItem('sudoku_progress_v1', JSON.stringify(progress));
  setRefillDate(storage, 'sudoku', '2000-01-01');
  assert.strictEqual(ctx.window.Progress.getHints(), 40);
}

// Nonogram consumables refill; coins are not topped up or reduced.
{
  const storage = createMemoryStorage();
  storage.setItem('zen_nonogram_save_v1', JSON.stringify({
    stats: { totalSolved: 0, streak: 1, lastPlayedDate: null },
    inventory: { coins: 880, hints: 1, radars: 20, bombs: 0 },
    unlocked: { beginner: 1, easy: 1, medium: 1, hard: 1, master: 1 },
    completed: {},
    activeGame: null
  }));
  setRefillDate(storage, 'nonogram', '1999-12-31');
  const ctx = loadScripts(storage, ['assets/fair-play.js', 'nonogram/js/progress.js']);
  const inv = ctx.window.Progress.getInventory();
  assert.strictEqual(inv.hints, 15);
  assert.strictEqual(inv.radars, 20);
  assert.strictEqual(inv.bombs, 15);
  assert.strictEqual(inv.coins, 880);
  assert.strictEqual(ctx.window.Progress.getUnlockedLevel('master'), 1000);
}

// Minesweeper shields follow the same morning floor.
{
  const storage = createMemoryStorage();
  storage.setItem('inferno_armory', JSON.stringify({ shields: 0, scans: 30, orbs: 1, strikes: 2 }));
  setRefillDate(storage, 'minesweeper', '1999-05-05');
  const ctx = loadScripts(storage, ['assets/fair-play.js', 'minesweeper/js/progress.js']);
  const inv = ctx.window.Progress.getInventory();
  assert.strictEqual(inv.shields, 15);
  assert.strictEqual(inv.scans, 30);
  assert.strictEqual(inv.orbs, 15);
  assert.strictEqual(inv.strikes, 15);
  const again = ctx.window.Progress.getInventory();
  again.shields = 4;
  storage.setItem('inferno_armory', JSON.stringify(again));
  assert.strictEqual(ctx.window.Progress.getInventory().shields, 4);
}

// Block Blast power-ups refill; theme coins are untouched.
{
  const storage = createMemoryStorage();
  storage.setItem('blockblast_powerups', JSON.stringify({ hammer: 1, rotate: 50, reroll: 0 }));
  storage.setItem('blockblast_coins', '640');
  setRefillDate(storage, 'blockblast', '1999-05-05');
  const ctx = loadScripts(storage, ['assets/fair-play.js', 'blockblast/js/progress.js']);
  const ups = ctx.window.Progress.getPowerups();
  assert.strictEqual(ups.hammer, 15);
  assert.strictEqual(ups.rotate, 50);
  assert.strictEqual(ups.reroll, 15);
  assert.strictEqual(ctx.window.Progress.getCoins(), 640);
}

// Solitaire hints, peeks, and shuffles share one refill.
{
  const storage = createMemoryStorage();
  storage.setItem('curious_solitaire_progress_v1', JSON.stringify({
    hints: 0, peeks: 22, shuffles: 3,
    draw1: { completed: [], bestTimes: {}, bestMoves: {} },
    draw3: { completed: [], bestTimes: {}, bestMoves: {} },
    streak: { lastPlayed: null, count: 0 },
    stats: { gamesPlayed: 0, gamesWon: 4, totalHintsUsed: 0, totalPeeksUsed: 0, totalShufflesUsed: 0 }
  }));
  setRefillDate(storage, 'solitaire', '1999-05-05');
  const ctx = loadScripts(storage, ['assets/fair-play.js', 'solitaire/js/progress.js']);
  assert.strictEqual(ctx.window.SolitaireProgress.getHints(), 15);
  assert.strictEqual(ctx.window.SolitaireProgress.getPeeks(), 22);
  assert.strictEqual(ctx.window.SolitaireProgress.getShuffles(), 15);
  ctx.window.SolitaireProgress.recordGameWon(1, 3, 40, 80);
  assert.strictEqual(ctx.window.SolitaireProgress.getHints(), 20);
}

console.log('fair-play-progress.test.js: all assertions passed');
