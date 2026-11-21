// Hand-built blocky models for the 20 signature recipes, keyed by the sorted ingredient ids.
// Each builder takes the seeded random function and returns a Group sitting on y = 0.
import { mat, box, cyl, tor, sph, mesh, addBowl } from './prims.js';

const THREE = window.THREE;

// ---- tiny shape helpers (y is the CENTER of the shape) --------------------------------------
const B = (g, w, h, d, col, x, y, z, ry = 0, rz = 0) => {
  const m = mesh(box(w, h, d), mat(col), x, y, z); m.rotation.y = ry; m.rotation.z = rz; g.add(m); return m;
};
const C = (g, rt, rb, h, col, x, y, z, seg = 14) => g.add(mesh(cyl(rt, rb, h, seg), mat(col), x, y, z));
const S = (g, r, col, x, y, z) => g.add(mesh(sph(r), mat(col), x, y, z));
const T = (g, r, t, arc, col, x, y, z, rx = Math.PI / 2, ry = 0, rz = 0) => {
  const m = mesh(tor(r, t, arc), mat(col), x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
};

// ---- vessels (return the y of the usable surface) -------------------------------------------
function plate(g) { C(g, 0.45, 0.35, 0.06, 0xe9eef5, 0, 0.03, 0, 16); return 0.06; }
const bowl = (g) => addBowl(g);
function skillet(g) {
  C(g, 0.46, 0.42, 0.08, 0x3a3a42, 0, 0.04, 0); C(g, 0.4, 0.4, 0.01, 0x24242b, 0, 0.085, 0);
  B(g, 0.5, 0.05, 0.07, 0x8b5a2b, 0.68, 0.06, 0); return 0.09;
}
function bakingDish(g) { B(g, 0.66, 0.12, 0.5, 0xe8d5c4, 0, 0.06, 0); B(g, 0.58, 0.02, 0.42, 0xd2b8a3, 0, 0.125, 0); return 0.13; }

// ---- reusable food bits ---------------------------------------------------------------------
function mound(g, cols, n, radius, y0, r, size = 0.1) {
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * radius, h = (1 - d / radius) * 0.13;
    const m = B(g, size, size, size, cols[i % cols.length], Math.cos(a) * d, y0 + size / 2 + h * (0.6 + r() * 0.4), Math.sin(a) * d, r() * 3);
    m.rotation.x = (r() - 0.5) * 0.3;
  }
}
const shrimp = (g, x, y, z, ry = 0) => T(g, 0.085, 0.036, Math.PI * 1.3, 0xff7675, x, y, z, Math.PI / 2, 0, ry);
function mushroom(g, x, y, z) { C(g, 0.022, 0.022, 0.08, 0xf5f5dc, x, y + 0.04, z, 6); B(g, 0.11, 0.05, 0.11, 0x795548, x, y + 0.1, z); }
const leaf = (g, x, y, z, ry) => B(g, 0.13, 0.02, 0.11, 0x2ecc71, x, y, z, ry);
function bits(g, col, n, radius, y, r, size = 0.035) {
  for (let i = 0; i < n; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * radius; B(g, size, size, size, col, Math.cos(a) * d, y, Math.sin(a) * d, r() * 3); }
}
function drips(g, col, w, d, y) {
  [[w / 2, d * 0.2], [-w / 2, -d * 0.25], [w * 0.15, d / 2]].forEach(([x, z]) => B(g, 0.06, 0.07, 0.05, col, x, y - 0.03, z));
}
function bunBottom(g, y) { B(g, 0.42, 0.08, 0.42, 0xd9a066, 0, y + 0.04, 0); return y + 0.08; }
function bunTop(g, y, r) {
  B(g, 0.42, 0.07, 0.42, 0xe0a85f, 0, y + 0.035, 0); B(g, 0.36, 0.06, 0.36, 0xeeb870, 0, y + 0.095, 0);
  for (let i = 0; i < 7; i++) B(g, 0.025, 0.012, 0.025, 0xfff1cf, (r() - 0.5) * 0.3, y + 0.132, (r() - 0.5) * 0.3);
  return y + 0.13;
}
const NOODLE = 0xf4d03f, CHICKEN = 0xc0651a, CRISPY = 0xe0a030, BEEF = 0x6e2c00, CHEESE = 0xffd84d, TOMATO = 0xe74c3c, EGGY = 0xf6d55c;

