/**
 * cards.js — Card definitions, deck creation, and SVG rendering.
 * Curious Solitaire (Wonderland Theme)
 */

const SUITS = {
  SPADES: { id: 'spades', name: 'Spades', symbol: '♠', color: 'black' },
  HEARTS: { id: 'hearts', name: 'Hearts', symbol: '♥', color: 'red' },
  DIAMONDS: { id: 'diamonds', name: 'Diamonds', symbol: '♦', color: 'red' },
  CLUBS: { id: 'clubs', name: 'Clubs', symbol: '♣', color: 'black' }
};

const SUIT_LIST = ['spades', 'hearts', 'diamonds', 'clubs'];

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
    this.suit = suit;           // 'spades', 'hearts', 'diamonds', 'clubs'
    this.value = value;         // 1 to 13
    this.faceUp = faceUp;       // boolean
    this.id = `${this.suit}_${this.value}`;
  }

  get color() {
    return (this.suit === 'hearts' || this.suit === 'diamonds') ? 'red' : 'black';
  }

  get rankStr() {
    return RANK_NAMES[this.value];
  }

  get suitSymbol() {
    return SUITS[this.suit.toUpperCase()].symbol;
  }

  flip(up) {
    this.faceUp = up !== undefined ? up : !this.faceUp;
  }

  clone() {
    return new Card(this.suit, this.value, this.faceUp);
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
    return new Card(data.suit, data.value, data.faceUp);
  }
}

function createStandardDeck() {
  const deck = [];
  for (const suit of SUIT_LIST) {
    for (let val = 1; val <= 13; val++) {
      deck.push(new Card(suit, val, false));
    }
  }
  return deck;
}

/**
 * Ensures shared SVG defs (radialGradient & pattern) exist once in the DOM.
 * Eliminates duplicate SVG IDs across multiple card instances.
 */
function ensureSharedDefs() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('solitaire-card-defs')) {
    const svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgDefs.id = 'solitaire-card-defs';
    svgDefs.setAttribute('aria-hidden', 'true');
    svgDefs.style.position = 'absolute';
    svgDefs.style.width = '0';
    svgDefs.style.height = '0';
    svgDefs.style.overflow = 'hidden';
    svgDefs.innerHTML = `
      <defs>
        <radialGradient id="cardBackGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#1e3a5f" />
          <stop offset="70%" stop-color="#0e1f36" />
          <stop offset="100%" stop-color="#08111e" />
        </radialGradient>
        <pattern id="cardPattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M10 0 L20 10 L10 20 L0 10 Z" fill="none" stroke="#d4af37" stroke-width="0.75" opacity="0.28"/>
          <circle cx="10" cy="10" r="1.5" fill="#d4af37" opacity="0.35"/>
        </pattern>
      </defs>
    `;
    document.body.insertBefore(svgDefs, document.body.firstChild);
  }
}

/**
 * Generates an SVG card back referencing the shared defs.
 */
function getCardBackSVG() {
  return `
    <svg class="card-back-svg" viewBox="0 0 140 196" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <!-- Base rect referencing shared #cardBackGrad and #cardPattern -->
      <rect x="3" y="3" width="134" height="190" rx="8" fill="url(#cardBackGrad)" stroke="#d4af37" stroke-width="2"/>
      <rect x="8" y="8" width="124" height="180" rx="6" fill="url(#cardPattern)"/>
      <rect x="12" y="12" width="116" height="172" rx="4" fill="none" stroke="#d4af37" stroke-width="1.2" opacity="0.8"/>
      
      <!-- Center Medallion: White Rabbit Pocket Watch & Key Motif -->
      <g transform="translate(70, 98)">
        <!-- Outer ring -->
        <circle r="34" fill="#0b1726" stroke="#d4af37" stroke-width="2.2"/>
        <circle r="30" fill="none" stroke="#d4af37" stroke-width="0.8" stroke-dasharray="3,2" opacity="0.8"/>
        
        <!-- Pocket watch Roman ticks -->
        <circle r="26" fill="#14243b" stroke="#e6c66e" stroke-width="1"/>
        <g stroke="#d4af37" stroke-width="1.2" opacity="0.9">
          <line x1="0" y1="-24" x2="0" y2="-20" />
          <line x1="24" y1="0" x2="20" y2="0" />
          <line x1="0" y1="24" x2="0" y2="20" />
          <line x1="-24" y1="0" x2="-20" y2="0" />
        </g>
        <!-- Clock hands at 10 to 4 (Tea Time) -->
        <line x1="0" y1="0" x2="-10" y2="-15" stroke="#fdfbf7" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="0" x2="14" y2="8" stroke="#fdfbf7" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="0" cy="0" r="2.5" fill="#d4af37"/>
        
        <!-- White Rabbit silhouette ears above watch -->
        <path d="M-6 -34 C-9 -45 -11 -50 -7 -53 C-4 -55 -1 -48 -3 -35 Z" fill="#e2e8f0" opacity="0.95"/>
        <path d="M6 -34 C9 -45 11 -50 7 -53 C4 -55 1 -48 3 -35 Z" fill="#e2e8f0" opacity="0.95"/>
        <path d="M-5 -36 C-7 -44 -8 -48 -6 -50 C-4 -51 -2 -46 -3 -37 Z" fill="#f472b6" opacity="0.6"/>
        <path d="M5 -36 C7 -44 8 -48 6 -50 C4 -51 2 -46 3 -37 Z" fill="#f472b6" opacity="0.6"/>

        <!-- Top watch winder loop -->
        <rect x="-3" y="-37" width="6" height="4" fill="#d4af37" rx="1"/>
        <circle cx="0" cy="-39" r="4" fill="none" stroke="#d4af37" stroke-width="1.5"/>
      </g>
      
      <!-- Corner flourishes (Keys & Rosebuds) -->
      <g fill="#d4af37" opacity="0.8">
        <circle cx="18" cy="18" r="2.5" />
        <circle cx="122" cy="18" r="2.5" />
        <circle cx="18" cy="178" r="2.5" />
        <circle cx="122" cy="178" r="2.5" />
      </g>
    </svg>
  `;
}

