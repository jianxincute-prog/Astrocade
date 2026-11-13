// Themed building + block builders. Everything is baked into ctx.M (see geo.js); solid details register colliders.
//   Red Wolves  : warehouses with sawtooth roofs, smoking factories, fire-escape tenements, scrapyards, container yards
//   Blue Dragons: tiled-roof shophouses with lanterns and blade signs, night markets, koi gardens, neon towers
//   Golden Cobras: stepped art-deco towers with gold crowns, casinos with marquees and searchlights, palm boulevards
import { mulberry32, cellCenter, LOT } from '../logic/city.js';
import {
  cyl, cylXZ, sph, bx, dome, bar, tree, palm, bush, bamboo, planter, lamp, bench, bin, bollard, barrel, crate, tires, container,
  car, wreck, sign, blade, lantern, awning, banner, hydrant,
} from './props.js';

const FH = 3.4, BAY = 3.2;
const snap = (v, u) => Math.max(u * 2, Math.floor(v / u) * u);
const cl = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
const hex = (r, g, b) => (cl(r) << 16) | (cl(g) << 8) | cl(b);
const shade = (col, k) => { const r = ((col >> 16) & 255) * k, g = ((col >> 8) & 255) * k, b = (col & 255) * k; return hex(Math.min(1, r / 255), Math.min(1, g / 255), Math.min(1, b / 255)); };
const LIT = [0xd9a45a, 0xffb060, 0xffe0a0];   // warm window glow per gang (storefronts)

/** Textured facade shaft: windows are aligned to whole bays / floors. Returns the snapped size. */
function shaft(c, fkey, cx, cz, w0, d0, y0, floors, tint, rng, o = {}) {
  const w = snap(w0, BAY), d = snap(d0, BAY), h = floors * FH;
  const mat = c.facades[fkey];
  c.M.box(mat, cx, y0 + h / 2, cz, w, h, d, {
    color: tint, ku: 1 / (8 * BAY), kv: 1 / (8 * FH), uv0: [Math.floor(rng() * 8) / 8, Math.floor(rng() * 8) / 8],
    roofMat: o.roofMat || c.mats.roofTar, roofColor: o.roofColor ?? 0xbbbbbb,
  });
  return { w, d, h, top: y0 + h };
}

function parapet(c, cx, y, cz, w, d, col, h = 0.7, t = 0.5) {
  const m = c.mats.plain;
  c.M.box(m, cx, y + h / 2, cz - d / 2 + t / 2, w, h, t, { color: col }); c.M.box(m, cx, y + h / 2, cz + d / 2 - t / 2, w, h, t, { color: col });
  c.M.box(m, cx - w / 2 + t / 2, y + h / 2, cz, t, h, d - 2 * t, { color: col }); c.M.box(m, cx + w / 2 - t / 2, y + h / 2, cz, t, h, d - 2 * t, { color: col });
}

function roofClutter(c, cx, y, cz, w, d, rng, n = 3, tank = false) {
  for (let k = 0; k < n; k++) {
    const x = cx + (rng() - 0.5) * (w - 3), z = cz + (rng() - 0.5) * (d - 3);
    const t = rng();
    if (t < 0.5) { bx(c, c.mats.metal, x, y, z, 1.8 + rng(), 1.1, 1.4 + rng() * 0.6, 0x9aa0a4); cyl(c, c.mats.metal, x - 0.4, y + 1.1, z, 0.4, 0.15, 0x333333, 'cyl12'); }
    else if (t < 0.8) { cyl(c, c.mats.metal, x, y, z, 0.35, 1.4, 0x7a8086, 'cyl8'); sph(c, c.mats.metal, x, y + 1.5, z, 0.45, 0x7a8086, 0.6); }
    else bx(c, c.mats.plain, x, y, z, 1.4, 0.9, 1.4, 0x6a6e72);
  }
  if (tank) waterTank(c, cx + (rng() - 0.5) * (w - 5), y, cz + (rng() - 0.5) * (d - 5));
}

function waterTank(c, x, y, z) {
  for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) cyl(c, c.mats.metal, x + dx, y, z + dz, 0.07, 2.2, 0x3a3d40, 'cyl8');
  cyl(c, c.mats.wood, x, y + 2.2, z, 1.25, 2.0, 0x7a5a38, 'cyl12');
  c.M.geo(c.mats.plain, c.g.cone8, x, y + 4.6, z, 0, { sx: 1.45, sy: 0.9, sz: 1.45, color: 0x4a3a2c });
}

/** Storefront strip on the faces of building `b` that look at a street. */
function storefront(c, b, theme, rng, o = {}) {
  const gang = b.gang >= 0 ? b.gang : 0;
  const cell = b.cell ? [cellCenter(b.cell[0]), cellCenter(b.cell[1])] : null;
  const faces = [[0, 1, b.w], [0, -1, b.w], [1, 0, b.d], [-1, 0, b.d]];
  const awA = [[0x8a2a22, 0x2a2a2a], [0x9a2020, 0xe8d6a0], [0x1d1a14, 0xc59a3c]][gang];
  const awB = o.awn || awA;
  for (const [nx, nz, L] of faces) {
    const fx = b.x + nx * b.w / 2, fz = b.z + nz * b.d / 2;
    if (cell) {
      const edge = nx ? (fx - cell[0]) * nx : (fz - cell[1]) * nz;
      if (edge < LOT / 2 - 1.2) continue;        // faces an alley / the next lot
    }
    const t = [nz, -nx];
    const n = Math.max(1, Math.floor(L / 3.4)), bw = L / n, off = 0.05;
    const P = (s, y, oo = off) => [fx + t[0] * s + nx * oo, y, fz + t[1] * s + nz * oo];
    const doorBay = Math.floor(rng() * n);
    for (let k = 0; k < n; k++) {
      const s0 = -L / 2 + k * bw + 0.35, s1 = s0 + bw - 0.7;
      c.M.quad(c.mats.plain, P(s0 - 0.12, 0.3, 0.04), P(s1 + 0.12, 0.3, 0.04), P(s1 + 0.12, 3.15, 0.04), P(s0 - 0.12, 3.15, 0.04), [0, 0, 1, 1], 0x1a1a1c);
      if (k === doorBay) c.M.quad(c.mats.plain, P(s0, 0.32), P(s1, 0.32), P(s1, 2.7), P(s0, 2.7), [0, 0, 1, 1], 0x2a2420);
      else c.M.quad(c.mats.glow, P(s0, 0.7), P(s1, 0.7), P(s1, 2.9), P(s0, 2.9), [0, 0, 1, 1], shade(LIT[gang], 0.55 + rng() * 0.35));
      if (rng() < 0.9) awning(c, fx + t[0] * ((s0 + s1) / 2) + nx * 0.05, 3.4, fz + t[1] * ((s0 + s1) / 2) + nz * 0.05, nx, nz, (s1 - s0) + 0.3, 1.0, awB[k % 2], awB[(k + 1) % 2]);
    }
    c.M.box(c.mats.plain, fx + nx * 0.06, 3.65, fz + nz * 0.06, nx ? 0.2 : L, 0.5, nz ? 0.2 : L, { color: theme.trim ?? 0x3a3d40 });   // fascia
    if (o.signs && rng() < 0.75) {
      const name = o.signs[Math.floor(rng() * o.signs.length)];
      const rot = Math.atan2(nx, nz), mid = L * (rng() - 0.5) * 0.3;
      sign(c, name, fx + t[0] * mid + nx * 0.12, 4.15, fz + t[1] * mid + nz * 0.12, Math.min(4.4, L * 0.7), 1.1, rot);
    }
  }
}

