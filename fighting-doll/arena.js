// Square boxing-ring arena with stands, crowd, light towers and a themed sky (3 themes by win streak).
const THREE = window.THREE;
export const HALF = 5;                        // ring half-size (floor is 10 x 10)
export const BOUND = 4.5;                     // fighters stay inside this

const THEMES = [
  { skyTop: '#3fb8ff', skyBot: '#fff3cf', fog: 0xcdeeff, fogN: 40, fogF: 95, hemiS: 0xffffff, hemiG: 0xb8a070, hemiI: 0.85, dir: 0xfff0d0, dirI: 0.9, floorA: '#ffe6ad', floorB: '#f7cf86', mat: 0xff6b8b, rope: [0xff5d8f, 0xffd23f, 0x4aa3ff], ground: 0x7ed69a, stand: 0x6a78c9, crowd: [0xff6b8b, 0xffd23f, 0x4aa3ff, 0x7dff9a, 0xc58bff, 0xffffff], sun: '#fff1a0', night: false },
  { skyTop: '#ff7eb3', skyBot: '#ffe0a8', fog: 0xffd0b8, fogN: 38, fogF: 90, hemiS: 0xffd9c9, hemiG: 0x9a6a78, hemiI: 0.8, dir: 0xffb98a, dirI: 1.0, floorA: '#ffd9b8', floorB: '#efae88', mat: 0xff7a5c, rope: [0xff4d6d, 0xffe066, 0xff9f1c], ground: 0xc77da0, stand: 0x9a5a9a, crowd: [0xff6b8b, 0xffd23f, 0xff9f1c, 0xffffff, 0xc58bff, 0x7dffd8], sun: '#fff7c4', night: false },
  { skyTop: '#120b46', skyBot: '#7b5fc8', fog: 0x2a1f6a, fogN: 30, fogF: 80, hemiS: 0x9a8cff, hemiG: 0x2a2060, hemiI: 0.75, dir: 0xaab4ff, dirI: 0.75, floorA: '#9a8bdc', floorB: '#7566c4', mat: 0x5a8cff, rope: [0x7df9ff, 0xff7ee8, 0xffe066], ground: 0x3a2f8a, stand: 0x4a3f9a, crowd: [0x7df9ff, 0xff7ee8, 0xffe066, 0xffffff, 0x9a8cff, 0x7dff9a], sun: '#f5f3ff', night: true },
];

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); return t; }

