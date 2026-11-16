import assert from 'node:assert';
import { drawWorker, drawCarry } from '../work_anim.js';
import { JOBS, JOB_W, CARRY } from '../jobs.js';
// a do-nothing canvas context: every draw path must run without throwing
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
let n = 0;
for (const race of Object.keys(JOB_W)) for (const job of [...JOBS, 'build', 'trade']) for (const phase of [0, 1]) for (const ph of [0, .3, .62, .9]) {
  drawWorker(ctx, { job, race, ph, phase, cx: 100, fy: 100, sw: 40, sh: 40, K: 4, hd: n % 2 ? 1 : -1, tx: 130, ty: 110, frame: n * 7, id: 3 }); n++;
}
for (const it of Object.values(CARRY)) drawCarry(ctx, it, 50, 50, 4, 10, 2);
assert.ok(n > 200);
console.log('work_anim tests ok');
