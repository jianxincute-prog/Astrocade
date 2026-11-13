// Procedural articulated 3D character (Three.js) driven by pose data from logic/anim.js.
// Anatomy is sculpted from lathe-profiled limbs/torso (V-taper chest, tapered muscles), layered
// muscle masses (deltoids, biceps, triceps, pecs, traps, lats, calves), detailed head/face,
// hands with knuckles, combat boots, and clothing details. Player uses a 'high' detail level
// (physical skin, tattoo, hand wraps, rim light, x-ray silhouette); enemies use 'low'.
import {
  zeroPose, blendPoses, blendPosesAngular, sampleClip, idlePose, idleGestures, locomotionPose,
  stridePhaseRate, CLIPS,
} from '../logic/anim.js';
import { buildHeadGeometry, buildHairGeometry } from './headmesh.js';
import { BAT_LEN, batWoodGeometry, batTapeGeometry, batNailsGeometry, pipeBodyGeometry, pipeTapeGeometry, woodTexture, tapeTexture, steelTexture } from './weapons.js';
import { wolfEarGeometry, clawGeometry, maneGeometry, hornGeometry, spinesGeometry, hoodGeometry, hoodTexture } from './bossgear.js';
import { chestGeometry, absGeometry, neckGeometry, upperArmGeometry, foreArmGeometry, thighGeometry, shinGeometry, fistGeometry, shoeGeometry } from './bodymesh.js';

const MIRROR = { rSh: 1, rEl: 1, rHip: 1, rKn: 1, rAn: 1 };
const GEO = new Map();
const TEX = new Map();

function cached(map, key, fn) {
  if (!map.has(key)) map.set(key, fn());
  return map.get(key);
}

/** Limb profile hanging down from its joint: y 0 -> -L. Radii in local units. */
function limbProfile(T, L, rTop, rMid, rBot, midAt, n = 12) {
  const pts = [new T.Vector2(0, -L - rBot * 0.55)];
  pts.push(new T.Vector2(rBot * 0.7, -L - rBot * 0.35));
  for (let i = 0; i <= n; i++) {
    const s = 1 - i / n; // 1 = bottom, 0 = top
    let r;
    if (s < midAt) r = rTop + (rMid - rTop) * Math.sin((s / midAt) * Math.PI / 2);
    else { const k = (s - midAt) / (1 - midAt); r = rMid + (rBot - rMid) * (1 - Math.cos(k * Math.PI)) / 2; }
    pts.push(new T.Vector2(r, -s * L));
  }
  pts.push(new T.Vector2(rTop * 0.7, rTop * 0.4));
  pts.push(new T.Vector2(0, rTop * 0.6));
  return pts;
}

/** Per-vertex gloss (attribute aGloss, 0..1): shiny where 1 — lowers roughness and scales the clearcoat. */
function addGloss(mat) {
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGloss;\nvarying float vGloss;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGloss = aGloss;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGloss;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, roughnessFactor * 0.3, vGloss);')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= vGloss;\n#endif');
  };
  mat.customProgramCacheKey = () => prevKey + 'gloss';
}

/** Hair material: discards pixels whose interpolated hair weight (aGloss) is low -> a smooth, curved hairline. */
function addHairCut(mat) {
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGloss;\nvarying float vHairW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHairW = aGloss;');
    sh.fragmentShader = 'varying float vHairW;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', 'if ( vHairW < 0.32 ) discard;\n#include <map_fragment>');
  };
  mat.customProgramCacheKey = () => prevKey + 'haircut';
}

/**
 * Chest shader extras, evaluated per pixel from the object-space position (razor-clean edges, no extra meshes):
 *  - skinMap: skin vs knit zones for a tank top (V-neck, traps/shoulders, straps)
 *  - accent: painted jacket zipper stripes down the front
 */
function addChestShader(mat, { skinMap, bulk, accent }) {
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.skinBulk = { value: bulk };
    if (skinMap) sh.uniforms.skinMap = { value: skinMap };
    if (accent !== undefined && accent !== null) sh.uniforms.accentColor = { value: new mat.color.constructor(accent) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSkinPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSkinPos = position;');
    let body = '  vec4 fabC = texture2D( map, vUv );\n';
    if (skinMap) {
      body += '  vec4 skinC = texture2D( skinMap, vUv );\n' +
        '  float skE = pow( vSkinPos.x / ( 0.1 * skinBulk ), 2.0 ) + pow( ( vSkinPos.y - 0.3 ) / 0.072, 2.0 );\n' +
        '  float skV = ( 1.0 - smoothstep( 0.6, 1.15, skE ) ) * smoothstep( 0.0, 0.05, vSkinPos.z );\n' +
        '  float skT = smoothstep( 0.305, 0.34, vSkinPos.y );\n' +
        '  float skS = ( 1.0 - smoothstep( 0.018, 0.04, abs( abs( vSkinPos.x ) - 0.1 * skinBulk ) ) ) * smoothstep( 0.27, 0.31, vSkinPos.y );\n' +
        '  fabC = mix( fabC, skinC, max( skV, skT ) * ( 1.0 - skS ) );\n';
    }
    if (accent !== undefined && accent !== null) {
      body += '  float acS = ( 1.0 - smoothstep( 0.012, 0.02, abs( abs( vSkinPos.x ) - 0.05 ) ) ) * smoothstep( 0.0, 0.03, vSkinPos.z ) * smoothstep( -0.05, -0.02, vSkinPos.y ) * ( 1.0 - smoothstep( 0.27, 0.31, vSkinPos.y ) );\n' +
        '  fabC.rgb = mix( fabC.rgb, accentColor, acS );\n';
    }
    sh.fragmentShader = (skinMap ? 'uniform sampler2D skinMap;\n' : '') + 'uniform float skinBulk;\n' + (accent !== undefined && accent !== null ? 'uniform vec3 accentColor;\n' : '') + 'varying vec3 vSkinPos;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', '#ifdef USE_MAP\n' + body + '  diffuseColor *= fabC;\n#endif');
  };
  mat.customProgramCacheKey = () => prevKey + 'chest' + bulk + (skinMap ? 's' : '') + (accent !== undefined && accent !== null ? 'a' + accent : '');
}

