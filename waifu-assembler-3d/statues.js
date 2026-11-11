// Babylon.js statue kit v2 — every body part is a continuous lofted surface (cross-sections blended with splines),
// not stacked spheres. Parts share exact joint profiles (neck, shoulders, hips) so the figure reads as one body.
// Figure space: +Y up, feet at y=0, +Z is the front. Each part is built in figure space, then recentred on PART_OFFSET.
import { getSet } from './logic.mjs';

const B = () => window.BABYLON;
const hex = (value) => B().Color3.FromHexString(value);

// Where every part pivots (spin / carry / hologram anchor). Meshes are built in figure space and shifted by this.
export const PART_OFFSET = { legs: [0, 1.1, 0], torso: [0, 2.75, 0], head: [0, 3.8, 0], armL: [-0.4, 2.75, 0], armR: [0.4, 2.75, 0] };

export const STYLE = {
  office01: {
    hair: '#24182f', hairTip: '#5b4580', eye: '#6a4630', eyeDeep: '#2a170f', cloth: '#f4f3f6', suit: '#2b3b78', suitDark: '#1b2552',
    accent: '#76d8ff', skin: '#f3d0bb', shoe: '#1b1a2a', stock: '#2b2735', gold: '#e8d7a0', lip: '#c4566b', blush: '#f09aa4', heel: 0.07, stockTo: 2.0,
  },
  nurse01: {
    hair: '#dc8fae', hairTip: '#f7d3e1', eye: '#9a4b63', eyeDeep: '#3a1420', cloth: '#fbf6f8', suit: '#fbf6f8', suitDark: '#ffb7d3',
    accent: '#ff7fb7', skin: '#f6d6c8', shoe: '#fff0f5', stock: '#fbf4f7', gold: '#ffd0e4', lip: '#d9627f', blush: '#f4909f', heel: 0.04, stockTo: 1.5,
  },
  ceo01: {
    hair: '#1c141c', hairTip: '#4c3048', eye: '#8a5a22', eyeDeep: '#2b1606', cloth: '#f8f2ec', suit: '#2a3358', suitDark: '#171c36',
    accent: '#f0c66f', skin: '#efc9b0', shoe: '#120f18', stock: '#16131c', gold: '#f2c35f', lip: '#a8283f', blush: '#e88a8c', heel: 0.15, stockTo: 2.0,
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
        m.albedoColor = hex(s.skin); m.roughness = 0.5; m.metallic = 0;
        m.emissiveColor = hex(s.skin).scale(0.12);
        m.sheen.isEnabled = true; m.sheen.intensity = 0.3; m.sheen.color = hex('#ffcdbf');
      });
      case 'face': return pbr(key, (m) => {
        m.albedoTexture = faceTexture(setId); m.roughness = 0.48;
        m.emissiveTexture = faceTexture(setId); m.emissiveColor = hex('#ffffff').scale(0.12);
        m.sheen.isEnabled = true; m.sheen.intensity = 0.3; m.sheen.color = hex('#ffcdbf');
      });
      case 'lip': return pbr(key, (m) => {
        m.albedoColor = hex(s.lip); m.roughness = 0.28; m.emissiveColor = hex(s.lip).scale(0.1);
        m.clearCoat.isEnabled = true; m.clearCoat.intensity = 0.6; m.clearCoat.roughness = 0.1;
      });
      case 'hair': return pbr(key, (m) => {
        m.albedoColor = hex(s.hair); m.roughness = 0.34; m.metallic = 0.05; m.backFaceCulling = false;
        m.clearCoat.isEnabled = true; m.clearCoat.intensity = 0.8; m.clearCoat.roughness = 0.1;
        m.sheen.isEnabled = true; m.sheen.intensity = 0.7; m.sheen.color = hex(s.hairTip);
        m.emissiveColor = hex(s.hair).scale(0.12);
      });
      case 'hairTip': return pbr(key, (m) => {
        m.albedoColor = hex(s.hairTip); m.roughness = 0.3; m.metallic = 0.05; m.backFaceCulling = false;
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
    const tex = new BAB.DynamicTexture(`face-${setId}`, { width: 2048, height: 1024 }, scene, true);
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
  const Y = (y) => (FACE_FLIP_V ? H * (1 - y / HEAD_H) : H * (y / HEAD_H));
  const rnd = mulberry(setId.length * 977 + 13);

  // --- skin base with soft contour shading ---
  ctx.fillStyle = s.skin; ctx.fillRect(0, 0, W, H);
  const jaw = ctx.createLinearGradient(0, Y(0.0), 0, Y(0.16));
  jaw.addColorStop(0, hexA('#7d4b3c', 0.32)); jaw.addColorStop(1, hexA('#7d4b3c', 0));
  ctx.fillStyle = jaw; ctx.fillRect(0, Y(0.16), W, Y(0) - Y(0.16));
  for (const side of [-1, 1]) { // temple + cheek hollow shading toward the ears
    const g = ctx.createRadialGradient(X(side * 0.2), Y(0.2), 10, X(side * 0.2), Y(0.2), 300);
    g.addColorStop(0, hexA('#8a5546', 0.28)); g.addColorStop(1, hexA('#8a5546', 0));
    ctx.fillStyle = g; ctx.fillRect(X(side * 0.2) - 320, Y(0.2) - 320, 640, 640);
  }
  radial(ctx, X(0), Y(0.47), 320, 150, hexA('#ffffff', 0.16)); // forehead highlight
  radial(ctx, X(0), Y(0.205), 70, 90, hexA('#ffffff', 0.2)); // nose tip highlight
  for (const side of [-1, 1]) radial(ctx, X(side * 0.1), Y(0.235), 150, 90, hexA('#ffffff', 0.1)); // cheekbone light
  for (const side of [-1, 1]) radial(ctx, X(side * 0.105), Y(0.185), 190, 110, hexA(s.blush, 0.4)); // blush

  // --- eyes ---
  for (const side of [-1, 1]) drawEye(ctx, X(side * 0.082), Y(0.287), side, s, rnd);
  // --- brows ---
  for (const side of [-1, 1]) drawBrow(ctx, X(side * 0.082), Y(0.345), side, s, rnd, setId);
  // --- nose shading (the 3D nose carries the form; paint soft shadows) ---
  for (const side of [-1, 1]) {
    radial(ctx, X(side * 0.03), Y(0.222), 20, 30, hexA('#8c4f45', 0.28));
    radial(ctx, X(side * 0.048), Y(0.255), 20, 70, hexA('#8c4f45', 0.16));
    radial(ctx, X(side * 0.018), Y(0.203), 12, 10, hexA('#4a1f1c', 0.65));
  }
  radial(ctx, X(0), Y(0.187), 46, 14, hexA('#8c4f45', 0.12));
  // --- lips ---
  drawLips(ctx, X(0), Y(0.083), s, setId);
  // --- fine skin grain ---
  for (let i = 0; i < 9000; i += 1) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(120,70,60,.045)' : 'rgba(255,255,255,.05)';
    ctx.fillRect(rnd() * W, rnd() * H, 1.4 + rnd() * 1.6, 1.4 + rnd() * 1.6);
  }
}
function drawEye(ctx, ex, ey, side, s, rnd) {
  const hw = 84; const hgt = 40;
  const inner = [ex - side * hw, ey + 6]; const outer = [ex + side * hw, ey - 6];
  const almond = () => {
    ctx.beginPath(); ctx.moveTo(inner[0], inner[1]);
    ctx.bezierCurveTo(ex - side * hw * 0.35, ey - hgt * 1.5, ex + side * hw * 0.4, ey - hgt * 1.55, outer[0], outer[1]);
    ctx.bezierCurveTo(ex + side * hw * 0.35, ey + hgt * 0.95, ex - side * hw * 0.35, ey + hgt * 1.0, inner[0], inner[1]);
    ctx.closePath();
  };
  // socket + double-eyelid crease + soft eyeshadow
  radial(ctx, ex, ey - 8, hw * 1.45, hgt * 2.3, hexA('#7a4a46', 0.22));
  radial(ctx, ex + side * 6, ey - hgt * 1.5, hw * 1.2, hgt * 0.9, hexA(s.blush, 0.24));
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
  const ir = 38; const ix = ex + side * 1; const iy = ey - 2;
  const ig = ctx.createRadialGradient(ix, iy, 4, ix, iy, ir);
  ig.addColorStop(0, shadeHex(s.eye, 65)); ig.addColorStop(0.55, s.eye); ig.addColorStop(0.9, shadeHex(s.eye, -35)); ig.addColorStop(1, s.eyeDeep);
  ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 70; i += 1) { // iris fibres
    const a = rnd() * Math.PI * 2; const r0 = 9 + rnd() * 5; const r1 = ir * (0.7 + rnd() * 0.28);
    ctx.strokeStyle = rnd() > 0.5 ? hexA(shadeHex(s.eye, 70), 0.35) : hexA(s.eyeDeep, 0.4);
    ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0); ctx.lineTo(ix + Math.cos(a) * r1, iy + Math.sin(a) * r1); ctx.stroke();
  }
  ctx.strokeStyle = hexA(s.eyeDeep, 0.85); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ix, iy, ir - 1, 0, Math.PI * 2); ctx.stroke(); // limbal ring
  ctx.fillStyle = '#0d0810'; ctx.beginPath(); ctx.arc(ix, iy, 16, 0, Math.PI * 2); ctx.fill(); // pupil
  // lid shadow across the top of the eye + lower glow
  const ls = ctx.createLinearGradient(0, ey - hgt * 1.5, 0, ey - hgt * 0.1);
  ls.addColorStop(0, 'rgba(40,18,22,.62)'); ls.addColorStop(1, 'rgba(40,18,22,0)');
  ctx.fillStyle = ls; ctx.fillRect(ex - hw * 1.2, ey - hgt * 1.6, hw * 2.4, hgt * 1.5);
  radial(ctx, ix, iy + 16, 22, 12, hexA('#ffffff', 0.22));
  // catchlights (window + small)
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  roundedRect(ctx, ix - side * 3 - 22, iy - 27, 27, 20, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(ix + side * 18, iy + 15, 5.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // lash line (thick, tapered, winged) + individual lashes
  ctx.strokeStyle = '#1a0f14'; ctx.lineCap = 'round';
  for (let k = 0; k < 3; k += 1) {
    ctx.lineWidth = 9 - k * 2.6;
    ctx.beginPath(); ctx.moveTo(inner[0] + side * 4, inner[1] - 3 - k);
    ctx.bezierCurveTo(ex - side * hw * 0.35, ey - hgt * (1.5 + k * 0.02), ex + side * hw * 0.4, ey - hgt * (1.55 + k * 0.02), outer[0] + side * (6 + k * 2), outer[1] - 6 - k * 2); ctx.stroke();
  }
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 16; i += 1) {
    const t = 0.15 + i / 16 * 0.85;
    const px = lerp(inner[0], outer[0], t); const py = ey - hgt * 1.5 * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.04)) + lerp(inner[1] - ey, outer[1] - ey, t) * 0.9;
    const len = 14 + 14 * Math.sin(Math.PI * t) + rnd() * 4;
    const ang = -Math.PI / 2 + side * (0.15 + t * 0.85) + (rnd() - 0.5) * 0.12;
    ctx.beginPath(); ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + Math.cos(ang) * len * 0.55 + side * 3, py + Math.sin(ang) * len * 0.55, px + Math.cos(ang + side * 0.45) * len, py + Math.sin(ang + side * 0.45) * len); ctx.stroke();
  }
  ctx.lineWidth = 1.8; ctx.strokeStyle = hexA('#1a0f14', 0.75);
  for (let i = 0; i < 14; i += 1) { // lower lashes
    const t = 0.3 + i / 14 * 0.6; const px = lerp(inner[0], outer[0], t); const py = ey + hgt * 0.9 * Math.sin(Math.PI * t) + 2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + side * 3, py + 11 + rnd() * 5); ctx.stroke();
  }
  ctx.strokeStyle = hexA('#f7d6d2', 0.75); ctx.lineWidth = 3; // wet waterline
  ctx.beginPath(); ctx.moveTo(ex - side * hw * 0.6, ey + hgt * 0.72); ctx.quadraticCurveTo(ex, ey + hgt * 0.9, ex + side * hw * 0.7, ey + hgt * 0.45); ctx.stroke();
}
function drawBrow(ctx, bx, by, side, s, rnd, setId) {
  const hw = 108; const arch = setId === 'ceo01' ? 26 : 20; const lift = setId === 'ceo01' ? 14 : 6;
  const pt = (t) => {
    const x = bx - side * hw * 0.95 + side * hw * 2.05 * t;
    const y = by + 14 - lift * t - Math.sin(Math.PI * Math.pow(t, 0.85)) * arch + (t > 0.7 ? (t - 0.7) * 46 : 0);
    return [x, y];
  };
  const thick = (t) => 15 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.08)) * (1 - t * 0.35) + 3;
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
  const hw = 112;
  const smile = setId === 'nurse01' ? 6 : setId === 'ceo01' ? -2 : 3;
  const base = s.lip;
  // upper lip
  ctx.beginPath(); ctx.moveTo(lx - hw, ly + smile * -1);
  ctx.bezierCurveTo(lx - hw * 0.55, ly - 26, lx - hw * 0.2, ly - 34, lx, ly - 20);
  ctx.bezierCurveTo(lx + hw * 0.2, ly - 34, lx + hw * 0.55, ly - 26, lx + hw, ly + smile * -1);
  ctx.bezierCurveTo(lx + hw * 0.55, ly + 4, lx + hw * 0.2, ly + 3, lx, ly + 6);
  ctx.bezierCurveTo(lx - hw * 0.2, ly + 3, lx - hw * 0.55, ly + 4, lx - hw, ly + smile * -1); ctx.closePath();
  const ug = ctx.createLinearGradient(0, ly - 34, 0, ly + 6); ug.addColorStop(0, shadeHex(base, 14)); ug.addColorStop(1, shadeHex(base, -36));
  ctx.fillStyle = ug; ctx.fill();
  // lower lip
  ctx.beginPath(); ctx.moveTo(lx - hw * 0.98, ly + smile * -1 + 1);
  ctx.bezierCurveTo(lx - hw * 0.5, ly + 4, lx + hw * 0.5, ly + 4, lx + hw * 0.98, ly + smile * -1 + 1);
  ctx.bezierCurveTo(lx + hw * 0.62, ly + 50, lx - hw * 0.62, ly + 50, lx - hw * 0.98, ly + smile * -1 + 1); ctx.closePath();
  const lg = ctx.createLinearGradient(0, ly + 2, 0, ly + 46); lg.addColorStop(0, shadeHex(base, -18)); lg.addColorStop(0.5, shadeHex(base, 16)); lg.addColorStop(1, shadeHex(base, -8));
  ctx.fillStyle = lg; ctx.fill();
  radial(ctx, lx - 10, ly + 24, 44, 9, hexA('#ffffff', 0.55)); // gloss on lower lip
  radial(ctx, lx - 40, ly - 14, 20, 5, hexA('#ffffff', 0.3));
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
  { y: 0.0, cz: 0.15, rx: 0.03, rz: 0.03, n: 2 },
  { y: 0.03, cz: 0.12, rx: 0.082, rz: 0.075, n: 2.1 },
  { y: 0.08, cz: 0.07, rx: 0.134, rz: 0.14, n: 2.2 },
  { y: 0.16, cz: 0.03, rx: 0.16, rz: 0.19, n: 2.25 },
  { y: 0.29, cz: -0.005, rx: 0.186, rz: 0.222, n: 2.3 },
  { y: 0.42, cz: -0.02, rx: 0.198, rz: 0.24, n: 2.3 },
  { y: 0.52, cz: -0.03, rx: 0.165, rz: 0.232, n: 2.2 },
  { y: 0.575, cz: -0.035, rx: 0.095, rz: 0.17, n: 2.1 },
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
function faceDeform(x, y, z, s, zf, xf) {
  const h = y - CHIN; // height above chin
  const front = Math.max(0, zf);
  let dz = 0; let dx = 0;
  dz += 0.011 * gauss(h, 0.335, 0.03) * front * (1 - Math.abs(xf) * 0.6); // brow ridge
  dz -= 0.008 * gauss(h, 0.285, 0.032) * front * (gauss(Math.abs(x), 0.077, 0.05)); // eye sockets
  dz += 0.006 * gauss(h, 0.2, 0.05) * front * gauss(Math.abs(x), 0.1, 0.05); // cheek fullness
  dx += Math.sign(x) * 0.005 * gauss(h, 0.23, 0.05) * Math.max(0, 1 - front); // cheekbone width
  dz -= 0.006 * gauss(h, 0.07, 0.03) * front * gauss(x, 0, 0.03); // chin dimple
  dz += 0.012 * gauss(h, 0.03, 0.03) * front * gauss(x, 0, 0.06); // chin
  // nose: bridge, tip and alar wings sculpted into the face surface
  dz += 0.034 * gauss(h, 0.255, 0.07) * gauss(x, 0, 0.022 + 0.01 * smooth(0.3, 0.2, h)) * front;
  dz += 0.026 * gauss(h, 0.208, 0.024) * gauss(x, 0, 0.028) * front;
  dz += 0.012 * gauss(h, 0.208, 0.022) * gauss(Math.abs(x), 0.032, 0.013) * front;
  dz -= 0.007 * gauss(h, 0.128, 0.026) * gauss(x, 0, 0.012) * front; // philtrum groove
  // lips: upper and lower volume
  dz += 0.011 * gauss(h, 0.094, 0.016) * gauss(x, 0, 0.052) * front;
  dz += 0.015 * gauss(h, 0.066, 0.019) * gauss(x, 0, 0.046) * front;
  dz -= 0.004 * gauss(h, 0.081, 0.004) * gauss(x, 0, 0.06) * front; // mouth line
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
  return (x, y, z, s, zf) => {
    const front = Math.max(0, zf); const back = Math.max(0, -zf);
    let dz = amp * gauss(y, 3.02, 0.12) * gauss(Math.abs(x), 0.125, 0.09) * front; // bust
    dz -= buttAmp * gauss(y, 2.25, 0.1) * gauss(Math.abs(x), 0.13, 0.12) * back; // hips/rear
    const lift = 0.02 * gauss(y, 3.04, 0.1) * gauss(Math.abs(x), 0.125, 0.08) * front;
    return [x, y + lift, z + dz];
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
  hairFor(sc, id, st);
}

function hairShell(sc, offset, trimFn) {
  sc.loft('hair', headSecs(), { N: 120, offset, deform: trimmed((x, y, z, s, zf, xf) => faceDeform(x, y, z, s, zf, xf), trimFn, true) });
}
function hairFor(sc, id, st) {
  void st;
  // scalp shell trimmed to a natural hairline (high on the forehead, low at the nape)
  const hairline = (x, z, zf, xf) => {
    const f = zf > 0.2 ? lerp(0.3, 0.47, smooth(0.2, 0.95, zf)) - 0.05 * xf * xf : zf > -1 ? 0.3 + 0.2 * Math.min(0, zf) : 0.1;
    return CHIN + f;
  };
  hairShell(sc, 0.013, hairline);
  const Hy = (h) => CHIN + h;
  if (id === 'office01') {
    // long straight hair falling behind the shoulders, side-swept fringe, elegant low ponytail over the shoulder
    sc.loft('hair', sectionsFrom([
      { y: Hy(0.46), cz: -0.07, rx: 0.17, rz: 0.19, n: 2.3 }, { y: Hy(0.3), cz: -0.115, rx: 0.2, rz: 0.15, n: 2.3 }, { y: Hy(0.1), cz: -0.14, rx: 0.2, rz: 0.115, n: 2.3 },
      { y: Hy(-0.12), cz: -0.21, rx: 0.225, rz: 0.1, n: 2.3 }, { y: Hy(-0.36), cz: -0.265, rx: 0.235, rz: 0.1, n: 2.3 }, { y: Hy(-0.62), cz: -0.28, rx: 0.215, rz: 0.085, n: 2.3 }, { y: Hy(-0.84), cz: -0.28, rx: 0.12, rz: 0.05, n: 2.1 }], 36), { N: 40, offset: 0 });
    sweptFringe(sc, 1);
    for (const [x, ex] of [[-0.19, 0.2], [0.19, 0.22]]) lock(sc, 'hair', [[x, Hy(0.34), 0.09], [x * 1.06, Hy(0.1), 0.115], [ex, Hy(-0.2), 0.17], [ex * 1.02, Hy(-0.46), 0.225]], 0.036, 0.012, 0.024);
    glasses(sc);
  } else if (id === 'nurse01') {
    // soft curtain bangs and gentle waves with a nurse cap
    sc.loft('hair', sectionsFrom([
      { y: Hy(0.46), cz: -0.07, rx: 0.17, rz: 0.19, n: 2.3 }, { y: Hy(0.3), cz: -0.115, rx: 0.205, rz: 0.15, n: 2.3 }, { y: Hy(0.1), cz: -0.145, rx: 0.215, rz: 0.12, n: 2.3 },
      { y: Hy(-0.12), cz: -0.215, rx: 0.24, rz: 0.105, n: 2.3 }, { y: Hy(-0.34), cz: -0.265, rx: 0.255, rz: 0.1, n: 2.3 }, { y: Hy(-0.54), cz: -0.275, rx: 0.235, rz: 0.085, n: 2.3 }, { y: Hy(-0.7), cz: -0.275, rx: 0.12, rz: 0.04, n: 2.1 }], 36), { N: 40 });
    curtainFringe(sc);
    for (const side of [-1, 1]) lock(sc, 'hair', [[side * 0.2, Hy(0.34), 0.08], [side * 0.225, Hy(0.08), 0.11], [side * 0.255, Hy(-0.22), 0.16], [side * 0.27, Hy(-0.46), 0.215]], 0.04, 0.012, 0.026);
    // nurse cap
    sc.box('cloth', [0, Hy(0.585), 0.03], [0.34, 0.1, 0.17], [-0.2, 0, 0]);
    sc.box('cloth', [0, Hy(0.555), 0.05], [0.37, 0.025, 0.2], [-0.2, 0, 0]);
    sc.box('accent', [0, Hy(0.6), 0.115], [0.026, 0.07, 0.006], [-0.2, 0, 0]); sc.box('accent', [0, Hy(0.6), 0.115], [0.07, 0.026, 0.006], [-0.2, 0, 0]);
    sc.box('accent', [0.15, Hy(0.43), 0.1], [0.07, 0.014, 0.014], [0, -0.4, 0.5]);
  } else {
    // CEO: sleek long dark hair, deep side part, soft wave, gold clip and hoop earrings
    sc.loft('hair', sectionsFrom([
      { y: Hy(0.46), cz: -0.07, rx: 0.17, rz: 0.19, n: 2.3 }, { y: Hy(0.3), cz: -0.12, rx: 0.205, rz: 0.155, n: 2.3 }, { y: Hy(0.1), cz: -0.15, rx: 0.215, rz: 0.125, n: 2.3 },
      { y: Hy(-0.14), cz: -0.215, rx: 0.235, rz: 0.11, n: 2.3 }, { y: Hy(-0.4), cz: -0.265, rx: 0.245, rz: 0.1, n: 2.3 }, { y: Hy(-0.68), cz: -0.275, rx: 0.225, rz: 0.09, n: 2.3 }, { y: Hy(-0.92), cz: -0.275, rx: 0.13, rz: 0.045, n: 2.1 }], 36), { N: 40 });
    sweptFringe(sc, -1);
    for (const side of [-1, 1]) {
      lock(sc, 'hair', [[side * 0.2, Hy(0.34), 0.085], [side * 0.222, Hy(0.08), 0.115], [side * 0.245, Hy(-0.24), 0.17], [side * 0.255, Hy(-0.46), 0.215]], 0.038, 0.012, 0.026);
      earring(sc, side, Hy(0.16));
    }
    sc.box('gold', [0.18, Hy(0.4), 0.12], [0.1, 0.018, 0.018], [0, -0.7, 0.35]);
  }
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
    const cxl = side * 0.083; const cy = Hy(0.283); const z = headSurfaceZ(cy, cxl) + 0.02;
    const pts = []; for (let k = 0; k <= 28; k += 1) { const a = (k / 28) * Math.PI * 2; pts.push([cxl + Math.cos(a) * 0.058 * (1 + 0.1 * Math.cos(a)), cy + Math.sin(a) * 0.041 + (Math.sin(a) > 0 ? 0.004 : 0), z - Math.abs(cxl + Math.cos(a) * 0.058) * 0.18]); }
    sc.strand('gold', pts, 0.0034, 0.0034, 6, 1);
    const arm = [[side * 0.14, cy + 0.01, z - 0.03], [side * 0.18, cy + 0.01, z - 0.12], [side * 0.186, cy + 0.01, -0.04]]; sc.strand('gold', arm, 0.0034, 0.0034, 6, 10);
  }
  sc.strand('gold', [[-0.025, Hy(0.292), headSurfaceZ(Hy(0.29), 0) + 0.04], [0, Hy(0.299), headSurfaceZ(Hy(0.3), 0) + 0.045], [0.025, Hy(0.292), headSurfaceZ(Hy(0.29), 0) + 0.04]], 0.0034, 0.0034, 6, 8);
}
function earring(sc, side, y) {
  sc.strand('gold', Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [side * 0.19, y - 0.05 + Math.cos(a) * 0.04 - 0.04, -0.012 + Math.sin(a) * 0.04]; }), 0.0045, 0.0045, 6, 1);
}

