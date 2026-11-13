// Reusable street / yard props. Every function bakes geometry into ctx.M (the Mesher) and, when the prop is solid,
// registers a collision box with ctx.solid(). Colours are 0xRRGGBB vertex colours on the shared materials.
//
// ctx = { T, M, mats, g (shared geometries), rnd, solid(x,z,w,d), anim: [] }

export function makeGeos(T) {
  return {
    box: new T.BoxGeometry(1, 1, 1),
    cyl8: new T.CylinderGeometry(1, 1, 1, 8),
    cyl12: new T.CylinderGeometry(1, 1, 1, 12),
    cyl16: new T.CylinderGeometry(1, 1, 1, 16),
    cone8: new T.ConeGeometry(1, 1, 8),
    ico: new T.IcosahedronGeometry(1, 0),
    ico1: new T.IcosahedronGeometry(1, 1),
    sph: new T.SphereGeometry(1, 10, 8),
    dome: new T.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    torus: new T.TorusGeometry(1, 0.12, 6, 18),
  };
}

const scaled = (g, sx, sy, sz) => ({ sx, sy, sz });

/** cylinder / cone / sphere / box helpers with explicit world-size parameters */
export const cyl = (c, mat, x, y, z, r, h, col = 0xffffff, seg = 'cyl8') => c.M.geo(mat, c.g[seg], x, y + h / 2, z, 0, { ...scaled(0, r, h, r), color: col });
export const cylXZ = (c, mat, x, y, z, r1, r2, h, col = 0xffffff) => {  // tapered cylinder (own geometry, cached by size)
  const key = `t${r1.toFixed(2)}_${r2.toFixed(2)}`;
  c.cache = c.cache || {};
  const g = c.cache[key] || (c.cache[key] = new c.T.CylinderGeometry(r2, r1, 1, 10));
  c.M.geo(mat, g, x, y + h / 2, z, 0, { sy: h, color: col });
};
export const sph = (c, mat, x, y, z, r, col = 0xffffff, sy = 1) => c.M.geo(mat, c.g.sph, x, y, z, 0, { sx: r, sy: r * sy, sz: r, color: col, noShadow: false });
export const bx = (c, mat, x, y, z, w, h, d, col = 0xffffff, rot = 0, o = {}) => c.M.box(mat, x, y + h / 2, z, w, h, d, { color: col, rotY: rot, ...o });
export const dome = (c, mat, x, y, z, r, col, sy = 1) => c.M.geo(mat, c.g.dome, x, y, z, 0, { sx: r, sy: r * sy, sz: r, color: col });

/** Rotated horizontal bar between two points (rails, pipes, cables). */
export function bar(c, mat, x0, y0, z0, x1, y1, z1, th, col) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, len = Math.hypot(dx, dy, dz);
  const yaw = Math.atan2(dx, dz), pitch = -Math.asin(dy / (len || 1));
  c.M.geo(mat, c.g.box, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, yaw, { rx: pitch, sx: th, sy: th, sz: len, color: col });
}

// ------------------------------------------------------------------ vegetation
export function tree(c, x, z, s = 1, kind = 'oak') {
  const { M, mats } = c;
  const leaf = { oak: [0x3f7a34, 0x4f8a3c, 0x356a2c], cherry: [0xf2a0c0, 0xe888b0, 0xf8bcd2], pine: [0x2c5a3a, 0x24503a, 0x346a44], autumn: [0xc9792a, 0xb8641e, 0xd9962f] }[kind] || [0x3f7a34];
  const pick = () => leaf[Math.floor(c.rnd() * leaf.length)];
  cyl(c, mats.wood, x, 0.2, z, 0.22 * s, 2.4 * s, 0x6a4a30, 'cyl8');
  if (kind === 'pine') {
    for (let k = 0; k < 4; k++) M.geo(mats.plain, c.g.cone8, x, (2.4 + k * 1.1) * s, z, c.rnd() * 3, { sx: (2.0 - k * 0.35) * s, sy: 1.9 * s, sz: (2.0 - k * 0.35) * s, color: pick() });
  } else {
    M.geo(mats.plain, c.g.ico1, x, 3.5 * s, z, c.rnd() * 6, { sx: 1.9 * s, sy: 1.5 * s, sz: 1.9 * s, color: pick() });
    M.geo(mats.plain, c.g.ico, x + 0.9 * s, 3.0 * s, z + 0.3 * s, c.rnd() * 6, { sx: 1.2 * s, sy: 1.0 * s, sz: 1.2 * s, color: pick() });
    M.geo(mats.plain, c.g.ico, x - 0.8 * s, 3.2 * s, z - 0.5 * s, c.rnd() * 6, { sx: 1.3 * s, sy: 1.1 * s, sz: 1.3 * s, color: pick() });
  }
  c.solid(x, z, 0.7 * s, 0.7 * s);
}