// ------------------------------------------------------------------ Red Wolves
function warehouse(c, b, rng, o = {}) {
  const f = 1 + Math.floor((b.h - 2) / FH * 0.9), floors = Math.max(2, Math.min(4, f));
  const s = shaft(c, 'industrial', b.x, b.z, b.w, b.d, 0, floors, hex(0.95, 0.93, 0.9), rng, { roofMat: c.mats.corr, roofColor: 0xb0a8a0 });
  parapet(c, b.x, s.top, b.z, s.w, s.d, 0x4a4a48, 0.8);
  // sawtooth skylight roof
  const teeth = Math.max(2, Math.floor(s.d / 3.6));
  for (let k = 0; k < teeth; k++) {
    const z0 = b.z - s.d / 2 + 0.6 + (k * (s.d - 1.2)) / teeth, z1 = z0 + (s.d - 1.2) / teeth, y = s.top + 0.8, w2 = s.w / 2 - 0.6;
    c.M.quad(c.mats.corr, [b.x - w2, y, z0], [b.x + w2, y, z0], [b.x + w2, y + 1.4, z1], [b.x - w2, y + 1.4, z1], [0, 0, s.w * 0.2, 2], 0xa8a09a);
    c.M.quad(c.mats.glow, [b.x + w2, y, z0 + 0.01], [b.x - w2, y, z0 + 0.01], [b.x - w2, y + 1.4, z0 + 0.01], [b.x + w2, y + 1.4, z0 + 0.01], [0, 0, 1, 1], 0x3a5058);
  }
  roofClutter(c, b.x, s.top + 2.2, b.z, s.w, s.d, rng, 2, rng() < 0.4);
  // roller doors + dock on street faces
  const faces = [[0, 1, s.w], [0, -1, s.w], [1, 0, s.d], [-1, 0, s.d]];
  const cell = [cellCenter(b.cell[0]), cellCenter(b.cell[1])];
  for (const [nx, nz, L] of faces) {
    const fx = b.x + nx * s.w / 2 * (nx ? 1 : 0) + (nx ? 0 : 0) + (nx ? nx * (s.w / 2 - s.w / 2) : 0);
    const cx = nx ? b.x + nx * s.w / 2 : b.x, cz = nz ? b.z + nz * s.d / 2 : b.z;
    void fx;
    const edge = nx ? (cx - cell[0]) * nx : (cz - cell[1]) * nz;
    if (edge < LOT / 2 - 1.3) continue;
    const t = [nz, -nx], rot = Math.atan2(nx, nz);
    const doors = Math.max(1, Math.floor(L / 7));
    for (let k = 0; k < doors; k++) {
      const s0 = -L / 2 + (k + 0.5) * (L / doors);
      const P = (ss, y, oo) => [cx + t[0] * ss + nx * oo, y, cz + t[1] * ss + nz * oo];
      c.M.quad(c.mats.plain, P(s0 - 2.2, 0, 0.05), P(s0 + 2.2, 0, 0.05), P(s0 + 2.2, 4.4, 0.05), P(s0 - 2.2, 4.4, 0.05), [0, 0, 1, 1], 0x25272a);
      for (let r = 0; r < 7; r++) c.M.quad(c.mats.plain, P(s0 - 2.0, 0.4 + r * 0.55, 0.09), P(s0 + 2.0, 0.4 + r * 0.55, 0.09), P(s0 + 2.0, 0.78 + r * 0.55, 0.09), P(s0 - 2.0, 0.78 + r * 0.55, 0.09), [0, 0, 1, 1], r % 2 ? 0x5e6368 : 0x6f757a);
      c.M.quad(c.mats.glow, P(s0 - 2.2, 4.55, 0.08), P(s0 + 2.2, 4.55, 0.08), P(s0 + 2.2, 4.75, 0.08), P(s0 - 2.2, 4.75, 0.08), [0, 0, 1, 1], 0xffb02a);   // hazard strip
      c.M.box(c.mats.plain, cx + nx * 0.6, 0.45, cz + nz * 0.6, nx ? 1.0 : 5, 0.9, nz ? 1.0 : 5, { color: 0x6a6a68 });                                 // dock
      c.M.quad(c.mats.glow, P(s0 + 2.6, 5.0, 0.08), P(s0 + 3.6, 5.0, 0.08), P(s0 + 3.6, 5.5, 0.08), P(s0 + 2.6, 5.5, 0.08), [0, 0, 1, 1], 0xffd23a);
      void rot;
    }
    if (rng() < 0.6) sign(c, ['WELDING', 'GARAGE', 'SCRAP', 'WOLF'][Math.floor(rng() * 4)], cx + nx * 0.12 + t[0] * (L * 0.3), 6.2, cz + nz * 0.12 + t[1] * (L * 0.3), 5.2, 1.3, rot, 0.85);
  }
}

