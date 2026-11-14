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
const VIEW = { x: 0, y: 190, w: 720, h: 866 };          // world viewport on the canvas
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
  human: { col:'#4aa3ff', hp:30, dmg:4, mv:2, civ:1, cap:90, life:[1000,1700], foes:['wolf'], build:[T.GRASS,T.SAND], bi:1 },
  elf:   { col:'#e2a9ff', hp:24, dmg:4, mv:2, civ:1, cap:70, life:[1800,2800], foes:['wolf'], build:[T.FOREST,T.GRASS], bi:2 },
  dwarf: { col:'#ff9a2e', hp:38, dmg:5, mv:3, civ:1, cap:70, life:[1400,2200], foes:['wolf'], build:[T.HILL,T.GRASS], bi:3 },
  orc:   { col:'#ff3d3d', hp:44, dmg:6, mv:2, civ:1, cap:80, life:[800,1300],  foes:[], build:[T.GRASS,T.HILL,T.BURNT,T.SAND], bi:4 },
  // Werewolves: evolved wolves. Neutral (nobody's foe, hates nobody) and slow-growing: few houses, rare births, long lives.
  werewolf: { col:'#5ef0ff', hp:40, dmg:6, mv:2, civ:1, cap:36, life:[2500,4000], foes:[], build:[T.FOREST,T.HILL,T.GRASS], bi:5, buildP:.002, spawnP:.0004 },
  // Wild fauna. prey = wolf food; br = breeding (p per move, tiles, max animals per 8x8 cell); flee = runs from wolves.
  sheep:  { col:'#ffffff', hp:10, dmg:0, mv:3, civ:0, cap:110, life:[600,1100], foes:[], build:[], bi:0, prey:1, br:{ p:.02,  tiles:[T.GRASS], dens:14 } },
  rabbit: { col:'#c9a37a', hp:6,  dmg:0, mv:2, civ:0, cap:160, life:[500,900],  foes:[], build:[], bi:0, prey:1, flee:1, br:{ p:.035, tiles:[T.GRASS,T.FOREST,T.HILL], dens:16 } },
  deer:   { col:'#c68a4e', hp:16, dmg:0, mv:2, civ:0, cap:70,  life:[900,1500], foes:[], build:[], bi:0, prey:1, flee:1, br:{ p:.014, tiles:[T.FOREST,T.GRASS], dens:8 } },
  cart:      { col:'#c89868', hp:24, dmg:0, mv:2, civ:0, cap:0, life:[2200,2200], foes:[], build:[], bi:0, engine:1, cart:1 },     // trade caravans (not saved)
  ram:       { col:'#a8744a', hp:90, dmg:8, mv:3, civ:0, cap:0, life:[2600,2600], foes:[], build:[], bi:0, engine:1 },        // siege engines (not saved)
  catapult:  { col:'#c89050', hp:60, dmg:6, mv:4, civ:0, cap:0, life:[2600,2600], foes:[], build:[], bi:0, engine:1 },
  dcatapult: { col:'#9ea6b2', hp:70, dmg:6, mv:4, civ:0, cap:0, life:[2600,2600], foes:[], build:[], bi:0, engine:1 },
  wolf:   { col:'#2b2e36', hp:28, dmg:5, mv:1, civ:0, cap:28,  life:[900,1500], foes:['sheep','rabbit','deer'], hunt:1, build:[], bi:0 },
};
// ---- Kingdoms (civilization layer) ----
const ECO = { human:{f:1.3,w:1,s:1,g:1,m:1}, elf:{f:.9,w:1.6,s:.6,g:.6,m:.7}, dwarf:{f:1.1,w:.7,s:2,g:3,m:2}, orc:{f:1,w:1,s:1,g:.8,m:1.1}, werewolf:{f:1,w:1,s:.8,g:.6,m:.7} };
const LV_ICON = ['🛖','🏘️','🏙️','🏰'], LV_NAME = ['Suku','Desa','Kota','Kerajaan'];
const LV_REQ = [ { pop:6, houses:3, wood:15 }, { pop:16, houses:7, stone:30, food:40, bronze:8 }, { pop:32, houses:12, gold:25, stone:40, iron:12, silver:10 } ];
const NAME_P = {
  human:[['Al','Ber','Cor','Dun','El','Fen','Gar','Hol','Ith','Kar','Lor','Mar'],['ia','ford','ton','mark','heim','vale']],
  elf:[['Ael','Sil','Lor','Thal','Nyr','Eri','Cael'],['wen','ael','iel','indor','ariel','anor']],
  dwarf:[['Thor','Dur','Bar','Kaz','Mor','Gim','Bal'],['in','dum','gard','hold','bek','kor']],
  orc:[['Gor','Zug','Mog','Gra','Kru','Thrak','Ugh'],['ash','gash','uk','nar','dak','mok']],
  werewolf:[['Lun','Fen','Va','Mar','Grey','Nox','Ulv'],['fang','moon','howl','pelt','mere','claw']],
};
// ---- Technology: 4 per race, researched in order when the kingdom's level and resources allow ----
// fx keys: food/wood/stone/gold/birth/atk/def multiply; houses/radius add; range/night/loot/steal/regen/fire/farms/walls/grow are flags or maxima.
const TECHS = {
  human: [
    { id:'agri',    ic:'🌾', n:'Pertanian',        lv:1, cost:{ wood:30 },            fx:{ food:1.4, birth:1.1, farms:1 } },
    { id:'walls',   ic:'🧱', n:'Tembok',           lv:2, cost:{ stone:60, wood:30 },  fx:{ houses:4, def:1.25, radius:2, walls:1 } },
    { id:'knight',  ic:'⚔️', n:'Ksatria',          lv:2, cost:{ gold:40, stone:50, iron:12 },  fx:{ atk:1.3, def:1.3 } },
    { id:'trade',   ic:'🪙', n:'Perdagangan',      lv:3, cost:{ gold:80, silver:12 },            fx:{ gold:2, food:1.2, birth:1.25 } },
  ],
  elf: [
    { id:'forest',  ic:'🌿', n:'Hutan Hidup',      lv:1, cost:{ wood:30 },            fx:{ wood:1.3, food:1.2, grow:1 } },
    { id:'archer',  ic:'🏹', n:'Pemanah',          lv:1, cost:{ wood:40, gold:20, bronze:8 },   fx:{ range:3, atk:1.1 } },
    { id:'ward',    ic:'🔥', n:'Pelindung Api',    lv:2, cost:{ wood:60, stone:20, silver:8 },  fx:{ fire:1, def:1.15 } },
    { id:'treelife',ic:'🌳', n:'Pohon Kehidupan',  lv:3, cost:{ wood:120, gold:60 },  fx:{ regen:.08, birth:1.3 }, lm:'lifetree' },
  ],
  dwarf: [
    { id:'mining',  ic:'⛏️', n:'Tambang',          lv:1, cost:{ stone:20 },           fx:{ stone:2, gold:1.5 }, lm:'mine' },
    { id:'forge',   ic:'🔨', n:'Tempa',            lv:2, cost:{ stone:60, gold:20, iron:15 },  fx:{ def:1.4, atk:1.2 } },
    { id:'vault',   ic:'🏦', n:'Brankas',          lv:2, cost:{ gold:60, stone:60, silver:15 },  fx:{ gold:2, houses:4 } },
    { id:'hold',    ic:'🏯', n:'Benteng Gunung',   lv:3, cost:{ gold:100, stone:120, iron:20 },fx:{ radius:3, def:1.5 } },
  ],
  orc: [
    { id:'camp',    ic:'🪓', n:'Kamp Perang',      lv:1, cost:{ wood:30 },            fx:{ atk:1.25, birth:1.2 }, lm:'warbanner' },
    { id:'raid',    ic:'🩸', n:'Penyerbuan',       lv:1, cost:{ stone:20, gold:10, bronze:8 },  fx:{ loot:1 } },
    { id:'totem',   ic:'💀', n:'Totem Darah',      lv:2, cost:{ stone:40, gold:30, bronze:10 },  fx:{ steal:.3, atk:1.15 }, lm:'bloodtotem' },
    { id:'horde',   ic:'👹', n:'Gerombolan',       lv:3, cost:{ gold:60, wood:60, iron:15 },   fx:{ birth:1.5, houses:4, def:1.25 } },
  ],
  werewolf: [
    { id:'moon',    ic:'🌙', n:'Doa Bulan',        lv:0, cost:{ wood:20 },            fx:{ night:1.4 } },
    { id:'pack',    ic:'🐾', n:'Kawanan',          lv:1, cost:{ stone:20, silver:6 },           fx:{ birth:1.4 } },
    { id:'spirit',  ic:'🔮', n:'Totem Roh',        lv:2, cost:{ stone:40, gold:20, silver:8 },  fx:{ radius:3, regen:.05 }, lm:'spirittotem' },
    { id:'full',    ic:'🌕', n:'Bulan Purnama',    lv:3, cost:{ gold:50, silver:10 },            fx:{ night:2, birth:1.5 } },
  ],
};
const BORDER_RGB = [null, [74,163,255], [226,169,255], [255,154,46], [255,61,61], [94,240,255]];     // by house owner index (race.bi)
const RN = ['human','elf','dwarf','orc','sheep','wolf','rabbit','deer','werewolf'];     // index order is part of the save format
const STAT_ORDER = ['human','elf','dwarf','orc','sheep','rabbit','deer','wolf','werewolf'];
const GAIN = { rabbit:25, sheep:45, deer:60 };                               // wolf energy per kill (default 45)
const BUILD_OWNER = [null,'human','elf','dwarf','orc','werewolf'];
const EMOJI = { human:'🧑', elf:'🧝', dwarf:'🧔', orc:'👹', sheep:'🐑', wolf:'🐺', rabbit:'🐇', deer:'🦌', werewolf:'\uE001' };
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
  .ic{width:24px;height:24px;image-rendering:pixelated;vertical-align:-5px}
  .ic.cr{width:32px;height:32px;vertical-align:-8px}
  .awb{box-sizing:border-box;width:96px;height:96px;flex:0 0 96px;border-radius:18px;border:3px solid #0d1228;background:linear-gradient(#2b3769,#1a2248);box-shadow:inset 0 3px 0 rgba(255,255,255,.14),inset 0 -5px 0 rgba(0,0,0,.28),0 3px 0 #080b1c;color:#e8ecff;font-size:40px;font-weight:800;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;font-family:inherit;cursor:pointer}
  .awb:active{transform:translateY(2px)}
  .awb.on{background:linear-gradient(#4b5cac,#2c3a7e);border-color:#ffcf4a;box-shadow:inset 0 3px 0 rgba(255,255,255,.25),inset 0 -5px 0 rgba(0,0,0,.22),0 0 16px rgba(255,207,74,.5)}
  .awb .ic,.awb .ic.cr{width:48px;height:48px;vertical-align:0}
  #awtop{position:absolute;left:0;top:0;width:720px;height:190px;background:linear-gradient(#18214a,#10172f);border-bottom:3px solid #0a0e22;box-shadow:0 3px 0 #2c3868}
  #awbtns{position:absolute;left:8px;top:8px;display:flex;gap:8px}
  #awyear{position:absolute;right:10px;top:24px;height:56px;display:flex;align-items:center;gap:8px;font-size:32px;font-weight:800;background:rgba(8,12,30,.75);border:2px solid #2c3868;border-radius:14px;padding:0 16px;font-variant-numeric:tabular-nums}
  #awyear .ic{width:36px;height:36px;vertical-align:0}
  .awchips{position:absolute;left:8px;right:8px;height:38px;display:flex;gap:6px;align-items:center;font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
  #awstats{top:108px} #awstats2{top:148px}
  .awchips span{display:inline-flex;align-items:center;gap:3px;height:36px;background:rgba(8,12,30,.72);border:2px solid #2c3868;border-radius:10px;padding:0 8px}
  .awchips span .ic{width:24px;height:24px;vertical-align:0}
  .awchips span .ic.cr{width:32px;height:32px}
  #awbot{position:absolute;left:0;top:1064px;width:720px;height:216px;background:linear-gradient(#10172f,#18214a);border-top:3px solid #2c3868;padding:8px 8px;box-sizing:border-box}
  #awrow1{display:flex;gap:8px;align-items:center}
  #awrow1>.awb{width:84px;height:84px;flex-basis:84px}
  #awbrush{margin-left:auto;display:flex;gap:6px;align-items:center;font-size:36px;font-weight:800;color:#ffcf4a}
  #awbrush .awb{width:76px;height:76px;flex-basis:76px;font-size:44px}
  #awbrush span{min-width:40px;text-align:center}
  #awrow2{display:flex;gap:8px;margin-top:10px;overflow-x:auto;scrollbar-width:none;touch-action:pan-x;padding-bottom:4px}
  #awrow2::-webkit-scrollbar{display:none}
  #awinfo{position:absolute;left:14px;bottom:226px;width:692px;box-sizing:border-box;background:rgba(10,15,36,.95);border:3px solid #2c3868;border-radius:16px;padding:10px 18px;font-size:28px;line-height:1.55;box-shadow:0 4px 0 rgba(0,0,0,.4);display:none}
  #awinfo b{font-size:30px;color:#ffe9a0}
  #awinfo .ibtns{float:right;display:flex;gap:8px;margin:-2px 0 0 10px}
  #awinfo .ibt{width:76px;height:76px;flex-basis:76px;border-radius:14px}
  #awinfo .pt{float:left;width:80px;height:80px;margin:0 16px 4px 0;image-rendering:pixelated;background:rgba(255,255,255,.07);border:2px solid #2c3868;border-radius:14px;padding:4px;box-sizing:border-box}
  #awinfo .dsc{display:block;font-size:22px;line-height:1.3;color:#aab4e0;margin:4px 0 6px}
  #awinfo .tag{display:inline-block;font-size:20px;font-weight:800;background:#2c3868;border-radius:8px;padding:0 8px;margin-left:8px;vertical-align:3px}
  #awinfo .bar{display:flex;align-items:center;gap:8px;font-size:22px;margin:3px 0;clear:both}
  #awinfo .bar u{display:block;flex:1;height:14px;background:#0b1020;border:2px solid #2c3868;border-radius:7px;overflow:hidden;text-decoration:none}
  #awinfo .bar u i{display:block;height:100%}
  #awinfo .row{font-size:24px;margin-top:4px;clear:both}
  #awinfo .tag.t{background:#3a2a5c;color:#ffe9a0}
  #awinfo .eq{display:flex;gap:8px;margin:6px 0;clear:both}
  #awinfo .slot{flex:1;min-width:0;display:flex;align-items:center;gap:6px;font-size:19px;font-weight:700;line-height:1.1;background:rgba(8,12,30,.7);border:3px solid #2c3868;border-radius:10px;padding:4px 6px;white-space:normal}
  #awinfo .slot .ic{width:28px;height:28px;flex:0 0 28px}
  #awinfo .slot.e{color:#6a74a0;border-style:dashed}
  #awinfo .slot.t1{border-color:#a08060}#awinfo .slot.t2{border-color:#d89040}#awinfo .slot.t3{border-color:#b8c4d4}
  #awinfo .eq .slot{font-family:inherit;color:#e8ecff;cursor:pointer;text-align:left}
  #awinfo .slot.rdy{box-shadow:0 0 14px rgba(255,207,74,.8);border-color:#ffcf4a}
  #awinfo .tabs{display:flex;gap:8px;margin:6px 0;clear:both}
  #awinfo .ptab{flex:1;height:58px;border-radius:12px;border:3px solid #0d1228;background:linear-gradient(#2b3769,#1a2248);color:#e8ecff;font-weight:800;font-size:22px;font-family:inherit;cursor:pointer}
  #awinfo .ptab.on{border-color:#ffcf4a;background:linear-gradient(#4b5cac,#2c3a7e)}
  #awinfo .fam{font-size:22px;line-height:1.9;clear:both}
  #awinfo .fam u{display:inline-block;min-width:112px;text-decoration:none;color:#aab4e0}
  #awinfo .rel{display:inline-block;font-weight:700;font-size:22px;font-family:inherit;color:#ffe9a0;background:#2c3868;border:2px solid #4a5aa0;border-radius:10px;padding:2px 12px;margin:2px 4px 2px 0;cursor:pointer}
  #awinfo .rel.dead{color:#8a90b0;background:rgba(8,12,30,.6);border-color:#2c3868;cursor:default}
  #awinfo .bag{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:6px 0;clear:both}
  #awinfo .bag.sm .bi{height:66px}
  #awinfo .bag.sm .bi .ic{width:30px;height:30px}
  #awinfo .bi{height:84px;border-radius:12px;border:3px solid #2c3868;background:rgba(8,12,30,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#e8ecff;font-family:inherit;cursor:pointer;padding:0}
  #awinfo .bi.e{border-style:dashed;opacity:.5;cursor:default}
  #awinfo .bi .ic{width:36px;height:36px}
  #awinfo .bi small{font-size:17px;font-weight:800;color:#ffe9a0}
  #awinfo .bi.t1{border-color:#a08060}#awinfo .bi.t2{border-color:#d89040}#awinfo .bi.t3{border-color:#b8c4d4}
  #awinfo .bi.sel{box-shadow:0 0 16px rgba(255,207,74,.9);border-color:#ffcf4a;transform:translateY(-3px)}
  #awinfo .hist{font-size:20px;line-height:1.35;color:#c8d0f0;margin-top:4px;clear:both}
  #awinfo .hist em{font-style:normal;color:#ffcf4a;font-weight:800}
  #awtoast{position:absolute;left:50%;top:204px;transform:translateX(-50%);background:rgba(10,15,36,.95);border:3px solid #2c3868;border-radius:16px;padding:8px 24px;font-size:28px;font-weight:700;opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap;box-shadow:0 4px 0 rgba(0,0,0,.4)}
`;
document.head.appendChild(style);
const app = document.createElement('div'); app.id = 'aw'; document.body.appendChild(app);
const cv = document.createElement('canvas');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
cv.width = SCREEN_W * DPR; cv.height = SCREEN_H * DPR;
app.appendChild(cv);
const ctx = cv.getContext('2d');
const el = (tag, id, parent) => { const e = document.createElement(tag); if (id) e.id = id; (parent || app).appendChild(e); return e; };
const topBar = el('div', 'awtop'), btns = el('div', 'awbtns', topBar), statsEl = el('div', 'awstats', topBar), stats2El = el('div', 'awstats2', topBar), yearEl = el('div', 'awyear', topBar);
statsEl.className = stats2El.className = 'awchips';
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
let wallK = new Uint16Array(1), wallG = new Uint8Array(1), wallT = new Uint8Array(1);
let oreT = new Uint8Array(1), oreA = new Uint8Array(1), treeK = new Uint8Array(1), nodes = [];      // resource nodes: type / amount left, cached tree kind, node list     // wall barrier map: owner kingdom id / is-gate
const wallGates = new Map();                                   // kingdom id -> gate tile indices
const kingdoms = new Map(); let nextKid = 1, showBorders = true, ownDirty = true;
let comp = null, compDirty = true;                 // connected land components (wars only happen on the same landmass)
const rels = new Map();                              // kingdom pair -> { s: 1 war | 2 alliance | 3 truce, t, until }
const warStats = { repaired: 0, towerShots: 0, breached: 0, declared: 0, ended: 0, captured: 0, razed: 0, allied: 0, joined: 0 };
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
  nodes = []; oreT.fill(0); oreA.fill(0);
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
  cart: {
    pal: {"o": "#1c1424", "k": "#a8744a", "l": "#c89868", "K": "#6a4424", "w": "#f4ecd0", "W": "#cbbd9a", "t": "#d8b070", "y": "#e0b858"},
    A: ["...oooo........", "..owwwwo.o.....", ".owwwwwwoto....", ".owwwwwwtto....", ".oWWWWWWtto....", "ollllllllo...o.", "okkKkkKkkooooKo", "okkKkkKKkKKKKKo", "okKyKkKyKooooo.", "oKKyKKKyKKo....", ".oKyKoKyKo.....", "..oKo.oKo......"],
    B: ["...oooo........", "..owwwwo.o.....", ".owwwwwwoto....", ".owwwwwwtto....", ".oWWWWWWtto....", "ollllllllo...o.", "okkKkkKkkooooKo", "okkKkkKKkKKKKKo", "okKKKkKKKooooo.", "oKyyyKyyyKo....", ".oKKKoKKKo.....", "..oKo.oKo......"],
    C: ["...oooo........", "..owwwwo.o.....", ".owwwwwwoto....", ".owwwwwwtto....", ".oWWWWWWtto....", "ollllllllo...o.", "okkKkkKkkooooKo", "okkKkkKKkKKKKKo", "okKyKkKyKooooo.", "oKKyKKKyKKo....", ".oKyKoKyKo.....", "..oKo.oKo......"],
  },
  ram: {
    pal: {"o": "#1c1214", "H": "#a8744a", "h": "#c89868", "D": "#7a4c2c", "k": "#8a5a34", "K": "#5e3a20", "s": "#aab2be", "S": "#6a7078", "w": "#f4f1e6", "r": "#ff3d3d"},
    A: [".......ooo......", "......owKro.....", "....ooowKrro....", "...ohhhhKhhho...", "..oHHDHHDHHDHo..", ".ooDDDDDDDsssso.", "oKKKKKKKKKssssso", "okkkkkkkkkssssSo", ".ooDDkDDDDkSSSo.", "...okKkookKkoo..", "..okkKkkkkKkko..", "...okKkookKko..."],
    B: [".......ooo......", "......owKro.....", "....ooowKrro....", "...ohhhhKhhho...", "..oHHDHHDHHDHo..", ".ooDDDDDDDsssso.", "oKKKKKKKKKssssso", "okkkkkkkkkssssSo", ".ooDDkDDDDkSSSo.", "...okkkookkkoo..", "..okKKKkkKKKko..", "...okkkookkko..."],
    C: ["......ooo.......", ".....owKro......", "...ooowKrro.....", "..ohhhhKhhho....", ".oHHDHHDHHDHooo.", ".oDDDDDDDDDssss.", ".oKKKKKKKKKssss.", "oDkkkkkkkkkssss.", ".oDDkDDDDkDSSSS.", "..okKkookKkoooo.", ".okkKkkkkKkko...", "..okKkookKko...."],
  },
  catapult: {
    pal: {"o": "#1c1424", "k": "#c89050", "K": "#8a5a34", "s": "#c0c8d4", "S": "#7a828e", "y": "#ffd23f", "c": "#ff9a2e", "f": "#3f8cff", "g": "#aab2be"},
    A: ["ogggo...........", ".ogoo...........", ".oKkkoo.....ooo.", "..oKKkkooo.oKffo", "...ooKKkkkooKfo.", "....oKoKooKoKo..", ".ooooKooooKoKo..", "okkkKkkkkkkKKko.", "oKKKKKKKKKKKKKo.", ".ooKSKooooKSKo..", ".oKKSKKooKKSKKo.", "..oKSKo..oKSKo.."],
    B: ["ogggo...........", ".ogoo...........", ".oKkkoo.....ooo.", "..oKKkkooo.oKffo", "...ooKKkkkooKfo.", "....oKoKooKoKo..", ".ooooKooooKoKo..", "okkkKkkkkkkKKko.", "oKKKKKKKKKKKKKo.", ".ooKKKooooKKKo..", ".oKSSSKooKSSSKo.", "..oKKKo..oKKKo.."],
    C: ["...........ogo..", "..........ooko..", "........ookkKoo.", "......ookkKKKffo", ".....okkKKooKfo.", "....oKoKooKoKo..", ".ooooKooooKoKo..", "okkkKkkkkkkKKko.", "oKKKKKKKKKKKKKo.", ".ooKSKooooKSKo..", ".oKKSKKooKKSKKo.", "..oKSKo..oKSKo.."],
  },
  dcatapult: {
    pal: {"o": "#1c1424", "k": "#9ea6b2", "K": "#5a5f78", "s": "#c0c8d4", "S": "#7a828e", "y": "#ffd23f", "c": "#ff9a2e", "f": "#3f8cff", "g": "#ff9a2e"},
    A: ["ogggo..........", ".ogoo..........", ".oKkkoo........", "..oKKkkooo.....", "...ooKKkkko....", "....oKoKooKo...", ".ooooKooooKooo.", "okksKkkskkkskko", "oKKSKKKSKKKSKKo", ".ooKSKooooKSKo.", ".oKKSKKooKKSKKo", "..oKSKo..oKSKo."],
    B: ["ogggo..........", ".ogoo..........", ".oKkkoo........", "..oKKkkooo.....", "...ooKKkkko....", "....oKoKooKo...", ".ooooKooooKooo.", "okksKkkskkkskko", "oKKSKKKSKKKSKKo", ".ooKKKooooKKKo.", ".oKSSSKooKSSSKo", "..oKKKo..oKKKo."],
    C: ["...........ogo.", "..........ooko.", "........ookkKo.", "......ookkKKo..", ".....okkKKoo...", "....oKoKooKo...", ".ooooKooooKooo.", "okksKkkskkkskko", "oKKSKKKSKKKSKKo", ".ooKSKooooKSKo.", ".oKKSKKooKKSKKo", "..oKSKo..oKSKo."],
  },
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
// Landmarks built by technologies (placed near the capital).
const LANDMARKS = {
  mine: { pal: { o:'#1c1424', S:'#8a929e', s:'#aab2be', k:'#8a5a34', d:'#14101a', g:'#ffd23f', t:'#6a4a2a' }, A: ["..oooooo..", ".oSsSSsSo.", "oSsSSsSSSo", "oSkkkkkkSo", "oSkddddkSo", "oSkdgddkSo", "oSkddddkSo", "ottddddtto", "oooooooooo"] },
  warbanner: { pal: { o:'#1c1214', w:'#f4f1e6', t:'#6a4424', R:'#ff3d3d', r:'#b02020' }, A: ["...ww...", "..wwww..", "..w..w..", "...tt...", "..tRRRR.", "..tRRrR.", "..tRrR..", "...t....", "...t....", "...t....", "..ttt...", ".oooooo."] },
  bloodtotem: { pal: { o:'#1c1214', w:'#f4f1e6', e:'#ffe14a', t:'#8a5a34', T:'#5e3a20', r:'#ff3d3d' }, A: [".w....w.", ".wwwwww.", "..weew..", "..wwww..", "..tttt..", ".trrrrt.", ".tTttTt.", "..tttt..", ".trrrrt.", "..tTTt..", "..tttt..", ".tttttt.", ".oooooo."] },
  spirittotem: { pal: { o:'#1c1424', g:'#6b6379', m:'#5ef0ff', c:'#2aa5b8', w:'#f4f1e6', t:'#5e4630', T:'#3a2c20' }, A: [".gg..gg.", ".gggggg.", ".gmggmg.", "..gwwg..", "..tttt..", ".tcmmct.", ".tTttTt.", "..tttt..", ".tcmmct.", "..tTTt..", "..tttt..", ".tttttt.", ".oooooo."] },
  lifetree: { pal: { o:'#1c2418', L:'#4fae52', l:'#8fe08a', D:'#2d7a3a', y:'#ffe27a', t:'#8a5a34', T:'#5e3a20', B:'#b07a48' }, A: ["...oooooo...", "..oLllLLDo..", ".oLlyLDyLDo.", "oLlLLlLDDLDo", "oLLyLLDDyDDo", "oDLLLDDDDDDo", ".oDDDDDDDDo.", "..oDDooDDo..", "...ottTTo...", "...ottTTo...", "..oTttTTTo..", ".oTBttTTtTo.", ".oooTTTTooo.", "oooooooooooo"] },
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
const LMATLAS = {};
for (const k in LANDMARKS) LMATLAS[k] = buildSprite(LANDMARKS[k], 'A');

// Town props per race (cosmetic, derived from kingdom state): wall, corner tower, gate, well, field, granary.
const PROPS = {
  human: {
    pal: {"o": "#1c1424", "S": "#b8b4c0", "s": "#9a96a0", "m": "#7a767e", "R": "#b8553a", "r": "#d8795a", "Q": "#8a3a28", "k": "#8a5a34", "K": "#5e3a20", "y": "#e6bc50", "Y": "#f6d878", "g": "#7da23c", "G": "#4f7a28", "c": "#c9a64a", "C": "#a8843a", "b": "#4a9fe0", "B": "#8ecbff", "d": "#4a2e1a", "f": "#3f8cff", "w": "#ecdcbc"},
    wall: ["oo.oo.", "oSooSo", "oSSSSo", "osssso", "oSSSSo", "osmsmo", "oooooo"],
    tower: [".oRRRRo.", "oRrrRRQo", "oRrRRQQo", ".oooooo.", "oSSSSSSo", "oSsgGsSo", "oSSSSSSo", "osssssso", "oSSdddSo", "osmdddmo", "oSSdddSo", "oooooooo"],
    gate: ["oo.oooo.oo", "oSoSSSSoSo", "oSsSSSSsSo", "oSSdddddSo", "oSdkkkkdSo", "oSdkkkkdSo", "oSdkkkkdSo", "oSdkkkkdSo", "osdkkkkdso", "oooooooooo"],
    well: ["..oRRo..", "..oRrRo.", "..ok.ko.", ".oSsSsSo", "oSbBbBSo", "osbbbbso", ".oooooo."],
    field: ["cgcgcg", "gGgGgG", "cCcCcC", "gGgGgG", "cgcgcg", "CCCCCC"],
    barn: ["....oYYo..", "..oYYyyYo.", ".oYYyyyyYo", "oYyyyyyyyo", "oyyyyyyyyo", "okkkkkkkko", "okwwddwwko", "okwwddwwko", "okwwddwwko", "oooooooooo"],
  },
  elf: {
    pal: {"o": "#1c2418", "L": "#4fae52", "l": "#8fe08a", "D": "#2d7a3a", "p": "#d8a0ff", "P": "#f0d0ff", "t": "#8a5a34", "T": "#5e3a20", "B": "#b07a48", "k": "#2a1a14", "y": "#ffe9a0", "Y": "#fff6d0", "b": "#5ef0d0", "c": "#c8fff0", "v": "#9a60d8", "n": "#ff8ab0", "g": "#5a9a48"},
    wall: ["..oo..", "oLlLpL", "oLLlLL", "oDLDLD", "oDDtDD", "oDtTtD", "ooooo."],
    tower: ["...oo...", "..oLLo..", ".oLlpLo.", "oLlLLlLo", "oLLlLDDo", ".oDDDDo.", "..oTTo..", "..oTtDo.", "..oyYTo.", "..oTTto.", ".oTttTTo", "ooTTooTo"],
    gate: ["..oLlLLo..", ".oLlpLLDo.", "oLlLLLDDDo", "oDLo..oDDo", "oTto..otTo", "oTto..otTo", "oTto..otTo", "oTto..otTo", "oTto..otTo", "ooooo.oooo"],
    well: ["..o.p.o.", "..oLlLo.", ".oLLlLLo", "oLbcbbLo", "oDbbbbDo", ".oDDDDo.", "..oooo.."],
    field: ["pgnggv", "gggpgg", "vggngg", "gpggvg", "ggngpg", "DDDDDD"],
    barn: ["...oooo...", "..oLlpLo..", ".oLlLLLDo.", "oLLlLLLDDo", "oDLLLDDDDo", "oDDtttDDDo", "oTtBkkBtTo", "oTtBkkBtTo", "oTtBkkBtTo", "ooooooooo."],
  },
  dwarf: {
    pal: {"o": "#1c1424", "S": "#9ea6b2", "s": "#c0c8d4", "m": "#7a828e", "R": "#5a5f78", "r": "#7a80a0", "Q": "#444860", "d": "#3a2a1a", "c": "#ff9a2e", "C": "#ffc860", "i": "#4a4e5c", "I": "#2a2c36", "b": "#4a9fe0", "B": "#8ecbff", "M": "#c04040", "u": "#b080e0", "h": "#e8e0d0", "k": "#8a5a34"},
    wall: ["oooooo", "oSsSSo", "oSSSSo", "oiiiio", "oSsmSo", "oiiiio", "oooooo"],
    tower: [".oRRRRo.", "oRrrRRQo", "oQQQQQQo", "oSSSSSSo", "oSccSsSo", "oSCcSSSo", "oiiiiiio", "oSsSSmSo", "oSSSSSSo", "oiiiiiio", "oSsmSSSo", "oooooooo"],
    gate: ["oooooooooo", "oSSSSSSSSo", "oSiiiiiiSo", "oSiIiIiISo", "oSiIiIiISo", "oSiiiiiiSo", "oSiIiIiISo", "oSiIiIiISo", "oSiiiiiiSo", "oooooooooo"],
    well: ["..oiio..", "..oSSo..", ".oSsSSo.", "oSmBbmSo", "oSbbbbSo", "oiiiiiio", ".oooooo."],
    field: ["MhuMhu", "kkkkkk", "uMhuMh", "kkkkkk", "hMuhMu", "IIIIII"],
    barn: ["..oooooo..", ".oRRRRRRo.", "oRrrRRQQQo", "oSSSSSSSSo", "oSsSSSSmSo", "oiiiiiiiio", "oSSddddSSo", "oSSdiidSSo", "oSSddddSSo", "oooooooooo"],
  },
  orc: {
    pal: {"o": "#1c1214", "H": "#a8744a", "h": "#c89868", "D": "#7a4c2c", "r": "#ff3d3d", "k": "#2a1a14", "w": "#f4f1e6", "W": "#c8c0a8", "t": "#8a5a34", "T": "#5e3a20", "g": "#6a8a30", "G": "#8a7a3a", "b": "#5a7a3a", "B": "#7a9a50", "m": "#c04848", "n": "#8a2828"},
    wall: ["w.w.w.", "owowwo", "ohHhHo", "ohHhHo", "oHDHDo", "oDDDDo", "oooooo"],
    tower: ["..rrrr..", "..rrnr..", ".oootto.", ".owwwwo.", "oHhhHHDo", "oHkkkHDo", "oHhhHHDo", ".ot..to.", ".ot..to.", ".ot..to.", ".oT..To.", "oooo.ooo"],
    gate: ["w.w....w.w", "owo.rr.owo", "ohH.rr.ohH", "ohHwwwwoHD", "ohHkkkkoHD", "ohHkkkkoHD", "ohHkkkkoHD", "ohHkkkkoHD", "oDDkkkkoDD", "oooooooooo"],
    well: ["w.w..w..", "owoooow.", "oWwwWwo.", "oHbbbBHo", "oDbbbbDo", ".oDDDDo.", "..oooo.."],
    field: ["DwDDwD", "DmDmDD", "DDnmDD", "wDDDwD", "DDmDnD", "TTTTTT"],
    barn: ["....oo....", "...oHho...", "..oHhhDo..", ".oHhhhDDo.", "oHhhHHDDDo", "oHhwwHDDDo", "oHhkkkHDDo", "oHhkkkHDDo", "oDhkkkHDDo", "oooooooooo"],
  },
  werewolf: {
    pal: {"o": "#1c1424", "a": "#e6d9a8", "A": "#bfae80", "R": "#4a4258", "r": "#6b6379", "Q": "#352f44", "w": "#8a6a46", "W": "#6e5236", "t": "#5e4630", "k": "#241a14", "m": "#5ef0ff", "M": "#c8fbff", "f": "#a89080", "F": "#7a6a5c", "u": "#b080e0", "g": "#3a8a6a", "G": "#2a6a50", "p": "#7a4aa8"},
    wall: ["a.a.a.", "oaoaoa", "oAaAaA", "oWwWwo", "oRrRrR", "oQQQQQ", "oooooo"],
    tower: ["..a..a..", "..aaaa..", ".oamamo.", ".oaaaao.", ".ofFFfo.", "..oFFo..", "..otto..", "..otto..", "..otmo..", "..otto..", ".ottttt.", "oooooooo"],
    gate: ["a.a....a.a", "oao.mm.oao", "oaA.mm.oAa", "oaAmMMmoAa", "oWwkkkkowW", "oWwkkkkowW", "oWwkkkkowW", "oWwkkkkowW", "oRrkkkkorR", "oooooooooo"],
    well: ["..a..a..", "..oaao..", ".oRrRrR.", "oRmMmmRo", "oQmmmmQo", ".oQQQQo.", "..oooo.."],
    field: ["gGumGg", "GgGGgm", "uGgGum", "gGmGGg", "GgGgGu", "kkkkkk"],
    barn: ["..a....a..", ".oaoooaoo.", ".oWwwWwWo.", "oWwwWwwWWo", "oRrrRrrRRo", "oRfFFRfFRo", "oRfFFRfFRo", "oRkkkkkkRo", "oRkkkkkkRo", "oooooooooo"],
  },
};
const PNAMES = ['wall', 'tower', 'gate', 'well', 'field', 'barn'];
const PATLAS = {};
for (const k in PROPS) { PATLAS[RACES[k].bi] = {}; for (const n of PNAMES) PATLAS[RACES[k].bi][n] = buildSprite({ pal: PROPS[k].pal, A: PROPS[k][n] }, 'A'); }
/* ============================== RESOURCES: ore nodes + tree kinds ============================== */
const ORE_SPR_DEF = {
  stone: {"R": "#a6a6b2", "r": "#84848f", "D": "#62626e", "X": "#b6b6c2", "x": "#d4d4de", "o": "#1c1424"},
  bronze: {"R": "#9a8a7a", "r": "#7a6a5c", "D": "#5a4c42", "X": "#e08a3a", "x": "#ffc878", "o": "#1c1424"},
  iron: {"R": "#7a7480", "r": "#5c5662", "D": "#3e3a46", "X": "#c4583a", "x": "#e89a78", "o": "#1c1424"},
  silver: {"R": "#8a92a8", "r": "#6c7490", "D": "#4c5470", "X": "#e4eeff", "x": "#ffffff", "o": "#1c1424"},
  gold: {"R": "#9a8a6a", "r": "#7a6a4c", "D": "#5a4c34", "X": "#ffd23f", "x": "#fff6a8", "o": "#1c1424"},
};
const ORE_SHAPE = ["...oooo...", "..oRRRro..", ".oRXRRrro.", "oRRRxRXrro", "oRXRRRrrro", "orrrRXrrDo", "oDrrrrXDDo", ".oooooooo."];
const TREE_DEF = {
  oak: { pal: {"o": "#1c2418", "L": "#4fae52", "l": "#8fe08a", "D": "#2d7a3a", "t": "#8a5a34", "T": "#5e3a20"}, A: ["..oooooo..", ".oLllLLLo.", "oLlLLlLLDo", "oLLlLLLDDo", "oLLLLlDDDo", ".oLLLDDDo.", "..oDDDDo..", "...otTo...", "...otTo...", "..ootTo..."] },
  pine: { pal: {"o": "#14241c", "L": "#3a8a5a", "l": "#6cc08a", "D": "#256a44", "t": "#8a5a34", "T": "#5e3a20"}, A: ["....oo....", "...oLlo...", "..oLllDo..", "...oLLDo..", "..oLllLDo.", ".oLlLLLDDo", "..oLLLDDo.", ".oLlLLDDDo", "oooDDDDDoo", "...otTo..."] },
  birch: { pal: {"o": "#1c2418", "L": "#a6d65a", "l": "#d8f48e", "D": "#6eaa3a", "t": "#f4f1e6", "T": "#1c1424", "W": "#c8c4d4"}, A: ["...oooo...", "..oLllLo..", ".oLlLLLLo.", "oLLlLLLDLo", "oLLLLlLDDo", ".oLLLLDDo.", "..oDDDDo..", "...otTWo..", "...otWTo..", "...otWWo.."] },
  fruit: { pal: {"o": "#1c2418", "L": "#4fae52", "l": "#8fe08a", "D": "#2d7a3a", "t": "#8a5a34", "T": "#5e3a20", "r": "#e8412c", "R": "#ff8a6a"}, A: ["..oooooo..", ".oLlLrLLo.", "oLlrLLlLDo", "oLLLLrLLDo", "oLrLLLLrDo", ".oLLrLDDo.", "..oDDDDo..", "...otTo...", "...otTo...", "..ootTo..."] },
  palm: { pal: {"o": "#1c2418", "L": "#5fae4a", "l": "#a8e070", "t": "#c8a060", "T": "#8a6a3a", "c": "#7a4c2c"}, A: ["oLl.LLl.oo", ".oLLLLLLo.", "oLlLoolLLo", "LL.otc.oLl", ".o.otTo..o", "...otTo...", "...otTo...", "...otTo...", "...otTo...", "..ootTo..."] },
};
const ORE_KEYS = [null, 'stone', 'bronze', 'iron', 'silver', 'gold'];
const ORE_AMT = [0, 12, 10, 10, 8, 6], ORE_YIELD = [0, 3, 1, 1, 1, 3], ORE_LV = [0, 0, 1, 2, 1, 1], ORE_DENS = [0, .006, .004, .0035, .002, .0016];
const ORE_TILES = [null, [T.GRASS, T.HILL, T.MOUNTAIN], [T.HILL, T.MOUNTAIN], [T.MOUNTAIN, T.HILL], [T.MOUNTAIN, T.SNOW], [T.MOUNTAIN]];
const ORE_RGB = [null, [214, 214, 226], [255, 160, 60], [220, 90, 60], [235, 245, 255], [255, 215, 60]];
const ORE_SPR = [null]; for (let t = 1; t <= 5; t++) ORE_SPR.push(buildSprite({ pal: ORE_SPR_DEF[ORE_KEYS[t]], A: ORE_SHAPE }, 'A'));
const TREE_NAMES = ['oak', 'pine', 'birch', 'fruit'], TREE_SPR = TREE_NAMES.map(n => buildSprite(TREE_DEF[n], 'A')), PALM_SPR = buildSprite(TREE_DEF.palm, 'A');
const TREE_W = [1, 1.25, .8, .5];                              // timber yield per kind: oak, pine, birch, fruit tree
const TREE_AFF = { human: [1.2, 1, 1, 1], elf: [1, 1, 1.3, 1.5], dwarf: [1, 1.4, 1, 1], orc: [1, 1.1, 1, 1], werewolf: [1, 1.3, 1.1, 1] };
function treeKindAt(i) {                                       // static grove pattern: 1 + kind in the low bits (oak, pine, birch, fruit), bit 16 = palm on sand
  let v = treeK[i]; if (v) return v;
  const x = i % W, y = (i / W) | 0, g = hash(x >> 2, y >> 2, 19);
  v = 1 + (g < .16 ? 3 : g < .46 ? 1 : g < .68 ? 2 : 0);
  if (hash(x, y, 23) < .09) v |= 16;
  return treeK[i] = v;
}
function addNode(i, t) { if (oreT[i]) return false; oreT[i] = t; oreA[i] = ORE_AMT[t]; nodes.push(i); return true; }
function spawnOre(t, tries) {
  for (let n = 0; n < tries; n++) { const i = ri(0, N - 1); if (ORE_TILES[t].includes(tiles[i]) && !bld[i] && !oreT[i]) return addNode(i, t); }
  return false;
}
function seedResources() {
  nodes = []; oreT.fill(0); oreA.fill(0);
  for (let t = 1; t <= 5; t++) for (let n = 0, target = Math.floor(N * ORE_DENS[t]); n < target; n++) spawnOre(t, 30);
}
function resTick() {                                         // nodes on drowned/burnt ground vanish; new ones keep appearing so the world never runs dry
  for (const i of nodes) if (oreT[i] && (tiles[i] <= T.SHALLOW || tiles[i] === T.LAVA || bld[i])) oreT[i] = 0;
  nodes = [...new Set(nodes)].filter(i => oreT[i]);
  const c = [0, 0, 0, 0, 0, 0]; for (const i of nodes) c[oreT[i]]++;
  for (let t = 1; t <= 5; t++) if (c[t] < N * ORE_DENS[t] * .9) for (let n = 0; n < 2; n++) spawnOre(t, 40);
}
function mineTick(k, E) {                                    // once per second: a kingdom works one random node of each kind within reach
  const cx = Math.round(k.cx), cy = Math.round(k.cy), rad = 11 + k.level * 2 + k.mod.radius, r2 = rad * rad;
  const pick = [-1, -1, -1, -1, -1, -1], seen = [0, 0, 0, 0, 0, 0];
  for (const i of nodes) {
    const t = oreT[i]; if (!t) continue;
    const dx = (i % W) - cx, dy = ((i / W) | 0) - cy; if (dx*dx + dy*dy > r2) continue;
    const o = own[i]; if (o && o !== k.id) continue;
    seen[t]++; if (Math.random() * seen[t] < 1) pick[t] = i;
  }
  k.reach = { stone: seen[1], bronze: seen[2], iron: seen[3], silver: seen[4], gold: seen[5] };
  if (k.pop < 4) return;
  for (let t = 1; t <= 5; t++) {
    const i = pick[t]; if (i < 0) continue;
    if (k.level < ORE_LV[t] - (k.race === 'dwarf' ? 1 : 0)) continue;
    if (t === 3 && k.age < 1 && seen[2] > 0) continue;       // iron needs bronze tools first
    if (Math.random() > Math.min(.9, (.1 + k.pop * .01) * E.m * (1 + k.level * .1))) continue;
    const key = ORE_KEYS[t]; k[key] = Math.min(250, (k[key] || 0) + ORE_YIELD[t]);
    if (--oreA[i] <= 0) { oreT[i] = 0; if (effects.length < 400) fx('puff', i % W, (i / W) | 0); }
    else if (effects.length < 400 && Math.random() < .4) fx('hit', i % W, (i / W) | 0);
  }
}
function ageCheck() {                                        // bronze then iron weapons: +10% / +22% attack and defence
  for (const k of kingdoms.values()) {
    if (k.age < 1 && k.level >= 1 && k.bronze >= 20) { k.bronze -= 20; k.age = 1; recalcMods(k); fx('tech', Math.round(k.cx), Math.round(k.cy), { ic: '🥉' }); }
    else if (k.age === 1 && k.level >= 2 && k.iron >= 25) { k.iron -= 25; k.age = 2; recalcMods(k); fx('tech', Math.round(k.cx), Math.round(k.cy), { ic: '🔩' }); }
  }
}
/* ============================== MARKET + CARAVANS + IRON KNIGHTS ============================== */
const COMM = ['food', 'wood', 'stone', 'bronze', 'iron', 'silver'];
const CBASE = { food: .6, wood: 1, stone: 1, bronze: 4, iron: 6, silver: 8 }, CCAP = { food: 400, wood: 250, stone: 250, bronze: 250, iron: 250, silver: 250, gold: 250 };
const CEMO = { food: '🍞', wood: '🪵', stone: '🪨', bronze: '🥉', iron: '🔩', silver: '🥈' };
const market = { p: Object.assign({}, CBASE), d: {}, trades: 0 };
function needOf(k, c) {                                        // what a kingdom wants to hold soon: next level, next tech, next age
  let n = c === 'food' ? 60 : 12;
  const r = k.level < 3 ? LV_REQ[k.level] : null; if (r && r[c]) n = Math.max(n, r[c] + 5);
  const t = TECHS[k.race][k.tech.length]; if (t && t.cost[c]) n = Math.max(n, t.cost[c] + 5);
  if (c === 'bronze' && k.age < 1) n = Math.max(n, 25);
  if (c === 'iron' && k.age < 2) n = Math.max(n, 30);
  return n;
}
const keepOf = (k, c) => Math.max(needOf(k, c) * 2, c === 'food' ? 150 : 60);
function updateMarket() {                                     // prices follow world-wide stock: plentiful goods get cheap, scarce ones dear
  const ks = [...kingdoms.values()]; if (!ks.length) return;
  for (const c of COMM) {
    let sup = 0; for (const k of ks) sup += k[c] || 0;
    const ratio = sup / (ks.length * (c === 'food' ? 120 : 60)), target = CBASE[c] * Math.max(.5, Math.min(2.5, 1.9 - 1.3 * ratio));
    const old = market.p[c]; market.p[c] = old + (target - old) * .25; market.d[c] = market.p[c] - old;
  }
}
function tradeTick() {                                        // kingdoms buy what they lack from a peaceful neighbour that has a surplus, with a cart
  if (compDirty) computeComps();
  const ks = [...kingdoms.values()], carts = {};
  for (const c of creatures) if (c.hp > 0 && RACES[c.t].cart) carts[c.k] = (carts[c.k] || 0) + 1;
  for (const A of ks) {
    if (A.level < 1 || A.houses < 5 || A.enemies.size || tick < (A.tradeCd || 0) || (carts[A.id] || 0) >= 2) continue;
    let d = null, dd = 8;
    for (const c of COMM) { const df = needOf(A, c) - (A[c] || 0); if (df > dd) { dd = df; d = c; } }
    A.tradeCd = tick + 240; if (!d) continue;
    let B = null, bd = 1e9, bs = 0;
    for (const o of ks) {
      if (o === A || o.houses < 4 || A.enemies.has(o.id) || o.enemies.has(A.id) || comp[o.cap] !== comp[A.cap]) continue;
      const sp = (o[d] || 0) - keepOf(o, d); if (sp < 8) continue;
      const dist = Math.max(Math.abs((o.cap % W) - (A.cap % W)), Math.abs(((o.cap / W) | 0) - ((A.cap / W) | 0)));
      if (dist <= 48 && dist < bd) { bd = dist; B = o; bs = sp; }
    }
    if (!B) continue;
    const q = Math.max(1, Math.min(bs, dd + 4, 20) | 0), cost = Math.ceil(q * market.p[d] * (1 + bd * .004));
    let pay = null;
    if (A.gold >= cost) pay = { key: 'gold', amt: cost };
    else for (const s of COMM) { if (s === d) continue; const sp = (A[s] || 0) - keepOf(A, s); if (sp > 0 && sp * market.p[s] >= cost) { pay = { key: s, amt: Math.ceil(cost / market.p[s]) }; break; } }
    if (!pay) continue;
    const c = spawnNear('cart', A.cap % W, (A.cap / W) | 0); if (!c) continue;
    A[pay.key] -= pay.amt; c.k = A.id; c.trade = { to: B.id, d, q, pay, phase: 0, got: 0, done: false }; A.tradeCd = tick + 480;
    fx('puff', c.x, c.y);
  }
}
function refundTrade(c) {                                      // a lost caravan returns the payment if the goods were not yet bought
  const tr = c.trade; if (!tr || tr.done) return; tr.done = true;
  const A = kingdoms.get(c.k); if (A && tr.phase === 0) A[tr.pay.key] = Math.min(CCAP[tr.pay.key], (A[tr.pay.key] || 0) + tr.pay.amt);
}
function stepCart(c) {
  const R = RACES.cart, A = kingdoms.get(c.k), tr = c.trade;
  c.age++;
  if (!A || !tr || c.age > c.life) { c.hp = 0; c.cause = 'old'; return; }
  if ((tick + c.id) % R.mv !== 0) return;
  const dest = tr.phase === 0 ? kingdoms.get(tr.to) : A;
  if (!dest) { c.hp = 0; c.cause = 'old'; return; }
  const tx = dest.cap % W, ty = (dest.cap / W) | 0;
  if (Math.max(Math.abs(tx - c.x), Math.abs(ty - c.y)) <= 2) {
    if (tr.phase === 0) {
      const give = Math.min(Math.floor(dest[tr.d] || 0), tr.q);
      dest[tr.d] -= give; dest[tr.pay.key] = Math.min(CCAP[tr.pay.key], (dest[tr.pay.key] || 0) + tr.pay.amt);
      tr.got = give; tr.phase = 1; fx('bless', c.x, c.y);
    } else {
      A[tr.d] = Math.min(CCAP[tr.d], (A[tr.d] || 0) + tr.got); tr.done = true; market.trades++; fx('bless', c.x, c.y); c.hp = 0; c.cause = 'old';
    }
    return;
  }
  const sx = Math.sign(tx - c.x), sy = Math.sign(ty - c.y);
  if (tryMove(c, c.x + sx, c.y + sy) || tryMove(c, c.x + sx, c.y) || tryMove(c, c.x, c.y + sy)) { c.fail = 0; return; }
  if (++c.fail > 2) { const dd = DIRS[ri(1, 8)]; tryMove(c, c.x + dd[0], c.y + dd[1]); c.fail = 0; }
}
function eliteTick() {                                        // Iron Age kingdoms arm a few soldiers as iron knights (+80% hp, +50% attack, +40% defence)
  const cnt = {}; for (const c of creatures) if (c.hp > 0 && c.elite && c.k) cnt[c.k] = (cnt[c.k] || 0) + 1;
  for (const k of kingdoms.values()) {
    if (k.age < 2 || k.level < 2 || k.iron < 8 || (cnt[k.id] || 0) >= Math.min(8, 2 + (k.level - 2) * 2 + (k.pop >> 5))) continue;
    const cx = k.cap % W, cy = (k.cap / W) | 0; let best = null, bd = 15;
    for (const c of creatures) {
      if (c.k !== k.id || c.hp <= 0 || c.elite || RACES[c.t].engine || !RACES[c.t].civ || !(c.lead || isSoldier(c))) continue;
      const d = Math.max(Math.abs(c.x - cx), Math.abs(c.y - cy)); if (d < bd) { bd = d; best = c; }
    }
    if (!best) continue;
    best.elite = 1; applyStats(best); addHist(best, 7); k.iron -= 8; fx('levelup', best.x, best.y);
  }
}
const shop = [];                                              // items sold to the market: { it: [slot, tier, race, ench], price, b }
function itemValue(sl, t, e) {                                // crafting cost at today's metal prices, with a markup; enchanted gear is worth four times as much
  let v = 0; const c = GEAR_COST[t - 1][sl]; for (const x in c) v += c[x] * (market.p[x] || 1);
  return Math.round(Math.max(3, v * 1.6) * (e ? 4 : 1));
}
const sellPrice = it => Math.max(1, Math.round(itemValue(it[0], it[1], it[3] | 0) * .75));
function shopAdd(it, price) { shop.push({ it, price, b: tick }); if (shop.length > 10) shop.shift(); }
function shopTick() {                                         // every ~10 s: unsold items go stale, kingdoms trim or restock their chests
  for (let i = shop.length - 1; i >= 0; i--) if (tick - shop[i].b > 3000) shop.splice(i, 1);
  for (const k of kingdoms.values()) {
    if (k.chest.length >= chestCap(k) || (k.gold < 15 && k.chest.some(it => it[1] <= 1 && !it[3]))) {          // sell the least valuable piece
      let bi = -1, bv = 1e9; k.chest.forEach((it, j) => { const v = itemValue(it[0], it[1], it[3] | 0); if (v < bv) { bv = v; bi = j; } });
      if (bi >= 0) { const it = k.chest.splice(bi, 1)[0], p = sellPrice(it); k.gold = Math.min(250, k.gold + p); shopAdd(it, p); market.sold = (market.sold | 0) + 1; }
    } else if (shop.length && k.chest.length < chestCap(k) && k.gold >= 40 && Math.random() < .3) {             // buy something worth having
      let bi = -1, bv = -1; shop.forEach((r, j) => { const pr = Math.round(r.price * 1.15); if ((r.it[1] >= (k.age | 0) + 1 || r.it[3]) && pr <= k.gold - 15) { const v = r.it[1] * 10 + (r.it[3] ? 6 : 0); if (v > bv) { bv = v; bi = j; } } });
      if (bi >= 0) { const r = shop.splice(bi, 1)[0]; k.gold -= Math.round(r.price * 1.15); k.chest.push(r.it); market.bought = (market.bought | 0) + 1; }
    }
    if (k.level >= 2 && (k.silver || 0) >= 15 && tick >= (k.forgeCd || 0)) {                                    // the royal smith enchants a chest item
      const j = k.chest.findIndex(it => it[1] >= 2 && !it[3]);
      if (j >= 0) { k.chest[j][3] = rollEnchant(k.chest[j][0]); k.silver -= 15; k.forgeCd = tick + 800; fx('bless', k.cap % W, (k.cap / W) | 0); }
    }
  }
}
function marketHtml() {
  let live = 0; for (const c of creatures) if (c.hp > 0 && RACES[c.t].cart) live++;
  const rows = COMM.map(c => { const d = market.d[c] || 0; return `${CEMO[c]}${market.p[c].toFixed(1)}${d > .02 ? '▲' : d < -.02 ? '▼' : '–'}`; });
  const items = shop.slice(-6).map(r => `${GEAR_ICON[r.it[0]]}${'I'.repeat(r.it[1])}${r.it[3] ? '✨' : ''} ${r.price}`).join(' &nbsp; ');
  return `<b>🏦 Pasar</b> 🪙<br>${rows.join(' &nbsp; ')}<br>🛒 ${live} · ${market.trades} · 🎒 ${market.sold | 0}/${market.bought | 0}${items ? '<br>' + items : ''}`;
}
/* ============================== TERRAIN POLISH: peaks, hills, volcanoes, particles, flames ============================== */
const TERRAIN_PAL = {"o": "#2a2432", "L": "#b4b0bc", "l": "#cfccd6", "M": "#8e8a9a", "D": "#605c70", "d": "#46425a", "S": "#f4f8ff", "s": "#c6d6f0", "b": "#9ab0d8", "g": "#6f9a58", "G": "#4f7a3e", "h": "#8cba6a"}, TERRAIN_PAL_V = {"o": "#2a2432", "L": "#b4b0bc", "l": "#cfccd6", "M": "#8e8a9a", "D": "#605c70", "d": "#46425a", "S": "#f4f8ff", "s": "#c6d6f0", "b": "#9ab0d8", "g": "#6f9a58", "G": "#4f7a3e", "h": "#8cba6a", "e": "#ff8a2a", "y": "#ffe27a", "r": "#d8421e"};
const TERRAIN_SPR_DEF = {
  rockA: [".......o......", ".....oMlo.....", ".....oMlo.....", ".....oMlDDo...", "....oMMlDo....", "...oLLLlDDo...", "..oMLLLlDDMo..", "..oLLMMlMMDMo.", "..oMMMLlMMMMo.", ".oLLLLMlDDDDDo", "..oMLLMlDDddDo", "oLLMMLLlDdDDdd"],
  rockB: ["......oo..", "......o...", "....oLlo..", "....oLlDDo", "...oMLlDMo", "...oLMlMDo", "..oLLLlDDo", "...oLLlDMo", ".oLLLMldDo", "oMLLMMlDdD"],
  rockC: [".......oo.......", ".....oLlMo......", "....oLLlMMo.....", ".....oMlDMo.....", "....oMLlMDDo....", "....oLLlDDDo....", "...oMMMlMDDMo...", "...oMMLlDDDMo...", "..oMMLMlMDMMo...", "..oLMLLlDDDMDo..", ".oMMLLLlDMDDMMo.", ".oLMLLLlDDDDDdo.", "oMLLLLMlDDDDDdo.", "oLMLLLLlDDdDDdDd"],
  snowA: ["......oo......", ".....osSso....", ".....oSSso....", ".....oSSso....", "....oSSSsso...", "...oSSSSsso...", "..oSSSsSsso...", "...oMLLlDDMo..", "..oLLLLlDDMDo.", ".oLLMLMlDDddDo", ".oLLLLMlDDDdDo", "oMLMMLMlDDdDDD"],
  snowB: ["....oSo...", ".....oSso.", ".....oSso.", "...oSSSsso", "...oSsSsso", "...oSsSsso", "..oLLMlMDo", "..oMLMlDDo", ".oLLLMlDDo", ".oLLLLlDDD"],
  snowC: ["......oSo.......", ".....oSSo.......", "......oSo.......", ".....oSSsso.....", "....oSSSso......", "...oSSSSsso.....", "...oSSSSssso....", "..oSSSSSsssso...", "..oLLMLlDDDMo...", ".oLLLMMlDMDMo...", "oLMLLLMlDMDDDMo.", "oLLMLLMldDDDDdo.", "oLMMLMLlDDDDdo..", "oLLLMMMldDDdDDDd"],
  hillA: ["...ogGGgGo..", "..ohhgGGGGo.", ".ogghGGgGGGo", ".ohhhggGGGGo", ".ohhgGgGGGGo", ".oMMgGggMGMo", "oooooooooooo"],
  hillB: ["..ohGGGo.", "..ohGgGo.", ".ohgggGGo", ".oghGGGGo", ".oGgggMGo", "ooooooooo"],
  volcano: ["........ooooo........", ".......ooyyyoo.......", "......orLrerdo.......", "......oLeeeDdeo......", "......orLrMDdro......", ".....oLeeMMDDeDo.....", "....oMMLrLMdDrdo.....", "....oLMLeMMdddddo....", "....oMLLrMMdDDDDo....", "...oLLMMeLMDdDDDDo...", "..oMLMMLLLMdDdDDdo...", "..oLMLMLLMMddDDDdDo..", "..oLLMLLMLMDDDDddDo..", ".oMLLLMMLMMdDDDdDddo.", "oLMMLMLMMMMDddddDDDo.", "ooooooooooooooooooooo"],
};

const TSP = {}; for (const n in TERRAIN_SPR_DEF) TSP[n] = buildSprite({ pal: n === 'volcano' ? TERRAIN_PAL_V : TERRAIN_PAL, A: TERRAIN_SPR_DEF[n] }, 'A');
const volcanoes = [];                                          // { i, x, y, er: tick of the last eruption }
function volcanoAt(x, y) { return volcanoes.find(v => v.x === x && v.y === y); }
function seedVolcanoes() {                                     // a few real volcanoes on big mountain massifs, well apart
  volcanoes.length = 0;
  const want = Math.max(1, Math.round(N / 17000));
  for (let n = 0; n < 4000 && volcanoes.length < want; n++) {
    const x = ri(3, W - 4), y = ri(3, H - 4), i = x + y*W; if (tiles[i] !== T.MOUNTAIN) continue;
    let m = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const t = tiles[x + dx + (y + dy)*W]; if (t === T.MOUNTAIN || t === T.SNOW) m++; }
    if (m < 14 || volcanoes.some(v => Math.hypot(v.x - x, v.y - y) < 26)) continue;
    volcanoes.push({ i, x, y, er: -1e9 });
  }
}
const parts = [];
function emit(kind, x, y, n, o) {
  o = o || {};
  for (let k = 0; k < n; k++) {
    if (parts.length >= 700) parts.shift();
    const a = Math.random() * 6.283, sp = Math.random(), p = { k: kind, x: x + (Math.random() - .5) * (o.sx || 0), y, vx: 0, vy: 0, m: 40, dk: o.dark || 0, s0: o.s0 || .22, s1: o.s1 || .8 };
    if (kind === 'smoke') { p.vx = (Math.random() - .35) * .018 + .012; p.vy = -.018 - Math.random() * .03; p.m = 70 + Math.random() * 70; }
    else if (kind === 'ember') { p.vx = (Math.random() - .5) * .07; p.vy = -.05 - Math.random() * .1; p.m = 30 + Math.random() * 34; }
    else if (kind === 'ash') { p.vx = (Math.random() - .2) * .04; p.vy = -.02 - Math.random() * .05; p.m = 90 + Math.random() * 70; }
    else if (kind === 'spark') { p.vx = Math.cos(a) * .16 * sp; p.vy = Math.sin(a) * .16 * sp - .04; p.m = 12 + Math.random() * 10; }
    else if (kind === 'debris') { p.vx = Math.cos(a) * .24 * sp; p.vy = Math.sin(a) * .24 * sp - .13; p.m = 34 + Math.random() * 24; }
    else { p.vx = Math.cos(a) * .05 * sp; p.vy = -.01 - Math.random() * .03; p.m = 40 + Math.random() * 24; }     // dust
    p.l = p.m; parts.push(p);
  }
}
function drawParts() {
  ctx.save();
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.x += p.vx; p.y += p.vy;
    if (p.k === 'ember' || p.k === 'debris') p.vy += .004; else if (p.k === 'spark') p.vy += .008;
    if (--p.l <= 0) { parts.splice(i, 1); continue; }
    const a = p.l / p.m, sx = ox + (p.x + .5) * sc, sy = oy + (p.y + .5) * sc;
    if (sx < -60 || sx > 780 || sy < VIEW.y - 80 || sy > VIEW.y + VIEW.h + 40) continue;
    if (p.k === 'smoke') { const g = p.dk ? 58 : 150; ctx.fillStyle = `rgba(${g},${g - 6},${g - 4},${a * (p.dk ? .62 : .38)})`; ctx.beginPath(); ctx.arc(sx, sy, sc * (p.s0 + (1 - a) * p.s1), 0, 7); ctx.fill(); }
    else if (p.k === 'ember') { ctx.fillStyle = `rgba(255,${(90 + a * 130) | 0},30,${Math.min(1, a * 1.6)})`; ctx.fillRect(sx - 1, sy - 1, Math.max(2, sc * .1), Math.max(2, sc * .1)); }
    else if (p.k === 'ash') { ctx.fillStyle = `rgba(70,66,72,${a * .7})`; ctx.fillRect(sx, sy, Math.max(1.5, sc * .07), Math.max(1.5, sc * .07)); }
    else if (p.k === 'spark') { ctx.strokeStyle = `rgba(255,240,170,${a})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - p.vx * sc * 3, sy - p.vy * sc * 3); ctx.stroke(); }
    else if (p.k === 'debris') { ctx.fillStyle = `rgba(${(60 + a * 120) | 0},${(40 + a * 50) | 0},34,${Math.min(1, a * 2)})`; ctx.fillRect(sx - 1, sy - 1, Math.max(2, sc * .13), Math.max(2, sc * .13)); }
    else { ctx.fillStyle = `rgba(170,150,110,${a * .35})`; ctx.beginPath(); ctx.arc(sx, sy, sc * (.2 + (1 - a) * .5), 0, 7); ctx.fill(); }
  }
  ctx.restore();
}
function drawVolcanoes(x0, y0, x1, y1) {
  const k = sc / 6 * 1.45, spr = TSP.volcano;
  for (const v of volcanoes) {
    if (tiles[v.i] !== T.MOUNTAIN && tiles[v.i] !== T.SNOW) continue;
    if (v.x < x0 - 4 || v.x > x1 + 4 || v.y < y0 - 2 || v.y > y1 + 7) continue;
    const w = spr.width * k, h = spr.height * k, cx = ox + (v.x + .5) * sc, fy = oy + (v.y + 1) * sc - sc * .05;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(cx, fy - k, w * .55, k * 2, 0, 0, 7); ctx.fill();
    ctx.drawImage(spr, cx - w / 2, fy - h, w, h);
    const age = tick - v.er, act = age < 480 ? 1 - age / 480 : 0, warn = pendingDis.some(d => d.type === 'volcano' && d.x === v.x && d.y === v.y);
    const gl = .3 + act * .6 + (warn ? .4 : 0) + Math.sin(frame * .08 + v.i) * .08, ccy = fy - h + k * 1.7;
    const gr = ctx.createRadialGradient(cx, ccy, 0, cx, ccy, k * (5 + act * 5));
    gr.addColorStop(0, `rgba(255,190,70,${Math.min(.85, gl)})`); gr.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, ccy, k * (5 + act * 5), 0, 7); ctx.fill();
    const wx = v.x, wy = (ccy - oy) / sc - .5;
    if (act > 0 || warn) { emit('smoke', wx, wy, 1, { sx: .4, dark: 1, s0: .35, s1: 1.4 }); if (Math.random() < .5 + act * .4) emit('ember', wx, wy, 1, { sx: .3 }); if (act > .5 && Math.random() < .3) emit('ash', wx, wy, 1, { sx: 1 }); }
    else if (frame % 16 === 0) emit('smoke', wx, wy, 1, { sx: .3, s0: .2, s1: .7 });
  }
}
function tri(ax, ay, bx, by, cx, cy) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill(); }
function drawFires(x0, y0, x1, y1) {                           // flames with flicker, smoke and embers; houses burn bigger
  if (sc < 5) return;
  for (let y = y0; y <= Math.min(H - 1, y1 + 1); y++) for (let x = x0; x <= x1; x++) {
    const i = x + y*W; if (!fire[i]) continue;
    const cx = ox + (x + .5) * sc, by = oy + (y + .92) * sc, big = bld[i] ? 1.55 : 1, fl = Math.sin(frame * .34 + i * 1.7), fl2 = Math.sin(frame * .51 + i * .9);
    const hgt = sc * (.95 + .3 * fl) * big, wid = sc * .52 * big;
    if (nightNow > .15) { const gr = ctx.createRadialGradient(cx, by - hgt * .4, 0, cx, by - hgt * .4, sc * 2.2); gr.addColorStop(0, `rgba(255,150,50,${.3 * Math.min(1, nightNow * 1.6)})`); gr.addColorStop(1, 'rgba(255,100,20,0)'); ctx.fillStyle = gr; ctx.fillRect(cx - sc * 2.2, by - hgt - sc * 2, sc * 4.4, sc * 4.4 + hgt); }
    ctx.fillStyle = '#ff4e12'; tri(cx - wid, by, cx + wid, by, cx + fl2 * sc * .14, by - hgt);
    ctx.fillStyle = '#ff9c24'; tri(cx - wid * .62, by, cx + wid * .62, by, cx - fl * sc * .1, by - hgt * .72);
    ctx.fillStyle = '#fff0a0'; tri(cx - wid * .3, by, cx + wid * .3, by, cx + fl2 * sc * .05, by - hgt * .42);
    if (Math.random() < .035 * big) emit('smoke', x, y - .4, 1, { s0: .2, s1: .9 });
    if (Math.random() < .045 * big) emit('ember', x, y - .2, 1, { sx: .4 });
  }
}
const PPRI = { wall: 0, field: 0, well: 1, barn: 1, tower: 2, gate: 3 };
function propOk(i) { const t = tiles[i]; return t > T.SHALLOW && t !== T.LAVA && t !== T.MOUNTAIN && t !== T.SNOW && !bld[i]; }
function ringCenter(k) {                                    // walls and props stay anchored while the realm's centre stays within 9 tiles, so the capital changing does not move the ring
  if (!(k.rc >= 0) || Math.hypot(k.rc % W - k.cx, ((k.rc / W) | 0) - k.cy) > 9) k.rc = k.cap;
  return k.rc;
}
const ringR = k => k.level >= 3 ? 7 : k.level >= 2 ? 5 : k.mod.walls ? 4 : 0;
const terrOk = i => { const t = tiles[i]; return t > T.SHALLOW && t !== T.LAVA && t !== T.MOUNTAIN && t !== T.SNOW; };
function kingdomRing(k, R) {                                // wall ring around the capital: gate in the middle of each side, towers at the corners of big realms
  const rc = ringCenter(k), key = R + '|' + rc + '|' + k.level;
  if (k.rv && k.rv.key === key) return k.rv.list;
  const list = [], cx = rc % W, cy = (rc / W) | 0;
  if (R) for (let d = -R; d <= R; d++) for (const [x, y] of [[cx + d, cy - R], [cx + d, cy + R], [cx - R, cy + d], [cx + R, cy + d]]) {
    if (!inb(x, y) || !terrOk(x + y*W)) continue;
    const corner = Math.abs(x - cx) === R && Math.abs(y - cy) === R, mid = (x === cx || y === cy);
    list.push({ t: mid ? 'gate' : corner && k.level >= 2 ? 'tower' : 'wall', x, y });
  }
  k.rv = { key, list };
  return list;
}
function rebuildWalls() {
  wallK.fill(0); wallG.fill(0); wallT.fill(0); wallGates.clear();
  for (const k of kingdoms.values()) {
    const R = ringR(k); if (!R) continue;
    for (const p of kingdomRing(k, R)) {
      const i = p.x + p.y*W; if (k.broken && k.broken.has(i)) continue; wallK[i] = k.id; if (p.t === 'tower') wallT[i] = 1;
      if (p.t === 'gate') { wallG[i] = 1; let g = wallGates.get(k.id); if (!g) wallGates.set(k.id, g = []); g.push(i); }
    }
  }
}
function kingdomProps(k) {
  const rc = ringCenter(k), key = `${k.level}|${k.houses}|${rc}|${k.mod.walls ? 1 : 0}|${k.mod.farms ? 1 : 0}`;
  if (k.pv && k.pv.key === key) return k.pv.list;
  const list = [], used = new Set(), cx = rc % W, cy = (rc / W) | 0;
  used.add(rc); used.add(rc + 1); used.add(rc - 1);
  const R = ringR(k);
  for (const p of kingdomRing(k, R)) { used.add(p.x + p.y*W); if (propOk(p.x + p.y*W)) list.push(p); }
  const cand = [];
  for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
    const dd = Math.max(Math.abs(dx), Math.abs(dy));
    if (dd < 2 || (R && Math.abs(dd - R) < 1) || (R && dd > R - 1 && dd < R + 1)) continue;
    const x = cx + dx, y = cy + dy; if (!inb(x, y)) continue;
    const i = x + y*W; if (used.has(i) || !propOk(i) || bld[i + 1] || bld[i - 1] || bld[i + W]) continue;
    cand.push([hash(x, y, k.cap & 1023), x, y, dd]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  const want = [];
  const nWell = k.houses >= 4 ? (k.level >= 3 ? 2 : 1) : 0, nBarn = k.level >= 1 ? (k.level >= 3 ? 3 : k.houses >= 10 ? 2 : 1) : 0;
  const nField = k.houses >= 3 ? Math.min(12, Math.floor(k.houses / 2.5) + (k.mod.farms ? 3 : 0)) : 0;
  for (let n = 0; n < nWell; n++) want.push(['well', 2, 5]);
  for (let n = 0; n < nBarn; n++) want.push(['barn', 3, 7]);
  for (let n = 0; n < nField; n++) want.push(['field', 3, 9]);
  for (const [t, lo, hi] of want) {
    const c = cand.find(c => c[3] >= lo && c[3] <= hi && !used.has(c[1] + c[2]*W)); if (!c) continue;
    used.add(c[1] + c[2]*W); list.push({ t, x: c[1], y: c[2] });
  }
  k.pv = { key, list };
  return list;
}
function drawGear(c, cx, fy, sw, sh) {                         // armour band, shield and a weapon in the tier colour
  const e = c.eq, K = SPR_K, hd = c.face < 0 ? -1 : 1;
  if (e[1]) { const [d, l] = TIER_COL[e[1]]; ctx.fillStyle = d; ctx.fillRect(cx - sw*.3, fy - sh*.5, sw*.6, K*2.2); ctx.fillStyle = l; ctx.fillRect(cx - sw*.3, fy - sh*.5, sw*.6, K*.8); ctx.fillStyle = d; ctx.fillRect(cx - sw*.42, fy - sh*.55, K*1.4, K*1.6); ctx.fillRect(cx + sw*.42 - K*1.4, fy - sh*.55, K*1.4, K*1.6); }
  if (e[2]) { const [d, l] = TIER_COL[e[2]], sx = cx - hd*sw*.5 - (hd < 0 ? K*2 : 0); ctx.fillStyle = '#1c1424'; ctx.fillRect(sx - K*.3, fy - sh*.5 - K*.3, K*2.6, K*3.8); ctx.fillStyle = d; ctx.fillRect(sx, fy - sh*.5, K*2, K*3.2); ctx.fillStyle = l; ctx.fillRect(sx, fy - sh*.5, K*.8, K*3.2); }
  if (c.ec) for (let sl = 0; sl < 3; sl++) if (e[sl] && c.ec[sl]) {                  // enchanted pieces pulse in their colour
    const gx = sl === 0 ? cx + hd*sw*.5 : sl === 2 ? cx - hd*sw*.5 : cx, gy = sl === 1 ? fy - sh*.42 : fy - sh*.48;
    ctx.fillStyle = ENCH[c.ec[sl]].c + '66'; ctx.beginPath(); ctx.arc(gx, gy, K*(3 + Math.sin(frame*.15 + sl)*.7), 0, 7); ctx.fill();
  }
  if (e[0]) {
    const [d, l] = TIER_COL[e[0]], kind = GEAR_KIND[c.t] ? GEAR_KIND[c.t][e[0] - 1] : 'club', x = cx + hd*sw*.5 - (hd < 0 ? K : 0), y = fy - sh*.45;
    ctx.fillStyle = '#1c1424';
    if (kind === 'sword') { ctx.fillRect(x - K*.3, y - K*4.3, K*1.6, K*5.6); ctx.fillStyle = l; ctx.fillRect(x, y - K*4, K, K*4); ctx.fillStyle = '#6a4424'; ctx.fillRect(x - K*.5, y, K*2, K*.9); ctx.fillRect(x, y + K*.9, K, K*1.1); }
    else if (kind === 'axe') { ctx.fillRect(x - K*.3, y - K*5.3, K*3.2, K*7); ctx.fillStyle = '#8a5a34'; ctx.fillRect(x, y - K*5, K, K*6.4); ctx.fillStyle = l; ctx.fillRect(x + K, y - K*5, K*1.6, K*2); ctx.fillStyle = d; ctx.fillRect(x + K, y - K*3.4, K*1.6, K*.5); }
    else if (kind === 'spear') { ctx.fillRect(x - K*.3, y - K*7.3, K*1.6, K*9); ctx.fillStyle = '#8a5a34'; ctx.fillRect(x, y - K*6, K, K*7.6); ctx.fillStyle = l; ctx.fillRect(x, y - K*7, K, K*1.4); }
    else if (kind === 'bow') { ctx.fillRect(x - K*.6, y - K*4.3, K*2.4, K*6.6); ctx.fillStyle = e[0] === 3 ? '#e8eef6' : '#8a5a34'; ctx.fillRect(x, y - K*4, K, K*5.8); ctx.fillStyle = l; ctx.fillRect(x + hd*K, y - K*3, K*.6, K*3.4); }
    else if (kind === 'claw') { ctx.fillRect(x - K*.4, y - K*2.3, K*3, K*3.6); ctx.fillStyle = l; ctx.fillRect(x, y - K*2, K*.7, K*2.6); ctx.fillRect(x + K*1, y - K*2, K*.7, K*2.6); ctx.fillRect(x + K*2, y - K*2, K*.7, K*2.6); }
    else { ctx.fillRect(x - K*.3, y - K*3.3, K*2.2, K*4.6); ctx.fillStyle = d; ctx.fillRect(x, y - K*3, K*1.6, K*3.6); ctx.fillStyle = l; ctx.fillRect(x, y - K*3, K*.6, K*3.6); }
  }
}
function drawDrops(x0, y0, x1, y1) {
  for (const d of drops) {
    if (d.x < x0 - 1 || d.x > x1 + 1 || d.y < y0 - 1 || d.y > y1 + 1) continue;
    const cx = ox + (d.x + .5) * sc, cy = oy + (d.y + .55) * sc + Math.sin(frame * .1 + d.x) * sc * .06, c = TIER_COL[d.t];
    ctx.fillStyle = (d.e ? ENCH[d.e].c : c[0]) + (d.e ? '88' : '55'); ctx.beginPath(); ctx.arc(cx, cy, sc * (.5 + .06 * Math.sin(frame * .12 + d.y)), 0, 7); ctx.fill();
    ctx.strokeStyle = d.e ? ENCH[d.e].c : c[1]; ctx.lineWidth = Math.max(1.5, sc * .06); ctx.stroke();
    const ic = ICON[['swords', 'armor', 'shield'][d.s]], w = sc * .85; ctx.imageSmoothingEnabled = false; ctx.drawImage(ic, cx - w / 2, cy - w / 2, w, w);
  }
}
function drawDecor(x0, y0, x1, y1) {                          // trees by kind, palms on sand, ore nodes
  const u = sc / 6;
  for (let y = y0; y <= Math.min(H - 1, y1 + 1); y++) for (let x = x0; x <= x1; x++) {
    const i = x + y*W, t = tiles[i];
    if (fire[i]) continue;
    if (t === T.FOREST) {
      if (hash(x, y, 3) > .8) continue;
      const sp = TREE_SPR[(treeKindAt(i) & 7) - 1], w = sp.width * u * .75, h = sp.height * u * .75;
      ctx.drawImage(sp, ox + (x + .5 + (hash(x, y, 5) - .5) * .5) * sc - w/2, oy + (y + .98 + (hash(x, y, 6) - .5) * .3) * sc - h, w, h);
    } else if (t === T.SAND && (treeKindAt(i) & 16)) {
      const w = PALM_SPR.width * u * .75, h = PALM_SPR.height * u * .75;
      ctx.drawImage(PALM_SPR, ox + (x + .5) * sc - w/2, oy + (y + .98) * sc - h, w, h);
    } else if (t === T.MOUNTAIN || t === T.SNOW) {                  // mountain ranges: rock peaks, snow caps on the white ground
      const hv = hash(x, y, 41); if (hv > .5) continue;
      const sp = TSP[(t === T.SNOW ? 'snow' : 'rock') + 'ABC'[(hv * 5 | 0) % 3]], k = u * .82, w = sp.width * k, h = sp.height * k;
      ctx.drawImage(sp, ox + (x + .5 + (hash(x, y, 42) - .5) * .5) * sc - w/2, oy + (y + 1.05) * sc - h, w, h);
    } else if (t === T.HILL) {
      const hv = hash(x, y, 43); if (hv > .55) continue;
      const sp = TSP[hv > .27 ? 'hillA' : 'hillB'], k = u * .8, w = sp.width * k, h = sp.height * k;
      ctx.drawImage(sp, ox + (x + .5 + (hash(x, y, 44) - .5) * .4) * sc - w/2, oy + (y + .98) * sc - h, w, h);
    }
  }
}
function drawOres(x0, y0, x1, y1) {
  const u = sc / 6;
  for (const i of nodes) {
    const ot = oreT[i]; if (!ot) continue;
    const x = i % W, y = (i / W) | 0; if (x < x0 - 1 || x > x1 + 1 || y < y0 - 1 || y > y1 + 1) continue;
    const sp = ORE_SPR[ot], w = sp.width * u * .62, h = sp.height * u * .62;
    ctx.drawImage(sp, ox + (x + .5) * sc - w/2, oy + (y + .95) * sc - h, w, h);
  }
}
function drawProps(x0, y0, x1, y1, ground) {                 // ground=true: flat fields under everything; false: standing props
  const out = [];
  for (const k of kingdoms.values()) {
    const kx = k.cap % W, ky = (k.cap / W) | 0; if (kx < x0 - 12 || kx > x1 + 12 || ky < y0 - 12 || ky > y1 + 14) continue;
    for (const p of kingdomProps(k)) {
      if ((p.t === 'field') !== ground || p.x < x0 - 2 || p.x > x1 + 2 || p.y < y0 - 2 || p.y > y1 + 4) continue;
      if (!propOk(p.x + p.y*W)) continue;
      out.push(p); p.bi = RACES[k.race].bi; p.kg = k;
    }
  }
  if (!ground) out.sort((a, b) => a.y - b.y || PPRI[a.t] - PPRI[b.t] || a.x - b.x);
  const u = sc / 6;
  for (const p of out) {
    const sp = PATLAS[p.bi][p.t], px = ox + p.x*sc, py = oy + p.y*sc;
    if (p.t === 'field') { ctx.drawImage(sp, px, py, sc, sc); continue; }
    const ti = p.x + p.y*W, dmg = (p.t === 'wall' || p.t === 'tower') && p.kg.wd ? p.kg.wd.get(ti) || 0 : 0;
    if (dmg >= 1e4) {                                       // breached: rubble instead of wall
      const r = sc * .16; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(px + sc*.1, py + sc*.72, sc*.8, sc*.2);
      for (const [rx, ry, rc] of [[.12, .62, '#6a6470'], [.4, .7, '#8a8490'], [.62, .6, '#5a5460'], [.28, .55, '#8a7a6a'], [.7, .74, '#7a7480']]) { ctx.fillStyle = rc; ctx.fillRect(px + sc*rx, py + sc*ry, r*1.3, r); }
      continue;
    }
    const fy = py + sc*.96, tile = p.t === 'wall' || p.t === 'tower' || p.t === 'gate';
    const k2 = tile ? u : SPR_K, w = sp.width*k2, h = sp.height*k2;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(px + sc/2 - w*.45, fy - k2*.8, w*.9, k2*1.2);
    ctx.drawImage(sp, px + sc/2 - w/2, fy - h, w, h);
    if (dmg > 0) {                                          // cracks + darkening grow with damage
      const f = Math.min(1, dmg / ((p.t === 'tower' ? TOWER_HP : WALL_HP) * (1 + .35 * (p.kg.age | 0))));
      ctx.fillStyle = `rgba(20,10,20,${f * .45})`; ctx.fillRect(px + sc/2 - w/2, fy - h, w, h);
      ctx.strokeStyle = `rgba(255,235,200,${.35 + f * .5})`; ctx.lineWidth = Math.max(1, k2 * .5); ctx.beginPath();
      ctx.moveTo(px + sc*.3, fy - h*.9); ctx.lineTo(px + sc*.45, fy - h*.55); ctx.lineTo(px + sc*.35, fy - h*.3);
      if (f > .5) { ctx.moveTo(px + sc*.7, fy - h*.8); ctx.lineTo(px + sc*.58, fy - h*.45); }
      ctx.stroke();
    }
  }
}


/* ============================== ICONS (pixel art, replaces emoji everywhere in the UI) ============================== */
const ICON_PAL = {'o': '#1c1424', 'w': '#f4f1e6', 'W': '#c8c4d4', 's': '#8a8698', 'S': '#5a566a', 'a': '#2a2438', 'k': '#8a5a34', 'K': '#5e3a20', 't': '#d8b070', 'E': '#f0d898', 'y': '#ffd23f', 'Y': '#e0a020', 'r': '#e8412c', 'R': '#a02420', 'e': '#ff8a2a', 'n': '#f0a0b0', 'g': '#5fae4a', 'G': '#2d7a3a', 'l': '#9ad46a', 'b': '#3f8cff', 'B': '#86bcff', 'd': '#2457b8', 'c': '#5ef0ff', 'C': '#2aa5b8', 'p': '#b07af0', 'P': '#7a4cc0'};
const ICON_ART = {
  mountain: '.....oo...../....owwo..../...owwwwo.../..owwwwsso../.owsssssSSo./owsssssSSSSo/owssssSSSSSo/osssssSSSSSo/ossssSSSSSSo/.oooooooooo./............/............',
  bolt: '.......oo.../......oyyo../.....oyyyo../....oyyyoo../...oyyyyyyo./....ooyyyo../....oyyyo.../...oyyyo..../...oyyo...../..oyoo....../...o......../............',
  crown: '............/.o...oo...o./oyo.oyyo.oyo/oyyooyyooyyo/oyyyoyyoyyyo/oyyyyyyyyyyo/oyYYYYYYYYYo/oyrYyYbYyryo/oYYYYYYYYYYo/.oooooooooo./............/............',
  globe: '....oooo..../...obbbbo.../..obBggbbo../.obBgggbbbo./.obggggbbbo./obbgggbbgbbo/obbbggbgggbo/.obbbbbggbo./.obbbbbbbbo./..obbbbbbo../...obbbbo.../....oooo....',
  raise: '.....oo...../....oyyo..../...oyyyyo.../..oyyyyyyo../.oyyyyyyyyo./..ooyyyyoo../.oooyyyyooo./oggggggggggo/okkkkkkkkkko/okKkKkKkKkKo/.oooooooooo./............',
  lower: '............/.....oo...../....orro..../....orro..../...oorroo.../..orrrrrro../...orrrro.../.oooorroooo./obbbbbbbbbbo/oBbbBbbBbbBo/oddddddddddo/.oooooooooo.',
  waves: '............/............/.o.o.o.o.o../oBoBoBoBoBo./.obBbBbBbBbo/obbbbbbbbbbo/.oooooooooo./oBoBoBoBoBo./.obBbBbBbBbo/obbbbbbbbbbo/.oooooooooo./............',
  grass: '............/...o...o..../..olo.oloo../.olgoolgolo./.olgolggogo./.olgglgglgo./olggglggggo./oggggggggggo/okkkkkkkkkko/okKkKkKkKkKo/.oooooooooo./............',
  pine: '.....o....../....ogo...../...ogggo..../..olggggo.../...ogggggo../..olgggggo../.olgggggggo./..oookkooo../....okKo..../....okKo..../.....oo...../............',
  dune: '............/............/.....oo...../...ootto..../..otttttoo../.otttttttto./otttEtttttto/ottttttttEto/otEttttttto./okkkkkkkkkko/.oooooooooo./............',
  volcano: '...o..o...../..osooso..../...osooso.../....oeeo..../...oeEEeo.../..oSSeeSSo../..oSSrrSSo../.oSSSSrSSSo./.oSSSSSSSSo./oSSSSSSSSSSo/.oooooooooo./............',
  rain: '............/....ooo...../...oWWWoo.../..oWWWWWWo../.oWWWWWWWWo./.owwwwwwwwo./..oooooooo../..oBooBooBo./.oBooBooBo../oBooBooBo.../.o..o..o..../............',
  flame: '.....o....../....oeo...../....oeeo..../...oeEeo..../..oeEEEeo.../..oeEyEeo.../.oeEyyyEeo../.oeEyyyEeo../.oeeEyEeeo../..oeeeeeo.../...ooooo..../............',
  meteor: '.oo........./oeeoo......./.oeEeoo...../..oeEEeoo.../...oeEEkko../....oekKkko./....okkKkkko/....okKkkkko/.....okkkko./......oooo../............/............',
  sparkle: '.....oo...../....oyyo..../....oyyo..../.oooyyyyooo./oyyyyyyyyyyo/.oyyywwyyyo./oyyyyyyyyyyo/.oooyyyyooo./....oyyo..../....oyyo..../.....oo...../............',
  skull: '...oooooo.../..owwwwwwo../.owwwwwwwwo./.owwwwwwwwo./.owaawwaawo./.owaawwaawo./.owwwaawwwo./..owwwwwwo../..owawawao../..owwwwwwo../...oooooo.../............',
  skullg: '...oooooo.../..ollllllo../.ollllllllo./.ollllllllo./.olaallaalo./.olaallaalo./.olllaalllo./..ollllllo../..olalalao../..ollllllo../...oooooo.../............',
  book: '............/.oooooooooo./obbbbbbbbbbo/obwwwwbwwwbo/obwSSwbwSSbo/obwwwwbwwwbo/obwSSwbwSSbo/obwwwwbwwwbo/obbbbbbbbbbo/.oooooooooo./............/............',
  sunburst: '.o...oo...o./oyo.oyyo.oyo/.oyooyyooyo./..oyyyyyyo../.ooyYYYYyoo./oyyyYwwYyyyo/oyyyYwwYyyyo/.ooyYYYYyoo./..oyyyyyyo../.oyooyyooyo./oyo.oyyo.oyo/.o...oo...o.',
  torch: '....oo....../...oeeo...../..oeEEeo..../..oeEyEeo.../..oeEyEeo.../...oeeeo..../....okko..../....okKo..../....okKo..../....okKo..../....oKKo..../.....oo.....',
  dove: '........oo../.......owwo./...o..owwwo./..owoowwwwwo/..owwwwwwwyo/...owwwwwwo./....owwWwo../...ooowwo.../..ogggoo..../.ogogoogo.../..o.o..o..../............',
  link: '............/............/.oo......oo./obbo....orro/obbboooorrro/obbbbyyrrrro/obbbbyyrrrro/obbboooorrro/obbo....orro/.oo......oo./............/............',
  scissors: '.oo......oo./osso....osso/.osso..osso./..ossoosso../...osssso.../....osso..../...osssso.../..orroorro../.ororoororo./.orro..orro./..oo....oo../............',
  magnifier: '...oooo...../..oSSSSo..../.oSBBBBSo.../oSBBwwBBSo../oSBBwBBBSo../oSBBBBBBSo../.oSBBBBSo.../..oSSSSkko../...oooookko./........okko/.........oo./............',
  map: '............/.oooooooooo./okkkkkkkkkko/okEEEEEEEEko/okEgggEEbbko/okEgggEbbbko/okEEErEEEEko/okEEEEgggEko/okEEEEgggEko/okkkkkkkkkko/.oooooooooo./............',
  paw: '............/....oo.oo.../...okkokko../.oookkokkoo./okkooooookko/okkokkkkokko/.ookkkkkkoo./.okkkkkkkko./.okkkkkkkko./..okkkkkko../...oooooo.../............',
  broom: '.......oo.../......okko../.....okko.../....okko..../...okko...../..oyyyyo..../.oyyYyyyo.../oyyyYyyyo.../oyYyYyYyo.../oyyyyyyyo.../.ooooooo..../............',
  flag: '.o........../okoooooo..../okrrrrrro.../okrRrrrrro../okrrrrrro.../okrrrroo..../okoooo....../oko........./oko........./oko........./okko......../.oo.........',
  moon: '....ooo...../...oyyyo..../..oyyyyo..../.oyyyYo...../.oyyyYo...../.oyyyYo...../.oyyyYo...../.oyyyyyoo.../..oyyyyyyo../...oyyyyo.../....oooo..../............',
  moonfull: '....oooo..../...owwwwo.../..owwwwWwo../.owwWwwwwwo./.owwwwwWwwo./.owwWwwwwwo./.owwwwwwWwo./.owWwwwwwwo./..owwwwwWo../...owwwwo.../....oooo..../............',
  trophy: '............/.oooooooooo./oyyyyyyyyyyo/oyoyyyyyyoyo/oyoyyYyyyoyo/.oyyyYyyyyo./..oyyyyyyo../...ooyyoo.../...ooYYoo.../..oyyyyyyo../..oYYYYYYo../...oooooo...',
  tent: '.....oo...../....okko..../...okkkko.../..okkkkkko../.okkkKkkkko./okkkkKkkkkko/okkkkaakkkko/okkkaaaakkko/okkaaaaaakko/.oooooooooo./............/............',
  village: '............/...o...o..../..oro.oro.../.orrrorrro../orrrrrrrrro./owwwwwwwwwo./owkwwwbwwko./owkwwwbwwko./.ooooooooo../............/............/............',
  town: '.....o....../....oro.oo../...orrrosso./..orrrrrsso./..owwwwwsso./..owbwbwsso./..owwwwwsso./..owbwbwsso./..owkkwwsso./..owkkwwsso./...ooooooo../............',
  castle: '.o.o.oo.o.o./ososossososo/osssssssssso/osSsSSSSsSso/ossssSSsssso/ossssSSsssso/osSssSSssSso/ossssaasssso/ossssaasssso/ossssaasssso/.oooooooooo./............',
  house: '............/.....oo...../....orro..../...orrrro.../..orrrrrro../.orrrRrrrro./orrrRrrrrrro/.owwwwwwwwo./.owwkkwbbwo./.owwkkwbbwo./.owwkkwwwwo./..oooooooo..',
  wheat: '.....oo...../....oyyo..../...oyyyyo.../..oyyooyyo../..oyygyyo.../...oygyo..../..oyygyyo.../...oygyo..../....ogo...../....ogo...../...oggo...../....oo......',
  log: '............/............/..oooooooo../.okkkkkkkko./okKkEEEkKkko/okKEkkkEKkko/okKEkEkEKkko/okKEkkkEKkko/okKkEEEkKkko/.okkkkkkkko./..oooooooo../............',
  rock: '............/............/....oooo..../...oWWWWo.../..oWwwWWso../.oWwwWWssso./.oWwWWsssso./oWWWWsssSSso/oWsssssSSSSo/oSSSSSSSSSSo/.oooooooooo./............',
  coin: '............/....oooo..../...oyyyyo.../..oyYYYYyo../.oyYyyyyYyo./.oyYyYYyYyo./.oyYyYYyYyo./.oyYyyyyYyo./..oyYYYYyo../...oyyyyo.../....oooo..../............',
  flask: '....oo....../...owwo...../...owwo...../...owwo...../..owBBwo..../.owBBBBwo.../owBBggBBwo../owBgggggBwo./owBBBBBBBwo./.owwwwwwwo../..ooooooo.../............',
  hourglass: '.oooooooooo./owwwwwwwwwwo/.owyyyyyywo./..owyyyywo../...owyywo.../....owwo..../....oyyo..../...owyywo.../..owyyyywo../.owyyyyyywo./owwwwwwwwwwo/.oooooooooo.',
  heart: '............/..oo...oo.../.orro.orro../orrrrorrrro./orrrrrrrrro./orrrrrrrrro./.orrrrrrro../..orrrrro.../...orrro..../....oro...../.....o....../............',
  swords: '.o........o./owo......owo/oWwo....owWo/.oWwo..owWo./..oWwoowWo../...oWwwWo.../...owWWwo.../..okKooKko../.okKo..oKko./.oKo....oKo./..o......o../............',
  star: '.....oo...../....oyyo..../....oyyo..../.oooyyyyooo./oyyyyyyyyyyo/.oyyyyyyyyo./..oyyyyyyo../..oyyyyyyo../.oyyyooyyyo./.oyyo..oyyo./..oo....oo../............',
  angry: '............/..oooooooo../.orrrrrrrro./orrrrrrrrrro/orarrrrrraro/orraarrraaro/orrraarraaro/orrrrrrrrrro/orrraaaarrro/orrarrrrarro/.orrrrrrrro./..oooooooo..',
  wall: '............/.oooooooooo./osssssssssSo/osSsssSsssSo/oSSSSSSSSSSo/ossSssssSsso/ossSssssSsso/oSSSSSSSSSSo/osssSssssSso/osssSssssSso/oSSSSSSSSSSo/.oooooooooo.',
  bow: '..oo......../.okko......./..okko....../...okko...../...okowo..../...okoowo.../...okoowo.../...okowo..../...okko...../..okko....../.okko......./..oo........',
  leaf: '..........o./........oolo/......oolllo/....oollgggo/...ollggggo./..olgggGgo../.olggGggo.../ollgGggo..../okgGgoo...../okooo......./oko........./.o..........',
  tree: '....oooo..../...ollllo.../..olgggglo../.olggglgggo./.oggggggggo./.oggglggggo./..oggggggo../...ookkoo.../....okKo..../....okKo..../...okkKKo.../....oooo....',
  pickaxe: '..oooooo..../.osssssso.../osSSoosSso../oSoo..osSso./.o....okSso./.....okkoso./....okko.o../...okko...../..okko....../.okko......./okko......../.oo.........',
  hammer: '..ooooooo.../.ossssssso../.osWWWWWso../.ossssssso../..oookkoo.../....okKo..../....okKo..../....okKo..../....okKo..../....oKKo..../.....oo...../............',
  chest: '............/..oooooooo../.okkkkkkkko./okKkkkkkkKko/okkkkyykkkko/oYYYYyyYYYYo/okkkkYYkkkko/okKkkkkkkKko/okKkkkkkkKko/okkkkkkkkkko/.oooooooooo./............',
  axe: '...ooo....../..ossso...../.osWWsso..../osWWWskso.../osWWWskko.../.osWWskko.../..osskko..../...ookko..../...okko...../...okko...../..okKo....../...oo.......',
  blood: '.....oo...../....orro..../...orrrro.../...orrrro.../..orrRrrro../.orrRrrrrro./.orrrrrrrro./.orrrrrRrro./..orrrrrro../...orrrro.../....oooo..../............',
  crystal: '.....oo...../....occo..../...ocBBco.../..ocBBcBco../..ocBcBBco../.ocBBcBBBco./.ocBcBBcBco./..ocBBcBco../...ocCCco.../....oCCo..../.....oo...../............',
  hand: '....o.o...../...ototoo.../..ootototo../.ototototoo./.ototttttoto/.ottttttttto/.ottttttttto/..ottttttto./..ottttttto./...ottttto../...ottttto../....ooooo...',
  pencil: '........oo../.......oyyo./......oyyyo./.....oyYyo../....oyYyo.../...oyYyo..../..oyYyo...../.okYyo....../okkko......./okko......../.oo........./............',
  sun: '.....oo...../..o.oyyo.o../.oyooyyooyo./..oyyyyyyo../.ooyyyyyyoo./oyyyyyyyyyyo/oyyyyyyyyyyo/.ooyyyyyyoo./..oyyyyyyo../.oyooyyooyo./..o.oyyo.o../.....oo.....',
  warn: '.....oo...../....oyyo..../....oyyo..../...oyyyyo.../...oyaayoo../..oyyyaayyo./..oyyyaayyo./.oyyyyyyyyyo/.oyyyyaayyyo/oyyyyyyyyyyo/.oooooooooo./............',
  pause: '............/..ooo..ooo../.owwwoowwwo./.owwwoowwwo./.owwwoowwwo./.owwwoowwwo./.owwwoowwwo./.owwwoowwwo./.owwwoowwwo./.owwwoowwwo./..ooo..ooo../............',
  play: '............/..oo......../.owwoo....../.owwwwoo..../.owwwwwwoo../.owwwwwwwwo./.owwwwwwwwo./.owwwwwwoo../.owwwwoo..../.owwoo....../..oo......../............',
  drought: '...o....o.../..oeooooeo../...oeeeeo.../..oeeyyeeo../..oeyyyyeo../..oeeyyeeo../...oeeeeo.../.ooeooooeoo./okkkkkkkkkko/okKkkKkkKkko/.oooooooooo./............'
};

Object.assign(ICON_ART, { bag: '............/....oooo..../...okKKko.../..okkkkkko../.okkkkkkkko./.okEEEEEEko./.okEyyyyEko./.okEEEEEEko./.okkkkkkkko./.okKkkkkKko./..oooooooo../............' });
Object.assign(ICON_ART, { armor: '............/..oo....oo../.oWWo..oWWo./.oWsWooWsWo./..oWsWWsWo../..oWsWWsWo../..oWssssWo../..oWWWWWWo../...oWssWo.../...oooooo.../............/............' });
Object.assign(ICON_ART, { target: '...oooooo.../..orrrrrro../.orwwwwwwro./orrwoooowrro/orwwoyyowwro/orwwoyyowwro/orrwoooowrro/.orwwwwwwro./..orrrrrro.../...oooooo.../............/............', close: '............/.oo......oo./.orro..orro./..orroorro../...orrrro.../....orro..../....orro..../...orrrro.../..orroorro../.orro..orro./.oo......oo./............' });
Object.assign(ICON_ART, { shield: '.oooooooooo./.oWWWwwWWWo./.oWsswwsSWo./.oWsswwsSWo./.oWsswwsSWo./..oWsswsSo../..oWssssSo../...oWssSo.../....oSSo..../.....oo...../............/............' });
Object.assign(ICON_ART, {"bronze": "............/............/....oooo..../...oeeeeo.../...okkkko.../.oooooooooo./oeeeeooeeeeo/okkkkookkkko/oooooooooooo/............/............/............", "iron": "............/............/....oooo..../...osssso.../...oSSSSo.../.oooooooooo./ossssoosssso/oSSSSooSSSSo/oooooooooooo/............/............/............", "silver": "............/............/....oooo..../...owwwwo.../...oWWWWo.../.oooooooooo./owwwwoowwwwo/oWWWWooWWWWo/oooooooooooo/............/............/............"});
const ICON = {};                                           // name -> canvas (12x12 art icons, 16x16 creature portraits)
for (const n in ICON_ART) {
  const c = document.createElement('canvas'); c.width = 12; c.height = 12;
  const x = c.getContext('2d');
  ICON_ART[n].split('/').forEach((row, y) => { for (let i = 0; i < 12; i++) { const ch = row[i]; if (ch !== '.') { x.fillStyle = ICON_PAL[ch]; x.fillRect(i, y, 1, 1); } } });
  ICON[n] = c;
}
for (const r of RN) {                                       // creature portraits come straight from the sprites
  const sp = ATLAS[r].A, c = document.createElement('canvas'); c.width = 16; c.height = 16;
  c.getContext('2d').drawImage(sp, Math.floor((16 - sp.width) / 2), 16 - sp.height);
  ICON['cr:' + r] = c;
}
// emoji used as semantic tokens in strings -> icon name (werewolf uses a private symbol)
const EMOJI_ICON = {
  '🧑':'cr:human','🧝':'cr:elf','🧔':'cr:dwarf','👹':'cr:orc','🐑':'cr:sheep','🐺':'cr:wolf','🐇':'cr:rabbit','🦌':'cr:deer','\uE001':'cr:werewolf','👥':'cr:human',
  '⛰':'mountain','⬆':'raise','⬇':'lower','🌊':'waves','🌱':'grass','🌲':'pine','🏖':'dune','🌋':'volcano','🌧':'rain','🔥':'flame','⚡':'bolt','☄':'meteor','✨':'sparkle','💀':'skull','☠':'skullg',
  '📖':'book','🙏':'sunburst','🕊':'dove','🤝':'link','✂':'scissors','🔍':'magnifier','🗺':'map','🐾':'paw','🧹':'broom','🏆':'trophy','🚩':'flag','🌗':'moon','🌙':'moon','🌕':'moonfull',
  '🛖':'tent','🏘':'village','🏙':'town','🏰':'castle','🏠':'house','🏚':'house','🏯':'castle','🍞':'wheat','🌾':'wheat','🪵':'log','🪨':'rock','🪙':'coin','🔬':'flask','⏳':'hourglass','❤':'heart',
  '⚔':'swords','⭐':'star','😠':'angry','👑':'crown','🌍':'globe','🧱':'wall','🏹':'bow','🌿':'leaf','🌳':'tree','⛏':'pickaxe','🔨':'hammer','🏦':'chest','🪓':'axe','🩸':'blood','🔮':'crystal',
  '✋':'hand','✏':'pencil','📅':'sun','⚠':'warn','⏸':'pause','▶':'play','🥀':'drought',
};
Object.assign(EMOJI_ICON, { '🎒': 'bag', '🥋': 'armor', '🎯': 'target', '✖': 'close', '🛡': 'shield', '🥉': 'bronze', '🔩': 'iron', '🥈': 'silver' });
const EMO_RE = new RegExp('(' + Object.keys(EMOJI_ICON).join('|') + ')\\uFE0F?', 'gu');
const iconUrls = {};
const iconURL = n => iconUrls[n] || (iconUrls[n] = ICON[n].toDataURL());
const iconOf = ch => ICON[EMOJI_ICON[String(ch).replace(/\uFE0F/g, '')]];
function convertText(t) {                                   // swap emoji inside a text node for <img> icons
  const str = t.nodeValue; EMO_RE.lastIndex = 0;
  if (!t.parentNode || !EMO_RE.test(str)) return;
  EMO_RE.lastIndex = 0;
  const frag = document.createDocumentFragment(); let last = 0, m;
  while ((m = EMO_RE.exec(str))) {
    if (m.index > last) frag.appendChild(document.createTextNode(str.slice(last, m.index)));
    const name = EMOJI_ICON[m[1]], img = document.createElement('img');
    img.className = 'ic' + (name.startsWith('cr:') ? ' cr' : ''); img.src = iconURL(name); img.alt = ''; img.draggable = false;
    frag.appendChild(img); last = m.index + m[0].length;
  }
  if (last < str.length) frag.appendChild(document.createTextNode(str.slice(last)));
  t.parentNode.replaceChild(frag, t);
}
function convertTree(n) {
  if (n.nodeType === 3) { convertText(n); return; }
  if (n.nodeType !== 1) return;
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT), list = [];
  while (w.nextNode()) list.push(w.currentNode);
  list.forEach(convertText);
}
new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') convertTree(m.target); else m.addedNodes.forEach(convertTree); } })
  .observe(app, { childList: true, subtree: true, characterData: true });
