// ============================================================
// Mario Platformer — Phaser 3 Arcade Game
// ============================================================

const GAME_WIDTH = 480;
const GAME_HEIGHT = 320;
const TILE_SIZE = 32;
const LEVEL_COUNT = 2;

// ----------------------------------------------------------------
// Audio Manager — procedural 8-bit sounds via Web Audio API
// ----------------------------------------------------------------
class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = true;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  _play(freq, duration, type = 'square', volume = 1, freqEnd = null, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
    if (freqEnd !== null) {
      osc.frequency.linearRampToValueAtTime(freqEnd, this.ctx.currentTime + delay + duration);
    }
    gain.gain.setValueAtTime(volume, this.ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);
    osc.start(this.ctx.currentTime + delay);
    osc.stop(this.ctx.currentTime + delay + duration + 0.05);
  }

  jump() {
    this._play(400, 0.15, 'square', 0.5, 600);
  }

  coin() {
    const pitchMult = 0.85 + Math.random() * 0.3;
    this._play(988 * pitchMult, 0.1, 'square', 0.5, null);
    this._play(1319 * pitchMult, 0.15, 'square', 0.5, null, 0.1);
  }

  stomp() {
    this._play(200, 0.1, 'square', 0.6, 80);
  }

  death() {
    for (let i = 0; i < 6; i++) {
      this._play(400 - i * 50, 0.12, 'square', 0.5, null, i * 0.1);
    }
  }

  levelComplete() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this._play(n, 0.15, 'square', 0.5, null, i * 0.12));
  }

  gameOver() {
    const notes = [392, 330, 262, 196];
    notes.forEach((n, i) => this._play(n, 0.25, 'square', 0.5, null, i * 0.2));
  }

  win() {
    const melody = [523, 659, 784, 659, 784, 1047];
    const durations = [0.15, 0.15, 0.15, 0.15, 0.15, 0.3];
    let t = 0;
    melody.forEach((n, i) => {
      this._play(n, durations[i], 'square', 0.5, null, t);
      t += durations[i] + 0.05;
    });
  }
}

const audioManager = new AudioManager();

// ----------------------------------------------------------------
// Level data — platforms, coins, enemies, flagpole
// ----------------------------------------------------------------
function makeLevel1() {
  return {
    platforms: [
      // Ground sections
      { x: 0, y: 256, w: 256, h: 32 },
      { x: 320, y: 256, w: 160, h: 32 },
      { x: 544, y: 256, w: 192, h: 32 },
      { x: 800, y: 256, w: 128, h: 32 },
      { x: 992, y: 256, w: 224, h: 32 },
      // Floating platforms
      { x: 192, y: 192, w: 96, h: 16 },
      { x: 352, y: 160, w: 80, h: 16 },
      { x: 480, y: 192, w: 64, h: 16 },
      { x: 640, y: 144, w: 96, h: 16 },
      { x: 800, y: 176, w: 80, h: 16 },
      { x: 960, y: 144, w: 80, h: 16 },
      { x: 1104, y: 176, w: 112, h: 16 },
    ],
    coins: [
      { x: 100, y: 224 }, { x: 148, y: 224 }, { x: 200, y: 160 },
      { x: 360, y: 128 }, { x: 490, y: 160 }, { x: 530, y: 160 },
      { x: 660, y: 112 }, { x: 700, y: 112 }, { x: 820, y: 144 },
      { x: 980, y: 112 }, { x: 1030, y: 112 }, { x: 1130, y: 144 },
    ],
    enemies: [
      { x: 350, y: 240, patrolMin: 320, patrolMax: 480 },
      { x: 600, y: 240, patrolMin: 544, patrolMax: 700 },
      { x: 850, y: 240, patrolMin: 800, patrolMax: 900 },
    ],
    flagpole: { x: 1180, y: 96 },
    playerStart: { x: 50, y: 210 },
    levelWidth: 1240,
  };
}

