// Sled skins sold in the shop for golden fish. Each one is its own shape, not just a recolour.
// All sleds face +Z and sit on y = 0. `lift` raises Baldy so he sits on (or in) the sled properly.

export const SLEDS = [
  { id: 'classic', name: 'Wooden Sled', price: 0, lift: 0 },
  { id: 'tube', name: 'Snow Tube', price: 30, lift: 0.2 },
  { id: 'penguin', name: 'Penguin Glider', price: 60, lift: 0.2 },
  { id: 'rocket', name: 'Rocket Sled', price: 100, lift: 0.06 },
  { id: 'dragon', name: 'Dragon Boat', price: 150, lift: 0 },
  { id: 'goldfish', name: 'Golden Fish', price: 220, lift: 0.3 },
];

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const soft = (color, roughness = 0.75) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
const gloss = (color, emissive = 0x000000, k = 0.3) => new THREE.MeshPhongMaterial({ color, emissive, emissiveIntensity: k, shininess: 110, specular: 0xffffff });
const glow = color => new THREE.MeshBasicMaterial({ color });
const STEEL = () => gloss(0xc9d2de);
const BRASS = () => gloss(0xf2b632, 0x7a4a00, 0.4);

function add(parent, geo, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m);
  return m;
}
/** Round bar bent through points. */
function pipe(parent, pts, r, material, seg = 28) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(p[0], p[1], p[2]))), seg, r, 8, false), material);
  parent.add(m); return m;
}
/** Flat bevelled plate from a 2D outline given as [z, y] pairs, standing in the YZ plane at x. */
function plate(parent, outline, thickness, material, x = 0) {
  const s = new THREE.Shape();
  outline.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
  geo.translate(0, 0, -thickness / 2);
  const holder = new THREE.Group(); holder.position.x = x; parent.add(holder);
  const m = new THREE.Mesh(geo, material); m.rotation.y = -Math.PI / 2; holder.add(m);
  return holder;
}
/** Smooth body turned around the Z axis from [z, radius] keys. */
function hull(parent, keys, material, y, steps = 30, segments = 28) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, z = keys[0][0] + (keys[keys.length - 1][0] - keys[0][0]) * t;
    let r = keys[keys.length - 1][1];
    for (let k = 1; k < keys.length; k++) if (z <= keys[k][0]) {
      const a = keys[k - 1], b = keys[k], u = (z - a[0]) / (b[0] - a[0]), s = u * u * (3 - 2 * u);
      r = a[1] + (b[1] - a[1]) * s; break;
    }
    pts.push(new THREE.Vector2(Math.max(0.001, r), z));
  }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, segments), material);
  m.rotation.x = Math.PI / 2; m.position.y = y; parent.add(m);
  return m;
}
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** A pair of steel runners with curled tips, shared by several sleds. */
function runners(g, half, from, to, steel, curl = 0.2) {
  [-1, 1].forEach(s => pipe(g, [[s * half, 0.03, from], [s * half, 0.03, to - 0.25], [s * half, 0.07, to], [s * half, 0.07 + curl * 0.7, to + curl * 0.6], [s * half, 0.07 + curl * 1.3, to + curl * 0.35]], 0.026, steel));
}

