/* ==========================================================================
   hint-engine.js — Strategic Move Analyzer & Plain-English Hint Explanation
   Spider Solitaire: Cobweb Manor
   ========================================================================== */

(function(window) {
  'use strict';

  const HintEngine = {
    findBestMove(engine) {
      const candidates = [];

      for (let fromCol = 0; fromCol < 10; fromCol++) {
        const colFrom = engine.tableau[fromCol];
        if (colFrom.length === 0) continue;

        // Find all movable stacks in fromCol
        for (let startIdx = 0; startIdx < colFrom.length; startIdx++) {
          const stack = engine.getMovableStack(fromCol, startIdx);
          if (!stack) continue;

          const rootCard = stack[0];
          const hasHiddenCardBelow = startIdx > 0 && !colFrom[startIdx - 1].faceUp;
          const willEmptyColumn = startIdx === 0;

          for (let toCol = 0; toCol < 10; toCol++) {
            if (fromCol === toCol) continue;
            if (!engine.canDropStack(fromCol, startIdx, toCol)) continue;

            const colTo = engine.tableau[toCol];
            const isTargetEmpty = colTo.length === 0;
            const targetTop = isTargetEmpty ? null : colTo[colTo.length - 1];
            const isSameSuit = targetTop ? (targetTop.suit === rootCard.suit) : false;

            // Calculate strategic score
            let score = 0;

            // Bonus 1: Same suit move
            if (isSameSuit) score += 50;

            // Bonus 2: Uncovers a face-down card
            if (hasHiddenCardBelow) score += 40;

            // Bonus 3: Empties a column (very valuable unless moving a King to an empty column with no benefit)
            if (willEmptyColumn) {
              if (rootCard.value === 13 && isTargetEmpty) {
                // Moving a King from one empty column to another empty column is useless
                score -= 100;
              } else if (!isTargetEmpty) {
                score += 35; // Empties a column by putting card onto another card
              }
            }

            // Moving to empty column: only beneficial if it uncovers a hidden card or splits a mixed sequence
            if (isTargetEmpty && !hasHiddenCardBelow) {
              score -= 20;
            }

            // Check if this move completes a 13-card sequence
            if (isSameSuit && targetTop && targetTop.value === rootCard.value + 1) {
              // Approximate run length
              if (rootCard.value === 1 && (colTo.length + stack.length) >= 13) {
                score += 200; // Winning run completion!
              }
            }

            candidates.push({
              fromCol,
              startIdx,
              toCol,
              stackLength: stack.length,
              rootCard,
              targetTop,
              isSameSuit,
              hasHiddenCardBelow,
              willEmptyColumn,
              isTargetEmpty,
              score
            });
          }
        }
      }

      if (candidates.length === 0) {
        // No tableau moves available
        if (engine.stock.length > 0) {
          return {
            type: 'deal',
            reason: 'No advantageous moves remain on the tableau. Tap the Stock pile to deal 10 new cards!'
          };
        }
        return {
          type: 'none',
          reason: 'No moves available.'
        };
      }

      // Sort by score descending
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];

      // Generate human-friendly explanation
      const rankName = best.rootCard.rankStr;
      const suitSym = best.rootCard.suitSymbol;
      const cardDesc = best.stackLength > 1 ? `${rankName}${suitSym} sequence (${best.stackLength} cards)` : `${rankName}${suitSym}`;

      let reason = '';
      if (best.targetTop) {
        const destDesc = `${best.targetTop.rankStr}${best.targetTop.suitSymbol}`;
        if (best.isSameSuit) {
          if (best.hasHiddenCardBelow) {
            reason = `Move ${cardDesc} from Column ${best.fromCol + 1} onto ${destDesc} in Column ${best.toCol + 1}. This consolidates a pure suit run and reveals a hidden card!`;
          } else {
            reason = `Move ${cardDesc} from Column ${best.fromCol + 1} onto matching ${destDesc} in Column ${best.toCol + 1} to build a homogeneous run.`;
          }
        } else {
          if (best.hasHiddenCardBelow) {
            reason = `Move ${cardDesc} from Column ${best.fromCol + 1} onto ${destDesc} in Column ${best.toCol + 1} to uncover the face-down card underneath.`;
          } else {
            reason = `Shift ${cardDesc} onto ${destDesc} in Column ${best.toCol + 1} to free up cards in Column ${best.fromCol + 1}.`;
          }
        }
      } else {
        reason = `Move ${cardDesc} from Column ${best.fromCol + 1} into empty Column ${best.toCol + 1} to create working space and uncover hidden cards.`;
      }

      return {
        type: 'move',
        fromCol: best.fromCol,
        startIdx: best.startIdx,
        toCol: best.toCol,
        reason
      };
    }
  };

  window.HintEngine = HintEngine;
})(window);
