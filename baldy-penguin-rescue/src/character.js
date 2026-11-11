// Procedural characters: Baldy (the bald hero), baby penguins, mama penguin and the snow whirly.
// Every model faces +Z and stands on y = 0.

import { buildSled } from './sleds.js';

const mat = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const soft = (color, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

function mesh(geo, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}

function texture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Smooth curve through [t, value] keys. */
function curve(keys, t) {
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i], k = (t - a[0]) / (b[0] - a[0]), s = k * k * (3 - 2 * k);
      return a[1] + (b[1] - a[1]) * s;
    }
  }
  return keys[keys.length - 1][1];
}

/** One continuous lathed shape from a radius profile: [t, radius] keys over a height. */
function lathe(keys, height, steps = 28, segments = 28, bulge) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(new THREE.Vector2(Math.max(0.001, curve(keys, t) + (bulge ? bulge(t) : 0)), t * height));
  }
  return new THREE.LatheGeometry(pts, segments);
}

/** Quilted puffer fabric: soft shading per band with a stitched seam between bands. */
function pufferTexture(bands) {
  const t = texture(64, 256, (x, w, h) => {
    const bh = h / bands;
    for (let i = 0; i < bands; i++) {
      const g = x.createLinearGradient(0, i * bh, 0, (i + 1) * bh);
      g.addColorStop(0, '#b9b9b9'); g.addColorStop(0.18, '#ffffff'); g.addColorStop(0.7, '#f1f1f1'); g.addColorStop(1, '#a8a8a8');
      x.fillStyle = g; x.fillRect(0, i * bh, w, bh);
      x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(0, (i + 1) * bh - 2, w, 2);
    }
  });
  return t;
}

