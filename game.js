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

  powerUp() {
    // Triumphant ascending arpeggio
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((n, i) => this._play(n, 0.12, 'square', 0.5, null, i * 0.08));
  }
}

const audioManager = new AudioManager();

// ----------------------------------------------------------------
// Character Definitions
// ----------------------------------------------------------------
const CHARACTERS = [
  { id: 'red',    name: 'Mario',        color: 0x0d47a1, hat: 0xe52521, unlock: 'default',   unlockDesc: '' },
  { id: 'blue',   name: 'Blue Mario',   color: 0x1565c0, hat: 0xe52521, unlock: 'coins_10',  unlockDesc: 'Collect 10 coins' },
  { id: 'green',  name: 'Green Mario',  color: 0x2e7d32, hat: 0xe52521, unlock: 'level1',    unlockDesc: 'Complete Level 1' },
  { id: 'yellow', name: 'Yellow Mario', color: 0xf9a825, hat: 0xe52521, unlock: 'coins_20',  unlockDesc: 'Collect 20 coins' },
  { id: 'purple', name: 'Purple Mario', color: 0x6a1b9a, hat: 0xe52521, unlock: 'level2',    unlockDesc: 'Complete Level 2' },
  { id: 'rainbow',name: 'Rainbow',      color: null,    hat: null,      unlock: 'hidden',    unlockDesc: 'Find all 4 hidden coins' },
];

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem('mario_progress')) || null;
  } catch { return null; }
}

function saveProgress(progress) {
  try { localStorage.setItem('mario_progress', JSON.stringify(progress)); } catch {}
}

function getSelectedCharacter() {
  try { return localStorage.getItem('mario_selected') || 'red'; } catch { return 'red'; }
}

function setSelectedCharacter(id) {
  try { localStorage.setItem('mario_selected', id); } catch {}
}

function isUnlocked(char, progress) {
  switch (char.unlock) {
    case 'default': return true;
    case 'coins_10': return (progress?.coinsTotal ?? 0) >= 10;
    case 'coins_20': return (progress?.coinsTotal ?? 0) >= 20;
    case 'level1':   return progress?.level1Done ?? false;
    case 'level2':   return progress?.level2Done ?? false;
    case 'hidden':   return progress?.hiddenDone ?? false;
    default:         return false;
  }
}

function initProgress() {
  const p = getProgress() || { coinsTotal: 0, level1Done: false, level2Done: false, hiddenDone: false };
  saveProgress(p);
  return p;
}

function addCoins(amount) {
  const p = getProgress() || initProgress();
  p.coinsTotal = (p.coinsTotal || 0) + amount;
  saveProgress(p);
  return p;
}

function markLevelDone(level) {
  const p = getProgress() || initProgress();
  if (level === 1) p.level1Done = true;
  if (level === 2) p.level2Done = true;
  saveProgress(p);
  return p;
}

function markHiddenDone() {
  const p = getProgress() || initProgress();
  p.hiddenDone = true;
  saveProgress(p);
  return p;
}

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
      // Hidden coins
      { x: 640, y: 80, hidden: true },
      { x: 960, y: 128, hidden: true },
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
      // Hidden coins
      { x: 480, y: 80, hidden: true },
      { x: 880, y: 144, hidden: true },
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
// Helper: draw procedural player sprite (color overrides for variants)
// ----------------------------------------------------------------
function drawPlayerTexture(scene, key, bodyColor = 0x0d47a1, hatColor = 0xe52521) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  // Hat
  g.fillStyle(hatColor);
  g.fillRect(4, 0, 24, 6);
  // Face (skin)
  g.fillStyle(0xf5c685);
  g.fillRect(6, 6, 20, 12);
  // Eyes
  g.fillStyle(0x000000);
  g.fillRect(8, 8, 4, 4);
  g.fillRect(18, 8, 4, 4);
  // Body (overalls — configurable)
  g.fillStyle(bodyColor);
  g.fillRect(4, 18, 24, 14);
  // Overall straps (slightly lighter/darker than body)
  const strapColor = bodyColor === 0x6a1b9a ? 0x7b1fa2 : bodyColor === 0xf9a825 ? 0xfbc02d : bodyColor - 0x111111;
  g.fillStyle(strapColor);
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

