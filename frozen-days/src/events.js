// Town events, driven by the game clock and the day counter:
//   Lantern Skate  daily 18:00-24:00  collect glowing lanterns floating on the ice
//   Winter Market  every 3rd day 09:00-17:00  stalls in the plaza, shops 15% cheaper
//   Winter Festival  every 5th day 19:00-24:00  fireworks over the lake, lanterns worth double
import { mulberry32, clamp } from './util.js';
import { lakeEdgeDist } from './layout.js';
const T = THREE;

export const EVENT_INFO = {
  lantern: { name: 'Lantern Skate', hint: 'Skate over the glowing lanterns on the ice!' },
  market: { name: 'Winter Market', hint: 'Stalls are open in the plaza: shops are 15% cheaper!' },
  festival: { name: 'Winter Festival', hint: 'Fireworks over the lake tonight!' },
};
export const schedule = (hour, day) => ({
  lantern: hour >= 18 && hour < 24,
  market: day % 3 === 1 && hour >= 9 && hour < 17,
  festival: day % 5 === 4 && hour >= 19 && hour < 24,
});

function glowTex(core, mid) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, core); g.addColorStop(0.3, mid); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}

export function createEvents(scene, world, hooks = {}) {
  const rng = mulberry32(99);
  const cur = { lantern: false, market: false, festival: false }, forced = {};

  // ---------------- lanterns floating on the ice
  const NL = 12, lpos = new Float32Array(NL * 3), lcol = new Float32Array(NL * 3), got = new Uint8Array(NL);
  const lgeo = new T.BufferGeometry(); lgeo.setAttribute('position', new T.BufferAttribute(lpos, 3)); lgeo.setAttribute('color', new T.BufferAttribute(lcol, 3));
  const lmat = new T.PointsMaterial({ map: glowTex('rgba(255,255,255,1)', 'rgba(255,255,255,0.45)'), size: 6.0, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false });
  const lanterns = new T.Points(lgeo, lmat); lanterns.frustumCulled = false; lanterns.visible = false; scene.add(lanterns);
  const PAL = [[1, 0.78, 0.4], [1, 0.55, 0.55], [0.6, 0.85, 1], [0.8, 0.7, 1], [1, 0.9, 0.6]];
  let lanternCount = 0;
  function spawnLanterns() {
    lanternCount = 0; got.fill(0);
    const pts = [];
    let tries = 0;
    while (pts.length < NL && tries++ < 600) {
      const x = (rng() * 2 - 1) * 60, z = (rng() * 2 - 1) * 56;
      if (lakeEdgeDist(x, z) > -11) continue;
      if (pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < 13)) continue;
      pts.push([x, z]);
    }
    for (let i = 0; i < NL; i++) { const p = pts[i % Math.max(1, pts.length)] || [0, 0], c = PAL[i % PAL.length]; lpos[i * 3] = p[0]; lpos[i * 3 + 1] = 1.3; lpos[i * 3 + 2] = p[1]; lcol[i * 3] = c[0]; lcol[i * 3 + 1] = c[1]; lcol[i * 3 + 2] = c[2]; }
    lgeo.attributes.position.needsUpdate = true; lgeo.attributes.color.needsUpdate = true;
  }

  // ---------------- plaza market stalls
  const market = new T.Group(); market.visible = false; scene.add(market);
  const stallCols = [];
  { const wood = new T.MeshToonMaterial({ color: 0x8a5a36 }), cols = [0xe85d5d, 0x4a8fc4, 0xe0b25a], white = new T.MeshToonMaterial({ color: 0xf6f1e8 });
    [225, 270, 315].forEach((deg, i) => {
      const a = (deg * Math.PI) / 180, x = Math.cos(a) * 11, z = 108 + Math.sin(a) * 11, g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, 108 - z + 0.0001); market.add(g);
      const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
      g.add(at(new T.Mesh(new T.BoxGeometry(2.8, 0.9, 1.3), wood), 0, 0.45, 0));
      [[-1.3, -0.55], [1.3, -0.55], [-1.3, 0.55], [1.3, 0.55]].forEach(([px, pz]) => g.add(at(new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 2.4, 6), wood), px, 1.2, pz)));
      for (let k = 0; k < 6; k++) { const s = new T.Mesh(new T.BoxGeometry(0.5, 0.06, 1.7), new T.MeshToonMaterial({ color: k % 2 ? white.color : cols[i] })); s.position.set(-1.25 + k * 0.5, 2.5 - 0.04 * Math.abs(k - 2.5), 0); s.rotation.x = 0.22; g.add(s); }
      for (let k = 0; k < 5; k++) { const goods = new T.Mesh(new T.SphereGeometry(0.17, 8, 6), new T.MeshToonMaterial({ color: [0xe8833a, 0xd94f4f, 0xf2c94c, 0x7ad1b0, 0xc99ad1][(k + i) % 5] })); goods.position.set(-1 + k * 0.5, 1.07, 0); g.add(goods); }
      const c = { x, z, r: 0.01 }; stallCols.push(c); world.colliders.push(c);
    });
  }

  // ---------------- fireworks
  const NF = 520, fpos = new Float32Array(NF * 3), fcol = new Float32Array(NF * 3), fvel = new Float32Array(NF * 3), flife = new Float32Array(NF), fbase = new Float32Array(NF * 3);
  const fgeo = new T.BufferGeometry(); fgeo.setAttribute('position', new T.BufferAttribute(fpos, 3)); fgeo.setAttribute('color', new T.BufferAttribute(fcol, 3));
  const fmat = new T.PointsMaterial({ map: glowTex('rgba(255,255,255,1)', 'rgba(255,255,255,0.5)'), size: 2.6, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false });
  const fire = new T.Points(fgeo, fmat); fire.frustumCulled = false; fire.visible = false; scene.add(fire);
  let fi = 0, rockets = [], nextShot = 0;
  const FPAL = [[1, 0.5, 0.5], [1, 0.85, 0.4], [0.5, 0.8, 1], [0.7, 1, 0.6], [0.9, 0.6, 1], [1, 1, 1]];
  function emit(x, y, z, vx, vy, vz, col, life) { const i = fi; fi = (fi + 1) % NF; fpos.set([x, y, z], i * 3); fvel.set([vx, vy, vz], i * 3); fbase.set(col, i * 3); fcol.set(col, i * 3); flife[i] = life; }
  function burst(x, y, z) {
    const col = FPAL[Math.floor(rng() * FPAL.length)], n = 70, ring = rng() > 0.6;
    for (let k = 0; k < n; k++) {
      const a = rng() * Math.PI * 2, b = ring ? 0 : Math.acos(rng() * 2 - 1), sp = 10 + rng() * 7;
      emit(x, y, z, Math.cos(a) * Math.sin(b + (ring ? Math.PI / 2 : 0)) * sp, Math.cos(b + (ring ? Math.PI / 2 : 0)) * sp * (ring ? 0.3 : 1), Math.sin(a) * Math.sin(b + (ring ? Math.PI / 2 : 0)) * sp, col, 1.7 + rng() * 0.7);
    }
  }
  function launch() { const x = (rng() * 2 - 1) * 38, z = (rng() * 2 - 1) * 30; rockets.push({ x, y: 2, z, vy: 30 + rng() * 6 }); }
  function stepFire(dt, t) {
    if (cur.festival) { nextShot -= dt; if (nextShot <= 0) { launch(); nextShot = 1.1 + rng() * 2; } }
    rockets = rockets.filter((r) => { r.y += r.vy * dt; r.vy -= 12 * dt; emit(r.x, r.y, r.z, 0, -2, 0, [1, 0.9, 0.7], 0.5); if (r.vy <= 0) { burst(r.x, r.y, r.z); return false; } return true; });
    for (let i = 0; i < NF; i++) {
      if (flife[i] <= 0) { fpos[i * 3 + 1] = -50; continue; }
      flife[i] -= dt; const k = clamp(flife[i] / 1.2, 0, 1);
      fvel[i * 3 + 1] -= 7 * dt; fvel[i * 3] *= 1 - 0.8 * dt; fvel[i * 3 + 2] *= 1 - 0.8 * dt;
      fpos[i * 3] += fvel[i * 3] * dt; fpos[i * 3 + 1] += fvel[i * 3 + 1] * dt; fpos[i * 3 + 2] += fvel[i * 3 + 2] * dt;
      fcol[i * 3] = fbase[i * 3] * k; fcol[i * 3 + 1] = fbase[i * 3 + 1] * k; fcol[i * 3 + 2] = fbase[i * 3 + 2] * k;
    }
    fgeo.attributes.position.needsUpdate = true; fgeo.attributes.color.needsUpdate = true;
  }

  let clock = 0;
  function update(dt, hour, day, player) {
    clock += dt;
    const now = schedule(hour, day);
    for (const k of Object.keys(forced)) if (forced[k] !== null) now[k] = forced[k];
    for (const k of Object.keys(now)) {
      if (now[k] !== cur[k]) {
        cur[k] = now[k];
        if (k === 'lantern') { lanterns.visible = now[k]; if (now[k]) spawnLanterns(); }
        if (k === 'market') { market.visible = now[k]; stallCols.forEach((c) => { c.r = now[k] ? 1.7 : 0.01; }); }
        if (k === 'festival') { fire.visible = now[k] || fire.visible; nextShot = 0.5; }
        if (hooks.onChange) hooks.onChange(k, now[k]);
      }
    }
    if (!cur.festival && rockets.length === 0 && fire.visible && clock % 3 < dt) fire.visible = false; // hide once particles are gone
    if (cur.lantern) {
      for (let i = 0; i < NL; i++) {
        if (got[i]) { lpos[i * 3 + 1] = -30; continue; }
        lpos[i * 3 + 1] = 1.3 + Math.sin(clock * 1.6 + i) * 0.22;
        if (player.onIce && Math.hypot(player.x - lpos[i * 3], player.z - lpos[i * 3 + 2]) < 2.4) {
          got[i] = 1; lanternCount++;
          if (hooks.onLantern) hooks.onLantern(lanternCount, NL, lpos[i * 3], lpos[i * 3 + 2]);
        }
      }
      lgeo.attributes.position.needsUpdate = true;
      lmat.size = 5.8 + Math.sin(clock * 3) * 0.4;
    }
    if (fire.visible) stepFire(dt, clock);
  }
  return {
    update, active: () => Object.keys(cur).filter((k) => cur[k]), on: (k) => cur[k],
    lanterns: () => ({ got: lanternCount, total: NL }), info: EVENT_INFO,
    lanternPositions: () => Array.from({ length: NL }, (_, i) => [lpos[i * 3], lpos[i * 3 + 2]]),
    // dev / test helper
    force(k, v) { forced[k] = v === null ? null : !!v; },
    dispose() { scene.remove(lanterns, market, fire); },
  };
}
