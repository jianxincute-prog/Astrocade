// Realistic skinned character (rigged glTF human, Mixamo skeleton) driven by the same pose system.
// A hidden procedural "driver" rig (render/character.js, noMesh) evaluates every clip/blend; each
// frame its joint orientations are retargeted onto the model's bones (calibrated arms-down rest),
// and the model's motion-captured Run/Walk clips are blended in for locomotion.
import { Character, addRim } from './character.js';
import { groundCorrection } from '../logic/physics.js';

const MAP = {
  'Hips': 'hips', 'Spine': 'spine', 'Spine1': 'spine', 'Spine2': 'chest',
  'Neck': 'neck', 'Head': 'head',
  'LeftShoulder': 'chest', 'LeftArm': 'lSh', 'LeftForeArm': 'lEl', 'LeftHand': 'lEl',
  'RightShoulder': 'chest', 'RightArm': 'rSh', 'RightForeArm': 'rEl', 'RightHand': 'rEl',
  'LeftUpLeg': 'lHip', 'LeftLeg': 'lKn', 'LeftFoot': 'lAn', 'LeftToeBase': 'lAn',
  'RightUpLeg': 'rHip', 'RightLeg': 'rKn', 'RightFoot': 'rAn', 'RightToeBase': 'rAn',
};
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];

/** Loads the glTF once and prepares calibration data shared by every instance. */
export async function loadFighterModel(T, url) {
  const loader = new T.GLTFLoader();
  const gltf = await new Promise((res, rej) => loader.load(url, res, undefined, rej));
  return { gltf, texCache: new Map() };
}

function recolorTexture(T, tex, mode, color, cache) {
  if (mode === 'original') return tex;
  const key = mode + ':' + color;
  if (cache.has(key)) return cache.get(key);
  const img = tex.image;
  const w = img.width, h = img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, w, h), p = d.data;
  const tc = new T.Color(color);
  const tr = tc.r * 255, tg = tc.g * 255, tb = tc.b * 255;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2];
    const L = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    if (mode === 'player') {
      // dark tactical armour with a hint of warm leather
      const v = Math.pow(L, 1.15) * 0.62;
      p[i] = Math.min(255, v * 255 * 1.05); p[i + 1] = v * 255 * 0.97; p[i + 2] = v * 255 * 0.92;
    } else {
      const k = 0.35 + L * 1.6;
      p[i] = Math.min(255, tr * k * 0.85 + r * 0.15);
      p[i + 1] = Math.min(255, tg * k * 0.85 + g * 0.15);
      p[i + 2] = Math.min(255, tb * k * 0.85 + b * 0.15);
    }
  }
  x.putImageData(d, 0, 0);
  const t = new T.CanvasTexture(c);
  t.flipY = tex.flipY; t.encoding = tex.encoding; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

