/* ==========================================================================
   progress.js — LocalStorage Save Data, Progression, Stats & Inventory
   Spider Solitaire: Cobweb Manor
   ========================================================================== */

(function(window) {
  'use strict';

  const STORAGE_KEY = 'spider_solitaire_save_v1';
  const ALL_LEVELS_OPEN = 1000;
  const SUPPLY_KEYS = ['hints', 'lanterns', 'magnets'];

  const defaultState = {
    stats: {
      totalSolved: 0,
      streak: 1,
      lastPlayedDate: null
    },
    inventory: {
      coins: 150,
      hints: 15,
      lanterns: 15,
      magnets: 15
    },
    unlocked: {
      '1suit': ALL_LEVELS_OPEN,
      '2suit': ALL_LEVELS_OPEN,
      '4suit': ALL_LEVELS_OPEN
    },
    completed: {
      '1suit': {},
      '2suit': {},
      '4suit': {}
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
          '1suit': (parsed.completed && parsed.completed['1suit']) || {},
          '2suit': (parsed.completed && parsed.completed['2suit']) || {},
          '4suit': (parsed.completed && parsed.completed['4suit']) || {}
        },
        activeGame: parsed.activeGame || null
      }, true);
    } catch (e) {
      console.warn('Failed to parse spider solitaire state', e);
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
      const result = window.FairPlay.refillKeys('spidersolitaire', state.inventory, SUPPLY_KEYS);
      if (Object.keys(result.topped).length) saveNeeded = true;
    }
    if (saveNeeded) saveState(state);
    return state;
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to write spider solitaire state', e);
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

    completeLevel(difficulty, level, timeSeconds, moves) {
      const state = loadState();

      if (!state.completed[difficulty]) state.completed[difficulty] = {};

      const prev = state.completed[difficulty][level];
      const isFirstClear = !prev;

      if (isFirstClear) {
        state.stats.totalSolved = (state.stats.totalSolved || 0) + 1;
        // Award 30 coins for clear
        state.inventory.coins = (state.inventory.coins || 0) + 30;

        state.unlocked[difficulty] = ALL_LEVELS_OPEN;
        if (window.FairPlay) {
          window.FairPlay.milestoneKeys('spidersolitaire', state.stats.totalSolved, state.inventory, SUPPLY_KEYS);
        }
      }

      state.completed[difficulty][level] = {
        bestTime: prev ? Math.min(prev.bestTime, timeSeconds) : timeSeconds,
        bestMoves: prev ? Math.min(prev.bestMoves, moves) : moves,
        timestamp: Date.now()
      };

      // Clear active game
      state.activeGame = null;

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      if (state.stats.lastPlayedDate !== today) {
        state.stats.streak = (state.stats.streak || 0) + 1;
        state.stats.lastPlayedDate = today;
      }

      saveState(state);
      return { isFirstClear, coinsAwarded: 30 };
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
