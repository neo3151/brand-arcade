/**
 * BLACK VAULT — utils.js
 * 1970s Espionage analog procedural Web Audio synthesizer, GameTimer, Toast alerts, and vibrations.
 */

'use strict';

window.Utils = (() => {

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = localStorage.getItem('bv_muted') === 'true';
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
      localStorage.setItem('bv_muted', String(this.muted));
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
        case 'typewriter':
          this._playTypewriter(now);
          break;
        case 'relay':
          this._playRelay(now);
          break;
        case 'stamp':
          this._playStamp(now);
          break;
        case 'decrypt':
          this._playDecrypt(now);
          break;
        case 'filter':
          this._playFilter(now);
          break;
        case 'rewind':
          this._playRewind(now);
          break;
        case 'probe':
          this._playProbe(now);
          break;
        case 'vault':
          this._playVault(now);
          break;
        case 'compromised':
          this._playCompromised(now);
          break;
      }
    }

    _playTypewriter(now) {
      // Mechanical strike + metallic spring ring
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.03);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    }

    _playRelay(now) {
      // Heavy solenoid / pin socket clunk
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.06);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }

    _playStamp(now) {
      // Ink teletype ratchet stamp
      [0, 0.04, 0.08].forEach((dt, i) => {
        const t = now + dt;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(500 + i * 150, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.03);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.03);
      });
    }

    _playDecrypt(now) {
      // High-speed telemetry descrambler bleep
      [440, 660, 880, 1100].forEach((freq, i) => {
        const t = now + i * 0.035;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.04);
      });
    }

    _playFilter(now) {
      // Frequency cutoff / white noise slice
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }

    _playRewind(now) {
      // Analog magnetic tape whir
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.35);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }

    _playProbe(now) {
      // Wiretap check tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.08); // High D
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    _playVault(now) {
      // Vault bolt slide + Cold War victory fanfare (Major triad)
      const notes = [
        { freq: 261.63, time: 0, dur: 0.2 },      // C4
        { freq: 329.63, time: 0.15, dur: 0.2 },   // E4
        { freq: 392.00, time: 0.3, dur: 0.25 },   // G4
        { freq: 523.25, time: 0.5, dur: 0.7 }     // C5
      ];

      notes.forEach(n => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + n.time;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + n.dur);
      });
    }

    _playCompromised(now) {
      // Emergency klaxon horn siren
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(650, now + 0.2);
      osc.frequency.linearRampToValueAtTime(350, now + 0.4);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
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