function smokeStack(c, x, y, z, h, rng) {
  cylXZ(c, c.mats.plain, x, y, z, 1.3, 0.85, h, 0xa86a50);
  for (let k = 0; k < 3; k++) cylXZ(c, c.mats.plain, x, y + h * (0.55 + k * 0.14), z, 0.95 - k * 0.04, 0.92 - k * 0.04, h * 0.07, k % 2 ? 0xe8e0d0 : 0xb8402a);
  cyl(c, c.mats.plain, x, y + h, z, 1.0, 0.4, 0x2a2420, 'cyl12');
  c.smoke.push([x, y + h + 0.3, z, rng() * 10]);
  c.M.geo(c.mats.glow, c.g.sph, x, y + h + 0.6, z, 0, { sx: 0.2, sy: 0.2, sz: 0.2, color: 0xff3a2a });   // beacon
}

function factory(c, b, rng) {
  const floors = 3 + Math.floor(rng() * 2);
  const s = shaft(c, 'industrial', b.x, b.z, b.w, b.d, 0, floors, hex(0.9, 0.86, 0.82), rng, { roofMat: c.mats.corr, roofColor: 0xb0a8a0 });
  parapet(c, b.x, s.top, b.z, s.w, s.d, 0x5a4a44, 0.9);
  smokeStack(c, b.x - s.w / 2 + 2.2, 0, b.z - s.d / 2 + 2.2, 24 + rng() * 6, rng);
  smokeStack(c, b.x - s.w / 2 + 2.2, 0, b.z + s.d / 2 - 2.2 - 3.2, 19 + rng() * 5, rng);
  // pipes + tank farm
  for (let k = 0; k < 3; k++) bar(c, c.mats.metal, b.x + s.w / 2, 2.5 + k * 1.2, b.z - s.d / 2 + 1, b.x + s.w / 2 + 0.8, 2.5 + k * 1.2, b.z + s.d / 2 - 1, 0.28, k % 2 ? 0x8a7a6a : 0x6a7a8a);
  const tx = b.x + s.w / 2 + 4, tz = b.z - 3;
  if (tx < cellCenter(b.cell[0]) + LOT / 2 - 3.2) { cylXZ(c, c.mats.metal, tx, 0, tz, 2.7, 2.7, 6.5, 0x9aa0a4, 'cyl16'); dome(c, c.mats.metal, tx, 6.5, tz, 2.7, 0x9aa0a4, 0.45); c.solid(tx, tz, 5.4, 5.4); }
  roofClutter(c, b.x, s.top + 0.9, b.z + 2, s.w - 4, s.d - 4, rng, 3, false);
  sign(c, 'THE DEN', b.x, s.top - 1.4, b.z + s.d / 2 + 0.12, 7.5, 1.9, 0, 0.7);
  c.M.box(c.mats.glow, b.x + s.w / 2 + 0.1, s.top - 0.3, b.z, 0.1, 0.3, s.d - 1, { color: 0xff3a2a, top: false });
  storefront(c, b, { trim: 0x3a3a3a }, rng, { signs: ['WELDING', 'GARAGE'] });
}

function fireEscape(c, cx, cz, nx, nz, floors, col = 0x2d2f31) {
  const t = [nz, -nx];
  for (let f = 1; f < floors; f++) {
    const y = f * FH;
    c.M.box(c.mats.metal, cx + nx * 0.7, y, cz + nz * 0.7, nx ? 1.4 : 2.8, 0.07, nz ? 1.4 : 2.8, { color: 0x5a5e62 });
    for (const s of [-1.4, 1.4]) bar(c, c.mats.metal, cx + nx * 1.4 + t[0] * s, y + 0.9, cz + nz * 1.4 + t[1] * s, cx + nx * 1.4 - t[0] * s * 0, y + 0.9, cz + nz * 1.4 - t[1] * s * 0, 0.06, col);
    bar(c, c.mats.metal, cx + nx * 1.4 - t[0] * 1.4, y + 0.9, cz + nz * 1.4 - t[1] * 1.4, cx + nx * 1.4 + t[0] * 1.4, y + 0.9, cz + nz * 1.4 + t[1] * 1.4, 0.07, col);
    const sx = (f % 2 ? 1 : -1) * 1.0;
    bar(c, c.mats.metal, cx + nx * 0.9 + t[0] * sx, y, cz + nz * 0.9 + t[1] * sx, cx + nx * 0.9 + t[0] * -sx, y - FH, cz + nz * 0.9 + t[1] * -sx, 0.14, col);   // stair
  }
}

function tenement(c, b, rng) {
  const floors = Math.max(4, Math.round(b.h / FH)), tint = hex(0.85 + rng() * 0.2, 0.82 + rng() * 0.15, 0.8 + rng() * 0.15);
  const s0 = 4.2;
  const s = shaft(c, 'brick', b.x, b.z, b.w, b.d, s0, floors - 1, tint, rng, { roofMat: c.mats.tar });
  c.M.box(c.mats.plain, b.x, s0 / 2, b.z, s.w + 0.1, s0, s.d + 0.1, { color: hex(0.4, 0.38, 0.36), roofMat: c.mats.plain });   // dark podium
  parapet(c, b.x, s.top, b.z, s.w, s.d, 0xc9bfae, 0.9, 0.6);
  c.M.box(c.mats.plain, b.x, s.top + 0.08, b.z, s.w + 0.5, 0.35, s.d + 0.5, { color: 0xd6cdbf });      // cornice
  roofClutter(c, b.x, s.top + 0.5, b.z, s.w, s.d, rng, 3, true);
  const side = [[0, 1], [0, -1], [1, 0], [-1, 0]][Math.floor(rng() * 4)];
  fireEscape(c, b.x + side[0] * s.w / 2, b.z + side[1] * s.d / 2, side[0], side[1], floors);
  storefront(c, { ...b, w: s.w, d: s.d }, { trim: 0x2a2a2a }, rng, { signs: ['BAR', 'PAWN', 'PIZZA', 'TATTOO', 'LIQUOR', 'DINER', 'OPEN 24H'] });
  // AC units hanging on the facade
  for (let k = 0; k < 3; k++) { const y = s0 + 1 + Math.floor(rng() * (floors - 2)) * FH, sd = rng() < 0.5 ? 1 : -1; bx(c, c.mats.metal, b.x + (rng() - 0.5) * (s.w - 3), y, b.z + sd * (s.d / 2 + 0.3), 0.9, 0.6, 0.6, 0xbfc4c8); }
  // gang colours: neon blade + graffiti
  if (rng() < 0.7) blade(c, 'WOLF', b.x + s.w / 2 + 0.9 * 0, s0 + 3, b.z + s.d / 2 + 0.6, 1.9, 1.0, Math.PI / 2);
}