/** The player: a friendly bald man in a quilted winter jacket, built as smooth continuous shapes. */
export function buildMan(jacketColor, sledId = 'classic') {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const base = new THREE.Color(jacketColor), darker = base.clone().multiplyScalar(0.62);
  const skin = new THREE.MeshPhongMaterial({ color: 0xf0b98f, shininess: 55, specular: 0x554433 });
  const jacket = soft(base, 0.72); jacket.map = pufferTexture(5);
  const sleeve = soft(base, 0.72); sleeve.map = pufferTexture(3);
  const trim = soft(darker, 0.8), pants = soft(0x2b3a57, 0.9), bootM = soft(0x6b4226, 0.7), sole = soft(0x2a2420, 0.9);
  const fur = soft(0xf6f1e7, 1), scarfM = soft(0xffcf3a, 0.9), scarfD = soft(0xe0a51c, 0.9), mitt = soft(0x2f9e8f, 0.9);
  const white = mat(0xffffff), black = mat(0x1d1d24), metal = new THREE.MeshPhongMaterial({ color: 0xd8dde6, shininess: 90 });
  const hair = soft(0x5b3b22, 0.9);

  // ---- legs: tapered trousers tucked into fur-topped boots ----
  const hips = mesh(new THREE.SphereGeometry(0.3, 20, 14), pants, 0, 0.84, 0, body); hips.scale.set(1.05, 0.62, 0.8);
  const legs = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.165, 0.84, 0); body.add(pivot);
    mesh(lathe([[0, 0.118], [0.5, 0.128], [1, 0.15]], 0.5, 8, 16), pants, 0, -0.52, 0, pivot);
    mesh(new THREE.CylinderGeometry(0.135, 0.128, 0.2, 16), bootM, 0, -0.6, 0, pivot);                   // boot shaft
    const cuff = mesh(new THREE.TorusGeometry(0.135, 0.045, 10, 18), fur, 0, -0.5, 0, pivot); cuff.rotation.x = Math.PI / 2;
    const foot = mesh(new THREE.CapsuleGeometry(0.115, 0.17, 6, 14), bootM, 0, -0.73, 0.075, pivot); foot.rotation.x = Math.PI / 2; foot.scale.set(1.05, 1, 0.82);
    const tread = mesh(new THREE.CapsuleGeometry(0.12, 0.18, 4, 14), sole, 0, -0.8, 0.075, pivot); tread.rotation.x = Math.PI / 2; tread.scale.set(1.08, 1, 0.3);
    mesh(new THREE.BoxGeometry(0.1, 0.012, 0.012), fur, 0, -0.66, 0.2, pivot);                            // lace
    mesh(new THREE.BoxGeometry(0.1, 0.012, 0.012), fur, 0, -0.69, 0.215, pivot);
    return pivot;
  });

  // ---- torso: a single lathed puffer jacket ----
  const torso = new THREE.Group(); torso.position.y = 0.82; body.add(torso);
  const profile = [[0, 0.3], [0.06, 0.345], [0.3, 0.375], [0.55, 0.385], [0.75, 0.35], [0.9, 0.25], [1, 0.14]];
  const coat = mesh(lathe(profile, 0.88, 40, 32, t => t < 0.86 ? 0.02 * Math.pow(Math.abs(Math.sin(Math.PI * t * 5 / 0.86)), 0.7) : 0), jacket, 0, -0.02, 0, torso);
  coat.scale.set(1.1, 1, 0.82);
  jacket.map.wrapT = THREE.RepeatWrapping; jacket.map.repeat.set(1, 1 / 0.86);
  const hem = mesh(new THREE.TorusGeometry(0.315, 0.05, 10, 28), trim, 0, 0.0, 0, torso); hem.rotation.x = Math.PI / 2; hem.scale.set(1.1, 0.82, 1);
  // zip, pull and placket down the front
  const zip = mesh(new THREE.BoxGeometry(0.035, 0.7, 0.02), metal, 0, 0.38, 0.318, torso); zip.rotation.x = -0.03;
  mesh(new THREE.BoxGeometry(0.075, 0.72, 0.012), trim, 0, 0.38, 0.312, torso).rotation.x = -0.03;
  mesh(new THREE.BoxGeometry(0.03, 0.07, 0.02), metal, 0, 0.7, 0.3, torso);
  // pockets with flaps
  [-1, 1].forEach(side => {
    const a = side * 0.72, px = Math.sin(a) * 0.4 * 1.1, pz = Math.cos(a) * 0.4 * 0.82;
    const flap = mesh(new THREE.BoxGeometry(0.2, 0.06, 0.03), trim, px, 0.24, pz, torso); flap.rotation.y = a * 0.75; flap.rotation.z = side * -0.12;
    mesh(new THREE.SphereGeometry(0.018, 8, 8), metal, px, 0.225, pz + 0.02, torso);
  });
  // rescue badge
  const badge = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 16), soft(0xffd23f, 0.5), -0.19, 0.6, 0.275, torso); badge.rotation.x = Math.PI / 2 - 0.25; badge.rotation.z = 0.3;
  mesh(new THREE.SphereGeometry(0.028, 8, 8), white, -0.19, 0.6, 0.283, torso).scale.z = 0.4;
  // collar and knitted scarf with a hanging, fringed tail
  const collar = mesh(new THREE.TorusGeometry(0.17, 0.075, 12, 24), trim, 0, 0.83, 0, torso); collar.rotation.x = Math.PI / 2; collar.scale.set(1.05, 0.95, 1);
  const scarf = mesh(new THREE.TorusGeometry(0.19, 0.08, 12, 26), scarfM, 0, 0.92, 0.01, torso); scarf.rotation.x = Math.PI / 2 + 0.08;
  const knot = mesh(new THREE.SphereGeometry(0.085, 12, 10), scarfD, 0.13, 0.88, 0.19, torso); knot.scale.set(1, 0.9, 0.8);
  const tail = new THREE.Group(); tail.position.set(0.14, 0.86, 0.21); tail.rotation.set(0.12, 0, -0.16); torso.add(tail);
  mesh(new THREE.BoxGeometry(0.13, 0.36, 0.045), scarfM, 0, -0.18, 0, tail);
  mesh(new THREE.BoxGeometry(0.132, 0.05, 0.047), scarfD, 0, -0.26, 0, tail);
  for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.02, 0.06, 0.03), scarfD, -0.05 + i * 0.033, -0.39, 0, tail);
  // backpack with bedroll and straps
  const pack = new THREE.Group(); pack.position.set(0, 0.42, -0.36); torso.add(pack);
  const bag = mesh(new THREE.CapsuleGeometry(0.17, 0.2, 6, 14), soft(0x8a5a33, 0.85), 0, 0, 0, pack); bag.scale.set(1.25, 1, 0.75);
  const flapP = mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), soft(0x6f4526, 0.85), 0, 0.1, -0.01, pack); flapP.scale.set(1.3, 0.9, 0.82);
  mesh(new THREE.BoxGeometry(0.06, 0.05, 0.03), metal, 0, 0.06, -0.14, pack);
  const roll = mesh(new THREE.CapsuleGeometry(0.075, 0.34, 6, 12), soft(0x4fb7c9, 0.9), 0, 0.32, 0, pack); roll.rotation.z = Math.PI / 2;
  [-1, 1].forEach(side => {
    const band = mesh(new THREE.TorusGeometry(0.078, 0.014, 6, 14), sole, side * 0.12, 0.32, 0, pack); band.rotation.y = Math.PI / 2;
    const strap = mesh(new THREE.TorusGeometry(0.3, 0.022, 6, 20, Math.PI * 1.05), soft(0x6f4526, 0.85), side * 0.2, 0.2, 0.33, pack);
    strap.rotation.set(0, Math.PI / 2, 0); strap.rotation.z = -0.5; strap.scale.set(1.05, 1.1, 1);
  });

  // ---- arms: shoulder, sleeve, cuff and thumbed mitten in one tapered line ----
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.385, 0.67, 0); torso.add(pivot);
    const shoulder = mesh(new THREE.SphereGeometry(0.15, 16, 12), sleeve, 0, -0.01, 0, pivot); shoulder.scale.set(1, 0.95, 1);
    mesh(lathe([[0, 0.112], [0.25, 0.128], [0.75, 0.135], [1, 0.14]], 0.3, 10, 16), sleeve, 0, -0.3, 0, pivot);
    const fore = new THREE.Group(); fore.position.y = -0.3; fore.rotation.x = -0.22; pivot.add(fore);
    mesh(new THREE.SphereGeometry(0.115, 14, 10), sleeve, 0, 0, 0, fore);                                 // elbow
    mesh(lathe([[0, 0.1], [0.3, 0.118], [1, 0.114]], 0.24, 8, 16), sleeve, 0, -0.24, 0, fore);
    const cuff = mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 18), trim, 0, -0.25, 0, fore); cuff.rotation.x = Math.PI / 2;
    const hand = mesh(new THREE.SphereGeometry(0.105, 14, 12), mitt, 0, -0.35, 0.005, fore); hand.scale.set(0.85, 1.2, 1);
    const thumb = mesh(new THREE.CapsuleGeometry(0.035, 0.05, 4, 8), mitt, side * -0.075, -0.33, 0.05, fore); thumb.rotation.z = side * -0.6;
    pivot.rotation.z = side * 0.18;
    return pivot;
  });

  // ---- head — proudly bald and shiny ----
  const head = new THREE.Group(); head.position.y = 1.07; torso.add(head);
  mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 14), skin, 0, -0.1, 0, head);                         // neck
  const skull = mesh(lathe([[0, 0.12], [0.12, 0.235], [0.35, 0.292], [0.6, 0.305], [0.82, 0.25], [0.94, 0.15], [1, 0.02]], 0.66, 30, 30), skin, 0, -0.12, 0, head);
  skull.scale.set(1, 1, 0.97);
  const shine = mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }), -0.1, 0.44, 0.15, head);
  shine.scale.set(1.5, 0.55, 1); shine.rotation.x = -0.6;
  [-1, 1].forEach(side => {
    const ear = mesh(new THREE.SphereGeometry(0.075, 12, 10), skin, side * 0.3, 0.17, -0.01, head); ear.scale.set(0.55, 1, 0.8);
    mesh(new THREE.SphereGeometry(0.04, 8, 8), mat(0xd99573), side * 0.315, 0.17, 0.005, head).scale.set(0.4, 0.9, 0.7);
    const eye = mesh(new THREE.SphereGeometry(0.052, 12, 10), white, side * 0.115, 0.24, 0.255, head); eye.scale.set(1, 1.1, 0.6);
    mesh(new THREE.SphereGeometry(0.031, 10, 8), mat(0x6b4a2b), side * 0.115, 0.238, 0.283, head).scale.z = 0.5;      // iris
    mesh(new THREE.SphereGeometry(0.018, 8, 8), black, side * 0.115, 0.238, 0.296, head).scale.z = 0.5;               // pupil
    mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), side * 0.115 + 0.012, 0.25, 0.304, head);
    const brow = mesh(new THREE.CapsuleGeometry(0.02, 0.09, 4, 8), hair, side * 0.125, 0.335, 0.265, head);
    brow.rotation.z = Math.PI / 2 + side * 0.18; brow.scale.z = 0.6;
    const cheek = mesh(new THREE.SphereGeometry(0.05, 8, 8), mat(0xf29a88), side * 0.195, 0.125, 0.225, head); cheek.scale.set(1, 0.75, 0.35);
    const mo = mesh(new THREE.ConeGeometry(0.042, 0.17, 10), hair, side * 0.085, 0.085, 0.292, head);                 // moustache wing
    mo.rotation.z = side * -(Math.PI / 2 + 0.3); mo.scale.z = 0.7;
  });
  mesh(new THREE.SphereGeometry(0.04, 10, 8), hair, 0, 0.098, 0.3, head).scale.set(1.2, 0.85, 0.7);     // moustache centre
  const nose = mesh(new THREE.SphereGeometry(0.058, 12, 10), mat(0xe59c78), 0, 0.16, 0.305, head); nose.scale.set(1, 0.9, 1);
  const smile = mesh(new THREE.TorusGeometry(0.065, 0.015, 6, 14, Math.PI), black, 0, 0.045, 0.278, head);
  smile.rotation.z = Math.PI; smile.rotation.x = 0.25;

  // sled, shown only while sledding; the skin comes from the shop
  const sled = new THREE.Group(); sled.visible = false; root.add(sled);
  const man = { root, body, torso, head, legs, arms, sled, phase: 0 };
  setSled(man, sledId);
  return man;
}

