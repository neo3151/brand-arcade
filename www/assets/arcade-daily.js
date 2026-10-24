/**
 * arcade-daily.js — Deterministic Universal Daily Challenge Engine & Emoji Share System
 * Zero backend server required. Derives daily seed, game target, and Wordle-style
 * emoji share grids purely from mathematical PRNG (Mulberry32).
 */
(function(window) {
  'use strict';

  // 1. DETERMINISTIC PRNG (Mulberry32)
  function mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // String hash to 32-bit integer seed
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // Keyed FNV-1a integrity seal to prevent localStorage tampering of daily runs & streaks
  const DAILY_SEAL_SALT = 'ba_daily_v1_9f4e2c7a';
  function computeDailySeal(payload) {
    const str = DAILY_SEAL_SALT + '|' + String(payload);
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

  function signRunRecord(rec) {
    if (!rec || typeof rec !== 'object') return '';
    return computeDailySeal([
      rec.date,
      rec.dayNumber,
      rec.gameId,
      Number(rec.score) || 0,
      Number(rec.timeSeconds) || 0,
      Number(rec.stars) || 0
    ].join(':'));
  }

  function isValidRunRecord(dateKey, rec) {
    if (!rec || typeof rec !== 'object') return false;
    if (rec.date !== dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) return false;
    if (typeof rec._seal !== 'string' || !rec._seal) return false;
    const seconds = Number(rec.timeSeconds);
    const stars = Number(rec.stars);
    if (!Number.isFinite(seconds) || seconds < 3 || seconds > 86400) return false;
    if (!Number.isFinite(stars) || stars < 1 || stars > 3) return false;
    return rec._seal === signRunRecord(rec);
  }

  // Reference base date (Day 1: Jan 1, 2026)
  const BASE_DATE = new Date('2026-01-01T00:00:00Z');

  const GAMES_LIST = [
    {
      id: 'blockblast',
      title: 'Timber Block Blast',
      icon: '🧱',
      path: 'blockblast/www/game.html',
      targetDesc: 'Clear 6 double-lines & reach 3,500+ pts',
      targetScore: 3500,
      parTime: '2m 30s'
    },
    {
      id: 'minesweeper',
      title: 'Inferno Sweeper',
      icon: '💣',
      path: 'minesweeper/www/game.html',
      params: 'diff=recruit',
      targetDesc: 'Disarm 15 plasma mines on Phobos sector',
      targetScore: 2400,
      parTime: '3m 15s'
    },
    {
      id: 'codebreaker',
      title: 'Black Vault',
      icon: '🔐',
      path: 'codebreaker/www/game.html',
      params: 'diff=rookie',
      targetDesc: 'Crack the 4-digit cipher in ≤ 5 attempts',
      targetScore: 4000,
      parTime: '2m 45s'
    },
    {
      id: 'wordsearch',
      title: 'Word Search Classic',
      icon: '🔤',
      path: 'wordsearch/www/game.html',
      params: 'category=animals&difficulty=easy',
      seededLevelMax: 50,
      targetDesc: 'Find all 12 literature terms without hints',
      targetScore: 1800,
      parTime: '3m 50s'
    },
    {
      id: 'solitaire',
      title: 'Curious Solitaire',
      icon: '🃏',
      path: 'solitaire/www/game.html',
      params: 'mode=1',
      seededDealMax: 1000,
      targetDesc: 'Win the Queen of Hearts Royal Deal #Daily',
      targetScore: 5200,
      parTime: '6m 10s'
    },
    {
      id: 'sudoku',
      title: 'Classic Sudoku',
      icon: '🔢',
      path: 'sudoku/www/game.html',
      params: 'difficulty=easy',
      seededLevelMax: 1000,
      targetDesc: 'Solve Japanese Master Grid with 0 mistakes',
      targetScore: 3200,
      parTime: '7m 30s'
    },
    {
      id: 'nonogram',
      title: 'Zen Nonogram',
      icon: '🖼️',
      path: 'nonogram/www/game.html',
      params: 'difficulty=beginner',
      seededLevelMax: 1000,
      targetDesc: 'Reveal the 15×15 Pixel Tapestry without errors',
      targetScore: 2800,
      parTime: '6m 45s'
    },
    {
      id: 'spidersolitaire',
      title: 'Spider Solitaire',
      icon: '🕷️',
      path: 'spidersolitaire/www/game.html',
      params: 'difficulty=1suit',
      seededLevelMax: 1000,
      targetDesc: 'Assemble 4 descending royal flushes',
      targetScore: 4500,
      parTime: '9m 20s'
    },
    {
      id: 'spades',
      title: 'Royal Spades',
      icon: '♠️',
      path: 'spades/www/game.html',
      params: 'mode=twos_wild&target=200',
      targetDesc: 'Make partner nil bid & win the trick match',
      targetScore: 3800,
      parTime: '12m 00s'
    },
    {
      id: 'mahjong',
      title: 'Celestial Jade',
      icon: '🀄',
      path: 'mahjong/www/game.html',
      params: 'layout=turtle',
      targetDesc: 'Match all imperial dragon suites in order',
      targetScore: 3600,
      parTime: '8m 15s'
    }
  ];

  class ArcadeDailyManager {
    constructor() {
      this.todayStr = new Date().toISOString().slice(0, 10);
    }

    // Get Day Number since Epoch
    getDayNumber(dateStr = this.todayStr) {
      const targetDate = new Date(`${dateStr}T00:00:00Z`);
      const diffMs = targetDate - BASE_DATE;
      const dayNum = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, dayNum);
    }

    // Deterministically get today's mission
    getTodayMission(dateStr = this.todayStr) {
      const dayNum = this.getDayNumber(dateStr);
      const seed = hashString(dateStr);
      const rand = mulberry32(seed);

      // Featured game for the day
      const gameIndex = (dayNum - 1) % GAMES_LIST.length;
      const game = GAMES_LIST[gameIndex];

      // Seed-based custom modifier
      const modifiers = [
        'SPEED RUN (Under Par Time)',
        'PERFECT ACCURACY (Zero Retries)',
        'COMBO MASTER (Chain Multipliers)',
        'HARDCORE DIFFICULTY (No Clues)'
      ];
      const modifierIndex = Math.floor(rand() * modifiers.length);

      const extraParams = [];
      if (game.params) extraParams.push(game.params);
      if (game.seededDealMax) {
        const deal = (seed % game.seededDealMax) + 1;
        extraParams.push(`deal=${deal}`);
      }
      if (game.seededLevelMax) {
        const level = (seed % game.seededLevelMax) + 1;
        extraParams.push(`level=${level}`);
      }
      extraParams.push(`daily=${dateStr}`, `seed=${seed}`);

      return {
        dateStr,
        dayNumber: dayNum,
        seed,
        gameIndex,
        game,
        modifier: modifiers[modifierIndex],
        targetScore: game.targetScore,
        targetDesc: game.targetDesc,
        parTime: game.parTime,
        launchUrl: `${game.path}?${extraParams.join('&')}`
      };
    }

    // Get time remaining until midnight UTC
    getTimeToNextReset() {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diffMs = tomorrow - now;

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      return {
        hours: String(hours).padStart(2, '0'),
        mins: String(mins).padStart(2, '0'),
        secs: String(secs).padStart(2, '0'),
        totalMs: diffMs
      };
    }

    // Load user's daily run history (strips any unsealed or tampered entries)
    getHistory() {
      try {
        const raw = JSON.parse(localStorage.getItem('arcade_daily_history') || '{}');
        if (!raw || typeof raw !== 'object') return {};
        const verified = {};
        let dirty = false;
        Object.keys(raw).forEach((dateKey) => {
          if (isValidRunRecord(dateKey, raw[dateKey])) {
            verified[dateKey] = raw[dateKey];
          } else {
            dirty = true;
          }
        });
        if (dirty) {
          localStorage.setItem('arcade_daily_history', JSON.stringify(verified));
        }
        return verified;
      } catch (e) {
        return {};
      }
    }

    // Check if today's run has been completed with a valid seal
    isTodayCompleted(dateStr = this.todayStr) {
      const history = this.getHistory();
      return !!history[dateStr];
    }

    // Record a completed daily run with anti-tamper seal
    recordCompletion(score, timeSeconds, stars = 3, dateStr = this.todayStr) {
      const mission = this.getTodayMission(dateStr);
      const history = this.getHistory();
      const clampedSeconds = Math.max(3, Math.min(86400, Math.round(Number(timeSeconds) || 135)));
      const clampedScore = Math.max(0, Math.min(1000000, Math.round(Number(score) || mission.targetScore)));
      const clampedStars = Math.max(1, Math.min(3, Math.round(Number(stars) || 3)));

      const runRecord = {
        date: dateStr,
        dayNumber: mission.dayNumber,
        gameId: mission.game.id,
        gameTitle: mission.game.title,
        score: clampedScore,
        timeSeconds: clampedSeconds,
        stars: clampedStars,
        completedAt: new Date().toISOString()
      };
      runRecord._seal = signRunRecord(runRecord);

      history[dateStr] = runRecord;
      localStorage.setItem('arcade_daily_history', JSON.stringify(history));

      // Update Daily Streak from verified history
      this.updateStreakOnCompletion(dateStr);

      // Sync completion with ArcadePassport for speedrun, daily_3star, and streak_3 trophies
      if (window.ArcadePassport && typeof window.ArcadePassport.recordWin === 'function') {
        window.ArcadePassport.recordWin(mission.game.id, runRecord.timeSeconds, runRecord.score, true, runRecord.stars);
      }

      return runRecord;
    }

    // Compute consecutive-day streak strictly from sealed history records
    computeVerifiedStreak(anchorDateStr = null) {
      const history = this.getHistory();
      const dates = Object.keys(history).sort();
      if (!dates.length) return 0;
      const latest = anchorDateStr && history[anchorDateStr] ? anchorDateStr : dates[dates.length - 1];
      let streak = 1;
      let cursor = new Date(`${latest}T00:00:00Z`);
      while (true) {
        cursor = new Date(cursor.getTime() - 86400000);
        const prevStr = cursor.toISOString().slice(0, 10);
        if (history[prevStr]) {
          streak += 1;
        } else {
          break;
        }
      }
      return streak;
    }

    updateStreakOnCompletion(dateStr) {
      const streak = Math.max(1, this.computeVerifiedStreak(dateStr));
      const seal = computeDailySeal(`streak:${dateStr}:${streak}`);
      localStorage.setItem('arcade_last_daily_completed', dateStr);
      localStorage.setItem('arcade_daily_streak', streak.toString());
      localStorage.setItem('arcade_daily_streak_seal', seal);
      return streak;
    }

    getDailyStreak() {
      const verified = this.computeVerifiedStreak();
      if (verified > 0) {
        const stored = parseInt(localStorage.getItem('arcade_daily_streak') || '0', 10);
        if (stored !== verified) {
          localStorage.setItem('arcade_daily_streak', String(verified));
        }
        return verified;
      }
      // If no verified daily history exists, reject any manually edited streak > 1
      const raw = parseInt(localStorage.getItem('arcade_daily_streak') || '1', 10);
      if (raw > 1) {
        localStorage.setItem('arcade_daily_streak', '1');
      }
      return 1;
    }

    // Generate Wordle-Style Emoji Share Grid
    generateShareCard(dateStr = this.todayStr, customRecord = null) {
      const mission = this.getTodayMission(dateStr);
      const history = this.getHistory();
      const record = customRecord || history[dateStr] || {
        score: mission.targetScore + 320,
        timeSeconds: 134,
        stars: 3
      };

      const streak = this.getDailyStreak();
      const minutes = Math.floor(record.timeSeconds / 60);
      const seconds = String(record.timeSeconds % 60).padStart(2, '0');
      const timeFormatted = `${minutes}m ${seconds}s`;

      // Deterministic emoji pattern based on score/performance
      const emojiRows = [
        '🟩🟩🟩🟩🟩',
        '🟩🟩🟩🟨🟩',
        '🟩🟨🟩🟩🟩'
      ];
      const selectedRow = emojiRows[Math.min(3 - record.stars, emojiRows.length - 1)];

      const starIcons = '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars);

      let brandName = 'RETRO ARCADE';
      try {
        const storedBrand = localStorage.getItem('arcade_brand_name');
        if (storedBrand && storedBrand.trim() && storedBrand.trim().toUpperCase() !== 'BRAND') {
          brandName = `${storedBrand.trim().toUpperCase()} ARCADE`;
        }
      } catch (e) {}

      let shareUrl = 'https://brandarcade.games';
      try {
        if (window.ARCADE_SHARE_URL) {
          shareUrl = window.ARCADE_SHARE_URL;
        } else if (
          window.location &&
          window.location.origin &&
          !/^(capacitor|file):/i.test(window.location.origin) &&
          !/\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(window.location.origin)
        ) {
          shareUrl = `${window.location.origin}${window.location.pathname}`;
        }
      } catch (e) {}

      const shareText = [
        `🕹️ ${brandName} — DAILY RUN #${mission.dayNumber}`,
        `${mission.game.icon} ${mission.game.title} (${mission.dateStr})`,
        `⚡ Score: ${record.score.toLocaleString()} pts | ⏱ ${timeFormatted}`,
        `🏆 Rating: ${starIcons} | 🔥 Streak: ${streak} Days`,
        selectedRow,
        `Play 100% free (No Ads): ${shareUrl}`
      ].join('\n');

      return shareText;
    }
  }

  window.ArcadeDaily = new ArcadeDailyManager();

})(window);
