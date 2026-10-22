/**
 * INFERNO SWEEPER — store.js
 * Daily Supply readout. Shields, scans, orbs, and strikes refill each morning.
 */

'use strict';

const SUPPLIES = [
  { id: 'shields', icon: '🛡️', name: 'Bio-Shields', desc: 'Absorbs one lethal detonation and defuses that mine.' },
  { id: 'scans', icon: '📡', name: 'Hell-Scan Sonar', desc: 'Reveals a 3×3 sector and tags the mines inside it.' },
  { id: 'orbs', icon: '👁️', name: 'Tactical Clairvoyance', desc: 'Points out one tile that is safe to open.' },
  { id: 'strikes', icon: '🚀', name: 'Orbital EMP', desc: 'Defuses three hidden mines still on the field.' }
];

function renderArmory() {
  const inv = window.Progress.getInventory();
  const summary = window.FairPlay
    ? window.FairPlay.supplySummary('minesweeper')
    : 'Daily supply is still loading.';

  const setCount = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setCount('inv-shields', inv.shields || 0);
  setCount('inv-scans', inv.scans || 0);
  setCount('inv-orbs', inv.orbs || 0);
  setCount('inv-strikes', inv.strikes || 0);

  const grid = document.getElementById('armory-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = 'supply-card supply-card--featured';
  banner.style.gridColumn = '1 / -1';
  const bannerTitle = document.createElement('div');
  bannerTitle.className = 'supply-title';
  bannerTitle.textContent = 'Morning refill';
  const bannerDesc = document.createElement('div');
  bannerDesc.className = 'supply-desc';
  bannerDesc.textContent = summary + ' Recruit, Marine, and Nightmare are all open. This game is 100% free and ad-free.';
  banner.appendChild(bannerTitle);
  banner.appendChild(bannerDesc);
  grid.appendChild(banner);

  SUPPLIES.forEach(item => {
    const card = document.createElement('div');
    card.className = 'supply-card';
    const header = document.createElement('div');
    header.className = 'supply-header';
    const icon = document.createElement('div');
    icon.className = 'supply-icon';
    icon.textContent = item.icon;
    const titles = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'supply-title';
    name.textContent = item.name;
    const qty = document.createElement('div');
    qty.className = 'supply-qty';
    qty.textContent = (inv[item.id] || 0) + ' ready';
    titles.appendChild(name);
    titles.appendChild(qty);
    header.appendChild(icon);
    header.appendChild(titles);
    const desc = document.createElement('div');
    desc.className = 'supply-desc';
    desc.textContent = item.desc;
    card.appendChild(header);
    card.appendChild(desc);
    grid.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderArmory();

  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (window.Utils && window.Utils.sound) window.Utils.sound.play('click');
      if (document.referrer && document.referrer.includes('game.html')) {
        window.history.back();
      } else {
        window.location.href = 'index.html';
      }
    });
  }
});
