/* ==========================================================================
   audio.js — Procedural Web Audio API Sound Effects
   Royal Spades
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
      localStorage.setItem('spades_sound_muted', isMuted ? 'true' : 'false');
      return isMuted;
    },

    isMuted() {
      return isMuted;
    },

    initMuteState() {
      isMuted = localStorage.getItem('spades_sound_muted') === 'true';
    },

    // Card Deal Whoosh
    playDealWhoosh() {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      try {
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
      } catch (_) {}
    },

    // Crisp card snap onto table
    playCardSnap() {
      if (isMuted) return;
      playTone(480, 'triangle', 0.08, 0.22);
      setTimeout(() => playTone(240, 'sine', 0.06, 0.15), 25);
    },

    // Trump card played (magical chime)
    playTrumpCut() {
      if (isMuted) return;
      const notes = [587.33, 739.99, 880.00]; // D5, F#5, A5
      notes.forEach((freq, idx) => {
        setTimeout(() => playTone(freq, 'sine', 0.2, 0.15), idx * 60);
      });
    },

    // 2's Wild Supreme Trump played
    playTwosWildSnap() {
      if (isMuted) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => playTone(freq, 'triangle', 0.25, 0.18), idx * 50);
      });
    },

    // Trick Winner
    playTrickWin() {
      if (isMuted) return;
      playTone(330, 'sine', 0.12, 0.12);
      setTimeout(() => playTone(493.88, 'sine', 0.18, 0.14), 70);
    },

    // Spades Broken Fanfare
    playSpadesBroken() {
      if (isMuted) return;
      playTone(311.13, 'sawtooth', 0.2, 0.1);
      setTimeout(() => playTone(415.30, 'triangle', 0.25, 0.15), 100);
    },

    // Successful Nil Bonus Fanfare
    playNilSuccess() {
      if (isMuted) return;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 'triangle', 0.3, 0.2), i * 90);
      });
    },

    // Failed Nil Thud
    playNilBusted() {
      if (isMuted) return;
      playTone(185, 'sawtooth', 0.35, 0.25);
      setTimeout(() => playTone(130, 'sine', 0.4, 0.3), 120);
    },

    // Game Victory Fanfare
    playVictory() {
      if (isMuted) return;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 'triangle', 0.45, 0.22), i * 110);
      });
    },

    // Defeat
    playDefeat() {
      if (isMuted) return;
      const notes = [392, 349.23, 311.13, 261.63];
      notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 'sawtooth', 0.35, 0.18), i * 140);
      });
    }
  };

  SoundFX.initMuteState();
  window.SoundFX = SoundFX;
})(window);
