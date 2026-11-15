import assert from 'node:assert';
import { OBJECTIVES, GROUPS, GOAL_BONUS, newGoalStats, objectiveValues, objectiveRatio } from '../objectives.js';

assert.ok(OBJECTIVES.length >= 30);
assert.strictEqual(new Set(OBJECTIVES.map(o => o.id)).size, OBJECTIVES.length);                          // unique ids
const groups = new Set(GROUPS.map(g => g.id));
for (const o of OBJECTIVES) { assert.ok(groups.has(o.group), o.id); assert.ok(o.title && o.detail && o.target > 0 && typeof o.v === 'function', o.id); }
for (const g of GROUPS) assert.ok(OBJECTIVES.some(o => o.group === g.id), g.id);                         // no empty group
assert.ok(GOAL_BONUS > 0);
// the original three goals keep their meaning
const w = { counts: { human: 22, elf: 9, dwarf: 4, orc: 11, werewolf: 3, wolf: 100 }, kingdoms: [{ level: 1, age: 0, techs: 0, race: 'human' }, { level: 3, age: 2, techs: 15, race: 'elf', bld: ['wonder', 'sawmill'] }, { level: 2, age: 1, techs: 4, race: 'dwarf' }], warsEnded: 2, allies: 1, pacts: 4, roads: 250, years: 120.7, g: { colonies: 2 } };
const v = objectiveValues(w);
assert.deepStrictEqual([v.population, v.realm, v.peace], [49, 3, 2]);
assert.deepStrictEqual([v.kingdoms5, v.peoples5, v.lv3x3, v.age2, v.techs15, v.wonder, v.bld6, v.ally1, v.pacts3, v.roads200, v.years100, v.years300, v.colony1, v.colony3], [3, 3, 1, 2, 15, 1, 2, 1, 4, 250, 120, 120, 2, 2]);
const empty = objectiveValues({});
for (const o of OBJECTIVES) assert.strictEqual(empty[o.id], 0, o.id);                                    // an empty world starts every goal at zero
assert.deepStrictEqual(Object.keys(newGoalStats()).sort(), ['bands', 'births', 'colonies', 'decrees', 'krakenDriven', 'krakenSlain', 'scnWins', 'sharks', 'unions', 'warships']);
assert.strictEqual(objectiveRatio(25, 50), .5); assert.strictEqual(objectiveRatio(90, 50), 1); assert.strictEqual(objectiveRatio(-1, 50), 0);
console.log('objectives tests ok');
