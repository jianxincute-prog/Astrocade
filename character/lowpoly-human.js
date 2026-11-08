/**
 * lowpoly-human.js — "Kiko-style" original low-poly human character for Three.js.
 *
 * - Realistic human proportions (~7.5 heads tall), faceted low-poly look
 *   (every mesh is flat-shaded; ~1,500 triangles total).
 * - Fully articulated skeleton of named joints (hips, spine, chest, neck, head,
 *   shoulders, elbows, hips, knees, ankles) — works with the built-in procedural
 *   animations OR can be driven by your own code.
 * - Customizable: skin / hair / outfit colors, hair style, build, sleeves, pants.
 * - Reusable: one function call per character, any number of instances.
 *
 * Usage:
 *   import * as THREE from 'three';
 *   import { createCharacter } from './lowpoly-human.js';
 *   const hero = createCharacter(THREE, { hair: 'long', shirt: '#e4572e' });
 *   scene.add(hero.root);
 *   hero.play('walk');               // idle | walk | run | wave | jump
 *   // in your loop:  hero.update(dt);
 *
 * The character faces +Z, stands with its feet at y = 0, and is `height` units tall.
 */

export const CLIP_PERIODS = { idle: 4, walk: 1, run: 0.62, wave: 1, jump: 1 };
export const ANIMATIONS = Object.keys(CLIP_PERIODS);

export const DEFAULTS = {
  height: 1.75,
  build: 'neutral',          // 'neutral' | 'masculine' | 'feminine'
  skin: '#e0ac86',
  hair: 'short',             // 'short' | 'long' | 'bun' | 'bald'
  hairColor: '#3b2a20',
  eyeColor: '#2a1d14',
  shirt: '#2f80c8',
  sleeves: 'short',          // 'short' | 'long' | 'none'
  pants: '#3a3f58',
  legs: 'long',              // 'long' | 'shorts'
  shoes: '#f2f2f2',
  belt: '#1c1c22',
};

const BUILDS = {
  neutral:   { chest: 0.195, waist: 0.150, hip: 0.170 },
  masculine: { chest: 0.215, waist: 0.168, hip: 0.165 },
  feminine:  { chest: 0.178, waist: 0.128, hip: 0.182 },
};

export const JOINTS = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'shoulderL', 'elbowL', 'shoulderR', 'elbowR',
  'hipL', 'kneeL', 'ankleL', 'hipR', 'kneeR', 'ankleR',
];

/* ------------------------------------------------------------------ poses */

const TAU = Math.PI * 2;

/**
 * Pure pose function: returns { hipsY, joints: { name: [x,y,z] } } in radians.
 * Conventions (character faces +Z, left side is +X):
 *   - hanging limbs (arms, legs): negative x swings FORWARD
 *   - upward parts (spine, neck, head): positive x leans FORWARD
 *   - knee/elbow: positive x bends knee back, negative x bends elbow forward
 *   - shoulder z: left arm +z raises outward, right arm -z raises outward
 */
