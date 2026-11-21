// Diorama kitchen: floor, back wall, prep counter, stove with pan, customer table.
// World units: 1 unit ~ 1 meter. +Z points toward the camera.
import { INGREDIENTS } from './ingredients.js';

const THREE = window.THREE;

export const ANCHORS = {
  prepPos: new THREE.Vector3(-1.5, 0, 0.35),     // chef waits here while selecting
  cookPos: new THREE.Vector3(-0.55, 0, -0.05),   // chef stands here to cook
  servePos: new THREE.Vector3(0.9, 0, 0.5),      // chef stands here to serve
  panCenter: new THREE.Vector3(0, 1.05, -1.0),   // ingredients land here
  tableTop: new THREE.Vector3(1.9, 0.78, 0.2),   // plate rests here
  customerPos: new THREE.Vector3(1.9, 0, -0.75), // customer stands behind the table
};

// World position of ingredient crate `i` on the prep counter (where tossed cubes start).
export function cratePos(i) {
  const col = i % 6, row = Math.floor(i / 6);
  return new THREE.Vector3(-3.15 + col * 0.3, 1.12, -1.2 + row * 0.3);
}

function box(parent, w, h, d, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

export function buildKitchen(scene, look) {
  const group = new THREE.Group();
  scene.add(group);

  const wallMat = lam(look.wallColor);
  const floorMat = lam(look.floorColor);
  const counterMat = lam(0xffc8a2);
  const topMat = lam(0xfff6ea);
  const metalMat = lam(0xcfd6e0);
  const darkMat = lam(0x4a4a52);

  // Shell
  box(group, 12, 0.2, 7, floorMat, 0, -0.1, 0.5, false);
  box(group, 12, 5, 0.2, wallMat, 0, 2.5, -2.1, false);
  box(group, 12, 0.5, 0.06, lam(0xffb5a7), 0, 0.25, -1.96, false); // baseboard stripe

  // Window with pastel sky
  box(group, 1.5, 1.2, 0.08, lam(0xffffff), -0.1, 2.5, -1.98, false);
  box(group, 1.3, 1.0, 0.09, lam(0xbde0fe), -0.1, 2.5, -1.97, false);
  box(group, 0.06, 1.0, 0.1, lam(0xffffff), -0.1, 2.5, -1.96, false);
  box(group, 1.3, 0.06, 0.1, lam(0xffffff), -0.1, 2.5, -1.96, false);

  // Shelf with jars
  box(group, 1.6, 0.06, 0.4, lam(0xc9a27a), 2.3, 2.2, -1.8, false);
  [0xffafcc, 0xcdb4db, 0xa2d2ff, 0xb9fbc0].forEach((c, i) => box(group, 0.22, 0.3, 0.22, lam(c), 1.8 + i * 0.32, 2.4, -1.8));

  // Prep counter with the 12 ingredient crates
  box(group, 2.0, 0.9, 0.8, counterMat, -2.4, 0.45, -1.0);
  box(group, 2.1, 0.08, 0.9, topMat, -2.4, 0.94, -1.0);
  INGREDIENTS.forEach((ing, i) => {
    const col = i % 6, row = Math.floor(i / 6);
    box(group, 0.22, 0.14, 0.22, lam(ing.color), -3.15 + col * 0.3, 1.05, -1.2 + row * 0.3);
  });

  // Stove
  box(group, 1.6, 0.9, 0.9, lam(0xe9edf5), 0, 0.45, -1.0);
  box(group, 1.64, 0.06, 0.94, metalMat, 0, 0.92, -1.0);
  [-0.55, 0.55].forEach((x) => {
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12), darkMat);
    burner.position.set(x, 0.96, -1.0);
    group.add(burner);
  });
  [-0.45, -0.15, 0.15, 0.45].forEach((x) => box(group, 0.1, 0.1, 0.06, lam(0xff8fab), x, 0.65, -0.52, false));

  // Pan (center burner area, matches ANCHORS.panCenter)
  const pan = new THREE.Group();
  pan.position.set(ANCHORS.panCenter.x, 0.93, ANCHORS.panCenter.z);
  group.add(pan);
  const panBody = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.38, 0.12, 16), darkMat);
  panBody.position.y = 0.06; panBody.castShadow = true;
  pan.add(panBody);
  const panInner = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.02, 16), lam(0x2f2f36));
  panInner.position.y = 0.12;
  pan.add(panInner);
  const handle = box(pan, 0.6, 0.05, 0.08, lam(0x8b5a2b), -0.72, 0.1, 0.12);
  handle.rotation.y = -0.35;

  // Customer table
  const t = ANCHORS.tableTop;
  box(group, 1.4, 0.08, 0.9, lam(0xffafcc), t.x, 0.74, t.z);
  [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]].forEach(([dx, dz]) =>
    box(group, 0.08, 0.7, 0.08, lam(0xc9a27a), t.x + dx, 0.35, t.z + dz));

  // Soft rug under the chef path
  box(group, 3.4, 0.02, 1.4, lam(0xcdeac0), -0.6, 0.01, 0.35, false);

  return { group, pan, panInner, mats: { wall: wallMat, floor: floorMat } };
}

export function buildLights(scene) {
  const ambient = new THREE.AmbientLight(0xfff5ea, 0.62);
  const sun = new THREE.DirectionalLight(0xfffaed, 0.62);
  sun.position.set(5, 10, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 30;
  sun.shadow.bias = -0.0006;
  scene.add(ambient, sun);
  return { ambient, sun };
}
