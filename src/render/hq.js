// The three gang headquarters, each a fenced compound with an open boss arena in front of the main building.
//   0  THE DEN        (Red Wolves)   brick warehouse fortress: container walls, watch towers, bonfires, barbed wire
//   1  DRAGON TEMPLE  (Blue Dragons) three-tier pagoda, lacquer gate, lion guardians, lantern ring, koi pond
//   2  GOLDEN PALACE  (Golden Cobras) art-deco ziggurat, red carpet, gold cobra gate, fountains, searchlights
// Collision boxes for the hall, wings, gate posts and fences come from logic/city.js (COMPOUNDS); this file only dresses them.
import { COMPOUNDS } from '../logic/city.js';
import {
  cyl, cylXZ, sph, bx, dome, bar, tree, palm, bush, bamboo, lamp, bench, barrel, crate, tires, container, car, wreck, sign, lantern, banner, bollard,
} from './props.js';
import { mulberry32 } from '../logic/city.js';

const FH = 3.4, BAY = 3.2;
const snap = (v, u) => Math.max(u * 2, Math.floor(v / u) * u);
const cl = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
const hex = (r, g, b) => (cl(r) << 16) | (cl(g) << 8) | cl(b);

function facadeBox(c, key, cx, cz, w0, d0, y0, floors, tint, rng, roofMat) {
  const w = snap(w0, BAY), d = snap(d0, BAY), h = floors * FH;
  c.M.box(c.facades[key], cx, y0 + h / 2, cz, w, h, d, { color: tint, ku: 1 / (8 * BAY), kv: 1 / (8 * FH), uv0: [Math.floor(rng() * 8) / 8, 0], roofMat: roofMat || c.mats.plain, roofColor: 0xb8a888 });
  return { w, d, h, top: y0 + h };
}

/** Round emblem decal on the arena floor. */
function emblem(c, x, z, r, gang) {
  c.decals.push({ x, z, r, gang });
}

/** Perimeter dressing for each 'fence' solid of a compound. */
function fences(c, gang, city) {
  for (const f of city.buildings) {
    if (f.kind !== 'fence' || f.hq !== gang) continue;
    const horiz = f.w > f.d, L = horiz ? f.w : f.d, n = Math.max(1, Math.round(L / 3));
    for (let k = 0; k <= n; k++) {
      const s = -L / 2 + (k * L) / n, px = f.x + (horiz ? s : 0), pz = f.z + (horiz ? 0 : s);
      if (gang === 0) cyl(c, c.mats.metal, px, 0, pz, 0.1, 3.4, 0x3a3d40, 'cyl8');
      else if (gang === 1) { bx(c, c.mats.plain, px, 0, pz, 0.7, 3.5, 0.7, 0xa82020); }
      else { bx(c, c.mats.plain, px, 0, pz, 0.6, 1.5, 0.6, 0xd8cfb8); sph(c, c.mats.metal, px, 1.7, pz, 0.28, 0xd8ae48); }
    }
    const fw = horiz ? L : 0.3, fd = horiz ? 0.3 : L;
    if (gang === 0) {
      c.M.box(c.mats.plain, f.x, 0.5, f.z, horiz ? L : 0.7, 1.0, horiz ? 0.7 : L, { color: 0x6a6660 });                    // concrete base
      c.M.box(c.mats.glass, f.x, 2.2, f.z, fw, 2.2, fd, { color: 0x9aa4ac, top: false });                                  // chain-link
      c.M.box(c.mats.metal, f.x, 3.3, f.z, horiz ? L : 0.14, 0.14, horiz ? 0.14 : L, { color: 0x2a2d30 });
      for (let k = 0; k < L / 0.6; k++) c.M.geo(c.mats.metal, c.g.cone8, f.x + (horiz ? -L / 2 + 0.3 + k * 0.6 : 0), 3.6, f.z + (horiz ? 0 : -L / 2 + 0.3 + k * 0.6), 0, { sx: 0.06, sy: 0.5, sz: 0.06, color: 0x2a2d30 });  // barbed wire
    } else if (gang === 1) {
      c.M.box(c.mats.plain, f.x, 1.6, f.z, horiz ? L : 0.7, 3.2, horiz ? 0.7 : L, { color: 0xeee3cc, roofMat: c.mats.tiles });   // white plaster wall, tile cap
      c.M.box(c.mats.plain, f.x, 3.35, f.z, horiz ? L : 1.1, 0.35, horiz ? 1.1 : L, { color: 0x2d5878 });
      c.M.box(c.mats.plain, f.x, 0.55, f.z, horiz ? L + 0.05 : 0.78, 0.5, horiz ? 0.78 : L + 0.05, { color: 0x8c1d1d });
    } else {
      c.M.box(c.mats.plain, f.x, 0.5, f.z, horiz ? L : 0.8, 1.0, horiz ? 0.8 : L, { color: 0xd9ceb4 });                       // marble base + gold bars
      for (let k = 0; k < L / 0.55; k++) c.M.box(c.mats.metal, f.x + (horiz ? -L / 2 + 0.27 + k * 0.55 : 0), 2.3, f.z + (horiz ? 0 : -L / 2 + 0.27 + k * 0.55), 0.09, 2.4, 0.09, { color: 0xd8ae48 });
      c.M.box(c.mats.metal, f.x, 3.55, f.z, horiz ? L : 0.2, 0.16, horiz ? 0.2 : L, { color: 0xd8ae48 });
    }
  }
}

