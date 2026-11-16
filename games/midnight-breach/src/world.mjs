import { T } from './three-loader.mjs';
import { buildNeighborhood, zoneAt } from './neighborhood.mjs';
import { buildDoors } from './doors.mjs';
import { buildInterior } from './interior.mjs';
import { createWatchers } from './watchers.mjs';

const WALL_H = 1.7;
const WALL_T = 0.3;

// Interactable spots (x, z) in house coordinates. x = east, z = south (towards the camera).
export const SPOTS = {
  start: { x: -5.2, z: -3.0 },
  tiket: { x: -3.1, z: -1.1, label: 'Meja belajar' },
  ketukan: { x: 3.3, z: -5.0, label: 'Lemari tua' },
  resi: { x: -6.3, z: 1.0, label: 'Kulkas' },
  surat: { x: 4.0, z: 8.4, label: 'Kotak surat' },
  cctv: { x: 6.6, z: 4.9, label: 'Monitor CCTV' },
  gudangDoor: { x: 4.0, z: -3.0, label: 'Pintu gudang' },
  rani: { x: 6.3, z: -3.2 },
};

// Rooms are used for the ambient mood and for the HUD location chip.
export const ROOMS = [
  { id: 'Kamar', x1: -8, x2: -2, z1: -6, z2: 0 },
  { id: 'Ruang tamu', x1: -2, x2: 4, z1: -6, z2: 0 },
  { id: 'Gudang', x1: 4, x2: 8, z1: -6, z2: 0 },
  { id: 'Dapur', x1: -8, x2: -2, z1: 0, z2: 6 },
  { id: 'Ruang makan', x1: -2, x2: 8, z1: 0, z2: 6 },
];
export function roomAt(x, z) {
  return ROOMS.find(r => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2)?.id || zoneAt(x, z);
}

