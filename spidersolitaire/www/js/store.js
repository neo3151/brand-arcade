/* ==========================================================================
   store.js — In-Game Store Purchases & Inventory Management
   Spider Solitaire: Cobweb Manor
   ========================================================================== */

(function(window) {
  'use strict';

  const StorePacks = [
    {
      id: 'pack_hints_candle',
      name: 'Candlelight Hints',
      icon: '💡',
      contents: '10 Smart Strategic Hints',
      costCoins: 100,
      priceUSD: '$0.99',
      rewards: { hints: 10 }
    },
    {
      id: 'pack_gothic_bundle',
      name: 'Lord of the Manor Bundle',
      icon: '🏰',
      contents: '25 Hints + 10 Lanterns + 5 Spider Magnets',
      costCoins: 350,
      priceUSD: '$2.99',
      popular: true,
      rewards: { hints: 25, lanterns: 10, magnets: 5 }
    },
    {
      id: 'pack_lanterns',
      name: 'Crypt Lanterns',
      icon: '🏮',
      contents: '15 Face-down Card Peeks',
      costCoins: 200,
      priceUSD: '$1.99',
      rewards: { lanterns: 15 }
    },
    {
      id: 'pack_magnets',
      name: 'Spiderweb Magnets',
      icon: '🕸️',
      contents: '10 Run Auto-Consolidators',
      costCoins: 200,
      priceUSD: '$1.99',
      rewards: { magnets: 10 }
    },
    {
      id: 'pack_manor_vault',
      name: 'Manor Relic Vault',
      icon: '💎',
      contents: '100 Hints + 50 Lanterns + 25 Magnets + 500 Coins',
      costCoins: null,
      priceUSD: '$4.99',
      rewards: { hints: 100, lanterns: 50, magnets: 25, coins: 500 }
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
        return { success: false, message: 'Not enough coins! Win deals to earn coins.' };
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
        message: `Simulated purchase successful for ${pack.name} (${pack.priceUSD})!`,
        pack
      };
    }
  };

  window.Store = Store;
})(window);
