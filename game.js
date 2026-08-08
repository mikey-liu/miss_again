/**
 * 外星人跳跃 - 微信小游戏版
 * Alien Jump for WeChat Mini Game
 * v1.1.0 - Character-specific audio/bg/easter eggs, leaderboard, pause, menu
 */

// ─── Canvas Setup ────────────────────────────────────
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// Polyfill: use global requestAnimationFrame (vsync-synced) if available
if (typeof canvas.requestAnimationFrame !== 'function') {
  if (typeof requestAnimationFrame === 'function') {
    canvas.requestAnimationFrame = requestAnimationFrame;
  } else {
    canvas.requestAnimationFrame = function(cb) {
      return setTimeout(cb, 1000 / 60);
    };
  }
}

const systemInfo = wx.getSystemInfoSync();
const dpr = systemInfo.pixelRatio || 2;
const screenW = systemInfo.screenWidth;
const screenH = systemInfo.screenHeight;

// Internal game resolution (design resolution)
const W = 400;
const H = 700;

// Scale canvas to fill screen
canvas.width = W * dpr;
canvas.height = H * dpr;
ctx.scale(dpr, dpr);

// ─── roundRect Polyfill ──────────────────────────────
if (!ctx.roundRect) {
  ctx.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
  };
}

// ─── Sprite Loading ──────────────────────────────────
const SPRITE_NAMES = [
  'character_0', 'character_1', 'character_2', 'character_3',
  'platform_green', 'platform_brown',
  'platform_blue', 'spring', 'monster', 'jetpack'
];
const sprites = {};
let spritesLoaded = 0;

// ─── Character Data (with per-character audio/bg/easter egg) ───
const CHARACTERS = [
  {
    name: 'Zorg', color: '#4ade80', dark: '#16a34a',
    sfxWave: 'square',
    bounceFreq: [600, 900],
    springFreq: [400, 600, 800, 1200],
    dieFreq: [400, 300, 200, 100],
    monsterFreq: [300, 200],
    bgThemes: [
      { max: 1000, top: '#faf8f5', bottom: '#f0ead6' },
      { max: 3000, top: '#fce4b8', bottom: '#f5d5a0' },
      { max: 5000, top: '#c8d6e5', bottom: '#a0b4c8' },
      { max: 9000, top: '#2c3e50', bottom: '#1a1a2e' },
      { max: Infinity, top: '#0a0a1a', bottom: '#000010' },
    ],
    easterEgg: 'leaf',
    particleColor: '#4ade80',
  },
  {
    name: 'Bloop', color: '#60a5fa', dark: '#2563eb',
    sfxWave: 'sine',
    bounceFreq: [500, 750],
    springFreq: [350, 500, 700, 1050],
    dieFreq: [350, 250, 150, 80],
    monsterFreq: [250, 150],
    bgThemes: [
      { max: 1000, top: '#e8f0fe', bottom: '#c8d8f8' },
      { max: 3000, top: '#a8c8f0', bottom: '#88b0e0' },
      { max: 5000, top: '#5070a0', bottom: '#305080' },
      { max: 9000, top: '#1a2a4e', bottom: '#0a1a3e' },
      { max: Infinity, top: '#050a1a', bottom: '#000510' },
    ],
    easterEgg: 'bubble',
    particleColor: '#60a5fa',
  },
  {
    name: 'Zix', color: '#c084fc', dark: '#9333ea',
    sfxWave: 'triangle',
    bounceFreq: [700, 1000],
    springFreq: [450, 650, 850, 1300],
    dieFreq: [450, 350, 250, 120],
    monsterFreq: [350, 250],
    bgThemes: [
      { max: 1000, top: '#f5e8fe', bottom: '#e0c8f8' },
      { max: 3000, top: '#d0a8f0', bottom: '#b080e0' },
      { max: 5000, top: '#6040a0', bottom: '#402080' },
      { max: 9000, top: '#2a1a4e', bottom: '#1a0a3e' },
      { max: Infinity, top: '#0a051a', bottom: '#050010' },
    ],
    easterEgg: 'star',
    particleColor: '#c084fc',
  },
  {
    name: 'Blaze', color: '#fb923c', dark: '#ea580c',
    sfxWave: 'sawtooth',
    bounceFreq: [550, 800],
    springFreq: [380, 550, 750, 1150],
    dieFreq: [380, 280, 180, 90],
    monsterFreq: [280, 180],
    bgThemes: [
      { max: 1000, top: '#fff5e8', bottom: '#fae0c8' },
      { max: 3000, top: '#f0c888', bottom: '#e0a060' },
      { max: 5000, top: '#806040', bottom: '#503020' },
      { max: 9000, top: '#3a2010', bottom: '#2a1000' },
      { max: Infinity, top: '#1a0a00', bottom: '#100500' },
    ],
    easterEgg: 'fire',
    particleColor: '#fb923c',
  },
];

let selectedCharacter = 0;
try {
  const saved = wx.getStorageSync('alienJumpCharacter');
  if (saved !== '' && saved !== undefined && saved !== null) selectedCharacter = saved;
} catch (e) {}

function loadSprites() {
  SPRITE_NAMES.forEach(name => {
    const img = wx.createImage();
    img.onload = () => { spritesLoaded++; };
    img.onerror = () => { spritesLoaded++; };
    img.src = `sprites/${name}.png`;
    sprites[name] = img;
  });
}

// ─── Audio Engine ────────────────────────────────────
let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  try {
    if (typeof wx.createWebAudioContext === 'function') {
      audioCtx = wx.createWebAudioContext();
    }
  } catch (e) {}
}

function playBeep(freq, duration, type, vol) {
  if (!audioCtx) return;
  try {
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol || 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch (e) {}
}

function sfxBounce() {
  const c = CHARACTERS[selectedCharacter];
  playBeep(c.bounceFreq[0], 0.08, c.sfxWave, 0.07);
  setTimeout(() => playBeep(c.bounceFreq[1], 0.06, c.sfxWave, 0.05), 40);
}

function sfxSpring() {
  const c = CHARACTERS[selectedCharacter];
  for (let i = 0; i < c.springFreq.length; i++) {
    setTimeout(() => playBeep(c.springFreq[i], 0.05, 'triangle', 0.06), i * 30);
  }
}

function sfxBreak() {
  playBeep(150, 0.15, 'sawtooth', 0.06);
  setTimeout(() => playBeep(100, 0.1, 'sawtooth', 0.04), 50);
}

function sfxJetpack() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => playBeep(200 + Math.random() * 100, 0.08, 'sawtooth', 0.04), i * 40);
  }
}

function sfxMonster() {
  const c = CHARACTERS[selectedCharacter];
  playBeep(c.monsterFreq[0], 0.2, 'sawtooth', 0.06);
  setTimeout(() => playBeep(c.monsterFreq[1], 0.2, 'sawtooth', 0.05), 80);
}

function sfxDie() {
  const c = CHARACTERS[selectedCharacter];
  for (let i = 0; i < c.dieFreq.length; i++) {
    setTimeout(() => playBeep(c.dieFreq[i], 0.15 + i * 0.05, 'sawtooth', 0.08 - i * 0.01), i * 100);
  }
}

function sfxScore() {
  playBeep(800, 0.05, 'square', 0.04);
  setTimeout(() => playBeep(1000, 0.05, 'square', 0.04), 30);
}

function sfxShoot() {
  playBeep(200, 0.1, 'sawtooth', 0.04);
  setTimeout(() => playBeep(150, 0.1, 'sawtooth', 0.03), 40);
}

function sfxClick() {
  playBeep(800, 0.03, 'square', 0.04);
}

// ─── Character Switch Sound (with stop + per-character theme) ───
let charSwitchTimers = [];
let charSwitchGain = null;

function stopCharSwitchSound() {
  for (const t of charSwitchTimers) clearTimeout(t);
  charSwitchTimers = [];
  if (charSwitchGain) {
    try { charSwitchGain.disconnect(); } catch (e) {}
    charSwitchGain = null;
  }
}

