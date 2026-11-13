// Detailed gang weapons built from smooth lathe profiles (no plain cylinders):
//  - baseball bat: turned wood with knob, neck taper and barrel, spiral grip tape with end rings, brass nails
//  - steel pipe: pipe body with a threaded coupling, end caps, cloth-wrapped grip and rust
// All geometry is authored along +y from the handle end (y = 0) to the tip; the caller rotates it to lie along +z.
import { profileFn } from './bodymesh.js';

const GEO = new Map(), TEX = new Map();
const cached = (map, key, fn) => { if (!map.has(key)) map.set(key, fn()); return map.get(key); };

export const BAT_LEN = 0.95, PIPE_LEN = 0.97;

function lathe(T, pts, seg) { return new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg); }

function merge(T, list) {
  const pos = [], nor = [], uv = [], idx = [];
  let off = 0;
  for (const g of list) {
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u.getX(i), u.getY(i)); }
    for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off);
    off += p.count;
  }
  const m = new T.BufferGeometry();
  m.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  m.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  m.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  m.setIndex(idx);
  return m;
}

// ------------------------------------------------------------------ bat
const batR = profileFn([[0, 0], [0.022, 0.003], [0.031, 0.02], [0.028, 0.04], [0.0195, 0.062], [0.0185, 0.12], [0.0205, 0.3], [0.0285, 0.5], [0.0395, 0.7], [0.0445, 0.82], [0.0448, 0.9], [0.039, 0.94], [0.0, 0.95]]);

/** Wood body: knob, taper, barrel with rounded tip. */
export function batWoodGeometry(T, seg = 32) {
  return cached(GEO, 'batWood' + seg, () => {
    const pts = []; for (let i = 0; i <= 72; i++) { const y = (i / 72) * BAT_LEN; pts.push([batR(y), y]); }
    return lathe(T, pts, seg);
  });
}

/** Spiral-wrapped grip tape (open band) + a raised ring at each end. */
export function batTapeGeometry(T, seg = 32) {
  return cached(GEO, 'batTape' + seg, () => {
    const y0 = 0.068, y1 = 0.31, pts = [];
    for (let i = 0; i <= 24; i++) { const y = y0 + (i / 24) * (y1 - y0); pts.push([batR(y) + 0.0024, y]); }
    const band = lathe(T, pts, seg);
    const ring = (y) => { const g = new T.TorusGeometry(batR(y) + 0.0022, 0.0028, 8, seg); g.rotateX(Math.PI / 2); g.translate(0, y, 0); return g; };
    return merge(T, [band, ring(y0), ring(y1)]);
  });
}

/** Brass nails hammered into the barrel in a spiral (the "spiked bat" variant). */
export function batNailsGeometry(T) {
  return cached(GEO, 'batNails', () => {
    const list = [], n = 11;
    for (let i = 0; i < n; i++) {
      const y = 0.58 + (i / (n - 1)) * 0.3, a = i * 2.4, dir = new T.Vector3(Math.cos(a), 0, Math.sin(a));
      const head = new T.CylinderGeometry(0.0062, 0.0062, 0.0022, 10);          // flat nail head sitting on the wood
      const spike = new T.ConeGeometry(0.0042, 0.02, 8);                         // the point sticking out
      head.translate(0, 0.0011, 0); spike.translate(0, 0.012, 0);
      const g = merge(T, [head, spike]);
      const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      g.applyMatrix4(new T.Matrix4().compose(dir.clone().multiplyScalar(batR(y) - 0.001).setY(y), q, new T.Vector3(1, 1, 1)));
      list.push(g);
    }
    return merge(T, list);
  });
}

// ------------------------------------------------------------------ pipe
/** Steel pipe with a rounded butt plug, a coupling collar with chamfers, thread ridges and a domed end cap. */
export function pipeBodyGeometry(T, seg = 28) {
  return cached(GEO, 'pipeBody' + seg, () => {
    const pts = [[0, 0], [0.021, 0.002], [0.0315, 0.012], [0.0302, 0.03], [0.03, 0.74], [0.0372, 0.752], [0.0392, 0.766], [0.0392, 0.806], [0.0372, 0.82], [0.03, 0.832]];
    for (let y = 0.84; y < 0.93; y += 0.014) { pts.push([0.0338, y], [0.0312, y + 0.007]); }   // thread ridges
    pts.push([0.0338, 0.93], [0.0345, 0.936], [0.03, 0.952], [0.018, 0.966], [0, 0.972]);
    return lathe(T, pts, seg);
  });
}

