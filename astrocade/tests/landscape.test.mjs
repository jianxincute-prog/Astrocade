import assert from 'node:assert';
import { distToWater, traceRivers, roadable, stepTrail, ROAD_STEPS, runsEncode, runsDecode } from '../landscape.js';
// a 60x40 island: sea around, grass inside, hills in the middle
const W = 60, H = 40, tiles = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tiles[x + y * W] = (x < 4 || x > 55 || y < 4 || y > 35) ? 0 : (Math.abs(x - 30) < 8 && Math.abs(y - 20) < 6) ? 5 : 3;
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const d = distToWater(tiles, W, H); assert.strictEqual(d[0], 0); assert.ok(d[30 + 20 * W] > 12);
const { mask, rivers } = traceRivers(tiles, W, H, rnd, 3);
assert.ok(rivers.length >= 1, 'at least one river');
for (const r of rivers) {
  assert.ok(r.length >= 14);
  for (const i of r) assert.ok(tiles[i] >= 2 && mask[i] === 1);                       // rivers run over land only
  const last = r[r.length - 1], x = last % W, y = (last / W) | 0;                      // and end at the coast
  assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => tiles[(x + dx) + (y + dy) * W] <= 1));
}
for (let i = 0; i < W * H; i++) if (tiles[i] <= 1) assert.strictEqual(mask[i], 0);
// deterministic for the same seed
seed = 7; assert.deepStrictEqual(traceRivers(tiles, W, H, rnd, 3).rivers, rivers);
// roads
assert.ok(roadable(3) && roadable(2) && !roadable(6) && !roadable(0) && !roadable(8));
const trail = new Uint8Array(5); let made = 0;
for (let n = 0; n < 300; n++) if (stepTrail(trail, 2, 3, true)) made++;
assert.strictEqual(made, 1); assert.strictEqual(trail[2], 255); assert.ok(ROAD_STEPS < 255);
assert.strictEqual(stepTrail(trail, 1, 3, false), false); assert.strictEqual(trail[1], 0);
// run encoding round trip
const m = new Uint8Array(30); [1, 2, 3, 10, 20, 21].forEach(i => m[i] = 1);
const runs = runsEncode(m); assert.deepStrictEqual(runs, [1, 3, 10, 1, 20, 2]);
const m2 = new Uint8Array(30); runsDecode(runs, m2); assert.deepStrictEqual([...m2], [...m]);
console.log('landscape tests ok');
