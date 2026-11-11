// Sled skins sold in the shop for golden fish. Each one is its own shape, not just a recolour.
// All sleds face +Z, sit on y = 0 and carry Baldy's seat at roughly y = 0.25.

export const SLEDS = [
  { id: 'classic', name: 'Wooden Sled', price: 0 },
  { id: 'tube', name: 'Snow Tube', price: 30 },
  { id: 'penguin', name: 'Penguin Glider', price: 60 },
  { id: 'rocket', name: 'Rocket Sled', price: 100 },
  { id: 'dragon', name: 'Dragon Boat', price: 150 },
  { id: 'goldfish', name: 'Golden Fish', price: 220 },
];

const soft = (color, roughness = 0.75) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
const shiny = (color, emissive = 0x000000) => new THREE.MeshPhongMaterial({ color, emissive, emissiveIntensity: 0.35, shininess: 100 });
const glow = color => new THREE.MeshBasicMaterial({ color });

function add(parent, geo, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m);
  return m;
}

function classic(g) {
  const wood = soft(0xc98a4b, 0.8), red = soft(0xd9482b, 0.6), metal = shiny(0xd8dde6);
  for (let i = -1; i <= 1; i++) add(g, new THREE.BoxGeometry(0.24, 0.05, 1.45), i ? wood : red, i * 0.26, 0.22, 0.1);
  [-1, 1].forEach(side => {
    add(g, new THREE.BoxGeometry(0.05, 0.05, 1.6), metal, side * 0.3, 0.04, 0.1);
    const curl = add(g, new THREE.TorusGeometry(0.18, 0.025, 6, 12, Math.PI), metal, side * 0.3, 0.22, 0.9); curl.rotation.set(-Math.PI / 2, Math.PI / 2, 0);
    [-0.4, 0.5].forEach(z => add(g, new THREE.BoxGeometry(0.04, 0.16, 0.04), metal, side * 0.3, 0.13, z));
  });
  add(g, new THREE.BoxGeometry(0.66, 0.04, 0.06), red, 0, 0.22, 0.86);
}

function tube(g) {
  const blue = soft(0x2f8fe8, 0.45), white = soft(0xffffff, 0.5), yellow = soft(0xffd23f, 0.5);
  const ring = add(g, new THREE.TorusGeometry(0.56, 0.25, 16, 32), blue, 0, 0.25, 0.1); ring.rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {                                   // white stripes wrapped around the ring
    const a = i / 6 * Math.PI * 2, s = add(g, new THREE.TorusGeometry(0.255, 0.045, 8, 20), white, Math.sin(a) * 0.56, 0.25, 0.1 + Math.cos(a) * 0.56);
    s.rotation.y = a + Math.PI / 2;
  }
  add(g, new THREE.CylinderGeometry(0.4, 0.4, 0.06, 24), soft(0x1c5fa8, 0.8), 0, 0.14, 0.1);          // seat floor
  [-1, 1].forEach(side => {
    const h = add(g, new THREE.TorusGeometry(0.1, 0.03, 8, 14, Math.PI), yellow, side * 0.62, 0.47, 0.1); h.rotation.y = Math.PI / 2;
  });
  add(g, new THREE.CylinderGeometry(0.035, 0.045, 0.07, 10), yellow, 0, 0.5, -0.46);                  // air valve
  const star = add(g, new THREE.CylinderGeometry(0.11, 0.11, 0.02, 5), yellow, 0, 0.3, 0.92); star.rotation.x = Math.PI / 2 - 0.5;
}

function penguin(g) {
  const coat = soft(0x26324a, 0.7), belly = soft(0xffffff, 0.7), orange = soft(0xff9d2e, 0.6), black = glow(0x14161f);
  add(g, new THREE.SphereGeometry(0.5, 20, 16), coat, 0, 0.24, 0.05, 0.92, 0.42, 1.75);                // body lying on its belly
  add(g, new THREE.SphereGeometry(0.5, 20, 16), belly, 0, 0.17, 0.12, 0.8, 0.36, 1.6);
  add(g, new THREE.SphereGeometry(0.3, 18, 14), coat, 0, 0.36, 0.98, 1, 0.9, 1);                       // head held up in front
  add(g, new THREE.SphereGeometry(0.22, 14, 12), belly, 0, 0.31, 1.1, 1, 0.85, 0.8);
  [-1, 1].forEach(side => {
    add(g, new THREE.SphereGeometry(0.045, 8, 8), black, side * 0.11, 0.41, 1.24);
    add(g, new THREE.SphereGeometry(0.016, 6, 6), glow(0xffffff), side * 0.11 + 0.015, 0.425, 1.275);
    const wing = add(g, new THREE.SphereGeometry(0.3, 12, 10), coat, side * 0.55, 0.2, 0.15, 0.75, 0.16, 1.5); wing.rotation.y = side * -0.35; wing.rotation.z = side * -0.25;
    const foot = add(g, new THREE.SphereGeometry(0.14, 10, 8), orange, side * 0.2, 0.12, -0.86, 1, 0.3, 1.6); foot.rotation.y = side * 0.4;
  });
  const beak = add(g, new THREE.ConeGeometry(0.085, 0.24, 10), orange, 0, 0.32, 1.36); beak.rotation.x = Math.PI / 2;
  const scarf = add(g, new THREE.TorusGeometry(0.27, 0.07, 8, 20), soft(0xff5d73, 0.9), 0, 0.33, 0.8); scarf.rotation.x = 0.2;
  add(g, new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), soft(0xff5d73, 0.9), 0, 0.52, 0.96);   // bobble hat
  add(g, new THREE.SphereGeometry(0.07, 8, 8), belly, 0, 0.74, 0.96);
}