export class SkinnedCharacter {
  /**
   * opts: { model (from loadFighterModel), look:'player'|'gang', tint, height, scale, rim, xray,
   *         weapon, bandana, shades } — driver accessories (weapon/bandana/shades) render on the rig.
   */
  constructor(T, opts) {
    this.T = T;
    this.opts = opts;
    this.group = new T.Group();
    this.driver = new Character(T, {
      noMesh: true, accHead: false, weapon: opts.weapon,
      // optional sculpted head (bald enforcer) replacing the model's helmet
      ...(opts.head ? { ...opts.head, headMeshes: true, detail: 'high', rim: opts.rim } : { detail: 'low' }),
    });
    this.group.add(this.driver.group); // accessories (bats/pipes) ride on driver fists
    this.joints = this.driver.joints;
    this.mats = [];
    this.flash = 0;

    const src = opts.model.gltf;
    const root = T.SkeletonUtils.clone(src.scene);
    this.model = root;
    this.wrap = new T.Group();
    this.wrap.add(root);
    this.group.add(this.wrap);

    // materials: clone per instance (hit flash), recolor, hide visor so the face shows
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.frustumCulled = false;
      if (/visor/i.test(o.name)) { o.visible = false; return; }
      const m = o.material.clone();
      if (m.map) m.map = recolorTexture(T, m.map, opts.look, opts.tint || 0xffffff, opts.model.texCache);
      m.roughness = 0.65; m.metalness = 0.1;
      if (opts.look === 'player' && Character.env) { m.envMap = Character.env; m.envMapIntensity = 0.35; } // faint studio sheen on the armour
      if (opts.rim) addRim(m, opts.rim, opts.look === 'player' ? 0.3 : 0.22);
      o.material = m;
      this.mats.push(m);
    });

    this.calibrate();
    const s = (opts.scale || 1);
    this.group.scale.set(s, s, s);
    this.prepareSoleAnchors();
    if (opts.xray) this.addXray(opts.xray);

    // motion-captured locomotion clips
    this.mixer = new T.AnimationMixer(root);
    const clip = (n) => src.animations.find((a) => a.name === n);
    this.run = clip('Run') ? this.mixer.clipAction(clip('Run')) : null;
    this.walk = clip('Walk') ? this.mixer.clipAction(clip('Walk')) : null;
    for (const a of [this.run, this.walk]) if (a) { a.play(); a.setEffectiveWeight(0); }
    this.locoW = 0;
  }

  calibrate() {
    const T = this.T, root = this.model;
    root.updateMatrixWorld(true);
    const bones = [];
    root.traverse((o) => { if (o.isBone) bones.push(o); });
    this.bones = bones;
    const bn = (b) => b.name.replace(/^mixamorig:?/, '');
    const byName = {}; root.traverse((o) => { if (o.name) byName[bn(o)] = o; }); bones.forEach((b) => (byName[bn(b)] = b));
    this.byName = byName;
    const wpos = (b) => new T.Vector3().setFromMatrixPosition(b.matrixWorld);
    const hips = byName['Hips'];
    // facing: our rig faces +z with its left side on +x
    const lx = wpos(byName['LeftArm']).x, rx = wpos(byName['RightArm']).x;
    if (lx < rx) { root.rotation.y += Math.PI; root.updateMatrixWorld(true); }
    // scale so hip height matches the driver rig (1.02) * height factor
    const hipY = wpos(hips).y - new T.Vector3().setFromMatrixPosition(root.matrixWorld).y;
    const k = 1.02 / hipY;
    this.wrap.scale.setScalar(k);
    this.wrap.updateMatrixWorld(true);
    // world (wrapper-space) rest quaternions
    const restQ = new Map();
    const wq = (b) => new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(b.matrixWorld));
    bones.forEach((b) => restQ.set(b, wq(b)));
    // rotate arms/legs so the calibration rest = our zero pose (limbs hanging straight down)
    const down = new T.Vector3(0, -1, 0);
    const straighten = (a, bName) => {
      const A = byName[a], B = byName[bName];
      const pa = wpos(A), pb = wpos(B);
      const dir = pb.sub(pa).normalize();
      const q = new T.Quaternion().setFromUnitVectors(dir, down);
      // apply to A and its descendants in world space
      const pq = A.parent.getWorldQuaternion(new T.Quaternion());
      const aw = A.getWorldQuaternion(new T.Quaternion());
      const nw = q.clone().multiply(aw);
      A.quaternion.copy(pq.invert().multiply(nw));
      A.updateMatrixWorld(true);
    };
    for (const s of ['Left', 'Right']) {
      straighten(`${s}Arm`, `${s}ForeArm`);
      straighten(`${s}ForeArm`, `${s}Hand`);
      straighten(`${s}UpLeg`, `${s}Leg`);
      straighten(`${s}Leg`, `${s}Foot`);
    }
    // wrapper-space orientation of each bone in the "zero pose" -> B0
    const inv = new T.Quaternion();
    this.group.updateMatrixWorld(true);
    const groupQInv = this.group.getWorldQuaternion(new T.Quaternion()).invert();
    this.B0 = new Map();
    bones.forEach((b) => this.B0.set(b, groupQInv.clone().multiply(b.getWorldQuaternion(new T.Quaternion()))));
    void inv; void restQ;
    // hips parent transform (for position retarget) in group space
    this.hipsParent = hips.parent;
    this.hips = hips;
    this.hipRestLocal = hips.position.clone();
    // rest local quats (for unmapped bones such as fingers)
    this.restLocal = new Map();
    bones.forEach((b) => this.restLocal.set(b, b.quaternion.clone()));
    // fist curl: find per finger the local axis/sign that curls the tip toward the palm
    this.curl = [];
    for (const s of ['Left', 'Right']) {
      const hand = byName[`${s}Hand`];
      for (const f of FINGERS) {
        const segs = [1, 2, 3].map((i) => byName[`${s}Hand${f}${i}`]).filter((b) => b && b.isBone);
        const last = segs[segs.length - 1];
        const tip = byName[`${s}Hand${f}4`] || (last && last.children[0]) || last;
        if (!segs.length || !tip) continue;
        segs.forEach((b) => { if (!this.restLocal.has(b)) this.restLocal.set(b, b.quaternion.clone()); });
        const handP = wpos(hand);
        let best = null;
        for (const ax of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
          const axis = new T.Vector3(...ax);
          const amt = f === 'Thumb' ? 0.5 : 1.2;
          segs.forEach((b) => b.quaternion.copy(this.restLocal.get(b)).multiply(new T.Quaternion().setFromAxisAngle(axis, amt)));
          hand.updateMatrixWorld(true);
          const d = wpos(tip).distanceTo(handP);
          if (!best || d < best.d) best = { d, axis, amt };
          segs.forEach((b) => b.quaternion.copy(this.restLocal.get(b)));
        }
        hand.updateMatrixWorld(true);
        segs.forEach((b) => this.curl.push({ b, q: this.restLocal.get(b).clone().multiply(new T.Quaternion().setFromAxisAngle(best.axis, best.amt)) }));
      }
    }
    // driver joint lookup per bone, hierarchical order already (traverse is depth-first)
    this.mapped = bones.map((b) => ({ b, j: MAP[bn(b)] ? this.joints[MAP[bn(b)]] : null }));
    this.k = k;
    // swap the model's helmet for the sculpted head: collapse the head bone, move the rig head onto it
    if (this.opts.head) {
      this.headBone = byName['Head'];
      this.group.updateMatrixWorld(true);
      const hb = wpos(this.headBone);
      const hj = this.joints.head;
      const hjw = new T.Vector3().setFromMatrixPosition(hj.matrixWorld);
      const d = hb.sub(hjw);
      hj.position.add(d.multiplyScalar(1 / (this.driver.group.scale.x || 1)));
      hj.position.y -= 0.04;
      for (const m of this.driver.mats) this.mats.push(m);
      this.driver.headMesh.traverse((o) => { if (o.isMesh) o.renderOrder = 2; });
      this.driver.headMesh.scale.setScalar(0.94);
      // the sculpted head rides on the model's final head bone (after mocap blending), not on the
      // driver rig — otherwise it drifts away from the neck while the motion-captured run plays
      this.headB0Inv = this.B0.get(this.headBone).clone().invert();
      this.headOffset = new T.Vector3(0, -0.04, 0);
      this.group.add(this.driver.headMesh);
      this.pinHead();
    }
  }

  /** Place the sculpted head exactly on the model's Head bone (group space). */
  pinHead() {
    const T = this.T, h = this.driver.headMesh;
    const P = this._pin || (this._pin = { v: new T.Vector3(), q: new T.Quaternion(), gq: new T.Quaternion() });
    this.headBone.updateWorldMatrix(true, false);
    this.headBone.getWorldPosition(P.v);
    this.group.worldToLocal(P.v);
    this.headBone.getWorldQuaternion(P.q);
    this.group.getWorldQuaternion(P.gq).invert();
    P.q.premultiply(P.gq).multiply(this.headB0Inv);
    h.quaternion.copy(P.q);
    h.position.copy(this.headOffset).applyQuaternion(P.q).add(P.v);
  }

  /** Find actual sole vertices once, then follow those points on the animated toe bones. */
  prepareSoleAnchors() {
    const T = this.T;
    const bottoms = { Left: { y: Infinity }, Right: { y: Infinity } };
    const toeBones = { Left: this.byName.LeftToeBase || this.byName.LeftFoot, Right: this.byName.RightToeBase || this.byName.RightFoot };
    this.group.updateMatrixWorld(true);
    for (const side of ['Left', 'Right']) {
      const bone = toeBones[side];
      if (bone) { const p = bone.getWorldPosition(new T.Vector3()); this.group.worldToLocal(p); bottoms[side].sign = Math.sign(p.x) || (side === 'Left' ? 1 : -1); }
    }
    for (const b of this.bones) b.updateMatrixWorld(true);
    this.model.traverse((m) => {
      if (!m.isSkinnedMesh || !m.geometry.attributes.position) return;
      m.skeleton.update();
      const pos = m.geometry.attributes.position;
      const v = new T.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        if (m.applyBoneTransform) m.applyBoneTransform(i, v);
        else if (m.boneTransform) m.boneTransform(i, v);
        m.localToWorld(v);
        this.group.worldToLocal(v);
        if (v.y > 0.24 || Math.abs(v.x) < 0.035) continue;
        const side = v.x * bottoms.Left.sign > 0 ? 'Left' : 'Right';
        if (v.y < bottoms[side].y) bottoms[side] = { ...bottoms[side], y: v.y, p: v.clone() };
      }
    });
    this.soleAnchors = [];
    for (const side of ['Left', 'Right']) {
      const a = bottoms[side], bone = toeBones[side];
      if (!a.p || !bone) continue;
      const world = this.group.localToWorld(a.p.clone());
      bone.updateWorldMatrix(true, false);
      bone.worldToLocal(world);
      this.soleAnchors.push({ bone, local: world, side, bindY: a.y });
    }
    this.group.updateMatrixWorld(true);
  }

  /** Lift only when the actual skinned shoe sole would penetrate the current surface. */
  alignSoles(groundY) {
    if (!this.soleAnchors || !this.soleAnchors.length || !Number.isFinite(groundY)) return;
    this.group.updateMatrixWorld(true);
    let lowest = Infinity;
    const p = this._soleWorld || (this._soleWorld = new this.T.Vector3());
    for (const a of this.soleAnchors) {
      p.copy(a.local);
      a.bone.localToWorld(p);
      lowest = Math.min(lowest, p.y);
    }
    const correction = groundCorrection(groundY, lowest);
    if (correction > 0) {
      this.group.position.y += correction;
      this.group.updateMatrixWorld(true);
    }
  }

  addXray(color) {
    const T = this.T;
    const xm = new T.MeshBasicMaterial({ color, depthFunc: T.GreaterDepth, depthWrite: false });
    const list = [];
    this.model.traverse((o) => { if (o.isSkinnedMesh && o.visible) list.push(o); });
    for (const m of list) {
      const x = new T.SkinnedMesh(m.geometry, xm);
      x.bind(m.skeleton, m.bindMatrix);
      x.position.copy(m.position); x.quaternion.copy(m.quaternion); x.scale.copy(m.scale);
      x.frustumCulled = false;
      x.renderOrder = 1; m.renderOrder = 2;
      m.parent.add(x);
    }
  }

  update(dt, state) {
    const T = this.T;
    // 1) evaluate procedural pose on the driver rig
    this.driver.update(dt, state);
    const actionActive = !!state.clip;
    const sp = state.moveSpeed || 0;
    // 2) mocap locomotion weight (only when free-moving)
    const target = actionActive ? 0 : Math.min(1, sp / 2.5);
    this.locoW += (target - this.locoW) * Math.min(1, dt * 10);
    if (this.run) {
      const runK = Math.min(1, Math.max(0, (sp - 2.5) / 3));
      this.run.setEffectiveWeight(runK);
      if (this.walk) this.walk.setEffectiveWeight(1 - runK);
      this.run.timeScale = Math.max(0.6, sp / 6.5);
      if (this.walk) this.walk.timeScale = Math.max(0.6, sp / 2.2);
      this.mixer.update(dt);
    }
    // stash mocap result
    const w = this.run ? this.locoW : 0;
    if (w > 0.001) {
      if (!this.mocapQ) this.mocapQ = this.bones.map(() => new T.Quaternion());
      this.bones.forEach((b, i) => this.mocapQ[i].copy(b.quaternion));
      (this.mocapHip || (this.mocapHip = new T.Vector3())).copy(this.hips.position);
    }
    // 3) retarget driver joints -> bones (preallocated, parents processed before children)
    const g = this.driver.group;
    this.group.updateMatrixWorld(true);
    const S = this._s || (this._s = {
      gInv: new T.Matrix4(), m4: new T.Matrix4(), r4: new T.Matrix4(), tq: new T.Quaternion(), pq: new T.Quaternion(),
      gq: new T.Quaternion(), hpQ: new T.Quaternion(), v: new T.Vector3(),
      world: this.bones.map(() => new T.Quaternion()),
      parentIdx: this.bones.map((b) => this.bones.indexOf(b.parent)),
    });
    S.gInv.copy(g.matrixWorld).invert();
    this.group.getWorldQuaternion(S.gq).invert();
    this.hipsParent.getWorldQuaternion(S.hpQ);
    S.hpQ.premultiply(S.gq);
    for (let i = 0; i < this.mapped.length; i++) {
      const { b, j } = this.mapped[i];
      const pi = S.parentIdx[i];
      const parentQ = pi >= 0 ? S.world[pi] : S.hpQ;
      if (j) {
        S.m4.multiplyMatrices(S.gInv, j.matrixWorld);
        S.r4.extractRotation(S.m4);
        S.tq.setFromRotationMatrix(S.r4).multiply(this.B0.get(b));
        b.quaternion.copy(S.pq.copy(parentQ).invert().multiply(S.tq));
      } else {
        b.quaternion.copy(this.restLocal.get(b));
      }
      S.world[i].copy(parentQ).multiply(b.quaternion);
    }
    for (const c of this.curl) c.b.quaternion.copy(c.q);
    if (this.headBone) this.headBone.scale.setScalar(0.001);
    // hips position from the driver pelvis
    S.m4.multiplyMatrices(S.gInv, this.joints.hips.matrixWorld);
    S.v.setFromMatrixPosition(S.m4);
    this.group.localToWorld(S.v);
    this.hipsParent.worldToLocal(S.v);
    this.hips.position.copy(S.v);
    // 4) blend toward mocap locomotion
    if (w > 0.001) {
      this.bones.forEach((b, i) => {
        if (/Hand(Thumb|Index|Middle|Ring|Pinky)/.test(b.name)) return; // keep fists
        b.quaternion.slerp(this.mocapQ[i], w);
      });
      this.hips.position.lerp(this.mocapHip, w);
    }
    if (this.headBone) this.pinHead();
    this.alignSoles(state.groundY);
    // hit flash
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt);
      const k = this.flash / 0.15;
      for (const m of this.mats) m.emissive.setRGB(k * 0.9, k * 0.25, k * 0.15);
    }
  }

  hitFlash() { this.flash = 0.15; }

  setOpacity(a) {
    for (const m of this.mats) { m.transparent = a < 1; m.opacity = a; }
  }
}
