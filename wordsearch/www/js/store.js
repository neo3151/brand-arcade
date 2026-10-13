/**
 * store.js
 * Hint store logic — placeholder purchase UI.
 * Real payment integration (Google Play / Apple IAP / Stripe) to be wired in later.
 */

'use strict';

const HINT_PACKS = [
  {
    id: 'hints_5',
    label: '5 Hints',
    amount: 5,
    price: '$0.99',
    icon: '⚡',
    badge: null,
    description: 'Perfect for a quick boost',
  },
  {
    id: 'hints_10',
    label: '10 Hints',
    amount: 10,
    price: '$1.99',
    icon: '🔥',
    badge: null,
    description: 'Most popular choice',
  },
  {
    id: 'hints_25',
    label: '25 Hints',
    amount: 25,
    price: '$3.99',
    icon: '💎',
    badge: 'Best Value',
    description: 'For the dedicated solver',
  },
];

function renderStore() {
  const { getHints, addHints } = window.Progress;
  const { showToast } = window.Utils;

  // Update hint balance display
  const balanceEl = document.getElementById('hint-balance');
  if (balanceEl) balanceEl.textContent = getHints();

  const grid = document.getElementById('pack-grid');
  if (!grid) return;

  grid.innerHTML = '';

  HINT_PACKS.forEach(pack => {
    const card = document.createElement('div');
    card.className = 'pack-card' + (pack.badge ? ' pack-card--featured' : '');
    card.innerHTML = `
      ${pack.badge ? `<div class="pack-badge">${pack.badge}</div>` : ''}
      <div class="pack-icon">${pack.icon}</div>
      <div class="pack-info">
        <div class="pack-label">${pack.label}</div>
        <div class="pack-desc">${pack.description}</div>
      </div>
      <button class="btn btn--primary pack-buy-btn" id="buy-${pack.id}" data-pack-id="${pack.id}">
        <span>${pack.price}</span>
      </button>
    `;
    grid.appendChild(card);
  });

  // Attach buy handlers
  grid.querySelectorAll('.pack-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const packId = btn.getAttribute('data-pack-id');
      handlePurchase(packId);
    });
  });
}

function handlePurchase(packId) {
  const pack = HINT_PACKS.find(p => p.id === packId);
  if (!pack) return;

  const { addHints, getHints } = window.Progress;
  const { showToast, vibrate } = window.Utils;

  // PLACEHOLDER: In production, trigger Google Play / Apple IAP / Stripe here.
  // For now, just add the hints directly (test mode).
  console.log(`[Store] Purchase initiated: ${pack.id} (${pack.price}) — PLACEHOLDER`);

  // Simulate a short "processing" state
  const btn = document.getElementById(`buy-${packId}`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Processing…';
  }

  setTimeout(() => {
    const newTotal = addHints(pack.amount);
    vibrate([50, 50, 100]);

    // Update balance display
    const balanceEl = document.getElementById('hint-balance');
    if (balanceEl) {
      balanceEl.textContent = newTotal;
      balanceEl.classList.add('balance--bump');
      setTimeout(() => balanceEl.classList.remove('balance--bump'), 600);
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>${pack.price}</span>`;
    }

    showToast(`✅ ${pack.amount} hints added! You now have ${newTotal} hints.`, 3000, 'success');
  }, 800);
}

function handleRestorePurchases() {
  window.Utils.showToast('Restore Purchases is not available in demo mode. All hints are stored locally.', 3000, 'info');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  renderStore();

  const restoreBtn = document.getElementById('restore-btn');
  if (restoreBtn) restoreBtn.addEventListener('click', handleRestorePurchases);

  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'index.html');
});

window.Store = { renderStore, handlePurchase, HINT_PACKS };
