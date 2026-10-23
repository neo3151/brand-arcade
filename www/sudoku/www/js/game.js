/**
 * game.js
 * Core game logic: board rendering, state management, controls,
 * undo stack, notes mode, mistake tracking, hints (two-tap UX),
 * in-progress state persistence, and mistake recovery.
 */

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MISTAKE_LIMITS = {
  beginner: 7,
  easy:     5,
  medium:   4,
  hard:     3,
  master:   1,
};

const MAX_LEVELS = 1000;

// ---------------------------------------------------------------------------
// Game State
// ---------------------------------------------------------------------------
const State = {
  difficulty:    null,
  level:         null,
  puzzle:        null,   // original puzzle (immutable)
  solution:      null,   // full solution
  board:         null,   // current player board
  notes:         null,   // 81-element array of Sets (pencil marks)
  selected:      null,   // currently selected cell index
  notesMode:     false,
  mistakes:      0,
  mistakeLimit:  3,
  hintsUsed:     0,
  timer:         null,
  undoStack:     [],
  hintState:     null,   // null | { phase: 1|2, hint: object }
  gameOver:      false,
  won:           false,
  gameOverTimer: null,
};

// ---------------------------------------------------------------------------
// Initialise game
// ---------------------------------------------------------------------------
function initGame() {
  const params = window.Utils.getParams();
  State.difficulty = params.difficulty || 'beginner';
  State.level      = parseInt(params.level, 10) || 1;
  State.mistakeLimit = MISTAKE_LIMITS[State.difficulty] || 3;

  const isContinue = params.continue === '1' || params.continue === 'true';
  const active = isContinue ? window.Progress.getActiveGame() : null;

  let puzzle, solution;
  let initialElapsed = 0;

  if (active && active.difficulty === State.difficulty && active.level === State.level &&
      Array.isArray(active.puzzle) && Array.isArray(active.solution)) {
    // Instant restore without re-running generator (0ms load!)
    puzzle = active.puzzle;
    solution = active.solution;
    State.board     = [...active.board];
    State.notes     = active.notes ? active.notes.map(arr => new Set(arr)) : Array.from({ length: 81 }, () => new Set());
    State.undoStack = active.undoStack ? active.undoStack.map(a => ({
                        ...a,
                        prevNotes: new Set(a.prevNotes || [])
                      })) : [];
    State.mistakes  = typeof active.mistakes === 'number' ? active.mistakes : 0;
    State.hintsUsed = typeof active.hintsUsed === 'number' ? active.hintsUsed : 0;
    State.notesMode = !!active.notesMode;
    initialElapsed  = active.timer || 0;
  } else {
    // Generate fresh puzzle
    const result = window.SudokuGen.generatePuzzle(State.difficulty, State.level);
    puzzle   = result.puzzle;
    solution = result.solution;
    State.board     = [...puzzle];
    State.notes     = Array.from({ length: 81 }, () => new Set());
    State.undoStack = [];
    State.mistakes  = 0;
    State.hintsUsed = 0;
    State.notesMode = false;
  }

  State.puzzle    = puzzle;
  State.solution  = solution;
  State.selected  = null;
  State.hintState = null;
  State.gameOver  = false;
  State.won       = false;
  State.gameOverTimer = null;

  // Header info
  document.getElementById('difficulty-badge').textContent =
    window.Utils.formatDifficulty(State.difficulty);
  document.getElementById('level-num').textContent = `Level ${State.level}`;
  updateMistakesDisplay();
  updateHintBtn();
  renderBoard();
  startTimer(initialElapsed);

  // Sync undo button UI
  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) undoBtn.disabled = State.undoStack.length === 0;

  // Sync notes button UI
  const notesBtn = document.getElementById('notes-btn');
  if (notesBtn) {
    notesBtn.classList.toggle('btn--active', State.notesMode);
    notesBtn.setAttribute('aria-pressed', State.notesMode);
    const label = notesBtn.querySelector('.btn-label');
    if (label) label.textContent = State.notesMode ? 'Notes ON' : 'Notes';
  }

  // Pause on tab switch & save state on hide
  window.Utils.onVisibilityChange(
    () => {
      saveCurrentGameState();
      State.timer && State.timer.pause();
    },
    () => {
      State.timer && !State.gameOver && !State.won && State.timer.resume();
    }
  );

  window.addEventListener('beforeunload', saveCurrentGameState);
}

