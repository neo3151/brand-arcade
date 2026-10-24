/**
 * Arcade Shop. The only hub screen with a buy button, a tip button, or restore.
 * Game shelves and the Passport link here. They do not sell.
 */
(function (root) {
  'use strict';

  const SHELVES = [
    ['Block Blast', 'blockblast/www/store.html'],
    ['Minesweeper', 'minesweeper/www/store.html'],
    ['Codebreaker', 'codebreaker/www/store.html'],
    ['Mahjong', 'mahjong/www/store.html'],
    ['Word Search', 'wordsearch/www/store.html'],
    ['Sudoku', 'sudoku/www/store.html'],
    ['Nonogram', 'nonogram/www/store.html'],
    ['Solitaire', 'solitaire/www/store.html'],
    ['Spider Solitaire', 'spidersolitaire/www/store.html'],
    ['Spades', 'spades/www/store.html']
  ];

  const GROUPS = {
    blockblast: 'Block Blast',
    minesweeper: 'Minesweeper',
    codebreaker: 'Codebreaker',
    mahjong: 'Mahjong',
    wordsearch: 'Word Search',
    sudoku: 'Sudoku',
    nonogram: 'Nonogram',
    solitaire: 'Solitaire',
    spidersolitaire: 'Spider Solitaire',
    spades: 'Spades',
    cardroom: 'Card games'
  };

  const BLURBS = {
    vectrex: '1982 vector-monitor phosphor lines on a dark tube.',
    c64: '1982 breadbin blue bezel with classic light-blue phosphor.',
    tron: 'Black glass cabinet with electric cyan and magenta grid light.',
    marble: 'Cool stone cabinet with veined marble blocks. Preview on the Block Blast shelf.',
    walnut: 'Dark burl wood cabinet with a warm brass hairline. Preview on the Block Blast shelf.',
    stainedglass: 'Leaded jewel-tone glass on a midnight grid. Preview on the Block Blast shelf.',
    'solitaire-atelier': 'Noir Atelier and Burgundy Felt card backs and table cloth.',
    'spider-atelier': 'Violet Web and Emerald Cloth card backs and manor baize.',
    'spades-salon': 'Monte Carlo casino baize and champagne Art Deco salon decks.',
    'mahjong-tiles': 'Ivory, Bamboo, and Porcelain Blue carved tile faces.',
    'minesweeper-sectors': 'Europa Ice and Venus Acid sector themes with custom flag and blast colors.',
    'codebreaker-terminals': 'Green Phosphor, Amber CRT, and Hacker Red terminal consoles.',
    'sudoku-ink': 'Washi paper, Night Ink, and Sumi-e brush calligraphy grids.',
    'nonogram-mosaic': 'Kintsugi gold seam and Indigo Mosaic tile themes.',
    'wordsearch-atlas': 'Cartographic Atlas parchment and Neon Ink letter grids.',
    explorer: 'Five extra word categories: Mythology, Cooking, US National Parks, Ocean Life, and Kids.',
    layouts: 'Ten extra 144-tile solvable Mahjong layouts, including Pagoda, Lotus, and Empress Crown.',
    holiday: 'Twenty-five hand-drawn, uniquely solvable holiday nonogram pictures.',
    animals: 'Twenty-five hand-drawn, uniquely solvable animal nonogram pictures.',
    curated: 'One hundred verified winnable draw-1 Klondike deals outside deals 1–1,000.',
    heist: 'Fifteen narrative vault missions with custom story briefings.'
  };

  const SWATCHES = {
    patron: ['#e6b325', '#3d2b08', '#f8e7b0'],
    complete: ['#e6b325', '#06b6d4', '#ec4899', '#10b981'],
    vectrex: ['#7CFFCB', '#d6fff6', '#04120e'],
    c64: ['#6c5eb5', '#aeadff', '#352879'],
    tron: ['#00fff6', '#ff2bd6', '#05070d'],
    marble: ['#eef3ef', '#7d756c', '#2a2622'],
    walnut: ['#c4a574', '#5c3419', '#1a0e08'],
    stainedglass: ['#c084fc', '#38bdf8', '#f43f5e'],
    'solitaire-atelier': ['#111111', '#4a1020', '#e5e7eb'],
    'spider-atelier': ['#2e1064', '#022c22', '#c4b5fd'],
    cardroom: ['#3f1d12', '#1c1408', '#4a1020', '#022c22'],
    'spades-salon': ['#3f1d12', '#e6b325', '#f5d0a9'],
    'mahjong-tiles': ['#f7f1e6', '#4ade80', '#93c5fd'],
    'minesweeper-sectors': ['#bae6fd', '#0c4a6e', '#f9a8d4'],
    'codebreaker-terminals': ['#4ade80', '#f59e0b', '#f87171'],
    'sudoku-ink': ['#faf6ef', '#0f172a', '#52525b'],
    'nonogram-mosaic': ['#e6b325', '#818cf8', '#1e1b4b'],
    'wordsearch-atlas': ['#38bdf8', '#f472b6', '#082f49'],
    explorer: ['#38bdf8', '#34d399', '#fbbf24'],
    layouts: ['#10b981', '#065f46', '#a7f3d0'],
    holiday: ['#ef4444', '#22c55e', '#facc15'],
    animals: ['#f59e0b', '#10b981', '#3b82f6'],
    curated: ['#d4a017', '#0e3b28', '#f4f1e8'],
    heist: ['#e6b325', '#ef4444', '#14110c'],
    puzzler: ['#10b981', '#38bdf8', '#f59e0b', '#ec4899'],
    'tip-coffee': ['#d97706', '#78350f'],
    'tip-lunch': ['#10b981', '#065f46'],
    'tip-dinner': ['#c084fc', '#4c1d95']
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  let pendingNote = '';

  function store() {
    return root.ArcadeStore || null;
  }

  function catalog() {
    const api = store();
    return api && Array.isArray(api.CATALOG) ? api.CATALOG : [];
  }

  function findId(id) {
    const rows = catalog();
    for (let i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
    return null;
  }

  function groupOf(item) {
    if (item.productId.indexOf('.arcade.crt.') !== -1) return 'Cabinet phosphors';
    const match = item.productId.match(/benchmarkarcade\.([a-z0-9]+)\./);
    const key = match && match[1];
    return GROUPS[key] || 'Other';
  }

  function owned(item) {
    const api = store();
    if (!item || !item.entitlementId || !api || typeof api.owns !== 'function') return false;
    return api.owns(item.entitlementId);
  }

  function priceLabel(item, verb) {
    const api = store();
    const price = api && typeof api.getPrice === 'function' ? api.getPrice(item.productId) : null;
    const id = ' data-product-id="' + esc(item.productId) + '"';
    if (!price) return '<button type="button" class="shop-buy" disabled' + id + '>Unavailable</button>';
    return '<button type="button" class="shop-buy" data-shop-action="buy"' + id + '>' +
      esc(price) + ' · ' + verb + '</button>';
  }

  function action(item) {
    if (item.kind !== 'tip' && owned(item)) return '<span class="shop-owned">Owned</span>';
    return priceLabel(item, item.kind === 'tip' ? 'Tip' : 'Buy');
  }

  function swatchDots(id) {
    const palette = SWATCHES[id];
    if (!palette || !palette.length) return '';
    return '<span class="shop-swatches" aria-hidden="true">' +
      palette.map(color => '<i class="shop-swatch-dot" style="background:' + esc(color) + '"></i>').join('') +
      '</span>';
  }

  function card(item, copy) {
    let targetHash = '';
    try {
      targetHash = (root.location && root.location.hash) || '';
    } catch (e) { targetHash = ''; }
    const isTarget = targetHash === '#shop-' + item.id;
    return '<article class="shop-card' + (isTarget ? ' shop-card--target' : '') + '" id="shop-' + esc(item.id) + '" data-product-id="' + esc(item.productId) + '">' +
      '<div class="shop-card__body"><div class="shop-card__head">' + swatchDots(item.id) + '<h3>' + esc(item.name) + '</h3></div><p>' + copy + '</p></div>' +
      action(item) + '</article>';
  }

  function savingsLine() {
    const api = store();
    const saved = api && typeof api.savings === 'function' ? api.savings() : null;
    if (!saved || !saved.formatted) {
      return '<p class="shop-save">Includes 24 packs, themes, and expansions across all 10 games. When the store sends localized prices, this line shows the difference versus buying the included items separately.</p>';
    }
    return '<p class="shop-save">Save ' + esc(saved.formatted) + ' compared with buying the ' +
      saved.pieces + ' included items separately.</p>';
  }

  function separateCards() {
    const groups = {};
    catalog().forEach(item => {
      if (!item.inCompleteCollection || item.bundle || item.kind === 'patron') return;
      const name = groupOf(item);
      if (!groups[name]) groups[name] = [];
      groups[name].push(item);
    });
    return Object.keys(groups).map(name => {
      const rows = groups[name].map(item => card(item, esc(BLURBS[item.id] || 'Sold on its own. Preview it on the matching game shelf.'))).join('');
      return '<section class="shop-block"><h2>' + esc(name) + '</h2>' + rows + '</section>';
    }).join('');
  }

  function fromGameBanner() {
    let search = '';
    try {
      search = (root.location && root.location.search) || '';
    } catch (e) { search = ''; }
    if (!search || typeof URLSearchParams !== 'function') return '';
    const from = new URLSearchParams(search).get('from');
    if (!from || !GROUPS[from] || from === 'cardroom') return '';
    return '<p class="shop-return-game"><a href="' + esc(from) + '/www/store.html">← Return to ' + esc(GROUPS[from]) + ' shelf</a></p>';
  }

  function render() {
    const patron = findId('patron');
    const complete = findId('complete');
    const bundles = catalog().filter(item => item.bundle && item.id !== 'complete');
    const tips = catalog().filter(item => item.kind === 'tip');
    const api = store();
    const tier = api && typeof api.supporterTier === 'function' ? api.supporterTier() : null;
    const note = pendingNote || (api && typeof api.lastTipMessage === 'function' ? api.lastTipMessage() : '');
    const count = api && typeof api.tipCount === 'function' ? api.tipCount() : 0;

    let html = fromGameBanner();
    if (api && typeof api.devUnlockAll === 'function' && api.devUnlockAll()) {
      html += '<p class="shop-dev-unlock" data-dev-unlock="1">DEV UNLOCK</p>';
    }
    html += '<button type="button" id="btn-restore-purchases" class="shop-restore">Restore purchases</button>';
    html += '<p id="shop-note" class="shop-note">' + esc(note) + '</p>';

    if (patron) {
      html += '<section class="shop-block"><h2>Patron</h2>' +
        card(patron, 'A thank-you badge and a gold cabinet bezel. 0 XP. Not a trophy.') +
        '</section>';
    }
    if (complete) {
      html += '<section class="shop-block"><h2>Complete Collection</h2>' +
        card(complete, 'Patron, every premium CRT phosphor, every cosmetic pack including Card Room, and every content pack. Future catalog rows join only when they are opted in.') +
        savingsLine() + '</section>';
    }
    html += '<section class="shop-block"><h2>Bundles</h2>' +
      bundles.map(item => card(item, item.id === 'cardroom'
        ? 'Solitaire atelier, Spider atelier, and the Spades salon.'
        : 'Holiday pictures, animal pictures, the jade layouts, and World Explorer.')).join('') +
      '</section>';
    html += '<section class="shop-block" id="shop-tips"><h2>Tip jar</h2>' +
      '<p class="shop-fine">Coffee, lunch, and dinner are consumable thank-yous. Each one adds a permanent supporter stamp on the Passport. The stamp grants 0 XP and gives nothing functional: no hints, no scores, no easier rules.</p>' +
      (tier ? '<p class="shop-stamp" data-supporter-stamp="' + esc(tier.id) + '">' + esc(tier.name) + ' · ' + count + ' tips · 0 XP</p>' : '') +
      tips.map(item => card(item, 'A thank-you. Nothing functional.')).join('') +
      '</section>';
    html += '<section class="shop-block"><h2>Game shelves</h2><ul class="shop-shelves">' +
      SHELVES.map(row => '<li><a href="' + esc(row[1]) + '">' + esc(row[0]) + '</a></li>').join('') +
      '</ul></section>';
    html += separateCards();
    return html;
  }

  function boot() {
    const host = root.document && root.document.getElementById('arcade-shop');
    if (!host) return;
    host.innerHTML = render();
    const buttons = host.querySelectorAll('[data-shop-action="buy"]');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (event) {
        const button = event.currentTarget;
        const productId = button.getAttribute('data-product-id');
        const api = store();
        if (!api || typeof api.purchase !== 'function') return;
        button.disabled = true;
        Promise.resolve(api.purchase(productId)).then(function (result) {
          if (result && result.message) pendingNote = result.message;
          else if (result && result.reason === 'unavailable') {
            pendingNote = 'Unavailable in this browser. The Benchmark Arcade app can buy these.';
          }
          boot();
        }).catch(function () {
          button.disabled = false;
        });
      });
    }
    const restore = root.document.getElementById('btn-restore-purchases');
    if (restore) {
      restore.addEventListener('click', function () {
        const api = store();
        if (!api || typeof api.restore !== 'function') return;
        Promise.resolve(api.restore()).then(function (result) {
          if (result && result.ok) pendingNote = 'Purchases restored.';
          else if (result && result.reason === 'unavailable') pendingNote = 'Restore is available in the Benchmark Arcade app. This website stays free.';
          else pendingNote = 'Restore could not be completed.';
          boot();
        }).catch(function () {
          pendingNote = 'Restore could not be completed.';
          boot();
        });
      });
    }
  }

  if (store() && typeof store().on === 'function') store().on('change', boot);
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }

  root.ArcadeShop = { boot: boot, render: render, SHELVES: SHELVES };
})(typeof window !== 'undefined' ? window : globalThis);
