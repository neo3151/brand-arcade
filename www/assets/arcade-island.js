/**
 * arcade-island.js — Dynamic Island bridge for the hub app.
 *
 * window.ArcadeIsland.start / update / end talk to the local Capacitor
 * plugin. On the web, on Android, and when the phone cannot show an Island,
 * every call resolves and does not throw. Nothing here changes rules, hints,
 * scores, or offers a purchase.
 */
(function (root) {
  'use strict';

  const GAMES = {
    blockblast: { name: 'Block Blast', accent: '#c4a574', surface: '#3a2415', ink: '#f6e7c1' },
    solitaire: { name: 'Solitaire', accent: '#d4a017', surface: '#0e3b28', ink: '#f4f1e8' },
    sudoku: { name: 'Sudoku', accent: '#1c1c1c', surface: '#f4efe4', ink: '#1c1c1c' },
    nonogram: { name: 'Nonogram', accent: '#7eb6ff', surface: '#101820', ink: '#e8eef5' },
    minesweeper: { name: 'Minesweeper', accent: '#ff5a5a', surface: '#1a120f', ink: '#f6f0e6' },
    mahjong: { name: 'Mahjong', accent: '#3dce8a', surface: '#0c2418', ink: '#e7f6ee' },
    codebreaker: { name: 'Codebreaker', accent: '#e6b325', surface: '#14110c', ink: '#f3e6c2' },
    wordsearch: { name: 'Word Search', accent: '#7aa2ff', surface: '#0e1a33', ink: '#e7eefc' },
    spidersolitaire: { name: 'Spider', accent: '#c4b5fd', surface: '#1a1030', ink: '#f3e8ff' },
    spades: { name: 'Spades', accent: '#34d399', surface: '#06281f', ink: '#ecfdf5' }
  };

  const SKINS = {
    marble: { accent: '#7d756c', surface: '#eef3ef', ink: '#2a2622' },
    walnut: { accent: '#c4a574', surface: '#1a0e08', ink: '#f6e7c1' },
    stainedglass: { accent: '#c084fc', surface: '#1b1030', ink: '#f5e9ff' },
    'solitaire-noir': { accent: '#e5e7eb', surface: '#111111', ink: '#f9fafb' },
    'solitaire-burgundy': { accent: '#f2d2d2', surface: '#4a1020', ink: '#fff7f7' },
    'spider-violet': { accent: '#c4b5fd', surface: '#2e1064', ink: '#f5f3ff' },
    'spider-emerald': { accent: '#6ee7b7', surface: '#022c22', ink: '#ecfdf5' },
    montecarlo: { accent: '#f5d0a9', surface: '#3f1d12', ink: '#fff7ed' },
    artdeco: { accent: '#e6b325', surface: '#1c1408', ink: '#fff8e1' },
    ivory: { accent: '#d6c4a8', surface: '#f7f1e6', ink: '#3f3428' },
    bamboo: { accent: '#4ade80', surface: '#052e16', ink: '#ecfdf3' },
    porcelain: { accent: '#93c5fd', surface: '#eff6ff', ink: '#1e3a8a' },
    europa: { accent: '#bae6fd', surface: '#0c4a6e', ink: '#f0f9ff' },
    venus: { accent: '#f9a8d4', surface: '#3b0764', ink: '#fdf4ff' },
    phosphor: { accent: '#4ade80', surface: '#052e16', ink: '#bbf7d0' },
    amber: { accent: '#f59e0b', surface: '#1c1408', ink: '#fef3c7' },
    hacker: { accent: '#f87171', surface: '#1a0505', ink: '#fecaca' },
    washi: { accent: '#b45309', surface: '#faf6ef', ink: '#44403c' },
    nightink: { accent: '#a5b4fc', surface: '#0f172a', ink: '#e0e7ff' },
    sumie: { accent: '#52525b', surface: '#fafafa', ink: '#18181b' },
    kintsugi: { accent: '#e6b325', surface: '#1c1917', ink: '#faf5e8' },
    indigo: { accent: '#818cf8', surface: '#1e1b4b', ink: '#e0e7ff' },
    atlas: { accent: '#38bdf8', surface: '#082f49', ink: '#e0f2fe' },
    neonink: { accent: '#f472b6', surface: '#111827', ink: '#fce7f3' }
  };

  const THROTTLE_MS = 2000;

  function clip(value, max) {
    const text = String(value == null ? '' : value);
    return text.length > max ? text.slice(0, max) : text;
  }

  function clamp(value) {
    const n = Number(value);
    if (!isFinite(n)) return 0;
    return Math.min(1, Math.max(0, n));
  }

  function colors(game, skinId) {
    const base = GAMES[game] || GAMES.blockblast;
    const skin = skinId && SKINS[skinId];
    return {
      accent: (skin && skin.accent) || base.accent,
      surface: (skin && skin.surface) || base.surface,
      ink: (skin && skin.ink) || base.ink
    };
  }

  function streak() {
    try {
      if (root.ArcadeDaily && typeof root.ArcadeDaily.getDailyStreak === 'function') {
        const n = parseInt(root.ArcadeDaily.getDailyStreak(), 10);
        return n > 0 ? n : 0;
      }
      const raw = root.localStorage && root.localStorage.getItem('arcade_daily_streak');
      if (raw == null || raw === '') return 0;
      const n = parseInt(raw, 10);
      return n > 0 ? n : 0;
    } catch (e) {
      return 0;
    }
  }

  function present(game, reading) {
    const meta = GAMES[game];
    if (!meta) return null;
    const src = reading || {};
    const tone = colors(game, src.skinId);
    const phase = src.phase === 'won' || src.phase === 'lost' ? src.phase : 'playing';
    const marks = Array.isArray(src.marks) ? src.marks.slice(0, 8).map(clamp) : [];
    const grid = Array.isArray(src.grid) ? src.grid.slice(0, 64).map(n => {
      const v = parseInt(n, 10);
      if (v === 1 || v === 2) return v;
      return 0;
    }) : [];
    return {
      gameId: game,
      gameName: meta.name,
      deepLink: 'benchmarkarcade://play/' + game,
      phase: phase,
      headline: phase === 'won' ? 'Won' : (phase === 'lost' ? 'Ended' : meta.name),
      primary: clip(src.primary, 24),
      secondary: clip(src.secondary, 48),
      detail: clip(src.detail, 48),
      progress: clamp(src.progress),
      alert: !!src.alert && phase === 'playing',
      streak: Math.max(0, parseInt(src.streak, 10) || streak()),
      marks: marks,
      grid: grid,
      accent: tone.accent,
      surface: tone.surface,
      ink: tone.ink
    };
  }

  function platform() {
    const cap = root.Capacitor;
    if (!cap || typeof cap.getPlatform !== 'function') return '';
    try { return String(cap.getPlatform() || ''); } catch (e) { return ''; }
  }

  function plugin() {
    const cap = root.Capacitor;
    return cap && cap.Plugins && cap.Plugins.ArcadeIsland;
  }

  function nativeCall(method, payload) {
    const current = platform();
    if (current && current !== 'ios') {
      return Promise.resolve({ ok: false, reason: 'unavailable' });
    }
    const native = plugin();
    if (!native || typeof native[method] !== 'function') {
      return Promise.resolve({ ok: false, reason: 'unavailable' });
    }
    try {
      return Promise.resolve(native[method](payload || {})).then(function (result) {
        return result || { ok: true };
      }, function () {
        return { ok: false, reason: 'unavailable' };
      });
    } catch (e) {
      return Promise.resolve({ ok: false, reason: 'unavailable' });
    }
  }

  function createBridge() {
    let generation = 0;
    let lastSent = 0;
    let lastKey = '';
    let timer = null;
    let pending = null;
    let closed = false;

    function send(method, body) {
      const payload = Object.assign({}, body, { generation: generation });
      lastSent = Date.now();
      lastKey = JSON.stringify([
        payload.phase, payload.primary, payload.secondary, payload.detail,
        payload.alert, payload.progress, payload.streak
      ]);
      return nativeCall(method, payload);
    }

    function start(reading) {
      const body = present(reading && reading.game, reading);
      if (!body) return Promise.resolve({ ok: false, reason: 'unknown-game' });
      generation += 1;
      closed = false;
      const mine = generation;
      return send('start', body).then(function (result) {
        if (closed && generation === mine) return end(Object.assign({}, reading, { phase: reading.phase || 'lost' }));
        return result;
      });
    }

    function update(reading, immediate) {
      const body = present(reading && reading.game, reading);
      if (!body || !generation) return Promise.resolve({ ok: false, reason: 'idle' });
      const key = JSON.stringify([
        body.phase, body.primary, body.secondary, body.detail,
        body.alert, body.progress, body.streak
      ]);
      const urgent = !!immediate || body.phase !== 'playing' || body.alert;
      if (!urgent && key === lastKey) return Promise.resolve({ ok: true, throttled: true });
      if (!urgent && Date.now() - lastSent < THROTTLE_MS) {
        pending = body;
        if (!timer) {
          timer = setTimeout(function () {
            timer = null;
            const next = pending;
            pending = null;
            if (next) send('update', next);
          }, THROTTLE_MS - (Date.now() - lastSent));
        }
        return Promise.resolve({ ok: true, throttled: true });
      }
      pending = null;
      if (timer) { clearTimeout(timer); timer = null; }
      return send('update', body);
    }

    function end(reading) {
      closed = true;
      if (timer) { clearTimeout(timer); timer = null; }
      pending = null;
      if (!generation) return Promise.resolve({ ok: true, reason: 'idle' });
      const body = present(reading && reading.game, reading) || {
        gameId: reading && reading.game,
        phase: 'lost'
      };
      return send('end', body);
    }

    return { start: start, update: update, end: end, present: present };
  }

  const bridge = createBridge();

  function textOf(doc, id) {
    if (!doc || typeof doc.getElementById !== 'function') return '';
    const el = doc.getElementById(id);
    return el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }

  function shown(el) {
    if (!el) return false;
    const cls = String(el.className || '');
    return /(?:^|\s)(?:active|is-active)(?:\s|$)/.test(cls) || cls.indexOf('--show') !== -1;
  }

  function list(doc, selector) {
    if (!doc || typeof doc.querySelectorAll !== 'function') return [];
    return Array.prototype.slice.call(doc.querySelectorAll(selector));
  }

  function skinFrom(doc) {
    const html = doc && doc.documentElement;
    if (html && html.dataset && html.dataset.paidSkin) return html.dataset.paidSkin;
    const body = doc && doc.body;
    if (body && body.dataset && body.dataset.theme && SKINS[body.dataset.theme]) return body.dataset.theme;
    return '';
  }

  function read(doc, game) {
    const skinId = skinFrom(doc);
    if (game === 'blockblast') {
      const score = textOf(doc, 'hud-score') || '0';
      const comboText = textOf(doc, 'hud-combo-text');
      const combo = parseInt(comboText.replace(/[^0-9]/g, ''), 10) || 0;
      return {
        game: game, skinId: skinId,
        phase: shown(doc.getElementById('gameover-modal')) ? 'lost' : 'playing',
        primary: score,
        secondary: combo > 1 ? ('Combo x' + combo) : 'Wood streak',
        detail: combo > 1 ? ('x' + combo) : '',
        progress: clamp(parseInt(score, 10) / 4000),
        marks: [clamp(combo / 5)],
        alert: false
      };
    }
    if (game === 'solitaire') {
      const slots = list(doc, '.foundation-slot');
      const marks = [0, 1, 2, 3].map(function (i) {
        const slot = slots[i];
        const cards = slot && slot.querySelectorAll ? slot.querySelectorAll('.card').length : 0;
        return cards / 13;
      });
      const placed = marks.reduce(function (sum, n) { return sum + Math.round(n * 13); }, 0);
      return {
        game: game, skinId: skinId,
        phase: shown(doc.getElementById('victory-overlay')) ? 'won' : 'playing',
        primary: String(placed),
        secondary: placed + ' to foundation',
        detail: textOf(doc, 'hud-timer'),
        progress: placed / 52,
        marks: marks
      };
    }
    if (game === 'sudoku') {
      const filled = list(doc, '.cell--given, .cell--filled').length;
      const left = Math.max(0, 81 - filled);
      const won = shown(doc.getElementById('victory-modal'));
      const lost = shown(doc.getElementById('gameover-modal'));
      return {
        game: game, skinId: skinId,
        phase: won ? 'won' : (lost ? 'lost' : 'playing'),
        primary: textOf(doc, 'timer') || '00:00',
        secondary: left + ' cells left',
        detail: 'Ink',
        progress: filled / 81
      };
    }
    if (game === 'nonogram') {
      const cells = list(doc, '.grid-matrix .grid-cell');
      const size = Math.max(1, Math.round(Math.sqrt(cells.length || 1)));
      const grid = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sr = Math.min(size - 1, Math.floor(r * size / 8));
          const sc = Math.min(size - 1, Math.floor(c * size / 8));
          const cell = cells[sr * size + sc];
          const cls = cell ? String(cell.className || '') : '';
          grid.push(cls.indexOf('filled') !== -1 ? 1 : (cls.indexOf('crossed') !== -1 ? 2 : 0));
        }
      }
      const filled = cells.filter(function (cell) {
        return String(cell.className || '').indexOf('filled') !== -1;
      }).length;
      const won = shown(doc.getElementById('victory-modal'));
      const lost = shown(doc.getElementById('gameover-modal'));
      return {
        game: game, skinId: skinId,
        phase: won ? 'won' : (lost ? 'lost' : 'playing'),
        primary: cells.length ? Math.round(filled / cells.length * 100) + '%' : '0%',
        secondary: 'Picture',
        detail: textOf(doc, 'game-timer-val'),
        progress: cells.length ? filled / cells.length : 0,
        grid: grid
      };
    }
    if (game === 'minesweeper') {
      const mines = textOf(doc, 'led-mines') || '000';
      const hot = list(doc, '.cell--num-3, .cell--num-4, .cell--num-5, .cell--num-6, .cell--num-7, .cell--num-8').length;
      const exploded = list(doc, '.cell--exploded').length > 0;
      const won = shown(doc.getElementById('victory-modal'));
      return {
        game: game, skinId: skinId,
        phase: won ? 'won' : (exploded ? 'lost' : 'playing'),
        primary: mines,
        secondary: (mines.replace(/^0+/, '') || '0') + ' mines',
        detail: textOf(doc, 'led-timer'),
        progress: 0,
        alert: !won && (exploded || hot > 0)
      };
    }
    if (game === 'mahjong') {
      const pairs = parseInt(textOf(doc, 'pairs-left-display'), 10);
      const left = isFinite(pairs) ? pairs : 0;
      return {
        game: game, skinId: skinId,
        phase: shown(doc.getElementById('victory-modal')) ? 'won' : 'playing',
        primary: String(left),
        secondary: left + ' pairs',
        detail: textOf(doc, 'timer-display'),
        progress: clamp(1 - left / 72)
      };
    }
    if (game === 'codebreaker') {
      const rows = list(doc, '.guess-row');
      const used = list(doc, '.guess-row--submitted').length;
      const max = rows.length || 10;
      const left = Math.max(0, max - used);
      const marks = [];
      for (let i = 0; i < 6; i++) marks.push(i < Math.min(6, left) ? 1 : 0.2);
      const won = shown(doc.getElementById('victory-modal'));
      const lost = shown(doc.getElementById('failure-modal'));
      return {
        game: game, skinId: skinId,
        phase: won ? 'won' : (lost ? 'lost' : 'playing'),
        primary: String(left),
        secondary: left + ' attempts',
        detail: 'Vault',
        progress: max ? used / max : 0,
        marks: marks
      };
    }
    if (game === 'wordsearch') {
      const counter = textOf(doc, 'found-counter');
      const parts = counter.split('/');
      const found = parseInt(parts[0], 10) || list(doc, '.word-item.found').length;
      const total = parseInt(parts[1], 10) || list(doc, '.word-item').length || found;
      const words = list(doc, '.word-item.found');
      const latest = words.length ? String(words[words.length - 1].textContent || '').trim() : '';
      return {
        game: game, skinId: skinId,
        phase: shown(doc.getElementById('victory-modal')) ? 'won' : 'playing',
        primary: found + '/' + total,
        secondary: found + ' / ' + total,
        detail: latest,
        progress: total ? found / total : 0
      };
    }
    if (game === 'spidersolitaire') {
      const done = list(doc, '.foundation-slot.completed').length;
      return {
        game: game, skinId: skinId,
        phase: shown(doc.getElementById('victory-modal')) ? 'won' : 'playing',
        primary: done + '/8',
        secondary: done + ' runs',
        detail: textOf(doc, 'timer-val'),
        progress: done / 8,
        marks: [done / 8]
      };
    }
    if (game === 'spades') {
      const us = textOf(doc, 'score-us') || '0';
      const them = textOf(doc, 'score-them') || '0';
      const tricks = textOf(doc, 'tricks-us-counter');
      const theirs = textOf(doc, 'tricks-them-counter');
      const over = shown(doc.getElementById('gameover-modal'));
      const title = textOf(doc, 'gameover-title').toLowerCase();
      const lost = over && title.indexOf('defeat') !== -1;
      const won = over && !lost;
      return {
        game: game, skinId: skinId,
        phase: won ? 'won' : (lost ? 'lost' : 'playing'),
        primary: us,
        secondary: them,
        detail: (tricks || '0/0') + ' vs ' + (theirs || '0/0'),
        progress: 0
      };
    }
    return null;
  }

  function gameFromPath(path) {
    const parts = String(path || '').split('/').filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      if (GAMES[parts[i]]) return parts[i];
    }
    return '';
  }

  function isPlayPage(path) {
    return /(?:^|\/)game\.html$/.test(String(path || '').split('?')[0]);
  }

  let watching = false;

  function watch(doc) {
    if (watching) return;
    const path = (root.location && root.location.pathname) || '';
    const game = gameFromPath(path);
    if (!game || !isPlayPage(path)) return;
    watching = true;
    let started = false;
    let lastPhase = '';

    let timer = null;

    function tick() {
      const reading = read(doc || root.document, game);
      if (!reading) return;
      if (!started) {
        started = true;
        bridge.start(reading);
        lastPhase = reading.phase;
        return;
      }
      const immediate = reading.phase !== lastPhase;
      lastPhase = reading.phase;
      if (reading.phase === 'won' || reading.phase === 'lost') {
        if (timer) clearInterval(timer);
        watching = false;
        bridge.update(reading, true).then(function () { bridge.end(reading); });
        return;
      }
      bridge.update(reading, immediate);
    }

    tick();
    timer = setInterval(tick, 1000);
    function stop() {
      if (timer) clearInterval(timer);
      if (started && lastPhase === 'playing') bridge.end(read(doc || root.document, game) || { game: game, phase: 'lost' });
    }
    if (root.addEventListener) root.addEventListener('pagehide', stop);
  }

  const api = {
    GAMES: GAMES,
    present: present,
    read: read,
    start: function (reading) { return bridge.start(reading); },
    update: function (reading) { return bridge.update(reading, !!(reading && reading.immediate)); },
    end: function (reading) { return bridge.end(reading || {}); },
    support: function () { return nativeCall('support', {}); },
    watch: watch
  };

  root.ArcadeIsland = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