// ---------------------------------------------------------------------------
// Save in-progress state
// ---------------------------------------------------------------------------
function saveCurrentGameState() {
  if (State.gameOver || State.won || !State.board) return;
  window.Progress.saveActiveGame({
    difficulty: State.difficulty,
    level:      State.level,
    puzzle:     State.puzzle,
    solution:   State.solution,
    board:      State.board,
    notes:      State.notes ? State.notes.map(s => [...s]) : [],
    undoStack:  State.undoStack ? State.undoStack.map(a => ({
                  ...a,
                  prevNotes: a.prevNotes ? [...a.prevNotes] : []
                })) : [],
    mistakes:   State.mistakes,
    hintsUsed:  State.hintsUsed,
    timer:      State.timer ? State.timer.elapsed : 0,
    notesMode:  State.notesMode,
  });
}

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------
function startTimer(initialElapsed = 0) {
  State.timer = new window.Utils.GameTimer(seconds => {
    const el = document.getElementById('timer');
    if (el) el.textContent = window.Utils.formatTime(seconds);
  }, initialElapsed);
  State.timer.start();
}

// ---------------------------------------------------------------------------
// Board Rendering
// ---------------------------------------------------------------------------
function renderBoard() {
  const board = document.getElementById('sudoku-board');
  if (!board) return;
  board.innerHTML = '';

  for (let pos = 0; pos < 81; pos++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.pos = pos;

    const row = Math.floor(pos / 9);
    const col = pos % 9;

    // Box border helpers
    if (row % 3 === 0) cell.classList.add('cell--box-top');
    if (col % 3 === 0) cell.classList.add('cell--box-left');
    if (row % 3 === 2) cell.classList.add('cell--box-bottom');
    if (col % 3 === 2) cell.classList.add('cell--box-right');

    if (State.puzzle[pos] !== 0) {
      cell.classList.add('cell--given');
    }

    updateCellDOM(cell, pos);
    cell.addEventListener('click', () => selectCell(pos));
    board.appendChild(cell);
  }
}

function updateCellDOM(cell, pos) {
  if (typeof cell === 'number') {
    pos = cell;
    cell = document.querySelector(`[data-pos="${pos}"]`);
  }
  if (!cell) return;

  const val = State.board[pos];
  const notes = State.notes[pos];
  const isGiven = State.puzzle[pos] !== 0;

  cell.innerHTML = '';
  // Preserve cell--given; remove transient state classes
  cell.classList.remove('cell--error', 'cell--filled', 'cell--note', 'cell--selected',
                         'cell--highlight', 'cell--same-num', 'cell--hint-region',
                         'cell--hint-target');

  if (isGiven) cell.classList.add('cell--given');

  if (val !== 0) {
    // Only player filled entries get cell--filled so clues always stay dark
    if (!isGiven) {
      cell.classList.add('cell--filled');
    }
    const numEl = document.createElement('span');
    numEl.className = 'cell__number';
    numEl.textContent = val;
    cell.appendChild(numEl);

    // Check correctness (only player entered numbers can error)
    if (!isGiven && val !== State.solution[pos]) {
      cell.classList.add('cell--error');
    }
  } else if (notes && notes.size > 0) {
    cell.classList.add('cell--note');
    const grid = document.createElement('div');
    grid.className = 'notes-grid';
    for (let n = 1; n <= 9; n++) {
      const noteEl = document.createElement('span');
      noteEl.className = 'note-num';
      noteEl.textContent = notes.has(n) ? n : '';
      grid.appendChild(noteEl);
    }
    cell.appendChild(grid);
  }
}

// ---------------------------------------------------------------------------
// Cell Selection & Highlighting
// ---------------------------------------------------------------------------
function selectCell(pos) {
  // Clear hint state visual when user taps elsewhere
  if (State.hintState) {
    clearHintHighlights();
  }

  State.selected = pos;
  refreshHighlights();
}

