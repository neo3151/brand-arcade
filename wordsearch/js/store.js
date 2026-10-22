/**
 * store.js
 * Daily Supply page for Word Search. Hints refill each local morning.
 * There is no real-money catalog in this phase.
 */

'use strict';

function renderStore() {
  const hints = window.Progress.getHints();
  const summary = window.FairPlay
    ? window.FairPlay.supplySummary('wordsearch')
    : 'Daily supply is still loading.';

  const balanceEl = document.getElementById('hint-balance');
  if (balanceEl) balanceEl.textContent = hints;

  const grid = document.getElementById('pack-grid');
  if (!grid) return;

  grid.innerHTML = ''
    + '<div class="pack-card pack-card--featured">'
    + '  <div class="pack-icon">🌅</div>'
    + '  <div class="pack-info">'
    + '    <div class="pack-label">Morning refill</div>'
    + '    <div class="pack-desc"></div>'
    + '  </div>'
    + '</div>'
    + '<div class="pack-card">'
    + '  <div class="pack-icon">💡</div>'
    + '  <div class="pack-info">'
    + '    <div class="pack-label"></div>'
    + '    <div class="pack-desc">Clearing 5 puzzles grants 5 extra hints. Every category and difficulty is open from the start.</div>'
    + '  </div>'
    + '</div>';

  const descs = grid.querySelectorAll('.pack-desc');
  const labels = grid.querySelectorAll('.pack-label');
  if (descs[0]) descs[0].textContent = summary;
  if (labels[1]) labels[1].textContent = hints + ' hints ready';
}

document.addEventListener('DOMContentLoaded', () => {
  renderStore();

  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
});

window.Store = { renderStore };
