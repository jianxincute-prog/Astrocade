// Builds the 3D city from logic/city.js: ground + streets, themed districts, the plaza, three HQs, street furniture, sky.
// Static geometry is merged by render/geo.js; animated bits (flags, fires, smoke, searchlights, fountains) live in update().
import { GANGS, HALF, CELL, CELLS, ROAD, BLOCK, LOT, cellCenter, mulberry32, COMPOUNDS } from '../logic/city.js';
import { Mesher } from './geo.js';
import { canvasTex, makeFacades, makeSurfaces, makeSignAtlas, signUV, makePlazaTex, makeEmblemTex } from './textures.js';
import * as P from './props.js';
import { buildBuilding, buildOpenBlock } from './buildings.js';
import { buildHQs } from './hq.js';

export function buildWorld(T, scene, city, opts = {}) {
  const tod = opts.timeOfDay || 'sunset', night = tod === 'night';
  const rnd = mulberry32(99), obstacles = [];
  const glowK = night ? 1 : tod === 'sunset' ? 0.55 : 0.12;
  const emisK = night ? 0.95 : tod === 'sunset' ? 0.5 : 0.0;

  // ---- materials
  const F = makeFacades(T), S = makeSurfaces(T), atlas = makeSignAtlas(T);
  const vc = { vertexColors: true };
  const mats = {
    plain: new T.MeshStandardMaterial({ ...vc, roughness: 0.88 }),
    plainDS: new T.MeshStandardMaterial({ ...vc, roughness: 0.9, side: T.DoubleSide }),
    metal: new T.MeshStandardMaterial({ ...vc, roughness: 0.42, metalness: 0.65 }),
    gold: new T.MeshStandardMaterial({ ...vc, map: null, color: 0xd8ae48, roughness: 0.28, metalness: 0.85 }),
    glow: new T.MeshBasicMaterial({ ...vc, toneMapped: false }),
    glass: new T.MeshStandardMaterial({ ...vc, roughness: 0.12, metalness: 0.5, transparent: true, opacity: 0.45, side: T.DoubleSide }),
    tar: new T.MeshStandardMaterial({ ...vc, map: S.tar, roughness: 0.95 }),
    corr: new T.MeshStandardMaterial({ ...vc, map: S.corrugated, roughness: 0.7, metalness: 0.3 }),
    tiles: new T.MeshStandardMaterial({ ...vc, map: S.tiles, roughness: 0.5, metalness: 0.15 }),
    wood: new T.MeshStandardMaterial({ ...vc, map: S.wood, roughness: 0.9 }),
    water: new T.MeshStandardMaterial({ ...vc, map: S.water, roughness: 0.12, metalness: 0.3 }),
    sign: new T.MeshBasicMaterial({ map: atlas, ...vc, toneMapped: false }),
  };
  mats.roofTar = mats.tar;
  const facades = {};
  for (const k in F) facades[k] = new T.MeshStandardMaterial({ ...vc, map: F[k].map, emissiveMap: F[k].emis, emissive: new T.Color(0xffffff), emissiveIntensity: emisK, roughness: 0.78 });

  // x-ray cut-away: walls between the camera and the hero are dithered out so the fight is never hidden behind a building
  const cutU = { uCam: { value: new T.Vector3(0, 100, 0) }, uFocus: { value: new T.Vector3(0, 100, 0) } };
  const cutaway = (m) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uCam = cutU.uCam; sh.uniforms.uFocus = cutU.uFocus;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform vec3 uCam; uniform vec3 uFocus;')
        .replace('void main() {', `void main() {
  { vec3 ab = uFocus - uCam; float t = clamp(dot(vWP - uCam, ab) / max(dot(ab, ab), 1.0), 0.0, 1.0);
    float r = mix(5.8, 2.7, t), d = length(vWP - (uCam + ab * t));
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    if (vWP.y > 0.6 && t < 0.985 && (d < r * 0.55 || (d < r && n > smoothstep(r * 0.55, r, d)))) discard; } `);
    };
    m.customProgramCacheKey = () => 'cutaway';
  };
  [mats.plain, mats.plainDS, mats.metal, mats.gold, mats.glow, mats.tar, mats.corr, mats.tiles, mats.wood, mats.sign, ...Object.values(facades)].forEach(cutaway);

  const M = new Mesher(T);
  const ctx = {
    T, M, mats, facades, g: P.makeGeos(T), rnd, signUV, anim: [],
    smoke: [], fires: [], beams: [], sprays: [], flags: [], pads: [], lights: [], lamps: [], decals: [],
    solid: (x, z, w, d) => obstacles.push({ x, z, w, d }),
  };

  // ---- ground
  S.asphalt.repeat.set(70, 70);
  const ground = new T.Mesh(new T.PlaneGeometry(HALF * 2 + 700, HALF * 2 + 700), new T.MeshStandardMaterial({ map: S.asphalt, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // ---- road markings (instanced unit boxes scaled per instance)
  const m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), sc = new T.Vector3(), eu = new T.Euler();
  const markings = { yellow: [], white: [], stop: [] };
  const inPlaza = (x, z) => Math.abs(x) < CELL - ROAD / 2 && Math.abs(z) < CELL - ROAD / 2;
  const inHQ = (x, z) => COMPOUNDS.some((c) => x > c.rect.x0 - 6 && x < c.rect.x1 + 6 && z > c.rect.z0 - 6 && z < c.rect.z1 + 6 && x > c.rect.x0 - 0.1 && x < c.rect.x1 + 0.1 && z > c.rect.z0 - 0.1 && z < c.rect.z1 + 0.1);
  for (let i = 1; i < CELLS; i++) {
    const r = -HALF + CELL * i;
    for (let k = 0; k < CELLS; k++) {
      const a0 = -HALF + CELL * k + ROAD / 2 + 3.6, a1 = -HALF + CELL * (k + 1) - ROAD / 2 - 3.6, mid = (a0 + a1) / 2;
      for (const vert of [true, false]) {
        const px = vert ? r : mid, pz = vert ? mid : r;
        if (inPlaza(px, pz) || inHQ(px, pz)) continue;
        const len = a1 - a0, rot = vert ? 0 : Math.PI / 2, off = (o) => (vert ? [r + o, mid] : [mid, r + o]);
        for (const o of [-0.18, 0.18]) markings.yellow.push([...off(o), 0.12, len, rot]);
        for (const o of [-ROAD / 2 + 0.7, ROAD / 2 - 0.7]) markings.white.push([...off(o), 0.14, len, rot]);
        for (let s = a0 + 2; s < a1 - 2; s += 5.5) for (const o of [-ROAD / 4, ROAD / 4]) markings.white.push([...(vert ? [r + o, s] : [s, r + o]), 0.14, 2.6, rot]);
      }
    }
    for (let j = 1; j < CELLS; j++) {
      const x = r, z = -HALF + CELL * j;
      if (inPlaza(x, z) || inHQ(x, z)) continue;
      for (let kk = -3; kk <= 3; kk++) {
        markings.white.push([x + kk * 1.2, z - ROAD / 2 - 1.1, 0.6, 2.2, 0]); markings.white.push([x + kk * 1.2, z + ROAD / 2 + 1.1, 0.6, 2.2, 0]);
        markings.white.push([x - ROAD / 2 - 1.1, z + kk * 1.2, 2.2, 0.6, 0]); markings.white.push([x + ROAD / 2 + 1.1, z + kk * 1.2, 2.2, 0.6, 0]);
      }
      markings.stop.push([x - 2.5, z - ROAD / 2 - 3, 4.6, 0.45, 0]); markings.stop.push([x + 2.5, z + ROAD / 2 + 3, 4.6, 0.45, 0]);
      markings.stop.push([x - ROAD / 2 - 3, z + 2.5, 0.45, 4.6, 0]); markings.stop.push([x + ROAD / 2 + 3, z - 2.5, 0.45, 4.6, 0]);
    }
  }
  const boxG = new T.BoxGeometry(1, 0.02, 1);
  const paint = (list, color, y) => {
    if (!list.length) return;
    const im = new T.InstancedMesh(boxG, new T.MeshStandardMaterial({ color, roughness: 0.7 }), list.length);
    list.forEach((d, n) => {
      // [x, z, scaleX, scaleZ, rotY]
      eu.set(0, d[4], 0); q.setFromEuler(eu);
      m4.compose(v.set(d[0], y, d[1]), q, sc.set(d[2], 1, d[3])); im.setMatrixAt(n, m4);
    });
    im.receiveShadow = true; scene.add(im);
  };
  paint(markings.yellow, 0xe6b422, 0.012);
  paint(markings.white, 0xd9d6c8, 0.011);
  paint(markings.stop, 0xe8e4d4, 0.012);
  // manholes
  const mh = [];
  for (let i = 1; i < CELLS; i++) for (let j = 0; j < CELLS; j++) if (rnd() < 0.5) { const x = -HALF + CELL * i + (rnd() < 0.5 ? -2 : 2), z = cellCenter(j) + (rnd() - 0.5) * 14; if (!inPlaza(x, z) && !inHQ(x, z)) mh.push([x, z]); }
  if (mh.length) {
    const im = new T.InstancedMesh(new T.CylinderGeometry(0.55, 0.55, 0.03, 14), new T.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5, metalness: 0.6 }), mh.length);
    mh.forEach((d, n) => { m4.compose(v.set(d[0], 0.015, d[1]), q.identity(), sc.set(1, 1, 1)); im.setMatrixAt(n, m4); }); scene.add(im);
  }

  // ---- blocks (sidewalk slabs per district) + curbs
  const walkMats = [S.walkWolves, S.walkDragons, S.walkCobras].map((t) => { t.repeat.set(6, 6); return new T.MeshStandardMaterial({ map: t, roughness: 0.9 }); });
  const plazaWalk = new T.MeshStandardMaterial({ map: (S.walkPlaza.repeat.set(6, 6), S.walkPlaza), roughness: 0.85 });
  const hqCell = (i, j) => city.plan.find((p) => p.i === i && p.j === j).kind === 'hq';
  for (const p of city.plan) {
    if (p.kind === 'plaza' || p.kind === 'hq') continue;
    const b = new T.Mesh(new T.BoxGeometry(BLOCK, 0.22, BLOCK), walkMats[p.gang]);
    b.position.set(p.x, 0.11, p.z); b.receiveShadow = true; scene.add(b);
    const cb = [0xa8a49c, 0xa59a8a, 0xc9c0a8][p.gang], h = BLOCK / 2;
    M.box(mats.plain, p.x, 0.17, p.z - h + 0.12, BLOCK, 0.34, 0.24, { color: cb }); M.box(mats.plain, p.x, 0.17, p.z + h - 0.12, BLOCK, 0.34, 0.24, { color: cb });
    M.box(mats.plain, p.x - h + 0.12, 0.17, p.z, 0.24, 0.34, BLOCK - 0.48, { color: cb }); M.box(mats.plain, p.x + h - 0.12, 0.17, p.z, 0.24, 0.34, BLOCK - 0.48, { color: cb });
  }
  void hqCell;

  // ---- buildings, open blocks
  for (const b of city.buildings) { obstacles.push({ x: b.x, z: b.z, w: b.w, d: b.d }); buildBuilding(ctx, b); }
  for (const p of city.parks) if (p.kind !== 'plaza' && p.kind !== 'hq') buildOpenBlock(ctx, p);
  buildHQs(ctx, city);

  // ---- pads (textured ground patches: yards, courtyards, markets, lawns)
  const flat = (t) => { const c2 = t.clone(); c2.needsUpdate = true; c2.repeat.set(1, 1); return c2; };
  const padMat = {
    gravel: new T.MeshStandardMaterial({ map: S.gravel, roughness: 1 }),
    grass: new T.MeshStandardMaterial({ map: S.grass, roughness: 1 }),
    dragons: new T.MeshStandardMaterial({ map: flat(S.walkDragons), roughness: 0.85 }),
    cobras: new T.MeshStandardMaterial({ map: flat(S.walkCobras), roughness: 0.55, metalness: 0.1 }),
    denPad: new T.MeshStandardMaterial({ map: S.gravel, roughness: 1, color: 0x8a8480 }),
  };
  for (const pd of ctx.pads) {
    const big = pd.w > 26 || pd.d > 26;           // compound courtyards sit flush with the 0.22 block level
    const g = new T.PlaneGeometry(pd.w, pd.d), uv = g.attributes.uv;
    const rep = pd.mat === 'grass' ? 5 : 4;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * pd.w / rep, uv.getY(i) * pd.d / rep);
    const m = new T.Mesh(g, padMat[pd.mat] || padMat.gravel);
    m.rotation.x = -Math.PI / 2; m.position.set(pd.x, big ? 0.222 : 0.226, pd.z); m.receiveShadow = true; scene.add(m);
    if (big) { const base = new T.Mesh(new T.BoxGeometry(pd.w, 0.22, pd.d), new T.MeshStandardMaterial({ color: 0x55524e, roughness: 1 })); base.position.set(pd.x, 0.109, pd.z); base.receiveShadow = true; scene.add(base); }
  }
  // arena emblems
  for (const d of ctx.decals) {
    const m = new T.Mesh(new T.CircleGeometry(d.r, 48), new T.MeshStandardMaterial({ map: makeEmblemTex(T, d.gang), color: 0xa8a8a8, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.position.set(d.x, 0.236, d.z); m.receiveShadow = true; scene.add(m);
  }

  // ---- central plaza
  buildPlaza(ctx, T, scene, S, obstacles, rnd, plazaWalk);

  // ---- street furniture, trees, parked cars
  streetLife(ctx, city, rnd, night);

  // ---- perimeter wall + distant skyline
  perimeter(ctx, T, scene, F, rnd);

  M.build(scene);

  // ---- dynamic dressing
  const anim = makeDynamic(T, scene, ctx, glowK, night);

  // ---- sky
  const sky = makeSky(T, scene, tod, opts.sunDir);
  scene.fog = new T.Fog(sky.horizon, tod === 'night' ? 60 : 90, 330);
  scene.background = new T.Color(sky.horizon);

  // ---- real lights for the three HQ arenas (cheap fake glows cover everything else)
  city.hqs.forEach((h, gi) => {
    const col = [0xff7a4a, 0x6ac0ff, 0xffd27a][gi];
    const light = new T.PointLight(col, night ? 3 : 1.6, 30, 2);
    light.position.set(h.x, 5, h.z); scene.add(light);
  });

  return {
    obstacles,
    sky,
    /** Camera position + hero position (call every frame) drive the cut-away. */
    setFocus(cam, x, y, z) { cutU.uCam.value.copy(cam); cutU.uFocus.value.set(x, y, z); },
    update(time) { anim(time); sky.update(time); },
  };
}

// ====================================================================================================== plaza
function buildPlaza(c, T, scene, S, obstacles, rnd, plazaWalk) {
  const { M, mats } = c, W = CELL * 2 - ROAD;                    // 65
  const plaza = new T.Mesh(new T.PlaneGeometry(W, W), new T.MeshStandardMaterial({ map: makePlazaTex(T), roughness: 0.85 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.262, 0); plaza.receiveShadow = true; scene.add(plaza);
  const base = new T.Mesh(new T.BoxGeometry(W, 0.26, W), new T.MeshStandardMaterial({ color: 0x8f877a, roughness: 0.9 }));
  base.position.set(0, 0.13, 0); base.receiveShadow = true; scene.add(base);
  const h = W / 2;
  // stone kerb all round + corner piers
  for (const s of [-1, 1]) { M.box(mats.plain, 0, 0.3, s * h, W + 0.4, 0.4, 0.5, { color: 0xb8ae98 }); M.box(mats.plain, s * h, 0.3, 0, 0.5, 0.4, W + 0.4, { color: 0xb8ae98 }); }
  // four corner features, kept clear of the x = 0 / z = 0 boulevards
  const fountain = (x, z) => {
    P.cylXZ(c, mats.plain, x, 0.26, z, 5.6, 5.6, 0.9, 0xd2c8b0, 'cyl16');
    c.M.geo(mats.water, new T.CylinderGeometry(4.9, 4.9, 0.05, 28), x, 1.2, z, 0, {});
    P.cylXZ(c, mats.plain, x, 1.1, z, 1.5, 1.0, 1.6, 0xd2c8b0); P.cylXZ(c, mats.plain, x, 2.7, z, 2.4, 1.6, 0.35, 0xd2c8b0);
    P.cylXZ(c, mats.metal, x, 3.0, z, 0.5, 0.3, 1.6, 0xd8ae48);
    c.sprays.push([x, 3.4, z]); c.sprays.push([x, 1.4, z]);
    obstacles.push({ x, z, w: 11.2, d: 11.2 });
    for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.283; P.bollard(c, x + Math.cos(a) * 6.5, z + Math.sin(a) * 6.5, 0x2a2d30, 0xffd27a); }
  };
  fountain(-20, 20); fountain(20, 20);
  // clock tower (NE)
  {
    const x = 20, z = -20, tint = 0xffffff;
    M.box(c.facades.stone, x, 9, z, 6.4, 18, 6.4, { color: tint, ku: 1 / (8 * 3.2), kv: 1 / (8 * 3.4), roofMat: mats.plain });
    M.box(mats.plain, x, 0.7, z, 8, 1.4, 8, { color: 0xb8ae98 });
    M.box(mats.metal, x, 18.2, z, 7.4, 0.8, 7.4, { color: 0xc59a3c });
    M.box(mats.plain, x, 20.0, z, 5.2, 3.0, 5.2, { color: 0xe6dcc4 });
    for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const fx = x + nx * 2.65, fz = z + nz * 2.65;
      c.M.geo(mats.glow, new T.CylinderGeometry(1.15, 1.15, 0.08, 20), fx, 20.0, fz, 0, { rx: nz ? Math.PI / 2 : 0, rz: nx ? Math.PI / 2 : 0, color: 0xfff4d0 });
      P.bar(c, mats.plain, fx + nx * 0.06, 20.0, fz + nz * 0.06, fx + nx * 0.06 + (nz ? 0.7 : 0), 20.0 + (nz ? 0 : 0.7) + 0.0, fz + nz * 0.06 + (nx ? 0.7 : 0), 0.1, 0x222222);
    }
    M.hipRoof(mats.tiles, x, 21.5, z, 5.2, 5.2, 5.6, 0.9, { ridge: 0.05, color: 0xffffff });
    P.cyl(c, mats.metal, x, 27.1, z, 0.1, 3.5, 0xe8c060, 'cyl8');
    obstacles.push({ x, z, w: 8, d: 8 });
    for (const [dx, dz] of [[-3.2, -3.2], [3.2, 3.2]]) P.planter(c, x + dx * 1.6, z + dz * 1.6, 2.4, 2.4, 0xb8ae98, 0xd96a8a);
  }
  // bandstand (NW)
  {
    const x = -20, z = -20;
    P.cylXZ(c, mats.plain, x, 0.26, z, 6, 6, 0.6, 0xc9bfae, 'cyl16');
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.283; P.cyl(c, mats.metal, x + Math.cos(a) * 4.8, 0.8, z + Math.sin(a) * 4.8, 0.18, 4.4, 0xe6e0d0, 'cyl12'); }
    M.hipRoof(mats.tiles, x, 5.2, z, 9.4, 9.4, 3.0, 0.8, { ridge: 0.08, color: 0xffffff });
    P.cyl(c, mats.metal, x, 8.2, z, 0.08, 1.8, 0xe8c060, 'cyl8');
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.283 + 0.4; P.lantern(c, x + Math.cos(a) * 4.6, 4.7, z + Math.sin(a) * 4.6, 0xffe2a0, 0.2); }
    obstacles.push({ x, z, w: 12, d: 12 });
  }
  // gang colour banners at the plaza edges + lamps + benches + trees
  [[0, -h + 1, 0xd8312a], [h - 1, 8, 0x2f6be0], [-h + 1, 8, 0xe0a91f]].forEach(([bx, bz, col]) => { P.banner(c, bx, bz, 8, col, 0, 1.6, 4.6); c.solid(bx, bz, 0.4, 0.4); });
  for (let k = -3; k <= 3; k++) { if (k === 0) continue; P.lamp(c, k * 9, h - 1.2, 0, 0x2a2420, 0xffe2a0, 1.0); P.lamp(c, k * 9, -h + 1.2, Math.PI, 0x2a2420, 0xffe2a0, 1.0); }
  for (const [x, z, r] of [[-12, 12, 0], [12, 12, 0], [-12, -12, Math.PI], [12, -12, Math.PI], [-26, 0, Math.PI / 2], [26, 0, -Math.PI / 2]]) P.bench(c, x, z, r);
  for (let k = 0; k < 14; k++) { const a = (k / 14) * 6.283 + 0.2; const tx = Math.cos(a) * 29, tz = Math.sin(a) * 29; if (Math.abs(tx) > h - 2 || Math.abs(tz) > h - 2 || Math.abs(tx) < 6 || Math.abs(tz) < 6) continue; P.tree(c, tx, tz, 1.1, 'oak'); }
  for (const [x, z] of [[-9, -29], [9, -29], [-9, 29], [9, 29]]) P.planter(c, x, z, 2.6, 2.6, 0xb8ae98, 0x4a8a3a);
  for (const [x, z] of [[-12, -30], [12, -30], [-30, -12], [30, -12], [-30, 12], [30, 12]]) P.planter(c, x, z, 2, 2, 0xb8ae98, 0xe0a0b0);
}

