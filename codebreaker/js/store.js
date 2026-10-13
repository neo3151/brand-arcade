/**
 * BLACK VAULT — store.js
 * Dead Drop Armory purchase handler, simulated requisitions, and inventory UI synchronization.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  const PACK_DEFINITIONS = {
    decryptor: {
      id: 'decryptor',
      name: 'Signal Decryptor Pack',
      item: 'decryptors',
      qty: 3,
      price: '$0.99',
      desc: 'Instantly de-scrambles and permanently reveals 1 unmasked pin position in the secret code vault.'
    },
    filter: {
      id: 'filter',
      name: 'Frequency Filter Pack',
      item: 'filters',
      qty: 3,
      price: '$0.99',
      desc: 'Eliminates 2 unused pin frequencies (colors) from your active teleprinter palette.'
    },
    rewind: {
      id: 'rewind',
      name: 'Magnetic Tape Rewind',
      item: 'rewinds',
      qty: 2,
      price: '$0.99',
      desc: 'Spools the analog audio tape back, granting +2 bonus guess attempts to prevent mission compromise.'
    },
    probe: {
      id: 'probe',
      name: 'Wiretap Logic Probe Pack',
      item: 'probes',
      qty: 3,
      price: '$0.99',
      desc: 'Cross-examines your pending test row against all prior feedback to verify 100% mathematical consistency.'
    },
    master: {
      id: 'master',
      name: 'Master Spy Dead Drop Crate',
      items: [
        { item: 'decryptors', qty: 5 },
        { item: 'filters', qty: 5 },
        { item: 'rewinds', qty: 4 },
        { item: 'probes', qty: 5 }
      ],
      price: '$2.99',
      desc: 'Complete field operative tactical cache: +5 Decryptors, +5 Filters, +4 Tape Rewinds, +5 Logic Probes.'
    }
  };

  function updateInventoryDisplay() {
    const inv = Progress.getInventory();
    const dEl = document.getElementById('inv-decryptors');
    const fEl = document.getElementById('inv-filters');
    const rEl = document.getElementById('inv-rewinds');
    const pEl = document.getElementById('inv-probes');

    if (dEl) dEl.textContent = inv.decryptors || 0;
    if (fEl) fEl.textContent = inv.filters || 0;
    if (rEl) rEl.textContent = inv.rewinds || 0;
    if (pEl) pEl.textContent = inv.probes || 0;
  }

  function handlePurchase(packId) {
    const pack = PACK_DEFINITIONS[packId];
    if (!pack) return;

    if (packId === 'master') {
      pack.items.forEach(bundleItem => {
        Progress.addItems(bundleItem.item, bundleItem.qty);
      });
      Utils.showToast(`REQUISITION CONFIRMED: Master Spy Crate Delivered!`, 3500, 'success');
    } else {
      Progress.addItems(pack.item, pack.qty);
      Utils.showToast(`REQUISITION CONFIRMED: +${pack.qty} ${pack.name}`, 3000, 'success');
    }

    Utils.sound.play('stamp');
    Utils.vibrate([50, 40, 50]);
    updateInventoryDisplay();
  }

  // Bind purchase buttons
  document.querySelectorAll('[data-pack]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const packId = btn.getAttribute('data-pack');
      handlePurchase(packId);
    });
  });

  // Initial render
  updateInventoryDisplay();
});
