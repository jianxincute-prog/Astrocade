/*
 * ASTRO WORLD — a WorldBox-style god-sim sandbox (portrait 720x1280).
 *
 * Concept: shape an island, drop humans / elves / dwarves / orcs / sheep / wolves, and
 * watch them build houses, breed, hunt and wage war. Then unleash rain, fire, lightning
 * and meteors.
 *
 * Play mode : full simulation, all tools, autosave (lib.saveUserGameState).
 * Edit mode : simulation frozen; sculpt terrain or regenerate the world. The result is
 *             written to gameConfig.world (RLE tiles) and becomes the play-mode start map.
 */
function run(mode) {
'use strict';

/* ============================== CONSTANTS ============================== */
const SCREEN_W = 720, SCREEN_H = 1280;
const VIEW = { x: 0, y: 150, w: 720, h: 906 };          // world viewport on the canvas
// Three selectable world sizes. k scales population caps (not linearly, to keep phones smooth).
const SIZES = [
  { name:'S', label:'Kecil',  w:120, h:148, k:1,   land:0,   coarse:0,   wc:0 },
  { name:'M', label:'Sedang', w:200, h:246, k:2,   land:.39, coarse:.21, wc:.62 },
  { name:'L', label:'Besar',  w:240, h:296, k:2.6, land:.40, coarse:.19, wc:.64 },
];
let sizeIdx = 1, W = SIZES[1].w, H = SIZES[1].h, N = W * H, CAPK = SIZES[1].k;
let GW = 0, GH = 0, cells = [];
const T = { DEEP:0, SHALLOW:1, SAND:2, GRASS:3, FOREST:4, HILL:5, MOUNTAIN:6, SNOW:7, LAVA:8, BURNT:9 };
const COL = [
  [24,72,140], [48,128,196], [226,208,144], [96,176,72], [40,116,56],
  [150,140,98], [118,118,128], [240,244,250], [236,90,26], [62,56,52],
];
const LADDER = [T.DEEP, T.SHALLOW, T.SAND, T.GRASS, T.HILL, T.MOUNTAIN, T.SNOW];
const FLAM = [0,0,0,0.07,0.22,0,0,0,0,0];

const RACES = {
  human: { col:'#4aa3ff', hp:30, dmg:4, mv:2, civ:1, cap:90, life:[1000,1700], foes:['orc','wolf'], build:[T.GRASS,T.SAND], bi:1 },
  elf:   { col:'#e2a9ff', hp:24, dmg:4, mv:2, civ:1, cap:70, life:[1800,2800], foes:['orc','wolf'], build:[T.FOREST,T.GRASS], bi:2 },
  dwarf: { col:'#ff9a2e', hp:38, dmg:5, mv:3, civ:1, cap:70, life:[1400,2200], foes:['orc','wolf'], build:[T.HILL,T.GRASS], bi:3 },
  orc:   { col:'#ff3d3d', hp:44, dmg:6, mv:2, civ:1, cap:80, life:[800,1300],  foes:['human','elf','dwarf'], build:[T.GRASS,T.HILL,T.BURNT,T.SAND], bi:4 },
  // Wild fauna. prey = wolf food; br = breeding (p per move, tiles, max animals per 8x8 cell); flee = runs from wolves.
  sheep:  { col:'#ffffff', hp:10, dmg:0, mv:3, civ:0, cap:110, life:[600,1100], foes:[], build:[], bi:0, prey:1, br:{ p:.02,  tiles:[T.GRASS], dens:14 } },
  rabbit: { col:'#c9a37a', hp:6,  dmg:0, mv:2, civ:0, cap:160, life:[500,900],  foes:[], build:[], bi:0, prey:1, flee:1, br:{ p:.035, tiles:[T.GRASS,T.FOREST,T.HILL], dens:16 } },
  deer:   { col:'#c68a4e', hp:16, dmg:0, mv:2, civ:0, cap:70,  life:[900,1500], foes:[], build:[], bi:0, prey:1, flee:1, br:{ p:.014, tiles:[T.FOREST,T.GRASS], dens:8 } },
  wolf:   { col:'#2b2e36', hp:28, dmg:5, mv:1, civ:0, cap:28,  life:[900,1500], foes:['sheep','rabbit','deer'], hunt:1, build:[], bi:0 },
};
const RN = ['human','elf','dwarf','orc','sheep','wolf','rabbit','deer'];     // index order is part of the save format
const STAT_ORDER = ['human','elf','dwarf','orc','sheep','rabbit','deer','wolf'];
const GAIN = { rabbit:25, sheep:45, deer:60 };                               // wolf energy per kill (default 45)
const BUILD_OWNER = [null,'human','elf','dwarf','orc'];
const EMOJI = { human:'🧑', elf:'🧝', dwarf:'🧔', orc:'👹', sheep:'🐑', wolf:'🐺', rabbit:'🐇', deer:'🦌' };
const TPS = 8;
const MAX_CREATURES = 1500;           // multiplied by CAPK
const capOf = t => Math.round(RACES[t].cap * CAPK);

const cfg = window.gameConfig || {};
cfg.settings = cfg.settings || { dayNight: true, population: 1 };
cfg.world = cfg.world || { seed: 0, tiles: '' };
const lib = window.lib || {};
const haptic = (p) => { try { lib.haptics && lib.haptics.play(p); } catch (e) {} };
const editMode = mode === 'edit';

/* ============================== DOM ============================== */
document.body.innerHTML = '';
const old = document.getElementById('aw-style'); if (old) old.remove();
const style = document.createElement('style'); style.id = 'aw-style';
style.textContent = `
  html,body{margin:0;background:#070a16;overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;user-select:none;-webkit-user-select:none;touch-action:none}
  #aw{position:relative;width:720px;height:1280px;overflow:hidden;background:#0b1020;color:#e8ecff}
  #aw canvas{position:absolute;left:0;top:0;width:720px;height:1280px;touch-action:none}
  .awb{box-sizing:border-box;width:96px;height:96px;flex:0 0 96px;border-radius:22px;border:3px solid #2c3868;background:#1d2646;color:#e8ecff;font-size:44px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;font-family:inherit;cursor:pointer}
  .awb.on{background:#34457f;border-color:#ffcf4a}
  #awtop{position:absolute;left:0;top:0;width:720px;height:150px;background:#141b33;border-bottom:3px solid #2c3868}
  #awbtns{position:absolute;left:6px;top:4px;display:flex;gap:8px}
  #awstats{position:absolute;left:10px;top:104px;right:10px;height:40px;display:flex;gap:3px;align-items:center;font-size:19px;overflow-x:auto;scrollbar-width:none;font-variant-numeric:tabular-nums;white-space:nowrap}
  #awstats span{background:#1d2646;border:2px solid #2c3868;border-radius:999px;padding:1px 5px;flex:0 0 auto}
  #awyear{position:absolute;right:10px;top:30px;font-size:30px;background:#1d2646;border:2px solid #2c3868;border-radius:999px;padding:4px 16px;font-variant-numeric:tabular-nums}
  #awbot{position:absolute;left:0;top:1064px;width:720px;height:216px;background:#141b33;border-top:3px solid #2c3868;padding:8px 8px;box-sizing:border-box}
  #awrow1{display:flex;gap:8px;align-items:center}
  #awbrush{margin-left:auto;display:flex;gap:6px;align-items:center;font-size:36px;font-weight:700;color:#ffcf4a}
  #awbrush .awb{width:84px;height:84px;flex-basis:84px;font-size:46px}
  #awbrush span{min-width:40px;text-align:center}
  #awrow2{display:flex;gap:8px;margin-top:10px;overflow-x:auto;scrollbar-width:none;touch-action:pan-x}
  #awrow2::-webkit-scrollbar{display:none}
  #awinfo{position:absolute;left:14px;top:968px;background:#141b33ee;border:3px solid #2c3868;border-radius:18px;padding:10px 18px;font-size:30px;line-height:1.35;display:none}
  #awtoast{position:absolute;left:50%;top:162px;transform:translateX(-50%);background:#141b33ee;border:3px solid #2c3868;border-radius:999px;padding:8px 26px;font-size:30px;opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap}
`;
document.head.appendChild(style);
const app = document.createElement('div'); app.id = 'aw'; document.body.appendChild(app);
const cv = document.createElement('canvas');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
cv.width = SCREEN_W * DPR; cv.height = SCREEN_H * DPR;
app.appendChild(cv);
const ctx = cv.getContext('2d');
const el = (tag, id, parent) => { const e = document.createElement(tag); if (id) e.id = id; (parent || app).appendChild(e); return e; };
const topBar = el('div', 'awtop'), btns = el('div', 'awbtns', topBar), statsEl = el('div', 'awstats', topBar), yearEl = el('div', 'awyear', topBar);
const bot = el('div', 'awbot'), row1 = el('div', 'awrow1', bot), row2 = el('div', 'awrow2', bot);
const infoEl = el('div', 'awinfo'), toastEl = el('div', 'awtoast');

function mkBtn(parent, label, fn, cls) {
  const b = document.createElement('button'); b.className = 'awb' + (cls ? ' ' + cls : ''); b.textContent = label;
  b.addEventListener('click', e => { e.stopPropagation(); fn(b); });
  parent.appendChild(b); return b;
}
let toastT = 0;
function toast(s) { toastEl.textContent = s; toastEl.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => toastEl.style.opacity = 0, 1500); }

