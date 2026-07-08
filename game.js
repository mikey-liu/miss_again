const core = require('./src/gameCore');

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const COLORS = {
  ink: '#243142',
  inkSoft: '#556371',
  panel: '#fff3cf',
  panelLight: '#fff8e8',
  panelDark: '#d8a24c',
  sky: '#9fd7ff',
  skyDark: '#6bb4e8',
  cloud: '#fff8e8',
  grass: '#77b255',
  grassDark: '#4f8d3a',
  soil: '#9b6b43',
  soilDark: '#714b31',
  wood: '#b7763b',
  woodDark: '#7a4e2c',
  red: '#d95757',
  redDark: '#963b3b',
  orange: '#f19b38',
  orangeDark: '#a95f24',
  yellow: '#f6d05f',
  yellowDark: '#ad8d31',
  green: '#5fad56',
  greenDark: '#3d863a',
  leaf: '#8ed16f',
  purple: '#7d5ab6',
  purpleDark: '#523976',
  white: '#fff8e8',
  disabled: '#9aa1a8',
  shadow: 'rgba(36, 49, 66, 0.18)'
};

const TEXT = {
  title: '又没中？！',
  subtitle: 'Miss Again?!',
  loading: '加载中...',
  menuTitle: '游戏列表',
  ringMode: '套圈',
  archeryMode: '射箭',
  shootingMode: '射击',
  comingSoon: '开发中',
  locked: '未解锁',
  mapTitle: '套圈关卡地图',
  level1Title: '第 1 关',
  level1Subtitle: '新手摊位',
  level2Title: '第 2 关',
  level2Subtitle: '小目标挑战',
  level3Title: '第 3 关',
  back: '返回',
  restart: '重玩',
  rings: '圈',
  score: '得分',
  hits: '命中',
  distance: '滑动距离',
  hiddenDistance: '距离隐藏',
  swipeToThrow: '从圆环处上滑，松手投出',
  releaseToThrow: '松手投出',
  swipeMore: '上滑距离不够',
  flying: '飞行中...',
  hit: '套中了！点一下继续',
  miss: '又没中？！点一下继续',
  finished: '本关结束',
  result: '结算',
  rating0: '又没中？！',
  rating1: '有点手感',
  rating2: '套圈高手',
  rating3: '摊主沉默了',
  mapTip: '第 1 关显示距离，第 2 关隐藏距离且目标更小',
  levelLockedTip: '后续摊位开发中',
  power: '蓄力'
};

const TARGET_LABELS = {
  pumpkin: '南瓜',
  tomato: '番茄',
  eggplant: '茄子',
  cabbage: '白菜',
  pepper: '辣椒',
  strawberry: '草莓',
  corn: '玉米',
  radish: '萝卜',
  mushroom: '蘑菇'
};

const AUDIO_FILES = {
  click: 'assets/audio/ui_click.wav',
  throw: 'assets/audio/throw_whoosh.wav',
  ground: 'assets/audio/ground_thud.wav',
  vegetable: 'assets/audio/veggie_bounce.wav',
  hit: 'assets/audio/hit_success.wav',
  miss: 'assets/audio/miss_blip.wav',
  result: 'assets/audio/result_jingle.wav',
  bgm: 'assets/audio/bgm_loop.wav'
};