/** Swap the sled skin. */
export function setSled(man, id) {
  while (man.sled.children.length) man.sled.remove(man.sled.children[0]);
  man.sledModel = buildSled(id); man.sled.add(man.sledModel);

}

/** Pose the man from his movement state. */
export function animateMan(man, dt, s) {
  const { body, torso, legs, arms, head, sled } = man;
  const k = Math.min(1, dt * 12);
  let legL = 0, legR = 0, armL = 0, armR = 0, bodyY = 0, lean = 0, armSide = 0.18;
  if (s.sled) {
    legL = legR = -1.45; armL = armR = -0.5; bodyY = -0.42; lean = -0.12;
  } else if (!s.grounded) {
    legL = 0.5; legR = -0.3; armL = armR = -2.6; armSide = 0.5;
  } else if (s.speed > 0.4) {
    man.phase += dt * (5 + s.speed * 0.75);
    const sw = Math.sin(man.phase) * Math.min(0.95, 0.3 + s.speed * 0.07);
    legL = sw; legR = -sw; armL = -sw * 0.9; armR = sw * 0.9;
    bodyY = Math.abs(Math.cos(man.phase)) * 0.05; lean = Math.min(0.2, s.speed * 0.015);
  } else {
    man.phase += dt * 2;
    bodyY = Math.sin(man.phase) * 0.012;
    if (s.cheer) { armL = armR = -2.7 + Math.sin(man.phase * 5) * 0.25; armSide = 0.45; bodyY = Math.abs(Math.sin(man.phase * 4)) * 0.18; }
  }
  sled.visible = !!s.sled;
  const flame = man.sledModel?.userData.flame;
  if (flame && s.sled) { const f = 0.75 + Math.random() * 0.5; flame.scale.set(f, f, 0.45 + Math.min(0.6, (s.speed || 0) * 0.04) + Math.random() * 0.2); }
  legs[0].rotation.x += (legL - legs[0].rotation.x) * k;
  legs[1].rotation.x += (legR - legs[1].rotation.x) * k;
  arms[0].rotation.x += (armL - arms[0].rotation.x) * k;
  arms[1].rotation.x += (armR - arms[1].rotation.x) * k;
  arms[0].rotation.z += (-armSide - arms[0].rotation.z) * k;
  arms[1].rotation.z += (armSide - arms[1].rotation.z) * k;
  body.position.y += (bodyY - body.position.y) * k;
  torso.rotation.x += (lean - torso.rotation.x) * k;
  head.rotation.y = Math.sin(man.phase * 0.35) * (s.speed > 0.4 ? 0.05 : 0.25);
}

