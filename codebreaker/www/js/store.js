/**
 * BLACK VAULT — store.js
 * Daily Supply readout for decryptors, filters, rewinds, and probes.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const inv = Progress.getInventory();
  const pairs = [
    ['inv-decryptors', inv.decryptors],
    ['inv-filters', inv.filters],
    ['inv-rewinds', inv.rewinds],
    ['inv-probes', inv.probes]
  ];
  pairs.forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || 0;
  });

  const status = document.getElementById('fair-play-status');
  if (status) {
    status.textContent = window.FairPlay
      ? window.FairPlay.supplySummary('codebreaker')
      : 'Daily supply is still loading.';
  }
});
