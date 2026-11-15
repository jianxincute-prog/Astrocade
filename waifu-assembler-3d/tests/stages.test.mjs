import test from 'node:test';
import assert from 'node:assert/strict';
import { SETS, createInitialState, pickup, placeCarried, restoreState, reveal, serializeState } from '../logic.mjs';
import {
  STAGE_ORDER, CLOCK_MIN, clearStage, createRun, pieceAssembled, pieceRevealed, stageScore, stageSpec, startStage, tickRun,
} from '../stages.mjs';

test('stage order is a permutation of all statues and never repeats back-to-back', () => {
  assert.deepEqual([...STAGE_ORDER].sort(), SETS.map((s) => s.id).sort());
  for (let n = 1; n < 40; n += 1) assert.notEqual(stageSpec(n).setId, stageSpec(n + 1).setId);
  assert.equal(stageSpec(13).setId, stageSpec(1).setId, 'the cycle repeats after all statues');
});

test('obstacles follow the design: open, curtains, chests, then mixed', () => {
  assert.deepEqual(stageSpec(1).lockedKinds, []);
  assert.deepEqual(stageSpec(2).lockedKinds, ['curtain']);
  assert.deepEqual(stageSpec(3).lockedKinds, ['chest']);
  assert.deepEqual(stageSpec(7).lockedKinds, ['chest', 'curtain']);
  assert.deepEqual([...new Set(Object.values(stageSpec(7).hiddenByKey))].sort(), ['chest', 'curtain']);
});

test('extra ornaments become collectible and stage saves preserve their placed state', () => {
  const spec = stageSpec(4);
  assert.equal(spec.pieceCount, 8);
  assert.equal(spec.extraCount, 3);
  const fragment = spec.fragments.find((item) => item.isAccessory);
  let state = createInitialState();
  if (spec.hiddenByKey[fragment.key]) state = reveal(state, fragment.key, spec.hiddenByKey);
  state = pickup(state, fragment.key, spec.fragments, spec.hiddenByKey);
  assert.equal(state.carried, fragment.key);
  state = placeCarried(state, fragment.setId, spec.fragments);
  const restored = restoreState(serializeState(state), spec.fragments, spec.hiddenByKey);
  assert.ok(restored.placed[fragment.setId].includes(fragment.partId));
  assert.ok(!restored.collected.includes(fragment.key), 'a placed ornament must not return as an unplaced save item');
});

test('the clock starts at 90 seconds, shrinks per stage and never drops below the floor', () => {
  assert.equal(stageSpec(1).clock, 90);
  assert.equal(stageSpec(2).clock, 86);
  assert.equal(stageSpec(50).clock, CLOCK_MIN);
});

test('running out of time ends the run; ticking a non-running run is a no-op', () => {
  const running = startStage(createRun());
  const late = tickRun(running, 100);
  assert.equal(late.status, 'over');
  assert.equal(late.clock, 0);
  assert.equal(tickRun(createRun(), 5).clock, 90);
});

test('assembling pieces and opening secrets buys time; clearing scores and advances', () => {
  let run = startStage(createRun());
  run = pieceRevealed(run);
  assert.equal(run.clock, 98);
  assert.equal(run.opened, 1);
  run = pieceAssembled(run);
  assert.equal(run.clock, 106);
  const { run: next, points } = clearStage(run);
  assert.equal(points, stageScore(1, 106, 1, 1));
  assert.equal(next.stage, 2);
  assert.equal(next.score, points);
  assert.equal(next.combo, 1, 'five seconds or more left keeps the combo');
});

test('a slow clear resets the combo and a finished run cannot be cleared again', () => {
  let run = startStage(createRun());
  run = { ...run, clock: 3 };
  const { run: cleared, points } = clearStage(run);
  assert.equal(cleared.combo, 0);
  assert.equal(points, 100 + 30);
  assert.equal(clearStage(tickRun(startStage(cleared), 999)).points, 0);
});