function drawIcon(ch, x, y, size, alpha) {                 // an icon on the world canvas (centered at x, y)
  const ic = iconOf(ch); if (!ic) return;
  ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ic, x - size/2, y - size/2, size, size); ctx.restore();
}

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
  tiles[i] = t; compDirty = true;
  if (t <= T.SHALLOW || t === T.LAVA) { fire[i] = 0; bld[i] = 0; }
  else if (t === T.MOUNTAIN || t === T.SNOW) bld[i] = 0;
  dirty = true;
}
function ignite(i) {
  if (fire[i]) return;
  if (bld[i]) { const kk = kingdoms.get(kid[i]); if (kk && kk.mod.fire) return; }       // fire-ward tech: houses never catch fire
  const t = tiles[i];
  if (bld[i]) fire[i] = 14; else if (t === T.FOREST) fire[i] = 16; else if (t === T.GRASS) fire[i] = 7;
}
function fx(kind, x, y, extra) { effects.push(Object.assign({ k:kind, x, y, t:0 }, extra || {})); }

/* ============================== CREATURES ============================== */
/* ============================== PERSONA: traits, equipment, history ============================== */
const TRAITS = ['Pemberani', 'Tangguh', 'Gesit', 'Berumur panjang', 'Rapuh', 'Berbakat'];        // bit 1,2,4,8,16,32
const W_ATK = [0, .08, .2, .4], A_DEF = [0, .06, .18, .35], S_DEF = [0, .05, .1, .18], A_HP = [0, 2, 5, 9];
function rollTraits() {
  let m = 0; const r = Math.random(), n = r < .15 ? 0 : r < .8 ? 1 : 2;
  for (let i = 0; i < n; i++) { const b = 1 << ri(0, 5); if (b === 2 && (m & 16)) continue; if (b === 16 && (m & 2)) continue; m |= b; }
  return m;
}
function applyStats(c) {                                       // max hp from race, traits, armour, leadership and knighthood; keeps the current hp ratio
  const R = RACES[c.t]; if (R.engine) return;
  let m = R.hp; if (c.tr & 2) m *= 1.25; if (c.tr & 16) m *= .8;
  m += A_HP[c.eq ? c.eq[1] : 0]; if (c.ec && c.ec[2] === 9 && c.eq[2]) m *= 1.2; if (c.lead) m *= 1.5; if (c.elite) m *= 1.5;
  m = Math.round(m); const r = c.mhp > 0 ? Math.max(0, c.hp) / c.mhp : 1;
  c.mhp = m; if (c.hp > 0) c.hp = Math.max(1, m * r);
}
const atkMul = c => { let m = 1; if (c.tr & 1) m *= 1.15; const w = c.eq ? c.eq[0] : 0; if (w) m *= 1 + W_ATK[w] * (c.tr & 32 ? 1.25 : 1); if (c.elite) m *= 1.25; return m; };
const defMul = c => { let m = 1; if (c.eq) m *= (1 + A_DEF[c.eq[1]]) * (1 + S_DEF[c.eq[2]]); if (c.elite) m *= 1.2; return m; };
function addHist(c, code, arg) {                               // life events of settlers (kept: the last 10)
  if (!RACES[c.t].civ) return;
  (c.hist || (c.hist = [])).push([tick, code, arg === undefined ? 0 : arg]); if (c.hist.length > 10) c.hist.shift();
}
const GEAR_COST = [ [{ wood: 2 }, { wood: 2 }, { wood: 3 }], [{ bronze: 2 }, { bronze: 3 }, { bronze: 2, wood: 2 }], [{ iron: 2 }, { iron: 4 }, { iron: 3 }] ];
const afford = (k, c) => ['wood', 'stone', 'bronze', 'iron', 'silver'].every(x => !c[x] || (k[x] || 0) >= c[x]);
const ENCH = [null,
  { n: 'Berapi', c: '#ff7a2a', d: '20% menyulut api' }, { n: 'Beracun', c: '#7ae04a', d: 'racun terus melukai' }, { n: 'Penghisap darah', c: '#ff3a5a', d: 'menyerap 25% kerusakan' }, { n: 'Penyambar', c: '#6af0ff', d: '15% petir ke musuh lain' },
  { n: 'Berduri', c: '#c8a070', d: 'memantulkan 25% serangan jarak dekat' }, { n: 'Pemulih', c: '#6aff9a', d: 'memulihkan hp perlahan' }, { n: 'Kebal api', c: '#ffb040', d: 'kebal api' },
  { n: 'Penangkis', c: '#6aa8ff', d: '20% menangkis serangan' }, { n: 'Pelindung', c: '#ffe27a', d: '+20% hp' }];
