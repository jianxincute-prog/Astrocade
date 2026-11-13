// Procedural canvas textures for the city: facades (lit windows via emissive maps), roofs, paving, signs, emblems.
// Everything is drawn once at start-up; no assets are loaded.

export function canvasTex(T, w, h, draw, { repeat = true, aniso = 4 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = aniso;
  if (T.sRGBEncoding) t.encoding = T.sRGBEncoding;
  return t;
}

let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
export const reseed = (s) => { seed = (s % 2147483646) + 1; };

function grain(ctx, w, h, amt = 0.06, n = 3000, size = 2) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${rnd() * amt})`;
    ctx.fillRect(rnd() * w, rnd() * h, size, size);
  }
}

// ------------------------------------------------------------------ facades: 8 bays x 8 floors per 512 px tile
const N = 8, CELLPX = 64;

/** Draw a facade tile. cell(ctx, x, y, fx, fy) draws one bay/floor; returns {map, emis}. */
function facade(T, base, cell, lit = '#ffd38a', litChance = 0.4, extra) {
  const lights = [];
  const map = canvasTex(T, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    if (extra && extra.before) extra.before(ctx, w, h);
    for (let fy = 0; fy < N; fy++) for (let fx = 0; fx < N; fx++) {
      const on = rnd() < litChance; lights.push(on);
      cell(ctx, fx * CELLPX, fy * CELLPX, fx, fy, on, rnd);
    }
    if (extra && extra.after) extra.after(ctx, w, h);
    grain(ctx, w, h, 0.05, 2500);
  });
  const emis = canvasTex(T, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    lights.forEach((on, i) => {
      if (!on) return;
      const x = (i % N) * CELLPX, y = Math.floor(i / N) * CELLPX;
      ctx.fillStyle = lit; ctx.globalAlpha = 0.65 + rnd() * 0.35;
      ctx.fillRect(x + 14, y + 14, 36, 36); ctx.globalAlpha = 1;
    });
  });
  return { map, emis };
}

function glass(ctx, x, y, w, h, dark = '#1c2a38', light = '#4d6a85') {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, light); g.addColorStop(0.55, dark); g.addColorStop(1, '#0f1822');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}

export function makeFacades(T) {
  reseed(11);
  const F = {};
  // red-brick tenement with stone lintels and sills (Red Wolves / downtown)
  F.brick = facade(T, '#a85d45', (ctx, x, y, fx, fy, on) => {
    ctx.fillStyle = '#d6cdbf'; ctx.fillRect(x + 11, y + 10, 42, 5);                // lintel
    ctx.fillStyle = '#251a15'; ctx.fillRect(x + 14, y + 15, 36, 42);               // frame
    glass(ctx, x + 17, y + 18, 30, 36, '#1d2a3a', on ? '#8a6a3a' : '#506a85');
    ctx.fillStyle = '#251a15'; ctx.fillRect(x + 31, y + 18, 2, 36); ctx.fillRect(x + 17, y + 34, 30, 2);
    ctx.fillStyle = '#c9c0b2'; ctx.fillRect(x + 11, y + 57, 42, 4);                // sill
    if (rnd() < 0.18) { ctx.fillStyle = 'rgba(200,190,170,.75)'; ctx.fillRect(x + 18, y + 19, 12, 34); }   // curtain
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + 62, 64, 2);
  }, '#ffc070', 0.34, {
    before(ctx, w, h) {
      ctx.strokeStyle = 'rgba(40,15,10,.45)'; ctx.lineWidth = 1;
      for (let yy = 0; yy < h; yy += 8) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke(); for (let xx = ((yy / 8) % 2) * 8; xx < w; xx += 16) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 8); ctx.stroke(); } }
    },
    after(ctx, w, h) { for (let i = 0; i < 14; i++) { const g = ctx.createLinearGradient(0, 0, 0, 90); const x = rnd() * w, y = rnd() * h; g.addColorStop(0, 'rgba(60,35,20,.28)'); g.addColorStop(1, 'rgba(60,35,20,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, 5 + rnd() * 8, 90); } },
  });
  // industrial: concrete / dirty brick with wide steel-framed factory windows
  F.industrial = facade(T, '#8a8478', (ctx, x, y, fx, fy, on) => {
    ctx.fillStyle = '#2b2a28'; ctx.fillRect(x + 4, y + 12, 56, 38);
    glass(ctx, x + 7, y + 15, 50, 32, '#243038', on ? '#a6823e' : '#5f7482');
    ctx.strokeStyle = '#1d1c1a'; ctx.lineWidth = 2;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 7 + k * 12.5, y + 15); ctx.lineTo(x + 7 + k * 12.5, y + 47); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x + 7, y + 31); ctx.lineTo(x + 57, y + 31); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x, y + 58, 64, 6);
  }, '#ffcf80', 0.28, {
    before(ctx, w, h) { grain(ctx, w, h, 0.14, 4000, 3); },
    after(ctx, w, h) { for (let i = 0; i < 22; i++) { const g = ctx.createLinearGradient(0, 0, 0, 110); const x = rnd() * w, y = rnd() * h; g.addColorStop(0, 'rgba(120,60,20,.30)'); g.addColorStop(1, 'rgba(120,60,20,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, 3 + rnd() * 6, 110); } },
  });
  // old-town plaster shophouse: lattice windows, red lacquer frames, balcony rail
  F.shop = facade(T, '#3a5f73', (ctx, x, y, fx, fy, on) => {
    ctx.fillStyle = '#8c1d1d'; ctx.fillRect(x + 10, y + 8, 44, 46);                 // red lacquer frame
    ctx.fillStyle = '#1c1511'; ctx.fillRect(x + 14, y + 12, 36, 38);
    glass(ctx, x + 16, y + 14, 32, 34, '#2a2018', on ? '#c9923e' : '#6d7c70');
    ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 2;                                 // wooden lattice
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 16 + k * 8, y + 14); ctx.lineTo(x + 16 + k * 8, y + 48); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 16, y + 14 + k * 8.5); ctx.lineTo(x + 48, y + 14 + k * 8.5); ctx.stroke(); }
    ctx.fillStyle = '#c9a14a'; ctx.fillRect(x + 8, y + 54, 48, 3);                  // gold rail cap
    ctx.fillStyle = '#6a1414'; for (let k = 0; k < 8; k++) ctx.fillRect(x + 9 + k * 6, y + 57, 3, 6);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x, y + 62, 64, 2);
  }, '#ffb55a', 0.42, { before(ctx, w, h) { ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let k = 0; k < 60; k++) ctx.fillRect(0, rnd() * h, w, 1); } });
  // art-deco: cream limestone with gold piers and tall narrow windows
  F.deco = facade(T, '#d8cdb4', (ctx, x, y, fx, fy, on) => {
    ctx.fillStyle = '#b8892f'; ctx.fillRect(x + 28, y, 8, 64);                      // gold pier between bays
    ctx.fillStyle = '#e9d9a5'; ctx.fillRect(x + 30, y, 4, 64);
    ctx.fillStyle = '#2d2418'; ctx.fillRect(x + 6, y + 6, 20, 52);
    glass(ctx, x + 8, y + 8, 16, 48, '#1b2430', on ? '#d9a84a' : '#6a7f96');
    ctx.fillStyle = '#c59a3c'; ctx.fillRect(x + 6, y + 58, 20, 3);                  // gold spandrel
    ctx.fillStyle = '#2d2418'; ctx.fillRect(x + 38, y + 6, 20, 52);
    glass(ctx, x + 40, y + 8, 16, 48, '#1b2430', on ? '#d9a84a' : '#6a7f96');
    ctx.fillStyle = '#c59a3c'; ctx.fillRect(x + 38, y + 58, 20, 3);
  }, '#ffd68a', 0.4, {});
  // modern glass curtain wall
  F.glass = facade(T, '#26333f', (ctx, x, y, fx, fy, on) => {
    glass(ctx, x + 2, y + 2, 60, 60, '#17222d', on ? '#a89060' : '#5a7a96');
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(x + 2, y + 2, 28, 60);
    ctx.fillStyle = '#10161c'; ctx.fillRect(x, y, 64, 3); ctx.fillRect(x, y, 3, 64);
    ctx.fillStyle = '#3c4a57'; ctx.fillRect(x, y + 61, 64, 3);
  }, '#bfe4ff', 0.36, {});
  // limestone civic with arched windows
  F.stone = facade(T, '#c8bda6', (ctx, x, y, fx, fy, on) => {
    ctx.fillStyle = '#6e6252'; ctx.beginPath(); ctx.moveTo(x + 14, y + 56); ctx.lineTo(x + 14, y + 26); ctx.arc(x + 32, y + 26, 18, Math.PI, 0); ctx.lineTo(x + 50, y + 56); ctx.closePath(); ctx.fill();
    ctx.fillStyle = on ? '#caa05a' : '#33414f'; ctx.beginPath(); ctx.moveTo(x + 18, y + 54); ctx.lineTo(x + 18, y + 27); ctx.arc(x + 32, y + 27, 14, Math.PI, 0); ctx.lineTo(x + 46, y + 54); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6e6252'; ctx.fillRect(x + 31, y + 14, 2, 40);
    ctx.fillStyle = '#a89c84'; ctx.fillRect(x + 8, y + 56, 48, 5);
  }, '#ffd7a0', 0.3, {});
  return F;
}

// ------------------------------------------------------------------ roofs & surfaces
export function makeSurfaces(T) {
  reseed(5);
  const S = {};
  S.asphalt = canvasTex(T, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#4a4c52'; ctx.fillRect(0, 0, w, h); grain(ctx, w, h, 0.1, 9000);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); let x = rnd() * w, y = rnd() * h; ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; ctx.lineTo(x, y); } ctx.stroke(); }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.08})`; ctx.beginPath(); ctx.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 40, 10 + rnd() * 20, rnd() * 3, 0, 7); ctx.fill(); }
  });
  S.asphalt.repeat.set(50, 50);
  const slabs = (base, line, grime, cols = 4) => canvasTex(T, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h); grain(ctx, w, h, 0.09, 3500);
    ctx.strokeStyle = line; ctx.lineWidth = 2;
    for (let k = 0; k <= cols; k++) { ctx.beginPath(); ctx.moveTo(k * w / cols, 0); ctx.lineTo(k * w / cols, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, k * h / cols); ctx.lineTo(w, k * h / cols); ctx.stroke(); }
    ctx.fillStyle = grime; for (let i = 0; i < 12; i++) ctx.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 24, 5 + rnd() * 18);
  });
  S.walkWolves = slabs('#85817a', 'rgba(0,0,0,.35)', 'rgba(20,18,15,.10)', 4);        // dirty concrete
  S.walkDragons = canvasTex(T, 256, 256, (ctx, w, h) => {                              // slate tiles with red-brick border
    ctx.fillStyle = '#56606a'; ctx.fillRect(0, 0, w, h); grain(ctx, w, h, 0.08, 3000);
    ctx.strokeStyle = 'rgba(15,20,25,.5)'; ctx.lineWidth = 2;
    for (let k = 0; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(k * 64, 0); ctx.lineTo(k * 64, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, k * 64); ctx.lineTo(w, k * 64); ctx.stroke(); }
    ctx.fillStyle = 'rgba(140,40,35,.55)'; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if ((a + b) % 2 === 0) { ctx.beginPath(); ctx.arc(a * 64 + 32, b * 64 + 32, 9, 0, 7); ctx.fill(); }
  });
  S.walkCobras = canvasTex(T, 256, 256, (ctx, w, h) => {                               // cream marble with gold inlay
    ctx.fillStyle = '#d9d0bd'; ctx.fillRect(0, 0, w, h); grain(ctx, w, h, 0.06, 2500);
    ctx.strokeStyle = 'rgba(120,100,70,.18)'; ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(rnd() * w, 0); ctx.bezierCurveTo(rnd() * w, 80, rnd() * w, 170, rnd() * w, h); ctx.stroke(); }
    ctx.strokeStyle = '#b8892f'; ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4); ctx.beginPath(); ctx.moveTo(w / 2, 2); ctx.lineTo(w - 2, h / 2); ctx.lineTo(w / 2, h - 2); ctx.lineTo(2, h / 2); ctx.closePath(); ctx.stroke();
  });
  S.walkPlaza = slabs('#b9ad98', 'rgba(70,55,40,.4)', 'rgba(80,60,40,.07)', 4);
  S.gravel = canvasTex(T, 256, 256, (ctx, w, h) => { ctx.fillStyle = '#5a5a58'; ctx.fillRect(0, 0, w, h); grain(ctx, w, h, 0.35, 9000, 3); });
  S.tar = canvasTex(T, 128, 128, (ctx, w, h) => { ctx.fillStyle = '#4b4d50'; ctx.fillRect(0, 0, w, h); grain(ctx, w, h, 0.12, 1400); });
  S.corrugated = canvasTex(T, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#7b8186'; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) { const g = ctx.createLinearGradient(x, 0, x + 8, 0); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.5, 'rgba(0,0,0,.18)'); g.addColorStop(1, 'rgba(255,255,255,.22)'); ctx.fillStyle = g; ctx.fillRect(x, 0, 8, h); }
    ctx.fillStyle = 'rgba(150,70,25,.22)'; for (let i = 0; i < 10; i++) ctx.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 16, 8 + rnd() * 30);
    grain(ctx, w, h, 0.1, 800);
  });
  S.tiles = canvasTex(T, 128, 128, (ctx, w, h) => {                                     // glazed roof tiles, rows of half-round tiles
    ctx.fillStyle = '#2d5878'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) for (let x = (y / 10 % 2) * 6; x < w; x += 12) {
      const g = ctx.createLinearGradient(x, y, x, y + 10); g.addColorStop(0, '#4a86ad'); g.addColorStop(1, '#1e4260');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y); ctx.lineTo(x + 12, y + 7); ctx.arc(x + 6, y + 7, 6, 0, Math.PI); ctx.closePath(); ctx.fill();
    }
    grain(ctx, w, h, 0.06, 600);
  });
  S.wood = canvasTex(T, 128, 128, (ctx, w, h) => { ctx.fillStyle = '#6b4a2f'; ctx.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, y, w, 2); } grain(ctx, w, h, 0.15, 1500); });
  S.grass = canvasTex(T, 128, 128, (ctx, w, h) => { ctx.fillStyle = '#4a7a38'; ctx.fillRect(0, 0, w, h); grain(ctx, w, h, 0.16, 3500); });
  S.water = canvasTex(T, 128, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2f7fa8'); g.addColorStop(1, '#1f5c80'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.5; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 14, 2 + rnd() * 4, 0, 0, 7); ctx.stroke(); }
  });
  return S;
}

