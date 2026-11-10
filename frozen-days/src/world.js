// Winter world (cel-shaded): terrain, organic frozen lake with skate trails, pine woods, shore dressing and distant mountains.
// Districts, roads and lakeside furniture come from town.js; where things are comes from layout.js.
import { mulberry32 } from './util.js';
import { toonMat, addOutlines, addInstancedOutline } from './anime.js';
import { createTown } from './town.js';
import { MAP_HALF, LAKE_BOX, lakeR, lakeEdgeDist, heightAt, groundH, onIce, zoneAt, RECT, ACCESS, DOCKS } from './layout.js';
const T = THREE;

export { MAP_HALF, heightAt };

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
  const dummy = new T.Object3D(), hide = (m, i) => m.setMatrixAt(i, dummy.matrix.identity().scale(new T.Vector3(0.001, 0.001, 0.001)));

  // ---- Snow ground: a displaced terrain mesh (gentle rolls, hill, creek channel) over a huge flat plane
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
  const snowMat = toonMat({ map: snowTex, soft: true, vertexColors: true });
  const baseGeo = new T.PlaneGeometry(1200, 1200); baseGeo.rotateX(-Math.PI / 2);
  { const uv = baseGeo.attributes.uv, pos = baseGeo.attributes.position, col = new Float32Array(pos.count * 3).fill(1);
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 13.3, pos.getZ(i) / 13.3);
    baseGeo.setAttribute('color', new T.BufferAttribute(col, 3)); }
  const base = new T.Mesh(baseGeo, snowMat); base.position.y = -0.2; scene.add(base);
  const TS = 340, TN = 112, terrGeo = new T.PlaneGeometry(TS, TS, TN, TN); terrGeo.rotateX(-Math.PI / 2);
  { const pos = terrGeo.attributes.position, uv = terrGeo.attributes.uv, col = new Float32Array(pos.count * 3), r = mulberry32(5);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = groundH(x, z);
      pos.setY(i, h); uv.setXY(i, x / 13.3, z / 13.3);
      const k = 0.985 + r() * 0.015, wet = Math.min(1, Math.max(0, -h / 0.8));
      col[i * 3] = k * (1 - wet * 0.55); col[i * 3 + 1] = k * (1 - wet * 0.3); col[i * 3 + 2] = k * (1 - wet * 0.05);
    }
    terrGeo.setAttribute('color', new T.BufferAttribute(col, 3)); terrGeo.computeVertexNormals(); }
  scene.add(new T.Mesh(terrGeo, snowMat));

  // ---- Lake: organic shoreline (slushy rim + ice), drawn as star-shaped fans around the lake centre
  function lakeFan(grow, y, uvMap) {
    const N = 192, pos = [0, y, 0], uv = uvMap ? [0.5, 0.5] : null, idx = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, r = lakeR(a) + grow, x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, y, z); if (uv) uv.push(x / LAKE_BOX.w + 0.5, 0.5 - z / LAKE_BOX.h);
      idx.push(0, 1 + ((i + 1) % N), 1 + i);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    if (uv) g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); return g;
  }
  scene.add(new T.Mesh(lakeFan(4.5, 0.03, false), toonMat({ color: 0xc9d9e8, soft: true })));

  const IW = 1024, IH = 1024;
  const iceCanvas = document.createElement('canvas');
  iceCanvas.width = IW; iceCanvas.height = IH;
  const ictx = iceCanvas.getContext('2d');
  const grad = ictx.createRadialGradient(IW / 2, IH / 2, 40, IW / 2, IH / 2, IW * 0.55);
  grad.addColorStop(0, '#68a8d4'); grad.addColorStop(1, '#4880b0');
  ictx.fillStyle = grad; ictx.fillRect(0, 0, IW, IH);
  const r1 = mulberry32(11);
  ictx.lineCap = 'round';
  for (let i = 0; i < 80; i++) {
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
  const ice = new T.Mesh(lakeFan(0, 0.06, true), new T.MeshStandardMaterial({ map: iceTex, roughness: 0.25, metalness: 0.0, envMapIntensity: 0.12 }));
  scene.add(ice);

  const toPx = (x, z) => [(x / LAKE_BOX.w + 0.5) * IW, (z / LAKE_BOX.h + 0.5) * IH];
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
    ictx.beginPath(); ictx.ellipse(p[0], p[1], r * 7.5, r * 7.5, 0, 0, Math.PI * 2); ictx.fill();
    dirty = true;
  }

  // ---- Town: districts, roads, lakeside furniture (built first so scenery can avoid it)
  const town = createTown(scene);
  colliders.push(...town.colliders);
  const blocked = town.blocked;
  const rng = mulberry32(7);

  // ---- Pine forest (instanced, snow-tipped): dense in the NW corner, lighter SW, sparse elsewhere
  const trees = [];
  const inRect = (x, z, r) => x > r[0] && x < r[1] && z > r[2] && z < r[3];
  const districtRects = [RECT.commercial, RECT.park, RECT.residential, RECT.community];
  const farFromLake = (x, z, d) => lakeEdgeDist(x, z) > d;
  function scatter(rect, count, minLake, tries0) {
    let n = 0, tries = 0;
    while (n < count && tries++ < tries0) {
      const x = rect[0] + rng() * (rect[1] - rect[0]), z = rect[2] + rng() * (rect[3] - rect[2]);
      if (!farFromLake(x, z, minLake) || blocked(x, z, 3.2) || Math.abs(x) > MAP_HALF || Math.abs(z) > MAP_HALF) continue;
      trees.push({ x, z, s: 0.8 + rng() * 0.9 }); n++;
    }
  }
  scatter(RECT.nw, 86, 18, 4000); scatter(RECT.sw, 56, 18, 4000);
  scatter([-146, 146, -146, 146], 90, 20, 8000); // light cover everywhere else (rejected inside districts)
  for (let i = trees.length - 1; i >= 0; i--) if (districtRects.some((r) => inRect(trees[i].x, trees[i].z, r)) || (inRect(trees[i].x, trees[i].z, RECT.ne) || inRect(trees[i].x, trees[i].z, RECT.se))) trees.splice(i, 1);
  for (let t = -MAP_HALF - 8; t <= MAP_HALF + 8; t += 5) {
    const s = 1.5 + rng() * 0.6;
    trees.push({ x: t, z: -MAP_HALF - 6, s }, { x: t, z: MAP_HALF + 6, s }, { x: -MAP_HALF - 6, z: t, s }, { x: MAP_HALF + 6, z: t, s });
  }
  town.trees.forEach((t) => trees.push(t));
  const trunks = new T.InstancedMesh(new T.CylinderGeometry(0.28, 0.4, 2, 6), toonMat({ color: 0x5a3f2c }), trees.length);
  const foliageMat = toonMat({ vertexColors: true });
  const tiers = [0, 1, 2].map(() => new T.InstancedMesh(colorCone(new T.ConeGeometry(1.7, 2.6, 7, 1), 2.6, 0xf4f8fc, 0x2e6048), foliageMat, trees.length));
  trees.forEach((tr, i) => {
    const gy = groundH(tr.x, tr.z);
    dummy.rotation.set(0, i * 1.7, 0);
    dummy.position.set(tr.x, gy + tr.s, tr.z); dummy.scale.set(tr.s, tr.s, tr.s); dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    tiers.forEach((m, k) => {
      const sc = tr.s * (1 - k * 0.24);
      dummy.position.set(tr.x, gy + tr.s * (2.2 + k * 1.2), tr.z); dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    if (Math.abs(tr.x) <= MAP_HALF + 2 && Math.abs(tr.z) <= MAP_HALF + 2) colliders.push({ x: tr.x, z: tr.z, r: 0.55 * tr.s + 0.2 });
  });
  [trunks, ...tiers].forEach((m) => { m.frustumCulled = false; scene.add(m); });
  tiers.forEach((m) => addInstancedOutline(m, scene, { thick: 0.002, fade: 1 }));

  // ---- Shore dressing keeps clear of the access spurs and docks
  const keepClear = ACCESS.concat(DOCKS.map((d) => d.deg));
  const clearAng = (a, tol) => keepClear.every((d) => Math.abs(Math.atan2(Math.sin(a - d * Math.PI / 180), Math.cos(a - d * Math.PI / 180))) > tol);
  const shoreAt = (a, k) => { const r = lakeR(a) + k; return [Math.cos(a) * r, Math.sin(a) * r]; };

  // Snow banks
  const banks = new T.InstancedMesh(new T.SphereGeometry(1, 10, 7), toonMat({ color: 0xf2f7fc, soft: true }), 90);
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2 + rng() * 0.05, [x, z] = shoreAt(a, 5.2 + rng() * 1.6);
    if (!clearAng(a, 0.2) || blocked(x, z, 1)) { hide(banks, i); continue; }
    const s = 2 + rng() * 2.2;
    dummy.position.set(x, 0.05, z); dummy.rotation.set(0, rng() * 6, 0); dummy.scale.set(s, 0.45 + rng() * 0.3, s * (0.7 + rng() * 0.4)); dummy.updateMatrix();
    banks.setMatrixAt(i, dummy.matrix);
  }
  banks.frustumCulled = false; scene.add(banks);

  // Rocks (snow-capped) with colliders: shoreline plus the wooded corners
  const rockGeo = colorBlob(new T.IcosahedronGeometry(1, 0), 1, 0xf2f6fa, 0x7f90a6);
  const ROCKS = 54, rocks = new T.InstancedMesh(rockGeo, toonMat({ vertexColors: true }), ROCKS);
  for (let i = 0; i < ROCKS; i++) {
    let x, z;
    if (i < 30) { const a = rng() * Math.PI * 2; [x, z] = shoreAt(a, 6 + rng() * 10); if (!clearAng(a, 0.3)) { hide(rocks, i); continue; } }
    else { const R = [RECT.sw, RECT.nw, RECT.se, RECT.ne][i % 4]; x = R[0] + rng() * (R[1] - R[0]); z = R[2] + rng() * (R[3] - R[2]); }
    const s = 0.8 + rng() * 1.3;
    if (blocked(x, z, 3.2) || Math.abs(x) > MAP_HALF || Math.abs(z) > MAP_HALF) { hide(rocks, i); continue; }
    dummy.position.set(x, groundH(x, z) + s * 0.45, z); dummy.rotation.set(rng(), rng() * 6, rng()); dummy.scale.set(s, s * 0.75, s * 1.1); dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    colliders.push({ x, z, r: s * 0.95 });
  }
  rocks.frustumCulled = false; scene.add(rocks); addInstancedOutline(rocks, scene, { thick: 0.0022, fade: 1 });

  // Snowy bushes
  const bushGeo = colorBlob(new T.SphereGeometry(1, 9, 7), 1, 0xeef4f9, 0x3f6e58);
  const BUSH = 64, bushes = new T.InstancedMesh(bushGeo, toonMat({ vertexColors: true }), BUSH);
  for (let i = 0; i < BUSH; i++) {
    let x, z;
    if (i < 34) { const a = rng() * Math.PI * 2; [x, z] = shoreAt(a, 14 + rng() * 14); }
    else { const R = [RECT.sw, RECT.nw, RECT.se, RECT.ne][i % 4]; x = R[0] + rng() * (R[1] - R[0]); z = R[2] + rng() * (R[3] - R[2]); }
    const s = 0.7 + rng() * 0.7;
    if (blocked(x, z, 3) || Math.abs(x) > MAP_HALF || Math.abs(z) > MAP_HALF) { hide(bushes, i); continue; }
    dummy.position.set(x, groundH(x, z) + s * 0.7, z); dummy.rotation.set(0, rng() * 6, 0); dummy.scale.set(s * 1.2, s * 0.9, s * 1.2); dummy.updateMatrix();
    bushes.setMatrixAt(i, dummy.matrix);
    colliders.push({ x, z, r: s * 1.0 });
  }
  bushes.frustumCulled = false; scene.add(bushes); addInstancedOutline(bushes, scene, { thick: 0.002, fade: 1 });

  // ---- Snowmen and slalom cones
  const props = new T.Group(); scene.add(props);
  const snowMat2 = toonMat({ color: 0xf8fbff, soft: true });
  [[126, -14], [-130, -6], [-18, 90], [40, 68]].forEach(([x, z]) => {
    if (blocked(x, z, 2)) return;
    const g = new T.Group();
    [[0.9, 0.9], [0.65, 2.0], [0.45, 2.85]].forEach(([r, y]) => { const s = new T.Mesh(new T.SphereGeometry(r, 12, 10), snowMat2); s.position.y = y; g.add(s); });
    const nose = new T.Mesh(new T.ConeGeometry(0.08, 0.5, 6), toonMat({ color: 0xf08a2c })); nose.rotation.x = Math.PI / 2; nose.position.set(0, 2.85, 0.5); g.add(nose);
    const hat = new T.Mesh(new T.CylinderGeometry(0.28, 0.34, 0.5, 10), toonMat({ color: 0x2c3340 })); hat.position.y = 3.35; g.add(hat);
    g.position.set(x, groundH(x, z), z); g.rotation.y = Math.atan2(-x, -z); props.add(g);
    colliders.push({ x, z, r: 0.9 });
  });
  const coneMat = toonMat({ color: 0xff7a1a });
  for (let i = 0; i < 6; i++) {
    const cone = new T.Mesh(new T.ConeGeometry(0.45, 1, 10), coneMat);
    cone.position.set(26 + (i % 2 ? 5 : -5), 0.56, 12 - i * 8);
    props.add(cone);
  }
  addOutlines(props, OUT);

  // ---- Lamp glows: one Points object for every lamp, lantern and window-light spot
  const glowTex = glowTexture();
  const gp = new Float32Array(town.glowPts.length * 3);
  town.glowPts.forEach((p, i) => { gp[i * 3] = p[0]; gp[i * 3 + 1] = p[1]; gp[i * 3 + 2] = p[2]; });
  const glowGeo = new T.BufferGeometry(); glowGeo.setAttribute('position', new T.BufferAttribute(gp, 3));
  const glowMat = new T.PointsMaterial({ map: glowTex, size: 3.6, sizeAttenuation: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false });
  const glows = new T.Points(glowGeo, glowMat); glows.frustumCulled = false; scene.add(glows);

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
    flakes.position.set(camPos.x, Math.max(0, camPos.y - 12), camPos.z);
    const a = flakeGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] -= (1.6 + (i % 5) * 0.35) * dt;
      a[i * 3] += Math.sin(a[i * 3 + 1] * 0.7 + i) * 0.25 * dt;
      if (a[i * 3 + 1] < 0) a[i * 3 + 1] += 24;
    }
    flakeGeo.attributes.position.needsUpdate = true;
    glowMat.size = 3.6 + Math.sin(clock * 2.1) * 0.16;
    for (let i = 0; i < town.flicker.length; i++) town.flicker[i].scale.setScalar(8.5 + Math.sin(clock * 9) * 0.5 + Math.sin(clock * 13.7) * 0.4);
    if (dirty && ++tick % 3 === 0) { iceTex.needsUpdate = true; dirty = false; }
  }

  return { colliders, onIce, trail, scuff, update, zoneAt, heightAt };
}