function classic(g) {
  const steel = STEEL(), brass = BRASS(), oak = soft(0xc98a4b, 0.7), walnut = soft(0xa9682f, 0.7), red = soft(0xd9482b, 0.55), cream = soft(0xfff3d6, 0.8);
  runners(g, 0.31, -0.75, 0.72, steel, 0.22);
  [-0.52, -0.02, 0.48].forEach(z => {
    [-1, 1].forEach(s => { const leg = add(g, new THREE.CylinderGeometry(0.02, 0.026, 0.19, 8), steel, s * 0.3, 0.115, z); leg.rotation.z = s * 0.06; });
    const bar = add(g, new THREE.CapsuleGeometry(0.03, 0.56, 4, 8), walnut, 0, 0.205, z); bar.rotation.z = Math.PI / 2;
  });
  for (let i = -2; i <= 2; i++) {                                   // five rounded deck slats
    const slat = add(g, new THREE.CapsuleGeometry(0.058, 1.2, 4, 10), i % 2 ? walnut : oak, i * 0.132, 0.235, -0.03, 1, 1, 0.42); slat.rotation.x = Math.PI / 2;
    [-0.6, 0.55].forEach(z => add(g, new THREE.SphereGeometry(0.014, 6, 6), brass, i * 0.132, 0.262, z));
  }
  const cushion = add(g, new THREE.SphereGeometry(0.3, 18, 12), red, 0, 0.275, -0.12, 1, 0.16, 1.05);
  const piping = add(g, new THREE.TorusGeometry(0.285, 0.014, 6, 28), cream, 0, 0.275, -0.12, 1, 1.05, 1); piping.rotation.x = Math.PI / 2;
  void cushion;
  const bar = add(g, new THREE.CapsuleGeometry(0.032, 0.62, 4, 10), oak, 0, 0.33, 0.8); bar.rotation.z = Math.PI / 2;      // steering bar on the curls
  [-1, 1].forEach(s => add(g, new THREE.SphereGeometry(0.05, 10, 8), red, s * 0.36, 0.33, 0.8));
  pipe(g, [[-0.2, 0.33, 0.8], [-0.14, 0.27, 0.62], [0, 0.265, 0.5], [0.14, 0.27, 0.62], [0.2, 0.33, 0.8]], 0.012, cream, 20);   // tow rope
  const bell = add(g, new THREE.SphereGeometry(0.04, 10, 8), brass, 0, 0.28, 0.83);
  void bell;
}

function tube(g) {
  const blue = gloss(0x2f8fe8, 0x0b3f86, 0.25), navy = soft(0x174a8f, 0.8), white = gloss(0xffffff), yellow = gloss(0xffd23f, 0x7a5200, 0.3), black = soft(0x1c2533, 0.9);
  const ring = add(g, new THREE.TorusGeometry(0.56, 0.26, 20, 40), blue, 0, 0.27, 0.1); ring.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {                                     // candy stripes wrapped around the ring
    const a = i / 8 * Math.PI * 2, s = add(g, new THREE.TorusGeometry(0.264, 0.04, 8, 22), i % 2 ? yellow : white, Math.sin(a) * 0.56, 0.27, 0.1 + Math.cos(a) * 0.56);
    s.rotation.y = a + Math.PI / 2;
  }
  const seam = add(g, new THREE.TorusGeometry(0.822, 0.012, 6, 44), navy, 0, 0.27, 0.1); seam.rotation.x = Math.PI / 2;      // welded outer seam
  add(g, new THREE.CylinderGeometry(0.62, 0.5, 0.05, 28), black, 0, 0.035, 0.1);                         // slick base
  add(g, new THREE.CylinderGeometry(0.36, 0.36, 0.04, 24), navy, 0, 0.2, 0.1);                           // padded seat
  const stitch = add(g, new THREE.TorusGeometry(0.3, 0.01, 6, 28), white, 0, 0.222, 0.1); stitch.rotation.x = Math.PI / 2;
  [-1, 1].forEach(side => {
    const base = add(g, new THREE.CylinderGeometry(0.075, 0.085, 0.03, 12), black, side * 0.6, 0.525, 0.1); base.rotation.z = side * -0.25;
    const h = add(g, new THREE.TorusGeometry(0.1, 0.03, 8, 16, Math.PI), yellow, side * 0.6, 0.53, 0.1); h.rotation.y = Math.PI / 2;
    for (let k = -1; k <= 1; k++) { const grip = add(g, new THREE.TorusGeometry(0.032, 0.008, 6, 10), black, side * 0.6, 0.53 + Math.cos(k * 0.6) * 0.1, 0.1 + Math.sin(k * 0.6) * 0.1); grip.rotation.x = -k * 0.6 + Math.PI / 2; grip.rotation.y = 0; }
  });
  [0.6, 2.2, 3.9, 5.4].forEach(a => {                                // star decals on top
    const star = add(g, new THREE.CylinderGeometry(0.075, 0.075, 0.012, 5), yellow, Math.sin(a) * 0.56, 0.532, 0.1 + Math.cos(a) * 0.56); star.rotation.y = a;
  });
  add(g, new THREE.CylinderGeometry(0.03, 0.04, 0.06, 10), black, -0.2, 0.51, -0.42);                     // air valve
  add(g, new THREE.SphereGeometry(0.032, 8, 8), yellow, -0.2, 0.545, -0.42);
  pipe(g, [[0.12, 0.5, 0.64], [0.2, 0.42, 0.86], [0, 0.36, 0.95], [-0.2, 0.42, 0.86], [-0.12, 0.5, 0.64]], 0.014, white, 20);   // tow rope
}

