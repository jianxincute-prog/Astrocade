// Finishing touches layered on top of the 20 signature models: garnish, sauce, sheen, seasoning and browning.
// Each entry runs after the base model is built. P, BW, SK, BK are the food surface heights of the vessels
// (plate, bowl, skillet, baking dish). Keys are the sorted ingredient ids, same as SIGNATURE.
import { mat, box, cyl, tor, sph, mesh } from './prims.js';

const P = 0.069, BW = 0.15, SK = 0.09, BK = 0.13;

const B = (g, w, h, d, col, x, y, z, ry = 0, rz = 0) => {
  const m = mesh(box(w, h, d), mat(col), x, y, z); m.rotation.y = ry; m.rotation.z = rz; g.add(m);
};
const C = (g, rt, rb, h, col, x, y, z, seg = 10) => g.add(mesh(cyl(rt, rb, h, seg), mat(col), x, y, z));
const S = (g, rad, col, x, y, z) => g.add(mesh(sph(rad), mat(col), x, y, z));
const ring = (g, rad, tube, col, x, y, z) => {
  const m = mesh(tor(rad, tube, Math.PI * 2), mat(col), x, y, z); m.rotation.x = Math.PI / 2; g.add(m);
};
// small bright chip that reads as a specular highlight
const shine = (g, x, y, z, w = 0.04, d = 0.022, ry = 0.4) => B(g, w, 0.007, d, 0xfffbf0, x, y, z, ry);
const scatter = (g, col, n, rad, y, r, s = 0.03, cx = 0, cz = 0) => {
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * rad;
    B(g, s, s, s, col, cx + Math.cos(a) * d, y + r() * 0.02, cz + Math.sin(a) * d, r() * 3);
  }
};
const GREEN = 0x73c24e, PEPPER = 0x2f241c, PARM = 0xf5e6b8, SESAME = 0xfff4d6, RED = 0xd93a2b, BUTTER = 0xffe08a;

const DETAILS = new Map();
const k = (...ids) => [...ids].sort().join('|');
const D = (ids, fn) => DETAILS.set(k(...ids), fn);
export const applyDetails = (key, g, r) => { const f = DETAILS.get(key); if (f) f(g, r); };

