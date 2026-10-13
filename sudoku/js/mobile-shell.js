/**
 * mobile-shell.js — Commercial Smartphone Shell Controller
 * Classic Sudoku (Google Play Mobile App Ready)
 */

'use strict';

(function () {
  function initMobileShell() {
    const isMobileDevice = window.innerWidth <= 520 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Check saved preference
    const savedView = localStorage.getItem('sdk_view_mode') || 'phone';
    if (savedView === 'fullscreen' && !isMobileDevice) {
      document.body.classList.add('fullscreen-mode');
    }

    // Update real-time status bar clock
    const clockEl = document.getElementById('device-clock');
    function updateClock() {
      if (!clockEl) return;
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const minStr = minutes < 10 ? '0' + minutes : minutes;
      clockEl.textContent = `${hours}:${minStr}`;
    }
    updateClock();
    setInterval(updateClock, 10000);

    // Toggle button handler
    const toggleBtn = document.getElementById('btn-toggle-sim');
    if (toggleBtn) {
      toggleBtn.textContent = document.body.classList.contains('fullscreen-mode') 
        ? '📱 Phone Frame' 
        : '🖥️ Full Window';

      toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('fullscreen-mode');
        const isFull = document.body.classList.contains('fullscreen-mode');
        localStorage.setItem('sdk_view_mode', isFull ? 'fullscreen' : 'phone');
        toggleBtn.textContent = isFull ? '📱 Phone Frame' : '🖥️ Full Window';
        window.dispatchEvent(new Event('resize'));
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileShell);
  } else {
    initMobileShell();
  }
})();
