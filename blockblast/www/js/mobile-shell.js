/* ==========================================================================
   mobile-shell.js — Phone Frame, Clock & Sound Toggle
   Timber Block Blast
   ========================================================================== */

(function(window) {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // 0. Apply selected theme at body level (covers screen, modals & toasts)
    //    ?theme=<id> previews a theme without changing the saved selection
    if (window.Progress) {
      const preview = new URLSearchParams(window.location.search).get('theme');
      document.body.dataset.theme = preview || window.Progress.getSelectedTheme();
    }

    // 1. Clock in status bar
    const clockEl = document.getElementById('device-clock');
    if (clockEl) {
      const updateClock = () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        clockEl.textContent = `${hours}:${minutes}`;
      };
      updateClock();
      setInterval(updateClock, 30000);
    }

    // 2. Sound Toggle
    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn && window.SoundFX) {
      const updateIcon = () => {
        soundBtn.textContent = window.SoundFX.isMuted() ? '🔇' : '🔊';
      };
      updateIcon();
      soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.SoundFX.toggleMute();
        updateIcon();
      });
    }

    // 3. Home pill navigation
    const homePill = document.querySelector('.device-home-pill');
    if (homePill) {
      homePill.addEventListener('click', () => {
        if (!window.location.pathname.endsWith('index.html')) {
          window.location.href = 'index.html';
        }
      });
    }
  });
})(window);