const IMAGE_FILES = {
  screenLoading: 'assets/runtime/screens/loading.png',
  screenMenu: 'assets/runtime/screens/menu.png',
  screenMap: 'assets/runtime/screens/level_map.png',
  screenGameplay1: 'assets/runtime/screens/gameplay_level1.png',
  screenGameplay2: 'assets/runtime/screens/gameplay_level2.png',
  screenResult: 'assets/runtime/screens/result.png',
  spritePumpkin: 'assets/runtime/sprites/pumpkin.png',
  spriteTomato: 'assets/runtime/sprites/tomato.png',
  spriteEggplant: 'assets/runtime/sprites/eggplant.png',
  spriteCabbage: 'assets/runtime/sprites/cabbage.png',
  spritePepper: 'assets/runtime/sprites/strawberry.png',
  spriteStrawberry: 'assets/runtime/sprites/strawberry.png',
  spriteCorn: 'assets/runtime/sprites/corn.png',
  spriteRadish: 'assets/runtime/sprites/radish.png',
  spriteMushroom: 'assets/runtime/sprites/mushroom.png',
  spriteRingRest: 'assets/runtime/sprites/ring_rest.png',
  spriteRingTilt: 'assets/runtime/sprites/ring_tilt.png',
  spriteRingHit: 'assets/runtime/sprites/ring_hit.png',
  uiPanel: 'assets/runtime/ui/panel_wide.png',
  uiButtonYellow: 'assets/runtime/ui/button_yellow.png',
  uiButtonGreen: 'assets/runtime/ui/button_green.png',
  uiButtonRed: 'assets/runtime/ui/button_red.png',
  uiSpeech: 'assets/runtime/ui/speech.png'
};

let dpr = 1;
let state = core.createInitialState(375, 667);
let lastTime = Date.now();
let buttons = [];
let toastUntil = 0;
let audioReady = false;
let bgmStarted = false;
let imagesReady = false;
let imagesStarted = false;
const audioPool = {};
const imageAssets = {};

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

function text(key) {
  return TEXT[key] || key || '';
}

function initImages() {
  if (imagesStarted || !wx.createImage) {
    return;
  }

  imagesStarted = true;
  const keys = Object.keys(IMAGE_FILES);
  let loaded = 0;

  keys.forEach((key) => {
    const image = wx.createImage();
    image.onload = () => {
      loaded += 1;
      imagesReady = loaded >= keys.length;
    };
    image.onerror = () => {
      loaded += 1;
      imagesReady = loaded >= keys.length;
    };
    image.src = IMAGE_FILES[key];
    imageAssets[key] = image;
  });
}

function getImage(key) {
  const image = imageAssets[key];
  return image && image.width > 0 && image.height > 0 ? image : null;
}

