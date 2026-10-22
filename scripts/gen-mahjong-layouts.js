/**
 * Build 10 extra 144-tile Mahjong layouts and splice them into layouts.js.
 * Each layout is a stack of even-grid columns, then proved solvable by the
 * same reverse placer the game uses.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const layoutPath = path.join(root, 'mahjong/js/layouts.js');

const SPECS = [
  {
    id: 'pagoda',
    title: 'The Garden Pagoda',
    badge: 'Tiered Eaves',
    desc: 'Square roofs stacked toward a quiet finial.',
    rows: [
      '1111111111',
      '1222222221',
      '1233333321',
      '1234444321',
      '1234554321',
      '1234554321',
      '1234444321',
      '1233333321',
      '1222222221',
      '1111111111'
    ]
  },
  {
    id: 'bridge',
    title: 'The Moon Bridge',
    badge: 'Twin Abutments',
    desc: 'Two gate towers with a long deck between them.',
    rows: [
      '444......444',
      '444......444',
      '444333333444',
      '444333333444',
      '444333333444',
      '444......444',
      '333......333',
      '333......333'
    ]
  },
  {
    id: 'lotus',
    title: 'The Lotus Pond',
    badge: 'Open Petals',
    desc: 'A ring of petals around a raised heart.',
    rows: [
      '..333333..',
      '.34444443.',
      '3455555543',
      '3456666543',
      '3456666543',
      '3455555543',
      '.34444443.',
      '..333333..'
    ]
  },
  {
    id: 'gate',
    title: 'The Temple Gate',
    badge: 'Open Court',
    desc: 'A U-shaped gatehouse with tall side pillars.',
    rows: [
      '5555555555',
      '533......3',
      '533......3',
      '533......3',
      '533......3',
      '533......3',
      '533......3',
      '5555555555'
    ]
  },
  {
    id: 'compass',
    title: 'The Jade Compass',
    badge: 'Four Bearings',
    desc: 'A cross of arms around a tall center stone.',
    rows: [
      '....3333....',
      '....3553....',
      '....3553....',
      '333355553333',
      '355555555553',
      '355555555553',
      '333355553333',
      '....3553....',
      '....3553....',
      '....3333....'
    ]
  },
  {
    id: 'wave',
    title: 'The River Wave',
    badge: 'Crest and Trough',
    desc: 'Rolling crests that rise and fall across the board.',
    rows: [
      '1122334455',
      '1223344551',
      '2233445511',
      '2334455112',
      '3344551122',
      '3445511223',
      '4455112233',
      '4551122334',
      '5511223344',
      '5112233445'
    ]
  },
  {
    id: 'lantern',
    title: 'The Festival Lantern',
    badge: 'Tall Light',
    desc: 'A wide base under a narrow glowing crown.',
    rows: [
      '111111111111',
      '122222222221',
      '.12333333321.',
      '.12344444321.',
      '..123555321..',
      '..123555321..',
      '...1233321...',
      '....1221....',
      '.....55.....',
      '.....55.....'
    ]
  },
  {
    id: 'garden',
    title: 'The Four Gardens',
    badge: 'Cross Paths',
    desc: 'Four planted courts split by straight paths.',
    rows: [
      '333.333.333',
      '353.353.353',
      '333.333.333',
      '...........',
      '333.333.333',
      '353.353.353',
      '333.333.333',
      '...........',
      '333.333.333',
      '353.353.353'
    ]
  },
  {
    id: 'crown',
    title: 'The Empress Crown',
    badge: 'Five Points',
    desc: 'A band of gold with five raised points.',
    rows: [
      '5.5.5.5.5.5',
      '555555555555',
      '444444444444',
      '333333333333',
      '222222222222',
      '111111111111',
      '222222222222',
      '111111111111'
    ]
  },
  {
    id: 'river',
    title: 'The Winding River',
    badge: 'Stepping Stones',
    desc: 'A bending channel with stones stacked in the bends.',
    rows: [
      '444444......',
      '3333333.....',
      '..222333....',
      '...222333...',
      '....333444..',
      '.....333555.',
      '......44455.',
      '.......5555.',
      '........4444',
      '.........333'
    ]
  }
];

function isFree(tile, active) {
  for (let i = 0; i < active.length; i++) {
    const other = active[i];
    if (other.id === tile.id) continue;
    if (other.z > tile.z && Math.abs(other.x - tile.x) < 2 && Math.abs(other.y - tile.y) < 2) return false;
  }
  let left = false;
  let right = false;
  for (let i = 0; i < active.length; i++) {
    const other = active[i];
    if (other.id === tile.id || other.z !== tile.z) continue;
    if (Math.abs(other.y - tile.y) < 2) {
      if (other.x < tile.x && (tile.x - other.x) <= 2) left = true;
      if (other.x > tile.x && (other.x - tile.x) <= 2) right = true;
    }
  }
  return !left || !right;
}

function reversible(tiles, attempts) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    let slots = tiles.map((tile, index) => ({ id: index, x: tile.x, y: tile.y, z: tile.z }));
    let ok = true;
    const pairs = tiles.length / 2;
    for (let step = 0; step < pairs; step++) {
      const free = slots.filter(slot => isFree(slot, slots));
      if (free.length < 2) {
        ok = false;
        break;
      }
      const a = free[Math.floor(Math.random() * free.length)];
      let b = free[Math.floor(Math.random() * free.length)];
      if (b.id === a.id) b = free[(free.indexOf(a) + 1) % free.length];
      slots = slots.filter(slot => slot.id !== a.id && slot.id !== b.id);
    }
    if (ok && slots.length === 0) return true;
  }
  return false;
}

function cellsFromRows(rows, cap) {
  const cells = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const raw = row[x];
      if (raw === '.' || raw === ' ') continue;
      const h = Math.min(cap, parseInt(raw, 10) || 0);
      if (h > 0) cells.push({ x, y, h });
    }
  });
  return cells;
}

function fit(rows, cap) {
  const cells = cellsFromRows(rows, cap);
  let total = cells.reduce((sum, cell) => sum + cell.h, 0);
  const cx = cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length;
  const cy = cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length;
  const dist = cell => Math.abs(cell.x - cx) + Math.abs(cell.y - cy);
  let guard = 0;
  while (total !== 144 && guard++ < 800) {
    if (total < 144) {
      const pick = cells.filter(cell => cell.h < cap).sort((a, b) => dist(a) - dist(b))[0];
      if (!pick) return null;
      pick.h++;
      total++;
    } else {
      const pick = cells.filter(cell => cell.h > 1).sort((a, b) => dist(b) - dist(a))[0];
      if (!pick) return null;
      pick.h--;
      total--;
    }
  }
  return total === 144 ? cells : null;
}

function tilesFromCells(cells) {
  const tiles = [];
  cells.forEach(cell => {
    for (let z = 0; z < cell.h; z++) tiles.push({ x: cell.x * 2, y: cell.y * 2, z });
  });
  return tiles;
}

function validateGeometry(tiles) {
  if (tiles.length !== 144) throw new Error('count ' + tiles.length);
  const seen = new Set();
  tiles.forEach(tile => {
    const key = tile.x + ',' + tile.y + ',' + tile.z;
    if (seen.has(key)) throw new Error('overlap ' + key);
    seen.add(key);
    if (tile.z > 0 && !seen.has(tile.x + ',' + tile.y + ',' + (tile.z - 1)) && !tiles.some(other => other.x === tile.x && other.y === tile.y && other.z === tile.z - 1)) {
      throw new Error('unsupported ' + key);
    }
  });
}

function buildSpec(spec) {
  for (let cap = 5; cap >= 2; cap--) {
    const cells = fit(spec.rows, cap);
    if (!cells) continue;
    const tiles = tilesFromCells(cells);
    validateGeometry(tiles);
    if (reversible(tiles, 80)) return tiles;
  }
  throw new Error('No solvable height map for ' + spec.id);
}

function emit(spec, tiles) {
  const layers = tiles.reduce((max, tile) => Math.max(max, tile.z), 0) + 1;
  const body = tiles.map(tile => '{x:' + tile.x + ',y:' + tile.y + ',z:' + tile.z + '}').join(',');
  const fn = 'build' + spec.id[0].toUpperCase() + spec.id.slice(1) + 'Layout';
  return { layers, fn, source:
    '  function ' + fn + '() {\n' +
    '    return [' + body + '];\n' +
    '  }\n'
  };
}

const built = SPECS.map(spec => {
  const tiles = buildSpec(spec);
  const emitted = emit(spec, tiles);
  console.log(spec.id, tiles.length, 'layers', emitted.layers);
  return Object.assign({}, spec, emitted, { tiles });
});

const block = [
  '  /* CONTENT_PACK_LAYOUTS */',
  built.map(item => item.source).join('\n'),
  '  const PACK_LAYOUTS = {',
  built.map(item => {
    return [
      '    ' + item.id + ': {',
      "      id: '" + item.id + "',",
      "      title: '" + item.title.replace(/'/g, "\\'") + "',",
      "      badge: '" + item.badge.replace(/'/g, "\\'") + "',",
      "      desc: '" + item.desc.replace(/'/g, "\\'") + "',",
      '      tiles: 144,',
      '      layers: ' + item.layers + ',',
      '      builder: ' + item.fn,
      '    }'
    ].join('\n');
  }).join(',\n'),
  '  };',
  '  Object.assign(DEFINITIONS, PACK_LAYOUTS);',
  '  /* END_CONTENT_PACK_LAYOUTS */'
].join('\n');

let source = fs.readFileSync(layoutPath, 'utf8');
source = source.replace(/\n {2}\/\* CONTENT_PACK_LAYOUTS \*\/[\s\S]*?\/\* END_CONTENT_PACK_LAYOUTS \*\/\n/, '\n');
const needle = '  return {\n    DEFINITIONS,\n    buildTurtleLayout,\n    buildDragonLayout,\n    buildFortressLayout\n  };';
if (!source.includes(needle)) throw new Error('layouts.js return block not found');
const extraReturns = built.map(item => '    ' + item.fn).join(',\n');
source = source.replace(needle,
  block + '\n\n  return {\n    DEFINITIONS,\n    buildTurtleLayout,\n    buildDragonLayout,\n    buildFortressLayout,\n' + extraReturns + '\n  };'
);
fs.writeFileSync(layoutPath, source);

const sandbox = { console, Math, Object, Array, Error, Set, parseInt };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'mahjong/js/mahjong-tiles.js'), 'utf8'), sandbox, { filename: 'mahjong-tiles.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'mahjong/js/board-engine.js'), 'utf8'), sandbox, { filename: 'board-engine.js' });
vm.runInContext(source, sandbox, { filename: 'layouts.js' });

SPECS.forEach(spec => {
  const def = sandbox.MahjongLayouts.DEFINITIONS[spec.id];
  if (!def) throw new Error('missing def ' + spec.id);
  const positions = def.builder();
  if (positions.length !== 144) throw new Error(spec.id + ' count ' + positions.length);
  const board = sandbox.BoardEngine.generateSolvableBoard(positions, 40);
  if (!board || board.length !== 144) throw new Error(spec.id + ' board failed');
  console.log('engine ok', spec.id);
});

console.log('layouts.js updated');
