/**
 * INFERNO SWEEPER — progress.js
 * Persistence for mission stats, power-up armory inventory, and resumable game saves.
 */

'use strict';

window.Progress = (() => {

  const STATS_KEY = 'inferno_stats';
  const INVENTORY_KEY = 'inferno_armory';
  const ACTIVE_GAME_KEY = 'inferno_active_game';
  const SUPPLY_KEYS = ['shields', 'scans', 'orbs', 'strikes'];
  const DEFAULT_INVENTORY = {
    shields: 15,
    scans: 15,
    orbs: 15,
    strikes: 15
  };

  // ---------------------------------------------------------------------------
  // Armory Inventory
  // ---------------------------------------------------------------------------
  function getInventory() {
    let inv = { ...DEFAULT_INVENTORY };
    let hadSave = false;
    try {
      const raw = localStorage.getItem(INVENTORY_KEY);
      if (raw) {
        hadSave = true;
        inv = { ...DEFAULT_INVENTORY, ...JSON.parse(raw) };
      }
    } catch (e) {}
    let saveNeeded = !hadSave;
    if (window.FairPlay) {
      const result = window.FairPlay.refillKeys('minesweeper', inv, SUPPLY_KEYS);
      if (Object.keys(result.topped).length) saveNeeded = true;
    }
    if (saveNeeded) saveInventory(inv);
    return inv;
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
  // Mission Statistics & Records
  // ---------------------------------------------------------------------------
  function getStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      bestStreak: 0,
      bestTimes: {
        recruit: null,
        marine: null,
        nightmare: null
      }
    };
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  function recordGameResult(won, difficulty, elapsedSeconds) {
    const stats = getStats();
    stats.gamesPlayed++;

    if (won) {
      stats.gamesWon++;
      stats.currentStreak++;
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
      const inv = getInventory();
      if (window.FairPlay) {
        const result = window.FairPlay.milestoneKeys('minesweeper', stats.gamesWon, inv, SUPPLY_KEYS);
        if (result.granted) saveInventory(inv);
      }
      if (['recruit', 'marine', 'nightmare'].includes(difficulty)) {
        const prevBest = stats.bestTimes[difficulty];
        if (prevBest === null || elapsedSeconds < prevBest) {
          stats.bestTimes[difficulty] = elapsedSeconds;
        }
      }
    } else {
      stats.currentStreak = 0;
    }

    saveStats(stats);
    return stats;
  }

  // ---------------------------------------------------------------------------
  // Active Game State Persistence
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
