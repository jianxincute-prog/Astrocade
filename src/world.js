// World builder: 500x500 flooded map, sunken city (centre), start skyscraper, islands, sky/water/seabed and prop factories.
import { clamp, lerp, mulberry32, cfg } from './util.js';
import { createWaterSystem, acesJS } from './water.js';

const THREE = window.THREE;
export const WORLD = 500, HALF = 250, SEABED = -72;
export const QUALITY = {
  low:  { pr: 1,    shadows: false, seg: 64,  wlevel: 0, far: 320, density: 0.6, rocks: 30 },
  med:  { pr: 1.25, shadows: false, seg: 120, wlevel: 1, far: 480, density: 0.85, rocks: 70 },
  high: { pr: 2,    shadows: true,  seg: 192, wlevel: 2, far: 650, density: 1, rocks: 120 }
};
export const waveAmp = { v: 0.3 };
export function waveAt(x, z, t) {
  const A = waveAmp.v;
  return Math.sin(x * 0.07 + t * 0.9) * A + Math.sin(z * 0.09 + t * 1.3) * A * 0.7 + Math.sin((x + z) * 0.15 + t * 1.8) * A * 0.3;
}
const tick = () => new Promise(r => setTimeout(r, 0));

// ---- merged box geometry with tiled window UVs ----
function addBox(A, b, color, uvs) {
  const { x0, x1, y0, y1, z0, z1 } = b, w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const c = new THREE.Color(color);
  const F = [
    { n: [1, 0, 0], v: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], u: d, h },
    { n: [-1, 0, 0], v: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], u: d, h },
    { n: [0, 1, 0], v: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], u: 0, h: 0 },
    { n: [0, -1, 0], v: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], u: 0, h: 0 },
    { n: [0, 0, 1], v: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], u: w, h },
    { n: [0, 0, -1], v: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], u: w, h }
  ];
  for (const f of F) {
    const base = A.pos.length / 3;
    const su = f.u ? f.u / uvs : 0.01, sv = f.h ? f.h / uvs : 0.01;
    const shade = f.n[1] > 0 ? 1.15 : f.n[1] < 0 ? 0.5 : (f.n[0] ? 0.85 : 1);
    f.v.forEach((p, i) => {
      A.pos.push(p[0], p[1], p[2]); A.nor.push(f.n[0], f.n[1], f.n[2]);
      A.uv.push(i === 0 || i === 3 ? 0 : su, i < 2 ? 0 : sv);
      A.col.push(c.r * shade, c.g * shade, c.b * shade);
    });
    A.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}
function buildGeo(A) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(A.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(A.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(A.col, 3));
  g.setIndex(A.idx); g.computeBoundingSphere();
  return g;
}
const newA = () => ({ pos: [], nor: [], uv: [], col: [], idx: [] });
function windowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#7d8fa3'; g.fillRect(0, 0, 64, 64);
  const r = mulberry32(5);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = r() < 0.3 ? '#ffe7a0' : '#2b3b4f'; g.fillRect(x * 16 + 3, y * 16 + 4, 10, 9);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter;
  return t;
}