/** Inject a fresnel rim light so the silhouette pops against the city. */
export function addRim(mat, color, strength) {
  mat.userData.rim = { value: new mat.color.constructor(color) };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = mat.userData.rim;
    sh.uniforms.rimStrength = { value: strength };
    sh.fragmentShader = 'uniform vec3 rimColor;\nuniform float rimStrength;\n' + sh.fragmentShader.replace(
      '#include <output_fragment>',
      'float rimF = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.6);\n' +
      'outgoingLight += rimColor * rimF * rimStrength;\n#include <output_fragment>');
  };
  mat.customProgramCacheKey = () => 'rim' + strength;
}

/** Merge small indexed geometries into one (positions/normals/uvs). */
function mergeGeos(T, list) {
  const pos = [], nor = [], uv = [], idx = [];
  let off = 0;
  for (const g of list) {
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u.getX(i), u.getY(i)); }
    const ix = g.index;
    for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off);
    off += p.count;
  }
  const m = new T.BufferGeometry();
  m.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  m.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  m.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  m.setIndex(idx);
  return m;
}

/**
 * opts: { skin, top, topSleeves, fullSleeves, pants, shoes, hair, bulk, scale, accent, beard, weapon,
 *         shades, mohawk, bandana, gloves, scar, detail:'high'|'low', tattoo, wraps, rim, xray }
 */
export class Character {
  /** Prefiltered studio environment (set by the game once the renderer exists) for glossy skin. */
  static env = null;

  constructor(THREE, opts = {}) {
    this.T = THREE;
    this.opts = opts;
    this.hi = opts.detail === 'high';
    this.seg = this.hi ? 40 : 14;
    this.mats = [];
    this.joints = {};
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.pivot.rotation.order = 'YXZ';
    this.group.add(this.pivot);
    this.build();
    if (opts.xray) this.addXray(opts.xray);
    const s = opts.scale || 1;
    this.group.scale.set(s, s, s);
    this.out = zeroPose();
    this.snapshot = zeroPose();
    this.basePose = zeroPose();
    this.actPose = zeroPose();
    this.tmp = zeroPose();
    this.fade = 1; this.fadeDur = 0.08;
    this.source = 'base';
    this.phase = 0; this.time = Math.random() * 10; this.runW = 0;
    this.flash = 0;
  }

