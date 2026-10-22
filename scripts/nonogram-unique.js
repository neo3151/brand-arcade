/**
 * Nonogram line logic and solution counting for hand-authored picture packs.
 * A puzzle is accepted when the clues have exactly one solution.
 */
'use strict';

function cluesForLine(line) {
  const clues = [];
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i]) count++;
    else if (count) {
      clues.push(count);
      count = 0;
    }
  }
  if (count) clues.push(count);
  if (!clues.length) clues.push(0);
  return clues;
}

function cluesOf(grid) {
  const size = grid.length;
  const rowClues = grid.map(cluesForLine);
  const colClues = [];
  for (let c = 0; c < size; c++) {
    const line = [];
    for (let r = 0; r < size; r++) line.push(grid[r][c]);
    colClues.push(cluesForLine(line));
  }
  return { rowClues, colClues };
}

function placements(clue, size) {
  const blocks = clue[0] === 0 ? [] : clue.slice();
  const out = [];
  const minWidth = blocks.reduce((sum, n) => sum + n, 0) + Math.max(0, blocks.length - 1);
  if (minWidth > size) return out;
  function walk(index, pos, mask) {
    if (index === blocks.length) {
      out.push(mask);
      return;
    }
    let remain = 0;
    for (let i = index; i < blocks.length; i++) remain += blocks[i];
    remain += blocks.length - index - 1;
    const maxStart = size - remain;
    for (let start = pos; start <= maxStart; start++) {
      let next = mask;
      for (let k = 0; k < blocks[index]; k++) next |= 1 << (start + k);
      walk(index + 1, start + blocks[index] + 1, next);
    }
  }
  walk(0, 0, 0);
  return out;
}

function maskFromRow(row) {
  let mask = 0;
  for (let i = 0; i < row.length; i++) if (row[i]) mask |= 1 << i;
  return mask;
}

function lineSolved(grid) {
  const size = grid.length;
  const { rowClues, colClues } = cluesOf(grid);
  const rowOpts = rowClues.map(clue => placements(clue, size));
  const colOpts = colClues.map(clue => placements(clue, size));
  const filled = Array.from({ length: size }, () => 0);
  const empty = Array.from({ length: size }, () => 0);
  const filledC = Array.from({ length: size }, () => 0);
  const emptyC = Array.from({ length: size }, () => 0);
  let progress = true;
  let guard = 0;
  while (progress && guard++ < size * size) {
    progress = false;
    for (let r = 0; r < size; r++) {
      const opts = rowOpts[r].filter(mask => (mask & filled[r]) === filled[r] && (mask & empty[r]) === 0);
      if (!opts.length) return false;
      let all = (1 << size) - 1;
      let any = 0;
      opts.forEach(mask => {
        all &= mask;
        any |= mask;
      });
      const newFilled = all & ~filled[r];
      const newEmpty = (~any & ((1 << size) - 1)) & ~empty[r];
      if (newFilled || newEmpty) progress = true;
      filled[r] |= all;
      empty[r] |= (~any) & ((1 << size) - 1);
      for (let c = 0; c < size; c++) {
        const bit = 1 << r;
        if (filled[r] & (1 << c)) filledC[c] |= bit;
        if (empty[r] & (1 << c)) emptyC[c] |= bit;
      }
    }
    for (let c = 0; c < size; c++) {
      const opts = colOpts[c].filter(mask => (mask & filledC[c]) === filledC[c] && (mask & emptyC[c]) === 0);
      if (!opts.length) return false;
      let all = (1 << size) - 1;
      let any = 0;
      opts.forEach(mask => {
        all &= mask;
        any |= mask;
      });
      for (let r = 0; r < size; r++) {
        const bit = 1 << c;
        const on = all & (1 << r);
        const off = (~any & ((1 << size) - 1)) & (1 << r);
        if (on && !(filled[r] & bit)) {
          filled[r] |= bit;
          filledC[c] |= 1 << r;
          progress = true;
        }
        if (off && !(empty[r] & bit)) {
          empty[r] |= bit;
          emptyC[c] |= 1 << r;
          progress = true;
        }
      }
    }
  }
  for (let r = 0; r < size; r++) {
    if ((filled[r] | empty[r]) !== (1 << size) - 1) return false;
    if (filled[r] !== maskFromRow(grid[r])) return false;
  }
  return true;
}

