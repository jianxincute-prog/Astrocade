// Babylon.js statue kit v2 — every body part is a continuous lofted surface (cross-sections blended with splines),
// not stacked spheres. Parts share exact joint profiles (neck, shoulders, hips) so the figure reads as one body.
// Figure space: +Y up, feet at y=0, +Z is the front. Each part is built in figure space, then recentred on PART_OFFSET.
import { getSet } from './logic.mjs';
import { armJoints } from './poses.mjs';
import { DEFAULT_EXPR, EXPR, LIP_STYLE, SHAPE } from './faces.mjs';

const B = () => window.BABYLON;
const hex = (value) => B().Color3.FromHexString(value);

// Where every part pivots (spin / carry / hologram anchor). Meshes are built in figure space and shifted by this.
export const PART_OFFSET = { legs: [0, 1.1, 0], torso: [0, 2.75, 0], head: [0, 3.8, 0], armL: [-0.4, 2.75, 0], armR: [0.4, 2.75, 0] };

export const STYLE = {
  office01: {
    hair: '#24182f', hairTip: '#5b4580', eye: '#6a4630', eyeDeep: '#2a170f', cloth: '#f4f3f6', suit: '#2b3b78', suitDark: '#1b2552',
    accent: '#76d8ff', skin: '#f3d0bb', shoe: '#1b1a2a', stock: '#2b2735', gold: '#e8d7a0', lip: '#d9707f', blush: '#f4a2ac', heel: 0.07, stockTo: 2.0,
  },
  nurse01: {
    hair: '#dc8fae', hairTip: '#f7d3e1', eye: '#b45d86', eyeDeep: '#4a1a33', cloth: '#fbf6f8', suit: '#fbf6f8', suitDark: '#ffb7d3',
    accent: '#ff7fb7', skin: '#f6d6c8', shoe: '#fff0f5', stock: '#fbf4f7', gold: '#ffd0e4', lip: '#ea8197', blush: '#f7a0b0', heel: 0.04, stockTo: 1.5,
  },
  ceo01: {
    hair: '#1c141c', hairTip: '#4c3048', eye: '#8a5a22', eyeDeep: '#2b1606', cloth: '#f8f2ec', suit: '#2a3358', suitDark: '#171c36',
    accent: '#f0c66f', skin: '#efc9b0', shoe: '#120f18', stock: '#16131c', gold: '#f2c35f', lip: '#c9505f', blush: '#ee9a9c', heel: 0.15, stockTo: 2.0,
  },
  // cute schoolgirl from the reference sheet: long dark-brown hair with a big red bow, white short-sleeve blouse,
  // red ribbon bow, dark pleated skirt, white socks and black loafers
  student01: {
    hair: '#2a1a1c', hairTip: '#5e3438', eye: '#8a3a2c', eyeDeep: '#3a120c', cloth: '#fbfbfd', suit: '#23263a', suitDark: '#181a28',
    accent: '#d42a3a', skin: '#fadccd', shoe: '#151318', stock: '#f6f6f8', gold: '#e9d9a6', lip: '#ec8f9c', blush: '#ffa3b1', heel: 0.02, stockTo: 0.75,
  },
  // pop idol in a red-and-white stage costume with gold trim, frilled skirt, white stockings and red boots
  idol01: {
    hair: '#f0d9a0', hairTip: '#ffb7c8', eye: '#2fa0e0', eyeDeep: '#0d3a66', cloth: '#ffffff', suit: '#ff4f72', suitDark: '#c8365a',
    accent: '#ffd84d', skin: '#fbdccf', shoe: '#e8465f', stock: '#ffffff', gold: '#ffd36b', lip: '#f2708c', blush: '#ff9db0', heel: 0.06, stockTo: 1.45,
  },
  // grown-up cleaning-staff woman: teal work tunic, trousers, yellow rubber gloves, white sneakers
  janitor01: {
    hair: '#4a2f25', hairTip: '#8a5a40', eye: '#3e7a5c', eyeDeep: '#16301f', cloth: '#eef2ef', suit: '#2f8a74', suitDark: '#1f5c4e',
    accent: '#f4c430', skin: '#efc8ab', shoe: '#ececf0', stock: '#2f8a74', gold: '#cfd6da', lip: '#c96f73', blush: '#eea0a0', heel: 0, stockTo: 0,
  },
  // --- Character Studio figures ---
  rin01: {
    hair: '#b9b4d6', hairTip: '#e6e2ff', eye: '#5fb4e6', eyeDeep: '#123a5a', cloth: '#f2f4fa', suit: '#2a3050', suitDark: '#1a1f38',
    accent: '#7fd0ff', skin: '#f6dcd2', shoe: '#1a1a24', stock: '#20202c', gold: '#d8dce8', lip: '#e08a98', blush: '#f3a9b4', heel: 0.04, stockTo: 1.4,
  },
  aoi01: {
    hair: '#8a3a22', hairTip: '#d07a4a', eye: '#3a9a5a', eyeDeep: '#103a1e', cloth: '#ffffff', suit: '#2f6fd0', suitDark: '#1d4a96',
    accent: '#ffd040', skin: '#f3cdb2', shoe: '#ffffff', stock: '#ffffff', gold: '#e8e8e8', lip: '#d97a7e', blush: '#f09a94', heel: 0, stockTo: 0.5,
  },
  mei01: {
    hair: '#1a1420', hairTip: '#4a3a60', eye: '#9a5ad8', eyeDeep: '#2e1250', cloth: '#ffffff', suit: '#1a1820', suitDark: '#0f0e14',
    accent: '#e04a8a', skin: '#f8ddd0', shoe: '#14121a', stock: '#ffffff', gold: '#e0c070', lip: '#e88a9c', blush: '#ffa0b4', heel: 0.04, stockTo: 1.45,
  },
  yuki01: {
    hair: '#eef0f6', hairTip: '#c8d8ff', eye: '#d0384a', eyeDeep: '#4a0c14', cloth: '#ffffff', suit: '#e8ecf6', suitDark: '#9aa8c8',
    accent: '#8ac8ff', skin: '#fbe6df', shoe: '#e8ecf6', stock: '#ffffff', gold: '#c8d8f0', lip: '#e47a8a', blush: '#f6a8b6', heel: 0.05, stockTo: 1.45,
  },
  kana01: {
    hair: '#e8b86a', hairTip: '#fff0c0', eye: '#e05aa0', eyeDeep: '#4a0c30', cloth: '#ffffff', suit: '#ff7ab8', suitDark: '#d0488a',
    accent: '#ffd84d', skin: '#e3b08a', shoe: '#ffffff', stock: '#ffffff', gold: '#ffd36b', lip: '#d2607e', blush: '#f08a8a', heel: 0.08, stockTo: 0.6,
  },
  sakura01: {
    hair: '#120c14', hairTip: '#3a2440', eye: '#8a4ac8', eyeDeep: '#2a0c44', cloth: '#ffffff', suit: '#c8202e', suitDark: '#8a1420',
    accent: '#ffffff', skin: '#f8e0d6', shoe: '#ffffff', stock: '#ffffff', gold: '#e8c87a', lip: '#d84a5c', blush: '#f4a0a8', heel: 0.03, stockTo: 0.6,
  },
};
// Bust / hip fullness per character; the student keeps a youthful, modest silhouette.
const FIGURE = { office01: [0.071, 0.047], nurse01: [0.071, 0.047], ceo01: [0.071, 0.047], student01: [0.03, 0.025], janitor01: [0.058, 0.045], idol01: [0.058, 0.04], rin01: [0.05, 0.035], aoi01: [0.05, 0.04], mei01: [0.04, 0.03], yuki01: [0.05, 0.035], kana01: [0.068, 0.045], sakura01: [0.05, 0.035] };

export function createStatueKit(scene, { faceScale = 1 } = {}) {
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

  const costumes = new Map(); // setId → colour overrides (Studio gala costumes)
  function materialFor(setId, fullKind) {
    const s = costumes.has(setId) ? { ...STYLE[setId], ...costumes.get(setId) } : STYLE[setId];
    const key = `${setId}:${fullKind}`;
    const [kind, expr = DEFAULT_EXPR[setId] || 'neutral'] = fullKind.split('@');
    switch (kind) {
      case 'skin': return pbr(key, (m) => {
        m.albedoColor = hex(s.skin); m.roughness = 0.5; m.metallic = 0;
        m.emissiveColor = hex(s.skin).scale(0.12);
        m.sheen.isEnabled = true; m.sheen.intensity = 0.3; m.sheen.color = hex('#ffcdbf');
      });
      case 'lid': return pbr(key, (m) => { // closed eyelids: skin tinted with the character's eyeshadow
        m.albedoColor = hex(s.skin).scale(0.72).add(hex(LOOK[setId].shadow).scale(0.28)); m.roughness = 0.45; m.backFaceCulling = false;
        m.emissiveColor = hex(s.skin).scale(0.12); m.sheen.isEnabled = true; m.sheen.intensity = 0.3; m.sheen.color = hex('#ffcdbf');
      });
      case 'mouthIn': return pbr(key, (m) => { m.albedoColor = hex('#2a0a12'); m.roughness = 0.7; m.emissiveColor = hex('#14040a'); m.backFaceCulling = false; m.environmentIntensity = 0.2; });
      case 'teeth': return pbr(key, (m) => { m.albedoColor = hex('#f6f2ee'); m.roughness = 0.25; m.emissiveColor = hex('#ffffff').scale(0.12); });
      case 'tongue': return pbr(key, (m) => { m.albedoColor = hex('#d8606e'); m.roughness = 0.35; m.emissiveColor = hex('#401018'); });
      case 'tear': return pbr(key, (m) => {
        m.albedoColor = hex('#eaf6ff'); m.alpha = 0.55; m.roughness = 0.02; m.metallic = 0; m.environmentIntensity = 1.6;
        m.clearCoat.isEnabled = true; m.clearCoat.intensity = 1; m.clearCoat.roughness = 0.02; m.emissiveColor = hex('#bfe0ff').scale(0.25);
      });
      case 'face': return pbr(key, (m) => {
        m.albedoTexture = faceTexture(setId, expr); m.roughness = 1; m.metallic = 0;
        m.metallicTexture = faceSurface(setId, expr); m.useRoughnessFromMetallicTextureGreen = true; m.useMetallnessFromMetallicTextureBlue = true;
        m.useRoughnessFromMetallicTextureAlpha = false; m.useAmbientOcclusionFromMetallicTextureRed = false;
        m.useAlphaFromAlbedoTexture = true; m.transparencyMode = BAB.PBRMaterial.PBRMATERIAL_ALPHATEST; m.alphaCutOff = 0.5;
        m.emissiveTexture = faceTexture(setId, expr); m.emissiveColor = hex('#ffffff').scale(0.12);
        m.sheen.isEnabled = true; m.sheen.intensity = 0.3; m.sheen.color = hex('#ffcdbf');
      });
      case 'lip': return pbr(key, (m) => {
        m.albedoColor = hex(s.lip); m.roughness = 0.28; m.emissiveColor = hex(s.lip).scale(0.1);
        m.clearCoat.isEnabled = true; m.clearCoat.intensity = 0.6; m.clearCoat.roughness = 0.1;
      });
      case 'hair': return pbr(key, (m) => {
        m.albedoColor = hex('#ffffff'); m.albedoTexture = hairTexture(setId); m.roughness = 0.46; m.metallic = 0.02; m.backFaceCulling = false;
        m.clearCoat.isEnabled = true; m.clearCoat.intensity = 0.3; m.clearCoat.roughness = 0.3;
        m.sheen.isEnabled = true; m.sheen.intensity = 0.7; m.sheen.color = hex(s.hairTip);
        m.emissiveColor = hex(s.hair).scale(0.12);
      });
      case 'hairTip': return pbr(key, (m) => {
        m.albedoColor = hex(s.hairTip).scale(0.55).add(hex(s.hair).scale(0.45)); m.albedoTexture = hairTexture(setId); m.roughness = 0.42; m.metallic = 0.02; m.backFaceCulling = false;
        m.clearCoat.isEnabled = true; m.clearCoat.intensity = 0.9; m.clearCoat.roughness = 0.08;
        m.emissiveColor = hex(s.hairTip).scale(0.14);
      });
      case 'cloth': return pbr(key, (m) => {
        m.albedoColor = hex(s.cloth); m.roughness = 0.62; m.backFaceCulling = false;
        m.sheen.isEnabled = true; m.sheen.intensity = 0.25; m.sheen.color = hex('#ffffff');
      });
      case 'suit': return pbr(key, (m) => {
        m.albedoColor = hex(s.suit); m.roughness = 0.55; m.backFaceCulling = false;
        m.sheen.isEnabled = true; m.sheen.intensity = 0.3; m.sheen.color = hex(s.accent);
      });
      case 'suitDark': return pbr(key, (m) => {
        m.albedoColor = hex(s.suitDark); m.roughness = 0.5; m.backFaceCulling = false;
        m.sheen.isEnabled = true; m.sheen.intensity = 0.3; m.sheen.color = hex(s.accent);
      });
      case 'accent': return pbr(key, (m) => {
        m.albedoColor = hex(s.accent); m.roughness = 0.35; m.metallic = 0.1; m.backFaceCulling = false;
        m.emissiveColor = hex(s.accent).scale(0.3);
      });
      case 'gold': return pbr(key, (m) => {
        m.albedoColor = hex(s.gold); m.metallic = 1; m.roughness = 0.2;
        m.emissiveColor = hex(s.gold).scale(0.1);
      });
      case 'shoe': return pbr(key, (m) => {
        m.albedoColor = hex(s.shoe); m.roughness = 0.2; m.metallic = 0.1;
        m.clearCoat.isEnabled = true; m.clearCoat.intensity = 0.9; m.clearCoat.roughness = 0.06;
      });
      case 'stock': return pbr(key, (m) => {
        m.albedoColor = hex(s.stock); m.roughness = 0.4;
        m.sheen.isEnabled = true; m.sheen.intensity = 0.9; m.sheen.color = hex('#ffffff');
      });
      case 'lens': return pbr(key, (m) => {
        m.albedoColor = hex('#cfeaff'); m.alpha = 0.14; m.roughness = 0.05; m.metallic = 0;
        m.emissiveColor = hex('#8fd2ff').scale(0.2);
      });
      case 'sclera': return pbr(key, (m) => {
        m.albedoTexture = scleraTexture(); m.roughness = 0.3; m.emissiveTexture = scleraTexture(); m.emissiveColor = hex('#ffffff').scale(0.12);
      });
      case 'iris': return pbr(key, (m) => {
        m.albedoTexture = irisTexture(setId); m.useAlphaFromAlbedoTexture = true; m.transparencyMode = BAB.PBRMaterial.PBRMATERIAL_ALPHATEST; m.alphaCutOff = 0.4;
        m.emissiveTexture = irisTexture(setId); m.emissiveColor = hex('#ffffff').scale(0.45); m.roughness = 0.3;
      });
      case 'cornea': return pbr(key, (m) => {
        m.albedoColor = hex('#ffffff'); m.alpha = 0.08; m.roughness = 0.02; m.metallic = 0;
        m.clearCoat.isEnabled = true; m.clearCoat.intensity = 1; m.clearCoat.roughness = 0.02; m.environmentIntensity = 1.6;
      });
      case 'lash': return pbr(key, (m) => { m.albedoColor = hex('#1b1016'); m.roughness = 0.5; });
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
    m.alpha = 0.42; // alpha-blended (not additive) so the ghost still reads against a bright room
    m.backFaceCulling = false;
    m.needDepthPrePass = true;
    m.emissiveFresnelParameters = new BAB.FresnelParameters({ bias: 0.18, power: 1.7, leftColor: c.scale(1.7), rightColor: c.scale(0.4) });
    m.opacityFresnelParameters = new BAB.FresnelParameters({ bias: 0.1, power: 1.5, leftColor: BAB.Color3.White(), rightColor: new BAB.Color3(0.18, 0.18, 0.18) });
    mats.set(key, m);
    return m;
  }

  function hairTexture(setId) {
    const key = `hair-${setId}`;
    if (faceTextures.has(key)) return faceTextures.get(key);
    const s = STYLE[setId]; const tex = new BAB.DynamicTexture(key, { width: 512, height: 512 }, scene, true);
    const ctx = tex.getContext(); const rnd = mulberry(setId.length * 31 + 7);
    ctx.fillStyle = s.hair; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i += 1) { // fine strands running root → tip
      const x = rnd() * 512; const light = rnd();
      ctx.strokeStyle = light > 0.6 ? hexA(s.hairTip, 0.18 + rnd() * 0.22) : hexA(shadeHex(s.hair, -40), 0.2 + rnd() * 0.25);
      ctx.lineWidth = 0.8 + rnd() * 1.6;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + (rnd() - 0.5) * 14, 170, x + (rnd() - 0.5) * 14, 340, x + (rnd() - 0.5) * 10, 512); ctx.stroke();
    }
    tex.update(true); tex.uScale = 3; tex.wrapU = tex.wrapV = BAB.Texture.WRAP_ADDRESSMODE; tex.anisotropicFilteringLevel = 8;
    faceTextures.set(key, tex); return tex;
  }
  function scleraTexture() {
    if (faceTextures.has('sclera')) return faceTextures.get('sclera');
    const tex = new BAB.DynamicTexture('sclera', { width: 64, height: 256 }, scene, true); const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, 256); // sphere v: top → bottom
    g.addColorStop(0, '#3a2a30'); g.addColorStop(0.36, '#b9a7aa'); g.addColorStop(0.5, '#f4eceb'); g.addColorStop(1, '#efe4e3');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 256); tex.update(true); faceTextures.set('sclera', tex); return tex;
  }
  function irisTexture(setId) {
    const key = `iris-${setId}`;
    if (faceTextures.has(key)) return faceTextures.get(key);
    const s = STYLE[setId]; const tex = new BAB.DynamicTexture(key, { width: 256, height: 256 }, scene, true);
    tex.hasAlpha = true; const ctx = tex.getContext(); const rnd = mulberry(setId.length * 53 + 3); const c = 128; const r = 124;
    ctx.clearRect(0, 0, 256, 256);
    const g = ctx.createRadialGradient(c, c, 6, c, c, r);
    g.addColorStop(0, shadeHex(s.eye, 70)); g.addColorStop(0.35, shadeHex(s.eye, 30)); g.addColorStop(0.75, s.eye); g.addColorStop(0.93, shadeHex(s.eye, -40)); g.addColorStop(1, s.eyeDeep);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 220; i += 1) { // radial fibres
      const a = rnd() * Math.PI * 2; const r0 = 30 + rnd() * 10; const r1 = r * (0.6 + rnd() * 0.38);
      ctx.strokeStyle = rnd() > 0.45 ? hexA(shadeHex(s.eye, 80), 0.3) : hexA(s.eyeDeep, 0.35); ctx.lineWidth = 1 + rnd() * 1.4;
      ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); ctx.lineTo(c + Math.cos(a + 0.05) * r1, c + Math.sin(a + 0.05) * r1); ctx.stroke();
    }
    const top = ctx.createLinearGradient(0, 0, 0, 256); top.addColorStop(0, 'rgba(20,8,16,.55)'); top.addColorStop(0.45, 'rgba(20,8,16,0)');
    ctx.fillStyle = top; ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(s.eyeDeep, 0.95); ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(c, c, r - 5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#0b060c'; ctx.beginPath(); ctx.arc(c, c, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.ellipse(c - 40, c - 46, 26, 20, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(c + 44, c + 40, 11, 0, Math.PI * 2); ctx.fill();
    tex.update(true); faceTextures.set(key, tex); return tex;
  }
  function faceTexture(setId, expr) {
    const tk = `${setId}@${expr}`;
    if (faceTextures.has(tk)) return faceTextures.get(tk);
    const tex = new BAB.DynamicTexture(`face-${tk}`, { width: 2048 * faceScale, height: 1024 * faceScale }, scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext(); ctx.save(); ctx.scale(faceScale, faceScale); // painted in 2048 x 1024 units at any size
    drawFace(ctx, 2048, 1024, setId, expr); ctx.restore();
    tex.update(true);
    tex.anisotropicFilteringLevel = 8;
    tex.wrapU = BAB.Texture.WRAP_ADDRESSMODE; tex.wrapV = BAB.Texture.CLAMP_ADDRESSMODE;
    faceTextures.set(tk, tex);
    return tex;
  }
  function faceSurface(setId, expr) { // small roughness map (green) matching the face texture: skin 0.48, lips per finish
    const tk = `${setId}@${expr}#surf`;
    if (faceTextures.has(tk)) return faceTextures.get(tk);
    const tex = new BAB.DynamicTexture(`face-surf-${setId}@${expr}`, { width: 512, height: 256 }, scene, true);
    drawFaceSurface(tex.getContext(), 512, 256, setId, expr);
    tex.update(true);
    tex.wrapU = BAB.Texture.WRAP_ADDRESSMODE; tex.wrapV = BAB.Texture.CLAMP_ADDRESSMODE;
    faceTextures.set(tk, tex);
    return tex;
  }

  return {
    // Studio previews swap faces often; free the 2048² face texture of a preset/expression no longer on screen.
    // Swap a figure's colourway; its cloth/suit/accent materials are rebuilt on the next build.
    setCostume(setId, overrides) {
      const next = overrides || null; const prev = costumes.get(setId) || null;
      if (next === prev) return;
      if (next) costumes.set(setId, next); else costumes.delete(setId);
      for (const [key, m] of mats) if (key.startsWith(`${setId}:`) && !key.includes(':face') && !key.endsWith(':holo')) { m.dispose(); mats.delete(key); }
    },
    releaseFace(setId, expr) {
      const m = mats.get(`${setId}:face@${expr}`); if (m) { m.dispose(); mats.delete(`${setId}:face@${expr}`); }
      for (const tk of [`${setId}@${expr}`, `${setId}@${expr}#surf`]) { const t = faceTextures.get(tk); if (t) { t.dispose(); faceTextures.delete(tk); } }
    },
    materialFor,
    holoMaterial,
    dispose() { for (const m of mats.values()) m.dispose(); for (const t of faceTextures.values()) t.dispose(); mats.clear(); faceTextures.clear(); },
  };
}

