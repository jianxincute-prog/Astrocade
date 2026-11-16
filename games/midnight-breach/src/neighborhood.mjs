import { T } from './three-loader.mjs';

// Walkable area of the housing complex (x = east, z = south). Beyond this is decor hidden by fog.
export const BOUNDS = { x1: -36, x2: 38, z1: -13.5, z2: 25.5 };
export const NPC_SPOTS = {
  wati: { x: -4.0, z: 24.2, face: -Math.PI },  // faces north towards the road
  darto: { x: 17.2, z: 6.5, face: 0 },          // on his terrace, faces south
};
const ROAD = { z1: 15, z2: 21, cx1: 26, cx2: 32 };

export function zoneAt(x, z) {
  if (z >= ROAD.z1 && z <= ROAD.z2) return 'Jalan raya';
  if (x >= ROAD.cx1 && x <= ROAD.cx2) return 'Jalan komplek';
  if (x >= -10 && x <= 10 && z >= -13 && z <= 13.4) return 'Halaman';
  return 'Komplek';
}

/**
 * Builds the neighbourhood around the player's house. Static pieces are plain boxes that
 * world.mjs merges per material afterwards, so this adds few draw calls.
 * ctx = { group, box, floor, M, glow, winMat, lampMat }
 */
export function buildNeighborhood(ctx) {
  const { group, box, floor, M, glow, lampMat } = ctx;
  const movers = [];
  const lampSpots = [];
  const crownGeo = new T.IcosahedronGeometry(1.5, 0);

  // ---------- Ground, roads, sidewalks ----------
  box(180, 0.12, 120, 0, 10, 0x2a4a38, { y0: -0.22 });             // lawn base
  const flat = (x1, x2, z1, z2, color, y0 = -0.14, h = 0.1) => box(x2 - x1, h, z2 - z1, (x1 + x2) / 2, (z1 + z2) / 2, color, { y0 });
  flat(-90, 90, ROAD.z1, ROAD.z2, 0x2a2c36);                         // main road
  flat(ROAD.cx1, ROAD.cx2, -50, 70, 0x2a2c36);                       // cross street
  const walk = 0x55555e;
  for (const [a, b] of [[-90, ROAD.cx1 - 1.6], [ROAD.cx2 + 1.6, 90]]) {
    flat(a, b, 13.4, 15, walk, -0.14, 0.16);
    flat(a, b, 21, 22.6, walk, -0.14, 0.16);
  }
  for (const [a, b] of [[-50, 13.4], [22.6, 70]]) {
    flat(ROAD.cx1 - 1.6, ROAD.cx1, a, b, walk, -0.14, 0.16);
    flat(ROAD.cx2, ROAD.cx2 + 1.6, a, b, walk, -0.14, 0.16);
  }
  // lane markings
  for (let x = -60; x <= 60; x += 4) if (x < ROAD.cx1 - 1 || x > ROAD.cx2 + 1) flat(x - 1, x + 1, 17.93, 18.07, 0xe0dca8, -0.04, 0.02);
  for (let z = -40; z <= 60; z += 4) if (z < ROAD.z1 - 1 || z > ROAD.z2 + 1) flat(28.93, 29.07, z - 1, z + 1, 0xe0dca8, -0.04, 0.02);
  for (let i = 0; i < 7; i++) flat(1.6 + i * 0.8, 2.1 + i * 0.8, ROAD.z1 + 0.2, ROAD.z2 - 0.2, 0xd8d8dc, -0.04, 0.02); // zebra crossing

  // ---------- Fences around the player's lot (gate stays open) ----------
  const GATE = [-0.5, 2.5];
  for (let x = -10; x <= 10; x += 2) if (x < GATE[0] || x > GATE[1]) box(0.18, 0.9, 0.18, x, 13.2, 0x8a7a62);
  box(GATE[0] + 10, 0.12, 0.1, (-10 + GATE[0]) / 2, 13.2, 0x8a7a62, { y0: 0.55, collide: true });
  box(10 - GATE[1], 0.12, 0.1, (GATE[1] + 10) / 2, 13.2, 0x8a7a62, { y0: 0.55, collide: true });
  for (let x = -10; x <= 10; x += 2) box(0.18, 0.9, 0.18, x, -12.8, 0x8a7a62);
  box(20, 0.12, 0.1, 0, -12.8, 0x8a7a62, { y0: 0.55, collide: true });
  box(0.25, 1.1, 0.25, 4.0, 8.4, 0x6a4a2e, { collide: true });                   // mailbox post
  box(0.7, 0.45, 0.5, 4.0, 8.4, 0x3a5aa0, { y0: 1.1 });

  // ---------- Props ----------
  const tree = (x, z, s = 1) => {
    box(0.5 * s, 1.5 * s, 0.5 * s, x, z, 0x5a3e2a, { collide: true });
    const crown = new T.Mesh(crownGeo, M(0x2f6a46));
    crown.scale.setScalar(s);
    crown.position.set(x, 2.6 * s, z);
    group.add(crown);
  };
  const bush = (x, z) => box(0.9, 0.5, 0.9, x, z, 0x2e5a3c);
  const lamp = (x, z) => {
    lampSpots.push({ x, z });
    box(0.14, 3.0, 0.14, x, z, 0x2a2a34);
    box(0.6, 0.16, 0.6, x, z, 0, { y0: 3.0, mat: lampMat });
  };
  const car = (x, z, color, { mover = false } = {}) => {
    const parts = [];
    const part = (w, h, d, dx, dy, dz, c, mat) => parts.push({ w, h, d, dx, dy, dz, c, mat });
    part(2.5, 0.55, 1.15, 0, 0.3, 0, color);
    part(1.3, 0.45, 1.0, -0.1, 0.85, 0, color);
    part(0.06, 0.2, 0.28, 1.27, 0.55, -0.38, 0, glow(0xfff2c0));
    part(0.06, 0.2, 0.28, 1.27, 0.55, 0.38, 0, glow(0xfff2c0));
    part(0.06, 0.18, 0.28, -1.27, 0.55, -0.38, 0, glow(0xff4a4a));
    part(0.06, 0.18, 0.28, -1.27, 0.55, 0.38, 0, glow(0xff4a4a));
    for (const [wx, wz] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]]) part(0.5, 0.5, 0.18, wx, 0.25, wz, 0x15151c);
    if (!mover) {
      for (const p of parts) box(p.w, p.h, p.d, x + p.dx, z + p.dz, p.c, { y0: p.dy - p.h / 2 + 0.0, mat: p.mat });
      ctx.colliders.push({ x1: x - 1.25, x2: x + 1.25, z1: z - 0.6, z2: z + 0.6, enabled: true });
      return null;
    }
    const g = new T.Group();
    for (const p of parts) {
      const m = new T.Mesh(new T.BoxGeometry(p.w, p.h, p.d), p.mat || M(p.c));
      m.position.set(p.dx, p.dy, p.dz);
      g.add(m);
    }
    g.position.set(x, 0, z);
    g.userData.keep = true;
    return g;
  };
  const palette = [0x8a6f7a, 0x6a8a8f, 0x9a8a6a, 0x7a7aa0, 0x8a9a78, 0xa08070];
  const roofs = [0x4a2e3a, 0x3a3e52, 0x4e3a2e, 0x2e3e4a];
  let hi = 0;
  // A closed house. facing 's' = door on the south face (z2), 'n' = door on the north face (z1).
  const house = (x1, x2, z1, z2, facing, { lit = [] } = {}) => {
    const w = x2 - x1, d = z2 - z1, h = 2.5, cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const wall = palette[hi % palette.length], roof = roofs[hi % roofs.length];
    hi++;
    box(w, h, d, cx, cz, wall, { collide: true });
    const cone = new T.ConeGeometry(1, 1, 4, 1);
    cone.rotateY(Math.PI / 4);
    const rm = new T.Mesh(cone, M(roof));
    rm.scale.set(w / 1.414 * 1.12, 1.5, d / 1.414 * 1.12);
    rm.position.set(cx, h + 0.75, cz);
    group.add(rm);
    const fz = facing === 's' ? z2 : z1, dir = facing === 's' ? 1 : -1;
    box(0.95, 1.7, 0.1, cx, fz + dir * 0.04, 0x5a3a2a);
    box(1.4, 0.15, 0.7, cx, fz + dir * 0.4, 0x6a6a72);                                   // step
    [-1, 1].forEach((side, i) => {
      const wx = cx + side * Math.min(2.0, w * 0.3);
      box(0.95, 0.7, 0.08, wx, fz + dir * 0.04, 0, { y0: 1.0, mat: lit.includes(i) ? ctx.warmWin : ctx.coolWin });
    });
    return { x: cx, z: fz + dir * 1.2 };
  };

  // ---------- Houses on the player's side of the street ----------
  const darto = house(13, 21, -3, 5, 's', { lit: [1] });              // Pak Darto
  box(0.08, 0.7, 0.08, 18.6, 6.3, 0x3a2a1a);                          // bird cage pole
  box(0.5, 0.5, 0.5, 18.6, 6.3, 0xc8a85a, { y0: 1.0 });
  house(-21, -13, -3, 5, 's', { lit: [0] });
  house(-33, -25, -3, 5, 's');
  house(36, 44, -3, 5, 's', { lit: [0, 1] });                         // decor, beyond the bounds
  house(-45, -37, -3, 5, 's');
  house(13, 21, -12, -6, 's');                                        // backyard row
  house(-21, -13, -12, -6, 's', { lit: [1] });
  // ---------- Houses across the road ----------
  house(-32, -24, 26, 32, 'n');
  house(-22, -14, 26, 32, 'n', { lit: [1] });
  const wati = house(-8, 0, 26, 32, 'n', { lit: [0, 1] });            // Bu Wati
  house(6, 14, 26, 32, 'n');
  house(15, 23, 26, 32, 'n', { lit: [0] });
  house(36, 44, 26, 32, 'n');
  house(-44, -36, 26, 32, 'n', { lit: [1] });
  void darto; void wati;

  // ---------- Trees, bushes, lamps ----------
  for (const [x, z] of [[-9.5, 9], [-26, 9], [10.5, 10], [23, 8], [-14, 24.2], [10, 24.2], [-30, 23.6], [20, 24.2], [34.8, 3], [34.8, -8], [-34, 10], [24, -8], [-24, -9]]) tree(x, z, 1 + ((Math.abs(x) + z) % 3) * 0.12);
  for (const [x, z] of [[-4, 7.4], [-2.6, 8.1], [8.8, 7.6], [-12.6, 5.9], [14, 5.9], [17.5, 5.9], [-1, 25], [-6.5, 25]]) bush(x, z);
  for (let x = -34; x <= 34; x += 10) if (x < ROAD.cx1 - 2 || x > ROAD.cx2 + 2) { lamp(x, 14.2); lamp(x + 5, 21.8); }
  for (const z of [-10, 0, 8, 26]) { lamp(ROAD.cx1 - 0.8, z); lamp(ROAD.cx2 + 0.8, z + 4); }

  // ---------- Pos ronda & warung ----------
  box(2.6, 2.1, 2.0, 21.2, 11.2, 0x7a6a4a, { collide: true });
  const post = new T.Mesh(new T.ConeGeometry(1, 1, 4, 1).rotateY(Math.PI / 4), M(0x3e2e22));
  post.scale.set(2.2, 0.9, 1.7);
  post.position.set(21.2, 2.55, 11.2);
  group.add(post);
  box(0.9, 0.6, 0.06, 21.2, 12.22, 0, { y0: 1.0, mat: ctx.warmWin });
  box(1.8, 0.4, 0.5, 21.2, 13.0, 0x5a3e2a, { collide: true });          // bench
  box(3.2, 1.0, 1.0, 36, 11.6, 0x6a4a2e, { collide: true });             // warung counter
  box(3.6, 0.15, 1.8, 36, 11.2, 0x2e5a7a, { y0: 2.3 });
  box(2.4, 0.5, 0.06, 36, 12.2, 0, { y0: 2.35, mat: ctx.signMat });
  box(3.2, 2.3, 0.3, 36, 10.4, 0x4a3a2a, { collide: true });

  // ---------- Cars ----------
  car(-17, 8.2, 0xb04a4a);                                          // in the west neighbour's driveway
  car(-12, 20.0, 0x4a6ab0);                                         // parked at the south curb
  car(40, 20.0, 0xc0b060);
  car(8, 20.0, 0x5a5a66);
  const drive = (x, z, color, speed) => {
    const g = car(x, z, color, { mover: true });
    if (speed < 0) g.rotation.y = Math.PI;
    group.add(g);
    const col = { x1: 0, x2: 0, z1: 0, z2: 0, enabled: true };
    movers.push({ g, col, speed, z, lo: -62, hi: 62 });
    return col;
  };
  const moverCols = [drive(-30, 16.6, 0xd0d0d8, 5.5), drive(40, 19.4, 0x3a8a6a, -4.5)];

  return {
    movers,
    lampSpots,
    moverCols,
    spots: { wati: { x: NPC_SPOTS.wati.x, z: NPC_SPOTS.wati.z }, darto: { x: NPC_SPOTS.darto.x, z: NPC_SPOTS.darto.z } },
    update(dt) {
      for (const m of movers) {
        m.g.position.x += m.speed * dt;
        if (m.g.position.x > m.hi) m.g.position.x = m.lo;
        if (m.g.position.x < m.lo) m.g.position.x = m.hi;
        m.col.x1 = m.g.position.x - 1.3; m.col.x2 = m.g.position.x + 1.3;
        m.col.z1 = m.z - 0.65; m.col.z2 = m.z + 0.65;
      }
    },
  };
}
