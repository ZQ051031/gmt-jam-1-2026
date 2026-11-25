// Procedural WebAudio synthesizer for Star Shepherd (zero external audio files)
(function (global) {
  'use strict';

  const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.muted = false;
      this.noiseBuffer = null;

      try {
        const saved = localStorage.getItem('star_shepherd_muted_v1');
        if (saved === '1') this.muted = true;
      } catch (_) {
        // Ignore storage errors in private browsing
      }
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return;
      }
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return;

      try {
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.42;
        this.master.connect(this.ctx.destination);
        this.noiseBuffer = this._createNoiseBuffer();
      } catch (_) {
        this.ctx = null;
      }
    }

    _createNoiseBuffer() {
      if (!this.ctx) return null;
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * 1.2;
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }

    setMuted(flag) {
      this.muted = Boolean(flag);
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(this.muted ? 0 : 0.42, this.ctx.currentTime, 0.02);
      }
      try {
        localStorage.setItem('star_shepherd_muted_v1', this.muted ? '1' : '0');
      } catch (_) {}
      return this.muted;
    }

    toggleMute() {
      return this.setMuted(!this.muted);
    }

    _ready() {
      if (this.muted) return false;
      if (!this.ctx) this.init();
      if (!this.ctx || !this.master) return false;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    _tone(freq, duration, type, volume, delay = 0, endFreq = null) {
      if (!this._ready()) return;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    _noise(duration, filterFreq, q, volume, delay = 0, filterType = 'bandpass') {
      if (!this._ready() || !this.noiseBuffer) return;
      const now = this.ctx.currentTime + delay;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, now);
      filter.Q.value = q;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(now);
      src.stop(now + duration + 0.03);
    }

    playBounce(combo = 1, kind = 'star') {
      const idx = Math.min(PENTATONIC.length - 1, Math.max(0, combo - 1));
      const base = PENTATONIC[idx];
      if (kind === 'wish') {
        this._tone(base * 1.25, 0.28, 'sine', 0.24, 0, base * 1.5);
        this._tone(base * 1.5, 0.24, 'triangle', 0.16, 0.05);
      } else if (kind === 'moonbeam') {
        this._tone(base * 0.75, 0.36, 'sine', 0.24, 0);
        this._tone(base * 1.5, 0.32, 'sine', 0.14, 0.04);
      } else {
        this._tone(base, 0.24, 'triangle', 0.22, 0, base * 1.06);
        this._tone(base * 2, 0.16, 'sine', 0.1, 0.02);
      }
    }

    playConstellationStar(litCount, total) {
      const ratio = total > 0 ? litCount / total : 0.5;
      const idx = Math.min(PENTATONIC.length - 1, Math.floor(ratio * 7) + 2);
      const f = PENTATONIC[idx];
      this._tone(f, 0.42, 'sine', 0.24, 0);
      this._tone(f * 1.5, 0.38, 'triangle', 0.14, 0.04);
    }

    playConstellationComplete() {
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
      notes.forEach((n, i) => {
        this._tone(n, 0.58, 'sine', 0.2, i * 0.075);
        this._tone(n * 0.5, 0.55, 'triangle', 0.1, i * 0.075);
      });
    }

    playGust() {
      this._noise(0.24, 900, 1.2, 0.22, 0, 'bandpass');
      this._tone(240, 0.18, 'sine', 0.12, 0, 540);
    }

    playPowerup() {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((n, i) => {
        this._tone(n, 0.26, 'triangle', 0.18, i * 0.055);
      });
    }

    playMeteorSmash() {
      this._noise(0.22, 520, 0.9, 0.28, 0, 'lowpass');
      this._tone(340, 0.18, 'triangle', 0.2, 0, 680);
      this._tone(680, 0.22, 'sine', 0.15, 0.05, 960);
    }

    playLightningWarn() {
      this._tone(620, 0.12, 'sawtooth', 0.06, 0, 740);
    }

    playLightningStrike() {
      this._noise(0.35, 1600, 0.7, 0.28, 0, 'highpass');
      this._noise(0.5, 180, 0.8, 0.26, 0.04, 'lowpass');
      this._tone(120, 0.35, 'sawtooth', 0.14, 0, 48);
    }

    playBossHit() {
      this._noise(0.25, 360, 1.0, 0.24, 0, 'bandpass');
      this._tone(190, 0.26, 'sawtooth', 0.16, 0, 95);
      this._tone(523.25, 0.3, 'sine', 0.18, 0.05, 659.25);
    }

    playHurt() {
      this._tone(210, 0.28, 'sawtooth', 0.22, 0, 95);
      this._noise(0.25, 320, 1.0, 0.24, 0, 'lowpass');
    }

    playShieldBreak() {
      this._tone(740, 0.22, 'sine', 0.2, 0, 320);
      this._tone(1100, 0.18, 'triangle', 0.16, 0.03, 440);
    }

    playMiss() {
      this._tone(260, 0.18, 'sine', 0.1, 0, 175);
    }

    playGameOver() {
      const notes = [392.0, 349.23, 329.63, 261.63];
      notes.forEach((n, i) => {
        this._tone(n, 0.45, 'triangle', 0.18, i * 0.14);
      });
    }

    playUiClick() {
      this._tone(587.33, 0.1, 'sine', 0.14, 0, 783.99);
    }
  }

  global.SoundEngine = SoundEngine;
})(window);
