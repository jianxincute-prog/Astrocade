import assert from 'node:assert';
import { findWaterRoute, canResearchVoyage, shipwreckProbability } from '../navigation.js';

// 5x3 island gap with a one-cell sea channel.
const W = 5, H = 3, land = 2, water = 0;
const tiles = new Uint8Array([
  land, land, water, water, land,
  land, land, water, water, land,
  land, land, water, water, land,
]);
const goals = new Int32Array(W * H).fill(-1); goals[3] = 14; goals[8] = 14;
const route = findWaterRoute(tiles, W, H, 2, goals);
assert.deepStrictEqual(route.path, [2, 3]);
assert.strictEqual(route.landIndex, 14);
assert.strictEqual(findWaterRoute(tiles, W, H, 0, goals), null); // starts on land
assert.strictEqual(findWaterRoute(tiles, W, H, 2, new Int32Array(W * H).fill(-1)), null);
const blocked = new Uint8Array([2,2,2,2,2, 2,2,2,2,2, 2,2,2,2,2]);
assert.strictEqual(findWaterRoute(blocked, 5, 3, 0, goals), null);
assert.strictEqual(canResearchVoyage(1, 3, true), false);  // no sailing before Iron Age
assert.strictEqual(canResearchVoyage(2, 2, true), false);  // no sailing before Kingdom level
assert.strictEqual(canResearchVoyage(2, 3, false), false); // landlocked kingdoms cannot research it
assert.strictEqual(canResearchVoyage(2, 3, true), true);
assert.strictEqual(shipwreckProbability(60, 0, true), 0);
assert.ok(Math.abs(shipwreckProbability(60, 3, false) - .033) < 1e-12);
assert.ok(shipwreckProbability(120, 3, true) > shipwreckProbability(120, 3, false));
assert.ok(shipwreckProbability(999, 50, true) <= .25);
console.log('navigation tests ok');
