// Detailed toon models for shop goods (drinks, bakes, gifts). One builder per item id; the result is a Group
// centred on the origin and scaled so its longest side is 1 (callers scale it to hand or icon size).
// Used by the shop icons and by the props the player holds while eating.
import { toonMat, addOutlines } from './anime.js';
const T = THREE;

const M = (color, o = {}) => toonMat({ color, soft: true, ...o });
const M2 = (color) => M(color, { side: T.DoubleSide });
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); return o; };
const lathe = (pts, seg = 28) => new T.LatheGeometry(pts.map(([x, y]) => new T.Vector2(x, y)), seg);
const sph = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = mesh(new T.SphereGeometry(r, 14, 10), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; };
const shine = (r, x, y, z) => sph(r, new T.MeshBasicMaterial({ color: 0xffffff }), x, y, z, 1, 0.8, 0.6);

function heartShape(s = 1) {
  const sh = new T.Shape();
  sh.moveTo(0, -0.5 * s); sh.bezierCurveTo(-0.95 * s, 0.12 * s, -0.5 * s, 0.78 * s, 0, 0.34 * s); sh.bezierCurveTo(0.5 * s, 0.78 * s, 0.95 * s, 0.12 * s, 0, -0.5 * s);
  return sh;
}
const extrude = (shape, depth, bevel = 0.03) => { const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 18 }); g.translate(0, 0, -depth / 2); return g; };
const ring = (r, tube, m, x, y, z, rx = 0, ry = 0, arc = Math.PI * 2) => { const o = mesh(new T.TorusGeometry(r, tube, 8, 24, arc), m, x, y, z); o.rotation.set(rx, ry, 0); return o; };

function steam(g, x, y, z) { // three soft wisps
  const m = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false });
  [[-0.08, 0, 0.1], [0.06, 0.16, 0.13], [-0.03, 0.34, 0.1]].forEach(([dx, dy, r]) => { const s = sph(r, m, x + dx, y + dy, z); s.userData.noOutline = true; g.add(s); });
}

