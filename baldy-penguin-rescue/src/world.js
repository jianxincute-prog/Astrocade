// Builds the snowy valley: terrain, pond, pines, rocks, igloo home, mountains, snowfall, fish and helpers.
import { WORLD, heightAt, rng } from './terrain.js';
import { buildPenguin } from './character.js';

// Sky moods that rotate from level to level: clear day, golden sunset, pink dawn, blue dusk.
const THEMES = [
  { sky: 0xbfe4f8, top: 0xeaf6ff, ground: 0x9db7d6, hemi: 1.15, sun: 0xfff1d6, sunI: 1.5 },
  { sky: 0xfbe2d4, top: 0xfff5ee, ground: 0xb6b4d8, hemi: 1.1, sun: 0xffd6b0, sunI: 1.4 },
  { sky: 0xf6cbe6, top: 0xffe8f6, ground: 0xa9b2de, hemi: 1.1, sun: 0xfff0e0, sunI: 1.4 },
  { sky: 0x7d93d6, top: 0xc3cfff, ground: 0x6474b4, hemi: 1.05, sun: 0xd6deff, sunI: 1.15 },
];

function canvasTexture(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildScene(home, layout, snowfall, theme = 0, biome = 'valley') {
  const T = THEMES[theme % THEMES.length], SKY = T.sky;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 70, 210);
  scene.add(new THREE.HemisphereLight(T.top, T.ground, T.hemi));
  const sun = new THREE.DirectionalLight(T.sun, T.sunI); sun.position.set(40, 80, 30); scene.add(sun);
  const H = (x, z) => heightAt(x, z, home);

  // ---- terrain ----
  const seg = 120, geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3);
  const low = new THREE.Color(0xcfe3f6), high = new THREE.Color(0xffffff), rock = new THREE.Color(0xbfd0e6), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = Math.min(H(x, z), 38);
    pos.setY(i, h);
    c.copy(low).lerp(high, Math.min(1, Math.max(0, (h + 3) / 6)));
    if (h > 12) c.lerp(rock, Math.min(0.7, (h - 12) / 14));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  scene.add(ground);

  // ---- frozen pond ----
  const ice = new THREE.Mesh(new THREE.CircleGeometry(WORLD.pond.r, 48),
    new THREE.MeshPhongMaterial({ color: 0x9fd8f0, shininess: 120, specular: 0xffffff, transparent: true, opacity: 0.93, map: canvasTexture(512, (x, s) => {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineCap = 'round';
      const r0 = rng(5 + Math.round(WORLD.pond.r));
      for (let i = 0; i < 40; i++) {                                   // frosty cracks and skate scratches
        let px = r0() * s, py = r0() * s, a = r0() * 6.283; x.lineWidth = 1 + r0() * 2.5;
        x.strokeStyle = r0() > 0.5 ? 'rgba(120,175,215,.55)' : 'rgba(235,248,255,.9)';
        x.beginPath(); x.moveTo(px, py);
        for (let k = 0; k < 5; k++) { a += (r0() - 0.5) * 1.1; px += Math.cos(a) * (14 + r0() * 30); py += Math.sin(a) * (14 + r0() * 30); x.lineTo(px, py); }
        x.stroke();
      }
    }) }));
  ice.rotation.x = -Math.PI / 2; ice.position.set(WORLD.pond.x, 0.07, WORLD.pond.z); scene.add(ice);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(WORLD.pond.r + 0.3, 0.7, 8, 48), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  rim.rotation.x = Math.PI / 2; rim.position.set(WORLD.pond.x, 0, WORLD.pond.z); rim.scale.z = 0.5; scene.add(rim);

  // ---- pines (instanced) ----
  const dummy = new THREE.Object3D();
  const inst = (geom, material, items, place) => {
    const m = new THREE.InstancedMesh(geom, material, items.length);
    items.forEach((it, i) => { place(it, dummy); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    scene.add(m); return m;
  };
  const snowM = new THREE.MeshLambertMaterial({ color: 0xffffff });
  if (biome === 'crystal') {
    // giant ice crystals instead of trees
    const iceM = new THREE.MeshPhongMaterial({ color: 0x8fd6ff, emissive: 0x2f6fd0, emissiveIntensity: 0.45, shininess: 120, specular: 0xffffff, flatShading: true, transparent: true, opacity: 0.92 });
    const pinkM = new THREE.MeshPhongMaterial({ color: 0xd9a6ff, emissive: 0x7a3fd0, emissiveIntensity: 0.45, shininess: 120, specular: 0xffffff, flatShading: true, transparent: true, opacity: 0.92 });
    const shard = new THREE.CylinderGeometry(0.02, 0.7, 1, 6);
    const even = layout.trees.filter((t, i) => i % 3), odd = layout.trees.filter((t, i) => i % 3 === 0);
    [[even, iceM], [odd, pinkM]].forEach(([list, m]) => {
      inst(shard, m, list, (t, d) => { d.position.set(t.x, H(t.x, t.z) + 2.6 * t.s, t.z); d.scale.set(t.s, 5.6 * t.s, t.s); d.rotation.set(0, t.x, 0); });
      [[0.7, 0.5, 3.2], [-0.6, -0.5, 2.5], [0.2, -0.8, 1.9]].forEach(([ox, oz, h]) =>
        inst(shard, m, list, (t, d) => { d.position.set(t.x + ox * t.s, H(t.x, t.z) + h * 0.45 * t.s, t.z + oz * t.s); d.scale.set(t.s * 0.6, h * t.s, t.s * 0.6); d.rotation.set(oz * 0.35, t.z, -ox * 0.35); }));
    });
    inst(new THREE.SphereGeometry(1.3, 10, 6), snowM, layout.trees, (t, d) => { d.position.set(t.x, H(t.x, t.z) + 0.05, t.z); d.scale.set(t.s, 0.3 * t.s, t.s); d.rotation.set(0, 0, 0); });
  } else {
  const green = new THREE.MeshLambertMaterial({ color: 0x2f7d5b });
  inst(new THREE.CylinderGeometry(0.28, 0.4, 1.6, 7), new THREE.MeshLambertMaterial({ color: 0x7a5236 }), layout.trees,
    (t, d) => { d.position.set(t.x, H(t.x, t.z) + 0.7 * t.s, t.z); d.scale.setScalar(t.s); d.rotation.set(0, 0, 0); });
  [[2.2, 2.6, 2.2], [1.7, 2.3, 3.7], [1.15, 2.0, 5.1]].forEach(([r, h, y]) => {
    inst(new THREE.ConeGeometry(r, h, 9), green, layout.trees,
      (t, d) => { d.position.set(t.x, H(t.x, t.z) + y * t.s, t.z); d.scale.setScalar(t.s); d.rotation.set(0, t.x, 0); });
    inst(new THREE.ConeGeometry(r * 0.72, h * 0.6, 9), snowM, layout.trees,
      (t, d) => { d.position.set(t.x, H(t.x, t.z) + (y + h * 0.24) * t.s, t.z); d.scale.setScalar(t.s); d.rotation.set(0, t.x, 0); });
  });
  }

  // ---- snowmen (Snowman Hills) ----
  if (layout.snowmen?.length) {
    const ball = new THREE.SphereGeometry(1, 14, 10), coal = new THREE.MeshLambertMaterial({ color: 0x24303f });
    [[0.75, 0.62], [0.55, 1.55], [0.38, 2.25]].forEach(([r, y]) =>
      inst(ball, snowM, layout.snowmen, (m, d) => { d.position.set(m.x, H(m.x, m.z) + y * m.s, m.z); d.scale.setScalar(r * m.s); d.rotation.set(0, 0, 0); }));
    inst(new THREE.ConeGeometry(0.07, 0.4, 8), new THREE.MeshLambertMaterial({ color: 0xff8a1f }), layout.snowmen,
      (m, d) => { d.position.set(m.x + Math.sin(m.rot) * 0.5 * m.s, H(m.x, m.z) + 2.25 * m.s, m.z + Math.cos(m.rot) * 0.5 * m.s); d.scale.setScalar(m.s); d.rotation.set(0, m.rot, 0); d.rotateX(Math.PI / 2); });
    inst(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 12), coal, layout.snowmen, (m, d) => { d.position.set(m.x, H(m.x, m.z) + 2.75 * m.s, m.z); d.scale.setScalar(m.s); d.rotation.set(0, 0, 0); });
    inst(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 14), coal, layout.snowmen, (m, d) => { d.position.set(m.x, H(m.x, m.z) + 2.56 * m.s, m.z); d.scale.setScalar(m.s); d.rotation.set(0, 0, 0); });
    inst(new THREE.TorusGeometry(0.36, 0.09, 8, 16), new THREE.MeshLambertMaterial({ color: 0xe2372b }), layout.snowmen, (m, d) => { d.position.set(m.x, H(m.x, m.z) + 1.95 * m.s, m.z); d.scale.setScalar(m.s); d.rotation.set(Math.PI / 2, 0, 0); });
    [-1, 1].forEach(side => {
      inst(new THREE.SphereGeometry(0.05, 6, 6), coal, layout.snowmen, (m, d) => { const a = m.rot + side * 0.4; d.position.set(m.x + Math.sin(a) * 0.36 * m.s, H(m.x, m.z) + 2.36 * m.s, m.z + Math.cos(a) * 0.36 * m.s); d.scale.setScalar(m.s); d.rotation.set(0, 0, 0); });
      inst(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), new THREE.MeshLambertMaterial({ color: 0x6a4526 }), layout.snowmen, (m, d) => { const a = m.rot + side * Math.PI / 2; d.position.set(m.x + Math.sin(a) * 0.8 * m.s, H(m.x, m.z) + 1.75 * m.s, m.z + Math.cos(a) * 0.8 * m.s); d.scale.setScalar(m.s); d.rotation.set(0, a, 0); d.rotateX(Math.PI / 2 - 0.5); });
    });
  }

  // ---- fishing huts (Frozen Lake) ----
  (layout.huts || []).forEach(hut => {
    const g = new THREE.Group(), paint = [0xe2574c, 0x3f9fd8, 0xf2b632, 0x4fb873, 0xb07ad8, 0xff8a3c][hut.hue % 6];
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.6), new THREE.MeshLambertMaterial({ color: paint })); wall.position.y = 1.1; g.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.3, 4), new THREE.MeshLambertMaterial({ color: 0x6a4526 })); roof.position.y = 2.85; roof.rotation.y = Math.PI / 4; g.add(roof);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 4), snowM); cap.position.y = 3.15; cap.rotation.y = Math.PI / 4; g.add(cap);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.5), new THREE.MeshLambertMaterial({ color: 0x5a3a26 })); door.position.set(0, 0.75, 1.31); g.add(door);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ color: 0xffe49a })); win.position.set(1.31, 1.3, 0); win.rotation.y = Math.PI / 2; g.add(win);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 8), new THREE.MeshLambertMaterial({ color: 0x4a5566 })); pipe.position.set(-0.7, 3.1, -0.5); g.add(pipe);
    g.position.set(hut.x, 0.06, hut.z); g.rotation.y = hut.rot; scene.add(g);
  });

  // ---- hazards: fishing holes and ice spikes ----
  (layout.holes || []).forEach(hole => {
    const water = new THREE.Mesh(new THREE.CircleGeometry(hole.r, 20), new THREE.MeshPhongMaterial({ color: 0x1f5f9a, shininess: 140, specular: 0xbfe6ff }));
    water.rotation.x = -Math.PI / 2; water.position.set(hole.x, 0.1, hole.z); scene.add(water);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(hole.r + 0.12, 0.2, 6, 9), new THREE.MeshLambertMaterial({ color: 0xeaf7ff, flatShading: true }));
    edge.rotation.x = Math.PI / 2; edge.rotation.z = hole.x; edge.position.set(hole.x, 0.1, hole.z); edge.scale.z = 0.6; scene.add(edge);
  });
  if (layout.spikes?.length) {
    const spikeM = new THREE.MeshPhongMaterial({ color: 0xbfeaff, emissive: 0x38a0e8, emissiveIntensity: 0.35, shininess: 130, specular: 0xffffff, flatShading: true });
    const tips = [];
    layout.spikes.forEach(sp => [[0, 0, 1.5, 0], [0.55, 0.2, 1.0, 0.35], [-0.5, 0.3, 0.9, -0.35], [0.1, -0.6, 1.1, 0.2], [-0.25, 0.65, 0.7, -0.2], [0.6, -0.5, 0.6, 0.4]].forEach(([ox, oz, h, tilt]) => {
      const c = Math.cos(sp.rot), s2 = Math.sin(sp.rot);
      tips.push({ x: sp.x + ox * c - oz * s2, z: sp.z + ox * s2 + oz * c, h, tilt, rot: sp.rot });
    }));
    inst(new THREE.ConeGeometry(0.34, 1, 5), spikeM, tips, (t, d) => { d.position.set(t.x, H(t.x, t.z) + t.h * 0.45, t.z); d.scale.set(1, t.h, 1); d.rotation.set(t.tilt, t.rot, t.tilt * 0.6); });
    inst(new THREE.RingGeometry(1.1, 1.5, 20), new THREE.MeshBasicMaterial({ color: 0xff5d73, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }), layout.spikes,
      (sp, d) => { d.position.set(sp.x, H(sp.x, sp.z) + 0.12, sp.z); d.scale.setScalar(1); d.rotation.set(-Math.PI / 2, 0, 0); });
  }

  // ---- rocks ----
  inst(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0x8794a8, flatShading: true }), layout.rocks,
    (r, d) => { d.position.set(r.x, H(r.x, r.z) + r.s * 0.35, r.z); d.scale.set(r.s, r.s * 0.8, r.s); d.rotation.set(0, r.rot, 0); });
  inst(new THREE.SphereGeometry(0.8, 10, 8), snowM, layout.rocks,
    (r, d) => { d.position.set(r.x, H(r.x, r.z) + r.s * 0.95, r.z); d.scale.set(r.s, r.s * 0.35, r.s); d.rotation.set(0, 0, 0); });

  // ---- mountains ring ----
  const rand = rng(77), peaks = [];
  for (let i = 0; i < 22; i++) peaks.push({ a: i / 22 * 6.283 + rand() * 0.2, r: 150 + rand() * 30, h: 45 + rand() * 45, w: 30 + rand() * 18 });
  inst(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshLambertMaterial({ color: 0xaec3df, flatShading: true }), peaks,
    (p, d) => { d.position.set(Math.cos(p.a) * p.r, p.h / 2 - 4, Math.sin(p.a) * p.r); d.scale.set(p.w, p.h, p.w); d.rotation.set(0, p.a * 3, 0); });
  inst(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), peaks,
    (p, d) => { d.position.set(Math.cos(p.a) * p.r, p.h * 0.76 - 4, Math.sin(p.a) * p.r); d.scale.set(p.w * 0.5, p.h * 0.5, p.w * 0.5); d.rotation.set(0, p.a * 3, 0); });

  // ---- igloo home ----
  const igloo = buildIgloo(); igloo.position.set(home.x, H(home.x, home.z), home.z); scene.add(igloo);

  // ---- snowfall ----
  let snow = null;
  if (snowfall) {
    const n = 700, sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { sp[i * 3] = (Math.random() - 0.5) * 70; sp[i * 3 + 1] = Math.random() * 30; sp[i * 3 + 2] = (Math.random() - 0.5) * 70; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const tex = canvasTexture(32, (x, s) => { const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, s, s); });
    snow = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, size: 0.45, transparent: true, depthWrite: false, opacity: 0.9 }));
    snow.frustumCulled = false; scene.add(snow);
  }

  return { scene, ground, igloo, snow, H };
}

