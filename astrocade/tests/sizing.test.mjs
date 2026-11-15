import assert from 'node:assert';
import { charSize, charScale } from '../sizing.js';
assert.strictEqual(charSize(undefined), 1.2);
assert.strictEqual(charSize('abc'), 1.2);
assert.strictEqual(charSize(5), 2); assert.strictEqual(charSize(0.1), 0.6);
assert.strictEqual(charScale(5, 1.2), 1);                     // never below one pixel per pixel
assert.strictEqual(charScale(15, 1.2), 2);                    // whole numbers at small scales
assert.ok(Math.abs(charScale(30, 1.2) - 3.6) < 1e-9);         // smooth at big zooms: 10px sprite = 1.2 tiles
assert.ok(charScale(30, 2) > charScale(30, 1.2));
console.log('sizing tests ok');
