// Pure city plan: road grid, themed districts, building lots, gang headquarters. No DOM / THREE.
//
//   8 x 8 blocks (37.5 m pitch, 10 m streets) around a 2 x 2 central plaza:
//
//        W W W W W W W W      W = Red Wolves   (north)   industrial docklands, brick and steel
//        W W W W W W W W      D = Blue Dragons (south-east) lantern-lit old town with pagodas
//        C W W W W W W D      C = Golden Cobras (south-west) art-deco casino strip
//        C C C P P D D D      P = neutral central plaza
//        C C C P P D D D
//        C C C C D D D D      Every gang owns whole blocks, so a territory border is always a street.
//        C C C C D D D D      Each HQ is a fenced compound spanning two blocks and the street between them,
//        C C C C D D D D      with its gate on the street that leads in from the plaza.

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
export const BLOCK = CELL - ROAD;     // paved block (sidewalk + lots), 27.5
export const LOT = BLOCK - 4.5;       // buildable square inside a block (2.25 m sidewalk each side), 23

export const GANGS = [
  { id: 0, name: 'Red Wolves', color: 0xd8312a, css: '#e0412f', angle: 0, district: 'The Docks' },
  { id: 1, name: 'Blue Dragons', color: 0x2f6be0, css: '#3f7cf0', angle: (2 * Math.PI) / 3, district: 'Dragon Quarter' },
  { id: 2, name: 'Golden Cobras', color: 0xe0a91f, css: '#f0b52a', angle: (4 * Math.PI) / 3, district: 'Golden Strip' },
];

export function cellCenter(i) {
  return -HALF + CELL * (i + 0.5);
}
export function cellIndex(v) {
  return Math.max(0, Math.min(CELLS - 1, Math.floor((v + HALF) / CELL)));
}

const isPlazaCell = (i, j) => (i === 3 || i === 4) && (j === 3 || j === 4);

