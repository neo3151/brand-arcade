/* ==========================================================================
   store.js — Daily Supply status for Spider Solitaire
   Play-earned coins stay on the profile. Consumables refill each morning.
   ========================================================================== */

(function (window) {
  'use strict';

  const SUPPLIES = [
    { key: 'hints', icon: '💡', label: 'Hints' },
    { key: 'lanterns', icon: '🏮', label: 'Lanterns' },
    { key: 'magnets', icon: '🕸️', label: 'Magnets' }
  ];

  const Store = {
    supplies: SUPPLIES,

    summary() {
      return window.FairPlay
        ? window.FairPlay.supplySummary('spidersolitaire')
        : 'Daily supply is still loading.';
    }
  };

  window.Store = Store;
})(window);