function refreshHighlights() {
  const pos = State.selected;
  if (pos === null) {
    document.querySelectorAll('.cell').forEach(cell => {
      cell.classList.remove('cell--selected', 'cell--highlight', 'cell--same-num',
                             'cell--hint-region', 'cell--hint-target');
    });
    return;
  }

  const val = State.board[pos];
  const cells = document.querySelectorAll('.cell');

  cells.forEach(cell => {
    const p = parseInt(cell.dataset.pos, 10);
    cell.classList.remove('cell--selected', 'cell--highlight', 'cell--same-num',
                           'cell--hint-region', 'cell--hint-target');

    if (p === pos) {
      cell.classList.add('cell--selected');
      return;
    }

    // Highlight same row, col, box
    const sameRow = Math.floor(p / 9) === Math.floor(pos / 9);
    const sameCol = (p % 9) === (pos % 9);
    const sameBox = Math.floor(Math.floor(p / 9) / 3) === Math.floor(Math.floor(pos / 9) / 3) &&
                    Math.floor((p % 9) / 3) === Math.floor((pos % 9) / 3);

    if (sameRow || sameCol || sameBox) {
      cell.classList.add('cell--highlight');
    }

    // Highlight matching numbers
    if (val !== 0 && State.board[p] === val) {
      cell.classList.add('cell--same-num');
    }
  });

  // Re-apply hint highlights on top if active
  if (State.hintState) applyHintHighlights(State.hintState.hint);
}

// ---------------------------------------------------------------------------
// Number Input
// ---------------------------------------------------------------------------
function inputNumber(num) {
  if (State.gameOver || State.won) return;
  // If at mistake limit, lock input during grace window — only Undo or Erase allowed!
  if (State.mistakes >= State.mistakeLimit) return;
  const pos = State.selected;
  if (pos === null) return;
  if (State.puzzle[pos] !== 0) return; // can't edit given cells

  if (State.notesMode) {
    // Don't take notes on filled cell
    if (State.board[pos] !== 0) return;
    inputNote(pos, num);
  } else {
    inputValue(pos, num);
  }
}

function inputValue(pos, num) {
  if (State.mistakes >= State.mistakeLimit) return;

  const prev = State.board[pos];
  const prevNotes = new Set(State.notes[pos]);

  // Same-number tap = erase
  if (prev === num) {
    eraseCell();
    return;
  }

  const isMistake = num !== 0 && num !== State.solution[pos];
  const clearedNotes = [];

  // Auto-clear notes in row, column, box if placement is correct
  if (num !== 0 && !isMistake) {
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    const peers = new Set();
    for (let i = 0; i < 9; i++) {
      peers.add(r * 9 + i);
      peers.add(i * 9 + c);
      peers.add((br + Math.floor(i / 3)) * 9 + bc + (i % 3));
    }
    peers.delete(pos);

    peers.forEach(p => {
      if (State.notes[p] && State.notes[p].has(num)) {
        clearedNotes.push({ pos: p, note: num });
        State.notes[p].delete(num);
        updateCellDOM(p);
      }
    });
  }

  // Push to undo stack
  pushUndo({ type: 'value', pos, prev, prevNotes, clearedNotes, wasMistake: isMistake });

  State.board[pos] = num;
  State.notes[pos].clear();

  const cell = document.querySelector(`[data-pos="${pos}"]`);
  updateCellDOM(cell, pos);

  // Check mistake
  if (isMistake) {
    State.mistakes++;
    updateMistakesDisplay();
    window.Utils.vibrate([100, 50, 100]);

    if (State.mistakes >= State.mistakeLimit) {
      if (State.gameOverTimer) clearTimeout(State.gameOverTimer);
      // Give 1.2s delay before committing game over so player can undo last-life mistake
      State.gameOverTimer = setTimeout(showGameOver, 1200);
    } else {
      window.Utils.showToast(`❌ Mistake! ${State.mistakeLimit - State.mistakes} remaining.`, 2000, 'error');
    }
  }

  refreshHighlights();
  saveCurrentGameState();

  // Check win — only if no error cells remain
  const hasErrors = State.board.some((v, i) => v !== 0 && v !== State.solution[i]);
  if (!hasErrors && State.board.every((v, i) => v === State.solution[i])) {
    setTimeout(showVictory, 500);
  }
}

function inputNote(pos, num) {
  if (State.board[pos] !== 0) return;

  const prevNotes = new Set(State.notes[pos]);
  pushUndo({ type: 'note', pos, prevNotes, wasMistake: false });

  if (State.notes[pos].has(num)) {
    State.notes[pos].delete(num);
  } else {
    State.notes[pos].add(num);
  }

  const cell = document.querySelector(`[data-pos="${pos}"]`);
  updateCellDOM(cell, pos);
  refreshHighlights();
  saveCurrentGameState();
}

