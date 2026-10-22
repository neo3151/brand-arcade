/**
 * BLACK VAULT — progress.js
 * Persistence for clearance stats, Dead Drop equipment inventory, and active mission state.
 */

'use strict';

window.Progress = (() => {

  const STATS_KEY = 'bv_stats';
  const INVENTORY_KEY = 'bv_armory';
  const ACTIVE_GAME_KEY = 'bv_active_game';

  // ---------------------------------------------------------------------------
  // Equipment Inventory
  // ---------------------------------------------------------------------------
  function getInventory() {
    try {
      const raw = localStorage.getItem(INVENTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // Initial grant for new operatives
    return {
      decryptors: 3,
      filters: 3,
      rewinds: 2,
      probes: 3
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
  // Clearance Statistics & Records
  // ---------------------------------------------------------------------------
  function getStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      missionsAttempted: 0,
      missionsCleared: 0,
      currentStreak: 0,
      bestStreak: 0,
      bestTimes: {
        operative: null,
        officer: null,
        chief: null
      },
      bestRows: {
        operative: null,
        officer: null,
        chief: null
      }
    };
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  function recordMissionResult(won, difficulty, elapsedSeconds, rowsUsed) {
    const stats = getStats();
    stats.missionsAttempted++;

    if (won) {
      stats.missionsCleared++;
      stats.currentStreak++;
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
      if (['operative', 'officer', 'chief'].includes(difficulty)) {
        const prevBestTime = stats.bestTimes[difficulty];
        if (prevBestTime === null || elapsedSeconds < prevBestTime) {
          stats.bestTimes[difficulty] = elapsedSeconds;
        }

        const prevBestRows = stats.bestRows[difficulty];
        if (prevBestRows === null || rowsUsed < prevBestRows) {
          stats.bestRows[difficulty] = rowsUsed;
        }
      }
    } else {
      stats.currentStreak = 0;
    }

    saveStats(stats);
    return stats;
  }

  // ---------------------------------------------------------------------------
  // Active Mission Save & Continuity
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
    recordMissionResult,
    saveActiveGame,
    getActiveGame,
    clearActiveGame
  };

})();