function buildIgloo() {
  const g = new THREE.Group();
  const bricks = canvasTexture(256, (x, s) => {
    x.fillStyle = '#eef7ff'; x.fillRect(0, 0, s, s); x.strokeStyle = '#b9d6ee'; x.lineWidth = 3;
    for (let r = 0; r < 8; r++) {
      x.beginPath(); x.moveTo(0, r * 32); x.lineTo(s, r * 32); x.stroke();
      for (let k = 0; k < 8; k++) { const px = k * 32 + (r % 2 ? 16 : 0); x.beginPath(); x.moveTo(px, r * 32); x.lineTo(px, r * 32 + 32); x.stroke(); }
    }
  });
  bricks.wrapS = bricks.wrapT = THREE.RepeatWrapping; bricks.repeat.set(3, 1);
  const wall = new THREE.MeshLambertMaterial({ map: bricks });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), wall); g.add(dome);
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 2.6, 18, 1, false, -Math.PI / 2, Math.PI), wall);
  tunnel.rotation.x = -Math.PI / 2; tunnel.position.set(0, 0, 4.2); g.add(tunnel);
  const door = new THREE.Mesh(new THREE.CircleGeometry(1.25, 18, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x33435e }));
  door.position.set(0, 0, 5.52); g.add(door);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.8, 18, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffc56b }));
  glow.position.set(0, 0, 5.53); g.add(glow);
  // flag
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.4, 6), new THREE.MeshLambertMaterial({ color: 0x7a5236 }));
  pole.position.set(0, 5.4, 0); g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), new THREE.MeshLambertMaterial({ color: 0xff5d73, side: THREE.DoubleSide }));
  flag.position.set(0.78, 6.6, 0); g.add(flag);
  // lanterns
  [-1, 1].forEach(side => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6), new THREE.MeshLambertMaterial({ color: 0x5a3a26 }));
    post.position.set(side * 2.6, 0.9, 6.2); g.add(post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
    lamp.position.set(side * 2.6, 2, 6.2); g.add(lamp);
  });
  // mama penguin waits by the door
  const mama = buildPenguin(0, 1.9); mama.root.position.set(3.4, 0, 6.6); mama.root.rotation.y = -0.3; g.add(mama.root);
  // beacon so home can be seen from far away
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 70, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffb84d, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 39; g.add(beam);
  g.userData = { mama, flag, beam };
  return g;
}

