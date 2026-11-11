// Outfit shapes. Every wearable has its own geometry (silhouette), not just a colour:
//   jackets: puffer, parka, varsity, peacoat, hoodie, vest, poncho
//   scarves: wool, snood, muffler, bandana, fur, bow
//   hats:    beanie, ushanka, newsboy, earmuffs, cat, beret
//   pants:   slim, cargo, bibs, skirt, shorts
//   gloves:  glove, mitten, warmer, furcuff
//   skates:  rental, hockey, figure, speed
// Builders receive a context object c = { T, mk, ell, limb, std, TX, P, ... } from createCharacter.

const PI = Math.PI;
const lerpPts = (pts, y) => {
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (y >= a[0] && y <= b[0]) return a[1] + (b[1] - a[1]) * ((y - a[0]) / (b[0] - a[0] || 1)); }
  return pts[pts.length - 1][1];
};
const hexMul = (n, k) => { const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255); };
const hexMix = (a, b, t) => { const f = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t); return (f(16) << 16) | (f(8) << 8) | f(0); };

// ------------------------------------------------------------------ jackets
export const JACKET_HEM = { parka: [-0.34, 0.215], peacoat: [-0.3, 0.2] };
export function torsoProfile(style, torso) {
  const e = JACKET_HEM[style]; if (!e) return torso;
  return [[e[0], 0.0012], [e[0] + 0.012, e[1]], [-0.2, e[1] * 0.93], [-0.1, 0.165], ...torso.slice(1)];
}
export function jacketMats(style, c) {
  const { std, TX, P } = c, acc = P.jacketAccent !== undefined ? P.jacketAccent : 0xf1e8d6;
  const q = (m, bs = 0.9) => std({ color: 0xffffff, map: m.map, bumpMap: m.bump, bumpScale: bs, roughness: 0.62, envMapIntensity: 0.55 });
  const flat = (col, r = 0.8) => std({ color: col, roughness: r });
  const knitM = (col, a = 3, b = 3) => { const k = TX.knit(col, a, b); return std({ color: 0xffffff, map: k.map, roughness: 0.95 }); };
  switch (style) {
    case 'varsity': { const slv = flat(acc, 0.7); return { torsoMat: flat(P.jacket, 0.7), upperMat: slv, foreMat: slv }; }
    case 'peacoat': { const t = TX.twill(P.jacket, 1, 2), m = std({ color: 0xffffff, map: t.map, roughness: 0.9 }); return { torsoMat: m, upperMat: m, foreMat: m }; }
    case 'hoodie': { const m = flat(P.jacket, 0.95); return { torsoMat: m, upperMat: m, foreMat: m }; }
    case 'vest': { const km = knitM(acc); return { torsoMat: q(TX.quilted(P.jacket, 6, { zip: true, seed: 3 }), 1.1), upperMat: km, foreMat: km }; }
    case 'poncho': { const km = knitM(0xe9e0d0); return { torsoMat: km, upperMat: km, foreMat: km }; }
    case 'parka': return { torsoMat: q(TX.quilted(P.jacket, 6, { zip: true, seed: 3 }), 1.1), upperMat: q(TX.quilted(P.jacket, 3, { seed: 5 })), foreMat: q(TX.quilted(P.jacket, 3, { seed: 6 })) };
    default: return { torsoMat: q(TX.quilted(P.jacket, 7, { zip: true, seed: 3 }), 1.1), upperMat: q(TX.quilted(P.jacket, 3, { seed: 5 })), foreMat: q(TX.quilted(P.jacket, 3, { seed: 6 })) };
  }
}
export function jacketExtras(style, c) {
  const { T, mk, ell, std, spine, P, profile, armL, armR } = c, TZ = P.torsoZ;
  const rAt = (y) => lerpPts(profile, y), zf = (y) => rAt(y) * TZ;
  const acc = P.jacketAccent !== undefined ? P.jacketAccent : 0xf1e8d6;
  const fur = std({ color: 0xf6f1e8, roughness: 1 }), accM = std({ color: acc, roughness: 0.7 }), dark = std({ color: hexMul(P.jacket, 0.55), roughness: 0.7 });
  const ring = (y, r, tube, mat, zs = TZ) => { const m = mk(new T.TorusGeometry(r, tube, 8, 36), mat, 0, y, 0); m.rotation.x = PI / 2; m.scale.set(1, zs, 1); spine.add(m); return m; };
  const wristRing = (a, mat, tube = 0.014) => { const m = mk(new T.TorusGeometry(0.044, tube, 8, 16), mat, 0, 0.0, 0); m.rotation.x = PI / 2; a.wr.add(m); };
  const furRing = (y, r, n, sr, zs, mat = fur) => { for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; spine.add(ell(1, sr, sr, sr, mat, Math.cos(a) * r, y, Math.sin(a) * r * zs, 8, 6)); } };
  if (style === 'parka') {
    furRing(0.545, 0.105, 14, 0.036, 0.85); furRing(0.585, 0.092, 12, 0.03, 0.85);
    ring(JACKET_HEM.parka[0] + 0.02, 0.212, 0.014, dark);
    [-1, 1].forEach((s) => { const f = mk(new T.BoxGeometry(0.08, 0.012, 0.06), dark, s * 0.1, -0.06, zf(-0.06) + 0.004); f.rotation.x = -0.25; spine.add(f); });
    [0.36, 0.25, 0.14].forEach((y) => spine.add(ell(1, 0.012, 0.012, 0.012, std({ color: 0x6b4a2a }), 0, y, zf(y) + 0.006, 8, 6)));
  } else if (style === 'varsity') {
    ring(0.548, 0.082, 0.02, accM, 0.9); ring(-0.085, rAt(-0.085) + 0.002, 0.018, accM);
    [0.31, 0.35].forEach((y) => ring(y, rAt(y) + 0.003, 0.007, accM));
    [0.23, 0.15, 0.07].forEach((y) => spine.add(ell(1, 0.011, 0.011, 0.011, std({ color: 0xdde4ec, metalness: 0.5 }), 0, y, zf(y) + 0.006, 8, 6)));
    spine.add(mk(new T.BoxGeometry(0.05, 0.05, 0.006), accM, 0.075, 0.42, zf(0.42) + 0.004));
    [armL, armR].forEach((a) => { wristRing(a, accM, 0.018); const m = mk(new T.TorusGeometry(0.047, 0.008, 6, 16), dark, 0, -0.22, 0); m.rotation.x = PI / 2; a.el.add(m); });
  } else if (style === 'peacoat') {
    const btn = std({ color: 0x1b1d22, roughness: 0.4, metalness: 0.2 });
    [-1, 1].forEach((s) => { [0.4, 0.28, 0.16, 0.04, -0.08, -0.2].forEach((y) => spine.add(ell(1, 0.014, 0.014, 0.008, btn, s * 0.048, y, zf(y) + 0.004, 8, 6))); const l = mk(new T.BoxGeometry(0.075, 0.13, 0.012), std({ color: hexMul(P.jacket, 0.8), roughness: 0.9 }), s * 0.07, 0.49, zf(0.49) + 0.012); l.rotation.set(-0.2, 0, -s * 0.5); spine.add(l); });
    ring(0.55, 0.088, 0.022, std({ color: hexMul(P.jacket, 0.8), roughness: 0.9 }), 0.9); ring(0.05, rAt(0.05) + 0.003, 0.011, dark); ring(JACKET_HEM.peacoat[0] + 0.015, 0.198, 0.012, dark);
    [armL, armR].forEach((a) => wristRing(a, dark, 0.012));
  } else if (style === 'hoodie') {
    const fl = std({ color: hexMul(P.jacket, 0.96), roughness: 0.95 });
    spine.add(ell(1, 0.12, 0.085, 0.075, fl, 0, 0.55, -0.09, 12, 8)); spine.add(ell(1, 0.1, 0.06, 0.06, fl, 0, 0.49, -0.12, 10, 8));
    spine.add(mk(new T.BoxGeometry(0.2, 0.09, 0.014), std({ color: hexMul(P.jacket, 0.88), roughness: 0.95 }), 0, 0.1, zf(0.1) + 0.006));
    [-1, 1].forEach((s) => { const cord = mk(new T.CylinderGeometry(0.004, 0.004, 0.16, 6), accM, s * 0.032, 0.4, zf(0.4) + 0.01); spine.add(cord); spine.add(ell(1, 0.007, 0.007, 0.007, accM, s * 0.032, 0.32, zf(0.32) + 0.01, 6, 5)); });
    ring(-0.085, rAt(-0.085) + 0.002, 0.016, dark); [armL, armR].forEach((a) => wristRing(a, dark, 0.016));
  } else if (style === 'vest') {
    const km = std({ color: 0xffffff, map: c.TX.knit(acc, 3, 3).map, roughness: 0.95 });
    ring(0.548, 0.082, 0.022, km, 0.9); ring(-0.085, rAt(-0.085) + 0.002, 0.018, km);
    [-1, 1].forEach((s) => { const m = mk(new T.TorusGeometry(0.07, 0.014, 8, 20), km, s * (P.shoulderX - 0.02), 0.46, 0); m.rotation.y = PI / 2; spine.add(m); });
    [armL, armR].forEach((a) => wristRing(a, km, 0.016));
    spine.add(mk(new T.BoxGeometry(0.05, 0.035, 0.006), dark, -0.07, 0.36, zf(0.36) + 0.004));
  } else if (style === 'poncho') {
    const pts = [[0.095, 0.585], [0.12, 0.56], [0.19, 0.5], [0.26, 0.4], [0.32, 0.26], [0.355, 0.12], [0.365, 0.06]].map(([r, y]) => new T.Vector2(r, y));
    const k = c.TX.knit(P.jacket, 4, 2), pm = std({ color: 0xffffff, map: k.map, roughness: 0.95, side: T.DoubleSide });
    const cape = new T.Mesh(new T.LatheGeometry(pts, 32), pm); cape.scale.z = 0.88; spine.add(cape);
    ring(0.058, 0.365, 0.016, accM, 0.88); ring(0.575, 0.1, 0.03, std({ color: hexMul(P.jacket, 1.1), roughness: 1 }), 0.9);
    for (let i = 0; i < 22; i++) { const a = (i / 22) * PI * 2; spine.add(mk(new T.CylinderGeometry(0.004, 0.004, 0.05, 4), accM, Math.cos(a) * 0.365, 0.035, Math.sin(a) * 0.365 * 0.88)); }
  }
}

