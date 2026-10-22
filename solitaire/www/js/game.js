/**
 * game.js — Solitaire UI controller, drag & drop, tap-to-move, hints, power-ups, victory celebration.
 * Curious Solitaire (Wonderland Theme)
 */

(function() {
  'use strict';

  // Game State
  let engine = null;
  let timer = null;
  let sound = null;
  let dealNumber = 1;
  let drawMode = 1;
  let isContinuing = false;
  let isAutoCompleting = false;

  // Drag state
  let dragData = null;

  // DOM Elements
  let elStock = null;
  let elWaste = null;
  let elFoundations = null;
  let elTableau = null;
  let elTimer = null;
  let elMoves = null;
  let elScore = null;
  let elDealTitle = null;
  let elAutoCompleteBtn = null;
  let elHintBanner = null;
  let elHintText = null;
  let elVictoryOverlay = null;

  /* --------------------------------------------------------------------------
     Initialization
     -------------------------------------------------------------------------- */
  window.addEventListener('DOMContentLoaded', () => {
    initElements();
    sound = new SoundFX();
    timer = new GameTimer(onTick);

    const urlParams = new URLSearchParams(window.location.search);
    dealNumber = parseInt(urlParams.get('deal') || '1', 10);
    drawMode = parseInt(urlParams.get('mode') || '1', 10);
    isContinuing = urlParams.get('continue') === '1';

    const curated = window.CuratedDeals && window.CuratedDeals.contains(dealNumber);
    if (curated) {
      drawMode = 1;
      const allowed = window.ArcadeContent && window.ArcadeContent.allowsDeal(dealNumber);
      if (!allowed) {
        if (window.ArcadeContent) window.ArcadeContent.showLock('curated');
        else {
          const note = document.createElement('p');
          note.id = 'content-lock-fallback';
          note.textContent = 'This pack is part of Benchmark Arcade.';
          document.body.appendChild(note);
        }
        return;
      }
    }

    if (isContinuing) {
      resumeSavedGame();
    } else {
      startNewGame(dealNumber, drawMode);
    }

    setupEventListeners();
    updatePowerUpBadges();
  });

  function initElements() {
    elStock = document.getElementById('stock-slot');
    elWaste = document.getElementById('waste-slot');
    elFoundations = document.querySelectorAll('.foundation-slot');
    elTableau = document.getElementById('tableau-area');
    elTimer = document.getElementById('hud-timer');
    elMoves = document.getElementById('hud-moves');
    elScore = document.getElementById('hud-score');
    elDealTitle = document.getElementById('hud-deal-title');
    elAutoCompleteBtn = document.getElementById('btn-auto-complete');
    elHintBanner = document.getElementById('hint-banner');
    elHintText = document.getElementById('hint-text');
    elVictoryOverlay = document.getElementById('victory-overlay');
  }

  function startNewGame(dealNum, mode, isRestart = false) {
    dealNumber = dealNum;
    drawMode = mode;
    const dealData = generateKlondikeDeal(dealNumber);
    engine = new SolitaireEngine(dealData, { drawMode });
    if (!isRestart) {
      window.SolitaireProgress.recordGamePlayed();
    }

    timer.start(0);
    renderBoard();
    updateHUD();
    saveState();
  }

  function resumeSavedGame() {
    const saved = window.SolitaireProgress.getActiveGame();
    if (saved && saved.engine) {
      engine = SolitaireEngine.deserialize(saved.engine);
      dealNumber = engine.dealNumber;
      drawMode = engine.drawMode;
      timer.start(saved.elapsed || 0);
      renderBoard();
      updateHUD();
    } else {
      startNewGame(dealNumber, drawMode);
    }
  }

  function saveState() {
    if (!engine || engine.isWon()) return;
    window.SolitaireProgress.saveActiveGame({
      engine: engine.serialize(),
      elapsed: timer.getElapsed()
    });
  }

  function onTick(seconds) {
    if (elTimer) {
      elTimer.textContent = formatTime(seconds);
    }
    // Save elapsed time periodically
    if (seconds % 5 === 0) {
      saveState();
    }
  }

  function updateHUD() {
    if (elMoves) elMoves.textContent = engine.moves;
    if (elScore) elScore.textContent = engine.score;
    if (elDealTitle) {
      elDealTitle.textContent = `Deal #${dealNumber} (Turn ${drawMode})`;
    }

    if (elAutoCompleteBtn) {
      if (engine.isAutoCompleteReady()) {
        elAutoCompleteBtn.style.display = 'inline-flex';
      } else {
        elAutoCompleteBtn.style.display = 'none';
      }
    }
  }

  function updatePowerUpBadges() {
    const hintBadge = document.getElementById('badge-hints');
    const peekBadge = document.getElementById('badge-peeks');
    const shuffleBadge = document.getElementById('badge-shuffles');

    if (hintBadge) hintBadge.textContent = window.SolitaireProgress.getHints();
    if (peekBadge) peekBadge.textContent = window.SolitaireProgress.getPeeks();
    if (shuffleBadge) shuffleBadge.textContent = window.SolitaireProgress.getShuffles();
  }

  /* --------------------------------------------------------------------------
     Board Rendering
     -------------------------------------------------------------------------- */
  function renderBoard() {
    clearHighlights();
    renderStock();
    renderWaste();
    renderFoundations();
    renderTableau();
    updateHUD();
  }

  function renderStock() {
    elStock.innerHTML = '';
    if (engine.stock.length > 0) {
      elStock.classList.remove('pile-slot--empty-stock');
      const topCard = engine.stock[engine.stock.length - 1];
      const cardEl = renderCardElement(topCard);
      elStock.appendChild(cardEl);
    } else {
      elStock.classList.add('pile-slot--empty-stock');
    }
  }

  function renderWaste() {
    elWaste.innerHTML = '';
    const wasteLen = engine.waste.length;
    if (wasteLen === 0) return;

    // Display up to 3 cards staggered
    const showCount = Math.min(3, wasteLen);
    const startIdx = wasteLen - showCount;

    for (let i = startIdx; i < wasteLen; i++) {
      const card = engine.waste[i];
      const cardEl = renderCardElement(card);
      cardEl.dataset.location = 'waste';
      cardEl.dataset.index = i;

      const offsetIdx = i - startIdx;
      cardEl.style.left = `${offsetIdx * 14}px`;
      cardEl.style.zIndex = offsetIdx + 1;

      // Only top card is draggable/tappable
      if (i === wasteLen - 1) {
        attachCardPointerEvents(cardEl, { type: 'waste' });
      } else {
        cardEl.style.pointerEvents = 'none';
      }

      elWaste.appendChild(cardEl);
    }
  }

  function renderFoundations() {
    elFoundations.forEach(slot => {
      slot.innerHTML = '';
      const suit = slot.dataset.suit;
      const pile = engine.foundations[suit];
      if (pile.length > 0) {
        const topCard = pile[pile.length - 1];
        const cardEl = renderCardElement(topCard);
        cardEl.dataset.location = 'foundation';
        cardEl.dataset.suit = suit;
        attachCardPointerEvents(cardEl, { type: 'foundation', suit });
        slot.appendChild(cardEl);
      }
    });
  }

  function renderTableau() {
    for (let colIdx = 0; colIdx < 7; colIdx++) {
      const colEl = document.getElementById(`tableau-col-${colIdx}`);
      if (!colEl) continue;
      colEl.innerHTML = '';

      const cards = engine.tableau[colIdx];
      let yOffset = 0;

      cards.forEach((card, idx) => {
        const cardEl = renderCardElement(card);
        cardEl.dataset.location = 'tableau';
        cardEl.dataset.col = colIdx;
        cardEl.dataset.index = idx;

        cardEl.style.top = `${yOffset}px`;
        cardEl.style.zIndex = idx + 1;

        if (card.faceUp) {
          attachCardPointerEvents(cardEl, { type: 'tableau', col: colIdx, index: idx });
          yOffset += 26; // Spacing for face-up cards
        } else {
          yOffset += 15; // Spacing for face-down cards
        }

        colEl.appendChild(cardEl);
      });
    }
  }

  /* --------------------------------------------------------------------------
     Pointer Events: Drag-and-Drop & Tap-to-Move
     -------------------------------------------------------------------------- */
  function attachCardPointerEvents(cardEl, meta) {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let dragElements = [];
    let initialRect = null;
    let pointerId = null;

    cardEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (isAutoCompleting) return;
      e.preventDefault();

      try {
        cardEl.setPointerCapture(e.pointerId);
      } catch (err) {}

      startX = e.clientX;
      startY = e.clientY;
      pointerId = e.pointerId;
      initialRect = cardEl.getBoundingClientRect();
      isDragging = false;

      // Find all cards from this one down the stack
      dragElements = [cardEl];
      if (meta.type === 'tableau') {
        const colEl = cardEl.parentElement;
        const allInCol = Array.from(colEl.querySelectorAll('.card'));
        const myIndex = allInCol.indexOf(cardEl);
        if (myIndex >= 0) {
          dragElements = allInCol.slice(myIndex);
        }
      }

      const cleanupListeners = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
      };

      const onPointerCancel = () => {
        cleanupListeners();
        dragElements.forEach(el => el.classList.remove('card--dragging'));
        renderBoard();
      };

      const onPointerMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          isDragging = true;
          sound.playCardSlide();

          // Lift dragging cards
          dragElements.forEach((el, i) => {
            el.classList.add('card--dragging');
            el.style.width = `${initialRect.width}px`;
            el.style.height = `${initialRect.height}px`;
            el.style.zIndex = 9990 + i;
          });
        }

        if (isDragging) {
          const baseLeft = ev.clientX - (startX - initialRect.left);
          const baseTop = ev.clientY - (startY - initialRect.top);

          dragElements.forEach((el, i) => {
            el.style.left = `${baseLeft}px`;
            el.style.top = `${baseTop + i * 26}px`;
          });
        }
      };

      const onPointerUp = (ev) => {
        cleanupListeners();

        if (!isDragging) {
          // Tap / Click to move!
          handleCardTap(meta);
          return;
        }

        // Hit-test while card--dragging is still active (dragged cards have pointer-events: none)
        const dropTarget = document.elementFromPoint(ev.clientX, ev.clientY);
        dragElements.forEach(el => el.classList.remove('card--dragging'));
        handleCardDrop(meta, dropTarget);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
    });
  }

  /* --------------------------------------------------------------------------
     Tap-to-Move Handler
     -------------------------------------------------------------------------- */
  function handleCardTap(meta) {
    if (meta.type === 'stock') {
      executeStockDraw();
      return;
    }

    // Single click: find smartest move (Foundation first, then Tableau)
    let smartMove = null;
    if (meta.type === 'waste') {
      smartMove = engine.findSmartMove('waste', null);
    } else if (meta.type === 'tableau') {
      smartMove = engine.findSmartMove('tableau', meta.col, meta.index);
    } else if (meta.type === 'foundation') {
      smartMove = engine.findSmartMove('foundation', meta.suit);
    }

    if (smartMove) {
      executeSmartMove(meta, smartMove);
    }
  }

  function executeSmartMove(sourceMeta, smartMove) {
    let success = false;

    if (sourceMeta.type === 'waste') {
      if (smartMove.targetType === 'foundation') {
        success = engine.moveWasteToFoundation(smartMove.targetLoc);
        if (success) sound.playFoundation();
      } else if (smartMove.targetType === 'tableau') {
        success = engine.moveWasteToTableau(smartMove.targetLoc);
        if (success) sound.playCardSnap();
      }
    } else if (sourceMeta.type === 'tableau') {
      if (smartMove.targetType === 'foundation') {
        success = engine.moveTableauToFoundation(sourceMeta.col, smartMove.targetLoc);
        if (success) sound.playFoundation();
      } else if (smartMove.targetType === 'tableau') {
        success = engine.moveTableauToTableau(sourceMeta.col, sourceMeta.index, smartMove.targetLoc);
        if (success) sound.playCardSnap();
      }
    } else if (sourceMeta.type === 'foundation') {
      if (smartMove.targetType === 'tableau') {
        success = engine.moveFoundationToTableau(sourceMeta.suit, smartMove.targetLoc);
        if (success) sound.playCardSnap();
      }
    }

    if (success) {
      renderBoard();
      saveState();
      checkWinCondition();
    }
  }

  /* --------------------------------------------------------------------------
     Drop Handler
     -------------------------------------------------------------------------- */
  function handleCardDrop(sourceMeta, dropTarget) {
    if (!dropTarget) {
      renderBoard();
      return;
    }

    const targetFoundation = dropTarget.closest('.foundation-slot');
    const targetTableauCol = dropTarget.closest('.tableau-col');

    let success = false;

    // Dropped on a Foundation
    if (targetFoundation) {
      const targetSuit = targetFoundation.dataset.suit;
      if (sourceMeta.type === 'waste') {
        success = engine.moveWasteToFoundation(targetSuit);
      } else if (sourceMeta.type === 'tableau') {
        success = engine.moveTableauToFoundation(sourceMeta.col, targetSuit);
      }
      if (success) sound.playFoundation();
    }
    // Dropped on a Tableau Column
    else if (targetTableauCol) {
      const toCol = parseInt(targetTableauCol.dataset.col, 10);
      if (sourceMeta.type === 'waste') {
        success = engine.moveWasteToTableau(toCol);
      } else if (sourceMeta.type === 'tableau') {
        success = engine.moveTableauToTableau(sourceMeta.col, sourceMeta.index, toCol);
      } else if (sourceMeta.type === 'foundation') {
        success = engine.moveFoundationToTableau(sourceMeta.suit, toCol);
      }
      if (success) sound.playCardSnap();
    }

    renderBoard();
    if (success) {
      saveState();
      checkWinCondition();
    }
  }

  /* --------------------------------------------------------------------------
     Stock Draw
     -------------------------------------------------------------------------- */
  function executeStockDraw() {
    if (isAutoCompleting) return;
    const ok = engine.drawStock();
    if (ok) {
      sound.playCardFlip();
      renderBoard();
      saveState();
    }
  }

  /* --------------------------------------------------------------------------
     Undo System
     -------------------------------------------------------------------------- */
  function executeUndo() {
    if (isAutoCompleting) return;
    const ok = engine.undo();
    if (ok) {
      sound.playCardSlide();
      renderBoard();
      saveState();
    }
  }

  /* --------------------------------------------------------------------------
     Power-Ups: Looking Glass Hint, Cheshire Peek, Wonderland Reshuffle
     -------------------------------------------------------------------------- */
  function executeHint() {
    if (isAutoCompleting) return;

    const hint = HintEngine.findBestHint(engine);
    if (!hint.found) {
      showHintMessage(hint.reason);
      return;
    }

    // Guidance to draw/recycle deck is FREE and does not consume a power-up token!
    const isFreeHint = (hint.sourceType === 'stock' || hint.type === 'draw_stock');

    if (!isFreeHint) {
      if (window.SolitaireProgress.getHints() <= 0) {
        window.SolitaireStore.showStoreToast("No Looking Glass Hints remaining! The morning refill restores these.");
        return;
      }
      if (!window.SolitaireProgress.useHint()) return;
      updatePowerUpBadges();
    }

    sound.playHintChime();
    showHintMessage(isFreeHint ? `💡 Free Guidance: ${hint.reason}` : hint.reason);

    // Highlight source and target
    clearHighlights();
    if (hint.sourceType === 'tableau') {
      const colEl = document.getElementById(`tableau-col-${hint.fromCol}`);
      if (colEl) {
        const cardEls = colEl.querySelectorAll('.card');
        const cIdx = hint.cardIndex !== undefined ? hint.cardIndex : cardEls.length - 1;
        if (cardEls[cIdx]) cardEls[cIdx].classList.add('card--hint');
      }
    } else if (hint.sourceType === 'waste') {
      const topWaste = elWaste.querySelector('.card:last-child');
      if (topWaste) topWaste.classList.add('card--hint');
    } else if (hint.sourceType === 'stock') {
      elStock.classList.add('slot--hint');
    }

    // Highlight destination
    if (hint.type === 'tableau_to_foundation' || hint.type === 'waste_to_foundation') {
      const fSlot = document.querySelector(`.foundation-slot[data-suit="${hint.suit}"]`);
      if (fSlot) fSlot.classList.add('slot--hint');
    } else if (hint.toCol !== undefined) {
      const tCol = document.getElementById(`tableau-col-${hint.toCol}`);
      if (tCol) {
        const top = tCol.querySelector('.card:last-child');
        if (top) top.classList.add('card--hint');
        else tCol.classList.add('slot--hint');
      }
    }
  }

  function executePeek() {
    if (isAutoCompleting) return;
    if (window.SolitaireProgress.getPeeks() <= 0) {
      window.SolitaireStore.showStoreToast("No Cheshire Peeks remaining! The morning refill restores these.");
      return;
    }

    // Find the deepest hidden card in any tableau column
    let targetCard = null;
    let targetEl = null;

    for (let c = 6; c >= 0; c--) {
      const col = engine.tableau[c];
      const hiddenIdx = col.findIndex(card => !card.faceUp);
      if (hiddenIdx >= 0) {
        targetCard = col[hiddenIdx];
        const colEl = document.getElementById(`tableau-col-${c}`);
        if (colEl) {
          const cardsInCol = colEl.querySelectorAll('.card');
          targetEl = cardsInCol[hiddenIdx];
        }
        break;
      }
    }

    if (!targetCard || !targetEl) {
      showHintMessage("The Cheshire Cat smiles: All cards in the garden are already revealed!");
      return;
    }

    if (!window.SolitaireProgress.usePeek()) return;
    updatePowerUpBadges();
    sound.playCardFlip();

    // Render a temporary preview element WITHOUT mutating targetCard.faceUp in the engine!
    const previewCard = targetCard.clone();
    previewCard.flip(true);
    const previewEl = renderCardElement(previewCard);
    previewEl.style.top = targetEl.style.top;
    previewEl.style.zIndex = targetEl.style.zIndex;
    previewEl.classList.add('card--peek');
    targetEl.replaceWith(previewEl);

    showHintMessage(`Cheshire Peek: Revealed the ${targetCard.rankStr}${targetCard.suitSymbol}!`);

    setTimeout(() => {
      renderBoard();
    }, 2500);
  }

  function executeReshuffle() {
    if (isAutoCompleting) return;
    if (window.SolitaireProgress.getShuffles() <= 0) {
      window.SolitaireStore.showStoreToast("No Wonderland Reshuffles remaining! The morning refill restores these.");
      return;
    }

    const pool = [...engine.stock, ...engine.waste];
    if (pool.length < 2) {
      showHintMessage("White Rabbit: Not enough cards in the pocket deck to reshuffle!");
      return;
    }

    if (!window.SolitaireProgress.useShuffle()) return;
    updatePowerUpBadges();
    sound.playWinFanfare();

    // Save previous stock & waste snapshot on undo stack
    engine.undoStack.push({
      type: 'reshuffle',
      prevStock: engine.stock.map(c => c.toJSON()),
      prevWaste: engine.waste.map(c => c.toJSON())
    });

    // Shuffle pool
    const prng = createPRNG(Date.now());
    const shuffled = shuffleDeck(pool, prng);
    shuffled.forEach(c => c.flip(false));

    engine.stock = shuffled;
    engine.waste = [];
    renderBoard();
    saveState();
    showHintMessage("Wonderland magic: Pocket deck reshuffled with fresh curiosity!");
  }

  function showHintMessage(text) {
    if (!elHintBanner || !elHintText) return;
    elHintText.textContent = text;
    elHintBanner.classList.add('hint-banner--show');
  }

  function clearHighlights() {
    document.querySelectorAll('.card--hint').forEach(el => el.classList.remove('card--hint'));
    document.querySelectorAll('.slot--hint').forEach(el => el.classList.remove('slot--hint'));
    if (elHintBanner) elHintBanner.classList.remove('hint-banner--show');
  }

  /* --------------------------------------------------------------------------
     Auto-Complete Engine
     -------------------------------------------------------------------------- */
  function executeAutoComplete() {
    if (isAutoCompleting) return;
    isAutoCompleting = true;
    if (elAutoCompleteBtn) elAutoCompleteBtn.style.display = 'none';

    function step() {
      const nextMove = engine.getNextAutoCompleteMove();
      if (!nextMove) {
        isAutoCompleting = false;
        renderBoard();
        checkWinCondition();
        return;
      }

      if (nextMove.sourceType === 'waste') {
        engine.moveWasteToFoundation(nextMove.suit);
      } else if (nextMove.sourceType === 'tableau') {
        engine.moveTableauToFoundation(nextMove.fromCol, nextMove.suit);
      }

      sound.playFoundation();
      renderBoard();

      if (engine.isWon()) {
        isAutoCompleting = false;
        triggerVictory();
      } else {
        setTimeout(step, 80);
      }
    }

    step();
  }

  /* --------------------------------------------------------------------------
     Win Condition & Bouncing Cards Canvas
     -------------------------------------------------------------------------- */
  let victoryAnimId = null;

  function checkWinCondition() {
    if (engine.isWon()) {
      triggerVictory();
    }
  }

  function triggerVictory() {
    timer.stop();
    window.SolitaireProgress.clearActiveGame();
    window.SolitaireProgress.recordGameWon(drawMode, dealNumber, timer.getElapsed(), engine.moves);
    sound.playWinFanfare();

    // Fill victory modal stats
    const vTime = document.getElementById('victory-time');
    const vMoves = document.getElementById('victory-moves');
    const vScore = document.getElementById('victory-score');
    if (vTime) vTime.textContent = formatTime(timer.getElapsed());
    if (vMoves) vMoves.textContent = engine.moves;
    if (vScore) vScore.textContent = engine.score;

    if (elVictoryOverlay) {
      elVictoryOverlay.classList.add('victory-overlay--show');
    }

    startVictoryAnimation();
  }

  function startVictoryAnimation() {
    const canvas = document.getElementById('victory-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cards = [];
    const suits = ['♠', '♥', '♦', '♣'];
    const colors = ['#0f172a', '#b91c1c', '#b91c1c', '#0f172a'];

    // Spawn 52 bouncing cards across the canvas
    for (let i = 0; i < 52; i++) {
      const sIdx = i % 4;
      cards.push({
        x: (canvas.width / 4) * sIdx + Math.random() * 80,
        y: 100,
        vx: (Math.random() - 0.5) * 8 + (sIdx - 1.5) * 2,
        vy: Math.random() * -6 - 2,
        w: 60,
        h: 84,
        suit: suits[sIdx],
        color: colors[sIdx],
        val: ((i % 13) + 1).toString()
      });
    }

    const animStart = Date.now();
    function animate() {
      // Stop animation after 10 seconds to avoid infinite RAF loop
      if (Date.now() - animStart > 10000) {
        cancelAnimationFrame(victoryAnimId);
        victoryAnimId = null;
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      cards.forEach(c => {
        // Draw card
        ctx.fillStyle = '#fdfbf7';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(c.x, c.y, c.w, c.h, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = c.color;
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText(c.val, c.x + 8, c.y + 20);
        ctx.font = '22px Inter, sans-serif';
        ctx.fillText(c.suit, c.x + 18, c.y + 52);

        // Physics
        c.vy += 0.35; // gravity
        c.x += c.vx;
        c.y += c.vy;

        // Bounce floor
        if (c.y + c.h > canvas.height) {
          c.y = canvas.height - c.h;
          c.vy = -c.vy * 0.82;
        }
      });

      victoryAnimId = requestAnimationFrame(animate);
    }

    victoryAnimId = requestAnimationFrame(animate);

    // Stop animation if leaving
    window.addEventListener('beforeunload', () => {
      if (victoryAnimId) cancelAnimationFrame(victoryAnimId);
    }, { once: true });
  }

  /* --------------------------------------------------------------------------
     Event Listeners Setup
     -------------------------------------------------------------------------- */
  function setupEventListeners() {
    // Stock pile click
    if (elStock) {
      elStock.addEventListener('click', executeStockDraw);
    }

    // Bottom Controls
    const btnUndo = document.getElementById('btn-undo');
    const btnHint = document.getElementById('btn-hint');
    const btnPeek = document.getElementById('btn-peek');
    const btnShuffle = document.getElementById('btn-shuffle');
    const btnSound = document.getElementById('btn-sound');
    const btnRestart = document.getElementById('btn-restart');
    const btnHintClose = document.getElementById('hint-close');

    if (btnUndo) btnUndo.addEventListener('click', executeUndo);
    if (btnHint) btnHint.addEventListener('click', executeHint);
    if (btnPeek) btnPeek.addEventListener('click', executePeek);
    if (btnShuffle) btnShuffle.addEventListener('click', executeReshuffle);
    if (btnHintClose) btnHintClose.addEventListener('click', clearHighlights);

    if (elAutoCompleteBtn) {
      elAutoCompleteBtn.addEventListener('click', executeAutoComplete);
    }

    if (btnSound) {
      btnSound.addEventListener('click', () => {
        const isMuted = sound.toggleMute();
        btnSound.querySelector('.hud-item__icon').textContent = isMuted ? '🔇' : '🔊';
      });
    }

    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        if (confirm("Restart this curious deal from the beginning?")) {
          startNewGame(dealNumber, drawMode, true);
        }
      });
    }

    // Victory modal buttons
    const btnNextDeal = document.getElementById('btn-victory-next');
    if (btnNextDeal) {
      btnNextDeal.addEventListener('click', () => {
        if (victoryAnimId) cancelAnimationFrame(victoryAnimId);
        if (window.CuratedDeals && window.CuratedDeals.contains(dealNumber)) {
          const nextDeal = window.CuratedDeals.next(dealNumber);
          const nextAllowed = nextDeal && window.ArcadeContent && window.ArcadeContent.allowsDeal(nextDeal);
          window.location.href = nextAllowed
            ? `game.html?deal=${nextDeal}&mode=1`
            : 'index.html';
          return;
        }
        window.location.href = `game.html?deal=${dealNumber + 1}&mode=${drawMode}`;
      });
    }

    // Save state on navigating back to menu
    document.querySelectorAll('a[href="index.html"]').forEach(link => {
      link.addEventListener('click', () => {
        saveState();
      });
    });

    window.addEventListener('beforeunload', () => {
      saveState();
    });
  }

})();
