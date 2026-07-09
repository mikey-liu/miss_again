const core = require('./src/gameCore');

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const COLORS = {
  ink: '#243142',
  soft: '#5c6672',
  panel: '#fff1bf',
  panel2: '#fff8dd',
  border: '#7a4c23',
  red: '#d94b4b',
  green: '#4f9f57',
  blue: '#347fb0',
  yellow: '#f5c84c',
  orange: '#e98b36',
  white: '#fffaf0',
  shadow: 'rgba(35, 30, 24, 0.22)'
};

const TEXT = {
  title: '铁锅套大鹅',
  subtitle: '锅到鹅到，今晚开灶',
  loading: '架锅生火中...',
  playMode: '开始套鹅',
  upgradeMode: '铁锅升级',
  restaurantMode: '大鹅馆',
  comingSoon: '开发中',
  locked: '先通前一关',
  back: '返回',
  restart: '重来',
  next: '下一关',
  coins: '金币',
  caught: '套鹅',
  score: '得分',
  pot: '铁锅',
  time: '时间',
  combo: '连击',
  energy: '锅气',
  swipeToThrow: '按住铁锅，上滑预判，松手扣鹅',
  releaseToThrow: '松手，锅要飞了',
  swipeMore: '力气太小，空气还没熟',
  flying: '铁锅飞行中...',
  hit: '套中了！点一下继续',
  comboHit: '一锅接一锅！点一下继续',
  gooseHurt: '这鹅有点扛揍，再来一下',
  bossHit: '老板鹅破防了！',
  miss: '没扣住？！点一下继续',
  missFar: '锅去隔壁村了！点一下继续',
  skillOn: '大锅盖天！捕获范围变大',
  comboKeep: '手感正热，继续扣鹅',
  levelWin: '开灶成功！',
  levelLose: '鹅跑光了...',
  notEnoughCoins: '金币不够',
  upgradeDone: '升级完成',
  incomeClaimed: '离线收益已领取',
  ratingLose: '空气：谢谢款待',
  rating1: '锅法入门',
  rating2: '套鹅高手',
  rating3: '一锅封神',
  level1Title: '第 1 关',
  level1Subtitle: '村口白鹅',
  level2Title: '第 2 关',
  level2Subtitle: '花鹅乱逛',
  level3Title: '第 3 关',
  level3Subtitle: '河边湿地',
  level4Title: '第 4 关',
  level4Subtitle: '金鹅快跑',
  level5Title: '第 5 关',
  level5Subtitle: '老板鹅登场',
  level6Title: '第 6 关',
  level6Subtitle: '雪地乱炖',
  gooseWhite: '白鹅',
  gooseFlower: '花鹅',
  gooseRunner: '奔跑鹅',
  gooseFat: '大胖鹅',
  gooseGold: '金鹅',
  gooseBoss: '老板鹅'
};

const IMAGE_FILES = {
  mapFarm: 'assets/iron_goose/maps/map_farm.png',
  mapWetland: 'assets/iron_goose/maps/map_wetland.png',
  mapSnow: 'assets/iron_goose/maps/map_snowfield.png',
  gooseWhite: 'assets/iron_goose/sprites/goose_white.png',
  gooseFlower: 'assets/iron_goose/sprites/goose_flower.png',
  gooseRunner: 'assets/iron_goose/sprites/goose_runner.png',
  gooseFat: 'assets/iron_goose/sprites/goose_fat.png',
  gooseGold: 'assets/iron_goose/sprites/goose_gold.png',
  gooseBoss: 'assets/iron_goose/sprites/goose_boss.png',
  potRest: 'assets/iron_goose/sprites/pot_rest.png',
  potFlying: 'assets/iron_goose/sprites/pot_flying.png',
  potHit: 'assets/iron_goose/sprites/pot_hit.png',
  iconCoin: 'assets/iron_goose/icons/icon_coin.png',
  iconDiamond: 'assets/iron_goose/icons/icon_diamond.png',
  iconPot: 'assets/iron_goose/icons/icon_pot.png',
  iconMagnet: 'assets/iron_goose/icons/icon_skill_magnet.png',
  iconFire: 'assets/iron_goose/icons/icon_skill_fire.png',
  iconLightning: 'assets/iron_goose/icons/icon_skill_lightning.png',
  iconTimer: 'assets/iron_goose/icons/icon_timer.png',
  iconCombo: 'assets/iron_goose/icons/icon_combo.png'
};