/** Gang owning a block, from the angle of its centre (sector 0 is north / -z). */
function sectorGang(cx, cz) {
  let a = Math.atan2(cx, -cz);
  a = (a + Math.PI / 3 + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(a / ((2 * Math.PI) / 3)) % 3;
}

/** Gang id owning the point (whole blocks; streets belong to the block on their side), or -1 for the plaza. */
export function territoryAt(x, z) {
  const i = cellIndex(x), j = cellIndex(z);
  if (isPlazaCell(i, j)) return -1;
  return sectorGang(cellCenter(i), cellCenter(j));
}

// ------------------------------------------------------------------ headquarters
/**
 * Fenced compounds. rect = fenced area, gate = opening in the wall that faces the plaza (on the street leading in),
 * back = side of the main building, (x, z) = centre of the open arena in front of it (the boss spawns here).
 */
export const COMPOUNDS = [
  { gang: 0, name: 'The Den', x: 0, z: -88, rect: { x0: -32.5, x1: 32.5, z0: -107.5, z1: -80 }, gate: { side: 'S', x: 0, z: -80, w: 16 }, back: 'N' },
  { gang: 1, name: 'Dragon Temple', x: 85, z: 37.5, rect: { x0: 80, x1: 107.5, z0: 5, z1: 70 }, gate: { side: 'W', x: 80, z: 37.5, w: 16 }, back: 'E' },
  { gang: 2, name: 'Golden Palace', x: -85, z: 37.5, rect: { x0: -107.5, x1: -80, z0: 5, z1: 70 }, gate: { side: 'E', x: -80, z: 37.5, w: 16 }, back: 'W' },
];

/** Headquarters location of a gang: the middle of its arena. */
export function gangHQ(id) {
  return { x: COMPOUNDS[id].x, z: COMPOUNDS[id].z };
}

const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

/** Solid boxes of one compound: main hall, wings, guard posts and the perimeter fence with its gaps. */
function compoundSolids(c) {
  const s = [];
  const box = (x, z, w, d, h, kind) => s.push({ x, z, w, d, h, gang: c.gang, kind, hq: c.gang });
  const r = c.rect, t = 0.8;
  if (c.gang === 0) {
    box(0, -102.5, 46, 9, 12, 'hq-hall');                       // brick warehouse, the Den
    box(-28, -100.5, 8, 13, 6.2, 'hq-stack'); box(28, -100.5, 8, 13, 6.2, 'hq-stack');   // container stacks
    box(-30.2, -82.4, 3, 3, 11, 'hq-tower'); box(30.2, -82.4, 3, 3, 11, 'hq-tower');     // watch towers
  } else {
    const k = c.gang === 1 ? 1 : -1;                              // 1: east side, -1: west side
    const bx = c.gang === 1 ? 101.5 : -101.5;
    box(bx, 37.5, 12, 18, c.gang === 1 ? 21 : 19, 'hq-hall');
    box(bx, 14.5, 10, 11, 9, 'hq-wing'); box(bx, 60.5, 10, 11, 9, 'hq-wing');
    box(r.x0 === 80 ? 80.5 : -80.5, 37.5 - 9.5, 1.8, 1.8, 9, 'hq-gate'); box(r.x0 === 80 ? 80.5 : -80.5, 37.5 + 9.5, 1.8, 1.8, 9, 'hq-gate');
    void k;
  }
  // perimeter fence (low walls) with gaps: the gate (plaza side) and two side doors
  const wall = (x, z, w, d) => { if (w > 0.2 && d > 0.2) s.push({ x, z, w, d, h: 3.2, gang: c.gang, kind: 'fence', hq: c.gang, low: true }); };
  const hx = (x0, x1, z) => wall((x0 + x1) / 2, z, x1 - x0, t);       // horizontal wall piece
  const vz = (z0, z1, x) => wall(x, (z0 + z1) / 2, t, z1 - z0);       // vertical wall piece
  const g = c.gate.w / 2;
  if (c.gang === 0) {
    hx(r.x0, c.gate.x - g, r.z1 - t / 2); hx(c.gate.x + g, r.x1, r.z1 - t / 2);    // front wall with the gate
    hx(r.x0, r.x1, r.z0 + t / 2);                                                  // back wall
    for (const x of [r.x0 + t / 2, r.x1 - t / 2]) { vz(r.z0, c.z - 4, x); vz(c.z + 4, r.z1, x); }
  } else {
    const fx = c.gang === 1 ? r.x0 + t / 2 : r.x1 - t / 2, bx2 = c.gang === 1 ? r.x1 - t / 2 : r.x0 + t / 2;
    vz(r.z0, c.gate.z - g, fx); vz(c.gate.z + g, r.z1, fx);                        // front wall with the gate
    vz(r.z0, r.z1, bx2);                                                           // back wall
    for (const z of [r.z0 + t / 2, r.z1 - t / 2]) { hx(r.x0, c.x - 4, z); hx(c.x + 4, r.x1, z); }
  }
  return s;
}

// ------------------------------------------------------------------ block kinds per district
// weights by ring: 3.5 = map edge, 2.5 = middle, 1.5 = next to the plaza
const KINDS = [
  { // Red Wolves: docklands
    3.5: { scrapyard: 3, warehouse: 4, containers: 3 },
    2.5: { factory: 3, warehouse: 3, tenement: 3, lot: 1, scrapyard: 1 },
    1.5: { tenement: 6, warehouse: 2, lot: 2 },
  },
  { // Blue Dragons: lantern quarter
    3.5: { market: 1, shophouse: 4, garden: 3, tower: 1 },
    2.5: { shophouse: 5, market: 1, tower: 2, garden: 2 },
    1.5: { shophouse: 5, tower: 3, garden: 1 },
  },
  { // Golden Cobras: casino strip
    3.5: { casino: 3, deco: 3, boulevard: 2, hotel: 2 },
    2.5: { deco: 4, casino: 2, hotel: 2, boulevard: 1 },
    1.5: { deco: 6, hotel: 2, boulevard: 1 },
  },
];
const LANDMARK = ['factory', 'market', 'casino'];

function pick(rnd, weights) {
  const entries = Object.entries(weights);
  let r = rnd() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries[0][0];
}

/** Lots (building footprints) for one block of a given kind. h in metres. */
function lotsFor(kind, cx, cz, rnd, gang) {
  const s = LOT, out = [];
  const add = (dx, dz, w, d, h, extra = {}) => out.push({ x: cx + dx, z: cz + dz, w, d, h, ...extra });
  const R = (a, b) => a + rnd() * (b - a);
  switch (kind) {
    case 'warehouse': {
      const w = R(19, s), d = R(15, 18);
      const side = rnd() < 0.5 ? -1 : 1;
      add(0, side * (s - d) / 2, w, d, R(8, 12), { kind });
      break;
    }
    case 'factory': add(-1.5, -2.5, R(17, 20), R(12, 14), R(11, 15), { kind }); add(7, 8.5, 6, 6, R(5, 7), { kind: 'warehouse' }); break;
    case 'tenement': {
      const mode = rnd();
      if (mode < 0.5) { add(-5.8, 0, 10.5, s, R(16, 26), { kind }); add(5.8, 0, 10.5, s, R(13, 24), { kind }); }
      else for (const ox of [-1, 1]) for (const oz of [-1, 1]) add(ox * 5.8, oz * 5.8, 10.5, 10.5, R(14, 27), { kind });
      break;
    }
    case 'shophouse': {
      // two rows of narrow tiled-roof houses facing the streets, with an alley between
      const n = 3, w = (s - 2) / n;
      for (let r = 0; r < 2; r++) for (let k = 0; k < n; k++) add(-s / 2 + 1 + w * (k + 0.5), (r ? 1 : -1) * 6.9, w - 0.5, 9.6, R(9, 17), { kind, row: r });
      break;
    }
    case 'tower': add(0, 0, R(15, 18), R(15, 18), R(30, 46), { kind }); break;
    case 'deco': add(0, 0, R(17, 21), R(17, 21), R(30, 50), { kind }); break;
    case 'hotel': add(-2, 0, R(19, 21), R(10, 12), R(20, 30), { kind }); add(7.5, 0, 6, 12, 8, { kind: 'shop' }); break;
    case 'casino': add(0, -2.5, R(20, s - 1), R(14, 16), R(13, 17), { kind }); break;
    default: break;
  }
  void gang;
  return out;
}

/**
 * Builds the city: buildings {x,z,w,d,h,gang,kind,style,seed} (axis-aligned solids), open blocks (parks),
 * compounds, and the per-block plan.
 */
export function generateCity(seed = 1337) {
  const rnd = mulberry32(seed);
  const buildings = [], parks = [], plan = [];
  const hqCells = new Set();
  for (const c of COMPOUNDS) {
    for (let i = 0; i < CELLS; i++) for (let j = 0; j < CELLS; j++) {
      const cx = cellCenter(i), cz = cellCenter(j), h = BLOCK / 2;
      if (inRect(c.rect, cx - h + 0.1, cz - h + 0.1) && inRect(c.rect, cx + h - 0.1, cz + h - 0.1)) hqCells.add(i + ',' + j);
    }
  }
  const cells = [];
  for (let i = 0; i < CELLS; i++) for (let j = 0; j < CELLS; j++) cells.push({ i, j, cx: cellCenter(i), cz: cellCenter(j) });
  for (const c of cells) {
    c.ring = Math.max(Math.abs(c.i - 3.5), Math.abs(c.j - 3.5));
    c.gang = isPlazaCell(c.i, c.j) ? -1 : sectorGang(c.cx, c.cz);
    if (isPlazaCell(c.i, c.j)) c.kind = 'plaza';
    else if (hqCells.has(c.i + ',' + c.j)) c.kind = 'hq';
    else c.kind = pick(rnd, KINDS[c.gang][c.ring]);
  }
  // every gang gets at least one landmark block in its middle ring, far from its own HQ
  for (let g = 0; g < 3; g++) {
    const hq = gangHQ(g);
    const cand = cells.filter((c) => c.gang === g && c.kind !== 'hq' && c.ring >= 2.5).sort((a, b) => Math.hypot(b.cx - hq.x, b.cz - hq.z) - Math.hypot(a.cx - hq.x, a.cz - hq.z));
    for (const c of cand.slice(0, g === 1 ? 1 : 2)) c.kind = LANDMARK[g];
    // the two blocks next to the HQ gate are always something lively, never a dead lot
  }
  const OPEN = new Set(['scrapyard', 'containers', 'lot', 'market', 'garden', 'boulevard', 'plaza', 'hq']);
  for (const c of cells) {
    plan.push({ i: c.i, j: c.j, x: c.cx, z: c.cz, gang: c.gang, kind: c.kind, ring: c.ring });
    if (OPEN.has(c.kind)) { parks.push({ x: c.cx, z: c.cz, size: BLOCK, kind: c.kind, gang: c.gang, i: c.i, j: c.j }); continue; }
    for (const l of lotsFor(c.kind, c.cx, c.cz, rnd, c.gang)) {
      buildings.push({ ...l, gang: c.gang, style: Math.floor(rnd() * 4), seed: Math.floor(rnd() * 1e6), cell: [c.i, c.j] });
    }
  }
  for (const c of COMPOUNDS) for (const s of compoundSolids(c)) buildings.push({ ...s, style: 0, seed: Math.floor(rnd() * 1e6) });
  const hqs = COMPOUNDS.map((c) => ({ x: c.x, z: c.z }));
  const tall = buildings.filter((b) => !b.low && b.h >= 4);
  return { buildings, tall, parks, hqs, plan, compounds: COMPOUNDS };
}

/** True when point (x,z) with radius r overlaps any building footprint. */
export function blockedAt(buildings, x, z, r = 0) {
  if (Math.abs(x) > HALF - 1 - r || Math.abs(z) > HALF - 1 - r) return true;
  for (const b of buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r) return true;
  }
  return false;
}

/** Random walkable point inside a gang's territory (rejection sampling). */
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

/** Walking surface height: road 0, sidewalk blocks 0.22, HQ courtyards 0.22, central plaza 0.26. */
export function groundHeight(x, z) {
  const plaza = CELL - ROAD / 2;
  if (Math.abs(x) < plaza && Math.abs(z) < plaza) return 0.26;
  for (const c of COMPOUNDS) if (inRect(c.rect, x, z)) return 0.22;
  const half = (CELL - ROAD) / 2;
  const lx = (((x + HALF) % CELL) + CELL) % CELL - CELL / 2;
  const lz = (((z + HALF) % CELL) + CELL) % CELL - CELL / 2;
  return Math.abs(lx) < half && Math.abs(lz) < half ? 0.22 : 0;
}
