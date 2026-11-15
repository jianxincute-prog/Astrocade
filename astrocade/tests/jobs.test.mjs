import assert from 'node:assert';
import { pickJob, JOBS, JOB_W, toolAngle, swingPhase, isStrikeFrame, IMPACT, addYield, reach, STATUS, CARRY, JOB_YIELD } from '../jobs.js';
import { toolFor } from '../work_anim.js';

// every race can pick something, and only from available jobs
for (const race of Object.keys(JOB_W)) {
  for (let i = 0; i < 50; i++) {
    const j = pickJob(race, { chop: 1, mine: 1, hunt: 1, fish: 1 }, i / 50);
    assert.ok(['chop', 'mine', 'hunt', 'fish'].includes(j), race + ' ' + j);
  }
}
assert.strictEqual(pickJob('werewolf', { farm: 1 }, .5), null);          // werewolves never farm
assert.strictEqual(pickJob('human', {}, .5), null);
// dwarves mostly mine
let mines = 0; for (let i = 0; i < 100; i++) if (pickJob('dwarf', Object.fromEntries(JOBS.map(j => [j, 1])), i / 100) === 'mine') mines++;
assert.ok(mines > 40, 'dwarves mine ' + mines);
// swing: raised during wind-up, forward at impact
assert.ok(toolAngle('chop', .5) < -1.5);
assert.ok(Math.abs(toolAngle('chop', IMPACT) - .15) < .05);
assert.ok(isStrikeFrame(IMPACT) && !isStrikeFrame(.3));
const ph = swingPhase(123, 4, 'mine'); assert.ok(ph >= 0 && ph < 1);
// yields clamp to caps
const k = { food: 398, wood: 249 };
addYield(k, 'food', 8); addYield(k, 'wood', 3); addYield(k, 'iron', 1);
assert.deepStrictEqual([k.food, k.wood, k.iron], [400, 250, 1]);
assert.strictEqual(reach('hunt', 'elf'), 3); assert.strictEqual(reach('fish', 'orc'), 0);
for (const j of JOBS) { assert.strictEqual(STATUS[j].length, 3); assert.ok(CARRY[j] && JOB_YIELD[j]); }
assert.strictEqual(toolFor('chop', 'werewolf'), 'claws'); assert.strictEqual(toolFor('hunt', 'elf'), 'bow');
console.log('jobs tests ok');
