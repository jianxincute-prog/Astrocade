// Babylon.js statue kit: every waifu body part is sculpted from smooth PBR primitives, then merged
// into a handful of meshes (one per material) so 15 fragments + 3 podium figures stay cheap on phones.
// Local space of every part: +Y up, +Z is the front of the figure.
import { getSet } from './logic.mjs';

const B = () => window.BABYLON;
const hex = (value) => B().Color3.FromHexString(value);

// Richer palettes layered over the gameplay colours in logic.mjs (which still drive HUD + gameplay).
export const STYLE = {
  office01: {
    hair: '#4b2f6b', hairTip: '#a77be0', eye: '#5aa7ff', eyeDeep: '#1d3f8f', cloth: '#ebeff8', suit: '#3a56b0', suitDark: '#26397f',
    accent: '#76d8ff', skin: '#ffd9c7', shoe: '#1c2340', stock: '#2a2f4f', gold: '#e9d9a6', lip: '#e98aa0', blush: '#ff9fb4',
  },
  nurse01: {
    hair: '#f08fbb', hairTip: '#ffd3e6', eye: '#ff6aa8', eyeDeep: '#a52a68', cloth: '#f2ecf0', suit: '#ffb7d3', suitDark: '#ff8fbd',
    accent: '#ff83bf', skin: '#ffdccd', shoe: '#ffe2ee', stock: '#fff4f8', gold: '#ffd6e8', lip: '#f26f9a', blush: '#ff8fb0',
  },
  ceo01: {
    hair: '#3a2640', hairTip: '#9a4f80', eye: '#f3b447', eyeDeep: '#8f4b0e', cloth: '#efe8df', suit: '#3b4670', suitDark: '#222a48',
    accent: '#f0c66f', skin: '#ffd5bd', shoe: '#14121c', stock: '#1a1824', gold: '#f2c35f', lip: '#c8405f', blush: '#f08a8f',
  },
};