// ---------------------------------------------------------------- drinks
function mugBody(g, bodyCol, rimCol, tall) {
  const h = tall ? 0.8 : 0.7, m = M2(bodyCol);
  g.add(mesh(lathe([[0, 0], [0.3, 0], [0.38, 0.05], [0.41, h * 0.55], [0.43, h], [0.4, h + 0.02], [0.37, h - 0.02], [0.35, 0.1], [0, 0.09]]), m));
  g.add(ring(0.42, 0.028, M(rimCol), 0, h, 0, Math.PI / 2));
  g.add(ring(0.2, 0.055, m, 0.5, h * 0.52, 0, 0, 0, Math.PI * 1.15)); // handle
  g.children[g.children.length - 1].rotation.z = -Math.PI * 0.58;
  g.add(ring(0.29, 0.03, M(rimCol), 0, 0.03, 0, Math.PI / 2));
  return h;
}
function cocoa(g, kind) {
  const col = { dr_cocoa: [0xf4efe6, 0xd94f4f, 0x6a3f24], dr_marsh: [0xdfeaf6, 0x5aa7d6, 0x5a3320] }[kind];
  const h = mugBody(g, col[0], col[1], false);
  g.add(mesh(new T.CircleGeometry(0.355, 24), M(col[2]), 0, h - 0.05, 0)); g.children[g.children.length - 1].rotation.x = -Math.PI / 2;
  // painted band (a little heart / dot row) around the cup
  const band = tex(256, 64, (x, w, hh) => { x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, w, hh); x.fillStyle = '#' + col[1].toString(16).padStart(6, '0'); for (let i = 0; i < 8; i++) { x.beginPath(); x.arc(16 + i * 32, 32, 8, 0, 7); x.fill(); } });
  const bm = new T.MeshBasicMaterial({ map: band, transparent: true, side: T.DoubleSide }); const b = mesh(new T.CylinderGeometry(0.422, 0.412, 0.14, 28, 1, true), bm, 0, h * 0.5, 0); b.userData.noOutline = true; g.add(b);
  if (kind === 'dr_cocoa') { // whipped swirl and a dusting of cocoa
    for (let i = 0; i < 3; i++) g.add(sph(0.2 - i * 0.05, M(0xfff7ec), 0, h - 0.02 + i * 0.1, 0, 1, 0.7, 1));
    g.add(mesh(new T.ConeGeometry(0.05, 0.12, 8), M(0xfff7ec), 0, h + 0.28, 0));
    for (let i = 0; i < 5; i++) g.add(sph(0.016, M(0x4a2a18), Math.cos(i * 1.3) * 0.12, h + 0.12 - (i % 2) * 0.03, Math.sin(i * 1.3) * 0.12));
  } else { // marshmallows with a chocolate drizzle
    [[-0.14, 0.1], [0.12, 0.12], [0, -0.14], [0.1, -0.08], [-0.1, -0.1]].forEach(([x, z], i) => { const mm = mesh(new T.CylinderGeometry(0.1, 0.1, 0.1, 14), M(i % 2 ? 0xfff0f4 : 0xffffff), x, h + 0.04, z); mm.rotation.set(0.15 * i, i, 0.1); g.add(mm); });
    g.add(ring(0.2, 0.014, M(0x3a1d10), 0, h + 0.11, 0, Math.PI / 2));
  }
  g.userData.steam = [0, h + 0.5, 0];
}
function latte(g) {
  const sa = M2(0xf1ece2);
  g.add(mesh(lathe([[0, 0], [0.75, 0], [0.78, 0.03], [0.8, 0.06], [0.5, 0.07], [0, 0.07]]), sa));
  g.add(ring(0.77, 0.018, M(0xc9a36a), 0, 0.05, 0, Math.PI / 2));
  const cup = new T.Group(); cup.position.y = 0.07; g.add(cup);
  cup.add(mesh(lathe([[0, 0], [0.2, 0], [0.36, 0.1], [0.5, 0.34], [0.52, 0.42], [0.5, 0.42], [0.47, 0.36], [0.33, 0.14], [0, 0.1]]), M2(0xe9d6b8)));
  cup.add(ring(0.51, 0.026, M(0xc08a54), 0, 0.42, 0, Math.PI / 2));
  const handle = ring(0.19, 0.05, M2(0xe9d6b8), 0.58, 0.24, 0, 0, 0, Math.PI * 1.1); handle.rotation.z = -Math.PI * 0.55; cup.add(handle);
  const lt = mesh(new T.CircleGeometry(0.47, 28), M(0xb8864f), 0, 0.4, 0); lt.rotation.x = -Math.PI / 2; cup.add(lt);
  // foam art: a leaf (two arcs) and cinnamon dusting
  [[0.3, 0xfff1d8], [0.18, 0xe6c796]].forEach(([r, c], i) => { const f = mesh(new T.CircleGeometry(r, 24), M(c), 0, 0.405 + i * 0.004, 0); f.rotation.x = -Math.PI / 2; cup.add(f); });
  for (let i = 0; i < 7; i++) { const l = sph(0.05, M(0xfff1d8), 0, 0.41, -0.2 + i * 0.065, 0.55 + 0.45 * Math.sin((i / 6) * Math.PI), 0.3, 1); cup.add(l); }
  const st = mesh(new T.CylinderGeometry(0.03, 0.03, 0.55, 8), M(0x8a5330), 0.12, 0.5, 0.1); st.rotation.set(0.25, 0.4, 1.35); cup.add(st);
  cup.add(mesh(new T.TorusGeometry(0.03, 0.015, 6, 10), M(0x6a3c22), 0.37, 0.49, 0.2));
  g.userData.steam = [0, 0.75, 0];
}

