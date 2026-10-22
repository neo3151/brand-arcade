/* ==========================================================================
   store.js — In-Game Store Purchases & Inventory Management
   Zen Nonogram: Pixel Tapestry
   ========================================================================== */

(function(window) {
  'use strict';

  const StorePacks = [
    {
      id: 'pack_hints_starter',
      name: 'Starter Zen Hints',
      icon: '💡',
      contents: '10 Smart Hints',
      costCoins: 100,
      priceUSD: '$0.99',
      rewards: { hints: 10 }
    },
    {
      id: 'pack_power_bundle',
      name: 'Master Monk Bundle',
      icon: '✨',
      contents: '25 Hints + 10 Radars + 5 Bombs',
      costCoins: 350,
      priceUSD: '$2.99',
      popular: true,
      rewards: { hints: 25, radars: 10, bombs: 5 }
    },
    {
      id: 'pack_radars',
      name: 'Line Radar Quiver',
      icon: '⚡',
      contents: '15 Line Radars',
      costCoins: 200,
      priceUSD: '$1.99',
      rewards: { radars: 15 }
    },
    {
      id: 'pack_bombs',
      name: 'Pixel Bomb Cache',
      icon: '💥',
      contents: '10 3x3 Pixel Bombs',
      costCoins: 200,
      priceUSD: '$1.99',
      rewards: { bombs: 10 }
    },
    {
      id: 'pack_infinite_zen',
      name: 'Infinite Zen Chest',
      icon: '🌸',
      contents: '100 Hints + 50 Radars + 25 Bombs + 500 Coins',
      costCoins: null,
      priceUSD: '$4.99',
      rewards: { hints: 100, radars: 50, bombs: 25, coins: 500 }
    }
  ];

  const Store = {
    getPacks() {
      return StorePacks;
    },

    purchaseWithCoins(packId) {
      const pack = StorePacks.find(p => p.id === packId);
      if (!pack || !pack.costCoins) return { success: false, message: 'Invalid pack' };

      const inventory = window.Progress.getInventory();
      if (inventory.coins < pack.costCoins) {
        return { success: false, message: 'Not enough coins! Solve more levels to earn coins.' };
      }

      // Deduct coins
      window.Progress.modifyItem('coins', -pack.costCoins);

      // Add rewards
      for (const [key, amount] of Object.entries(pack.rewards)) {
        window.Progress.modifyItem(key, amount);
      }

      if (window.SoundFX) window.SoundFX.playPowerup();

      return {
        success: true,
        message: `Purchased ${pack.name}!`,
        pack
      };
    },

    purchaseWithIAP(packId) {
      const pack = StorePacks.find(p => p.id === packId);
      if (!pack) return { success: false, message: 'Invalid pack' };

      // In native Capacitor or web simulator:
      for (const [key, amount] of Object.entries(pack.rewards)) {
        window.Progress.modifyItem(key, amount);
      }

      if (window.SoundFX) window.SoundFX.playPowerup();

      return {
        success: true,
        message: `Simulated IAP purchase successful for ${pack.name} (${pack.priceUSD})!`,
        pack
      };
    }
  };

  window.Store = Store;
})(window);
