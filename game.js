const core = require('./src/gameCore');

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const COLORS = {
  ink: '#243142',
  inkSoft: '#556371',
  panel: '#fff3cf',
  panelDark: '#d8a24c',
  sky: '#9fd7ff',
  skyDark: '#6bb4e8',
  grass: '#77b255',
  grassDark: '#4f8d3a',
  soil: '#9b6b43',
  wood: '#b7763b',
  red: '#d95757',
  orange: '#f19b38',
  yellow: '#f6d05f',
  green: '#5fad56',
  purple: '#7d5ab6',
  white: '#fff8e8',
  disabled: '#9aa1a8'
};

const TEXT = {
  title: '又没中？！',
  loading: '加载中...',
  tapStart: '轻点开始',
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
  distance: '滑动距离',
  hiddenDistance: '距离隐藏',
  swipeToThrow: '从圆环处上滑，松手投出',
  releaseToThrow: '松手投出',
  swipeMore: '上滑距离不够',
  flying: '飞行中...',
  hit: '套中了！点一下继续',
  miss: '又没中？！点一下继续',
  finished: '本关结束',
  result: '结算'
};

let dpr = 1;
let state = core.createInitialState(375, 667);
let lastTime = Date.now();
let buttons = [];

function syncCanvasSize() {
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

function drawText(value, x, y, size, color, align) {
  ctx.fillStyle = color || COLORS.ink;
  ctx.font = `${size || 16}px monospace`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function drawPixelRect(x, y, w, h, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.strokeRect(Math.round(x) + 1.5, Math.round(y) + 1.5, Math.round(w) - 3, Math.round(h) - 3);
  }
}

function drawButton(id, label, x, y, w, h, enabled) {
  const fill = enabled === false ? '#d5d8db' : COLORS.panel;
  const stroke = enabled === false ? COLORS.disabled : COLORS.panelDark;

  drawPixelRect(x, y, w, h, stroke, null);
  drawPixelRect(x + 4, y + 4, w - 8, h - 8, fill, null);
  drawText(label, x + w / 2, y + h / 2, 17, enabled === false ? COLORS.disabled : COLORS.ink, 'center');
  addButton(id, x, y, w, h);
}

function drawWorldBackground() {
  drawPixelRect(0, 0, state.width, state.height, COLORS.sky, null);
  drawPixelRect(0, state.height * 0.45, state.width, state.height * 0.2, COLORS.skyDark, null);
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
  drawWorldBackground();
  drawPixelRect(34, state.height * 0.28, state.width - 68, 190, COLORS.panelDark, null);
  drawPixelRect(42, state.height * 0.28 + 8, state.width - 84, 174, COLORS.panel, null);

  drawText(TEXT.title, state.width / 2, state.height * 0.34, 30, COLORS.ink, 'center');
  drawText(TEXT.loading, state.width / 2, state.height * 0.42, 16, COLORS.inkSoft, 'center');

  const barX = 70;
  const barY = state.height * 0.48;
  const barW = state.width - 140;
  drawPixelRect(barX, barY, barW, 20, COLORS.ink, null);
  drawPixelRect(barX + 4, barY + 4, (barW - 8) * state.loadingProgress, 12, COLORS.yellow, null);
}

function drawMenu() {
  drawWorldBackground();
  drawText(TEXT.title, state.width / 2, 66, 30, COLORS.ink, 'center');
  drawText(TEXT.menuTitle, state.width / 2, 106, 18, COLORS.inkSoft, 'center');

  const cardW = state.width - 72;
  const cardX = 36;
  const startY = 160;
  state.modes.forEach((mode, index) => {
    const y = startY + index * 92;
    drawButton(`mode:${mode.id}`, text(mode.titleKey), cardX, y, cardW, 68, mode.available);
    if (!mode.available) {
      drawText(TEXT.comingSoon, cardX + cardW - 70, y + 34, 13, COLORS.disabled, 'center');
    }
  });

  if (state.toastKey) {
    drawToast(text(state.toastKey));
  }
}

function drawRingMap() {
  drawWorldBackground();
  drawText(TEXT.mapTitle, state.width / 2, 52, 24, COLORS.ink, 'center');
  drawButton('back:menu', TEXT.back, 18, 20, 74, 42, true);

  const baseY = 145;
  state.levels.forEach((level, index) => {
    const x = state.width / 2 + (index - 1) * 92;
    const y = baseY + index * 86;
    drawPixelRect(x - 34, y - 34, 68, 68, level.unlocked ? COLORS.yellow : '#c8c8c8', COLORS.ink);
    drawText(String(level.id), x, y - 2, 24, COLORS.ink, 'center');
    drawText(text(level.titleKey), x, y + 56, 14, COLORS.ink, 'center');
    drawText(text(level.subtitleKey), x, y + 76, 12, COLORS.inkSoft, 'center');
    addButton(`level:${level.id}`, x - 40, y - 40, 80, 112);
  });

  drawPixelRect(44, state.height - 142, state.width - 88, 74, COLORS.panel, COLORS.panelDark);
  drawText('第 1 关显示距离；第 2 关隐藏距离且目标更小。', state.width / 2, state.height - 106, 14, COLORS.ink, 'center');

  if (state.toastKey) {
    drawToast(text(state.toastKey));
  }
}

function drawRingGame() {
  const game = state.ringGame;
  const level = core.getLevel(game.levelId);

  drawWorldBackground();
  drawStall();
  game.targets.forEach(drawTarget);
  drawRing(game.ring);
  drawAim(game, level);
  drawEffects(game.effects);
  drawGameHud(game, level);

  if (game.status === 'finished') {
    drawResult(game);
  }
}

function drawStall() {
  const y = state.height - 230;
  drawPixelRect(42, y, state.width - 84, 34, COLORS.wood, '#7a4e2c');
  drawPixelRect(54, y + 34, state.width - 108, 82, COLORS.soil, '#714b31');
  for (let x = 68; x < state.width - 68; x += 38) {
    drawPixelRect(x, y + 58, 20, 10, '#805536', null);
  }
}

function drawTarget(target) {
  if (target.hit) {
    drawPixelRect(target.x - target.radius, target.y - 6, target.radius * 2, 12, '#f6e27a', null);
  }

  if (target.type === 'pumpkin') {
    drawPixelRect(target.x - target.radius, target.y - target.radius * 0.55, target.radius * 2, target.radius * 1.1, COLORS.orange, '#a95f24');
    drawPixelRect(target.x - 5, target.y - target.radius * 0.85, 10, 12, COLORS.green, null);
  } else if (target.type === 'eggplant') {
    drawPixelRect(target.x - target.radius * 0.7, target.y - target.radius * 0.9, target.radius * 1.4, target.radius * 1.8, COLORS.purple, '#523976');
    drawPixelRect(target.x - 8, target.y - target.radius, 16, 9, COLORS.green, null);
  } else if (target.type === 'cabbage') {
    drawPixelRect(target.x - target.radius, target.y - target.radius, target.radius * 2, target.radius * 2, '#8ed16f', '#4d963d');
    drawPixelRect(target.x - target.radius * 0.45, target.y - target.radius * 0.45, target.radius * 0.9, target.radius * 0.9, '#b9e68c', null);
  } else if (target.type === 'corn') {
    drawPixelRect(target.x - target.radius * 0.45, target.y - target.radius, target.radius * 0.9, target.radius * 2, COLORS.yellow, '#ad8d31');
    drawPixelRect(target.x - target.radius * 0.8, target.y + target.radius * 0.2, target.radius * 1.6, 10, COLORS.green, null);
  } else if (target.type === 'pepper') {
    drawPixelRect(target.x - target.radius * 0.45, target.y - target.radius, target.radius * 0.9, target.radius * 2, COLORS.red, '#963b3b');
    drawPixelRect(target.x - 5, target.y - target.radius - 8, 10, 10, COLORS.green, null);
  } else if (target.type === 'radish') {
    drawPixelRect(target.x - target.radius * 0.65, target.y - target.radius * 0.4, target.radius * 1.3, target.radius * 1.2, COLORS.white, '#b5aaa0');
    drawPixelRect(target.x - 8, target.y - target.radius, 16, 14, COLORS.green, null);
  } else {
    drawPixelRect(target.x - target.radius, target.y - target.radius, target.radius * 2, target.radius * 2, COLORS.red, '#963b3b');
  }
}

function drawRing(ring) {
  const size = ring.radius * 2;
  drawPixelRect(ring.x - ring.radius, ring.y - ring.radius, size, 8, ring.hit ? COLORS.green : COLORS.red, null);
  drawPixelRect(ring.x - ring.radius, ring.y + ring.radius - 8, size, 8, ring.hit ? COLORS.green : COLORS.red, null);
  drawPixelRect(ring.x - ring.radius, ring.y - ring.radius, 8, size, ring.hit ? COLORS.green : COLORS.red, null);
  drawPixelRect(ring.x + ring.radius - 8, ring.y - ring.radius, 8, size, ring.hit ? COLORS.green : COLORS.red, null);
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

  const meterW = 120;
  const fill = Math.min(1, game.swipeDistance / core.WORLD.maxSwipe);
  drawPixelRect(game.aimStart.x - meterW / 2, game.aimStart.y + 26, meterW, 14, COLORS.ink, null);
  drawPixelRect(game.aimStart.x - meterW / 2 + 3, game.aimStart.y + 29, (meterW - 6) * fill, 8, COLORS.yellow, null);

  if (level.showDistance) {
    drawText(`${TEXT.distance}: ${game.swipeDistance}px`, game.aimStart.x, game.aimStart.y + 56, 13, COLORS.ink, 'center');
  } else {
    drawText(TEXT.hiddenDistance, game.aimStart.x, game.aimStart.y + 56, 13, COLORS.ink, 'center');
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
  drawPixelRect(12, 14, state.width - 24, 76, COLORS.panel, COLORS.panelDark);
  drawText(text(level.titleKey), 26, 36, 17, COLORS.ink, 'left');
  drawText(`${TEXT.rings}: ${game.ringsLeft}/${game.ringsTotal}`, 26, 64, 14, COLORS.inkSoft, 'left');
  drawText(`${TEXT.score}: ${game.score}`, state.width - 108, 64, 14, COLORS.inkSoft, 'left');
  drawButton('back:map', TEXT.back, state.width - 86, 22, 62, 34, true);

  drawPixelRect(18, state.height - 48, state.width - 36, 34, COLORS.panel, COLORS.panelDark);
  drawText(text(game.messageKey), state.width / 2, state.height - 31, 14, COLORS.ink, 'center');
}

function drawResult(game) {
  drawPixelRect(34, state.height * 0.3, state.width - 68, 208, COLORS.panelDark, null);
  drawPixelRect(42, state.height * 0.3 + 8, state.width - 84, 192, COLORS.panel, null);
  drawText(TEXT.result, state.width / 2, state.height * 0.3 + 46, 24, COLORS.ink, 'center');
  drawText(`${TEXT.score}: ${game.score}`, state.width / 2, state.height * 0.3 + 88, 19, COLORS.ink, 'center');
  drawButton('restart', TEXT.restart, 66, state.height * 0.3 + 130, 108, 48, true);
  drawButton('back:map', TEXT.back, state.width - 174, state.height * 0.3 + 130, 108, 48, true);
}

function drawToast(message) {
  drawPixelRect(70, state.height - 96, state.width - 140, 42, COLORS.ink, null);
  drawText(message, state.width / 2, state.height - 75, 15, COLORS.white, 'center');
}

function handleButton(id) {
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
}

function loop() {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  state = core.step(state, dt);
  render();
  requestAnimationFrame(loop);
}

wx.onTouchStart((event) => {
  const point = getTouchPoint(event);
  if (!point) {
    return;
  }

  if (state.scene === 'ringGame' && state.ringGame && state.ringGame.status === 'ready' && !findButton(point)) {
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
  const point = getTouchPoint(event);

  if (state.scene === 'ringGame' && state.ringGame && state.ringGame.status === 'aiming') {
    state = core.releaseAim(state);
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
    state = core.continueAfterThrow(state);
  }
});

if (wx.onWindowResize) {
  wx.onWindowResize(syncCanvasSize);
}

syncCanvasSize();
loop();