// ------------------------------------------------------------------ scarves
export function scarfBuild(style, c) {
  const { T, mk, ell, std, TX, P, neck, spine, scarfMat, profile } = c, TZ = P.torsoZ, zf = (y) => lerpPts(profile, y) * TZ;
  const knitM = (col) => std({ color: 0xffffff, map: TX.knit(col, 3, 3).map, roughness: 0.95 });
  const tor = (r, tube, y, mat, sx = 1, sz = 1) => { const m = mk(new T.TorusGeometry(r, tube, 12, 28), mat, 0, y, 0); m.rotation.x = PI / 2; m.scale.set(sx, 1, sz); neck.add(m); return m; };
  if (style === 'snood') {
    const m = knitM(P.scarf); tor(0.086, 0.054, 0.045, m, 1.08, 0.95); tor(0.076, 0.046, 0.108, m, 1.05, 0.95);
  } else if (style === 'muffler') {
    const cream = std({ color: 0xf4efe6, roughness: 0.95 }); tor(0.07, 0.034, 0.055, scarfMat, 1.05, 0.95);
    spine.add(mk(new T.SphereGeometry(0.04, 10, 8), scarfMat, 0.05, 0.505, 0.095));
    [[0.04, 0.33, 0.37], [-0.045, 0.37, 0.27]].forEach(([x, y, len], i) => {
      const g = new T.Group(); g.position.set(x, y + 0.04, zf(y) + 0.012 + i * 0.006); g.rotation.z = (i ? -1 : 1) * 0.05; spine.add(g);
      g.add(mk(new T.BoxGeometry(0.075, len, 0.02, 3, 8, 1), scarfMat, 0, -len / 2 + 0.04, 0));
      [0.25, 0.5, 0.75].forEach((t) => g.add(mk(new T.BoxGeometry(0.077, 0.014, 0.022), cream, 0, 0.04 - len * t, 0)));
      g.add(mk(new T.BoxGeometry(0.075, 0.03, 0.024), cream, 0, 0.04 - len - 0.005, 0));
    });
  } else if (style === 'bandana') {
    tor(0.07, 0.02, 0.05, scarfMat, 1.05, 0.95);
    const tri = new T.Mesh(new T.ConeGeometry(0.11, 0.2, 3), scarfMat); tri.rotation.set(PI, 0, 0); tri.scale.set(1.15, 1, 0.22); tri.position.set(0, -0.045, 0.082); neck.add(tri);
    for (let i = 0; i < 5; i++) neck.add(ell(1, 0.009, 0.009, 0.004, std({ color: 0xffffff }), (i - 2) * 0.03, -0.01 - (i % 2) * 0.04, 0.094, 6, 5));
  } else if (style === 'fur') {
    const fur = std({ color: hexMix(P.scarf, 0xffffff, 0.6), roughness: 1 });
    [[0.05, 0.088, 14, 0.036], [0.09, 0.078, 12, 0.032], [0.02, 0.095, 14, 0.034]].forEach(([y, r, n, sr]) => { for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; neck.add(ell(1, sr, sr, sr, fur, Math.cos(a) * r, y, Math.sin(a) * r * 0.92, 8, 6)); } });
  } else if (style === 'bow') {
    tor(0.068, 0.013, 0.05, scarfMat, 1.05, 0.95);
    [-1, 1].forEach((s) => { const w = ell(1, 0.05, 0.03, 0.012, scarfMat, s * 0.05, 0.03, 0.088, 10, 8); w.rotation.z = s * 0.3; neck.add(w); const t = mk(new T.BoxGeometry(0.022, 0.1, 0.008), scarfMat, s * 0.022, -0.04, 0.09); t.rotation.z = s * 0.18; neck.add(t); });
    neck.add(ell(1, 0.02, 0.02, 0.016, scarfMat, 0, 0.03, 0.092, 8, 6));
  }
}

