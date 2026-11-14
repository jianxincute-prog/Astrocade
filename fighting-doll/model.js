// Procedural chibi 3D dolls (Three.js primitives + cartoon outlines) and their pose animation.
const THREE = window.THREE;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k = clamp(k, 0, 1), k * k * (3 - 2 * k));

let GRAD = null;
function grad() {
  if (!GRAD) { GRAD = new THREE.DataTexture(new Uint8Array([80, 160, 255]), 3, 1, THREE.LuminanceFormat); GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.generateMipmaps = false; GRAD.needsUpdate = true; }
  return GRAD;
}
const G = {};
function geos() {
  if (!G.sph) {
    G.sph = new THREE.SphereGeometry(1, 24, 16); G.cyl = new THREE.CylinderGeometry(1, 1, 1, 18); G.cone = new THREE.ConeGeometry(1, 1, 18);
    G.box = new THREE.BoxGeometry(1, 1, 1); G.circ = new THREE.CircleGeometry(1, 20);
    G.out = new THREE.MeshBasicMaterial({ color: 0x1b0d3a, side: THREE.BackSide });
  }
  return G;
}
function part(parent, geo, material, o = {}) {
  const { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, outline = 1.07 } = o;
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  if (outline) { const ol = new THREE.Mesh(geo, geos().out); ol.scale.setScalar(outline); m.add(ol); }
  parent.add(m); return m;
}

