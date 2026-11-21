// Blocky character rig (chef and customer share it) built with the pivot-group pattern:
// every swinging part hangs from a pivot placed exactly on the joint.
// The rig faces +Z at rotation.y = 0.
import { damp, dampAngle, easeOutBack } from './mathutils.js';

const THREE = window.THREE;

const matCache = new Map();
function mat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
}
const geoCache = new Map();
function boxGeo(w, h, d) {
  const k = w + ',' + h + ',' + d;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}
function addBox(parent, w, h, d, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(boxGeo(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  parent.add(m);
  return m;
}

const DEFAULTS = {
  skin: 0xffdbac, shirt: 0xfff3e0, apron: 0xa8e6cf, hatColor: 0xffffff, hair: 0x5c3d2e,
  pants: 0x4a4e69, shoe: 0x3a3a4a, cheek: 0xffb3c1,
  hat: true, bun: true, apronOn: true, spatula: true, scale: 0.85,
};

export function createCharacter(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const root = new THREE.Group();
  root.scale.setScalar(o.scale);

  // Materials that must be recolorable are unique; the rest are shared.
  const apronMat = new THREE.MeshLambertMaterial({ color: o.apron });
  const hatMat = new THREE.MeshLambertMaterial({ color: o.hatColor });

  // --- Torso (pivot for breathing, bounce and both arms). Hip height = 0.7 so legs meet the body.
  const torso = new THREE.Group();
  torso.position.y = 0.7;
  root.add(torso);

  addBox(torso, 0.6, 0.7, 0.4, mat(o.shirt), 0, 0.35, 0);
  if (o.apronOn) {
    addBox(torso, 0.5, 0.46, 0.05, apronMat, 0, 0.27, 0.22);
    addBox(torso, 0.3, 0.2, 0.05, apronMat, 0, 0.6, 0.22);
    addBox(torso, 0.14, 0.1, 0.05, apronMat, -0.1, 0.38, -0.22); // bow, back
    addBox(torso, 0.14, 0.1, 0.05, apronMat, 0.1, 0.38, -0.22);
    addBox(torso, 0.06, 0.06, 0.06, apronMat, 0, 0.38, -0.22);
  }

  // --- Head: 0.5 cube, face on the +Z side.
  const head = new THREE.Group();
  head.position.y = 0.95;
  torso.add(head);
  addBox(head, 0.5, 0.5, 0.5, mat(o.skin), 0, 0, 0);
  addBox(head, 0.54, 0.12, 0.54, mat(o.hair), 0, 0.22, 0); // hair cap
  addBox(head, 0.54, 0.4, 0.1, mat(o.hair), 0, -0.02, -0.22); // back hair
  addBox(head, 0.52, 0.1, 0.06, mat(o.hair), 0, 0.15, 0.25); // bangs
  const eyeMat = mat(0x2d2a32);
  const eyeL = addBox(head, 0.07, 0.11, 0.02, eyeMat, -0.12, 0.0, 0.255, false);
  const eyeR = addBox(head, 0.07, 0.11, 0.02, eyeMat, 0.12, 0.0, 0.255, false);
  addBox(head, 0.1, 0.06, 0.02, mat(o.cheek), -0.18, -0.09, 0.255, false);
  addBox(head, 0.1, 0.06, 0.02, mat(o.cheek), 0.18, -0.09, 0.255, false);
  addBox(head, 0.08, 0.02, 0.02, mat(0xb5524a), 0, -0.13, 0.255, false); // mouth
  if (o.bun) {
    // Side bun: 4 small cubes.
    const hairM = mat(o.hair);
    for (const [y, z] of [[0.05, -0.1], [0.05, 0.02], [0.17, -0.1], [0.17, 0.02]]) {
      addBox(head, 0.12, 0.12, 0.12, hairM, -0.34, y, z);
    }
  }
  if (o.hat) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.14, 10), hatMat);
    base.position.y = 0.34;
    base.castShadow = true;
    head.add(base);
    addBox(head, 0.46, 0.2, 0.46, hatMat, 0, 0.5, 0);
    addBox(head, 0.26, 0.2, 0.26, hatMat, -0.1, 0.7, 0.04);
    addBox(head, 0.24, 0.2, 0.24, hatMat, 0.12, 0.68, -0.02);
  }

  // --- Arms: shoulder pivots, mesh offset down so rotation is around the shoulder.
  function makeArm(x) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.62, 0);
    torso.add(pivot);
    addBox(pivot, 0.18, 0.2, 0.18, mat(o.shirt), 0, -0.08, 0);
    addBox(pivot, 0.16, 0.3, 0.16, mat(o.skin), 0, -0.33, 0);
    return pivot;
  }
  const leftArm = makeArm(-0.38);
  const rightArm = makeArm(0.38);

  let spatula = null;
  if (o.spatula) {
    spatula = new THREE.Group();
    addBox(spatula, 0.05, 0.4, 0.05, mat(0x8b5a2b), 0, 0, 0);
    addBox(spatula, 0.16, 0.14, 0.02, mat(0xf4f1ea), 0, -0.25, 0);
    spatula.position.set(0, -0.46, 0.1);
    spatula.rotation.x = Math.PI / 3;
    rightArm.add(spatula);
  }

  // Where a plate is held while walking.
  const carryAnchor = new THREE.Group();
  carryAnchor.position.set(0, 0.3, 0.55);
  torso.add(carryAnchor);

  // --- Legs: hip pivots on the root.
  function makeLeg(x) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.7, 0);
    root.add(pivot);
    addBox(pivot, 0.2, 0.62, 0.2, mat(o.pants), 0, -0.31, 0);
    addBox(pivot, 0.22, 0.08, 0.3, mat(o.shoe), 0, -0.66, 0.04);
    return pivot;
  }
  const leftLeg = makeLeg(-0.16);
  const rightLeg = makeLeg(0.16);

  // --- Animation state --------------------------------------------------------------------
  const J = { y: 0, lax: 0, laz: 0, rax: 0, raz: 0, llx: 0, rlx: 0 };
  let pose = 'idle', poseT = 0, time = Math.random() * 10, walkPhase = 0, carrying = false;

  function setPose(p) {
    if (p !== pose) { pose = p; poseT = 0; }
  }
  const getPose = () => pose;
  function setCarrying(v) { carrying = !!v; }

  function update(dt) {
    time += dt;
    poseT += dt;
    let y = 0, lax = 0, laz = -0.05, rax = 0, raz = 0.05, llx = 0, rlx = 0, rate = 10;

    switch (pose) {
      case 'walk': {
        if (walkPhase === 0) walkPhase = 0.01;
        walkPhase += dt * 12;
        const c = Math.sin(walkPhase);
        y = Math.abs(Math.cos(walkPhase)) * 0.05;
        llx = c * 0.55; rlx = -c * 0.55;
        if (carrying) { lax = -0.75; rax = -0.75; } else { lax = -c * 0.45; rax = c * 0.45; }
        break;
      }
      case 'sautee': { // beat 1: fast toss
        const b = Math.sin(poseT * 20);
        y = Math.abs(b) * 0.06;
        rax = -0.9 + b * 0.45; lax = -0.4 - b * 0.2;
        rate = 18;
        break;
      }
      case 'stir': { // beat 2: circular stir
        const a = poseT * 7.5;
        rax = -0.85 + Math.sin(a) * 0.25; raz = Math.cos(a) * 0.25;
        lax = -0.3;
        y = Math.sin(time * 6) * 0.025;
        rate = 14;
        break;
      }
      case 'plate':
        lax = -0.5; rax = -0.5; y = 0;
        break;
      case 'cheer': {
        const jump = poseT < 0.55 ? Math.sin((poseT / 0.55) * Math.PI) : 0;
        y = jump * 0.14 + (poseT >= 0.55 ? Math.abs(Math.sin(time * 8)) * 0.03 : 0);
        lax = -2.1 + Math.sin(time * 10) * 0.15;
        rax = -2.1 - Math.sin(time * 10) * 0.15;
        rate = 8;
        break;
      }
      default: { // idle
        y = Math.sin(time * 3) * 0.03;
        if (carrying) { lax = -0.75; rax = -0.75; }
        else { lax = Math.sin(time * 2.5) * 0.08; rax = -Math.sin(time * 2.5) * 0.08; }
      }
    }

    J.y = damp(J.y, y, rate, dt);
    J.lax = damp(J.lax, lax, rate, dt); J.rax = damp(J.rax, rax, rate, dt);
    J.laz = damp(J.laz, laz, rate, dt); J.raz = damp(J.raz, raz, rate, dt);
    J.llx = damp(J.llx, llx, 12, dt); J.rlx = damp(J.rlx, rlx, 12, dt);

    torso.position.y = 0.7 + J.y;
    leftArm.rotation.x = J.lax; leftArm.rotation.z = J.laz;
    rightArm.rotation.x = J.rax; rightArm.rotation.z = J.raz;
    leftLeg.rotation.x = J.llx; rightLeg.rotation.x = J.rlx;
    if (spatula) spatula.visible = !carrying && pose !== 'cheer' && pose !== 'walk';

    const blink = time % 3.4 < 0.12 ? 0.1 : 1;
    eyeL.scale.y = blink; eyeR.scale.y = blink;
  }

  // Walk toward a point (x/z only). Returns true when arrived. The caller picks the next pose.
  function moveToward(target, speed, dt, arrive = 0.06) {
    const dx = target.x - root.position.x, dz = target.z - root.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= arrive) return true;
    const step = Math.min(speed * dt, dist);
    root.position.x += (dx / dist) * step;
    root.position.z += (dz / dist) * step;
    root.rotation.y = dampAngle(root.rotation.y, Math.atan2(dx, dz), 12, dt);
    setPose('walk');
    return false;
  }
  function faceToward(point, dt, rate = 10) {
    root.rotation.y = dampAngle(
      root.rotation.y, Math.atan2(point.x - root.position.x, point.z - root.position.z), rate, dt);
  }

  return {
    root, torso, head, leftArm, rightArm, leftLeg, rightLeg, carryAnchor, spatula,
    mats: { apron: apronMat, hat: hatMat },
    update, setPose, getPose, setCarrying, moveToward, faceToward, easeOutBack,
  };
}