function watchTower(c, x, z, col) {
  for (const dx of [-1.2, 1.2]) for (const dz of [-1.2, 1.2]) cyl(c, c.mats.metal, x + dx, 0, z + dz, 0.13, 7.4, 0x3a3d40, 'cyl8');
  for (let k = 1; k < 4; k++) { bar(c, c.mats.metal, x - 1.2, k * 1.9, z - 1.2, x + 1.2, k * 1.9 - 0.9, z - 1.2, 0.08, 0x3a3d40); bar(c, c.mats.metal, x - 1.2, k * 1.9, z + 1.2, x + 1.2, k * 1.9 - 0.9, z + 1.2, 0.08, 0x3a3d40); }
  bx(c, c.mats.plain, x, 7.4, z, 3.2, 2.3, 3.2, 0x4a4540, 0, { roofMat: c.mats.corr });
  c.M.box(c.mats.glow, x, 8.4, z + 1.62, 2.4, 0.7, 0.05, { color: 0xffb04a, top: false });
  c.M.box(c.mats.glow, x, 8.4, z - 1.62, 2.4, 0.7, 0.05, { color: 0xffb04a, top: false });
  bx(c, c.mats.plain, x, 9.7, z, 3.8, 0.3, 3.8, 0x2a2d30);
  c.M.geo(c.mats.glow, c.g.sph, x, 10.2, z, 0, { sx: 0.3, sy: 0.3, sz: 0.3, color: col });
  c.beams.push([x, 8.6, z, x * 0.37, col]);
  c.lights.push({ x, z, col, y: 8 });
}