const k = (...ids) => ids.sort().join('|');
export const SIGNATURE = new Map();
const def = (ids, fn) => SIGNATURE.set(k(...ids), (r) => { const g = new THREE.Group(); fn(g, r); return g; });

// 1. Chicken Egg Fried Rice: golden rice mound, chicken blocks, sunny-side-up egg on top
def(['carb_1', 'prot_5', 'prot_8'], (g, r) => {
  const y = plate(g);
  mound(g, [0xf1d27a, 0xe9bf5a, 0xf7e2a0], 18, 0.24, y, r);
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.5; B(g, 0.1, 0.1, 0.1, CHICKEN, Math.cos(a) * 0.27, y + 0.05, Math.sin(a) * 0.27, a); }
  C(g, 0.16, 0.16, 0.03, 0xffffff, 0, y + 0.2, 0, 10); B(g, 0.1, 0.06, 0.1, 0xf1c40f, 0, y + 0.25, 0);
  bits(g, 0x2ecc71, 6, 0.22, y + 0.12, r);
});

// 2. Seafood Noodle Stir-Fry: curly noodle rings, curved pink shrimp, green leaves
def(['carb_2', 'prot_7', 'garn_9'], (g, r) => {
  const y = bowl(g);
  for (let i = 0; i < 5; i++) T(g, 0.17, 0.035, Math.PI * 2, NOODLE, (r() - 0.5) * 0.1, y + 0.04 + i * 0.035, (r() - 0.5) * 0.1, Math.PI / 2 + (r() - 0.5) * 0.5, 0, r() * 3);
  [[0.12, 0.1], [-0.1, 0.12], [0.02, -0.14]].forEach(([x, z], i) => shrimp(g, x, y + 0.2, z, i * 2));
  for (let i = 0; i < 4; i++) leaf(g, (r() - 0.5) * 0.3, y + 0.16 + i * 0.01, (r() - 0.5) * 0.3, r() * 3);
});

// 3. Double Melt Cheeseburger: bun, two patties with melted cheese, lettuce, tomato, sesame bun
def(['carb_3', 'prot_6', 'garn_11'], (g, r) => {
  let y = plate(g);
  y = bunBottom(g, y);
  C(g, 0.23, 0.23, 0.018, 0x2ecc71, 0, y + 0.009, 0); y += 0.02;
  C(g, 0.19, 0.19, 0.09, BEEF, 0, y + 0.045, 0); y += 0.09;
  B(g, 0.4, 0.022, 0.4, CHEESE, 0, y + 0.011, 0, 0.785); drips(g, CHEESE, 0.3, 0.3, y); y += 0.022;
  C(g, 0.19, 0.19, 0.09, 0x5a2300, 0, y + 0.045, 0); y += 0.09;
  B(g, 0.4, 0.022, 0.4, CHEESE, 0, y + 0.011, 0, 0.785); y += 0.022;
  C(g, 0.1, 0.1, 0.02, TOMATO, 0.04, y + 0.01, 0.03); y += 0.02;
  bunTop(g, y, r);
});

// 4. Classic Steak & Fries: grilled steak with sauce, pile of fries
def(['carb_4', 'prot_6', 'garn_10'], (g, r) => {
  const y = plate(g);
  const steak = B(g, 0.36, 0.1, 0.26, BEEF, -0.1, y + 0.05, 0.02, 0.15);
  [-0.1, 0, 0.1].forEach((x) => B(g, 0.026, 0.012, 0.26, 0x3d1a00, -0.1 + x, y + 0.106, 0.02, 0.15));
  B(g, 0.08, 0.04, 0.07, TOMATO, -0.16, y + 0.12, 0.0); B(g, 0.06, 0.03, 0.06, 0xc0392b, -0.04, y + 0.115, 0.06);
  for (let i = 0; i < 8; i++) B(g, 0.27, 0.05, 0.05, 0xe5c158, 0.2 + (r() - 0.5) * 0.08, y + 0.03 + (i % 4) * 0.045, -0.05 + (i - 4) * 0.035, 0.5 + (r() - 0.5) * 0.9);
  C(g, 0.07, 0.07, 0.025, TOMATO, 0.2, y + 0.2, 0.18, 8);
  return steak;
});

