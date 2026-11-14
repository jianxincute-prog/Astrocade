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
  // Werewolves: evolved wolves. Neutral (nobody's foe, hates nobody) and slow-growing: few houses, rare births, long lives.
  werewolf: { col:'#5ef0ff', hp:40, dmg:6, mv:2, civ:1, cap:36, life:[2500,4000], foes:[], build:[T.FOREST,T.HILL,T.GRASS], bi:5, buildP:.002, spawnP:.0004 },
  // Wild fauna. prey = wolf food; br = breeding (p per move, tiles, max animals per 8x8 cell); flee = runs from wolves.
  sheep:  { col:'#ffffff', hp:10, dmg:0, mv:3, civ:0, cap:110, life:[600,1100], foes:[], build:[], bi:0, prey:1, br:{ p:.02,  tiles:[T.GRASS], dens:14 } },
  rabbit: { col:'#c9a37a', hp:6,  dmg:0, mv:2, civ:0, cap:160, life:[500,900],  foes:[], build:[], bi:0, prey:1, flee:1, br:{ p:.035, tiles:[T.GRASS,T.FOREST,T.HILL], dens:16 } },
  deer:   { col:'#c68a4e', hp:16, dmg:0, mv:2, civ:0, cap:70,  life:[900,1500], foes:[], build:[], bi:0, prey:1, flee:1, br:{ p:.014, tiles:[T.FOREST,T.GRASS], dens:8 } },
  wolf:   { col:'#2b2e36', hp:28, dmg:5, mv:1, civ:0, cap:28,  life:[900,1500], foes:['sheep','rabbit','deer'], hunt:1, build:[], bi:0 },
};
// ---- Kingdoms (civilization layer) ----
const ECO = { human:{f:1.3,w:1,s:1,g:1}, elf:{f:.9,w:1.6,s:.6,g:.6}, dwarf:{f:1.1,w:.7,s:2,g:3}, orc:{f:1,w:1,s:1,g:.8}, werewolf:{f:1,w:1,s:.8,g:.6} };
const LV_ICON = ['🛖','🏘️','🏙️','🏰'], LV_NAME = ['Suku','Desa','Kota','Kerajaan'];
const LV_REQ = [ { pop:6, houses:3, wood:15 }, { pop:16, houses:7, stone:30, food:40 }, { pop:32, houses:12, gold:25, stone:40 } ];
const NAME_P = {
  human:[['Al','Ber','Cor','Dun','El','Fen','Gar','Hol','Ith','Kar','Lor','Mar'],['ia','ford','ton','mark','heim','vale']],
  elf:[['Ael','Sil','Lor','Thal','Nyr','Eri','Cael'],['wen','ael','iel','indor','ariel','anor']],
  dwarf:[['Thor','Dur','Bar','Kaz','Mor','Gim','Bal'],['in','dum','gard','hold','bek','kor']],
  orc:[['Gor','Zug','Mog','Gra','Kru','Thrak','Ugh'],['ash','gash','uk','nar','dak','mok']],
  werewolf:[['Lun','Fen','Va','Mar','Grey','Nox','Ulv'],['fang','moon','howl','pelt','mere','claw']],
};
const BORDER_RGB = [null, [74,163,255], [226,169,255], [255,154,46], [255,61,61], [94,240,255]];     // by house owner index (race.bi)
const RN = ['human','elf','dwarf','orc','sheep','wolf','rabbit','deer','werewolf'];     // index order is part of the save format
const STAT_ORDER = ['human','elf','dwarf','orc','sheep','rabbit','deer','wolf','werewolf'];
const GAIN = { rabbit:25, sheep:45, deer:60 };                               // wolf energy per kill (default 45)
const BUILD_OWNER = [null,'human','elf','dwarf','orc','werewolf'];
const EMOJI = { human:'🧑', elf:'🧝', dwarf:'🧔', orc:'👹', sheep:'🐑', wolf:'🐺', rabbit:'🐇', deer:'🦌', werewolf:'🌕' };
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
  #awstats{position:absolute;left:10px;top:104px;right:10px;height:40px;display:flex;gap:3px;align-items:center;font-size:17px;overflow-x:auto;scrollbar-width:none;font-variant-numeric:tabular-nums;white-space:nowrap}
  #awstats span{background:#1d2646;border:2px solid #2c3868;border-radius:999px;padding:1px 4px;flex:0 0 auto}
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
let kid, own, ownRace, ownEdge, ownScore;      // kingdom id per house tile / territory map (allocated by setSize())
const kingdoms = new Map(); let nextKid = 1, showBorders = true, ownDirty = true;
let creatures = [], nextId = 1, tick = 0;
let speed = 1, paused = editMode;
let counts = {}, houseCount = 0, hb = [0,0,0,0,0,0];
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