  // ---------------------------------------------------------------- materials / helpers
  mat(color, rough = 0.7, extra = {}, physical = false) {
    const T = this.T;
    const m = physical && this.hi
      ? new T.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, ...extra })
      : new T.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
    if (physical && this.hi && Character.env) { m.envMap = Character.env; m.envMapIntensity = extra.envMapIntensity ?? 0.4; }
    if (this.opts.rim) addRim(m, this.opts.rim, this.hi ? 0.28 : 0.22);
    this.mats.push(m);
    return m;
  }

  geo(key, fn) { return cached(GEO, key + ':' + this.seg, fn); }

  sphere() { return this.geo('sph', () => new this.T.SphereGeometry(1, this.hi ? 40 : 12, this.hi ? 28 : 9)); }

  lathe(key, pts) { return this.geo('lathe:' + key, () => new this.T.LatheGeometry(pts(), this.seg)); }

  limb(key, L, a, b, c, mid) { return this.lathe(key, () => limbProfile(this.T, L, a, b, c, mid, this.hi ? 24 : 12)); }

  mesh(geo, mat, parent, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    if (this.opts.noMesh && !this.acc) {
      // driver-only rig (skinned model follows the joints): keep transforms, skip geometry
      const d = new this.T.Object3D();
      d.position.set(x, y, z); d.scale.set(sx, sy, sz); d.rotation.set(rx, ry, rz);
      return d;
    }
    const m = new this.T.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  blob(mat, parent, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    return this.mesh(this.sphere(), mat, parent, x, y, z, sx, sy, sz, rx, ry, rz);
  }

  joint(name, parent, x, y, z) {
    const g = new this.T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    this.joints[name] = g;
    return g;
  }

  skinTexture(tattoo) {
    const T = this.T, base = this.opts.skin || 0xc28a62, hi = this.hi;
    return cached(TEX, 'skin' + base + (tattoo ? 't' : '') + (hi ? 'h' : ''), () => {
      const S = hi ? 512 : 256;
      const c = document.createElement('canvas'); c.width = c.height = S;
      const x = c.getContext('2d');
      x.scale(S / 256, S / 256); // everything below is authored on a 256 grid
      const col = new T.Color(base);
      x.fillStyle = '#' + col.getHexString(); x.fillRect(0, 0, 256, 256);
      if (hi) {
        // soft mottling: warm / cool blotches so the skin is never one flat tone
        for (let i = 0; i < 70; i++) {
          const px = Math.random() * 256, py = Math.random() * 256, pr = 14 + Math.random() * 34;
          const g = x.createRadialGradient(px, py, 0, px, py, pr);
          const warm = Math.random() < 0.5;
          g.addColorStop(0, warm ? 'rgba(200,90,60,0.07)' : 'rgba(255,225,190,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          x.fillStyle = g; x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
        }
      }
      for (let i = 0; i < (hi ? 5200 : 2600); i++) {
        x.fillStyle = `rgba(${Math.random() < 0.5 ? '90,40,20' : '255,220,190'},${Math.random() * 0.06})`;
        x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
      if (hi) {
        // pores: tiny darker pits + the odd freckle
        for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(70,32,18,${0.04 + Math.random() * 0.07})`; x.fillRect(Math.random() * 256, Math.random() * 256, 0.8, 0.8); }
        for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(110,60,35,${0.05 + Math.random() * 0.08})`; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, 0.8 + Math.random() * 1.2, 0, 6.3); x.fill(); }
      }
      if (tattoo) {
        // tribal band wrapped around the upper arm (lathe: u around, v along length)
        x.fillStyle = 'rgba(18,22,28,0.88)';
        for (let k = 0; k < 4; k++) {
          const ox = k * 64;
          x.beginPath();
          x.moveTo(ox, 150);
          x.bezierCurveTo(ox + 20, 110, ox + 50, 120, ox + 64, 90);
          x.bezierCurveTo(ox + 52, 135, ox + 30, 140, ox + 40, 175);
          x.bezierCurveTo(ox + 22, 160, ox + 10, 170, ox, 190);
          x.closePath(); x.fill();
          x.beginPath(); x.moveTo(ox + 10, 205); x.quadraticCurveTo(ox + 40, 185, ox + 60, 210); x.lineTo(ox + 50, 215); x.quadraticCurveTo(ox + 35, 200, ox + 14, 214); x.fill();
        }
        x.fillRect(0, 196, 256, 4);
        x.fillRect(0, 84, 256, 3);
      }
      const t = new T.CanvasTexture(c);
      if (T.sRGBEncoding) t.encoding = T.sRGBEncoding;
      t.anisotropy = 4;
      return t;
    });
  }

  /** Fine skin relief (pores / micro wrinkles) for the head's bump map. */
  bumpTexture() {
    const T = this.T;
    return cached(TEX, 'bump', () => {
      const c = document.createElement('canvas'); c.width = c.height = 512;
      const x = c.getContext('2d');
      x.fillStyle = '#808080'; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 22000; i++) { const v = 90 + Math.random() * 70; x.fillStyle = `rgba(${v},${v},${v},0.55)`; x.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5); }
      for (let i = 0; i < 700; i++) { x.strokeStyle = `rgba(60,60,60,${0.05 + Math.random() * 0.07})`; x.lineWidth = 1; x.beginPath(); const px = Math.random() * 512, py = Math.random() * 512; x.moveTo(px, py); x.lineTo(px + (Math.random() - 0.5) * 22, py + (Math.random() - 0.5) * 22); x.stroke(); }
      return new T.CanvasTexture(c);
    });
  }

  /** Eyeball: veined sclera, ringed brown iris, black pupil. Iris faces +z (u .25, v .5 on a sphere). */
  eyeTexture() {
    const T = this.T;
    return cached(TEX, 'eye', () => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128;
      const x = c.getContext('2d');
      x.fillStyle = '#ece4d8'; x.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(190,70,60,${0.05 + Math.random() * 0.1})`; x.lineWidth = 0.6; x.beginPath(); const a = Math.random() * 6.28, r0 = 24 + Math.random() * 14; x.moveTo(64 + Math.cos(a) * r0, 64 + Math.sin(a) * r0); x.lineTo(64 + Math.cos(a + 0.2) * (r0 + 12 + Math.random() * 18), 64 + Math.sin(a + 0.2) * (r0 + 12 + Math.random() * 18)); x.stroke(); }
      const ir = 20;
      let g = x.createRadialGradient(64, 64, 2, 64, 64, ir);
      g.addColorStop(0, '#0a0604'); g.addColorStop(0.32, '#2a170c'); g.addColorStop(0.62, '#6b4220'); g.addColorStop(0.9, '#3a2412'); g.addColorStop(1, '#120a05');
      x.fillStyle = g; x.beginPath(); x.arc(64, 64, ir, 0, 6.3); x.fill();
      for (let i = 0; i < 40; i++) { const a = (i / 40) * 6.283; x.strokeStyle = `rgba(190,140,80,${0.12 + Math.random() * 0.12})`; x.lineWidth = 0.7; x.beginPath(); x.moveTo(64 + Math.cos(a) * 7, 64 + Math.sin(a) * 7); x.lineTo(64 + Math.cos(a) * (ir - 2), 64 + Math.sin(a) * (ir - 2)); x.stroke(); }
      x.fillStyle = '#030201'; x.beginPath(); x.arc(64, 64, 7.5, 0, 6.3); x.fill();
      const t = new T.CanvasTexture(c);
      if (T.sRGBEncoding) t.encoding = T.sRGBEncoding;
      return t;
    });
  }

  /** Fine vertical hair strands (neutral grey; tinted by the hair colour). */
  hairTexture() {
    const T = this.T;
    return cached(TEX, 'hair', () => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const x = c.getContext('2d');
      x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { const v = 90 + Math.random() * 150; x.strokeStyle = `rgba(${v},${v},${v},0.5)`; x.lineWidth = 0.7 + Math.random() * 1.1; x.beginPath(); const px = Math.random() * 256, py = Math.random() * 256; x.moveTo(px, py); x.lineTo(px + (Math.random() - 0.5) * 6, py + 26 + Math.random() * 60); x.stroke(); }
      const t = new T.CanvasTexture(c);
      t.wrapS = t.wrapT = T.RepeatWrapping;
      if (T.sRGBEncoding) t.encoding = T.sRGBEncoding;
      return t;
    });
  }

  /** Mohawk: a ridge of tapered spikes following the skull from forehead to nape, merged into one mesh. */
  mohawkGeometry() {
    const T = this.T;
    return this.geo('mohawk', () => {
      const list = [], n = 15;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1), a = 1.0 + (-1.2 - 1.0) * k;               // front -> back over the crown
        const nx = 0, ny = Math.cos(a), nz = Math.sin(a);
        const h = 0.07 + 0.035 * Math.sin(i * 1.9) ** 2 + 0.03 * Math.sin(k * Math.PI);
        const dir = new T.Vector3(0, ny, nz - 0.28).normalize();
        const base = new T.Vector3(0, 0.135 + 0.135 * ny, -0.01 + 0.138 * nz);
        const g = new T.ConeGeometry(0.021, h, 8, 1);
        const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
        const m = new T.Matrix4().compose(base.clone().addScaledVector(dir, h * 0.5 - 0.012), q, new T.Vector3(0.38, 1, 1));
        g.applyMatrix4(m);
        list.push(g);
        void nx;
      }
      return mergeGeos(T, list);
    });
  }

  /** The head's own material: vertex-coloured skin, pore bump, soft sheen, glossy clearcoat crown. */
  headMaterial() {
    const hi = this.hi;
    if (!hi) return this.mat(0xffffff, 0.6, { map: this.skinTexture(false), vertexColors: true });
    const m = this.mat(0xffffff, 0.52, {
      color: new this.T.Color(1.22, 1.14, 1.08), // lifts the textured skin to match the body
      map: this.skinTexture(false), vertexColors: true, bumpMap: this.bumpTexture(), bumpScale: 0.02,
      clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.35, sheenRoughness: 0.55, sheenColor: new this.T.Color(0xffb596), envMapIntensity: 0.55,
    }, true);
    addGloss(m);
    return m;
  }

  fabricTexture(color, kind) {
    const T = this.T;
    return cached(TEX, 'fab' + color + kind, () => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d');
      x.fillStyle = '#' + new T.Color(color).getHexString(); x.fillRect(0, 0, 128, 128);
      if (kind === 'denim') {
        for (let i = 0; i < 128; i += 2) { x.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.04})`; x.fillRect(0, i, 128, 1); }
        for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(200,210,230,${Math.random() * 0.08})`; x.fillRect(Math.random() * 128, Math.random() * 128, 3, 1); }
        x.fillStyle = 'rgba(210,170,90,0.5)'; x.fillRect(0, 0, 1, 128); x.fillRect(64, 0, 1, 128); // seams
      } else {
        for (let i = 0; i < 128; i += 3) { x.fillStyle = `rgba(255,255,255,${0.025 + Math.random() * 0.02})`; x.fillRect(i, 0, 1, 128); }
      }
      const t = new T.CanvasTexture(c);
      t.wrapS = t.wrapT = T.RepeatWrapping;
      if (T.sRGBEncoding) t.encoding = T.sRGBEncoding;
      return t;
    });
  }

  // ---------------------------------------------------------------- body
  build() {
    const T = this.T, o = this.opts, hi = this.hi;
    const bulk = o.bulk || 1, lb = Math.sqrt(bulk);
    const skinCol = o.skin || 0xc28a62;
    const skin = this.mat(0xffffff, 0.55, { map: this.skinTexture(false) }, true);
    const tatSkin = o.tattoo ? this.mat(0xffffff, 0.55, { map: this.skinTexture(true) }, true) : skin;
    void skinCol;
    const top = this.mat(0xffffff, 0.88, { map: this.fabricTexture(o.top || 0x1b1b1d, 'knit'), color: 0xffffff });
    const pantsTex = this.fabricTexture(o.pants || 0x2c3442, 'denim');
    const pants = this.mat(0xffffff, 0.92, { map: pantsTex });
    const shoes = this.mat(o.shoes || 0x151515, 0.55);
    const sole = this.mat(0x0d0d0d, 0.9);
    const metal = this.mat(0xb8b8b8, 0.3, { metalness: 0.9 });
    const leather = this.mat(0x1a1310, 0.5);
    const sleeves = o.topSleeves;
    const armMat = sleeves ? top : skin;
    // player-grade body: smooth sculpted segments instead of a lathe + overlapping muscle ellipsoids
    const smooth = !o.noMesh;           // player AND enemies; enemies use half-resolution meshes
    const sg = hi ? 0.8 : 0.35;
    const shoeMat = smooth ? this.mat(o.shoes || 0x151515, 0.55, { vertexColors: true }) : shoes;
    let chestMat = top;
    if (smooth && (!sleeves || o.accent)) {
      // own chest material (arms keep the plain fabric): tank-top skin zones and/or painted zipper stripes
      chestMat = this.mat(0xffffff, 0.88, { map: this.fabricTexture(o.top || 0x1b1b1d, 'knit'), color: 0xffffff });
      addChestShader(chestMat, { skinMap: sleeves ? null : this.skinTexture(false), bulk, accent: sleeves ? o.accent : null });
    }

    // center-of-mass pivot sits 0.45 above the pelvis
    this.pivot.position.y = 1.47;
    const pelvis = this.joint('hips', this.pivot, 0, -0.45, 0);
    const pelvisGeo = this.lathe('pelvis', () => [[0, -0.13], [0.11, -0.12], [0.18, -0.06], [0.195, 0.02], [0.185, 0.1], [0.17, 0.15], [0, 0.16]].map(([r, y]) => new T.Vector2(r, y)));
    this.mesh(pelvisGeo, pants, pelvis, 0, 0, 0, bulk * 0.95, 1, 0.74 * bulk);
    // belt + buckle
    this.mesh(this.geo('belt', () => new T.CylinderGeometry(1, 1, 1, this.seg, 1, true)), leather, pelvis, 0, 0.125, 0, 0.178 * bulk, 0.05, 0.132 * bulk);
    this.mesh(this.geo('box', () => new T.BoxGeometry(1, 1, 1)), metal, pelvis, 0, 0.125, 0.133 * bulk, 0.06, 0.04, 0.012);

    // abdomen (spine)
    const spine = this.joint('spine', pelvis, 0, 0.08, 0);
    if (smooth) this.mesh(absGeometry(T, { bulk, seg: sg }), top, spine, 0, 0, 0);
    else {
    const absGeo = this.lathe('abs', () => [[0, -0.03], [0.165, -0.02], [0.16, 0.08], [0.172, 0.18], [0.195, 0.28], [0, 0.31]].map(([r, y]) => new T.Vector2(r, y)));
    this.mesh(absGeo, top, spine, 0, 0, 0, bulk, 1, 0.74 * bulk);
    // obliques
    this.blob(top, spine, 0.12 * bulk, 0.14, 0, 0.045 * bulk, 0.12, 0.085 * bulk);
    this.blob(top, spine, -0.12 * bulk, 0.14, 0, 0.045 * bulk, 0.12, 0.085 * bulk);
    }

    // chest: V-taper ribcage
    const chest = this.joint('chest', spine, 0, 0.28, 0);
    if (smooth) this.mesh(chestGeometry(T, { bulk, skinMix: !sleeves, seg: sg }), chestMat, chest, 0, 0, 0);
    else {
    const chestGeo = this.lathe('chest', () => [[0, -0.07], [0.19, -0.06], [0.205, 0.02], [0.24, 0.12], [0.268, 0.21], [0.262, 0.27], [0.225, 0.32], [0.14, 0.36], [0, 0.375]].map(([r, y]) => new T.Vector2(r, y)));
    this.mesh(chestGeo, top, chest, 0, 0, 0, bulk, 1, 0.62 * bulk);
    // pecs (pushed forward), lats (flare under arms), upper back
    this.blob(top, chest, 0.1 * bulk, 0.19, 0.105 * bulk, 0.12 * bulk, 0.085, 0.07 * bulk, 0, 0, -0.15);
    this.blob(top, chest, -0.1 * bulk, 0.19, 0.105 * bulk, 0.12 * bulk, 0.085, 0.07 * bulk, 0, 0, 0.15);
    this.blob(top, chest, 0.19 * bulk, 0.12, -0.02, 0.06 * bulk, 0.15, 0.11 * bulk, 0, 0, 0.2);
    this.blob(top, chest, -0.19 * bulk, 0.12, -0.02, 0.06 * bulk, 0.15, 0.11 * bulk, 0, 0, -0.2);
    this.blob(top, chest, 0, 0.2, -0.1 * bulk, 0.2 * bulk, 0.12, 0.07 * bulk);
    }
    if (!sleeves) {
      if (!smooth) {
      // tank top: skin shows on the upper chest (V-neck), traps and shoulders; straps over the traps
      this.blob(skin, chest, 0, 0.3, 0.085 * bulk, 0.1 * bulk, 0.065, 0.05 * bulk);
      this.blob(skin, chest, 0.12 * bulk, 0.33, -0.02, 0.13 * bulk, 0.06, 0.1 * bulk, 0, 0, -0.38); // traps
      this.blob(skin, chest, -0.12 * bulk, 0.33, -0.02, 0.13 * bulk, 0.06, 0.1 * bulk, 0, 0, 0.38);
      this.blob(top, chest, 0.1 * bulk, 0.335, 0.0, 0.035 * bulk, 0.05, 0.105 * bulk, 0, 0, -0.38); // straps
      this.blob(top, chest, -0.1 * bulk, 0.335, 0.0, 0.035 * bulk, 0.05, 0.105 * bulk, 0, 0, 0.38);
      }
    } else {
      if (!smooth) {
      this.blob(top, chest, 0.12 * bulk, 0.32, -0.02, 0.13 * bulk, 0.065, 0.1 * bulk, 0, 0, -0.38);
      this.blob(top, chest, -0.12 * bulk, 0.32, -0.02, 0.13 * bulk, 0.065, 0.1 * bulk, 0, 0, 0.38);
      }
      if (o.accent) {
        const acc = this.mat(o.accent, 0.6);
        // jacket zipper stripes / collar
        if (!smooth) {
        this.mesh(this.geo('box', () => new T.BoxGeometry(1, 1, 1)), acc, chest, 0.05, 0.12, 0.165 * bulk, 0.035, 0.38, 0.02);
        this.mesh(this.geo('box', () => new T.BoxGeometry(1, 1, 1)), acc, chest, -0.05, 0.12, 0.165 * bulk, 0.035, 0.38, 0.02);
        }
        this.mesh(this.geo('collar', () => new T.TorusGeometry(1, 0.25, 12, Math.max(this.seg, 32))), acc, chest, 0, 0.35, 0, 0.11 * bulk, 0.09 * bulk, 0.11, Math.PI / 2);
      }
    }

    // neck: thick, tapered, with sternocleidomastoid lines
    const neck = this.joint('neck', chest, 0, 0.33, 0);
    if (smooth) this.mesh(neckGeometry(T, { bulk, seg: sg }), skin, neck, 0, 0, 0);
    else this.mesh(this.limb('neck', 0.13, 0.072, 0.08, 0.09, 0.5), skin, neck, 0, 0.12, 0.0, bulk * 0.95, 1, bulk * 0.92);
    if (o.flair === 'wolf') this.mesh(maneGeometry(T, bulk), this.mat(0x3a1512, 0.95), neck, 0, 0.0, 0);                       // wolf mane
    // cobra hood: rides on the neck (not the head), so it stays flared whichever way the head tilts
    if (o.flair === 'cobra') this.mesh(hoodGeometry(T), this.mat(0xffffff, 0.55, { map: hoodTexture(T), metalness: 0.15 }), neck, 0, 0.135, -0.095, 1, 1, 1, -0.08, 0, 0);
    if (o.flair === 'dragon') this.mesh(spinesGeometry(T, bulk), this.mat(0x17324a, 0.4, { metalness: 0.55 }), chest, 0, 0.09, 0); // dorsal spines
    if (hi && !smooth) {
      this.blob(skin, neck, 0.035 * bulk, 0.05, 0.045, 0.022, 0.075, 0.02, 0.35, 0, 0.25);
      this.blob(skin, neck, -0.035 * bulk, 0.05, 0.045, 0.022, 0.075, 0.02, 0.35, 0, -0.25);
    }
    const head = this.joint('head', neck, 0, 0.11, 0.01);
    const headMesh = new T.Group(); headMesh.scale.setScalar(this.hi ? 1.1 : 1.04); head.add(headMesh);
    const prevAcc = this.acc; if (o.headMeshes) this.acc = true;
    this.buildHead(headMesh, skin);
    this.acc = prevAcc;
    this.headMesh = headMesh;

    // arms (muscle mass scales a bit less than the torso so proportions stay human)
    const ab = 1 + (bulk - 1) * 0.55;
    for (const side of ['l', 'r']) {
      const sx = side === 'l' ? 1 : -1;
      const sh = this.joint(side + 'Sh', chest, sx * 0.31 * bulk, 0.22, 0);
      const upper = side === 'l' && !sleeves ? tatSkin : armMat;
      if (smooth) this.mesh(upperArmGeometry(T, { ab, side: sx, seg: sg }), upper, sh, 0, 0, 0); // deltoid + biceps + triceps melted in
      else {
      this.blob(armMat, sh, sx * 0.012, -0.03, 0, 0.088 * ab, 0.1 * ab, 0.092 * ab); // deltoid cap
      this.mesh(this.limb('upperArm' + ab, 0.32, 0.085 * ab, 0.093 * ab, 0.064 * ab, 0.45), upper, sh, 0, 0, 0, 1, 1, 0.95);
      this.blob(armMat, sh, 0, -0.17, 0.035 * ab, 0.068 * ab, 0.1, 0.065 * ab); // biceps
      this.blob(armMat, sh, 0, -0.13, -0.038 * ab, 0.07 * ab, 0.12, 0.06 * ab); // triceps
      }
      const el = this.joint(side + 'El', sh, 0, -0.32, 0);
      const foreMat = sleeves && o.fullSleeves ? top : skin;
      if (smooth) this.mesh(foreArmGeometry(T, { ab, side: sx, seg: sg }), foreMat, el, 0, 0, 0); // elbow + brachioradialis melted in
      else {
      this.blob(foreMat, el, 0, 0, 0, 0.066 * ab, 0.06, 0.066 * ab); // elbow
      this.mesh(this.limb('foreArm' + ab, 0.28, 0.068 * ab, 0.074 * ab, 0.047 * ab, 0.25), foreMat, el, 0, 0, 0);
      this.blob(foreMat, el, sx * 0.02 * ab, -0.08, 0.02, 0.05 * ab, 0.09, 0.05 * ab); // brachioradialis
      }
      if (o.wraps) this.mesh(this.geo('wrap', () => new T.CylinderGeometry(1, 1.05, 1, this.seg)), this.mat(0xe8e2d4, 0.95), el, 0, -0.255, 0, 0.051 * ab, 0.08, 0.051 * ab);
      const fist = new T.Group();
      fist.position.set(0, -0.31, 0.0);
      el.add(fist);
      this.buildFist(fist, o.gloves ? this.mat(o.gloves, 0.5) : skin, ab, sx, !!o.wraps);
      if (o.flair === 'wolf') this.mesh(clawGeometry(T), this.mat(0xcfd6de, 0.25, { metalness: 0.9 }), fist, 0, 0, 0); // steel claws
      this.acc = true;
      if (side === 'r' && o.weapon === 'bat') {
        // turned wood bat: knob, neck, barrel, spiral grip tape (+ brass nails on the spiked variant); axis y -> +z
        const wood = this.mat(0xffffff, 0.6, { map: woodTexture(T) });
        const tape = this.mat(0xffffff, 0.85, { map: tapeTexture(T, '#e8e3d4', '#1b1b1e', 'bat') });
        const seg = this.hi ? 32 : 20, put = (g, m) => this.mesh(g, m, fist, 0, -0.02, -0.13, 1, 1, 1, Math.PI / 2, 0, 0);
        put(this.geo('batWood', () => batWoodGeometry(T, seg)), wood);
        put(this.geo('batTape', () => batTapeGeometry(T, seg)), tape);
        if (o.nails) put(this.geo('batNails', () => batNailsGeometry(T)), this.mat(0xb8903a, 0.33, { metalness: 0.85 }));
        void BAT_LEN;
      }
      if (side === 'r' && o.weapon === 'pipe') {
        // weathered steel pipe: threaded coupling, domed end cap, cloth-wrapped grip, rust
        const steel = this.mat(0xffffff, 0.38, { map: steelTexture(T), metalness: 0.7 });
        const cloth = this.mat(0xffffff, 0.9, { map: tapeTexture(T, '#3b3b40', '#151517', 'pipe'), side: T.DoubleSide });
        const seg = this.hi ? 28 : 18, put = (g, m) => this.mesh(g, m, fist, 0, -0.02, -0.13, 1, 1, 1, Math.PI / 2, 0, 0);
        put(this.geo('pipeBody', () => pipeBodyGeometry(T, seg)), steel);
        put(this.geo('pipeTape', () => pipeTapeGeometry(T, seg)), cloth);
      }
      this.acc = false;
      if (side === 'l') this.fistL = fist; else this.fistR = fist;
    }

    // legs
    for (const side of ['l', 'r']) {
      const sx = side === 'l' ? 1 : -1;
      const hip = this.joint(side + 'Hip', pelvis, sx * 0.11 * bulk, -0.03, 0);
      if (smooth) this.mesh(thighGeometry(T, { lb, side: sx, seg: sg }), pants, hip, 0, 0, 0); // quads melted in
      else {
      this.mesh(this.limb('thigh' + bulk, 0.47, 0.12 * lb, 0.122 * lb, 0.078 * lb, 0.3), pants, hip, 0, 0, 0);
      this.blob(pants, hip, sx * 0.02, -0.2, 0.045 * lb, 0.08 * lb, 0.16, 0.07 * lb); // quads
      }
      const kn = this.joint(side + 'Kn', hip, 0, -0.47, 0);
      if (smooth) this.mesh(shinGeometry(T, { lb, seg: sg }), pants, kn, 0, 0, 0); // knee + calf melted in
      else {
      this.blob(pants, kn, 0, 0, 0.01, 0.078 * lb, 0.07, 0.08 * lb);
      this.mesh(this.limb('shin' + bulk, 0.45, 0.078 * lb, 0.082 * lb, 0.056 * lb, 0.3), pants, kn, 0, 0, 0);
      this.blob(pants, kn, 0, -0.14, -0.04 * lb, 0.065 * lb, 0.12, 0.055 * lb); // calf
      }
      // combat boot shaft
      this.mesh(this.geo('bootShaft', () => new T.CylinderGeometry(1, 1.08, 1, this.seg)), shoes, kn, 0, -0.37, 0, 0.068 * lb, 0.16, 0.072 * lb);
      if (hi) this.mesh(this.geo('lace', () => new T.TorusGeometry(1, 0.18, 6, this.seg)), sole, kn, 0, -0.32, 0, 0.07 * lb, 0.074 * lb, 0.07, Math.PI / 2);
      const an = this.joint(side + 'An', kn, 0, -0.45, 0);
      if (smooth) this.mesh(shoeGeometry(T, { hi }), shoeMat, an, 0, 0, 0); // foot, toe cap, heel and sole as one shoe
      else {
      this.blob(shoes, an, 0, -0.025, 0.02, 0.075, 0.07, 0.11); // foot body
      this.blob(shoes, an, 0, -0.045, 0.12, 0.068, 0.052, 0.075); // toe cap
      this.blob(sole, an, 0, -0.082, 0.06, 0.07, 0.02, 0.15);
      }
    }
  }

  buildFist(fist, mat, bulk, sx, wraps) {
    const b = Math.min(1.25, bulk);
    if (!this.opts.noMesh) {
      // one sculpted clenched fist (palm, knuckles, folded fingers, thumb across them) + hand wrap band
      this.mesh(fistGeometry(this.T, { b, side: sx, hi: this.hi }), mat, fist, 0, 0, 0);
      if (this.hi) {
        const wrapMat = wraps ? this.mat(0xe8e2d4, 0.95) : mat;
        this.mesh(this.geo('fistBand', () => new this.T.CylinderGeometry(1, 1.05, 1, 28, 1, true)), wrapMat, fist, 0, -0.04, 0.012, 0.061 * b, 0.034, 0.057 * b);
      }
      return;
    }
    this.blob(mat, fist, 0, -0.01, 0, 0.055 * b, 0.065, 0.05 * b); // palm/back of hand
    // four curled fingers / knuckle row facing forward in the fist direction (-y)
    for (let k = 0; k < 4; k++) {
      const x = (-0.033 + k * 0.022) * b;
      this.blob(mat, fist, x, -0.06, 0.018, 0.016 * b, 0.02, 0.022 * b);
    }
    if (this.hi) this.blob(wraps ? this.mat(0xe8e2d4, 0.95) : mat, fist, 0, -0.035, 0.005, 0.056 * b, 0.02, 0.05 * b); // wrap band over knuckles
    this.blob(mat, fist, -sx * 0.045 * b, -0.03, 0.03, 0.017, 0.035, 0.018, 0.4, 0, sx * 0.5); // thumb
  }

  buildHead(head, skin) {
    const T = this.T, o = this.opts, hi = this.hi;
    const box = this.geo('box', () => new T.BoxGeometry(1, 1, 1));
    const skipGeo = this.opts.noMesh && !this.acc; // driver-only rig: keep joints, skip geometry
    if (!skipGeo) {
      // one smooth sculpted skull / face (brows, stubble, lips, scar are painted vertex colours)
      const geo = buildHeadGeometry(T, { hi, beard: !!o.beard, scar: !!(o.scar && hi) });
      this.mesh(geo, this.headMaterial(), head, 0, 0, 0);
      // eyes: wet, textured eyeballs sitting in the carved lid openings
      const eyeGeo = this.geo('eye', () => new T.SphereGeometry(1, hi ? 36 : 12, hi ? 26 : 8));
      const eyeMat = this.mat(0xffffff, 0.25, { map: this.eyeTexture(), ...(hi ? { clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.1 } : {}) }, true);
      for (const sx of [1, -1]) this.mesh(eyeGeo, eyeMat, head, sx * 0.0445, 0.135, 0.108, 0.0195, 0.0195, 0.0195, 0, 0, 0);
      // ears: smooth disc with a raised helix rim and a darker inner bowl
      const earGeo = this.geo('ear', () => new T.SphereGeometry(1, hi ? 28 : 10, hi ? 20 : 8));
      const rimGeo = this.geo('earRim', () => new T.TorusGeometry(1, 0.2, hi ? 10 : 6, hi ? 28 : 12, Math.PI * 1.75));
      const inner = hi ? this.mat(0x6e4130, 0.75) : null;
      for (const sx of [1, -1]) {
        this.mesh(earGeo, skin, head, sx * 0.116, 0.115, -0.005, 0.011, 0.036, 0.025, 0, 0, sx * -0.12);
        if (hi) {
          this.mesh(rimGeo, skin, head, sx * 0.121, 0.116, -0.004, 0.0045, 0.0295, 0.0215, 0, sx * Math.PI / 2, sx * 0.1).rotation.z += Math.PI * 0.12;
          this.mesh(earGeo, inner, head, sx * 0.119, 0.113, 0.001, 0.0045, 0.02, 0.013);
        }
      }
      if (hi) this.yawnMouth = this.blob(this.mat(0x1a0909, 0.95, { side: T.DoubleSide }), head, 0, 0.0575, 0.136, 0.026, 0.003, 0.007);
    }
    if (o.hair) {
      // hair cap with a real hairline (thickness fades to zero) instead of a ball on the skull
      const hm = this.mat(o.hair, 0.92, { map: this.hairTexture(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      addHairCut(hm);
      this.mesh(buildHairGeometry(T, { hi }), hm, head, 0, 0, 0);
    }
    this.acc = !!o.accHead;
    if (o.mohawk) this.mesh(this.mohawkGeometry(), this.mat(o.mohawk, 0.7), head, 0, 0, 0);
    if (o.bandana) {
      const bm = this.mat(o.bandana, 0.7);
      this.mesh(this.geo('band', () => new T.CylinderGeometry(1, 1.02, 1, this.seg, 1, true)), bm, head, 0, 0.18, -0.01, 0.125, 0.045, 0.142);
      this.blob(bm, head, 0, 0.172, -0.139, 0.022, 0.02, 0.016);                                          // knot
      this.mesh(box, bm, head, 0.016, 0.125, -0.15, 0.026, 0.085, 0.006, 0.25, 0, 0.18);                   // tails
      this.mesh(box, bm, head, -0.018, 0.12, -0.152, 0.024, 0.075, 0.006, 0.3, 0, -0.22);
    }
    if (o.shades) {
      // aviator-style shades: glossy tinted lenses in metal rims, arched bridge, double brow bar, hinged temple arms
      const lens = this.mat(0x07080c, 0.06, { metalness: 0.35 });
      const frame = this.mat(0xc7a13a, 0.32, { metalness: 0.85 });
      const glint = this.mat(0xffffff, 0.2, { transparent: true, opacity: 0.3, depthWrite: false });
      const rimGeo = this.geo('lensRim', () => new T.TorusGeometry(1, 0.085, 10, 40));
      const bridgeGeo = this.geo('lensBridge', () => new T.TorusGeometry(1, 0.2, 8, 16, Math.PI));
      const quad = this.geo('lensGlint', () => new T.PlaneGeometry(1, 1));
      for (const sx of [1, -1]) {
        this.blob(lens, head, sx * 0.044, 0.136, 0.1235, 0.0345, 0.0215, 0.011);                                   // lens
        this.mesh(rimGeo, frame, head, sx * 0.044, 0.136, 0.1275, 0.0365, 0.0235, 0.012);                          // metal rim
        this.mesh(quad, glint, head, sx * 0.053, 0.141, 0.1352, 0.005, 0.026, 1, 0, 0, sx * -0.55);                // long reflection streak
        this.mesh(quad, glint, head, sx * 0.037, 0.129, 0.1352, 0.0035, 0.0035, 1, 0, 0, 0.78);                    // small glint
        this.mesh(box, frame, head, sx * 0.0825, 0.139, 0.12, 0.006, 0.008, 0.007);                                // hinge block
        this.mesh(box, frame, head, sx * 0.1005, 0.139, 0.062, 0.0035, 0.0055, 0.118, 0, sx * 0.06, 0);            // temple arm
        this.mesh(box, frame, head, sx * 0.115, 0.131, -0.008, 0.0035, 0.0055, 0.045, -0.5, sx * 0.12, 0);         // tip hooks down behind the ear
        this.blob(frame, head, sx * 0.011, 0.127, 0.131, 0.003, 0.0045, 0.0025);                                    // nose pad
      }
      this.mesh(bridgeGeo, frame, head, 0, 0.1445, 0.1335, 0.0105, 0.0105, 0.0105);                                // arched bridge
      this.mesh(box, frame, head, 0, 0.1555, 0.1345, 0.092, 0.0035, 0.004);                                         // double brow bar
    }
    if (o.flair === 'wolf') {
      const fur = this.mat(0x3a1512, 0.95);
      for (const sx of [1, -1]) this.mesh(wolfEarGeometry(T), fur, head, 0, 0, 0, sx, 1, 1);
    } else if (o.flair === 'dragon') {
      const horn = this.mat(0x232a36, 0.35, { metalness: 0.55 });
      for (const sx of [1, -1]) this.mesh(hornGeometry(T), horn, head, 0, 0, 0, sx, 1, 1);
      const glow = new T.MeshBasicMaterial({ color: 0x8fecff, toneMapped: false });         // not in this.mats: the hit flash must not wipe it
      for (const sx of [1, -1]) this.mesh(box, glow, head, sx * 0.044, 0.137, 0.131, 0.027, 0.0075, 0.006, 0, 0, sx * -0.28);
    }
    this.acc = false;
  }

  /** Solid silhouette drawn only where the character is hidden behind buildings. */
  addXray(color) {
    const T = this.T;
    const xm = new T.MeshBasicMaterial({ color, depthFunc: T.GreaterDepth, depthWrite: false });
    const list = [];
    this.pivot.traverse((m) => { if (m.isMesh) list.push(m); });
    for (const m of list) {
      const x = new T.Mesh(m.geometry.userData.proxy || m.geometry, xm); // low-res twin where available
      x.position.copy(m.position); x.rotation.copy(m.rotation); x.scale.copy(m.scale);
      x.renderOrder = 1;
      m.renderOrder = 2;
      m.parent.add(x);
    }
  }

  // ---------------------------------------------------------------- animation
  /** Begin a transition from the current pose (so every change is a crossfade). */
  transition(dur) {
    for (const j in this.out) { const a = this.out[j], b = this.snapshot[j]; b[0] = a[0]; b[1] = a[1]; b[2] = a[2]; }
    this.fade = 0; this.fadeDur = dur;
  }

  /** state: { moveSpeed, clip (name|null), u (0..1), key (unique per action instance) } */
  update(dt, state) {
    this.time += dt;
    const sp = state.moveSpeed || 0;
    const targetW = Math.min(1, sp / 1.5);
    this.runW += (targetW - this.runW) * Math.min(1, dt * 10);
    this.phase += stridePhaseRate(Math.max(sp, this.runW * 2)) * dt;
    idlePose(this.time, this.tmp);
    const runAmt = Math.min(1, Math.max(0, (sp - 3) / 5));
    locomotionPose(this.phase, runAmt, this.actPose);
    blendPoses(this.tmp, this.actPose, this.runW, this.basePose);

    let src = 'base', target = this.basePose;
    if (state.clip && CLIPS[state.clip]) {
      src = state.clip + ':' + (state.key || 0);
      sampleClip(CLIPS[state.clip], state.u, this.actPose);
      target = this.actPose;
    }
    if (src !== this.source) {
      this.transition(src === 'base' ? 0.16 : 0.07);
      this.source = src;
    }
    this.fade = Math.min(this.fadeDur, this.fade + dt);
    const w = this.fadeDur > 0 ? this.fade / this.fadeDur : 1;
    blendPosesAngular(this.snapshot, target, w * w * (3 - 2 * w), this.out);
    this.apply(this.out);
    if (this.yawnMouth) {
      const yawn = state.clip ? 0 : idleGestures(this.time).yawn; // no yawning mid-attack / mid-call
      this.yawnMouth.scale.y = 0.003 + yawn * 0.022;
      this.yawnMouth.visible = yawn > 0.02;
    }

    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt);
      const k = this.flash / 0.15;
      for (const m of this.mats) m.emissive.setRGB(k * 0.9, k * 0.25, k * 0.15);
      if (this.flash === 0) for (const m of this.mats) m.emissive.setRGB(0, 0, 0);
    }
  }

  apply(p) {
    const J = this.joints;
    for (const name in J) {
      const r = p[name];
      if (!r) continue;
      if (MIRROR[name]) J[name].rotation.set(r[0], -r[1], -r[2]);
      else J[name].rotation.set(r[0], r[1], r[2]);
    }
    this.pivot.rotation.set(p.root[0], p.root[1], p.root[2]);
    this.pivot.position.set(p.rootPos[0], 1.47 + p.rootPos[1], p.rootPos[2]);
  }

  hitFlash() { this.flash = 0.15; }

  setOpacity(a) {
    for (const m of this.mats) {
      if (m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;
      m.transparent = a < 1 || m.userData.baseOpacity < 1;
      m.opacity = a * m.userData.baseOpacity;
    }
  }

  snapToBase() { this.source = 'base'; this.fade = this.fadeDur; }
}
