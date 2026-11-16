import assert from 'node:assert';
import { PROFS, PROF_IDS, likeOf, needBoost, pickProfession, masteryLevel, yieldMult, speedMult, buildDiscount, traderGold, traderCd, MASTERY_XP } from '../professions.js';
import { JOB_W } from '../jobs.js';

assert.strictEqual(PROFS.length, 9);
for (const r of Object.keys(JOB_W)) for (const p of PROF_IDS) if (p !== 'soldier') assert.ok(likeOf(r, p, JOB_W) >= 0);
assert.strictEqual(likeOf('human', 'soldier', JOB_W), 0);
assert.ok(likeOf('dwarf', 'miner', JOB_W) > likeOf('dwarf', 'farmer', JOB_W));        // dwarves love the mine
const calm = { food: 150, wood: 100, stone: 100, gold: 50, lab: 20 };
function share(race, need, counts, n = 4000) { const c = {}; for (let i = 0; i < n; i++) { const p = pickProfession(race, need, counts, {}, JOB_W, (i + .5) / n); c[p] = (c[p] || 0) + 1; } return c; }
const a = share('human', needBoost(calm), {}), b = share('human', needBoost({ ...calm, food: 20 }), {});
assert.ok(b.farmer > a.farmer);                                                         // hunger makes more farmers
assert.ok(!('soldier' in a));
const wolf = share('werewolf', needBoost(calm), {}); assert.ok((wolf.farmer || 0) === 0 && wolf.hunter > wolf.builder);
const capped = share('human', needBoost(calm), { farmer: 30, miner: 2, lumberjack: 2 }); assert.ok(capped.farmer < a.farmer * .5);  // a swamped trade is avoided
const nofarm = share('human', needBoost(calm), {}, 500); const nf = pickProfession('human', null, {}, { farmer: false }, JOB_W, .5); assert.notStrictEqual(nf, 'farmer');
assert.ok(PROF_IDS.includes(pickProfession('orc', null, {}, null, JOB_W, .999)));
assert.strictEqual(masteryLevel(0), 0); assert.strictEqual(masteryLevel(MASTERY_XP[4]), 4); assert.strictEqual(masteryLevel(7), 1);
assert.ok(yieldMult(4) > yieldMult(0) && speedMult(4) < speedMult(0) && speedMult(4) > .6);
assert.strictEqual(buildDiscount(0), 0); assert.strictEqual(buildDiscount(500), .25);
assert.ok(traderGold(5) > 0 && traderGold(500) <= .3); assert.strictEqual(traderCd(240, 0), 240); assert.strictEqual(traderCd(240, 99), 80);
console.log('professions tests ok');
