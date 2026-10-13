/**
 * hint-engine.js
 * Detects the best available solving technique on the current board
 * and returns a structured hint object for the two-tap UX.
 */

'use strict';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function rowIndices(r)   { return Array.from({length:9}, (_,c) => r*9+c); }
function colIndices(c)   { return Array.from({length:9}, (_,r) => r*9+c); }
function boxIndices(b)   {
  const br = Math.floor(b/3)*3, bc = (b%3)*3;
  return Array.from({length:9}, (_,i) => (br + Math.floor(i/3))*9 + bc + (i%3));
}
function cellBox(pos)    { return Math.floor(Math.floor(pos/9)/3)*3 + Math.floor((pos%9)/3); }
function cellRow(pos)    { return Math.floor(pos/9); }
function cellCol(pos)    { return pos % 9; }

const UNIT_NAMES = {
  row: r => `Row ${r+1}`,
  col: c => `Column ${c+1}`,
  box: b => {
    const names = ['top-left','top-center','top-right','middle-left','center','middle-right','bottom-left','bottom-center','bottom-right'];
    return `the ${names[b]} box`;
  },
};

// ---------------------------------------------------------------------------
// Technique 1: Naked Single
// A cell has only one possible candidate.
// ---------------------------------------------------------------------------
function findNakedSingle(board, candidates) {
  for (let pos = 0; pos < 81; pos++) {
    if (board[pos] !== 0 || !candidates[pos]) continue;
    if (candidates[pos].size === 1) {
      const value = [...candidates[pos]][0];
      const r = cellRow(pos), c = cellCol(pos);
      const b = cellBox(pos);

      // Build reason: list what fills the row/col/box
      const existing = new Set();
      [...rowIndices(r), ...colIndices(c), ...boxIndices(b)].forEach(p => {
        if (board[p] !== 0) existing.add(board[p]);
      });
      const others = [...existing].sort((a,b)=>a-b).join(', ');

      return {
        technique: 'Naked Single',
        regionType: 'cell',
        regionIndex: pos,
        highlightPositions: [...rowIndices(r), ...colIndices(c), ...boxIndices(b)],
        targetCell: pos,
        value,
        explanation: `Cell R${r+1}C${c+1} has only one candidate. The numbers ${others} already appear in its row, column, and box — leaving only <strong>${value}</strong> as the answer.`,
        shortExplanation: `Only one number can go here: <strong>${value}</strong>.`,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Technique 2: Hidden Single (in row, column, or box)
// A number can only go in one cell within a unit.
// ---------------------------------------------------------------------------
function findHiddenSingle(board, candidates) {
  // Check each unit type
  const unitTypes = [
    { type: 'row', getIndices: rowIndices, count: 9 },
    { type: 'col', getIndices: colIndices, count: 9 },
    { type: 'box', getIndices: boxIndices, count: 9 },
  ];

  for (const { type, getIndices, count } of unitTypes) {
    for (let u = 0; u < count; u++) {
      const indices = getIndices(u);
      for (let num = 1; num <= 9; num++) {
        // Skip if num already placed in this unit
        if (indices.some(p => board[p] === num)) continue;

        const possibleCells = indices.filter(p => candidates[p] && candidates[p].has(num));
        if (possibleCells.length === 1) {
          const pos = possibleCells[0];
          const r = cellRow(pos), c = cellCol(pos);
          return {
            technique: `Hidden Single in ${type.charAt(0).toUpperCase()+type.slice(1)}`,
            regionType: type,
            regionIndex: u,
            highlightPositions: indices,
            targetCell: pos,
            value: num,
            explanation: `Look at ${UNIT_NAMES[type](u)}. The number <strong>${num}</strong> must go somewhere in this ${type} — and only R${r+1}C${c+1} can accept it because all other cells in this ${type} already have <strong>${num}</strong> blocked by their row, column, or box.`,
            shortExplanation: `<strong>${num}</strong> can only go in one place in ${UNIT_NAMES[type](u)}.`,
          };
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Technique 3: Naked Pair
// Two cells in a unit share exactly the same two candidates — those candidates
// can be eliminated from the rest of the unit.
// This hint tells the user WHERE to eliminate, not just to fill.
// ---------------------------------------------------------------------------
function findNakedPair(board, candidates) {
  const unitTypes = [
    { type: 'row', getIndices: rowIndices, count: 9 },
    { type: 'col', getIndices: colIndices, count: 9 },
    { type: 'box', getIndices: boxIndices, count: 9 },
  ];

  for (const { type, getIndices, count } of unitTypes) {
    for (let u = 0; u < count; u++) {
      const indices = getIndices(u).filter(p => board[p] === 0 && candidates[p]);
      // Find pairs
      for (let i = 0; i < indices.length; i++) {
        const setA = candidates[indices[i]];
        if (!setA || setA.size !== 2) continue;
        for (let j = i + 1; j < indices.length; j++) {
          const setB = candidates[indices[j]];
          if (!setB || setB.size !== 2) continue;
          const a = [...setA];
          if (setB.has(a[0]) && setB.has(a[1])) {
            // Found a naked pair — check if it eliminates anything
            const pairVals = a;
            const otherCells = indices.filter(p => p !== indices[i] && p !== indices[j]);
            const canEliminate = otherCells.some(p =>
              pairVals.some(v => candidates[p].has(v))
            );
            if (canEliminate) {
              const r1 = cellRow(indices[i]), c1 = cellCol(indices[i]);
              const r2 = cellRow(indices[j]), c2 = cellCol(indices[j]);
              return {
                technique: 'Naked Pair (Elimination Only)',
                isElimination: true,
                regionType: type,
                regionIndex: u,
                highlightPositions: getIndices(u),
                targetCell: null,
                value: null,
                explanation: `Cells R${r1+1}C${c1+1} and R${r2+1}C${c2+1} in ${UNIT_NAMES[type](u)} can only contain <strong>${pairVals[0]}</strong> or <strong>${pairVals[1]}</strong>. This is an elimination hint: <strong>${pairVals[0]}</strong> and <strong>${pairVals[1]}</strong> can be removed as candidates from all other cells in this ${type}.`,
                shortExplanation: `Elimination hint: <strong>${pairVals[0]}</strong> and <strong>${pairVals[1]}</strong> are locked in two cells, eliminating them elsewhere in ${UNIT_NAMES[type](u)}.`,
              };
            }
          }
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Technique 4: Pointing Pair / Locked Candidates
// Candidates in a box are restricted to one row or column →
// eliminate that candidate from the rest of that row/column outside the box.
// ---------------------------------------------------------------------------
function findPointingPair(board, candidates) {
  for (let b = 0; b < 9; b++) {
    const bIndices = boxIndices(b);
    for (let num = 1; num <= 9; num++) {
      if (bIndices.some(p => board[p] === num)) continue;
      const possible = bIndices.filter(p => candidates[p] && candidates[p].has(num));
      if (possible.length < 2) continue;

      // Check if all in same row
      const rows = [...new Set(possible.map(cellRow))];
      if (rows.length === 1) {
        const r = rows[0];
        const rowCells = rowIndices(r).filter(p => !bIndices.includes(p));
        const canElim = rowCells.some(p => candidates[p] && candidates[p].has(num));
        if (canElim) {
          return {
            technique: 'Pointing Pair (Elimination Only)',
            isElimination: true,
            regionType: 'box',
            regionIndex: b,
            highlightPositions: [...bIndices, ...rowIndices(r)],
            targetCell: null,
            value: null,
            explanation: `In ${UNIT_NAMES.box(b)}, <strong>${num}</strong> can only appear in Row ${r+1}. This is an elimination hint: <strong>${num}</strong> cannot appear anywhere else in Row ${r+1} outside this box. Remove <strong>${num}</strong> from those candidates.`,
            shortExplanation: `Elimination hint: <strong>${num}</strong> in ${UNIT_NAMES.box(b)} is locked to Row ${r+1} — eliminate it from the rest of Row ${r+1}.`,
          };
        }
      }

      // Check if all in same column
      const cols = [...new Set(possible.map(cellCol))];
      if (cols.length === 1) {
        const c = cols[0];
        const colCells = colIndices(c).filter(p => !bIndices.includes(p));
        const canElim = colCells.some(p => candidates[p] && candidates[p].has(num));
        if (canElim) {
          return {
            technique: 'Pointing Pair (Elimination Only)',
            isElimination: true,
            regionType: 'box',
            regionIndex: b,
            highlightPositions: [...bIndices, ...colIndices(c)],
            targetCell: null,
            value: null,
            explanation: `In ${UNIT_NAMES.box(b)}, <strong>${num}</strong> can only appear in Column ${c+1}. This is an elimination hint: <strong>${num}</strong> cannot appear anywhere else in Column ${c+1} outside this box. Remove it from those candidates.`,
            shortExplanation: `Elimination hint: <strong>${num}</strong> in ${UNIT_NAMES.box(b)} is locked to Column ${c+1} — eliminate it from the rest of Column ${c+1}.`,
          };
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fallback: Reveal a random empty cell's correct value
// ---------------------------------------------------------------------------
function fallbackReveal(board, solution) {
  const emptyCells = [];
  for (let pos = 0; pos < 81; pos++) {
    if (board[pos] === 0) emptyCells.push(pos);
  }
  if (emptyCells.length === 0) return null;
  // Pick the first one for consistency
  const pos = emptyCells[0];
  const r = cellRow(pos), c = cellCol(pos);
  const value = solution[pos];
  return {
    technique: 'Direct Reveal',
    regionType: 'cell',
    regionIndex: pos,
    highlightPositions: [pos],
    targetCell: pos,
    value,
    explanation: `This puzzle requires advanced techniques beyond the basic strategies. The answer for R${r+1}C${c+1} is <strong>${value}</strong>.`,
    shortExplanation: `Advanced puzzle — revealing <strong>${value}</strong> for R${r+1}C${c+1}.`,
  };
}

// ---------------------------------------------------------------------------
// Main export: getBestHint
// ---------------------------------------------------------------------------
/**
 * Returns the best available hint for the current board state.
 * @param {number[]} board    - Current board (81 elements, 0=empty)
 * @param {number[]} solution - Full solution (81 elements)
 * @returns {object|null} Hint object or null if board is complete
 */
function getBestHint(board, solution) {
  // Check for completion
  if (board.every(v => v !== 0)) return null;

  // Detect if board has errors vs solution (give correction hint)
  for (let pos = 0; pos < 81; pos++) {
    if (board[pos] !== 0 && board[pos] !== solution[pos]) {
      const r = cellRow(pos), c = cellCol(pos);
      return {
        technique: 'Error Detected',
        regionType: 'cell',
        regionIndex: pos,
        highlightPositions: [pos],
        targetCell: pos,
        value: null,
        explanation: `R${r+1}C${c+1} contains an incorrect number. Try erasing it and reconsidering — it conflicts with the solution.`,
        shortExplanation: `R${r+1}C${c+1} has a mistake — erase it and try again.`,
        isError: true,
      };
    }
  }

  const { buildCandidatesMap } = window.SudokuGen;
  const candidates = buildCandidatesMap(board);

  return (
    findNakedSingle(board, candidates) ||
    findHiddenSingle(board, candidates) ||
    findNakedPair(board, candidates) ||
    findPointingPair(board, candidates) ||
    fallbackReveal(board, solution)
  );
}

window.HintEngine = { getBestHint };
