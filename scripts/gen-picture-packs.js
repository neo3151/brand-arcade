/**
 * Turn hand-authored pictures into uniquely solvable nonogram packs.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const art = require('./picture-art');
const { settlePicture, artFromGrid, cluesOf, countSolutions, lineSolved } = require('./nonogram-unique');

function settlePack(entries) {
  return entries.map(([name, color, rows]) => {
    rows.forEach(row => {
      if (row.length !== 10) throw new Error(name + ' row width ' + row.length + ' ' + row);
    });
    if (rows.length !== 10) throw new Error(name + ' height');
    const settled = settlePicture(rows);
    if (!settled) throw new Error(name + ' could not be made unique');
    const lines = artFromGrid(settled.grid);
    const check = countSolutions(settled.grid, 2);
    if (check !== 1) throw new Error(name + ' solutions ' + check);
    console.log(name, settled.logical ? 'line-logic' : 'unique-search', 'sim', settled.sim.toFixed(2), 'flips', settled.flips);
    return { name, color, rows: lines, logical: settled.logical };
  });
}

function emitPuzzle(puzzle, level) {
  const grid = puzzle.rows.map(row => row.split('').map(ch => (ch === '#' ? 1 : 0)));
  const { rowClues, colClues } = cluesOf(grid);
  return {
    level,
    name: puzzle.name,
    color: puzzle.color,
    size: 10,
    solution: grid,
    rowClues,
    colClues,
    logical: lineSolved(grid)
  };
}

const holiday = settlePack(art.holiday).map((puzzle, index) => emitPuzzle(puzzle, index + 1));
const animals = settlePack(art.animals).map((puzzle, index) => emitPuzzle(puzzle, index + 1));

const payload = { holiday, animals };
const out = `/**
 * Picture packs — hand-authored 10×10 nonograms.
 * Holiday and Animals. Each puzzle's clues have exactly one solution.
 */
(function (root) {
  'use strict';

  const DATA = ${JSON.stringify(payload)};

  function decorate(id, name, productId, entitlementId, puzzles) {
    return { id: id, name: name, productId: productId, entitlementId: entitlementId, puzzles: puzzles };
  }

  const api = {
    holiday: decorate(
      'holiday',
      'Holiday Pictures',
      'com.gamingempire.benchmarkarcade.nonogram.pack.holiday',
      'nonogram_pack_holiday',
      DATA.holiday
    ),
    animals: decorate(
      'animals',
      'Animal Pictures',
      'com.gamingempire.benchmarkarcade.nonogram.pack.animals',
      'nonogram_pack_animals',
      DATA.animals
    ),
    get: function (packId, level) {
      const pack = api[packId];
      if (!pack) return null;
      const n = parseInt(level, 10);
      for (let i = 0; i < pack.puzzles.length; i++) {
        if (pack.puzzles[i].level === n) return pack.puzzles[i];
      }
      return null;
    }
  };

  root.PicturePacks = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
`;

const dest = path.join(__dirname, '..', 'nonogram/js/picture-packs.js');
fs.writeFileSync(dest, out);
console.log('wrote', dest, 'holiday', holiday.length, 'animals', animals.length);
