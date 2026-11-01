/**
 * UI & Screen Manager
 * Manages DOM overlays, glassmorphism modals, score pop animations,
 * theme transitions, settings controls, and accessibility.
 */

import { CONFIG } from './config.js';
import { storage } from './storage.js';
import { audio } from './audio.js';

export class UIManager {
  constructor(gameCallbacks) {
    this.callbacks = gameCallbacks;

    // DOM Screen Elements
    this.startScreen = document.getElementById('start-screen');
    this.readyScreen = document.getElementById('ready-screen');
    this.hudScreen = document.getElementById('hud-screen');
    this.pauseModal = document.getElementById('pause-modal');
    this.gameOverModal = document.getElementById('game-over-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.statsModal = document.getElementById('stats-modal');

    // HUD & Score Elements
    this.hudScore = document.getElementById('hud-score');
    this.goScore = document.getElementById('go-score');
    this.goBestScore = document.getElementById('go-best-score');
    this.newBestBadge = document.getElementById('new-best-badge');
    this.medalContainer = document.getElementById('medal-container');
    this.medalName = document.getElementById('medal-name');
    this.startBestScore = document.getElementById('start-best-score');

    // Controls & Settings Elements
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    this.soundToggleBtn = document.getElementById('sound-toggle-btn');
    this.settingSound = document.getElementById('setting-sound');
    this.settingMusic = document.getElementById('setting-music');
    this.settingVolume = document.getElementById('setting-volume');
    this.settingReducedMotion = document.getElementById('setting-reduced-motion');
    this.difficultyRadios = document.querySelectorAll('input[name="difficulty"]');

    // Initialize UI State
    this.currentTheme = storage.getTheme();
    this.applyTheme(this.currentTheme);
    this.applyReducedMotion(storage.getReducedMotion());
    this.bindEvents();
    this.updateSettingsUI();
    this.updateStartScreenStats();
  }

  bindEvents() {
    // Start Screen Buttons
    document.getElementById('btn-play')?.addEventListener('click', () => {
      audio.playSwoosh();
      this.callbacks.onStartPlay();
    });

    document.getElementById('btn-settings-open')?.addEventListener('click', () => {
      audio.playSwoosh();
      this.openSettings();
    });

    document.getElementById('btn-stats-open')?.addEventListener('click', () => {
      audio.playSwoosh();
      this.openStats();
    });

    // Pause & Resume
    document.getElementById('btn-pause')?.addEventListener('click', () => {
      audio.playSwoosh();
      this.callbacks.onTogglePause();
    });

    document.getElementById('btn-resume')?.addEventListener('click', () => {
      audio.playSwoosh();
      this.callbacks.onResume();
    });

    document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
      audio.playSwoosh();
      this.closeModal(this.pauseModal);
      this.callbacks.onRestart();
    });

    document.getElementById('btn-pause-menu')?.addEventListener('click', () => {
      audio.playSwoosh();
      this.closeModal(this.pauseModal);
      this.callbacks.onGoMenu();
    });

    // Game Over Buttons
    document.getElementById('btn-replay')?.addEventListener('click', () => {
      audio.playSwoosh();
      this.callbacks.onRestart();
    });

    document.getElementById('btn-menu')?.addEventListener('click', () => {
      audio.playSwoosh();
      this.callbacks.onGoMenu();
    });

    // Settings Modal
    document.getElementById('btn-settings-close')?.addEventListener('click', () => {
      audio.playSwoosh();
      this.closeModal(this.settingsModal);
    });

    this.settingSound?.addEventListener('change', (e) => {
      audio.setSoundEnabled(e.target.checked);
      this.updateQuickSoundButton();
    });

    this.settingMusic?.addEventListener('change', (e) => {
      audio.setMusicEnabled(e.target.checked);
    });