export function getPose(name, t) {
  const j = {};
  const set = (k, x = 0, y = 0, z = 0) => { j[k] = [x, y, z]; };
  JOINTS.forEach((k) => set(k));
  let hipsY = 0;

  const idle = (time) => {
    const b = Math.sin((time / CLIP_PERIODS.idle) * TAU);
    set('spine', 0.02 * b);
    set('chest', 0.03 * b);
    set('head', -0.02 * b, 0.05 * Math.sin((time / CLIP_PERIODS.idle) * TAU * 0.5));
    set('shoulderL', 0.03 * b, 0, 0.09);
    set('shoulderR', 0.03 * b, 0, -0.09);
    set('elbowL', -0.14);
    set('elbowR', -0.14);
    set('hipL', 0, 0, 0.02);
    set('hipR', 0, 0, -0.02);
    set('ankleL'); set('ankleR');
    hipsY = -0.004 * b;
  };

  if (name === 'idle') {
    idle(t);
  } else if (name === 'walk' || name === 'run') {
    const run = name === 'run';
    const ph = (t / CLIP_PERIODS[name]) * TAU;
    const s = Math.sin(ph), c = Math.cos(ph);
    const legAmp = run ? 0.95 : 0.55;
    const armAmp = run ? 0.9 : 0.5;
    const kneeAmp = run ? 1.5 : 0.8;
    set('hipL', -s * legAmp, 0, 0.02);
    set('hipR', s * legAmp, 0, -0.02);
    set('kneeL', (run ? 0.25 : 0.06) + Math.max(0, c) * kneeAmp);
    set('kneeR', (run ? 0.25 : 0.06) + Math.max(0, -c) * kneeAmp);
    set('ankleL', Math.max(0, c) * -0.3 + s * 0.15);
    set('ankleR', Math.max(0, -c) * -0.3 - s * 0.15);
    set('shoulderL', s * armAmp, 0, run ? 0.12 : 0.07);
    set('shoulderR', -s * armAmp, 0, run ? -0.12 : -0.07);
    set('elbowL', run ? -1.35 : -0.25 - Math.max(0, -s) * 0.3);
    set('elbowR', run ? -1.35 : -0.25 - Math.max(0, s) * 0.3);
    set('spine', run ? 0.22 : 0.04, s * (run ? 0.12 : 0.08));
    set('chest', 0, -s * (run ? 0.18 : 0.12));
    set('neck', run ? -0.12 : -0.02);
    set('head', 0, s * 0.05);
    set('hips', 0, -s * (run ? 0.12 : 0.08));
    hipsY = Math.cos(ph * 2) * (run ? 0.045 : 0.018) - (run ? 0.02 : 0.008);
  } else if (name === 'wave') {
    idle(t);
    const w = Math.sin((t / CLIP_PERIODS.wave) * TAU * 3);
    set('shoulderR', 0, 0, -2.55);
    set('elbowR', -0.25, 0, -0.45 * w - 0.35);
    set('chest', 0.03, 0.12, 0.04);
    set('head', 0, 0.2, -0.08);
  } else if (name === 'jump') {
    set('hips', 0.05);
    set('spine', 0.1);
    set('shoulderL', -0.3, 0, 1.25);
    set('shoulderR', -0.3, 0, -1.25);
    set('elbowL', -0.3);
    set('elbowR', -0.3);
    set('hipL', -0.7, 0, 0.1);
    set('hipR', -0.35, 0, -0.1);
    set('kneeL', 1.1);
    set('kneeR', 0.7);
    set('ankleL', 0.3);
    set('ankleR', 0.3);
    set('head', -0.1);
  } else {
    idle(t);
  }
  return { hipsY, joints: j };
}

/* ---------------------------------------------------------------- builder */