// 5. Shrimp Mushroom Risotto: creamy rice mound, mushrooms, shrimp on top
def(['carb_1', 'prot_7', 'garn_12'], (g, r) => {
  const y = bowl(g);
  mound(g, [0xf7efd8, 0xefe2bd, 0xfaf4e4], 18, 0.25, y, r);
  mushroom(g, -0.14, y + 0.1, 0.1); mushroom(g, 0.15, y + 0.1, -0.05); mushroom(g, 0.0, y + 0.12, 0.17);
  shrimp(g, 0.02, y + 0.26, -0.04, 0.5); shrimp(g, -0.1, y + 0.22, -0.1, 2); shrimp(g, 0.12, y + 0.22, 0.08, 4);
  bits(g, 0x2ecc71, 5, 0.2, y + 0.2, r);
});

// 6. Crispy Chicken Sandwich: bun, lettuce, crunchy cutlet, cheese, bun
def(['carb_3', 'prot_5', 'garn_11'], (g, r) => {
  let y = plate(g);
  y = bunBottom(g, y);
  for (let i = 0; i < 3; i++) B(g, 0.16, 0.02, 0.14, 0x2ecc71, (i - 1) * 0.12, y + 0.012, (i % 2) * 0.06, r() * 3);
  y += 0.025;
  B(g, 0.46, 0.09, 0.34, CRISPY, 0, y + 0.045, 0, 0.1);
  for (let i = 0; i < 8; i++) B(g, 0.06, 0.05, 0.06, 0xf0b44a, (r() - 0.5) * 0.36, y + 0.1, (r() - 0.5) * 0.26, r() * 3);
  y += 0.09;
  B(g, 0.42, 0.02, 0.42, CHEESE, 0, y + 0.01, 0, 0.785); drips(g, CHEESE, 0.3, 0.3, y); y += 0.02;
  bunTop(g, y, r);
});

// 7. Beef Noodle Soup: broth, noodles, thick beef slices, greens
def(['carb_2', 'prot_6', 'garn_9'], (g, r) => {
  const y = bowl(g);
  C(g, 0.34, 0.34, 0.05, 0xb5651d, 0, y + 0.02, 0);
  for (let i = 0; i < 4; i++) T(g, 0.15, 0.03, Math.PI * 2, NOODLE, (r() - 0.5) * 0.08, y + 0.05 + i * 0.025, (r() - 0.5) * 0.08, Math.PI / 2 + (r() - 0.5) * 0.4, 0, r() * 3);
  [[-0.14, 0.1], [0.08, 0.14], [0.16, -0.06]].forEach(([x, z], i) => B(g, 0.17, 0.035, 0.11, 0x8b3a1a, x, y + 0.13, z, i * 1.1, 0.25));
  for (let i = 0; i < 3; i++) leaf(g, -0.05 + i * 0.07, y + 0.16, -0.12 + i * 0.03, i);
  bits(g, 0x2ecc71, 5, 0.25, y + 0.07, r, 0.03);
});

// 8. Loaded Chicken Potato Bake: baked potato block, chicken, cheese, chives
def(['carb_4', 'prot_5', 'garn_11'], (g, r) => {
  const y = plate(g);
  B(g, 0.32, 0.16, 0.24, 0xe5c158, -0.02, y + 0.08, 0);
  B(g, 0.2, 0.012, 0.03, 0xb48b2f, -0.02, y + 0.166, 0); B(g, 0.03, 0.012, 0.16, 0xb48b2f, -0.02, y + 0.166, 0);
  B(g, 0.34, 0.035, 0.26, CHEESE, -0.02, y + 0.18, 0); drips(g, CHEESE, 0.3, 0.22, y + 0.18);
  [[0.22, 0.1], [0.24, -0.08], [0.14, 0.2]].forEach(([x, z], i) => B(g, 0.1, 0.1, 0.1, CHICKEN, x, y + 0.05, z, i));
  bits(g, 0x2ecc71, 7, 0.14, y + 0.21, r, 0.03);
});

// 9. Beef Bolognese Rice Bowl: white rice with a heap of tomato-beef sauce
def(['carb_1', 'prot_6', 'garn_10'], (g, r) => {
  const y = bowl(g);
  mound(g, [0xfffdf5, 0xf3efe2], 12, 0.25, y, r);
  for (let i = 0; i < 14; i++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * 0.17;
    B(g, 0.07, 0.07, 0.07, i % 2 ? 0xa8452b : 0x8b2e1a, 0.05 + Math.cos(a) * d, y + 0.2 + (0.17 - d) * 0.5, Math.sin(a) * d, r() * 3);
  }
  C(g, 0.06, 0.06, 0.02, TOMATO, -0.1, y + 0.17, 0.12, 8); leaf(g, 0.12, y + 0.3, -0.05, 0.5);
});