// ------------------------------------------------------------------ sign atlas (4 x 8 slots of 256 x 128)
export const SIGNS = ['THE DEN', 'WOLF', 'SCRAP', 'WELDING', 'GARAGE', 'TATTOO', 'NOODLES', 'TEA HOUSE', 'DIM SUM', 'HERBS', 'DRAGON', 'CASINO',
  'LUCKY 7', 'HOTEL', 'COBRA', 'JACKPOT', 'BAR', 'OPEN 24H', 'PAWN', 'PIZZA', 'ARCADE', 'KARAOKE', 'BANK', 'CINEMA', 'DINER', 'CLUB', 'TAXI', 'LIQUOR', 'SUSHI', 'BAKERY', 'GOLD', 'STEAKS'];
const SIGN_COL = { 'THE DEN': '#ff4a3a', WOLF: '#ff4a3a', SCRAP: '#ffb347', WELDING: '#ffd23a', GARAGE: '#ff8a3a', TATTOO: '#ff4a8a', NOODLES: '#5ad0ff', 'TEA HOUSE': '#6bffb0', 'DIM SUM': '#ff9a5a', HERBS: '#8aff6a', DRAGON: '#4aa8ff', CASINO: '#ffd23a', 'LUCKY 7': '#ff3a5a', HOTEL: '#ffe08a', COBRA: '#ffd23a', JACKPOT: '#ff3a5a', BAR: '#ff6a3a', 'OPEN 24H': '#5aff9a', PAWN: '#ffd23a', PIZZA: '#ff5a3a', ARCADE: '#c56cff', KARAOKE: '#ff5ad0', BANK: '#9fd4ff', CINEMA: '#ff5a5a', DINER: '#5ad0ff', CLUB: '#c56cff', TAXI: '#ffd23a', LIQUOR: '#ff6a3a', SUSHI: '#ff7a8a', BAKERY: '#ffd08a', GOLD: '#ffd23a', STEAKS: '#ff5a3a' };

