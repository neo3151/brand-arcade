/**
 * CELESTIAL JADE: MAHJONG SOLITAIRE — utils.js
 * Procedural Zen Web Audio synthesizer, GameTimer, Toast alerts, and vibrations.
 */

'use strict';

window.Utils = (() => {

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = localStorage.getItem('mj_muted') === 'true';
    }

    _init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      localStorage.setItem('mj_muted', String(this.muted));
      return this.muted;
    }

    isMuted() {
      return this.muted;
    }

    play(name) {
      if (this.muted) return;
      this._init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      switch (name) {
        case 'click':
          this._playTileClick(now);
          break;
        case 'match':
          this._playTileMatch(now);
          break;
        case 'blocked':
          this._playBlocked(now);
          break;
        case 'gong':
          this._playGong(now);
          break;
        case 'shuffle':
          this._playShuffle(now);
          break;
        case 'undo':
          this._playUndo(now);
          break;
        case 'lotus':
          this._playLotus(now);
          break;
      }
    }

    _playTileClick(now) {
      // Crisp ceramic/bone tile clack
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    }

    _playTileMatch(now) {
      // Harmonic pentatonic Guzheng chime (G4, C5, D5, G5)
      const notes = [392.00, 523.25, 587.33, 783.99];
      notes.forEach((freq, i) => {
        const t = now + i * 0.035;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    }

    _playBlocked(now) {
      // Dull wooden thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }

    _playGong(now) {
      // Deep resonant bronze temple gong
      const fundamental = 110; // A2
      const partials = [1, 2.05, 3.12, 4.25, 5.4];
      const gains = [0.4, 0.25, 0.15, 0.1, 0.05];

      partials.forEach((p, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(fundamental * p, now);
        gain.gain.setValueAtTime(gains[idx], now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 2.8);
      });
    }

    _playShuffle(now) {
      // Rapid rustle of wooden tiles sliding across table
      for (let i = 0; i < 6; i++) {
        const t = now + i * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300 + Math.random() * 200, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.035);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.035);
      }
    }

    _playUndo(now) {
      // Soft gentle rewind chimes
      [659.25, 523.25, 392.00].forEach((freq, i) => {
        const t = now + i * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    }

    _playLotus(now) {
      // Celestial rising harp shimmer
      const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      freqs.forEach((freq, i) => {
        const t = now + i * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    }
  }

  class GameTimer {
    constructor(onTick, initialElapsed = 0) {
      this.onTick = onTick;
      this.elapsed = initialElapsed;
      this.intervalId = null;
      this.running = false;
    }

    start(initialElapsed) {
      if (initialElapsed !== undefined) {
        this.elapsed = initialElapsed;
      }
      if (this.running) return;
      this.running = true;

      if (this.onTick) this.onTick(this.elapsed);

      this.intervalId = setInterval(() => {
        this.elapsed++;
        if (this.onTick) this.onTick(this.elapsed);
      }, 1000);
    }

    pause() {
      this.running = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }

    reset() {
      this.pause();
      this.elapsed = 0;
      if (this.onTick) this.onTick(0);
    }

    getElapsed() {
      return this.elapsed;
    }
  }

  function showToast(message, duration = 2500, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('toast--visible'));

    setTimeout(() => {
      toast.classList.remove('toast--visible');
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function vibrate(pattern = [50]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  const sound = new SoundEngine();

  return {
    sound,
    GameTimer,
    showToast,
    vibrate
  };

})();
