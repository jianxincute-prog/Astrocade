// Town blockout: plaza with shops, central park, residential street, community area, connecting paths.
// Everything static is merged into a handful of meshes (vertex-coloured toon + an emissive window mesh) so the
// whole town costs only a few draw calls on mobile.
import { toonMat, addOutlines, computeOutlineNormals } from './anime.js';
import { mulberry32 } from './util.js';
const T = THREE;

// ---------------------------------------------------------------- zones & paths
const ZONES = [
  { id: 'plaza', name: 'Town Plaza', rect: [-52, 52, 66, 136] },
  { id: 'park', name: 'Central Park', circle: [-104, 8, 32] },
  { id: 'community', name: 'Community Area', circle: [104, 62, 24] },
  { id: 'residential', name: 'Residential Area', rect: [82, 140, -104, -16] },
  { id: 'boathouse', name: 'Boathouse', circle: [-18, -64, 14] },
  { id: 'lake', name: 'Frozen Lake', ellipse: [0, 0, 66, 52] },
];
export const ZONE_LIST = ZONES.map((z) => ({ id: z.id, name: z.name }));
function inZone(z, x, y, m = 0) {
  if (z.rect) return x > z.rect[0] - m && x < z.rect[1] + m && y > z.rect[2] - m && y < z.rect[3] + m;
  if (z.circle) return Math.hypot(x - z.circle[0], y - z.circle[1]) < z.circle[2] + m;
  return ((x - z.ellipse[0]) / (z.ellipse[2] + m)) ** 2 + ((y - z.ellipse[1]) / (z.ellipse[3] + m)) ** 2 < 1;
}
export function zoneAt(x, z) { for (const zn of ZONES) if (inZone(zn, x, z)) return { id: zn.id, name: zn.name }; return null; }

const ring = (cx, cz, r, n) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cz + Math.sin((i / n) * Math.PI * 2) * r]);
const PATHS = [
  { w: 6.5, pts: [[0, 49], [0, 68], [0, 80]] },
  { w: 4.6, pts: [[-20, 92], [-54, 72], [-80, 42], [-92, 18]] },
  { w: 4.6, pts: [[20, 92], [56, 84], [88, 70]] },
  { w: 5.6, pts: [[104, 44], [108, 14], [107, -24], [107, -64], [107, -104]] },
  { w: 4.2, pts: [[-96, -6], [-70, -40], [-42, -58], [-26, -60]] },
  { w: 3.6, pts: ring(-104, 8, 14, 28) },
];
function distToSeg(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2));
  return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t));
}
function nearPath(x, z, m) {
  for (const p of PATHS) for (let i = 0; i < p.pts.length - 1; i++) if (distToSeg(x, z, p.pts[i], p.pts[i + 1]) < p.w / 2 + m) return true;
  return false;
}

// ---------------------------------------------------------------- merge helper
const BOX = new T.BoxGeometry(1, 1, 1), CYL = new T.CylinderGeometry(1, 1, 1, 10), CONE = new T.ConeGeometry(1, 1, 10), SPH = new T.SphereGeometry(1, 10, 8);
function makeMerger() {
  const parts = [], tmpQ = new T.Quaternion(), tmpE = new T.Euler(), tmpS = new T.Vector3(), tmpP = new T.Vector3();
  function at(x, z, yaw = 0) {
    const parent = new T.Matrix4().compose(new T.Vector3(x, 0, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw), new T.Vector3(1, 1, 1));
    const add = (geo, sx, sy, sz, px, py, pz, color, rx = 0, ry = 0, rz = 0) => {
      const local = new T.Matrix4().compose(tmpP.set(px, py, pz), tmpQ.setFromEuler(tmpE.set(rx, ry, rz, 'YXZ')), tmpS.set(sx, sy, sz));
      parts.push({ geo, m: new T.Matrix4().multiplyMatrices(parent, local), color: new T.Color(color) });
    };
    return {
      box: (w, h, d, px, py, pz, c, rx, ry, rz) => add(BOX, w, h, d, px, py, pz, c, rx, ry, rz),
      cyl: (r, h, px, py, pz, c) => add(CYL, r, h, r, px, py, pz, c),
      cone: (r, h, px, py, pz, c) => add(CONE, r, h, r, px, py, pz, c),
      sph: (r, px, py, pz, c, sy = 1) => add(SPH, r, r * sy, r, px, py, pz, c),
      geo: (g, px, py, pz, c, ry = 0) => add(g, 1, 1, 1, px, py, pz, c, 0, ry, 0),
    };
  }
  function build(mat, smooth) {
    const pos = [], nor = [], col = [];
    for (const p of parts) {
      const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
      g.applyMatrix4(p.m);
      const a = g.attributes.position.array, n = g.attributes.normal.array;
      for (let i = 0; i < a.length; i++) { pos.push(a[i]); nor.push(n[i]); }
      for (let i = 0; i < a.length / 3; i++) col.push(p.color.r, p.color.g, p.color.b);
      g.dispose();
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    if (smooth) computeOutlineNormals(geo);
    const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false;
    return mesh;
  }
  return { at, build };
}
const shade = (hex, k) => { const c = new T.Color(hex); c.r = Math.min(1, c.r * k); c.g = Math.min(1, c.g * k); c.b = Math.min(1, c.b * k); return c.getHex(); };

function signTexture(lines, bg, fg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 192;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 192);
  x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 8; x.strokeRect(8, 8, 496, 176);
  x.fillStyle = fg; x.textAlign = 'center';
  x.font = 'bold ' + Math.min(68, Math.floor(620 / lines[0].length)) + 'px system-ui,sans-serif'; x.fillText(lines[0], 256, 104);
  if (lines[1]) { x.font = '600 36px system-ui,sans-serif'; x.fillText(lines[1], 256, 154); }
  const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,225,160,0.95)'); g.addColorStop(0.35, 'rgba(255,200,120,0.35)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}

