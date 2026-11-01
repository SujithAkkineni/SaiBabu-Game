/**
 * Audio Manager using Web Audio API
 * Synthesizes high-fidelity sound effects with zero external audio dependencies.
 * Includes procedural ambient background music and support for external audio tracks.
 */

import { CONFIG } from './config.js';
import { storage } from './storage.js';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.isInitialized = false;

    this.soundEnabled = storage.getSoundEnabled();
    this.musicEnabled = storage.getMusicEnabled();
    this.volume = storage.getVolume();

    // Procedural ambient synth timer
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.externalBgmAudio = null;

    // Auto-unlock listener
    this.unlockAudio = this.unlockAudio.bind(this);
    window.addEventListener('pointerdown', this.unlockAudio, { once: true });
    window.addEventListener('keydown', this.unlockAudio, { once: true });
  }

  init() {
    if (this.isInitialized && this.ctx) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported in this browser.');
        return;
      }
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.soundEnabled ? 1 : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music Gain
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.35 : 0, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext initialization failed:', e);
    }
  }

  unlockAudio() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    // Resume external background music on user interaction if waiting on autoplay
    if (this.musicEnabled && this.externalBgmAudio && this.externalBgmAudio.paused && CONFIG.audio.bgmUrl) {
      this.externalBgmAudio.play().catch(() => {});
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    storage.setVolume(this.volume);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    if (this.externalBgmAudio) {
      this.externalBgmAudio.volume = this.volume * 0.45;
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
    storage.setSoundEnabled(this.soundEnabled);
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.soundEnabled ? 1 : 0, this.ctx.currentTime, 0.05);
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);
    storage.setMusicEnabled(this.musicEnabled);
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.35 : 0, this.ctx.currentTime, 0.05);
    }
    if (this.musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  // --- Sound Effects ---

  /**
   * Play custom external audio clip with current volume multiplier
   */
  playCustomSound(url, volMultiplier = 1.0) {
    if (!this.soundEnabled || !url) return;
    try {
      const sound = new Audio(url);
      sound.volume = Math.max(0, Math.min(1, this.volume * volMultiplier));
      sound.play().catch(() => {});
    } catch (e) {
      console.warn(`Failed to play custom sound (${url}):`, e);
    }
  }

  /**
   * Flap sound: dynamic jet thruster impulse + quick tonal whoosh
   */
  playFlap() {
    if (!this.soundEnabled) return;
    this.unlockAudio();

    // Check for custom flap audio file
    if (CONFIG.audio.sfx?.flap) {
      this.playCustomSound(CONFIG.audio.sfx.flap, 0.7);
      return;
    }

    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Pitch sweep oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(460, t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.14);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.15);

    // Filtered noise puff for realistic aerodynamic rush
    this.playNoisePuff(t, 0.09, 0.12, 1400);
  }

  playNoisePuff(startTime, duration, peakGain, filterFreq) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peakGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  /**
   * Score sound: crisp, harmonic crystal chime
   */
  playScore() {
    if (!this.soundEnabled) return;
    this.unlockAudio();

    // Check for custom score audio file
    if (CONFIG.audio.sfx?.score) {
      this.playCustomSound(CONFIG.audio.sfx.score, 0.8);
      return;
    }

    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [659.25, 987.77]; // E5, B5

    notes.forEach((freq, idx) => {
      const start = t + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.32);
    });
  }

  /**
   * Hit / Collision sound: Punchy bass thud + metallic noise crunch
   */
  playHit() {
    if (!this.soundEnabled) return;
    this.unlockAudio();

    // Check for custom hit audio file
    if (CONFIG.audio.sfx?.hit) {
      this.playCustomSound(CONFIG.audio.sfx.hit, 0.9);
      return;
    }

    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Sub-bass impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.28);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.3);

    // Crunch noise
    this.playNoisePuff(t, 0.22, 0.38, 750);
  }

  /**
   * Swoosh / Screen Transition sound
   */
  playSwoosh() {
    if (!this.soundEnabled || !this.ctx) return;
    this.unlockAudio();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.12);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Celebration fanfare for "New Best!" score
   */
  playNewBest() {
    if (!this.soundEnabled || !this.ctx) return;
    this.unlockAudio();

    const t = this.ctx.currentTime;
    // Radiant C-major chord arpeggio
    const arpeggio = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    arpeggio.forEach((freq, i) => {
      const noteTime = t + i * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.45);
    });
  }

  // --- Background Music (Generative Synth & External Audio) ---

  startMusic(reset = false) {
    if (!this.musicEnabled) return;

    // If external BGM configured
    if (CONFIG.audio.bgmUrl) {
      try {
        if (!this.externalBgmAudio || this.externalBgmAudio.getAttribute('src') !== CONFIG.audio.bgmUrl) {
          this.externalBgmAudio = new Audio(CONFIG.audio.bgmUrl);
          this.externalBgmAudio.loop = true;
        }
        if (reset) {
          try {
            this.externalBgmAudio.currentTime = 0;
          } catch (_) {}
        }
        this.externalBgmAudio.loop = true;
        this.externalBgmAudio.volume = this.volume * 0.45;
        this.externalBgmAudio.play().catch(e => {
          console.warn('Autoplay waiting for user gesture or BGM failed:', e);
        });
        return;
      } catch (e) {
        console.warn('External BGM failed, falling back to generative synth', e);
      }
    }

    // Procedural ambient cyber music
    this.stopMusic();
    this.scheduleNextAmbientChord();
  }

  scheduleNextAmbientChord() {
    if (!this.musicEnabled || !this.ctx) return;

    // Hypnotic chord progression (Am7 -> Fmaj7 -> Cmaj7 -> Gsus4)
    const chords = [
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 261.63, 329.63, 392.00], // Fmaj7
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [196.00, 246.94, 293.66, 392.00], // Gsus4
    ];

    const chord = chords[this.bgmStep % chords.length];
    this.bgmStep++;

    const t = this.ctx.currentTime;
    const chordDuration = 3.2;

    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700 + idx * 180, t);
      filter.frequency.linearRampToValueAtTime(1100, t + chordDuration * 0.5);
      filter.frequency.linearRampToValueAtTime(650, t + chordDuration);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.8);
      gain.gain.linearRampToValueAtTime(0.001, t + chordDuration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + chordDuration);
    });

    this.bgmTimer = setTimeout(() => {
      this.scheduleNextAmbientChord();
    }, (chordDuration - 0.4) * 1000);
  }

  stopMusic(reset = false) {
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.externalBgmAudio) {
      this.externalBgmAudio.pause();
      if (reset) {
        try {
          this.externalBgmAudio.currentTime = 0;
        } catch (_) {}
      }
    }
  }
}

export const audio = new AudioManager();