/** A big rolling snowball hazard. */
export function buildSnowball(radius) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), new THREE.MeshLambertMaterial({ color: 0xf4fbff, flatShading: true }));
  g.add(ball);
  const lump = new THREE.MeshLambertMaterial({ color: 0xd3e6f5 });
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, b = i * 1.3, m = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.22, 6, 5), lump);
    m.position.set(Math.sin(a) * Math.cos(b) * radius * 0.93, Math.sin(b) * radius * 0.93, Math.cos(a) * Math.cos(b) * radius * 0.93); ball.add(m);
  }
  g.userData.ball = ball;
  return g;
}

/** A floating heart that gives one life back. */
export function buildHeart() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.42); s.bezierCurveTo(-0.75, 0.05, -0.42, 0.62, 0, 0.26); s.bezierCurveTo(0.42, 0.62, 0.75, 0.05, 0, -0.42);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 });
  geo.translate(0, 0, -0.1);
  return new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: 0xff3d6b, emissive: 0xa80f33, emissiveIntensity: 0.5, shininess: 100 }));
}

/** A light beam that marks a lost penguin from far away. */
export function buildBeacon() {
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 60, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x38d6ff, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 31;
  return beam;
}

let fishGeo = null;
export function buildFish() {
  if (!fishGeo) {
    fishGeo = {
      body: new THREE.SphereGeometry(0.34, 12, 10), tail: new THREE.ConeGeometry(0.24, 0.36, 4),
      gold: new THREE.MeshPhongMaterial({ color: 0xffc928, emissive: 0xb86a00, emissiveIntensity: 0.45, shininess: 90 }),
      eye: new THREE.MeshBasicMaterial({ color: 0x24324a }), eyeG: new THREE.SphereGeometry(0.05, 6, 6),
    };
  }
  const g = new THREE.Group();
  const b = new THREE.Mesh(fishGeo.body, fishGeo.gold); b.scale.set(1.5, 0.9, 0.5); g.add(b);
  const t = new THREE.Mesh(fishGeo.tail, fishGeo.gold); t.rotation.z = -Math.PI / 2; t.position.x = -0.6; t.scale.z = 0.4; g.add(t);
  [-1, 1].forEach(s => { const e = new THREE.Mesh(fishGeo.eyeG, fishGeo.eye); e.position.set(0.3, 0.08, s * 0.15); g.add(e); });
  return g;
}

