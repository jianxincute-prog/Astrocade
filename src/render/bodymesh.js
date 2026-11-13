// Smooth sculpted torso / limbs for the hero's procedural body (the rigged GLB replaces it in-game,
// this is the fallback and the driver rig's look). Every segment is ONE surface: a revolved profile
// (the old lathe) with its muscle masses (pecs, lats, traps, deltoid, biceps, triceps, quads, calf...)
// melted in by smooth-union SDFs and meshed by sweeping rays out of the segment's axis. No more
// overlapping ellipsoids with visible rims; normals come from the field gradient.
import { smin, smax, ellipsoid, smoothstep as ss, surfaceMesh } from './sdf.js';

const CACHE = new Map();

/** Smooth radius function through [[r, y], ...] points sorted by y (Catmull-Rom, clamped >= 0). */
function profileFn(points) {
  const P = points.map(([r, y]) => ({ r, y }));
  return (y) => {
    if (y <= P[0].y) return P[0].r;
    if (y >= P[P.length - 1].y) return P[P.length - 1].r;
    let i = 0;
    while (i < P.length - 2 && y > P[i + 1].y) i++;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const t = (y - p1.y) / (p2.y - p1.y), t2 = t * t, t3 = t2 * t;
    const r = 0.5 * ((2 * p1.r) + (-p0.r + p2.r) * t + (2 * p0.r - 5 * p1.r + 4 * p2.r - p3.r) * t2 + (-p0.r + 3 * p1.r - 3 * p2.r + p3.r) * t3);
    return Math.max(0, r);
  };
}

/** Same radius law as the old limbProfile (hangs down from y=0 to y=-L, offset by oy). */
function limbFn(L, rTop, rMid, rBot, midAt, oy = 0) {
  return (y) => {
    const s = Math.min(1, Math.max(0, -(y - oy) / L));
    return s < midAt ? rTop + (rMid - rTop) * Math.sin((s / midAt) * Math.PI / 2) : rMid + (rBot - rMid) * (1 - Math.cos(((s - midAt) / (1 - midAt)) * Math.PI)) / 2;
  };
}

/** Revolved body with elliptical cross-section (sx, sz), open radius law r(y) on [y0, y1]. */
function revolved(r, y0, y1, sx = 1, sz = 1) {
  const sc = Math.min(sx, sz);
  return (x, y, z) => {
    const cy = Math.min(y1, Math.max(y0, y)), dy = y - cy;
    const d = (Math.hypot(x / sx, z / sz) - r(cy)) * sc;
    return dy === 0 ? d : Math.hypot(Math.max(d, 0), dy) + Math.min(d, 0);
  };
}

function union(base, parts, k) {
  return (x, y, z) => { let d = base(x, y, z); for (let i = 0; i < parts.length; i++) d = smin(d, parts[i](x, y, z), k); return d; };
}

/**
 * Cylindrical sweep: rings along y, rays from the (0,y,0) axis, bisection onto the iso-surface.
 * attrFn(x,y,z) -> number adds an `aSkin` attribute. uv: u around, v along the part (0 bottom .. 1 top).
 */
