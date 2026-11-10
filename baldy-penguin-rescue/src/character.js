// Procedural characters: Baldy (the bald hero), baby penguins, mama penguin and the snow whirly.
// Every model faces +Z and stands on y = 0.

const mat = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });

function mesh(geo, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}

/** The player: a friendly bald man in a puffy winter jacket. */
export function buildMan(jacketColor) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const skin = new THREE.MeshPhongMaterial({ color: 0xf2bf98, shininess: 70, specular: 0x666666 });
  const jacket = mat(jacketColor), dark = mat(0x2c3e5c), boot = mat(0x5a3a26), white = mat(0xffffff);
  const black = mat(0x1d1d24), scarfM = mat(0xffd23f), mitt = mat(0x2f9e8f);

  // legs
  const legs = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.17, 0.82, 0); body.add(pivot);
    mesh(new THREE.CapsuleGeometry(0.135, 0.42, 4, 10), dark, 0, -0.34, 0, pivot);
    const b = mesh(new THREE.SphereGeometry(0.17, 12, 10), boot, 0, -0.7, 0.06, pivot); b.scale.set(1, 0.75, 1.45);
    return pivot;
  });
  // torso: puffy jacket in three soft rings
  const torso = new THREE.Group(); torso.position.y = 0.82; body.add(torso);
  const t1 = mesh(new THREE.SphereGeometry(0.4, 18, 14), jacket, 0, 0.2, 0, torso); t1.scale.set(1, 0.72, 0.88);
  const t2 = mesh(new THREE.SphereGeometry(0.42, 18, 14), jacket, 0, 0.44, 0, torso); t2.scale.set(1, 0.7, 0.9);
  const t3 = mesh(new THREE.SphereGeometry(0.38, 18, 14), jacket, 0, 0.66, 0, torso); t3.scale.set(1, 0.62, 0.86);
  for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.045, 8, 8), white, 0, 0.24 + i * 0.2, 0.36, torso);   // buttons
  const scarf = mesh(new THREE.TorusGeometry(0.21, 0.085, 10, 20), scarfM, 0, 0.9, 0, torso); scarf.rotation.x = Math.PI / 2;
  const tail = mesh(new THREE.BoxGeometry(0.14, 0.36, 0.06), scarfM, 0.16, 0.7, 0.3, torso); tail.rotation.z = -0.2;
  // arms
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.44, 0.66, 0); torso.add(pivot);
    mesh(new THREE.CapsuleGeometry(0.125, 0.36, 4, 10), jacket, 0, -0.26, 0, pivot);
    mesh(new THREE.SphereGeometry(0.15, 12, 10), mitt, 0, -0.56, 0, pivot);
    pivot.rotation.z = side * 0.18;
    return pivot;
  });
  // head — proudly bald and shiny
  const head = new THREE.Group(); head.position.y = 1.07; torso.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.31, 24, 20), skin, 0, 0.2, 0, head); skull.scale.set(1, 1.08, 1);
  const shine = mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }), -0.1, 0.45, 0.14, head);
  shine.scale.set(1.5, 0.6, 1);
  [-1, 1].forEach(side => {
    mesh(new THREE.SphereGeometry(0.075, 10, 8), skin, side * 0.31, 0.17, 0, head);                 // ears
    mesh(new THREE.SphereGeometry(0.05, 10, 8), white, side * 0.115, 0.24, 0.265, head);            // eye white
    mesh(new THREE.SphereGeometry(0.03, 8, 8), black, side * 0.115, 0.24, 0.305, head);             // pupil
    const brow = mesh(new THREE.BoxGeometry(0.12, 0.035, 0.03), mat(0x5b3b22), side * 0.12, 0.335, 0.28, head);
    brow.rotation.z = side * -0.15;
    const cheek = mesh(new THREE.SphereGeometry(0.05, 8, 8), mat(0xf59a8a), side * 0.2, 0.12, 0.235, head); cheek.scale.z = 0.4;
    const mo = mesh(new THREE.CapsuleGeometry(0.035, 0.1, 3, 8), mat(0x5b3b22), side * 0.075, 0.085, 0.3, head);   // moustache
    mo.rotation.z = Math.PI / 2 + side * 0.35;
  });
  mesh(new THREE.SphereGeometry(0.055, 10, 8), mat(0xe9a07c), 0, 0.15, 0.31, head);                 // nose
  const smile = mesh(new THREE.TorusGeometry(0.07, 0.016, 6, 12, Math.PI), black, 0, 0.055, 0.285, head);
  smile.rotation.z = Math.PI;

  // sled, shown only while sledding
  const sled = new THREE.Group(); sled.visible = false; root.add(sled);
  mesh(new THREE.BoxGeometry(0.8, 0.08, 1.5), mat(0xd9482b), 0, 0.2, 0.1, sled);
  [-1, 1].forEach(side => mesh(new THREE.BoxGeometry(0.07, 0.12, 1.7), mat(0x7a4a2a), side * 0.32, 0.08, 0.1, sled));
  const nose = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 10, 1, false, 0, Math.PI), mat(0xd9482b), 0, 0.2, 0.86, sled);
  nose.rotation.z = Math.PI / 2;

  return { root, body, torso, head, legs, arms, sled, phase: 0 };
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

/** A playful little snow tornado with a cheeky face. */
export function buildWhirly() {
  const root = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, emissive: 0x9fd4f5, emissiveIntensity: 0.35 });
  const rings = [];
  for (let i = 0; i < 5; i++) {
    const r = 0.45 + i * 0.32;
    const ring = mesh(new THREE.TorusGeometry(r, 0.2 + i * 0.03, 8, 18), m, 0, 0.35 + i * 0.62, 0, root);
    ring.rotation.x = Math.PI / 2; rings.push(ring);
  }
  const face = new THREE.Group(); face.position.set(0, 1.7, 0); root.add(face);
  const black = new THREE.MeshBasicMaterial({ color: 0x24324a });
  [-1, 1].forEach(side => mesh(new THREE.SphereGeometry(0.13, 8, 8), black, side * 0.28, 0.1, 1.15, face));
  const grin = mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 12, Math.PI), black, 0, -0.12, 1.15, face); grin.rotation.z = Math.PI;
  return { root, rings, face, phase: 0 };
}

export function animateWhirly(w, dt) {
  w.phase += dt;
  w.rings.forEach((ring, i) => {
    ring.rotation.z += dt * (5 - i * 0.5);
    ring.position.x = Math.sin(w.phase * 3 + i * 0.9) * 0.14 * i;
    ring.position.z = Math.cos(w.phase * 3 + i * 0.9) * 0.14 * i;
  });
}
