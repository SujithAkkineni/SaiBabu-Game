# AeroPulse 🚀 — Cyber Flight Odyssey

A polished, production-quality, Flappy Bird-style browser game built with **HTML5 Canvas**, **Vanilla JavaScript (ES Modules)**, and **CSS Glassmorphism**. Designed for high-DPI displays, with fixed-timestep physics, procedural Web Audio effects, multi-layer parallax scrolling, light/dark themes, and persistent stats.

---

## 🎮 How to Run

Because the game uses modern ES modules (`<script type="module">`), modern browsers require it to be served via HTTP/HTTPS rather than a direct `file:///` path due to CORS policies.

You can launch a lightweight static server in seconds with any of the following:

### Option 1: Python (Recommended)
```bash
# In the project directory:
python -m http.server 8080
```
Then open: **`http://localhost:8080`** in your browser.

### Option 2: Node.js (npx)
```bash
# Using npx serve or http-server:
npx serve .
# Or:
npx http-server -p 8080
```

### Option 3: VS Code / IDE Live Server
Right-click `index.html` and click **"Open with Live Server"**.

---

## 🕹️ Controls

- **Flap / Impulse**:
  - `Spacebar`
  - `Up Arrow` (`↑`) or `W`
  - Left Mouse Click
  - Touch Screen Tap (Mobile / Tablet)
- **Pause / Resume**: `P` or `Escape` (or click the HUD pause button)
- **Restart (after Game Over)**: `R` or `Spacebar`

---

## 🎨 Swapping Custom Images

All asset paths are configured in [`js/config.js`](js/config.js#L75-L87). You can replace the default images located in the `assets/` folder with your own custom sprites:

| File Name | Role | Suggested Dimensions |
| :--- | :--- | :--- |
| `assets/player.png` | Main character (laughing/smiling face) | 200 × 200 px (transparent PNG) |
| `assets/player-angry.png` | Impact/crash character (angry face on collision) | 200 × 200 px (transparent PNG) |
| `assets/obstacle-top.png` | Upper obstacle (tower, pillar, stalagmite) | 136 × 600 px (transparent PNG) |
| `assets/obstacle-bottom.png` | Lower obstacle (tower, pillar, stalagmite) | 136 × 600 px (transparent PNG) |
| `assets/bg-far.png` | Far parallax layer (distant peaks / skyline) | 840 × 280 px (seamless repeat) |
| `assets/bg-mid.png` | Mid parallax layer (hills / monoliths) | 840 × 200 px (seamless repeat) |
| `assets/bg-near.png` | Near parallax layer (foreground tech / clouds) | 840 × 120 px (seamless repeat) |
| `assets/ground.png` | Scrolling ground platform | 840 × 180 px (seamless repeat) |

> [!TIP]
> **Automatic Procedural Fallback:** If any image file is deleted, missing, or fails to load, AeroPulse automatically falls back to clean, procedurally drawn vector shapes with glowing neon accents. You can also force procedural graphics by setting `CONFIG.assets.useImagesIfAvailable = false` in [`js/config.js`](js/config.js).

---

## ⚙️ Tweaking Difficulty & Physics Values

Open [`js/config.js`](js/config.js) to adjust any core gameplay parameters:

### Physics Tweaks
```javascript
physics: {
  gravity: 1200,          // Downward gravity acceleration (px/sec^2)
  flapVelocity: -390,      // Upward impulse given on flap (px/sec)
  maxVelocityY: 650,       // Terminal falling velocity
  rotationSpeed: 7,        // Smoothness of pitch tilt interpolation
  maxUpAngle: -0.45,       // Max upward tilt in radians (~ -25 deg)
  maxDownAngle: 1.25,      // Max dive angle in radians (~ 70 deg)
}
```

### Obstacle & Dynamic Scaling
```javascript
obstacles: {
  width: 68,               // Pillar width in pixels
  baseGap: 165,            // Initial gap between top and bottom obstacles
  minGap: 125,             // Minimum gap threshold at high scores
  gapReductionRate: 1.2,   // Gap shrinkage per point scored
  baseSpeed: 175,          // Initial horizontal scroll speed (px/sec)
  maxSpeed: 270,           // Maximum speed ceiling
  speedIncreaseRate: 1.5,  // Speed increase per point scored
  spawnDistance: 240,      // Distance between consecutive obstacles
}
```

### Difficulty Presets
Difficulty presets apply multipliers to gravity, flap strength, speed, and gap bonus:
- **Easy**: Gentler gravity (`0.88x`), wider gaps (`+25px`), slower speed (`0.85x`).
- **Normal**: Classic arcade balance.
- **Hard**: Snappier gravity (`1.12x`), narrower gaps (`-18px`), higher speed (`1.18x`).

---

## 🔊 Audio System

The game utilizes the **Web Audio API** with zero external audio dependencies:
- **Flap**: Synthesized dynamic jet thruster impulse and aerodynamic pitch sweep.
- **Score**: Harmonic crystal double-chime.
- **Hit**: Low-frequency sub-bass thud with metallic noise crunch.
- **New Best**: Multi-note celebration fanfare.
- **Ambient Synth**: Procedural 4-chord generative ambient progression (toggled via Settings).
- **External BGM support**: Set `CONFIG.audio.bgmUrl = 'path/to/music.mp3'` to stream an audio file instead.

---

## 🏗️ Architecture & Modules

```
├── index.html           # Main semantic structure, accessible modals & Google Fonts
├── style.css            # Glassmorphism design system, CSS variables & animations
├── README.md            # Documentation and customization guide
├── assets/              # Customizable PNG sprites & parallax layers
└── js/
    ├── config.js        # Physics, theme colors, difficulty, and audio settings
    ├── storage.js       # Safe localStorage manager for scores, theme & preferences
    ├── audio.js         # Web Audio API procedural sound engine & music loop
    ├── particles.js     # Particle system with object pooling & screen shake
    ├── player.js        # Player physics, forgiving hitbox, rotation, and trail
    ├── obstacles.js     # Obstacle manager with object pooling & dynamic gap scaling
    ├── renderer.js      # High-DPI canvas renderer with 3-layer parallax
    ├── ui.js            # HUD, modal screens, theme toggle, and settings controls
    └── game.js          # Fixed-timestep (60 FPS) loop & state machine
```

---

## 🏆 Pilot Ranks & Medals
- **Bronze Glider**: Score ≥ 10
- **Silver Pilot**: Score ≥ 25
- **Gold Aviator**: Score ≥ 50
- **Platinum Ace**: Score ≥ 100
