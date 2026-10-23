/**
 * Starts the Island watcher on a hub game page. Standalone /index.html never
 * reaches this file, because the cosmetics loader returns first.
 */
(function (root) {
  'use strict';
  function boot() {
    if (root.ArcadeIsland && typeof root.ArcadeIsland.watch === 'function') {
      try { root.ArcadeIsland.watch(root.document); } catch (e) { /* island never blocks play */ }
    }
  }
  if (root.document && root.document.readyState === 'loading' && root.document.addEventListener) {
    root.document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
