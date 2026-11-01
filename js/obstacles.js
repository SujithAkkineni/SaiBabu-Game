/**
 * Obstacle Manager with Object Pooling
 * Manages scrolling cyber-towers, dynamic gap scaling, speed progression, and collision tests.
 */

import { CONFIG } from './config.js';

class Obstacle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.width = CONFIG.obstacles.width;
    this.topHeight = 0;
    this.bottomY = 0;
    this.bottomHeight = 0;
    this.gap = CONFIG.obstacles.baseGap;
    this.scored = false;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  init(x, topHeight, gap, groundY) {
    this.active = true;
    this.x = x;
    this.width = CONFIG.obstacles.width;
    this.topHeight = topHeight;
    this.gap = gap;
    this.bottomY = topHeight + gap;
    this.bottomHeight = Math.max(0, groundY - this.bottomY);
    this.scored = false;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }
}

export class ObstacleManager {
  constructor() {
    this.poolSize = CONFIG.obstacles.poolSize;
    this.pool = [];
    for (let i = 0; i < this.poolSize; i++) {
      this.pool.push(new Obstacle());
    }

    this.groundY = CONFIG.game.logicalHeight - CONFIG.game.groundHeight;
    this.spawnTimer = 0;
    this.lastSpawnX = 0;
    this.currentSpeed = CONFIG.obstacles.baseSpeed;
    this.currentGap = CONFIG.obstacles.baseGap;
  }

  reset() {
    for (let i = 0; i < this.poolSize; i++) {
      this.pool[i].active = false;
    }
    this.lastSpawnX = 0;
    this.currentSpeed = CONFIG.obstacles.baseSpeed;
    this.currentGap = CONFIG.obstacles.baseGap;
  }

  getFreeObstacle() {
    for (let i = 0; i < this.poolSize; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    return null;
  }

  calculateDifficulty(score, difficulty = 'normal') {
    const diff = CONFIG.difficulty[difficulty] || CONFIG.difficulty.normal;

    // Dynamic gap reduction
    const gapReduction = score * CONFIG.obstacles.gapReductionRate;
    const rawGap = CONFIG.obstacles.baseGap - gapReduction + diff.gapBonus;
    this.currentGap = Math.max(CONFIG.obstacles.minGap, rawGap);

    // Dynamic speed progression
    const speedBoost = score * CONFIG.obstacles.speedIncreaseRate;
    const rawSpeed = (CONFIG.obstacles.baseSpeed + speedBoost) * diff.speedMult;
    this.currentSpeed = Math.min(CONFIG.obstacles.maxSpeed, rawSpeed);
  }

  spawnObstacle(startX) {
    const obstacle = this.getFreeObstacle();
    if (!obstacle) return null;

    const minH = CONFIG.obstacles.minHeight;
    const availableHeight = this.groundY - this.currentGap - minH * 2;
    const topHeight = minH + Math.random() * Math.max(20, availableHeight);

    obstacle.init(startX, topHeight, this.currentGap, this.groundY);
    this.lastSpawnX = startX;
    return obstacle;
  }

  update(dt, score, difficulty = 'normal', onScoreCallback) {
    this.calculateDifficulty(score, difficulty);

    let rightmostX = 0;
    let hasActive = false;

    for (let i = 0; i < this.poolSize; i++) {
      const obs = this.pool[i];
      if (!obs.active) continue;

      hasActive = true;
      obs.x -= this.currentSpeed * dt;
      obs.pulsePhase += dt * 3.5;

      if (obs.x > rightmostX) {
        rightmostX = obs.x;
      }

      // Check scoring: player crossed center of obstacle
      const playerX = CONFIG.player.startX;
      if (!obs.scored && obs.x + obs.width * 0.5 <= playerX) {
        obs.scored = true;
        if (onScoreCallback) {
          onScoreCallback(obs.x + obs.width * 0.5, obs.topHeight + obs.gap * 0.5);
        }
      }

      // Recycle off-screen obstacles
      if (obs.x + obs.width < -30) {
        obs.active = false;
      }
    }

    // Spawn new obstacles
    const logicalW = CONFIG.game.logicalWidth;
    if (!hasActive) {
      // First spawn
      this.spawnObstacle(logicalW + 80);
    } else if (rightmostX < logicalW + 80 - CONFIG.obstacles.spawnDistance) {
      this.spawnObstacle(logicalW + 80);
    }
  }

  /**
   * Collision detection against player's forgiving hitbox
   */
  checkCollision(playerHitbox) {
    for (let i = 0; i < this.poolSize; i++) {
      const obs = this.pool[i];
      if (!obs.active) continue;

      // Quick AABB bounds rejection
      if (playerHitbox.x + playerHitbox.width < obs.x || playerHitbox.x > obs.x + obs.width) {
        continue;
      }

      // Check collision with top tower
      if (playerHitbox.y < obs.topHeight) {
        return {
          collided: true,
          contactX: Math.max(obs.x, Math.min(obs.x + obs.width, playerHitbox.x + playerHitbox.width * 0.5)),
          contactY: obs.topHeight
        };
      }

      // Check collision with bottom tower
      if (playerHitbox.y + playerHitbox.height > obs.bottomY) {
        return {
          collided: true,
          contactX: Math.max(obs.x, Math.min(obs.x + obs.width, playerHitbox.x + playerHitbox.width * 0.5)),
          contactY: obs.bottomY
        };
      }
    }

    return { collided: false };
  }

  getActiveObstacles() {
    return this.pool.filter(o => o.active);
  }
}
