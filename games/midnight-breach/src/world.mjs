import { T } from './three-loader.mjs';

const WALL_H = 1.7;
const WALL_T = 0.3;

// Interactable spots (x, z) in house coordinates. x = east, z = south (towards the camera).
export const SPOTS = {
  start: { x: -5.2, z: -3.0 },
  tiket: { x: -3.1, z: -1.1, label: 'Meja belajar' },
  ketukan: { x: 3.3, z: -5.0, label: 'Lemari tua' },
  resi: { x: -7.0, z: 1.9, label: 'Kulkas' },
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
  return ROOMS.find(r => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2)?.id || 'Halaman';
}

export function buildWorld(quality = { shadows: false }) {
  const group = new T.Group();
  const colliders = []; // {x1,x2,z1,z2, enabled}
  const mats = new Map();
  const M = (color, extra = {}) => {
    const key = color + JSON.stringify(extra);
    if (!mats.has(key)) mats.set(key, new T.MeshLambertMaterial({ color, flatShading: true, ...extra }));
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
  const box = (w, h, d, x, z, color, { y0 = 0, collide = false, mat, name } = {}) => {
    const mesh = new T.Mesh(G(w, h, d), mat || M(color));
    mesh.position.set(x, y0 + h / 2, z);
    if (name) mesh.name = name;
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
  // yard, road and sidewalk
  floor(-16, 16, 6, 14, 0x2f4a3a);
  floor(-16, 16, 14, 18, 0x2a2c36);
  floor(-16, 16, 18, 20, 0x4a4a52);
  floor(-16, 16, -14, -6, 0x2a3f33);
  floor(-16, -8, -6, 6, 0x2a3f33);
  floor(8, 16, -6, 6, 0x2a3f33);

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

  // Storage door (blocks the gap until opened)
  const door = box(0.22, 1.35, 1.8, 4, -3.0, 0x7c4a2e, { collide: true, name: 'gudang-door' });
  box(0.3, 0.1, 2.0, 4, -3.0, 0x2a1a12, { y0: 1.35 });

  // ---------- Windows (moonlight panels on the north wall) ----------
  const windows = [];
  for (const x of [-5, 1]) {
    const w = box(1.4, 0.8, 0.06, x, -5.88, 0, { y0: 0.55, mat: glow(0x5f78c8) });
    windows.push(w.mesh);
  }

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
  box(0.06, 0.28, 0.28, -6.92, 1.9, 0xf2d15c, { y0: 0.9 });                       // sticker
  box(1.6, 0.75, 1.0, -4.4, 3.6, 0x9a7a52, { collide: true });                   // table
  box(0.4, 0.45, 0.4, -5.6, 3.6, 0x6a4a32, { collide: true });
  // ---------- Ruang makan ----------
  box(2.6, 0.75, 1.3, 3.4, 3.0, 0x8c6240, { collide: true });                    // dining table
  for (const [dx, dz] of [[-1.5, 0], [1.5, 0], [0, -1.0], [0, 1.0]]) box(0.45, 0.5, 0.45, 3.4 + dx, 3.0 + dz, 0x5a3e2a);
  box(1.4, 0.75, 0.5, 6.6, 5.4, 0x3a3a46, { collide: true });                    // sideboard + cctv
  const cctvScreen = box(0.9, 0.55, 0.06, 6.6, 5.4, 0, { y0: 0.95, mat: glow(0x3b6a58) });
  box(0.5, 0.7, 0.5, 7.4, 1.2, 0x2e6a4a, { collide: true });                    // plant pot
  // ---------- Yard ----------
  box(0.25, 1.1, 0.25, 4.0, 8.4, 0x6a4a2e, { collide: true });                   // mailbox post
  box(0.7, 0.45, 0.5, 4.0, 8.4, 0x3a5aa0, { y0: 1.1 });
  for (let x = -14; x <= 14; x += 2) box(0.18, 0.8, 0.18, x, 13.2, 0x8a7a62);     // fence posts
  box(30, 0.14, 0.1, 0, 13.2, 0x8a7a62, { y0: 0.5 });
  box(0.9, 1.6, 0.9, -9.5, 9.0, 0x5a3e2a, { collide: true });                    // tree
  const crown = new T.Mesh(new T.IcosahedronGeometry(1.7, 0), M(0x2f6a46));
  crown.position.set(-9.5, 2.9, 9.0);
  group.add(crown);
  for (const [x, z] of [[-4, 7.4], [-2.6, 8.1], [8.8, 7.6]]) box(0.8, 0.5, 0.8, x, z, 0x2e5a3c);
  // neighbour houses across the road (Bu Wati's window glows)
  box(7, 3.2, 4, -2, 22, 0x6a5a70);
  box(7.6, 0.5, 4.6, -2, 22, 0x3a2e48, { y0: 3.2 });
  const watiWindow = box(1.4, 0.9, 0.08, -2, 19.95, 0, { y0: 1.2, mat: glow(0xffb05a) });
  box(6, 2.8, 4, 9.5, 22, 0x4f6a70);
  box(6.6, 0.5, 4.6, 9.5, 22, 0x2c3c44, { y0: 2.8 });
  box(1.2, 0.8, 0.08, 9.5, 19.95, 0, { y0: 1.2, mat: glow(0x9bd6ff) });
  // street lamp
  box(0.14, 3.0, 0.14, -9, 15, 0x2a2a34);
  box(0.6, 0.16, 0.6, -9, 15, 0, { y0: 3.0, mat: glow(0xffd88a) });

  // ---------- Clue beacons (shown after the AFTER file hints them) ----------
  const beacons = {};
  const beaconGeo = new T.OctahedronGeometry(0.2, 0);
  for (const id of ['tiket', 'ketukan', 'resi', 'surat', 'cctv']) {
    const spot = SPOTS[id];
    const m = new T.Mesh(beaconGeo, glow(0x62f0d6));
    m.position.set(spot.x, 1.9, spot.z);
    m.visible = false;
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

  return {
    group, colliders, beacons, lamp, hemi, moon, roomLights, windows, storageLight, watiWindow,
    cctvScreen: cctvScreen.mesh, mirror: mirror.mesh,
    gudangDoor: door,
    openStorageDoor() { door.mesh.visible = false; door.col.enabled = false; storageLight.intensity = 14; },
    closeStorageDoor() { door.mesh.visible = true; door.col.enabled = true; storageLight.intensity = 0; },
    // mood: 0 = warm night, 1 = after midnight (cold, purple, flickering)
    setMood(mood, time) {
      const flick = mood > 0 ? (0.78 + 0.22 * Math.sin(time * 23) * Math.sin(time * 7.3)) : 1;
      hemi.intensity = 1.15 - 0.55 * mood;
      moon.intensity = 1.0 - 0.45 * mood;
      moon.color.setHex(mood > 0.5 ? 0xb08cff : 0x9db4ff);
      for (const l of roomLights) l.intensity = (14 - 7 * mood) * flick;
      for (const w of windows) w.material.color.setHex(mood > 0.5 ? 0xb06ad8 : 0x5f78c8);
    },
  };
}
