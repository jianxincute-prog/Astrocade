// Builds the snowy valley: terrain, pond, pines, rocks, igloo home, mountains, snowfall, fish and helpers.
import { WORLD, heightAt, rng } from './terrain.js';
import { buildPenguin } from './character.js';

const SKY = 0xbfe4f8;

function canvasTexture(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildScene(home, layout, snowfall) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 70, 210);
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x9db7d6, 1.15));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.5); sun.position.set(40, 80, 30); scene.add(sun);
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
    new THREE.MeshPhongMaterial({ color: 0x9fd8f0, shininess: 120, specular: 0xffffff, transparent: true, opacity: 0.93 }));
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
  const green = new THREE.MeshLambertMaterial({ color: 0x2f7d5b }), snowM = new THREE.MeshLambertMaterial({ color: 0xffffff });
  inst(new THREE.CylinderGeometry(0.28, 0.4, 1.6, 7), new THREE.MeshLambertMaterial({ color: 0x7a5236 }), layout.trees,
    (t, d) => { d.position.set(t.x, H(t.x, t.z) + 0.7 * t.s, t.z); d.scale.setScalar(t.s); d.rotation.set(0, 0, 0); });
  [[2.2, 2.6, 2.2], [1.7, 2.3, 3.7], [1.15, 2.0, 5.1]].forEach(([r, h, y]) => {
    inst(new THREE.ConeGeometry(r, h, 9), green, layout.trees,
      (t, d) => { d.position.set(t.x, H(t.x, t.z) + y * t.s, t.z); d.scale.setScalar(t.s); d.rotation.set(0, t.x, 0); });
    inst(new THREE.ConeGeometry(r * 0.72, h * 0.6, 9), snowM, layout.trees,
      (t, d) => { d.position.set(t.x, H(t.x, t.z) + (y + h * 0.24) * t.s, t.z); d.scale.setScalar(t.s); d.rotation.set(0, t.x, 0); });
  });

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
