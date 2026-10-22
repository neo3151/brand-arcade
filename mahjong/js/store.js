/**
 * CELESTIAL JADE — store.js
 * Daily Supply readout for hints, shuffles, undos, and lotuses.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const inv = Progress.getInventory();
  const pairs = [
    ['inv-hints', inv.hints],
    ['inv-shuffles', inv.shuffles],
    ['inv-undos', inv.undos],
    ['inv-lotuses', inv.lotuses]
  ];
  pairs.forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || 0;
  });

  const status = document.getElementById('fair-play-status');
  if (status) {
    status.textContent = window.FairPlay
      ? window.FairPlay.supplySummary('mahjong')
      : 'Daily supply is still loading.';
  }
});