function penguin(g) {
  const coat = soft(0x26324a, 0.55), belly = soft(0xffffff, 0.6), orange = soft(0xff9d2e, 0.5), pink = soft(0xff5d73, 0.85), black = glow(0x14161f), steel = STEEL();
  hull(g, [[-1.0, 0.03], [-0.8, 0.26], [-0.2, 0.47], [0.4, 0.47], [0.85, 0.34], [1.02, 0.2]], coat, 0.25).scale.set(1, 1, 0.5);         // back
  hull(g, [[-0.9, 0.03], [-0.6, 0.3], [0, 0.43], [0.5, 0.42], [0.92, 0.26], [1.0, 0.15]], belly, 0.19).scale.set(0.92, 1, 0.46);        // belly sliding on the snow
  const tail = add(g, new THREE.ConeGeometry(0.13, 0.3, 10), coat, 0, 0.3, -1.02, 1, 1, 0.5); tail.rotation.x = -Math.PI / 2 - 0.4;
  // head, raised and looking ahead
  const head = new THREE.Group(); head.position.set(0, 0.42, 1.2); g.add(head);
  add(head, new THREE.SphereGeometry(0.31, 22, 18), coat, 0, 0, 0, 1, 0.94, 1);
  add(head, new THREE.SphereGeometry(0.24, 16, 14), belly, 0, -0.05, 0.1, 1.02, 0.85, 0.85);
  const beak = add(head, new THREE.ConeGeometry(0.09, 0.26, 12), orange, 0, -0.04, 0.38); beak.rotation.x = Math.PI / 2;
  add(head, new THREE.SphereGeometry(0.06, 10, 8), soft(0xe07f12, 0.5), 0, -0.085, 0.27, 1.2, 0.5, 1.3);
  [-1, 1].forEach(side => {
    add(head, new THREE.SphereGeometry(0.062, 12, 10), glow(0xffffff), side * 0.12, 0.06, 0.255, 1, 1.1, 0.6);
    add(head, new THREE.SphereGeometry(0.036, 10, 8), black, side * 0.12, 0.06, 0.29, 1, 1, 0.5);
    add(head, new THREE.SphereGeometry(0.012, 6, 6), glow(0xffffff), side * 0.12 + 0.014, 0.075, 0.305);
    add(head, new THREE.SphereGeometry(0.05, 8, 8), soft(0xff9db5, 0.8), side * 0.2, -0.05, 0.22, 1, 0.6, 0.35);
    const lens = add(head, new THREE.TorusGeometry(0.075, 0.018, 8, 16), steel, side * 0.115, 0.21, 0.21); lens.rotation.x = -0.75;   // goggles pushed up
    add(head, new THREE.CylinderGeometry(0.066, 0.066, 0.012, 14), gloss(0x6fd3ff, 0x1f7fd0, 0.4), side * 0.115, 0.21, 0.21).rotation.x = Math.PI / 2 - 0.75;
  });
  const strap = add(head, new THREE.TorusGeometry(0.3, 0.02, 6, 24), black, 0, 0.13, -0.02); strap.rotation.x = Math.PI / 2 - 0.25;
  add(head, new THREE.SphereGeometry(0.24, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), pink, 0, 0.16, -0.06, 1, 0.9, 1);       // bobble hat
  const brim = add(head, new THREE.TorusGeometry(0.235, 0.04, 8, 22), belly, 0, 0.165, -0.06); brim.rotation.x = Math.PI / 2;
  add(head, new THREE.SphereGeometry(0.075, 10, 8), belly, 0, 0.42, -0.06);
  const scarf = add(g, new THREE.TorusGeometry(0.27, 0.075, 10, 22), pink, 0, 0.36, 0.98); scarf.rotation.x = 0.35;
  add(g, new THREE.BoxGeometry(0.1, 0.05, 0.3), pink, 0.2, 0.44, 0.84).rotation.y = -0.5;
  [-1, 1].forEach(side => {                                           // flippers spread like wings, feet trailing behind
    const flip = add(g, new THREE.SphereGeometry(0.34, 14, 10), coat, side * 0.56, 0.2, 0.2, 0.7, 0.13, 1.5); flip.rotation.y = side * -0.4; flip.rotation.z = side * -0.3;
    add(g, new THREE.SphereGeometry(0.28, 12, 8), belly, side * 0.55, 0.165, 0.22, 0.6, 0.1, 1.3).rotation.set(0, side * -0.4, side * -0.3);
    const foot = add(g, new THREE.SphereGeometry(0.15, 12, 8), orange, side * 0.2, 0.12, -1.0, 1, 0.28, 1.6); foot.rotation.y = side * 0.45;
    for (let t = -1; t <= 1; t++) add(g, new THREE.SphereGeometry(0.04, 6, 6), orange, side * 0.2 + t * 0.07 + side * 0.06, 0.11, -1.23 + Math.abs(t) * 0.04, 1, 0.5, 1.4);
  });
  add(g, new THREE.SphereGeometry(0.26, 16, 10), pink, 0, 0.475, -0.1, 1, 0.22, 1.25);                    // saddle blanket
  const trim = add(g, new THREE.TorusGeometry(0.255, 0.014, 6, 24), belly, 0, 0.48, -0.1, 1, 1.25, 1); trim.rotation.x = Math.PI / 2;
}

