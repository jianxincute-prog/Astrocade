// Sculpted bald head as ONE smooth mesh (head-local units, same proportions as the old blob head so
// hair / bandana / shades accessories and the rigged-model head pin keep fitting).
// Every feature is an ellipsoid melted into the skull with a smooth union (smin) or carved out
// (smax): cranium, occiput, heavy jaw + chin, cheekbones, brow ridge + brow hair, nose (bridge, tip,
// wings, nostrils), lips with a carved mouth line, eye openings. Brows, stubble beard, lips,
// eye shading and the scar are painted as vertex colours; `aGloss` marks the shiny scalp so the
// material can drive roughness / clearcoat per vertex.
import { smin, smax, ellipsoid, smoothstep as ss, surfaceMesh } from './sdf.js';

let FIELD = null; // the head's distance field is shared by the skin mesh and the hair shell

const CACHE = new Map();

function headField() {
  if (FIELD) return FIELD;
  const E = ellipsoid;
  const sym = (fn) => [fn(1), fn(-1)];
  // skull + face masses
  const cranium = E([0, 0.135, -0.01], [0.118, 0.135, 0.138]);
  const occiput = E([0, 0.09, -0.07], [0.1, 0.08, 0.08]);
  const jaw = E([0, 0.05, 0.035], [0.096, 0.07, 0.095]);
  const chin = E([0, 0.026, 0.094], [0.046, 0.038, 0.039]);
  const chinBoss = E([0, 0.014, 0.113], [0.032, 0.022, 0.024]);
  const gonial = sym((s) => E([s * 0.07, 0.04, 0.004], [0.03, 0.044, 0.05]));   // squared jaw angles
  const masseter = sym((s) => E([s * 0.082, 0.062, 0.03], [0.018, 0.034, 0.036]));
  const cheek = sym((s) => E([s * 0.062, 0.102, 0.085], [0.036, 0.024, 0.03]));
  const brow = E([0, 0.158, 0.1], [0.098, 0.026, 0.042]);
  const browHair = sym((s) => E([s * 0.05, 0.1585, 0.1195], [0.042, 0.0095, 0.0135], [0, 0, s * 0.3]));
  // nose
  const bridge = E([0, 0.122, 0.128], [0.0165, 0.036, 0.02], [-0.25, 0, 0]);
  const tip = E([0, 0.098, 0.146], [0.021, 0.017, 0.02]);
  const wings = sym((s) => E([s * 0.0165, 0.096, 0.135], [0.0135, 0.0115, 0.0135]));
  // lips
  const upperLip = E([0, 0.0655, 0.1205], [0.0265, 0.0082, 0.0125]);
  const lowerLip = E([0, 0.0485, 0.1185], [0.0285, 0.0098, 0.0135]);
  // carves
  const groove = E([0, 0.0572, 0.1335], [0.034, 0.0048, 0.0048]);                                              // mouth line (shallow, soft)
  const eyes = sym((s) => E([s * 0.0445, 0.135, 0.108], [0.0235, 0.0122, 0.0195]));                            // eye pockets: lids form where the eyeball sphere is taller than the pocket

  FIELD = (x, y, z) => {
    let d = smin(cranium(x, y, z), occiput(x, y, z), 0.03);
    d = smin(d, jaw(x, y, z), 0.04);
    d = smin(d, chin(x, y, z), 0.03);
    d = smin(d, chinBoss(x, y, z), 0.02);
    for (let i = 0; i < 2; i++) {
      d = smin(d, gonial[i](x, y, z), 0.035);
      d = smin(d, masseter[i](x, y, z), 0.03);
      d = smin(d, cheek[i](x, y, z), 0.03);
    }
    d = smin(d, brow(x, y, z), 0.028);
    for (let i = 0; i < 2; i++) d = smin(d, browHair[i](x, y, z), 0.006);
    d = smin(d, bridge(x, y, z), 0.018);
    d = smin(d, tip(x, y, z), 0.014);
    for (let i = 0; i < 2; i++) d = smin(d, wings[i](x, y, z), 0.012);
    d = smin(d, upperLip(x, y, z), 0.01);
    d = smin(d, lowerLip(x, y, z), 0.01);
    d = smax(d, -groove(x, y, z), 0.004);
    for (let i = 0; i < 2; i++) d = smax(d, -eyes[i](x, y, z), 0.006);
    return d;
  };
  return FIELD;
}

