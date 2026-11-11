// Babylon.js world dressing: exhibition hall, restoration annex, podiums, fragment pedestals, labels, particles.
import { PARTS, getSet } from './logic.mjs';
import { buildStatuePart, PART_OFFSET } from './statues.js';
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
function gridTexture(scene) {
  const t = new (B().DynamicTexture)('grid', 512, scene, true);
  const ctx = t.getContext();
  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, '#171630'); g.addColorStop(1, '#131a33');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  // soft marble veins
  ctx.globalAlpha = 0.06; ctx.strokeStyle = '#d9e6ff'; ctx.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) { ctx.beginPath(); ctx.moveTo(Math.random() * 512, 0); ctx.bezierCurveTo(Math.random() * 512, 170, Math.random() * 512, 340, Math.random() * 512, 512); ctx.stroke(); }
  ctx.globalAlpha = 1;
  for (let i = 0; i <= 512; i += 128) {
    ctx.strokeStyle = 'rgba(170,230,245,.95)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }
  for (let i = 64; i < 512; i += 128) {
    ctx.strokeStyle = 'rgba(255,170,215,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }
  t.update(true); t.anisotropicFilteringLevel = 8;
  t.wrapU = B().Texture.WRAP_ADDRESSMODE; t.wrapV = B().Texture.WRAP_ADDRESSMODE;
  return t;
}
function glowDiscTexture(scene) {
  const store = cache(scene);
  if (store.has('discGlow')) return store.get('discGlow');
  const t = new (B().DynamicTexture)('discGlow', 256, scene, true);
  const ctx = t.getContext();
  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
  g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.45, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  t.hasAlpha = true; t.update(true);
  store.set('discGlow', t); return t;
}

// ---------- billboard labels ----------
function paintLabel(tex, text, color) {
  const ctx = tex.getContext(); const w = 768; const h = 192;
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createLinearGradient(0, 34, 0, h - 34);
  bg.addColorStop(0, 'rgba(26,22,52,.88)'); bg.addColorStop(1, 'rgba(10,14,34,.88)');
  ctx.fillStyle = bg; roundRect(ctx, 20, 34, w - 40, h - 68, 40); ctx.fill();
  ctx.strokeStyle = color; ctx.globalAlpha = 0.9; ctx.lineWidth = 4; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.shadowColor = color; ctx.shadowBlur = 14;
  ctx.fillStyle = '#f7fbff'; ctx.font = '800 46px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 1);
  ctx.shadowBlur = 0;
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
  return { mesh: plane, setText: (next) => paintLabel(tex, next, color) };
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

// ---------- the hall and the annex ----------
export function buildWorld(scene, shadowGen) {
  const BAB = B();
  const root = new BAB.TransformNode('world', scene);
  const grid = gridTexture(scene);

  const floorMat = new BAB.PBRMaterial('hallFloor', scene);
  grid.uScale = 7.5; grid.vScale = 7.5;
  floorMat.albedoTexture = grid; floorMat.metallic = 0.0; floorMat.roughness = 0.72;
  floorMat.environmentIntensity = 0.12; floorMat.albedoColor = new BAB.Color3(0.3, 0.3, 0.36);
  floorMat.emissiveColor = new BAB.Color3(0.02, 0.02, 0.04);
  const hall = BAB.MeshBuilder.CreateGround('hall', { width: 150, height: 150 }, scene);
  hall.position.y = -0.06; hall.material = floorMat; hall.parent = root; hall.isPickable = false; hall.receiveShadows = true;

  // Annex floor: polished, with a soft mirror of the statues.
  const annexMat = new BAB.StandardMaterial('annexFloor', scene);
  annexMat.diffuseTexture = grid.clone(); annexMat.diffuseTexture.wrapU = annexMat.diffuseTexture.wrapV = BAB.Texture.WRAP_ADDRESSMODE; annexMat.diffuseTexture.uScale = 6; annexMat.diffuseTexture.vScale = 3;
  annexMat.specularColor = new BAB.Color3(0.1, 0.1, 0.16); annexMat.specularPower = 110; annexMat.diffuseColor = new BAB.Color3(0.32, 0.32, 0.38);
  annexMat.emissiveColor = new BAB.Color3(0.02, 0.02, 0.04);
  const annex = BAB.MeshBuilder.CreateGround('annex', { width: 116, height: 60 }, scene);
  annex.position.set(0, -0.055, -115.5); annex.material = annexMat; annex.parent = root; annex.isPickable = false; annex.receiveShadows = true;
  const corridor = BAB.MeshBuilder.CreateGround('corridor', { width: 22, height: 12 }, scene);
  corridor.position.set(0, -0.05, -80.5); corridor.material = floorMat; corridor.parent = root; corridor.isPickable = false;

  const wallMat = pbrMat(scene, 'wall', '#2b2a4a', { metallic: 0.15, roughness: 0.55 });
  const annexWallMat = pbrMat(scene, 'annexWall', '#2f2a52', { metallic: 0.15, roughness: 0.5 });
  const pillarMat = pbrMat(scene, 'pillar', '#363656', { metallic: 0.4, roughness: 0.38 });
  const metalMat = pbrMat(scene, 'metal', '#5c6283', { metallic: 0.8, roughness: 0.3 });
  const trimCyan = glowMat(scene, 'trimCyan', '#6be8ee', { intensity: 1.15 });
  const trimPink = glowMat(scene, 'trimPink', '#ff8cc6', { intensity: 1.1 });
  const lampMat = glowMat(scene, 'lamp', '#ffd9a0', { intensity: 1.3 });

  const walls = new Batch(scene, root);
  const wall = (x, z, sx, sz, mat = wallMat) => walls.box(mat, x, 5, z, sx, 10, sz);
  wall(-75, 0, 2, 150); wall(75, 0, 2, 150); wall(0, 75, 150, 2);
  wall(-43.5, -75, 63, 2); wall(43.5, -75, 63, 2);
  wall(-58, -115.5, 2, 60, annexWallMat); wall(58, -115.5, 2, 60, annexWallMat); wall(0, -145, 116, 2, annexWallMat);
  // wainscot rails + glowing baseboards
  for (const x of [-74, 74]) { walls.box(trimCyan, x * 0.9997, 2.9, 0, 0.14, 0.14, 145); walls.box(trimPink, x * 0.9997, 7.6, 0, 0.14, 0.14, 145); }
  walls.box(trimCyan, 0, 2.9, 74, 145, 0.14, 0.14); walls.box(trimPink, 0, 7.6, 74, 145, 0.14, 0.14);
  for (const x of [-57.6, 57.6]) { walls.box(trimCyan, x, 3.1, -115, 0.12, 0.12, 58); walls.box(trimPink, x, 7.4, -115, 0.12, 0.12, 58); }
  walls.box(trimCyan, 0, 3.1, -143.9, 114, 0.12, 0.12); walls.box(trimPink, 0, 7.4, -143.9, 114, 0.12, 0.12);

  // ceilings
  const ceilMat = new BAB.StandardMaterial('ceil', scene);
  ceilMat.emissiveColor = new BAB.Color3(0.2, 0.17, 0.32); ceilMat.disableLighting = true; ceilMat.backFaceCulling = false;
  const ceil = BAB.MeshBuilder.CreateGround('hallCeil', { width: 149, height: 149 }, scene);
  ceil.position.y = 9.78; ceil.rotation.x = Math.PI; ceil.material = ceilMat; ceil.parent = root; ceil.isPickable = false;
  const ceilA = BAB.MeshBuilder.CreateGround('annexCeil', { width: 115, height: 59 }, scene);
  ceilA.position.set(0, 9.78, -115.5); ceilA.rotation.x = Math.PI; ceilA.material = ceilMat; ceilA.parent = root; ceilA.isPickable = false;

  // ceiling ribs + lamp panels
  for (let z = -66; z <= 66; z += 22) {
    walls.box(metalMat, 0, 9.55, z, 148, 0.14, 0.24);
    for (const x of [-47, -23, 0, 23, 47]) walls.box(lampMat, x, 9.42, z, 3.6, 0.16, 0.4);
  }
  for (const z of [-91, -115, -139]) {
    walls.box(metalMat, 0, 9.6, z, 112, 0.15, 0.28);
    for (const x of [-40, -14, 14, 40]) walls.box(lampMat, x, 9.46, z, 3.2, 0.14, 0.36);
  }

  // pillars with glowing inlays and floating lantern orbs
  for (const z of [-61, -38, -15, 8, 31, 54]) {
    for (const x of [-68, 68]) {
      walls.cyl(pillarMat, x, 4.75, z, 9.5, 1.7, 2.0, 20);
      walls.box(trimCyan, x + (x < 0 ? 1.04 : -1.04), 4.8, z, 0.08, 8.2, 0.14);
      walls.cyl(metalMat, x, 0.25, z, 0.5, 3.0, 3.3, 20);
      walls.cyl(metalMat, x, 9.2, z, 0.3, 2.9, 2.5, 20);
      walls.sphere(trimPink, x + (x < 0 ? 3.1 : -3.1), 5.2, z, 0.8, 14);
    }
  }
  // portal arch between hall and annex
  const archMat = glowMat(scene, 'arch', '#8af2f5', { intensity: 1.45 });
  const archSoft = glowMat(scene, 'archSoft', '#ff9ccf', { intensity: 1.15 });
  for (const x of [-11.5, 11.5]) walls.box(archMat, x, 2.9, -74.7, 0.36, 5.8, 0.42);
  walls.box(archMat, 0, 5.75, -74.7, 23.5, 0.32, 0.5);
  for (const x of [-8, 8]) walls.box(archSoft, x, 2.6, -85.9, 0.32, 5.2, 0.34);
  walls.box(archSoft, 0, 5.2, -85.9, 16.3, 0.3, 0.38);
  // floor inlays
  walls.torus(glowMat(scene, 'ringA', '#5ab8d4', { intensity: 0.75 }), 0, 0.015, 0, 18, 0.15, 90);
  walls.torus(glowMat(scene, 'ringB', '#5ab8d4', { intensity: 0.65 }), 0, 0.012, -116, 28, 0.13, 90);
  walls.torus(glowMat(scene, 'ringC', '#ff9ccf', { intensity: 0.6 }), 0, 0.012, -116, 34, 0.09, 90);
  for (const x of [-3, 0, 3]) walls.box(archMat, x, 0.005, -80.5, 0.08, 0.025, 9);
  walls.finish();

  return { root, annexFloor: annexMat, hall, annex, ceilings: [ceil, ceilA] };
}

// ---------- fragment pedestal ----------
export function buildFragment(scene, kit, fragment) {
  const BAB = B();
  const set = getSet(fragment.setId);
  const root = new BAB.TransformNode(`frag-${fragment.key}`, scene);
  root.position.set(fragment.x, 1.18, fragment.z);
  const spin = new BAB.TransformNode('spin', scene); spin.parent = root; spin.scaling.setAll(0.53);
  const part = buildStatuePart(kit, scene, fragment.partId, fragment.setId, false);
  part.parent = spin;

  const plate = BAB.MeshBuilder.CreateTorus('plate', { diameter: 1.66, thickness: 0.09, tessellation: 40 }, scene);
  plate.parent = root; plate.position.y = 0.04;
  const plateMat = new BAB.StandardMaterial(`plate-${fragment.key}`, scene);
  plateMat.disableLighting = true; plateMat.emissiveColor = c3(set.color).scale(1.1); plateMat.alpha = 0.26; plate.material = plateMat; plate.isPickable = false;
  const core = BAB.MeshBuilder.CreateDisc('core', { radius: 0.74, tessellation: 40 }, scene);
  core.parent = root; core.position.y = 0.026; core.rotation.x = Math.PI / 2; core.isPickable = false;
  core.material = glowMat(scene, `core-${set.id}`, set.color, { intensity: 0.28, alpha: 0.35 });
  const beam = BAB.MeshBuilder.CreateCylinder('beam', { height: 3.3, diameterTop: 0.18, diameterBottom: 1.16, tessellation: 20, cap: BAB.Mesh.NO_CAP }, scene);
  beam.parent = root; beam.position.y = 1.77; beam.setEnabled(false); beam.isPickable = false;
  beam.material = glowMat(scene, `beam-${set.id}`, set.color, { intensity: 1, alpha: 0.13, additive: true });
  const glow = BAB.MeshBuilder.CreateGround('floorGlow', { width: 3.6, height: 3.6 }, scene);
  glow.parent = root; glow.position.y = -1.16; glow.isPickable = false;
  const glowM = new BAB.StandardMaterial(`fg-${set.id}`, scene);
  glowM.disableLighting = true; glowM.emissiveColor = c3(set.color); glowM.opacityTexture = glowDiscTexture(scene); glowM.alpha = 0.26; glowM.alphaMode = BAB.Engine.ALPHA_ADD; glowM.backFaceCulling = false;
  glow.material = glowM;
  const label = makeLabel(scene, `${set.name} · ${fragment.partId.toUpperCase()}`, set.color, 5.2, 1.3);
  label.mesh.parent = root; label.mesh.position.y = 2.55;
  return { root, spin, beacon: beam, ring: plate, ringMat: plateMat, floorGlow: glow, baseY: 1.18, phase: fragment.index * 1.37 + fragment.x * 0.13 };
}

// ---------- podium ----------
export function buildPodium(scene, kit, set, position, shadowGen) {
  const BAB = B();
  const group = new BAB.TransformNode(`podium-${set.id}`, scene);
  group.position.set(position[0], 0, position[1]);
  const solidBase = pbrMat(scene, 'podBase', '#2f2e4d', { metallic: 0.7, roughness: 0.28 });
  const topMat = pbrMat(scene, 'podTop', '#3c3b60', { metallic: 0.55, roughness: 0.22 });
  const trimMat = glowMat(scene, `podTrim-${set.id}`, set.color, { intensity: 1.2 });

  const base = BAB.MeshBuilder.CreateCylinder('base', { height: 0.45, diameterTop: 4.1, diameterBottom: 4.56, tessellation: 8 }, scene);
  base.parent = group; base.position.y = 0.225; base.material = solidBase;
  const trim = BAB.MeshBuilder.CreateCylinder('trim', { height: 0.08, diameter: 4.34, tessellation: 8 }, scene);
  trim.parent = group; trim.position.y = 0.47; trim.material = trimMat;
  const top = BAB.MeshBuilder.CreateCylinder('top', { height: 0.26, diameterTop: 3.8, diameterBottom: 4.1, tessellation: 8 }, scene);
  top.parent = group; top.position.y = 0.62; top.material = topMat;
  const topGlow = BAB.MeshBuilder.CreateTorus('topGlow', { diameter: 3.3, thickness: 0.11, tessellation: 56 }, scene);
  topGlow.parent = group; topGlow.position.y = 0.76; topGlow.material = trimMat;
  const floorGlow = BAB.MeshBuilder.CreateGround('podGlow', { width: 9, height: 9 }, scene);
  floorGlow.parent = group; floorGlow.position.y = 0.02;
  const fgm = new BAB.StandardMaterial(`pg-${set.id}`, scene);
  fgm.disableLighting = true; fgm.emissiveColor = c3(set.color); fgm.opacityTexture = glowDiscTexture(scene); fgm.alpha = 0.4; fgm.alphaMode = BAB.Engine.ALPHA_ADD; fgm.backFaceCulling = false;
  floorGlow.material = fgm;
  // soft volumetric spotlight cone
  const cone = BAB.MeshBuilder.CreateCylinder('cone', { height: 9, diameterTop: 1.2, diameterBottom: 6.2, tessellation: 32, cap: BAB.Mesh.NO_CAP }, scene);
  cone.parent = group; cone.position.y = 5.2; cone.isPickable = false;
  cone.material = glowMat(scene, `cone-${set.id}`, set.color, { intensity: 0.9, alpha: 0.04, additive: true });

  const label = makeLabel(scene, set.name, set.color, 5.8, 1.45);
  label.mesh.parent = group; label.mesh.position.y = 6.3;

  const figure = new BAB.TransformNode('figure', scene); figure.parent = group; figure.position.y = 0.74;
  const pose = STATUE_POSES[set.id];
  figure.rotation.y = pose.turn;
  const figureParts = new Map();
  for (const part of PARTS) {
    const anchor = new BAB.TransformNode(`anchor-${part.id}`, scene); anchor.parent = figure; anchor.position.set(...PART_OFFSET[part.id]);
    if (part.id === 'head' && pose.head) anchor.rotation.set(...pose.head); // arms are posed in their geometry
    const ghost = buildStatuePart(kit, scene, part.id, set.id, true); ghost.parent = anchor;
    const solid = buildStatuePart(kit, scene, part.id, set.id, false); solid.parent = anchor; solid.setEnabled(false);
    figureParts.set(part.id, { ghost, solid, anchor });
    if (shadowGen) for (const m of solid.getChildMeshes()) shadowGen.addShadowCaster(m);
  }
  const finish = BAB.MeshBuilder.CreateTorus('finish', { diameter: 2.5, thickness: 0.1, tessellation: 56 }, scene);
  finish.parent = group; finish.position.y = 5.4; finish.material = glowMat(scene, `finish-${set.id}`, set.color, { intensity: 1.6 }); finish.setEnabled(false); finish.isPickable = false;
  const selection = BAB.MeshBuilder.CreateTorus('selection', { diameter: 5.1, thickness: 0.12, tessellation: 48 }, scene);
  selection.parent = group; selection.position.y = 0.06; selection.material = glowMat(scene, 'selection', '#a9fff4', { intensity: 1.5 }); selection.setEnabled(false); selection.isPickable = false;

  // rising motes
  const motes = new BAB.ParticleSystem(`motes-${set.id}`, 90, scene);
  motes.particleTexture = starTexture(scene); motes.emitter = group.position.clone().add(new BAB.Vector3(0, 0.8, 0));
  motes.minEmitBox = new BAB.Vector3(-1.6, 0, -1.6); motes.maxEmitBox = new BAB.Vector3(1.6, 0.2, 1.6);
  motes.color1 = c3(set.color).toColor4(0.9); motes.color2 = new BAB.Color4(1, 1, 1, 0.8); motes.colorDead = new BAB.Color4(1, 1, 1, 0);
  motes.minSize = 0.07; motes.maxSize = 0.2; motes.minLifeTime = 2.4; motes.maxLifeTime = 4.4; motes.emitRate = 7;
  motes.direction1 = new BAB.Vector3(-0.1, 1, -0.1); motes.direction2 = new BAB.Vector3(0.1, 1.4, 0.1);
  motes.minEmitPower = 0.35; motes.maxEmitPower = 0.8; motes.blendMode = BAB.ParticleSystem.BLENDMODE_ADD; motes.updateSpeed = 0.016;
  motes.start();

  const meshes = group.getChildMeshes(false).filter((m) => m !== floorGlow && m !== cone);
  for (const m of group.getChildMeshes(false)) { m.isPickable = false; }
  for (const m of [base, trim, top, topGlow, ...figure.getChildMeshes()]) { m.isPickable = true; m.metadata = { ...(m.metadata || {}), podiumSet: set.id }; }
  void meshes;
  if (shadowGen) { shadowGen.addShadowCaster(base); shadowGen.addShadowCaster(top); }
  return {
    group, figure, figureParts, poseTurn: pose.turn, finished: finish, selection, motes, floorGlow: fgm, cone,
    label: { setText: label.setText },
  };
}
