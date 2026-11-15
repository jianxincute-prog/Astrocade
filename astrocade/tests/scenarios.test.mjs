import assert from 'node:assert';
import { SCENARIOS, SCENARIO_BY, evalScenario } from '../scenarios.js';
assert.strictEqual(SCENARIOS.length, 5);
const ids = new Set(SCENARIOS.map(s => s.id)); assert.strictEqual(ids.size, 5);
for (const s of SCENARIOS) { assert.ok(s.n && s.desc && s.years > 0 && s.setup.length && s.goal.v > 0); for (const e of s.setup) assert.ok(['human', 'elf', 'dwarf', 'orc', 'werewolf'].includes(e.race) && e.n > 0); }
const base = { years: 10, pop: 5, maxLevel: 0, maxAge: 0, kingdoms: 1, races: 1 };
const lv = SCENARIO_BY.dawn;
assert.strictEqual(evalScenario(lv, base).status, 'run');
assert.strictEqual(evalScenario(lv, { ...base, maxLevel: 3 }).status, 'win');
assert.strictEqual(evalScenario(lv, { ...base, years: 35 }).status, 'lose');           // time is up
assert.strictEqual(evalScenario(lv, { ...base, years: 34, maxLevel: 3 }).status, 'win');
const hold = SCENARIO_BY.peace;
assert.strictEqual(evalScenario(hold, { ...base, years: 5, races: 1 }).status, 'run');   // a grace period at the start
assert.strictEqual(evalScenario(hold, { ...base, years: 40, races: 3 }).status, 'lose');
assert.strictEqual(evalScenario(hold, { ...base, years: 120, races: 4 }).status, 'run');
assert.strictEqual(evalScenario(hold, { ...base, years: 250, races: 4 }).status, 'win');
const r = evalScenario(SCENARIO_BY.north, { ...base, pop: 25 }); assert.deepStrictEqual([r.value, r.target], [25, 80]);
console.log('scenarios tests ok');