/* ============================== STATE ============================== */
let tiles, bld, fire, jit;            // allocated by setSize()
let creatures = [], nextId = 1, tick = 0;
let speed = 1, paused = editMode;
let counts = {}, houseCount = 0, hb = [0,0,0,0,0];
const effects = [];
let dirty = false, currentSeed = 0;

/* ============================== NOISE & WORLD GEN ============================== */
function hash(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
  const a = hash(xi,yi,s), b = hash(xi+1,yi,s), c = hash(xi,yi+1,s), d = hash(xi+1,yi+1,s);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}
function fbm(x, y, s) {
  let a = 0, amp = .5, f = 1, n = 0;
  for (let o = 0; o < 5; o++) { a += amp * vnoise(x*f, y*f, s + o*17); n += amp; amp *= .5; f *= 2; }
  return a / n;
}
function generateSmall(seed) {
  currentSeed = seed; creatures = []; effects.length = 0; bld.fill(0); fire.fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = x + y*W;
    const nx = (x/W - .5)*2, ny = (y/H - .5)*2;
    const d = Math.sqrt(nx*nx + ny*ny);
    const e = fbm(x/24, y/24, seed) * 1.05 + 0.22 - d*d*0.42 - d*0.18;
    const m = fbm(x/14 + 50, y/14 + 50, seed + 99);
    let t;
    if (e < .40) t = T.DEEP; else if (e < .47) t = T.SHALLOW; else if (e < .51) t = T.SAND;
    else if (e < .70) t = (m > .52 ? T.FOREST : T.GRASS);
    else if (e < .78) t = T.HILL; else if (e < .88) t = T.MOUNTAIN; else t = T.SNOW;
    tiles[i] = t;
    jit[i] = Math.floor((hash(x, y, 7) - .5) * 14);
  }
}
// Medium / Large: rank-based biomes + low-frequency noise => several continents and islands.
function generateLarge(seed) {
  currentSeed = seed; creatures = []; effects.length = 0; bld.fill(0); fire.fill(0);
  const z = SIZES[sizeIdx], e = new Float32Array(N), mo = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = x + y*W;
    const f = fbm(x/24, y/24, seed), c = fbm(x/(W*z.coarse), y/(W*z.coarse), seed + 7);
    const ed = Math.min(1, Math.min(x, y, W-1-x, H-1-y) / (W*.1)), edge = 1 - ed;
    e[i] = f*(1 - z.wc) + c*z.wc - edge*edge*.3;
    mo[i] = fbm(x/14 + 50, y/14 + 50, seed + 99);
    jit[i] = Math.floor((hash(x, y, 7) - .5) * 14);
  }
  const srt = Float32Array.from(e).sort();
  const wi = Math.floor(N * (1 - z.land)), lc = N - wi;
  const q = k => srt[Math.min(N - 1, wi + Math.floor(lc * k))];
  const water = srt[wi], shallow = srt[Math.floor(wi * .86)];
  const sandT = q(.07), grassT = q(.72), hillT = q(.86), mtnT = q(.97);
  for (let i = 0; i < N; i++) {
    const v = e[i]; let t;
    if (v < shallow) t = T.DEEP; else if (v < water) t = T.SHALLOW; else if (v < sandT) t = T.SAND;
    else if (v < grassT) t = mo[i] > .52 ? T.FOREST : T.GRASS;
    else if (v < hillT) t = T.HILL; else if (v < mtnT) t = T.MOUNTAIN; else t = T.SNOW;
    tiles[i] = t;
  }
}
function generate(seed) { if (sizeIdx === 0) generateSmall(seed); else generateLarge(seed); }
function emptyWorld() {
  creatures = []; effects.length = 0; bld.fill(0); fire.fill(0); tiles.fill(T.DEEP);
  for (let i = 0; i < N; i++) jit[i] = Math.floor((hash(i, 3, 5) - .5) * 14);
}
function rleEncode() {
  const out = []; let run = 1;
  for (let i = 1; i <= N; i++) {
    if (i < N && tiles[i] === tiles[i-1]) run++;
    else { out.push(tiles[i-1] + run.toString(36)); run = 1; }
  }
  return out.join(',');
}
function rleDecode(s) {
  if (!s) return false;
  let p = 0;
  for (const part of s.split(',')) {
    let t, n;
    if (part.indexOf('.') >= 0) { const a = part.split('.'); t = +a[0]; n = +a[1]; }      // legacy "t.n"
    else { t = +part[0]; n = parseInt(part.slice(1), 36); }
    if (!(n > 0)) return false;
    for (let k = 0; k < n && p < N; k++) tiles[p++] = t;
  }
  if (p !== N) return false;
  for (let i = 0; i < N; i++) jit[i] = Math.floor((hash(i % W, (i / W) | 0, 7) - .5) * 14);
  return true;
}

