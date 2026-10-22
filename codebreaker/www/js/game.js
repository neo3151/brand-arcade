/**
 * BLACK VAULT — game.js
 * Mission controller: board rendering, socket interaction, Mastermind evaluation,
 * procedural sound integration, tactical armory items, and safe state persistence.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ---------------------------------------------------------------------------
  // Game State
  // ---------------------------------------------------------------------------
  const State = {
    difficulty: 'operative',
    codeLength: 4,
    poolSize: 6,
    allowDuplicates: true,
    maxAttempts: 10,
    secretCode: [],
    history: [],              // [ { guess: ['crimson', ...], feedback: { exact, partial, empty, total } } ]
    currentRowIndex: 0,
    currentGuess: [],         // Array of symbol IDs for active row
    selectedSlotIndex: 0,     // Currently focused pin socket
    revealedSlots: {},        // { [slotIndex]: symbolId }
    filteredSymbols: [],      // Array of symbol IDs eliminated by Frequency Filter
    isGameOver: false,
    timer: null,
    elapsed: 0,
    poolSymbols: []
  };

  // ---------------------------------------------------------------------------
  // Element References
  // ---------------------------------------------------------------------------
  const UI = {
    timerDisplay: document.getElementById('timer-display'),
    clearanceLabel: document.getElementById('clearance-label'),
    vaultSlots: document.getElementById('vault-slots'),
    boardRows: document.getElementById('board-rows'),
    colorPalette: document.getElementById('color-palette'),
    btnMute: document.getElementById('btn-mute'),
    btnBackBase: document.getElementById('btn-back-base'),
    // Equipment Buttons & Badges
    btnEquipDecrypt: document.getElementById('btn-equip-decrypt'),
    badgeDecrypt: document.getElementById('badge-decrypt'),
    btnEquipFilter: document.getElementById('btn-equip-filter'),
    badgeFilter: document.getElementById('badge-filter'),
    btnEquipRewind: document.getElementById('btn-equip-rewind'),
    badgeRewind: document.getElementById('badge-rewind'),
    btnEquipProbe: document.getElementById('btn-equip-probe'),
    badgeProbe: document.getElementById('badge-probe'),
    // Modals
    victoryModal: document.getElementById('victory-modal'),
    failureModal: document.getElementById('failure-modal'),
    modalTime: document.getElementById('modal-time'),
    modalRows: document.getElementById('modal-rows'),
    modalStreak: document.getElementById('modal-streak'),
    modalRecordBadge: document.getElementById('modal-record-badge'),
    btnVictoryNext: document.getElementById('btn-victory-next'),
    btnVictoryMenu: document.getElementById('btn-victory-menu'),
    btnFailureRetry: document.getElementById('btn-failure-retry'),
    btnFailureMenu: document.getElementById('btn-failure-menu')
  };

  // ---------------------------------------------------------------------------
  // Audio & Mute Synchronization
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
  // Equipment Inventory Display
  // ---------------------------------------------------------------------------
  function updateEquipmentBadges() {
    const inv = Progress.getInventory();
    if (UI.badgeDecrypt) UI.badgeDecrypt.textContent = inv.decryptors || 0;
    if (UI.badgeFilter)  UI.badgeFilter.textContent  = inv.filters || 0;
    if (UI.badgeRewind)  UI.badgeRewind.textContent  = inv.rewinds || 0;
    if (UI.badgeProbe)   UI.badgeProbe.textContent   = inv.probes || 0;

    if (UI.btnEquipDecrypt) UI.btnEquipDecrypt.classList.toggle('equip-btn--empty', (inv.decryptors || 0) === 0);
    if (UI.btnEquipFilter)  UI.btnEquipFilter.classList.toggle('equip-btn--empty', (inv.filters || 0) === 0);
    if (UI.btnEquipRewind)  UI.btnEquipRewind.classList.toggle('equip-btn--empty', (inv.rewinds || 0) === 0);
    if (UI.btnEquipProbe)   UI.btnEquipProbe.classList.toggle('equip-btn--empty', (inv.probes || 0) === 0);
  }

  // ---------------------------------------------------------------------------
  // Formatting Helpers
  // ---------------------------------------------------------------------------
  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function getSymbolData(symbolId) {
    return CipherEngine.PIN_SYMBOLS.find(s => s.id === symbolId) || null;
  }

  // ---------------------------------------------------------------------------
  // Initialization & Config
  // ---------------------------------------------------------------------------
  function initGame() {
    const params = new URLSearchParams(window.location.search);
    const diffParam = params.get('diff') || 'operative';
    const continueMission = params.get('continue') === '1';

    State.difficulty = diffParam;
    const preset = CipherEngine.CLEARANCE_PRESETS[diffParam] || CipherEngine.CLEARANCE_PRESETS.operative;

    if (diffParam === 'custom') {
      State.codeLength = parseInt(params.get('len'), 10) || 4;
      State.poolSize = Math.min(8, Math.max(4, parseInt(params.get('pool'), 10) || 6));
      State.allowDuplicates = params.get('dup') !== '0';
      State.maxAttempts = parseInt(params.get('att'), 10) || 10;
      if (!State.allowDuplicates && State.codeLength > State.poolSize) {
        State.codeLength = State.poolSize;
      }
    } else {
      State.codeLength = preset.codeLength;
      State.poolSize = preset.poolSize;
      State.allowDuplicates = preset.allowDuplicates;
      State.maxAttempts = preset.maxAttempts;
    }

    State.poolSymbols = CipherEngine.PIN_SYMBOLS.slice(0, State.poolSize);

    // Check for saved mission resume
    const saved = Progress.getActiveGame();
    if (continueMission && saved && saved.difficulty === State.difficulty && !saved.isGameOver) {
      // Restore state
      State.codeLength = saved.codeLength;
      State.poolSize = saved.poolSize;
      State.allowDuplicates = saved.allowDuplicates;
      State.maxAttempts = saved.maxAttempts;
      State.secretCode = saved.secretCode;
      State.history = saved.history || [];
      State.currentRowIndex = saved.currentRowIndex || 0;
      State.revealedSlots = saved.revealedSlots || {};
      State.filteredSymbols = saved.filteredSymbols || [];
      State.elapsed = saved.elapsed || 0;
      State.poolSymbols = CipherEngine.PIN_SYMBOLS.slice(0, State.poolSize);
      State.currentGuess = saved.currentGuess || new Array(State.codeLength).fill(null);
    } else {
      // Fresh new game
      State.secretCode = CipherEngine.generateSecretCode(
        State.codeLength,
        State.poolSymbols.map(s => s.id),
        State.allowDuplicates
      );
      State.history = [];
      State.currentRowIndex = 0;
      State.revealedSlots = {};
      State.filteredSymbols = [];
      State.elapsed = 0;
      State.currentGuess = new Array(State.codeLength).fill(null);
      // Clean up previous active game if starting anew
      Progress.clearActiveGame();
    }

    // Set Clearance Header Label
    if (UI.clearanceLabel) {
      if (diffParam === 'custom') {
        UI.clearanceLabel.textContent = 'Custom Wiretap';
      } else {
        UI.clearanceLabel.textContent = preset.label;
      }
    }

    // Start Timer
    State.timer = new Utils.GameTimer((sec) => {
      State.elapsed = sec;
      if (UI.timerDisplay) {
        UI.timerDisplay.textContent = formatTime(sec);
      }
    }, State.elapsed);
    State.timer.start();

    // Render Vault Compartment
    renderVaultSlots();

    // Render Color Palette
    renderPalette();

    // Render Guess Board
    renderBoard();

    // Synchronize pre-revealed slots into active row
    applyRevealedSlotsToCurrentRow();

    // Update equipment badges
    updateEquipmentBadges();

    // Persist Initial State
    saveState();
  }

  // ---------------------------------------------------------------------------
  // Vault Header Rendering (Top Secret Code Compartment)
  // ---------------------------------------------------------------------------
  function renderVaultSlots() {
    if (!UI.vaultSlots) return;
    UI.vaultSlots.innerHTML = '';

    for (let i = 0; i < State.codeLength; i++) {
      const pinEl = document.createElement('div');
      pinEl.className = 'vault-pin';
      pinEl.id = `vault-pin-${i}`;

      const isRevealed = State.isGameOver || (State.revealedSlots && State.revealedSlots[i]);
      if (isRevealed) {
        const symId = State.revealedSlots[i] || State.secretCode[i];
        const sym = getSymbolData(symId);
        if (sym) {
          pinEl.classList.add('vault-pin--revealed');
          pinEl.style.backgroundColor = sym.hex;
          pinEl.title = `Slot ${i + 1}: ${sym.label}`;
          pinEl.textContent = sym.code;
        }
      } else {
        pinEl.textContent = '?';
      }

      UI.vaultSlots.appendChild(pinEl);
    }
  }

  // ---------------------------------------------------------------------------
  // Bottom Pin Palette Rendering
  // ---------------------------------------------------------------------------
  function renderPalette() {
    if (!UI.colorPalette) return;
    UI.colorPalette.innerHTML = '';

    State.poolSymbols.forEach((sym, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-choice-btn';
      btn.style.backgroundColor = sym.hex;
      btn.setAttribute('data-symbol', sym.id);
      btn.title = `${sym.label} [Key ${idx + 1}]`;
      btn.textContent = sym.code;

      if (State.filteredSymbols.includes(sym.id)) {
        btn.classList.add('color-choice-btn--disabled');
        btn.disabled = true;
      }

      btn.addEventListener('click', () => {
        if (State.isGameOver) return;
        placeSymbolInCurrentSlot(sym.id);
      });

      UI.colorPalette.appendChild(btn);
    });

    // Erase / Clear Button on palette
    const eraseBtn = document.createElement('button');
    eraseBtn.type = 'button';
    eraseBtn.className = 'btn btn--secondary';
    eraseBtn.style.padding = '0.35rem 0.75rem';
    eraseBtn.style.fontFamily = 'var(--font-typewriter)';
    eraseBtn.style.fontSize = '0.85rem';
    eraseBtn.title = 'Clear selected slot [Backspace]';
    eraseBtn.textContent = '⌫ CLEAR';
    eraseBtn.addEventListener('click', () => {
      if (State.isGameOver) return;
      clearSelectedSlot();
    });
    UI.colorPalette.appendChild(eraseBtn);
  }

  // ---------------------------------------------------------------------------
  // Board Rows Rendering
  // ---------------------------------------------------------------------------
  function renderBoard() {
    if (!UI.boardRows) return;
    UI.boardRows.innerHTML = '';

    for (let r = 0; r < State.maxAttempts; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'guess-row';
      rowEl.id = `guess-row-${r}`;

      const isCompleted = r < State.history.length;
      const isActive = r === State.currentRowIndex && !State.isGameOver;
      const isLocked = r > State.currentRowIndex;

      if (isActive) rowEl.classList.add('guess-row--active');
      if (isCompleted) rowEl.classList.add('guess-row--submitted');
      if (isLocked) rowEl.classList.add('guess-row--locked');

      // Row sequence number
      const numEl = document.createElement('div');
      numEl.className = 'row-num';
      numEl.textContent = String(r + 1).padStart(2, '0');
      rowEl.appendChild(numEl);

      // Sockets Container
      const pinsContainer = document.createElement('div');
      pinsContainer.className = 'row-pins';

      for (let s = 0; s < State.codeLength; s++) {
        const socket = document.createElement('div');
        socket.className = 'pin-socket';
        socket.id = `socket-${r}-${s}`;
        socket.setAttribute('data-row', r);
        socket.setAttribute('data-slot', s);

        if (isCompleted) {
          const pastSymId = State.history[r].guess[s];
          const sym = getSymbolData(pastSymId);
          if (sym) {
            socket.classList.add('pin-socket--filled');
            socket.style.backgroundColor = sym.hex;
            socket.textContent = sym.code;
          }
        } else if (isActive) {
          const activeSymId = State.currentGuess[s];
          if (activeSymId) {
            const sym = getSymbolData(activeSymId);
            if (sym) {
              socket.classList.add('pin-socket--filled');
              socket.style.backgroundColor = sym.hex;
              socket.textContent = sym.code;
            }
          }
          if (s === State.selectedSlotIndex) {
            socket.classList.add('pin-socket--selected');
          }

          socket.addEventListener('click', () => {
            selectSlot(s);
          });
        }

        pinsContainer.appendChild(socket);
      }
      rowEl.appendChild(pinsContainer);

      // Feedback Matrix Box
      const feedbackBox = document.createElement('div');
      feedbackBox.className = 'feedback-box';

      // Determine feedback layout columns: 2 columns standard
      const pegCount = State.codeLength;
      for (let p = 0; p < pegCount; p++) {
        const peg = document.createElement('div');
        peg.className = 'feedback-peg';

        if (isCompleted) {
          const fb = State.history[r].feedback;
          if (p < fb.exact) {
            peg.classList.add('feedback-peg--exact');
            peg.title = 'Exact Hit: Correct Symbol & Position';
          } else if (p < fb.exact + fb.partial) {
            peg.classList.add('feedback-peg--partial');
            peg.title = 'Partial Hit: Correct Symbol, Wrong Position';
          }
        }
        feedbackBox.appendChild(peg);
      }
      rowEl.appendChild(feedbackBox);

      // Row Action Button (Submit on active row, status marker on past/future)
      if (isActive) {
        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'btn btn--primary row-submit-btn';
        submitBtn.id = 'btn-submit-guess';
        submitBtn.textContent = 'CHECK';
        submitBtn.title = 'Verify guess row [Enter]';
        submitBtn.disabled = !isRowComplete();

        submitBtn.addEventListener('click', () => {
          submitCurrentGuess();
        });
        rowEl.appendChild(submitBtn);
      } else {
        const statusSpacer = document.createElement('div');
        statusSpacer.style.minWidth = '60px';
        rowEl.appendChild(statusSpacer);
      }

      UI.boardRows.appendChild(rowEl);
    }

    // Scroll active row into view if needed
    const activeRowEl = document.getElementById(`guess-row-${State.currentRowIndex}`);
    if (activeRowEl) {
      activeRowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // ---------------------------------------------------------------------------
  // Input Handling
  // ---------------------------------------------------------------------------
  function selectSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= State.codeLength) return;
    State.selectedSlotIndex = slotIndex;

    // Update socket highlights
    for (let s = 0; s < State.codeLength; s++) {
      const sock = document.getElementById(`socket-${State.currentRowIndex}-${s}`);
      if (sock) {
        sock.classList.toggle('pin-socket--selected', s === slotIndex);
      }
    }
    Utils.sound.play('typewriter');
  }

  function placeSymbolInCurrentSlot(symbolId) {
    if (State.isGameOver) return;
    const slot = State.selectedSlotIndex;

    // Lock permanently decrypted slots
    if (State.revealedSlots && State.revealedSlots[slot] !== undefined) {
      Utils.showToast("Compartment is permanently decrypted and locked.", 2000, 'warning');
      advanceSlotAfterInput(slot);
      return;
    }

    State.currentGuess[slot] = symbolId;
    Utils.sound.play('relay');
    Utils.vibrate([25]);

    // Update visual socket
    const sock = document.getElementById(`socket-${State.currentRowIndex}-${slot}`);
    const sym = getSymbolData(symbolId);
    if (sock && sym) {
      sock.classList.add('pin-socket--filled');
      sock.style.backgroundColor = sym.hex;
      sock.textContent = sym.code;
    }

    // Advance to next open slot or next slot
    advanceSlotAfterInput(slot);

    // Update submit button state
    const submitBtn = document.getElementById('btn-submit-guess');
    if (submitBtn) {
      submitBtn.disabled = !isRowComplete();
    }

    saveState();
  }

  function advanceSlotAfterInput(currentSlot) {
    // Find next unfilled slot that is not permanently decrypted
    let nextUnfilled = -1;
    for (let s = currentSlot + 1; s < State.codeLength; s++) {
      const isLocked = State.revealedSlots && State.revealedSlots[s] !== undefined;
      if (!State.currentGuess[s] && !isLocked) {
        nextUnfilled = s;
        break;
      }
    }
    if (nextUnfilled === -1) {
      for (let s = 0; s < currentSlot; s++) {
        const isLocked = State.revealedSlots && State.revealedSlots[s] !== undefined;
        if (!State.currentGuess[s] && !isLocked) {
          nextUnfilled = s;
          break;
        }
      }
    }

    if (nextUnfilled !== -1) {
      selectSlot(nextUnfilled);
    } else {
      // Find any unlocked slot forward
      let nextUnlocked = -1;
      for (let s = currentSlot + 1; s < State.codeLength; s++) {
        if (!State.revealedSlots || State.revealedSlots[s] === undefined) {
          nextUnlocked = s;
          break;
        }
      }
      if (nextUnlocked === -1) {
        for (let s = 0; s <= currentSlot; s++) {
          if (!State.revealedSlots || State.revealedSlots[s] === undefined) {
            nextUnlocked = s;
            break;
          }
        }
      }
      if (nextUnlocked !== -1) {
        selectSlot(nextUnlocked);
      }
    }
  }

  function clearSelectedSlot() {
    const slot = State.selectedSlotIndex;
    if (State.revealedSlots && State.revealedSlots[slot]) {
      Utils.showToast("Cannot erase confirmed decrypted compartment.", 2000, 'warning');
      return;
    }

    State.currentGuess[slot] = null;
    const sock = document.getElementById(`socket-${State.currentRowIndex}-${slot}`);
    if (sock) {
      sock.classList.remove('pin-socket--filled');
      sock.style.backgroundColor = '';
      sock.textContent = '';
    }

    const submitBtn = document.getElementById('btn-submit-guess');
    if (submitBtn) {
      submitBtn.disabled = true;
    }
    Utils.sound.play('typewriter');
    saveState();
  }

  function isRowComplete() {
    if (!State.currentGuess || State.currentGuess.length < State.codeLength) return false;
    for (let s = 0; s < State.codeLength; s++) {
      if (!State.currentGuess[s]) return false;
    }
    return true;
  }

  function applyRevealedSlotsToCurrentRow() {
    if (!State.revealedSlots) return;
    Object.keys(State.revealedSlots).forEach(sIdx => {
      const idx = parseInt(sIdx, 10);
      if (!State.currentGuess[idx]) {
        State.currentGuess[idx] = State.revealedSlots[idx];
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Submission & Validation Logic
  // ---------------------------------------------------------------------------
  function submitCurrentGuess() {
    if (State.isGameOver || !isRowComplete()) return;

    const guess = [...State.currentGuess];
    const feedback = CipherEngine.evaluateGuess(State.secretCode, guess);

    // Audio & tactile feedback
    Utils.sound.play('stamp');
    Utils.vibrate([40, 50, 40]);

    // Save to history
    State.history.push({
      guess,
      feedback
    });

    // Check Win Condition
    if (feedback.exact === State.codeLength) {
      handleVictory();
      return;
    }

    // Check Defeat / Out of attempts
    if (State.history.length >= State.maxAttempts) {
      handleDefeat();
      return;
    }

    // Move to next row
    State.currentRowIndex++;
    State.currentGuess = new Array(State.codeLength).fill(null);
    applyRevealedSlotsToCurrentRow();

    // Default selection to first unrevealed slot
    let firstSlot = 0;
    while (firstSlot < State.codeLength && State.currentGuess[firstSlot]) {
      firstSlot++;
    }
    State.selectedSlotIndex = firstSlot < State.codeLength ? firstSlot : 0;

    renderBoard();
    saveState();
  }

  // ---------------------------------------------------------------------------
  // Mission Outcome Handlers
  // ---------------------------------------------------------------------------
  function handleVictory() {
    State.isGameOver = true;
    if (State.timer) State.timer.pause();

    // Reveal all vault pins
    renderVaultSlots();
    renderBoard();

    Utils.sound.play('vault');
    Utils.vibrate([100, 50, 100, 50, 200]);

    // Update Progress and Stats
    const rowsUsed = State.history.length;
    const finalElapsed = State.elapsed;
    const stats = Progress.recordMissionResult(true, State.difficulty, finalElapsed, rowsUsed);
    Progress.clearActiveGame();

    // Populate Victory Modal
    if (UI.modalTime) UI.modalTime.textContent = formatTime(finalElapsed);
    if (UI.modalRows) UI.modalRows.textContent = `${rowsUsed} / ${State.maxAttempts}`;
    if (UI.modalStreak) UI.modalStreak.textContent = `${stats.currentStreak} in a row`;

    // Check if new record
    if (UI.modalRecordBadge) {
      const isBestTime = stats.bestTimes[State.difficulty] === finalElapsed;
      const isBestRows = stats.bestRows[State.difficulty] === rowsUsed;
      if (isBestTime || isBestRows) {
        UI.modalRecordBadge.style.display = 'inline-block';
        UI.modalRecordBadge.textContent = '★ NEW CLEARANCE RECORD ★';
      } else {
        UI.modalRecordBadge.style.display = 'none';
      }
    }

    if (UI.victoryModal) {
      setTimeout(() => {
        UI.victoryModal.classList.add('modal-backdrop--open');
      }, 500);
    }
  }

  function handleDefeat() {
    State.isGameOver = true;
    if (State.timer) State.timer.pause();

    // Reveal vault pins to reveal answer
    renderVaultSlots();
    renderBoard();

    Utils.sound.play('compromised');
    Utils.vibrate([300, 100, 300]);

    Progress.recordMissionResult(false, State.difficulty, State.elapsed, State.maxAttempts);
    Progress.clearActiveGame();

    if (UI.failureModal) {
      setTimeout(() => {
        UI.failureModal.classList.add('modal-backdrop--open');
      }, 600);
    }
  }

  // ---------------------------------------------------------------------------
  // Tactical Equipment Power-ups
  // ---------------------------------------------------------------------------
  function useDecryptor() {
    if (State.isGameOver) return;

    // Check if any slot remains unrevealed
    const unrevealedIdx = CipherEngine.findUnrevealedSlot(State.codeLength, State.revealedSlots);
    if (unrevealedIdx === null) {
      Utils.showToast("All secret compartments have already been decrypted!", 2500, 'warning');
      return;
    }

    if (Progress.getItemCount('decryptors') <= 0) {
      Utils.showToast("No Signal Decryptors available! The morning refill restores these.", 2500, 'warning');
      return;
    }

    Progress.useItem('decryptors');
    updateEquipmentBadges();

    const targetSymbol = State.secretCode[unrevealedIdx];
    State.revealedSlots[unrevealedIdx] = targetSymbol;
    State.currentGuess[unrevealedIdx] = targetSymbol;

    Utils.sound.play('decrypt');
    Utils.vibrate([60, 40, 80]);

    const sym = getSymbolData(targetSymbol);
    Utils.showToast(`DECRYPTOR ONLINE: Compartment #${unrevealedIdx + 1} locked to ${sym.label.toUpperCase()} (${sym.code})`, 3500, 'success');

    renderVaultSlots();
    renderBoard();
    saveState();
  }

  function useFilter() {
    if (State.isGameOver) return;

    if (Progress.getItemCount('filters') <= 0) {
      Utils.showToast("No Frequency Filters available! The morning refill restores these.", 2500, 'warning');
      return;
    }

    const availablePool = State.poolSymbols.map(s => s.id);
    const toFilter = CipherEngine.findSymbolsToFilter(State.secretCode, availablePool, new Set(State.filteredSymbols));

    if (toFilter.length === 0) {
      Utils.showToast("All remaining frequencies exist within the classified code!", 3000, 'info');
      return;
    }

    Progress.useItem('filters');
    updateEquipmentBadges();

    toFilter.forEach(symId => {
      State.filteredSymbols.push(symId);
      // If current guess had this symbol, clear it
      for (let s = 0; s < State.codeLength; s++) {
        if (State.currentGuess[s] === symId && !State.revealedSlots[s]) {
          State.currentGuess[s] = null;
        }
      }
    });

    Utils.sound.play('filter');
    Utils.vibrate([40, 60, 40]);

    const count = toFilter.length;
    const names = toFilter.map(id => getSymbolData(id).label).join(' & ');
    Utils.showToast(`FILTER APPLIED: Eliminated ${count} non-code ${count === 1 ? 'frequency' : 'frequencies'} [${names}]`, 3500, 'info');

    renderPalette();
    renderBoard();
    saveState();
  }

  function useRewind() {
    if (State.isGameOver) return;

    if (Progress.getItemCount('rewinds') <= 0) {
      Utils.showToast("No Magnetic Tape Rewinds in cache! The morning refill restores these.", 2500, 'warning');
      return;
    }

    Progress.useItem('rewinds');
    updateEquipmentBadges();

    State.maxAttempts += 2;
    Utils.sound.play('rewind');
    Utils.vibrate([50, 80, 100]);
    Utils.showToast(`TAPE SPOOLED BACK: +2 Extra Guess Attempts Added!`, 3500, 'success');

    renderBoard();
    saveState();
  }

  function useProbe() {
    if (State.isGameOver) return;

    if (!State.history || State.history.length === 0) {
      Utils.showToast("No previous rows transmitted yet to cross-examine.", 2500, 'info');
      return;
    }

    if (!isRowComplete()) {
      Utils.showToast("Fill all pin sockets on current row before running Logic Probe.", 2500, 'warning');
      return;
    }

    if (Progress.getItemCount('probes') <= 0) {
      Utils.showToast("No Logic Probes available! The morning refill restores these.", 2500, 'warning');
      return;
    }

    Progress.useItem('probes');
    updateEquipmentBadges();

    const check = CipherEngine.validateGuessConsistency(State.currentGuess, State.history);
    Utils.sound.play('probe');

    if (check.consistent) {
      Utils.vibrate([60, 40, 60]);
      Utils.showToast("PROBE VERIFIED: Current row is 100% consistent with all previous clues!", 3500, 'success');
    } else {
      Utils.vibrate([150, 50, 150]);
      Utils.showToast(`CONTRADICTION DETECTED: Violates feedback from Row ${check.rowNumber}!`, 4500, 'warning');
    }

    saveState();
  }

  // Bind Equipment Buttons
  if (UI.btnEquipDecrypt) UI.btnEquipDecrypt.addEventListener('click', useDecryptor);
  if (UI.btnEquipFilter)  UI.btnEquipFilter.addEventListener('click', useFilter);
  if (UI.btnEquipRewind)  UI.btnEquipRewind.addEventListener('click', useRewind);
  if (UI.btnEquipProbe)   UI.btnEquipProbe.addEventListener('click', useProbe);

  // ---------------------------------------------------------------------------
  // Keyboard Shortcuts
  // ---------------------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    if (State.isGameOver) return;

    // Number keys 1-8 for palette selection
    if (/^[1-8]$/.test(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < State.poolSymbols.length) {
        const sym = State.poolSymbols[idx];
        if (!State.filteredSymbols.includes(sym.id)) {
          placeSymbolInCurrentSlot(sym.id);
        }
      }
      return;
    }

    // Arrow navigation
    if (e.key === 'ArrowLeft') {
      if (State.selectedSlotIndex > 0) selectSlot(State.selectedSlotIndex - 1);
      return;
    }
    if (e.key === 'ArrowRight') {
      if (State.selectedSlotIndex < State.codeLength - 1) selectSlot(State.selectedSlotIndex + 1);
      return;
    }

    // Delete / Backspace
    if (e.key === 'Backspace' || e.key === 'Delete') {
      clearSelectedSlot();
      return;
    }

    // Enter to submit
    if (e.key === 'Enter') {
      if (isRowComplete()) {
        submitCurrentGuess();
      }
      return;
    }
  });

  // ---------------------------------------------------------------------------
  // State Persistence & Safe Navigation
  // ---------------------------------------------------------------------------
  function saveState() {
    if (State.isGameOver) return;
    Progress.saveActiveGame({
      difficulty: State.difficulty,
      codeLength: State.codeLength,
      poolSize: State.poolSize,
      allowDuplicates: State.allowDuplicates,
      maxAttempts: State.maxAttempts,
      secretCode: State.secretCode,
      history: State.history,
      currentRowIndex: State.currentRowIndex,
      currentGuess: State.currentGuess,
      revealedSlots: State.revealedSlots,
      filteredSymbols: State.filteredSymbols,
      elapsed: State.elapsed,
      isGameOver: false
    });
  }

  // Bind Base & Navigation links
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

  function getNextMissionUrl() {
    if (State.difficulty === 'custom') {
      const dup = State.allowDuplicates ? '1' : '0';
      return `game.html?diff=custom&len=${State.codeLength}&pool=${State.poolSize}&dup=${dup}&att=${State.maxAttempts}`;
    }
    return `game.html?diff=${State.difficulty}`;
  }

  // Modal Action Listeners
  if (UI.btnVictoryNext) {
    UI.btnVictoryNext.addEventListener('click', () => {
      window.location.href = getNextMissionUrl();
    });
  }
  if (UI.btnVictoryMenu) {
    UI.btnVictoryMenu.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
  if (UI.btnFailureRetry) {
    UI.btnFailureRetry.addEventListener('click', () => {
      window.location.href = getNextMissionUrl();
    });
  }
  if (UI.btnFailureMenu) {
    UI.btnFailureMenu.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  // Kickoff Mission
  initGame();
});
