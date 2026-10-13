/**
 * progress.js — Word Search progress (separate from Sudoku)
 */
'use strict';

const STORAGE_KEY = 'wordsearch_progress_v1';
const DIFFICULTIES = ['beginner','easy','medium','hard','master'];
const CATEGORIES = [
  'animals','sports','food','science','geography','movies','music',
  'history','space','nature','holidays','health','jobs','technology','colors'
];

function defaultProgress() {
  const levels = {};
  CATEGORIES.forEach(cat => {
    levels[cat] = {};
    DIFFICULTIES.forEach(diff => {
      levels[cat][diff] = { unlocked: 1, completed: [], bestTimes: {} };
    });
  });
  return {
    hints: 3,
    levels,
    streak: { lastPlayed: null, count: 0 },
    stats: { totalSolved: 0, totalHintsUsed: 0 },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const p = JSON.parse(raw);
    const def = defaultProgress();
    p.levels = p.levels || def.levels;
    CATEGORIES.forEach(cat => {
      p.levels[cat] = p.levels[cat] || def.levels[cat];
      DIFFICULTIES.forEach(diff => {
        p.levels[cat][diff] = p.levels[cat][diff] || def.levels[cat][diff];
      });
    });
    p.stats  = p.stats  || def.stats;
    p.streak = p.streak || def.streak;
    if (typeof p.hints !== 'number') p.hints = def.hints;
    return p;
  } catch { return defaultProgress(); }
}

function save(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
  catch (e) { console.warn('Save failed:', e); }
}

function getHints() { return load().hints; }

function addHints(count) {
  const p = load(); p.hints = (p.hints || 0) + count; save(p); return p.hints;
}

function useHint() {
  const p = load();
  if (p.hints <= 0) return false;
  p.hints--;
  p.stats.totalHintsUsed = (p.stats.totalHintsUsed || 0) + 1;
  save(p); return true;
}

function getUnlockedLevel(category, difficulty) {
  return load().levels[category]?.[difficulty]?.unlocked || 1;
}

function isLevelCompleted(category, difficulty, level) {
  return (load().levels[category]?.[difficulty]?.completed || []).includes(level);
}

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function completeLevel(category, difficulty, level, timeSeconds) {
  const p = load();
  const d = p.levels[category]?.[difficulty];
  if (!d) return;
  if (!d.completed.includes(level)) { d.completed.push(level); p.stats.totalSolved++; }
  if (level >= d.unlocked) d.unlocked = level + 1;
  if (!d.bestTimes[level] || timeSeconds < d.bestTimes[level]) d.bestTimes[level] = timeSeconds;

  const today = getLocalDateString();
  if (p.streak.lastPlayed !== today) {
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterday = getLocalDateString(yDate);
    p.streak.count = p.streak.lastPlayed === yesterday ? (p.streak.count || 0) + 1 : 1;
    p.streak.lastPlayed = today;
  }
  save(p);
}

function getStats() {
  const p = load();
  return { hints: p.hints, streak: p.streak.count || 0, totalSolved: p.stats.totalSolved || 0 };
}

function getBestTime(category, difficulty, level) {
  return load().levels[category]?.[difficulty]?.bestTimes?.[level] || null;
}

// ── In-progress Active Game Persistence ──
const ACTIVE_GAME_KEY = 'wordsearch_active_game_v1';

function saveActiveGame(gameState) {
  try { localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(gameState)); }
  catch (e) { console.warn('Save active game failed:', e); }
}

function getActiveGame() {
  try {
    const raw = localStorage.getItem(ACTIVE_GAME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearActiveGame() {
  try { localStorage.removeItem(ACTIVE_GAME_KEY); }
  catch (e) { console.warn('Clear active game failed:', e); }
}

window.Progress = {
  load, save, getHints, addHints, useHint,
  getUnlockedLevel, isLevelCompleted, completeLevel,
  getStats, getBestTime,
  saveActiveGame, getActiveGame, clearActiveGame,
  DIFFICULTIES, CATEGORIES,
};