function rocket(g) {
  const white = soft(0xf4f6fb, 0.35), red = soft(0xe2372b, 0.4), metal = shiny(0xaeb9c9), glass = shiny(0x6fd3ff, 0x1f7fd0);
  const body = add(g, new THREE.CapsuleGeometry(0.28, 0.9, 8, 20), white, 0, 0.3, 0.05); body.rotation.x = Math.PI / 2;
  const nose = add(g, new THREE.ConeGeometry(0.275, 0.55, 20), red, 0, 0.3, 0.98); nose.rotation.x = Math.PI / 2;
  add(g, new THREE.SphereGeometry(0.05, 10, 8), metal, 0, 0.3, 1.26);
  [0.5, -0.35].forEach(z => { const band = add(g, new THREE.TorusGeometry(0.285, 0.03, 8, 24), red, 0, 0.3, z); band.rotation.set(0, 0, 0); });
  [-1, 1].forEach(side => {
    const port = add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.04, 16), glass, side * 0.27, 0.34, 0.45); port.rotation.z = Math.PI / 2;
    const rim = add(g, new THREE.TorusGeometry(0.1, 0.02, 6, 16), metal, side * 0.285, 0.34, 0.45); rim.rotation.y = Math.PI / 2;
    const fin = add(g, new THREE.ConeGeometry(0.22, 0.5, 4), red, side * 0.4, 0.2, -0.5, 1, 1, 0.18); fin.rotation.set(Math.PI / 2 - 0.5, 0, side * -1.1);
    add(g, new THREE.CapsuleGeometry(0.04, 1.1, 4, 8), metal, side * 0.3, 0.04, 0.05).rotation.x = Math.PI / 2;   // ski
    [-0.3, 0.4].forEach(z => add(g, new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6), metal, side * 0.27, 0.1, z));
  });
  const tail = add(g, new THREE.ConeGeometry(0.2, 0.5, 4), red, 0, 0.62, -0.5, 0.18, 1, 1); tail.rotation.x = -0.5;
  const nozzle = add(g, new THREE.CylinderGeometry(0.17, 0.24, 0.2, 16), metal, 0, 0.3, -0.72); nozzle.rotation.x = Math.PI / 2;
  const flame = new THREE.Group(); flame.position.set(0, 0.3, -0.82); g.add(flame);
  const f1 = add(flame, new THREE.ConeGeometry(0.19, 0.7, 12), glow(0xff8a1f), 0, 0, -0.35); f1.rotation.x = -Math.PI / 2;
  const f2 = add(flame, new THREE.ConeGeometry(0.11, 0.45, 10), glow(0xffe45c), 0, 0, -0.22); f2.rotation.x = -Math.PI / 2;
  g.userData.flame = flame;
}

