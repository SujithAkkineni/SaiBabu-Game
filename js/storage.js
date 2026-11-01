/**
 * Storage Manager
 * Persistent state management using localStorage with graceful fallback.
 */

import { CONFIG } from './config.js';

const STORAGE_KEYS = {
  HIGH_SCORE: 'aeropulse_high_score',
  THEME: 'aeropulse_theme',
  SOUND_ENABLED: 'aeropulse_sound_enabled',
  MUSIC_ENABLED: 'aeropulse_music_enabled',
  VOLUME: 'aeropulse_volume',
  DIFFICULTY: 'aeropulse_difficulty',
  REDUCED_MOTION: 'aeropulse_reduced_motion',
  STATS: 'aeropulse_stats',
};

class StorageManager {
  constructor() {
    this.isAvailable = this.checkAvailability();
    this.cache = {};
  }

  checkAvailability() {
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getItem(key, defaultValue = null) {
    if (!this.isAvailable) {
      return this.cache[key] !== undefined ? this.cache[key] : defaultValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch {
      return defaultValue;
    }
  }

  setItem(key, value) {
    if (!this.isAvailable) {
      this.cache[key] = value;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage write failed:', e);
    }
  }

  // --- High Score ---
  getHighScore(difficulty = 'normal') {
    const scores = this.getItem(STORAGE_KEYS.HIGH_SCORE, {});
    return typeof scores === 'object' && scores !== null ? (scores[difficulty] || 0) : 0;
  }

  setHighScore(score, difficulty = 'normal') {
    const scores = this.getItem(STORAGE_KEYS.HIGH_SCORE, {}) || {};
    const currentBest = scores[difficulty] || 0;
    if (score > currentBest) {
      scores[difficulty] = score;
      this.setItem(STORAGE_KEYS.HIGH_SCORE, scores);
      return true; // New high score achieved!
    }
    return false;
  }

  // --- Theme ---
  getTheme() {
    const saved = this.getItem(STORAGE_KEYS.THEME, null);
    if (saved) return saved;
    // Fall back to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  setTheme(theme) {
    this.setItem(STORAGE_KEYS.THEME, theme);
  }

  // --- Sound & Music ---
  getSoundEnabled() {
    return this.getItem(STORAGE_KEYS.SOUND_ENABLED, true);
  }

  setSoundEnabled(enabled) {
    this.setItem(STORAGE_KEYS.SOUND_ENABLED, Boolean(enabled));
  }

  getMusicEnabled() {
    return this.getItem(STORAGE_KEYS.MUSIC_ENABLED, CONFIG.audio?.musicByDefault ?? true);
  }

  setMusicEnabled(enabled) {
    this.setItem(STORAGE_KEYS.MUSIC_ENABLED, Boolean(enabled));
  }

  getVolume() {
    return this.getItem(STORAGE_KEYS.VOLUME, 0.7);
  }

  setVolume(volume) {
    this.setItem(STORAGE_KEYS.VOLUME, Math.max(0, Math.min(1, volume)));
  }

  // --- Difficulty ---
  getDifficulty() {
    return this.getItem(STORAGE_KEYS.DIFFICULTY, 'normal');
  }

  setDifficulty(difficulty) {
    this.setItem(STORAGE_KEYS.DIFFICULTY, difficulty);
  }

  // --- Reduced Motion ---
  getReducedMotion() {
    const saved = this.getItem(STORAGE_KEYS.REDUCED_MOTION, null);
    if (saved !== null) return saved;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }
    return false;
  }

  setReducedMotion(reduced) {
    this.setItem(STORAGE_KEYS.REDUCED_MOTION, Boolean(reduced));
  }

  // --- Cumulative Stats ---
  getStats() {
    return this.getItem(STORAGE_KEYS.STATS, {
      gamesPlayed: 0,
      totalScore: 0,
      bestScoreOverall: 0,
    });
  }

  recordGame(score) {
    const stats = this.getStats();
    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    stats.totalScore = (stats.totalScore || 0) + score;
    stats.bestScoreOverall = Math.max(stats.bestScoreOverall || 0, score);
    this.setItem(STORAGE_KEYS.STATS, stats);
    return stats;
  }
}

export const storage = new StorageManager();