function playSwitchBeep(freq, duration, type, vol) {
  if (!audioCtx || !charSwitchGain) return;
  try {
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol || 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(charSwitchGain);
    osc.start(t);
    osc.stop(t + duration);
  } catch (e) {}
}

function sfxCharacterSwitch() {
  if (!audioCtx) return;
  stopCharSwitchSound();

  charSwitchGain = audioCtx.createGain();
  charSwitchGain.gain.value = 1.0;
  charSwitchGain.connect(audioCtx.destination);

  const c = CHARACTERS[selectedCharacter];
  const sched = (fn, delay) => { charSwitchTimers.push(setTimeout(fn, delay)); };

  if (c.name === 'Zorg') {
    // === 可爱卖萌：咯咯笑 + 弹跳旋律 ===
    const notes = [880, 988, 880, 1047, 988, 1175, 1047, 1320, 1175, 1320];
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      sched(() => {
        playSwitchBeep(n, 0.14, 'sine', 0.08);
        playSwitchBeep(n * 1.5, 0.04, 'sine', 0.03);
      }, i * 150);
    }
    // 开心颤音
    sched(() => {
      for (let i = 0; i < 8; i++) {
        charSwitchTimers.push(setTimeout(() => playSwitchBeep(1320 + i * 80, 0.06, 'sine', 0.05), i * 50));
      }
    }, notes.length * 150);
    // "Whee!" 收尾
    sched(() => playSwitchBeep(1568, 0.15, 'sine', 0.07), 1900);
    sched(() => playSwitchBeep(1760, 0.15, 'sine', 0.06), 2050);
    sched(() => playSwitchBeep(1568, 0.3, 'sine', 0.05), 2200);
    sched(() => playSwitchBeep(2093, 0.25, 'sine', 0.04), 2500);

  } else if (c.name === 'Bloop') {
    // === 水下泡泡：流水 + 气泡冒泡 ===
    const flow = [196, 247, 294, 349, 392, 440, 494];
    for (let i = 0; i < flow.length; i++) {
      sched(() => playSwitchBeep(flow[i], 0.35, 'sine', 0.05), i * 200);
    }
    // 随机气泡 pops
    for (let i = 0; i < 15; i++) {
      sched(() => playSwitchBeep(1200 + Math.random() * 1800, 0.04, 'sine', 0.04), Math.random() * 2400);
    }
    // 上冒气泡流
    sched(() => {
      for (let i = 0; i < 10; i++) {
        charSwitchTimers.push(setTimeout(() => playSwitchBeep(600 + i * 120, 0.06, 'sine', 0.04), i * 60));
      }
    }, 1500);
    // 水波下降收尾
    sched(() => playSwitchBeep(880, 0.15, 'sine', 0.05), 2200);
    sched(() => playSwitchBeep(659, 0.15, 'sine', 0.04), 2350);
    sched(() => playSwitchBeep(440, 0.35, 'sine', 0.04), 2500);

  } else if (c.name === 'Zix') {
    // === 神秘宇宙：低频 drone + 星光闪烁 ===
    sched(() => playSwitchBeep(110, 3.0, 'triangle', 0.04), 0);
    sched(() => playSwitchBeep(165, 3.0, 'triangle', 0.025), 0);
    // 神秘小调旋律
    const melody = [220, 262, 294, 330, 294, 262, 220, 196];
    for (let i = 0; i < melody.length; i++) {
      sched(() => playSwitchBeep(melody[i], 0.22, 'triangle', 0.05), 200 + i * 180);
    }
    // 星光闪烁
    for (let i = 0; i < 12; i++) {
      sched(() => playSwitchBeep(2000 + Math.random() * 2000, 0.05, 'sine', 0.03), Math.random() * 2800);
    }
    // 宇宙微光收尾
    sched(() => {
      for (let i = 0; i < 6; i++) {
        charSwitchTimers.push(setTimeout(() => playSwitchBeep(1600 + i * 150, 0.12, 'sine', 0.04), i * 60));
      }
    }, 1800);
    // 深沉收束
    sched(() => playSwitchBeep(110, 0.5, 'triangle', 0.05), 2500);

  } else if (c.name === 'Blaze') {
    // === 火焰愤怒：低吼蓄力 → 爆发 ===
    sched(() => playSwitchBeep(55, 1.5, 'sawtooth', 0.06), 0);
    sched(() => playSwitchBeep(73, 1.5, 'sawtooth', 0.04), 0);
    // 火焰噼啪
    for (let i = 0; i < 12; i++) {
      sched(() => playSwitchBeep(400 + Math.random() * 800, 0.04, 'sawtooth', 0.04), i * 100);
    }
    // 愤怒递增低吼
    const growls = [80, 100, 130, 160, 200, 250, 320, 400, 480, 560];
    for (let i = 0; i < growls.length; i++) {
      const g = growls[i];
      sched(() => {
        playSwitchBeep(g, 0.12, 'sawtooth', 0.05);
        playSwitchBeep(g * 1.5, 0.08, 'square', 0.03);
      }, 200 + i * 120);
    }
    // 爆发！
    const expTime = 200 + growls.length * 120;
    sched(() => {
      playSwitchBeep(50, 0.8, 'sawtooth', 0.09);
      playSwitchBeep(75, 0.6, 'square', 0.05);
    }, expTime);
    // 余烬噼啪
    sched(() => {
      for (let i = 0; i < 8; i++) {
        charSwitchTimers.push(setTimeout(() => playSwitchBeep(500 + Math.random() * 1000, 0.05, 'sawtooth', 0.04), i * 70));
      }
    }, expTime);
    // 怒吼渐弱收尾
    sched(() => playSwitchBeep(80, 0.3, 'sawtooth', 0.05), expTime + 600);
    sched(() => playSwitchBeep(60, 0.4, 'sawtooth', 0.04), expTime + 800);
    sched(() => playSwitchBeep(45, 0.5, 'sawtooth', 0.03), expTime + 1100);
  }
}

// ─── Game Constants ──────────────────────────────────
const GRAVITY = 0.42;
const BOUNCE_VELOCITY = -12.5;
const PLAYER_BASE_SPEED = 7.0;
const PLATFORM_WIDTH = 72;
const PLATFORM_HEIGHT = 16;
const PLAYER_W = 44;
const PLAYER_H = 50;
const MONSTER_W = 40;
const MONSTER_H = 36;
const SPRING_W = 18;
const SPRING_H = 20;
const JETPACK_W = 24;
const JETPACK_H = 22;

// ─── Game State ──────────────────────────────────────
let gameState = 'menu';
// menu | playing | paused | gameover | leaderboard | credits | share | confirmHome
let returnFromSubScreen = 'menu'; // where to return from leaderboard/credits/share
let score = 0;
let highScore = 0;

// Load high score from storage (migrate from old key if needed)
try {
  highScore = wx.getStorageSync('alienJumpHighScore') || 0;
  if (!highScore) {
    highScore = wx.getStorageSync('doodleJumpHighScore') || 0;
    if (highScore) wx.setStorageSync('alienJumpHighScore', highScore);
  }
} catch (e) {
  highScore = 0;
}

// ─── Leaderboard ─────────────────────────────────────
let leaderboard = [];
try {
  leaderboard = wx.getStorageSync('alienJumpScores') || [];
} catch (e) { leaderboard = []; }

function addToLeaderboard(scoreVal, charIdx) {
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  leaderboard.unshift({ score: scoreVal, char: charIdx, date: dateStr });
  if (leaderboard.length > 10) leaderboard = leaderboard.slice(0, 10);
  try { wx.setStorageSync('alienJumpScores', leaderboard); } catch (e) {}
}

// ─── Player ──────────────────────────────────────────
let player = {
  x: W / 2 - PLAYER_W / 2,
  y: H / 2,
  vx: 0,
  vy: 0,
  w: PLAYER_W,
  h: PLAYER_H,
  dir: 1,
  onPlatform: false,
  jetpackActive: false,
  jetpackTimer: 0,
  jetpackFuel: 0,
  invincible: false,
  invincibleTimer: 0,
};