// ------------------------------------------------------------------ 0: THE DEN
function den(c, city) {
  const rng = mulberry32(1001), A = COMPOUNDS[0];
  c.pads.push({ x: 0, z: -93.75, w: 65, d: 27.5, mat: 'denPad' });
  emblem(c, A.x, A.z, 11.5, 0);
  // brick hall: 3 floors, sawtooth roof, roller door, huge sign
  const s = facadeBox(c, 'brick', 0, -102.5, 46, 9, 0, 3, hex(0.95, 0.9, 0.88), rng, c.mats.corr);
  c.M.box(c.mats.plain, 0, 0.0 + 2.4, -97.95, 44, 4.8, 0.3, { color: 0x3a3836, top: false });         // dark ground band
  c.M.box(c.mats.metal, 0, s.top + 0.45, -102.5, s.w + 0.7, 0.9, s.d + 0.7, { color: 0x4a4440 });
  for (let k = 0; k < 8; k++) {
    const x0 = -s.w / 2 + 1 + (k * (s.w - 2)) / 8, x1 = x0 + (s.w - 2) / 8, y = s.top + 0.9;
    c.M.quad(c.mats.corr, [x0, y, -107], [x0, y, -98.2], [x1, y + 2, -98.2], [x1, y + 2, -107], [0, 0, 3, 2], 0xa8a098);
    c.M.quad(c.mats.glow, [x0, y, -98.21], [x0, y, -106.9], [x0, y + 2, -106.9], [x0, y + 2, -98.21], [0, 0, 1, 1], 0x6a2a20);
  }
  // roller door (centre) + red hazard frame
  c.M.quad(c.mats.plain, [-5, 0, -97.8], [5, 0, -97.8], [5, 7, -97.8], [-5, 7, -97.8], [0, 0, 1, 1], 0x1c1b1a);
  for (let k = 0; k < 12; k++) c.M.quad(c.mats.plain, [-4.7, 0.3 + k * 0.55, -97.76], [4.7, 0.3 + k * 0.55, -97.76], [4.7, 0.65 + k * 0.55, -97.76], [-4.7, 0.65 + k * 0.55, -97.76], [0, 0, 1, 1], k % 2 ? 0x2c2a28 : 0x38352f);
  for (const sx of [-5.4, 5.4]) c.M.box(c.mats.glow, sx, 3.6, -97.75, 0.3, 7.2, 0.1, { color: 0xff3a2a, top: false });
  c.M.box(c.mats.glow, 0, 7.15, -97.75, 10.8, 0.3, 0.1, { color: 0xff3a2a, top: false });
  sign(c, 'THE DEN', 0, 10.6, -97.7, 15, 3.9, 0, 1);
  sign(c, 'WOLF', -17, 6.2, -97.7, 6, 1.5, 0, 0.9); sign(c, 'WOLF', 17, 6.2, -97.7, 6, 1.5, 0, 0.9);
  for (const sx of [-20, 20]) { c.M.box(c.mats.glow, sx, 4.4, -97.72, 3.4, 2.4, 0.06, { color: 0xa87030, top: false }); c.M.box(c.mats.plain, sx, 4.4, -97.74, 3.7, 2.7, 0.04, { color: 0x1a1a1a, top: false }); }
  // smokestacks
  for (const sx of [-19, 19]) { cylXZ(c, c.mats.plain, sx, 0, -105.5, 1.5, 1.0, 26, 0xa86a50); for (let k = 0; k < 3; k++) cylXZ(c, c.mats.plain, sx, 26 * (0.6 + k * 0.13), -105.5, 1.1, 1.08, 2, k % 2 ? 0xe8e0d0 : 0xb8402a); c.smoke.push([sx, 26.4, -105.5, sx]); }
  // container stacks (two flanks, collision comes from the city plan) with graffiti
  for (const sx of [-28, 28]) {
    for (const zz of [-103.6, -97.4]) { container(c, sx, zz, 0, [0xa8402a, 0x6a2a22][zz < -100 ? 0 : 1], 0, false); container(c, sx, zz, 0, [0x2e5a8a, 0xc9a02a][zz < -100 ? 1 : 0], 2.6, false); }
    container(c, sx, -100.5, Math.PI / 2, 0x7a3a2a, 5.2, false);
    sign(c, 'WOLF', sx, 2.4, -94.3, 4, 1.0, 0, 0.9);
  }
  watchTower(c, -30.2, -82.4, 0xff4a3a); watchTower(c, 30.2, -82.4, 0xff4a3a);
  // gate posts + arch
  for (const sx of [-8.6, 8.6]) { bx(c, c.mats.plain, sx, 0, -80.4, 1.4, 5.4, 1.4, 0x4a4540); bx(c, c.mats.plain, sx, 5.4, -80.4, 1.8, 0.4, 1.8, 0x2a2724); c.M.geo(c.mats.glow, c.g.sph, sx, 6.1, -80.4, 0, { sx: 0.3, sy: 0.3, sz: 0.3, color: 0xff3a2a }); c.solid(sx, -80.4, 1.4, 1.4); }
  bx(c, c.mats.metal, 0, 5.2, -80.4, 17.6, 0.4, 0.5, 0x2a2d30);
  sign(c, 'THE DEN', 0, 6.2, -80.2, 7.5, 1.9, Math.PI, 1);
  // yard props: oil drums, tires, crates, wrecks, bonfires
  for (const [bxp, bzp] of [[-12, -92], [13, -91]]) {
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4; barrel(c, bxp + Math.cos(a) * 1.2, bzp + Math.sin(a) * 1.2, 0x5a3a24, { solid: false }); c.fires.push([bxp + Math.cos(a) * 1.2, 1.15, bzp + Math.sin(a) * 1.2, rng() * 6]); }
    c.solid(bxp, bzp, 3.4, 3.4);
    for (let k = 0; k < 4; k++) { const a = k * 1.57; bx(c, c.mats.wood, bxp + Math.cos(a) * 2.6, 0, bzp + Math.sin(a) * 2.6, 1.8, 0.4, 0.5, 0x4a3020, a); }
    c.lights.push({ x: bxp, z: bzp, col: 0xff8a2a, y: 1.5 });
  }
  for (const [px, pz] of [[-20, -86], [22, -88], [-25, -92]]) tires(c, px, pz, 6);
  for (let k = 0; k < 6; k++) crate(c, -26 + k * 1.1 + (k > 2 ? 40 : 0), -84 - (k % 2) * 1.0, 0.9 + (k % 3) * 0.25, 0x8a6a40, 0, k);
  car(c, -18, -100.8 + 0, 0.1, 0x6a1a1a); wreck(c, 17.5, 0, -96, 0.4, 0x5a3a2a);
  for (const [fx, fz] of [[-30, -92], [30, -92], [-20, -81], [20, -81]]) c.flags.push([fx, 6.4, fz, 0xd8312a, 0]);
  for (const fx of [-30, 30]) cyl(c, c.mats.metal, fx, 0, -92, 0.1, 7, 0x2a2d30, 'cyl8');
  for (const fx of [-20, 20]) cyl(c, c.mats.metal, fx, 0, -81, 0.1, 7, 0x2a2d30, 'cyl8');
  // floodlights
  for (const fx of [-24, 24]) { cyl(c, c.mats.metal, fx, 0, -86, 0.12, 8.5, 0x3a3d40, 'cyl8'); bx(c, c.mats.glow, fx, 8.5, -86, 1.8, 0.6, 0.5, 0xfff1c9); }
}