    this.settingVolume?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      audio.setVolume(val);
    });

    this.settingReducedMotion?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      storage.setReducedMotion(checked);
      this.applyReducedMotion(checked);
    });

    this.difficultyRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          storage.setDifficulty(e.target.value);
          this.updateStartScreenStats();
        }
      });
    });

    // Stats Modal
    document.getElementById('btn-stats-close')?.addEventListener('click', () => {
      audio.playSwoosh();
      this.closeModal(this.statsModal);
    });

    // Quick Top-Bar Buttons
    this.themeToggleBtn?.addEventListener('click', () => {
      this.toggleTheme();
    });

    this.soundToggleBtn?.addEventListener('click', () => {
      const newState = !audio.soundEnabled;
      audio.setSoundEnabled(newState);
      if (this.settingSound) this.settingSound.checked = newState;
      this.updateQuickSoundButton();
      if (newState) audio.playFlap();
    });

    // Modal backdrop click to close
    [this.settingsModal, this.statsModal].forEach(modal => {
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });
  }

  // --- Theme Management ---
  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    audio.playSwoosh();
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    storage.setTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);

    if (this.themeToggleBtn) {
      this.themeToggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      const icon = this.themeToggleBtn.querySelector('.icon');
      if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
      }
    }
  }

  applyReducedMotion(reduced) {
    if (reduced) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }

  updateSettingsUI() {
    if (this.settingSound) this.settingSound.checked = audio.soundEnabled;
    if (this.settingMusic) this.settingMusic.checked = audio.musicEnabled;
    if (this.settingVolume) this.settingVolume.value = Math.round(audio.volume * 100);
    if (this.settingReducedMotion) this.settingReducedMotion.checked = storage.getReducedMotion();

    const diff = storage.getDifficulty();
    this.difficultyRadios.forEach(radio => {
      radio.checked = (radio.value === diff);
    });

    this.updateQuickSoundButton();
  }

  updateQuickSoundButton() {
    if (!this.soundToggleBtn) return;
    const isMuted = !audio.soundEnabled;
    this.soundToggleBtn.setAttribute('aria-label', isMuted ? 'Unmute Sound' : 'Mute Sound');
    const icon = this.soundToggleBtn.querySelector('.icon');
    if (icon) {
      icon.textContent = isMuted ? '🔇' : '🔊';
    }
  }

  updateStartScreenStats() {
    const diff = storage.getDifficulty();
    const best = storage.getHighScore(diff);
    if (this.startBestScore) {
      this.startBestScore.textContent = best;
    }
  }

  // --- Screen State Transitions ---

  showStartScreen() {
    this.hideAllScreens();
    this.startScreen?.classList.remove('hidden');
    this.startScreen?.classList.add('active');
    this.updateStartScreenStats();
  }

  showReadyScreen() {
    this.hideAllScreens();
    this.readyScreen?.classList.remove('hidden');
    this.readyScreen?.classList.add('active');
    this.hudScreen?.classList.remove('hidden');
    this.updateHudScore(0);
  }

  showPlayingScreen() {
    this.readyScreen?.classList.remove('active');
    this.readyScreen?.classList.add('hidden');
    this.hudScreen?.classList.remove('hidden');
    this.hudScreen?.classList.add('active');
  }

  showPauseModal() {
    this.pauseModal?.classList.remove('hidden');
    this.pauseModal?.classList.add('active');
  }

  hidePauseModal() {
    this.pauseModal?.classList.remove('active');
    this.pauseModal?.classList.add('hidden');
  }

  showGameOver(score, isNewBest, difficulty = 'normal') {
    this.hideAllScreens();

    const titleEl = document.getElementById('game-over-title');
    if (titleEl) titleEl.textContent = 'GAME ENDED';

    const bestScore = storage.getHighScore(difficulty);
    if (this.goScore) this.goScore.textContent = score;
    if (this.goBestScore) this.goBestScore.textContent = bestScore;

    if (this.newBestBadge) {
      if (isNewBest && score > 0) {
        this.newBestBadge.classList.remove('hidden');
        this.newBestBadge.classList.add('celebrate');
      } else {
        this.newBestBadge.classList.add('hidden');
        this.newBestBadge.classList.remove('celebrate');
      }
    }

    // Determine Medal Tier
    this.displayMedal(score);

    this.gameOverModal?.classList.remove('hidden');
    this.gameOverModal?.classList.add('active');
  }

  displayMedal(score) {
    if (!this.medalContainer) return;

    let tier = null;
    let name = 'Cadet';
    let icon = '🎖️';

    if (score >= CONFIG.medals.platinum) {
      tier = 'platinum';
      name = 'Platinum Ace';
      icon = '💎';
    } else if (score >= CONFIG.medals.gold) {
      tier = 'gold';
      name = 'Gold Aviator';
      icon = '🏆';
    } else if (score >= CONFIG.medals.silver) {
      tier = 'silver';
      name = 'Silver Pilot';
      icon = '🥈';
    } else if (score >= CONFIG.medals.bronze) {
      tier = 'bronze';
      name = 'Bronze Glider';
      icon = '🥉';
    }

    if (tier) {
      this.medalContainer.innerHTML = `<span class="medal-badge medal-${tier}">${icon}</span>`;
      if (this.medalName) this.medalName.textContent = name;
    } else {
      this.medalContainer.innerHTML = `<span class="medal-badge medal-none">🛡️</span>`;
      if (this.medalName) this.medalName.textContent = 'Novice';
    }
  }

  updateHudScore(score) {
    if (this.hudScore) {
      this.hudScore.textContent = score;
      // Trigger pop bounce animation
      this.hudScore.classList.remove('score-pop');
      void this.hudScore.offsetWidth; // Trigger DOM reflow
      this.hudScore.classList.add('score-pop');
    }
  }

  openSettings() {
    this.updateSettingsUI();
    this.settingsModal?.classList.remove('hidden');
    this.settingsModal?.classList.add('active');
  }

  openStats() {
    const stats = storage.getStats();
    const easyBest = storage.getHighScore('easy');
    const normBest = storage.getHighScore('normal');
    const hardBest = storage.getHighScore('hard');

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('stat-easy', easyBest);
    setEl('stat-normal', normBest);
    setEl('stat-hard', hardBest);
    setEl('stat-games', stats.gamesPlayed || 0);
    setEl('stat-total-score', stats.totalScore || 0);

    this.statsModal?.classList.remove('hidden');
    this.statsModal?.classList.add('active');
  }

  closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    modal.classList.add('hidden');
  }

  hideAllScreens() {
    const screens = [
      this.startScreen,
      this.readyScreen,
      this.hudScreen,
      this.pauseModal,
      this.gameOverModal,
      this.settingsModal,
      this.statsModal
    ];
    screens.forEach(s => {
      s?.classList.remove('active');
      s?.classList.add('hidden');
    });
  }
}
