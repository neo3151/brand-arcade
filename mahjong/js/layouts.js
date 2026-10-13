/**
 * CELESTIAL JADE: MAHJONG SOLITAIRE — layouts.js
 * 3D Grid coordinate templates for 144-tile classic layouts:
 * 1. The Classic Turtle (Pyramid)
 * 2. The Imperial Dragon
 * 3. The Fortress
 *
 * Coordinates are defined in half-tile grid steps (x, y, z)
 * where each tile has width = 2, height = 2, layer = z.
 */

'use strict';

window.MahjongLayouts = (() => {

  /**
   * Layout 1: The Classic Turtle (144 tiles)
   */
  function buildTurtleLayout() {
    const tiles = [];

    // Layer 0: 87 tiles
    // Rows 0 to 7
    const rowSpecs = [
      { y: 0, xs: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] },
      { y: 2, xs: [6, 8, 10, 12, 14, 16, 18, 20] },
      { y: 4, xs: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22] },
      { y: 6, xs: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] },
      { y: 8, xs: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] },
      { y: 10, xs: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22] },
      { y: 12, xs: [6, 8, 10, 12, 14, 16, 18, 20] },
      { y: 14, xs: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24] }
    ];

    rowSpecs.forEach(r => {
      r.xs.forEach(x => {
        tiles.push({ x, y: r.y, z: 0 });
      });
    });

    // Left & Right outlier wing tiles at layer 0 (middle y=7)
    tiles.push({ x: 0, y: 7, z: 0 });
    tiles.push({ x: 26, y: 7, z: 0 });
    tiles.push({ x: 28, y: 7, z: 0 });

    // Layer 1: 36 tiles (6x6 centered square)
    for (let x = 8; x <= 18; x += 2) {
      for (let y = 2; y <= 12; y += 2) {
        tiles.push({ x, y, z: 1 });
      }
    }

    // Layer 2: 16 tiles (4x4 centered square)
    for (let x = 10; x <= 16; x += 2) {
      for (let y = 4; y <= 10; y += 2) {
        tiles.push({ x, y, z: 2 });
      }
    }

    // Layer 3: 4 tiles (2x2 centered square)
    for (let x = 12; x <= 14; x += 2) {
      for (let y = 6; y <= 8; y += 2) {
        tiles.push({ x, y, z: 3 });
      }
    }

    // Layer 4: 1 tile at the apex (sits at center spanning x=13, y=7)
    tiles.push({ x: 13, y: 7, z: 4 });

    return tiles;
  }

  /**
   * Layout 2: The Fortress (144 unique tiles)
   * Four fortified bastion corner towers + elevated gatehouse walls + inner keep
   */
  function buildFortressLayout() {
    const tiles = [];
    function add(x, y, z) {
      tiles.push({ x, y, z });
    }

    // Layer 0: Ground Foundation (92 tiles)
    // Top & bottom outer ramparts (12 each = 24)
    for (let x = 2; x <= 24; x += 2) {
      add(x, 0, 0);
      add(x, 14, 0);
    }
    // Left & right outer ramparts (6 each = 12)
    for (let y = 2; y <= 12; y += 2) {
      add(2, y, 0);
      add(24, y, 0);
    }
    // 4 corner buttresses
    add(0, 0, 0);
    add(0, 14, 0);
    add(26, 0, 0);
    add(26, 14, 0);
    // 4 flank gates
    add(0, 6, 0);
    add(0, 8, 0);
    add(26, 6, 0);
    add(26, 8, 0);
    // Inner courtyard (8 cols x 6 rows = 48)
    for (let x = 6; x <= 20; x += 2) {
      for (let y = 2; y <= 12; y += 2) {
        add(x, y, 0);
      }
    }

    // Layer 1: Battlements & Corner Bastions (32 tiles)
    // 4 corner bastions (4 tiles each = 16)
    const bastions = [
      { x0: 2, y0: 0 }, { x0: 22, y0: 0 },
      { x0: 2, y0: 12 }, { x0: 22, y0: 12 }
    ];
    bastions.forEach(b => {
      add(b.x0, b.y0, 1);
      add(b.x0 + 2, b.y0, 1);
      add(b.x0, b.y0 + 2, 1);
      add(b.x0 + 2, b.y0 + 2, 1);
    });
    // Inner keep level 1 (4 cols x 4 rows = 16)
    for (let x = 10; x <= 16; x += 2) {
      for (let y = 4; y <= 10; y += 2) {
        add(x, y, 1);
      }
    }

    // Layer 2: Elevated Bastion Towers + Keep Ring (12 tiles)
    // 4 bastion turrets (1 each = 4)
    add(3, 1, 2);
    add(23, 1, 2);
    add(3, 13, 2);
    add(23, 13, 2);
    // Keep ring level 2 (8 tiles)
    for (let x = 11; x <= 15; x += 2) {
      add(x, 5, 2);
      add(x, 9, 2);
    }
    add(11, 7, 2);
    add(15, 7, 2);

    // Layer 3: High Keep Tower (6 tiles)
    for (let x = 12; x <= 14; x += 2) {
      for (let y = 6; y <= 8; y += 2) {
        add(x, y, 3);
      }
    }
    add(13, 5, 3);
    add(13, 9, 3);

    // Layer 4: Apex Spire (2 tiles)
    add(13, 6, 4);
    add(13, 8, 4);

    return tiles;
  }

  /**
   * Layout 3: The Imperial Dragon (144 unique tiles)
   * Serpentine curved dragon silhouette with layered wings and crowned head
   */
  function buildDragonLayout() {
    const tiles = [];
    function add(x, y, z) {
      tiles.push({ x, y, z });
    }

    // Layer 0: Dragon Body Foundation (84 tiles)
    // Dragon Head & Crown (left: x 0..6, y 4..8)
    for (let x = 2; x <= 6; x += 2) {
      for (let y = 4; y <= 8; y += 2) {
        add(x, y, 0); // 9 tiles
      }
    }
    add(0, 6, 0); // Snout
    add(4, 2, 0); // Upper Horn
    add(4, 10, 0); // Lower Horn
    add(2, 2, 0); // Whisker
    add(2, 10, 0); // Whisker

    // Body Spine & Ribs (x 8..22)
    for (let x = 8; x <= 22; x += 2) {
      add(x, 6, 0); // Main spine (8 tiles)
      add(x, 4, 0); // Upper rib (8 tiles)
      add(x, 8, 0); // Lower rib (8 tiles)
    }
    // Wings Spread (Top & Bottom)
    for (let x = 10; x <= 20; x += 2) {
      add(x, 2, 0); // Upper wing (6 tiles)
      add(x, 0, 0); // Upper wing tip (6 tiles)
      add(x, 10, 0); // Lower wing (6 tiles)
      add(x, 12, 0); // Lower wing tip (6 tiles)
    }
    // Tail Curl (x 24..28)
    add(24, 6, 0);
    add(26, 6, 0);
    add(26, 4, 0);
    add(28, 2, 0);
    add(26, 8, 0);
    add(28, 10, 0);
    add(24, 2, 0);
    add(24, 10, 0);
    // Outer wing crests
    for (let x = 8; x <= 20; x += 2) {
      add(x, -2, 0); // 7 tiles
      add(x, 14, 0); // 7 tiles
    }

    // Layer 1: Dragon Scales & Wing Crests (36 tiles)
    for (let x = 8; x <= 20; x += 2) {
      add(x, 5, 1); // 7 tiles
      add(x, 7, 1); // 7 tiles
    }
    for (let x = 10; x <= 18; x += 2) {
      add(x, 2, 1); // 5 tiles
      add(x, 10, 1); // 5 tiles
    }
    // Head Crest Layer 1
    add(3, 5, 1);
    add(5, 5, 1);
    add(3, 7, 1);
    add(5, 7, 1);
    // Tail scales
    add(23, 6, 1);
    add(25, 6, 1);
    add(25, 4, 1);
    add(25, 8, 1);
    // Wing joints
    add(14, 0, 1);
    add(14, 12, 1);
    add(16, 0, 1);
    add(16, 12, 1);

    // Layer 2: Dorsal Spines & Head Crown (16 tiles)
    for (let x = 10; x <= 18; x += 2) {
      add(x, 6, 2); // 5 tiles
      add(x, 4, 2); // 5 tiles
      add(x, 8, 2); // 5 tiles
    }
    add(4, 6, 2); // Crown

    // Layer 3: Blazing Dragon Ridge (6 tiles)
    add(11, 6, 3);
    add(13, 6, 3);
    add(15, 6, 3);
    add(17, 6, 3);
    add(13, 5, 3);
    add(15, 7, 3);

    // Layer 4: Flaming Pearl of Wisdom (2 tiles)
    add(13, 6, 4);
    add(15, 6, 4);

    return tiles;
  }

  const DEFINITIONS = {
    turtle: {
      id: 'turtle',
      title: 'The Classic Turtle',
      badge: 'Iconic 5-Layer Pyramid',
      desc: 'The timeless masterpiece of Mahjong Solitaire with an elevated central pagoda apex.',
      tiles: 144,
      layers: 5,
      builder: buildTurtleLayout
    },
    dragon: {
      id: 'dragon',
      title: 'The Imperial Dragon',
      badge: 'Serpentine Silhouette',
      desc: 'A flowing legendary dragon with spread wings, curved tail, and a crowned apex.',
      tiles: 144,
      layers: 5,
      builder: buildDragonLayout
    },
    fortress: {
      id: 'fortress',
      title: 'The Stone Fortress',
      badge: 'Double Bastions',
      desc: 'Solid fortified ramparts with four elevated corner guard towers and a central keep.',
      tiles: 144,
      layers: 5,
      builder: buildFortressLayout
    }
  };

  return {
    DEFINITIONS,
    buildTurtleLayout,
    buildDragonLayout,
    buildFortressLayout
  };

})();
