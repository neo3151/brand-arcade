/* ==========================================================================
   progress.js — LocalStorage Save Data, Progression, Stats & Inventory
   Zen Nonogram: Pixel Tapestry
   ========================================================================== */

(function(window) {
  'use strict';

  const STORAGE_KEY = 'zen_nonogram_save_v1';

  const defaultState = {
    stats: {
      totalSolved: 0,
      streak: 1,
      lastPlayedDate: null
    },
    inventory: {
      coins: 150,
      hints: 5,
      radars: 3,
      bombs: 2
    },
    unlocked: {
      beginner: 1,
      easy: 1,
      medium: 1,
      hard: 1,
      master: 1
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
      if (!raw) return JSON.parse(JSON.stringify(defaultState));
      const parsed = JSON.parse(raw);
      return {
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
      };
    } catch (e) {
      console.warn('Failed to parse state from localStorage', e);
      return JSON.parse(JSON.stringify(defaultState));
    }
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
      return state.unlocked[difficulty] || 1;
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

        // Unlock next level
        if (level >= (state.unlocked[difficulty] || 1)) {
          state.unlocked[difficulty] = Math.min(1000, level + 1);
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
