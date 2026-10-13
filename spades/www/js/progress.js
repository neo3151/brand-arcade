/* ==========================================================================
   progress.js — Persistent Storage & Stats
   Royal Spades
   ========================================================================== */

(function(window) {
  'use strict';

  const STORAGE_KEY_STATS = 'royal_spades_stats';
  const STORAGE_KEY_ACTIVE = 'royal_spades_active_game';
  const STORAGE_KEY_INV = 'royal_spades_inventory';

  const defaultStats = {
    gamesPlayed: 0,
    gamesWon: 0,
    handsPlayed: 0,
    nilBids: 0,
    nilsMade: 0,
    bagsAccrued: 0,
    twosWildWins: 0,
    classicWins: 0,
    bestScore: 0
  };

  const defaultInventory = {
    coins: 250,
    activeTable: 'emerald_velvet',
    activeDeck: 'classic_royale',
    unlockedTables: ['emerald_velvet'],
    unlockedDecks: ['classic_royale']
  };

  const Progress = {
    getStats() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_STATS);
        return raw ? { ...defaultStats, ...JSON.parse(raw) } : { ...defaultStats };
      } catch (_) {
        return { ...defaultStats };
      }
    },

    saveStats(stats) {
      try {
        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
      } catch (_) {}
    },

    recordGameResult(won, isTwosWild, userFinalScore, nilStats = { bid: 0, made: 0 }, bagsAdded = 0) {
      const stats = this.getStats();
      stats.gamesPlayed++;
      if (won) {
        stats.gamesWon++;
        if (isTwosWild) stats.twosWildWins++;
        else stats.classicWins++;
      }
      stats.nilBids += nilStats.bid;
      stats.nilsMade += nilStats.made;
      stats.bagsAccrued += bagsAdded;
      if (userFinalScore > stats.bestScore) {
        stats.bestScore = userFinalScore;
      }
      this.saveStats(stats);

      // Reward coins for completing game
      const reward = won ? 100 : 25;
      this.modifyCoins(reward);
    },

    getActiveGame() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    },

    saveActiveGame(data) {
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(data));
      } catch (_) {}
    },

    clearActiveGame() {
      try {
        localStorage.removeItem(STORAGE_KEY_ACTIVE);
      } catch (_) {}
    },

    getInventory() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_INV);
        return raw ? { ...defaultInventory, ...JSON.parse(raw) } : { ...defaultInventory };
      } catch (_) {
        return { ...defaultInventory };
      }
    },

    saveInventory(inv) {
      try {
        localStorage.setItem(STORAGE_KEY_INV, JSON.stringify(inv));
      } catch (_) {}
    },

    modifyCoins(delta) {
      const inv = this.getInventory();
      inv.coins = Math.max(0, inv.coins + delta);
      this.saveInventory(inv);
      return inv.coins;
    }
  };

  window.Progress = Progress;
})(window);