const AUDIO_FILES = {
  bgm: 'assets/iron_goose/audio/bgm_electro_loop.wav',
  goose: 'assets/iron_goose/audio/goose_honk.wav',
  panic: 'assets/iron_goose/audio/goose_panic.wav',
  boss: 'assets/iron_goose/audio/boss_honk.wav',
  throw: 'assets/iron_goose/audio/pot_throw.wav',
  hit: 'assets/iron_goose/audio/pot_hit.wav',
  miss: 'assets/iron_goose/audio/pot_miss.wav',
  coin: 'assets/iron_goose/audio/coin_burst.wav'
};

let dpr = 1;
let state = core.createInitialState(375, 667);
let lastTime = Date.now();
let buttons = [];
let toastUntil = 0;
let imagesStarted = false;
let imagesReady = false;
let audioReady = false;
let bgmStarted = false;
const images = {};
const audioPool = {};

function syncCanvasSize() {
  initImages();
  const info = wx.getSystemInfoSync();
  dpr = info.pixelRatio || 1;
  canvas.width = info.windowWidth * dpr;
  canvas.height = info.windowHeight * dpr;
  canvas.style = canvas.style || {};
  canvas.style.width = `${info.windowWidth}px`;
  canvas.style.height = `${info.windowHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  state = core.resizeState(state, info.windowWidth, info.windowHeight);
}

function initImages() {
  if (imagesStarted || !wx.createImage) return;
  imagesStarted = true;
  const keys = Object.keys(IMAGE_FILES);
  let loaded = 0;
  keys.forEach((key) => {
    const img = wx.createImage();
    img.onload = () => {
      loaded += 1;
      imagesReady = loaded >= keys.length;
    };
    img.onerror = () => {
      loaded += 1;
      imagesReady = loaded >= keys.length;
    };
    img.src = IMAGE_FILES[key];
    images[key] = img;
  });
}

function initAudio() {
  if (audioReady || !wx.createInnerAudioContext) return;
  Object.keys(AUDIO_FILES).forEach((key) => {
    const audio = wx.createInnerAudioContext();
    audio.src = AUDIO_FILES[key];
    audio.loop = key === 'bgm';
    audio.volume = key === 'bgm' ? 0.25 : 0.78;
    audioPool[key] = audio;
  });
  audioReady = true;
}

function playSfx(key) {
  initAudio();
  const audio = audioPool[key];
  if (!audio) return;
  try {
    audio.stop();
    audio.currentTime = 0;
    audio.play();
  } catch (err) {}
}

function startBgm() {
  initAudio();
  if (bgmStarted || !audioPool.bgm) return;
  try {
    audioPool.bgm.play();
    bgmStarted = true;
  } catch (err) {}
}

function text(key) {
  return TEXT[key] || key || '';
}

function image(key) {
  const img = images[key];
  return img && img.width > 0 ? img : null;
}

function drawCover(key) {
  const img = image(key);
  if (!img) return false;
  const scale = Math.max(state.width / img.width, state.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (state.width - w) / 2, (state.height - h) / 2, w, h);
  return true;
}

function drawSprite(key, x, y, w, h) {
  const img = image(key);
  if (!img) return false;
  const drawH = h || w * img.height / img.width;
  ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - drawH / 2), Math.round(w), Math.round(drawH));
  return true;
}

function drawImg(key, x, y, w, h) {
  const img = image(key);
  if (!img) return false;
  ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  return true;
}

function rect(x, y, w, h, fill, stroke, lineWidth) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth || 3;
    ctx.strokeRect(Math.round(x) + 1.5, Math.round(y) + 1.5, Math.round(w) - 3, Math.round(h) - 3);
  }
}

function roundRect(x, y, w, h, r, fill, stroke, lineWidth) {
  const left = Math.round(x);
  const top = Math.round(y);
  const width = Math.round(w);
  const height = Math.round(h);
  const radius = Math.min(r, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(left + radius, top);
  ctx.lineTo(left + width - radius, top);
  ctx.quadraticCurveTo(left + width, top, left + width, top + radius);
  ctx.lineTo(left + width, top + height - radius);
  ctx.quadraticCurveTo(left + width, top + height, left + width - radius, top + height);
  ctx.lineTo(left + radius, top + height);
  ctx.quadraticCurveTo(left, top + height, left, top + height - radius);
  ctx.lineTo(left, top + radius);
  ctx.quadraticCurveTo(left, top, left + radius, top);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth || 3;
    ctx.stroke();
  }
}

function label(value, x, y, size, color, align, weight) {
  ctx.fillStyle = color || COLORS.ink;
  ctx.font = `${weight || 'normal'} ${size || 16}px sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, Math.round(x), Math.round(y));
}