// Camera
let cameraY = 0;
let targetCameraY = 0;

// World objects
let platforms = [];
let highestPlatformY = H - 80;
let monsters = [];
let bullets = [];
let particles = [];

// Screen shake
let shakeAmount = 0;
const shakeDecay = 0.85;

// Input state
let inputLeft = false;
let inputRight = false;
let inputShoot = false;
let rawTilt = 0;
let hasTilt = false;

// Frame timing
let lastTime = 0;
let frameCount = 0;
let gameStarted = false;

// ─── Easter Egg Particles ────────────────────────────
let easterEggParticles = [];
let easterEggTimer = 0;

function spawnEasterEgg() {
  const c = CHARACTERS[selectedCharacter];
  const type = c.easterEgg;

  if (type === 'leaf') {
    easterEggParticles.push({
      x: Math.random() * W,
      y: cameraY - 10,
      vx: (Math.random() - 0.5) * 1,
      vy: 0.5 + Math.random() * 1,
      life: 1, decay: 0.005,
      size: 4 + Math.random() * 3,
      color: c.particleColor,
      type: 'leaf',
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.1,
    });
  } else if (type === 'bubble') {
    easterEggParticles.push({
      x: Math.random() * W,
      y: cameraY + H + 10,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.5 - Math.random() * 1,
      life: 1, decay: 0.004,
      size: 3 + Math.random() * 5,
      color: c.particleColor,
      type: 'bubble',
    });
  } else if (type === 'star') {
    easterEggParticles.push({
      x: player.x + player.w / 2 + (Math.random() - 0.5) * 60,
      y: player.y + player.h / 2 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: 1, decay: 0.02,
      size: 2 + Math.random() * 2,
      color: c.particleColor,
      type: 'star',
    });
  } else if (type === 'fire') {
    easterEggParticles.push({
      x: player.x + player.w / 2 + (Math.random() - 0.5) * 20,
      y: player.y + player.h - 5,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 0.5 + Math.random() * 1.5,
      life: 1, decay: 0.03,
      size: 3 + Math.random() * 3,
      color: Math.random() > 0.5 ? '#fb923c' : '#facc15',
      type: 'fire',
    });
  }
}

function updateEasterEggs(dt) {
  easterEggTimer += dt;
  if (easterEggTimer > 0.1) {
    easterEggTimer = 0;
    spawnEasterEgg();
  }
  for (const p of easterEggParticles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.rot !== undefined) p.rot += p.rotSpeed;
  }
  easterEggParticles = easterEggParticles.filter(p => p.life > 0);
}

function drawEasterEggParticles() {
  for (const p of easterEggParticles) {
    const sy = p.y - cameraY;
    if (sy < -20 || sy > H + 20) continue;
    ctx.globalAlpha = p.life;
    if (p.type === 'leaf') {
      ctx.save();
      ctx.translate(p.x, sy);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.type === 'bubble') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, sy, p.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(p.x - p.size * 0.3, sy - p.size * 0.3, p.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'star') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2 / 5) - Math.PI / 2;
        const x = p.x + Math.cos(angle) * p.size;
        const y = sy + Math.sin(angle) * p.size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        const angle2 = angle + Math.PI / 5;
        ctx.lineTo(p.x + Math.cos(angle2) * p.size * 0.4, sy + Math.sin(angle2) * p.size * 0.4);
      }
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'fire') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, sy, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ─── Platform Generation ─────────────────────────────
const PLATFORM_TYPES = {
  NORMAL: 'normal',
  BREAKABLE: 'breakable',
  MOVING: 'moving',
  SPRING: 'spring',
};

function createPlatform(y, type) {
  const margin = 30;
  const x = margin + Math.random() * (W - PLATFORM_WIDTH - margin * 2);

  if (!type) {
    const r = Math.random();
    if (r < 0.55) type = PLATFORM_TYPES.NORMAL;
    else if (r < 0.75) type = PLATFORM_TYPES.BREAKABLE;
    else if (r < 0.90) type = PLATFORM_TYPES.MOVING;
    else type = PLATFORM_TYPES.SPRING;
  }

  return {
    x, y,
    w: PLATFORM_WIDTH,
    h: PLATFORM_HEIGHT,
    type,
    broken: false,
    moveDir: Math.random() > 0.5 ? 1 : -1,
    moveSpeed: 0.8 + Math.random() * 1.5,
    moveRange: 40 + Math.random() * 40,
    originX: x,
    hasMonster: false,
    hasPowerUp: false,
    springBounced: false,
  };
}

function addMonsterToPlatform(plat) {
  if (plat.type === PLATFORM_TYPES.NORMAL && score > 500 && Math.random() < 0.04) {
    plat.hasMonster = true;
    monsters.push({
      x: plat.x + plat.w / 2 - MONSTER_W / 2,
      y: plat.y - MONSTER_H,
      w: MONSTER_W,
      h: MONSTER_H,
      platform: plat,
    });
  }
}

function addPowerUpToPlatform(plat) {
  if (plat.type === PLATFORM_TYPES.NORMAL && Math.random() < 0.05 && score > 100) {
    plat.hasPowerUp = true;
  }
}

function generateInitialPlatforms() {
  platforms = [];
  monsters = [];
  bullets = [];
  particles = [];
  easterEggParticles = [];

  const basePlatform = {
    x: W / 2 - PLATFORM_WIDTH / 2,
    y: H - 80,
    w: PLATFORM_WIDTH,
    h: PLATFORM_HEIGHT,
    type: PLATFORM_TYPES.NORMAL,
    broken: false,
    moveDir: 0,
    moveSpeed: 0,
    originX: W / 2 - PLATFORM_WIDTH / 2,
    hasMonster: false,
    hasPowerUp: false,
    springBounced: false,
  };
  platforms.push(basePlatform);

  player.x = basePlatform.x + basePlatform.w / 2 - player.w / 2;
  player.y = basePlatform.y - player.h;

  highestPlatformY = basePlatform.y;
  let currentY = basePlatform.y;
  for (let i = 0; i < 8; i++) {
    currentY -= 60 + Math.random() * 30;
    const plat = createPlatform(currentY, i > 3 ? undefined : PLATFORM_TYPES.NORMAL);
    platforms.push(plat);
    if (plat.y < highestPlatformY) highestPlatformY = plat.y;
    addMonsterToPlatform(plat);
    addPowerUpToPlatform(plat);
  }

  cameraY = 0;
  targetCameraY = 0;
  score = 0;
  player.jetpackActive = false;
  player.jetpackTimer = 0;
  player.jetpackFuel = 0;
  player.invincible = false;
  player.invincibleTimer = 0;
  player.vx = 0;
  player.vy = 0;
  player.dir = 1;
  shakeAmount = 0;
}

function ensurePlatformsAbove() {
  while (highestPlatformY > cameraY - 100) {
    const gap = 55 + Math.random() * 35;
    const newY = highestPlatformY - gap;
    const lastPlat = platforms[platforms.length - 1];
    let type;
    if (lastPlat && lastPlat.type === PLATFORM_TYPES.BREAKABLE) {
      const r = Math.random();
      if (r < 0.65) type = PLATFORM_TYPES.NORMAL;
      else if (r < 0.85) type = PLATFORM_TYPES.MOVING;
      else type = PLATFORM_TYPES.SPRING;
    }
    const plat = createPlatform(newY, type);
    platforms.push(plat);
    highestPlatformY = newY;
    addMonsterToPlatform(plat);
    addPowerUpToPlatform(plat);
  }
  platforms = platforms.filter(p => p.y < cameraY + H + 100);
  monsters = monsters.filter(m => m.platform.y < cameraY + H + 100);
}

// ─── Effects ─────────────────────────────────────────
function spawnParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 2,
      life: 1,
      decay: 0.02 + Math.random() * 0.04,
      size: 2 + Math.random() * 4,
      color,
    });
  }
}