export function buildChar(ch) {
  const g = geos(), L = ch.look, mats = [];
  const M = (c, o) => { const m = new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: grad() }, o || {})); m.userData.base = m.emissive.clone(); mats.push(m); return m; };
  const flat = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
  const root = new THREE.Group(), rig = new THREE.Group(), hips = new THREE.Group(), torso = new THREE.Group(), head = new THREE.Group();
  root.add(rig); rig.add(hips); hips.position.y = 0.74; hips.add(torso); torso.add(head); head.position.y = 1.4;

  // legs
  const mkLeg = (sx) => {
    const lg = new THREE.Group(); lg.position.set(sx * 0.25, 0, 0); hips.add(lg);
    part(lg, g.cyl, M(L.legs), { y: -0.27, sx: 0.16, sy: 0.54, sz: 0.16 });
    part(lg, g.sph, M(L.feet), { y: -0.58, z: 0.08, sx: 0.22, sy: 0.15, sz: 0.32 });
    return lg;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  // body
  part(torso, g.sph, M(L.body), { y: 0.45, sx: 0.5, sy: 0.5, sz: 0.44 });
  if (L.belly) part(torso, g.sph, M(L.belly), { y: 0.4, z: 0.3, sx: 0.34, sy: 0.38, sz: 0.2, outline: 0 });
  if (L.skirt) part(torso, g.cyl, M(L.skirt), { y: 0.14, sx: 0.46, sy: 0.4, sz: 0.4, outline: 1.06 }).scale.set(0.5, 0.4, 0.44);
  if (L.belt) {
    const belt = part(torso, new THREE.TorusGeometry(0.46, 0.07, 8, 28), M(L.belt), { y: 0.22, rx: Math.PI / 2, sz: 0.9, outline: 0 });
    part(torso, g.sph, M(L.belt), { y: 0.22, z: 0.43, sx: 0.12, sy: 0.12, sz: 0.08, outline: 0 });
  }
  if (L.cape) part(torso, g.box, M(L.cape), { y: 0.5, z: -0.44, sx: 0.95, sy: 1.0, sz: 0.08, rx: 0.12 });
  if (L.scarf) {
    part(torso, new THREE.TorusGeometry(0.4, 0.09, 8, 24), M(L.scarf), { y: 0.88, rx: Math.PI / 2, outline: 0 });
    part(torso, g.box, M(L.scarf), { x: 0.2, y: 0.7, z: -0.5, sx: 0.18, sy: 0.7, sz: 0.06, rx: 0.5, outline: 0 });
  }

  // arms
  const mkArm = (sx) => {
    const a = new THREE.Group(); a.position.set(sx * 0.56, 0.72, 0); torso.add(a);
    part(a, g.cyl, M(L.arms), { y: -0.24, sx: 0.12, sy: 0.48, sz: 0.12 });
    const gl = L.glove || 1;
    part(a, g.sph, M(L.hands), { y: -0.54, sx: 0.17 * gl, sy: 0.17 * gl, sz: 0.17 * gl });
    return a;
  };
  const armL = mkArm(-1), armR = mkArm(1);

  // head
  part(head, g.sph, M(L.head), { sx: 0.82, sy: 0.72, sz: 0.74 });
  if (L.mane) part(head, g.sph, M(L.mane), { y: -0.02, z: -0.2, sx: 1.02, sy: 0.96, sz: 0.82 });
  if (L.face) part(head, g.sph, M(L.face), { y: -0.05, z: 0.3, sx: 0.62, sy: 0.55, sz: 0.48, outline: 0 });
  if (L.muzzle) part(head, g.sph, M(L.muzzle), { y: -0.14, z: 0.6, sx: 0.28, sy: 0.2, sz: 0.2, outline: 0 });
  // cheeks
  for (const sx of [-1, 1]) { const c = new THREE.Mesh(g.circ, flat(0xff8fa3, { transparent: true, opacity: 0.55 })); c.position.set(sx * 0.5, -0.14, 0.52); c.scale.set(0.14, 0.1, 1); c.rotation.y = sx * 0.85; head.add(c); }
  // eyes
  const eyes = new THREE.Group(); head.add(eyes); eyes.position.y = 0.06;
  const eyeMat = M(0x1b0d3a), white = flat(0xffffff);
  if (L.eyes === 'patch') {
    for (const sx of [-1, 1]) {
      part(head, g.sph, M(L.patch), { x: sx * 0.3, y: 0.05, z: 0.6, sx: 0.2, sy: 0.27, sz: 0.1, rz: -sx * 0.5, outline: 0 });
      part(eyes, g.sph, eyeMat, { x: sx * 0.3, y: 0, z: 0.66, sx: 0.08, sy: 0.1, sz: 0.05, outline: 0 });
      part(eyes, g.sph, white, { x: sx * 0.3 + 0.025, y: 0.04, z: 0.7, sx: 0.03, sy: 0.03, sz: 0.02, outline: 0 });
    }
  } else if (L.eyes === 'robot') {
    for (const sx of [-1, 1]) part(eyes, g.sph, M(0x34e0ff, { emissive: 0x34e0ff, emissiveIntensity: 1 }), { x: sx * 0.3, y: 0, z: 0.66, sx: 0.17, sy: 0.12, sz: 0.06, outline: 0 });
  } else if (L.eyes === 'frog') {
    const bulge = new THREE.Group(); bulge.position.y = 0.0; head.add(bulge);
    for (const sx of [-1, 1]) { part(bulge, g.sph, M(L.head), { x: sx * 0.38, y: 0.62, z: 0.2, sx: 0.28, sy: 0.28, sz: 0.28 }); part(eyes, g.sph, white, { x: sx * 0.38, y: 0.56, z: 0.44, sx: 0.16, sy: 0.18, sz: 0.06, outline: 0 }); part(eyes, g.sph, eyeMat, { x: sx * 0.38, y: 0.56, z: 0.5, sx: 0.09, sy: 0.12, sz: 0.04, outline: 0 }); }
    eyes.position.y = 0;
  } else {
    const big = L.eyes === 'big';
    for (const sx of [-1, 1]) {
      part(eyes, g.sph, eyeMat, { x: sx * 0.3, y: 0, z: 0.66, sx: big ? 0.15 : 0.11, sy: big ? 0.2 : 0.15, sz: 0.06, outline: 0 });
      part(eyes, g.sph, white, { x: sx * 0.3 + 0.03, y: 0.06, z: 0.71, sx: big ? 0.06 : 0.04, sy: big ? 0.06 : 0.04, sz: 0.02, outline: 0 });
      if (L.eyes === 'angry') part(head, g.box, eyeMat, { x: sx * 0.3, y: 0.28, z: 0.64, sx: 0.2, sy: 0.04, sz: 0.04, rz: -sx * 0.4, outline: 0 });
    }
  }
  // nose / beak
  if (L.beak) { const duck = ch.id === 'duck'; part(head, g.sph, M(L.beak), { y: -0.1, z: 0.76, sx: duck ? 0.34 : 0.24, sy: duck ? 0.13 : 0.11, sz: duck ? 0.3 : 0.2, outline: 1.08 }); }
  else if (L.nose) part(head, g.sph, M(L.nose), { y: -0.04, z: 0.72, sx: 0.07, sy: 0.055, sz: 0.05, outline: 0 });
  // mouth
  const mouth = new THREE.Group(); head.add(mouth); mouth.position.set(0, -0.26, L.beak ? 0.6 : 0.66);
  if (!L.beak) { const sm = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 12, Math.PI), flat(0x1b0d3a)); sm.rotation.z = Math.PI; mouth.add(sm); }
  const open = new THREE.Mesh(g.sph, flat(0x4a0f2e)); open.scale.set(0.11, 0.08, 0.04); open.visible = false; mouth.add(open);
  // ears
  const ears = L.ears || 'none';
  for (const sx of [-1, 1]) {
    if (ears === 'round') { part(head, g.sph, M(L.earC), { x: sx * 0.58, y: 0.55, z: -0.02, sx: 0.24, sy: 0.24, sz: 0.2 }); if (L.earIn) part(head, g.sph, M(L.earIn), { x: sx * 0.58, y: 0.55, z: 0.1, sx: 0.14, sy: 0.14, sz: 0.1, outline: 0 }); }
    else if (ears === 'long') { part(head, g.sph, M(L.earC), { x: sx * 0.3, y: 1.0, z: -0.02, sx: 0.17, sy: 0.62, sz: 0.12, rz: -sx * 0.22 }); part(head, g.sph, M(L.earIn), { x: sx * 0.3, y: 1.0, z: 0.07, sx: 0.09, sy: 0.46, sz: 0.06, rz: -sx * 0.22, outline: 0 }); }
    else if (ears === 'pointy') { part(head, g.cone, M(L.earC), { x: sx * 0.46, y: 0.7, z: 0, sx: 0.24, sy: 0.5, sz: 0.14, rz: -sx * 0.35 }); part(head, g.cone, M(L.earIn), { x: sx * 0.46, y: 0.68, z: 0.06, sx: 0.13, sy: 0.32, sz: 0.06, rz: -sx * 0.35, outline: 0 }); }
    else if (ears === 'tall') { part(head, g.cyl, M(L.earC), { x: sx * 0.34, y: 0.95, sx: 0.1, sy: 0.7, sz: 0.1, rz: -sx * 0.12 }); part(head, g.sph, M(L.earIn, { emissive: L.earIn, emissiveIntensity: 0.9 }), { x: sx * 0.4, y: 1.35, sx: 0.12, sy: 0.12, sz: 0.12, outline: 0 }); }
  }
  // gear
  if (L.gear === 'band' || L.gear === 'plate') {
    part(head, new THREE.TorusGeometry(0.76, 0.06, 8, 30), M(L.gearC), { y: 0.33, rx: Math.PI / 2 + 0.08, sx: 1, sy: 0.96, outline: 0 });
    part(head, g.sph, M(L.gearC), { x: 0.12, y: 0.32, z: -0.78, sx: 0.12, sy: 0.12, sz: 0.1, outline: 0 });
    part(head, g.box, M(L.gearC), { x: 0.2, y: 0.18, z: -0.84, sx: 0.07, sy: 0.3, sz: 0.04, rz: 0.3, outline: 0 });
    part(head, g.box, M(L.gearC), { x: 0.02, y: 0.16, z: -0.84, sx: 0.07, sy: 0.3, sz: 0.04, rz: -0.2, outline: 0 });
    if (L.gear === 'plate') part(head, g.box, M(0xc9d2e6), { y: 0.36, z: 0.74, sx: 0.2, sy: 0.13, sz: 0.04, outline: 0 });
  }
  if (L.gear === 'hat') {
    part(head, g.cyl, M(L.gearC), { y: 0.62, sx: 0.98, sy: 0.07, sz: 0.98 });
    part(head, g.cone, M(L.gearC), { y: 1.18, z: -0.05, sx: 0.58, sy: 1.1, sz: 0.58, rx: -0.12 });
    part(head, new THREE.TorusGeometry(0.56, 0.05, 6, 24), M(0xffd23f), { y: 0.72, rx: Math.PI / 2, outline: 0 });
    part(head, g.sph, M(0xffd23f), { y: 1.0, z: 0.5, sx: 0.12, sy: 0.12, sz: 0.04, outline: 0 });
  }
  if (L.hair) {
    part(head, g.sph, M(L.hair), { y: 0.1, z: -0.12, sx: 0.88, sy: 0.8, sz: 0.78 });
    part(head, g.sph, M(L.hair), { y: 0.46, z: 0.34, sx: 0.78, sy: 0.3, sz: 0.46, outline: 0 });
    for (const sx of [-1, 1]) { part(head, g.sph, M(L.hair), { x: sx * 0.82, y: -0.25, z: -0.1, sx: 0.24, sy: 0.24, sz: 0.24 }); part(head, g.cone, M(L.hair), { x: sx * 0.86, y: -0.62, z: -0.1, sx: 0.2, sy: 0.55, sz: 0.2, rx: Math.PI }); }
  }
  if (L.tuft) for (let i = -1; i <= 1; i++) part(head, g.sph, M(L.tuft), { x: i * 0.1, y: 0.74, z: 0.04, sx: 0.07, sy: 0.16, sz: 0.07, rz: -i * 0.4 });
  if (L.antenna) { part(head, g.cyl, M(0x3a4a6b), { y: 0.88, sx: 0.04, sy: 0.3, sz: 0.04 }); part(head, g.sph, M(L.antenna, { emissive: L.antenna, emissiveIntensity: 1 }), { y: 1.06, sx: 0.1, sy: 0.1, sz: 0.1, outline: 0 }); }
  // tail
  const tail = new THREE.Group(); tail.position.set(0, 0.25, -0.4); torso.add(tail);
  if (L.tail === 'fluffy') { part(tail, g.sph, M(L.tailC), { y: 0.1, z: -0.4, sx: 0.3, sy: 0.3, sz: 0.55, rx: -0.5 }); part(tail, g.sph, M(L.tailTip), { y: 0.35, z: -0.8, sx: 0.22, sy: 0.22, sz: 0.28, outline: 0 }); }
  else if (L.tail === 'tuft') { part(tail, g.cyl, M(L.tailC), { y: 0.05, z: -0.3, sx: 0.05, sy: 0.7, sz: 0.05, rx: 1.2 }); part(tail, g.sph, M(L.tailTip), { y: 0.1, z: -0.65, sx: 0.14, sy: 0.14, sz: 0.2 }); }
  else if (L.tail === 'stripe') { for (let i = 0; i < 4; i++) part(tail, g.sph, M(i % 2 ? L.tailTip : L.tailC), { y: 0.1 + i * 0.16, z: -0.3 - i * 0.07, sx: 0.12, sy: 0.12, sz: 0.12 }); }
  else if (L.tail === 'puff') part(tail, g.sph, M(L.tailC), { y: 0, z: -0.15, sx: 0.2, sy: 0.2, sz: 0.2 });

  // aura (used by the special move)
  const joints = { root, rig, hips, torso, head, armL, armR, legL, legR, eyes, mouth, mouthOpen: open, tail };
  const act = { aLx: -0.9, aLz: 0.4, aRx: -0.9, aRz: -0.4, lLx: 0, lRx: 0, tRx: 0.05, tRy: 0, hRx: 0, hipY: 0, sY: 1, sXZ: 1, rRx: 0, rRy: 0, rRz: 0, rigY: 0, rigZ: 0, eye: 1, mouth: 0 };
  return { root, rig, hips, torso, head, mats, joints, act, ch };
}

