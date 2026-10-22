/**
 * Draw-1 Klondike search used to prove Curated Deals are winnable.
 * Incomplete on purpose: a win is proof, a miss just skips that seed.
 */
'use strict';

const cards = require('../solitaire/js/cards');
global.SUIT_LIST = cards.SUIT_LIST;
const { generateKlondikeDeal } = require('../solitaire/js/klondike-gen');
const { SolitaireEngine } = require('../solitaire/js/solitaire-engine');

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];

function safeFoundation(engine, card) {
  const opposite = card.color === 'red' ? ['spades', 'clubs'] : ['hearts', 'diamonds'];
  return opposite.every(suit => engine.foundations[suit].length >= card.value - 1);
}

function autoSafe(engine) {
  let applied = 0;
  let moved = true;
  let guard = 0;
  while (moved && guard++ < 80) {
    moved = false;
    if (engine.waste.length) {
      const card = engine.waste[engine.waste.length - 1];
      if (safeFoundation(engine, card) && engine.moveWasteToFoundation(card.suit)) {
        applied++;
        moved = true;
        continue;
      }
    }
    for (let col = 0; col < 7; col++) {
      const pile = engine.tableau[col];
      if (!pile.length) continue;
      const card = pile[pile.length - 1];
      if (!card.faceUp) continue;
      if (safeFoundation(engine, card) && engine.moveTableauToFoundation(col, card.suit)) {
        applied++;
        moved = true;
        break;
      }
    }
  }
  return applied;
}

function undoN(engine, count) {
  for (let i = 0; i < count; i++) engine.undo();
}

function stateKey(engine) {
  let key = '';
  for (let s = 0; s < SUITS.length; s++) key += engine.foundations[SUITS[s]].length.toString(16);
  key += '|';
  for (let col = 0; col < 7; col++) {
    const pile = engine.tableau[col];
    for (let i = 0; i < pile.length; i++) {
      const card = pile[i];
      key += (card.faceUp ? 'U' : 'D') + card.suit[0] + card.value.toString(16);
    }
    key += ';';
  }
  key += 'W';
  for (let i = 0; i < engine.waste.length; i++) {
    key += engine.waste[i].suit[0] + engine.waste[i].value.toString(16);
  }
  key += 'S';
  for (let i = engine.stock.length - 1; i >= 0; i--) {
    key += engine.stock[i].suit[0] + engine.stock[i].value.toString(16);
  }
  return key;
}

function won(engine) {
  if (engine.isWon()) return true;
  if (engine.stock.length > 0) return false;
  for (let col = 0; col < 7; col++) {
    const pile = engine.tableau[col];
    for (let i = 0; i < pile.length; i++) {
      if (!pile[i].faceUp) return false;
    }
  }
  return engine.isAutoCompleteReady();
}

function collectMoves(engine) {
  const moves = [];
  for (let from = 0; from < 7; from++) {
    const pile = engine.tableau[from];
    for (let idx = 0; idx < pile.length; idx++) {
      const card = pile[idx];
      if (!card.faceUp) continue;
      const reveals = idx > 0 && !pile[idx - 1].faceUp;
      for (let to = 0; to < 7; to++) {
        if (to === from) continue;
        if (!engine.canPlaceOnTableau(card, to)) continue;
        if (engine.tableau[to].length === 0 && idx === 0) continue;
        moves.push({ type: 'tt', from, idx, to, pri: reveals ? 0 : 3 });
      }
    }
    if (pile.length && pile[pile.length - 1].faceUp && engine.canPlaceOnFoundation(pile[pile.length - 1], pile[pile.length - 1].suit)) {
      moves.push({ type: 'tf', from, suit: pile[pile.length - 1].suit, pri: 2 });
    }
  }
  if (engine.waste.length) {
    const card = engine.waste[engine.waste.length - 1];
    for (let to = 0; to < 7; to++) {
      if (engine.canPlaceOnTableau(card, to)) moves.push({ type: 'wt', to, pri: 1 });
    }
    if (engine.canPlaceOnFoundation(card, card.suit)) moves.push({ type: 'wf', suit: card.suit, pri: 2 });
  }
  if (engine.stock.length || engine.waste.length) moves.push({ type: 'draw', pri: 4 });
  moves.sort((a, b) => a.pri - b.pri);
  return moves;
}

function applyMove(engine, move) {
  if (move.type === 'tt') return engine.moveTableauToTableau(move.from, move.idx, move.to);
  if (move.type === 'wt') return engine.moveWasteToTableau(move.to);
  if (move.type === 'tf') return engine.moveTableauToFoundation(move.from, move.suit);
  if (move.type === 'wf') return engine.moveWasteToFoundation(move.suit);
  return engine.drawStock();
}

function solveDeal(dealNumber, limit = 5000) {
  const engine = new SolitaireEngine(generateKlondikeDeal(dealNumber), { drawMode: 1 });
  const seen = new Set();
  let nodes = 0;

  function dfs() {
    const applied = autoSafe(engine);
    if (won(engine)) return true;
    if (nodes++ >= limit) {
      undoN(engine, applied);
      return false;
    }
    const key = stateKey(engine);
    if (seen.has(key)) {
      undoN(engine, applied);
      return false;
    }
    seen.add(key);
    const moves = collectMoves(engine);
    for (let i = 0; i < moves.length; i++) {
      if (!applyMove(engine, moves[i])) continue;
      if (dfs()) return true;
      engine.undo();
      if (nodes >= limit) break;
    }
    undoN(engine, applied);
    return false;
  }

  return dfs();
}

module.exports = { solveDeal, won, autoSafe };

if (require.main === module) {
  const seeds = process.argv.slice(2).map(n => parseInt(n, 10)).filter(Boolean);
  const list = seeds.length ? seeds : [10001, 10002, 10003, 10004, 10005];
  list.forEach(seed => {
    const start = Date.now();
    const ok = solveDeal(seed, 2500);
    console.log(seed, ok ? 'WIN' : 'miss', Date.now() - start + 'ms');
  });
}
