// Tiny signed-distance toolkit used to sculpt smooth organic surfaces (the player's head).
// Shapes are blended with smooth-min so features melt into each other (no visible overlapping
// spheres), then a ray from an inner point is bisected onto the iso-surface for every vertex of a
// sphere-parameterised grid. Normals come from the field gradient, so shading is perfectly smooth.

/** Polynomial smooth minimum (union with rounded blend of width k). */
export function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
/** Smooth maximum (smooth intersection / carving: smax(f, -carve, k)). */
export function smax(a, b, k) { return -smin(-a, -b, k); }

/** world->local rotation rows for a three.js Euler 'XYZ' rotation. */
function invRot(rx, ry, rz) {
  const a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(ry), d = Math.sin(ry), e = Math.cos(rz), f = Math.sin(rz);
  const ae = a * e, af = a * f, be = b * e, bf = b * f;
  const t0 = c * e, t4 = -c * f, t8 = d, t1 = af + be * d, t5 = ae - bf * d, t9 = -b * c, t2 = bf - ae * d, t6 = be + af * d, t10 = a * c;
  return [t0, t1, t2, t4, t5, t6, t8, t9, t10];
}

/** Approximate-distance ellipsoid (centre c, radii r, optional Euler rotation). */
export function ellipsoid(c, r, rot) {
  const [cx, cy, cz] = c, [rx, ry, rz] = r, minR = Math.min(rx, ry, rz);
  const m = rot && (rot[0] || rot[1] || rot[2]) ? invRot(rot[0], rot[1], rot[2]) : null;
  const irx = 1 / rx, iry = 1 / ry, irz = 1 / rz;
  return (x, y, z) => {
    x -= cx; y -= cy; z -= cz;
    if (m) { const a = m[0] * x + m[1] * y + m[2] * z, b = m[3] * x + m[4] * y + m[5] * z, d = m[6] * x + m[7] * y + m[8] * z; x = a; y = b; z = d; }
    const px = x * irx, py = y * iry, pz = z * irz;
    const k0 = Math.sqrt(px * px + py * py + pz * pz);
    const qx = px * irx, qy = py * iry, qz = pz * irz;
    const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
    return k1 < 1e-9 ? -minR : (k0 * (k0 - 1)) / k1;
  };
}

export const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * Sphere-parameterised surface of the field f (negative inside) around an inner point `center`.
 * Returns a BufferGeometry with position / normal / uv / color / aGloss attributes.
 * colorFn(x,y,z) -> [r,g,b] and glossFn(x,y,z) -> 0..1 are evaluated on the final surface points.
 */
export function surfaceMesh(T, f, { center, nu, nv, rMax, colorFn, glossFn, iters = 20, eps = 0.0012 }) {
  const cols = nu + 1, rows = nv + 1, n = cols * rows;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const col = new Float32Array(n * 3), gloss = new Float32Array(n);
  const [cx, cy, cz] = center;
  let i = 0;
  for (let iy = 0; iy < rows; iy++) {
    const v = iy / nv, sv = Math.sin(v * Math.PI), cvv = Math.cos(v * Math.PI);
    for (let ix = 0; ix < cols; ix++, i++) {
      const u = ix / nu;
      const dx = -Math.cos(u * Math.PI * 2) * sv, dy = cvv, dz = Math.sin(u * Math.PI * 2) * sv; // same layout as SphereGeometry
      let lo = 0, hi = rMax;
      if (f(cx + dx * rMax, cy + dy * rMax, cz + dz * rMax) < 0) lo = rMax;
      else for (let k = 0; k < iters; k++) { const mid = (lo + hi) * 0.5; if (f(cx + dx * mid, cy + dy * mid, cz + dz * mid) < 0) lo = mid; else hi = mid; }
      const t = (lo + hi) * 0.5, x = cx + dx * t, y = cy + dy * t, z = cz + dz * t;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      let gx = f(x + eps, y, z) - f(x - eps, y, z), gy = f(x, y + eps, z) - f(x, y - eps, z), gz = f(x, y, z + eps) - f(x, y, z - eps);
      const gl = Math.hypot(gx, gy, gz) || 1;
      nor[i * 3] = gx / gl; nor[i * 3 + 1] = gy / gl; nor[i * 3 + 2] = gz / gl;
      uv[i * 2] = u; uv[i * 2 + 1] = 1 - v;
      const c = colorFn ? colorFn(x, y, z) : [1, 1, 1];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      gloss[i] = glossFn ? glossFn(x, y, z) : 0;
    }
  }
  const idx = [];
  for (let iy = 0; iy < nv; iy++) {
    for (let ix = 0; ix < nu; ix++) {
      const a = iy * cols + ix + 1, b = iy * cols + ix, c = (iy + 1) * cols + ix, d = (iy + 1) * cols + ix + 1;
      if (iy !== 0) idx.push(a, b, d);
      if (iy !== nv - 1) idx.push(b, c, d);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.BufferAttribute(nor, 3));
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  g.setAttribute('aGloss', new T.BufferAttribute(gloss, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
