import test from 'node:test';
import assert from 'node:assert/strict';
import {
  abilitiesForStage, addNourishment, burstEnemies, canBeginCocoon, clampPosition, cocoonDrain, comboAlive, comboMultiplier,
  enemySpeedFactor, finalScore, growthStage, movePlayer, predatorMinStage, registerPollen, starRating, takeHit, FOOD_ENERGY, STAGE_STEPS,
} from '../logic.mjs';

test('world edges and normalized movement stay inside the 300x300 garden', () => {
  assert.deepEqual(clampPosition(900, -900), { x: 144, z: -144 });
  const moved = movePlayer({ x: 0, z: 0 }, { x: 1, z: 1 }, 1);
  assert.ok(Math.abs(moved.x - moved.z) < 1e-9);
  assert.ok(Math.abs(moved.x - 13 * 0.11 / Math.sqrt(2)) < 1e-9);
});

test('growth stages follow the chapter thresholds and cap at the cocoon goal', () => {
  assert.equal(growthStage(STAGE_STEPS[0] - 1), 0);
  assert.equal(growthStage(STAGE_STEPS[0]), 1);
  assert.equal(growthStage(STAGE_STEPS[1]), 2);
  let state = { energy: 30, foodEaten: 0 };
  state = addNourishment(state, FOOD_ENERGY.nectar + 0);
  assert.equal(state.energy, 33.4);
  assert.equal(state.stage, 1);
  state = addNourishment(state, 500);
  assert.equal(state.energy, 100);
  assert.equal(state.stage, 3);
  assert.equal(canBeginCocoon(state), true);
  assert.equal(canBeginCocoon({ ...state, cocooning: true }), false);
});

test('roughly forty snacks fill the growth bar (pacing for a multi-minute larva phase)', () => {
  // same distribution the game uses: every 20th is golden, every 7th nectar, the rest leaves
  let total = 0; const n = 140;
  for (let i = 0; i < n; i++) total += FOOD_ENERGY[i % 20 === 7 ? 'golden' : i % 7 === 4 ? 'nectar' : 'leaf'];
  const snacks = 100 / (total / n);
  assert.ok(snacks > 30 && snacks < 50, `snacks needed: ${snacks}`);
});

test('predator hit grants brief invulnerability, and a shield blocks hits without leaking', () => {
  const first = takeHit({ health: 3, invulnerable: 0 });
  assert.equal(first.health, 2);
  assert.equal(first.hit, true);
  const protectedState = takeHit(first);
  assert.equal(protectedState.health, 2);
  assert.equal(protectedState.hit, false);
  const shielded = takeHit({ health: 3, invulnerable: 0, shielded: true });
  assert.equal(shielded.hit, false);
  const afterShield = takeHit({ ...shielded, shielded: false });
  assert.equal(afterShield.hit, true);
});

test('fuzzy burst stuns and knocks away nearby predators only, with configurable reach', () => {
  const enemies = burstEnemies({ x: 0, z: 0 }, [{ x: 3, z: 4, stun: 0 }, { x: 40, z: 0 }]);
  assert.ok(enemies[0].x > 3);
  assert.ok(enemies[0].stun > 2);
  assert.equal(enemies[1].x, 40);
  const wide = burstEnemies({ x: 0, z: 0 }, [{ x: 22, z: 0 }], 24, 18, 3);
  assert.equal(wide[0].knocked, true);
  assert.equal(wide[0].stun, 3);
});

test('molt abilities improve every chapter and predators ramp up', () => {
  assert.ok(abilitiesForStage(1).burstRadius > abilitiesForStage(0).burstRadius);
  assert.ok(abilitiesForStage(1).burstCooldown < abilitiesForStage(0).burstCooldown);
  assert.ok(abilitiesForStage(2).speed > abilitiesForStage(1).speed);
  assert.ok(abilitiesForStage(2).magnet > abilitiesForStage(1).magnet);
  assert.ok(enemySpeedFactor(2) > enemySpeedFactor(1) && enemySpeedFactor(1) > enemySpeedFactor(0));
  assert.equal(predatorMinStage('beetle', 0), 0);
  assert.equal(predatorMinStage('spider', 0), 1);
  assert.equal(predatorMinStage('spider', 2), 2);
});

test('cocoon drain ignores stunned predators', () => {
  assert.equal(cocoonDrain('beetle', true), 0);
  assert.ok(cocoonDrain('spider', false) > cocoonDrain('beetle', false));
});

test('pollen combos multiply score, expire, and track the best streak', () => {
  assert.equal(comboMultiplier(1), 1);
  assert.equal(comboMultiplier(3), 2);
  assert.equal(comboMultiplier(99), 5);
  let s = { combo: 0, score: 0, maxCombo: 0, lastPollenAt: null };
  s = registerPollen(s, 10, 0);
  assert.equal(s.gained, 10);
  s = registerPollen(s, 10, 1);
  s = registerPollen(s, 10, 2);
  assert.equal(s.combo, 3);
  assert.equal(s.gained, 20);
  assert.equal(comboAlive(s, 2.5), true);
  assert.equal(comboAlive(s, 10), false);
  s = registerPollen(s, 10, 10);
  assert.equal(s.combo, 1);
  assert.equal(s.maxCombo, 3);
});

test('final score and stars', () => {
  assert.equal(finalScore({ pollen: 1000, health: 3, integrity: 50 }), 1255);
  assert.equal(starRating(100), 0);
  assert.equal(starRating(800), 1);
  assert.equal(starRating(1800), 2);
  assert.equal(starRating(3000), 3);
  assert.equal(starRating(799), 0);
});