// ------------------------------------------------------------------ 1: DRAGON TEMPLE
function temple(c, city) {
  const rng = mulberry32(2002), A = COMPOUNDS[1];
  c.pads.push({ x: 93.75, z: 37.5, w: 27.5, d: 65, mat: 'dragons' });
  emblem(c, A.x, A.z, 11.5, 1);
  const hx = 101.5, hz = 37.5;
  // main hall: red lacquer ground tier + three tiled tiers
  c.M.box(c.mats.plain, hx, 2.2, hz, 12, 4.4, 18, { color: 0x7a1a1a, roofMat: c.mats.plain });
  for (const dz of [-6.5, -3.2, 0, 3.2, 6.5]) { cyl(c, c.mats.plain, 95.2, 0, hz + dz, 0.38, 4.4, 0xb82424, 'cyl12'); c.M.box(c.mats.glow, 95.28, 2.0, hz + dz + 0.0, 0.05, 0.05, 0.05, { color: 0xffffff }); }
  c.M.quad(c.mats.glow, [95.45, 0.1, hz - 1.6], [95.45, 0.1, hz + 1.6], [95.45, 3.5, hz + 1.6], [95.45, 3.5, hz - 1.6], [0, 0, 1, 1], 0x2a1a10);
  let y = 4.4, w = 12, d = 18;
  for (let t = 0; t < 3; t++) {
    c.M.hipRoof(c.mats.tiles, hx, y, hz, w, d, 2.2, 1.4, { ridge: 0.14, color: 0xffffff });
    y += 2.0;
    w -= 3; d -= 4.5;
    const s = facadeBox(c, 'shop', hx, hz, w, d, y, 2, hex(1.0, 1.0, 1.05), rng, c.mats.tiles);
    y = s.top;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.M.geo(c.mats.plain, c.g.cone8, hx + sx * (s.w / 2 + 1.4 + t * 0.0), y - s.h + 0.2, hz + sz * (s.d / 2 + 1.4), 0, { sx: 0.12, sy: 0.55, sz: 0.12, color: 0xc9a14a });
    for (let k = 0; k < 4; k++) lantern(c, hx - 95.5 + 95.5 - s.w / 2 - 0.4, y - s.h + 0.3, hz - s.d / 2 + 0.8 + k * ((s.d - 1.6) / 3), [0xff3a2a, 0xff8a2a, 0x3a8aff, 0xffd23a][k], 0.25);
  }
  c.M.hipRoof(c.mats.gold, hx, y, hz, w, d, 3.4, 1.2, { ridge: 0.05, color: 0xffffff });
  cyl(c, c.mats.metal, hx, y + 3.4, hz, 0.13, 4, 0xe8c060, 'cyl8'); sph(c, c.mats.metal, hx, y + 7.6, hz, 0.45, 0xe8c060);
  sign(c, 'DRAGON', 95.3, 6.0, hz, 6.6, 1.65, -Math.PI / 2, 1);
  // stone steps up to the hall
  for (let k = 0; k < 3; k++) c.M.box(c.mats.plain, 94.2 - k * 0.8 + 0.8, 0.12 + k * 0.0 + 0.1, hz, 2.0, 0.22 + (2 - k) * 0.0, 7 + k * 1.5, { color: 0xa8a49a });
  // wings: pavilions with pagoda roofs
  for (const wz of [14.5, 60.5]) {
    c.M.box(c.mats.plain, hx, 2.6, wz, 9, 5.2, 10, { color: 0x6a1818, roofMat: c.mats.plain });
    const s = facadeBox(c, 'shop', hx, wz, 9, 9.6, 5.2, 1, hex(1, 1, 1.05), rng, c.mats.tiles);
    void s;
    c.M.hipRoof(c.mats.tiles, hx, 8.7, wz, 9, 10, 2.2, 1.2, { ridge: 0.12, color: 0xffffff });
    c.M.box(c.mats.plain, hx, 8.65, wz, 9.4, 0.3, 10.4, { color: 0xc9a14a, top: false });
    lantern(c, 95.2, 3.6, wz, 0xff8a2a, 0.3);
  }
  // paifang gate with tiled roof + lion guardians
  for (const dz of [-9.5, 9.5]) { cyl(c, c.mats.plain, 80.5, 0, 37.5 + dz, 0.55, 8.6, 0xb82424, 'cyl12'); bx(c, c.mats.plain, 80.5, 0, 37.5 + dz, 1.6, 0.7, 1.6, 0x7a7870); }
  bx(c, c.mats.plain, 80.5, 8.4, 37.5, 1.0, 0.7, 21, 0x8a1c1c); bx(c, c.mats.plain, 80.5, 9.0, 37.5, 1.5, 0.3, 21.8, 0xc9a14a);
  c.M.hipRoof(c.mats.tiles, 80.5, 9.3, 37.5, 1.4, 21, 1.9, 1.5, { ridge: 0.1, color: 0xffffff });
  sign(c, 'DRAGON', 79.9, 7.2, 37.5, 5.2, 1.3, -Math.PI / 2, 1); sign(c, 'DRAGON', 81.1, 7.2, 37.5, 5.2, 1.3, Math.PI / 2, 1);
  for (const dz of [-12, 12]) {
    bx(c, c.mats.plain, 82.5, 0, 37.5 + dz, 1.8, 1.0, 1.8, 0x8a8e90); bx(c, c.mats.plain, 82.5, 1.0, 37.5 + dz, 1.2, 1.2, 1.6, 0xa8aaa8);
    sph(c, c.mats.plain, 82.5, 2.5, 37.5 + dz, 0.6, 0xa8aaa8); c.M.geo(c.mats.glow, c.g.sph, 82.2, 2.6, 37.5 + dz - 0.15, 0, { sx: 0.1, sy: 0.1, sz: 0.1, color: 0x5ad0ff });
    c.M.geo(c.mats.glow, c.g.sph, 82.2, 2.6, 37.5 + dz + 0.15, 0, { sx: 0.1, sy: 0.1, sz: 0.1, color: 0x5ad0ff });
    c.solid(82.5, 37.5 + dz, 1.8, 1.8);
  }
  // lantern ring + stone lamps around the arena (decor only)
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * 6.2832, lx = A.x + Math.cos(a) * 12.5, lz = A.z + Math.sin(a) * 12.5;
    if (lx < 81.5 || lx > 94.5 || lz < 6 || lz > 69 || Math.abs(lz - 37.5) < 3.5 && lx < 86) continue;
    bx(c, c.mats.plain, lx, 0, lz, 0.5, 0.5, 0.5, 0x8a8e90); bx(c, c.mats.plain, lx, 0.5, lz, 0.3, 0.9, 0.3, 0x8a8e90);
    c.M.box(c.mats.glow, lx, 1.65, lz, 0.4, 0.4, 0.4, { color: [0x5ad0ff, 0xff9a4a][k % 2] }); bx(c, c.mats.plain, lx, 1.9, lz, 0.8, 0.2, 0.8, 0x6a6e70);
    c.solid(lx, lz, 0.6, 0.6);
  }
  // koi pond + bridge, cherry trees, bamboo, incense cauldron
  c.M.box(c.mats.plain, 90, 0.14, 15, 9, 0.24, 7, { color: 0x6a6e70 }); c.M.box(c.mats.water, 90, 0.31, 15, 8.4, 0.04, 6.4, { top: true });
  for (let k = 0; k < 5; k++) c.M.geo(c.mats.glow, c.g.sph, 87.5 + k * 1.1, 0.34, 15 + Math.sin(k * 2) * 1.4, 0, { sx: 0.3, sy: 0.04, sz: 0.14, color: [0xff7a2a, 0xffffff, 0xff4a3a][k % 3] });
  for (let k = 0; k < 7; k++) { const t = k / 6; c.M.box(c.mats.wood, 90, 0.45 + Math.sin(t * Math.PI) * 0.7, 12.4 + 5.2 * t, 1.8, 0.18, 1.0, { color: 0x8a2a22 }); }
  c.solid(90, 15, 9, 7);
  for (const [tx, tz] of [[84, 9], [96, 9], [84, 66], [96, 66], [88, 62]]) tree(c, tx, tz, 1.05, 'cherry');
  bamboo(c, 82, 20); bamboo(c, 82, 55); bamboo(c, 105, 24); bamboo(c, 105, 52);
  cylXZ(c, c.mats.metal, 91.5, 0, 28.5, 0.9, 0.7, 1.5, 0x6a4a2a); c.M.geo(c.mats.glow, c.g.sph, 91.5, 1.7, 28.5, 0, { sx: 0.45, sy: 0.2, sz: 0.45, color: 0xff7a2a }); c.solid(91.5, 28.5, 1.8, 1.8); c.fires.push([91.5, 1.9, 28.5, 3]);
  for (const fz of [8, 66]) c.flags.push([85, 5.8, fz, 0x2f6be0, 0.5]);
  for (const fz of [8, 66]) cyl(c, c.mats.metal, 85, 0, fz, 0.1, 6.4, 0x2a2d30, 'cyl8');
  for (const [fx, fz] of [[92, 22], [92, 53]]) { cyl(c, c.mats.metal, fx, 0, fz, 0.1, 6.4, 0x2a2d30, 'cyl8'); c.flags.push([fx, 5.8, fz, 0xc9a14a, 0.5]); }
  c.lights.push({ x: A.x, z: A.z, col: 0x5ab4ff, y: 4 });
}

