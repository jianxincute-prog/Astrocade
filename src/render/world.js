// Builds the 3D city from logic/city.js layout: ground, roads, blocks, buildings, props, gang HQs.
import { GANGS, HALF, CELL, CELLS, ROAD, cellCenter, mulberry32 } from '../logic/city.js';

function canvasTex(T, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 4;
  if (T.sRGBEncoding) t.encoding = T.sRGBEncoding;
  return t;
}

function noise(ctx, w, h, base, amt, n = 4000) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = Math.random() * amt;
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${v})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

const FACADES = [
  { wall: '#8d7f72', win: '#2b3a4a', lit: '#ffd38a', frame: '#6c6056' },
  { wall: '#6f7882', win: '#1f2c3a', lit: '#ffe2a8', frame: '#555c64' },
  { wall: '#a2876a', win: '#2a3440', lit: '#ffcf7a', frame: '#7d6650' },
  { wall: '#4d5257', win: '#3a5268', lit: '#bfe4ff', frame: '#383c40' },
];

function facadeTextures(T, f) {
  const map = canvasTex(T, 256, 256, (ctx, w, h) => {
    noise(ctx, w, h, f.wall, 0.06, 2500);
    for (let fy = 0; fy < 2; fy++) for (let fx = 0; fx < 2; fx++) {
      const x = fx * 128, y = fy * 128;
      ctx.fillStyle = f.frame; ctx.fillRect(x + 18, y + 22, 92, 80);
      ctx.fillStyle = f.win; ctx.fillRect(x + 24, y + 28, 80, 68);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 24, y + 28, 80, 18);
      ctx.fillStyle = f.frame; ctx.fillRect(x + 62, y + 28, 4, 68);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + 118, 128, 10); // floor slab
    }
  });
  const emis = canvasTex(T, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    for (let fy = 0; fy < 2; fy++) for (let fx = 0; fx < 2; fx++) {
      if (Math.random() < 0.45) { ctx.fillStyle = f.lit; ctx.fillRect(fx * 128 + 24, fy * 128 + 28, 80, 68); }
    }
  });
  return { map, emis };
}

/** Sets UVs of a box so the facade texture repeats every `unit` world units. */
function scaleBoxUV(geo, w, h, d, unit) {
  const uv = geo.attributes.uv;
  // face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0] / unit, uv.getY(i) * dims[f][1] / unit);
    }
  }
  uv.needsUpdate = true;
}