const SCARVES = [0xff5d73, 0xffc93c, 0x4fc3f7, 0x7ed957, 0xc77dff, 0xff9f43, 0xf78fb3, 0x48dbfb, 0xfeca57, 0x1dd1a1, 0xff6b6b, 0xa29bfe];

/** A round baby penguin wearing a little coloured scarf and bobble hat. */
export function buildPenguin(index, scale = 1) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const coat = mat(scale > 1.5 ? 0x26324a : 0x55617a), belly = mat(0xffffff), orange = mat(0xff9d2e), black = mat(0x14161f);
  const colour = mat(SCARVES[index % SCARVES.length]);
  const b = mesh(new THREE.SphereGeometry(0.34, 16, 14), coat, 0, 0.4, 0, body); b.scale.set(1, 1.15, 0.95);
  const w = mesh(new THREE.SphereGeometry(0.28, 14, 12), belly, 0, 0.36, 0.1, body); w.scale.set(0.95, 1.1, 0.85);
  const head = new THREE.Group(); head.position.y = 0.86; body.add(head);
  mesh(new THREE.SphereGeometry(0.26, 16, 14), coat, 0, 0, 0, head);
  const face = mesh(new THREE.SphereGeometry(0.2, 12, 10), belly, 0, -0.03, 0.1, head); face.scale.set(1.05, 0.9, 0.8);
  [-1, 1].forEach(side => {
    mesh(new THREE.SphereGeometry(0.04, 8, 8), black, side * 0.09, 0.03, 0.235, head);
    const foot = mesh(new THREE.SphereGeometry(0.11, 8, 8), orange, side * 0.14, 0.04, 0.1, body); foot.scale.set(1, 0.4, 1.5);
  });
  const beak = mesh(new THREE.ConeGeometry(0.06, 0.14, 8), orange, 0, -0.04, 0.29, head); beak.rotation.x = Math.PI / 2;
  const scarf = mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16), colour, 0, 0.7, 0, body); scarf.rotation.x = Math.PI / 2;
  if (scale <= 1.5) {
    const hat = mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), colour, 0, 0.13, 0, head);
    hat.scale.y = 0.9;
    mesh(new THREE.SphereGeometry(0.07, 8, 8), belly, 0, 0.33, 0, head);
  }
  const wings = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.31, 0.6, 0); body.add(pivot);
    const wing = mesh(new THREE.SphereGeometry(0.16, 10, 8), coat, 0, -0.15, 0, pivot); wing.scale.set(0.35, 1.2, 0.8);
    pivot.rotation.z = side * 0.25;
    return pivot;
  });
  root.scale.setScalar(scale);
  return { root, body, head, wings, phase: index * 1.7 };
}

