// Pure collision: circle vs axis-aligned building footprints, plus map bounds.
import { HALF } from './city.js';

/** Spatial hash of buildings for fast queries. */
export function buildGrid(buildings, cell = 20) {
  const grid = new Map();
  buildings.forEach((b, idx) => {
    const x0 = Math.floor((b.x - b.w / 2) / cell), x1 = Math.floor((b.x + b.w / 2) / cell);
    const z0 = Math.floor((b.z - b.d / 2) / cell), z1 = Math.floor((b.z + b.d / 2) / cell);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const k = i + ',' + j;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(idx);
    }
  });
  return { grid, cell, buildings };
}

/** Move a circle by (dx,dz) and resolve overlaps. Returns new {x,z}. */
export function moveCircle(world, x, z, dx, dz, r) {
  let nx = x + dx, nz = z + dz;
  const lim = HALF - 1 - r;
  const { grid, cell, buildings } = world;
  const ci = Math.floor(nx / cell), cj = Math.floor(nz / cell);
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
    const list = grid.get(i + ',' + j);
    if (!list) continue;
    for (const idx of list) {
      const b = buildings[idx];
      const hx = b.w / 2, hz = b.d / 2;
      const px = Math.max(b.x - hx, Math.min(nx, b.x + hx));
      const pz = Math.max(b.z - hz, Math.min(nz, b.z + hz));
      let ox = nx - px, oz = nz - pz;
      const d2 = ox * ox + oz * oz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          nx = px + (ox / d) * r; nz = pz + (oz / d) * r;
        } else {
          // center inside box: push out along smallest axis
          const ex = hx - Math.abs(nx - b.x), ez = hz - Math.abs(nz - b.z);
          if (ex < ez) nx = b.x + Math.sign(nx - b.x || 1) * (hx + r);
          else nz = b.z + Math.sign(nz - b.z || 1) * (hz + r);
        }
      }
    }
  }
  nx = Math.max(-lim, Math.min(lim, nx));
  nz = Math.max(-lim, Math.min(lim, nz));
  return { x: nx, z: nz };
}

/** Vertical correction: lift an animated rig only enough to prevent sole penetration. */
export function groundCorrection(surfaceY, lowestSoleY, tolerance = 0.002) {
  return Math.max(0, surfaceY - lowestSoleY - tolerance);
}

/** Push apart overlapping characters (simple pairwise separation). */
export function separate(agents, r = 0.6) {
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    if (a.dead) continue;
    for (let j = i + 1; j < agents.length; j++) {
      const b = agents[j];
      if (b.dead) continue;
      const ra = (a.radius || r), rb = (b.radius || r);
      const dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      const min = ra + rb;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const ux = dx / d, uz = dz / d;
        if (!a.fixed) { a.x -= ux * push; a.z -= uz * push; }
        if (!b.fixed) { b.x += ux * push; b.z += uz * push; }
      }
    }
  }
}