const ENCH_BY_SLOT = [[1, 2, 3, 4], [5, 6, 7], [8, 9]];
const rollEnchant = sl => ENCH_BY_SLOT[sl][ri(0, ENCH_BY_SLOT[sl].length - 1)];
const betterItem = (t, e, ct, ce) => t > ct || (t === ct && e && !ce);
const chestCap = k => 6 + 4 * k.level;
function equipTick() {                                         // every ~10 s: kingdoms arm leaders, knights and soldiers from the royal chest first, then by crafting the best gear their age allows
  const bud = {};
  const order = [creatures.filter(c => c.hp > 0 && c.k && (c.lead || c.elite)), creatures.filter(c => c.hp > 0 && c.k && !c.lead && !c.elite && RACES[c.t].civ && !RACES[c.t].engine && isSoldier(c))];
  for (const list of order) for (const c of list) {
    const k = kingdoms.get(c.k); if (!k) continue;
    if (bud[k.id] === undefined) bud[k.id] = 8; if (bud[k.id] <= 0) continue;
    const tier = Math.min(3, (k.age | 0) + 1), e = c.eq || (c.eq = [0, 0, 0]), en = c.ec || (c.ec = [0, 0, 0]);
    for (let sl = 0; sl < 3 && bud[k.id] > 0; sl++) {
      let bi = -1, bs = -1;
      k.chest.forEach((it, j) => { if (it[0] === sl && betterItem(it[1], it[3] | 0, e[sl], en[sl])) { const v = it[1] * 10 + (it[3] ? 5 : 0); if (v > bs) { bs = v; bi = j; } } });
      if (bi >= 0) {                                           // an upgrade is waiting in the chest
        const it = k.chest[bi], oT = e[sl], oE = en[sl]; e[sl] = it[1]; en[sl] = it[3] | 0;
        if (oT) k.chest[bi] = [sl, oT, c.t, oE]; else k.chest.splice(bi, 1);
        bud[k.id]--; if (sl < 2) addHist(c, 8 + sl, e[sl]); if (sl === 1) applyStats(c); continue;
      }
      if (e[sl] >= tier) continue;
      const cost = GEAR_COST[tier - 1][sl]; if (!afford(k, cost)) continue;
      for (const x in cost) k[x] -= cost[x];
      if (e[sl] && k.chest.length < chestCap(k)) k.chest.push([sl, e[sl], c.t, en[sl]]);       // the old piece is stored
      e[sl] = tier; en[sl] = tier >= 2 && k.level >= 2 && Math.random() < .04 ? rollEnchant(sl) : 0; bud[k.id]--;
      if (sl === 0) addHist(c, 8, tier); else if (sl === 1) addHist(c, 9, tier);
      if (sl === 1) applyStats(c);
    }
  }
}
const GEAR_NAME = {
  human: [['Tombak batu', 'Pedang perunggu', 'Pedang besi'], ['Zirah kulit', 'Zirah perunggu', 'Zirah besi'], ['Perisai kayu', 'Perisai perunggu', 'Perisai besi']],
  elf: [['Busur kayu', 'Busur komposit', 'Busur panjang'], ['Jubah daun', 'Zirah sisik', 'Zirah rantai'], ['Perisai kulit kayu', 'Perisai perunggu', 'Perisai perak besi']],
  dwarf: [['Palu batu', 'Kapak perunggu', 'Kapak perang besi'], ['Zirah kulit', 'Zirah perunggu', 'Zirah baja'], ['Perisai kayu', 'Perisai perunggu', 'Perisai menara besi']],
  orc: [['Gada kayu', 'Kapak perunggu', 'Golok besi'], ['Pelindung kulit', 'Zirah perunggu', 'Zirah besi kasar'], ['Perisai kulit', 'Perisai perunggu', 'Perisai besi']],
  werewolf: [['Cakar tulang', 'Cakar perunggu', 'Cakar baja'], ['Jubah bulu', 'Zirah perunggu', 'Zirah besi'], ['Perisai tulang', 'Perisai perunggu', 'Perisai besi']],
};
const GEAR_KIND = { human: ['spear', 'sword', 'sword'], elf: ['bow', 'bow', 'bow'], dwarf: ['axe', 'axe', 'axe'], orc: ['club', 'axe', 'axe'], werewolf: ['claw', 'claw', 'claw'] };
const GEAR_ICON = ['⚔️', '🥋', '🛡'], HIST_TXT = { 2: 'Membunuh musuh pertamanya', 3: '5 kemenangan', 4: '10 kemenangan', 5: 'Pahlawan: 25 kemenangan', 6: 'Dinobatkan menjadi pemimpin', 7: 'Diangkat menjadi ksatria besi', 11: 'Nyaris tewas dan selamat' };
const TIER_COL = [null, ['#8a5a34', '#c8a070'], ['#c8803a', '#f0b868'], ['#aab2be', '#e8eef6']];
const drops = [], dropMap = new Map();                         // gear lying on the ground: { x, y, s: slot, t: tier, r: origin race, e: enchant, b: tick dropped }
function addDrop(x, y, sl, tier, race, ench) {
  let best = null;
  for (let r = 0; r <= 2 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) {
    const tx = x + dx, ty = y + dy; if (!inb(tx, ty) || dropMap.has(tx + ty*W) || tiles[tx + ty*W] <= T.SHALLOW || tiles[tx + ty*W] === T.LAVA) continue;
    best = [tx, ty]; break;
  }
  if (!best) return false;
  if (drops.length >= 120) { const o = drops.shift(); dropMap.delete(o.x + o.y*W); }
  const d = { x: best[0], y: best[1], s: sl, t: tier, r: race, e: ench | 0, b: tick }; drops.push(d); dropMap.set(d.x + d.y*W, d); dirty = true; return true;
}
function removeDrop(d) { const i = drops.indexOf(d); if (i >= 0) drops.splice(i, 1); dropMap.delete(d.x + d.y*W); dirty = true; }
function lootFrom(c, v) {                                       // a victor takes the better pieces of the fallen; the rest is left for the reaper to drop
  if (!RACES[c.t].civ || RACES[c.t].engine || !v.eq) return;
  const e = c.eq || (c.eq = [0, 0, 0]), en = c.ec || (c.ec = [0, 0, 0]), ve = v.ec || [0, 0, 0];
  for (let sl = 0; sl < 3; sl++) if (betterItem(v.eq[sl], ve[sl], e[sl], en[sl])) {
    const old = e[sl], oE = en[sl], t = v.eq[sl]; e[sl] = t; en[sl] = ve[sl]; v.eq[sl] = 0; ve[sl] = 0;
    if (old) addDrop(c.x, c.y, sl, old, c.t, oE);
    addHist(c, 16, sl * 4 + t); if (sl === 1) applyStats(c);
  }
}
function pickupAt(c) {                                          // soldiers wear what beats their gear; other settlers carry finds to their royal chest
  const d = dropMap.get(c.x + c.y*W); if (!d) return;
  const k = c.k ? kingdoms.get(c.k) : null, soldier = c.lead || c.elite || isSoldier(c);
  if (!soldier && k && k.chest.length < chestCap(k)) { removeDrop(d); k.chest.push([d.s, d.t, d.r, d.e]); return; }
  const e = c.eq || (c.eq = [0, 0, 0]), en = c.ec || (c.ec = [0, 0, 0]); if (!betterItem(d.t, d.e, e[d.s], en[d.s])) return;
  const old = e[d.s], oE = en[d.s]; removeDrop(d); e[d.s] = d.t; en[d.s] = d.e;
  if (old) addDrop(c.x, c.y, d.s, old, c.t, oE);
  addHist(c, 17, d.s * 4 + d.t); if (d.s === 1) applyStats(c);
}
function seekDrop(c, any) {                                     // idle soldiers walk to gear that would improve them, other settlers to anything their chest can hold
  let best = null, bd = any ? 36 : 49; const e = c.eq || [0, 0, 0], en = c.ec || [0, 0, 0];
  for (const d of drops) { if (!any && !betterItem(d.t, d.e, e[d.s], en[d.s])) continue; const dd = (d.x - c.x) ** 2 + (d.y - c.y) ** 2; if (dd < bd) { bd = dd; best = d; } }
  return best ? moveToward(c, best.x, best.y) : false;
}
const inv = [];                                                // universal bag: [slot, tier, origin race, enchant] - any race can wear any item
const INV_MAX = 12;
function inheritTraits(a, b) {                                  // each trait passes on with 50% (85% if both parents have it), plus a 12% chance of a new one
  let m = 0;
  for (let i = 0; i < 6; i++) { const bit = 1 << i, ha = a & bit, hb = b & bit, p = ha && hb ? .85 : (ha || hb) ? .5 : 0; if (Math.random() < p) m |= bit; }
  if (Math.random() < .12) m |= 1 << ri(0, 5);
  if ((m & 2) && (m & 16)) m &= ~16;
  return m;
}
function setFamily(c, x, y) {                                   // a newborn at a house gets two adult parents of its kingdom living nearby
  const R = RACES[c.t], gx = x >> 3, gy = y >> 3, pool = [];
  for (let yy = Math.max(0, gy - 1); yy <= Math.min(GH - 1, gy + 1); yy++) for (let xx = Math.max(0, gx - 1); xx <= Math.min(GW - 1, gx + 1); xx++)
    for (const o of cells[yy*GW + xx]) if (o !== c && o.hp > 0 && o.t === c.t && o.k === c.k && o.age > o.life * .12 && o.nid !== undefined) pool.push(o);
  if (!pool.length) return;
  const A = pool[ri(0, pool.length - 1)];
  let B = A.sp ? pool.find(o => o.nid === A.sp) : null;
  if (!B) B = pool.find(o => o !== A && !o.sp && !A.sp) || pool.find(o => o !== A) || null;
  c.pa = A.nid; c.pb = B ? B.nid : 0;
  c.tr = inheritTraits(A.tr | 0, B ? B.tr | 0 : A.tr | 0);
  c.life = Math.round(ri(R.life[0], R.life[1]) * (c.tr & 8 ? 1.3 : 1)); applyStats(c); c.hp = c.mhp;
  A.ch = (A.ch | 0) + 1; if (B) B.ch = (B.ch | 0) + 1;
  if (B && !A.sp && !B.sp) { A.sp = B.nid; B.sp = A.nid; addHist(A, 14, B.nid); addHist(B, 14, A.nid); }
  for (const P of B ? [A, B] : [A]) if (P.ch === 1 || P.ch === 3 || P.ch === 6) addHist(P, 15, c.nid);
}
function spawn(type, x, y, force) {
  if (!force && (creatures.length >= MAX_CREATURES * CAPK || (counts[type]||0) >= capOf(type) + 40)) return null;
  if (!inb(x, y) || !walkable(type, tiles[x + y*W])) return null;
  const R = RACES[type];
  const c = { id:nextId++, t:type, x, y, dx:x, dy:y, hp:R.hp, mhp:R.hp, age:0, life:ri(R.life[0], R.life[1]), en:rnd(55,100), dir:ri(0,8), tgt:null, kills:0, face:1, atk:0, cause:'', fail:0, gate:-1, gateUntil:0, avoid:0, avoidUntil:0, k:0, lead:0 };
  if (!R.engine) { c.nid = c.id; c.tr = rollTraits(); c.eq = [0, 0, 0]; c.ec = [0, 0, 0]; c.hist = []; if (c.tr & 8) c.life = Math.round(c.life * 1.3); applyStats(c); c.hp = c.mhp; }
  creatures.push(c); counts[type] = (counts[type]||0) + 1; dirty = true;
  return c;
}
function spawnNear(type, x, y) {
  for (let k = 0; k < 8; k++) { const c = spawn(type, x + ri(-1,1), y + ri(-1,1)); if (c) return c; }
  return null;
}
const DIRS = [[0,0],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];

