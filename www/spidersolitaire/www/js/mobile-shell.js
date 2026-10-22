/* ==========================================================================
   mobile-shell.js — Mobile Shell Simulator & Responsiveness
   Spider Solitaire: Cobweb Manor
   ========================================================================== */

(function(window) {
  'use strict';

  function initMobileShell() {
    // Virtual Clock in status bar
    const clockEl = document.getElementById('device-clock');
    if (clockEl) {
      function updateClock() {
        const d = new Date();
        let h = d.getHours();
        let m = d.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        clockEl.textContent = `${h}:${m.toString().padStart(2, '0')}`;
      }
      updateClock();
      setInterval(updateClock, 15000);
    }

    // Toggle full window mode on desktop
    const toggleBtn = document.getElementById('btn-toggle-sim');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('sim-fullwindow');
        const isFull = document.body.classList.contains('sim-fullwindow');
        toggleBtn.textContent = isFull ? '📱 Mobile Frame' : '🖥️ Full Window';
      });
    }

    // Sound toggle
    const soundToggle = document.getElementById('sound-toggle-btn');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        if (window.SoundFX) {
          const muted = window.SoundFX.toggleMute();
          soundToggle.textContent = muted ? '🔇' : '🔊';
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileShell);
  } else {
    initMobileShell();
  }
})(window);
