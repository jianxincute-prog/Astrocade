// Painted anime-style faces. Features are described in head-local metres and projected onto the head
// texture by ray-casting the real head mesh, so they sit correctly on its curved, deformed surface.
const T = THREE;

const STYLE = {
  male: {
    skin: '#dcaa86', ey: -0.004, inner: 0.0148, ew: 0.037, hu: 0.0168, hl: 0.0078, tilt: 0.0045,
    ir: 0.0108, irh: 0.0152, irisTop: '#14305a', irisMid: '#3b88cc', irisBot: '#a6e4ff', lash: 0.0036, wing: 0.0075, lashes: 0,
    brow: { w0: 0.0082, w1: 0.0030, y: 0.031, arch: 0.0042, col: '#2a1d17', tilt: 0.0075 },
    mouth: { w: 0.0195, y: -0.0665, smile: 0.0012, col: '#8f423f', lip: false },
    blush: 0.14, shadowTop: 0,
  },
  female: {
    skin: '#f2cab0', ey: -0.002, inner: 0.0138, ew: 0.0405, hu: 0.0205, hl: 0.0098, tilt: 0.003,
    ir: 0.0123, irh: 0.0176, irisTop: '#4f2810', irisMid: '#bb7a3a', irisBot: '#ffdca0', lash: 0.0046, wing: 0.0065, lashes: 3,
    brow: { w0: 0.0040, w1: 0.0018, y: 0.0375, arch: 0.0058, col: '#2b1a16', tilt: 0.0025 },
    mouth: { w: 0.0165, y: -0.0645, smile: 0.0036, col: '#a8434f', lip: true },
    blush: 0.36, shadowTop: 1,
  },
};

