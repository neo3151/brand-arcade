/* ==========================================================================
   progress.js — LocalStorage Save Data, Progression, Stats & Inventory
   Zen Nonogram: Pixel Tapestry
   ========================================================================== */

(function(window) {
  'use strict';

  const STORAGE_KEY = 'zen_nonogram_save_v1';
  const ALL_LEVELS_OPEN = 1000;
  const SUPPLY_KEYS = ['hints', 'radars', 'bombs'];

  const defaultState = {
    stats: {
      totalSolved: 0,
      streak: 1,
      lastPlayedDate: null
    },
    inventory: {
      coins: 150,
      hints: 15,
      radars: 15,
      bombs: 15
    },
    unlocked: {
      beginner: ALL_LEVELS_OPEN,
      easy: ALL_LEVELS_OPEN,
      medium: ALL_LEVELS_OPEN,
      hard: ALL_LEVELS_OPEN,
      master: ALL_LEVELS_OPEN
    },
    completed: {
      beginner: {},
      easy: {},
      medium: {},
      hard: {},
      master: {}
    },
    activeGame: null
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return finishState(JSON.parse(JSON.stringify(defaultState)), false);
      const parsed = JSON.parse(raw);
      return finishState({
        stats: { ...defaultState.stats, ...(parsed.stats || {}) },
        inventory: { ...defaultState.inventory, ...(parsed.inventory || {}) },
        unlocked: { ...defaultState.unlocked, ...(parsed.unlocked || {}) },
        completed: {
          beginner: (parsed.completed && parsed.completed.beginner) || {},
          easy: (parsed.completed && parsed.completed.easy) || {},
          medium: (parsed.completed && parsed.completed.medium) || {},
          hard: (parsed.completed && parsed.completed.hard) || {},
          master: (parsed.completed && parsed.completed.master) || {}
        },
        activeGame: parsed.activeGame || null
      }, true);
    } catch (e) {
      console.warn('Failed to parse state from localStorage', e);
      return finishState(JSON.parse(JSON.stringify(defaultState)), false);
    }
  }

  function finishState(state, hadSave) {
    let opened = false;
    Object.keys(defaultState.unlocked).forEach(function (key) {
      if (state.unlocked[key] !== ALL_LEVELS_OPEN) {
        state.unlocked[key] = ALL_LEVELS_OPEN;
        opened = true;
      }
    });
    let saveNeeded = !hadSave || opened;
    if (window.FairPlay) {
      const result = window.FairPlay.refillKeys('nonogram', state.inventory, SUPPLY_KEYS);
      if (Object.keys(result.topped).length) saveNeeded = true;
    }
    if (saveNeeded) saveState(state);
    return state;
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to write state to localStorage', e);
    }
  }

  const Progress = {
    getStats() {
      const state = loadState();
      return state.stats;
    },

    getInventory() {
      const state = loadState();
      return state.inventory;
    },

    modifyItem(itemKey, delta) {
      const state = loadState();
      if (state.inventory[itemKey] !== undefined) {
        state.inventory[itemKey] = Math.max(0, state.inventory[itemKey] + delta);
        saveState(state);
        return state.inventory[itemKey];
      }
      return 0;
    },

    getUnlockedLevel(difficulty) {
      const state = loadState();
      return state.unlocked[difficulty] || ALL_LEVELS_OPEN;
    },

    isLevelCompleted(difficulty, level) {
      const state = loadState();
      return !!(state.completed[difficulty] && state.completed[difficulty][level]);
    },

    getLevelRecord(difficulty, level) {
      const state = loadState();
      return state.completed[difficulty] && state.completed[difficulty][level] || null;
    },

    completeLevel(difficulty, level, timeSeconds, stars = 3) {
      const state = loadState();

      if (!state.completed[difficulty]) state.completed[difficulty] = {};

      const prev = state.completed[difficulty][level];
      const isFirstClear = !prev;

      if (isFirstClear) {
        state.stats.totalSolved = (state.stats.totalSolved || 0) + 1;
        // Award 25 coins for clear
        state.inventory.coins = (state.inventory.coins || 0) + 25;

        state.unlocked[difficulty] = ALL_LEVELS_OPEN;
        if (window.FairPlay) {
          window.FairPlay.milestoneKeys('nonogram', state.stats.totalSolved, state.inventory, SUPPLY_KEYS);
        }
      }

      state.completed[difficulty][level] = {
        bestTime: prev ? Math.min(prev.bestTime, timeSeconds) : timeSeconds,
        stars: prev ? Math.max(prev.stars, stars) : stars,
        timestamp: Date.now()
      };

      // Clear active game if it matches this level
      if (state.activeGame && state.activeGame.difficulty === difficulty && state.activeGame.level === level) {
        state.activeGame = null;
      }

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      if (state.stats.lastPlayedDate !== today) {
        state.stats.streak = (state.stats.streak || 0) + 1;
        state.stats.lastPlayedDate = today;
      }

      saveState(state);
      return { isFirstClear, coinsAwarded: 25 };
    },

    saveActiveGame(gameData) {
      const state = loadState();
      state.activeGame = gameData;
      saveState(state);
    },

    getActiveGame() {
      const state = loadState();
      return state.activeGame;
    },

    clearActiveGame() {
      const state = loadState();
      state.activeGame = null;
      saveState(state);
    }
  };

  window.Progress = Progress;
})(window);