function rocket(g) {
  const white = gloss(0xf4f6fb), red = gloss(0xe2372b, 0x5a0500, 0.25), steel = STEEL(), dark = soft(0x2a3140, 0.6), glass = new THREE.MeshPhongMaterial({ color: 0x8fdcff, shininess: 140, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const cy = 0.4;
  hull(g, [[-0.85, 0.24], [-0.6, 0.36], [-0.1, 0.41], [0.85, 0.41], [1.2, 0.3], [1.45, 0.14], [1.56, 0.02]], white, cy);
  hull(g, [[1.16, 0.325], [1.3, 0.25], [1.45, 0.145], [1.57, 0.025]], red, cy);                           // painted nose
  add(g, new THREE.SphereGeometry(0.04, 10, 8), steel, 0, cy, 1.59);
  add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), steel, 0, cy, 1.68).rotation.x = Math.PI / 2;
  [[0.98, 0.385], [-0.45, 0.39]].forEach(([z, r]) => add(g, new THREE.TorusGeometry(r, 0.022, 8, 30), red, 0, cy, z));          // stripes
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(g, new THREE.SphereGeometry(0.014, 6, 6), steel, Math.cos(a) * 0.4, cy + Math.sin(a) * 0.4, -0.32); }   // rivets
  // open cockpit with padded rim and a windshield
  const rim = add(g, new THREE.TorusGeometry(0.27, 0.05, 10, 26), dark, 0, cy + 0.36, -0.02, 1, 1.25, 1); rim.rotation.x = Math.PI / 2;
  add(g, new THREE.CylinderGeometry(0.265, 0.265, 0.02, 24), soft(0x161b24, 1), 0, cy + 0.375, -0.02, 1, 1, 1.25);
  const shield = add(g, new THREE.SphereGeometry(0.3, 20, 12, 0, Math.PI, 0, Math.PI / 2), glass, 0, cy + 0.34, 0.3, 1, 0.9, 0.9); shield.rotation.y = 0;
  const frame = add(g, new THREE.TorusGeometry(0.3, 0.016, 6, 20, Math.PI), steel, 0, cy + 0.34, 0.3);
  void frame;
  add(g, new THREE.SphereGeometry(0.12, 10, 8), red, 0, cy + 0.42, -0.38, 1.6, 0.7, 0.8);                 // headrest
  [-1, 1].forEach(side => {
    [0.55, 0.15].forEach(z => {
      add(g, new THREE.CylinderGeometry(0.085, 0.085, 0.03, 18), gloss(0x6fd3ff, 0x1f7fd0, 0.5), side * 0.4, cy + 0.06, z).rotation.z = Math.PI / 2;
      const port = add(g, new THREE.TorusGeometry(0.088, 0.02, 8, 18), steel, side * 0.412, cy + 0.06, z); port.rotation.y = Math.PI / 2;
    });
    // side boosters
    const b = add(g, new THREE.CapsuleGeometry(0.11, 0.55, 6, 14), red, side * 0.5, 0.24, -0.45); b.rotation.x = Math.PI / 2;
    add(g, new THREE.ConeGeometry(0.11, 0.2, 14), white, side * 0.5, 0.24, -0.02).rotation.x = Math.PI / 2;
    add(g, new THREE.CylinderGeometry(0.08, 0.11, 0.1, 12), dark, side * 0.5, 0.24, -0.86).rotation.x = Math.PI / 2;
    add(g, new THREE.BoxGeometry(0.1, 0.05, 0.3), steel, side * 0.44, 0.27, -0.45);
  });
  // three swept fins: one up, two angled down as landing skids
  [0, 2.25, -2.25].forEach(a => {
    const holder = new THREE.Group(); holder.position.set(0, cy, 0); holder.rotation.z = a; g.add(holder);
    plate(holder, [[-0.92, 0.3], [-0.28, 0.36], [-0.62, 0.72], [-1.02, 0.8]], 0.05, red);
    plate(holder, [[-0.86, 0.36], [-0.5, 0.4], [-0.68, 0.6], [-0.92, 0.64]], 0.062, white);
  });
  // engine
  add(g, new THREE.CylinderGeometry(0.2, 0.3, 0.26, 20), dark, 0, cy, -0.95).rotation.x = Math.PI / 2;
  add(g, new THREE.TorusGeometry(0.3, 0.025, 8, 24), steel, 0, cy, -1.08);
  add(g, new THREE.CylinderGeometry(0.25, 0.25, 0.02, 20), glow(0xffb347), 0, cy, -1.0).rotation.x = Math.PI / 2;
  const flame = new THREE.Group(); flame.position.set(0, cy, -1.06); g.add(flame);
  add(flame, new THREE.ConeGeometry(0.24, 0.9, 14), glow(0xff7a1a), 0, 0, -0.45).rotation.x = -Math.PI / 2;
  add(flame, new THREE.ConeGeometry(0.15, 0.6, 12), glow(0xffd84a), 0, 0, -0.3).rotation.x = -Math.PI / 2;
  add(flame, new THREE.ConeGeometry(0.07, 0.34, 10), glow(0xffffff), 0, 0, -0.17).rotation.x = -Math.PI / 2;
  [-1, 1].forEach(side => add(flame, new THREE.ConeGeometry(0.07, 0.34, 10), glow(0xffb347), side * 0.5, 0.24 - cy, 0.02).rotation.x = -Math.PI / 2);
  g.userData.flame = flame;
}

