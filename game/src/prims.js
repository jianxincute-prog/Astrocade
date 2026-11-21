// Shared cached primitives plus the shading system used by every procedural food model.
// Each piece gets per-vertex colors (lighter on top, darker underneath) and a small deterministic brightness
// variation per piece, so a flat color shows real gradation. Glossy colors (sauce, cheese, yolk, shrimp,
// glaze, ceramics) use a Phong material for highlights; everything else stays matte Lambert.
const THREE = window.THREE;

const GLOSSY = new Set([
  0xd93a2b, 0xc0392b, 0xb52d1f, 0xa8452b, 0x8b2e1a, // tomato, red sauces
  0xffc93c, 0xffc83d, 0xffb300, 0xffd966, 0xc98a1b, // cheese and browned cheese
  0xf6b61a, 0xf08a5d, 0xf6b08a, 0xb5651d, 0xf2b84b, // yolk, shrimp, broth, oil
  0x6b4a2f, 0x7a5638, 0x8b4513, // mushroom sauce, glazed chicken
  0x8f8f8d, // gray lip of the bowl (cream bodies stay matte so they do not blow out)
]);

const tokens = new Map();
// Returns a color token; mesh() turns it into the real material.
export const mat = (c, o) => {
  const dbl = !!(o && o.double), key = c + (dbl ? 'd' : '');
  if (!tokens.has(key)) tokens.set(key, { hex: c, double: dbl });
  return tokens.get(key);
};
const realMats = new Map();
function realMat(t) {
  const gloss = GLOSSY.has(t.hex), key = (gloss ? 'p' : 'l') + (t.double ? 'd' : '');
  if (!realMats.has(key)) {
    const side = t.double ? THREE.DoubleSide : THREE.FrontSide;
    realMats.set(key, gloss
      ? new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 55, specular: 0x555555, side })
      : new THREE.MeshLambertMaterial({ vertexColors: true, side }));
  }
  return realMats.get(key);
}

const geos = new Map();
const geo = (k, make) => { if (!geos.has(k)) geos.set(k, make()); return geos.get(k); };
export const box = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const cyl = (rt, rb, h, s) => geo(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export const tor = (r, t, a) => geo(`t${r},${t},${a}`, () => new THREE.TorusGeometry(r, t, 6, 12, a));
export const sph = (r) => geo(`s${r}`, () => new THREE.SphereGeometry(r, 8, 6));

const JIT = [-0.05, 0, 0.03, 0.06];
const tinted = new Map();
function tintGeo(g, hex, variant) {
  const torus = g.type === 'TorusGeometry'; // laid flat (rotation.x = PI/2) its local -z is world up
  const out = g.clone();
  out.computeBoundingBox();
  const bb = out.boundingBox;
  const lo = torus ? bb.min.z : bb.min.y, span = ((torus ? bb.max.z : bb.max.y) - lo) || 1;
  const pos = out.attributes.position, arr = new Float32Array(pos.count * 3);
  const hsl = {};
  new THREE.Color(hex).getHSL(hsl);
  const j = 1 + JIT[variant];
  const hi = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 0.95), Math.min(0.92, (hsl.l * 1.1 + 0.03) * j));
  const dk = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.06), Math.min(0.96, hsl.l * 0.72 * j));
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let t = ((torus ? pos.getZ(i) : pos.getY(i)) - lo) / span;
    if (torus) t = 1 - t;
    c.copy(dk).lerp(hi, t);
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  out.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return out;
}

export function mesh(g, m, x, y, z) {
  const variant = ((Math.floor(x * 131 + y * 197 + z * 89) % 4) + 4) % 4;
  const key = g.uuid + '|' + m.hex + '|' + variant;
  let tg = tinted.get(key);
  if (!tg) { tg = tintGeo(g, m.hex, variant); tinted.set(key, tg); }
  const o = new THREE.Mesh(tg, realMat(m));
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}

// ---- vessels -------------------------------------------------------------------------------
// Plate: slim body, recessed well and a bright rim line. Returns the y where food starts.
export function addPlate(g) {
  g.add(mesh(cyl(0.46, 0.36, 0.06, 28), mat(0xe8dcc3), 0, 0.03, 0)); // cream body
  g.add(mesh(cyl(0.33, 0.33, 0.012, 28), mat(0xd2ccbd), 0, 0.063, 0)); // warm gray well
  const rim = mesh(tor(0.44, 0.014, Math.PI * 2), mat(0x8f8f8d), 0, 0.058, 0); // gray rim line
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  return 0.069;
}

// Bowl: open flared wall (food sits INSIDE it), light floor, lip, foot and a thin decorative band.
// Returns the y of the bowl floor, where food starts.
export function addBowl(g, color = 0xe8dcc3, lip = 0x8f8f8d) {
  g.add(mesh(geo('bowl-wall', () => new THREE.CylinderGeometry(0.44, 0.27, 0.26, 24, 1, true)), mat(color, { double: true }), 0, 0.13, 0));
  g.add(mesh(cyl(0.36, 0.36, 0.01, 24), mat(0xe6e0d3), 0, 0.145, 0));
  g.add(mesh(cyl(0.2, 0.2, 0.03, 16), mat(lip), 0, 0.015, 0));
  const rim = mesh(tor(0.43, 0.026, Math.PI * 2), mat(lip), 0, 0.26, 0);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  const band = mesh(tor(0.395, 0.011, Math.PI * 2), mat(0xa5a5a2), 0, 0.185, 0); // gray band
  band.rotation.x = Math.PI / 2;
  g.add(band);
  return 0.15;
}