export function buildShadow(radius) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 16),
    new THREE.MeshBasicMaterial({ color: 0x38557a, transparent: true, opacity: 0.28, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** Flat arrow on the snow that points the way. */
export function buildArrow() {
  const s = new THREE.Shape();
  s.moveTo(0, 1.1); s.lineTo(0.75, 0.1); s.lineTo(0.3, 0.1); s.lineTo(0.3, -0.8); s.lineTo(-0.3, -0.8); s.lineTo(-0.3, 0.1); s.lineTo(-0.75, 0.1); s.closePath();
  const geo = new THREE.ShapeGeometry(s); geo.rotateX(Math.PI / 2);          // now points along +Z, facing up
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x38d6ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }));
  m.renderOrder = 5;
  return m;
}

/** Pool of little heart / star sprites for happy bursts. */
export function buildSparkles(scene) {
  const heart = canvasTexture(64, x => {
    x.fillStyle = '#ff5d8f'; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(-8, 28, 14, 2, 32, 20); x.bezierCurveTo(50, 2, 72, 28, 32, 56); x.fill();
  });
  const star = canvasTexture(64, x => {
    x.fillStyle = '#ffd84a'; x.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 29, a = i * Math.PI / 5 - Math.PI / 2; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
    x.closePath(); x.fill();
  });
  const snow = canvasTexture(64, x => { const g = x.createRadialGradient(32, 32, 4, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.6, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  const mats = { heart, star, snow };
  const pool = [];
  for (let i = 0; i < 48; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heart, transparent: true, depthWrite: false }));
    s.visible = false; scene.add(s); pool.push({ s, life: 0, vx: 0, vy: 0, vz: 0, size: 1 });
  }
  let next = 0;
  return {
    burst(kind, x, y, z, count = 8, spread = 3) {
      for (let i = 0; i < count; i++) {
        const p = pool[next = (next + 1) % pool.length];
        p.s.material.map = mats[kind]; p.s.visible = true; p.s.position.set(x, y, z);
        const a = Math.random() * 6.283;
        p.vx = Math.cos(a) * spread * Math.random(); p.vz = Math.sin(a) * spread * Math.random(); p.vy = 2 + Math.random() * 3;
        p.life = p.max = 0.7 + Math.random() * 0.4; p.size = kind === 'snow' ? 0.42 : 0.7;
      }
    },
    update(dt) {
      for (const p of pool) {
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) { p.s.visible = false; continue; }
        p.vy -= 5 * dt;
        p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
        const k = p.life / p.max; p.s.material.opacity = Math.min(1, k * 2); p.s.scale.setScalar(p.size * (0.5 + k * 0.6));
      }
    },
  };
}