// ---------------------------------------------------------------- layout data
const SNOW = 0xf6f9fd, WOOD = 0x9a6a3e, DARK = 0x2c3340, WARM = 0xffd27a;
const SHOPS = [
  { id: 'skate', x: -26, z: 108, w: 13, d: 9, h: 5.6, yaw: Math.PI, wall: 0x4a8fc4, roof: 0x2f4e73, awning: 0xe85d5d, sign: ['BLADE & EDGE', 'Skate Shop'], signBg: '#2f4e73', signFg: '#e9f4ff', doorX: 0 },
  { id: 'cafe', x: 0, z: 114, w: 12, d: 9, h: 5.2, yaw: Math.PI, wall: 0xc9703f, roof: 0x5b3524, awning: 0xf4efe6, sign: ['COCOA CORNER', 'Cafe'], signBg: '#5b3524', signFg: '#ffe7c4', doorX: 0 },
  { id: 'clothes', x: 26, z: 108, w: 13, d: 9, h: 5.6, yaw: Math.PI, wall: 0xd1708a, roof: 0x6a3552, awning: 0x5aa7d6, sign: ['WARM THREADS', 'Clothing'], signBg: '#6a3552', signFg: '#ffe6ef', doorX: 0 },
  { id: 'bakery', x: -46, z: 92, w: 11, d: 8, h: 5, yaw: Math.PI / 2, wall: 0xe0b25a, roof: 0x7a5a2a, sign: ['SWEET BAKERY', 'Bread & Buns'], signBg: '#7a5a2a', signFg: '#fff1cf', doorX: 0 },
  { id: 'library', x: 46, z: 92, w: 11, d: 8, h: 5.4, yaw: -Math.PI / 2, wall: 0x7bb38a, roof: 0x34584a, sign: ['WINTER LIBRARY', 'Books & Maps'], signBg: '#34584a', signFg: '#e6fff0', doorX: 0 },
  { id: 'flats1', x: -48, z: 124, w: 12, d: 9, h: 7.5, yaw: Math.PI, wall: 0x9aa4c8, roof: 0x4a5070 },
  { id: 'flats2', x: 48, z: 124, w: 12, d: 9, h: 7.5, yaw: Math.PI, wall: 0xc8b49a, roof: 0x6a5a48 },
  { id: 'hall', x: 108, z: 86, w: 16, d: 11, h: 6.6, yaw: Math.PI, wall: 0x8a78b8, roof: 0x4a3f72, sign: ['COMMUNITY HALL', 'Events & Meetups'], signBg: '#4a3f72', signFg: '#f0e9ff', doorX: 0 },
];
const HOUSE_COLORS = [[0xd9876a, 0x7a3f33], [0x82b0d9, 0x3a5578], [0xe3c778, 0x7a6232], [0x9ac49a, 0x3c6648], [0xc99ad1, 0x62396b], [0xe6a07a, 0x824a30]];
const HOUSES = [];
[-92, -68, -44].forEach((z, i) => {
  HOUSES.push({ id: 'hw' + i, x: 95, z, w: 9, d: 7.5, h: 4.6, yaw: Math.PI / 2, wall: HOUSE_COLORS[i][0], roof: HOUSE_COLORS[i][1], doorX: -1 });
  HOUSES.push({ id: 'he' + i, x: 119, z: z - 2, w: 9, d: 7.5, h: 4.6, yaw: -Math.PI / 2, wall: HOUSE_COLORS[i + 3][0], roof: HOUSE_COLORS[i + 3][1], doorX: 1 });
});

