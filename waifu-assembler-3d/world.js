// Babylon.js world dressing: a bright restoration hall (fragments), the vaulted sculpture gallery (twelve plinths),
// fragment plinths, statue plinths, museum labels and particles.
import { ANNEX, GALLERY_DOOR, HALL_SIZE, PARTS, getSet } from './logic.mjs';
import { PART_OFFSET } from './statues.js';
import { roundRect } from './ui.js';
import { STATUE_POSES } from './poses.mjs';

const B = () => window.BABYLON;
const c3 = (hex) => B().Color3.FromHexString(typeof hex === 'number' ? `#${hex.toString(16).padStart(6, '0')}` : hex);


// ---------- shared material helpers ----------
const matCache = new WeakMap();
function cache(scene) { if (!matCache.has(scene)) matCache.set(scene, new Map()); return matCache.get(scene); }

export function glowMat(scene, key, color, { alpha = 1, intensity = 1, additive = false } = {}) {
  const store = cache(scene);
  const id = `glow|${key}|${color}|${alpha}|${intensity}|${additive}`;
  if (store.has(id)) return store.get(id);
  const m = new (B().StandardMaterial)(id, scene);
  m.disableLighting = true; m.emissiveColor = c3(color).scale(intensity); m.alpha = alpha;
  if (additive) m.alphaMode = B().Engine.ALPHA_ADD;
  m.backFaceCulling = false;
  store.set(id, m);
  return m;
}
export function pbrMat(scene, key, color, { metallic = 0, roughness = 0.6, emissive = null, emissiveScale = 1, alpha = 1 } = {}) {
  const store = cache(scene);
  const id = `pbr|${key}|${color}|${metallic}|${roughness}|${emissive}|${emissiveScale}|${alpha}`;
  if (store.has(id)) return store.get(id);
  const m = new (B().PBRMaterial)(id, scene);
  m.albedoColor = c3(color); m.metallic = metallic; m.roughness = roughness; m.alpha = alpha;
  if (emissive) m.emissiveColor = c3(emissive).scale(emissiveScale);
  store.set(id, m);
  return m;
}

// ---------- textures ----------
export function starTexture(scene) {
  const store = cache(scene);
  if (store.has('star')) return store.get('star');
  const t = new (B().DynamicTexture)('star', 128, scene, true);
  const ctx = t.getContext();
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 60);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(64, 6); ctx.lineTo(64, 122); ctx.moveTo(6, 64); ctx.lineTo(122, 64); ctx.stroke();
  t.hasAlpha = true; t.update(true);
  store.set('star', t); return t;
}
export function petalTexture(scene) {
  const store = cache(scene);
  if (store.has('petal')) return store.get('petal');
  const t = new (B().DynamicTexture)('petal', 128, scene, true);
  const ctx = t.getContext();
  ctx.translate(64, 64); ctx.rotate(-0.5);
  const g = ctx.createLinearGradient(-40, -50, 40, 50);
  g.addColorStop(0, '#fff3f8'); g.addColorStop(1, '#ff9bc2');
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(0, -56); ctx.bezierCurveTo(52, -40, 46, 38, 0, 56); ctx.bezierCurveTo(-46, 38, -52, -40, 0, -56); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(0, 48); ctx.stroke();
  ctx.fillStyle = 'rgba(210,70,130,.35)'; ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(-7, -42); ctx.lineTo(7, -42); ctx.fill();
  t.hasAlpha = true; t.update(true);
  store.set('petal', t); return t;
}