function addButton(id, x, y, w, h) {
  buttons.push({ id, x, y, w, h });
}

function findButton(point) {
  return buttons.find((button) => point.x >= button.x && point.x <= button.x + button.w && point.y >= button.y && point.y <= button.y + button.h);
}

function drawButton(id, value, x, y, w, h, variant) {
  const fill = variant === 'green' ? '#d8f0c9' : variant === 'red' ? '#ffd6c8' : COLORS.panel;
  const stroke = variant === 'green' ? '#4f8d3a' : variant === 'red' ? '#a94b34' : COLORS.border;
  roundRect(x, y, w, h, 8, stroke, null);
  roundRect(x + 4, y + 4, w - 8, h - 8, 6, fill, null);
  label(value, x + w / 2, y + h / 2, Math.min(17, Math.max(13, w / 7)), COLORS.ink, 'center', 'bold');
  addButton(id, x, y, w, h);
}

function drawPanel(x, y, w, h) {
  roundRect(x, y, w, h, 10, COLORS.border, null);
  roundRect(x + 5, y + 5, w - 10, h - 10, 7, COLORS.panel, '#fff8df', 2);
}

function drawSkyGround() {
  rect(0, 0, state.width, state.height, '#9fd7ff');
  rect(0, state.height * 0.42, state.width, state.height, '#77b255');
  rect(0, state.height - 120, state.width, 120, '#5fa342');
  for (let x = 0; x < state.width; x += 46) {
    rect(x, state.height - 90, 20, 8, '#4f8d3a');
  }
}

function render() {
  buttons = [];
  if (state.scene === 'loading') drawLoading();
  else if (state.scene === 'menu') drawMenu();
  else if (state.scene === 'levelMap') drawLevelMap();
  else if (state.scene === 'upgrade') drawUpgrade();
  else if (state.scene === 'restaurant') drawRestaurant();
  else if (state.scene === 'game') drawGame();
}

function drawTopBar(title) {
  drawPanel(16, 18, state.width - 32, 72);
  label(title, 34, 45, 20, COLORS.ink, 'left', 'bold');
  drawSprite('iconCoin', state.width - 104, 54, 34, 34);
  label(String(state.player.coins), state.width - 82, 54, 15, COLORS.ink, 'left', 'bold');
}

function drawLoading() {
  drawSkyGround();
  drawSprite('gooseBoss', state.width / 2, state.height * 0.32, 130, 130);
  label(TEXT.title, state.width / 2, state.height * 0.45, 32, COLORS.ink, 'center', 'bold');
  label(TEXT.subtitle, state.width / 2, state.height * 0.5, 15, COLORS.soft, 'center');
  label(TEXT.loading, state.width / 2, state.height * 0.56, 16, COLORS.ink, 'center');
  const x = 62;
  const y = state.height * 0.61;
  const w = state.width - 124;
  roundRect(x, y, w, 20, 8, '#3a2b20');
  roundRect(x + 4, y + 4, (w - 8) * state.loadingProgress, 12, 5, COLORS.yellow);
}

