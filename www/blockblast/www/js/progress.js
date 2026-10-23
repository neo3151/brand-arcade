/* ==========================================================================
   progress.js — State, Persistence, High Scores & Shop Inventory
   Timber Block Blast
   ========================================================================== */

(function(window) {
  'use strict';

  const STORAGE_KEYS = {
    HIGH_SCORE: 'blockblast_highscore',
    COINS: 'blockblast_coins',
    ACTIVE_GAME: 'blockblast_active_game',
    THEMES: 'blockblast_themes',
    SELECTED_THEME: 'blockblast_selected_theme',
    POWERUPS: 'blockblast_powerups',
    STATS: 'blockblast_stats',
    ACHIEVEMENTS: 'blockblast_achievements'
  };

  const DEFAULT_POWERUPS = {
    hammer: 15,
    rotate: 15,
    reroll: 15
  };
  const SUPPLY_KEYS = ['hammer', 'rotate', 'reroll'];

  const DEFAULT_STATS = {
    gamesPlayed: 0,
    totalLinesCleared: 0,
    highestCombo: 0,
    allTimeScore: 0
  };

  const Progress = {
    getHighScore() {
      return parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) || '0', 10);
    },

    setHighScore(score) {
      const current = this.getHighScore();
      if (score > current) {
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, score.toString());
        return true; // New record
      }
      return false;
    },

    getCoins() {
      const stored = localStorage.getItem(STORAGE_KEYS.COINS);
      return stored === null ? 150 : parseInt(stored, 10); // 150 starter coins
    },

    addCoins(amount) {
      const current = this.getCoins();
      const updated = Math.max(0, current + amount);
      localStorage.setItem(STORAGE_KEYS.COINS, updated.toString());
      return updated;
    },

    spendCoins(amount) {
      const current = this.getCoins();
      if (current >= amount) {
        localStorage.setItem(STORAGE_KEYS.COINS, (current - amount).toString());
        return true;
      }
      return false;
    },

    // Active in-progress game save & continue
    saveActiveGame(data) {
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_GAME, JSON.stringify(data));
      } catch (_) {}
    },

    getActiveGame() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    },

    clearActiveGame() {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME);
    },

    // Theme Management
    getUnlockedThemes() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.THEMES);
        return raw ? JSON.parse(raw) : ['timber', 'aurora'];
      } catch (_) {
        return ['timber', 'aurora'];
      }
    },

    unlockTheme(themeId) {
      const list = this.getUnlockedThemes();
      if (!list.includes(themeId)) {
        list.push(themeId);
        localStorage.setItem(STORAGE_KEYS.THEMES, JSON.stringify(list));
      }
    },

    getSelectedTheme() {
      const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_THEME);
      // Paid cabinet skins live in arcade_cosmetic_v1, never in the coin theme slot.
      if (stored === 'marble' || stored === 'walnut' || stored === 'stainedglass') return 'aurora';
      // Migrate everyone off the old default to the new look
      return (!stored || stored === 'timber') ? 'aurora' : stored;
    },

    setSelectedTheme(themeId) {
      if (themeId === 'marble' || themeId === 'walnut' || themeId === 'stainedglass') return false;
      if (window.ArcadeCosmetics && window.ArcadeCosmetics.isPaidTheme &&
          window.ArcadeCosmetics.isPaidTheme('blockblast', themeId)) {
        return false;
      }
      localStorage.setItem(STORAGE_KEYS.SELECTED_THEME, themeId);
      if (window.ArcadeCosmetics && window.ArcadeCosmetics.clearEquip) {
        window.ArcadeCosmetics.clearEquip('blockblast');
      } else if (document.body) {
        document.body.dataset.theme = themeId;
      }
      return true;
    },

    // Powerups Inventory
    getPowerups() {
      let inv = { ...DEFAULT_POWERUPS };
      let hadSave = false;
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.POWERUPS);
        if (raw) {
          hadSave = true;
          inv = { ...DEFAULT_POWERUPS, ...JSON.parse(raw) };
        }
      } catch (_) {}
      let saveNeeded = !hadSave;
      if (window.FairPlay) {
        const result = window.FairPlay.refillKeys('blockblast', inv, SUPPLY_KEYS);
        if (Object.keys(result.topped).length) saveNeeded = true;
      }
      if (saveNeeded) {
        localStorage.setItem(STORAGE_KEYS.POWERUPS, JSON.stringify(inv));
      }
      return inv;
    },

    usePowerup(type) {
      const inv = this.getPowerups();
      if (inv[type] && inv[type] > 0) {
        inv[type]--;
        localStorage.setItem(STORAGE_KEYS.POWERUPS, JSON.stringify(inv));
        return true;
      }
      return false;
    },

    addPowerup(type, count = 1) {
      const inv = this.getPowerups();
      inv[type] = (inv[type] || 0) + count;
      localStorage.setItem(STORAGE_KEYS.POWERUPS, JSON.stringify(inv));
      return inv[type];
    },

    // Statistics
    getStats() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.STATS);
        return raw ? { ...DEFAULT_STATS, ...JSON.parse(raw) } : { ...DEFAULT_STATS };
      } catch (_) {
        return { ...DEFAULT_STATS };
      }
    },

    recordGameEnd(finalScore, linesCleared, maxCombo) {
      const stats = this.getStats();
      stats.gamesPlayed++;
      const powerups = this.getPowerups();
      if (window.FairPlay) {
        const result = window.FairPlay.milestoneKeys('blockblast', stats.gamesPlayed, powerups, SUPPLY_KEYS);
        if (result.granted) {
          localStorage.setItem(STORAGE_KEYS.POWERUPS, JSON.stringify(powerups));
        }
      }
      stats.totalLinesCleared += linesCleared;
      stats.highestCombo = Math.max(stats.highestCombo, maxCombo);
      stats.allTimeScore += finalScore;
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));

      // Coin rewards: bonus for milestones (per-line coins are already paid during the run)
      const coinsEarned = Math.floor(finalScore / 100);
      if (coinsEarned > 0) {
        this.addCoins(coinsEarned);
      }

      const isRecord = this.setHighScore(finalScore);
      return { isRecord, coinsEarned };
    }
  };

  window.Progress = Progress;
})(window);
