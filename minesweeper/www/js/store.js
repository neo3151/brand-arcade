/**
 * INFERNO SWEEPER — store.js
 * Tactical Armory store controller and simulated purchase handling.
 */

'use strict';

const ARMORY_PACKS = [
  {
    id: 'shield_pack_3',
    name: '3x Bio-Shield Armor',
    item: 'shields',
    amount: 3,
    icon: '🛡️',
    price: '$0.99',
    badge: null,
    desc: 'Absorbs 1 lethal plasma mine detonation. Defuses the mine and prevents KIA.'
  },
  {
    id: 'sonar_pack_5',
    name: '5x Hell-Scan Sonar',
    item: 'scans',
    amount: 5,
    icon: '📡',
    price: '$0.99',
    badge: null,
    desc: 'Sweeps any 3x3 perimeter sector, revealing all safe terrain and tagging demon mines.'
  },
  {
    id: 'clairvoyance_pack_5',
    name: '5x Tactical AI Clairvoyance',
    item: 'orbs',
    amount: 5,
    icon: '👁️',
    price: '$1.49',
    badge: 'Popular',
    desc: 'Analyzes active sectors with mathematical logic to pinpoint a 100% safe tile.'
  },
  {
    id: 'strike_pack_3',
    name: '3x Orbital EMP Strike',
    item: 'strikes',
    amount: 3,
    icon: '🚀',
    price: '$1.99',
    badge: null,
    desc: 'Calls down an orbital strike to disarm and defuse 3 random hidden mines on the field.'
  },
  {
    id: 'marine_bundle',
    name: 'Praetor Tactical Bundle',
    item: 'bundle',
    bundleContents: { shields: 5, scans: 5, orbs: 5, strikes: 3 },
    icon: '⚡',
    price: '$3.99',
    badge: 'Best Value',
    desc: 'Complete operational supply crate: 5 Shields, 5 Scans, 5 Orbs, and 3 Orbital Strikes.'
  }
];

function renderArmory() {
  const inv = window.Progress.getInventory();

  // Update inventory counts
  const invShields = document.getElementById('inv-shields');
  const invScans   = document.getElementById('inv-scans');
  const invOrbs    = document.getElementById('inv-orbs');
  const invStrikes = document.getElementById('inv-strikes');

  if (invShields) invShields.textContent = inv.shields || 0;
  if (invScans)   invScans.textContent   = inv.scans   || 0;
  if (invOrbs)    invOrbs.textContent    = inv.orbs    || 0;
  if (invStrikes) invStrikes.textContent = inv.strikes || 0;

  const grid = document.getElementById('armory-grid');
  if (!grid) return;

  grid.innerHTML = '';

  ARMORY_PACKS.forEach(pack => {
    const card = document.createElement('div');
    card.className = `supply-card ${pack.badge ? 'supply-card--featured' : ''}`;
    card.innerHTML = `
      ${pack.badge ? `<div class="supply-badge">${pack.badge}</div>` : ''}
      <div class="supply-header">
        <div class="supply-icon">${pack.icon}</div>
        <div>
          <div class="supply-title">${pack.name}</div>
          <div class="supply-qty">${pack.item === 'bundle' ? 'Multi-Supply Crate' : `+${pack.amount} Units`}</div>
        </div>
      </div>
      <div class="supply-desc">${pack.desc}</div>
      <div class="supply-meta">
        <div class="supply-price">${pack.price}</div>
        <button class="btn btn--cyan btn--sm buy-btn" data-pack-id="${pack.id}">
          Acquire
        </button>
      </div>
    `;

    const buyBtn = card.querySelector('.buy-btn');
    buyBtn.addEventListener('click', () => handlePurchase(pack));

    grid.appendChild(card);
  });
}

function handlePurchase(pack) {
  const { sound, showToast, vibrate } = window.Utils;
  sound.play('click');
  vibrate([40, 30, 40]);

  if (pack.item === 'bundle') {
    Object.entries(pack.bundleContents).forEach(([itemKey, qty]) => {
      window.Progress.addItems(itemKey, qty);
    });
    sound.play('win');
    showToast(`📦 <strong>Praetor Bundle Acquired!</strong> Full supplies added to your armory.`, 3000, 'success');
  } else {
    const newTotal = window.Progress.addItems(pack.item, pack.amount);
    sound.play('cascade');
    showToast(`✅ <strong>${pack.name}</strong> acquired! (Inventory: ${newTotal})`, 2500, 'success');
  }

  renderArmory();
}

document.addEventListener('DOMContentLoaded', () => {
  renderArmory();

  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.Utils.sound.play('click');
      if (document.referrer && document.referrer.includes('game.html')) {
        window.history.back();
      } else {
        window.location.href = 'index.html';
      }
    });
  }

  const restoreBtn = document.getElementById('restore-btn');
  if (restoreBtn) {
    restoreBtn.addEventListener('click', () => {
      window.Utils.sound.play('click');
      window.Utils.showToast('ℹ️ All supplies are stored locally on this terminal. No remote purchases detected.', 3000, 'info');
    });
  }
});