export function palm(c, x, z, s = 1) {
  const { M, mats } = c, lean = (c.rnd() - 0.5) * 0.5, a = c.rnd() * 6.28;
  let px = x, pz = z;
  for (let k = 0; k < 4; k++) {
    const dy = k * 1.5 * s, ox = Math.cos(a) * lean * k * 0.5 * s, oz = Math.sin(a) * lean * k * 0.5 * s;
    px = x + ox; pz = z + oz;
    cylXZ(c, mats.wood, px, 0.2 + dy, pz, 0.26 * s - k * 0.025 * s, 0.22 * s - k * 0.025 * s, 1.5 * s, k % 2 ? 0x9a7a52 : 0x8a6a44);
  }
  const top = 0.2 + 6 * s;
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2 + a, ex = px + Math.cos(ang) * 2.6 * s, ez = pz + Math.sin(ang) * 2.6 * s;
    // frond: tapered leaf = two thin quads meeting at the tip, drooping
    const nx = -Math.sin(ang) * 0.5 * s, nz = Math.cos(ang) * 0.5 * s;
    const col = k % 2 ? 0x3e8a3a : 0x4c9a44;
    M.quad(mats.plainDS, [px, top, pz], [px + nx, top + 0.1, pz + nz], [ex, top - 1.1 * s, ez], [ex, top - 1.1 * s, ez], [0, 0, 1, 1], col);
    M.quad(mats.plainDS, [px - nx, top + 0.1, pz - nz], [px, top, pz], [ex, top - 1.1 * s, ez], [ex, top - 1.1 * s, ez], [0, 0, 1, 1], col);
  }
  sph(c, mats.plain, px, top - 0.1, pz, 0.28 * s, 0x6a4a30);
  c.solid(x, z, 0.6, 0.6);
}

export function bush(c, x, z, s = 1, col = 0x3f7a34) { c.M.geo(c.mats.plain, c.g.ico1, x, 0.5 * s, z, c.rnd() * 6, { sx: 0.9 * s, sy: 0.65 * s, sz: 0.9 * s, color: col }); }

export function bamboo(c, x, z) {
  for (let k = 0; k < 6; k++) {
    const ox = (c.rnd() - 0.5) * 1.4, oz = (c.rnd() - 0.5) * 1.4, h = 5 + c.rnd() * 3;
    cyl(c, c.mats.plain, x + ox, 0, z + oz, 0.1, h, k % 2 ? 0x7aa84a : 0x8ab85a, 'cyl8');
    c.M.geo(c.mats.plain, c.g.ico, x + ox, h, z + oz, 0, { sx: 0.5, sy: 0.9, sz: 0.5, color: 0x5a9a3a });
  }
}

export function planter(c, x, z, w = 1.6, d = 1.6, col = 0x8a8478, plant = 0x3f7a34) {
  bx(c, c.mats.plain, x, 0, z, w, 0.6, d, col);
  bush(c, x, z, Math.min(w, d) * 0.55, plant);
  c.solid(x, z, w, d);
}

