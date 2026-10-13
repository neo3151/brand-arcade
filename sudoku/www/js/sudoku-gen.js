/**
 * sudoku-gen.js
 * Seed-based Sudoku puzzle generator and solver.
 * Each (difficulty, levelNumber) pair deterministically produces the same puzzle.
 */

'use strict';

// ---------------------------------------------------------------------------
// Seeded pseudo-random number generator (mulberry32)
// ---------------------------------------------------------------------------
function createRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromDifficultyAndLevel(difficulty, levelNumber) {
  const diffMap = { beginner: 1000, easy: 2000, medium: 3000, hard: 4000, master: 5000 };
  return (diffMap[difficulty] || 1000) + levelNumber;
}

// ---------------------------------------------------------------------------
// Shuffle an array in-place using the provided rng
// ---------------------------------------------------------------------------
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Board helpers — board is a flat 81-element array, 0 = empty
// ---------------------------------------------------------------------------
function emptyBoard() {
  return new Array(81).fill(0);
}

function idx(row, col) {
  return row * 9 + col;
}

function isValid(board, pos, num) {
  const row = Math.floor(pos / 9);
  const col = pos % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let i = 0; i < 9; i++) {
    if (board[row * 9 + i] === num) return false;
    if (board[i * 9 + col] === num) return false;
    if (board[(boxRow + Math.floor(i / 3)) * 9 + boxCol + (i % 3)] === num) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Fast Bitmask MRV Solver
// Returns number of solutions found up to `limit`
// ---------------------------------------------------------------------------
function countSolutions(board, limit = 2) {
  const rows = new Uint16Array(9);
  const cols = new Uint16Array(9);
  const boxes = new Uint16Array(9);
  const empties = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const pos = r * 9 + c;
      const val = board[pos];
      if (val !== 0) {
        const mask = 1 << val;
        rows[r] |= mask;
        cols[c] |= mask;
        boxes[Math.floor(r / 3) * 3 + Math.floor(c / 3)] |= mask;
      } else {
        empties.push(pos);
      }
    }
  }

  let solutions = 0;

  function search(idxPos) {
    if (idxPos === empties.length) {
      solutions++;
      return solutions >= limit;
    }

    // Minimum Remaining Values (MRV) heuristic
    let bestIdx = idxPos;
    let minCandidates = 10;
    let bestMask = 0;

    for (let i = idxPos; i < empties.length; i++) {
      const pos = empties[i];
      const r = Math.floor(pos / 9);
      const c = pos % 9;
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      const used = rows[r] | cols[c] | boxes[b];

      let count = 0;
      for (let n = 1; n <= 9; n++) {
        if ((used & (1 << n)) === 0) count++;
      }
      if (count < minCandidates) {
        minCandidates = count;
        bestIdx = i;
        bestMask = used;
        if (count <= 1) break;
      }
    }

    if (minCandidates === 0) return false;

    // Swap best to current search position
    const pos = empties[bestIdx];
    empties[bestIdx] = empties[idxPos];
    empties[idxPos] = pos;

    const r = Math.floor(pos / 9);
    const c = pos % 9;
    const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);

    for (let n = 1; n <= 9; n++) {
      const bit = 1 << n;
      if ((bestMask & bit) === 0) {
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[b] |= bit;
        board[pos] = n;

        if (search(idxPos + 1)) return true;

        board[pos] = 0;
        rows[r] &= ~bit;
        cols[c] &= ~bit;
        boxes[b] &= ~bit;
      }
    }

    empties[idxPos] = empties[bestIdx];
    empties[bestIdx] = pos;

    return false;
  }

  search(0);
  return solutions;
}

// ---------------------------------------------------------------------------
// Generate a fully solved board using seeded rng
// ---------------------------------------------------------------------------
function generateSolvedBoard(rng) {
  const board = emptyBoard();
  // Fill diagonal 3x3 boxes first (mutually independent)
  for (let box = 0; box < 3; box++) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
    let i = 0;
    for (let r = box * 3; r < box * 3 + 3; r++) {
      for (let c = box * 3; c < box * 3 + 3; c++) {
        board[idx(r, c)] = nums[i++];
      }
    }
  }

  const rows = new Uint16Array(9);
  const cols = new Uint16Array(9);
  const boxes = new Uint16Array(9);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = board[idx(r, c)];
      if (v !== 0) {
        const m = 1 << v;
        rows[r] |= m;
        cols[c] |= m;
        boxes[Math.floor(r / 3) * 3 + Math.floor(c / 3)] |= m;
      }
    }
  }

  function bt(pos) {
    while (pos < 81 && board[pos] !== 0) pos++;
    if (pos === 81) return true;

    const r = Math.floor(pos / 9);
    const c = pos % 9;
    const bx = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    const used = rows[r] | cols[c] | boxes[bx];
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);

    for (const n of nums) {
      const bit = 1 << n;
      if ((used & bit) === 0) {
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[bx] |= bit;
        board[pos] = n;

        if (bt(pos + 1)) return true;

        board[pos] = 0;
        rows[r] &= ~bit;
        cols[c] &= ~bit;
        boxes[bx] &= ~bit;
      }
    }
    return false;
  }

  bt(0);
  return board;
}

