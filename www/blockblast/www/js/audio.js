/* ==========================================================================
   audio.js — Procedural Web Audio API Sound Effects
   Timber Block Blast
   ========================================================================== */

(function(window) {
  'use strict';

  let audioCtx = null;
  let isMuted = false;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.18) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  const SoundFX = {
    toggleMute() {
      isMuted = !isMuted;
      localStorage.setItem('blockblast_sound_muted', isMuted ? 'true' : 'false');
      return isMuted;
    },

    isMuted() {
      return isMuted;
    },

    initMuteState() {
      isMuted = localStorage.getItem('blockblast_sound_muted') === 'true';
    },

    // Tactile pickup sound
    playPickUp() {
      if (isMuted) return;
      playTone(520, 'triangle', 0.05, 0.15);
      setTimeout(() => playTone(680, 'sine', 0.04, 0.12), 20);
    },

    // Satisfying wooden block placement thud
    playPlace() {
      if (isMuted) return;
      playTone(280, 'triangle', 0.08, 0.25);
      setTimeout(() => playTone(140, 'sine', 0.07, 0.2), 25);
    },

    // Line Blast: musical chord with pitch scaling according to combo multiplier
    playLineBlast(combo = 1) {
      if (isMuted) return;
      const baseFreqs = [
        [392, 523.25, 659.25],         // Combo 1: G4, C5, E5
        [440, 554.37, 659.25, 880],    // Combo 2: A4, C#5, E5, A5
        [523.25, 659.25, 783.99, 1046.5], // Combo 3: C5, E5, G5, C6
        [587.33, 739.99, 880, 1174.66],   // Combo 4: D5, F#5, A5, D6
        [659.25, 830.61, 987.77, 1318.51] // Combo 5+: E5, G#5, B5, E6
      ];
      const idx = Math.min(baseFreqs.length - 1, Math.max(0, combo - 1));
      const chord = baseFreqs[idx];

      chord.forEach((f, i) => {
        setTimeout(() => {
          playTone(f, 'triangle', 0.22, 0.18);
        }, i * 35);
      });
    },

    // Multi-line explosive blast
    playMultiBlast(lines = 2) {
      if (isMuted) return;
      // Sub-bass thump
      playTone(90, 'sine', 0.25, 0.3);
      // Sparkle cascade
      const sparkles = [784, 987.77, 1174.66, 1567.98];
      sparkles.forEach((f, i) => {
        setTimeout(() => playTone(f, 'sine', 0.18, 0.14), 40 + i * 45);
      });
    },

    // Bomb powerup explosion
    playBomb() {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const bufferSize = ctx.sampleRate * 0.25;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
      } catch (_) {}
    },

    // Powerup Rotate / Reroll whoosh
    playRotate() {
      if (isMuted) return;
      playTone(320, 'triangle', 0.08, 0.16);
      setTimeout(() => playTone(480, 'sine', 0.09, 0.18), 45);
    },

    // High Score fanfare
    playNewRecord() {
      if (isMuted) return;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 'triangle', 0.35, 0.2), i * 85);
      });
    },

    // Game Over descending thud
    playGameOver() {
      if (isMuted) return;
      const notes = [330, 293.66, 261.63, 196];
      notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 'sawtooth', 0.3, 0.16), i * 110);
      });
    }
  };

  SoundFX.initMuteState();
  window.SoundFX = SoundFX;
})(window);