export function createStatueKit(scene) {
  const BAB = B();
  const mats = new Map();
  const faceTextures = new Map();

  const pbr = (key, build) => {
    if (mats.has(key)) return mats.get(key);
    const m = new BAB.PBRMaterial(key, scene);
    m.metallic = 0; m.roughness = 0.6;
    build(m);
    mats.set(key, m);
    return m;
  };

  function materialFor(setId, kind) {
    const s = STYLE[setId];
    const key = `${setId}:${kind}`;
    switch (kind) {
      case 'skin': return pbr(key, (m) => {
        m.albedoColor = hex(s.skin); m.roughness = 0.46; m.metallic = 0;
        m.emissiveColor = hex(s.skin).scale(0.13);
        m.sheen.isEnabled = true; m.sheen.intensity = 0.35; m.sheen.color = hex('#ffc9d4');
      });
      case 'face': return pbr(key, (m) => {
        m.albedoTexture = faceTexture(setId); m.roughness = 0.5;
        m.emissiveTexture = faceTexture(setId); m.emissiveColor = hex('#ffffff').scale(0.2);
        m.sheen.isEnabled = true; m.sheen.intensity = 0.3; m.sheen.color = hex('#ffc9d4');
      });
      case 'hair': return pbr(key, (m) => {
        m.albedoColor = hex(s.hair); m.roughness = 0.38; m.metallic = 0.08;
        m.clearCoat.isEnabled = true; m.clearCoat.intensity = 0.75; m.clearCoat.roughness = 0.12;
        m.emissiveColor = hex(s.hair).scale(0.1);
      });
      case 'hairTip': return pbr(key, (m) => {
        m.albedoColor = hex(s.hairTip); m.roughness = 0.34; m.metallic = 0.06;
        m.clearCoat.isEnabled = true; m.clearCoat.intensity = 0.8; m.clearCoat.roughness = 0.1;
        m.emissiveColor = hex(s.hairTip).scale(0.12);
      });
      case 'cloth': return pbr(key, (m) => {
        m.albedoColor = hex(s.cloth); m.roughness = 0.62;
        m.sheen.isEnabled = true; m.sheen.intensity = 0.28; m.sheen.color = hex('#ffffff');
      });
      case 'suit': return pbr(key, (m) => {
        m.albedoColor = hex(s.suit); m.roughness = 0.58;
        m.sheen.isEnabled = true; m.sheen.intensity = 0.5; m.sheen.color = hex(s.accent);
      });
      case 'suitDark': return pbr(key, (m) => { m.albedoColor = hex(s.suitDark); m.roughness = 0.55; m.sheen.isEnabled = true; m.sheen.intensity = 0.35; m.sheen.color = hex(s.accent); });
      case 'accent': return pbr(key, (m) => {
        m.albedoColor = hex(s.accent); m.roughness = 0.35; m.metallic = 0.1;
        m.emissiveColor = hex(s.accent).scale(0.38);
      });
      case 'gold': return pbr(key, (m) => {
        m.albedoColor = hex(s.gold); m.metallic = 1; m.roughness = 0.2;
        m.emissiveColor = hex(s.gold).scale(0.12);
      });
      case 'shoe': return pbr(key, (m) => {
        m.albedoColor = hex(s.shoe); m.roughness = 0.2; m.metallic = 0.1;
        m.clearCoat.isEnabled = true; m.clearCoat.intensity = 0.9; m.clearCoat.roughness = 0.06;
      });
      case 'stock': return pbr(key, (m) => {
        m.albedoColor = hex(s.stock); m.roughness = 0.45;
        m.sheen.isEnabled = true; m.sheen.intensity = 0.8; m.sheen.color = hex('#ffffff');
      });
      case 'lens': return pbr(key, (m) => {
        m.albedoColor = hex('#cfeaff'); m.alpha = 0.16; m.roughness = 0.05; m.metallic = 0;
        m.emissiveColor = hex('#8fd2ff').scale(0.25);
      });
      case 'glow': return pbr(key, (m) => {
        m.albedoColor = hex('#ffffff'); m.emissiveColor = hex(s.accent); m.roughness = 0.4;
      });
      default: throw new Error(`Unknown statue material ${kind}`);
    }
  }

  function holoMaterial(setId) {
    const key = `${setId}:holo`;
    if (mats.has(key)) return mats.get(key);
    const set = getSet(setId);
    const m = new BAB.StandardMaterial(key, scene);
    const c = hex(set.color);
    m.disableLighting = true;
    m.emissiveColor = c.scale(0.7);
    m.alpha = 0.5;
    m.alphaMode = BAB.Engine.ALPHA_ADD;
    m.backFaceCulling = false;
    m.needDepthPrePass = true;
    m.emissiveFresnelParameters = new BAB.FresnelParameters({ bias: 0.18, power: 1.7, leftColor: c.scale(1.7), rightColor: c.scale(0.4) });
    m.opacityFresnelParameters = new BAB.FresnelParameters({ bias: 0.1, power: 1.5, leftColor: BAB.Color3.White(), rightColor: new BAB.Color3(0.18, 0.18, 0.18) });
    mats.set(key, m);
    return m;
  }

  function faceTexture(setId) {
    if (faceTextures.has(setId)) return faceTextures.get(setId);
    const tex = new BAB.DynamicTexture(`face-${setId}`, { width: 1024, height: 512 }, scene, true);
    drawFace(tex.getContext(), 1024, 512, setId);
    tex.update(true);
    tex.anisotropicFilteringLevel = 4;
    faceTextures.set(setId, tex);
    return tex;
  }

  return {
    materialFor,
    holoMaterial,
    dispose() { for (const m of mats.values()) m.dispose(); for (const t of faceTextures.values()) t.dispose(); mats.clear(); faceTextures.clear(); },
  };
}