// ---------------------------------------------------------------- bakes
function bun(g) {
  const dough = M(0xd9a05a);
  g.add(sph(0.52, dough, 0, 0.25, 0, 1, 0.55, 1));
  g.add(sph(0.44, M(0xc2873e), 0, 0.08, 0, 1.12, 0.3, 1.12)); // browned base
  // cinnamon spiral on top
  const pts = []; for (let i = 0; i <= 48; i++) { const t = i / 48, a = t * Math.PI * 4.4, r = 0.04 + t * 0.4; pts.push(new T.Vector3(Math.cos(a) * r, 0.25 + 0.286 * Math.sqrt(Math.max(0, 1 - (r / 0.52) * (r / 0.52))) + 0.005, Math.sin(a) * r)); }
  g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 90, 0.032, 7), M(0x7a3f1e)));
  // glaze drips
  const gl = M(0xfff6ea);
  for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 0.12 + (i % 3) * 0.1; g.add(sph(0.07, gl, Math.cos(a) * r, 0.25 + 0.286 * Math.sqrt(Math.max(0, 1 - (r / 0.52) * (r / 0.52))) + 0.02, Math.sin(a) * r, 1.25, 0.55, 1)); }
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.4; g.add(mesh(new T.CylinderGeometry(0.028, 0.034, 0.1 + (i % 2) * 0.05, 6), gl, Math.cos(a) * 0.42, 0.16, Math.sin(a) * 0.42)); }
  for (let i = 0; i < 7; i++) g.add(sph(0.016, M(0xffffff), Math.cos(i * 2.1) * 0.3, 0.46 - (i % 3) * 0.02, Math.sin(i * 2.1) * 0.3));
}
function tart(g) {
  const crust = M2(0xd49a52);
  g.add(mesh(lathe([[0, 0], [0.55, 0], [0.62, 0.05], [0.64, 0.22], [0.57, 0.24], [0.54, 0.2], [0.5, 0.08], [0, 0.08]]), crust));
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; const f = mesh(new T.CylinderGeometry(0.045, 0.05, 0.2, 8), M(0xc58a44), Math.cos(a) * 0.6, 0.12, Math.sin(a) * 0.6); f.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); g.add(f); }
  const fill = mesh(new T.CircleGeometry(0.54, 28), M(0xf6d98a), 0, 0.2, 0); fill.rotation.x = -Math.PI / 2; g.add(fill);
  const bc = [0xc2415a, 0xa02a4a, 0xd9566e, 0x7a2a58];
  const rings = [[0, 1], [0.2, 6], [0.4, 10]]; let k = 0;
  rings.forEach(([r, n]) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r * 3; const y = 0.27 + (r === 0 ? 0.1 : r < 0.3 ? 0.05 : 0); g.add(sph(0.105, M(bc[k++ % 4]), Math.cos(a) * r, y, Math.sin(a) * r, 1, 0.92, 1)); g.add(shine(0.02, Math.cos(a) * r - 0.03, y + 0.09, Math.sin(a) * r + 0.03)); } });
  const leaf = mesh(new T.SphereGeometry(0.1, 10, 6), M(0x5aa86a), 0.08, 0.42, 0.04); leaf.scale.set(1.5, 0.25, 0.8); leaf.rotation.y = 0.6; g.add(leaf);
  for (let i = 0; i < 8; i++) g.add(sph(0.014, M(0xffffff), Math.cos(i * 2.4) * 0.45, 0.31, Math.sin(i * 2.4) * 0.45));
}
function loaf(g) {
  const sh = new T.Shape(); sh.moveTo(-0.55, 0); sh.lineTo(0.55, 0); sh.lineTo(0.58, 0.2); sh.quadraticCurveTo(0.62, 0.66, 0.0, 0.66); sh.quadraticCurveTo(-0.62, 0.66, -0.58, 0.2); sh.lineTo(-0.55, 0);
  const geo = extrude(sh, 0.62, 0.05); g.add(mesh(geo, M(0xd9a24a)));
  g.add(mesh(new T.BoxGeometry(1.0, 0.1, 0.5), M(0xb9822f), 0, 0.03, 0)); // darker bottom crust
  for (let i = 0; i < 4; i++) { const s = mesh(new T.BoxGeometry(0.08, 0.04, 0.38), M(0xf0c872), -0.36 + i * 0.24, 0.73 - Math.abs(-0.36 + i * 0.24) * 0.12, 0); s.rotation.set(0, 0.5, 0); g.add(s); }
  const pts = []; for (let i = 0; i <= 16; i++) pts.push(new T.Vector3(-0.5 + i * 0.062, 0.765 - Math.abs(-0.5 + i * 0.062) * 0.2, Math.sin(i * 0.9) * 0.16));
  g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 0.028, 6), M(0xf2b01e)));
  [[-0.2, 0.36], [0.26, -0.3]].forEach(([x, z]) => g.add(sph(0.05, M(0xf2b01e), x * 0.6, 0.72, z * 0.6, 1, 1.5, 1)));
  for (let i = 0; i < 12; i++) g.add(sph(0.014, M(0xf6e3b0), -0.4 + (i % 6) * 0.16, 0.73 - Math.abs(-0.4 + (i % 6) * 0.16) * 0.12, -0.15 + Math.floor(i / 6) * 0.3));
  // little honey dipper
}

