// Shared cached primitives (materials and geometries) for every procedural 3D model.
const THREE = window.THREE;

const mats = new Map();
export const mat = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c })); return mats.get(c); };
const geos = new Map();
const geo = (k, make) => { if (!geos.has(k)) geos.set(k, make()); return geos.get(k); };
export const box = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const cyl = (rt, rb, h, s) => geo(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export const tor = (r, t, a) => geo(`t${r},${t},${a}`, () => new THREE.TorusGeometry(r, t, 6, 12, a));
export const sph = (r) => geo(`s${r}`, () => new THREE.SphereGeometry(r, 8, 6));

export function mesh(g, m, x, y, z) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
}
