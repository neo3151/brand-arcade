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

  function card(item, copy) {
    return '<article class="shop-card" id="shop-' + esc(item.id) + '" data-product-id="' + esc(item.productId) + '">' +
      '<div><h3>' + esc(item.name) + '</h3><p>' + copy + '</p></div>' +
      action(item) + '</article>';
  }

  function savingsLine() {
    const api = store();
    const saved = api && typeof api.savings === 'function' ? api.savings() : null;
    if (!saved || !saved.formatted) {
      return '<p class="shop-save">When the store sends localized prices, this line shows the difference versus buying the included items separately.</p>';
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
      const rows = groups[name].map(item => card(item, 'Sold on its own. The matching shelf is only a preview.')).join('');
      return '<section class="shop-block"><h2>' + esc(name) + '</h2>' + rows + '</section>';
    }).join('');
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

    let html = '<button type="button" id="btn-restore-purchases" class="shop-restore">Restore purchases</button>';
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