export function makeSignAtlas(T) {
  return canvasTex(T, 1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, 0, w, h);
    SIGNS.forEach((name, i) => {
      const x = (i % 4) * 256, y = Math.floor(i / 4) * 128, col = SIGN_COL[name] || '#fff';
      ctx.fillStyle = '#14141c'; ctx.fillRect(x + 4, y + 4, 248, 120);
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.strokeRect(x + 12, y + 12, 232, 104);
      ctx.fillStyle = col; ctx.font = `900 ${name.length > 7 ? 38 : 50}px 'Arial Black', Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(name, x + 128, y + 66);
      ctx.shadowBlur = 0;
    });
  }, { repeat: false });
}
/** UV rect [u0,v0,u1,v1] of sign `name` in the atlas. */
export function signUV(name) {
  const i = Math.max(0, SIGNS.indexOf(name));
  const u0 = (i % 4) / 4, v1 = 1 - Math.floor(i / 4) / 8;
  return [u0 + 0.004, v1 - 1 / 8 + 0.004, u0 + 0.25 - 0.004, v1 - 0.004];
}

// ------------------------------------------------------------------ plaza + HQ floor emblems
export function makePlazaTex(T) {
  return canvasTex(T, 1024, 1024, (ctx, w, h) => {
    reseed(77);
    ctx.fillStyle = '#c4b8a0'; ctx.fillRect(0, 0, w, h); grain(ctx, w, h, 0.07, 9000);
    ctx.strokeStyle = 'rgba(80,60,40,.28)'; ctx.lineWidth = 2;
    for (let k = 0; k <= 16; k++) { ctx.beginPath(); ctx.moveTo(k * 64, 0); ctx.lineTo(k * 64, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, k * 64); ctx.lineTo(w, k * 64); ctx.stroke(); }
    const cx = w / 2, cy = h / 2;
    // sunburst rings
    for (let r = 480; r > 0; r -= 8) { ctx.fillStyle = (r / 8) % 2 ? 'rgba(120,90,60,.10)' : 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 6; for (const r of [330, 250, 120]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); }
    // compass rose
    ctx.fillStyle = '#7a5a34';
    for (let k = 0; k < 8; k++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((k * Math.PI) / 4);
      const L = k % 2 ? 210 : 320, Wd = k % 2 ? 22 : 34;
      ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(Wd, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8d9b8'; ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(-Wd, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#7a5a34';
      ctx.restore();
    }
    ctx.fillStyle = '#b8892f'; ctx.beginPath(); ctx.arc(cx, cy, 46, 0, 7); ctx.fill(); ctx.fillStyle = '#7a5a34'; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, 7); ctx.fill();
    // three gang colours at the cardinal diagonals
    [['#d8312a', 0], ['#2f6be0', 2.094], ['#e0a91f', 4.188]].forEach(([c, a]) => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.fillStyle = c; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(0, -400, 34, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.restore();
    });
  }, { repeat: false });
}

export function makeEmblemTex(T, gang) {
  return canvasTex(T, 1024, 1024, (ctx, w, h) => {
    reseed(300 + gang);
    const cx = w / 2, cy = h / 2;
    const pal = [
      { base: '#2a2422', ring: '#d8312a', glow: '#ff6a4a', dark: '#1a1514' },
      { base: '#1d2a38', ring: '#2f8cff', glow: '#9fe4ff', dark: '#101a26' },
      { base: '#2b2418', ring: '#e0a91f', glow: '#ffe08a', dark: '#1a1510' },
    ][gang];
    const g = ctx.createRadialGradient(cx, cy, 40, cx, cy, 512); g.addColorStop(0, pal.base); g.addColorStop(1, pal.dark);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); grain(ctx, w, h, 0.12, 12000, 3);
    ctx.lineWidth = 14; ctx.strokeStyle = pal.ring; ctx.shadowColor = pal.glow; ctx.shadowBlur = 24;
    for (const r of [488, 440]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); }
    ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, 380, 0, 7); ctx.stroke();
    ctx.fillStyle = pal.ring; ctx.shadowBlur = 18;
    ctx.save(); ctx.translate(cx, cy);
    if (gang === 0) {                                   // wolf paw: big pad + four toes, claws
      ctx.beginPath(); ctx.ellipse(0, 70, 150, 120, 0, 0, 7); ctx.fill();
      [[-190, -70, -0.5], [-70, -190, -0.15], [70, -190, 0.15], [190, -70, 0.5]].forEach(([x, y, r]) => { ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, 0, 62, 86, 0, 0, 7); ctx.fill(); ctx.restore(); });
      ctx.strokeStyle = pal.dark; ctx.lineWidth = 10; ctx.shadowBlur = 0;
      for (const x of [-120, 0, 120]) { ctx.beginPath(); ctx.moveTo(x - 40, 20); ctx.lineTo(x, -40); ctx.lineTo(x + 40, 20); ctx.stroke(); }
    } else if (gang === 1) {                            // dragon: coiling yin-yang style swirl with scales
      ctx.lineCap = 'round'; ctx.strokeStyle = pal.ring; ctx.lineWidth = 56;
      ctx.beginPath(); for (let t = 0; t < 7.2; t += 0.04) { const r = 40 + t * 44, x = Math.cos(t * 1.4) * r * 0.9, y = Math.sin(t * 1.4) * r * 0.9; t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      ctx.fillStyle = pal.glow; ctx.beginPath(); ctx.arc(-120, -150, 34, 0, 7); ctx.fill(); ctx.fillStyle = pal.dark; ctx.beginPath(); ctx.arc(-120, -150, 14, 0, 7); ctx.fill();
      ctx.fillStyle = pal.ring; for (let k = 0; k < 12; k++) { const a = k * 0.52; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 330, Math.sin(a) * 330); ctx.lineTo(Math.cos(a + 0.12) * 372, Math.sin(a + 0.12) * 372); ctx.lineTo(Math.cos(a - 0.12) * 372, Math.sin(a - 0.12) * 372); ctx.fill(); }
    } else {                                            // cobra hood
      ctx.beginPath(); ctx.moveTo(0, -300); ctx.bezierCurveTo(260, -300, 300, 40, 90, 250); ctx.lineTo(-90, 250); ctx.bezierCurveTo(-300, 40, -260, -300, 0, -300); ctx.fill();
      ctx.fillStyle = pal.dark; ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(0, -150); ctx.bezierCurveTo(130, -140, 150, 30, 40, 170); ctx.lineTo(-40, 170); ctx.bezierCurveTo(-150, 30, -130, -140, 0, -150); ctx.fill();
      ctx.fillStyle = pal.glow; for (const x of [-52, 52]) { ctx.beginPath(); ctx.ellipse(x, -70, 22, 12, x < 0 ? 0.4 : -0.4, 0, 7); ctx.fill(); }
      ctx.strokeStyle = pal.glow; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, 120); ctx.moveTo(0, 120); ctx.lineTo(-14, 150); ctx.moveTo(0, 120); ctx.lineTo(14, 150); ctx.stroke();
    }
    ctx.restore();
  }, { repeat: false });
}