// ------------------------------------------------------------------ hats (head-local space)
export function hatBuild(style, c) {
  const { T, mk, ell, std, TX, P, head } = c, col = P.hat.color;
  const knitM = (colr, a = 2, b = 2) => std({ map: TX.knit(colr, a, b).map });
  const fur = std({ color: hexMix(col, 0xffffff, 0.7), roughness: 1 });
  const dome = (rad, sx, sy, sz, mat, y, thetaLen = 1.5) => { const m = new T.Mesh(new T.SphereGeometry(rad, 18, 12, 0, PI * 2, 0, thetaLen), mat); m.scale.set(sx, sy, sz); m.position.set(0, y, -0.004); head.add(m); return m; };
  const tor = (r, tube, y, mat, sx, sz, rx = PI / 2) => { const m = mk(new T.TorusGeometry(r, tube, 8, 24), mat, 0, y, -0.004); m.rotation.x = rx; m.scale.set(sx, sz, 1); head.add(m); return m; };
  if (style === 'ushanka') {
    const m = knitM(col); dome(0.108, 0.99, 0.95, 1.06, m, 0.045, 1.45); tor(0.103, 0.032, 0.048, fur, 1, 1.1);
    [-1, 1].forEach((s) => { const f = ell(1, 0.04, 0.075, 0.03, fur, s * 0.108, -0.05, 0.0, 10, 8); f.rotation.z = s * 0.25; head.add(f); head.add(mk(new T.BoxGeometry(0.03, 0.05, 0.02), m, s * 0.104, 0.0, 0.0)); });
    head.add(ell(1, 0.03, 0.02, 0.03, fur, 0, 0.128, 0, 8, 6));
  } else if (style === 'newsboy') {
    const m = std({ map: TX.twill(col, 2, 2).map, roughness: 0.9 }); dome(0.112, 1.0, 0.5, 1.12, m, 0.05, 1.5);
    const b = mk(new T.BoxGeometry(0.15, 0.012, 0.07), m, 0, 0.04, 0.118); b.rotation.x = 0.22; head.add(b);
    head.add(ell(1, 0.014, 0.014, 0.014, m, 0, 0.1, 0.0, 8, 6)); tor(0.1, 0.01, 0.04, std({ color: hexMul(col, 0.7) }), 1, 1.1);
  } else if (style === 'earmuffs') {
    const band = mk(new T.TorusGeometry(0.108, 0.0075, 8, 32, PI), std({ color: 0x2c3340, metalness: 0.4, roughness: 0.5 }), 0, 0.0, -0.004); head.add(band);
    [-1, 1].forEach((s) => { head.add(ell(1, 0.026, 0.04, 0.04, fur, s * 0.108, -0.005, -0.004, 12, 9)); head.add(ell(1, 0.012, 0.03, 0.03, std({ color: hexMul(col, 0.8), roughness: 1 }), s * 0.13, -0.005, -0.004, 8, 6)); });
  } else if (style === 'cat') {
    const m = knitM(col); dome(0.106, 0.97, 1.0, 1.1, m, 0.03, 1.5); tor(0.103, 0.017, 0.0385, m, 0.98, 1.1);
    const inner = std({ color: 0xffb0c8, roughness: 0.9 });
    [-1, 1].forEach((s) => { const e = mk(new T.ConeGeometry(0.036, 0.075, 3), m, s * 0.062, 0.128, 0.0); e.rotation.z = -s * 0.32; head.add(e); const i2 = mk(new T.ConeGeometry(0.022, 0.05, 3), inner, s * 0.062, 0.125, 0.012); i2.rotation.z = -s * 0.32; head.add(i2); });
  } else if (style === 'beret') {
    const m = std({ map: TX.knit(col, 2, 2).map, roughness: 1 });
    const d = ell(1, 0.118, 0.04, 0.112, m, 0.014, 0.1, -0.008, 18, 10); d.rotation.z = -0.22; head.add(d);
    tor(0.098, 0.009, 0.05, std({ color: hexMul(col, 0.7) }), 1, 1.08); head.add(mk(new T.CylinderGeometry(0.007, 0.009, 0.026, 8), std({ color: hexMul(col, 0.7) }), 0.0, 0.142, -0.008));
  }
}

