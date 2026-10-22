/**
 * INFERNO SWEEPER — game.js
 * Mission Controller, tactical cell interactions, reactive status face, and power-up system.
 */

'use strict';

window.Game = (() => {

  const State = {
    difficulty: 'recruit',
    width: 9,
    height: 9,
    totalMines: 10,
    grid: [],
    revealedCount: 0,
    flagCount: 0,
    firstClickDone: false,
    gameOver: false,
    gameWon: false,
    timer: null,
    touchMode: 'dig',      // 'dig' | 'flag'
    sonarMode: false,      // targeting 3x3 sweep
    shieldActive: false,
    faceState: 'IDLE',
    longPressTimer: null,
    longPressTriggered: false
  };

  // ---------------------------------------------------------------------------
  // Status Face Controller
  // ---------------------------------------------------------------------------
  function setFace(faceType) {
    if (State.gameOver && !State.gameWon && faceType !== 'IDLE') return;
    if (State.gameWon && faceType !== 'IDLE') return;

    State.faceState = faceType;
    const btn = document.getElementById('face-btn');
    if (!btn) return;
    const svgCode = window.Utils.FACES[faceType] || window.Utils.FACES.IDLE;
    btn.innerHTML = svgCode;
  }

  // ---------------------------------------------------------------------------
  // Initialize / Restart Mission
  // ---------------------------------------------------------------------------
  function initGame(restoreSave = true) {
    const params = new URLSearchParams(window.location.search);
    const diffParam = params.get('diff') || 'recruit';
    const isContinue = params.get('continue') === '1';

    const saved = (restoreSave && isContinue) ? window.Progress.getActiveGame() : null;

    if (saved && saved.difficulty === diffParam && !saved.gameOver && saved.firstClickDone) {
      // Restore in-progress mission
      State.difficulty = saved.difficulty;
      State.width = saved.width;
      State.height = saved.height;
      State.totalMines = saved.totalMines;
      State.grid = saved.grid;
      State.revealedCount = saved.revealedCount;
      State.flagCount = saved.flagCount;
      State.firstClickDone = true;
      State.gameOver = false;
      State.gameWon = false;
      State.shieldActive = saved.shieldActive || false;
    } else {
      // Clean mission setup
      State.difficulty = diffParam;
      if (diffParam === 'custom') {
        State.width = parseInt(params.get('w'), 10) || 12;
        State.height = parseInt(params.get('h'), 10) || 12;
        State.totalMines = parseInt(params.get('m'), 10) || 20;
      } else {
        const cfg = window.MineGen.PRESETS[diffParam] || window.MineGen.PRESETS.recruit;
        State.width = cfg.width;
        State.height = cfg.height;
        State.totalMines = cfg.mines;
      }
      State.grid = window.MineGen.createBlankGrid(State.width, State.height);
      State.revealedCount = 0;
      State.flagCount = 0;
      State.firstClickDone = false;
      State.gameOver = false;
      State.gameWon = false;
      State.shieldActive = false;
      if (!isContinue) {
        window.Progress.clearActiveGame();
      }
    }

    // Set Mission title
    const titleEl = document.getElementById('hud-mission-title');
    if (titleEl) {
      const preset = window.MineGen.PRESETS[State.difficulty];
      titleEl.textContent = preset ? preset.label : `Custom Sector (${State.width}x${State.height})`;
    }

    // Initialize timer
    if (State.timer) State.timer.pause();
    const initElapsed = (saved && isContinue && saved.elapsed) ? saved.elapsed : 0;
    State.timer = new window.Utils.GameTimer(updateTimerDisplay, initElapsed);
    if (saved && isContinue && State.firstClickDone && !State.gameOver && !State.gameWon) {
      State.timer.start(initElapsed);
    } else {
      updateTimerDisplay(0);
    }

    updateMinesDisplay();
    updatePowerUpBar();
    setFace('IDLE');
    renderGridDOM();
  }

  // ---------------------------------------------------------------------------
  // DOM Rendering
  // ---------------------------------------------------------------------------
  function renderGridDOM() {
    const container = document.getElementById('mine-grid');
    if (!container) return;

    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${State.width}, 34px)`;
    container.style.gridTemplateRows = `repeat(${State.height}, 34px)`;

    // Adjust for mobile screens
    if (window.innerWidth <= 600) {
      container.style.gridTemplateColumns = `repeat(${State.width}, 30px)`;
      container.style.gridTemplateRows = `repeat(${State.height}, 30px)`;
    }

    for (let r = 0; r < State.height; r++) {
      for (let c = 0; c < State.width; c++) {
        const cellData = State.grid[r][c];
        const cellEl = document.createElement('div');
        cellEl.className = 'cell';
        cellEl.dataset.row = r;
        cellEl.dataset.col = c;
        cellEl.setAttribute('role', 'button');
        cellEl.setAttribute('aria-label', `Sector ${r}, ${c}`);

        attachCellEvents(cellEl, r, c);
        updateCellView(cellEl, cellData);
        container.appendChild(cellEl);
      }
    }
  }

  function getCellEl(r, c) {
    return document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
  }

  function updateCellView(cellEl, cellData) {
    if (!cellEl) return;

    // Reset base classes
    cellEl.className = 'cell';
    cellEl.innerHTML = '';

    if (cellData.revealed) {
      cellEl.classList.add('cell--revealed');
      if (cellData.isMine) {
        if (cellData.defused) {
          cellEl.classList.add('cell--defused');
          cellEl.innerHTML = '🛡️';
        } else {
          cellEl.classList.add('cell--exploded');
          cellEl.innerHTML = '💥';
        }
      } else if (cellData.neighborMines > 0) {
        cellEl.classList.add(`cell--num-${cellData.neighborMines}`);
        cellEl.textContent = cellData.neighborMines;
      }
    } else {
      // Unrevealed
      if (cellData.flagged) {
        cellEl.classList.add('cell--flagged');
        cellEl.innerHTML = '<span class="flag-icon">🚩</span>';
      } else if (State.gameOver && cellData.isMine) {
        // Show unflagged mines on game over
        cellEl.classList.add('cell--mine');
        cellEl.innerHTML = '💀';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Displays & HUD Updates
  // ---------------------------------------------------------------------------
  function updateMinesDisplay() {
    const display = document.getElementById('led-mines');
    if (!display) return;
    const remaining = State.totalMines - State.flagCount;
    display.textContent = String(remaining).padStart(3, remaining < 0 ? ' ' : '0');
  }

  function updateTimerDisplay(seconds) {
    const display = document.getElementById('led-timer');
    if (!display) return;
    const clamped = Math.min(999, seconds);
    display.textContent = String(clamped).padStart(3, '0');
  }

  function updatePowerUpBar() {
    const inv = window.Progress.getInventory();
    const shieldBtn = document.getElementById('power-shield');
    const sonarBtn  = document.getElementById('power-sonar');
    const orbBtn    = document.getElementById('power-orb');
    const strikeBtn = document.getElementById('power-strike');

    if (shieldBtn) {
      const cnt = inv.shields || 0;
      shieldBtn.querySelector('.power-btn__badge').textContent = State.shieldActive ? 'ON' : cnt;
      shieldBtn.classList.toggle('power-btn--empty', cnt <= 0 && !State.shieldActive);
      shieldBtn.style.borderColor = State.shieldActive ? 'var(--color-plasma-cyan)' : '';
    }
    if (sonarBtn) {
      const cnt = inv.scans || 0;
      sonarBtn.querySelector('.power-btn__badge').textContent = cnt;
      sonarBtn.classList.toggle('power-btn--empty', cnt <= 0);
      sonarBtn.style.borderColor = State.sonarMode ? 'var(--color-plasma-cyan)' : '';
    }
    if (orbBtn) {
      const cnt = inv.orbs || 0;
      orbBtn.querySelector('.power-btn__badge').textContent = cnt;
      orbBtn.classList.toggle('power-btn--empty', cnt <= 0);
    }
    if (strikeBtn) {
      const cnt = inv.strikes || 0;
      strikeBtn.querySelector('.power-btn__badge').textContent = cnt;
      strikeBtn.classList.toggle('power-btn--empty', cnt <= 0);
    }
  }

  // ---------------------------------------------------------------------------
  // Cell Event Listeners (Desktop, Touch, Long-Press, Chording)
  // ---------------------------------------------------------------------------
  function attachCellEvents(cellEl, r, c) {
    // Context Menu (Right Click on Desktop)
    cellEl.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (State.gameOver || State.gameWon) return;
      handleToggleFlag(r, c);
    });

    // Pointer Down (Anticipation Face + Long-Press Detection)
    cellEl.addEventListener('pointerdown', e => {
      if (State.gameOver || State.gameWon) return;

      const cellData = State.grid[r][c];
      if (!cellData.revealed && !cellData.flagged) {
        setFace('SURPRISED');
      }

      State.longPressTriggered = false;
      if (e.pointerType === 'touch') {
        State.longPressTimer = setTimeout(() => {
          State.longPressTriggered = true;
          window.Utils.vibrate([60]);
          handleToggleFlag(r, c);
        }, 500);
      }
    });

    // Pointer Up & Cancel
    const clearPointer = () => {
      if (State.longPressTimer) {
        clearTimeout(State.longPressTimer);
        State.longPressTimer = null;
      }
      if (!State.gameOver && !State.gameWon) {
        setFace('IDLE');
      }
    };

    cellEl.addEventListener('pointerup', clearPointer);
    cellEl.addEventListener('pointercancel', clearPointer);
    cellEl.addEventListener('pointerleave', clearPointer);

    // Primary Click
    cellEl.addEventListener('click', e => {
      if (State.gameOver || State.gameWon) return;
      if (State.longPressTriggered) {
        State.longPressTriggered = false;
        return;
      }

      const cellData = State.grid[r][c];

      // Sonar Target Mode
      if (State.sonarMode) {
        executeSonarAt(r, c);
        return;
      }

      // If already revealed: attempt Chording!
      if (cellData.revealed) {
        handleChord(r, c);
        return;
      }

      // Mobile flag mode toggle
      if (State.touchMode === 'flag') {
        handleToggleFlag(r, c);
      } else {
        handleReveal(r, c);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Core Gameplay Logic
  // ---------------------------------------------------------------------------
  function handleToggleFlag(r, c) {
    const cellData = State.grid[r][c];
    if (cellData.revealed) return;

    cellData.flagged = !cellData.flagged;
    State.flagCount += cellData.flagged ? 1 : -1;

    window.Utils.sound.play(cellData.flagged ? 'flag' : 'unflag');
    window.Utils.vibrate([30]);

    updateCellView(getCellEl(r, c), cellData);
    updateMinesDisplay();
    persistState();
  }

  function handleReveal(r, c) {
    if (State.gameOver || State.gameWon) return;
    const cellData = State.grid[r][c];
    if (cellData.revealed || cellData.flagged) return;

    // First click: Guarantee safe 3x3 opening!
    if (!State.firstClickDone) {
      State.firstClickDone = true;
      State.totalMines = window.MineGen.populateMines(State.grid, State.totalMines, r, c);
      updateMinesDisplay();
      State.timer.start();
    }

    // Check mine hit
    if (cellData.isMine) {
      // Check Bio-Shield (only saves if armed by player!)
      if (State.shieldActive) {
        window.Progress.useItem('shields');
        State.shieldActive = false;
        updatePowerUpBar();

        cellData.revealed = true;
        cellData.defused = true;
        // Never increment revealedCount for mines
        updateCellView(getCellEl(r, c), cellData);

        window.Utils.sound.play('shield');
        window.Utils.vibrate([100, 50, 100]);
        window.Utils.showToast('🛡️ <strong>Bio-Shield Activated!</strong> Lethal mine absorbed & defused.', 3000, 'info');

        checkWinCondition();
        persistState();
        return;
      }

      // Detonation: KIA
      handleGameOver(r, c);
      return;
    }

    // Safe reveal
    window.Utils.sound.play('dig');
    window.Utils.vibrate([20]);

    if (cellData.neighborMines === 0) {
      // Flood Fill cascade
      revealCascade(r, c);
    } else {
      cellData.revealed = true;
      State.revealedCount++;
      updateCellView(getCellEl(r, c), cellData);
    }

    checkWinCondition();
    persistState();
  }

  /**
   * Breadth-First-Search flood fill for contiguous empty cells
   */
  function revealCascade(startR, startC) {
    const queue = [{ r: startR, c: startC }];
    const visited = new Set();
    visited.add(`${startR},${startC}`);

    let floodCellsCount = 0;

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      const cell = State.grid[r][c];

      if (!cell.revealed && !cell.flagged) {
        cell.revealed = true;
        State.revealedCount++;
        floodCellsCount++;
        updateCellView(getCellEl(r, c), cell);
      }

      if (cell.neighborMines === 0) {
        const nbs = window.MineGen.getNeighbors(State.grid, r, c);
        nbs.forEach(n => {
          const key = `${n.row},${n.col}`;
          if (!visited.has(key) && !n.revealed && !n.flagged) {
            visited.add(key);
            queue.push({ r: n.row, c: n.col });
          }
        });
      }
    }

    if (floodCellsCount > 1) {
      window.Utils.sound.play('cascade');
    }
  }

  /**
   * Chording: Double-click/click on revealed number whose flag count matches clue
   */
  function handleChord(r, c) {
    const cell = State.grid[r][c];
    if (!cell.revealed || cell.neighborMines === 0) return;

    const nbs = window.MineGen.getNeighbors(State.grid, r, c);
    const flagsCount = nbs.filter(n => n.flagged).length;

    if (flagsCount === cell.neighborMines) {
      // Reveal all remaining unflagged neighbors
      let anyRevealed = false;
      nbs.forEach(n => {
        if (!n.revealed && !n.flagged) {
          anyRevealed = true;
          handleReveal(n.row, n.col);
        }
      });
      if (anyRevealed) {
        window.Utils.sound.play('click');
      }
    } else {
      // Highlight unrevealed neighbors briefly
      nbs.forEach(n => {
        if (!n.revealed && !n.flagged) {
          const el = getCellEl(n.row, n.col);
          if (el) {
            el.style.background = '#475569';
            setTimeout(() => { if (!n.revealed) el.style.background = ''; }, 140);
          }
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Victory & Game Over Sequences
  // ---------------------------------------------------------------------------
  function checkWinCondition() {
    if (State.gameOver || State.gameWon) return;
    if (!State.firstClickDone) return;

    for (let r = 0; r < State.height; r++) {
      for (let c = 0; c < State.width; c++) {
        const cell = State.grid[r][c];
        if (!cell.isMine && !cell.revealed) {
          return;
        }
      }
    }
    handleVictory();
  }

  function handleVictory() {
    State.gameWon = true;
    State.gameOver = true;
    if (State.timer) State.timer.pause();
    setFace('WIN');

    // Auto-flag all unflagged mines
    for (let r = 0; r < State.height; r++) {
      for (let c = 0; c < State.width; c++) {
        const cell = State.grid[r][c];
        if (cell.isMine && !cell.flagged) {
          cell.flagged = true;
          updateCellView(getCellEl(r, c), cell);
        }
      }
    }
    State.flagCount = State.totalMines;
    updateMinesDisplay();

    window.Utils.sound.play('win');
    window.Utils.vibrate([100, 50, 100, 50, 200]);

    const elapsed = State.timer ? State.timer.elapsed : 0;
    const stats = window.Progress.recordGameResult(true, State.difficulty, elapsed);
    window.Progress.clearActiveGame();

    setTimeout(() => showVictoryModal(stats), 600);
  }

  function handleGameOver(explodedR, explodedC) {
    State.gameOver = true;
    State.gameWon = false;
    if (State.timer) State.timer.pause();
    setFace('DEAD');

    window.Utils.sound.play('explosion');
    window.Utils.vibrate([300]);

    // Screen shake
    const frame = document.querySelector('.grid-frame');
    if (frame) {
      frame.classList.remove('screen-shake');
      void frame.offsetWidth;
      frame.classList.add('screen-shake');
    }

    // Reveal all cells
    for (let r = 0; r < State.height; r++) {
      for (let c = 0; c < State.width; c++) {
        const cell = State.grid[r][c];
        if (r === explodedR && c === explodedC) {
          cell.revealed = true;
        } else if (cell.isMine && !cell.flagged) {
          // Show mine
        }
        updateCellView(getCellEl(r, c), cell);
      }
    }

    const elapsed = State.timer ? State.timer.elapsed : 0;
    window.Progress.recordGameResult(false, State.difficulty, elapsed);
    window.Progress.clearActiveGame();
    window.Utils.showToast('💥 <strong>MISSION FAILED — KIA</strong>. Tap the skull or Reset to re-engage.', 3500, 'error');
  }

  function showVictoryModal(stats) {
    const modal = document.getElementById('victory-modal');
    if (!modal) return;

    document.getElementById('vic-time').textContent = `${State.timer.elapsed}s`;
    document.getElementById('vic-streak').textContent = stats.currentStreak;

    const bestTime = stats.bestTimes[State.difficulty];
    document.getElementById('vic-best').textContent = bestTime !== null ? `${bestTime}s` : `${State.timer.elapsed}s`;

    modal.classList.add('is-active');
  }

  function hideVictoryModal() {
    const modal = document.getElementById('victory-modal');
    if (modal) modal.classList.remove('is-active');
  }

  // ---------------------------------------------------------------------------
  // Armory Tactical Power-Ups
  // ---------------------------------------------------------------------------
  function toggleShield() {
    if (State.shieldActive) {
      State.shieldActive = false;
      window.Utils.sound.play('click');
      window.Utils.showToast('🛡️ Bio-Shield disengaged.', 1800, 'info');
      updatePowerUpBar();
      return;
    }

    if (window.Progress.getItemCount('shields') <= 0) {
      window.Utils.sound.play('click');
      window.Utils.showToast('No Bio-Shields in inventory! <a href="store.html">Daily Supply →</a>', 3000, 'warning');
      return;
    }

    State.shieldActive = true;
    window.Utils.sound.play('shield');
    window.Utils.showToast('🛡️ <strong>Bio-Shield Active!</strong> Next lethal mine hit will be deflected.', 2500, 'success');
    updatePowerUpBar();
  }

  function toggleSonarMode() {
    if (State.sonarMode) {
      State.sonarMode = false;
      window.Utils.sound.play('click');
      window.Utils.showToast('Radar sweep cancelled.', 1500, 'info');
      updatePowerUpBar();
      return;
    }

    if (window.Progress.getItemCount('scans') <= 0) {
      window.Utils.sound.play('click');
      window.Utils.showToast('No Sonar Sweeps left! <a href="store.html">Daily Supply →</a>', 3000, 'warning');
      return;
    }

    State.sonarMode = true;
    window.Utils.sound.play('scan');
    window.Utils.showToast('📡 <strong>Sonar Targeting:</strong> Tap any tile to sweep its 3x3 sector safely.', 3000, 'info');
    updatePowerUpBar();
  }

  function executeSonarAt(targetR, targetC) {
    if (!window.Progress.useItem('scans')) return;
    State.sonarMode = false;
    updatePowerUpBar();

    window.Utils.sound.play('scan');
    window.Utils.vibrate([60, 40, 60]);

    if (!State.firstClickDone) {
      State.firstClickDone = true;
      State.totalMines = window.MineGen.populateMines(State.grid, State.totalMines, targetR, targetC);
      updateMinesDisplay();
      State.timer.start();
    }

    let minesTagged = 0;
    let safeRevealed = 0;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = targetR + dr;
        const nc = targetC + dc;
        if (nr >= 0 && nr < State.height && nc >= 0 && nc < State.width) {
          const cell = State.grid[nr][nc];
          const el = getCellEl(nr, nc);
          if (el) {
            el.classList.add('cell--scan-sector');
            setTimeout(() => el.classList.remove('cell--scan-sector'), 700);
          }

          if (cell.isMine && !cell.flagged) {
            cell.flagged = true;
            State.flagCount++;
            minesTagged++;
            updateCellView(el, cell);
          } else if (!cell.isMine && !cell.revealed) {
            safeRevealed++;
            handleReveal(nr, nc);
          }
        }
      }
    }

    updateMinesDisplay();
    window.Utils.showToast(`📡 <strong>Sector Scanned:</strong> ${minesTagged} mines tagged, ${safeRevealed} safe tiles secured!`, 3000, 'success');
    persistState();
  }

  function triggerClairvoyance() {
    if (State.gameOver || State.gameWon) return;

    if (window.Progress.getItemCount('orbs') <= 0) {
      window.Utils.sound.play('click');
      window.Utils.showToast('No Clairvoyance Orbs left! <a href="store.html">Daily Supply →</a>', 3000, 'warning');
      return;
    }

    if (!State.firstClickDone) {
      window.Utils.showToast('ℹ️ Tap any tile to initiate the mission first.', 2000, 'info');
      return;
    }

    const hint = window.MineGen.findSafeTile(State.grid);
    if (!hint || hint.type !== 'guaranteed_safe') {
      window.Utils.sound.play('click');
      window.Utils.showToast('ℹ️ No forced safe move available. Tactical deduction requires more intel.', 3000, 'warning');
      return;
    }

    if (!window.Progress.useItem('orbs')) return;
    updatePowerUpBar();

    window.Utils.sound.play('clairvoyance');
    window.Utils.vibrate([40, 40, 80]);

    const targetEl = getCellEl(hint.row, hint.col);
    if (targetEl) {
      targetEl.classList.add('cell--safe-hint');
      setTimeout(() => targetEl.classList.remove('cell--safe-hint'), 4500);
    }

    window.Utils.showToast('👁️ <strong>Tactical AI:</strong> 100% Safe sector identified (glowing green).', 3500, 'success');
  }

  function triggerOrbitalStrike() {
    if (State.gameOver || State.gameWon) return;

    if (window.Progress.getItemCount('strikes') <= 0) {
      window.Utils.sound.play('click');
      window.Utils.showToast('No Orbital Strikes left! <a href="store.html">Daily Supply →</a>', 3000, 'warning');
      return;
    }

    if (!State.firstClickDone) {
      window.Utils.showToast('ℹ️ Deploy onto the field before calling in airstrikes.', 2000, 'info');
      return;
    }

    // Find hidden unflagged mines
    const hiddenMines = [];
    for (let r = 0; r < State.height; r++) {
      for (let c = 0; c < State.width; c++) {
        const cell = State.grid[r][c];
        if (cell.isMine && !cell.flagged && !cell.defused) {
          hiddenMines.push(cell);
        }
      }
    }

    if (hiddenMines.length === 0) {
      window.Utils.showToast('ℹ️ All known mines are already neutralized or marked.', 2500, 'info');
      return;
    }

    if (!window.Progress.useItem('strikes')) return;
    updatePowerUpBar();

    window.Utils.sound.play('strike');
    window.Utils.vibrate([80, 50, 200]);

    // Pick up to 3 random mines to disarm
    const targets = [];
    const count = Math.min(3, hiddenMines.length);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * hiddenMines.length);
      targets.push(hiddenMines.splice(idx, 1)[0]);
    }

    targets.forEach(m => {
      m.flagged = true;
      m.defused = true;
      State.flagCount++;
      const el = getCellEl(m.row, m.col);
      if (el) {
        el.classList.add('cell--scan-sector');
        updateCellView(el, m);
      }
    });

    updateMinesDisplay();
    window.Utils.showToast(`🚀 <strong>Orbital EMP Confirmed!</strong> ${targets.length} plasma mines neutralized.`, 3500, 'success');
    checkWinCondition();
    persistState();
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------
  function persistState() {
    if (State.gameOver || State.gameWon || !State.firstClickDone) return;
    window.Progress.saveActiveGame({
      difficulty: State.difficulty,
      width: State.width,
      height: State.height,
      totalMines: State.totalMines,
      grid: State.grid,
      revealedCount: State.revealedCount,
      flagCount: State.flagCount,
      firstClickDone: State.firstClickDone,
      shieldActive: State.shieldActive,
      elapsed: State.timer ? State.timer.elapsed : 0
    });
  }

  // ---------------------------------------------------------------------------
  // Event Bindings for Controls
  // ---------------------------------------------------------------------------
  function bindControls() {
    // Face Reset Button
    const faceBtn = document.getElementById('face-btn');
    if (faceBtn) {
      faceBtn.addEventListener('click', () => {
        window.Utils.sound.play('click');
        initGame(false);
      });
    }

    // Touch Mode Switcher (Dig vs Flag)
    const digBtn = document.getElementById('mode-dig');
    const flagBtn = document.getElementById('mode-flag');
    if (digBtn && flagBtn) {
      digBtn.addEventListener('click', () => {
        State.touchMode = 'dig';
        digBtn.classList.add('is-active');
        flagBtn.classList.remove('is-active');
        window.Utils.sound.play('click');
      });
      flagBtn.addEventListener('click', () => {
        State.touchMode = 'flag';
        flagBtn.classList.add('is-active');
        digBtn.classList.remove('is-active');
        window.Utils.sound.play('click');
      });
    }

    // Audio Mute Toggle
    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
      const updateSoundIcon = () => {
        soundBtn.textContent = window.Utils.sound.isMuted() ? '🔇' : '🔊';
      };
      updateSoundIcon();
      soundBtn.addEventListener('click', () => {
        window.Utils.sound.toggleMute();
        updateSoundIcon();
      });
    }

    // Back to Base
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        persistState();
        window.Utils.sound.play('click');
        window.location.href = 'index.html';
      });
    }

    // Persist active game on leave
    window.addEventListener('beforeunload', () => {
      persistState();
    });

    // Pause timer on tab switch / minimize
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (State.timer && State.firstClickDone && !State.gameOver && !State.gameWon) {
          State.timer.pause();
          persistState();
        }
      } else {
        if (State.timer && State.firstClickDone && !State.gameOver && !State.gameWon) {
          State.timer.start();
        }
      }
    });

    // Power-Up buttons
    const shieldBtn = document.getElementById('power-shield');
    if (shieldBtn) shieldBtn.addEventListener('click', toggleShield);

    const sonarBtn = document.getElementById('power-sonar');
    if (sonarBtn) sonarBtn.addEventListener('click', toggleSonarMode);

    const orbBtn = document.getElementById('power-orb');
    if (orbBtn) orbBtn.addEventListener('click', triggerClairvoyance);

    const strikeBtn = document.getElementById('power-strike');
    if (strikeBtn) strikeBtn.addEventListener('click', triggerOrbitalStrike);

    // Victory Modal Buttons
    const vicNext = document.getElementById('vic-next-btn');
    if (vicNext) {
      vicNext.addEventListener('click', () => {
        hideVictoryModal();
        initGame(false);
      });
    }
    const vicMenu = document.getElementById('vic-menu-btn');
    if (vicMenu) {
      vicMenu.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle Hook
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    bindControls();
    initGame(true);
  });

  return {
    initGame,
    State
  };

})();