function floorTexture(T) {
  return canvasTex(512, 512, (x, w, h) => {
    const n = 8; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? T.floorA : T.floorB; x.fillRect(i * w / n, j * h / n, w / n + 1, h / n + 1); }
    x.lineWidth = 14; x.strokeStyle = 'rgba(255,255,255,0.85)'; x.strokeRect(24, 24, w - 48, h - 48);
    x.beginPath(); x.arc(w / 2, h / 2, 150, 0, 7); x.lineWidth = 12; x.strokeStyle = 'rgba(255,255,255,0.8)'; x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 46 : 110; x[i ? 'lineTo' : 'moveTo'](w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); } x.closePath(); x.fill();
  });
}
function skyTexture(T) { return canvasTex(4, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, T.skyTop); g.addColorStop(1, T.skyBot); x.fillStyle = g; x.fillRect(0, 0, w, h); }); }
function glowTexture(col) { return canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); g.addColorStop(0, col); g.addColorStop(0.35, col); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }); }
function cloudTexture() { return canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#fff'; for (const [cx, cy, r] of [[70, 80, 40], [120, 60, 52], [175, 80, 40], [120, 90, 44]]) { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); } }); }

export function buildArena(idx) {
  const T = THEMES[idx % THEMES.length], group = new THREE.Group();
  const L = (c) => new THREE.MeshLambertMaterial({ color: c });
  const hemi = new THREE.HemisphereLight(T.hemiS, T.hemiG, T.hemiI); group.add(hemi);
  const dir = new THREE.DirectionalLight(T.dir, T.dirI); dir.position.set(-6, 12, 8); group.add(dir);
  // ring: floor + apron
  const sideM = L(T.mat), topM = new THREE.MeshLambertMaterial({ map: floorTexture(T) });
  const mat = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 1, 0.6, HALF * 2 + 1), [sideM, sideM, topM, sideM, sideM, sideM]); mat.position.y = -0.3; group.add(mat);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 2.2, 1.0, HALF * 2 + 2.2), L(0xffffff)); apron.position.y = -1.1; group.add(apron);
  const apr2 = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 2.3, 0.35, HALF * 2 + 2.3), L(T.rope[0])); apr2.position.y = -0.75; group.add(apr2);
  // posts + ropes
  const P = HALF + 0.3, postM = L(0xffffff);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.7, 14), postM); post.position.set(sx * P, 1.35, sz * P); group.add(post);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), L(T.rope[1])); cap.position.set(sx * P, 2.75, sz * P); group.add(cap);
    for (let i = 0; i < 3; i++) { const pad = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.42), L(T.rope[i])); pad.position.set(sx * P, 0.8 + i * 0.7, sz * P); group.add(pad); }
  }
  const sideG = {};
  for (const [ax, sg] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]]) {
    const sgrp = new THREE.Group(); sgrp.userData.n = ax === 'x' ? [0, sg] : [sg, 0]; group.add(sgrp); sideG[ax + sg] = sgrp;
    for (let i = 0; i < 3; i++) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, P * 2, 8), L(T.rope[i]));
      rope.position.y = 0.8 + i * 0.7;
      if (ax === 'x') { rope.rotation.z = Math.PI / 2; rope.position.z = sg * P; } else { rope.rotation.x = Math.PI / 2; rope.position.x = sg * P; }
      sgrp.add(rope);
    }
  }
  // venue ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 40), L(T.ground)); ground.rotation.x = -Math.PI / 2; ground.position.y = -1.6; group.add(ground);
  // stands with crowd (back and both sides; the camera side stays open)
  const standM = L(T.stand), headGeo = new THREE.SphereGeometry(0.24, 10, 8), bodyGeo = new THREE.CylinderGeometry(0.2, 0.26, 0.5, 8);
  const spots = [];
  const addStand = (cx, cz, len, rotY) => {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = rotY; group.add(g);
    for (let r = 0; r < 4; r++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 1.4), standM); step.position.set(0, -0.7 + r * 0.9, -r * 1.35); g.add(step);
      const n = Math.floor(len / 0.62);
      for (let i = 0; i < n; i++) { const p = new THREE.Vector3((i - (n - 1) / 2) * 0.62, -0.25 + r * 0.9 + 0.55, -r * 1.35); p.applyMatrix4(g.matrixWorld.identity().compose(g.position, new THREE.Quaternion().setFromEuler(g.rotation), new THREE.Vector3(1, 1, 1))); spots.push(p); }
    }
  };
  addStand(0, -(HALF + 4.2), 22, 0); addStand(-(HALF + 4.2), 0, 18, Math.PI / 2); addStand(HALF + 4.2, 0, 18, -Math.PI / 2);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), spots.length), bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), spots.length);
  const col = new THREE.Color(), dummy = new THREE.Object3D();
  spots.forEach((p, i) => { col.setHex(T.crowd[(i * 7 + (i >> 2)) % T.crowd.length]); heads.setColorAt(i, col.clone().lerp(new THREE.Color(0xffe0c8), 0.55)); bodies.setColorAt(i, col); });
  group.add(heads); group.add(bodies);
  const base = spots.map((p) => p.clone());
  function crowdUpdate(t) {
    for (let i = 0; i < spots.length; i++) {
      const b = Math.abs(Math.sin(t * 4 + i * 1.7)) * 0.18;
      dummy.position.set(base[i].x, base[i].y + 0.38 + b, base[i].z); dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix);
      dummy.position.set(base[i].x, base[i].y + b * 0.6, base[i].z); dummy.updateMatrix(); bodies.setMatrixAt(i, dummy.matrix);
    }
    heads.instanceMatrix.needsUpdate = true; bodies.instanceMatrix.needsUpdate = true;
  }
  // light towers
  for (const [tx, tz] of [[-14, -12], [14, -12], [-15, 4], [15, 4]]) {
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 9, 8), L(0x6a6a8a)); tw.position.set(tx, 2.9, tz); group.add(tw);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.5), new THREE.MeshBasicMaterial({ color: T.night ? 0xfff6c0 : 0xfffbe6 })); lamp.position.set(tx, 7.8, tz); lamp.lookAt(0, 3, 0); group.add(lamp);
    if (T.night) { const beam = new THREE.Mesh(new THREE.ConeGeometry(3.5, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); beam.position.set(tx * 0.55, 4.6, tz * 0.55); beam.lookAt(0, 0, 0); beam.rotateX(Math.PI / 2); group.add(beam); }
  }
  // sun / moon + clouds + stars
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(T.sun), transparent: true, depthWrite: false, fog: false })); sun.scale.set(34, 34, 1); sun.position.set(18, 26, -70); group.add(sun);
  const clouds = [];
  const cm = cloudTexture();
  for (let i = 0; i < 9; i++) { const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cm, transparent: true, opacity: T.night ? 0.18 : 0.9, depthWrite: false, fog: false })); const s = 14 + (i % 3) * 7; c.scale.set(s, s / 2, 1); c.position.set(-60 + i * 15, 14 + (i % 4) * 5, -60 - (i % 3) * 8); c.userData.sp = 0.3 + (i % 3) * 0.15; clouds.push(c); group.add(c); }
  if (T.night) { const pts = []; for (let i = 0; i < 160; i++) pts.push((Math.random() - 0.5) * 160, 10 + Math.random() * 45, -50 - Math.random() * 30); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); group.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, fog: false }))); }
  const bg = skyTexture(T);
  return {
    group, theme: T, bg, crowdUpdate,
    // hide the ropes on the camera side so they never cross the fighters
    ropeUpdate(cx, cz) { const l = Math.hypot(cx, cz) || 1; for (const k in sideG) { const n = sideG[k].userData.n; sideG[k].visible = (n[0] * cx + n[1] * cz) / l < 0.5; } },
    cloudUpdate(t) { for (const c of clouds) { c.position.x = ((c.position.x + 70 + c.userData.sp * 0.016) % 140) - 70; } },
    apply(scene) { scene.background = bg; scene.fog = new THREE.Fog(T.fog, T.fogN, T.fogF); },
  };
}
