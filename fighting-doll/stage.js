// Procedural arena backgrounds (3 themes), cached to offscreen canvases.
export const W = 720, H = 1280, GROUND = 880, FLOOR_TOP = 790, PANEL_TOP = 935;

function mk(w, h, scale) { const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale; const x = c.getContext('2d'); x.scale(scale, scale); return [c, x]; }
function lin(x, y0, y1, stops) { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }

const THEMES = [
  { sky: [[0, '#5ec8ff'], [0.6, '#bdeeff'], [1, '#fff7d6']], sun: '#ffe45e', sunY: 250, hill1: '#7be07a', hill2: '#4fc46a', floor: ['#ffe2a8', '#f2b96b'], rope: ['#ff5d8f', '#ffd23f', '#4aa3ff'], stars: false },
  { sky: [[0, '#ff7eb3'], [0.55, '#ffb38a'], [1, '#ffe9a8']], sun: '#fff1a0', sunY: 420, hill1: '#d56fb0', hill2: '#a8509a', floor: ['#ffd9b8', '#e8a27a'], rope: ['#ff4d6d', '#ffe066', '#ff9f1c'], stars: false },
  { sky: [[0, '#150f4a'], [0.6, '#4b3a9a'], [1, '#9a7ad8']], sun: '#f5f3ff', sunY: 230, hill1: '#4a3f93', hill2: '#352c78', floor: ['#8e7fd6', '#5f4fb0'], rope: ['#7df9ff', '#ff7ee8', '#ffe066'], stars: true },
];