function dragon(g) {
  const wood = soft(0x8a4f2a, 0.8), dark = soft(0x5e3319, 0.85), green = soft(0x3fae5a, 0.6), gold = shiny(0xffc93c, 0x7a4a00);
  // boat hull: the lower half of a stretched sphere, with a plank deck and a keel
  const hull = add(g, new THREE.SphereGeometry(0.5, 22, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), wood, 0, 0.36, 0.05, 0.95, 0.68, 2); 
  hull.material.side = THREE.DoubleSide;
  add(g, new THREE.CylinderGeometry(0.44, 0.44, 0.04, 20), dark, 0, 0.26, 0.05, 1, 1, 1.9);
  const rail = add(g, new THREE.TorusGeometry(0.5, 0.04, 8, 30), dark, 0, 0.36, 0.05, 0.95, 2, 1); rail.rotation.x = Math.PI / 2;
  add(g, new THREE.BoxGeometry(0.05, 0.1, 1.6), dark, 0, 0.03, 0.05);
  // round shields along both sides
  const shields = [0xe2372b, 0xffd23f, 0x2f8fe8];
  [-1, 1].forEach(side => shields.forEach((c, i) => {
    const s = add(g, new THREE.CylinderGeometry(0.15, 0.15, 0.04, 14), soft(c, 0.5), side * 0.46, 0.27, -0.42 + i * 0.44); s.rotation.z = Math.PI / 2; s.rotation.y = side * (i - 1) * -0.25;
    add(g, new THREE.SphereGeometry(0.045, 8, 8), gold, side * 0.49, 0.27, -0.42 + i * 0.44);
  }));
  // dragon neck and head at the prow
  const neck = add(g, new THREE.TorusGeometry(0.42, 0.1, 10, 16, Math.PI * 0.6), green, 0, 0.5, 0.72); neck.rotation.y = -Math.PI / 2; neck.rotation.z = -0.2;
  const head = new THREE.Group(); head.position.set(0, 0.98, 1.02); head.rotation.x = 0.25; g.add(head);
  add(head, new THREE.SphereGeometry(0.17, 14, 12), green, 0, 0, 0, 1, 0.95, 1.2);
  add(head, new THREE.SphereGeometry(0.12, 12, 10), green, 0, -0.04, 0.2, 1, 0.75, 1.2);                // snout
  [-1, 1].forEach(side => {
    add(head, new THREE.SphereGeometry(0.045, 8, 8), glow(0xffffff), side * 0.1, 0.07, 0.1);
    add(head, new THREE.SphereGeometry(0.022, 6, 6), glow(0x14161f), side * 0.11, 0.075, 0.135);
    add(head, new THREE.SphereGeometry(0.018, 6, 6), glow(0x14161f), side * 0.045, -0.02, 0.33);       // nostril
    const horn = add(head, new THREE.ConeGeometry(0.04, 0.2, 8), gold, side * 0.09, 0.2, -0.08); horn.rotation.x = -0.5; horn.rotation.z = side * -0.25;
  });
  for (let i = 0; i < 4; i++) { const sp = add(g, new THREE.ConeGeometry(0.05, 0.14, 4), gold, 0, 0.66 + i * 0.1, 0.62 + i * 0.07 - i * i * 0.012); sp.rotation.x = -0.9 + i * 0.25; }
  // curled tail at the stern
  const tail = add(g, new THREE.TorusGeometry(0.26, 0.07, 8, 16, Math.PI * 1.15), green, 0, 0.6, -0.92); tail.rotation.y = Math.PI / 2; tail.rotation.z = 0.5;
  add(g, new THREE.ConeGeometry(0.1, 0.2, 4), gold, 0, 0.82, -0.72, 1, 1, 0.3).rotation.x = 2.6;
}

function goldfish(g) {
  const gold = shiny(0xffc928, 0xb86a00), deep = shiny(0xff9f1a, 0x9a4a00), white = glow(0xffffff);
  add(g, new THREE.SphereGeometry(0.5, 24, 18), gold, 0, 0.3, 0.12, 0.8, 0.56, 1.7);                   // body
  add(g, new THREE.SphereGeometry(0.5, 20, 14), soft(0xfff1b8, 0.4), 0, 0.2, 0.2, 0.62, 0.36, 1.45);   // pale belly
  for (let r = 0; r < 3; r++) for (let i = -1; i <= 1; i++) {                                         // scale rows
    const s = add(g, new THREE.TorusGeometry(0.1, 0.018, 6, 10, Math.PI), deep, i * 0.17, 0.5 - Math.abs(i) * 0.07, -0.25 + r * 0.26 + (i ? 0.13 : 0));
    s.rotation.set(-Math.PI / 2 + i * -0.0, 0, 0); s.rotation.z = i * -0.5;
  }
  [-1, 1].forEach(side => {
    add(g, new THREE.SphereGeometry(0.085, 12, 10), white, side * 0.27, 0.38, 0.72);
    add(g, new THREE.SphereGeometry(0.045, 8, 8), glow(0x24324a), side * 0.31, 0.385, 0.76);
    const fin = add(g, new THREE.ConeGeometry(0.2, 0.42, 4), deep, side * 0.46, 0.2, 0.2, 1, 1, 0.15); fin.rotation.set(0.3, 0, side * -1.9);
    const fluke = add(g, new THREE.ConeGeometry(0.26, 0.6, 4), deep, side * 0.2, 0.36, -0.98, 0.14, 1, 1); fluke.rotation.set(-1.75, side * 0.5, 0);
  });
  const lip = add(g, new THREE.TorusGeometry(0.09, 0.035, 8, 14), deep, 0, 0.27, 0.96); lip.rotation.x = 0.1;
  for (let i = 0; i < 3; i++) { const d = add(g, new THREE.ConeGeometry(0.14, 0.26 - i * 0.04, 4), deep, 0, 0.62 - i * 0.03, 0.1 - i * 0.24, 0.14, 1, 1); d.rotation.x = -0.5; }
  add(g, new THREE.CapsuleGeometry(0.035, 1.0, 4, 8), shiny(0xd8dde6), -0.22, 0.04, 0.1).rotation.x = Math.PI / 2;      // runners
  add(g, new THREE.CapsuleGeometry(0.035, 1.0, 4, 8), shiny(0xd8dde6), 0.22, 0.04, 0.1).rotation.x = Math.PI / 2;
}

const BUILDERS = { classic, tube, penguin, rocket, dragon, goldfish };

export function buildSled(id) {
  const g = new THREE.Group();
  (BUILDERS[id] || classic)(g);
  return g;
}
