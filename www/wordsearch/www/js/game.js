/**
 * game.js — Word Search game logic
 * Handles grid rendering, bidirectional tap + drag word selection,
 * hint system, active game state persistence, and victory flow.
 */
'use strict';

// ── State ────────────────────────────────────────────────────────────────────
const State = {
  category:    null,
  difficulty:  null,
  level:       null,
  grid:        null,   // 2D array of letters
  size:        0,
  words:       [],     // all words to find (sorted A-Z)
  placed:      [],     // [{word,row,col,dr,dc}]
  found:       new Set(),
  timer:       null,
  hintsUsed:   0,
  won:         false,
  // Selection state
  selecting:   false,
  startCell:   null,   // {row, col}
  currentCell: null,   // {row, col}
  // Tap-mode (first tap remembered, second tap completes)
  tapFirst:    null,
};

// ── Category / difficulty metadata ──────────────────────────────────────────
const CATEGORY_META = {
  animals:    { label: 'Animals',          icon: '🐾' },
  sports:     { label: 'Sports',           icon: '⚽' },
  food:       { label: 'Food & Cooking',   icon: '🍕' },
  science:    { label: 'Science',          icon: '🔬' },
  geography:  { label: 'Geography',        icon: '🌍' },
  movies:     { label: 'Movies & TV',      icon: '🎬' },
  music:      { label: 'Music',            icon: '🎵' },
  history:    { label: 'History',          icon: '🏛️' },
  space:      { label: 'Space',            icon: '🚀' },
  nature:     { label: 'Nature & Plants',  icon: '🌿' },
  holidays:   { label: 'Holidays',         icon: '🎄' },
  health:     { label: 'Body & Health',    icon: '💪' },
  jobs:       { label: 'Jobs & Careers',   icon: '💼' },
  technology: { label: 'Technology',       icon: '💻' },
  colors:     { label: 'Colors & Shapes',  icon: '🎨' },
};

// ── Init ─────────────────────────────────────────────────────────────────────
function initGame() {
  const params    = window.Utils.getParams();
  State.category   = params.category   || 'animals';
  State.difficulty = params.difficulty || 'beginner';
  State.level      = parseInt(params.level, 10) || 1;

  const isContinue = params.continue === '1' || params.continue === 'true';
  const active = isContinue ? window.Progress.getActiveGame() : null;

  let initialElapsed = 0;

  if (active && active.category === State.category &&
      active.difficulty === State.difficulty && active.level === State.level &&
      Array.isArray(active.grid) && Array.isArray(active.words)) {
    // Instant restore without re-generating (0ms load!)
    State.grid      = active.grid;
    State.size      = active.size;
    State.words     = active.words;
    State.placed    = active.placed || [];
    State.found     = Array.isArray(active.found) ? new Set(active.found) : new Set();
    State.hintsUsed = active.hintsUsed || 0;
    initialElapsed  = active.timer || 0;
  } else {
    // Fresh game: discard any previous active game
    if (!isContinue) {
      window.Progress.clearActiveGame();
    }
    const { generatePuzzle } = window.WSGen;
    const result = generatePuzzle(State.category, State.difficulty, State.level);
    State.grid      = result.grid;
    State.size      = result.size;
    State.words     = result.words;
    State.placed    = result.placed;
    State.found     = new Set();
    State.hintsUsed = 0;
  }

  State.won       = false;
  State.selecting = false;
  State.startCell = null;
  State.currentCell = null;
  State.tapFirst = null;

  // Header
  const meta = CATEGORY_META[State.category] || { label: State.category, icon: '🔤' };
  const diffLabel = window.Utils.formatDifficulty(State.difficulty);
  document.getElementById('category-badge').textContent = `${meta.icon} ${meta.label}`;
  document.getElementById('difficulty-badge').textContent = diffLabel;
  document.getElementById('level-num').textContent = `Level ${State.level}`;
  document.getElementById('difficulty-badge').className =
    `badge badge--${State.difficulty}`;

  updateHintBtn();
  renderGrid();
  renderWordList();

  // Restore found words visual state
  if (State.found.size > 0) {
    State.found.forEach(word => {
      const placed = State.placed.find(p => p.word === word);
      if (placed) {
        const cells = [];
        for (let i = 0; i < placed.word.length; i++) {
          cells.push({ row: placed.row + i * placed.dr, col: placed.col + i * placed.dc });
        }
        markFound(cells, word);
      }
      updateWordList(word);
    });
  }

  startTimer(initialElapsed);

  window.Utils.onVisibilityChange(
    () => {
      saveCurrentGameState();
      State.timer?.pause();
    },
    () => { if (!State.won) State.timer?.resume(); }
  );

  window.addEventListener('beforeunload', saveCurrentGameState);
}

