import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FRAGMENTS, PARTS, SETS, countPlaced, createInitialState, isGameComplete,
  isSetComplete, pickup, placeCarried, restoreState, serializeState, INITIAL_PODIUMS, HALL_SIZE, ANNEX, GALLERY_DOOR, formatTime,
  HIDDEN_FRAGMENTS, isHidden, reveal, medalFor, betterMedal, countStars, EXPRESSION_UNLOCKS, isExpressionUnlocked,
  dailyChallenge, dailyMet, puzzleStart, puzzleSolved, statuePar,
} from '../logic.mjs';
import { ARM_LENGTHS, SHOULDER, STATUE_POSES, armJoints } from '../poses.mjs';

test('60 fragments cover twelve five-part statue sets inside the restoration hall', () => {
  assert.equal(FRAGMENTS.length, 60);
  assert.equal(SETS.length, 12);
  assert.equal(PARTS.length, 5);
  assert.equal(HALL_SIZE, 120);
  const inner = HALL_SIZE / 2 - 4; // keep clear of the walls, pilasters and windows
  assert.ok(FRAGMENTS.every(({ x, z }) => Math.abs(x) <= inner && Math.abs(z) <= inner));
});

test('pickup is one-at-a-time and matching parts snap into the right set', () => {
  const start = createInitialState();
  const head = pickup(reveal(start, 'office01:head'), 'office01:head');
  assert.equal(head.carried, 'office01:head');
  assert.equal(pickup(reveal(head, 'nurse01:legs'), 'nurse01:legs').carried, 'office01:head', 'only one part at a time');
  assert.equal(placeCarried(head, 'nurse01'), head, 'wrong podium leaves the part in hand');
  const placed = placeCarried(head, 'office01');
  assert.equal(placed.carried, null);
  assert.deepEqual(placed.placed.office01, ['head']);
  assert.equal(isSetComplete(placed, 'office01'), false);
  assert.equal(countPlaced(placed), 1);
});

test('all 60 pieces complete the display, and repeated placements cannot duplicate parts', () => {
  let state = createInitialState();
  for (const fragment of FRAGMENTS) {
    if (isHidden(fragment.key)) assert.equal(pickup(state, fragment.key), state, 'a hidden part cannot be taken before it is opened');
    state = reveal(state, fragment.key);
    state = pickup(state, fragment.key);
    state = placeCarried(state, fragment.setId);
    assert.equal(pickup(state, fragment.key), state);
  }
  assert.equal(isGameComplete(state), true);
  assert.ok(SETS.every(({ id }) => isSetComplete(state, id)));
  assert.equal(countPlaced(state), 60);
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
  const gestures = { rin01: ['book', -1], aoi01: ['victory'], mei01: ['tray', -1], yuki01: ['snowflake', 1], kana01: ['selfie', 1], sakura01: ['broom', 1] };
  for (const [id, [gesture, side]] of Object.entries(gestures)) {
    assert.equal(STATUE_POSES[id].gesture, gesture);
    if (side) assert.ok(armJoints(id, side).arm.prop, `${id} holds a prop`);
  }
  assert.ok(armJoints('aoi01', 1).W[1] > 3.8, 'Aoi punches her fist up above her shoulder');
  assert.ok(armJoints('kana01', 1).W[1] > 3.5, 'Kana holds the phone up for a selfie');
  assert.equal(new Set(Object.values(STATUE_POSES).map((p) => p.gesture)).size, 12, 'every statue has its own gesture');
});

test('fragments are spread out and the twelve plinths line the sculpture gallery', () => {
  for (let i = 0; i < FRAGMENTS.length; i += 1) for (let j = i + 1; j < FRAGMENTS.length; j += 1) {
    const a = FRAGMENTS[i]; const b = FRAGMENTS[j];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 5, `${a.key} and ${b.key} overlap`);
  }
  for (const { id } of SETS) {
    const [x, z] = INITIAL_PODIUMS[id];
    assert.ok(Math.abs(x) <= ANNEX.maxX - 5 && z <= ANNEX.nearZ - 8 && z >= ANNEX.farZ + 6, `${id} plinth inside the gallery`);
    assert.ok(Math.abs(x) > GALLERY_DOOR, `${id} plinth keeps the central aisle clear`);
  }
  assert.equal(SETS.filter(({ id }) => INITIAL_PODIUMS[id][0] < 0).length, 6, 'six plinths on each side');
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
  const carrying = pickup(reveal(state, 'ceo01:legs'), 'ceo01:legs');
  const restored = restoreState(serializeState(carrying));
  assert.equal(restored.carried, 'ceo01:legs');
  const clean = restoreState({ placed: { office01: ['head', 'nope', 'head'] }, collected: ['fake'] });
  assert.deepEqual(clean.placed.office01, ['head']);
  assert.deepEqual(clean.collected, []);
  assert.equal(clean.carried, null);
});

test('character face system: 12 presets, 10 expressions, valid defaults and shapes', async () => {
  const { FACE_PRESETS, EXPRESSIONS, EXPR, DEFAULT_EXPR, SHAPE, LIP_STYLE, LIP_FINISHES, COSTUMES } = await import('../faces.mjs');
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
  for (const { id } of FACE_PRESETS) assert.ok(COSTUMES[id]?.name && Object.keys(COSTUMES[id]).length > 2, `${id} has a gala costume`);
  const lips = Object.values(LIP_STYLE);
  assert.equal(new Set(lips.map((l) => l.color)).size, 12, 'every face wears its own lip colour');
  assert.ok(new Set(lips.map((l) => l.finish)).size >= 6, 'lip finishes vary across faces');
  assert.ok(Math.min(...lips.map((l) => l.top)) < 0.75 && Math.max(...lips.map((l) => l.top)) > 1.25, 'both thin and full lips exist');
});

