/* ==========================================================================
   store.js — Themes & Felts Catalog
   Royal Spades
   ========================================================================== */

(function(window) {
  'use strict';

  const TABLES = [
    {
      id: 'emerald_velvet',
      name: 'Midnight Emerald',
      desc: 'Deep royal velvet table felt with golden filigree.',
      price: 0,
      previewBg: 'radial-gradient(circle, #064e3b 0%, #022c22 100%)',
      previewIcon: '♠️'
    },
    {
      id: 'crimson_parlor',
      name: 'Crimson Parlor',
      desc: 'Luxurious ruby red felt favored by high rollers.',
      price: 150,
      previewBg: 'radial-gradient(circle, #7f1d1d 0%, #450a0a 100%)',
      previewIcon: '♥️'
    },
    {
      id: 'obsidian_lounge',
      name: 'Obsidian Velvet',
      desc: 'Midnight charcoal felt with luminescent teal accents.',
      price: 250,
      previewBg: 'radial-gradient(circle, #1e293b 0%, #0f172a 100%)',
      previewIcon: '💎'
    },
    {
      id: 'imperial_gold',
      name: 'Imperial Gold',
      desc: 'Gilded amber felt reserved for Spades champions.',
      price: 400,
      previewBg: 'radial-gradient(circle, #92400e 0%, #451a03 100%)',
      previewIcon: '👑'
    }
  ];

  const Store = {
    getTables() {
      const inv = window.Progress.getInventory();
      return TABLES.map(t => ({
        ...t,
        unlocked: inv.unlockedTables.includes(t.id),
        active: inv.activeTable === t.id
      }));
    },

    selectOrBuyTable(tableId) {
      const inv = window.Progress.getInventory();
      const table = TABLES.find(t => t.id === tableId);
      if (!table) return { success: false, msg: 'Table not found' };

      if (inv.unlockedTables.includes(tableId)) {
        inv.activeTable = tableId;
        window.Progress.saveInventory(inv);
        return { success: true, active: true, msg: `${table.name} equipped!` };
      }

      if (inv.coins >= table.price) {
        inv.coins -= table.price;
        inv.unlockedTables.push(tableId);
        inv.activeTable = tableId;
        window.Progress.saveInventory(inv);
        return { success: true, active: true, msg: `Unlocked & equipped ${table.name}!` };
      }

      return { success: false, msg: 'Not enough coins!' };
    }
  };

  window.Store = Store;
})(window);