function drawMenu() {
  drawSkyGround();
  for (let i = 0; i < 5; i += 1) {
    drawSprite(i % 2 ? 'gooseFlower' : 'gooseWhite', 44 + i * 82, state.height * 0.2 + (i % 2) * 24, 66, 66);
  }
  label(TEXT.title, state.width / 2, 76, 34, COLORS.ink, 'center', 'bold');
  label(TEXT.subtitle, state.width / 2, 112, 15, COLORS.soft, 'center');

  const cardW = state.width - 58;
  const x = 29;
  const y0 = 178;
  drawMenuCard('mode:play', 'iconPot', TEXT.playMode, '拖动铁锅，预判鹅群路线', x, y0, cardW, 86);
  drawMenuCard('mode:upgrade', 'iconLightning', TEXT.upgradeMode, `锅等级 ${state.player.potLevel}，捕获范围更大`, x, y0 + 106, cardW, 86);
  drawMenuCard('mode:restaurant', 'iconCoin', TEXT.restaurantMode, `餐馆 ${state.player.restaurantLevel} 级，持续赚金币`, x, y0 + 212, cardW, 86);

  drawPanel(28, state.height - 112, state.width - 56, 74);
  label(`已抓 ${state.player.totalGeese} 只鹅  最高连击 ${state.player.bestCombo}`, state.width / 2, state.height - 78, 15, COLORS.ink, 'center', 'bold');
  label('短局投锅 + 长线经营，失败也要有点好笑', state.width / 2, state.height - 52, 12, COLORS.soft, 'center');
  drawToastIfNeeded();
}

function drawMenuCard(id, icon, title, desc, x, y, w, h) {
  drawPanel(x, y, w, h);
  drawSprite(icon, x + 48, y + h / 2, 48, 48);
  label(title, x + 88, y + 30, 21, COLORS.ink, 'left', 'bold');
  label(desc, x + 88, y + 58, 13, COLORS.soft, 'left');
  addButton(id, x, y, w, h);
}

function drawLevelMap() {
  drawCover('mapFarm') || drawSkyGround();
  drawTopBar('关卡地图');
  drawButton('back:menu', TEXT.back, 24, state.height - 66, 86, 46);

  const cols = 2;
  const startY = 138;
  const gapY = 118;
  const w = (state.width - 72) / 2;
  core.LEVELS.forEach((level, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 24 + col * (w + 24);
    const y = startY + row * gapY;
    const locked = level.id > state.player.maxUnlockedLevel;
    roundRect(x, y, w, 92, 10, locked ? '#c9c9c9' : COLORS.border);
    roundRect(x + 5, y + 5, w - 10, 82, 7, locked ? '#ededed' : '#fff4c9');
    label(locked ? '?' : String(level.id), x + 28, y + 28, 24, locked ? '#8a8a8a' : COLORS.orange, 'center', 'bold');
    label(text(level.titleKey), x + 54, y + 25, 15, COLORS.ink, 'left', 'bold');
    label(text(level.subtitleKey), x + 54, y + 50, 12, locked ? '#8a8a8a' : COLORS.soft, 'left');
    label(locked ? TEXT.locked : `目标 ${level.target} 只`, x + 54, y + 72, 12, locked ? '#8a8a8a' : COLORS.green, 'left', 'bold');
    addButton(`level:${level.id}`, x, y, w, 92);
  });
  drawToastIfNeeded();
}

function drawUpgrade() {
  drawSkyGround();
  drawTopBar('铁锅升级');
  drawButton('back:menu', TEXT.back, 24, state.height - 66, 86, 46);
  drawSprite('potHit', state.width / 2, 162, 142, 142);
  const stats = core.getPotStats(state.player);
  label(`铁锅 Lv.${state.player.potLevel}`, state.width / 2, 262, 24, COLORS.ink, 'center', 'bold');
  label(`捕获范围 +${Math.round(stats.captureBonus)}  力度 +${Math.round(stats.powerBonus * 100)}%`, state.width / 2, 294, 14, COLORS.soft, 'center');
  drawUpgradeCard('upgrade:pot', 'iconPot', '升级铁锅', `花费 ${core.upgradeCost(state.player, 'pot')} 金币`, 36, 336);
  drawUpgradeCard('upgrade:dish', 'iconFire', '升级菜谱', `花费 ${core.upgradeCost(state.player, 'dish')} 金币`, 36, 438);
  drawUpgradeCard('upgrade:restaurant', 'iconCoin', '升级门店', `花费 ${core.upgradeCost(state.player, 'restaurant')} 金币`, 36, 540);
  drawToastIfNeeded();
}

function drawUpgradeCard(id, icon, title, desc, x, y) {
  const w = state.width - 72;
  drawPanel(x, y, w, 78);
  drawSprite(icon, x + 42, y + 39, 42, 42);
  label(title, x + 78, y + 28, 18, COLORS.ink, 'left', 'bold');
  label(desc, x + 78, y + 54, 13, COLORS.soft, 'left');
  drawButton(id, '升级', x + w - 84, y + 20, 64, 38, 'green');
}