// ------------------------------------------------------------------ street furniture
export function lamp(c, x, z, rot = 0, col = 0x2b2e31, glowCol = 0xffe2a0, arm = 1.3) {
  const { mats } = c, dx = Math.sin(rot) * arm, dz = Math.cos(rot) * arm;
  cylXZ(c, mats.metal, x, 0, z, 0.16, 0.09, 5.4, col);
  bx(c, mats.metal, x, 0, z, 0.4, 0.35, 0.4, col);
  bar(c, mats.metal, x, 5.3, z, x + dx, 5.5, z + dz, 0.1, col);
  c.M.box(mats.glow, x + dx, 5.42, z + dz, 0.7, 0.14, 0.34, { color: glowCol, rotY: rot, top: false });
  c.lamps.push([x + dx, z + dz]);
}

export function trafficLight(c, x, z, rot) {
  const { mats } = c;
  cylXZ(c, mats.metal, x, 0, z, 0.14, 0.1, 4.6, 0x2a2d30);
  const ax = Math.sin(rot) * 2.2, az = Math.cos(rot) * 2.2;
  bar(c, mats.metal, x, 4.5, z, x + ax, 4.5, z + az, 0.12, 0x2a2d30);
  const hx = x + ax, hz = z + az;
  bx(c, mats.plain, hx, 3.6, hz, 0.45, 1.25, 0.4, 0x15171a, rot);
  const f = [[0xff3a2a, 4.55], [0xffc22a, 4.2], [0x2aff6a, 3.85]];
  const phase = Math.floor(c.rnd() * 3);
  f.forEach(([col, y], i) => c.M.box(mats.glow, hx + Math.sin(rot) * 0.22, y - 0.5, hz + Math.cos(rot) * 0.22, 0.28, 0.28, 0.06, { color: i === phase ? col : 0x2a2a2a, rotY: rot, top: false }));
}

export function hydrant(c, x, z, col = 0xc42a22) { cyl(c, c.mats.plain, x, 0, z, 0.2, 0.75, col, 'cyl8'); sph(c, c.mats.plain, x, 0.8, z, 0.22, col); }

export function bench(c, x, z, rot = 0, col = 0x7a5a3a) {
  const { mats } = c, cs = Math.cos(rot), sn = Math.sin(rot);
  c.M.box(mats.plain, x, 0.5, z, 1.8, 0.1, 0.5, { color: col, rotY: rot });
  c.M.box(mats.plain, x - sn * 0.22, 0.85, z - cs * 0.22, 1.8, 0.4, 0.08, { color: col, rotY: rot });
  for (const s of [-0.7, 0.7]) c.M.box(mats.metal, x + cs * s, 0.25, z - sn * s, 0.1, 0.5, 0.45, { color: 0x2a2d30, rotY: rot });
  c.solid(x, z, Math.abs(cs) * 1.8 + Math.abs(sn) * 0.5, Math.abs(sn) * 1.8 + Math.abs(cs) * 0.5);
}

export function bin(c, x, z, col = 0x3b6a4a) { cyl(c, c.mats.plain, x, 0, z, 0.3, 0.9, col, 'cyl8'); c.solid(x, z, 0.6, 0.6); }

export function bollard(c, x, z, col = 0x2a2d30, glow = 0) {
  cyl(c, c.mats.metal, x, 0, z, 0.12, 0.8, col, 'cyl8');
  if (glow) c.M.geo(c.mats.glow, c.g.sph, x, 0.85, z, 0, { sx: 0.13, sy: 0.13, sz: 0.13, color: glow });
}

export function busStop(c, x, z, rot, col = 0x2e5a8a) {
  const { mats } = c, cs = Math.cos(rot), sn = Math.sin(rot);
  c.M.box(mats.metal, x, 2.5, z, 3.6, 0.12, 1.4, { color: 0x30343a, rotY: rot });
  for (const s of [-1.7, 1.7]) c.M.box(mats.metal, x + cs * s, 1.25, z - sn * s, 0.1, 2.5, 0.1, { color: 0x30343a, rotY: rot });
  c.M.box(mats.glass, x - sn * 0.55, 1.4, z - cs * 0.55, 3.4, 2.2, 0.05, { color: 0xbfe0ff, rotY: rot, top: false });
  c.M.box(mats.glow, x + sn * 0.6, 1.3, z + cs * 0.6, 2.2, 1.6, 0.06, { color: col, rotY: rot, top: false });
  c.solid(x, z, Math.abs(cs) * 3.6 + Math.abs(sn) * 1.4, Math.abs(sn) * 3.6 + Math.abs(cs) * 1.4);
}

