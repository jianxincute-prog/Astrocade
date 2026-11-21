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

// A real bowl: open flared wall (food sits INSIDE it), light floor, darker lip and foot.
// Returns the y of the bowl floor, where food starts.
const wallMats = new Map();
const wallMat = (c) => {
  if (!wallMats.has(c)) wallMats.set(c, new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
  return wallMats.get(c);
};
export function addBowl(g, color = 0xbde0fe, lip = 0x8ec5f5) {
  g.add(mesh(geo('bowl-wall', () => new THREE.CylinderGeometry(0.44, 0.27, 0.26, 18, 1, true)), wallMat(color), 0, 0.13, 0));
  g.add(mesh(cyl(0.36, 0.36, 0.01, 18), mat(0xf3f9ff), 0, 0.145, 0));
  g.add(mesh(cyl(0.2, 0.2, 0.03, 14), mat(lip), 0, 0.015, 0));
  const rim = mesh(tor(0.43, 0.026, Math.PI * 2), mat(lip), 0, 0.26, 0);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  return 0.15;
}
