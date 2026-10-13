/**
 * INFERNO SWEEPER — utils.js
 * Web Audio procedural sound synthesizer, GameTimer, Toast alerts, and Face SVGs
 */

'use strict';

window.Utils = (() => {

  // ---------------------------------------------------------------------------
  // Web Audio Synthesizer (90s Industrial Sci-Fi & Heavy Metal FX)
  // ---------------------------------------------------------------------------
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = localStorage.getItem('inferno_muted') === 'true';
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
      localStorage.setItem('inferno_muted', String(this.muted));
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
          this._playClick(now);
          break;
        case 'dig':
          this._playDig(now);
          break;
        case 'cascade':
          this._playCascade(now);
          break;
        case 'flag':
          this._playFlag(now);
          break;
        case 'unflag':
          this._playUnflag(now);
          break;
        case 'explosion':
          this._playExplosion(now);
          break;
        case 'shield':
          this._playShield(now);
          break;
        case 'scan':
          this._playScan(now);
          break;
        case 'clairvoyance':
          this._playClairvoyance(now);
          break;
        case 'strike':
          this._playStrike(now);
          break;
        case 'win':
          this._playWin(now);
          break;
      }
    }

    _playClick(now) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    }

    _playDig(now) {
      // Heavy mechanical plate thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    }

    _playCascade(now) {
      // Rapid ascending high tech chatter
      [440, 660, 880].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.025;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      });
    }

    _playFlag(now) {
      // High-frequency beacon chirp
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    }

    _playUnflag(now) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.06);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }

    _playExplosion(now) {
      // Sub-bass detonation + white noise burst
      const bufferSize = this.ctx.sampleRate * 0.7;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + 0.6);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.9, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);

      // Deep sub boom
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(120, now);
      sub.frequency.exponentialRampToValueAtTime(25, now + 0.5);
      subGain.gain.setValueAtTime(0.8, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(now);
      sub.stop(now + 0.6);
    }

    _playShield(now) {
      // Forcefield deflection hum
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.15);
      osc.frequency.linearRampToValueAtTime(600, now + 0.35);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }

    _playScan(now) {
      // Radar ping
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }

    _playClairvoyance(now) {
      // Cybernetic chime
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + i * 0.05;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    }

    _playStrike(now) {
      // EMP descent
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }

    _playWin(now) {
      // Heavy metal victory power chord riff (E5 -> G5 -> A5 -> B5)
      const chords = [
        { freqs: [164.81, 247.94], time: 0, dur: 0.18 },     // E3, B3
        { freqs: [196.00, 293.66], time: 0.2, dur: 0.18 },   // G3, D4
        { freqs: [220.00, 329.63], time: 0.4, dur: 0.22 },   // A3, E4
        { freqs: [246.94, 370.00, 493.88], time: 0.65, dur: 0.8 } // B3, F#4, B4
      ];

      chords.forEach(c => {
        c.freqs.forEach(freq => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const t = now + c.time;
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + c.dur);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + c.dur);
        });
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Game Timer Class (Handles instant tick, resume, and pause)
  // ---------------------------------------------------------------------------
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

      // Immediate paint
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
  }

  // ---------------------------------------------------------------------------
  // Toast Notifications
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // SVG Status Face Mugshots (90s Retro FPS Marine Expressions)
  // ---------------------------------------------------------------------------
  const FACES = {
    IDLE: `
      <svg viewBox="0 0 44 44" class="face-svg" aria-label="Status: Ready">
        <!-- Helmet / Armor -->
        <rect x="7" y="5" width="30" height="10" rx="3" fill="#3b4252" />
        <rect x="5" y="11" width="34" height="26" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1.5" />
        <!-- Face skin -->
        <rect x="10" y="14" width="24" height="18" rx="2" fill="#d08770" />
        <!-- Eyes looking center -->
        <rect x="14" y="18" width="4" height="3" fill="#eceff4" />
        <rect x="15" y="19" width="2" height="2" fill="#2e3440" />
        <rect x="26" y="18" width="4" height="3" fill="#eceff4" />
        <rect x="27" y="19" width="2" height="2" fill="#2e3440" />
        <!-- Stern eyebrows -->
        <line x1="13" y1="16" x2="19" y2="17" stroke="#4c566a" stroke-width="1.5" />
        <line x1="31" y1="16" x2="25" y2="17" stroke="#4c566a" stroke-width="1.5" />
        <!-- Determined mouth -->
        <line x1="17" y1="27" x2="27" y2="27" stroke="#4c566a" stroke-width="2" />
      </svg>`,

    SURPRISED: `
      <svg viewBox="0 0 44 44" class="face-svg" aria-label="Status: Shock / Pressing">
        <rect x="7" y="5" width="30" height="10" rx="3" fill="#3b4252" />
        <rect x="5" y="11" width="34" height="26" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1.5" />
        <rect x="10" y="14" width="24" height="18" rx="2" fill="#d08770" />
        <!-- Wide Eyes -->
        <rect x="13" y="17" width="6" height="5" fill="#eceff4" />
        <circle cx="16" cy="19.5" r="1.5" fill="#2e3440" />
        <rect x="25" y="17" width="6" height="5" fill="#eceff4" />
        <circle cx="28" cy="19.5" r="1.5" fill="#2e3440" />
        <!-- High Arch Eyebrows -->
        <line x1="13" y1="15" x2="19" y2="14" stroke="#4c566a" stroke-width="1.5" />
        <line x1="31" y1="15" x2="25" y2="14" stroke="#4c566a" stroke-width="1.5" />
        <!-- O-shaped Mouth -->
        <circle cx="22" cy="27" r="3" fill="#4c566a" stroke="#2e3440" stroke-width="1" />
      </svg>`,

    WORRIED: `
      <svg viewBox="0 0 44 44" class="face-svg" aria-label="Status: Gritted Teeth">
        <rect x="7" y="5" width="30" height="10" rx="3" fill="#3b4252" />
        <rect x="5" y="11" width="34" height="26" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1.5" />
        <rect x="10" y="14" width="24" height="18" rx="2" fill="#d08770" />
        <!-- Gritted Eyes -->
        <line x1="13" y1="19" x2="19" y2="19" stroke="#2e3440" stroke-width="2" />
        <line x1="25" y1="19" x2="31" y2="19" stroke="#2e3440" stroke-width="2" />
        <!-- Clenched teeth mouth -->
        <rect x="16" y="25" width="12" height="4" fill="#eceff4" stroke="#4c566a" stroke-width="1" />
        <line x1="20" y1="25" x2="20" y2="29" stroke="#4c566a" stroke-width="1" />
        <line x1="24" y1="25" x2="24" y2="29" stroke="#4c566a" stroke-width="1" />
      </svg>`,

    DEAD: `
      <svg viewBox="0 0 44 44" class="face-svg" aria-label="Status: KIA">
        <rect x="7" y="5" width="30" height="10" rx="3" fill="#7f1d1d" />
        <rect x="5" y="11" width="34" height="26" rx="4" fill="#450a0a" stroke="#dc2626" stroke-width="1.5" />
        <rect x="10" y="14" width="24" height="18" rx="2" fill="#b91c1c" />
        <!-- X-Eyes -->
        <line x1="14" y1="17" x2="18" y2="21" stroke="#fef08a" stroke-width="2" />
        <line x1="18" y1="17" x2="14" y2="21" stroke="#fef08a" stroke-width="2" />
        <line x1="26" y1="17" x2="30" y2="21" stroke="#fef08a" stroke-width="2" />
        <line x1="30" y1="17" x2="26" y2="21" stroke="#fef08a" stroke-width="2" />
        <!-- Broken Jaw -->
        <rect x="17" y="26" width="10" height="4" fill="#000" />
      </svg>`,

    WIN: `
      <svg viewBox="0 0 44 44" class="face-svg" aria-label="Status: Victorious Smirk">
        <rect x="7" y="5" width="30" height="10" rx="3" fill="#3b4252" />
        <rect x="5" y="11" width="34" height="26" rx="4" fill="#2e3440" stroke="#06b6d4" stroke-width="1.5" />
        <rect x="10" y="14" width="24" height="18" rx="2" fill="#d08770" />
        <!-- Cool Cyan Visor / Shades -->
        <polygon points="12,17 32,17 30,22 14,22" fill="#0891b2" stroke="#22d3ee" stroke-width="1" />
        <line x1="15" y1="18" x2="29" y2="18" stroke="#a5f3fc" stroke-width="1" />
        <!-- Grinning Smirk -->
        <path d="M 16 26 Q 23 31 29 25" fill="none" stroke="#2e3440" stroke-width="2" stroke-linecap="round" />
      </svg>`
  };

  const sound = new SoundEngine();

  return {
    sound,
    GameTimer,
    showToast,
    vibrate,
    FACES
  };

})();