/** mode: 'idle' | 'call' (hopping for help) | 'walk' | 'slide' | 'dance' */
export function animatePenguin(p, dt, mode, speed = 0) {
  p.phase += dt * (mode === 'walk' ? 9 + speed * 0.5 : mode === 'dance' ? 9 : mode === 'call' ? 7 : 2.5);
  const { body, wings, head } = p, s = Math.sin(p.phase), k = Math.min(1, dt * 10);
  let tilt = 0, roll = 0, y = 0, flap = 0.25;
  if (mode === 'walk') { roll = s * 0.22; y = Math.abs(s) * 0.05; flap = 0.5; }
  else if (mode === 'slide') { tilt = 1.35; y = 0.12; flap = 1.2; }
  else if (mode === 'call') { y = Math.max(0, s) * 0.35; flap = 0.9 + s * 0.8; }
  else if (mode === 'dance') { y = Math.abs(s) * 0.3; roll = Math.sin(p.phase * 0.5) * 0.25; flap = 1.1 + s * 0.6; }
  else { roll = s * 0.04; }
  body.rotation.x += (tilt - body.rotation.x) * k;
  body.rotation.z += (roll - body.rotation.z) * k;
  body.position.y += (y - body.position.y) * k;
  wings[0].rotation.z = -flap; wings[1].rotation.z = flap;
  head.rotation.y = mode === 'idle' ? Math.sin(p.phase * 0.6) * 0.5 : 0;
}

