import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRAGMENTS, PARTS, SETS, countPlaced, createInitialState, isGameComplete,
  isSetComplete, pickup, placeCarried, restoreState, serializeState,
} from '../logic.mjs';
import { ARM_LENGTHS, SHOULDER, STATUE_POSES, armJoints } from '../poses.mjs';

test('15 fragments cover three five-part statue sets in the 150x150 hall', () => {
  assert.equal(FRAGMENTS.length, 15);
  assert.equal(SETS.length, 3);
  assert.equal(PARTS.length, 5);
  assert.ok(FRAGMENTS.every(({ x, z }) => Math.abs(x) <= 75 && Math.abs(z) <= 75));
});

test('pickup is one-at-a-time and matching parts snap into the right set', () => {
  const start = createInitialState();
  const head = pickup(start, 'office01:head');
  assert.equal(head.carried, 'office01:head');
  assert.equal(pickup(head, 'nurse01:legs'), head);
  assert.equal(placeCarried(head, 'nurse01'), head, 'wrong podium leaves the part in hand');
  const placed = placeCarried(head, 'office01');
  assert.equal(placed.carried, null);
  assert.deepEqual(placed.placed.office01, ['head']);
  assert.equal(isSetComplete(placed, 'office01'), false);
  assert.equal(countPlaced(placed), 1);
});

test('all 15 pieces complete the display, and repeated placements cannot duplicate parts', () => {
  let state = createInitialState();
  for (const fragment of FRAGMENTS) {
    state = pickup(state, fragment.key);
    state = placeCarried(state, fragment.setId);
    assert.equal(pickup(state, fragment.key), state);
  }
  assert.equal(isGameComplete(state), true);
  assert.ok(SETS.every(({ id }) => isSetComplete(state, id)));
  assert.equal(countPlaced(state), 15);
});

test('each statue has a distinct, testable presentation pose and signature gesture', () => {
  assert.deepEqual(Object.keys(STATUE_POSES).sort(), SETS.map(({ id }) => id).sort());
  assert.equal(STATUE_POSES.office01.gesture, 'clipboard');
  assert.equal(STATUE_POSES.nurse01.gesture, 'wave');
  assert.equal(STATUE_POSES.ceo01.gesture, 'presentation');
  const nurseWave = armJoints('nurse01', 1);
  assert.ok(nurseWave.W[1] > nurseWave.E[1] + 0.35, 'nurse forearm rises from a bent elbow into a wave');
  const ceoPresent = armJoints('ceo01', 1);
  assert.ok(ceoPresent.W[2] > 0.5, 'CEO hand presents forward');
  const office = armJoints('office01', -1);
  assert.equal(office.arm.prop, 'clipboard');
  assert.ok(office.W[2] > 0.35, 'office forearm reaches forward to hold the clipboard');
  assert.notDeepEqual(STATUE_POSES.office01.head, STATUE_POSES.nurse01.head);
});

test('posed arms stay attached at the shoulder with fixed bone lengths', () => {
  for (const { id } of SETS) for (const side of [-1, 1]) {
    const { S, E, W } = armJoints(id, side);
    assert.ok(Math.abs(Math.hypot(E[0] - S[0], E[1] - S[1], E[2] - S[2]) - ARM_LENGTHS.upper) < 1e-9);
    assert.ok(Math.abs(Math.hypot(W[0] - E[0], W[1] - E[1], W[2] - E[2]) - ARM_LENGTHS.fore) < 1e-9);
    assert.equal(S[0], side * SHOULDER.x);
    assert.ok(Math.sign(E[0]) === side, `${id} elbow stays on its own side of the body`);
  }
});

test('saved progress is validated and round-trips safely', () => {
  const state = createInitialState();
  const carrying = pickup(state, 'ceo01:legs');
  const restored = restoreState(serializeState(carrying));
  assert.equal(restored.carried, 'ceo01:legs');
  const clean = restoreState({ placed: { office01: ['head', 'nope', 'head'] }, collected: ['fake'] });
  assert.deepEqual(clean.placed.office01, ['head']);
  assert.deepEqual(clean.collected, []);
  assert.equal(clean.carried, null);
});
