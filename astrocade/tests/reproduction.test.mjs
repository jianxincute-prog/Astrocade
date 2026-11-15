import assert from 'node:assert';
import { isAdult, lifeStage, ANIMAL_BREED, crowd, canBreed, isMate, pickPair, pickCrew, MATURE_FRAC } from '../reproduction.js';
assert.ok(!isAdult(10, 1000) && isAdult(MATURE_FRAC * 1000, 1000));
assert.deepStrictEqual([0, 100, 400, 900].map(a => lifeStage(a, 1000)), ['Newborn', 'Young', 'Adult', 'Elder']);
for (const t of ['sheep', 'rabbit', 'deer', 'wolf']) assert.ok(ANIMAL_BREED[t].p > 0 && ANIMAL_BREED[t].cd > 0);
assert.strictEqual(crowd(0, 100), 1); assert.strictEqual(crowd(100, 100), 0); assert.strictEqual(crowd(150, 100), 0); assert.strictEqual(crowd(5, 0), 0); assert.ok(Math.abs(crowd(50, 100) - .5) < 1e-9);
const F = { t: 'sheep', f: 1, hp: 5, age: 300, life: 800, bcd: 0 }, M = { t: 'sheep', f: 0, hp: 5, age: 300, life: 800 };
assert.ok(canBreed(F, 10)); assert.ok(!canBreed({ ...F, bcd: 50 }, 10)); assert.ok(!canBreed({ ...F, age: 20 }, 10)); assert.ok(!canBreed(M, 10)); assert.ok(!canBreed({ ...F, hp: 0 }, 10));
assert.ok(isMate(F, M)); assert.ok(!isMate(F, { ...M, f: 1 })); assert.ok(!isMate(F, { ...M, age: 10 })); assert.ok(!isMate(F, { ...M, t: 'deer' })); assert.ok(!isMate(F, F));
// pairs need both sexes
const mk = (nid, f, sp = 0) => ({ nid, f, sp });
assert.strictEqual(pickPair([mk(1, 1), mk(2, 1)]), null); assert.strictEqual(pickPair([mk(1, 0)]), null); assert.strictEqual(pickPair([]), null);
let p = pickPair([mk(1, 1), mk(2, 0), mk(3, 1, 4), mk(4, 0, 3)], () => 0); assert.deepStrictEqual([p[0].nid, p[1].nid], [3, 4]);   // existing couples first
p = pickPair([mk(1, 1), mk(2, 0)]); assert.ok(p[0].f === 1 && p[1].f === 0);
// crews of one sex are mixed when possible
const crew = pickCrew([{ f: 1, age: 300, life: 1000 }, { f: 1, age: 300, life: 1000 }, { f: 1, age: 300, life: 1000 }, { f: 0, age: 300, life: 1000 }]);
assert.strictEqual(crew.length, 3); assert.ok(crew.some(c => c.f) && crew.some(c => !c.f));
assert.strictEqual(pickCrew([{ f: 1, age: 300, life: 1000 }]).length, 1);
console.log('reproduction tests ok');