// ---------------------------------------------------------------- gifts
function bow(g, col, y, scale = 1) {
  const m = M(col);
  [[-1, 0.5], [1, -0.5]].forEach(([s, rz]) => { const l = sph(0.2 * scale, m, s * 0.17 * scale, y, 0, 1.3, 0.8, 0.6); l.rotation.z = rz * 0.5; g.add(l); });
  g.add(sph(0.075 * scale, M(col), 0, y, 0.01, 1, 1, 1));
  [[-1], [1]].forEach(([s]) => { const t = mesh(new T.BoxGeometry(0.07 * scale, 0.3 * scale, 0.02), m, s * 0.1 * scale, y - 0.16 * scale, 0.02); t.rotation.z = s * 0.35; g.add(t); });
}
function chocBox(g) {
  g.add(mesh(new T.BoxGeometry(1, 0.34, 0.7), M(0x5a2f1a), 0, 0.17, 0)); // box
  g.add(mesh(new T.BoxGeometry(1.04, 0.14, 0.74), M(0x7a3f22), 0, 0.4, 0)); // lid
  g.add(mesh(new T.BoxGeometry(0.88, 0.02, 0.58), M(0xd9a441), 0, 0.475, 0)); // gold inlay
  g.add(mesh(new T.BoxGeometry(0.8, 0.025, 0.5), M(0x7a3f22), 0, 0.485, 0));
  const gold = M(0xe8b84a);
  g.add(mesh(new T.BoxGeometry(0.12, 0.17, 0.78), gold, 0, 0.4, 0)); g.add(mesh(new T.BoxGeometry(1.08, 0.17, 0.12), gold, 0, 0.4, 0));
  bow(g, 0xe8b84a, 0.62, 0.55);
  const lab = mesh(new T.CircleGeometry(0.1, 16), M(0xfff1d0), 0.28, 0.495, 0.14); lab.rotation.x = -Math.PI / 2; g.add(lab);
  g.add(sph(0.045, M(0xc2415a), 0.28, 0.5, 0.14, 1, 0.5, 1));
  [-0.4, 0.4].forEach((x) => [-0.28, 0.28].forEach((z) => g.add(sph(0.03, gold, x, 0.47, z)))); // studs
}
function rose(g) {
  const stem = new T.CatmullRomCurve3([new T.Vector3(0.05, -0.7, 0), new T.Vector3(-0.03, -0.3, 0.02), new T.Vector3(0.02, 0.1, 0), new T.Vector3(0, 0.3, 0)]);
  g.add(mesh(new T.TubeGeometry(stem, 20, 0.032, 6), M(0x3f8a4a)));
  [[-0.05, -0.32, 0.5], [0.06, -0.1, -0.5]].forEach(([x, y, a]) => { g.add(mesh(new T.ConeGeometry(0.012, 0.05, 5), M(0x3a7a42), x, y, 0.03)); const l = sph(0.15, M2(0x4aa05a), x + (a > 0 ? -0.15 : 0.15), y - 0.02, 0, 1.6, 0.12, 0.8); l.rotation.z = a; g.add(l); });
  // blossom: layered cupped petals around a tight bud
  const petalCols = [0x8f1230, 0xb81f3f, 0xd13a58, 0xe8566f];
  g.add(sph(0.12, M(0x9a1636), 0, 0.46, 0, 1, 1.15, 1));
  for (let i = 0; i < 14; i++) {
    const layer = Math.floor(i / 5), a = i * 2.4, r = 0.12 + layer * 0.07;
    const p = mesh(new T.SphereGeometry(0.2 + layer * 0.03, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), M2(petalCols[Math.min(3, layer + (i % 2))]), Math.cos(a) * r * 0.5, 0.44 - layer * 0.03, Math.sin(a) * r * 0.5);
    p.rotation.set(Math.sin(a) * (0.5 + layer * 0.22), a, -Math.cos(a) * (0.5 + layer * 0.22)); p.scale.set(1, 0.85, 0.6); g.add(p);
  }
  for (let i = 0; i < 5; i++) { const a = i * 1.26, s = mesh(new T.ConeGeometry(0.035, 0.22, 5), M(0x3f8a4a), Math.cos(a) * 0.12, 0.22, Math.sin(a) * 0.12); s.rotation.set(Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0); g.add(s); }
  for (let i = 0; i < 6; i++) g.add(sph(0.014, M(0xffffff), Math.cos(i * 1.9) * 0.2, 0.5 + (i % 3) * 0.04, Math.sin(i * 1.9) * 0.2));
}
function mugGift(g) {
  mugBody(g, 0xf3ece0, 0x2f6fb0, false);
  const pat = tex(512, 128, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.fillStyle = '#2f6fb0'; x.fillRect(0, 8, w, 10); x.fillRect(0, h - 18, w, 10);
    for (let i = 0; i < 4; i++) { const cx = 64 + i * 128, cy = 64; x.strokeStyle = '#2f6fb0'; x.lineWidth = 6; x.lineCap = 'round'; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; x.beginPath(); x.moveTo(cx - Math.cos(a) * 30, cy - Math.sin(a) * 30); x.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30); x.stroke(); } x.fillStyle = '#e8667f'; x.beginPath(); x.arc(cx, cy, 6, 0, 7); x.fill(); }
  });
  const b = mesh(new T.CylinderGeometry(0.438, 0.398, 0.5, 32, 1, true), new T.MeshBasicMaterial({ map: pat, transparent: true, side: T.DoubleSide }), 0, 0.37, 0); b.userData.noOutline = true; g.add(b);
  g.add(mesh(new T.CircleGeometry(0.355, 24), M(0x6a3f24), 0, 0.64, 0)); g.children[g.children.length - 1].rotation.x = -Math.PI / 2;
  const t = mesh(new T.BoxGeometry(0.2, 0.04, 0.12), M(0xe8667f), 0.46, 0.18, 0); g.add(t); // little ribbon tag
  g.userData.steam = [0, 0.95, 0];
}
function skateCharm(g) {
  const silver = M(0xcfd8e4), dark = M(0x7a8aa0), blue = M(0x4aa8ff);
  const boot = new T.Shape(); boot.moveTo(-0.45, 0); boot.lineTo(0.4, 0); boot.quadraticCurveTo(0.62, 0.02, 0.62, 0.17); boot.quadraticCurveTo(0.6, 0.3, 0.32, 0.34); boot.lineTo(0.12, 0.42); boot.lineTo(0.05, 0.85); boot.lineTo(-0.34, 0.85); boot.lineTo(-0.38, 0.4); boot.lineTo(-0.47, 0.2); boot.lineTo(-0.45, 0);
  g.add(mesh(extrude(boot, 0.24, 0.03), silver, 0, 0.06, 0));
  g.add(mesh(new T.BoxGeometry(0.9, 0.09, 0.26), dark, 0.07, 0.03, 0)); // sole
  const blade = new T.Shape(); blade.moveTo(-0.5, -0.1); blade.lineTo(0.55, -0.1); blade.quadraticCurveTo(0.78, -0.08, 0.76, 0.1); blade.lineTo(0.62, 0.0); blade.lineTo(-0.5, 0); blade.lineTo(-0.5, -0.1);
  g.add(mesh(extrude(blade, 0.04, 0.012), M(0xf1f5fa), 0, -0.02, 0));
  [-0.3, 0.45].forEach((x) => g.add(mesh(new T.BoxGeometry(0.06, 0.12, 0.06), dark, x, 0.0, 0)));
  for (let i = 0; i < 4; i++) g.add(sph(0.026, blue, -0.14 + i * 0.01, 0.42 + i * 0.12, 0.13));
  g.add(mesh(new T.BoxGeometry(0.42, 0.07, 0.27), blue, -0.14, 0.83, 0)); // cuff trim
  g.add(ring(0.08, 0.025, silver, -0.15, 1.02, 0, 0, Math.PI / 2));
  for (let i = 0; i < 3; i++) g.add(ring(0.06, 0.016, silver, -0.15 + i * 0.07, 1.12 + i * 0.07, 0, i % 2 ? Math.PI / 2 : 0, 0));
}
function poemBook(g) {
  const cover = M(0x7a5a8a), gold = M(0xe3b94a);
  g.add(mesh(new T.BoxGeometry(0.1, 0.9, 0.7), cover, -0.4, 0.45, 0));
  g.add(mesh(new T.BoxGeometry(0.72, 0.9, 0.06), cover, 0, 0.45, 0.32)); g.add(mesh(new T.BoxGeometry(0.72, 0.9, 0.06), cover, 0, 0.45, -0.32));
  g.add(mesh(new T.BoxGeometry(0.66, 0.84, 0.54), M(0xf6efdc), 0.04, 0.45, 0));
  for (let i = 0; i < 5; i++) g.add(mesh(new T.BoxGeometry(0.67, 0.84, 0.004), M(0xd9ceb4), 0.04, 0.45, -0.22 + i * 0.11));
  [0.15, 0.45, 0.75].forEach((y) => g.add(mesh(new T.BoxGeometry(0.12, 0.05, 0.72), gold, -0.4, y, 0)));
  const art = tex(256, 320, (x, w, h) => {
    x.fillStyle = '#7a5a8a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e3b94a'; x.lineWidth = 7; x.strokeRect(16, 16, w - 32, h - 32); x.lineWidth = 3; x.strokeRect(28, 28, w - 56, h - 56);
    x.fillStyle = '#e3b94a'; x.textAlign = 'center'; x.font = 'bold 40px serif'; x.fillText('Winter', w / 2, 200); x.font = 'italic 34px serif'; x.fillText('Poems', w / 2, 244);
    x.translate(w / 2, 110); for (let k = 0; k < 6; k++) { x.rotate(Math.PI / 3); x.beginPath(); x.ellipse(0, -30, 9, 26, 0, 0, 7); x.fill(); } x.beginPath(); x.arc(0, 0, 9, 0, 7); x.fillStyle = '#7a5a8a'; x.fill();
  });
  const face = mesh(new T.PlaneGeometry(0.62, 0.78), new T.MeshBasicMaterial({ map: art }), 0, 0.45, 0.356); face.userData.noOutline = true; g.add(face);
  g.add(mesh(new T.BoxGeometry(0.035, 0.34, 0.012), M(0xd94f4f), 0.1, 0.0, 0.1)); // bookmark ribbon
  const tip = mesh(new T.ConeGeometry(0.035, 0.06, 3), M(0xd94f4f), 0.1, -0.2, 0.1); tip.rotation.z = Math.PI; g.add(tip);
}
function promiseCharm(g) {
  const gold = M(0xe8b84a), rose = M(0xff8fb1);
  g.add(mesh(extrude(heartShape(1.15), 0.14, 0.05), gold));
  const inner = mesh(extrude(heartShape(0.84), 0.12, 0.04), rose, 0, -0.02, 0.07); g.add(inner);
  g.add(sph(0.075, M(0xffffff), 0, 0.2, 0.19, 1, 1, 0.8)); g.add(shine(0.02, -0.02, 0.23, 0.24));
  for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.36; g.add(sph(0.022, M(0xfff1c8), Math.sin(a) * 0.42, 0.05 + Math.cos(a) * 0.1 - Math.abs(a) * 0.3, 0.19)); }
  g.add(ring(0.09, 0.03, gold, 0, 0.67, 0, 0, 0));
  for (let i = 0; i < 4; i++) { const a = i * 0.9; g.add(ring(0.065, 0.016, gold, Math.sin(a) * 0.3, 0.8 + i * 0.08, 0, i % 2 ? Math.PI / 2 : 0, 0)); }
  [[0.5, 0.45], [-0.55, 0.15]].forEach(([x, y]) => { const s1 = mesh(new T.BoxGeometry(0.2, 0.025, 0.02), M(0xffffff), x, y, 0.2), s2 = mesh(new T.BoxGeometry(0.025, 0.2, 0.02), M(0xffffff), x, y, 0.2); s1.userData.noOutline = s2.userData.noOutline = true; g.add(s1, s2); });
}