export function paintFace(kind, headMesh, closed) {
  const S = STYLE[kind] || STYLE.male;
  const W = 1536, H = 768;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = S.skin; x.fillRect(0, 0, W, H);

  headMesh.updateMatrixWorld(true);
  const rc = new T.Raycaster(), o = new T.Vector3(), d = new T.Vector3(0, 0, -1);
  const P = (px, py) => {
    o.set(px, py, 1); rc.set(o, d);
    const h = rc.intersectObject(headMesh, false)[0];
    return h && h.uv ? [h.uv.x * W, (1 - h.uv.y) * H] : null;
  };
  const a0 = P(-0.01, 0), a1 = P(0.01, 0);
  const k = Math.abs(a1[0] - a0[0]) / 0.02; // pixels per metre at the face centre
  const map = (pts) => pts.map((p) => P(p[0], p[1])).filter(Boolean);
  const path = (pm) => { x.beginPath(); pm.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); };
  const stroke = (pts, lw, col, alpha = 1) => {
    const pm = map(pts); if (pm.length < 2) return;
    x.save(); x.globalAlpha = alpha; x.strokeStyle = col; x.lineWidth = lw * k; x.lineCap = 'round'; x.lineJoin = 'round'; path(pm); x.stroke(); x.restore();
  };
  const taper = (pts, w0, w1, col, alpha = 1) => {
    x.save(); x.globalAlpha = alpha; x.strokeStyle = col; x.lineCap = 'round';
    for (let i = 0; i < pts.length - 1; i++) {
      const a = P(pts[i][0], pts[i][1]), b = P(pts[i + 1][0], pts[i + 1][1]); if (!a || !b) continue;
      x.lineWidth = (w0 + (w1 - w0) * (i / (pts.length - 2))) * k;
      x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
    }
    x.restore();
  };
  const blob = (cx, cy, rx, ry, col0, col1) => {
    const p = P(cx, cy), q = P(cx + rx, cy), r = P(cx, cy + ry); if (!p || !q || !r) return;
    x.save(); x.translate(p[0], p[1]); x.scale(Math.abs(q[0] - p[0]), Math.abs(r[1] - p[1]));
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, col0); g.addColorStop(1, col1);
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill(); x.restore();
  };
  const sample = (fn, n) => { const out = []; for (let i = 0; i <= n; i++) out.push(fn(i / n)); return out; };

  // ---- soft face shading: cheeks, nose, forehead shadow under bangs
  [-1, 1].forEach((s) => blob(s * 0.046, -0.026, 0.02, 0.013, 'rgba(238,110,120,' + S.blush + ')', 'rgba(238,110,120,0)'));
  blob(0, -0.05, 0.05, 0.03, 'rgba(120,70,50,0.08)', 'rgba(120,70,50,0)');
  if (S.shadowTop) blob(0, 0.07, 0.07, 0.03, 'rgba(90,50,40,0.22)', 'rgba(90,50,40,0)');
  if (S.shadowTop) [-1, 1].forEach((s) => blob(s * 0.04, S.ey + 0.03, 0.026, 0.012, 'rgba(235,130,140,0.18)', 'rgba(235,130,140,0)'));

  // ---- eyes
  [-1, 1].forEach((s) => {
    const upper = (t) => {
      const xx = s * (S.inner + t * S.ew);
      return [xx, S.ey + S.hu * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.9) * (1 - 0.18 * t) + S.tilt * t];
    };
    const lower = (t) => {
      const xx = s * (S.inner + t * S.ew);
      return [xx, S.ey - S.hl * Math.sin(Math.PI * t) + S.tilt * t * 0.7 - 0.0016];
    };
    const up = sample(upper, 28), lo = sample(lower, 28);
    if (closed) {
      const arc = sample((t) => [s * (S.inner + t * S.ew), S.ey - 0.004 * Math.sin(Math.PI * t) + S.tilt * t * 0.8], 24);
      taper(arc, S.lash * 0.7, S.lash * 1.5, '#1b1210');
      stroke(sample((t) => [s * (S.inner + t * S.ew), S.ey + 0.006 - 0.003 * Math.sin(Math.PI * t) + S.tilt * t], 16), 0.0012, '#a06a58', 0.5);
      return;
    }
    // eye white + clipped contents
    const outline = map(up.concat(lo.slice().reverse()));
    x.save(); path(outline); x.closePath(); x.clip();
    x.fillStyle = '#fffaf5'; x.fillRect(0, 0, W, H);
    const ccx = s * (S.inner + S.ew * 0.5), ccy = S.ey + 0.0018;
    const p = P(ccx, ccy), q = P(ccx + S.ir, ccy), r = P(ccx, ccy + S.irh);
    if (p && q && r) {
      x.save(); x.translate(p[0], p[1]); x.scale(Math.abs(q[0] - p[0]), Math.abs(r[1] - p[1]));
      const g = x.createLinearGradient(0, -1, 0, 1);
      g.addColorStop(0, S.irisTop); g.addColorStop(0.45, S.irisMid); g.addColorStop(1, S.irisBot);
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill();
      const rg = x.createRadialGradient(0, 0.05, 0.55, 0, 0.05, 1);
      rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(10,15,40,0.55)');
      x.fillStyle = rg; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill();
      x.fillStyle = '#080a14'; x.beginPath(); x.ellipse(0, -0.05, 0.4, 0.46, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.97)'; x.beginPath(); x.ellipse(-0.34 * s, -0.42, 0.3, 0.34, -0.3 * s, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.ellipse(0.36 * s, 0.5, 0.14, 0.16, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.arc(0.05 * s, 0.72, 0.07, 0, 7); x.fill();
      x.restore();
    }
    // upper-lid shadow inside the eye
    x.save(); x.globalAlpha = 0.4; x.strokeStyle = '#6b4a46'; x.lineWidth = 0.0055 * k; path(map(up)); x.stroke(); x.restore();
    x.restore();
    // lash line (thicker toward the outer corner) + wing
    taper(up, S.lash * 0.55, S.lash * 1.5, '#1b1210');
    const tip = up[up.length - 1];
    taper([tip, [tip[0] + s * S.wing * 0.7, tip[1] + S.wing * 0.55], [tip[0] + s * S.wing * 1.2, tip[1] + S.wing * 0.95]], S.lash * 1.1, S.lash * 0.15, '#1b1210');
    stroke(lo.slice(4, 24), 0.0009, '#4a2f2c', 0.8);
    for (let i = 0; i < S.lashes; i++) {
      const t = 0.62 + i * 0.13, a = upper(t);
      taper([a, [a[0] + s * 0.0035, a[1] + 0.0038], [a[0] + s * 0.0068, a[1] + 0.0062]], 0.0012, 0.0002, '#1b1210', 0.95);
    }
    stroke(sample((t) => { const a = upper(t); return [a[0] + s * 0.0006, a[1] + 0.0065 + 0.0025 * Math.sin(Math.PI * t)]; }, 18), 0.0011, '#a06a58', 0.55);
  });

  // ---- eyebrows
  [-1, 1].forEach((s) => {
    const B = S.brow;
    const pts = sample((t) => [s * (0.012 + t * 0.045), S.ey + B.y + Math.sin(Math.PI * t * 0.9) * B.arch + t * B.tilt - t * t * 0.0055], 18);
    taper(pts, B.w0, B.w1, B.col, 0.96);
  });

  // ---- nose (anime: just a hint)
  stroke(sample((t) => [0.0045 + t * 0.002, -0.016 - t * 0.02], 8), 0.0011, '#9a6048', 0.5);
  stroke(sample((t) => [-0.0075 + t * 0.0085, -0.0405 - 0.0018 * Math.sin(Math.PI * t)], 8), 0.0011, '#8a5240', 0.6);
  blob(0.001, -0.0345, 0.0035, 0.0028, 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)');

  // ---- mouth
  const M = S.mouth;
  const mline = sample((t) => { const xx = (t * 2 - 1) * M.w; return [xx, M.y + M.smile * xx * xx / (M.w * M.w) - 0.0016 * Math.sin(Math.PI * t)]; }, 20);
  if (M.lip) {
    blob(0, M.y - 0.0036, M.w * 0.62, 0.0042, 'rgba(235,120,130,0.9)', 'rgba(235,120,130,0)');
    blob(-0.002, M.y - 0.0044, 0.0042, 0.0016, 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)');
  } else {
    blob(0, M.y - 0.0032, M.w * 0.55, 0.0034, 'rgba(190,100,95,0.55)', 'rgba(190,100,95,0)');
  }
  taper(mline, 0.0011, 0.0018, M.col, 1);
  stroke([[mline[0][0] - 0.0012, mline[0][1] + 0.0016], [mline[0][0], mline[0][1]]], 0.0009, M.col, 0.8);
  stroke([[mline[20][0] + 0.0012, mline[20][1] + 0.0016], [mline[20][0], mline[20][1]]], 0.0009, M.col, 0.8);

  const tex = new T.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}