function shootBullet() {
  if (!player.jetpackActive || player.jetpackFuel <= 0) return;
  bullets.push({
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
    vx: player.dir * 8,
    vy: -2,
    life: 1,
    decay: 0.02,
  });
  sfxShoot();
  player.jetpackFuel = Math.max(0, player.jetpackFuel - 5);
}

// ─── UI Helpers ──────────────────────────────────────
function hitButton(tx, ty, rect) {
  return tx >= rect.x && tx <= rect.x + rect.w && ty >= rect.y && ty <= rect.y + rect.h;
}

function drawButton(x, y, w, h, label, bgColor, textColor) {
  ctx.fillStyle = bgColor || '#4ade80';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 25);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = textColor || '#1a1a1a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 7);
}

function getMenuButtonRects() {
  const btnW = 200;
  const btnX = W / 2 - btnW / 2;
  return {
    start: { x: btnX, y: H * 0.40, w: btnW, h: 48 },
    leaderboard: { x: btnX, y: H * 0.50, w: btnW, h: 44 },
    credits: { x: btnX, y: H * 0.58, w: btnW, h: 44 },
    share: { x: btnX, y: H * 0.66, w: btnW, h: 44 },
  };
}

function getPauseButtonRects() {
  const btnW = 200;
  const btnX = W / 2 - btnW / 2;
  return {
    resume: { x: btnX, y: H * 0.33, w: btnW, h: 48 },
    leaderboard: { x: btnX, y: H * 0.44, w: btnW, h: 44 },
    home: { x: btnX, y: H * 0.55, w: btnW, h: 44 },
  };
}

function getGameOverButtonRects() {
  const btnW = 200;
  const btnX = W / 2 - btnW / 2;
  return {
    retry: { x: btnX, y: H * 0.52, w: btnW, h: 48 },
    leaderboard: { x: btnX, y: H * 0.63, w: btnW, h: 44 },
    home: { x: btnX, y: H * 0.74, w: btnW, h: 44 },
  };
}

function getSubScreenBackRect() {
  return { x: W / 2 - 80, y: H - 80, w: 160, h: 44 };
}

// Pause button position (in-game)
const PAUSE_BTN_X = W - 32;
const PAUSE_BTN_Y = 60;
const PAUSE_BTN_R = 18;

// ─── Input Handling ──────────────────────────────────

function handleMenuTouch(tx, ty) {
  // Character arrows
  const previewY = H * 0.20;
  const arrowCY = previewY + PLAYER_H / 2;
  const leftAX = W / 2 - 75;
  const rightAX = W / 2 + 75;
  const arrowR = 22;
  if (Math.hypot(tx - leftAX, ty - arrowCY) < arrowR + 8) {
    selectedCharacter = (selectedCharacter - 1 + CHARACTERS.length) % CHARACTERS.length;
    try { wx.setStorageSync('alienJumpCharacter', selectedCharacter); } catch (e2) {}
    sfxCharacterSwitch();
    return;
  }
  if (Math.hypot(tx - rightAX, ty - arrowCY) < arrowR + 8) {
    selectedCharacter = (selectedCharacter + 1) % CHARACTERS.length;
    try { wx.setStorageSync('alienJumpCharacter', selectedCharacter); } catch (e2) {}
    sfxCharacterSwitch();
    return;
  }

  // Buttons
  const btns = getMenuButtonRects();
  if (hitButton(tx, ty, btns.start)) { sfxClick(); startGame(); return; }
  if (hitButton(tx, ty, btns.leaderboard)) { sfxClick(); returnFromSubScreen = 'menu'; gameState = 'leaderboard'; return; }
  if (hitButton(tx, ty, btns.credits)) { sfxClick(); returnFromSubScreen = 'menu'; gameState = 'credits'; return; }
  if (hitButton(tx, ty, btns.share)) { sfxClick(); returnFromSubScreen = 'menu'; gameState = 'share'; return; }
}

function handleSubScreenTouch(tx, ty) {
  // Back button
  const back = getSubScreenBackRect();
  if (hitButton(tx, ty, back)) {
    sfxClick();
    gameState = returnFromSubScreen;
    return;
  }

  // Share-specific buttons
  if (gameState === 'share') {
    const shareBtn = { x: W / 2 - 100, y: H * 0.38, w: 200, h: 48 };
    const screenshotBtn = { x: W / 2 - 100, y: H * 0.50, w: 200, h: 48 };
    if (hitButton(tx, ty, shareBtn)) {
      sfxClick();
      try {
        wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
        wx.showToast({ title: '请点击右上角 ··· 分享', icon: 'none', duration: 2500 });
      } catch (e) {
        wx.showToast({ title: '请点击右上角分享', icon: 'none' });
      }
      return;
    }
    if (hitButton(tx, ty, screenshotBtn)) {
      sfxClick();
      saveScreenshot();
      return;
    }
  }
}

function saveScreenshot() {
  try {
    wx.canvasToTempFilePath({
      canvas: canvas,
      success(res) {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success() { wx.showToast({ title: '保存成功', icon: 'success' }); },
          fail(err) {
            if (err.errMsg && err.errMsg.indexOf('auth deny') >= 0) {
              wx.showToast({ title: '请授权保存图片', icon: 'none', duration: 2000 });
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          }
        });
      },
      fail() { wx.showToast({ title: '截图失败', icon: 'none' }); }
    });
  } catch (e) {
    wx.showToast({ title: '不支持此功能', icon: 'none' });
  }
}

wx.onTouchStart((e) => {
  initAudio();

  for (const touch of e.touches) {
    const rawX = touch.clientX !== undefined ? touch.clientX : touch.x;
    const rawY = touch.clientY !== undefined ? touch.clientY : touch.y;
    const tx = rawX * (W / screenW);
    const ty = rawY * (H / screenH);

    if (gameState === 'menu') {
      handleMenuTouch(tx, ty);
      return;
    }

    if (gameState === 'leaderboard' || gameState === 'credits' || gameState === 'share') {
      handleSubScreenTouch(tx, ty);
      return;
    }

    if (gameState === 'paused') {
      const btns = getPauseButtonRects();
      if (hitButton(tx, ty, btns.resume)) { sfxClick(); gameState = 'playing'; lastTime = Date.now(); return; }
      if (hitButton(tx, ty, btns.leaderboard)) { sfxClick(); returnFromSubScreen = 'paused'; gameState = 'leaderboard'; return; }
      if (hitButton(tx, ty, btns.home)) { sfxClick(); gameState = 'confirmHome'; return; }
      return;
    }

    if (gameState === 'gameover') {
      const btns = getGameOverButtonRects();
      if (hitButton(tx, ty, btns.retry)) { sfxClick(); startGame(); return; }
      if (hitButton(tx, ty, btns.leaderboard)) { sfxClick(); returnFromSubScreen = 'gameover'; gameState = 'leaderboard'; return; }
      if (hitButton(tx, ty, btns.home)) { sfxClick(); goToMenu(); return; }
      return;
    }

    if (gameState === 'confirmHome') {
      const confirmBtn = { x: W / 2 - 110, y: H * 0.52, w: 100, h: 44 };
      const cancelBtn = { x: W / 2 + 10, y: H * 0.52, w: 100, h: 44 };
      if (hitButton(tx, ty, confirmBtn)) { sfxClick(); goToMenu(); return; }
      if (hitButton(tx, ty, cancelBtn)) { sfxClick(); gameState = 'paused'; return; }
      return;
    }

    if (gameState === 'playing') {
      // Pause button check
      if (Math.hypot(tx - PAUSE_BTN_X, ty - PAUSE_BTN_Y) < PAUSE_BTN_R + 5) {
        sfxClick();
        gameState = 'paused';
        return;
      }

      // Movement
      const third = W / 3;
      if (tx < third) inputLeft = true;
      else if (tx > third * 2) inputRight = true;
      else inputShoot = true;
    }
  }
});

