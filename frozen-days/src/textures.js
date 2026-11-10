// Procedural canvas textures (no external assets): fabrics, hair, eyes, skin pores, environment map.
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
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * k)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) * k)), b = Math.max(0, Math.min(255, (n & 255) * k));
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}
function speckle(ctx, w, h, seed, n, a) {
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')';
    ctx.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
  }
}

// Quilted puffer fabric: horizontal baffles (v runs along the limb/torso). Optional front zipper at u = 0.5.
export function quilted(base, bands, { zip = false, seed = 1 } = {}) {
  const W = 256, H = 512, bh = H / bands;
  const [c, x] = cv(W, H), [bc, bx] = cv(W, H);
  x.fillStyle = hex(base); x.fillRect(0, 0, W, H);
  bx.fillStyle = '#808080'; bx.fillRect(0, 0, W, H);
  for (let i = 0; i < bands; i++) {
    const y0 = i * bh;
    const g = x.createLinearGradient(0, y0, 0, y0 + bh);
    g.addColorStop(0, 'rgba(0,0,0,0.38)'); g.addColorStop(0.18, 'rgba(0,0,0,0.05)'); g.addColorStop(0.5, 'rgba(255,255,255,0.20)'); g.addColorStop(0.82, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.38)');
    x.fillStyle = g; x.fillRect(0, y0, W, bh);
    const bg = bx.createLinearGradient(0, y0, 0, y0 + bh);
    bg.addColorStop(0, '#101010'); bg.addColorStop(0.3, '#b0b0b0'); bg.addColorStop(0.5, '#f0f0f0'); bg.addColorStop(0.7, '#b0b0b0'); bg.addColorStop(1, '#101010');
    bx.fillStyle = bg; bx.fillRect(0, y0, W, bh);
    x.fillStyle = 'rgba(10,15,25,0.55)'; x.fillRect(0, y0 - 1.5, W, 3); // stitched seam
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(0, y0 + 2, W, 1);
  }
  speckle(x, W, H, seed, 2600, 0.05);
  if (zip) {
    x.fillStyle = 'rgba(15,18,24,0.9)'; x.fillRect(W / 2 - 3, 0, 6, H);
    x.fillStyle = '#c9d1d9'; for (let y = 0; y < H; y += 8) x.fillRect(W / 2 - 1.5, y, 3, 4);
    bx.fillStyle = '#202020'; bx.fillRect(W / 2 - 3, 0, 6, H);
  }
  const m = tex(c), b = tex(bc);
  return { map: m, bump: b };
}

// Knit fabric (scarf, cuffs, gloves): rows of V stitches.
export function knit(base, rx = 4, ry = 4) {
  const S = 256, cw = 16, ch = 20;
  const [c, x] = cv(S, S), [bc, bx] = cv(S, S);
  x.fillStyle = hex(base); x.fillRect(0, 0, S, S);
  bx.fillStyle = '#707070'; bx.fillRect(0, 0, S, S);
  x.lineCap = bx.lineCap = 'round';
  for (let r = 0; r * ch < S + ch; r++) {
    for (let k = 0; k * cw < S + cw; k++) {
      const px = k * cw, py = r * ch;
      x.strokeStyle = shade(base, 0.62); x.lineWidth = 3.2;
      x.beginPath(); x.moveTo(px + 1, py); x.lineTo(px + cw / 2, py + ch * 0.85); x.lineTo(px + cw - 1, py); x.stroke();
      x.strokeStyle = shade(base, 1.18); x.lineWidth = 2;
      x.beginPath(); x.moveTo(px + 2, py - 1); x.lineTo(px + cw / 2, py + ch * 0.75); x.lineTo(px + cw - 2, py - 1); x.stroke();
      bx.strokeStyle = '#f2f2f2'; bx.lineWidth = 3;
      bx.beginPath(); bx.moveTo(px + 2, py - 1); bx.lineTo(px + cw / 2, py + ch * 0.75); bx.lineTo(px + cw - 2, py - 1); bx.stroke();
    }
  }
  return { map: tex(c, rx, ry), bump: tex(bc, rx, ry) };
}

// Twill/denim style trousers.
export function twill(base, rx = 3, ry = 3) {
  const S = 256;
  const [c, x] = cv(S, S), [bc, bx] = cv(S, S);
  x.fillStyle = hex(base); x.fillRect(0, 0, S, S);
  bx.fillStyle = '#808080'; bx.fillRect(0, 0, S, S);
  for (let i = -S; i < S * 2; i += 8) {
    x.strokeStyle = i % 16 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)'; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + S, S); x.stroke();
    bx.strokeStyle = i % 8 === 0 ? '#b8b8b8' : '#505050'; bx.lineWidth = 1.5;
    bx.beginPath(); bx.moveTo(i, 0); bx.lineTo(i + S, S); bx.stroke();
  }
  speckle(x, S, S, 9, 1800, 0.06);
  return { map: tex(c, rx, ry), bump: tex(bc, rx, ry) };
}

