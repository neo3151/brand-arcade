/**
 * Fair Play refill tests.
 * Run: node tests/fair-play.test.js
 *
 * A refill is retested by rewriting fairplay_supply_v1[game].lastRefillDate.
 */
'use strict';

const assert = require('assert');

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

global.localStorage = createMemoryStorage();
const FairPlay = require('../assets/fair-play.js');

function day(isoDate) {
  const parts = isoDate.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 9, 0, 0, 0);
}

function stored(gameId) {
  const all = JSON.parse(localStorage.getItem(FairPlay.STORAGE_KEY) || '{}');
  return all[gameId] || null;
}

// First morning: low stock is raised to 15. Higher stock is left alone.
const first = FairPlay.applyDailyRefill({
  gameId: 'sudoku',
  counts: { hints: 2, undos: 40 },
  now: day('2026-10-22')
});
assert.strictEqual(first.refilled, true);
assert.strictEqual(first.counts.hints, 15);
assert.strictEqual(first.counts.undos, 40);
assert.strictEqual(first.topped.hints, 13);
assert.strictEqual(first.topped.undos, undefined);
assert.strictEqual(stored('sudoku').lastRefillDate, '2026-10-22');

// Same local day, even after the player spends down: do not refill again.
const sameDay = FairPlay.applyDailyRefill({
  gameId: 'sudoku',
  counts: { hints: 1, undos: 40 },
  now: day('2026-10-22')
});
assert.strictEqual(sameDay.refilled, false);
assert.strictEqual(sameDay.counts.hints, 1);
assert.strictEqual(sameDay.counts.undos, 40);

// Changing the stored date to a previous day makes the next read refill.
storedDateBack('sudoku', '2026-10-21');
const afterDateEdit = FairPlay.applyDailyRefill({
  gameId: 'sudoku',
  counts: { hints: 0, undos: 18 },
  now: day('2026-10-22')
});
assert.strictEqual(afterDateEdit.refilled, true);
assert.strictEqual(afterDateEdit.counts.hints, 15);
assert.strictEqual(afterDateEdit.counts.undos, 18);
assert.strictEqual(stored('sudoku').lastRefillDate, '2026-10-22');

// The next local morning tops up again and still will not reduce a surplus.
const nextMorning = FairPlay.applyDailyRefill({
  gameId: 'sudoku',
  counts: { hints: 4, undos: 22 },
  now: day('2026-10-23')
});
assert.strictEqual(nextMorning.refilled, true);
assert.strictEqual(nextMorning.counts.hints, 15);
assert.strictEqual(nextMorning.counts.undos, 22);

// Milestones add supplies on win thresholds and do not repeat for the same tier.
const below = FairPlay.grantMilestone({
  gameId: 'sudoku',
  wins: 4,
  counts: { hints: 15 },
  celebrate: false
});
assert.strictEqual(below.granted, false);
assert.strictEqual(below.counts.hints, 15);

const fifth = FairPlay.grantMilestone({
  gameId: 'sudoku',
  wins: 5,
  counts: { hints: 15 },
  celebrate: false
});
assert.strictEqual(fifth.granted, true);
assert.strictEqual(fifth.bonusEach, 5);
assert.strictEqual(fifth.counts.hints, 20);

const stillFive = FairPlay.grantMilestone({
  gameId: 'sudoku',
  wins: 5,
  counts: { hints: 20 },
  celebrate: false
});
assert.strictEqual(stillFive.granted, false);
assert.strictEqual(stillFive.counts.hints, 20);

// Jumping two tiers grants the bonus once per tier.
const tenth = FairPlay.grantMilestone({
  gameId: 'minesweeper',
  wins: 10,
  counts: { shields: 1, scans: 3 },
  celebrate: false
});
assert.strictEqual(tenth.granted, true);
assert.strictEqual(tenth.tiers, 2);
assert.strictEqual(tenth.counts.shields, 11);
assert.strictEqual(tenth.counts.scans, 13);

// refillKeys / milestoneKeys write back onto the caller's bag.
const bag = { hints: 3, coins: 500 };
const keyed = FairPlay.refillKeys('wordsearch', bag, ['hints'], 15);
assert.strictEqual(keyed.refilled, true);
assert.strictEqual(bag.hints, 15);
assert.strictEqual(bag.coins, 500);

const mile = FairPlay.milestoneKeys('wordsearch', 5, bag, ['hints'], { celebrate: false });
assert.strictEqual(mile.granted, true);
assert.strictEqual(bag.hints, 20);
assert.strictEqual(bag.coins, 500);

const status = FairPlay.getStatus('sudoku', day('2026-10-23'));
assert.strictEqual(status.refilledToday, true);
assert.strictEqual(status.floor, 15);
assert.ok(status.nextResetLabel.indexOf('h') !== -1);

console.log('fair-play.test.js: all assertions passed');

function storedDateBack(gameId, date) {
  const all = JSON.parse(localStorage.getItem(FairPlay.STORAGE_KEY) || '{}');
  all[gameId].lastRefillDate = date;
  localStorage.setItem(FairPlay.STORAGE_KEY, JSON.stringify(all));
}
