// Procedural 3D dish generator. Layers are stacked carb -> protein -> garnish with real heights,
// each ingredient is a fixed builder (no fallthrough defaults), and randomness is seeded by the
// ingredient set so the same combination always looks the same.
import { layerOrder, dishForm } from './recipes.js';
import { ING } from './recipes.js';

const THREE = window.THREE;

import { mat, box, cyl, tor, mesh, addBowl, addPlate } from './prims.js';
import { SIGNATURE } from './signature.js';

function seedOf(ids) {
  let h = 2166136261;
  for (const ch of [...ids].sort().join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) { // mulberry32
  let a = seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Each builder returns { g: Group with its base at y = 0, h: height }.
const BUILD = {
  carb_1(r) { // rice
    const g = new THREE.Group();
    for (let i = 0; i < 9; i++) g.add(mesh(box(0.12, 0.1, 0.12), mat(0xfffdf5), (r() - 0.5) * 0.3, 0.05 + r() * 0.04, (r() - 0.5) * 0.3));
    return { g, h: 0.14 };
  },
  carb_2(r) { // noodles
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const m = mesh(tor(0.15, 0.03, Math.PI * 2), mat(0xf2cf68), (r() - 0.5) * 0.12, 0.03 + i * 0.03, (r() - 0.5) * 0.12);
      m.rotation.x = Math.PI / 2 + (r() - 0.5) * 0.5; g.add(m);
    }
    return { g, h: 0.16 };
  },
  carb_3() { // bread slice
    const g = new THREE.Group();
    g.add(mesh(box(0.38, 0.08, 0.38), mat(0xdfa150), 0, 0.04, 0));
    g.add(mesh(box(0.33, 0.02, 0.33), mat(0xf0c987), 0, 0.085, 0));
    return { g, h: 0.1 };
  },
  carb_4(r) { // fries
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const m = mesh(box(0.32, 0.05, 0.06), mat(0xe5c158), 0, 0.03 + i * 0.018, 0);
      m.rotation.y = (i * Math.PI) / 6 + (r() - 0.5) * 0.2; g.add(m);
    }
    return { g, h: 0.13 };
  },
  prot_5() { // chicken
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) g.add(mesh(box(0.11, 0.11, 0.11), mat(0xd68a34), ((i % 2) - 0.5) * 0.2, 0.055, ((i >> 1) - 0.5) * 0.2));
    return { g, h: 0.12 };
  },
  prot_6() { // beef steak with grill marks
    const g = new THREE.Group();
    g.add(mesh(box(0.34, 0.09, 0.26), mat(0x7a3b1d), 0, 0.045, 0));
    [-0.1, 0, 0.1].forEach((x) => g.add(mesh(box(0.025, 0.012, 0.26), mat(0x3d1a00), x, 0.096, 0)));
    return { g, h: 0.1 };
  },
  prot_7(r) { // shrimp
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const m = mesh(tor(0.09, 0.035, Math.PI * 1.3), mat(0xf08a5d), (i - 1) * 0.15, 0.04, (r() - 0.5) * 0.08);
      m.rotation.x = Math.PI / 2; m.rotation.z = r() * 6; g.add(m);
    }
    return { g, h: 0.08 };
  },
  prot_8() { // sunny-side-up egg
    const g = new THREE.Group();
    g.add(mesh(cyl(0.19, 0.19, 0.03, 10), mat(0xffffff), 0, 0.015, 0));
    g.add(mesh(box(0.1, 0.06, 0.1), mat(0xf6b61a), 0, 0.06, 0));
    return { g, h: 0.09 };
  },
  garn_9(r) { // veggies (leaf blocks)
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const m = mesh(box(0.13, 0.02, 0.13), mat(i % 2 ? 0x5cb85c : 0x4ea84e), (r() - 0.5) * 0.24, 0.02 + i * 0.012, (r() - 0.5) * 0.24);
      m.rotation.y = r() * 3; g.add(m);
    }
    return { g, h: 0.06 };
  },
  garn_10() { // tomato slices + sauce
    const g = new THREE.Group();
    g.add(mesh(box(0.26, 0.015, 0.1), mat(0xc0392b), 0, 0.008, 0));
    [-0.08, 0.08].forEach((x) => g.add(mesh(cyl(0.08, 0.08, 0.025, 8), mat(0xd93a2b), x, 0.028, 0)));
    return { g, h: 0.04 };
  },
  garn_11() { // melted cheese
    const g = new THREE.Group();
    const slab = mesh(box(0.3, 0.02, 0.3), mat(0xffc93c), 0, 0.01, 0); slab.rotation.y = 0.3; g.add(slab);
    [[0.16, 0.05], [-0.14, -0.08], [0.02, 0.16]].forEach(([x, z]) => g.add(mesh(box(0.05, 0.06, 0.03), mat(0xffc93c), x, -0.01, z)));
    return { g, h: 0.03 };
  },
  garn_12(r) { // mushrooms
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Group();
      s.add(mesh(cyl(0.02, 0.02, 0.08, 6), mat(0xf5f5dc), 0, 0.04, 0));
      s.add(mesh(box(0.1, 0.05, 0.1), mat(0x8b6b4a), 0, 0.09, 0));
      s.position.set((i - 1) * 0.12, 0, (r() - 0.5) * 0.1); g.add(s);
    }
    return { g, h: 0.12 };
  },
};

const OFFSETS = [[0, 0], [0.04, -0.03], [-0.05, 0.04]];

export function buildDish(ids) {
  const r = rng(seedOf(ids));
  const sig = SIGNATURE.get([...ids].sort().join('|')); // hand-built model for the 20 signature recipes
  if (sig) return { group: sig(r), form: 'signature' };
  const form = dishForm(ids);
  const group = new THREE.Group();
  let y;
  if (form === 'bowl') {
    y = addBowl(group);
  } else {
    y = addPlate(group);
  }
  layerOrder(ids).forEach((id, i) => {
    const { g, h } = BUILD[id](r);
    g.position.set(OFFSETS[i][0], y, OFFSETS[i][1]);
    group.add(g);
    y += h;
  });
  if (form === 'stack') { // top bun makes it a sandwich
    group.add(mesh(box(0.38, 0.08, 0.38), mat(0xdfa150), 0, y + 0.04, 0));
    group.add(mesh(box(0.33, 0.02, 0.33), mat(0xf0c987), 0, y + 0.09, 0));
  }
  return { group, form };
}

// Small cube that flies from the counter into the pan.
export function miniMesh(id) {
  return mesh(box(0.16, 0.16, 0.16), mat(parseInt(ING[id].color.slice(1), 16)), 0, 0, 0);
}
