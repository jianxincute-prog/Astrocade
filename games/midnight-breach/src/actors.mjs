import { T } from './three-loader.mjs';

// Low-poly characters with real faces. Each rigid body part (head, torso, arms, legs, eyes) is
// baked into ONE vertex-coloured mesh, so a character costs only ~9 draw calls.
//
// makeCharacter({ ...look }) -> Group with:
//   userData.walk(t, speed)   walk/idle animation, blinking, breathing (call every frame)
//   userData.look(yawRel)     turn the head towards a yaw relative to the body (radians)
//   userData.setTalking(bool) moves the mouth while true

const v3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const shade = (hex, f) => new T.Color(hex).multiplyScalar(f);

/** Collects primitives and bakes them into one vertex-coloured BufferGeometry. */
class Parts {
  constructor() { this.items = []; }
  add(geo, color, t = {}) { this.items.push({ geo, color, t }); return this; }
  sphere(r, color, t) { return this.add(new T.SphereGeometry(r, 12, 9), color, t); }
  box(w, h, d, color, t) { return this.add(new T.BoxGeometry(w, h, d), color, t); }
  cyl(rt, rb, h, color, t, seg = 10) { return this.add(new T.CylinderGeometry(rt, rb, h, seg), color, t); }
  cone(r, h, color, t, seg = 4) { return this.add(new T.ConeGeometry(r, h, seg), color, t); }
  capsule(r, len, color, t) { return this.add(new T.CapsuleGeometry(r, len, 3, 8), color, t); }
  bake() {
    const pos = [], nor = [], col = [];
    for (const { geo, color, t } of this.items) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      const m = new T.Matrix4().compose(
        v3(t.x, t.y, t.z),
        new T.Quaternion().setFromEuler(new T.Euler(t.rx || 0, t.ry || 0, t.rz || 0)),
        v3(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1),
      );
      g.applyMatrix4(m);
      const p = g.getAttribute('position').array;
      pos.push(p); nor.push(g.getAttribute('normal').array);
      const c = new T.Color(color), arr = new Float32Array(p.length);
      for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; }
      col.push(arr);
      g.dispose(); geo.dispose();
    }
    const total = pos.reduce((n, a) => n + a.length, 0);
    const P = new Float32Array(total), N = new Float32Array(total), C = new Float32Array(total);
    let o = 0;
    for (let i = 0; i < pos.length; i++) { P.set(pos[i], o); N.set(nor[i], o); C.set(col[i], o); o += pos[i].length; }
    const geom = new T.BufferGeometry();
    geom.setAttribute('position', new T.BufferAttribute(P, 3));
    geom.setAttribute('normal', new T.BufferAttribute(N, 3));
    geom.setAttribute('color', new T.BufferAttribute(C, 3));
    return geom;
  }
}

let sharedMat = null;
function material(ghost) {
  if (ghost) {
    return new T.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: T.DoubleSide, transparent: true, opacity: 0.84, emissive: 0x3a2a66 });
  }
  sharedMat ||= new T.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: T.DoubleSide });
  return sharedMat;
}

const HEAD_Y = 1.3;

