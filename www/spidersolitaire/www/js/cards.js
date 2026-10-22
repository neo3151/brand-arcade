/* ==========================================================================
   cards.js — Card Model & SVG Suit Definitions
   Spider Solitaire: Cobweb Manor
   ========================================================================== */

(function(window) {
  'use strict';

  const SUITS = {
    spades: { id: 'spades', name: 'Spades', symbol: '♠', color: 'black' },
    hearts: { id: 'hearts', name: 'Hearts', symbol: '♥', color: 'red' },
    diamonds: { id: 'diamonds', name: 'Diamonds', symbol: '♦', color: 'red' },
    clubs: { id: 'clubs', name: 'Clubs', symbol: '♣', color: 'black' }
  };

  const RANK_NAMES = {
    1: 'A',
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
    13: 'K'
  };

  class Card {
    constructor(suit, value, faceUp = false) {
      this.suit = suit; // 'spades', 'hearts', 'diamonds', 'clubs'
      this.value = value; // 1 to 13
      this.faceUp = faceUp;
      this.id = `${this.suit}_${this.value}_${Math.random().toString(36).substr(2, 6)}`;
    }

    get color() {
      return (this.suit === 'hearts' || this.suit === 'diamonds') ? 'red' : 'black';
    }

    get rankStr() {
      return RANK_NAMES[this.value] || String(this.value);
    }

    get suitSymbol() {
      return SUITS[this.suit] ? SUITS[this.suit].symbol : '♠';
    }

    flip(up) {
      this.faceUp = up !== undefined ? up : !this.faceUp;
    }

    clone() {
      const c = new Card(this.suit, this.value, this.faceUp);
      c.id = this.id;
      return c;
    }

    toJSON() {
      return {
        suit: this.suit,
        value: this.value,
        faceUp: this.faceUp,
        id: this.id
      };
    }

    static fromJSON(data) {
      const card = new Card(data.suit, data.value, data.faceUp);
      card.id = data.id || card.id;
      return card;
    }
  }

  window.Card = Card;
  window.SUITS = SUITS;
  window.RANK_NAMES = RANK_NAMES;
})(window);
