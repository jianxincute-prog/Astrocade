import assert from 'node:assert';
import { YEAR, SEASONS, seasonIndex, seasonOf, seasonTintK, DECREES, decreeMult, decreeReady, issueDecree } from '../seasons.js';
assert.strictEqual(seasonOf(0).id, 'spring'); assert.strictEqual(seasonOf(YEAR).id, 'summer'); assert.strictEqual(seasonOf(3 * YEAR).id, 'winter'); assert.strictEqual(seasonOf(4 * YEAR).id, 'spring');
assert.ok(SEASONS.find(s => s.id === 'winter').food < 1 && SEASONS.find(s => s.id === 'autumn').food > 1);
for (let t = 0; t < 5 * YEAR; t += 7) { const k = seasonTintK(t); assert.ok(k >= 0 && k <= 1); }
assert.strictEqual(seasonIndex(-5), 0);
assert.strictEqual(DECREES.length, 4);
assert.strictEqual(decreeMult(null, 10, 'food'), 1);
const dec = issueDecree('harvest', 100);
assert.strictEqual(decreeMult(dec, 150, 'food'), 1.5); assert.strictEqual(decreeMult(dec, 150, 'gold'), 1); assert.strictEqual(decreeMult(dec, dec.until, 'food'), 1);
assert.strictEqual(decreeReady(dec, 'tax', 150), null);                 // one decree at a time, then a cooldown
assert.strictEqual(decreeReady(dec, 'tax', dec.until + 1), null);
assert.ok(decreeReady(dec, 'tax', dec.cd + 1));
assert.strictEqual(decreeReady(null, 'nope', 0), null); assert.ok(decreeReady(null, 'tax', 0));
console.log('seasons tests ok');