// ------------------------------------------------------------------ pants / skirts / shorts
export function pantsBuild(style, c) {
  const { T, mk, ell, std, TX, P, hips, spine, legs, profile } = c, TZ = P.torsoZ, zf = (y) => lerpPts(profile, y) * TZ;
  const col = P.pants, dark = std({ color: hexMul(col, 0.7), roughness: 0.9 }), tw = std({ color: 0xffffff, map: TX.twill(col, 1, 1.5).map, roughness: 0.9 });
  if (style === 'cargo' || style === 'bibs') {
    const k = style === 'bibs' ? 1.38 : 1.3;
    legs.forEach((l, i) => {
      const s = i === 0 ? 1 : -1; l.thigh.scale.set(k, 1, k); l.shin.scale.set(k, 1, k);
      const cuff = mk(new T.TorusGeometry(0.062 * k, 0.02, 8, 16), dark, 0, -0.33, 0); cuff.rotation.x = PI / 2; l.knee.add(cuff);
      if (style === 'cargo') { l.hip.add(mk(new T.BoxGeometry(0.034, 0.11, 0.075), tw, s * 0.108, -0.2, 0.012)); l.hip.add(mk(new T.BoxGeometry(0.036, 0.02, 0.078), dark, s * 0.108, -0.145, 0.012)); }
      else l.knee.add(ell(1, 0.055, 0.06, 0.04, dark, 0, 0.02, 0.058, 10, 8));
    });
    if (style === 'bibs') {
      spine.add(mk(new T.BoxGeometry(0.22, 0.2, 0.02), tw, 0, 0.12, zf(0.12) + 0.008));
      [-1, 1].forEach((s) => { const st = mk(new T.BoxGeometry(0.034, 0.34, 0.012), tw, s * 0.085, 0.31, zf(0.31) + 0.008); st.rotation.z = -s * 0.12; spine.add(st); spine.add(ell(1, 0.012, 0.012, 0.008, std({ color: 0xdde4ec, metalness: 0.6 }), s * 0.095, 0.24, zf(0.24) + 0.018, 8, 6)); });
    }
  } else if (style === 'skirt') {
    const g = new T.CylinderGeometry(0.165, 0.3, 0.3, 36, 1, true), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.07 * Math.cos(a * 12); p.setXYZ(i, x * k, p.getY(i), z * k * 0.9); }
    g.computeVertexNormals();
    const m = new T.Mesh(g, std({ color: col, roughness: 0.9, side: T.DoubleSide })); m.position.set(0, -0.15, 0); hips.add(m);
    const wb = mk(new T.TorusGeometry(0.16, 0.016, 8, 28), dark, 0, 0.0, 0); wb.rotation.x = PI / 2; wb.scale.set(1, 0.9, 1); hips.add(wb);
    const hem = mk(new T.TorusGeometry(0.3, 0.006, 6, 36), dark, 0, -0.3, 0); hem.rotation.x = PI / 2; hem.scale.set(1, 0.9, 1); hips.add(hem);
  } else if (style === 'shorts') {
    legs.forEach((l) => {
      const g = new T.CylinderGeometry(0.108, 0.128, 0.2, 18, 1, true), m = new T.Mesh(g, std({ color: col, roughness: 0.9, side: T.DoubleSide })); m.position.set(0, -0.1, 0); l.hip.add(m);
      const r = mk(new T.TorusGeometry(0.128, 0.014, 8, 20), dark, 0, -0.2, 0); r.rotation.x = PI / 2; l.hip.add(r);
    });
    const wb = mk(new T.TorusGeometry(0.15, 0.016, 8, 28), dark, 0, 0.0, 0); wb.rotation.x = PI / 2; wb.scale.set(1, 0.9, 1); hips.add(wb);
  }
}

