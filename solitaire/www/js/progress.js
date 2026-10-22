/**
 * progress.js — Solitaire persistence, power-up inventory, stats & active session resume.
 * Curious Solitaire (Wonderland Theme)
 */

const SOLITAIRE_PROGRESS_KEY = 'curious_solitaire_progress_v1';
const SOLITAIRE_ACTIVE_GAME_KEY = 'curious_solitaire_active_game_v1';

const SOLITAIRE_SUPPLY_KEYS = ['hints', 'peeks', 'shuffles'];

function defaultSolitaireProgress() {
  return {
    hints: 15,       // Looking Glass hints — morning floor
    peeks: 15,       // Cheshire Peeks
    shuffles: 15,    // Wonderland Reshuffles
    draw1: {
      completed: [],
      bestTimes: {},
      bestMoves: {}
    },
    draw3: {
      completed: [],
      bestTimes: {},
      bestMoves: {}
    },
    streak: { lastPlayed: null, count: 0 },
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      totalHintsUsed: 0,
      totalPeeksUsed: 0,
      totalShufflesUsed: 0
    }
  };
}

function applySolitaireSupply(p, hadSave) {
  let saveNeeded = !hadSave;
  if (typeof window !== 'undefined' && window.FairPlay) {
    const result = window.FairPlay.refillKeys('solitaire', p, SOLITAIRE_SUPPLY_KEYS);
    if (Object.keys(result.topped).length) saveNeeded = true;
  }
  if (saveNeeded) saveProgress(p);
  return p;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(SOLITAIRE_PROGRESS_KEY);
    if (!raw) return applySolitaireSupply(defaultSolitaireProgress(), false);
    const p = JSON.parse(raw);
    const def = defaultSolitaireProgress();

    p.draw1 = p.draw1 || def.draw1;
    p.draw3 = p.draw3 || def.draw3;
    p.draw1.completed = p.draw1.completed || [];
    p.draw1.bestTimes = p.draw1.bestTimes || {};
    p.draw1.bestMoves = p.draw1.bestMoves || {};
    p.draw3.completed = p.draw3.completed || [];
    p.draw3.bestTimes = p.draw3.bestTimes || {};
    p.draw3.bestMoves = p.draw3.bestMoves || {};

    p.streak = p.streak || def.streak;
    p.stats = p.stats || def.stats;

    if (typeof p.hints !== 'number') p.hints = def.hints;
    if (typeof p.peeks !== 'number') p.peeks = def.peeks;
    if (typeof p.shuffles !== 'number') p.shuffles = def.shuffles;

    return applySolitaireSupply(p, true);
  } catch (e) {
    return applySolitaireSupply(defaultSolitaireProgress(), false);
  }
}

function saveProgress(p) {
  try {
    localStorage.setItem(SOLITAIRE_PROGRESS_KEY, JSON.stringify(p));
  } catch (e) {
    console.warn('Save progress failed:', e);
  }
}

function getHints() { return loadProgress().hints; }
function getPeeks() { return loadProgress().peeks; }
function getShuffles() { return loadProgress().shuffles; }

function addPowerUps(hints = 0, peeks = 0, shuffles = 0) {
  const p = loadProgress();
  p.hints = (p.hints || 0) + hints;
  p.peeks = (p.peeks || 0) + peeks;
  p.shuffles = (p.shuffles || 0) + shuffles;
  saveProgress(p);
  return { hints: p.hints, peeks: p.peeks, shuffles: p.shuffles };
}

function useHint() {
  const p = loadProgress();
  if (p.hints <= 0) return false;
  p.hints--;
  p.stats.totalHintsUsed = (p.stats.totalHintsUsed || 0) + 1;
  saveProgress(p);
  return true;
}

function usePeek() {
  const p = loadProgress();
  if (p.peeks <= 0) return false;
  p.peeks--;
  p.stats.totalPeeksUsed = (p.stats.totalPeeksUsed || 0) + 1;
  saveProgress(p);
  return true;
}

function useShuffle() {
  const p = loadProgress();
  if (p.shuffles <= 0) return false;
  p.shuffles--;
  p.stats.totalShufflesUsed = (p.stats.totalShufflesUsed || 0) + 1;
  saveProgress(p);
  return true;
}

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function recordGamePlayed() {
  const p = loadProgress();
  p.stats.gamesPlayed = (p.stats.gamesPlayed || 0) + 1;
  saveProgress(p);
}

function recordGameWon(drawMode, dealNumber, timeSeconds, moves) {
  const p = loadProgress();
  const modeKey = drawMode === 3 ? 'draw3' : 'draw1';
  const data = p[modeKey];

  if (!data.completed.includes(dealNumber)) {
    data.completed.push(dealNumber);
  }
  if (!data.bestTimes[dealNumber] || timeSeconds < data.bestTimes[dealNumber]) {
    data.bestTimes[dealNumber] = timeSeconds;
  }
  if (!data.bestMoves[dealNumber] || moves < data.bestMoves[dealNumber]) {
    data.bestMoves[dealNumber] = moves;
  }

  p.stats.gamesWon = (p.stats.gamesWon || 0) + 1;

  if (typeof window !== 'undefined' && window.FairPlay) {
    window.FairPlay.milestoneKeys('solitaire', p.stats.gamesWon, p, SOLITAIRE_SUPPLY_KEYS);
  }

  // Streak logic
  const today = getLocalDateString();
  if (p.streak.lastPlayed !== today) {
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterday = getLocalDateString(yDate);
    p.streak.count = (p.streak.lastPlayed === yesterday) ? (p.streak.count || 0) + 1 : 1;
    p.streak.lastPlayed = today;
  }

  saveProgress(p);
}

function isDealCompleted(drawMode, dealNumber) {
  const p = loadProgress();
  const modeKey = drawMode === 3 ? 'draw3' : 'draw1';
  return (p[modeKey]?.completed || []).includes(dealNumber);
}

function saveActiveGame(gameState) {
  try {
    localStorage.setItem(SOLITAIRE_ACTIVE_GAME_KEY, JSON.stringify(gameState));
  } catch (e) {
    console.warn('Save active solitaire game failed:', e);
  }
}

function getActiveGame() {
  try {
    const raw = localStorage.getItem(SOLITAIRE_ACTIVE_GAME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearActiveGame() {
  try {
    localStorage.removeItem(SOLITAIRE_ACTIVE_GAME_KEY);
  } catch (e) {
    console.warn('Clear active solitaire game failed:', e);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadProgress, saveProgress, getHints, getPeeks, getShuffles, addPowerUps,
    useHint, usePeek, useShuffle, recordGamePlayed, recordGameWon,
    isDealCompleted, saveActiveGame, getActiveGame, clearActiveGame
  };
} else {
  window.SolitaireProgress = {
    load: loadProgress,
    save: saveProgress,
    getHints,
    getPeeks,
    getShuffles,
    addPowerUps,
    useHint,
    usePeek,
    useShuffle,
    recordGamePlayed,
    recordGameWon,
    isDealCompleted,
    saveActiveGame,
    getActiveGame,
    clearActiveGame
  };
}
