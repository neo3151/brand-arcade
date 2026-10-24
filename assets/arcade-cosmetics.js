/**
 * arcade-cosmetics.js — Paid per-game looks for the hub app.
 *
 * Coin-earnable themes stay on their own storage keys. Paid looks live in
 * localStorage arcade_cosmetic_v1 and paint only when ArcadeStore.owns the
 * entitlement (or Card Room, which covers the solitaire, spider, and spades
 * salon looks). ?theme=<id> previews a paid look without saving it.
 *
 * Standalone game webviews open /index.html. The loader in each game page
 * returns before requesting this file, so those apps stay free.
 */
(function (root) {
  'use strict';

  const SELECTION_KEY = 'arcade_cosmetic_v1';
  const GAME_IDS = [
    'spidersolitaire', 'wordsearch', 'codebreaker', 'minesweeper', 'nonogram',
    'blockblast', 'solitaire', 'mahjong', 'sudoku', 'spades'
  ];

  const PRODUCTS = [
    {
      id: 'marble',
      kind: 'skin',
      game: 'blockblast',
      name: 'Marble',
      productId: 'com.gamingempire.benchmarkarcade.blockblast.skin.marble',
      entitlementId: 'blockblast_skin_marble',
      blurb: 'Cool stone cabinet with veined blocks.'
    },
    {
      id: 'walnut',
      kind: 'skin',
      game: 'blockblast',
      name: 'Walnut Inlay',
      productId: 'com.gamingempire.benchmarkarcade.blockblast.skin.walnut',
      entitlementId: 'blockblast_skin_walnut',
      blurb: 'Dark burl and a brass hairline.'
    },
    {
      id: 'stainedglass',
      kind: 'skin',
      game: 'blockblast',
      name: 'Stained Glass',
      productId: 'com.gamingempire.benchmarkarcade.blockblast.skin.stainedglass',
      entitlementId: 'blockblast_skin_stainedglass',
      blurb: 'Leaded jewel tones on a dark grid.'
    },
    {
      id: 'solitaire-atelier',
      kind: 'pack',
      game: 'solitaire',
      name: 'Atelier Felts & Backs',
      productId: 'com.gamingempire.benchmarkarcade.solitaire.pack.atelier',
      entitlementId: 'solitaire_pack_atelier',
      alsoEntitlements: ['cardroom_pack'],
      blurb: 'Noir and burgundy cloth, with matching card backs.'
    },
    {
      id: 'spider-atelier',
      kind: 'pack',
      game: 'spidersolitaire',
      name: 'Atelier Felts & Backs',
      productId: 'com.gamingempire.benchmarkarcade.spidersolitaire.pack.atelier',
      entitlementId: 'spidersolitaire_pack_atelier',
      alsoEntitlements: ['cardroom_pack'],
      blurb: 'Violet web and emerald cloth, with matching card backs.'
    },
    {
      id: 'cardroom',
      kind: 'pack',
      game: 'cardroom',
      games: ['solitaire', 'spidersolitaire', 'spades'],
      name: 'Card Room',
      productId: 'com.gamingempire.benchmarkarcade.cardroom.pack.cardroom',
      entitlementId: 'cardroom_pack',
      grants: ['solitaire_pack_atelier', 'spidersolitaire_pack_atelier', 'spades_pack_salon'],
      blurb: 'Solitaire and Spider atelier looks, plus Monte Carlo and Art Deco for Spades.',
      includes: ['Noir Atelier', 'Burgundy Felt', 'Violet Web', 'Emerald Cloth', 'Monte Carlo', 'Art Deco']
    },
    {
      id: 'spades-salon',
      kind: 'pack',
      game: 'spades',
      name: 'Monte Carlo & Art Deco',
      productId: 'com.gamingempire.benchmarkarcade.spades.pack.salon',
      entitlementId: 'spades_pack_salon',
      alsoEntitlements: ['cardroom_pack'],
      blurb: 'Casino baize or a champagne geometric salon. Decks follow the cloth.'
    },
    {
      id: 'mahjong-tiles',
      kind: 'pack',
      game: 'mahjong',
      name: 'Ivory, Bamboo & Porcelain',
      productId: 'com.gamingempire.benchmarkarcade.mahjong.pack.tiles',
      entitlementId: 'mahjong_pack_tiles',
      blurb: 'Three tile faces. The layouts do not change.'
    },
    {
      id: 'minesweeper-sectors',
      kind: 'pack',
      game: 'minesweeper',
      name: 'Europa Ice & Venus Acid',
      productId: 'com.gamingempire.benchmarkarcade.minesweeper.pack.sectors',
      entitlementId: 'minesweeper_pack_sectors',
      blurb: 'Sector cloth, flags, and blast colors. The grid plays the same.'
    },
    {
      id: 'codebreaker-terminals',
      kind: 'pack',
      game: 'codebreaker',
      name: 'Phosphor, Amber & Hacker Red',
      productId: 'com.gamingempire.benchmarkarcade.codebreaker.pack.terminals',
      entitlementId: 'codebreaker_pack_terminals',
      blurb: 'Three terminal phosphors. Clue pegs stay readable.'
    },
    {
      id: 'sudoku-ink',
      kind: 'pack',
      game: 'sudoku',
      name: 'Washi, Night Ink & Sumi-e',
      productId: 'com.gamingempire.benchmarkarcade.sudoku.pack.ink',
      entitlementId: 'sudoku_pack_ink',
      blurb: 'Paper and ink for the grid. Given digits stay given.'
    },
    {
      id: 'nonogram-mosaic',
      kind: 'pack',
      game: 'nonogram',
      name: 'Mosaic Themes',
      productId: 'com.gamingempire.benchmarkarcade.nonogram.pack.mosaic',
      entitlementId: 'nonogram_pack_mosaic',
      blurb: 'Kintsugi gold and indigo grout. Clues and fills play the same.'
    },
    {
      id: 'wordsearch-atlas',
      kind: 'pack',
      game: 'wordsearch',
      name: 'Atlas Themes',
      productId: 'com.gamingempire.benchmarkarcade.wordsearch.pack.atlas',
      entitlementId: 'wordsearch_pack_atlas',
      blurb: 'Map paper or neon ink. Words are still the words.'
    }
  ];

  function skin(id, game, name, packId, productId, entitlementId, alsoEntitlements, solo) {
    return {
      id: id,
      game: game,
      name: name,
      packId: packId,
      productId: productId,
      entitlementId: entitlementId,
      alsoEntitlements: alsoEntitlements || [],
      solo: !!solo
    };
  }

  function product(id) {
    for (let i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }

  const atelier = product('solitaire-atelier');
  const spider = product('spider-atelier');
  const salon = product('spades-salon');
  const tiles = product('mahjong-tiles');
  const sectors = product('minesweeper-sectors');
  const terminals = product('codebreaker-terminals');
  const ink = product('sudoku-ink');
  const mosaic = product('nonogram-mosaic');
  const atlas = product('wordsearch-atlas');

  const SKINS = [
    skin('marble', 'blockblast', 'Marble', 'marble', product('marble').productId, product('marble').entitlementId, [], true),
    skin('walnut', 'blockblast', 'Walnut Inlay', 'walnut', product('walnut').productId, product('walnut').entitlementId, [], true),
    skin('stainedglass', 'blockblast', 'Stained Glass', 'stainedglass', product('stainedglass').productId, product('stainedglass').entitlementId, [], true),
    skin('solitaire-noir', 'solitaire', 'Noir Atelier', atelier.id, atelier.productId, atelier.entitlementId, atelier.alsoEntitlements),
    skin('solitaire-burgundy', 'solitaire', 'Burgundy Felt', atelier.id, atelier.productId, atelier.entitlementId, atelier.alsoEntitlements),
    skin('spider-violet', 'spidersolitaire', 'Violet Web', spider.id, spider.productId, spider.entitlementId, spider.alsoEntitlements),
    skin('spider-emerald', 'spidersolitaire', 'Emerald Cloth', spider.id, spider.productId, spider.entitlementId, spider.alsoEntitlements),
    skin('montecarlo', 'spades', 'Monte Carlo', salon.id, salon.productId, salon.entitlementId, salon.alsoEntitlements),
    skin('artdeco', 'spades', 'Art Deco', salon.id, salon.productId, salon.entitlementId, salon.alsoEntitlements),
    skin('ivory', 'mahjong', 'Ivory', tiles.id, tiles.productId, tiles.entitlementId),
    skin('bamboo', 'mahjong', 'Bamboo', tiles.id, tiles.productId, tiles.entitlementId),
    skin('porcelain', 'mahjong', 'Porcelain Blue', tiles.id, tiles.productId, tiles.entitlementId),
    skin('europa', 'minesweeper', 'Europa Ice', sectors.id, sectors.productId, sectors.entitlementId),
    skin('venus', 'minesweeper', 'Venus Acid', sectors.id, sectors.productId, sectors.entitlementId),
    skin('phosphor', 'codebreaker', 'Green Phosphor', terminals.id, terminals.productId, terminals.entitlementId),
    skin('amber', 'codebreaker', 'Amber', terminals.id, terminals.productId, terminals.entitlementId),
    skin('hacker', 'codebreaker', 'Hacker Red', terminals.id, terminals.productId, terminals.entitlementId),
    skin('washi', 'sudoku', 'Washi', ink.id, ink.productId, ink.entitlementId),
    skin('nightink', 'sudoku', 'Night Ink', ink.id, ink.productId, ink.entitlementId),
    skin('sumie', 'sudoku', 'Sumi-e', ink.id, ink.productId, ink.entitlementId),
    skin('kintsugi', 'nonogram', 'Kintsugi', mosaic.id, mosaic.productId, mosaic.entitlementId),
    skin('indigo', 'nonogram', 'Indigo Mosaic', mosaic.id, mosaic.productId, mosaic.entitlementId),
    skin('atlas', 'wordsearch', 'Atlas', atlas.id, atlas.productId, atlas.entitlementId),
    skin('neonink', 'wordsearch', 'Neon Ink', atlas.id, atlas.productId, atlas.entitlementId)
  ];

  const listeners = [];
  let bound = false;
  let listening = false;

  function emit() {
    listeners.slice().forEach(fn => {
      try { fn(); } catch (e) { /* a shelf listener cannot break equip */ }
    });
  }

  function on(event, cb) {
    if (event !== 'change' || typeof cb !== 'function') return function () {};
    listeners.push(cb);
    return function () {
      const index = listeners.indexOf(cb);
      if (index >= 0) listeners.splice(index, 1);
    };
  }

  function storage() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    } catch (e) { /* private mode */ }
    return null;
  }

  function readSelection() {
    const store = storage();
    if (!store) return {};
    try {
      const raw = store.getItem(SELECTION_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function writeSelection(value) {
    const store = storage();
    if (!store) return;
    try {
      store.setItem(SELECTION_KEY, JSON.stringify(value));
    } catch (e) { /* quota */ }
  }

  function findSkin(id) {
    for (let i = 0; i < SKINS.length; i++) {
      if (SKINS[i].id === id) return SKINS[i];
    }
    return null;
  }

  function detectGame(pathname) {
    const parts = String(pathname || '').split('/').filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i].replace(/\.html?$/i, '');
      if (GAME_IDS.indexOf(name) !== -1) return name;
    }
    return null;
  }

  function shouldLoad(pathname) {
    const parts = String(pathname || '').split('/').filter(Boolean);
    if (parts.length && /\.[a-z0-9]+$/i.test(parts[parts.length - 1])) parts.pop();
    return parts.length >= 1;
  }

  function ownsEntitlement(id) {
    return !!(id && root.ArcadeStore && typeof root.ArcadeStore.owns === 'function' && root.ArcadeStore.owns(id));
  }

  function ownsSkin(skinId) {
    const item = typeof skinId === 'string' ? findSkin(skinId) : skinId;
    if (!item) return false;
    if (ownsEntitlement(item.entitlementId)) return true;
    const extra = item.alsoEntitlements || [];
    for (let i = 0; i < extra.length; i++) {
      if (ownsEntitlement(extra[i])) return true;
    }
    return false;
  }

  function ownsPack(pack) {
    if (!pack) return false;
    if (ownsEntitlement(pack.entitlementId)) return true;
    const extra = pack.alsoEntitlements || [];
    for (let i = 0; i < extra.length; i++) {
      if (ownsEntitlement(extra[i])) return true;
    }
    if (pack.grants && pack.grants.length) {
      for (let g = 0; g < pack.grants.length; g++) {
        if (!ownsEntitlement(pack.grants[g])) return false;
      }
      return true;
    }
    return false;
  }

  function isPaidTheme(game, id) {
    const item = findSkin(id);
    return !!(item && item.game === game);
  }

  function equippedId(game) {
    const saved = readSelection()[game];
    const item = saved && findSkin(saved);
    if (item && item.game === game && ownsSkin(item)) return item.id;
    return '';
  }

  function currentPreview() {
    try {
      const search = (root.location && root.location.search) || '';
      return new URLSearchParams(search).get('theme');
    } catch (e) {
      return null;
    }
  }

  function pageGame() {
    const loc = root.location || {};
    return detectGame(loc.pathname || '');
  }

  function paint(item, preview) {
    const html = root.document && root.document.documentElement;
    if (!html || !html.dataset) return;
    html.dataset.paidSkin = item.id;
    if (preview) html.dataset.paidPreview = '1';
    else delete html.dataset.paidPreview;
    if (item.game === 'blockblast' && root.document.body && root.document.body.dataset) {
      root.document.body.dataset.theme = item.id;
    }
  }

  function clearPaint(gameId) {
    const html = root.document && root.document.documentElement;
    if (html && html.dataset && html.dataset.paidSkin) {
      const item = findSkin(html.dataset.paidSkin);
      if (!item || item.game === gameId) delete html.dataset.paidSkin;
    }
    if (html && html.dataset) delete html.dataset.paidPreview;
    if (gameId === 'blockblast' && root.document && root.document.body && root.document.body.dataset) {
      const coin = root.Progress && typeof root.Progress.getSelectedTheme === 'function'
        ? root.Progress.getSelectedTheme()
        : 'aurora';
      root.document.body.dataset.theme = coin;
    }
  }

  function applyActive() {
    const game = pageGame();
    if (!game) return;
    const previewId = currentPreview();
    if (previewId) {
      const previewSkin = findSkin(previewId);
      if (previewSkin && previewSkin.game === game) {
        paint(previewSkin, true);
        return;
      }
      if (game === 'blockblast') return;
    }
    const equipped = equippedId(game);
    if (equipped) paint(findSkin(equipped), false);
    else clearPaint(game);
  }

  function priceText(productId) {
    const store = root.ArcadeStore;
    if (!store || typeof store.getPrice !== 'function') return null;
    const price = store.getPrice(productId);
    return price ? String(price) : null;
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function shopLink(productId, itemId, gameId) {
    const href = (root.ArcadeStore && typeof root.ArcadeStore.shopHref === 'function')
      ? root.ArcadeStore.shopHref(itemId, gameId)
      : 'shop.html';
    const id = productId ? ' data-product-id="' + esc(productId) + '"' : '';
    return '<a class="paid-shop-link"' + id + ' href="' + esc(href) + '">Arcade Shop</a>';
  }

  function skinActions(item, owned) {
    const preview = '<a class="paid-preview" href="game.html?theme=' + esc(item.id) + '">Preview</a>';
    if (!owned) return preview;
    if (equippedId(item.game) === item.id) {
      return '<button type="button" class="paid-equip" disabled>Equipped</button>';
    }
    return '<button type="button" class="paid-equip" data-paid-action="equip" data-paid-id="' +
      esc(item.id) + '">Equip</button>' + preview;
  }

  function skinCard(item, owned) {
    return '<article class="paid-skin" data-skin="' + esc(item.id) + '">' +
      '<div class="paid-swatch paid-swatch--' + esc(item.id) + '" aria-hidden="true"></div>' +
      '<div class="paid-skin__copy"><h3>' + esc(item.name) + '</h3>' +
      '<div class="paid-skin__actions">' + skinActions(item, owned) + '</div></div></article>';
  }

  function packsFor(game) {
    return PRODUCTS.filter(item => {
      if (item.kind !== 'pack') return false;
      if (item.game === game) return true;
      return !!(item.games && item.games.indexOf(game) !== -1);
    });
  }

  function renderShelf() {
    const doc = root.document;
    if (!doc || typeof doc.getElementById !== 'function') return;
    const host = doc.getElementById('paid-cosmetic-shelf');
    if (!host) return;
    const game = pageGame();
    if (!game) {
      host.innerHTML = '';
      return;
    }
    const solos = SKINS.filter(item => item.solo && item.game === game);
    const packs = packsFor(game);
    let html = '<section class="paid-shelf"><header class="paid-shelf__lead">' +
      '<h2>Cabinet skins</h2>' +
      '<p>Optional looks beside the coin cosmetics. They do not change the rules. Buying stays on the Arcade Shop.</p>' +
      '</header>';
    solos.forEach(item => {
      const owned = ownsSkin(item);
      html += '<article class="paid-pack">' +
        '<header class="paid-pack__bar"><div><h3>' + esc(item.name) + '</h3><p>' +
        esc(product(item.packId).blurb) + '</p></div>' +
        (owned ? '<span class="paid-owned">Owned</span>' : shopLink(item.productId, item.packId, game)) +
        '</header>' + skinCard(item, owned) + '</article>';
    });
    packs.forEach(pack => {
      const owned = ownsPack(pack);
      const skins = SKINS.filter(item => item.game === game && item.packId === pack.id);
      html += '<article class="paid-pack' + (pack.id === 'cardroom' ? ' paid-pack--bundle' : '') + '">' +
        '<header class="paid-pack__bar"><div><h3>' + esc(pack.name) + '</h3><p>' + esc(pack.blurb) + '</p></div>' +
        (owned ? '<span class="paid-owned">Owned</span>' : shopLink(pack.productId, pack.id, game)) +
        '</header>';
      if (skins.length) {
        html += '<div class="paid-skin-row">';
        skins.forEach(item => { html += skinCard(item, owned); });
        html += '</div>';
      } else if (pack.includes) {
        html += '<ul class="paid-includes">' + pack.includes.map(name => '<li>' + esc(name) + '</li>').join('') + '</ul>';
      }
      html += '</article>';
    });
    html += '</section>';
    host.innerHTML = html;
  }

  function firstGrantedSkin(productId) {
    const game = pageGame();
    const pack = PRODUCTS.filter(item => item.productId === productId)[0];
    if (!pack) return null;
    if (pack.kind === 'skin') return findSkin(pack.id);
    const direct = SKINS.filter(item => item.productId === productId && (!game || item.game === game));
    if (direct.length) return direct[0];
    if (pack.entitlementId === 'cardroom_pack') {
      const fromRoom = SKINS.filter(item => item.game === game && (item.alsoEntitlements || []).indexOf('cardroom_pack') !== -1);
      if (fromRoom.length) return fromRoom[0];
    }
    return null;
  }

  async function buy(productId) {
    const store = root.ArcadeStore;
    if (!store || typeof store.purchase !== 'function') return { ok: false, reason: 'unavailable' };
    let result;
    try {
      result = await store.purchase(productId);
    } catch (e) {
      result = { ok: false, reason: 'failed' };
    }
    if (result && result.ok) {
      const item = firstGrantedSkin(productId);
      if (item && ownsSkin(item)) return equip(item.id);
    }
    renderShelf();
    return result || { ok: false, reason: 'unavailable' };
  }

  function equip(skinId) {
    const item = findSkin(skinId);
    if (!item) return { ok: false, reason: 'unknown' };
    if (!ownsSkin(item)) return { ok: false, reason: 'locked' };
    const all = readSelection();
    all[item.game] = item.id;
    writeSelection(all);
    applyActive();
    renderShelf();
    emit();
    return { ok: true };
  }

  function clearEquip(gameId) {
    const all = readSelection();
    delete all[gameId];
    writeSelection(all);
    if (pageGame() === gameId) {
      const previewId = currentPreview();
      const previewSkin = previewId && findSkin(previewId);
      const keepPreview = previewId && (previewSkin || gameId === 'blockblast');
      if (!keepPreview) clearPaint(gameId);
    }
    renderShelf();
    emit();
    return true;
  }

  function onClick(event) {
    const target = event && event.target;
    if (!target || typeof target.closest !== 'function') return;
    const btn = target.closest('[data-paid-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-paid-action');
    if (action === 'equip') {
      if (event.preventDefault) event.preventDefault();
      equip(btn.getAttribute('data-paid-id'));
    } else if (action === 'buy') {
      if (event.preventDefault) event.preventDefault();
      buy(btn.getAttribute('data-product-id'));
    }
  }

  function mount() {
    if (!bound && root.document && typeof root.document.addEventListener === 'function') {
      bound = true;
      root.document.addEventListener('click', onClick);
    }
    if (!listening && root.ArcadeStore && typeof root.ArcadeStore.on === 'function') {
      listening = true;
      root.ArcadeStore.on('change', () => {
        applyActive();
        renderShelf();
        emit();
      });
    }
    applyActive();
    renderShelf();
  }

  function boot() {
    const doc = root.document;
    if (doc && doc.readyState === 'loading' && typeof doc.addEventListener === 'function') {
      doc.addEventListener('DOMContentLoaded', mount);
    } else {
      mount();
    }
  }

  const api = {
    SELECTION_KEY: SELECTION_KEY,
    PRODUCTS: PRODUCTS,
    SKINS: SKINS,
    shouldLoad: shouldLoad,
    detectGame: detectGame,
    ownsSkin: ownsSkin,
    ownsPack: ownsPack,
    isPaidTheme: isPaidTheme,
    equippedId: equippedId,
    priceText: priceText,
    applyActive: applyActive,
    renderShelf: renderShelf,
    equip: equip,
    clearEquip: clearEquip,
    buy: buy,
    mount: mount,
    on: on
  };

  root.ArcadeCosmetics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  boot();
})(typeof window !== 'undefined' ? window : globalThis);