// ---- prop factories (shared geometry + materials) ----
const M = {};
function mats() {
  const L = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e || 0x000000 });
  Object.assign(M, {
    wood: L(0xb5833f), woodDark: L(0x7a5428), plank: L(0xd2a766), barrelR: L(0xc0392b), barrelB: L(0x2f7fc1),
    steel: L(0x7f8c99), yellow: L(0xf1c40f, 0x332a00), gold: L(0xffc233, 0x7a5400), chest: L(0x9a5a2a, 0x331a00),
    puff: L(0xffcf4a, 0x2a2000), spike: L(0xff8a3d), white: L(0xffffff, 0x222222), black: L(0x111111),
    orb: new THREE.MeshBasicMaterial({ color: 0x66f0ff }), sand: L(0xd9c78a), rock: L(0x4b6a77),
    sail: L(0xf4efe0), glass: L(0xbfefff, 0x113344)
  });
}
const G = {};
function geos() {
  Object.assign(G, {
    box1: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10), sph: new THREE.SphereGeometry(0.5, 10, 8),
    cone: new THREE.ConeGeometry(0.5, 1, 6), ico: new THREE.IcosahedronGeometry(0.5, 0)
  });
}
function mesh(g, m, sx, sy, sz, x, y, z) {
  const o = new THREE.Mesh(g, m); o.scale.set(sx, sy, sz); o.position.set(x || 0, y || 0, z || 0); return o;
}
export const props = {
  crate() { const g = new THREE.Group(); g.add(mesh(G.box1, M.wood, 1.2, 1.2, 1.2)); g.add(mesh(G.box1, M.woodDark, 1.25, 0.18, 1.25, 0, 0.4, 0)); g.add(mesh(G.box1, M.woodDark, 1.25, 0.18, 1.25, 0, -0.4, 0)); return g; },
  barrel() { const g = new THREE.Group(); g.add(mesh(G.cyl, Math.random() < 0.5 ? M.barrelR : M.barrelB, 1, 1.2, 1)); g.add(mesh(G.cyl, M.steel, 1.05, 0.14, 1.05, 0, 0.3, 0)); g.add(mesh(G.cyl, M.steel, 1.05, 0.14, 1.05, 0, -0.3, 0)); return g; },
  plank() { const g = new THREE.Group(); g.add(mesh(G.box1, M.plank, 2.6, 0.18, 0.55)); g.add(mesh(G.box1, M.plank, 2.2, 0.18, 0.55, 0.3, 0.05, 0.6)); return g; },
  hardshell() { const g = new THREE.Group(); g.add(mesh(G.box1, M.steel, 1.7, 1.4, 1.7)); g.add(mesh(G.box1, M.yellow, 1.76, 0.25, 1.76, 0, 0.2, 0)); return g; },
  cache() { const g = new THREE.Group(); g.add(mesh(G.box1, M.gold, 1.4, 0.9, 1)); g.add(mesh(G.box1, M.steel, 1.45, 0.2, 1.05, 0, 0.1, 0)); g.add(mesh(G.sph, M.orb, 0.35, 0.35, 0.35, 0, 0.75, 0)); return g; },
  chest() { const g = new THREE.Group(); g.add(mesh(G.box1, M.chest, 2, 1.2, 1.3)); g.add(mesh(G.box1, M.gold, 2.1, 0.25, 1.4, 0, 0.3, 0)); g.add(mesh(G.box1, M.gold, 0.3, 0.5, 0.2, 0, 0.1, 0.7)); return g; },
  supply() { const g = new THREE.Group(); g.add(mesh(G.box1, M.yellow, 1.6, 1.2, 1.2)); g.add(mesh(G.box1, M.white, 0.5, 0.9, 1.25, 0, 0, 0)); g.add(mesh(G.box1, M.white, 1.65, 0.3, 1.25, 0, 0, 0)); return g; },
  puffer() {
    const g = new THREE.Group(); g.add(mesh(G.sph, M.puff, 1.8, 1.6, 1.8));
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, s = mesh(G.cone, M.spike, 0.25, 0.5, 0.25, Math.cos(a) * 0.9, (i % 2 ? 0.3 : -0.2), Math.sin(a) * 0.9);
      s.rotation.z = -Math.cos(a) * 1.2; s.rotation.x = Math.sin(a) * 1.2; g.add(s);
    }
    g.add(mesh(G.sph, M.white, 0.5, 0.5, 0.3, 0.4, 0.2, -0.78)); g.add(mesh(G.sph, M.white, 0.5, 0.5, 0.3, -0.4, 0.2, -0.78));
    g.add(mesh(G.sph, M.black, 0.22, 0.22, 0.2, 0.4, 0.2, -0.9)); g.add(mesh(G.sph, M.black, 0.22, 0.22, 0.2, -0.4, 0.2, -0.9));
    const tail = mesh(G.cone, M.spike, 0.7, 0.9, 0.2, 0, 0, 1.0); tail.rotation.x = -Math.PI / 2; g.add(tail);
    return g;
  },
  orb() { const g = new THREE.Group(); g.add(mesh(G.ico, M.orb, 1.1, 1.1, 1.1)); const r = mesh(new THREE.TorusGeometry(0.8, 0.06, 6, 20), M.orb, 1, 1, 1); g.add(r); return g; },
  beam(color) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 40, 10, 1, true), new THREE.MeshBasicMaterial({ color: color || 0xffe27a, transparent: true, opacity: 0.16, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.y = 20; const g = new THREE.Group(); g.add(m); return g;
  }
};