/* ============================== SPRITES (10x10 pixel art, defined in code) ============================== */
// Creatures: frames A,B (walk) and C (attack). Houses: frame A. '.' = transparent.
const OUT = '#1c1420';
const SPRITES = {
  human: {
    pal: { o:OUT, h:'#6b4423', s:'#f1c27d', e:OUT, c:'#4aa3ff', d:'#2a6fc0', p:'#3b4a7a', b:'#3a2a20', w:'#dfe6f0' },
    A: ["...oooo...","..ohhhho..","..ohhhho..","..oseeso..","..osssso..","..occcco..",".osccccso.",".osddddso.","..opppo...","..ob.bo..."],
    B: ["...oooo...","..ohhhho..","..ohhhho..","..oseeso..","..osssso..","..occcco..",".osccccso.",".osddddso.","..opppo...","...obbo..."],
    C: ["...oooo..w","..ohhhho.w","..ohhhho.w","..oseeso.w","..osssso.w","..occcco.w",".osccccssb",".osddddso.","..opppo...","..ob.bo..."],
  },
  elf: {
    pal: { o:OUT, h:'#f3e7a0', s:'#f6d9b8', e:'#3b7a3b', c:'#c58cf0', d:'#8f5cc4', b:'#4a3a58', w:'#dfe6f0' },
    A: ["...oooo...","..ohhhho..","oshhhhhhso",".osseesso.","..osssso..","..occcco..",".ohccccho.",".ohddddho.","..occcco..","..ob..bo.."],
    B: ["...oooo...","..ohhhho..","oshhhhhhso",".osseesso.","..osssso..","..occcco..",".ohccccho.",".ohddddho.","..occcco..","...obbo..."],
    C: ["...oooo...","..ohhhho..","oshhhhhhso",".osseesso.","..osssso..","..occcco..",".ohccccsww",".ohddddho.","..occcco..","..ob..bo.."],
  },
  dwarf: {
    pal: { o:OUT, g:'#a9b2c0', G:'#6f7886', s:'#f0b48a', e:OUT, r:'#c0642a', c:'#ff9a2e', p:'#5a3a22', b:'#3a2a20', x:'#8a5a34', W:'#dfe6f0' },
    A: ["...occo...","..oggggo..",".oGggggGo.",".osseesso.",".orrssrro.",".orrrrrro.",".orrrrrro.","osgrrrrgso",".opccccpo.","..obo.obo."],
    B: ["...occo...","..oggggo..",".oGggggGo.",".osseesso.",".orrssrro.",".orrrrrro.",".orrrrrro.","osgrrrrgso",".opccccpo.","...obbbo.."],
    C: ["...occo...","..oggggo..",".oGggggGWW",".osseesoWx",".orrssrrox",".orrrrrrox",".orrrrrrsx","osgrrrrgo.",".opccccpo.","..obo.obo."],
  },
  orc: {
    pal: { o:OUT, g:'#5fa84a', G:'#3f7a30', e:'#ffe14a', w:'#f4f1e6', c:'#ff3d3d', d:'#b02020', b:'#4a2a20', x:'#8a5a34', X:'#6a4424' },
    A: ["...oooo...","..oggggo..","..ogeego..","..oggggo..","..owGGwo..",".occcccco.","ogccddccgo","ogccccccgo",".odbbbbdo.",".obo..obo."],
    B: ["...oooo...","..oggggo..","..ogeego..","..oggggo..","..owGGwo..",".occcccco.","ogccddccgo","ogccccccgo",".odbbbbdo.","..obbbbo.."],
    C: ["...oooo.XX","..oggggoXX","..ogeego.x","..oggggo.x","..owGGwo.x",".occccccox","ogccddccgx","ogccccccgo",".odbbbbdo.",".obo..obo."],
  },
  sheep: {
    pal: { o:OUT, w:'#ffffff', v:'#d6dbe6', d:'#5a4a52', e:'#ffffff', b:'#3a2a30' },
    A: ["..........","..oo.oo...",".owwowwo.o","owwwwwwodo","owwvwwwdeo","owwwwwwddo","owwwwwwwoo",".owwwwwo..","..ob..bo..","..ob..bo.."],
    B: ["..........","..oo.oo...",".owwowwo.o","owwwwwwodo","owwvwwwdeo","owwwwwwddo","owwwwwwwoo",".owwwwwo..","...obbo...","...b..b..."],
  },
  rabbit: {
    pal: { o:OUT, b:'#b8895a', B:'#e6cfa8', p:'#f0a0b0', e:OUT, w:'#ffffff' },
    A: ["......o.o.",".....obobo",".....obpbo","...oobbbbo","..obbbbbeo",".obbbbbbbp","owbbbbbbo.",".obbbbbbo.","..obobbo..","..oo.oo..."],
    B: ["......o.o.",".....obobo",".....obpbo","...oobbbbo","..obbbbbeo",".obbbbbbbp","owbbbbbbo.",".obbbbbbo.","...obobbo.","...oo.oo.."],
  },
  deer: {
    pal: { o:OUT, t:'#c68a4e', T:'#9a6232', w:'#f4e6cc', a:'#e6d9a8', e:OUT, n:'#3a2a20' },
    A: ["......a.a.",".......aa.","......otto","......ottn",".....ottoo","ottttttto.","otTttwttto","owwwwwwo..",".oto.oto..",".oo..oo..."],
    B: ["......a.a.",".......aa.","......otto","......ottn",".....ottoo","ottttttto.","otTttwttto","owwwwwwo..","..oto.oto.","..oo..oo.."],
  },
  wolf: {
    pal: { o:OUT, g:'#5b6070', l:'#9aa0b0', e:'#ff5050', n:'#1c1c24', d:'#3a3e4c', b:'#2a2d38', w:'#ffffff', r:'#c02030' },
    A: ["..........","........o.","o.....oggo","og...oggeo",".ogoggggno",".ogggggggo",".oggglllo.",".ogdgoodo.",".ob.bo.bo.",".oo.oo.oo."],
    B: ["..........","........o.",".o....oggo","og...oggeo",".ogoggggno",".ogggggggo",".oggglllo.","..ogdoodo.","..ob.bobo.","..oo.oooo."],
    C: ["..........",".......o.o","o.....oggo","og...oggeo",".ogoggggwo",".ogggggrro",".ogglllgwo",".ogdgoodo.",".ob.bo.bo.",".oo.oo.oo."],
  },
};
// Houses (owner race). One frame, drawn bottom-anchored.
const HOUSES = {
  human: { // thatched hut, blue banner
    pal: { o:OUT, y:'#e0b84a', Y:'#b8902c', w:'#d8b98a', k:'#4a3020', f:'#4aa3ff' },
    A: ["....oo....","...oyyo...","..oyYyyo.f",".oyyyYyyo.","oyYyyyyYyo",".owwwwwwo.",".owkkwfwo.",".owkkwwwo.",".owkkwwwo.",".oooooooo."],
  },
  elf: { // tree house, lilac blossoms
    pal: { o:OUT, g:'#3f9a4a', G:'#2a7038', p:'#c58cf0', t:'#8a5a34', k:'#3a2418' },
    A: ["..oooooo..",".ogggGgggo","oggGggpggo","ogggggggGo",".oGgggpgo.","...otto...","..otkkto..","..otkkto..",".ottkktto.",".oooooooo."],
  },
  dwarf: { // stone house, orange door, chimney
    pal: { o:OUT, S:'#9ea6b2', s:'#b9c0ca', R:'#5a5f6e', d:'#ff9a2e' },
    A: ["......oo..",".oooooSSo.","oRRRRRRRRo","oRRRRRRRRo",".oSSsSSsSo",".oSsSSsSSo",".oSdddSsSo",".oSdddSSSo",".oSdddSsSo",".oooooooo."],
  },
  orc: { // hide tent, red stripe, skull
    pal: { o:OUT, R:'#9a6a44', r:'#ff3d3d', k:'#2a1a14', w:'#f4f1e6' },
    A: ["....wo....","...oRRo...","..oRrRRo..",".oRRrRRRo.",".oRRwwRRo.","oRRRkkRRRo","oRrkkkkRro","oRRkkkkRRo","oRRkkkkRRo","oooooooooo"],
  },
};
function buildSprite(def, frame) {
  const rows = def[frame] || def.A;
  const c = document.createElement('canvas'); c.width = 10; c.height = 10;
  const x = c.getContext('2d');
  for (let y = 0; y < 10; y++) for (let i = 0; i < 10; i++) {
    const ch = rows[y][i]; if (ch === '.') continue;
    x.fillStyle = def.pal[ch] || '#f0f'; x.fillRect(i, y, 1, 1);
  }
  return c;
}

const ATLAS = {}, HATLAS = {};
for (const k in SPRITES) { ATLAS[k] = {}; for (const f of ['A','B','C']) ATLAS[k][f] = buildSprite(SPRITES[k], f); }
for (const k in HOUSES) HATLAS[RACES[k].bi] = buildSprite(HOUSES[k], 'A');
let SPR_K = 1;      // integer sprite scale: 10px per sprite pixel-block, ~1.7 tiles at the base zoom

/* ============================== UTIL ============================== */
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
function walkable(t, tile) {
  if (tile <= T.SHALLOW || tile === T.LAVA) return false;
  if (tile === T.MOUNTAIN || tile === T.SNOW) return t === 'dwarf';
  return true;
}
function forDisc(cx, cy, r, fn) {
  const rr = r*r + (r > 0 ? .6 : 0);
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x*x + y*y <= rr) { const tx = cx+x, ty = cy+y; if (inb(tx, ty)) fn(tx, ty, tx + ty*W); }
  }
}
function setTile(i, t) {
  tiles[i] = t;
  if (t <= T.SHALLOW || t === T.LAVA) { fire[i] = 0; bld[i] = 0; }
  else if (t === T.MOUNTAIN || t === T.SNOW) bld[i] = 0;
  dirty = true;
}
function ignite(i) {
  if (fire[i]) return;
  const t = tiles[i];
  if (bld[i]) fire[i] = 14; else if (t === T.FOREST) fire[i] = 16; else if (t === T.GRASS) fire[i] = 7;
}
function fx(kind, x, y, extra) { effects.push(Object.assign({ k:kind, x, y, t:0 }, extra || {})); }

/* ============================== CREATURES ============================== */
function spawn(type, x, y, force) {
  if (!force && (creatures.length >= MAX_CREATURES * CAPK || (counts[type]||0) >= capOf(type) + 40)) return null;
  if (!inb(x, y) || !walkable(type, tiles[x + y*W])) return null;
  const R = RACES[type];
  const c = { id:nextId++, t:type, x, y, dx:x, dy:y, hp:R.hp, mhp:R.hp, age:0, life:ri(R.life[0], R.life[1]), en:rnd(55,100), dir:ri(0,8), tgt:null, kills:0, face:1, atk:0, cause:'', fail:0, avoid:0, avoidUntil:0 };
  creatures.push(c); counts[type] = (counts[type]||0) + 1; dirty = true;
  return c;
}
function spawnNear(type, x, y) {
  for (let k = 0; k < 8; k++) { const c = spawn(type, x + ri(-1,1), y + ri(-1,1)); if (c) return c; }
  return null;
}
const DIRS = [[0,0],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];