const BUILDERS = {
  dr_cocoa: (g) => cocoa(g, 'dr_cocoa'), dr_marsh: (g) => cocoa(g, 'dr_marsh'), dr_latte: latte,
  bk_bun: bun, bk_tart: tart, bk_loaf: loaf,
  gf_choc: chocBox, gf_flower: rose, gf_mug: mugGift, gf_skate: skateCharm, gf_book: poemBook, gf_charm: promiseCharm,
};
export const hasModel = (id) => !!BUILDERS[id];
const LEGACY = { cup: 'dr_cocoa', bun: 'bk_bun' };

// opts.steam: add soft steam wisps (icons only). Returns a Group whose longest side is ~1, centred.
export function buildItem(id, opts = {}) {
  const b = BUILDERS[LEGACY[id] || id]; if (!b) return null;
  const inner = new T.Group(); b(inner);
  const st = inner.userData.steam; if (opts.steam && st) steam(inner, st[0], st[1], st[2]);
  addOutlines(inner, { thick: opts.thick || 0.0034 });
  const box = new T.Box3().setFromObject(inner), size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
  const k = 1 / Math.max(size.x, size.y, size.z, 0.01);
  inner.position.set(-c.x, -c.y, -c.z);
  const root = new T.Group(); root.add(inner); root.scale.setScalar(k);
  root.userData.dispose = () => root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  return root;
}
