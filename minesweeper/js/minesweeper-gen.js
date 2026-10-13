/**
 * INFERNO SWEEPER — minesweeper-gen.js
 * Grid generator with guaranteed first-click 3x3 opening and logical constraint solver.
 */

'use strict';

window.MineGen = (() => {

  const PRESETS = {
    recruit:   { width: 9,  height: 9,  mines: 10, label: 'Phobos Outpost (Recruit)' },
    marine:    { width: 16, height: 16, mines: 40, label: 'Deimos Lab (Marine)' },
    nightmare: { width: 30, height: 16, mines: 99, label: "Hell's Gate (Nightmare)" }
  };

  /**
   * Generates a blank grid without mines yet (mines placed on first click)
   */
  function createBlankGrid(width, height) {
    const grid = [];
    for (let r = 0; r < height; r++) {
      const row = [];
      for (let c = 0; c < width; c++) {
        row.push({
          row: r,
          col: c,
          isMine: false,
          neighborMines: 0,
          revealed: false,
          flagged: false,
          defused: false
        });
      }
      grid.push(row);
    }
    return grid;
  }

  /**
   * Helper: Get valid neighbor coordinates in 8 directions
   */
  function getNeighbors(grid, r, c) {
    const neighbors = [];
    const height = grid.length;
    const width = grid[0].length;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
          neighbors.push(grid[nr][nc]);
        }
      }
    }
    return neighbors;
  }

  /**
   * Populate mines on first click, strictly keeping the 3x3 neighborhood of (safeR, safeC) mine-free.
   */
  function populateMines(grid, totalMines, safeR, safeC) {
    const height = grid.length;
    const width = grid[0].length;
    const totalCells = width * height;

    // Safety check for mine count
    const maxSafeMines = totalCells - 9;
    const actualMines = Math.min(totalMines, Math.max(1, maxSafeMines));

    // Determine reserved zone (safe cell + 8 neighbors)
    const reserved = new Set();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = safeR + dr;
        const nc = safeC + dc;
        if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
          reserved.add(`${nr},${nc}`);
        }
      }
    }

    // Candidate pool
    const candidates = [];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (!reserved.has(`${r},${c}`)) {
          candidates.push({ r, c });
        }
      }
    }

    // Shuffle candidates (Fisher-Yates)
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = temp;
    }

    // Place mines
    for (let i = 0; i < actualMines && i < candidates.length; i++) {
      const { r, c } = candidates[i];
      grid[r][c].isMine = true;
    }

    // Calculate neighbor counts
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (grid[r][c].isMine) continue;
        const nbs = getNeighbors(grid, r, c);
        grid[r][c].neighborMines = nbs.filter(n => n.isMine).length;
      }
    }
    return actualMines;
  }

  /**
   * Logical Solver for Orb of Clairvoyance
   * Deduces 100% safe unrevealed cells based on satisfied numbers.
   */
  function findSafeTile(grid) {
    const height = grid.length;
    const width = grid[0].length;

    const guaranteedSafe = [];
    const guaranteedMines = [];

    // Phase 1: Simple single-cell deduction
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const cell = grid[r][c];
        if (!cell.revealed || cell.neighborMines === 0) continue;

        const nbs = getNeighbors(grid, r, c);
        const unrevealed = nbs.filter(n => !n.revealed);
        const flagged = unrevealed.filter(n => n.flagged);
        const unflagged = unrevealed.filter(n => !n.flagged);

        if (unflagged.length === 0) continue;

        // Rule A: If flags == neighborMines, all remaining unrevealed neighbors are safe!
        if (flagged.length === cell.neighborMines) {
          unflagged.forEach(u => guaranteedSafe.push(u));
        }

        // Rule B: If unrevealed count == neighborMines, all are mines!
        if (unrevealed.length === cell.neighborMines) {
          unflagged.forEach(u => guaranteedMines.push(u));
        }
      }
    }

    if (guaranteedSafe.length > 0) {
      // Pick one distinct safe tile
      const pick = guaranteedSafe[Math.floor(Math.random() * guaranteedSafe.length)];
      return { row: pick.row, col: pick.col, type: 'guaranteed_safe' };
    }

    // Phase 2: Double-set / subset deduction
    // Check pairs of revealed cells that share unrevealed neighbors
    for (let r1 = 0; r1 < height; r1++) {
      for (let c1 = 0; c1 < width; c1++) {
        const cell1 = grid[r1][c1];
        if (!cell1.revealed || cell1.neighborMines === 0) continue;

        const nbs1 = getNeighbors(grid, r1, c1);
        const unrev1 = nbs1.filter(n => !n.revealed && !n.flagged);
        const flags1 = nbs1.filter(n => !n.revealed && n.flagged).length;
        const rem1 = cell1.neighborMines - flags1;
        if (unrev1.length === 0 || rem1 < 0) continue;

        const set1 = new Set(unrev1.map(n => `${n.row},${n.col}`));

        for (let r2 = 0; r2 < height; r2++) {
          for (let c2 = 0; c2 < width; c2++) {
            if (r1 === r2 && c1 === c2) continue;
            const cell2 = grid[r2][c2];
            if (!cell2.revealed || cell2.neighborMines === 0) continue;

            const nbs2 = getNeighbors(grid, r2, c2);
            const unrev2 = nbs2.filter(n => !n.revealed && !n.flagged);
            const flags2 = nbs2.filter(n => !n.revealed && n.flagged).length;
            const rem2 = cell2.neighborMines - flags2;
            if (unrev2.length === 0 || rem2 < 0) continue;

            // Check if unrev2 is a subset of unrev1
            const isSubset = unrev2.every(n => set1.has(`${n.row},${n.col}`));
            if (isSubset) {
              const diff = unrev1.filter(n => !unrev2.some(m => m.row === n.row && m.col === n.col));
              // If remaining mines match, the difference must be safe!
              if (rem1 === rem2 && diff.length > 0) {
                const pick = diff[0];
                return { row: pick.row, col: pick.col, type: 'guaranteed_safe' };
              }
            }
          }
        }
      }
    }

    // If no mathematically forced safe tile can be deduced, return null (never guess a mine)
    return null;
  }

  return {
    PRESETS,
    createBlankGrid,
    getNeighbors,
    populateMines,
    findSafeTile
  };

})();
