/**
 * CELESTIAL JADE: MAHJONG SOLITAIRE — store.js
 * Pavilion Emporium purchase handler and inventory display synchronization.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  const PACKS = {
    hint: {
      id: 'hint',
      name: 'Compass Hint Pack',
      item: 'hints',
      qty: 5,
      price: '$0.99'
    },
    shuffle: {
      id: 'shuffle',
      name: 'Dragon Shuffle Pack',
      item: 'shuffles',
      qty: 3,
      price: '$0.99'
    },
    undo: {
      id: 'undo',
      name: 'Time Rewind Pack',
      item: 'undos',
      qty: 5,
      price: '$0.99'
    },
    lotus: {
      id: 'lotus',
      name: 'Celestial Lotus Pack',
      item: 'lotuses',
      qty: 3,
      price: '$0.99'
    },
    grand: {
      id: 'grand',
      name: 'Grand Imperial Treasury',
      items: [
        { item: 'hints', qty: 10 },
        { item: 'shuffles', qty: 6 },
        { item: 'undos', qty: 10 },
        { item: 'lotuses', qty: 6 }
      ],
      price: '$2.99'
    }
  };

  function updateInventoryDisplay() {
    const inv = Progress.getInventory();
    const hEl = document.getElementById('inv-hints');
    const sEl = document.getElementById('inv-shuffles');
    const uEl = document.getElementById('inv-undos');
    const lEl = document.getElementById('inv-lotuses');

    if (hEl) hEl.textContent = inv.hints || 0;
    if (sEl) sEl.textContent = inv.shuffles || 0;
    if (uEl) uEl.textContent = inv.undos || 0;
    if (lEl) lEl.textContent = inv.lotuses || 0;
  }

  function handlePurchase(packId) {
    const pack = PACKS[packId];
    if (!pack) return;

    if (packId === 'grand') {
      pack.items.forEach(b => {
        Progress.addItems(b.item, b.qty);
      });
      Utils.showToast(`SANCTUARY OFFERING: Grand Imperial Treasury Delivered!`, 3500, 'success');
    } else {
      Progress.addItems(pack.item, pack.qty);
      Utils.showToast(`SANCTUARY OFFERING: +${pack.qty} ${pack.name}`, 3000, 'success');
    }

    Utils.sound.play('lotus');
    Utils.vibrate([40, 50, 40]);
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