function dragon(g) {
  const wood = soft(0x9a5a2e, 0.7), dark = soft(0x5e3319, 0.8), green = gloss(0x3fae5a, 0x0c4a1c, 0.25), lime = soft(0xc9e86a, 0.6), gold = BRASS(), red = soft(0xd9342b, 0.6), ivory = soft(0xfff6dc, 0.5);
  // clinker-built hull: half shell, strakes, rail, keel and deck
  const shell = add(g, new THREE.SphereGeometry(0.5, 26, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), wood, 0, 0.4, 0.15, 1, 0.76, 2.5); shell.material.side = THREE.DoubleSide;
  [[0.5, 0.4, 0.045], [0.468, 0.3, 0.03], [0.4, 0.19, 0.03], [0.29, 0.09, 0.03]].forEach(([r, y, t], i) => {
    const s = add(g, new THREE.TorusGeometry(r, t, 8, 34), i ? wood : dark, 0, y, 0.15, 1, 2.5, 1); s.rotation.x = Math.PI / 2;
  });
  add(g, new THREE.CylinderGeometry(0.43, 0.43, 0.03, 24), dark, 0, 0.24, 0.15, 1, 1, 2.3);
  for (let i = -3; i <= 3; i++) add(g, new THREE.BoxGeometry(0.012, 0.012, 1.9 - Math.abs(i) * 0.22), wood, i * 0.11, 0.258, 0.15);   // deck planks
  add(g, new THREE.CapsuleGeometry(0.03, 1.9, 4, 8), dark, 0, 0.035, 0.15).rotation.x = Math.PI / 2;      // keel
  [-0.62, 0.95].forEach(z => add(g, new THREE.BoxGeometry(0.62, 0.035, 0.13), dark, 0, 0.33, z));         // thwarts
  add(g, new THREE.SphereGeometry(0.24, 14, 10), red, 0, 0.275, -0.08, 1, 0.16, 1.1);                     // seat cushion
  // painted shields with brass bosses
  const colours = [0xe2372b, 0xffd23f, 0x2f8fe8, 0xe2372b];
  [-1, 1].forEach(side => colours.forEach((c, i) => {
    const z = -0.6 + i * 0.5, w = 0.5 * Math.sqrt(Math.max(0.05, 1 - ((z - 0.15) / 1.25) ** 2)), sh = new THREE.Group();
    sh.position.set(side * (w + 0.02), 0.34, z); sh.rotation.y = side * (Math.PI / 2) - side * (z - 0.15) * 0.42; g.add(sh);
    add(sh, new THREE.CylinderGeometry(0.16, 0.16, 0.035, 18), soft(c, 0.45)).rotation.x = Math.PI / 2;
    add(sh, new THREE.TorusGeometry(0.16, 0.016, 6, 20), gold);
    add(sh, new THREE.BoxGeometry(0.3, 0.03, 0.01), ivory, 0, 0, 0.02); add(sh, new THREE.BoxGeometry(0.03, 0.3, 0.01), ivory, 0, 0, 0.02);
    add(sh, new THREE.SphereGeometry(0.05, 10, 8), gold, 0, 0, 0.025, 1, 1, 0.6);
  }));
  // dragon neck rising from the prow
  const neckPts = [[0, 0.3, 1.32], [0, 0.62, 1.52], [0, 0.98, 1.5], [0, 1.2, 1.62]];
  pipe(g, neckPts, 0.105, green, 26);
  pipe(g, neckPts.map(p => [p[0], p[1] - 0.012, p[2] + 0.045]), 0.075, lime, 26);                         // pale belly
  [[0.5, 1.4, -0.9], [0.72, 1.44, -0.3], [0.94, 1.42, 0.2]].forEach(([y, z, rx]) => { const sp = add(g, new THREE.ConeGeometry(0.045, 0.16, 6), gold, 0, y, z - 0.03); sp.rotation.x = rx - 0.9; });
  const head = new THREE.Group(); head.position.set(0, 1.26, 1.7); head.rotation.x = 0.3; g.add(head);
  add(head, new THREE.SphereGeometry(0.18, 18, 14), green, 0, 0, 0, 1, 0.95, 1.15);
  add(head, new THREE.SphereGeometry(0.13, 14, 12), green, 0, -0.02, 0.22, 1, 0.72, 1.3);                 // snout
  add(head, new THREE.SphereGeometry(0.11, 12, 10), lime, 0, -0.1, 0.17, 0.95, 0.5, 1.35);                // jaw
  add(head, new THREE.SphereGeometry(0.07, 10, 8), red, 0, -0.065, 0.28, 1, 0.3, 1.2);                    // mouth
  [-1, 1].forEach(side => {
    add(head, new THREE.SphereGeometry(0.055, 10, 8), glow(0xfff2a8), side * 0.11, 0.07, 0.1);
    add(head, new THREE.SphereGeometry(0.026, 8, 6), glow(0x14161f), side * 0.125, 0.075, 0.14, 0.6, 1.2, 1);
    add(head, new THREE.SphereGeometry(0.06, 8, 6), green, side * 0.11, 0.115, 0.08, 1.1, 0.45, 1.2);     // brow ridge
    add(head, new THREE.SphereGeometry(0.02, 6, 6), glow(0x14161f), side * 0.05, 0.02, 0.385);            // nostril
    const horn = add(head, new THREE.ConeGeometry(0.04, 0.26, 10), ivory, side * 0.1, 0.2, -0.1); horn.rotation.set(-0.7, 0, side * -0.3);
    const frill = add(head, new THREE.ConeGeometry(0.09, 0.2, 4), gold, side * 0.19, 0, -0.08, 1, 1, 0.2); frill.rotation.z = side * -1.2;
    [0.2, 0.3].forEach(z => add(head, new THREE.ConeGeometry(0.014, 0.05, 6), ivory, side * 0.06, -0.085, z).rotation.x = Math.PI);
  });
  // tail curling up over the stern
  pipe(g, [[0, 0.3, -1.02], [0, 0.6, -1.2], [0, 0.9, -1.05], [0, 0.86, -0.78], [0, 0.68, -0.84]], 0.07, green, 26);
  plate(g, [[-0.86, 0.6], [-0.74, 0.76], [-0.98, 0.72]], 0.04, gold);
}