// ---------- painted textures ----------
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function travertineTexture(scene) { // warm cream stone tiles, 4 x 4 per texture
  const t = new (B().DynamicTexture)('travertine', 1024, scene, true); const ctx = t.getContext(); const r = rng(11);
  for (let i = 0; i < 4; i += 1) for (let j = 0; j < 4; j += 1) {
    const l = 226 + Math.floor(r() * 14); ctx.fillStyle = `rgb(${l},${l - 8},${l - 22})`; ctx.fillRect(i * 256, j * 256, 256, 256);
    for (let k = 0; k < 7; k += 1) { // soft travertine banding
      ctx.strokeStyle = `rgba(${150 + r() * 40},${130 + r() * 30},${100 + r() * 20},${0.05 + r() * 0.06})`; ctx.lineWidth = 2 + r() * 6;
      const y = j * 256 + r() * 256; ctx.beginPath(); ctx.moveTo(i * 256, y); ctx.bezierCurveTo(i * 256 + 90, y + (r() - 0.5) * 30, i * 256 + 170, y + (r() - 0.5) * 30, i * 256 + 256, y + (r() - 0.5) * 20); ctx.stroke();
    }
  }
  for (let k = 0; k < 9000; k += 1) { ctx.fillStyle = r() > 0.5 ? 'rgba(120,96,70,.06)' : 'rgba(255,255,255,.08)'; ctx.fillRect(r() * 1024, r() * 1024, 2, 2); }
  ctx.strokeStyle = 'rgba(170,150,122,.85)'; ctx.lineWidth = 3;
  for (let i = 0; i <= 1024; i += 256) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke(); }
  t.update(true); t.anisotropicFilteringLevel = 8; t.wrapU = t.wrapV = B().Texture.WRAP_ADDRESSMODE;
  return t;
}
function marbleTexture(scene) { // polished white marble slabs with grey veins
  const t = new (B().DynamicTexture)('marble', 1024, scene, true); const ctx = t.getContext(); const r = rng(29);
  ctx.fillStyle = '#f3f1ec'; ctx.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 26; k += 1) {
    ctx.strokeStyle = `rgba(${120 + r() * 40},${122 + r() * 40},${130 + r() * 40},${0.08 + r() * 0.16})`; ctx.lineWidth = 0.8 + r() * 2.6;
    let x = r() * 1024; let y = 0; ctx.beginPath(); ctx.moveTo(x, y);
    while (y < 1024) { x += (r() - 0.5) * 90; y += 30 + r() * 60; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(150,146,140,.7)'; ctx.lineWidth = 2;
  for (const i of [0, 512, 1024]) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke(); }
  t.update(true); t.anisotropicFilteringLevel = 8; t.wrapU = t.wrapV = B().Texture.WRAP_ADDRESSMODE;
  return t;
}
function skyTexture(scene) { // daylight seen through the tall windows
  const t = new (B().DynamicTexture)('windowSky', { width: 256, height: 512 }, scene, true); const ctx = t.getContext(); const r = rng(5);
  const g = ctx.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#9cc7ec'); g.addColorStop(0.62, '#dcecf8'); g.addColorStop(0.8, '#f4f1e8'); g.addColorStop(1, '#c9d6b8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 512);
  for (let k = 0; k < 14; k += 1) { const x = r() * 256; const y = 40 + r() * 230; const cg = ctx.createRadialGradient(x, y, 2, x, y, 40 + r() * 40); cg.addColorStop(0, 'rgba(255,255,255,.75)'); cg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = cg; ctx.fillRect(0, 0, 256, 512); }
  ctx.fillStyle = 'rgba(122,150,112,.75)'; // distant garden trees
  for (let x = -10; x < 266; x += 18 + r() * 14) { ctx.beginPath(); ctx.ellipse(x, 470 - r() * 30, 18 + r() * 14, 34 + r() * 26, 0, 0, Math.PI * 2); ctx.fill(); }
  t.update(true); return t;
}
function medallionTexture(scene, sets) { // 12-point compass star in the hall floor: one ray per statue
  const t = new (B().DynamicTexture)('medallion', 1024, scene, true); const ctx = t.getContext(); const c = 512;
  ctx.clearRect(0, 0, 1024, 1024);
  ctx.fillStyle = '#ece4d4'; ctx.beginPath(); ctx.arc(c, c, 508, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b8945c'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(c, c, 490, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c, c, 455, 0, Math.PI * 2); ctx.stroke();
  sets.forEach((set, i) => {
    const a = (i / sets.length) * Math.PI * 2 - Math.PI / 2; const a1 = a - Math.PI / sets.length; const a2 = a + Math.PI / sets.length;
    ctx.fillStyle = set.color; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.moveTo(c + Math.cos(a1) * 80, c + Math.sin(a1) * 80); ctx.lineTo(c + Math.cos(a) * 440, c + Math.sin(a) * 440); ctx.lineTo(c + Math.cos(a2) * 80, c + Math.sin(a2) * 80); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = '#b8945c'; ctx.lineWidth = 2.5; ctx.stroke();
  });
  ctx.fillStyle = '#f6f1e6'; ctx.beginPath(); ctx.arc(c, c, 90, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#b8945c'; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = '#b8945c'; ctx.font = '700 92px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✦', c, c + 4);
  t.hasAlpha = true; t.update(true); t.anisotropicFilteringLevel = 8; return t;
}
function plaqueTexture(scene, text, sub) {
  const t = new (B().DynamicTexture)(`plaque-${text}`, { width: 1024, height: 256 }, scene, true); const ctx = t.getContext();
  ctx.fillStyle = '#f2ece0'; ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#b8945c'; ctx.lineWidth = 8; ctx.strokeRect(16, 16, 992, 224);
  ctx.fillStyle = '#5b4632'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 92px Georgia, serif'; ctx.fillText(text, 512, sub ? 112 : 128);
  if (sub) { ctx.font = '600 34px Georgia, serif'; ctx.fillStyle = '#8a7055'; ctx.fillText(sub, 512, 190); }
  t.update(true); return t;
}

// ---------- billboard labels: cream museum cards with a colour tab ----------
function paintLabel(tex, text, color) {
  const ctx = tex.getContext(); const w = 768; const h = 192;
  ctx.clearRect(0, 0, w, h);
  ctx.shadowColor = 'rgba(60,40,20,.35)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(250,246,238,.96)'; roundRect(ctx, 24, 36, w - 48, h - 72, 22); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = color; roundRect(ctx, 24, 36, 26, h - 72, 13); ctx.fill();
  ctx.strokeStyle = 'rgba(184,148,92,.8)'; ctx.lineWidth = 3; roundRect(ctx, 24, 36, w - 48, h - 72, 22); ctx.stroke();
  ctx.fillStyle = '#3f3128'; ctx.font = '700 50px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2 + 10, h / 2 + 2);
  tex.update(true);
}
export function makeLabel(scene, text, color, width, height) {
  const tex = new (B().DynamicTexture)('label', { width: 768, height: 192 }, scene, true);
  tex.hasAlpha = true;
  paintLabel(tex, text, color);
  const m = new (B().StandardMaterial)('labelMat', scene);
  m.diffuseTexture = tex; m.useAlphaFromDiffuseTexture = true; m.emissiveColor = B().Color3.White();
  m.disableLighting = true; m.backFaceCulling = false; m.fogEnabled = false;
  const plane = B().MeshBuilder.CreatePlane('label', { width, height }, scene);
  plane.material = m; plane.billboardMode = B().Mesh.BILLBOARDMODE_ALL; plane.isPickable = false;
  let current = text; let currentColor = color;
  return { mesh: plane, setText: (next, nextColor = currentColor) => { if (next === current && nextColor === currentColor) return; current = next; currentColor = nextColor; paintLabel(tex, next, nextColor); } };
}

// ---------- batching static decor into a few draw calls ----------
class Batch {
  constructor(scene, parent) { this.scene = scene; this.parent = parent; this.groups = new Map(); }
  box(mat, x, y, z, sx, sy, sz) {
    const m = B().MeshBuilder.CreateBox('b', { width: sx, height: sy, depth: sz }, this.scene);
    m.position.set(x, y, z); return this.push(mat, m);
  }
  cyl(mat, x, y, z, h, dTop, dBot, tess = 16) {
    const m = B().MeshBuilder.CreateCylinder('c', { height: h, diameterTop: dTop, diameterBottom: dBot, tessellation: tess }, this.scene);
    m.position.set(x, y, z); return this.push(mat, m);
  }
  sphere(mat, x, y, z, d, seg = 12) {
    const m = B().MeshBuilder.CreateSphere('s', { diameter: d, segments: seg }, this.scene);
    m.position.set(x, y, z); return this.push(mat, m);
  }
  torus(mat, x, y, z, d, t, tess = 64) {
    const m = B().MeshBuilder.CreateTorus('t', { diameter: d, thickness: t, tessellation: tess }, this.scene);
    m.position.set(x, y, z); return this.push(mat, m);
  }
  push(mat, mesh) { if (!this.groups.has(mat)) this.groups.set(mat, []); this.groups.get(mat).push(mesh); return mesh; }
  finish() {
    const out = [];
    for (const [mat, meshes] of this.groups) {
      const merged = B().Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
      merged.material = mat; merged.parent = this.parent; merged.isPickable = false; merged.freezeWorldMatrix();
      out.push(merged);
    }
    return out;
  }
}


// ---------- the restoration hall and the sculpture gallery ----------
// Hall: x, z within ±HALL_SIZE/2, walls WALL_H high, a coffered ceiling with skylights and tall garden windows.
// Gallery: a vaulted nave north of the hall (ANNEX bounds) with a marble floor, a central runner and one tinted
// niche behind every plinth. A single portal of half-width GALLERY_DOOR joins them.
export const WALL_H = 16;
export function buildWorld(scene, shadowGen, sets) {
  const BAB = B();
  const root = new BAB.TransformNode('world', scene);
  const H = HALL_SIZE / 2; const G = ANNEX; const gw = G.maxX;
  const wallZ = -H; // the hall's north wall is the gallery's south wall
  const gLen = wallZ - G.farZ; const gz = (wallZ + G.farZ) / 2;

  // floors
  const trav = travertineTexture(scene); trav.uScale = HALL_SIZE / 12; trav.vScale = HALL_SIZE / 12;
  const floorMat = new BAB.PBRMaterial('hallFloor', scene);
  floorMat.albedoTexture = trav; floorMat.metallic = 0; floorMat.roughness = 0.42; floorMat.environmentIntensity = 0.55;
  const hall = BAB.MeshBuilder.CreateGround('hall', { width: HALL_SIZE, height: HALL_SIZE }, scene);
  hall.position.y = -0.02; hall.material = floorMat; hall.parent = root; hall.isPickable = false; hall.receiveShadows = true;
  const marble = marbleTexture(scene); marble.uScale = (gw * 2) / 8; marble.vScale = gLen / 8;
  const annexMat = new BAB.StandardMaterial('galleryFloor', scene);
  annexMat.diffuseTexture = marble; annexMat.specularColor = new BAB.Color3(0.35, 0.35, 0.35); annexMat.specularPower = 180;
  const annex = BAB.MeshBuilder.CreateGround('gallery', { width: gw * 2, height: gLen }, scene);
  annex.position.set(0, -0.015, gz); annex.material = annexMat; annex.parent = root; annex.isPickable = false; annex.receiveShadows = true;
  const medal = BAB.MeshBuilder.CreateDisc('medallion', { radius: 7.5, tessellation: 64 }, scene);
  medal.rotation.x = Math.PI / 2; medal.position.y = 0.006; medal.parent = root; medal.isPickable = false; medal.receiveShadows = true;
  const medalMat = new BAB.StandardMaterial('medallionMat', scene); medalMat.diffuseTexture = medallionTexture(scene, sets); medalMat.useAlphaFromDiffuseTexture = true;
  medalMat.specularColor = new BAB.Color3(0.2, 0.2, 0.2); medalMat.backFaceCulling = false; medal.material = medalMat;

  // materials
  const plaster = pbrMat(scene, 'plaster', '#efe7da', { roughness: 0.92 });
  const wainscot = pbrMat(scene, 'wainscot', '#d6c3a2', { roughness: 0.7 });
  const brass = pbrMat(scene, 'brass', '#c9a466', { metallic: 0.85, roughness: 0.32 });
  const stone = pbrMat(scene, 'stoneWhite', '#f2eee6', { roughness: 0.38 });
  const wood = pbrMat(scene, 'oak', '#a97b50', { roughness: 0.55 });
  const leaf = pbrMat(scene, 'leaf', '#6f9550', { roughness: 0.85 });
  const leaf2 = pbrMat(scene, 'leaf2', '#87a964', { roughness: 0.85 });
  const bark = pbrMat(scene, 'bark', '#7a5b3f', { roughness: 0.9 });
  const pot = pbrMat(scene, 'terracotta', '#c27d58', { roughness: 0.8 });
  const carpet = pbrMat(scene, 'carpet', '#a3544a', { roughness: 0.95 });
  const ceilMat = new BAB.StandardMaterial('ceiling', scene);
  ceilMat.diffuseColor = BAB.Color3.FromHexString('#f4efe6'); ceilMat.emissiveColor = BAB.Color3.FromHexString('#b3aa9c'); ceilMat.specularColor = BAB.Color3.Black(); ceilMat.backFaceCulling = false;
  const skylight = glowMat(scene, 'skylight', '#fbfcff', { intensity: 1.0 });
  const sky = new BAB.StandardMaterial('windowGlass', scene);
  sky.emissiveTexture = skyTexture(scene); sky.disableLighting = true; sky.backFaceCulling = false; sky.fogEnabled = false;

  const b = new Batch(scene, root);
  const wall = (x, z, sx, sz, h = WALL_H, y0 = 0, mat = plaster) => b.box(mat, x, y0 + h / 2, z, sx, h, sz);
  // hall walls (north wall leaves the gallery portal open)
  wall(-H - 0.5, 0, 1, HALL_SIZE + 2); wall(H + 0.5, 0, 1, HALL_SIZE + 2); wall(0, H + 0.5, HALL_SIZE + 2, 1);
  const door = GALLERY_DOOR; const doorH = 12;
  wall(-(H + door) / 2, wallZ - 0.5, H - door, 1.2); wall((H + door) / 2, wallZ - 0.5, H - door, 1.2);
  wall(0, wallZ - 0.5, door * 2, 1.2, WALL_H - doorH, doorH);
  // gallery walls
  wall(-gw - 0.5, gz, 1, gLen + 1.2); wall(gw + 0.5, gz, 1, gLen + 1.2); wall(0, G.farZ - 0.5, gw * 2 + 2, 1);

  // wainscot + brass rail + crown moulding, around the hall and down the gallery
  const runs = [
    [-H + 0.08, 0, 0.16, HALL_SIZE], [H - 0.08, 0, 0.16, HALL_SIZE], [0, H - 0.08, HALL_SIZE, 0.16],
    [-(H + door) / 2, wallZ + 0.08, H - door, 0.16], [(H + door) / 2, wallZ + 0.08, H - door, 0.16],
    [-gw + 0.08, gz, 0.16, gLen], [gw - 0.08, gz, 0.16, gLen], [0, G.farZ + 0.08, gw * 2, 0.16],
  ];
  for (const [x, z, sx, sz] of runs) {
    b.box(wainscot, x, 1.3, z, sx, 2.6, sz);
    b.box(brass, x, 2.66, z, sx + 0.06, 0.12, sz + 0.06);
    b.box(stone, x, WALL_H - 0.3, z, sx + 0.5, 0.6, sz + 0.5);
  }

  // hall ceiling: coffers and skylights
  const ceil = BAB.MeshBuilder.CreateGround('hallCeil', { width: HALL_SIZE, height: HALL_SIZE }, scene);
  ceil.position.y = WALL_H; ceil.rotation.x = Math.PI; ceil.material = ceilMat; ceil.parent = root; ceil.isPickable = false;
  for (const v of [-48, -24, 0, 24, 48]) { b.box(stone, 0, WALL_H - 0.45, v, HALL_SIZE, 0.9, 0.8); b.box(stone, v, WALL_H - 0.45, 0, 0.8, 0.9, HALL_SIZE); }
  for (const x of [-36, -12, 12, 36]) for (const z of [-36, -12, 12, 36]) b.box(skylight, x, WALL_H - 0.05, z, 13, 0.05, 13);

  // tall arched garden windows between marble pilasters
  const windowAt = (x, z, along) => { // along: 'z' for side walls, 'x' for the south wall
    const inX = along === 'z'; const w = 5; const sgn = inX ? -Math.sign(x) : -Math.sign(z);
    const px = inX ? x + sgn * 0.02 : x; const pz = inX ? z : z + sgn * 0.02;
    b.box(sky, px, 7.2, pz, inX ? 0.1 : w, 8.4, inX ? w : 0.1);
    const arch = BAB.MeshBuilder.CreateDisc('arch', { radius: w / 2, arc: 0.5, tessellation: 32, sideOrientation: BAB.Mesh.DOUBLESIDE }, scene);
    arch.position.set(px, 11.4, pz); if (inX) arch.rotation.y = Math.PI / 2; b.push(sky, arch);
    const fx = inX ? px + sgn * 0.08 : px; const fz = inX ? pz : pz + sgn * 0.08;
    b.box(stone, fx, 7.2, fz, inX ? 0.18 : 0.16, 8.4, inX ? 0.16 : 0.18); // mullion
    b.box(stone, fx, 7.6, fz, inX ? 0.18 : w, 0.16, inX ? w : 0.18); // transom
    b.box(stone, inX ? px + sgn * 0.3 : px, 2.95, inX ? pz : pz + sgn * 0.3, inX ? 0.7 : w + 0.8, 0.3, inX ? w + 0.8 : 0.7); // sill
    for (const s of [-1, 1]) b.box(stone, inX ? fx : fx + s * (w / 2 + 0.15), 7.2, inX ? fz + s * (w / 2 + 0.15) : fz, 0.3, 8.4, 0.3); // jambs
  };
  for (const z of [-40, -20, 0, 20, 40]) { windowAt(-H + 0.01, z, 'z'); windowAt(H - 0.01, z, 'z'); }
  for (const x of [-42, -18, 18, 42]) windowAt(x, H - 0.01, 'x');
  const pilaster = (x, z) => { b.cyl(stone, x, WALL_H / 2, z, WALL_H, 1.5, 1.6, 20); b.box(stone, x, 0.35, z, 2.1, 0.7, 2.1); b.box(stone, x, WALL_H - 1.0, z, 2.0, 0.6, 2.0); b.box(brass, x, 0.74, z, 1.8, 0.08, 1.8); };
  for (const z of [-50, -30, -10, 10, 30, 50]) { pilaster(-H + 0.4, z); pilaster(H - 0.4, z); }
  for (const x of [-54, -30, -6, 6, 30, 54]) if (Math.abs(x) > door + 1) pilaster(x, H - 0.4);

  // the portal: marble piers, lintel and keystone, a plaque naming the gallery
  for (const s of [-1, 1]) { b.box(stone, s * (door + 0.7), doorH / 2, wallZ, 1.4, doorH, 2.0); b.box(brass, s * (door + 0.7), 0.74, wallZ, 1.5, 0.08, 2.1); }
  b.box(stone, 0, doorH + 0.5, wallZ, door * 2 + 2.8, 1.0, 2.0);
  b.box(stone, 0, doorH + 0.5, wallZ + 1.05, 1.4, 1.6, 0.4);
  const plaque = BAB.MeshBuilder.CreatePlane('galleryPlaque', { width: 9, height: 2.25 }, scene);
  plaque.position.set(0, doorH + 2.2, wallZ + 0.05); plaque.rotation.y = Math.PI; plaque.parent = root; plaque.isPickable = false;
  const plaqueMat = new BAB.StandardMaterial('plaqueMat', scene); plaqueMat.diffuseTexture = plaqueTexture(scene, 'SCULPTURE GALLERY', 'TWELVE FIGURES · RESTORED BY HAND'); plaqueMat.emissiveColor = new BAB.Color3(0.35, 0.33, 0.3); plaqueMat.specularColor = BAB.Color3.Black();
  plaque.material = plaqueMat;

  // olive trees in terracotta pots, oak benches
  const tree = (x, z, s = 1) => {
    b.cyl(pot, x, 0.6 * s, z, 1.2 * s, 1.5 * s, 1.1 * s, 18); b.cyl(brass, x, 1.2 * s, z, 0.08, 1.56 * s, 1.56 * s, 18);
    b.cyl(bark, x, 2.4 * s, z, 2.6 * s, 0.14 * s, 0.22 * s, 8);
    const r = rng(Math.round(x * 13 + z * 7));
    for (let k = 0; k < 6; k += 1) { const a = k * 1.1; b.sphere(k % 2 ? leaf : leaf2, x + Math.cos(a) * 0.7 * s * r(), 3.6 * s + r() * 1.1 * s, z + Math.sin(a) * 0.7 * s * r(), (1.3 + r() * 0.9) * s, 10); }
  };
  for (const [x, z] of [[-54, 54], [54, 54], [-54, -54], [54, -54], [-(door + 3.2), wallZ + 2.6], [door + 3.2, wallZ + 2.6], [-56, -30], [56, 30]]) tree(x, z, x === -(door + 3.2) || x === door + 3.2 ? 1.15 : 1);
  const bench = (x, z, rot) => {
    const along = rot ? [1.2, 4] : [4, 1.2];
    b.box(wood, x, 0.95, z, along[0], 0.22, along[1]);
    for (const s of [-1, 1]) b.box(stone, x + (rot ? 0 : s * 1.5), 0.42, z + (rot ? s * 1.5 : 0), rot ? 1.0 : 0.5, 0.84, rot ? 0.5 : 1.0);
  };
  bench(-20, 54, false); bench(20, 54, false); bench(0, -19, false); bench(0, 17, false);

  // ---------- sculpture gallery ----------
  const vaultY = WALL_H; const rise = 6;
  const curve = (z, flat = false) => Array.from({ length: 25 }, (_, i) => { const x = -gw + (2 * gw * i) / 24; return new BAB.Vector3(x, flat ? vaultY : vaultY + rise * (1 - (x / gw) ** 2), z); });
  const vault = BAB.MeshBuilder.CreateRibbon('vault', { pathArray: [curve(wallZ - 1.2), curve(G.farZ)], sideOrientation: BAB.Mesh.DOUBLESIDE }, scene);
  vault.material = ceilMat; vault.parent = root; vault.isPickable = false;
  const lunettes = [wallZ - 1.2, G.farZ].map((z) => { const m = BAB.MeshBuilder.CreateRibbon('lunette', { pathArray: [curve(z, true), curve(z)], sideOrientation: BAB.Mesh.DOUBLESIDE }, scene); m.material = ceilMat; m.parent = root; m.isPickable = false; return m; });
  b.box(skylight, 0, vaultY + rise - 0.06, gz, 5, 0.06, gLen - 6);
  const ribZ = [];
  for (let z = -68.75; z > G.farZ + 2; z -= 12.5) ribZ.push(z);
  for (const z of ribZ) {
    const rib = BAB.MeshBuilder.CreateTube('rib', { path: curve(z).map((p) => p.add(new BAB.Vector3(0, -0.2, 0))), radius: 0.3, tessellation: 10 }, scene); b.push(stone, rib);
    for (const s of [-1, 1]) { b.cyl(stone, s * (gw - 0.5), WALL_H / 2, z, WALL_H, 1.0, 1.1, 16); b.box(stone, s * (gw - 0.5), 0.35, z, 1.5, 0.7, 1.5); b.box(stone, s * (gw - 0.5), WALL_H - 0.6, z, 1.5, 0.5, 1.5); }
  }
  // central runner with brass edging
  b.box(carpet, 0, 0.012, gz - 1, 8, 0.024, gLen - 6);
  for (const s of [-1, 1]) b.box(brass, s * 4.05, 0.016, gz - 1, 0.1, 0.03, gLen - 6);
  // apse window at the far end
  b.box(sky, 0, 8, G.farZ + 0.02, 11, 10, 0.1);
  const apse = BAB.MeshBuilder.CreateDisc('apseArch', { radius: 5.5, arc: 0.5, tessellation: 40, sideOrientation: BAB.Mesh.DOUBLESIDE }, scene);
  apse.position.set(0, 13, G.farZ + 0.02); b.push(sky, apse);
  for (const x of [-2.75, 0, 2.75]) b.box(stone, x, 8.5, G.farZ + 0.1, 0.2, 11, 0.16);
  b.box(stone, 0, 8, G.farZ + 0.1, 11, 0.2, 0.16);
  b.box(stone, 0, 2.9, G.farZ + 0.4, 12, 0.3, 0.8);
  tree(-8, G.farZ + 2.5, 1.1); tree(8, G.farZ + 2.5, 1.1);
  const tinted = new Map();
  const finishBatch = b.finish();
  for (const m of finishBatch) { m.receiveShadows = true; }

  // one tinted niche on the wall behind each plinth (built per podium so it follows the editor layout)
  const niche = (set, x, z) => {
    const side = Math.sign(x) || 1; const wx = side * (gw - 0.12);
    if (!tinted.has(set.id)) tinted.set(set.id, pbrMat(scene, `niche-${set.id}`, mixHex(set.color, '#f3ece0', 0.62), { roughness: 0.85 }));
    const mat = tinted.get(set.id);
    const n = new BAB.TransformNode(`niche-${set.id}`, scene); n.parent = root;
    const panel = BAB.MeshBuilder.CreateBox('nichePanel', { width: 0.12, height: 9, depth: 7 }, scene); panel.position.set(wx, 6.2, z); panel.material = mat; panel.parent = n;
    const arch = BAB.MeshBuilder.CreateDisc('nicheArch', { radius: 3.5, arc: 0.5, tessellation: 32, sideOrientation: BAB.Mesh.DOUBLESIDE }, scene);
    arch.position.set(wx, 10.7, z); arch.rotation.y = Math.PI / 2; arch.material = mat; arch.parent = n;
    const frame = BAB.MeshBuilder.CreateTorus('nicheFrame', { diameter: 7.4, thickness: 0.22, tessellation: 40, arc: 0.5 }, scene);
    frame.position.set(wx - side * 0.05, 10.7, z); frame.rotation.set(Math.PI / 2, Math.PI / 2, 0); frame.material = brass; frame.parent = n;
    for (const s of [-1, 1]) { const j = BAB.MeshBuilder.CreateBox('nicheJamb', { width: 0.2, height: 9, depth: 0.22 }, scene); j.position.set(wx - side * 0.05, 6.2, z + s * 3.6); j.material = brass; j.parent = n; }
    for (const m of n.getChildMeshes()) m.isPickable = false;
    return n;
  };

  return { root, annexFloor: annexMat, hall, annex, ceilings: [ceil, vault, ...lunettes], niche };
}
const mixHex = (a, b2, t) => { const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const A = p(a); const Bc = p(b2); return `#${A.map((v, i) => Math.round(v + (Bc[i] - v) * t).toString(16).padStart(2, '0')).join('')}`; };

// ---------- fragment display: a small marble plinth, the part floating above it ----------
export function buildFragment(scene, kit, fragment, part) {
  const BAB = B();
  const set = getSet(fragment.setId);
  const root = new BAB.TransformNode(`frag-${fragment.key}`, scene);
  const baseY = 2.3;
  root.position.set(fragment.x, baseY, fragment.z);
  const spin = new BAB.TransformNode('spin', scene); spin.parent = root; spin.scaling.setAll(0.8);
  part.parent = spin;
  // everything that stands on the floor hangs off `floor`, which the renderer pins while the part bobs
  const floor = new BAB.TransformNode('floor', scene); floor.parent = root;
  const stone = pbrMat(scene, 'plinthStone', '#f1ece3', { roughness: 0.4 });
  const brass = pbrMat(scene, 'brass', '#c9a466', { metallic: 0.85, roughness: 0.32 });
  const band = pbrMat(scene, `band-${set.id}`, set.color, { roughness: 0.45, emissive: set.color, emissiveScale: 0.18 });
  const plinth = BAB.MeshBuilder.CreateCylinder('plinth', { height: 0.95, diameterTop: 1.15, diameterBottom: 1.35, tessellation: 24 }, scene);
  plinth.parent = floor; plinth.position.y = 0.5; plinth.material = stone;
  const cap = BAB.MeshBuilder.CreateCylinder('plinthCap', { height: 0.1, diameter: 1.45, tessellation: 24 }, scene);
  cap.parent = floor; cap.position.y = 1.02; cap.material = stone;
  const ring = BAB.MeshBuilder.CreateTorus('plinthBand', { diameter: 1.2, thickness: 0.07, tessellation: 32 }, scene);
  ring.parent = floor; ring.position.y = 0.88; ring.material = band;
  const foot = BAB.MeshBuilder.CreateTorus('plinthFoot', { diameter: 1.38, thickness: 0.06, tessellation: 32 }, scene);
  foot.parent = floor; foot.position.y = 0.06; foot.material = brass;
  // nearest-fragment beacon: a soft tinted shaft of light above the plinth
  const beam = BAB.MeshBuilder.CreateCylinder('beam', { height: 4.6, diameterTop: 0.35, diameterBottom: 1.25, tessellation: 24, cap: BAB.Mesh.NO_CAP }, scene);
  beam.parent = floor; beam.position.y = 3.4; beam.setEnabled(false); beam.isPickable = false;
  const beamMat = glowMat(scene, `beam-${set.id}`, set.color, { intensity: 1, alpha: 0.1 }); beamMat.fogEnabled = false; beam.material = beamMat;
  const ringMat = new BAB.StandardMaterial(`halo-${fragment.key}`, scene);
  ringMat.disableLighting = true; ringMat.emissiveColor = c3(set.color); ringMat.alpha = 0; ringMat.backFaceCulling = false;
  const halo = BAB.MeshBuilder.CreateTorus('halo', { diameter: 1.7, thickness: 0.05, tessellation: 40 }, scene);
  halo.parent = floor; halo.position.y = 1.1; halo.material = ringMat; halo.isPickable = false;
  for (const m of root.getChildMeshes()) m.isPickable = false;
  return { root, spin, beacon: beam, ring: halo, ringMat, floorGlow: floor, baseY, phase: fragment.index * 1.37 + fragment.x * 0.13 };
}

// ---------- statue plinth in the gallery ----------
// `parts` gives one prebuilt solid statue part per part id; the ghost preview is merged from a copy of it.
export function buildPodium(scene, kit, set, position, shadowGen, parts) {
  const BAB = B();
  const group = new BAB.TransformNode(`podium-${set.id}`, scene);
  group.position.set(position[0], 0, position[1]);
  const facing = new BAB.TransformNode('facing', scene); facing.parent = group; // turns toward the aisle
  const stone = pbrMat(scene, 'podStone', '#f2eee7', { roughness: 0.32 });
  const brass = pbrMat(scene, 'brass', '#c9a466', { metallic: 0.85, roughness: 0.32 });
  const band = pbrMat(scene, `podBand-${set.id}`, mixHex(set.color, '#ffffff', 0.15), { roughness: 0.4, emissive: set.color, emissiveScale: 0.12 });

  const base = BAB.MeshBuilder.CreateCylinder('base', { height: 0.32, diameterTop: 4.3, diameterBottom: 4.6, tessellation: 48 }, scene);
  base.parent = facing; base.position.y = 0.16; base.material = stone;
  const trim = BAB.MeshBuilder.CreateCylinder('trim', { height: 0.22, diameter: 4.0, tessellation: 48 }, scene);
  trim.parent = facing; trim.position.y = 0.43; trim.material = band;
  const top = BAB.MeshBuilder.CreateCylinder('top', { height: 0.2, diameterTop: 4.1, diameterBottom: 3.95, tessellation: 48 }, scene);
  top.parent = facing; top.position.y = 0.64; top.material = stone;
  const topGlow = BAB.MeshBuilder.CreateTorus('topBrass', { diameter: 4.12, thickness: 0.07, tessellation: 64 }, scene);
  topGlow.parent = facing; topGlow.position.y = 0.74; topGlow.material = brass;
  const lower = BAB.MeshBuilder.CreateTorus('lowBrass', { diameter: 4.02, thickness: 0.05, tessellation: 64 }, scene);
  lower.parent = facing; lower.position.y = 0.33; lower.material = brass;

  const label = makeLabel(scene, set.name, set.color, 6.6, 1.65);
  label.mesh.parent = group; label.mesh.position.y = 6.7;

  const figure = new BAB.TransformNode('figure', scene); figure.parent = facing; figure.position.y = 0.74;
  const pose = STATUE_POSES[set.id];
  figure.rotation.y = pose.turn;
  const figureParts = new Map();
  const holo = kit.holoMaterial(set.id);
  for (const part of PARTS) {
    const anchor = new BAB.TransformNode(`anchor-${part.id}`, scene); anchor.parent = figure; anchor.position.set(...PART_OFFSET[part.id]);
    if (part.id === 'head' && pose.head) anchor.rotation.set(...pose.head); // arms are posed in their geometry
    const solid = parts.get(part.id); solid.parent = anchor; solid.position.set(0, 0, 0); solid.setEnabled(false);
    // ghost: one merged mesh sharing nothing with the solid, in the hologram material
    const copies = solid.getChildMeshes().map((m) => { const c = m.clone(`${m.name}-g`, null); c.setEnabled(true); c.parent = null; c.position.copyFrom(m.position); c.rotationQuaternion = null; c.rotation.copyFrom(m.rotation); c.scaling.copyFrom(m.scaling); return c; });
    const ghostMesh = BAB.Mesh.MergeMeshes(copies, true, true, undefined, false, false);
    const ghost = new BAB.TransformNode(`ghost-${part.id}`, scene); ghost.parent = anchor;
    ghostMesh.parent = ghost; ghostMesh.material = holo; ghostMesh.isPickable = true;
    figureParts.set(part.id, { ghost, solid, anchor });
    if (shadowGen) for (const m of solid.getChildMeshes()) shadowGen.addShadowCaster(m);
  }
  // soft portrait light in front of the face, affecting only this statue
  const portrait = new BAB.PointLight(`portrait-${set.id}`, new BAB.Vector3(0.35, 5.0, 2.4), scene);
  portrait.parent = facing; portrait.diffuse = c3('#fff2e8'); portrait.specular = c3('#fff6f0'); portrait.intensity = 3.2; portrait.range = 8;
  for (const { ghost, solid } of figureParts.values()) portrait.includedOnlyMeshes.push(...solid.getChildMeshes(), ...ghost.getChildMeshes());
  const finish = BAB.MeshBuilder.CreateTorus('finish', { diameter: 2.3, thickness: 0.07, tessellation: 56 }, scene);
  finish.parent = group; finish.position.y = 5.7; finish.material = glowMat(scene, 'finishHalo', '#ffd98a', { intensity: 1.25 }); finish.setEnabled(false); finish.isPickable = false;
  const selection = BAB.MeshBuilder.CreateTorus('selection', { diameter: 5.1, thickness: 0.14, tessellation: 48 }, scene);
  selection.parent = group; selection.position.y = 0.06; selection.material = glowMat(scene, 'selection', '#e0a040', { intensity: 1.2 }); selection.setEnabled(false); selection.isPickable = false;

  // a few golden motes rise once the statue is being restored
  const motes = new BAB.ParticleSystem(`motes-${set.id}`, 60, scene);
  motes.particleTexture = starTexture(scene); motes.emitter = group.position.clone().add(new BAB.Vector3(0, 0.8, 0));
  motes.minEmitBox = new BAB.Vector3(-1.6, 0, -1.6); motes.maxEmitBox = new BAB.Vector3(1.6, 0.2, 1.6);
  motes.color1 = new BAB.Color4(1, 0.86, 0.55, 0.9); motes.color2 = c3(set.color).toColor4(0.8); motes.colorDead = new BAB.Color4(1, 1, 1, 0);
  motes.minSize = 0.06; motes.maxSize = 0.16; motes.minLifeTime = 2.4; motes.maxLifeTime = 4.4; motes.emitRate = 0;
  motes.direction1 = new BAB.Vector3(-0.1, 1, -0.1); motes.direction2 = new BAB.Vector3(0.1, 1.4, 0.1);
  motes.minEmitPower = 0.35; motes.maxEmitPower = 0.8; motes.blendMode = BAB.ParticleSystem.BLENDMODE_STANDARD; motes.updateSpeed = 0.016;
  motes.start();

  for (const m of group.getChildMeshes(false)) m.isPickable = false;
  for (const m of [base, trim, top, topGlow, ...figure.getChildMeshes()]) { m.isPickable = true; m.metadata = { ...(m.metadata || {}), podiumSet: set.id }; }
  if (shadowGen) { shadowGen.addShadowCaster(base); shadowGen.addShadowCaster(top); }
  const face = () => { // statues on the sides look across the aisle and a little toward the entrance
    const x = group.position.x; const dir = Math.abs(x) < 4 ? [0, 1] : [-Math.sign(x), 0.45];
    facing.rotation.y = Math.atan2(dir[0], dir[1]);
  };
  face();
  return { group, facing, face, figure, figureParts, poseTurn: pose.turn, finished: finish, selection, motes, label: { setText: label.setText }, labelMesh: label.mesh };
}
