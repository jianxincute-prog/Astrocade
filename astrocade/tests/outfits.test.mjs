import assert from 'node:assert';
import { drawOutfit, BODY, OUTFIT_COLOR } from '../outfits.js';
import { PROF_IDS } from '../professions.js';

for (const p of PROF_IDS) assert.ok(OUTFIT_COLOR[p], 'colour for ' + p);                       // every profession has an outfit
for (const race of Object.keys(BODY)) for (const prof of PROF_IDS) for (const hd of [1, -1]) {
  const rects = []; const ctx = { set fillStyle(v) { this._c = v; }, fillRect(x, y, w, h) { rects.push([x, y, w, h, this._c]); } };
  const ok = drawOutfit(ctx, { prof, race, cx: 100, fy: 200, sw: 60, sh: 70, spw: race === 'orc' || race === 'werewolf' ? 14 : 12, hd, col: '#4aa3ff' });
  assert.ok(ok && rects.length >= 3, race + prof);
  for (const r of rects) { assert.ok(r[2] > 0 && r[3] > 0, 'positive size ' + race + prof); assert.ok(r[0] > 100 - 60 && r[0] < 100 + 60 && r[1] > 200 - 70 - 20 && r[1] < 200, 'near the body ' + race + prof); }
}
assert.strictEqual(drawOutfit({ fillRect() {} }, { prof: 'nobody', race: 'human', cx: 0, fy: 0, sw: 10, sh: 10, spw: 12, hd: 1, col: '#fff' }), false);
// mirroring: the same outfit facing left sits symmetrically around the feet centre
const a = [], b = []; const mk = arr => ({ set fillStyle(v) {}, fillRect(x, y, w, h) { arr.push([x, w]); } });
drawOutfit(mk(a), { prof: 'hunter', race: 'human', cx: 100, fy: 200, sw: 60, sh: 70, spw: 12, hd: 1, col: '#fff' });
drawOutfit(mk(b), { prof: 'hunter', race: 'human', cx: 100, fy: 200, sw: 60, sh: 70, spw: 12, hd: -1, col: '#fff' });
assert.ok(a.every((r, i) => Math.abs((r[0] + r[1] / 2 - 100) + (b[i][0] + b[i][1] / 2 - 100)) < 1e-6));
console.log('outfits tests ok');