// ── In-progress State Persistence ───────────────────────────────────────────
function saveCurrentGameState() {
  if (State.won || !State.grid) return;
  window.Progress.saveActiveGame({
    category:   State.category,
    difficulty: State.difficulty,
    level:      State.level,
    grid:       State.grid,
    size:       State.size,
    words:      State.words,
    placed:     State.placed,
    found:      [...State.found],
    timer:      State.timer ? State.timer.elapsed : 0,
    hintsUsed:  State.hintsUsed,
  });
}

// ── Timer ────────────────────────────────────────────────────────────────────
function startTimer(initialElapsed = 0) {
  State.timer = new window.Utils.GameTimer(s => {
    const el = document.getElementById('timer');
    if (el) el.textContent = window.Utils.formatTime(s);
  }, initialElapsed);
  State.timer.start(initialElapsed);
}

// ── Grid rendering ────────────────────────────────────────────────────────────
function renderGrid() {
  const container = document.getElementById('ws-grid');
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${State.size}, 1fr)`;

  for (let r = 0; r < State.size; r++) {
    for (let c = 0; c < State.size; c++) {
      const cell = document.createElement('div');
      cell.className = 'ws-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.textContent = State.grid[r][c];
      container.appendChild(cell);
    }
  }

  attachGridEvents(container);
}

// ── Cell helpers ─────────────────────────────────────────────────────────────
function cellAt(row, col) {
  return document.querySelector(`.ws-cell[data-row="${row}"][data-col="${col}"]`);
}

function getDirection(r1, c1, r2, c2) {
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  // Allow all 8 straight lines forward and reverse: horizontal, vertical, diagonal
  const validDirs = [
    [0,  1], [0, -1],  // right / left
    [1,  0], [-1,  0], // down / up
    [1,  1], [-1, -1], // diagonal ↘ / ↖
    [1, -1], [-1,  1], // diagonal ↙ / ↗
  ];
  if (!validDirs.some(([vr, vc]) => vr === dr && vc === dc)) return null;
  return [dr, dc];
}

function getCellsInLine(r1, c1, r2, c2) {
  const dir = getDirection(r1, c1, r2, c2);
  if (!dir) return [];
  const [dr, dc] = dir;

  // Verify alignment
  if (dr === 0 && r1 !== r2) return [];
  if (dc === 0 && c1 !== c2) return [];
  if (dr !== 0 && dc !== 0 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return [];

  const cells = [];
  let r = r1, c = c1;
  while (true) {
    cells.push({ row: r, col: c });
    if (r === r2 && c === c2) break;
    r += dr; c += dc;
    if (cells.length > 30) break; // safety
  }
  return cells;
}

function getWordFromCells(cells) {
  return cells.map(({ row, col }) => State.grid[row][col]).join('');
}

// ── Highlighting ──────────────────────────────────────────────────────────────
function clearSelectionHighlight() {
  document.querySelectorAll('.ws-cell.selecting').forEach(c => c.classList.remove('selecting'));
}

function highlightSelection(cells) {
  clearSelectionHighlight();
  cells.forEach(({ row, col }) => {
    const cell = cellAt(row, col);
    if (cell) cell.classList.add('selecting');
  });
}

function markFound(cells, word) {
  cells.forEach(({ row, col }) => {
    const cell = cellAt(row, col);
    if (cell) {
      cell.classList.remove('selecting', 'hint-highlight');
      cell.classList.add('found');
    }
  });
}

// ── Word validation ───────────────────────────────────────────────────────────
function trySelectWord(r1, c1, r2, c2) {
  clearSelectionHighlight();
  const cells = getCellsInLine(r1, c1, r2, c2);
  if (!cells.length) return false;

  const word = getWordFromCells(cells);
  const revWord = word.split('').reverse().join('');
  const matchedWord = State.words.includes(word) ? word : (State.words.includes(revWord) ? revWord : null);

  if (matchedWord && !State.found.has(matchedWord)) {
    State.found.add(matchedWord);
    markFound(cells, matchedWord);
    updateWordList(matchedWord);
    window.Utils.vibrate([80]);
    window.Utils.showToast(`✅ ${matchedWord}`, 1200, 'success');
    saveCurrentGameState();

    if (State.found.size === State.words.length) {
      setTimeout(showVictory, 600);
    }
    return true;
  }
  return false;
}

// ── Event handling: Drag (mouse + touch) and Tap ──────────────────────────────
function cellFromEvent(e) {
  let x = e.clientX;
  let y = e.clientY;
  if (x === undefined && e.touches && e.touches[0]) {
    x = e.touches[0].clientX;
    y = e.touches[0].clientY;
  }
  if (x === undefined || y === undefined) return null;

  const target = document.elementFromPoint(x, y);
  if (!target) return null;
  const cell = target.closest ? target.closest('.ws-cell') : target;
  if (!cell || !cell.classList || !cell.classList.contains('ws-cell')) return null;
  return { row: parseInt(cell.dataset.row, 10), col: parseInt(cell.dataset.col, 10) };
}

function attachGridEvents(container) {
  container.addEventListener('pointerdown', e => {
    e.preventDefault();
    const cell = cellFromEvent(e);
    if (!cell) return;
    State.selecting   = true;
    State.startCell   = cell;
    State.currentCell = cell;

    // Notice: Do NOT clear State.tapFirst here so tap mode can complete!
    if (State.tapFirst) {
      const lineCells = getCellsInLine(State.tapFirst.row, State.tapFirst.col, cell.row, cell.col);
      if (lineCells.length) {
        highlightSelection(lineCells);
      } else {
        highlightSelection([cell]);
      }
    } else {
      highlightSelection([cell]);
    }

    try {
      container.setPointerCapture(e.pointerId);
    } catch (err) {}
  });

  container.addEventListener('pointermove', e => {
    if (!State.selecting) return;
    e.preventDefault();
    const cell = cellFromEvent(e);
    if (!cell) return;

    // If pointer moved to a different cell, player is dragging; clear any previous single tap
    if (cell.row !== State.startCell.row || cell.col !== State.startCell.col) {
      State.tapFirst = null;
    }

    State.currentCell = cell;
    const cells = getCellsInLine(
      State.startCell.row, State.startCell.col,
      cell.row, cell.col
    );
    if (cells.length) highlightSelection(cells);
  });

  container.addEventListener('pointerup', e => {
    if (!State.selecting) return;
    State.selecting = false;
    const { startCell, currentCell } = State;

    // Same cell tapped: handle tap-to-select mode
    if (startCell && currentCell && startCell.row === currentCell.row && startCell.col === currentCell.col) {
      handleTap(startCell);
    } else if (startCell && currentCell) {
      // Drag completed: clear tap mode and validate word
      State.tapFirst = null;
      trySelectWord(startCell.row, startCell.col, currentCell.row, currentCell.col);
      clearSelectionHighlight();
    }
  });

  const cancelSelection = () => {
    if (State.selecting) {
      State.selecting = false;
      clearSelectionHighlight();
      if (State.tapFirst) {
        highlightSelection([State.tapFirst]);
      }
    }
  };

  container.addEventListener('pointercancel', cancelSelection);
  container.addEventListener('lostpointercapture', cancelSelection);
}

function handleTap(cell) {
  if (!State.tapFirst) {
    // First tap: record cell and illuminate it
    State.tapFirst = cell;
    clearSelectionHighlight();
    highlightSelection([cell]);
  } else {
    const first = State.tapFirst;

    // If user tapped the same cell a second time, unselect it
    if (first.row === cell.row && first.col === cell.col) {
      State.tapFirst = null;
      clearSelectionHighlight();
      return;
    }

    // Second tap: attempt to select word between first tap and second tap
    const success = trySelectWord(first.row, first.col, cell.row, cell.col);
    if (success) {
      State.tapFirst = null;
      clearSelectionHighlight();
    } else {
      // Not a valid word: treat this second tap as the new first tap
      State.tapFirst = cell;
      clearSelectionHighlight();
      highlightSelection([cell]);
    }
  }
}

// ── Word list ─────────────────────────────────────────────────────────────────
function renderWordList() {
  const list = document.getElementById('word-list');
  list.innerHTML = '';
  State.words.forEach(word => {
    const item = document.createElement('div');
    item.className = 'word-item';
    item.id = `word-${word}`;
    item.textContent = word;
    list.appendChild(item);
  });

  const counter = document.getElementById('found-counter');
  if (counter) counter.textContent = `${State.found.size} / ${State.words.length}`;
}

function updateWordList(word) {
  const item = document.getElementById(`word-${word}`);
  if (item) item.classList.add('found');

  const counter = document.getElementById('found-counter');
  if (counter) counter.textContent = `${State.found.size} / ${State.words.length}`;
}

// ── Hints ─────────────────────────────────────────────────────────────────────
function updateHintBtn() {
  const btn = document.getElementById('hint-btn');
  if (!btn) return;
  const count = window.Progress.getHints();
  const badge = document.getElementById('hint-count') || btn.querySelector('.hint-count');
  if (badge) badge.textContent = count;
  btn.disabled = false;
}

function handleHint() {
  const { useHint, getHints } = window.Progress;
  const { showToast } = window.Utils;

  if (getHints() <= 0) {
    showToast('No hints left. The morning refill restores them. <a href="store.html">Daily Supply →</a>', 3000, 'warning');
    return;
  }

  // Find an unrevealed word
  const remaining = State.placed.filter(p => !State.found.has(p.word));
  if (!remaining.length) return;

  const pick = remaining[Math.floor(Math.random() * remaining.length)];

  if (!useHint()) return;
  State.hintsUsed++;
  updateHintBtn();

  // Flash highlight on the word's cells
  const cells = [];
  for (let i = 0; i < pick.word.length; i++) {
    cells.push({ row: pick.row + i * pick.dr, col: pick.col + i * pick.dc });
  }

  cells.forEach(({ row, col }) => {
    const cell = cellAt(row, col);
    if (cell) cell.classList.add('hint-highlight');
  });

  showToast(`💡 Look for: <strong>${pick.word}</strong>`, 3000, 'info');

  setTimeout(() => {
    cells.forEach(({ row, col }) => {
      const cell = cellAt(row, col);
      if (cell && !State.found.has(pick.word)) cell.classList.remove('hint-highlight');
    });
  }, 3000);
}

// ── Victory ───────────────────────────────────────────────────────────────────
function showVictory() {
  State.won = true;
  if (State.timer) State.timer.pause();
  window.Progress.completeLevel(
    State.category, State.difficulty, State.level, State.timer.elapsed
  );
  window.Progress.clearActiveGame();

  const modal = document.getElementById('victory-modal');
  if (!modal) return;

  modal.querySelector('.victory-time').textContent     = window.Utils.formatTime(State.timer.elapsed);
  modal.querySelector('.victory-words').textContent    = State.found.size;
  modal.querySelector('.victory-hints').textContent    = State.hintsUsed;
  modal.querySelector('.victory-level').textContent    =
    `${CATEGORY_META[State.category]?.icon || ''} ${CATEGORY_META[State.category]?.label} — ${window.Utils.formatDifficulty(State.difficulty)} Level ${State.level}`;

  const best = window.Progress.getBestTime(State.category, State.difficulty, State.level);
  const bestEl = modal.querySelector('.victory-best');
  if (bestEl) bestEl.textContent = best ? `Best: ${window.Utils.formatTime(best)}` : '';

  modal.classList.add('modal--visible');
  launchConfetti();
  window.Utils.vibrate([100, 50, 100, 50, 200]);
}

function launchConfetti() {
  const colors = ['#2563eb','#3b82f6','#60a5fa','#fbbf24','#34d399','#f472b6'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `
      left:${Math.random()*100}vw;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-delay:${Math.random()}s;
      animation-duration:${1.5+Math.random()*1.5}s;
      width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;
      border-radius:${Math.random()>.5?'50%':'2px'};
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }
}

// ── Controls ──────────────────────────────────────────────────────────────────
function bindControls() {
  document.getElementById('hint-btn')?.addEventListener('click', handleHint);
  document.getElementById('back-btn')?.addEventListener('click', () => {
    saveCurrentGameState();
    window.location.href = 'index.html';
  });
  document.getElementById('next-btn')?.addEventListener('click', () => {
    window.Progress.clearActiveGame();
    const next = State.level < 1000 ? State.level + 1 : 1;
    window.location.href = `game.html?category=${State.category}&difficulty=${State.difficulty}&level=${next}`;
  });
  document.getElementById('home-btn')?.addEventListener('click', () => {
    saveCurrentGameState();
    window.location.href = 'index.html';
  });

  // Keep victory modal visible on Escape (or navigate home)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('victory-modal');
      if (modal && modal.classList.contains('modal--visible')) {
        // Do NOT hide modal and leave player stuck; navigate home instead
        window.location.href = 'index.html';
      }
    }
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initGame();
  bindControls();
});