// 10. Fluffy Egg & Cheese Toast: toasted bread, thick curved omelet, melted cheese
def(['carb_3', 'prot_8', 'garn_11'], (g) => {
  let y = plate(g);
  B(g, 0.42, 0.07, 0.42, 0xd9a066, 0, y + 0.035, 0); B(g, 0.36, 0.01, 0.36, 0xf0c987, 0, y + 0.075, 0); y += 0.08;
  B(g, 0.38, 0.11, 0.34, EGGY, 0, y + 0.055, 0); B(g, 0.4, 0.05, 0.12, 0xf9e07a, 0, y + 0.1, 0.1);
  y += 0.11;
  B(g, 0.4, 0.02, 0.4, CHEESE, 0, y + 0.01, 0, 0.785); drips(g, CHEESE, 0.28, 0.28, y); y += 0.02;
  B(g, 0.42, 0.07, 0.42, 0xe0a85f, 0.03, y + 0.04, 0.02, 0.12, 0.05);
});

// 11. Tomato Egg Noodles: flat sweet-brown noodles, tomato slices, egg bits
def(['carb_2', 'prot_8', 'garn_10'], (g, r) => {
  const y = plate(g);
  for (let i = 0; i < 12; i++) B(g, 0.32, 0.018, 0.035, i % 3 ? 0xa0522d : 0xb8683a, (r() - 0.5) * 0.12, y + 0.012 + (i % 4) * 0.02, (i - 6) * 0.035, r() * 0.8 - 0.4);
  [[-0.12, 0.08], [0.1, 0.12], [0.0, -0.1]].forEach(([x, z]) => C(g, 0.075, 0.075, 0.03, TOMATO, x, y + 0.12, z, 8));
  for (let i = 0; i < 5; i++) B(g, 0.08, 0.06, 0.08, EGGY, (r() - 0.5) * 0.32, y + 0.12, (r() - 0.5) * 0.32, r() * 3);
  bits(g, 0x2ecc71, 5, 0.25, y + 0.1, r);
});

// 12. Seafood Potato Skillet: black pan, potato cubes, shrimp, parsley
def(['carb_4', 'prot_7', 'garn_9'], (g, r) => {
  const y = skillet(g);
  for (let i = 0; i < 8; i++) { const a = i * 0.8, d = 0.1 + (i % 3) * 0.07; B(g, 0.11, 0.11, 0.11, 0xe5c158, Math.cos(a) * d, y + 0.055, Math.sin(a) * d, a); }
  shrimp(g, 0.0, y + 0.16, 0.0, 1); shrimp(g, 0.14, y + 0.15, 0.1, 3); shrimp(g, -0.14, y + 0.15, -0.08, 5);
  bits(g, 0x2ecc71, 8, 0.3, y + 0.12, r, 0.03);
});

// 13. Veggie Mushroom Fried Rice: green-brown rice, mushroom cubes, veggies, carrot
def(['carb_1', 'garn_9', 'garn_12'], (g, r) => {
  const y = plate(g);
  mound(g, [0xd9c98a, 0xa8c96a, 0xc7b46c], 18, 0.25, y, r);
  mushroom(g, -0.14, y + 0.1, 0.12); mushroom(g, 0.16, y + 0.08, 0.0);
  for (let i = 0; i < 4; i++) leaf(g, (r() - 0.5) * 0.3, y + 0.17 + i * 0.01, (r() - 0.5) * 0.3, r() * 3);
  bits(g, 0xe67e22, 4, 0.22, y + 0.16, r, 0.04);
});

