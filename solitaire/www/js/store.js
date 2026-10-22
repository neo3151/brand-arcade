/**
 * store.js — Daily Supply status for Curious Solitaire.
 * Hints, peeks, and reshuffles refill each local morning. No purchases.
 */

function updateStoreInventoryUI() {
  const hintCountEl = document.getElementById('store-hints-count');
  const peekCountEl = document.getElementById('store-peeks-count');
  const shuffleCountEl = document.getElementById('store-shuffles-count');

  if (hintCountEl && window.SolitaireProgress) hintCountEl.textContent = window.SolitaireProgress.getHints();
  if (peekCountEl && window.SolitaireProgress) peekCountEl.textContent = window.SolitaireProgress.getPeeks();
  if (shuffleCountEl && window.SolitaireProgress) shuffleCountEl.textContent = window.SolitaireProgress.getShuffles();
}

function renderDailySupply(container) {
  if (!container) return;
  updateStoreInventoryUI();
  const summary = window.FairPlay
    ? window.FairPlay.supplySummary('solitaire')
    : 'Daily supply is still loading.';
  container.textContent = '';

  const card = document.createElement('div');
  card.className = 'store-card';
  const title = document.createElement('div');
  title.className = 'store-card-title';
  title.textContent = 'Morning Supply';
  const desc = document.createElement('div');
  desc.className = 'store-card-desc';
  desc.textContent = summary + ' Draw 1 and Draw 3, deals 1 through 1,000, are open from the start. This game is 100% free and ad-free.';
  card.appendChild(title);
  card.appendChild(desc);
  container.appendChild(card);
}

function showStoreToast(msg) {
  let toast = document.getElementById('store-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'store-toast';
    toast.className = 'store-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('store-toast--show');
  setTimeout(() => {
    toast.classList.remove('store-toast--show');
  }, 2500);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { updateStoreInventoryUI, renderDailySupply, showStoreToast };
} else {
  window.SolitaireStore = {
    updateStoreInventoryUI,
    renderDailySupply,
    showStoreToast
  };
}
