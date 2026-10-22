/* ==========================================================================
   utils.js — General Utilities & DOM Helpers
   Spider Solitaire: Cobweb Manor
   ========================================================================== */

(function(window) {
  'use strict';

  const Utils = {
    // Parse URL search parameters
    getQueryParams() {
      const params = new URLSearchParams(window.location.search);
      return {
        difficulty: params.get('difficulty') || '1suit',
        level: parseInt(params.get('level') || '1', 10),
        continue: params.get('continue') === '1'
      };
    },

    // Format seconds into MM:SS
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    // Difficulty display labels
    difficultyLabels: {
      '1suit': '1 Suit (Beginner)',
      '2suit': '2 Suits (Medium)',
      '4suit': '4 Suits (Master)'
    },

    getDifficultyLabel(diff) {
      return this.difficultyLabels[diff] || '1 Suit (Beginner)';
    },

    // Toast notification
    showToast(message, type = 'info', duration = 2500) {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        const screen = document.querySelector('.device-screen') || document.body;
        screen.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.textContent = message;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'toastOut 0.25s forwards';
        setTimeout(() => toast.remove(), 250);
      }, duration);
    },

    // Modal helpers
    openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('active');
    },

    closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('active');
    }
  };

  window.Utils = Utils;
})(window);