// 14. Chicken Parmigiana Plate: thick cutlet under red sauce and a stepped tower of melted cheese, basil, cherry tomatoes
def(['prot_5', 'garn_11', 'garn_10'], (g, r) => {
  const y = plate(g);
  B(g, 0.42, 0.1, 0.3, CRISPY, 0, y + 0.05, 0, 0.1);
  for (let i = 0; i < 6; i++) B(g, 0.05, 0.05, 0.05, 0xf0b44a, (i % 2 ? 1 : -1) * 0.2, y + 0.08, (i - 2.5) * 0.08, r() * 3);
  B(g, 0.36, 0.03, 0.24, TOMATO, 0, y + 0.115, 0, 0.1);
  B(g, 0.36, 0.045, 0.24, CHEESE, 0, y + 0.1525, 0, 0.1); drips(g, CHEESE, 0.36, 0.22, y + 0.15);
  B(g, 0.27, 0.045, 0.17, CHEESE, 0, y + 0.1975, 0, 0.1);
  B(g, 0.17, 0.045, 0.11, CHEESE, 0, y + 0.2425, 0, 0.1);
  [[-0.06, 0.0], [0.07, 0.03], [0.0, -0.05]].forEach(([x, z]) => B(g, 0.06, 0.012, 0.05, 0xc98a1b, x, y + 0.225, z));
  [[-0.04, 0.0, 0.5], [0.04, 0.02, -0.5], [0.0, -0.03, 1.57]].forEach(([x, z, ry]) => B(g, 0.11, 0.13, 0.015, 0x2ecc71, x, y + 0.34, z, ry, (x || 0.03) * 3));
  [[-0.31, 0.12], [-0.24, 0.24], [0.3, -0.16]].forEach(([x, z]) => { S(g, 0.05, TOMATO, x, y + 0.05, z); B(g, 0.03, 0.015, 0.03, 0x2ecc71, x, y + 0.105, z); });
});

// 15. Beef Mushroom Melt Steak: thick seared steak with a tower of mushroom sauce, melted cheese, mushrooms, rosemary
def(['prot_6', 'garn_12', 'garn_11'], (g, r) => {
  const y = plate(g);
  B(g, 0.4, 0.14, 0.3, BEEF, 0, y + 0.07, 0, 0.1);
  B(g, 0.4, 0.015, 0.3, 0x8b3a1a, 0, y + 0.1475, 0, 0.1);
  [-0.1, 0, 0.1].forEach((x) => B(g, 0.02, 0.012, 0.3, 0x3d1a00, x, y + 0.158, 0, 0.1));
  let n = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) B(g, 0.09, 0.09, 0.09, n++ % 2 ? 0x7a5638 : 0x6b4a2f, i * 0.085, y + 0.2, j * 0.085, r() * 0.5);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) B(g, 0.09, 0.09, 0.09, (i + j) % 2 ? 0x6b4a2f : 0x7a5638, (i - 0.5) * 0.085, y + 0.275, (j - 0.5) * 0.085, r() * 0.5);
  B(g, 0.09, 0.09, 0.09, 0x6b4a2f, 0, y + 0.35, 0);
  B(g, 0.2, 0.02, 0.2, CHEESE, 0, y + 0.405, 0, 0.5);
  [[0.1, 0.1], [-0.1, 0.1], [0.1, -0.1]].forEach(([x, z]) => B(g, 0.05, 0.12, 0.04, CHEESE, x, y + 0.35, z, 0.5));
  mushroom(g, 0, y + 0.41, 0); mushroom(g, -0.2, y + 0.155, 0.1); mushroom(g, 0.19, y + 0.155, 0.1);
  B(g, 0.012, 0.26, 0.012, 0x3f6b2a, 0.24, y + 0.28, -0.1, 0, 0.35); B(g, 0.012, 0.22, 0.012, 0x4f8a37, 0.2, y + 0.26, -0.12, 0, 0.6);
});

// 16. Chicken Tomato Club Sandwich: three-decker with chicken, tomato, lettuce and a pick
def(['carb_3', 'prot_5', 'garn_10'], (g, r) => {
  let y = plate(g);
  const slice = () => { B(g, 0.4, 0.06, 0.4, 0xd9a066, 0, y + 0.03, 0, 0.0); B(g, 0.34, 0.01, 0.34, 0xf0c987, 0, y + 0.065, 0); y += 0.07; };
  slice();
  B(g, 0.38, 0.05, 0.34, 0xe3b27a, 0, y + 0.025, 0); y += 0.05;
  C(g, 0.1, 0.1, 0.025, TOMATO, -0.08, y + 0.013, 0, 8); C(g, 0.1, 0.1, 0.025, TOMATO, 0.1, y + 0.013, 0.02, 8); y += 0.026;
  slice();
  for (let i = 0; i < 4; i++) B(g, 0.15, 0.02, 0.12, 0x2ecc71, (i - 1.5) * 0.1, y + 0.01, (i % 2) * 0.06 - 0.03, r() * 3);
  y += 0.022;
  B(g, 0.38, 0.05, 0.34, CHICKEN, 0, y + 0.025, 0); y += 0.05;
  slice();
  C(g, 0.01, 0.01, 0.34, 0xc9a27a, 0.0, y + 0.12, 0, 6); S(g, 0.035, 0x3f6b2a, 0, y + 0.3, 0);
});

