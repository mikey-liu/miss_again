const WORLD = {
  gravity: 1550,
  airDrag: 0.992,
  wallBounce: 0.38,
  groundBounce: 0.18,
  potRadius: 28,
  minSwipe: 32,
  maxSwipe: 230,
  settleSpeed: 95,
  groundPadding: 84,
  comboWindow: 2.3,
  energyMax: 100
};

const GOOSE_TYPES = {
  white: { nameKey: 'gooseWhite', score: 10, coins: 10, radius: 30, hp: 1, speed: 32, sprite: 'gooseWhite' },
  flower: { nameKey: 'gooseFlower', score: 20, coins: 18, radius: 29, hp: 1, speed: 42, sprite: 'gooseFlower' },
  runner: { nameKey: 'gooseRunner', score: 35, coins: 28, radius: 27, hp: 1, speed: 72, sprite: 'gooseRunner' },
  fat: { nameKey: 'gooseFat', score: 55, coins: 45, radius: 38, hp: 2, speed: 24, sprite: 'gooseFat' },
  gold: { nameKey: 'gooseGold', score: 120, coins: 160, radius: 28, hp: 1, speed: 88, sprite: 'gooseGold' },
  boss: { nameKey: 'gooseBoss', score: 260, coins: 260, radius: 48, hp: 5, speed: 44, sprite: 'gooseBoss' }
};

const LEVELS = [
  { id: 1, titleKey: 'level1Title', subtitleKey: 'level1Subtitle', map: 'farm', target: 3, pots: 8, time: 75, geese: ['white', 'white', 'white', 'flower'], unlocked: true },
  { id: 2, titleKey: 'level2Title', subtitleKey: 'level2Subtitle', map: 'farm', target: 4, pots: 8, time: 70, geese: ['white', 'flower', 'flower', 'runner'], unlocked: true },
  { id: 3, titleKey: 'level3Title', subtitleKey: 'level3Subtitle', map: 'wetland', target: 5, pots: 9, time: 72, geese: ['flower', 'runner', 'white', 'fat', 'flower'], unlocked: true },
  { id: 4, titleKey: 'level4Title', subtitleKey: 'level4Subtitle', map: 'wetland', target: 5, pots: 9, time: 66, geese: ['runner', 'runner', 'flower', 'fat', 'gold'], unlocked: true },
  { id: 5, titleKey: 'level5Title', subtitleKey: 'level5Subtitle', map: 'farm', target: 1, pots: 10, time: 90, boss: true, geese: ['boss', 'white', 'flower', 'runner'], unlocked: true },
  { id: 6, titleKey: 'level6Title', subtitleKey: 'level6Subtitle', map: 'snow', target: 6, pots: 10, time: 68, geese: ['runner', 'fat', 'flower', 'gold', 'runner', 'white'], unlocked: true }
];

const GAME_MODES = [
  { id: 'play', titleKey: 'playMode', available: true },
  { id: 'upgrade', titleKey: 'upgradeMode', available: true },
  { id: 'restaurant', titleKey: 'restaurantMode', available: true }
];