export function createCharacter(THREE, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const B = BUILDS[o.build] || BUILDS.neutral;

  /* geometry / material helpers */
  const flat = (g) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.computeVertexNormals();
    return n;
  };
  const materials = {};
  const mat = (key, color) => {
    if (!materials[key]) {
      materials[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
      materials[key].name = key;
    }
    return materials[key];
  };
  const skin = mat('skin', o.skin);
  const hairM = mat('hair', o.hairColor);
  const shirt = mat('shirt', o.shirt);
  const pants = mat('pants', o.pants);
  const shoes = mat('shoes', o.shoes);
  const belt = mat('belt', o.belt);
  const eyeWhite = mat('eyeWhite', '#f4f1ea');
  const eyeM = mat('eye', o.eyeColor);
  const lip = mat('lip', new THREE.Color(o.skin).multiplyScalar(0.62).offsetHSL(0, 0.05, -0.02));
  const sole = mat('sole', '#2a2a30');

  let meshCount = 0;
  const add = (parent, geo, material, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], name) => {
    const m = new THREE.Mesh(flat(geo), material);
    m.position.set(...pos);
    m.scale.set(...scale);
    m.rotation.set(...rot);
    m.castShadow = true;
    m.receiveShadow = true;
    m.name = name || `${material.name}_${meshCount++}`;
    parent.add(m);
    return m;
  };
  const joint = (name, parent, pos) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(...pos);
    parent.add(g);
    return g;
  };
  /** tapered limb segment hanging down from the joint origin */
  const limb = (parent, len, rTop, rBot, material, seg = 7, y0 = 0, name) =>
    add(parent, new THREE.CylinderGeometry(rTop, rBot, len, seg), material, [0, y0 - len / 2, 0], [1, 1, 1], [0, 0, 0], name);

  const root = new THREE.Group();
  root.name = 'character';
  const body = new THREE.Group();   // scaled to the requested height
  body.name = 'body';
  root.add(body);

  /* ----- skeleton ----- */
  const HIP_Y = 0.94;
  const hips = joint('hips', body, [0, HIP_Y, 0]);
  const spine = joint('spine', hips, [0, 0.08, 0]);
  const chest = joint('chest', spine, [0, 0.2, 0]);
  const neck = joint('neck', chest, [0, 0.32, 0]);
  const head = joint('head', neck, [0, 0.09, 0]);

  const sx = B.chest + 0.032;
  const shoulderL = joint('shoulderL', chest, [sx, 0.27, 0]);
  const shoulderR = joint('shoulderR', chest, [-sx, 0.27, 0]);
  const elbowL = joint('elbowL', shoulderL, [0, -0.3, 0]);
  const elbowR = joint('elbowR', shoulderR, [0, -0.3, 0]);
  const wristL = joint('wristL', elbowL, [0, -0.27, 0]);
  const wristR = joint('wristR', elbowR, [0, -0.27, 0]);

  const hx = 0.088;
  const hipL = joint('hipL', hips, [hx, -0.02, 0]);
  const hipR = joint('hipR', hips, [-hx, -0.02, 0]);
  const kneeL = joint('kneeL', hipL, [0, -0.44, 0]);
  const kneeR = joint('kneeR', hipR, [0, -0.44, 0]);
  const ankleL = joint('ankleL', kneeL, [0, -0.42, 0]);
  const ankleR = joint('ankleR', kneeR, [0, -0.42, 0]);

  /* ----- torso ----- */
  add(hips, new THREE.CylinderGeometry(B.hip * 0.92, B.hip, 0.17, 8), pants, [0, 0.03, 0], [1, 1, 0.68], [0, Math.PI / 8, 0], 'pelvis');
  add(hips, new THREE.CylinderGeometry(B.waist * 1.02, B.hip * 0.93, 0.045, 8), belt, [0, 0.105, 0], [1, 1, 0.7], [0, Math.PI / 8, 0], 'belt');
  add(spine, new THREE.CylinderGeometry(B.waist * 0.98, B.waist * 1.03, 0.22, 8), shirt, [0, 0.07, 0], [1, 1, 0.68], [0, Math.PI / 8, 0], 'abdomen');
  add(chest, new THREE.CylinderGeometry(B.chest, B.waist * 1.0, 0.33, 8), shirt, [0, 0.145, 0], [1, 1, 0.66], [0, Math.PI / 8, 0], 'ribcage');
  // upper-chest / trapezius wedge for a human shoulder line
  add(chest, new THREE.CylinderGeometry(0.075, B.chest * 0.95, 0.08, 8), shirt, [0, 0.31, 0], [1, 1, 0.6], [0, Math.PI / 8, 0], 'shoulder_line');
  if (o.build === 'feminine') {
    add(chest, new THREE.IcosahedronGeometry(0.052, 0), shirt, [0.065, 0.2, 0.082], [1, 0.95, 0.9], [0, 0, 0], 'bust_L');
    add(chest, new THREE.IcosahedronGeometry(0.052, 0), shirt, [-0.065, 0.2, 0.082], [1, 0.95, 0.9], [0, 0, 0], 'bust_R');
  }

  /* ----- neck & head ----- */
  add(neck, new THREE.CylinderGeometry(0.045, 0.052, 0.12, 7), skin, [0, 0.03, 0], [1, 1, 1], [0, 0, 0], 'neck_mesh');

  const cranium = add(head, new THREE.SphereGeometry(0.112, 10, 8), skin, [0, 0.105, -0.002], [0.9, 1.08, 1.0], [0, 0, 0], 'cranium');
  add(head, new THREE.CylinderGeometry(0.088, 0.044, 0.1, 7), skin, [0, 0.04, 0.014], [1, 1, 0.92], [0, Math.PI / 7, 0], 'jaw');
  add(head, new THREE.ConeGeometry(0.018, 0.048, 4), skin, [0, 0.09, 0.118], [1, 1, 1], [Math.PI / 2 + 0.25, 0, Math.PI / 4], 'nose');
  add(head, new THREE.IcosahedronGeometry(0.02, 0), skin, [0.098, 0.1, -0.005], [0.5, 1.2, 0.9], [0, 0, 0], 'ear_L');
  add(head, new THREE.IcosahedronGeometry(0.02, 0), skin, [-0.098, 0.1, -0.005], [0.5, 1.2, 0.9], [0, 0, 0], 'ear_R');
  for (const side of [1, -1]) {
    const tag = side > 0 ? 'L' : 'R';
    add(head, new THREE.BoxGeometry(0.034, 0.02, 0.01), eyeWhite, [side * 0.042, 0.12, 0.099], [1, 1, 1], [0, side * -0.25, 0], `eyeWhite_${tag}`);
    add(head, new THREE.BoxGeometry(0.017, 0.019, 0.01), eyeM, [side * 0.042, 0.12, 0.105], [1, 1, 1], [0, side * -0.25, 0], `eye_${tag}`);
    add(head, new THREE.BoxGeometry(0.05, 0.01, 0.014), hairM, [side * 0.044, 0.15, 0.1], [1, 1, 1], [0, side * -0.25, side * 0.08], `brow_${tag}`);
  }
  add(head, new THREE.BoxGeometry(0.046, 0.009, 0.01), lip, [0, 0.036, 0.1], [1, 1, 1], [0, 0, 0], 'mouth');

  /* ----- hair ----- */
  const hairCap = (r, phi = 0.44) => {
    add(head, new THREE.SphereGeometry(r, 10, 8, 0, TAU, 0, Math.PI * phi), hairM, [0, 0.112, -0.012], [0.93, 1.1, 1.06], [-0.1, 0, 0], 'hair_cap');
    // lower back/sides so the skull is covered behind the ears but the face stays open
    add(head, new THREE.SphereGeometry(r * 0.995, 10, 6, Math.PI * 0.9, Math.PI * 1.2, Math.PI * (phi - 0.02), Math.PI * 0.2), hairM, [0, 0.112, -0.012], [0.93, 1.1, 1.06], [-0.1, 0, 0], 'hair_nape');
  };
  if (o.hair === 'short') {
    hairCap(0.12, 0.44);
    add(head, new THREE.BoxGeometry(0.15, 0.03, 0.045), hairM, [0, 0.196, 0.078], [1, 1, 1], [0.45, 0, 0], 'hair_fringe');
  } else if (o.hair === 'long') {
    hairCap(0.12, 0.46);
    add(head, new THREE.BoxGeometry(0.15, 0.03, 0.045), hairM, [0, 0.196, 0.078], [1, 1, 1], [0.45, 0, 0], 'hair_fringe');
    add(head, new THREE.CylinderGeometry(0.1, 0.07, 0.3, 7), hairM, [0, -0.04, -0.075], [1.05, 1, 0.55], [0, 0, 0], 'hair_back');
    add(head, new THREE.BoxGeometry(0.03, 0.16, 0.08), hairM, [0.098, 0.06, -0.03], [1, 1, 1], [0, 0, 0], 'hair_side_L');
    add(head, new THREE.BoxGeometry(0.03, 0.16, 0.08), hairM, [-0.098, 0.06, -0.03], [1, 1, 1], [0, 0, 0], 'hair_side_R');
  } else if (o.hair === 'bun') {
    hairCap(0.12, 0.44);
    add(head, new THREE.BoxGeometry(0.15, 0.03, 0.045), hairM, [0, 0.196, 0.078], [1, 1, 1], [0.45, 0, 0], 'hair_fringe');
    add(head, new THREE.IcosahedronGeometry(0.062, 1), hairM, [0, 0.24, -0.07], [1, 1, 1], [0, 0, 0], 'hair_bun');
  }

  /* ----- arms ----- */
  const sleeveFull = o.sleeves === 'long';
  const sleeve = o.sleeves !== 'none';
  for (const [sh, el, wr, tag, side] of [
    [shoulderL, elbowL, wristL, 'L', 1], [shoulderR, elbowR, wristR, 'R', -1],
  ]) {
    add(sh, new THREE.IcosahedronGeometry(0.058, 1), sleeve ? shirt : skin, [0, 0, 0], [1, 1, 1], [0, 0, 0], `deltoid_${tag}`);
    limb(sh, 0.3, 0.05, 0.042, skin, 7, 0, `upperArm_${tag}`);
    limb(el, 0.27, 0.042, 0.031, skin, 7, 0, `foreArm_${tag}`);
    add(el, new THREE.IcosahedronGeometry(0.043, 0), skin, [0, 0, 0], [1, 1, 1], [0, 0, 0], `elbow_${tag}`);
    if (sleeve) limb(sh, sleeveFull ? 0.29 : 0.16, 0.054, sleeveFull ? 0.045 : 0.05, shirt, 7, 0, `sleeveUpper_${tag}`);
    if (sleeveFull) limb(el, 0.24, 0.045, 0.036, shirt, 7, 0, `sleeveFore_${tag}`);
    // hand: palm + fingers block + thumb
    add(wr, new THREE.BoxGeometry(0.075, 0.062, 0.034), skin, [0, -0.032, 0], [1, 1, 1], [0, 0, 0], `palm_${tag}`);
    add(wr, new THREE.BoxGeometry(0.07, 0.056, 0.026), skin, [0, -0.088, 0], [1, 1, 1], [0, 0, 0], `fingers_${tag}`);
    add(wr, new THREE.BoxGeometry(0.02, 0.05, 0.022), skin, [side * 0.04, -0.045, 0.01], [1, 1, 1], [0, 0, side * -0.4], `thumb_${tag}`);
  }

  /* ----- legs ----- */
  const shorts = o.legs === 'shorts';
  for (const [hp, kn, an, tag, side] of [
    [hipL, kneeL, ankleL, 'L', 1], [hipR, kneeR, ankleR, 'R', -1],
  ]) {
    limb(hp, 0.44, 0.088, 0.058, skin, 7, 0, `thigh_${tag}`);
    limb(kn, 0.42, 0.058, 0.04, skin, 7, 0, `shin_${tag}`);
    add(kn, new THREE.IcosahedronGeometry(0.056, 0), skin, [0, 0, 0], [1, 1, 1], [0, 0, 0], `knee_${tag}`);
    // calf bulge
    if (shorts) add(kn, new THREE.IcosahedronGeometry(0.048, 0), skin, [0, -0.1, -0.012], [1, 1.5, 1.05], [0, 0, 0], `calf_${tag}`);
    limb(hp, shorts ? 0.24 : 0.45, 0.094, shorts ? 0.082 : 0.063, pants, 7, 0.01, `pantsUpper_${tag}`);
    if (!shorts) {
      limb(kn, 0.4, 0.063, 0.046, pants, 7, 0.005, `pantsLower_${tag}`);
      add(kn, new THREE.IcosahedronGeometry(0.067, 0), pants, [0, 0, 0], [1, 1, 1], [0, 0, 0], `pantsKnee_${tag}`);
    }
    // shoe: ankle cuff, body, toe cap and sole
    add(an, new THREE.CylinderGeometry(0.046, 0.05, 0.05, 7), shoes, [0, 0.02, 0], [1, 1, 1], [0, 0, 0], `cuff_${tag}`);
    add(an, new THREE.BoxGeometry(0.105, 0.075, 0.21), shoes, [0, -0.005, 0.05], [1, 1, 1], [0, 0, 0], `shoe_${tag}`);
    add(an, new THREE.BoxGeometry(0.088, 0.045, 0.08), shoes, [0, -0.015, 0.16], [1, 1, 1], [0.15, 0, 0], `toe_${tag}`);
    add(an, new THREE.BoxGeometry(0.112, 0.022, 0.285), sole, [0, -0.04, 0.07], [1, 1, 1], [0, 0, 0], `sole_${tag}`);
  }

  head.scale.setScalar(1.1);

  /* ----- scale to exact height with feet on the ground ----- */
  const box = new THREE.Box3().setFromObject(body);
  body.scale.setScalar(o.height / (box.max.y - box.min.y));
  body.position.y = -box.min.y * body.scale.y;

  /* ----- runtime ----- */
  const joints = { hips, spine, chest, neck, head, shoulderL, elbowL, shoulderR, elbowR, hipL, kneeL, ankleL, hipR, kneeR, ankleR };
  const current = {};
  JOINTS.forEach((k) => { current[k] = [0, 0, 0]; });
  let hipsYNow = 0;
  const state = { name: 'idle', time: 0, speed: 1, snap: true };

  const apply = (pose, k) => {
    for (const name of JOINTS) {
      const c = current[name], tg = pose.joints[name];
      for (let i = 0; i < 3; i++) c[i] += (tg[i] - c[i]) * k;
      joints[name].rotation.set(c[0], c[1], c[2]);
    }
    hipsYNow += (pose.hipsY - hipsYNow) * k;
    hips.position.y = HIP_Y + hipsYNow;
  };

  const api = {
    root,
    joints,
    materials,
    options: o,
    animations: ANIMATIONS,
    /** Switch animation. `blend` = seconds of smoothing (0 = instant). */
    play(name, { speed = 1, blend = 0.12 } = {}) {
      if (!CLIP_PERIODS[name]) throw new Error(`Unknown animation "${name}". Use: ${ANIMATIONS.join(', ')}`);
      if (state.name !== name) state.time = 0;
      state.name = name; state.speed = speed; state.blend = blend;
    },
    /** Advance the animation by dt seconds (clamp dt to ~0.1 in your game loop). */
    update(dt) {
      state.time += dt * state.speed;
      const pose = getPose(state.name, state.time);
      const b = state.blend ?? 0.12;
      apply(pose, state.snap || b <= 0 ? 1 : 1 - Math.exp(-dt / b));
      state.snap = false;
    },
    /** Recolor at runtime: setColors({ shirt:'#f00', skin:'#8d5524', hairColor:'#111' }). */
    setColors(c) {
      const map = { skin: 'skin', hairColor: 'hair', shirt: 'shirt', pants: 'pants', shoes: 'shoes', belt: 'belt', eyeColor: 'eye' };
      for (const [key, matKey] of Object.entries(map)) if (c[key]) materials[matKey].color.set(c[key]);
      if (c.skin) lip.color.set(c.skin).multiplyScalar(0.62);
    },
    /** Free GPU memory when you remove the character. */
    dispose() {
      root.traverse((n) => { if (n.isMesh) n.geometry.dispose(); });
      Object.values(materials).forEach((m) => m.dispose());
    },
    triangleCount() {
      let n = 0;
      root.traverse((m) => { if (m.isMesh) n += m.geometry.attributes.position.count / 3; });
      return n;
    },
    /** Build THREE.AnimationClips (idle/walk/run/wave/jump) for AnimationMixer or GLB export. */
    buildClips(fps = 30) {
      return ANIMATIONS.map((name) => {
        const period = CLIP_PERIODS[name];
        const frames = Math.round(period * fps);
        const times = [], quats = {}, ys = [];
        JOINTS.forEach((k) => { quats[k] = []; });
        const q = new THREE.Quaternion(), e = new THREE.Euler();
        for (let f = 0; f <= frames; f++) {
          const t = (f / frames) * period;
          const pose = getPose(name, t);
          times.push(t);
          JOINTS.forEach((k) => {
            e.set(...pose.joints[k]);
            q.setFromEuler(e);
            quats[k].push(q.x, q.y, q.z, q.w);
          });
          ys.push(0, HIP_Y + pose.hipsY, 0);
        }
        const tracks = JOINTS.map((k) => new THREE.QuaternionKeyframeTrack(`${k}.quaternion`, times, quats[k]));
        tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, ys));
        return new THREE.AnimationClip(name, period, tracks);
      });
    },
  };

  api.play('idle');
  api.update(0);
  return api;
}
