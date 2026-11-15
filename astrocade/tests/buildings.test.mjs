import assert from 'node:assert';
import { BUILDINGS, buildable, kpBonus, produce, toolBoost, GOODS_CAP } from '../buildings.js';
assert.strictEqual(BUILDINGS.length, 5);
assert.deepStrictEqual(buildable([], 0, 0), []);
assert.deepStrictEqual(buildable([], 0, 1).map(b => b.id), ['sawmill', 'bakery']);
assert.ok(!buildable([], 3, 3).some(b => b.id === 'academy'));                  // academy needs a library
assert.ok(buildable(['library'], 3, 3).some(b => b.id === 'academy'));
assert.ok(!buildable(['library'], 2, 3).some(b => b.id === 'academy'));         // and the medieval age
assert.strictEqual(kpBonus([]), 1); assert.ok(Math.abs(kpBonus(['library', 'academy']) - 1.95) < 1e-9);
assert.deepStrictEqual(produce({ bld: [], wood: 100, food: 300 }), { wood: 0, food: 0, ore: 0, plank: 0, bread: 0, tool: 0 });
assert.strictEqual(produce({ bld: ['sawmill'], wood: 100, plank: 0 }).plank, 1.5);
assert.strictEqual(produce({ bld: ['sawmill'], wood: 100, plank: GOODS_CAP.plank }).plank, 0);
assert.strictEqual(produce({ bld: ['bakery'], food: 100, bread: 0 }).bread, 0);  // only surplus food is baked
assert.strictEqual(produce({ bld: ['bakery'], food: 200, bread: 0 }).bread, 1);
assert.strictEqual(produce({ bld: ['smithy'], wood: 50, iron: 0, bronze: 0, stone: 0 }).tool, 0);
assert.strictEqual(produce({ bld: ['smithy'], wood: 50, iron: 3 }).ore, 1);
assert.strictEqual(toolBoost({ tool: 0 }), 1); assert.strictEqual(toolBoost({ tool: 5 }), 1.25);
console.log('buildings tests ok');