// ---------- snow whirly: a swaying, swirling little tornado with a cheeky face ----------
const WH = 3.7;
const whirlR = v => 0.2 + 1.3 * Math.pow(v, 1.55);
const swayX = (v, t) => Math.sin(t * 1.7 + v * 2.4) * 0.38 * v * v;
const swayZ = (v, t) => Math.cos(t * 1.3 + v * 2.9) * 0.32 * v * v;

let streakImage = null;
function streakTexture() {
  if (!streakImage) {
    streakImage = texture(256, 256, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(0.5, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,.2)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.lineCap = 'round';
      for (let i = 0; i < 26; i++) {                         // slanted wind streaks that tile left-to-right
        const y = Math.random() * h, len = 60 + Math.random() * 150, x0 = Math.random() * w, a = 0.25 + Math.random() * 0.7;
        x.lineWidth = 2 + Math.random() * 9;
        for (const off of [-w, 0, w]) {
          const s = x.createLinearGradient(x0 + off, 0, x0 + off + len, 0);
          s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(0.5, `rgba(255,255,255,${a})`); s.addColorStop(1, 'rgba(255,255,255,0)');
          x.strokeStyle = s; x.beginPath(); x.moveTo(x0 + off, y); x.lineTo(x0 + off + len, y - len * 0.22); x.stroke();
        }
      }
    }).image;
  }
  const t = new THREE.CanvasTexture(streakImage); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function buildFunnel(scale, color, opacity, repeat) {
  const rings = 22, segs = 22, n = (rings + 1) * (segs + 1);
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), rgba = new Float32Array(n * 4), idx = [];
  for (let i = 0; i <= rings; i++) for (let j = 0; j <= segs; j++) {
    const k = i * (segs + 1) + j, v = i / rings;
    uv[k * 2] = j / segs * repeat; uv[k * 2 + 1] = v;
    rgba[k * 4] = rgba[k * 4 + 1] = rgba[k * 4 + 2] = 1;
    rgba[k * 4 + 3] = Math.min(1, v * 5) * (1 - Math.pow(v, 6) * 0.9);        // fade in at the tip and out at the rim
    if (i < rings && j < segs) idx.push(k, k + segs + 1, k + 1, k + 1, k + segs + 1, k + segs + 2);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(rgba, 4)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: streakTexture(), color, transparent: true, opacity, vertexColors: true, side: THREE.DoubleSide, depthWrite: false }));
  m.frustumCulled = false; m.userData = { rings, segs, scale };
  return m;
}

