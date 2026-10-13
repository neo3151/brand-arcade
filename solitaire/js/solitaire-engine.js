/**
 * solitaire-engine.js — Pure Klondike Solitaire rules, state, validator & moves.
 * Curious Solitaire (Wonderland Theme)
 */

const _getCardClass = () => {
  if (typeof Card !== 'undefined') return Card;
  if (typeof require !== 'undefined') return require('./cards.js').Card;
  if (typeof window !== 'undefined' && window.Card) return window.Card;
  throw new Error('Card class is not defined');
};

class SolitaireEngine {
  constructor(dealData, options = {}) {
    this.drawMode = options.drawMode || 1; // 1 or 3
    this.dealNumber = dealData.dealNumber || 1;
    this.tableau = [[], [], [], [], [], [], []];
    this.stock = [];
    this.waste = [];
    this.foundations = {
      spades: [],
      hearts: [],
      diamonds: [],
      clubs: []
    };
    this.score = 0;
    this.moves = 0;
    this.undoStack = [];

    this.init(dealData);
  }

  init(dealData) {
    const C = _getCardClass();
    this.dealNumber = dealData.dealNumber || 1;
    this.tableau = dealData.tableau.map(col => col.map(c => (c instanceof C ? c.clone() : C.fromJSON(c))));
    this.stock = dealData.stock.map(c => (c instanceof C ? c.clone() : C.fromJSON(c)));
    this.waste = (dealData.waste || []).map(c => (c instanceof C ? c.clone() : C.fromJSON(c)));
    this.foundations = {
      spades: (dealData.foundations.spades || []).map(c => (c instanceof C ? c.clone() : C.fromJSON(c))),
      hearts: (dealData.foundations.hearts || []).map(c => (c instanceof C ? c.clone() : C.fromJSON(c))),
      diamonds: (dealData.foundations.diamonds || []).map(c => (c instanceof C ? c.clone() : C.fromJSON(c))),
      clubs: (dealData.foundations.clubs || []).map(c => (c instanceof C ? c.clone() : C.fromJSON(c)))
    };
    this.score = dealData.score || 0;
    this.moves = dealData.moves || 0;
    this.undoStack = [];
  }

  /* --------------------------------------------------------------------------
     Rule Validation
     -------------------------------------------------------------------------- */

  canPlaceOnTableau(card, colIdx) {
    if (colIdx < 0 || colIdx > 6) return false;
    const col = this.tableau[colIdx];
    if (col.length === 0) {
      // Only King (13) can go to empty column
      return card.value === 13;
    }
    const topCard = col[col.length - 1];
    if (!topCard.faceUp) return false;
    return (card.color !== topCard.color) && (topCard.value === card.value + 1);
  }

  canPlaceOnFoundation(card, suit) {
    if (card.suit !== suit) return false;
    const pile = this.foundations[suit];
    if (pile.length === 0) {
      return card.value === 1; // Ace
    }
    const topCard = pile[pile.length - 1];
    return card.value === topCard.value + 1;
  }

  /* --------------------------------------------------------------------------
     Player Actions
     -------------------------------------------------------------------------- */

  drawStock() {
    if (this.stock.length === 0) {
      if (this.waste.length === 0) return false;
      // Recycle waste back to stock
      const recycledCards = [];
      while (this.waste.length > 0) {
        const c = this.waste.pop();
        c.flip(false);
        recycledCards.push(c);
      }
      this.stock = recycledCards;

      // Penalty for recycling stock in classic Klondike (optional, -20 if Draw 3, -100 if Draw 1)
      if (this.drawMode === 1) {
        this.score = Math.max(0, this.score - 50);
      }

      this.moves++;
      this.undoStack.push({
        type: 'recycle_waste',
        count: recycledCards.length
      });
      return true;
    }

    const count = Math.min(this.drawMode, this.stock.length);
    const drawn = [];
    for (let i = 0; i < count; i++) {
      const c = this.stock.pop();
      c.flip(true);
      this.waste.push(c);
      drawn.push(c);
    }

    this.moves++;
    this.undoStack.push({
      type: 'draw_stock',
      count: drawn.length
    });
    return true;
  }