export function createTown(scene) {
  const colliders = [], glows = [], trees = [], flicker = [];
  const body = makeMerger(), light = makeMerger(), flat = makeMerger();
  const rng = mulberry32(21), glowTex = glowTexture();
  const group = new T.Group(); scene.add(group);

  function boxColliders(cx, cz, w, d, yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const nx = Math.max(1, Math.ceil((w - 2.2) / 2.6)), nz = Math.max(1, Math.ceil((d - 2.2) / 2.6));
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const lx = -w / 2 + 1.1 + (w - 2.2) * (i / nx), lz = -d / 2 + 1.1 + (d - 2.2) * (j / nz);
      colliders.push({ x: cx + lx * c + lz * s, z: cz - lx * s + lz * c, r: 2.0 });
    }
  }

  // ---- paths (flat ribbons just above the snow) and the plaza paving
  const pathMesh = (() => {
    const pos = [], idx = [];
    PATHS.forEach((p) => {
      const base = pos.length / 3, n = p.pts.length;
      for (let i = 0; i < n; i++) {
        const a = p.pts[Math.max(0, i - 1)], b = p.pts[Math.min(n - 1, i + 1)];
        let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const nx = -dz, nz = dx, hw = p.w / 2;
        pos.push(p.pts[i][0] + nx * hw, 0.045, p.pts[i][1] + nz * hw, p.pts[i][0] - nx * hw, 0.045, p.pts[i][1] - nz * hw);
        if (i < n - 1) { const k = base + i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      }
    });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    // ensure the ribbon faces up regardless of winding
    const m = new T.Mesh(g, toonMat({ color: 0xcfc4b0, soft: true, side: T.DoubleSide, noOutline: true }));
    return m;
  })();
  group.add(pathMesh);
  const plaza = flat.at(0, 92, 0);
  plaza.cyl(18, 0.06, 0, 0.04, 0, 0xddd6c8); plaza.cyl(11.5, 0.08, 0, 0.05, 0, 0xcdc2b0); plaza.cyl(7, 0.1, 0, 0.06, 0, 0xddd6c8);

  // ---- buildings
  const signMeshes = [];
  function building(b) {
    const g = body.at(b.x, b.z, b.yaw), lg = light.at(b.x, b.z, b.yaw);
    const { w, d, h } = b, trim = shade(b.wall, 0.6), dk = 0x4a2f1c, a = 0.5, rise = (d / 2) * Math.tan(a), len = (d / 2) / Math.cos(a) + 0.9;
    g.box(w, h, d, 0, h / 2, 0, b.wall);
    g.box(w + 0.4, 0.6, d + 0.4, 0, 0.3, 0, trim);
    g.box(w + 0.2, 0.35, d + 0.2, 0, h - 0.1, 0, trim);
    [-1, 1].forEach((s) => {
      g.box(w + 1.4, 0.45, len, 0, h + rise / 2 + 0.12, s * (d / 4), b.roof, s * a);
      g.box(w + 1.6, 0.34, len - 0.3, 0, h + rise / 2 + 0.42, s * (d / 4), SNOW, s * a);
    });
    const tri = new T.Shape(); tri.moveTo(-d / 2, 0); tri.lineTo(d / 2, 0); tri.lineTo(0, rise);
    const prism = new T.ExtrudeGeometry(tri, { depth: w, bevelEnabled: false }); prism.translate(0, 0, -w / 2); prism.rotateY(Math.PI / 2);
    g.geo(prism, 0, h, 0, b.wall);
    g.box(1.1, 2.6, 1.1, w * 0.28, h + rise * 0.6 + 1.2, -d * 0.12, 0x7c7f88); g.box(1.4, 0.3, 1.4, w * 0.28, h + rise * 0.6 + 2.6, -d * 0.12, SNOW);
    const dx = (b.doorX || 0) * Math.min(3, w * 0.25);
    g.box(2.3, 3.4, 0.2, dx, 1.7, d / 2, trim); g.box(1.9, 3.1, 0.3, dx, 1.55, d / 2 + 0.1, dk); g.box(3, 0.25, 1.4, dx, 0.12, d / 2 + 0.8, 0x8a8f98);
    const n = Math.max(2, Math.floor((w - 4) / 3.6)), span = w - 4.4;
    for (let i = 0; i < n; i++) {
      const wx = -span / 2 + (n === 1 ? 0 : (span * i) / (n - 1));
      if (Math.abs(wx - dx) < 2.4) continue;
      g.box(2.1, 2.3, 0.15, wx, h * 0.52, d / 2, trim); lg.box(1.7, 1.9, 0.2, wx, h * 0.52, d / 2 + 0.06, shade(WARM, 0.85 + rng() * 0.2));
    }
    [-1, 1].forEach((s) => [-0.22, 0.22].forEach((zz) => { g.box(0.15, 2.3, 2.1, s * w / 2, h * 0.52, zz * d, trim); lg.box(0.2, 1.9, 1.7, s * (w / 2 + 0.06), h * 0.52, zz * d, shade(WARM, 0.85 + rng() * 0.2)); }));
    if (b.awning) { g.box(w * 0.8, 0.22, 2.6, 0, 3.95, d / 2 + 1.3, b.awning, 0.2); [-1, 1].forEach((s) => g.cyl(0.1, 3.9, s * w * 0.38, 1.95, d / 2 + 2.4, DARK)); }
    if (b.sign) {
      const m = new T.Mesh(new T.BoxGeometry(Math.min(8.5, w - 2), 1.7, 0.25), [0, 1, 2, 3, 4, 5].map((i) => (i === 4 ? toonMat({ map: signTexture(b.sign, b.signBg, b.signFg), soft: true }) : toonMat({ color: 0x3a2a1e }))));
      m.position.set(b.x + Math.sin(b.yaw) * (d / 2 + 0.35), h - 0.35 + (b.awning ? 0.9 : 0), b.z + Math.cos(b.yaw) * (d / 2 + 0.35)); m.rotation.y = b.yaw;
      signMeshes.push(m);
    }
    boxColliders(b.x, b.z, w + 0.6, d + 0.6, b.yaw);
  }
  SHOPS.forEach(building); HOUSES.forEach(building);

  // ---- street furniture
  function lamp(x, z) {
    const g = body.at(x, z, 0), lg = light.at(x, z, 0);
    g.cyl(0.13, 4.2, 0, 2.1, 0, DARK); g.cyl(0.3, 0.3, 0, 0.15, 0, 0x3b4252); lg.sph(0.3, 0, 4.5, 0, 0xffd9a0);
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    s.position.set(x, 4.5, z); s.scale.setScalar(3.4); scene.add(s); glows.push(s);
    colliders.push({ x, z, r: 0.3 });
  }
  function bench(x, z, yaw) {
    const g = body.at(x, z, yaw);
    g.box(2.1, 0.12, 0.7, 0, 0.55, 0, WOOD); g.box(2.1, 0.55, 0.1, 0, 0.95, -0.32, WOOD, -0.12);
    [-0.85, 0.85].forEach((s) => g.box(0.12, 0.55, 0.62, s, 0.28, 0, DARK));
    colliders.push({ x, z, r: 0.95 });
  }
  function signpost(x, z, yaw, lines, bg, fg) {
    const g = body.at(x, z, yaw);
    g.cyl(0.16, 3.4, 0, 1.7, 0, 0x6b4527); g.box(4.8, 0.25, 0.3, 0, 4.1, 0, SNOW);
    const m = new T.Mesh(new T.BoxGeometry(4.6, 1.7, 0.2), [0, 1, 2, 3, 4, 5].map((i) => (i === 4 ? toonMat({ map: signTexture(lines, bg, fg), soft: true }) : toonMat({ color: 0x4a3322 }))));
    m.position.set(x, 3.1, z); m.rotation.y = yaw; signMeshes.push(m);
    colliders.push({ x, z, r: 0.5 });
  }

  // Plaza: fountain, lamps, benches, signs
  {
    const g = body.at(0, 92, 0);
    g.cyl(3.6, 0.7, 0, 0.35, 0, 0xb7bec9); g.cyl(3.0, 0.74, 0, 0.37, 0, 0xbfe3f6); g.cyl(0.9, 2.4, 0, 1.2, 0, 0xc9d3de); g.cyl(1.7, 0.3, 0, 2.5, 0, 0xb7bec9); g.cyl(1.4, 0.34, 0, 2.52, 0, 0xcfeaf8); g.cone(0.5, 1.2, 0, 3.4, 0, 0xe2f4fc);
    colliders.push({ x: 0, z: 92, r: 3.8 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.5; lamp(Math.cos(a) * 15.5, 92 + Math.sin(a) * 15.5); }
    [[-14, 98, 0.9], [14, 98, -0.9], [-12, 86, -2.4], [12, 86, 2.4]].forEach(([x, z, yaw]) => bench(x, z, yaw));
    signpost(7, 72, Math.PI, ['TOWN PLAZA', 'Shops - Cafe - Skates'], '#2f4e73', '#e9f4ff');
    signpost(-62, 60, 2.5, ['CENTRAL PARK', 'Benches & quiet'], '#2f6a4a', '#e6fff0');
    signpost(66, 78, -2.6, ['COMMUNITY AREA', 'Bonfire & events'], '#4a3f72', '#f0e9ff');
    signpost(112, -8, -Math.PI / 2 + 0.3, ['RESIDENTIAL', 'Quiet street'], '#7a3f33', '#ffe9e0');
    [-4, 4].forEach((sx) => { [64, 74].forEach((z) => trees.push({ x: sx * 3.2 * (z > 70 ? 1.2 : 1), z: z + 12, s: 0.9 })); });
  }

  // Central Park: benches on the ring path, lamps, gazebo, extra pines
  {
    const cx = -104, cz = 8;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3, x = cx + Math.cos(a) * 17, z = cz + Math.sin(a) * 17; bench(x, z, Math.atan2(cx - x, cz - z)); }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.9; lamp(cx + Math.cos(a) * 11.5, cz + Math.sin(a) * 11.5); }
    const g = body.at(cx - 8, cz - 22, 0);
    g.cyl(4.2, 0.3, 0, 0.15, 0, 0xcfc4b0); g.cone(5.2, 2.4, 0, 5.6, 0, 0x5b3d2a); g.cone(5.3, 0.9, 0, 6.5, 0, SNOW);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.cyl(0.18, 4.2, Math.cos(a) * 3.7, 2.2, Math.sin(a) * 3.7, 0x8a5a36); if (i !== 2) colliders.push({ x: cx - 8 + Math.cos(a) * 3.7, z: cz - 22 + Math.sin(a) * 3.7, r: 0.4 }); }
    for (let i = 0; i < 22; i++) { const a = rng() * Math.PI * 2, r = 22 + rng() * 11, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (!nearPath(x, z, 3) && Math.hypot(x - (cx - 8), z - (cz - 22)) > 8) trees.push({ x, z, s: 0.9 + rng() * 0.8 }); }
  }

  // Residential street: lamps and yard trees
  for (let z = -96; z <= -30; z += 22) { lamp(103, z); lamp(111, z + 11); }
  HOUSES.forEach((h) => { const off = h.x < 107 ? -8.5 : 8.5; trees.push({ x: h.x + off + (rng() - 0.5), z: h.z + (rng() - 0.5) * 6, s: 0.7 + rng() * 0.5 }); });

  // Community area: bonfire with log seats, notice board
  {
    const g = body.at(99, 64, 0), lg = light.at(99, 64, 0);
    for (let i = 0; i < 4; i++) g.box(2.2, 0.35, 0.35, 0, 0.3, 0, 0x5b3d2a, 0.35, (i / 4) * Math.PI, 0);
    lg.cone(0.9, 2.0, 0, 1.2, 0, 0xff8a2a); lg.cone(0.55, 2.6, 0.05, 1.45, 0, 0xffc23a);
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    s.position.set(99, 1.8, 64); s.scale.setScalar(9); scene.add(s); flicker.push(s);
    colliders.push({ x: 99, z: 64, r: 1.8 });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.4, x = 99 + Math.cos(a) * 5, z = 64 + Math.sin(a) * 5; const lg2 = body.at(x, z, Math.atan2(99 - x, 64 - z)); lg2.box(2.2, 0.55, 0.7, 0, 0.3, 0, 0x6b4527); colliders.push({ x, z, r: 1.0 }); }
    lamp(88, 62); lamp(112, 54);
    signpost(86, 76, -2.2, ['COMMUNITY BOARD', 'Events coming soon'], '#4a3f72', '#f0e9ff');
  }

  // ---- finish: merged meshes
  const bodyMesh = body.build(toonMat({ vertexColors: true }), true);
  const flatMesh = flat.build(toonMat({ vertexColors: true, soft: true, noOutline: true }), false);
  const lightMesh = light.build(new T.MeshBasicMaterial({ vertexColors: true }), false);
  group.add(bodyMesh, flatMesh, lightMesh); signMeshes.forEach((m) => group.add(m));
  addOutlines(group, { thick: 0.0026, fade: 1 });

  function blocked(x, z, m) {
    for (const zn of ZONES) if (zn.id !== 'lake' && zn.id !== 'boathouse' && inZone(zn, x, z, m)) return true;
    return nearPath(x, z, m);
  }
  return { colliders, glows, flicker, trees, blocked };
}