test('restoration times format for the leaderboard', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65.4), '1:05');
  assert.equal(formatTime(3725), '1:02:05');
  assert.equal(formatTime(-3), '0:00');
  assert.equal(formatTime('nope'), '0:00');
});

test('hidden fragments: two per statue, chests and curtains, opened before pickup and saved', () => {
  const keys = Object.keys(HIDDEN_FRAGMENTS);
  assert.equal(keys.length, 24);
  for (const { id } of SETS) assert.equal(keys.filter((k) => k.startsWith(`${id}:`)).length, 2, `${id} hides two parts`);
  assert.ok(Object.values(HIDDEN_FRAGMENTS).includes('chest') && Object.values(HIDDEN_FRAGMENTS).includes('curtain'));
  const key = keys[0]; let s = createInitialState();
  assert.equal(pickup(s, key), s);
  s = reveal(s, key); assert.deepEqual(s.revealed, [key]); assert.equal(reveal(s, key), s, 'opening twice changes nothing');
  assert.deepEqual(restoreState(serializeState(s)).revealed, [key]);
  assert.deepEqual(restoreState({ revealed: ['office01:torso-fake', key] }).revealed, [key]);
});

test('medals, stars and expression unlocks', () => {
  assert.equal(medalFor(60, 100), 'gold'); assert.equal(medalFor(100, 100), 'gold'); assert.equal(medalFor(101, 100), 'silver');
  assert.equal(medalFor(150, 100), 'silver'); assert.equal(medalFor(151, 100), 'bronze'); assert.equal(medalFor(NaN, 100), 'bronze');
  for (const set of SETS) { // every statue has a fair, finite par; far-flung statues get more time
    const par = statuePar(set.id); assert.ok(par > 60 && par < 260, `${set.id} par ${par}`);
  }
  assert.ok(statuePar('rin01') > statuePar('office01'));
  assert.ok(statuePar('office01', INITIAL_PODIUMS.office01, 18) < statuePar('office01'), 'faster walking lowers par');
  assert.equal(betterMedal('silver', 'gold'), 'gold'); assert.equal(betterMedal('gold', 'bronze'), 'gold'); assert.equal(betterMedal(undefined, 'bronze'), 'bronze');
  assert.equal(countStars({ medals: { office01: 'gold', nurse01: 'silver', ceo01: 'bronze' }, dailyStars: 3 }), 9);
  assert.equal(countStars({}), 0);
  assert.ok(isExpressionUnlocked('neutral', 0) && isExpressionUnlocked('smiling', 0) && !isExpressionUnlocked('happy', 1));
  assert.ok(isExpressionUnlocked('crying', 36), 'every expression is reachable with all gold medals');
  assert.ok(Math.max(...Object.values(EXPRESSION_UNLOCKS)) <= 36);
});

test('daily challenge is deterministic per day and checkable', () => {
  const a = dailyChallenge('2026-11-12'); assert.deepEqual(a, dailyChallenge('2026-11-12T23:59:00Z'));
  const kinds = new Set(Array.from({ length: 30 }, (_, i) => dailyChallenge(`2026-12-${String(i + 1).padStart(2, '0')}`).kind));
  assert.deepEqual([...kinds].sort(), ['gold', 'secrets', 'speed']);
  const speed = { kind: 'speed', setId: 'aoi01', seconds: 120 };
  assert.equal(dailyMet(speed, { completions: [{ setId: 'aoi01', seconds: 119 }] }), true);
  assert.equal(dailyMet(speed, { completions: [{ setId: 'aoi01', seconds: 130 }, { setId: 'mei01', seconds: 50 }] }), false);
  assert.equal(dailyMet({ kind: 'gold' }, { completions: [{ setId: 'x', seconds: 90, medal: 'gold' }] }), true);
  assert.equal(dailyMet({ kind: 'gold' }, { completions: [{ setId: 'x', seconds: 90, medal: 'silver' }] }), false);
  for (let i = 1; i <= 30; i += 1) { const c = dailyChallenge(`2027-01-${String(i).padStart(2, '0')}`); if (c.kind === 'speed') assert.ok(c.seconds > statuePar(c.setId), 'speed challenges are slower than gold'); }
  assert.equal(dailyMet({ kind: 'secrets', count: 4 }, { reveals: 3 }), false);
  assert.equal(dailyMet({ kind: 'secrets', count: 4 }, { reveals: 4 }), true);
});

test('turn-and-fit puzzle starts off and solves at zero', () => {
  for (const f of FRAGMENTS) {
    const p = puzzleStart(f.key);
    assert.ok(p.yaw >= 2 && p.yaw <= 6 && (p.flip === 0 || p.flip === 2));
    assert.equal(puzzleSolved(p), false);
    assert.equal(puzzleSolved({ yaw: p.yaw + (8 - p.yaw), flip: p.flip + (4 - p.flip) % 4 }), true);
  }
  assert.equal(puzzleSolved({ yaw: -8, flip: 4 }), true);
  assert.ok(FRAGMENTS.some((f) => puzzleStart(f.key).flip === 2), 'some parts arrive upside down');
});