  moveTableauToTableau(fromCol, cardIndex, toCol) {
    if (fromCol === toCol) return false;
    const srcCol = this.tableau[fromCol];
    if (cardIndex < 0 || cardIndex >= srcCol.length) return false;

    const movingCard = srcCol[cardIndex];
    if (!movingCard.faceUp) return false;

    if (!this.canPlaceOnTableau(movingCard, toCol)) return false;

    const movingCards = srcCol.splice(cardIndex);
    this.tableau[toCol].push(...movingCards);

    // Check if new top card in fromCol needs to be flipped face up
    let flippedCard = false;
    if (srcCol.length > 0 && !srcCol[srcCol.length - 1].faceUp) {
      srcCol[srcCol.length - 1].flip(true);
      flippedCard = true;
      this.score += 5; // Reward for uncovering face-down card
    }

    this.moves++;
    this.undoStack.push({
      type: 'tableau_to_tableau',
      fromCol,
      toCol,
      count: movingCards.length,
      flippedCard
    });
    return true;
  }

  moveWasteToTableau(toCol) {
    if (this.waste.length === 0) return false;
    const card = this.waste[this.waste.length - 1];
    if (!this.canPlaceOnTableau(card, toCol)) return false;

    this.waste.pop();
    this.tableau[toCol].push(card);
    this.score += 5;
    this.moves++;

    this.undoStack.push({
      type: 'waste_to_tableau',
      toCol
    });
    return true;
  }

  moveWasteToFoundation(suit) {
    if (this.waste.length === 0) return false;
    const card = this.waste[this.waste.length - 1];
    if (!this.canPlaceOnFoundation(card, suit)) return false;

    this.waste.pop();
    this.foundations[suit].push(card);
    this.score += 10;
    this.moves++;

    this.undoStack.push({
      type: 'waste_to_foundation',
      suit
    });
    return true;
  }

  moveTableauToFoundation(fromCol, suit) {
    const col = this.tableau[fromCol];
    if (col.length === 0) return false;
    const card = col[col.length - 1];
    if (!card.faceUp) return false;
    if (!this.canPlaceOnFoundation(card, suit)) return false;

    col.pop();
    this.foundations[suit].push(card);
    this.score += 10;

    let flippedCard = false;
    if (col.length > 0 && !col[col.length - 1].faceUp) {
      col[col.length - 1].flip(true);
      flippedCard = true;
      this.score += 5;
    }

    this.moves++;
    this.undoStack.push({
      type: 'tableau_to_foundation',
      fromCol,
      suit,
      flippedCard
    });
    return true;
  }

  moveFoundationToTableau(suit, toCol) {
    const pile = this.foundations[suit];
    if (pile.length === 0) return false;
    const card = pile[pile.length - 1];
    if (!this.canPlaceOnTableau(card, toCol)) return false;

    pile.pop();
    this.tableau[toCol].push(card);
    this.score = Math.max(0, this.score - 15);
    this.moves++;

    this.undoStack.push({
      type: 'foundation_to_tableau',
      suit,
      toCol
    });
    return true;
  }

  /* --------------------------------------------------------------------------
     Undo System
     -------------------------------------------------------------------------- */