// ---------------------------------------------------------------------------
// Clue counts per difficulty (how many cells REMAIN visible)
// ---------------------------------------------------------------------------
const CLUE_COUNTS = {
  beginner: 46,
  easy:     36,
  medium:   30,
  hard:     25,
  master:   22,
};

// ---------------------------------------------------------------------------
// Remove cells from solved board while ensuring unique solution
// Uses multi-pass removal
// ---------------------------------------------------------------------------
function digPuzzle(solvedBoard, targetClues, rng) {
  const puzzle = [...solvedBoard];
  let remaining = 81;
  const positions = shuffle([...Array(81).keys()], rng);

  let changed = true;
  while (changed && remaining > targetClues) {
    changed = false;
    const currentPositions = shuffle(positions.filter(p => puzzle[p] !== 0), rng);
    for (const pos of currentPositions) {
      if (remaining <= targetClues) break;
      const backup = puzzle[pos];
      puzzle[pos] = 0;

      if (countSolutions([...puzzle], 2) === 1) {
        remaining--;
        changed = true;
      } else {
        puzzle[pos] = backup; // restore
      }
    }
  }

  return { puzzle, clues: remaining };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a puzzle for the given difficulty and level number.
 * Returns { puzzle, solution, seed }
 * Both puzzle and solution are flat 81-element arrays (0 = empty in puzzle).
 */
function generatePuzzle(difficulty, levelNumber) {
  const targetClues = CLUE_COUNTS[difficulty] || 32;
  const baseSeed = seedFromDifficultyAndLevel(difficulty, levelNumber);
  let best = null;

  // Retry with seed variants if needed to guarantee exact target clues
  for (let attempt = 0; attempt < 200; attempt++) {
    const seed = (baseSeed + attempt * 7919) >>> 0;
    const rng = createRNG(seed);
    const solution = generateSolvedBoard(rng);
    const { puzzle, clues } = digPuzzle(solution, targetClues, rng);

    if (!best || clues < best.clues) {
      best = { puzzle, solution, seed: baseSeed, clues };
    }

    if (clues <= targetClues) {
      return { puzzle, solution, seed: baseSeed };
    }
  }

  return { puzzle: best.puzzle, solution: best.solution, seed: baseSeed };
}

/**
 * Solve a puzzle (returns solved board or null if no solution).
 * Input: flat 81-element array with 0 for empty cells.
 */
function solvePuzzle(puzzle) {
  const board = [...puzzle];
  const solutions = countSolutions([...board], 1);
  if (solutions === 0) return null;

  // Find solution and return it
  const rows = new Uint16Array(9);
  const cols = new Uint16Array(9);
  const boxes = new Uint16Array(9);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = board[idx(r, c)];
      if (v !== 0) {
        const m = 1 << v;
        rows[r] |= m;
        cols[c] |= m;
        boxes[Math.floor(r / 3) * 3 + Math.floor(c / 3)] |= m;
      }
    }
  }

  function bt(pos) {
    while (pos < 81 && board[pos] !== 0) pos++;
    if (pos === 81) return true;

    const r = Math.floor(pos / 9);
    const c = pos % 9;
    const bx = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    const used = rows[r] | cols[c] | boxes[bx];

    for (let n = 1; n <= 9; n++) {
      const bit = 1 << n;
      if ((used & bit) === 0) {
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[bx] |= bit;
        board[pos] = n;

        if (bt(pos + 1)) return true;

        board[pos] = 0;
        rows[r] &= ~bit;
        cols[c] &= ~bit;
        boxes[bx] &= ~bit;
      }
    }
    return false;
  }

  bt(0);
  return board;
}

/**
 * Get all candidate numbers for a cell in the current board state.
 */
function getCandidates(board, pos) {
  if (board[pos] !== 0) return [];
  const candidates = [];
  for (let n = 1; n <= 9; n++) {
    if (isValid(board, pos, n)) candidates.push(n);
  }
  return candidates;
}

/**
 * Build a candidates map for all empty cells.
 * Returns an array of 81 entries: each is a Set of candidate numbers (or null if cell is filled).
 */
function buildCandidatesMap(board) {
  return board.map((val, pos) => {
    if (val !== 0) return null;
    const set = new Set();
    for (let n = 1; n <= 9; n++) {
      if (isValid(board, pos, n)) set.add(n);
    }
    return set;
  });
}

// Export for use in other modules
window.SudokuGen = {
  generatePuzzle,
  solvePuzzle,
  countSolutions,
  getCandidates,
  buildCandidatesMap,
  idx,
  isValid,
};