function tryMove(c, nx, ny) {
  if (inb(nx, ny) && walkable(c.t, tiles[nx + ny*W])) { if (nx !== c.x) c.face = nx > c.x ? 1 : -1; c.x = nx; c.y = ny; return true; }
  return false;
}
function findNearest(c, foes, rad) {
  const cx = c.x >> 3, cy = c.y >> 3, cr = Math.ceil(rad/8);
  let best = null, bd = 1e9;
  for (let gy = Math.max(0,cy-cr); gy <= Math.min(GH-1,cy+cr); gy++)
    for (let gx = Math.max(0,cx-cr); gx <= Math.min(GW-1,cx+cr); gx++) {
      const list = cells[gy*GW + gx];
      for (let k = 0; k < list.length; k++) {
        const o = list[k];
        if (o.hp <= 0 || o === c || !foes.includes(o.t)) continue;
        if (c.avoidUntil > tick && o.id === c.avoid) continue;       // recently unreachable
        const d = Math.max(Math.abs(o.x - c.x), Math.abs(o.y - c.y));
        if (d < bd && d <= rad) { bd = d; best = o; }
      }
    }
  return best;
}
const CIVS = ['human','elf','dwarf','orc'];
function fleeFrom(c, foes, rad) {
  const f = findNearest(c, foes, rad);
  if (!f) return false;
  const sx = -Math.sign(f.x - c.x), sy = -Math.sign(f.y - c.y);
  return tryMove(c, c.x+sx, c.y+sy) || tryMove(c, c.x+sx, c.y) || tryMove(c, c.x, c.y+sy) || tryMove(c, c.x + ri(-1,1), c.y + ri(-1,1));
}
function findTarget(c) {
  const R = RACES[c.t]; let rad = 8, foes = R.foes;
  if (R.hunt) { if (c.en > 75) return null; rad = 22; if (c.en < 45) foes = ['sheep','rabbit','deer','human','elf','dwarf']; }
  if (!foes.length) return null;
  if (R.civ && foes.includes('wolf')) {            // settlers only fight wolves that come close
    return findNearest(c, foes.filter(f => f !== 'wolf'), rad) || findNearest(c, ['wolf'], 2);
  }
  return findNearest(c, foes, rad);
}
function countHouses(x, y, r, owner) {
  let n = 0;
  for (let yy = Math.max(0,y-r); yy <= Math.min(H-1,y+r); yy++)
    for (let xx = Math.max(0,x-r); xx <= Math.min(W-1,x+r); xx++) if (bld[xx + yy*W] === owner) n++;
  return n;
}
function stepCreature(c) {
  const R = RACES[c.t], idx = c.x + c.y*W;
  c.age++;
  if (c.age > c.life) { c.hp = 0; c.cause = 'old'; return; }
  if (!walkable(c.t, tiles[idx])) { c.hp = 0; fx('splash', c.x, c.y); return; }
  if (fire[idx]) { c.hp -= 9; if (c.hp <= 0) return; }
  if (R.hunt) { c.en -= 0.12; if (c.en <= 0) { c.hp = 0; return; } }
  if ((tick + c.id) % R.mv !== 0) return;

  let tg = c.tgt;
  if (tg && (tg.hp <= 0 || Math.max(Math.abs(tg.x-c.x), Math.abs(tg.y-c.y)) > (R.hunt ? 24 : 13))) tg = c.tgt = null;
  if (!tg && (tick + c.id) % 3 === 0) tg = c.tgt = findTarget(c);
  if (tg) {
    const d = Math.max(Math.abs(tg.x-c.x), Math.abs(tg.y-c.y));
    if (d <= 1 && R.dmg > 0) {
      c.atk = 10; c.face = tg.x > c.x ? 1 : tg.x < c.x ? -1 : c.face;
      tg.hp -= R.dmg * (.5 + Math.random()); fx('hit', tg.x, tg.y);
      if (tg.hp <= 0) { c.kills++; if (R.hunt) c.en = Math.min(100, c.en + (GAIN[tg.t] || 45)); c.tgt = null; }
      return;
    }
    const sx = Math.sign(tg.x - c.x), sy = Math.sign(tg.y - c.y);
    if (tryMove(c, c.x+sx, c.y+sy) || tryMove(c, c.x+sx, c.y) || tryMove(c, c.x, c.y+sy)) { c.fail = 0; return; }
    if (++c.fail > 3) { c.avoid = tg.id; c.avoidUntil = tick + 240; c.tgt = null; c.fail = 0; }   // can't reach it: give up for a while
  }
  if ((tick + c.id) % 2 === 0) {
    if (R.flee && fleeFrom(c, ['wolf'], 6)) return;                       // rabbits and deer run from wolves
    if (R.hunt && c.en > 40 && fleeFrom(c, CIVS, 5)) return;              // fed wolves keep away from settlements
  }
  if (R.civ) {
    if (Math.random() < .3) {
      for (let k = 1; k < 9; k++) {
        const nx = c.x + DIRS[k][0], ny = c.y + DIRS[k][1];
        if (!inb(nx, ny)) continue;
        const o = bld[nx + ny*W];
        if (o && R.foes.includes(BUILD_OWNER[o]) && Math.random() < .4) { bld[nx + ny*W] = 0; fx('hit', nx, ny); dirty = true; break; }
      }
    }
    if (bld[idx] === 0 && Math.random() < .02 && R.build.includes(tiles[idx]) && (counts[c.t]||0) >= 2
        && (hb[R.bi]||0) < capOf(c.t)*.3 && countHouses(c.x, c.y, 5, R.bi) < 3 && countHouses(c.x, c.y, 1, R.bi) === 0) {
      bld[idx] = R.bi; fx('puff', c.x, c.y); dirty = true;
    }
  } else if (R.br) {
    if (Math.random() < R.br.p && (counts[c.t]||0) < capOf(c.t) && cells[(c.y>>3)*GW + (c.x>>3)].length < R.br.dens && R.br.tiles.includes(tiles[idx])) spawnNear(c.t, c.x, c.y);
  } else if (R.hunt) {
    if (c.en > 85 && Math.random() < .006 && (counts.wolf||0) < capOf('wolf')) { c.en -= 35; spawnNear('wolf', c.x, c.y); }
  }
  const roam = R.hunt && c.en <= 75;                          // hungry wolves roam in straight lines to find prey
  if (Math.random() < (roam ? .06 : .3)) c.dir = roam ? ri(1, 8) : ri(0, 8);
  const d = DIRS[c.dir];
  if (d[0] || d[1]) { if (!tryMove(c, c.x + d[0], c.y + d[1])) c.dir = ri(0, 8); }
}

/* ============================== WORLD TICK ============================== */
function reapDead() {
  let any = false;
  for (const c of creatures) if (c.hp <= 0) {
    any = true;
    if (effects.length < 400) fx('death', c.x, c.y, { type: c.t, face: c.face, old: c.cause === 'old' });
  }
  if (any) creatures = creatures.filter(c => c.hp > 0);
  counts = {}; for (const c of creatures) counts[c.t] = (counts[c.t]||0) + 1;
}
// Safety net: if wolves get scarce, a small pack wanders in from wild land (far from settlements, near prey).
function wolfPack() {
  const levels = [[12, 8], [7, 4], [4, 2]];             // [min distance to settlers, min distance to houses]: relax if the world is crowded
  for (const [cd, hd] of levels) for (let g = 0; g < 60; g++) {
    const x = ri(1, W - 2), y = ri(1, H - 2), t = tiles[x + y*W];
    if (t !== T.FOREST && t !== T.GRASS && t !== T.HILL) continue;
    const probe = { x, y, id: 0, avoid: 0, avoidUntil: 0 };
    if (findNearest(probe, CIVS, cd)) continue;
    if (countHouses(x, y, hd, 1) + countHouses(x, y, hd, 2) + countHouses(x, y, hd, 3) + countHouses(x, y, hd, 4) > 0) continue;
    if (!findNearest(probe, ['sheep','rabbit','deer'], 10)) continue;
    let n = 0; for (let k = 0; k < 3; k++) if (spawnNear('wolf', x, y)) n++;
    if (n) return true;
  }
  return false;
}
function step() {
  tick++;
  for (const l of cells) l.length = 0;
  for (const c of creatures) cells[(c.y>>3)*GW + (c.x>>3)].push(c);
  for (let i = 0; i < creatures.length; i++) stepCreature(creatures[i]);
  reapDead();
  const wc = counts.wolf || 0;
  if (wc < 4 * CAPK && Math.random() < (wc === 0 ? 1/80 : 1/300)) wolfPack();

  const spread = []; houseCount = 0; hb = [0,0,0,0,0];
  for (let i = 0; i < N; i++) {
    const b = bld[i];
    if (b) {
      houseCount++; hb[b]++;
      const race = BUILD_OWNER[b];
      if (Math.random() < .005 && (counts[race]||0) < capOf(race)) {
        const x = i % W, y = (i / W) | 0;
        if (cells[(y>>3)*GW + (x>>3)].length < 12) spawnNear(race, x, y);
      }
    }
    const f = fire[i];
    if (f) {
      fire[i] = f - 1;
      if (f - 1 === 0) {
        if (bld[i]) bld[i] = 0;
        if (tiles[i] === T.FOREST || tiles[i] === T.GRASS) tiles[i] = T.BURNT;
      }
      const x = i % W, y = (i / W) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + (k===0) - (k===1), ny = y + (k===2) - (k===3);
        if (!inb(nx, ny)) continue;
        const ni = nx + ny*W;
        if (fire[ni]) continue;
        const fl = Math.max(FLAM[tiles[ni]], bld[ni] ? .3 : 0);
        if (fl && Math.random() < fl) spread.push(ni);
      }
    }
  }
  for (const i of spread) ignite(i);

  const ns = Math.round(80 * N / 17760);
  for (let s = 0; s < ns; s++) {
    const i = (Math.random() * N) | 0, t = tiles[i];
    if (t === T.BURNT) { if (Math.random() < .3) tiles[i] = T.GRASS; }
    else if (t === T.GRASS) {
      if (Math.random() < .03) {
        const x = i % W, y = (i / W) | 0, o = DIRS[ri(1, 8)];
        if (inb(x+o[0], y+o[1]) && tiles[x+o[0] + (y+o[1])*W] === T.FOREST && !bld[i]) tiles[i] = T.FOREST;
      }
    } else if (t === T.LAVA) {
      const x = i % W, y = (i / W) | 0;
      for (let k = 1; k < 9; k += 2) { const nx = x+DIRS[k][0], ny = y+DIRS[k][1]; if (inb(nx,ny) && Math.random() < .35) ignite(nx + ny*W); }
      if (Math.random() < .03) tiles[i] = T.HILL;
    }
    if (bld[i] && Math.random() < .01) bld[i] = 0;
  }
}