function drawRestaurant() {
  drawSkyGround();
  drawTopBar('全国铁锅炖大鹅');
  drawButton('back:menu', TEXT.back, 24, state.height - 66, 86, 46);
  const cx = state.width / 2;
  rect(54, 170, state.width - 108, 230, '#b7763b', '#7a4c23', 5);
  rect(74, 205, state.width - 148, 42, '#e95b3e', '#7a4c23', 4);
  label('铁锅炖大鹅', cx, 226, 23, '#fff7cf', 'center', 'bold');
  drawSprite('potRest', cx, 334, 128, 128);
  for (let i = 0; i < Math.min(5, state.player.restaurantLevel); i += 1) {
    drawSprite(i % 2 ? 'gooseFlower' : 'gooseWhite', 70 + i * 54, 438 + (i % 2) * 10, 48, 48);
  }
  drawPanel(36, 470, state.width - 72, 116);
  label(`门店等级：${state.player.restaurantLevel}`, 58, 500, 17, COLORS.ink, 'left', 'bold');
  label(`菜谱等级：${state.player.dishLevel}`, 58, 528, 17, COLORS.ink, 'left', 'bold');
  const income = Math.floor((state.player.restaurantLevel * 35 + state.player.dishLevel * 28) * 1.2);
  label(`可领取收益：${income} 金币`, 58, 558, 16, COLORS.green, 'left', 'bold');
  drawButton('claim:income', '收金币', state.width - 128, 522, 82, 42, 'green');
  drawToastIfNeeded();
}

function mapKey(map) {
  if (map === 'wetland') return 'mapWetland';
  if (map === 'snow') return 'mapSnow';
  return 'mapFarm';
}

function drawGame() {
  const game = state.game;
  const level = core.getLevel(game.levelId);
  drawCover(mapKey(game.map)) || drawSkyGround();
  drawGeese(game);
  drawPot(game);
  drawAim(game);
  drawEffects(game.effects);
  drawHud(game, level);
  if (game.status === 'hit' || game.status === 'miss') drawFeedback(game);
  if (game.status === 'finished') drawResult(game);
}

function drawGeese(game) {
  game.geese.forEach((goose) => {
    if (goose.escaped) return;
    const alpha = goose.caught ? 0.42 : 1;
    ctx.globalAlpha = alpha;
    rect(goose.x - goose.radius * 0.9, goose.y + goose.radius * 0.72, goose.radius * 1.8, 8, COLORS.shadow);
    drawSprite(goose.sprite, goose.x, goose.y, goose.radius * 3.1, goose.radius * 3.1);
    if (!goose.caught && goose.maxHp > 1) {
      const w = goose.radius * 1.8;
      rect(goose.x - w / 2, goose.y - goose.radius - 16, w, 7, '#5a2f2f');
      rect(goose.x - w / 2, goose.y - goose.radius - 16, w * (goose.hp / goose.maxHp), 7, COLORS.red);
    }
    ctx.globalAlpha = 1;
  });
}

function drawPot(game) {
  const pot = game.pot;
  const groundY = core.getGroundY(state.height);
  const shadowScale = Math.max(0.35, 1 - Math.max(0, groundY - pot.y) / 360);
  rect(pot.x - 36 * shadowScale, groundY + 25, 72 * shadowScale, 8, COLORS.shadow);
  const key = pot.hit ? 'potHit' : pot.flying ? 'potFlying' : 'potRest';
  const size = (pot.radius * 3.6) + (game.skillActive ? 24 : 0);
  drawSprite(key, pot.x, pot.y, size, size);
}

function drawAim(game) {
  if (game.status !== 'aiming' || !game.aimStart || !game.aimCurrent) return;
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(game.aimStart.x, game.aimStart.y);
  ctx.lineTo(game.aimCurrent.x, game.aimCurrent.y);
  ctx.stroke();
  ctx.setLineDash([]);
  const dx = game.aimCurrent.x - game.aimStart.x;
  const power = Math.min(1, game.swipeDistance / core.WORLD.maxSwipe);
  const ghostX = game.pot.x - dx * 0.72;
  const ghostY = game.pot.y - 80 - power * 130;
  for (let i = 1; i <= 4; i += 1) {
    const t = i / 5;
    rect(game.pot.x + (ghostX - game.pot.x) * t - 4, game.pot.y + (ghostY - game.pot.y) * t - 4, 8, 8, COLORS.panel2);
  }
  rect(ghostX - 6, ghostY - 6, 12, 12, COLORS.yellow);
  const x = game.aimStart.x - 68;
  const y = game.aimStart.y + 32;
  rect(x, y, 136, 16, COLORS.ink);
  rect(x + 4, y + 4, 128 * power, 8, COLORS.yellow);
}

