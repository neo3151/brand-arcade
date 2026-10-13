/**
 * klondike-gen.js — Seeded PRNG & Klondike deal generator.
 * Curious Solitaire (Wonderland Theme)
 */

const _getStandardDeck = () => {
  if (typeof createStandardDeck !== 'undefined') return createStandardDeck();
  if (typeof require !== 'undefined') return require('./cards.js').createStandardDeck();
  if (typeof window !== 'undefined' && window.createStandardDeck) return window.createStandardDeck();
  throw new Error('createStandardDeck is not defined');
};

/**
 * High-quality 32-bit seeded pseudo-random number generator (Mulberry32).
 */
function createPRNG(seed) {
  let s = Math.floor(Math.abs(seed)) || 1;
  return function() {
    s |= 0;
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using a seeded PRNG.
 */
function shuffleDeck(deck, prng) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * Generates a full deal for a given seed (dealNumber 1..1000+).
 */
function generateKlondikeDeal(dealNumber = 1) {
  const prng = createPRNG(dealNumber * 1664525 + 1013904223);
  const rawDeck = _getStandardDeck();
  const shuffled = shuffleDeck(rawDeck, prng);

  // 7 Tableau columns
  const tableau = [[], [], [], [], [], [], []];
  let cardIdx = 0;

  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = shuffled[cardIdx++].clone();
      // Top card in column is face up, rest are face down
      card.flip(row === col);
      tableau[col].push(card);
    }
  }

  // Remaining 24 cards in stock (all face down)
  const stock = [];
  while (cardIdx < shuffled.length) {
    const card = shuffled[cardIdx++].clone();
    card.flip(false);
    stock.push(card);
  }

  // Foundations: 4 empty piles
  const foundations = {
    spades: [],
    hearts: [],
    diamonds: [],
    clubs: []
  };

  const waste = [];

  return {
    dealNumber,
    tableau,
    stock,
    waste,
    foundations
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createPRNG, shuffleDeck, generateKlondikeDeal };
} else {
  window.createPRNG = createPRNG;
  window.shuffleDeck = shuffleDeck;
  window.generateKlondikeDeal = generateKlondikeDeal;
}