// ------------------------------------------------------------------ 2: GOLDEN PALACE
function palace(c, city) {
  const rng = mulberry32(3003), A = COMPOUNDS[2];
  c.pads.push({ x: -93.75, z: 37.5, w: 27.5, d: 65, mat: 'cobras' });
  emblem(c, A.x, A.z, 11.5, 2);
  const hx = -101.5, hz = 37.5, tint = hex(1.0, 0.98, 0.92);
  // ziggurat: three deco tiers, gold fins, glowing cornices, crown
  let y = 0, w = 12, d = 18;
  [[1, 3], [0.75, 2], [0.5, 2]].forEach(([k, floors], i) => {
    const s = facadeBox(c, 'deco', hx, hz, i === 0 ? 12 : w * k * 1.0, i === 0 ? 18 : d * k * 1.0, y, floors, tint, rng, c.mats.plain);
    c.M.box(c.mats.metal, hx, s.top + 0.3, hz, s.w + 0.8, 0.6, s.d + 0.8, { color: 0xc59a3c });
    c.M.box(c.mats.glow, hx, s.top + 0.62, hz, s.w + 0.4, 0.14, s.d + 0.4, { color: 0xffd27a, top: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.M.box(c.mats.metal, hx + sx * (s.w / 2 + 0.05), y + s.h / 2, hz + sz * (s.d / 2 + 0.05), 0.5, s.h, 0.5, { color: 0xd8ae48 });
    y = s.top + 0.6;
  });
  c.M.hipRoof(c.mats.gold, hx, y, hz, 5, 7, 3.6, 0.5, { ridge: 0.08, color: 0xffffff });
  cyl(c, c.mats.metal, hx, y + 3.6, hz, 0.14, 7, 0xe8c060, 'cyl8'); c.M.geo(c.mats.glow, c.g.sph, hx, y + 10.8, hz, 0, { sx: 0.3, sy: 0.3, sz: 0.3, color: 0xfff0b0 });
  c.beams.push([hx, y + 10.8, hz, 1.3, 0xffe9a0]);
  // grand entrance: gold columns, canopy, big marquee
  c.M.box(c.mats.plain, hx, 2.2, hz, 12.4, 4.4, 18.4, { color: 0xd9ceb4, roofMat: c.mats.plain });
  for (let k = 0; k < 6; k++) cyl(c, c.mats.metal, -95.2, 0, hz - 7.5 + k * 3, 0.42, 5.2, 0xd8ae48, 'cyl12');
  bx(c, c.mats.metal, -95.2, 5.2, hz, 1.8, 0.5, 18.5, 0xc59a3c);
  sign(c, 'GOLD', -94.2, 6.9, hz, 7.5, 1.9, -Math.PI / 2, 1); sign(c, 'COBRA', -94.2, 8.9, hz, 7.5, 1.9, -Math.PI / 2, 1);
  for (let q = 0; q < 16; q++) c.M.box(c.mats.glow, -94.2, 5.6, hz - 7.5 + q * (15 / 15), 0.2, 0.2, 0.2, { color: q % 2 ? 0xffe9a0 : 0xff5a6a });
  // red carpet from the gate to the hall + gold stanchions
  c.M.quad(c.mats.plain, [-80.4, 0.235, 35.5], [-80.4, 0.235, 39.5], [-95.2, 0.235, 39.5], [-95.2, 0.235, 35.5], [0, 0, 1, 1], 0xa01824);
  for (let k = 0; k < 9; k++) for (const dz of [-2.4, 2.4]) { bollard(c, -82 - k * 1.55, 37.5 + dz, 0xd8ae48, 0xffd27a); }
  // wings: domed casino + spa
  for (const wz of [14.5, 60.5]) {
    const s = facadeBox(c, 'deco', hx, wz, 9, 9.6, 0, 3, tint, rng, c.mats.plain);
    c.M.box(c.mats.metal, hx, s.top + 0.3, wz, s.w + 0.7, 0.6, s.d + 0.7, { color: 0xc59a3c });
    dome(c, c.mats.gold, hx, s.top + 0.6, wz, 3.6, 0xffffff, 0.8);
    sign(c, wz < 30 ? 'CASINO' : 'HOTEL', -96.0, 4.6, wz, 4.4, 1.1, -Math.PI / 2, 1);
    c.beams.push([hx, s.top + 3.6, wz, wz, 0xff9ad0]);
  }
  // gate: gold pillars crowned with cobra statues + arch
  for (const dz of [-9.5, 9.5]) {
    cyl(c, c.mats.metal, -80.5, 0, 37.5 + dz, 0.6, 7, 0xd8ae48, 'cyl12'); bx(c, c.mats.plain, -80.5, 0, 37.5 + dz, 1.7, 0.8, 1.7, 0xd9ceb4);
    cylXZ(c, c.mats.metal, -80.5, 7, 37.5 + dz, 0.7, 0.3, 1.6, 0xd8ae48); sph(c, c.mats.metal, -80.5, 8.9, 37.5 + dz, 0.8, 0xd8ae48, 0.55);
    for (const e of [-0.28, 0.28]) c.M.geo(c.mats.glow, c.g.sph, -80.9, 9.0, 37.5 + dz + e, 0, { sx: 0.1, sy: 0.1, sz: 0.1, color: 0xff3a3a });
    c.beams.push([-80.5, 9.6, 37.5 + dz, dz, 0xffe9a0]);
  }
  bx(c, c.mats.metal, -80.5, 7.4, 37.5, 0.9, 0.7, 21, 0xc59a3c);
  sign(c, 'COBRA', -79.9, 7.8, 37.5, 6, 1.5, Math.PI / 2, 1); sign(c, 'GOLD', -81.1, 7.8, 37.5, 6, 1.5, -Math.PI / 2, 1);
  // fountains + palms + benches
  for (const fz of [16, 59]) {
    cylXZ(c, c.mats.plain, -91, 0, fz, 3.6, 3.6, 0.8, 0xd9ceb4, 'cyl16'); c.M.geo(c.mats.water, new c.T.CylinderGeometry(3.1, 3.1, 0.05, 20), -91, 0.85, fz, 0, {});
    cylXZ(c, c.mats.metal, -91, 0.8, fz, 0.7, 0.35, 2.0, 0xd8ae48); c.solid(-91, fz, 7.2, 7.2); c.sprays.push([-91, 0.9, fz]);
  }
  for (const [px, pz] of [[-84, 9], [-84, 66], [-97, 9], [-97, 66], [-87, 26], [-87, 49], [-104, 26], [-104, 49]]) palm(c, px, pz, 1.2);
  for (const [bxp, bzp, r] of [[-89, 26.5, Math.PI / 2], [-89, 48.5, Math.PI / 2]]) bench(c, bxp, bzp, r, 0x2a2420);
  for (const fz of [8, 66]) { cyl(c, c.mats.metal, -85, 0, fz, 0.1, 6.4, 0x2a2d30, 'cyl8'); c.flags.push([-85, 5.8, fz, 0xe0a91f, 0.5]); }
  for (const [lx, lz] of [[-84.5, 22], [-84.5, 53]]) lamp(c, lx, lz, Math.PI / 2, 0x2a2420, 0xffd27a, 1.0);
  c.lights.push({ x: A.x, z: A.z, col: 0xffd27a, y: 4 });
}

export function buildHQs(c, city) {
  for (let g = 0; g < 3; g++) fences(c, g, city);
  den(c, city); temple(c, city); palace(c, city);
}
