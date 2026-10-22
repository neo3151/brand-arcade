/* ==========================================================================
   deck-generator.js — Seeded Deterministic Deck Shuffler & Initial Deal
   Spider Solitaire: Cobweb Manor (1, 2, and 4 Suits • 1,000 Deals Each)
   ========================================================================== */

(function(window) {
  'use strict';

  function mulberry32(seed) {
    return function() {
      var t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const DeckGenerator = {
    generateDeck(difficulty, dealNumber) {
      const cards = [];

      if (difficulty === '1suit') {
        // 8 sets of 13 Spades (104 cards)
        for (let set = 0; set < 8; set++) {
          for (let v = 1; v <= 13; v++) {
            cards.push(new window.Card('spades', v, false));
          }
        }
      } else if (difficulty === '2suit') {
        // 4 sets of Spades (52) + 4 sets of Hearts (52) = 104 cards
        for (let set = 0; set < 4; set++) {
          for (let v = 1; v <= 13; v++) {
            cards.push(new window.Card('spades', v, false));
            cards.push(new window.Card('hearts', v, false));
          }
        }
      } else {
        // 4 suits: 2 full standard 52-card decks (104 cards)
        for (let set = 0; set < 2; set++) {
          for (const s of ['spades', 'hearts', 'diamonds', 'clubs']) {
            for (let v = 1; v <= 13; v++) {
              cards.push(new window.Card(s, v, false));
            }
          }
        }
      }

      // Seeded Fisher-Yates Shuffle
      const diffHash = { '1suit': 1001, '2suit': 2002, '4suit': 4004 }[difficulty] || 1;
      const seed = (diffHash * 10000) + dealNumber;
      const rng = mulberry32(seed);

      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const temp = cards[i];
        cards[i] = cards[j];
        cards[j] = temp;
      }

      return cards;
    },

    // Deal into 10 Tableau Columns (54 cards) and Stock (50 cards)
    dealGame(difficulty, dealNumber) {
      const deck = this.generateDeck(difficulty, dealNumber);
      const tableau = Array.from({ length: 10 }, () => []);

      let deckIndex = 0;

      // Columns 0-3 get 6 cards (5 face down, 1 face up)
      // Columns 4-9 get 5 cards (4 face down, 1 face up)
      for (let r = 0; r < 6; r++) {
        for (let col = 0; col < 10; col++) {
          if (r === 5 && col >= 4) continue; // Col 4-9 only get 5 cards
          const card = deck[deckIndex++];
          // Determine if face up (the top card of the initial column)
          const isTopCard = (col < 4 && r === 5) || (col >= 4 && r === 4);
          card.flip(isTopCard);
          tableau[col].push(card);
        }
      }

      // Remaining 50 cards go to the stock pile (all face down)
      const stock = deck.slice(deckIndex);
      stock.forEach(c => c.flip(false));

      return {
        difficulty,
        dealNumber,
        tableau,
        stock
      };
    }
  };

  window.DeckGenerator = DeckGenerator;
})(window);