function populate(scale) {
  const sc = scale == null ? (cfg.settings.population == null ? 1 : +cfg.settings.population) : scale;
  const tryPlace = (type, n, pred) => {
    n = Math.round(n * sc * CAPK); let guard = 0;
    while (n > 0 && guard++ < 4000) {
      const x = ri(0, W-1), y = ri(0, H-1);
      if (pred(tiles[x + y*W]) && walkable(type, tiles[x + y*W])) {
        const group = type === 'sheep' ? 4 : 3;
        for (let k = 0; k < group && n > 0; k++) { spawnNear(type, x, y); n--; }
      }
    }
  };
  tryPlace('sheep', 24, t => t === T.GRASS);
  tryPlace('rabbit', 28, t => t === T.GRASS || t === T.FOREST || t === T.HILL);
  tryPlace('deer', 10, t => t === T.FOREST || t === T.GRASS);
  const prey = creatures.filter(c => RACES[c.t].prey);               // wolves start next to food
  for (let n = Math.round(4 * sc * CAPK), g = 0; n > 0 && prey.length && g < 400; g++) {
    const p = prey[ri(0, prey.length - 1)];
    if (spawnNear('wolf', p.x + ri(-5, 5), p.y + ri(-5, 5))) n--;
  }
  tryPlace('human', 7, t => t === T.GRASS);
  tryPlace('elf', 6, t => t === T.FOREST);
  tryPlace('dwarf', 6, t => t === T.HILL);
  tryPlace('orc', 5, t => t === T.GRASS || t === T.HILL);
}

/* ============================== CAMERA / RENDER ============================== */
const off = document.createElement('canvas');
const octx = off.getContext('2d');
let img = null;
function setSize(idx) {
  sizeIdx = SIZES[idx] ? idx : 1;
  const z = SIZES[sizeIdx];
  W = z.w; H = z.h; N = W * H; CAPK = z.k;
  tiles = new Uint8Array(N); bld = new Uint8Array(N); fire = new Uint8Array(N); jit = new Int8Array(N);
  GW = Math.ceil(W / 8); GH = Math.ceil(H / 8); cells = Array.from({ length: GW * GH }, () => []);
  off.width = W; off.height = H; img = octx.createImageData(W, H);
  creatures = []; effects.length = 0; counts = {}; houseCount = 0; hb = [0,0,0,0,0];
}
let sc = 6, ox = 0, oy = VIEW.y, frame = 0;
const fitScale = () => Math.min(VIEW.w / W, VIEW.h / H);      // full-map zoom = minimum zoom
const MAX_SC = 36;
function fitCamera() { sc = fitScale(); clampCam(); }
function startCamera() {                       // open a bit closer than full map on big worlds, centred on some life
  sc = Math.max(fitScale(), 6);
  let cx = W / 2, cy = H / 2;
  if (creatures.length) { const c = creatures[(creatures.length / 2) | 0]; cx = c.x; cy = c.y; }
  ox = VIEW.x + VIEW.w/2 - (cx + .5)*sc; oy = VIEW.y + VIEW.h/2 - (cy + .5)*sc; clampCam();
}
function clampCam() {
  // when the map is smaller than the viewport on an axis, centre it; otherwise never show empty space
  const cw = W*sc, ch = H*sc;
  ox = cw <= VIEW.w ? VIEW.x + (VIEW.w - cw) / 2 : Math.min(VIEW.x, Math.max(VIEW.x + VIEW.w - cw, ox));
  oy = ch <= VIEW.h ? VIEW.y + (VIEW.h - ch) / 2 : Math.min(VIEW.y, Math.max(VIEW.y + VIEW.h - ch, oy));
}
function zoomAt(px, py, f) {
  const ns = Math.min(MAX_SC, Math.max(fitScale(), sc * f)), wx = (px - ox) / sc, wy = (py - oy) / sc;
  sc = ns; ox = px - wx*sc; oy = py - wy*sc; clampCam();
}
const zoomBy = f => zoomAt(VIEW.x + VIEW.w/2, VIEW.y + VIEW.h/2, f);
const toWorld = (px, py) => [Math.floor((px - ox)/sc), Math.floor((py - oy)/sc)];

const SIN = new Float32Array(256); for (let i = 0; i < 256; i++) SIN[i] = Math.sin(i / 256 * Math.PI * 2) * 7;
function renderTerrain() {
  const d = img.data, fi = (frame * 2) | 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = x + y*W, t = tiles[i], c = COL[t]; let j = jit[i];
    if (t <= 1) j += SIN[(fi + x*22 + y*14) & 255];
    let r = c[0] + j, g = c[1] + j, b = c[2] + j;
    if (fire[i]) { const fl = (frame*7 + i*13) % 3; r = 255; g = fl === 0 ? 220 : fl === 1 ? 140 : 80; b = 20; }
    const k = i*4; d[k] = r; d[k+1] = g; d[k+2] = b; d[k+3] = 255;
  }
  octx.putImageData(img, 0, 0);
}

