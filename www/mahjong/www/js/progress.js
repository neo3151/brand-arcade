/**
 * CELESTIAL JADE: MAHJONG SOLITAIRE — progress.js
 * Persistence for clearance stats, Emporium inventory, and active game continuity.
 */

'use strict';

window.Progress = (() => {

  const STATS_KEY = 'mj_stats';
  const INVENTORY_KEY = 'mj_armory';
  const ACTIVE_GAME_KEY = 'mj_active_game';

  // ---------------------------------------------------------------------------
  // Equipment Inventory
  // ---------------------------------------------------------------------------
  function getInventory() {
    try {
      const raw = localStorage.getItem(INVENTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // Initial grant for new visitors to the sanctuary
    return {
      hints: 3,
      shuffles: 3,
      undos: 3,
      lotuses: 2
    };
  }

  function saveInventory(inv) {
    try {
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
    } catch (e) {}
  }

  function getItemCount(item) {
    const inv = getInventory();
    return inv[item] || 0;
  }

  function useItem(item) {
    const inv = getInventory();
    if ((inv[item] || 0) <= 0) return false;
    inv[item]--;
    saveInventory(inv);
    return true;
  }

  function addItems(item, qty) {
    const inv = getInventory();
    inv[item] = (inv[item] || 0) + qty;
    saveInventory(inv);
    return inv[item];
  }

  // ---------------------------------------------------------------------------
  // Sanctuary Records & Statistics
  // ---------------------------------------------------------------------------
  function getStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      gamesAttempted: 0,
      gamesCleared: 0,
      currentStreak: 0,
      bestStreak: 0,
      bestTimes: {
        turtle: null,
        dragon: null,
        fortress: null
      }
    };
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  function recordGameResult(won, layoutId, elapsedSeconds) {
    const stats = getStats();
    stats.gamesAttempted++;

    if (won) {
      stats.gamesCleared++;
      stats.currentStreak++;
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
      if (stats.bestTimes && ['turtle', 'dragon', 'fortress'].includes(layoutId)) {
        const prevBest = stats.bestTimes[layoutId];
        if (prevBest === null || elapsedSeconds < prevBest) {
          stats.bestTimes[layoutId] = elapsedSeconds;
        }
      }
    } else {
      stats.currentStreak = 0;
    }

    saveStats(stats);
    return stats;
  }

  // ---------------------------------------------------------------------------
  // Active Game Continuity
  // ---------------------------------------------------------------------------
  function saveActiveGame(state) {
    try {
      localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(state));
    } catch (e) {}
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
    } catch (e) {}
  }

  return {
    getInventory,
    getItemCount,
    useItem,
    addItems,
    getStats,
    recordGameResult,
    saveActiveGame,
    getActiveGame,
    clearActiveGame
  };

})();