function sculptTorso(sc, id) {
  const st = sc.style;
  const body = sectionsFrom(TORSO_KEYS, 70);
  const bust = bodyDeform(0.068, 0.045);
  sc.loft('skin', body, { N: 60, deform: bust, caps: true });
  const cap = (kind, hi, lo, off, deform, trim) => sc.loft(kind, sliceY(body, hi, lo), { N: 60, offset: off, deform: trim ? trimmed(deform, trim) : deform });
  const bustG = bodyDeform(0.071, 0.047);

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

function sculptArm(sc, id, side) {
  const st = sc.style; const flip = side > 0;
  // path: shoulder → elbow → wrist, with a natural relaxed forward bend
  const arm = [
    { y: 3.44, cx: side * 0.335, cz: 0, rx: 0.04, rz: 0.05, n: 2 },
    { y: 3.37, cx: side * 0.362, cz: 0, rx: 0.088, rz: 0.1, n: 2 },
    { y: 3.25, cx: side * 0.378, cz: 0, rx: 0.088, rz: 0.098, n: 2 },
    { y: 3.05, cx: side * 0.392, cz: -0.004, rx: 0.078, rz: 0.084, n: 2 },
    { y: 2.88, cx: side * 0.402, cz: -0.012, rx: 0.068, rz: 0.072, n: 2 },
    { y: 2.76, cx: side * 0.408, cz: -0.014, rx: 0.062, rz: 0.066, n: 2 },
    { y: 2.6, cx: side * 0.416, cz: 0.012, rx: 0.064, rz: 0.064, n: 2 },
    { y: 2.44, cx: side * 0.424, cz: 0.045, rx: 0.053, rz: 0.052, n: 2 },
    { y: 2.31, cx: side * 0.43, cz: 0.07, rx: 0.036, rz: 0.046, n: 2 },
    { y: 2.24, cx: side * 0.432, cz: 0.078, rx: 0.026, rz: 0.06, n: 2.1 },
    { y: 2.14, cx: side * 0.434, cz: 0.084, rx: 0.02, rz: 0.06, n: 2.2 },
    { y: 2.05, cx: side * 0.435, cz: 0.088, rx: 0.016, rz: 0.048, n: 2.2 },
    { y: 2.02, cx: side * 0.435, cz: 0.09, rx: 0.008, rz: 0.03, n: 2 },
  ];
  const secs = sectionsFrom(arm, 64);
  sc.loft('skin', secs, { N: 28, flip });
  // fingers (palm faces the thigh, thumb forward) — relaxed, slightly curled
  const handX = side * 0.434; const inward = -side;
  [[0.046, 0.108], [0.016, 0.118], [-0.014, 0.112], [-0.04, 0.092]].forEach(([dz, len], i) => {
    sc.strand('skin', [[handX, 2.12, 0.086 + dz], [handX + inward * 0.004, 2.12 - len * 0.45, 0.092 + dz + 0.004], [handX + inward * 0.014, 2.12 - len * 0.82, 0.098 + dz + 0.01], [handX + inward * 0.026, 2.12 - len, 0.1 + dz + 0.012]], 0.0125 - i * 0.0006, 0.0078, 8, 14);
  });
  sc.strand('skin', [[handX + inward * 0.002, 2.26, 0.136], [handX + inward * 0.012, 2.18, 0.168], [handX + inward * 0.02, 2.11, 0.19], [handX + inward * 0.026, 2.06, 0.196]], 0.0145, 0.0095, 8, 14);

  if (id === 'office01') { // long fitted blouse sleeve with a navy cuff and a slim bracelet watch
    sc.loft('cloth', sliceY(secs, 3.45, 2.34), { N: 28, offset: 0.012, flip });
    sc.loft('suit', sliceY(secs, 2.36, 2.27), { N: 28, offset: 0.017, flip });
    sc.strand('gold', ringAround(secs, 2.24, 0.012, 0.014), 0.005, 0.005, 6, 1);
  } else if (id === 'nurse01') { // short puff-free fitted sleeve with pink trim
    sc.loft('cloth', sliceY(secs, 3.45, 3.04), { N: 28, offset: 0.016, flip });
    sc.loft('accent', sliceY(secs, 3.08, 3.04), { N: 28, offset: 0.019, flip });
    sc.strand('accent', ringAround(secs, 2.28, 0.01, 0.004), 0.004, 0.004, 6, 1);
  } else { // tailored blazer sleeve with a crisp white cuff and gold button
    sc.loft('suit', sliceY(secs, 3.45, 2.37), { N: 28, offset: 0.018, flip });
    sc.loft('cloth', sliceY(secs, 2.4, 2.29), { N: 28, offset: 0.014, flip });
    sc.cyl('gold', [side * 0.475, 2.4, 0.08], 0.012, 0.016, 0.016, [0, 0, Math.PI / 2], 12);
  }
  void st;
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
    sc.loft('stock', sliceY(secs, st.stockTo, ay), { N: 36, offset: 0.004, flip });
    if (id === 'nurse01') sc.loft('accent', sliceY(secs, 1.54, 1.49), { N: 36, offset: 0.007, flip });
    // shoe: pitched foot loft along Z, with heel and instep
    const sole = (z) => Math.max(0, heel * (0.27 - z) / 0.34);
    const foot = [[-0.07, 0.05, 0.042], [-0.035, 0.056, 0.045], [0.02, 0.05, 0.046], [0.1, 0.04, 0.05], [0.18, 0.03, 0.045], [0.235, 0.022, 0.032], [0.265, 0.012, 0.015]]
      .map(([z, ry, rx]) => ({ z, cx: side * 0.106, cy: sole(z) + ry, rx, ry }));
    sc.loftZ('shoe', foot, 24, flip);
    if (heel > 0.05) sc.cyl('shoe', [side * 0.106, heel * 0.5, -0.05], heel, 0.044, id === 'ceo01' ? 0.02 : 0.034, [0, 0, 0], 14);
    if (id === 'nurse01') sc.strand('accent', Array.from({ length: 17 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return [side * 0.106 + Math.cos(a) * 0.05, ay - 0.02, Math.sin(a) * 0.053]; }), 0.005, 0.005, 6, 1);
    if (id === 'ceo01') sc.box('gold', [side * 0.106, heel + 0.06, 0.012], [0.06, 0.008, 0.01]);
  }
}
