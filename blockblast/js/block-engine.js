/* ==========================================================================
   block-engine.js — Core 8x8 Polyomino Block Blast Engine
   Timber Block Blast
   ========================================================================== */

(function(window) {
  'use strict';

  const GRID_SIZE = 8;

  // Polyomino definitions
  const SHAPE_DEFINITIONS = [
    // 1x1 Dot
    { id: 'dot', matrix: [[1]], weight: 10, color: '#f59e0b' },

    // Dominoes (2-blocks)
    { id: 'bar2_h', matrix: [[1, 1]], weight: 8, color: '#10b981' },
    { id: 'bar2_v', matrix: [[1], [1]], weight: 8, color: '#10b981' },

    // Trominoes (3-blocks)
    { id: 'bar3_h', matrix: [[1, 1, 1]], weight: 8, color: '#3b82f6' },
    { id: 'bar3_v', matrix: [[1], [1], [1]], weight: 8, color: '#3b82f6' },
    { id: 'l_tromino_1', matrix: [[1, 0], [1, 1]], weight: 7, color: '#8b5cf6' },
    { id: 'l_tromino_2', matrix: [[0, 1], [1, 1]], weight: 7, color: '#8b5cf6' },
    { id: 'l_tromino_3', matrix: [[1, 1], [1, 0]], weight: 7, color: '#8b5cf6' },
    { id: 'l_tromino_4', matrix: [[1, 1], [0, 1]], weight: 7, color: '#8b5cf6' },

    // Squares
    { id: 'square2', matrix: [[1, 1], [1, 1]], weight: 8, color: '#ec4899' },
    { id: 'square3', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], weight: 3, color: '#ef4444' },

    // Tetrominoes (4-blocks)
    { id: 'bar4_h', matrix: [[1, 1, 1, 1]], weight: 6, color: '#06b6d4' },
    { id: 'bar4_v', matrix: [[1], [1], [1], [1]], weight: 6, color: '#06b6d4' },
    { id: 't_tetro_1', matrix: [[1, 1, 1], [0, 1, 0]], weight: 5, color: '#f97316' },
    { id: 't_tetro_2', matrix: [[0, 1], [1, 1], [0, 1]], weight: 5, color: '#f97316' },
    { id: 't_tetro_3', matrix: [[0, 1, 0], [1, 1, 1]], weight: 5, color: '#f97316' },
    { id: 't_tetro_4', matrix: [[1, 0], [1, 1], [1, 0]], weight: 5, color: '#f97316' },
    { id: 'l_tetro_1', matrix: [[1, 0], [1, 0], [1, 1]], weight: 5, color: '#14b8a6' },
    { id: 'l_tetro_2', matrix: [[0, 1], [0, 1], [1, 1]], weight: 5, color: '#14b8a6' },
    { id: 'l_tetro_3', matrix: [[1, 1, 1], [1, 0, 0]], weight: 5, color: '#14b8a6' },
    { id: 'l_tetro_4', matrix: [[1, 1, 1], [0, 0, 1]], weight: 5, color: '#14b8a6' },
    { id: 'z_tetro_1', matrix: [[1, 1, 0], [0, 1, 1]], weight: 4, color: '#eab308' },
    { id: 'z_tetro_2', matrix: [[0, 1, 1], [1, 1, 0]], weight: 4, color: '#eab308' },

    // Pentominoes (5-blocks)
    { id: 'bar5_h', matrix: [[1, 1, 1, 1, 1]], weight: 3, color: '#6366f1' },
    { id: 'bar5_v', matrix: [[1], [1], [1], [1], [1]], weight: 3, color: '#6366f1' },
    { id: 'corner3_1', matrix: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], weight: 4, color: '#d946ef' },
    { id: 'corner3_2', matrix: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], weight: 4, color: '#d946ef' },
    { id: 'corner3_3', matrix: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], weight: 4, color: '#d946ef' },
    { id: 'corner3_4', matrix: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], weight: 4, color: '#d946ef' },
    { id: 'plus', matrix: [[0, 1, 0], [1, 1, 1], [0, 1, 0]], weight: 3, color: '#84cc16' }
  ];

  class BlockEngine {
    constructor() {
      this.gridSize = GRID_SIZE;
      this.grid = this.createEmptyGrid();
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.linesClearedThisGame = 0;
      this.trayPieces = [null, null, null];
      this.isGameOver = false;
      this.movesHistory = [];

      this.dealNewTray();
    }

    createEmptyGrid() {
      const g = [];
      for (let r = 0; r < this.gridSize; r++) {
        g[r] = new Array(this.gridSize).fill(0);
      }
      return g;
    }

    // Helper: Clone matrix
    cloneMatrix(m) {
      return m.map(row => [...row]);
    }

    // Weighted random shape picker
    pickRandomShape() {
      const totalWeight = SHAPE_DEFINITIONS.reduce((acc, s) => acc + s.weight, 0);
      let rand = Math.random() * totalWeight;

      for (const def of SHAPE_DEFINITIONS) {
        if (rand < def.weight) {
          return {
            id: def.id + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            defId: def.id,
            matrix: this.cloneMatrix(def.matrix),
            color: def.color,
            rows: def.matrix.length,
            cols: def.matrix[0].length
          };
        }
        rand -= def.weight;
      }
      const fallback = SHAPE_DEFINITIONS[0];
      return {
        id: fallback.id + '_' + Date.now(),
        defId: fallback.id,
        matrix: this.cloneMatrix(fallback.matrix),
        color: fallback.color,
        rows: fallback.matrix.length,
        cols: fallback.matrix[0].length
      };
    }

    // Deal 3 new pieces into the tray
    dealNewTray() {
      this.trayPieces = [
        this.pickRandomShape(),
        this.pickRandomShape(),
        this.pickRandomShape()
      ];

      this.ensureTrayHasFittablePiece();
      this.checkGameOver();
    }

    // Ensure at least one tray piece can fit on the board by swapping in a small piece
    ensureTrayHasFittablePiece() {
      if (this.canAnyPieceFit()) return;

      for (const def of SHAPE_DEFINITIONS) {
        if (def.matrix.length <= 2 && def.matrix[0].length <= 2) {
          const candidate = {
            id: def.id + '_' + Date.now(),
            defId: def.id,
            matrix: this.cloneMatrix(def.matrix),
            color: def.color,
            rows: def.matrix.length,
            cols: def.matrix[0].length
          };
          if (this.canFitOnBoard(candidate.matrix)) {
            for (let i = 0; i < this.trayPieces.length; i++) {
              if (this.trayPieces[i] !== null) {
                this.trayPieces[i] = candidate;
                return;
              }
            }
            return;
          }
        }
      }
    }

    // Check if a specific matrix can fit at (startRow, startCol)
    canPlace(matrix, startRow, startCol) {
      const mRows = matrix.length;
      const mCols = matrix[0].length;

      for (let r = 0; r < mRows; r++) {
        for (let c = 0; c < mCols; c++) {
          if (matrix[r][c] === 1) {
            const gr = startRow + r;
            const gc = startCol + c;

            if (gr < 0 || gr >= this.gridSize || gc < 0 || gc >= this.gridSize) {
              return false; // Out of bounds
            }
            if (this.grid[gr][gc] !== 0) {
              return false; // Already occupied
            }
          }
        }
      }
      return true;
    }

    // Check if a piece matrix can fit ANYWHERE on the board
    canFitOnBoard(matrix) {
      const mRows = matrix.length;
      const mCols = matrix[0].length;

      for (let r = 0; r <= this.gridSize - mRows; r++) {
        for (let c = 0; c <= this.gridSize - mCols; c++) {
          if (this.canPlace(matrix, r, c)) {
            return true;
          }
        }
      }
      return false;
    }

    // Check if ANY of the remaining tray pieces can fit on the board
    canAnyPieceFit() {
      for (const p of this.trayPieces) {
        if (p && this.canFitOnBoard(p.matrix)) {
          return true;
        }
      }
      return false;
    }

    checkGameOver() {
      const hasPieces = this.trayPieces.some(p => p !== null);
      this.isGameOver = hasPieces ? !this.canAnyPieceFit() : false;
      return this.isGameOver;
    }

    // Place a piece from tray onto the grid
    placePiece(pieceIndex, startRow, startCol) {
      if (this.isGameOver) return { success: false, reason: 'game_over' };
      const piece = this.trayPieces[pieceIndex];
      if (!piece) return { success: false, reason: 'no_piece' };

      if (!this.canPlace(piece.matrix, startRow, startCol)) {
        return { success: false, reason: 'invalid_position' };
      }

      const placedCells = [];
      let tilesPlaced = 0;

      for (let r = 0; r < piece.matrix.length; r++) {
        for (let c = 0; c < piece.matrix[0].length; c++) {
          if (piece.matrix[r][c] === 1) {
            const gr = startRow + r;
            const gc = startCol + c;
            this.grid[gr][gc] = piece.color;
            placedCells.push({ r: gr, c: gc, color: piece.color });
            tilesPlaced++;
          }
        }
      }

      // Remove placed piece from tray
      this.trayPieces[pieceIndex] = null;

      // Base placement points (+1 per tile)
      this.score += tilesPlaced;

      // Scan for completed rows & cols
      const fullRows = [];
      const fullCols = [];

      for (let r = 0; r < this.gridSize; r++) {
        if (this.grid[r].every(val => val !== 0)) {
          fullRows.push(r);
        }
      }

      for (let c = 0; c < this.gridSize; c++) {
        let colFull = true;
        for (let r = 0; r < this.gridSize; r++) {
          if (this.grid[r][c] === 0) {
            colFull = false;
            break;
          }
        }
        if (colFull) {
          fullCols.push(c);
        }
      }

      const totalLines = fullRows.length + fullCols.length;
      const clearedCells = [];
      let lineScore = 0;

      if (totalLines > 0) {
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.linesClearedThisGame += totalLines;

        // Collect all distinct cleared coordinates
        const clearedMap = {};

        for (const r of fullRows) {
          for (let c = 0; c < this.gridSize; c++) {
            clearedMap[`${r},${c}`] = { r, c };
          }
        }

        for (const c of fullCols) {
          for (let r = 0; r < this.gridSize; r++) {
            clearedMap[`${r},${c}`] = { r, c };
          }
        }

        for (const key in clearedMap) {
          const pt = clearedMap[key];
          clearedCells.push(pt);
          this.grid[pt.r][pt.c] = 0;
        }

        // Scoring: 1 line = 10, 2 = 30, 3 = 60, 4 = 100, 5 = 150...
        const baseLinePts = [0, 10, 30, 60, 100, 150, 210, 280, 360];
        const base = baseLinePts[Math.min(totalLines, baseLinePts.length - 1)] || (totalLines * 40);
        const comboBonus = Math.floor(base * (this.combo - 1) * 0.45);
        lineScore = base + comboBonus;

        this.score += lineScore;
      } else {
        // No line cleared: reset combo streak
        this.combo = 0;
      }

      // Check if tray is empty -> deal new tray
      let newTrayDealt = false;
      if (this.trayPieces.every(p => p === null)) {
        this.dealNewTray();
        newTrayDealt = true;
      } else {
        this.checkGameOver();
      }

      const totalPointsAdded = tilesPlaced + (totalLines > 0 ? lineScore : 0);

      return {
        success: true,
        placedCells,
        fullRows,
        fullCols,
        clearedCells,
        totalLines,
        combo: this.combo,
        lineScore: totalLines > 0 ? lineScore : 0,
        pointsAdded: totalPointsAdded,
        score: this.score,
        newTrayDealt,
        isGameOver: this.isGameOver
      };
    }

    // Powerup: Rotate piece 90 degrees clockwise
    rotatePiece(pieceIndex) {
      const piece = this.trayPieces[pieceIndex];
      if (!piece) return false;

      const m = piece.matrix;
      const oldRows = m.length;
      const oldCols = m[0].length;
      const rotated = [];

      for (let c = 0; c < oldCols; c++) {
        rotated[c] = [];
        for (let r = oldRows - 1; r >= 0; r--) {
          rotated[c].push(m[r][c]);
        }
      }

      // Revert rotations that would leave no placeable piece — a powerup shouldn't kill the run
      const wasFittable = this.canAnyPieceFit();
      piece.matrix = rotated;
      piece.rows = rotated.length;
      piece.cols = rotated[0].length;
      if (wasFittable && !this.canAnyPieceFit()) {
        piece.matrix = m;
        piece.rows = oldRows;
        piece.cols = oldCols;
        return false;
      }

      this.checkGameOver();
      return true;
    }

    // Powerup: Hammer / Bomb clears a 3x3 block around (centerRow, centerCol)
    useHammer(centerRow, centerCol) {
      const cleared = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = centerRow + dr;
          const c = centerCol + dc;
          if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
            if (this.grid[r][c] !== 0) {
              cleared.push({ r, c });
              this.grid[r][c] = 0;
            }
          }
        }
      }
      this.checkGameOver();
      return cleared;
    }

    // Powerup: Reroll tray pieces
    rerollTray() {
      for (let i = 0; i < this.trayPieces.length; i++) {
        if (this.trayPieces[i] !== null) {
          this.trayPieces[i] = this.pickRandomShape();
        }
      }
      this.ensureTrayHasFittablePiece();
      this.checkGameOver();
      return this.trayPieces;
    }

    // Revive option on game over: clear full rows 3 & 4 and full columns 3 & 4 to guarantee space
    revive() {
      const cleared = [];
      // Full cross clear of 2 rows and 2 cols guarantees space for any shape up to 1x5, 5x1, 3x3, etc.
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          if (r === 3 || r === 4 || c === 3 || c === 4) {
            if (this.grid[r][c] !== 0) {
              cleared.push({ r, c });
              this.grid[r][c] = 0;
            }
          }
        }
      }

      // If still no piece fits, ensure at least one tray piece is a 1x1 dot
      if (!this.canAnyPieceFit()) {
        const dotDef = SHAPE_DEFINITIONS.find(s => s.id === 'dot') || SHAPE_DEFINITIONS[0];
        for (let i = 0; i < this.trayPieces.length; i++) {
          if (this.trayPieces[i] !== null) {
            this.trayPieces[i] = {
              id: 'dot_revive_' + Date.now(),
              defId: 'dot',
              matrix: [[1]],
              color: dotDef.color,
              rows: 1,
              cols: 1
            };
            break;
          }
        }
      }

      this.isGameOver = false;
      this.checkGameOver();
      return cleared;
    }

    // Serialization for Continue Support
    toJSON() {
      return {
        grid: this.grid,
        score: this.score,
        combo: this.combo,
        maxCombo: this.maxCombo,
        linesClearedThisGame: this.linesClearedThisGame,
        trayPieces: this.trayPieces,
        isGameOver: this.isGameOver
      };
    }

    static fromJSON(data) {
      const engine = new BlockEngine();
      engine.grid = data.grid.map(row => [...row]);
      engine.score = data.score || 0;
      engine.combo = data.combo || 0;
      engine.maxCombo = data.maxCombo || 0;
      engine.linesClearedThisGame = data.linesClearedThisGame || 0;
      engine.trayPieces = data.trayPieces || [null, null, null];
      engine.isGameOver = !!data.isGameOver;
      return engine;
    }
  }

  window.BlockEngine = BlockEngine;
})(window);