function drawHud(game, level) {
  drawPanel(14, 14, state.width - 28, 108);
  label(`${text(level.titleKey)} ${text(level.subtitleKey)}`, state.width / 2, 34, 15, COLORS.ink, 'center', 'bold');
  drawSprite('iconTimer', 42, 66, 30, 30);
  label(`${Math.ceil(game.timeLeft)}s`, 64, 66, 14, COLORS.ink, 'left', 'bold');
  drawSprite('iconPot', state.width * 0.34, 66, 30, 30);
  label(`${game.potsLeft}/${game.potsTotal}`, state.width * 0.34 + 22, 66, 14, COLORS.ink, 'left', 'bold');
  drawSprite('iconCoin', state.width * 0.58, 66, 30, 30);
  label(String(game.coins), state.width * 0.58 + 22, 66, 14, COLORS.ink, 'left', 'bold');
  drawSprite('iconCombo', state.width - 82, 66, 30, 30);
  label(`x${game.combo}`, state.width - 60, 66, 14, COLORS.ink, 'left', 'bold');
  label(`目标 ${game.caught}/${game.target}`, 34, 100, 13, COLORS.green, 'left', 'bold');
  const barX = state.width - 152;
  rect(barX, 94, 118, 12, '#3a2b20');
  rect(barX + 3, 97, 112 * (game.energy / core.WORLD.energyMax), 6, game.energy >= core.WORLD.energyMax ? COLORS.yellow : COLORS.orange);
  if (game.energy >= core.WORLD.energyMax) {
    drawButton('skill', '锅技', state.width - 86, 126, 66, 42, 'green');
  }
  drawButton('back:map', TEXT.back, 18, state.height - 58, 72, 40);
  drawPanel(96, state.height - 58, state.width - 112, 40);
  label(text(game.messageKey), state.width / 2 + 26, state.height - 38, 13, COLORS.ink, 'center', 'bold');
}

function drawEffects(effects) {
  const palette = [COLORS.yellow, COLORS.red, COLORS.green, COLORS.white, COLORS.orange];
  effects.forEach((effect) => {
    const t = effect.age / effect.life;
    const x = effect.x + effect.vx * effect.age;
    const y = effect.y + effect.vy * effect.age + 70 * t * t;
    const size = Math.max(3, 9 * (1 - t));
    rect(x - size / 2, y - size / 2, size, size, palette[effect.colorIndex % palette.length]);
  });
}

function drawFeedback(game) {
  drawPanel(42, state.height * 0.22, state.width - 84, 112);
  label(text(game.messageKey), state.width / 2, state.height * 0.22 + 38, 20, game.status === 'hit' ? COLORS.green : COLORS.red, 'center', 'bold');
  label(`已套 ${game.caught}/${game.target}  连击 x${game.combo}`, state.width / 2, state.height * 0.22 + 72, 14, COLORS.soft, 'center');
}

function drawResult(game) {
  rect(0, 0, state.width, state.height, 'rgba(20, 20, 20, 0.28)');
  drawPanel(32, state.height * 0.18, state.width - 64, state.height * 0.55);
  const result = game.result || { won: false, earnedCoins: 0, ratingKey: 'ratingLose' };
  label(text(game.messageKey), state.width / 2, state.height * 0.24, 27, result.won ? COLORS.green : COLORS.red, 'center', 'bold');
  drawSprite(result.won ? 'gooseGold' : 'gooseRunner', state.width / 2, state.height * 0.34, 96, 96);
  label(`${TEXT.score}: ${game.score}`, state.width / 2, state.height * 0.43, 18, COLORS.ink, 'center', 'bold');
  label(`${TEXT.caught}: ${game.caught}/${game.target}    ${TEXT.combo}: ${game.bestCombo}`, state.width / 2, state.height * 0.48, 15, COLORS.soft, 'center');
  label(`获得金币 +${result.earnedCoins}`, state.width / 2, state.height * 0.53, 18, COLORS.orange, 'center', 'bold');
  label(text(result.ratingKey), state.width / 2, state.height * 0.58, 18, COLORS.ink, 'center', 'bold');
  drawButton('restart', TEXT.restart, state.width * 0.16, state.height * 0.66, state.width * 0.28, 48, 'red');
  if (result.won && game.levelId < core.LEVELS.length) {
    drawButton('nextLevel', TEXT.next, state.width * 0.56, state.height * 0.66, state.width * 0.28, 48, 'green');
  } else {
    drawButton('back:map', TEXT.back, state.width * 0.56, state.height * 0.66, state.width * 0.28, 48);
  }
}