export function makeCharacter(opts = {}) {
  const o = {
    skin: 0xe8b894, hair: 0x1c1620, hairStyle: 'short',
    shirt: 0x4a6cd4, pants: 0x2b2f4a, shoes: 0x1d1d26, belt: 0x2a2218, accent: 0xd8c070,
    outfit: 'tee', eye: 0x3a2a1c, lip: 0xb4565a, blush: 0xea9a8c,
    ghost: false, sad: false, mustache: false, belly: 0, seed: Math.random() * 10,
    ...opts,
  };
  const mat = material(o.ghost);
  const root = new T.Group();
  root.scale.setScalar(1.12);
  const skinDark = shade(o.skin, 0.86);
  const browColor = shade(o.hair, 0.8);
  const mesh = (parts, x = 0, y = 0, z = 0) => {
    const m = new T.Mesh(parts.bake(), mat);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  };

  // ---------------- Head: skull, hair, ears, brows, nose, mouth, cheeks ----------------
  const head = new Parts();
  head.sphere(0.32, o.skin, { sy: 0.97, sz: 0.97 });
  for (const s of [-1, 1]) {
    head.sphere(0.06, skinDark, { x: s * 0.318, y: -0.01, sx: 0.45, sy: 1, sz: 0.75 });                  // ears
    head.sphere(0.045, new T.Color(o.skin).lerp(new T.Color(o.blush), 0.55), { x: s * 0.185, y: -0.1, z: 0.248, sx: 1, sy: 0.62, sz: 0.28 }); // cheeks
    head.box(0.095, 0.02, 0.022, browColor, { x: s * 0.115, y: 0.115, z: 0.287, rz: s * (o.sad ? -0.3 : -0.08), rx: -0.2 }); // brows (inner ends up = gentle)
    head.box(0.032, 0.012, 0.016, o.lip, { x: s * 0.043, y: -0.146, z: 0.292, rz: s * 0.35 });             // smile corners
  }
  head.sphere(0.036, shade(o.skin, 0.96), { y: -0.06, z: 0.3, sx: 1.0, sy: 1.15, sz: 0.9 });            // nose
  head.box(0.07, 0.014, 0.016, shade(o.lip, 0.8), { y: -0.157, z: 0.298 });                               // mouth line
  head.box(0.04, 0.012, 0.014, o.lip, { y: -0.175, z: 0.293 });                                          // lower lip
  if (o.mustache) head.box(0.16, 0.035, 0.03, shade(o.hair, 0.9), { y: -0.108, z: 0.304 });

  const hair = o.hair;
  const dome = (r, theta, tilt, y, z) => head.add(new T.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, theta), hair, { y, z, rx: -tilt });
  if (o.hairStyle === 'short') {
    dome(0.345, Math.PI * 0.58, 0.5, 0.015, -0.015);
    head.box(0.14, 0.07, 0.07, hair, { x: -0.12, y: 0.215, z: 0.27, rz: 0.3, rx: -0.5 });
    head.box(0.16, 0.07, 0.07, hair, { x: 0.0, y: 0.235, z: 0.285, rx: -0.55 });
    head.box(0.14, 0.07, 0.07, hair, { x: 0.12, y: 0.215, z: 0.27, rz: -0.3, rx: -0.5 });
    head.box(0.06, 0.14, 0.12, hair, { x: -0.315, y: 0.1, z: 0.03 }); head.box(0.06, 0.14, 0.12, hair, { x: 0.315, y: 0.1, z: 0.03 });
  } else if (o.hairStyle === 'long') {
    dome(0.348, Math.PI * 0.6, 0.45, 0.012, -0.02);
    head.box(0.66, 0.72, 0.13, hair, { y: -0.27, z: -0.27 });                                         // back curtain
    head.box(0.08, 0.55, 0.22, hair, { x: -0.335, y: -0.12, z: 0.02 }); head.box(0.08, 0.55, 0.22, hair, { x: 0.335, y: -0.12, z: 0.02 });
    head.box(0.34, 0.08, 0.07, hair, { x: -0.1, y: 0.225, z: 0.275, rz: 0.35, rx: -0.5 });
    head.box(0.26, 0.08, 0.07, hair, { x: 0.13, y: 0.23, z: 0.275, rz: -0.25, rx: -0.5 });
  } else if (o.hairStyle === 'hijab') {
    // hood open at the front + drape under the chin
    head.add(new T.SphereGeometry(0.385, 16, 12, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.78), hair, { y: 0.0, z: -0.04 });
    head.box(0.05, 0.32, 0.2, hair, { x: -0.322, y: -0.12, z: 0.02 }); head.box(0.05, 0.32, 0.2, hair, { x: 0.322, y: -0.12, z: 0.02 });
    head.box(0.5, 0.2, 0.18, hair, { y: -0.3, z: -0.02, rx: 0.25 });
  } else if (o.hairStyle === 'grey') {
    dome(0.338, Math.PI * 0.46, 0.75, 0.0, -0.03);
    head.box(0.07, 0.2, 0.2, hair, { x: -0.31, y: 0.02, z: -0.05 }); head.box(0.07, 0.2, 0.2, hair, { x: 0.31, y: 0.02, z: -0.05 });
  }
  if (o.glasses) {
    for (const s of [-1, 1]) head.add(new T.TorusGeometry(0.07, 0.01, 5, 10), 0x2a2a30, { x: s * 0.115, y: 0.02, z: 0.31 });
    head.box(0.06, 0.012, 0.012, 0x2a2a30, { y: 0.03, z: 0.31 });
  }
  const headMesh = mesh(head);
  headMesh.position.set(0, HEAD_Y, 0);
  const eyeY = 0.02, eyeZ = 0.296, eyeX = 0.115;
  const makeEye = side => {
    const p = new Parts();
    p.sphere(0.056, 0xf4f4f0, { sy: 1.12, sz: 0.45 });
    p.sphere(0.042, o.eye, { z: 0.012, sy: 1.08, sz: 0.5 });
    p.sphere(0.024, 0x0a0a0e, { z: 0.023, sy: 1.08, sz: 0.5 });
    p.sphere(0.012, 0xffffff, { x: 0.014, y: 0.02, z: 0.032, sz: 0.5 });
    if (o.sad) p.sphere(0.008, 0xbfe6ff, { x: -0.03 * side, y: -0.05, z: 0.03, sz: 0.5 });
    const m = new T.Mesh(p.bake(), mat);
    m.position.set(side * eyeX, eyeY, eyeZ);
    headMesh.add(m);
    return m;
  };
  const eyeL = makeEye(-1), eyeR = makeEye(1);
  const mouthOpen = new T.Mesh(new Parts().sphere(0.034, 0x4a1a22, { sy: 0.75, sz: 0.4 }).bake(), mat);
  mouthOpen.position.set(0, -0.166, 0.298);
  mouthOpen.scale.y = 0.001;
  headMesh.add(mouthOpen);

  // ---------------- Torso: neck, shirt, collar, belt, outfit details ----------------
  const torso = new Parts();
  torso.cyl(0.075, 0.09, 0.12, o.skin, { y: 1.0 }, 8);                                                  // neck
  torso.cyl(0.215, 0.19, 0.5, o.shirt, { y: 0.72, sz: 0.68 }, 10);
  torso.cyl(0.19, 0.2, 0.14, o.outfit === 'singlet' ? o.pants : o.pants, { y: 0.45, sz: 0.7 }, 10);
  if (o.outfit === 'jacket') {
    torso.box(0.03, 0.46, 0.02, shade(o.shirt, 1.35), { y: 0.72, z: 0.15 });                           // zipper
    torso.box(0.1, 0.05, 0.06, shade(o.shirt, 0.78), { x: -0.07, y: 0.96, z: 0.12, rz: 0.5 });          // collar
    torso.box(0.1, 0.05, 0.06, shade(o.shirt, 0.78), { x: 0.07, y: 0.96, z: 0.12, rz: -0.5 });
    torso.box(0.3, 0.12, 0.12, shade(o.shirt, 0.82), { y: 0.95, z: -0.13 });                            // hood
    torso.box(0.11, 0.1, 0.03, shade(o.shirt, 0.82), { x: -0.11, y: 0.55, z: 0.14 }); torso.box(0.11, 0.1, 0.03, shade(o.shirt, 0.82), { x: 0.11, y: 0.55, z: 0.14 });
    torso.cyl(0.205, 0.205, 0.04, shade(o.shirt, 0.7), { y: 0.48, sz: 0.7 }, 10);                       // hem
  } else if (o.outfit === 'cardigan') {
    torso.box(0.04, 0.48, 0.02, shade(o.shirt, 0.75), { y: 0.72, z: 0.15 });
    torso.box(0.28, 0.2, 0.02, 0xf4eee6, { y: 0.85, z: 0.145 });                                        // inner tee
    torso.cyl(0.2, 0.2, 0.05, shade(o.shirt, 0.8), { y: 0.47, sz: 0.7 }, 10);
    for (const y of [0.78, 0.66, 0.54]) torso.sphere(0.018, o.accent, { y, z: 0.158 });                 // buttons
  } else if (o.outfit === 'dress') {
    torso.cyl(0.2, 0.34, 0.52, o.pants, { y: 0.31, sz: 0.82 }, 14);                                      // long skirt
    torso.cyl(0.215, 0.21, 0.06, shade(o.shirt, 1.2), { y: 0.62, sz: 0.7 }, 10);
    for (const [dx, dy, dz] of [[-0.12, 0.3, 0.27], [0.1, 0.22, 0.29], [0.0, 0.4, 0.22], [-0.2, 0.18, 0.2], [0.2, 0.34, 0.2], [0.06, 0.12, 0.3]]) torso.sphere(0.03, o.accent, { x: dx, y: dy, z: dz, sz: 0.5 }); // floral print
    torso.cyl(0.26, 0.26, 0.2, o.shirt, { y: 0.86, sz: 0.8 }, 12);                                       // shoulder drape (hijab)
  } else if (o.outfit === 'singlet') {
    torso.sphere(0.24, o.shirt, { y: 0.62, z: 0.04, sy: 0.9, sz: 0.85 });                                // belly
    torso.cyl(0.255, 0.32, 0.4, o.pants, { y: 0.3, sz: 0.85 }, 12);                                      // sarong
    torso.box(0.5, 0.05, 0.12, shade(o.pants, 0.7), { y: 0.5, z: 0.2 });
    for (const x of [-0.12, 0, 0.12]) torso.box(0.025, 0.36, 0.02, shade(o.pants, 1.3), { x, y: 0.3, z: 0.275 }); // plaid stripes
    torso.box(0.06, 0.22, 0.03, o.shirt, { x: -0.1, y: 0.95, z: 0.1 }); torso.box(0.06, 0.22, 0.03, o.shirt, { x: 0.1, y: 0.95, z: 0.1 });
  } else {
    torso.box(0.2, 0.05, 0.05, shade(o.shirt, 1.2), { y: 0.96, z: 0.11 });
  }
  if (o.outfit !== 'dress' && o.outfit !== 'singlet') {
    torso.cyl(0.2, 0.2, 0.045, o.belt, { y: 0.5, sz: 0.7 }, 10);
    torso.box(0.06, 0.05, 0.02, o.accent, { y: 0.5, z: 0.145 });                                        // buckle
  }
  const torsoMesh = mesh(torso);

  // ---------------- Arms and legs (pivots at shoulder / hip) ----------------
  const sleeveSkin = o.outfit === 'singlet';
  const arm = side => {
    const p = new Parts();
    p.capsule(0.07, 0.24, sleeveSkin ? o.skin : o.shirt, { y: -0.17 });
    if (!sleeveSkin) p.cyl(0.078, 0.078, 0.05, shade(o.shirt, 0.8), { y: -0.3 }, 8);                      // cuff
    p.sphere(0.066, o.skin, { y: -0.4 });                                                                 // hand
    p.sphere(0.028, o.skin, { x: side * 0.02, y: -0.44, z: 0.04 });                                       // thumb
    const pivot = new T.Group();
    pivot.position.set(side * 0.325, 0.99, 0);
    pivot.add(new T.Mesh(p.bake(), mat));
    root.add(pivot);
    return pivot;
  };
  const leg = side => {
    const p = new Parts();
    const legColor = o.outfit === 'dress' || o.outfit === 'singlet' ? o.skin : o.pants;
    p.cyl(0.088, 0.076, 0.42, legColor, { y: -0.2 }, 8);
    p.box(0.17, 0.1, 0.27, o.shoes, { y: -0.44, z: 0.045 });                                              // shoe
    p.box(0.175, 0.03, 0.28, shade(o.shoes, 0.55), { y: -0.485, z: 0.045 });                              // sole
    const pivot = new T.Group();
    pivot.position.set(side * 0.125, 0.5, 0);
    pivot.add(new T.Mesh(p.bake(), mat));
    root.add(pivot);
    return pivot;
  };
  const armL = arm(-1), armR = arm(1), legL = leg(-1), legR = leg(1);

  // ---------------- Animation ----------------
  const state = { lastT: 0, talk: 0, talking: false, lookYaw: 0, headYaw: 0 };
  const eyeBase = { y: eyeL.scale.y };
  root.userData.walk = (t, speed = 0) => {
    const dt = Math.min(0.1, Math.max(0, t - state.lastT)); state.lastT = t;
    const k = Math.min(1, speed);
    const s = Math.sin(t * 11) * k * 0.85;
    legL.rotation.x = s; legR.rotation.x = -s;
    armL.rotation.x = -s * 0.9; armR.rotation.x = s * 0.9;
    const breathe = Math.sin(t * 2 + o.seed) * 0.012;
    const bob = Math.abs(Math.sin(t * 11)) * 0.035 * k;
    torsoMesh.position.y = bob + breathe;
    headMesh.position.y = HEAD_Y + bob + breathe * 1.3;
    armL.position.y = armR.position.y = 0.99 + bob * 0.6 + breathe;
    // blink every ~3.6 s
    const cyc = (t * 0.28 + o.seed * 0.37) % 1;
    const blink = cyc > 0.955 ? 0.1 : 1;
    eyeL.scale.y = eyeR.scale.y = eyeBase.y * blink;
    // head turn towards the look target (smoothed)
    state.headYaw += (state.lookYaw - state.headYaw) * Math.min(1, dt * 6);
    headMesh.rotation.y = state.headYaw;
    headMesh.rotation.z = Math.sin(t * 1.3 + o.seed) * 0.02;
    // mouth moves while talking
    state.talk += ((state.talking ? 1 : 0) - state.talk) * Math.min(1, dt * 12);
    mouthOpen.scale.y = state.talk > 0.05 ? Math.max(0.05, state.talk * (0.25 + 0.75 * Math.abs(Math.sin(t * 13 + o.seed)))) : 0.001;
  };
  root.userData.look = yawRel => { state.lookYaw = Math.max(-0.9, Math.min(0.9, yawRel)); };
  root.userData.setTalking = v => { state.talking = !!v; };
  root.userData.parts = { head: headMesh, torso: torsoMesh, armL, armR, legL, legR };
  return root;
}