function shapeFunnel(m, t, phase) {
  const { rings, segs, scale } = m.userData, pos = m.geometry.attributes.position.array;
  for (let i = 0; i <= rings; i++) {
    const v = i / rings, r = whirlR(v) * scale * (1 + 0.07 * Math.sin(t * 6 + v * 10 + phase)), cx = swayX(v, t), cz = swayZ(v, t);
    for (let j = 0; j <= segs; j++) {
      const k = (i * (segs + 1) + j) * 3, a = j / segs * 6.2832 + v * 2.6;
      pos[k] = cx + Math.cos(a) * r; pos[k + 1] = v * WH; pos[k + 2] = cz + Math.sin(a) * r;
    }
  }
  m.geometry.attributes.position.needsUpdate = true;
}

export function buildWhirly() {
  const root = new THREE.Group();
  const layers = [buildFunnel(1, 0xffffff, 0.6, 2), buildFunnel(0.68, 0xbfe6ff, 0.75, 2), buildFunnel(1.18, 0xe8f6ff, 0.28, 3)];
  layers.forEach((l, i) => { l.renderOrder = 2 + i; root.add(l); });
  // soft core so the funnel reads as a solid body of snow
  const core = mesh(lathe([[0, 0.08], [0.5, 0.42], [1, 0.95]], WH * 0.92, 12, 16), new THREE.MeshBasicMaterial({ color: 0xd9efff, transparent: true, opacity: 0.35, depthWrite: false }), 0, 0.1, 0, root);
  // flying snowballs and ice shards caught in the wind
  const snowM = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xbfdcf2, emissiveIntensity: 0.5 });
  const iceM = new THREE.MeshPhongMaterial({ color: 0x9fdcff, emissive: 0x3d9bd6, emissiveIntensity: 0.4, shininess: 120, transparent: true, opacity: 0.9, flatShading: true });
  const ballG = new THREE.SphereGeometry(0.11, 8, 6), shardG = new THREE.OctahedronGeometry(0.13, 0), debris = [];
  for (let i = 0; i < 18; i++) {
    const ice = i % 3 === 0, m = mesh(ice ? shardG : ballG, ice ? iceM : snowM, 0, 0, 0, root);
    m.scale.setScalar(0.6 + Math.random() * 0.9); if (ice) m.scale.y *= 1.8;
    debris.push({ m, v: Math.random(), a: Math.random() * 6.28, speed: 3.5 + Math.random() * 3, off: 0.1 + Math.random() * 0.35, rise: 0.12 + Math.random() * 0.2 });
  }
  // kicked-up snow skirt at the ground
  const puffM = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, emissive: 0xcfe6f7, emissiveIntensity: 0.45 });
  const puffG = new THREE.SphereGeometry(0.34, 10, 8), puffs = [];
  for (let i = 0; i < 9; i++) { const m = mesh(puffG, puffM, 0, 0.14, 0, root); m.scale.y = 0.55; puffs.push({ m, a: i / 9 * 6.28, r: 0.75 + (i % 3) * 0.28, s: 0.7 + (i % 4) * 0.18 }); }
  const disc = mesh(new THREE.RingGeometry(0.3, 1.9, 28), new THREE.MeshBasicMaterial({ map: streakTexture(), color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), 0, 0.09, 0, root);
  disc.rotation.x = -Math.PI / 2;
  // cloudy crown
  const crown = [];
  for (let i = 0; i < 8; i++) { const m = mesh(puffG, puffM, 0, 0, 0, root); m.scale.set(1.25, 0.7, 1.25); crown.push({ m, a: i / 8 * 6.28 }); }
  // cheeky face that always turns to the camera
  const face = new THREE.Group(); root.add(face);
  const fz = whirlR(0.56) + 0.12, ink = new THREE.MeshBasicMaterial({ color: 0x27406b }), whiteB = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-1, 1].forEach(side => {
    const eye = mesh(new THREE.SphereGeometry(0.17, 12, 10), ink, side * 0.3, 0.1, fz, face); eye.scale.set(0.85, 1.15, 0.45);
    mesh(new THREE.SphereGeometry(0.055, 8, 8), whiteB, side * 0.3 + 0.05, 0.19, fz + 0.07, face);
    mesh(new THREE.SphereGeometry(0.025, 6, 6), whiteB, side * 0.3 - 0.04, 0.03, fz + 0.075, face);
    const brow = mesh(new THREE.CapsuleGeometry(0.035, 0.2, 4, 8), ink, side * 0.32, 0.38, fz, face); brow.rotation.z = Math.PI / 2 + side * 0.4;
    const blush = mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff9db5, transparent: true, opacity: 0.75 }), side * 0.52, -0.12, fz - 0.03, face); blush.scale.set(1, 0.6, 0.3);
  });
  const grin = mesh(new THREE.TorusGeometry(0.17, 0.045, 8, 14, Math.PI), ink, 0, -0.14, fz, face); grin.rotation.z = Math.PI;
  mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff7a8f }), 0, -0.27, fz - 0.01, face).scale.set(1, 0.6, 0.3);
  face.traverse(o => { o.renderOrder = 8; });
  return { root, layers, core, debris, puffs, disc, crown, face, rings: [], phase: Math.random() * 10 };
}