function eraseCell() {
  if (State.gameOver || State.won) return;
  const pos = State.selected;
  if (pos === null) return;
  if (State.puzzle[pos] !== 0) return;

  const prev = State.board[pos];
  const prevNotes = new Set(State.notes[pos]);

  if (prev === 0 && prevNotes.size === 0) return;

  pushUndo({ type: 'erase', pos, prev, prevNotes, wasMistake: false });

  State.board[pos] = 0;
  State.notes[pos].clear();

  const cell = document.querySelector(`[data-pos="${pos}"]`);
  updateCellDOM(cell, pos);
  refreshHighlights();
  saveCurrentGameState();
}

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------
function pushUndo(action) {
  State.undoStack.push(action);
  if (State.undoStack.length > 200) State.undoStack.shift();
  document.getElementById('undo-btn').disabled = false;
}

function undo() {
  if (State.won) return;

  // Cancel any pending game-over timer
  if (State.gameOverTimer) {
    clearTimeout(State.gameOverTimer);
    State.gameOverTimer = null;
  }

  // If game-over modal is open, only allow undo if the top action was a mistake
  if (State.gameOver) {
    const last = State.undoStack[State.undoStack.length - 1];
    if (!last || !last.wasMistake) return;
  }

  const action = State.undoStack.pop();
  if (!action) return;

  const { type, pos, prev, prevNotes, clearedNotes, wasMistake } = action;

  if (type === 'value' || type === 'erase') {
    State.board[pos] = prev;
    State.notes[pos] = prevNotes || new Set();
    // Restore auto-cleared peer notes
    if (clearedNotes && clearedNotes.length > 0) {
      clearedNotes.forEach(cn => {
        State.notes[cn.pos].add(cn.note);
        updateCellDOM(cn.pos);
      });
    }
  } else if (type === 'note') {
    State.notes[pos] = prevNotes;
    State.board[pos] = 0;
  }

  // Restore mistake count & recover from game over if mistake was undone
  if (wasMistake) {
    if (State.mistakes > 0) State.mistakes--;
    updateMistakesDisplay();
    if (State.gameOver) {
      State.gameOver = false;
      const modal = document.getElementById('gameover-modal');
      if (modal) modal.classList.remove('modal--visible');
      if (State.timer) State.timer.resume();
    }
  }

  const cell = document.querySelector(`[data-pos="${pos}"]`);
  updateCellDOM(cell, pos);
  refreshHighlights();
  saveCurrentGameState();

  if (State.undoStack.length === 0) {
    document.getElementById('undo-btn').disabled = true;
  }
}

// ---------------------------------------------------------------------------
// Notes Mode Toggle
// ---------------------------------------------------------------------------
function toggleNotesMode() {
  State.notesMode = !State.notesMode;
  const btn = document.getElementById('notes-btn');
  if (btn) {
    btn.classList.toggle('btn--active', State.notesMode);
    btn.setAttribute('aria-pressed', State.notesMode);
    const label = btn.querySelector('.btn-label');
    if (label) label.textContent = State.notesMode ? 'Notes ON' : 'Notes';
  }
  saveCurrentGameState();
}

// ---------------------------------------------------------------------------
// Hints (two-tap UX)
// ---------------------------------------------------------------------------
function updateHintBtn() {
  const hints = window.Progress.getHints();
  const btn = document.getElementById('hint-btn');
  if (!btn) return;
  const badge = btn.querySelector('.hint-count');
  if (badge) badge.textContent = hints;
  btn.disabled = false;
}

function handleHintTap() {
  if (State.gameOver || State.won) return;

  const { getHints, useHint } = window.Progress;
  const { getBestHint } = window.HintEngine;
  const { showToast } = window.Utils;

  // Phase 2: already showing hint — reveal the move
  if (State.hintState && State.hintState.phase === 1) {
    revealHintMove();
    return;
  }

  const hint = getBestHint(State.board, State.solution);
  if (!hint) {
    showToast('The puzzle is already solved!', 2000, 'success');
    return;
  }

  // Free hint for error detection
  if (hint.isError) {
    showToast(hint.shortExplanation, 3000, 'error');
    showHintPanel(hint, true);
    applyHintHighlights(hint);
    return;
  }

  // Elimination hints are free explanation hints
  if (hint.isElimination) {
    showHintPanel(hint, true);
    applyHintHighlights(hint);
    State.hintState = { phase: 2, hint };
    return;
  }

  // Only charge when highlighting a real fill move (targetCell + value)
  if (getHints() <= 0) {
    showToast('No hints left. The morning refill restores them. <a href="store.html">Daily Supply →</a>', 3000, 'warning');
    return;
  }

  const spent = useHint();
  if (!spent) {
    showToast('No hints available.', 2000, 'warning');
    return;
  }

  State.hintsUsed++;
  State.hintState = { phase: 1, hint };
  updateHintBtn();

  showHintPanel(hint, false);
  applyHintHighlights(hint);
}