// ====================================================================================================== street life
function streetLife(c, city, rnd, night) {
  const { M, mats } = c, edge = BLOCK / 2 - 1.15;
  const kinds = ['autumn', 'cherry', 'oak'];
  for (const p of city.plan) {
    if (p.kind === 'plaza' || p.kind === 'hq') continue;
    const g = p.gang;
    // lamps on two opposite corners; traffic lights on the other two
    P.lamp(c, p.x - edge, p.z - edge, Math.PI / 4, g === 2 ? 0x2a2420 : 0x2b2e31, g === 1 ? 0xffb87a : g === 2 ? 0xffd27a : 0xffe2a0, 1.2);
    P.lamp(c, p.x + edge, p.z + edge, Math.PI / 4 + Math.PI, g === 2 ? 0x2a2420 : 0x2b2e31, g === 1 ? 0xffb87a : g === 2 ? 0xffd27a : 0xffe2a0, 1.2);
    P.trafficLight(c, p.x + edge, p.z - edge, -Math.PI / 2); P.trafficLight(c, p.x - edge, p.z + edge, Math.PI / 2);
    // sidewalk mid-block dressing: trees, furniture
    for (const [sx, sz, rot] of [[0, -edge, 0], [0, edge, Math.PI], [-edge, 0, Math.PI / 2], [edge, 0, -Math.PI / 2]]) {
      const r = rnd();
      const tx = p.x + sx + (sx ? 0 : (rnd() - 0.5) * 12), tz = p.z + sz + (sz ? 0 : (rnd() - 0.5) * 12);
      if (r < 0.34) { g === 2 ? P.palm(c, tx, tz, 0.9) : g === 1 ? P.tree(c, tx, tz, 0.8, 'cherry') : P.tree(c, tx, tz, 0.75, kinds[Math.floor(rnd() * 3) % 3 === 1 ? 0 : 2]); }
      else if (r < 0.46) P.bench(c, tx, tz, rot, g === 2 ? 0x2a2420 : 0x6a4a30);
      else if (r < 0.56) P.hydrant(c, tx, tz);
      else if (r < 0.66) P.bin(c, tx, tz);
      else if (r < 0.7) P.busStop(c, tx, tz, rot);
      else if (r < 0.74) P.mailbox(c, tx, tz);
      else if (r < 0.8 && g === 2) { P.bollard(c, tx, tz, 0xd8ae48, 0xffd27a); P.bollard(c, tx + 1.2, tz, 0xd8ae48, 0xffd27a); }
    }
  }
  // parked cars along kerbs, themed per district
  const palette = [[0x6a2a1a, 0x4a4e52, 0x7a6a3a, 0x3a3a3c, 0x8a2020], [0xe8e4d8, 0x2e5a8a, 0xc42a22, 0x3a3a3c, 0x2e6b5a], [0x111111, 0xe8e0c8, 0xc9a227, 0x6a0f18, 0x222a3a]];
  for (let i = 1; i < CELLS; i++) {
    const r = -HALF + CELL * i;
    for (let k = 0; k < CELLS; k++) {
      if (rnd() < 0.5) continue;
      const along = cellCenter(k) + (rnd() - 0.5) * 10, vertical = rnd() < 0.5, side = rnd() < 0.5 ? -1 : 1;
      const x = vertical ? r + side * (ROAD / 2 - 1.5) : along, z = vertical ? along : r + side * (ROAD / 2 - 1.5);
      if (Math.hypot(x, z) < 42 || Math.abs(x) < 9 && z > -75 && z < 80) continue;
      if (COMPOUNDS.some((cp) => x > cp.rect.x0 - 6 && x < cp.rect.x1 + 6 && z > cp.rect.z0 - 6 && z < cp.rect.z1 + 6)) continue;
      const gg = city.plan.reduce((best, p) => (Math.hypot(p.x - x, p.z - z) < best[0] ? [Math.hypot(p.x - x, p.z - z), p.gang] : best), [1e9, 0])[1];
      const pal = palette[Math.max(0, gg)];
      P.car(c, x, z, vertical ? 0 : Math.PI / 2, pal[Math.floor(rnd() * pal.length)], { night, len: gg === 2 ? 4.8 : 4.2 });
    }
  }
  void M; void mats;
}