export function mailbox(c, x, z, col = 0x2a4a8a) { bx(c, c.mats.plain, x, 0.3, z, 0.55, 0.9, 0.5, col); c.solid(x, z, 0.6, 0.6); }

export function barrel(c, x, z, col = 0x5a3a24, o = {}) {
  cyl(c, c.mats.metal, x, 0, z, 0.45, 1.1, col, 'cyl12');
  cyl(c, c.mats.metal, x, 0.3, z, 0.47, 0.08, 0x222222, 'cyl12'); cyl(c, c.mats.metal, x, 0.75, z, 0.47, 0.08, 0x222222, 'cyl12');
  if (o.solid !== false) c.solid(x, z, 0.9, 0.9);
}

export function crate(c, x, z, s = 1, col = 0x8a6a40, y = 0, rot = 0) {
  c.M.box(c.mats.plain, x, y + s / 2, z, s, s, s, { color: col, rotY: rot });
  c.M.box(c.mats.plain, x, y + s / 2, z, s * 1.02, s * 0.12, s * 1.02, { color: 0x4a3a28, rotY: rot, top: false });
  if (y === 0) c.solid(x, z, s * 1.1, s * 1.1);
}

export function tires(c, x, z, n = 4) {
  for (let k = 0; k < n; k++) c.M.geo(c.mats.plain, c.g.torus, x + (k % 2) * 0.1, 0.28 + Math.floor(k / 2) * 0.5, z, 0, { rx: Math.PI / 2, sx: 0.55, sy: 0.55, sz: 2.6, color: 0x1a1a1a });
  c.solid(x, z, 1.3, 1.3);
}

/** Ribbed shipping container (length along local z). */
export function container(c, x, z, rot = 0, col = 0xa83a2a, y = 0, solid = true) {
  const { mats } = c, L = 6, W = 2.4, H = 2.6, cs = Math.cos(rot), sn = Math.sin(rot);
  c.M.box(mats.metal, x, y + H / 2, z, W, H, L, { color: col, rotY: rot });
  const rib = new c.T.Color(col).multiplyScalar(0.74).getHex();
  for (let k = -2; k <= 2; k++) c.M.box(mats.metal, x + sn * k * 1.15, y + H / 2, z + cs * k * 1.15, W + 0.07, H - 0.35, 0.16, { color: rib, rotY: rot, top: false, noShadow: true });
  void cs;
  if (solid && y === 0) c.solid(x, z, Math.abs(cs) * W + Math.abs(sn) * L, Math.abs(sn) * W + Math.abs(cs) * L);
}

export function car(c, x, z, rot, col, o = {}) {
  const { mats } = c, cs = Math.cos(rot), sn = Math.sin(rot);
  const L = o.len || 4.2, W = 1.9;
  c.M.box(mats.metal, x, 0.75, z, W, 0.7, L, { color: col, rotY: rot });
  c.M.box(mats.metal, x, 0.45, z, W - 0.1, 0.4, L - 0.2, { color: 0x1a1a1a, rotY: rot, top: false });
  const off = -0.25;
  c.M.box(mats.glass, x + sn * off, 1.4, z + cs * off, W - 0.2, 0.62, L * 0.5, { color: 0x20262c, rotY: rot, roofColor: col });
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) c.M.box(mats.plain, x + cs * sx * (W / 2 - 0.05) + sn * sz * L * 0.32, 0.36, z - sn * sx * (W / 2 - 0.05) + cs * sz * L * 0.32, 0.26, 0.72, 0.72, { color: 0x111111, rotY: rot });
  const hl = o.night ? 0xfff0b0 : 0xe8e0c0;
  for (const sx of [-1, 1]) {
    c.M.box(mats.glow, x + cs * sx * 0.65 + sn * L * 0.5, 0.85, z - sn * sx * 0.65 + cs * L * 0.5, 0.4, 0.2, 0.06, { color: hl, rotY: rot });
    c.M.box(mats.glow, x + cs * sx * 0.65 - sn * L * 0.5, 0.85, z - sn * sx * 0.65 - cs * L * 0.5, 0.4, 0.2, 0.06, { color: 0xff2a2a, rotY: rot });
  }
  if (o.solid !== false) c.solid(x, z, Math.abs(cs) * W + Math.abs(sn) * L, Math.abs(sn) * W + Math.abs(cs) * L);
}