function revealHintMove() {
  if (!State.hintState) return;
  const { hint } = State.hintState;
  State.hintState = { phase: 2, hint };

  showHintPanel(hint, true);

  if (hint.targetCell !== null) {
    const targetEl = document.querySelector(`[data-pos="${hint.targetCell}"]`);
    if (targetEl) targetEl.classList.add('cell--hint-target');

    State.selected = hint.targetCell;
    refreshHighlights();
    if (targetEl) targetEl.classList.add('cell--hint-target');
  }
}

function applyHintHighlights(hint) {
  clearHintHighlights();
  if (!hint) return;
  hint.highlightPositions.forEach(pos => {
    const cell = document.querySelector(`[data-pos="${pos}"]`);
    if (cell) cell.classList.add('cell--hint-region');
  });
}

function clearHintHighlights() {
  document.querySelectorAll('.cell--hint-region, .cell--hint-target')
    .forEach(c => c.classList.remove('cell--hint-region', 'cell--hint-target'));
}

function showHintPanel(hint, revealed) {
  const panel = document.getElementById('hint-panel');
  if (!panel) return;

  panel.classList.add('hint-panel--visible');
  const techEl = document.getElementById('hint-technique-label');
  const expEl  = document.getElementById('hint-explanation-text');
  if (techEl) techEl.textContent = hint.technique;
  if (expEl)  expEl.innerHTML   = revealed ? hint.explanation : hint.shortExplanation;

  const revealBtn = panel.querySelector('#reveal-btn');
  if (revealBtn) {
    revealBtn.style.display = (revealed || hint.targetCell === null) ? 'none' : 'block';
    revealBtn.textContent = 'Reveal the Move';
  }
}

function dismissHintPanel() {
  const panel = document.getElementById('hint-panel');
  if (panel) panel.classList.remove('hint-panel--visible');
  clearHintHighlights();
  State.hintState = null;
}