// ====================================================================================================== perimeter + skyline
function perimeter(c, T, scene, F, rnd) {
  const { M, mats } = c, W = HALF + 0.6;
  for (const [x, z, w, d] of [[0, -W, W * 2 + 3, 1.2], [0, W, W * 2 + 3, 1.2], [-W, 0, 1.2, W * 2], [W, 0, 1.2, W * 2]]) {
    M.box(mats.plain, x, 2.4, z, w, 4.8, d, { color: 0x6a6862 });
    M.box(mats.plain, x, 4.9, z, w + (w > d ? 0 : 0.4), 0.3, d + (w > d ? 0.4 : 0), { color: 0x8a8880 });
    const horiz = w > d, L = horiz ? w : d;
    for (let k = 0; k < L / 12; k++) { const s = -L / 2 + 6 + k * 12; M.box(mats.plain, x + (horiz ? s : 0), 2.6, z + (horiz ? 0 : s), horiz ? 0.9 : 1.6, 5.2, horiz ? 1.6 : 0.9, { color: 0x7a7870 }); }
  }
  // outer skyline: dark glass towers receding into the haze
  const rng = mulberry32(555);
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2 + rng() * 0.05, r = 215 + rng() * 70, bw = 14 + rng() * 14, h = 60 + rng() * 120;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, floors = Math.round(h / 3.4);
    M.box(c.facades.glass, x, floors * 3.4 / 2, z, Math.floor(bw / 3.2) * 3.2, floors * 3.4, Math.floor(bw / 3.2) * 3.2, { color: 0x6a7a8a, ku: 1 / (8 * 3.2), kv: 1 / (8 * 3.4), uv0: [Math.floor(rng() * 8) / 8, 0], roofMat: mats.plain });
    if (rng() < 0.4) P.cyl(c, mats.metal, x, floors * 3.4, z, 0.3, 14, 0x8a9096, 'cyl8');
  }
  void F; void T; void scene;
}