wx.onTouchMove((e) => {
  if (gameState !== 'playing') return;
  const third = W / 3;
  let left = false, right = false;
  for (const touch of e.touches) {
    const rawX = touch.clientX !== undefined ? touch.clientX : touch.x;
    const tx = rawX * (W / screenW);
    if (tx < third) left = true;
    else if (tx > third * 2) right = true;
  }
  inputLeft = left;
  inputRight = right;
});

wx.onTouchEnd((e) => {
  if (gameState !== 'playing') return;
  inputLeft = false;
  inputRight = false;
  inputShoot = false;
  const third = W / 3;
  for (const touch of e.touches) {
    const rawX = touch.clientX !== undefined ? touch.clientX : touch.x;
    const tx = rawX * (W / screenW);
    if (tx < third) inputLeft = true;
    if (tx > third * 2) inputRight = true;
  }
});

// Accelerometer
let accelerometerStarted = false;
function startAccelerometer() {
  if (accelerometerStarted) return;
  accelerometerStarted = true;
  try { wx.startAccelerometer({ interval: 'game' }); } catch (e) {}
}

wx.onAccelerometerChange((res) => {
  const val = res.x || 0;
  rawTilt = Math.max(-1, Math.min(1, val * 3.0));
  if (Math.abs(rawTilt) > 0.03) hasTilt = true;
});

// ─── Game Functions ──────────────────────────────────
function startGame() {
  if (!gameStarted) gameStarted = true;
  initAudio();
  startAccelerometer();
  generateInitialPlatforms();
  gameState = 'playing';
  lastTime = Date.now();
}

function goToMenu() {
  gameState = 'menu';
  score = 0;
  cameraY = 0;
  targetCameraY = 0;
  shakeAmount = 0;
  particles = [];
  easterEggParticles = [];
}

function gameOver() {
  gameState = 'gameover';
  sfxDie();
  shakeAmount = 15;
  if (score > highScore) {
    highScore = score;
    try { wx.setStorageSync('alienJumpHighScore', highScore); } catch (e) {}
  }
  addToLeaderboard(score, selectedCharacter);
}

// ─── Update ──────────────────────────────────────────
function update(dt) {
  if (gameState !== 'playing') return;
  dt = Math.min(dt, 0.05);

  // Player movement
  let moveInput = 0;
  if (inputLeft) moveInput = -1;
  if (inputRight) moveInput = 1;
  if (hasTilt && Math.abs(rawTilt) > 0.02) {
    const sign = rawTilt > 0 ? 1 : -1;
    moveInput = sign * Math.sqrt(Math.abs(rawTilt));
  }

  // Jetpack boost
  let jetpackBoost = 0;
  if (player.jetpackActive && player.jetpackFuel > 0) {
    jetpackBoost = -0.8;
    player.jetpackFuel -= 0.5;
    player.jetpackTimer -= dt;
    if (player.jetpackFuel <= 0 || player.jetpackTimer <= 0) {
      player.jetpackActive = false;
      player.jetpackFuel = 0;
      player.jetpackTimer = 0;
    }
  }

  player.vx = moveInput * PLAYER_BASE_SPEED;
  player.vy += GRAVITY + jetpackBoost;
  player.x += player.vx;
  player.y += player.vy;

  if (moveInput > 0.1) player.dir = 1;
  if (moveInput < -0.1) player.dir = -1;

  // Wrap horizontally
  if (player.x + player.w < -10) player.x = W + 10;
  if (player.x > W + 10) player.x = -player.w - 10;

  // Shooting
  if (inputShoot) { shootBullet(); inputShoot = false; }

  // Camera
  const targetY = player.y - H * 0.45;
  if (targetY < targetCameraY) targetCameraY = targetY;
  cameraY += (targetCameraY - cameraY) * 0.12;

  // Score
  const currentScore = Math.floor(Math.max(0, (H - 80) - player.y));
  if (currentScore > score) {
    score = currentScore;
    if (score > highScore) {
      highScore = score;
      try { wx.setStorageSync('alienJumpHighScore', highScore); } catch (e) {}
    }
    if (score > 0 && score % 500 < 10 && frameCount % 10 === 0) sfxScore();
  }

  // Update platforms
  for (const plat of platforms) {
    if (plat.type === PLATFORM_TYPES.MOVING && !plat.broken) {
      plat.x += plat.moveDir * plat.moveSpeed;
      if (plat.x > plat.originX + plat.moveRange || plat.x < plat.originX - plat.moveRange) {
        plat.moveDir *= -1;
      }
    }
  }

  // Update monsters
  for (const mon of monsters) {
    mon.x = mon.platform.x + mon.platform.w / 2 - mon.w / 2;
    mon.y = mon.platform.y - mon.h;
  }

  // Update bullets
  for (const b of bullets) { b.x += b.vx; b.y += b.vy; b.life -= b.decay; }
  bullets = bullets.filter(b => b.life > 0);

  // Bullet-Monster collision
  for (let i = monsters.length - 1; i >= 0; i--) {
    const mon = monsters[i];
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (b.x > mon.x && b.x < mon.x + mon.w && b.y > mon.y && b.y < mon.y + mon.h && b.life > 0) {
        spawnParticles(mon.x + mon.w / 2, mon.y + mon.h / 2, 12, '#a855f7');
        sfxMonster();
        mon.platform.hasMonster = false;
        monsters.splice(i, 1);
        bullets.splice(j, 1);
        break;
      }
    }
  }

  // Platform collision
  player.onPlatform = false;
  if (player.vy > 0 || player.jetpackActive) {
    for (const plat of platforms) {
      if (plat.broken) continue;

      // Spring collision
      if (plat.type === PLATFORM_TYPES.SPRING && !plat.springBounced) {
        const playerBottom = player.y + player.h;
        const playerCenterX = player.x + player.w / 2;
        if (playerBottom >= plat.y - 10 && playerBottom <= plat.y + 15 &&
            playerCenterX > plat.x - 10 && playerCenterX < plat.x + plat.w + 10 && player.vy >= 0) {
          player.vy = BOUNCE_VELOCITY * 1.6;
          player.y = plat.y - player.h;
          plat.springBounced = true;
          player.onPlatform = true;
          sfxSpring();
          shakeAmount = 8;
          spawnParticles(plat.x + plat.w / 2, plat.y, 15, '#facc15');
          break;
        }
      }

      // Regular platform collision
      const playerPrevBottom = player.y + player.h - player.vy;
      const playerBottom = player.y + player.h;
      const playerLeft = player.x + 8;
      const playerRight = player.x + player.w - 8;

      if (playerBottom >= plat.y && playerPrevBottom <= plat.y + 6 &&
          playerRight > plat.x && playerLeft < plat.x + plat.w && player.vy >= 0) {
        if (plat.type === PLATFORM_TYPES.BREAKABLE) {
          plat.broken = true;
          sfxBreak();
          shakeAmount = 6;
          spawnParticles(plat.x + plat.w / 2, plat.y, 10, '#8B4513');
          player.vy = BOUNCE_VELOCITY * 0.85;
        } else {
          player.vy = BOUNCE_VELOCITY;
          if (plat.type !== PLATFORM_TYPES.SPRING) {
            sfxBounce();
            shakeAmount = 2;
            spawnParticles(plat.x + plat.w / 2, plat.y, 5, CHARACTERS[selectedCharacter].particleColor);
          }
        }
        player.y = plat.y - player.h;
        player.onPlatform = true;

        if (plat.hasPowerUp) {
          plat.hasPowerUp = false;
          player.jetpackActive = true;
          player.jetpackTimer = 5;
          player.jetpackFuel = 100;
          sfxJetpack();
          spawnParticles(plat.x + plat.w / 2, plat.y, 20, '#3b82f6');
        }
        break;
      }
    }
  }

  // Monster collision
  for (let i = monsters.length - 1; i >= 0; i--) {
    const mon = monsters[i];
    const playerPrevBottom = player.y + player.h - player.vy;
    const playerBottom = player.y + player.h;
    const playerLeft = player.x + 8;
    const playerRight = player.x + player.w - 8;

    if (playerBottom >= mon.y && playerPrevBottom <= mon.y + 8 &&
        playerRight > mon.x && playerLeft < mon.x + mon.w && player.vy >= 0) {
      player.vy = BOUNCE_VELOCITY * 1.2;
      player.y = mon.y - player.h;
      spawnParticles(mon.x + mon.w / 2, mon.y + mon.h / 2, 12, '#a855f7');
      sfxMonster();
      shakeAmount = 5;
      mon.platform.hasMonster = false;
      monsters.splice(i, 1);
      score += 50;
      break;
    }

    if (!player.invincible &&
        player.x + player.w > mon.x + 5 && player.x < mon.x + mon.w - 5 &&
        player.y + player.h > mon.y + 5 && player.y < mon.y + mon.h - 5) {
      gameOver();
      return;
    }
  }

  // Update particles
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= p.decay; }
  particles = particles.filter(p => p.life > 0);

  // Easter eggs
  updateEasterEggs(dt);

  // Jetpack timer
  if (player.jetpackActive) {
    player.jetpackTimer -= dt;
    if (player.jetpackTimer <= 0) { player.jetpackActive = false; player.jetpackFuel = 0; }
  }

  // Invincibility timer
  if (player.invincible) {
    player.invincibleTimer -= dt;
    if (player.invincibleTimer <= 0) player.invincible = false;
  }

  // Screen shake decay
  if (shakeAmount > 0.1) shakeAmount *= shakeDecay;
  else shakeAmount = 0;

  // Generate new platforms
  ensurePlatformsAbove();

  // Game over check
  if (player.y > cameraY + H + 100) gameOver();
}