// ======================================================================================================
// Face painting — semi-realistic beauty portrait wrapped on the head loft.
// Head loft: v runs chin(0) → crown(HEAD_H) uniformly, u = 0.5 is the centre of the face.
// ======================================================================================================
const HEAD_H = 0.6;
const FACE_FLIP_V = true; // Babylon ribbon v runs bottom-to-top; the canvas runs top-to-bottom.
function drawFace(ctx, W, H, setId, expr = 'neutral') {
  const s = STYLE[setId]; const E = EXPR[expr] || EXPR.neutral;
  const cx = W * 0.5;
  const PXX = 1900; // canvas px per head-space unit (horizontal, at eye level)
  const PXY = H / HEAD_H; // vertical px per unit
  const X = (x) => cx + x * PXX;
  const Y = (y) => H * (1 - vOfH(y)); void FACE_FLIP_V; void HEAD_H;
  const rnd = mulberry(setId.length * 977 + 13);

  // --- skin base with soft contour shading ---
  ctx.fillStyle = s.skin; ctx.fillRect(0, 0, W, H);
  const L = LOOK[setId];
  for (const side of [-1, 1]) { // contour toward the ears and under the cheekbone, strength per character
    const g = ctx.createRadialGradient(X(side * 0.24), Y(0.18), 10, X(side * 0.24), Y(0.18), 280);
    g.addColorStop(0, hexA('#a0645a', L.contour)); g.addColorStop(1, hexA('#a0645a', 0));
    ctx.fillStyle = g; ctx.fillRect(X(side * 0.24) - 300, Y(0.18) - 300, 600, 600);
    radial(ctx, X(side * 0.15), Y(0.155), 150, 34, hexA('#9a5a50', L.contour * 0.55));
  }
  radial(ctx, X(0), Y(0.33), 34, 60, hexA('#ffffff', 0.1)); // glow between the brows
  radial(ctx, X(0), Y(0.43), 300, 140, hexA('#ffffff', 0.14)); // forehead glow
  radial(ctx, X(0), Y(0.25), 26, 110, hexA('#ffffff', 0.16)); // nose bridge highlight
  radial(ctx, X(0), Y(F.noseTip + 0.006), 30, 22, hexA('#ffffff', 0.28)); // nose tip glow
  for (const side of [-1, 1]) radial(ctx, X(side * 0.095), Y(0.215), 150, 80, hexA('#ffffff', 0.12)); // cheekbone glow
  for (const side of [-1, 1]) {
    radial(ctx, X(side * 0.108), Y(0.185), 170, 95, hexA(s.blush, Math.min(0.85, L.blush + E.blush))); // blush
    if (E.hatch) { ctx.strokeStyle = hexA('#d0505a', 0.35); ctx.lineWidth = 3; for (let k = 0; k < 3; k += 1) { const bx = X(side * (0.09 + k * 0.016)); const by = Y(0.19); ctx.beginPath(); ctx.moveTo(bx - 10, by + 12); ctx.lineTo(bx + 6, by - 12); ctx.stroke(); } }
    radial(ctx, X(side * 0.1), Y(0.205), 90, 40, hexA('#ffffff', 0.1 + (L.sparkle || 0) * 0.08)); // highlighter on the cheekbone
    radial(ctx, X(side * 0.05), Y(0.235), 26, 18, hexA('#ffffff', 0.16)); // under-eye brightener
  }
  radial(ctx, X(0), Y(0.04), 80, 40, hexA('#ffffff', 0.12)); // chin glow

  // --- eyes ---
  const shut = shutEyes(E);
  for (const side of [-1, 1]) {
    const i = side > 0 ? 1 : 0;
    if (shut[i]) drawClosedEye(ctx, ...eyeCentrePx(side), side, setId, E, E.happy && E.happy[i]);
    else drawEye(ctx, X(side * F.eyeX), Y(F.eye), side, s, rnd, setId, E.lid[i] >= 0.45);
  }
  // --- brows ---
  for (const side of [-1, 1]) drawBrow(ctx, X(side * F.eyeX), Y(F.brow), side, s, rnd, setId, E);
  // --- nose: just a whisper of shadow under the tip and two tiny nostrils ---
  radial(ctx, X(0), Y(F.noseTip - 0.014), 34, 10, hexA('#a05a52', 0.2));
  for (const side of [-1, 1]) radial(ctx, X(side * 0.014), Y(F.noseTip - 0.011), 9, 5, hexA('#7a3a36', 0.38));
  for (const side of [-1, 1]) radial(ctx, X(side * 0.024), Y(0.25), 10, 60, hexA('#a05a52', 0.08));
  // --- lips ---
  drawMouth(ctx, setId, E);
  // --- character details ---
  for (const [mx, mh] of L.mark || []) { radial(ctx, X(mx), Y(mh), 7, 7, hexA('#3a2018', 0.8)); radial(ctx, X(mx), Y(mh), 13, 13, hexA('#3a2018', 0.15)); }
  if (L.freckles) for (let i = 0; i < L.freckles; i += 1) {
    const side = i % 2 ? 1 : -1; const fx = side * (0.045 + rnd() * 0.085); const fh = 0.19 + rnd() * 0.06;
    radial(ctx, X(fx), Y(fh), 3 + rnd() * 3, 3 + rnd() * 3, hexA('#a8644e', 0.25 + rnd() * 0.2));
  }
  if (L.smileLines) for (const side of [-1, 1]) {
    ctx.strokeStyle = hexA('#8a5244', 0.16); ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(X(side * 0.04), Y(0.175)); ctx.quadraticCurveTo(X(side * 0.07), Y(0.13), X(side * 0.064), Y(0.085)); ctx.stroke();
  }
  if (L.glitter) for (let i = 0; i < 70; i += 1) { // idol stage glitter under the eyes
    const side = i % 2 ? 1 : -1; const gx = side * (0.06 + rnd() * 0.06); const gh = 0.225 + rnd() * 0.03;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.9)' : 'rgba(255,190,220,.85)';
    ctx.beginPath(); ctx.arc(X(gx), Y(gh), 1.2 + rnd() * 2.2, 0, Math.PI * 2); ctx.fill();
  }
  if (L.glitter) for (const side of [-1, 1]) { // tiny heart under the left eye
    if (side > 0) continue; const hx = X(side * 0.118); const hy = Y(0.226);
    ctx.fillStyle = 'rgba(255,90,140,.85)'; ctx.beginPath(); ctx.moveTo(hx, hy + 8);
    ctx.bezierCurveTo(hx - 14, hy - 2, hx - 7, hy - 12, hx, hy - 4); ctx.bezierCurveTo(hx + 7, hy - 12, hx + 14, hy - 2, hx, hy + 8); ctx.fill();
  }
  // --- fine skin grain ---
  for (let i = 0; i < 9000; i += 1) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(120,70,60,.025)' : 'rgba(255,255,255,.04)';
    ctx.fillRect(rnd() * W, rnd() * H, 1.4 + rnd() * 1.6, 1.4 + rnd() * 1.6);
  }
  if (E.tears) for (const side of [-1, 1]) { // wet sheen along the tear tracks (the tears themselves are 3D)
    const g = ctx.createLinearGradient(0, Y(F.eye - 0.03), 0, Y(0.12)); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(X(side * (F.eyeX + 0.015)) - 9, Y(F.eye - 0.03), 18, Y(0.12) - Y(F.eye - 0.03));
  }
  // --- open the eyelids: the sclera/iris are real 3D eyeballs behind the skin ---
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
  for (const side of [-1, 1]) {
    if (shut[side > 0 ? 1 : 0]) continue; // a closed eye keeps its skin: there is no eyeball behind it
    const [ex, ey] = eyeCentrePx(side); const { hw, hgt } = EYE_SHAPE[setId];
    const c = eyeCurves(ex, ey + 3, side, hw * 0.93, hgt * 0.86);
    ctx.beginPath(); ctx.moveTo(...c.up[0]); ctx.bezierCurveTo(...c.up[1], ...c.up[2], ...c.up[3]); ctx.bezierCurveTo(...c.lo[1], ...c.lo[2], ...c.lo[3]); ctx.closePath(); ctx.fill();
  }
  // --- open the mouth: a real 3D cavity with teeth and tongue sits behind this opening ---
  const mg = mouthGeom(setId, expr);
  if (mg.oh > 0) { mouthOpening(ctx, mg, 0.86); ctx.fill(); }
  ctx.restore();
}
// Per-character beauty profile: every face shares the same anatomy but gets its own make-up and feature details.
//  shadow/shadow2: eyeshadow (lid → crease) · liner: wing length px · lashes/lashLen: lash count and length
//  iris2: inner iris ring colour · brow: [arch, lift, thickness] (lips: LIP_STYLE in faces.mjs)
//  blush · contour · extras: beauty marks, freckles, glitter, smile lines, under-eye highlight
export const LOOK = {
  office01: { shadow: '#b48a9e', shadow2: '#6e4f6c', liner: 12, lashes: 10, lashLen: 1.0, iris2: '#c49a62', brow: [18, 5, 1.0], blush: 0.26, contour: 0.15, mark: [[0.118, 0.24]] },
  nurse01: { shadow: '#f2a5bd', shadow2: '#d27896', liner: 6, lashes: 12, lashLen: 1.08, iris2: '#ffc4d6', brow: [15, 1, 0.85], blush: 0.42, contour: 0.08, sparkle: 0.5 },
  ceo01: { shadow: '#a0646e', shadow2: '#4b2433', liner: 26, lashes: 13, lashLen: 1.22, iris2: '#e4b04a', brow: [27, 15, 1.08], blush: 0.2, contour: 0.24, mark: [[0.055, 0.075]] },
  student01: { shadow: '#f4bcae', shadow2: '#e09a8c', liner: 0, lashes: 9, lashLen: 0.86, iris2: '#d8806a', brow: [13, -1, 0.8], blush: 0.5, contour: 0.05, freckles: 26 },
  janitor01: { shadow: '#b49280', shadow2: '#7c5c4a', liner: 4, lashes: 8, lashLen: 0.92, iris2: '#b8a060', brow: [19, 7, 1.18], blush: 0.28, contour: 0.18, mark: [[-0.112, 0.235]] },
  idol01: { shadow: '#ff9cc4', shadow2: '#d06aa0', liner: 14, lashes: 15, lashLen: 1.28, iris2: '#bdf0ff', brow: [16, 2, 0.75], blush: 0.46, contour: 0.08, glitter: true, sparkle: 1, lowerLash: true },
  rin01: { shadow: '#a8b0d8', shadow2: '#5a6090', liner: 10, lashes: 10, lashLen: 1.0, iris2: '#d0f0ff', brow: [10, 0, 0.8], blush: 0.18, contour: 0.12 },
  aoi01: { shadow: '#e8b090', shadow2: '#b07050', liner: 3, lashes: 9, lashLen: 0.9, iris2: '#c8f070', brow: [16, 4, 1.05], blush: 0.34, contour: 0.1, freckles: 12 },
  mei01: { shadow: '#d8a0e0', shadow2: '#8a5aa8', liner: 8, lashes: 13, lashLen: 1.15, iris2: '#f0c0ff', brow: [14, 0, 0.8], blush: 0.45, contour: 0.06, sparkle: 0.5 },
  yuki01: { shadow: '#c0c8f0', shadow2: '#8090c8', liner: 6, lashes: 12, lashLen: 1.15, iris2: '#ff9aa8', brow: [14, 2, 0.7], blush: 0.3, contour: 0.06, sparkle: 0.6 },
  kana01: { shadow: '#ffb070', shadow2: '#c06a30', liner: 22, lashes: 15, lashLen: 1.35, iris2: '#ffc0e0', brow: [20, 8, 0.9], blush: 0.3, contour: 0.2, sparkle: 0.8, mark: [[-0.06, 0.07]] },
  sakura01: { shadow: '#f0a0a8', shadow2: '#b04050', liner: 16, lashes: 12, lashLen: 1.1, iris2: '#d8b0ff', brow: [12, 0, 0.85], blush: 0.24, contour: 0.1 },
};
// Eye opening per character, in face-texture pixels (the texture is 2048 x 1024 over the head loft).
const TEX_W = 2048; const TEX_H = 1024; const PXX = 1900;
const EYE_SHAPE = { office01: { hw: 94, hgt: 47 }, nurse01: { hw: 96, hgt: 52 }, ceo01: { hw: 92, hgt: 42 }, student01: { hw: 98, hgt: 57 }, janitor01: { hw: 92, hgt: 45 }, idol01: { hw: 99, hgt: 56 }, rin01: { hw: 96, hgt: 44 }, aoi01: { hw: 94, hgt: 50 }, mei01: { hw: 100, hgt: 58 }, yuki01: { hw: 98, hgt: 54 }, kana01: { hw: 96, hgt: 50 }, sakura01: { hw: 96, hgt: 46 } };
function eyeCurves(ex, ey, side, hw, hgt) {
  const inner = [ex - side * hw, ey + 6]; const outer = [ex + side * hw, ey - 6];
  const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
  const up = [inner, [ex - side * hw * 0.35, ey - hgt * 1.28], [ex + side * hw * 0.42, ey - hgt * 1.36], outer];
  const lo = [outer, [ex + side * hw * 0.35, ey + hgt * 0.95], [ex - side * hw * 0.35, ey + hgt * 1.0], inner];
  return { inner, outer, up, lo, upper: (t) => bez(...up, t), lower: (t) => bez(...lo, t) };
}
// Exact point on a ribbon mesh for a face-texture pixel: finds the triangle containing that uv and returns the
// interpolated position, lifted along the outward normal. Keeps 3D details glued onto painted ones.
function meshPointAtTex(mesh, px, py, lift = 0) {
  const pos = mesh.getVerticesData('position'); const uv = mesh.getVerticesData('uv'); const idx = mesh.getIndices();
  const u = px / TEX_W; const v = 1 - py / TEX_H;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t]; const b = idx[t + 1]; const c = idx[t + 2];
    const ua = uv[a * 2]; const va = uv[a * 2 + 1]; const ub = uv[b * 2]; const vb = uv[b * 2 + 1]; const uc = uv[c * 2]; const vc = uv[c * 2 + 1];
    if (u < Math.min(ua, ub, uc) || u > Math.max(ua, ub, uc) || v < Math.min(va, vb, vc) || v > Math.max(va, vb, vc)) continue;
    const det = (vb - vc) * (ua - uc) + (uc - ub) * (va - vc); if (Math.abs(det) < 1e-12) continue;
    const l1 = ((vb - vc) * (u - uc) + (uc - ub) * (v - vc)) / det; const l2 = ((vc - va) * (u - uc) + (ua - uc) * (v - vc)) / det; const l3 = 1 - l1 - l2;
    if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
    const P = (i, k) => pos[i * 3 + k]; const p = [0, 1, 2].map((k) => l1 * P(a, k) + l2 * P(b, k) + l3 * P(c, k));
    const e1 = [0, 1, 2].map((k) => P(b, k) - P(a, k)); const e2 = [0, 1, 2].map((k) => P(c, k) - P(a, k));
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const len = Math.hypot(...n) || 1; n = n.map((q) => q / len); if (n[2] < 0) n = n.map((q) => -q); // face front is +z
    return p.map((q, k) => q + n[k] * lift);
  }
  return null;
}
// Which eyes are fully shut for an expression [figure-left, figure-right].
const shutEyes = (E) => [E.lid[0] >= 0.9, E.lid[1] >= 0.9];
// Contour of a closed eye in texture px: relaxed ‿, happy ^, or squeezed shut (crying).
function closedEyeCurve(ex, ey, side, hw, hgt, E, happy) {
  let pts;
  if (happy) pts = [[ex - side * hw * 0.9, ey + 12], [ex - side * hw * 0.4, ey - hgt * 1.15], [ex + side * hw * 0.42, ey - hgt * 1.2], [ex + side * hw * 0.92, ey + 8]];
  else if (E.squeeze) pts = [[ex - side * hw * 0.86, ey - 8], [ex - side * hw * 0.3, ey + hgt * 0.3], [ex + side * hw * 0.35, ey + hgt * 0.22], [ex + side * hw * 0.9, ey + 4]];
  else pts = [[ex - side * hw * 0.92, ey + 2], [ex - side * hw * 0.35, ey + hgt * 0.62], [ex + side * hw * 0.4, ey + hgt * 0.6], [ex + side * hw * 0.95, ey - 4]];
  const at = (t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * pts[0][k] + 3 * u * u * t * pts[1][k] + 3 * u * t * t * pts[2][k] + t * t * t * pts[3][k]); };
  return { pts, at };
}
// Babylon ribbons assign v by arc length up each column, so texture rows are not evenly spaced in height.
// Measure that arc length on the deformed face loft to convert texture pixels ↔ head-space positions.
let VMAP = null;
function vMap() {
  if (VMAP) return VMAP;
  const secs = headSecs(); const hs = []; const vs = []; let acc = 0; let prev = null;
  for (const s of secs) {
    const y = s.y; const z = s.cz + s.rz + faceDeform(0, y, 0, s, 1, 0)[2];
    if (prev) acc += Math.hypot(y - prev[0], z - prev[1]);
    hs.push(y - CHIN); vs.push(acc); prev = [y, z];
  }
  VMAP = { hs, vs: vs.map((v) => v / acc) }; return VMAP;
}
const interp = (xs, ys, x) => { let i = 0; while (i < xs.length - 2 && x > xs[i + 1]) i += 1; const t = (x - xs[i]) / (xs[i + 1] - xs[i] || 1); return ys[i] + (ys[i + 1] - ys[i]) * Math.max(0, Math.min(1, t)); };
const vOfH = (h) => interp(vMap().hs, vMap().vs, h);
const hOfV = (v) => interp(vMap().vs, vMap().hs, v);
// texture px → head-space (x, height above chin)
const texToHead = (px, py) => [(px - TEX_W / 2) / PXX, hOfV(1 - py / TEX_H)];
const eyeCentrePx = (side) => [TEX_W / 2 + side * F.eyeX * PXX, TEX_H * (1 - vOfH(F.eye))];