function scrapyard(c, p, rng) {
  const { x, z } = p, S = 11.4;
  c.pads.push({ x, z, w: S * 2, d: S * 2, mat: 'gravel' });
  // low fence with gaps (collision on the long runs)
  for (const [sx, sz, horiz] of [[0, -S, true], [0, S, true], [-S, 0, false], [S, 0, false]]) {
    for (const part of [-1, 1]) {
      const w = horiz ? S * 0.5 : 0.3, d = horiz ? 0.3 : S * 0.5;
      const fx = x + sx + (horiz ? part * S * 0.5 : 0), fz = z + sz + (horiz ? 0 : part * S * 0.5);
      c.M.box(c.mats.glass, fx, 1.5, fz, horiz ? S : 0.12, 2.2, horiz ? 0.12 : S, { color: 0x9aa4ac, top: false });
      c.M.box(c.mats.plain, fx, 0.3, fz, horiz ? S : 0.4, 0.6, horiz ? 0.4 : S, { color: 0x7a7670 });
      c.M.box(c.mats.metal, fx, 2.7, fz, horiz ? S : 0.16, 0.14, horiz ? 0.16 : S, { color: 0x30323a });
      for (let k = 0; k <= 3; k++) cyl(c, c.mats.metal, fx + (horiz ? -S / 2 + (k * S) / 3 : 0), 0, fz + (horiz ? 0 : -S / 2 + (k * S) / 3), 0.1, 2.8, 0x30323a, 'cyl8');
      void w; void d;
      c.solid(fx, fz, horiz ? S : 0.4, horiz ? 0.4 : S);
    }
  }
  // junk-car piles
  for (let k = 0; k < 4; k++) {
    const px = x + (rng() - 0.5) * 14, pz = z + (rng() - 0.5) * 14, hgt = 2 + Math.floor(rng() * 3);
    for (let l = 0; l < hgt; l++) wreck(c, px + (rng() - 0.5) * 0.6, l * 0.95, pz + (rng() - 0.5) * 0.6, rng() * 3, [0x6a3a2a, 0x4a5058, 0x7a6a3a, 0x3a4a5a][Math.floor(rng() * 4)]);
    c.solid(px, pz, 2.4, 4.6);
  }
  tires(c, x + 6, z + 8, 6); tires(c, x - 8, z - 7, 4);
  for (let k = 0; k < 3; k++) barrel(c, x + (rng() - 0.5) * 18, z + (rng() - 0.5) * 18, [0x7a3a2a, 0x3a5a7a, 0x5a5a3a][k]);
  // gantry crane
  const gx = x - 5, gz = z + 3;
  for (const dx of [-3, 3]) cyl(c, c.mats.metal, gx + dx, 0, gz, 0.25, 9, 0xd9a02a, 'cyl8');
  bx(c, c.mats.metal, gx, 9, gz, 7.5, 0.6, 0.8, 0xd9a02a);
  bar(c, c.mats.metal, gx, 8.9, gz, gx, 5.5, gz, 0.07, 0x222222); bx(c, c.mats.metal, gx, 4.9, gz, 1.4, 0.5, 1.0, 0x333333);
  c.solid(gx - 3, gz, 0.7, 0.7); c.solid(gx + 3, gz, 0.7, 0.7);
  // office shack
  bx(c, c.mats.plain, x + 5, 0, z - 6, 4.6, 2.8, 3.2, 0x7a6a50); bx(c, c.mats.metal, x + 5, 2.8, z - 6, 5, 0.25, 3.6, 0x4a4e52);
  c.M.box(c.mats.glow, x + 5, 1.6, z - 4.38, 1.4, 0.8, 0.05, { color: 0xffb04a, top: false }); c.solid(x + 5, z - 6, 4.6, 3.2);
  sign(c, 'SCRAP', x, 3.2, z + S - 0.2, 5, 1.25, 0, 0.85);
  c.lights.push({ x: x - 8, z: z + 8, col: 0xffa040, y: 3 });
}

function containers(c, p, rng) {
  const { x, z } = p;
  c.pads.push({ x, z, w: 24, d: 24, mat: 'gravel' });
  const cols = [0xa8402a, 0x2e5a8a, 0x5a7a3a, 0xc9a02a, 0x6a6a6e, 0x8a3a5a, 0xd9d2c0];
  for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
    if (r === 1 && q === 1) continue;           // open lane in the middle
    const cx = x - 8 + q * 8, cz = z - 8 + r * 8, stack = 1 + Math.floor(rng() * 3), rot = rng() < 0.5 ? 0 : Math.PI / 2;
    for (let l = 0; l < stack; l++) container(c, cx, cz, rot, cols[Math.floor(rng() * cols.length)], l * 2.6, l === 0);
  }
  // gantry crane + light tower
  for (const dx of [-11, 11]) cyl(c, c.mats.metal, x + dx, 0, z - 12, 0.3, 10, 0xd9a02a, 'cyl8');
  bx(c, c.mats.metal, x, 10, z - 12, 23, 0.7, 0.9, 0xd9a02a);
  cyl(c, c.mats.metal, x + 11, 0, z + 11, 0.15, 8, 0x3a3d40, 'cyl8'); bx(c, c.mats.glow, x + 11, 8, z + 11, 1.6, 0.5, 0.5, 0xfff1c9);
  c.solid(x - 11, z - 12, 0.7, 0.7); c.solid(x + 11, z - 12, 0.7, 0.7);
  c.lights.push({ x: x + 11, z: z + 11, col: 0xfff1c9, y: 8 });
}