// --- Face painting (equirectangular map wrapped on the head ellipsoid; the front sits at FACE_U) ---------------
export const FACE_U = 0.75;
function drawFace(ctx, w, h, setId) {
  const s = STYLE[setId];
  const set = getSet(setId);
  ctx.save(); ctx.translate(0, h); ctx.scale(1, -1); // Babylon's sphere v runs bottom-to-top
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, shade(s.skin, -6)); grad.addColorStop(0.45, s.skin); grad.addColorStop(1, shade(s.skin, -10));
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  const cx = w * FACE_U;
  const ey = 296;
  const gap = setId === 'ceo01' ? 60 : 56;
  const look = { office01: { rx: 33, ry: 42, tilt: 0.0, flick: 12 }, nurse01: { rx: 37, ry: 47, tilt: -0.02, flick: 8 }, ceo01: { rx: 33, ry: 39, tilt: 0.1, flick: 17 } }[setId];

  // Cheek blush
  for (const side of [-1, 1]) {
    const bx = cx + side * (gap + 14), by = ey + 48;
    const g = ctx.createRadialGradient(bx, by, 2, bx, by, 46);
    g.addColorStop(0, hexA(s.blush, 0.62)); g.addColorStop(1, hexA(s.blush, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx, by, 50, 32, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Brows
  ctx.strokeStyle = hexA(s.hair, 0.85); ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const ex = cx + side * gap, by = ey - look.ry - 22;
    ctx.beginPath(); ctx.moveTo(ex - side * 26, by + 6);
    ctx.quadraticCurveTo(ex, by - 9, ex + side * 32, by + 6 - (setId === 'ceo01' ? 8 : 0)); ctx.stroke();
  }
  // Eyes
  for (const side of [-1, 1]) {
    const ex = cx + side * gap;
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(look.tilt * side);
    // eye white with a soft lid shadow
    ctx.fillStyle = '#fffafc';
    ctx.beginPath(); ctx.ellipse(0, 0, look.rx + 5, look.ry + 3, 0, 0, Math.PI * 2); ctx.fill();
    const lid = ctx.createLinearGradient(0, -look.ry, 0, -look.ry + 26);
    lid.addColorStop(0, 'rgba(120,80,110,.38)'); lid.addColorStop(1, 'rgba(120,80,110,0)');
    ctx.fillStyle = lid; ctx.beginPath(); ctx.ellipse(0, 0, look.rx + 5, look.ry + 3, 0, 0, Math.PI * 2); ctx.fill();
    // iris
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 4, look.rx, look.ry, 0, 0, Math.PI * 2); ctx.clip();
    const ig = ctx.createLinearGradient(0, -look.ry, 0, look.ry + 4);
    ig.addColorStop(0, s.eyeDeep); ig.addColorStop(0.45, s.eye); ig.addColorStop(1, shade(s.eye, 70));
    ctx.fillStyle = ig; ctx.fillRect(-look.rx - 2, -look.ry - 2, look.rx * 2 + 4, look.ry * 2 + 10);
    // radial iris glow + ring
    const rg = ctx.createRadialGradient(0, 14, 4, 0, 14, look.rx + 6);
    rg.addColorStop(0, 'rgba(255,255,255,.55)'); rg.addColorStop(0.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(-look.rx, -look.ry, look.rx * 2, look.ry * 2 + 12);
    ctx.lineWidth = 4; ctx.strokeStyle = hexA(s.eyeDeep, 0.9); ctx.beginPath(); ctx.ellipse(0, 4, look.rx - 1, look.ry - 1, 0, 0, Math.PI * 2); ctx.stroke();
    // pupil
    ctx.fillStyle = '#1a1226'; ctx.beginPath(); ctx.ellipse(0, 3, look.rx * 0.38, look.ry * 0.46, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // glints
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-look.rx * 0.34, -look.ry * 0.38, 9, 11, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(look.rx * 0.38, look.ry * 0.38, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(look.rx * 0.1, look.ry * 0.62, 2.6, 0, Math.PI * 2); ctx.fill();
    // lashes
    ctx.strokeStyle = '#2b1a2f'; ctx.lineCap = 'round'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(0, 0, look.rx + 5, look.ry + 3, 0, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(side * (look.rx + 3), -look.ry * 0.45); ctx.quadraticCurveTo(side * (look.rx + 14), -look.ry * 0.6, side * (look.rx + look.flick + 6), -look.ry * 0.95); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = hexA('#2b1a2f', 0.6);
    ctx.beginPath(); ctx.ellipse(0, 0, look.rx + 4, look.ry + 3, 0, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
    ctx.restore();
  }
  // Nose hint
  ctx.fillStyle = hexA('#b86f6a', 0.5); ctx.beginPath(); ctx.ellipse(cx, ey + 72, 5, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  // Mouth
  const my = ey + 98;
  ctx.lineCap = 'round';
  if (setId === 'nurse01') {
    ctx.fillStyle = '#9a2b4e'; ctx.beginPath(); ctx.moveTo(cx - 17, my - 3); ctx.quadraticCurveTo(cx, my + 24, cx + 17, my - 3); ctx.quadraticCurveTo(cx, my + 3, cx - 17, my - 3); ctx.fill();
    ctx.fillStyle = '#ff9fb8'; ctx.beginPath(); ctx.ellipse(cx, my + 11, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  } else if (setId === 'ceo01') {
    ctx.strokeStyle = s.lip; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 18, my); ctx.quadraticCurveTo(cx + 2, my + 9, cx + 20, my - 6); ctx.stroke();
  } else {
    ctx.strokeStyle = s.lip; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(cx - 17, my - 2); ctx.quadraticCurveTo(cx, my + 14, cx + 17, my - 2); ctx.stroke();
  }
  ctx.restore();
  void set; void ey;
}
function shade(color, amount) {
  const n = parseInt(color.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount)), b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r},${g},${b})`;
}
function hexA(color, alpha) {
  const n = parseInt(color.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// --- Geometry builder ------------------------------------------------------------------------------------------
class Sculptor {
  constructor(kit, scene, setId, ghost) {
    this.kit = kit; this.scene = scene; this.setId = setId; this.ghost = ghost; this.groups = new Map();
  }
  add(mesh, kind, pos = [0, 0, 0], rot = [0, 0, 0]) {
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    const key = this.ghost ? 'holo' : kind;
    if (!this.groups.has(key)) this.groups.set(key, []);
    this.groups.get(key).push(mesh);
    return mesh;
  }
  // Ellipsoid (diameters) – used for nearly everything organic.
  ell(kind, pos, dia, rot, seg = 22) {
    return this.add(B().MeshBuilder.CreateSphere('e', { diameterX: dia[0], diameterY: dia[1], diameterZ: dia[2], segments: seg }, this.scene), kind, pos, rot);
  }
  cyl(kind, pos, h, dTop, dBot, rot, tess = 28) {
    return this.add(B().MeshBuilder.CreateCylinder('c', { height: h, diameterTop: dTop, diameterBottom: dBot, tessellation: tess }, this.scene), kind, pos, rot);
  }
  caps(kind, pos, r, h, rot) {
    return this.add(B().MeshBuilder.CreateCapsule('k', { radius: r, height: h, tessellation: 20, capSubdivisions: 6, subdivisions: 2 }, this.scene), kind, pos, rot);
  }
  box(kind, pos, size, rot) {
    return this.add(B().MeshBuilder.CreateBox('b', { width: size[0], height: size[1], depth: size[2] }, this.scene), kind, pos, rot);
  }
  torus(kind, pos, dia, thick, rot, tess = 36) {
    return this.add(B().MeshBuilder.CreateTorus('t', { diameter: dia, thickness: thick, tessellation: tess }, this.scene), kind, pos, rot);
  }
  // Smooth, tapered strand through control points (hair locks, tails, ties).
  strand(kind, points, r0, r1, tess = 12, samples = 26) {
    const BAB = B();
    const curve = BAB.Curve3.CreateCatmullRomSpline(points.map((p) => new BAB.Vector3(p[0], p[1], p[2])), samples, false).getPoints();
    const last = curve.length - 1;
    const mesh = BAB.MeshBuilder.CreateTube('s', {
      path: curve, tessellation: tess, cap: BAB.Mesh.CAP_ALL,
      radiusFunction: (i) => { const t = i / last; return r0 + (r1 - r0) * Math.pow(t, 0.85) + Math.sin(t * Math.PI) * r0 * 0.12; },
    }, this.scene);
    return this.add(mesh, kind);
  }
  // Merge the collected pieces into one mesh per material.
  build(name) {
    const BAB = B();
    const root = new BAB.TransformNode(name, this.scene);
    for (const [key, meshes] of this.groups) {
      const merged = BAB.Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
      merged.name = `${name}:${key}`;
      merged.material = key === 'holo' ? this.kit.holoMaterial(this.setId) : this.kit.materialFor(this.setId, key);
      merged.isPickable = false;
      merged.parent = root;
      merged.metadata = { kind: key };
    }
    return root;
  }
}

// --- The parts ----------------------------------------------------------------------------------------------------
export function buildStatuePart(kit, scene, partId, setId, ghost = false) {
  const sc = new Sculptor(kit, scene, setId, ghost);
  ({ head: sculptHead, torso: sculptTorso, armL: (s, id) => sculptArm(s, id, -1), armR: (s, id) => sculptArm(s, id, 1), legs: sculptLegs })[partId](sc, setId);
  const part = sc.build(`${setId}-${partId}${ghost ? '-holo' : ''}`);
  if (partId === 'head') part.scaling.setAll(1.14);
  return part;
}

function sculptHead(sc, id) {
  // neck + head with painted anime face
  sc.cyl('skin', [0, -0.5, 0], 0.26, 0.2, 0.24, [0, 0, 0], 20);
  sc.ell('face', [0, 0, 0.0], [0.84, 0.9, 0.78], [0, 0, 0], 40);
  sc.ell('skin', [-0.43, -0.02, -0.02], [0.08, 0.15, 0.1]); // ears
  sc.ell('skin', [0.43, -0.02, -0.02], [0.08, 0.15, 0.1]);

  // --- hair crown & bangs (shared base) ---
  sc.ell('hair', [0, 0.17, -0.07], [0.95, 0.8, 0.9], [0, 0, 0], 28);
  // fringe: smooth tapered locks sweeping down over the forehead
  const fringe = [[-0.33, 0.2], [-0.2, 0.26], [-0.07, 0.3], [0.07, 0.3], [0.2, 0.26], [0.33, 0.2]];
  for (const [x, y] of fringe) {
    const lean = x * 0.5;
    sc.strand('hair', [[x * 0.45, 0.5, 0.12], [x * 0.85, y + 0.17, 0.3], [x * 1.02 + lean * 0.1, y + 0.02, 0.38], [x * 1.1 + lean * 0.3, y - 0.07, 0.385]], 0.085, 0.012, 10, 18);
  }
  sc.strand('hairTip', [[0.0, 0.5, 0.15], [0.02, 0.34, 0.34], [0.07, 0.2, 0.385]], 0.04, 0.008, 8, 14);
  // side locks framing the face
  for (const side of [-1, 1]) {
    sc.strand('hair', [[side * 0.4, 0.1, 0.12], [side * 0.45, -0.1, 0.12], [side * 0.43, -0.34, 0.1], [side * 0.4, -0.58, 0.1]], 0.075, 0.025, 10);
  }

  if (id === 'office01') {
    // back hair + twin tails with ribbons, glasses
    sc.ell('hair', [0, -0.28, -0.3], [0.8, 1.15, 0.42], [0, 0, 0], 22);
    for (const side of [-1, 1]) {
      sc.strand('hair', [[side * 0.4, 0.2, -0.12], [side * 0.62, 0.0, -0.08], [side * 0.7, -0.4, 0.0], [side * 0.64, -0.82, 0.08], [side * 0.55, -1.02, 0.14]], 0.11, 0.015, 12, 34);
      sc.strand('hairTip', [[side * 0.66, -0.55, 0.03], [side * 0.65, -0.78, 0.07], [side * 0.58, -1.0, 0.13]], 0.065, 0.012, 10, 14);
      sc.ell('accent', [side * 0.45, 0.18, -0.1], [0.14, 0.14, 0.14], [0, 0, 0], 14);
      sc.ell('accent', [side * 0.52, 0.2, -0.1], [0.17, 0.11, 0.08], [0, 0, side * 0.5], 12);
      sc.ell('accent', [side * 0.38, 0.14, -0.1], [0.17, 0.11, 0.08], [0, 0, -side * 0.5], 12);
    }
    for (const side of [-1, 1]) {
      sc.torus('gold', [side * 0.145, -0.105, 0.4], 0.26, 0.02, [Math.PI / 2 - 0.08, 0, 0], 40);
      sc.add(B().MeshBuilder.CreateDisc('lens', { radius: 0.12, tessellation: 32, sideOrientation: B().Mesh.DOUBLESIDE }, sc.scene), 'lens', [side * 0.145, -0.105, 0.398], [0, 0, 0]);
    }
    sc.box('gold', [0, -0.085, 0.405], [0.07, 0.016, 0.016]);
    for (const side of [-1, 1]) sc.box('gold', [side * 0.31, -0.09, 0.33], [0.2, 0.016, 0.016], [0, side * 0.9, 0]);
  } else if (id === 'nurse01') {
    // soft pink waves, bun-less long back hair, nurse cap, heart clip
    sc.ell('hair', [0, -0.3, -0.3], [0.88, 1.3, 0.46], [0, 0, 0], 22);
    for (const side of [-1, 1]) {
      sc.strand('hair', [[side * 0.4, 0.05, -0.1], [side * 0.55, -0.3, -0.12], [side * 0.5, -0.65, -0.1], [side * 0.58, -0.95, -0.05]], 0.12, 0.02, 12, 30);
      sc.strand('hairTip', [[side * 0.5, -0.65, -0.1], [side * 0.58, -0.95, -0.05]], 0.07, 0.016, 10, 10);
    }
    // nurse cap
    sc.box('cloth', [0, 0.5, 0.05], [0.56, 0.16, 0.26], [-0.18, 0, 0]);
    sc.box('cloth', [0, 0.47, 0.08], [0.6, 0.06, 0.3], [-0.18, 0, 0]);
    sc.box('accent', [0, 0.54, 0.2], [0.05, 0.12, 0.012], [-0.18, 0, 0]);
    sc.box('accent', [0, 0.54, 0.2], [0.12, 0.05, 0.012], [-0.18, 0, 0]);
    // heart hair clip
    sc.ell('accent', [0.31, 0.16, 0.3], [0.065, 0.065, 0.04], [0, 0, 0], 10);
    sc.ell('accent', [0.35, 0.16, 0.3], [0.065, 0.065, 0.04], [0, 0, 0], 10);
    sc.ell('accent', [0.33, 0.125, 0.3], [0.085, 0.085, 0.04], [0, 0, 0.78], 10);
  } else {
    // CEO: sleek dark hair with a high ponytail, gold clip and hoop earrings
    sc.ell('hair', [0, -0.25, -0.3], [0.78, 1.05, 0.4], [0, 0, 0], 22);
    sc.strand('hair', [[0, 0.5, -0.2], [0, 0.78, -0.42], [0, 0.55, -0.78], [0, 0.0, -0.98], [0.02, -0.55, -0.9], [0.04, -1.0, -0.78]], 0.17, 0.02, 14, 44);
    sc.strand('hairTip', [[0.02, -0.55, -0.9], [0.04, -1.0, -0.78]], 0.1, 0.018, 10, 10);
    sc.torus('gold', [0, 0.55, -0.22], 0.26, 0.05, [0.7, 0, 0], 24);
    for (const side of [-1, 1]) {
      sc.torus('gold', [side * 0.44, -0.2, 0.0], 0.15, 0.018, [0, Math.PI / 2, 0], 24);
      sc.ell('gold', [side * 0.44, -0.12, 0.0], [0.04, 0.04, 0.04], [0, 0, 0], 8);
    }
    sc.box('gold', [-0.32, 0.27, 0.27], [0.2, 0.03, 0.03], [0, 0.5, 0.45]);
  }
}

function sculptTorso(sc, id) {
  const outfit = id === 'nurse01' ? 'cloth' : id === 'office01' ? 'cloth' : 'suit';
  // chest and waist
  sc.ell(outfit, [0, 0.14, 0], [0.96, 0.98, 0.64], [0, 0, 0], 28);
  sc.cyl(outfit, [0, -0.2, 0], 0.5, 0.58, 0.5, [0, 0, 0], 28);
  // neck base / shoulders
  sc.ell(outfit, [-0.5, 0.42, 0], [0.26, 0.26, 0.3], [0, 0, 0], 16);
  sc.ell(outfit, [0.5, 0.42, 0], [0.26, 0.26, 0.3], [0, 0, 0], 16);
  sc.cyl('skin', [0, 0.66, 0.02], 0.22, 0.2, 0.24, [0, 0, 0], 20);
  // bust definition
  sc.ell(outfit, [-0.13, 0.2, 0.17], [0.3, 0.26, 0.24], [0, 0, 0], 20);
  sc.ell(outfit, [0.13, 0.2, 0.17], [0.3, 0.26, 0.24], [0, 0, 0], 20);

  if (id === 'office01') {
    // navy pinafore vest + red-blue bow tie, collar, pencil skirt
    sc.ell('suit', [0, -0.02, 0.06], [0.92, 0.8, 0.62], [0, 0, 0], 26);
    sc.ell('cloth', [0, 0.35, 0.22], [0.36, 0.3, 0.2], [0.2, 0, 0], 18);
    sc.cyl('suit', [0, -0.42, 0], 0.46, 0.5, 0.88, [0, 0, 0], 32);
    sc.torus('gold', [0, -0.2, 0], 0.54, 0.035, [0, 0, 0], 32);
    sc.box('gold', [0, -0.2, 0.275], [0.1, 0.07, 0.03]);
    // collar flaps + bow
    for (const side of [-1, 1]) sc.ell('cloth', [side * 0.12, 0.52, 0.2], [0.2, 0.06, 0.16], [0.35, 0, side * -0.45], 12);
    sc.ell('accent', [0, 0.46, 0.3], [0.1, 0.1, 0.08], [0, 0, 0], 12);
    for (const side of [-1, 1]) sc.ell('accent', [side * 0.1, 0.46, 0.29], [0.18, 0.12, 0.08], [0, side * 0.2, side * 0.3], 12);
    for (const y of [0.18, 0.02, -0.12]) sc.ell('gold', [0, y, 0.37], [0.04, 0.04, 0.025], [0, 0, 0], 10);
    sc.box('accent', [0.2, 0.3, 0.33], [0.12, 0.06, 0.012], [0, 0, 0.1]);
  } else if (id === 'nurse01') {
    // white nurse dress, pink collar + apron panel, heart cross, flared skirt with pink hem
    sc.cyl('cloth', [0, -0.42, 0], 0.46, 0.5, 1.02, [0, 0, 0], 36);
    sc.torus('accent', [0, -0.64, 0], 1.02, 0.045, [0, 0, 0], 40);
    sc.torus('accent', [0, -0.2, 0], 0.56, 0.05, [0, 0, 0], 32);
    sc.ell('gold', [0, -0.2, 0.28], [0.1, 0.09, 0.04], [0, 0, 0], 10);
    sc.ell('suit', [0, 0.1, 0.12], [0.62, 0.86, 0.5], [0, 0, 0], 22);
    for (const side of [-1, 1]) sc.ell('suit', [side * 0.16, 0.5, 0.18], [0.3, 0.07, 0.24], [0.45, 0, side * -0.5], 12);
    sc.box('accent', [0, 0.12, 0.345], [0.07, 0.24, 0.02]);
    sc.box('accent', [0, 0.12, 0.345], [0.24, 0.07, 0.02]);
    sc.ell('cloth', [0, 0.12, 0.35], [0.05, 0.05, 0.02], [0, 0, 0]);
    for (const y of [0.34, -0.02]) sc.ell('gold', [0, y, 0.34], [0.04, 0.04, 0.025], [0, 0, 0], 10);
  } else {
    // sharp navy blazer over white blouse with gold buttons, lapels, pencil skirt
    sc.ell('cloth', [0, 0.2, 0.2], [0.34, 0.7, 0.3], [0, 0, 0], 18);
    for (const side of [-1, 1]) {
      sc.ell('suitDark', [side * 0.17, 0.26, 0.27], [0.2, 0.7, 0.11], [0.05, 0, side * -0.28], 14);
      sc.ell('suit', [side * 0.36, -0.03, 0.2], [0.34, 0.5, 0.3], [0, 0, 0], 16);
    }
    sc.cyl('suit', [0, -0.42, 0], 0.46, 0.5, 0.86, [0, 0, 0], 32);
    sc.cyl('suitDark', [0, -0.18, 0], 0.08, 0.6, 0.6, [0, 0, 0], 32);
    sc.torus('gold', [0, -0.18, 0], 0.62, 0.032, [0, 0, 0], 32);
    for (const y of [0.0, -0.14]) sc.ell('gold', [0.07, y, 0.36], [0.055, 0.055, 0.035], [0, 0, 0], 12);
    // brooch + rose gold pin
    sc.ell('gold', [-0.2, 0.34, 0.38], [0.075, 0.075, 0.04], [0, 0, 0], 12);
    sc.ell('glow', [-0.2, 0.34, 0.4], [0.035, 0.035, 0.02], [0, 0, 0], 8);
    for (const side of [-1, 1]) sc.ell('cloth', [side * 0.1, 0.52, 0.2], [0.2, 0.06, 0.16], [0.35, 0, side * -0.45], 12);
  }
}

function sculptArm(sc, id, side) {
  const sleeve = id === 'ceo01' ? 'suit' : 'cloth';
  const short = id === 'nurse01';
  // shoulder cap + upper arm + forearm (slightly bent) + hand
  sc.ell(sleeve, [-side * 0.06, 0.37, 0], [0.31, 0.3, 0.3], [0, 0, 0], 18);
  sc.cyl(sleeve, [side * 0.015, 0.1, 0], 0.5, 0.3, 0.26, [0, 0, side * 0.06], 20);
  if (short) {
    sc.ell('cloth', [-side * 0.02, 0.28, 0], [0.32, 0.24, 0.3], [0, 0, 0], 16);
    sc.torus('accent', [side * 0.012, 0.2, 0], 0.3, 0.04, [0, 0, side * 0.06], 24);
    sc.cyl('skin', [side * 0.045, -0.2, 0.01], 0.62, 0.26, 0.2, [0, 0, side * 0.12], 20);
  } else {
    sc.cyl(sleeve, [side * 0.05, -0.2, 0.01], 0.62, 0.26, 0.2, [0, 0, side * 0.12], 20);
    const cuff = id === 'office01' ? 'suit' : 'cloth';
    sc.cyl(cuff, [side * 0.082, -0.44, 0.012], 0.12, 0.22, 0.22, [0, 0, side * 0.12], 20);
    if (id === 'ceo01') sc.ell('gold', [side * 0.14, -0.44, 0.1], [0.045, 0.045, 0.045], [0, 0, 0], 10);
    if (id === 'office01') sc.torus('accent', [side * 0.082, -0.5, 0.012], 0.225, 0.02, [0, 0, side * 0.12], 20);
  }
  sc.ell('skin', [side * 0.098, -0.62, 0.02], [0.2, 0.24, 0.16], [0, 0, side * 0.12], 18); // palm
  sc.ell('skin', [side * 0.01, -0.58, 0.07], [0.07, 0.14, 0.07], [0.2, 0, side * -0.55], 10); // thumb
  for (let i = 0; i < 3; i += 1) sc.ell('skin', [side * (0.17 - i * 0.045), -0.74 + i * 0.012, 0.025], [0.05, 0.14, 0.06], [0, 0, side * 0.12], 8);
  if (id === 'nurse01') sc.torus('accent', [side * 0.1, -0.5, 0.012], 0.2, 0.025, [0, 0, side * 0.12], 20);
}

function sculptLegs(sc, id) {
  const hasHeel = id !== 'office01';
  for (const side of [-1, 1]) {
    const x = side * 0.2;
    // thigh + knee + calf + ankle in stockings
    sc.cyl('stock', [x, 0.1, 0], 0.8, 0.36, 0.26, [0, 0, side * -0.02], 24);
    sc.ell('stock', [x, -0.28, 0], [0.26, 0.26, 0.26], [0, 0, 0], 16);
    sc.ell('stock', [x, -0.46, -0.01], [0.25, 0.4, 0.26], [0, 0, 0], 18);
    sc.cyl('stock', [x, -0.7, 0.0], 0.3, 0.17, 0.13, [0, 0, 0], 18);
    if (id === 'nurse01') {
      sc.torus('accent', [x, 0.42, 0], 0.37, 0.05, [0, 0, 0], 28);
      sc.ell('accent', [x + side * 0.1, 0.4, 0.14], [0.06, 0.06, 0.03], [0, 0, 0], 8);
    }
    // shoes
    sc.ell('shoe', [x, -0.86, 0.11], [0.26, 0.18, 0.52], [0.08, 0, 0], 18);
    sc.ell('shoe', [x, -0.83, 0.23], [0.2, 0.14, 0.24], [0, 0, 0], 14);
    if (hasHeel) sc.cyl('shoe', [x, -0.88, -0.1], 0.14, 0.05, 0.035, [0, 0, 0], 12);
    sc.box(id === 'ceo01' ? 'gold' : id === 'office01' ? 'accent' : 'gold', [x, -0.81, 0.04], [0.12, 0.012, 0.18], [0, 0, 0]);
    sc.torus('gold', [x, -0.74, 0.0], 0.16, 0.014, [0, 0, 0], 20);
  }
  // hips / garment lining so no gap shows between skirt and thighs
  sc.ell(id === 'office01' ? 'suit' : id === 'ceo01' ? 'suit' : 'cloth', [0, 0.42, 0], [0.82, 0.3, 0.52], [0, 0, 0], 20);
}
