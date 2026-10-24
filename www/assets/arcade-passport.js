/**
 * arcade-passport.js — Unified Arcade Passport & Cross-Game Trophy Room
 * Priority 3 (P3) Portfolio Showcase Feature
 * 
 * Provides a zero-login, client-side IndexedDB & LocalStorage gamification layer
 * tracking cross-game achievements, speedrun badges, player ranks, and unlockable
 * CRT phosphor color themes across all 10 arcade games.
 */
(function(window) {
  'use strict';

  // Prevent duplicate instances
  if (window.ArcadePassport) return;

  const DB_NAME = 'BrandArcadePassportDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'passport_data';

  const ACHIEVEMENTS = [
    {
      id: 'first_coin',
      title: 'First Insert',
      icon: '🪙',
      desc: 'Inserted a coin credit or launched your first game session.',
      xp: 50
    },
    {
      id: 'speedrun_120',
      title: 'Sub-2m Speedrun',
      icon: '⚡',
      desc: 'Finished or cleared a game run in under 2 minutes (120s).',
      xp: 100
    },
    {
      id: 'arcade_triathlon',
      title: 'Arcade Triathlon',
      icon: '🏅',
      desc: 'Played at least one Blitz, one Break, and one Deep cart in a single day.',
      xp: 150
    },
    {
      id: 'streak_3',
      title: 'Streak Novice',
      icon: '🔥',
      desc: 'Achieved or maintained a 3-day daily mission streak.',
      xp: 150
    },
    {
      id: 'grandmaster',
      title: 'Cabinet Grandmaster',
      icon: '👑',
      desc: 'Played all 10 distinct arcade cartridges in the hub.',
      xp: 200
    },
    {
      id: 'daily_3star',
      title: 'Flawless Mission',
      icon: '⭐',
      desc: 'Earned 3 stars on a daily challenge run.',
      xp: 100
    },
    {
      id: 'dev_inspector',
      title: 'Reverse Engineer',
      icon: '🛠️',
      desc: 'Inspected engine telemetry via the Developer HUD (~ or Dev button).',
      xp: 50
    },
    {
      id: 'theme_collector',
      title: 'Phosphor Stylist',
      icon: '🎨',
      desc: 'Customized your arcade cabinet CRT phosphor color theme.',
      xp: 75
    }
  ];

  const THEMES = [
    {
      id: 'default',
      name: 'Cyberpunk Neon',
      desc: 'Default multi-color neon arcade glow',
      colors: ['#06b6d4', '#ec4899', '#facc15', '#10b981'],
      vars: {
        '--neon-cyan': '#06b6d4',
        '--neon-pink': '#ec4899',
        '--neon-yellow': '#facc15',
        '--neon-green': '#10b981',
        '--arcade-bezel': '#101726',
        '--arcade-border': '#1e293b'
      }
    },
    {
      id: 'gameboy',
      name: 'Game Boy DMG-01',
      desc: '1989 monochromatic 4-shade LCD phosphor green',
      colors: ['#8bac0f', '#9bbc0f', '#306230', '#0f380f'],
      vars: {
        '--neon-cyan': '#9bbc0f',
        '--neon-pink': '#8bac0f',
        '--neon-yellow': '#9bbc0f',
        '--neon-green': '#8bac0f',
        '--arcade-bezel': '#1b331b',
        '--arcade-border': '#306230'
      }
    },
    {
      id: 'amber',
      name: 'Amber Phosphor CRT',
      desc: '1982 IBM mainframe monochrome amber CRT glow',
      colors: ['#ffb000', '#ff9100', '#ffd060', '#cc7000'],
      vars: {
        '--neon-cyan': '#ffb000',
        '--neon-pink': '#ff8000',
        '--neon-yellow': '#ffd060',
        '--neon-green': '#ff9100',
        '--arcade-bezel': '#241400',
        '--arcade-border': '#4d2a00'
      }
    },
    {
      id: 'midnight',
      name: 'Midnight Synthwave',
      desc: 'Deep OLED blues with vibrant electric violet highlights',
      colors: ['#38bdf8', '#c084fc', '#818cf8', '#a78bfa'],
      vars: {
        '--neon-cyan': '#38bdf8',
        '--neon-pink': '#c084fc',
        '--neon-yellow': '#818cf8',
        '--neon-green': '#a78bfa',
        '--arcade-bezel': '#0b0f19',
        '--arcade-border': '#2e1065'
      }
    },
    {
      id: 'vectrex',
      name: 'Vectrex Vector',
      desc: '1982 vector-monitor lines on a dark tube',
      entitlement: 'arcade_crt_vectrex',
      productId: 'com.gamingempire.benchmarkarcade.arcade.crt.vectrex',
      colors: ['#d6fff6', '#7CFFCB', '#e8ffff', '#04120e'],
      vars: {
        '--neon-cyan': '#7CFFCB',
        '--neon-pink': '#d6fff6',
        '--neon-yellow': '#e8ffff',
        '--neon-green': '#9dffd8',
        '--arcade-bezel': '#04120e',
        '--arcade-border': '#1a3d32'
      }
    },
    {
      id: 'c64',
      name: 'Commodore 64',
      desc: '1982 breadbin blue with light-blue text',
      entitlement: 'arcade_crt_c64',
      productId: 'com.gamingempire.benchmarkarcade.arcade.crt.c64',
      colors: ['#6c5eb5', '#352879', '#aeadff', '#70a4b2'],
      vars: {
        '--neon-cyan': '#70a4b2',
        '--neon-pink': '#aeadff',
        '--neon-yellow': '#b8b8ff',
        '--neon-green': '#6c5eb5',
        '--arcade-bezel': '#352879',
        '--arcade-border': '#6c5eb5'
      }
    },
    {
      id: 'tron',
      name: 'Tron Grid',
      desc: 'Black glass and cyan grid light',
      entitlement: 'arcade_crt_tron',
      productId: 'com.gamingempire.benchmarkarcade.arcade.crt.tron',
      colors: ['#00fff6', '#0a0e17', '#7df9ff', '#ff2bd6'],
      vars: {
        '--neon-cyan': '#00fff6',
        '--neon-pink': '#ff2bd6',
        '--neon-yellow': '#7df9ff',
        '--neon-green': '#14f1d5',
        '--arcade-bezel': '#05070d',
        '--arcade-border': '#00fff6'
      }
    }
  ];

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function hasArcadeStore() {
    return !!(window.ArcadeStore && typeof window.ArcadeStore.owns === 'function');
  }

  const VALID_GAMES = [
    'blockblast', 'solitaire', 'sudoku', 'nonogram', 'minesweeper',
    'mahjong', 'codebreaker', 'wordsearch', 'spidersolitaire', 'spades'
  ];

  // Keyed FNV-1a integrity seal to prevent localStorage / IndexedDB / console tampering
  const PASSPORT_SEAL_SALT = 'ba_passport_v1_7c3a91e5';
  const DAILY_SEAL_SALT = 'ba_daily_v1_9f4e2c7a';

  function computeHash(salt, payload) {
    const str = salt + '|' + String(payload);
    let h1 = 0x811c9dc5;
    let h2 = 0x811c9dc5 ^ 0x5bd1e995;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193);
      h2 ^= (c + i);
      h2 = Math.imul(h2, 0x01000193);
    }
    return ((h1 >>> 0).toString(16).padStart(8, '0')) + ((h2 >>> 0).toString(16).padStart(8, '0'));
  }

  function computePassportSeal(payload) {
    return computeHash(PASSPORT_SEAL_SALT, payload);
  }

  function computeAchievementSeal(id, unlockedAt) {
    return computePassportSeal('ach:' + id + ':' + String(unlockedAt || ''));
  }

  function computeStateSeal(state) {
    if (!state || typeof state !== 'object') return '';
    const ach = state.achievements && typeof state.achievements === 'object' ? state.achievements : {};
    const achPart = Object.keys(ach).sort().map(id => {
      const row = ach[id] || {};
      return id + '@' + (row.unlockedAt || '') + '#' + (row._seal || '');
    }).join(',');
    const played = state.playedGames && typeof state.playedGames === 'object' ? state.playedGames : {};
    const playedPart = Object.keys(played).filter(g => VALID_GAMES.includes(g)).sort().map(g => {
      return g + ':' + (parseInt(played[g], 10) || 0);
    }).join(',');
    const tri = state.triathlon && typeof state.triathlon === 'object' ? state.triathlon : {};
    const vibes = Array.isArray(tri.vibes) ? tri.vibes.slice().sort().join(',') : '';
    const stats = state.stats && typeof state.stats === 'object' ? state.stats : {};
    return computePassportSeal([
      achPart,
      playedPart,
      (tri.date || '') + ':' + vibes,
      (parseInt(stats.totalSessions, 10) || 0),
      (parseInt(stats.totalSeconds, 10) || 0),
      (stats.bestSpeedrunSec == null ? 'null' : Number(stats.bestSpeedrunSec)),
      state.coinInserted ? '1' : '0'
    ].join('|'));
  }

  function computeVerifiedXP(achievements) {
    if (!achievements || typeof achievements !== 'object') return 0;
    let total = 0;
    ACHIEVEMENTS.forEach(ach => {
      const entry = achievements[ach.id];
      if (entry && entry.unlocked === true && entry._seal === computeAchievementSeal(ach.id, entry.unlockedAt)) {
        total += ach.xp;
      }
    });
    return total;
  }

  class ArcadePassportManager {
    constructor() {
      this.db = null;
      this.state = this.loadLocalBackup();
      this._previewId = null;
      this._rendering = false;
      this._storeNote = '';
      this.initDB();
      this.reconcileTheme();
      if (hasArcadeStore() && typeof window.ArcadeStore.on === 'function') {
        window.ArcadeStore.on('change', () => this.onStoreChange());
      }
    }

    // Default passport state schema
    getDefaultState() {
      const base = {
        xp: 0,
        theme: 'default',
        achievements: {},
        playedGames: {},
        triathlon: {
          date: '',
          vibes: []
        },
        stats: {
          totalSessions: 0,
          totalSeconds: 0,
          bestSpeedrunSec: null
        }
      };
      base._seal = computeStateSeal(base);
      return base;
    }

    getVerifiedStreak() {
      try {
        if (window.ArcadeDaily && typeof window.ArcadeDaily.computeVerifiedStreak === 'function') {
          const s = window.ArcadeDaily.computeVerifiedStreak();
          if (s > 0) return s;
        }
        const rawStreak = parseInt(localStorage.getItem('arcade_daily_streak') || '0', 10) || 0;
        const lastDate = localStorage.getItem('arcade_last_daily_completed') || '';
        const streakSeal = localStorage.getItem('arcade_daily_streak_seal') || '';
        if (rawStreak > 0 && lastDate && streakSeal === computeHash(DAILY_SEAL_SALT, `streak:${lastDate}:${rawStreak}`)) {
          return rawStreak;
        }
        const visitStreak = parseInt(localStorage.getItem('arcade_streak_days') || '0', 10) || 0;
        const visitDate = localStorage.getItem('arcade_last_visit_date') || '';
        const visitSeal = localStorage.getItem('arcade_streak_days_seal') || '';
        if (visitStreak > 0 && visitDate && visitSeal === computePassportSeal(`visit:${visitDate}:${visitStreak}`)) {
          return visitStreak;
        }
      } catch (e) {}
      return 0;
    }

    hasVerifiedDailyThreeStar() {
      try {
        if (window.ArcadeDaily && typeof window.ArcadeDaily.getHistory === 'function') {
          const hist = window.ArcadeDaily.getHistory();
          return Object.keys(hist).some(k => hist[k] && Number(hist[k].stars) >= 3);
        }
        const raw = JSON.parse(localStorage.getItem('arcade_daily_history') || '{}');
        return Object.keys(raw).some(k => {
          const rec = raw[k];
          if (!rec || rec.date !== k || Number(rec.stars) < 3) return false;
          const expected = computeHash(DAILY_SEAL_SALT, [
            rec.date, rec.dayNumber, rec.gameId,
            Number(rec.score) || 0, Number(rec.timeSeconds) || 0, Number(rec.stars) || 0
          ].join(':'));
          return rec._seal === expected;
        });
      } catch (e) {
        return false;
      }
    }

    meetsPreconditions(id, state, isRuntimeUnlock = false) {
      const s = state || this.state;
      if (!s || typeof s !== 'object') return false;
      const played = s.playedGames && typeof s.playedGames === 'object' ? s.playedGames : {};
      const validPlayed = Object.keys(played).filter(g => VALID_GAMES.includes(g) && played[g] >= 1);
      const stats = s.stats || {};
      const tri = s.triathlon || {};

      switch (id) {
        case 'first_coin':
          return (stats.totalSessions >= 1) && (validPlayed.length >= 1 || !!s.coinInserted);
        case 'speedrun_120':
          return (!isRuntimeUnlock || !!this._activeWinProof) &&
            Number.isFinite(stats.bestSpeedrunSec) &&
            stats.bestSpeedrunSec >= 3 &&
            stats.bestSpeedrunSec <= 120;
        case 'arcade_triathlon':
          return Array.isArray(tri.vibes) &&
            ['blitz', 'coffee', 'deep'].every(v => tri.vibes.includes(v));
        case 'streak_3':
          return this.getVerifiedStreak() >= 3;
        case 'grandmaster':
          return validPlayed.length >= 10;
        case 'daily_3star':
          return (!isRuntimeUnlock || !!this._activeWinProof) && this.hasVerifiedDailyThreeStar();
        case 'dev_inspector':
          if (!isRuntimeUnlock) return true;
          return !!(this._inspectorOpenedProof || (window.ArcadeInspector && window.ArcadeInspector.isOpen));
        case 'theme_collector':
          if (!isRuntimeUnlock) return true;
          return !!this._themeAppliedProof;
        default:
          return false;
      }
    }

    // Verify integrity seal and scrub any forged achievements, XP, or stats
    sanitizeState(candidate) {
      if (!candidate || typeof candidate !== 'object') {
        return this.getDefaultState();
      }
      const expectedSeal = computeStateSeal(candidate);
      const sealValid = typeof candidate._seal === 'string' && candidate._seal === expectedSeal;
      if (!sealValid) {
        // State was manually edited in localStorage / IndexedDB or lacks a valid seal.
        // Preserve only theme preference and reset unverified progress/achievements.
        const clean = this.getDefaultState();
        if (typeof candidate.theme === 'string' && THEMES.some(t => t.id === candidate.theme)) {
          clean.theme = candidate.theme;
        }
        return clean;
      }

      const verifiedAch = {};
      const rawAch = candidate.achievements && typeof candidate.achievements === 'object' ? candidate.achievements : {};
      Object.keys(rawAch).forEach(id => {
        const entry = rawAch[id];
        if (!ACHIEVEMENTS.some(a => a.id === id)) return;
        if (!entry || entry.unlocked !== true) return;
        if (entry._seal !== computeAchievementSeal(id, entry.unlockedAt)) return;
        if (!this.meetsPreconditions(id, candidate, false)) return;
        verifiedAch[id] = {
          unlocked: true,
          unlockedAt: entry.unlockedAt,
          _seal: entry._seal
        };
      });

      const cleanPlayed = {};
      if (candidate.playedGames && typeof candidate.playedGames === 'object') {
        Object.keys(candidate.playedGames).forEach(g => {
          if (VALID_GAMES.includes(g) && Number(candidate.playedGames[g]) >= 1) {
            cleanPlayed[g] = Math.floor(Number(candidate.playedGames[g]));
          }
        });
      }

      const next = {
        xp: computeVerifiedXP(verifiedAch),
        theme: typeof candidate.theme === 'string' ? candidate.theme : 'default',
        achievements: verifiedAch,
        playedGames: cleanPlayed,
        coinInserted: !!candidate.coinInserted,
        triathlon: {
          date: (candidate.triathlon && typeof candidate.triathlon.date === 'string') ? candidate.triathlon.date : '',
          vibes: (candidate.triathlon && Array.isArray(candidate.triathlon.vibes))
            ? candidate.triathlon.vibes.filter(v => ['blitz', 'coffee', 'deep'].includes(v))
            : []
        },
        stats: {
          totalSessions: Math.max(0, Math.floor(Number(candidate.stats && candidate.stats.totalSessions) || 0)),
          totalSeconds: Math.max(0, Math.floor(Number(candidate.stats && candidate.stats.totalSeconds) || 0)),
          bestSpeedrunSec: (candidate.stats && Number.isFinite(candidate.stats.bestSpeedrunSec) && candidate.stats.bestSpeedrunSec >= 3 && candidate.stats.bestSpeedrunSec <= 120)
            ? Number(candidate.stats.bestSpeedrunSec)
            : null
        }
      };
      next._seal = computeStateSeal(next);
      return next;
    }

    reconcileIntegrity() {
      const verifiedAch = {};
      const rawAch = (this.state && this.state.achievements) || {};
      Object.keys(rawAch).forEach(id => {
        const entry = rawAch[id];
        if (
          entry &&
          entry.unlocked === true &&
          entry._seal === computeAchievementSeal(id, entry.unlockedAt) &&
          this.meetsPreconditions(id, this.state, false)
        ) {
          verifiedAch[id] = entry;
        }
      });
      this.state.achievements = verifiedAch;
      this.state.xp = computeVerifiedXP(verifiedAch);
      this.state._seal = computeStateSeal(this.state);
    }

    // Fast local backup for instant synchronous page loads
    loadLocalBackup() {
      try {
        const raw = localStorage.getItem('arcade_passport_state');
        if (raw) {
          return this.sanitizeState(JSON.parse(raw));
        }
      } catch (e) {
        console.warn('Passport local storage read error:', e);
      }
      return this.getDefaultState();
    }

    saveLocalBackup() {
      try {
        this.reconcileIntegrity();
        localStorage.setItem('arcade_passport_state', JSON.stringify(this.state));
        this.saveToIndexedDB();
        this.updateHeaderBadges();
      } catch (e) {
        console.warn('Passport save error:', e);
      }
    }

    // Initialize IndexedDB with versioned schema
    initDB() {
      if (!window.indexedDB) return;

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        this.syncFromIndexedDB();
      };

      request.onerror = (e) => {
        console.warn('IndexedDB unavailable, falling back to LocalStorage:', e);
      };
    }

    saveToIndexedDB() {
      if (!this.db) return;
      try {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ id: 'primary_passport', ...this.state });
      } catch (e) {
        console.warn('IndexedDB write error:', e);
      }
    }

    syncFromIndexedDB() {
      if (!this.db) return;
      try {
        const tx = this.db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get('primary_passport');
        req.onsuccess = () => {
          if (req.result) {
            const candidate = Object.assign({}, req.result);
            delete candidate.id;
            const sanitized = this.sanitizeState(candidate);
            if (sanitized.xp > this.state.xp) {
              this.state = sanitized;
              this.saveLocalBackup();
              this.reconcileTheme();
            }
          }
        };
      } catch (e) {
        console.warn('IndexedDB sync error:', e);
      }
    }

    // Experience Points & Player Rank Computation (always derived from verified achievements)
    getPlayerLevel() {
      this.reconcileIntegrity();
      const xp = this.state.xp || 0;
      if (xp >= 750) return { level: 5, title: 'Arcade Legend', nextXP: null, progress: 100 };
      if (xp >= 500) return { level: 4, title: 'High Roller', nextXP: 750, progress: Math.round(((xp - 500) / 250) * 100) };
      if (xp >= 300) return { level: 3, title: 'Token Master', nextXP: 500, progress: Math.round(((xp - 300) / 200) * 100) };
      if (xp >= 150) return { level: 2, title: 'Quarter Dropper', nextXP: 300, progress: Math.round(((xp - 150) / 150) * 100) };
      return { level: 1, title: 'Rookie Operator', nextXP: 150, progress: Math.round((xp / 150) * 100) };
    }

    // Unlock an achievement with XP and toast notification (requires verified preconditions)
    unlockAchievement(id) {
      this.reconcileIntegrity();
      if (this.state.achievements[id]) return false; // Already unlocked

      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (!ach) return false;
      if (!this.meetsPreconditions(id, this.state, true)) {
        return false;
      }

      const unlockedAt = new Date().toISOString();
      this.state.achievements[id] = {
        unlocked: true,
        unlockedAt: unlockedAt,
        _seal: computeAchievementSeal(id, unlockedAt)
      };

      this.saveLocalBackup();
      this.updateHeaderBadges();

      const modal = document.getElementById('modal-passport');
      if (modal && modal.classList && modal.classList.contains('active')) {
        this.renderModalContent();
      }

      this.showUnlockToast(ach);
      this.playUnlockSound();
      return true;
    }

    isUnlocked(id) {
      const entry = this.state.achievements && this.state.achievements[id];
      if (!entry || entry.unlocked !== true) return false;
      if (entry._seal !== computeAchievementSeal(id, entry.unlockedAt)) return false;
      return this.meetsPreconditions(id, this.state, false);
    }

    getUnlockedCount() {
      this.reconcileIntegrity();
      return Object.keys(this.state.achievements).length;
    }

    // Record game sessions and automatically evaluate achievements
    recordPlay(gameId, durationSec = 0, score = 0, isDaily = false, vibe = null, completed = false) {
      if (!VALID_GAMES.includes(gameId)) return;
      this.state.stats.totalSessions += 1;
      if (durationSec > 0) {
        this.state.stats.totalSeconds += Math.floor(Number(durationSec) || 0);
      }

      // Track played cabinets
      this.state.playedGames[gameId] = (this.state.playedGames[gameId] || 0) + 1;

      // Achievement: First coin / play
      this.unlockAchievement('first_coin');

      // Achievement: Sub-2m Speedrun (120s) — only when a round is actually completed in >= 3s
      if (completed && durationSec >= 3 && durationSec <= 120) {
        this._activeWinProof = true;
        if (!this.state.stats.bestSpeedrunSec || durationSec < this.state.stats.bestSpeedrunSec) {
          this.state.stats.bestSpeedrunSec = Math.round(durationSec);
        }
        this.unlockAchievement('speedrun_120');
        this._activeWinProof = false;
      }

      // Achievement: Daily 3-Star Flawless Mission
      if (completed && isDaily) {
        this._activeWinProof = true;
        this.unlockAchievement('daily_3star');
        this._activeWinProof = false;
      }

      // Achievement: Grandmaster (all 10 cabinets played)
      const uniquePlayed = Object.keys(this.state.playedGames).filter(g => VALID_GAMES.includes(g)).length;
      if (uniquePlayed >= 10) {
        this.unlockAchievement('grandmaster');
      }

      // Achievement: Triathlon evaluation
      const todayStr = new Date().toISOString().slice(0, 10);
      if (this.state.triathlon.date !== todayStr) {
        this.state.triathlon = { date: todayStr, vibes: [] };
      }
      if (vibe && ['blitz', 'coffee', 'deep'].includes(vibe) && !this.state.triathlon.vibes.includes(vibe)) {
        this.state.triathlon.vibes.push(vibe);
      }
      if (
        this.state.triathlon.vibes.includes('blitz') &&
        this.state.triathlon.vibes.includes('coffee') &&
        this.state.triathlon.vibes.includes('deep')
      ) {
        this.unlockAchievement('arcade_triathlon');
      }

      // Achievement: Streak (requires verified streak >= 3)
      if (this.getVerifiedStreak() >= 3) {
        this.unlockAchievement('streak_3');
      }

      this.saveLocalBackup();
    }

    // Record a completed game win for speedrun, daily 3-star, and streak trophies
    recordWin(gameId, durationSec = 60, score = 0, isDaily = false, stars = 3) {
      if (gameId && !VALID_GAMES.includes(gameId)) return;
      const elapsed = Math.round(Number(durationSec) || 0);
      if (elapsed < 3) return; // Reject impossible <3s console-triggered wins
      this.state.stats.totalSeconds += elapsed;
      if (gameId) {
        this.state.stats.totalSessions = Math.max(1, this.state.stats.totalSessions || 0);
        this.state.playedGames[gameId] = Math.max(1, this.state.playedGames[gameId] || 0);
      }
      this._activeWinProof = true;
      try {
        if (elapsed <= 120) {
          if (!this.state.stats.bestSpeedrunSec || elapsed < this.state.stats.bestSpeedrunSec) {
            this.state.stats.bestSpeedrunSec = elapsed;
          }
          this.unlockAchievement('speedrun_120');
        }
        if (isDaily && stars >= 3) {
          this.unlockAchievement('daily_3star');
        }
        if (this.getVerifiedStreak() >= 3) {
          this.unlockAchievement('streak_3');
        }
      } finally {
        this._activeWinProof = false;
      }
      this.saveLocalBackup();
    }

    notifyInspectorOpened() {
      this._inspectorOpenedProof = true;
      try {
        this.unlockAchievement('dev_inspector');
      } finally {
        this._inspectorOpenedProof = false;
      }
    }

    notifyCoinInserted() {
      this.state.stats.totalSessions = Math.max(1, (this.state.stats.totalSessions || 0) + 1);
      this.state.coinInserted = true;
      this.unlockAchievement('first_coin');
      this.saveLocalBackup();
    }

    canUseTheme(theme) {
      if (!theme) return false;
      if (!theme.entitlement) return true;
      return hasArcadeStore() && window.ArcadeStore.owns(theme.entitlement);
    }

    // Paint phosphor colors. A Patron gold bezel is applied after the theme
    // so the thank-you frame stays visible on every phosphor.
    paintTheme(theme) {
      const rootEl = document.documentElement;
      Object.entries(theme.vars).forEach(([key, val]) => {
        rootEl.style.setProperty(key, val);
      });
      if (document.body) {
        document.body.setAttribute('data-crt-theme', theme.id);
      }
      this.applyPatronBezel();
    }

    applyPatronBezel() {
      const rootEl = document.documentElement;
      const patron = hasArcadeStore() && window.ArcadeStore.owns('arcade_patron');
      if (patron && window.ArcadeStore.PATRON_BEZEL) {
        rootEl.style.setProperty('--arcade-bezel', window.ArcadeStore.PATRON_BEZEL);
        rootEl.style.setProperty('--arcade-border', window.ArcadeStore.PATRON_BORDER);
        rootEl.setAttribute('data-arcade-patron', '1');
      } else {
        rootEl.removeAttribute('data-arcade-patron');
      }
      const chip = document.getElementById('arcade-patron-chip');
      if (chip) chip.hidden = !patron;
    }

    // Keep a saved premium theme when this page has no store (game webviews).
    // On the hub, a theme the player does not own falls back to the free default.
    reconcileTheme() {
      const saved = THEMES.find(t => t.id === (this.state.theme || 'default'));
      if (saved && saved.entitlement && !hasArcadeStore()) {
        this.paintTheme(THEMES[0]);
        return;
      }
      if (!saved || !this.canUseTheme(saved)) {
        this.state.theme = 'default';
        this.applyTheme('default', false);
        return;
      }
      this.applyTheme(saved.id, false);
    }

    onStoreChange() {
      this.reconcileTheme();
      const modal = document.getElementById('modal-passport');
      if (modal && modal.open && !this._rendering) this.renderModalContent();
    }

    previewTheme(themeId) {
      const theme = THEMES.find(t => t.id === themeId);
      if (!theme) return false;
      this._previewId = theme.id;
      this.paintTheme(theme);
      return true;
    }

    restoreAppliedLook() {
      this._previewId = null;
      this.reconcileTheme();
    }

    // Switch CRT theme across document. Locked premium themes are refused.
    applyTheme(themeId, notify = true) {
      const theme = THEMES.find(t => t.id === themeId);
      if (!theme || !this.canUseTheme(theme)) return false;
      this._previewId = null;
      this.state.theme = theme.id;
      this.saveLocalBackup();
      this.paintTheme(theme);

      if (notify) {
        this._themeAppliedProof = true;
        try {
          this.unlockAchievement('theme_collector');
        } finally {
          this._themeAppliedProof = false;
        }
        this.playClickSound();
      }
      return true;
    }

    storePriceLabel(productId) {
      if (!hasArcadeStore() || typeof window.ArcadeStore.getPrice !== 'function') return 'Unavailable';
      const price = window.ArcadeStore.getPrice(productId);
      return price ? escapeHtml(price) : 'Unavailable';
    }

    storeResultMessage(result) {
      if (result && result.ok) return 'Purchases restored.';
      if (result && result.reason === 'cancelled') return 'Purchase cancelled.';
      if (result && result.reason === 'unavailable') {
        return 'This extra is unavailable here. The website and every game stay free.';
      }
      return 'That could not be completed.';
    }

    // Procedural 8-bit celebratory sound FX using Web Audio API
    playUnlockSound() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 major arpeggio
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          gain.gain.setValueAtTime(0, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.26);
        });
      } catch (e) {
        // Audio policy ignore
      }
    }

    playClickSound() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
      } catch (e) {}
    }

    // High-impact golden unlock toast notification
    showUnlockToast(ach) {
      let toast = document.getElementById('passport-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'passport-toast';
        Object.assign(toast.style, {
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: '9999999',
          background: 'linear-gradient(135deg, #090e1a 0%, #172033 100%)',
          border: '2px solid #facc15',
          borderRadius: '8px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 24px rgba(250, 204, 21, 0.4)',
          transform: 'translateX(120%)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          fontFamily: "'Chakra Petch', system-ui, sans-serif",
          color: '#ffffff',
          pointerEvents: 'none'
        });
        document.body.appendChild(toast);
      }

      toast.innerHTML = `
        <div style="font-size: 2.2rem; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: rgba(250, 204, 21, 0.15); border: 1.5px solid #facc15; border-radius: 6px;">
          ${ach.icon}
        </div>
        <div>
          <div style="font-size: 0.7rem; color: #facc15; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">
            🏆 TROPHY UNLOCKED (+${ach.xp} XP)
          </div>
          <div style="font-size: 1.05rem; font-weight: 800; color: #ffffff; letter-spacing: 0.04em;">
            ${ach.title}
          </div>
          <div style="font-size: 0.76rem; color: #94a3b8; font-family: 'Space Mono', monospace;">
            ${ach.desc}
          </div>
        </div>
      `;

      toast.style.transform = 'translateX(0)';

      setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
      }, 4500);
    }

    devUnlockBadge() {
      const on = window.ARCADE_DEV_UNLOCK_ALL === true ||
        (hasArcadeStore() && typeof window.ArcadeStore.devUnlockAll === 'function' && window.ArcadeStore.devUnlockAll());
      if (!on) return '';
      return '<span data-dev-unlock="1" style="display:inline-block;margin-left:8px;padding:2px 7px;border-radius:999px;background:#7f1d1d;color:#fecaca;font-family:var(--font-arcade);font-size:0.62rem;letter-spacing:0.08em;vertical-align:middle;">DEV UNLOCK</span>';
    }

    updateHeaderBadges() {
      const badge = document.getElementById('passport-trophy-count');
      if (badge) {
        badge.textContent = `${this.getUnlockedCount()}/${ACHIEVEMENTS.length}`;
      }
    }

    // Modal UI Renderer
    renderModalContent() {
      const modal = document.getElementById('modal-passport');
      if (!modal) return;
      this._rendering = true;

      const levelInfo = this.getPlayerLevel();
      const unlockedCount = this.getUnlockedCount();
      const progressPercent = Math.round((unlockedCount / ACHIEVEMENTS.length) * 100);

      const html = `
        <div class="modal-head-retro">
          <div class="modal-title-retro">
            <span>🎖️</span> <span>ARCADE PASSPORT & TROPHY ROOM</span>${this.devUnlockBadge()}
          </div>
          <button class="modal-close-retro" type="button" data-close="modal-passport">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 18px; max-height: 75vh; overflow-y: auto; padding-right: 4px;">
          
          <!-- Level & Rank Banner -->
          <div style="background: linear-gradient(135deg, #090e1a 0%, #162035 100%); border: 1.5px solid var(--neon-yellow); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 0 20px rgba(250, 204, 21, 0.15);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <span style="font-family: var(--font-arcade); font-size: 0.72rem; color: var(--neon-yellow); font-weight: 700; letter-spacing: 0.08em;">OPERATOR IDENTITY</span>
                <h3 style="font-family: var(--font-arcade); font-size: 1.35rem; font-weight: 800; color: #ffffff; margin: 2px 0 0 0; letter-spacing: 0.04em;">
                  LEVEL ${levelInfo.level}: ${levelInfo.title}
                </h3>
              </div>
              <div style="text-align: right;">
                <span style="font-family: var(--font-mono); font-size: 1.15rem; font-weight: 700; color: var(--neon-yellow);">
                  ${this.state.xp || 0} XP
                </span>
                <div style="font-family: var(--font-arcade); font-size: 0.72rem; color: #94a3b8;">
                  ${levelInfo.nextXP ? `${levelInfo.nextXP - (this.state.xp || 0)} XP TO LEVEL ${levelInfo.level + 1}` : 'MAX LEVEL ACHIEVED'}
                </div>
              </div>
            </div>

            <!-- XP Bar -->
            <div style="width: 100%; height: 8px; background: #090e1a; border: 1px solid #334155; border-radius: 9999px; overflow: hidden;">
              <div style="width: ${levelInfo.progress}%; height: 100%; background: linear-gradient(90deg, #facc15 0%, #10b981 100%); border-radius: 9999px; transition: width 0.4s ease;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; font-family: var(--font-arcade); font-size: 0.75rem; color: #94a3b8;">
              <span>TROPHIES: <strong style="color: #ffffff;">${unlockedCount} / ${ACHIEVEMENTS.length} (${progressPercent}%)</strong></span>
              <span>PLAYED: <strong style="color: #ffffff;">${this.state.stats.totalSessions} SESSIONS</strong></span>
            </div>
          </div>

          ${this.renderPatronRow()}
          ${this.renderSupporterStamp()}

          <!-- Trophy Matrix (8 Badges) -->
          <div>
            <div style="font-family: var(--font-arcade); font-size: 0.82rem; font-weight: 700; color: #ffffff; letter-spacing: 0.08em; margin-bottom: 10px; display: flex; justify-content: space-between;">
              <span>CROSS-GAME ACHIEVEMENTS:</span>
              <span style="color: var(--neon-cyan); font-family: var(--font-mono); font-size: 0.75rem;">ZERO-LOGIN INDEXEDDB SYNC</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px;">
              ${ACHIEVEMENTS.map(ach => {
                const unlocked = this.isUnlocked(ach.id);
                return `
                  <div style="
                    background: ${unlocked ? 'rgba(15, 23, 42, 0.85)' : 'rgba(10, 15, 26, 0.5)'};
                    border: 1.5px solid ${unlocked ? 'var(--neon-yellow)' : '#1e293b'};
                    border-radius: 6px;
                    padding: 12px;
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    position: relative;
                    box-shadow: ${unlocked ? '0 0 14px rgba(250, 204, 21, 0.15)' : 'none'};
                    filter: ${unlocked ? 'none' : 'grayscale(0.85) opacity(0.65)'};
                  ">
                    <div style="
                      font-size: 1.8rem;
                      width: 44px;
                      height: 44px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      background: ${unlocked ? 'rgba(250, 204, 21, 0.15)' : '#0f172a'};
                      border: 1px solid ${unlocked ? '#facc15' : '#334155'};
                      border-radius: 6px;
                      flex-shrink: 0;
                    ">
                      ${unlocked ? ach.icon : '🔒'}
                    </div>
                    <div>
                      <div style="font-family: var(--font-arcade); font-size: 0.82rem; font-weight: 700; color: ${unlocked ? '#ffffff' : '#64748b'};">
                        ${ach.title}
                      </div>
                      <div style="font-size: 0.7rem; color: #94a3b8; line-height: 1.35; margin-top: 2px;">
                        ${ach.desc}
                      </div>
                      <div style="font-family: var(--font-mono); font-size: 0.68rem; color: var(--neon-yellow); margin-top: 4px; font-weight: 700;">
                        ${unlocked ? '✓ UNLOCKED' : `+${ach.xp} XP`}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- CRT Phosphor Theme Selector -->
          <div style="border-top: 1px solid var(--arcade-border); padding-top: 14px;">
            <div style="font-family: var(--font-arcade); font-size: 0.82rem; font-weight: 700; color: #ffffff; letter-spacing: 0.08em; margin-bottom: 6px;">
              <span>CRT PHOSPHOR THEMES:</span>
            </div>
            <p style="font-size: 0.75rem; color: #94a3b8; margin: 0 0 10px 0;">
              Four phosphors are free. Vectrex Vector, Commodore 64, and Tron Grid are optional one-time cabinet extras. XP and trophies are never for sale.
            </p>
            ${this._previewId ? `<p style="font-size: 0.75rem; color: var(--neon-cyan); margin: 0 0 10px 0;">Previewing ${escapeHtml((THEMES.find(t => t.id === this._previewId) || {}).name || '')}. Close the passport to return to the equipped phosphor.</p>` : ''}

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px;">
              ${THEMES.map(t => this.renderThemeCard(t)).join('')}
            </div>
          </div>

          <!-- Backup & Reset Actions -->
          <div style="border-top: 1px solid var(--arcade-border); padding-top: 14px; display: flex; gap: 10px;">
            <button type="button" id="btn-export-passport" class="btn-push-play" style="flex: 1; justify-content: center; font-size: 0.82rem;">
              <span>💾</span> BACKUP PASSPORT TO CLIPBOARD
            </button>
            <button type="button" id="btn-reset-passport" class="btn-push-sub" style="flex: 1; justify-content: center; font-size: 0.82rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" title="Reset all achievements back to 0/8">
              <span>🔄</span> RESET (0/8)
            </button>
          </div>
          <p style="font-size: 0.75rem; color: #94a3b8; margin: 0;">Purchases and restore live on the <a href="shop.html">Arcade Shop</a>. This passport does not sell anything.</p>
        </div>
      `;

      modal.innerHTML = html;

      // Bind close buttons
      modal.querySelectorAll('[data-close="modal-passport"]').forEach(btn => {
        btn.addEventListener('click', () => modal.close());
      });

      // Bind theme selector buttons
      modal.querySelectorAll('.btn-select-crt-theme').forEach(btn => {
        btn.addEventListener('click', () => {
          const tId = btn.getAttribute('data-theme');
          this.applyTheme(tId, true);
          this.renderModalContent();
        });
      });

      modal.querySelectorAll('.btn-preview-crt').forEach(btn => {
        btn.addEventListener('click', () => {
          this.previewTheme(btn.getAttribute('data-theme'));
          this.renderModalContent();
        });
      });

      // Bind backup button
      const exportBtn = modal.querySelector('#btn-export-passport');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          const exportStr = JSON.stringify(this.state, null, 2);
          navigator.clipboard.writeText(exportStr).then(() => {
            alert('Arcade Passport data copied to clipboard!');
          });
        });
      }

      // Bind reset button
      const resetBtn = modal.querySelector('#btn-reset-passport');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (confirm('Reset your Arcade Passport achievements back to 0/8?')) {
            this.resetPassport();
          }
        });
      }
      this._rendering = false;
    }

    renderSupporterStamp() {
      const store = hasArcadeStore() ? window.ArcadeStore : null;
      const tier = store && typeof store.supporterTier === 'function' ? store.supporterTier() : null;
      if (!tier) {
        return `
          <div style="background: #090e1a; border: 1.5px dashed #334155; border-radius: 8px; padding: 12px;">
            <div style="font-family: var(--font-arcade); font-size: 0.78rem; color: #94a3b8;">SUPPORTER STAMP</div>
            <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.4; margin-top: 4px;">Tips add a thank-you stamp here. The stamp grants 0 XP and does not change gameplay. The tip jar is on the <a href="shop.html#shop-tips">Arcade Shop</a>.</div>
          </div>
        `;
      }
      return `
        <div data-supporter-stamp="${escapeHtml(tier.id)}" style="background: linear-gradient(135deg, #142033 0%, #090e1a 100%); border: 1.5px solid #7dd3fc; border-radius: 8px; padding: 14px; display: flex; gap: 12px; align-items: center;">
          <div style="font-size: 1.6rem; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border: 1px dashed #7dd3fc; border-radius: 50%;">☕</div>
          <div>
            <div style="font-family: var(--font-arcade); font-size: 0.9rem; font-weight: 800; color: #e0f2fe;">${escapeHtml(tier.name.toUpperCase())}</div>
            <div style="font-size: 0.75rem; color: #bae6fd; line-height: 1.4; margin-top: 2px;">${tier.count} thank-you ${tier.count === 1 ? 'tip' : 'tips'}. This stamp grants 0 XP and changes nothing about play.</div>
          </div>
        </div>
      `;
    }

    renderPatronRow() {
      const catalog = (hasArcadeStore() && window.ArcadeStore.CATALOG) || [];
      const patron = catalog.find(item => item.kind === 'patron') || {
        productId: 'com.gamingempire.benchmarkarcade.arcade.patron',
        entitlementId: 'arcade_patron',
        name: 'Arcade Patron'
      };
      const owned = hasArcadeStore() && window.ArcadeStore.owns(patron.entitlementId);
      if (owned) {
        return `
          <div style="background: linear-gradient(135deg, #3d2b08 0%, #090e1a 100%); border: 1.5px solid #e6b325; border-radius: 8px; padding: 14px; display: flex; gap: 12px; align-items: center;">
            <div style="font-size: 1.8rem; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: rgba(230, 179, 37, 0.18); border: 1px solid #e6b325; border-radius: 6px;">🏅</div>
            <div>
              <div style="font-family: var(--font-arcade); font-size: 0.9rem; font-weight: 800; color: #e6b325;">ARCADE PATRON</div>
              <div style="font-size: 0.75rem; color: #f8e7b0; line-height: 1.4; margin-top: 2px;">Thank you for keeping the marquee lit. This badge is a thank-you, not a trophy — 0 XP. Your cabinet bezel is gold.</div>
            </div>
          </div>
        `;
      }
      return `
        <div style="background: #090e1a; border: 1.5px solid #1e293b; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-family: var(--font-arcade); font-size: 0.9rem; font-weight: 800; color: #e6b325;">ARCADE PATRON</div>
          <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.4;">A one-time thank-you. It adds this badge and a gold cabinet bezel. It grants 0 XP and does not unlock trophies. Buy it on the <a href="shop.html#shop-patron">Arcade Shop</a>.</div>
        </div>
      `;
    }

    renderThemeCard(theme) {
      const active = !this._previewId && (this.state.theme || 'default') === theme.id;
      const previewing = this._previewId === theme.id;
      const unlocked = this.canUseTheme(theme);
      const border = active || previewing ? 'var(--neon-cyan)' : '#1e293b';
      const actions = unlocked
        ? `<button type="button" class="btn-select-crt-theme btn-push-sub" data-theme="${theme.id}" style="justify-content: center; font-size: 0.75rem;">${active ? 'EQUIPPED' : 'USE THIS PHOSPHOR'}</button>`
        : `<div style="display: flex; gap: 6px;">
            <button type="button" class="btn-preview-crt btn-push-sub" data-theme="${theme.id}" style="flex: 1; justify-content: center; font-size: 0.75rem;">PREVIEW</button>
            <a href="shop.html#shop-${escapeHtml(theme.id)}" style="flex: 1; text-align: center; font-size: 0.75rem; color: #e6b325; align-self: center;">Arcade Shop</a>
          </div>`;
      const badge = active
        ? '<span style="color: var(--neon-cyan); font-size: 0.72rem; font-weight: 700;">ACTIVE</span>'
        : (previewing
          ? '<span style="color: var(--neon-yellow); font-size: 0.72rem; font-weight: 700;">PREVIEW</span>'
          : (unlocked ? '<span style="color: #64748b; font-size: 0.72rem; font-weight: 700;">FREE</span>' : '<span style="color: #e6b325; font-size: 0.72rem; font-weight: 700;">SHOP</span>'));
      return `
        <div style="background: ${active ? 'rgba(6, 182, 212, 0.15)' : '#090e1a'}; border: 1.5px solid ${border}; border-radius: 6px; padding: 12px; text-align: left; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 8px;">
            <span style="font-family: var(--font-arcade); font-size: 0.85rem; font-weight: 700; color: ${active ? '#ffffff' : '#94a3b8'};">${escapeHtml(theme.name)}</span>
            ${badge}
          </div>
          <div style="display: flex; gap: 6px; margin: 2px 0;">
            ${theme.colors.map(c => `<div style="width: 14px; height: 14px; border-radius: 3px; background: ${c}; border: 1px solid rgba(255,255,255,0.2);"></div>`).join('')}
          </div>
          <div style="font-size: 0.72rem; color: #64748b;">${escapeHtml(theme.desc)}</div>
          ${actions}
        </div>
      `;
    }

    buyProduct(productId, themeId) {
      if (!hasArcadeStore()) {
        this._storeNote = this.storeResultMessage({ reason: 'unavailable' });
        this.renderModalContent();
        return;
      }
      window.ArcadeStore.purchase(productId).then(result => {
        if (result && result.ok && themeId) this.applyTheme(themeId, true);
        this._storeNote = result && result.ok ? '' : this.storeResultMessage(result);
        this.applyPatronBezel();
        this.renderModalContent();
      }).catch(() => {
        this._storeNote = this.storeResultMessage({ reason: 'failed' });
        this.renderModalContent();
      });
    }

    restorePurchases() {
      if (!hasArcadeStore()) {
        this._storeNote = this.storeResultMessage({ reason: 'unavailable' });
        this.renderModalContent();
        return;
      }
      window.ArcadeStore.restore().then(result => {
        this._storeNote = this.storeResultMessage(result);
        this.reconcileTheme();
        this.renderModalContent();
      }).catch(() => {
        this._storeNote = this.storeResultMessage({ reason: 'failed' });
        this.renderModalContent();
      });
    }

    resetPassport() {
      // Passport only. Purchases stay in arcade_entitlements.
      this.state = this.getDefaultState();
      localStorage.removeItem('arcade_passport_state');
      if (this.db) {
        try {
          const tx = this.db.transaction([STORE_NAME], 'readwrite');
          tx.objectStore(STORE_NAME).clear();
        } catch (e) {}
      }
      this.applyTheme('default', false);
      this.saveLocalBackup();
      this.updateHeaderBadges();
      this.renderModalContent();
    }

    checkInGameContext() {
      const path = (window.location && window.location.pathname) || '';
      const search = (window.location && window.location.search) || '';
      const gameMatches = [
        'blockblast', 'solitaire', 'sudoku', 'nonogram', 'minesweeper',
        'mahjong', 'codebreaker', 'wordsearch', 'spidersolitaire', 'spades'
      ];
      for (const g of gameMatches) {
        if (path.includes(`/${g}/`)) {
          let vibe = 'blitz';
          if (['solitaire', 'wordsearch', 'minesweeper'].includes(g)) vibe = 'coffee';
          if (['sudoku', 'nonogram', 'mahjong', 'spidersolitaire', 'spades'].includes(g)) vibe = 'deep';

          const isPlayPage = /(?:^|\/)game\.html$/i.test(path.split('?')[0]);
          const isStorePage = /(?:^|\/)store\.html$/i.test(path.split('?')[0]);
          const isDaily = search.includes('daily');

          // Only record a play session on game.html (or once per cabinet visit on menu)
          // and never pass a fake 60s completed duration on page load.
          if (!isStorePage) {
            let alreadyCounted = false;
            try {
              if (window.sessionStorage && !isPlayPage) {
                alreadyCounted = window.sessionStorage.getItem('arcade_visited_' + g) === '1';
                window.sessionStorage.setItem('arcade_visited_' + g, '1');
              }
            } catch (e) {}
            if (!alreadyCounted) {
              this.recordPlay(g, 0, 0, isDaily, vibe, false);
            }
          }

          if (isPlayPage) {
            this.watchGameCompletion(g, isDaily);
          }
          break;
        }
      }
    }

    watchGameCompletion(gameId, isDaily) {
      if (this._watchingGame || typeof document === 'undefined') return;
      this._watchingGame = true;
      const startMs = Date.now();
      let recorded = false;
      let interactions = 0;

      const onInteract = () => { interactions += 1; };
      if (typeof document.addEventListener === 'function') {
        ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(evt => {
          document.addEventListener(evt, onInteract, { passive: true });
        });
      }

      const isShown = (id) => {
        const el = document.getElementById && document.getElementById(id);
        if (!el) return false;
        const cls = String(el.className || '');
        return /(?:^|\s)(?:active|is-active)(?:\s|$)/.test(cls) || cls.indexOf('--show') !== -1;
      };

      const checkWin = () => {
        if (recorded) return;
        let won = false;
        let score = 0;
        if (gameId === 'solitaire') {
          won = isShown('victory-overlay');
        } else if (gameId === 'spades') {
          const over = isShown('gameover-modal');
          const titleEl = document.getElementById && document.getElementById('gameover-title');
          const title = titleEl ? String(titleEl.textContent || '').toLowerCase() : '';
          won = over && title.indexOf('defeat') === -1;
        } else if (gameId === 'blockblast') {
          const over = isShown('gameover-modal');
          const scoreEl = document.getElementById && document.getElementById('hud-score');
          score = scoreEl ? (parseInt(String(scoreEl.textContent || '').replace(/[^0-9]/g, ''), 10) || 0) : 0;
          won = over && score >= (isDaily ? 3500 : 1000);
        } else {
          won = isShown('victory-modal');
        }

        if (won) {
          const elapsedSec = Math.round((Date.now() - startMs) / 1000);
          // Require real player input and at least 3 seconds of actual play
          // so toggling .active on #victory-modal in DevTools cannot fake a win.
          if (interactions < 1 || elapsedSec < 3) return;
          recorded = true;
          if (isDaily) {
            this.recordDailyCompletionFromGame(gameId, score, elapsedSec, 3);
          }
          this.recordWin(gameId, elapsedSec, score, isDaily, 3);
        }
      };

      this._winTimer = setInterval(checkWin, 1000);
    }

    recordDailyCompletionFromGame(gameId, score, elapsedSec, stars = 3) {
      try {
        if (window.ArcadeDaily && typeof window.ArcadeDaily.recordCompletion === 'function') {
          window.ArcadeDaily.recordCompletion(score, elapsedSec, stars);
          return;
        }
        const params = new URLSearchParams((window.location && window.location.search) || '');
        const rawDaily = params.get('daily');
        const dateStr = (rawDaily && /^\d{4}-\d{2}-\d{2}$/.test(rawDaily))
          ? rawDaily
          : new Date().toISOString().slice(0, 10);
        const clampedSec = Math.max(3, Math.min(86400, Math.round(Number(elapsedSec) || 120)));
        const clampedScore = Math.max(0, Math.min(1000000, Math.round(Number(score) || 3500)));
        const clampedStars = Math.max(1, Math.min(3, Math.round(Number(stars) || 3)));
        const baseDate = new Date('2026-01-01T00:00:00Z');
        const dayNumber = Math.max(1, Math.floor((new Date(`${dateStr}T00:00:00Z`) - baseDate) / 86400000) + 1);

        const rec = {
          date: dateStr,
          dayNumber: dayNumber,
          gameId: gameId,
          score: clampedScore,
          timeSeconds: clampedSec,
          stars: clampedStars,
          completedAt: new Date().toISOString()
        };
        rec._seal = computeHash(DAILY_SEAL_SALT, [
          rec.date, rec.dayNumber, rec.gameId, rec.score, rec.timeSeconds, rec.stars
        ].join(':'));

        const history = JSON.parse(localStorage.getItem('arcade_daily_history') || '{}');
        history[dateStr] = rec;
        localStorage.setItem('arcade_daily_history', JSON.stringify(history));

        let streak = 1;
        let cursor = new Date(`${dateStr}T00:00:00Z`);
        while (true) {
          cursor = new Date(cursor.getTime() - 86400000);
          const prevStr = cursor.toISOString().slice(0, 10);
          if (history[prevStr] && history[prevStr]._seal) streak += 1;
          else break;
        }
        localStorage.setItem('arcade_last_daily_completed', dateStr);
        localStorage.setItem('arcade_daily_streak', String(streak));
        localStorage.setItem('arcade_daily_streak_seal', computeHash(DAILY_SEAL_SALT, `streak:${dateStr}:${streak}`));
      } catch (e) {}
    }
  }

  // Singleton instance
  window.ArcadePassport = new ArcadePassportManager();

  function setupPassport() {
    window.ArcadePassport.updateHeaderBadges();
    window.ArcadePassport.checkInGameContext();

    const openBtn = document.getElementById('btn-open-passport');
    const modal = document.getElementById('modal-passport');
    if (modal) {
      modal.addEventListener('close', () => {
        window.ArcadePassport.restoreAppliedLook();
      });
    }
    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        window.ArcadePassport.renderModalContent();
        modal.showModal();
      });
    }

    const checkTriggers = () => {
      const params = new URLSearchParams(window.location.search);
      if ((window.location.hash === '#passport' || params.has('passport')) && modal) {
        window.ArcadePassport.renderModalContent();
        modal.showModal();
      }
    };
    checkTriggers();
    window.addEventListener('hashchange', checkTriggers);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPassport);
  } else {
    setupPassport();
  }
})(window);