function makeLevel2() {
  return {
    platforms: [
      // Ground with big gaps
      { x: 0, y: 256, w: 192, h: 32 },
      { x: 288, y: 256, w: 128, h: 32 },
      { x: 512, y: 256, w: 96, h: 32 },
      { x: 704, y: 256, w: 128, h: 32 },
      { x: 928, y: 256, w: 160, h: 32 },
      { x: 1184, y: 256, w: 224, h: 32 },
      // Floating platforms — more challenging
      { x: 100, y: 192, w: 64, h: 16 },
      { x: 220, y: 160, w: 80, h: 16 },
      { x: 360, y: 192, w: 64, h: 16 },
      { x: 480, y: 144, w: 96, h: 16 },
      { x: 620, y: 176, w: 80, h: 16 },
      { x: 740, y: 144, w: 64, h: 16 },
      { x: 880, y: 176, w: 80, h: 16 },
      { x: 1000, y: 144, w: 96, h: 16 },
      { x: 1150, y: 176, w: 80, h: 16 },
      { x: 1280, y: 144, w: 96, h: 16 },
    ],
    coins: [
      { x: 130, y: 160 }, { x: 250, y: 128 }, { x: 380, y: 160 },
      { x: 500, y: 112 }, { x: 540, y: 112 }, { x: 640, y: 144 },
      { x: 760, y: 112 }, { x: 900, y: 144 }, { x: 1030, y: 112 },
      { x: 1070, y: 112 }, { x: 1170, y: 144 }, { x: 1320, y: 112 },
    ],
    enemies: [
      { x: 160, y: 240, patrolMin: 0, patrolMax: 192 },
      { x: 360, y: 240, patrolMin: 288, patrolMax: 416 },
      { x: 620, y: 240, patrolMin: 512, patrolMax: 640 },
      { x: 780, y: 240, patrolMin: 704, patrolMax: 832 },
      { x: 1020, y: 240, patrolMin: 928, patrolMax: 1088 },
    ],
    flagpole: { x: 1370, y: 96 },
    playerStart: { x: 50, y: 210 },
    levelWidth: 1440,
  };
}

const LEVELS = [makeLevel1(), makeLevel2()];

// ----------------------------------------------------------------
// Helper: draw procedural player sprite
// ----------------------------------------------------------------
function drawPlayerTexture(scene, key) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  // Hat (red)
  g.fillStyle(0xe52521);
  g.fillRect(4, 0, 24, 6);
  // Face (skin)
  g.fillStyle(0xf5c685);
  g.fillRect(6, 6, 20, 12);
  // Eyes
  g.fillStyle(0x000000);
  g.fillRect(8, 8, 4, 4);
  g.fillRect(18, 8, 4, 4);
  // Body (blue overalls)
  g.fillStyle(0x0d47a1);
  g.fillRect(4, 18, 24, 14);
  // Overall straps
  g.fillStyle(0x1565c0);
  g.fillRect(6, 18, 4, 14);
  g.fillRect(22, 18, 4, 14);
  // Buttons
  g.fillStyle(0xffd700);
  g.fillRect(12, 20, 4, 4);
  g.fillRect(18, 20, 4, 4);
  // Shoes (brown)
  g.fillStyle(0x6d4c41);
  g.fillRect(4, 32, 12, 6);
  g.fillRect(16, 32, 12, 6);
  g.generateTexture(key, 32, 38);
  g.destroy();
}

function drawEnemyTexture(scene, key) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  // Goomba body (brown)
  g.fillStyle(0x8d6e63);
  g.fillRoundedRect(2, 8, 28, 18, 4);
  // Dark top
  g.fillStyle(0x5d4037);
  g.fillRoundedRect(4, 2, 24, 12, 4);
  // Eyes (angry)
  g.fillStyle(0xffffff);
  g.fillRect(6, 8, 8, 8);
  g.fillRect(18, 8, 8, 8);
  g.fillStyle(0x000000);
  g.fillRect(10, 10, 4, 5);
  g.fillRect(22, 10, 4, 5);
  // Feet
  g.fillStyle(0x4e342e);
  g.fillRect(2, 26, 10, 6);
  g.fillRect(22, 26, 10, 6);
  g.generateTexture(key, 32, 32);
  g.destroy();
}

function drawCoinTexture(scene, key) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffd700);
  g.fillCircle(8, 8, 7);
  g.fillStyle(0xffa000);
  g.fillCircle(8, 8, 4);
  g.generateTexture(key, 16, 16);
  g.destroy();
}

function drawPlatformTexture(scene, key, w, h, color = 0x2e7d32) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color);
  g.fillRect(0, 0, w, h);
  // Grass top
  g.fillStyle(0x43a047);
  g.fillRect(0, 0, w, 6);
  // Dirt texture
  g.fillStyle(0x1b5e20);
  for (let i = 0; i < w; i += 8) {
    for (let j = 6; j < h; j += 8) {
      if (Math.random() > 0.6) {
        g.fillStyle(0x2e7d32);
        g.fillRect(i + Math.random() * 4, j, 4, 4);
      }
    }
  }
  g.generateTexture(key, w, h);
  g.destroy();
}

function drawCloudTexture(scene, key) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff);
  g.fillCircle(20, 20, 16);
  g.fillCircle(40, 18, 20);
  g.fillCircle(60, 22, 14);
  g.fillRect(10, 20, 56, 14);
  g.generateTexture(key, 72, 40);
  g.destroy();
}

