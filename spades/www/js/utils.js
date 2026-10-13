/* ==========================================================================
   utils.js — Common UI Utilities & Modals
   Royal Spades
   ========================================================================== */

(function(window) {
  'use strict';

  const Utils = {
    getQueryParams() {
      const params = new URLSearchParams(window.location.search);
      return {
        mode: params.get('mode') || 'classic', // 'classic' or 'twos_wild'
        target: parseInt(params.get('target') || '500', 10),
        continue: params.get('continue') === '1'
      };
    },

    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.textContent = message;

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.25s ease';
        setTimeout(() => toast.remove(), 250);
      }, 2500);
    },

    openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('active');
      }
    },

    closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('active');
      }
    },

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  };

  window.Utils = Utils;
})(window);
