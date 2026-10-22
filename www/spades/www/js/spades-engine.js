/* ==========================================================================
   spades-engine.js — Official Rules & Game Engine
   Royal Spades (Standard & 2's Wild)
   ========================================================================== */

(function(window) {
  'use strict';

  class SpadesEngine {
    constructor(options = {}) {
      this.isTwosWild = !!options.isTwosWild;
      this.targetScore = options.targetScore || 500;

      this.players = ['south', 'west', 'north', 'east'];
      this.teams = {
        us: ['south', 'north'],
        them: ['west', 'east']
      };

      this.scores = { us: 0, them: 0 };
      this.bags = { us: 0, them: 0 };
      this.handNumber = 0;

      // Current dealer (advances clockwise each hand)
      this.dealerIndex = 3; // 'east' deals first, so 'south' bids first

      this.resetRoundState();
    }

    resetRoundState() {
      this.hands = { south: [], west: [], north: [], east: [] };
      this.bids = { south: null, west: null, north: null, east: null };
      this.tricksTaken = { south: 0, west: 0, north: 0, east: 0 };
      this.currentTrick = [];
      this.lastTrick = null;
      this.spadesBroken = false;
      this.phase = 'idle'; // 'bidding', 'playing', 'round_over', 'game_over'
      this.turnPlayer = null;
      this.leadPlayer = null;
      this.roundSummary = null;
    }

    // Start a fresh hand deal
    startNewHand() {
      this.handNumber++;
      this.resetRoundState();

      // Advance dealer clockwise
      this.dealerIndex = (this.dealerIndex + 1) % 4;
      const dealer = this.players[this.dealerIndex];

      // Deal 52 cards: 13 to each player
      const deck = window.shuffleDeck(window.createDeck());
      for (let i = 0; i < 52; i++) {
        const player = this.players[i % 4];
        this.hands[player].push(deck[i]);
      }

      // Sort all hands
      for (const p of this.players) {
        this.hands[p] = window.sortHand(this.hands[p], this.isTwosWild);
      }

      // Bidding starts with player clockwise from dealer
      const firstBidderIndex = (this.dealerIndex + 1) % 4;
      this.turnPlayer = this.players[firstBidderIndex];
      this.phase = 'bidding';

      return {
        dealer,
        firstBidder: this.turnPlayer,
        hands: this.hands
      };
    }

    // Record player's bid
    setBid(player, bidAmount) {
      if (this.phase !== 'bidding' || this.turnPlayer !== player) {
        return { success: false, reason: 'not_turn_or_wrong_phase' };
      }

      const bid = parseInt(bidAmount, 10);
      if (isNaN(bid) || bid < 0 || bid > 13) {
        return { success: false, reason: 'invalid_bid_amount' };
      }

      this.bids[player] = bid;

      // Check if all players have bid
      const allBid = this.players.every(p => this.bids[p] !== null);
      if (allBid) {
        // Transition to trick play
        this.phase = 'playing';
        // First trick lead is player to left of dealer
        const firstLeadIndex = (this.dealerIndex + 1) % 4;
        this.leadPlayer = this.players[firstLeadIndex];
        this.turnPlayer = this.leadPlayer;
        return { success: true, biddingComplete: true, leadPlayer: this.leadPlayer };
      }

      // Next player bids
      const currIdx = this.players.indexOf(player);
      this.turnPlayer = this.players[(currIdx + 1) % 4];
      return { success: true, biddingComplete: false, nextBidder: this.turnPlayer };
    }

    // Calculate which cards in player hand are legal to play
    getLegalCards(player) {
      const hand = this.hands[player] || [];
      if (hand.length === 0) return [];

      // Leading the trick
      if (this.currentTrick.length === 0) {
        // If Spades are already broken, any card can be led
        if (this.spadesBroken) {
          return [...hand];
        }

        // Spades NOT broken: cannot lead trump unless player holds ONLY trumps
        const nonTrumps = hand.filter(c => !c.isTrump(this.isTwosWild));
        if (nonTrumps.length > 0) {
          return nonTrumps;
        }
        // Player only has trumps: allowed to break Spades by force
        return [...hand];
      }

      // Following to an existing lead
      const leadCard = this.currentTrick[0].card;
      const leadEffectiveSuit = leadCard.getEffectiveSuit(this.isTwosWild);

      // Must follow effective lead suit if holding any
      const matchingSuitCards = hand.filter(c => c.getEffectiveSuit(this.isTwosWild) === leadEffectiveSuit);
      if (matchingSuitCards.length > 0) {
        return matchingSuitCards;
      }

      // Player is VOID in lead suit: can play ANY card (trumps, off-suit sloughs)
      return [...hand];
    }

    // Play card to current trick
    playCard(player, cardId) {
      if (this.phase !== 'playing' || this.turnPlayer !== player) {
        return { success: false, reason: 'not_player_turn' };
      }

      const hand = this.hands[player];
      const cardIdx = hand.findIndex(c => c.id === cardId);
      if (cardIdx === -1) {
        return { success: false, reason: 'card_not_in_hand' };
      }

      const card = hand[cardIdx];
      const legalCards = this.getLegalCards(player);
      if (!legalCards.some(c => c.id === card.id)) {
        return { success: false, reason: 'illegal_card_play' };
      }

      // Remove card from hand
      hand.splice(cardIdx, 1);

      // If card is a trump (Spade or Wild 2) and lead was not a trump, break spades!
      if (card.isTrump(this.isTwosWild)) {
        if (!this.spadesBroken) {
          this.spadesBroken = true;
        }
      }

      this.currentTrick.push({ player, card });

      // If trick is not yet complete (less than 4 cards)
      if (this.currentTrick.length < 4) {
        const currIdx = this.players.indexOf(player);
        this.turnPlayer = this.players[(currIdx + 1) % 4];
        return {
          success: true,
          trickComplete: false,
          player,
          card,
          nextTurn: this.turnPlayer,
          spadesBroken: this.spadesBroken
        };
      }

      // Trick complete: evaluate winner!
      const winnerInfo = this.evaluateTrickWinner(this.currentTrick);
      const winner = winnerInfo.player;
      this.tricksTaken[winner]++;

      this.lastTrick = [...this.currentTrick];
      this.currentTrick = [];
      this.leadPlayer = winner;
      this.turnPlayer = winner;

      // Check if hand is complete (all 13 tricks played)
      const handComplete = this.players.every(p => this.hands[p].length === 0);
      let roundSummary = null;
      let isGameOver = false;

      if (handComplete) {
        roundSummary = this.calculateRoundScore();
        this.roundSummary = roundSummary;

        // Check victory / defeat condition (500 pts or -200 pts)
        if (this.scores.us >= this.targetScore || this.scores.them >= this.targetScore ||
            this.scores.us <= -200 || this.scores.them <= -200) {
          this.phase = 'game_over';
          isGameOver = true;
        } else {
          this.phase = 'round_over';
        }
      }

      return {
        success: true,
        trickComplete: true,
        player,
        card,
        winner,
        winningCard: winnerInfo.card,
        completedTrick: [...this.lastTrick],
        handComplete,
        roundSummary,
        isGameOver,
        scores: this.scores,
        bags: this.bags,
        spadesBroken: this.spadesBroken
      };
    }

    // Evaluate which card wins the 4-card trick
    evaluateTrickWinner(trick) {
      const leadCard = trick[0].card;
      const leadSuit = leadCard.getEffectiveSuit(this.isTwosWild);

      let bestPlayer = trick[0].player;
      let bestCard = leadCard;

      for (let i = 1; i < trick.length; i++) {
        const entry = trick[i];
        if (window.doesCardBeat(entry.card, bestCard, leadSuit, this.isTwosWild)) {
          bestCard = entry.card;
          bestPlayer = entry.player;
        }
      }

      return { player: bestPlayer, card: bestCard };
    }

    // Official Spades Scoring Calculation
    calculateRoundScore() {
      const roundDetails = {
        us: { bid: 0, won: 0, base: 0, bags: 0, bagPenalty: 0, nilScore: 0, total: 0 },
        them: { bid: 0, won: 0, base: 0, bags: 0, bagPenalty: 0, nilScore: 0, total: 0 }
      };

      for (const team of ['us', 'them']) {
        const members = this.teams[team];
        let regularBid = 0;
        let totalWon = 0;
        let nilBonus = 0;

        for (const p of members) {
          const bid = this.bids[p];
          const won = this.tricksTaken[p];
          totalWon += won;

          if (bid === 0) {
            // Nil Bid
            if (won === 0) {
              nilBonus += 100; // Successful Nil
            } else {
              nilBonus -= 100; // Failed Nil
            }
          } else {
            regularBid += bid;
          }
        }

        let basePoints = 0;
        let overtricks = 0;
        let bagPenalty = 0;

        // If both players bid Nil, regularBid is 0
        if (regularBid > 0) {
          if (totalWon >= regularBid) {
            // Made bid
            basePoints = regularBid * 10;
            overtricks = totalWon - regularBid;
            this.bags[team] += overtricks;

            // Check 10-bag penalty (-100 pts)
            if (this.bags[team] >= 10) {
              bagPenalty = -100;
              this.bags[team] %= 10;
            }
          } else {
            // Failed bid (Set)
            basePoints = -regularBid * 10;
            overtricks = 0;
          }
        } else {
          // If both bid nil, any tricks taken are treated as bags
          overtricks = totalWon;
          this.bags[team] += overtricks;
          if (this.bags[team] >= 10) {
            bagPenalty = -100;
            this.bags[team] %= 10;
          }
        }

        const teamTotal = basePoints + overtricks + bagPenalty + nilBonus;
        this.scores[team] += teamTotal;

        roundDetails[team] = {
          bid: regularBid,
          won: totalWon,
          base: basePoints,
          bags: overtricks,
          bagPenalty,
          nilScore: nilBonus,
          total: teamTotal,
          cumulativeScore: this.scores[team],
          cumulativeBags: this.bags[team]
        };
      }

      return roundDetails;
    }

    toJSON() {
      return {
        isTwosWild: this.isTwosWild,
        targetScore: this.targetScore,
        scores: this.scores,
        bags: this.bags,
        handNumber: this.handNumber,
        dealerIndex: this.dealerIndex,
        hands: {
          south: this.hands.south.map(c => c.toJSON()),
          west: this.hands.west.map(c => c.toJSON()),
          north: this.hands.north.map(c => c.toJSON()),
          east: this.hands.east.map(c => c.toJSON())
        },
        bids: this.bids,
        tricksTaken: this.tricksTaken,
        currentTrick: this.currentTrick.map(t => ({ player: t.player, card: t.card.toJSON() })),
        lastTrick: this.lastTrick ? this.lastTrick.map(t => ({ player: t.player, card: t.card.toJSON() })) : null,
        spadesBroken: this.spadesBroken,
        phase: this.phase,
        turnPlayer: this.turnPlayer,
        leadPlayer: this.leadPlayer,
        roundSummary: this.roundSummary
      };
    }

    static fromJSON(data) {
      const engine = new SpadesEngine({
        isTwosWild: data.isTwosWild,
        targetScore: data.targetScore
      });

      engine.scores = { ...data.scores };
      engine.bags = { ...data.bags };
      engine.handNumber = data.handNumber;
      engine.dealerIndex = data.dealerIndex;
      engine.bids = { ...data.bids };
      engine.tricksTaken = { ...data.tricksTaken };
      engine.spadesBroken = data.spadesBroken;
      engine.phase = data.phase;
      engine.turnPlayer = data.turnPlayer;
      engine.leadPlayer = data.leadPlayer;
      engine.roundSummary = data.roundSummary;

      // Rehydrate cards with Card.fromJSON!
      for (const p of engine.players) {
        if (Array.isArray(data.hands[p])) {
          engine.hands[p] = data.hands[p].map(c => window.Card.fromJSON(c));
        }
      }

      if (Array.isArray(data.currentTrick)) {
        engine.currentTrick = data.currentTrick.map(t => ({
          player: t.player,
          card: window.Card.fromJSON(t.card)
        }));
      }

      if (Array.isArray(data.lastTrick)) {
        engine.lastTrick = data.lastTrick.map(t => ({
          player: t.player,
          card: window.Card.fromJSON(t.card)
        }));
      }

      return engine;
    }
  }

  window.SpadesEngine = SpadesEngine;
})(window);