// 17. Mushroom Chicken Noodles: noodles in a bowl topped with glazed chicken and mushrooms
def(['carb_2', 'prot_5', 'garn_12'], (g, r) => {
  const y = bowl(g);
  for (let i = 0; i < 5; i++) T(g, 0.16, 0.034, Math.PI * 2, NOODLE, (r() - 0.5) * 0.08, y + 0.04 + i * 0.033, (r() - 0.5) * 0.08, Math.PI / 2 + (r() - 0.5) * 0.4, 0, r() * 3);
  [[-0.1, 0.1], [0.1, 0.06], [0.0, -0.12]].forEach(([x, z], i) => B(g, 0.1, 0.1, 0.1, 0x8b4513, x, y + 0.22, z, i));
  mushroom(g, 0.14, y + 0.12, -0.1); mushroom(g, -0.14, y + 0.12, -0.06);
  bits(g, 0x2ecc71, 5, 0.2, y + 0.2, r, 0.03);
});

// 18. Cheesy Potato Frittata: thick round omelet with potato cubes and golden cheese
def(['carb_4', 'prot_8', 'garn_11'], (g, r) => {
  const y = plate(g);
  C(g, 0.34, 0.34, 0.11, EGGY, 0, y + 0.055, 0, 18);
  for (let i = 0; i < 6; i++) { const a = i * 1.05, d = 0.1 + (i % 2) * 0.1; B(g, 0.07, 0.07, 0.07, 0xe5c158, Math.cos(a) * d, y + 0.145, Math.sin(a) * d, a); }
  [[0.1, 0.1], [-0.12, 0.05], [0.0, -0.14], [0.16, -0.08]].forEach(([x, z]) => B(g, 0.11, 0.018, 0.1, 0xffb300, x, y + 0.118, z, x * 9));
  bits(g, 0x2ecc71, 5, 0.25, y + 0.125, r, 0.03);
});

// 19. Shrimp Scramble Plate: fluffy scrambled egg, grilled shrimp, fresh greens
def(['prot_7', 'prot_8', 'garn_9'], (g, r) => {
  const y = plate(g);
  for (let i = 0; i < 10; i++) { const s = 0.08 + r() * 0.06; const a = r() * 6.283, d = Math.sqrt(r()) * 0.24; B(g, s, s, s, i % 2 ? 0xf7dc5a : 0xf1c40f, Math.cos(a) * d - 0.05, y + s / 2 + (0.24 - d) * 0.3, Math.sin(a) * d, r() * 3); }
  shrimp(g, -0.1, y + 0.2, 0.05, 1); shrimp(g, 0.04, y + 0.2, -0.06, 3); shrimp(g, -0.02, y + 0.2, 0.14, 5);
  for (let i = 0; i < 4; i++) leaf(g, 0.24, y + 0.02 + i * 0.015, -0.1 + i * 0.07, r() * 3);
});

// 20. Chicken Cheesy Rice Casserole: baking dish, rice, chicken, bubbling golden cheese
def(['carb_1', 'prot_5', 'garn_11'], (g, r) => {
  const y = bakingDish(g);
  B(g, 0.54, 0.05, 0.38, 0xfffdf5, 0, y + 0.025, 0);
  for (let i = 0; i < 4; i++) B(g, 0.09, 0.09, 0.09, CHICKEN, -0.18 + i * 0.12, y + 0.09, (i % 2) * 0.1 - 0.05, i);
  B(g, 0.52, 0.04, 0.36, 0xffc83d, 0, y + 0.1, 0);
  for (let i = 0; i < 9; i++) S(g, 0.04 + r() * 0.025, i % 3 === 0 ? 0xc98a1b : 0xffd966, (r() - 0.5) * 0.46, y + 0.13, (r() - 0.5) * 0.3);
  bits(g, 0x2ecc71, 5, 0.22, y + 0.125, r, 0.03);
});
