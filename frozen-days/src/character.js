// Detailed stylized-realistic skater (procedural, no external assets).
// Rig: root(feet) > body(fall pivot) > hips > [legs: thigh > knee > ankle(boot+blade)] + spine > [torso, arms: shoulder > elbow > wrist, neck > head].
// Limbs are tapered capsules that overlap at the joints, so shoulders/hips/knees/elbows blend with no gaps.
import { clamp, lerp } from './util.js';
import * as TX from './cloth.js';
import { toonMat, addOutlines } from './anime.js';
import { paintFace } from './face.js';
import { torsoProfile, jacketMats, jacketExtras, scarfBuild, hatBuild, pantsBuild, gloveBuild, skateBuild } from './styles.js';
const T = THREE;

const PRESETS = {
  male: {
    label: 'Male', scale: 1.0,
    skin: 0xdcaa86,
    head: { rx: 0.081, ry: 0.108, rz: 0.099, jawTaper: 0.3, jawPow: 1.7, jawSquare: 0.05, flatChin: 0.6, cheek: 0.03, crown: 0.97, cranium: 0.09, brow: 0, chin: 0.004, socket: 0, noseTip: 0, noseW: 0, hw: 0.02 },
    eye: { r: 0.0138, x: 0.0345, y: -0.004, iris: 0x6a96b4, ring: 0x1f3442, tilt: 0.42 },
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
    head: { rx: 0.074, ry: 0.113, rz: 0.093, jawTaper: 0.46, jawPow: 1.5, jawSquare: 0, cheek: 0.025, crown: 0.93, cranium: 0.04, brow: 0, chin: 0.002, socket: 0, noseTip: 0, noseW: 0, hw: 0.018 },
    eye: { r: 0.0148, x: 0.0335, y: -0.002, iris: 0x8a5a32, ring: 0x2a170c, tilt: 0.34 },
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
function buildHead(P, skinMat, skinFlat, lite) {
  const H = P.head, E = P.eye;
  const g = new T.SphereGeometry(1, lite ? 32 : 64, lite ? 22 : 48), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
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
    }
    pos.setXYZ(i, px, py, pz);
    let r = 1, gg = 1, b = 1;
    const ao = 1 - 0.2 * sm(-0.6, -0.97, Y); r *= ao; gg *= ao; b *= ao;
    col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = b;
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new T.Mesh(g, skinMat);
}

// opts.variant overrides colours / hair / hat (NPCs); opts.outfit overrides only clothing colours (the player's worn items); opts.lite builds a cheaper model for background characters.
export function createCharacter(kind, opts = {}) {
  const base = PRESETS[kind] || PRESETS.male, v = { ...(opts.outfit || {}), ...(opts.variant || {}) }, lite = !!opts.lite;
  const P = { ...base, ...v, eye: { ...base.eye, ...(v.eye || {}) }, head: { ...base.head, ...(v.head || {}) }, brow: { ...base.brow, ...(v.brow || {}) } };
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };
  const std = (o) => keep(toonMat(o));
  // shapes of the worn pieces (each style has its own geometry, see styles.js)
  const S = { jacket: P.jacketStyle || 'puffer', scarf: P.scarfStyle || 'wool', hat: P.hatStyle || 'beanie', pants: P.pantsStyle || 'slim', glove: P.gloveStyle || 'glove', skate: P.skateStyle || 'rental' };
  const profile = torsoProfile(S.jacket, P.torso);

    const skinMat = std({ soft: true, color: 0xffffff, vertexColors: true, roughness: 0.58, metalness: 0, emissive: 0x2a120a, emissiveIntensity: 0.18, envMapIntensity: 0.4 });
  const skinFlat = std({ soft: true, color: P.skin, roughness: 0.58, metalness: 0, emissive: 0x2a120a, emissiveIntensity: 0.18, envMapIntensity: 0.4 });

  const JM = jacketMats(S.jacket, { std, TX, P });
  const torsoMat = JM.torsoMat, upperMat = JM.upperMat, foreMat = JM.foreMat, jacketPlain = std({ color: P.jacket, roughness: 0.6 });
  const scarfK = TX.knit(P.scarf, 3, 3), scarfMat = std({ color: 0xffffff, map: scarfK.map, bumpMap: scarfK.bump, bumpScale: 1.4, roughness: 0.95 });
  const cuffK = TX.knit(P.cuff, 2, 1), cuffMat = std({ color: 0xffffff, map: cuffK.map, bumpMap: cuffK.bump, bumpScale: 1.2, roughness: 0.95 });
  const gloveK = TX.knit(P.glove, 2, 2), gloveMat = std({ color: 0xffffff, map: gloveK.map, bumpMap: gloveK.bump, bumpScale: 1.2, roughness: 0.95 });
  const legCol = (S.pants === 'skirt' || S.pants === 'shorts') ? 0x23252e : P.pants;
  const pantsT = TX.twill(legCol, 1, 1.5), pantsMat = std({ color: 0xffffff, map: pantsT.map, roughness: 0.88 });
  const bootL = TX.leather(P.boot), bootMat = std({ color: 0xffffff, map: bootL.map, roughness: 0.4, envMapIntensity: 0.7 });
  const accentMat = std({ color: P.bootAccent, roughness: 0.5 }), laceMat = std({ color: P.laces, roughness: 0.8 });
  const rubber = std({ color: 0x15161a, roughness: 0.9 }), steel = std({ color: 0xdde4ec, metalness: 0.95, roughness: 0.18, envMapIntensity: 1.2 });
  const darkMat = std({ color: 0x241512, roughness: 0.6 });

  const root = new T.Group(), body = new T.Group(), hips = new T.Group(), spine = new T.Group();
  root.add(body); body.add(hips); hips.add(spine);
  root.scale.setScalar(P.scale);

  // ---------- Torso (quilted puffer jacket) + pelvis
  const curve = new T.SplineCurve(profile.map(([y, r]) => new T.Vector2(r, y)));
  const tp = curve.getPoints(48).map((v) => new T.Vector2(Math.max(0.001, v.x), v.y));
  const torso = new T.Mesh(new T.LatheGeometry(tp, 40), torsoMat);
  torso.scale.z = P.torsoZ; torso.rotation.y = Math.PI; // seam to the back; zipper faces front
  spine.add(torso);
  hips.add(ell(1, 0.152, 0.085, 0.105, pantsMat, 0, -0.075, 0, 20, 14));
  if (!lite && S.jacket === 'puffer') { const hem = new T.Mesh(new T.TorusGeometry(0.15, 0.016, 8, 32), cuffMat); hem.rotation.x = Math.PI / 2; hem.scale.set(1, P.torsoZ, 1); hem.position.y = -0.085; spine.add(hem); }

  // ---------- Legs + skates
  const legs = [];
  function makeLeg(side) {
    const hipG = new T.Group(); hipG.position.set(side * P.hipX, 0, 0); hips.add(hipG);
    const thigh = limb(0.41, 0.083, 0.064, pantsMat); hipG.add(thigh);
    const knee = new T.Group(); knee.position.y = -0.41; hipG.add(knee);
    const shin = limb(0.36, 0.060, 0.045, pantsMat); knee.add(shin);
    const ankle = new T.Group(); ankle.position.y = -0.36; knee.add(ankle);
    if (S.skate === 'rental') {
    // boot
    const shaft = limb(0.075, 0.054, 0.056, bootMat); shaft.position.y = 0.05; ankle.add(shaft);
    const foot = limb(0.15, 0.05, 0.043, bootMat); foot.rotation.x = -Math.PI / 2; foot.position.set(0, -0.042, -0.06); foot.scale.set(1, 1, 0.88); ankle.add(foot);
    if (!lite) { const cuff = new T.Mesh(new T.TorusGeometry(0.056, 0.012, 8, 20), accentMat); cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.052; ankle.add(cuff); }
    if (!lite) [0.034, 0.016, -0.002].forEach((y) => { const l = mk(new T.BoxGeometry(0.05, 0.005, 0.004), laceMat, 0, y, 0.057); ankle.add(l); });
    if (!lite) [0.0, 0.025].forEach((z) => { const l = mk(new T.BoxGeometry(0.05, 0.004, 0.006), laceMat, 0, -0.003, 0.07 + z); ankle.add(l); });
    ankle.add(mk(new T.BoxGeometry(0.103, 0.014, 0.27), rubber, 0, -0.088, 0.034));
    if (!lite) [-0.075, 0.1].forEach((z) => ankle.add(mk(new T.BoxGeometry(0.012, 0.034, 0.022), steel, 0, -0.108, z)));
    const sh = new T.Shape(); sh.moveTo(-0.125, -0.16); sh.lineTo(0.125, -0.16); sh.quadraticCurveTo(0.185, -0.158, 0.19, -0.118); sh.lineTo(-0.115, -0.122); sh.quadraticCurveTo(-0.13, -0.14, -0.125, -0.16);
    const bg = new T.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }); bg.translate(0, 0, -0.003); bg.rotateY(-Math.PI / 2);
    ankle.add(new T.Mesh(bg, steel));
    } else skateBuild(S.skate, { T, mk, ell, limb, std, lite, mats: { bootMat, accentMat, laceMat, rubber, steel } }, ankle);
    const r = { hip: hipG, knee, ankle, thigh, shin }; legs.push(r); return r;
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
    const a = { sh, el, wr, hand, thumb }; arms.push(a); return a;
  }
  const armL = makeArm(1), armR = makeArm(-1);
  if (!lite) {
    jacketExtras(S.jacket, { T, mk, ell, std, TX, spine, P, profile, armL, armR });
    gloveBuild(S.glove, { T, mk, ell, std, TX, P, arms, skinFlat, gloveMat });
    pantsBuild(S.pants, { T, mk, ell, std, TX, P, hips, spine, legs, profile });
  }
  // handheld props for the eating animation (cup of cocoa / bun), shown only while eating
  const cupMat = std({ color: 0xf4efe6, roughness: 0.7 }), cocoaMat = std({ color: 0x6a3f24, roughness: 0.6 }), bunMat = std({ color: 0xd9a05a, roughness: 0.8 }), iceMat = std({ color: 0xfff6ea, roughness: 0.7 });
  const cup = new T.Group(); cup.visible = false; armR.wr.add(cup); cup.position.set(0, -0.11, 0.04);
  cup.add(mk(new T.CylinderGeometry(0.042, 0.033, 0.095, 12), cupMat, 0, 0, 0)); cup.add(mk(new T.CylinderGeometry(0.037, 0.037, 0.006, 12), cocoaMat, 0, 0.044, 0));
  const bun = new T.Group(); bun.visible = false; armR.wr.add(bun); bun.position.set(0, -0.085, 0.03);
  { const b = mk(new T.SphereGeometry(0.042, 12, 9), bunMat, 0, 0, 0); b.scale.y = 0.72; bun.add(b); const ic = mk(new T.SphereGeometry(0.03, 10, 7), iceMat, 0, 0.02, 0); ic.scale.y = 0.4; bun.add(ic); }

  // ---------- Neck, collar, scarf
  const neck = new T.Group(); neck.position.y = 0.5; spine.add(neck);
  const neckMesh = limb(0.15, 0.05, 0.048, skinFlat); neckMesh.position.y = 0.15; neck.add(neckMesh);
  const collar = new T.Mesh(new T.CylinderGeometry(0.066, 0.085, 0.06, 28, 1, true), jacketPlain); collar.material.side = T.DoubleSide; collar.position.y = 0.02; collar.scale.z = 0.9; neck.add(collar);
  const tail = new T.Group(); tail.position.set(0.03, 0.06, -0.075); neck.add(tail);
  if (S.scarf === 'wool') {
  const s1 = new T.Mesh(new T.TorusGeometry(0.072, 0.036, 12, 28), scarfMat); s1.rotation.x = Math.PI / 2; s1.position.y = 0.055; s1.scale.set(1.05, 1, 0.95); neck.add(s1);
  if (!lite) { const s2 = new T.Mesh(new T.TorusGeometry(0.064, 0.03, 12, 28), scarfMat); s2.rotation.x = Math.PI / 2; s2.position.set(0, 0.095, 0.006); neck.add(s2); }
  const tailMesh = mk(new T.BoxGeometry(0.075, 0.36, 0.022, 4, 8, 1), scarfMat, 0, -0.18, 0); tail.add(tailMesh);
  const fringe = mk(new T.BoxGeometry(0.075, 0.03, 0.026), jacketPlain, 0, -0.37, 0); fringe.material = cuffMat; tail.add(fringe);
  } else scarfBuild(S.scarf, { T, mk, ell, std, TX, P, neck, spine, scarfMat, profile });

  // ---------- Head
  const head = new T.Group(); head.position.y = 0.21; neck.add(head);
  const headMesh = buildHead(P, skinMat, skinFlat, lite);
  const surf = surfaceFn(headMesh);
  head.add(headMesh);
  const E = P.eye, Hh = P.head;

  // ears
  const earInner = std({ color: shadeHex(P.skin, 0.8), roughness: 0.7 });
  [-1, 1].forEach((s) => {
    const ex0 = Hh.rx * (1 + Hh.cheek * 0.4 + Hh.cranium * 0.3);
    const ear = ell(1, 0.0105, 0.031, 0.019, skinFlat, s * (ex0 + 0.002), -0.004, -0.006, 14, 10); ear.rotation.y = s * 0.45; head.add(ear);
    if (!lite) { const inner = ell(1, 0.004, 0.02, 0.011, earInner, s * (ex0 + 0.0075), -0.004, -0.004, 8, 6); inner.rotation.y = s * 0.45; head.add(inner); }
  });

  // painted anime face (open + blink variants swapped on the head material)
  let faceOv = null;
  if (opts.variant) {
    const ic = new T.Color(P.eye.iris), hexOf = (c) => '#' + c.getHexString();
    faceOv = { size: lite ? [768, 384] : null, style: { skin: '#' + P.skin.toString(16).padStart(6, '0'), irisMid: hexOf(ic), irisTop: hexOf(ic.clone().multiplyScalar(0.4)), irisBot: hexOf(ic.clone().lerp(new T.Color(0xffffff), 0.65)), browCol: '#' + new T.Color(P.brow.color).getHexString() } };
  }
  const faceOpen = keep(paintFace(kind, headMesh, false, faceOv)), faceBlink = lite ? faceOpen : keep(paintFace(kind, headMesh, true, faceOv));
  skinMat.map = faceOpen; skinMat.needsUpdate = true;

  // hair (female bob + fringe) / bald (male)
  if (P.hair) {
    const hx = TX.hair(P.hair.color);
    const hairMat = std({ map: hx.map, side: T.DoubleSide });
    const short = P.hair.style === 'short';
    const prof = [[0.0, -0.126], [0.066, -0.118], [0.086, -0.1], [0.094, -0.07], [0.094, -0.02], [0.092, 0.03], [0.085, 0.07], [0.068, 0.103], [0.04, 0.122], [0.0, 0.132]]
      .map(([r, y]) => new T.Vector2(r, y));
    const smooth = new T.SplineCurve(prof).getPoints(40).map((v) => new T.Vector2(Math.max(0.0005, v.x), v.y));
    const open = (short ? 0.4 : 0.34) * Math.PI;
    const shell = new T.Mesh(new T.LatheGeometry(short ? smooth.filter((q) => q.y > -0.012) : smooth, 48, open, Math.PI * 2 - open * 2), hairMat);
    shell.scale.set(1, 1, 1.2); shell.position.z = -0.004; head.add(shell);
    const topPts = smooth.filter((q) => q.y > (short ? 0.082 : 0.062));
    const fringe = new T.Mesh(new T.LatheGeometry(topPts, 32, -open - 0.04, open * 2 + 0.08), hairMat);
    fringe.scale.set(1.02, 1, 1.22); fringe.position.z = -0.004; fringe.rotation.z = 0.06; head.add(fringe);
    // side-swept strands falling toward the cheeks
    if (!short) [-1, 1].forEach((s) => {
      const st = mk(new T.CylinderGeometry(0.004, 0.0015, 0.1, 6), hairMat, s * 0.072, -0.02, surf(s * 0.072, -0.02) + 0.012); st.rotation.z = s * 0.12; head.add(st);
    });
  }

  // knit beanie
  if (P.hat && S.hat !== 'beanie') hatBuild(S.hat, { T, mk, ell, std, TX, P, head });
  else if (P.hat) {
    const hk = TX.knit(P.hat.color, 2, 2), hatMat = std({ map: hk.map });
    const cap = new T.Mesh(new T.SphereGeometry(0.106, 18, 12, 0, Math.PI * 2, 0, 1.5), hatMat); cap.scale.set(0.97, 1, 1.1); cap.position.set(0, 0.03, -0.004); head.add(cap);
    const rim = new T.Mesh(new T.TorusGeometry(0.103, 0.017, 8, 22), hatMat); rim.scale.set(0.98, 1.1, 1); rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.0385, -0.004); head.add(rim);
    head.add(ell(1, 0.04, 0.04, 0.04, hatMat, 0, 0.14, -0.004, 10, 8));
  }

  // glasses
  if (P.glasses) {
    const fm = std({ noOutline: true, color: 0x1c1717, metalness: 0.35, roughness: 0.32, envMapIntensity: 0.9 });
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
  }

  head.rotation.x = 0; head.scale.setScalar(1.18);

  // ---------- Animation
  const FOOT = 0.16, L1 = 0.41, L2 = 0.36;
  const sstep = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  // Knee flex that keeps a grounded blade on the ice for a given thigh angle and hip-to-ankle height.
  const ikKnee = (th, H) => Math.max(0.03, Math.acos(clamp((H - L1 * Math.cos(th)) / L2, -1, 1)) - th);

  function pose(p, t) {
    const onIce = p.mode === 'skate', ok = p.state === 'ok';
    const sf = clamp(p.speed / 12, 0, 1), f = p.fallAmt, calm = 1 - f;
    const amp = clamp(p.strideAmp, 0, 1), s = p.stride;
    const wob = p.b * calm + (p.spin ? 0.25 : 0), w = clamp(p.speed / 4.6, 0, 1);
    const braking = ok && onIce ? clamp(p.brake * clamp(p.speed / 3, 0, 1), 0, 1) : 0;
    let tL, tR, kL, kR, yL = 0, yR = 0, aL = 0, aR = 0, rL = 0, rR = 0;
    let hipsY = 0, shift = 0, roll = 0, twist = 0, armStroke = 0, crouchLean = 0, hl = 0.74;
    const skating = ok && onIce;
    if (skating) {
      // Hip-to-ankle height: deeper crouch with speed and when braking. Grounded legs are solved by IK.
      const H = lerp(0.75, 0.6, clamp(0.35 + sf * 0.4 + braking * 0.35, 0, 1));
      const u = clamp(p.strokeT, 0, 1), left = p.strokeLeg === 0, side = left ? 1 : -1;
      const base = -0.18, sw = Math.sin(Math.PI * u) * amp;
      const e1 = sstep(u / 0.5), e2 = sstep((u - 0.5) / 0.5);
      // Pushing leg: drives back and out with the blade turned out, then lifts and recovers under the body.
      let tp = u < 0.5 ? lerp(base, 0.46, e1) : lerp(0.46, base, e2);
      let abdP = u < 0.5 ? lerp(0.04, 0.3, e1) : lerp(0.3, 0.04, e2);
      let yawP = u < 0.5 ? lerp(0, 0.6, e1) : lerp(0.6, 0, e2);
      const lift = u < 0.5 ? 0 : Math.pow(Math.sin(Math.PI * e2), 0.8) * amp;
      let ts = base - 0.06 * Math.sin(Math.PI * u);
      tp = lerp(base, tp, amp); ts = lerp(base, ts, amp); abdP = lerp(0.04, abdP, amp); yawP *= amp;
      const kP = lerp(ikKnee(tp, H), 0.95, lift), kS = ikKnee(ts, H);
      const edgeP = (u < 0.5 ? e1 : 1 - e2) * amp;
      if (left) { tL = tp; kL = kP; yL = yawP; aL = abdP; rL = 0.15 * edgeP; tR = ts; kR = kS; aR = -0.04; }
      else { tR = tp; kR = kP; yR = -yawP; aR = -abdP; rR = -0.15 * edgeP; tL = ts; kL = kS; aL = 0.04; }
      // Weight shift toward the gliding leg, torso counter-twist, opposite arm swings forward.
      shift = -side * 0.055 * sw; roll = side * 0.07 * sw; twist = side * 0.09 * sw; armStroke = side * 0.45 * sw;
      // Snowplow when braking: toes in, knees wider and deeper, weight back.
      yL -= 0.6 * braking; yR += 0.6 * braking; aL += 0.1 * braking; aR -= 0.1 * braking; crouchLean = -0.18 * braking;
      // Edge the blades into a turn.
      const edge = p.steer * 0.2 * sf; rL += edge; rR += edge;
      hipsY = FOOT + H; hl = H;
    } else if (ok) {
      tL = -0.04 + Math.sin(s) * 0.55 * w; tR = -0.04 - Math.sin(s) * 0.55 * w;
      kL = 0.08 + Math.max(0, Math.cos(s)) * 0.8 * w; kR = 0.08 + Math.max(0, -Math.cos(s)) * 0.8 * w;
    } else { tL = tR = -0.1 - f * 0.1; kL = kR = 0.25 + f * 0.35; }
    const wobL = Math.sin(t * 9) * wob * 0.12; tL += wobL; tR -= wobL;
    // sitting (bench): thighs forward, shins down; blended in by p.sitAmt
    const sa = clamp(p.sitAmt || 0, 0, 1), ea = clamp(p.eatAmt || 0, 0, 1);
    if (sa > 0.001) {
      tL = lerp(tL, -1.25, sa); tR = lerp(tR, -1.25, sa); kL = lerp(kL, 1.35, sa); kR = lerp(kR, 1.35, sa);
      yL *= 1 - sa; yR *= 1 - sa; rL *= 1 - sa; rR *= 1 - sa; aL = lerp(aL, 0.05, sa); aR = lerp(aR, -0.05, sa);
    }
    legL.hip.rotation.set(tL, yL, aL, 'YXZ'); legR.hip.rotation.set(tR, yR, aR, 'YXZ');
    legL.knee.rotation.x = kL; legR.knee.rotation.x = kR;
    legL.ankle.rotation.set(-(tL + kL), 0, rL); legR.ankle.rotation.set(-(tR + kR), 0, rR);
    if (!skating) {
      const l = L1 * Math.cos(tL) + L2 * Math.cos(tL + kL), r = L1 * Math.cos(tR) + L2 * Math.cos(tR + kR);
      hl = Math.max(l, r); hipsY = FOOT + hl - 0.002;
    }
    if (sa > 0.001) hipsY = lerp(hipsY, 0.77, sa); // pelvis rests on the bench seat, shins hang a little
    hips.position.y = hipsY; hips.position.x = shift;

    const lean = ((onIce ? 0.1 + sf * 0.3 : 0.05) * calm + crouchLean + 0.18 * (hl < 0.74 ? (0.74 - hl) * 1.6 : 0)) * (1 - sa * 0.8);
    spine.rotation.x = lean + Math.cos(t * 7) * wob * 0.14;
    spine.rotation.z = (Math.sin(t * 9) * wob * 0.28 + p.steer * clamp(p.speed / 9, 0, 1) * 0.35 + roll) * calm;
    spine.rotation.y = (-p.steer * clamp(p.speed / 9, 0, 1) * 0.12 + twist) * calm;
    const breathe = Math.sin(t * 1.7) * 0.004;
    spine.scale.set(1 + breathe, 1 + breathe * 0.6, 1 + breathe);
    neck.rotation.x = -lean * 0.45; head.rotation.x = -lean * 0.4 + Math.sin(t * 0.8) * 0.02 - f * 0.2;
    head.rotation.y = -p.steer * 0.25 * calm - twist * 0.6; head.rotation.z = -spine.rotation.z * 0.5;

    // arms
    const flail = Math.sin(t * 15) * wob * 0.5;
    const swingA = ok && !onIce ? Math.sin(s) * 0.6 * w : 0;
    const fwd = onIce ? 0.35 + sf * 0.15 : 0.1;
    [[armL, 1], [armR, -1]].forEach(([a, side]) => {
      a.sh.rotation.x = (-fwd - side * swingA) * calm + flail * side - f * 1.3 + side * armStroke * calm;
      a.sh.rotation.z = side * (0.13 + wob * 1.0 + braking * 0.35 + f * (0.9 + Math.sin(t * 20) * 0.3));
      a.el.rotation.x = -(0.35 + (onIce ? 0.35 : 0.2) * calm + wob * 0.6) - f * 0.4;
      a.wr.rotation.x = -0.25;
    });
    if (sa > 0.001) [[armL, 1], [armR, -1]].forEach(([a, side]) => { // hands resting on the lap
      a.sh.rotation.x = lerp(a.sh.rotation.x, -0.5, sa); a.sh.rotation.z = lerp(a.sh.rotation.z, side * 0.1, sa);
      a.el.rotation.x = lerp(a.el.rotation.x, -1.0, sa); a.wr.rotation.x = lerp(a.wr.rotation.x, -0.15, sa);
    });
    if (ea > 0.001) { // right hand lifts the cup / bun to the mouth
      armR.sh.rotation.x = lerp(armR.sh.rotation.x, -1.3, ea); armR.sh.rotation.z = lerp(armR.sh.rotation.z, 0.66, ea);
      armR.el.rotation.x = lerp(armR.el.rotation.x, -2.12, ea); armR.wr.rotation.x = lerp(armR.wr.rotation.x, -0.2, ea);
      head.rotation.x -= 0.1 * ea;
    }
    cup.visible = ea > 0.01 && p.eatItem === 'cup'; bun.visible = ea > 0.01 && p.eatItem === 'bun';
    // scarf tail streams behind
    tail.rotation.x = 0.08 + sf * 1.05 + Math.sin(t * 8) * 0.08 * sf + f * 0.4;
    tail.rotation.z = Math.sin(t * 6 + 1) * 0.1 * sf;

    // blink
    const ph = (t + 0.7) % 3.7; const bl = ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : 0;
    const want = bl > 0.35 ? faceBlink : faceOpen; if (skinMat.map !== want) skinMat.map = want;

    body.rotation.x = p.fallDir * f * 1.5;
    body.rotation.y = p.spinAng || 0;
    body.position.y = f * 0.16;
  }
  function place(p) { root.position.set(p.x, (p.y || 0) + (p.mode === 'skate' ? 0.06 : 0), p.z); root.rotation.y = p.h; }
  function dispose() {
    root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    disposables.forEach((d) => { if (d.dispose) d.dispose(); });
  }
  addOutlines(root);
  return { root, pose, place, dispose, kind, height: 1.77 * P.scale, faceY: 1.64 * P.scale };
}

// Timelines for the sit / eat animations (works on the player and on NPC state objects).
const ss = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export function stepActions(p, dt) {
  const goal = p.sitting ? 1 : 0, cur = p.sitAmt || 0;
  p.sitAmt = cur < goal ? Math.min(goal, cur + dt / 0.4) : Math.max(goal, cur - dt / 0.4);
  if (p.eatT !== undefined && p.eatT >= 0) {
    p.eatT += dt;
    if (p.eatT >= 3.4) { p.eatT = -1; p.eatAmt = 0; p.eatItem = null; }
    else { const c = p.eatT % 1.7; p.eatAmt = ss(c / 0.5) * (1 - ss((c - 1.1) / 0.5)); }
  }
}
export function startEat(p, item) { p.eatT = 0; p.eatItem = item; p.eatAmt = 0; }

function shadeHex(n, k) {
  const r = Math.min(255, ((n >> 16) & 255) * k) | 0, g = Math.min(255, ((n >> 8) & 255) * k) | 0, b = Math.min(255, (n & 255) * k) | 0;
  return (r << 16) | (g << 8) | b;
}