function drawHillTexture(scene, key) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x388e3c);
  g.fillTriangle(0, 80, 80, 0, 160, 80);
  g.fillStyle(0x2e7d32);
  g.fillTriangle(0, 80, 80, 20, 160, 80);
  g.generateTexture(key, 160, 80);
  g.destroy();
}

function drawFlagTexture(scene, key) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  // Pole
  g.fillStyle(0x757575);
  g.fillRect(2, 0, 6, 128);
  // Flag
  g.fillStyle(0x4caf50);
  g.fillRect(8, 4, 28, 20);
  // Ball on top
  g.fillStyle(0xffd700);
  g.fillCircle(5, 4, 6);
  g.generateTexture(key, 36, 130);
  g.destroy();
}

function drawParticleTexture(scene, key) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffd700);
  g.fillCircle(4, 4, 4);
  g.generateTexture(key, 8, 8);
  g.destroy();
}

function drawDustTexture(scene, key) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xd7ccc8);
  g.fillCircle(3, 3, 3);
  g.generateTexture(key, 6, 6);
  g.destroy();
}

function drawConfettiTexture(scene, key, color) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color);
  g.fillRect(0, 0, 6, 10);
  g.generateTexture(key, 6, 10);
  g.destroy();
}

// ----------------------------------------------------------------
// Boot Scene — generate textures
// ----------------------------------------------------------------
class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  create() {
    audioManager.init();
    drawPlayerTexture(this, 'player');
    drawEnemyTexture(this, 'enemy');
    drawCoinTexture(this, 'coin');
    drawCloudTexture(this, 'cloud');
    drawHillTexture(this, 'hill');
    drawFlagTexture(this, 'flag');
    drawParticleTexture(this, 'sparkle');
    drawDustTexture(this, 'dust');
    ['confetti_gold','confetti_red','confetti_green','confetti_blue'].forEach((key, i) => {
      const colors = [0xffd700, 0xe52521, 0x4caf50, 0x2196f3];
      drawConfettiTexture(this, key, colors[i]);
    });
    this.scene.start('MenuScene');
  }
}

