/**
 * Hub-only paid content packs. Free boards, deals, categories, and clearances
 * stay open. Packs add content beside them. Prices come from ArcadeStore.getPrice.
 * The website shows Unavailable. Standalone /index.html never loads this file.
 */
(function (root) {
  'use strict';

  const EXPLORER = 'com.gamingempire.benchmarkarcade.wordsearch.pack.explorer';
  const LAYOUTS = 'com.gamingempire.benchmarkarcade.mahjong.pack.layouts';
  const HOLIDAY = 'com.gamingempire.benchmarkarcade.nonogram.pack.holiday';
  const ANIMALS = 'com.gamingempire.benchmarkarcade.nonogram.pack.animals';
  const CURATED = 'com.gamingempire.benchmarkarcade.solitaire.pack.curated';
  const HEIST = 'com.gamingempire.benchmarkarcade.codebreaker.pack.heist';
  const PUZZLER = 'com.gamingempire.benchmarkarcade.mindful.pack.puzzler';

  const PACKS = {
    explorer: {
      id: 'explorer',
      game: 'wordsearch',
      name: 'World Explorer',
      productId: EXPLORER,
      entitlementId: 'wordsearch_pack_explorer',
      blurb: 'Five extra categories. Arcade Words and the original lists stay free.',
      note: 'Sample puzzles are beginner level 1. The rest of each list unlocks with the pack.'
    },
    layouts: {
      id: 'layouts',
      game: 'mahjong',
      name: 'Jade Layouts',
      productId: LAYOUTS,
      entitlementId: 'mahjong_pack_layouts',
      blurb: 'Ten extra 144-tile layouts. Turtle, Dragon, and Fortress stay free.',
      note: 'Pagoda and Moon Bridge are open to try. The other eight are locked.'
    },
    holiday: {
      id: 'holiday',
      game: 'nonogram',
      name: 'Holiday Pictures',
      productId: HOLIDAY,
      entitlementId: 'nonogram_pack_holiday',
      blurb: 'Twenty-five hand-drawn holiday pictures. The 5,000 free puzzles stay open.',
      note: 'The first two pictures are samples.'
    },
    animals: {
      id: 'animals',
      game: 'nonogram',
      name: 'Animal Pictures',
      productId: ANIMALS,
      entitlementId: 'nonogram_pack_animals',
      blurb: 'Twenty-five hand-drawn animal pictures. Free difficulties are unchanged.',
      note: 'The first two pictures are samples.'
    },
    curated: {
      id: 'curated',
      game: 'solitaire',
      name: 'Curated Deals',
      productId: CURATED,
      entitlementId: 'solitaire_pack_curated',
      blurb: 'One hundred extra draw-1 deals, each checked to be winnable. Deals 1–1,000 stay free.',
      note: 'Two sample deals are open. Draw 1 only, same rules.'
    },
    heist: {
      id: 'heist',
      game: 'codebreaker',
      name: 'Heist Campaign',
      productId: HEIST,
      entitlementId: 'codebreaker_pack_heist',
      blurb: 'Fifteen short vault missions with their own story text. Clearances stay free.',
      note: 'Lobby Clipboard and Service Elevator are samples. No extra hints.'
    },
    puzzler: {
      id: 'puzzler',
      games: ['wordsearch', 'mahjong', 'nonogram'],
      name: 'Mindful Puzzler',
      productId: PUZZLER,
      entitlementId: 'mindful_pack_puzzler',
      grants: ['nonogram_pack_holiday', 'nonogram_pack_animals', 'mahjong_pack_layouts', 'wordsearch_pack_explorer'],
      blurb: 'Holiday pictures, animal pictures, the jade layouts, and World Explorer.',
      note: 'One purchase unlocks those four packs. It does not include Curated Deals or the Heist.'
    }
  };

  const WORD_PAID = ['mythology', 'cooking', 'parks', 'ocean', 'kids'];
  const WORD_SAMPLES = ['mythology', 'cooking'];
  const LAYOUT_IDS = ['pagoda', 'bridge', 'lotus', 'gate', 'compass', 'wave', 'lantern', 'garden', 'crown', 'river'];
  const LAYOUT_SAMPLES = ['pagoda', 'bridge'];
  const PICTURE_SAMPLES = [1, 2];
  const HEIST_SAMPLES = [1, 2];

  function ownsEntitlement(id) {
    return !!(id && root.ArcadeStore && typeof root.ArcadeStore.owns === 'function' && root.ArcadeStore.owns(id));
  }

  function ownsPack(packOrId) {
    const pack = typeof packOrId === 'string' ? PACKS[packOrId] : packOrId;
    if (!pack) return false;
    if (ownsEntitlement(pack.entitlementId)) return true;
    const grants = PACKS.puzzler.grants;
    if (grants.indexOf(pack.entitlementId) !== -1 && ownsEntitlement(PACKS.puzzler.entitlementId)) return true;
    return false;
  }

  function priceText(productId) {
    if (!root.ArcadeStore || typeof root.ArcadeStore.getPrice !== 'function') return null;
    const price = root.ArcadeStore.getPrice(productId);
    return price || null;
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buyButton(productId, owned) {
    const id = ' data-product-id="' + esc(productId) + '"';
    if (owned) return '<span class="paid-owned"' + id + '>Owned</span>';
    const price = priceText(productId);
    if (!price) return '<button type="button" class="paid-buy"' + id + ' disabled>Unavailable</button>';
    return '<button type="button" class="paid-buy" data-paid-action="buy"' + id + '>' + esc(price) + ' · Buy</button>';
  }

  function allowsWord(category, level, difficulty) {
    if (WORD_PAID.indexOf(category) === -1) return true;
    if (ownsPack(PACKS.explorer)) return true;
    return WORD_SAMPLES.indexOf(category) !== -1 && Number(level) === 1 && difficulty === 'beginner';
  }

  function allowsLayout(layoutId) {
    if (LAYOUT_IDS.indexOf(layoutId) === -1) return true;
    if (ownsPack(PACKS.layouts)) return true;
    return LAYOUT_SAMPLES.indexOf(layoutId) !== -1;
  }

  function allowsPicture(packId, level) {
    const pack = PACKS[packId];
    if (!pack || pack.game !== 'nonogram') return false;
    if (ownsPack(pack)) return true;
    return PICTURE_SAMPLES.indexOf(Number(level)) !== -1;
  }

  function curatedDeals() {
    const api = root.CuratedDeals;
    return api && Array.isArray(api.deals) ? api.deals : [];
  }

  function allowsDeal(dealNumber) {
    const deals = curatedDeals();
    const n = Number(dealNumber);
    if (deals.indexOf(n) === -1) return true;
    if (ownsPack(PACKS.curated)) return true;
    return deals.indexOf(n) < 2;
  }

  function allowsMission(missionId) {
    const n = Number(missionId);
    if (ownsPack(PACKS.heist)) return true;
    return HEIST_SAMPLES.indexOf(n) !== -1;
  }

  function wordItems() {
    const meta = [
      ['mythology', 'Mythology', 'ZEUS · ODYSSEY · VALHALLA'],
      ['cooking', 'Cooking', 'RISOTTO · SAFFRON · TEMPURA'],
      ['parks', 'US National Parks', 'YOSEMITE · DENALI · ZION'],
      ['ocean', 'Ocean Life', 'NAUTILUS · MANTARAY · KELP'],
      ['kids', "Kids' Words", 'RAINBOW · ROCKET · PUPPY']
    ];
    return meta.map(function (row) {
      const sample = WORD_SAMPLES.indexOf(row[0]) !== -1;
      return {
        id: row[0],
        label: row[1],
        detail: row[2],
        sample: sample,
        href: 'game.html?category=' + row[0] + '&difficulty=beginner&level=1'
      };
    });
  }

  function layoutItems() {
    const titles = {
      pagoda: 'The Garden Pagoda',
      bridge: 'The Moon Bridge',
      lotus: 'The Lotus Pond',
      gate: 'The Temple Gate',
      compass: 'The Jade Compass',
      wave: 'The River Wave',
      lantern: 'The Festival Lantern',
      garden: 'The Four Gardens',
      crown: 'The Empress Crown',
      river: 'The Winding River'
    };
    return LAYOUT_IDS.map(function (id) {
      return {
        id: id,
        label: titles[id],
        detail: '144 tiles',
        sample: LAYOUT_SAMPLES.indexOf(id) !== -1,
        href: 'game.html?layout=' + id
      };
    });
  }

  function pictureItems(packId) {
    const pack = root.PicturePacks && root.PicturePacks[packId];
    const puzzles = pack && pack.puzzles ? pack.puzzles : [];
    if (!puzzles.length) {
      return [1, 2].map(function (level) {
        return {
          id: String(level),
          label: 'Picture ' + level,
          detail: '',
          sample: true,
          href: 'game.html?pack=' + packId + '&level=' + level
        };
      });
    }
    return puzzles.map(function (puzzle) {
      return {
        id: String(puzzle.level),
        label: puzzle.name,
        detail: puzzle.level <= 2 ? 'Sample' : '',
        sample: puzzle.level <= 2,
        href: 'game.html?pack=' + packId + '&level=' + puzzle.level,
        solution: puzzle.solution
      };
    });
  }

  function dealItems() {
    const deals = curatedDeals();
    return deals.map(function (deal, index) {
      return {
        id: String(deal),
        label: 'Deal ' + deal,
        detail: index < 2 ? 'Draw 1 sample' : 'Draw 1',
        sample: index < 2,
        href: 'game.html?deal=' + deal + '&mode=1'
      };
    });
  }

  function heistItems() {
    const missions = root.HeistCampaign && root.HeistCampaign.missions;
    if (!missions) {
      return HEIST_SAMPLES.map(function (id) {
        return { id: String(id), label: 'Mission ' + id, detail: '', sample: true, href: 'game.html?diff=heist&mission=' + id };
      });
    }
    return missions.map(function (mission) {
      return {
        id: String(mission.id),
        label: mission.title,
        detail: mission.story,
        sample: HEIST_SAMPLES.indexOf(mission.id) !== -1,
        href: 'game.html?diff=heist&mission=' + mission.id
      };
    });
  }

  function itemsFor(pack) {
    if (pack.id === 'explorer') return wordItems();
    if (pack.id === 'layouts') return layoutItems();
    if (pack.id === 'holiday' || pack.id === 'animals') return pictureItems(pack.id);
    if (pack.id === 'curated') return dealItems();
    if (pack.id === 'heist') return heistItems();
    return [];
  }

  function thumb(solution) {
    if (!solution || !solution.length) return '';
    const cells = [];
    for (let r = 0; r < solution.length; r++) {
      for (let c = 0; c < solution[r].length; c++) {
        cells.push('<i' + (solution[r][c] ? ' class="on"' : '') + '></i>');
      }
    }
    return '<div class="pack-thumb" style="grid-template-columns:repeat(' + solution[0].length + ',1fr)">' + cells.join('') + '</div>';
  }

  function renderItems(pack, owned) {
    const items = itemsFor(pack);
    const visible = owned ? items : items.filter(function (item) { return item.sample; });
    const hidden = owned ? 0 : items.length - visible.length;
    const rows = visible.map(function (item) {
      const preview = item.solution ? thumb(item.solution) : '';
      const badge = !owned && item.sample ? '<em>Sample</em>' : '';
      const body = preview + '<span><strong>' + esc(item.label) + '</strong> ' + badge +
        (item.detail ? '<small>' + esc(item.detail) + '</small>' : '') + '</span>';
      if (owned || item.sample) {
        return '<a class="content-sample" href="' + esc(item.href) + '">' + body + '</a>';
      }
      return '<div class="content-sample content-sample--locked"><span class="content-lock">Locked</span>' + body + '</div>';
    }).join('');
    const more = hidden > 0 ? '<p class="content-more"><span class="content-lock">Locked</span> ' + hidden + ' more in this pack</p>' : '';
    return '<div class="content-samples">' + rows + '</div>' + more;
  }

  function renderPack(pack) {
    const owned = ownsPack(pack);
    return '<section class="content-pack" data-pack="' + esc(pack.id) + '" data-product-id="' + esc(pack.productId) + '">' +
      '<div class="content-pack__bar"><div><h3>' + esc(pack.name) + '</h3><p>' + esc(pack.blurb) + '</p></div>' +
      buyButton(pack.productId, owned) + '</div>' +
      '<p class="content-note">' + esc(pack.note) + '</p>' +
      renderItems(pack, owned) +
      '</section>';
  }

  function renderPuzzler() {
    const pack = PACKS.puzzler;
    const owned = ownsEntitlement(pack.entitlementId);
    return '<section class="content-pack content-pack--bundle" data-pack="puzzler" data-product-id="' + esc(pack.productId) + '">' +
      '<div class="content-pack__bar"><div><h3>' + esc(pack.name) + '</h3><p>' + esc(pack.blurb) + '</p></div>' +
      buyButton(pack.productId, owned) + '</div>' +
      '<p class="content-note">' + esc(pack.note) + '</p></section>';
  }

  function renderShelf(game) {
    const packs = [];
    Object.keys(PACKS).forEach(function (key) {
      const pack = PACKS[key];
      if (pack.game === game) packs.push(pack);
    });
    let html = '<div class="content-shelf"><div class="content-shelf__lead"><h2>Content packs</h2>' +
      '<p>Optional extra puzzles. Everything already in the game stays free and unlocked. Packs do not add hints, scores, or easier rules. On the website the price says Unavailable.</p></div>';
    packs.forEach(function (pack) { html += renderPack(pack); });
    if (PACKS.puzzler.games.indexOf(game) !== -1) html += renderPuzzler();
    html += '</div>';
    return html;
  }

  function bindBuys(scope) {
    const buttons = scope.querySelectorAll ? scope.querySelectorAll('[data-paid-action="buy"]') : [];
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (event) {
        const button = event.currentTarget;
        const productId = button.getAttribute('data-product-id');
        if (!root.ArcadeStore || typeof root.ArcadeStore.purchase !== 'function') return;
        button.disabled = true;
        Promise.resolve(root.ArcadeStore.purchase(productId)).then(function () {
          boot();
        }).catch(function () {
          button.disabled = false;
        });
      });
    }
  }

  function mount(node) {
    if (!node) return;
    const game = node.getAttribute('data-game');
    if (!game) return;
    node.innerHTML = renderShelf(game);
    bindBuys(node);
  }

  function boot() {
    if (!root.document || typeof root.document.querySelectorAll !== 'function') return;
    const nodes = root.document.querySelectorAll('[data-content-shelf]');
    for (let i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  function showLock(packId) {
    const pack = PACKS[packId] || PACKS.explorer;
    if (!root.document || !root.document.body) return;
    const existing = root.document.getElementById('content-lock-overlay');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    const overlay = root.document.createElement('div');
    overlay.id = 'content-lock-overlay';
    overlay.innerHTML = '<div class="content-lock-card"><h2>' + esc(pack.name) + '</h2><p>' + esc(pack.blurb) +
      '</p><p>This puzzle is locked. Free boards are still open from the menu.</p>' +
      buyButton(pack.productId, ownsPack(pack)) +
      '<a class="content-back" href="index.html">Back to the menu</a></div>';
    root.document.body.appendChild(overlay);
    bindBuys(overlay);
  }

  function fallbackLock() {
    if (!root.document || !root.document.body) return;
    const note = root.document.createElement('p');
    note.id = 'content-lock-fallback';
    note.textContent = 'This pack is part of Benchmark Arcade.';
    root.document.body.appendChild(note);
  }

  if (root.ArcadeStore && typeof root.ArcadeStore.on === 'function') {
    root.ArcadeStore.on('change', boot);
  }
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }

  root.ArcadeContent = {
    PACKS: PACKS,
    WORD_PAID: WORD_PAID,
    LAYOUT_IDS: LAYOUT_IDS,
    ownsPack: ownsPack,
    allowsWord: allowsWord,
    allowsLayout: allowsLayout,
    allowsPicture: allowsPicture,
    allowsDeal: allowsDeal,
    allowsMission: allowsMission,
    showLock: showLock,
    fallbackLock: fallbackLock,
    mount: mount,
    boot: boot
  };
})(typeof window !== 'undefined' ? window : globalThis);