function wallBlocks(c, i) {                                  // enemy walls stop soldiers and civilians of kingdoms at war with the owner; gates stay open
  const o = wallK[i]; if (!o || wallG[i] || !c.k || c.k === o) return false;
  const ko = kingdoms.get(o); return !!ko && ko.enemies.has(c.k);
}
function tryMove(c, nx, ny) {
  if (inb(nx, ny) && walkable(c.t, tiles[nx + ny*W]) && !wallBlocks(c, nx + ny*W)) { if (nx !== c.x) c.face = nx > c.x ? 1 : -1; c.x = nx; c.y = ny; return true; }
  return false;
}
const SIEGE_P = { orc: .7, dwarf: .4, werewolf: .3, human: .15, elf: .08 };      // chance a blocked soldier hits the wall instead of walking to the gate
const SIEGE_MULT = { ram: 4, catapult: 3, dcatapult: 3.4, orc: 2.5, dwarf: 1.6, werewolf: 1.2, human: 1, elf: .7 };
const WALL_HP = 60, TOWER_HP = 120;
function hitWall(c, i) {                                    // attackers chip at a wall segment; damage accumulates until it breaks
  const owner = kingdoms.get(wallK[i]); if (!owner) return;
  const ka = c.k ? kingdoms.get(c.k) : null;
  const dmg = RACES[c.t].dmg * (SIEGE_MULT[c.t] || 1) * (.6 + Math.random() * .8) * (ka ? ka.mod.atk : 1) / owner.mod.def;
  const wd = owner.wd || (owner.wd = new Map()), d = (wd.get(i) || 0) + dmg;
  c.atk = 10; c.face = (i % W) > c.x ? 1 : (i % W) < c.x ? -1 : c.face;
  fx('hit', i % W, (i / W) | 0);
  if (d >= (wallT[i] ? TOWER_HP : WALL_HP) * (1 + .35 * (owner.age | 0))) {
    wd.set(i, 1e4); (owner.broken || (owner.broken = new Set())).add(i); wallK[i] = 0; wallT[i] = 0; warStats.breached++;
    for (let n = 0; n < 3; n++) fx('puff', (i % W) + ri(-1, 1), ((i / W) | 0) + ri(-1, 1));
    haptic('thud');
  } else wd.set(i, d);
}
function moveToward(c, tx, ty) {                            // greedy step toward (tx, ty); if an enemy wall is in the way, detour through its nearest gate
  if (c.gate >= 0 && c.gateUntil > tick) {
    const gx = c.gate % W, gy = (c.gate / W) | 0;
    if (c.x === gx && c.y === gy) c.gate = -1; else { tx = gx; ty = gy; }
  }
  const sx = Math.sign(tx - c.x), sy = Math.sign(ty - c.y);
  if (tryMove(c, c.x + sx, c.y + sy) || tryMove(c, c.x + sx, c.y) || tryMove(c, c.x, c.y + sy)) return true;
  {
    for (const [ax, ay] of [[sx, sy], [sx, 0], [0, sy]]) {
      if (!ax && !ay) continue;
      const i = c.x + ax + (c.y + ay)*W; if (!inb(c.x + ax, c.y + ay) || !wallBlocks(c, i)) continue;
      if (Math.random() < (SIEGE_P[c.t] || 0)) { hitWall(c, i); return true; }
      if (!(c.gate < 0 || c.gateUntil <= tick)) break;
      const gl = wallGates.get(wallK[i]); if (!gl || !gl.length) break;
      let best = -1, bd = 1e9;
      for (const g of gl) { const d = (g % W - c.x)**2 + ((g / W | 0) - c.y)**2; if (d < bd) { bd = d; best = g; } }
      c.gate = best; c.gateUntil = tick + 200;
      const gx = best % W, gy = (best / W) | 0, ux = Math.sign(gx - c.x), uy = Math.sign(gy - c.y);
      return tryMove(c, c.x + ux, c.y + uy) || tryMove(c, c.x + ux, c.y) || tryMove(c, c.x, c.y + uy);
    }
  }
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
  if (R.civ) {                                          // settlers fight their kingdom's enemies, and wolves that come close
    const ka = c.k ? kingdoms.get(c.k) : null;
    const e = ka && ka.enemies.size ? findEnemy(c, ka, (c.lead || isSoldier(c)) ? 12 : 8) : null;
    return e || (R.foes.includes('wolf') ? findNearest(c, ['wolf'], 2) : null);
  }
  if (!foes.length) return null;
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
  if (R.cart) { stepCart(c); return; }
  if (R.engine) { stepEngine(c); return; }
  c.age++;
  if (c.age > c.life) { c.hp = 0; c.cause = 'old'; return; }
  if (!walkable(c.t, tiles[idx])) { c.hp = 0; fx('splash', c.x, c.y); return; }
  if (fire[idx] && !(c.ec && c.ec[1] === 7 && c.eq && c.eq[1])) { c.hp -= 9; if (c.hp <= 0) return; }
  if (c.pz > 0) { c.pz--; c.hp -= .35; if (c.hp <= 0) return; }
  if (c.ec && c.ec[1] === 6 && c.eq[1] && c.hp < c.mhp && (tick + c.id) % 4 === 0) c.hp = Math.min(c.mhp, c.hp + .6);
  if (c.k && c.hp < c.mhp && (tick + c.id) % 4 === 0) { const kk = kingdoms.get(c.k); if (kk && kk.mod.regen) c.hp = Math.min(c.mhp, c.hp + kk.mod.regen * 4); }
  if (R.hunt) { c.en -= 0.12; if (c.en <= 0) { c.hp = 0; return; } }
  if (c.k !== c.lk) { c.lk = c.k; const kj = c.k ? kingdoms.get(c.k) : null; if (kj) { if (c.nj) c.nj = 0; else addHist(c, 10, kj.name); } }
  if ((tick + c.id) % ((c.tr & 4) ? Math.max(1, R.mv - 1) : R.mv) !== 0) return;
  if (drops.length && R.civ) pickupAt(c);

  let tg = c.tgt;
  if (tg && (tg.hp <= 0 || Math.max(Math.abs(tg.x-c.x), Math.abs(tg.y-c.y)) > (R.hunt ? 24 : 13))) tg = c.tgt = null;
  if (!tg && (tick + c.id) % 3 === 0) tg = c.tgt = findTarget(c);
  if (tg) {
    const d = Math.max(Math.abs(tg.x-c.x), Math.abs(tg.y-c.y));
    const ka = c.k ? kingdoms.get(c.k) : null, kd = tg.k ? kingdoms.get(tg.k) : null, rng = ka ? ka.mod.range : 1;
    if (d <= rng && R.dmg > 0) {
      c.atk = 10; c.face = tg.x > c.x ? 1 : tg.x < c.x ? -1 : c.face;
      const night = nightNow > .5;
      const am = (ka ? ka.mod.atk * (night && ka.mod.night ? ka.mod.night : 1) : 1) * atkMul(c);      // tech + night-strength bonuses, traits and weapons
      const dm = (kd ? kd.mod.def * (night && kd.mod.night ? kd.mod.night : 1) : 1) * defMul(tg);
      let hit = R.dmg * (.5 + Math.random()) * am / dm;
      if (tg.ec && tg.eq && tg.eq[2] && tg.ec[2] === 8 && Math.random() < .2) { hit = 0; fx('puff', tg.x, tg.y); }            // shield of warding turns the blow
      tg.hp -= hit;
      const we = c.ec && c.eq && c.eq[0] ? c.ec[0] : 0;
      if (we && hit > 0) {                                                                                                        // weapon enchantments
        if (we === 1 && Math.random() < .2) ignite(tg.x + tg.y*W);
        else if (we === 2) tg.pz = Math.max(tg.pz | 0, 40);
        else if (we === 3) c.hp = Math.min(c.mhp, c.hp + hit * .25);
        else if (we === 4 && Math.random() < .15 && ka) { const o = findEnemy({ x: tg.x, y: tg.y }, ka, 3); if (o && o !== tg) { o.hp -= hit * .6; fx('bolt', o.x, o.y, { seed: tick & 255 }); } }
      }
      if (tg.ec && tg.eq && tg.eq[1] && tg.ec[1] === 5 && d <= 1 && hit > 0) c.hp -= hit * .25;                                   // thorns
      if (tg.hp > 0 && tg.hp < tg.mhp * .2 && !tg.hw) { tg.hw = 1; addHist(tg, 11); }
      if (d > 1) fx('arrow', c.x, c.y, { tx: tg.x, ty: tg.y }); else fx('hit', tg.x, tg.y);
      if (tg.hp <= 0) {
        if (tg.eq) lootFrom(c, tg);
        c.kills++; if (c.kills === 1) addHist(c, 2); else if (c.kills === 5) addHist(c, 3); else if (c.kills === 10) addHist(c, 4); else if (c.kills === 25) addHist(c, 5);
        if (R.hunt) c.en = Math.min(100, c.en + (GAIN[tg.t] || 45)); c.tgt = null;
        if (ka) {
          if (ka.mod.loot) { ka.gold += 10; ka.food += 8; }                              // raiders loot their victims
          if (ka.mod.steal) c.hp = Math.min(c.mhp, c.hp + c.mhp * ka.mod.steal);          // blood totem heals the killer
        }
      }
      return;
    }
    if (moveToward(c, tg.x, tg.y)) { c.fail = 0; return; }
    if (++c.fail > 3) { c.avoid = tg.id; c.avoidUntil = tick + 240; c.tgt = null; c.fail = 0; }   // can't reach it: give up for a while
  }
  if ((tick + c.id) % 2 === 0) {
    if (R.flee && fleeFrom(c, ['wolf'], 6)) return;                       // rabbits and deer run from wolves
    if (R.hunt && c.en > 40 && fleeFrom(c, CIVS, 5)) return;              // fed wolves keep away from settlements
  }
  if (R.civ) {
    const ka = c.k ? kingdoms.get(c.k) : null;
    if (ka && ka.enemies.size) {
      if (Math.random() < .3) {                                           // enemy houses next to us are captured (orcs raze and loot them)
        for (let k = 1; k < 9; k++) {
          const nx = c.x + DIRS[k][0], ny = c.y + DIRS[k][1];
          if (!inb(nx, ny)) continue;
          const j = nx + ny*W;
          if (!bld[j]) continue;
          const ke = kingdoms.get(kid[j]);
          if (!ke || !ka.enemies.has(ke.id) || Math.random() > .4) continue;
          fx('hit', nx, ny); dirty = true;
          if (c.t === 'orc') { bld[j] = 0; kid[j] = 0; warStats.razed++; ka.wood += 4; ka.stone += 2; if (ka.mod.loot) { ka.wood += 6; ka.stone += 3; } }
          else { bld[j] = R.bi; kid[j] = ka.id; warStats.captured++; ka.gold += 3; ka.wood += 2; }
          break;
        }
      }
      if (ka.wd && ka.wd.size && !c.lead && !isSoldier(c) && c.id % 3 === 0 && (tick + c.id) % 2 === 0 && repairStep(c, ka)) return;     // civilians mend damaged walls
      if ((c.lead || isSoldier(c)) && ka.front >= 0) {                    // soldiers march on the enemy
        const fx0 = ka.front % W, fy0 = (ka.front / W) | 0;
        if (Math.max(Math.abs(fx0 - c.x), Math.abs(fy0 - c.y)) > 2) {
          if (moveToward(c, fx0, fy0)) return;
        }
      }
    }
    if (drops.length && (c.lead || c.elite || isSoldier(c)) && !c.tgt && (tick + c.id) % 6 === 0 && seekDrop(c)) return;
    if (drops.length && ka && ka.chest.length < chestCap(ka) && !(c.lead || c.elite || isSoldier(c)) && !c.tgt && (tick + c.id) % 12 === 0 && seekDrop(c, true)) return;
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
    if (RACES[c.t].cart && c.trade && !c.trade.done) refundTrade(c);
    if (c.eq && RACES[c.t].civ) for (let sl = 0; sl < 3; sl++) if (c.eq[sl] && Math.random() < .7) addDrop(c.x, c.y, sl, c.eq[sl], c.t, c.ec ? c.ec[sl] : 0);
    if (effects.length < 400) fx('death', c.x, c.y, { type: c.t, face: c.face, old: c.cause === 'old' });
  }
  if (any) creatures = creatures.filter(c => c.hp > 0);
  counts = {}; for (const c of creatures) counts[c.t] = (counts[c.t]||0) + 1;
}
// Forced evolution: when wolves hang on by a thread (2-3 left) they all become werewolves.
let lastEvolve = -1e9, evolutions = 0, nightNow = 0;
function evolveWolves() {
  const R = RACES.werewolf;
  for (const c of creatures) if (c.t === 'wolf') {
    c.t = 'werewolf'; c.hp = c.mhp = R.hp; c.age = 0; c.life = ri(R.life[0], R.life[1]); applyStats(c); c.hp = c.mhp;
    c.tgt = null; c.atk = 0; c.fail = 0; c.en = 100;
    fx('evolve', c.x, c.y);
  }
  lastEvolve = tick; evolutions++; dirty = true;
  counts = {}; for (const c of creatures) counts[c.t] = (counts[c.t]||0) + 1;
  toast(EMOJI.werewolf + ' Serigala berevolusi!'); haptic('success');
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
/* ---- events, unrest, rebellion ---- */
const EV_IC = { plague:'☠️', drought:'🥀', golden:'✨' }, EV_NAME = { plague:'Wabah', drought:'Kekeringan', golden:'Zaman keemasan' };
const EV_DUR = { plague: 900, drought: 1200, golden: 1200 }, EV_ID = ['', 'plague', 'drought', 'golden'];
let lastEvToast = -1e9;
const evBirth = k => !k.ev ? 1 : k.ev.type === 'plague' ? .3 : k.ev.type === 'golden' ? 1.3 : 1;
const evFood = k => !k.ev ? 1 : k.ev.type === 'drought' ? .4 : k.ev.type === 'golden' ? 1.25 : 1;
function startEvent(k, type, quiet) {
  k.ev = { type, left: EV_DUR[type] }; warStats['ev_' + type] = (warStats['ev_' + type] || 0) + 1;
  fx('tech', Math.round(k.cx), Math.round(k.cy), { ic: EV_IC[type] });
  if (!quiet && k.level >= 1 && tick - lastEvToast >= 24) { lastEvToast = tick; toast(`${EV_IC[type]} ${EV_NAME[type]} · ${EMOJI[k.race]}${k.name}`); }
  dirty = true;
}
function killOneMember(k) {                                 // plague / famine victim, picked at random
  const n = creatures.length, off = (Math.random() * n) | 0;
  for (let j = 0; j < n; j++) { const c = creatures[(off + j) % n]; if (c.k === k.id && c.hp > 0) { c.hp = 0; c.cause = 'old'; return true; } }
  return false;
}
function repairWalls() {                                   // kingdoms at peace mend their walls (breaches cost wood)
  for (const k of kingdoms.values()) {
    if (k.enemies.size || !k.wd) continue;
    for (const [i, d] of [...k.wd]) {
      if (d >= 1e4) { if (k.wood >= 3) { k.wood -= 3; k.wd.delete(i); if (k.broken) k.broken.delete(i); } }
      else if (d - 25 <= 0) k.wd.delete(i); else k.wd.set(i, d - 25);
    }
  }
}
function engineTarget(c, ka) {                              // nearest intact non-gate wall segment of an enemy
  let best = -1, bd = 1e9;
  for (const eid of ka.enemies) {
    const e = kingdoms.get(eid); if (!e) continue; const R = ringR(e); if (!R) continue;
    for (const p of kingdomRing(e, R)) {
      const i = p.x + p.y*W; if (p.t === 'gate' || wallK[i] !== e.id) continue;
      const d = Math.max(Math.abs(p.x - c.x), Math.abs(p.y - c.y)); if (d < bd) { bd = d; best = i; }
    }
  }
  return best;
}
function stepEngine(c) {                                    // rams hug the wall, catapults lob rocks from up to 7 tiles; both vanish when the war ends
  const R = RACES[c.t], ka = kingdoms.get(c.k);
  c.age++;
  if (c.age > c.life || !ka || !ka.enemies.size) { c.hp = 0; c.cause = 'old'; return; }
  if ((tick + c.id) % R.mv !== 0) return;
  if (c.cd > 0) c.cd--;
  if (!(c.tt >= 0) || !wallK[c.tt] || (tick + c.id) % 48 === 0) c.tt = engineTarget(c, ka);
  const range = c.t === 'ram' ? 1 : 7;
  const step = (tx, ty) => {
    const sx = Math.sign(tx - c.x), sy = Math.sign(ty - c.y);
    if (tryMove(c, c.x + sx, c.y + sy) || tryMove(c, c.x + sx, c.y) || tryMove(c, c.x, c.y + sy)) { c.fail = 0; return; }
    if (++c.fail > 2) { const d = DIRS[ri(1, 8)]; tryMove(c, c.x + d[0], c.y + d[1]); c.fail = 0; }
  };
  if (c.tt >= 0) {
    const tx = c.tt % W, ty = (c.tt / W) | 0;
    if (Math.max(Math.abs(tx - c.x), Math.abs(ty - c.y)) <= range) {
      if (!(c.cd > 0)) { c.cd = c.t === 'ram' ? 3 : 5; if (range > 1) fx('rock', c.x, c.y, { tx, ty }); hitWall(c, c.tt); }
      return;
    }
    step(tx, ty); return;
  }
  if (c.t !== 'ram') {                                       // no wall left: bombard enemy soldiers
    const e = findEnemy(c, ka, 8);
    if (e) {
      if (!(c.cd > 0)) {
        c.cd = 4; c.atk = 8; c.face = e.x > c.x ? 1 : -1; fx('rock', c.x, c.y, { tx: e.x, ty: e.y }); fx('boom', e.x, e.y, { r: 2 });
        for (const o of creatures) if (o.hp > 0 && o.k && ka.enemies.has(o.k) && Math.abs(o.x - e.x) <= 1 && Math.abs(o.y - e.y) <= 1) o.hp -= 10 * ka.mod.atk;
      }
      return;
    }
  }
  if (ka.front >= 0) { const fx0 = ka.front % W, fy0 = (ka.front / W) | 0; if (Math.max(Math.abs(fx0 - c.x), Math.abs(fy0 - c.y)) > 3) step(fx0, fy0); }
}
function siegeTick() {                                      // kingdoms at war with a walled enemy build engines (orc ram, dwarf/human catapult)
  const eng = {}; for (const c of creatures) if (c.hp > 0 && RACES[c.t].engine && !RACES[c.t].cart) eng[c.k] = (eng[c.k] || 0) + 1;
  for (const k of kingdoms.values()) {
    const type = k.race === 'orc' ? 'ram' : k.race === 'dwarf' ? 'dcatapult' : k.race === 'human' && k.level >= 2 ? 'catapult' : null;
    if (!type || !k.enemies.size || tick < (k.engCd || 0) || (eng[k.id] || 0) >= (k.level >= 3 ? 3 : 2) || k.pop < 12) continue;
    let walled = false; for (const eid of k.enemies) { const e = kingdoms.get(eid); if (e && ringR(e)) walled = true; }
    const wood = type === 'ram' ? 25 : 20, stone = type === 'ram' ? 0 : 15;
    if (!walled || k.wood < wood || k.stone < stone) continue;
    const c = spawnNear(type, k.cap % W, (k.cap / W) | 0);
    if (c) { c.k = k.id; k.wood -= wood; k.stone -= stone; k.engCd = tick + 1200; fx('puff', c.x, c.y); warStats.engines = (warStats.engines || 0) + 1; }
  }
}
function repairStep(c, k) {                                // a civilian walks to the nearest damaged wall segment and mends it (broken ones cost wood)
  let best = -1, bd = 15;
  for (const i of k.wd.keys()) { const d = Math.max(Math.abs((i % W) - c.x), Math.abs(((i / W) | 0) - c.y)); if (d < bd) { bd = d; best = i; } }
  if (best < 0) return false;
  if (bd > 1) return moveToward(c, best % W, (best / W) | 0);
  const dmg = k.wd.get(best);
  if (dmg >= 1e4) { if (k.wood < 3) return false; k.wood -= 3; k.wd.delete(best); if (k.broken) k.broken.delete(best); }
  else { if (k.wood < .5) return false; k.wood -= .5; if (dmg - 22 <= 0) k.wd.delete(best); else k.wd.set(best, dmg - 22); }
  c.atk = 6; fx('bless', best % W, (best / W) | 0); warStats.repaired++;
  return true;
}
function towerTick() {                                      // every 1.5 seconds: intact towers shoot enemy soldiers in range
  for (const k of kingdoms.values()) {
    if (!k.enemies.size) continue;
    const R = ringR(k); if (!R) continue;
    for (const p of kingdomRing(k, R)) {
      if (p.t !== 'tower' || (k.broken && k.broken.has(p.x + p.y*W))) continue;
      const rng = (k.level >= 3 ? 7 : 6) + (k.mod.range > 1 ? 2 : 0), tg = findEnemy({ x: p.x, y: p.y }, k, rng);
      if (!tg) continue;
      const kd = kingdoms.get(tg.k), dmg = (4 + k.level) * k.mod.atk * (.7 + Math.random() * .6) / (kd ? kd.mod.def : 1);
      tg.hp -= dmg; fx('arrow', p.x, p.y, { tx: tg.x, ty: tg.y }); fx('hit', tg.x, tg.y); warStats.towerShots++;
    }
  }
}
function eventsTick() {                                     // every ~10 seconds
  for (let i = drops.length - 1; i >= 0; i--) if (tick - drops[i].b > 2400) removeDrop(drops[i]);        // untended gear rusts away
  equipTick(); repairWalls(); siegeTick(); resTick(); updateMarket(); tradeTick(); eliteTick(); shopTick();
  const ks = [...kingdoms.values()];
  for (const k of ks) {
    if (k.ev) {
      k.ev.left -= 80;
      if (k.ev.left <= 0) { if (k.ev.type === 'plague') k.immune = tick + 4000; k.ev = null; }
      continue;
    }
    if (k.pop >= 15 && tick > k.immune && Math.random() < .002 * (k.pop / 20)) startEvent(k, 'plague');
    else if (Math.random() < .003) startEvent(k, 'drought');
    else if (k.level >= 1 && !k.enemies.size && k.food > 150 && Math.random() < .003) startEvent(k, 'golden');
  }
  for (const k of ks) {                                     // tiny kingdoms at peace get annexed by a bigger neighbour of their own race
    if (!kingdoms.has(k.id) || k.houses > 3 || tick - k.born < 2400 || k.enemies.size) continue;
    let best = null, bd = 14*14;
    for (const o of ks) {
      if (o === k || !kingdoms.has(o.id) || o.race !== k.race || o.houses <= k.houses || o.enemies.has(k.id) || comp[o.cap] !== comp[k.cap]) continue;
      const d = (o.cx - k.cx)**2 + (o.cy - k.cy)**2; if (d < bd) { bd = d; best = o; }
    }
    if (best && Math.random() < .15) { absorbKingdom(best, k); warStats.annexed = (warStats.annexed || 0) + 1; }
  }
  for (const a of ks) if (a.ev && a.ev.type === 'plague') for (const b of ks) {          // plague spreads to touching neighbours
    if (b === a || b.ev || tick <= b.immune || !kingdoms.has(b.id) || !kingdoms.has(a.id) || comp[a.cap] !== comp[b.cap]) continue;
    const reach = 6 + a.level*3 + a.mod.radius + 6 + b.level*3 + b.mod.radius;
    if (Math.hypot(a.cx - b.cx, a.cy - b.cy) < reach && Math.random() < .03) startEvent(b, 'plague');
  }
}
function splitKingdom(k, hostile) {                         // one side of the realm (random direction) breaks away as a new kingdom
  const cx = k.cap % W, cy = (k.cap / W) | 0, hs = [];
  for (let i = 0; i < N; i++) if (bld[i] && kid[i] === k.id && i !== k.cap) hs.push(i);
  if (hs.length < 3) return null;
  const ang = Math.random() * 6.2832, ux = Math.cos(ang), uy = Math.sin(ang);
  const proj = i => ((i % W) - cx) * ux + (((i / W) | 0) - cy) * uy;
  hs.sort((p, q) => proj(q) - proj(p));
  const take = Math.max(2, Math.floor(hs.length * .45)), rebels = hs.slice(0, take), loyal = hs.slice(take);
  let sx = 0, sy = 0; for (const i of rebels) { sx += i % W; sy += (i / W) | 0; }
  const rx = Math.round(sx / take), ry = Math.round(sy / take);
  const k2 = newKingdom(k.race, rx, ry);
  k2.cap = k2.nb = rebels[0]; k2.level = Math.max(0, k.level - 1);
  k2.tech = k.tech.slice(0, k.tech.length >> 1); k2.age = k.age || 0; recalcMods(k2);
  for (const key of ['food', 'wood', 'stone', 'gold']) { const share = Math.floor(k[key] * .4); k2[key] = share + 20; k[key] -= share; }
  for (const key of ['silver', 'bronze', 'iron']) { const share = Math.floor((k[key] || 0) * .4); k2[key] = share; k[key] = (k[key] || 0) - share; }
  for (const i of rebels) kid[i] = k2.id;
  const nearest = (c, list) => { let bd = 1e9; for (const i of list) { const d = ((i % W) - c.x)**2 + (((i / W) | 0) - c.y)**2; if (d < bd) bd = d; } return bd; };
  for (const c of creatures) if (c.k === k.id && nearest(c, rebels) < nearest(c, loyal.concat([k.cap]))) c.k = k2.id;     // people follow the nearest houses
  rels.set(rkey(k.id, k2.id), hostile ? { s: 1, t: tick, until: 0 } : { s: 3, t: tick, until: tick + 3000 });
  warStats[hostile ? 'rebellions' : 'splits'] = (warStats[hostile ? 'rebellions' : 'splits'] || 0) + 1;
  rebuildRelations();
  k.unrest = Math.min(k.unrest, 35); k.lastRebel = tick; k2.lastRebel = tick; ownDirty = true; dirty = true;
  fx('warcry', rx, ry);
  return k2;
}
function absorbKingdom(a, b) {                              // b joins a: houses, people, resources, techs, relations
  for (let i = 0; i < N; i++) if (kid[i] === b.id) kid[i] = a.id;
  for (const c of creatures) if (c.k === b.id) c.k = a.id;
  if (b.leader) { b.leader.lead = 0; applyStats(b.leader); }
  a.food = Math.min(400, a.food + b.food); a.wood = Math.min(250, a.wood + b.wood); a.stone = Math.min(250, a.stone + b.stone); a.gold = Math.min(250, a.gold + b.gold);
  for (const key of ['silver', 'bronze', 'iron']) a[key] = Math.min(250, (a[key] || 0) + (b[key] || 0));
  if (b.tech.length > a.tech.length) a.tech = b.tech.slice();
  a.age = Math.max(a.age || 0, b.age || 0); recalcMods(a);
  for (const it of b.chest) if (a.chest.length < chestCap(a)) a.chest.push(it);
  for (const key in b.lm) if (!(key in a.lm)) a.lm[key] = b.lm[key];
  a.level = Math.max(a.level, b.level);
  for (const [key, r] of [...rels]) {
    const x = Math.floor(key / 65536), y = key % 65536;
    if (x !== b.id && y !== b.id) continue;
    const o = x === b.id ? y : x; rels.delete(key);
    if (o !== a.id && !rels.has(rkey(a.id, o))) rels.set(rkey(a.id, o), r);
  }
  kingdoms.delete(b.id); rebuildRelations(); ownDirty = true; dirty = true; warStats.merged = (warStats.merged || 0) + 1;
  fx('levelup', Math.round(a.cx), Math.round(a.cy));
}
function kingdomsAt(wx, wy, r) {                            // the kingdom under the finger first, then any others in the brush
  const out = [], seen = new Set();
  const add = k => { if (k && !seen.has(k.id)) { seen.add(k.id); out.push(k); } };
  if (inb(wx, wy)) add(kingdoms.get(kid[wx + wy*W]) || kingdoms.get(own[wx + wy*W]));
  forDisc(wx, wy, r, (x, y, i) => { if (bld[i]) add(kingdoms.get(kid[i])); });
  return out;
}
/* ---- war & diplomacy ---- */
const AGGR = { orc:.04, human:.012, dwarf:.008, elf:.005, werewolf:0 };            // chance per evaluation that a kingdom picks a fight with a neighbour
const SOLDIER_PCT = { orc:55, human:30, dwarf:35, elf:25, werewolf:45 };
const FRIENDS = new Set(['human:elf', 'elf:human', 'human:dwarf', 'dwarf:human', 'elf:dwarf', 'dwarf:elf']);
const rkey = (a, b) => a < b ? a*65536 + b : b*65536 + a;
const isSoldier = c => ((c.id * 2654435761) >>> 0) % 100 < SOLDIER_PCT[c.t];
const kpower = k => (k.pop + 2) * (1 + .2*k.level) * k.mod.atk * k.mod.def;
let lastWarToast = -1e9;
function computeComps() {
  comp.fill(0); let id = 0; const stack = new Int32Array(N);
  const ok = t => t >= T.SAND && t !== T.LAVA && t !== T.MOUNTAIN && t !== T.SNOW;
  for (let i = 0; i < N; i++) {
    if (comp[i] || !ok(tiles[i])) continue;
    id++; let sp = 0; stack[sp++] = i; comp[i] = id;
    while (sp) {
      const j = stack[--sp], x = j % W, y = (j / W) | 0;
      for (let d = 1; d < 9; d++) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (!inb(nx, ny)) continue;
        const ni = nx + ny*W;
        if (!comp[ni] && ok(tiles[ni])) { comp[ni] = id; stack[sp++] = ni; }
      }
    }
  }
  compDirty = false;
}
function rebuildRelations() {
  for (const k of kingdoms.values()) { k.enemies.clear(); k.allies.clear(); }
  for (const [key, r] of rels) {
    const a = kingdoms.get(Math.floor(key / 65536)), b = kingdoms.get(key % 65536);
    if (!a || !b) continue;
    if (r.s === 1) { a.enemies.add(b.id); b.enemies.add(a.id); }
    else if (r.s === 2) { a.allies.add(b.id); b.allies.add(a.id); }
  }
}
function warToast(a, b, joined) {
  if (tick - lastWarToast < 24) return;                                          // at most one message every ~3 s
  if (a.level < 1 && b.level < 1) return;
  lastWarToast = tick;
  if (b.race === 'werewolf' && !joined) toast(`${EMOJI.werewolf} ${b.name} tidak lagi netral!`);
  else toast(`${EMOJI[a.race]}${a.name} ⚔️ ${EMOJI[b.race]}${b.name}`);
}
function declareWar(a, b, joined) {
  rels.set(rkey(a.id, b.id), { s: 1, t: tick, until: 0 });
  warStats.declared++; if (joined) warStats.joined++; else { warStats['by_' + a.race] = (warStats['by_' + a.race] || 0) + 1; if (b.race === 'werewolf') warStats.vs_werewolf = (warStats.vs_werewolf || 0) + 1; }
  rebuildRelations(); warToast(a, b, joined); haptic('warning');
  fx('warcry', a.cap % W, (a.cap / W) | 0); fx('warcry', b.cap % W, (b.cap / W) | 0);
  if (joined) return;
  for (const cid of b.allies) { const c = kingdoms.get(cid); if (c && c !== a && !rels.has(rkey(c.id, a.id)) && comp[c.cap] === comp[a.cap] && Math.random() < .7) declareWar(c, a, true); }
  for (const cid of a.allies) { const c = kingdoms.get(cid); if (c && c !== b && !rels.has(rkey(c.id, b.id)) && comp[c.cap] === comp[b.cap] && Math.random() < .4) declareWar(c, b, true); }
}
function endWar(a, b) {
  rels.set(rkey(a.id, b.id), { s: 3, t: tick, until: tick + 4000 });            // truce before they may fight again
  warStats.ended++; rebuildRelations();
  if (tick - lastWarToast >= 24 && (a.level >= 1 || b.level >= 1)) { lastWarToast = tick; toast(`🕊️ ${a.name} & ${b.name}`); }
}
function diplomacyTick() {                                                       // every ~10 seconds
  if (compDirty) computeComps();
  let changed = false;
  for (const [key, r] of rels) {                                                 // wars end, truces expire, dead kingdoms vanish from the books
    const a = kingdoms.get(Math.floor(key / 65536)), b = kingdoms.get(key % 65536);
    if (!a || !b) { rels.delete(key); changed = true; continue; }
    if (r.s === 3 && tick > r.until) { rels.delete(key); continue; }
    if (r.s === 1) {
      const beaten = (k) => k.houses <= 1 || k.pop <= 2;
      const age = tick - r.t;
      if (beaten(a) || beaten(b)) { endWar(a, b); changed = true; }
      else if (age > 1200 && Math.random() < Math.min(.25, (age - 1200) / 12000)) { endWar(a, b); changed = true; }     // war weariness
    }
  }
  const ks = [...kingdoms.values()];
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
    const a = ks[i], b = ks[j];
    if (rels.has(rkey(a.id, b.id))) continue;
    if (comp[a.cap] !== comp[b.cap] || !comp[a.cap]) continue;                   // different landmass: no contact
    const ra = 6 + a.level*3 + a.mod.radius, rb = 6 + b.level*3 + b.mod.radius;
    const dist = Math.hypot(a.cx - b.cx, a.cy - b.cy);
    if (dist > ra + rb + 14) continue;
    const overlap = dist < ra + rb ? 2 : 1;
    if (FRIENDS.has(a.race + ':' + b.race) && Math.random() < .03) {            // friendly races sign alliances
      rels.set(rkey(a.id, b.id), { s: 2, t: tick, until: 0 }); warStats.allied++; changed = true; continue;
    }
    for (const [x, y] of [[a, b], [b, a]]) {                                     // x may attack y
      if (x.pop < (x.race === 'orc' ? 6 : 8) || (x.level < 1 && x.race !== 'orc') || x.enemies.size >= 1) continue;
      const ratio = Math.max(.4, Math.min(2.5, kpower(x) / kpower(y)));
      const friendly = FRIENDS.has(x.race + ':' + y.race) ? .3 : 1;
      if (Math.random() < AGGR[x.race] * ratio * overlap * friendly) { declareWar(x, y, false); changed = true; break; }
    }
  }
  if (changed) rebuildRelations();
}
function updateFronts() {                                                         // where each kingdom's soldiers march
  for (const k of kingdoms.values()) {
    k.front = -1; if (!k.enemies.size) continue;
    let bd = 1e9;
    for (const eid of k.enemies) { const e = kingdoms.get(eid); if (!e) continue; const d = (e.cx - k.cx)**2 + (e.cy - k.cy)**2; if (d < bd) { bd = d; k.front = e.cap; } }
  }
}
function findEnemy(c, ka, rad) {
  const cx = c.x >> 3, cy = c.y >> 3, cr = Math.ceil(rad/8);
  let best = null, bd = 1e9;
  for (let gy = Math.max(0, cy-cr); gy <= Math.min(GH-1, cy+cr); gy++)
    for (let gx = Math.max(0, cx-cr); gx <= Math.min(GW-1, cx+cr); gx++) {
      const list = cells[gy*GW + gx];
      for (let k = 0; k < list.length; k++) {
        const o = list[k];
        if (o.hp <= 0 || !o.k || !ka.enemies.has(o.k)) continue;
        const d = Math.max(Math.abs(o.x - c.x), Math.abs(o.y - c.y));
        if (d < bd && d <= rad) { bd = d; best = o; }
      }
    }
  return best;
}
/* ---- kingdoms ---- */
function defaultMod() { return { food:1, wood:1, stone:1, gold:1, birth:1, atk:1, def:1, houses:0, radius:0, range:1, night:0, loot:0, steal:0, regen:0, fire:0, farms:0, walls:0, grow:0 }; }
const ADD = new Set(['houses', 'radius']), MAXED = new Set(['range', 'night', 'loot', 'steal', 'regen', 'fire', 'farms', 'walls', 'grow']);
const TECH_BY = {}; for (const r in TECHS) for (const t of TECHS[r]) TECH_BY[r + ':' + t.id] = t;
function recalcMods(k) {
  const m = defaultMod();
  for (const id of k.tech) {
    const t = TECH_BY[k.race + ':' + id]; if (!t) continue;
    for (const key in t.fx) { const v = t.fx[key]; if (ADD.has(key)) m[key] += v; else if (MAXED.has(key)) m[key] = Math.max(m[key], v); else m[key] *= v; }
  }
  k.mod = m;
}
function freeTileNear(k, minR, maxR, pred) {
  const cx = k.cap % W, cy = (k.cap / W) | 0;
  for (let n = 0; n < 60; n++) {
    const a = Math.random() * 6.283, r = ri(minR, maxR), x = Math.round(cx + Math.cos(a)*r), y = Math.round(cy + Math.sin(a)*r);
    if (!inb(x, y)) continue;
    const i = x + y*W, t = tiles[i];
    if (bld[i] || t <= T.SHALLOW || t === T.LAVA) continue;
    if (pred && !pred(t)) continue;
    return i;
  }
  return -1;
}
function placeLandmark(k, key) {
  let i = key === 'mine' ? freeTileNear(k, 3, 9, t => t === T.HILL || t === T.MOUNTAIN) : -1;
  if (i < 0) i = freeTileNear(k, 2, 5, t => t !== T.MOUNTAIN && t !== T.SNOW);
  if (i >= 0) k.lm[key] = i;
}
function finishTech(k, t) {
  k.tech.push(t.id); k.res = null; recalcMods(k);
  if (t.lm) placeLandmark(k, t.lm);
  fx('tech', Math.round(k.cx), Math.round(k.cy), { ic: t.ic });
  ownDirty = true; dirty = true;
}
const METALS = ['bronze', 'iron', 'silver'];
function metalOK(k, key, amt) {                              // a metal requirement is waived when there is none to be found within reach (no dead ends)
  if ((k[key] || 0) >= amt) return true;
  if (!k.reach) return false;
  if (!k.reach[key]) return true;
  return key === 'iron' && k.age < 1 && !k.reach.bronze;
}
function canPay(k, c) { return k.wood >= (c.wood || 0) && k.stone >= (c.stone || 0) && k.gold >= (c.gold || 0) && k.food >= (c.food || 0) && METALS.every(m => !c[m] || metalOK(k, m, c[m])); }
function pay(k, c) { k.wood -= c.wood || 0; k.stone -= c.stone || 0; k.gold -= c.gold || 0; k.food -= c.food || 0; for (const m of METALS) if (c[m]) k[m] = Math.max(0, (k[m] || 0) - c[m]); }
function researchCheck() {                                 // every 5 seconds: finish running research or start the next tech
  for (const k of kingdoms.values()) {
    if (k.res) { k.res.left -= 40; if (k.res.left <= 0) finishTech(k, k.res.t); continue; }
    const t = TECHS[k.race][k.tech.length];
    if (!t || k.level < t.lv) continue;
    const c = t.cost;
    if (canPay(k, c)) {
      pay(k, c);
      k.res = { t, left: 240 };
    }
  }
}
function grantTech(k) {                                    // divine gift: the next tech instantly, free of charge
  const t = TECHS[k.race][k.tech.length]; if (!t) return false;
  finishTech(k, t); return true;
}
function kName(race) { const p = NAME_P[race]; return p[0][ri(0, p[0].length - 1)] + p[1][ri(0, p[1].length - 1)]; }
function newKingdom(race, x, y) {
  const k = { id: nextKid++, race, cx: x, cy: y, cap: x + y*W, nb: x + y*W, level: 0, food: 40, wood: 12, stone: 0, gold: 0, houses: 0, pop: 0,
              born: tick, name: kName(race), leader: null, tech: [], mod: defaultMod(), res: null, lm: {}, enemies: new Set(), allies: new Set(), front: -1, ev: null, immune: 0, unrest: 0, lastRebel: -1e9, chest: [], silver: 0, bronze: 0, iron: 0, age: 0, reach: null, tk: [0, 0, 0, 0], pm: 0, g: 0, f: 0, m: 0, sx: 0, sy: 0, bd: 1e9, cand: null };
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
const maxHouses = k => Math.max(2, Math.round((3 + k.level*5) * (k.race === 'werewolf' ? .6 : 1)) + k.mod.houses);
function nearestKingdom(c) {
  let best = 0, bd = 15*15;
  for (const k of kingdoms.values()) { if (k.race !== c.t) continue; const d = (k.cx-c.x)**2 + (k.cy-c.y)**2; if (d < bd) { bd = d; best = k.id; } }
  return best;
}
function terrainStats(k) {
  const cx = Math.round(k.cx), cy = Math.round(k.cy); let g = 0, f = 0, m = 0, pm = 0; const tk = [0, 0, 0, 0];
  for (let y = Math.max(0, cy-9); y <= Math.min(H-1, cy+9); y++) for (let x = Math.max(0, cx-9); x <= Math.min(W-1, cx+9); x++) {
    const i = x + y*W, t = tiles[i];
    if (t === T.GRASS) g++; else if (t === T.FOREST) { f++; tk[(treeKindAt(i) & 7) - 1]++; } else if (t === T.HILL || t === T.MOUNTAIN) m++; else if (t === T.SAND && (treeKindAt(i) & 16)) pm++;
  }
  k.g = g; k.f = f; k.m = m; k.tk = tk; k.pm = pm;
}
function economy() {                                      // once per second
  const redo = tick % 120 === 0, rebellions = [];
  for (const k of kingdoms.values()) {
    const E = ECO[k.race];
    if (redo || (!k.g && !k.f && !k.m)) terrainStats(k);
    const M = k.mod;
    k.food = Math.min(400, k.food + (k.g*.012 + k.f*(k.race === 'elf' ? .012 : .006) + k.houses*.25) * E.f * M.food * evFood(k) - k.pop*.18 * (1 + .15 * k.enemies.size));     // elves forage the forest; war strains the food supply
    const aff = TREE_AFF[k.race]; let wd = k.pm * .4; for (let q = 0; q < 4; q++) wd += k.tk[q] * TREE_W[q] * aff[q];       // timber depends on the tree kinds around the realm
    k.wood = Math.min(250, k.wood + wd*.012*E.w*M.wood);
    k.food = Math.min(400, k.food + (k.tk[3]*.008 + k.pm*.003)*E.f);                                                 // fruit trees and coconuts feed people
    mineTick(k, E);
    k.stone = Math.min(250, k.stone + (k.m*.01 + k.houses*.02)*E.s*M.stone);                 // quarries / trade even far from hills
    k.gold = Math.min(250, k.gold + (k.m*.004 + k.houses*.012)*E.g*M.gold);
    if (M.grow && Math.random() < .5) {                                         // living forest: grass near the capital turns to trees
      const gi = freeTileNear(k, 2, 8, t => t === T.GRASS);
      if (gi >= 0) { tiles[gi] = T.FOREST; k.f++; }
    }
    if (k.food <= 0) {                                    // famine: someone starves
      k.food = 0;
      if (k.pop > 3 && Math.random() < .3) killOneMember(k);
    }
    if (k.ev && k.ev.type === 'plague' && k.pop > 2 && Math.random() < (M.regen ? .1 : .22)) killOneMember(k);        // plague kills (healers help)
    if (k.food <= 0) k.unrest = Math.min(100, k.unrest + .8);                                                          // unrest: hunger, plague and long wars
    else if (k.ev && k.ev.type === 'plague') k.unrest = Math.min(100, k.unrest + .5);
    else if (k.enemies.size) k.unrest = Math.min(100, k.unrest + .1);
    else k.unrest = Math.max(0, k.unrest - .8);
    if (k.unrest >= 100 && k.houses >= 8 && k.level >= 2 && tick - k.lastRebel > 6000) rebellions.push(k);           // only mature kingdoms split, and not too often
  }
  for (const k of rebellions) {                           // rebellion: a breakaway kingdom that starts at war with its parent
    k.unrest = 40; k.lastRebel = tick;
    const k2 = splitKingdom(k, true);
    if (k2 && tick - lastEvToast >= 24) { lastEvToast = tick; toast(`🔥 ${EMOJI[k.race]}${k2.name} ⚔️ ${k.name}`); }
  }
}
function levelCheck() {                                   // every 5 seconds
  for (const k of kingdoms.values()) {
    if (k.level >= 3) continue;
    const r = LV_REQ[k.level], sc = k.race === 'werewolf' ? .6 : 1;
    if (k.pop >= r.pop*sc && k.houses >= r.houses*sc && canPay(k, r)) {
      pay(k, r); k.food += (r.food || 0) * .5;
      k.level++; ownDirty = true; dirty = true;
      fx('levelup', Math.round(k.cx), Math.round(k.cy));
      if (k.level >= 2) toast(`${LV_ICON[k.level]} ${k.name}`);
    }
  }
}
function chooseLeaders() {                                // the oldest member wears the crown
  for (const k of kingdoms.values()) k.cand = null;
  for (const c of creatures) {
    if (!c.k || RACES[c.t].engine) continue;
    const k = kingdoms.get(c.k); if (!k) continue;
    if (!k.cand || c.age > k.cand.age) k.cand = c;
  }
  for (const k of kingdoms.values()) {
    const L = k.leader;
    if (L && L.hp > 0 && L.k === k.id) continue;
    if (L) { L.lead = 0; applyStats(L); }
    k.leader = k.cand;
    if (k.cand) { k.cand.lead = 1; applyStats(k.cand); addHist(k.cand, 6); }
  }
}
function computeTerritory() {
  own.fill(0); ownScore.fill(9);
  for (const k of kingdoms.values()) {
    const r = 6 + k.level*3 + k.mod.radius, cx = Math.round(k.cx), cy = Math.round(k.cy), r2 = r*r;
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
  for (const c of creatures) if (c.k) { const k = kingdoms.get(c.k); if (k) { if (!RACES[c.t].engine) k.pop++; } else c.k = 0; }
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
      if (k.food > 5 && Math.random() < (RACES[race].spawnP || .005) * (1 + k.level*.4) * k.mod.birth * evBirth(k) && (counts[race]||0) < capOf(race)) {
        if (cells[(y>>3)*GW + (x>>3)].length < 12) { const c = spawnNear(race, x, y); if (c) { c.k = k.id; k.food -= 1.5; setFamily(c, x, y); } }
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
    if (k.houses === 0) { kingdoms.delete(k.id); ownDirty = true; warStats.collapsed = (warStats.collapsed || 0) + 1; continue; }
    k.cx = k.sx / k.houses; k.cy = k.sy / k.houses; k.cap = k.nb;
  }
  if (tick % 8 === 0) economy();
  if (tick % 16 === 0) { updateFronts(); rebuildWalls(); }
  if (tick % 12 === 0) towerTick();
  if (tick % 80 === 0) { diplomacyTick(); eventsTick(); if (!editMode) disasterTick(); }
  if (pendingDis.length) processDisasters();
  if (floods.length && tick % 8 === 0) floodRecede();
  if (tick % 40 === 0) { levelCheck(); researchCheck(); chooseLeaders(); ageCheck(); }
  nightNow = Math.max(0, -Math.cos(tick / (TPS * 90) * Math.PI * 2));
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
  kid = new Uint16Array(N); wallK = new Uint16Array(N); wallG = new Uint8Array(N); wallT = new Uint8Array(N); own = new Uint16Array(N); ownRace = new Uint8Array(N); ownEdge = new Uint8Array(N); ownScore = new Float32Array(N);
  oreT = new Uint8Array(N); oreA = new Uint8Array(N); treeK = new Uint8Array(N); nodes = [];
  drops.length = 0; dropMap.clear(); volcanoes.length = 0; parts.length = 0;
  kingdoms.clear(); rels.clear(); nextKid = 1; ownDirty = true; comp = new Uint16Array(N); compDirty = true;
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
const HT = [0, 1, 2, 3, 3.4, 5, 8, 9.5, 3.2, 3];              // rough heights per tile type, for lighting from the north-west
function renderTerrain() {
  const d = img.data, fi = (frame * 2) | 0, fr = frame;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = x + y*W, t = tiles[i], c = COL[t]; let j = jit[i];
    if (t <= 1) j += SIN[(fi + x*22 + y*14) & 255]; else if (t >= 5 && t <= 7) j *= 1.7;
    let r = c[0] + j, g = c[1] + j, b = c[2] + j;
    const tl = x > 0 ? tiles[i - 1] : t, tr = x < W - 1 ? tiles[i + 1] : t, tu = y > 0 ? tiles[i - W] : t, td = y < H - 1 ? tiles[i + W] : t;
    if (t >= 2 && t !== 8) {                                    // relief: slopes facing the light are brighter, the others darker
      const hn = HT[x > 0 && y > 0 ? tiles[i - W - 1] : t], hs = HT[x < W - 1 && y < H - 1 ? tiles[i + W + 1] : t];
      let sh = (hs - hn) * 4; sh = sh > 28 ? 28 : sh < -28 ? -28 : sh; r += sh; g += sh; b += sh;
      if (tl === 8 || tr === 8 || tu === 8 || td === 8) { r += 38; g += 12; b -= 6; }               // lava glow on the neighbours
    }
    if (t === 1 && (tl >= 2 || tr >= 2 || tu >= 2 || td >= 2) && tl !== 8 && tr !== 8 && tu !== 8 && td !== 8) {    // surf along the shore
      const f = (.5 + .5 * Math.sin(fr * .09 + x * .6 + y * .9)) * 62; r += f; g += f; b += f * .9;
    } else if (t === 2 && (tl <= 1 || tr <= 1 || tu <= 1 || td <= 1)) { r -= 17; g -= 13; b -= 4; }   // wet sand
    else if (t === 8) {                                          // lava breathes: bright seams over a darker crust
      const ph = .5 + .5 * Math.sin(fr * .07 + x * .9 + y * 1.3 + (i % 7));
      r = 205 + 50 * ph; g = 48 + 150 * ph * ph; b = 10 + 30 * ph;
      if (((i * 2654435761) >>> 0) % 100 < 30) { r *= .55; g *= .38; b *= .4; }
    }
    if (t === T.FOREST) { const v = treeKindAt(i) & 7; if (v === 2) { r -= 12; g -= 4; b += 10; } else if (v === 3) { r += 22; g += 18; b -= 8; } else if (v === 4) { r += 16; g -= 4; b -= 6; } }
    const ot = oreT[i]; if (ot && sc < 8) { const oc = ORE_RGB[ot]; r = oc[0]; g = oc[1]; b = oc[2]; }
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
    if (showBorders) {                                                        // dashed red lines between capitals of warring kingdoms
      ctx.strokeStyle = 'rgba(255,70,70,.45)'; ctx.lineWidth = Math.max(1.5, sc*.3); ctx.setLineDash([sc*.9, sc*.6]);
      for (const [key, r] of rels) {
        if (r.s !== 1) continue;
        const wa = kingdoms.get(Math.floor(key / 65536)), wb = kingdoms.get(key % 65536); if (!wa || !wb) continue;
        ctx.beginPath(); ctx.moveTo(ox + ((wa.cap % W) + .5)*sc, oy + (((wa.cap / W) | 0) + .5)*sc); ctx.lineTo(ox + ((wb.cap % W) + .5)*sc, oy + (((wb.cap / W) | 0) + .5)*sc); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    drawDecor(x0, y0, x1, y1);
    drawVolcanoes(x0, y0, x1, y1);
    drawOres(x0, y0, x1, y1);
    drawDrops(x0, y0, x1, y1);
    drawProps(x0, y0, x1, y1, true);
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
      if (isCap && kg.chest.length) { const w = SPR_K * 7; ctx.drawImage(ICON.chest, cx + hw*.38, fy - w*1.05, w, w); }               // royal chest beside the capital
      if (isCap && kg.level >= 1) {                                         // capital banner: kingdom colour + one gold pip per level
        const fx0 = hx + hw*.5, top = hy - SPR_K, K = SPR_K;
        ctx.fillStyle = '#2a2018'; ctx.fillRect(fx0, top - 7*K, K, 8*K);
        ctx.fillStyle = RACES[kg.race].col; ctx.fillRect(fx0 + K, top - 7*K, 5*K, 3*K); ctx.fillRect(fx0 + K, top - 4*K, 3*K, K);
        ctx.fillStyle = '#ffd23f'; for (let l = 0; l < kg.level; l++) ctx.fillRect(fx0 + K*(1 + l*2), top - 8*K, K, K);
      }
      if (isCap && kg.enemies.size) {                                            // at war: crossed swords over the capital
        drawIcon('⚔', cx, hy - SPR_K*11, Math.max(18, SPR_K*10), .8 + .2*Math.sin(frame*.15));
      }
      if (isCap && kg.ev) {                                                      // event: aura + icon over the capital
        ctx.fillStyle = kg.ev.type === 'plague' ? 'rgba(120,255,90,.10)' : kg.ev.type === 'drought' ? 'rgba(200,150,60,.12)' : 'rgba(255,230,120,.10)';
        ctx.beginPath(); ctx.arc(cx, fy - hh*.4, hw*1.2, 0, 7); ctx.fill();
        drawIcon(EV_IC[kg.ev.type], cx + (kg.enemies.size ? SPR_K*10 : 0), hy - SPR_K*11, Math.max(18, SPR_K*10), .8 + .2*Math.sin(frame*.12));
      }
      if (fire[idx]) { ctx.fillStyle = frame % 6 < 3 ? 'rgba(255,170,30,.8)' : 'rgba(255,80,20,.8)'; ctx.fillRect(hx + hw*.2, hy + hh*.2, hw*.6, hh*.55); }
    }
    drawProps(x0, y0, x1, y1, false);
    drawFires(x0, y0, x1, y1);
    for (const kl of kingdoms.values()) for (const key in kl.lm) {                      // landmarks from technologies
      const li = kl.lm[key], lx = li % W, ly = (li / W) | 0;
      if (lx < x0 - 3 || lx > x1 + 3 || ly < y0 - 3 || ly > y1 + 6) continue;
      const ls = LMATLAS[key]; if (!ls) continue;
      const lw = ls.width * SPR_K, lh = ls.height * SPR_K, lcx = ox + (lx + .5)*sc, lfy = oy + (ly + 1)*sc - sc*.05;
      if (key === 'lifetree') { ctx.fillStyle = 'rgba(255,226,122,.16)'; ctx.beginPath(); ctx.arc(lcx, lfy - lh*.55, lw*.8, 0, 7); ctx.fill(); }
      ctx.drawImage(ls, lcx - lw/2, lfy - lh, lw, lh);
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
      if (c === selected) { ctx.strokeStyle = `rgba(255,214,74,${.65 + .3*Math.sin(frame*.2)})`; ctx.lineWidth = Math.max(2, SPR_K*.7); ctx.beginPath(); ctx.ellipse(cx, fy - sw*.03, sw*.55, sw*.2, 0, 0, 7); ctx.stroke(); }
      if (c.face < 0) { ctx.save(); ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.drawImage(spr, -sw/2 + lunge, fy - sh, sw, sh); ctx.restore(); }
      else ctx.drawImage(spr, cx - sw/2 + lunge, fy - sh, sw, sh);
      if (c.elite) {                                                                    // iron knight: helmet, crest and shield over the race sprite
        const K = SPR_K, mx = cx + lunge, hd = c.face < 0 ? -1 : 1;
        ctx.fillStyle = '#c0c8d4'; ctx.fillRect(mx - sw*.27, fy - sh - K*.5, sw*.54, K*2.5);
        ctx.fillStyle = '#6a7280'; ctx.fillRect(mx - sw*.27, fy - sh + K*1.5, sw*.54, K*.6);
        ctx.fillStyle = RACES[c.t].col; ctx.fillRect(mx - K*.5, fy - sh - K*2.4, K, K*2);
      }
      if (sc >= 8 && c.eq && (c.eq[0] || c.eq[1] || c.eq[2])) drawGear(c, cx + lunge, fy, sw, sh);
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
  cv.style.transform = shakeT > 0 ? `translate(${(Math.random() - .5) * 2 * Math.min(8, shakeT / 4)}px, ${(Math.random() - .5) * 2 * Math.min(8, shakeT / 4)}px)` : '';
  if (shakeT > 0) shakeT--;
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i]; e.t++;
    const px = ox + (e.x + .5)*sc, py = oy + (e.y + .5)*sc; let life = 14;
    if (e.k === 'bolt') {
      life = 10; ctx.strokeStyle = `rgba(255,255,200,${1 - e.t/life})`; ctx.lineWidth = 5;
      ctx.beginPath(); let cx = px, cy = py - 700; ctx.moveTo(cx, cy); const nodes2 = [];
      for (let k = 1; k <= 8; k++) { cx = k === 8 ? px : px + (hash(k, e.seed, 3) - .5) * 60; cy += (py - cy) / (9 - k); ctx.lineTo(cx, cy); nodes2.push([cx, cy]); }
      ctx.stroke(); ctx.lineWidth = 2;
      for (const kk of [2, 4, 5]) { let bx = nodes2[kk][0], by = nodes2[kk][1]; ctx.beginPath(); ctx.moveTo(bx, by); for (let q = 0; q < 3; q++) { bx += (hash(kk, q, e.seed) - .35) * 40; by += 36 + hash(q, kk, 9) * 20; ctx.lineTo(bx, by); } ctx.stroke(); }
      const gl = ctx.createRadialGradient(px, py, 0, px, py, sc * 3.5); gl.addColorStop(0, `rgba(210,235,255,${.7*(1 - e.t/life)})`); gl.addColorStop(1, 'rgba(160,200,255,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(px, py, sc * 3.5, 0, 7); ctx.fill();
      if (e.t === 1) emit('spark', e.x, e.y, 12);
      ctx.fillStyle = `rgba(255,255,255,${.45*(1 - e.t/life)})`; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
    } else if (e.k === 'boom') {
      life = 26; const p = e.t/life;
      if (p < .22) { ctx.fillStyle = `rgba(255,250,210,${(1 - p / .22) * .85})`; ctx.beginPath(); ctx.arc(px, py, e.r*sc*(.5 + p * 3), 0, 7); ctx.fill(); }
      ctx.fillStyle = `rgba(255,${200 - p*150|0},40,${1-p})`; ctx.beginPath(); ctx.arc(px, py, e.r*sc*(.3 + p*1.3), 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${1-p})`; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = `rgba(255,214,150,${(1-p) * .65})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px, py, e.r*sc*(.6 + p*2.4), 0, 7); ctx.stroke();       // shockwave
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
    } else if (e.k === 'rock') {
      life = 14; const p = e.t / life, bx = ox + (e.tx + .5)*sc, by = oy + (e.ty + .5)*sc, ax = px, ay = py;
      const rx = ax + (bx - ax)*p, ry = ay + (by - ay)*p - Math.sin(p*Math.PI)*sc*3;
      ctx.fillStyle = '#4a4650'; ctx.fillRect(rx - sc*.2, ry - sc*.2, sc*.4, sc*.4); ctx.fillStyle = '#9a96a0'; ctx.fillRect(rx - sc*.2, ry - sc*.2, sc*.2, sc*.2);
    } else if (e.k === 'shock') {
      life = 30; const p = e.t / life; ctx.strokeStyle = `rgba(150,110,70,${1 - p})`; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(px, py, sc*e.r*p, 0, 7); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, sc*e.r*p*.6, 0, 7); ctx.stroke();
    } else if (e.k === 'warn') {                                 // warnings follow game ticks, so they last as long as the real countdown
      const rem = Math.max(0, e.until - tick), p = 1 - rem / e.life, pul = .5 + .5*Math.sin(e.t * .25);
      life = rem <= 0 ? 0 : 1e9;
      ctx.strokeStyle = `rgba(255,${80 + pul*80|0},50,${.35 + .5*pul})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(px, py, sc*e.r*(1.15 - .25*p), 0, 7); ctx.stroke(); ctx.setLineDash([]);
      if (e.smoke && e.t % 2 === 0) { emit('smoke', e.x + (hash(e.t, 7, 1) - .5), e.y - 1.2, 1, { dark: 1, s0: .3, s1: 1.2 }); if (e.t % 4 === 0) emit('ember', e.x, e.y - 1.2, 1, { sx: .5 }); }
      if (e.meteor && rem <= 14) {                               // the meteor streaks in from the upper right during the last moments
        const f = 1 - rem / 14, hx = px + sc * 10 * (1 - f), hy = py - sc * 22 * (1 - f), rad = sc * (.5 + f * .7);
        const gr = ctx.createRadialGradient(hx, hy, 0, hx, hy, rad * 2.4); gr.addColorStop(0, 'rgba(255,240,170,.95)'); gr.addColorStop(.35, 'rgba(255,140,40,.8)'); gr.addColorStop(1, 'rgba(255,60,10,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(hx, hy, rad * 2.4, 0, 7); ctx.fill();
        ctx.fillStyle = '#3a2a22'; ctx.beginPath(); ctx.arc(hx, hy, rad * .7, 0, 7); ctx.fill();
        emit('ember', (hx - ox) / sc - .5, (hy - oy) / sc - .5, 3, { sx: .4 }); emit('smoke', (hx - ox) / sc - .5, (hy - oy) / sc - .5, 1, { dark: 1, s0: .3, s1: 1 });
      }
      drawIcon(e.ch, px, py - sc*1.2 - pul*sc*.4, Math.max(22, sc*3.2), .9);
    } else if (e.k === 'crack') {                                 // ground cracks from the epicentre of an earthquake
      life = 110; const p = e.t / life, al = p < .15 ? p / .15 : 1 - (p - .15) / .85;
      ctx.strokeStyle = `rgba(40,26,20,${al * .9})`; ctx.lineWidth = Math.max(2, sc * .1);
      for (let r = 0; r < 7; r++) {
        let ang = r * .9 + hash(r, e.seed, 5), cx = px, cy = py; ctx.beginPath(); ctx.moveTo(cx, cy);
        const len = e.r * sc * (.45 + hash(r, e.seed, 7) * .5) * Math.min(1, p * 8 + .3);
        for (let k = 1; k <= 6; k++) { ang += (hash(r, k, e.seed) - .5) * .9; cx += Math.cos(ang) * len / 6; cy += Math.sin(ang) * len / 6; ctx.lineTo(cx, cy); }
        ctx.stroke();
      }
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
    } else if (e.k === 'warcry') {
      life = 40; const p = e.t / life;
      ctx.strokeStyle = `rgba(255,60,60,${1 - p})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, sc*(1 + p*6), 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, sc*(.5 + p*3), 0, 7); ctx.stroke();
    } else if (e.k === 'arrow') {
      life = 8; const p = e.t / life;
      const ax = ox + (e.x + .5)*sc, ay = oy + (e.y + .5)*sc, bx = ox + (e.tx + .5)*sc, by = oy + (e.ty + .5)*sc;
      const x1p = ax + (bx - ax)*p, y1p = ay + (by - ay)*p;
      ctx.strokeStyle = '#efe2b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1p - (bx - ax)*.18, y1p - (by - ay)*.18); ctx.lineTo(x1p, y1p); ctx.stroke();
    } else if (e.k === 'tech') {
      life = 60; const p = e.t / life;
      drawIcon(e.ic, px, py - sc*1.5 - p*sc*5, Math.max(20, sc*3), Math.min(1, (1 - p) * 1.6));
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
  drawParts();
}

/* ============================== TOOLS ============================== */
let tool = editMode ? 'raise' : 'inspect', hover = null, painting = false, panning = false;
let brush = 3, lastApply = 0, lastPointer = [0, 0];
const brushR = () => brush - 1;
const TOOLS = {
  raise:  { g:'terrain', ic:'⬆️', nm:'Naikkan', ms:140 },
  lower:  { g:'terrain', ic:'⬇️', nm:'Turunkan', ms:140 },
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
  werewolf: { g:'life', ic:EMOJI.werewolf, nm:'Manusia serigala', ms:140, spawn:1 },
  rain:   { g:'powers', ic:'🌧️', nm:'Hujan', ms:40 },
  fire:   { g:'powers', ic:'🔥', nm:'Api', ms:50 },
  bolt:   { g:'powers', ic:'⚡', nm:'Petir', ms:250 },
  meteor: { g:'powers', ic:'☄️', nm:'Meteor', ms:700 },
  bless:  { g:'powers', ic:'✨', nm:'Berkati', ms:120 },
  smite:  { g:'powers', ic:'💀', nm:'Bunuh', ms:90 },
  enlighten:{ g:'realm', ic:'📖', nm:'Ilmu', ms:99999 },
  grace:  { g:'realm', ic:'🙏', nm:'Anugerah', ms:99999 },
  plague: { g:'realm', ic:'☠️', nm:'Wabah', ms:99999 },
  revolt: { g:'realm', ic:'🔥', nm:'Pemberontakan', ms:99999 },
  peace:  { g:'realm', ic:'🕊️', nm:'Damaikan', ms:99999 },
  unite:  { g:'realm', ic:'🤝', nm:'Satukan', ms:99999 },
  split:  { g:'realm', ic:'✂️', nm:'Pecah', ms:99999 },
  inspect:{ g:'powers', ic:'🔍', nm:'Periksa', ms:0 },
};

/* ============================== NATURAL DISASTERS (automatic; level set in the world tab) ============================== */
let disasterLvl = 1;                                         // 0 off, 1 rare, 2 frequent
let nextMajor = 0;                                           // tick before which no volcano/meteor may be scheduled
const pendingDis = [];
const DIS_NAMES = ['Mati', 'Jarang', 'Sering'];
function strikeBolt(wx, wy, rr) {
  fx('bolt', wx, wy, { seed: (Math.random()*1000)|0 }); haptic('tap');
  forDisc(wx, wy, rr, (x, y, i) => { ignite(i); bld[i] = 0; });
  for (const c of creatures) if ((c.x-wx)**2 + (c.y-wy)**2 <= rr*rr + 1) c.hp = 0;
}
function strikeMeteor(wx, wy, R) {
  fx('boom', wx, wy, { r: R + 2 }); haptic('thud'); shakeT = 22;
  emit('debris', wx, wy, 34); emit('ember', wx, wy, 26, { sx: 1.5 }); emit('smoke', wx, wy, 12, { sx: 2, dark: 1, s0: .4, s1: 1.5 }); emit('dust', wx, wy, 16, { sx: 3 });
  forDisc(wx, wy, R, (x, y, i) => {
    const d = Math.hypot(x - wx, y - wy); bld[i] = 0;
    if (tiles[i] > T.SHALLOW) { if (d < R*.45) setTile(i, T.LAVA); else if (d < R*.8) setTile(i, T.BURNT); }
    else if (d < R*.35) setTile(i, T.SHALLOW);
  });
  forDisc(wx, wy, R + 3, (x, y, i) => { if (Math.random() < .6) ignite(i); });
  for (const c of creatures) if ((c.x-wx)**2 + (c.y-wy)**2 <= (R+1)**2) c.hp = 0;
}
function eruptVolcano(wx, wy) {
  fx('boom', wx, wy, { r: 5 }); haptic('thud'); shakeT = 40;
  const vv = volcanoAt(wx, wy); if (vv) vv.er = tick;
  emit('debris', wx, wy - 1.5, 26); emit('ember', wx, wy - 1.5, 40, { sx: 1 }); emit('smoke', wx, wy - 1.5, 14, { sx: 1.2, dark: 1, s0: .4, s1: 1.6 });
  const flow = (x, y, i) => { if (tiles[i] > T.SHALLOW && i !== wx + wy*W) { setTile(i, T.LAVA); bld[i] = 0; } };
  forDisc(wx, wy, 2, flow);
  for (let n = 0; n < 4; n++) {                              // lava streams run outward from the vent
    const o = DIRS[1 + 2*ri(0, 3)]; let x = wx, y = wy;
    for (let k = 0, len = ri(5, 9); k < len; k++) {
      x += o[0] + (Math.random() < .3 ? ri(-1, 1) : 0); y += o[1] + (Math.random() < .3 ? ri(-1, 1) : 0);
      if (!inb(x, y) || tiles[x + y*W] <= T.SHALLOW) break;
      forDisc(x, y, Math.random() < .35 ? 1 : 0, flow);
    }
  }
  forDisc(wx, wy, 7, (x, y, i) => { if (Math.random() < .35) ignite(i); });
  for (const c of creatures) if ((c.x-wx)**2 + (c.y-wy)**2 <= 30) c.hp = 0;
}
let shakeT = 0;
const floods = [];                                           // { i, orig, until } tiles temporarily under water
function strikeQuake(wx, wy) {
  const R = 9; shakeT = 50; haptic('thud');
  fx('shock', wx, wy, { r: R }); fx('crack', wx, wy, { r: R, seed: (Math.random() * 999) | 0 }); emit('dust', wx, wy, 26, { sx: R });
  forDisc(wx, wy, R, (x, y, i) => {
    if (bld[i] && Math.random() < .25) { bld[i] = 0; fire[i] = 0; fx('puff', x, y); }
    else if (tiles[i] > T.SHALLOW && tiles[i] !== T.LAVA && Math.random() < .03) fx('puff', x, y);
  });
  for (const c of creatures) if ((c.x-wx)**2 + (c.y-wy)**2 <= R*R && Math.random() < .15) c.hp -= 4;
}
function strikeFlood(wx, wy) {                               // sea surges inland from a coast tile, then recedes
  haptic('thud');
  const seen = new Set([wx + wy*W]), q = [[wx, wy, 0]], until = tick + 640;
  while (q.length) {
    const [x, y, d] = q.shift(), i = x + y*W, t = tiles[i];
    if (t > T.SHALLOW) {
      if (Math.random() < .88 && (t === T.SAND || t === T.GRASS || t === T.BURNT || t === T.FOREST) ) {
        floods.push({ i, orig: t, until: until + ri(0, 120) }); tiles[i] = T.SHALLOW; fire[i] = 0; bld[i] = 0; fx('splash', x, y);
      } else continue;
    }
    if (d >= 6) continue;
    for (let k = 1; k < 9; k += 2) {
      const nx = x + DIRS[k][0], ny = y + DIRS[k][1], ni = nx + ny*W;
      if (inb(nx, ny) && !seen.has(ni)) { seen.add(ni); q.push([nx, ny, d + 1]); }
    }
  }
  for (const c of creatures) if (tiles[c.x + c.y*W] <= T.SHALLOW && floods.some(f => f.i === c.x + c.y*W) && !c.swim) c.hp = 0;
}
function floodRecede() {
  for (let n = floods.length - 1; n >= 0; n--) {
    const f = floods[n]; if (tick < f.until) continue;
    floods.splice(n, 1);
    if (tiles[f.i] === T.SHALLOW) { tiles[f.i] = f.orig; ownDirty = true; fx('splash', f.i % W, (f.i / W) | 0); }
  }
}
function smallKingdomNear(x, y, r) {                         // keep tiny kingdoms from being wiped out by a random disaster
  let bad = false;
  forDisc(x, y, r, (tx, ty, i) => { if (bld[i]) { const k = kingdoms.get(kid[i]); if (!k || k.houses <= 3) bad = true; } });
  return bad;
}
function pickSpot(test, tries) {
  for (let n = 0; n < tries; n++) { const x = ri(0, W - 1), y = ri(0, H - 1); if (test(tiles[x + y*W], x, y)) return [x, y]; }
  return null;
}
function disasterTick() {                                    // every ~10 seconds, play mode only
  if (!disasterLvl) return;
  const L = disasterLvl;
  if (Math.random() < (L === 1 ? .06 : .15)) {               // lightning: minor, can start forest fires
    const p = pickSpot((t, x, y) => t === T.FOREST || ((t === T.GRASS || t === T.HILL) && Math.random() < .3), 40);
    if (p) { pendingDis.push({ type: 'bolt', x: p[0], y: p[1], at: tick + 1 }); fx('warn', p[0], p[1], { life: 10, until: tick + 1, r: 1, ch: '⚡' }); }
  }
  if (tick >= nextMajor && Math.random() < (L === 1 ? .025 : .07)) {
    const r0 = Math.random(), type = r0 < .4 ? 'volcano' : r0 < .6 ? 'meteor' : r0 < .85 ? 'quake' : 'flood';
    let p = null;
    if (type === 'meteor') {
      for (let n = 0; n < 12 && !p; n++) {
        let x, y;
        if (kingdoms.size && Math.random() < .5) { const ks = [...kingdoms.values()], k = ks[ri(0, ks.length - 1)]; x = Math.round(k.cx) + ri(-8, 8); y = Math.round(k.cy) + ri(-8, 8); }
        else { x = ri(0, W - 1); y = ri(0, H - 1); }
        if (inb(x, y) && tiles[x + y*W] > T.SHALLOW && !smallKingdomNear(x, y, 7)) p = [x, y];
      }
    } else if (type === 'quake') {
      const ks = [...kingdoms.values()].filter(k => k.houses >= 6);
      if (ks.length) { const k = ks[ri(0, ks.length - 1)]; p = [Math.round(k.cx) + ri(-4, 4), Math.round(k.cy) + ri(-4, 4)]; if (!inb(p[0], p[1])) p = null; }
    } else if (type === 'flood') {
      p = pickSpot((t, x, y) => {
        if (t !== T.SAND || smallKingdomNear(x, y, 8)) return false;
        for (let k = 1; k < 9; k += 2) { const nx = x + DIRS[k][0], ny = y + DIRS[k][1]; if (inb(nx, ny) && tiles[nx + ny*W] <= T.SHALLOW) return true; }
        return false;
      }, 600);
    } else {
      const vs = volcanoes.filter(v => (tiles[v.i] === T.MOUNTAIN || tiles[v.i] === T.SNOW) && !smallKingdomNear(v.x, v.y, 9));
      if (vs.length && Math.random() < .85) { const v = vs[ri(0, vs.length - 1)]; p = [v.x, v.y]; }
      else p = pickSpot((t, x, y) => (t === T.MOUNTAIN || t === T.SNOW) && !smallKingdomNear(x, y, 9), 400);
    }
    if (p) {
      const INFO = { volcano: [48, 4, '🌋'], meteor: [32, 6, '☄️'], quake: [24, 9, '🪨'], flood: [40, 6, '🌊'] }[type];
      pendingDis.push({ type, x: p[0], y: p[1], at: tick + INFO[0] });
      fx('warn', p[0], p[1], { life: INFO[0], until: tick + INFO[0], r: INFO[1], ch: INFO[2], smoke: type === 'volcano', shake: type === 'quake', meteor: type === 'meteor' });
      toast(INFO[2] + ' ⚠️'); haptic('warning');
      nextMajor = tick + (L === 1 ? 1500 : 600);
    }
  }
}
function processDisasters() {
  for (let i = pendingDis.length - 1; i >= 0; i--) {
    const d = pendingDis[i]; if (tick < d.at) continue;
    pendingDis.splice(i, 1);
    if (d.type === 'bolt') strikeBolt(d.x, d.y, 1);
    else if (d.type === 'meteor') strikeMeteor(d.x, d.y, 4 + ri(0, 1));
    else if (d.type === 'quake') strikeQuake(d.x, d.y);
    else if (d.type === 'flood') strikeFlood(d.x, d.y);
    else eruptVolcano(d.x, d.y);
  }
}

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
    case 'bolt': strikeBolt(wx, wy, Math.max(1, r >> 1)); break;
    case 'meteor': strikeMeteor(wx, wy, 4 + (r >> 1)); break;
    case 'enlighten': {
      const list = kingdomsAt(wx, wy, r);
      for (const kk of list) grantTech(kk);
      fx('bless', wx, wy); haptic('tap');
      break;
    }
    case 'grace': case 'plague': case 'revolt': case 'peace': case 'unite': case 'split': {      // realm powers act once per touch
      if (compDirty) computeComps();
      const list = kingdomsAt(wx, wy, r);
      if (!list.length) { toast('🏰 ?'); break; }
      const k = list[0];
      if (tool === 'grace') {
        for (const kk of list) {
          kk.food = Math.min(400, kk.food + 120); kk.wood = Math.min(250, kk.wood + 60); kk.stone = Math.min(250, kk.stone + 60); kk.gold = Math.min(250, kk.gold + 40);
          kk.unrest = 0; kk.immune = tick + 4000; startEvent(kk, 'golden', true);
          for (const c of creatures) if (c.k === kk.id) c.hp = c.mhp;
          fx('levelup', Math.round(kk.cx), Math.round(kk.cy));
        }
        haptic('success');
      } else if (tool === 'plague') {
        for (const kk of list) startEvent(kk, 'plague');
        haptic('warning');
      } else if (tool === 'revolt') {
        const k2 = splitKingdom(k, true);
        toast(k2 ? `🔥 ${EMOJI[k.race]}${k2.name} ⚔️ ${k.name}` : '🏚️ terlalu kecil'); haptic('warning');
      } else if (tool === 'peace') {
        let n = 0; for (const kk of list) for (const eid of [...kk.enemies]) { const e = kingdoms.get(eid); if (e) { endWar(kk, e); n++; } }
        toast(n ? '🕊️' : '🕊️ –'); haptic('tap');
      } else if (tool === 'unite') {
        let best = null, bd = 900;
        for (const o of kingdoms.values()) {
          if (o === k || o.race !== k.race || comp[o.cap] !== comp[k.cap]) continue;
          const d = (o.cx - k.cx)**2 + (o.cy - k.cy)**2; if (d < bd) { bd = d; best = o; }
        }
        if (!best) toast('🤝 –');
        else { const bigger = (k.houses + k.pop >= best.houses + best.pop) ? [k, best] : [best, k]; absorbKingdom(bigger[0], bigger[1]); toast(`🤝 ${bigger[0].name}`); haptic('success'); }
      } else if (tool === 'split') {
        const k2 = splitKingdom(k, false);
        toast(k2 ? `✂️ ${k.name} | ${k2.name}` : '🏚️ terlalu kecil'); haptic('tap');
      }
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
function evLine(k) {
  return (k.ev ? `<br>${EV_IC[k.ev.type]} ${EV_NAME[k.ev.type]}` : '') + (k.unrest >= 35 ? `<br>😠 ${Math.round(k.unrest)}%` : '');
}
function relLine(k) {
  const nm = set => [...set].map(id => kingdoms.get(id)).filter(Boolean).slice(0, 2).map(o => EMOJI[o.race] + o.name).join(', ');
  const en = nm(k.enemies), al = nm(k.allies);
  return (en ? `<br>⚔️ ${en}` : '') + (al ? `<br>🤝 ${al}` : '');
}
function kingdomHtml(k) {
  const ic = k.tech.map(id => TECH_BY[k.race + ':' + id].ic).join(''), rs = k.res ? ` · ⏳${k.res.t.ic} ${k.res.t.n}` : '';
  return `<b>${LV_ICON[k.level]} ${k.name}</b> ${EMOJI[k.race]}<br>${k.level ? '⭐'.repeat(k.level) + ' ' : ''}${LV_NAME[k.level]} · 👥${k.pop} · 🏠${k.houses}<br>🍞${k.food | 0} 🪵${k.wood | 0} 🪨${k.stone | 0} 🪙${k.gold | 0}<br>🥉${k.bronze | 0} 🔩${k.iron | 0} 🥈${k.silver | 0} · ${['Zaman Batu', 'Zaman Perunggu', 'Zaman Besi'][k.age | 0]} · 🎒${k.chest.length}/${chestCap(k)}${k.age >= 2 ? ' · 🛡' + creatures.filter(c => c.k === k.id && c.elite).length : ''}<br>🔬 ${ic || '–'}${rs}${relLine(k)}${evLine(k)}`;
}
/* ============================== CREATURE PANEL ============================== */
let selected = null, following = false, deadNote = 0;
const NAME_POOL = {
  human: [['Al', 'Bran', 'Cor', 'Da', 'Ed', 'Fen', 'Gar', 'Hal', 'Ivo', 'Jor', 'Kel', 'Lia', 'Mor', 'Nia', 'Ow', 'Per'], ['dric', 'na', 'mund', 'ra', 'wyn', 'vin', 'lo', 'ric']],
  elf: [['Ael', 'Lir', 'Sae', 'Thi', 'Nyl', 'Ere', 'Cae', 'Ily', 'Fae'], ['rin', 'wen', 'dor', 'sia', 'lian', 'vyr', 'thas']],
  dwarf: [['Bor', 'Dur', 'Gim', 'Kaz', 'Thor', 'Mor', 'Bal', 'Dwa', 'Hrol'], ['in', 'gar', 'rik', 'dok', 'li', 'mund', 'bek']],
  orc: [['Gor', 'Zug', 'Mog', 'Gra', 'Kru', 'Ugh', 'Naz', 'Bog', 'Hrak'], ['ash', 'gul', 'dak', 'rok', 'nak', 'uk', 'mash']],
  werewolf: [['Lun', 'Fen', 'Va', 'Gre', 'Nox', 'Ulv', 'Sko', 'Mar'], ['fang', 'ra', 'mar', 'wyr', 'claw', 'howl']],
  sheep: ['Wolly', 'Puff', 'Awan', 'Mbek', 'Kapas', 'Bulu'], rabbit: ['Hop', 'Fluff', 'Lompat', 'Nibble', 'Kenyal', 'Cebol'],
  deer: ['Elm', 'Fawn', 'Aspen', 'Rimba', 'Birch', 'Embun'], wolf: ['Fang', 'Shadow', 'Ash', 'Kelam', 'Taring', 'Grey'],
  ram: ['Pendobrak'], catapult: ['Katapel'], dcatapult: ['Katapel Besi'], cart: ['Gerobak'],
};
const DESC = {
  human: 'Petani dan pembangun yang giat. Cepat berkembang biak dan pandai berdagang.',
  elf: 'Penjaga hutan berumur panjang. Pemanah ulung yang mencintai alam.',
  dwarf: 'Penambang tangguh dari perbukitan. Ahli menempa dan mencari logam.',
  orc: 'Pejuang buas yang hidup dari perang dan rampasan.',
  werewolf: 'Serigala yang berevolusi. Netral, makin kuat di malam hari.',
  sheep: 'Hewan jinak pemakan rumput. Mangsa serigala.',
  wolf: 'Pemburu buas. Menyerang domba, kelinci dan rusa, bahkan manusia saat lapar.',
  rabbit: 'Lincah dan cepat berkembang biak. Lari dari serigala.',
  deer: 'Penghuni hutan yang pemalu. Lari dari serigala.',
  ram: 'Mesin pengepung orc. Menghantam dinding musuh.',
  catapult: 'Mesin pengepung manusia. Melempar batu dari jauh.',
  dcatapult: 'Katapel besi kurcaci. Melempar batu dari jauh.',
  cart: 'Gerobak dagang yang membawa barang antar kerajaan.',
};
const TYPE_NAME = { human: 'Manusia', elf: 'Elf', dwarf: 'Kurcaci', orc: 'Orc', sheep: 'Domba', wolf: 'Serigala', rabbit: 'Kelinci', deer: 'Rusa', werewolf: 'Manusia serigala', ram: 'Pendobrak', catapult: 'Katapel', dcatapult: 'Katapel besi', cart: 'Gerobak' };
function nameFor(t, sd) {
  const P = NAME_POOL[t], h = hash(sd, 7, 11);
  return Array.isArray(P[0]) ? P[0][Math.floor(h * P[0].length)] + P[1][Math.floor(hash(sd, 9, 13) * P[1].length)] : P[Math.floor(h * P.length)];
}
function nameOf(c) { return c.nm || (c.nm = nameFor(c.t, c.nid === undefined ? c.id : c.nid)); }
function roleOf(c) {
  const R = RACES[c.t];
  if (R.cart) return 'Pedagang'; if (R.engine) return 'Mesin perang';
  if (c.elite) return 'Ksatria besi'; if (c.lead) return 'Pemimpin';
  if (R.civ) return isSoldier(c) ? 'Prajurit' : 'Warga';
  return R.hunt ? 'Pemburu' : 'Mangsa';
}
function statusOf(c) {
  const R = RACES[c.t], k = c.k ? kingdoms.get(c.k) : null, r = c.hp / c.mhp;
  if (c.hp <= 0) return 'Mati';
  if (c.pz > 0) return 'Keracunan';
  if (fire[c.x + c.y*W]) return 'Terbakar';
  if (r < .35) return 'Sekarat'; if (r < .7) return 'Terluka';
  if (R.hunt && c.en < 45) return 'Lapar';
  if (k && k.enemies.size && (c.elite || c.lead || isSoldier(c))) return 'Berperang';
  return 'Sehat';
}
function portraitURL(t) {
  if (!ICON['cr:' + t]) { const sp = ATLAS[t].A, cv2 = document.createElement('canvas'); cv2.width = Math.max(16, sp.width); cv2.height = Math.max(16, sp.height); cv2.getContext('2d').drawImage(sp, Math.floor((cv2.width - sp.width) / 2), cv2.height - sp.height); ICON['cr:' + t] = cv2; }
  return iconURL('cr:' + t);
}
let ptab = 0, invSel = -1, chSel = -1;                           // panel tab (0 info, 1 family, 2 bag, 3 chest) and the selected bag / chest item
const itemName = (race, sl, t, e) => (GEAR_NAME[race] || GEAR_NAME.human)[sl][t - 1] + (e ? ' ' + ENCH[e].n : '');
const itemTip = (sl, t, e) => [`+${Math.round(W_ATK[t] * 100)}% serangan`, `+${Math.round(A_DEF[t] * 100)}% pertahanan, +${A_HP[t]} hp`, `+${Math.round(S_DEF[t] * 100)}% pertahanan`][sl] + (e ? ` · ${ENCH[e].d}` : '');
const chestOf = c => { const k = c && c.k ? kingdoms.get(c.k) : null; return k ? k.chest : null; };
function curSel() {                                                     // the selected bag or chest item: { arr, i, it }
  if (invSel >= 0 && inv[invSel]) return { arr: inv, i: invSel, it: inv[invSel] };
  const ch = chestOf(selected); if (chSel >= 0 && ch && ch[chSel]) return { arr: ch, i: chSel, it: ch[chSel] };
  return null;
}
function relatives(c) {
  const by = new Map(), kids = [];
  for (const o of creatures) if (o.hp > 0 && o.t === c.t && o.nid !== undefined) { by.set(o.nid, o); if (o !== c && c.nid !== undefined && (o.pa === c.nid || o.pb === c.nid)) kids.push(o); }
  return { by, kids };
}
function creatureHtml(c) {
  const R = RACES[c.t], k = c.k ? kingdoms.get(c.k) : null, hp = Math.max(0, c.hp / c.mhp), st = statusOf(c), civ = R.civ && GEAR_NAME[c.t];
  const col = hp > .6 ? '#5fdc6a' : hp > .3 ? '#ffcf4a' : '#ff5a4a', bar = (ic, pct, cl) => `<div class="bar">${ic}<u><i style="width:${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%;background:${cl}"></i></u></div>`;
  const ench = e => e ? ` style="border-color:${ENCH[e].c};box-shadow:0 0 10px ${ENCH[e].c}88"` : '';
  let h = `<div class="ibtns"><button class="awb ibt${following ? ' on' : ''}" data-act="follow">🎯</button><button class="awb ibt" data-act="close">✖</button></div>`;
  h += `<img class="pt" src="${portraitURL(c.t)}" alt=""><b>${nameOf(c)}</b><span class="tag">${roleOf(c)}</span><br>${TYPE_NAME[c.t]}${c.lead ? ' 👑' : ''}${c.elite ? ' 🛡' : ''} · ${st}`;
  const trs = TRAITS.filter((_, i) => c.tr & (1 << i));
  if (trs.length) h += `<div class="row">${trs.map(t => `<span class="tag t">${t}</span>`).join(' ')}</div>`;
  const ch = civ ? chestOf(c) : null, sel = civ ? curSel() : null, tabs = ch ? 4 : 3;
  if (civ) {                                                                // equipment slots: tap to take an item into the bag, or to wear the selected item
    h += '<div class="eq">' + [0, 1, 2].map(sl => { const t = c.eq ? c.eq[sl] : 0, e = c.ec ? c.ec[sl] : 0, rdy = sel && sel.it[0] === sl ? ' rdy' : ''; return t ? `<button class="slot t${t}${rdy}" data-act="slot" data-s="${sl}"${ench(e)}>${GEAR_ICON[sl]}${itemName(c.t, sl, t, e)}</button>` : `<button class="slot e${rdy}" data-act="slot" data-s="${sl}">${GEAR_ICON[sl]}–</button>`; }).join('') + '</div>';
    h += `<div class="tabs">${['Info', 'Keluarga', `Tas ${inv.length}`, ch ? `Peti ${ch.length}` : null].slice(0, tabs).map((n, i) => `<button class="ptab${ptab === i ? ' on' : ''}" data-act="tab" data-t="${i}">${n}</button>`).join('')}</div>`;
  }
  const tab = civ ? Math.min(ptab, tabs - 1) : 0;
  if (tab === 0) {
    h += `<span class="dsc">${DESC[c.t] || ''}</span>`;
    h += bar('❤️', hp, col) + (R.hunt ? bar('⚡', c.en / 100, '#ffd23f') : '') + bar('⏳', c.age / c.life, '#6aa8ff');
    if (civ) {
      const ev = [[tick - c.age, 0, 0]].concat(c.hist || []).slice(-4), nm = (sd) => nameFor(c.t, sd);
      h += '<div class="hist">' + ev.map(([t, code, a]) => {
        const txt = code === 0 ? (c.pa ? `Lahir, anak ${nm(c.pa)}${c.pb ? ' & ' + nm(c.pb) : ''}` : 'Lahir') : code === 8 ? `Mendapat ${itemName(c.t, 0, a)}` : code === 9 ? `Mengenakan ${itemName(c.t, 1, a)}`
          : code === 10 ? `Bergabung dengan ${a}` : code === 12 ? `Menerima ${itemName(c.t, a >> 2, a & 3)}` : code === 13 ? `${itemName(c.t, a >> 2, a & 3)} diambil` : code === 14 ? `Berpasangan dengan ${nm(a)}` : code === 15 ? `Anak lahir: ${nm(a)}` : code === 16 ? `Merampas ${itemName(c.t, a >> 2, a & 3)}` : code === 17 ? `Memungut ${itemName(c.t, a >> 2, a & 3)}` : HIST_TXT[code] || '';
        return `<em>Thn ${Math.max(0, Math.floor(t / 120))}</em> ${txt}`;
      }).join('<br>') + '</div>';
    }
    h += `<div class="row">${(c.age / 120).toFixed(1)}/${(c.life / 120).toFixed(1)}${c.kills ? ' · ⚔️ ' + c.kills : ''}${k ? ` · ${LV_ICON[k.level]} ${k.name} ${EMOJI[k.race]}` : ''}</div>`;
  } else if (tab === 1) {
    const rel = relatives(c), chip = (nid) => { if (!nid) return '–'; const o = rel.by.get(nid); return o ? `<button class="rel" data-act="sel" data-id="${o.id}">${nameFor(c.t, nid)}</button>` : `<span class="rel dead">${nameFor(c.t, nid)} †</span>`; };
    h += `<div class="fam"><div><u>Pasangan</u> ${chip(c.sp)}</div><div><u>Orang tua</u> ${c.pa ? chip(c.pa) + (c.pb ? ' ' + chip(c.pb) : '') : '–'}</div>`;
    h += `<div><u>Anak</u> ${c.ch ? `${c.ch} lahir · ${rel.kids.length} hidup` : '–'}</div>${rel.kids.length ? `<div>${rel.kids.slice(0, 8).map(o => chip(o.nid)).join(' ')}</div>` : ''}</div>`;
  } else {
    const isChest = tab === 3, arr = isChest ? ch : inv, cap = isChest ? chestCap(k) : INV_MAX, selIdx = isChest ? chSel : invSel;
    h += `<div class="bag${isChest ? ' sm' : ''}">` + Array.from({ length: cap }, (_, i) => { const it = arr[i]; return it ? `<button class="bi t${it[1]}${i === selIdx ? ' sel' : ''}" data-act="${isChest ? 'chs' : 'inv'}" data-i="${i}"${ench(it[3])}>${GEAR_ICON[it[0]]}<small>${'I'.repeat(it[1])}${it[3] ? '✨' : ''}</small></button>` : '<span class="bi e"></span>'; }).join('') + '</div>';
    const s2 = sel && sel.arr === arr ? sel.it : null;
    h += `<div class="row">${s2 ? `${itemName(s2[2], s2[0], s2[1], s2[3])} · ${itemTip(s2[0], s2[1], s2[3] | 0)} · 🪙${sellPrice(s2)}` : arr.length ? 'Ketuk item: pakaikan lewat slot di atas, atau pilih tombol' : isChest ? 'Peti kosong: penduduk membawa temuan ke sini' : 'Tas kosong: ketuk slot perlengkapan di atas, atau item di tanah'}</div>`;
    if (s2) h += `<div class="tabs">${isChest ? '<button class="ptab" data-act="fetch">Ke tas</button>' : (ch && ch.length < chestCap(k) ? '<button class="ptab" data-act="store">Ke peti</button>' : '') + '<button class="ptab" data-act="drop">Jatuhkan</button>'}<button class="ptab" data-act="sell">Jual 🪙</button></div>`;
  }
  return h;
}
function dropFromBag(c) {                                              // put the selected bag item on the ground two tiles in front of the creature
  const it = invSel >= 0 ? inv[invSel] : null; if (!it) return;
  if (addDrop(c.x + (c.face < 0 ? -2 : 2), c.y, it[0], it[1], it[2], it[3])) { inv.splice(invSel, 1); invSel = -1; toast(GEAR_ICON[it[0]] + ' ↓'); haptic('tap'); dirty = true; }
}
function pickDropAt(px, py) {
  const fx0 = (px - ox) / sc, fy0 = (py - oy) / sc; let best = null, bd = 1.2;
  for (const d of drops) { const dd = (d.x + .5 - fx0) ** 2 + (d.y + .5 - fy0) ** 2; if (dd < bd) { bd = dd; best = d; } }
  return best;
}
function takeDrop(d) {
  if (inv.length >= INV_MAX) { toast('🎒 penuh'); return; }
  inv.push([d.s, d.t, d.r, d.e]); removeDrop(d); toast('🎒 ' + itemName(d.r, d.s, d.t, d.e)); haptic('tap');
}
function sellSel(c) {                                                  // sell the selected bag / chest item to the market; the gold goes to the creature's kingdom
  const s2 = curSel(), k = c.k ? kingdoms.get(c.k) : null; if (!s2) return;
  if (!k) { toast('🏰 ?'); return; }
  const it = s2.arr.splice(s2.i, 1)[0], p = sellPrice(it);
  invSel = chSel = -1; k.gold = Math.min(250, k.gold + p); shopAdd(it, p); market.sold = (market.sold | 0) + 1; toast('🪙 +' + p); haptic('success'); dirty = true;
}
function moveItem(c, toChest) {
  const s2 = curSel(), ch = chestOf(c), k = c.k ? kingdoms.get(c.k) : null; if (!s2 || !ch || !k) return;
  if (toChest) { if (s2.arr !== inv || ch.length >= chestCap(k)) return; ch.push(inv.splice(s2.i, 1)[0]); invSel = -1; }
  else { if (s2.arr !== ch || inv.length >= INV_MAX) { if (inv.length >= INV_MAX) toast('🎒 penuh'); return; } inv.push(ch.splice(s2.i, 1)[0]); chSel = -1; }
  haptic('tap'); dirty = true;
}
function slotAction(c, sl) {
  if (!c.eq) c.eq = [0, 0, 0]; if (!c.ec) c.ec = [0, 0, 0];
  const s2 = curSel();
  if (s2) {
    const it = s2.it;
    if (it[0] !== sl) { toast(GEAR_ICON[it[0]] + ' ≠ ' + GEAR_ICON[sl]); return; }
    const oT = c.eq[sl], oE = c.ec[sl]; c.eq[sl] = it[1]; c.ec[sl] = it[3] | 0;
    if (oT) s2.arr[s2.i] = [sl, oT, c.t, oE]; else s2.arr.splice(s2.i, 1);
    addHist(c, 12, sl * 4 + it[1]); invSel = chSel = -1; applyStats(c); toast(GEAR_ICON[sl] + ' ' + itemName(c.t, sl, c.eq[sl], c.ec[sl])); haptic('tap'); dirty = true; return;
  }
  const t = c.eq[sl];
  if (!t) { toast(GEAR_ICON[sl] + ' –'); return; }
  if (inv.length >= INV_MAX) { toast('🎒 penuh'); return; }
  inv.push([sl, t, c.t, c.ec[sl]]); c.eq[sl] = 0; c.ec[sl] = 0; addHist(c, 13, sl * 4 + t); applyStats(c); toast('🎒 ' + itemName(c.t, sl, t, inv[inv.length - 1][3])); haptic('tap'); dirty = true;
}
function pickCreatureAt(px, py) {                                   // nearest creature to a screen point (sprites stand above their tile)
  const fx0 = (px - ox) / sc, fy0 = (py - oy) / sc; let best = null, bd = 1.7;
  for (const c of creatures) {
    if (c.hp <= 0) continue;
    const d = (c.dx + .5 - fx0) ** 2 + (c.dy - .1 - fy0) ** 2; if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function showCreature(c) { selected = c; invSel = chSel = -1; following = false; deadNote = 0; clearTimeout(infoT); infoLast = infoEl.innerHTML = creatureHtml(c); infoEl.style.display = 'block'; }
function closeCreature() { selected = null; following = false; deadNote = 0; infoEl.style.display = 'none'; }
function refreshCreature() {
  if (!selected) return;
  if (selected.hp <= 0) { if (!deadNote) { deadNote = 1; infoEl.innerHTML = `<div class="ibtns"><button class="awb ibt" data-act="close">✖</button></div><img class="pt" src="${portraitURL(selected.t)}" alt=""><b>${nameOf(selected)}</b><span class="tag">Mati</span><br>${TYPE_NAME[selected.t]} · ${selected.cause === 'old' ? '⏳' : '💀'}`; setTimeout(() => { if (deadNote) closeCreature(); }, 2200); } return; }
  if (infoHold) return;                                              // do not rebuild the buttons under a finger
  const h = creatureHtml(selected); if (h !== infoLast) { infoLast = h; infoEl.innerHTML = h; }
}
infoEl.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'close') closeCreature();
  else if (a.dataset.act === 'follow') { following = !following; infoHold = false; refreshCreature(); }
  else if (!selected) return;
  else if (a.dataset.act === 'tab') { ptab = +a.dataset.t; infoHold = false; refreshCreature(); }
  else if (a.dataset.act === 'slot') { slotAction(selected, +a.dataset.s); infoHold = false; refreshCreature(); }
  else if (a.dataset.act === 'drop') { dropFromBag(selected); infoHold = false; refreshCreature(); }
  else if (a.dataset.act === 'inv') { invSel = invSel === +a.dataset.i ? -1 : +a.dataset.i; chSel = -1; infoHold = false; refreshCreature(); }
  else if (a.dataset.act === 'chs') { chSel = chSel === +a.dataset.i ? -1 : +a.dataset.i; invSel = -1; infoHold = false; refreshCreature(); }
  else if (a.dataset.act === 'sell') { sellSel(selected); infoHold = false; refreshCreature(); }
  else if (a.dataset.act === 'store') { moveItem(selected, true); infoHold = false; refreshCreature(); }
  else if (a.dataset.act === 'fetch') { moveItem(selected, false); infoHold = false; refreshCreature(); }
  else if (a.dataset.act === 'sel') { const t = creatures.find(o => o.id === +a.dataset.id && o.hp > 0); if (t) { showCreature(t); } }
});
let infoHold = false, infoLast = '';
infoEl.addEventListener('pointerdown', () => { infoHold = true; });
window.addEventListener('pointerup', () => { infoHold = false; });
window.addEventListener('pointercancel', () => { infoHold = false; });
function inspectAt(wx, wy) {
  const NM = { human:'Manusia', elf:'Elf', dwarf:'Kurcaci', orc:'Orc', sheep:'Domba', wolf:'Serigala', rabbit:'Kelinci', deer:'Rusa', werewolf:'Manusia serigala' };
  closeCreature();
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
// One finger: a quick tap uses the tool, dragging pans the map (with a little momentum), and holding still for ~0.25 s switches to painting so the tool can be dragged.
let pend = null, holdT = 0, velX = 0, velY = 0, inertia = false;
const PAN_SLOP = 10, HOLD_MS = 250;
function startPaint() {
  painting = true; lastApply = performance.now(); pend.held = true;
  const h = toWorld(pend.x, pend.y); hover = h;
  applyTool(h[0], h[1]); reapDead(); haptic('tap');
}
cv.addEventListener('pointerdown', e => {
  const p = cpos(e);
  if (!inView(p)) return;
  cv.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: p[0], y: p[1] });
  lastPointer = p; inertia = false; velX = velY = 0;
  if (ptrs.size >= 2) { clearTimeout(holdT); pend = null; painting = false; panning = true; hover = null; return; }
  if (tool === 'hand' || e.button === 1 || e.button === 2) { panning = true; return; }
  hover = toWorld(p[0], p[1]);
  pend = { id: e.pointerId, x0: p[0], y0: p[1], x: p[0], y: p[1], held: false, moved: false };
  if (!(tool === 'inspect' || (editMode && !editTool()))) { clearTimeout(holdT); holdT = setTimeout(() => { if (pend && !pend.moved && !pend.held) startPaint(); }, HOLD_MS); }
});
cv.addEventListener('pointermove', e => {
  const p = cpos(e);
  if (!ptrs.has(e.pointerId)) { hover = toWorld(p[0], p[1]); return; }
  const s = ptrs.get(e.pointerId);
  const ddx = p[0] - s.x, ddy = p[1] - s.y; s.x = p[0]; s.y = p[1];
  if (pend && e.pointerId === pend.id) {
    pend.x = p[0]; pend.y = p[1];
    if (!pend.held && !pend.moved && Math.hypot(p[0] - pend.x0, p[1] - pend.y0) > PAN_SLOP) { pend.moved = true; clearTimeout(holdT); panning = true; hover = null; }
  }
  if (ptrs.size === 2) { ox += ddx / 2; oy += ddy / 2; clampCam(); }
  else if (panning) { following = false; ox += ddx; oy += ddy; clampCam(); velX = velX * .6 + ddx * .4; velY = velY * .6 + ddy * .4; }
  else if (!painting) hover = toWorld(p[0], p[1]);
  else hover = toWorld(p[0], p[1]);
  lastPointer = p;
});
const endPtr = e => {
  ptrs.delete(e.pointerId);
  if (pend && e.pointerId === pend.id) {
    clearTimeout(holdT);
    if (!pend.moved && !pend.held && e.type === 'pointerup') {                 // a tap
      const h = toWorld(pend.x0, pend.y0); hover = h;
      const pk = !editMode && (tool === 'inspect' || (TOOLS[tool] && TOOLS[tool].g === 'life')) ? pickCreatureAt(pend.x0, pend.y0) : null;
      const dk = !pk && !editMode && (tool === 'inspect' || (TOOLS[tool] && TOOLS[tool].g === 'life')) ? pickDropAt(pend.x0, pend.y0) : null;
      if (pk) showCreature(pk);
      else if (dk) takeDrop(dk);
      else if (tool === 'inspect') inspectAt(h[0], h[1]);
      else if (!(editMode && !editTool())) { applyTool(h[0], h[1]); reapDead(); if (editMode) persistWorld(); }
    }
    pend = null;
  }
  if (ptrs.size === 0) {
    if (painting && editMode) persistWorld();
    inertia = panning && Math.hypot(velX, velY) > 2;
    painting = false; panning = false; if (e.pointerType !== 'mouse') hover = null;
  } else if (ptrs.size === 1) { painting = false; panning = true; velX = velY = 0; }
};
cv.addEventListener('pointerup', endPtr);
cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', e => e.preventDefault(), { passive:false });   // zoom is button-only
const onKey = e => { if (e.code === 'KeyP' && !editMode) togglePause(); if (e.key === '[') setBrush(brush - 1); if (e.key === ']') setBrush(brush + 1); };
window.addEventListener('keydown', onKey);

/* ============================== UI ============================== */
const GROUPS = editMode ? [['terrain','⛰️'], ['world','🌍']] : [['terrain','⛰️'], ['life','🧑'], ['powers','⚡'], ['realm','👑'], ['world','🌍']];
let group = editMode ? 'terrain' : 'powers';
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
  floods.length = 0; pendingDis.length = 0;
  setSize(idx == null ? sizeIdx : idx);
  generate(1 + ((Math.random() * 1e6) | 0));
  if (!editMode) { seedResources(); seedVolcanoes(); populate(); }
  startCamera(); persistWorld(); dirty = true; if (!editMode) clearSave();
}
/* ---- leaderboard: "civilization score" ---- */
let bestSent = 0, lbBusy = false;
function civScore() {                                        // population, houses, level and tech of every kingdom, plus years survived
  let sc = 0;
  for (const k of kingdoms.values()) sc += k.pop*2 + k.houses*3 + k.level*60 + k.tech.length*40 + (k.age | 0)*50 + ((k.bronze | 0) + (k.iron | 0) + (k.silver | 0))*.5;
  return Math.round(sc + (tick / 120) * 2 + market.trades * 3);
}
function showBoard(html) { infoEl.innerHTML = html; infoEl.style.display = 'block'; clearTimeout(infoT); infoT = setTimeout(() => infoEl.style.display = 'none', 9000); }
async function submitScore(show) {                           // submit only personal bests, so the board never goes backwards
  const score = civScore();
  if (lbBusy || editMode || !lib.addPlayerScoreToLeaderboard) { if (show) toast('🏆 ' + score); return; }
  lbBusy = true;
  try {
    let r;
    if (score > bestSent) { r = await lib.addPlayerScoreToLeaderboard(score, 5); bestSent = score; dirty = true; }
    else if (lib.getTopNEntriesFromLeaderboard) r = await lib.getTopNEntriesFromLeaderboard(5);
    if (show) {
      const rows = r && r.entries ? r.entries.slice(0, 5).map((e, i) => `${i + 1}. ${e.username} · ${e.score}`).join('<br>') : '';
      showBoard(`<b>🏆 ${score}</b>${r && r.userRank ? ` · #${r.userRank}` : ''}${bestSent ? ` · ⭐ ${bestSent}` : ''}${rows ? '<br>' + rows : ''}`);
    }
  } catch (e) { if (show) toast('🏆 ' + score); }
  lbBusy = false;
}
const WORLD_ACTIONS = [
  { ic:'🗺️', fn: () => confirmThen('new', 'Dunia baru', () => { newWorld(); toast('🗺️ ' + SIZES[sizeIdx].label); }) },
  ...SIZES.map((z, i) => ({ ic: z.name, on: () => sizeIdx === i,
    fn: () => confirmThen('size' + i, `${z.label} ${z.w}×${z.h}`, () => { newWorld(i); renderRow2(); toast(`🗺️ ${z.label} ${z.w}×${z.h}`); }) })),
  { ic:'🌊', fn: () => confirmThen('ocean', 'Lautan kosong', () => { floods.length = 0; pendingDis.length = 0; emptyWorld(); currentSeed = 0; startCamera(); persistWorld(); dirty = true; toast('🌊'); }) },
  ...(editMode ? [] : [
    { ic:'🐾', fn: () => { populate(1); toast('🐾'); } },
    { ic:'🧹', fn: () => confirmThen('clear', 'Hapus makhluk & rumah', () => { creatures = []; bld.fill(0); counts = {}; houseCount = 0; dirty = true; toast('🧹'); }) },
  ]),
  ...(editMode ? [] : [{ ic:'🏦', fn: () => showBoard(marketHtml()) }]),
  ...(editMode ? [] : [{ ic:'🏆', fn: () => submitScore(true) }]),
  { ic:'🚩', on: () => showBorders, fn: () => { showBorders = !showBorders; renderRow2(); toast(showBorders ? '🚩 on' : '🚩 off'); } },
  ...(editMode ? [] : [{ ic:'☄️', on: () => disasterLvl > 0, fn: () => { disasterLvl = (disasterLvl + 1) % 3; pendingDis.length = 0; dirty = true; renderRow2(); toast('☄️ Bencana: ' + DIS_NAMES[disasterLvl]); } }]),
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
  const chip = (ch, n) => `<span>${ch}${n}</span>`;
  let h1 = '', h2 = '';
  if (editMode) { yearEl.textContent = '✏️'; }
  else {
    yearEl.textContent = '📅 ' + Math.floor(tick / 120);
    for (const r of ['human', 'elf', 'dwarf', 'orc', 'werewolf']) if (r !== 'werewolf' || counts.werewolf) h1 += chip(EMOJI[r], counts[r] || 0);
    h1 += chip('🏰', kingdoms.size) + chip('🏠', houseCount);
    for (const r of ['sheep', 'rabbit', 'deer', 'wolf']) h2 += chip(EMOJI[r], counts[r] || 0);
    let wars = 0; for (const r of rels.values()) if (r.s === 1) wars++;
    h2 += chip('⚔️', wars);
    let sick = 0; for (const k of kingdoms.values()) if (k.ev && k.ev.type === 'plague') sick++;
    if (sick) h2 += chip('☠️', sick);
  }
  statsEl.innerHTML = h1; stats2El.innerHTML = h2;
}

/* ============================== SAVE / LOAD (play mode) ============================== */
function clearSave() { try { lib.deleteUserGameState && lib.deleteUserGameState(); } catch (e) {} }
function serialize() {
  const fl = floods.filter(f => tiles[f.i] === T.SHALLOW);
  for (const f of fl) tiles[f.i] = f.orig;                  // flooded land is saved dry
  try { return serialize2(); } finally { for (const f of fl) tiles[f.i] = T.SHALLOW; }
}
function serialize2() {
  const kl = [...kingdoms.values()], kix = new Map(kl.map((k, n) => [k.id, n + 1]));
  const bl = [], bk = [];
  for (let i = 0; i < N; i++) if (bld[i]) { bl.push(i * 8 + bld[i]); bk.push(kix.get(kid[i]) || 0); }     // bk: kingdom (1-based) of each house
  return { v: 8, z: sizeIdx, seed: currentSeed, tiles: rleEncode(), bld: bl, bk, tick, bs: bestSent, dl: disasterLvl, mk: COMM.map(c => +market.p[c].toFixed(2)), mt: market.trades, rs: nodes.filter(i => oreT[i]).map(i => i * 8 + oreT[i]), ra: nodes.filter(i => oreT[i]).map(i => oreA[i]),
    rl: [...rels].map(([key, r]) => [kix.get(Math.floor(key / 65536)) || 0, kix.get(key % 65536) || 0, r.s, r.t, r.until]).filter(x => x[0] && x[1]),
    kg: kl.map(k => [RACES[k.race].bi, Math.round(k.cx), Math.round(k.cy), k.level, k.food | 0, k.wood | 0, k.stone | 0, k.gold | 0, k.born, k.name, k.tech.length, k.ev ? EV_ID.indexOf(k.ev.type) : 0, k.ev ? k.ev.left : 0, Math.round(k.unrest), Math.max(0, k.immune - tick), k.silver | 0, k.bronze | 0, k.iron | 0, k.age | 0, k.chest.map(i => [i[0], i[1], RN.indexOf(i[2]), i[3] | 0])]),
    cr: creatures.filter(c => !RACES[c.t].engine).map(c => (c.y * W + c.x) * 10 + RN.indexOf(c.t)),
    el: creatures.filter(c => !RACES[c.t].engine).reduce((a, c, j) => { if (c.elite) a.push(j); return a; }, []),
    ex: creatures.filter(c => !RACES[c.t].engine).reduce((a, c, j) => { if (RACES[c.t].civ) a.push([j, c.nid | 0, c.tr | 0, tick - c.age, c.kills | 0, c.eq ? c.eq[0] | c.eq[1] << 2 | c.eq[2] << 4 : 0, c.hist || [], c.pa | 0, c.pb | 0, c.sp | 0, c.ch | 0, c.ec ? c.ec[0] | c.ec[1] << 4 | c.ec[2] << 8 : 0]); return a; }, []),
    inv: inv.map(i => [i[0], i[1], RN.indexOf(i[2]), i[3] | 0]),
    vc: volcanoes.map(v => v.i),
    dr: drops.map(d => [d.x, d.y, d.s, d.t, RN.indexOf(d.r), tick - d.b, d.e | 0]) };      // one packed int per creature
}
function restore(s) {
  if (!s || !(s.v >= 1 && s.v <= 8)) return false;
  setSize(s.v === 1 ? 0 : s.z);                                                 // v1 saves were always the small map
  if (!rleDecode(s.tiles)) return false;
  currentSeed = s.seed || 0; tick = s.tick || 0; bestSent = s.bs || 0; disasterLvl = s.dl == null ? 1 : s.dl; pendingDis.length = 0; floods.length = 0;
  const hl = [];
  for (const v of s.bld || []) { const i = v >> 3, b = v & 7; if (i < N && b >= 1 && b <= 5) { bld[i] = b; hl.push(i); } else hl.push(-1); }
  const ids = [];
  for (const a of s.kg || []) {                                              // saved kingdoms
    const race = BUILD_OWNER[a[0]]; if (!race) { ids.push(0); continue; }
    const k = newKingdom(race, a[1], a[2]);
    Object.assign(k, { level: a[3], food: a[4], wood: a[5], stone: a[6], gold: a[7], born: a[8] || 0, name: a[9] || k.name });
    for (const t of TECHS[race].slice(0, a[10] || 0)) { k.tech.push(t.id); if (t.lm) placeLandmark(k, t.lm); }       // techs are sequential: store only how many
    recalcMods(k);
    if (a[11]) k.ev = { type: EV_ID[a[11]], left: a[12] || 600 };
    k.unrest = a[13] || 0; k.immune = tick + (a[14] || 0);
    k.silver = a[15] || 0; k.bronze = a[16] || 0; k.iron = a[17] || 0; k.age = a[18] || 0; recalcMods(k);
    k.chest = (a[19] || []).filter(i => RN[i[2]]).map(i => [i[0], i[1], RN[i[2]], i[3] | 0]);
    ids.push(k.id);
  }
  if (s.rs) { nodes = []; s.rs.forEach((v, j) => { const i = v >> 3, t = v & 7; if (i < N && t >= 1 && t <= 5 && !oreT[i]) { oreT[i] = t; oreA[i] = (s.ra && s.ra[j]) || ORE_AMT[t]; nodes.push(i); } }); }
  else seedResources();
  volcanoes.length = 0; if (s.vc) { for (const i of s.vc) if (i < N) volcanoes.push({ i, x: i % W, y: (i / W) | 0, er: -1e9 }); } else seedVolcanoes();
  for (const [ia, ib, st, t0, un] of s.rl || []) { const ka = ids[ia - 1], kb = ids[ib - 1]; if (ka && kb) rels.set(rkey(ka, kb), { s: st, t: t0, until: un }); }
  rebuildRelations();
  if (s.bk) hl.forEach((i, j) => { if (i >= 0) kid[i] = ids[(s.bk[j] || 0) - 1] || 0; });      // 0 -> the next tick founds/joins one
  const spawned = [];
  if (s.mk) COMM.forEach((c, j) => { if (s.mk[j]) market.p[c] = s.mk[j]; });
  market.trades = s.mt || 0;
  for (const v of s.cr || []) {
    let ti, x, y, age = -1;
    if (Array.isArray(v)) { ti = v[0]; x = v[1]; y = v[2]; age = v[3]; }
    else { const m = s.v >= 4 ? 10 : s.v === 3 ? 8 : 6; ti = v % m; const pos = (v / m) | 0; x = pos % W; y = (pos / W) | 0; }
    const c = RN[ti] ? spawn(RN[ti], x, y, true) : null;
    if (c) c.age = age >= 0 ? age : Math.floor(c.life * rnd(0, .4));
    spawned.push(c);
  }
  for (const r of s.ex || []) {                                          // names, traits, gear, history of settlers
    const c = spawned[r[0]]; if (!c) continue;
    const R = RACES[c.t]; c.nid = r[1]; c.tr = r[2]; c.kills = r[4]; c.eq = [r[5] & 3, (r[5] >> 2) & 3, (r[5] >> 4) & 3]; c.hist = r[6] || []; c.pa = r[7] || 0; c.pb = r[8] || 0; c.sp = r[9] || 0; c.ch = r[10] || 0; c.ec = [(r[11] || 0) & 15, ((r[11] || 0) >> 4) & 15, ((r[11] || 0) >> 8) & 15]; c.lk = c.k; c.nj = 1;
    c.life = Math.round(ri(R.life[0], R.life[1]) * (c.tr & 8 ? 1.3 : 1)); c.age = Math.max(0, Math.min(c.life - 50, tick - r[3]));
  }
  for (const d of s.dr || []) if (RN[d[4]] && inb(d[0], d[1]) && !dropMap.has(d[0] + d[1]*W)) { const o = { x: d[0], y: d[1], s: d[2], t: d[3], r: RN[d[4]], b: tick - (d[5] || 0), e: d[6] | 0 }; drops.push(o); dropMap.set(o.x + o.y*W, o); }
  inv.length = 0; for (const i of s.inv || []) if (RN[i[2]] && i[0] >= 0 && i[0] < 3 && i[1] >= 1 && i[1] <= 3) inv.push([i[0], i[1], RN[i[2]], i[3] | 0]);
  let mx = nextId; for (const c of spawned) if (c && c.nid !== undefined && c.nid >= mx) mx = c.nid + 1; nextId = mx;       // new ids must not collide with saved name seeds
  for (const j of s.el || []) { const c = spawned[j]; if (c) c.elite = 1; }
  for (const c of spawned) if (c) { c.mhp = 0; applyStats(c); c.hp = c.mhp; }
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
let lastT = performance.now(), acc = 0, statT = 0, saveT = 0, lbT = 0, rafId = 0;
const myToken = (window.__awToken = (window.__awToken || 0) + 1);
function loop(now) {
  if (window.__awToken !== myToken) return;               // a newer run() took over
  const dt = Math.min(.11, (now - lastT) / 1000); lastT = now;
  if (!paused && !editMode) {
    acc += dt * TPS * speed; let n = 0;
    while (acc >= 1 && n < 30) { step(); acc--; n++; }
    if (acc > 30) acc = 0;
  }
  if (following && selected && selected.hp > 0) { ox += (VIEW.x + VIEW.w/2 - (selected.dx + .5)*sc - ox) * .18; oy += (VIEW.y + VIEW.h/2 - (selected.dy + .5)*sc - oy) * .18; clampCam(); }
  if (inertia) { ox += velX; oy += velY; velX *= .88; velY *= .88; clampCam(); if (Math.hypot(velX, velY) < .4) inertia = false; }
  if (painting && now - lastApply >= (TOOLS[tool] ? TOOLS[tool].ms : 100)) {
    lastApply = now;
    const [wx, wy] = toWorld(lastPointer[0], lastPointer[1]); hover = [wx, wy];
    applyTool(wx, wy); reapDead();
  }
  draw();
  if (now - statT > 250) { statT = now; updateStats(); refreshCreature(); }
  if (now - saveT > 15000) { saveT = now; autosave(); }
  if (!editMode && tick > 1200 && now - lbT > 60000) { lbT = now; if (civScore() > bestSent * 1.1) submitScore(false); }
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
    if (!editMode) { seedResources(); seedVolcanoes(); populate(); }
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

window.__world = { get ox() { return ox; }, get oy() { return oy; }, cam: (x, y, z) => { sc = z; ox = VIEW.x + VIEW.w/2 - (x + .5)*sc; oy = VIEW.y + VIEW.h/2 - (y + .5)*sc; clampCam(); }, get tiles() { return tiles; }, get bld() { return bld; }, get fire() { return fire; }, get size() { return sizeIdx; }, get evolutions() { return evolutions; }, get kingdoms() { return kingdoms; }, get effects() { return effects; }, get rels() { return rels; }, civScore, submitScore, get bestSent() { return bestSent; }, warStats, declareWar, splitKingdom, absorbKingdom, startEvent, eventsTick, get tickNow() { return tick; }, computeComps, diplomacyTick, grantTech, recalcMods, get kid() { return kid; }, get lastEvolve() { return lastEvolve; }, get tick() { return tick; }, get creatures() { return creatures; }, get counts() { return counts; }, step, spawn, volcanoes, parts, emit, seedVolcanoes, drops, addDrop, shop, shopTick, itemValue, rollEnchant, ENCH, get inv() { return inv; }, setFamily, get selected() { return selected; }, get following() { return following; }, market, tradeTick, eliteTick, updateMarket, serialize, restore, get nodes() { return nodes; }, get oreT() { return oreT; }, get oreA() { return oreA; }, get wallK() { return wallK; }, get wallG() { return wallG; }, applyTool, floods, disasterTick, pendingDis, get nextMajor() { return nextMajor; }, set nextMajor(v) { nextMajor = v; }, get disasterLvl() { return disasterLvl; }, set disasterLvl(v) { disasterLvl = v; }, setTool: id => { tool = id; }, get W() { return W; }, get H() { return H; }, T };
}

// The platform boots the game by calling window.run(mode); publishing bundles
// game.js into an IIFE, so run must be assigned to window explicitly.
window.run = run;
