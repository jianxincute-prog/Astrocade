// Winter world: snowfield, frozen lake (with skate trails), pine forest, lamps, snowmen, slalom cones.
import { mulberry32 } from './util.js';
const T = THREE;

export const LAKE = { rx: 62, rz: 48 };
export const MAP_HALF = 145;

export function createWorld(scene) {
  const colliders = [];
  scene.background = new T.Color(0xbfd9ee);
  scene.fog = new T.Fog(0xcfe2f0, 70, 280);
  scene.add(new T.HemisphereLight(0xdcecff, 0xcfdbe8, 0.55));
  const sun = new T.DirectionalLight(0xfff1d6, 0.55);
  sun.position.set(60, 90, 40);
  scene.add(sun);

  // ---- Snow ground
  const snowCanvas = document.createElement('canvas');
  snowCanvas.width = snowCanvas.height = 256;
  const sctx = snowCanvas.getContext('2d');
  sctx.fillStyle = '#f3f7fb'; sctx.fillRect(0, 0, 256, 256);
  const r0 = mulberry32(3);
  for (let i = 0; i < 900; i++) {
    sctx.fillStyle = r0() > 0.5 ? 'rgba(190,210,232,0.20)' : 'rgba(255,255,255,0.6)';
    sctx.fillRect(r0() * 256, r0() * 256, 2 + r0() * 3, 2 + r0() * 3);
  }
  const snowTex = new T.CanvasTexture(snowCanvas);
  snowTex.wrapS = snowTex.wrapT = T.RepeatWrapping;
  snowTex.repeat.set(90, 90);
  const groundGeo = new T.PlaneGeometry(800, 800); groundGeo.rotateX(-Math.PI / 2);
  scene.add(new T.Mesh(groundGeo, new T.MeshLambertMaterial({ map: snowTex })));

  // ---- Lake shore (slushy ring) and ice
  const shoreGeo = new T.CircleGeometry(1, 64); shoreGeo.rotateX(-Math.PI / 2);
  const shore = new T.Mesh(shoreGeo, new T.MeshLambertMaterial({ color: 0xc9d9e8 }));
  shore.scale.set(LAKE.rx + 4.5, 1, LAKE.rz + 4.5); shore.position.y = 0.03;
  scene.add(shore);

  const IW = 1024, IH = 1024;
  const iceCanvas = document.createElement('canvas');
  iceCanvas.width = IW; iceCanvas.height = IH;
  const ictx = iceCanvas.getContext('2d');
  const grad = ictx.createRadialGradient(IW / 2, IH / 2, 40, IW / 2, IH / 2, IW * 0.55);
  grad.addColorStop(0, '#68a8d4'); grad.addColorStop(1, '#4880b0');
  ictx.fillStyle = grad; ictx.fillRect(0, 0, IW, IH);
  const r1 = mulberry32(11);
  ictx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    ictx.strokeStyle = r1() > 0.5 ? 'rgba(235,248,255,0.55)' : 'rgba(30,80,130,0.28)';
    ictx.lineWidth = 1 + r1() * 1.5;
    ictx.beginPath();
    let x = r1() * IW, y = r1() * IH;
    ictx.moveTo(x, y);
    const n = 3 + Math.floor(r1() * 4);
    for (let k = 0; k < n; k++) { x += (r1() - 0.5) * 160; y += (r1() - 0.5) * 160; ictx.lineTo(x, y); }
    ictx.stroke();
  }
  const iceTex = new T.CanvasTexture(iceCanvas);
  iceTex.anisotropy = 4;
  const iceGeo = new T.CircleGeometry(1, 72); iceGeo.rotateX(-Math.PI / 2);
  const ice = new T.Mesh(iceGeo, new T.MeshStandardMaterial({ map: iceTex, roughness: 0.25, metalness: 0.0, envMapIntensity: 0.12 }));
  ice.scale.set(LAKE.rx, 1, LAKE.rz); ice.position.y = 0.06;
  scene.add(ice);

  const toPx = (x, z) => [(x / (LAKE.rx * 2) + 0.5) * IW, (z / (LAKE.rz * 2) + 0.5) * IH];
  let dirty = false, tick = 0;
  function trail(x0, z0, x1, z1, alpha, width) {
    const a = toPx(x0, z0), b = toPx(x1, z1);
    ictx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
    ictx.lineWidth = width;
    ictx.beginPath(); ictx.moveTo(a[0], a[1]); ictx.lineTo(b[0], b[1]); ictx.stroke();
    dirty = true;
  }
  function scuff(x, z, r) {
    const p = toPx(x, z);
    ictx.fillStyle = 'rgba(255,255,255,0.35)';
    ictx.beginPath(); ictx.ellipse(p[0], p[1], r * 8, r * 10, 0, 0, Math.PI * 2); ictx.fill();
    dirty = true;
  }

  // ---- Pine trees (instanced, vertex-colored so tips look snow-covered)
  function coneGeo(r, h) {
    const g = new T.ConeGeometry(r, h, 7, 1);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const green = new T.Color(0x2e6048), white = new T.Color(0xf4f8fc), c = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / h + 0.5;
      const m = Math.min(1, Math.max(0, (t - 0.12) / 0.5));
      c.copy(green).lerp(white, m * m);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    return g;
  }
  const rng = mulberry32(7);
  const trees = [];
  let tries = 0;
  while (trees.length < 240 && tries < 6000) {
    tries++;
    const x = (rng() * 2 - 1) * (MAP_HALF + 4), z = (rng() * 2 - 1) * (MAP_HALF + 4);
    if ((x / (LAKE.rx + 14)) ** 2 + (z / (LAKE.rz + 14)) ** 2 < 1) continue;
    if (Math.hypot(x, z - 34) < 24) continue;
    const edge = Math.max(Math.abs(x), Math.abs(z)) / MAP_HALF;
    if (rng() > 0.2 + edge * 0.9) continue;
    trees.push({ x, z, s: 0.8 + rng() * 0.9 });
  }
  for (let t = -MAP_HALF - 8; t <= MAP_HALF + 8; t += 5) {
    const s = 1.5 + rng() * 0.6;
    trees.push({ x: t, z: -MAP_HALF - 6, s }, { x: t, z: MAP_HALF + 6, s }, { x: -MAP_HALF - 6, z: t, s }, { x: MAP_HALF + 6, z: t, s });
  }
  const trunks = new T.InstancedMesh(new T.CylinderGeometry(0.28, 0.4, 2, 6), new T.MeshLambertMaterial({ color: 0x5a3f2c }), trees.length);
  const foliageMat = new T.MeshLambertMaterial({ vertexColors: true });
  const tiers = [0, 1, 2].map(() => new T.InstancedMesh(coneGeo(1.7, 2.6), foliageMat, trees.length));
  const dummy = new T.Object3D();
  trees.forEach((tr, i) => {
    dummy.rotation.set(0, i * 1.7, 0);
    dummy.position.set(tr.x, tr.s, tr.z); dummy.scale.set(tr.s, tr.s, tr.s); dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    tiers.forEach((m, k) => {
      const sc = tr.s * (1 - k * 0.24);
      dummy.position.set(tr.x, tr.s * (2.2 + k * 1.2), tr.z); dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    if (Math.abs(tr.x) <= MAP_HALF + 2 && Math.abs(tr.z) <= MAP_HALF + 2) colliders.push({ x: tr.x, z: tr.z, r: 0.55 * tr.s + 0.2 });
  });
  scene.add(trunks); tiers.forEach((m) => scene.add(m));

  // ---- Lamp posts around the lake
  const poleMat = new T.MeshLambertMaterial({ color: 0x2c3340 });
  const bulbMat = new T.MeshBasicMaterial({ color: 0xffd9a0 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * (LAKE.rx + 9), z = Math.sin(a) * (LAKE.rz + 9);
    const pole = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 4.2, 6), poleMat); pole.position.set(x, 2.1, z);
    const bulb = new T.Mesh(new T.SphereGeometry(0.42, 10, 8), bulbMat); bulb.position.set(x, 4.5, z);
    scene.add(pole, bulb);
    colliders.push({ x, z, r: 0.3 });
  }

  // ---- Snowmen (landmarks)
  const snowMat = new T.MeshLambertMaterial({ color: 0xf8fbff });
  [[-52, 52], [70, -30], [-20, -70]].forEach(([x, z]) => {
    const g = new T.Group();
    [[0.9, 0.9], [0.65, 2.0], [0.45, 2.85]].forEach(([r, y]) => { const s = new T.Mesh(new T.SphereGeometry(r, 12, 10), snowMat); s.position.y = y; g.add(s); });
    const nose = new T.Mesh(new T.ConeGeometry(0.08, 0.5, 6), new T.MeshLambertMaterial({ color: 0xf08a2c })); nose.rotation.x = Math.PI / 2; nose.position.set(0, 2.85, 0.5); g.add(nose);
    g.position.set(x, 0, z); scene.add(g);
    colliders.push({ x, z, r: 0.9 });
  });

  // ---- Slalom cones on the ice (visual markers)
  const coneMat = new T.MeshLambertMaterial({ color: 0xff7a1a });
  for (let i = 0; i < 6; i++) {
    const cone = new T.Mesh(new T.ConeGeometry(0.45, 1, 10), coneMat);
    cone.position.set(i % 2 ? 6 : -6, 0.56, 22 - i * 9);
    scene.add(cone);
  }

  // ---- Falling snow around the camera
  const N = 380, snowPos = new Float32Array(N * 3), r2 = mulberry32(5);
  for (let i = 0; i < N; i++) { snowPos[i * 3] = (r2() - 0.5) * 60; snowPos[i * 3 + 1] = r2() * 24; snowPos[i * 3 + 2] = (r2() - 0.5) * 60; }
  const flakeGeo = new T.BufferGeometry(); flakeGeo.setAttribute('position', new T.BufferAttribute(snowPos, 3));
  const flakes = new T.Points(flakeGeo, new T.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.85, depthWrite: false }));
  flakes.frustumCulled = false;
  scene.add(flakes);

  function update(dt, camPos) {
    flakes.position.set(camPos.x, 0, camPos.z);
    const a = flakeGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] -= (1.6 + (i % 5) * 0.35) * dt;
      a[i * 3] += Math.sin(a[i * 3 + 1] * 0.7 + i) * 0.25 * dt;
      if (a[i * 3 + 1] < 0) a[i * 3 + 1] += 24;
    }
    flakeGeo.attributes.position.needsUpdate = true;
    if (dirty && ++tick % 3 === 0) { iceTex.needsUpdate = true; dirty = false; }
  }

  const onIce = (x, z) => (x / LAKE.rx) ** 2 + (z / LAKE.rz) ** 2 < 1;
  return { colliders, onIce, trail, scuff, update };
}