  undo() {
    if (this.undoStack.length === 0) return false;
    const act = this.undoStack.pop();

    switch (act.type) {
      case 'draw_stock': {
        for (let i = 0; i < act.count; i++) {
          const c = this.waste.pop();
          c.flip(false);
          this.stock.push(c);
        }
        break;
      }
      case 'recycle_waste': {
        while (this.stock.length > 0) {
          const c = this.stock.pop();
          c.flip(true);
          this.waste.push(c);
        }
        if (this.drawMode === 1) {
          this.score += 50;
        }
        break;
      }
      case 'tableau_to_tableau': {
        const destCol = this.tableau[act.toCol];
        const moving = destCol.splice(destCol.length - act.count);
        const srcCol = this.tableau[act.fromCol];

        if (act.flippedCard && srcCol.length > 0) {
          srcCol[srcCol.length - 1].flip(false);
          this.score = Math.max(0, this.score - 5);
        }
        srcCol.push(...moving);
        break;
      }
      case 'waste_to_tableau': {
        const card = this.tableau[act.toCol].pop();
        this.waste.push(card);
        this.score = Math.max(0, this.score - 5);
        break;
      }
      case 'waste_to_foundation': {
        const card = this.foundations[act.suit].pop();
        this.waste.push(card);
        this.score = Math.max(0, this.score - 10);
        break;
      }
      case 'tableau_to_foundation': {
        const card = this.foundations[act.suit].pop();
        const srcCol = this.tableau[act.fromCol];
        if (act.flippedCard && srcCol.length > 0) {
          srcCol[srcCol.length - 1].flip(false);
          this.score = Math.max(0, this.score - 5);
        }
        srcCol.push(card);
        this.score = Math.max(0, this.score - 10);
        break;
      }
      case 'foundation_to_tableau': {
        const card = this.tableau[act.toCol].pop();
        this.foundations[act.suit].push(card);
        this.score += 15;
        break;
      }
      case 'reshuffle': {
        this.stock = act.prevStock.map(c => Card.fromJSON(c));
        this.waste = act.prevWaste.map(c => Card.fromJSON(c));
        return true;
      }
    }

    this.moves = Math.max(0, this.moves - 1);
    return true;
  }

  /* --------------------------------------------------------------------------
     Smart Tap-to-Move Finder
     -------------------------------------------------------------------------- */

  findSmartMove(sourceType, sourceLocation, cardIndex = -1) {
    if (sourceType === 'foundation') {
      const suit = sourceLocation;
      const pile = this.foundations[suit];
      if (pile.length === 0) return null;
      const card = pile[pile.length - 1];

      // Check if top foundation card can go to any non-empty tableau column
      for (let c = 0; c < 7; c++) {
        if (this.tableau[c].length > 0 && this.canPlaceOnTableau(card, c)) {
          return { targetType: 'tableau', targetLoc: c };
        }
      }
      return null;
    }

    if (sourceType === 'waste') {
      if (this.waste.length === 0) return null;
      const card = this.waste[this.waste.length - 1];

      // 1. Foundation first
      if (this.canPlaceOnFoundation(card, card.suit)) {
        return { targetType: 'foundation', targetLoc: card.suit };
      }
      // 2. Non-empty Tableau next
      for (let c = 0; c < 7; c++) {
        if (this.tableau[c].length > 0 && this.canPlaceOnTableau(card, c)) {
          return { targetType: 'tableau', targetLoc: c };
        }
      }
      // 3. Empty Tableau (if King)
      for (let c = 0; c < 7; c++) {
        if (this.tableau[c].length === 0 && this.canPlaceOnTableau(card, c)) {
          return { targetType: 'tableau', targetLoc: c };
        }
      }
      return null;
    }

    if (sourceType === 'tableau') {
      const colIdx = sourceLocation;
      const col = this.tableau[colIdx];
      if (col.length === 0 || cardIndex < 0 || cardIndex >= col.length) return null;
      const card = col[cardIndex];
      if (!card.faceUp) return null;

      const isTopCard = (cardIndex === col.length - 1);

      // 1. If it's a single top card, check Foundation first
      if (isTopCard && this.canPlaceOnFoundation(card, card.suit)) {
        return { targetType: 'foundation', targetLoc: card.suit };
      }

      // 2. Check other non-empty Tableau columns
      for (let c = 0; c < 7; c++) {
        if (c !== colIdx && this.tableau[c].length > 0 && this.canPlaceOnTableau(card, c)) {
          return { targetType: 'tableau', targetLoc: c, cardIndex };
        }
      }

      // 3. Empty Tableau columns (Only move King if it exposes a face-down card or from non-empty pile)
      if (card.value === 13 && cardIndex > 0) {
        for (let c = 0; c < 7; c++) {
          if (c !== colIdx && this.tableau[c].length === 0 && this.canPlaceOnTableau(card, c)) {
            return { targetType: 'tableau', targetLoc: c, cardIndex };
          }
        }
      }

      return null;
    }

    return null;
  }

