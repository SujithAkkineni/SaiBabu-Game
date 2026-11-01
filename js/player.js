/**
 * Player Entity
 * Manages player physics, rotation, animation states, forgiving hitbox, and trail points.
 */

import { CONFIG } from './config.js';

export class Player {
  constructor() {
    this.width = CONFIG.player.width;
    this.height = CONFIG.player.height;
    this.startX = CONFIG.player.startX;
    this.startY = (CONFIG.game.logicalHeight - CONFIG.game.groundHeight) * 0.45;

    this.x = this.startX;
    this.y = this.startY;
    this.vy = 0;
    this.rotation = 0;
    this.targetRotation = 0;

    // Wing flap & thruster animation
    this.animTime = 0;
    this.wingPhase = 0;
    this.flapIntensity = 0;

    // Trail points for glowing jet stream
    this.trail = [];
    this.maxTrail = CONFIG.player.trailLength;

    // Floating idle oscillation
    this.idleTime = 0;
    this.isDead = false;
    this.isAngry = false;

    // Hitbox offsets for forgiving collisions
    this.hitboxPadX = CONFIG.player.hitboxPaddingX;
    this.hitboxPadY = CONFIG.player.hitboxPaddingY;
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.vy = 0;
    this.rotation = 0;
    this.targetRotation = 0;
    this.animTime = 0;
    this.wingPhase = 0;
    this.flapIntensity = 0;
    this.trail = [];
    this.idleTime = 0;
    this.isDead = false;
    this.isAngry = false;
  }

  flap(difficulty = 'normal') {
    if (this.isDead) return;

    const diff = CONFIG.difficulty[difficulty] || CONFIG.difficulty.normal;
    this.vy = CONFIG.physics.flapVelocity * diff.flapMult;
    this.flapIntensity = 1.0;
  }

  updateIdle(dt) {
    this.idleTime += dt;
    this.y = this.startY + Math.sin(this.idleTime * 4.2) * 8;
    this.rotation = Math.sin(this.idleTime * 2.1) * 0.08;
    this.animTime += dt;
    this.wingPhase = Math.sin(this.animTime * 12);
  }

  updatePhysics(dt, difficulty = 'normal') {
    const diff = CONFIG.difficulty[difficulty] || CONFIG.difficulty.normal;
    const gravity = CONFIG.physics.gravity * diff.gravityMult;

    // Apply gravity
    this.vy += gravity * dt;
    if (this.vy > CONFIG.physics.maxVelocityY) {
      this.vy = CONFIG.physics.maxVelocityY;
    }

    // Integrate position
    this.y += this.vy * dt;

    // Ceiling clamp (cannot fly above top of screen)
    if (this.y < 10) {
      this.y = 10;
      if (this.vy < 0) this.vy = 0;
    }

    // Dynamic rotation based on velocity
    if (this.vy < 0) {
      // Rising: tilt smoothly upward
      this.targetRotation = CONFIG.physics.maxUpAngle;
    } else {
      // Falling: dive toward maxDownAngle
      const fallProgress = Math.min(1, this.vy / (CONFIG.physics.maxVelocityY * 0.7));
      this.targetRotation = CONFIG.physics.maxUpAngle + fallProgress * (CONFIG.physics.maxDownAngle - CONFIG.physics.maxUpAngle);
    }

    // Smooth rotational interpolation
    const rotSpeed = CONFIG.physics.rotationSpeed;
    this.rotation += (this.targetRotation - this.rotation) * Math.min(1, rotSpeed * dt);

    // Flap animation decay
    this.flapIntensity = Math.max(0, this.flapIntensity - dt * 3.5);
    this.animTime += dt;
    this.wingPhase = Math.sin(this.animTime * (16 + this.flapIntensity * 14));

    // Update trail
    if (!this.isDead) {
      this.trail.unshift({
        x: this.x - this.width * 0.42,
        y: this.y,
        alpha: 0.8,
        width: 3.5
      });
      if (this.trail.length > this.maxTrail) {
        this.trail.pop();
      }
      for (let i = 0; i < this.trail.length; i++) {
        this.trail[i].alpha *= Math.pow(0.85, dt * 60);
      }
    }
  }

  getHitbox() {
    return {
      x: this.x - this.width * 0.5 + this.hitboxPadX,
      y: this.y - this.height * 0.5 + this.hitboxPadY,
      width: this.width - this.hitboxPadX * 2,
      height: this.height - this.hitboxPadY * 2,
    };
  }

  checkGroundCollision(groundY) {
    const bottomY = this.y + this.height * 0.5 - this.hitboxPadY;
    return bottomY >= groundY;
  }
}