/**
 * Authentic pip layout for number cards 2 through 10.
 */
function getPipLayout(value, sym, fillColor) {
  const p = `<span class="pip" style="color: ${fillColor}">${sym}</span>`;

  switch(value) {
    case 2:
      return `
        <div class="court-pip-grid pip-grid--2">
          ${p}
          ${p}
        </div>`;
    case 3:
      return `
        <div class="court-pip-grid pip-grid--3">
          ${p}
          ${p}
          ${p}
        </div>`;
    case 4:
      return `
        <div class="court-pip-grid pip-grid--4">
          <div class="pip-col">${p}${p}</div>
          <div class="pip-col">${p}${p}</div>
        </div>`;
    case 5:
      return `
        <div class="court-pip-grid pip-grid--5">
          <div class="pip-col">${p}${p}</div>
          <div class="pip-col pip-col--center">${p}</div>
          <div class="pip-col">${p}${p}</div>
        </div>`;
    case 6:
      return `
        <div class="court-pip-grid pip-grid--6">
          <div class="pip-col">${p}${p}${p}</div>
          <div class="pip-col">${p}${p}${p}</div>
        </div>`;
    case 7:
      return `
        <div class="court-pip-grid pip-grid--7">
          <div class="pip-col">${p}${p}${p}</div>
          <div class="pip-col pip-col--center" style="justify-content: flex-start; padding-top: 4px;">${p}</div>
          <div class="pip-col">${p}${p}${p}</div>
        </div>`;
    case 8:
      return `
        <div class="court-pip-grid pip-grid--8">
          <div class="pip-col">${p}${p}${p}</div>
          <div class="pip-col pip-col--center">${p}${p}</div>
          <div class="pip-col">${p}${p}${p}</div>
        </div>`;
    case 9:
      return `
        <div class="court-pip-grid pip-grid--9">
          <div class="pip-col">${p}${p}${p}${p}</div>
          <div class="pip-col pip-col--center">${p}</div>
          <div class="pip-col">${p}${p}${p}${p}</div>
        </div>`;
    case 10:
      return `
        <div class="court-pip-grid pip-grid--10">
          <div class="pip-col">${p}${p}${p}${p}</div>
          <div class="pip-col pip-col--center">${p}${p}</div>
          <div class="pip-col">${p}${p}${p}${p}</div>
        </div>`;
    default:
      return `<div class="center-pip-symbol" style="color: ${fillColor}">${sym}</div>`;
  }
}

/**
 * Returns custom center illustration / Court artwork for high cards (Ace, J, Q, K)
 * and structured pip layouts for 2-10.
 */