// ---------------------------------------------------------------------------
// Mistakes display
// ---------------------------------------------------------------------------
function updateMistakesDisplay() {
  const el = document.getElementById('mistakes-display');
  if (!el) return;
  const hearts = [];
  for (let i = 0; i < State.mistakeLimit; i++) {
    hearts.push(i < State.mistakes ? '🖤' : '❤️');
  }
  el.innerHTML = hearts.join('');
  el.title = `${State.mistakes} / ${State.mistakeLimit} mistakes`;
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------
function showGameOver() {
  State.gameOver = true;
  if (State.timer) State.timer.pause();
  const modal = document.getElementById('gameover-modal');
  if (!modal) return;
  modal.querySelector('.modal__level').textContent =
    `${window.Utils.formatDifficulty(State.difficulty)} — Level ${State.level}`;
  modal.classList.add('modal--visible');
  window.Utils.vibrate([200, 100, 200, 100, 400]);
}

function showVictory() {
  State.won = true;
  if (State.timer) State.timer.pause();
  window.Progress.completeLevel(State.difficulty, State.level, State.timer.elapsed);
  window.Progress.clearActiveGame();

  const modal = document.getElementById('victory-modal');
  if (!modal) return;
  modal.querySelector('.victory-time').textContent =
    window.Utils.formatTime(State.timer.elapsed);
  modal.querySelector('.victory-mistakes').textContent = State.mistakes;
  modal.querySelector('.victory-hints').textContent = State.hintsUsed;
  modal.querySelector('.victory-level').textContent =
    `${window.Utils.formatDifficulty(State.difficulty)} — Level ${State.level}`;

  // Best time badge
  const best = window.Progress.getBestTime(State.difficulty, State.level);
  const bestEl = modal.querySelector('.victory-best');
  if (bestEl) {
    bestEl.textContent = best ? `Best: ${window.Utils.formatTime(best)}` : '';
  }

  modal.classList.add('modal--visible');
  launchConfetti();
  window.Utils.vibrate([100, 50, 100, 50, 200]);
}

// ---------------------------------------------------------------------------
// Navigation from modals
// ---------------------------------------------------------------------------
function nextPuzzle() {
  window.Progress.clearActiveGame();
  const nextLevel = State.level < MAX_LEVELS ? State.level + 1 : 1;
  window.location.href = `game.html?difficulty=${State.difficulty}&level=${nextLevel}`;
}

function retryPuzzle() {
  window.Progress.clearActiveGame();
  window.location.href = `game.html?difficulty=${State.difficulty}&level=${State.level}`;
}

function goHome() {
  saveCurrentGameState();
  window.location.href = 'index.html';
}

// ---------------------------------------------------------------------------
// Confetti (CSS-based)
// ---------------------------------------------------------------------------
function launchConfetti() {
  const colors = ['#2563eb', '#3b82f6', '#60a5fa', '#fbbf24', '#34d399', '#f472b6'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}vw;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay: ${Math.random() * 1}s;
      animation-duration: ${1.5 + Math.random() * 1.5}s;
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

// ---------------------------------------------------------------------------
// Wire up controls
// ---------------------------------------------------------------------------
function bindControls() {
  // Number pad
  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const num = parseInt(btn.dataset.num, 10);
      inputNumber(num);
    });
  });

  // Undo
  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) {
    undoBtn.disabled = State.undoStack.length === 0;
    undoBtn.addEventListener('click', undo);
  }

  // Erase
  const eraseBtn = document.getElementById('erase-btn');
  if (eraseBtn) eraseBtn.addEventListener('click', eraseCell);

  // Notes
  const notesBtn = document.getElementById('notes-btn');
  if (notesBtn) notesBtn.addEventListener('click', toggleNotesMode);

  // Hint
  const hintBtn = document.getElementById('hint-btn');
  if (hintBtn) hintBtn.addEventListener('click', handleHintTap);

  // Reveal button in hint panel
  const revealBtn = document.getElementById('reveal-btn');
  if (revealBtn) revealBtn.addEventListener('click', revealHintMove);

  // Close hint panel
  const closeHint = document.getElementById('close-hint-btn');
  if (closeHint) closeHint.addEventListener('click', dismissHintPanel);

  // Modals
  document.getElementById('next-btn')?.addEventListener('click', nextPuzzle);
  document.getElementById('home-btn')?.addEventListener('click', goHome);
  document.getElementById('gameover-undo-btn')?.addEventListener('click', undo);
  document.getElementById('gameover-home-btn')?.addEventListener('click', goHome);
  document.getElementById('gameover-retry-btn')?.addEventListener('click', retryPuzzle);

  // Back button
  document.getElementById('back-btn')?.addEventListener('click', goHome);

  // Keyboard support
  document.addEventListener('keydown', handleKeyboard);
}

function handleKeyboard(e) {
  if (e.key === 'Escape') {
    const hintPanel = document.getElementById('hint-panel');
    if (hintPanel && hintPanel.classList.contains('hint-panel--visible')) {
      dismissHintPanel();
      return;
    }
  }

  // Allow undo via Ctrl+Z even if game over
  if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    undo();
    return;
  }

  if (State.gameOver || State.won) return;

  if (e.key >= '1' && e.key <= '9') {
    inputNumber(parseInt(e.key, 10));
  } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
    eraseCell();
  } else if (e.key === 'n') {
    toggleNotesMode();
  } else if (e.key === 'ArrowRight') {
    moveSelection(1);
  } else if (e.key === 'ArrowLeft') {
    moveSelection(-1);
  } else if (e.key === 'ArrowDown') {
    moveSelection(9);
  } else if (e.key === 'ArrowUp') {
    moveSelection(-9);
  }
}

function moveSelection(delta) {
  const cur = State.selected !== null ? State.selected : 0;
  const next = Math.max(0, Math.min(80, cur + delta));
  selectCell(next);
  document.querySelector(`[data-pos="${next}"]`)?.scrollIntoView({ block: 'nearest' });
}

// ---------------------------------------------------------------------------
// DOMContentLoaded
// ---------------------------------------------------------------------------
window.ArcadeIslandHooks = {
  togglePause() {
    if (!State.timer || State.gameOver || State.won) return false;
    if (State.timer.running) State.timer.pause();
    else State.timer.resume();
    const el = document.getElementById('timer');
    if (el && el.dataset) el.dataset.paused = State.timer.running ? '' : '1';
    return !State.timer.running;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initGame();
  bindControls();
});