// ====================================================================================================== dynamic dressing
function makeDynamic(T, scene, c, glowK, night) {
  const m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3(), eu = new T.Euler(), col = new T.Color();
  // ground glow discs under lamps and light sources
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const glowTex = new T.CanvasTexture(cv);
  const glowMat = new T.MeshBasicMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.55 * glowK + 0.06, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, vertexColors: false });
  const glowList = [...c.lamps.map((l) => ({ x: l[0], z: l[1], r: 3.6, col: 0xffd9a0 })), ...c.lights.map((l) => ({ x: l.x, z: l.z, r: 6, col: l.col }))];
  if (glowList.length) {
    const im = new T.InstancedMesh(new T.CircleGeometry(1, 20), glowMat, glowList.length);
    glowList.forEach((d, n) => { eu.set(-Math.PI / 2, 0, 0); q.setFromEuler(eu); m4.compose(v.set(d.x, 0.28, d.z), q, s.set(d.r, d.r, d.r)); im.setMatrixAt(n, m4); im.setColorAt(n, col.setHex(d.col)); });
    im.renderOrder = 3; scene.add(im);
  }
  // flags
  const flagGeo = new T.PlaneGeometry(2.4, 1.5);
  const flags = c.flags.map(([fx, fy, fz, color, rot], i) => {
    const m = new T.Mesh(flagGeo, new T.MeshStandardMaterial({ color, side: T.DoubleSide, roughness: 0.8 }));
    m.position.set(fx + 1.2 * Math.cos(rot), fy, fz - 1.2 * Math.sin(rot)); m.castShadow = true; scene.add(m);
    return { m, rot, i };
  });
  // fires (two cones each)
  const fireO = new T.InstancedMesh(new T.ConeGeometry(0.42, 1, 8), new T.MeshBasicMaterial({ color: 0xff7a1a, toneMapped: false }), Math.max(1, c.fires.length));
  const fireI = new T.InstancedMesh(new T.ConeGeometry(0.25, 0.7, 8), new T.MeshBasicMaterial({ color: 0xffd04a, toneMapped: false }), Math.max(1, c.fires.length));
  fireO.count = fireI.count = c.fires.length; scene.add(fireO, fireI);
  // smoke puffs
  const PUFF = 6, smokeGeo = new T.IcosahedronGeometry(1, 1);
  const smokeMat = new T.MeshBasicMaterial({ color: 0x8a8480, transparent: true, opacity: 0.4, depthWrite: false, fog: true });
  const smoke = new T.InstancedMesh(smokeGeo, smokeMat, Math.max(1, c.smoke.length * PUFF)); smoke.count = c.smoke.length * PUFF; smoke.frustumCulled = false; scene.add(smoke);
  // searchlight beams
  const beamGeo = new T.CylinderGeometry(2.6, 0.12, 46, 12, 1, true); beamGeo.translate(0, 23, 0);
  const beamMats = {};
  const beams = c.beams.map(([bx, by, bz, seed, color]) => {
    const mat = beamMats[color] || (beamMats[color] = new T.MeshBasicMaterial({ color, transparent: true, opacity: night ? 0.22 : 0.1, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    const m = new T.Mesh(beamGeo, mat); m.position.set(bx, by, bz); m.frustumCulled = false; scene.add(m); return { m, seed };
  });
  // fountain sprays
  const PS = 14, sprayGeo = new T.SphereGeometry(0.1, 6, 5);
  const spray = new T.InstancedMesh(sprayGeo, new T.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.8, toneMapped: false }), Math.max(1, c.sprays.length * PS));
  spray.count = c.sprays.length * PS; spray.frustumCulled = false; scene.add(spray);

  return (t) => {
    for (const f of flags) { f.m.rotation.y = f.rot + Math.sin(t * 3 + f.i) * 0.3; f.m.rotation.z = Math.sin(t * 2.3 + f.i) * 0.05; }
    c.fires.forEach((f, n) => {
      const k = 0.85 + Math.sin(t * 17 + f[3] * 3) * 0.15, k2 = 0.8 + Math.sin(t * 23 + f[3]) * 0.2;
      m4.compose(v.set(f[0], f[1] + 0.45 * k, f[2]), q.identity(), s.set(k, 0.9 + k * 0.5, k)); fireO.setMatrixAt(n, m4);
      m4.compose(v.set(f[0], f[1] + 0.3 * k2, f[2]), q.identity(), s.set(k2, 0.8 + k2 * 0.4, k2)); fireI.setMatrixAt(n, m4);
    });
    fireO.instanceMatrix.needsUpdate = fireI.instanceMatrix.needsUpdate = true;
    c.smoke.forEach((sm, n) => {
      for (let k = 0; k < PUFF; k++) {
        const u = ((t * 0.12 + sm[3] * 0.37 + k / PUFF) % 1), r = (0.9 + u * 3.4) * (u > 0.85 ? (1 - u) / 0.15 : 1);
        m4.compose(v.set(sm[0] + u * 5, sm[1] + u * 16, sm[2] + u * 1.5), q.identity(), s.set(r, r, r)); smoke.setMatrixAt(n * PUFF + k, m4);
      }
    });
    smoke.instanceMatrix.needsUpdate = true;
    for (const b of beams) { b.m.rotation.x = 0.42 * Math.sin(t * 0.7 + b.seed); b.m.rotation.z = 0.42 * Math.cos(t * 0.9 + b.seed * 1.7); }
    c.sprays.forEach((sp, n) => {
      for (let k = 0; k < PS; k++) {
        const u = (t * 0.8 + k / PS) % 1, a = k * 2.4, rad = Math.sin(u * Math.PI) * (0.5 + (k % 4) * 0.35);
        m4.compose(v.set(sp[0] + Math.cos(a) * rad * u * 2, sp[1] + Math.sin(u * Math.PI) * (1.6 + (k % 3) * 0.3), sp[2] + Math.sin(a) * rad * u * 2), q.identity(), s.set(1, 1, 1)); spray.setMatrixAt(n * PS + k, m4);
      }
    });
    spray.instanceMatrix.needsUpdate = true;
  };
}

