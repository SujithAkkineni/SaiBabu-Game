/**
 * High-DPI Canvas Renderer
 * Handles multi-layer parallax scrolling, player rendering, obstacle drawing,
 * particle effects, screen shake, and graceful procedural graphics fallbacks.
 */

import { CONFIG } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;

    this.logicalW = CONFIG.game.logicalWidth;
    this.logicalH = CONFIG.game.logicalHeight;
    this.groundY = this.logicalH - CONFIG.game.groundHeight;

    // Parallax scroll offsets
    this.bgFarX = 0;
    this.bgMidX = 0;
    this.bgNearX = 0;
    this.groundX = 0;

    // Loaded asset images cache
    this.images = {};
    this.imagesLoaded = {};

    // Generate static stars for night theme
    this.stars = [];
    for (let i = 0; i < 45; i++) {
      this.stars.push({
        x: Math.random() * this.logicalW,
        y: Math.random() * (this.groundY * 0.7),
        size: 0.8 + Math.random() * 1.8,
        twinkleSpeed: 1.5 + Math.random() * 3,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }

    this.initAssets();
    this.resize();
  }

  initAssets() {
    if (!CONFIG.assets.useImagesIfAvailable) return;

    const assetEntries = [
      ['player', CONFIG.assets.player],
      ['playerAngry', CONFIG.assets.playerAngry || 'assets/player-angry.png'],
      ['obstacleTop', CONFIG.assets.obstacleTop],
      ['obstacleBottom', CONFIG.assets.obstacleBottom],
      ['bgFar', CONFIG.assets.bgFar],
      ['bgMid', CONFIG.assets.bgMid],
      ['bgNear', CONFIG.assets.bgNear],
      ['ground', CONFIG.assets.ground],
    ];

    assetEntries.forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => {
        // Ensure image is valid (has actual dimensions > 1)
        if (img.naturalWidth > 1 && img.naturalHeight > 1) {
          this.images[key] = img;
          this.imagesLoaded[key] = true;
        }
      };
      img.onerror = () => {
        // Fall back to clean procedural vector rendering
        this.imagesLoaded[key] = false;
      };
      img.src = src;
    });
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;

    // Get displayed bounding box
    const rect = this.canvas.getBoundingClientRect();
    const displayW = rect.width;
    const displayH = rect.height;

    // Set canvas internal pixel dimensions scaled by DPR
    this.canvas.width = Math.floor(this.logicalW * this.dpr);
    this.canvas.height = Math.floor(this.logicalH * this.dpr);

    // Maintain scale mapping logical coordinates to high-DPI canvas
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
    this.ctx.scale(this.dpr, this.dpr);
    this.ctx.imageSmoothingEnabled = true;
  }

  updateParallax(speed, dt) {
    this.bgFarX = (this.bgFarX + speed * CONFIG.parallax.farSpeedRatio * dt) % this.logicalW;
    this.bgMidX = (this.bgMidX + speed * CONFIG.parallax.midSpeedRatio * dt) % this.logicalW;
    this.bgNearX = (this.bgNearX + speed * CONFIG.parallax.nearSpeedRatio * dt) % this.logicalW;
    this.groundX = (this.groundX + speed * dt) % 60; // 60px grid pattern repeat
  }

  clear() {
    this.ctx.clearRect(0, 0, this.logicalW, this.logicalH);
  }

  render(gameState, player, obstacleManager, particleSystem, themeId = 'dark', time = 0) {
    const theme = CONFIG.themes[themeId] || CONFIG.themes.dark;
    const ctx = this.ctx;

    this.clear();

    // 1. Draw Sky & Parallax Background (with optional screen shake)
    ctx.save();
    if (particleSystem) {
      ctx.translate(particleSystem.shakeOffsetX, particleSystem.shakeOffsetY);
    }

    this.drawSky(ctx, theme, time);
    this.drawParallaxFar(ctx, theme);
    this.drawParallaxMid(ctx, theme);
    this.drawParallaxNear(ctx, theme);

    // 2. Draw Obstacles
    if (obstacleManager) {
      this.drawObstacles(ctx, obstacleManager, theme);
    }

    // 3. Draw Ground
    this.drawGround(ctx, theme);

    // 4. Draw Particles (behind and around player)
    if (particleSystem) {
      particleSystem.draw(ctx);
    }

    // 5. Draw Player
    if (player) {
      this.drawPlayer(ctx, player, theme, time);
    }

    ctx.restore();
  }

  // --- Background Layer 1: Sky & Celestial Body ---
  drawSky(ctx, theme, time) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, theme.skyGradientTop);
    skyGrad.addColorStop(1, theme.skyGradientBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.logicalW, this.groundY);

    if (theme.id === 'dark') {
      // Starfield with gentle twinkle
      this.stars.forEach(star => {
        const twinkle = 0.4 + 0.6 * Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Cyber Moon with glow halo
      const moonX = this.logicalW * 0.78;
      const moonY = 85;
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 65);
      moonGlow.addColorStop(0, theme.sunGlow);
      moonGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 65, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = theme.sunColor;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
      ctx.fill();

      // Crescent shadow
      ctx.fillStyle = theme.skyGradientTop;
      ctx.beginPath();
      ctx.arc(moonX + 7, moonY - 4, 18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Light mode: Radiant Sun
      const sunX = this.logicalW * 0.82;
      const sunY = 95;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 80);
      sunGlow.addColorStop(0, theme.sunGlow);
      sunGlow.addColorStop(1, 'rgba(255, 235, 170, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = theme.sunColor;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Background Layer 2: Parallax Far (Mountains / Distant Skyline) ---
  drawParallaxFar(ctx, theme) {
    if (this.imagesLoaded.bgFar && this.images.bgFar) {
      this.drawRepeatingImage(ctx, this.images.bgFar, -this.bgFarX, this.groundY - 140, this.logicalW, 140);
      return;
    }

    // Procedural distant mountain ridge
    ctx.save();
    ctx.fillStyle = theme.mountainsFar;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);

    const step = 60;
    const offset = this.bgFarX;
    const totalPoints = Math.ceil(this.logicalW / step) + 3;

    for (let i = -1; i <= totalPoints; i++) {
      const px = i * step - (offset % step);
      const seed = Math.sin((i + Math.floor(offset / step)) * 1.7) * 45;
      const py = this.groundY - 130 + seed;
      if (i === -1) ctx.lineTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.lineTo(this.logicalW, this.groundY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- Background Layer 3: Parallax Mid (Hills / Floating Monoliths) ---
  drawParallaxMid(ctx, theme) {
    if (this.imagesLoaded.bgMid && this.images.bgMid) {
      this.drawRepeatingImage(ctx, this.images.bgMid, -this.bgMidX, this.groundY - 100, this.logicalW, 100);
      return;
    }

    ctx.save();
    ctx.fillStyle = theme.mountainsMid;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);

    const step = 45;
    const offset = this.bgMidX;
    const totalPoints = Math.ceil(this.logicalW / step) + 3;

    for (let i = -1; i <= totalPoints; i++) {
      const px = i * step - (offset % step);
      const seed = Math.cos((i + Math.floor(offset / step)) * 2.3) * 35;
      const py = this.groundY - 80 + seed;
      if (i === -1) ctx.lineTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.lineTo(this.logicalW, this.groundY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- Background Layer 4: Parallax Near (Foreground Structures / Clouds) ---
  drawParallaxNear(ctx, theme) {
    if (this.imagesLoaded.bgNear && this.images.bgNear) {
      this.drawRepeatingImage(ctx, this.images.bgNear, -this.bgNearX, this.groundY - 60, this.logicalW, 60);
      return;
    }

    ctx.save();
    ctx.fillStyle = theme.cityNear;
    const offset = this.bgNearX;
    const buildingWidth = 32;
    const count = Math.ceil(this.logicalW / buildingWidth) + 2;

    for (let i = -1; i <= count; i++) {
      const bx = i * buildingWidth - (offset % buildingWidth);
      const heightIndex = Math.abs(Math.sin((i + Math.floor(offset / buildingWidth)) * 5.1));
      const bh = 25 + heightIndex * 40;
      const by = this.groundY - bh;

      ctx.fillRect(bx, by, buildingWidth - 4, bh);

      // Cyber illuminated window slits
      if (theme.id === 'dark' && heightIndex > 0.4) {
        ctx.fillStyle = 'rgba(0, 247, 255, 0.45)';
        ctx.fillRect(bx + 4, by + 6, buildingWidth - 12, 3);
        ctx.fillStyle = theme.cityNear; // Reset for next loop
      }
    }
    ctx.restore();
  }

  // --- Obstacles: Cyber Energy Towers ---
  drawObstacles(ctx, obstacleManager, theme) {
    const obstacles = obstacleManager.getActiveObstacles();

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const x = obs.x;
      const w = obs.width;

      // Draw Top Obstacle
      this.drawTower(ctx, x, 0, w, obs.topHeight, true, obs.pulsePhase, theme);

      // Draw Bottom Obstacle
      this.drawTower(ctx, x, obs.bottomY, w, obs.bottomHeight, false, obs.pulsePhase, theme);
    }
  }

  drawTower(ctx, x, y, width, height, isTop, pulsePhase, theme) {
    if (height <= 0) return;

    // 1. Draw Top Obstacle (Actress descending from ceiling toward the gap)
    if (isTop && this.imagesLoaded.obstacleTop && this.images.obstacleTop) {
      const img = this.images.obstacleTop;
      const scale = img.naturalWidth / width;
      const sHeight = Math.min(img.naturalHeight, height * scale);
      const sy = img.naturalHeight - sHeight;
      const dHeight = sHeight / scale;
      const dy = y + height - dHeight;

      ctx.save();
      // Romantic rose/golden aura around the actress
      ctx.shadowColor = 'rgba(255, 105, 180, 0.5)';
      ctx.shadowBlur = 12;
      ctx.drawImage(img, 0, sy, img.naturalWidth, sHeight, x, dy, width, dHeight);

      // If ceiling is higher, fill seamlessly with saree tone
      if (dy > y) {
        const fillGrad = ctx.createLinearGradient(x, y, x, dy + 2);
        fillGrad.addColorStop(0, '#1c0a12');
        fillGrad.addColorStop(1, '#3b1422');
        ctx.fillStyle = fillGrad;
        ctx.fillRect(x + 4, y, width - 8, dy - y + 2);
      }
      ctx.restore();
      return;
    }

    // 2. Draw Bottom Obstacle (Actress standing upright from the ground)
    if (!isTop && this.imagesLoaded.obstacleBottom && this.images.obstacleBottom) {
      const img = this.images.obstacleBottom;
      const scale = img.naturalWidth / width;
      const sHeight = Math.min(img.naturalHeight, height * scale);
      const dHeight = sHeight / scale;

      ctx.save();
      // Romantic rose/golden aura around the actress
      ctx.shadowColor = 'rgba(255, 105, 180, 0.5)';
      ctx.shadowBlur = 12;
      ctx.drawImage(img, 0, 0, img.naturalWidth, sHeight, x, y, width, dHeight);

      // If ground is deeper, extend saree seamlessly
      if (height > dHeight) {
        const fillGrad = ctx.createLinearGradient(x, y + dHeight - 2, x, y + height);
        fillGrad.addColorStop(0, '#3b1422');
        fillGrad.addColorStop(1, '#1c0a12');
        ctx.fillStyle = fillGrad;
        ctx.fillRect(x + 4, y + dHeight - 2, width - 8, height - dHeight + 2);
      }
      ctx.restore();
      return;
    }

    // Elegant fallback: Floral pillar (no cyber poles)
    ctx.save();
    const bodyGrad = ctx.createLinearGradient(x, 0, x + width, 0);
    bodyGrad.addColorStop(0, '#d4af37');
    bodyGrad.addColorStop(0.5, '#4a1528');
    bodyGrad.addColorStop(1, '#d4af37');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  // --- Ground: Scrolling Platform ---
  drawGround(ctx, theme) {
    const gy = this.groundY;
    const gh = CONFIG.game.groundHeight;

    if (this.imagesLoaded.ground && this.images.ground) {
      this.drawRepeatingImage(ctx, this.images.ground, -this.groundX, gy, this.logicalW, gh);
      return;
    }

    ctx.save();

    // Base ground fill
    ctx.fillStyle = theme.groundBody;
    ctx.fillRect(0, gy, this.logicalW, gh);

    // Glowing top rim / neon boundary
    ctx.fillStyle = theme.groundTop;
    ctx.shadowColor = theme.obstacleGlow;
    ctx.shadowBlur = 8;
    ctx.fillRect(0, gy, this.logicalW, 5);
    ctx.shadowBlur = 0;

    // Scrolling Tech Grid / Stripes
    ctx.strokeStyle = theme.groundGrid;
    ctx.lineWidth = 2;
    const gridStep = 32;
    const startX = -(this.groundX % gridStep);

    ctx.beginPath();
    for (let x = startX; x < this.logicalW + gridStep; x += gridStep) {
      ctx.moveTo(x, gy + 5);
      ctx.lineTo(x - 20, gy + gh);
    }
    ctx.stroke();

    // Horizontal divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, gy + 22);
    ctx.lineTo(this.logicalW, gy + 22);
    ctx.stroke();

    ctx.restore();
  }

  // --- Player: Cyber Glider Drone ---
  drawPlayer(ctx, player, theme, time) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation);

    // Draw Jet Trail
    if (player.trail && player.trail.length > 1) {
      for (let i = 0; i < player.trail.length - 1; i++) {
        const pt = player.trail[i];
        const nextPt = player.trail[i + 1];
        ctx.save();
        ctx.rotate(-player.rotation); // un-rotate trail to world coords
        ctx.translate(-player.x, -player.y);

        ctx.strokeStyle = theme.playerGlow;
        ctx.globalAlpha = pt.alpha * 0.75;
        ctx.lineWidth = pt.width * (1 - i / player.trail.length);
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(nextPt.x, nextPt.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Custom Sprite Check (Laughing vs Angry face)
    const isAngry = player.isAngry || player.isDead;
    const activeImg = (isAngry && this.imagesLoaded.playerAngry && this.images.playerAngry)
      ? this.images.playerAngry
      : (this.imagesLoaded.player && this.images.player ? this.images.player : null);

    if (activeImg) {
      const w = player.width;
      const h = player.height;

      ctx.save();
      if (isAngry) {
        // Red impact glow when hitting poles
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 18;
      } else {
        // Soft cheerful glow for laughing face
        ctx.shadowColor = theme.playerGlow;
        ctx.shadowBlur = 8;
      }

      ctx.drawImage(activeImg, -w * 0.5, -h * 0.5, w, h);
      ctx.restore();

      ctx.restore();
      return;
    }

    // Procedural High-Tech Jet Drone / Wing
    const pw = player.width;
    const ph = player.height;

    // 1. Thruster Glow & Plasma Flame
    const flameSize = 10 + Math.abs(Math.sin(player.wingPhase)) * 8 + player.flapIntensity * 12;
    const thrusterGrad = ctx.createRadialGradient(-pw * 0.45, 0, 1, -pw * 0.45 - flameSize, 0, flameSize);
    thrusterGrad.addColorStop(0, '#ffffff');
    thrusterGrad.addColorStop(0.3, theme.playerGlow);
    thrusterGrad.addColorStop(1, 'rgba(0, 247, 255, 0)');

    ctx.fillStyle = thrusterGrad;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.4, -4);
    ctx.lineTo(-pw * 0.4 - flameSize, 0);
    ctx.lineTo(-pw * 0.4, 4);
    ctx.closePath();
    ctx.fill();

    // 2. Wings (with animated flap angle offset)
    const wingYOffset = player.wingPhase * 4;
    ctx.fillStyle = theme.playerWing;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.15, -ph * 0.45 + wingYOffset);
    ctx.lineTo(pw * 0.25, 0);
    ctx.lineTo(-pw * 0.35, ph * 0.4 - wingYOffset);
    ctx.closePath();
    ctx.fill();

    // 3. Aerodynamic Fuselage
    const bodyGrad = ctx.createLinearGradient(-pw * 0.5, 0, pw * 0.5, 0);
    bodyGrad.addColorStop(0, '#1a1e38');
    bodyGrad.addColorStop(0.5, theme.playerColor);
    bodyGrad.addColorStop(1, '#ffffff');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(pw * 0.5, 0);                 // Sharp Nose
    ctx.lineTo(-pw * 0.4, -ph * 0.38);       // Top Tail
    ctx.lineTo(-pw * 0.3, 0);                // Engine intake notch
    ctx.lineTo(-pw * 0.4, ph * 0.38);        // Bottom Tail
    ctx.closePath();
    ctx.fill();

    // 4. Cockpit Visor / Cyber Eye
    ctx.fillStyle = '#00f7ff';
    ctx.shadowColor = '#00f7ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(pw * 0.18, -2, 6, 3, Math.PI / 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 5. Wing Edge Neon Accents
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pw * 0.5, 0);
    ctx.lineTo(-pw * 0.35, -ph * 0.35 + wingYOffset);
    ctx.stroke();

    ctx.restore();
  }

  // --- Utility: Repeatable Seamless Image Drawer ---
  drawRepeatingImage(ctx, img, startX, y, width, height) {
    const imgW = img.naturalWidth || width;
    const imgH = img.naturalHeight || height;
    const scale = height / imgH;
    const scaledW = imgW * scale;

    const normX = ((startX % scaledW) + scaledW) % scaledW;
    let currX = normX - scaledW;

    while (currX < width) {
      ctx.drawImage(img, currX, y, scaledW, height);
      currX += scaledW;
    }
  }
}
