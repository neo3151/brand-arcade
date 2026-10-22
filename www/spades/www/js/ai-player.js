/* ==========================================================================
   ai-player.js — Intelligent Partnership Spades AI
   Royal Spades
   ========================================================================== */

(function(window) {
  'use strict';

  const AIPlayer = {
    // Estimate bid from hand
    calculateBid(hand, isTwosWild = false, partnerBid = null) {
      if (!hand || hand.length === 0) return 2;

      let estimatedTricks = 0;

      // Group cards by effective suit
      const suitGroups = {
        spades: [],
        hearts: [],
        clubs: [],
        diamonds: []
      };

      for (const card of hand) {
        const effSuit = card.getEffectiveSuit(isTwosWild);
        suitGroups[effSuit].push(card);
      }

      // 1. Evaluate Trumps (Spades + Wild 2s)
      const trumps = suitGroups.spades;
      for (const card of trumps) {
        if (isTwosWild && card.value === 2) {
          // In 2's Wild, any 2 is a virtually guaranteed trick (top trump)
          estimatedTricks += 1.0;
        } else if (card.value === 14) { // Ace of Spades
          estimatedTricks += 1.0;
        } else if (card.value === 13) { // King of Spades
          estimatedTricks += 0.85;
        } else if (card.value === 12) { // Queen of Spades
          estimatedTricks += 0.65;
        } else if (card.value >= 10) {
          estimatedTricks += 0.35;
        }
      }

      // Bonus for long trump holding (ruffing / cutting power)
      if (trumps.length >= 4) {
        estimatedTricks += (trumps.length - 3) * 0.55;
      }

      // 2. Evaluate Off-Suits (Hearts, Clubs, Diamonds)
      for (const suit of ['hearts', 'clubs', 'diamonds']) {
        const cards = suitGroups[suit];
        const count = cards.length;

        const hasAce = cards.some(c => c.value === 14);
        const hasKing = cards.some(c => c.value === 13);
        const hasQueen = cards.some(c => c.value === 12);

        if (hasAce) {
          estimatedTricks += 0.95;
        }
        if (hasKing && count >= 2) {
          estimatedTricks += 0.7;
        }
        if (hasQueen && count >= 3) {
          estimatedTricks += 0.4;
        }

        // Void or singleton bonus if we have trumps to cut
        if (trumps.length >= 2) {
          if (count === 0) estimatedTricks += 0.8;
          else if (count === 1 && !hasAce && !hasKing) estimatedTricks += 0.4;
        }
      }

      // 3. Nil Evaluation: check if hand is extremely weak
      const highCards = hand.filter(c => c.value >= 12 || (isTwosWild && c.value === 2));
      const highTrumps = trumps.filter(c => c.value >= 9 || (isTwosWild && c.value === 2));
      if (highCards.length === 0 && highTrumps.length === 0 && trumps.length <= 2) {
        return 0; // Bid Nil!
      }

      // If partner bid Nil, slightly increase our bid to protect them
      if (partnerBid === 0) {
        estimatedTricks += 0.8;
      }

      const finalBid = Math.round(estimatedTricks);
      return Math.max(1, Math.min(10, finalBid));
    },

    // Choose the most strategic legal card to play
    chooseCard(player, engine) {
      const legal = engine.getLegalCards(player);
      if (legal.length === 0) return null;
      if (legal.length === 1) return legal[0];

      const isTwosWild = engine.isTwosWild;
      const partner = (player === 'north') ? 'south' :
                      (player === 'south') ? 'north' :
                      (player === 'west') ? 'east' : 'west';

      const partnerBid = engine.bids[partner];
      const partnerIsNil = partnerBid === 0;

      // Scenario A: Player is Leading the trick
      if (engine.currentTrick.length === 0) {
        // If partner bid Nil, lead low safe card to avoid gifting trick to partner
        if (partnerIsNil) {
          const nonTrumps = legal.filter(c => !c.isTrump(isTwosWild));
          if (nonTrumps.length > 0) {
            // Pick lowest non-trump
            nonTrumps.sort((a, b) => a.value - b.value);
            return nonTrumps[0];
          }
        }

        // Cash in non-trump Aces early before opponents void and cut
        const aces = legal.filter(c => !c.isTrump(isTwosWild) && c.value === 14);
        if (aces.length > 0) {
          return aces[0];
        }

        // Otherwise lead low card from longest non-trump suit to establish sequence
        const nonTrumps = legal.filter(c => !c.isTrump(isTwosWild));
        if (nonTrumps.length > 0) {
          nonTrumps.sort((a, b) => a.value - b.value);
          return nonTrumps[0];
        }

        // Only trumps: play lowest trump
        legal.sort((a, b) => a.getTrumpPower(isTwosWild) - b.getTrumpPower(isTwosWild));
        return legal[0];
      }

      // Scenario B: Player is Following to existing trick
      const leadCard = engine.currentTrick[0].card;
      const leadSuit = leadCard.getEffectiveSuit(isTwosWild);

      // Identify who is currently winning the trick
      const currentWinner = engine.evaluateTrickWinner(engine.currentTrick);
      const isPartnerWinning = currentWinner.player === partner;

      if (isPartnerWinning) {
        // Partner is currently winning:
        if (partnerIsNil) {
          // DANGER: Partner bid Nil and is about to take the trick!
          // Try to OVERTAKE partner to save their Nil bonus!
          const beatCards = legal.filter(c => window.doesCardBeat(c, currentWinner.card, leadSuit, isTwosWild));
          if (beatCards.length > 0) {
            // Play lowest card that beats partner
            beatCards.sort((a, b) => a.value - b.value);
            return beatCards[0];
          }
        }

        // Normal play: partner is winning, so DUCK!
        // Throw lowest legal card to preserve high cards
        legal.sort((a, b) => {
          const aIsTrump = a.isTrump(isTwosWild);
          const bIsTrump = b.isTrump(isTwosWild);
          if (aIsTrump && !bIsTrump) return 1; // Don't waste trumps
          if (!aIsTrump && bIsTrump) return -1;
          return a.value - b.value;
        });
        return legal[0];
      }

      // Opponent is currently winning:
      // Find cards that can beat the current winning card
      const winningCards = legal.filter(c => window.doesCardBeat(c, currentWinner.card, leadSuit, isTwosWild));

      if (winningCards.length > 0) {
        // We can beat the opponent!
        // Prefer lowest winning card
        winningCards.sort((a, b) => {
          const aIsTrump = a.isTrump(isTwosWild);
          const bIsTrump = b.isTrump(isTwosWild);
          // Prefer beating with suit over burning a trump
          if (!aIsTrump && bIsTrump) return -1;
          if (aIsTrump && !bIsTrump) return 1;
          if (aIsTrump && bIsTrump) {
            return a.getTrumpPower(isTwosWild) - b.getTrumpPower(isTwosWild);
          }
          return a.value - b.value;
        });
        return winningCards[0];
      }

      // Cannot beat the opponent: slough lowest junk card
      legal.sort((a, b) => {
        const aIsTrump = a.isTrump(isTwosWild);
        const bIsTrump = b.isTrump(isTwosWild);
        if (aIsTrump && !bIsTrump) return 1; // Never waste trumps if losing
        if (!aIsTrump && bIsTrump) return -1;
        return a.value - b.value;
      });
      return legal[0];
    }
  };

  window.AIPlayer = AIPlayer;
})(window);