/* ============================== SPRITES (pixel art, defined in code) ============================== */
// Creatures: frames A,B (walk) and C (attack); sizes vary per species (rabbit 11x10 ... werewolf 14x16). Houses: 10x10, frame A. '.' = transparent.
const OUT = '#1c1420';
const SPRITES = {
  human: {
    pal: { o:'#1c1424', h:'#5b3a22', H:'#8c5c32', s:'#f2c48c', S:'#d49a68', e:'#1c1424', c:'#3f8cff', C:'#86bcff', d:'#2457b8', v:'#1f3f8a', g:'#f0c850', p:'#4a4262', P:'#6a6088', b:'#3a2518', w:'#e8eef8' },
    A: ["...oooooo...", "..ohHHhhho..", ".ohHhhhhhho.", ".ohhssSShho.", ".ohsesSeSho.", "..osssSSSo..", "...osSSSo...", "ovCcccccccvo", "ocCcccccccco", "ocCcccccccco", "osggggggggSo", "..oppPpppo..", "..oppo.oppo.", "..obbo.obbo."],
    B: ["...oooooo...", "..ohHHhhho..", ".ohHhhhhhho.", ".ohhssSShho.", ".ohsesSeSho.", "..osssSSSo..", "...osSSSo...", "ovCcccccccvo", "ocCcccccccco", "ocCcccccccco", "osggggggggSo", "..oppPpppo..", ".oppo...oppo", ".obbo...obbo"],
    C: ["...oooooo..w", "..ohHHhhho.w", ".ohHhhhhhhow", ".ohhssSShhow", ".ohsesSeShow", "..osssSSSo.w", "...osSSSo..w", "ovCcccccccvw", "ocCcccccccsg", "ocCcccccccso", "osggggggggSo", "..oppPpppo..", "..oppo.oppo.", "..obbo.obbo."],
  },
  elf: {
    pal: { o:'#1c1424', h:'#f3e7a0', H:'#fff6d0', i:'#d4c070', s:'#f8dcc0', S:'#e0b898', e:'#2a8a4a', c:'#c58cf0', C:'#e8c8ff', d:'#8350b8', g:'#40b060', G:'#7be090', p:'#4a3e66', b:'#3a2c50', w:'#e8eef8' },
    A: ["...oooooo...", "..ohHHhhho..", ".ohHhhhhhho.", "oshhssSShhSo", ".ohsesSeSho.", ".ohissSShho.", ".ohhisShhho.", "ohhCccccchho", ".occCggccco.", ".occCccccco.", ".osgGggggSo.", "..occcccco..", "..odccccdo..", "..opo.opo...", "..obo.obo..."],
    B: ["...oooooo...", "..ohHHhhho..", ".ohHhhhhhho.", "oshhssSShhSo", ".ohsesSeSho.", ".ohissSShho.", ".ohhisShhho.", "ohhCccccchho", ".occCggccco.", ".occCccccco.", ".osgGggggSo.", "..occcccco..", "..odccccdo..", ".opo...opo..", ".obo...obo.."],
    C: ["...oooooo...", "..ohHHhhho..", ".ohHhhhhhho.", "oshhssSShhSo", ".ohsesSeSho.", ".ohissSShho.", ".ohhisShhho.", "ohhCccccchho", ".occCggccsww", ".occCccccco.", ".osgGggggSo.", "..occcccco..", "..odccccdo..", "..opo.opo...", "..obo.obo..."],
  },
  dwarf: {
    pal: { o:'#1c1424', g:'#a9b2c0', u:'#6f7886', G:'#e0e6ee', s:'#f0b48a', S:'#c88a64', e:'#1c1424', N:'#e08a6a', r:'#c8662a', R:'#8a4018', c:'#ff9a2e', C:'#ffc060', p:'#5a3a22', b:'#3a2a20', W:'#e0e6ee', x:'#8a5a34', X:'#6a4424' },
    A: ["...occcco...", "..oGgguugo..", ".oGggguuugo.", ".ossesSeSSo.", ".orrsNNSrro.", ".orrrrrrrro.", ".orrrRRrrro.", "osgrrrrrruSo", ".occCccccco.", "..oppppppo..", "..obo..obo..", ".obbo..obbo."],
    B: ["...occcco...", "..oGgguugo..", ".oGggguuugo.", ".ossesSeSSo.", ".orrsNNSrro.", ".orrrrrrrro.", ".orrrRRrrro.", "osgrrrrrruSo", ".occCccccco.", "..oppppppo..", ".obo....obo.", "obbo....obbo"],
    C: ["...occcco...", "..oGgguugo..", ".oGggguuugWW", ".ossesSeSSWx", ".orrsNNSrrox", ".orrrrrrrrox", ".orrrRRrrrsx", "osgrrrrrruSo", ".occCccccco.", "..oppppppo..", "..obo..obo..", ".obbo..obbo."],
  },
  orc: {
    pal: { o:'#14180f', g:'#6cae4a', G:'#9ad46a', u:'#3f7a30', e:'#ffe14a', w:'#f4f1e6', d:'#3a1418', c:'#ff3d3d', m:'#2a2018', C:'#ff7a6a', s:'#c0c4d0', k:'#8a5a30', b:'#4a2a20', x:'#8a5a34', X:'#6a4424' },
    A: ["....ommmmo....", "...ogmmmmuo...", "..ogGgguuguo..", ".oguegguueuuo.", ".oggguguuuuuo.", ".ogwggdduuwuo.", "..ogggguuuuo..", "occGggguuugcco", "oggGgkgukuguuo", "ogggkkwwkkuuuo", "ogGkkkkkkkkguo", ".odccccccccdo.", "..odccccccdo..", ".ogggo..ogggo.", ".obbbo..obbbo."],
    B: ["....ommmmo....", "...ogmmmmuo...", "..ogGgguuguo..", ".oguegguueuuo.", ".oggguguuuuuo.", ".ogwggdduuwuo.", "..ogggguuuuo..", "occGggguuugcco", "oggGgkgukuguuo", "ogggkkwwkkuuuo", "ogGkkkkkkkkguo", ".odccccccccdo.", "..odccccccdo..", "ogggo....ogggo", "obbbo....obbbo"],
    C: ["....ommmmo..XX", "...ogmmmmuo.XX", "..ogGgguuguo.x", ".oguegguueuuox", ".oggguguuuuuox", ".ogwggdduuwuox", "..ogggguuuuo.x", "occGggguuugccx", "oggGgkgukuguux", "ogggkkwwkkuuuo", "ogGkkkkkkkkguo", ".odccccccccdo.", "..odccccccdo..", ".ogggo..ogggo.", ".obbbo..obbbo."],
  },
  werewolf: { // 14x16 elite sprite
    pal: { o:OUT, f:'#6f6a85', F:'#a8a3c2', d:'#403b58', m:'#8e8aa8', s:'#cfcbe0', n:'#0e0a12', e:'#ffb800', E:'#fff2a0', w:'#f6f2e8', r:'#b02a40', c:'#5ef0ff', C:'#2aa5b8', p:'#2f2a3c', P:'#4a4460', b:'#1b1722' },
    A: ["...o......o...","..ofo....ofo..","..offooooffo..","..oFfdffdfFo..",".ofeEffffEefo.",".oFffssssffFo.","..ofssnnssfo..","...ofwrrwfo...",".oFFoddddoFFo.","oFFfmdmmdmfFFo","oFfommccmmofFo","oFfodmccmdofFo","oFfocCCCCcofFo","bw.oppPPppo.wb","..obpPooPpbo..",".obbbw..wbbbo."],
    B: ["...o......o...","..ofo....ofo..","..offooooffo..","..oFfdffdfFo..",".ofeEffffEefo.",".oFffssssffFo.","..ofssnnssfo..","...ofwrrwfo...",".oFFoddddoFFo.","oFFfmdmmdmfFFo","oFfommccmmofFo","oFfodmccmdofFo","oFfocCCCCcofFo","bw.oppPPppo.wb","..obpPo..oPpbo",".obbbw...wbbo."],
    C: ["...o......o...","..ofo....ofo..","..offooooffo..","..oFfdffdfFo..","wofeEffffEefow","wwFffssssffFww","oFofssnnssfoFo","oFfofwrrwfofFo","oFFFoddddoFFFo","...fmdmmdmf...","...ommccmmo...","...odmccmdo...","...ocCCCCco...","...oppPPppo...","..obpPooPpbo..",".obbbw..wbbbo."],
  },
  sheep: {
    pal: { o:'#1c1424', w:'#ffffff', v:'#d6dbe6', d:'#4a3a44', e:'#ffffff', b:'#2e2230' },
    A: ["..oooo......", ".owwwwoo....", "owwvwwwwo.oo", "owwwwvwwoddo", "owwvwwwwddeo", "owwwwwwwoddo", ".owwvwwwooo.", "..ovvvvvo...", "..ob.ob.ob..", "..oo.oo.oo.."],
    B: ["..oooo......", ".owwwwoo....", "owwvwwwwo.oo", "owwwwvwwoddo", "owwvwwwwddeo", "owwwwwwwoddo", ".owwvwwwooo.", "..ovvvvvo...", "...obo.ob.ob", "...oo..oo.oo"],
  },
  rabbit: {
    pal: { o:'#1c1424', b:'#b8895a', B:'#e6cfa8', p:'#f0a0b0', e:'#1c1424', w:'#ffffff' },
    A: [".....o.o...", ".....opopo.", ".....obobo.", "....obbbbo.", "..oobbbebpo", ".obbbbbbbo.", "owbbbbbbbo.", ".obbBBbbbo.", "..obobbbo..", "..oo.oo...."],
    B: [".....o.o...", ".....opopo.", ".....obobo.", "....obbbbo.", "..oobbbebpo", ".obbbbbbbo.", "owbbbbbbbo.", ".obbBBbbbo.", "...obobbo..", "...oo.oo..."],
  },
  deer: {
    pal: { o:'#1c1424', t:'#c68a4e', T:'#9a6232', w:'#f4e6cc', a:'#e6d9a8', e:'#1c1424', n:'#3a2a20', b:'#2a1c14' },
    A: [".........a.a..", "..........aaa.", ".........ottoo", ".........ottet", "........ottttn", ".......ottttoo", "ottttttttto...", "otttwtttttto..", "ottttttwttto..", "owwwwwwwwwo...", ".oto.oto.oto..", ".oto.oto.oto..", ".oto.oto.oto..", ".obb.obb.obb.."],
    B: [".........a.a..", "..........aaa.", ".........ottoo", ".........ottet", "........ottttn", ".......ottttoo", "ottttttttto...", "otttwtttttto..", "ottttttwttto..", "owwwwwwwwwo...", "..oto.oto.oto.", "..oto.oto.oto.", "..oto.oto.oto.", "..obb.obb.obb."],
  },
  sheep: {
    pal: { o:'#1c1424', w:'#ffffff', v:'#d6dbe6', V:'#aab4cc', d:'#4a3a44', e:'#ffffff', b:'#2e2230' },
    A: ["..oooo......", ".owwwwoo....", "owwvwwwvo.oo", "owwwwvwwoddo", "owvwwwwvddeo", "owwwvwwvoddo", ".owvwwvVooo.", "..ovVVVVo...", "..ob.ob.ob..", "..oo.oo.oo.."],
    B: ["..oooo......", ".owwwwoo....", "owwvwwwvo.oo", "owwwwvwwoddo", "owvwwwwvddeo", "owwwvwwvoddo", ".owvwwvVooo.", "..ovVVVVo...", "...obo.ob.ob", "...oo..oo.oo"],
  },
  rabbit: {
    pal: { o:'#1c1424', b:'#b8895a', B:'#e6cfa8', p:'#f0a0b0', e:'#1c1424', w:'#ffffff' },
    A: [".....o.o...", ".....opopo.", ".....obobo.", "....obbbbo.", "..oobbbebpo", ".obbbbbbbo.", "owbbbbbbbo.", ".obbBBbbbo.", "..obobbbo..", "..oo.oo...."],
    B: [".....o.o...", ".....opopo.", ".....obobo.", "....obbbbo.", "..oobbbebpo", ".obbbbbbbo.", "owbbbbbbbo.", ".obbBBbbbo.", "...obobbo..", "...oo.oo..."],
  },
  deer: {
    pal: { o:'#1c1424', t:'#c68a4e', T:'#9a6232', w:'#f4e6cc', a:'#e6d9a8', e:'#1c1424', n:'#3a2a20', b:'#2a1c14' },
    A: [".........a.a..", "..........aaa.", ".........ottoo", ".........ottet", "........ottttn", ".......ottttoo", "ottttttttto...", "otttwtttttto..", "ottttttwttto..", "owwwwwwwwwo...", ".oto.oto.oto..", ".oto.oto.oto..", ".oto.oto.oto..", ".obb.obb.obb.."],
    B: [".........a.a..", "..........aaa.", ".........ottoo", ".........ottet", "........ottttn", ".......ottttoo", "ottttttttto...", "otttwtttttto..", "ottttttwttto..", "owwwwwwwwwo...", "..oto.oto.oto.", "..oto.oto.oto.", "..oto.oto.oto.", "..obb.obb.obb."],
  },
  sheep: {
    pal: { o:'#1c1424', w:'#ffffff', v:'#d6dbe6', V:'#aab4cc', d:'#4a3a44', e:'#ffffff', b:'#2e2230' },
    A: ["..oooo......", ".owwwwoo....", "owwvwwwvo.oo", "owwwwvwwoddo", "owvwwwwvddeo", "owwwvwwvoddo", ".owvwwvVooo.", "..ovVVVVo...", "..ob.ob.ob..", "..oo.oo.oo.."],
    B: ["..oooo......", ".owwwwoo....", "owwvwwwvo.oo", "owwwwvwwoddo", "owvwwwwvddeo", "owwwvwwvoddo", ".owvwwvVooo.", "..ovVVVVo...", "...obo.ob.ob", "...oo..oo.oo"],
  },
  rabbit: {
    pal: { o:'#1c1424', b:'#b8895a', B:'#e6cfa8', p:'#f0a0b0', e:'#1c1424', w:'#ffffff' },
    A: [".....o.o...", ".....opopo.", ".....obobo.", "....obbbbo.", "..oobbbebpo", ".obbbbbbbo.", "owbbbbbbbo.", ".obbBBbbbo.", "..obobbbo..", "..oo.oo...."],
    B: [".....o.o...", ".....opopo.", ".....obobo.", "....obbbbo.", "..oobbbebpo", ".obbbbbbbo.", "owbbbbbbbo.", ".obbBBbbbo.", "...obobbo..", "...oo.oo..."],
  },
  deer: {
    pal: { o:'#1c1424', t:'#c68a4e', T:'#9a6232', w:'#f4e6cc', a:'#e6d9a8', e:'#1c1424', n:'#3a2a20', b:'#2a1c14' },
    A: [".........a.a..", "..........aaa.", ".........ottoo", ".........ottet", "........ottttn", ".......ottttoo", "ottttttttto...", "otttwtttttto..", "ottttttwttto..", "owwwwwwwwwo...", ".oto.oto.oto..", ".oto.oto.oto..", ".oto.oto.oto..", ".obb.obb.obb.."],
    B: [".........a.a..", "..........aaa.", ".........ottoo", ".........ottet", "........ottttn", ".......ottttoo", "ottttttttto...", "otttwtttttto..", "ottttttwttto..", "owwwwwwwwwo...", "..oto.oto.oto.", "..oto.oto.oto.", "..oto.oto.oto.", "..obb.obb.obb."],
  },
  wolf: {
    pal: { o:'#1c1424', g:'#6a7088', l:'#aab0c4', e:'#ff5050', n:'#14141c', d:'#3a3e4c', b:'#2a2d38', w:'#ffffff', r:'#c02030' },
    A: [".........o.o..", ".........ogog.", "o.......ogggg.", "oo.....ogggeg.", ".ogoggggggggno", ".ogggggggggo..", ".ogggllllggo..", ".ogdgolloodo..", ".ob.bo..bo.b..", ".oo.oo..oo.oo.", ".............."],
    B: [".........o.o..", ".........ogog.", "o.......ogggg.", "oo.....ogggeg.", ".ogoggggggggno", ".ogggggggggo..", ".ogggllllggo..", ".ogdgoooodo...", "..ob.bo.bo.b..", "..oo.oo.oo.oo.", ".............."],
    C: [".........o.o..", ".........ogog.", "o.......ogggg.", "oo.....ogggeg.", ".ogoggggggggwo", ".ogggggggggrro", ".ogggllllggwo.", ".ogdgolloodo..", ".ob.bo..bo.b..", ".oo.oo..oo.oo.", ".............."],
  },
};
// Houses (owner race): one frame, bottom-anchored, one distinct architectural style per race.
// meta.smoke = chimney smoke origin (sprite px); meta.glow = lit windows (always=1 glows day and night, else only at night).
const HOUSES = {
  human: {
    pal: { o:'#1c1424', Y:'#f6d878', y:'#e6bc50', t:'#b88a2c', w:'#ecdcbc', W:'#c8b490', k:'#7a5230', g:'#8ecbff', G:'#cfeaff', d:'#4a2e1a', S:'#9a96a0', s:'#7a767e', b:'#8a8690', f:'#3f8cff' },
    A: ["......offf....", "......oo......", ".....oYYo.oooo", "....oYYYtooSSo", "...oYYyyttoSSo", "..oYYyyyttttoo", ".oYYyyyyttttto", "oYYyyyyyttttto", "otttttttttttto", ".okwwwwwWWWko.", ".okwgGwwggWko.", ".okwggwwggWko.", ".okwwwddWWWko.", ".okwwwddWWWko.", ".obbbbddbbbbo."],
    meta: {"smoke": [11.5, 2], "glow": [{"x": 4, "y": 10, "w": 2, "h": 2, "c": "255,214,104", "always": 0}, {"x": 8, "y": 10, "w": 2, "h": 2, "c": "255,214,104", "always": 0}]},
  },
  elf: {
    pal: { o:'#1c2418', L:'#4fae52', l:'#8fe08a', D:'#2d7a3a', p:'#d8a0ff', P:'#f0d0ff', t:'#8a5a34', T:'#5e3a20', B:'#b07a48', k:'#2a1a14', y:'#ffe9a0', Y:'#fff6d0' },
    A: ["....oooooo....", "..ooLlllDDoo..", ".oLlpLllDDDDo.", "oLlLLlLpDDDDDo", "oLpLLLLLDDDDDo", "oDLLLDDLDDDDDo", ".oDDDDDDDDDDo.", "..ooDDoDDoDo..", "..oBBBBBttto..", "..otyYttyyTo..", "..otyYttyyTo..", "..otttkkkkTTTT", "..otttkkkkTTTo", ".oTtBtkkkkTtTo", "ooTTooooooTToo"],
    meta: {"smoke": null, "glow": [{"x": 4, "y": 9, "w": 2, "h": 2, "c": "255,240,160", "always": 0}, {"x": 8, "y": 9, "w": 2, "h": 2, "c": "255,240,160", "always": 0}]},
  },
  dwarf: {
    pal: { o:'#1c1424', S:'#9ea6b2', s:'#c0c8d4', m:'#7a828e', R:'#5a5f78', r:'#7a80a0', Q:'#444860', d:'#4a2e1a', c:'#ff9a2e', C:'#ffc860' },
    A: ["....oSSSmo....", "...ooSSSmoo...", "..oRRRrrQQQo..", ".oRRrrRRRRQQQo", "oRRrRRQQQQRQQo", "oQQQQQQQQQQQQo", ".oSssSSsmmSmo.", ".oSSmSSSmmmmo.", ".oSsSddddmSmo.", ".oSmSdcCdmmmo.", ".oSSSddddmmmo.", ".oooooooooooo."],
    meta: {"smoke": [6.5, 0], "glow": [{"x": 6, "y": 9, "w": 2, "h": 1, "c": "255,150,40", "always": 1}]},
  },
  orc: {
    pal: { o:'#1c1214', H:'#a8744a', h:'#c89868', D:'#7a4c2c', r:'#ff3d3d', k:'#2a1a14', w:'#f4f1e6', W:'#c8c0a8', t:'#8a5a34', T:'#5e3a20' },
    A: [".....w..w.....", "......ww......", "......oo......", ".....ohHo.....", "....ohhHDo....", "...orhrrHro...", "t.ohhhwwDDDo.T", "tohhhhwWDDDDDT", "thhhhHkkDDDDDT", "thhhHkkkkDDDDT", "thhhkkkkkkDDDT", "thhhkkkkkkDDDT", "toooooooooooot"],
    meta: {"smoke": null, "glow": [{"x": 6, "y": 9, "w": 2, "h": 3, "c": "255,122,42", "always": 1}]},
  },
  werewolf: {
    pal: { o:'#1c1424', a:'#e6d9a8', R:'#4a4258', r:'#6b6379', Q:'#352f44', w:'#8a6a46', W:'#6e5236', t:'#5e4630', k:'#241a14', m:'#5ef0ff', M:'#c8fbff', f:'#a89080', F:'#7a6a5c' },
    A: ["....a.aa.a....", ".....aRRa.....", "....oRrrRo....", "...oRrrrRRo...", "..oRrrrrRRRo..", ".oRrrrrrRRRRQo", "oRrrrrrrRRRRQo", "oQQQQQQQQQQQQo", ".owwwwwwWWWWo.", ".owfFwmmWFFWo.", ".owfFwmMWFFWo.", ".owfFwkkWFFWo.", ".owwwwkkWWWWo.", ".ottttkktttto."],
    meta: {"smoke": null, "glow": [{"x": 6, "y": 9, "w": 2, "h": 2, "c": "94,240,255", "always": 1}]},
  },
};
// Capital halls (shown for the capital of a Town/Kingdom): bigger, richer version of each race's house style.
const HALLS = {
  human: {
    pal: { o:'#1c1424', R:'#b8553a', r:'#d8795a', Q:'#8a3a28', w:'#ece0c4', W:'#cbbd9a', S:'#9a96a0', s:'#b8b4c0', g:'#8ecbff', G:'#cfeaff', d:'#4a2e1a', y:'#ffd23f', b:'#8a8690', m:'#7a767e' },
    A: [".......oo.......", "......oRQo......", ".....oRrRQo.....", "....oRrRQRQo....", "...oRrRRQQRQo...", "..oRrRRQQQQRQo..", ".oRrRRQQQQQQRQo.", "oRrRRQQQQQQQQRQo", "oQQQQQQQQQQQQQQo", "oSswwwwwWWWWWSSo", "oSswGgwwWWggWSSo", "oSswggwwWWggWSSo", "oSswwwwyyWWWWSSo", "oSswwwddddWWWSSo", "oSswwwddddWWWSSo", "obbbbbddddbbbbbo"],
    meta: {"smoke": null, "glow": [{"x": 5, "y": 10, "w": 2, "h": 2, "c": "255,214,104", "always": 0}, {"x": 9, "y": 10, "w": 2, "h": 2, "c": "255,214,104", "always": 0}]},
  },
  elf: {
    pal: { o:'#1c2418', L:'#4fae52', l:'#8fe08a', D:'#2d7a3a', p:'#d8a0ff', t:'#8a5a34', T:'#5e3a20', B:'#b07a48', k:'#2a1a14', y:'#ffe9a0', Y:'#fff6d0' },
    A: ["......oooo......", "....ooLlLDoo....", "...oLlpLDpLDo...", "..oLlLlLDLDLDo..", ".oLpLLlLDLDDpDo.", ".oLLlLLDDDDLDDo.", "oLlLLpLDDDpDDLDo", "oLLLLLDDDDDDDDDo", "oDLLLDDDDDDDDDDo", "oDDLDDDDDDDDDDDo", ".oDDDpDDDDpDDDo.", "..ooDDDooDDDoo..", "...ooBBBtttoo...", "...otyYtTyyTo...", "...otyYtTyyTo...", "...ottkkkkTTo...", "..oTtBkkkktTTo..", ".ooTTooooooTToo."],
    meta: {"smoke": null, "glow": [{"x": 6, "y": 13, "w": 1, "h": 2, "c": "255,240,160", "always": 0}, {"x": 9, "y": 13, "w": 1, "h": 2, "c": "255,240,160", "always": 0}]},
  },
  dwarf: {
    pal: { o:'#1c1424', S:'#9ea6b2', s:'#c0c8d4', m:'#7a828e', R:'#5a5f78', r:'#7a80a0', Q:'#444860', d:'#4a2e1a', c:'#ff9a2e' },
    A: ["oSoSo......omomo", "oSSSo..oo..ommmo", "oSsSoRRooQQomSmo", "oSSSoRrRQRQommmo", "oSsSoRRQQQQomSmo", "oSSSSSSSmmmmmmmo", "oSmSSsSSmmSmmmmo", "oSSSSSddddmmmmmo", "oSsSSSdccdmmmSmo", "oSSSSSdccdmmmmmo", "oSmSSSddddmmmmmo", "oSSSSSSSmmmmmmmo", "oSsSSsSSmmSmmSmo", "oooooooooooooooo"],
    meta: {"smoke": [8, 1], "glow": [{"x": 7, "y": 8, "w": 2, "h": 2, "c": "255,150,40", "always": 1}]},
  },
  orc: {
    pal: { o:'#1c1214', H:'#a8744a', h:'#c89868', D:'#7a4c2c', r:'#ff3d3d', k:'#2a1a14', w:'#f4f1e6', t:'#8a5a34', T:'#5e3a20' },
    A: ["......w..w......", ".....oHHDDo.....", "....ohhHDHHo....", "...ohhHHDDHHo...", "..orhrrhHrrHro..", ".ohhhHHHDDDHHHo.", "ohhhHHDDDDDDHHHo", "ohhwwHDDDDDwwHHo", "ohhhHkkkkkkDHHHo", "ohhhHkkkkkkDHHHo", "ohhhkkkkkkkkHHHo", "ohhhkkkkkkkkHHHo", "tohhkkkkkkkkHHoT", "tooooooooooooooT"],
    meta: {"smoke": null, "glow": [{"x": 6, "y": 8, "w": 4, "h": 4, "c": "255,122,42", "always": 1}]},
  },
  werewolf: {
    pal: { o:'#1c1424', a:'#e6d9a8', R:'#4a4258', r:'#6b6379', Q:'#352f44', w:'#8a6a46', W:'#6e5236', t:'#5e4630', k:'#241a14', m:'#5ef0ff', M:'#c8fbff', f:'#a89080', F:'#7a6a5c' },
    A: [".....a.aa.a.....", "......aRRa......", ".....oRrRRo.....", "....oRrrRRRo....", "...oRrrRRRRRo...", "..oRrrmMmmRRRo..", ".oRrrrmmmmRRRRo.", "oRrrrRRRRRRRRRRo", "oQQQQQQQQQQQQQQo", "owwwwwwwWWWWWWWo", "owfFwwwwWWWWFFWo", "owfFwmmwWmmWFFWo", "owwwwmMwWmmWWWWo", "owwwwwkkkkWWWWWo", "owwwwwkkkkWWWWWo", "otttttttttttttto"],
    meta: {"smoke": null, "glow": [{"x": 6, "y": 5, "w": 4, "h": 2, "c": "94,240,255", "always": 1}, {"x": 7, "y": 11, "w": 2, "h": 2, "c": "94,240,255", "always": 1}]},
  },
};
function buildSprite(def, frame) {
  const rows = def[frame] || def.A;
  const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  const x = c.getContext('2d');
  for (let y = 0; y < rows.length; y++) for (let i = 0; i < rows[0].length; i++) {
    const ch = rows[y][i]; if (ch === '.') continue;
    x.fillStyle = def.pal[ch] || '#f0f'; x.fillRect(i, y, 1, 1);
  }
  return c;
}