function drawClosedEye(ctx, ex, ey, side, setId, E, happy) {
  const { hw, hgt } = EYE_SHAPE[setId]; const L = LOOK[setId];
  const c = closedEyeCurve(ex, ey, side, hw, hgt, E, happy); const [p0, p1, p2, p3] = c.pts;
  const stroke = () => { ctx.beginPath(); ctx.moveTo(...p0); ctx.bezierCurveTo(...p1, ...p2, ...p3); ctx.stroke(); };
  // soft socket, eyeshadow on the closed lid and a sheen on its curve
  radial(ctx, ex, ey - 6, hw * 1.4, hgt * 2.0, hexA('#7a4a46', 0.12));
  radial(ctx, ex + side * 6, ey - hgt * 0.55, hw * 1.2, hgt * 1.15, hexA(L.shadow, 0.42));
  radial(ctx, ex + side * hw * 0.55, ey - hgt * 0.7, hw * 0.65, hgt * 0.8, hexA(L.shadow2, 0.32));
  radial(ctx, ex, ey - hgt * 0.45, hw * 0.55, hgt * 0.4, hexA('#ffffff', 0.16));
  ctx.lineCap = 'round';
  if (!happy) { ctx.strokeStyle = hexA('#8a5048', 0.22); ctx.lineWidth = 3; // lid crease above the closed lash line
    ctx.beginPath(); ctx.moveTo(ex - side * hw * 0.7, ey - hgt * 0.55); ctx.quadraticCurveTo(ex, ey - hgt * (E.squeeze ? 0.55 : 0.85), ex + side * hw * 0.85, ey - hgt * 0.7); ctx.stroke(); }
  if (E.squeeze) for (let k = 0; k < 2; k += 1) { ctx.strokeStyle = hexA('#8a5048', 0.18); ctx.lineWidth = 2.4; // squeezed creases at the outer corner
    ctx.beginPath(); ctx.moveTo(p3[0] + side * 10, p3[1] - 14 + k * 16); ctx.quadraticCurveTo(p3[0] + side * 24, p3[1] - 4 + k * 10, p3[0] + side * 34, p3[1] - 12 + k * 22); ctx.stroke(); }
  // lash line shadow + ink (the 3D lash ridge sits on top of this)
  ctx.strokeStyle = hexA('#3a1a20', 0.28); ctx.lineWidth = 14; stroke();
  ctx.strokeStyle = '#1a0f14'; ctx.lineWidth = 5; stroke();
  if (!happy) { ctx.lineWidth = 2.6; // a few short lashes hanging from the outer half of the closed lid
    for (let i = 0; i < 5; i += 1) { const t = 0.5 + i * 0.11; const [px, py] = c.at(t); const len = (9 + i * 3) * L.lashLen;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + side * len * 0.3, py + len * 0.6, px + side * len * 0.75, py + len * 0.85); ctx.stroke(); }
  }
  if (L.liner > 0) { ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(...p3); ctx.lineTo(p3[0] + side * (6 + L.liner * 0.6), p3[1] - (happy ? -2 : 6 + L.liner * 0.25)); ctx.stroke(); }
}
function drawEye(ctx, ex, ey, side, s, rnd, setId, closed = false) {
  // Nurse has an open, welcoming gaze; the CEO gets a poised, slightly narrower cat-eye; Office sits between.
  const { hw, hgt } = EYE_SHAPE[setId];
  const inner = [ex - side * hw, ey + 6]; const outer = [ex + side * hw, ey - 6];
  const almond = () => {
    ctx.beginPath(); ctx.moveTo(inner[0], inner[1]);
    ctx.bezierCurveTo(ex - side * hw * 0.35, ey - hgt * 1.5, ex + side * hw * 0.4, ey - hgt * 1.55, outer[0], outer[1]);
    ctx.bezierCurveTo(ex + side * hw * 0.35, ey + hgt * 0.95, ex - side * hw * 0.35, ey + hgt * 1.0, inner[0], inner[1]);
    ctx.closePath();
  };
  const L = LOOK[setId];
  // socket + layered eyeshadow (light on the lid, deeper in the outer crease) + double-eyelid crease
  radial(ctx, ex, ey - 8, hw * 1.45, hgt * 2.3, hexA('#7a4a46', 0.18));
  radial(ctx, ex + side * 6, ey - hgt * 1.35, hw * 1.25, hgt * 1.0, hexA(L.shadow, 0.42));
  radial(ctx, ex + side * hw * 0.55, ey - hgt * 1.3, hw * 0.7, hgt * 0.85, hexA(L.shadow2, 0.4));
  radial(ctx, ex - side * hw * 0.85, ey - hgt * 0.6, 26, 20, hexA('#ffffff', 0.45)); // inner-corner highlight
  radial(ctx, ex + side * hw * 0.2, ey + hgt * 1.05, hw * 0.8, hgt * 0.32, hexA(L.shadow, 0.28)); // soft lower shadow
  ctx.strokeStyle = hexA('#6b3b38', 0.55); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ex - side * hw * 0.82, ey - hgt * 0.55);
  ctx.bezierCurveTo(ex - side * hw * 0.3, ey - hgt * 2.15, ex + side * hw * 0.5, ey - hgt * 2.25, ex + side * hw * 1.02, ey - hgt * 0.85); ctx.stroke();
  // sclera
  ctx.save(); almond(); ctx.clip();
  const sg = ctx.createLinearGradient(0, ey - hgt * 1.4, 0, ey + hgt);
  sg.addColorStop(0, '#d9c9c9'); sg.addColorStop(0.35, '#fbf6f4'); sg.addColorStop(1, '#efe3e1');
  ctx.fillStyle = sg; ctx.fillRect(ex - hw * 1.2, ey - hgt * 2, hw * 2.4, hgt * 3.2);
  radial(ctx, inner[0], inner[1], 22, 16, hexA('#e59a9a', 0.7)); // tear duct
  // iris
  const ir = ({ nurse01: 50, ceo01: 44, student01: 54, janitor01: 46, idol01: 54, rin01: 46, aoi01: 47, mei01: 55, yuki01: 52, kana01: 49, sakura01: 47 })[setId] ?? 47; const ix = ex + side * 1; const iy = ey - 2;
  const ig = ctx.createRadialGradient(ix, iy, 4, ix, iy, ir);
  ig.addColorStop(0, shadeHex(s.eye, 65)); ig.addColorStop(0.3, L.iris2); ig.addColorStop(0.58, s.eye); ig.addColorStop(0.9, shadeHex(s.eye, -35)); ig.addColorStop(1, s.eyeDeep);
  ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 70; i += 1) { // iris fibres
    const a = rnd() * Math.PI * 2; const r0 = 9 + rnd() * 5; const r1 = ir * (0.7 + rnd() * 0.28);
    ctx.strokeStyle = rnd() > 0.5 ? hexA(shadeHex(s.eye, 70), 0.35) : hexA(s.eyeDeep, 0.4);
    ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0); ctx.lineTo(ix + Math.cos(a) * r1, iy + Math.sin(a) * r1); ctx.stroke();
  }
  ctx.strokeStyle = hexA(s.eyeDeep, 0.85); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ix, iy, ir - 1, 0, Math.PI * 2); ctx.stroke(); // limbal ring
  ctx.fillStyle = '#0d0810'; ctx.beginPath(); ctx.arc(ix, iy, ir * 0.36, 0, Math.PI * 2); ctx.fill(); // pupil
  // lid shadow across the top of the eye + lower glow
  const ls = ctx.createLinearGradient(0, ey - hgt * 1.5, 0, ey - hgt * 0.1);
  ls.addColorStop(0, 'rgba(40,18,22,.62)'); ls.addColorStop(1, 'rgba(40,18,22,0)');
  ctx.fillStyle = ls; ctx.fillRect(ex - hw * 1.2, ey - hgt * 1.6, hw * 2.4, hgt * 1.5);
  radial(ctx, ix, iy + 16, 22, 12, hexA('#ffffff', 0.22));
  // catchlights (window + small)
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  roundedRect(ctx, ix - side * 4 - ir * 0.55, iy - ir * 0.66, ir * 0.62, ir * 0.46, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(ix + side * ir * 0.38, iy + ir * 0.36, ir * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // lash line (thick, tapered, winged) + individual lashes
  ctx.strokeStyle = '#1a0f14'; ctx.lineCap = 'round';
  if (L.liner > 0) { // tapered eyeliner wing, length per character
    ctx.fillStyle = '#1a0f14'; ctx.beginPath();
    ctx.moveTo(outer[0] - side * 18, outer[1] - 10); ctx.quadraticCurveTo(outer[0] + side * L.liner * 0.5, outer[1] - 10 - L.liner * 0.2, outer[0] + side * (8 + L.liner), outer[1] - 12 - L.liner * 0.55);
    ctx.quadraticCurveTo(outer[0] + side * L.liner * 0.3, outer[1] - 2, outer[0] - side * 22, outer[1] - 2); ctx.fill();
  }
  for (let k = 0; !closed && k < 3; k += 1) {
    ctx.lineWidth = 9 - k * 2.6;
    ctx.beginPath(); ctx.moveTo(inner[0] + side * 4, inner[1] - 3 - k);
    ctx.bezierCurveTo(ex - side * hw * 0.35, ey - hgt * (1.5 + k * 0.02), ex + side * hw * 0.4, ey - hgt * (1.55 + k * 0.02), outer[0] + side * (6 + k * 2), outer[1] - 6 - k * 2); ctx.stroke();
  }
  ctx.lineWidth = 3;
  for (let i = 0; !closed && i < L.lashes; i += 1) { // clumped lashes, longest at the outer corner
    const t = 0.4 + i / L.lashes * 0.6;
    const px = lerp(inner[0], outer[0], t); const py = ey - hgt * 1.5 * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.04)) + lerp(inner[1] - ey, outer[1] - ey, t) * 0.9;
    const len = (10 + 18 * t + rnd() * 3) * L.lashLen;
    const ang = -Math.PI / 2 + side * (0.15 + t * 0.85) + (rnd() - 0.5) * 0.12;
    ctx.beginPath(); ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + Math.cos(ang) * len * 0.55 + side * 3, py + Math.sin(ang) * len * 0.55, px + Math.cos(ang + side * 0.45) * len, py + Math.sin(ang + side * 0.45) * len); ctx.stroke();
  }

  ctx.lineWidth = 1.4; ctx.strokeStyle = hexA('#2a1a1e', 0.35);
  if (L.lowerLash && !closed) for (let i = 0; i < 5; i += 1) { // a few soft lower lashes on the outer corner (idol stage make-up)
    const t = 0.62 + i / 5 * 0.3; const px = lerp(inner[0], outer[0], t); const py = ey + hgt * 0.92 * Math.sin(Math.PI * t) + 2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + side * 4, py + (8 + rnd() * 5) * L.lashLen); ctx.stroke();
  }
  ctx.strokeStyle = hexA('#f7d6d2', 0.75); ctx.lineWidth = 3; // wet waterline
  ctx.beginPath(); ctx.moveTo(ex - side * hw * 0.6, ey + hgt * 0.72); ctx.quadraticCurveTo(ex, ey + hgt * 0.9, ex + side * hw * 0.7, ey + hgt * 0.45); ctx.stroke();
}
function drawBrow(ctx, bx, by, side, s, rnd, setId, E = EXPR.neutral) {
  const hw = 108; const [arch, lift, thickK] = LOOK[setId].brow;
  const pt = (t) => {
    const x = bx - side * hw * 0.95 + side * hw * 2.05 * t;
    const raise = (E.brow[1] + (side > 0 ? E.browRaise || 0 : 0)) * 1400;
    const y = by + 14 - lift * t - Math.sin(Math.PI * Math.pow(t, 0.85)) * arch + (t > 0.7 ? (t - 0.7) * 46 : 0) + E.brow[0] * 24 * Math.pow(1 - t, 1.3) - raise;
    return [x, y];
  };
  const thick = (t) => (15 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.08)) * (1 - t * 0.35) + 3) * thickK;
  ctx.fillStyle = hexA(s.hair, 0.28);
  ctx.beginPath(); for (let i = 0; i <= 20; i += 1) { const [x, y] = pt(i / 20); ctx.lineTo(x, y - thick(i / 20) * 0.6); }
  for (let i = 20; i >= 0; i -= 1) { const [x, y] = pt(i / 20); ctx.lineTo(x, y + thick(i / 20) * 0.6); } ctx.fill();
  ctx.lineCap = 'round';
  for (let i = 0; i < 230; i += 1) { // individual hairs
    const t = rnd(); const [x, y] = pt(t); const th = thick(t);
    const oy = (rnd() - 0.5) * th * 0.95;
    ctx.strokeStyle = hexA(shadeHex(s.hair, rnd() > 0.5 ? 20 : -10), 0.4 + rnd() * 0.45); ctx.lineWidth = 1.4 + rnd() * 1.1;
    ctx.beginPath(); ctx.moveTo(x, y + oy);
    ctx.lineTo(x + side * (7 + rnd() * 6) + (t > 0.7 ? side * 2 : 0), y + oy - 3 + (t > 0.55 ? 4 : -1)); ctx.stroke();
  }
}
// Mouth layout in face-texture pixels, shared by the painted lips and the 3D cavity so they always line up.
const lipStyle = (id) => LIP_STYLE[id] || LIP_STYLE.office01;
function mouthGeom(id, exprName) {
  const E = EXPR[exprName] || EXPR.neutral; const LS = lipStyle(id);
  const kind = E.mouth;
  const hw = LS.w * (kind === 'small' ? 0.74 : kind === 'o' ? 0.56 : 1);
  const T = 27 * LS.top * (kind === 'o' ? 0.85 : 1); const Bt = 40 * LS.bot; // upper / lower lip thickness (px)
  const lx = TEX_W / 2; const ly = TEX_H * (1 - vOfH(F.mouth));
  const cy = -E.smile * 14 - LS.corner;
  const cl = kind === 'smirk' ? cy * 0.2 : cy; const cr = kind === 'smirk' ? cy * 1.6 : cy;
  const oh = E.open * (kind === 'o' ? 64 : 54);
  const mw = hw * (kind === 'o' ? 1 : 0.86);
  const L = [lx - mw, ly + cl]; const R = [lx + mw, ly + cr];
  const topC = [lx, ly - oh * 0.7 + (cl + cr) * 0.5]; const botC = [lx, ly + oh * 1.7 + (cl + cr) * 0.25];
  const topY = 0.25 * (L[1] + R[1]) + 0.5 * topC[1]; const botY = 0.25 * (L[1] + R[1]) + 0.5 * botC[1];
  return { E, kind, LS, hw, mw, T, Bt, lx, ly, cl, cr, oh, L, R, topC, botC, topY, botY };
}
function mouthOpening(ctx, g, k = 1) {
  const sx = (p) => [g.lx + (p[0] - g.lx) * k, g.ly + (p[1] - g.ly) * k];
  const [L, R, T, Bc] = [sx(g.L), sx(g.R), sx(g.topC), sx(g.botC)];
  ctx.beginPath(); ctx.moveTo(...L); ctx.quadraticCurveTo(...T, ...R); ctx.quadraticCurveTo(...Bc, ...L); ctx.closePath();
}
// Lip outlines as path builders: the upper lip carries the cupid's bow, the lower lip its own fullness.
function lipPaths(ctx, g) {
  const { lx, ly, hw, T, Bt, L, R, LS } = g; const pk = LS.peak; const bow = LS.bow;
  const upperEdge = (y0) => { // left corner → bow peak → centre dip → bow peak → right corner
    const top = y0 - T; const dip = y0 - T * (1 - 0.3 * bow);
    ctx.moveTo(...L);
    ctx.bezierCurveTo(lx - hw * 0.72, y0 - T * 0.42, lx - hw * (pk + 0.16), top, lx - hw * pk, top);
    ctx.bezierCurveTo(lx - hw * pk * 0.5, top, lx - hw * 0.06, dip, lx, dip);
    ctx.bezierCurveTo(lx + hw * 0.06, dip, lx + hw * pk * 0.5, top, lx + hw * pk, top);
    ctx.bezierCurveTo(lx + hw * (pk + 0.16), top, lx + hw * 0.72, y0 - T * 0.42, ...R);
  };
  const parting = () => { // right corner → left corner along the line where the lips meet
    ctx.bezierCurveTo(lx + hw * 0.45, ly + 5, lx + hw * 0.15, ly + 3, lx, ly + 6);
    ctx.bezierCurveTo(lx - hw * 0.15, ly + 3, lx - hw * 0.45, ly + 5, ...L);
  };
  return {
    upper: () => { ctx.beginPath(); if (g.oh > 0) { upperEdge(g.topY - 2); ctx.quadraticCurveTo(...g.topC, ...L); } else { upperEdge(ly); parting(); } ctx.closePath(); },
    lower: () => {
      ctx.beginPath();
      if (g.oh > 0) { ctx.moveTo(...L); ctx.quadraticCurveTo(...g.botC, ...R); ctx.quadraticCurveTo(lx, g.botY + Bt * 1.1 + (g.botY - ly) * 0.4, ...L); }
      else { ctx.moveTo(L[0] + 2, L[1] + 1); ctx.bezierCurveTo(lx - hw * 0.5, ly + 4, lx + hw * 0.5, ly + 4, R[0] - 2, R[1] + 1); ctx.bezierCurveTo(lx + hw * 0.64, ly + Bt * 1.15, lx - hw * 0.64, ly + Bt * 1.15, L[0] + 2, L[1] + 1); }
      ctx.closePath();
    },
    lowerTop: g.oh > 0 ? g.botY : ly + 3, lowerBot: g.oh > 0 ? g.botY + Bt * 0.9 : ly + Bt * 0.86,
    upperTop: (g.oh > 0 ? g.topY : ly) - T, upperBot: g.oh > 0 ? g.topY : ly + 4,
  };
}
const mixHex = (a, b, t) => { // blend two #rrggbb colours → #rrggbb
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const A = p(a); const B2 = p(b);
  return `#${A.map((v, i) => Math.round(v + (B2[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};
function drawMouth(ctx, setId, E) {
  const s = STYLE[setId]; const exprName = Object.keys(EXPR).find((k) => EXPR[k] === E) || 'neutral';
  const g = mouthGeom(setId, exprName); const { lx, ly, hw, T, Bt, L, R, LS } = g; const lp = lipPaths(ctx, g);
  const col = LS.color; const fin = LS.finish; const rnd = mulberry(setId.length * 131 + 3);
  const deep = mixHex(col, '#2a0610', 0.45); const light = mixHex(col, '#ffffff', 0.28);
  const lipBase = fin === 'bare' ? mixHex(col, s.skin, 0.3) : fin === 'frost' ? mixHex(col, '#ffffff', 0.15) : fin === 'gradient' ? mixHex(col, s.skin, 0.74) : col;
  const paint = (path, y0, y1, lower) => {
    // soft edge so the colour melts into the skin, then the lip itself
    ctx.save(); path(); ctx.shadowColor = hexA(lipBase, fin === 'bare' ? 0.5 : 0.35); ctx.shadowBlur = fin === 'bare' ? 14 : 7; ctx.fillStyle = lipBase; ctx.fill(); ctx.restore();
    ctx.save(); path(); ctx.clip();
    const gr = ctx.createLinearGradient(0, y0, 0, y1);
    if (lower) { gr.addColorStop(0, mixHex(lipBase, deep, 0.55)); gr.addColorStop(0.45, mixHex(lipBase, light, 0.35)); gr.addColorStop(1, mixHex(lipBase, deep, 0.25)); }
    else { gr.addColorStop(0, mixHex(lipBase, light, 0.2)); gr.addColorStop(1, mixHex(lipBase, deep, 0.6)); }
    ctx.fillStyle = gr; ctx.fillRect(lx - hw * 1.3, y0 - 30, hw * 2.6, y1 - y0 + 60);
    if (fin === 'gradient') { // Korean ombré: saturated centre that fades out to bare edges
      radial(ctx, lx, (lower ? y0 : y1), hw * 0.66, (y1 - y0) * 1.5, hexA(col, 0.9));
      radial(ctx, lx, (lower ? y0 : y1), hw * 0.32, (y1 - y0) * 0.9, hexA(mixHex(col, '#900028', 0.3), 0.85));
    }
    if (fin === 'beni') { // traditional beni: brighter centre, a faint gold sheen on the lower lip
      radial(ctx, lx, (y0 + y1) / 2, hw * 0.4, (y1 - y0) * 0.5, hexA(mixHex(col, '#ff6060', 0.3), 0.6));
      if (lower) radial(ctx, lx, y0 + (y1 - y0) * 0.45, hw * 0.22, (y1 - y0) * 0.22, hexA('#e8c068', 0.3));
    }
    for (const p of [L, R]) radial(ctx, p[0], p[1], hw * 0.28, (y1 - y0) * 0.9, hexA(deep, 0.45)); // corners tuck in
    if (fin === 'matte' || fin === 'bare' || fin === 'beni') { // fine vertical lip lines
      ctx.lineWidth = 1.4; ctx.strokeStyle = hexA(deep, fin === 'bare' ? 0.1 : 0.14);
      for (let i = 0; i < 16; i += 1) { const x = lx - hw * 0.8 + hw * 1.6 * (i / 15) + (rnd() - 0.5) * 6; ctx.beginPath(); ctx.moveTo(x, y0 + (y1 - y0) * 0.15); ctx.lineTo(x + (rnd() - 0.5) * 4, y1 - (y1 - y0) * 0.15); ctx.stroke(); }
    }
    const shine = { gloss: 0.75, gradient: 0.6, frost: 0.45, satin: 0.32, beni: 0.12, bare: 0.12, matte: 0.04 }[fin];
    if (lower) {
      radial(ctx, lx - hw * 0.12, y0 + (y1 - y0) * 0.42, hw * 0.4, (y1 - y0) * 0.2, hexA('#ffffff', shine));
      if (fin === 'gloss' || fin === 'gradient') { radial(ctx, lx - hw * 0.1, y0 + (y1 - y0) * 0.4, hw * 0.16, (y1 - y0) * 0.07, hexA('#ffffff', 0.9)); radial(ctx, lx + hw * 0.3, y0 + (y1 - y0) * 0.5, hw * 0.07, (y1 - y0) * 0.05, hexA('#ffffff', 0.8)); }
    } else radial(ctx, lx - hw * 0.28, y0 + (y1 - y0) * 0.5, hw * 0.2, (y1 - y0) * 0.16, hexA('#ffffff', shine * 0.7));
    if (fin === 'frost' || LS.glitter) for (let i = 0; i < 32; i += 1) { // fine shimmer, densest where the light hits
      const t = rnd(); ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.55)' : 'rgba(255,220,240,.45)';
      ctx.beginPath(); ctx.arc(lx + (rnd() - 0.5) * hw * (0.6 + t), y0 + (0.25 + rnd() * 0.5) * (y1 - y0), 0.6 + rnd() * 0.9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (LS.liner) { ctx.save(); path(); ctx.strokeStyle = hexA(LS.liner, 0.55); ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
  };
  if (g.oh > 0) { ctx.fillStyle = "#3a0c16"; mouthOpening(ctx, g, 1); ctx.fill(); } // dark gap (cut out later for the 3D cavity)
  paint(lp.upper, lp.upperTop, lp.upperBot, false);
  paint(lp.lower, lp.lowerTop, lp.lowerBot, true);
  if (g.oh <= 0) { // the line where the lips meet
    ctx.strokeStyle = hexA(mixHex(col, '#2a0610', 0.7), fin === 'bare' ? 0.6 : 0.85); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(...L); ctx.bezierCurveTo(lx - hw * 0.4, ly + 6, lx + hw * 0.4, ly + 6, ...R); ctx.stroke();
    for (const [p, sgn] of [[L, -1], [R, 1]]) if (g.E.smile > 0.3) { // little smile dimples at the corners
      ctx.lineWidth = 2.4; ctx.strokeStyle = hexA('#8a3a3e', 0.35); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(p[0] + sgn * 8, p[1] - 4, p[0] + sgn * 10, p[1] - 12); ctx.stroke();
    }
  }
  radial(ctx, lx, lp.upperTop - 3, hw * 0.16, 6, hexA('#ffffff', 0.22)); // cupid's bow highlight on the skin
  radial(ctx, lx, lp.lowerBot + 22, hw * 0.5, 15, hexA('#7a4a40', 0.18)); // shadow above the chin
}
function drawFaceSurface(ctx, W, H, setId, expr) { // roughness map: green = roughness (skin 0.48), blue = metallic 0
  ctx.fillStyle = 'rgb(0,122,0)'; ctx.fillRect(0, 0, W, H);
  const g = mouthGeom(setId, expr); const r = { gloss: 0.1, gradient: 0.16, frost: 0.2, satin: 0.27, beni: 0.4, bare: 0.4, matte: 0.62 }[g.LS.finish] ?? 0.48;
  ctx.save(); ctx.scale(W / TEX_W, H / TEX_H); const lp = lipPaths(ctx, g);
  ctx.fillStyle = `rgb(0,${Math.round(r * 255)},0)`; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 3;
  lp.upper(); ctx.fill(); lp.lower(); ctx.fill();
  if (g.oh <= 0) { // the crease where the lips meet stays satin so it doesn't catch a hard highlight
    const { lx, ly, hw, L, R } = g; ctx.shadowBlur = 0; ctx.strokeStyle = 'rgb(0,122,0)'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(...L); ctx.bezierCurveTo(lx - hw * 0.4, ly + 6, lx + hw * 0.4, ly + 6, ...R); ctx.stroke();
  }
  ctx.restore();
}
function radial(ctx, x, y, rx, ry, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, color); g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function lerp(a, b, t) { return a + (b - a) * t; }
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shadeHex(color, amount) {
  const n = parseInt(color.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v));
  return `rgb(${c((n >> 16) + amount)},${c(((n >> 8) & 255) + amount)},${c((n & 255) + amount)})`;
}
function hexA(color, alpha) {
  if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
  const n = parseInt(color.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// ======================================================================================================
// Loft helpers
// ======================================================================================================
const spow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (v, c, w) => Math.exp(-(((v - c) / w) ** 2));

function crom(p, t) {
  const n = p.length; const i = Math.max(0, Math.min(n - 2, Math.floor(t))); const f = t - i;
  const p0 = p[Math.max(i - 1, 0)]; const p1 = p[i]; const p2 = p[Math.min(i + 1, n - 1)]; const p3 = p[Math.min(i + 2, n - 1)];
  return 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}
// keys: [{y,cx,cz,rx,rz,n}] ordered along y. Returns `count` sections at uniform y with smooth profiles.
function sectionsFrom(keys, count) {
  const props = ['y', 'cx', 'cz', 'rx', 'rz', 'n'];
  const arr = Object.fromEntries(props.map((k) => [k, keys.map((s) => (s[k] ?? (k === 'n' ? 2.2 : k === 'cx' || k === 'cz' ? 0 : 0)))]));
  const dense = []; const steps = 40;
  for (let i = 0; i < (keys.length - 1) * steps; i += 1) { const t = i / steps; dense.push(Object.fromEntries(props.map((k) => [k, crom(arr[k], t)]))); }
  dense.push(Object.fromEntries(props.map((k) => [k, arr[k][keys.length - 1]])));
  const y0 = dense[0].y; const y1 = dense[dense.length - 1].y; const out = [];
  let j = 0;
  for (let k = 0; k < count; k += 1) {
    const y = y0 + (y1 - y0) * (k / (count - 1));
    while (j < dense.length - 2 && ((y1 > y0 && dense[j + 1].y < y) || (y1 < y0 && dense[j + 1].y > y))) j += 1;
    const a = dense[j]; const b = dense[j + 1]; const t = Math.abs(b.y - a.y) < 1e-9 ? 0 : (y - a.y) / (b.y - a.y);
    out.push(Object.fromEntries(props.map((p) => [p, p === 'y' ? y : lerp(a[p], b[p], Math.max(0, Math.min(1, t)))])));
  }
  return out;
}

class Sculptor {
  // detail < 1 builds a low-poly copy (LOD): ring/segment counts scale by `detail`, lofts keep every n-th section.
  constructor(kit, scene, setId, ghost, expr, detail = 1) {
    this.kit = kit; this.scene = scene; this.setId = setId; this.ghost = ghost; this.groups = new Map(); this.expr = expr;
    this.style = STYLE[setId]; this.detail = detail;
  }
  res(n, min) { return this.detail >= 1 ? n : Math.max(min, Math.round(n * this.detail)); }
  thin(secs) { // keep every n-th loft section (always the first and the last) for low-poly copies
    if (this.detail >= 1 || secs.length < 6) return secs;
    const step = Math.max(1, Math.round(1 / this.detail));
    return secs.filter((_, i) => i % step === 0 || i === secs.length - 1);
  }
  addMesh(mesh, kind) {
    const key = this.ghost ? 'holo' : kind;
    if (!this.groups.has(key)) this.groups.set(key, []);
    this.groups.get(key).push(mesh); return mesh;
  }
  // Generic placed primitive (small hardware details only).
  prim(mesh, kind, pos = [0, 0, 0], rot = [0, 0, 0]) { mesh.position.set(...pos); mesh.rotation.set(...rot); return this.addMesh(mesh, kind); }
  box(kind, pos, size, rot) { return this.prim(B().MeshBuilder.CreateBox('b', { width: size[0], height: size[1], depth: size[2] }, this.scene), kind, pos, rot); }
  cyl(kind, pos, h, dTop, dBot, rot, tess = 24) { return this.prim(B().MeshBuilder.CreateCylinder('c', { height: h, diameterTop: dTop, diameterBottom: dBot, tessellation: this.res(tess, 6) }, this.scene), kind, pos, rot); }
  torus(kind, pos, dia, thick, rot, tess = 24) { return this.prim(B().MeshBuilder.CreateTorus('t', { diameter: dia, thickness: thick, tessellation: this.res(tess, 8) }, this.scene), kind, pos, rot); }
  ell(kind, pos, dia, rot, seg = 14) { return this.prim(B().MeshBuilder.CreateSphere('e', { diameterX: dia[0], diameterY: dia[1], diameterZ: dia[2], segments: this.res(seg, 4) }, this.scene), kind, pos, rot); }
  // Tapered tube through control points.
  strand(kind, points, r0, r1, tess = 10, samples = 24) {
    const BAB = B(); tess = this.res(tess, 4); samples = this.res(samples, 3);
    const curve = BAB.Curve3.CreateCatmullRomSpline(points.map((p) => new BAB.Vector3(p[0], p[1], p[2])), samples, false).getPoints();
    const last = curve.length - 1;
    const mesh = BAB.MeshBuilder.CreateTube('s', {
      path: curve, tessellation: tess, cap: BAB.Mesh.CAP_ALL,
      radiusFunction: (i) => r0 + (r1 - r0) * Math.pow(i / last, 0.85),
    }, this.scene);
    return this.addMesh(mesh, kind);
  }
  // Lofted surface along Y. `secs` from sectionsFrom(). opts: offset (outward), deform(x,y,z,sec), N ring points, flip, cap.
  loft(kind, secs, { offset = 0, deform = null, N = 56, flip = false, caps = false } = {}) {
    const BAB = B(); N = this.res(N, 10); secs = this.thin(secs);
    const paths = secs.map((s) => {
      const pts = [];
      for (let k = 0; k < N; k += 1) {
        const a = Math.PI + (2 * Math.PI * k) / N; const c = Math.cos(a); const sn = Math.sin(a);
        const rx = Math.max(0.002, s.rx + offset); const rz = Math.max(0.002, s.rz + offset);
        let x = s.cx + rx * spow(sn, 2 / s.n); let y = s.y; let z = s.cz + rz * spow(c, 2 / s.n);
        if (deform) { const d = deform(x, y, z, s, (z - s.cz) / rz, (x - s.cx) / rx); x = d[0]; y = d[1]; z = d[2]; }
        pts.push(new BAB.Vector3(x, y, z));
      }
      if (secs[0].y > secs[secs.length - 1].y) pts.reverse(); // ribbon winding depends on path direction: keep faces outward
      return pts;
    });
    void flip;
    const mesh = BAB.MeshBuilder.CreateRibbon('l', { pathArray: paths, closePath: true, sideOrientation: BAB.Mesh.DEFAULTSIDE }, this.scene);
    this.addMesh(mesh, kind);
    if (caps) for (const s of [secs[0], secs[secs.length - 1]]) this.cap(kind, s, offset, s === secs[0] ? -1 : 1);
    return mesh;
  }
  cap(kind, s, offset, dir) {
    const d = B().MeshBuilder.CreateDisc('cap', { radius: 1, tessellation: 32, sideOrientation: B().Mesh.DOUBLESIDE }, this.scene);
    d.scaling.set(s.rx + offset, s.rz + offset, 1); d.rotation.x = Math.PI / 2; d.position.set(s.cx, s.y, s.cz);
    void dir; return this.addMesh(d, kind);
  }
  // Loft along an arbitrary 3D path with elliptical sections. radius(t) -> [ra, rb]; ra lies along `up`
  // (projected off the tangent), rb along the binormal. Parallel transport keeps sections from twisting.
  path(kind, ctrl, radius, { up = [0, 0, 1], t0 = 0, t1 = 1, offset = 0, N = 22, samples = 12, close = true } = {}) {
    const BAB = B(); const V = BAB.Vector3; N = this.res(N, 6); samples = this.res(samples, 3);
    const pts = BAB.Curve3.CreateCatmullRomSpline(ctrl.map((p) => new V(p[0], p[1], p[2])), samples, false).getPoints();
    const cum = [0]; for (let i = 1; i < pts.length; i += 1) cum.push(cum[i - 1] + V.Distance(pts[i], pts[i - 1]));
    const L = cum[cum.length - 1];
    const tan = pts.map((p, i) => pts[Math.min(i + 1, pts.length - 1)].subtract(pts[Math.max(i - 1, 0)]).normalize());
    let n = new V(up[0], up[1], up[2]); n = n.subtract(tan[0].scale(V.Dot(n, tan[0]))).normalize();
    const frames = [];
    for (let i = 0; i < pts.length; i += 1) {
      if (i > 0) { n = n.subtract(tan[i].scale(V.Dot(n, tan[i]))); if (n.length() < 1e-6) n = frames[i - 1].n.clone(); n.normalize(); }
      frames.push({ n: n.clone(), b: V.Cross(tan[i], n).normalize() });
    }
    const rings = [];
    for (let i = 0; i < pts.length; i += 1) {
      const t = L ? cum[i] / L : 0; if (t < t0 - 1e-6 || t > t1 + 1e-6) continue;
      const [ra, rb] = radius(t); const ring = [];
      for (let k = 0; k < N; k += 1) {
        const a = (2 * Math.PI * k) / N;
        ring.push(pts[i].add(frames[i].n.scale((ra + offset) * Math.cos(a))).add(frames[i].b.scale((rb + offset) * Math.sin(a))));
      }
      rings.push(ring);
    }
    if (rings.length < 2) return null; // band narrower than one sample step: nothing to draw
    if (close && rings.length) { // rounded end caps
      const capRing = (ring, centre, shrink) => ring.map((p) => centre.add(p.subtract(centre).scale(shrink)));
      const c0 = rings[0].reduce((a, p) => a.add(p), V.Zero()).scale(1 / N); const c1 = rings[rings.length - 1].reduce((a, p) => a.add(p), V.Zero()).scale(1 / N);
      const d0 = tan[0].scale(-1); const d1 = tan[tan.length - 1];
      const r0 = V.Distance(rings[0][0], c0) * 0.5; const r1 = V.Distance(rings[rings.length - 1][0], c1) * 0.5;
      rings.unshift(capRing(rings[0], c0.add(d0.scale(r0)), 0.02), capRing(rings[0], c0.add(d0.scale(r0 * 0.75)), 0.6));
      rings.push(capRing(rings[rings.length - 1], c1.add(d1.scale(r1 * 0.75)), 0.6), capRing(rings[rings.length - 1], c1.add(d1.scale(r1)), 0.02));
    }
    for (const ring of rings) ring.reverse();
    return this.addMesh(BAB.MeshBuilder.CreateRibbon('p', { pathArray: rings, closePath: true }, this.scene), kind);
  }
  // Lofted surface along Z (shoes): sections {z,cx,cy,rx,ry}.
  loftZ(kind, secs, N = 28, flip = false) {
    const BAB = B(); N = this.res(N, 8);
    const paths = secs.map((s) => {
      const pts = [];
      for (let k = 0; k < N; k += 1) { const a = (2 * Math.PI * k) / N; pts.push(new BAB.Vector3(s.cx + s.rx * Math.cos(a), s.cy + s.ry * Math.sin(a), s.z)); }
      return pts;
    });
    void flip;
    return this.addMesh(BAB.MeshBuilder.CreateRibbon('lz', { pathArray: paths, closePath: true }, this.scene), kind);
  }
  build(name, origin) {
    const BAB = B();
    const root = new BAB.TransformNode(name, this.scene);
    for (const [key, meshes] of this.groups) {
      const merged = BAB.Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
      merged.name = `${name}:${key}`;
      merged.material = key === 'holo' ? this.kit.holoMaterial(this.setId) : this.kit.materialFor(this.setId, key === 'face' ? `face@${this.expr}` : key);
      merged.isPickable = false; merged.parent = root; merged.metadata = { kind: key };
      merged.position.set(-origin[0], -origin[1], -origin[2]);
    }
    return root;
  }
}

// ======================================================================================================
// Anatomy profiles (figure space, total height ≈ 4.2)
// ======================================================================================================
const CHIN = 3.57; // y of the chin tip
// Head sections are written in head space (y from the chin) and lifted by CHIN.
const HEAD_KEYS = [
  { y: 0.0, cz: 0.13, rx: 0.035, rz: 0.03, n: 2 },
  { y: 0.03, cz: 0.108, rx: 0.088, rz: 0.072, n: 2.1 },
  { y: 0.08, cz: 0.066, rx: 0.138, rz: 0.136, n: 2.2 },
  { y: 0.15, cz: 0.03, rx: 0.17, rz: 0.186, n: 2.25 },
  { y: 0.25, cz: 0.0, rx: 0.19, rz: 0.218, n: 2.3 },
  { y: 0.36, cz: -0.015, rx: 0.2, rz: 0.235, n: 2.3 },
  { y: 0.46, cz: -0.025, rx: 0.198, rz: 0.238, n: 2.3 },
  { y: 0.54, cz: -0.032, rx: 0.165, rz: 0.222, n: 2.2 },
  { y: 0.585, cz: -0.035, rx: 0.095, rz: 0.16, n: 2.1 },
  { y: 0.6, cz: -0.035, rx: 0.02, rz: 0.04, n: 2 },
].map((k) => ({ ...k, y: k.y + CHIN }));
const HEAD_SECS_CACHE = { secs: null };
const headSecs = () => (HEAD_SECS_CACHE.secs ||= sectionsFrom(HEAD_KEYS, 96));
function headSurfaceZ(y, x) { // front surface z of the (undeformed) face at height y
  const secs = headSecs(); let best = secs[0];
  for (const s of secs) if (Math.abs(s.y - y) < Math.abs(best.y - y)) best = s;
  const t = Math.min(0.999, Math.abs(x) / best.rx);
  return best.cz + best.rz * Math.pow(Math.max(0, 1 - Math.pow(t, best.n)), 1 / best.n);
}
// Feature heights above the chin (head space). The painted face texture uses the same numbers.
const F = { eye: 0.27, eyeX: 0.086, brow: 0.335, noseTip: 0.192, mouth: 0.104 };
// Face relief. `sh` is the preset's face shape (SHAPE) and `mx` the mouth layout of the current expression (mouthGeom):
// both only touch the lower face, so the eyes, brows and hairline stay exactly where the hair and lids expect them.
function faceDeformFor(sh, mx, shut) {
  const S = sh || { jaw: 1, chin: 1, nose: 1, lips: 1 };
  return (x, y, z, s, zf, xf) => {
    const h = y - CHIN; // height above chin
    const front = Math.max(0, zf);
    let dz = 0; let dx = 0;
    dz += 0.01 * gauss(h, F.brow, 0.03) * front * (1 - Math.abs(xf) * 0.6); // soft brow ridge
    if (shut && shut[x < 0 ? 0 : 1]) { // a fully closed eye: no eyeball behind it, the lid is part of the face skin
      dz -= 0.003 * gauss(h, F.eye, 0.026) * front * gauss(Math.abs(x), F.eyeX, 0.042);
      dz += 0.0042 * gauss(h, F.eye + 0.004, 0.018) * front * gauss(Math.abs(x), F.eyeX, 0.034); // soft convex lid
    } else dz -= 0.011 * gauss(h, F.eye, 0.026) * front * gauss(Math.abs(x), F.eyeX, 0.042); // eye sockets (lids wrap the eyeballs)
    dz += 0.009 * gauss(h, 0.18, 0.05) * front * gauss(Math.abs(x), 0.1, 0.05); // full apple cheeks
    dx += Math.sign(x) * 0.004 * gauss(h, 0.22, 0.05) * Math.max(0, 1 - front);
    dx += x * (S.jaw - 1) * smooth(0.25, 0.06, h); // jaw width
    dz += 0.01 * S.chin * gauss(h, 0.03, 0.028) * front * gauss(x, 0, 0.05); // chin
    // nose: low bridge, soft upturned tip, narrow wings
    dz += S.nose * 0.011 * gauss(h, 0.245, 0.055) * gauss(x, 0, 0.016) * front;
    dz += S.nose * 0.012 * gauss(h, F.noseTip + 0.004, 0.024) * gauss(x, 0, 0.024) * front;
    dz += S.nose * 0.006 * gauss(h, F.noseTip - 0.004, 0.016) * gauss(Math.abs(x), 0.026, 0.011) * front;
    dz += 0.004 * gauss(h, 0.15, 0.03) * gauss(x, 0, 0.04) * front; // fill under the nose so it doesn't shadow
    // lips follow the expression: they part around the mouth opening and the cheeks lift with a smile
    const LP = S.lip || { w: 100, top: 1, bot: 1 }; const lw = LP.w / 100;
    const up = mx && mx.open ? mx.hTop + 0.008 : F.mouth + 0.004 + 0.008 * LP.top; const lo = mx && mx.open ? mx.hBot - 0.01 : F.mouth - 0.004 - 0.009 * LP.bot;
    dz += 0.0035 * (0.5 + 0.55 * LP.top) * gauss(h, up, 0.012 * (0.8 + 0.25 * LP.top)) * gauss(x, 0, 0.042 * lw) * front;
    dz += (mx && mx.open ? 0.005 : 0.009) * (0.45 + 0.6 * LP.bot) * gauss(h, lo, 0.014 * (0.8 + 0.25 * LP.bot)) * gauss(x, 0, 0.038 * lw) * front;
    if (!mx || !mx.open) dz -= 0.0025 * gauss(h, F.mouth, 0.004) * gauss(x, 0, 0.05 * lw) * front;
    if (mx && mx.smile > 0) dz += 0.004 * mx.smile * gauss(h, 0.19, 0.03) * gauss(Math.abs(x), 0.1, 0.04) * front; // cheeks rise
    return [x + dx, y, z + dz];
  };
}
const faceDeform = faceDeformFor(null, null);
const TORSO_KEYS = [
  { y: 3.64, cz: -0.03, rx: 0.1, rz: 0.096, n: 2 },
  { y: 3.52, cz: -0.03, rx: 0.103, rz: 0.098, n: 2 },
  { y: 3.46, cz: -0.025, rx: 0.13, rz: 0.114, n: 2.1 },
  { y: 3.42, cz: -0.015, rx: 0.23, rz: 0.145, n: 2.4 },
  { y: 3.36, cz: -0.005, rx: 0.34, rz: 0.165, n: 2.6 },
  { y: 3.28, cz: 0.0, rx: 0.385, rz: 0.18, n: 2.5 },
  { y: 3.15, cz: 0.0, rx: 0.35, rz: 0.2, n: 2.3 },
  { y: 3.02, cz: 0.0, rx: 0.325, rz: 0.21, n: 2.2 },
  { y: 2.88, cz: 0.0, rx: 0.3, rz: 0.2, n: 2.2 },
  { y: 2.74, cz: 0.0, rx: 0.262, rz: 0.18, n: 2.2 },
  { y: 2.6, cz: 0.0, rx: 0.236, rz: 0.166, n: 2.2 },
  { y: 2.48, cz: -0.005, rx: 0.275, rz: 0.19, n: 2.2 },
  { y: 2.35, cz: -0.01, rx: 0.355, rz: 0.238, n: 2.25 },
  { y: 2.22, cz: -0.012, rx: 0.398, rz: 0.265, n: 2.3 },
  { y: 2.1, cz: -0.01, rx: 0.395, rz: 0.256, n: 2.3 },
  { y: 1.98, cz: -0.005, rx: 0.36, rz: 0.23, n: 2.3 },
];
function bodyDeform(amp, buttAmp) {
  // Bust: a broad, smooth teardrop (gentle slope above, rounded underside) blended across the chest,
  // so lighting stays soft instead of forming dark rings.
  const vert = (y) => (y > 3.0 ? Math.exp(-(((y - 3.0) / 0.2) ** 2)) : Math.exp(-(((y - 3.0) / 0.1) ** 2)));
  return (x, y, z, s, zf) => {
    const front = Math.pow(Math.max(0, zf), 1.3); const back = Math.max(0, -zf);
    const across = 0.55 * gauss(Math.abs(x), 0.12, 0.1) + 0.45 * gauss(x, 0, 0.2);
    let dz = amp * vert(y) * across * front;
    dz -= buttAmp * gauss(y, 2.25, 0.12) * gauss(Math.abs(x), 0.13, 0.14) * back;
    return [x, y, z + dz];
  };
}
// Collapse ring vertices onto a trim curve so a loft ends in a shaped edge (necklines, hairlines).
function trimmed(base, trimY, keepAbove = false) { return (x, y, z, s, zf, xf) => { const d = base ? base(x, y, z, s, zf, xf) : [x, y, z]; const ty = trimY(d[0], d[2], zf, xf); if (ty === null) return d; return keepAbove ? (d[1] < ty ? [d[0], ty, d[2]] : d) : (d[1] > ty ? [d[0], ty, d[2]] : d); }; }
const sliceY = (secs, hi, lo) => secs.filter((s) => s.y <= hi + 1e-6 && s.y >= lo - 1e-6);

// ======================================================================================================
// Parts
// ======================================================================================================
export function buildStatuePart(kit, scene, partId, setId, ghost = false, expr = DEFAULT_EXPR[setId] || 'neutral', detail = 1) {
  const sc = new Sculptor(kit, scene, setId, ghost, expr, detail);
  ({ head: sculptHead, torso: sculptTorso, armL: (s, id) => sculptArm(s, id, -1), armR: (s, id) => sculptArm(s, id, 1), legs: sculptLegs })[partId](sc, setId);
  return sc.build(`${setId}-${partId}${ghost ? '-holo' : ''}`, PART_OFFSET[partId]);
}
// Studio bust: the full sculpted head (with its expression) on the upper torso of the preset.
export function buildBust(kit, scene, setId, expr) {
  const BAB = B(); const root = new BAB.TransformNode(`bust-${setId}`, scene);
  for (const partId of ['head', 'torso']) {
    const part = buildStatuePart(kit, scene, partId, setId, false, expr);
    part.parent = root; part.position.set(...PART_OFFSET[partId]);
  }
  return root;
}

function sculptHead(sc, id) {
  const st = sc.style;
  // neck stub (slightly inside the torso neck so the join is seamless) + skull/face
  const neck = sectionsFrom([{ y: CHIN - 0.34, cz: -0.03, rx: 0.094, rz: 0.09, n: 2 }, { y: CHIN - 0.1, cz: -0.03, rx: 0.094, rz: 0.09, n: 2 }, { y: CHIN + 0.1, cz: -0.02, rx: 0.094, rz: 0.09, n: 2 }], 8);
  sc.loft('skin', neck, { N: 28 });
  const E = EXPR[sc.expr] || EXPR.neutral;
  const mg = mouthGeom(id, sc.expr);
  const mx = { open: mg.oh > 0, smile: E.smile, hTop: texToHead(mg.lx, mg.topY)[1], hBot: texToHead(mg.lx, mg.botY)[1] };
  sc.faceDef = faceDeformFor({ ...SHAPE[id], lip: lipStyle(id) }, mx, shutEyes(EXPR[sc.expr] || EXPR.neutral));
  sc.faceMesh = sc.loft('face', headSecs(), { N: 120, deform: sc.faceDef, flip: false });
  if (mg.oh > 0) { // mouth cavity with teeth and tongue, inside the head behind the opening
    const w = (mg.mw / PXX) * 0.9; const yT = CHIN + mx.hTop; const yB = CHIN + mx.hBot; const yc = (yT + yB) / 2; const hh = Math.max(0.006, (yT - yB) / 2);
    const zs = headSurfaceZ(yc, 0) + faceDeform(0, yc, 0, null, 1, 0)[2];
    sc.ell('mouthIn', [0, yc, zs - 0.036], [w * 2.4, hh * 3.2 + 0.02, 0.064], [0, 0, 0], 20);
    if (mg.kind !== 'o') sc.ell('teeth', [0, yT - Math.min(0.005, hh * 0.3), zs - 0.02], [w * 1.6, Math.min(0.011, hh * 0.7), 0.016], [0, 0, 0], 16);
    sc.ell('tongue', [0, yB - 0.006, zs - 0.042], [w * 1.1, 0.012, 0.016], [0, 0, 0], 16); // tongue rests low and deep in the mouth
  }
  if (E.tears) for (const side of [-1, 1]) { // glossy 3D tears running from the outer eye down the cheek
    const pts = []; for (let k = 0; k <= 8; k += 1) { const h = F.eye - 0.035 - k * 0.016; const x = side * (F.eyeX + 0.018 + k * 0.002); const y = CHIN + h; pts.push([x, y, headSurfaceZ(y, x) + sc.faceDef(x, y, 0, null, 1, x / 0.19)[2] + 0.004]); }
    sc.strand('tear', pts, 0.005, 0.008, 8, 4);
    const [tx, ty, tz] = pts[pts.length - 1]; sc.ell('tear', [tx, ty - 0.008, tz + 0.002], [0.02, 0.026, 0.014], [0, 0, 0], 12);
    for (const [dx, dh, r] of [[0.018, -0.032, 0.0085], [-0.05, -0.012, 0.0055]]) { const x = side * (F.eyeX + dx); const y = CHIN + F.eye + dh; sc.ell('tear', [x, y, headSurfaceZ(y, x) + sc.faceDef(x, y, 0, null, 1, x / 0.19)[2] + r * 0.4], [r * 1.1, r * 1.25, r * 0.8], [0, 0, 0], 12); } // a drop where the streak starts and one at the inner corner
  }
  // ears
  for (const side of [-1, 1]) sc.loft('skin', sectionsFrom([{ y: CHIN + 0.2, cx: side * 0.182, cz: -0.012, rx: 0.006, rz: 0.012 }, { y: CHIN + 0.26, cx: side * 0.188, cz: -0.012, rx: 0.011, rz: 0.03 }, { y: CHIN + 0.32, cx: side * 0.186, cz: -0.012, rx: 0.008, rz: 0.026 }, { y: CHIN + 0.35, cx: side * 0.182, cz: -0.012, rx: 0.003, rz: 0.008 }], 8), { N: 14 });
  eyes(sc, id);
  hairFor(sc, id, st);
}
// Eyes: 3D eyeballs (sclera, domed iris, glossy cornea) behind the lid opening, with 3D upper and lower eyelid shells
// that slide over the eyeball for each expression, and a 3D lash line riding on the lid edge.
function eyes(sc, id) {
  const BAB = B(); const { hw, hgt } = EYE_SHAPE[id]; const E = EXPR[sc.expr] || EXPR.neutral; const L = LOOK[id];
  const shut = shutEyes(E); const def = sc.faceDef || faceDeform;
  for (const side of [-1, 1]) {
    const ex = side * F.eyeX; const ey = CHIN + F.eye;
    if (shut[side > 0 ? 1 : 0]) {
      const happy = E.happy && E.happy[side > 0 ? 1 : 0];
      const [cxp, cyp] = eyeCentrePx(side); const c = closedEyeCurve(cxp, cyp, side, hw, hgt, E, happy);
      const onSkin = (px, py, lift) => (sc.faceMesh && meshPointAtTex(sc.faceMesh, px, py, lift)) || (() => {
        const [x, h] = texToHead(px, py); const y = CHIN + h; return [x, y, headSurfaceZ(y, x) + def(x, y, 0, null, 1, x / 0.19)[2] + lift]; })();
      const pts = []; for (let i = 0; i <= 16; i += 1) pts.push(onSkin(...c.at(0.03 + 0.97 * (i / 16)), 0.0022));
      const [ox, oy] = c.pts[3]; pts.push(onSkin(ox + side * (10 + L.liner * 0.4), oy + (happy ? 4 : -4), 0.0016));
      const lashW = (t) => { const w = (0.0011 + 0.0028 * Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.06))) * (0.85 + 0.2 * L.lashLen); return [w * 0.5, w]; };
      sc.path('lash', pts, lashW, { up: [0, 0, 1], N: 6, samples: 4 });
      continue;
    }
    const skin = headSurfaceZ(ey, ex) + faceDeform(ex, ey, 0, null, 1, ex / 0.19)[2];
    const R = 0.062; const cz = skin - 0.004 - R * 0.85; const ecy = ey + 0.002; const rot = side * 0.12;
    sc.ell('sclera', [ex, ecy, cz], [R * 2.15, R * 1.7, R * 1.7], [0, rot, 0], 32);
    const front = cz + R * 0.85;
    const look = E.look || [0, 0]; const gx = ex + side * 0.002 + look[0] * 0.009; const gy = ey + 0.004 + look[1] * 0.007;
    const ir = 0.031 * (E.iris || 1);
    const disc = BAB.MeshBuilder.CreateDisc('iris', { radius: ir, tessellation: 40, sideOrientation: BAB.Mesh.DOUBLESIDE, updatable: true }, sc.scene);
    const dp = disc.getVerticesData('position'); // dome the iris slightly so it follows the eyeball
    for (let k = 0; k < dp.length; k += 3) { const r2 = (dp[k] ** 2 + dp[k + 1] ** 2) / (ir * ir); dp[k + 2] = 0.0035 * (1 - r2); }
    disc.updateVerticesData('position', dp);
    const irisHidden = Math.max(0, E.lid[side > 0 ? 1 : 0]) >= 0.6; // a mostly closed lid hides the iris completely
    if (irisHidden) disc.dispose(); else {
      sc.prim(disc, 'iris', [gx, gy, front - 0.002 - Math.abs(look[0]) * 0.002], [0, 0, 0]);
      sc.ell('cornea', [gx, gy, front], [ir * 2.3, ir * 2.3, ir * 0.45], [0, 0, 0], 24);
    }

    // lid shells: points on a shell just outside the eyeball, from the pole down to the lid edge elevation
    const a = R * 1.075 * 1.04; const b = R * 0.85 * 1.06; const c = R * 0.85 + 0.0034;
    const at = (az, el, k = 1) => { const x = a * k * Math.cos(el) * Math.sin(az); const y = b * k * Math.sin(el); const z = c * k * Math.cos(el) * Math.cos(az);
      return new BAB.Vector3(ex + x * Math.cos(rot) + z * Math.sin(rot), ecy + y, cz - x * Math.sin(rot) + z * Math.cos(rot)); };
    const [cxp, cyp] = eyeCentrePx(side); const curve = eyeCurves(cxp, cyp, side, hw, hgt);
    const topH = texToHead(...curve.upper(0.5))[1];
    const openEl = Math.asin(Math.max(-1, Math.min(1, (CHIN + topH - ecy) / b))) + 0.14;
    const k = E.lid[side > 0 ? 1 : 0]; const closure = Math.max(0, k);
    const happy = E.happy && E.happy[side > 0 ? 1 : 0]; const deg = Math.PI / 180;
    const inner = (az) => -side * Math.sin(az); // > 0 toward the nose
    const upperEl = (az) => {
      let e = lerp(openEl, -6 * deg, closure);
      if (happy) e += closure * (26 * Math.cos(az * 1.35) - 18) * deg; // ^ ^ smiling closed eyes
      if (E.squeeze) e += closure * (-7 * Math.cos(az) - 2) * deg; // tightly shut
      e -= (E.tilt || 0) * deg * inner(az) * (1 - closure * 0.6);
      return e;
    };
    const lowerEl = (az) => (closure > 0.9 ? upperEl(az) - 3 * deg : (E.low ?? -40) * deg);
    const AZ = 22; const rowsU = []; const rowsL = [];
    for (let i = 0; i <= AZ; i += 1) {
      const az = -1.75 + 3.5 * (i / AZ);
      const eu = upperEl(az); const el0 = lowerEl(az); const ru = []; const rl = [];
      for (let j = 0; j <= 8; j += 1) { ru.push(at(az, lerp(Math.PI / 2, eu, j / 8))); rl.push(at(az, lerp(-Math.PI / 2, el0, j / 8))); }
      rowsU.push(ru); rowsL.push(rl);
    }
    for (const rows of [rowsU, rowsL]) sc.addMesh(BAB.MeshBuilder.CreateRibbon('lid', { pathArray: rows, sideOrientation: BAB.Mesh.DOUBLESIDE }, sc.scene), 'lid');

    // lash line: on the lid edge once the lid lowers into view, otherwise along the open lid contour on the skin
    const lashW = (t) => { const w = (0.0016 + 0.0042 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1))) * (0.8 + 0.25 * L.lashLen); return [w * 0.7, w]; };
    const flick = 0.006 + 0.0004 * L.liner * L.lashLen;
    const pts = [];
    if (closure >= 0.3) {
      for (let i = 0; i <= 14; i += 1) { const az = -side * 1.15 + side * 2.3 * (i / 14); const p = at(az, upperEl(az), 1.06); pts.push([p.x, p.y, p.z + 0.002]); }
      const [lx, ly, lz] = pts[pts.length - 1]; pts.push([lx + side * flick, ly + (happy ? -0.2 : 0.4) * flick, lz - 0.004]);
    } else {
      for (let i = 0; i <= 14; i += 1) {
        const t = 0.06 + (i / 14) * 0.94; const [px, py] = curve.upper(t); const [x, h] = texToHead(px, py);
        const y = CHIN + h; pts.push([x, y, headSurfaceZ(y, x) + faceDeform(x, y, 0, null, 1, x / 0.19)[2] + 0.004 + 0.006 * t]);
      }
      const [lx, ly, lz] = pts[pts.length - 1]; pts.push([lx + side * flick, ly + flick * 0.8, lz - 0.004]);
    }
    sc.path('lash', pts, lashW, { up: [0, 0, 1], N: 8, samples: 4 });
  }
}

function hairShell(sc, offset, trimFn) {
  sc.loft('hair', headSecs(), { N: 120, offset, deform: trimmed((x, y, z, s, zf, xf) => faceDeform(x, y, z, s, zf, xf), trimFn, true) });
}
// ---------- Layered hair: a soft scalp cover + dozens of tapered locks with pointed tips ----------
// Hair system: every preset combines a base cut (length, wave, parting, side-lock length, fringe shape), an optional
// tied style (twin tails, side ponytail, ponytail, bun, hime) and a list of accessories.
const HAIR = {
  office01: { len: 0.9, wave: 0.0, part: 0.05, sweep: 1, back: 30, side: 0.5, nf: 15, fringe: 'office', acc: ['glasses'] },
  nurse01: { len: 0.66, wave: 0.022, part: 0, sweep: 0, back: 28, side: 0.42, nf: 17, fringe: 'nurse', acc: ['nurseCap', 'clipBar'] },
  ceo01: { len: 1.02, wave: 0.008, part: -0.07, sweep: -1, back: 30, side: 0.5, nf: 15, fringe: 'ceo', acc: ['hoops'] },
  student01: { len: 0.95, wave: 0.012, part: 0, sweep: 0, back: 30, side: 0.62, nf: 19, fringe: 'seeThrough', acc: ['bigRedBow'] },
  idol01: { len: 0.5, wave: 0.014, part: 0, sweep: 0, back: 26, side: 0.4, nf: 15, fringe: 'idol', style: 'sidepony', acc: ['starClip', 'idolEar'] },
  janitor01: { len: 0.2, wave: 0.0, part: 0.04, sweep: 1, back: 24, side: 0.12, nf: 15, fringe: 'janitor', style: 'bun', acc: ['bandana', 'studs'] },
  rin01: { len: 0.13, wave: 0.0, part: 0.03, sweep: 0.6, back: 28, side: 0.1, nf: 15, fringe: 'swept', acc: ['xClips'] },
  aoi01: { len: 0.18, wave: 0.01, part: 0, sweep: 0, back: 22, side: 0.24, nf: 13, fringe: 'parted', style: 'ponytail', acc: ['headband'] },
  mei01: { len: 0.32, wave: 0.006, part: 0, sweep: 0, back: 26, side: 0.32, nf: 17, fringe: 'straight', style: 'twintails', acc: ['laceBand'] },
  yuki01: { len: 1.05, wave: 0.006, part: 0, sweep: 0, back: 30, side: 0.62, nf: 17, fringe: 'wispy', acc: ['snowClip'] },
  kana01: { len: 0.85, wave: 0.03, part: -0.05, sweep: -1, back: 30, side: 0.55, nf: 15, fringe: 'sideDeep', acc: ['starEar', 'hairPin'] },
  sakura01: { len: 1.1, wave: 0, part: 0, sweep: 0, back: 30, side: 0.02, nf: 19, fringe: 'blunt', style: 'hime', acc: ['backRibbon'] },
};
// fringe tip height per x (head space above chin)
const FRINGE = {
  office: (x) => 0.35 + 0.07 * smooth(-0.19, 0.19, x),
  nurse: (x) => 0.348 + 0.03 * Math.pow(Math.abs(x) / 0.17, 2),
  ceo: (x) => 0.33 + 0.13 * smooth(-0.2, 0.15, x),
  idol: (x) => 0.35 + 0.025 * Math.pow(Math.abs(x) / 0.17, 2) + 0.01 * Math.abs(Math.sin(x * 30)),
  janitor: (x) => 0.405 + 0.06 * smooth(-0.2, 0.2, x), // swept up off the forehead for work
  seeThrough: (x) => 0.34 + 0.02 * Math.pow(Math.abs(x) / 0.17, 2) + 0.012 * Math.abs(Math.sin(x * 40)),
  swept: (x) => 0.34 + 0.08 * smooth(-0.19, 0.19, x),
  parted: (x) => 0.41 - 0.05 * Math.abs(x) / 0.17,
  straight: (x) => 0.35 + 0.012 * Math.pow(Math.abs(x) / 0.17, 2),
  wispy: (x) => 0.345 + 0.02 * Math.pow(Math.abs(x) / 0.17, 2) + 0.014 * Math.abs(Math.sin(x * 36)),
  sideDeep: (x) => 0.33 + 0.13 * smooth(-0.2, 0.15, -x),
  blunt: () => 0.338,
};
// point on the scalp at height h above the chin, around angle a (0 = front, +π/2 = figure's left/+x), lifted by off
function scalp(a, h, off) {
  const y = CHIN + h; const secs = headSecs(); let s = secs[0];
  for (const c of secs) if (Math.abs(c.y - y) < Math.abs(s.y - y)) s = c;
  return [s.cx + (s.rx + off) * spow(Math.sin(a), 2 / s.n), y, s.cz + (s.rz + off) * spow(Math.cos(a), 2 / s.n)];
}
// one flat, tapered hair lock that ends in a fine point
function hairLock(sc, kind, pts, width, thick, out, blunt = false) {
  sc.path(kind, pts, (t) => {
    // full width through most of the lock, then a long, clean taper into a sharp point (or a straight blunt cut)
    const taper = blunt ? Math.max(0.8, 1 - t * 0.2) : (t < 0.5 ? 1 : Math.pow(Math.max(0, (1 - t) / 0.5), 1.15));
    const root = 0.7 + 0.3 * smooth(0, 0.18, t);
    return [Math.max(0.001, thick * (0.35 + 0.65 * taper)), Math.max(0.0012, width * taper * root)];
  }, { up: out, N: 10, samples: 7 });
}
function hairFor(sc, id, st) {
  void st;
  const H = HAIR[id]; const rnd = mulberry(id.length * 101 + 9);
  const Hy = (h) => CHIN + h;
  const fringe = FRINGE[H.fringe]; const jitter = H.fringe === 'blunt' ? 0.002 : 0.012;
  hairCover(sc, (x) => fringe(x) + 0.055);

  // 1) under-layer: a short inner volume so gaps between back locks never show skin
  sc.loft('hair', sectionsFrom([
    { y: Hy(0.3), cz: -0.05, rx: 0.16, rz: 0.15, n: 2.3 }, { y: Hy(0.1), cz: -0.08, rx: 0.18, rz: 0.13, n: 2.3 }, { y: Hy(-0.08), cz: -0.17, rx: 0.19, rz: 0.08, n: 2.3 },
    { y: Hy(-H.len * 0.35), cz: -0.22, rx: 0.2, rz: 0.075, n: 2.3 }, { y: Hy(-H.len * 0.62), cz: -0.24, rx: 0.16, rz: 0.05, n: 2.2 }], 30), { N: 36 });

  // 2) back + side-back locks from the crown, falling behind the shoulders, staggered lengths
  for (let i = 0; i < H.back; i += 1) {
    const u = i / (H.back - 1); const a = lerp(Math.PI * 0.52, Math.PI * 1.48, u) + (rnd() - 0.5) * 0.08;
    const side = Math.sin(a); const back = -Math.cos(a);
    const len = H.len * (0.82 + 0.18 * rnd()) * (1 - 0.18 * Math.pow(Math.abs(side), 3));
    const hug = 1 - 0.45 * Math.pow(Math.abs(side), 4); // flatter over the ears
    const r0 = scalp(a, 0.55, 0.026); const r1 = scalp(a, 0.38, 0.034 * hug); const r2 = scalp(a, 0.18, 0.042 * hug);
    const fx = side * (0.19 + 0.03 * back); const fz = -0.17 - 0.1 * back;
    const wv = (k) => H.wave * Math.sin(k * 7 + i * 1.3);
    const pts = [r0, r1, r2,
      [fx * 1.08 + wv(1), Hy(-0.05), fz - 0.03],
      [fx * 1.1 + wv(2), Hy(-len * 0.45), fz - 0.06 * back - 0.02],
      [fx * 1.06 + wv(3), Hy(-len * 0.8), fz - 0.055 * back - 0.015],
      [fx * 0.98, Hy(-len), fz - 0.03 * back]];
    hairLock(sc, i % 7 === 3 ? 'hairTip' : 'hair', pts, 0.06 + 0.014 * rnd(), 0.014, [side, 0, -Math.cos(a) < 0 ? 0.3 : -1]);
  }
  // 3) side locks framing the face, layered and falling over the collarbone
  for (const sideS of [-1, 1]) for (let k = 0; k < 3; k += 1) {
    const a = sideS * (Math.PI * (0.36 + k * 0.07)); const len = H.side - k * 0.06 + (sideS > 0 ? 0.02 : 0); const blunt = H.style === 'hime';
    const r0 = scalp(a, 0.54, 0.024); const r1 = scalp(a, 0.4, 0.026);
    const x0 = sideS * (0.207 + k * 0.009);
    const pts = [r0, r1, [x0, Hy(0.24), 0.09 - k * 0.04], [x0 + sideS * 0.01, Hy(0.04), 0.11 - k * 0.04],
      [x0 + sideS * (0.03 + H.wave), Hy(-len * 0.55), 0.17 - k * 0.04], [x0 + sideS * 0.04, Hy(-len), 0.21 - k * 0.04]];
    hairLock(sc, 'hair', pts, (blunt ? 0.06 : 0.05) - k * 0.004, 0.012, [sideS, 0, 0.3], blunt);
  }
  // 4) fringe: fine pointed locks from the crown over the forehead, swept for side-parted styles
  const N = H.nf;
  for (let i = 0; i < N; i += 1) {
    const u = i / (N - 1); const x = lerp(-0.17, 0.17, u);
    const a = Math.asin(Math.max(-1, Math.min(1, x / 0.2))) * 1.0 + H.part;
    const tipX = x + H.sweep * 0.045 * (1 - Math.abs(x) / 0.2) + (rnd() - 0.5) * 0.01;
    const tipH = fringe(tipX) - (i % 2 ? jitter : 0) - rnd() * jitter * 0.8;
    const tipY = Hy(tipH); const tipZ = headSurfaceZ(tipY, tipX) + 0.013;
    const root = scalp(a * 0.92, 0.548, 0.026); const mid = scalp(a * 0.95, 0.49, 0.034);
    const pre = [lerp(mid[0], tipX, 0.55), lerp(mid[1], tipY, 0.5) + 0.02, headSurfaceZ(lerp(mid[1], tipY, 0.5), lerp(mid[0], tipX, 0.55)) + 0.03];
    hairLock(sc, i % 5 === 2 ? 'hairTip' : 'hair', [root, mid, pre, [tipX, tipY, tipZ]], 0.04 + 0.008 * rnd(), 0.009, [x, 0.4, 1], H.fringe === 'blunt');
  }
  // 5) a few loose wisps on top for a soft, non-helmet silhouette
  for (let i = 0; i < 5; i += 1) {
    const a = Math.PI * (0.62 + i * 0.19) + (rnd() - 0.5) * 0.12; // over the back of the crown only
    hairLock(sc, 'hair', [scalp(a, 0.585, 0.024), scalp(a, 0.5, 0.034), scalp(a, 0.4, 0.036), scalp(a, 0.3, 0.032)], 0.06, 0.01, [Math.sin(a), 0.6, Math.cos(a)]);
  }

  hairStyle(sc, H.style, Hy);
  for (const acc of H.acc || []) ACCESSORY[acc](sc, Hy);
}
function hairStyle(sc, style, Hy) {
  if (style === 'twintails') {
    for (const side of [-1, 1]) {
      const knot = [side * 0.205, Hy(0.42), -0.1];
      for (let k = 0; k < 6; k += 1) {
        const sp = (k - 2.5) * 0.012; const ln = 0.62 + 0.06 * Math.sin(k * 2.1);
        hairLock(sc, k % 3 === 1 ? 'hairTip' : 'hair', [knot, [side * (0.27 + sp), Hy(0.36), -0.1 + sp], [side * (0.33 + sp), Hy(0.12), -0.07 + sp * 0.5],
          [side * (0.34 + sp * 1.4), Hy(-ln * 0.45), -0.04 + sp], [side * (0.31 + sp), Hy(-ln), -0.03 + sp]], 0.05, 0.016, [side, 0, 0.2]);
      }
      sc.ell('accent', [side * 0.215, Hy(0.43), -0.1], [0.05, 0.05, 0.05], [0, 0, 0], 12);
      for (const tilt of [-1, 1]) sc.ell('accent', [side * 0.225, Hy(0.43) + tilt * 0.035, -0.12], [0.03, 0.075, 0.03], [0, 0, tilt * 0.6], 12);
    }
  } else if (style === 'sidepony') { // high side ponytail with a big bow
    const knot = [0.19, Hy(0.5), -0.12];
    for (let k = 0; k < 8; k += 1) {
      const sp = (k - 3.5) * 0.011; const ln = 0.72 + 0.08 * Math.sin(k * 1.9);
      hairLock(sc, k % 3 === 1 ? 'hairTip' : 'hair', [knot, [0.3 + sp, Hy(0.5), -0.15 + sp], [0.38 + sp, Hy(0.25), -0.12 + sp * 0.6],
        [0.4 + sp * 1.4, Hy(-ln * 0.4), -0.08 + sp], [0.36 + sp, Hy(-ln), -0.05 + sp]], 0.055, 0.016, [1, 0, 0.2]);
    }
    sc.ell('suit', [0.2, Hy(0.51), -0.11], [0.06, 0.06, 0.06], [0, 0, 0], 12);
    for (const tilt of [-1, 1]) sc.ell('suit', [0.2, Hy(0.51) + tilt * 0.06, -0.11], [0.05, 0.12, 0.04], [0, -0.6, tilt * 0.9], 14);
    for (const tilt of [-1, 1]) hairLock(sc, 'suit', [[0.2, Hy(0.49), -0.1], [0.22 + tilt * 0.03, Hy(0.4), -0.08], [0.23 + tilt * 0.05, Hy(0.3), -0.07]], 0.03, 0.008, [1, 0, 0.3]);
  } else if (style === 'ponytail') { // high sporty ponytail at the back of the crown
    const knot = [0, Hy(0.5), -0.21];
    for (let k = 0; k < 10; k += 1) {
      const sp = (k - 4.5) * 0.012; const ln = 0.55 + 0.08 * Math.sin(k * 2.3);
      hairLock(sc, k % 3 === 1 ? 'hairTip' : 'hair', [knot, [sp, Hy(0.58), -0.33], [sp * 1.4, Hy(0.38), -0.44], [sp * 1.7, Hy(0.02), -0.42], [sp, Hy(-ln), -0.34]], 0.05, 0.016, [sp * 10, 0, -1]);
    }
    sc.torus('accent', [0, Hy(0.52), -0.24], 0.07, 0.02, [1.1, 0, 0], 20);
  } else if (style === 'bun') { // practical low bun
    sc.ell('hair', [0, Hy(0.2), -0.29], [0.2, 0.18, 0.16], [0.2, 0, 0], 20);
    for (let k = 0; k < 7; k += 1) { const a = (k / 7) * Math.PI * 2; hairLock(sc, 'hair', [[0, Hy(0.2), -0.29], [Math.cos(a) * 0.06, Hy(0.2) + Math.sin(a) * 0.05, -0.36], [Math.cos(a) * 0.09, Hy(0.2) + Math.sin(a) * 0.08, -0.31]], 0.03, 0.012, [Math.cos(a), Math.sin(a), -0.4]); }
  } else if (style === 'hime') { // hime cut: blunt cheek-length side panels over very long straight hair
    for (const side of [-1, 1]) hairLock(sc, 'hair', [scalp(side * 1.25, 0.5, 0.03), [side * 0.2, Hy(0.3), 0.05], [side * 0.205, Hy(0.12), 0.09], [side * 0.2, Hy(0.0), 0.11]], 0.075, 0.014, [side, 0, 0.3], true);
  }
}
// Hair accessories. Kinds map to the preset's materials (accent/suit/gold/cloth) or the black lash material.
const ACCESSORY = {
  glasses: (sc) => glasses(sc),
  hoops: (sc, Hy) => { for (const side of [-1, 1]) earring(sc, side, Hy(0.16)); },
  studs: (sc, Hy) => { for (const side of [-1, 1]) sc.ell('gold', [side * 0.19, Hy(0.18), 0.0], [0.016, 0.016, 0.016], [0, 0, 0], 8); },
  nurseCap: (sc, Hy) => {
    sc.box('cloth', [0, Hy(0.585), 0.03], [0.34, 0.1, 0.17], [-0.2, 0, 0]);
    sc.box('cloth', [0, Hy(0.555), 0.05], [0.37, 0.025, 0.2], [-0.2, 0, 0]);
    sc.box('accent', [0, Hy(0.6), 0.115], [0.026, 0.07, 0.006], [-0.2, 0, 0]); sc.box('accent', [0, Hy(0.6), 0.115], [0.07, 0.026, 0.006], [-0.2, 0, 0]);
  },
  clipBar: (sc, Hy) => sc.box('accent', [0.15, Hy(0.45), 0.12], [0.07, 0.014, 0.014], [0, -0.4, 0.5]),
  starClip: (sc, Hy) => star(sc, 'gold', [-0.17, Hy(0.44), 0.13], 0.02),
  idolEar: (sc, Hy) => { for (const side of [-1, 1]) { sc.ell('gold', [side * 0.19, Hy(0.15), 0.0], [0.02, 0.02, 0.02], [0, 0, 0], 8); sc.ell('suit', [side * 0.19, Hy(0.11), 0.0], [0.022, 0.03, 0.014], [0, 0, 0], 8); } },
  bandana: (sc, Hy) => {
    const band = []; for (let k = 0; k <= 48; k += 1) { const a = (k / 48) * Math.PI * 2; band.push(scalp(a, 0.46 - 0.05 * Math.max(0, -Math.cos(a)), 0.036)); }
    sc.strand('suit', band, 0.02, 0.02, 10, 1);
    sc.ell('suit', [0, Hy(0.42), -0.27], [0.08, 0.06, 0.05], [0, 0, 0], 12);
    for (const side of [-1, 1]) hairLock(sc, 'suit', [[0, Hy(0.42), -0.28], [side * 0.05, Hy(0.36), -0.31], [side * 0.08, Hy(0.28), -0.3]], 0.03, 0.008, [0, 0, -1]);
  },
  // the reference sheet's big red bow, worn high on the right side of the head
  bigRedBow: (sc) => bow(sc, 'accent', scalp(Math.PI * 0.6, 0.47, 0.055), Math.PI * 0.6, 1.25),
  xClips: (sc) => { const p = scalp(-1.15, 0.43, 0.04); for (const t of [-0.55, 0.55]) sc.box('gold', p, [0.062, 0.01, 0.01], [0, -1.15, t]); },
  headband: (sc) => { const band = []; for (let k = 0; k <= 32; k += 1) { const a = -1.5 + 3 * (k / 32); band.push(scalp(a, 0.47 + 0.07 * Math.cos(a), 0.036)); } sc.strand('accent', band, 0.012, 0.012, 8, 1); },
  laceBand: (sc) => {
    const band = []; for (let k = 0; k <= 32; k += 1) { const a = -1.4 + 2.8 * (k / 32); band.push(scalp(a, 0.52 + 0.04 * Math.cos(a), 0.052)); }
    sc.strand('suit', band, 0.014, 0.014, 8, 1);
    for (let k = 0; k <= 12; k += 1) { const a = -1.3 + 2.6 * (k / 12); const p = scalp(a, 0.55 + 0.04 * Math.cos(a), 0.06); sc.ell('cloth', p, [0.045, 0.045, 0.02], [0, a, 0], 10); }
    bow(sc, 'accent', scalp(0, 0.6, 0.06), 0, 0.6);
  },
  snowClip: (sc) => { const p = scalp(1.1, 0.44, 0.05); star(sc, 'accent', p, 0.024, 6); sc.ell('cloth', p, [0.018, 0.018, 0.012], [0, 0, 0], 8); },
  starEar: (sc, Hy) => { for (const side of [-1, 1]) star(sc, 'gold', [side * 0.19, Hy(0.1), 0.0], 0.016); },
  hairPin: (sc) => { const p = scalp(-1.1, 0.42, 0.045); for (const dy of [0, 0.022]) sc.box('gold', [p[0], p[1] + dy, p[2]], [0.09, 0.009, 0.009], [0, -1.1, 0.3]); },
  backRibbon: (sc, Hy) => { // large ribbon tying the long hair at the back, with long tails
    bow(sc, 'accent', [0, Hy(0.3), -0.33], Math.PI, 1.15);
    sc.ell('suit', [0, Hy(0.3), -0.355], [0.045, 0.045, 0.035], [0, 0, 0], 10);
    for (const side of [-1, 1]) hairLock(sc, 'accent', [[0, Hy(0.28), -0.34], [side * 0.04, Hy(0.05), -0.35], [side * 0.06, Hy(-0.3), -0.34]], 0.045, 0.008, [0, 0, -1], true);
  },
};
// ribbon bow: knot + two loops + two tails, oriented to face outward along `yaw`
function bow(sc, kind, p, yaw, size = 1) {
  sc.ell(kind, p, [0.05 * size, 0.05 * size, 0.045 * size], [0, yaw, 0], 12);
  for (const t of [-1, 1]) {
    const off = [Math.cos(yaw) * t * 0.065 * size, 0.012 * size, -Math.sin(yaw) * t * 0.065 * size];
    sc.ell(kind, [p[0] + off[0], p[1] + off[1], p[2] + off[2]], [0.11 * size, 0.075 * size, 0.04 * size], [0, yaw, t * 0.35], 14);
    hairLock(sc, kind, [p, [p[0] + off[0] * 0.5, p[1] - 0.06 * size, p[2] + off[2] * 0.5], [p[0] + off[0] * 0.9, p[1] - 0.12 * size, p[2] + off[2] * 0.9]], 0.032 * size, 0.008, [Math.sin(yaw), 0, Math.cos(yaw)], true);
  }
}
function star(sc, kind, p, r, n = 5) {
  for (let k = 0; k < n; k += 1) { const a = (k / n) * Math.PI * 2; sc.ell(kind, [p[0] + Math.sin(a) * r, p[1] + Math.cos(a) * r, p[2]], [r * 0.7, r * 1.7, r * 0.5], [0, 0, -a], 8); }
  sc.ell(kind, p, [r * 1.3, r * 1.3, r * 0.6], [0, 0, 0], 10);
}
function hairCover(sc, frontY) {
  const trim = (x, z, zf) => {
    const side = 0.3; let f;
    if (zf > 0.35) f = frontY(x); else if (zf > -0.1) f = lerp(side, frontY(x), smooth(-0.1, 0.35, zf)); else f = lerp(0.08, side, smooth(-0.6, -0.1, zf));
    return CHIN + f;
  };
  // volume grows toward the crown so the hair reads as hair, not a helmet
  const puff = (x, y, z, s, zf, xf) => { const d = faceDeform(x, y, z, s, zf, xf); const k = 1 + 0.07 * smooth(0.3, 0.52, y - CHIN); return [s.cx + (d[0] - s.cx) * k, d[1], s.cz + (d[2] - s.cz) * k]; };
  sc.loft('hair', headSecs(), { N: 120, offset: 0.022, deform: trimmed(puff, trim, true) });
}
function lock(sc, kind, pts, w0, w1, th) { // flat hair lock: pts = [[x,y,z],...] top→bottom
  const keys = pts.map(([x, y, z], i) => { const t = i / (pts.length - 1); return { y, cx: x, cz: z, rx: lerp(w0, Math.max(w1, w0 * 0.3), Math.pow(t, 0.8)), rz: th * (1 - t * 0.35), n: 2 }; });
  sc.loft(kind, sectionsFrom(keys, 22), { N: 12 });
}
function sweptFringe(sc, dir) { // swept side bangs from a side part
  const Hy = (h) => CHIN + h;
  const px = -dir * 0.06;
  for (let i = 0; i < 6; i += 1) {
    const t = i / 5; const endX = dir * (0.1 + t * 0.1); const endH = 0.43 - t * 0.07;
    lock(sc, 'hair', [[px + dir * t * 0.02, Hy(0.57), 0.02 + t * 0.03], [px + dir * (0.03 + t * 0.06), Hy(0.52), 0.15 + t * 0.03], [endX * 0.85, Hy(endH + 0.12), 0.228 - t * 0.02], [endX, Hy(endH), 0.215 - t * 0.012]], 0.05 - t * 0.004, 0.006, 0.014);
  }
  sc.strand('hairTip', [[px, Hy(0.57), 0.04], [dir * 0.02, Hy(0.5), 0.17], [dir * 0.12, Hy(0.4), 0.225]], 0.02, 0.005, 8, 16);
}
function curtainFringe(sc) {
  const Hy = (h) => CHIN + h;
  for (const side of [-1, 1]) for (let i = 0; i < 4; i += 1) {
    const t = i / 3;
    lock(sc, 'hair', [[side * 0.01, Hy(0.57), 0.04], [side * (0.05 + t * 0.03), Hy(0.51), 0.15], [side * (0.1 + t * 0.07), Hy(0.45 - t * 0.03), 0.218], [side * (0.14 + t * 0.07), Hy(0.4 - t * 0.04), 0.205]], 0.046 - t * 0.004, 0.006, 0.014);
  }
}
function glasses(sc) {
  const Hy = (h) => CHIN + h;
  for (const side of [-1, 1]) {
    const cxl = side * F.eyeX; const cy = Hy(F.eye + 0.004); const z = headSurfaceZ(cy, cxl) + 0.02;
    const pts = []; for (let k = 0; k <= 28; k += 1) { const a = (k / 28) * Math.PI * 2; pts.push([cxl + Math.cos(a) * 0.058 * (1 + 0.1 * Math.cos(a)), cy + Math.sin(a) * 0.041 + (Math.sin(a) > 0 ? 0.004 : 0), z - Math.abs(cxl + Math.cos(a) * 0.058) * 0.18]); }
    sc.strand('gold', pts, 0.0034, 0.0034, 6, 1);
    const arm = [[side * 0.14, cy + 0.01, z - 0.03], [side * 0.18, cy + 0.01, z - 0.12], [side * 0.186, cy + 0.01, -0.04]]; sc.strand('gold', arm, 0.0034, 0.0034, 6, 10);
  }
  sc.strand('gold', [[-0.028, Hy(F.eye + 0.01), headSurfaceZ(Hy(F.eye), 0) + 0.03], [0, Hy(F.eye + 0.016), headSurfaceZ(Hy(F.eye), 0) + 0.034], [0.028, Hy(F.eye + 0.01), headSurfaceZ(Hy(F.eye), 0) + 0.03]], 0.0034, 0.0034, 6, 8);
}
function earring(sc, side, y) {
  sc.strand('gold', Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [side * 0.19, y - 0.05 + Math.cos(a) * 0.04 - 0.04, -0.012 + Math.sin(a) * 0.04]; }), 0.0045, 0.0045, 6, 1);
}

function sculptTorso(sc, id) {
  const st = sc.style;
  const body = sectionsFrom(TORSO_KEYS, 70);
  const [bAmp, hAmp] = FIGURE[id];
  const bust = bodyDeform(bAmp - 0.003, hAmp - 0.002);
  sc.loft('skin', body, { N: 60, deform: bust, caps: true });
  const cap = (kind, hi, lo, off, deform, trim) => sc.loft(kind, sliceY(body, hi, lo), { N: 60, offset: off, deform: trim ? trimmed(deform, trim) : deform });
  const bustG = bodyDeform(bAmp, hAmp);

  if (id === 'office01') {
    // fitted white blouse with collar + ribbon bow, navy pencil skirt, slim belt
    cap('cloth', 3.47, 2.5, 0.012, bustG);
    sc.strand('cloth', Array.from({ length: 21 }, (_, i) => { const a = Math.PI + (i / 20) * Math.PI * 2; return [Math.cos(a + Math.PI / 2) * 0.108, 3.5, -0.03 + Math.sin(a + Math.PI / 2) * 0.1]; }), 0.016, 0.016, 8, 1);
    for (const side of [-1, 1]) sc.ell('cloth', [side * 0.07, 3.44, 0.09], [0.12, 0.02, 0.08], [0.5, 0, side * -0.55]);
    sc.ell('accent', [0, 3.43, 0.135], [0.04, 0.034, 0.03]);
    for (const side of [-1, 1]) sc.ell('accent', [side * 0.045, 3.43, 0.13], [0.075, 0.05, 0.026], [0, side * 0.3, side * 0.25]);
    for (const y of [3.24, 3.08, 2.92, 2.76, 2.6]) sc.ell('gold', [0, y, 0.215], [0.014, 0.014, 0.008]);
    skirt(sc, 'suit', [{ y: 2.6, rx: 0.242, rz: 0.172 }, { y: 2.42, rx: 0.312, rz: 0.215 }, { y: 2.23, rx: 0.4, rz: 0.275 }, { y: 2.05, rx: 0.4, rz: 0.272 }, { y: 1.8, rx: 0.37, rz: 0.255 }, { y: 1.5, rx: 0.335, rz: 0.235 }]);
    belt(sc, 'gold', 2.585, 0.243, 0.174);
  } else if (id === 'nurse01') {
    // fitted white nurse dress with a scooped neckline, pink trim, and a softly flared skirt
    const scoop = (x, z, zf, xf) => (zf > 0.1 ? 3.42 - 0.13 * Math.max(0, 1 - Math.pow(Math.abs(x) / 0.2, 2)) : null) ?? null;
    const neckTrim = (x, z, zf) => (zf > 0.05 ? 3.43 - 0.17 * Math.max(0, 1 - Math.pow(Math.abs(x) / 0.2, 2)) * smooth(0.05, 0.5, zf) : null);
    void scoop;
    cap('cloth', 3.43, 2.5, 0.012, bustG, neckTrim);
    trimLine(sc, 'accent', (x, zf) => 3.43 - 0.17 * Math.max(0, 1 - Math.pow(Math.abs(x) / 0.2, 2)) * smooth(0.05, 0.5, zf), body, 0.012, bustG, 0.009);
    sc.box('accent', [0.1, 2.97, 0.275], [0.045, 0.012, 0.01]); sc.box('accent', [0.1, 2.97, 0.275], [0.012, 0.045, 0.01]);
    skirt(sc, 'cloth', [{ y: 2.6, rx: 0.242, rz: 0.172 }, { y: 2.42, rx: 0.312, rz: 0.215 }, { y: 2.23, rx: 0.402, rz: 0.275 }, { y: 2.0, rx: 0.45, rz: 0.32 }, { y: 1.74, rx: 0.5, rz: 0.395 }]);
    belt(sc, 'accent', 2.585, 0.243, 0.174);
    hemBand(sc, 'accent', 1.745, 0.5, 0.395);
    sc.ell('gold', [0, 2.585, 0.2], [0.05, 0.036, 0.016]);
  } else if (id === 'student01') {
    // reference uniform: white short-sleeve blouse with a pointed collar and a big red ribbon bow, dark pleated skirt
    const vNeck = (x, z, zf) => (zf > 0.1 ? 3.45 - Math.max(0, 0.1 - Math.abs(x) * 1.1) * smooth(0.1, 0.6, zf) : null);
    cap('cloth', 3.47, 2.42, 0.016, bustG, vNeck);
    for (const side of [-1, 1]) sc.ell('cloth', [side * 0.075, 3.44, 0.1], [0.13, 0.022, 0.09], [0.45, 0, side * -0.55]);
    sc.ell('accent', [0, 3.4, 0.16], [0.055, 0.05, 0.04], [0, 0, 0], 12);
    for (const side of [-1, 1]) sc.ell('accent', [side * 0.08, 3.41, 0.15], [0.14, 0.085, 0.04], [0, side * 0.3, side * 0.3], 14);
    for (const side of [-1, 1]) hairLock(sc, 'accent', [[side * 0.015, 3.38, 0.17], [side * 0.04, 3.28, 0.19], [side * 0.055, 3.18, 0.2]], 0.035, 0.008, [0, 0, 1], true);
    for (const y of [3.2, 3.02, 2.84, 2.66]) sc.ell('cloth', [0, y, 0.23], [0.016, 0.016, 0.01]);
    pleatedSkirt(sc, 'suit', [{ y: 2.62, rx: 0.242, rz: 0.172 }, { y: 2.44, rx: 0.31, rz: 0.215 }, { y: 2.23, rx: 0.4, rz: 0.275 }, { y: 1.95, rx: 0.45, rz: 0.33 }, { y: 1.55, rx: 0.5, rz: 0.4 }]);
  } else if (id === 'idol01') {
    // red stage bodice with a white sweetheart frill, big chest bow, gold buttons and belt, two-tier frilled skirt
    const heart = (x, z, zf) => (zf > 0.05 ? 3.38 - 0.06 * Math.max(0, 1 - Math.pow(Math.abs(Math.abs(x) - 0.1) / 0.1, 2)) * smooth(0.05, 0.5, zf) + 0.04 * gauss(x, 0, 0.03) * smooth(0.05, 0.5, zf) : null);
    cap('cloth', 3.47, 3.3, 0.008, bustG);
    cap('suit', 3.4, 2.5, 0.016, bustG, heart);
    trimLine(sc, 'cloth', (x, zf) => (zf > 0.05 ? 3.38 - 0.06 * Math.max(0, 1 - Math.pow(Math.abs(Math.abs(x) - 0.1) / 0.1, 2)) * smooth(0.05, 0.5, zf) + 0.04 * gauss(x, 0, 0.03) * smooth(0.05, 0.5, zf) : 3.38), body, 0.017, bustG, 0.016);
    sc.ell('cloth', [0, 3.25, 0.245], [0.06, 0.05, 0.04], [0, 0, 0], 12);
    for (const side of [-1, 1]) sc.ell('cloth', [side * 0.085, 3.26, 0.235], [0.13, 0.085, 0.04], [0, side * 0.3, side * 0.3], 14);
    for (const side of [-1, 1]) hairLock(sc, 'cloth', [[side * 0.015, 3.23, 0.255], [side * 0.04, 3.1, 0.27], [side * 0.06, 2.98, 0.26]], 0.035, 0.008, [0, 0, 1]);
    sc.ell('gold', [0, 3.25, 0.27], [0.03, 0.03, 0.016], [0, 0, 0], 10);
    for (const y of [2.92, 2.78, 2.64]) sc.ell('gold', [0, y, 0.218], [0.02, 0.02, 0.012], [0, 0, 0], 8);
    pleatedSkirt(sc, 'cloth', [{ y: 2.6, rx: 0.242, rz: 0.172 }, { y: 2.44, rx: 0.31, rz: 0.215 }, { y: 2.23, rx: 0.41, rz: 0.285 }, { y: 1.9, rx: 0.5, rz: 0.38 }, { y: 1.56, rx: 0.58, rz: 0.47 }]);
    pleatedSkirt(sc, 'suit', [{ y: 2.6, rx: 0.25, rz: 0.178 }, { y: 2.44, rx: 0.32, rz: 0.222 }, { y: 2.23, rx: 0.42, rz: 0.292 }, { y: 1.95, rx: 0.5, rz: 0.38 }, { y: 1.66, rx: 0.56, rz: 0.45 }]);
    hemBand(sc, 'gold', 1.66, 0.585, 0.475);
    belt(sc, 'gold', 2.585, 0.243, 0.174);
    sc.ell('suitDark', [0, 2.585, 0.2], [0.06, 0.05, 0.02], [0, 0, 0.78], 10); // heart-shaped buckle
  } else if (id === 'janitor01') {
    // short-sleeved teal work tunic with a white collar, pockets, name badge and a utility belt
    const vNeck = (x, z, zf) => (zf > 0.1 ? 3.45 - Math.max(0, 0.12 - Math.abs(x) * 1.2) * smooth(0.1, 0.6, zf) : null);
    cap('suit', 3.47, 2.0, 0.018, bustG, vNeck);
    for (const side of [-1, 1]) sc.ell('cloth', [side * 0.075, 3.43, 0.1], [0.13, 0.022, 0.085], [0.45, 0, side * -0.55]);
    for (const side of [-1, 1]) { sc.box('suitDark', [side * 0.15, 3.03, 0.26], [0.13, 0.12, 0.01], [-0.12, side * 0.25, 0]); sc.box('suit', [side * 0.15, 3.09, 0.265], [0.135, 0.02, 0.012], [-0.12, side * 0.25, 0]); }
    sc.box('cloth', [0.15, 3.13, 0.27], [0.1, 0.035, 0.008], [-0.12, 0.25, 0]); // name badge
    for (const y of [3.3, 3.12, 2.94, 2.76]) sc.ell('cloth', [0, y, 0.23], [0.016, 0.016, 0.01]);
    belt(sc, 'suitDark', 2.45, 0.3, 0.205);
    sc.box('gold', [0, 2.45, 0.235], [0.06, 0.045, 0.012]);
    sc.box('suitDark', [0.27, 2.36, 0.1], [0.05, 0.13, 0.11], [0, 0.6, 0]); // pouch on the belt
    skirt(sc, 'suit', [{ y: 2.4, rx: 0.33, rz: 0.225 }, { y: 2.2, rx: 0.41, rz: 0.282 }, { y: 2.0, rx: 0.42, rz: 0.285 }]);
  } else if (id === 'rin01') {
    // navy sailor uniform: white blouse, navy sailor collar with a white stripe, sky-blue scarf, navy pleated skirt
    const vNeck = (x, z, zf) => (zf > 0.1 ? 3.45 - Math.max(0, 0.16 - Math.abs(x) * 1.4) * smooth(0.1, 0.6, zf) : null);
    cap('cloth', 3.47, 2.42, 0.016, bustG, vNeck);
    sailorCollar(sc);
    sc.ell('accent', [0, 3.22, 0.245], [0.06, 0.05, 0.04], [0, 0, 0], 12); // scarf knot
    for (const side of [-1, 1]) hairLock(sc, 'accent', [[side * 0.01, 3.2, 0.25], [side * 0.035, 3.08, 0.262], [side * 0.05, 2.95, 0.255]], 0.04, 0.008, [0, 0, 1], true);
    pleatedSkirt(sc, 'suit', [{ y: 2.62, rx: 0.242, rz: 0.172 }, { y: 2.44, rx: 0.31, rz: 0.215 }, { y: 2.23, rx: 0.4, rz: 0.275 }, { y: 1.98, rx: 0.45, rz: 0.33 }, { y: 1.68, rx: 0.5, rz: 0.39 }]);
    hemBand(sc, 'cloth', 1.7, 0.505, 0.395);
  } else if (id === 'aoi01') {
    // tennis whites: polo shirt with a blue collar and placket, white pleated skort with a blue hem stripe
    const vNeck = (x, z, zf) => (zf > 0.1 ? 3.45 - Math.max(0, 0.07 - Math.abs(x) * 0.8) * smooth(0.1, 0.6, zf) : null);
    cap('cloth', 3.47, 2.45, 0.016, bustG, vNeck);
    for (const side of [-1, 1]) sc.ell('suit', [side * 0.07, 3.45, 0.09], [0.13, 0.022, 0.09], [0.45, 0, side * -0.55]);
    sc.box('suit', [0, 3.28, 0.232], [0.035, 0.16, 0.01], [-0.1, 0, 0]); // placket
    for (const y of [3.33, 3.25]) sc.ell('cloth', [0, y, 0.24], [0.014, 0.014, 0.008]);
    sc.ell('accent', [0.15, 3.12, 0.255], [0.05, 0.05, 0.012], [-0.12, 0.25, 0], 10); // club badge
    pleatedSkirt(sc, 'cloth', [{ y: 2.62, rx: 0.242, rz: 0.172 }, { y: 2.44, rx: 0.31, rz: 0.215 }, { y: 2.23, rx: 0.4, rz: 0.275 }, { y: 2.06, rx: 0.45, rz: 0.33 }, { y: 1.9, rx: 0.49, rz: 0.37 }]);
    hemBand(sc, 'suit', 1.92, 0.495, 0.375);
    belt(sc, 'suit', 2.6, 0.243, 0.174);
  } else if (id === 'mei01') {
    // classic maid: black dress, white collar and pink ribbon, frilled white apron with a bow at the back
    cap('suit', 3.47, 2.45, 0.014, bustG);
    for (const side of [-1, 1]) sc.ell('cloth', [side * 0.07, 3.44, 0.1], [0.14, 0.024, 0.1], [0.45, 0, side * -0.5]);
    bow(sc, 'accent', [0, 3.39, 0.17], 0, 0.75);
    // apron bib: a front panel only (everything outside it collapses onto the waistline)
    sc.loft('cloth', sliceY(body, 3.18, 2.6), { N: 60, offset: 0.02, deform: trimmed(bustG, (x, z, zf) => (zf > 0.5 && Math.abs(x) < 0.14 ? 3.18 : 2.6)) });
    for (const side of [-1, 1]) sc.strand('cloth', [[side * 0.13, 3.18, 0.2], [side * 0.18, 3.36, 0.12], [side * 0.15, 3.46, -0.02]], 0.012, 0.012, 6, 6); // bib straps
    skirt(sc, 'suit', [{ y: 2.6, rx: 0.242, rz: 0.172 }, { y: 2.42, rx: 0.312, rz: 0.215 }, { y: 2.23, rx: 0.41, rz: 0.285 }, { y: 1.95, rx: 0.5, rz: 0.39 }, { y: 1.62, rx: 0.58, rz: 0.47 }]);
    pleatedSkirt(sc, 'cloth', [{ y: 1.7, rx: 0.565, rz: 0.455 }, { y: 1.56, rx: 0.61, rz: 0.5 }]); // petticoat lace
    // apron skirt: the front of a skirt-shaped loft; the back collapses up onto the waistband
    const apronKeys = [{ y: 2.58, rx: 0.25, rz: 0.18 }, { y: 2.4, rx: 0.33, rz: 0.235 }, { y: 2.2, rx: 0.43, rz: 0.305 }, { y: 1.95, rx: 0.52, rz: 0.41 }, { y: 1.74, rx: 0.585, rz: 0.475 }].map((k) => ({ cx: 0, cz: -0.008, n: 2.3, ...k }));
    sc.loft('cloth', sectionsFrom(apronKeys, 30), { N: 60, offset: 0.03, deform: trimmed(bodyDeform(0, 0.03), (x, z, zf) => (zf > 0.3 && Math.abs(x) < 0.34 ? -10 : 2.58), true) });
    hemBand(sc, 'cloth', 1.74, 0.6, 0.49);
    belt(sc, 'cloth', 2.585, 0.245, 0.176);
    bow(sc, 'cloth', [0, 2.6, -0.2], Math.PI, 1.3);
  } else if (id === 'yuki01') {
    // snow princess: pale ice-blue sweetheart bodice with silver trim, floor-length gown, snowflake brooch
    const heart = (x, z, zf) => (zf > 0.05 ? 3.38 - 0.06 * Math.max(0, 1 - Math.pow(Math.abs(Math.abs(x) - 0.1) / 0.1, 2)) * smooth(0.05, 0.5, zf) + 0.04 * gauss(x, 0, 0.03) * smooth(0.05, 0.5, zf) : null);
    cap('suit', 3.4, 2.45, 0.014, bustG, heart);
    trimLine(sc, 'gold', (x, zf) => (zf > 0.05 ? 3.38 - 0.06 * Math.max(0, 1 - Math.pow(Math.abs(Math.abs(x) - 0.1) / 0.1, 2)) * smooth(0.05, 0.5, zf) + 0.04 * gauss(x, 0, 0.03) * smooth(0.05, 0.5, zf) : 3.38), body, 0.015, bustG, 0.01);
    star(sc, 'accent', [0, 3.22, 0.262], 0.022, 6);
    skirt(sc, 'suit', [{ y: 2.6, rx: 0.242, rz: 0.172 }, { y: 2.42, rx: 0.31, rz: 0.215 }, { y: 2.2, rx: 0.42, rz: 0.3 }, { y: 1.7, rx: 0.56, rz: 0.46 }, { y: 1.0, rx: 0.72, rz: 0.62 }, { y: 0.45, rx: 0.84, rz: 0.74 }, { y: 0.1, rx: 0.9, rz: 0.8 }]);
    hemBand(sc, 'suitDark', 0.12, 0.905, 0.805);
    for (let k = 0; k < 7; k += 1) star(sc, 'accent', [Math.sin(k * 0.9 - 2.7) * 0.7, 0.55 + (k % 3) * 0.32, Math.cos(k * 0.9 - 2.7) * 0.62 + 0.01], 0.02, 6);
    belt(sc, 'gold', 2.585, 0.243, 0.174);
  } else if (id === 'kana01') {
    // gyaru: open white shirt with a loose ribbon, oversized pink cardigan, short pleated skirt, gold necklace
    const vNeck = (x, z, zf) => (zf > 0.1 ? 3.45 - Math.max(0, 0.2 - Math.abs(x) * 1.5) * smooth(0.1, 0.6, zf) : null);
    cap('cloth', 3.47, 2.45, 0.014, bustG, vNeck);
    const open = (x, z, zf) => (zf > 0.1 ? 3.0 + Math.min(0.5, Math.max(0, Math.abs(x) - 0.06) * 4) * smooth(0.1, 0.55, zf) - (Math.abs(x) < 0.07 ? 1 : 0) : null);
    cap('suit', 3.46, 2.35, 0.03, bustG, open);
    for (const side of [-1, 1]) sc.strand('suitDark', [[side * 0.075, 3.38, 0.23], [side * 0.085, 2.9, 0.28], [side * 0.09, 2.4, 0.27]], 0.012, 0.012, 6, 8); // cardigan edges
    sc.ell('accent', [0, 3.2, 0.25], [0.05, 0.04, 0.03], [0, 0, 0], 10);
    for (const side of [-1, 1]) hairLock(sc, 'accent', [[side * 0.01, 3.19, 0.255], [side * 0.03, 3.05, 0.27], [side * 0.03, 2.92, 0.265]], 0.03, 0.007, [0, 0, 1], true);
    sc.strand('gold', Array.from({ length: 13 }, (_, i) => { const a = -0.9 + (i / 12) * 1.8; return [Math.sin(a) * 0.12, 3.36 - Math.cos(a * 1.2) * 0.07, 0.17 + Math.cos(a) * 0.06]; }), 0.005, 0.005, 6, 2);
    sc.ell('gold', [0, 3.28, 0.235], [0.03, 0.03, 0.012], [0, 0, 0.78], 8);
    pleatedSkirt(sc, 'suitDark', [{ y: 2.62, rx: 0.242, rz: 0.172 }, { y: 2.44, rx: 0.31, rz: 0.215 }, { y: 2.23, rx: 0.4, rz: 0.275 }, { y: 2.04, rx: 0.45, rz: 0.33 }, { y: 1.86, rx: 0.49, rz: 0.37 }]);
    belt(sc, 'gold', 2.6, 0.244, 0.175);
  } else if (id === 'sakura01') {
    // shrine maiden: white kimono top with a crossed collar over a red under-collar, wide pleated red hakama
    cap('cloth', 3.47, 2.4, 0.02, bustG);
    for (const side of [-1, 1]) { // crossed collar: left panel over right, each edged in red
      const pts = [[side * 0.13, 3.45, 0.05], [side * 0.1, 3.4, 0.17], [side * 0.03, 3.2, 0.245], [-side * 0.06, 2.95, 0.265]];
      sc.path('suit', pts, () => [0.008, 0.02], { up: [0, 0.2, 1], N: 8, samples: 8 });
      sc.path('cloth', pts.map(([x, y, z]) => [x + side * 0.02, y - 0.01, z + 0.012]), () => [0.01, 0.025], { up: [0, 0.2, 1], N: 8, samples: 8 });
    }
    pleatedSkirt(sc, 'suit', [{ y: 2.66, rx: 0.26, rz: 0.19 }, { y: 2.45, rx: 0.33, rz: 0.235 }, { y: 2.2, rx: 0.42, rz: 0.3 }, { y: 1.6, rx: 0.52, rz: 0.4 }, { y: 0.9, rx: 0.6, rz: 0.48 }, { y: 0.32, rx: 0.64, rz: 0.52 }]);
    belt(sc, 'suit', 2.62, 0.262, 0.192);
    bow(sc, 'suit', [0, 2.6, 0.24], 0, 1.1); // hakama ties
  } else {
    // tailored navy blazer with a deep V over a white blouse, gold buttons, pencil skirt
    cap('cloth', 3.45, 2.62, 0.008, bustG, (x, z, zf) => (zf > 0.0 ? 3.46 - 0.16 * smooth(0.0, 0.6, zf) : null));
    const vTrim = (x, z, zf) => (zf > 0.1 ? 2.93 + Math.min(0.55, Math.abs(x) * 5.2) * smooth(0.1, 0.55, zf) : null);
    cap('suit', 3.46, 2.2, 0.02, bustG, vTrim);
    lapels(sc, body, bustG);
    for (const y of [2.82, 2.66, 2.5]) sc.cyl('gold', [0.0, y, 0.255], 0.01, 0.034, 0.034, [Math.PI / 2, 0, 0], 16);
    sc.ell('gold', [-0.2, 3.1, 0.255], [0.024, 0.024, 0.01]);
    skirt(sc, 'suit', [{ y: 2.4, rx: 0.292, rz: 0.2 }, { y: 2.23, rx: 0.404, rz: 0.275 }, { y: 2.05, rx: 0.404, rz: 0.272 }, { y: 1.8, rx: 0.376, rz: 0.255 }, { y: 1.48, rx: 0.338, rz: 0.235 }]);
  }
  void st;
}
function sailorCollar(sc) {
  // square navy flap across the upper back, and two navy bands running down into the front V, each with a white stripe
  const back = [[-0.24, 3.43, -0.13], [0, 3.46, -0.15], [0.24, 3.43, -0.13]];
  sc.path('suit', [[0, 3.44, -0.16], [0, 3.32, -0.215], [0, 3.2, -0.23]], () => [0.012, 0.24], { up: [0, 0.2, -1], N: 8, samples: 6, close: false });
  sc.path('cloth', [[0, 3.235, -0.239], [0, 3.225, -0.241]], () => [0.004, 0.2], { up: [0, 0.2, -1], N: 8, samples: 2, close: false });
  void back;
  for (const side of [-1, 1]) {
    const pts = [[side * 0.2, 3.44, -0.08], [side * 0.15, 3.43, 0.1], [side * 0.09, 3.33, 0.205], [side * 0.03, 3.18, 0.232]];
    sc.path('suit', pts, (t) => [0.01, lerp(0.05, 0.03, t)], { up: [side * 0.3, 0.5, 1], N: 8, samples: 8 });
    sc.path('cloth', pts.map(([x, y, z]) => [x + side * 0.012, y + 0.004, z + 0.012]), () => [0.003, 0.006], { up: [0, 0, 1], N: 6, samples: 8 });
  }
}
function pleatedSkirt(sc, kind, keys) {
  const full = keys.map((k) => ({ cx: 0, cz: -0.008, n: 2.3, ...k }));
  const pleat = (x, y, z, s, zf) => {
    const d = bodyDeform(0, 0.025)(x, y, z, s, zf); const a = Math.atan2(d[0] - s.cx, d[2] - s.cz);
    const k = 1 + 0.045 * Math.abs(Math.sin(a * 11)) * smooth(2.35, 1.9, y); // sharp pleats opening toward the hem
    return [s.cx + (d[0] - s.cx) * k, d[1], s.cz + (d[2] - s.cz) * k];
  };
  sc.loft(kind, sectionsFrom(full, 44), { N: 132, offset: 0.012, deform: pleat });
}
function skirt(sc, kind, keys, ) {
  const full = keys.map((k) => ({ cx: 0, cz: -0.008, n: 2.3, ...k }));
  sc.loft(kind, sectionsFrom(full, 40), { N: 60, offset: 0.012, deform: bodyDeform(0, 0.03) });
}
function belt(sc, kind, y, rx, rz) { sc.loft(kind, sectionsFrom([{ y: y + 0.014, cz: 0, rx, rz, n: 2.2 }, { y: y - 0.014, cz: 0, rx, rz, n: 2.2 }], 3), { N: 56, offset: 0.02 }); }
function hemBand(sc, kind, y, rx, rz) { sc.loft(kind, sectionsFrom([{ y: y + 0.03, cz: -0.008, rx, rz, n: 2.3 }, { y, cz: -0.008, rx, rz, n: 2.3 }], 3), { N: 60, offset: 0.0135 }); }
function trimLine(sc, kind, edgeY, body, off, deform, r) {
  const near = (y) => body.reduce((a, s) => (Math.abs(s.y - y) < Math.abs(a.y - y) ? s : a), body[0]);
  const pts = [];
  for (let k = 0; k <= 48; k += 1) {
    const a = Math.PI + (2 * Math.PI * k) / 48; const c = Math.cos(a); const sn = Math.sin(a);
    let sec = near(3.4); let x = sec.cx + (sec.rx + off) * spow(sn, 2 / 2.4); let zf = c;
    let y = edgeY(x, zf);
    sec = near(y); x = sec.cx + (sec.rx + off) * spow(sn, 2 / sec.n); const z = sec.cz + (sec.rz + off) * spow(c, 2 / sec.n); zf = (z - sec.cz) / (sec.rz + off); y = edgeY(x, zf);
    const d = deform ? deform(x, y, z, sec, zf, 0) : [x, y, z]; pts.push([d[0], d[1], d[2]]);
  }
  sc.strand(kind, pts, r, r, 6, 1);
}
function lapels(sc, body, deform) {
  void body; void deform;
  for (const side of [-1, 1]) sc.strand('suitDark', [[side * 0.02, 2.95, 0.235], [side * 0.075, 3.12, 0.255], [side * 0.14, 3.3, 0.235], [side * 0.18, 3.43, 0.17]], 0.016, 0.014, 8, 16);
}

const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  unit: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
// rotate vector a toward b (both unit, orthogonal) by angle
const swing = (a, b, ang) => v3.add(v3.mul(a, Math.cos(ang)), v3.mul(b, Math.sin(ang)));

function sculptArm(sc, id, side) {
  const { S, E, W, arm } = armJoints(id, side);
  const inner = [side * 0.25, 3.41, -0.01];
  const elbowOut = v3.unit(v3.sub(v3.add(E, v3.mul(v3.sub(E, S), 0.0)), v3.lerp(S, W, 0.5)));
  const ctrl = [inner, S, v3.lerp(S, E, 0.45), v3.add(E, v3.mul(elbowOut, 0.012)), v3.lerp(E, W, 0.5), W];
  // shoulder → bicep → elbow → forearm → wrist taper (fractions of arc length)
  const R = (t) => {
    const k = [[0, 0.07, 0.078], [0.08, 0.092, 0.098], [0.2, 0.084, 0.088], [0.4, 0.07, 0.072], [0.53, 0.057, 0.06], [0.62, 0.062, 0.058], [0.78, 0.05, 0.046], [0.94, 0.037, 0.03], [1, 0.035, 0.028]];
    let i = 0; while (i < k.length - 2 && t > k[i + 1][0]) i += 1;
    const f = smooth(k[i][0], k[i + 1][0], t); return [lerp(k[i][1], k[i + 1][1], f), lerp(k[i][2], k[i + 1][2], f)];
  };
  const palm = v3.unit(arm.palm);
  const opts = { up: palm, N: 24, samples: 14 };
  sc.path('skin', ctrl, R, opts);
  // cumulative arc fraction at the elbow and wrist, for sleeve lengths
  const len = (a, b) => Math.hypot(...v3.sub(b, a));
  const total = len(inner, S) + len(S, E) + len(E, W);
  const atElbow = (len(inner, S) + len(S, E)) / total;
  if (id === 'office01') { // long fitted blouse sleeve, navy cuff, slim gold bracelet
    sc.path('cloth', ctrl, R, { ...opts, t1: 0.9, offset: 0.012, close: false });
    sc.path('suit', ctrl, R, { ...opts, t0: 0.89, t1: 0.95, offset: 0.017, close: false });
    sc.path('gold', ctrl, R, { ...opts, t0: 0.975, t1: 0.99, offset: 0.006, close: false, N: 16 });
  } else if (id === 'nurse01') { // short fitted sleeve with pink trim, pink wrist band
    sc.path('cloth', ctrl, R, { ...opts, t1: atElbow * 0.55, offset: 0.016, close: false });
    sc.path('accent', ctrl, R, { ...opts, t0: atElbow * 0.53, t1: atElbow * 0.58, offset: 0.02, close: false });
    sc.path('accent', ctrl, R, { ...opts, t0: 0.965, t1: 0.985, offset: 0.006, close: false, N: 16 });
  } else if (id === 'student01') { // short white blouse sleeve with a neat folded cuff
    sc.path('cloth', ctrl, R, { ...opts, t1: atElbow * 0.6, offset: 0.016, close: false });
    sc.path('cloth', ctrl, R, { ...opts, t0: atElbow * 0.56, t1: atElbow * 0.62, offset: 0.021, close: false });
  } else if (id === 'idol01') { // puffed red sleeve with a white frill, white glove cuff with gold band
    sc.path('suit', ctrl, R, { ...opts, t1: atElbow * 0.45, offset: 0.032, close: false });
    sc.path('cloth', ctrl, R, { ...opts, t0: atElbow * 0.42, t1: atElbow * 0.49, offset: 0.036, close: false });
    sc.path('cloth', ctrl, R, { ...opts, t0: 0.84, t1: 1, offset: 0.006, close: false });
    sc.path('gold', ctrl, R, { ...opts, t0: 0.84, t1: 0.865, offset: 0.012, close: false, N: 16 });
  } else if (id === 'janitor01') { // short work sleeve with a darker band; yellow rubber gloves to mid-forearm
    sc.path('suit', ctrl, R, { ...opts, t1: atElbow * 0.6, offset: 0.018, close: false });
    sc.path('suitDark', ctrl, R, { ...opts, t0: atElbow * 0.56, t1: atElbow * 0.62, offset: 0.022, close: false });
    sc.path('accent', ctrl, R, { ...opts, t0: 0.72, t1: 1, offset: 0.006, close: false });
    sc.path('accent', ctrl, R, { ...opts, t0: 0.72, t1: 0.75, offset: 0.012, close: false });
  } else if (id === 'rin01') { // long white sailor sleeve with a navy cuff and white stripe
    sc.path('cloth', ctrl, R, { ...opts, t1: 0.9, offset: 0.014, close: false });
    sc.path('suit', ctrl, R, { ...opts, t0: 0.86, t1: 0.94, offset: 0.019, close: false });
    sc.path('cloth', ctrl, R, { ...opts, t0: 0.885, t1: 0.915, offset: 0.022, close: false, N: 16 });
  } else if (id === 'aoi01') { // short polo sleeve with a blue band, blue terry wristband
    sc.path('cloth', ctrl, R, { ...opts, t1: atElbow * 0.6, offset: 0.016, close: false });
    sc.path('suit', ctrl, R, { ...opts, t0: atElbow * 0.56, t1: atElbow * 0.62, offset: 0.02, close: false });
    sc.path('suit', ctrl, R, { ...opts, t0: 0.9, t1: 0.97, offset: 0.012, close: false });
  } else if (id === 'mei01') { // puffed black sleeve with a white frilled band, white wrist cuffs
    sc.path('suit', ctrl, R, { ...opts, t1: atElbow * 0.45, offset: 0.034, close: false });
    sc.path('cloth', ctrl, R, { ...opts, t0: atElbow * 0.42, t1: atElbow * 0.5, offset: 0.03, close: false });
    sc.path('cloth', ctrl, R, { ...opts, t0: 0.9, t1: 0.97, offset: 0.012, close: false });
  } else if (id === 'yuki01') { // long ice-blue sleeve that flares into a silver-trimmed bell cuff
    sc.path('suit', ctrl, R, { ...opts, t1: 0.86, offset: 0.012, close: false });
    sc.path('suit', ctrl, R, { ...opts, t0: 0.8, t1: 0.93, offset: 0.03, close: false });
    sc.path('gold', ctrl, R, { ...opts, t0: 0.92, t1: 0.94, offset: 0.034, close: false, N: 16 });
  } else if (id === 'kana01') { // oversized cardigan sleeve pushed up past the elbow, stacked gold bangles
    sc.path('suit', ctrl, R, { ...opts, t1: atElbow * 1.12, offset: 0.026, close: false });
    sc.path('suitDark', ctrl, R, { ...opts, t0: atElbow * 1.04, t1: atElbow * 1.14, offset: 0.032, close: false });
    for (const t of [0.92, 0.95]) sc.path('gold', ctrl, R, { ...opts, t0: t, t1: t + 0.02, offset: 0.01, close: false, N: 16 });
  } else if (id === 'sakura01') { // wide white kimono sleeve edged in red, hanging in a deep drape below the forearm
    sc.path('cloth', ctrl, R, { ...opts, t1: 0.82, offset: 0.05, close: false });
    sc.path('suit', ctrl, R, { ...opts, t0: 0.8, t1: 0.83, offset: 0.054, close: false });
    const mid = v3.lerp(E, W, 0.35);
    sc.ell('cloth', [mid[0] + side * 0.01, mid[1] - 0.15, mid[2]], [0.07, 0.34, 0.24], [0, 0, 0], 14);
  } else { // tailored blazer sleeve, crisp white cuff
    sc.path('suit', ctrl, R, { ...opts, t1: 0.88, offset: 0.019, close: false });
    sc.path('cloth', ctrl, R, { ...opts, t0: 0.86, t1: 0.93, offset: 0.012, close: false });
  }
  hand(sc, W, v3.unit(v3.sub(W, E)), arm, side, id === 'janitor01' ? 'accent' : id === 'idol01' ? 'cloth' : 'skin');
  if (arm.prop === 'clipboard') clipboard(sc, W, arm);
  if (arm.prop === 'bag') schoolBag(sc, W, arm);
  if (arm.prop === 'mop') mop(sc, W, arm, side);
  if (arm.prop === 'mic') microphone(sc, W, arm);
  if (arm.prop === 'book') book(sc, W, arm);
  if (arm.prop === 'tray') tray(sc, W, arm);
  if (arm.prop === 'snow') snowflake(sc, W, arm);
  if (arm.prop === 'phone') phone(sc, W, arm);
  if (arm.prop === 'broom') broom(sc, W, arm);
}

// A slender, feminine hand: palm loft + four jointed fingers + thumb, curled toward the palm.
function hand(sc, W, foreDir, arm, side, kind = 'skin') {
  let d = v3.unit(arm.hand); let n = v3.unit(arm.palm);
  n = v3.unit(v3.sub(n, v3.mul(d, v3.dot(n, d))));
  const w = v3.cross(d, n); const thumbSide = v3.mul(w, -side);
  // wrist → knuckles, blending from the forearm direction
  const K = v3.add(W, v3.mul(d, 0.13));
  sc.path(kind, [v3.sub(W, v3.mul(foreDir, 0.03)), W, v3.add(W, v3.mul(d, 0.07)), K], (t) => [lerp(0.024, 0.02, t), lerp(0.036, 0.046, smooth(0, 0.6, t))], { up: n, N: 20, samples: 8 });
  const curl = arm.curl;
  const fingers = [[0.68, 0.12], [0.22, 0.135], [-0.24, 0.128], [-0.68, 0.104]]; // [offset along thumb side, length]
  fingers.forEach(([o, L], i) => {
    const r0 = 0.0118 - i * 0.0007;
    let p = v3.add(v3.add(K, v3.mul(thumbSide, o * 0.036)), v3.mul(d, -0.006 + (Math.abs(o) > 0.5 ? -0.008 : 0)));
    const splay = v3.unit(v3.add(d, v3.mul(thumbSide, o * 0.09 * (1 - curl))));
    const pts = [v3.sub(p, v3.mul(splay, 0.02)), p];
    let dir = splay;
    [0.42, 0.33, 0.25].forEach((seg, j) => {
      const nn = v3.unit(v3.sub(n, v3.mul(dir, v3.dot(n, dir))));
      dir = v3.unit(swing(dir, nn, curl * [0.55, 0.75, 0.55][j] + 0.06));
      p = v3.add(p, v3.mul(dir, L * seg)); pts.push(p);
    });
    sc.path(kind, pts, (t) => [lerp(r0 * 0.9, r0 * 0.62, t), lerp(r0, r0 * 0.7, t)], { up: n, N: 12, samples: 6 });
  });
  // thumb: from the base of the palm, angled across toward the fingers
  let p = v3.add(v3.add(W, v3.mul(d, 0.028)), v3.add(v3.mul(thumbSide, 0.03), v3.mul(n, 0.012)));
  let dir = v3.unit(v3.add(v3.add(v3.mul(d, 0.65), v3.mul(thumbSide, 0.55)), v3.mul(n, 0.35)));
  const tp = [v3.sub(p, v3.mul(dir, 0.02)), p];
  [0.05, 0.042, 0.034].forEach((seg) => { dir = v3.unit(v3.add(dir, v3.mul(v3.sub(n, thumbSide), 0.18 + curl * 0.25))); p = v3.add(p, v3.mul(dir, seg)); tp.push(p); });
  sc.path(kind, tp, (t) => [lerp(0.016, 0.0095, t), lerp(0.018, 0.011, t)], { up: n, N: 12, samples: 6 });
}

function schoolBag(sc, W, arm) {
  // navy school bag hanging from its handle in the curled fingers
  const g = v3.add(W, v3.mul(v3.unit(arm.hand), 0.09));
  const c = [g[0], g[1] - 0.25, g[2] - 0.02];
  sc.box('suit', c, [0.1, 0.3, 0.44]);
  sc.box('suitDark', [c[0], c[1] + 0.06, c[2]], [0.105, 0.14, 0.445]);
  sc.box('gold', [c[0] + Math.sign(c[0]) * 0.055, c[1] + 0.02, c[2]], [0.006, 0.03, 0.05]);
  for (const dz of [-0.07, 0.07]) sc.strand('suitDark', [[c[0], c[1] + 0.15, c[2] + dz], [g[0], g[1] + 0.02, g[2] + dz * 0.4]], 0.008, 0.008, 6, 4);
  sc.ell('accent', [c[0] + Math.sign(c[0]) * 0.06, c[1] + 0.08, c[2] + 0.12], [0.012, 0.05, 0.035], [0, 0, 0], 8); // little charm
}
function microphone(sc, W, arm) {
  // gold stage mic: the handle runs through the fist and the grille sits just under her chin
  const d = v3.unit(arm.hand);
  const g = v3.add(W, v3.mul(d, 0.075));
  const mouth = [0.02, CHIN + 0.04, 0.26];
  const ax = v3.unit(v3.sub(mouth, g));
  const tail = v3.sub(g, v3.mul(ax, 0.1)); const neck = v3.add(g, v3.mul(ax, 0.17));
  sc.path('gold', [tail, g, neck], (t) => [lerp(0.013, 0.021, t), lerp(0.013, 0.021, t)], { up: [1, 0, 0], N: 14, samples: 6 });
  sc.path('suit', [v3.add(g, v3.mul(ax, 0.06)), v3.add(g, v3.mul(ax, 0.1))], () => [0.024, 0.024], { up: [1, 0, 0], N: 14, samples: 3 });
  const head = v3.add(neck, v3.mul(ax, 0.04));
  sc.ell('gold', head, [0.07, 0.07, 0.07], [0, 0, 0], 16);
}
function mop(sc, W, arm, side) {
  // upright mop: the handle passes through the fist, the mop head rests on the floor
  const d = v3.unit(arm.hand);
  const g = v3.add(W, v3.mul(d, 0.075));
  const top = g[1] + 0.75; const base = 0.12; const h = top - base;
  sc.cyl('gold', [g[0], base + h / 2, g[2]], h, 0.032, 0.032, [0, 0, 0], 14);
  sc.cyl('accent', [g[0], top + 0.03, g[2]], 0.06, 0.036, 0.036, [0, 0, 0], 14);
  sc.cyl('suitDark', [g[0], base + 0.02, g[2]], 0.05, 0.09, 0.07, [0, 0, 0], 16);
  for (let k = 0; k < 18; k += 1) { // cotton strands fanning onto the floor
    const a = (k / 18) * Math.PI * 2; const r = 0.12 + 0.04 * Math.sin(k * 2.7);
    sc.strand('cloth', [[g[0], base, g[2]], [g[0] + Math.cos(a) * r * 0.5, base - 0.05, g[2] + Math.sin(a) * r * 0.5], [g[0] + Math.cos(a) * r, 0.015, g[2] + Math.sin(a) * r]], 0.016, 0.011, 6, 6);
  }
  void side;
}
function book(sc, W, arm) {
  // hard-cover book held flat against the hip, spine in the palm
  const n = v3.unit(arm.palm);
  const c = v3.add(W, [n[0] * 0.05, -0.17, -0.12]);
  sc.box('suit', c, [0.07, 0.34, 0.26], [0.05, 0, 0]);
  sc.box('cloth', v3.add(c, [0, 0, 0.004]), [0.058, 0.33, 0.255], [0.05, 0, 0]);
  sc.box('accent', v3.add(c, [-0.036, 0.06, 0]), [0.004, 0.04, 0.2], [0.05, 0, 0]);
}
function tray(sc, W, arm) {
  // round silver tray on the upturned palm with a teacup and a little teapot
  const d = v3.unit(arm.hand);
  const t = v3.add(W, v3.add(v3.mul(d, 0.08), [0, 0.035, 0]));
  sc.cyl('gold', t, 0.014, 0.42, 0.4, [0, 0, 0], 32);
  sc.cyl('gold', v3.add(t, [0, 0.012, 0]), 0.012, 0.43, 0.43, [0, 0, 0], 32);
  sc.cyl('cloth', v3.add(t, [0.08, 0.012, 0.03]), 0.01, 0.13, 0.12, [0, 0, 0], 20); // saucer
  sc.cyl('cloth', v3.add(t, [0.08, 0.05, 0.03]), 0.07, 0.085, 0.06, [0, 0, 0], 20); // cup
  sc.cyl('accent', v3.add(t, [0.08, 0.086, 0.03]), 0.004, 0.078, 0.078, [0, 0, 0], 20); // tea
  sc.ell('cloth', v3.add(t, [-0.08, 0.07, -0.03]), [0.13, 0.11, 0.13], [0, 0, 0], 16); // teapot
  sc.cyl('cloth', v3.add(t, [-0.15, 0.08, -0.03]), 0.08, 0.02, 0.03, [0, 0, 0.9], 10);
  sc.ell('accent', v3.add(t, [-0.08, 0.13, -0.03]), [0.03, 0.025, 0.03], [0, 0, 0], 8);
}
function snowflake(sc, W, arm) {
  // ice crystal hovering above the open palm
  const c = v3.add(W, v3.add(v3.mul(v3.unit(arm.hand), 0.07), [0, 0.2, 0]));
  for (let k = 0; k < 3; k += 1) {
    const a = (k / 3) * Math.PI;
    sc.box('accent', c, [0.012, 0.22, 0.012], [0, 0, a]);
    for (const s of [-1, 1]) for (const u of [0.06, 0.09]) {
      const p = [c[0] - Math.sin(a) * s * u, c[1] + Math.cos(a) * s * u, c[2]];
      sc.box('accent', p, [0.008, 0.05, 0.008], [0, 0, a + 0.8]); sc.box('accent', p, [0.008, 0.05, 0.008], [0, 0, a - 0.8]);
    }
  }
  sc.ell('gold', c, [0.04, 0.04, 0.02], [0, 0, 0], 10);
}
function phone(sc, W, arm) {
  // smartphone in a pink case held up for a selfie, screen toward her face
  const d = v3.unit(arm.hand); const n = v3.unit(arm.palm);
  const c = v3.add(W, v3.add(v3.mul(d, 0.09), v3.mul(n, 0.03)));
  const yaw = Math.atan2(n[0], n[2]);
  sc.box('suitDark', c, [0.085, 0.17, 0.014], [0, yaw, 0]);
  sc.box('lens', v3.add(c, v3.mul(n, 0.008)), [0.074, 0.155, 0.002], [0, yaw, 0]);
  sc.ell('accent', v3.add(c, [0, -0.11, 0]), [0.025, 0.025, 0.012], [0, yaw, 0], 8); // charm
}
function broom(sc, W, arm) {
  // bamboo shrine broom: the handle passes through the fist, the brush of twigs rests on the floor
  const d = v3.unit(arm.hand);
  const g = v3.add(W, v3.mul(d, 0.075));
  const top = g[1] + 0.7; const base = 0.32; const h = top - base;
  sc.cyl('gold', [g[0], base + h / 2, g[2]], h, 0.03, 0.03, [0, 0, 0], 14);
  sc.cyl('suit', [g[0], base + 0.02, g[2]], 0.05, 0.05, 0.05, [0, 0, 0], 14);
  for (let k = 0; k < 22; k += 1) {
    const a = (k / 22) * Math.PI * 2; const r = 0.1 + 0.05 * Math.sin(k * 3.1);
    sc.strand('gold', [[g[0], base + 0.02, g[2]], [g[0] + Math.cos(a) * r * 0.45, base - 0.15, g[2] + Math.sin(a) * r * 0.45], [g[0] + Math.cos(a) * r, 0.015, g[2] + Math.sin(a) * r]], 0.01, 0.005, 5, 6);
  }
}
function clipboard(sc, W, arm) {
  // board stands in the arm's sagittal plane, its front-top edge in the palm
  const n = v3.unit(arm.palm);
  const c = v3.add(W, [n[0] * 0.05, -0.23, -0.16]);
  sc.box('suitDark', c, [0.03, 0.46, 0.36], [0.05, 0, 0]);
  sc.box('cloth', v3.add(c, [-0.017, -0.02, 0]), [0.006, 0.4, 0.31], [0.05, 0, 0]);
  sc.box('gold', v3.add(c, [-0.022, 0.2, 0.0]), [0.014, 0.035, 0.12], [0.05, 0, 0]);
  for (let i = 0; i < 6; i += 1) sc.box('suitDark', v3.add(c, [-0.021, 0.12 - i * 0.05, 0.02]), [0.003, 0.008, 0.22], [0.05, 0, 0]);
}
function ringAround(secs, y, off, lift) {
  const s = secs.reduce((a, b) => (Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a), secs[0]); void lift;
  return Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return [s.cx + Math.cos(a) * (s.rx + off), s.y, s.cz + Math.sin(a) * (s.rz + off)]; });
}

function sculptLegs(sc, id) {
  const st = sc.style; const heel = st.heel; const ay = 0.17 + heel * 0.6;
  for (const side of [-1, 1]) {
    const flip = side > 0;
    const leg = [
      { y: 2.2, cx: side * 0.2, cz: -0.005, rx: 0.212, rz: 0.228, n: 2.1 },
      { y: 1.9, cx: side * 0.178, cz: 0.0, rx: 0.182, rz: 0.196, n: 2.05 },
      { y: 1.6, cx: side * 0.158, cz: 0.0, rx: 0.155, rz: 0.166, n: 2 },
      { y: 1.36, cx: side * 0.142, cz: 0.0, rx: 0.123, rz: 0.134, n: 2 },
      { y: 1.2, cx: side * 0.137, cz: 0.004, rx: 0.108, rz: 0.114, n: 2 },
      { y: 1.04, cx: side * 0.132, cz: -0.002, rx: 0.103, rz: 0.113, n: 2 },
      { y: 0.86, cx: side * 0.127, cz: -0.014, rx: 0.1, rz: 0.118, n: 2 },
      { y: 0.6, cx: side * 0.118, cz: -0.01, rx: 0.077, rz: 0.088, n: 2 },
      { y: 0.38, cx: side * 0.11, cz: -0.004, rx: 0.058, rz: 0.062, n: 2 },
      { y: ay + 0.02, cx: side * 0.106, cz: 0.0, rx: 0.049, rz: 0.052, n: 2 },
      { y: ay - 0.03, cx: side * 0.106, cz: 0.0, rx: 0.046, rz: 0.05, n: 2 },
    ];
    const secs = sectionsFrom(leg, 60);
    sc.loft('skin', secs, { N: 36, flip });
    if (st.stockTo > ay + 0.05) sc.loft('stock', sliceY(secs, st.stockTo, ay), { N: 36, offset: 0.004, flip });
    if (id === 'student01') sc.loft('stock', sliceY(secs, st.stockTo + 0.02, st.stockTo - 0.04), { N: 36, offset: 0.008, flip }); // folded sock rim
    if (id === 'idol01') { // over-knee stockings with a gold frill band, glossy red ankle boots with a gold cuff
      sc.loft('accent', sliceY(secs, st.stockTo + 0.01, st.stockTo - 0.035), { N: 36, offset: 0.009, flip });
      sc.loft('shoe', sliceY(secs, 0.68, ay), { N: 36, offset: 0.012, flip });
      sc.loft('gold', sliceY(secs, 0.7, 0.66), { N: 36, offset: 0.016, flip });
    }
    if (id === 'janitor01') { // straight work trousers with a rolled hem
      const pant = sliceY(secs, 2.2, ay + 0.06).map((s) => ({ ...s, rx: Math.max(s.rx, 0.085 + 0.02 * smooth(1.2, 0.3, s.y)), rz: Math.max(s.rz, 0.09 + 0.02 * smooth(1.2, 0.3, s.y)) }));
      sc.loft('suit', pant, { N: 36, offset: 0.02, flip });
      sc.loft('suitDark', pant.filter((s) => s.y < ay + 0.12), { N: 36, offset: 0.026, flip });
    }
    if (id === 'nurse01') sc.loft('accent', sliceY(secs, 1.54, 1.49), { N: 36, offset: 0.007, flip });
    if (id === 'rin01' || id === 'mei01') sc.loft(id === 'rin01' ? 'stock' : 'accent', sliceY(secs, st.stockTo + 0.015, st.stockTo - 0.02), { N: 36, offset: 0.008, flip }); // stocking band
    if (id === 'aoi01') sc.loft('suit', sliceY(secs, st.stockTo + 0.01, st.stockTo - 0.025), { N: 36, offset: 0.008, flip }); // sock stripe
    if (id === 'kana01') sc.loft('stock', sliceY(secs, 0.62, 0.28).map((q) => ({ ...q, rx: q.rx + 0.02 * smooth(0.62, 0.3, q.y), rz: q.rz + 0.02 * smooth(0.62, 0.3, q.y) })), { N: 36, offset: 0.012, flip }); // slouchy loose socks
    // shoe: pitched foot loft along Z, with heel and instep
    const sole = (z) => Math.max(0, heel * (0.27 - z) / 0.34);
    const foot = [[-0.07, 0.05, 0.042], [-0.035, 0.056, 0.045], [0.02, 0.05, 0.046], [0.1, 0.04, 0.05], [0.18, 0.03, 0.045], [0.235, 0.022, 0.032], [0.265, 0.012, 0.015]]
      .map(([z, ry, rx]) => ({ z, cx: side * 0.106, cy: sole(z) + ry, rx, ry }));
    sc.loftZ('shoe', foot, 24, flip);
    if (heel > 0.05) sc.cyl('shoe', [side * 0.106, heel * 0.5, -0.05], heel, 0.044, id === 'ceo01' ? 0.02 : 0.034, [0, 0, 0], 14);
    if (id === 'nurse01') sc.strand('accent', Array.from({ length: 17 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return [side * 0.106 + Math.cos(a) * 0.05, ay - 0.02, Math.sin(a) * 0.053]; }), 0.005, 0.005, 6, 1);
    if (id === 'ceo01') sc.box('gold', [side * 0.106, heel + 0.06, 0.012], [0.06, 0.008, 0.01]);
    if (id === 'student01' || id === 'kana01') sc.box('suitDark', [side * 0.106, 0.09, 0.12], [0.075, 0.014, 0.03]); // loafer strap
    if (id === 'aoi01') { // tennis shoe sole + laces
      sc.loftZ('gold', [[-0.075, 0.046], [0.0, 0.05], [0.12, 0.052], [0.25, 0.036], [0.275, 0.018]].map(([z, rx]) => ({ z, cx: side * 0.106, cy: 0.012, rx, ry: 0.013 })), 20, flip);
      for (let k = 0; k < 3; k += 1) sc.box('suit', [side * 0.106, 0.085 - k * 0.008, 0.07 + k * 0.035], [0.05, 0.006, 0.008], [0.35, 0, 0]);
    }
    if (id === 'sakura01') sc.box('suit', [side * 0.106, 0.075, 0.13], [0.02, 0.012, 0.08], [0.3, 0, 0]); // red zori thong
    if (id === 'mei01') sc.box('shoe', [side * 0.106, 0.1, 0.1], [0.08, 0.012, 0.02]); // mary-jane strap
    if (id === 'janitor01') { // sneaker sole + laces
      sc.loftZ('suitDark', [[-0.075, 0.046], [0.0, 0.05], [0.12, 0.052], [0.25, 0.036], [0.275, 0.018]].map(([z, rx]) => ({ z, cx: side * 0.106, cy: 0.012, rx, ry: 0.013 })), 20, flip);
      for (let k = 0; k < 3; k += 1) sc.box('accent', [side * 0.106, 0.085 - k * 0.008, 0.07 + k * 0.035], [0.05, 0.006, 0.008], [0.35, 0, 0]);
    }
  }
}