function lot(c, p, rng) {
  const { x, z } = p;
  c.pads.push({ x, z, w: 24, d: 24, mat: 'gravel' });
  // a fenced hangout lot: bonfire barrels, pallets, junk sofa, graffiti wall, muscle car
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4; barrel(c, x + Math.cos(a) * 1.2, z + Math.sin(a) * 1.2, 0x5a3a24, { solid: false }); c.fires.push([x + Math.cos(a) * 1.2, 1.15, z + Math.sin(a) * 1.2, rng() * 6]); }
  c.solid(x, z, 3.4, 3.4);
  for (let k = 0; k < 5; k++) crate(c, x + (rng() - 0.5) * 18, z + (rng() - 0.5) * 18, 0.9 + rng() * 0.6, 0x8a6a40, 0, rng() * 3);
  car(c, x + 7, z - 6, 0.5, 0x8a1c1c);
  bx(c, c.mats.plain, x - 6, 0, z + 8, 2.4, 0.9, 1.0, 0x6a3a4a); c.solid(x - 6, z + 8, 2.4, 1);
  for (const side of [-1, 1]) {
    c.M.box(c.mats.plain, x + side * 11.6, 1.8, z, 0.5, 3.6, 22, { color: 0x6a6460 });
    c.solid(x + side * 11.6, z, 0.6, 22);
  }
  c.M.box(c.mats.plain, x, 1.8, z - 11.6, 22, 3.6, 0.5, { color: 0x6a6460 }); c.solid(x, z - 11.6, 22, 0.6);
  sign(c, 'WOLF', x, 2.4, z - 11.3, 6, 1.5, Math.PI, 1.0);
  c.lights.push({ x, z, col: 0xff8a2a, y: 1.5 });
}

// ------------------------------------------------------------------ Blue Dragons
const LANT = [0xff3a2a, 0xff8a2a, 0x3a8aff, 0xffd23a];

function pagodaRoof(c, cx, y, cz, w, d, h, over = 1.0, col = 0xffffff) {
  c.M.hipRoof(c.mats.tiles, cx, y, cz, w, d, h, over, { ridge: 0.12, tip: -0.0, color: col });
  // gold ridge cap + upturned eave tips
  c.M.box(c.mats.plain, cx, y + h + 0.1, cz, w * 0.24 + 0.4, 0.35, d * 0.24 + 0.4, { color: 0xc9a14a });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.M.geo(c.mats.plain, c.g.cone8, cx + sx * (w / 2 + over), y + 0.35, cz + sz * (d / 2 + over), 0, { sx: 0.12, sy: 0.5, sz: 0.12, color: 0xc9a14a });
}

function shophouse(c, b, rng) {
  const floors = Math.max(3, Math.min(5, Math.round(b.h / FH)));
  const tint = [hex(0.95, 1.0, 1.05), hex(1.1, 0.98, 0.9), hex(0.9, 0.95, 0.9), hex(1.05, 0.85, 0.85)][Math.floor(rng() * 4)];
  const s0 = 4.2, w = snap(b.w, 3.2), d = snap(b.d, 3.2);
  const s = shaft(c, 'shop', b.x, b.z, w, d, s0, floors - 1, tint, rng, { roofMat: c.mats.tiles });
  c.M.box(c.mats.plain, b.x, s0 / 2, b.z, s.w + 0.1, s0, s.d + 0.1, { color: 0x6a1a1a, roofMat: c.mats.plain });       // red lacquer ground floor
  // balcony ledges + gold rail on the street faces
  const cell = [cellCenter(b.cell[0]), cellCenter(b.cell[1])];
  for (const [nx, nz] of [[0, 1], [0, -1]]) {
    const fz = b.z + nz * s.d / 2, edge = (fz - cell[1]) * nz;
    if (edge < LOT / 2 - 1.5) continue;
    for (let f = 1; f < floors; f += 2) {
      const y = s0 + (f - 1) * FH;
      c.M.box(c.mats.plain, b.x, y + 0.1, fz + nz * 0.55, s.w, 0.2, 1.1, { color: 0x6a1a1a });
      c.M.box(c.mats.plain, b.x, y + 0.75, fz + nz * 1.05, s.w, 0.1, 0.1, { color: 0xc9a14a });
      for (let k = 0; k < s.w / 0.9; k++) c.M.box(c.mats.plain, b.x - s.w / 2 + 0.45 + k * 0.9, y + 0.5, fz + nz * 1.05, 0.08, 0.6, 0.08, { color: 0x8a2020 });
      // lanterns hanging from the balcony
      for (let k = 0; k < 2; k++) lantern(c, b.x - s.w / 4 + k * s.w / 2, y + 0.2, fz + nz * 1.2, LANT[(k + f + Math.floor(rng() * 4)) % 4], 0.3);
    }
  }
  pagodaRoof(c, b.x, s.top, b.z, s.w, s.d, 2.6 + rng() * 0.8, 1.0);
  // storefront with blade sign
  storefront(c, { ...b, w: s.w, d: s.d }, { trim: 0x6a1a1a }, rng, { signs: ['NOODLES', 'TEA HOUSE', 'DIM SUM', 'HERBS', 'SUSHI', 'BAKERY'], awn: [[0xc42a22, 0xe8d6a0], [0x2e5a8a, 0xe8d6a0], [0xc42a22, 0x2a2a2a]][Math.floor(rng() * 3)] });
  const side = b.row ? 1 : -1, fz = b.z + side * (s.d / 2 + 0.3);
  if (rng() < 0.7) blade(c, ['NOODLES', 'TEA HOUSE', 'DIM SUM', 'DRAGON'][Math.floor(rng() * 4)], b.x + s.w / 2 - 0.5, s0 + 1.8, fz + side * 0.9, 1.6, 1.0, Math.PI / 2);
}

function neonTower(c, b, rng, theme) {
  const floors = Math.max(8, Math.round(b.h / FH));
  const w = snap(b.w, 3.2), d = snap(b.d, 3.2), pw = w + 2.4, pd = d + 2.4;
  // podium (2 floors, shops) + glass tower + crown
  const pod = shaft(c, theme === 2 ? 'deco' : 'glass', b.x, b.z, Math.min(pw, LOT - 0.5), Math.min(pd, LOT - 0.5), 0, 2, hex(0.95, 0.95, 1), rng, { roofMat: c.mats.tar });
  const s = shaft(c, 'glass', b.x, b.z, w, d, pod.top, floors - 2, hex(0.9, 1.0, 1.1), rng, { roofMat: c.mats.tar });
  parapet(c, b.x, s.top, b.z, s.w, s.d, 0x30363c, 1.1, 0.6);
  const neon = [0x3aa8ff, 0xff3a8a, 0x3affc8][Math.floor(rng() * 3)];
  for (const k of [0.45, 0.8]) for (const sd of [-1, 1]) { c.M.box(c.mats.glow, b.x, pod.top + (s.top - pod.top) * k, b.z + sd * (s.d / 2 + 0.06), s.w + 0.1, 0.3, 0.1, { color: neon, top: false }); }
  cyl(c, c.mats.metal, b.x, s.top, b.z, 0.12, 9, 0xb0b4b8, 'cyl8'); c.M.geo(c.mats.glow, c.g.sph, b.x, s.top + 9.1, b.z, 0, { sx: 0.25, sy: 0.25, sz: 0.25, color: 0xff2a2a });
  roofClutter(c, b.x, s.top + 1.1, b.z, s.w - 2, s.d - 2, rng, 2, false);
  sign(c, theme === 1 ? 'DRAGON' : 'HOTEL', b.x, s.top - 3.2, b.z + s.d / 2 + 0.14, Math.min(s.w - 1, 8), 2.0, 0);
  storefront(c, { ...b, w: pod.w, d: pod.d }, { trim: 0x2a2a30 }, rng, { signs: ['ARCADE', 'KARAOKE', 'BANK', 'CINEMA'] });
}

