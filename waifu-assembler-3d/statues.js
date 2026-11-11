// Babylon.js statue kit v2 — every body part is a continuous lofted surface (cross-sections blended with splines),
// not stacked spheres. Parts share exact joint profiles (neck, shoulders, hips) so the figure reads as one body.
// Figure space: +Y up, feet at y=0, +Z is the front. Each part is built in figure space, then recentred on PART_OFFSET.
import { getSet } from './logic.mjs';
import { armJoints } from './poses.mjs';

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
  // cute schoolgirl in a classic sailor uniform (modest, knee-length skirt, knee socks, loafers)
  student01: {
    hair: '#3a2622', hairTip: '#7a5040', eye: '#7b5bd6', eyeDeep: '#2b1a55', cloth: '#f6f6fa', suit: '#26306a', suitDark: '#1b2250',
    accent: '#e04a5f', skin: '#fadccd', shoe: '#4a2a1c', stock: '#f4f4f6', gold: '#e9d9a6', lip: '#ec8f9c', blush: '#ffa3b1', heel: 0.02, stockTo: 0.95,
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
};
// Bust / hip fullness per character; the student keeps a youthful, modest silhouette.
const FIGURE = { office01: [0.071, 0.047], nurse01: [0.071, 0.047], ceo01: [0.071, 0.047], student01: [0.03, 0.025], janitor01: [0.058, 0.045], idol01: [0.058, 0.04] };

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
        m.albedoColor = hex(s.skin); m.roughness = 0.5; m.metallic = 0;
        m.emissiveColor = hex(s.skin).scale(0.12);
        m.sheen.isEnabled = true; m.sheen.intensity = 0.3; m.sheen.color = hex('#ffcdbf');
      });
      case 'face': return pbr(key, (m) => {
        m.albedoTexture = faceTexture(setId); m.roughness = 0.48;
        m.useAlphaFromAlbedoTexture = true; m.transparencyMode = BAB.PBRMaterial.PBRMATERIAL_ALPHATEST; m.alphaCutOff = 0.5;
        m.emissiveTexture = faceTexture(setId); m.emissiveColor = hex('#ffffff').scale(0.12);
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
    m.alpha = 0.5;
    m.alphaMode = BAB.Engine.ALPHA_ADD;
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
  function faceTexture(setId) {
    if (faceTextures.has(setId)) return faceTextures.get(setId);
    const tex = new BAB.DynamicTexture(`face-${setId}`, { width: 2048, height: 1024 }, scene, true);
    tex.hasAlpha = true;
    drawFace(tex.getContext(), 2048, 1024, setId);
    tex.update(true);
    tex.anisotropicFilteringLevel = 8;
    tex.wrapU = BAB.Texture.WRAP_ADDRESSMODE; tex.wrapV = BAB.Texture.CLAMP_ADDRESSMODE;
    faceTextures.set(setId, tex);
    return tex;
  }

  return {
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
function drawFace(ctx, W, H, setId) {
  const s = STYLE[setId];
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
    radial(ctx, X(side * 0.108), Y(0.185), 170, 95, hexA(s.blush, L.blush)); // blush
    radial(ctx, X(side * 0.1), Y(0.205), 90, 40, hexA('#ffffff', 0.1 + (L.sparkle || 0) * 0.08)); // highlighter on the cheekbone
    radial(ctx, X(side * 0.05), Y(0.235), 26, 18, hexA('#ffffff', 0.16)); // under-eye brightener
  }
  radial(ctx, X(0), Y(0.04), 80, 40, hexA('#ffffff', 0.12)); // chin glow

  // --- eyes ---
  for (const side of [-1, 1]) drawEye(ctx, X(side * F.eyeX), Y(F.eye), side, s, rnd, setId);
  // --- brows ---
  for (const side of [-1, 1]) drawBrow(ctx, X(side * F.eyeX), Y(F.brow), side, s, rnd, setId);
  // --- nose: just a whisper of shadow under the tip and two tiny nostrils ---
  radial(ctx, X(0), Y(F.noseTip - 0.014), 34, 10, hexA('#a05a52', 0.2));
  for (const side of [-1, 1]) radial(ctx, X(side * 0.014), Y(F.noseTip - 0.011), 9, 5, hexA('#7a3a36', 0.38));
  for (const side of [-1, 1]) radial(ctx, X(side * 0.024), Y(0.25), 10, 60, hexA('#a05a52', 0.08));
  // --- lips ---
  drawLips(ctx, X(0), Y(F.mouth), s, setId);
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
  // --- open the eyelids: the sclera/iris are real 3D eyeballs behind the skin ---
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
  for (const side of [-1, 1]) {
    const [ex, ey] = eyeCentrePx(side); const { hw, hgt } = EYE_SHAPE[setId];
    const c = eyeCurves(ex, ey + 3, side, hw * 0.93, hgt * 0.86);
    ctx.beginPath(); ctx.moveTo(...c.up[0]); ctx.bezierCurveTo(...c.up[1], ...c.up[2], ...c.up[3]); ctx.bezierCurveTo(...c.lo[1], ...c.lo[2], ...c.lo[3]); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// Per-character beauty profile: every face shares the same anatomy but gets its own make-up and feature details.
//  shadow/shadow2: eyeshadow (lid → crease) · liner: wing length px · lashes/lashLen: lash count and length
//  iris2: inner iris ring colour · brow: [arch, lift, thickness] · lip: [width, fullness, cupid's bow, gloss]
//  blush · contour · extras: beauty marks, freckles, glitter, smile lines, under-eye highlight
export const LOOK = {
  office01: { shadow: '#b48a9e', shadow2: '#6e4f6c', liner: 12, lashes: 10, lashLen: 1.0, iris2: '#c49a62', brow: [18, 5, 1.0], lip: [80, 0.92, 1.0, 0.45], blush: 0.26, contour: 0.15, mark: [[0.118, 0.24]] },
  nurse01: { shadow: '#f2a5bd', shadow2: '#d27896', liner: 6, lashes: 12, lashLen: 1.08, iris2: '#ffc4d6', brow: [15, 1, 0.85], lip: [82, 1.02, 0.9, 0.65], blush: 0.42, contour: 0.08, sparkle: 0.5 },
  ceo01: { shadow: '#a0646e', shadow2: '#4b2433', liner: 26, lashes: 13, lashLen: 1.22, iris2: '#e4b04a', brow: [27, 15, 1.08], lip: [88, 1.12, 1.35, 0.22], blush: 0.2, contour: 0.24, mark: [[0.055, 0.075]] },
  student01: { shadow: '#f4bcae', shadow2: '#e09a8c', liner: 0, lashes: 9, lashLen: 0.86, iris2: '#c6b4ff', brow: [13, -1, 0.8], lip: [72, 0.86, 0.85, 0.55], blush: 0.5, contour: 0.05, freckles: 26 },
  janitor01: { shadow: '#b49280', shadow2: '#7c5c4a', liner: 4, lashes: 8, lashLen: 0.92, iris2: '#b8a060', brow: [19, 7, 1.18], lip: [84, 0.98, 1.05, 0.3], blush: 0.28, contour: 0.18, mark: [[-0.112, 0.235]] },
  idol01: { shadow: '#ff9cc4', shadow2: '#d06aa0', liner: 14, lashes: 15, lashLen: 1.28, iris2: '#bdf0ff', brow: [16, 2, 0.75], lip: [80, 1.06, 1.1, 0.8], blush: 0.46, contour: 0.08, glitter: true, sparkle: 1, lowerLash: true },
};
// Eye opening per character, in face-texture pixels (the texture is 2048 x 1024 over the head loft).
const TEX_W = 2048; const TEX_H = 1024; const PXX = 1900;
const EYE_SHAPE = { office01: { hw: 94, hgt: 47 }, nurse01: { hw: 96, hgt: 52 }, ceo01: { hw: 92, hgt: 42 }, student01: { hw: 98, hgt: 57 }, janitor01: { hw: 92, hgt: 45 }, idol01: { hw: 99, hgt: 56 } };
function eyeCurves(ex, ey, side, hw, hgt) {
  const inner = [ex - side * hw, ey + 6]; const outer = [ex + side * hw, ey - 6];
  const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };
  const up = [inner, [ex - side * hw * 0.35, ey - hgt * 1.28], [ex + side * hw * 0.42, ey - hgt * 1.36], outer];
  const lo = [outer, [ex + side * hw * 0.35, ey + hgt * 0.95], [ex - side * hw * 0.35, ey + hgt * 1.0], inner];
  return { inner, outer, up, lo, upper: (t) => bez(...up, t), lower: (t) => bez(...lo, t) };
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

function drawEye(ctx, ex, ey, side, s, rnd, setId) {
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
  const ir = ({ nurse01: 50, ceo01: 44, student01: 54, janitor01: 46, idol01: 54 })[setId] ?? 47; const ix = ex + side * 1; const iy = ey - 2;
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
  for (let k = 0; k < 3; k += 1) {
    ctx.lineWidth = 9 - k * 2.6;
    ctx.beginPath(); ctx.moveTo(inner[0] + side * 4, inner[1] - 3 - k);
    ctx.bezierCurveTo(ex - side * hw * 0.35, ey - hgt * (1.5 + k * 0.02), ex + side * hw * 0.4, ey - hgt * (1.55 + k * 0.02), outer[0] + side * (6 + k * 2), outer[1] - 6 - k * 2); ctx.stroke();
  }
  ctx.lineWidth = 3;
  for (let i = 0; i < L.lashes; i += 1) { // clumped lashes, longest at the outer corner
    const t = 0.4 + i / L.lashes * 0.6;
    const px = lerp(inner[0], outer[0], t); const py = ey - hgt * 1.5 * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.04)) + lerp(inner[1] - ey, outer[1] - ey, t) * 0.9;
    const len = (10 + 18 * t + rnd() * 3) * L.lashLen;
    const ang = -Math.PI / 2 + side * (0.15 + t * 0.85) + (rnd() - 0.5) * 0.12;
    ctx.beginPath(); ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + Math.cos(ang) * len * 0.55 + side * 3, py + Math.sin(ang) * len * 0.55, px + Math.cos(ang + side * 0.45) * len, py + Math.sin(ang + side * 0.45) * len); ctx.stroke();
  }

  ctx.lineWidth = 1.4; ctx.strokeStyle = hexA('#2a1a1e', 0.35);
  if (L.lowerLash) for (let i = 0; i < 5; i += 1) { // a few soft lower lashes on the outer corner (idol stage make-up)
    const t = 0.62 + i / 5 * 0.3; const px = lerp(inner[0], outer[0], t); const py = ey + hgt * 0.92 * Math.sin(Math.PI * t) + 2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + side * 4, py + (8 + rnd() * 5) * L.lashLen); ctx.stroke();
  }
  ctx.strokeStyle = hexA('#f7d6d2', 0.75); ctx.lineWidth = 3; // wet waterline
  ctx.beginPath(); ctx.moveTo(ex - side * hw * 0.6, ey + hgt * 0.72); ctx.quadraticCurveTo(ex, ey + hgt * 0.9, ex + side * hw * 0.7, ey + hgt * 0.45); ctx.stroke();
}
function drawBrow(ctx, bx, by, side, s, rnd, setId) {
  const hw = 108; const [arch, lift, thickK] = LOOK[setId].brow;
  const pt = (t) => {
    const x = bx - side * hw * 0.95 + side * hw * 2.05 * t;
    const y = by + 14 - lift * t - Math.sin(Math.PI * Math.pow(t, 0.85)) * arch + (t > 0.7 ? (t - 0.7) * 46 : 0);
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
function drawLips(ctx, lx, ly, s, setId) {
  const [hw, full, bow, gloss] = LOOK[setId].lip;
  const smile = ({ nurse01: 12, ceo01: -3, student01: 14, janitor01: 9, idol01: 18 })[setId] ?? 8;
  const base = s.lip;
  // upper lip
  ctx.beginPath(); ctx.moveTo(lx - hw, ly + smile * -1);
  ctx.bezierCurveTo(lx - hw * 0.55, ly - 26 * full, lx - hw * 0.2, ly - 34 * full * (0.9 + 0.1 * bow), lx, ly - 20 * full / bow);
  ctx.bezierCurveTo(lx + hw * 0.2, ly - 34 * full * (0.9 + 0.1 * bow), lx + hw * 0.55, ly - 26 * full, lx + hw, ly + smile * -1);
  ctx.bezierCurveTo(lx + hw * 0.55, ly + 4, lx + hw * 0.2, ly + 3, lx, ly + 6);
  ctx.bezierCurveTo(lx - hw * 0.2, ly + 3, lx - hw * 0.55, ly + 4, lx - hw, ly + smile * -1); ctx.closePath();
  const ug = ctx.createLinearGradient(0, ly - 34, 0, ly + 6); ug.addColorStop(0, shadeHex(base, 14)); ug.addColorStop(1, shadeHex(base, -36));
  ctx.fillStyle = ug; ctx.fill();
  // lower lip
  ctx.beginPath(); ctx.moveTo(lx - hw * 0.98, ly + smile * -1 + 1);
  ctx.bezierCurveTo(lx - hw * 0.5, ly + 4, lx + hw * 0.5, ly + 4, lx + hw * 0.98, ly + smile * -1 + 1);
  ctx.bezierCurveTo(lx + hw * 0.62, ly + 50 * full, lx - hw * 0.62, ly + 50 * full, lx - hw * 0.98, ly + smile * -1 + 1); ctx.closePath();
  const lg = ctx.createLinearGradient(0, ly + 2, 0, ly + 46); lg.addColorStop(0, shadeHex(base, -18)); lg.addColorStop(0.5, shadeHex(base, 16)); lg.addColorStop(1, shadeHex(base, -8));
  ctx.fillStyle = lg; ctx.fill();
  radial(ctx, lx - 10, ly + 24 * full, 44, 9, hexA('#ffffff', gloss)); // gloss on lower lip
  radial(ctx, lx + 22, ly + 30 * full, 12, 4, hexA('#ffffff', gloss * 0.7));
  radial(ctx, lx - 40, ly - 14, 20, 5, hexA('#ffffff', 0.15 + gloss * 0.3));
  radial(ctx, lx, ly - 28 * full, 16, 6, hexA('#ffffff', 0.22)); // cupid's bow highlight
  ctx.strokeStyle = hexA('#4a1424', 0.85); ctx.lineWidth = 4.4; ctx.lineCap = 'round'; // mouth line
  ctx.beginPath(); ctx.moveTo(lx - hw * 1.0, ly + smile * -1 + 1); ctx.bezierCurveTo(lx - hw * 0.4, ly + 6, lx + hw * 0.4, ly + 6, lx + hw * 1.0, ly + smile * -1 + 1); ctx.stroke();
  radial(ctx, lx, ly + 62, 50, 16, hexA('#7a4a40', 0.2)); // chin dimple shadow
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
  constructor(kit, scene, setId, ghost) {
    this.kit = kit; this.scene = scene; this.setId = setId; this.ghost = ghost; this.groups = new Map();
    this.style = STYLE[setId];
  }
  addMesh(mesh, kind) {
    const key = this.ghost ? 'holo' : kind;
    if (!this.groups.has(key)) this.groups.set(key, []);
    this.groups.get(key).push(mesh); return mesh;
  }
  // Generic placed primitive (small hardware details only).
  prim(mesh, kind, pos = [0, 0, 0], rot = [0, 0, 0]) { mesh.position.set(...pos); mesh.rotation.set(...rot); return this.addMesh(mesh, kind); }
  box(kind, pos, size, rot) { return this.prim(B().MeshBuilder.CreateBox('b', { width: size[0], height: size[1], depth: size[2] }, this.scene), kind, pos, rot); }
  cyl(kind, pos, h, dTop, dBot, rot, tess = 24) { return this.prim(B().MeshBuilder.CreateCylinder('c', { height: h, diameterTop: dTop, diameterBottom: dBot, tessellation: tess }, this.scene), kind, pos, rot); }
  ell(kind, pos, dia, rot, seg = 14) { return this.prim(B().MeshBuilder.CreateSphere('e', { diameterX: dia[0], diameterY: dia[1], diameterZ: dia[2], segments: seg }, this.scene), kind, pos, rot); }
  // Tapered tube through control points.
  strand(kind, points, r0, r1, tess = 10, samples = 24) {
    const BAB = B();
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
    const BAB = B();
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
    const BAB = B(); const V = BAB.Vector3;
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
    const BAB = B();
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
      merged.material = key === 'holo' ? this.kit.holoMaterial(this.setId) : this.kit.materialFor(this.setId, key);
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
function faceDeform(x, y, z, s, zf, xf) {
  const h = y - CHIN; // height above chin
  const front = Math.max(0, zf);
  let dz = 0; let dx = 0;
  dz += 0.01 * gauss(h, F.brow, 0.03) * front * (1 - Math.abs(xf) * 0.6); // soft brow ridge
  dz -= 0.011 * gauss(h, F.eye, 0.026) * front * gauss(Math.abs(x), F.eyeX, 0.042); // eye sockets (lids wrap the eyeballs)
  dz += 0.009 * gauss(h, 0.18, 0.05) * front * gauss(Math.abs(x), 0.1, 0.05); // full apple cheeks
  dx += Math.sign(x) * 0.004 * gauss(h, 0.22, 0.05) * Math.max(0, 1 - front);
  dz += 0.01 * gauss(h, 0.03, 0.028) * front * gauss(x, 0, 0.05); // small rounded chin
  // small, refined nose: low bridge, slightly upturned soft tip, narrow wings
  dz += 0.011 * gauss(h, 0.245, 0.055) * gauss(x, 0, 0.016) * front;
  dz += 0.012 * gauss(h, F.noseTip + 0.004, 0.024) * gauss(x, 0, 0.024) * front;
  dz += 0.006 * gauss(h, F.noseTip - 0.004, 0.016) * gauss(Math.abs(x), 0.026, 0.011) * front;
  dz += 0.004 * gauss(h, 0.15, 0.03) * gauss(x, 0, 0.04) * front; // fill under the nose so it doesn't shadow
  // soft, full lips
  dz += 0.0035 * gauss(h, F.mouth + 0.014, 0.012) * gauss(x, 0, 0.04) * front;
  dz += 0.009 * gauss(h, F.mouth - 0.013, 0.014) * gauss(x, 0, 0.036) * front;
  dz -= 0.0025 * gauss(h, F.mouth, 0.004) * gauss(x, 0, 0.05) * front;
  return [x + dx, y, z + dz];
}
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
export function buildStatuePart(kit, scene, partId, setId, ghost = false) {
  const sc = new Sculptor(kit, scene, setId, ghost);
  ({ head: sculptHead, torso: sculptTorso, armL: (s, id) => sculptArm(s, id, -1), armR: (s, id) => sculptArm(s, id, 1), legs: sculptLegs })[partId](sc, setId);
  return sc.build(`${setId}-${partId}${ghost ? '-holo' : ''}`, PART_OFFSET[partId]);
}

function sculptHead(sc, id) {
  const st = sc.style;
  // neck stub (slightly inside the torso neck so the join is seamless) + skull/face
  const neck = sectionsFrom([{ y: CHIN - 0.34, cz: -0.03, rx: 0.094, rz: 0.09, n: 2 }, { y: CHIN - 0.1, cz: -0.03, rx: 0.094, rz: 0.09, n: 2 }, { y: CHIN + 0.1, cz: -0.02, rx: 0.094, rz: 0.09, n: 2 }], 8);
  sc.loft('skin', neck, { N: 28 });
  sc.loft('face', headSecs(), { N: 120, deform: faceDeform, flip: false });
  // ears
  for (const side of [-1, 1]) sc.loft('skin', sectionsFrom([{ y: CHIN + 0.2, cx: side * 0.182, cz: -0.012, rx: 0.006, rz: 0.012 }, { y: CHIN + 0.26, cx: side * 0.188, cz: -0.012, rx: 0.011, rz: 0.03 }, { y: CHIN + 0.32, cx: side * 0.186, cz: -0.012, rx: 0.008, rz: 0.026 }, { y: CHIN + 0.35, cx: side * 0.182, cz: -0.012, rx: 0.003, rz: 0.008 }], 8), { N: 14 });
  eyes(sc, id);
  hairFor(sc, id, st);
}
function eyes(sc, id) {
  const { hw, hgt } = EYE_SHAPE[id];
  for (const side of [-1, 1]) {
    const ex = side * F.eyeX; const ey = CHIN + F.eye;
    const skin = headSurfaceZ(ey, ex) + faceDeform(ex, ey, 0, null, 1, ex / 0.19)[2];
    const R = 0.062; const cz = skin - 0.004 - R * 0.85;
    sc.ell('sclera', [ex, ey + 0.002, cz], [R * 2.15, R * 1.7, R * 1.7], [0, side * 0.12, 0], 32);
    const front = cz + R * 0.85;
    const ir = 0.031;
    const disc = B().MeshBuilder.CreateDisc('iris', { radius: ir, tessellation: 40, sideOrientation: B().Mesh.DOUBLESIDE }, sc.scene);
    sc.prim(disc, 'iris', [ex + side * 0.002, ey + 0.004, front + 0.0006], [0, 0, 0]);
    sc.ell('cornea', [ex + side * 0.002, ey + 0.004, front], [ir * 2.3, ir * 2.3, ir * 0.45], [0, 0, 0], 24);
    // 3D upper lash line following the painted lid, flicking out at the corner
    const [cxp, cyp] = eyeCentrePx(side); const c = eyeCurves(cxp, cyp, side, hw, hgt);
    const pts = [];
    for (let i = 0; i <= 14; i += 1) {
      const t = 0.06 + (i / 14) * 0.94; const [px, py] = c.upper(t); const [x, h] = texToHead(px, py);
      const y = CHIN + h; pts.push([x, y, headSurfaceZ(y, x) + faceDeform(x, y, 0, null, 1, x / 0.19)[2] + 0.004 + 0.006 * t]);
    }
    const L = LOOK[id]; const [lx, ly, lz] = pts[pts.length - 1]; const flick = 0.006 + 0.0004 * L.liner * L.lashLen; pts.push([lx + side * flick, ly + flick * 0.8, lz - 0.004]);
    sc.path('lash', pts, (t) => { const w = (0.0016 + 0.0042 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1))) * (0.8 + 0.25 * L.lashLen); return [w * 0.7, w]; }, { up: [0, 0, 1], N: 8, samples: 4 });
  }
}

function hairShell(sc, offset, trimFn) {
  sc.loft('hair', headSecs(), { N: 120, offset, deform: trimmed((x, y, z, s, zf, xf) => faceDeform(x, y, z, s, zf, xf), trimFn, true) });
}
// ---------- Layered hair: a soft scalp cover + dozens of tapered locks with pointed tips ----------
const HAIR = {
  office01: { len: 0.9, wave: 0.0, part: 0.05, sweep: 1, fringeLen: 0.075, back: 30 },
  nurse01: { len: 0.66, wave: 0.022, part: 0, sweep: 0, fringeLen: 0.06, back: 28 },
  ceo01: { len: 1.02, wave: 0.008, part: -0.07, sweep: -1, fringeLen: 0.12, back: 30 },
  student01: { len: 0.42, wave: 0.006, part: 0, sweep: 0, fringeLen: 0.06, back: 26 },
  idol01: { len: 0.5, wave: 0.014, part: 0, sweep: 0, fringeLen: 0.06, back: 26 },
  janitor01: { len: 0.2, wave: 0.0, part: 0.04, sweep: 1, fringeLen: 0.05, back: 24 },
};
// point on the scalp at height h above the chin, around angle a (0 = front, +π/2 = figure's left/+x), lifted by off
function scalp(a, h, off) {
  const y = CHIN + h; const secs = headSecs(); let s = secs[0];
  for (const c of secs) if (Math.abs(c.y - y) < Math.abs(s.y - y)) s = c;
  return [s.cx + (s.rx + off) * spow(Math.sin(a), 2 / s.n), y, s.cz + (s.rz + off) * spow(Math.cos(a), 2 / s.n)];
}
// one flat, tapered hair lock that ends in a fine point
function hairLock(sc, kind, pts, width, thick, out) {
  sc.path(kind, pts, (t) => {
    // full width through most of the lock, then a long, clean taper into a sharp point
    const taper = t < 0.5 ? 1 : Math.pow(Math.max(0, (1 - t) / 0.5), 1.15);
    const root = 0.7 + 0.3 * smooth(0, 0.18, t);
    return [Math.max(0.001, thick * (0.35 + 0.65 * taper)), Math.max(0.0012, width * taper * root)];
  }, { up: out, N: 10, samples: 7 });
}
function hairFor(sc, id, st) {
  void st;
  const H = HAIR[id]; const rnd = mulberry(id.length * 101 + 9);
  const Hy = (h) => CHIN + h;
  // fringe tip height per x (head space above chin)
  const fringe = {
    office01: (x) => 0.35 + 0.07 * smooth(-0.19, 0.19, x),
    nurse01: (x) => 0.348 + 0.03 * Math.pow(Math.abs(x) / 0.17, 2),
    ceo01: (x) => 0.33 + 0.13 * smooth(-0.2, 0.15, x),
    student01: (x) => 0.352 + 0.012 * Math.pow(Math.abs(x) / 0.17, 2),
    idol01: (x) => 0.35 + 0.025 * Math.pow(Math.abs(x) / 0.17, 2) + 0.01 * Math.abs(Math.sin(x * 30)),
    janitor01: (x) => 0.405 + 0.06 * smooth(-0.2, 0.2, x), // swept up off the forehead for work
  }[id];
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
    const a = sideS * (Math.PI * (0.36 + k * 0.07)); const len = (({ nurse01: 0.42, student01: 0.32, janitor01: 0.12, idol01: 0.4 })[id] ?? 0.5) - k * 0.06 + (sideS > 0 ? 0.02 : 0);
    const r0 = scalp(a, 0.54, 0.024); const r1 = scalp(a, 0.4, 0.026);
    const x0 = sideS * (0.207 + k * 0.009);
    const pts = [r0, r1, [x0, Hy(0.24), 0.09 - k * 0.04], [x0 + sideS * 0.01, Hy(0.04), 0.11 - k * 0.04],
      [x0 + sideS * (0.03 + H.wave), Hy(-len * 0.55), 0.17 - k * 0.04], [x0 + sideS * 0.04, Hy(-len), 0.21 - k * 0.04]];
    hairLock(sc, 'hair', pts, 0.05 - k * 0.004, 0.012, [sideS, 0, 0.3]);
  }
  // 4) fringe: fine pointed locks from the crown over the forehead, swept for side-parted styles
  const N = id === 'nurse01' ? 17 : 15;
  for (let i = 0; i < N; i += 1) {
    const u = i / (N - 1); const x = lerp(-0.17, 0.17, u);
    const a = Math.asin(Math.max(-1, Math.min(1, x / 0.2))) * 1.0 + H.part;
    const tipX = x + H.sweep * 0.045 * (1 - Math.abs(x) / 0.2) + (rnd() - 0.5) * 0.01;
    const tipH = fringe(tipX) - (i % 2 ? 0.012 : 0) - rnd() * 0.01;
    const tipY = Hy(tipH); const tipZ = headSurfaceZ(tipY, tipX) + 0.013;
    const root = scalp(a * 0.92, 0.548, 0.026); const mid = scalp(a * 0.95, 0.49, 0.034);
    const pre = [lerp(mid[0], tipX, 0.55), lerp(mid[1], tipY, 0.5) + 0.02, headSurfaceZ(lerp(mid[1], tipY, 0.5), lerp(mid[0], tipX, 0.55)) + 0.03];
    hairLock(sc, i % 5 === 2 ? 'hairTip' : 'hair', [root, mid, pre, [tipX, tipY, tipZ]], 0.04 + 0.008 * rnd(), 0.009, [x, 0.4, 1]);
  }
  // 5) a few loose wisps on top for a soft, non-helmet silhouette
  for (let i = 0; i < 5; i += 1) {
    const a = Math.PI * (0.62 + i * 0.19) + (rnd() - 0.5) * 0.12; // over the back of the crown only
    hairLock(sc, 'hair', [scalp(a, 0.585, 0.024), scalp(a, 0.5, 0.034), scalp(a, 0.4, 0.036), scalp(a, 0.3, 0.032)], 0.06, 0.01, [Math.sin(a), 0.6, Math.cos(a)]);
  }

  if (id === 'office01') {
    glasses(sc);
  } else if (id === 'nurse01') {
    sc.box('cloth', [0, Hy(0.585), 0.03], [0.34, 0.1, 0.17], [-0.2, 0, 0]);
    sc.box('cloth', [0, Hy(0.555), 0.05], [0.37, 0.025, 0.2], [-0.2, 0, 0]);
    sc.box('accent', [0, Hy(0.6), 0.115], [0.026, 0.07, 0.006], [-0.2, 0, 0]); sc.box('accent', [0, Hy(0.6), 0.115], [0.07, 0.026, 0.006], [-0.2, 0, 0]);
    sc.box('accent', [0.15, Hy(0.45), 0.12], [0.07, 0.014, 0.014], [0, -0.4, 0.5]);
  } else if (id === 'student01') {
    // twin tails tied with red ribbons
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
    sc.ell('accent', [0.15, Hy(0.47), 0.15], [0.03, 0.018, 0.012], [0, 0, 0.5], 8); // little hair clip
  } else if (id === 'idol01') {
    // high side ponytail with a big red bow, a gold star clip on the other side
    const knot = [0.19, Hy(0.5), -0.12];
    for (let k = 0; k < 8; k += 1) {
      const sp = (k - 3.5) * 0.011; const ln = 0.72 + 0.08 * Math.sin(k * 1.9);
      hairLock(sc, k % 3 === 1 ? 'hairTip' : 'hair', [knot, [0.3 + sp, Hy(0.5), -0.15 + sp], [0.38 + sp, Hy(0.25), -0.12 + sp * 0.6],
        [0.4 + sp * 1.4, Hy(-ln * 0.4), -0.08 + sp], [0.36 + sp, Hy(-ln), -0.05 + sp]], 0.055, 0.016, [1, 0, 0.2]);
    }
    sc.ell('suit', [0.2, Hy(0.51), -0.11], [0.06, 0.06, 0.06], [0, 0, 0], 12);
    for (const tilt of [-1, 1]) sc.ell('suit', [0.2, Hy(0.51) + tilt * 0.06, -0.11], [0.05, 0.12, 0.04], [0, -0.6, tilt * 0.9], 14);
    for (const tilt of [-1, 1]) hairLock(sc, 'suit', [[0.2, Hy(0.49), -0.1], [0.22 + tilt * 0.03, Hy(0.4), -0.08], [0.23 + tilt * 0.05, Hy(0.3), -0.07]], 0.03, 0.008, [1, 0, 0.3]);
    const st = [-0.17, Hy(0.44), 0.13];
    for (let k = 0; k < 5; k += 1) { const a = (k / 5) * Math.PI * 2; sc.ell('gold', [st[0] + Math.sin(a) * 0.02, st[1] + Math.cos(a) * 0.02, st[2]], [0.014, 0.034, 0.01], [0, 0, -a], 8); }
    sc.ell('gold', st, [0.026, 0.026, 0.012], [0, 0, 0], 10);
    for (const side of [-1, 1]) { sc.ell('gold', [side * 0.19, Hy(0.15), 0.0], [0.02, 0.02, 0.02], [0, 0, 0], 8); sc.ell('suit', [side * 0.19, Hy(0.11), 0.0], [0.022, 0.03, 0.014], [0, 0, 0], 8); }
  } else if (id === 'janitor01') {
    // practical low bun under a work bandana
    sc.ell('hair', [0, Hy(0.2), -0.29], [0.2, 0.18, 0.16], [0.2, 0, 0], 20);
    for (let k = 0; k < 7; k += 1) { const a = (k / 7) * Math.PI * 2; hairLock(sc, 'hair', [[0, Hy(0.2), -0.29], [Math.cos(a) * 0.06, Hy(0.2) + Math.sin(a) * 0.05, -0.36], [Math.cos(a) * 0.09, Hy(0.2) + Math.sin(a) * 0.08, -0.31]], 0.03, 0.012, [Math.cos(a), Math.sin(a), -0.4]); }
    const band = []; for (let k = 0; k <= 48; k += 1) { const a = (k / 48) * Math.PI * 2; band.push(scalp(a, 0.46 - 0.05 * Math.max(0, -Math.cos(a)), 0.05)); }
    sc.strand('suit', band, 0.028, 0.028, 10, 1);
    sc.ell('suit', [0, Hy(0.42), -0.27], [0.08, 0.06, 0.05], [0, 0, 0], 12);
    for (const side of [-1, 1]) hairLock(sc, 'suit', [[0, Hy(0.42), -0.28], [side * 0.05, Hy(0.36), -0.31], [side * 0.08, Hy(0.28), -0.3]], 0.03, 0.008, [0, 0, -1]);
    for (const side of [-1, 1]) sc.ell('gold', [side * 0.19, Hy(0.18), 0.0], [0.016, 0.016, 0.016], [0, 0, 0], 8); // stud earrings
  } else {
    for (const side of [-1, 1]) earring(sc, side, Hy(0.16));
  }
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
    // white sailor blouse with a navy sailor collar, red scarf bow and a navy pleated knee-length skirt
    const vNeck = (x, z, zf) => (zf > 0.1 ? 3.44 - Math.max(0, 0.26 - Math.abs(x) * 1.9) * smooth(0.1, 0.6, zf) : null);
    cap('cloth', 3.47, 2.42, 0.016, bustG, vNeck);
    sc.loft('cloth', sliceY(body, 3.28, 3.12), { N: 60, offset: 0.013, deform: bustG }); // modest inner panel fills the V
    sailorCollar(sc);
    // scarf bow at the V
    sc.ell('accent', [0, 3.14, 0.225], [0.05, 0.045, 0.035], [0, 0, 0], 12);
    for (const side of [-1, 1]) sc.ell('accent', [side * 0.06, 3.15, 0.215], [0.1, 0.06, 0.03], [0, side * 0.3, side * 0.35], 12);
    for (const side of [-1, 1]) hairLock(sc, 'accent', [[side * 0.01, 3.13, 0.235], [side * 0.03, 3.0, 0.25], [side * 0.045, 2.88, 0.245]], 0.03, 0.008, [0, 0, 1]);
    pleatedSkirt(sc, 'suit', [{ y: 2.62, rx: 0.242, rz: 0.172 }, { y: 2.44, rx: 0.31, rz: 0.215 }, { y: 2.23, rx: 0.4, rz: 0.275 }, { y: 1.95, rx: 0.45, rz: 0.33 }, { y: 1.42, rx: 0.5, rz: 0.4 }]);
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
  } else if (id === 'student01') { // long white sleeve with navy cuff and a white stripe
    sc.path('cloth', ctrl, R, { ...opts, t1: 0.88, offset: 0.014, close: false });
    sc.path('suit', ctrl, R, { ...opts, t0: 0.86, t1: 0.94, offset: 0.018, close: false });
    sc.path('cloth', ctrl, R, { ...opts, t0: 0.905, t1: 0.915, offset: 0.021, close: false, N: 16 });
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
  } else { // tailored blazer sleeve, crisp white cuff
    sc.path('suit', ctrl, R, { ...opts, t1: 0.88, offset: 0.019, close: false });
    sc.path('cloth', ctrl, R, { ...opts, t0: 0.86, t1: 0.93, offset: 0.012, close: false });
  }
  hand(sc, W, v3.unit(v3.sub(W, E)), arm, side, id === 'janitor01' ? 'accent' : id === 'idol01' ? 'cloth' : 'skin');
  if (arm.prop === 'clipboard') clipboard(sc, W, arm);
  if (arm.prop === 'bag') schoolBag(sc, W, arm);
  if (arm.prop === 'mop') mop(sc, W, arm, side);
  if (arm.prop === 'mic') microphone(sc, W, arm);
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
    // shoe: pitched foot loft along Z, with heel and instep
    const sole = (z) => Math.max(0, heel * (0.27 - z) / 0.34);
    const foot = [[-0.07, 0.05, 0.042], [-0.035, 0.056, 0.045], [0.02, 0.05, 0.046], [0.1, 0.04, 0.05], [0.18, 0.03, 0.045], [0.235, 0.022, 0.032], [0.265, 0.012, 0.015]]
      .map(([z, ry, rx]) => ({ z, cx: side * 0.106, cy: sole(z) + ry, rx, ry }));
    sc.loftZ('shoe', foot, 24, flip);
    if (heel > 0.05) sc.cyl('shoe', [side * 0.106, heel * 0.5, -0.05], heel, 0.044, id === 'ceo01' ? 0.02 : 0.034, [0, 0, 0], 14);
    if (id === 'nurse01') sc.strand('accent', Array.from({ length: 17 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return [side * 0.106 + Math.cos(a) * 0.05, ay - 0.02, Math.sin(a) * 0.053]; }), 0.005, 0.005, 6, 1);
    if (id === 'ceo01') sc.box('gold', [side * 0.106, heel + 0.06, 0.012], [0.06, 0.008, 0.01]);
    if (id === 'student01') sc.box('suitDark', [side * 0.106, 0.085, 0.12], [0.07, 0.012, 0.03]); // loafer strap
    if (id === 'janitor01') { // sneaker sole + laces
      sc.loftZ('suitDark', [[-0.075, 0.046], [0.0, 0.05], [0.12, 0.052], [0.25, 0.036], [0.275, 0.018]].map(([z, rx]) => ({ z, cx: side * 0.106, cy: 0.012, rx, ry: 0.013 })), 20, flip);
      for (let k = 0; k < 3; k += 1) sc.box('accent', [side * 0.106, 0.085 - k * 0.008, 0.07 + k * 0.035], [0.05, 0.006, 0.008], [0.35, 0, 0]);
    }
  }
}
