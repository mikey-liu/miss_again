const WORLD = {
  gravity: 1650,
  airDrag: 0.993,
  wallBounce: 0.42,
  firstGroundBounce: 0.26,
  groundBounce: 0.12,
  vegetableBounce: 0.68,
  ringRadius: 25,
  minSwipe: 36,
  maxSwipe: 220,
  settleSpeed: 92,
  groundPadding: 86
};

const LEVELS = [
  {
    id: 1,
    titleKey: 'level1Title',
    subtitleKey: 'level1Subtitle',
    unlocked: true,
    showDistance: true,
    targetScale: 1,
    targets: [
      { id: 'pumpkin', type: 'pumpkin', x: 0.5, y: 0.48, radius: 34, score: 2 },
      { id: 'tomato', type: 'tomato', x: 0.28, y: 0.58, radius: 27, score: 1 },
      { id: 'eggplant', type: 'eggplant', x: 0.72, y: 0.6, radius: 29, score: 1 },
      { id: 'cabbage', type: 'cabbage', x: 0.45, y: 0.68, radius: 31, score: 1 }
    ]
  },
  {
    id: 2,
    titleKey: 'level2Title',
    subtitleKey: 'level2Subtitle',
    unlocked: true,
    showDistance: false,
    targetScale: 0.72,
    targets: [
      { id: 'pepper', type: 'pepper', x: 0.24, y: 0.5, radius: 23, score: 2 },
      { id: 'corn', type: 'corn', x: 0.5, y: 0.56, radius: 24, score: 2 },
      { id: 'radish', type: 'radish', x: 0.75, y: 0.62, radius: 22, score: 2 },
      { id: 'mushroom', type: 'mushroom', x: 0.39, y: 0.7, radius: 21, score: 2 }
    ]
  },
  {
    id: 3,
    titleKey: 'level3Title',
    subtitleKey: 'comingSoon',
    unlocked: false,
    showDistance: false,
    targetScale: 0.65,
    targets: []
  }
];

