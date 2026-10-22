/* ==========================================================================
   store.js — Daily Supply status for Zen Nonogram
   Play-earned coins stay on the profile. Consumables refill each morning.
   ========================================================================== */

(function (window) {
  'use strict';

  const SUPPLIES = [
    { key: 'hints', icon: '💡', label: 'Hints' },
    { key: 'radars', icon: '⚡', label: 'Radars' },
    { key: 'bombs', icon: '💥', label: 'Bombs' }
  ];

  const Store = {
    supplies: SUPPLIES,

    summary() {
      return window.FairPlay
        ? window.FairPlay.supplySummary('nonogram')
        : 'Daily supply is still loading.';
    }
  };

  window.Store = Store;
})(window);
