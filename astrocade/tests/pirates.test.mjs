import assert from 'node:assert';
import { RAID, raidLoot, raidDefence, raidTargetScore, recruitChance, aidAmount, PIRATE, ORIGIN_RACES, BASE_NAMES, defectionChance, bandSize, islandsOf, pickIsle, baseTile } from '../pirates.js';

const k = { race: 'human', pop: 20, level: 1, unrest: 60, food: 30 };
assert.ok(defectionChance(k) > 0 && defectionChance(k) <= .6);
assert.strictEqual(defectionChance({ ...k, unrest: 20 }), 0);                 // calm realms keep their people
assert.strictEqual(defectionChance({ ...k, pop: 8 }), 0);                     // too small
assert.strictEqual(defectionChance({ ...k, race: 'werewolf' }), 0);           // werewolves never turn pirate
assert.ok(defectionChance({ ...k, food: 0 }) > defectionChance(k));
assert.deepStrictEqual(ORIGIN_RACES, ['human', 'elf', 'dwarf', 'orc']);
for (const p of [5, 14, 40, 200]) for (const r of [0, .5]) { const n = bandSize(p, r); assert.ok(n >= 3 && n <= 5); }
assert.ok(BASE_NAMES.length >= 6);

// a 40x20 map: a big mainland on the left, a small isle in the middle, a tiny rock and a huge isle on the right (3 = land)
const W = 40, H = 20, t = new Uint8Array(W * H);
const fill = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) t[x + y * W] = 3; };
fill(1, 1, 8, 18); fill(18, 6, 23, 11); fill(28, 2, 29, 3); fill(31, 1, 38, 18);
const { label, list } = islandsOf(t, W, H, v => v >= 2);
assert.strictEqual(list.length, 4);
const at = (x, y) => list[label[x + y * W] - 1];
assert.deepStrictEqual([at(2, 2).size, at(20, 8).size, at(28, 2).size, at(33, 5).size], [144, 36, 4, 144]);
const isles = list.map(s => ({ ...s, busy: false }));
isles[at(2, 2).id - 1].busy = true; isles[at(33, 5).id - 1].busy = true;       // kingdoms stand on both big lands
const pick = pickIsle(isles, { x: 4, y: 10, isle: at(2, 2).id }, 0);
assert.ok(pick && pick.size === 36);                                           // the small empty isle, not the tiny rock or the huge land
assert.strictEqual(pickIsle(isles.map(s => ({ ...s, busy: true })), { x: 4, y: 10, isle: at(2, 2).id }, 0), null);
assert.strictEqual(pickIsle(isles, { x: 20, y: 8, isle: at(20, 8).id }, 0), null);        // too close to the only fitting island
const bt = baseTile(label, pick.id, W, H, pick.cx, pick.cy, () => true);
assert.ok(bt >= 0 && label[bt] === pick.id);
assert.strictEqual(baseTile(label, pick.id, W, H, pick.cx, pick.cy, () => false), -1);
// raids
assert.deepStrictEqual(raidLoot({ gold: 0, food: 2, wood: 100 }), { gold: 0, food: 2, wood: 3 });         // a poor kingdom has little to take
assert.ok(raidDefence(0, 0) === 0 && raidDefence(3, 2) === 8 && raidDefence(99, 3) === 16);              // soldiers and cannons wear a ship down
assert.ok(raidTargetScore({ gold: 100, food: 100, wood: 100 }, 10) > raidTargetScore({ gold: 100, food: 100, wood: 100 }, 100));
assert.ok(raidTargetScore({ gold: 200, food: 0, wood: 0 }, 50) > raidTargetScore({ gold: 10, food: 0, wood: 0 }, 50));
assert.ok(recruitChance(0, 3) > 0 && recruitChance(100, 3) <= .7 && recruitChance(10, PIRATE.maxPirates) === 0);
assert.strictEqual(aidAmount(5), 0); assert.ok(aidAmount(40) > 0);
assert.ok(RAID.minCrew <= RAID.maxCrew && RAID.shipHp > 0);
console.log('pirates tests ok');