const GAME_MODES = [
  { id: 'ring', titleKey: 'ringMode', available: true },
  { id: 'archery', titleKey: 'archeryMode', available: false },
  { id: 'shooting', titleKey: 'shootingMode', available: false }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getGroundY(height) {
  return height - WORLD.groundPadding - WORLD.ringRadius;
}

function createRestingRing(width, height) {
  return {
    x: width * 0.5,
    y: getGroundY(height),
    vx: 0,
    vy: 0,
    radius: WORLD.ringRadius,
    flying: false,
    hit: false,
    groundBounces: 0,
    collisionCooldown: 0
  };
}

function buildTargets(level, width, height) {
  const groundTop = height - WORLD.groundPadding - 20;

  return level.targets.map((target) => {
    const radius = target.radius * level.targetScale;
    return {
      id: target.id,
      type: target.type,
      x: Math.round(width * target.x),
      y: Math.min(Math.round(height * target.y), groundTop - radius),
      radius,
      score: target.score,
      hit: false
    };
  });
}

function createRingGame(levelId, width, height) {
  const level = getLevel(levelId);

  return {
    levelId: level.id,
    ringsTotal: 5,
    ringsLeft: 5,
    score: 0,
    status: 'ready',
    messageKey: 'swipeToThrow',
    aimStart: null,
    aimCurrent: null,
    swipeDistance: 0,
    targets: buildTargets(level, width, height),
    ring: createRestingRing(width, height),
    effects: []
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
    modes: GAME_MODES,
    levels: LEVELS,
    ringGame: null
  };
}

function resizeState(state, width, height) {
  const next = Object.assign({}, state, {
    width: Math.max(320, width || state.width),
    height: Math.max(480, height || state.height)
  });

  if (state.ringGame) {
    const level = getLevel(state.ringGame.levelId);
    const resizedGame = Object.assign({}, state.ringGame, {
      targets: buildTargets(level, next.width, next.height)
    });

    if (!state.ringGame.ring.flying && state.ringGame.status !== 'aiming') {
      resizedGame.ring = createRestingRing(next.width, next.height);
    }

    next.ringGame = resizedGame;
  }

  return next;
}

function getLevel(levelId) {
  return LEVELS.find((level) => level.id === levelId) || LEVELS[0];
}

function goToMenu(state) {
  return Object.assign({}, state, {
    scene: 'menu',
    toastKey: null
  });
}

function selectMode(state, modeId) {
  const mode = GAME_MODES.find((item) => item.id === modeId);

  if (!mode || !mode.available) {
    return Object.assign({}, state, {
      toastKey: 'comingSoon'
    });
  }

  return Object.assign({}, state, {
    scene: mode.id === 'ring' ? 'ringMap' : state.scene,
    toastKey: null
  });
}

function selectLevel(state, levelId) {
  const level = getLevel(levelId);

  if (!level.unlocked) {
    return Object.assign({}, state, {
      toastKey: 'locked'
    });
  }

  return Object.assign({}, state, {
    scene: 'ringGame',
    toastKey: null,
    ringGame: createRingGame(level.id, state.width, state.height)
  });
}

function backToMap(state) {
  return Object.assign({}, state, {
    scene: 'ringMap',
    toastKey: null,
    ringGame: null
  });
}

function restartLevel(state) {
  const levelId = state.ringGame ? state.ringGame.levelId : 1;

  return Object.assign({}, state, {
    scene: 'ringGame',
    ringGame: createRingGame(levelId, state.width, state.height),
    toastKey: null
  });
}

function startAim(state, point) {
  const game = state.ringGame;

  if (state.scene !== 'ringGame' || !game || game.status !== 'ready') {
    return state;
  }

  return Object.assign({}, state, {
    ringGame: Object.assign({}, game, {
      status: 'aiming',
      messageKey: 'releaseToThrow',
      aimStart: point,
      aimCurrent: point,
      swipeDistance: 0
    })
  });
}

function updateAim(state, point) {
  const game = state.ringGame;

  if (!game || game.status !== 'aiming' || !game.aimStart) {
    return state;
  }

  const distance = Math.max(0, game.aimStart.y - point.y);

  return Object.assign({}, state, {
    ringGame: Object.assign({}, game, {
      aimCurrent: point,
      swipeDistance: Math.round(distance)
    })
  });
}

function releaseAim(state) {
  const game = state.ringGame;

  if (!game || game.status !== 'aiming' || !game.aimStart || !game.aimCurrent) {
    return state;
  }

  const dx = game.aimCurrent.x - game.aimStart.x;
  const dy = game.aimStart.y - game.aimCurrent.y;
  const swipe = clamp(dy, 0, WORLD.maxSwipe);

  if (swipe < WORLD.minSwipe) {
    return Object.assign({}, state, {
      ringGame: Object.assign({}, game, {
        status: 'ready',
        messageKey: 'swipeMore',
        aimStart: null,
        aimCurrent: null,
        swipeDistance: 0
      })
    });
  }

  return Object.assign({}, state, {
    ringGame: Object.assign({}, game, {
      ringsLeft: Math.max(0, game.ringsLeft - 1),
      status: 'flying',
      messageKey: 'flying',
      aimStart: null,
      aimCurrent: null,
      swipeDistance: Math.round(swipe),
      ring: Object.assign({}, game.ring, {
        vx: clamp(dx, -140, 140) * 4.1,
        vy: -swipe * 5.5 - 120,
        flying: true,
        hit: false,
        groundBounces: 0,
        collisionCooldown: 0
      })
    })
  });
}

function continueAfterThrow(state) {
  const game = state.ringGame;

  if (!game || (game.status !== 'hit' && game.status !== 'miss')) {
    return state;
  }

  if (game.ringsLeft <= 0) {
    return Object.assign({}, state, {
      ringGame: Object.assign({}, game, {
        status: 'finished',
        messageKey: 'finished'
      })
    });
  }

  return Object.assign({}, state, {
    ringGame: Object.assign({}, game, {
      status: 'ready',
      messageKey: 'swipeToThrow',
      aimStart: null,
      aimCurrent: null,
      swipeDistance: 0,
      ring: createRestingRing(state.width, state.height)
    })
  });
}

function step(state, dt) {
  const safeDt = clamp(dt || 0, 0, 0.05);

  if (state.scene === 'loading') {
    const loadingProgress = clamp(state.loadingProgress + safeDt * 1.25, 0, 1);
    return Object.assign({}, state, {
      loadingProgress,
      scene: loadingProgress >= 1 ? 'menu' : 'loading'
    });
  }

  if (state.scene !== 'ringGame' || !state.ringGame) {
    return state;
  }

  return Object.assign({}, state, {
    ringGame: stepRingGame(state.ringGame, state.width, state.height, safeDt)
  });
}

function stepRingGame(game, width, height, dt) {
  const effects = game.effects
    .map((effect) => Object.assign({}, effect, { age: effect.age + dt }))
    .filter((effect) => effect.age < effect.life);

  if (game.status !== 'flying') {
    return Object.assign({}, game, { effects });
  }

  let ring = Object.assign({}, game.ring, {
    collisionCooldown: Math.max(0, game.ring.collisionCooldown - dt)
  });

  ring.vy += WORLD.gravity * dt;
  ring.vx *= WORLD.airDrag;
  ring.x += ring.vx * dt;
  ring.y += ring.vy * dt;

  if (ring.x < ring.radius) {
    ring.x = ring.radius;
    ring.vx = Math.abs(ring.vx) * WORLD.wallBounce;
  }

  if (ring.x > width - ring.radius) {
    ring.x = width - ring.radius;
    ring.vx = -Math.abs(ring.vx) * WORLD.wallBounce;
  }

  const collision = findTargetCollision(ring, game.targets);
  if (collision && ring.collisionCooldown <= 0) {
    if (isCatch(ring, collision)) {
      const targets = game.targets.map((target) => (
        target.id === collision.id ? Object.assign({}, target, { hit: true }) : target
      ));

      return Object.assign({}, game, {
        score: game.score + collision.score,
        status: 'hit',
        messageKey: 'hit',
        targets,
        effects: effects.concat(createHitEffects(collision.x, collision.y)),
        ring: Object.assign({}, ring, {
          x: collision.x,
          y: collision.y,
          vx: 0,
          vy: 0,
          flying: false,
          hit: true
        })
      });
    }

    ring.vy = -Math.abs(ring.vy) * WORLD.vegetableBounce;
    ring.vx += (ring.x - collision.x) * 4.6;
    ring.y = Math.min(ring.y, collision.y - collision.radius - ring.radius * 0.35);
    ring.collisionCooldown = 0.15;
  }

  const groundY = getGroundY(height);
  if (ring.y > groundY) {
    ring.y = groundY;
    ring.vy = -Math.abs(ring.vy) * (ring.groundBounces === 0 ? WORLD.firstGroundBounce : WORLD.groundBounce);
    ring.vx *= 0.72;
    ring.groundBounces += 1;
  }

  const speed = Math.hypot(ring.vx, ring.vy);
  if (ring.y >= groundY - 0.1 && speed < WORLD.settleSpeed) {
    return Object.assign({}, game, {
      status: game.ringsLeft <= 0 ? 'finished' : 'miss',
      messageKey: game.ringsLeft <= 0 ? 'finished' : 'miss',
      effects,
      ring: Object.assign({}, ring, {
        flying: false
      })
    });
  }

  return Object.assign({}, game, {
    effects,
    ring
  });
}

function findTargetCollision(ring, targets) {
  let best = null;
  let bestDistance = Infinity;

  targets.forEach((target) => {
    if (target.hit) {
      return;
    }

    const distance = Math.hypot(ring.x - target.x, ring.y - target.y);
    if (distance < ring.radius + target.radius && distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  });

  return best;
}

function isCatch(ring, target) {
  const distance = Math.hypot(ring.x - target.x, ring.y - target.y);
  const catchRadius = Math.max(10, target.radius * 0.58);
  return ring.vy > 0 && distance <= catchRadius;
}

function createHitEffects(x, y) {
  const effects = [];

  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12;
    effects.push({
      x,
      y,
      vx: Math.cos(angle) * (34 + (i % 3) * 18),
      vy: Math.sin(angle) * (34 + (i % 2) * 14),
      age: 0,
      life: 0.55,
      colorIndex: i % 4
    });
  }

  return effects;
}

module.exports = {
  WORLD,
  LEVELS,
  GAME_MODES,
  backToMap,
  clamp,
  continueAfterThrow,
  createInitialState,
  createRestingRing,
  createRingGame,
  getGroundY,
  getLevel,
  goToMenu,
  releaseAim,
  resizeState,
  restartLevel,
  selectLevel,
  selectMode,
  startAim,
  step,
  updateAim
};
