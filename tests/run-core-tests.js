const assert = require('assert');
const core = require('../src/gameCore');

function tickUntilLoaded(state) {
  let next = state;
  for (let i = 0; i < 120 && next.scene === 'loading'; i += 1) {
    next = core.step(next, 1 / 60);
  }
  return next;
}

function enterLevel(levelId) {
  let state = core.createInitialState(375, 667);
  state = tickUntilLoaded(state);
  state = core.selectMode(state, 'ring');
  state = core.selectLevel(state, levelId);
  return state;
}

function throwRing(state, endOffset) {
  const ring = state.ringGame.ring;
  state = core.startAim(state, { x: ring.x, y: ring.y });
  state = core.updateAim(state, {
    x: ring.x + (endOffset.x || 0),
    y: ring.y - (endOffset.up || 0)
  });
  return core.releaseAim(state);
}

function runSceneFlow() {
  let state = core.createInitialState(375, 667);
  assert.strictEqual(state.scene, 'loading');

  state = tickUntilLoaded(state);
  assert.strictEqual(state.scene, 'menu');

  state = core.selectMode(state, 'archery');
  assert.strictEqual(state.scene, 'menu');
  assert.strictEqual(state.toastKey, 'comingSoon');

  state = core.selectMode(state, 'ring');
  assert.strictEqual(state.scene, 'ringMap');

  state = core.selectLevel(state, 1);
  assert.strictEqual(state.scene, 'ringGame');
  assert.strictEqual(state.ringGame.ringsLeft, 5);
}

function runLevelRules() {
  const level1 = core.getLevel(1);
  const level2 = core.getLevel(2);

  assert.strictEqual(level1.showDistance, true);
  assert.strictEqual(level2.showDistance, false);
  assert(level2.targetScale < level1.targetScale, 'second level should have smaller targets');
}

function runThrowConsumesOneRing() {
  let state = enterLevel(1);
  state = throwRing(state, { x: 0, up: 120 });

  assert.strictEqual(state.ringGame.status, 'flying');
  assert.strictEqual(state.ringGame.ringsLeft, 4);
  assert(state.ringGame.ring.vy < 0, 'up swipe should launch ring upward');
}

function runShortSwipeDoesNotConsume() {
  let state = enterLevel(1);
  state = throwRing(state, { x: 0, up: 12 });

  assert.strictEqual(state.ringGame.status, 'ready');
  assert.strictEqual(state.ringGame.ringsLeft, 5);
  assert.strictEqual(state.ringGame.messageKey, 'swipeMore');
}

function runHitDetection() {
  let state = enterLevel(1);
  const target = state.ringGame.targets[0];
  state = Object.assign({}, state, {
    ringGame: Object.assign({}, state.ringGame, {
      status: 'flying',
      ringsLeft: 4,
      ring: Object.assign({}, state.ringGame.ring, {
        x: target.x,
        y: target.y - 2,
        vx: 0,
        vy: 80,
        flying: true
      })
    })
  });

  state = core.step(state, 1 / 60);

  assert.strictEqual(state.ringGame.status, 'hit');
  assert.strictEqual(state.ringGame.score, target.score);
  assert.strictEqual(state.ringGame.targets[0].hit, true);
  assert(state.ringGame.effects.length > 0, 'hit should create effects');
}

function runVegetableBounceIsStrongerThanGround() {
  let state = enterLevel(1);
  const target = state.ringGame.targets[0];
  const vegetableState = Object.assign({}, state, {
    ringGame: Object.assign({}, state.ringGame, {
      status: 'flying',
      ring: Object.assign({}, state.ringGame.ring, {
        x: target.x + target.radius + 16,
        y: target.y,
        vx: -40,
        vy: 500,
        flying: true
      })
    })
  });

  const afterVegetable = core.step(vegetableState, 1 / 60);
  assert(afterVegetable.ringGame.ring.vy < -250, 'vegetable collision should bounce strongly');

  const groundY = core.getGroundY(state.height);
  const groundState = Object.assign({}, state, {
    ringGame: Object.assign({}, state.ringGame, {
      status: 'flying',
      ring: Object.assign({}, state.ringGame.ring, {
        x: 40,
        y: groundY + 5,
        vx: 0,
        vy: 500,
        flying: true
      })
    })
  });

  const afterGround = core.step(groundState, 1 / 60);
  assert(Math.abs(afterGround.ringGame.ring.vy) < Math.abs(afterVegetable.ringGame.ring.vy));
}

function runFiveRingsFinish() {
  let state = enterLevel(1);

  for (let i = 0; i < 5; i += 1) {
    state = throwRing(state, { x: 0, up: 80 });
    state = Object.assign({}, state, {
      ringGame: Object.assign({}, state.ringGame, {
        status: 'miss',
        messageKey: 'miss',
        ring: Object.assign({}, state.ringGame.ring, { flying: false })
      })
    });
    state = core.continueAfterThrow(state);
  }

  assert.strictEqual(state.ringGame.ringsLeft, 0);
  assert.strictEqual(state.ringGame.status, 'finished');
}

runSceneFlow();
runLevelRules();
runThrowConsumesOneRing();
runShortSwipeDoesNotConsume();
runHitDetection();
runVegetableBounceIsStrongerThanGround();
runFiveRingsFinish();

console.log('core tests passed');
