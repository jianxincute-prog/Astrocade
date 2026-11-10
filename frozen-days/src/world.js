// Winter world (cel-shaded): snowfield, frozen lake with skate trails, pine forest, shore landmarks
// (dock, rowboat, boathouse cabin, signpost, rocks, snow banks, lamps, snowmen) and distant mountains.
import { mulberry32 } from './util.js';
import { toonMat, addOutlines, addInstancedOutline } from './anime.js';
const T = THREE;

export const LAKE = { rx: 62, rz: 48 };
export const MAP_HALF = 145;

function colorCone(geo, h, top, bottom, from = 0.12, span = 0.5) {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), a = new T.Color(bottom), b = new T.Color(top), c = new T.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / h + 0.5, m = Math.min(1, Math.max(0, (t - from) / span));
    c.copy(a).lerp(b, m * m);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  return geo;
}
function colorBlob(geo, r, top, bottom) { // vertical gradient by height for spheres / rocks
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), a = new T.Color(bottom), b = new T.Color(top), c = new T.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) / r + 0.15) / 1.0));
    c.copy(a).lerp(b, t > 0.45 ? 1 : t * 0.5);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  return geo;
}
function signTexture(lines) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 192;
  const x = c.getContext('2d');
  x.fillStyle = '#7a4f2e'; x.fillRect(0, 0, 512, 192);
  x.fillStyle = '#8f6038'; for (let i = 0; i < 6; i++) x.fillRect(0, i * 32 + 4, 512, 3);
  x.strokeStyle = '#4b2f1a'; x.lineWidth = 8; x.strokeRect(4, 4, 504, 184);
  x.fillStyle = '#fff6e6'; x.textAlign = 'center';
  x.font = 'bold 64px system-ui,sans-serif'; x.fillText(lines[0], 256, 92);
  x.font = '600 34px system-ui,sans-serif'; x.fillText(lines[1], 256, 146);
  const t = new T.CanvasTexture(c); t.anisotropy = 4;
  return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,225,160,0.95)'); g.addColorStop(0.35, 'rgba(255,200,120,0.35)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}