function market(c, p, rng) {
  const { x, z } = p;
  c.pads.push({ x, z, w: 24, d: 24, mat: 'dragons' });
  // stalls in two rows with striped canopies, lantern strings overhead
  const cols = [[0xc42a22, 0xf0e0b0], [0x2e5a8a, 0xf0e0b0], [0xd9a02a, 0x8a2a22], [0x3a8a5a, 0xf0e0b0]];
  for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
    const sx = x - 8.4 + k * 5.6, sz = z + (r ? 5.4 : -5.4), cc = cols[(k + r) % 4];
    for (const dx of [-1.2, 1.2]) for (const dz of [-1, 1]) cyl(c, c.mats.wood, sx + dx, 0, sz + dz, 0.06, 2.6, 0x5a3a24, 'cyl8');
    bx(c, c.mats.plain, sx, 0, sz + (r ? 0.6 : -0.6), 2.4, 1.0, 0.9, 0x6a4a30);                      // counter
    for (let q = 0; q < 6; q++) c.M.quad(c.mats.plainDS, [sx - 1.45 + q * 0.483, 2.75, sz - 1.4], [sx - 1.45 + (q + 1) * 0.483, 2.75, sz - 1.4], [sx - 1.45 + (q + 1) * 0.483, 2.45, sz + 1.4], [sx - 1.45 + q * 0.483, 2.45, sz + 1.4], [0, 0, 1, 1], q % 2 ? cc[0] : cc[1]);
    for (let g = 0; g < 4; g++) crate(c, sx - 0.9 + g * 0.6, sz + (r ? 0.6 : -0.6), 0.34, [0xd9a02a, 0xc42a22, 0x6a9a3a, 0xe8c070][g], 1.0);
    lantern(c, sx, 2.2, sz, LANT[(k + r) % 4], 0.22);
    c.solid(sx, sz, 3, 3);
  }
  // overhead lantern strings between poles
  for (const dx of [-11, 11]) cyl(c, c.mats.wood, x + dx, 0, z, 0.1, 5.2, 0x4a3020, 'cyl8');
  for (let k = 0; k < 3; k++) { const zz = z - 8 + k * 8; for (let q = 0; q <= 8; q++) { const t = q / 8; lantern(c, x - 11 + 22 * t, 5.0 - Math.sin(t * Math.PI) * 0.8, zz, LANT[(q + k) % 4], 0.3); } }
  // dragon gate at the entrance
  const gz = z + 11.6;
  for (const dx of [-4, 4]) { cyl(c, c.mats.plain, x + dx, 0, gz, 0.35, 6, 0xa82020, 'cyl12'); c.solid(x + dx, gz, 0.8, 0.8); }
  bx(c, c.mats.plain, x, 6, gz, 10.5, 0.6, 0.9, 0x8a1c1c); bx(c, c.mats.plain, x, 6.6, gz, 12, 0.35, 1.3, 0xc9a14a);
  c.M.hipRoof(c.mats.tiles, x, 6.95, gz, 9, 0.8, 1.4, 1.4, { ridge: 0.1, color: 0xffffff });
  sign(c, 'DRAGON', x, 5.2, gz + 0.5, 4.2, 1.0, 0, 1);
  c.lights.push({ x, z, col: 0xff9a4a, y: 4 });
}

function garden(c, p, rng) {
  const { x, z } = p;
  c.pads.push({ x, z, w: 24, d: 24, mat: 'grass' });
  // koi pond + arched bridge + pavilion + cherry trees + stone lanterns
  c.M.box(c.mats.water, x, 0.28, z, 11, 0.06, 7, { color: 0xffffff, top: true, roofMat: c.mats.water });
  c.M.box(c.mats.plain, x, 0.14, z, 12, 0.24, 8, { color: 0x6a6e70 });          // stone rim
  c.M.box(c.mats.water, x, 0.31, z, 11, 0.04, 7, { top: true });
  for (let k = 0; k < 5; k++) { const a = rng() * 6.28, r = 1 + rng() * 3; c.M.geo(c.mats.glow, c.g.sph, x + Math.cos(a) * r, 0.34, z + Math.sin(a) * r * 0.6, 0, { sx: 0.3, sy: 0.04, sz: 0.14, color: [0xff7a2a, 0xffffff, 0xff4a3a][k % 3] }); }
  for (let k = 0; k < 7; k++) { const t = k / 6, bxp = x - 3.5 + 7 * t; c.M.box(c.mats.wood, bxp, 0.45 + Math.sin(t * Math.PI) * 0.7, z, 1.2, 0.18, 1.8, { color: 0x8a2a22 }); }
  c.solid(x, z, 12, 8);
  // pavilion
  const px = x + 7, pz = z - 7;
  for (const dx of [-1.6, 1.6]) for (const dz of [-1.6, 1.6]) { cyl(c, c.mats.plain, px + dx, 0, pz + dz, 0.2, 3.4, 0x9a2020, 'cyl12'); }
  c.solid(px, pz, 3.6, 3.6);
  pagodaRoof(c, px, 3.4, pz, 3.6, 3.6, 1.8, 0.9);
  lantern(c, px, 3.0, pz, 0xff8a2a, 0.3);
  for (let k = 0; k < 6; k++) tree(c, x + (rng() - 0.5) * 20, z + (rng() < 0.5 ? -1 : 1) * (8 + rng() * 2.5), 0.85 + rng() * 0.5, 'cherry');
  for (let k = 0; k < 3; k++) bamboo(c, x - 10.5 + k * 0.4, z + 9 - k * 2);
  for (const [lx, lz] of [[-6, 6], [6, 6], [-9, -2], [9, 1]]) { bx(c, c.mats.plain, x + lx, 0, z + lz, 0.5, 0.5, 0.5, 0x8a8e90); bx(c, c.mats.plain, x + lx, 0.5, z + lz, 0.3, 0.9, 0.3, 0x8a8e90); c.M.box(c.mats.glow, x + lx, 1.6, z + lz, 0.34, 0.3, 0.34, { color: 0xffb04a }); bx(c, c.mats.plain, x + lx, 1.8, z + lz, 0.7, 0.18, 0.7, 0x6a6e70); c.solid(x + lx, z + lz, 0.6, 0.6); }
  for (let k = 0; k < 4; k++) bush(c, x + (rng() - 0.5) * 20, z + (rng() - 0.5) * 20, 1 + rng() * 0.6, 0x4a8a3a);
}