const BASE_PLAYER = {
  coins: 0,
  totalGeese: 0,
  bestCombo: 0,
  maxUnlockedLevel: 1,
  potLevel: 1,
  restaurantLevel: 1,
  dishLevel: 1
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getGroundY(height) {
  return height - WORLD.groundPadding - WORLD.potRadius;
}

function getLevel(levelId) {
  return LEVELS.find((level) => level.id === levelId) || LEVELS[0];
}

function getPotStats(player) {
  const level = player.potLevel || 1;
  return {
    captureBonus: Math.min(22, (level - 1) * 3),
    powerBonus: Math.min(0.28, (level - 1) * 0.035),
    energyGain: 26 + (level - 1) * 2
  };
}

function upgradeCost(player, kind) {
  if (kind === 'pot') {
    return 120 + player.potLevel * player.potLevel * 55;
  }
  if (kind === 'restaurant') {
    return 160 + player.restaurantLevel * player.restaurantLevel * 70;
  }
  return 110 + player.dishLevel * player.dishLevel * 50;
}

function createRestingPot(width, height) {
  return {
    x: width * 0.5,
    y: getGroundY(height),
    vx: 0,
    vy: 0,
    radius: WORLD.potRadius,
    flying: false,
    hit: false,
    groundBounces: 0
  };
}

function buildGoose(type, index, width, height, level) {
  const def = GOOSE_TYPES[type] || GOOSE_TYPES.white;
  const laneTop = Math.max(180, height * 0.25);
  const laneBottom = Math.max(laneTop + 120, height - 250);
  const laneRange = laneBottom - laneTop;
  const direction = index % 2 === 0 ? 1 : -1;
  const baseX = 62 + ((index * 91 + level.id * 37) % Math.max(160, width - 124));
  const y = laneTop + ((index * 97 + level.id * 43) % laneRange);
  const speedScale = 1 + level.id * 0.045;
  return {
    id: `${type}-${index}`,
    type,
    sprite: def.sprite,
    x: baseX,
    y,
    baseY: y,
    vx: direction * def.speed * speedScale,
    radius: def.radius,
    hp: def.hp,
    maxHp: def.hp,
    score: def.score,
    coins: def.coins,
    caught: false,
    escaped: false,
    panic: false,
    phase: index * 1.7 + level.id,
    wobble: type === 'flower' ? 34 : type === 'runner' ? 16 : type === 'gold' ? 26 : 10
  };
}

function buildGeese(level, width, height) {
  return level.geese.map((type, index) => buildGoose(type, index, width, height, level));
}

function createGame(levelId, width, height, player) {
  const level = getLevel(levelId);
  return {
    levelId: level.id,
    map: level.map,
    status: 'ready',
    messageKey: 'swipeToThrow',
    potsTotal: level.pots,
    potsLeft: level.pots,
    timeLeft: level.time,
    target: level.target,
    caught: 0,
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    comboTimer: 0,
    energy: 0,
    skillActive: false,
    skillTimer: 0,
    aimStart: null,
    aimCurrent: null,
    swipeDistance: 0,
    pot: createRestingPot(width, height),
    geese: buildGeese(level, width, height),
    effects: [],
    result: null,
    elapsed: 0,
    playerSnapshot: Object.assign({}, player)
  };
}

function createInitialState(width, height) {
  const w = Math.max(320, width || 375);
  const h = Math.max(480, height || 667);
  return {
    width: w,
    height: h,
    scene: 'loading',
    loadingProgress: 0,
    toastKey: null,
    player: Object.assign({}, BASE_PLAYER),
    modes: GAME_MODES,
    levels: LEVELS,
    game: null
  };
}

function resizeState(state, width, height) {
  const next = Object.assign({}, state, {
    width: Math.max(320, width || state.width),
    height: Math.max(480, height || state.height)
  });

  if (state.game) {
    const oldW = state.width || next.width;
    const oldH = state.height || next.height;
    const game = Object.assign({}, state.game);
    game.geese = game.geese.map((goose) => Object.assign({}, goose, {
      x: goose.x / oldW * next.width,
      y: goose.y / oldH * next.height,
      baseY: goose.baseY / oldH * next.height
    }));
    if (!game.pot.flying && game.status !== 'aiming') {
      game.pot = createRestingPot(next.width, next.height);
    }
    next.game = game;
  }

  return next;
}

function goToMenu(state) {
  return Object.assign({}, state, { scene: 'menu', toastKey: null, game: null });
}

function selectMode(state, modeId) {
  const mode = GAME_MODES.find((item) => item.id === modeId);
  if (!mode || !mode.available) {
    return Object.assign({}, state, { toastKey: 'comingSoon' });
  }
  if (mode.id === 'play') {
    return Object.assign({}, state, { scene: 'levelMap', toastKey: null });
  }
  return Object.assign({}, state, { scene: mode.id, toastKey: null, game: null });
}

function selectLevel(state, levelId) {
  const level = getLevel(levelId);
  if (level.id > state.player.maxUnlockedLevel) {
    return Object.assign({}, state, { toastKey: 'locked' });
  }
  return Object.assign({}, state, {
    scene: 'game',
    toastKey: null,
    game: createGame(level.id, state.width, state.height, state.player)
  });
}

function backToMap(state) {
  return Object.assign({}, state, { scene: 'levelMap', toastKey: null, game: null });
}

function restartLevel(state) {
  const levelId = state.game ? state.game.levelId : 1;
  return Object.assign({}, state, {
    scene: 'game',
    toastKey: null,
    game: createGame(levelId, state.width, state.height, state.player)
  });
}

function startAim(state, point) {
  const game = state.game;
  if (state.scene !== 'game' || !game || game.status !== 'ready') {
    return state;
  }
  return Object.assign({}, state, {
    game: Object.assign({}, game, {
      status: 'aiming',
      messageKey: 'releaseToThrow',
      aimStart: point,
      aimCurrent: point,
      swipeDistance: 0
    })
  });
}

function updateAim(state, point) {
  const game = state.game;
  if (!game || game.status !== 'aiming' || !game.aimStart) {
    return state;
  }
  const distance = Math.max(0, game.aimStart.y - point.y);
  return Object.assign({}, state, {
    game: Object.assign({}, game, {
      aimCurrent: point,
      swipeDistance: Math.round(distance)
    })
  });
}

function releaseAim(state) {
  const game = state.game;
  if (!game || game.status !== 'aiming' || !game.aimStart || !game.aimCurrent) {
    return state;
  }

  const dx = game.aimCurrent.x - game.aimStart.x;
  const dy = game.aimStart.y - game.aimCurrent.y;
  const swipe = clamp(dy, 0, WORLD.maxSwipe);

  if (swipe < WORLD.minSwipe) {
    return Object.assign({}, state, {
      game: Object.assign({}, game, {
        status: 'ready',
        messageKey: 'swipeMore',
        aimStart: null,
        aimCurrent: null,
        swipeDistance: 0
      })
    });
  }

  const stats = getPotStats(state.player);
  const power = 1 + stats.powerBonus;
  return Object.assign({}, state, {
    game: Object.assign({}, game, {
      potsLeft: Math.max(0, game.potsLeft - 1),
      status: 'flying',
      messageKey: 'flying',
      aimStart: null,
      aimCurrent: null,
      swipeDistance: Math.round(swipe),
      pot: Object.assign({}, game.pot, {
        vx: clamp(dx, -150, 150) * 4.2 * power,
        vy: (-swipe * 5.3 - 110) * power,
        flying: true,
        hit: false,
        groundBounces: 0,
        radius: WORLD.potRadius + stats.captureBonus * 0.2
      })
    })
  });
}

function useSkill(state) {
  const game = state.game;
  if (!game || game.energy < WORLD.energyMax || game.status === 'finished') {
    return state;
  }
  return Object.assign({}, state, {
    game: Object.assign({}, game, {
      energy: 0,
      skillActive: true,
      skillTimer: 6,
      messageKey: 'skillOn',
      effects: game.effects.concat(createBurstEffects(game.pot.x, game.pot.y, 'skill'))
    })
  });
}

function continueAfterThrow(state) {
  const game = state.game;
  if (!game || (game.status !== 'hit' && game.status !== 'miss')) {
    return state;
  }
  if (isLevelEnded(game)) {
    return finishGame(state, hasWon(game));
  }
  return Object.assign({}, state, {
    game: Object.assign({}, game, {
      status: 'ready',
      messageKey: game.combo > 1 ? 'comboKeep' : 'swipeToThrow',
      aimStart: null,
      aimCurrent: null,
      swipeDistance: 0,
      pot: createRestingPot(state.width, state.height)
    })
  });
}

function isLevelEnded(game) {
  const level = getLevel(game.levelId);
  const bossCaught = !level.boss || game.geese.some((goose) => goose.type === 'boss' && goose.caught);
  return (game.caught >= game.target && bossCaught) || game.potsLeft <= 0 || game.timeLeft <= 0 || game.geese.every((goose) => goose.caught || goose.escaped);
}

function hasWon(game) {
  const level = getLevel(game.levelId);
  if (level.boss) {
    return game.geese.some((goose) => goose.type === 'boss' && goose.caught);
  }
  return game.caught >= game.target;
}

function finishGame(state, won) {
  const game = state.game;
  if (!game || game.status === 'finished') {
    return state;
  }
  const winBonus = won ? 80 + game.levelId * 25 : 0;
  const restaurantBonus = Math.floor((state.player.restaurantLevel || 1) * (state.player.dishLevel || 1) * 12);
  const earnedCoins = game.coins + winBonus + restaurantBonus;
  const nextUnlocked = won ? Math.min(LEVELS.length, Math.max(state.player.maxUnlockedLevel, game.levelId + 1)) : state.player.maxUnlockedLevel;
  const player = Object.assign({}, state.player, {
    coins: state.player.coins + earnedCoins,
    totalGeese: state.player.totalGeese + game.caught,
    bestCombo: Math.max(state.player.bestCombo, game.bestCombo),
    maxUnlockedLevel: nextUnlocked
  });
  return Object.assign({}, state, {
    player,
    game: Object.assign({}, game, {
      status: 'finished',
      messageKey: won ? 'levelWin' : 'levelLose',
      result: {
        won,
        earnedCoins,
        winBonus,
        restaurantBonus,
        ratingKey: getRating(game)
      }
    })
  });
}

function upgrade(state, kind) {
  const cost = upgradeCost(state.player, kind);
  if (state.player.coins < cost) {
    return Object.assign({}, state, { toastKey: 'notEnoughCoins' });
  }
  const player = Object.assign({}, state.player, { coins: state.player.coins - cost });
  if (kind === 'pot') {
    player.potLevel += 1;
  } else if (kind === 'restaurant') {
    player.restaurantLevel += 1;
  } else {
    player.dishLevel += 1;
  }
  return Object.assign({}, state, { player, toastKey: 'upgradeDone' });
}

function claimOffline(state) {
  const income = Math.floor((state.player.restaurantLevel * 35 + state.player.dishLevel * 28) * 1.2);
  return Object.assign({}, state, {
    player: Object.assign({}, state.player, { coins: state.player.coins + income }),
    toastKey: 'incomeClaimed'
  });
}

function step(state, dt) {
  const safeDt = clamp(dt || 0, 0, 0.05);
  if (state.scene === 'loading') {
    const loadingProgress = clamp(state.loadingProgress + safeDt * 1.45, 0, 1);
    return Object.assign({}, state, {
      loadingProgress,
      scene: loadingProgress >= 1 ? 'menu' : 'loading'
    });
  }
  if (state.scene !== 'game' || !state.game || state.game.status === 'finished') {
    return state;
  }
  let game = stepGame(state.game, state.width, state.height, safeDt, state.player);
  let next = Object.assign({}, state, { game });
  if (isLevelEnded(game) && game.status !== 'hit' && game.status !== 'miss') {
    next = finishGame(next, hasWon(game));
  }
  return next;
}

function stepGame(game, width, height, dt, player) {
  let effects = game.effects
    .map((effect) => Object.assign({}, effect, { age: effect.age + dt }))
    .filter((effect) => effect.age < effect.life);

  let geese = stepGeese(game.geese, width, height, dt, game.levelId, game.elapsed);
  let comboTimer = Math.max(0, game.comboTimer - dt);
  let combo = comboTimer <= 0 ? 0 : game.combo;
  let skillTimer = Math.max(0, game.skillTimer - dt);
  let skillActive = skillTimer > 0;
  let next = Object.assign({}, game, {
    effects,
    geese,
    combo,
    comboTimer,
    skillTimer,
    skillActive,
    timeLeft: Math.max(0, game.timeLeft - dt),
    elapsed: game.elapsed + dt
  });

  if (next.status !== 'flying') {
    return next;
  }

  let pot = Object.assign({}, next.pot);
  pot.vy += WORLD.gravity * dt;
  pot.vx *= WORLD.airDrag;
  pot.x += pot.vx * dt;
  pot.y += pot.vy * dt;

  if (pot.x < pot.radius) {
    pot.x = pot.radius;
    pot.vx = Math.abs(pot.vx) * WORLD.wallBounce;
    effects = effects.concat(createBurstEffects(pot.x, pot.y, 'bounce'));
  } else if (pot.x > width - pot.radius) {
    pot.x = width - pot.radius;
    pot.vx = -Math.abs(pot.vx) * WORLD.wallBounce;
    effects = effects.concat(createBurstEffects(pot.x, pot.y, 'bounce'));
  }

  const collision = findGooseCollision(pot, geese, player, skillActive);
  if (collision && pot.vy > -80) {
    const hitResult = applyHit(next, geese, collision, pot, player);
    return hitResult;
  }

  const groundY = getGroundY(height);
  if (pot.y > groundY) {
    const impact = Math.abs(pot.vy);
    pot.y = groundY;
    pot.vy = -Math.abs(pot.vy) * WORLD.groundBounce;
    pot.vx *= 0.7;
    pot.groundBounces += 1;
    if (impact > WORLD.settleSpeed) {
      effects = effects.concat(createBurstEffects(pot.x, pot.y, 'ground'));
    }
  }

  const speed = Math.hypot(pot.vx, pot.vy);
  if (pot.y >= groundY - 0.1 && speed < WORLD.settleSpeed) {
    return Object.assign({}, next, {
      status: isLevelEnded(next) ? 'finished' : 'miss',
      messageKey: isLevelEnded(next) ? 'levelLose' : randomMissKey(pot, width),
      effects,
      pot: Object.assign({}, pot, { flying: false }),
      combo: 0,
      comboTimer: 0
    });
  }

  return Object.assign({}, next, { effects, geese, pot });
}

function stepGeese(geese, width, height, dt, levelId, elapsed) {
  return geese.map((goose) => {
    if (goose.caught || goose.escaped) {
      return goose;
    }
    let x = goose.x + goose.vx * dt;
    const offscreen = goose.vx > 0 ? x > width + 96 : x < -96;
    let vx = goose.vx;
    let escaped = false;
    if (offscreen) {
      if (goose.type === 'gold') {
        escaped = true;
      } else {
        x = goose.vx > 0 ? -80 : width + 80;
        vx *= levelId >= 4 ? 1.015 : 1;
      }
    }
    const y = goose.baseY + Math.sin(elapsed * 2.5 + goose.phase + x * 0.015) * goose.wobble;
    return Object.assign({}, goose, { x, y: clamp(y, 160, height - 185), vx, escaped });
  });
}

function findGooseCollision(pot, geese, player, skillActive) {
  const stats = getPotStats(player);
  const activeBonus = skillActive ? 24 : 0;
  let best = null;
  let bestDistance = Infinity;
  geese.forEach((goose) => {
    if (goose.caught || goose.escaped) {
      return;
    }
    const distance = Math.hypot(pot.x - goose.x, pot.y - goose.y);
    const capture = pot.radius + goose.radius * 0.7 + stats.captureBonus + activeBonus;
    if (distance <= capture && distance < bestDistance) {
      best = goose;
      bestDistance = distance;
    }
  });
  return best;
}

function applyHit(game, geese, goose, pot, player) {
  const stats = getPotStats(player);
  const nextHp = goose.hp - 1;
  const caught = nextHp <= 0;
  const newCombo = game.combo + 1;
  const comboBonus = Math.max(0, newCombo - 1) * 5;
  const gainScore = caught ? goose.score + comboBonus : Math.floor(goose.score * 0.35);
  const gainCoins = caught ? goose.coins + comboBonus : Math.floor(goose.coins * 0.25);
  const geeseNext = geese.map((item) => (
    item.id === goose.id
      ? Object.assign({}, item, { hp: Math.max(0, nextHp), caught, panic: !caught })
      : item
  ));
  const caughtCount = caught ? game.caught + 1 : game.caught;
  const messageKey = caught
    ? newCombo >= 3 ? 'comboHit' : goose.type === 'boss' ? 'bossHit' : 'hit'
    : 'gooseHurt';

  return Object.assign({}, game, {
    status: 'hit',
    messageKey,
    geese: geeseNext,
    caught: caughtCount,
    score: game.score + gainScore,
    coins: game.coins + gainCoins,
    combo: newCombo,
    bestCombo: Math.max(game.bestCombo, newCombo),
    comboTimer: WORLD.comboWindow,
    energy: clamp(game.energy + stats.energyGain, 0, WORLD.energyMax),
    effects: game.effects.concat(createBurstEffects(goose.x, goose.y, caught ? 'hit' : 'hurt')),
    pot: Object.assign({}, pot, {
      x: goose.x,
      y: goose.y,
      vx: 0,
      vy: 0,
      flying: false,
      hit: true
    })
  });
}

function randomMissKey(pot, width) {
  if (pot.x < width * 0.18 || pot.x > width * 0.82) {
    return 'missFar';
  }
  return 'miss';
}

function createBurstEffects(x, y, kind) {
  const effects = [];
  const count = kind === 'hit' || kind === 'skill' ? 18 : 8;
  const life = kind === 'hit' || kind === 'skill' ? 0.66 : 0.36;
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 38 + (i % 5) * 18;
    effects.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (kind === 'hit' ? 20 : 0),
      age: 0,
      life,
      kind,
      colorIndex: i % 5
    });
  }
  return effects;
}

function getRating(game) {
  if (!game.result && !hasWon(game)) {
    return 'ratingLose';
  }
  if (game.bestCombo >= 5 || game.score >= 520) {
    return 'rating3';
  }
  if (game.bestCombo >= 3 || game.score >= 260) {
    return 'rating2';
  }
  return 'rating1';
}

module.exports = {
  WORLD,
  LEVELS,
  GAME_MODES,
  GOOSE_TYPES,
  backToMap,
  clamp,
  claimOffline,
  continueAfterThrow,
  createGame,
  createInitialState,
  createRestingPot,
  getGroundY,
  getLevel,
  getPotStats,
  getRating,
  goToMenu,
  releaseAim,
  resizeState,
  restartLevel,
  selectLevel,
  selectMode,
  startAim,
  step,
  updateAim,
  upgrade,
  upgradeCost,
  useSkill
};