function getCoverRect(image) {
  const scale = Math.max(state.width / image.width, state.height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  return {
    x: (state.width - w) / 2,
    y: (state.height - h) / 2,
    w,
    h,
    scale
  };
}

function drawImageCover(key) {
  const image = getImage(key);
  if (!image) {
    return false;
  }

  const rect = getCoverRect(image);
  ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
  return true;
}

function drawImageStretch(key, x, y, w, h) {
  const image = getImage(key);
  if (!image) {
    return false;
  }

  ctx.drawImage(image, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  return true;
}

function drawSpriteCentered(key, x, y, width, height) {
  const image = getImage(key);
  if (!image) {
    return false;
  }

  const drawW = width;
  const drawH = height || width * (image.height / image.width);
  ctx.drawImage(image, Math.round(x - drawW / 2), Math.round(y - drawH / 2), Math.round(drawW), Math.round(drawH));
  return true;
}

function initAudio() {
  if (audioReady || !wx.createInnerAudioContext) {
    return;
  }

  Object.keys(AUDIO_FILES).forEach((key) => {
    const audio = wx.createInnerAudioContext();
    audio.src = AUDIO_FILES[key];
    audio.loop = key === 'bgm';
    audio.volume = key === 'bgm' ? 0.26 : 0.72;
    audioPool[key] = audio;
  });

  audioReady = true;
}

function playSfx(key) {
  initAudio();
  const audio = audioPool[key];
  if (!audio) {
    return;
  }

  try {
    audio.stop();
    audio.currentTime = 0;
    audio.play();
  } catch (error) {
    // Audio playback may be blocked before the first user gesture.
  }
}

function startBgm() {
  initAudio();
  if (bgmStarted || !audioPool.bgm) {
    return;
  }

  bgmStarted = true;
  try {
    audioPool.bgm.play();
  } catch (error) {
    bgmStarted = false;
  }
}

function handleAudioTransitions(prevState, nextState) {
  const prevGame = prevState.ringGame;
  const nextGame = nextState.ringGame;

  if (!prevGame || !nextGame) {
    return;
  }

  if (prevGame.status !== nextGame.status) {
    if (nextGame.status === 'hit') {
      playSfx('hit');
    } else if (nextGame.status === 'miss') {
      playSfx('miss');
    } else if (nextGame.status === 'finished') {
      playSfx('result');
    }
  }

  if (nextGame.status !== 'flying') {
    return;
  }

  const newEffects = nextGame.effects.filter((effect) => effect.age === 0);
  if (newEffects.some((effect) => effect.kind === 'vegetableBounce')) {
    playSfx('vegetable');
  } else if (newEffects.some((effect) => effect.kind === 'groundBounce')) {
    playSfx('ground');
  }
}

function getTouchPoint(event) {
  const touch = event.changedTouches && event.changedTouches[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

function addButton(id, x, y, w, h) {
  buttons.push({ id, x, y, w, h });
}

function findButton(point) {
  return buttons.find((button) => (
    point.x >= button.x &&
    point.x <= button.x + button.w &&
    point.y >= button.y &&
    point.y <= button.y + button.h
  ));
}

function drawText(value, x, y, size, color, align, weight) {
  ctx.fillStyle = color || COLORS.ink;
  ctx.font = `${weight || 'normal'} ${size || 16}px sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, Math.round(x), Math.round(y));
}

function drawPixelRect(x, y, w, h, fill, stroke, lineWidth) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth || 3;
    ctx.strokeRect(Math.round(x) + 1.5, Math.round(y) + 1.5, Math.round(w) - 3, Math.round(h) - 3);
  }
}

function drawPanel(x, y, w, h) {
  if (drawImageStretch('uiPanel', x, y, w, h)) {
    return;
  }

  drawPixelRect(x, y, w, h, COLORS.panelDark, null);
  drawPixelRect(x + 5, y + 5, w - 10, h - 10, COLORS.panel, COLORS.panelLight, 2);
}

function drawButton(id, label, x, y, w, h, enabled, variant) {
  const fill = enabled === false ? '#d5d8db' : COLORS.panel;
  const stroke = enabled === false ? COLORS.disabled : COLORS.panelDark;
  const textColor = enabled === false ? COLORS.disabled : COLORS.ink;
  const imageKey = variant === 'green'
    ? 'uiButtonGreen'
    : variant === 'red'
      ? 'uiButtonRed'
      : 'uiButtonYellow';

  if (!drawImageStretch(imageKey, x, y, w, h)) {
    drawPixelRect(x, y, w, h, stroke, null);
    drawPixelRect(x + 4, y + 4, w - 8, h - 8, fill, null);
  }
  drawText(label, x + w / 2, y + h / 2, 17, textColor, 'center', 'bold');
  addButton(id, x, y, w, h);
}

function drawWorldBackground() {
  drawPixelRect(0, 0, state.width, state.height, COLORS.sky, null);
  drawPixelRect(0, state.height * 0.42, state.width, state.height * 0.22, COLORS.skyDark, null);

  drawPixelRect(24, 54, 62, 18, COLORS.cloud, null);
  drawPixelRect(42, 38, 46, 20, COLORS.cloud, null);
  drawPixelRect(state.width - 110, 86, 70, 18, COLORS.cloud, null);
  drawPixelRect(state.width - 88, 70, 44, 20, COLORS.cloud, null);

  drawPixelRect(0, state.height - 150, state.width, 150, COLORS.grass, null);
  drawPixelRect(0, state.height - 78, state.width, 78, COLORS.grassDark, null);

  for (let x = 0; x < state.width; x += 42) {
    drawPixelRect(x, state.height - 92, 20, 8, '#5f9f43', null);
  }
}

function render() {
  buttons = [];

  if (state.scene === 'loading') {
    drawLoading();
  } else if (state.scene === 'menu') {
    drawMenu();
  } else if (state.scene === 'ringMap') {
    drawRingMap();
  } else if (state.scene === 'ringGame') {
    drawRingGame();
  }
}

function drawLoading() {
  if (!drawImageCover('screenLoading')) {
    drawWorldBackground();
    drawPanel(34, state.height * 0.27, state.width - 68, 210);
    drawFruitMascot(state.width / 2, state.height * 0.32, 1.15);
  }

  drawText(TEXT.title, state.width / 2, state.height * 0.41, 30, COLORS.ink, 'center', 'bold');
  drawText(TEXT.subtitle, state.width / 2, state.height * 0.455, 16, COLORS.inkSoft, 'center');
  drawText(TEXT.loading, state.width / 2, state.height * 0.505, 16, COLORS.inkSoft, 'center');

  const barX = 70;
  const barY = state.height * 0.555;
  const barW = state.width - 140;
  drawPixelRect(barX, barY, barW, 20, COLORS.ink, null);
  drawPixelRect(barX + 4, barY + 4, (barW - 8) * state.loadingProgress, 12, COLORS.yellow, null);
}

function drawMenu() {
  if (!drawImageCover('screenMenu')) {
    drawWorldBackground();
    drawText(TEXT.title, state.width / 2, 58, 30, COLORS.ink, 'center', 'bold');
    drawText(TEXT.menuTitle, state.width / 2, 96, 18, COLORS.inkSoft, 'center');

    const cardW = state.width - 54;
    const cardX = 27;
    const startY = 142;
    state.modes.forEach((mode, index) => {
      const y = startY + index * 100;
      drawModeCard(mode, cardX, y, cardW, 76);
    });

    drawPanel(32, state.height - 118, state.width - 64, 62);
    drawText('先开放套圈玩法，射箭和射击作为后续小游戏入口。', state.width / 2, state.height - 87, 13, COLORS.inkSoft, 'center');
  } else {
    addButton('mode:ring', state.width * 0.12, state.height * 0.22, state.width * 0.76, state.height * 0.18);
    addButton('mode:archery', state.width * 0.12, state.height * 0.42, state.width * 0.76, state.height * 0.17);
    addButton('mode:shooting', state.width * 0.12, state.height * 0.61, state.width * 0.76, state.height * 0.17);
  }

  if (state.toastKey) {
    drawToast(text(state.toastKey));
  }
}

function drawModeCard(mode, x, y, w, h) {
  drawButton(`mode:${mode.id}`, '', x, y, w, h, mode.available);
  drawModeIcon(mode.id, x + 36, y + h / 2);
  drawText(text(mode.titleKey), x + 88, y + h / 2 - 10, 20, mode.available ? COLORS.ink : COLORS.disabled, 'left', 'bold');
  drawText(mode.available ? '上滑投出圆环' : TEXT.comingSoon, x + 88, y + h / 2 + 16, 13, mode.available ? COLORS.inkSoft : COLORS.disabled, 'left');
}

function drawModeIcon(modeId, x, y) {
  if (modeId === 'ring') {
    drawPixelRect(x - 18, y - 18, 36, 7, COLORS.red, null);
    drawPixelRect(x - 18, y + 11, 36, 7, COLORS.red, null);
    drawPixelRect(x - 18, y - 18, 7, 36, COLORS.red, null);
    drawPixelRect(x + 11, y - 18, 7, 36, COLORS.red, null);
    return;
  }

  if (modeId === 'archery') {
    drawPixelRect(x - 20, y - 3, 40, 6, COLORS.woodDark, null);
    drawPixelRect(x + 10, y - 10, 16, 20, COLORS.disabled, null);
    return;
  }

  drawPixelRect(x - 20, y - 8, 34, 16, COLORS.disabled, null);
  drawPixelRect(x + 8, y - 4, 18, 8, COLORS.disabled, null);
}

function drawRingMap() {
  if (!drawImageCover('screenMap')) {
    drawWorldBackground();
  }
  drawButton('back:menu', TEXT.back, 18, 22, 74, 42, true, 'yellow');

  const nodes = [
    { level: state.levels[0], x: state.width * 0.55, y: state.height * 0.84 },
    { level: state.levels[1], x: state.width * 0.52, y: state.height * 0.69 },
    { level: state.levels[2], x: state.width * 0.50, y: state.height * 0.48 }
  ];

  if (!getImage('screenMap')) {
    drawText(TEXT.mapTitle, state.width / 2, 52, 24, COLORS.ink, 'center', 'bold');
    nodes.forEach((node) => drawLevelNode(node.level, node.x, node.y));
  } else {
    nodes.forEach((node) => {
      addButton(`level:${node.level.id}`, node.x - 54, node.y - 54, 108, 108);
    });
  }

  drawImageStretch('uiSpeech', 28, state.height - 86, state.width - 56, 58);
  drawText(TEXT.mapTip, state.width / 2, state.height - 58, 12, COLORS.inkSoft, 'center');

  if (state.toastKey) {
    drawToast(text(state.toastKey));
  }
}

function drawLevelNode(level, x, y) {
  const fill = level.unlocked ? COLORS.yellow : '#c8c8c8';
  drawPixelRect(x - 38, y - 38, 76, 76, COLORS.panelDark, null);
  drawPixelRect(x - 31, y - 31, 62, 62, fill, level.unlocked ? COLORS.orangeDark : COLORS.disabled);
  drawText(level.unlocked ? String(level.id) : '?', x, y, 24, COLORS.ink, 'center', 'bold');
  drawText(text(level.titleKey), x, y + 58, 15, COLORS.ink, 'center', 'bold');
  drawText(text(level.subtitleKey), x, y + 80, 12, level.unlocked ? COLORS.inkSoft : COLORS.disabled, 'center');
  addButton(`level:${level.id}`, x - 48, y - 48, 96, 140);
}

function drawRingGame() {
  const game = state.ringGame;
  const level = core.getLevel(game.levelId);

  if (!drawImageCover(level.id === 2 ? 'screenGameplay2' : 'screenGameplay1')) {
    drawWorldBackground();
    drawStall();
  }
  game.targets.forEach(drawTarget);
  drawRingShadow(game.ring);
  drawRing(game.ring);
  drawAim(game, level);
  drawEffects(game.effects);
  drawGameHud(game, level);

  if (game.status === 'hit' || game.status === 'miss') {
    drawThrowFeedback(game);
  }

  if (game.status === 'finished') {
    drawResult(game);
  }
}

function drawStall() {
  const y = state.height - 246;
  drawPixelRect(34, y - 26, state.width - 68, 26, COLORS.panelDark, null);
  drawPixelRect(42, y - 20, state.width - 84, 14, COLORS.panel, null);
  drawPixelRect(42, y, state.width - 84, 34, COLORS.wood, COLORS.woodDark);
  drawPixelRect(54, y + 34, state.width - 108, 88, COLORS.soil, COLORS.soilDark);
  for (let x = 68; x < state.width - 68; x += 38) {
    drawPixelRect(x, y + 60, 20, 10, '#805536', null);
  }
}

function drawTarget(target) {
  const squash = target.hit ? 0.72 : 1;
  const radius = target.radius;
  const spriteKey = `sprite${target.type.charAt(0).toUpperCase()}${target.type.slice(1)}`;

  drawPixelRect(target.x - radius * 0.8, target.y + radius * 0.72, radius * 1.6, 7, COLORS.shadow, null);

  if (target.hit) {
    drawPixelRect(target.x - radius, target.y - radius - 9, radius * 2, 8, COLORS.yellow, null);
  }

  if (drawSpriteCentered(spriteKey, target.x, target.y, radius * 3.4, radius * 3.1 * squash)) {
    drawText(TARGET_LABELS[target.type] || '', target.x, target.y + radius + 22, 11, COLORS.inkSoft, 'center');
    return;
  }

  if (target.type === 'pumpkin') {
    drawPixelRect(target.x - radius, target.y - radius * 0.55 * squash, radius * 2, radius * 1.1 * squash, COLORS.orange, COLORS.orangeDark);
    drawPixelRect(target.x - 5, target.y - radius * 0.9, 10, 12, COLORS.green, null);
  } else if (target.type === 'tomato') {
    drawPixelRect(target.x - radius * 0.9, target.y - radius * 0.75 * squash, radius * 1.8, radius * 1.5 * squash, COLORS.red, COLORS.redDark);
    drawPixelRect(target.x - 9, target.y - radius * 0.96, 18, 9, COLORS.green, null);
  } else if (target.type === 'eggplant') {
    drawPixelRect(target.x - radius * 0.7, target.y - radius * 0.9 * squash, radius * 1.4, radius * 1.8 * squash, COLORS.purple, COLORS.purpleDark);
    drawPixelRect(target.x - 8, target.y - radius, 16, 9, COLORS.green, null);
  } else if (target.type === 'cabbage') {
    drawPixelRect(target.x - radius, target.y - radius * squash, radius * 2, radius * 2 * squash, COLORS.leaf, COLORS.greenDark);
    drawPixelRect(target.x - radius * 0.45, target.y - radius * 0.45, radius * 0.9, radius * 0.9 * squash, '#b9e68c', null);
  } else if (target.type === 'corn') {
    drawPixelRect(target.x - radius * 0.45, target.y - radius, radius * 0.9, radius * 2 * squash, COLORS.yellow, COLORS.yellowDark);
    drawPixelRect(target.x - radius * 0.8, target.y + radius * 0.18, radius * 1.6, 10, COLORS.green, null);
  } else if (target.type === 'pepper') {
    drawPixelRect(target.x - radius * 0.45, target.y - radius, radius * 0.9, radius * 2 * squash, COLORS.red, COLORS.redDark);
    drawPixelRect(target.x - 5, target.y - radius - 8, 10, 10, COLORS.green, null);
  } else if (target.type === 'radish') {
    drawPixelRect(target.x - radius * 0.65, target.y - radius * 0.4, radius * 1.3, radius * 1.2 * squash, COLORS.white, '#b5aaa0');
    drawPixelRect(target.x - 8, target.y - radius, 16, 14, COLORS.green, null);
  } else if (target.type === 'mushroom') {
    drawPixelRect(target.x - radius, target.y - radius * 0.8, radius * 2, radius * 0.9 * squash, COLORS.red, COLORS.redDark);
    drawPixelRect(target.x - radius * 0.44, target.y - radius * 0.05, radius * 0.88, radius * 1.05 * squash, COLORS.white, '#b5aaa0');
  }

  drawText(TARGET_LABELS[target.type] || '', target.x, target.y + radius + 16, 11, COLORS.inkSoft, 'center');
}

function drawRingShadow(ring) {
  const groundY = core.getGroundY(state.height);
  const t = Math.max(0.35, 1 - Math.max(0, groundY - ring.y) / 360);
  drawPixelRect(ring.x - ring.radius * t, groundY + 22, ring.radius * 2 * t, 7, COLORS.shadow, null);
}

function drawRing(ring) {
  const size = ring.radius * 2;
  const color = ring.hit ? COLORS.green : COLORS.red;
  const imageKey = ring.hit ? 'spriteRingHit' : ring.flying ? 'spriteRingTilt' : 'spriteRingRest';
  if (drawSpriteCentered(imageKey, ring.x, ring.y, ring.hit ? ring.radius * 5.0 : ring.radius * 4.6)) {
    return;
  }

  drawPixelRect(ring.x - ring.radius, ring.y - ring.radius, size, 8, color, null);
  drawPixelRect(ring.x - ring.radius, ring.y + ring.radius - 8, size, 8, color, null);
  drawPixelRect(ring.x - ring.radius, ring.y - ring.radius, 8, size, color, null);
  drawPixelRect(ring.x + ring.radius - 8, ring.y - ring.radius, 8, size, color, null);
  drawPixelRect(ring.x - ring.radius + 8, ring.y - ring.radius + 8, size - 16, 6, COLORS.white, null);
}

function drawAim(game, level) {
  if (game.status !== 'aiming' || !game.aimStart || !game.aimCurrent) {
    return;
  }

  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(game.aimStart.x, game.aimStart.y);
  ctx.lineTo(game.aimCurrent.x, game.aimCurrent.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const dx = game.aimCurrent.x - game.aimStart.x;
  const power = Math.min(1, game.swipeDistance / core.WORLD.maxSwipe);
  const ghostX = game.ring.x - dx * 0.7;
  const ghostY = game.ring.y - 80 - power * 110;
  drawPixelRect(ghostX - 5, ghostY - 5, 10, 10, COLORS.yellow, null);
  drawPixelRect((game.ring.x + ghostX) / 2 - 4, (game.ring.y + ghostY) / 2 - 4, 8, 8, COLORS.panelLight, null);

  const meterW = 136;
  const meterX = game.aimStart.x - meterW / 2;
  const meterY = game.aimStart.y + 28;
  drawText(TEXT.power, game.aimStart.x, meterY - 14, 13, COLORS.ink, 'center', 'bold');
  drawPixelRect(meterX, meterY, meterW, 16, COLORS.ink, null);
  drawPixelRect(meterX + 4, meterY + 4, (meterW - 8) * power, 8, COLORS.yellow, null);

  if (level.showDistance) {
    drawText(`${TEXT.distance}: ${game.swipeDistance}px`, game.aimStart.x, meterY + 40, 13, COLORS.ink, 'center');
  } else {
    drawText(TEXT.hiddenDistance, game.aimStart.x, meterY + 40, 13, COLORS.ink, 'center');
  }
}

function drawEffects(effects) {
  const colors = [COLORS.yellow, COLORS.red, COLORS.green, COLORS.white];
  effects.forEach((effect) => {
    const t = effect.age / effect.life;
    const x = effect.x + effect.vx * effect.age;
    const y = effect.y + effect.vy * effect.age + 80 * t * t;
    const size = Math.max(3, 8 * (1 - t));
    drawPixelRect(x - size / 2, y - size / 2, size, size, colors[effect.colorIndex], null);
  });
}

function drawGameHud(game, level) {
  addButton('back:map', 18, 16, 52, 48);
  drawText(`${game.ringsLeft}/${game.ringsTotal}`, state.width * 0.30, 42, 16, COLORS.ink, 'center', 'bold');
  drawText(`${game.score}`, state.width * 0.72, 42, 16, COLORS.ink, 'center', 'bold');
  drawText(`${text(level.titleKey)} ${text(level.subtitleKey)}`, state.width / 2, 88, 14, COLORS.ink, 'center', 'bold');

  drawImageStretch('uiSpeech', 20, state.height - 58, state.width - 40, 42);
  drawText(text(game.messageKey), state.width / 2, state.height - 37, 13, COLORS.ink, 'center');
}

function drawThrowFeedback(game) {
  const y = state.height * 0.25;
  drawPanel(46, y, state.width - 92, 104);
  drawText(text(game.messageKey), state.width / 2, y + 39, 20, game.status === 'hit' ? COLORS.greenDark : COLORS.redDark, 'center', 'bold');
  drawText(`剩余 ${game.ringsLeft} 个圈`, state.width / 2, y + 72, 13, COLORS.inkSoft, 'center');
}

function drawResult(game) {
  if (!drawImageCover('screenResult')) {
    drawPixelRect(0, 0, state.width, state.height, 'rgba(36, 49, 66, 0.28)', null);
    drawPanel(34, state.height * 0.25, state.width - 68, 252);
  }

  const y = state.height * 0.32;
  drawText(TEXT.result, state.width / 2, y, 25, COLORS.ink, 'center', 'bold');
  drawText(`${TEXT.score}: ${game.score}`, state.width / 2, y + 52, 18, COLORS.ink, 'center');
  drawText(`${TEXT.hits}: ${game.hits}/${game.ringsTotal}`, state.width / 2, y + 84, 16, COLORS.inkSoft, 'center');
  drawText(text(core.getRating(game.score)), state.width / 2, y + 118, 18, COLORS.orangeDark, 'center', 'bold');
  addButton('restart', state.width * 0.17, state.height * 0.78, state.width * 0.28, state.height * 0.11);
  addButton('back:map', state.width * 0.55, state.height * 0.78, state.width * 0.28, state.height * 0.11);
}

function drawToast(message) {
  drawPixelRect(62, state.height - 110, state.width - 124, 44, COLORS.ink, null);
  drawText(message, state.width / 2, state.height - 88, 15, COLORS.white, 'center', 'bold');
}

function drawFruitMascot(x, y, scale) {
  const s = scale || 1;
  drawPixelRect(x - 24 * s, y - 18 * s, 48 * s, 36 * s, COLORS.orange, COLORS.orangeDark);
  drawPixelRect(x - 5 * s, y - 32 * s, 10 * s, 14 * s, COLORS.green, null);
  drawPixelRect(x - 12 * s, y - 4 * s, 7 * s, 7 * s, COLORS.ink, null);
  drawPixelRect(x + 6 * s, y - 4 * s, 7 * s, 7 * s, COLORS.ink, null);
  drawPixelRect(x - 7 * s, y + 10 * s, 14 * s, 4 * s, COLORS.ink, null);
}

function handleButton(id) {
  playSfx('click');

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
  }

  if (state.toastKey) {
    toastUntil = Date.now() + 1200;
  }
}

function canStartAim(point) {
  const game = state.ringGame;
  if (!game || game.status !== 'ready') {
    return false;
  }

  const distance = Math.hypot(point.x - game.ring.x, point.y - game.ring.y);
  return distance <= game.ring.radius + 62;
}

function loop() {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  if (state.toastKey && toastUntil && now > toastUntil) {
    state = Object.assign({}, state, { toastKey: null });
    toastUntil = 0;
  }

  const prevState = state;
  state = core.step(state, dt);
  handleAudioTransitions(prevState, state);
  render();
  requestAnimationFrame(loop);
}

wx.onTouchStart((event) => {
  startBgm();
  const point = getTouchPoint(event);
  if (!point) {
    return;
  }

  if (state.scene === 'ringGame' && !findButton(point) && canStartAim(point)) {
    state = core.startAim(state, point);
  }
});

wx.onTouchMove((event) => {
  const point = getTouchPoint(event);
  if (point) {
    state = core.updateAim(state, point);
  }
});

wx.onTouchEnd((event) => {
  startBgm();
  const point = getTouchPoint(event);

  if (state.scene === 'ringGame' && state.ringGame && state.ringGame.status === 'aiming') {
    const prevGame = state.ringGame;
    state = core.releaseAim(state);
    if (state.ringGame && prevGame.status !== state.ringGame.status && state.ringGame.status === 'flying') {
      playSfx('throw');
    } else if (state.ringGame && state.ringGame.messageKey === 'swipeMore') {
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

  if (state.scene === 'ringGame') {
    const prevState = state;
    state = core.continueAfterThrow(state);
    handleAudioTransitions(prevState, state);
  }
});

if (wx.onWindowResize) {
  wx.onWindowResize(syncCanvasSize);
}

syncCanvasSize();
loop();
