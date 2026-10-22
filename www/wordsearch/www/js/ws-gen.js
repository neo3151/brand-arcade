/**
 * ws-gen.js — Word Search puzzle generator
 * Deterministic seed-based placement of words in a grid.
 * Directions: right (→), down (↓), diagonal down-right (↘), diagonal down-left (↙), diagonal up-right (↗)
 */
'use strict';

// ── Seeded RNG (mulberry32) ──────────────────────────────────────────────────
function createRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Config per difficulty ────────────────────────────────────────────────────
const DIFF_CONFIG = {
  beginner: { size: 10, wordCount: 6,  minLen: 3, maxLen: 6  },
  easy:     { size: 11, wordCount: 8,  minLen: 3, maxLen: 7  },
  medium:   { size: 12, wordCount: 10, minLen: 4, maxLen: 8  },
  hard:     { size: 13, wordCount: 12, minLen: 4, maxLen: 9  },
  master:   { size: 15, wordCount: 15, minLen: 5, maxLen: 12 },
};

// Directions: [deltaRow, deltaCol]
// Includes right (→), down (↓), diagonal down-right (↘), diagonal down-left (↙), diagonal up-right (↗)
const DIRECTIONS = [
  [0,   1],  // right →
  [1,   0],  // down ↓
  [1,   1],  // diagonal down-right ↘
  [1,  -1],  // diagonal down-left ↙
  [-1,  1],  // diagonal up-right ↗
];

const CATEGORY_SEEDS = {
  animals: 100, sports: 200, food: 300, science: 400,
  geography: 500, movies: 600, music: 700, history: 800,
  space: 900, nature: 1000, holidays: 1100, health: 1200,
  jobs: 1300, technology: 1400, colors: 1500,
};

const DIFF_SEEDS = { beginner: 0, easy: 10000, medium: 20000, hard: 30000, master: 40000 };

function computeSeed(category, difficulty, levelNumber) {
  return (CATEGORY_SEEDS[category] || 100) + (DIFF_SEEDS[difficulty] || 0) + levelNumber;
}

// ── Grid helpers ─────────────────────────────────────────────────────────────
function createGrid(size) {
  return Array.from({ length: size }, () => new Array(size).fill(''));
}

function canPlace(grid, word, row, col, dr, dc) {
  const size = grid.length;
  for (let i = 0; i < word.length; i++) {
    const r = row + i * dr;
    const c = col + i * dc;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (grid[r][c] !== '' && grid[r][c] !== word[i]) return false;
  }
  return true;
}

function placeWord(grid, word, row, col, dr, dc) {
  for (let i = 0; i < word.length; i++) {
    grid[row + i * dr][col + i * dc] = word[i];
  }
}

function fillGrid(grid, rng) {
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = LETTERS[Math.floor(rng() * 26)];
      }
    }
  }
}

// ── Main generator ────────────────────────────────────────────────────────────
/**
 * generatePuzzle(category, difficulty, levelNumber)
 * Returns { grid, words, placed, size, seed }
 *   grid:   2D array of uppercase letters
 *   words:  string[] — strictly unique words the player must find (sorted A-Z)
 *   placed: { word, row, col, dr, dc }[]
 *   size:   grid dimension (NxN)
 *   seed:   numeric seed used
 */
function generatePuzzle(category, difficulty, levelNumber) {
  const seed = computeSeed(category, difficulty, levelNumber);
  const rng  = createRNG(seed);
  const cfg  = DIFF_CONFIG[difficulty] || DIFF_CONFIG.beginner;
  const { size, wordCount, minLen, maxLen } = cfg;

  // Pick unique words from the bank
  const rawBank = (window.WORDS[category] || window.WORDS.animals);
  const seenWords = new Set();
  const uniqueBank = [];
  for (const w of rawBank) {
    const trimmed = w.trim().toUpperCase();
    if (!seenWords.has(trimmed) && trimmed.length >= minLen && trimmed.length <= maxLen) {
      seenWords.add(trimmed);
      uniqueBank.push(trimmed);
    }
  }

  const pool = shuffle([...uniqueBank], rng);
  const chosen = pool.slice(0, Math.min(wordCount, pool.length));

  // Sort longest first to maximise placement success
  chosen.sort((a, b) => b.length - a.length);

  const grid   = createGrid(size);
  const placed = [];
  const failed = [];

  for (const word of chosen) {
    let success = false;
    // Try up to 300 random placements across the 5 directions
    for (let attempt = 0; attempt < 300 && !success; attempt++) {
      const [dr, dc] = DIRECTIONS[Math.floor(rng() * DIRECTIONS.length)];
      const row = Math.floor(rng() * size);
      const col = Math.floor(rng() * size);
      if (canPlace(grid, word, row, col, dr, dc)) {
        placeWord(grid, word, row, col, dr, dc);
        placed.push({ word, row, col, dr, dc });
        success = true;
      }
    }
    if (!success) failed.push(word);
  }

  fillGrid(grid, rng);

  // Guarantee strictly unique words list sorted A-Z
  const words = Array.from(new Set(placed.map(p => p.word))).sort();
  return { grid, words, placed, size, seed, failed };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generatePuzzle, DIFF_CONFIG, DIRECTIONS, computeSeed };
} else {
  window.WSGen = { generatePuzzle, DIFF_CONFIG, DIRECTIONS };
}
