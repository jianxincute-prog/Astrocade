// Flat, clean anime-style cloth/hair textures (no photographic noise). Same API as the realistic set.
import { mulberry32 } from './util.js';
const T = THREE;

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rx = 1, ry = 1) {
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4;
  return t;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function shade(n, k) {
  const f = (v) => Math.max(0, Math.min(255, v * k)) | 0;
  return 'rgb(' + f((n >> 16) & 255) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
}

// Puffer jacket: horizontal panels with a lighter top edge and a clean dark seam. Optional front zip.
export function quilted(base, bands, { zip = false } = {}) {
  const W = 256, H = 512, bh = H / bands;
  const [c, x] = cv(W, H);
  x.fillStyle = hex(base); x.fillRect(0, 0, W, H);
  for (let i = 0; i < bands; i++) {
    const y0 = i * bh;
    x.fillStyle = 'rgba(255,255,255,0.13)'; x.fillRect(0, y0 + 3, W, bh * 0.34);
    x.fillStyle = 'rgba(10,15,40,0.14)'; x.fillRect(0, y0 + bh * 0.72, W, bh * 0.28);
    x.fillStyle = 'rgba(25,20,45,0.6)'; x.fillRect(0, y0 - 1.5, W, 3);
  }
  if (zip) {
    x.fillStyle = 'rgba(30,25,50,0.85)'; x.fillRect(W / 2 - 3, 0, 6, H);
    x.fillStyle = '#dfe6ee'; x.fillRect(W / 2 - 1, 0, 2, H);
  }
  return { map: tex(c), bump: null };
}

// Knit (scarf, cuffs, gloves): clean vertical ribs.
export function knit(base, rx = 4, ry = 4) {
  const S = 128, [c, x] = cv(S, S);
  x.fillStyle = hex(base); x.fillRect(0, 0, S, S);
  for (let i = 0; i < S; i += 16) { x.fillStyle = shade(base, 0.86); x.fillRect(i + 8, 0, 8, S); }
  for (let i = 0; i < S; i += 16) { x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(i + 1, 0, 3, S); }
  return { map: tex(c, rx, ry), bump: null };
}

// Trousers: flat colour with a faint two-tone fold.
export function twill(base, rx = 1, ry = 1) {
  const S = 128, [c, x] = cv(S, S);
  x.fillStyle = hex(base); x.fillRect(0, 0, S, S);
  x.fillStyle = 'rgba(255,255,255,0.07)'; x.fillRect(0, 0, S * 0.35, S);
  return { map: tex(c, rx, ry), bump: null };
}

// Boots: flat colour with a soft glossy streak.
export function leather(base) {
  const S = 128, [c, x] = cv(S, S);
  x.fillStyle = hex(base); x.fillRect(0, 0, S, S);
  x.fillStyle = 'rgba(255,255,255,0.16)'; x.fillRect(S * 0.12, 0, S * 0.16, S);
  return { map: tex(c, 1, 1), bump: null };
}

// Hair: dark base, broad strand bands and an anime "angel ring" highlight (lathe v runs bottom -> top).
export function hair(base) {
  const W = 256, H = 256, [c, x] = cv(W, H), r = mulberry32(33);
  x.fillStyle = shade(base, 0.95); x.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    const px = r() * W, w = 5 + r() * 10;
    x.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.12)'; x.fillRect(px, 0, w, H);
  }
  x.fillStyle = 'rgba(190,175,215,0.5)'; x.fillRect(0, H * 0.34, W, H * 0.07); // ring highlight
  x.fillStyle = 'rgba(190,175,215,0.22)'; x.fillRect(0, H * 0.41, W, H * 0.05);
  x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(0, H * 0.84, W, H * 0.16);
  return { map: tex(c, 3, 1), bump: null };
}
