/**
 * utils.js
 * Shared utility functions: timer, formatting, DOM helpers.
 */

'use strict';

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------
class GameTimer {
  constructor(onTick, initialElapsed = 0) {
    this.elapsed = initialElapsed || 0;
    this.running = false;
    this._interval = null;
    this.onTick = onTick || (() => {});
  }

  start(initialElapsed) {
    if (initialElapsed !== undefined) {
      this.elapsed = initialElapsed;
    }
    if (this.running) return;
    this.running = true;
    this.onTick(this.elapsed);
    this._interval = setInterval(() => {
      this.elapsed++;
      this.onTick(this.elapsed);
    }, 1000);
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    clearInterval(this._interval);
  }

  resume() {
    if (!this.running) this.start();
  }

  reset() {
    this.pause();
    this.elapsed = 0;
    this.onTick(0);
  }

  destroy() {
    clearInterval(this._interval);
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatDifficulty(d) {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

function qsa(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') element.className = v;
    else if (k === 'html') element.innerHTML = v;
    else if (k === 'text') element.textContent = v;
    else element.setAttribute(k, v);
  });
  children.forEach(child => {
    if (typeof child === 'string') element.appendChild(document.createTextNode(child));
    else if (child) element.appendChild(child);
  });
  return element;
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------
function showToast(message, duration = 2500, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = el('div', { id: 'toast-container' });
    document.body.appendChild(container);
  }
  const toast = el('div', { class: `toast toast--${type}`, html: message });
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---------------------------------------------------------------------------
// URL params
// ---------------------------------------------------------------------------
function getParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

// ---------------------------------------------------------------------------
// Vibration (for mobile, if supported)
// ---------------------------------------------------------------------------
function vibrate(pattern = [50]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ---------------------------------------------------------------------------
// Visibility change (pause on tab switch)
// ---------------------------------------------------------------------------
function onVisibilityChange(pauseFn, resumeFn) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseFn();
    else resumeFn();
  });
}

window.Utils = {
  GameTimer,
  formatTime,
  formatDifficulty,
  qs,
  qsa,
  el,
  showToast,
  getParams,
  vibrate,
  onVisibilityChange,
};
