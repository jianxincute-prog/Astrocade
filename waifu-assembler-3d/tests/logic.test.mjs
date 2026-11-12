import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRAGMENTS, PARTS, SETS, countPlaced, createInitialState, isGameComplete,
  isSetComplete, pickup, placeCarried, restoreState, serializeState, INITIAL_PODIUMS,
} from '../logic.mjs';
import { ARM_LENGTHS, SHOULDER, STATUE_POSES, armJoints } from '../poses.mjs';

test('30 fragments cover six five-part statue sets in the 150x150 hall', () => {
  assert.equal(FRAGMENTS.length, 30);
  assert.equal(SETS.length, 6);
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

test('all 30 pieces complete the display, and repeated placements cannot duplicate parts', () => {
  let state = createInitialState();
  for (const fragment of FRAGMENTS) {
    state = pickup(state, fragment.key);
    state = placeCarried(state, fragment.setId);
    assert.equal(pickup(state, fragment.key), state);
  }
  assert.equal(isGameComplete(state), true);
  assert.ok(SETS.every(({ id }) => isSetComplete(state, id)));
  assert.equal(countPlaced(state), 30);
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
  assert.equal(STATUE_POSES.student01.gesture, 'schoolbag');
  assert.equal(armJoints('student01', -1).arm.prop, 'bag');
  assert.equal(STATUE_POSES.janitor01.gesture, 'mop');
  assert.equal(armJoints('janitor01', 1).arm.prop, 'mop');
  assert.equal(STATUE_POSES.idol01.gesture, 'microphone');
  const mic = armJoints('idol01', 1);
  assert.equal(mic.arm.prop, 'mic');
  assert.ok(mic.W[1] > 3.1 && mic.W[2] > 0.3, 'idol holds the mic up in front of her chin');
  assert.ok(armJoints('idol01', -1).W[1] > armJoints('idol01', -1).E[1] + 0.35, 'idol waves with a raised forearm');
});

test('fragments are spread out and podiums sit inside the annex', () => {
  for (let i = 0; i < FRAGMENTS.length; i += 1) for (let j = i + 1; j < FRAGMENTS.length; j += 1) {
    const a = FRAGMENTS[i]; const b = FRAGMENTS[j];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 5, `${a.key} and ${b.key} overlap`);
  }
  for (const { id } of SETS) {
    const [x, z] = INITIAL_PODIUMS[id];
    assert.ok(Math.abs(x) <= 52 && z <= -92 && z >= -140, `${id} podium inside annex`);
  }
  const ids = SETS.map(({ id }) => id);
  for (let i = 0; i < ids.length; i += 1) for (let j = i + 1; j < ids.length; j += 1) {
    const [ax, az] = INITIAL_PODIUMS[ids[i]]; const [bx, bz] = INITIAL_PODIUMS[ids[j]];
    assert.ok(Math.hypot(ax - bx, az - bz) > 12, `${ids[i]} and ${ids[j]} podiums too close`);
  }
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

test('character face system: 12 presets, 10 expressions, valid defaults and shapes', async () => {
  const { FACE_PRESETS, EXPRESSIONS, EXPR, DEFAULT_EXPR, SHAPE, LIP_STYLE, LIP_FINISHES } = await import('../faces.mjs');
  assert.equal(FACE_PRESETS.length, 12);
  assert.equal(new Set(FACE_PRESETS.map((p) => p.id)).size, 12);
  for (const { id } of SETS) assert.ok(FACE_PRESETS.some((p) => p.id === id), `${id} is a face preset`);
  assert.deepEqual([...EXPRESSIONS].sort(), ['angry', 'crying', 'happy', 'neutral', 'sad', 'shy', 'smiling', 'smug', 'surprised', 'wink']);
  for (const name of EXPRESSIONS) {
    const e = EXPR[name];
    assert.equal(e.lid.length, 2, `${name} has a lid closure per eye`);
    assert.ok(['closed', 'smile', 'small', 'smirk', 'open', 'o'].includes(e.mouth));
    assert.equal(e.mouth === 'open' || e.mouth === 'o', e.open > 0, `${name} opens the mouth only when it says so`);
  }
  assert.ok(EXPR.wink.lid[0] < 0.5 && EXPR.wink.lid[1] === 1, 'wink closes exactly one eye');
  assert.ok(EXPR.crying.tears && EXPR.happy.happy.every(Boolean));
  for (const { id } of FACE_PRESETS) {
    assert.ok(EXPRESSIONS.includes(DEFAULT_EXPR[id]), `${id} has a valid signature expression`);
    const sh = SHAPE[id]; assert.ok(sh && ['jaw', 'chin', 'nose'].every((k) => sh[k] > 0.6 && sh[k] < 1.4), `${id} face shape in range`);
    const lip = LIP_STYLE[id]; assert.ok(lip, `${id} has a lip style`);
    assert.ok(LIP_FINISHES.includes(lip.finish), `${id} lip finish is known`);
    assert.ok(lip.w >= 85 && lip.w <= 125 && lip.top >= 0.55 && lip.top <= 1.5 && lip.bot >= 0.75 && lip.bot <= 1.5, `${id} lip size in range`);
    assert.match(lip.color, /^#[0-9a-f]{6}$/);
  }
  const lips = Object.values(LIP_STYLE);
  assert.equal(new Set(lips.map((l) => l.color)).size, 12, 'every face wears its own lip colour');
  assert.ok(new Set(lips.map((l) => l.finish)).size >= 6, 'lip finishes vary across faces');
  assert.ok(Math.min(...lips.map((l) => l.top)) < 0.75 && Math.max(...lips.map((l) => l.top)) > 1.25, 'both thin and full lips exist');
});