/** Wrecked car on a pile: dark rusty body, no wheels. */
export function wreck(c, x, y, z, rot, col = 0x6a3a2a) {
  const { mats } = c;
  c.M.box(mats.metal, x, y + 0.45, z, 1.9, 0.8, 4.2, { color: col, rotY: rot });
  c.M.box(mats.metal, x, y + 1.05, z - 0.2, 1.7, 0.5, 2.2, { color: new c.T.Color(col).multiplyScalar(0.7).getHex(), rotY: rot });
}

// ------------------------------------------------------------------ signs, banners, lanterns
/** Atlas sign facing direction rot (0 = +z). */
export function sign(c, name, x, y, z, w, h, rot = 0, dim = 1) {
  const cs = Math.cos(rot), sn = Math.sin(rot), hw = w / 2, hh = h / 2;
  const P = (s, yy) => [x + cs * s, y + yy, z - sn * s];
  c.M.quad(c.mats.sign, P(-hw, -hh), P(hw, -hh), P(hw, hh), P(-hw, hh), c.signUV(name), new c.T.Color(dim, dim, dim).getHex());
}

/** Sign hanging out from a facade, readable from both sides (two quads). */
export function blade(c, name, x, y, z, w, h, rot) {
  sign(c, name, x, y, z, w, h, rot); sign(c, name, x, y, z, w, h, rot + Math.PI);
  c.M.box(c.mats.metal, x, y + h / 2 + 0.2, z, 0.08, 0.08, 0.08, { color: 0x222222 });
}

export function lantern(c, x, y, z, col = 0xff4a3a, r = 0.38) {
  c.M.geo(c.mats.glow, c.g.sph, x, y, z, 0, { sx: r, sy: r * 1.25, sz: r, color: col });
  c.M.box(c.mats.plain, x, y + r * 1.3, z, 0.18, 0.1, 0.18, { color: 0x222222 });
  c.M.box(c.mats.plain, x, y - r * 1.3, z, 0.12, 0.2, 0.12, { color: 0xc9a14a });
}

/** Striped awning sloping out of a wall. (x,z) = wall point, (nx,nz) = outward normal, along tangent t. */
export function awning(c, x, y, z, nx, nz, w, depth, colA, colB) {
  const tx = nz, tz = -nx, n = 6, sw = w / n;
  for (let k = 0; k < n; k++) {
    const s0 = -w / 2 + k * sw, s1 = s0 + sw, col = k % 2 ? colB : colA;
    const a = [x + tx * s0, y, z + tz * s0], b = [x + tx * s1, y, z + tz * s1], cc = [x + tx * s1 + nx * depth, y - 0.55, z + tz * s1 + nz * depth], d = [x + tx * s0 + nx * depth, y - 0.55, z + tz * s0 + nz * depth];
    c.M.quad(c.mats.plainDS, d, cc, b, a, [0, 0, 1, 1], col);
  }
}

/** Pole-mounted flag / banner facing a direction (static; HQ flags use anim). */
export function banner(c, x, z, h, col, rot = 0, w = 1.2, len = 3.2) {
  cyl(c, c.mats.metal, x, 0, z, 0.08, h, 0x2a2d30, 'cyl8');
  const cs = Math.cos(rot), sn = Math.sin(rot);
  c.M.quad(c.mats.plainDS, [x + cs * 0.1, h - 0.2, z - sn * 0.1], [x + cs * 0.1, h - 0.2 - len, z - sn * 0.1], [x + cs * (0.1 + w), h - 0.2 - len, z - sn * (0.1 + w)], [x + cs * (0.1 + w), h - 0.2, z - sn * (0.1 + w)], [0, 0, 1, 1], col);
}