  /* --------------------------------------------------------------------------
     Auto-Complete & Win Detection
     -------------------------------------------------------------------------- */

  isWon() {
    let total = 0;
    for (const suit of SUIT_LIST) {
      total += this.foundations[suit].length;
    }
    return total === 52;
  }

  isAutoCompleteReady() {
    if (this.isWon()) return false;

    // Must have NO face-down cards anywhere on the tableau
    for (let c = 0; c < 7; c++) {
      for (const card of this.tableau[c]) {
        if (!card.faceUp) return false;
      }
    }

    // If stock still has cards, not auto-completable yet
    if (this.stock.length > 0) return false;

    // If waste is empty and all tableau cards are face up: 100% winnable!
    if (this.waste.length === 0) {
      return this.getNextAutoCompleteMove() !== null;
    }

    // If waste has cards, verify via dry-run that it can fully solve without stalling
    return this.canSolveToFoundations();
  }

  canSolveToFoundations() {
    try {
      const clone = SolitaireEngine.deserialize(this.serialize());
      let movesAttempted = 0;
      while (!clone.isWon() && movesAttempted < 60) {
        const next = clone.getNextAutoCompleteMove();
        if (!next) return false; // Stalls!
        if (next.sourceType === 'waste') {
          clone.moveWasteToFoundation(next.suit);
        } else if (next.sourceType === 'tableau') {
          clone.moveTableauToFoundation(next.fromCol, next.suit);
        }
        movesAttempted++;
      }
      return clone.isWon();
    } catch (e) {
      return false;
    }
  }

  getNextAutoCompleteMove() {
    // Check waste first
    if (this.waste.length > 0) {
      const card = this.waste[this.waste.length - 1];
      if (this.canPlaceOnFoundation(card, card.suit)) {
        return { sourceType: 'waste', suit: card.suit };
      }
    }

    // Find the lowest card in the tableau that can go to a foundation
    let bestMove = null;
    let lowestVal = 99;

    for (let c = 0; c < 7; c++) {
      const col = this.tableau[c];
      if (col.length > 0) {
        const card = col[col.length - 1];
        if (this.canPlaceOnFoundation(card, card.suit)) {
          if (card.value < lowestVal) {
            lowestVal = card.value;
            bestMove = { sourceType: 'tableau', fromCol: c, suit: card.suit };
          }
        }
      }
    }

    return bestMove;
  }

  /* --------------------------------------------------------------------------
     Serialization
     -------------------------------------------------------------------------- */

  serialize() {
    return {
      dealNumber: this.dealNumber,
      drawMode: this.drawMode,
      score: this.score,
      moves: this.moves,
      tableau: this.tableau.map(col => col.map(c => c.toJSON())),
      stock: this.stock.map(c => c.toJSON()),
      waste: this.waste.map(c => c.toJSON()),
      foundations: {
        spades: this.foundations.spades.map(c => c.toJSON()),
        hearts: this.foundations.hearts.map(c => c.toJSON()),
        diamonds: this.foundations.diamonds.map(c => c.toJSON()),
        clubs: this.foundations.clubs.map(c => c.toJSON())
      },
      undoStack: this.undoStack
    };
  }

  static deserialize(data) {
    const C = _getCardClass();
    const dealData = {
      dealNumber: data.dealNumber,
      score: data.score,
      moves: data.moves,
      tableau: data.tableau.map(col => col.map(c => C.fromJSON(c))),
      stock: data.stock.map(c => C.fromJSON(c)),
      waste: (data.waste || []).map(c => C.fromJSON(c)),
      foundations: {
        spades: (data.foundations.spades || []).map(c => C.fromJSON(c)),
        hearts: (data.foundations.hearts || []).map(c => C.fromJSON(c)),
        diamonds: (data.foundations.diamonds || []).map(c => C.fromJSON(c)),
        clubs: (data.foundations.clubs || []).map(c => C.fromJSON(c))
      }
    };
    const engine = new SolitaireEngine(dealData, { drawMode: data.drawMode });
    engine.undoStack = data.undoStack || [];
    return engine;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SolitaireEngine };
} else {
  window.SolitaireEngine = SolitaireEngine;
}