// ====================================================================================================== sky dome
function makeSky(T, scene, tod, sunDirIn) {
  const pal = {
    sunset: { top: [0.16, 0.2, 0.42], mid: [0.82, 0.42, 0.4], hor: [1.0, 0.68, 0.45], sun: [1.0, 0.8, 0.5], sunDir: [-45, 38, 20], stars: 0 },
    day: { top: [0.2, 0.46, 0.85], mid: [0.52, 0.72, 0.94], hor: [0.78, 0.88, 0.96], sun: [1, 0.96, 0.8], sunDir: [-25, 60, 25], stars: 0 },
    night: { top: [0.01, 0.02, 0.07], mid: [0.04, 0.07, 0.17], hor: [0.1, 0.14, 0.28], sun: [0.6, 0.7, 1.0], sunDir: [-25, 60, 25], stars: 1 },
  }[tod] || null;
  const P0 = pal || { top: [0.16, 0.2, 0.42], mid: [0.82, 0.42, 0.4], hor: [1.0, 0.68, 0.45], sun: [1.0, 0.8, 0.5], sunDir: [-45, 38, 20], stars: 0 };
  const sd = new T.Vector3(...(sunDirIn || P0.sunDir)).normalize();
  const u = {
    uTop: { value: new T.Color(...P0.top) }, uMid: { value: new T.Color(...P0.mid) }, uHor: { value: new T.Color(...P0.hor) }, uSun: { value: new T.Color(...P0.sun) },
    uSunDir: { value: sd }, uTime: { value: 0 }, uStars: { value: P0.stars },
  };
  const mat = new T.ShaderMaterial({
    uniforms: u, side: T.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform vec3 uTop,uMid,uHor,uSun,uSunDir; uniform float uTime,uStars; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*n(p); p*=2.; a*=.5; } return s; }
      void main(){
        vec3 d = normalize(vD); float y = max(d.y, 0.0);
        vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.18, y)); col = mix(col, uTop, smoothstep(0.12, 0.7, y));
        float sd = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSun * (pow(sd, 6.0) * 0.35 + pow(sd, 90.0) * 0.9 + smoothstep(0.9993, 0.9997, sd) * 2.0);
        if (d.y > 0.02) { vec2 cp = d.xz / (d.y + 0.25) * 1.6 + vec2(uTime * 0.01, 0.0); float cl = smoothstep(0.5, 0.78, fbm(cp * 1.3)); col = mix(col, mix(uMid, uSun, 0.5) * 1.1, cl * 0.45 * smoothstep(0.02, 0.3, d.y)); }
        if (uStars > 0.5 && d.y > 0.0) { vec2 sp = d.xz / (d.y + 0.2) * 60.0; float st = step(0.985, h(floor(sp))) * smoothstep(0.0, 0.2, d.y); col += vec3(st); }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const dome = new T.Mesh(new T.SphereGeometry(360, 32, 16), mat);
  dome.renderOrder = -10; dome.frustumCulled = false; scene.add(dome);
  const horizon = new T.Color(...P0.hor).lerp(new T.Color(...P0.mid), 0.25);
  return { horizon: horizon.getHex(), dome, update(t) { u.uTime.value = t; } };
}
