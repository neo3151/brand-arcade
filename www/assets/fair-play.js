/**
 * fair-play.js — Fair Play Economy (Phase 0)
 *
 * Shared daily refill and milestone grants for Brand Arcade games.
 * No real-money purchases. Each game's progress.js calls this.
 *
 * Storage (change the date to retest a refill):
 *   localStorage['fairplay_supply_v1'] = {
 *     sudoku: { lastRefillDate: 'YYYY-MM-DD', milestoneTier: 0 }
 *   }
 *
 * applyDailyRefill tops each listed consumable UP to `floor` (15) once per
 * local calendar day and never reduces a balance the player already holds.
 * grantMilestone adds bonus supplies each time wins cross a multiple of 5.
 */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'fairplay_supply_v1';
  const DEFAULT_FLOOR = 15;
  const MILESTONE_EVERY = 5;
  const MILESTONE_BONUS = 5;

  function localDateString(date) {
    const d = date instanceof Date ? date : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function storage() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    } catch (e) { /* private mode */ }
    return null;
  }

  function readAll() {
    const store = storage();
    if (!store) return {};
    try {
      const parsed = JSON.parse(store.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function writeAll(data) {
    const store = storage();
    if (!store) return;
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* quota */ }
  }

  function readGame(gameId) {
    const all = readAll();
    const record = all[gameId];
    if (!record || typeof record !== 'object') {
      return { lastRefillDate: null, milestoneTier: 0 };
    }
    return {
      lastRefillDate: record.lastRefillDate || null,
      milestoneTier: record.milestoneTier || 0
    };
  }

  function writeGame(gameId, record) {
    const all = readAll();
    all[gameId] = {
      lastRefillDate: record.lastRefillDate || null,
      milestoneTier: record.milestoneTier || 0
    };
    writeAll(all);
  }

  function pickCounts(bag, keys) {
    const counts = {};
    (keys || Object.keys(bag || {})).forEach(function (key) {
      const n = Number(bag[key]);
      counts[key] = Number.isFinite(n) ? n : 0;
    });
    return counts;
  }

  /**
   * Top each consumable up to `floor` once per local day.
   * Values already at or above the floor are left unchanged.
   */
  function applyDailyRefill(options) {
    const opts = options || {};
    const gameId = opts.gameId;
    const floor = opts.floor == null ? DEFAULT_FLOOR : opts.floor;
    const today = localDateString(opts.now || new Date());
    const counts = pickCounts(opts.counts || {}, Object.keys(opts.counts || {}));
    const record = readGame(gameId);
    const topped = {};

    if (record.lastRefillDate === today) {
      return {
        counts: counts,
        refilled: false,
        topped: topped,
        date: today,
        floor: floor,
        lastRefillDate: record.lastRefillDate
      };
    }

    Object.keys(counts).forEach(function (key) {
      if (counts[key] < floor) {
        topped[key] = floor - counts[key];
        counts[key] = floor;
      }
    });

    record.lastRefillDate = today;
    writeGame(gameId, record);

    return {
      counts: counts,
      refilled: true,
      topped: topped,
      date: today,
      floor: floor,
      lastRefillDate: today
    };
  }

  /**
   * Every `every` wins, add `bonus` to each consumable. Crossing several
   * tiers at once grants the bonus once per tier. Never reduces stock.
   */
  function grantMilestone(options) {
    const opts = options || {};
    const gameId = opts.gameId;
    const wins = Math.max(0, opts.wins | 0);
    const every = opts.every == null ? MILESTONE_EVERY : opts.every;
    const bonus = opts.bonus == null ? MILESTONE_BONUS : opts.bonus;
    const counts = pickCounts(opts.counts || {}, Object.keys(opts.counts || {}));
    const record = readGame(gameId);
    const tier = every > 0 ? Math.floor(wins / every) : 0;
    const previous = record.milestoneTier || 0;

    if (tier <= previous) {
      return {
        counts: counts,
        granted: false,
        tiers: 0,
        bonusEach: 0,
        milestoneTier: previous
      };
    }

    const tiers = tier - previous;
    const bonusEach = bonus * tiers;
    Object.keys(counts).forEach(function (key) {
      counts[key] += bonusEach;
    });
    record.milestoneTier = tier;
    writeGame(gameId, record);

    if (opts.celebrate !== false) {
      celebrate('Milestone: ' + wins + ' clears. +' + bonusEach + ' to each supply.');
    }

    return {
      counts: counts,
      granted: true,
      tiers: tiers,
      bonusEach: bonusEach,
      milestoneTier: tier
    };
  }

  function refillKeys(gameId, bag, keys, floor) {
    const result = applyDailyRefill({
      gameId: gameId,
      counts: pickCounts(bag, keys),
      floor: floor
    });
    keys.forEach(function (key) {
      bag[key] = result.counts[key];
    });
    return result;
  }

  function milestoneKeys(gameId, wins, bag, keys, options) {
    const opts = options || {};
    const result = grantMilestone({
      gameId: gameId,
      wins: wins,
      counts: pickCounts(bag, keys),
      every: opts.every,
      bonus: opts.bonus,
      celebrate: opts.celebrate
    });
    if (result.granted) {
      keys.forEach(function (key) {
        bag[key] = result.counts[key];
      });
    }
    return result;
  }

  function getStatus(gameId, now) {
    const clock = now || new Date();
    const today = localDateString(clock);
    const record = readGame(gameId);
    const midnight = new Date(clock.getFullYear(), clock.getMonth(), clock.getDate() + 1, 0, 0, 0, 0);
    const ms = Math.max(0, midnight - clock);
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return {
      gameId: gameId,
      date: today,
      lastRefillDate: record.lastRefillDate,
      refilledToday: record.lastRefillDate === today,
      milestoneTier: record.milestoneTier || 0,
      floor: DEFAULT_FLOOR,
      milestoneEvery: MILESTONE_EVERY,
      milestoneBonus: MILESTONE_BONUS,
      nextResetLabel: hours + 'h ' + mins + 'm'
    };
  }

  function supplySummary(gameId) {
    const status = getStatus(gameId);
    const when = status.refilledToday
      ? 'Refilled today. Next morning refill in ' + status.nextResetLabel + '.'
      : 'Today\'s refill has not been applied yet.';
    return 'Every local morning, supplies are topped up to ' + status.floor +
      '. Anything you already hold above that stays yours. Every ' +
      status.milestoneEvery + ' clears adds ' + status.milestoneBonus +
      ' more of each. ' + when;
  }

  function celebrate(message) {
    try {
      if (typeof document === 'undefined' || !document.body) return;
      if (!document.getElementById('fairplay-celebrate-style')) {
        const style = document.createElement('style');
        style.id = 'fairplay-celebrate-style';
        style.textContent = '@keyframes fairplay-fall{to{transform:translateY(110vh) rotate(200deg);opacity:0}}';
        (document.head || document.documentElement).appendChild(style);
      }
      const host = document.createElement('div');
      host.setAttribute('data-fair-play-celebrate', '1');
      host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;';
      const emojis = ['🎉', '✨', '🎁', '🌟', '🎊'];
      for (let i = 0; i < 16; i++) {
        const bit = document.createElement('span');
        bit.textContent = emojis[i % emojis.length];
        bit.style.cssText = 'position:absolute;left:' + (Math.random() * 100) +
          '%;top:-8%;font-size:' + (16 + Math.random() * 16) +
          'px;animation:fairplay-fall ' + (1.3 + Math.random()) +
          's ease-in forwards;animation-delay:' + (Math.random() * 0.25) + 's;';
        host.appendChild(bit);
      }
      document.body.appendChild(host);
      if (message && root && typeof root.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') {
        root.dispatchEvent(new root.CustomEvent('fairplay:milestone', { detail: { message: message } }));
      }
      setTimeout(function () {
        if (host.parentNode) host.parentNode.removeChild(host);
      }, 2200);
    } catch (e) { /* celebration is optional */ }
  }

  const api = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_FLOOR: DEFAULT_FLOOR,
    MILESTONE_EVERY: MILESTONE_EVERY,
    MILESTONE_BONUS: MILESTONE_BONUS,
    localDateString: localDateString,
    applyDailyRefill: applyDailyRefill,
    grantMilestone: grantMilestone,
    refillKeys: refillKeys,
    milestoneKeys: milestoneKeys,
    getStatus: getStatus,
    supplySummary: supplySummary,
    celebrate: celebrate
  };

  root.FairPlay = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