// ------------------------------------------------------------------ Golden Cobras
function deco(c, b, rng) {
  const floors = Math.max(9, Math.round(b.h / FH)), tint = hex(1.0, 0.98, 0.94);
  const w0 = snap(b.w, 3.2), d0 = snap(b.d, 3.2);
  // three setback tiers
  const tiers = [[1, 0.45], [0.8, 0.3], [0.6, 0.25]];
  let y = 0, left = floors;
  tiers.forEach(([k, share], i) => {
    const f = i === 2 ? left : Math.max(2, Math.round(floors * share)); left -= f;
    const w = snap(w0 * k, 3.2), d = snap(d0 * k, 3.2);
    const s = shaft(c, 'deco', b.x, b.z, w, d, y, f, tint, rng, { roofMat: c.mats.plain, roofColor: 0xc9b98a });
    // gold cornice + corner fins
    c.M.box(c.mats.metal, b.x, s.top + 0.3, b.z, s.w + 0.7, 0.6, s.d + 0.7, { color: 0xc59a3c });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.M.box(c.mats.metal, b.x + sx * (s.w / 2 + 0.05), y + s.h / 2, b.z + sz * (s.d / 2 + 0.05), 0.5, s.h, 0.5, { color: 0xd8ae48 });
    c.M.box(c.mats.glow, b.x, s.top + 0.62, b.z, s.w + 0.3, 0.12, s.d + 0.3, { color: 0xffd27a, top: false });
    y = s.top + 0.6;
    if (i === 0) {
      // ground floor: gold-framed lobby + canopy
      c.M.box(c.mats.plain, b.x, 2.2, b.z, s.w + 0.2, 4.4, s.d + 0.2, { color: 0xd9ceb4, roofMat: c.mats.plain });
      storefront(c, { ...b, w: s.w, d: s.d }, { trim: 0xc59a3c }, rng, { signs: ['HOTEL', 'BANK', 'STEAKS', 'CLUB', 'GOLD'] });
    }
  });
  // crown: gold pyramid + spire
  c.M.hipRoof(c.mats.gold, b.x, y, b.z, snap(w0 * 0.6, 3.2) - 1.2, snap(d0 * 0.6, 3.2) - 1.2, 4.2, 0.3, { ridge: 0.1, color: 0xffffff });
  cyl(c, c.mats.metal, b.x, y + 4.2, b.z, 0.14, 8, 0xe8c060, 'cyl8');
  c.M.geo(c.mats.glow, c.g.sph, b.x, y + 12.4, b.z, 0, { sx: 0.3, sy: 0.3, sz: 0.3, color: 0xfff0b0 });
  c.beams.push([b.x, y + 12.4, b.z, rng() * 6, 0xffe9a0]);
  const names = ['HOTEL', 'GOLD', 'COBRA', 'CASINO'];
  sign(c, names[Math.floor(rng() * names.length)], b.x, y - 6.2, b.z + snap(w0 * 0.6, 3.2) / 2 + 0.2, 6.5, 1.6, 0);
}

function casino(c, b, rng) {
  const floors = Math.max(3, Math.round(b.h / FH));
  const s = shaft(c, 'deco', b.x, b.z, b.w, b.d, 0, floors, hex(1.05, 1, 0.92), rng, { roofMat: c.mats.plain, roofColor: 0xc9b98a });
  c.M.box(c.mats.metal, b.x, s.top + 0.35, b.z, s.w + 0.9, 0.7, s.d + 0.9, { color: 0xc59a3c });
  c.M.box(c.mats.glow, b.x, s.top + 0.75, b.z, s.w + 0.6, 0.14, s.d + 0.6, { color: 0xff3a5a, top: false });
  // gold dome
  dome(c, c.mats.gold, b.x, s.top + 0.7, b.z, Math.min(s.w, s.d) * 0.3, 0xffffff, 0.7);
  cyl(c, c.mats.metal, b.x, s.top + 0.7 + Math.min(s.w, s.d) * 0.21, b.z, 0.12, 4, 0xe8c060, 'cyl8');
  c.beams.push([b.x, s.top + 6, b.z, rng() * 6, 0xffe9a0]); c.beams.push([b.x + 5, s.top + 1.5, b.z, rng() * 6, 0xff9ad0]);
  // marquee on the street faces: big sign, bulbs, columns, red carpet
  const cell = [cellCenter(b.cell[0]), cellCenter(b.cell[1])];
  for (const [nx, nz, L] of [[0, 1, s.w], [0, -1, s.w], [1, 0, s.d], [-1, 0, s.d]]) {
    const fx = nx ? b.x + nx * s.w / 2 : b.x, fz = nz ? b.z + nz * s.d / 2 : b.z;
    const edge = nx ? (fx - cell[0]) * nx : (fz - cell[1]) * nz;
    if (edge < LOT / 2 - 1.5) continue;
    const t = [nz, -nx], rot = Math.atan2(nx, nz);
    sign(c, rng() < 0.5 ? 'CASINO' : 'LUCKY 7', fx + nx * 0.2, 6.6, fz + nz * 0.2, Math.min(L * 0.7, 9), 2.4, rot);
    for (let q = 0; q < 14; q++) { const ss = -4.5 + q * (9 / 13); c.M.box(c.mats.glow, fx + t[0] * ss + nx * 0.24, 8.0 + 0.05, fz + t[1] * ss + nz * 0.24, 0.22, 0.22, 0.22, { color: q % 2 ? 0xffe9a0 : 0xff5a6a }); }
    for (const ss of [-2.4, 2.4]) { cyl(c, c.mats.metal, fx + t[0] * ss + nx * 1.6, 0, fz + t[1] * ss + nz * 1.6, 0.3, 4.2, 0xd8ae48, 'cyl12'); c.solid(fx + t[0] * ss + nx * 1.6, fz + t[1] * ss + nz * 1.6, 0.8, 0.8); }
    c.M.box(c.mats.plain, fx + nx * 1.6, 4.3, fz + nz * 1.6, nx ? 1.6 : 6, 0.3, nz ? 1.6 : 6, { color: 0xd8ae48 });
    c.M.quad(c.mats.plain, [fx + t[0] * 1.3 + nx * 0.2, 0.3, fz + t[1] * 1.3 + nz * 0.2], [fx - t[0] * 1.3 + nx * 0.2, 0.3, fz - t[1] * 1.3 + nz * 0.2], [fx - t[0] * 1.3 + nx * 3.4, 0.3, fz - t[1] * 1.3 + nz * 3.4], [fx + t[0] * 1.3 + nx * 3.4, 0.3, fz + t[1] * 1.3 + nz * 3.4], [0, 0, 1, 1], 0xa01824);
  }
  storefront(c, { ...b, w: s.w, d: s.d }, { trim: 0xc59a3c }, rng, { signs: ['BAR', 'CLUB', 'STEAKS', 'GOLD'] });
  // luxury cars at the kerb
  car(c, b.x + s.w / 2 + 3.4, b.z - 4, 0, rng() < 0.5 ? 0x111111 : 0xe8e0c8, { len: 5.0 });
}