export function animateWhirly(w, dt) {
  const t = (w.phase += dt);
  w.layers.forEach((l, i) => {
    shapeFunnel(l, t, i * 2.1);
    l.material.map.offset.x -= dt * (1.5 - i * 0.35); l.material.map.offset.y -= dt * (0.5 + i * 0.12);
  });
  w.core.rotation.y += dt * 3;
  w.core.position.x = swayX(0.5, t) * 0.6; w.core.position.z = swayZ(0.5, t) * 0.6;
  w.debris.forEach(d => {
    d.v += dt * d.rise; if (d.v > 1) d.v -= 0.95;
    d.a += dt * d.speed * (1.4 - d.v * 0.7);
    const r = whirlR(d.v) + d.off;
    d.m.position.set(swayX(d.v, t) + Math.cos(d.a) * r, 0.15 + d.v * WH, swayZ(d.v, t) + Math.sin(d.a) * r);
    d.m.rotation.x += dt * 5; d.m.rotation.y += dt * 3;
  });
  w.puffs.forEach((p, i) => {
    p.a += dt * (2.6 - p.r);
    const k = p.s * (0.85 + 0.2 * Math.sin(t * 4 + i));
    p.m.position.x = Math.cos(p.a) * p.r; p.m.position.z = Math.sin(p.a) * p.r; p.m.scale.set(k, k * 0.55, k);
  });
  w.disc.rotation.z += dt * 2.5;
  w.crown.forEach((c, i) => {
    c.a += dt * 2.2;
    const r = whirlR(1) * 0.95, k = 1.05 + 0.2 * Math.sin(t * 3 + i * 1.3);
    c.m.position.set(swayX(1, t) + Math.cos(c.a) * r, WH + 0.05 + Math.sin(t * 2 + i) * 0.08, swayZ(1, t) + Math.sin(c.a) * r);
    c.m.scale.set(1.25 * k, 0.7 * k, 1.25 * k);
  });
  w.face.position.set(swayX(0.56, t), 0.56 * WH + Math.sin(t * 3) * 0.05, swayZ(0.56, t));
}