// ------------------------------------------------------------------ gloves
export function gloveBuild(style, c) {
  const { T, mk, ell, std, TX, P, arms, skinFlat, gloveMat } = c;
  const fur = std({ color: 0xf6f1e8, roughness: 1 });
  arms.forEach((a) => {
    if (style === 'mitten') {
      a.hand.scale.set(1.5, 1.25, 1.05); a.hand.position.y = -0.02; a.thumb.scale.set(1.7, 1.5, 1.7);
    } else if (style === 'warmer') {
      a.hand.material = skinFlat; a.thumb.material = skinFlat;
      a.el.add(mk(new T.CylinderGeometry(0.05, 0.046, 0.24, 16), gloveMat, 0, -0.125, 0));
      [0.0, -0.245].forEach((y) => { const r = mk(new T.TorusGeometry(0.049, 0.012, 8, 16), std({ color: 0xffffff, map: TX.knit(P.glove, 1, 1).map }), 0, y, 0); r.rotation.x = PI / 2; a.el.add(r); });
    } else if (style === 'furcuff') {
      for (let i = 0; i < 9; i++) { const t = (i / 9) * PI * 2; a.wr.add(ell(1, 0.021, 0.021, 0.021, fur, Math.cos(t) * 0.046, 0.012, Math.sin(t) * 0.046, 8, 6)); }
    }
  });
}