function colorFn({ beard, scar }) {
  const bow = (cx, cy, cz, rx, ry, rz, x, y, z) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2;
  return (x, y, z) => {
    let r = 1, g = 1, b = 1;
    const mul = (m, a, b2, c2) => { r *= 1 + (a - 1) * m; g *= 1 + (b2 - 1) * m; b *= 1 + (c2 - 1) * m; };
    const ax = Math.abs(x), s = x >= 0 ? 1 : -1;
    // warm cheeks and nose tip, tired shading around the eyes
    mul(1 - ss(0.4, 1.6, bow(0.066, 0.09, 0.08, 0.04, 0.035, 0.05, ax, y, z)), 1.02, 0.94, 0.9);
    mul(1 - ss(0.3, 1.2, bow(0, 0.097, 0.146, 0.028, 0.024, 0.026, ax, y, z)), 1.04, 0.84, 0.8);
    mul((1 - ss(0.6, 1.6, ((ax - 0.043) / 0.034) ** 2 + ((y - 0.133) / 0.024) ** 2)) * ss(0.08, 0.11, z) * 0.55, 0.8, 0.7, 0.68);
    // stubble beard + moustache (not on the lips)
    const lip = 1 - ss(0.8, 1.5, bow(0, 0.057, 0.122, 0.031, 0.017, 0.022, ax, y, z));
    if (beard) {
      const jawM = (1 - ss(1.0, 1.35, bow(0, 0.04, 0.045, 0.113, 0.078, 0.108, ax, y, z))) * ss(0.1, 0.07, y) * ss(-0.075, -0.02, z);
      const stache = 1 - ss(0.7, 1.25, bow(0, 0.077, 0.127, 0.037, 0.014, 0.03, ax, y, z));
      const m = Math.max(jawM, stache) * (1 - lip * 0.9);
      mul(m * 0.9, 0.38, 0.36, 0.34);
    }
    // nostrils: dark openings under the nose tip
    mul((1 - ss(0.5, 1.3, bow(0.0105, 0.0905, 0.1385, 0.0068, 0.0055, 0.0085, ax, y, z))) * 0.85, 0.26, 0.16, 0.14);
    // lips + mouth line
    mul(lip * 0.6, 1.0, 0.64, 0.58);
    mul((1 - ss(0.5, 1.2, bow(0, 0.0572, 0.13, 0.034, 0.0045, 0.02, ax, y, z))) * 0.8, 0.4, 0.26, 0.24);
    // angry brows: dark hair bars, outer ends raised
    if (z > 0.06) {
      const a = 0.3, dx = ax - 0.05, dy = y - 0.1585;
      const u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a);
      const bm = (1 - ss(0.026, 0.044, Math.abs(u))) * (1 - ss(0.0055, 0.0105, Math.abs(v)));
      mul(bm * 0.93, 0.17, 0.14, 0.12);
      if (scar && s > 0) {
        // vertical scar cutting through the right brow
        const du = ax - 0.052 + (y - 0.152) * 0.2, sm = (1 - ss(0.0012, 0.0034, Math.abs(du))) * (1 - ss(0.022, 0.03, Math.abs(y - 0.152)));
        mul(sm * 0.9, 1.0, 0.5, 0.45);
      }
    }
    return [r, g, b];
  };
}

/** Shiny crown: gloss ramps up above the brow ridge, faint sheen on the face skin. */
const glossFn = (x, y, z) => Math.max(0.08, ss(0.15, 0.215, y) * (0.82 + 0.18 * ss(-0.05, 0.05, z)) + ss(0.09, 0.14, y) * ss(0.0, -0.1, z) * 0.35);

/** Cached sculpted head geometry. opts: { hi, beard, scar }. */
export function buildHeadGeometry(T, { hi, beard, scar }) {
  const key = [hi ? 1 : 0, beard ? 1 : 0, scar ? 1 : 0].join('');
  if (!CACHE.has(key)) {
    CACHE.set(key, surfaceMesh(T, headField(), {
      center: [0, 0.1, 0.015], rMax: 0.26,
      nu: hi ? 168 : 64, nv: hi ? 126 : 48, iters: hi ? 18 : 14,
      colorFn: colorFn({ beard, scar }), glossFn,
    }));
    // cheap twin used for the x-ray silhouette copy (only a flat colour is drawn with it)
    if (hi) CACHE.get(key).userData.proxy = buildHeadGeometry(T, { hi: false, beard, scar });
  }
  return CACHE.get(key);
}

/** Hair weight 0..1 over the head: 0 below the hairline (low at the nape, receding at the temples). */
function hairWeight(x, y, z) {
  const line = 0.205 + (0.085 - 0.205) * ss(0.09, -0.09, z) + 0.03 * ss(0.05, 0.1, Math.abs(x)) * ss(0.0, 0.1, z);
  return ss(line - 0.012, line + 0.02, y);
}

/**
 * Hair as a real cap: the head surface pushed out by a thickness that fades to zero at the hairline
 * (so it melts into the skin there instead of ending in a ball). Only the covered triangles are kept.
 */
export function buildHairGeometry(T, { hi }) {
  const key = 'hair' + (hi ? 1 : 0);
  if (!CACHE.has(key)) {
    const f = headField(), t = 0.014;
    CACHE.set(key, surfaceMesh(T, (x, y, z) => f(x, y, z) - t * hairWeight(x, y, z), {
      center: [0, 0.1, 0.015], rMax: 0.28, nu: hi ? 96 : 40, nv: hi ? 72 : 30, iters: hi ? 16 : 12,
      glossFn: hairWeight,                               // per-vertex hair weight; the material cuts the hairline from it per pixel
      keepFn: (x, y, z) => hairWeight(x, y, z) > 0.02,
    }));
  }
  return CACHE.get(key);
}
