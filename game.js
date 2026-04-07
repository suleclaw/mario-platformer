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
    this._play(988, 0.1, 'square', 0.5, null);
    this._play(1319, 0.15, 'square', 0.5, null, 0.1);
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

    // Title
    const title = this.add.text(width / 2, 80, 'MARIO\nPLATFORMER', {
      fontFamily: 'monospace', fontSize: '42px', color: '#e52521',
      align: 'center', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);

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
    const dpad = this.add.container(0, 0).setDepth(200).setScrollFactor(0);
    const alpha = 0.55;
    const btnColor = 0xcccccc;
    const btnPressed = 0x888888;
    const size = 42;
    const spacing = 46;

    // Left button
    const btnLeft = this.add.rectangle(60, GAME_HEIGHT - 60, size, size, btnColor)
      .setAlpha(alpha).setStrokeStyle(2, 0xffffff).setInteractive({ draggable: false });
    const lblL = this.add.text(60, GAME_HEIGHT - 60, '◀', {
      fontSize: '18px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0.8);

    // Right button
    const btnRight = this.add.rectangle(60 + spacing, GAME_HEIGHT - 60, size, size, btnColor)
      .setAlpha(alpha).setStrokeStyle(2, 0xffffff).setInteractive({ draggable: false });
    const lblR = this.add.text(60 + spacing, GAME_HEIGHT - 60, '▶', {
      fontSize: '18px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0.8);

    // Jump button
    const btnJump = this.add.rectangle(GAME_WIDTH - 60, GAME_HEIGHT - 60, size + 8, size + 8, btnColor)
      .setAlpha(alpha).setStrokeStyle(2, 0xffffff).setInteractive({ draggable: false });
    const lblJ = this.add.text(GAME_WIDTH - 60, GAME_HEIGHT - 60, '▲', {
      fontSize: '20px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0.8);

    dpad.add([btnLeft, btnRight, btnJump, lblL, lblR, lblJ]);

    // Touch handlers
    const press = (btn, lbl) => { btn.setFillStyle(btnPressed); lbl.setScale(0.9); };
    const release = (btn, lbl) => { btn.setFillStyle(btnColor); lbl.setScale(1); };

    const makeTouch = (btn, lbl, key) => {
      btn.on('pointerdown', () => { press(btn, lbl); this[key] = true; });
      btn.on('pointerup', () => { release(btn, lbl); this[key] = false; });
      btn.on('pointerout', () => { release(btn, lbl); this[key] = false; });
    };

    makeTouch(btnLeft, lblL, 'dpadLeft');
    makeTouch(btnRight, lblR, 'dpadRight');
    makeTouch(btnJump, lblJ, 'dpadJump');

    this.dpadLeft = false;
    this.dpadRight = false;
    this.dpadJump = false;
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
    coin.destroy();
    this.coins++;
    this.score += 100;
    this._updateHUD();
  }

  hitEnemy(player, enemy) {
    if (this.isDying || this.isRespawning || this.levelComplete) return;

    const playerBottom = player.body.bottom;
    const enemyTop = enemy.body.top;
    const diff = playerBottom - enemyTop;

    if (diff > 0 && diff < 20 && player.body.velocity.y > 0) {
      // Stomp from above
      audioManager.stomp();
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
    audioManager.death();

    // Flash + fall animation
    this.cameras.main.flash(200, 255, 0, 0);
    this.player.body.setVelocity(0, -300);
    this.player.body.setAllowGravity(true);
    this.player.setFlipY(true);

    this.time.delayedCall(1500, () => {
      this.lives--;
      this._updateHUD();
      if (this.lives <= 0) {
        this.scene.start('GameOverScene', { score: this.score });
      } else {
        this.scene.restart({
          level: this.levelIndex, lives: this.lives, coins: this.coins, score: this.score,
        });
      }
    });
  }

  _onLevelComplete() {
    this.levelComplete = true;
    this.jumpHeld = false;
    audioManager.levelComplete();
    this.player.body.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.player.body.reset(this.flagpole.x + 10, this.flagpole.y + 10);
    this.player.setFlipX(false);

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
    const jump = this.cursors.up.isDown || this.cursors.space.isDown || this.wasd.up.isDown || this.dpadJump;

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
      this.player.setVelocityY(-420);
      this.jumpHeld = true;
      audioManager.jump();
    }

    // Variable jump height — cut gravity while holding jump and still rising
    if (this.jumpHeld && this.player.body.velocity.y < 0) {
      this.player.body.setGravityScale(0.4);
    } else {
      this.player.body.setGravityScale(1);
    }

    // Jump cut — release early drops faster
    if (this.jumpHeld && !jump) {
      this.jumpHeld = false;
      this.player.body.setGravityScale(1);
    }

    // Prevent going off left edge
    if (this.player.x < 8) this.player.x = 8;

    // Fall death check
    if (this.player.y > GAME_HEIGHT + 40) {
      this._onFallDeath();
    }
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
