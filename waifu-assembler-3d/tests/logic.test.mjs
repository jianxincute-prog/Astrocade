import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRAGMENTS, PARTS, SETS, countPlaced, createInitialState, isGameComplete,
  isSetComplete, pickup, placeCarried, restoreState, serializeState,
} from '../logic.mjs';

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