function collectSolutions(grid, cap = 2) {
  const size = grid.length;
  const { rowClues, colClues } = cluesOf(grid);
  const rowOpts = rowClues.map(clue => placements(clue, size));
  const colOpts = colClues.map(clue => placements(clue, size));
  const found = [];
  function walk(row, colBits, rows) {
    if (found.length >= cap) return;
    if (row === size) {
      found.push(rows.map(mask => {
        const line = [];
        for (let c = 0; c < size; c++) line.push((mask & (1 << c)) ? 1 : 0);
        return line;
      }));
      return;
    }
    const options = rowOpts[row];
    for (let i = 0; i < options.length; i++) {
      const mask = options[i];
      let ok = true;
      const next = colBits.slice();
      for (let c = 0; c < size; c++) {
        if (mask & (1 << c)) next[c] |= 1 << row;
        const prefix = next[c] & ((1 << (row + 1)) - 1);
        let viable = false;
        const opts = colOpts[c];
        for (let k = 0; k < opts.length; k++) {
          if ((opts[k] & ((1 << (row + 1)) - 1)) === prefix) {
            viable = true;
            break;
          }
        }
        if (!viable) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      rows.push(mask);
      walk(row + 1, next, rows);
      rows.pop();
      if (found.length >= cap) return;
    }
  }
  walk(0, Array(size).fill(0), []);
  return found;
}

function countSolutions(grid, cap = 2) {
  return collectSolutions(grid, cap).length;
}

function gridFromArt(lines) {
  return lines.map(line => line.split('').map(ch => (ch === '#' ? 1 : 0)));
}

function artFromGrid(grid) {
  return grid.map(row => row.map(cell => (cell ? '#' : '.')).join(''));
}

function similarity(a, b) {
  let same = 0;
  let total = 0;
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[r].length; c++) {
      total++;
      if (a[r][c] === b[r][c]) same++;
    }
  }
  return same / total;
}

function hasEmptyLine(grid) {
  const size = grid.length;
  for (let r = 0; r < size; r++) if (grid[r].every(cell => !cell)) return true;
  for (let c = 0; c < size; c++) {
    let sum = 0;
    for (let r = 0; r < size; r++) sum += grid[r][c];
    if (!sum) return true;
  }
  return false;
}

function cloneGrid(grid) {
  return grid.map(row => row.slice());
}

/**
 * Keep the drawing, then flip as few border cells as needed until the clues
 * describe that picture alone. Line-logic completions rank first.
 */
function settlePicture(lines) {
  const original = gridFromArt(lines);
  const size = original.length;
  let best = null;
  function consider(grid, flips) {
    const sim = similarity(grid, original);
    if (sim < 0.82) return;
    const unique = countSolutions(grid, 2) === 1;
    if (!unique) return;
    const logical = lineSolved(grid);
    const score = (logical ? 1000 : 0) + Math.round(sim * 100) - flips;
    if (!best || score > best.score) best = { grid: cloneGrid(grid), score, logical, sim, flips };
  }
  consider(original, 0);
  if (best && best.logical) return best;
  const order = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) order.push([r, c]);
  }
  for (let i = 0; i < order.length; i++) {
    const [r, c] = order[i];
    const grid = cloneGrid(original);
    grid[r][c] = grid[r][c] ? 0 : 1;
    consider(grid, 1);
    if (best && best.logical) return best;
  }
  if (best) return best;
  let current = cloneGrid(original);
  for (let step = 0; step < 16; step++) {
    const sols = collectSolutions(current, 2);
    if (sols.length === 1) {
      consider(current, step);
      return best;
    }
    if (sols.length < 2) break;
    let alt = sols[0];
    if (similarity(alt, current) === 1) alt = sols[1];
    let flipped = false;
    for (let r = 0; r < size && !flipped; r++) {
      for (let c = 0; c < size; c++) {
        if (current[r][c] !== alt[r][c]) {
          current[r][c] = current[r][c] ? 0 : 1;
          flipped = true;
          break;
        }
      }
    }
    if (!flipped) break;
    consider(current, step + 1);
    if (best) return best;
  }
  return best;
}

module.exports = {
  cluesOf,
  lineSolved,
  countSolutions,
  gridFromArt,
  artFromGrid,
  settlePicture,
  hasEmptyLine
};