// Leather / synthetic boot grain.
export function leather(base) {
  const S = 128;
  const [c, x] = cv(S, S), [bc, bx] = cv(S, S);
  x.fillStyle = hex(base); x.fillRect(0, 0, S, S);
  bx.fillStyle = '#909090'; bx.fillRect(0, 0, S, S);
  const r = mulberry32(21);
  for (let i = 0; i < 700; i++) {
    const px = r() * S, py = r() * S, rad = 1 + r() * 2.2;
    x.fillStyle = 'rgba(0,0,0,0.05)'; x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
    bx.fillStyle = r() > 0.5 ? '#6c6c6c' : '#b4b4b4'; bx.beginPath(); bx.arc(px, py, rad, 0, 7); bx.fill();
  }
  return { map: tex(c, 3, 3), bump: tex(bc, 3, 3) };
}

// Hair strands: vertical strands along lathe v, with a glossy highlight band.
export function hair(base) {
  const W = 256, H = 256;
  const [c, x] = cv(W, H), [bc, bx] = cv(W, H);
  x.fillStyle = shade(base, 0.8); x.fillRect(0, 0, W, H);
  bx.fillStyle = '#808080'; bx.fillRect(0, 0, W, H);
  const r = mulberry32(33);
  for (let i = 0; i < 900; i++) {
    const px = r() * W, l = 60 + r() * 190, py = r() * H;
    const k = 0.6 + r() * 0.9;
    x.strokeStyle = shade(base, k) ; x.globalAlpha = 0.35; x.lineWidth = 0.8 + r() * 1.4;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + (r() - 0.5) * 6, py + l / 2, px + (r() - 0.5) * 8, py + l); x.stroke();
    bx.strokeStyle = r() > 0.5 ? '#c8c8c8' : '#4a4a4a'; bx.globalAlpha = 0.5; bx.lineWidth = 1;
    bx.beginPath(); bx.moveTo(px, py); bx.lineTo(px + (r() - 0.5) * 6, py + l); bx.stroke();
  }
  x.globalAlpha = 1; bx.globalAlpha = 1;
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,235,215,0.10)'); g.addColorStop(0.5, 'rgba(255,235,215,0.16)'); g.addColorStop(0.58, 'rgba(255,235,215,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  return { map: tex(c, 3, 1), bump: tex(bc, 3, 1) };
}

// Eyeball (equirect): the front of the sphere is at u = 0.25, v = 0.5.
export function eye(irisHex, ringHex) {
  const W = 512, H = 256, cx = 128, cy = 128;
  const [c, x] = cv(W, H);
  const sg = x.createLinearGradient(0, 0, W, 0);
  sg.addColorStop(0, '#c9bfb9'); sg.addColorStop(0.25, '#f6f3f0'); sg.addColorStop(0.5, '#c9bfb9'); sg.addColorStop(1, '#c9bfb9');
  x.fillStyle = sg; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(200,90,90,0.25)'; x.lineWidth = 1;
  for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28; x.beginPath(); x.moveTo(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52); x.lineTo(cx + Math.cos(a) * 80, cy + Math.sin(a) * 80); x.stroke(); }
  const R = 40;
  const ig = x.createRadialGradient(cx, cy, 8, cx, cy, R);
  ig.addColorStop(0, shade(irisHex, 1.35)); ig.addColorStop(0.55, hex(irisHex)); ig.addColorStop(0.92, shade(irisHex, 0.55)); ig.addColorStop(1, hex(ringHex));
  x.fillStyle = ig; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
  x.lineWidth = 1;
  for (let i = 0; i < 70; i++) { // radial iris fibres
    const a = (i / 70) * 6.283; x.strokeStyle = i % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.16)';
    x.beginPath(); x.moveTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12); x.lineTo(cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2)); x.stroke();
  }
  x.strokeStyle = hex(ringHex); x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, R - 1, 0, 7); x.stroke();
  x.fillStyle = '#050505'; x.beginPath(); x.arc(cx, cy, 14, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.ellipse(cx - 11, cy - 13, 7, 5, -0.5, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.45)'; x.beginPath(); x.arc(cx + 12, cy + 12, 3.5, 0, 7); x.fill();
  const t = new T.CanvasTexture(c); t.anisotropy = 4;
  return t;
}

// Fine skin pore bump map (tiled).
export function skinPores() {
  const S = 256, [c, x] = cv(S, S), r = mulberry32(77);
  x.fillStyle = '#808080'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) { x.fillStyle = r() > 0.5 ? '#6a6a6a' : '#969696'; x.beginPath(); x.arc(r() * S, r() * S, 0.7 + r() * 1.1, 0, 7); x.fill(); }
  return tex(c, 6, 6);
}

// Soft sky/snow environment for reflections on the ice, boots and skin sheen.
export function makeEnvironment(renderer) {
  const sky = new T.Scene();
  const geo = new T.SphereGeometry(50, 24, 16);
  const col = [], p = geo.attributes.position, top = new T.Color(0x9cc4ee), mid = new T.Color(0xf6fbff), bot = new T.Color(0xdce7f2), c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 50;
    if (y > 0) c.copy(mid).lerp(top, Math.pow(y, 0.7)); else c.copy(mid).lerp(bot, Math.min(1, -y * 2));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  sky.add(new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
  const sun = new T.Mesh(new T.SphereGeometry(5, 8, 6), new T.MeshBasicMaterial({ color: 0xfff4dc }));
  sun.position.set(25, 35, 20); sky.add(sun);
  const pm = new T.PMREMGenerator(renderer);
  const rt = pm.fromScene(sky, 0.03);
  pm.dispose();
  return rt.texture;
}
