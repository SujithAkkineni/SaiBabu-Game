/**
 * Game Configuration
 * Centralized settings for physics, visuals, audio, difficulty, and asset paths.
 * Tweak any values here to customize the game experience.
 */

export const CONFIG = {
  game: {
    title: "Sai Babu's Wrath",
    subtitle: 'Blessing you with points',
    targetFPS: 60,
    logicalWidth: 420,
    logicalHeight: 680,
    groundHeight: 90,
  },

  physics: {
    gravity: 1200,          // pixels / sec^2
    flapVelocity: -390,      // impulse velocity on flap
    maxVelocityY: 650,       // maximum falling speed
    rotationSpeed: 7,        // tilt interpolation speed
    maxUpAngle: -0.45,       // max pitch up angle in radians (~ -25 deg)
    maxDownAngle: 1.25,      // max pitch down dive angle (~ 70 deg)
  },

  player: {
    startX: 110,
    width: 52,
    height: 52,
    hitboxPaddingX: 8,       // Forgiving hitbox: smaller than visual sprite
    hitboxPaddingY: 8,
    trailLength: 12,
  },

  obstacles: {
    width: 78,
    minHeight: 70,
    baseGap: 180,            // Starting vertical gap between top & bottom obstacle
    minGap: 135,             // Minimum gap at high scores
    gapReductionRate: 1.2,   // Gap shrinkage per point scored
    baseSpeed: 175,          // Horizontal scroll speed in px/sec
    maxSpeed: 270,           // Maximum scroll speed
    speedIncreaseRate: 1.5,  // Speed increase per point scored
    spawnDistance: 245,      // Distance between consecutive obstacles
    poolSize: 6,             // Object pool size
  },

  particles: {
    poolSize: 180,           // Maximum concurrent particles in pool
    flapPuffCount: 7,
    scoreSparkleCount: 18,
    deathBurstCount: 40,
    screenShakeDuration: 0.35,// Seconds
    screenShakeIntensity: 8,  // Maximum pixel offset
  },

  difficulty: {
    easy: {
      gravityMult: 0.88,
      flapMult: 0.95,
      speedMult: 0.85,
      gapBonus: 25,
      label: 'Easy'
    },
    normal: {
      gravityMult: 1.0,
      flapMult: 1.0,
      speedMult: 1.0,
      gapBonus: 0,
      label: 'Normal'
    },
    hard: {
      gravityMult: 1.12,
      flapMult: 1.04,
      speedMult: 1.18,
      gapBonus: -18,
      label: 'Hard'
    }
  },

  medals: {
    bronze: 10,
    silver: 25,
    gold: 50,
    platinum: 100,
  },

  parallax: {
    farSpeedRatio: 0.08,
    midSpeedRatio: 0.25,
    nearSpeedRatio: 0.55,
  },

  // Asset image paths. If files exist, they will be loaded;
  // if missing or erroring, the renderer automatically uses clean procedural vector art.
  assets: {
    useImagesIfAvailable: true,
    player: 'assets/player.png',
    playerAngry: 'assets/player-angry.png',
    actress: 'assets/actress.png',
    obstacleTop: 'assets/obstacle-top.png',
    obstacleBottom: 'assets/obstacle-bottom.png',
    bgFar: 'assets/bg-far.png',
    bgMid: 'assets/bg-mid.png',
    bgNear: 'assets/bg-near.png',
    ground: 'assets/ground.png',
  },

  audio: {
    enabledByDefault: true,
    musicByDefault: true,
    defaultVolume: 0.7,
    // Background Music (set file path e.g. 'assets/bgm.mp3' or URL; null uses procedural ambient synthesizer)
    bgmUrl: 'assets/audio.mp3',
    // Custom Sound Effects (null uses procedural Web Audio sound effects)
    sfx: {
      flap: null,   // e.g. 'assets/flap.mp3'
      hit: null,    // e.g. 'assets/hit.mp3'
      score: null,  // e.g. 'assets/score.mp3'
    }
  },

  themes: {
    light: {
      id: 'light',
      name: 'Dawn Horizon',
      skyGradientTop: '#68b5ff',
      skyGradientBottom: '#d4ebfc',
      sunColor: '#fff5d0',
      sunGlow: 'rgba(255, 235, 170, 0.45)',
      mountainsFar: '#87bdf5',
      mountainsMid: '#5ea2ea',
      cityNear: '#478ad5',
      groundTop: '#4cb068',
      groundBody: '#388a4e',
      groundGrid: 'rgba(255, 255, 255, 0.25)',
      obstacleCap: '#2d68c4',
      obstacleBody: '#1e4b96',
      obstacleGlow: 'rgba(0, 162, 255, 0.4)',
      obstacleCore: '#5bc0ff',
      playerColor: '#ff6b35',
      playerWing: '#ffaa40',
      playerGlow: 'rgba(255, 107, 53, 0.6)',
      particleColor: '#ffe49e',
    },
    dark: {
      id: 'dark',
      name: 'Cyber Midnight',
      skyGradientTop: '#080c1e',
      skyGradientBottom: '#171b3c',
      sunColor: '#c5d8ff',
      sunGlow: 'rgba(120, 160, 255, 0.25)',
      mountainsFar: '#1c1f44',
      mountainsMid: '#141838',
      cityNear: '#0d1029',
      groundTop: '#00e5ff',
      groundBody: '#091024',
      groundGrid: 'rgba(0, 229, 255, 0.35)',
      obstacleCap: '#7928ca',
      obstacleBody: '#3a1368',
      obstacleGlow: 'rgba(216, 50, 255, 0.5)',
      obstacleCore: '#00f7ff',
      playerColor: '#00f7ff',
      playerWing: '#ff007f',
      playerGlow: 'rgba(0, 247, 255, 0.7)',
      particleColor: '#00f7ff',
    }
  }
};
