/* ==========================================================================
   cards.js — Card Model & 2's Wild Trump Hierarchy
   Royal Spades
   ========================================================================== */

(function(window) {
  'use strict';

  const SUITS = {
    spades: { id: 'spades', name: 'Spades', symbol: '♠', color: 'black', order: 4 },
    hearts: { id: 'hearts', name: 'Hearts', symbol: '♥', color: 'red', order: 3 },
    clubs: { id: 'clubs', name: 'Clubs', symbol: '♣', color: 'black', order: 2 },
    diamonds: { id: 'diamonds', name: 'Diamonds', symbol: '♦', color: 'red', order: 1 }
  };

  const RANK_NAMES = {
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    8: '8',
    9: '9',
    10: '10',
    11: 'J',
    12: 'Q',
    13: 'K',
    14: 'A'
  };

  // 2's Wild Trump Power Hierarchy as specifically requested by user:
  // 2 of Hearts is the most powerful, then 2 of Clubs, then 2 of Diamonds, then 2 of Spades.
  const TWOS_WILD_POWER = {
    hearts: 104,   // 2♥ Supreme Trump
    clubs: 103,    // 2♣ Second Highest Trump
    diamonds: 102, // 2♦ Third Highest Trump
    spades: 101    // 2♠ Fourth Highest Trump
  };

  class Card {
    constructor(suit, value) {
      this.suit = suit;   // 'spades', 'hearts', 'clubs', 'diamonds'
      this.value = value; // 2 through 14 (Ace = 14)
      this.id = `${this.suit}_${this.value}_${Math.random().toString(36).substr(2, 6)}`;
    }

    get rankStr() {
      return RANK_NAMES[this.value] || String(this.value);
    }

    get suitSymbol() {
      return SUITS[this.suit] ? SUITS[this.suit].symbol : '♠';
    }

    get color() {
      return (this.suit === 'hearts' || this.suit === 'diamonds') ? 'red' : 'black';
    }

    // In 2's Wild mode, any 2 is a permanent Trump card!
    isTrump(isTwosWild = false) {
      if (this.suit === 'spades') return true;
      if (isTwosWild && this.value === 2) return true;
      return false;
    }

    // In 2's Wild mode, any 2 acts as a Spade for trick matching and trumping
    getEffectiveSuit(isTwosWild = false) {
      if (isTwosWild && this.value === 2) return 'spades';
      return this.suit;
    }

    // Numerical power when card is acting as a trump
    getTrumpPower(isTwosWild = false) {
      if (!this.isTrump(isTwosWild)) return 0;
      if (isTwosWild && this.value === 2) {
        return TWOS_WILD_POWER[this.suit] || 100;
      }
      // Standard spade ranks 2..14
      return this.value;
    }

    toJSON() {
      return {
        suit: this.suit,
        value: this.value,
        id: this.id
      };
    }

    static fromJSON(data) {
      const card = new Card(data.suit, data.value);
      card.id = data.id || card.id;
      return card;
    }
  }

  // Create standard 52-card deck
  function createDeck() {
    const deck = [];
    const suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    for (const suit of suits) {
      for (let val = 2; val <= 14; val++) {
        deck.push(new Card(suit, val));
      }
    }
    return deck;
  }

  // Fisher-Yates shuffle
  function shuffleDeck(deck) {
    const arr = [...deck];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Compare two cards played in a trick to see if newCard beats bestCard
  // Returns true if newCard beats bestCard
  function doesCardBeat(newCard, bestCard, leadSuit, isTwosWild = false) {
    if (!bestCard) return true;

    const newIsTrump = newCard.isTrump(isTwosWild);
    const bestIsTrump = bestCard.isTrump(isTwosWild);

    // If newCard is trump and bestCard is not trump -> newCard wins
    if (newIsTrump && !bestIsTrump) return true;

    // If bestCard is trump and newCard is not trump -> bestCard wins
    if (!newIsTrump && bestIsTrump) return false;

    // If both are trumps -> higher trump power wins
    if (newIsTrump && bestIsTrump) {
      return newCard.getTrumpPower(isTwosWild) > bestCard.getTrumpPower(isTwosWild);
    }

    // Neither is trump:
    // Lead suit must be matched; an off-suit non-trump cannot beat lead suit
    const newEffSuit = newCard.getEffectiveSuit(isTwosWild);
    const bestEffSuit = bestCard.getEffectiveSuit(isTwosWild);

    if (newEffSuit === leadSuit && bestEffSuit !== leadSuit) return true;
    if (newEffSuit !== leadSuit && bestEffSuit === leadSuit) return false;

    if (newEffSuit === leadSuit && bestEffSuit === leadSuit) {
      return newCard.value > bestCard.value;
    }

    // Neither matched lead suit and neither is trump
    return false;
  }

  // Sort hand for clean player presentation (Spades, Hearts, Clubs, Diamonds; High to Low)
  function sortHand(cards, isTwosWild = false) {
    return [...cards].sort((a, b) => {
      const aIsTrump = a.isTrump(isTwosWild);
      const bIsTrump = b.isTrump(isTwosWild);

      // Trumps go first
      if (aIsTrump && !bIsTrump) return -1;
      if (!aIsTrump && bIsTrump) return 1;

      if (aIsTrump && bIsTrump) {
        return b.getTrumpPower(isTwosWild) - a.getTrumpPower(isTwosWild);
      }

      // Group by suit order
      const suitOrderA = SUITS[a.suit].order;
      const suitOrderB = SUITS[b.suit].order;
      if (suitOrderA !== suitOrderB) {
        return suitOrderB - suitOrderA;
      }

      // Within same suit, high to low
      return b.value - a.value;
    });
  }

  window.SUITS = SUITS;
  window.RANK_NAMES = RANK_NAMES;
  window.TWOS_WILD_POWER = TWOS_WILD_POWER;
  window.Card = Card;
  window.createDeck = createDeck;
  window.shuffleDeck = shuffleDeck;
  window.doesCardBeat = doesCardBeat;
  window.sortHand = sortHand;
})(window);
