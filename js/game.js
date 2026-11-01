/**
 * Core Game Engine
 * Fixed-timestep 60 FPS physics loop (delta-time safe for 60Hz/144Hz/240Hz screens),
 * state machine (START, READY, PLAYING, PAUSED, GAME_OVER), and responsive input manager.
 */

import { CONFIG } from './config.js';
import { storage } from './storage.js';
import { audio } from './audio.js';
import { Player } from './player.js';
import { ObstacleManager } from './obstacles.js';
import { ParticleSystem } from './particles.js';
import { Renderer } from './renderer.js';
import { UIManager } from './ui.js';

export const GAME_STATE = {
  START: 'START',
  READY: 'READY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.player = new Player();
    this.obstacles = new ObstacleManager();
    this.particles = new ParticleSystem();

    this.state = GAME_STATE.START;
    this.score = 0;
    this.isNewBest = false;
    this.difficulty = storage.getDifficulty();

    // Fixed timestep loop variables
    this.fixedDt = 1 / CONFIG.game.targetFPS; // 0.016667s
    this.accumulator = 0;
    this.lastTime = 0;
    this.totalTime = 0;
    this.rafId = null;

    // UI Manager
    this.ui = new UIManager({
      onStartPlay: () => this.toReadyState(),
      onTogglePause: () => this.togglePause(),
      onResume: () => this.resumeGame(),
      onRestart: () => this.toReadyState(),
      onGoMenu: () => this.toStartState(),
    });

    this.bindInputs();
    this.bindWindowEvents();

    // Start with Start Screen
    this.toStartState();

    // Launch RAF Loop
    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }

  // --- State Transitions ---

  toStartState() {
    this.state = GAME_STATE.START;
    audio.stopMusic(true);
    this.player.reset();
    this.obstacles.reset();
    this.particles.reset();
    this.score = 0;
    this.isNewBest = false;
    this.ui.showStartScreen();
  }

  toReadyState() {
    this.state = GAME_STATE.READY;
    audio.stopMusic(true);
    this.difficulty = storage.getDifficulty();
    this.player.reset();
    this.obstacles.reset();
    this.particles.reset();
    this.score = 0;
    this.isNewBest = false;
    this.ui.showReadyScreen();
  }

  startPlaying() {
    if (this.state !== GAME_STATE.READY) return;
    this.state = GAME_STATE.PLAYING;
    this.ui.showPlayingScreen();
    // Start music track in loop while game is running
    audio.startMusic(true);
    this.flap();
  }

  togglePause() {
    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.PAUSED;
      audio.stopMusic(false);
      this.ui.showPauseModal();
    } else if (this.state === GAME_STATE.PAUSED) {
      this.resumeGame();
    }
  }

  resumeGame() {
    if (this.state !== GAME_STATE.PAUSED) return;
    this.state = GAME_STATE.PLAYING;
    audio.startMusic(false);
    this.ui.hidePauseModal();
  }

  handleGameOver() {
    if (this.state === GAME_STATE.GAME_OVER) return;

    this.state = GAME_STATE.GAME_OVER;
    this.player.isDead = true;
    this.player.isAngry = true;

    // Stop background music immediately when game ends
    audio.stopMusic(true);

    // Audio hit impact
    audio.playHit();

    // Burst particles at player location
    this.particles.emitCollisionBurst(this.player.x, this.player.y, CONFIG.themes[this.ui.currentTheme].playerColor);

    // Save and check high score
    this.isNewBest = storage.setHighScore(this.score, this.difficulty);
    storage.recordGame(this.score);

    if (this.isNewBest && this.score > 0) {
      audio.playNewBest();
    }

    // Immediately end game and show game over dialog - zero delay
    this.ui.showGameOver(this.score, this.isNewBest, this.difficulty);
  }

  // --- Input Handlers ---

  flap() {
    if (this.state === GAME_STATE.READY) {
      this.startPlaying();
      return;
    }

    if (this.state !== GAME_STATE.PLAYING) return;

    this.player.flap(this.difficulty);
    audio.playFlap();

    // Spawn jet thruster puff
    const theme = CONFIG.themes[this.ui.currentTheme] || CONFIG.themes.dark;
    this.particles.emitFlapPuff(
      this.player.x - this.player.width * 0.45,
      this.player.y,
      theme.particleColor
    );
  }

  bindInputs() {
    // Action trigger on interactive canvas area
    const gameContainer = document.getElementById('game-container');

    const handleAction = (e) => {
      // Ignore if clicking on interactive UI elements (buttons, inputs, links)
      if (e.target.closest('button, input, label, a, .glass-card, .modal-dialog')) {
        return;
      }
      e.preventDefault();

      if (this.state === GAME_STATE.START) {
        this.toReadyState();
      } else if (this.state === GAME_STATE.READY) {
        this.startPlaying();
      } else if (this.state === GAME_STATE.PLAYING) {
        this.flap();
      } else if (this.state === GAME_STATE.GAME_OVER) {
        // Space/tap after gameover restarts
        const goModal = document.getElementById('game-over-modal');
        if (goModal && goModal.classList.contains('active')) {
          this.toReadyState();
        }
      }
    };

    gameContainer.addEventListener('pointerdown', handleAction);

    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (this.state === GAME_STATE.READY) {
          this.startPlaying();
        } else if (this.state === GAME_STATE.PLAYING) {
          this.flap();
        } else if (this.state === GAME_STATE.GAME_OVER) {
          this.toReadyState();
        } else if (this.state === GAME_STATE.START) {
          this.toReadyState();
        }
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        this.togglePause();
      } else if (e.code === 'KeyR' && this.state === GAME_STATE.GAME_OVER) {
        e.preventDefault();
        this.toReadyState();
      }
    });
  }

  bindWindowEvents() {
    // Responsive Resize & Orientation Change
    const handleResize = () => {
      this.renderer.resize();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Auto-pause when tab loses focus
    const handleVisibilityLoss = () => {
      if (document.hidden && this.state === GAME_STATE.PLAYING) {
        this.togglePause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityLoss);
    window.addEventListener('blur', () => {
      if (this.state === GAME_STATE.PLAYING) {
        this.togglePause();
      }
    });
  }

  // --- Fixed-Timestep Physics Loop ---

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;

    let frameDelta = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Clamp delta time to avoid large jump spirals (e.g. tab switching)
    if (frameDelta > 0.1) frameDelta = 0.1;

    this.totalTime += frameDelta;
    this.accumulator += frameDelta;

    // Fixed timestep accumulator
    while (this.accumulator >= this.fixedDt) {
      this.updatePhysics(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    // Render frame
    this.renderer.render(
      this.state,
      this.player,
      this.state === GAME_STATE.START ? null : this.obstacles,
      this.particles,
      this.ui.currentTheme,
      this.totalTime
    );

    this.rafId = requestAnimationFrame(this.loop);
  }

  updatePhysics(dt) {
    // Update Particles and Screen Shake always
    this.particles.update(dt);

    if (this.state === GAME_STATE.START) {
      this.player.updateIdle(dt);
      this.renderer.updateParallax(35, dt);
      return;
    }

    if (this.state === GAME_STATE.READY) {
      this.player.updateIdle(dt);
      this.renderer.updateParallax(45, dt);
      return;
    }

    if (this.state === GAME_STATE.PAUSED) {
      // Nothing updates while paused
      return;
    }

    if (this.state === GAME_STATE.GAME_OVER) {
      // Player falls to ground if in air
      if (!this.player.checkGroundCollision(this.renderer.groundY)) {
        this.player.updatePhysics(dt, this.difficulty);
      }
      return;
    }

    if (this.state === GAME_STATE.PLAYING) {
      // 1. Update Player Physics
      this.player.updatePhysics(dt, this.difficulty);

      // 2. Check Ground Collision
      if (this.player.checkGroundCollision(this.renderer.groundY)) {
        this.player.y = this.renderer.groundY - this.player.height * 0.5 + this.player.hitboxPadY;
        this.handleGameOver();
        return;
      }

      // 3. Update Obstacles
      this.obstacles.update(dt, this.score, this.difficulty, (scoreX, scoreY) => {
        // Obstacle passed successfully!
        this.score++;
        this.ui.updateHudScore(this.score);
        audio.playScore();

        const theme = CONFIG.themes[this.ui.currentTheme] || CONFIG.themes.dark;
        this.particles.emitScoreSparkle(scoreX, scoreY, theme.obstacleCore);
      });

      // 4. Update Parallax Background & Ground
      this.renderer.updateParallax(this.obstacles.currentSpeed, dt);

      // 5. Check Obstacle Collisions
      const collisionResult = this.obstacles.checkCollision(this.player.getHitbox());
      if (collisionResult.collided) {
        this.handleGameOver();
      }
    }
  }
}

// Instantiate game once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