function draw() {
  frame++;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#070a16'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.save();
  ctx.beginPath(); ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); ctx.clip();
  if (frame % (N > 40000 ? 2 : 1) === 0) renderTerrain();      // big maps redraw terrain every other frame
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, ox, oy, W*sc, H*sc);

  const x0 = Math.max(0, Math.floor((VIEW.x-ox)/sc) - 1), x1 = Math.min(W-1, Math.ceil((VIEW.x+VIEW.w-ox)/sc));
  const y0 = Math.max(0, Math.floor((VIEW.y-oy)/sc) - 1), y1 = Math.min(H-1, Math.ceil((VIEW.y+VIEW.h-oy)/sc));

  SPR_K = Math.max(1, Math.round(sc / 6));
  const S = 10 * SPR_K;
  if (sc >= 5) {
    for (let y = y0; y <= Math.min(H-1, y1 + 2); y++) for (let x = x0; x <= x1; x++) {
      const idx = x + y*W, b = bld[idx]; if (!b) continue;
      const cx = ox + (x + .5)*sc, fy = oy + (y + 1)*sc - sc*.05;
      ctx.drawImage(HATLAS[b], cx - S/2, fy - S, S, S);
      if (fire[idx]) { ctx.fillStyle = frame % 6 < 3 ? 'rgba(255,170,30,.8)' : 'rgba(255,80,20,.8)'; ctx.fillRect(cx - S*.3, fy - S*.85, S*.6, S*.55); }
    }
    for (const c of creatures) { c.dx += (c.x - c.dx) * .3; c.dy += (c.y - c.dy) * .3; }
    const order = creatures.slice().sort((a, b) => a.dy - b.dy);
    for (const c of order) {
      if (c.dx < x0-2 || c.dx > x1+2 || c.dy < y0-2 || c.dy > y1+3) continue;
      const cx = ox + (c.dx + .5)*sc, fy = oy + (c.dy + 1)*sc - sc*.08;
      const moving = Math.abs(c.x - c.dx) + Math.abs(c.y - c.dy) > .12;
      let f = 'A';
      if (c.atk > 0) { f = 'C'; c.atk--; } else if (moving && ((frame >> 3) + c.id) % 2) f = 'B';
      const lunge = c.atk > 3 ? 2 * SPR_K : 0;
      const spr = ATLAS[c.t][f];
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(cx - S*.3, fy - Math.max(1, S*.08), S*.6, Math.max(1, S*.1));
      if (c.face < 0) { ctx.save(); ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.drawImage(spr, -S/2 + lunge, fy - S, S, S); ctx.restore(); }
      else ctx.drawImage(spr, cx - S/2 + lunge, fy - S, S, S);
      if (sc >= 8 && c.hp < c.mhp) { ctx.fillStyle = '#000'; ctx.fillRect(cx - S*.4 - 1, fy - S - 5, S*.8 + 2, 4); ctx.fillStyle = '#4f4'; ctx.fillRect(cx - S*.4, fy - S - 4, S*.8*Math.max(0, c.hp/c.mhp), 2); }
    }
  } else {
    // far zoom (big maps): plain dots instead of sprites
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const b = bld[x + y*W]; if (!b) continue;
      const hs = Math.max(3, sc*1.1), cx = ox + (x + .5)*sc, cy = oy + (y + .5)*sc;
      ctx.fillStyle = '#1c1420'; ctx.fillRect(cx - hs/2 - 1, cy - hs/2 - 1, hs + 2, hs + 2);
      ctx.fillStyle = RACES[BUILD_OWNER[b]].col; ctx.fillRect(cx - hs/2, cy - hs/2, hs, hs);
    }
    const ds = Math.max(2, sc*.65);
    for (const c of creatures) {
      c.dx += (c.x - c.dx) * .3; c.dy += (c.y - c.dy) * .3;
      if (c.dx < x0-2 || c.dx > x1+2 || c.dy < y0-2 || c.dy > y1+2) continue;
      ctx.fillStyle = RACES[c.t].col; ctx.fillRect(ox + (c.dx + .5)*sc - ds/2, oy + (c.dy + .5)*sc - ds/2, ds, ds);
    }
  }
  drawEffects();
  if (cfg.settings.dayNight) {
    const a = Math.max(0, -Math.cos(tick / (TPS * 90) * Math.PI * 2)) * .38;
    if (a > .01) { ctx.fillStyle = `rgba(6,10,50,${a})`; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); }
  }
  if (hover && tool !== 'inspect' && TOOLS[tool]) {
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox + (hover[0]+.5)*sc, oy + (hover[1]+.5)*sc, (brushR() + .5)*sc, 0, 7); ctx.stroke();
  }
  ctx.restore();
}