export function setFlash(h, v) {
  for (const m of h.mats) { m.emissive.copy(m.userData.base); if (v > 0) { m.emissive.lerp(WHITE, v); } }
}
const WHITE = THREE.Color ? new THREE.Color(1, 1, 1) : null;

// info: { state, st, mv (0..1 walking amount), air, vy, side (punch hand), ph, stun }
export function poseChar(h, info, t, dt) {
  const a = h.act, s = info.st, ph = info.ph || 0;
  const tg = { aLx: -0.9, aLz: 0.4, aRx: -0.9, aRz: -0.4, lLx: 0, lRx: 0, tRx: 0.05, tRy: 0, hRx: 0, hipY: 0, sY: 1, sXZ: 1, rRx: 0, rRz: 0, rigY: 0, rigZ: 0, eye: 1, mouth: 0 };
  let rate = 16, spin = 0;
  const side = info.side ? 1 : 0;
  switch (info.state) {
    case 'idle': case 'walk': {
      if (info.air) {
        tg.lLx = -0.7; tg.lRx = 0.35; tg.aLx = -1.9; tg.aRx = -1.9; tg.aLz = -0.55; tg.aRz = 0.55;
        tg.sY = 1 + clamp(info.vy * 0.012, -0.05, 0.12); tg.sXZ = 1 / Math.sqrt(tg.sY); break;
      }
      const b = Math.sin(t * 4.2 + ph);
      if (info.mv > 0.15) {
        const sw = Math.sin(t * 11 + ph);
        tg.lLx = sw * 0.85; tg.lRx = -sw * 0.85; tg.aLx = -0.8 + sw * 0.35; tg.aRx = -0.8 - sw * 0.35; tg.hipY = Math.abs(sw) * 0.06; tg.tRx = 0.14; tg.tRy = sw * 0.12;
      } else {
        tg.hipY = b * 0.03 - 0.02; tg.sY = 1 + b * 0.02; tg.sXZ = 1 - b * 0.012; tg.tRy = Math.sin(t * 1.7 + ph) * 0.08; tg.hRx = Math.sin(t * 2.1 + ph) * 0.04;
        tg.aLx = -0.95 + b * 0.05; tg.aRx = -0.95 - b * 0.05; tg.lLx = 0.12; tg.lRx = -0.12;
      }
      break;
    }
    case 'punch': {
      rate = 45;
      const ax = side ? 'aRx' : 'aLx', az = side ? 'aRz' : 'aLz', tw = side ? 1 : -1;
      if (s < 0.1) { const k = ease(s / 0.1); tg[ax] = lerp(-0.9, 0.9, k); tg.tRy = 0.6 * tw * k; tg.tRx = -0.15 * k; tg.rigZ = -0.1 * k; tg.hipY = -0.05 * k; }
      else if (s < 0.22) { const k = ease((s - 0.1) / 0.1); tg[ax] = lerp(0.9, -1.62, k); tg[az] = side ? -0.05 : 0.05; tg.tRy = lerp(0.6, -0.55, k) * tw; tg.tRx = 0.2 * k; tg.rigZ = lerp(-0.1, 0.45, k); tg.mouth = 1; tg.lLx = -0.35; tg.lRx = 0.35; }
      else { const k = ease((s - 0.22) / 0.14); tg[ax] = lerp(-1.62, -0.9, k); tg.tRy = lerp(-0.55, 0, k) * tw; tg.rigZ = lerp(0.45, 0, k); tg.tRx = lerp(0.2, 0.05, k); }
      break;
    }
    case 'kick': {
      rate = 45;
      if (s < 0.14) { const k = ease(s / 0.14); tg.hipY = -0.14 * k; tg.tRx = -0.25 * k; tg.lRx = 0.55 * k; tg.aLz = -0.5; tg.aRz = 0.5; tg.aLx = -0.4; tg.aRx = -0.4; }
      else if (s < 0.34) { const k = (s - 0.14) / 0.2; tg.lRx = -1.5; tg.lLx = 0.2; tg.tRx = -0.5; tg.hipY = 0.05; tg.rigY = 0.25 * Math.sin(k * Math.PI); tg.aLz = -1.3; tg.aRz = 1.3; tg.aLx = -0.3; tg.aRx = -0.3; spin = ease(k) * Math.PI * 2; tg.mouth = 1; tg.rigZ = 0.2; }
      else { const k = ease((s - 0.34) / 0.16); tg.lRx = lerp(-1.5, 0, k); tg.tRx = lerp(-0.5, 0.05, k); tg.aLz = lerp(-1.3, 0.4, k); tg.aRz = lerp(1.3, -0.4, k); }
      break;
    }
    case 'special': {
      rate = 30;
      if (s < 0.5) { const k = s / 0.5; tg.hipY = -0.16 * k; tg.aLx = 0.5; tg.aRx = 0.5; tg.aLz = -1.0; tg.aRz = 1.0; tg.rRz = Math.sin(s * 60) * 0.05 * k; tg.sXZ = 1 + 0.08 * k + 0.02 * Math.sin(s * 50); tg.tRx = -0.15 * k; tg.mouth = 1; tg.eye = 0.5; }
      else { const k = ease((s - 0.5) / 0.15), r = ease((s - 0.65) / 0.25); tg.aLx = lerp(0.5, -1.55, k); tg.aRx = lerp(0.5, -1.55, k); tg.aLz = lerp(-1.0, 0.12, k); tg.aRz = lerp(1.0, -0.12, k); tg.rigZ = 0.35 * k * (1 - r); tg.tRx = 0.25 * k * (1 - r); tg.mouth = 1; tg.lLx = -0.3; tg.lRx = 0.3; }
      break;
    }
    case 'hit': {
      rate = 34;
      const k = clamp(s / (info.stun || 0.4), 0, 1);
      tg.tRx = -0.6 * (1 - k * 0.6); tg.rigZ = -0.35 * (1 - k); tg.aLx = -0.2; tg.aRx = -0.2; tg.aLz = -1.1; tg.aRz = 1.1; tg.hRx = -0.5 * (1 - k); tg.eye = 0.15; tg.mouth = 1; tg.sY = 0.94 + 0.06 * k; tg.lLx = 0.3; tg.lRx = -0.2;
      break;
    }
    case 'ko': {
      rate = 9;
      tg.rRx = -1.55; tg.aLx = -0.15; tg.aRx = -0.15; tg.aLz = -1.2; tg.aRz = 1.2; tg.lLx = -0.3; tg.lRx = 0.2; tg.eye = 0.15; tg.mouth = 1; tg.tRx = 0;
      break;
    }
    case 'win': {
      const cy = t * 7 + ph, b = Math.abs(Math.sin(cy)), n = Math.floor(cy / Math.PI), fr = (cy / Math.PI) % 1;
      tg.aLx = -3.0; tg.aRx = -3.0; tg.aLz = -0.35; tg.aRz = 0.35; tg.lLx = -0.5 * b; tg.lRx = 0.3 * b; tg.rigY = b * 0.85; tg.eye = 0.2; tg.mouth = 1; tg.sY = 1 + 0.1 * b - 0.12 * Math.pow(1 - b, 5); tg.sXZ = 1 / Math.sqrt(tg.sY); tg.tRx = -0.1;
      if (n % 3 === 2) spin = ease(fr) * Math.PI * 2;
      break;
    }
    case 'dizzy': {
      tg.hRx = Math.sin(t * 5) * 0.25; tg.rRz = Math.sin(t * 4) * 0.08; tg.aLz = -0.3; tg.aRz = 0.3; tg.aLx = -0.2; tg.aRx = -0.2; tg.eye = 0.2; tg.hipY = -0.1; tg.lLx = 0.1; tg.tRx = 0.2;
      break;
    }
  }
  const k = 1 - Math.exp(-rate * Math.max(0, dt));
  for (const key in tg) a[key] += (tg[key] - a[key]) * k;
  a.rRy = spin;
  const J = h.joints;
  J.armL.rotation.set(a.aLx, 0, a.aLz); J.armR.rotation.set(a.aRx, 0, a.aRz);
  J.legL.rotation.x = a.lLx; J.legR.rotation.x = a.lRx;
  J.torso.rotation.set(a.tRx, a.tRy, 0); J.head.rotation.x = a.hRx;
  J.hips.position.y = 0.74 + a.hipY;
  J.rig.rotation.set(a.rRx, a.rRy, a.rRz);
  const lift = 0.62 * Math.abs(Math.sin(a.rRx));
  J.rig.position.set(0, a.rigY + lift, a.rigZ - 0.9 * Math.abs(Math.sin(a.rRx)));
  J.rig.scale.set(a.sXZ, a.sY, a.sXZ);
  J.eyes.scale.y = Math.max(0.12, a.eye);
  J.mouthOpen.visible = a.mouth > 0.5;
  J.tail.rotation.y = Math.sin(t * 3 + ph) * 0.3;
}
