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

  // Reference base date (Day 1: Jan 1, 2026)
  const BASE_DATE = new Date('2026-01-01T00:00:00Z');

  const GAMES_LIST = [
    {
      id: 'blockblast',
      title: 'Timber Block Blast',
      icon: '🧱',
      path: 'blockblast/www/index.html',
      targetDesc: 'Clear 6 double-lines & reach 3,500+ pts',
      targetScore: 3500,
      parTime: '2m 30s'
    },
    {
      id: 'minesweeper',
      title: 'Inferno Sweeper',
      icon: '💣',
      path: 'minesweeper/www/index.html',
      targetDesc: 'Disarm 15 plasma mines on Phobos sector',
      targetScore: 2400,
      parTime: '3m 15s'
    },
    {
      id: 'codebreaker',
      title: 'Black Vault',
      icon: '🔐',
      path: 'codebreaker/www/index.html',
      targetDesc: 'Crack the 4-digit cipher in ≤ 5 attempts',
      targetScore: 4000,
      parTime: '2m 45s'
    },
    {
      id: 'wordsearch',
      title: 'Word Search Classic',
      icon: '🔤',
      path: 'wordsearch/www/index.html',
      targetDesc: 'Find all 12 literature terms without hints',
      targetScore: 1800,
      parTime: '3m 50s'
    },
    {
      id: 'solitaire',
      title: 'Curious Solitaire',
      icon: '🃏',
      path: 'solitaire/www/index.html',
      targetDesc: 'Win the Queen of Hearts Royal Deal #Daily',
      targetScore: 5200,
      parTime: '6m 10s'
    },
    {
      id: 'sudoku',
      title: 'Classic Sudoku',
      icon: '🔢',
      path: 'sudoku/www/index.html',
      targetDesc: 'Solve Japanese Master Grid with 0 mistakes',
      targetScore: 3200,
      parTime: '7m 30s'
    },
    {
      id: 'nonogram',
      title: 'Zen Nonogram',
      icon: '🖼️',
      path: 'nonogram/www/index.html',
      targetDesc: 'Reveal the 15×15 Pixel Tapestry without errors',
      targetScore: 2800,
      parTime: '6m 45s'
    },
    {
      id: 'spidersolitaire',
      title: 'Spider Solitaire',
      icon: '🕷️',
      path: 'spidersolitaire/www/index.html',
      targetDesc: 'Assemble 4 descending royal flushes',
      targetScore: 4500,
      parTime: '9m 20s'
    },
    {
      id: 'spades',
      title: 'Royal Spades',
      icon: '♠️',
      path: 'spades/www/index.html',
      targetDesc: 'Make partner nil bid & win the trick match',
      targetScore: 3800,
      parTime: '12m 00s'
    },
    {
      id: 'mahjong',
      title: 'Celestial Jade',
      icon: '🀄',
      path: 'mahjong/www/index.html',
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
        launchUrl: `${game.path}?daily=${dateStr}&seed=${seed}`
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

    // Load user's daily run history
    getHistory() {
      try {
        return JSON.parse(localStorage.getItem('arcade_daily_history') || '{}');
      } catch (e) {
        return {};
      }
    }

    // Check if today's run has been completed
    isTodayCompleted(dateStr = this.todayStr) {
      const history = this.getHistory();
      return !!history[dateStr];
    }

    // Record a completed daily run
    recordCompletion(score, timeSeconds, stars = 3, dateStr = this.todayStr) {
      const mission = this.getTodayMission(dateStr);
      const history = this.getHistory();

      const runRecord = {
        date: dateStr,
        dayNumber: mission.dayNumber,
        gameId: mission.game.id,
        gameTitle: mission.game.title,
        score: score || mission.targetScore,
        timeSeconds: timeSeconds || 135,
        stars: Math.max(1, Math.min(3, stars)),
        completedAt: new Date().toISOString()
      };

      history[dateStr] = runRecord;
      localStorage.setItem('arcade_daily_history', JSON.stringify(history));

      // Update Daily Streak
      this.updateStreakOnCompletion(dateStr);

      return runRecord;
    }

    updateStreakOnCompletion(dateStr) {
      let streak = parseInt(localStorage.getItem('arcade_daily_streak') || '0', 10);
      const lastCompletedDate = localStorage.getItem('arcade_last_daily_completed');

      if (!lastCompletedDate) {
        streak = 1;
      } else {
        const lastDate = new Date(lastCompletedDate);
        const currDate = new Date(dateStr);
        const diffDays = Math.round((currDate - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) streak += 1;
        else if (diffDays === 0) { /* already counted */ }
        else streak = 1;
      }

      localStorage.setItem('arcade_last_daily_completed', dateStr);
      localStorage.setItem('arcade_daily_streak', streak.toString());
      return streak;
    }

    getDailyStreak() {
      return parseInt(localStorage.getItem('arcade_daily_streak') || '1', 10);
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

      const shareText = [
        `🕹️ RETRO ARCADE — DAILY RUN #${mission.dayNumber}`,
        `${mission.game.icon} ${mission.game.title} (${mission.dateStr})`,
        `⚡ Score: ${record.score.toLocaleString()} pts | ⏱ ${timeFormatted}`,
        `🏆 Rating: ${starIcons} | 🔥 Streak: ${streak} Days`,
        selectedRow,
        `Play 100% free (No Ads): ${window.location.origin}${window.location.pathname}`
      ].join('\n');

      return shareText;
    }
  }

  window.ArcadeDaily = new ArcadeDailyManager();

})(window);