// ---- raft mesh ----
export function buildRaftMesh() {
  const g = new THREE.Group();
  const deck = new THREE.Group(); deck.name = 'deck'; g.add(deck);
  for (let i = 0; i < 9; i++) deck.add(mesh(G.box1, i % 2 ? M.plank : M.wood, 7, 0.5, 0.95, 0, 0.25, -4 + i));
  [[-3.4, -4.3], [3.4, -4.3], [-3.4, 4.3], [3.4, 4.3]].forEach(p => g.add(mesh(G.cyl, M.barrelB, 1, 1.2, 1, p[0], -0.4, p[1])));
  g.add(mesh(G.box1, M.woodDark, 0.4, 0.4, 9, -3.3, 0.6, 0)); g.add(mesh(G.box1, M.woodDark, 0.4, 0.4, 9, 3.3, 0.6, 0));
  // helm wheel
  const helm = new THREE.Group(); helm.position.set(0, 0.5, 3.4);
  helm.add(mesh(G.box1, M.woodDark, 0.25, 1.2, 0.25, 0, 0.1, 0)); const wheel = mesh(new THREE.TorusGeometry(0.45, 0.08, 6, 12), M.yellow, 1, 1, 1, 0, 0.8, 0); helm.add(wheel); g.add(helm);
  const sail = new THREE.Group(); sail.name = 'sail'; sail.position.set(-2.3, 0.5, -1);
  sail.add(mesh(G.box1, M.woodDark, 0.25, 7, 0.25, 0, 3.5, 0)); const cloth = mesh(G.box1, M.sail, 0.08, 4.6, 3.6, 0, 4.2, 1.1); sail.add(cloth); sail.visible = false; g.add(sail);
  const rud = mesh(G.box1, M.woodDark, 0.15, 1.1, 1.4, 0, -0.2, 4.8); rud.name = 'rudder'; rud.visible = false; g.add(rud);
  const lamp = new THREE.Group(); lamp.name = 'lantern'; lamp.position.set(-3, 0.5, -3.6);
  lamp.add(mesh(G.box1, M.woodDark, 0.15, 1.4, 0.15, 0, 0.6, 0)); lamp.add(mesh(G.sph, M.glass, 0.6, 0.6, 0.6, 0, 1.4, 0));
  const pl = new THREE.PointLight(0xffd9a0, 0, 30); pl.position.set(0, 1.4, 0); lamp.add(pl); lamp.visible = false; g.add(lamp);
  g.userData.lampLight = pl;
  const hull = new THREE.Group(); hull.name = 'hull'; hull.visible = false;
  hull.add(mesh(G.box1, M.wood, 1.2, 0.5, 9, -4.0, -0.1, 0)); hull.add(mesh(G.box1, M.wood, 1.2, 0.5, 9, 4.0, -0.1, 0));
  hull.add(mesh(G.box1, M.barrelR, 1, 1.2, 1, -4.2, -0.4, 0)); hull.add(mesh(G.box1, M.barrelR, 1, 1.2, 1, 4.2, -0.4, 0)); g.add(hull);
  const flag = new THREE.Group(); flag.name = 'flag'; flag.position.set(2.4, 0.5, -3.2);
  flag.add(mesh(G.box1, M.woodDark, 0.16, 4.5, 0.16, 0, 2.25, 0));
  flag.add(mesh(G.box1, M.barrelR, 0.08, 0.6, 1.8, 0, 4.1, 0.9));
  flag.add(mesh(G.box1, M.white, 0.08, 0.6, 1.8, 0, 3.5, 0.9));
  g.add(flag);
  return g;
}

