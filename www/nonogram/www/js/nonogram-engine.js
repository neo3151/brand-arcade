/* ==========================================================================
   nonogram-engine.js — Core Nonogram Logic, Grid State, Line Validation & Rules
   Zen Nonogram: Pixel Tapestry
   ========================================================================== */

(function(window) {
  'use strict';

  // Cell States
  const EMPTY = 0;
  const FILLED = 1;
  const CROSSED = 2;

  class NonogramEngine {
    constructor(levelData, options = {}) {
      this.levelData = levelData;
      this.size = levelData.size;
      this.solution = levelData.solution;
      this.rowClues = levelData.rowClues;
      this.colClues = levelData.colClues;

      // Board Matrix [r][c]
      this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(EMPTY));

      // Gameplay state
      this.lives = options.zenMode ? Infinity : 3;
      this.maxLives = 3;
      this.zenMode = !!options.zenMode;
      this.mistakesCount = 0;
      this.isSolved = false;
      this.undoStack = [];

      // Tracking completed rows and cols for audio / visual strikeout
      this.completedRows = new Set();
      this.completedCols = new Set();
    }

    // Check if row matches the solution and is complete
    isRowComplete(r) {
      for (let c = 0; c < this.size; c++) {
        const isSolFilled = this.solution[r][c] === 1;
        const isGridFilled = this.grid[r][c] === FILLED;
        if (isSolFilled !== isGridFilled) {
          return false;
        }
      }
      return true;
    }

    // Check if col matches the solution and is complete
    isColComplete(c) {
      for (let r = 0; r < this.size; r++) {
        const isSolFilled = this.solution[r][c] === 1;
        const isGridFilled = this.grid[r][c] === FILLED;
        if (isSolFilled !== isGridFilled) {
          return false;
        }
      }
      return true;
    }

    // Auto-cross remaining empty cells in a completed line (ONLY cells that are empty in solution)
    autoCrossLine(type, index) {
      const crossedCells = [];
      if (type === 'row') {
        for (let c = 0; c < this.size; c++) {
          if (this.grid[index][c] === EMPTY && this.solution[index][c] === 0) {
            this.grid[index][c] = CROSSED;
            crossedCells.push({ r: index, c, prev: EMPTY, curr: CROSSED });
          }
        }
      } else if (type === 'col') {
        for (let r = 0; r < this.size; r++) {
          if (this.grid[r][index] === EMPTY && this.solution[r][index] === 0) {
            this.grid[r][index] = CROSSED;
            crossedCells.push({ r, c: index, prev: EMPTY, curr: CROSSED });
          }
        }
      }
      return crossedCells;
    }

    // Set cell value directly with history tracking
    setCell(r, c, targetValue, recordUndo = true) {
      if (this.isSolved) return { status: 'game_over' };
      if (r < 0 || r >= this.size || c < 0 || c >= this.size) return { status: 'out_of_bounds' };

      const prev = this.grid[r][c];
      if (prev === targetValue) return { status: 'no_change', prev, val: targetValue };

      // In Strike Mode, filling an incorrect cell triggers an error
      if (!this.zenMode && targetValue === FILLED && this.solution[r][c] !== 1) {
        this.mistakesCount++;
        this.lives--;
        // Auto mark as crossed so player doesn't repeat mistake
        this.grid[r][c] = CROSSED;

        if (recordUndo) {
          this.undoStack.push([{ r, c, prev, curr: CROSSED }]);
        }

        const isGameOver = this.lives <= 0;
        return {
          status: 'mistake',
          lives: this.lives,
          isGameOver,
          r,
          c,
          val: CROSSED
        };
      }

      this.grid[r][c] = targetValue;
      const undoBatch = [{ r, c, prev, curr: targetValue }];

      // Check line completions
      const rowNowComplete = this.isRowComplete(r);
      const colNowComplete = this.isColComplete(c);
      let newlyCompletedLine = false;

      let newlyCrossed = [];
      if (rowNowComplete && !this.completedRows.has(r)) {
        this.completedRows.add(r);
        newlyCompletedLine = true;
        const ac = this.autoCrossLine('row', r);
        newlyCrossed.push(...ac);
        undoBatch.push(...ac);
      } else if (!rowNowComplete && this.completedRows.has(r)) {
        this.completedRows.delete(r);
      }

      if (colNowComplete && !this.completedCols.has(c)) {
        this.completedCols.add(c);
        newlyCompletedLine = true;
        const ac = this.autoCrossLine('col', c);
        newlyCrossed.push(...ac);
        undoBatch.push(...ac);
      } else if (!colNowComplete && this.completedCols.has(c)) {
        this.completedCols.delete(c);
      }

      if (recordUndo) {
        this.undoStack.push(undoBatch);
      }

      // Check Overall Victory Condition
      this.checkVictory();

      return {
        status: 'success',
        r,
        c,
        val: targetValue,
        rowComplete: rowNowComplete,
        colComplete: colNowComplete,
        newlyCompletedLine,
        newlyCrossed,
        isSolved: this.isSolved
      };
    }

    // Check if the entire board matches solution
    checkVictory() {
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const isSolFilled = this.solution[r][c] === 1;
          const isGridFilled = this.grid[r][c] === FILLED;
          if (isSolFilled !== isGridFilled) {
            this.isSolved = false;
            return false;
          }
        }
      }
      this.isSolved = true;
      return true;
    }

    // Undo last action
    undo() {
      if (this.undoStack.length === 0 || this.isSolved) return null;
      const actions = this.undoStack.pop();
      const reverted = [];

      for (const act of actions) {
        this.grid[act.r][act.c] = act.prev;
        reverted.push({ r: act.r, c: act.c, val: act.prev });
      }

      // Re-evaluate line states
      this.completedRows.clear();
      this.completedCols.clear();
      for (let r = 0; r < this.size; r++) {
        if (this.isRowComplete(r)) this.completedRows.add(r);
      }
      for (let c = 0; c < this.size; c++) {
        if (this.isColComplete(c)) this.completedCols.add(c);
      }

      return reverted;
    }

    // Powerup: Line Radar (solves all cells in chosen or most optimal row/col)
    applyLineRadar(type, index) {
      const changed = [];
      const isRow = type === 'row';

      for (let i = 0; i < this.size; i++) {
        const r = isRow ? index : i;
        const c = isRow ? i : index;
        const correctVal = this.solution[r][c] === 1 ? FILLED : CROSSED;
        if (this.grid[r][c] !== correctVal) {
          const prev = this.grid[r][c];
          this.grid[r][c] = correctVal;
          changed.push({ r, c, prev, curr: correctVal });
        }
      }

      if (changed.length > 0) {
        this.undoStack.push(changed);
        if (isRow) this.completedRows.add(index);
        else this.completedCols.add(index);
        this.checkVictory();
      }

      return changed;
    }

    // Powerup: Pixel Bomb (reveals a 3x3 sector)
    applyPixelBomb(centerR, centerC) {
      const changed = [];
      const startR = Math.max(0, centerR - 1);
      const endR = Math.min(this.size - 1, centerR + 1);
      const startC = Math.max(0, centerC - 1);
      const endC = Math.min(this.size - 1, centerC + 1);

      for (let r = startR; r <= endR; r++) {
        for (let c = startC; c <= endC; c++) {
          const correctVal = this.solution[r][c] === 1 ? FILLED : CROSSED;
          if (this.grid[r][c] !== correctVal) {
            const prev = this.grid[r][c];
            this.grid[r][c] = correctVal;
            changed.push({ r, c, prev, curr: correctVal });
          }
        }
      }

      if (changed.length > 0) {
        this.undoStack.push(changed);
        // Re-evaluate line states
        for (let r = 0; r < this.size; r++) if (this.isRowComplete(r)) this.completedRows.add(r);
        for (let c = 0; c < this.size; c++) if (this.isColComplete(c)) this.completedCols.add(c);
        this.checkVictory();
      }

      return changed;
    }
  }

  window.NonogramEngine = NonogramEngine;
  window.NonogramEngine.CELL = { EMPTY, FILLED, CROSSED };
})(window);
