// Pure city layout: road grid, building lots, gang territories. No DOM / THREE.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MAP_SIZE = 300;
export const HALF = MAP_SIZE / 2;
export const CELLS = 8;
export const CELL = MAP_SIZE / CELLS; // 37.5
export const ROAD = 10;
export const NEUTRAL_RADIUS = 34;

export const GANGS = [
  { id: 0, name: 'Red Wolves', color: 0xd8312a, css: '#e0412f', angle: 0 },
  { id: 1, name: 'Blue Dragons', color: 0x2f6be0, css: '#3f7cf0', angle: (2 * Math.PI) / 3 },
  { id: 2, name: 'Golden Cobras', color: 0xe0a91f, css: '#f0b52a', angle: (4 * Math.PI) / 3 },
];

/** Gang id owning the point, or -1 for the neutral central plaza. Sector 0 is north (-z). */
export function territoryAt(x, z) {
  if (Math.hypot(x, z) < NEUTRAL_RADIUS) return -1;
  let a = Math.atan2(x, -z); // 0 = north, clockwise towards +x
  a = (a + Math.PI / 3 + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(a / ((2 * Math.PI) / 3)) % 3;
}

/** Headquarters location of a gang (deep inside its sector, on a road crossing). */
export function gangHQ(id) {
  const a = GANGS[id].angle;
  const r = 100;
  return { x: Math.sin(a) * r, z: -Math.cos(a) * r };
}

export function cellCenter(i) {
  return -HALF + CELL * (i + 0.5);
}

/**
 * Builds the city: list of buildings {x,z,w,d,h,gang,style}, parks, plaza.
 * Buildings are axis-aligned boxes; collision uses their footprint.
 */
export function generateCity(seed = 1337) {
  const rnd = mulberry32(seed);
  const buildings = [];
  const parks = [];
  const blockInset = ROAD / 2;
  const hqs = GANGS.map((g) => gangHQ(g.id));
  for (let i = 0; i < CELLS; i++) {
    for (let j = 0; j < CELLS; j++) {
      const cx = cellCenter(i);
      const cz = cellCenter(j);
      const size = CELL - ROAD;
      const block = { x: cx, z: cz, size };
      // central plaza: the 4 middle cells
      if ((i === 3 || i === 4) && (j === 3 || j === 4)) {
        parks.push({ ...block, kind: 'plaza' });
        continue;
      }
      // keep an open yard where a HQ sits
      if (hqs.some((h) => Math.abs(h.x - cx) <= CELL / 2 + 0.01 && Math.abs(h.z - cz) <= CELL / 2 + 0.01)) {
        parks.push({ ...block, kind: 'yard', gang: territoryAt(cx, cz) });
        continue;
      }
      if (rnd() < 0.12) {
        parks.push({ ...block, kind: 'park' });
        continue;
      }
      const gang = territoryAt(cx, cz);
      const split = rnd();
      const lots = [];
      const s = size - 2; // sidewalk margin
      if (split < 0.3) lots.push({ x: cx, z: cz, w: s, d: s });
      else if (split < 0.6) {
        const w = s / 2 - 0.6;
        lots.push({ x: cx - s / 4, z: cz, w, d: s });
        lots.push({ x: cx + s / 4, z: cz, w, d: s });
      } else {
        const w = s / 2 - 0.6;
        for (const ox of [-1, 1]) for (const oz of [-1, 1]) lots.push({ x: cx + (ox * s) / 4, z: cz + (oz * s) / 4, w, d: w });
      }
      const distC = Math.hypot(cx, cz);
      for (const l of lots) {
        const tall = distC < 90 ? 1.4 : 1;
        buildings.push({
          x: l.x, z: l.z,
          w: l.w * (0.82 + rnd() * 0.12), d: l.d * (0.82 + rnd() * 0.12),
          h: (8 + rnd() * 26) * tall,
          gang, style: Math.floor(rnd() * 4),
        });
      }
    }
  }
  void blockInset;
  return { buildings, parks, hqs };
}

/** True when point (x,z) with radius r overlaps any building footprint. */
export function blockedAt(buildings, x, z, r = 0) {
  if (Math.abs(x) > HALF - 1 - r || Math.abs(z) > HALF - 1 - r) return true;
  for (const b of buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r) return true;
  }
  return false;
}

/** Random walkable point inside a gang's sector (rejection sampling). */
export function randomPointInTerritory(rnd, buildings, gang, minR = 40, maxR = 140) {
  for (let k = 0; k < 200; k++) {
    const x = (rnd() * 2 - 1) * (HALF - 4);
    const z = (rnd() * 2 - 1) * (HALF - 4);
    const d = Math.hypot(x, z);
    if (d < minR || d > maxR) continue;
    if (territoryAt(x, z) !== gang) continue;
    if (blockedAt(buildings, x, z, 1.5)) continue;
    return { x, z };
  }
  const h = gangHQ(gang);
  return { x: h.x, z: h.z };
}

/** Walking surface height: road 0, sidewalk blocks 0.22, central plaza 0.26. */
export function groundHeight(x, z) {
  const plaza = CELL - ROAD / 2;
  if (Math.abs(x) < plaza && Math.abs(z) < plaza) return 0.26;
  const half = (CELL - ROAD) / 2;
  const lx = (((x + HALF) % CELL) + CELL) % CELL - CELL / 2;
  const lz = (((z + HALF) % CELL) + CELL) % CELL - CELL / 2;
  return Math.abs(lx) < half && Math.abs(lz) < half ? 0.22 : 0;
}
