/**
 * Particle System with Object Pooling
 * High-performance visual effects for flap puffs, scoring sparkles, and collision bursts.
 * Zero-allocation runtime prevents garbage collection frame drops.
 */

import { CONFIG } from './config.js';

class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 0;
    this.growth = 0;
    this.color = '#fff';
    this.alpha = 1;
    this.decay = 0.02;
    this.rotation = 0;
    this.rotSpeed = 0;
    this.type = 'puff'; // 'puff', 'sparkle', 'burst', 'ring'
  }

  init(x, y, vx, vy, size, color, decay, type = 'puff', growth = 0, rotSpeed = 0) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.growth = growth;
    this.color = color;
    this.alpha = 1;
    this.decay = decay;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = rotSpeed;
    this.type = type;
  }

  update(dt) {
    if (!this.active) return;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.size += this.growth * dt;
    this.rotation += this.rotSpeed * dt;
    this.alpha -= this.decay * dt;

    // Apply light drag to burst and puff particles
    if (this.type === 'burst' || this.type === 'puff') {
      this.vx *= Math.pow(0.94, dt * 60);
      this.vy *= Math.pow(0.94, dt * 60);
    }

    if (this.alpha <= 0 || this.size <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active || this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.type === 'puff') {
      // Soft glowing vapor cloud
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, this.size), 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'sparkle') {
      // 4-pointed radiant star
      ctx.fillStyle = this.color;
      ctx.beginPath();
      const s = this.size;
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(0, 0, s, 0);
      ctx.quadraticCurveTo(0, 0, 0, s);
      ctx.quadraticCurveTo(0, 0, -s, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s);
      ctx.fill();
    } else if (this.type === 'burst') {
      // High-energy shard / spark
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size * 0.5, -this.size * 1.5, this.size, this.size * 3);
    } else if (this.type === 'ring') {
      // Expanding shockwave ring
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, this.size * 0.15);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, this.size), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class ParticleSystem {
  constructor(poolSize = CONFIG.particles.poolSize) {
    this.poolSize = poolSize;
    this.pool = [];
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(new Particle());
    }

    // Screen shake state
    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  getFreeParticle() {
    for (let i = 0; i < this.poolSize; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    // If pool is exhausted, steal the oldest (lowest alpha) active particle
    let oldest = this.pool[0];
    for (let i = 1; i < this.poolSize; i++) {
      if (this.pool[i].alpha < oldest.alpha) {
        oldest = this.pool[i];
      }
    }
    return oldest;
  }

  /**
   * Emit jet thrust puff when player flaps
   */
  emitFlapPuff(x, y, color = '#68d8d6') {
    const count = CONFIG.particles.flapPuffCount;
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      const angle = Math.PI + (Math.random() - 0.5) * 0.8; // Eject backward
      const speed = 70 + Math.random() * 110;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed + 20;
      const size = 3 + Math.random() * 4;
      const decay = 2.4 + Math.random() * 1.2;
      const growth = 12 + Math.random() * 8;

      p.init(x, y, vx, vy, size, color, decay, 'puff', growth);
    }
  }

  /**
   * Emit sparkles when player scores
   */
  emitScoreSparkle(x, y, color = '#ffd166') {
    const count = CONFIG.particles.scoreSparkleCount;

    // Center shockwave ring
    const ring = this.getFreeParticle();
    ring.init(x, y, 0, 0, 10, color, 2.0, 'ring', 130);

    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 150;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 3 + Math.random() * 5;
      const decay = 1.4 + Math.random() * 0.8;
      const rotSpeed = (Math.random() - 0.5) * 12;

      p.init(x, y, vx, vy, size, color, decay, 'sparkle', -1.5, rotSpeed);
    }
  }

  /**
   * Emit explosive burst on collision
   */
  emitCollisionBurst(x, y, color = '#ff007f') {
    const count = CONFIG.particles.deathBurstCount;

    // Shockwave ring
    const ring = this.getFreeParticle();
    ring.init(x, y, 0, 0, 8, '#ffffff', 2.5, 'ring', 180);

    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 240;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 40;
      const size = 2 + Math.random() * 4;
      const decay = 1.3 + Math.random() * 1.2;
      const rotSpeed = (Math.random() - 0.5) * 16;
      const particleColor = Math.random() > 0.5 ? color : '#ffffff';

      p.init(x, y, vx, vy, size, particleColor, decay, 'burst', -0.5, rotSpeed);
    }

    this.triggerScreenShake();
  }

  triggerScreenShake(duration = CONFIG.particles.screenShakeDuration, intensity = CONFIG.particles.screenShakeIntensity) {
    this.shakeDuration = duration;
    this.shakeTimer = duration;
    this.shakeIntensity = intensity;
  }

  update(dt) {
    // Update active particles
    for (let i = 0; i < this.poolSize; i++) {
      if (this.pool[i].active) {
        this.pool[i].update(dt);
      }
    }

    // Update screen shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = this.shakeTimer / this.shakeDuration;
      const currentIntensity = this.shakeIntensity * Math.max(0, progress);
      this.shakeOffsetX = (Math.random() * 2 - 1) * currentIntensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * currentIntensity;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.poolSize; i++) {
      if (this.pool[i].active) {
        this.pool[i].draw(ctx);
      }
    }
  }

  reset() {
    for (let i = 0; i < this.poolSize; i++) {
      this.pool[i].active = false;
    }
    this.shakeTimer = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }
}