function drawMushroomTexture(scene, key) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  // Stem (cream)
  g.fillStyle(0xf5f5dc);
  g.fillRect(8, 14, 8, 10);
  // Cap (red)
  g.fillStyle(0xe52521);
  g.fillEllipse(12, 10, 24, 16);
  // Cap highlight
  g.fillStyle(0xff6659);
  g.fillEllipse(10, 7, 8, 6);
  // White spots
  g.fillStyle(0xffffff);
  g.fillCircle(7, 8, 2.5);
  g.fillCircle(14, 6, 2.5);
  g.fillCircle(19, 9, 2.5);
  // Stem outline
  g.lineStyle(1, 0xd4c85c, 0.6);
  g.strokeRect(8, 14, 8, 10);
  g.generateTexture(key, 24, 24);
  g.destroy();
}

// ----------------------------------------------------------------
// Boot Scene — generate textures
// ----------------------------------------------------------------
class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  create() {
    audioManager.init();
    // Draw all 6 character variants
    CHARACTERS.forEach(char => {
      const key = `player_${char.id}`;
      if (char.color !== null) {
        drawPlayerTexture(this, key, char.color, char.hat);
      } else {
        // Rainbow — draw with default colors (shimmer applied in-game)
        drawPlayerTexture(this, key, 0x0d47a1, 0xe52521);
      }
    });
    drawEnemyTexture(this, 'enemy');
    drawCoinTexture(this, 'coin');
    drawCloudTexture(this, 'cloud');
    drawHillTexture(this, 'hill');
    drawFlagTexture(this, 'flag');
    drawParticleTexture(this, 'sparkle');
    drawDustTexture(this, 'dust');
    drawMushroomTexture(this, 'mushroom');
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
    initProgress();
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
    const title = this.add.text(width / 2, 70, 'MARIO\nPLATFORMER', {
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

    // Current selected character preview
    const selected = getSelectedCharacter();
    this.playerPreview = this.add.image(width / 2, 200, `player_${selected}`).setScale(2).setDepth(10);

    // Character name label
    const charName = CHARACTERS.find(c => c.id === selected)?.name || 'Mario';
    this.charLabel = this.add.text(width / 2, 235, charName, {
      fontSize: '14px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // Choose Character button
    const btnY = 265;
    const btn = this.add.graphics().setDepth(10);
    const btnW = 180, btnH = 32;
    const drawBtn = (alpha) => {
      btn.clear();
      btn.fillStyle(0x1b5e20, alpha);
      btn.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
      btn.lineStyle(2, 0x4caf50, alpha);
      btn.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
    };
    drawBtn(0.8);
    this.add.text(width / 2, btnY, '★ CHOOSE CHARACTER', {
      fontSize: '13px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11);
    const btnHit = this.add.rectangle(width / 2, btnY, btnW, btnH, 0x000000, 0).setDepth(12).setInteractive();
    btnHit.on('pointerdown', () => this._openCharacterPicker());
    btnHit.on('pointerover', () => drawBtn(1));
    btnHit.on('pointerout', () => drawBtn(0.8));

    // Tap to start
    const tap = this.add.text(width / 2, 300, 'TAP TO START', {
      fontFamily: 'monospace', fontSize: '16px', color: '#fff',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({
      targets: tap, alpha: 0.3,
      duration: 600, yoyo: true, repeat: -1,
    });

    // Hidden coin progress display
    let hTotal = 0;
    try {
      const saved = localStorage.getItem('mario_hc');
      if (saved) {
        const parsed = JSON.parse(saved);
        hTotal = (parsed.level1 || 0) + (parsed.level2 || 0);
      }
    } catch {}
    if (hTotal > 0) {
      this.add.text(width / 2, 310, `★ ${hTotal}/4 hidden coins`, {
        fontSize: '11px', color: '#ff69b4', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(10);
    }

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

  _openCharacterPicker() {
    const { width, height } = this.cameras.main;
    const progress = getProgress();
    const selected = getSelectedCharacter();

    // Dark overlay
    const overlay = this.add.graphics().setDepth(50).setScrollFactor(0);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    this.add.text(width / 2, 30, 'CHOOSE CHARACTER', {
      fontSize: '18px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51).setScrollFactor(0);

    // Character row
    const startX = 40;
    const spacing = 72;
    CHARACTERS.forEach((char, i) => {
      const x = startX + i * spacing;
      const y = 120;
      const unlocked = isUnlocked(char, progress);

      // Box background
      const box = this.add.graphics().setDepth(51).setScrollFactor(0);
      if (unlocked) {
        box.fillStyle(char.id === selected ? 0xffd700 : 0x2e7d32, 0.7);
        box.lineStyle(2, char.id === selected ? 0xffffff : 0x4caf50, char.id === selected ? 1 : 0.7);
      } else {
        box.fillStyle(0x424242, 0.6);
        box.lineStyle(1, 0x757575, 0.5);
      }
      box.fillRoundedRect(x - 30, y - 40, 60, 80, 6);
      box.strokeRoundedRect(x - 30, y - 40, 60, 80, 6);

      if (unlocked) {
        const sprite = this.add.image(x, y, `player_${char.id}`).setDepth(52).setScrollFactor(0);
        if (char.id === selected) {
          // Gold glow ring
          const glow = this.add.graphics().setDepth(51).setScrollFactor(0);
          glow.lineStyle(3, 0xffd700, 0.9);
          glow.strokeRoundedRect(x - 33, y - 43, 66, 86, 8);
        }
        // Tap to select
        const hit = this.add.rectangle(x, y, 60, 80, 0x000000, 0).setDepth(53).setScrollFactor(0).setInteractive();
        hit.on('pointerdown', () => {
          setSelectedCharacter(char.id);
          this.playerPreview.setTexture(`player_${char.id}`);
          this.charLabel.setText(char.name);
          this._closeCharacterPicker();
          this._openCharacterPicker(); // Re-open with new selection highlighted
        });
      } else {
        // Locked — greyed sprite + lock icon
        const lockedSprite = this.add.image(x, y, `player_${char.id}`).setDepth(52).setScrollFactor(0);
        lockedSprite.setAlpha(0.3);
        lockedSprite.setTint(0x888888);
        this.add.text(x, y - 10, '🔒', { fontSize: '16px' }).setOrigin(0.5).setDepth(53).setScrollFactor(0);
      }

      // Name label
      this.add.text(x, y + 45, char.name, {
        fontSize: '9px', color: unlocked ? '#fff' : '#888',
        fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(53).setScrollFactor(0);

      // Unlock hint (if locked)
      if (!unlocked) {
        this.add.text(x, y + 58, char.unlockDesc, {
          fontSize: '7px', color: '#aaa', fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(53).setScrollFactor(0);
      }
    });

    // Back button
    const backY = 220;
    const backBtn = this.add.graphics().setDepth(51).setScrollFactor(0);
    backBtn.fillStyle(0x1b5e20, 0.8);
    backBtn.fillRoundedRect(width / 2 - 60, backY - 16, 120, 32, 8);
    backBtn.lineStyle(2, 0x4caf50, 0.8);
    backBtn.strokeRoundedRect(width / 2 - 60, backY - 16, 120, 32, 8);
    this.add.text(width / 2, backY, '← BACK', {
      fontSize: '14px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(52).setScrollFactor(0);
    const backHit = this.add.rectangle(width / 2, backY, 120, 32, 0x000000, 0).setDepth(53).setScrollFactor(0).setInteractive();
    backHit.on('pointerdown', () => this._closeCharacterPicker());
  }

  _closeCharacterPicker() {
    // Remove all picker elements by restarting clean — the overlay is cleared on scene events
    this.scene.restart();
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
    this.selectedChar = getSelectedCharacter();
    this.isRespawning = false;
    this.isDying = false;
    this.levelComplete = false;
    this.jumpHeld = false;
    this.dpadUp = false;
    this.dpadLeft = false;
    this.dpadDown = false;
    this.dpadRight = false;
    this.isBig = false;
    this.isInvincible = false;
    // Hidden coins from localStorage
    try {
      const saved = localStorage.getItem('mario_hc');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.hiddenCoinsFound = { level1: parsed.level1 || 0, level2: parsed.level2 || 0 };
      } else {
        this.hiddenCoinsFound = { level1: 0, level2: 0 };
      }
    } catch {
      this.hiddenCoinsFound = { level1: 0, level2: 0 };
    }
    this.totalHiddenFound = this.hiddenCoinsFound[`level${this.levelIndex + 1}`] || 0;
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
    this.hiddenCoinGroup = this.physics.add.group();
    levelData.coins.forEach(c => {
      if (c.hidden) {
        // Hidden coin: separate group, with sparkle hint emitter
        const coin = this.hiddenCoinGroup.create(c.x, c.y, 'coin').setCircle(7, 1, 1);
        coin.body.setAllowGravity(false);
        coin.hiddenFound = false;
        // Float animation
        this.tweens.add({
          targets: coin, y: coin.y - 4,
          duration: 500 + Math.random() * 300, yoyo: true, repeat: -1,
          ease: 'Sine.easeInOut',
        });
        // Faint sparkle hint emitter (always on)
        this.add.particles(c.x, c.y, 'sparkle', {
          speed: 10, angle: { min: 0, max: 360 },
          scale: { start: 0.4, end: 0 },
          alpha: { start: 0.6, end: 0 },
          lifespan: 800,
          frequency: 400, quantity: 1,
        });
      } else {
        // Regular coin
        const coin = this.coinGroup.create(c.x, c.y, 'coin').setCircle(7, 1, 1);
        coin.body.setAllowGravity(false);
        this.tweens.add({
          targets: coin, y: coin.y - 4,
          duration: 500 + Math.random() * 300, yoyo: true, repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
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

    // Super Mushroom — one per level
    const mushData = [
      { x: 352, y: 144 },  // Level 1: on floating platform
      { x: 500, y: 128 },   // Level 2: early mid-height platform
    ];
    const mushPos = mushData[this.levelIndex] || mushData[0];
    this.mushroom = this.physics.add.sprite(mushPos.x, mushPos.y, 'mushroom');
    this.mushroom.body.setAllowGravity(false);
    this.mushroom.body.setSize(20, 20);
    // Pop-up animation
    this.mushroom.setScale(0);
    this.tweens.add({
      targets: this.mushroom, scaleX: 1, scaleY: 1,
      duration: 300, ease: 'Back.easeOut',
    });
    // Gentle bob animation
    this.tweens.add({
      targets: this.mushroom, y: this.mushroom.y - 5,
      duration: 700 + Math.random() * 300, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Player
    this.player = this.physics.add.sprite(
      levelData.playerStart.x, levelData.playerStart.y, `player_${this.selectedChar}`
    );
    this.player.setCollideWorldBounds(false);
    this.player.body.setSize(24, 36);
    this.player.body.setOffset(4, 2);
    this.player.body.setGravityY(600);

    // Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.player, this.coinGroup, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.hiddenCoinGroup, this.collectHiddenCoin, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.mushroom, this.collectMushroom, null, this);

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

    // Starburst particle emitter for power-up collection
    this.starburstEmitter = this.add.particles(0, 0, 'sparkle', {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      lifespan: 500,
      gravityY: 80,
      quantity: 12,
      emitting: false,
    });
    this.starburstEmitter.setDepth(150);

    // Store previous Y for landing detection
    this._prevPlayerY = this.player.y;

    // If Rainbow Mario already unlocked, start shimmer immediately
    try {
      if (localStorage.getItem('mario_hc_unlocked') === 'true') {
        this._startRainbowShimmer();
      }
    } catch {}

    // Clean up rainbow shimmer on scene shutdown
    this.events.on('shutdown', () => this._stopRainbowShimmer());

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
    hud.add(this.add.image(12, 14, `player_${this.selectedChar}`).setScale(0.7));
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

    // Hidden coin counter "★ X/4" — top right
    const totalHidden = (this.hiddenCoinsFound?.level1 || 0) + (this.hiddenCoinsFound?.level2 || 0);
    hud.add(this.add.text(GAME_WIDTH - 8, 36, `★ ${totalHidden}/4`, {
      fontSize: '12px', color: '#ff69b4', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2,
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
    // Track total session coins + persist progress
    const progress = addCoins(1);
    this._checkCoinUnlocks(progress);
    this._updateHUD();
  }

  collectHiddenCoin(player, coin) {
    if (coin.hiddenFound) return;
    coin.hiddenFound = true;
    audioManager.coin();
    this.coinParticles.emitParticleAt(coin.x, coin.y, 12);
    this._showScorePopup(coin.x, coin.y, '+★', '#ff69b4');
    coin.destroy();
    this.score += 200;

    // Track per-level hidden coin count
    const key = `level${this.levelIndex + 1}`;
    this.hiddenCoinsFound[key] = (this.hiddenCoinsFound[key] || 0) + 1;

    // Save to localStorage
    try {
      localStorage.setItem('mario_hc', JSON.stringify(this.hiddenCoinsFound));
    } catch {}

    // Check unlock condition
    const total = this.hiddenCoinsFound.level1 + this.hiddenCoinsFound.level2;
    if (this.hiddenCoinsFound.level1 === 2 && this.hiddenCoinsFound.level2 === 2) {
      this._triggerRainbowMarioUnlock();
    } else if (total > 0) {
      // Brief celebration for finding a hidden coin
      this._showScorePopup(player.x, player.y - 30, '★ Found!', '#ff69b4');
    }
    this._updateHUD();
  }

  _triggerRainbowMarioUnlock() {
    markHiddenDone();
    try { localStorage.setItem('mario_hc_unlocked', 'true'); } catch {}
    audioManager.powerUp();
    // Big starburst
    if (this.starburstEmitter) {
      this.starburstEmitter.emitParticleAt(this.player.x, this.player.y, 24);
    }
    // Massive confetti burst
    const burstKeys = ['confetti_gold','confetti_red','confetti_green','confetti_blue'];
    burstKeys.forEach(key => {
      const em = this.add.particles(this.player.x, this.player.y, key, {
        speed: { min: 80, max: 250 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.5, end: 0 },
        lifespan: 2000,
        gravityY: 100,
        quantity: 20,
        emitting: true,
      });
      em.setDepth(200);
      this.time.delayedCall(2100, () => em.destroy());
    });
    // "UNLOCKED!" popup
    const { width, height } = this.cameras.main;
    const pop = this.add.text(width / 2, height / 2 - 40, 'UNLOCKED!', {
      fontSize: '36px', color: '#ff69b4', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(400).setScrollFactor(0);
    this.add.text(width / 2, height / 2 + 10, 'Rainbow Mario!', {
      fontSize: '20px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(400).setScrollFactor(0);
    this.tweens.add({ targets: pop, scale: 1.3, alpha: 0, delay: 1800, duration: 500, ease: 'Power2',
      onComplete: () => pop.destroy() });
    // Rainbow shimmer tween on player
    this._startRainbowShimmer();
  }

  _startRainbowShimmer() {
    const hues = [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x8b00ff];
    let idx = 0;
    this._rainbowTimer = this.time.addEvent({
      delay: 200, callback: () => {
        if (this.player && this.player.active) {
          this.player.setTint(hues[idx % hues.length]);
        }
        idx++;
      }, loop: true,
    });
  }

  _stopRainbowShimmer() {
    if (this._rainbowTimer) { this._rainbowTimer.remove(); this._rainbowTimer = null; }
    if (this.player) this.player.clearTint();
  }

  collectMushroom(player, mushroom) {
    if (!mushroom || !mushroom.active) return;
    audioManager.powerUp();
    // Starburst particle burst
    this.starburstEmitter.emitParticleAt(mushroom.x, mushroom.y, 16);
    // Screen flash white 80ms
    this.cameras.main.flash(80, 255, 255, 255);
    // Score popup
    this._showScorePopup(mushroom.x, mushroom.y - 10, '+UP!', '#ff6b6b');
    // Destroy mushroom
    mushroom.destroy();
    this.mushroom = null;
    // Grow player to big
    this._growPlayer();
  }

  _growPlayer() {
    this.isBig = true;
    // Scale tween from 1x to 1.5x
    this.tweens.add({
      targets: this.player,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      ease: 'Power2.easeOut',
    });
    // Adjust hitbox for big state — taller and slightly wider
    this.player.body.setSize(28, 54);
    this.player.body.setOffset(2, -16);
  }

  _shrinkPlayer() {
    this.isBig = false;
    this.isInvincible = true;
    // Scale tween from 1.5x to 1x
    this.tweens.add({
      targets: this.player,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Power2.easeOut',
    });
    // Reset hitbox to small
    this.player.body.setSize(24, 36);
    this.player.body.setOffset(4, 2);
    // Small shrink puff particles
    this.dustEmitter.emitParticleAt(this.player.x, this.player.y + 16, 6);
    // Brief invincibility with flash
    this.player.setAlpha(1);
    let flashCount = 0;
    const flashTimer = this.time.addEvent({
      delay: 60,
      callback: () => {
        this.player.setAlpha(this.player.alpha === 1 ? 0.4 : 1);
        flashCount++;
        if (flashCount >= 6) {
          flashTimer.remove();
          this.player.setAlpha(1);
          this.isInvincible = false;
        }
      },
      loop: true,
    });
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
    if (this.isInvincible) return;

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
    } else if (this.isBig) {
      // Big state: shrink instead of death
      this._shrinkPlayer();
    } else {
      // Small state: original death behavior
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

  _checkCoinUnlocks(progress) {
    const blueUnlocked = isUnlocked(CHARACTERS[1], progress);
    const yellowUnlocked = isUnlocked(CHARACTERS[3], progress);
    const prevBlue = isUnlocked(CHARACTERS[1], { ...progress, coinsTotal: progress.coinsTotal - 1 });
    const prevYellow = isUnlocked(CHARACTERS[3], { ...progress, coinsTotal: progress.coinsTotal - 1 });
    if (!prevBlue && blueUnlocked) {
      this._showUnlockPopup('Blue Mario');
    } else if (!prevYellow && yellowUnlocked) {
      this._showUnlockPopup('Yellow Mario');
    }
  }

  _showUnlockPopup(charName) {
    audioManager.powerUp();
    const { width, height } = this.cameras.main;
    const pop = this.add.text(width / 2, height / 2 - 20, 'NEW!', {
      fontSize: '28px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(400).setScrollFactor(0);
    this.add.text(width / 2, height / 2 + 15, charName, {
      fontSize: '18px', color: '#fff', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(400).setScrollFactor(0);
    this.tweens.add({
      targets: pop, scale: 1.2, alpha: 0, delay: 1500, duration: 400, ease: 'Power2',
      onComplete: () => pop.destroy(),
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

    // Check unlocks: level complete + hidden coins
    const progress = markLevelDone(this.nextLevel);
    const prev = { ...progress };
    if (this.nextLevel === 2) prev.level2Done = false;
    else prev.level1Done = false;
    const greenUnlock = !prev.level1Done && isUnlocked(CHARACTERS[2], progress);
    const purpleUnlock = !prev.level2Done && isUnlocked(CHARACTERS[4], progress);
    const hiddenUnlock = !isUnlocked(CHARACTERS[5], prev) && isUnlocked(CHARACTERS[5], markHiddenDone());
    if (greenUnlock) this._unlockedName = 'Green Mario';
    else if (purpleUnlock) this._unlockedName = 'Purple Mario';
    else if (hiddenUnlock) this._unlockedName = 'Rainbow';

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

    // Show unlock popup if a new character was unlocked
    if (this._unlockedName) {
      audioManager.powerUp();
      const pop = this.add.text(width / 2, 200, 'NEW CHARACTER!', {
        fontSize: '22px', color: '#ffd700', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(10);
      this.add.text(width / 2, 228, this._unlockedName, {
        fontSize: '16px', color: '#fff', fontFamily: 'monospace',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(10);
      this.tweens.add({ targets: pop, alpha: 0, delay: 2500, duration: 400, onComplete: () => pop.destroy() });
    }

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
