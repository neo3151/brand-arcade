/* ==========================================================================
   spider-engine.js — Core Spider Solitaire Rules, Moves, Run Assembly & State
   Spider Solitaire: Cobweb Manor
   ========================================================================== */

(function(window) {
  'use strict';

  class SpiderEngine {
    constructor(dealData) {
      this.difficulty = dealData.difficulty;
      this.dealNumber = dealData.dealNumber;

      // 10 Tableau Columns
      this.tableau = dealData.tableau.map(col => col.map(c => c.clone()));

      // Stock Pile (50 cards initial)
      this.stock = dealData.stock.map(c => c.clone());

      // Foundation: stores completed runs (up to 8, e.g. ['spades', 'spades', ...])
      this.completedRuns = [];

      // Stats & History
      this.movesCount = 0;
      this.isSolved = false;
      this.undoStack = [];
    }

    // Check if the card stack in colIdx starting at startIdx is legally movable
    getMovableStack(colIdx, startIdx) {
      const col = this.tableau[colIdx];
      if (!col || startIdx < 0 || startIdx >= col.length) return null;

      const moving = col.slice(startIdx);
      if (moving.length === 0 || !moving[0].faceUp) return null;

      // Single card is always movable
      if (moving.length === 1) return moving;

      // Multiple cards MUST be same-suit and strictly descending by 1
      for (let i = 1; i < moving.length; i++) {
        const prev = moving[i - 1];
        const curr = moving[i];
        if (!curr.faceUp) return null;
        if (curr.suit !== prev.suit) return null;
        if (curr.value !== prev.value - 1) return null;
      }

      return moving;
    }

    // Check if a stack starting at startIdx in fromCol can legally drop onto toCol
    canDropStack(fromCol, startIdx, toCol) {
      if (fromCol === toCol) return false;
      const stack = this.getMovableStack(fromCol, startIdx);
      if (!stack) return false;

      const targetCol = this.tableau[toCol];
      // Empty column accepts any movable stack
      if (!targetCol || targetCol.length === 0) return true;

      const topCard = targetCol[targetCol.length - 1];
      // Target card must be faceUp and rank must be exactly 1 higher than moving root
      return topCard.faceUp && topCard.value === stack[0].value + 1;
    }

    // Execute move of stack from fromCol to toCol
    moveStack(fromCol, startIdx, toCol, recordUndo = true) {
      if (!this.canDropStack(fromCol, startIdx, toCol)) return { success: false };

      const colFrom = this.tableau[fromCol];
      const colTo = this.tableau[toCol];

      const moving = colFrom.splice(startIdx);
      colTo.push(...moving);
      this.movesCount++;

      // Check if source column top card needs to be flipped face-up
      let flippedUnderCard = false;
      if (colFrom.length > 0 && !colFrom[colFrom.length - 1].faceUp) {
        colFrom[colFrom.length - 1].flip(true);
        flippedUnderCard = true;
      }

      // Check if target column now contains a completed 13-card K-to-A run
      const assembledRun = this.checkAndAssembleRun(toCol);

      if (recordUndo) {
        this.undoStack.push({
          type: 'move',
          fromCol,
          toCol,
          count: moving.length,
          flippedUnderCard,
          assembledRun
        });
      }

      this.checkVictory();

      return {
        success: true,
        fromCol,
        toCol,
        count: moving.length,
        flippedUnderCard,
        assembledRun,
        isSolved: this.isSolved
      };
    }

    // Check if column ends with a complete same-suit King-to-Ace (13 to 1) run
    checkAndAssembleRun(colIdx) {
      const col = this.tableau[colIdx];
      if (col.length < 13) return null;

      const top13 = col.slice(col.length - 13);
      // Top card must be Ace (1), bottom must be King (13)
      if (top13[12].value !== 1 || top13[0].value !== 13) return null;

      const suit = top13[0].suit;
      for (let i = 0; i < 13; i++) {
        const card = top13[i];
        if (!card.faceUp || card.suit !== suit || card.value !== 13 - i) {
          return null;
        }
      }

      // Complete run detected! Splice out the 13 cards and add to Foundation
      const removedCards = col.splice(col.length - 13, 13);
      this.completedRuns.push(suit);

      // Flip newly exposed card if face down
      let flippedNext = false;
      if (col.length > 0 && !col[col.length - 1].faceUp) {
        col[col.length - 1].flip(true);
        flippedNext = true;
      }

      return {
        suit,
        colIdx,
        cards: removedCards,
        flippedNext
      };
    }

    hasEmptyColumn() {
      return this.tableau.some(col => col.length === 0);
    }

    // Deal 10 cards from Stock (1 card to each column)
    dealFromStock() {
      if (this.stock.length < 10) return { success: false, reason: 'stock_empty' };

      // Standard Spider Solitaire rule: Cannot deal while any column is empty
      if (this.hasEmptyColumn()) {
        return { success: false, reason: 'empty_column' };
      }

      const dealt = [];
      for (let col = 0; col < 10; col++) {
        const card = this.stock.pop();
        card.flip(true);
        this.tableau[col].push(card);
        dealt.push({ col, card });
      }
      this.movesCount++;

      // Check all 10 columns for potential run completions triggered by the deal
      const assembledRuns = [];
      for (let col = 0; col < 10; col++) {
        const run = this.checkAndAssembleRun(col);
        if (run) assembledRuns.push(run);
      }

      this.undoStack.push({
        type: 'deal',
        dealt,
        assembledRuns
      });

      this.checkVictory();

      return {
        success: true,
        dealt,
        assembledRuns,
        remainingDeals: Math.floor(this.stock.length / 10),
        isSolved: this.isSolved
      };
    }

    // Check overall win condition: all 8 runs completed
    checkVictory() {
      if (this.completedRuns.length >= 8) {
        this.isSolved = true;
        return true;
      }
      return false;
    }

    // Undo last action
    undo() {
      if (this.undoStack.length === 0 || this.isSolved) return null;
      const act = this.undoStack.pop();

      if (act.type === 'move') {
        const colFrom = this.tableau[act.fromCol];
        const colTo = this.tableau[act.toCol];

        // If an assembled run was created by this move, restore the 13 cards back to colTo
        if (act.assembledRun) {
          this.completedRuns.pop();
          if (act.assembledRun.flippedNext && colTo.length > 0) {
            if (typeof colTo[colTo.length - 1].flip === 'function') {
              colTo[colTo.length - 1].flip(false);
            }
          }
          const restoredCards = act.assembledRun.cards.map(c =>
            (c instanceof window.Card || (c && typeof c.flip === 'function')) ? c : window.Card.fromJSON(c)
          );
          colTo.push(...restoredCards);
        }

        // Return the moved stack back to colFrom
        const rawStack = colTo.splice(colTo.length - act.count);
        const stack = rawStack.map(c =>
          (c instanceof window.Card || (c && typeof c.flip === 'function')) ? c : window.Card.fromJSON(c)
        );
        if (act.flippedUnderCard && colFrom.length > 0) {
          if (typeof colFrom[colFrom.length - 1].flip === 'function') {
            colFrom[colFrom.length - 1].flip(false);
          }
        }
        colFrom.push(...stack);
        this.movesCount = Math.max(0, this.movesCount - 1);
        return { type: 'move' };
      }

      if (act.type === 'deal') {
        // Restore any runs assembled during the deal
        if (act.assembledRuns && act.assembledRuns.length > 0) {
          for (let i = act.assembledRuns.length - 1; i >= 0; i--) {
            const run = act.assembledRuns[i];
            this.completedRuns.pop();
            const col = this.tableau[run.colIdx];
            if (run.flippedNext && col.length > 0) {
              if (typeof col[col.length - 1].flip === 'function') {
                col[col.length - 1].flip(false);
              }
            }
            const restoredCards = run.cards.map(c =>
              (c instanceof window.Card || (c && typeof c.flip === 'function')) ? c : window.Card.fromJSON(c)
            );
            col.push(...restoredCards);
          }
        }

        // Put the 10 dealt cards back into stock
        for (let i = act.dealt.length - 1; i >= 0; i--) {
          const item = act.dealt[i];
          const rawCard = this.tableau[item.col].pop();
          const card = (rawCard instanceof window.Card || (rawCard && typeof rawCard.flip === 'function'))
            ? rawCard
            : window.Card.fromJSON(rawCard);
          card.flip(false);
          this.stock.push(card);
        }
        this.movesCount = Math.max(0, this.movesCount - 1);
        return { type: 'deal' };
      }

      return null;
    }

    // Tactical Power-up: Spiderweb Magnet (finds and auto-attaches matching suit runs)
    applySpiderMagnet() {
      // Look for same-suit connections that consolidate sequences
      for (let fromCol = 0; fromCol < 10; fromCol++) {
        const col = this.tableau[fromCol];
        if (col.length === 0) continue;

        // Find the lowest faceUp card in fromCol that begins a same-suit run
        let lowestMovableIdx = -1;
        for (let i = 0; i < col.length; i++) {
          if (this.getMovableStack(fromCol, i)) {
            lowestMovableIdx = i;
            break;
          }
        }
        if (lowestMovableIdx === -1) continue;

        const moving = this.getMovableStack(fromCol, lowestMovableIdx);
        const movingRoot = moving[0];

        // Search for a target column whose top card is same suit and rank + 1
        for (let toCol = 0; toCol < 10; toCol++) {
          if (fromCol === toCol) continue;
          const targetCol = this.tableau[toCol];
          if (targetCol.length > 0) {
            const targetTop = targetCol[targetCol.length - 1];
            if (targetTop.faceUp && targetTop.suit === movingRoot.suit && targetTop.value === movingRoot.value + 1) {
              // Execute optimal same-suit magnet pull!
              return this.moveStack(fromCol, lowestMovableIdx, toCol);
            }
          }
        }
      }
      return null;
    }
  }

  window.SpiderEngine = SpiderEngine;
})(window);
