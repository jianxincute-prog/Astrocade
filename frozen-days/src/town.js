// Town: commercial plaza (north), central park (east), residential streets (south), community plaza (west),
// the road / path network, corner landmarks (hill viewpoint, creek bridge) and street furniture.
// Everything static is merged into a handful of vertex-coloured meshes so the whole town costs few draw calls.
import { toonMat, addOutlines, computeOutlineNormals } from './anime.js';
import { mulberry32 } from './util.js';
import { NETWORK, heightAt, BRIDGE, CREEK, HILL, pathEdgeDist, creekD, lakePt, lakeR, DOCKS, dockPose, ACCESS, HOME } from './layout.js';
const T = THREE;

// ---------------------------------------------------------------- merge helper
const BOX = new T.BoxGeometry(1, 1, 1), CYL = new T.CylinderGeometry(1, 1, 1, 10), CONE = new T.ConeGeometry(1, 1, 10), SPH = new T.SphereGeometry(1, 10, 8);
function makeMerger() {
  const parts = [], tmpQ = new T.Quaternion(), tmpE = new T.Euler(), tmpS = new T.Vector3(), tmpP = new T.Vector3();
  function at(x, z, yaw = 0, y0 = 0) {
    const parent = new T.Matrix4().compose(new T.Vector3(x, y0, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw), new T.Vector3(1, 1, 1));
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
    return new T.Mesh(geo, mat);
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
  x.font = 'bold ' + Math.min(68, Math.floor(620 / lines[0].length)) + 'px system-ui,sans-serif'; x.fillText(lines[0], 256, lines[1] ? 104 : 118);
  if (lines[1]) { x.font = '600 36px system-ui,sans-serif'; x.fillText(lines[1], 256, 154); }
  const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
}

// ---------------------------------------------------------------- layout data
const SNOW = 0xf6f9fd, WOOD = 0x9a6a3e, DARK = 0x2c3340, WARM = 0xffd27a, FENCE = 0xf1ece2;
const PLAZA = [0, 108], PARK = [118, 12], COMM = [-118, 14];
const SHOPS = [
  { id: 'skate', x: -27, z: 128, w: 13, d: 9, h: 5.6, yaw: Math.PI, wall: 0x4a8fc4, roof: 0x2f4e73, awning: 0xe85d5d, sign: ['BLADE & EDGE', 'Skate Shop'], signBg: '#2f4e73', signFg: '#e9f4ff' },
  { id: 'cafe', x: 0, z: 131, w: 12, d: 9, h: 5.4, yaw: Math.PI, wall: 0xc9703f, roof: 0x5b3524, awning: 0xf4efe6, sign: ['COCOA CORNER', 'Cafe'], signBg: '#5b3524', signFg: '#ffe7c4', tower: true },
  { id: 'clothes', x: 27, z: 128, w: 13, d: 9, h: 5.6, yaw: Math.PI, wall: 0xd1708a, roof: 0x6a3552, awning: 0x5aa7d6, sign: ['WARM THREADS', 'Clothing'], signBg: '#6a3552', signFg: '#ffe6ef' },
  { id: 'bakery', x: -26, z: 107, w: 11, d: 8, h: 5, yaw: Math.PI / 2, wall: 0xe0b25a, roof: 0x7a5a2a, sign: ['SWEET BAKERY', 'Bread & Buns'], signBg: '#7a5a2a', signFg: '#fff1cf' },
  { id: 'library', x: 26, z: 107, w: 11, d: 8, h: 5.4, yaw: -Math.PI / 2, wall: 0x7bb38a, roof: 0x34584a, sign: ['WINTER LIBRARY', 'Books & Maps'], signBg: '#34584a', signFg: '#e6fff0' },
  { id: 'flats1', x: -52, z: 138, w: 12, d: 9, h: 7.5, yaw: Math.PI, wall: 0x9aa4c8, roof: 0x4a5070 },
  { id: 'flats2', x: 52, z: 138, w: 12, d: 9, h: 7.5, yaw: Math.PI, wall: 0xc8b49a, roof: 0x6a5a48 },
  { id: 'hall', x: COMM[0], z: 50, w: 16, d: 11, h: 6.6, yaw: Math.PI, wall: 0x8a78b8, roof: 0x4a3f72, sign: ['COMMUNITY HALL', 'Events & Meetups'], signBg: '#4a3f72', signFg: '#f0e9ff', chunk: 'comm' },
];
const HOUSE_COLORS = [[0xd9876a, 0x7a3f33], [0x82b0d9, 0x3a5578], [0xe3c778, 0x7a6232], [0x9ac49a, 0x3c6648], [0xc99ad1, 0x62396b], [0xe6a07a, 0x824a30], [0xa7c8e8, 0x45607f], [0xe8d49a, 0x77623a], [0xb5d6b0, 0x41694a], [0xe0a6b8, 0x7a4558]];
const HOUSES = [];
[-46, -30, -14, 14, 30, 46].forEach((x, i) => HOUSES.push({ id: 'hn' + i, home: 'hn' + i === HOME.id, x, z: -104, w: 9, d: 7.5, h: 4.6 + (i % 3) * 0.3, yaw: Math.PI, wall: HOUSE_COLORS[i][0], roof: HOUSE_COLORS[i][1], front: -109.8, chunk: 'res' }));
[-40, -24, 24, 40].forEach((x, i) => HOUSES.push({ id: 'hs' + i, x, z: -127, w: 9, d: 7.5, h: 4.7 + (i % 2) * 0.3, yaw: 0, wall: HOUSE_COLORS[i + 6][0], roof: HOUSE_COLORS[i + 6][1], front: -121.2, chunk: 'res' }));

export function createTown(scene) {
  const colliders = [], glowPts = [], trees = [], flicker = [], occupied = [], benchList = [];
  // One merged mesh set per district so far-away districts are frustum-culled.
  const chunks = {}; let cur = null;
  const chunk = (name) => (cur = chunks[name] || (chunks[name] = { body: makeMerger(), light: makeMerger(), flat: makeMerger() }));
  const body = { at: (...a) => cur.body.at(...a) }, light = { at: (...a) => cur.light.at(...a) }, flat = { at: (...a) => cur.flat.at(...a) };
  chunk('plaza');
  const rng = mulberry32(21);
  const group = new T.Group(); scene.add(group);
  const glow = (x, y, z) => glowPts.push([x, y, z]);
  const occupy = (x, z, r) => occupied.push([x, z, r]);

  function boxColliders(cx, cz, w, d, yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const nx = Math.max(1, Math.ceil((w - 2.2) / 2.6)), nz = Math.max(1, Math.ceil((d - 2.2) / 2.6));
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const lx = -w / 2 + 1.1 + (w - 2.2) * (i / nx), lz = -d / 2 + 1.1 + (d - 2.2) * (j / nz);
      colliders.push({ x: cx + lx * c + lz * s, z: cz - lx * s + lz * c, r: 2.0 });
    }
  }

  // ---- road / path network: three ribbons (different tones, so main streets read apart from footpaths)
  const TONES = { road: [0xb7b0a3, -2], path: [0xd4cab6, -3], shore: [0xcfc0a4, -4] };
  Object.keys(TONES).forEach((kind) => {
    const pos = [], idx = [];
    NETWORK.filter((p) => p.kind === kind).forEach((p) => {
      const base = pos.length / 3, n = p.pts.length, closed = Math.hypot(p.pts[0][0] - p.pts[n - 1][0], p.pts[0][1] - p.pts[n - 1][1]) < 0.01;
      for (let i = 0; i < n; i++) {
        const a = p.pts[i === 0 ? (closed ? n - 2 : 0) : i - 1], b = p.pts[i === n - 1 ? (closed ? 1 : n - 1) : i + 1];
        let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const hw = (p.widths ? p.widths[i] : p.w) / 2, nx = -dz * hw, nz = dx * hw, x = p.pts[i][0], z = p.pts[i][1];
        pos.push(x + nx, heightAt(x + nx, z + nz) + 0.06, z + nz, x - nx, heightAt(x - nx, z - nz) + 0.06, z - nz);
        if (i < n - 1) { const k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
    });
    if (!pos.length) return;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const mat = toonMat({ color: TONES[kind][0], soft: true, side: T.DoubleSide, noOutline: true });
    mat.polygonOffset = true; mat.polygonOffsetFactor = TONES[kind][1]; mat.polygonOffsetUnits = TONES[kind][1];
    const m = new T.Mesh(g, mat); m.frustumCulled = false; group.add(m);
  });
  function paving(cx, cz, r) {
    const f = flat.at(cx, cz, 0);
    f.cyl(r, 0.06, 0, 0.04, 0, 0xddd6c8); f.cyl(r * 0.62, 0.08, 0, 0.05, 0, 0xcdc2b0); f.cyl(r * 0.36, 0.1, 0, 0.06, 0, 0xddd6c8);
    occupy(cx, cz, r + 1);
  }

  // ---- buildings: boards are a wooden box in the merged mesh plus one textured plane each
  const signMeshes = [];
  function signPlane(lines, bg, fg, w, h, x, y, z, yaw) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), toonMat({ map: signTexture(lines, bg, fg), soft: true, noOutline: true }));
    m.position.set(x, y, z); m.rotation.y = yaw; signMeshes.push(m);
  }
  function building(b) {
    chunk(b.chunk || 'plaza');
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
    const dx = 0;
    g.box(2.3, 3.4, 0.2, dx, 1.7, d / 2, trim); g.box(1.9, 3.1, 0.3, dx, 1.55, d / 2 + 0.1, dk); g.box(3, 0.25, 1.4, dx, 0.12, d / 2 + 0.8, 0x8a8f98);
    if (b.home) { // the player's own house: wreath, porch lantern, welcome mat, name plaque, shovelled path and a snowman
      g.geo(new T.TorusGeometry(0.42, 0.11, 8, 20), 0, 2.55, d / 2 + 0.3, 0x2f7a4a); g.box(0.36, 0.2, 0.1, 0, 2.2, d / 2 + 0.36, 0xd94f4f);
      lg.sph(0.24, 1.75, 3.0, d / 2 + 0.45, WARM); g.box(0.1, 0.5, 0.1, 1.75, 3.35, d / 2 + 0.3, DARK); g.box(0.1, 0.1, 0.35, 1.75, 3.55, d / 2 + 0.3, DARK);
      g.box(1.7, 0.04, 1.0, 0, 0.27, d / 2 + 1.0, 0x8a3a3a);
      g.box(2.6, 0.05, 4.2, 0, 0.03, d / 2 + 3.0, 0xe6dccb);
      const c = Math.cos(b.yaw), sn = Math.sin(b.yaw), wx = (lx, lz) => b.x + lx * c + lz * sn, wz = (lx, lz) => b.z - lx * sn + lz * c;
      signPlane(['MY HOME', 'Sweet home'], '#7a3f33', '#ffe9e0', 1.7, 0.64, wx(-2.1, d / 2 + 0.2), 2.5, wz(-2.1, d / 2 + 0.2), b.yaw);
      g.box(1.8, 0.8, 0.12, -2.1, 2.5, d / 2 + 0.1, 0x4a2f1c);
      glow(wx(1.75, d / 2 + 0.45), 3.0, wz(1.75, d / 2 + 0.45));
      const sx = wx(-w / 2 - 0.2, d / 2 + 2.2), sz = wz(-w / 2 - 0.2, d / 2 + 2.2), sy = heightAt(sx, sz), sg = body.at(sx, sz, 0, sy);
      sg.sph(0.6, 0, 0.55, 0, 0xf6f9fd, 0.9); sg.sph(0.44, 0, 1.4, 0, 0xf6f9fd, 0.9); sg.sph(0.32, 0, 2.05, 0, 0xf6f9fd, 0.9);
      sg.box(0.09, 0.09, 0.42, 0, 2.05, 0.4, 0xe8833a); sg.sph(0.04, -0.12, 2.13, 0.3, 0x222222, 0.9); sg.sph(0.04, 0.12, 2.13, 0.3, 0x222222, 0.9);
      sg.cyl(0.42, 0.1, 0, 1.72, 0, 0xd94f4f); sg.cyl(0.2, 0.28, 0, 2.33, 0, 0x2c3340); sg.cyl(0.33, 0.04, 0, 2.2, 0, 0x2c3340);
      colliders.push({ x: sx, z: sz, r: 0.7 });
    }
    const n = Math.max(2, Math.floor((w - 4) / 3.6)), span = w - 4.4;
    for (let i = 0; i < n; i++) {
      const wx = -span / 2 + (n === 1 ? 0 : (span * i) / (n - 1));
      if (Math.abs(wx - dx) < 2.4) continue;
      g.box(2.1, 2.3, 0.15, wx, h * 0.52, d / 2, trim); lg.box(1.7, 1.9, 0.2, wx, h * 0.52, d / 2 + 0.06, shade(WARM, 0.85 + rng() * 0.2));
    }
    [-1, 1].forEach((s) => [-0.22, 0.22].forEach((zz) => { g.box(0.15, 2.3, 2.1, s * w / 2, h * 0.52, zz * d, trim); lg.box(0.2, 1.9, 1.7, s * (w / 2 + 0.06), h * 0.52, zz * d, shade(WARM, 0.85 + rng() * 0.2)); }));
    if (b.awning) { g.box(w * 0.8, 0.22, 2.6, 0, 3.95, d / 2 + 1.3, b.awning, 0.2); [-1, 1].forEach((s) => g.cyl(0.1, 3.9, s * w * 0.38, 1.95, d / 2 + 2.4, DARK)); }
    if (b.tower) { // clock tower: the commercial district's landmark
      const ty = h + rise * 0.3, tz = d * 0.05;
      g.box(3.8, 7.4, 3.8, 0, ty + 3.7, tz, shade(b.wall, 1.08)); g.box(4.3, 0.5, 4.3, 0, ty + 7.5, tz, trim);
      g.cone(3.1, 3.6, 0, ty + 9.5, tz, b.roof); g.cone(3.2, 1.1, 0, ty + 10.3, tz, SNOW); g.cyl(0.08, 1.6, 0, ty + 12.1, tz, DARK);
      lg.box(2.5, 2.5, 0.2, 0, ty + 5.3, tz + 1.92, 0xfff3d0); g.box(0.16, 0.95, 0.12, 0, ty + 5.55, tz + 2.08, DARK); g.box(0.7, 0.14, 0.12, 0.3, ty + 5.3, tz + 2.08, DARK);
      g.box(1.6, 2.1, 0.12, 0, ty + 2.0, tz + 1.95, trim); lg.box(1.2, 1.7, 0.16, 0, ty + 2.0, tz + 1.99, shade(WARM, 0.95));
      glow(b.x, h + 14, b.z);
    }
    if (b.sign) {
      const sw = Math.min(8.5, w - 2), sy = h - 0.35 + (b.awning ? 0.9 : 0);
      g.box(sw, 1.7, 0.25, 0, sy, d / 2 + 0.35, 0x3a2a1e);
      signPlane(b.sign, b.signBg, b.signFg, sw - 0.2, 1.5, b.x + Math.sin(b.yaw) * (d / 2 + 0.5), sy, b.z + Math.cos(b.yaw) * (d / 2 + 0.5), b.yaw);
    }
    boxColliders(b.x, b.z, w + 0.6, d + 0.6, b.yaw);
    occupy(b.x, b.z, Math.hypot(w, d) / 2 + 1.5);
  }
  SHOPS.forEach(building); HOUSES.forEach(building);

  // ---- street furniture
  function lamp(x, z) {
    const y = heightAt(x, z), g = body.at(x, z, 0, y), lg = light.at(x, z, 0, y);
    g.cyl(0.13, 4.2, 0, 2.1, 0, DARK); g.cyl(0.3, 0.3, 0, 0.15, 0, 0x3b4252); lg.sph(0.3, 0, 4.5, 0, 0xffd9a0);
    glow(x, y + 4.5, z); colliders.push({ x, z, r: 0.3 });
  }
  function bench(x, z, yaw) {
    const y = heightAt(x, z), g = body.at(x, z, yaw, y);
    g.box(2.1, 0.12, 0.7, 0, 0.55, 0, WOOD); g.box(2.1, 0.55, 0.1, 0, 0.95, -0.32, WOOD, -0.12);
    [-0.85, 0.85].forEach((s) => g.box(0.12, 0.55, 0.62, s, 0.28, 0, DARK));
    colliders.push({ x, z, r: 0.95 }); benchList.push({ x, z, yaw, y });
  }
  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  function signpost(x, z, yaw, lines, bg, fg) {
    const y = heightAt(x, z), g = body.at(x, z, yaw, y);
    g.cyl(0.16, 3.4, 0, 1.7, 0, 0x6b4527); g.box(4.8, 0.25, 0.3, 0, 4.1, 0, SNOW);
    g.box(4.6, 1.7, 0.2, 0, 3.1, 0, 0x4a3322);
    signPlane(lines, bg, fg, 4.4, 1.5, x + Math.sin(yaw) * 0.12, y + 3.1, z + Math.cos(yaw) * 0.12, yaw);
    colliders.push({ x, z, r: 0.5 });
  }
  function bigBoard(x, z, yaw, lines, bg, fg) { // large notice board on two posts with a little roof
    const y = heightAt(x, z), g = body.at(x, z, yaw, y), c = Math.cos(yaw), s = Math.sin(yaw);
    [-1, 1].forEach((k) => { g.cyl(0.22, 6.2, k * 4.4, 3.1, 0, 0x6b4527); colliders.push({ x: x + c * k * 4.4, z: z - s * k * 4.4, r: 0.45 }); });
    g.box(10.2, 0.3, 1.5, 0, 6.35, 0.1, 0x5b3d2a, -0.12); g.box(10.4, 0.28, 1.6, 0, 6.62, 0.12, SNOW, -0.12);
    g.box(8.6, 3.4, 0.25, 0, 4.2, 0, 0x4a3322);
    signPlane(lines, bg, fg, 8.4, 3.2, x + Math.sin(yaw) * 0.14, y + 4.2, z + Math.cos(yaw) * 0.14, yaw);
    colliders.push({ x, z, r: 1.2 });
  }
  function mailbox(x, z, yaw) { const y = heightAt(x, z), g = body.at(x, z, yaw, y); g.cyl(0.07, 1.1, 0, 0.55, 0, 0x5a4636); g.box(0.5, 0.36, 0.34, 0, 1.2, 0, 0x4a78b8); g.box(0.52, 0.1, 0.36, 0, 1.42, 0, SNOW); }
  function fence(cx, z, w, gap) { // picket fence along x, with a gate gap in the middle
    const g = body.at(cx, z, 0, heightAt(cx, z)), half = w / 2;
    [[-half, -gap / 2], [gap / 2, half]].forEach(([a, b]) => {
      const n = Math.max(1, Math.round((b - a) / 1.0));
      g.box(b - a, 0.1, 0.07, (a + b) / 2, 0.62, 0, FENCE); g.box(b - a, 0.1, 0.07, (a + b) / 2, 0.28, 0, FENCE);
      for (let i = 0; i <= n; i++) g.box(0.12, 0.9, 0.08, a + ((b - a) * i) / n, 0.45, 0, FENCE);
    });
  }
  function bonfire(x, z) {
    const g = body.at(x, z, 0), lg = light.at(x, z, 0);
    for (let i = 0; i < 4; i++) g.box(2.2, 0.35, 0.35, 0, 0.3, 0, 0x5b3d2a, 0.35, (i / 4) * Math.PI, 0);
    lg.cone(0.9, 2.0, 0, 1.2, 0, 0xff8a2a); lg.cone(0.55, 2.6, 0.05, 1.45, 0, 0xffc23a);
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowDot(), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
    s.position.set(x, 1.8, z); s.scale.setScalar(9); scene.add(s); flicker.push(s);
    colliders.push({ x, z, r: 1.8 });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.4, sx = x + Math.cos(a) * 5, sz = z + Math.sin(a) * 5; body.at(sx, sz, face(sx, sz, x, z)).box(2.2, 0.55, 0.7, 0, 0.3, 0, 0x6b4527); colliders.push({ x: sx, z: sz, r: 1.0 }); }
    occupy(x, z, 8);
  }
  let _dot = null;
  function glowDot() {
    if (_dot) return _dot;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,225,160,0.95)'); g.addColorStop(0.35, 'rgba(255,200,120,0.35)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return (_dot = new T.CanvasTexture(c));
  }
  const ringAround = (cx, cz, r, n, off, fn) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + off; fn(cx + Math.cos(a) * r, cz + Math.sin(a) * r, a); } };
  const tree = (x, z, s) => trees.push({ x, z, s });

  // ================= COMMERCIAL (north): plaza, fountain, shops
  chunk('plaza');
  {
    const [cx, cz] = PLAZA; paving(cx, cz, 21);
    const g = body.at(cx, cz, 0);
    g.cyl(3.6, 0.7, 0, 0.35, 0, 0xb7bec9); g.cyl(3.0, 0.74, 0, 0.37, 0, 0xbfe3f6); g.cyl(0.9, 2.4, 0, 1.2, 0, 0xc9d3de); g.cyl(1.7, 0.3, 0, 2.5, 0, 0xb7bec9); g.cyl(1.4, 0.34, 0, 2.52, 0, 0xcfeaf8); g.cone(0.5, 1.2, 0, 3.4, 0, 0xe2f4fc);
    colliders.push({ x: cx, z: cz, r: 3.8 });
    [[-16, 108], [16, 108], [-12, 94], [12, 94], [-12, 121], [12, 121]].forEach(([x, z]) => lamp(x, z));
    [[-14, 100, 0.9], [14, 100, -0.9], [-10, 117, 2.4], [10, 117, -2.4]].forEach(([x, z, yaw]) => bench(x, z, yaw));
    signpost(7, 80, Math.PI, ['TOWN PLAZA', 'Shops - Cafe - Skates'], '#2f4e73', '#e9f4ff');
    [[-17, 124], [17, 124], [-34, 93], [34, 93]].forEach(([x, z]) => tree(x, z, 0.8));
  }
  // ================= CENTRAL PARK (east)
  chunk('park');
  {
    const [cx, cz] = PARK; paving(cx, cz, 7);
    const g = body.at(cx, cz, 0); // gazebo landmark
    g.cyl(4.6, 0.3, 0, 0.15, 0, 0xcfc4b0); g.cone(5.6, 2.6, 0, 5.7, 0, 0x5b3d2a); g.cone(5.7, 1.0, 0, 6.7, 0, SNOW); g.cyl(0.1, 1.4, 0, 8.0, 0, DARK);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.cyl(0.2, 4.2, Math.cos(a) * 4.1, 2.2, Math.sin(a) * 4.1, 0x8a5a36); if (i !== 3) colliders.push({ x: cx + Math.cos(a) * 4.1, z: cz + Math.sin(a) * 4.1, r: 0.45 }); }
    ringAround(cx, cz, 15.6, 6, 0.3, (x, z) => bench(x, z, face(x, z, cx, cz)));
    ringAround(cx, cz, 17.5, 5, 0.9, (x, z) => lamp(x, z));
    // old oak at the end of the north path
    const oak = body.at(118, 56, 0);
    oak.cyl(1.0, 5, 0, 2.5, 0, 0x6a4a34); [[0, 7, 0, 5.2, 0xdfe9ee], [-3.2, 6, 1.5, 3.6, 0xc9d9df], [3.4, 6.2, -1, 3.8, 0xc9d9df], [0, 5, 0, 4.6, 0x88a597]].forEach(([x, y, z, r, c]) => oak.sph(r, x, y, z, c, 0.8));
    colliders.push({ x: 118, z: 56, r: 1.5 }); occupy(118, 56, 6);
    bench(113.5, 49, 0); bench(122.5, 49, 0);
    signpost(96, 33, face(96, 33, 80, 33), ['CENTRAL PARK', 'Benches & quiet'], '#2f6a4a', '#e6fff0');
    for (let i = 0; i < 30; i++) { const x = 90 + rng() * 54, z = -38 + rng() * 100; if (pathEdgeDist(x, z, 6) > 4 && Math.hypot(x - cx, z - cz) > 21 && Math.hypot(x - 118, z - 56) > 9 && x > 98) tree(x, z, 0.9 + rng() * 0.8); }
  }
  // ================= RESIDENTIAL (south)
  chunk('res');
  {
    HOUSES.forEach((h, i) => {
      const north = h.yaw !== 0, fz = h.front, fx = h.x;
      fence(fx, fz, h.w + 2, 2.8);
      mailbox(fx + (i % 2 ? 4.6 : -4.6), fz + (north ? -0.6 : 0.6), north ? Math.PI : 0);
      const sx = h.x + (h.x < 0 ? -8 : 8); // side yard tree
      tree(sx, h.z + (north ? -1.2 : 1.2), 0.65 + rng() * 0.4);
    });
    // pocket green with the district's landmark tree at the end of the spine
    const g = body.at(0, -134, 0);
    g.cyl(0.7, 2.6, 0, 1.3, 0, 0x5a3f2c);
    [[4.6, 4.4, 3.6, 0x2e6048], [3.7, 4.0, 7.0, 0x2e6048], [2.8, 3.6, 10.0, 0x2e6048], [1.9, 3.0, 12.6, 0x2e6048]].forEach(([r, h, y, c]) => { g.cone(r, h, 0, y, 0, c); g.cone(r * 0.8, h * 0.5, 0, y + h * 0.28, 0, SNOW); });
    const lg = light.at(0, -134, 0);
    for (let i = 0; i < 16; i++) { const a = i * 2.4, k = i / 16, r = 3.8 - k * 2.6; lg.sph(0.17, Math.cos(a) * r, 3.6 + k * 8.6, Math.sin(a) * r, i % 3 === 0 ? 0xff9a9a : i % 3 === 1 ? 0xffe08a : 0xa8d8ff); }
    lg.sph(0.45, 0, 15.1, 0, 0xffe9a0);
    colliders.push({ x: 0, z: -134, r: 1.4 }); occupy(0, -134, 6);
    bench(-6, -138, face(-6, -138, 0, -134)); bench(6, -138, face(6, -138, 0, -134));
    [-37.8, -21.8, 21.8, 37.8].forEach((x) => lamp(x, -110.4)); [-90, -100].forEach((z) => { lamp(-5.5, z); lamp(5.5, z - 5); });
    signpost(8, -88, face(8, -88, 0, -60), ['RESIDENTIAL', 'Quiet streets'], '#7a3f33', '#ffe9e0');
  }
  // ================= COMMUNITY PLAZA (west)
  chunk('comm');
  {
    const [cx, cz] = COMM; paving(cx, cz, 16);
    bigBoard(cx - 8, cz, Math.PI / 2, ['TOWN BOARD', 'News & Events'], '#4a3f72', '#f0e9ff'); // landmark
    ringAround(cx, cz, 19, 6, 0.4, (x, z) => bench(x, z, face(x, z, cx, cz)));
    ringAround(cx, cz, 25, 5, 0.9, (x, z) => lamp(x, z));
    bonfire(-102, -17);
    signpost(-98, 30, face(-98, 30, -80, 30), ['COMMUNITY PLAZA', 'Board - Bonfire - Hall'], '#4a3f72', '#f0e9ff');
    for (let i = 0; i < 24; i++) { const x = -144 + rng() * 54, z = -38 + rng() * 100; if (pathEdgeDist(x, z, 6) > 4 && Math.hypot(x - cx, z - cz) > 27 && Math.hypot(x + 102, z + 17) > 12 && x < -104 && !(Math.abs(x - COMM[0]) < 12 && z > 40 && z < 60)) tree(x, z, 0.9 + rng() * 0.8); }
  }
  // ================= CORNERS: viewpoint, creek bridge
  chunk('ne');
  {
    // Northeast hilltop viewpoint: wooden deck, benches, lamp, sign
    const hx = HILL.x, hz = HILL.z, hy = heightAt(hx, hz), g = body.at(hx, hz, 0, hy);
    g.cyl(4.6, 0.3, 0, 0.12, 0, 0x9a6a3e);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; if (i === 3 || i === 4) continue; g.cyl(0.12, 1.2, Math.cos(a) * 4.3, 0.8, Math.sin(a) * 4.3, 0x6b4527); colliders.push({ x: hx + Math.cos(a) * 4.3, z: hz + Math.sin(a) * 4.3, r: 0.4 }); }
    const toLake = face(hx, hz, 0, 0);
    bench(hx + Math.sin(toLake + 1.2) * 2.6, hz + Math.cos(toLake + 1.2) * 2.6, toLake); bench(hx + Math.sin(toLake - 1.2) * 2.6, hz + Math.cos(toLake - 1.2) * 2.6, toLake);
    lamp(hx - 3, hz + 3);
    signpost(hx + 6.5, hz - 5.5, toLake + Math.PI, ['LAKE VIEWPOINT', 'Look out over the town'], '#2f4e73', '#e9f4ff');
    occupy(hx, hz, 9);
    for (let i = 0; i < 14; i++) { const a = rng() * Math.PI * 2, r = 12 + rng() * 22, x = hx + Math.cos(a) * r, z = hz + Math.sin(a) * r; if (pathEdgeDist(x, z, 6) > 4 && x < 143 && z < 143 && Math.hypot(x - 55, z - 55) > 20) tree(x, z, 0.8 + rng() * 0.8); }

    // Southeast: arched wooden bridge over the frozen creek + overlook
    chunk('se');
    const { cx, cz, ux, uz, len, w, arch } = BRIDGE, yaw = Math.atan2(ux, uz), bg = body.at(cx, cz, yaw);
    const N = 10, hh = (u) => arch * (1 - (2 * u / len) ** 2);
    for (let i = 0; i < N; i++) {
      const u0 = -len / 2 + (i / N) * len, u1 = -len / 2 + ((i + 1) / N) * len, tilt = -Math.atan2(hh(u1) - hh(u0), u1 - u0), um = (u0 + u1) / 2;
      bg.box(w, 0.18, (u1 - u0) / Math.cos(tilt) + 0.08, 0, hh(um) + 0.02, um, i % 2 ? 0x9a6a3e : 0xa4743f, tilt, 0, 0);
      [-1, 1].forEach((sd) => bg.box(0.16, 0.14, (u1 - u0) / Math.cos(tilt) + 0.04, sd * (w / 2 - 0.1), hh(um) + 1.05, um, 0x8a5a36, tilt, 0, 0));
    }
    [-1, 1].forEach((sd) => { for (let i = 0; i <= N; i++) { const u = -len / 2 + (i / N) * len; bg.box(0.14, 1.0, 0.14, sd * (w / 2 - 0.1), hh(u) + 0.55, u, 0x6b4527); } });
    [-1, 1].forEach((s) => { for (let k = -2; k <= 2; k++) { colliders.push({ x: cx + ux * k * 1.9 + uz * s * (w / 2 + 0.1), z: cz + uz * k * 1.9 - ux * s * (w / 2 + 0.1), r: 0.4 }); } });
    { // frozen creek: a flat ice ribbon plus the pond it flows from
      const P = CREEK.pts, pos = [], idx = [];
      for (let i = 0; i < P.length; i++) {
        const a0 = P[Math.max(0, i - 1)], b0 = P[Math.min(P.length - 1, i + 1)];
        let dx = b0[0] - a0[0], dz = b0[1] - a0[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        pos.push(P[i][0] - dz * CREEK.half, 0.07, P[i][1] + dx * CREEK.half, P[i][0] + dz * CREEK.half, 0.07, P[i][1] - dx * CREEK.half);
        if (i < P.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      }
      const cg = new T.BufferGeometry(); cg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); cg.setIndex(idx); cg.computeVertexNormals();
      const cm = toonMat({ color: 0x7db7e4, soft: true, side: T.DoubleSide, noOutline: true });
      group.add(new T.Mesh(cg, cm));
      const pg = new T.CircleGeometry(CREEK.pond[2], 28); pg.rotateX(-Math.PI / 2);
      const pm = new T.Mesh(pg, cm); pm.position.set(CREEK.pond[0], 0.07, CREEK.pond[1]); group.add(pm);
      const rim = new T.Mesh(new T.CircleGeometry(CREEK.pond[2] + 1.4, 28), toonMat({ color: 0xc9d9e8, soft: true, noOutline: true })); rim.geometry.rotateX(-Math.PI / 2); rim.position.set(CREEK.pond[0], 0.04, CREEK.pond[1]); group.add(rim);
      for (let k = 0; k < 20; k++) { const a1 = (k / 20) * Math.PI * 2; colliders.push({ x: CREEK.pond[0] + Math.cos(a1) * (CREEK.pond[2] + 1), z: CREEK.pond[1] + Math.sin(a1) * (CREEK.pond[2] + 1), r: 1.4 }); }
    }
    // creek bank colliders (not across the bridge) keep walkers out of the channel
    const P = CREEK.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const dx = P[i + 1][0] - P[i][0], dz = P[i + 1][1] - P[i][1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
      for (let t = 0; t < l; t += 2.2) {
        const x = P[i][0] + (dx / l) * t, z = P[i][1] + (dz / l) * t;
        if (Math.hypot(x - cx, z - cz) < 3.2) continue;
        [-1, 1].forEach((s) => colliders.push({ x: x + nx * s * (CREEK.half + 1.2), z: z + nz * s * (CREEK.half + 1.2), r: 0.9 }));
      }
    }
    // overlook at the end of the creek path
    const ox = 139, oz = -131, oy = heightAt(ox, oz), og = body.at(ox, oz, 0, oy);
    og.cyl(3.6, 0.3, 0, 0.12, 0, 0x9a6a3e); bench(ox + 1.5, oz + 3, face(ox, oz, 111, -113) + 0); lamp(ox - 3, oz - 2.5);
    signpost(ox - 5.5, oz + 2.5, face(ox, oz, 100, -100), ['CREEK OVERLOOK', 'Frozen stream & bridge'], '#34584a', '#e6fff0');
    occupy(ox, oz, 7);
    for (let i = 0; i < 18; i++) { const x = 90 + rng() * 52, z = -144 + rng() * 54; if (pathEdgeDist(x, z, 6) > 4 && creekD(x, z) > 8) tree(x, z, 0.8 + rng() * 0.8); }
  }
  // ================= LAKESIDE: docks, boat, boathouse landmark, benches, lamps, ice-zone signs
  chunk('lake');
  {
    const shoreOff = (deg) => 8.5 + 1.5 * Math.sin((deg / 10) * 0.9);
    const awayFrom = (deg, list, tol) => list.every((a) => Math.abs((((deg - a) % 360) + 540) % 360 - 180) > tol);
    const dockDegs = DOCKS.map((d) => d.deg);
    const lakeFace = (x, z) => Math.atan2(-x, -z);
    DOCKS.forEach((d) => {
      const p = dockPose(d), yaw = Math.atan2(p.dx, p.dz), g = body.at(p.x0, p.z0, yaw, 0), lg = light.at(p.x0, p.z0, yaw, 0), n = Math.ceil(d.len / 0.95);
      for (let i = 0; i < n; i++) g.box(d.w, 0.1, 0.92, 0, 0.07, i * 0.95 + 0.45, i % 2 ? 0x9a6a3e : 0xa4743f);
      for (let i = 0; i * 3.8 < d.len; i++) [-1, 1].forEach((s) => g.cyl(0.17, 1.4, s * (d.w / 2 - 0.1), 0.55, i * 3.8 + 0.3, 0x6b4527));
      [-1, 1].forEach((s) => { lg.sph(0.22, s * (d.w / 2 - 0.1), 1.45, 1.1, 0xffd9a0); glow(p.x0 + Math.sin(yaw) * 1.1 + Math.cos(yaw) * s * (d.w / 2 - 0.1), 1.45, p.z0 + Math.cos(yaw) * 1.1 - Math.sin(yaw) * s * (d.w / 2 - 0.1)); });
    });
    { // rowboat frozen in beside the east dock
      const p = dockPose(DOCKS[0]), yaw = Math.atan2(p.dx, p.dz), bx = p.x0 + p.dx * 11 + p.dz * 4.4 * -1, bz = p.z0 + p.dz * 11 + p.dx * 4.4, g = body.at(bx, bz, yaw + 0.25, 0);
      g.box(2.3, 0.75, 4.8, 0, 0.4, 0, 0x8a5a36); g.box(1.6, 0.75, 1.6, 0, 0.4, 3.0, 0x8a5a36, 0, Math.PI / 4, 0); g.box(1.9, 0.1, 4.7, 0, 0.82, 0, 0xf4efe6); g.box(1.7, 0.12, 4.5, 0, 0.9, -0.1, 0x6b4527); g.box(1.9, 0.3, 3.8, 0, 0.99, -0.1, SNOW);
      [-1, 0, 1].forEach((k) => colliders.push({ x: bx + Math.sin(yaw + 0.25) * k * 1.8, z: bz + Math.cos(yaw + 0.25) * k * 1.8, r: 1.3 }));
    }
    { // boathouse cabin behind the south dock: the lake's main landmark
      const [cx, cz] = lakePt(252, 18), yaw = Math.atan2(-cx, -cz), g = body.at(cx, cz, yaw, 0), lg = light.at(cx, cz, yaw, 0), trim = 0x5e3a22;
      g.box(11, 5, 8, 0, 2.5, 0, 0xb8683c);
      [-1, 1].forEach((s) => { g.box(12.4, 0.5, 5.4, 0, 6.2, s * 2.2, trim, -s * 0.52); g.box(12.6, 0.4, 5.6, 0, 6.5, s * 2.25, SNOW, -s * 0.52); });
      g.box(1.1, 2.6, 1.1, 3.4, 7.4, -1.4, 0x7c7f88); g.box(1.3, 0.3, 1.3, 3.4, 8.8, -1.4, SNOW);
      g.box(1.8, 3.1, 0.3, -1.5, 1.55, 4.1, trim); g.box(3, 0.3, 1.4, -1.5, 0.15, 4.9, 0x6b4527);
      [2.2, 4.0].forEach((x) => { lg.box(1.7, 1.7, 0.3, x, 2.9, 4.1, 0xffd27a); g.box(2.0, 2.0, 0.2, x, 2.9, 4.0, trim); });
      [-3.6, -1.35, 0.9, 3.15].forEach((z) => lg.box(0.3, 1.5, 1.5, 5.6, 2.9, z, 0xffd27a));
      boxColliders(cx, cz, 11.6, 8.6, yaw); occupy(cx, cz, 10);
      const lx = cx + Math.sin(yaw) * 5.4 + Math.cos(yaw) * -3.8, lz = cz + Math.cos(yaw) * 5.4 - Math.sin(yaw) * -3.8; lamp(lx, lz);
    }
    for (const deg of [20, 58, 112, 136, 172, 208, 238, 292, 336]) {
      if (!awayFrom(deg, ACCESS.concat(dockDegs), 9)) continue;
      const [x, z] = lakePt(deg, shoreOff(deg) + 2.9); bench(x, z, lakeFace(x, z));
    }
    for (let deg = 15; deg < 360; deg += 30) {
      if (!awayFrom(deg, ACCESS.concat(dockDegs), 10)) continue;
      const [x, z] = lakePt(deg, shoreOff(deg) + 3.3); lamp(x, z);
    }
    [[78, 'BEGINNER ICE', 'Calm, gentle practice', '#2f6a8a'], [14, 'FREE SKATE', 'Room to carve and glide', '#2f4e73'], [194, 'SOCIAL ICE', 'Meet and skate together', '#6a3f72'], [-31, 'SCENIC SHORE', 'Dock - lamps - photo spot', '#34584a']].forEach(([deg, t, sub, bg]) => {
      const [x, z] = lakePt(deg, 12.5); signpost(x, z, lakeFace(x, z), [t, sub], bg, '#f2f9ff');
    });
  }
  // Northwest / southwest woods: park benches along the trails
  chunk('woods'); bench(-100, 93, face(-100, 93, -120, 110)); bench(-112, -118, face(-112, -118, -125, -130));

  // ---- finish: merged meshes per chunk
  const bodyMat = toonMat({ vertexColors: true }), flatMat = toonMat({ vertexColors: true, soft: true, noOutline: true }), lightMat = new T.MeshBasicMaterial({ vertexColors: true });
  Object.values(chunks).forEach((c) => { group.add(c.body.build(bodyMat, true), c.flat.build(flatMat, false), c.light.build(lightMat, false)); });
  signMeshes.forEach((m) => group.add(m));
  addOutlines(group, { thick: 0.0026, fade: 1 });

  // Is (x,z) taken by a road, plaza, building, creek or other landmark (with margin m)?
  function blocked(x, z, m) {
    if (pathEdgeDist(x, z, m + 2) < m) return true;
    if (creekD(x, z) < 6 + m) return true;
    for (const o of occupied) if (Math.hypot(x - o[0], z - o[1]) < o[2] + m) return true;
    return false;
  }
  return { colliders, glowPts, flicker, trees, blocked, lightMat, benches: benchList };
}
