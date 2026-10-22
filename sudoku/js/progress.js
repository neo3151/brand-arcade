/**
 * progress.js
 * All localStorage save/load logic for player progress.
 */

'use strict';

const STORAGE_KEY = 'sudoku_progress_v1';

const DIFFICULTIES = ['beginner', 'easy', 'medium', 'hard', 'master'];
const ALL_LEVELS_OPEN = 1000;
const SUPPLY_KEYS = ['hints'];

function defaultProgress() {
  const difficulty = {};
  DIFFICULTIES.forEach(d => {
    difficulty[d] = { unlocked: ALL_LEVELS_OPEN, completed: [], bestTimes: {} };
  });
  return {
    hints: 15,         // Morning floor; Fair Play tops this up each local day
    difficulty,
    streak: { lastPlayed: null, count: 0 },
    stats: {
      totalPuzzlesSolved: 0,
      totalHintsUsed: 0,
      totalTimePlayed: 0, // seconds
    },
  };
}

function openAllDifficulties(parsed) {
  const def = defaultProgress();
  parsed.difficulty = parsed.difficulty || def.difficulty;
  let changed = false;
  DIFFICULTIES.forEach(d => {
    parsed.difficulty[d] = parsed.difficulty[d] || def.difficulty[d];
    if (parsed.difficulty[d].unlocked !== ALL_LEVELS_OPEN) {
      parsed.difficulty[d].unlocked = ALL_LEVELS_OPEN;
      changed = true;
    }
  });
  return changed;
}

function applySupply(parsed, hadSave) {
  const opened = openAllDifficulties(parsed);
  let saveNeeded = !hadSave || opened;
  if (typeof window !== 'undefined' && window.FairPlay) {
    const result = window.FairPlay.refillKeys('sudoku', parsed, SUPPLY_KEYS);
    if (Object.keys(result.topped).length) saveNeeded = true;
  }
  if (saveNeeded) save(parsed);
  return parsed;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return applySupply(defaultProgress(), false);
    const parsed = JSON.parse(raw);
    const def = defaultProgress();
    parsed.stats = parsed.stats || def.stats;
    parsed.streak = parsed.streak || def.streak;
    if (typeof parsed.hints !== 'number') parsed.hints = def.hints;
    return applySupply(parsed, true);
  } catch (e) {
    return applySupply(defaultProgress(), false);
  }
}

function save(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('Could not save progress:', e);
  }
}

function getHints() {
  return load().hints;
}

function addHints(count) {
  const p = load();
  p.hints = (p.hints || 0) + count;
  save(p);
  return p.hints;
}

function useHint() {
  const p = load();
  if (p.hints <= 0) return false;
  p.hints--;
  p.stats.totalHintsUsed = (p.stats.totalHintsUsed || 0) + 1;
  save(p);
  return true;
}

function getUnlockedLevel(difficulty) {
  return load().difficulty[difficulty]?.unlocked || ALL_LEVELS_OPEN;
}

function isLevelCompleted(difficulty, level) {
  const p = load();
  return (p.difficulty[difficulty]?.completed || []).includes(level);
}

function completeLevel(difficulty, level, timeSeconds) {
  const p = load();
  const d = p.difficulty[difficulty];
  if (!d) return;

  if (!d.completed.includes(level)) {
    d.completed.push(level);
    p.stats.totalPuzzlesSolved++;
  }

  // Every difficulty is open from the start. Completing a puzzle does not gate the next one.
  d.unlocked = ALL_LEVELS_OPEN;

  if (typeof window !== 'undefined' && window.FairPlay) {
    window.FairPlay.milestoneKeys('sudoku', p.stats.totalPuzzlesSolved, p, SUPPLY_KEYS);
  }

  // Best time
  if (!d.bestTimes[level] || timeSeconds < d.bestTimes[level]) {
    d.bestTimes[level] = timeSeconds;
  }

  p.stats.totalTimePlayed = (p.stats.totalTimePlayed || 0) + timeSeconds;

  // Update streak using local dates
  updateStreakOnDate(p);

  save(p);
}

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function updateStreakOnDate(p) {
  const today = getLocalDateString();
  if (p.streak.lastPlayed !== today) {
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterday = getLocalDateString(yDate);
    p.streak.count = p.streak.lastPlayed === yesterday ? (p.streak.count || 0) + 1 : 1;
    p.streak.lastPlayed = today;
  }
}

function updateStreak() {
  const p = load();
  updateStreakOnDate(p);
  save(p);
}

function getStats() {
  const p = load();
  return {
    hints: p.hints,
    streak: p.streak.count || 0,
    totalSolved: p.stats.totalPuzzlesSolved || 0,
    totalHintsUsed: p.stats.totalHintsUsed || 0,
  };
}

function getBestTime(difficulty, level) {
  const p = load();
  return p.difficulty[difficulty]?.bestTimes?.[level] || null;
}

// ---------------------------------------------------------------------------
// In-progress Active Game Persistence
// ---------------------------------------------------------------------------
const ACTIVE_GAME_KEY = 'sudoku_active_game_v1';

function saveActiveGame(gameState) {
  try {
    localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(gameState));
  } catch (e) {
    console.warn('Could not save active game:', e);
  }
}

function getActiveGame() {
  try {
    const raw = localStorage.getItem(ACTIVE_GAME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearActiveGame() {
  try {
    localStorage.removeItem(ACTIVE_GAME_KEY);
  } catch (e) {
    console.warn('Could not clear active game:', e);
  }
}

function resetAll() {
  localStorage.removeItem(STORAGE_KEY);
  clearActiveGame();
}

window.Progress = {
  load,
  save,
  getHints,
  addHints,
  useHint,
  getUnlockedLevel,
  isLevelCompleted,
  completeLevel,
  updateStreak,
  getStats,
  getBestTime,
  saveActiveGame,
  getActiveGame,
  clearActiveGame,
  resetAll,
  DIFFICULTIES,
};