// ─── Drawing ─────────────────────────────────────────
function drawBackground() {
  const c = CHARACTERS[selectedCharacter];
  const themes = c.bgThemes;
  let bgTop = themes[0].top, bgBottom = themes[0].bottom;
  for (const band of themes) {
    if (score < band.max) { bgTop = band.top; bgBottom = band.bottom; break; }
  }

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, bgTop);
  grad.addColorStop(1, bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Grid
  const gridSize = 32;
  const offsetY = -(cameraY % gridSize);
  ctx.strokeStyle = 'rgba(200,210,220,0.2)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = offsetY; y <= H; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Clouds
  const parallaxOff = -cameraY * 0.3;
  if (score < 5000) {
    const cloudPos = [[60,120],[280,350],[150,600],[320,80],[40,480],[250,750]];
    for (const [cx, cy] of cloudPos) {
      const screenY = (cy + parallaxOff) % (H + 200) - 100;
      if (screenY < -100 || screenY > H + 100) continue;
      drawCloud(cx, screenY, score > 1000);
    }
  }

  // Stars
  if (score >= 3000) {
    const starParallax = -cameraY * 0.15;
    ctx.fillStyle = '#fff';
    const starCount = score >= 5000 ? 40 : 20;
    for (let i = 0; i < starCount; i++) {
      const sx = (i * 137 + 50) % W;
      const sy = ((i * 97 + 30 + starParallax) % (H + 400)) - 200;
      if (sy < -50 || sy > H + 50) continue;
      ctx.globalAlpha = 0.3 + (Math.sin(frameCount * 0.02 + i) + 1) * 0.35;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.5 + (i % 3) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawCloud(x, y, warm) {
  ctx.fillStyle = warm ? 'rgba(240,200,160,0.4)' : 'rgba(220,225,235,0.5)';
  ctx.strokeStyle = warm ? 'rgba(200,160,120,0.35)' : 'rgba(180,185,195,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.arc(x + 20, y - 8, 18, 0, Math.PI * 2);
  ctx.arc(x + 38, y, 20, 0, Math.PI * 2);
  ctx.arc(x + 16, y + 6, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawPlayer() {
  const sx = player.x;
  const sy = player.y - cameraY;
  if (player.invincible && Math.floor(frameCount / 5) % 2 === 0) return;

  ctx.save();
  ctx.translate(sx + player.w / 2, sy + player.h / 2);
  ctx.scale(player.dir, 1);
  ctx.translate(-player.w / 2, -player.h / 2);

  if (player.jetpackActive && player.jetpackFuel > 0) {
    const jpImg = sprites['jetpack'];
    if (jpImg && jpImg.width > 0) {
      ctx.drawImage(jpImg, -4, player.h / 2 - JETPACK_H / 2 + 2, JETPACK_W, JETPACK_H);
    }
  }

  const img = sprites['character_' + selectedCharacter];
  if (img && img.width > 0) {
    ctx.drawImage(img, 0, 0, player.w, player.h);
  } else {
    drawFallbackCharacter();
  }
  ctx.restore();

  // Jetpack flames
  if (player.jetpackActive && player.jetpackFuel > 0) {
    const fx = sx + player.w / 2;
    const fy = sy + player.h + 2;
    for (let i = 0; i < 3; i++) {
      const flameX = fx - 6 + i * 6 + (Math.random() - 0.5) * 4;
      const flameY = fy + Math.random() * 10;
      const fs = 3 + Math.random() * 5;
      ctx.fillStyle = i === 1 ? '#ffcc00' : '#ff6600';
      ctx.beginPath();
      ctx.arc(flameX, flameY, fs, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawFallbackCharacter() {
  const charData = CHARACTERS[selectedCharacter] || CHARACTERS[0];
  ctx.fillStyle = charData.color;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const bx = 6, by = 10, bw = PLAYER_W - 12, bh = PLAYER_H - 14, r = 8;
  ctx.moveTo(bx + r, by);
  ctx.lineTo(bx + bw - r, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
  ctx.lineTo(bx + bw, by + bh - r);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
  ctx.lineTo(bx + r, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
  ctx.lineTo(bx, by + r);
  ctx.quadraticCurveTo(bx, by, bx + r, by);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  const eyeY = by + 10;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bx + bw * 0.3, eyeY, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(bx + bw * 0.7, eyeY, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(bx + bw * 0.3 + 2, eyeY, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx + bw * 0.7 + 2, eyeY, 3.5, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bx + bw / 2, eyeY + 8, 5, 0.1, Math.PI - 0.1); ctx.stroke();

  ctx.fillStyle = charData.color; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(bx + 8, by + bh + 2, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(bx + bw - 8, by + bh + 2, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function drawPlatform(plat) {
  if (plat.broken) return;
  const sx = plat.x;
  const sy = plat.y - cameraY;
  if (sy < -50 || sy > H + 50) return;

  let spriteKey = 'platform_green';
  if (plat.type === PLATFORM_TYPES.BREAKABLE) spriteKey = 'platform_brown';
  else if (plat.type === PLATFORM_TYPES.MOVING) spriteKey = 'platform_blue';
  else if (plat.type === PLATFORM_TYPES.SPRING) spriteKey = 'platform_green';

  const img = sprites[spriteKey];
  if (img && img.width > 0) {
    ctx.drawImage(img, sx, sy, plat.w, plat.h);
  } else {
    ctx.fillStyle = plat.type === PLATFORM_TYPES.BREAKABLE ? '#a0522d' :
                    plat.type === PLATFORM_TYPES.MOVING ? '#60a5fa' : '#4ade80';
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(sx, sy, plat.w, plat.h, 4); ctx.fill(); ctx.stroke();
  }

  if (plat.type === PLATFORM_TYPES.SPRING && !plat.springBounced) {
    const springImg = sprites['spring'];
    const sxSp = plat.x + plat.w / 2 - SPRING_W / 2;
    const sySp = plat.y - SPRING_H + 4;
    if (springImg && springImg.width > 0) {
      ctx.drawImage(springImg, sxSp, sySp, SPRING_W, SPRING_H);
    } else {
      ctx.strokeStyle = '#eab308'; ctx.lineWidth = 2.5;
      const segH = SPRING_H / 4;
      const scx = plat.x + plat.w / 2;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const segY = sySp + i * segH;
        ctx.moveTo(scx - 6, segY); ctx.lineTo(scx + 6, segY + segH / 2);
        if (i < 3) { ctx.moveTo(scx + 6, segY + segH / 2); ctx.lineTo(scx - 6, segY + segH); }
      }
      ctx.stroke();
    }
  }

  if (plat.hasPowerUp) {
    const puX = plat.x + plat.w / 2 - JETPACK_W / 2;
    const puY = plat.y - JETPACK_H - 2;
    const jpImg = sprites['jetpack'];
    if (jpImg && jpImg.width > 0) {
      ctx.drawImage(jpImg, puX, puY, JETPACK_W, JETPACK_H);
    } else {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath(); ctx.arc(plat.x + plat.w / 2, plat.y - 14, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('J', plat.x + plat.w / 2, plat.y - 10);
    }
  }
}

function drawMonsters() {
  for (const mon of monsters) {
    const sx = mon.x, sy = mon.y - cameraY;
    if (sy < -50 || sy > H + 50) continue;
    const img = sprites['monster'];
    if (img && img.width > 0) {
      ctx.drawImage(img, sx, sy, mon.w, mon.h);
    } else {
      ctx.fillStyle = '#c084fc'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(sx, sy, mon.w, mon.h, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx + mon.w * 0.35, sy + mon.h * 0.4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + mon.w * 0.65, sy + mon.h * 0.4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.arc(sx + mon.w * 0.35, sy + mon.h * 0.4, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + mon.w * 0.65, sy + mon.h * 0.4, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawBullets() {
  for (const b of bullets) {
    const sy = b.y - cameraY;
    if (sy < -20 || sy > H + 20) continue;
    ctx.fillStyle = `rgba(255,200,50,${b.life})`;
    ctx.beginPath(); ctx.arc(b.x, sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,255,200,${b.life * 0.8})`;
    ctx.beginPath(); ctx.arc(b.x, sy, 2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawParticles() {
  for (const p of particles) {
    const sy = p.y - cameraY;
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, sy, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPauseButtonIcon() {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(PAUSE_BTN_X, PAUSE_BTN_Y, PAUSE_BTN_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(PAUSE_BTN_X - 5, PAUSE_BTN_Y - 6, 3, 12);
  ctx.fillRect(PAUSE_BTN_X + 2, PAUSE_BTN_Y - 6, 3, 12);
}

function drawUI() {
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${score}`, W / 2, 50);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText(`最高: ${highScore}`, W / 2, 72);

  // Jetpack bar
  if (player.jetpackActive) {
    const fuelPct = player.jetpackFuel / 100;
    const barW = 80, barH = 8, barX = W / 2 - barW / 2, barY = 85;
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = fuelPct > 0.3 ? '#3b82f6' : '#ef4444';
    ctx.fillRect(barX, barY, barW * fuelPct, barH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('JET', W / 2, barY + 8);
  }

  // Pause button
  drawPauseButtonIcon();

  if (score < 100 && !hasTilt) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('左右倾斜手机或触控移动', W / 2, H - 30);
  }
}

// ─── Menu Screen ─────────────────────────────────────
function drawMenu() {
  drawBackground();

  // Title
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('外星人跳跃', W / 2, H * 0.10);
  ctx.font = '16px sans-serif'; ctx.fillStyle = '#666';
  ctx.fillText('Alien Jump', W / 2, H * 0.14);

  drawCloud(W / 2 - 60, H * 0.12);
  drawCloud(W / 2 + 80, H * 0.10);

  // Character selection
  const previewY = H * 0.20;
  const charImg = sprites['character_' + selectedCharacter];
  if (charImg && charImg.width > 0) {
    ctx.drawImage(charImg, W / 2 - PLAYER_W / 2, previewY, PLAYER_W, PLAYER_H);
  } else {
    ctx.save();
    ctx.translate(W / 2 - PLAYER_W / 2, previewY);
    drawFallbackCharacter();
    ctx.restore();
  }

  // Arrows
  const arrowCY = previewY + PLAYER_H / 2;
  const leftAX = W / 2 - 75;
  const rightAX = W / 2 + 75;
  const charData = CHARACTERS[selectedCharacter];

  ctx.fillStyle = charData.color; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(leftAX, arrowCY, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.moveTo(leftAX - 2, arrowCY); ctx.lineTo(leftAX + 6, arrowCY - 8); ctx.lineTo(leftAX + 6, arrowCY + 8); ctx.closePath(); ctx.fill();

  ctx.fillStyle = charData.color; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(rightAX, arrowCY, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.moveTo(rightAX + 2, arrowCY); ctx.lineTo(rightAX - 6, arrowCY - 8); ctx.lineTo(rightAX - 6, arrowCY + 8); ctx.closePath(); ctx.fill();

  // Character name
  ctx.fillStyle = charData.dark;
  ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(charData.name, W / 2, previewY + PLAYER_H + 28);

  // High score
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`最高分: ${highScore}`, W / 2, H * 0.35);

  // Buttons
  const btns = getMenuButtonRects();
  drawButton(btns.start.x, btns.start.y, btns.start.w, btns.start.h, '开始游戏', charData.color);
  drawButton(btns.leaderboard.x, btns.leaderboard.y, btns.leaderboard.w, btns.leaderboard.h, '排行榜', '#facc15');
  drawButton(btns.credits.x, btns.credits.y, btns.credits.w, btns.credits.h, '制作人员', '#c084fc');
  drawButton(btns.share.x, btns.share.y, btns.share.w, btns.share.h, '分享游戏', '#60a5fa');

  // Tip
  ctx.fillStyle = '#999'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('左右倾斜手机或触控移动', W / 2, H * 0.95);
}

// ─── Pause Screen ────────────────────────────────────
function drawPauseScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('已暂停', W / 2, H * 0.22);

  ctx.font = '16px sans-serif'; ctx.fillStyle = '#ccc';
  ctx.fillText(`得分: ${score}`, W / 2, H * 0.27);

  const btns = getPauseButtonRects();
  const c = CHARACTERS[selectedCharacter];
  drawButton(btns.resume.x, btns.resume.y, btns.resume.w, btns.resume.h, '继续游戏', c.color);
  drawButton(btns.leaderboard.x, btns.leaderboard.y, btns.leaderboard.w, btns.leaderboard.h, '排行榜', '#facc15');
  drawButton(btns.home.x, btns.home.y, btns.home.w, btns.home.h, '回到首页', '#f87171');
}

// ─── Game Over Screen ────────────────────────────────
function drawGameOverScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('游戏结束', W / 2, H * 0.18);

  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`得分: ${score}`, W / 2, H * 0.25);

  if (score >= highScore && score > 0) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('新纪录!', W / 2, H * 0.30);
  }

  ctx.fillStyle = '#ccc'; ctx.font = '14px sans-serif';
  ctx.fillText(`历史最高: ${highScore}`, W / 2, H * 0.35);

  ctx.fillStyle = '#999'; ctx.font = '12px sans-serif';
  const c = CHARACTERS[selectedCharacter];
  ctx.fillText(`角色: ${c.name}`, W / 2, H * 0.40);

  const btns = getGameOverButtonRects();
  drawButton(btns.retry.x, btns.retry.y, btns.retry.w, btns.retry.h, '再来一次', c.color);
  drawButton(btns.leaderboard.x, btns.leaderboard.y, btns.leaderboard.w, btns.leaderboard.h, '排行榜', '#facc15');
  drawButton(btns.home.x, btns.home.y, btns.home.w, btns.home.h, '回到首页', '#f87171');
}

// ─── Leaderboard Screen ──────────────────────────────
function drawLeaderboardScreen() {
  drawBackground();

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);

  // Card
  const cardW = 340, cardH = 520, cardX = W / 2 - cardW / 2, cardY = 60;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 16); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('排行榜', W / 2, cardY + 45);
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#999';
  ctx.fillText('最近 10 条记录', W / 2, cardY + 68);

  if (leaderboard.length === 0) {
    ctx.fillStyle = '#999'; ctx.font = '16px sans-serif';
    ctx.fillText('暂无记录', W / 2, cardY + 200);
    ctx.fillText('快来挑战吧！', W / 2, cardY + 230);
  } else {
    const startY = cardY + 95;
    const rowH = 36;
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const ry = startY + i * rowH;
      const c = CHARACTERS[entry.char] || CHARACTERS[0];

      // Rank
      ctx.fillStyle = i === 0 ? '#f59e0b' : i === 1 ? '#999' : i === 2 ? '#cd7f32' : '#666';
      ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}.`, cardX + 20, ry);

      // Score
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`${entry.score}`, cardX + 50, ry);

      // Character dot + name
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.arc(cardX + 150, ry - 5, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#666'; ctx.font = '12px sans-serif';
      ctx.fillText(c.name, cardX + 162, ry);

      // Date
      ctx.fillStyle = '#999'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(entry.date, cardX + cardW - 20, ry);
    }
  }

  // Back button
  const back = getSubScreenBackRect();
  drawButton(back.x, back.y, back.w, back.h, '返回', '#f87171');
}

// ─── Credits Screen ──────────────────────────────────
function drawCreditsScreen() {
  drawBackground();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);

  const cardW = 320, cardH = 440, cardX = W / 2 - cardW / 2, cardY = 80;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 16); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('制作人员', W / 2, cardY + 50);

  const lines = [
    { label: '游戏开发', value: 'WorkBuddy AI' },
    { label: '美术设计', value: 'AI Generated' },
    { label: '音效合成', value: 'Web Audio API' },
    { label: '灵感来源', value: 'Doodle Jump' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const ly = cardY + 110 + i * 50;
    ctx.fillStyle = '#999'; ctx.font = '13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(lines[i].label, cardX + 40, ly);
    ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(lines[i].value, cardX + cardW - 40, ly);
  }

  ctx.fillStyle = '#999'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('版本 1.1.0', W / 2, cardY + 340);
  ctx.fillStyle = '#c084fc'; ctx.font = 'bold 15px sans-serif';
  ctx.fillText('感谢游玩！', W / 2, cardY + 380);

  const back = getSubScreenBackRect();
  drawButton(back.x, back.y, back.w, back.h, '返回', '#f87171');
}

// ─── Share Screen ────────────────────────────────────
function drawShareScreen() {
  drawBackground();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);

  const cardW = 320, cardH = 480, cardX = W / 2 - cardW / 2, cardY = 60;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 16); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('分享游戏', W / 2, cardY + 50);

  // Score display
  ctx.fillStyle = '#999'; ctx.font = '14px sans-serif';
  ctx.fillText('你的最高分', W / 2, cardY + 90);
  ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 40px sans-serif';
  ctx.fillText(`${highScore}`, W / 2, cardY + 135);

  const c = CHARACTERS[selectedCharacter];
  ctx.fillStyle = '#666'; ctx.font = '13px sans-serif';
  ctx.fillText(`当前角色: ${c.name}`, W / 2, cardY + 160);

  // Share button
  const shareBtn = { x: W / 2 - 100, y: H * 0.38, w: 200, h: 48 };
  drawButton(shareBtn.x, shareBtn.y, shareBtn.w, shareBtn.h, '分享给好友', '#4ade80');

  // Screenshot button
  const screenshotBtn = { x: W / 2 - 100, y: H * 0.50, w: 200, h: 48 };
  drawButton(screenshotBtn.x, screenshotBtn.y, screenshotBtn.w, screenshotBtn.h, '保存战绩截图', '#60a5fa');

  // Instructions
  ctx.fillStyle = '#999'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('点击右上角 ··· 也可分享', W / 2, cardY + 330);
  ctx.fillText('分享给微信好友或朋友圈', W / 2, cardY + 350);

  const back = getSubScreenBackRect();
  drawButton(back.x, back.y, back.w, back.h, '返回', '#f87171');
}

// ─── Confirm Home Dialog ─────────────────────────────
function drawConfirmHomeScreen() {
  // Draw paused state behind
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);

  const cardW = 280, cardH = 180, cardX = W / 2 - cardW / 2, cardY = H * 0.35;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 16); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('确认返回首页？', W / 2, cardY + 55);

  ctx.fillStyle = '#e74c3c'; ctx.font = '14px sans-serif';
  ctx.fillText('当前进度将丢失', W / 2, cardY + 82);

  const confirmBtn = { x: W / 2 - 110, y: H * 0.52, w: 100, h: 44 };
  const cancelBtn = { x: W / 2 + 10, y: H * 0.52, w: 100, h: 44 };
  drawButton(confirmBtn.x, confirmBtn.y, confirmBtn.w, confirmBtn.h, '确认', '#f87171');
  drawButton(cancelBtn.x, cancelBtn.y, cancelBtn.w, cancelBtn.h, '取消', '#ccc', '#1a1a1a');
}

// ─── Game Loop ───────────────────────────────────────
function gameLoop() {
  frameCount++;
  const now = Date.now();
  let dt = 0;
  if (lastTime > 0) dt = (now - lastTime) / 1000;
  lastTime = now;

  ctx.clearRect(0, 0, W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let shakeApplied = false;
  if (shakeAmount > 0.1 && (gameState === 'playing' || gameState === 'gameover')) {
    const shakeX = (Math.random() - 0.5) * shakeAmount * 2;
    const shakeY = (Math.random() - 0.5) * shakeAmount * 2;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    shakeApplied = true;
  }
  function restoreShake() { if (shakeApplied) { ctx.restore(); shakeApplied = false; } }

  if (gameState === 'menu') {
    drawMenu();
    restoreShake();
  } else if (gameState === 'playing') {
    update(dt);
    drawBackground();
    drawEasterEggParticles();
    drawBullets();
    for (const plat of platforms) drawPlatform(plat);
    drawMonsters();
    drawPlayer();
    drawParticles();
    restoreShake();
    drawUI();
  } else if (gameState === 'paused') {
    drawBackground();
    drawBullets();
    for (const plat of platforms) drawPlatform(plat);
    drawMonsters();
    drawPlayer();
    drawParticles();
    restoreShake();
    drawPauseScreen();
  } else if (gameState === 'gameover') {
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= p.decay; }
    particles = particles.filter(p => p.life > 0);
    if (shakeAmount > 0.1) shakeAmount *= shakeDecay; else shakeAmount = 0;

    drawBackground();
    for (const plat of platforms) drawPlatform(plat);
    drawMonsters();
    drawPlayer();
    drawParticles();
    restoreShake();
    drawGameOverScreen();
  } else if (gameState === 'leaderboard') {
    drawBackground();
    restoreShake();
    drawLeaderboardScreen();
  } else if (gameState === 'credits') {
    drawBackground();
    restoreShake();
    drawCreditsScreen();
  } else if (gameState === 'share') {
    drawBackground();
    restoreShake();
    drawShareScreen();
  } else if (gameState === 'confirmHome') {
    drawBackground();
    drawBullets();
    for (const plat of platforms) drawPlatform(plat);
    drawMonsters();
    drawPlayer();
    drawParticles();
    restoreShake();
    drawConfirmHomeScreen();
  }

  canvas.requestAnimationFrame(gameLoop);
}

// ─── Lifecycle ───────────────────────────────────────
wx.onShow(() => {
  startAccelerometer();
  if (gameState === 'playing') {
    gameState = 'paused'; // auto-pause on return
  }
  lastTime = Date.now();
});

wx.onHide(() => {
  if (gameState === 'playing') {
    gameState = 'paused';
  }
  try {
    if (score > highScore) {
      wx.setStorageSync('alienJumpHighScore', score);
    }
  } catch (e) {}
});

// Set up share
try {
  wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
  wx.onShareAppMessage(() => ({
    title: `我在外星人跳跃得了${highScore}分！来挑战吧！`,
  }));
} catch (e) {}

// ─── Bootstrap ───────────────────────────────────────
loadSprites();
generateInitialPlatforms();
startAccelerometer();

setTimeout(() => {
  canvas.requestAnimationFrame(gameLoop);
}, 200);