function getCourtSVG(value, suit, color) {
  const fillColor = color === 'red' ? '#b91c1c' : '#1e293b';
  const gold = '#d4af37';
  const sym = SUITS[suit.toUpperCase()].symbol;

  if (value === 1) { // Ace
    return `
      <div class="court-art court-ace">
        <div class="court-ace-flourish">❦</div>
        <div class="court-ace-symbol" style="color: ${fillColor}">${sym}</div>
        <div class="court-ace-title">WONDER</div>
      </div>
    `;
  }

  if (value === 11) { // Jack: Knave of Hearts / Herald Rabbit
    return `
      <div class="court-art court-jack">
        <svg viewBox="0 0 100 120" width="70" height="84">
          <circle cx="50" cy="42" r="26" fill="#fdfbf7" stroke="${gold}" stroke-width="2"/>
          <!-- Top Hat / Herald cap -->
          <path d="M32 30 L68 30 L65 14 L35 14 Z" fill="${fillColor}"/>
          <rect x="26" y="28" width="48" height="5" rx="2" fill="${gold}"/>
          <!-- Feather / Trumpet -->
          <line x1="68" y1="28" x2="82" y2="10" stroke="${gold}" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Collar / Ruffle -->
          <path d="M30 64 Q50 78 70 64 Q50 88 30 64 Z" fill="${gold}" opacity="0.8"/>
          <!-- Herald Badge -->
          <text x="50" y="55" font-family="'Inter', sans-serif" font-weight="bold" font-size="22" fill="${fillColor}" text-anchor="middle">${sym}</text>
          <text x="50" y="105" font-family="'Playfair Display', serif" font-weight="900" font-size="12" fill="${gold}" text-anchor="middle" letter-spacing="1">KNAVE</text>
        </svg>
      </div>
    `;
  }

  if (value === 12) { // Queen: Queen of the Garden / Looking Glass
    return `
      <div class="court-art court-queen">
        <svg viewBox="0 0 100 120" width="70" height="84">
          <circle cx="50" cy="42" r="26" fill="#fdfbf7" stroke="${gold}" stroke-width="2"/>
          <!-- Crown with roses -->
          <path d="M30 26 L35 12 L50 20 L65 12 L70 26 Z" fill="${gold}" stroke="${fillColor}" stroke-width="1"/>
          <circle cx="50" cy="19" r="2" fill="${fillColor}"/>
          <!-- Queen portrait silhouette / Rose scepter -->
          <text x="50" y="55" font-family="'Inter', sans-serif" font-weight="bold" font-size="22" fill="${fillColor}" text-anchor="middle">${sym}</text>
          <!-- Rose briar banner -->
          <path d="M25 66 Q50 80 75 66" fill="none" stroke="${gold}" stroke-width="2.5"/>
          <circle cx="50" cy="74" r="3.5" fill="${fillColor}"/>
          <text x="50" y="105" font-family="'Playfair Display', serif" font-weight="900" font-size="12" fill="${gold}" text-anchor="middle" letter-spacing="1">QUEEN</text>
        </svg>
      </div>
    `;
  }

  if (value === 13) { // King: Sovereign of Wonderland
    return `
      <div class="court-art court-king">
        <svg viewBox="0 0 100 120" width="70" height="84">
          <circle cx="50" cy="42" r="26" fill="#fdfbf7" stroke="${gold}" stroke-width="2"/>
          <!-- Royal arched Crown with cross/jewel -->
          <path d="M28 26 L32 10 L50 16 L68 10 L72 26 Z" fill="${gold}"/>
          <rect x="26" y="24" width="48" height="4" fill="${fillColor}"/>
          <circle cx="50" cy="9" r="2.5" fill="${gold}"/>
          <!-- Royal suit emblem -->
          <text x="50" y="55" font-family="'Inter', sans-serif" font-weight="bold" font-size="22" fill="${fillColor}" text-anchor="middle">${sym}</text>
          <!-- Ermine robe trim -->
          <path d="M24 66 C40 82 60 82 76 66 L72 74 C58 88 42 88 28 74 Z" fill="${gold}"/>
          <text x="50" y="105" font-family="'Playfair Display', serif" font-weight="900" font-size="12" fill="${gold}" text-anchor="middle" letter-spacing="1">KING</text>
        </svg>
      </div>
    `;
  }

  // Numbers 2-10: Multi-pip layout
  return `
    <div class="court-art court-pip-center">
      ${getPipLayout(value, sym, fillColor)}
    </div>
  `;
}

/**
 * Creates the DOM element for a card.
 */
function renderCardElement(card) {
  ensureSharedDefs();

  const el = document.createElement('div');
  el.className = `card card--${card.suit} card--${card.color} ${card.faceUp ? 'card--faceup' : 'card--facedown'}`;
  el.dataset.suit = card.suit;
  el.dataset.value = card.value;
  el.dataset.id = card.id;

  el.innerHTML = `
    <div class="card__front">
      <div class="card__corner card__corner--top">
        <span class="card__rank">${card.rankStr}</span>
        <span class="card__suit">${card.suitSymbol}</span>
      </div>
      <div class="card__center">
        ${getCourtSVG(card.value, card.suit, card.color)}
      </div>
      <div class="card__corner card__corner--bottom">
        <span class="card__rank">${card.rankStr}</span>
        <span class="card__suit">${card.suitSymbol}</span>
      </div>
    </div>
    <div class="card__back">${getCardBackSVG()}</div>
  `;

  return el;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUITS, SUIT_LIST, RANK_NAMES, Card, createStandardDeck, getCardBackSVG, getCourtSVG, getPipLayout, renderCardElement, ensureSharedDefs };
} else {
  window.SUITS = SUITS;
  window.SUIT_LIST = SUIT_LIST;
  window.RANK_NAMES = RANK_NAMES;
  window.Card = Card;
  window.createStandardDeck = createStandardDeck;
  window.getCardBackSVG = getCardBackSVG;
  window.getCourtSVG = getCourtSVG;
  window.getPipLayout = getPipLayout;
  window.renderCardElement = renderCardElement;
  window.ensureSharedDefs = ensureSharedDefs;
}