export function buildWorld(quality = { shadows: false }) {
  const group = new T.Group();
  const colliders = []; // {x1,x2,z1,z2, enabled}
  const mats = new Map();
  const M = (color, extra = {}) => {
    const key = color + JSON.stringify(extra);
    if (!mats.has(key)) {
      const mat = new T.MeshLambertMaterial({ color, flatShading: true, ...extra });
      mat.userData.plain = Object.keys(extra).length === 0; // plain colours merge into one vertex-coloured mesh
      mats.set(key, mat);
    }
    return mats.get(key);
  };
  const glow = color => new T.MeshBasicMaterial({ color });
  const geo = new Map();
  const G = (w, h, d) => {
    const key = `${w}|${h}|${d}`;
    if (!geo.has(key)) geo.set(key, new T.BoxGeometry(w, h, d));
    return geo.get(key);
  };
  // box centred at (x, z) with ground-level y0
  const box = (w, h, d, x, z, color, { y0 = 0, collide = false, mat, name, keep = false } = {}) => {
    const mesh = new T.Mesh(G(w, h, d), mat || M(color));
    mesh.position.set(x, y0 + h / 2, z);
    if (name) mesh.name = name;
    if (keep) mesh.userData.keep = true;
    group.add(mesh);
    let col = null;
    if (collide) { col = { x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2, enabled: true }; colliders.push(col); }
    return { mesh, col };
  };
  const floor = (x1, x2, z1, z2, color) => box(x2 - x1, 0.12, z2 - z1, (x1 + x2) / 2, (z1 + z2) / 2, color, { y0: -0.12 });

  // Wall along X (z fixed) or along Z (x fixed), with door gaps [a,b].
  const wall = (axis, fixed, from, to, gaps = [], color = 0x5b5f86) => {
    const cuts = [from, ...gaps.flat(), to];
    for (let i = 0; i < cuts.length; i += 2) {
      const a = cuts[i], b = cuts[i + 1];
      if (b - a < 0.01) continue;
      const len = b - a, mid = (a + b) / 2;
      if (axis === 'x') box(len, WALL_H, WALL_T, mid, fixed, color, { collide: true });
      else box(WALL_T, WALL_H, len, fixed, mid, color, { collide: true });
    }
    // low trim along the top
    const trim = 0x2a2d48;
    if (axis === 'x') box(to - from, 0.08, WALL_T + 0.06, (from + to) / 2, fixed, trim, { y0: WALL_H });
    else box(WALL_T + 0.06, 0.08, to - from, fixed, (from + to) / 2, trim, { y0: WALL_H });
  };

  // ---------- Floors ----------
  floor(-8, -2, -6, 0, 0x4a5a86);   // kamar
  floor(-2, 4, -6, 0, 0x7a5a45);    // ruang tamu
  floor(4, 8, -6, 0, 0x3a3d4a);     // gudang
  floor(-8, -2, 0, 6, 0x8fa3a8);    // dapur
  floor(-2, 8, 0, 6, 0x6e5340);     // ruang makan

  // ---------- Walls ----------
  wall('x', -6, -8, 8);                       // north
  wall('x', 6, -8, 8, [[0.1, 1.9]], 0x5b5f86); // south with front door
  wall('z', -8, -6, 6);                       // west
  wall('z', 8, -6, 6);                        // east
  wall('z', -2, -6, 0, [[-3.9, -2.1]], 0x6a6e96); // kamar | ruang tamu
  wall('z', 4, -6, 0, [[-3.9, -2.1]], 0x4c4f6e);  // ruang tamu | gudang
  wall('x', 0, -8, -2, [[-5.9, -4.1]], 0x6a6e96); // kamar | dapur
  wall('x', 0, -2, 4, [[0.2, 2.2]], 0x6a6e96);    // ruang tamu | ruang makan
  wall('x', 0, 4, 8, [], 0x4c4f6e);               // gudang | ruang makan
  wall('z', -2, 0, 6, [[2.2, 4.0]], 0x6a6e96);    // dapur | ruang makan

  // Doors (hinged, openable). The storage door starts locked until enough clues are found.
  const doorSys = buildDoors({ group, colliders, box, M });

  // ---------- Windows (moonlight panels on the north wall) ----------
  const winMat = glow(0x5f78c8);

  // ---------- Kamar ----------
  box(2.1, 0.45, 2.6, -6.7, -4.6, 0x7a4f9a, { collide: true });                 // bed
  box(2.1, 0.12, 0.7, -6.7, -5.5, 0xeae6f5, { y0: 0.45 });                       // pillow
  box(1.9, 0.75, 0.8, -3.2, -1.0, 0x8c6a4a, { collide: true });                  // desk (tiket)
  box(0.5, 0.06, 0.3, -3.25, -1.0, 0xd8d0b8, { y0: 0.75 });                      // ticket on desk
  box(0.9, 1.5, 0.9, -7.45, -1.2, 0x5a4636, { collide: true });                  // wardrobe
  box(1.6, 0.02, 1.2, -5.2, -2.6, 0x2c3a6a, { y0: 0.01 });                       // rug
  // ---------- Ruang tamu ----------
  box(2.4, 0.5, 0.9, 0.4, -1.0, 0x8a3a4a, { collide: true });                    // sofa
  box(2.4, 0.5, 0.2, 0.4, -0.6, 0x6e2e3c, { y0: 0.5 });
  box(1.4, 0.9, 0.5, 1.0, -5.6, 0x3a3a46, { collide: true });                    // tv cabinet
  box(1.2, 0.7, 0.06, 1.0, -5.62, 0, { y0: 0.9, mat: glow(0x1a2238) });
  box(1.0, 1.5, 0.7, 3.3, -5.5, 0x6a4a2e, { collide: true });                    // old cabinet (ketukan)
  box(1.4, 0.4, 0.9, 0.6, -3.2, 0x6a5040, { collide: true });                    // coffee table
  box(1.8, 0.02, 1.4, 0.6, -3.2, 0x3a4a5a, { y0: 0.01 });
  // ---------- Gudang ----------
  box(0.6, 1.4, 3.2, 7.55, -2.8, 0x4a3a2e, { collide: true });                   // shelves
  box(0.9, 0.6, 0.9, 5.0, -0.9, 0x6a5a3e, { collide: true });                    // boxes
  box(0.8, 0.5, 0.8, 5.9, -0.8, 0x7a6a4a, { collide: true });
  box(0.7, 0.9, 0.7, 5.2, -5.4, 0x5a4a38, { collide: true });
  const mirror = box(1.6, 1.5, 0.08, 6.3, -5.9, 0, { y0: 0.2, mat: glow(0x6a4fb0) }); // AFTER terminal
  box(1.8, 1.7, 0.1, 6.3, -5.96, 0x1c1830, { y0: 0.1 });
  // ---------- Dapur ----------
  box(0.9, 0.9, 4.2, -7.5, 3.6, 0xb0b4c0, { collide: true });                    // counter
  box(0.9, 1.5, 0.9, -7.4, 0.9, 0xd6d8e0, { collide: true });                    // fridge
  box(1.6, 0.75, 1.0, -4.4, 3.6, 0x9a7a52, { collide: true });                   // table
  box(0.4, 0.45, 0.4, -5.6, 3.6, 0x6a4a32, { collide: true });
  // ---------- Ruang makan ----------
  box(2.6, 0.75, 1.3, 3.4, 3.0, 0x8c6240, { collide: true });                    // dining table
  for (const [dx, dz] of [[-1.5, 0], [1.5, 0], [0, -1.0], [0, 1.0]]) box(0.45, 0.5, 0.45, 3.4 + dx, 3.0 + dz, 0x5a3e2a);
  box(1.4, 0.75, 0.5, 6.6, 5.4, 0x3a3a46, { collide: true });                    // sideboard + cctv
  const cctvScreen = box(0.9, 0.55, 0.06, 6.6, 5.4, 0, { y0: 0.95, mat: glow(0x3b6a58) });
  box(0.5, 0.7, 0.5, 7.4, 1.2, 0x2e6a4a, { collide: true });                    // plant pot
  // ---------- Interior and exterior detail ----------
  buildInterior({ group, box, M, glow, winMat });

  // ---------- Neighbourhood (yard, street, houses, cars) ----------
  const lampMat = glow(0xffd88a);
  const hood = buildNeighborhood({ group, colliders, box, floor, M, glow, lampMat, winMat,
    warmWin: glow(0xffb05a), coolWin: glow(0x9bd6ff), signMat: glow(0xff9a4a) });
  colliders.push(...hood.moverCols);

  // ---------- Clue beacons (shown after the AFTER file hints them) ----------
  const beacons = {};
  const beaconGeo = new T.OctahedronGeometry(0.2, 0);
  for (const id of ['tiket', 'ketukan', 'resi', 'surat', 'cctv']) {
    const spot = SPOTS[id];
    const m = new T.Mesh(beaconGeo, glow(0x62f0d6));
    m.position.set(spot.x, 1.9, spot.z);
    m.visible = false;
    m.userData.keep = true;
    group.add(m);
    beacons[id] = m;
  }

  // ---------- Lights ----------
  const hemi = new T.HemisphereLight(0x8c9cff, 0x2a2036, 1.15);
  const moon = new T.DirectionalLight(0x9db4ff, 1.0);
  moon.position.set(-6, 14, 8);
  const lamp = new T.PointLight(0xffd9a0, 18, 9, 1.6); // phone flashlight that follows the player
  lamp.position.set(0, 2, 0);
  const roomLights = [];
  for (const [x, z, c] of [[-5, -3, 0xffc890], [1, -3, 0xffb878], [-5, 3, 0xfff0d0], [3, 3, 0xffc890]]) {
    const l = new T.PointLight(c, 14, 8, 1.6);
    l.position.set(x, 2.1, z);
    roomLights.push(l);
    group.add(l);
  }
  group.add(hemi, moon, lamp);

  const storageLight = new T.PointLight(0x9a6aff, 0, 7, 1.6);
  storageLight.position.set(6, 1.8, -3);
  group.add(storageLight);

  // Two warm lights hop between the street lamps nearest to the player (cheap outdoor lighting).
  const streetLights = [0, 1].map(() => { const l = new T.PointLight(0xffd9a0, 26, 15, 1.4); l.position.set(0, 3.1, 0); group.add(l); return l; });
  mergeStatic(group);
  const watchers = createWatchers({ group });

  return {
    group, colliders, beacons, lamp, hemi, moon, roomLights, storageLight,
    update(dt, px = 0, pz = 0) {
      hood.update(dt);
      doorSys.update(dt);
      const d = hood.lampSpots.map(p => ({ p, d: (p.x - px) ** 2 + (p.z - pz) ** 2 })).sort((a, b) => a.d - b.d);
      streetLights.forEach((l, i) => { const near = d[i]; if (near) l.position.set(near.p.x, 3.1, near.p.z); });
    },
    doors: doorSys,
    watchers,
    openStorageDoor() { const d = doorSys.byId('gudang'); doorSys.unlock(d); doorSys.setOpen(d, true); storageLight.intensity = 14; },
    closeStorageDoor() { doorSys.lock(doorSys.byId('gudang')); storageLight.intensity = 0; },
    // mood: 0 = warm night, 1 = after midnight (cold, purple, flickering)
    setMood(mood, time) {
      const flick = mood > 0 ? (0.78 + 0.22 * Math.sin(time * 23) * Math.sin(time * 7.3)) : 1;
      hemi.intensity = 1.4 - 0.7 * mood;
      moon.intensity = 1.35 - 0.7 * mood;
      moon.color.setHex(mood > 0.5 ? 0xb08cff : 0x9db4ff);
      for (const l of roomLights) l.intensity = (14 - 7 * mood) * flick;
      winMat.color.setHex(mood > 0.5 ? 0xb06ad8 : 0x5f78c8);
      lampMat.color.setHex(mood > 0.5 ? (flick < 0.9 ? 0x3a2a55 : 0x9a7ad8) : 0xffd88a);
    },
  };
}