function drawToastIfNeeded() {
  if (!state.toastKey) return;
  roundRect(54, state.height - 126, state.width - 108, 42, 8, COLORS.ink);
  label(text(state.toastKey), state.width / 2, state.height - 105, 15, COLORS.white, 'center', 'bold');
}

function handleAudio(prev, next) {
  const a = prev.game;
  const b = next.game;
  if (!a || !b) return;
  if (a.status !== b.status) {
    if (b.status === 'hit') {
      playSfx(b.messageKey === 'bossHit' ? 'boss' : 'hit');
      playSfx('goose');
    } else if (b.status === 'miss') {
      playSfx('miss');
    } else if (b.status === 'finished') {
      playSfx('coin');
    }
  }
}

function handleButton(id) {
  startBgm();
  if (id.indexOf('mode:') === 0) {
    state = core.selectMode(state, id.split(':')[1]);
  } else if (id.indexOf('level:') === 0) {
    state = core.selectLevel(state, Number(id.split(':')[1]));
  } else if (id === 'back:menu') {
    state = core.goToMenu(state);
  } else if (id === 'back:map') {
    state = core.backToMap(state);
  } else if (id === 'restart') {
    state = core.restartLevel(state);
  } else if (id === 'nextLevel') {
    state = core.selectLevel(state, Math.min(core.LEVELS.length, state.game.levelId + 1));
  } else if (id === 'skill') {
    state = core.useSkill(state);
  } else if (id === 'upgrade:pot') {
    state = core.upgrade(state, 'pot');
  } else if (id === 'upgrade:restaurant') {
    state = core.upgrade(state, 'restaurant');
  } else if (id === 'upgrade:dish') {
    state = core.upgrade(state, 'dish');
  } else if (id === 'claim:income') {
    state = core.claimOffline(state);
  }
  if (state.toastKey) toastUntil = Date.now() + 1300;
}

function canStartAim(point) {
  const game = state.game;
  if (!game || game.status !== 'ready') return false;
  return Math.hypot(point.x - game.pot.x, point.y - game.pot.y) <= game.pot.radius + 70;
}

function getPoint(event) {
  const touch = event.changedTouches && event.changedTouches[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

function loop() {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  if (state.toastKey && toastUntil && now > toastUntil) {
    state = Object.assign({}, state, { toastKey: null });
    toastUntil = 0;
  }
  const prev = state;
  state = core.step(state, dt);
  handleAudio(prev, state);
  render();
  requestAnimationFrame(loop);
}

wx.onTouchStart((event) => {
  startBgm();
  const point = getPoint(event);
  if (!point) return;
  if (state.scene === 'game' && !findButton(point) && canStartAim(point)) {
    state = core.startAim(state, point);
  }
});

wx.onTouchMove((event) => {
  const point = getPoint(event);
  if (point) state = core.updateAim(state, point);
});

wx.onTouchEnd((event) => {
  startBgm();
  const point = getPoint(event);
  if (state.scene === 'game' && state.game && state.game.status === 'aiming') {
    const before = state.game.status;
    state = core.releaseAim(state);
    if (before !== state.game.status && state.game.status === 'flying') {
      playSfx('throw');
    } else if (state.game.messageKey === 'swipeMore') {
      playSfx('miss');
    }
    return;
  }
  if (point) {
    const button = findButton(point);
    if (button) {
      handleButton(button.id);
      return;
    }
  }
  if (state.scene === 'game') {
    const prev = state;
    state = core.continueAfterThrow(state);
    handleAudio(prev, state);
  }
});

if (wx.onWindowResize) {
  wx.onWindowResize(syncCanvasSize);
}

syncCanvasSize();
loop();