// ------------------------------------------------------------------ skates (ankle-local space; blade bottom stays at y = -0.16)
export function skateBuild(style, c, ankle) {
  const { T, mk, ell, limb, std, lite, mats } = c, { bootMat, accentMat, laceMat, rubber, steel } = mats;
  const black = std({ color: 0x15161a, roughness: 0.6 }), carbon = std({ color: 0x23252e, roughness: 0.35, metalness: 0.4 });
  const blade = (pts, depth = 0.008) => { const sh = new T.Shape(); sh.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([z, y]) => sh.lineTo(z, y)); const g = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); g.rotateY(-PI / 2); ankle.add(new T.Mesh(g, steel)); };
  if (style === 'hockey') {
    const shaft = limb(0.115, 0.066, 0.062, bootMat); shaft.position.y = 0.075; ankle.add(shaft);
    const foot = limb(0.16, 0.06, 0.05, bootMat); foot.rotation.x = -PI / 2; foot.position.set(0, -0.04, -0.065); foot.scale.set(1.1, 1, 0.98); ankle.add(foot);
    ankle.add(ell(1, 0.064, 0.042, 0.066, black, 0, -0.045, 0.115, 12, 8));
    ankle.add(mk(new T.BoxGeometry(0.095, 0.14, 0.03), black, 0, 0.07, -0.066));
    if (!lite) { const cuff = new T.Mesh(new T.TorusGeometry(0.066, 0.014, 8, 20), accentMat); cuff.rotation.x = PI / 2; cuff.position.y = 0.126; ankle.add(cuff); [0.1, 0.06, 0.02].forEach((y) => ankle.add(mk(new T.BoxGeometry(0.05, 0.006, 0.006), laceMat, 0, y, 0.066))); }
    ankle.add(mk(new T.BoxGeometry(0.075, 0.042, 0.32), black, 0, -0.108, 0.03));
    ankle.add(mk(new T.BoxGeometry(0.012, 0.04, 0.34), steel, 0, -0.14, 0.03));
    [-1, 1].forEach((s) => { const e = mk(new T.CylinderGeometry(0.02, 0.02, 0.012, 10), steel, 0, -0.14, 0.03 + s * 0.17); e.rotation.z = PI / 2; ankle.add(e); });
  } else if (style === 'figure') {
    const shaft = limb(0.21, 0.058, 0.052, bootMat); shaft.position.y = 0.16; ankle.add(shaft);
    const foot = limb(0.17, 0.046, 0.04, bootMat); foot.rotation.x = -PI / 2; foot.position.set(0, -0.04, -0.05); foot.scale.set(0.95, 1, 0.8); ankle.add(foot);
    ankle.add(mk(new T.BoxGeometry(0.058, 0.045, 0.07), bootMat, 0, -0.07, -0.05));
    if (!lite) { const cuff = new T.Mesh(new T.TorusGeometry(0.057, 0.012, 8, 20), accentMat); cuff.rotation.x = PI / 2; cuff.position.y = 0.21; ankle.add(cuff); for (let i = 0; i < 6; i++) ankle.add(mk(new T.BoxGeometry(0.04, 0.005, 0.006), laceMat, 0, 0.19 - i * 0.03, 0.056 + (i > 3 ? 0.004 * (i - 3) : 0))); }
    ankle.add(mk(new T.BoxGeometry(0.068, 0.01, 0.285), steel, 0, -0.092, 0.05));
    blade([[-0.14, -0.16], [0.13, -0.16], [0.19, -0.157], [0.225, -0.12], [0.205, -0.116], [0.185, -0.138], [-0.12, -0.14]], 0.007);
    [0.07, -0.05].forEach((z) => ankle.add(mk(new T.BoxGeometry(0.012, 0.05, 0.016), steel, 0, -0.115, z)));
    [-0.012, 0.0, 0.012].forEach((x) => ankle.add(mk(new T.BoxGeometry(0.004, 0.032, 0.012), steel, x, -0.118, 0.222)));
  } else if (style === 'speed') {
    const shaft = limb(0.065, 0.054, 0.052, bootMat); shaft.position.y = 0.045; ankle.add(shaft);
    const foot = limb(0.215, 0.046, 0.04, bootMat); foot.rotation.x = -PI / 2; foot.position.set(0, -0.045, -0.075); foot.scale.set(0.98, 1, 0.85); ankle.add(foot);
    ankle.add(mk(new T.BoxGeometry(0.062, 0.014, 0.4), carbon, 0, -0.092, 0.05));
    if (!lite) { const cuff = new T.Mesh(new T.TorusGeometry(0.054, 0.01, 8, 20), accentMat); cuff.rotation.x = PI / 2; cuff.position.y = 0.075; ankle.add(cuff); [0.04, 0.0].forEach((y) => ankle.add(mk(new T.BoxGeometry(0.04, 0.006, 0.006), laceMat, 0, y, 0.054))); }
    blade([[-0.23, -0.16], [0.33, -0.16], [0.36, -0.14], [0.33, -0.12], [-0.2, -0.12], [-0.24, -0.14]], 0.006);
    [0.2, -0.1].forEach((z) => ankle.add(mk(new T.BoxGeometry(0.012, 0.05, 0.014), steel, 0, -0.115, z)));
  }
}
