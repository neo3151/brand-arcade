/**
 * arcade-island.js — Dynamic Island bridge for the hub app.
 *
 * window.ArcadeIsland.start / update / end talk to the local Capacitor
 * plugin. On the web, on Android, and when the phone cannot show an Island,
 * every call resolves and does not throw.
 *
 * iOS 17 Live Activity buttons call applyIntent. That clicks the same
 * on-screen control the game already uses, so a hint or power-up spends the
 * daily supply once. It does not add hints and it does not offer a purchase.
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
    const actions = Array.isArray(src.actions) ? src.actions.slice(0, 4).map(item => clip(item, 16)) : [];
    const pieces = Array.isArray(src.pieces) ? src.pieces.slice(0, 8).map(item => clip(item, 48)) : [];
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
      ink: tone.ink,
      paused: !!src.paused,
      flagMode: !!src.flagMode,
      celebrate: !!src.celebrate || phase === 'won',
      chime: !!src.chime,
      supply: Math.max(0, parseInt(src.supply, 10) || 0),
      actions: actions,
      pieces: pieces,
      caption: clip(src.caption, 80)
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
        payload.alert, payload.progress, payload.streak, payload.caption,
        payload.paused, payload.flagMode, payload.chime, payload.supply,
        (payload.pieces || []).join(','), (payload.actions || []).join(',')
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
        body.alert, body.progress, body.streak, body.caption,
        body.paused, body.flagMode, body.chime, body.supply,
        (body.pieces || []).join(','), (body.actions || []).join(',')
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

  function countText(doc, id) {
    const n = parseInt(textOf(doc, id).replace(/[^0-9]/g, ''), 10);
    return isFinite(n) ? n : 0;
  }

  function countClass(doc, className) {
    const nodes = list(doc, '.' + className);
    if (!nodes.length) return 0;
    const n = parseInt(String(nodes[0].textContent || '').replace(/[^0-9]/g, ''), 10);
    return isFinite(n) ? n : 0;
  }

  function flagged(doc, id, name) {
    const el = doc && doc.getElementById ? doc.getElementById(id) : null;
    return !!(el && el.dataset && el.dataset[name]);
  }

  function classed(doc, id, token) {
    const el = doc && doc.getElementById ? doc.getElementById(id) : null;
    if (!el) return false;
    return String(el.className || '').split(/\s+/).indexOf(token) !== -1;
  }

  function pieceCodes(doc) {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const slot = doc && doc.getElementById ? doc.getElementById('tray-slot-' + i) : null;
      const piece = slot && slot.querySelector ? slot.querySelector('.tray-piece') : null;
      if (!piece) { out.push(''); continue; }
      const cols = parseInt(String(piece.style && piece.style.gridTemplateColumns || '').replace(/\D/g, ''), 10) || 0;
      const tiles = piece.querySelectorAll ? piece.querySelectorAll('.piece-tile') : [];
      const rows = [];
      let row = '';
      for (let t = 0; t < tiles.length; t++) {
        const bg = tiles[t] && tiles[t].style && tiles[t].style.backgroundColor;
        row += bg ? '1' : '0';
        if (cols && (t + 1) % cols === 0) { rows.push(row); row = ''; }
      }
      if (row) rows.push(row);
      out.push(rows.join('/'));
    }
    return out;
  }

  function hintedTiles(doc) {
    return list(doc, '.mj-tile--hint').map(function (el) {
      return String(el.textContent || '').trim();
    }).filter(Boolean).slice(0, 2).join(' + ');
  }

  function pegMarks(doc) {
    const rows = list(doc, '.guess-row--submitted');
    const last = rows.length ? rows[rows.length - 1] : null;
    if (!last || !last.querySelectorAll) return [];
    return Array.prototype.slice.call(last.querySelectorAll('.feedback-peg')).slice(0, 8).map(function (peg) {
      const cls = String(peg.className || '');
      if (cls.indexOf('exact') !== -1) return 1;
      if (cls.indexOf('partial') !== -1) return 0.5;
      return 0.15;
    });
  }

  function pegCaption(doc) {
    const marks = pegMarks(doc);
    if (!marks.length) return '';
    const exact = marks.filter(function (n) { return n === 1; }).length;
    const partial = marks.filter(function (n) { return n === 0.5; }).length;
    return exact + ' exact · ' + partial + ' partial';
  }

  function focusedWord(doc) {
    const focused = list(doc, '.word-item.island-next');
    const word = focused.length ? String(focused[0].textContent || '').trim() : '';
    if (!word) return '';
    return 'Next ' + word.charAt(0);
  }

  function handCaption(doc) {
    const cards = list(doc, '#human-hand .playable, #human-hand .card');
    const hand = list(doc, '#human-hand .card');
    const status = textOf(doc, 'trick-status-text');
    const played = ['north', 'west', 'east', 'south'].map(function (seat) {
      return textOf(doc, 'trick-slot-' + seat);
    }).filter(Boolean).join(' ');
    const count = hand.length || cards.length;
    return (count ? (count + ' in hand') : 'Hand') + (status ? ' · ' + status : '') + (played ? ' · ' + played : '');
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
        alert: false,
        actions: ['rotate', 'pause'],
        pieces: pieceCodes(doc),
        paused: shown(doc.getElementById('pause-modal')),
        supply: countText(doc, 'badge-rotate'),
        caption: combo > 1 ? ('Combo x' + combo) : '',
        highScore: (parseInt(score, 10) || 0) > countText(doc, 'hud-best-score') && countText(doc, 'hud-best-score') > 0
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
        marks: marks,
        actions: ['hint', 'draw'],
        supply: countText(doc, 'badge-hints'),
        caption: textOf(doc, 'hint-text')
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
        progress: filled / 81,
        actions: ['pause', 'hint'],
        paused: flagged(doc, 'timer', 'paused'),
        supply: countText(doc, 'hint-count') || countClass(doc, 'hint-count'),
        caption: textOf(doc, 'hint-explanation-text')
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
        grid: grid,
        actions: ['row'],
        supply: countText(doc, 'badge-hints'),
        caption: textOf(doc, 'hint-text')
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
        alert: !won && (exploded || hot > 0),
        actions: ['flag', 'pause'],
        flagMode: classed(doc, 'mode-flag', 'is-active'),
        paused: flagged(doc, 'led-timer', 'paused'),
        caption: classed(doc, 'mode-flag', 'is-active') ? 'Flag mode' : 'Dig mode'
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
        progress: clamp(1 - left / 72),
        actions: ['shuffle', 'hint'],
        supply: countText(doc, 'badge-hint'),
        caption: hintedTiles(doc)
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
        marks: marks,
        pieces: pegMarks(doc).map(function (n) {
          if (n === 1) return 'exact';
          if (n === 0.5) return 'partial';
          return 'miss';
        }),
        actions: ['decrypt'],
        supply: countText(doc, 'badge-decrypt'),
        caption: pegCaption(doc)
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
        progress: total ? found / total : 0,
        actions: ['cycle', 'hint'],
        supply: countText(doc, 'hint-count'),
        caption: focusedWord(doc)
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
        marks: [done / 8],
        actions: ['deal', 'hint'],
        supply: countText(doc, 'badge-hints'),
        caption: textOf(doc, 'stock-deals-count')
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
        progress: 0,
        actions: ['play'],
        caption: handCaption(doc)
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

  function clickId(doc, id) {
    const el = doc && doc.getElementById ? doc.getElementById(id) : null;
    if (!el || typeof el.click !== 'function') return false;
    el.click();
    return true;
  }

  function clickFirst(doc, selector) {
    const nodes = list(doc, selector);
    const el = nodes[0];
    if (!el || typeof el.click !== 'function') return false;
    el.click();
    return true;
  }

  const ROUTES = {
    blockblast: {
      rotate: function (doc) { return clickId(doc, 'powerup-rotate-btn'); },
      pause: function (doc) {
        return shown(doc.getElementById('pause-modal')) ? clickId(doc, 'resume-btn') : clickId(doc, 'pause-btn');
      }
    },
    solitaire: {
      hint: function (doc) { return clickId(doc, 'btn-hint'); },
      draw: function (doc) { return clickId(doc, 'stock-slot'); }
    },
    sudoku: {
      hint: function (doc) {
        const first = clickId(doc, 'hint-btn');
        if (doc.getElementById && doc.getElementById('reveal-btn')) clickId(doc, 'reveal-btn');
        return first;
      },
      pause: function (doc) {
        const hooks = root.ArcadeIslandHooks;
        if (!hooks || typeof hooks.togglePause !== 'function') return false;
        return hooks.togglePause(doc) !== false;
      }
    },
    nonogram: {
      row: function (doc) {
        const opened = clickId(doc, 'pwr-hint-btn');
        if (doc.getElementById && doc.getElementById('hint-apply-btn')) clickId(doc, 'hint-apply-btn');
        return opened;
      }
    },
    minesweeper: {
      flag: function (doc) {
        return classed(doc, 'mode-flag', 'is-active') ? clickId(doc, 'mode-dig') : clickId(doc, 'mode-flag');
      },
      pause: function (doc) {
        const game = root.Game;
        const timer = game && game.State && game.State.timer;
        if (!timer || typeof timer.pause !== 'function') return false;
        if (timer.running) timer.pause();
        else if (typeof timer.start === 'function') timer.start();
        const led = doc.getElementById && doc.getElementById('led-timer');
        if (led && led.dataset) led.dataset.paused = timer.running ? '' : '1';
        return true;
      }
    },
    mahjong: {
      hint: function (doc) { return clickId(doc, 'btn-hint'); },
      shuffle: function (doc) { return clickId(doc, 'btn-shuffle'); }
    },
    codebreaker: {
      decrypt: function (doc) { return clickId(doc, 'btn-equip-decrypt'); }
    },
    wordsearch: {
      hint: function (doc) { return clickId(doc, 'hint-btn'); },
      cycle: function (doc) {
        const items = list(doc, '.word-item').filter(function (el) {
          return String(el.className || '').indexOf('found') === -1;
        });
        if (!items.length) return false;
        let index = 0;
        for (let i = 0; i < items.length; i++) {
          if (String(items[i].className || '').indexOf('island-next') !== -1) {
            index = (i + 1) % items.length;
          }
          items[i].className = String(items[i].className || '').replace(/\bisland-next\b/g, '').trim();
        }
        items[index].className = (items[index].className ? items[index].className + ' ' : '') + 'island-next';
        return true;
      }
    },
    spidersolitaire: {
      deal: function (doc) { return clickId(doc, 'stock-card-slot'); },
      hint: function (doc) { return clickId(doc, 'pwr-hint-btn'); }
    },
    spades: {
      play: function (doc) { return clickFirst(doc, '#human-hand .playable'); }
    }
  };

  function applyIntent(request, doc) {
    const page = doc || root.document;
    const action = typeof request === 'string' ? request : (request && request.action);
    const path = (root.location && root.location.pathname) || '';
    const game = (request && request.game) || gameFromPath(path);
    const routes = ROUTES[game];
    const run = routes && action && routes[action];
    if (!run) return Promise.resolve({ ok: false, reason: 'unknown-action', game: game || '', action: action || '' });
    let clicked = false;
    try { clicked = !!run(page); } catch (e) { clicked = false; }
    const reading = read(page, game) || { game: game };
    if (!clicked) reading.caption = reading.caption || 'Nothing to do';
    renderLiveIsland(page, game, reading);
    return bridge.update(reading, true).then(function () {
      return { ok: clicked, reason: clicked ? 'applied' : 'unavailable', game: game, action: action };
    });
  }

  const ACTION_LABELS = {
    rotate: 'Rotate',
    pause: 'Pause',
    hint: 'Hint',
    draw: 'Draw',
    row: 'Hint',
    flag: 'Flag',
    shuffle: 'Shuffle',
    decrypt: 'Decrypt',
    cycle: 'Next',
    deal: 'Deal',
    play: 'Play'
  };

  const GAME_GLYPHS = {
    blockblast: '▦',
    solitaire: '♠',
    sudoku: '#',
    nonogram: '▦',
    minesweeper: '⚑',
    mahjong: '🀄',
    codebreaker: '🔐',
    wordsearch: 'A',
    spidersolitaire: '🕷',
    spades: '♣'
  };

  function escHtml(val) {
    return String(val == null ? '' : val).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function hasHardwareCutout(doc) {
    try {
      const rootEl = doc && doc.documentElement;
      if (!rootEl || typeof getComputedStyle !== 'function') return false;
      const topVar = parseFloat(rootEl.style.getPropertyValue('--safe-top')) || 0;
      return topVar >= 51;
    } catch (e) {
      return false;
    }
  }

  function renderTelemetryGraphic(game, state) {
    const accent = escHtml(state.accent);
    const ink = escHtml(state.ink);
    if (game === 'blockblast') {
      const filled = Math.min(5, Math.floor(((state.marks && state.marks[0]) || 0) * 5));
      let pips = '';
      for (let i = 0; i < 5; i++) {
        pips += '<i style="display:inline-block;width:14px;height:5px;border-radius:99px;background:' +
          (i < filled ? accent : 'rgba(255,255,255,0.2)') + '"></i>';
      }
      const pieces = (state.pieces || []).slice(0, 3).map(function (code) {
        if (!code) return '';
        const rows = String(code).split('/');
        return '<div style="display:inline-flex;flex-direction:column;gap:1px;">' +
          rows.map(function (r) {
            return '<div style="display:flex;gap:1px;">' +
              String(r).split('').map(function (b) {
                return '<b style="width:4px;height:4px;border-radius:1px;display:block;background:' +
                  accent + ';opacity:' + (b === '1' ? '1' : '0.18') + '"></b>';
              }).join('') + '</div>';
          }).join('') + '</div>';
      }).join('');
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 7px;border-radius:8px;background:rgba(0,0,0,0.28);">' +
        '<div><div style="font-size:11px;opacity:0.9;">' + escHtml(state.secondary) + '</div>' +
        '<div style="display:flex;gap:3px;margin-top:4px;">' + pips + '</div></div>' +
        '<div style="display:flex;gap:6px;align-items:center;">' + pieces + '</div></div>';
    }
    if (game === 'solitaire') {
      const suits = ['♠', '♥', '♦', '♣'];
      const suitHtml = suits.map(function (s, idx) {
        const m = (state.marks && state.marks[idx] != null) ? Math.max(0.25, state.marks[idx]) : 0.25;
        const col = (idx === 1 || idx === 2) ? '#e23d3d' : ink;
        return '<span style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;font-size:12px;font-weight:700;color:' + col + '">' +
          s + '<i style="width:16px;height:4px;border-radius:99px;background:' + accent + ';opacity:' + m + '"></i></span>';
      }).join('');
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
        '<div style="display:flex;gap:8px;">' + suitHtml + '</div>' +
        '<span style="font-size:11px;opacity:0.9;">' + escHtml(state.secondary) + '</span></div>';
    }
    if (game === 'nonogram') {
      const cells = [];
      for (let i = 0; i < 64; i++) {
        const v = (state.grid && state.grid[i]) || 0;
        const bg = v === 1 ? accent : (v === 2 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)');
        cells.push('<b style="width:6px;height:6px;display:block;background:' + bg + '"></b>');
      }
      return '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div style="display:grid;grid-template-columns:repeat(8,6px);gap:1px;">' + cells.join('') + '</div>' +
        '<div style="font-size:11px;opacity:0.9;">' + escHtml(state.secondary) +
        (state.detail ? ' · ' + escHtml(state.detail) : '') + '</div></div>';
    }
    if (game === 'codebreaker') {
      const tumblers = [0, 1, 2, 3, 4, 5].map(function (i) {
        const m = (state.marks && state.marks[i]) || 0.2;
        const h = Math.round(6 + m * 10);
        return '<i style="width:7px;height:' + h + 'px;border-radius:2px;background:' + accent +
          ';opacity:' + (m > 0.5 ? '1' : '0.28') + '"></i>';
      }).join('');
      const pegs = (state.pieces || []).slice(0, 8).map(function (p) {
        const c = p === 'exact' ? accent : (p === 'partial' ? ink : 'rgba(255,255,255,0.28)');
        return '<b style="width:6px;height:6px;border-radius:50%;display:inline-block;background:' + c + '"></b>';
      }).join('');
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
        '<div style="display:flex;align-items:flex-end;gap:3px;">' + tumblers + '</div>' +
        '<div style="display:flex;gap:3px;">' + pegs + '</div>' +
        '<span style="font-size:11px;opacity:0.9;">' + escHtml(state.secondary) + '</span></div>';
    }
    if (game === 'spades') {
      return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;">' +
        '<span><strong style="color:' + accent + '">US</strong> ' + escHtml(state.primary) + '</span>' +
        '<span style="opacity:0.85;">' + escHtml(state.detail) + '</span>' +
        '<span><strong style="color:#f87171">AI</strong> ' + escHtml(state.secondary) + '</span></div>';
    }
    const pct = Math.max(4, Math.min(100, Math.round((state.progress || 0) * 100)));
    return '<div style="display:flex;flex-direction:column;gap:4px;">' +
      '<div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.9;">' +
      '<span>' + escHtml(state.secondary) + '</span><span>' + escHtml(state.detail) + '</span></div>' +
      '<div style="height:4px;border-radius:99px;background:rgba(255,255,255,0.14);overflow:hidden;">' +
      '<span style="display:block;height:100%;width:' + pct + '%;background:' + accent + '"></span></div></div>';
  }

  function ensureLiveIslandMount(doc, game) {
    if (!doc || !doc.body || typeof doc.createElement !== 'function' || typeof doc.getElementById !== 'function') {
      return null;
    }
    let host = doc.getElementById('arcade-live-island');
    if (host) return host;
    host = doc.createElement('div');
    host.id = 'arcade-live-island';
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Live Game Dynamic Island');
    if (typeof host.addEventListener === 'function') {
      host.addEventListener('click', function (event) {
        const target = event && event.target;
        const actionBtn = target && typeof target.closest === 'function' ? target.closest('[data-island-action]') : null;
        if (actionBtn) {
          if (event.stopPropagation) event.stopPropagation();
          const act = actionBtn.getAttribute('data-island-action');
          applyIntent({ game: game, action: act }, doc);
          return;
        }
        host.classList.toggle('is-expanded');
      });
    }
    if (typeof doc.addEventListener === 'function') {
      doc.addEventListener('click', function (event) {
        if (!host.classList || !host.classList.contains('is-expanded')) return;
        const target = event && event.target;
        if (target && host.contains && !host.contains(target)) {
          host.classList.remove('is-expanded');
        }
      });
    }
    doc.body.appendChild(host);
    return host;
  }

  function renderLiveIsland(doc, game, reading) {
    const state = present(game, reading);
    if (!state) return;
    const host = ensureLiveIslandMount(doc, game);
    if (!host) return;
    const cutout = hasHardwareCutout(doc);
    if (host.classList) {
      host.classList.toggle('has-hardware-cutout', cutout);
    }
    if (host.style && typeof host.style.setProperty === 'function') {
      host.style.setProperty('--island-accent', state.accent);
      host.style.setProperty('--island-surface', state.surface);
      host.style.setProperty('--island-ink', state.ink);
    }

    const glyph = GAME_GLYPHS[game] || '🕹';
    const primaryColor = state.alert ? '#ff5a5a' : state.ink;
    const primaryText = state.celebrate ? 'Won' : state.primary;
    const dangerDot = state.alert ? '<span class="island-danger-dot" aria-hidden="true"></span>' : '';

    const controlsHtml = (state.actions || []).slice(0, 3).map(function (act) {
      let label = ACTION_LABELS[act] || act;
      let active = false;
      if (act === 'pause' && state.paused) { label = 'Resume'; active = true; }
      if (act === 'flag' && state.flagMode) { active = true; }
      return '<button type="button" class="island-action-btn' + (active ? ' is-active' : '') +
        '" data-island-action="' + escHtml(act) + '">' + escHtml(label) + '</button>';
    }).join('');

    const supplyBadge = state.supply > 0
      ? '<span style="font-size:11px;font-weight:700;color:' + escHtml(state.accent) + ';margin-left:auto;">' + state.supply + ' left</span>'
      : '';

    host.innerHTML =
      '<div class="island-compact" title="Tap to expand live Dynamic Island controls">' +
        '<span class="island-wing-left">' +
          '<span class="island-mark">' + escHtml(glyph) + '</span>' +
        '</span>' +
        '<span class="island-cutout-spacer">' + escHtml(state.gameName) + '</span>' +
        '<span class="island-wing-right">' +
          dangerDot +
          '<span class="island-primary" style="color:' + escHtml(primaryColor) + '">' + escHtml(primaryText) + '</span>' +
        '</span>' +
      '</div>' +
      '<div class="island-expanded-body">' +
        '<div class="island-exp-head">' +
          '<span class="island-exp-title">' +
            '<span class="island-mark">' + escHtml(glyph) + '</span>' +
            '<span>' + escHtml(state.gameName) + '</span>' +
            (state.streak > 0 ? '<span class="island-exp-streak">🔥 ' + state.streak + '</span>' : '') +
          '</span>' +
          '<span class="island-primary" style="color:' + escHtml(primaryColor) + '">' + dangerDot + escHtml(primaryText) + ' ▴</span>' +
        '</div>' +
        renderTelemetryGraphic(game, state) +
        (state.caption ? '<div style="font-size:11px;opacity:0.88;">' + escHtml(state.caption) + '</div>' : '') +
        '<div class="island-exp-controls">' + controlsHtml + supplyBadge + '</div>' +
      '</div>';
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
    let cheered = false;

    let timer = null;

    function tick() {
      const page = doc || root.document;
      const reading = read(page, game);
      if (!reading) return;
      renderLiveIsland(page, game, reading);
      if (!started) {
        started = true;
        bridge.start(reading);
        lastPhase = reading.phase;
        return;
      }
      const immediate = reading.phase !== lastPhase;
      if ((reading.phase === 'won' || reading.highScore) && !cheered) {
        reading.chime = true;
        reading.celebrate = reading.phase === 'won' || !!reading.highScore;
        cheered = true;
      }
      lastPhase = reading.phase;
      if (reading.phase === 'won' || reading.phase === 'lost') {
        if (timer) clearInterval(timer);
        watching = false;
        renderLiveIsland(page, game, reading);
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
    applyIntent: applyIntent,
    routes: ROUTES,
    watch: watch,
    renderLiveIsland: renderLiveIsland
  };

  root.ArcadeIsland = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
