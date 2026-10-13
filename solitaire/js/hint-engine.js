/**
 * hint-engine.js — Intelligent move analyzer & strategic hint generator.
 * Curious Solitaire (Wonderland Theme)
 */


class HintEngine {
  /**
   * Analyzes the SolitaireEngine instance and returns the best move with strategic rationale.
   */
  static findBestHint(engine) {
    if (engine.isWon()) {
      return {
        found: false,
        reason: "You have already triumphed! All royal courts are complete."
      };
    }

    // 1. Check for Aces or 2s that can go to Foundation immediately (Always safe)
    for (let c = 0; c < 7; c++) {
      const col = engine.tableau[c];
      if (col.length > 0) {
        const top = col[col.length - 1];
        if (top.faceUp && (top.value === 1 || top.value === 2) && engine.canPlaceOnFoundation(top, top.suit)) {
          return {
            found: true,
            type: 'tableau_to_foundation',
            sourceType: 'tableau',
            fromCol: c,
            card: top,
            suit: top.suit,
            reason: `Through the Looking Glass: Send the ${top.rankStr}${top.suitSymbol} to its Foundation to establish the Queen's garden!`
          };
        }
      }
    }

    // 2. Check Waste for Ace or 2 to Foundation
    if (engine.waste.length > 0) {
      const top = engine.waste[engine.waste.length - 1];
      if ((top.value === 1 || top.value === 2) && engine.canPlaceOnFoundation(top, top.suit)) {
        return {
          found: true,
          type: 'waste_to_foundation',
          sourceType: 'waste',
          card: top,
          suit: top.suit,
          reason: `Cheshire smile: Move the ${top.rankStr}${top.suitSymbol} from the Tea Table into the Foundation!`
        };
      }
    }

    // 3. Move Tableau to Tableau that uncovers a face-down card!
    for (let fromCol = 0; fromCol < 7; fromCol++) {
      const col = engine.tableau[fromCol];
      if (col.length > 1) {
        // Find first face-up card
        const firstUpIdx = col.findIndex(c => c.faceUp);
        // Only prioritize if there is at least one face-down card before it
        if (firstUpIdx > 0) {
          const cardToMove = col[firstUpIdx];
          for (let toCol = 0; toCol < 7; toCol++) {
            if (fromCol !== toCol && engine.canPlaceOnTableau(cardToMove, toCol)) {
              // Prefer non-empty columns first
              const destCol = engine.tableau[toCol];
              const destTop = destCol.length > 0 ? destCol[destCol.length - 1] : null;
              const destDesc = destTop ? `${destTop.rankStr}${destTop.suitSymbol}` : 'an empty Tea Lane';
              return {
                found: true,
                type: 'tableau_to_tableau',
                sourceType: 'tableau',
                fromCol,
                cardIndex: firstUpIdx,
                card: cardToMove,
                toCol,
                reason: `Curious discovery: Shift the ${cardToMove.rankStr}${cardToMove.suitSymbol} stack onto ${destDesc} to reveal the hidden card beneath!`
              };
            }
          }
        }
      }
    }

    // 4. Safe Foundation moves for higher cards (> 2) from Tableau
    for (let c = 0; c < 7; c++) {
      const col = engine.tableau[c];
      if (col.length > 0) {
        const top = col[col.length - 1];
        if (top.faceUp && engine.canPlaceOnFoundation(top, top.suit)) {
          // Check if it's safe (opposite color foundations are at least top.value - 2)
          if (this.isFoundationSafe(engine, top)) {
            return {
              found: true,
              type: 'tableau_to_foundation',
              sourceType: 'tableau',
              fromCol: c,
              card: top,
              suit: top.suit,
              reason: `Royal decree: Elevate ${top.rankStr}${top.suitSymbol} to the Foundation to secure your score!`
            };
          }
        }
      }
    }

    // 5. Move Waste to Tableau
    if (engine.waste.length > 0) {
      const card = engine.waste[engine.waste.length - 1];
      for (let toCol = 0; toCol < 7; toCol++) {
        if (engine.canPlaceOnTableau(card, toCol)) {
          const destCol = engine.tableau[toCol];
          // Don't just place a King into an empty column if no follow up, unless waste has other cards
          if (destCol.length > 0 || engine.waste.length > 1) {
            const destDesc = destCol.length > 0 ? `${destCol[destCol.length - 1].rankStr}${destCol[destCol.length - 1].suitSymbol}` : 'an open Lane';
            return {
              found: true,
              type: 'waste_to_tableau',
              sourceType: 'waste',
              card,
              toCol,
              reason: `White Rabbit suggests: Draw the ${card.rankStr}${card.suitSymbol} into play upon ${destDesc}!`
            };
          }
        }
      }
    }

    // 6. Safe Foundation moves from Waste
    if (engine.waste.length > 0) {
      const top = engine.waste[engine.waste.length - 1];
      if (engine.canPlaceOnFoundation(top, top.suit)) {
        return {
          found: true,
          type: 'waste_to_foundation',
          sourceType: 'waste',
          card: top,
          suit: top.suit,
          reason: `Play ${top.rankStr}${top.suitSymbol} from the Waste directly into the Royal Foundation!`
        };
      }
    }

    // 7. General Tableau to Tableau consolidation
    for (let fromCol = 0; fromCol < 7; fromCol++) {
      const col = engine.tableau[fromCol];
      if (col.length > 0) {
        const firstUpIdx = col.findIndex(c => c.faceUp);
        if (firstUpIdx >= 0) {
          const cardToMove = col[firstUpIdx];
          for (let toCol = 0; toCol < 7; toCol++) {
            if (fromCol !== toCol && engine.canPlaceOnTableau(cardToMove, toCol)) {
              const destCol = engine.tableau[toCol];
              if (destCol.length > 0) {
                const destTop = destCol[destCol.length - 1];
                return {
                  found: true,
                  type: 'tableau_to_tableau',
                  sourceType: 'tableau',
                  fromCol,
                  cardIndex: firstUpIdx,
                  card: cardToMove,
                  toCol,
                  reason: `Arrange the tea party: Move ${cardToMove.rankStr}${cardToMove.suitSymbol} onto ${destTop.rankStr}${destTop.suitSymbol} to free up space.`
                };
              }
            }
          }
        }
      }
    }

    // 8. Stock Draw available
    if (engine.stock.length > 0 || engine.waste.length > 0) {
      const action = engine.stock.length > 0 ? "Deal fresh cards from the White Rabbit's Pocket Deck" : "Turn over the Pocket Deck to begin another pass";
      return {
        found: true,
        type: 'draw_stock',
        sourceType: 'stock',
        reason: `${action} to reveal new paths through Wonderland.`
      };
    }

    return {
      found: false,
      reason: "No further moves appear in the Looking Glass. Try using a Cheshire Shuffle or Undo!"
    };
  }

  /**
   * Klondike heuristic: It's safe to move a card to foundation if all opposite colored foundations
   * are already built up to at least rank (card.value - 1) or (card.value - 2).
   */
  static isFoundationSafe(engine, card) {
    if (card.value <= 2) return true;
    const oppSuits = (card.color === 'red') ? ['spades', 'clubs'] : ['hearts', 'diamonds'];
    for (const opp of oppSuits) {
      const pile = engine.foundations[opp];
      const oppTopVal = pile.length > 0 ? pile[pile.length - 1].value : 0;
      if (oppTopVal < card.value - 1) {
        return false;
      }
    }
    return true;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HintEngine };
} else {
  window.HintEngine = HintEngine;
}