export function createWorld(scene) {
  const colliders = [];
  scene.background = new T.Color(0xbfd9ee);
  scene.fog = new T.Fog(0xcfe2f0, 80, 360);
  scene.add(new T.HemisphereLight(0xdcecff, 0xcfdbe8, 0.55));
  const sun = new T.DirectionalLight(0xfff1d6, 0.55);
  sun.position.set(60, 90, 40);
  scene.add(sun);
  const OUT = { thick: 0.0024, fade: 1 };

  // ---- Snow ground
  const snowCanvas = document.createElement('canvas');
  snowCanvas.width = snowCanvas.height = 256;
  const sctx = snowCanvas.getContext('2d');
  sctx.fillStyle = '#f3f7fb'; sctx.fillRect(0, 0, 256, 256);
  const r0 = mulberry32(3);
  for (let i = 0; i < 600; i++) {
    sctx.fillStyle = r0() > 0.5 ? 'rgba(190,210,232,0.16)' : 'rgba(255,255,255,0.5)';
    sctx.fillRect(r0() * 256, r0() * 256, 3 + r0() * 4, 3 + r0() * 4);
  }
  const snowTex = new T.CanvasTexture(snowCanvas);
  snowTex.wrapS = snowTex.wrapT = T.RepeatWrapping;
  snowTex.repeat.set(90, 90);
  const groundGeo = new T.PlaneGeometry(1200, 1200); groundGeo.rotateX(-Math.PI / 2);
  scene.add(new T.Mesh(groundGeo, toonMat({ map: snowTex, soft: true })));

  // ---- Lake shore (slushy ring) and ice
  const shoreGeo = new T.CircleGeometry(1, 64); shoreGeo.rotateX(-Math.PI / 2);
  const shore = new T.Mesh(shoreGeo, toonMat({ color: 0xc9d9e8, soft: true }));
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

  // ---- Pine forest (instanced, snow-tipped) with outlines
  const rng = mulberry32(7);
  const trees = [];
  let tries = 0;
  while (trees.length < 240 && tries < 6000) {
    tries++;
    const x = (rng() * 2 - 1) * (MAP_HALF + 4), z = (rng() * 2 - 1) * (MAP_HALF + 4);
    if ((x / (LAKE.rx + 18)) ** 2 + (z / (LAKE.rz + 18)) ** 2 < 1) continue;
    if (Math.hypot(x, z - 34) < 24) continue;
    if (Math.abs(x + 18) < 14 && Math.abs(z + 64) < 14) continue; // boathouse clearing
    const edge = Math.max(Math.abs(x), Math.abs(z)) / MAP_HALF;
    if (rng() > 0.2 + edge * 0.9) continue;
    trees.push({ x, z, s: 0.8 + rng() * 0.9 });
  }
  for (let t = -MAP_HALF - 8; t <= MAP_HALF + 8; t += 5) {
    const s = 1.5 + rng() * 0.6;
    trees.push({ x: t, z: -MAP_HALF - 6, s }, { x: t, z: MAP_HALF + 6, s }, { x: -MAP_HALF - 6, z: t, s }, { x: MAP_HALF + 6, z: t, s });
  }
  const trunks = new T.InstancedMesh(new T.CylinderGeometry(0.28, 0.4, 2, 6), toonMat({ color: 0x5a3f2c }), trees.length);
  const foliageMat = toonMat({ vertexColors: true });
  const tiers = [0, 1, 2].map(() => new T.InstancedMesh(colorCone(new T.ConeGeometry(1.7, 2.6, 7, 1), 2.6, 0xf4f8fc, 0x2e6048), foliageMat, trees.length));
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
  [trunks, ...tiers].forEach((m) => { m.frustumCulled = false; scene.add(m); });
  tiers.forEach((m) => addInstancedOutline(m, scene, { thick: 0.002, fade: 1 }));

  // ---- Ring helper: points just outside the ice ellipse
  const ring = (a, k) => [Math.cos(a) * (LAKE.rx + k), Math.sin(a) * (LAKE.rz + k)];

  // ---- Snow banks along the shore
  const bankGeo = new T.SphereGeometry(1, 10, 7);
  const banks = new T.InstancedMesh(bankGeo, toonMat({ color: 0xf2f7fc, soft: true }), 80);
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2 + rng() * 0.05, [x, z] = ring(a, 6.5 + rng() * 2.5);
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.22) { banks.setMatrixAt(i, dummy.matrix.identity().scale(new T.Vector3(0.001, 0.001, 0.001))); continue; } // keep the dock clear
    const s = 2.4 + rng() * 2.4;
    dummy.position.set(x, 0.05, z); dummy.rotation.set(0, rng() * 6, 0); dummy.scale.set(s, 0.5 + rng() * 0.35, s * (0.7 + rng() * 0.4)); dummy.updateMatrix();
    banks.setMatrixAt(i, dummy.matrix);
  }
  banks.frustumCulled = false; scene.add(banks);

  // ---- Rocks (snow-capped) with colliders
  const rockGeo = colorBlob(new T.IcosahedronGeometry(1, 0), 1, 0xf2f6fa, 0x7f90a6);
  const ROCKS = 38, rocks = new T.InstancedMesh(rockGeo, toonMat({ vertexColors: true }), ROCKS);
  for (let i = 0; i < ROCKS; i++) {
    let a = rng() * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.3) a += 0.7;
    const [x, z] = ring(a, 9 + rng() * 14), s = 0.8 + rng() * 1.3;
    dummy.position.set(x, s * 0.45, z); dummy.rotation.set(rng(), rng() * 6, rng()); dummy.scale.set(s, s * 0.75, s * 1.1); dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    colliders.push({ x, z, r: s * 0.95 });
  }
  rocks.frustumCulled = false; scene.add(rocks); addInstancedOutline(rocks, scene, { thick: 0.0022, fade: 1 });

  // ---- Snowy bushes
  const bushGeo = colorBlob(new T.SphereGeometry(1, 9, 7), 1, 0xeef4f9, 0x3f6e58);
  const BUSH = 46, bushes = new T.InstancedMesh(bushGeo, toonMat({ vertexColors: true }), BUSH);
  for (let i = 0; i < BUSH; i++) {
    const a = rng() * Math.PI * 2, [x, z] = ring(a, 16 + rng() * 22), s = 0.7 + rng() * 0.7;
    dummy.position.set(x, s * 0.7, z); dummy.rotation.set(0, rng() * 6, 0); dummy.scale.set(s * 1.2, s * 0.9, s * 1.2); dummy.updateMatrix();
    bushes.setMatrixAt(i, dummy.matrix);
    colliders.push({ x, z, r: s * 1.0 });
  }
  bushes.frustumCulled = false; scene.add(bushes); addInstancedOutline(bushes, scene, { thick: 0.002, fade: 1 });

  // ---- Wooden dock (east shore) + rowboat frozen into the ice
  const props = new T.Group(); scene.add(props);
  const wood = toonMat({ color: 0x9a6a3e }), woodDark = toonMat({ color: 0x6b4527 });
  for (let i = 0; i < 24; i++) {
    const plank = new T.Mesh(new T.BoxGeometry(0.92, 0.1, 4.2), i % 2 ? wood : toonMat({ color: 0xa4743f }));
    plank.position.set(LAKE.rx - 9 + i, 0.1, 0); props.add(plank);
  }
  for (let i = 0; i < 7; i++) {
    [-2.2, 2.2].forEach((z) => {
      const post = new T.Mesh(new T.CylinderGeometry(0.16, 0.2, 1.3, 8), woodDark); post.position.set(LAKE.rx - 8 + i * 3.8, 0.55, z); props.add(post);
    });
  }
  const glowTex = glowTexture(), glows = [];
  const bulbMat = new T.MeshBasicMaterial({ color: 0xffd9a0 });
  function lantern(x, y, z) {
    const b = new T.Mesh(new T.SphereGeometry(0.22, 10, 8), bulbMat); b.position.set(x, y, z); props.add(b);
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false })); s.position.set(x, y, z); s.scale.setScalar(3.4); scene.add(s); glows.push(s);
  }
  lantern(LAKE.rx + 13, 1.5, -2.2); lantern(LAKE.rx + 13, 1.5, 2.2);
  const hull = new T.Mesh(new T.SphereGeometry(1, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toonMat({ color: 0x8a5a36, side: T.DoubleSide }));
  hull.scale.set(1.25, 0.7, 3.1); hull.position.set(LAKE.rx - 11, 0.62, 9); hull.rotation.set(0.05, 0.35, 0.14); props.add(hull);
  const stripe = new T.Mesh(new T.TorusGeometry(1, 0.05, 6, 24), toonMat({ color: 0xf4efe6 })); stripe.rotation.x = Math.PI / 2; stripe.scale.set(1.26, 3.12, 1); stripe.position.copy(hull.position); stripe.position.y += 0.02; stripe.rotation.set(Math.PI / 2 + 0.05, 0.35, 0.14); props.add(stripe);
  [[-1.4], [0], [1.4]].forEach(([d]) => colliders.push({ x: LAKE.rx - 11 + Math.sin(0.35) * d * 1.8, z: 9 + Math.cos(0.35) * d * 1.8, r: 1.3 }));

  // ---- Boathouse cabin (north shore)
  const cab = new T.Group(); cab.position.set(-18, 0, -64); props.add(cab);
  const wall = toonMat({ color: 0xb8683c }), trim = toonMat({ color: 0x5e3a22 }), snowW = toonMat({ color: 0xf6f9fd, soft: true });
  const walls = new T.Mesh(new T.BoxGeometry(11, 5, 8), wall); walls.position.y = 2.5; cab.add(walls);
  [-1, 1].forEach((s) => {
    const roof = new T.Mesh(new T.BoxGeometry(12.4, 0.5, 5.4), trim); roof.position.set(0, 6.2, s * 2.2); roof.rotation.x = -s * 0.52; cab.add(roof);
    const cap = new T.Mesh(new T.BoxGeometry(12.6, 0.4, 5.6), snowW); cap.position.set(0, 6.5, s * 2.25); cap.rotation.x = -s * 0.52; cab.add(cap);
  });
  const chim = new T.Mesh(new T.BoxGeometry(1.1, 2.6, 1.1), toonMat({ color: 0x7c7f88 })); chim.position.set(3.4, 7.4, -1.4); cab.add(chim);
  const chimCap = new T.Mesh(new T.BoxGeometry(1.3, 0.3, 1.3), snowW); chimCap.position.set(3.4, 8.8, -1.4); cab.add(chimCap);
  const door = new T.Mesh(new T.BoxGeometry(1.8, 3.1, 0.3), trim); door.position.set(-1.5, 1.55, 4.1); cab.add(door);
  const winMat = new T.MeshBasicMaterial({ color: 0xffd27a });
  [[2.6, 0], [4.4, 0]].forEach(([x]) => { const w = new T.Mesh(new T.BoxGeometry(1.7, 1.7, 0.3), winMat); w.position.set(x - 0.4, 2.9, 4.1); cab.add(w); const fr = new T.Mesh(new T.BoxGeometry(2.0, 2.0, 0.2), trim); fr.position.set(x - 0.4, 2.9, 4.0); cab.add(fr); });
  [-4, -1.5, 1, 3.5].forEach((z) => { const w = new T.Mesh(new T.BoxGeometry(0.3, 1.5, 1.5), winMat); w.position.set(5.6, 2.9, z * 0.9); cab.add(w); });
  const step = new T.Mesh(new T.BoxGeometry(3, 0.3, 1.4), woodDark); step.position.set(-1.5, 0.15, 4.9); cab.add(step);
  [-5, -2.5, 0, 2.5, 5].forEach((x) => [-3, 3].forEach((z) => colliders.push({ x: -18 + x, z: -64 + z, r: 2.2 })));
  lantern(-18 - 3.8, 3.4, -64 + 4.6);

  // ---- Signpost near the start
  const sign = new T.Group(); sign.position.set(50, 0, 26); sign.rotation.y = -Math.PI / 2 - 0.25; props.add(sign);
  const postM = new T.Mesh(new T.CylinderGeometry(0.16, 0.2, 3.4, 8), woodDark); postM.position.y = 1.7; sign.add(postM);
  const board = new T.Mesh(new T.BoxGeometry(4.6, 1.7, 0.2), toonMat({ color: 0xffffff, map: signTexture(['FROZEN LAKE', 'Skate • Glide • Learn']) })); board.position.y = 3.1; sign.add(board);
  const boardTop = new T.Mesh(new T.BoxGeometry(4.8, 0.2, 0.3), snowW); boardTop.position.y = 4.05; sign.add(boardTop);
  colliders.push({ x: 50, z: 26, r: 0.5 });

  // ---- Lamp posts around the lake (with warm glow)
  const poleMat = toonMat({ color: 0x2c3340 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2, [x, z] = ring(a, 9);
    const pole = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 4.2, 6), poleMat); pole.position.set(x, 2.1, z); props.add(pole);
    lantern(x, 4.5, z);
    colliders.push({ x, z, r: 0.3 });
  }

  // ---- Snowmen
  const snowMat = toonMat({ color: 0xf8fbff, soft: true });
  [[-52, 52], [70, -30], [-20, -80]].forEach(([x, z]) => {
    const g = new T.Group();
    [[0.9, 0.9], [0.65, 2.0], [0.45, 2.85]].forEach(([r, y]) => { const s = new T.Mesh(new T.SphereGeometry(r, 12, 10), snowMat); s.position.y = y; g.add(s); });
    const nose = new T.Mesh(new T.ConeGeometry(0.08, 0.5, 6), toonMat({ color: 0xf08a2c })); nose.rotation.x = Math.PI / 2; nose.position.set(0, 2.85, 0.5); g.add(nose);
    const hat = new T.Mesh(new T.CylinderGeometry(0.28, 0.34, 0.5, 10), toonMat({ color: 0x2c3340 })); hat.position.y = 3.35; g.add(hat);
    g.position.set(x, 0, z); props.add(g);
    colliders.push({ x, z, r: 0.9 });
  });

  // ---- Slalom cones on the ice
  const coneMat = toonMat({ color: 0xff7a1a });
  for (let i = 0; i < 6; i++) {
    const cone = new T.Mesh(new T.ConeGeometry(0.45, 1, 10), coneMat);
    cone.position.set(i % 2 ? 6 : -6, 0.56, 22 - i * 9);
    props.add(cone);
  }
  addOutlines(props, OUT);

  // ---- Distant mountains (gives the lake a horizon)
  const mGeo = colorCone(new T.ConeGeometry(1, 1, 6, 1), 1, 0xf4f8fc, 0x7c93b4, 0.28, 0.35);
  const mtn = new T.InstancedMesh(mGeo, toonMat({ vertexColors: true, soft: true }), 18);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rng() * 0.2, d = 300 + rng() * 30, h = 70 + rng() * 60, w = 70 + rng() * 40;
    dummy.position.set(Math.cos(a) * d, h / 2 - 2, Math.sin(a) * d); dummy.rotation.set(0, rng() * 6, 0); dummy.scale.set(w, h, w); dummy.updateMatrix();
    mtn.setMatrixAt(i, dummy.matrix);
  }
  mtn.frustumCulled = false; scene.add(mtn);

  // ---- Falling snow around the camera
  const N = 380, snowPos = new Float32Array(N * 3), r2 = mulberry32(5);
  for (let i = 0; i < N; i++) { snowPos[i * 3] = (r2() - 0.5) * 60; snowPos[i * 3 + 1] = r2() * 24; snowPos[i * 3 + 2] = (r2() - 0.5) * 60; }
  const flakeGeo = new T.BufferGeometry(); flakeGeo.setAttribute('position', new T.BufferAttribute(snowPos, 3));
  const flakes = new T.Points(flakeGeo, new T.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.85, depthWrite: false }));
  flakes.frustumCulled = false;
  scene.add(flakes);

  let clock = 0;
  function update(dt, camPos) {
    clock += dt;
    flakes.position.set(camPos.x, 0, camPos.z);
    const a = flakeGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] -= (1.6 + (i % 5) * 0.35) * dt;
      a[i * 3] += Math.sin(a[i * 3 + 1] * 0.7 + i) * 0.25 * dt;
      if (a[i * 3 + 1] < 0) a[i * 3 + 1] += 24;
    }
    flakeGeo.attributes.position.needsUpdate = true;
    const pulse = 3.3 + Math.sin(clock * 2.1) * 0.15;
    for (let i = 0; i < glows.length; i++) glows[i].scale.setScalar(pulse + (i % 3) * 0.05);
    if (dirty && ++tick % 3 === 0) { iceTex.needsUpdate = true; dirty = false; }
  }

  const onIce = (x, z) => (x / LAKE.rx) ** 2 + (z / LAKE.rz) ** 2 < 1;
  return { colliders, onIce, trail, scuff, update };
}
