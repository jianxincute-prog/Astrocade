// Signature gear that makes each boss readable at a glance (all built from tapered, curved spikes — no blobs):
//  wolf   : pointed ears, a spiky mane around the neck, steel claws on both fists
//  dragon : swept-back horns, a ridge of dorsal spines, glowing slit eyes
//  cobra  : a flared patterned hood behind the head
const GEO = new Map(), TEX = new Map();
const cached = (map, key, fn) => { if (!map.has(key)) map.set(key, fn()); return map.get(key); };

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

/** A tapered spike following curve(t) (t 0..1) built from stacked frustums; radius r0 -> r1. */
function curvedSpike(T, curve, r0, r1, n = 8, seg = 8) {
  const parts = [];
  let prev = curve(0);
  for (let i = 1; i <= n; i++) {
    const t = i / n, p = curve(t), d = p.clone().sub(prev), len = d.length();
    const ra = r0 + (r1 - r0) * ((i - 1) / n), rb = r0 + (r1 - r0) * t;
    const g = new T.CylinderGeometry(rb, ra, len * 1.04, seg, 1);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize());
    g.applyMatrix4(new T.Matrix4().compose(prev.clone().add(p).multiplyScalar(0.5), q, new T.Vector3(1, 1, 1)));
    parts.push(g);
    prev = p;
  }
  return parts;
}

const V = (T, x, y, z) => new T.Vector3(x, y, z);

/** One pointed ear (+x side); mirror by scaling x by -1. In head space. */
export function wolfEarGeometry(T) {
  return cached(GEO, 'wolfEar', () => merge(T, curvedSpike(T, (t) => V(T, 0.07 + 0.03 * t, 0.2 + 0.19 * t, -0.015 - 0.035 * t * t), 0.052, 0.004, 6, 10)));
}

/** Three steel claws on a fist (fist space: +z forward, -y toward the knuckles). */
export function clawGeometry(T) {
  return cached(GEO, 'claws', () => {
    const parts = [];
    for (const x of [-0.026, 0, 0.026]) parts.push(...curvedSpike(T, (t) => V(T, x * (1 + 0.25 * t), -0.07 - 0.075 * t * t, 0.04 + 0.27 * t), 0.0125, 0.0015, 6, 8));
    return merge(T, parts);
  });
}

/** Spiky mane ring around the neck base (neck space). */
export function maneGeometry(T, bulk = 1) {
  return cached(GEO, 'mane' + bulk, () => {
    const parts = [];
    for (let row = 0; row < 2; row++) {
      const n = row ? 16 : 24, R = (row ? 0.11 : 0.16) * bulk, y0 = row ? 0.03 : -0.04;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + row * 0.2, dx = Math.sin(a), dz = Math.cos(a);
        if (dz > 0.4) continue;                                  // keep the face and chin clear: the mane frames the sides and back
        const h = 0.1 + 0.05 * ((i * 7) % 3) / 2;
        parts.push(...curvedSpike(T, (t) => V(T, dx * (R + 0.085 * t), y0 + h * t * 0.75 + 0.015 * Math.sin(i), dz * (R * 0.85 + 0.06 * t) - 0.075 * t), 0.028, 0.002, 4, 6));
      }
    }
    return merge(T, parts);
  });
}

/** Swept-back tapered horn (+x side). Head space. */
export function hornGeometry(T) {
  return cached(GEO, 'horn', () => merge(T, curvedSpike(T, (t) => V(T, 0.07 + 0.085 * Math.sin(t * 1.25), 0.225 + 0.2 * t - 0.03 * t * t, -0.02 - 0.17 * t * t), 0.034, 0.003, 9, 10)));
}

/** Dorsal spine ridge down the upper back (chest space). */
export function spinesGeometry(T, bulk = 1) {
  return cached(GEO, 'spines' + bulk, () => {
    const parts = [];
    for (let i = 0; i < 8; i++) {
      const y = 0.02 + i * 0.047, h = 0.13 - i * 0.008, zb = -0.105 * bulk - 0.005 * Math.sin(i);
      parts.push(...curvedSpike(T, (t) => V(T, 0, y + h * t * 0.8, zb - h * 0.9 * t * t - 0.01 * t), 0.03 - i * 0.0012, 0.003, 4, 6));
    }
    return merge(T, parts);
  });
}

/** Flared cobra hood plate (head space, behind the head). */
export function hoodGeometry(T) {
  return cached(GEO, 'hood', () => {
    // a rounded fan: ellipse that is widest at the top, built as a lathe-free disc with a raised rim
    const shape = new T.Shape();
    const rx = 0.31, ry = 0.25;
    shape.moveTo(0, -ry * 0.55);
    shape.bezierCurveTo(rx * 0.6, -ry * 0.5, rx * 1.15, -ry * 0.05, rx, ry * 0.45);
    shape.bezierCurveTo(rx * 0.85, ry * 0.95, rx * 0.3, ry * 1.0, 0, ry * 0.98);
    shape.bezierCurveTo(-rx * 0.3, ry * 1.0, -rx * 0.85, ry * 0.95, -rx, ry * 0.45);
    shape.bezierCurveTo(-rx * 1.15, -ry * 0.05, -rx * 0.6, -ry * 0.5, 0, -ry * 0.55);
    const g = new T.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 28 });
    g.translate(0, 0, -0.015);
    // ExtrudeGeometry UVs are world units (the pattern would tile like a waffle): map the whole hood onto one texture instead
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + rx * 1.1) / (rx * 2.2), (p.getY(i) + ry * 0.6) / (ry * 1.6));
    return g;
  });
}

/** Hood pattern: gold scales with a dark "eye-spot" mark. */
export function hoodTexture(T) {
  return cached(TEX, 'hood', () => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#c99a1c'; x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 18; r++) for (let q = 0; q < 14; q++) {
      const cx = q * 20 + (r % 2) * 10, cy = r * 15;
      x.fillStyle = `rgba(80,50,0,${0.18 + Math.random() * 0.12})`; x.beginPath(); x.arc(cx, cy, 9.5, 0, Math.PI); x.fill();
      x.strokeStyle = 'rgba(255,225,140,0.35)'; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, 9.5, 0, Math.PI); x.stroke();
    }
    // spectacle mark
    x.fillStyle = '#16120a'; x.beginPath(); x.ellipse(128, 120, 62, 70, 0, 0, 6.3); x.fill();
    x.fillStyle = '#e7c445'; x.beginPath(); x.ellipse(128, 120, 44, 52, 0, 0, 6.3); x.fill();
    x.fillStyle = '#16120a'; x.beginPath(); x.ellipse(128, 120, 26, 34, 0, 0, 6.3); x.fill();
    x.fillStyle = '#16120a'; x.fillRect(122, 120, 12, 120);
    const t = new T.CanvasTexture(c); if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  });
}
