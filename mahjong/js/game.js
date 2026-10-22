/**
 * CELESTIAL JADE: MAHJONG SOLITAIRE — game.js
 * Main game controller: board layout rendering, 3D tile interaction,
 * pair matching, tactical power-ups, audio, timer, and state persistence.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ---------------------------------------------------------------------------
  // Game State
  // ---------------------------------------------------------------------------
  const State = {
    layoutId: 'turtle',
    layoutDef: null,
    activeTiles: [],         // Array of { id, x, y, z, tileData }
    selectedTile: null,      // Currently selected tile object
    matchedHistory: [],      // Array of { tileA, tileB } for Undo
    hintPair: null,          // Array of 2 tiles currently pulsed by Hint
    isGameOver: false,
    timer: null,
    elapsed: 0,
    tileWidth: 48,
    tileHeight: 64
  };

  // ---------------------------------------------------------------------------
  // UI Element References
  // ---------------------------------------------------------------------------
  const UI = {
    boardViewport: document.getElementById('board-viewport'),
    boardStage: document.getElementById('board-stage'),
    timerDisplay: document.getElementById('timer-display'),
    layoutLabel: document.getElementById('layout-label'),
    tileCountDisplay: document.getElementById('tile-count-display'),
    pairsLeftDisplay: document.getElementById('pairs-left-display'),
    btnMute: document.getElementById('btn-mute'),
    // Quickbar buttons & badges
    btnHint: document.getElementById('btn-hint'),
    badgeHint: document.getElementById('badge-hint'),
    btnShuffle: document.getElementById('btn-shuffle'),
    badgeShuffle: document.getElementById('badge-shuffle'),
    btnUndo: document.getElementById('btn-undo'),
    badgeUndo: document.getElementById('badge-undo'),
    btnLotus: document.getElementById('btn-lotus'),
    badgeLotus: document.getElementById('badge-lotus'),
    // Modals
    victoryModal: document.getElementById('victory-modal'),
    modalTime: document.getElementById('modal-time'),
    modalLayout: document.getElementById('modal-layout'),
    modalStreak: document.getElementById('modal-streak'),
    modalRecordBadge: document.getElementById('modal-record-badge'),
    btnVictoryNext: document.getElementById('btn-victory-next'),
    btnVictoryMenu: document.getElementById('btn-victory-menu')
  };

  // ---------------------------------------------------------------------------
  // Audio & Mute Sync
  // ---------------------------------------------------------------------------
  function updateMuteButton() {
    if (!UI.btnMute) return;
    const isMuted = Utils.sound.isMuted();
    UI.btnMute.textContent = isMuted ? '🔇' : '🔊';
    UI.btnMute.title = isMuted ? 'Unmute Audio' : 'Mute Audio';
  }

  if (UI.btnMute) {
    UI.btnMute.addEventListener('click', () => {
      Utils.sound.toggleMute();
      updateMuteButton();
    });
    updateMuteButton();
  }

  // ---------------------------------------------------------------------------
  // Inventory Badges Sync
  // ---------------------------------------------------------------------------
  function updateEquipmentBadges() {
    const inv = Progress.getInventory();
    if (UI.badgeHint)    UI.badgeHint.textContent    = inv.hints || 0;
    if (UI.badgeShuffle) UI.badgeShuffle.textContent = inv.shuffles || 0;
    if (UI.badgeUndo)    UI.badgeUndo.textContent    = inv.undos || 0;
    if (UI.badgeLotus)   UI.badgeLotus.textContent   = inv.lotuses || 0;

    if (UI.btnHint)    UI.btnHint.classList.toggle('quickbar-btn--empty', (inv.hints || 0) === 0);
    if (UI.btnShuffle) UI.btnShuffle.classList.toggle('quickbar-btn--empty', (inv.shuffles || 0) === 0);
    if (UI.btnUndo)    UI.btnUndo.classList.toggle('quickbar-btn--empty', (inv.undos || 0) === 0 || State.matchedHistory.length === 0);
    if (UI.btnLotus)   UI.btnLotus.classList.toggle('quickbar-btn--empty', (inv.lotuses || 0) === 0);
  }

  // ---------------------------------------------------------------------------
  // Time Formatter Helper
  // ---------------------------------------------------------------------------
  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // ---------------------------------------------------------------------------
  // Initialization & Layout Setup
  // ---------------------------------------------------------------------------
  function initGame() {
    const params = new URLSearchParams(window.location.search);
    const layoutParam = params.get('layout') || 'turtle';
    const continueGame = params.get('continue') === '1';

    const paidLayouts = ['pagoda', 'bridge', 'lotus', 'gate', 'compass', 'wave', 'lantern', 'garden', 'crown', 'river'];
    if (paidLayouts.indexOf(layoutParam) !== -1) {
      const allowed = window.ArcadeContent && window.ArcadeContent.allowsLayout(layoutParam);
      if (!allowed) {
        State.lockedPack = true;
        if (window.ArcadeContent) window.ArcadeContent.showLock('layouts');
        else {
          const note = document.createElement('p');
          note.id = 'content-lock-fallback';
          note.textContent = 'This pack is part of Benchmark Arcade.';
          document.body.appendChild(note);
        }
        return;
      }
    }

    State.layoutId = layoutParam;
    State.layoutDef = MahjongLayouts.DEFINITIONS[layoutParam];
    if (!State.layoutDef) {
      if (paidLayouts.indexOf(layoutParam) !== -1) return;
      State.layoutId = 'turtle';
      State.layoutDef = MahjongLayouts.DEFINITIONS.turtle;
    }

    if (UI.layoutLabel) {
      UI.layoutLabel.textContent = State.layoutDef.title;
    }

    const saved = Progress.getActiveGame();
    if (continueGame && saved && saved.layoutId === State.layoutId && !saved.isGameOver && saved.activeTiles.length > 0) {
      // Restore active session
      State.activeTiles = saved.activeTiles;
      State.matchedHistory = saved.matchedHistory || [];
      State.elapsed = saved.elapsed || 0;
    } else {
      // Build fresh guaranteed-solvable board
      const rawPositions = State.layoutDef.builder();
      State.activeTiles = BoardEngine.generateSolvableBoard(rawPositions);
      State.matchedHistory = [];
      State.elapsed = 0;
      Progress.clearActiveGame();
    }

    // Start Timer
    State.timer = new Utils.GameTimer((sec) => {
      State.elapsed = sec;
      if (UI.timerDisplay) {
        UI.timerDisplay.textContent = formatTime(sec);
      }
    }, State.elapsed);
    State.timer.start();

    // Render Board
    renderBoard();
    updateHUDCounters();
    updateEquipmentBadges();
    saveState();

    // Responsive Auto-Scale
    window.addEventListener('resize', autoScaleBoard);
    setTimeout(autoScaleBoard, 50);
  }

  // ---------------------------------------------------------------------------
  // Board Rendering & 3D Isometric Positioning
  // ---------------------------------------------------------------------------
  function renderBoard() {
    if (!UI.boardStage) return;
    UI.boardStage.innerHTML = '';

    if (State.activeTiles.length === 0) return;

    // Calculate bounding box in half-tile grid coordinates
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    State.activeTiles.forEach(t => {
      if (t.x < minX) minX = t.x;
      if (t.x > maxX) maxX = t.x;
      if (t.y < minY) minY = t.y;
      if (t.y > maxY) maxY = t.y;
    });

    const stepW = State.tileWidth / 2;
    const stepH = State.tileHeight / 2;

    const stageWidth = (maxX - minX + 2) * stepW + 40;
    const stageHeight = (maxY - minY + 2) * stepH + 40;

    UI.boardStage.style.width = `${stageWidth}px`;
    UI.boardStage.style.height = `${stageHeight}px`;

    // Render all active tiles
    State.activeTiles.forEach(tile => {
      const isFree = BoardEngine.isTileFree(tile, State.activeTiles);
      const isSelected = State.selectedTile && State.selectedTile.id === tile.id;
      const isHinted = State.hintPair && (State.hintPair[0].id === tile.id || State.hintPair[1].id === tile.id);

      const el = document.createElement('div');
      el.className = 'mj-tile';
      el.id = `mj-tile-${tile.id}`;

      if (isFree) el.classList.add('mj-tile--free');
      else el.classList.add('mj-tile--blocked');

      if (isSelected) el.classList.add('mj-tile--selected');
      if (isHinted) el.classList.add('mj-tile--hint');

      // Isometric depth offset based on layer z
      const layerOffset = tile.z * 4;
      const posX = (tile.x - minX) * stepW - layerOffset + 20;
      const posY = (tile.y - minY) * stepH - layerOffset + 20;

      el.style.left = `${posX}px`;
      el.style.top = `${posY}px`;
      // z-index: higher layers always on top, lower y behind higher y
      el.style.zIndex = tile.z * 1000 + Math.round(tile.y * 20 + tile.x);

      // Inner tile slab structure
      const body = document.createElement('div');
      body.className = 'mj-tile__body';

      const face = document.createElement('div');
      face.className = 'mj-tile__face';
      face.innerHTML = MahjongTiles.renderTileSVG(tile.tileData);

      body.appendChild(face);
      el.appendChild(body);

      // Tile Click Event
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handleTileClick(tile);
      });

      UI.boardStage.appendChild(el);
    });

    autoScaleBoard();
  }

  /**
   * Automatically scales the board stage to fit the viewport comfortably
   */
  function autoScaleBoard() {
    if (!UI.boardViewport || !UI.boardStage) return;

    const viewportW = UI.boardViewport.clientWidth - 32;
    const viewportH = UI.boardViewport.clientHeight - 32;
    const stageW = UI.boardStage.offsetWidth || 800;
    const stageH = UI.boardStage.offsetHeight || 600;

    const scaleW = viewportW / stageW;
    const scaleH = viewportH / stageH;
    const scale = Math.min(1.25, Math.max(0.32, Math.min(scaleW, scaleH)));

    UI.boardStage.style.transform = `scale(${scale})`;
  }

  // ---------------------------------------------------------------------------
  // Tile Interaction & Pair Matching
  // ---------------------------------------------------------------------------
  function handleTileClick(tile) {
    if (State.isGameOver) return;

    // Ignore clicks on tiles that are already removed / matched
    if (!State.activeTiles.some(t => t.id === tile.id)) return;

    const isFree = BoardEngine.isTileFree(tile, State.activeTiles);
    if (!isFree) {
      Utils.sound.play('blocked');
      Utils.vibrate([20]);
      Utils.showToast("This tile is locked by flanking or upper tiles.", 1800, 'warning');
      return;
    }

    // Clear any active hint pulse
    State.hintPair = null;

    // Case 1: No tile currently selected
    if (!State.selectedTile) {
      State.selectedTile = tile;
      Utils.sound.play('click');
      Utils.vibrate([25]);
      renderBoard();
      return;
    }

    // Case 2: Tapping the already-selected tile -> Unselect
    if (State.selectedTile.id === tile.id) {
      State.selectedTile = null;
      Utils.sound.play('click');
      renderBoard();
      return;
    }

    // Case 3: Tapping a second free tile -> Check Match
    const first = State.selectedTile;
    const second = tile;

    if (MahjongTiles.canMatch(first.tileData, second.tileData)) {
      // VALID MATCH!
      executeMatch(first, second);
    } else {
      // Incompatible tiles -> Switch selection to second tile
      State.selectedTile = second;
      Utils.sound.play('click');
      Utils.vibrate([25]);
      renderBoard();
    }
  }

  function executeMatch(tileA, tileB) {
    // Ignore if either tile has already been matched / removed
    if (!State.activeTiles.some(t => t.id === tileA.id) || !State.activeTiles.some(t => t.id === tileB.id)) {
      return;
    }

    const elA = document.getElementById(`mj-tile-${tileA.id}`);
    const elB = document.getElementById(`mj-tile-${tileB.id}`);

    if (elA) {
      elA.classList.add('mj-tile--matched');
      elA.style.pointerEvents = 'none';
    }
    if (elB) {
      elB.classList.add('mj-tile--matched');
      elB.style.pointerEvents = 'none';
    }

    Utils.sound.play('match');
    Utils.vibrate([40, 50, 40]);

    // Pull them out of activeTiles IMMEDIATELY so they can never be matched or clicked again
    State.activeTiles = State.activeTiles.filter(t => t.id !== tileA.id && t.id !== tileB.id);

    // Save to Undo History
    State.matchedHistory.push({ tileA, tileB });
    State.selectedTile = null;
    State.hintPair = null;

    updateHUDCounters();
    updateEquipmentBadges();
    saveState();

    // Check Victory immediately if board cleared
    if (State.activeTiles.length === 0) {
      setTimeout(() => {
        renderBoard();
        handleVictory();
      }, 320);
      return;
    }

    // Clean up DOM and re-evaluate free tiles after the 320ms animation finishes
    setTimeout(() => {
      renderBoard();

      // Check Stalemate / Out of Moves
      const availableMoves = BoardEngine.findAvailablePairs(State.activeTiles);
      if (availableMoves.length === 0 && State.activeTiles.length > 0) {
        handleStalemate();
      }
    }, 320);
  }

  function updateHUDCounters() {
    const remaining = State.activeTiles.length;
    const pairsLeft = Math.ceil(remaining / 2);
    if (UI.tileCountDisplay) UI.tileCountDisplay.textContent = remaining;
    if (UI.pairsLeftDisplay) UI.pairsLeftDisplay.textContent = pairsLeft;
  }

  // ---------------------------------------------------------------------------
  // Victory & Stalemate
  // ---------------------------------------------------------------------------
  function handleVictory() {
    State.isGameOver = true;
    if (State.timer) State.timer.pause();

    Utils.sound.play('gong');
    Utils.vibrate([100, 50, 100, 50, 200]);

    const finalTime = State.elapsed;
    const stats = Progress.recordGameResult(true, State.layoutId, finalTime);
    Progress.clearActiveGame();

    if (UI.modalTime) UI.modalTime.textContent = formatTime(finalTime);
    if (UI.modalLayout) UI.modalLayout.textContent = State.layoutDef.title;
    if (UI.modalStreak) UI.modalStreak.textContent = `${stats.currentStreak} in a row`;

    if (UI.modalRecordBadge) {
      const isBest = stats.bestTimes[State.layoutId] === finalTime;
      if (isBest) {
        UI.modalRecordBadge.style.display = 'inline-block';
        UI.modalRecordBadge.textContent = '★ NEW SANCTUARY RECORD ★';
      } else {
        UI.modalRecordBadge.style.display = 'none';
      }
    }

    if (UI.victoryModal) {
      setTimeout(() => {
        UI.victoryModal.classList.add('modal-backdrop--open');
      }, 600);
    }
  }

  function handleStalemate() {
    Utils.showToast("No legal moves remain! Use a Dragon Shuffle to re-open paths.", 4500, 'warning');
  }

  // ---------------------------------------------------------------------------
  // Tactical Helpers & Power-Ups
  // ---------------------------------------------------------------------------
  function useHint() {
    if (State.isGameOver || State.activeTiles.length === 0) return;

    if (Progress.getItemCount('hints') <= 0) {
      Utils.showToast("No Compass Hints available! The morning refill restores these.", 2500, 'warning');
      return;
    }

    const available = BoardEngine.findAvailablePairs(State.activeTiles);
    if (available.length === 0) {
      Utils.showToast("No matching pairs currently open! Use Dragon Shuffle.", 3000, 'warning');
      return;
    }

    Progress.useItem('hints');
    updateEquipmentBadges();

    // Pick a pair with the highest layer z to unlock deeper tiles
    available.sort((p1, p2) => (p2[0].z + p2[1].z) - (p1[0].z + p1[1].z));
    const targetPair = available[0];

    State.hintPair = targetPair;
    State.selectedTile = null;

    Utils.sound.play('click');
    Utils.vibrate([30, 40, 30]);
    Utils.showToast(`COMPASS HINT: ${targetPair[0].tileData.label} highlighted!`, 3000, 'success');

    renderBoard();

    // Auto-clear hint after 4 seconds
    setTimeout(() => {
      if (State.hintPair === targetPair) {
        State.hintPair = null;
        renderBoard();
      }
    }, 4000);
  }

  function useShuffle() {
    if (State.isGameOver || State.activeTiles.length === 0) return;

    if (Progress.getItemCount('shuffles') <= 0) {
      Utils.showToast("No Dragon Shuffles available! The morning refill restores these.", 2500, 'warning');
      return;
    }

    const candidate = BoardEngine.reshuffleRemainingTiles(State.activeTiles);
    const available = BoardEngine.findAvailablePairs(candidate);

    if (available.length === 0) {
      Utils.showToast("Unable to open any matching pairs with current remaining tiles.", 3000, 'warning');
      return;
    }

    Progress.useItem('shuffles');
    updateEquipmentBadges();

    State.activeTiles = candidate;
    State.selectedTile = null;
    State.hintPair = null;

    Utils.sound.play('shuffle');
    Utils.vibrate([50, 70, 90]);
    Utils.showToast(`DRAGON SHUFFLE: Rearranged tiles — ${available.length} matching ${available.length === 1 ? 'pair' : 'pairs'} now open!`, 3500, 'info');

    renderBoard();
    saveState();
  }

  function useUndo() {
    if (State.isGameOver || State.matchedHistory.length === 0) {
      Utils.showToast("No matched pairs to undo.", 2000, 'info');
      return;
    }

    if (Progress.getItemCount('undos') <= 0) {
      Utils.showToast("No Time Rewinds available! The morning refill restores these.", 2500, 'warning');
      return;
    }

    Progress.useItem('undos');
    updateEquipmentBadges();

    const last = State.matchedHistory.pop();
    State.activeTiles.push(last.tileA);
    State.activeTiles.push(last.tileB);
    State.selectedTile = null;
    State.hintPair = null;

    Utils.sound.play('undo');
    Utils.vibrate([40, 50]);
    Utils.showToast("TIME REWOUND: Restored previous matched pair.", 2500, 'info');

    renderBoard();
    updateHUDCounters();
    saveState();
  }

  function useLotus() {
    if (State.isGameOver || State.activeTiles.length === 0) return;

    if (Progress.getItemCount('lotuses') <= 0) {
      Utils.showToast("No Celestial Lotuses in cache! The morning refill restores these.", 2500, 'warning');
      return;
    }

    let targetPair = null;
    if (State.selectedTile) {
      // Find matching partner among currently FREE tiles
      const freeTiles = BoardEngine.getFreeTiles(State.activeTiles);
      const partner = freeTiles.find(t => t.id !== State.selectedTile.id && MahjongTiles.canMatch(t.tileData, State.selectedTile.tileData));
      if (partner) {
        targetPair = [State.selectedTile, partner];
      } else {
        Utils.showToast("Selected tile has no open matching partner on the board! Select another free tile or deselect to banish an open pair.", 3500, 'warning');
        return;
      }
    } else {
      const openPairs = BoardEngine.findAvailablePairs(State.activeTiles);
      if (openPairs.length > 0) {
        targetPair = openPairs[0];
      } else {
        Utils.showToast("No matching pair of free tiles is currently open! Use Dragon Shuffle.", 3000, 'warning');
        return;
      }
    }

    Progress.useItem('lotuses');
    updateEquipmentBadges();

    Utils.sound.play('lotus');
    Utils.vibrate([60, 40, 80]);
    Utils.showToast(`CELESTIAL LOTUS: Banished open pair of ${targetPair[0].tileData.label}!`, 3000, 'success');

    executeMatch(targetPair[0], targetPair[1]);
  }

  // Bind Quickbar Buttons
  if (UI.btnHint)    UI.btnHint.addEventListener('click', useHint);
  if (UI.btnShuffle) UI.btnShuffle.addEventListener('click', useShuffle);
  if (UI.btnUndo)    UI.btnUndo.addEventListener('click', useUndo);
  if (UI.btnLotus)   UI.btnLotus.addEventListener('click', useLotus);

  // ---------------------------------------------------------------------------
  // State Persistence & Safe Leave
  // ---------------------------------------------------------------------------
  function saveState() {
    if (State.isGameOver || State.activeTiles.length === 0) return;
    Progress.saveActiveGame({
      layoutId: State.layoutId,
      activeTiles: State.activeTiles,
      matchedHistory: State.matchedHistory,
      elapsed: State.elapsed,
      isGameOver: false
    });
  }

  document.querySelectorAll('a[href="index.html"], a[href="store.html"]').forEach(link => {
    link.addEventListener('click', () => {
      saveState();
    });
  });

  window.addEventListener('beforeunload', () => {
    saveState();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (State.timer) State.timer.pause();
      saveState();
    } else if (!State.isGameOver) {
      if (State.timer) State.timer.start();
    }
  });

  // Modal Action Listeners
  if (UI.btnVictoryNext) {
    UI.btnVictoryNext.addEventListener('click', () => {
      window.location.href = `game.html?layout=${State.layoutId}`;
    });
  }
  if (UI.btnVictoryMenu) {
    UI.btnVictoryMenu.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  // Deselect on clicking empty background
  if (UI.boardViewport) {
    UI.boardViewport.addEventListener('click', (e) => {
      if (e.target === UI.boardViewport || e.target === UI.boardStage) {
        if (State.selectedTile) {
          State.selectedTile = null;
          renderBoard();
        }
      }
    });
  }

  // Initialize Session
  initGame();
});