function goldfish(g) {
  const scales = canvasTexture(128, 128, (x, w, h) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(160,80,0,.55)'; x.lineWidth = 3;
    for (let r = -1; r < 5; r++) for (let c = -1; c < 5; c++) { x.beginPath(); x.arc(c * 32 + (r % 2 ? 16 : 0), r * 32, 17, 0.1, Math.PI - 0.1); x.stroke(); }
  });
  scales.repeat.set(6, 4);
  const gold = gloss(0xffc21a, 0xa85a00, 0.4); gold.map = scales;
  const deep = gloss(0xff8d14, 0x8a3c00, 0.35), pale = soft(0xfff0b5, 0.45), red = soft(0xd9342b, 0.6), steel = STEEL(), brass = BRASS();
  deep.side = THREE.DoubleSide;
  const cy = 0.4;
  hull(g, [[-0.85, 0.07], [-0.55, 0.22], [-0.05, 0.4], [0.5, 0.41], [0.88, 0.29], [1.04, 0.13], [1.08, 0.02]], gold, cy).scale.set(0.74, 1, 0.74);
  hull(g, [[-0.6, 0.1], [-0.05, 0.33], [0.5, 0.345], [0.9, 0.2], [1.0, 0.05]], pale, cy - 0.07).scale.set(0.6, 1, 0.62);      // belly
  // fan tail, dorsal fin (a backrest) and side fins, all ribbed plates
  [0.38, -0.38].forEach(tilt => { const t = plate(g, [[-0.78, 0], [-1.35, 0.42], [-1.42, 0.12], [-1.22, 0]], 0.035, deep); t.position.set(0, cy, 0); t.rotation.z = 0; t.scale.y = tilt > 0 ? 1 : -1; });
  for (let i = 0; i < 4; i++) [1, -1].forEach(s => pipe(g, [[0, cy + s * 0.02, -0.82], [0, cy + s * (0.1 + i * 0.09), -1.36 - (i === 3 ? -0.04 : 0.04) + i * 0.0]], 0.012, brass, 4));
  plate(g, [[-0.62, cy + 0.2], [-0.2, cy + 0.29], [-0.3, cy + 0.6], [-0.52, cy + 0.66], [-0.72, cy + 0.44]], 0.035, deep);
  [-1, 1].forEach(side => {
    const fin = plate(g, [[0, 0], [0.34, -0.06], [0.2, -0.36], [-0.04, -0.3]], 0.03, deep, side * 0.28); fin.position.set(side * 0.28, cy - 0.06, 0.32); fin.rotation.z = side * 1.05; fin.rotation.y = side * 0.25;
    add(g, new THREE.SphereGeometry(0.095, 14, 12), glow(0xffffff), side * 0.21, cy + 0.08, 0.84, 0.7, 1, 1);
    add(g, new THREE.SphereGeometry(0.055, 10, 8), glow(0x1d2a44), side * 0.255, cy + 0.085, 0.87, 0.6, 1, 1);
    add(g, new THREE.SphereGeometry(0.02, 6, 6), glow(0xffffff), side * 0.285, cy + 0.11, 0.9);
    add(g, new THREE.SphereGeometry(0.06, 8, 8), soft(0xff8fa3, 0.7), side * 0.2, cy - 0.05, 0.9, 0.4, 0.7, 1);
    const gill = add(g, new THREE.TorusGeometry(0.2, 0.014, 6, 14, Math.PI * 0.8), deep, side * 0.215, cy, 0.62); gill.rotation.y = side * Math.PI / 2; gill.rotation.z = -Math.PI * 0.4;
  });
  const lips = add(g, new THREE.TorusGeometry(0.075, 0.035, 10, 16), deep, 0, cy - 0.02, 1.05, 1, 0.8, 1);
  void lips;
  // little crown
  const crown = new THREE.Group(); crown.position.set(0, cy + 0.33, 0.72); crown.rotation.x = 0.35; g.add(crown);
  add(crown, new THREE.CylinderGeometry(0.1, 0.09, 0.07, 14, 1, true), brass);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(crown, new THREE.ConeGeometry(0.03, 0.09, 6), brass, Math.cos(a) * 0.095, 0.075, Math.sin(a) * 0.095); add(crown, new THREE.SphereGeometry(0.018, 6, 6), glow(i % 2 ? 0xff4d6d : 0x4dd2ff), Math.cos(a) * 0.1, 0.0, Math.sin(a) * 0.1); }
  // saddle strapped on, and steel runners so the fish really is a sled
  add(g, new THREE.SphereGeometry(0.25, 16, 10), red, 0, cy + 0.29, 0.02, 0.95, 0.2, 1.3);
  const trim = add(g, new THREE.TorusGeometry(0.24, 0.016, 6, 24), brass, 0, cy + 0.292, 0.02, 0.95, 1.3, 1); trim.rotation.x = Math.PI / 2;
  [-0.18, 0.24].forEach(z => add(g, new THREE.TorusGeometry(0.305, 0.018, 6, 26), red, 0, cy - 0.005, z, 1, 1.02, 1));
  runners(g, 0.2, -0.6, 0.78, steel, 0.16);
  [-0.35, 0.35].forEach(z => [-1, 1].forEach(s => { const st = add(g, new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6), steel, s * 0.19, 0.1, z); st.rotation.z = s * -0.12; }));
  g.children.forEach(c => { c.position.z += 0.32; });               // head clears Baldy's boots
}

const BUILDERS = { classic, tube, penguin, rocket, dragon, goldfish };

export function buildSled(id) {
  const g = new THREE.Group();
  (BUILDERS[id] || classic)(g);
  g.userData.lift = (SLEDS.find(s => s.id === id) || SLEDS[0]).lift;
  return g;
}
