// Detailed stylized-realistic skater (procedural, no external assets).
// Rig: root(feet) > body(fall pivot) > hips > [legs: thigh > knee > ankle(boot+blade)] + spine > [torso, arms: shoulder > elbow > wrist, neck > head].
// Limbs are tapered capsules that overlap at the joints, so shoulders/hips/knees/elbows blend with no gaps.
import { clamp, lerp } from './util.js';
import * as TX from './textures.js';
const T = THREE;

const PRESETS = {
  male: {
    label: 'Male', scale: 1.0,
    skin: 0xdcaa86,
    head: { rx: 0.079, ry: 0.116, rz: 0.099, jawTaper: 0.2, jawPow: 2.0, jawSquare: 0.14, flatChin: 0.5, cheek: 0.055, crown: 0.86, cranium: 0.07, brow: 0.011, chin: 0.011, socket: 0.0035, noseTip: 0.0165, noseW: 0.0118, hw: 0.0245 },
    eye: { r: 0.0138, x: 0.0328, y: 0.008, iris: 0x6a96b4, ring: 0x1f3442, tilt: 0.42 },
    brow: { color: 0x2a1c15, w: 0.0078, arch: 0.0035, y: 0.034 },
    lips: { color: 0xb07468, full: 0.82 },
    stubble: true, blush: 0,
    shoulderX: 0.208, hipX: 0.094,
    torso: [[-0.1, 0.0012], [-0.085, 0.145], [-0.02, 0.168], [0.08, 0.152], [0.2, 0.168], [0.33, 0.188], [0.45, 0.174], [0.52, 0.138], [0.57, 0.078], [0.605, 0.001]],
    torsoZ: 0.66,
    jacket: 0x2a6f93, scarf: 0xe3a53a, pants: 0x232838, boot: 0x1b1c21, laces: 0xf0f0f0, glove: 0x2c2f38, cuff: 0x1f2430, bootAccent: 0xd8553b,
    glasses: false, hair: null,
  },
  female: {
    label: 'Female', scale: 0.945,
    skin: 0xf0c6aa,
    head: { rx: 0.073, ry: 0.113, rz: 0.094, jawTaper: 0.36, jawPow: 1.35, jawSquare: 0, cheek: 0.03, crown: 0.92, cranium: 0.04, brow: 0.003, chin: 0.004, socket: 0.003, noseTip: 0.0125, noseW: 0.0095, hw: 0.0228 },
    eye: { r: 0.0148, x: 0.0308, y: 0.011, iris: 0x8a5a32, ring: 0x2a170c, tilt: 0.34 },
    brow: { color: 0x2b1a16, w: 0.0042, arch: 0.0055, y: 0.036 },
    lips: { color: 0xc4666b, full: 0.98 },
    stubble: false, blush: 1,
    shoulderX: 0.178, hipX: 0.1,
    torso: [[-0.1, 0.0012], [-0.085, 0.146], [-0.02, 0.172], [0.08, 0.136], [0.2, 0.15], [0.33, 0.165], [0.45, 0.15], [0.52, 0.118], [0.57, 0.07], [0.605, 0.001]],
    torsoZ: 0.7,
    jacket: 0xe0675f, scarf: 0xf1e8d6, pants: 0x2d3042, boot: 0xf2efeb, laces: 0xe6a1ad, glove: 0xf1e8d6, cuff: 0xc9544e, bootAccent: 0xe6a1ad,
    glasses: true, hair: { color: 0x2d1c17 },
  },
};
export const CHARACTERS = Object.keys(PRESETS);
export const characterLabel = (k) => PRESETS[k].label;

const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };

// Tapered capsule hanging down -y from its pivot (top cap centred on the pivot).
function limb(len, r0, r1, mat, seg = 16) {
  const pts = [], n = 6;
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI / 2; pts.push(new T.Vector2(Math.max(0.0001, r1 * Math.cos(a)), -len + r1 * Math.sin(a))); }
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push(new T.Vector2(Math.max(0.0001, r0 * Math.cos(a)), r0 * Math.sin(a))); }
  return new T.Mesh(new T.LatheGeometry(pts, seg), mat);
}
function mk(geo, mat, x = 0, y = 0, z = 0) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); return m; }
function ell(r, sx, sy, sz, mat, x, y, z, w = 14, h = 10) { const m = mk(new T.SphereGeometry(r, w, h), mat, x, y, z); m.scale.set(sx, sy, sz); return m; }
function surfaceFn(mesh) {
  mesh.updateMatrixWorld(true);
  const rc = new T.Raycaster(), o = new T.Vector3(), d = new T.Vector3(0, 0, -1);
  return (x, y) => { o.set(x, y, 1); rc.set(o, d); const h = rc.intersectObject(mesh, false)[0]; return h ? h.point.z : 0; };
}
// Flat strip conforming to the face surface (eyebrows, mouth line).
function ribbon(samples, widthFn, surf, lift, mat) {
  const n = samples.length, pos = [], nor = [], idx = [];
  for (let i = 0; i < n; i++) {
    const a = samples[Math.max(0, i - 1)], b = samples[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const w = widthFn(i / (n - 1)) / 2, nx = -ty, ny = tx;
    for (const s of [-1, 1]) { const x = samples[i][0] + nx * w * s, y = samples[i][1] + ny * w * s; pos.push(x, y, surf(x, y) + lift); nor.push(0, 0, 1); }
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return new T.Mesh(g, mat);
}
// Tube with variable radius (lips).
function taperTube(pts, rFn, mat, radial = 10, zs = 0.8) {
  const n = pts.length, pos = [], idx = [], N = new T.Vector3(0, 0, 1);
  for (let i = 0; i < n; i++) {
    const tan = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
    const B = tan.clone().cross(N).normalize(), r = rFn(i / (n - 1));
    for (let j = 0; j < radial; j++) { const a = (j / radial) * Math.PI * 2; pos.push(pts[i].x + B.x * Math.cos(a) * r, pts[i].y + B.y * Math.cos(a) * r, pts[i].z + Math.sin(a) * r * zs); }
    if (i < n - 1) for (let j = 0; j < radial; j++) { const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial; idx.push(a, c, b, b, c, d); }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return new T.Mesh(g, mat);
}

function buildHead(P, skinMat, skinFlat) {
  const H = P.head, E = P.eye;
  const g = new T.SphereGeometry(1, 64, 48), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const X = pos.getX(i), Y = pos.getY(i), Z = pos.getZ(i);
    let px = X * H.rx, py = Y * H.ry, pz = Z * H.rz;
    const low = Math.max(0, -Y);
    px *= 1 - H.jawTaper * Math.pow(low, H.jawPow);
    px *= 1 + H.jawSquare * sm(0.25, 0.6, low) * (1 - sm(0.6, 0.95, low));
    if (H.flatChin && Y < -0.7) py = -H.ry * (0.7 + (-Y - 0.7) * H.flatChin);
    px *= 1 + H.cheek * Math.exp(-Math.pow((Y + 0.05) / 0.35, 2));
    px *= 1 - 0.05 * Math.max(0, Y - 0.55);
    if (Y > 0) py *= H.crown;
    px *= 1 + H.cranium * sm(0.1, 0.5, Y) * (1 - sm(0.6, 0.95, Y));
    if (Z > 0) {
      pz += H.chin * Math.exp(-Math.pow((Y + 0.78) / 0.22, 2)) * Z;
      pz += H.brow * Math.exp(-Math.pow((Y - 0.30) / 0.14, 2)) * Z;
      if (Y > 0.35) pz *= 1 - 0.10 * (Y - 0.35);
    }
    if (Z > 0.2) {
      const d = Math.pow((Math.abs(px) - E.x) / 0.026, 2) + Math.pow((py - E.y) / 0.018, 2);
      pz -= H.socket * Math.exp(-d);
      const dm = Math.pow(px / 0.034, 2) + Math.pow((py + 0.062) / 0.026, 2);
      pz += 0.005 * Math.exp(-dm);
    }
    pos.setXYZ(i, px, py, pz);
    // Vertex-painted skin shading.
    let r = 1, gg = 1, b = 1;
    const ax = Math.abs(px), front = pz > 0 ? 1 : 0;
    const eyeD = Math.hypot(ax - E.x, py - E.y);
    const sock = Math.exp(-Math.pow(eyeD / 0.024, 2)) * front;
    r *= 1 - 0.05 * sock; gg *= 1 - 0.09 * sock; b *= 1 - 0.06 * sock;
    const under = Math.exp(-(Math.pow((ax - E.x) / 0.02, 2) + Math.pow((py - E.y + 0.02) / 0.009, 2))) * front;
    r *= 1 - 0.02 * under; gg *= 1 - 0.07 * under; b *= 1 - 0.03 * under;
    if (P.stubble) {
      const n = 0.85 + 0.15 * hash3(Math.round(px * 150), Math.round(py * 150), Math.round(pz * 150));
      const jaw = sm(-0.012, -0.05, py) * sm(0.085, 0.06, ax * 0.5 + Math.abs(py) * 0.1) * sm(-0.045, 0.02, pz);
      const scalp = sm(0.078, 0.105, py) * 0.5 + sm(-0.005, -0.05, pz) * sm(0.07, -0.02, py) * 0.5;
      const m = clamp(jaw * 0.95 + scalp * 0.55, 0, 1) * n;
      r *= 1 - 0.26 * m; gg *= 1 - 0.29 * m; b *= 1 - 0.22 * m;
    }
    if (P.blush) {
      const bl = Math.exp(-(Math.pow((ax - 0.046) / 0.02, 2) + Math.pow((py + 0.026) / 0.018, 2))) * front;
      gg *= 1 - 0.10 * bl; b *= 1 - 0.09 * bl; r *= 1 + 0.02 * bl;
    }
    const ao = 1 - 0.2 * sm(-0.6, -0.97, Y); r *= ao; gg *= ao; b *= ao;
    col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = b;
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new T.Mesh(g, skinMat);
}

export function createCharacter(kind) {
  const P = PRESETS[kind] || PRESETS.male;
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const std = (o) => keep(new T.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.3 }, o)));

    const skinMat = std({ color: P.skin, vertexColors: true, roughness: 0.58, metalness: 0, emissive: 0x2a120a, emissiveIntensity: 0.18, envMapIntensity: 0.4 });
  const skinFlat = std({ color: P.skin, roughness: 0.58, metalness: 0, emissive: 0x2a120a, emissiveIntensity: 0.18, envMapIntensity: 0.4 });

  const torsoQ = TX.quilted(P.jacket, 7, { zip: true, seed: 3 });
  const armQ = TX.quilted(P.jacket, 3, { seed: 5 }), foreQ = TX.quilted(P.jacket, 3, { seed: 6 });
  const jacketOf = (q, bs = 0.9) => std({ color: 0xffffff, map: q.map, bumpMap: q.bump, bumpScale: bs, roughness: 0.62, envMapIntensity: 0.55 });
  const torsoMat = jacketOf(torsoQ, 1.1), upperMat = jacketOf(armQ), foreMat = jacketOf(foreQ), jacketPlain = std({ color: P.jacket, roughness: 0.6 });
  const scarfK = TX.knit(P.scarf, 3, 3), scarfMat = std({ color: 0xffffff, map: scarfK.map, bumpMap: scarfK.bump, bumpScale: 1.4, roughness: 0.95 });
  const cuffK = TX.knit(P.cuff, 2, 1), cuffMat = std({ color: 0xffffff, map: cuffK.map, bumpMap: cuffK.bump, bumpScale: 1.2, roughness: 0.95 });
  const gloveK = TX.knit(P.glove, 2, 2), gloveMat = std({ color: 0xffffff, map: gloveK.map, bumpMap: gloveK.bump, bumpScale: 1.2, roughness: 0.95 });
  const pantsT = TX.twill(P.pants, 1, 1.5), pantsMat = std({ color: 0xffffff, map: pantsT.map, roughness: 0.88 });
  const bootL = TX.leather(P.boot), bootMat = std({ color: 0xffffff, map: bootL.map, roughness: 0.4, envMapIntensity: 0.7 });
  const accentMat = std({ color: P.bootAccent, roughness: 0.5 }), laceMat = std({ color: P.laces, roughness: 0.8 });
  const rubber = std({ color: 0x15161a, roughness: 0.9 }), steel = std({ color: 0xdde4ec, metalness: 0.95, roughness: 0.18, envMapIntensity: 1.2 });
  const darkMat = std({ color: 0x241512, roughness: 0.6 });

  const root = new T.Group(), body = new T.Group(), hips = new T.Group(), spine = new T.Group();
  root.add(body); body.add(hips); hips.add(spine);
  root.scale.setScalar(P.scale);

  // ---------- Torso (quilted puffer jacket) + pelvis
  const curve = new T.SplineCurve(P.torso.map(([y, r]) => new T.Vector2(r, y)));
  const tp = curve.getPoints(48).map((v) => new T.Vector2(Math.max(0.001, v.x), v.y));
  const torso = new T.Mesh(new T.LatheGeometry(tp, 40), torsoMat);
  torso.scale.z = P.torsoZ; torso.rotation.y = Math.PI; // seam to the back; zipper faces front
  spine.add(torso);
  hips.add(ell(1, 0.152, 0.085, 0.105, pantsMat, 0, -0.075, 0, 20, 14));
  const hem = new T.Mesh(new T.TorusGeometry(0.15, 0.016, 8, 32), cuffMat); hem.rotation.x = Math.PI / 2; hem.scale.set(1, P.torsoZ, 1); hem.position.y = -0.085; spine.add(hem);

  // ---------- Legs + skates
  const legs = [];
  function makeLeg(side) {
    const hipG = new T.Group(); hipG.position.set(side * P.hipX, 0, 0); hips.add(hipG);
    hipG.add(limb(0.41, 0.083, 0.064, pantsMat));
    const knee = new T.Group(); knee.position.y = -0.41; hipG.add(knee);
    knee.add(limb(0.36, 0.060, 0.045, pantsMat));
    const ankle = new T.Group(); ankle.position.y = -0.36; knee.add(ankle);
    // boot
    const shaft = limb(0.075, 0.054, 0.056, bootMat); shaft.position.y = 0.05; ankle.add(shaft);
    const foot = limb(0.15, 0.05, 0.043, bootMat); foot.rotation.x = -Math.PI / 2; foot.position.set(0, -0.042, -0.06); foot.scale.set(1, 1, 0.88); ankle.add(foot);
    const cuff = new T.Mesh(new T.TorusGeometry(0.056, 0.012, 8, 20), accentMat); cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.052; ankle.add(cuff);
    [0.034, 0.016, -0.002].forEach((y) => { const l = mk(new T.BoxGeometry(0.05, 0.005, 0.004), laceMat, 0, y, 0.057); ankle.add(l); });
    [0.0, 0.025].forEach((z) => { const l = mk(new T.BoxGeometry(0.05, 0.004, 0.006), laceMat, 0, -0.003, 0.07 + z); ankle.add(l); });
    ankle.add(mk(new T.BoxGeometry(0.103, 0.014, 0.27), rubber, 0, -0.088, 0.034));
    [-0.075, 0.1].forEach((z) => ankle.add(mk(new T.BoxGeometry(0.012, 0.034, 0.022), steel, 0, -0.108, z)));
    const sh = new T.Shape(); sh.moveTo(-0.125, -0.16); sh.lineTo(0.125, -0.16); sh.quadraticCurveTo(0.185, -0.158, 0.19, -0.118); sh.lineTo(-0.115, -0.122); sh.quadraticCurveTo(-0.13, -0.14, -0.125, -0.16);
    const bg = new T.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }); bg.translate(0, 0, -0.003); bg.rotateY(-Math.PI / 2);
    ankle.add(new T.Mesh(bg, steel));
    const r = { hip: hipG, knee, ankle }; legs.push(r); return r;
  }
  const legL = makeLeg(1), legR = makeLeg(-1);

  // ---------- Arms
  const arms = [];
  function makeArm(side) {
    const sh = new T.Group(); sh.position.set(side * P.shoulderX, 0.485, 0); spine.add(sh);
    sh.add(ell(1, 0.062, 0.066, 0.06, upperMat, 0, 0.002, 0, 16, 12));
    sh.add(limb(0.28, 0.056, 0.047, upperMat));
    const el = new T.Group(); el.position.y = -0.28; sh.add(el);
    el.add(limb(0.25, 0.047, 0.037, foreMat));
    const wr = new T.Group(); wr.position.y = -0.25; el.add(wr);
    const cuffR = new T.Mesh(new T.CylinderGeometry(0.04, 0.041, 0.04, 16, 1, true), cuffMat); cuffR.position.y = -0.0; wr.add(cuffR);
    const hand = limb(0.075, 0.037, 0.03, gloveMat); hand.scale.set(1.05, 1, 0.62); hand.position.y = -0.015; wr.add(hand);
    const thumb = limb(0.034, 0.016, 0.013, gloveMat); thumb.position.set(-side * 0.032, -0.035, 0.008); thumb.rotation.set(-0.5, 0, -side * 0.5); wr.add(thumb);
    const a = { sh, el, wr }; arms.push(a); return a;
  }
  const armL = makeArm(1), armR = makeArm(-1);

  // ---------- Neck, collar, scarf
  const neck = new T.Group(); neck.position.y = 0.5; spine.add(neck);
  const neckMesh = limb(0.15, 0.05, 0.048, skinFlat); neckMesh.position.y = 0.15; neck.add(neckMesh);
  const collar = new T.Mesh(new T.CylinderGeometry(0.066, 0.085, 0.06, 28, 1, true), jacketPlain); collar.material.side = T.DoubleSide; collar.position.y = 0.02; collar.scale.z = 0.9; neck.add(collar);
  const s1 = new T.Mesh(new T.TorusGeometry(0.072, 0.036, 12, 28), scarfMat); s1.rotation.x = Math.PI / 2; s1.position.y = 0.055; s1.scale.set(1.05, 1, 0.95); neck.add(s1);
  const s2 = new T.Mesh(new T.TorusGeometry(0.064, 0.03, 12, 28), scarfMat); s2.rotation.x = Math.PI / 2; s2.position.set(0, 0.095, 0.006); neck.add(s2);
  const tail = new T.Group(); tail.position.set(0.03, 0.06, -0.075); neck.add(tail);
  const tailMesh = mk(new T.BoxGeometry(0.075, 0.36, 0.022, 4, 8, 1), scarfMat, 0, -0.18, 0); tail.add(tailMesh);
  const fringe = mk(new T.BoxGeometry(0.075, 0.03, 0.026), jacketPlain, 0, -0.37, 0); fringe.material = cuffMat; tail.add(fringe);

  // ---------- Head
  const head = new T.Group(); head.position.y = 0.21; neck.add(head);
  const headMesh = buildHead(P, skinMat, skinFlat);
  const surf = surfaceFn(headMesh);
  head.add(headMesh);
  const E = P.eye, Hh = P.head;

  // ears
  const earInner = std({ color: shadeHex(P.skin, 0.8), roughness: 0.7 });
  [-1, 1].forEach((s) => {
    const ex0 = Hh.rx * (1 + Hh.cheek * 0.4 + Hh.cranium * 0.3);
    const ear = ell(1, 0.0105, 0.031, 0.019, skinFlat, s * (ex0 + 0.002), -0.004, -0.006, 14, 10); ear.rotation.y = s * 0.45; head.add(ear);
    const inner = ell(1, 0.004, 0.02, 0.011, earInner, s * (ex0 + 0.0075), -0.004, -0.004, 8, 6); inner.rotation.y = s * 0.45; head.add(inner);
  });

  // nose
  const nz = (y) => surf(0, y);
  const bridge = ell(1, 0.0072, 0.026, 0.0088, skinFlat, 0, -0.004, nz(-0.004) + 0.0025, 12, 10); bridge.rotation.x = -0.32; head.add(bridge);
  head.add(ell(1, Hh.noseW * 0.8, 0.0096, 0.0108, skinFlat, 0, -0.0325, nz(-0.0325) + Hh.noseTip - 0.007, 14, 10));
  [-1, 1].forEach((s) => {
    head.add(ell(1, 0.0058, 0.0068, 0.0072, skinFlat, s * Hh.noseW, -0.0365, surf(s * Hh.noseW, -0.0365) + 0.0022, 10, 8));
    head.add(ell(1, 0.0036, 0.0022, 0.003, darkMat, s * 0.0072, -0.0405, nz(-0.0405) + Hh.noseTip - 0.0045, 8, 6));
  });

  // eyes, lids (blink), liner
  const eyeTex = keep(TX.eye(E.iris, E.ring));
  const eyeMat = keep(new T.MeshPhysicalMaterial({ map: eyeTex, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.0 }));
  const linerMat = std({ color: 0x1a0f0c, roughness: 0.5 });
  const lids = [];
  [-1, 1].forEach((s) => {
    const ex = s * E.x, ez = surf(ex, E.y) - E.r * 0.42;
    const eg = new T.Group(); eg.position.set(ex, E.y, ez); head.add(eg);
    const ball = mk(new T.SphereGeometry(E.r, 24, 18), eyeMat); eg.add(ball);
    const lidG = new T.Group(); eg.add(lidG);
    const lidTheta = 1.27 - E.tilt; // lid edge sits ~13 deg below the eye's equator when open
    lidG.add(mk(new T.SphereGeometry(E.r * 1.1, 24, 12, 0, Math.PI * 2, 0, lidTheta), skinFlat));
    lidG.add(mk(new T.SphereGeometry(E.r * 1.09, 24, 12, 0, Math.PI * 2, 0, lidTheta + (kind === 'female' ? 0.12 : 0.08)), linerMat));
    const lower = mk(new T.SphereGeometry(E.r * 1.08, 24, 8, 0, Math.PI * 2, 2.0, Math.PI - 2.0), skinFlat); eg.add(lower);
    lidG.rotation.x = E.tilt; lids.push(lidG);
    // brow
    const bw = P.brow, pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, x = s * lerp(0.011, 0.056, t);
      const y = E.y + bw.y + Math.sin(t * Math.PI) * bw.arch - Math.max(0, t - 0.6) * 0.012 - (1 - t) * 0.002;
      pts.push([x, y]);
    }
    head.add(ribbon(pts, (t) => bw.w * (1 - 0.65 * t) * (0.75 + 0.25 * Math.sin(t * Math.PI + 0.3)) + 0.0006, surf, 0.0016, std({ color: bw.color, roughness: 0.9, side: T.DoubleSide })));
  });

  // mouth
  const lipMat = std({ color: P.lips.color, roughness: 0.4, envMapIntensity: 0.3 });
  const ym = -0.066, hw = Hh.hw, full = P.lips.full, up = [], lo = [], line = [];
  for (let i = 0; i <= 28; i++) {
    const t = (i / 28) * 2 - 1, x = t * hw, yl = ym + 0.0042 * t * t;
    const ru = 0.0046 * full * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 2.4)), 0.6) + 0.0005;
    const rl = 0.0057 * full * Math.pow(Math.max(0, 1 - t * t), 0.6) + 0.0005;
    const z = surf(x, yl);
    up.push(new T.Vector3(x, yl + ru - 0.0011 * Math.exp(-Math.pow(t / 0.18, 2)), z + ru * 0.35));
    lo.push(new T.Vector3(x, yl - rl, z + rl * 0.35));
    line.push([x, yl]);
  }
  head.add(taperTube(up, (t) => 0.0046 * full * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t * 2 - 1), 2.4)), 0.6) + 0.0005, lipMat));
  head.add(taperTube(lo, (t) => 0.0057 * full * Math.pow(Math.max(0, 1 - Math.pow(t * 2 - 1, 2)), 0.6) + 0.0005, lipMat));
  head.add(ribbon(line, (t) => 0.0022 * Math.sin(t * Math.PI) + 0.0004, surf, 0.0002, std({ color: 0x4a2224, roughness: 0.8, side: T.DoubleSide })));

  // hair (female bob + fringe) / bald (male)
  if (P.hair) {
    const hx = TX.hair(P.hair.color);
    const hairMat = keep(new T.MeshStandardMaterial({ color: 0xffffff, map: hx.map, bumpMap: hx.bump, bumpScale: 0.25, roughness: 0.5, metalness: 0.05, side: T.DoubleSide, envMapIntensity: 0.25 }));
    const prof = [[0.0, -0.126], [0.066, -0.118], [0.086, -0.1], [0.094, -0.07], [0.094, -0.02], [0.092, 0.03], [0.085, 0.07], [0.068, 0.103], [0.04, 0.122], [0.0, 0.132]]
      .map(([r, y]) => new T.Vector2(r, y));
    const smooth = new T.SplineCurve(prof).getPoints(40).map((v) => new T.Vector2(Math.max(0.0005, v.x), v.y));
    const open = 0.34 * Math.PI;
    const shell = new T.Mesh(new T.LatheGeometry(smooth, 48, open, Math.PI * 2 - open * 2), hairMat);
    shell.scale.set(1, 1, 1.2); shell.position.z = -0.004; head.add(shell);
    const topPts = smooth.filter((v) => v.y > 0.062);
    const fringe = new T.Mesh(new T.LatheGeometry(topPts, 32, -open - 0.04, open * 2 + 0.08), hairMat);
    fringe.scale.set(1.02, 1, 1.22); fringe.position.z = -0.004; fringe.rotation.z = 0.06; head.add(fringe);
    // side-swept strands falling toward the cheeks
    [-1, 1].forEach((s) => {
      const st = mk(new T.CylinderGeometry(0.004, 0.0015, 0.1, 6), hairMat, s * 0.072, -0.02, surf(s * 0.072, -0.02) + 0.012); st.rotation.z = s * 0.12; head.add(st);
    });
  }

  // glasses
  if (P.glasses) {
    const fm = std({ color: 0x1c1717, metalness: 0.35, roughness: 0.32, envMapIntensity: 0.9 });
    const lensMat = keep(new T.MeshStandardMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.2, envMapIntensity: 1.2, side: T.DoubleSide, depthWrite: false }));
    const gz = surf(E.x, E.y) + 0.021;
    [-1, 1].forEach((s) => {
      const rim = new T.Mesh(new T.TorusGeometry(0.0175, 0.0015, 8, 32), fm); rim.scale.set(1.2, 0.9, 1); rim.position.set(s * E.x, E.y, gz); head.add(rim);
      const lens = new T.Mesh(new T.CircleGeometry(0.0176, 28), lensMat); lens.scale.set(1.2, 0.9, 1); lens.position.set(s * E.x, E.y, gz - 0.0004); head.add(lens);
      const tc = new T.CatmullRomCurve3([new T.Vector3(s * 0.0495, E.y + 0.002, gz), new T.Vector3(s * 0.064, E.y + 0.002, gz - 0.02), new T.Vector3(s * 0.0835, E.y, 0.012), new T.Vector3(s * 0.0825, E.y - 0.008, -0.022)]);
      head.add(new T.Mesh(new T.TubeGeometry(tc, 16, 0.0012, 6), fm));
    });
    const bc = new T.CatmullRomCurve3([new T.Vector3(0.0105, E.y + 0.004, gz), new T.Vector3(0, E.y + 0.008, gz + 0.001), new T.Vector3(-0.0105, E.y + 0.004, gz)]);
    head.add(new T.Mesh(new T.TubeGeometry(bc, 8, 0.0014, 6), fm));
    [-1, 1].forEach((s) => head.add(mk(new T.SphereGeometry(0.0022, 6, 6), fm, s * 0.0125, E.y - 0.012, gz - 0.003)));
  }

  head.rotation.x = 0; head.scale.setScalar(1.07);

  // ---------- Animation
  const FOOT = 0.16, L1 = 0.41, L2 = 0.36;
  function pose(p, t) {
    const onIce = p.mode === 'skate', ok = p.state === 'ok';
    const sf = clamp(p.speed / 12, 0, 1), f = p.fallAmt, calm = 1 - f;
    const amp = clamp(p.strideAmp, 0, 1), s = p.stride;
    const wob = p.b * calm, w = clamp(p.speed / 4.6, 0, 1);
    let tL, tR, kL, kR, spread = 0;
    if (ok && onIce) {
      const cr = clamp(0.3 + sf * 0.55 + amp * 0.15, 0, 1);
      const base = -0.12 - cr * 0.3, kb = 0.12 + cr * 0.62;
      const sw = Math.sin(s) * 0.55 * amp;
      tL = base + sw; tR = base - sw;
      kL = kb + Math.max(0, -Math.cos(s)) * 0.5 * amp; kR = kb + Math.max(0, Math.cos(s)) * 0.5 * amp;
      spread = 0.05 + amp * 0.07;
    } else if (ok) {
      tL = -0.04 + Math.sin(s) * 0.55 * w; tR = -0.04 - Math.sin(s) * 0.55 * w;
      kL = 0.08 + Math.max(0, Math.cos(s)) * 0.8 * w; kR = 0.08 + Math.max(0, -Math.cos(s)) * 0.8 * w;
    } else { tL = tR = -0.1 - f * 0.1; kL = kR = 0.25 + f * 0.35; }
    const wobL = Math.sin(t * 9) * wob * 0.12; tL += wobL; tR -= wobL;
    legL.hip.rotation.set(tL, 0, spread); legR.hip.rotation.set(tR, 0, -spread);
    legL.knee.rotation.x = kL; legR.knee.rotation.x = kR;
    legL.ankle.rotation.x = -(tL + kL); legR.ankle.rotation.x = -(tR + kR);
    const hl = L1 * Math.cos(tL) + L2 * Math.cos(tL + kL), hr = L1 * Math.cos(tR) + L2 * Math.cos(tR + kR);
    hips.position.y = FOOT + Math.max(hl, hr) * (1 - 0.0) - 0.0;
    hips.position.y -= 0.002;

    const lean = (onIce ? 0.1 + sf * 0.3 : 0.05) * calm + 0.18 * (hl < 0.74 ? (0.74 - hl) * 1.6 : 0);
    spine.rotation.x = lean + Math.cos(t * 7) * wob * 0.14;
    spine.rotation.z = (Math.sin(t * 9) * wob * 0.28 + p.steer * clamp(p.speed / 9, 0, 1) * 0.35) * calm;
    spine.rotation.y = -p.steer * clamp(p.speed / 9, 0, 1) * 0.12 * calm;
    const breathe = Math.sin(t * 1.7) * 0.004;
    spine.scale.set(1 + breathe, 1 + breathe * 0.6, 1 + breathe);
    neck.rotation.x = -lean * 0.45; head.rotation.x = -lean * 0.4 + Math.sin(t * 0.8) * 0.02 - f * 0.2;
    head.rotation.y = -p.steer * 0.25 * calm; head.rotation.z = -spine.rotation.z * 0.5;

    // arms
    const flail = Math.sin(t * 15) * wob * 0.5;
    const swingA = ok ? (onIce ? Math.sin(s) * 0.5 * amp : Math.sin(s) * 0.6 * w) : 0;
    const fwd = onIce ? 0.35 + sf * 0.15 : 0.1;
    [[armL, 1], [armR, -1]].forEach(([a, side]) => {
      a.sh.rotation.x = (-fwd - side * swingA) * calm + flail * side - f * 1.3;
      a.sh.rotation.z = side * (0.13 + wob * 1.0 + f * (0.9 + Math.sin(t * 20) * 0.3));
      a.el.rotation.x = -(0.35 + (onIce ? 0.35 : 0.2) * calm + wob * 0.6) - f * 0.4;
      a.wr.rotation.x = -0.25;
    });
    // scarf tail streams behind
    tail.rotation.x = 0.08 + sf * 1.05 + Math.sin(t * 8) * 0.08 * sf + f * 0.4;
    tail.rotation.z = Math.sin(t * 6 + 1) * 0.1 * sf;

    // blink
    const ph = (t + 0.7) % 3.7; const bl = ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : 0;
    lids.forEach((l) => { l.rotation.x = E.tilt + bl * 0.62 + wob * 0.1; });

    body.rotation.x = p.fallDir * f * 1.5;
    body.position.y = f * 0.16;
  }
  function place(p) { root.position.set(p.x, p.mode === 'skate' ? 0.06 : 0, p.z); root.rotation.y = p.h; }
  function dispose() {
    root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    disposables.forEach((d) => { if (d.dispose) d.dispose(); });
  }
  return { root, pose, place, dispose, kind, height: 1.77 * P.scale, faceY: 1.64 * P.scale };
}

function shadeHex(n, k) {
  const r = Math.min(255, ((n >> 16) & 255) * k) | 0, g = Math.min(255, ((n >> 8) & 255) * k) | 0, b = Math.min(255, (n & 255) * k) | 0;
  return (r << 16) | (g << 8) | b;
}