// ----------------------------------------------------------------
// Menu Scene
// ----------------------------------------------------------------
class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    const { width, height } = this.cameras.main;

    // Draw background
    this.add.graphics()
      .fillGradientStyle(0x87ceeb, 0x87ceeb, 0x4fc3f7, 0x4fc3f7, 1, 1, 1, 1)
      .fillRect(0, 0, width, height);

    // Clouds
    for (let i = 0; i < 5; i++) {
      this.add.image(60 + i * 100, 50 + Math.random() * 40, 'cloud').setAlpha(0.9);
    }

    // Ambient sparkle particles in background
    const sparkleKeys = ['sparkle'];
    const starEmitter = this.add.particles(0, 0, 'sparkle', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 0, max: GAME_HEIGHT },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.7, end: 0 },
      speed: { min: 5, max: 20 },
      angle: { min: 260, max: 280 },
      lifespan: 2500,
      frequency: 300,
      emitting: true,
    });
    starEmitter.setDepth(0);

    // Title
    const title = this.add.text(width / 2, 80, 'MARIO\nPLATFORMER', {
      fontFamily: 'monospace', fontSize: '42px', color: '#e52521',
      align: 'center', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10);

    // Gentle glow pulse on title
    this.tweens.add({
      targets: title,
      scaleX: 1.04, scaleY: 1.04,
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Bounce animation
    this.tweens.add({
      targets: title, y: title.y - 10,
      duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Tap to start
    const tap = this.add.text(width / 2, 200, 'TAP TO START', {
      fontFamily: 'monospace', fontSize: '16px', color: '#fff',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: tap, alpha: 0.3,
      duration: 600, yoyo: true, repeat: -1,
    });

    // Player preview
    this.add.image(width / 2, 270, 'player').setScale(1.5);

    // Input
    this.input.once('pointerdown', () => {
      audioManager.resume();
      this.scene.start('GameScene', { level: 0, lives: 3, coins: 0, score: 0 });
    });

    this.input.keyboard.once('keydown-SPACE', () => {
      audioManager.resume();
      this.scene.start('GameScene', { level: 0, lives: 3, coins: 0, score: 0 });
    });
  }
}

// ----------------------------------------------------------------
// Game Scene
// ----------------------------------------------------------------
class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this.levelIndex = data.level ?? 0;
    this.lives = data.lives ?? 3;
    this.coins = data.coins ?? 0;
    this.score = data.score ?? 0;
    this.isRespawning = false;
    this.isDying = false;
    this.levelComplete = false;
    this.jumpHeld = false;
    this.dpadUp = false;
    this.dpadLeft = false;
    this.dpadDown = false;
    this.dpadRight = false;
  }

  create() {
    const levelData = LEVELS[this.levelIndex];
    this.levelWidth = levelData.levelWidth;

    // World bounds
    this.physics.world.setBounds(0, 0, this.levelWidth, GAME_HEIGHT + 100);
    this.cameras.main.setBounds(0, 0, this.levelWidth, GAME_HEIGHT);

    // Parallax sky (gradient)
    this._drawParallaxBg();

    // Clouds (parallax)
    this.clouds = this.add.group();
    for (let i = 0; i < 8; i++) {
      const cloud = this.add.image(
        60 + i * (this.levelWidth / 8) + Math.random() * 60,
        30 + Math.random() * 60, 'cloud'
      ).setAlpha(0.7).setScrollFactor(0.2);
      this.clouds.add(cloud);
    }

    // Hills (parallax)
    this.hills = this.add.group();
    for (let i = 0; i < Math.ceil(this.levelWidth / 160); i++) {
      const hill = this.add.image(i * 160, 240, 'hill').setScrollFactor(0.4);
      this.hills.add(hill);
    }

    // Platforms
    this.platforms = this.physics.add.staticGroup();
    levelData.platforms.forEach(p => {
      const key = `plat_${p.w}_${p.h}`;
      if (!this.textures.exists(key)) {
        drawPlatformTexture(this, key, p.w, p.h, p.y === 256 ? 0x2e7d32 : 0x558b2f);
      }
      const platform = this.add.image(p.x + p.w / 2, p.y + p.h / 2, key);
      this.platforms.add(platform, true);
    });

    // Flagpole
    this.flagpole = this.add.image(levelData.flagpole.x, levelData.flagpole.y, 'flag').setOrigin(0, 0);
    const flagCollider = this.add.rectangle(
      levelData.flagpole.x + 18, levelData.flagpole.y + 65, 12, 130, 0x000000, 0
    );
    this.physics.add.existing(flagCollider, true);

    // Coins
    this.coinGroup = this.physics.add.group();
    levelData.coins.forEach(c => {
      const coin = this.coinGroup.create(c.x, c.y, 'coin').setCircle(7, 1, 1);
      coin.body.setAllowGravity(false);
      // Float animation
      this.tweens.add({
        targets: coin, y: coin.y - 4,
        duration: 500 + Math.random() * 300, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Enemies
    this.enemies = this.physics.add.group();
    levelData.enemies.forEach(e => {
      const enemy = this.enemies.create(e.x, e.y, 'enemy');
      enemy.setCollideWorldBounds(false);
      enemy.body.setAllowGravity(true);
      enemy.setVelocityX(60);
      enemy.patrolMin = e.patrolMin;
      enemy.patrolMax = e.patrolMax;
      enemy.patrolDir = 1;
      // Walk back and forth
      this.time.addEvent({
        delay: 100,
        callback: () => {
          if (!enemy || !enemy.active || !enemy.body) return;
          // Destroy enemies that have fallen off the level
          if (enemy.y > GAME_HEIGHT + 50) { enemy.destroy(); return; }
          if (enemy.body.position.x <= enemy.patrolMin) enemy.patrolDir = 1;
          if (enemy.body.position.x >= enemy.patrolMax) enemy.patrolDir = -1;
          enemy.setVelocityX(60 * enemy.patrolDir);
          enemy.setFlipX(enemy.patrolDir < 0);
        },
        loop: true,
      });
    });

    // Player
    this.player = this.physics.add.sprite(
      levelData.playerStart.x, levelData.playerStart.y, 'player'
    );
    this.player.setCollideWorldBounds(false);
    this.player.body.setSize(24, 36);
    this.player.body.setOffset(4, 2);
    this.player.body.setGravityY(600);

    // Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.player, this.coinGroup, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);

    // Flagpole collision
    this.physics.add.overlap(this.player, flagCollider, () => {
      if (!this.levelComplete) this._onLevelComplete();
    }, null, this);

    // Controls — keyboard
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Touch D-pad
    this._createDPad();

    // Camera follow with lerp
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // HUD
    this._createHUD();

    // Particle emitter for coins
    this.coinParticles = this.add.particles(0, 0, 'sparkle', {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 400,
      gravityY: 100,
      emitting: false,
    });
    this.coinParticles.setDepth(100);

    // Confetti emitter (lazy-init on level complete)
    this.confettiEmitter = null;

    // Landing dust emitter
    this.dustEmitter = this.add.particles(0, 0, 'dust', {
      speed: { min: 20, max: 60 },
      angle: { min: 200, max: 340 },
      scale: { start: 1, end: 0.5 },
      lifespan: 300,
      gravityY: 50,
      emitting: false,
    });
    this.dustEmitter.setDepth(50);

    // Store previous Y for landing detection
    this._prevPlayerY = this.player.y;

    // Fall death is handled in update() by checking player.y > GAME_HEIGHT + 40
  }

  _drawParallaxBg() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x4fc3f7, 0x4fc3f7, 1, 1, 1, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.setScrollFactor(0);
    g.setDepth(-100);
  }

  _createDPad() {
    // ── Mario Glass D-Pad (cross layout) ──
    // Frosted-glass buttons with glow halos, smooth press feedback.
    // Cross: left/right on middle row, up/down on middle column.
    // Pointermove global handler enables simultaneous hold-combos.

    const size     = 52;
    const radius   = 14;
    const hSpacing = 60;  // left↔right gap
    const vSpacing = 58;  // up↔down gap
    const baseX    = 74;
    const baseY    = GAME_HEIGHT - 72;

    const COLORS = {
      up:    { base: 0x2e7d32, pressed: 0x66bb6a, glow: 0x4caf50 },
      left:  { base: 0x388e3c, pressed: 0x66bb6a, glow: 0x4caf50 },
      down:  { base: 0x388e3c, pressed: 0x66bb6a, glow: 0x4caf50 },
      right: { base: 0x1b5e20, pressed: 0x66bb6a, glow: 0x4caf50 },
    };

    // Cross layout: left/right share same Y row, up/down share same X column
    const positions = {
      up:    { x: baseX,            y: baseY - vSpacing },
      left:  { x: baseX - hSpacing, y: baseY            },
      down:  { x: baseX,            y: baseY + vSpacing },
      right: { x: baseX + hSpacing, y: baseY            },
    };

    const arrows = { up: '▲', left: '◀', down: '▼', right: '▶' };
    const keyMap = { up: 'dpadUp', left: 'dpadLeft', down: 'dpadDown', right: 'dpadRight' };
    const ids    = ['up', 'left', 'down', 'right'];

    // ── Multi-layer glow halo helper ──
    const makeGlow = (gfx, x, y, w, h, r, color, alpha) => {
      for (let i = 3; i >= 1; i--) {
        gfx.fillStyle(color, alpha / i);
        gfx.fillRoundedRect(x - w / 2 - i * 5, y - h / 2 - i * 5, w + i * 10, h + i * 10, r + i * 5);
      }
    };

    // ── Build all four buttons with shared state ──
    ids.forEach((id) => {
      const { x, y } = positions[id];
      const pal      = COLORS[id];
      const key      = keyMap[id];

      // Glow halo (depth 199)
      const glowGfx = this.add.graphics().setDepth(199).setScrollFactor(0);
      const drawGlow = (color, alpha) => { glowGfx.clear(); makeGlow(glowGfx, x, y, size, size, radius, color, alpha); };
      drawGlow(pal.glow, 0.35);

      // Frosted-glass base (depth 200)
      const shadowGfx = this.add.graphics().setDepth(200).setScrollFactor(0);
      const drawShadow = (fillColor, strokeAlpha) => {
        shadowGfx.clear();
        shadowGfx.fillStyle(0x000000, 0.22);
        shadowGfx.fillRoundedRect(x - size / 2 + 2, y - size / 2 + 3, size, size, radius);
        shadowGfx.fillStyle(fillColor, 0.72);
        shadowGfx.fillRoundedRect(x - size / 2, y - size / 2, size, size, radius);
        shadowGfx.fillStyle(0xffffff, 0.18);
        shadowGfx.fillRoundedRect(x - size / 2 + 3, y - size / 2 + 3, size - 6, size / 3, radius * 0.6);
        shadowGfx.lineStyle(1.5, 0xffffff, strokeAlpha);
        shadowGfx.strokeRoundedRect(x - size / 2, y - size / 2, size, size, radius);
      };
      drawShadow(pal.base, 0.55);

      // Invisible hit-area (depth 201) — stored globally for pointermove access
      const hit = this.add.rectangle(x, y, size, size, 0x000000, 0)
        .setDepth(201).setScrollFactor(0).setInteractive({ draggable: false });
      this[`_dpad_hit_${id}`] = hit;
      this[`_dpad_${id}`]     = { press: null, release: null }; // filled below

      // Arrow label (depth 202)
      const lbl = this.add.text(x, y, arrows[id], {
        fontSize: '20px', color: '#e8f5e9', fontFamily: 'monospace',
        stroke: '#1b5e20', strokeThickness: 2,
        shadow: { offsetX: 0, offsetY: 1, color: '#000', blur: 2, fill: true },
      }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

      // Press animation
      const press = () => {
        drawShadow(pal.pressed, 0.8);
        drawGlow(pal.glow, 0.7);
        this.tweens.add({ targets: lbl, scaleX: 0.82, scaleY: 0.82, duration: 80, ease: 'Sine.easeOut' });
        this[key] = true;
      };

      // Release animation
      const release = () => {
        drawShadow(pal.base, 0.55);
        drawGlow(pal.glow, 0.35);
        this.tweens.add({ targets: lbl, scaleX: 1, scaleY: 1, duration: 130, ease: 'Back.easeOut' });
        this[key] = false;
      };

      // Store refs for global pointermove
      this[`_dpad_${id}`] = { press, release, drawShadow, drawGlow };

      // Pointer events on hit area
      hit.on('pointerdown',  press);
      hit.on('pointerup',    release);
      hit.on('pointerout',   release);
    });

    // ── Global pointermove — enables drag between buttons + hold-combos ──
    this._dpad_pointermove = (pointer) => {
      if (!pointer.isDown) return;
      ids.forEach((id) => {
        const hit       = this[`_dpad_hit_${id}`];
        const key       = keyMap[id];
        const inBounds  = hit.getBounds().contains(pointer.x, pointer.y);
        const wasActive = this[key];
        if (inBounds && !wasActive) {
          this[`_dpad_${id}`].press();
        } else if (!inBounds && wasActive) {
          this[`_dpad_${id}`].release();
        }
      });
    };
    this.input.on('pointermove', this._dpad_pointermove);

    // Clean up on scene shutdown
    this.events.on('shutdown', () => {
      this.input.off('pointermove', this._dpad_pointermove);
    });

    // State flags
    this.dpadUp    = false;
    this.dpadLeft  = false;
    this.dpadDown  = false;
    this.dpadRight = false;
  }

  _createHUD() {
    const hud = this.add.container(0, 0).setDepth(300).setScrollFactor(0);

    // Background bar
    hud.add(this.add.rectangle(0, 0, GAME_WIDTH, 28, 0x000000).setAlpha(0.6));

    // Lives
    hud.add(this.add.image(12, 14, 'player').setScale(0.7));
    hud.add(this.add.text(28, 6, `×${this.lives}`, {
      fontSize: '14px', color: '#fff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
    }));

    // Level
    hud.add(this.add.text(GAME_WIDTH / 2, 6, `LEVEL ${this.levelIndex + 1}`, {
      fontSize: '13px', color: '#ffd700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0));

    // Coins
    hud.add(this.add.image(GAME_WIDTH - 100, 14, 'coin').setScale(0.9));
    hud.add(this.add.text(GAME_WIDTH - 85, 6, `×${this.coins}`, {
      fontSize: '14px', color: '#fff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
    }));

    // Score
    hud.add(this.add.text(GAME_WIDTH - 28, 6, `${this.score}`, {
      fontSize: '14px', color: '#fff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0));

    this.hud = hud;
  }

  collectCoin(player, coin) {
    audioManager.coin();
    this.coinParticles.emitParticleAt(coin.x, coin.y, 8);
    this._showScorePopup(coin.x, coin.y, '+100');
    coin.destroy();
    this.coins++;
    this.score += 100;
    this._updateHUD();
  }

  _showScorePopup(x, y, text, color = '#ffd700') {
    const popup = this.add.text(x, y, text, {
      fontSize: '16px', color: color, fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(150);
    this.tweens.add({
      targets: popup, y: popup.y - 40, alpha: 0,
      duration: 800, ease: 'Power2',
      onComplete: () => popup.destroy(),
    });
  }

  _burstEnemyParticles(enemy) {
    const count = 8 + Math.floor(Math.random() * 5);
    const burst = this.add.particles(enemy.x, enemy.y, 'sparkle', {
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      lifespan: 500,
      gravityY: 200,
      quantity: count,
      emitting: true,
    });
    burst.setDepth(150);
    this.time.delayedCall(550, () => burst.destroy());
  }

  hitEnemy(player, enemy) {
    if (this.isDying || this.isRespawning || this.levelComplete) return;

    const playerBottom = player.body.bottom;
    const enemyTop = enemy.body.top;
    const diff = playerBottom - enemyTop;

    if (diff > 0 && diff < 20 && player.body.velocity.y > 0) {
      // Stomp from above
      audioManager.stomp();
      this._burstEnemyParticles(enemy);
      this._showScorePopup(enemy.x, enemy.y - 10, '+200');
      this.score += 200;
      this._updateHUD();
      enemy.destroy();
      player.setVelocityY(-250);
    } else {
      // Hit from side or below
      this._onPlayerDeath();
    }
  }

  _onFallDeath() {
    if (this.isDying || this.isRespawning || this.levelComplete) return;
    this._onPlayerDeath();
  }

  _onPlayerDeath() {
    if (this.isDying) return;
    this.isDying = true;
    this.jumpHeld = false;
    this.physics.world.gravity.y = 800;
    audioManager.death();

    // Flash + fall animation
    this.cameras.main.flash(200, 255, 200, 200);
    this.player.body.setVelocity(0, -300);
    this.player.body.setAllowGravity(true);
    this.player.setFlipY(true);

    this.time.delayedCall(1500, () => {
      this.lives--;
      this._updateHUD();
      if (this.lives <= 0) {
        // Gentle "aww" moment then seamlessly restart — never a scary game over
        this._showGentleAww();
      } else {
        this.scene.restart({
          level: this.levelIndex, lives: this.lives, coins: this.coins, score: this.score,
        });
      }
    });
  }

  _showGentleAww() {
    const { width, height } = this.cameras.main;
    const overlay = this.add.graphics().setDepth(500).setScrollFactor(0);
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const msg = this.add.text(width / 2, height / 2 - 20, 'aww...', {
      fontSize: '32px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(501);

    const sub = this.add.text(width / 2, height / 2 + 20, 'no worries, try again!', {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(501);

    // Fade in the message
    msg.setAlpha(0);
    sub.setAlpha(0);
    this.tweens.add({ targets: [msg, sub], alpha: 1, duration: 400, ease: 'Power2' });

    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [msg, sub, overlay], alpha: 0,
        duration: 300, ease: 'Power2',
        onComplete: () => {
          overlay.destroy(); msg.destroy(); sub.destroy();
        },
      });
    });

    this.time.delayedCall(2500, () => {
      this.scene.start('MenuScene');
    });
  }

  _onLevelComplete() {
    this.levelComplete = true;
    this.jumpHeld = false;
    this.physics.world.gravity.y = 800;
    audioManager.levelComplete();
    this.player.body.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.player.body.reset(this.flagpole.x + 10, this.flagpole.y + 10);
    this.player.setFlipX(false);

    // Confetti burst!
    if (!this.confettiEmitter) {
      this.confettiEmitter = this.add.particles(0, 0, 'confetti_gold', {
        speed: { min: 30, max: 100 },
        angle: { min: 60, max: 120 },
        scale: { start: 1, end: 0.8 },
        lifespan: 3500,
        gravityY: 80,
        frequency: 50,
        emitting: false,
      });
      // Add multi-color emitters
      ['confetti_red','confetti_green','confetti_blue'].forEach(key => {
        const em = this.add.particles(0, 0, key, {
          speed: { min: 30, max: 100 },
          angle: { min: 60, max: 120 },
          scale: { start: 1, end: 0.8 },
          lifespan: 3500,
          gravityY: 80,
          frequency: 50,
          emitting: false,
        });
        em.start();
      });
      this.confettiEmitter.start();
    }
    // Reposition and burst confetti from top of screen
    this.confettiEmitter.setPosition(this.cameras.main.scrollX + GAME_WIDTH / 2, -10);
    this.confettiEmitter.explode(60);

    this.time.delayedCall(1500, () => {
      if (this.levelIndex + 1 >= LEVELS.length) {
        this.scene.start('WinScene', { score: this.score, coins: this.coins });
      } else {
        this.scene.start('LevelCompleteScene', {
          level: this.levelIndex + 1, lives: this.lives, coins: this.coins, score: this.score,
        });
      }
    });
  }

  _updateHUD() {
    // Quick update by rebuilding HUD
    this.hud.destroy();
    this._createHUD();
  }

  update() {
    if (this.isDying || this.levelComplete) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const moveLeft = this.cursors.left.isDown || this.wasd.left.isDown || this.dpadLeft;
    const moveRight = this.cursors.right.isDown || this.wasd.right.isDown || this.dpadRight;
    const jump = this.cursors.up.isDown || this.cursors.space.isDown || this.wasd.up.isDown || this.dpadUp;

    if (moveLeft) {
      this.player.setVelocityX(-180);
      this.player.setFlipX(true);
    } else if (moveRight) {
      this.player.setVelocityX(180);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    if (jump && onGround) {
      this.player.setVelocityY(-520);
      this.jumpHeld = true;
      audioManager.jump();
    }

    // Variable jump height — Mario-style: lower gravity while holding jump and rising
    if (this.jumpHeld && this.player.body.velocity.y < 0) {
      // Reduce gravity while jump held and still going up — lighter float for more height
      this.physics.world.gravity.y = 200;
    } else {
      // Restore normal gravity
      this.physics.world.gravity.y = 800;
    }

    // Jump cut — release early cuts float, falls normally
    if (this.jumpHeld && !jump) {
      this.jumpHeld = false;
      this.physics.world.gravity.y = 800;
    }

    // Prevent going off left edge
    if (this.player.x < 8) this.player.x = 8;

    // Fall death check
    if (this.player.y > GAME_HEIGHT + 40) {
      this._onFallDeath();
    }

    // Landing dust check
    const onGroundNow = this.player.body.blocked.down || this.player.body.touching.down;
    if (onGroundNow && this._prevPlayerY !== undefined && this.player.y > this._prevPlayerY + 4) {
      this.dustEmitter.emitParticleAt(this.player.x, this.player.y + 16, 4);
    }
    this._prevPlayerY = this.player.y;
  }
}

// ----------------------------------------------------------------
// Level Complete Scene
// ----------------------------------------------------------------
class LevelCompleteScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelCompleteScene' }); }

  init(data) {
    this.nextLevel = data.level;
    this.lives = data.lives;
    this.coins = data.coins;
    this.score = data.score;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.resetFX();

    this.add.graphics().fillGradientStyle(0x000000, 0x000000, 0x1a237e, 0x1a237e, 0.85, 0.85, 0.85, 0.85).fillRect(0, 0, width, height);

    // Sparkle stars behind the text
    const starEmitter = this.add.particles(width / 2, height / 2 - 30, 'sparkle', {
      x: { min: -120, max: 120 },
      y: { min: -60, max: 60 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      speed: { min: 10, max: 40 },
      angle: { min: 0, max: 360 },
      lifespan: 1200,
      frequency: 150,
      emitting: true,
    });
    starEmitter.setDepth(0);

    const t1 = this.add.text(width / 2, 100, 'LEVEL COMPLETE!', {
      fontSize: '28px', color: '#ffd700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.tweens.add({ targets: t1, scale: 1.1, duration: 500, yoyo: true, repeat: -1 });

    this.add.text(width / 2, 160, `Score: ${this.score}`, {
      fontSize: '18px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(width / 2, 190, `Coins: ${this.coins}`, {
      fontSize: '16px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const continueText = this.add.text(width / 2, 260, 'TAP TO CONTINUE', {
      fontSize: '16px', color: '#fff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({ targets: continueText, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', () => {
      this.scene.start('GameScene', {
        level: this.nextLevel, lives: this.lives, coins: this.coins, score: this.score,
      });
    });

    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('GameScene', {
        level: this.nextLevel, lives: this.lives, coins: this.coins, score: this.score,
      });
    });
  }
}

// ----------------------------------------------------------------
// Game Over Scene
// ----------------------------------------------------------------
class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  init(data) { this.finalScore = data.score ?? 0; }

  create() {
    const { width, height } = this.cameras.main;
    audioManager.gameOver();

    this.add.graphics().fillGradientStyle(0x000000, 0x000000, 0xb71c1c, 0xb71c1c, 0.9, 0.9, 0.9, 0.9).fillRect(0, 0, width, height);

    this.add.text(width / 2, 100, 'GAME OVER', {
      fontSize: '36px', color: '#e52521', fontFamily: 'monospace', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, 160, `Final Score: ${this.finalScore}`, {
      fontSize: '20px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const retry = this.add.text(width / 2, 230, 'TAP TO RETRY', {
      fontSize: '18px', color: '#fff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({ targets: retry, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', () => this.scene.start('MenuScene'));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('MenuScene'));
  }
}

// ----------------------------------------------------------------
// Win Scene
// ----------------------------------------------------------------
class WinScene extends Phaser.Scene {
  constructor() { super({ key: 'WinScene' }); }

  init(data) {
    this.finalScore = data.score ?? 0;
    this.totalCoins = data.coins ?? 0;
  }

  create() {
    const { width, height } = this.cameras.main;
    audioManager.win();

    this.add.graphics().fillGradientStyle(0x000000, 0x000000, 0x1b5e20, 0x1b5e20, 0.9, 0.9, 0.9, 0.9).fillRect(0, 0, width, height);

    this.add.text(width / 2, 70, 'YOU WIN!', {
      fontSize: '40px', color: '#ffd700', fontFamily: 'monospace', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, 130, `Score: ${this.finalScore}`, {
      fontSize: '22px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(width / 2, 165, `Coins: ${this.totalCoins}`, {
      fontSize: '18px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(width / 2, 210, '🎉 Great job! 🎉', {
      fontSize: '20px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const again = this.add.text(width / 2, 260, 'TAP TO PLAY AGAIN', {
      fontSize: '16px', color: '#fff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({ targets: again, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', () => this.scene.start('MenuScene'));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('MenuScene'));
  }
}

// ----------------------------------------------------------------
// Game Config
// ----------------------------------------------------------------
const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#87ceeb',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 800 }, debug: false },
  },
  scene: [BootScene, MenuScene, GameScene, LevelCompleteScene, GameOverScene, WinScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);