export function buildWorld(T, scene, city, opts = {}) {
  const rnd = mulberry32(99);
  const obstacles = [];
  const night = opts.timeOfDay === 'night';

  // ground asphalt
  const asphalt = canvasTex(T, 256, 256, (ctx, w, h) => noise(ctx, w, h, '#3a3c40', 0.08, 6000));
  asphalt.repeat.set(60, 60);
  const ground = new T.Mesh(new T.PlaneGeometry(HALF * 2 + 200, HALF * 2 + 200), new T.MeshStandardMaterial({ map: asphalt, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // lane dashes (instanced)
  const dashGeo = new T.BoxGeometry(0.25, 0.02, 2.2);
  const dashMat = new T.MeshStandardMaterial({ color: 0xd8d2b8, roughness: 0.8 });
  const dashes = [];
  for (let i = 1; i < CELLS; i++) {
    const r = -HALF + CELL * i;
    for (let s = -HALF + 2; s < HALF - 2; s += 5) {
      const nearCross = Math.abs(((s + HALF) % CELL)) < ROAD / 2 + 1 || Math.abs(((s + HALF) % CELL) - CELL) < ROAD / 2 + 1;
      if (nearCross) continue;
      dashes.push([r, s, 0]); dashes.push([s, r, 1]);
    }
  }
  const dashIM = new T.InstancedMesh(dashGeo, dashMat, dashes.length);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3(1, 1, 1);
  dashes.forEach((d, i) => {
    e.set(0, d[2] ? Math.PI / 2 : 0, 0); q.setFromEuler(e);
    m4.compose(v.set(d[0], 0.01, d[1]), q, sc);
    dashIM.setMatrixAt(i, m4);
  });
  dashIM.receiveShadow = true;
  scene.add(dashIM);

  // crosswalk stripes at intersections
  const cw = [];
  for (let i = 1; i < CELLS; i++) for (let j = 1; j < CELLS; j++) {
    const x = -HALF + CELL * i, z = -HALF + CELL * j;
    for (let k = -3; k <= 3; k++) {
      cw.push([x + k * 1.1, z - ROAD / 2 - 1.2, 0]); cw.push([x + k * 1.1, z + ROAD / 2 + 1.2, 0]);
      cw.push([x - ROAD / 2 - 1.2, z + k * 1.1, 1]); cw.push([x + ROAD / 2 + 1.2, z + k * 1.1, 1]);
    }
  }
  const cwIM = new T.InstancedMesh(new T.BoxGeometry(0.6, 0.02, 2.0), dashMat, cw.length);
  cw.forEach((d, i) => { e.set(0, d[2] ? Math.PI / 2 : 0, 0); q.setFromEuler(e); m4.compose(v.set(d[0], 0.012, d[1]), q, sc); cwIM.setMatrixAt(i, m4); });
  scene.add(cwIM);

  // sidewalk blocks
  const concrete = canvasTex(T, 128, 128, (ctx, w, h) => {
    noise(ctx, w, h, '#9a968e', 0.07, 1500);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);
  });
  concrete.repeat.set(9, 9);
  const blockMat = new T.MeshStandardMaterial({ map: concrete, roughness: 0.9 });
  const blockGeo = new T.BoxGeometry(CELL - ROAD, 0.22, CELL - ROAD);
  for (let i = 0; i < CELLS; i++) for (let j = 0; j < CELLS; j++) {
    const b = new T.Mesh(blockGeo, blockMat);
    b.position.set(cellCenter(i), 0.11, cellCenter(j));
    b.receiveShadow = true;
    scene.add(b);
  }

  // parks / plaza / yards
  const grassTex = canvasTex(T, 128, 128, (ctx, w, h) => noise(ctx, w, h, '#4f7a3a', 0.12, 3000));
  grassTex.repeat.set(5, 5);
  const grassMat = new T.MeshStandardMaterial({ map: grassTex, roughness: 1 });
  const plazaTex = canvasTex(T, 128, 128, (ctx, w, h) => {
    noise(ctx, w, h, '#b8ab96', 0.06, 1500);
    ctx.strokeStyle = 'rgba(80,60,40,0.35)'; ctx.lineWidth = 3;
    for (let k = 0; k <= 128; k += 32) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(128, k); ctx.stroke(); }
  });
  plazaTex.repeat.set(12, 12);
  const plazaMat = new T.MeshStandardMaterial({ map: plazaTex, roughness: 0.85 });
  const trees = [];
  for (const p of city.parks) {
    const s = p.size - 2;
    if (p.kind === 'park') {
      const g = new T.Mesh(new T.BoxGeometry(s, 0.05, s), grassMat);
      g.position.set(p.x, 0.24, p.z); g.receiveShadow = true; scene.add(g);
      for (let k = 0; k < 7; k++) trees.push([p.x + (rnd() - 0.5) * (s - 4), p.z + (rnd() - 0.5) * (s - 4), 0.8 + rnd() * 0.6]);
    }
  }
  // central plaza covers the 4 middle cells including the crossing road
  const plaza = new T.Mesh(new T.BoxGeometry(CELL * 2 - ROAD + 0.01, 0.06, CELL * 2 - ROAD + 0.01), plazaMat);
  plaza.position.set(0, 0.23, 0); plaza.receiveShadow = true; scene.add(plaza);
  const plazaRoad = new T.Mesh(new T.BoxGeometry(CELL * 2 - ROAD, 0.2, ROAD + 0.2), plazaMat);
  plazaRoad.position.set(0, 0.1, 0); plazaRoad.receiveShadow = true; scene.add(plazaRoad);
  const plazaRoad2 = plazaRoad.clone(); plazaRoad2.rotation.y = Math.PI / 2; scene.add(plazaRoad2);
  // fountain
  const stone = new T.MeshStandardMaterial({ color: 0x9c9a94, roughness: 0.7 });
  const f1 = new T.Mesh(new T.CylinderGeometry(5, 5.3, 0.8, 32), stone); f1.position.set(0, 0.6, 0); f1.castShadow = f1.receiveShadow = true; scene.add(f1);
  const water = new T.Mesh(new T.CylinderGeometry(4.5, 4.5, 0.1, 32), new T.MeshStandardMaterial({ color: 0x3f7fa8, roughness: 0.15, metalness: 0.2 }));
  water.position.set(0, 0.95, 0); scene.add(water);
  const f2 = new T.Mesh(new T.CylinderGeometry(0.6, 1, 2.6, 16), stone); f2.position.set(0, 1.9, 0); f2.castShadow = true; scene.add(f2);
  obstacles.push({ x: 0, z: 0, w: 9.6, d: 9.6 });
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    trees.push([Math.cos(a) * 24, Math.sin(a) * 24, 1.1]);
  }

  // trees (instanced trunk + canopy)
  const trunkIM = new T.InstancedMesh(new T.CylinderGeometry(0.18, 0.25, 2.2, 6), new T.MeshStandardMaterial({ color: 0x5a4030, roughness: 1 }), trees.length);
  const leafIM = new T.InstancedMesh(new T.IcosahedronGeometry(1.6, 1), new T.MeshStandardMaterial({ color: 0x3d6e2f, roughness: 0.9, flatShading: true }), trees.length);
  trees.forEach((t, i) => {
    const s = t[2];
    m4.compose(v.set(t[0], 1.1 * s, t[1]), q.identity(), sc.set(s, s, s)); trunkIM.setMatrixAt(i, m4);
    m4.compose(v.set(t[0], 3.0 * s, t[1]), q.identity(), sc.set(s, s * 0.9, s)); leafIM.setMatrixAt(i, m4);
    obstacles.push({ x: t[0], z: t[1], w: 0.6 * s, d: 0.6 * s });
  });
  trunkIM.castShadow = leafIM.castShadow = true;
  scene.add(trunkIM, leafIM);
  sc.set(1, 1, 1);

  // buildings
  const facadeMats = FACADES.map((f) => {
    const { map, emis } = facadeTextures(T, f);
    return new T.MeshStandardMaterial({ map, emissiveMap: emis, emissive: new T.Color(night ? 0xffffff : 0x000000), emissiveIntensity: night ? 0.9 : 0, roughness: 0.75 });
  });
  const roofMat = new T.MeshStandardMaterial({ color: 0x5b5d60, roughness: 0.95 });
  const roofDetailMat = new T.MeshStandardMaterial({ color: 0x7c7f83, roughness: 0.8 });
  const neonMats = GANGS.map((g) => new T.MeshStandardMaterial({ color: g.color, emissive: g.color, emissiveIntensity: night ? 1.6 : 0.7 }));
  for (const b of city.buildings) {
    const geo = new T.BoxGeometry(b.w, b.h, b.d);
    scaleBoxUV(geo, b.w, b.h, b.d, 8);
    const fm = facadeMats[b.style];
    const mesh = new T.Mesh(geo, [fm, fm, roofMat, roofMat, fm, fm]);
    mesh.position.set(b.x, b.h / 2 + 0.2, b.z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    // roof parapet + AC unit
    const ac = new T.Mesh(new T.BoxGeometry(Math.min(3, b.w * 0.3), 1.2, Math.min(2.5, b.d * 0.3)), roofDetailMat);
    ac.position.set(b.x + (rnd() - 0.5) * b.w * 0.4, b.h + 0.8, b.z + (rnd() - 0.5) * b.d * 0.4);
    ac.castShadow = true; scene.add(ac);
    // gang neon trim on the roof edge
    if (b.gang >= 0 && rnd() < 0.55) {
      const trim = new T.Mesh(new T.BoxGeometry(b.w + 0.2, 0.35, b.d + 0.2), neonMats[b.gang]);
      trim.position.set(b.x, b.h + 0.1, b.z);
      scene.add(trim);
    }
    obstacles.push({ x: b.x, z: b.z, w: b.w, d: b.d });
  }

  // street lamps at block corners
  const lamps = [];
  for (let i = 0; i < CELLS; i++) for (let j = 0; j < CELLS; j++) {
    const s = (CELL - ROAD) / 2 - 0.8;
    for (const [ox, oz] of [[-1, -1], [1, 1]]) lamps.push([cellCenter(i) + ox * s, cellCenter(j) + oz * s]);
  }
  const poleIM = new T.InstancedMesh(new T.CylinderGeometry(0.08, 0.12, 5, 6), new T.MeshStandardMaterial({ color: 0x2b2e31, roughness: 0.5, metalness: 0.6 }), lamps.length);
  const lampIM = new T.InstancedMesh(new T.BoxGeometry(0.5, 0.2, 0.9), new T.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffe2a0, emissiveIntensity: night ? 2 : 0.4 }), lamps.length);
  lamps.forEach((l, i) => {
    m4.compose(v.set(l[0], 2.7, l[1]), q.identity(), sc); poleIM.setMatrixAt(i, m4);
    m4.compose(v.set(l[0], 5.2, l[1]), q.identity(), sc); lampIM.setMatrixAt(i, m4);
  });
  poleIM.castShadow = true;
  scene.add(poleIM, lampIM);

  // parked cars along curbs
  const cars = [];
  for (let i = 1; i < CELLS; i++) {
    const r = -HALF + CELL * i;
    for (let k = 0; k < CELLS; k++) {
      if (rnd() < 0.45) continue;
      const along = cellCenter(k) + (rnd() - 0.5) * 12;
      const side = rnd() < 0.5 ? -1 : 1;
      const vertical = rnd() < 0.5;
      const x = vertical ? r + side * (ROAD / 2 - 1.3) : along;
      const z = vertical ? along : r + side * (ROAD / 2 - 1.3);
      if (Math.hypot(x, z) < 40) continue;
      cars.push({ x, z, vertical, color: [0x8a1c1c, 0x1c3f8a, 0xdedede, 0x222222, 0x6b6b6b, 0x2e6b3a, 0xc9a227][Math.floor(rnd() * 7)] });
    }
  }
  const bodyIM = new T.InstancedMesh(new T.BoxGeometry(1.9, 0.8, 4.2), new T.MeshStandardMaterial({ roughness: 0.35, metalness: 0.5 }), cars.length);
  const cabIM = new T.InstancedMesh(new T.BoxGeometry(1.7, 0.65, 2.2), new T.MeshStandardMaterial({ roughness: 0.2, metalness: 0.4 }), cars.length);
  const wheelIM = new T.InstancedMesh(new T.BoxGeometry(2.0, 0.6, 0.7), new T.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }), cars.length * 2);
  const col = new T.Color();
  cars.forEach((c, i) => {
    e.set(0, c.vertical ? 0 : Math.PI / 2, 0); q.setFromEuler(e);
    m4.compose(v.set(c.x, 0.75, c.z), q, sc); bodyIM.setMatrixAt(i, m4); bodyIM.setColorAt(i, col.setHex(c.color));
    const off = new T.Vector3(0, 0, -0.2).applyQuaternion(q);
    m4.compose(v.set(c.x + off.x, 1.45, c.z + off.z), q, sc); cabIM.setMatrixAt(i, m4); cabIM.setColorAt(i, col.setHex(0x20262c));
    for (let w = 0; w < 2; w++) {
      const wo = new T.Vector3(0, 0, w ? 1.3 : -1.3).applyQuaternion(q);
      m4.compose(v.set(c.x + wo.x, 0.32, c.z + wo.z), q, sc); wheelIM.setMatrixAt(i * 2 + w, m4);
    }
    obstacles.push({ x: c.x, z: c.z, w: c.vertical ? 1.9 : 4.2, d: c.vertical ? 4.2 : 1.9 });
  });
  bodyIM.castShadow = cabIM.castShadow = true;
  scene.add(bodyIM, cabIM, wheelIM);

  // gang HQs: banners, fire barrels, territory ring
  const hqFx = [];
  city.hqs.forEach((h, gi) => {
    const g = GANGS[gi];
    const ring = new T.Mesh(new T.RingGeometry(9, 10, 48), new T.MeshBasicMaterial({ color: g.color, transparent: true, opacity: 0.55 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(h.x, 0.3, h.z); scene.add(ring);
    const pad = new T.Mesh(new T.CircleGeometry(9, 48), new T.MeshStandardMaterial({ color: 0x2e2a28, roughness: 1 }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(h.x, 0.25, h.z); pad.receiveShadow = true; scene.add(pad);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const px = h.x + Math.cos(a) * 11, pz = h.z + Math.sin(a) * 11;
      const pole = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 7, 6), new T.MeshStandardMaterial({ color: 0x333333 }));
      pole.position.set(px, 3.5, pz); pole.castShadow = true; scene.add(pole);
      const flag = new T.Mesh(new T.PlaneGeometry(2.4, 1.5), new T.MeshStandardMaterial({ color: g.color, side: T.DoubleSide, roughness: 0.8 }));
      flag.position.set(px + 1.2, 6.1, pz); flag.castShadow = true; scene.add(flag);
      hqFx.push({ flag, base: k });
      // fire barrel
      const bx = h.x + Math.cos(a + 0.5) * 7, bz = h.z + Math.sin(a + 0.5) * 7;
      const barrel = new T.Mesh(new T.CylinderGeometry(0.45, 0.45, 1.1, 12), new T.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.6, metalness: 0.4 }));
      barrel.position.set(bx, 0.75, bz); barrel.castShadow = true; scene.add(barrel);
      const fire = new T.Mesh(new T.ConeGeometry(0.4, 0.9, 8), new T.MeshBasicMaterial({ color: 0xff8a2a }));
      fire.position.set(bx, 1.7, bz); scene.add(fire);
      hqFx.push({ fire });
      obstacles.push({ x: bx, z: bz, w: 0.9, d: 0.9 });
    }
    const light = new T.PointLight(g.color, night ? 3 : 1.5, 26, 2);
    light.position.set(h.x, 4, h.z); scene.add(light);
  });

  return {
    obstacles,
    update(time) {
      for (const f of hqFx) {
        if (f.flag) f.flag.rotation.y = Math.sin(time * 3 + f.base) * 0.3;
        if (f.fire) { const s = 0.85 + Math.sin(time * 17 + f.fire.position.x) * 0.15; f.fire.scale.set(s, 0.8 + s * 0.4, s); }
      }
    },
  };
}
