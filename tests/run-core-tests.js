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
  state = Object.assign({}, state, {
    player: Object.assign({}, state.player, { maxUnlockedLevel: Math.max(state.player.maxUnlockedLevel, levelId) })
  });
  state = core.selectMode(state, 'play');
  state = core.selectLevel(state, levelId);
  return state;
}

function throwPot(state, offset) {
  const pot = state.game.pot;
  state = core.startAim(state, { x: pot.x, y: pot.y });
  state = core.updateAim(state, {
    x: pot.x + (offset.x || 0),
    y: pot.y - (offset.up || 0)
  });
  return core.releaseAim(state);
}

function runSceneFlow() {
  let state = core.createInitialState(375, 667);
  assert.strictEqual(state.scene, 'loading');

  state = tickUntilLoaded(state);
  assert.strictEqual(state.scene, 'menu');

  state = core.selectMode(state, 'upgrade');
  assert.strictEqual(state.scene, 'upgrade');

  state = core.goToMenu(state);
  state = core.selectMode(state, 'restaurant');
  assert.strictEqual(state.scene, 'restaurant');

  state = core.goToMenu(state);
  state = core.selectMode(state, 'play');
  assert.strictEqual(state.scene, 'levelMap');
}

function runLevelStart() {
  const state = enterLevel(1);
  assert.strictEqual(state.scene, 'game');
  assert.strictEqual(state.game.potsLeft, core.getLevel(1).pots);
  assert(state.game.geese.length > 0);
  assert.strictEqual(state.game.target, 3);
}

function runThrowConsumesOnePot() {
  let state = enterLevel(1);
  state = throwPot(state, { x: 0, up: 130 });

  assert.strictEqual(state.game.status, 'flying');
  assert.strictEqual(state.game.potsLeft, core.getLevel(1).pots - 1);
  assert(state.game.pot.vy < 0, 'up swipe should launch pot upward');
}

function runShortSwipeDoesNotConsume() {
  let state = enterLevel(1);
  state = throwPot(state, { x: 0, up: 10 });

  assert.strictEqual(state.game.status, 'ready');
  assert.strictEqual(state.game.potsLeft, core.getLevel(1).pots);
  assert.strictEqual(state.game.messageKey, 'swipeMore');
}

function runHitDetection() {
  let state = enterLevel(1);
  const goose = state.game.geese[0];
  state = Object.assign({}, state, {
    game: Object.assign({}, state.game, {
      status: 'flying',
      potsLeft: state.game.potsLeft - 1,
      geese: state.game.geese.map((item) => (
        item.id === goose.id ? Object.assign({}, item, { x: 180, baseY: goose.y, vx: 0, wobble: 0 }) : item
      )),
      pot: Object.assign({}, state.game.pot, {
        x: 180,
        y: goose.y - 2,
        vx: 0,
        vy: 120,
        flying: true
      })
    })
  });

  state = core.step(state, 1 / 60);

  assert.strictEqual(state.game.status, 'hit');
  assert.strictEqual(state.game.caught, 1);
  assert(state.game.score > 0);
  assert(state.game.coins > 0);
  assert.strictEqual(state.game.combo, 1);
  assert(state.game.effects.length > 0, 'hit should create effects');
}

function runBossNeedsMultipleHits() {
  let state = enterLevel(5);
  const boss = state.game.geese.find((goose) => goose.type === 'boss');
  assert(boss.maxHp > 1);

  state = Object.assign({}, state, {
    game: Object.assign({}, state.game, {
      status: 'flying',
      geese: state.game.geese.map((item) => (
        item.id === boss.id ? Object.assign({}, item, { x: 190, baseY: boss.y, vx: 0, wobble: 0 }) : item
      )),
      pot: Object.assign({}, state.game.pot, {
        x: 190,
        y: boss.y,
        vx: 0,
        vy: 130,
        flying: true
      })
    })
  });
  state = core.step(state, 1 / 60);

  const damagedBoss = state.game.geese.find((goose) => goose.id === boss.id);
  assert.strictEqual(state.game.status, 'hit');
  assert.strictEqual(damagedBoss.caught, false);
  assert.strictEqual(damagedBoss.hp, boss.hp - 1);
}

function runFinishUnlocksNextLevelAndCoins() {
  let state = enterLevel(1);
  state = Object.assign({}, state, {
    game: Object.assign({}, state.game, {
      caught: state.game.target,
      coins: 50,
      score: 100,
      status: 'ready'
    })
  });

  state = core.step(state, 1 / 60);

  assert.strictEqual(state.game.status, 'finished');
  assert.strictEqual(state.game.result.won, true);
  assert(state.player.coins > 0);
  assert(state.player.maxUnlockedLevel >= 2);
}

function runUpgradeAndIncome() {
  let state = core.createInitialState(375, 667);
  state = Object.assign({}, state, {
    player: Object.assign({}, state.player, { coins: 10000 })
  });

  const potBefore = state.player.potLevel;
  state = core.upgrade(state, 'pot');
  assert.strictEqual(state.player.potLevel, potBefore + 1);
  assert(state.player.coins < 10000);

  const coinsBefore = state.player.coins;
  state = core.claimOffline(state);
  assert(state.player.coins > coinsBefore);
}

function runResizeKeepsGameState() {
  let state = enterLevel(1);
  state = core.resizeState(state, 414, 736);
  assert.strictEqual(state.width, 414);
  assert.strictEqual(state.height, 736);
  assert(state.game.geese.every((goose) => Number.isFinite(goose.x) && Number.isFinite(goose.y)));
}

runSceneFlow();
runLevelStart();
runThrowConsumesOnePot();
runShortSwipeDoesNotConsume();
runHitDetection();
runBossNeedsMultipleHits();
runFinishUnlocksNextLevelAndCoins();
runUpgradeAndIncome();
runResizeKeepsGameState();

console.log('core tests passed');