// ---- main world builder ----
export async function createWorld(canvas, opts, progress) {
  mats(); geos();
  const W = { solids: [], discs: [], cityBuildings: [], cachesSpots: [], rand: mulberry32(1337), time: 0 };
  const touch = !!opts.touch;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch, powerPreference: 'high-performance' });
  renderer.setClearColor(0x8fd3ff);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x8fd3ff, 0.004);
  const camera = new THREE.PerspectiveCamera(70, 9 / 16, 0.2, 600); camera.rotation.order = 'YXZ'; scene.add(camera);
  const hemi = new THREE.HemisphereLight(0xcfeaff, 0x335566, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(80, 120, 40); scene.add(sun); scene.add(sun.target);
  sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = -50; sc.right = 50; sc.top = 50; sc.bottom = -50; sc.near = 1; sc.far = 300;
  const headlamp = new THREE.PointLight(0xbfefff, 0, 38); camera.add(headlamp);
  Object.assign(W, { renderer, scene, camera, hemi, sun, headlamp });
  progress(0.1); await tick();

  // seabed + rocks
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: 0x3f7384 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = SEABED; scene.add(sea);
  const rockMax = 120, rocks = new THREE.InstancedMesh(G.cone, M.rock, rockMax); const dm = new THREE.Object3D();
  for (let i = 0; i < rockMax; i++) {
    dm.position.set((W.rand() - 0.5) * 480, SEABED + 1.5, (W.rand() - 0.5) * 480); dm.scale.set(3 + W.rand() * 6, 3 + W.rand() * 8, 3 + W.rand() * 6); dm.updateMatrix(); rocks.setMatrixAt(i, dm.matrix);
  }
  scene.add(rocks); W.rocks = rocks;
  progress(0.2); await tick();

  // water + sky dome (GPU shaders, see src/water.js); waves use the same height field as waveAt()
  const WS = createWaterSystem(scene, renderer); W.WS = WS;
  W.rebuildWater = (seg, level) => WS.rebuild(seg, level, WORLD + 40);
  W.rebuildWater(64, 1);
  W.updateWater = (t) => WS.update(t, waveAmp.v);
  const gc = document.createElement('canvas'); gc.width = 4; gc.height = 64; const gx = gc.getContext('2d'), gr = gx.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(60,80,105,0)'); gr.addColorStop(0.5, 'rgba(60,80,105,0.55)'); gr.addColorStop(1, 'rgba(45,62,85,0.95)'); gx.fillStyle = gr; gx.fillRect(0, 0, 4, 64);
  const wallMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
  [[0, -HALF - 6, 0], [0, HALF + 6, 0], [-HALF - 6, 0, 1], [HALF + 6, 0, 1]].forEach(p => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(WORLD + 60, 140), wallMat); w.position.set(p[0], 50, p[1]); if (p[2]) w.rotation.y = Math.PI / 2; scene.add(w);
  });
  // clouds
  W.clouds = [];
  const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9a9a9a, fog: false }); W.cloudMat = cm;
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(G.sph, cm); c.scale.set(60 + W.rand() * 60, 10 + W.rand() * 8, 30 + W.rand() * 20);
    c.position.set((W.rand() - 0.5) * 900, 110 + W.rand() * 50, (W.rand() - 0.5) * 900); scene.add(c); W.clouds.push(c);
  }
  progress(0.3); await tick();

  // city + start tower
  const A = newA(), rr = W.rand;
  const addSolid = (b, color, vis) => { W.solids.push(b); if (vis !== false) addBox(A, b, color, 6); };
  const tw = 15; // tower half size
  addSolid({ x0: -20, x1: 20, y0: SEABED, y1: 1.6, z0: -20, z1: 20 }, 0x8a9aa8);      // deck / podium
  addSolid({ x0: -tw, x1: tw, y0: 1.6, y1: 23.6, z0: -tw, z1: tw }, 0x93a4b5);        // tower core
  addSolid({ x0: -tw - 1, x1: tw + 1, y0: 23.6, y1: 24.2, z0: -tw - 1, z1: tw + 1 }, 0xa9b6c4); // roof slab
  W.roofY = 24.2; W.deckY = 1.6;
  // staircase along +z face, rising toward +x
  const steps = 22, sw = 3.2, st0 = -13.5, sd = (2 * tw - 1) / steps;
  for (let i = 0; i < steps; i++) {
    const top = 1.6 + (i + 1) * 1.0; if (top > 23.6) break;
    addSolid({ x0: st0 + i * sd, x1: st0 + (i + 1) * sd, y0: 1.6, y1: top, z0: tw, z1: tw + sw }, 0xb7a58a);
  }
  // city blocks
  const pitch = 32;
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    if (Math.abs(i) + Math.abs(j) <= 1) continue;
    for (let sx = 0; sx < 2; sx++) for (let sz = 0; sz < 2; sz++) {
      if (rr() < 0.18) continue;
      const cx = i * pitch + (sx - 0.5) * 13, cz = j * pitch + (sz - 0.5) * 13, w = 8 + rr() * 3.5, d = 8 + rr() * 3.5;
      let top = -(3 + rr() * 38);
      if (Math.max(Math.abs(i), Math.abs(j)) === 2 && rr() < 0.3) top = 2 + rr() * 10;
      const col = new THREE.Color().setHSL(0.55 + rr() * 0.1, 0.15 + rr() * 0.15, 0.45 + rr() * 0.2);
      const b = { x0: cx - w / 2, x1: cx + w / 2, y0: SEABED, y1: top, z0: cz - d / 2, z1: cz + d / 2 };
      addSolid(b, col.getHex()); W.cityBuildings.push(b);
      if (top < -2) W.cachesSpots.push({ x: cx + (rr() - 0.5) * (w - 3), y: top, z: cz + (rr() - 0.5) * (d - 3) });
    }
  }
  const cityMat = new THREE.MeshLambertMaterial({ map: windowTexture(), vertexColors: true });
  const cityMesh = new THREE.Mesh(buildGeo(A), cityMat); scene.add(cityMesh); W.cityMesh = cityMesh; cityMesh.castShadow = true; cityMesh.receiveShadow = true;
  // roof antenna decoration
  const ant = mesh(G.cyl, M.steel, 0.4, 10, 0.4, -8, 29, -8); scene.add(ant); scene.add(mesh(G.sph, M.yellow, 0.9, 0.9, 0.9, -8, 34, -8));
  progress(0.5); await tick();

  // islands
  W.islands = [];
  for (const I of cfg().islands) {
    const g = new THREE.Group(); g.position.set(I.x, 0, I.z);
    const top = 1.6;
    g.add(mesh(G.cyl, new THREE.MeshLambertMaterial({ color: I.tint }), I.r * 2, 9.4, I.r * 2, 0, -3.25, 0));   // sand body: top at y=1.45 (below the grass cap, so no coplanar faces)
    const base = mesh(G.cone, M.rock, I.r * 2.6, 70, I.r * 2.6, 0, -34, 0); g.add(base);
    const cap = mesh(G.cyl, new THREE.MeshLambertMaterial({ color: 0x6aa84f }), I.r * 1.5, 0.3, I.r * 1.5, 0, top - 0.15, 0); g.add(cap);   // grass cap spans 1.3..1.6 = walkable top
    for (let k = 0; k < 4; k++) {
      const a = rr() * 6.28, rad = rr() * I.r * 0.55; const tr = new THREE.Group(); tr.position.set(Math.cos(a) * rad, top, Math.sin(a) * rad);
      tr.add(mesh(G.cyl, M.woodDark, 0.5, 4, 0.5, 0, 2, 0)); tr.add(mesh(G.sph, new THREE.MeshLambertMaterial({ color: 0x3f9142 }), 3.2, 2.6, 3.2, 0, 4.6, 0)); g.add(tr);
    }
    if (I.id === 0) { g.add(mesh(G.cyl, M.white, 2.4, 14, 2.4, 3, 8, 3)); g.add(mesh(G.cone, M.barrelR, 3, 2.4, 3, 3, 16, 3)); }
    scene.add(g); W.islands.push({ id: I.id, x: I.x, z: I.z, r: I.r, part: !!I.part, top });
    W.discs.push({ x: I.x, z: I.z, r: I.r * 1.0, top });
  }
  progress(0.7); await tick();

  WS.setObstacles(W.islands.map(i => ({ x: i.x, z: i.z, r: i.r })).concat([{ x: 0, z: 0, r: 20, box: true }]));
  W.raftMesh = buildRaftMesh(); W.raftMesh.visible = false; scene.add(W.raftMesh);
  W.beam = props.beam(); W.beam.visible = false; scene.add(W.beam);
  W.raftBeam = props.beam(); W.raftBeam.visible = false; scene.add(W.raftBeam);
  progress(0.85);

  W.setSize = (w, h) => { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  W.applyQuality = (q) => {
    const Q = QUALITY[q] || QUALITY.mid; W.q = q; W.Q = Q;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr));
    renderer.shadowMap.enabled = Q.shadows; sun.castShadow = Q.shadows;
    camera.far = Q.far; camera.updateProjectionMatrix();
    if (WS.seg !== Q.seg || WS.level !== Q.wlevel) W.rebuildWater(Q.seg, Q.wlevel);
    W.rocks.count = Q.rocks; W.clouds.forEach((c, i) => c.visible = q !== 'low' || i < 5);
    scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  };
  W.sunDir = new THREE.Vector3(0.5, 0.7, 0.4);
  W.updateSky = (tod, under, depth, diver, goggles) => {
    const ang = (tod - 0.25) * Math.PI * 2, elev = Math.sin(ang), day = clamp(elev * 1.4 + 0.45, 0, 1);
    const sky = new THREE.Color(0.02, 0.035, 0.09).lerp(new THREE.Color(0.7, 0.88, 1.15), day);   // linear, HDR-ish day horizon
    if (Math.abs(elev) < 0.4) sky.lerp(new THREE.Color(1.25, 0.48, 0.2), Math.min(0.85, (0.4 - Math.abs(elev)) * 2.6));
    sun.intensity = 0.2 + day * 0.55; hemi.intensity = 0.3 + day * 0.45;
    // sun (or moon at night) direction shared by the light, the sky dome and the water glitter
    const sx = Math.cos(ang) * 0.85, sz = 0.45;
    if (elev > -0.04) { W.sunDir.set(sx, Math.max(elev, 0.03), sz).normalize(); } else { W.sunDir.set(-sx, -elev + 0.05, -sz).normalize(); }
    const U = WS.uniforms, moon = elev <= -0.04;
    if (moon) U.uSunCol.value.set(0.35, 0.42, 0.7); else U.uSunCol.value.set(1.0, 0.55, 0.25).lerp(new THREE.Color(1.0, 0.95, 0.85), clamp(elev * 3, 0, 1)).multiplyScalar(0.5 + 0.5 * day);
    sun.color.copy(U.uSunCol.value).lerp(new THREE.Color(1, 1, 1), 0.4);
    U.uSkyH.value.copy(sky); U.uSkyZ.value.set(0.006, 0.012, 0.04).lerp(new THREE.Color(0.08, 0.3, 0.85), day).lerp(sky, 0.15 * (1 - day));
    U.uSunDir.value.copy(W.sunDir); U.uDay.value = day;
    W.dayness = day; W.cloudMat.emissive.setScalar(0.04 + 0.6 * day); W.cloudMat.color.setScalar(0.25 + 0.75 * day); WS.dome.position.copy(camera.position); WS.dome.visible = !under;
    if (under) {
      const dt = clamp(depth / 60, 0, 1);
      const col = new THREE.Color(0x2aa3c8).lerp(new THREE.Color(0x041a33), dt).multiplyScalar(0.35 + day * 0.65);
      scene.fog.color.copy(col); renderer.setClearColor(col);
      const dens = cfg().tuning ? (diver ? cfg().tuning.fogDiver : goggles ? (cfg().tuning.fogBase + cfg().tuning.fogDiver) / 2 : cfg().tuning.fogBase) : 0.05;
      scene.fog.density = dens * (1 + dt * 0.6);
      headlamp.intensity = 0.6 + dt * 1.8; headlamp.distance = diver ? 60 : 38;
    } else {
      const fc = acesJS(sky, renderer.toneMappingExposure);   // pre-tonemapped so the dome horizon and fog match exactly
      scene.fog.color.copy(fc); renderer.setClearColor(fc); scene.fog.density = 0.0032 + (1 - day) * 0.003; headlamp.intensity = 0;
    }
  };
  progress(1);
  return W;
}
