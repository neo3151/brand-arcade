/* ==========================================================================
   hint-engine.js — Step-by-Step Human Readable Logical Deduction Engine
   Zen Nonogram: Pixel Tapestry
   ========================================================================== */

(function(window) {
  'use strict';

  const HintEngine = {
    // Generate an actionable hint with plain-English logical reasoning
    findBestHint(engine) {
      const size = engine.size;
      const grid = engine.grid;
      const rowClues = engine.rowClues;
      const colClues = engine.colClues;
      const solution = engine.solution;

      // 1. Check for rows that already have all filled cells placed, but have uncrossed empty cells
      for (let r = 0; r < size; r++) {
        const totalNeeded = rowClues[r].reduce((a, b) => a + b, 0);
        let filledCount = 0;
        let emptyIndices = [];
        for (let c = 0; c < size; c++) {
          if (grid[r][c] === 1) filledCount++;
          else if (grid[r][c] === 0) emptyIndices.push(c);
        }

        if (filledCount === totalNeeded && emptyIndices.length > 0) {
          const targetC = emptyIndices[0];
          return {
            type: 'cross',
            r,
            c: targetC,
            targetVal: 2,
            reason: `Row ${r + 1} already has all ${totalNeeded} required filled cells placed. Any remaining empty cells like Column ${targetC + 1} must be marked with an '✕'.`
          };
        }
      }

      // 2. Check for columns that already have all filled cells placed, but have uncrossed empty cells
      for (let c = 0; c < size; c++) {
        const totalNeeded = colClues[c].reduce((a, b) => a + b, 0);
        let filledCount = 0;
        let emptyIndices = [];
        for (let r = 0; r < size; r++) {
          if (grid[r][c] === 1) filledCount++;
          else if (grid[r][c] === 0) emptyIndices.push(r);
        }

        if (filledCount === totalNeeded && emptyIndices.length > 0) {
          const targetR = emptyIndices[0];
          return {
            type: 'cross',
            r: targetR,
            c,
            targetVal: 2,
            reason: `Column ${c + 1} already has all ${totalNeeded} required filled cells. Mark cell at Row ${targetR + 1} with an '✕'.`
          };
        }
      }

      // 3. Mathematical Overlap Deduction on Rows
      for (let r = 0; r < size; r++) {
        const clues = rowClues[r];
        if (clues.length === 1 && clues[0] > Math.floor(size / 2)) {
          const k = clues[0];
          const overlapStart = size - k;
          const overlapEnd = k - 1;
          for (let c = overlapStart; c <= overlapEnd; c++) {
            if (grid[r][c] === 0) {
              return {
                type: 'fill',
                r,
                c,
                targetVal: 1,
                reason: `Row ${r + 1} has a clue of ${k} in a ${size}-cell grid. Whether the block is pushed all the way to the left or all the way to the right, cells ${overlapStart + 1} through ${overlapEnd + 1} must overlap and be filled!`
              };
            }
          }
        }
      }

      // 4. Mathematical Overlap Deduction on Columns
      for (let c = 0; c < size; c++) {
        const clues = colClues[c];
        if (clues.length === 1 && clues[0] > Math.floor(size / 2)) {
          const k = clues[0];
          const overlapStart = size - k;
          const overlapEnd = k - 1;
          for (let r = overlapStart; r <= overlapEnd; r++) {
            if (grid[r][c] === 0) {
              return {
                type: 'fill',
                r,
                c,
                targetVal: 1,
                reason: `Column ${c + 1} has a clue of ${k} in a ${size}-cell grid. Pushing this block to either extreme proves Row ${r + 1} is within the mandatory overlap zone!`
              };
            }
          }
        }
      }

      // 5. Multi-clue exact fit check (sum of clues + mandatory gaps == size)
      for (let r = 0; r < size; r++) {
        const clues = rowClues[r];
        const minLength = clues.reduce((a, b) => a + b, 0) + (clues.length - 1);
        if (minLength === size) {
          let curr = 0;
          for (let i = 0; i < clues.length; i++) {
            const blockLen = clues[i];
            for (let b = 0; b < blockLen; b++) {
              if (grid[r][curr] === 0) {
                return {
                  type: 'fill',
                  r,
                  c: curr,
                  targetVal: 1,
                  reason: `Row ${r + 1} clues (${clues.join(', ')}) plus spacing fit the line length of ${size} exactly. Cell (${r + 1}, ${curr + 1}) must be filled.`
                };
              }
              curr++;
            }
            if (curr < size) {
              if (grid[r][curr] === 0) {
                return {
                  type: 'cross',
                  r,
                  c: curr,
                  targetVal: 2,
                  reason: `Row ${r + 1} clues (${clues.join(', ')}) fit exactly with single spaces. Cell (${r + 1}, ${curr + 1}) is a required separator and must be '✕'.`
                };
              }
              curr++;
            }
          }
        }
      }

      // 6. Intelligent Fallback: Pick an unsolved cell with the most clue context
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] === 0) {
            const isFilled = solution[r][c] === 1;
            const targetVal = isFilled ? 1 : 2;
            const actionVerb = isFilled ? 'filled' : "marked with an '✕'";
            const rowClueStr = rowClues[r].join(', ');
            const colClueStr = colClues[c].join(', ');
            return {
              type: isFilled ? 'fill' : 'cross',
              r,
              c,
              targetVal,
              reason: `By cross-referencing Row ${r + 1} (clues: ${rowClueStr}) with Column ${c + 1} (clues: ${colClueStr}), cell (${r + 1}, ${c + 1}) must be ${actionVerb}.`
            };
          }
        }
      }

      return null;
    }
  };

  window.HintEngine = HintEngine;
})(window);