function sweep(T, f, { y0, y1, ny, nu, rMax = 0.6, attrFn, iters = 18, eps = 0.0012 }) {
  ny = Math.max(8, Math.round(ny)); nu = Math.max(12, Math.round(nu)); // `seg` may be fractional for cheap (enemy) bodies
  const m = (y1 - y0) * 0.02, ya = y0 - m, yb = y1 + m;
  const cols = nu + 1, rows = ny + 1, n = cols * rows;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), sk = new Float32Array(n);
  let i = 0;
  for (let j = 0; j < rows; j++) {
    const v = j / ny, y = ya + (yb - ya) * v;
    for (let k = 0; k < cols; k++, i++) {
      const th = (k / nu) * Math.PI * 2, dx = Math.cos(th), dz = Math.sin(th);
      let lo = 0, hi = rMax;
      if (f(0, y, 0) >= 0) hi = lo = 0;
      else for (let it = 0; it < iters; it++) { const mid = (lo + hi) * 0.5; if (f(dx * mid, y, dz * mid) < 0) lo = mid; else hi = mid; }
      const t = (lo + hi) * 0.5, x = dx * t, z = dz * t;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      let gx = f(x + eps, y, z) - f(x - eps, y, z), gy = f(x, y + eps, z) - f(x, y - eps, z), gz = f(x, y, z + eps) - f(x, y, z - eps);
      const gl = Math.hypot(gx, gy, gz) || 1;
      nor[i * 3] = gx / gl; nor[i * 3 + 1] = gy / gl; nor[i * 3 + 2] = gz / gl;
      uv[i * 2] = k / nu; uv[i * 2 + 1] = v;
      sk[i] = attrFn ? attrFn(x, y, z) : 0;
    }
  }
  const idx = [];
  for (let j = 0; j < ny; j++) {
    for (let k = 0; k < nu; k++) {
      const a = j * cols + k, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.BufferAttribute(nor, 3));
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  g.setAttribute('aSkin', new T.BufferAttribute(sk, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

const E = ellipsoid;
const cached = (key, fn) => { if (!CACHE.has(key)) CACHE.set(key, fn()); return CACHE.get(key); };

/** Chest in chest-joint space: ribcage + pecs + lats + upper back + traps + tank straps. `skinMix` paints
 *  V-neck / traps / shoulders as skin (aSkin 1) against the knit fabric (aSkin 0). */
export function chestGeometry(T, { bulk, skinMix, seg = 1 }) {
  return cached(`chest${bulk}${skinMix ? 's' : 'f'}${seg}`, () => {
    const b = bulk;
    const r = profileFn([[0.02, -0.075], [0.172, -0.06], [0.2, 0.02], [0.24, 0.12], [0.268, 0.21], [0.262, 0.27], [0.225, 0.32], [0.14, 0.36], [0.03, 0.378]]);
    const base = revolved(r, -0.075, 0.378, b, 0.66 * b);
    const sym = (fn) => [fn(1), fn(-1)];
    const parts = [
      ...sym((s) => E([s * 0.1 * b, 0.19, 0.105 * b], [0.126 * b, 0.092, 0.078 * b], [0, 0, -s * 0.15])), // pecs
      ...sym((s) => E([s * 0.19 * b, 0.12, -0.02], [0.06 * b, 0.15, 0.11 * b], [0, 0, s * 0.2])),        // lats
      E([0, 0.2, -0.1 * b], [0.2 * b, 0.12, 0.07 * b]),                                                    // upper back
      ...sym((s) => E([s * 0.12 * b, 0.325, -0.02], [0.13 * b, 0.06, 0.1 * b], [0, 0, -s * 0.38])),       // traps
    ];
    const f = union(base, parts, 0.035);
    const attr = skinMix ? (x, y, z) => {
      const e = (x / (0.1 * b)) ** 2 + ((y - 0.3) / 0.072) ** 2;
      const vneck = (1 - ss(0.6, 1.15, e)) * ss(0.0, 0.05, z);
      const top = ss(0.305, 0.34, y);
      const strap = (1 - ss(0.018, 0.04, Math.abs(Math.abs(x) - 0.1 * b))) * ss(0.27, 0.31, y);
      return Math.max(vneck, top) * (1 - strap);
    } : null;
    return sweep(T, f, { y0: -0.075, y1: 0.378, ny: 84 * seg, nu: 96 * seg, rMax: 0.6, attrFn: attr });
  });
}

/** Abdomen in spine space (+ obliques). */
export function absGeometry(T, { bulk, seg = 1 }) {
  return cached(`abs${bulk}${seg}`, () => {
    const b = bulk;
    const r = profileFn([[0.03, -0.035], [0.165, -0.02], [0.16, 0.08], [0.168, 0.18], [0.18, 0.28], [0.03, 0.312]]);
    const base = revolved(r, -0.035, 0.312, b, 0.68 * b);
    const f = union(base, [E([0.12 * b, 0.14, 0], [0.045 * b, 0.12, 0.085 * b]), E([-0.12 * b, 0.14, 0], [0.045 * b, 0.12, 0.085 * b])], 0.03);
    return sweep(T, f, { y0: -0.035, y1: 0.312, ny: 56 * seg, nu: 80 * seg });
  });
}

/** Neck in neck-joint space (+ sternocleidomastoid ridges). */
export function neckGeometry(T, { bulk, seg = 1 }) {
  return cached(`neck${bulk}${seg}`, () => {
    const b = bulk, r = limbFn(0.13, 0.072, 0.08, 0.09, 0.5, 0.12);
    const base = revolved(r, -0.01, 0.12, b * 0.95, b * 0.92);
    const f = union(base, [E([0.035 * b, 0.05, 0.045], [0.022, 0.075, 0.02], [0.35, 0, 0.25]), E([-0.035 * b, 0.05, 0.045], [0.022, 0.075, 0.02], [0.35, 0, -0.25])], 0.02);
    return sweep(T, f, { y0: -0.01, y1: 0.12, ny: 28 * seg, nu: 56 * seg, rMax: 0.3 });
  });
}

/** Upper arm in shoulder-joint space: arm + deltoid cap + biceps + triceps. side = +1 left / -1 right. */
export function upperArmGeometry(T, { ab, side, seg = 1 }) {
  return cached(`uarm${ab}${side}${seg}`, () => {
    const r = limbFn(0.32, 0.085 * ab, 0.093 * ab, 0.064 * ab, 0.45);
    const base = revolved(r, -0.32, 0.0, 1, 0.95);
    const f = union(base, [
      E([side * 0.012, -0.035, 0], [0.097 * ab, 0.11 * ab, 0.1 * ab]),                   // deltoid cap
      E([0, -0.17, 0.038 * ab], [0.075 * ab, 0.11, 0.07 * ab]),                          // biceps
      E([0, -0.13, -0.04 * ab], [0.076 * ab, 0.13, 0.066 * ab]),                         // triceps
    ], 0.03);
    return sweep(T, f, { y0: -0.32, y1: 0.075, ny: 64 * seg, nu: 72 * seg, rMax: 0.3 });
  });
}

/** Forearm in elbow-joint space: forearm + elbow + brachioradialis. */
export function foreArmGeometry(T, { ab, side, seg = 1 }) {
  return cached(`farm${ab}${side}${seg}`, () => {
    const r = limbFn(0.28, 0.068 * ab, 0.074 * ab, 0.047 * ab, 0.25);
    const base = revolved(r, -0.28, 0.0, 1, 1);
    const f = union(base, [
      E([0, 0, 0], [0.066 * ab, 0.06, 0.066 * ab]),                                      // elbow
      E([side * 0.02 * ab, -0.08, 0.02], [0.05 * ab, 0.09, 0.05 * ab]),                  // brachioradialis
    ], 0.025);
    return sweep(T, f, { y0: -0.28, y1: 0.065, ny: 56 * seg, nu: 64 * seg, rMax: 0.25 });
  });
}

/** Thigh in hip-joint space (+ quads). */
export function thighGeometry(T, { lb, side, seg = 1 }) {
  return cached(`thigh${lb}${side}${seg}`, () => {
    const rl = limbFn(0.47, 0.12 * lb, 0.122 * lb, 0.078 * lb, 0.3);
    // round off the top of the thigh so it tucks into the hip instead of ending in a hard disc
    const r = (y) => rl(y) * (y > -0.03 ? Math.sqrt(Math.max(0, 1 - ((y + 0.03) / 0.08) ** 2)) : 1);
    const base = revolved(r, -0.47, 0.05, 1, 1);
    const f = union(base, [E([side * 0.02, -0.2, 0.045 * lb], [0.082 * lb, 0.165, 0.072 * lb])], 0.035);
    return sweep(T, f, { y0: -0.47, y1: 0.05, ny: 64 * seg, nu: 72 * seg, rMax: 0.35 });
  });
}

/** Shin in knee-joint space (+ knee cap and calf). */
export function shinGeometry(T, { lb, seg = 1 }) {
  return cached(`shin${lb}${seg}`, () => {
    const r = limbFn(0.45, 0.078 * lb, 0.082 * lb, 0.056 * lb, 0.3);
    const base = revolved(r, -0.45, 0.0, 1, 1);
    const f = union(base, [
      E([0, 0, 0.01], [0.08 * lb, 0.07, 0.082 * lb]),                                    // knee
      E([0, -0.14, -0.04 * lb], [0.067 * lb, 0.125, 0.057 * lb]),                        // calf
    ], 0.03);
    return sweep(T, f, { y0: -0.45, y1: 0.07, ny: 64 * seg, nu: 64 * seg, rMax: 0.3 });
  });
}

/**
 * Clenched fist in the fist group's space (wrist at y 0, knuckles toward -y, curled fingers in front at +z).
 * Palm, four knuckles, folded fingers, tucked tips, thumb across the middle phalanges, soft grooves between
 * fingers, all melted into one mesh. b = hand bulk, side = +1 left / -1 right (thumb on the inside).
 */
export function fistGeometry(T, { b, side, hi }) {
  return cached(`fist${b}${side}${hi ? 1 : 0}`, () => {
    const xs = [0, 1, 2, 3].map((k) => (-0.033 + k * 0.022) * b);
    const th = -side;                                   // thumb side
    const parts = [
      E([0, 0.02, 0], [0.046 * b, 0.04, 0.042 * b]),                                  // wrist blend
      ...xs.map((x) => E([x, -0.062, 0.016], [0.0135 * b, 0.021, 0.02 * b])),          // knuckles
      ...xs.map((x) => E([x, -0.054, 0.04], [0.0125 * b, 0.027, 0.0125 * b])),         // folded fingers
      ...xs.map((x) => E([x, -0.03, 0.047], [0.0115 * b, 0.0115, 0.011 * b])),         // fingertips tucked in
      E([th * 0.02 * b, -0.047, 0.056], [0.034 * b, 0.0135, 0.0145 * b], [0, 0, th * 0.12]), // thumb across the fingers
      E([th * 0.046 * b, -0.02, 0.03], [0.018 * b, 0.03, 0.022 * b], [0, 0, -th * 0.3]),     // thumb base (thenar)
    ];
    const palm = E([0, -0.012, -0.002], [0.054 * b, 0.066, 0.046 * b]);
    const grooves = [0, 1, 2].map((k) => E([(xs[k] + xs[k + 1]) / 2, -0.056, 0.046], [0.0016, 0.03, 0.02]));
    const f = (x, y, z) => {
      let d = palm(x, y, z);
      for (let i = 0; i < parts.length; i++) d = smin(d, parts[i](x, y, z), 0.014);
      for (let i = 0; i < grooves.length; i++) d = smax(d, -grooves[i](x, y, z), 0.003);
      return d;
    };
    return surfaceMesh(T, f, { center: [0, -0.03, 0.015], rMax: 0.2, nu: hi ? 72 : 36, nv: hi ? 54 : 28, iters: 16 });
  });
}

/** Sneaker / boot foot in ankle-joint space: foot, toe cap, heel and sole slab melted together; the sole is painted dark. */
export function shoeGeometry(T, { hi }) {
  return cached(`shoe${hi ? 1 : 0}`, () => {
    const Y = 0.036; // lifts the shoe so the sole rests ON the ground (it used to sink ~3 cm and show the x-ray silhouette)
    const parts = [
      E([0, -0.03 + Y, 0.02], [0.07, 0.07, 0.1]),             // foot body
      E([0, -0.05 + Y, 0.115], [0.062, 0.048, 0.07]),         // toe cap
      E([0, -0.045 + Y, -0.045], [0.06, 0.055, 0.05]),        // heel
      E([0, -0.078 + Y, 0.055], [0.072, 0.019, 0.158]),       // sole slab
    ];
    const f = (x, y, z) => { let d = parts[0](x, y, z); for (let i = 1; i < parts.length; i++) d = smin(d, parts[i](x, y, z), 0.022); return d; };
    const colorFn = (x, y, z) => { const m = 1 - ss(-0.062 + Y, -0.074 + Y, y) * 0.72; return [m, m, m]; }; // dark rubber sole, upper keeps the shoe colour
    return surfaceMesh(T, f, { center: [0, -0.04 + Y, 0.04], rMax: 0.3, nu: hi ? 64 : 32, nv: hi ? 44 : 22, iters: 16, colorFn });
  });
}