// 1 Fried rice: soy-browned grains, carrot, peas, shine on the yolk
D(['carb_1', 'prot_5', 'prot_8'], (g, r) => {
  scatter(g, 0x93612f, 6, 0.2, P + 0.13, r, 0.04);
  scatter(g, 0xea8a3b, 5, 0.2, P + 0.13, r, 0.035);
  for (let i = 0; i < 5; i++) S(g, 0.022, 0x73c24e, (r() - 0.5) * 0.4, P + 0.14 + r() * 0.04, (r() - 0.5) * 0.4);
  shine(g, -0.025, P + 0.215, -0.02, 0.035, 0.02);
});
// 2 Seafood noodles: sesame, chili slices, scallion
D(['carb_2', 'prot_7', 'garn_9'], (g, r) => {
  scatter(g, SESAME, 9, 0.2, BW + 0.2, r, 0.02);
  [[-0.1, 0.0], [0.12, -0.06], [0.0, 0.18]].forEach(([x, z]) => C(g, 0.03, 0.03, 0.012, 0xd12e1f, x, BW + 0.2, z, 8));
  scatter(g, GREEN, 7, 0.22, BW + 0.19, r, 0.025);
});
// 3 Cheeseburger: pickles poking out, ketchup and mustard on the cheese
D(['carb_3', 'prot_6', 'garn_11'], (g) => {
  C(g, 0.065, 0.065, 0.014, 0x6b8f2a, 0.2, P + 0.2, 0.1); C(g, 0.065, 0.065, 0.014, 0x6b8f2a, -0.19, P + 0.2, -0.09);
  B(g, 0.2, 0.01, 0.025, RED, 0.0, P + 0.325, 0.2, 0.3); B(g, 0.2, 0.01, 0.022, 0xf2c230, 0.0, P + 0.325, -0.2, -0.3);
  shine(g, 0.1, P + 0.336, 0.0, 0.05, 0.025);
});
// 4 Steak and fries: butter pat, herbs, salt on the fries, sauce pool
D(['carb_4', 'prot_6', 'garn_10'], (g, r) => {
  B(g, 0.07, 0.03, 0.07, BUTTER, -0.13, P + 0.115, 0.0, 0.15); shine(g, -0.13, P + 0.132, 0.0, 0.03, 0.02);
  scatter(g, GREEN, 5, 0.12, P + 0.104, r, 0.025, -0.1, 0.02);
  scatter(g, 0xffffff, 6, 0.1, P + 0.2, r, 0.015, 0.2, -0.02);
  C(g, 0.07, 0.07, 0.008, 0xb52d1f, -0.1, P + 0.004, 0.24, 14); shine(g, -0.13, P + 0.012, 0.23, 0.03, 0.016);
});
// 5 Risotto: parmesan shavings, pepper, parsley
D(['carb_1', 'prot_7', 'garn_12'], (g, r) => {
  for (let i = 0; i < 5; i++) B(g, 0.07, 0.008, 0.035, PARM, (r() - 0.5) * 0.3, BW + 0.26 + r() * 0.04, (r() - 0.5) * 0.3, r() * 3, (r() - 0.5) * 0.4);
  scatter(g, PEPPER, 8, 0.2, BW + 0.27, r, 0.014);
  scatter(g, GREEN, 5, 0.18, BW + 0.27, r, 0.026);
});
// 6 Crispy chicken sandwich: pickles and a mayo drip
D(['carb_3', 'prot_5', 'garn_11'], (g) => {
  C(g, 0.06, 0.06, 0.013, 0x6b8f2a, 0.225, P + 0.17, 0.08); C(g, 0.06, 0.06, 0.013, 0x6b8f2a, -0.225, P + 0.17, -0.06);
  B(g, 0.05, 0.07, 0.03, 0xfff6e0, -0.215, P + 0.2, 0.1); B(g, 0.04, 0.05, 0.03, 0xfff6e0, 0.215, P + 0.22, -0.1);
});
// 7 Beef noodle soup: oil droplets, pink centers on the beef, scallion, chili flakes
D(['carb_2', 'prot_6', 'garn_9'], (g, r) => {
  for (let i = 0; i < 7; i++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * 0.3;
    C(g, 0.022, 0.022, 0.004, 0xf2b84b, Math.cos(a) * d, BW + 0.047, Math.sin(a) * d, 8);
  }
  [[-0.14, 0.1], [0.08, 0.14], [0.16, -0.06]].forEach(([x, z], i) => B(g, 0.11, 0.008, 0.05, 0xe58f8f, x, BW + 0.153, z, i * 1.1, 0.25));
  scatter(g, GREEN, 7, 0.24, BW + 0.07, r, 0.024); scatter(g, 0xb3261a, 6, 0.24, BW + 0.07, r, 0.014);
});
// 8 Loaded potato bake: dark skin base, sour cream, browned cheese spots
D(['carb_4', 'prot_5', 'garn_11'], (g, r) => {
  B(g, 0.325, 0.04, 0.245, 0x9b6b2f, -0.02, P + 0.02, 0);
  S(g, 0.06, 0xfff6e8, 0.04, P + 0.235, 0.02); shine(g, 0.02, P + 0.28, 0.0, 0.03, 0.02);
  [[-0.1, 0.05], [0.08, -0.06], [-0.04, -0.08]].forEach(([x, z]) => B(g, 0.07, 0.008, 0.06, 0xc98a1b, x, P + 0.2, z, x * 8));
});
// 9 Bolognese: parmesan, pepper, shine on the sauce
D(['carb_1', 'prot_6', 'garn_10'], (g, r) => {
  scatter(g, PARM, 6, 0.14, BW + 0.3, r, 0.03, 0.05, 0);
  scatter(g, PEPPER, 5, 0.14, BW + 0.3, r, 0.014, 0.05, 0);
  shine(g, 0.0, BW + 0.33, 0.0, 0.035, 0.02); shine(g, 0.1, BW + 0.29, 0.06, 0.03, 0.02);
});
// 10 Egg and cheese toast: grill marks on the top bread, shine on the cheese
D(['carb_3', 'prot_8', 'garn_11'], (g) => {
  [-0.1, 0.0, 0.1].forEach((z) => B(g, 0.34, 0.006, 0.02, 0x8a5a2b, 0.03, P + 0.282 + 0.07, z + 0.02, 0.12));
  shine(g, -0.05, P + 0.215, 0.12, 0.05, 0.025);
});
// 11 Tomato egg noodles: glossy sauce spots, scallion
D(['carb_2', 'prot_8', 'garn_10'], (g, r) => {
  for (let i = 0; i < 6; i++) C(g, 0.045, 0.045, 0.006, 0xd24a2a, (r() - 0.5) * 0.36, P + 0.095, (r() - 0.5) * 0.36, 8);
  scatter(g, GREEN, 6, 0.24, P + 0.12, r, 0.024); shine(g, 0.1, P + 0.14, 0.12, 0.04, 0.02);
});
// 12 Skillet: rivets, butter, rosemary, browned potato edges
D(['carb_4', 'prot_7', 'garn_9'], (g, r) => {
  [0.5, 0.82].forEach((x) => S(g, 0.016, 0x2b2b2b, x, 0.092, 0));
  B(g, 0.07, 0.03, 0.07, BUTTER, 0.1, SK + 0.14, -0.1, 0.4); shine(g, 0.1, SK + 0.157, -0.1, 0.03, 0.02);
  B(g, 0.012, 0.2, 0.012, 0x3f6b2a, -0.2, SK + 0.12, 0.12, 0, 0.8);
  scatter(g, 0xb8862f, 6, 0.28, SK + 0.01, r, 0.04);
});
// 13 Veggie rice: peas, corn, carrot, scallion
D(['carb_1', 'garn_9', 'garn_12'], (g, r) => {
  for (let i = 0; i < 6; i++) S(g, 0.022, 0x73c24e, (r() - 0.5) * 0.4, P + 0.14 + r() * 0.05, (r() - 0.5) * 0.4);
  scatter(g, 0xf2c230, 6, 0.22, P + 0.14, r, 0.03); scatter(g, 0xea8a3b, 4, 0.22, P + 0.14, r, 0.035);
});
// 14 Parmigiana: sauce drips, pepper, cheese shine
D(['prot_5', 'garn_11', 'garn_10'], (g, r) => {
  [[0.19, 0.04], [-0.19, -0.05], [0.0, 0.14]].forEach(([x, z]) => B(g, 0.04, 0.06, 0.03, 0xc0392b, x, P + 0.125, z));
  scatter(g, PEPPER, 6, 0.12, P + 0.26, r, 0.014); shine(g, -0.02, P + 0.268, 0.02, 0.05, 0.022);
});
// 15 Steak: pepper, herb flecks, shine on the cheese
D(['prot_6', 'garn_12', 'garn_11'], (g, r) => {
  scatter(g, PEPPER, 6, 0.16, P + 0.17, r, 0.014); scatter(g, GREEN, 4, 0.16, P + 0.17, r, 0.02);
  shine(g, 0.0, P + 0.427, 0.0, 0.06, 0.025);
});
// 16 Club sandwich: pick flags and tomato seeds
D(['carb_3', 'prot_5', 'garn_10'], (g, r) => {
  B(g, 0.05, 0.03, 0.012, 0xd93a2b, 0.03, P + 0.62, 0); B(g, 0.05, 0.03, 0.012, 0x5cb85c, 0.03, P + 0.65, 0);
  scatter(g, 0xf2d98b, 6, 0.12, P + 0.165, r, 0.012);
});
// 17 Mushroom chicken noodles: sesame, scallion, shine on the glaze
D(['carb_2', 'prot_5', 'garn_12'], (g, r) => {
  scatter(g, SESAME, 8, 0.2, BW + 0.3, r, 0.02); scatter(g, GREEN, 6, 0.2, BW + 0.27, r, 0.024);
  [[-0.1, 0.1], [0.1, 0.06], [0.0, -0.12]].forEach(([x, z]) => shine(g, x, BW + 0.275, z, 0.04, 0.02));
});
// 18 Frittata: browned rim, shine on the cheese
D(['carb_4', 'prot_8', 'garn_11'], (g) => {
  ring(g, 0.335, 0.014, 0xc98a2b, 0, P + 0.108, 0);
  shine(g, 0.1, P + 0.13, 0.1, 0.05, 0.022); shine(g, -0.12, P + 0.13, 0.05, 0.04, 0.02);
});
// 19 Shrimp scramble: highlights on the egg, chives, pepper
D(['prot_7', 'prot_8', 'garn_9'], (g, r) => {
  for (let i = 0; i < 4; i++) shine(g, (r() - 0.5) * 0.4, P + 0.15 + r() * 0.04, (r() - 0.5) * 0.3, 0.03, 0.018);
  B(g, 0.14, 0.012, 0.012, 0x4ea84e, 0.05, P + 0.175, 0.1, 0.6); B(g, 0.12, 0.012, 0.012, 0x4ea84e, -0.08, P + 0.18, -0.1, -0.5);
  scatter(g, PEPPER, 6, 0.2, P + 0.17, r, 0.014);
});
// 20 Casserole: crisp golden rim on the cheese, parsley, rice grains at the edge
D(['carb_1', 'prot_5', 'garn_11'], (g, r) => {
  [[0, -0.17, 0.52, 0.012], [0, 0.17, 0.52, 0.012]].forEach(([x, z, w, h]) => B(g, w, h, 0.03, 0xb87a1a, x, BK + 0.122, z));
  [[-0.255, 0], [0.255, 0]].forEach(([x, z]) => B(g, 0.03, 0.012, 0.36, 0xb87a1a, x, BK + 0.122, z));
  scatter(g, 0xfffdf5, 6, 0.0, BK + 0.065, r, 0.03, 0.27, 0);
  scatter(g, GREEN, 5, 0.2, BK + 0.14, r, 0.026);
});