const ATLAS = {}, HATLAS = {};
for (const k in SPRITES) { ATLAS[k] = {}; for (const f of ['A','B','C']) ATLAS[k][f] = buildSprite(SPRITES[k], f); }
const HMETA = {}, HALLATLAS = {}, HALLMETA = {};
for (const k in HOUSES) { HATLAS[RACES[k].bi] = buildSprite(HOUSES[k], 'A'); HMETA[RACES[k].bi] = HOUSES[k].meta || {}; }
for (const k in HALLS) { HALLATLAS[RACES[k].bi] = buildSprite(HALLS[k], 'A'); HALLMETA[RACES[k].bi] = HALLS[k].meta || {}; }
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
  const c = { id:nextId++, t:type, x, y, dx:x, dy:y, hp:R.hp, mhp:R.hp, age:0, life:ri(R.life[0], R.life[1]), en:rnd(55,100), dir:ri(0,8), tgt:null, kills:0, face:1, atk:0, cause:'', fail:0, avoid:0, avoidUntil:0, k:0, lead:0 };
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
    if (!c.k && (tick + c.id) % 40 === 0) c.k = nearestKingdom(c);
    if (bld[idx] === 0 && Math.random() < (R.buildP || .02) && R.build.includes(tiles[idx]) && (counts[c.t]||0) >= 2
        && countHouses(c.x, c.y, 5, R.bi) < 3 && countHouses(c.x, c.y, 1, R.bi) === 0) {
      const k = c.k ? kingdoms.get(c.k) : null;                        // building costs wood and is capped by the kingdom's level
      if (!k || (k.houses < maxHouses(k) && k.wood >= 4)) {
        bld[idx] = R.bi; fx('puff', c.x, c.y); dirty = true;
        if (k) { k.wood -= 4; kid[idx] = k.id; }
      }
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
// Forced evolution: when wolves hang on by a thread (2-3 left) they all become werewolves.
let lastEvolve = -1e9, evolutions = 0;
function evolveWolves() {
  const R = RACES.werewolf;
  for (const c of creatures) if (c.t === 'wolf') {
    c.t = 'werewolf'; c.hp = c.mhp = R.hp; c.age = 0; c.life = ri(R.life[0], R.life[1]);
    c.tgt = null; c.atk = 0; c.fail = 0; c.en = 100;
    fx('evolve', c.x, c.y);
  }
  lastEvolve = tick; evolutions++; dirty = true;
  counts = {}; for (const c of creatures) counts[c.t] = (counts[c.t]||0) + 1;
  toast('🌕 Serigala berevolusi!'); haptic('success');
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
/* ---- kingdoms ---- */
function kName(race) { const p = NAME_P[race]; return p[0][ri(0, p[0].length - 1)] + p[1][ri(0, p[1].length - 1)]; }
function newKingdom(race, x, y) {
  const k = { id: nextKid++, race, cx: x, cy: y, cap: x + y*W, nb: x + y*W, level: 0, food: 40, wood: 12, stone: 0, gold: 0, houses: 0, pop: 0,
              born: tick, name: kName(race), leader: null, g: 0, f: 0, m: 0, sx: 0, sy: 0, bd: 1e9, cand: null };
  kingdoms.set(k.id, k); return k;
}
function assignHouse(i, race) {                          // join the nearest same-race house's kingdom within 9 tiles, else found a new one
  const x = i % W, y = (i / W) | 0;
  let best = 0, bd = 1e9;
  for (let yy = Math.max(0, y-9); yy <= Math.min(H-1, y+9); yy++) for (let xx = Math.max(0, x-9); xx <= Math.min(W-1, x+9); xx++) {
    const j = xx + yy*W;
    if (j === i || !bld[j] || !kid[j]) continue;
    const k = kingdoms.get(kid[j]);
    if (!k || k.race !== race) continue;
    const d = (xx-x)**2 + (yy-y)**2;
    if (d < bd) { bd = d; best = kid[j]; }
  }
  kid[i] = best || newKingdom(race, x, y).id;
}
const maxHouses = k => Math.max(2, Math.round((3 + k.level*5) * (k.race === 'werewolf' ? .6 : 1)));
function nearestKingdom(c) {
  let best = 0, bd = 15*15;
  for (const k of kingdoms.values()) { if (k.race !== c.t) continue; const d = (k.cx-c.x)**2 + (k.cy-c.y)**2; if (d < bd) { bd = d; best = k.id; } }
  return best;
}
function terrainStats(k) {
  const cx = Math.round(k.cx), cy = Math.round(k.cy); let g = 0, f = 0, m = 0;
  for (let y = Math.max(0, cy-9); y <= Math.min(H-1, cy+9); y++) for (let x = Math.max(0, cx-9); x <= Math.min(W-1, cx+9); x++) {
    const t = tiles[x + y*W];
    if (t === T.GRASS) g++; else if (t === T.FOREST) f++; else if (t === T.HILL || t === T.MOUNTAIN) m++;
  }
  k.g = g; k.f = f; k.m = m;
}
function economy() {                                      // once per second
  const redo = tick % 120 === 0;
  for (const k of kingdoms.values()) {
    const E = ECO[k.race];
    if (redo || (!k.g && !k.f && !k.m)) terrainStats(k);
    k.food = Math.min(400, k.food + (k.g*.012 + k.f*(k.race === 'elf' ? .012 : .006) + k.houses*.25) * E.f - k.pop*.18);     // elves forage the forest
    k.wood = Math.min(250, k.wood + k.f*.012*E.w);
    k.stone = Math.min(250, k.stone + (k.m*.01 + k.houses*.02)*E.s);                 // quarries / trade even far from hills
    k.gold = Math.min(250, k.gold + (k.m*.004 + k.houses*.012)*E.g);
    if (k.food <= 0) {                                    // famine: someone starves
      k.food = 0;
      if (k.pop > 3 && Math.random() < .3) { for (const c of creatures) if (c.k === k.id && c.hp > 0) { c.hp = 0; c.cause = 'old'; break; } }
    }
  }
}
function levelCheck() {                                   // every 5 seconds
  for (const k of kingdoms.values()) {
    if (k.level >= 3) continue;
    const r = LV_REQ[k.level], sc = k.race === 'werewolf' ? .6 : 1;
    if (k.pop >= r.pop*sc && k.houses >= r.houses*sc && k.wood >= (r.wood||0) && k.stone >= (r.stone||0) && k.gold >= (r.gold||0) && k.food >= (r.food||0)) {
      k.wood -= r.wood || 0; k.stone -= r.stone || 0; k.gold -= r.gold || 0; k.food -= (r.food || 0) * .5;
      k.level++; ownDirty = true; dirty = true;
      fx('levelup', Math.round(k.cx), Math.round(k.cy));
      if (k.level >= 2) toast(`${LV_ICON[k.level]} ${k.name}`);
    }
  }
}
function chooseLeaders() {                                // the oldest member wears the crown
  for (const k of kingdoms.values()) k.cand = null;
  for (const c of creatures) {
    if (!c.k) continue;
    const k = kingdoms.get(c.k); if (!k) continue;
    if (!k.cand || c.age > k.cand.age) k.cand = c;
  }
  for (const k of kingdoms.values()) {
    const L = k.leader;
    if (L && L.hp > 0 && L.k === k.id) continue;
    if (L) L.lead = 0;
    k.leader = k.cand;
    if (k.cand) { k.cand.lead = 1; k.cand.mhp = Math.round(k.cand.mhp * 1.5); k.cand.hp = k.cand.mhp; }
  }
}
function computeTerritory() {
  own.fill(0); ownScore.fill(9);
  for (const k of kingdoms.values()) {
    const r = 6 + k.level*3, cx = Math.round(k.cx), cy = Math.round(k.cy), r2 = r*r;
    for (let y = Math.max(0, cy-r); y <= Math.min(H-1, cy+r); y++) for (let x = Math.max(0, cx-r); x <= Math.min(W-1, cx+r); x++) {
      const d2 = (x-cx)**2 + (y-cy)**2;
      if (d2 > r2) continue;
      const i = x + y*W;
      if (tiles[i] <= T.SHALLOW) continue;
      const sc = d2 / r2;
      if (sc < ownScore[i]) { ownScore[i] = sc; own[i] = k.id; }
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = x + y*W, o = own[i];
    if (!o) { ownRace[i] = 0; ownEdge[i] = 0; continue; }
    ownRace[i] = RACES[kingdoms.get(o).race].bi;
    ownEdge[i] = ((x > 0 && own[i-1] !== o) || (x < W-1 && own[i+1] !== o) || (y > 0 && own[i-W] !== o) || (y < H-1 && own[i+W] !== o)) ? 1 : 0;
  }
  ownDirty = false;
}
function step() {
  tick++;
  for (const l of cells) l.length = 0;
  for (const c of creatures) cells[(c.y>>3)*GW + (c.x>>3)].push(c);
  for (let i = 0; i < creatures.length; i++) stepCreature(creatures[i]);
  reapDead();
  const wc = counts.wolf || 0;
  if (wc >= 2 && wc <= 3 && tick - lastEvolve > 1200 && (counts.werewolf || 0) < capOf('werewolf')) evolveWolves();
  else if (wc < 4 * CAPK && tick - lastEvolve > 600 && Math.random() < (wc === 0 ? 1/80 : 1/300)) wolfPack();

  for (const k of kingdoms.values()) { k.houses = 0; k.pop = 0; k.sx = 0; k.sy = 0; k.bd = 1e9; }
  for (const c of creatures) if (c.k) { const k = kingdoms.get(c.k); if (k) k.pop++; else c.k = 0; }
  const spread = []; houseCount = 0;
  for (let i = 0; i < N; i++) {
    const b = bld[i];
    if (b) {
      houseCount++;
      const race = BUILD_OWNER[b];
      let k = kingdoms.get(kid[i]);
      if (!k) { assignHouse(i, race); k = kingdoms.get(kid[i]); }
      const x = i % W, y = (i / W) | 0;
      k.houses++; k.sx += x; k.sy += y;
      const dd = (x - k.cx)**2 + (y - k.cy)**2;
      if (dd < k.bd) { k.bd = dd; k.nb = i; }
      // births need food; bigger kingdoms breed a little faster
      if (k.food > 5 && Math.random() < (RACES[race].spawnP || .005) * (1 + k.level*.4) && (counts[race]||0) < capOf(race)) {
        if (cells[(y>>3)*GW + (x>>3)].length < 12) { const c = spawnNear(race, x, y); if (c) { c.k = k.id; k.food -= 1.5; } }
      }
    } else if (kid[i]) kid[i] = 0;
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
  for (const k of kingdoms.values()) {                               // collapse empty kingdoms, re-centre the rest
    if (k.houses === 0) { kingdoms.delete(k.id); ownDirty = true; continue; }
    k.cx = k.sx / k.houses; k.cy = k.sy / k.houses; k.cap = k.nb;
  }
  if (tick % 8 === 0) economy();
  if (tick % 40 === 0) { levelCheck(); chooseLeaders(); }
  if (ownDirty || tick % 60 === 0) computeTerritory();

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
  kid = new Uint16Array(N); own = new Uint16Array(N); ownRace = new Uint8Array(N); ownEdge = new Uint8Array(N); ownScore = new Float32Array(N);
  kingdoms.clear(); nextKid = 1; ownDirty = true;
  GW = Math.ceil(W / 8); GH = Math.ceil(H / 8); cells = Array.from({ length: GW * GH }, () => []);
  off.width = W; off.height = H; img = octx.createImageData(W, H);
  creatures = []; effects.length = 0; counts = {}; houseCount = 0; hb = [0,0,0,0,0,0];
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
    if (showBorders) { const o = ownRace[i]; if (o) { const bc = BORDER_RGB[o], a = ownEdge[i] ? .6 : .15; r += (bc[0] - r)*a; g += (bc[1] - g)*a; b += (bc[2] - b)*a; } }
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
  const nightA = cfg.settings.dayNight ? Math.max(0, -Math.cos(tick / (TPS * 90) * Math.PI * 2)) * .38 : 0;
  if (sc >= 5) {
    for (let y = y0; y <= Math.min(H-1, y1 + 4); y++) for (let x = x0; x <= x1; x++) {
      const idx = x + y*W, b = bld[idx]; if (!b) continue;
      const cx = ox + (x + .5)*sc, fy = oy + (y + 1)*sc - sc*.05;
      const kg = kingdoms.get(kid[idx]), isCap = !!kg && kg.cap === idx;
      const hall = isCap && kg.level >= 2 && HALLATLAS[b];
      const hs = hall || HATLAS[b], hw = hs.width * SPR_K, hh = hs.height * SPR_K, hx = cx - hw/2, hy = fy - hh, m = hall ? HALLMETA[b] : HMETA[b];
      if (isCap && kg.level >= 3) { ctx.fillStyle = 'rgba(255,215,90,.13)'; ctx.beginPath(); ctx.arc(cx, fy - hh*.45, hw*.85, 0, 7); ctx.fill(); }      // royal aura
      ctx.drawImage(hs, hx, hy, hw, hh);
      if (m.glow) for (const g of m.glow) {                              // lit windows / forge glow
        const al = g.always ? .55 + .25*Math.sin(frame*.09 + x*1.7 + y) : nightA * 2.2;
        if (al > .03) { ctx.fillStyle = `rgba(${g.c},${Math.min(.95, al)})`; ctx.fillRect(hx + g.x*SPR_K, hy + g.y*SPR_K, g.w*SPR_K, g.h*SPR_K); }
      }
      if (m.smoke) for (let k = 0; k < 3; k++) {                          // chimney smoke
        const t = ((frame*.5 + k*20 + x*7 + y*3) % 60) / 60;
        ctx.fillStyle = `rgba(225,225,235,${(1 - t) * .5})`;
        ctx.beginPath(); ctx.arc(hx + m.smoke[0]*SPR_K + Math.sin(t*6 + k)*SPR_K*1.3, hy + m.smoke[1]*SPR_K - t*hh*.8, SPR_K*(.9 + t*1.8), 0, 7); ctx.fill();
      }
      if (isCap && kg.level >= 1) {                                         // capital banner: kingdom colour + one gold pip per level
        const fx0 = hx + hw*.5, top = hy - SPR_K, K = SPR_K;
        ctx.fillStyle = '#2a2018'; ctx.fillRect(fx0, top - 7*K, K, 8*K);
        ctx.fillStyle = RACES[kg.race].col; ctx.fillRect(fx0 + K, top - 7*K, 5*K, 3*K); ctx.fillRect(fx0 + K, top - 4*K, 3*K, K);
        ctx.fillStyle = '#ffd23f'; for (let l = 0; l < kg.level; l++) ctx.fillRect(fx0 + K*(1 + l*2), top - 8*K, K, K);
      }
      if (fire[idx]) { ctx.fillStyle = frame % 6 < 3 ? 'rgba(255,170,30,.8)' : 'rgba(255,80,20,.8)'; ctx.fillRect(hx + hw*.2, hy + hh*.2, hw*.6, hh*.55); }
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
      const spr = ATLAS[c.t][f], sw = spr.width * SPR_K, sh = spr.height * SPR_K;
      const crowned = c.lead && c.k && kingdoms.has(c.k) && kingdoms.get(c.k).level >= 1;       // sprites may be bigger than 10x10
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(cx - sw*.3, fy - Math.max(1, sw*.08), sw*.6, Math.max(1, sw*.1));
      if (c.face < 0) { ctx.save(); ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.drawImage(spr, -sw/2 + lunge, fy - sh, sw, sh); ctx.restore(); }
      else ctx.drawImage(spr, cx - sw/2 + lunge, fy - sh, sw, sh);
      if (crowned) { const K = SPR_K, tx = cx - K*2 + lunge; ctx.fillStyle = '#ffd23f'; ctx.fillRect(tx, fy - sh - K*2, K*4, K); ctx.fillRect(tx, fy - sh - K*3, K, K); ctx.fillRect(tx + K*3, fy - sh - K*3, K, K); ctx.fillRect(tx + K*1.5, fy - sh - K*3, K, K); }
      if (sc >= 8 && c.hp < c.mhp) { ctx.fillStyle = '#000'; ctx.fillRect(cx - sw*.4 - 1, fy - sh - 5, sw*.8 + 2, 4); ctx.fillStyle = '#4f4'; ctx.fillRect(cx - sw*.4, fy - sh - 4, sw*.8*Math.max(0, c.hp/c.mhp), 2); }
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
    if (nightA > .01) { ctx.fillStyle = `rgba(6,10,50,${nightA})`; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); }
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
      life = 30; const sp = ATLAS[e.type].A, sw = sp.width * SPR_K, sh = sp.height * SPR_K, fy = py + sc*.42;
      if (sc < 5) { if (e.t >= life) effects.splice(i, 1); continue; }
      ctx.save();
      if (e.old) { ctx.globalAlpha = Math.max(0, .7*(1 - e.t/life)); ctx.drawImage(sp, px - sw/2, fy - sh - e.t*.25*SPR_K, sw, sh); }
      else {
        ctx.globalAlpha = e.t < 14 ? 1 : Math.max(0, 1 - (e.t - 14)/16);
        ctx.translate(px, fy); ctx.scale(e.face || 1, 1); ctx.rotate(Math.min(1, e.t/8) * Math.PI/2);
        ctx.drawImage(sp, -sw/2, -sh, sw, sh);
      }
      ctx.restore();
    } else if (e.k === 'levelup') {
      life = 44; const p = e.t / life;
      ctx.strokeStyle = `rgba(255,215,80,${1 - p})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, sc*(1 + p*5), 0, 7); ctx.stroke();
      ctx.fillStyle = `rgba(255,236,150,${1 - p})`; ctx.fillRect(px - 2, py - p*sc*4, 4, 4); ctx.fillRect(px - sc*1.5, py - p*sc*3, 3, 3); ctx.fillRect(px + sc*1.5, py - p*sc*3.5, 3, 3);
    } else if (e.k === 'evolve') {
      life = 40; const p = e.t / life;
      ctx.strokeStyle = `rgba(94,240,255,${1 - p})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, sc*(1 + p*4), 0, 7); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,220,${.6*(1 - p)})`; ctx.beginPath(); ctx.arc(px, py, sc*(.6 + p), 0, 7); ctx.fill();
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
  werewolf: { g:'life', ic:'🌕', nm:'Manusia serigala', ms:140, spawn:1 },
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
function kingdomHtml(k) {
  return `<b>${LV_ICON[k.level]} ${k.name}</b> ${EMOJI[k.race]}<br>${k.level ? '⭐'.repeat(k.level) + ' ' : ''}${LV_NAME[k.level]} · 👥${k.pop} · 🏠${k.houses}<br>🍞${k.food | 0} 🪵${k.wood | 0} 🪨${k.stone | 0} 🪙${k.gold | 0}`;
}
function inspectAt(wx, wy) {
  const NM = { human:'Manusia', elf:'Elf', dwarf:'Kurcaci', orc:'Orc', sheep:'Domba', wolf:'Serigala', rabbit:'Kelinci', deer:'Rusa', werewolf:'Manusia serigala' };
  let best = null, bd = 9, house = -1;
  for (let dy = -1; dy <= 1 && house < 0; dy++) for (let dx = -1; dx <= 1; dx++) { if (inb(wx+dx, wy+dy) && bld[wx+dx + (wy+dy)*W]) { house = wx+dx + (wy+dy)*W; break; } }
  if (house >= 0 && kingdoms.has(kid[house])) infoEl.innerHTML = kingdomHtml(kingdoms.get(kid[house]));
  else {
    for (const c of creatures) { const d = (c.x-wx)**2 + (c.y-wy)**2; if (d < bd) { bd = d; best = c; } }
    if (best) {
      const c = best, R = RACES[c.t], k = c.k ? kingdoms.get(c.k) : null;
      infoEl.innerHTML = `<b>${EMOJI[c.t]} ${NM[c.t]}</b>${c.lead ? ' 👑' : ''}<br>❤️ ${Math.ceil(c.hp)}/${c.mhp} · ⏳ ${(c.age/120).toFixed(1)}/${(c.life/120).toFixed(1)}`
        + (R.hunt ? `<br>⚡ ${Math.round(c.en)}` : '') + (c.kills ? `<br>⚔️ ${c.kills}` : '') + (k ? `<br>${LV_ICON[k.level]} ${k.name}` : '');
    } else if (inb(wx, wy)) {
      const i = wx + wy*W, k = kingdoms.get(own[i]);
      if (k) infoEl.innerHTML = kingdomHtml(k);
      else {
        const nm = ['Laut dalam','Laut dangkal','Pasir','Rumput','Hutan','Bukit','Gunung','Salju','Lava','Tanah hangus'][tiles[i]];
        infoEl.innerHTML = `<b>${nm}</b>` + (fire[i] ? '<br>🔥' : '');
      }
    }
  }
  infoEl.style.display = 'block'; clearTimeout(infoT); infoT = setTimeout(() => infoEl.style.display = 'none', 4500);
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
  { ic:'🚩', on: () => showBorders, fn: () => { showBorders = !showBorders; renderRow2(); toast(showBorders ? '🚩 on' : '🚩 off'); } },
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
    for (const r of STAT_ORDER) if (r !== 'werewolf' || counts.werewolf) h += `<span>${EMOJI[r]}${counts[r] || 0}</span>`;     // werewolf chip appears once they exist
    h += `<span>🏰${kingdoms.size}·🏠${houseCount}</span>`;
  }
  statsEl.innerHTML = h;
}

/* ============================== SAVE / LOAD (play mode) ============================== */
function clearSave() { try { lib.deleteUserGameState && lib.deleteUserGameState(); } catch (e) {} }
function serialize() {
  const kl = [...kingdoms.values()], kix = new Map(kl.map((k, n) => [k.id, n + 1]));
  const bl = [], bk = [];
  for (let i = 0; i < N; i++) if (bld[i]) { bl.push(i * 8 + bld[i]); bk.push(kix.get(kid[i]) || 0); }     // bk: kingdom (1-based) of each house
  return { v: 5, z: sizeIdx, seed: currentSeed, tiles: rleEncode(), bld: bl, bk, tick,
    kg: kl.map(k => [RACES[k.race].bi, Math.round(k.cx), Math.round(k.cy), k.level, k.food | 0, k.wood | 0, k.stone | 0, k.gold | 0, k.born, k.name]),
    cr: creatures.map(c => (c.y * W + c.x) * 10 + RN.indexOf(c.t)) };      // one packed int per creature
}
function restore(s) {
  if (!s || !(s.v >= 1 && s.v <= 5)) return false;
  setSize(s.v === 1 ? 0 : s.z);                                                 // v1 saves were always the small map
  if (!rleDecode(s.tiles)) return false;
  currentSeed = s.seed || 0; tick = s.tick || 0;
  const hl = [];
  for (const v of s.bld || []) { const i = v >> 3, b = v & 7; if (i < N && b >= 1 && b <= 5) { bld[i] = b; hl.push(i); } else hl.push(-1); }
  const ids = [];
  for (const a of s.kg || []) {                                              // saved kingdoms
    const race = BUILD_OWNER[a[0]]; if (!race) { ids.push(0); continue; }
    const k = newKingdom(race, a[1], a[2]);
    Object.assign(k, { level: a[3], food: a[4], wood: a[5], stone: a[6], gold: a[7], born: a[8] || 0, name: a[9] || k.name });
    ids.push(k.id);
  }
  if (s.bk) hl.forEach((i, j) => { if (i >= 0) kid[i] = ids[(s.bk[j] || 0) - 1] || 0; });      // 0 -> the next tick founds/joins one
  for (const v of s.cr || []) {
    let ti, x, y, age = -1;
    if (Array.isArray(v)) { ti = v[0]; x = v[1]; y = v[2]; age = v[3]; }
    else { const m = s.v >= 4 ? 10 : s.v === 3 ? 8 : 6; ti = v % m; const pos = (v / m) | 0; x = pos % W; y = (pos / W) | 0; }
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

window.__world = { cam: (x, y, z) => { sc = z; ox = VIEW.x + VIEW.w/2 - (x + .5)*sc; oy = VIEW.y + VIEW.h/2 - (y + .5)*sc; clampCam(); }, get tiles() { return tiles; }, get bld() { return bld; }, get fire() { return fire; }, get size() { return sizeIdx; }, get evolutions() { return evolutions; }, get kingdoms() { return kingdoms; }, get kid() { return kid; }, get lastEvolve() { return lastEvolve; }, get tick() { return tick; }, get creatures() { return creatures; }, get counts() { return counts; }, step, applyTool, setTool: id => { tool = id; }, get W() { return W; }, get H() { return H; }, T };
}

// The platform boots the game by calling window.run(mode); publishing bundles
// game.js into an IIFE, so run must be assigned to window explicitly.
window.run = run;