export function makeStage(theme, scale) {
  const T = THEMES[theme % THEMES.length];
  const [bc, b] = mk(W, H, scale);
  b.fillStyle = lin(b, 0, 800, T.sky); b.fillRect(0, 0, W, 940);
  if (T.stars) {
    for (let i = 0; i < 70; i++) { b.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`; const r = Math.random() * 2.4 + 0.6; b.beginPath(); b.arc(Math.random() * W, Math.random() * 560, r, 0, 7); b.fill(); }
  }
  // sun / moon with glow
  const sg = b.createRadialGradient(540, T.sunY, 10, 540, T.sunY, 230);
  sg.addColorStop(0, 'rgba(255,255,255,0.9)'); sg.addColorStop(0.3, 'rgba(255,240,150,0.45)'); sg.addColorStop(1, 'rgba(255,240,150,0)');
  b.fillStyle = sg; b.fillRect(0, 0, W, 800);
  b.fillStyle = T.sun; b.beginPath(); b.arc(540, T.sunY, 78, 0, 7); b.fill();
  if (theme === 2) { b.fillStyle = 'rgba(120,100,200,0.35)'; b.beginPath(); b.arc(515, T.sunY - 14, 70, 0, 7); b.fill(); b.fillStyle = T.sun; b.beginPath(); b.arc(540, T.sunY, 78, 0, 7); b.fill(); b.globalCompositeOperation = 'destination-out'; b.beginPath(); b.arc(500, T.sunY - 12, 66, 0, 7); b.fill(); b.globalCompositeOperation = 'source-over'; }
  // rainbow (day only)
  if (theme === 0) {
    const cols = ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
    cols.forEach((c, i) => { b.strokeStyle = c; b.globalAlpha = 0.55; b.lineWidth = 16; b.beginPath(); b.arc(150, 760, 330 - i * 16, Math.PI, 0); b.stroke(); });
    b.globalAlpha = 1;
  }

  const [fc, f] = mk(W, H, scale);
  // far hills
  f.fillStyle = T.hill1;
  f.beginPath(); f.moveTo(0, 700); f.quadraticCurveTo(120, 560, 260, 650); f.quadraticCurveTo(380, 720, 500, 600); f.quadraticCurveTo(620, 520, 720, 640); f.lineTo(720, 800); f.lineTo(0, 800); f.fill();
  f.fillStyle = T.hill2;
  f.beginPath(); f.moveTo(0, 740); f.quadraticCurveTo(160, 650, 320, 740); f.quadraticCurveTo(470, 800, 600, 700); f.quadraticCurveTo(680, 660, 720, 700); f.lineTo(720, 820); f.lineTo(0, 820); f.fill();
  // floating balloons/flowers dots on hills
  for (let i = 0; i < 18; i++) { f.fillStyle = ['#fff', '#ffe066', '#ff8fab'][i % 3]; f.beginPath(); f.arc(20 + i * 41 + (i % 2) * 12, 760 + ((i * 37) % 40), 5, 0, 7); f.fill(); }
  // ring floor (trapezoid, perspective)
  f.fillStyle = lin(f, FLOOR_TOP, PANEL_TOP, [[0, T.floor[0]], [1, T.floor[1]]]);
  f.beginPath(); f.moveTo(60, FLOOR_TOP); f.lineTo(660, FLOOR_TOP); f.lineTo(740, PANEL_TOP); f.lineTo(-20, PANEL_TOP); f.closePath(); f.fill();
  // floor stripes
  f.save(); f.beginPath(); f.moveTo(60, FLOOR_TOP); f.lineTo(660, FLOOR_TOP); f.lineTo(740, PANEL_TOP); f.lineTo(-20, PANEL_TOP); f.closePath(); f.clip();
  for (let i = -4; i < 14; i++) { f.fillStyle = i % 2 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.05)'; f.beginPath(); f.moveTo(60 + i * 50, FLOOR_TOP); f.lineTo(60 + i * 50 + 50, FLOOR_TOP); f.lineTo(60 + i * 50 + 50 + (i - 5.5) * 12, PANEL_TOP); f.lineTo(60 + i * 50 + (i - 5.5) * 12, PANEL_TOP); f.fill(); }
  f.restore();
  // star in center of floor
  f.fillStyle = 'rgba(255,255,255,0.35)'; f.beginPath(); f.ellipse(360, 870, 160, 36, 0, 0, 7); f.fill();
  // front edge of ring
  f.fillStyle = T.rope[0]; f.fillRect(-20, PANEL_TOP - 12, 780, 14);
  // posts + ropes at back
  for (const x of [48, 672]) {
    f.fillStyle = '#ffffff'; f.beginPath(); f.roundRect(x - 14, 560, 28, 240, 12); f.fill();
    f.fillStyle = T.rope[1]; f.beginPath(); f.arc(x, 560, 22, 0, 7); f.fill();
    f.fillStyle = 'rgba(0,0,0,0.12)'; f.fillRect(x + 4, 575, 10, 220);
  }
  T.rope.forEach((c, i) => { const y = 620 + i * 62; f.strokeStyle = c; f.lineWidth = 12; f.lineCap = 'round'; f.beginPath(); f.moveTo(48, y); f.quadraticCurveTo(360, y + 22, 672, y); f.stroke(); f.strokeStyle = 'rgba(255,255,255,0.45)'; f.lineWidth = 3; f.beginPath(); f.moveTo(60, y - 3); f.quadraticCurveTo(360, y + 19, 660, y - 3); f.stroke(); });
  // control panel background
  f.fillStyle = lin(f, PANEL_TOP, H, [[0, '#3b1f7a'], [1, '#1d0f45']]); f.fillRect(0, PANEL_TOP, W, H - PANEL_TOP);
  f.fillStyle = 'rgba(255,255,255,0.05)';
  for (let y = PANEL_TOP + 20; y < H; y += 36) for (let x = ((y / 36) % 2) * 18; x < W; x += 36) { f.beginPath(); f.arc(x, y, 5, 0, 7); f.fill(); }
  f.fillStyle = '#ffd23f'; f.fillRect(0, PANEL_TOP, W, 6);
  return { back: bc, front: fc, theme, scale, clouds: Array.from({ length: 6 }, (_, i) => ({ x: i * 150, y: 90 + (i % 3) * 110 + (i * 17) % 40, s: 0.7 + (i % 3) * 0.3, v: 8 + i * 3 })) };
}

export function drawStageBack(ctx, st, t) {
  ctx.drawImage(st.back, 0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = st.theme === 2 ? 0.25 : 0.85;
  ctx.fillStyle = '#fff';
  for (const c of st.clouds) {
    const x = ((c.x + t * c.v) % (W + 300)) - 150;
    ctx.beginPath();
    ctx.arc(x, c.y, 34 * c.s, 0, 7); ctx.arc(x + 36 * c.s, c.y - 16 * c.s, 42 * c.s, 0, 7); ctx.arc(x + 78 * c.s, c.y, 34 * c.s, 0, 7); ctx.rect(x, c.y, 78 * c.s, 34 * c.s);
    ctx.fill();
  }
  ctx.restore();
}
export function drawStageFront(ctx, st) { ctx.drawImage(st.front, 0, 0, W, H); }