/** Cloth tape wound around the handle end, with a short loose tail flap. */
export function pipeTapeGeometry(T, seg = 28) {
  return cached(GEO, 'pipeTape' + seg, () => {
    const y0 = 0.045, y1 = 0.3, pts = [];
    for (let i = 0; i <= 20; i++) { const y = y0 + (i / 20) * (y1 - y0); pts.push([0.0322 + 0.0012 * Math.sin((i / 20) * Math.PI), y]); }
    const band = lathe(T, pts, seg);
    const tail = new T.PlaneGeometry(0.016, 0.07, 1, 4);
    tail.rotateY(Math.PI / 2); tail.rotateZ(-0.2); tail.translate(0.036, y1 - 0.03, 0.004);
    return merge(T, [band, tail]);
  });
}

// ------------------------------------------------------------------ textures
/** Turned wood: warm brown with long grain streaks along the bat. */
export function woodTexture(T) {
  return cached(TEX, 'wood', () => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#b07a3e'; x.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 260; i++) { const v = Math.random(); x.strokeStyle = v < 0.5 ? `rgba(70,38,14,${0.1 + Math.random() * 0.22})` : `rgba(235,185,120,${0.08 + Math.random() * 0.14})`; x.lineWidth = 0.6 + Math.random() * 1.8; x.beginPath(); const px = Math.random() * 128; x.moveTo(px, 0); x.bezierCurveTo(px + (Math.random() - 0.5) * 10, 80, px + (Math.random() - 0.5) * 10, 170, px + (Math.random() - 0.5) * 8, 256); x.stroke(); }
    for (let i = 0; i < 6; i++) { const px = Math.random() * 128, py = Math.random() * 256; const g = x.createRadialGradient(px, py, 0, px, py, 7 + Math.random() * 6); g.addColorStop(0, 'rgba(60,30,10,0.45)'); g.addColorStop(1, 'rgba(60,30,10,0)'); x.fillStyle = g; x.fillRect(px - 14, py - 14, 28, 28); }
    const t = new T.CanvasTexture(c); if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
  });
}

/** Diagonal-striped tape so the wrap reads as a spiral. light/dark are CSS colours. */
export function tapeTexture(T, light, dark, key) {
  return cached(TEX, 'tape' + key, () => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = dark; x.fillRect(0, 0, 64, 128);
    x.fillStyle = light;
    for (let k = -4; k < 12; k++) { x.beginPath(); x.moveTo(0, k * 16); x.lineTo(64, k * 16 + 22); x.lineTo(64, k * 16 + 30); x.lineTo(0, k * 16 + 8); x.closePath(); x.fill(); }
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; x.fillRect(Math.random() * 64, Math.random() * 128, 1, 2); }
    const t = new T.CanvasTexture(c); if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 1); t.anisotropy = 4; return t;
  });
}

/** Weathered steel with rust blooms and scratches. */
export function steelTexture(T) {
  return cached(TEX, 'steel', () => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#a9b0b8'; x.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 300; i++) { const v = 120 + Math.random() * 110; x.strokeStyle = `rgba(${v},${v},${v + 6},${0.1 + Math.random() * 0.2})`; x.lineWidth = 0.5 + Math.random() * 1.2; x.beginPath(); const px = Math.random() * 128; x.moveTo(px, 0); x.lineTo(px + (Math.random() - 0.5) * 4, 256); x.stroke(); }
    for (let i = 0; i < 26; i++) { const px = Math.random() * 128, py = Math.random() * 256, r = 6 + Math.random() * 18; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(140,66,24,${0.35 + Math.random() * 0.3})`); g.addColorStop(0.6, 'rgba(110,55,25,0.18)'); g.addColorStop(1, 'rgba(110,55,25,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
    const t = new T.CanvasTexture(c); if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
  });
}