function drawEffects() {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i]; e.t++;
    const px = ox + (e.x + .5)*sc, py = oy + (e.y + .5)*sc; let life = 14;
    if (e.k === 'bolt') {
      life = 10; ctx.strokeStyle = `rgba(255,255,200,${1 - e.t/life})`; ctx.lineWidth = 5;
      ctx.beginPath(); let cx = px, cy = py - 700; ctx.moveTo(cx, cy);
      for (let k = 1; k <= 8; k++) { cx = k === 8 ? px : px + (hash(k, e.seed, 3) - .5) * 60; cy += (py - cy) / (9 - k); ctx.lineTo(cx, cy); }
      ctx.stroke(); ctx.fillStyle = `rgba(255,255,255,${.45*(1 - e.t/life)})`; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
    } else if (e.k === 'boom') {
      life = 26; const p = e.t/life;
      ctx.fillStyle = `rgba(255,${200 - p*150|0},40,${1-p})`; ctx.beginPath(); ctx.arc(px, py, e.r*sc*(.3 + p*1.3), 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${1-p})`; ctx.lineWidth = 3; ctx.stroke();
    } else if (e.k === 'rain') {
      life = 12; ctx.strokeStyle = `rgba(150,200,255,${1 - e.t/life})`; ctx.lineWidth = 2;
      const yy = py - (life - e.t) * sc * .9; ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px - sc*.15, yy + sc*1.2); ctx.stroke();
    } else if (e.k === 'smite') {
      life = 16; const p = e.t/life; ctx.strokeStyle = `rgba(255,70,70,${1-p})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, sc*(1+p*2), 0, 7); ctx.stroke();
    } else if (e.k === 'bless') {
      life = 20; const p = e.t/life; ctx.fillStyle = `rgba(150,255,170,${1-p})`; ctx.fillRect(px - 1, py - p*sc*2.5, 4, 4);
    } else if (e.k === 'hit') {
      life = 6; ctx.fillStyle = `rgba(255,255,255,${1 - e.t/life})`; ctx.fillRect(px - sc*.3, py - sc*.3, Math.max(3,sc*.6), Math.max(3,sc*.6));
    } else if (e.k === 'puff') {
      life = 12; ctx.strokeStyle = `rgba(255,255,255,${.8 - e.t/life})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, sc*(.3 + e.t/life), 0, 7); ctx.stroke();
    } else if (e.k === 'splash') {
      life = 12; ctx.strokeStyle = `rgba(200,230,255,${1 - e.t/life})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, sc*(.4 + e.t/life*1.2), 0, 7); ctx.stroke();
    } else if (e.k === 'death') {
      life = 30; const S = 10 * SPR_K, sp = ATLAS[e.type].A, fy = py + sc*.42;
      if (sc < 5) { if (e.t >= life) effects.splice(i, 1); continue; }
      ctx.save();
      if (e.old) { ctx.globalAlpha = Math.max(0, .7*(1 - e.t/life)); ctx.drawImage(sp, px - S/2, fy - S - e.t*.25*SPR_K, S, S); }
      else {
        ctx.globalAlpha = e.t < 14 ? 1 : Math.max(0, 1 - (e.t - 14)/16);
        ctx.translate(px, fy); ctx.scale(e.face || 1, 1); ctx.rotate(Math.min(1, e.t/8) * Math.PI/2);
        ctx.drawImage(sp, -S/2, -S, S, S);
      }
      ctx.restore();
    } else if (e.k === 'spawn') {
      life = 14; ctx.strokeStyle = `rgba(255,255,255,${1 - e.t/life})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, sc*(.2 + e.t/life*.9), 0, 7); ctx.stroke();
    }
    if (e.t >= life) effects.splice(i, 1);
  }
}

/* ============================== TOOLS ============================== */
let tool = 'raise', hover = null, painting = false, panning = false;
let brush = 3, lastApply = 0, lastPointer = [0, 0];
const brushR = () => brush - 1;
const TOOLS = {
  raise:  { g:'terrain', ic:'⛰️', nm:'Naikkan', ms:140 },
  lower:  { g:'terrain', ic:'🌊', nm:'Turunkan', ms:140 },
  grass:  { g:'terrain', ic:'🌱', nm:'Rumput', ms:40 },
  forest: { g:'terrain', ic:'🌲', nm:'Hutan', ms:40 },
  sand:   { g:'terrain', ic:'🏖️', nm:'Pasir', ms:40 },
  lava:   { g:'terrain', ic:'🌋', nm:'Lava', ms:60 },
  human:  { g:'life', ic:'🧑', nm:'Manusia', ms:140, spawn:1 },
  elf:    { g:'life', ic:'🧝', nm:'Elf', ms:140, spawn:1 },
  dwarf:  { g:'life', ic:'🧔', nm:'Kurcaci', ms:140, spawn:1 },
  orc:    { g:'life', ic:'👹', nm:'Orc', ms:140, spawn:1 },
  sheep:  { g:'life', ic:'🐑', nm:'Domba', ms:140, spawn:1 },
  rabbit: { g:'life', ic:'🐇', nm:'Kelinci', ms:140, spawn:1 },
  deer:   { g:'life', ic:'🦌', nm:'Rusa', ms:140, spawn:1 },
  wolf:   { g:'life', ic:'🐺', nm:'Serigala', ms:140, spawn:1 },
  rain:   { g:'powers', ic:'🌧️', nm:'Hujan', ms:40 },
  fire:   { g:'powers', ic:'🔥', nm:'Api', ms:50 },
  bolt:   { g:'powers', ic:'⚡', nm:'Petir', ms:250 },
  meteor: { g:'powers', ic:'☄️', nm:'Meteor', ms:700 },
  bless:  { g:'powers', ic:'✨', nm:'Berkati', ms:120 },
  smite:  { g:'powers', ic:'💀', nm:'Bunuh', ms:90 },
  inspect:{ g:'powers', ic:'🔍', nm:'Periksa', ms:0 },
};

function applyTool(wx, wy) {
  const r = brushR(), T_ = TOOLS[tool];
  if (!T_ || !inb(wx, wy)) return;
  switch (tool) {
    case 'raise': case 'lower': {
      const dir = tool === 'raise' ? 1 : -1;
      forDisc(wx, wy, r, (x, y, i) => {
        if (Math.random() > .75) return;
        let t = tiles[i];
        if (t === T.FOREST || t === T.BURNT) t = T.GRASS;
        if (t === T.LAVA) t = dir > 0 ? T.HILL : T.SAND;
        let k = LADDER.indexOf(t); if (k < 0) k = 3;
        k = Math.max(0, Math.min(LADDER.length - 1, k + dir));
        setTile(i, LADDER[k]);
      });
      break;
    }
    case 'grass': forDisc(wx, wy, r, (x, y, i) => setTile(i, T.GRASS)); break;
    case 'sand':  forDisc(wx, wy, r, (x, y, i) => setTile(i, T.SAND)); break;
    case 'lava':  forDisc(wx, wy, r, (x, y, i) => setTile(i, T.LAVA)); break;
    case 'forest': forDisc(wx, wy, r, (x, y, i) => { const t = tiles[i]; if ((t === T.GRASS || t === T.SAND || t === T.BURNT || t === T.HILL) && Math.random() < .85) setTile(i, T.FOREST); }); break;
    case 'rain':
      forDisc(wx, wy, r, (x, y, i) => {
        fire[i] = 0;
        if (tiles[i] === T.BURNT) tiles[i] = T.GRASS; else if (tiles[i] === T.GRASS && Math.random() < .03) tiles[i] = T.FOREST;
        if (Math.random() < .25) fx('rain', x, y);
      });
      break;
    case 'fire': forDisc(wx, wy, r, (x, y, i) => { if (Math.random() < .7) ignite(i); }); break;
    case 'bolt': {
      const rr = Math.max(1, r >> 1);
      fx('bolt', wx, wy, { seed: (Math.random()*1000)|0 }); haptic('tap');
      forDisc(wx, wy, rr, (x, y, i) => { ignite(i); bld[i] = 0; });
      for (const c of creatures) if ((c.x-wx)**2 + (c.y-wy)**2 <= rr*rr + 1) c.hp = 0;
      break;
    }
    case 'meteor': {
      const R = 4 + (r >> 1);
      fx('boom', wx, wy, { r: R + 2 }); haptic('thud');
      forDisc(wx, wy, R, (x, y, i) => {
        const d = Math.hypot(x - wx, y - wy); bld[i] = 0;
        if (tiles[i] > T.SHALLOW) { if (d < R*.45) setTile(i, T.LAVA); else if (d < R*.8) setTile(i, T.BURNT); }
        else if (d < R*.35) setTile(i, T.SHALLOW);
      });
      forDisc(wx, wy, R + 3, (x, y, i) => { if (Math.random() < .6) ignite(i); });
      for (const c of creatures) if ((c.x-wx)**2 + (c.y-wy)**2 <= (R+1)**2) c.hp = 0;
      break;
    }
    case 'smite':
      fx('smite', wx, wy);
      for (const c of creatures) if ((c.x-wx)**2 + (c.y-wy)**2 <= r*r + .6) { c.hp = 0; fx('hit', c.x, c.y); }
      dirty = true;
      break;
    case 'bless': {
      const add = [];
      for (const c of creatures) if ((c.x-wx)**2 + (c.y-wy)**2 <= r*r + .6) {
        c.hp = c.mhp; c.en = 100; fx('bless', c.x, c.y); if (Math.random() < .12) add.push(c);
      }
      for (const c of add) spawnNear(c.t, c.x, c.y);
      break;
    }
    default:
      if (T_.spawn) {
        const n = Math.max(1, Math.round(brush * brush * .45)); let placed = 0;
        for (let k = 0; k < n * 3 && placed < n; k++) {
          const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * r;
          const c = spawn(tool, Math.round(wx + Math.cos(a)*d), Math.round(wy + Math.sin(a)*d));
          if (c) { placed++; if (placed <= 4) fx('spawn', c.x, c.y); }
        }
        if (!placed) { const c = spawn(tool, wx, wy); if (c) fx('spawn', c.x, c.y); }
      }
  }
}

let infoT = 0;
function inspectAt(wx, wy) {
  let best = null, bd = 9;
  for (const c of creatures) { const d = (c.x-wx)**2 + (c.y-wy)**2; if (d < bd) { bd = d; best = c; } }
  const NM = { human:'Manusia', elf:'Elf', dwarf:'Kurcaci', orc:'Orc', sheep:'Domba', wolf:'Serigala', rabbit:'Kelinci', deer:'Rusa' };
  if (best) {
    const c = best, R = RACES[c.t];
    infoEl.innerHTML = `<b>${EMOJI[c.t]} ${NM[c.t]}</b><br>❤️ ${Math.ceil(c.hp)}/${c.mhp} · ⏳ ${(c.age/120).toFixed(1)}/${(c.life/120).toFixed(1)}`
      + (R.hunt ? `<br>⚡ ${Math.round(c.en)}` : '') + (c.kills ? `<br>⚔️ ${c.kills}` : '');
  } else if (inb(wx, wy)) {
    const i = wx + wy*W, nm = ['Laut dalam','Laut dangkal','Pasir','Rumput','Hutan','Bukit','Gunung','Salju','Lava','Tanah hangus'][tiles[i]];
    infoEl.innerHTML = `<b>${nm}</b>` + (bld[i] ? `<br>🏠 ${NM[BUILD_OWNER[bld[i]]]}` : '') + (fire[i] ? '<br>🔥' : '');
  }
  infoEl.style.display = 'block'; clearTimeout(infoT); infoT = setTimeout(() => infoEl.style.display = 'none', 3500);
}

/* ============================== INPUT ============================== */
const ptrs = new Map();
function cpos(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * SCREEN_W / r.width, (e.clientY - r.top) * SCREEN_H / r.height]; }
const inView = (p) => p[0] >= VIEW.x && p[0] <= VIEW.x + VIEW.w && p[1] >= VIEW.y && p[1] <= VIEW.y + VIEW.h;

cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  const p = cpos(e);
  if (!inView(p)) return;
  cv.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: p[0], y: p[1] });
  lastPointer = p;
  if (ptrs.size >= 2) { painting = false; panning = true; return; }
  if (tool === 'hand' || e.button === 1 || e.button === 2) { panning = true; return; }
  hover = toWorld(p[0], p[1]);
  if (tool === 'inspect') inspectAt(hover[0], hover[1]);
  else if (!(editMode && !editTool())) { painting = true; lastApply = 0; }
});
cv.addEventListener('pointermove', e => {
  const p = cpos(e);
  hover = toWorld(p[0], p[1]);
  const s = ptrs.get(e.pointerId); if (!s) return;
  const ddx = p[0] - s.x, ddy = p[1] - s.y; s.x = p[0]; s.y = p[1];
  if (ptrs.size === 2) {
    ox += ddx / 2; oy += ddy / 2; clampCam();
  } else if (panning) { ox += ddx; oy += ddy; clampCam(); }
  lastPointer = p;
});
const endPtr = e => {
  ptrs.delete(e.pointerId);
  if (ptrs.size === 0) { if (painting && editMode) persistWorld(); painting = false; panning = false; if (e.pointerType !== 'mouse') hover = null; }
  else if (ptrs.size === 1) { painting = false; panning = true; }
};
cv.addEventListener('pointerup', endPtr);
cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', e => e.preventDefault(), { passive:false });   // zoom is button-only
const onKey = e => { if (e.code === 'KeyP' && !editMode) togglePause(); if (e.key === '[') setBrush(brush - 1); if (e.key === ']') setBrush(brush + 1); };
window.addEventListener('keydown', onKey);

/* ============================== UI ============================== */
const GROUPS = editMode ? [['terrain','⛰️'], ['world','🌍']] : [['terrain','⛰️'], ['life','🧑'], ['powers','⚡'], ['world','🌍']];
let group = 'terrain';
const editTool = () => TOOLS[tool] && TOOLS[tool].g === 'terrain';

function persistWorld() {
  if (!editMode) return;
  cfg.world = cfg.world || {};
  cfg.world.tiles = rleEncode(); cfg.world.seed = currentSeed; cfg.world.size = sizeIdx;
}
let pendingKey = '', pendingT = 0;
function confirmThen(key, msg, fn) {              // destructive actions need a second tap (no alert/confirm in the sandbox)
  const now = performance.now();
  if (pendingKey === key && now - pendingT < 2600) { pendingKey = ''; fn(); }
  else { pendingKey = key; pendingT = now; toast('⚠️ ' + msg + ' — tekan lagi'); }
}
function newWorld(idx) {
  setSize(idx == null ? sizeIdx : idx);
  generate(1 + ((Math.random() * 1e6) | 0));
  if (!editMode) populate();
  startCamera(); persistWorld(); dirty = true; if (!editMode) clearSave();
}
const WORLD_ACTIONS = [
  { ic:'🗺️', fn: () => confirmThen('new', 'Dunia baru', () => { newWorld(); toast('🗺️ ' + SIZES[sizeIdx].label); }) },
  ...SIZES.map((z, i) => ({ ic: z.name, on: () => sizeIdx === i,
    fn: () => confirmThen('size' + i, `${z.label} ${z.w}×${z.h}`, () => { newWorld(i); renderRow2(); toast(`🗺️ ${z.label} ${z.w}×${z.h}`); }) })),
  { ic:'🌊', fn: () => confirmThen('ocean', 'Lautan kosong', () => { emptyWorld(); currentSeed = 0; startCamera(); persistWorld(); dirty = true; toast('🌊'); }) },
  ...(editMode ? [] : [
    { ic:'🐾', fn: () => { populate(1); toast('🐾'); } },
    { ic:'🧹', fn: () => confirmThen('clear', 'Hapus makhluk & rumah', () => { creatures = []; bld.fill(0); counts = {}; houseCount = 0; dirty = true; toast('🧹'); }) },
  ]),
  { ic:'🌗', fn: () => { cfg.settings.dayNight = !cfg.settings.dayNight; toast(cfg.settings.dayNight ? '🌗 on' : '🌗 off'); } },
];

const tabBtns = [];
function renderRow1() {
  row1.innerHTML = ''; tabBtns.length = 0;
  for (const [g, ic] of GROUPS) {
    const b = mkBtn(row1, ic, () => { group = g; renderRow1(); renderRow2(); }, g === group ? 'on' : '');
    tabBtns.push(b);
  }
  const bb = el('div', 'awbrush', row1);
  mkBtn(bb, '−', () => setBrush(brush - 1));
  const sp = document.createElement('span'); sp.id = 'awbv'; sp.textContent = brush; bb.appendChild(sp);
  mkBtn(bb, '+', () => setBrush(brush + 1));
}
function setBrush(v) { brush = Math.max(1, Math.min(10, v)); const s = document.getElementById('awbv'); if (s) s.textContent = brush; }
function renderRow2() {
  row2.innerHTML = '';
  if (group === 'world') { for (const a of WORLD_ACTIONS) mkBtn(row2, a.ic, a.fn, a.on && a.on() ? 'on' : ''); return; }
  for (const [id, t] of Object.entries(TOOLS)) if (t.g === group) mkBtn(row2, t.ic, () => selectTool(id), tool === id ? 'on' : '');
}
function selectTool(id) {
  tool = id; handBtn.classList.toggle('on', id === 'hand');
  if (TOOLS[id]) { group = TOOLS[id].g; toast(TOOLS[id].ic + ' ' + TOOLS[id].nm); }
  renderRow1(); renderRow2();
}
function togglePause() { paused = !paused; pauseBtn.textContent = paused ? '▶' : '⏸'; pauseBtn.classList.toggle('on', paused); }

let pauseBtn = null;
if (!editMode) pauseBtn = mkBtn(btns, '⏸', togglePause);
const speeds = [1, 3, 8];
const speedBtn = editMode ? null : mkBtn(btns, '1×', b => { speed = speeds[(speeds.indexOf(speed) + 1) % speeds.length]; b.textContent = speed + '×'; });
const handBtn = mkBtn(btns, '✋', () => selectTool(tool === 'hand' ? 'raise' : 'hand'));
mkBtn(btns, '−', () => zoomBy(1/1.5));
mkBtn(btns, '+', () => zoomBy(1.5));

function updateStats() {
  let h = '';
  if (editMode) yearEl.textContent = '✏️';
  else {
    yearEl.textContent = '📅 ' + Math.floor(tick / 120);
    for (const r of STAT_ORDER) h += `<span>${EMOJI[r]}${counts[r] || 0}</span>`;
    h += `<span>🏠${houseCount}</span>`;
  }
  statsEl.innerHTML = h;
}

/* ============================== SAVE / LOAD (play mode) ============================== */
function clearSave() { try { lib.deleteUserGameState && lib.deleteUserGameState(); } catch (e) {} }
function serialize() {
  const bl = []; for (let i = 0; i < N; i++) if (bld[i]) bl.push(i * 8 + bld[i]);
  return { v: 3, z: sizeIdx, seed: currentSeed, tiles: rleEncode(), bld: bl, tick,
    cr: creatures.map(c => (c.y * W + c.x) * 8 + RN.indexOf(c.t)) };      // one packed int per creature
}
function restore(s) {
  if (!s || (s.v !== 1 && s.v !== 2 && s.v !== 3)) return false;
  setSize(s.v === 1 ? 0 : s.z);                                                 // v1 saves were always the small map
  if (!rleDecode(s.tiles)) return false;
  currentSeed = s.seed || 0; tick = s.tick || 0;
  for (const v of s.bld || []) { const i = v >> 3, b = v & 7; if (i < N && b >= 1 && b <= 4) bld[i] = b; }
  for (const v of s.cr || []) {
    let ti, x, y, age = -1;
    if (Array.isArray(v)) { ti = v[0]; x = v[1]; y = v[2]; age = v[3]; }
    else { const m = s.v === 3 ? 8 : 6; ti = v % m; const pos = (v / m) | 0; x = pos % W; y = (pos / W) | 0; }
    const c = RN[ti] ? spawn(RN[ti], x, y, true) : null;
    if (c) c.age = age >= 0 ? age : Math.floor(c.life * rnd(0, .4));
  }
  return true;
}
let saveBusy = false;
async function autosave() {
  if (editMode || !dirty || saveBusy || !lib.saveUserGameState) return;
  saveBusy = true; dirty = false;
  try { await lib.saveUserGameState(serialize()); } catch (e) { dirty = true; }
  saveBusy = false;
}

/* ============================== LOOP ============================== */
let lastT = performance.now(), acc = 0, statT = 0, saveT = 0, rafId = 0;
const myToken = (window.__awToken = (window.__awToken || 0) + 1);
function loop(now) {
  if (window.__awToken !== myToken) return;               // a newer run() took over
  const dt = Math.min(.11, (now - lastT) / 1000); lastT = now;
  if (!paused && !editMode) {
    acc += dt * TPS * speed; let n = 0;
    while (acc >= 1 && n < 30) { step(); acc--; n++; }
    if (acc > 30) acc = 0;
  }
  if (painting && now - lastApply >= (TOOLS[tool] ? TOOLS[tool].ms : 100)) {
    lastApply = now;
    const [wx, wy] = toWorld(lastPointer[0], lastPointer[1]); hover = [wx, wy];
    applyTool(wx, wy); reapDead();
  }
  draw();
  if (now - statT > 250) { statT = now; updateStats(); }
  if (now - saveT > 15000) { saveT = now; autosave(); }
  rafId = requestAnimationFrame(loop);
}

/* ============================== START ============================== */
async function start() {
  const wantSize = SIZES[cfg.world.size] ? cfg.world.size : 1;       // default: Medium
  setSize(wantSize);
  let restored = false;
  if (!editMode && lib.getUserGameState) {
    try { const r = await lib.getUserGameState(); restored = restore(r && r.state); } catch (e) {}
  }
  if (!restored) {
    setSize(wantSize);
    if (rleDecode(cfg.world.tiles)) { currentSeed = cfg.world.seed || 0; bld.fill(0); fire.fill(0); creatures = []; }
    else generate(cfg.world.seed || (1 + ((Math.random() * 1e6) | 0)));
    if (!editMode) populate();
  }
  counts = {}; for (const c of creatures) counts[c.t] = (counts[c.t]||0) + 1;
  startCamera(); renderRow1(); renderRow2(); updateStats();
  if (lib.showGameParameters) {
    try {
      lib.showGameParameters({ name: 'Astro World', params: {
        'Siang-malam': { key: 'settings.dayNight', type: 'checkbox' },
        'Populasi awal': { key: 'settings.population', type: 'slider', min: 0, max: 3, step: 0.5 },
      } });
    } catch (e) {}
  }
  lastT = performance.now();
  rafId = requestAnimationFrame(loop);
}
start();

window.__world = { cam: (x, y, z) => { sc = z; ox = VIEW.x + VIEW.w/2 - (x + .5)*sc; oy = VIEW.y + VIEW.h/2 - (y + .5)*sc; clampCam(); }, get tiles() { return tiles; }, get bld() { return bld; }, get fire() { return fire; }, get size() { return sizeIdx; }, get creatures() { return creatures; }, get counts() { return counts; }, step, applyTool, setTool: id => { tool = id; }, get W() { return W; }, get H() { return H; }, T };
}

// The platform boots the game by calling window.run(mode); publishing bundles
// game.js into an IIFE, so run must be assigned to window explicitly.
window.run = run;