// Merge every static mesh to keep draw calls low on phones. Plain-coloured meshes share one
// vertex-coloured material; special materials (glow, window) keep their own merged mesh.
function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const vertexMat = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const buckets = new Map();
  for (const child of [...group.children]) {
    if (!child.isMesh || child.userData.keep) continue;
    const g = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    g.applyMatrix4(child.matrixWorld);
    const source = child.material;
    const key = source.userData.plain ? vertexMat : source;
    let b = buckets.get(key);
    if (!b) buckets.set(key, b = { pos: [], nor: [], col: [] });
    const pos = g.getAttribute('position').array;
    b.pos.push(pos);
    b.nor.push(g.getAttribute('normal').array);
    if (key === vertexMat) {
      const c = new Float32Array(pos.length);
      for (let i = 0; i < c.length; i += 3) { c[i] = source.color.r; c[i + 1] = source.color.g; c[i + 2] = source.color.b; }
      b.col.push(c);
    }
    group.remove(child);
    g.dispose();
  }
  for (const [material, b] of buckets) {
    const total = b.pos.reduce((n, a) => n + a.length, 0);
    const P = new Float32Array(total), N = new Float32Array(total);
    const C = material === vertexMat ? new Float32Array(total) : null;
    let o = 0;
    for (let i = 0; i < b.pos.length; i++) {
      P.set(b.pos[i], o); N.set(b.nor[i], o); if (C) C.set(b.col[i], o);
      o += b.pos[i].length;
    }
    const geom = new T.BufferGeometry();
    geom.setAttribute('position', new T.BufferAttribute(P, 3));
    geom.setAttribute('normal', new T.BufferAttribute(N, 3));
    if (C) geom.setAttribute('color', new T.BufferAttribute(C, 3));
    const mesh = new T.Mesh(geom, material);
    mesh.frustumCulled = false;
    group.add(mesh);
  }
}