function hotel(c, b, rng) {
  const floors = Math.max(7, Math.round(b.h / FH)), w = snap(b.w, 3.2), d = snap(b.d, 3.2);
  const s = shaft(c, 'deco', b.x, b.z, w, d, 0, floors, hex(1.0, 0.97, 0.9), rng, { roofMat: c.mats.plain, roofColor: 0xc9b98a });
  c.M.box(c.mats.metal, b.x, s.top + 0.4, b.z, s.w + 0.8, 0.8, s.d + 0.8, { color: 0xc59a3c });
  for (const sd of [-1, 1]) c.M.box(c.mats.metal, b.x + sd * (s.w / 2 + 0.05), s.h / 2, b.z, 0.5, s.h, s.d, { color: 0xd8ae48 });
  c.M.box(c.mats.glow, b.x, s.top + 1.0, b.z, s.w - 1, 0.5, s.d - 1, { color: 0xffd27a });
  sign(c, 'HOTEL', b.x, s.top + 2.3, b.z + s.d / 2 - 0.3, 6.5, 1.9, 0);
  storefront(c, { ...b, w: s.w, d: s.d }, { trim: 0xc59a3c }, rng, { signs: ['BAR', 'GOLD', 'STEAKS'] });
  roofClutter(c, b.x, s.top + 1.0, b.z, s.w - 4, s.d - 4, rng, 2, false);
}

function shopBox(c, b, rng) {
  const s = shaft(c, 'deco', b.x, b.z, b.w, b.d, 0, 2, hex(1, 0.96, 0.88), rng, { roofMat: c.mats.tar });
  c.M.box(c.mats.metal, b.x, s.top + 0.25, b.z, s.w + 0.5, 0.5, s.d + 0.5, { color: 0xc59a3c });
  storefront(c, { ...b, w: s.w, d: s.d }, { trim: 0xc59a3c }, rng, { signs: ['BAR', 'GOLD', 'CLUB'] });
}

function boulevard(c, p, rng) {
  const { x, z } = p;
  c.pads.push({ x, z, w: 24, d: 24, mat: 'cobras' });
  // central fountain with a golden cobra statue, palms around, benches and gold bollards
  cylXZ(c, c.mats.plain, x, 0, z, 5.4, 5.4, 0.9, 0xd9ceb4, 'cyl16');
  c.M.geo(c.mats.water, new c.T.CylinderGeometry(4.7, 4.7, 0.05, 24), x, 0.95, z, 0, {});
  cylXZ(c, c.mats.metal, x, 0.9, z, 1.1, 0.5, 2.4, 0xd8ae48);
  sph(c, c.mats.metal, x, 3.6, z, 0.8, 0xd8ae48, 0.9);
  c.M.geo(c.mats.metal, new c.T.TorusGeometry(0.9, 0.2, 6, 12), x, 2.6, z, 0, { rx: Math.PI / 2, color: 0xd8ae48 });
  c.solid(x, z, 10.8, 10.8);
  c.sprays.push([x, 1.0, z]);
  for (const [dx, dz] of [[-9, -9], [9, -9], [-9, 9], [9, 9], [0, -10], [0, 10], [-10, 0], [10, 0]]) palm(c, x + dx, z + dz, 1.1 + rng() * 0.3);
  for (const [dx, dz, r] of [[-7, 0, Math.PI / 2], [7, 0, -Math.PI / 2], [0, -7, 0], [0, 7, Math.PI]]) bench(c, x + dx, z + dz, r, 0x2a2420);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.28; bollard(c, x + Math.cos(a) * 6.6, z + Math.sin(a) * 6.6, 0xd8ae48, 0xffd27a); }
  c.lights.push({ x, z, col: 0xffd27a, y: 3 });
}

// ------------------------------------------------------------------ entry points
const BUILDERS = {
  warehouse, factory, tenement, shophouse, deco, casino, hotel, shop: shopBox,
  tower: (c, b, rng) => neonTower(c, b, rng, 1),
};
const OPEN = { scrapyard, containers, lot, market, garden, boulevard };

export function buildBuilding(c, b) {
  const rng = mulberry32(b.seed || 1);
  const fn = BUILDERS[b.kind];
  if (fn) fn(c, b, rng);
}

export function buildOpenBlock(c, p) {
  const rng = mulberry32((p.i * 31 + p.j * 17 + 5) * 977);
  const fn = OPEN[p.kind];
  if (fn) fn(c, p, rng);
}

export { tree, palm, lamp, hydrant, bin, car };
