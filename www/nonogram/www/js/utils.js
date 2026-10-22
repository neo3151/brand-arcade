/* ==========================================================================
   utils.js — General Utilities & DOM Helpers
   Zen Nonogram: Pixel Tapestry
   ========================================================================== */

(function(window) {
  'use strict';

  const Utils = {
    // Parse URL search parameters
    getQueryParams() {
      const params = new URLSearchParams(window.location.search);
      return {
        difficulty: params.get('difficulty') || 'beginner',
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
      beginner: 'Beginner (5x5)',
      easy: 'Easy (10x10)',
      medium: 'Medium (15x15)',
      hard: 'Hard (20x20)',
      master: 'Master (20x20)'
    },

    difficultySizes: {
      beginner: 5,
      easy: 10,
      medium: 15,
      hard: 20,
      master: 20
    },

    getDifficultyLabel(diff) {
      return this.difficultyLabels[diff] || 'Beginner (5x5)';
    },

    getGridSize(diff) {
      return this.difficultySizes[diff] || 10;
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