// Ready-made looks for the cast.
export const LOOKS = {
  player: { skin: 0xe9bb98, hair: 0x15121a, hairStyle: 'short', shirt: 0x3fa6c4, pants: 0x2b3050, shoes: 0xf0f0f4, outfit: 'jacket', eye: 0x3a2a1c, accent: 0xe8d070 },
  rani: { skin: 0xf0c8aa, hair: 0x2a1a20, hairStyle: 'long', shirt: 0xe07a82, pants: 0x3a3454, shoes: 0x2a2028, outfit: 'cardigan', eye: 0x5a3a2a, ghost: true, sad: true, accent: 0xf4e0b0 },
  wati: { skin: 0xd9a784, hair: 0x6a3a5a, hairStyle: 'hijab', shirt: 0xd070a0, pants: 0x9a4a7a, shoes: 0xe8d8c0, outfit: 'dress', eye: 0x3a2418, accent: 0xf8e0f0, lip: 0xa04a50 },
  darto: { skin: 0xc9966e, hair: 0xb8b8bc, hairStyle: 'grey', shirt: 0xf2f2f0, pants: 0x3a5a8a, shoes: 0x6a4a2a, outfit: 'singlet', eye: 0x2a2018, mustache: true, belly: 1, glasses: true, lip: 0x8a4a46 },
};
