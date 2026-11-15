/*
 * ASTRO WORLD — a WorldBox-style god-sim sandbox (portrait 720x1280).
 *
 * Concept: shape an island, drop humans / elves / dwarves / orcs / sheep / wolves, and
 * watch them build houses, breed, hunt, wage war and sail to colonize distant shores. Then
 * unleash rain, fire, lightning and meteors.
 *
 * Play mode : full simulation, all tools, autosave (lib.saveUserGameState).
 * Edit mode : simulation frozen; sculpt terrain or regenerate the world. The result is
 *             written to gameConfig.world (RLE tiles) and becomes the play-mode start map.
 */
import { pickJob, workLen, reach, swingPhase, swingCycle, isStrikeFrame, IMPACT, JOB_YIELD, CARRY, STATUS, addYield } from './jobs.js';
import { drawWorker, drawCarry } from './work_anim.js';
import { charScale, CHAR_SIZE_MIN, CHAR_SIZE_MAX } from './sizing.js';
import { birthProbability, WEREWOLF_BIRTH_RATE, warOutcome } from './sim_rules.js';
import { OBJECTIVES, objectiveValues, objectiveRatio } from './objectives.js';
import { findWaterRoute, canResearchVoyage, shipwreckProbability } from './navigation.js';

function run(mode) {
'use strict';

/* ============================== CONSTANTS ============================== */
const SCREEN_W = 720, SCREEN_H = 1280;
const VIEW = { x: 0, y: 166, w: 720, h: 852 };          // leave clear space above the two-row, non-overlapping tool dock
// Three selectable world sizes. k scales population caps (not linearly, to keep phones smooth).
const SIZES = [
  { name:'S', label:'Small',  w:120, h:148, k:1,   land:0,   coarse:0,   wc:0 },
  { name:'M', label:'Medium', w:200, h:246, k:2,   land:.39, coarse:.21, wc:.62 },
  { name:'L', label:'Large',  w:240, h:296, k:2.6, land:.40, coarse:.19, wc:.64 },
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
  werewolf: { col:'#5ef0ff', hp:40, dmg:6, mv:2, civ:1, cap:36, life:[2500,4000], foes:[], build:[T.FOREST,T.HILL,T.GRASS], bi:5, buildP:.002, spawnP:WEREWOLF_BIRTH_RATE },
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
const LV_ICON = ['🛖','🏘️','🏙️','🏰'], LV_NAME = ['Tribe','Village','Town','Kingdom'];
const LV_REQ = [ { pop:6, houses:3, wood:15 }, { pop:16, houses:7, stone:30, food:40, bronze:8 }, { pop:32, houses:12, gold:25, stone:40, iron:12, silver:10 } ];
const NAME_P = {
  human:[['Al','Ber','Cor','Dun','El','Fen','Gar','Hol','Ith','Kar','Lor','Mar'],['ia','ford','ton','mark','heim','vale']],
  elf:[['Ael','Sil','Lor','Thal','Nyr','Eri','Cael'],['wen','ael','iel','indor','ariel','anor']],
  dwarf:[['Thor','Dur','Bar','Kaz','Mor','Gim','Bal'],['in','dum','gard','hold','bek','kor']],
  orc:[['Gor','Zug','Mog','Gra','Kru','Thrak','Ugh'],['ash','gash','uk','nar','dak','mok']],
  werewolf:[['Lun','Fen','Va','Mar','Grey','Nox','Ulv'],['fang','moon','howl','pelt','mere','claw']],
};
// ---- Technology: four race arts followed by a shared Iron-Age sailing breakthrough ----
// fx keys: food/wood/stone/gold/birth/atk/def multiply; houses/radius add; range/night/loot/steal/regen/fire/farms/walls/grow are flags or maxima.
const TECHS = {
  human: [
    { id:'agri',    ic:'🌾', n:'Farming',           lv:1, cost:{ wood:30 },            fx:{ food:1.4, birth:1.1, farms:1 } },
    { id:'walls',   ic:'🧱', n:'Walls',             lv:2, cost:{ stone:60, wood:30 },  fx:{ houses:4, def:1.25, radius:2, walls:1 } },
    { id:'knight',  ic:'⚔️', n:'Knighthood',        lv:2, cost:{ gold:40, stone:50, iron:12 },  fx:{ atk:1.3, def:1.3 } },
    { id:'trade',   ic:'🪙', n:'Trade',             lv:3, cost:{ gold:80, silver:12 },            fx:{ gold:2, food:1.2, birth:1.25 } },
    { id:'voyage',  ic:'⛵', n:'Ocean Voyages',      lv:3, cost:{ wood:90, gold:30, iron:12 },    fx:{}, lm:'harbor' },
  ],
  elf: [
    { id:'forest',  ic:'🌿', n:'Living Forest',     lv:1, cost:{ wood:30 },            fx:{ wood:1.3, food:1.2, grow:1 } },
    { id:'archer',  ic:'🏹', n:'Archery',           lv:1, cost:{ wood:40, gold:20, bronze:8 },   fx:{ range:3, atk:1.1 } },
    { id:'ward',    ic:'🔥', n:'Fire Ward',         lv:2, cost:{ wood:60, stone:20, silver:8 },  fx:{ fire:1, def:1.15 } },
    { id:'treelife',ic:'🌳', n:'Tree of Life',      lv:3, cost:{ wood:120, gold:60 },  fx:{ regen:.08, birth:1.3 }, lm:'lifetree' },
    { id:'voyage',  ic:'⛵', n:'Star Navigation',    lv:3, cost:{ wood:100, gold:25, iron:10, silver:6 }, fx:{}, lm:'harbor' },
  ],
  dwarf: [
    { id:'mining',  ic:'⛏️', n:'Mining',            lv:1, cost:{ stone:20 },           fx:{ stone:2, gold:1.5 }, lm:'mine' },
    { id:'forge',   ic:'🔨', n:'Forge',             lv:2, cost:{ stone:60, gold:20, iron:15 },  fx:{ def:1.4, atk:1.2 } },
    { id:'vault',   ic:'🏦', n:'Vault',             lv:2, cost:{ gold:60, stone:60, silver:15 },  fx:{ gold:2, houses:4 } },
    { id:'hold',    ic:'🏯', n:'Mountain Hold',     lv:3, cost:{ gold:100, stone:120, iron:20 },fx:{ radius:3, def:1.5 } },
    { id:'voyage',  ic:'⛵', n:'Deep Keels',         lv:3, cost:{ wood:80, stone:45, iron:16 },    fx:{}, lm:'harbor' },
  ],
  orc: [
    { id:'camp',    ic:'🪓', n:'War Camp',          lv:1, cost:{ wood:30 },            fx:{ atk:1.25, birth:1.2 }, lm:'warbanner' },
    { id:'raid',    ic:'🩸', n:'Raiding',           lv:1, cost:{ stone:20, gold:10, bronze:8 },  fx:{ loot:1 } },
    { id:'totem',   ic:'💀', n:'Blood Totem',       lv:2, cost:{ stone:40, gold:30, bronze:10 },  fx:{ steal:.3, atk:1.15 }, lm:'bloodtotem' },
    { id:'horde',   ic:'👹', n:'The Horde',         lv:3, cost:{ gold:60, wood:60, iron:15 },   fx:{ birth:1.5, houses:4, def:1.25 } },
    { id:'voyage',  ic:'⛵', n:'War Canoes',         lv:3, cost:{ wood:90, gold:18, iron:10 },     fx:{}, lm:'harbor' },
  ],
  werewolf: [
    { id:'moon',    ic:'🌙', n:'Moon Prayer',       lv:0, cost:{ wood:20 },            fx:{ night:1.4 } },
    { id:'pack',    ic:'🐾', n:'The Pack',          lv:1, cost:{ stone:20, silver:6 },           fx:{ birth:1.4 } },
    { id:'spirit',  ic:'🔮', n:'Spirit Totem',      lv:2, cost:{ stone:40, gold:20, silver:8 },  fx:{ radius:3, regen:.05 }, lm:'spirittotem' },
    { id:'full',    ic:'🌕', n:'Full Moon',         lv:3, cost:{ gold:50, silver:10 },            fx:{ night:2, birth:1.5 } },
    { id:'voyage',  ic:'⛵', n:'Moonwake Fleet',     lv:3, cost:{ wood:80, gold:22, iron:8 },      fx:{}, lm:'harbor' },
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
  .awb{transition:transform .14s cubic-bezier(.3,1.7,.5,1)}
  .awb:active{transform:translateY(3px) scale(.95)}
  .awb.pop{animation:awselpop .32s cubic-bezier(.2,1.6,.4,1)}
  @keyframes awselpop{0%{transform:scale(.86)}60%{transform:scale(1.12)}100%{transform:scale(1)}}
  #awtag.tagin{animation:awtagin .22s ease-out}
  @keyframes awtagin{from{opacity:0;transform:translateX(-10px)}}
  .awb.on{background:linear-gradient(#4b5cac,#2c3a7e);border-color:#ffcf4a;box-shadow:inset 0 3px 0 rgba(255,255,255,.25),inset 0 -5px 0 rgba(0,0,0,.22),0 0 16px rgba(255,207,74,.5)}
  .awb .ic,.awb .ic.cr{width:48px;height:48px;vertical-align:0}
  #awtop{position:absolute;left:0;top:0;width:720px;height:108px;background:linear-gradient(#1b2658,#0e1536);border-bottom:2px solid rgba(255,216,130,.32);box-shadow:0 4px 16px rgba(0,0,0,.5),inset 0 -1px rgba(255,255,255,.06)}
  .awcap{position:absolute;top:6px;height:96px;box-sizing:border-box;display:flex;gap:6px;align-items:center;padding:6px;border-radius:34px;background:rgba(6,10,30,.55);border:2px solid rgba(160,190,255,.2);box-shadow:inset 0 2px 6px rgba(0,0,0,.35)}
  #awcapl{left:10px} #awcapr{right:10px}
  .awcap .awb{width:84px;height:84px;flex:0 0 84px;border-radius:26px}
  #awyear{position:absolute;left:206px;top:6px;width:308px;height:96px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-around;padding:0 14px;border-radius:34px;background:linear-gradient(180deg,rgba(40,52,110,.7),rgba(10,16,44,.8));border:2px solid rgba(255,216,130,.38);box-shadow:inset 0 1px rgba(255,255,255,.14),0 0 14px rgba(255,200,90,.12);font-variant-numeric:tabular-nums;cursor:pointer;touch-action:manipulation}
  #awyear .ic{width:44px;height:44px;vertical-align:0}
  #awyear .st{display:flex;flex-direction:column;align-items:center;line-height:1}
  #awyear small{font-size:15px;font-weight:800;letter-spacing:2px;color:#9fb0e8;margin-bottom:4px}
  #awyear b{font-size:40px;font-weight:900;color:#ffe9a8;text-shadow:0 2px 0 rgba(0,0,0,.5)}
  #awyear .sep{width:2px;height:48px;background:linear-gradient(transparent,rgba(255,216,130,.4),transparent)}
  #awcensus{position:absolute;left:10px;right:10px;top:114px;height:46px;display:flex;gap:8px;cursor:pointer;touch-action:manipulation}
  #awcensus:before{content:'';position:absolute;left:0;right:0;top:-8px;bottom:-22px}
  #awcensus .cs{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;height:46px;box-sizing:border-box;border-radius:23px;background:rgba(8,12,34,.78);border:2px solid rgba(160,190,255,.2);font-size:27px;font-weight:900;font-variant-numeric:tabular-nums;color:#eef3ff}
  #awcensus .cs .ic{width:30px;height:30px;vertical-align:0}
  #awcensus .cs.up{animation:awup .9s ease-out} #awcensus .cs.dn{animation:awdn .9s ease-out}
  #awcensus .more{flex:0 0 60px}
  #awcensus .more:after{content:'';border:9px solid transparent;border-top-color:#ffd870;margin-top:9px;transition:transform .2s}
  #awcensus.open .more:after{transform:rotate(180deg);margin-top:-9px}
  @keyframes awup{0%{border-color:#65df9a;color:#9dffc4;box-shadow:0 0 14px rgba(101,223,154,.55)}35%{transform:scale(1.07)}100%{box-shadow:none}}
  @keyframes awdn{0%{border-color:#ff7a6a;color:#ffb0a6;box-shadow:0 0 14px rgba(255,122,106,.55)}35%{transform:scale(1.07)}100%{box-shadow:none}}
  #awmm{position:absolute;left:10px;top:176px;z-index:5;padding:6px;border-radius:20px;background:rgba(8,12,34,.74);border:2px solid rgba(255,216,130,.32);box-shadow:0 6px 18px rgba(0,0,0,.4)}
  #awmm canvas{position:relative;left:auto;top:auto;display:block;border-radius:12px;image-rendering:pixelated;touch-action:none;cursor:crosshair}
  #awmm .awb.mmt{position:absolute;right:-14px;top:-14px;width:48px;height:48px;flex:none;border-radius:24px}
  #awmm .awb.mmt .ic{width:28px;height:28px}
  #awmm.shut{padding:0;background:none;border:none;box-shadow:none}
  #awmm.shut canvas{display:none}
  #awmm.shut .awb.mmt{position:static;width:64px;height:64px;border-radius:22px}
  #awmm.shut .awb.mmt .ic{width:36px;height:36px}
  #awalerts{position:absolute;right:10px;top:376px;z-index:5;display:flex;flex-direction:column;gap:10px}
  .al{position:relative;width:84px;height:84px;border-radius:28px;border:3px solid var(--ac,#ff6a5a);background:linear-gradient(#3a1f2c,#1a0f1a);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;animation:awalert 1.5s ease-in-out infinite}
  .al .ic{width:48px;height:48px;vertical-align:0}
  .al b{position:absolute;right:-6px;bottom:-6px;min-width:30px;height:30px;box-sizing:border-box;padding:0 6px;border-radius:15px;background:var(--ac,#ff6a5a);color:#fff;font-size:20px;font-weight:900;display:flex;align-items:center;justify-content:center}
  .al.plague{--ac:#65df9a} .al.kraken{--ac:#c27bff} .al.volcano{--ac:#ff9a3a}
  .al:active{transform:scale(.94)}
  @keyframes awalert{0%,100%{box-shadow:0 0 0 0 rgba(255,106,90,.5)}50%{box-shadow:0 0 0 12px rgba(255,106,90,0)}}
  #awzoom{position:absolute;right:10px;top:180px;z-index:5;display:flex;flex-direction:column;gap:4px;padding:6px;border-radius:34px;background:rgba(8,12,34,.62);border:2px solid rgba(255,216,130,.25);box-shadow:0 6px 18px rgba(0,0,0,.4)}
  #awzoom .awb{width:84px;height:84px;flex:0 0 84px;border-radius:26px;font-size:46px}
  #awsheetbg{position:absolute;left:0;top:166px;width:720px;height:784px;display:none;z-index:6}
  #awsheet{position:absolute;left:10px;right:10px;top:170px;display:none;z-index:7;box-sizing:border-box;padding:14px 16px 18px;border-radius:30px;background:linear-gradient(#1c2760,#0b1132);border:2px solid rgba(255,216,130,.4);box-shadow:0 18px 50px rgba(0,0,0,.6),inset 0 1px rgba(255,255,255,.14);animation:awpop .25s ease-out}
  #awsheet .sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-size:32px;font-weight:900;color:#ffe9a8}
  #awsheet .sh .awb{width:76px;height:76px;flex:0 0 76px;border-radius:24px;font-size:36px}
  #awsheet .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  #awsheet .grp{padding:10px 14px 8px;border-radius:20px;background:rgba(120,150,255,.09);border:1px solid rgba(160,190,255,.2)}
  #awsheet h4{margin:0 0 6px;font-size:18px;letter-spacing:2px;color:#9fb0e8;font-weight:900;text-transform:uppercase}
  #awsheet .rw{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:8px;height:44px;font-size:23px;font-weight:700;color:#dbe5ff;position:relative}
  #awsheet .rw .ic{width:30px;height:30px;vertical-align:0}
  #awsheet .rw b{font-size:25px;color:#fff;font-variant-numeric:tabular-nums}
  #awsheet .rw i{position:absolute;left:42px;right:0;bottom:2px;height:3px;border-radius:2px;background:rgba(255,255,255,.08)}
  #awsheet .rw i u{display:block;height:100%;border-radius:2px;background:linear-gradient(90deg,#49a9ff,#65df9a);text-decoration:none}
  #awbot{position:absolute;left:10px;bottom:8px;width:700px;height:254px;box-sizing:border-box;padding:10px 12px;border-radius:34px;background:linear-gradient(180deg,rgba(28,38,92,.93),rgba(10,14,40,.97));border:2px solid rgba(255,216,130,.3);box-shadow:0 -6px 24px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.5),inset 0 1px rgba(255,255,255,.14);transition:height .2s}
  #awbot.compact{height:112px} #awbot.compact #awtag,#awbot.compact #awrow2{display:none}
  #awtag{display:flex;align-items:center;gap:10px;height:40px;padding:0 6px;font-size:24px;color:#dbe5ff;white-space:nowrap;overflow:hidden}
  #awtag .tk .ic{width:32px;height:32px;vertical-align:-6px}
  #awtag b{font-size:27px;color:#ffe9a8;font-weight:900}
  #awtag .th{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;color:#aab6e4;font-weight:600;font-size:21px}
  #awtag .tg{margin-left:auto;font-size:15px;font-weight:900;letter-spacing:2px;color:#8fa0d8;padding:4px 10px;border-radius:12px;background:rgba(120,150,255,.12)}
  #awrow1{display:flex;gap:4px;align-items:center;margin-top:6px}
  #awrow1>.awb{width:84px;height:84px;flex-basis:84px;border-radius:26px}
  #awrow1>.awb.on{background:linear-gradient(#5568b8,#2c3a7e);border-color:#ffd870;box-shadow:inset 0 3px 0 rgba(255,255,255,.25),inset 0 -5px 0 rgba(0,0,0,.22),0 0 0 2px rgba(255,216,130,.22),0 0 18px rgba(255,207,74,.45)}
  #awbrush{margin-left:auto;display:flex;gap:4px;align-items:center;padding:6px;border-radius:34px;background:rgba(6,10,30,.55);border:2px solid rgba(160,190,255,.2);box-shadow:inset 0 2px 6px rgba(0,0,0,.35);transition:opacity .2s}
  #awbrush.dim{opacity:.45}
  #awbrush .awb{width:64px;height:64px;flex-basis:64px;border-radius:22px;font-size:38px}
  #awbv{position:relative;width:56px;height:56px;display:grid;place-items:center}
  #awbv .bd{position:absolute;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe9a8,#e8962a);box-shadow:0 0 12px rgba(255,200,90,.5);opacity:.88}
  #awbv em{position:relative;font-style:normal;font-size:24px;font-weight:900;color:#fff;text-shadow:0 1px 0 #2a0e04,0 0 3px #2a0e04,0 0 3px #2a0e04}
  #awrow2{display:flex;flex-wrap:nowrap;gap:8px;margin-top:8px;height:96px;padding:4px 2px;box-sizing:border-box;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;touch-action:pan-x;-webkit-overflow-scrolling:touch;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 var(--fl,0px),#000 calc(100% - var(--fr,0px)),transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 var(--fl,0px),#000 calc(100% - var(--fr,0px)),transparent 100%)}
  #awrow2::-webkit-scrollbar{display:none}
  #awrow2 .awb{width:88px;height:88px;flex:0 0 88px;border-radius:26px;scroll-snap-align:start}
  #awbot.compact ~ #awinfo{bottom:130px}
  #awinfo{position:absolute;left:10px;bottom:272px;width:700px;max-height:600px;overflow-y:auto;touch-action:pan-y;box-sizing:border-box;background:linear-gradient(180deg,#1c2760,#0b1132);border:2px solid rgba(255,216,130,.35);border-radius:30px;padding:18px 20px 14px;font-size:28px;line-height:1.55;box-shadow:0 -10px 40px rgba(0,0,0,.55),inset 0 1px rgba(255,255,255,.14);display:none;animation:awslide .26s ease-out;overscroll-behavior:contain}
  #awinfo:before{content:'';display:block;position:sticky;top:-8px;width:64px;height:6px;margin:-8px auto 12px;border-radius:3px;background:rgba(255,255,255,.3);z-index:2}
  #awinfo.tall{max-height:820px}
  @keyframes awslide{from{transform:translateY(26px);opacity:0}to{transform:none;opacity:1}}
  #awinfo .jtabs{display:flex;gap:10px;margin:12px 0 8px;clear:both}
  #awinfo .jtab{flex:1;min-width:96px;min-height:96px;font-size:24px}
  #awinfo .jbody{clear:both}
  #awinfo .jrow{display:flex;gap:14px;align-items:flex-start;border-top:1px solid #34406c;padding:12px 2px;font-size:21px;line-height:1.3}
  #awinfo .jrow .jicon{width:44px;flex:0 0 44px;font-size:30px;text-align:center}
  #awinfo .jrow div{flex:1;min-width:0}
  #awinfo .jrow small{display:block;font-size:17px;color:#aab4e0;font-weight:800}
  #awinfo .jrow span{display:block;overflow-wrap:anywhere}
  #awinfo .jgoal{border-top:1px solid #34406c;padding:14px 2px 10px;font-size:22px}
  #awinfo .jgoaltop{display:flex;justify-content:space-between;gap:10px;align-items:center}
  #awinfo .jgoaltop strong{color:#ffcf4a;white-space:nowrap}
  #awinfo .jgoal small{display:block;font-size:18px;color:#aab4e0;line-height:1.3;margin:2px 0 8px}
  #awinfo .jbar{height:12px;border-radius:8px;background:#080c1f;border:1px solid #34406c;overflow:hidden}
  #awinfo .jbar i{display:block;height:100%;background:linear-gradient(90deg,#49a9ff,#65df9a)}
  #awinfo .jempty{padding:28px 10px;color:#aab4e0;font-size:22px;text-align:center}
  #awinfo b{font-size:30px;color:#ffe9a0}
  #awinfo .ibtns{float:right;display:flex;gap:8px;margin:-2px 0 0 10px}
  #awinfo .ibt{width:76px;height:76px;flex-basis:76px;border-radius:14px}
  #awinfo .pt{float:left;width:80px;height:80px;margin:0 16px 4px 0;image-rendering:pixelated;background:rgba(255,255,255,.07);border:2px solid #2c3868;border-radius:14px;padding:4px;box-sizing:border-box}
  #awinfo .dsc{display:block;font-size:22px;line-height:1.3;color:#aab4e0;margin:4px 0 6px}
  #awinfo .tag{display:inline-block;font-size:20px;font-weight:800;background:#2c3868;border-radius:8px;padding:0 8px;margin-left:8px;vertical-align:3px}
  #awinfo .bar{display:flex;align-items:center;gap:8px;font-size:22px;margin:3px 0;clear:both}
  #awinfo .bar u{display:block;flex:1;height:14px;background:#0b1020;border:2px solid #2c3868;border-radius:7px;overflow:hidden;text-decoration:none}
  #awinfo .bar u i{display:block;height:100%}
  #awinfo .seeds{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;clear:both}
  #awinfo .seed{min-height:118px;border-radius:14px;border:3px solid #2c3868;background:linear-gradient(#26305c,#161c3c);color:#e8ecff;font-family:inherit;text-align:left;padding:10px 14px;cursor:pointer}
  #awinfo .seed b{display:block;font-size:30px}
  #awinfo .seed small{display:block;font-size:19px;line-height:1.25;color:#aab4e0;margin-top:4px}
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
  #awload{position:absolute;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;overflow:hidden;background:radial-gradient(ellipse at 50% 42%,#243f82 0,#101a45 40%,#070b20 100%);color:#eef3ff;transition:opacity .42s ease}\n  #awload:before{content:'';position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(#fff 1px,transparent 1.8px),radial-gradient(#84c7ff 1px,transparent 1.8px);background-size:71px 71px,113px 113px;background-position:0 0,32px 45px;opacity:.38}\n  #awload.fade{opacity:0;pointer-events:none}\n  #awload .ldorb{position:relative;width:144px;height:144px;display:grid;place-items:center;border:2px solid rgba(143,193,255,.3);border-radius:50%;box-shadow:0 0 34px rgba(73,154,255,.25),inset 0 0 24px rgba(73,154,255,.18);animation:aworb 3s ease-in-out infinite}\n  #awload .ldorb b{font-size:80px;filter:drop-shadow(0 6px 0 rgba(0,0,0,.25))}\n  #awload .ldorb i{position:absolute;right:-5px;top:20px;font-size:36px;font-style:normal;animation:awship 2s ease-in-out infinite}\n  #awload .ldname{font-size:52px;font-weight:900;letter-spacing:4px;color:#ffd54a;text-shadow:0 4px 0 #784217,0 0 24px rgba(255,207,74,.35);text-align:center}\n  #awload .ldbar{width:330px;height:14px;border:2px solid #556aa4;border-radius:20px;background:#0a102c;overflow:hidden;box-shadow:0 3px 0 rgba(0,0,0,.35)}\n  #awload .ldbar i{display:block;width:42%;height:100%;border-radius:20px;background:linear-gradient(90deg,#55caff,#ffda55);animation:awloadbar 1.15s ease-in-out infinite}\n  #awload .ldtext{font-size:22px;font-weight:700;letter-spacing:1px;color:#c7d7ff}\n  @keyframes aworb{50%{transform:translateY(-8px);box-shadow:0 0 48px rgba(73,154,255,.38),inset 0 0 30px rgba(73,154,255,.22)}}\n  @keyframes awship{50%{transform:translate(-8px,5px) rotate(-8deg)}}\n  @keyframes awloadbar{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}\n  #awtitle{position:absolute;left:0;top:0;width:720px;height:1280px;z-index:60;background:radial-gradient(ellipse at 50% 30%,#253a78 0,#111a43 48%,#080c21 100%);transition:opacity .45s;overflow:hidden}
  #awtitle .bg{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;object-position:center center;filter:brightness(.84) saturate(.9);opacity:0;transition:opacity .5s ease}\n  #awtitle .bg.loaded{opacity:1}
  #awtitle .shade{position:absolute;left:0;bottom:0;width:100%;height:500px;background:linear-gradient(180deg,rgba(5,8,22,0),rgba(5,8,22,.26) 36%,rgba(5,8,22,.96) 100%)}
  #awtitle .menuPanel{position:absolute;left:34px;right:34px;bottom:58px;height:286px;box-sizing:border-box;background:linear-gradient(180deg,rgba(14,22,48,.78),rgba(5,8,22,.94));border:2px solid rgba(181,207,255,.24);border-radius:30px;box-shadow:0 14px 44px rgba(0,0,0,.42),inset 0 1px rgba(255,255,255,.12);backdrop-filter:blur(5px)}
  #awtitle .nm{position:absolute;left:0;top:300px;width:100%;text-align:center;font-size:96px;font-weight:900;line-height:.95;color:#ffd23f;text-shadow:0 6px 0 #7a3a10,0 0 28px rgba(255,200,80,.5)}
  #awtitle .tb{position:absolute;left:60px;right:60px;bottom:90px;display:flex;flex-direction:column;gap:18px;align-items:center}
  .awbig{box-sizing:border-box;width:100%;height:124px;border-radius:30px;border:4px solid #7a4a10;background:linear-gradient(#ffd23f,#e8962a);box-shadow:inset 0 4px 0 rgba(255,255,255,.4),inset 0 -8px 0 rgba(0,0,0,.2),0 6px 0 #5a2e08,0 0 30px rgba(255,190,60,.45);color:#3a1a04;font-size:50px;font-weight:900;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:16px;cursor:pointer;animation:awpulse 1.8s ease-in-out infinite}
  .awbig:active{transform:translateY(3px)}
  .awbig .ic{width:56px;height:56px}
  @keyframes awpulse{50%{transform:scale(1.025)}}
  #awtitle .row2{display:flex;gap:16px}
  #awtitle{background:#070a24}
  #awtitle canvas.scene{position:absolute;left:0;top:0;width:720px;height:1280px;image-rendering:pixelated}
  #awtitle .vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 38%,rgba(0,0,0,0) 45%,rgba(2,3,14,.62) 100%),linear-gradient(180deg,rgba(4,6,20,.5) 0,rgba(4,6,20,0) 24%,rgba(4,6,20,0) 60%,rgba(4,6,20,.9) 100%)}
  #awtitle .logo{position:absolute;left:0;top:92px;width:100%;text-align:center;pointer-events:none;animation:awlogo 5s ease-in-out infinite}
  #awtitle .logo .tag{display:flex;align-items:center;justify-content:center;gap:14px;font-size:21px;font-weight:800;letter-spacing:6px;color:#ffe9a8;text-shadow:0 2px 0 #3a1a04,0 0 14px rgba(255,200,90,.6)}
  #awtitle .logo .tag:before,#awtitle .logo .tag:after{content:'';width:70px;height:3px;border-radius:3px;background:linear-gradient(90deg,rgba(255,210,100,0),#ffd870)}
  #awtitle .logo .tag:after{transform:scaleX(-1)}
  #awtitle .logo .l1,#awtitle .logo .l2{font-weight:900;line-height:.9;letter-spacing:4px;color:transparent;background:linear-gradient(180deg,#fff3b0 0,#ffd23f 38%,#f29a22 70%,#b8560f 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-stroke:5px #3a1606;paint-order:stroke fill;filter:drop-shadow(0 8px 0 #2a0e04) drop-shadow(0 0 26px rgba(255,170,60,.55))}
  #awtitle .logo .l1{font-size:120px;margin-top:10px}
  #awtitle .logo .l2{font-size:132px;margin-top:-6px;position:relative}
  #awtitle .logo .l2:after{content:'';position:absolute;top:0;bottom:0;width:90px;left:-120px;background:linear-gradient(100deg,rgba(255,255,255,0),rgba(255,255,255,.55),rgba(255,255,255,0));transform:skewX(-18deg);animation:awshine 4.2s ease-in-out infinite;mix-blend-mode:overlay}
  #awtitle .sub{margin-top:14px;font-size:25px;font-weight:700;color:#d9e4ff;letter-spacing:1px;text-shadow:0 2px 0 rgba(0,0,0,.6)}
  #awtitle .menuPanel{backdrop-filter:none;height:auto;bottom:40px;padding:22px 28px 18px;border-radius:34px;border:2px solid rgba(255,216,130,.34);background:linear-gradient(180deg,rgba(26,30,70,.74),rgba(8,10,30,.9));box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 0 6px rgba(255,216,130,.06),inset 0 1px rgba(255,255,255,.2)}
  #awtitle .menuPanel:before{content:'';position:absolute;left:34px;right:34px;top:-2px;height:3px;border-radius:3px;background:linear-gradient(90deg,rgba(255,216,130,0),#ffd870,rgba(255,216,130,0))}
  #awtitle .races{display:flex;justify-content:center;gap:12px;margin:-70px 0 20px}
  #awtitle .races span{width:76px;height:76px;border-radius:22px;display:grid;place-items:center;background:linear-gradient(180deg,#2b3472,#151a42);border:2px solid rgba(160,190,255,.38);box-shadow:0 6px 0 rgba(0,0,0,.4),inset 0 1px rgba(255,255,255,.18);animation:awhop 3.2s ease-in-out infinite}
  #awtitle .races span:nth-child(2){animation-delay:.25s}#awtitle .races span:nth-child(3){animation-delay:.5s}#awtitle .races span:nth-child(4){animation-delay:.75s}#awtitle .races span:nth-child(5){animation-delay:1s}
  #awtitle .races img{width:50px;height:50px;image-rendering:pixelated}
  #awtitle .feat{display:flex;justify-content:center;gap:8px;margin:0 0 18px;font-size:19px;font-weight:700;color:#bfcfff}
  #awtitle .feat b{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;white-space:nowrap;border-radius:20px;background:rgba(120,150,255,.12);border:1px solid rgba(160,190,255,.22);font-weight:700}
  #awtitle .feat img{width:22px;height:22px}
  #awtitle .tb{position:static;display:flex;flex-direction:column;gap:14px;align-items:center}
  #awtitle .awbig{height:104px;position:relative;overflow:hidden;font-size:48px;letter-spacing:2px;border-width:3px;border-color:#5a2e08;background:linear-gradient(#ffe27a 0,#ffc233 48%,#e8862a 52%,#d06a1c 100%)}
  #awtitle .awbig:after{content:'';position:absolute;top:0;bottom:0;width:70px;left:-120px;background:linear-gradient(100deg,rgba(255,255,255,0),rgba(255,255,255,.65),rgba(255,255,255,0));transform:skewX(-20deg);animation:awshine 3.4s ease-in-out infinite .6s}
  #awtitle .row2{gap:18px}
  #awtitle .row2 .awb{width:104px;height:84px;border-radius:26px}
  #awtitle .ver{margin-top:2px;font-size:17px;font-weight:700;letter-spacing:2px;color:rgba(190,205,255,.55)}
  @keyframes awlogo{50%{transform:translateY(-6px)}}
  @keyframes awshine{0%,55%{left:-130px}100%{left:760px}}
  @keyframes awhop{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-8px)}}
  #awtitle .awb.new{position:relative}
  #awtitle .awb.new:after{content:'NEW';position:absolute;top:-10px;right:-8px;padding:2px 9px;border-radius:12px;background:#e8412c;color:#fff;font-size:16px;font-weight:900;letter-spacing:1px;box-shadow:0 2px 0 #7a1c10;animation:awpulse 1.4s ease-in-out infinite}
  #awnew{position:absolute;left:0;top:0;width:720px;height:1280px;z-index:90;display:none;align-items:center;justify-content:center;background:rgba(3,5,18,.8)}
  #awnew .card{width:640px;max-height:1090px;display:flex;flex-direction:column;border-radius:36px;overflow:hidden;background:linear-gradient(180deg,#1f2a62,#0b1030 70%);border:2px solid rgba(255,216,130,.5);box-shadow:0 24px 70px rgba(0,0,0,.65),0 0 0 7px rgba(255,216,130,.07),inset 0 1px rgba(255,255,255,.18);animation:awpop .45s cubic-bezier(.2,1.3,.4,1)}
  #awnew .hd{padding:28px 32px 16px;text-align:center;background:radial-gradient(ellipse at 50% 0,rgba(255,200,80,.28),rgba(255,200,80,0) 70%)}
  #awnew .chip{display:inline-block;padding:6px 20px;border-radius:20px;background:linear-gradient(#ffe27a,#e8962a);color:#3a1a04;font-size:22px;font-weight:900;letter-spacing:3px;box-shadow:0 3px 0 #5a2e08}
  #awnew h1{margin:12px 0 4px;font-size:64px;line-height:1;font-weight:900;color:transparent;background:linear-gradient(180deg,#fff3b0,#ffd23f 45%,#e8862a);-webkit-background-clip:text;background-clip:text;-webkit-text-stroke:3px #3a1606;paint-order:stroke fill;filter:drop-shadow(0 4px 0 #2a0e04)}
  #awnew .hd p{margin:6px 0 0;font-size:23px;font-weight:700;color:#cfdcff}
  #awnew .bd{flex:1;overflow-y:auto;padding:4px 32px 12px;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch}
  #awnew .sec{margin:14px 0 18px;padding:14px 18px 6px;border-radius:22px;background:rgba(120,150,255,.09);border:1px solid rgba(160,190,255,.2)}
  #awnew h3{margin:0 0 8px;font-size:30px;font-weight:900;color:#ffd870;text-shadow:0 2px 0 rgba(0,0,0,.5)}
  #awnew ul{margin:0;padding:0;list-style:none}
  #awnew li{position:relative;margin:0 0 12px;padding-left:24px;font-size:23px;line-height:1.32;color:#dbe5ff}
  #awnew li:before{content:'';position:absolute;left:2px;top:11px;width:9px;height:9px;background:#ffd23f;box-shadow:0 0 0 2px #7a4a10}
  #awnew li b{color:#fff}
  #awnew .ft{padding:14px 32px 26px;background:linear-gradient(180deg,rgba(11,16,48,0),#0b1030 30%)}
  #awnew .awbig{height:96px;font-size:44px}
  @keyframes awpop{0%{transform:scale(.86);opacity:0}100%{transform:scale(1);opacity:1}}
  #awtoasts{position:absolute;left:50%;top:172px;transform:translateX(-50%);width:640px;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;z-index:9}
  .tp{display:flex;align-items:center;gap:10px;max-width:640px;padding:8px 22px 8px 18px;border-radius:24px;background:rgba(10,15,40,.95);border:2px solid rgba(255,255,255,.12);border-left:7px solid var(--ac,#8fa0d8);font-size:26px;font-weight:700;color:#eef3ff;box-shadow:0 6px 18px rgba(0,0,0,.45);animation:awtin .28s cubic-bezier(.2,1.2,.4,1)}
  .tp.out{opacity:0;transform:translateY(-10px);transition:all .25s}
  .tp.pop{animation:awtpop .25s}
  .tp .x2{font-size:20px;font-weight:900;color:#ffd870;padding:1px 8px;border-radius:10px;background:rgba(255,216,130,.14)} .tp .x2:empty{display:none}
  .tp.bad{--ac:#ff6a5a} .tp.good{--ac:#65df9a} .tp.gold{--ac:#ffd23f} .tp.sea{--ac:#55caff}
  .bn{display:flex;align-items:center;gap:16px;width:620px;box-sizing:border-box;padding:12px 22px 12px 16px;border-radius:28px;background:linear-gradient(90deg,var(--ac),rgba(12,16,44,.97) 46%);border:2px solid rgba(255,255,255,.2);box-shadow:0 10px 30px rgba(0,0,0,.55);animation:awbin .4s cubic-bezier(.2,1.25,.4,1)}
  .bn.bad{--ac:#7a1f1c} .bn.good{--ac:#1d6b43} .bn.gold{--ac:#7a5a10} .bn.sea{--ac:#134a7a}
  .bn .bi{width:64px;height:64px;display:grid;place-items:center;font-size:40px;flex:0 0 64px} .bn .bi .ic{width:56px;height:56px;vertical-align:0}
  .bn .bx{display:flex;flex-direction:column;min-width:0;line-height:1.15}
  .bn b{font-size:34px;color:#fff;letter-spacing:1px;text-transform:uppercase;font-weight:900;text-shadow:0 2px 0 rgba(0,0,0,.5)}
  .bn small{font-size:21px;color:#dfe8ff;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bn.out{opacity:0;transform:translateY(-14px);transition:all .3s}
  @keyframes awtin{from{opacity:0;transform:translateY(-12px)}}
  @keyframes awbin{from{opacity:0;transform:translateY(-20px) scale(.92)}}
  @keyframes awtpop{50%{transform:scale(1.06)}}
  #awtut{position:absolute;left:0;top:0;width:720px;height:1280px;z-index:55;display:none}
  #awtut .spot{position:absolute;border:4px solid #ffcf4a;border-radius:22px;box-shadow:0 0 0 2400px rgba(5,8,20,.72),0 0 26px rgba(255,207,74,.7);transition:all .35s}
  #awtut .bub{position:absolute;left:40px;width:640px;box-sizing:border-box;background:rgba(14,20,48,.97);border:3px solid #ffcf4a;border-radius:20px;padding:20px 24px;font-size:30px;font-weight:700;line-height:1.35;text-align:center;box-shadow:0 6px 0 rgba(0,0,0,.4)}
  #awtut .bub .tbn{display:flex;gap:14px;justify-content:center;margin-top:16px}
  #awtut .tbn .awb{width:auto;min-width:96px;padding:0 34px;font-size:30px;flex:0 0 auto}
  #awtut .fing{position:absolute;width:76px;height:76px;image-rendering:pixelated;pointer-events:none;animation:awdrag 1.6s ease-in-out infinite;filter:drop-shadow(0 4px 0 rgba(0,0,0,.4))}
  #awtut .fing.tap{animation:awtap 1.1s ease-in-out infinite}
  @keyframes awdrag{0%{transform:translate(-70px,20px)}60%{transform:translate(70px,-10px)}100%{transform:translate(70px,-10px);opacity:0}}
  @keyframes awtap{0%,100%{transform:translateY(16px) scale(1)}50%{transform:translateY(-6px) scale(.88)}}
  #awtoast{position:absolute;left:50%;top:178px;transform:translateX(-50%);background:rgba(10,15,36,.95);border:3px solid #2c3868;border-radius:16px;padding:8px 24px;font-size:28px;font-weight:700;opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap;box-shadow:0 4px 0 rgba(0,0,0,.4)}
`;
document.head.appendChild(style);
const app = document.createElement('div'); app.id = 'aw'; document.body.appendChild(app);
const loadingStartedAt = performance.now();
const cv = document.createElement('canvas');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
cv.width = SCREEN_W * DPR; cv.height = SCREEN_H * DPR;
app.appendChild(cv);
const ctx = cv.getContext('2d');
const el = (tag, id, parent) => { const e = document.createElement(tag); if (id) e.id = id; (parent || app).appendChild(e); return e; };
if (!editMode) cv.style.visibility = 'hidden';
const topBar = el('div', 'awtop'), capL = el('div', 'awcapl', topBar), capR = el('div', 'awcapr', topBar), yearEl = el('div', 'awyear', topBar);
capL.className = capR.className = 'awcap';
const censusEl = el('div', 'awcensus'), zoomPill = el('div', 'awzoom'), sheetBg = el('div', 'awsheetbg'), sheetEl = el('div', 'awsheet');
if (editMode) censusEl.style.display = 'none';
const bot = el('div', 'awbot'), tagEl = el('div', 'awtag', bot), row1 = el('div', 'awrow1', bot), row2 = el('div', 'awrow2', bot);
const infoEl = el('div', 'awinfo'), toastBox = el('div', 'awtoasts');
new MutationObserver(() => { const on = infoEl.style.display === 'block'; bot.classList.toggle('compact', on); if (!on) infoEl.classList.remove('tall'); }).observe(infoEl, { attributes: true, attributeFilter: ['style'] });
let shDrag = null;                                             // sheet handle: tap = half/full height, drag down = dismiss
infoEl.addEventListener('pointerdown', e => {
  const r = infoEl.getBoundingClientRect(), k = r.height / infoEl.offsetHeight || 1;
  if ((e.clientY - r.top) / k > 44 || e.target.closest('button,[data-act]')) return;
  shDrag = { y0: e.clientY, k };
});
window.addEventListener('pointerup', e => {
  if (!shDrag) return; const dy = (e.clientY - shDrag.y0) / shDrag.k; shDrag = null;
  if (dy > 70) closeCreature(); else if (Math.abs(dy) < 12) infoEl.classList.toggle('tall');
});

function mkBtn(parent, label, fn, cls) {
  const b = document.createElement('button'); b.className = 'awb' + (cls ? ' ' + cls : ''); b.textContent = label;
  b.addEventListener('click', e => { e.stopPropagation(); fn(b); });
  parent.appendChild(b); return b;
}
const toastLive = new Map();                                   // visible toasts by text: repeats count up instead of piling up
function toastKind(s) {
  if (/⚔|☠|💀|🔥|☄|🌋|🪨|⚡|collapsed|fell to|extinct|killed|sunk|sank|attack|dragged|smashed|lost at sea/i.test(s)) return 'bad';
  if (/🏆|✨|🙏|🕊|🤝|🏝|New colony|back in service|raised|Goal reached|slain/i.test(s)) return 'good';
  if (/🪙|🏦|🎒|sold/i.test(s)) return 'gold';
  if (/🦈|🐙|🐟|⚓|🌊|🎣/.test(s)) return 'sea';
  return 'info';
}
function dropToast(s) { const it = toastLive.get(s); if (!it) return; toastLive.delete(s); it.el.classList.add('out'); setTimeout(() => it.el.remove(), 260); }
function toast(s) {
  s = String(s); let it = toastLive.get(s);
  if (it) { it.n++; it.el.querySelector('.x2').textContent = '×' + it.n; it.el.classList.remove('pop'); void it.el.offsetWidth; it.el.classList.add('pop'); clearTimeout(it.t); }
  else {
    const d = document.createElement('div'); d.className = 'tp ' + toastKind(s); d.innerHTML = '<span class="tt"></span><span class="x2"></span>'; d.firstChild.textContent = s;
    toastBox.appendChild(d); it = { el: d, n: 1, t: 0 }; toastLive.set(s, it);
    const live = [...toastLive.keys()]; if (live.length > 3) dropToast(live[0]);
  }
  it.t = setTimeout(() => dropToast(s), 2400);
}
let bannerEl = null, bannerT = 0;
function banner(icon, title, sub, kind) {                      // big, rare messages: disasters, wars, the kraken
  if (!bannerEl || !bannerEl.isConnected) { bannerEl = document.createElement('div'); toastBox.prepend(bannerEl); }
  bannerEl.className = 'bn ' + (kind || 'bad'); bannerEl.innerHTML = '<span class="bi"></span><span class="bx"><b></b><small></small></span>';
  bannerEl.querySelector('.bi').textContent = icon; bannerEl.querySelector('b').textContent = title; bannerEl.querySelector('small').textContent = sub || '';
  clearTimeout(bannerT); const me = bannerEl; bannerT = setTimeout(() => { me.classList.add('out'); setTimeout(() => me.remove(), 320); }, 3600);
}
function majorBanner(icon, text) {
  const ic = String(icon).replace(/️/g, ''); let t = null;
  if (ic === '🌋') t = 'Eruption!'; else if (ic === '☄') t = 'Meteor strike!'; else if (ic === '🪨') t = 'Earthquake!';
  else if (ic === '🌊' && /flood/i.test(text)) t = 'Flood!'; else if (ic === '☠' && /extinct/.test(text)) t = 'Extinction'; else if (ic === '⚔' && /declared war/.test(text)) t = 'War!'; else if (ic === '🏚' && /collapsed/.test(text)) t = 'Kingdom falls';
  if (t) banner(icon, t, text, 'bad');
}

/* ============================== STATE ============================== */
let tiles, bld, fire, jit;            // allocated by setSize()
let kid, own, ownRace, ownEdge, ownScore;      // kingdom id per house tile / territory map (allocated by setSize())
let wallK = new Uint16Array(1), wallG = new Uint8Array(1), wallT = new Uint8Array(1);
let oreT = new Uint8Array(1), oreA = new Uint8Array(1), treeK = new Uint8Array(1), nodes = [];      // resource nodes: type / amount left, cached tree kind, node list     // wall barrier map: owner kingdom id / is-gate
const wallGates = new Map();                                   // kingdom id -> gate tile indices
const kingdoms = new Map(); let nextKid = 1, showBorders = true, ownDirty = true;
const extinctRaces = new Set();                       // wars can permanently end a race in this world
let comp = null, compDirty = true;                 // connected land components (wars only happen on the same landmass)
const rels = new Map();                              // kingdom pair -> { s: 1 war | 2 alliance | 3 truce, t, until }
const warStats = { repaired: 0, towerShots: 0, breached: 0, declared: 0, ended: 0, captured: 0, razed: 0, allied: 0, joined: 0 };
const chronicle = []; const completedGoals = new Set(); let warsResolved = 0;
const CHRONICLE_MAX = 60;
let creatures = [], nextId = 1, tick = 0;
let ships = [], nextShipId = 1;                 // civilization exploration vessels; crew are citizens marked with ship id
let speed = 1, paused = editMode, started = editMode, fireView = 0, sndBtn = null, tutSeen = false;
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
/* ============================== EMPTY ISLAND SEEDS (terrain only, no life) ============================== */
// Islands are described in lon/lat (polygons or ellipses [lon, lat, rx°, ry°, rotation°]) and rasterised with noise-roughened coasts,
// ridges for mountains, shelves for shallow seas, and named volcano sites. Presets with a custom `gen` build their own terrain.
const E = (lon, lat, rx, ry, rot, o) => Object.assign({ e: [lon, lat, rx, ry, rot || 0] }, o || {});
const PL = (pts, o) => Object.assign({ pts }, o || {});
const PRESETS = [
  { id: 'indonesia', name: 'Indonesia', desc: 'The Indonesian archipelago: Sumatra, Java, Borneo, Sulawesi, Papua and the Lesser Sundas', w: 336, h: 136, k: 2.6, box: [94.0, 7.4, 6.8], shore: 3, cam: [110.4, -7.5],
    islands: [
      PL([[95.25,5.55],[96.2,5.55],[97.3,5.25],[98.2,4.35],[98.8,3.9],[99.6,3.3],[100.4,2.6],[101.2,2.0],[102.0,1.45],[102.9,0.9],[103.6,0.3],[103.8,-0.6],[104.1,-1.1],[104.6,-1.9],[104.9,-2.7],[105.4,-3.5],[105.9,-4.5],[105.8,-5.4],[105.5,-5.9],[104.9,-5.9],[104.5,-5.4],[103.9,-4.9],[103.3,-4.3],[102.5,-4.0],[102.2,-3.4],[101.6,-2.9],[101.0,-2.2],[100.6,-1.4],[100.3,-0.8],[99.7,-0.1],[99.2,0.6],[98.8,1.3],[98.3,2.0],[97.7,2.6],[97.0,3.2],[96.2,3.9],[95.5,4.7]], { fo: .8 }),
      PL([[105.2,-6.75],[105.8,-6.05],[106.4,-5.95],[106.9,-6.05],[107.4,-6.0],[108.3,-6.3],[108.7,-6.8],[109.5,-6.85],[110.5,-6.9],[111.0,-6.6],[111.6,-6.55],[112.2,-6.9],[112.8,-7.2],[113.4,-7.6],[114.2,-7.8],[114.5,-8.2],[114.2,-8.7],[113.2,-8.3],[112.2,-8.35],[111.2,-8.3],[110.2,-8.05],[109.2,-7.7],[108.4,-7.8],[107.5,-7.75],[106.6,-7.4],[105.9,-6.95]], { fo: .45, mh: .95 }),
      PL([[109.0,1.9],[109.6,2.1],[110.2,1.7],[111.2,2.6],[111.9,3.0],[113.0,3.6],[113.9,4.5],[114.6,5.0],[115.2,5.4],[115.9,6.1],[116.7,6.9],[117.2,6.6],[118.0,6.3],[118.6,5.8],[119.2,5.3],[118.9,4.6],[118.1,4.5],[117.7,4.0],[117.5,3.2],[118.0,2.5],[118.0,1.7],[117.9,1.0],[117.7,0.4],[117.5,-0.1],[117.3,-0.9],[116.9,-1.4],[116.6,-2.1],[116.4,-2.9],[116.2,-3.5],[115.9,-3.9],[115.2,-3.9],[114.6,-4.0],[113.8,-3.4],[113.0,-3.3],[112.2,-3.4],[111.5,-3.2],[110.9,-3.0],[110.5,-2.5],[110.2,-1.5],[109.9,-0.6],[109.3,-0.1],[109.0,0.4],[108.9,1.0],[108.9,1.5]], { fo: .85 }),
      PL([[131.0,-0.85],[132.0,-0.35],[133.2,-0.55],[134.1,-0.85],[134.2,-2.0],[134.6,-3.2],[135.4,-3.35],[136.5,-2.7],[137.6,-1.75],[138.5,-1.7],[139.4,-2.3],[140.3,-2.4],[141.0,-2.6],[142.0,-3.0],[142.0,-9.0],[141.0,-9.1],[140.2,-8.5],[139.2,-8.1],[138.4,-8.3],[137.9,-7.4],[137.8,-5.8],[137.3,-5.0],[136.3,-4.4],[135.2,-4.2],[134.2,-3.95],[133.7,-3.6],[133.3,-3.3],[132.9,-3.9],[132.2,-3.5],[131.8,-2.8],[131.2,-2.2],[130.9,-1.5]], { fo: .85, snow: 1, mh: 1.0 }),
      PL([[123.5,-10.3],[124.0,-9.5],[124.4,-9.0],[125.0,-8.85],[125.9,-8.4],[126.6,-8.4],[127.2,-8.35],[127.0,-8.8],[126.3,-9.0],[125.8,-9.4],[125.0,-9.9],[124.4,-10.25],[123.9,-10.4]], { fo: .35 }),
      E(123.2, 0.85, 2.1, .28, 5), E(124.8, 1.35, .45, .3), E(119.9, -1.8, .6, 2.0, 8), E(122.3, -1.0, 1.4, .3, -6), E(122.3, -4.0, 1.1, .45, -35), E(119.7, -4.5, .45, 1.2), E(121.0, -2.2, .7, .9),
      E(128.2, 1.5, .35, .65, 8), E(128.3, .4, .45, .35), E(128.0, -.4, .4, .35, 20), E(128.4, 2.35, .3, .28), E(127.35, .8, .12, .12), E(127.5, -.6, .3, .2),
      E(115.15, -8.35, .5, .33), E(116.45, -8.55, .45, .4), E(117.7, -8.6, 1.1, .45, -4), E(119.5, -8.6, .2, .15), E(121.5, -8.55, 1.55, .3, 3), E(123.0, -8.4, .3, .15), E(123.5, -8.4, .25, .2), E(124.5, -8.3, .3, .25), E(124.1, -8.4, .15, .2), E(120.0, -9.7, .9, .45, 20), E(121.9, -10.5, .2, .1), E(123.1, -10.7, .25, .15),
      E(113.3, -7.05, .9, .18), E(115.4, -6.9, .4, .15), E(112.65, -5.8, .15, .15), E(110.5, -5.8, .1, .1), E(105.42, -6.1, .08, .08), E(116.2, -3.3, .25, .3),
      E(126.1, -7.75, .5, .2), E(127.1, -8.1, .12, .1), E(127.7, -8.2, .3, .1), E(129.8, -7.9, .5, .2), E(131.4, -7.5, .35, .85, -15), E(132.8, -5.7, .2, .4), E(134.4, -6.1, .4, .9),
      E(129.5, -3.0, 1.6, .45, -8), E(128.2, -3.65, .28, .15), E(126.55, -3.4, .55, .45), E(127.9, -1.55, .55, .35), E(125.9, -1.9, .5, .2), E(124.8, -1.8, .55, .35), E(129.9, -4.5, .1, .08),
      E(136.0, -1.0, .5, .18), E(136.2, -1.8, .65, .15, -10), E(130.8, -.2, .5, .3), E(130.0, -1.9, .4, .2),
      E(125.5, 3.5, .2, .3), E(126.8, 4.0, .2, .2), E(108.0, 4.0, .35, .4), E(106.2, 3.1, .2, .2), E(104.0, 1.05, .25, .15), E(104.5, 1.0, .3, .2), E(104.6, -.2, .25, .2),
      E(106.0, -2.2, .7, .45, -20), E(107.9, -2.9, .4, .3), E(97.6, 1.1, .25, .55, 30), E(96.0, 2.55, .2, .4, 45), E(98.9, -1.45, .35, .55, 40), E(99.6, -2.1, .2, .4, 40), E(100.1, -2.8, .25, .55, 40), E(102.3, -5.3, .2, .15),
      E(122.6, -5.0, .3, .4), E(122.9, -5.0, .35, .5), E(120.6, -6.2, .15, .45), E(121.9, -.4, .35, .1), E(108.9, -1.5, .2, .2), E(117.6, 3.3, .15, .15),
    ],
    ridges: [
      { pts: [[96.3,4.5],[97.5,3.3],[98.6,2.2],[99.6,1.0],[100.4,-.5],[101.4,-2.0],[102.5,-3.2],[103.6,-4.4],[104.6,-5.4]], w: 2.4, h: .55 },
      { pts: [[106.1,-6.9],[107.5,-7.2],[108.8,-7.3],[110.0,-7.5],[111.5,-7.6],[112.7,-7.9],[113.8,-8.0]], w: 2.0, h: .6 },
      { pts: [[133.5,-3.7],[135.0,-4.0],[136.5,-4.1],[138.0,-4.2],[139.5,-4.2],[141.0,-4.6],[142.0,-5.5]], w: 3.4, h: .85 },
      { pts: [[120.0,.5],[119.7,-1.5],[120.5,-2.8],[121.5,-3.2],[122.3,-4.0]], w: 2.0, h: .4 },
      { pts: [[114.0,1.2],[115.2,2.2],[116.5,3.4]], w: 3.2, h: .5 }, { pts: [[110.8,-.3],[113.0,.5]], w: 2.4, h: .35 },
      { pts: [[123.9,-9.9],[125.0,-9.2],[126.5,-8.8]], w: 1.6, h: .4 }, { pts: [[119.8,-8.5],[123.0,-8.4]], w: 1.0, h: .5 }, { pts: [[116.5,-8.5],[118.9,-8.6]], w: 1.0, h: .5 },
      { pts: [[128.0,-3.1],[130.3,-3.1]], w: 1.4, h: .5 }, { pts: [[115.1,-8.4],[116.5,-8.5]], w: 1.2, h: .5 },
    ],
    shelves: [
      [[98.0,5.5],[102.0,4.0],[104.5,3.5],[108.0,5.5],[112.0,6.5],[117.0,7.0],[118.0,3.5],[117.0,-4.4],[115.0,-4.6],[110.0,-4.3],[107.5,-4.3],[105.5,-6.2],[104.0,-6.3],[102.5,-4.2],[100.0,-1.0],[98.0,2.0]],
      [[140.5,-8.0],[142.0,-9.0],[142.0,-11.0],[134.0,-9.2],[132.0,-8.2],[135.0,-7.4],[138.5,-8.0]],
    ],
    volc: [[105.42,-6.1],[110.45,-7.54],[109.2,-7.24],[112.92,-8.1],[114.24,-8.06],[115.51,-8.34],[116.46,-8.41],[117.99,-8.25],[101.26,-1.7],[98.39,3.17],[127.33,.8],[129.88,-4.52]] },
  { id: 'japan', name: 'Japan', desc: 'A volcanic island arc from Hokkaido to Kyushu, with Mount Fuji', w: 214, h: 196, k: 2, box: [128.6, 45.9, 12.2], shore: 3, cam: [137.0, 36.0],
    islands: [
      PL([[139.8,42.2],[139.4,43.2],[140.3,43.3],[141.2,45.4],[142.0,45.5],[143.5,44.0],[145.3,43.4],[145.8,43.3],[144.0,42.9],[143.3,42.0],[142.0,42.3],[141.0,41.8],[140.4,41.4],[140.1,41.8]], { fo: .5, snow: 1, mh: .75 }),
      PL([[141.4,41.4],[141.5,40.5],[142.0,39.5],[141.6,38.3],[141.0,37.0],[140.9,36.0],[140.9,35.7],[140.3,35.1],[139.8,34.9],[139.8,35.6],[139.2,35.2],[139.0,34.7],[138.2,34.6],[137.0,34.6],[136.8,34.3],[136.0,33.9],[135.75,33.45],[135.1,34.2],[135.0,34.6],[134.0,34.6],[133.0,34.4],[131.8,33.95],[130.9,34.0],[131.0,34.5],[132.0,35.0],[133.4,35.5],[134.8,35.65],[135.8,35.6],[136.0,36.0],[136.7,37.3],[137.3,37.5],[137.0,36.9],[138.5,37.5],[139.4,38.2],[139.9,39.5],[140.0,40.4],[140.3,40.8],[141.2,41.2]], { fo: .6, snow: 1, mh: 1.0 }),
      PL([[132.0,33.4],[132.4,34.0],[133.5,34.3],[134.7,34.2],[134.5,33.6],[134.2,33.2],[133.5,33.2],[132.7,32.8],[132.2,33.0]], { fo: .7 }),
      PL([[129.7,33.4],[130.0,33.9],[131.0,33.7],[131.7,33.3],[131.9,32.5],[131.3,31.4],[130.6,31.0],[130.2,31.2],[130.2,32.0],[129.8,32.7],[129.6,33.0]], { fo: .6 }),
      E(138.4, 38.0, .25, .35, 40), E(134.9, 34.4, .1, .22, -50), E(129.3, 34.4, .15, .3, -60), E(128.8, 32.7, .25, .25), E(130.5, 30.3, .15, .12), E(131.0, 30.65, .1, .25, -50), E(133.2, 36.2, .2, .15), E(139.4, 34.75, .12, .1), E(131.2, 33.95, .2, .1), E(142.0, 45.2, .15, .1), E(139.5, 45.2, .2, .15),
    ],
    ridges: [
      { pts: [[136.0,35.3],[137.2,36.4],[138.0,36.8]], w: 3.0, h: .55 }, { pts: [[140.5,40.0],[140.7,38.0],[139.9,36.8]], w: 2.4, h: .45 },
      { pts: [[142.7,44.3],[143.0,43.3]], w: 2.4, h: .5 }, { pts: [[131.0,33.0],[131.6,32.0]], w: 2.0, h: .45 }, { pts: [[133.0,33.8],[134.2,33.6]], w: 1.8, h: .45 },
    ],
    volc: [[138.73,35.36],[131.1,32.88],[130.66,31.6],[138.52,36.4],[141.2,45.2],[140.7,40.6]] },
  { id: 'caribbean', name: 'Caribbean', desc: 'Cuba, Hispaniola, Jamaica and the arc of the Antilles', w: 280, h: 160, k: 2.6, box: [-86.2, 27.2, 10.2], shore: 3, cam: [-72.0, 19.0],
    islands: [
      E(-79.5, 21.6, 5.6, .6, -10, { fo: .55 }), E(-71.4, 18.9, 3.1, 1.1, 5, { fo: .6, mh: 1.0 }), E(-77.3, 18.1, .9, .3, 0, { fo: .7 }), E(-66.5, 18.25, .7, .25), E(-82.9, 21.7, .25, .2),
      E(-77.8, 24.4, .3, .55), E(-78.5, 26.6, .5, .2), E(-76.0, 25.0, .25, .4, 30), E(-75.0, 23.0, .3, .25), E(-73.0, 21.7, .35, .2), E(-71.5, 21.5, .35, .2), E(-80.0, 26.9, .2, .2),
      E(-64.8, 18.35, .1, .1), E(-64.6, 18.4, .1, .1), E(-63.0, 18.2, .12, .1), E(-62.8, 17.35, .12, .1), E(-62.0, 16.85, .15, .15), E(-61.7, 16.2, .45, .25, 60, { mh: 1.1 }), E(-61.3, 15.4, .2, .35, 80, { mh: 1.2 }),
      E(-61.0, 14.65, .15, .25, 70), E(-61.0, 13.9, .15, .2, 60), E(-61.2, 13.2, .15, .1), E(-61.2, 12.1, .1, .15), E(-61.3, 10.5, .55, .4, 0, { fo: .7 }), E(-70.0, 12.5, .25, .1, -20), E(-68.9, 12.2, .25, .1, -25),
    ],
    ridges: [{ pts: [[-77.0,20.0],[-75.5,20.0],[-74.2,19.9]], w: 2.4, h: .5 }, { pts: [[-72.5,19.2],[-70.6,18.6]], w: 3.0, h: .6 }, { pts: [[-77.6,18.1],[-76.5,18.2]], w: 1.4, h: .5 }, { pts: [[-80.3,22.0],[-79.3,21.9]], w: 1.4, h: .3 }],
    volc: [[-61.67,16.05],[-61.3,15.4],[-61.17,13.33]] },
  { id: 'hawaii', name: 'Hawaiian Chain', desc: 'Tall volcanic shield islands in a lonely ocean', w: 232, h: 150, k: 2, box: [-160.6, 22.6, 38], shore: 3, cam: [-156.8, 20.8],
    islands: [
      E(-155.5, 19.6, .75, .8, 20, { fo: .5, snow: 1, mh: 1.15 }), E(-156.3, 20.8, .35, .28, 0, { fo: .5, mh: 1.1 }), E(-157.0, 21.1, .4, .1, -10), E(-156.95, 20.8, .12, .14), E(-158.0, 21.45, .3, .22, 20, { mh: 1.0 }), E(-159.55, 22.05, .25, .22, 0, { fo: .7 }), E(-160.15, 21.9, .1, .13), E(-156.6, 20.55, .08, .06),
    ],
    ridges: [{ pts: [[-155.7,19.8],[-155.4,19.4]], w: 7, h: .5 }, { pts: [[-156.3,20.75]], w: 4, h: .35 }, { pts: [[-158.1,21.55],[-157.95,21.4]], w: 3, h: .3 }],
    volc: [[-155.47,19.82],[-155.6,19.47],[-156.25,20.71]] },
  { id: 'aegean', name: 'Aegean Isles', desc: 'Sun-baked Greek islands: Crete, the Cyclades and the Dodecanese', w: 224, h: 208, k: 2, box: [22.2, 41.2, 32], shore: 3, cam: [25.5, 37.5],
    islands: [
      E(24.9, 35.25, 1.4, .25, -5, { fo: .15, mh: .9 }), E(28.0, 36.2, .3, .15, -50, { fo: .3 }), E(27.1, 35.6, .25, .07, -60), E(25.5, 37.05, .17, .12), E(25.15, 37.05, .1, .08), E(24.5, 36.7, .1, .08), E(25.4, 36.4, .08, .08), E(24.7, 37.8, .15, .22, 50), E(25.2, 37.5, .1, .1), E(25.35, 37.45, .07, .06),
      E(27.1, 36.8, .17, .08), E(26.8, 37.7, .25, .12), E(26.0, 38.4, .22, .2), E(26.3, 39.2, .4, .25), E(25.2, 39.9, .25, .17), E(24.7, 40.7, .15, .14), E(23.7, 38.6, .95, .2, 40, { fo: .35 }), E(24.5, 38.9, .2, .12), E(26.2, 37.6, .3, .1, -10),
      E(23.0, 36.2, .15, .13), E(23.3, 37.4, .1, .08), E(24.1, 37.1, .1, .15, -50), E(27.6, 36.5, .1, .1), E(26.9, 36.9, .06, .06), E(27.25, 37.0, .1, .06),
    ],
    ridges: [{ pts: [[23.9,35.25],[24.9,35.25],[26.0,35.2]], w: 2.0, h: .55 }, { pts: [[23.2,38.0],[24.2,38.9]], w: 1.4, h: .4 }, { pts: [[26.2,39.2]], w: 2.0, h: .3 }],
    volc: [[25.4,36.4]] },
  { id: 'atolls', name: 'Coral Atolls', desc: 'Low coral rings around turquoise lagoons, and one high island', w: 220, h: 220, k: 1.6, cam: [110, 110],
    gen(seed) {
      const dist = (x, y, a, b) => Math.hypot(x - a, y - b);
      const rings = [];
      for (let n = 0, tries = 0; n < 9 && tries < 400; tries++) {
        const R = 11 + hash(tries, 3, seed) * 14, cx = 22 + hash(tries, 5, seed) * (W - 44), cy = 22 + hash(tries, 7, seed) * (H - 44);
        if (rings.some(r => dist(cx, cy, r.cx, r.cy) < r.R + R + 10)) continue;
        rings.push({ cx, cy, R, high: n === 0, gap: hash(tries, 9, seed) * 6.28 }); n++;
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = x + y*W; let t = T.DEEP, near = 99;
        for (const r of rings) {
          const dd = dist(x, y, r.cx, r.cy), ang = Math.atan2(y - r.cy, x - r.cx), wob = (fbm(x/4, y/4, seed + 5) - .5) * 3.4;
          const rr = dd + wob;
          if (r.high) {                                         // a tall island with a fringing reef
            if (rr < r.R * .38) t = rr < r.R * .15 ? T.MOUNTAIN : rr < r.R * .26 ? T.HILL : (fbm(x/6, y/6, seed + 9) > .5 ? T.FOREST : T.GRASS);
            else if (rr < r.R * .46) t = T.SAND; else if (rr < r.R * .9) t = T.SHALLOW; else if (rr < r.R * 1.05 && t === T.DEEP) t = fbm(x/3, y/3, seed + 2) > .45 ? T.SAND : T.SHALLOW;
            else if (rr < r.R * 1.5 && t === T.DEEP) t = T.SHALLOW;
          } else {
            const open = Math.cos(ang - r.gap) > .93;           // a pass through the reef
            if (Math.abs(rr - r.R) < 2.4 && !open) { const m = fbm(x/5, y/5, seed + 11); t = m > .56 ? (m > .64 ? T.FOREST : T.GRASS) : T.SAND; }
            else if (rr < r.R - 2.4 || (open && Math.abs(rr - r.R) < 2.4)) t = T.SHALLOW;
            else if (rr < r.R + 6 && t === T.DEEP) t = T.SHALLOW;
          }
          near = Math.min(near, dd - r.R);
        }
        tiles[i] = t;
      }
      presetVolc.length = 0;
    } },
  { id: 'arctic', name: 'Arctic Isles', desc: 'Frozen islands of ice, tundra and bare rock', w: 240, h: 240, k: 1.8, cam: [120, 120],
    gen(seed) {
      const e = new Float32Array(N);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const nx = (x / W - .5) * 2, ny = (y / H - .5) * 2;
        e[x + y*W] = fbm(x/26, y/26, seed) * .75 + fbm(x/9, y/9, seed + 4) * .25 - Math.hypot(nx, ny) * .12;
      }
      const dist = new Int16Array(N).fill(99), q = [];
      for (let i = 0; i < N; i++) if (e[i] >= .53) dist[i] = 0;
      const land = new Uint8Array(N); for (let i = 0; i < N; i++) land[i] = e[i] >= .53 ? 1 : 0;
      for (let i = 0; i < N; i++) if (!land[i]) { const x = i % W, y = (i / W) | 0; if ((x > 0 && land[i-1]) || (x < W-1 && land[i+1]) || (y > 0 && land[i-W]) || (y < H-1 && land[i+W])) { dist[i] = 1; q.push(i); } }
      for (let h = 0; h < q.length; h++) { const i = q[h], d = dist[i]; if (d >= 5) continue; const x = i % W, y = (i / W) | 0; for (const j of [x > 0 ? i-1 : -1, x < W-1 ? i+1 : -1, y > 0 ? i-W : -1, y < H-1 ? i+W : -1]) if (j >= 0 && !land[j] && dist[j] > d + 1) { dist[j] = d + 1; q.push(j); } }
      for (let i = 0; i < N; i++) {
        const v = e[i], x = i % W, y = (i / W) | 0;
        if (!land[i]) tiles[i] = dist[i] <= 3 ? T.SHALLOW : T.DEEP;
        else if (v < .545) tiles[i] = fbm(x/5, y/5, seed + 1) > .5 ? T.SAND : T.SNOW;
        else if (v < .6) tiles[i] = fbm(x/7, y/7, seed + 2) > .62 ? T.FOREST : fbm(x/6, y/6, seed + 3) > .45 ? T.GRASS : T.SNOW;
        else if (v < .66) tiles[i] = fbm(x/6, y/6, seed + 4) > .5 ? T.HILL : T.SNOW;
        else tiles[i] = v > .72 ? T.SNOW : T.MOUNTAIN;
      }
      presetVolc.length = 0;
    } },
];
// ---- Indonesia, detailed: finer resolution (8.5 tiles per degree), many more islands, lakes and more volcanoes. The first version stays hidden so older saves still load.
PRESETS[0].hidden = true;
const IDN_EXTRA = [
  // Kepulauan Seribu and Java's offshore islands
  ...[[106.62,-5.93],[106.58,-5.85],[106.55,-5.78],[106.53,-5.70],[106.56,-5.62],[106.52,-5.55],[106.5,-5.47],[106.53,-5.40],[106.6,-5.72]].map(q => E(q[0], q[1], .04, .04)),
  E(110.45, -5.8, .08, .06), E(110.5, -5.88, .05, .04), E(110.38, -5.82, .04, .04), E(110.55, -5.8, .04, .04), E(110.42, -5.95, .04, .04), E(114.3, -7.1, .1, .06), E(114.6, -7.1, .08, .05), E(114.45, -5.55, .07, .05), E(105.2, -6.6, .12, .1), E(105.5, -5.95, .07, .07), E(113.8, -7.45, .04, .04),
  // Raja Ampat and the Bird's Head
  E(130.65, -.85, .28, .1, -20), E(130.9, -1.15, .28, .2), E(130.35, -.45, .08, .05), E(130.45, -.55, .07, .05), E(130.5, -.45, .06, .04), E(130.55, -.58, .06, .04), E(130.3, -.6, .05, .04), E(130.68, -.55, .07, .05), E(130.65, -.62, .1, .05),
  ...[[130.15,.05],[130.2,.12],[130.1,.15],[130.25,.0],[130.3,.1],[130.18,.2],[130.05,.08]].map(q => E(q[0], q[1], .05, .04)),
  E(129.8, -1.2, .1, .08), E(129.9, -1.2, .05, .04), E(129.4, -.1, .15, .12), E(129.9, -.4, .12, .1), E(130.2, -1.5, .06, .05), E(130.4, -1.7, .08, .05), E(130.55, -2.0, .08, .06),
  E(133.0, -3.4, .7, .45), E(134.6, -2.8, .15, .4, 15), E(132.0, -2.6, .5, .3), E(131.7, -1.9, .35, .15),
  // Cenderawasih Bay
  E(134.95, -1.0, .12, .1), E(135.65, -.75, .25, .18), E(134.3, .9, .12, .1), E(135.2, -3.1, .1, .08),
  // Maluku Utara and Halmahera
  E(127.4, .3, .1, .1), E(127.45, .45, .04, .04), E(127.4, .7, .1, .1), E(127.4, 0., .12, .1), E(127.6, -1.25, .08, .06), E(127.4, -.3, .08, .06), E(129.5, .55, .12, .08), E(128.7, 1.0, .25, .3), E(128.0, 1.0, .35, .35), E(128.4, -.8, .25, .2),
  E(127.55, -3.35, .1, .08), E(127.9, -2.95, .1, .08), E(126.5, -2.4, .12, .08), E(126.1, -2.1, .2, .1), E(123.2, -1.4, .5, .25, -20), E(123.5, -1.6, .2, .15), E(123.0, -1.7, .1, .08),
  // Ambon, Lease, Banda and the south-east islands
  E(128.4, -3.6, .1, .07), E(128.65, -3.55, .12, .08), E(128.75, -3.7, .07, .05), E(129.85, -4.52, .07, .04), E(129.7, -4.55, .04, .04), E(129.75, -4.52, .05, .03), E(129.8, -4.6, .04, .04),
  E(131.0, -3.9, .12, .1), E(131.5, -4.4, .1, .08), E(132.65, -5.6, .2, .12), E(132.4, -5.5, .08, .06), E(134.0, -5.8, .18, .2), E(134.2, -6.5, .2, .18), E(134.55, -6.9, .12, .1), E(134.3, -6.3, .2, .3),
  E(131.8, -7.1, .12, .1), E(131.0, -8.15, .13, .1), E(131.2, -7.9, .06, .05), E(128.0, -8.3, .1, .05), E(127.6, -8.3, .1, .05), E(128.9, -8.2, .18, .1), E(128.65, -7.15, .15, .15), E(127.3, -7.6, .15, .1), E(126.5, -7.9, .08, .06),
  // Lesser Sunda detail
  E(119.05, -8.2, .1, .1), E(117.5, -8.25, .12, .1), E(119.75, -8.7, .15, .12), E(119.58, -8.65, .05, .05), E(116.03, -8.35, .04, .04), E(116.08, -8.36, .03, .03), E(115.98, -8.35, .03, .03), E(115.55, -8.7, .15, .1), E(115.45, -8.68, .04, .03), E(121.7, -10.65, .05, .05), E(123.4, -10.2, .1, .1), E(121.7, -8.3, .06, .05), E(122.3, -8.45, .15, .1), E(119.3, -8.35, .06, .05), E(118.35, -8.4, .06, .06),
  // Sumatra offshore
  E(95.3, 5.85, .12, .1), E(95.05, 5.65, .08, .08), E(97.3, 2.2, .08, .08), E(97.45, 2.4, .05, .05), E(97.1, 1.9, .05, .06), E(98.4, -.1, .12, .15), E(98.6, -.5, .08, .1), E(102.05, 1.5, .2, .1), E(101.6, 1.8, .2, .1), E(102.6, 1.0, .1, .1), E(97.3, .9, .08, .1, 30), E(98.0, 1.0, .06, .08), E(103.4, 1.0, .1, .07), E(103.45, .75, .12, .15), E(104.2, .9, .15, .1), E(104.4, -.5, .14, .17), E(106.7, -3.0, .08, .06), E(105.9, -3.4, .1, .06), E(107.9, -2.5, .06, .05),
  // Natuna, Anambas and Karimata
  E(108.85, 3.0, .08, .08), E(109.05, 2.5, .08, .08), E(108.0, 4.7, .06, .06), E(105.75, 3.2, .1, .1), E(106.25, 3.3, .1, .08), E(107.6, 1.0, .1, .08), E(109.3, -1.0, .1, .08), E(108.7, -1.2, .08, .08), E(110.0, -1.9, .08, .06),
  // Kalimantan offshore
  E(116.4, -3.55, .1, .1), E(117.85, 3.45, .08, .1), E(117.85, 4.15, .1, .05), E(117.67, 4.1, .12, .08), E(118.25, 2.3, .05, .05), E(118.6, 2.25, .15, .1), E(118.5, 2.1, .05, .04), E(118.45, 1.95, .04, .04), E(115.3, -3.7, .12, .1),
  // Sulawesi offshore and Wakatobi
  E(121.9, -5.2, .15, .1), E(123.1, -4.1, .12, .1), E(123.55, -5.3, .18, .06), E(123.75, -5.55, .15, .05), E(123.9, -5.8, .1, .05), E(124.05, -5.95, .1, .05),
  ...[[121.05,-6.55],[121.15,-6.6],[121.0,-6.65],[121.2,-6.5],[121.1,-6.7],[121.25,-6.62]].map(q => E(q[0], q[1], .06, .04)),
  E(125.15, 1.75, .06, .1), E(124.75, 1.62, .04, .04), E(125.2, 1.45, .1, .04), E(125.4, 2.7, .1, .1), E(125.4, 2.35, .05, .05), E(126.75, 3.9, .1, .12), E(126.58, 5.58, .04, .04), E(125.3, 3.9, .08, .1), E(121.7, -.3, .12, .06), E(122.2, -.4, .12, .06), E(121.4, -.5, .08, .05), E(119.1, -4.9, .1, .08), E(119.3, -5.3, .08, .06), E(119.0, -3.8, .08, .06), E(120.2, -5.9, .08, .06), E(122.0, -5.65, .2, .07),
];
const IDN_LAKES = [[98.85,2.65,.38,.14,-40],[100.55,-.6,.1,.04,70],[100.2,-.3,.06,.04],[101.5,-2.2,.05,.04],[104.0,-4.85,.07,.05],[120.6,-1.85,.1,.12],[121.35,-2.5,.06,.04],[121.5,-2.75,.15,.08],[119.95,-4.0,.1,.07],[122.95,.58,.07,.04],[140.55,-2.6,.12,.04],[136.3,-3.9,.08,.05],[116.2,-.5,.12,.07],[116.3,-.3,.08,.05],[112.1,.8,.15,.1],[102.7,-1.9,.06,.05]];
const IDN_VOLC = [[105.42,-6.1],[106.7,-6.75],[106.98,-6.78],[108.4,-6.9],[109.2,-7.24],[110.0,-7.3],[110.45,-7.54],[111.2,-7.63],[112.31,-7.93],[112.92,-8.1],[114.04,-8.12],[114.24,-8.06],[115.38,-8.24],[115.51,-8.34],[116.46,-8.41],[117.99,-8.25],[119.05,-8.2],[121.8,-8.77],[122.45,-8.67],[101.26,-1.7],[100.47,-.38],[98.39,3.17],[98.9,2.55],[96.33,4.77],[124.78,1.36],[125.45,3.68],[127.9,1.7],[127.33,.8],[129.88,-4.52],[133.0,-3.6]];
PRESETS.push({ id: 'indonesia2', name: 'Indonesia', order: 0, desc: 'The full archipelago in fine detail: 200+ islands, Lake Toba, Raja Ampat, Wakatobi, 30 volcanoes and the snowy peaks of Papua', w: 420, h: 170, k: 2.6, box: [94.0, 7.4, 8.5], shore: 3, ridgeK: 1.25, cam: [110.4, -7.5],
  islands: PRESETS[0].islands.map(o => o.snow ? Object.assign({}, o, { snowT: 1.32 }) : o).concat(IDN_EXTRA), ridges: PRESETS[0].ridges, shelves: PRESETS[0].shelves, lakes: IDN_LAKES, volc: IDN_VOLC });
for (const p of PRESETS) SIZES.push({ name: 'P', label: p.name, w: p.w, h: p.h, k: p.k, land: 0, coarse: 0, wc: 0, preset: p, empty: true });
const presetVolc = [];
function presetCamTile(z) {                                    // where the camera opens on an empty seed
  const p = z.preset; if (!p) return null;
  if (p.box) return [Math.round((p.cam[0] - p.box[0]) * p.box[2]), Math.round((p.box[1] - p.cam[1]) * p.box[2])];
  return [W >> 1, H >> 1];
}
function ptInPoly(px, py, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function genPreset(z, seed) {
  currentSeed = seed; creatures = []; effects.length = 0; bld.fill(0); fire.fill(0);
  for (let i = 0; i < N; i++) jit[i] = Math.floor((hash(i % W, (i / W) | 0, 7) - .5) * 14);
  const p = z.preset; presetVolc.length = 0;
  if (p.gen) { p.gen(seed); return; }
  const [lon0, lat0, s] = p.box, P = (lo, la) => [(lo - lon0) * s, (lat0 - la) * s];
  const isl = new Uint8Array(N);
  p.islands.forEach((is, k) => {
    let test, x0, x1, y0, y1;
    if (is.pts) {
      const pts = is.pts.map(q => P(q[0], q[1]));
      x0 = Math.min(...pts.map(q => q[0])) - 4; x1 = Math.max(...pts.map(q => q[0])) + 4; y0 = Math.min(...pts.map(q => q[1])) - 4; y1 = Math.max(...pts.map(q => q[1])) + 4;
      test = (wx, wy) => ptInPoly(wx, wy, pts);
    } else {
      const [lo, la, rx, ry, rot] = is.e, [cx, cy] = P(lo, la), rxT = Math.max(1.3, rx * s), ryT = Math.max(1.3, ry * s), th = rot * Math.PI / 180, ct = Math.cos(th), st = Math.sin(th), m = Math.max(rxT, ryT) + 4;
      x0 = cx - m; x1 = cx + m; y0 = cy - m; y1 = cy + m;
      test = (wx, wy) => { const dx = wx - cx, dy = wy - cy, u = dx * ct - dy * st, v = dx * st + dy * ct; return (u / rxT) ** 2 + (v / ryT) ** 2 <= 1; };
    }
    const amp = is.amp === undefined ? (is.pts ? 1 : .7) : is.amp;
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, Math.ceil(x1)); x++) {
      const wx = x + (fbm(x / 5, y / 5, seed + 3) - .5) * 3.4 * amp, wy = y + (fbm(x / 5 + 40, y / 5 + 40, seed + 4) - .5) * 3.4 * amp;
      if (test(wx, wy) && !isl[x + y*W]) isl[x + y*W] = k + 1;
    }
  });
  // depth inside land and distance out to sea
  const depth = new Int16Array(N), dw = new Int16Array(N).fill(99), q = new Int32Array(N); let qh = 0, qt = 0;
  const nb = (i, f) => { const x = i % W, y = (i / W) | 0; if (x > 0) f(i - 1); if (x < W - 1) f(i + 1); if (y > 0) f(i - W); if (y < H - 1) f(i + W); };
  for (let i = 0; i < N; i++) if (isl[i]) { let edge = false; nb(i, j => { if (!isl[j]) edge = true; }); const x = i % W, y = (i / W) | 0; if (edge || x === 0 || y === 0 || x === W - 1 || y === H - 1) { depth[i] = 1; q[qt++] = i; } }
  while (qh < qt) { const i = q[qh++]; nb(i, j => { if (isl[j] && !depth[j]) { depth[j] = depth[i] + 1; q[qt++] = j; } }); }
  qh = qt = 0;
  for (let i = 0; i < N; i++) if (!isl[i]) { let edge = false; nb(i, j => { if (isl[j]) edge = true; }); if (edge) { dw[i] = 1; q[qt++] = i; } }
  while (qh < qt) { const i = q[qh++]; if (dw[i] >= 12) continue; nb(i, j => { if (!isl[j] && dw[j] > dw[i] + 1) { dw[j] = dw[i] + 1; q[qt++] = j; } }); }
  const dmax = new Float32Array(p.islands.length + 1); for (let i = 0; i < N; i++) if (isl[i]) dmax[isl[i]] = Math.max(dmax[isl[i]], depth[i]);
  const rg = (p.ridges || []).map(r => ({ seg: r.pts.map(q2 => P(q2[0], q2[1])), w: r.w * (p.ridgeK || 1), h: r.h }));
  const shelves = (p.shelves || []).map(sh => sh.map(q2 => P(q2[0], q2[1])));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = x + y*W, k = isl[i];
    if (!k) {
      let sh = dw[i] <= (p.shore || 3);
      if (!sh && shelves.length) { const wx = x + (fbm(x / 6, y / 6, seed + 8) - .5) * 5, wy = y + (fbm(x / 6 + 9, y / 6 + 9, seed + 9) - .5) * 5; for (const poly of shelves) if (ptInPoly(wx, wy, poly)) { sh = true; break; } }
      tiles[i] = sh ? T.SHALLOW : T.DEEP; continue;
    }
    const is = p.islands[k - 1], d = depth[i], norm = Math.min(1, d / Math.max(4, dmax[k] * .9));
    let h = Math.pow(norm, .85) * (is.mh === undefined ? .7 : is.mh * .7) + (fbm(x / 9, y / 9, seed + 11) - .5) * .2;
    for (const r of rg) {
      let best = 1e9;
      for (let a = 0; a < r.seg.length; a++) {
        const [ax, ay] = r.seg[a], [bx, by] = r.seg[Math.min(a + 1, r.seg.length - 1)], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
        const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2)) : 0, dd = Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
        if (dd < best) best = dd;
      }
      if (best < r.w * 3) h += r.h * Math.exp(-((best / r.w) * (best / r.w)));
    }
    const mo = fbm(x / 8 + 50, y / 8 + 50, seed + 99), fo = is.fo === undefined ? .6 : is.fo;
    let t;
    if (d <= 1 && hash(x, y, 5) < (is.sand === undefined ? .8 : is.sand)) t = T.SAND;
    else if (h < .07) t = T.SAND;
    else if (h < .5) t = mo < .3 + fo * .4 ? T.FOREST : T.GRASS;
    else if (h < .66) t = T.HILL;
    else if (h < (is.snow ? (is.snowT || .92) : 9)) t = T.MOUNTAIN;
    else t = T.SNOW;
    tiles[i] = t;
  }
  for (const lk of p.lakes || []) {                              // lakes: water inside the island (never walkable)
    const [cx, cy] = P(lk[0], lk[1]), rx = Math.max(1.2, lk[2] * s), ry = Math.max(1.0, lk[3] * s), th = (lk[4] || 0) * Math.PI / 180, ct = Math.cos(th), st = Math.sin(th);
    for (let y = Math.max(0, Math.floor(cy - rx - 3)); y <= Math.min(H - 1, Math.ceil(cy + rx + 3)); y++) for (let x = Math.max(0, Math.floor(cx - rx - 3)); x <= Math.min(W - 1, Math.ceil(cx + rx + 3)); x++) {
      const wx = x + (fbm(x / 4, y / 4, seed + 21) - .5) * 2, wy = y + (fbm(x / 4 + 30, y / 4 + 30, seed + 22) - .5) * 2, dx = wx - cx, dy = wy - cy, u = dx * ct - dy * st, v = dx * st + dy * ct;
      if (isl[x + y*W] && (u / rx) * (u / rx) + (v / ry) * (v / ry) <= 1) tiles[x + y*W] = T.SHALLOW;
    }
  }
  for (const v of p.volc || []) {                                // volcano sites: a high cone with foothills
    const [cx, cy] = P(v[0], v[1]).map(Math.round); if (!inb(cx, cy)) continue;
    let landN = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inb(cx + dx, cy + dy) && isl[cx + dx + (cy + dy) * W]) landN++;
    if (landN < 5 || !isl[cx + cy * W]) continue;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const x = cx + dx, y = cy + dy, i = x + y * W, r = Math.hypot(dx, dy); if (!inb(x, y) || !isl[i]) continue;
      if (r <= 1.2) tiles[i] = T.MOUNTAIN; else if (r <= 2.4 && tiles[i] < T.HILL) tiles[i] = T.HILL; else if (r <= 3.2 && (tiles[i] === T.SAND)) tiles[i] = T.GRASS;
    }
    tiles[cx + cy * W] = T.MOUNTAIN; presetVolc.push(cx + cy * W);
  }
}
function generate(seed) { waterDirty = true; const z = SIZES[sizeIdx]; if (z.preset) genPreset(z, seed); else if (sizeIdx === 0) generateSmall(seed); else generateLarge(seed); }
function emptyWorld() {
  extinctRaces.clear(); chronicle.length = 0; completedGoals.clear(); warsResolved = 0; ships = []; nextShipId = 1;
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
  waterDirty = true;
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
  harbor: { pal: { o:'#1c1424', w:'#f4f1e6', b:'#8a5a34', B:'#c08a50', d:'#5e3a20', S:'#53c6e8', s:'#e8fbff', g:'#ffcf4a' }, A: [".....w......", "....ww......", "...wssw.....", "..wssssw....", ".wssssssw...", "..wwwwww....", "..bBBBBb....", ".bBBBBBBBb..", "oBBBBBBBBBBo", "oooooooooooo"] },
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
const SHIP_ATLAS = {};
const SHIP_ROWS = [".....w......", "....ww......", "...wssw.....", "..wssssw....", ".wssssssw...", "..wwwwww....", "..bBBBBb....", ".bBBBBBBBb..", "oBBBBBBBBBBo", "oooooooooooo"];
for (const race of ['human','elf','dwarf','orc','werewolf']) SHIP_ATLAS[race] = buildSprite({ pal: { o:'#1c1424', w:'#f4f1e6', b:'#8a5a34', B:'#c08a50', s:RACES[race].col }, A: SHIP_ROWS }, 'A');

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
const market = { p: Object.assign({ fin: 7, hide: 10 }, CBASE), d: {}, trades: 0 };
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
  sellCatch();
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
  return `<b>🏦 Market</b> 🪙<br>${rows.join(' &nbsp; ')} &nbsp; 🦈${market.p.fin.toFixed(1)}/${market.p.hide.toFixed(1)}<br>🛒 ${live} · ${market.trades} · 🎒 ${market.sold | 0}/${market.bought | 0}${items ? '<br>' + items : ''}`;
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
  if (SIZES[sizeIdx].preset) { for (const i of presetVolc) volcanoes.push({ i, x: i % W, y: (i / W) | 0, er: -1e9 }); return; }
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
    else if (kind === 'bit') { p.vx = (Math.random() - .5) * .16; p.vy = -.07 - Math.random() * .07; p.m = 18 + Math.random() * 14; p.c = o.col || '#c08a50'; }
    else if (kind === 'debris') { p.vx = Math.cos(a) * .24 * sp; p.vy = Math.sin(a) * .24 * sp - .13; p.m = 34 + Math.random() * 24; }
    else { p.vx = Math.cos(a) * .05 * sp; p.vy = -.01 - Math.random() * .03; p.m = 40 + Math.random() * 24; }     // dust
    p.l = p.m; parts.push(p);
  }
}
/* ============================== SEA LIFE: fish shoals (sardines near shore, grouper on reefs, tuna in the deep) ============================== */
const SHOAL = [
  { n: 'sardines', yieldM: 1,   col: ['#cfe3f2', '#ffffff'], sz: 1 },
  { n: 'grouper',  yieldM: 1.5, col: ['#ff9a62', '#ffe0b0'], sz: 1.15 },
  { n: 'tuna',     yieldM: 2.4, col: ['#6f9cc8', '#d8e8f6'], sz: 1.6 },
];
let shoals = [], shoalTarget = [0, 0, 0], shoreD = new Uint8Array(0);
function computeShoreD() {                                    // distance (in tiles) from every water tile to the nearest land
  shoreD = new Uint8Array(N).fill(255); const q = new Int32Array(N); let h = 0, t = 0;
  for (let i = 0; i < N; i++) if (tiles[i] > T.SHALLOW) { shoreD[i] = 0; q[t++] = i; }
  while (h < t) {
    const i = q[h++], d = shoreD[i]; if (d >= 60) continue; const x = i % W, y = (i / W) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + (k === 0) - (k === 1), ny = y + (k === 2) - (k === 3); if (!inb(nx, ny)) continue;
      const j = nx + ny*W; if (shoreD[j] === 255 && tiles[j] <= T.SHALLOW) { shoreD[j] = d + 1; q[t++] = j; }
    }
  }
}
function shoalOk(kind, x, y) {
  if (!inb(x, y)) return false; const i = x + y*W, t = tiles[i], d = shoreD[i];
  if (t > T.SHALLOW || d === 255) return false;
  return kind === 0 ? d >= 1 && d <= 10 : kind === 1 ? t === T.SHALLOW && d >= 1 && d <= 3 : t === T.DEEP && d >= 4;
}
function addShoal(kind) {
  for (let a = 0; a < 80; a++) {
    const x = ri(0, W - 1), y = ri(0, H - 1); if (!shoalOk(kind, x, y)) continue;
    if (shoals.some(s => s.kind === kind && Math.abs(s.x - x) + Math.abs(s.y - y) < 5)) continue;
    if (sharks.some(k => Math.hypot(k.x - x, k.y - y) < 5)) continue;                // a new shoal never forms on top of a shark
    shoals.push({ x, y, kind, stock: .75 + Math.random() * .25, tx: x, ty: y, hd: 1, ph: ri(0, 63) }); return true;
  }
  return false;
}
function seedShoals() {
  shoals = []; computeShoreD(); const cnt = [0, 0, 0];
  for (let i = 0; i < N; i++) { const d = shoreD[i], t = tiles[i]; if (t > T.SHALLOW || d === 255) continue; if (d >= 1 && d <= 10) cnt[0]++; if (t === T.SHALLOW && d >= 1 && d <= 3) cnt[1]++; if (t === T.DEEP && d >= 4) cnt[2]++; }
  shoalTarget = [Math.min(150, Math.round(cnt[0] / 45)), Math.min(70, Math.round(cnt[1] / 90)), Math.min(60, Math.round(cnt[2] / 380))];
  for (let k = 0; k < 3; k++) for (let q = 0; q < shoalTarget[k]; q++) addShoal(k);
}
function shoalNear(x, y, r, maxKind) {
  let best = null, bd = 1e9;
  for (const s of shoals) { if (s.kind > maxKind) continue; const d = Math.max(Math.abs(s.x - x), Math.abs(s.y - y)); if (d <= r && d < bd) { bd = d; best = s; } }
  return best;
}
function shoalTick() {
  if (tick % 1500 === 0) computeShoreD();
  const have = [0, 0, 0];
  for (let q = shoals.length - 1; q >= 0; q--) {
    const s = shoals[q], rx = Math.round(s.x), ry = Math.round(s.y);
    if (!inb(rx, ry) || tiles[rx + ry*W] > T.SHALLOW) { shoals.splice(q, 1); continue; }
    s.stock = Math.min(1, s.stock + .0003);
    if (s.stock < .12) { shoals.splice(q, 1); continue; }         // fished out: the shoal scatters (a new one forms elsewhere later)
    have[s.kind]++;
    const fk = sharks.find(k => Math.abs(k.x - s.x) < 5 && Math.abs(k.y - s.y) < 5);
    if (fk) {                                                     // a shark nearby: the shoal scatters away from it
      const ax = s.x - fk.x, ay = s.y - fk.y, al = Math.hypot(ax, ay) || 1, nx = s.x + ax / al * .3, ny = s.y + ay / al * .3;
      if (shoalOk(s.kind, Math.round(nx), Math.round(ny))) { s.x = nx; s.y = ny; s.hd = ax >= 0 ? 1 : -1; }
      else { const px = s.x - ay / al * .3, py = s.y + ax / al * .3; if (shoalOk(s.kind, Math.round(px), Math.round(py))) { s.x = px; s.y = py; } }
      s.tx = s.x; s.ty = s.y; continue;
    }
    if ((tick + s.ph) % 4) continue;
    if ((Math.abs(s.tx - s.x) < .6 && Math.abs(s.ty - s.y) < .6) || Math.random() < .03) {
      for (let a = 0; a < 6; a++) { const tx = rx + ri(-6, 6), ty = ry + ri(-6, 6); if (shoalOk(s.kind, tx, ty)) { s.tx = tx; s.ty = ty; break; } }
    }
    const dx = Math.sign(s.tx - s.x) * .5, dy = Math.sign(s.ty - s.y) * .5, nx = s.x + dx, ny = s.y + dy;
    if (shoalOk(s.kind, Math.round(nx), Math.round(ny))) { s.x = nx; s.y = ny; if (dx) s.hd = dx > 0 ? 1 : -1; } else { s.tx = s.x; s.ty = s.y; }
  }
  if (tick % 400 === 0) for (let k = 0; k < 3; k++) if (have[k] < shoalTarget[k]) addShoal(k);
}
function drawShoals(x0, y0, x1, y1) {
  if (!shoals.length) return;
  const t = frame * .03;
  for (const s of shoals) {
    if (s.x < x0 - 3 || s.x > x1 + 3 || s.y < y0 - 3 || s.y > y1 + 3) continue;
    const def = SHOAL[s.kind], cx = ox + (s.x + .5)*sc, cy = oy + (s.y + .5)*sc;
    if (sc < 5) { ctx.fillStyle = s.kind === 1 ? 'rgba(255,170,110,.62)' : s.kind === 2 ? 'rgba(150,190,235,.5)' : 'rgba(215,238,255,.6)'; const w = Math.max(3, sc * 1.4); ctx.fillRect(cx - w / 2, cy - w * .25, w, Math.max(2, w * .5)); continue; }
    const cnt = Math.max(3, Math.round((3 + s.stock * 5) * (s.kind === 2 ? .8 : 1))), f = Math.max(2, Math.round(sc * .17 * def.sz));
    ctx.fillStyle = 'rgba(8,28,70,.2)'; ctx.beginPath(); ctx.ellipse(cx, cy + sc * .12, sc * (s.kind === 2 ? 1.7 : 1.25), sc * (s.kind === 2 ? .95 : .72), 0, 0, 7); ctx.fill();   // soft shadow so the shoal reads from afar
    ctx.globalAlpha = s.kind === 2 ? .62 : .8;
    for (let i = 0; i < cnt; i++) {
      const sg = i % 2 ? 1 : -1, a = i * 2.399 + t * sg * .8 + s.ph, rr = (.35 + (i % 3) * .28) * sc * (s.kind === 2 ? 1.3 : 1);
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * .55, face = -Math.sin(a) * sg >= 0 ? 1 : -1, bx = px - face * f * 1.5;
      ctx.fillStyle = def.col[0]; ctx.fillRect(px - f * 1.5, py - f * .5, f * 3, f);                        // body
      ctx.fillRect(face > 0 ? bx - f : bx, py - f * .9, f, f * 1.8);                                         // tail
      ctx.fillStyle = def.col[1]; ctx.fillRect(px - f * 1.2, py - f * .5, f * 2.4, Math.max(1, f * .35));   // bright back
      if (s.kind === 1) { ctx.fillStyle = '#c85a30'; ctx.fillRect(px - f * .3, py - f * .5, f * .6, f); }   // grouper stripe
      if (s.kind === 2) { ctx.fillStyle = '#41668f'; ctx.fillRect(px - f * .4, py - f * 1.1, f * .9, f * .6); }   // tuna fin
      ctx.fillStyle = '#10182a'; ctx.fillRect(px + face * f * .9 - f * .2, py - f * .3, Math.max(1, f * .4), Math.max(1, f * .4));
    }
    ctx.globalAlpha = 1;
    if (sc >= 8 && Math.random() < .0012) emit('bit', s.x, s.y - .3, 4, { col: '#d4ecff' });                // a fish leaps
  }
}
/* ============================== SEA LIFE: sharks (patrol the deep, hunt ships, bite far-out fishers; fish tool + tap info) ============================== */
let sharks = [], nextSharkId = 1, sharkTarget = 0;
const SHARK_HP = 60, SHARK_MODE = ['Patrolling the deep', 'Hunting a ship', 'Feeding on a shoal', 'Fleeing'];
function shoalDist(x, y) { let d = 1e9; for (const q of shoals) { const e = Math.hypot(q.x - x, q.y - y); if (e < d) d = e; } return d; }
function sharkOk(x, y) { if (!inb(x, y)) return false; const i = x + y*W; return tiles[i] <= T.SHALLOW && shoreD[i] !== 255 && shoreD[i] >= 2; }
function addShark(x, y) {
  if (x == null) for (let a = 0; a < 80; a++) {
    const rx = ri(0, W - 1), ry = ri(0, H - 1);
    if (tiles[rx + ry*W] === T.DEEP && sharkOk(rx, ry) && shoreD[rx + ry*W] >= 4 && !sharks.some(s => Math.abs(s.x - rx) + Math.abs(s.y - ry) < 14) && shoalDist(rx, ry) > 4) { x = rx; y = ry; break; }
  }
  if (x == null || !sharkOk(x, y)) return null;
  const s = { id: nextSharkId++, x, y, tx: x, ty: y, hd: 1, hp: SHARK_HP, cd: 0, fl: 0, mode: 0, ph: ri(0, 63) };
  sharks.push(s); return s;
}
function seedSharks() {
  sharks = []; let deep = 0;
  for (let i = 0; i < N; i++) if (tiles[i] === T.DEEP && shoreD[i] !== 255 && shoreD[i] >= 4) deep++;
  sharkTarget = deep < 150 ? 0 : Math.min(24, Math.max(2, Math.round(deep / 700)));
  for (let q = 0; q < sharkTarget; q++) addShark();
  krakens = []; krakenCd = 9000 + ri(0, 6000); wrecks = [];
}
function sharkHit(x, y, r) {                                  // lightning, meteors and smiting kill sharks in range
  for (let q = sharks.length - 1; q >= 0; q--) { const s = sharks[q]; if ((s.x - x) ** 2 + (s.y - y) ** 2 <= r * r + 1) { fx('splash', Math.round(s.x), Math.round(s.y)); emit('bit', s.x, s.y, 8, { col: '#bfe6ff' }); sharks.splice(q, 1); } }
}
function sharkAttackShip(s, ship) {
  const si = ships.indexOf(ship), k = kingdoms.get(ship.kingdomId), nm = k ? k.name : 'A', risk = +((cfg.settings && cfg.settings.shipwreckRisk) ?? 3);
  s.cd = 500; s.mode = 3; s.fl = 140; fx('splash', Math.round(ship.x), Math.round(ship.y)); emit('bit', ship.x, ship.y, 8, { col: '#bfe6ff' }); haptic('thud');
  if (si >= 0 && Math.random() < Math.min(.5, risk * .08)) wreckShip(ship, si, 'shark');
  else { addChronicle('🦈', `A shark attacked a ship of ${nm}, but it escaped`); toast(`🦈 Shark attack! The ship of ${nm} escaped`); }
}
function sharkTick() {
  for (let q = sharks.length - 1; q >= 0; q--) {
    const s = sharks[q], rx = Math.round(s.x), ry = Math.round(s.y);
    if (!inb(rx, ry) || tiles[rx + ry*W] > T.SHALLOW) { sharks.splice(q, 1); continue; }
    if (s.cd > 0) s.cd--; if (s.fl > 0) s.fl--; if (s.hp < SHARK_HP) s.hp += .01;
    let prey = null, pd = 1e9, shoal = null;
    if (!s.fl) {
      for (const sh of ships) { const d = Math.max(Math.abs(sh.x - s.x), Math.abs(sh.y - s.y)); if (d < 8 && d < pd) { pd = d; prey = sh; } }
      if (!prey) shoal = shoalNear(s.x, s.y, 7, 2);
    }
    if (prey) { s.mode = 1; s.tx = prey.x; s.ty = prey.y; if (pd < 1.4 && s.cd <= 0) sharkAttackShip(s, prey); }
    else if (shoal) {
      s.mode = 2; const ang = tick * .012 + s.ph; s.tx = shoal.x + Math.cos(ang) * 3.6; s.ty = shoal.y + Math.sin(ang) * 3.6;      // sharks stalk a shoal from a distance, never inside it
      if (Math.hypot(shoal.x - s.x, shoal.y - s.y) < 5) shoal.stock = Math.max(0, shoal.stock - .0012);
    } else {
      s.mode = s.fl ? 3 : 0;
      if ((Math.abs(s.tx - s.x) < 1 && Math.abs(s.ty - s.y) < 1) || Math.random() < .01) for (let a = 0; a < 10; a++) { const tx = rx + ri(-12, 12), ty = ry + ri(-12, 12); if (sharkOk(tx, ty)) { s.tx = tx; s.ty = ty; break; } }
    }
    const dx = s.tx - s.x, dy = s.ty - s.y, dist = Math.hypot(dx, dy);
    if (dist > .05) {
      const stp = Math.min(s.mode === 1 ? .32 : .2, dist), nx = s.x + dx / dist * stp, ny = s.y + dy / dist * stp;
      const dNew = shoalDist(nx, ny);
      if (sharkOk(Math.round(nx), Math.round(ny)) && !(dNew < 2.4 && dNew < shoalDist(s.x, s.y))) { s.x = nx; s.y = ny; if (Math.abs(dx) > .1) s.hd = dx > 0 ? 1 : -1; } else { s.tx = s.x; s.ty = s.y; }
    }
    if (s.cd <= 0 && (tick + s.ph) % 10 === 0) for (const c of creatures) {        // far-out fishers can be bitten
      const j = c.job; if (!j || j.k !== 'fish' || j.ph !== 1 || c.hp <= 0) continue;
      if (Math.max(Math.abs(j.wx - s.x), Math.abs(j.wy - s.y)) > 2 || Math.random() > .35) continue;
      c.hp -= 8; c.job = null; s.cd = 300; s.mode = 3; s.fl = 100; fx('hit', c.x, c.y); fx('splash', j.wx, j.wy);
      if (c.hp <= 0) { c.cause = 'shark'; addChronicle('🦈', 'A fisher was killed by a shark'); }
      break;
    }
  }
  if (tick % 600 === 0 && sharks.length < sharkTarget) addShark();
}
function drawSharks(x0, y0, x1, y1) {
  for (const s of sharks) {
    if (s.x < x0 - 3 || s.x > x1 + 3 || s.y < y0 - 3 || s.y > y1 + 3) continue;
    const cx = ox + (s.x + .5)*sc, cy = oy + (s.y + .5)*sc;
    if (sc < 5) { ctx.fillStyle = 'rgba(24,36,60,.9)'; ctx.fillRect(cx - 2, cy - 1, 5, 3); ctx.fillRect(cx - 1, cy - 3, 2, 2); continue; }
    const u = Math.max(1, sc * .15), t = frame * .07 + s.ph, wag = Math.sin(t * 2) * u * .9;
    ctx.fillStyle = 'rgba(6,20,50,.3)'; ctx.beginPath(); ctx.ellipse(cx, cy + u * 2.4, u * 9, u * 2.4, 0, 0, 7); ctx.fill();               // body under the surface
    ctx.strokeStyle = 'rgba(235,248,255,.5)'; ctx.lineWidth = Math.max(1, u * .5);
    for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(cx - s.hd * (u * 8 + k * u * 2), cy + u * (1.4 + k * .7)); ctx.lineTo(cx - s.hd * (u * 11 + k * u * 3), cy + u * (1.4 + k * 1.4)); ctx.stroke(); }   // wake
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s.hd, 1); ctx.globalAlpha = .96;
    ctx.fillStyle = '#3e5068'; ctx.fillRect(-u * 6, -u * .6, u * 11, u * 2.6);                                                                  // body
    ctx.fillStyle = '#d3dfea'; ctx.fillRect(-u * 5, u * .9, u * 9, u * 1.1);                                                                    // belly
    ctx.fillStyle = '#4d6178'; ctx.fillRect(u * 5, u * .1, u * 1.8, u * 1.6);                                                                   // snout
    ctx.beginPath(); ctx.moveTo(-u * 6, u * .4); ctx.lineTo(-u * 8.6, -u * 2 + wag); ctx.lineTo(-u * 8, u * .6); ctx.lineTo(-u * 8.6, u * 3 + wag); ctx.closePath(); ctx.fill();   // tail
    ctx.fillStyle = '#34465c'; ctx.beginPath(); ctx.moveTo(-u * 1.6, -u * .6); ctx.lineTo(u * .6, -u * 3.6); ctx.lineTo(u * 1.6, -u * .6); ctx.closePath(); ctx.fill();   // dorsal fin
    ctx.fillRect(u * .6, u * 1.6, u * 1.8, u * 1.4);                                                                                            // pectoral fin
    ctx.fillStyle = '#10182a'; ctx.fillRect(u * 3.8, u * .1, Math.max(1, u * .6), Math.max(1, u * .6));                                        // eye
    ctx.restore();
  }
}
function shoalHtml(sh) {
  const d = SHOAL[sh.kind], pct = Math.round(sh.stock * 100);
  return `<b>🐟 ${d.n[0].toUpperCase() + d.n.slice(1)}</b> · shoal<br>Stock ${pct}%<div style="height:8px;margin:5px 0;border-radius:4px;background:#1a2748;overflow:hidden"><i style="display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,#55caff,#ffda55)"></i></div><small>${sh.kind === 2 ? 'Deep-sea fishing boats catch tuna here.' : 'Fishers and boats catch food here.'} Overfishing scatters a shoal.</small>`;
}
function sharkHtml(s) { return `<b>🦈 Shark</b><br>❤️ ${Math.ceil(s.hp)}/${SHARK_HP}<br>${SHARK_MODE[s.mode]}<br><small>Can sink ships and bite fishers. Smite, lightning or a meteor can kill it.</small>`; }
/* ============================== SEA LIFE: the kraken (a rare deep-sea terror) + premium ocean layers ============================== */
let krakens = [], krakenCd = 9000 + ((Math.random() * 6000) | 0), nextKrakenId = 1, waterDirty = true;
const KRAKEN_HP = 320, KRAKEN_MODE = ['Rising from the deep', 'Hunting', 'Sinking back down'];
const SNL = new Float32Array(1024); for (let k = 0; k < 1024; k++) SNL[k] = Math.sin(k / 1024 * Math.PI * 2);
const SN = a => SNL[(a * 162.9747) & 1023];                      // fast periodic sine (so every sea animation loops cleanly)
const WR = new Float32Array(31 * 3);                              // water colour per depth step (0 = beach shallows ... 30 = the abyss)
(() => {
  const stops = [[0, 112, 214, 206], [1, 90, 196, 208], [2, 68, 174, 212], [3, 54, 152, 210], [4, 48, 142, 208], [5, 40, 122, 198], [8, 32, 98, 178], [12, 26, 76, 156], [18, 20, 56, 126], [30, 11, 30, 82]];
  for (let d = 0; d <= 30; d++) {
    let a = stops[0], b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) if (d >= stops[s][0] && d <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    const f = b[0] === a[0] ? 0 : (d - a[0]) / (b[0] - a[0]);
    for (let c = 0; c < 3; c++) WR[d * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * f;
  }
})();
function krakenOk(x, y) { if (!inb(x, y)) return false; const i = x + y*W; return tiles[i] <= T.SHALLOW && shoreD[i] !== 255 && shoreD[i] >= 2; }
function krakenRoar(x, y) { if (Snd.ctx && Snd.on && !editMode && started && can('kraken', 2500)) { const v = sndAt(x, y); if (v > 0) SFX.kraken(v); } }
function summonKraken(x, y, manual) {
  if (shoreD.length !== N || shoreD[x + y*W] === 255) computeShoreD();
  if (!krakenOk(x, y)) return null;
  const k = { id: nextKrakenId++, x, y, tx: x, ty: y, hd: 1, hp: KRAKEN_HP, st: 0, t: 0, life: manual ? 2400 : 1800, manual: !!manual, cd: 120, kills: 0, atk: null, dock: manual || Math.random() < .6, ph: ri(0, 63) };
  krakens.push(k); fx('boom', x, y, { r: 4 }); krakenRoar(x, y); haptic('warning'); shakeT = 14;
  addChronicle('🐙', manual ? 'A kraken was summoned from the abyss' : 'A kraken has risen from the deep!'); banner('🐙', 'Kraken!', manual ? 'Summoned from the abyss' : 'A kraken rises from the deep', 'bad');
  return k;
}
function krakenHit(x, y, r, dmg) {                              // smite, lightning and meteors hurt it; 320 health in all
  for (const k of krakens) {
    if (k.st === 2 || (k.x - x) ** 2 + (k.y - y) ** 2 > (r + 2) ** 2) continue;
    k.hp -= dmg; emit('bit', k.x, k.y - 1, 10, { col: '#e8a0ff' });
    if (k.hp <= 0) { k.st = 2; k.t = 0; k.atk = null; krakenCd = 16000 + ri(0, 8000); fx('boom', Math.round(k.x), Math.round(k.y), { r: 4 }); banner('🐙', 'Kraken slain!', 'The sea is safe, for now', 'good'); addChronicle('🐙', 'The kraken was slain'); }
  }
}
function krakenAttack(k) {
  const a = k.atk, risk = +((cfg.settings && cfg.settings.shipwreckRisk) ?? 3);
  if (a.kind === 'ship') {
    const si = ships.indexOf(a.ref); if (si < 0) return;
    const kg = kingdoms.get(a.ref.kingdomId), nm = kg ? kg.name : 'A';
    if (Math.random() < (k.manual ? .9 : Math.min(.85, .45 + risk * .05))) { wreckShip(a.ref, si, 'kraken'); k.kills++; }
    else { addChronicle('🐙', `The kraken seized a ship of ${nm}, but it broke free`); toast(`🐙 A ship of ${nm} broke free of the kraken`); }
    fx('boom', Math.round(a.ref.x), Math.round(a.ref.y), { r: 3 });
  } else {
    const kg = kingdoms.get(a.kid); fx('boom', a.tx, a.ty, { r: 3 }); emit('debris', a.tx, a.ty, 20); emit('dust', a.tx, a.ty, 10, { sx: 2 }); shakeT = 16; haptic('thud');
    if (kg) { kg.wood = Math.max(0, (kg.wood | 0) - 25); kg.voyageCd = Math.max(kg.voyageCd || 0, tick + 3000); addChronicle('🐙', `The kraken smashed the harbor of ${kg.name}`); banner('🐙', 'Harbor smashed', `The harbor of ${kg.name} was destroyed`, 'bad'); }
    for (const c of creatures) if (Math.abs(c.x - a.tx) <= 3 && Math.abs(c.y - a.ty) <= 3) c.hp -= 15;
  }
}
function krakenTick() {
  const risk = +((cfg.settings && cfg.settings.shipwreckRisk) ?? 3);
  if (!editMode && !krakens.length && risk > 0 && --krakenCd <= 0) {                   // rare, and only when there is something at sea to menace
    krakenCd = 2400;
    if (ships.length || [...kingdoms.values()].some(g => g.tech.includes('voyage'))) for (let a = 0; a < 40; a++) { const x = ri(0, W - 1), y = ri(0, H - 1); if (tiles[x + y*W] === T.DEEP && shoreD[x + y*W] !== 255 && shoreD[x + y*W] >= 8) { summonKraken(x, y, false); break; } }
  }
  for (let q = krakens.length - 1; q >= 0; q--) {
    const k = krakens[q]; k.t++;
    if (k.st === 0) { if (k.t >= 90) { k.st = 1; k.t = 0; } continue; }
    if (k.st === 2) { if (k.t >= 80) { fx('splash', Math.round(k.x), Math.round(k.y)); krakens.splice(q, 1); if (krakenCd < 12000) krakenCd = 12000 + ri(0, 9000); } continue; }
    if (k.cd > 0) k.cd--;
    if (--k.life <= 0 || k.kills >= 3) { k.st = 2; k.t = 0; k.atk = null; continue; }
    if (k.atk) { k.atk.t++; if (k.atk.t === 40) krakenAttack(k); if (k.atk.t >= 75) { k.atk = null; k.cd = 260; } continue; }
    let tgt = null, td = 1e9;
    for (const s of ships) { const d = Math.hypot(s.x - k.x, s.y - k.y); if (d < 18 && d < td) { td = d; tgt = { kind: 'ship', ref: s, x: s.x, y: s.y }; } }
    if (!tgt && k.dock) for (const g of kingdoms.values()) if (g.lm && g.lm.harbor != null) { const hx = g.lm.harbor % W, hy = (g.lm.harbor / W) | 0, d = Math.hypot(hx - k.x, hy - k.y); if (d < 24 && d < td) { td = d; tgt = { kind: 'dock', kid: g.id, x: hx, y: hy, tx: hx, ty: hy }; } }
    if (tgt) {
      k.tx = tgt.x; k.ty = tgt.y;
      if (k.cd <= 0 && td < (tgt.kind === 'ship' ? 2.8 : 3.4)) { k.atk = Object.assign({ t: 0 }, tgt); krakenRoar(k.x, k.y); continue; }
    } else if ((Math.abs(k.tx - k.x) < 1 && Math.abs(k.ty - k.y) < 1) || Math.random() < .01) for (let a = 0; a < 10; a++) { const tx = Math.round(k.x) + ri(-12, 12), ty = Math.round(k.y) + ri(-12, 12); if (krakenOk(tx, ty)) { k.tx = tx; k.ty = ty; break; } }
    const dx = k.tx - k.x, dy = k.ty - k.y, dist = Math.hypot(dx, dy);
    if (dist > .05) {
      const stp = Math.min(tgt && tgt.kind === 'ship' ? .27 : .18, dist), nx = k.x + dx / dist * stp, ny = k.y + dy / dist * stp;
      if (krakenOk(Math.round(nx), Math.round(ny))) { k.x = nx; k.y = ny; if (Math.abs(dx) > .1) k.hd = dx > 0 ? 1 : -1; } else { k.tx = k.x; k.ty = k.y; }
    }
  }
}
function drawKrakens(x0, y0, x1, y1) {
  for (const k of krakens) {
    if (k.x < x0 - 12 || k.x > x1 + 12 || k.y < y0 - 12 || k.y > y1 + 12) continue;
    const cx = ox + (k.x + .5)*sc, cy = oy + (k.y + .5)*sc, t = frame * .05 + k.ph;
    const rise = k.st === 0 ? Math.min(1, k.t / 90) : k.st === 2 ? Math.max(0, 1 - k.t / 80) : 1, e = rise * rise * (3 - 2 * rise);
    if (sc < 5) { ctx.fillStyle = `rgba(30,10,40,${.6 * e})`; ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, sc * 2.4 * e), 0, 7); ctx.fill(); ctx.fillStyle = '#ffd24a'; ctx.fillRect(cx - 2, cy - 1, 2, 2); ctx.fillRect(cx + 1, cy - 1, 2, 2); continue; }
    const u = sc * .24 * e + .01;
    ctx.fillStyle = `rgba(4,10,30,${.38 * e})`; ctx.beginPath(); ctx.ellipse(cx, cy + u * 2, u * 15, u * 8, 0, 0, 7); ctx.fill();                     // the huge shape under the water
    ctx.strokeStyle = `rgba(210,235,255,${.4 * e})`; ctx.lineWidth = Math.max(1, u * .5);
    for (let r = 0; r < 3; r++) { const rr = u * (9 + r * 3.2), a0 = t * (1.2 - r * .25) + r * 2; ctx.beginPath(); ctx.ellipse(cx, cy + u * 2, rr, rr * .5, 0, a0, a0 + 2.2); ctx.stroke(); }   // whirlpool
    const at = k.atk, tgx = at ? ox + (at.kind === 'ship' ? at.ref.x + .5 : at.tx + .5) * sc : 0, tgy = at ? oy + (at.kind === 'ship' ? at.ref.y + .5 : at.ty + .5) * sc : 0, reach = at ? Math.min(1, at.t / 28) * (at.t > 60 ? Math.max(0, 1 - (at.t - 60) / 15) : 1) : 0;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 7) * Math.PI, bx = cx + Math.cos(a) * u * 3.2, by = cy + u * .8 + Math.sin(a) * u * 1.6, grab = at && (i === 1 || i === 3 || i === 6) && reach > 0;
      let px = bx, py = by, dir = a;
      for (let j = 0; j < 12; j++) {
        const f = j / 12; let nx, ny;
        if (grab) {                                               // reach out, arch over and wrap the target
          const m = f * reach, ex = bx + (tgx - bx) * m, ey = by + (tgy - by) * m - Math.sin(m * Math.PI) * u * 7 + Math.sin(t * 5 + i + j) * u * .3 * (1 - reach);
          nx = ex; ny = ey;
        } else {
          dir += SN(t * .21 + i * 1.1 + j * .55) * .3 * (f + .3) + (i < 4 ? -.05 : .05) * f; const ls = u * 1.15 * e;
          nx = px + Math.cos(dir) * ls; ny = py + Math.sin(dir) * ls;
        }
        ctx.strokeStyle = j < 6 ? '#6a2a5c' : '#8c4476'; ctx.lineWidth = Math.max(1, u * 1.9 * (1 - f * .82));
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
        if (j % 3 === 1 && u > 1.2) { ctx.fillStyle = '#e9b0d0'; ctx.fillRect(nx - u * .25, ny + u * .15, Math.max(1, u * .5), Math.max(1, u * .5)); }   // suckers
        px = nx; py = ny;
      }
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#6a2858'; ctx.beginPath(); ctx.ellipse(cx, cy + u * .2, u * 4.8, u * 3, 0, 0, 7); ctx.fill();                                  // head
    ctx.fillStyle = '#7a2f68'; ctx.beginPath(); ctx.ellipse(cx, cy - u * 2.4, u * 4.2, u * 5.2, 0, 0, 7); ctx.fill();                               // mantle
    ctx.fillStyle = 'rgba(190,100,160,.55)'; ctx.beginPath(); ctx.ellipse(cx - u * 1.2, cy - u * 3.6, u * 1.6, u * 2.6, -.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a1f4a'; for (const q of [[-1.6, -4.6, .5], [1.4, -5.4, .6], [2.4, -3, .45], [-2.4, -2.4, .5], [.2, -6.8, .4]]) { ctx.beginPath(); ctx.arc(cx + q[0] * u, cy + q[1] * u, q[2] * u, 0, 7); ctx.fill(); }
    const gl = .7 + .3 * SN(t * 1.3), ey = cy - u * .1;
    for (const sd of [-1, 1]) {
      const ex = cx + sd * u * 2.1, g2 = ctx.createRadialGradient(ex, ey, 0, ex, ey, u * 2.2); g2.addColorStop(0, `rgba(255,210,70,${.55 * gl * e})`); g2.addColorStop(1, 'rgba(255,210,70,0)'); ctx.fillStyle = g2; ctx.fillRect(ex - u * 2.2, ey - u * 2.2, u * 4.4, u * 4.4);
      ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(ex, ey, u * 1.05, u * .85, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a0a1c'; ctx.fillRect(ex - u * .18, ey - u * .75, Math.max(1, u * .36), u * 1.5);
      ctx.fillStyle = '#3a1030'; ctx.fillRect(ex - u * 1.3, ey - u * 1.4 + (sd < 0 ? 0 : 0), u * 2.6, Math.max(1, u * .45));
    }
    ctx.fillStyle = 'rgba(22,76,150,.62)'; ctx.beginPath(); ctx.ellipse(cx, cy + u * 1.8, u * 5.4, u * 1.7, 0, 0, 7); ctx.fill();                      // the waterline hides the lower body
    ctx.strokeStyle = 'rgba(235,248,255,.65)'; ctx.lineWidth = Math.max(1, u * .4); ctx.beginPath(); ctx.ellipse(cx, cy + u * 1.8, u * 5.4, u * 1.7, 0, .15, Math.PI - .15); ctx.stroke();
    if (e < 1 && k.st !== 1 && Math.random() < .3) emit('bit', k.x + (Math.random() - .5) * 5, k.y + Math.random(), 2, { col: '#d4ecff' });
  }
}
function drawSeaDetails(x0, y0, x1, y1) {                          // ripples that swell and fade, and whitecaps that drift with the swell (each loops every 160 frames)
  if (sc < 7 || shoreD.length !== N) return;
  ctx.lineWidth = Math.max(1, sc * .07);
  for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
    const i = x + y*W; if (tiles[i] > T.SHALLOW) continue;
    const hh = (i * 2654435761) >>> 0, m = hh % 61; if (m > 1) continue;
    const ph = ((frame + (hh >>> 8) % 160) % 160) / 160, d = shoreD[i], a = (1 - ph) * (1 - ph) * (d > 6 ? .34 : .22);
    const px = ox + (x + .3 + ((hh >> 4) & 7) / 12) * sc, py = oy + (y + .3 + ((hh >> 12) & 7) / 12) * sc;
    if (m === 0) { ctx.strokeStyle = `rgba(230,246,255,${a})`; ctx.beginPath(); ctx.ellipse(px, py, sc * (.1 + .5 * ph), sc * (.05 + .25 * ph), 0, 0, 6.3); ctx.stroke(); }
    else if (d > 4) { const wx = px + (ph - .5) * sc * 1.4; ctx.strokeStyle = `rgba(240,250,255,${a * 1.2})`; ctx.beginPath(); ctx.moveTo(wx - sc * .35, py); ctx.quadraticCurveTo(wx, py - sc * .1, wx + sc * .35, py); ctx.stroke(); }
  }
}
function krakenHtml(k) { return `<b>🐙 Kraken</b><br>❤️ ${Math.max(0, Math.ceil(k.hp))}/${KRAKEN_HP} · ${KRAKEN_MODE[k.st]}<br>Sank ${k.kills} ship${k.kills === 1 ? '' : 's'}<br><small>It drags ships under and smashes harbors. Smite, lightning and meteors can slay it.</small>`; }
/* ============================== SEA LIFE II: harpoons, shark trade, shipwrecks and salvage ============================== */
let wrecks = [];
function harpoon(s) {                                          // fishing boats spear fish at their shoal and harpoon any shark that comes close
  if (!s.phase.startsWith('fishing') || (s.hc = (s.hc || 0) - 1) > 0) return;
  const k = kingdoms.get(s.kingdomId); if (!k) return;
  let tgt = null, td = 9;
  for (const sk of sharks) { const d = Math.hypot(sk.x - s.x, sk.y - s.y); if (d < td) { td = d; tgt = sk; } }
  const sx = Math.round(s.x), sy = Math.round(s.y);
  if (tgt) {
    s.hc = 25; fx('arrow', sx, sy, { tx: Math.round(tgt.x), ty: Math.round(tgt.y) }); fx('hit', Math.round(tgt.x), Math.round(tgt.y)); emit('bit', tgt.x, tgt.y, 5, { col: '#ff8a8a' });
    tgt.hp -= 24;
    if (tgt.hp <= 0) {
      sharks.splice(sharks.indexOf(tgt), 1); fx('splash', Math.round(tgt.x), Math.round(tgt.y));
      k.fin = Math.min(250, (k.fin | 0) + 1 + (Math.random() < .5 ? 1 : 0)); k.hide = Math.min(250, (k.hide | 0) + 1);
      addChronicle('🦈', `Harpooners of ${k.name} killed a shark`); toast('🦈 Harpooners killed a shark: fins and hide to sell!');
    }
    return;
  }
  if (s.phase === 'fishing') {
    const sh = shoalNear(s.x, s.y, 6, 2);
    if (sh) { s.hc = 32; fx('arrow', sx, sy, { tx: Math.round(sh.x), ty: Math.round(sh.y) }); fx('splash', Math.round(sh.x), Math.round(sh.y)); emit('bit', sh.x, sh.y - .2, 5, { col: '#d4ecff' }); sh.stock = Math.max(0, sh.stock - .035); s.haul = Math.min(60, (s.haul || 0) + [2, 4, 8][sh.kind]); }
    else s.hc = 40;
  } else s.hc = 20;
}
function sellCatch() {                                         // shark fins and hides go to market; selling many pushes the price down, and it recovers
  market.p.fin += (7 - market.p.fin) * .05; market.p.hide += (10 - market.p.hide) * .05;
  for (const k of kingdoms.values()) {
    const f = k.fin | 0, h = k.hide | 0; if (!f && !h) continue;
    const pay = Math.max(1, Math.round(f * market.p.fin + h * market.p.hide));
    k.gold = Math.min(250, (k.gold | 0) + pay); k.fin = 0; k.hide = 0;
    market.p.fin = Math.max(3, market.p.fin * (1 - .05 * f)); market.p.hide = Math.max(4.5, market.p.hide * (1 - .05 * h));
    addChronicle('🪙', `${k.name} sold shark fins and hides for ${pay} gold`); fx('tech', Math.round(k.cap % W), Math.round((k.cap / W) | 0), { ic: '🪙' });
  }
}
function raiseWreck(wk, manual) {                              // refloat a sunken ship: it sails home empty and goes back into service
  const k = kingdoms.get(wk.kid);
  if (!k) { if (manual) toast('⚓ Its owners are gone'); return false; }
  if (ships.some(s => s.kingdomId === k.id)) { if (manual) toast(`⚓ ${k.name} already has a ship at sea`); return false; }
  if (compDirty) computeComps();
  const src = k.lm && k.lm.harbor != null && adjacentWater(k.lm.harbor) >= 0 ? k.lm.harbor : coastalLandNear(k, 24);
  if (src < 0) { if (manual) toast('⚓ It has no harbor'); return false; }
  const goals = new Int32Array(N); goals.fill(-1); goals[adjacentWater(src)] = src;
  const route = findWaterRoute(tiles, W, H, wk.x + wk.y*W, goals);
  if (!route) { if (manual) toast('⚓ No sea route home'); return false; }
  if (!manual) { if ((k.wood | 0) < 15) return false; k.wood -= 15; }
  ships.push({ id: nextShipId++, race: k.race, kingdomId: k.id, x: wk.x, y: wk.y, path: route.path, step: 0, move: 0, phase: 'fishing_return', sourceLand: src, targetLand: -1, targetComp: 0, crew: [], wreckAt: 0, fishTimer: 0, salvage: true });
  wrecks.splice(wrecks.indexOf(wk), 1); fx('splash', wk.x, wk.y); emit('bit', wk.x, wk.y, 10, { col: '#bfe6ff' }); haptic('success');
  addChronicle('⚓', `${k.name} raised its sunken ship`); toast(`⚓ ${k.name}'s sunken ship was raised`);
  return true;
}
function drawWrecks(x0, y0, x1, y1) {
  for (const wk of wrecks) {
    if (wk.x < x0 - 3 || wk.x > x1 + 3 || wk.y < y0 - 3 || wk.y > y1 + 3) continue;
    const cx = ox + (wk.x + .5)*sc, cy = oy + (wk.y + .5)*sc;
    if (sc < 5) { ctx.fillStyle = 'rgba(24,14,22,.8)'; ctx.fillRect(cx - 3, cy - 1, 6, 3); ctx.fillStyle = '#c08a50'; ctx.fillRect(cx - 1, cy - 4, 2, 3); continue; }
    const u = Math.max(1, sc * .1), t = frame * .04 + wk.x;
    ctx.fillStyle = 'rgba(4,10,30,.4)'; ctx.beginPath(); ctx.ellipse(cx, cy + u * 2, u * 8, u * 3.2, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(cx, cy + u); ctx.rotate(-.28);
    ctx.fillStyle = '#3e2a1c'; ctx.fillRect(-u * 6, -u, u * 12, u * 3.2); ctx.fillStyle = '#5a3c26'; ctx.fillRect(-u * 6, -u, u * 12, Math.max(1, u * .7));
    ctx.fillStyle = '#2a1a12'; for (let k = -5; k <= 4; k += 3) ctx.fillRect(k * u, -u * 2.4, Math.max(1, u * .6), u * 1.6);                     // broken ribs
    ctx.fillStyle = '#4a3020'; ctx.fillRect(-u * .4, -u * 6, Math.max(1, u * .8), u * 5); ctx.fillStyle = 'rgba(214,204,180,.8)'; ctx.fillRect(u * .4, -u * 5.4, u * 2.6, u * 2.2);   // snapped mast and torn sail
    ctx.restore();
    ctx.fillStyle = 'rgba(30,100,170,.42)'; ctx.beginPath(); ctx.ellipse(cx, cy + u * 1.6, u * 7, u * 2.4, 0, 0, 7); ctx.fill();               // the water closes over the hull
    ctx.fillStyle = '#7a5434'; for (let k = 0; k < 3; k++) ctx.fillRect(cx + (k - 1) * u * 4 + SN(t + k * 2) * u, cy + u * 3.4 + SN(t * 1.3 + k) * u * .5, u * 1.6, Math.max(1, u * .5));   // floating planks
    ctx.strokeStyle = 'rgba(235,248,255,.35)'; ctx.lineWidth = Math.max(1, u * .4); const rp = ((frame + wk.x * 7) % 120) / 120; ctx.beginPath(); ctx.ellipse(cx, cy + u * 1.6, u * (3 + rp * 6), u * (1.2 + rp * 2.4), 0, 0, 7); ctx.stroke();
    if (Math.random() < .012) emit('bit', wk.x + (Math.random() - .5), wk.y, 2, { col: '#d4ecff' });
  }
}
function wreckHtml(w) { const k = kingdoms.get(w.kid); return `<b>⚓ Sunken ship</b><br>${k ? k.name : 'Unknown owner'} · lost to ${w.why === 'kraken' ? 'the kraken' : w.why === 'shark' ? 'a shark' : 'the sea'}<br><small>Its kingdom may raise it, or use the Salvage power.</small>`; }
function drawParts() {
  ctx.save();
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.x += p.vx; p.y += p.vy;
    if (p.k === 'ember' || p.k === 'debris') p.vy += .004; else if (p.k === 'bit') p.vy += .01; else if (p.k === 'spark') p.vy += .008;
    if (--p.l <= 0) { parts.splice(i, 1); continue; }
    const a = p.l / p.m, sx = ox + (p.x + .5) * sc, sy = oy + (p.y + .5) * sc;
    if (sx < -60 || sx > 780 || sy < VIEW.y - 80 || sy > VIEW.y + VIEW.h + 40) continue;
    if (p.k === 'smoke') { const g = p.dk ? 58 : 150; ctx.fillStyle = `rgba(${g},${g - 6},${g - 4},${a * (p.dk ? .62 : .38)})`; ctx.beginPath(); ctx.arc(sx, sy, sc * (p.s0 + (1 - a) * p.s1), 0, 7); ctx.fill(); }
    else if (p.k === 'ember') { ctx.fillStyle = `rgba(255,${(90 + a * 130) | 0},30,${Math.min(1, a * 1.6)})`; ctx.fillRect(sx - 1, sy - 1, Math.max(2, sc * .1), Math.max(2, sc * .1)); }
    else if (p.k === 'ash') { ctx.fillStyle = `rgba(70,66,72,${a * .7})`; ctx.fillRect(sx, sy, Math.max(1.5, sc * .07), Math.max(1.5, sc * .07)); }
    else if (p.k === 'spark') { ctx.strokeStyle = `rgba(255,240,170,${a})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - p.vx * sc * 3, sy - p.vy * sc * 3); ctx.stroke(); }
    else if (p.k === 'bit') { ctx.globalAlpha = Math.min(1, a * 2.5); ctx.fillStyle = p.c; const z = Math.max(2, sc * .11); ctx.fillRect(sx - z/2, sy - z/2, z, z); ctx.globalAlpha = 1; }
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
  if (sc < 5) { fireView = 0; return; }
  let nf = 0;
  for (let y = y0; y <= Math.min(H - 1, y1 + 1); y++) for (let x = x0; x <= x1; x++) {
    const i = x + y*W; if (!fire[i]) continue; nf++;
    const cx = ox + (x + .5) * sc, by = oy + (y + .92) * sc, big = bld[i] ? 1.55 : 1, fl = Math.sin(frame * .34 + i * 1.7), fl2 = Math.sin(frame * .51 + i * .9);
    const hgt = sc * (.95 + .3 * fl) * big, wid = sc * .52 * big;
    if (nightNow > .15) { const gr = ctx.createRadialGradient(cx, by - hgt * .4, 0, cx, by - hgt * .4, sc * 2.2); gr.addColorStop(0, `rgba(255,150,50,${.3 * Math.min(1, nightNow * 1.6)})`); gr.addColorStop(1, 'rgba(255,100,20,0)'); ctx.fillStyle = gr; ctx.fillRect(cx - sc * 2.2, by - hgt - sc * 2, sc * 4.4, sc * 4.4 + hgt); }
    ctx.fillStyle = '#ff4e12'; tri(cx - wid, by, cx + wid, by, cx + fl2 * sc * .14, by - hgt);
    ctx.fillStyle = '#ff9c24'; tri(cx - wid * .62, by, cx + wid * .62, by, cx - fl * sc * .1, by - hgt * .72);
    ctx.fillStyle = '#fff0a0'; tri(cx - wid * .3, by, cx + wid * .3, by, cx + fl2 * sc * .05, by - hgt * .42);
    if (Math.random() < .035 * big) emit('smoke', x, y - .4, 1, { s0: .2, s1: .9 });
    if (Math.random() < .045 * big) emit('ember', x, y - .2, 1, { sx: .4 });
  }
  fireView = nf;
}
/* ============================== SOUND: procedural Web Audio (no assets, no network) ============================== */
const Snd = { ctx: null, on: true, master: null, sfx: null, mus: null, send: null, noise: null, last: {}, win: [], beat: 0, chord: 0, nextT: 0 };
function sndInit() {
  if (Snd.ctx || editMode) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = Snd.ctx = new AC();
    Snd.master = c.createGain(); Snd.master.gain.value = Snd.on ? .85 : 0; Snd.master.connect(c.destination);
    Snd.sfx = c.createGain(); Snd.sfx.gain.value = .9; Snd.sfx.connect(Snd.master);
    Snd.mus = c.createGain(); Snd.mus.gain.value = .55; Snd.mus.connect(Snd.master);
    const dl = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter();                 // a soft echo gives the music space
    dl.delayTime.value = .38; fb.gain.value = .36; lp.type = 'lowpass'; lp.frequency.value = 1700;
    dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(Snd.mus);
    Snd.send = c.createGain(); Snd.send.gain.value = .55; Snd.send.connect(dl);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    Snd.noise = buf;
    const bed = (type, f, q) => { const sr = c.createBufferSource(); sr.buffer = buf; sr.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; sr.connect(fl); fl.connect(g); g.connect(Snd.sfx); sr.start(); return g; };
    Snd.wind = bed('lowpass', 420, .5); Snd.rainBed = bed('highpass', 1500, .4); Snd.fireBed = bed('bandpass', 2300, 1.3);
    Snd.nextT = c.currentTime + .3; setInterval(musicTick, 160);
  } catch (e) { Snd.ctx = null; }
}
function sndResume() { if (Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume(); }
function setSound(on) { Snd.on = !!on; dirty = true; if (Snd.ctx) Snd.master.gain.setTargetAtTime(Snd.on ? .85 : 0, Snd.ctx.currentTime, .06); if (sndBtn) sndBtn.textContent = Snd.on ? '🔊' : '🔇'; }
function can(name, ms) {                                       // per-sound and global rate limits keep the mix clean
  const now = performance.now(); if (now - (Snd.last[name] || 0) < ms) return false;
  while (Snd.win.length && now - Snd.win[0] > 1000) Snd.win.shift();
  if (Snd.win.length > 24) return false;
  Snd.last[name] = now; Snd.win.push(now); return true;
}
function tone(f, dur, o) {
  const c = Snd.ctx; if (!c || !Snd.on) return; o = o || {};
  const t = o.when || c.currentTime, osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || .2, t + (o.a || .01)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  osc.connect(g); g.connect(o.dest || Snd.sfx); if (o.send) g.connect(Snd.send);
  osc.start(t); osc.stop(t + dur + .05);
}
function burst(dur, o) {                                       // filtered noise: crackle, thunder, splash, impact
  const c = Snd.ctx; if (!c || !Snd.on) return;
  const t = o.when || c.currentTime, s2 = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s2.buffer = Snd.noise; fl.type = o.type || 'lowpass'; fl.frequency.setValueAtTime(o.f || 800, t); if (o.to) fl.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t + dur); fl.Q.value = o.q || .8;
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || .3, t + (o.a || .005)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s2.connect(fl); fl.connect(g); g.connect(o.dest || Snd.sfx); s2.start(t, Math.random() * 1.4); s2.stop(t + dur + .05);
}
const SFX = {
  ui: () => tone(880, .05, { type: 'triangle', vol: .1 }),
  pop: () => tone(520, .1, { type: 'sine', vol: .16, to: 780 }),
  chime: v => [660, 880, 1320].forEach((f, i) => tone(f, .38, { type: 'sine', vol: .11 * v, when: Snd.ctx.currentTime + i * .07, send: 1 })),
  fanfare: v => [523, 659, 784, 1047].forEach((f, i) => tone(f, .5, { type: 'triangle', vol: .13 * v, when: Snd.ctx.currentTime + i * .13, send: 1 })),
  hit: v => { burst(.07, { type: 'bandpass', f: 1700 + Math.random() * 900, q: 2, vol: .15 * v }); tone(170, .06, { type: 'square', vol: .04 * v, to: 90 }); },
  arrow: v => tone(1300, .07, { type: 'triangle', vol: .05 * v, to: 700 }),
  bolt: v => { burst(.3, { type: 'highpass', f: 1200, vol: .32 * v }); burst(1.9, { type: 'lowpass', f: 300, to: 60, vol: .55 * v, a: .08 }); },
  boom: (v, r) => { tone(120, .8 + r * .1, { type: 'sine', vol: .5 * v, to: 28 }); burst(.9 + r * .12, { type: 'lowpass', f: 1000, to: 110, vol: .5 * v }); },
  rumble: (v, len) => burst(len, { type: 'lowpass', f: 150, vol: .6 * v, a: .25 }),
  horn: () => { tone(110, .9, { type: 'sawtooth', vol: .1, a: .14 }); tone(165, .9, { type: 'sawtooth', vol: .06, a: .14 }); },
  splash: v => burst(.4, { type: 'bandpass', f: 1000, to: 320, q: 1.2, vol: .18 * v }),
  kraken: v => { tone(70, 1.8, { type: 'sawtooth', vol: .2 * v, to: 38, a: .2 }); burst(1.6, { type: 'lowpass', f: 420, to: 70, vol: .4 * v, a: .15 }); },
  howl: () => tone(430, 1.5, { type: 'sawtooth', vol: .06, to: 250, a: .35 }),
  thud: v => tone(150, .25, { type: 'sine', vol: .25 * v, to: 60 }),
  chop: v => { burst(.06, { type: 'bandpass', f: 520 + Math.random() * 160, q: 3, vol: .16 * v }); tone(230, .07, { type: 'triangle', vol: .05 * v, to: 140 }); },
  clink: v => { tone(1900 + Math.random() * 500, .08, { type: 'triangle', vol: .045 * v, to: 1500 }); burst(.04, { type: 'highpass', f: 2500, vol: .06 * v }); },
  dig: v => burst(.1, { type: 'lowpass', f: 420, vol: .14 * v }),
  slash: v => burst(.08, { type: 'highpass', f: 1800, to: 900, vol: .07 * v }),
  rustle: v => burst(.12, { type: 'bandpass', f: 2600, q: .8, vol: .035 * v }),
  coin: () => { tone(1320, .09, { type: 'square', vol: .06 }); tone(1760, .2, { type: 'square', vol: .06, when: Snd.ctx.currentTime + .08 }); },
};
function sndAt(x, y) {                                          // louder in view, quieter just outside, silent far away
  const sx = ox + (x + .5) * sc, sy = oy + (y + .5) * sc;
  if (sx >= 0 && sx <= 720 && sy >= VIEW.y && sy <= VIEW.y + VIEW.h) return 1;
  if (sx >= -220 && sx <= 940 && sy >= VIEW.y - 220 && sy <= VIEW.y + VIEW.h + 220) return .4;
  return 0;
}
function sndFx(kind, x, y, extra) {
  if (!Snd.ctx || !Snd.on || editMode || !started) return;
  const v = sndAt(x, y); if (v <= 0) return;
  switch (kind) {
    case 'bolt': if (can('bolt', 300)) SFX.bolt(v); break;
    case 'boom': if (can('boom', 350)) SFX.boom(v, (extra && extra.r) || 3); break;
    case 'shock': if (can('shock', 800)) SFX.rumble(v, 1.8); break;
    case 'levelup': if (can('levelup', 600)) SFX.fanfare(v); break;
    case 'hit': if (can('hit', 70)) SFX.hit(v); break;
    case 'arrow': if (can('arrow', 90)) SFX.arrow(v); break;
    case 'warcry': if (can('horn', 3000)) SFX.horn(); break;
    case 'splash': if (can('splash', 140)) SFX.splash(v * .6); break;
    case 'bless': case 'tech': if (can('chime', 180)) SFX.chime(v); break;
    case 'evolve': if (can('howl', 1500)) SFX.howl(); break;
    case 'rock': if (can('rock', 200)) SFX.thud(v); break;
    case 'chop': case 'clink': case 'dig': case 'slash': case 'rustle': if (v >= 1 && sc >= 8 && can('work', 110)) SFX[kind](v * .7); break;
    case 'death': if (can('death', 250)) tone(210, .22, { type: 'sine', vol: .05 * v, to: 100 }); break;
  }
}
function sndAmbient(firesInView) {                              // wind, rain and fire beds follow the world
  const c = Snd.ctx; if (!c) return; const t = c.currentTime;
  Snd.wind.gain.setTargetAtTime(.02 + (weather.kind ? .035 * weather.k : 0) + (nightNow > .5 ? .008 : 0), t, .6);
  Snd.rainBed.gain.setTargetAtTime(weather.kind === 1 || weather.kind === 2 ? (weather.kind === 2 ? .2 : .13) * weather.k : 0, t, .6);
  Snd.fireBed.gain.setTargetAtTime(Math.min(.12, firesInView * .008), t, .4);
}
const CHORDS = { day: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], night: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]] };
function warCount() { let n = 0; for (const r of rels.values()) if (r.s === 1) n++; return n; }
function musicTick() {                                           // generative score: pads, soft plucks, and low drums when kingdoms are at war
  const c = Snd.ctx; if (!c || !Snd.on || c.state !== 'running') return;
  const night = nightNow > .45, war = started && warCount() > 0, beatLen = night ? .92 : .78;
  while (Snd.nextT < c.currentTime + .6) {
    const t = Snd.nextT, step = Snd.beat++;
    const base = night ? 110 : 130.81, scale = night ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
    if (step % 8 === 0) {
      Snd.chord = (Snd.chord + 1) % 4;
      for (const n of CHORDS[night ? 'night' : 'day'][Snd.chord]) {
        const f = base * Math.pow(2, n / 12);
        for (const dt of [-6, 6]) {
          const o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
          o.type = 'triangle'; o.frequency.value = f; o.detune.value = dt; fl.type = 'lowpass'; fl.frequency.value = 900;
          g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.035, t + 2); g.gain.linearRampToValueAtTime(.0001, t + beatLen * 8 + 2.5);
          o.connect(fl); fl.connect(g); g.connect(Snd.mus); g.connect(Snd.send); o.start(t); o.stop(t + beatLen * 8 + 2.7);
        }
      }
    }
    if (Math.random() < (night ? .26 : .38)) {
      const f = base * 2 * Math.pow(2, (scale[ri(0, 4)] + 12 * ri(0, 1)) / 12);
      tone(f, 1.5, { type: 'triangle', vol: .08, a: .015, when: t, dest: Snd.mus, send: 1 });
    }
    if (war && step % 4 === 0) { tone(72, .6, { type: 'sine', vol: .28, to: 44, when: t, dest: Snd.mus }); burst(.18, { type: 'lowpass', f: 300, vol: .18, when: t, dest: Snd.mus }); }
    if (war && step % 8 === 4) tone(base / 2, 3, { type: 'sawtooth', vol: .02, a: .8, when: t, dest: Snd.mus });
    Snd.nextT += beatLen;
  }
}

/* ============================== ATMOSPHERE: weather, clouds, dusk and stars ============================== */
const weather = { kind: 0, target: 0, k: 0, next: 0 };         // kind: 0 clear, 1 rain, 2 storm, 3 snow; k = fade 0..1
const W_ICON = ['📅', '🌧️', '⚡', '❄️'];
function weatherTick() {                                         // every ~10 s
  if (tick >= weather.next) {
    const r = Math.random(); weather.target = r < .55 ? 0 : r < .78 ? 1 : r < .9 ? 2 : 3; weather.next = tick + ri(600, 1300);
    if (weather.target) weather.kind = weather.target;
  }
  if ((weather.kind === 1 || weather.kind === 2) && weather.k > .3) {                     // rain douses fires
    for (let i = 0; i < N; i++) if (fire[i] && Math.random() < .3) fire[i] = 0;
  }
  if (weather.kind === 2 && weather.k > .6 && disasterLvl > 0 && Math.random() < .35) {      // storms throw real lightning
    const p = pickSpot((t, x, y) => t === T.FOREST || t === T.GRASS || t === T.HILL, 30);
    if (p) { pendingDis.push({ type: 'bolt', x: p[0], y: p[1], at: tick + 1 }); fx('warn', p[0], p[1], { life: 10, until: tick + 1, r: 1, ch: '⚡' }); }
  }
}
const CLOUDS = [];
function mkCloud(seed, shadow) {
  const c2 = document.createElement('canvas'); c2.width = 200; c2.height = 110; const g = c2.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 40 + hash(i, seed, 1) * 120, y = 38 + hash(i, seed, 2) * 36, r = 20 + hash(i, seed, 3) * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); const col = shadow ? '0,0,0' : '255,255,255';
    gr.addColorStop(0, `rgba(${col},${shadow ? .9 : .95})`); gr.addColorStop(.6, `rgba(${col},${shadow ? .55 : .6})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  return c2;
}
const CLOUD_SPR = [1, 2, 3].map(n => mkCloud(n, false)), SHADOW_SPR = [1, 2, 3].map(n => mkCloud(n, true));
const STARS = Array.from({ length: 80 }, (_, i) => [hash(i, 5, 1) * 720, VIEW.y + hash(i, 5, 2) * VIEW.h, .5 + hash(i, 5, 3)]);
const RAIN = Array.from({ length: 260 }, (_, i) => [hash(i, 6, 1) * 760 - 20, VIEW.y + hash(i, 6, 2) * VIEW.h, .6 + hash(i, 6, 3) * .8]);
function drawAtmosphere() {
  if (editMode) return;
  const want = weather.target ? 1 : 0; weather.k += (want - weather.k) * .012; if (!want && weather.k < .02) { weather.kind = 0; weather.k = 0; }
  // clouds: drift with the wind, throw soft shadows on the ground; they thin out as you zoom in
  if (!CLOUDS.length || CLOUDS.length !== Math.max(14, Math.min(40, Math.round(W * H / 2800)))) {
    CLOUDS.length = 0; for (let i = 0, n = Math.max(14, Math.min(40, Math.round(W * H / 2800))); i < n; i++) CLOUDS.push({ x: Math.random() * (W + 60) - 30, y: Math.random() * (H + 40) - 20, w: 14 + Math.random() * 18, v: .006 + Math.random() * .008, s: i % 3 });
  }
  const zf = Math.max(0, Math.min(1, (34 - sc) / 22)), cover = 1 + weather.k * (weather.kind === 2 ? .9 : .5);
  if (zf > .02) { ctx.save(); ctx.beginPath(); ctx.rect(Math.max(VIEW.x, ox), Math.max(VIEW.y, oy), Math.min(VIEW.w, W * sc), Math.min(VIEW.h, H * sc)); ctx.clip(); }
  if (zf > .02) for (const cl of CLOUDS) {
    cl.x += cl.v * (1 + weather.k); if (cl.x > W + 40) cl.x = -40;
    const w = cl.w * sc, h = w * .55, sx = ox + cl.x * sc, sy = oy + cl.y * sc;
    if (sx < -w || sx > 720 + w || sy < VIEW.y - h || sy > VIEW.y + VIEW.h + h) continue;
    ctx.globalAlpha = .17 * zf * Math.min(1.4, cover); ctx.drawImage(SHADOW_SPR[cl.s], sx + w * .16, sy + h * .5, w, h);
    ctx.globalAlpha = .46 * zf * Math.min(1.5, cover * (weather.kind === 2 ? .85 : 1)); ctx.drawImage(CLOUD_SPR[cl.s], sx, sy, w, h);
  }
  ctx.globalAlpha = 1; if (zf > .02) ctx.restore();
  // weather particles
  const k = weather.k;
  if (k > .02 && weather.kind) {
    ctx.save(); ctx.beginPath(); ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); ctx.clip();
    if (weather.kind === 1 || weather.kind === 2) {
      ctx.fillStyle = `rgba(36,52,92,${(weather.kind === 2 ? .26 : .15) * k})`; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
      ctx.strokeStyle = `rgba(190,215,255,${.5 * k})`; ctx.lineWidth = 1.6; ctx.beginPath();
      const n = Math.floor((weather.kind === 2 ? 260 : 150) * k);
      for (let i = 0; i < n; i++) { const r = RAIN[i], y = VIEW.y + ((r[1] - VIEW.y + frame * 26 * r[2]) % VIEW.h), x = ((r[0] - frame * 5 * r[2]) % 760 + 760) % 760 - 20; ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16 * r[2]); }
      ctx.stroke();
      if (weather.kind === 2 && Math.random() < .004) { Snd.flash = 8; if (Snd.ctx && Snd.on && started && can('thunder', 2000)) SFX.bolt(.5); }
    } else {
      ctx.fillStyle = `rgba(205,222,255,${.08 * k})`; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
      ctx.fillStyle = `rgba(255,255,255,${.85 * k})`;
      const n = Math.floor(170 * k);
      for (let i = 0; i < n; i++) { const r = RAIN[i], y = VIEW.y + ((r[1] - VIEW.y + frame * 2.2 * r[2]) % VIEW.h), x = ((r[0] + Math.sin(frame * .02 + i) * 18 - frame * .6) % 760 + 760) % 760 - 20; ctx.fillRect(x, y, 2 + r[2] * 1.4, 2 + r[2] * 1.4); }
    }
    ctx.restore();
  }
  if (Snd.flash > 0) { ctx.fillStyle = `rgba(220,230,255,${Snd.flash / 8 * .3})`; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); Snd.flash--; }
  // day cycle: deep blue night, warm dusk, rosy dawn, twinkling stars
  if (cfg.settings.dayNight) {
    const ph = (tick + acc) / (TPS * 90) * Math.PI * 2, c0 = Math.cos(ph), s0 = Math.sin(ph), n = Math.max(0, -c0), w = Math.max(0, 1 - Math.abs(c0) * 2.4);
    if (n > .01) { ctx.fillStyle = `rgba(8,14,66,${n * .45})`; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); }
    if (w > .02) { ctx.fillStyle = s0 > 0 ? `rgba(255,120,40,${w * .2})` : `rgba(255,165,190,${w * .17})`; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); }
    if (n > .3) { ctx.fillStyle = '#fff'; for (let i = 0; i < STARS.length; i++) { const st = STARS[i], a = Math.min(1, (n - .3) * 2) * (.35 + .35 * Math.sin(frame * .04 * st[2] + i)); ctx.globalAlpha = Math.max(0, a); ctx.fillRect(st[0], st[1], st[2] > 1 ? 3 : 2, st[2] > 1 ? 3 : 2); } ctx.globalAlpha = 1; }
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
  const e = c.eq, K = CHR_K, hd = c.face < 0 ? -1 : 1;
  if (e[1]) { const [d, l] = TIER_COL[e[1]]; ctx.fillStyle = d; ctx.fillRect(cx - sw*.3, fy - sh*.5, sw*.6, K*2.2); ctx.fillStyle = l; ctx.fillRect(cx - sw*.3, fy - sh*.5, sw*.6, K*.8); ctx.fillStyle = d; ctx.fillRect(cx - sw*.42, fy - sh*.55, K*1.4, K*1.6); ctx.fillRect(cx + sw*.42 - K*1.4, fy - sh*.55, K*1.4, K*1.6); }
  if (e[2]) { const [d, l] = TIER_COL[e[2]], sx = cx - hd*sw*.5 - (hd < 0 ? K*2 : 0); ctx.fillStyle = '#1c1424'; ctx.fillRect(sx - K*.3, fy - sh*.5 - K*.3, K*2.6, K*3.8); ctx.fillStyle = d; ctx.fillRect(sx, fy - sh*.5, K*2, K*3.2); ctx.fillStyle = l; ctx.fillRect(sx, fy - sh*.5, K*.8, K*3.2); }
  if (c.ec) for (let sl = 0; sl < 3; sl++) if (e[sl] && c.ec[sl]) {                  // enchanted pieces pulse in their colour
    const gx = sl === 0 ? cx + hd*sw*.5 : sl === 2 ? cx - hd*sw*.5 : cx, gy = sl === 1 ? fy - sh*.42 : fy - sh*.48;
    ctx.fillStyle = ENCH[c.ec[sl]].c + '66'; ctx.beginPath(); ctx.arc(gx, gy, K*(3 + Math.sin(frame*.15 + sl)*.7), 0, 7); ctx.fill();
  }
  if (e[0] && !c.job) {
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
      ctx.drawImage(sp, ox + (x + .5 + (hash(x, y, 5) - .5) * .5) * sc - w/2 + (WORK_HIT.size ? shakeOf(i) : 0), oy + (y + .98 + (hash(x, y, 6) - .5) * .3) * sc - h, w, h);
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
    ctx.drawImage(sp, ox + (x + .5) * sc - w/2 + (WORK_HIT.size ? shakeOf(i) : 0), oy + (y + .95) * sc - h, w, h);
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

Object.assign(ICON_ART, {
  island: '...gg..gg.../..gGGggGGg../.gGGGgkGGGg./..ggGkkGgg../....gkk...../....kk....../.EEEEEEEEEE./EEEEEEEEEEEE/bBbBbBbBbBbB/BbBbBbBbBbBb/............',
  snow: '............/.....BB...../..B..BB..B../...B.BB.B.../....BBBB..../BBBBBBBBBBBB/BBBBBBBBBBBB/....BBBB..../...B.BB.B.../..B..BB..B../.....BB...../............',
  sound: '............/....oo....../...owwo..o../owwwwwwo..o./owwwwwwo.o.o/owwwwwwo.o.o/owwwwwwo.o.o/owwwwwwo..o./...owwo..o../....oo....../............/............',
  mute: '............/....oo....../...owwo...r./owwwwwwo..r./owwwwwwo.r../owwwwwwo.r../owwwwwwo.r../owwwwwwo.r../...owwo..r../....oo...r../............/............',
  help: '...oooooo.../..oBBBBBBo../.oBBwwwwBBo./.oBwwBBwwBo./.oBBBBBwwBo./.oBBBBwwBBo./.oBBBwwBBBo./.oBBBBBBBBo./.oBBBwwBBBo./..oBBBBBBo../...oooooo.../............' });
Object.assign(ICON_ART, {
  fish: '............/............/....ooooo.../.o.oBBBBBoo./.ooBBBBwBBBo/.oBBBBBBBoBo/.ooBBbbbBBBo/.o.oBbbbbbo./...ooooooo../............/............/............',
  anchor: '............/.....oo...../....oWWo..../.....oWo..../..oooWWooo../..oWWWWWWo../.....oWo..../.....oWo..../.o...oWo..o./.oo..oWo.oo./..oooWWWoo../....oooo....',
  kraken: '............/...oooooo.../..oRRRRRRo../.oRRrrRRRRo./.oRyaRRyaRo./.oRRRRRRRRo./..oRRRRRRo../.oRoRoRoRoRo/oRoRoRoRoRo./oRo.oRo.oRo./.o...o...o../............',
  shark: '............/............/....oo....../....osoo..../...osSSo..../o..ossSSoo../oo.osssssSoo/.osssssaSsso/.oowwwwwwwoo/..ooowwwwoo./....ooooo.../............',
});
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
Object.assign(EMOJI_ICON, { '🏝': 'island', '❄': 'snow', '🔊': 'sound', '🔇': 'mute', '❓': 'help', '🎒': 'bag', '🥋': 'armor', '🎯': 'target', '✖': 'close', '🛡': 'shield', '🥉': 'bronze', '🔩': 'iron', '🥈': 'silver', '🐟': 'fish', '🦈': 'shark', '🐙': 'kraken', '⚓': 'anchor' });
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

let SPR_K = 1;      // integer sprite scale for houses / props: 10px per sprite pixel-block, ~1.7 tiles at the base zoom
let CHR_K = 1;      // character sprite scale, from the 'Character Size' setting (default ~1.2 tiles)

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
  if ((t <= T.SHALLOW) !== (tiles[i] <= T.SHALLOW)) waterDirty = true;
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
function fx(kind, x, y, extra) { sndFx(kind, x, y, extra); effects.push(Object.assign({ k:kind, x, y, t:0 }, extra || {})); }

/* ============================== CREATURES ============================== */
/* ============================== PERSONA: traits, equipment, history ============================== */
const TRAITS = ['Brave', 'Sturdy', 'Swift', 'Long-lived', 'Frail', 'Gifted'];        // bit 1,2,4,8,16,32
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
  { n: 'Flaming', c: '#ff7a2a', d: '20% chance to set the target ablaze' }, { n: 'Venomous', c: '#7ae04a', d: 'poison keeps wounding' }, { n: 'Vampiric', c: '#ff3a5a', d: 'drains 25% of the damage' }, { n: 'Storm', c: '#6af0ff', d: '15% lightning on another enemy' },
  { n: 'Thorned', c: '#c8a070', d: 'reflects 25% of melee damage' }, { n: 'Regenerating', c: '#6aff9a', d: 'slowly restores hp' }, { n: 'Fireproof', c: '#ffb040', d: 'immune to fire' },
  { n: 'Warding', c: '#6aa8ff', d: '20% chance to block a hit' }, { n: 'Guardian', c: '#ffe27a', d: '+20% hp' }];
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
  human: [['Stone spear', 'Bronze sword', 'Iron sword'], ['Hide armor', 'Bronze armor', 'Iron armor'], ['Wooden shield', 'Bronze shield', 'Iron shield']],
  elf: [['Wooden bow', 'Composite bow', 'Longbow'], ['Leaf cloak', 'Scale armor', 'Chain armor'], ['Bark shield', 'Bronze shield', 'Silver-iron shield']],
  dwarf: [['Stone hammer', 'Bronze axe', 'Iron war axe'], ['Hide armor', 'Bronze armor', 'Steel armor'], ['Wooden shield', 'Bronze shield', 'Iron tower shield']],
  orc: [['Wooden club', 'Bronze axe', 'Iron cleaver'], ['Hide wraps', 'Bronze armor', 'Rough iron armor'], ['Hide shield', 'Bronze shield', 'Iron shield']],
  werewolf: [['Bone claws', 'Bronze claws', 'Steel claws'], ['Fur cloak', 'Bronze armor', 'Iron armor'], ['Bone shield', 'Bronze shield', 'Iron shield']],
};
const GEAR_KIND = { human: ['spear', 'sword', 'sword'], elf: ['bow', 'bow', 'bow'], dwarf: ['axe', 'axe', 'axe'], orc: ['club', 'axe', 'axe'], werewolf: ['claw', 'claw', 'claw'] };
const GEAR_ICON = ['⚔️', '🥋', '🛡'], HIST_TXT = { 2: 'Won a first fight', 3: '5 victories', 4: '10 victories', 5: 'Hero: 25 victories', 6: 'Crowned leader', 7: 'Made an iron knight', 11: 'Nearly died, but survived' };
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
  if (extinctRaces.has(type)) return null;
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
  if (c.hp <= 0 || c.boat) return;                        // dead or embarked units do not act on land
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
    if (workStep(c, ka)) return;                                       // everyday jobs: chop, mine, hunt, farm, fish, forage
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

/* ============================== WORKERS: everyday jobs ============================== */
const WORK_HIT = new Map();                                    // tile -> render frame of the last axe / pick hit (trees and rocks shake)
const PREY_OF = { human: ['rabbit', 'deer'], elf: ['rabbit', 'deer'], dwarf: ['rabbit', 'deer', 'sheep'], orc: ['rabbit', 'deer', 'sheep'], werewolf: ['rabbit', 'deer', 'sheep'] };
const cheb = (a, x, y) => Math.max(Math.abs(a.x - x), Math.abs(a.y - y));
function canWork(c, ka) { return !c.lead && !c.elite && !(ka && ka.enemies.size && isSoldier(c)); }
function findWorkSpot(c, job, ka) {
  if (job === 'hunt') {
    if ((counts.rabbit | 0) + (counts.deer | 0) + (counts.sheep | 0) < 8) return null;
    const pr = findNearest(c, PREY_OF[c.t] || PREY_OF.human, 9); return pr ? { x: pr.x, y: pr.y, prey: pr } : null;
  }
  if (job === 'farm') {
    if (!ka) return null; let best = null, bd = 15;
    for (const p of kingdomProps(ka)) if (p.t === 'field') { const d = cheb(c, p.x, p.y) + Math.random() * 3; if (d < bd && walkable(c.t, tiles[p.x + p.y*W])) { bd = d; best = { x: p.x, y: p.y }; } }
    return best;
  }
  const r = 7; let best = null, bd = 1e9;
  const nearSh = job === 'fish' ? shoals.filter(q => q.kind <= 1 && Math.abs(q.x - c.x) <= r + 3 && Math.abs(q.y - c.y) <= r + 3) : null;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = c.x + dx, y = c.y + dy; if (!inb(x, y)) continue;
    const i = x + y*W, t = tiles[i]; if (fire[i]) continue;
    let ok = false, wx = 0, wy = 0;
    if (job === 'chop' || job === 'gather') ok = t === T.FOREST && hash(x, y, 3) <= .8 && (job === 'chop' || (treeKindAt(i) & 7) !== 2);
    else if (job === 'mine') ok = !!oreT[i] || (t === T.HILL && hash(x, y, 43) <= .55);
    else if (job === 'fish' && walkable(c.t, t) && !bld[i]) {
      for (let k = 1; k <= 7; k += 2) { const nx = x + DIRS[k][0], ny = y + DIRS[k][1]; if (inb(nx, ny) && tiles[nx + ny*W] <= T.SHALLOW) { ok = true; wx = nx; wy = ny; break; } }
    }
    if (!ok) continue;
    let fb = 0; if (nearSh && nearSh.length) for (const q of nearSh) if (Math.max(Math.abs(q.x - wx), Math.abs(q.y - wy)) <= 3) { fb = 6; break; }
    const d = Math.max(Math.abs(dx), Math.abs(dy)) + Math.random() * 2.5 - (job === 'mine' && oreT[i] ? 2 : 0) - fb;
    if (d < bd) { bd = d; best = { x, y, wx, wy }; }
  }
  return best;
}
function homeOf(c, ka) {                                       // nearest house of the worker's own kingdom, else the realm's centre
  let best = null, bd = 1e9;
  for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) {
    const x = c.x + dx, y = c.y + dy; if (!inb(x, y)) continue;
    const i = x + y*W; if (!bld[i] || kid[i] !== ka.id) continue;
    const d = Math.max(Math.abs(dx), Math.abs(dy)); if (d < bd) { bd = d; best = { x, y }; }
  }
  return best || { x: Math.round(ka.cx), y: Math.round(ka.cy) };
}
function finishWork(c, ka, j) {                                // the job is done: haul the goods home (or give up when there is no home)
  if (j.k === 'fish') {
    fx('splash', j.wx, j.wy); emit('bit', j.wx, j.wy - .2, 6, { col: '#bfe6ff' });
    const sh = shoalNear(j.wx, j.wy, 3, 1);                      // only a shoal nearby gives a real catch
    if (Math.random() < (sh ? .15 : .55)) { c.job = null; return; }
    j.fm = sh ? SHOAL[sh.kind].yieldM * (.6 + .4 * sh.stock) : .25; if (sh) sh.stock = Math.max(0, sh.stock - .12);
  }
  if (!ka) { c.job = null; return; }
  const h = homeOf(c, ka);
  j.ph = 2; j.t = 0; j.f = 0; j.hx = h.x; j.hy = h.y; j.item = CARRY[j.k];
  if (j.k === 'mine' && oreT[j.x + j.y*W]) j.item = 'ore';
}
function deposit(c, ka, j) {
  if (ka && kingdoms.has(ka.id)) {
    const [key, amt0] = JOB_YIELD[j.k], amt = j.k === 'fish' && j.fm != null ? Math.max(1, Math.round(amt0 * j.fm)) : amt0;
    addYield(ka, key, j.k === 'chop' && c.t === 'dwarf' ? amt + 1 : j.k === 'gather' && c.t === 'elf' ? amt + 2 : amt);
    if (j.k === 'mine') {                                      // an ore node gives its metal (when the kingdom knows how to work it)
      const i = j.x + j.y*W, t = oreT[i];
      if (t && ka.level >= ORE_LV[t] - (ka.race === 'dwarf' ? 1 : 0)) {
        addYield(ka, ORE_KEYS[t], ORE_YIELD[t]);
        if (--oreA[i] <= 0) { oreT[i] = 0; fx('puff', j.x, j.y); }
      }
    }
  }
  emit('dust', c.x, c.y, 3); c.job = null;
}
function workStep(c, ka) {                                     // returns true when the settler spent this move on a job
  let j = c.job;
  if (!j) {
    if (!canWork(c, ka) || Math.random() > .06) return false;
    const k = pickJob(c.t, { chop: 1, mine: 1, hunt: 1, farm: !!(ka && ka.houses >= 3), fish: 1, gather: 1 }, Math.random());
    const s = k && findWorkSpot(c, k, ka); if (!s) return false;
    j = c.job = { k, x: s.x, y: s.y, wx: s.wx, wy: s.wy, prey: s.prey || null, ph: 0, t: 0, f: 0, fails: 0, cy: -1 };
  }
  if (!canWork(c, ka)) { c.job = null; return false; }
  if (j.ph === 0 || (j.ph === 1 && j.k === 'hunt')) {
    if (j.k === 'hunt') { const p = j.prey; if (!p || p.hp <= 0 || cheb(c, p.x, p.y) > 14) { c.job = null; return false; } j.x = p.x; j.y = p.y; }
    const d = cheb(c, j.x, j.y);
    if (d <= reach(j.k, c.t)) {
      if (j.ph === 0) { j.ph = 1; j.t = j.k === 'hunt' ? 24 : workLen(j.k, Math.random()); }
    } else {
      j.ph = 0;
      if (++j.f > 70) { c.job = null; return false; }
      if (moveToward(c, j.x, j.y)) return true;
      if (++j.fails > 4) c.job = null;
      return false;
    }
  }
  if (j.ph === 1) {
    const tx = j.k === 'fish' ? j.wx : j.x;
    if (tx !== c.x) c.face = tx > c.x ? 1 : -1;
    if (j.k === 'hunt') {                                      // strike the prey: spear, bow or claws
      const p = j.prey, R = RACES[c.t];
      c.atk = 10; p.hp -= R.dmg * (.7 + Math.random() * .6);
      if (cheb(c, p.x, p.y) > 1) fx('arrow', c.x, c.y, { tx: p.x, ty: p.y }); else fx('hit', p.x, p.y);
      if (p.hp <= 0) { p.cause = 'hunt'; j.x = p.x; j.y = p.y; finishWork(c, ka, j); }
      else if (--j.t <= 0) c.job = null;
      return true;
    }
    const i = j.x + j.y*W, t = tiles[i];
    if (fire[i] || ((j.k === 'chop' || j.k === 'gather') && t !== T.FOREST) || (j.k === 'mine' && !oreT[i] && t !== T.HILL) || (j.k === 'fish' && tiles[j.wx + j.wy*W] > T.SHALLOW)) { c.job = null; return false; }
    if (--j.t <= 0) finishWork(c, ka, j);
    return true;
  }
  // phase 2: carry the goods home
  if (cheb(c, j.hx, j.hy) <= 1 || ++j.f > 60) { deposit(c, ka, j); return true; }
  if (moveToward(c, j.hx, j.hy)) return true;
  if (++j.fails > 6) deposit(c, ka, j);
  return false;
}
const BIT_COL = { chop: ['#c08a50', '#e8c890', '#6a8a3a'], mine: ['#9aa0aa', '#c8ced6', '#6a6e78'], farm: ['#8a6a40', '#a8844e', '#d8b860'], gather: ['#e8344a', '#5aa83a', '#b03aa8'] };
function workImpact(c, j, race) {                              // the moment an axe / pick / hoe / claw lands
  const i = j.x + j.y*W;
  if (WORK_HIT.size > 400) WORK_HIT.clear();
  if (j.k === 'chop' || j.k === 'mine' || j.k === 'gather') WORK_HIT.set(i, frame);
  const cols = BIT_COL[j.k]; if (!cols) return;
  const n = j.k === 'gather' ? 2 : 3;
  for (let q = 0; q < n; q++) emit('bit', j.x, j.y - (j.k === 'farm' ? 0 : .35), 1, { col: cols[ri(0, cols.length - 1)] });
  if (j.k === 'mine' && Math.random() < .5) emit('spark', j.x, j.y - .3, 2);
  sndFx(j.k === 'chop' ? (race === 'werewolf' ? 'slash' : 'chop') : j.k === 'mine' ? (race === 'werewolf' ? 'dig' : 'clink') : j.k === 'farm' ? 'dig' : 'rustle', c.x, c.y);
}
function shakeOf(i) {                                          // horizontal wobble of a tree / rock that was just hit
  const h = WORK_HIT.get(i); if (h === undefined) return 0;
  const a = frame - h; if (a > 14 || a < 0) { WORK_HIT.delete(i); return 0; }
  return Math.sin(a * 1.7) * (14 - a) / 14 * sc * .07;
}

/* ============================== WORLD TICK ============================== */
function reapDead() {
  let any = false;
  for (const c of creatures) if (c.hp <= 0) {
    any = true;
    if (RACES[c.t].cart && c.trade && !c.trade.done) refundTrade(c);
    if (c.eq && RACES[c.t].civ && c.cause !== 'shipwreck') for (let sl = 0; sl < 3; sl++) if (c.eq[sl] && Math.random() < .7) addDrop(c.x, c.y, sl, c.eq[sl], c.t, c.ec ? c.ec[sl] : 0);
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
  toast(EMOJI.werewolf + ' Wolves have evolved!'); haptic('success');
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
const EV_IC = { plague:'☠️', drought:'🥀', golden:'✨' }, EV_NAME = { plague:'Plague', drought:'Drought', golden:'Golden age' };
const EV_DUR = { plague: 900, drought: 1200, golden: 1200 }, EV_ID = ['', 'plague', 'drought', 'golden'];
let lastEvToast = -1e9;
const evBirth = k => !k.ev ? 1 : k.ev.type === 'plague' ? .3 : k.ev.type === 'golden' ? 1.3 : 1;
const evFood = k => !k.ev ? 1 : k.ev.type === 'drought' ? .4 : k.ev.type === 'golden' ? 1.25 : 1;
function startEvent(k, type, quiet) {
  k.ev = { type, left: EV_DUR[type] }; warStats['ev_' + type] = (warStats['ev_' + type] || 0) + 1;
  addChronicle(EV_IC[type], `${EV_NAME[type]} struck ${k.name}`);
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
  equipTick(); repairWalls(); siegeTick(); resTick(); updateMarket(); tradeTick(); eliteTick(); shopTick(); weatherTick();
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
  addChronicle('🤝', `${b.name} joined ${a.name}`);
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
const isSoldier = c => !c.boat && ((c.id * 2654435761) >>> 0) % 100 < SOLDIER_PCT[c.t];
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
  if (b.race === 'werewolf' && !joined) toast(`${EMOJI.werewolf} ${b.name} is no longer neutral!`);
  else toast(`${EMOJI[a.race]}${a.name} ⚔️ ${EMOJI[b.race]}${b.name}`);
}
function declareWar(a, b, joined) {
  rels.set(rkey(a.id, b.id), { s: 1, t: tick, until: 0 });
  addChronicle('⚔️', joined ? `${a.name} joined the war against ${b.name}` : `${a.name} declared war on ${b.name}`);
  warStats.declared++; if (joined) warStats.joined++; else { warStats['by_' + a.race] = (warStats['by_' + a.race] || 0) + 1; if (b.race === 'werewolf') warStats.vs_werewolf = (warStats.vs_werewolf || 0) + 1; }
  rebuildRelations(); warToast(a, b, joined); haptic('warning');
  fx('warcry', a.cap % W, (a.cap / W) | 0); fx('warcry', b.cap % W, (b.cap / W) | 0);
  if (joined) return;
  for (const cid of b.allies) { const c = kingdoms.get(cid); if (c && c !== a && !rels.has(rkey(c.id, a.id)) && comp[c.cap] === comp[a.cap] && Math.random() < .7) declareWar(c, a, true); }
  for (const cid of a.allies) { const c = kingdoms.get(cid); if (c && c !== b && !rels.has(rkey(c.id, b.id)) && comp[c.cap] === comp[b.cap] && Math.random() < .4) declareWar(c, b, true); }
}
function warOver(a, b) {
  const key = rkey(a.id, b.id), r = rels.get(key);
  if (!r || r.s !== 1) return;                              // resolve each war exactly once
  const pa = kpower(a) + a.houses * 2, pb = kpower(b) + b.houses * 2;
  let loser, winner;
  if (pa === pb) { loser = Math.random() < .5 ? a : b; winner = loser === a ? b : a; }
  else { loser = pa < pb ? a : b; winner = loser === a ? b : a; }
  const ratio = Math.min(pa, pb) / Math.max(1, Math.max(pa, pb));
  return { loser, winner, outcome: warOutcome(Math.random(), ratio) };
}
function eraseKingdom(loser, winner) {
  const id = loser.id;
  for (let i = 0; i < N; i++) if (kid[i] === id) { bld[i] = 0; kid[i] = 0; }
  for (const c of creatures) if (c.k === id) { c.hp = 0; c.cause = 'war'; }
  for (const [key] of [...rels]) if (Math.floor(key / 65536) === id || key % 65536 === id) rels.delete(key);
  kingdoms.delete(id); rebuildRelations(); ownDirty = true; dirty = true;
  warStats.kingdomsDestroyed = (warStats.kingdomsDestroyed || 0) + 1;
  addChronicle('🏚️', `${loser.name} (${TYPE_NAME[loser.race]}) collapsed in the war`);
  if (winner) { toast(`🏚️ ${EMOJI[loser.race]} ${loser.name} fell to ${winner.name}`); fx('boom', Math.round(loser.cx), Math.round(loser.cy), { r: 3 }); haptic('thud'); }
}
function eraseRace(race, winner) {
  if (extinctRaces.has(race)) return;
  extinctRaces.add(race);
  const ids = new Set([...kingdoms.values()].filter(k => k.race === race).map(k => k.id));
  for (let i = 0; i < N; i++) if (BUILD_OWNER[bld[i]] === race) { bld[i] = 0; kid[i] = 0; }
  for (const c of creatures) if (c.t === race) { c.hp = 0; c.cause = 'war'; }
  ships = ships.filter(s => s.race !== race);
  for (const id of ids) kingdoms.delete(id);
  for (const [key] of [...rels]) if (ids.has(Math.floor(key / 65536)) || ids.has(key % 65536)) rels.delete(key);
  rebuildRelations(); ownDirty = true; dirty = true;
  warStats.racesExtinct = (warStats.racesExtinct || 0) + 1;
  addChronicle('☠️', `${TYPE_NAME[race]} went extinct in the war`);
  toast(`☠️ ${EMOJI[race]} ${TYPE_NAME[race]} went extinct in the war${winner ? ` with ${winner.name}` : ''}`);
  fx('boom', Math.round(winner ? winner.cx : W / 2), Math.round(winner ? winner.cy : H / 2), { r: 5 }); haptic('thud');
}
function endWar(a, b) {
  const result = warOver(a, b); if (!result) return;
  const { loser, winner, outcome } = result;
  warStats.ended++; warsResolved++;
  // A race cannot exterminate its own side in a civil war; the rarest result instead ends the losing kingdom.
  if (outcome === 'race') {
    if (a.race !== b.race) eraseRace(loser.race, winner);
    else eraseKingdom(loser, winner);
    return;
  }
  if (outcome === 'kingdom') { eraseKingdom(loser, winner); return; }
  addChronicle('🕊️', `${a.name} and ${b.name} made peace after the war`);
  rels.set(rkey(a.id, b.id), { s: 3, t: tick, until: tick + 4000 });
  rebuildRelations();
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
  if (key === 'harbor') { const i = coastalLandNear(k, 24); if (i >= 0) k.lm[key] = i; return; }
  let i = key === 'mine' ? freeTileNear(k, 3, 9, t => t === T.HILL || t === T.MOUNTAIN) : -1;
  if (i < 0) i = freeTileNear(k, 2, 5, t => t !== T.MOUNTAIN && t !== T.SNOW);
  if (i >= 0) k.lm[key] = i;
}
function finishTech(k, t) {
  k.tech.push(t.id); k.res = null; recalcMods(k);
  if (t.lm) placeLandmark(k, t.lm);
  if (t.id === 'voyage') { addChronicle('⛵', `${k.name} entered the Age of Exploration`); toast(`⛵ ${k.name} entered the Age of Exploration`); }
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
    if (t.id === 'voyage' && !canResearchVoyage(k.age, k.level, coastalLandNear(k, 24) >= 0)) continue; // only Iron-Age kingdoms with a coast can master sailing
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
function adjacentWater(i) {
  if (i < 0 || i >= N) return -1;
  const x = i % W, y = (i / W) | 0;
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx = x + dx, ny = y + dy; if (!inb(nx, ny)) continue;
    const j = nx + ny*W; if (tiles[j] <= T.SHALLOW) return j;
  }
  return -1;
}
function coastalLandNear(k, radius = 24) {
  if (compDirty) computeComps();
  const home = comp[k.cap]; if (!home) return -1;
  const cx = k.cap % W, cy = (k.cap / W) | 0; let best = -1, bd = radius*radius + 1;
  for (let y = Math.max(0,cy-radius); y <= Math.min(H-1,cy+radius); y++) for (let x = Math.max(0,cx-radius); x <= Math.min(W-1,cx+radius); x++) {
    const i = x + y*W, d = (x-cx)**2 + (y-cy)**2;
    if (d >= bd || comp[i] !== home || tiles[i] <= T.SHALLOW || tiles[i] === T.LAVA || bld[i] || fire[i] || adjacentWater(i) < 0) continue;
    best = i; bd = d;
  }
  return best;
}
function voyagePlan(k, sourceLand) {
  if (compDirty) computeComps(); if (ownDirty) computeTerritory();
  const home = comp[k.cap], startWater = adjacentWater(sourceLand);
  if (!home || startWater < 0) return null;
  const size = new Uint32Array(N + 1), blocked = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (comp[i]) size[comp[i]]++;
  // Keep a new landing far enough from any existing town that it can grow as a separate realm.
  for (let i = 0; i < N; i++) if (bld[i]) {
    const x = i % W, y = (i / W) | 0;
    for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) if (Math.max(Math.abs(dx),Math.abs(dy)) <= 14 && inb(x+dx,y+dy)) blocked[x+dx+(y+dy)*W] = 1;
  }
  const reserved = new Set(ships.filter(s => s.phase === 'outbound').map(s => s.targetComp));
  const goals = new Int32Array(N); goals.fill(-1);
  const race = k.race, build = RACES[race].build;
  const offset = ri(0, N-1);
  for (let q = 0; q < N; q++) {
    const i = (offset + q) % N, c = comp[i];
    if (!c || c === home || size[c] < 20 || reserved.has(c) || blocked[i] || bld[i] || fire[i] || own[i] || !build.includes(tiles[i]) || !walkable(race, tiles[i])) continue;
    const w = adjacentWater(i); if (w >= 0 && goals[w] < 0) goals[w] = i;
  }
  const route = findWaterRoute(tiles, W, H, startWater, goals);
  if (!route || route.path.length < 2) return null;
  return { path: route.path, land: route.landIndex, sourceLand, targetComp: comp[route.landIndex] };
}
function boardCrew(k) {
  const crew = creatures.filter(c => c.k === k.id && c.t === k.race && c.hp > 0 && !c.boat && !c.lead && !c.elite && !RACES[c.t].engine && !isSoldier(c));
  if (crew.length >= 3) return crew.slice(0,3);
  return creatures.filter(c => c.k === k.id && c.t === k.race && c.hp > 0 && !c.boat && !c.lead && !c.elite && !RACES[c.t].engine).slice(0,3);
}
function fishingPlan(k, sourceLand) {
  const startWater = adjacentWater(sourceLand); if (startWater < 0) return null;
  const sx = startWater % W, sy = (startWater / W) | 0, goals = new Int32Array(N); goals.fill(-1);
  for (let i = 0; i < N; i++) if (tiles[i] <= T.SHALLOW) {
    const d = Math.max(Math.abs(i % W - sx), Math.abs(((i / W) | 0) - sy));
    if (d >= 6 && d <= 26) goals[i] = i;
  }
  const gs = new Int32Array(N); gs.fill(-1); let anySh = false;      // fishing boats head for a real shoal when one is in range
  for (const sh of shoals) { const bx = Math.round(sh.x), by = Math.round(sh.y), dd = Math.max(Math.abs(bx - sx), Math.abs(by - sy)); if (dd >= 6 && dd <= 30 && tiles[bx + by*W] <= T.SHALLOW) { gs[bx + by*W] = bx + by*W; anySh = true; } }
  if (anySh) { const r2 = findWaterRoute(tiles, W, H, startWater, gs); if (r2 && r2.path.length >= 3) return { path: r2.path, land: r2.landIndex, sourceLand, targetComp: 0 }; }
  let route = findWaterRoute(tiles, W, H, startWater, goals);
  if (route && route.path.length >= 3) return { path: route.path, land: route.landIndex, sourceLand, targetComp: 0 };
  // Very narrow seas still support an anchored fishing boat near its harbor.
  const fallback = new Int32Array(N); fallback.fill(-1);
  for (let i = 0; i < N; i++) if (tiles[i] <= T.SHALLOW) fallback[i] = i;
  route = findWaterRoute(tiles, W, H, startWater, fallback);
  return route ? { path: route.path, land: route.landIndex, sourceLand, targetComp: 0 } : null;
}
function launchVoyage(k) {
  if (!k.tech.includes('voyage') || !canResearchVoyage(k.age, k.level, coastalLandNear(k, 24) >= 0) || k.pop < 12 || k.houses < 5 || k.enemies.size || tick < (k.voyageCd || 0)) return false;
  if (ships.some(s => s.kingdomId === k.id) || k.wood < 30 || k.gold < 6 || k.iron < 2) return false;
  const crew = boardCrew(k); if (crew.length < 3) return false;
  const sourceLand = k.lm.harbor != null && adjacentWater(k.lm.harbor) >= 0 ? k.lm.harbor : coastalLandNear(k, 24);
  if (sourceLand < 0) { k.voyageCd = tick + 600; return false; }
  let plan = voyagePlan(k, sourceLand), mission = 'colony';
  if (!plan) { plan = fishingPlan(k, sourceLand); mission = 'fishing'; }
  if (!plan) { k.voyageCd = tick + 600; return false; }
  const cost = mission === 'colony' ? { wood:65, gold:18, iron:8 } : { wood:30, gold:6, iron:2 };
  if (k.wood < cost.wood || k.gold < cost.gold || k.iron < cost.iron) return false;
  const id = nextShipId++, first = plan.path[0], risk = +((cfg.settings && cfg.settings.shipwreckRisk) ?? 3);
  const wreckAt = plan.path.length >= 3 && Math.random() < shipwreckProbability(plan.path.length, risk, weather.kind === 2 && weather.k > .3) ? Math.max(1, Math.floor(plan.path.length * .5)) : 0;
  k.wood -= cost.wood; k.gold -= cost.gold; k.iron -= cost.iron; k.voyageCd = tick + (mission === 'colony' ? 2400 : 900);
  for (const c of crew) { c.boat = id; c.tgt = null; c.job = null; }
  ships.push({ id, race:k.race, kingdomId:k.id, x:first%W, y:(first/W)|0, path:plan.path, step:0, move:0,
    phase:mission === 'colony' ? 'outbound' : 'fishing_outbound', sourceLand:plan.sourceLand,
    targetLand:mission === 'colony' ? plan.land : -1, targetComp:plan.targetComp, crew:crew.map(c=>c.nid), wreckAt, fishTimer:0 });
  if (selected && crew.includes(selected)) closeCreature();
  if (mission === 'colony') { addChronicle('⛵', `${k.name} sent out an exploration ship`); toast(`⛵ The ${k.name} expedition set sail`); }
  else { addChronicle('🎣', `${k.name} found no empty shore, so its ship became a fishing boat`); toast(`🎣 A ship of ${k.name} went out to fish`); }
  dirty = true; return true;
}
function disembarkCrew(ship, kingdom, land) {
  const x = land % W, y = (land / W) | 0, crew = creatures.filter(c => ship.crew.includes(c.nid) && c.boat === ship.id && c.hp > 0);
  for (let q = 0; q < crew.length; q++) {
    const c = crew[q], ox0 = [0,1,0,-1,0,1,-1,1,-1][q], oy0 = [0,0,1,0,-1,1,1,-1,-1][q];
    let px = x + ox0, py = y + oy0;
    if (!inb(px, py) || !walkable(c.t, tiles[px + py*W])) { px = x; py = y; }
    c.x = c.dx = px; c.y = c.dy = py; c.boat = 0; c.k = kingdom.id; c.lk = 0; c.tgt = null; c.job = null;
  }
}
function foundIslandColony(ship) {
  const race = ship.race, i = ship.targetLand;
  if (extinctRaces.has(race) || i < 0 || i >= N || bld[i] || fire[i] || !RACES[race].build.includes(tiles[i])) return false;
  const crew = creatures.filter(c => ship.crew.includes(c.nid) && c.boat === ship.id && c.hp > 0);
  if (crew.length < 3) return false;
  const x = i % W, y = (i / W) | 0, k = newKingdom(race, x, y);
  bld[i] = RACES[race].bi; kid[i] = k.id; k.food = 35; k.wood = 18; k.stone = 8; k.voyageCd = tick + 1200;
  disembarkCrew(ship, k, i); ownDirty = true; dirty = true; rebuildRelations();
  addChronicle('🏝️', `${k.name} founded a colony on a new island`); toast(`🏝️ New colony: ${k.name}`); fx('levelup', x, y);
  return true;
}
function bringCrewHome(ship) {
  const k = kingdoms.get(ship.kingdomId), i = ship.sourceLand, x = i % W, y = (i / W) | 0;
  for (const c of creatures) if (ship.crew.includes(c.nid) && c.boat === ship.id) {
    c.boat = 0; c.tgt = null; c.job = null; c.x = c.dx = x; c.y = c.dy = y;
    if (!k || extinctRaces.has(c.t)) c.k = 0;
  }
}
function wreckShip(s, si, why) {
  const x = Math.round(s.x), y = Math.round(s.y), k = kingdoms.get(s.kingdomId);
  for (const c of creatures) if (c.boat === s.id) { c.boat = 0; c.hp = 0; c.cause = 'shipwreck'; }
  ships.splice(si, 1); fx('splash', x, y); emit('bit', x, y, 7, { col:'#bfe6ff' }); haptic('thud');
  if (wrecks.length >= 30) wrecks.shift(); wrecks.push({ x, y, kid: s.kingdomId, race: s.race, t0: tick, why: why || 'storm' });
  const kind = s.phase.startsWith('fishing') ? 'Fishing boat' : 'Exploration ship';
  if (why) { const kr = why === 'kraken'; addChronicle(kr ? '🐙' : '🦈', `A ${kr ? 'kraken dragged' : 'shark sank'} the ${kind.toLowerCase()} of ${k ? k.name : 'a kingdom'}${kr ? ' under' : ''}; the crew is lost`); toast(kr ? '🐙 A kraken dragged a ship under!' : '🦈 A shark sank a ship!'); }
  else { addChronicle('🌊', `${kind} of ${k ? k.name : 'a kingdom'} was lost at sea; its crew is gone`); toast(`🌊 ${kind} lost at sea`); }
  dirty = true;
}
function voyageTick() {
  for (let si = ships.length - 1; si >= 0; si--) {
    const s = ships[si]; if (extinctRaces.has(s.race)) { ships.splice(si,1); continue; }
    harpoon(s);
    if (s.phase === 'fishing') {
      if (--s.fishTimer <= 0) {
        const k = kingdoms.get(s.kingdomId), sh = shoalNear(s.x, s.y, 9, 2), amt = 10 + (s.haul | 0);
        if (k) addYield(k, 'food', amt);
        addChronicle('🐟', `${k ? k.name : 'A fishing boat'} speared ${amt} food worth of ${sh ? SHOAL[sh.kind].n : 'fish'}`); s.haul = 0;
        s.phase = 'fishing_return'; s.path.reverse(); s.step = 0; s.move = 0; dirty = true;
      }
      continue;
    }
    if (s.step < s.path.length - 1) {
      s.move += .34;
      while (s.move >= 1 && s.step < s.path.length - 1) { s.move -= 1; s.step++; }
      const a = s.path[s.step], b = s.path[Math.min(s.step + 1, s.path.length - 1)], f = s.step >= s.path.length - 1 ? 0 : s.move;
      s.x = (a % W) + ((b % W) - (a % W)) * f;
      s.y = ((a / W) | 0) + (((b / W) | 0) - ((a / W) | 0)) * f;
      for (const c of creatures) if (c.boat === s.id) { c.x = Math.round(s.x); c.y = Math.round(s.y); c.dx = s.x; c.dy = s.y; }
    }
    if (s.wreckAt && s.step >= s.wreckAt) { wreckShip(s, si); continue; }
    if (s.step >= s.path.length - 1) {
      if (s.phase === 'outbound') {
        const landed = foundIslandColony(s); s.phase = 'return'; s.landed = landed ? 1 : 0; s.path.reverse(); s.step = 0; s.move = 0;
        if (s.path.length <= 1) { if (!landed) bringCrewHome(s); ships.splice(si,1); }
      } else if (s.phase === 'fishing_outbound') {
        s.phase = 'fishing'; s.fishTimer = 160; addChronicle('🎣', `${kingdoms.get(s.kingdomId)?.name || 'Fishers'} began fishing at sea`);
      } else {
        if (!s.landed) bringCrewHome(s);
        const k = kingdoms.get(s.kingdomId);
        if (k && s.phase === 'fishing_return') { k.voyageCd = s.salvage ? tick : tick + 900; if (s.salvage) { k.wood = Math.min(250, (k.wood | 0) + 20); addChronicle('⚓', `${k.name}'s raised ship is back in service`); toast(`⚓ ${k.name}'s ship is back in service`); } }
        ships.splice(si,1);
      }
    }
  }
  if (tick % 400 === 0) for (const wk of [...wrecks]) if (tick - wk.t0 > 1500 && Math.random() < .4) raiseWreck(wk, false);
  if (tick % 80 !== 0) return;
  for (const k of kingdoms.values()) if (k.tech.includes('voyage') && tick >= (k.voyageCd || 0)) launchVoyage(k);
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
    if (!c.k || c.boat || RACES[c.t].engine) continue;
    const k = kingdoms.get(c.k); if (!k) continue;
    if (!k.cand || c.age > k.cand.age) k.cand = c;
  }
  for (const k of kingdoms.values()) {
    const L = k.leader;
    if (L && L.hp > 0 && L.k === k.id) continue;
    if (L) { L.lead = 0; applyStats(L); }
    k.leader = k.cand;
    if (k.cand) { k.cand.lead = 1; applyStats(k.cand); addHist(k.cand, 6); if (k.cand !== L) addChronicle('👑', `${nameOf(k.cand)} became leader of ${k.name}`); }
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
  for (const c of creatures) if (!c.boat) cells[(c.y>>3)*GW + (c.x>>3)].push(c);
  for (let i = 0; i < creatures.length; i++) stepCreature(creatures[i]);
  reapDead(); voyageTick(); shoalTick(); sharkTick(); krakenTick();
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
      if (k.food > 5 && Math.random() < birthProbability(RACES[race].spawnP, k.level, k.mod.birth, evBirth(k)) && (counts[race]||0) < capOf(race)) {
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
    if (k.houses === 0) { addChronicle('🏚️', `${k.name} collapsed because it had no settlements`); kingdoms.delete(k.id); ownDirty = true; warStats.collapsed = (warStats.collapsed || 0) + 1; continue; }
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
  kingdoms.clear(); rels.clear(); ships = []; nextShipId = 1; nextKid = 1; ownDirty = true; comp = new Uint16Array(N); compDirty = true;
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
  const pc = presetCamTile(SIZES[sizeIdx]); if (pc) { cx = pc[0]; cy = pc[1]; }
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
  const d = img.data, fi = (frame * 2) | 0, fr = frame, wOK = shoreD.length === N, wph = fr * .045, sa = 1 + (weather.kind === 2 ? weather.k : weather.k * .3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = x + y*W, t = tiles[i], c = COL[t]; let j = jit[i];
    if (t <= 1) j += SIN[(fi + x*22 + y*14) & 255]; else if (t >= 5 && t <= 7) j *= 1.7;
    let r = c[0] + j, g = c[1] + j, b = c[2] + j;
    if (t <= 1 && wOK) {                                         // water: colour by depth, rolling swell, caustics over the shallows, glints and breakers
      const dd = shoreD[i], di = t === 1 ? (dd > 4 ? 4 : dd) : (dd < 5 ? 5 : dd > 30 ? 30 : dd), wi = di * 3, jj = jit[i] * .5;
      r = WR[wi] + jj; g = WR[wi + 1] + jj; b = WR[wi + 2] + jj;
      const sw = (SN(x * .31 + y * .19 - wph) * .6 + SN(x * .13 - y * .27 + wph * .7 + 1.7) * .4) * (3.5 + (30 - di) * .11) * sa;
      r += sw * .55; g += sw * .85; b += sw * 1.15;
      const hh = (i * 2654435761) >>> 0;
      if (t === 1 && di <= 4) {
        const cc = SN(x * .85 + SN(y * .7 + wph * 2) * 1.3 + wph * 1.6) * SN(y * .8 - x * .55 + wph * 1.2 + 3);
        if (cc > .2) { const a = (cc - .2) * 30 * (5 - di) / 4; r += a * .7; g += a * .85; b += a * .8; }
        if (di >= 2) { const q = (hh >> 5) & 31; if (q === 0) { r -= 24; g += 6; b -= 14; } else if (q === 1) { r += 24; g -= 10; b -= 4; } }
      }
      if (di >= 3 && SN(fr * .06 + (hh % 628) / 100) > .99) { r += 30; g += 36; b += 40; }
      if (dd <= 3) { const s2 = SN(fr * .05 - dd * 1.25 + x * .21 + y * .17); if (s2 > 0) { const f = s2 * s2 * s2 * (dd === 1 ? 88 : dd === 2 ? 46 : 22); r += f; g += f; b += f * .95; } }
    }
    const tl = x > 0 ? tiles[i - 1] : t, tr = x < W - 1 ? tiles[i + 1] : t, tu = y > 0 ? tiles[i - W] : t, td = y < H - 1 ? tiles[i + W] : t;
    if (t >= 2 && t !== 8) {                                    // relief: slopes facing the light are brighter, the others darker
      const hn = HT[x > 0 && y > 0 ? tiles[i - W - 1] : t], hs = HT[x < W - 1 && y < H - 1 ? tiles[i + W + 1] : t];
      let sh = (hs - hn) * 4; sh = sh > 28 ? 28 : sh < -28 ? -28 : sh; r += sh; g += sh; b += sh;
      if (tl === 8 || tr === 8 || tu === 8 || td === 8) { r += 38; g += 12; b -= 6; }               // lava glow on the neighbours
    }
    if (t === 1 && !wOK && (tl >= 2 || tr >= 2 || tu >= 2 || td >= 2) && tl !== 8 && tr !== 8 && tu !== 8 && td !== 8) {    // surf along the shore
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

function drawShips(x0, y0, x1, y1) {
  for (const s of ships) {
    if (s.x < x0-2 || s.x > x1+2 || s.y < y0-2 || s.y > y1+2) continue;
    const cx = ox + (s.x + .5) * sc, cy = oy + (s.y + .5) * sc;
    if (sc < 5) {
      ctx.fillStyle = RACES[s.race].col; ctx.fillRect(cx - Math.max(2,sc*.35), cy - Math.max(2,sc*.35), Math.max(4,sc*.7), Math.max(4,sc*.7));
      ctx.fillStyle = '#f4f1e6'; ctx.fillRect(cx - 1, cy - Math.max(4,sc*.65), 2, Math.max(3,sc*.4));
      continue;
    }
    const sp = SHIP_ATLAS[s.race], K = Math.max(1, Math.round(sc/10)), w = sp.width*K, h = sp.height*K;
    ctx.strokeStyle = 'rgba(210,245,255,.58)'; ctx.lineWidth = Math.max(1,sc*.08); ctx.beginPath(); ctx.ellipse(cx, cy + h*.32, w*.58, Math.max(1,sc*.12), 0, 0, Math.PI*2); ctx.stroke();
    let face = 1;
    if (s.step < s.path.length - 1) { const a=s.path[s.step], b=s.path[s.step+1]; face = (b%W) >= (a%W) ? 1 : -1; }
    ctx.save(); ctx.translate(cx, cy); ctx.scale(face, 1); ctx.imageSmoothingEnabled = false; ctx.drawImage(sp, -w/2, -h/2, w, h); ctx.restore();
  }
}
function draw() {
  frame++; mmTick();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#070a16'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.save();
  ctx.beginPath(); ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); ctx.clip();
  if ((waterDirty || shoreD.length !== N) && frame % 12 === 0) { computeShoreD(); waterDirty = false; }
  if (frame % (N > 40000 ? 2 : 1) === 0) renderTerrain();      // big maps redraw terrain every other frame
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, ox, oy, W*sc, H*sc);

  const x0 = Math.max(0, Math.floor((VIEW.x-ox)/sc) - 1), x1 = Math.min(W-1, Math.ceil((VIEW.x+VIEW.w-ox)/sc));
  const y0 = Math.max(0, Math.floor((VIEW.y-oy)/sc) - 1), y1 = Math.min(H-1, Math.ceil((VIEW.y+VIEW.h-oy)/sc));

  SPR_K = Math.max(1, Math.round(sc / 6));
  CHR_K = charScale(sc, cfg.settings && cfg.settings.charSize);
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
    drawSeaDetails(x0, y0, x1, y1);
    drawWrecks(x0, y0, x1, y1);
    drawShoals(x0, y0, x1, y1);
    drawSharks(x0, y0, x1, y1);
    drawKrakens(x0, y0, x1, y1);
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
    const landCreatures = creatures.filter(c => !c.boat);
    for (const c of landCreatures) { c.dx += (c.x - c.dx) * .3; c.dy += (c.y - c.dy) * .3; }
    const order = landCreatures.sort((a, b) => a.dy - b.dy);
    for (const c of order) {
      if (c.dx < x0-2 || c.dx > x1+2 || c.dy < y0-2 || c.dy > y1+3) continue;
      const cx = ox + (c.dx + .5)*sc, fy = oy + (c.dy + 1)*sc - sc*.08;
      const moving = Math.abs(c.x - c.dx) + Math.abs(c.y - c.dy) > .12;
      let f = 'A';
      const jb = c.job, wph = jb && jb.ph === 1 ? swingPhase(frame, c.id, jb.k) : 0;
      if (c.atk > 0) { f = 'C'; c.atk--; } else if (moving && ((frame >> 3) + c.id) % 2) f = 'B';
      else if (jb && jb.ph === 1 && jb.k !== 'fish' && wph >= IMPACT - .04 && wph < IMPACT + .22) f = 'C';
      if (jb && jb.ph === 1 && jb.k !== 'hunt' && jb.k !== 'fish' && !paused && isStrikeFrame(wph)) { const cy = swingCycle(frame, c.id, jb.k); if (cy !== jb.cy) { jb.cy = cy; workImpact(c, jb, c.t); } }
      const lunge = c.atk > 3 ? 2 * CHR_K : 0;
      const spr = ATLAS[c.t][f], sw = spr.width * CHR_K, sh = spr.height * CHR_K;
      const crowned = c.lead && c.k && kingdoms.has(c.k) && kingdoms.get(c.k).level >= 1;       // sprites may be bigger than 10x10
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(cx - sw*.3, fy - Math.max(1, sw*.08), sw*.6, Math.max(1, sw*.1));
      if (c === selected) { ctx.strokeStyle = `rgba(255,214,74,${.65 + .3*Math.sin(frame*.2)})`; ctx.lineWidth = Math.max(2, CHR_K*.7); ctx.beginPath(); ctx.ellipse(cx, fy - sw*.03, sw*.55, sw*.2, 0, 0, 7); ctx.stroke(); }
      if (c.face < 0) { ctx.save(); ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.drawImage(spr, -sw/2 + lunge, fy - sh, sw, sh); ctx.restore(); }
      else ctx.drawImage(spr, cx - sw/2 + lunge, fy - sh, sw, sh);
      if (c.elite) {                                                                    // iron knight: helmet, crest and shield over the race sprite
        const K = CHR_K, mx = cx + lunge, hd = c.face < 0 ? -1 : 1;
        ctx.fillStyle = '#c0c8d4'; ctx.fillRect(mx - sw*.27, fy - sh - K*.5, sw*.54, K*2.5);
        ctx.fillStyle = '#6a7280'; ctx.fillRect(mx - sw*.27, fy - sh + K*1.5, sw*.54, K*.6);
        ctx.fillStyle = RACES[c.t].col; ctx.fillRect(mx - K*.5, fy - sh - K*2.4, K, K*2);
      }
      if (sc >= 8 && c.eq && (c.eq[0] || c.eq[1] || c.eq[2])) drawGear(c, cx + lunge, fy, sw, sh);
      if (jb) {                                                                         // work tools, swings and hauled goods
        if (jb.ph === 2) drawCarry(ctx, jb.item === 'ore' ? 'rock' : jb.item, cx, fy - sh - CHR_K * .5, CHR_K, frame, c.id);
        else {
          const tgx = jb.k === 'fish' ? jb.wx : jb.x, tgy = jb.k === 'fish' ? jb.wy : jb.y;
          const hph = jb.k === 'hunt' ? (c.atk > 0 ? .5 + (10 - c.atk) * .05 : .3) : wph;
          drawWorker(ctx, { job: jb.k, race: c.t, ph: hph, phase: jb.ph, cx: cx + lunge, fy, sw, sh, K: CHR_K, hd: c.face < 0 ? -1 : 1, frame, id: c.id,
            tx: ox + (tgx + .5) * sc, ty: oy + (tgy + (jb.k === 'fish' ? .5 : .8)) * sc });
        }
      }
      if (crowned) { const K = CHR_K, tx = cx - K*2 + lunge; ctx.fillStyle = '#ffd23f'; ctx.fillRect(tx, fy - sh - K*2, K*4, K); ctx.fillRect(tx, fy - sh - K*3, K, K); ctx.fillRect(tx + K*3, fy - sh - K*3, K, K); ctx.fillRect(tx + K*1.5, fy - sh - K*3, K, K); }
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
      if (c.boat) continue;
      c.dx += (c.x - c.dx) * .3; c.dy += (c.y - c.dy) * .3;
      if (c.dx < x0-2 || c.dx > x1+2 || c.dy < y0-2 || c.dy > y1+2) continue;
      ctx.fillStyle = RACES[c.t].col; ctx.fillRect(ox + (c.dx + .5)*sc - ds/2, oy + (c.dy + .5)*sc - ds/2, ds, ds);
    }
  }
  drawShips(x0, y0, x1, y1);
  drawEffects();
  drawAtmosphere();
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
      life = 30; const sp = ATLAS[e.type].A, sw = sp.width * CHR_K, sh = sp.height * CHR_K, fy = py + sc*.42;
      if (sc < 5) { if (e.t >= life) effects.splice(i, 1); continue; }
      ctx.save();
      if (e.old) { ctx.globalAlpha = Math.max(0, .7*(1 - e.t/life)); ctx.drawImage(sp, px - sw/2, fy - sh - e.t*.25*CHR_K, sw, sh); }
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
  raise:  { g:'terrain', ic:'⬆️', nm:'Raise', ms:140 },
  lower:  { g:'terrain', ic:'⬇️', nm:'Lower', ms:140 },
  grass:  { g:'terrain', ic:'🌱', nm:'Grass', ms:40 },
  forest: { g:'terrain', ic:'🌲', nm:'Forest', ms:40 },
  sand:   { g:'terrain', ic:'🏖️', nm:'Sand', ms:40 },
  lava:   { g:'terrain', ic:'🌋', nm:'Lava', ms:60 },
  human:  { g:'life', ic:'🧑', nm:'Human', ms:140, spawn:1 },
  elf:    { g:'life', ic:'🧝', nm:'Elf', ms:140, spawn:1 },
  dwarf:  { g:'life', ic:'🧔', nm:'Dwarf', ms:140, spawn:1 },
  orc:    { g:'life', ic:'👹', nm:'Orc', ms:140, spawn:1 },
  sheep:  { g:'life', ic:'🐑', nm:'Sheep', ms:140, spawn:1 },
  rabbit: { g:'life', ic:'🐇', nm:'Rabbit', ms:140, spawn:1 },
  deer:   { g:'life', ic:'🦌', nm:'Deer', ms:140, spawn:1 },
  wolf:   { g:'life', ic:'🐺', nm:'Wolf', ms:140, spawn:1 },
  werewolf: { g:'life', ic:EMOJI.werewolf, nm:'Werewolf', ms:140, spawn:1 },
  fish:   { g:'life', ic:'🐟', nm:'Fish', ms:160 },
  shark:  { g:'life', ic:'🦈', nm:'Shark', ms:300 },
  rain:   { g:'powers', ic:'🌧️', nm:'Rain', ms:40 },
  fire:   { g:'powers', ic:'🔥', nm:'Fire', ms:50 },
  bolt:   { g:'powers', ic:'⚡', nm:'Lightning', ms:250 },
  meteor: { g:'powers', ic:'☄️', nm:'Meteor', ms:700 },
  bless:  { g:'powers', ic:'✨', nm:'Bless', ms:120 },
  smite:  { g:'powers', ic:'💀', nm:'Smite', ms:90 },
  kraken: { g:'powers', ic:'🐙', nm:'Kraken', ms:99999 },
  salvage:{ g:'powers', ic:'⚓', nm:'Salvage', ms:99999 },
  enlighten:{ g:'realm', ic:'📖', nm:'Knowledge', ms:99999 },
  grace:  { g:'realm', ic:'🙏', nm:'Grace', ms:99999 },
  plague: { g:'realm', ic:'☠️', nm:'Plague', ms:99999 },
  revolt: { g:'realm', ic:'🔥', nm:'Rebellion', ms:99999 },
  peace:  { g:'realm', ic:'🕊️', nm:'Peace', ms:99999 },
  unite:  { g:'realm', ic:'🤝', nm:'Unite', ms:99999 },
  split:  { g:'realm', ic:'✂️', nm:'Split', ms:99999 },
  inspect:{ g:'powers', ic:'🔍', nm:'Inspect', ms:0 },
};

/* ============================== NATURAL DISASTERS (automatic; level set in the world tab) ============================== */
let disasterLvl = 1;                                         // 0 off, 1 rare, 2 frequent
let nextMajor = 0;                                           // tick before which no volcano/meteor may be scheduled
const pendingDis = [];
const DIS_NAMES = ['Off', 'Rare', 'Frequent'];
function strikeBolt(wx, wy, rr) {
  addChronicle('⚡', 'Lightning struck the island');
  fx('bolt', wx, wy, { seed: (Math.random()*1000)|0 }); haptic('tap');
  sharkHit(wx, wy, rr + 1); krakenHit(wx, wy, rr + 1, 110);
  forDisc(wx, wy, rr, (x, y, i) => { ignite(i); bld[i] = 0; });
  for (const c of creatures) if ((c.x-wx)**2 + (c.y-wy)**2 <= rr*rr + 1) c.hp = 0;
}
function strikeMeteor(wx, wy, R) {
  addChronicle('☄️', 'A meteor struck the island');
  fx('boom', wx, wy, { r: R + 2 }); haptic('thud'); shakeT = 22; sharkHit(wx, wy, R); krakenHit(wx, wy, R, 200);
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
  addChronicle('🌋', 'A volcano erupted');
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
  addChronicle('🪨', 'An earthquake shook the island');
  const R = 9; shakeT = 50; haptic('thud');
  fx('shock', wx, wy, { r: R }); fx('crack', wx, wy, { r: R, seed: (Math.random() * 999) | 0 }); emit('dust', wx, wy, 26, { sx: R });
  forDisc(wx, wy, R, (x, y, i) => {
    if (bld[i] && Math.random() < .25) { bld[i] = 0; fire[i] = 0; fx('puff', x, y); }
    else if (tiles[i] > T.SHALLOW && tiles[i] !== T.LAVA && Math.random() < .03) fx('puff', x, y);
  });
  for (const c of creatures) if ((c.x-wx)**2 + (c.y-wy)**2 <= R*R && Math.random() < .15) c.hp -= 4;
}
function strikeFlood(wx, wy) {                               // sea surges inland from a coast tile, then recedes
  addChronicle('🌊', 'A flood surged along the coast');
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
  if (T_.spawn && Snd.ctx && Snd.on && can('pop', 110)) SFX.pop();
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
        toast(k2 ? `🔥 ${EMOJI[k.race]}${k2.name} ⚔️ ${k.name}` : '🏚️ too small'); haptic('warning');
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
        toast(k2 ? `✂️ ${k.name} | ${k2.name}` : '🏚️ too small'); haptic('tap');
      }
      break;
    }
    case 'fish': case 'shark': {                                      // sea life goes into water only
      if (shoreD[wx + wy*W] === 255) computeShoreD();
      if (tool === 'shark') { if (sharks.length >= 40) { toast('🦈 Too many sharks'); break; } const sk = addShark(wx, wy); if (sk) { fx('splash', wx, wy); emit('bit', wx, wy, 6, { col: '#bfe6ff' }); } else toast('🦈 Needs open water'); }
      else { const kind = [1, 0, 2].find(k => shoalOk(k, wx, wy)); if (kind == null || shoals.length >= 400) { toast('🐟 Needs water'); break; } shoals.push({ x: wx, y: wy, kind, stock: 1, tx: wx, ty: wy, hd: 1, ph: ri(0, 63) }); fx('splash', wx, wy); emit('bit', wx, wy, 6, { col: '#bfe6ff' }); }
      break;
    }
    case 'salvage': {
      const wk = wrecks.find(q => (q.x - wx) ** 2 + (q.y - wy) ** 2 <= 9);
      if (wk) raiseWreck(wk, true); else toast('⚓ No wreck here');
      break;
    }
    case 'kraken':
      if (krakens.length >= 2) toast('🐙 One is enough'); else if (!summonKraken(wx, wy, true)) toast('🐙 Needs open water');
      break;
    case 'smite':
      fx('smite', wx, wy); sharkHit(wx, wy, r); krakenHit(wx, wy, r, 40);
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
  const ic = k.tech.map(id => TECH_BY[k.race + ':' + id].ic).join(''), rs = k.res ? ` · ⏳${k.res.t.ic} ${k.res.t.n}` : '', sailEra = k.tech.includes('voyage') ? ' · ⛵ Age of Exploration' : '';
  return `<b>${LV_ICON[k.level]} ${k.name}</b> ${EMOJI[k.race]}<br>${k.level ? '⭐'.repeat(k.level) + ' ' : ''}${LV_NAME[k.level]} · 👥${k.pop} · 🏠${k.houses}<br>🍞${k.food | 0} 🪵${k.wood | 0} 🪨${k.stone | 0} 🪙${k.gold | 0}<br>🥉${k.bronze | 0} 🔩${k.iron | 0} 🥈${k.silver | 0} · ${['Stone Age', 'Bronze Age', 'Iron Age'][k.age | 0]}${sailEra} · 🎒${k.chest.length}/${chestCap(k)}${k.age >= 2 ? ' · 🛡' + creatures.filter(c => c.k === k.id && c.elite).length : ''}<br>🔬 ${ic || '–'}${rs}${relLine(k)}${evLine(k)}`;
}
/* ============================== CREATURE PANEL ============================== */
let selected = null, following = false, deadNote = 0;
const NAME_POOL = {
  human: [['Al', 'Bran', 'Cor', 'Da', 'Ed', 'Fen', 'Gar', 'Hal', 'Ivo', 'Jor', 'Kel', 'Lia', 'Mor', 'Nia', 'Ow', 'Per'], ['dric', 'na', 'mund', 'ra', 'wyn', 'vin', 'lo', 'ric']],
  elf: [['Ael', 'Lir', 'Sae', 'Thi', 'Nyl', 'Ere', 'Cae', 'Ily', 'Fae'], ['rin', 'wen', 'dor', 'sia', 'lian', 'vyr', 'thas']],
  dwarf: [['Bor', 'Dur', 'Gim', 'Kaz', 'Thor', 'Mor', 'Bal', 'Dwa', 'Hrol'], ['in', 'gar', 'rik', 'dok', 'li', 'mund', 'bek']],
  orc: [['Gor', 'Zug', 'Mog', 'Gra', 'Kru', 'Ugh', 'Naz', 'Bog', 'Hrak'], ['ash', 'gul', 'dak', 'rok', 'nak', 'uk', 'mash']],
  werewolf: [['Lun', 'Fen', 'Va', 'Gre', 'Nox', 'Ulv', 'Sko', 'Mar'], ['fang', 'ra', 'mar', 'wyr', 'claw', 'howl']],
  sheep: ['Wolly', 'Puff', 'Cloud', 'Baa', 'Cotton', 'Fleece'], rabbit: ['Hop', 'Fluff', 'Bounce', 'Nibble', 'Thumper', 'Tuft'],
  deer: ['Elm', 'Fawn', 'Aspen', 'Brook', 'Birch', 'Dew'], wolf: ['Fang', 'Shadow', 'Ash', 'Dusk', 'Claw', 'Grey'],
  ram: ['Ram'], catapult: ['Catapult'], dcatapult: ['Iron Catapult'], cart: ['Wagon'],
};
const DESC = {
  human: 'Hard-working farmers and builders. They multiply fast and trade well.',
  elf: 'Long-lived guardians of the forest. Master archers who love nature.',
  dwarf: 'Tough miners of the hills. Masters of forging and finding metal.',
  orc: 'Fierce warriors who live off war and plunder.',
  werewolf: 'Evolved wolves. Neutral, and stronger at night.',
  sheep: 'Gentle grass-eaters. Prey for wolves.',
  wolf: 'Fierce hunters. They attack sheep, rabbits and deer, even people when starving.',
  rabbit: 'Quick and fast-breeding. Runs from wolves.',
  deer: 'Shy forest dwellers. Run from wolves.',
  ram: 'Orc siege engine. Batters enemy walls.',
  catapult: 'Human siege engine. Hurls rocks from afar.',
  dcatapult: 'Dwarven iron catapult. Hurls rocks from afar.',
  cart: 'Trade wagon carrying goods between kingdoms.',
};
const TYPE_NAME = { human: 'Human', elf: 'Elf', dwarf: 'Dwarf', orc: 'Orc', sheep: 'Sheep', wolf: 'Wolf', rabbit: 'Rabbit', deer: 'Deer', werewolf: 'Werewolf', ram: 'Ram', catapult: 'Catapult', dcatapult: 'Iron catapult', cart: 'Wagon' };
function nameFor(t, sd) {
  const P = NAME_POOL[t], h = hash(sd, 7, 11);
  return Array.isArray(P[0]) ? P[0][Math.floor(h * P[0].length)] + P[1][Math.floor(hash(sd, 9, 13) * P[1].length)] : P[Math.floor(h * P.length)];
}
function nameOf(c) { return c.nm || (c.nm = nameFor(c.t, c.nid === undefined ? c.id : c.nid)); }
function roleOf(c) {
  const R = RACES[c.t];
  if (R.cart) return 'Merchant'; if (R.engine) return 'War machine';
  if (c.elite) return 'Iron knight'; if (c.lead) return 'Leader';
  if (R.civ) return isSoldier(c) ? 'Soldier' : 'Citizen';
  return R.hunt ? 'Hunter' : 'Prey';
}
function statusOf(c) {
  const R = RACES[c.t], k = c.k ? kingdoms.get(c.k) : null, r = c.hp / c.mhp;
  if (c.hp <= 0) return 'Dead';
  if (c.pz > 0) return 'Poisoned';
  if (fire[c.x + c.y*W]) return 'Burning';
  if (r < .35) return 'Dying'; if (r < .7) return 'Wounded';
  if (R.hunt && c.en < 45) return 'Hungry';
  if (k && k.enemies.size && (c.elite || c.lead || isSoldier(c))) return 'At war';
  if (c.job && STATUS[c.job.k]) return STATUS[c.job.k][c.job.ph];
  return 'Healthy';
}
function portraitURL(t) {
  if (!ICON['cr:' + t]) { const sp = ATLAS[t].A, cv2 = document.createElement('canvas'); cv2.width = Math.max(16, sp.width); cv2.height = Math.max(16, sp.height); cv2.getContext('2d').drawImage(sp, Math.floor((cv2.width - sp.width) / 2), cv2.height - sp.height); ICON['cr:' + t] = cv2; }
  return iconURL('cr:' + t);
}
let ptab = 0, invSel = -1, chSel = -1;                           // panel tab (0 info, 1 family, 2 bag, 3 chest) and the selected bag / chest item
const itemName = (race, sl, t, e) => (GEAR_NAME[race] || GEAR_NAME.human)[sl][t - 1] + (e ? ' ' + ENCH[e].n : '');
const itemTip = (sl, t, e) => [`+${Math.round(W_ATK[t] * 100)}% attack`, `+${Math.round(A_DEF[t] * 100)}% defence, +${A_HP[t]} hp`, `+${Math.round(S_DEF[t] * 100)}% defence`][sl] + (e ? ` · ${ENCH[e].d}` : '');
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
    h += `<div class="tabs">${['Info', 'Family', `Bag ${inv.length}`, ch ? `Chest ${ch.length}` : null].slice(0, tabs).map((n, i) => `<button class="ptab${ptab === i ? ' on' : ''}" data-act="tab" data-t="${i}">${n}</button>`).join('')}</div>`;
  }
  const tab = civ ? Math.min(ptab, tabs - 1) : 0;
  if (tab === 0) {
    h += `<span class="dsc">${DESC[c.t] || ''}</span>`;
    h += bar('❤️', hp, col) + (R.hunt ? bar('⚡', c.en / 100, '#ffd23f') : '') + bar('⏳', c.age / c.life, '#6aa8ff');
    if (civ) {
      const ev = [[tick - c.age, 0, 0]].concat(c.hist || []).slice(-4), nm = (sd) => nameFor(c.t, sd);
      h += '<div class="hist">' + ev.map(([t, code, a]) => {
        const txt = code === 0 ? (c.pa ? `Born, child of ${nm(c.pa)}${c.pb ? ' & ' + nm(c.pb) : ''}` : 'Born') : code === 8 ? `Received ${itemName(c.t, 0, a)}` : code === 9 ? `Put on ${itemName(c.t, 1, a)}`
          : code === 10 ? `Joined ${a}` : code === 12 ? `Was given ${itemName(c.t, a >> 2, a & 3)}` : code === 13 ? `${itemName(c.t, a >> 2, a & 3)} taken away` : code === 14 ? `Partnered with ${nm(a)}` : code === 15 ? `Child born: ${nm(a)}` : code === 16 ? `Looted ${itemName(c.t, a >> 2, a & 3)}` : code === 17 ? `Picked up ${itemName(c.t, a >> 2, a & 3)}` : HIST_TXT[code] || '';
        return `<em>Yr ${Math.max(0, Math.floor(t / 120))}</em> ${txt}`;
      }).join('<br>') + '</div>';
    }
    h += `<div class="row">${(c.age / 120).toFixed(1)}/${(c.life / 120).toFixed(1)}${c.kills ? ' · ⚔️ ' + c.kills : ''}${k ? ` · ${LV_ICON[k.level]} ${k.name} ${EMOJI[k.race]}` : ''}</div>`;
  } else if (tab === 1) {
    const rel = relatives(c), chip = (nid) => { if (!nid) return '–'; const o = rel.by.get(nid); return o ? `<button class="rel" data-act="sel" data-id="${o.id}">${nameFor(c.t, nid)}</button>` : `<span class="rel dead">${nameFor(c.t, nid)} †</span>`; };
    h += `<div class="fam"><div><u>Partner</u> ${chip(c.sp)}</div><div><u>Parents</u> ${c.pa ? chip(c.pa) + (c.pb ? ' ' + chip(c.pb) : '') : '–'}</div>`;
    h += `<div><u>Children</u> ${c.ch ? `${c.ch} born · ${rel.kids.length} alive` : '–'}</div>${rel.kids.length ? `<div>${rel.kids.slice(0, 8).map(o => chip(o.nid)).join(' ')}</div>` : ''}</div>`;
  } else {
    const isChest = tab === 3, arr = isChest ? ch : inv, cap = isChest ? chestCap(k) : INV_MAX, selIdx = isChest ? chSel : invSel;
    h += `<div class="bag${isChest ? ' sm' : ''}">` + Array.from({ length: cap }, (_, i) => { const it = arr[i]; return it ? `<button class="bi t${it[1]}${i === selIdx ? ' sel' : ''}" data-act="${isChest ? 'chs' : 'inv'}" data-i="${i}"${ench(it[3])}>${GEAR_ICON[it[0]]}<small>${'I'.repeat(it[1])}${it[3] ? '✨' : ''}</small></button>` : '<span class="bi e"></span>'; }).join('') + '</div>';
    const s2 = sel && sel.arr === arr ? sel.it : null;
    h += `<div class="row">${s2 ? `${itemName(s2[2], s2[0], s2[1], s2[3])} · ${itemTip(s2[0], s2[1], s2[3] | 0)} · 🪙${sellPrice(s2)}` : arr.length ? 'Tap an item: equip it through a slot above, or use a button' : isChest ? 'Chest empty: settlers bring their finds here' : 'Bag empty: tap an equipment slot above, or an item on the ground'}</div>`;
    if (s2) h += `<div class="tabs">${isChest ? '<button class="ptab" data-act="fetch">To bag</button>' : (ch && ch.length < chestCap(k) ? '<button class="ptab" data-act="store">To chest</button>' : '') + '<button class="ptab" data-act="drop">Drop</button>'}<button class="ptab" data-act="sell">Sell 🪙</button></div>`;
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
  if (inv.length >= INV_MAX) { toast('🎒 full'); return; }
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
  else { if (s2.arr !== ch || inv.length >= INV_MAX) { if (inv.length >= INV_MAX) toast('🎒 full'); return; } inv.push(ch.splice(s2.i, 1)[0]); chSel = -1; }
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
  if (inv.length >= INV_MAX) { toast('🎒 full'); return; }
  inv.push([sl, t, c.t, c.ec[sl]]); c.eq[sl] = 0; c.ec[sl] = 0; addHist(c, 13, sl * 4 + t); applyStats(c); toast('🎒 ' + itemName(c.t, sl, t, inv[inv.length - 1][3])); haptic('tap'); dirty = true;
}
function pickCreatureAt(px, py) {                                   // nearest creature to a screen point (sprites stand above their tile)
  const fx0 = (px - ox) / sc, fy0 = (py - oy) / sc; let best = null, bd = 1.7;
  for (const c of creatures) {
    if (c.hp <= 0 || c.boat) continue;
    const d = (c.dx + .5 - fx0) ** 2 + (c.dy - .1 - fy0) ** 2; if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function showCreature(c) { selected = c; invSel = chSel = -1; following = false; deadNote = 0; clearTimeout(infoT); infoLast = infoEl.innerHTML = creatureHtml(c); infoEl.style.display = 'block'; }
function closeCreature() { selected = null; following = false; deadNote = 0; infoEl.style.display = 'none'; }
function refreshCreature() {
  if (!selected) return;
  if (selected.hp <= 0) { if (!deadNote) { deadNote = 1; infoEl.innerHTML = `<div class="ibtns"><button class="awb ibt" data-act="close">✖</button></div><img class="pt" src="${portraitURL(selected.t)}" alt=""><b>${nameOf(selected)}</b><span class="tag">Dead</span><br>${TYPE_NAME[selected.t]} · ${selected.cause === 'old' ? '⏳' : '💀'}`; setTimeout(() => { if (deadNote) closeCreature(); }, 2200); } return; }
  if (infoHold) return;                                              // do not rebuild the buttons under a finger
  const h = creatureHtml(selected); if (h !== infoLast) { infoLast = h; infoEl.innerHTML = h; }
}
infoEl.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'close') closeCreature();
  else if (a.dataset.act === 'journalTab') showJournal(a.dataset.tab);
  else if (a.dataset.act === 'seed') { const zi = +a.dataset.i; confirmThen('seed' + zi, SIZES[zi].label, () => { newWorld(zi); closeCreature(); renderRow2(); }); }
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
function showSeeds() {                                          // picker for the empty island seeds
  selected = null; following = false; clearTimeout(infoT);
  infoEl.innerHTML = `<div class="ibtns"><button class="awb ibt" data-act="close">✖</button></div><b>🏝️ Empty island seeds</b><span class="dsc">No life and no houses: you lay the first foundations yourself.</span><div class="seeds">${SIZES.map((z, i) => ({ z, i })).filter(o => o.z.preset && !o.z.preset.hidden).sort((a, b) => (a.z.preset.order ?? 9) - (b.z.preset.order ?? 9)).map(o => `<button class="seed" data-act="seed" data-i="${o.i}"><b>${o.z.label}</b><small>${o.z.preset.desc}</small></button>`).join('')}</div>`;
  infoEl.style.display = 'block';
}
function inspectAt(wx, wy) {
  const NM = TYPE_NAME;
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
      const kr = krakens.find(q => (q.x - wx) ** 2 + (q.y - wy) ** 2 <= 16), sk = kr ? null : sharks.find(q => (q.x - wx) ** 2 + (q.y - wy) ** 2 <= 4), wkk = kr || sk ? null : wrecks.find(q => (q.x - wx) ** 2 + (q.y - wy) ** 2 <= 4), sh = kr || sk || wkk ? null : shoalNear(wx, wy, 2, 2);
      if (kr) infoEl.innerHTML = krakenHtml(kr);
      else if (sk) infoEl.innerHTML = sharkHtml(sk);
      else if (wkk) infoEl.innerHTML = wreckHtml(wkk);
      else if (sh) infoEl.innerHTML = shoalHtml(sh);
      else if (k) infoEl.innerHTML = kingdomHtml(k);
      else {
        const nm = ['Deep sea','Shallow sea','Sand','Grass','Forest','Hills','Mountain','Snow','Lava','Burnt ground'][tiles[i]];
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
  else { pendingKey = key; pendingT = now; toast('⚠️ ' + msg + ' — tap again'); }
}
function newWorld(idx) {
  extinctRaces.clear(); chronicle.length = 0; completedGoals.clear(); warsResolved = 0; ships = []; nextShipId = 1;
  floods.length = 0; pendingDis.length = 0;
  setSize(idx == null ? sizeIdx : idx);
  generate(1 + ((Math.random() * 1e6) | 0));
  if (!editMode) { seedResources(); seedVolcanoes(); seedShoals(); seedSharks(); if (!SIZES[sizeIdx].empty) populate(); else toast('🏝️ Empty island — start in the Life tab'); }
  startCamera(); persistWorld(); dirty = true; if (!editMode) clearSave();
}
/* ---- leaderboard: "civilization score" ---- */
let bestSent = 0, lbBusy = false;
function civScore() {                                        // population, houses, level and tech of every kingdom, plus years survived
  let sc = 0;
  for (const k of kingdoms.values()) sc += k.pop*2 + k.houses*3 + k.level*60 + k.tech.length*40 + (k.age | 0)*50 + ((k.bronze | 0) + (k.iron | 0) + (k.silver | 0))*.5;
  return Math.round(sc + (tick / 120) * 2 + market.trades * 3);
}
function addChronicle(icon, text) {
  if (editMode || !text) return;
  chronicle.unshift({ tick, icon, text: String(text) }); if (started) majorBanner(icon, String(text));
  if (chronicle.length > CHRONICLE_MAX) chronicle.length = CHRONICLE_MAX;
  dirty = true;
  const body = infoEl.querySelector('.jbody');
  if (body && infoEl.dataset.journalTab === 'chronicle') body.innerHTML = chronicleBody();
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch])); }
function chronicleBody() {
  return chronicle.length ? chronicle.map(e => `<div class="jrow"><span class="jicon">${escapeHtml(e.icon)}</span><div><small>Year ${Math.floor(e.tick / 120)}</small><span>${escapeHtml(e.text)}</span></div></div>`).join('') : '<div class="jempty">No major events yet. Let the world run and its story will appear here.</div>';
}
function goalsBody() {
  const vals = currentGoalValues();
  return OBJECTIVES.map(g => {
    const v = Math.max(0, vals[g.id] || 0), done = completedGoals.has(g.id), pct = Math.round(objectiveRatio(v, g.target) * 100);
    return `<div class="jgoal" data-goal="${g.id}"><div class="jgoaltop"><b>${g.icon} ${escapeHtml(g.title)}</b><strong class="jcount">${done ? '✓' : `${Math.min(v, g.target)}/${g.target}`}</strong></div><small>${escapeHtml(g.detail)}</small><div class="jbar"><i style="width:${pct}%;${done ? 'background:#65df9a' : ''}"></i></div></div>`;
  }).join('');
}
function refreshGoalsPanel() {
  if (!infoEl.querySelector('.jgoal')) return;
  const vals = currentGoalValues();
  for (const g of OBJECTIVES) {
    const card = infoEl.querySelector(`[data-goal="${g.id}"]`); if (!card) continue;
    const v = Math.max(0, vals[g.id] || 0), done = completedGoals.has(g.id), count = card.querySelector('.jcount'), bar = card.querySelector('.jbar i');
    if (count) count.textContent = done ? '✓' : `${Math.min(v, g.target)}/${g.target}`;
    if (bar) { bar.style.width = `${Math.round(objectiveRatio(v, g.target) * 100)}%`; bar.style.background = done ? '#65df9a' : ''; }
  }
}
function currentGoalValues() { return objectiveValues(counts, [...kingdoms.values()].map(k => k.level), warsResolved); }
function checkObjectives() {
  if (editMode || !started) return;
  const vals = currentGoalValues();
  for (const g of OBJECTIVES) if (!completedGoals.has(g.id) && vals[g.id] >= g.target) {
    completedGoals.add(g.id); addChronicle('🏆', `Goal reached: ${g.title}`);
    toast(`🏆 Goal reached · ${g.title}`); dirty = true;
  }
}
function showJournal(tab = 'chronicle') {
  selected = null; following = false; deadNote = 0; infoHold = false; clearTimeout(infoT);
  checkObjectives();
  const tabs = `<div class="jtabs"><button class="awb jtab ${tab === 'chronicle' ? 'on' : ''}" data-act="journalTab" data-tab="chronicle">📜 Chronicle</button><button class="awb jtab ${tab === 'goals' ? 'on' : ''}" data-act="journalTab" data-tab="goals">🎯 Goals</button></div>`;
  const body = tab === 'goals' ? goalsBody() : chronicleBody();
  infoEl.dataset.journalTab = tab;
  infoEl.innerHTML = `<div class="ibtns"><button class="awb ibt" data-act="close" aria-label="Close">✖</button></div><b>📜 World Chronicle</b>${tabs}<div class="jbody">${body}</div>`;
  infoEl.style.display = 'block';
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
  { nm: 'New world', h: 'Generate a fresh random world', ic:'🗺️', fn: () => confirmThen('new', 'New world', () => { newWorld(); toast('🗺️ ' + SIZES[sizeIdx].label); }) },
  ...SIZES.slice(0, 3).map((z, i) => ({ nm: z.label, h: `${z.w}×${z.h} map`, ic: z.name, on: () => sizeIdx === i,
    fn: () => confirmThen('size' + i, `${z.label} ${z.w}×${z.h}`, () => { newWorld(i); renderRow2(); toast(`🗺️ ${z.label} ${z.w}×${z.h}`); }) })),
  { nm: 'Island seeds', h: 'Start from an empty island', ic:'🏝️', fn: () => showSeeds() },
  { nm: 'Empty ocean', h: 'Clear the map to open sea', ic:'🌊', fn: () => confirmThen('ocean', 'Empty ocean', () => { floods.length = 0; pendingDis.length = 0; emptyWorld(); currentSeed = 0; startCamera(); persistWorld(); dirty = true; toast('🌊'); }) },
  ...(editMode ? [] : [
    { nm: 'Wildlife', h: 'Add more animals', ic:'🐾', fn: () => { populate(1); toast('🐾'); } },
    { nm: 'Clear', h: 'Remove creatures and houses', ic:'🧹', fn: () => confirmThen('clear', 'Remove creatures & houses', () => { creatures = []; bld.fill(0); counts = {}; houseCount = 0; dirty = true; toast('🧹'); }) },
  ]),
  ...(editMode ? [] : [{ nm: 'Tour', h: 'Replay the guided tour', ic:'❓', fn: () => startTour(true) }]),
  ...(editMode ? [] : [{ nm: 'Market', h: 'Prices and trade', ic:'🏦', fn: () => showBoard(marketHtml()) }]),
  ...(editMode ? [] : [{ nm: 'Score', h: 'Submit your civilization score', ic:'🏆', fn: () => submitScore(true) }]),
  { nm: 'Borders', h: 'Show kingdom borders', ic:'🚩', on: () => showBorders, fn: () => { showBorders = !showBorders; renderRow2(); toast(showBorders ? '🚩 on' : '🚩 off'); } },
  ...(editMode ? [] : [{ nm: 'Disasters', h: 'Off, rare or frequent natural disasters', ic:'☄️', on: () => disasterLvl > 0, fn: () => { disasterLvl = (disasterLvl + 1) % 3; pendingDis.length = 0; dirty = true; renderRow2(); toast('☄️ Disasters: ' + DIS_NAMES[disasterLvl]); } }]),
  { nm: 'Day and night', h: 'Toggle the day cycle', ic:'🌗', fn: () => { cfg.settings.dayNight = !cfg.settings.dayNight; toast(cfg.settings.dayNight ? '🌗 on' : '🌗 off'); } },
];

const tabBtns = [];
function renderRow1() {
  row1.innerHTML = ''; tabBtns.length = 0;
  for (const [g, ic] of GROUPS) {
    const b = mkBtn(row1, ic, () => { if (bot.classList.contains('compact')) { closeCreature(); infoEl.style.display = 'none'; } group = g; popSel = true; renderRow1(); renderRow2(); popSel = false; }, g === group ? 'on' : '');
    tabBtns.push(b);
  }
  const bb = el('div', 'awbrush', row1); bb.classList.toggle('dim', !brushUsed());
  mkBtn(bb, '−', () => setBrush(brush - 1));
  const sp = document.createElement('span'); sp.id = 'awbv'; sp.innerHTML = brushDot(); bb.appendChild(sp);
  mkBtn(bb, '+', () => setBrush(brush + 1));
  if (popSel) { const o = row1.querySelector(':scope > .awb.on'); if (o) o.classList.add('pop'); }
  updateTag();
}
function brushUsed() { const t = TOOLS[tool]; return !!t && t.ms < 5000 && tool !== 'inspect'; }      // the brush size only matters for painting and spawning tools
function brushDot() { const d = 12 + brush * 4.4; return `<i class="bd" style="width:${d}px;height:${d}px"></i><em>${brush}</em>`; }
function setBrush(v) { brush = Math.max(1, Math.min(10, v)); const s = document.getElementById('awbv'); if (s) s.innerHTML = brushDot(); }
function renderRow2() {
  row2.innerHTML = '';
  if (group === 'world') { for (const a of WORLD_ACTIONS) mkBtn(row2, a.ic, () => { setTag(a.ic, a.nm, a.h); a.fn(); }, a.on && a.on() ? 'on' : ''); }
  else for (const [id, t] of Object.entries(TOOLS)) if (t.g === group) mkBtn(row2, t.ic, () => selectTool(id), tool === id ? 'on' : '');
  const on = row2.querySelector('.awb.on'); row2.scrollLeft = on ? Math.max(0, on.offsetLeft - 24) : 0; fadeRow2();
  if (popSel && on) on.classList.add('pop');
}
row2.addEventListener('scroll', () => fadeRow2(), { passive: true });
function fadeRow2() { row2.style.setProperty('--fl', row2.scrollLeft > 4 ? '36px' : '0px'); row2.style.setProperty('--fr', row2.scrollLeft + row2.clientWidth < row2.scrollWidth - 4 ? '44px' : '0px'); }
const GROUP_NAME = { terrain: 'Terrain', life: 'Life', powers: 'Powers', realm: 'Realm', world: 'World' };
const TOOL_HINT = { raise: 'Raise land from the sea', lower: 'Lower land into the sea', grass: 'Paint grass', forest: 'Plant forest', sand: 'Paint sand', lava: 'Pour lava', rain: 'Douses fires and greens the land', fire: 'Set things ablaze', bolt: 'Strike lightning', meteor: 'Call down a meteor', bless: 'Heal and bless creatures', smite: 'Strike creatures down', kraken: 'Summon a kraken in open water', salvage: 'Tap a wreck to raise it', inspect: 'Tap anything for details', enlighten: 'Teach a kingdom a technology', grace: 'Bless a kingdom with plenty', plague: 'Strike a kingdom with plague', revolt: 'Start a rebellion in a kingdom', peace: 'End the wars of a kingdom', unite: 'Merge a kingdom with a neighbour', split: 'Split a kingdom in two', fish: 'Place a fish shoal in the water', shark: 'Place a shark in open water' };
function setTag(ic, nm, hint) { tagEl.classList.remove('tagin'); void tagEl.offsetWidth; tagEl.classList.add('tagin'); tagEl.innerHTML = `<span class="tk">${ic}</span><b>${nm || ''}</b><span class="th">${hint || ''}</span><span class="tg">${(GROUP_NAME[group] || '').toUpperCase()}</span>`; }
function updateTag() {                                         // the name and hint of the chosen tool sit just above the dock
  const t = TOOLS[tool];
  if (tool === 'hand') setTag('✋', 'Hand', 'Drag to move the map');
  else if (group === 'world') setTag('🌍', 'World', 'Map, seeds, market and options');
  else if (t && t.g === group) setTag(t.ic, t.nm, TOOL_HINT[tool] || 'Tap or drag to place');
  else setTag(GROUPS.find(g => g[0] === group)[1], GROUP_NAME[group], 'Choose a tool below');
}
function selectTool(id) {
  tool = id; handBtn.classList.toggle('on', id === 'hand');
  if (TOOLS[id]) group = TOOLS[id].g;
  popSel = true; renderRow1(); renderRow2(); popSel = false;
}
let popSel = false;                                            // the freshly chosen tab or tool pops
function togglePause() { paused = !paused; pauseBtn.textContent = paused ? '▶' : '⏸'; pauseBtn.classList.toggle('on', paused); }

let pauseBtn = null;
if (!editMode) pauseBtn = mkBtn(capL, '⏸', togglePause);
const speeds = [1, 3, 8];
const speedBtn = editMode ? null : mkBtn(capL, '1×', b => { speed = speeds[(speeds.indexOf(speed) + 1) % speeds.length]; b.textContent = speed + '×'; });
const handBtn = mkBtn(capR, '✋', () => selectTool(tool === 'hand' ? 'raise' : 'hand'));
mkBtn(zoomPill, '+', () => zoomBy(1.5));
mkBtn(zoomPill, '−', () => zoomBy(1/1.5));
if (!editMode) sndBtn = mkBtn(capR, '🔊', () => { sndInit(); sndResume(); setSound(!Snd.on); if (Snd.on) SFX.ui(); });
if (!editMode) {
  yearEl.title = 'Open the chronicle and goals'; yearEl.setAttribute('role', 'button'); yearEl.setAttribute('aria-label', yearEl.title); yearEl.tabIndex = 0;
  yearEl.addEventListener('click', () => showJournal('chronicle'));
  yearEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showJournal('chronicle'); } });
}

const csPrev = {};
let sheetOpen = false;
function csChip(key, ch, n) { const p = csPrev[key]; csPrev[key] = n; return `<span class="cs${p == null || p === n ? '' : n > p ? ' up' : ' dn'}">${ch}<b>${n}</b></span>`; }
function censusSheet() {
  const row = (ic, nm, n, mx) => `<div class="rw"><span>${ic}</span><span>${nm}</span><b>${n}</b><i><u style="width:${Math.round(100 * n / Math.max(1, mx))}%"></u></i></div>`;
  const grp = (title, rows) => { const mx = Math.max(1, ...rows.map(r => r[2])); return `<div class="grp"><h4>${title}</h4>${rows.map(r => row(r[0], r[1], r[2], mx)).join('')}</div>`; };
  let wars = 0; for (const r of rels.values()) if (r.s === 1) wars++;
  let sick = 0; for (const k of kingdoms.values()) if (k.ev && k.ev.type === 'plague') sick++;
  return `<div class="sh"><span>Census</span><button class="awb" data-act="shclose" aria-label="Close">✖</button></div><div class="grid">`
    + grp('Civilizations', [['human', 'Humans'], ['elf', 'Elves'], ['dwarf', 'Dwarves'], ['orc', 'Orcs'], ['werewolf', 'Werewolves']].map(([r, n]) => [EMOJI[r], n, counts[r] || 0]))
    + grp('Wildlife', [['sheep', 'Sheep'], ['rabbit', 'Rabbits'], ['deer', 'Deer'], ['wolf', 'Wolves']].map(([r, n]) => [EMOJI[r], n, counts[r] || 0]))
    + grp('Sea life', [['🐟', 'Fish shoals', shoals.length], ['🦈', 'Sharks', sharks.length], ['🐙', 'Krakens', krakens.length]])
    + grp('Realm', [['🏰', 'Kingdoms', kingdoms.size], ['🏠', 'Houses', houseCount], ['⚔️', 'Wars', wars], ['☠️', 'Plague', sick]])
    + '</div>';
}
function setSheet(open) {
  sheetOpen = open && !editMode; sheetEl.style.display = sheetBg.style.display = sheetOpen ? 'block' : 'none'; censusEl.classList.toggle('open', sheetOpen);
  if (sheetOpen) { closeCreature(); infoEl.style.display = 'none'; sheetEl.innerHTML = censusSheet(); }
}
censusEl.addEventListener('click', () => setSheet(!sheetOpen));
sheetBg.addEventListener('click', () => setSheet(false));
sheetEl.addEventListener('click', e => { if (e.target.closest('[data-act="shclose"]')) setSheet(false); });
function updateStats() {
  if (editMode) { yearEl.textContent = '✏️'; }
  else {
    yearEl.innerHTML = `<span>${W_ICON[weather.kind]}</span><span class="sep"></span><span class="st"><small>YEAR</small><b>${Math.floor(tick / 120)}</b></span><span class="sep"></span><span>📜</span>`;
    let pop = 0; for (const r of ['human', 'elf', 'dwarf', 'orc', 'werewolf']) pop += counts[r] || 0;
    let wars = 0; for (const r of rels.values()) if (r.s === 1) wars++;
    let sick = 0; for (const k of kingdoms.values()) if (k.ev && k.ev.type === 'plague') sick++;
    censusEl.innerHTML = csChip('pop', '👥', pop) + csChip('kg', '🏰', kingdoms.size) + csChip('hs', '🏠', houseCount) + csChip('wr', '⚔️', wars) + (sick ? csChip('pl', '☠️', sick) : '') + '<span class="cs more"></span>';
    if (sheetOpen) sheetEl.innerHTML = censusSheet();
  }
  refreshAlerts();
  checkObjectives(); refreshGoalsPanel();
}

/* ============================== MINIMAP + ALERT BADGES ============================== */
function jumpTo(x, y, minSc, quiet) {                          // centre the camera on a tile (optionally zooming in a little)
  if (minSc && sc < minSc) sc = minSc;
  ox = VIEW.x + VIEW.w / 2 - (x + .5) * sc; oy = VIEW.y + VIEW.h / 2 - (y + .5) * sc; clampCam();
  if (!quiet) fx('bless', Math.round(x), Math.round(y));
}
const mmWrap = el('div', 'awmm'), mmCv = document.createElement('canvas'), mmBase = document.createElement('canvas');
mmWrap.appendChild(mmCv);
let mmOpen = true, mmBaseF = -1e9, mmW = 0, mmH = 0, mmDown = false;
const mmTog = mkBtn(mmWrap, '🗺️', () => { mmOpen = !mmOpen; mmWrap.classList.toggle('shut', !mmOpen); mmBaseF = -1e9; });
mmTog.classList.add('mmt'); mmTog.setAttribute('aria-label', 'Toggle minimap');
const mmGo = e => { const r = mmCv.getBoundingClientRect(); jumpTo(Math.max(0, Math.min(W - 1, (e.clientX - r.left) / r.width * W)), Math.max(0, Math.min(H - 1, (e.clientY - r.top) / r.height * H)), 0, true); };
mmCv.addEventListener('pointerdown', e => { mmDown = true; try { mmCv.setPointerCapture(e.pointerId); } catch (x) {} mmGo(e); e.stopPropagation(); });
mmCv.addEventListener('pointermove', e => { if (mmDown) mmGo(e); });
mmCv.addEventListener('pointerup', () => { mmDown = false; }); mmCv.addEventListener('pointercancel', () => { mmDown = false; });
function mmTick() {
  if (!mmOpen || frame % 6) return;
  if (mmW !== W || mmH !== H) { mmW = W; mmH = H; mmBase.width = mmCv.width = W; mmBase.height = mmCv.height = H; const k = Math.min(168 / W, 168 / H); mmCv.style.width = Math.round(W * k) + 'px'; mmCv.style.height = Math.round(H * k) + 'px'; mmBaseF = -1e9; }
  if (frame - mmBaseF > 120) {                                 // terrain bitmap, refreshed every couple of seconds
    mmBaseF = frame; const bx = mmBase.getContext('2d'), im = bx.createImageData(W, H), d = im.data, wOK = shoreD.length === N;
    for (let i = 0; i < N; i++) {
      const t = tiles[i]; let r, g, b;
      if (t <= 1 && wOK) { const dd = shoreD[i], di = t === 1 ? (dd > 4 ? 4 : dd) : (dd < 5 ? 5 : dd > 30 ? 30 : dd); r = WR[di * 3]; g = WR[di * 3 + 1]; b = WR[di * 3 + 2]; }
      else { const c = COL[t]; r = c[0]; g = c[1]; b = c[2]; }
      const k = i * 4; d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255;
    }
    bx.putImageData(im, 0, 0);
  }
  const c2 = mmCv.getContext('2d'), u = Math.max(1, W / 168);
  c2.drawImage(mmBase, 0, 0);
  for (const k of kingdoms.values()) { const col = BORDER_RGB[RACES[k.race].bi] || [255, 255, 255], z = u * (1.4 + k.level * .5); c2.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; c2.fillRect(k.cx - z / 2, k.cy - z / 2, z, z); c2.strokeStyle = 'rgba(0,0,0,.7)'; c2.lineWidth = u * .5; c2.strokeRect(k.cx - z / 2, k.cy - z / 2, z, z); }
  c2.fillStyle = '#fff'; for (const s of ships) c2.fillRect(s.x - u * .5, s.y - u * .5, u * 1.2, u * 1.2);
  c2.fillStyle = '#ff4a4a'; for (const k of krakens) { const z = u * (2 + Math.sin(frame * .2)); c2.fillRect(k.x - z / 2, k.y - z / 2, z, z); }
  const vx = (VIEW.x - ox) / sc, vy = (VIEW.y - oy) / sc, vw = VIEW.w / sc, vh = VIEW.h / sc;
  c2.strokeStyle = '#fff'; c2.lineWidth = u * 1.3; c2.strokeRect(Math.max(0, vx), Math.max(0, vy), Math.min(W, vw) - 0, Math.min(H, vh) - 0);
}
function alertList() {                                         // threats worth jumping to: wars, plague, a kraken, an erupting volcano
  const L = [], wars = [], sick = [];
  for (const [key, r] of rels) if (r.s === 1) { const a = kingdoms.get(Math.floor(key / 65536)), b = kingdoms.get(key % 65536); if (a && b) wars.push([((a.cap % W) + (b.cap % W)) / 2, (((a.cap / W) | 0) + ((b.cap / W) | 0)) / 2]); }
  if (wars.length) L.push({ k: 'war', ic: '⚔️', pts: wars });
  for (const k of kingdoms.values()) if (k.ev && k.ev.type === 'plague') sick.push([k.cx, k.cy]);
  if (sick.length) L.push({ k: 'plague', ic: '☠️', pts: sick });
  const kr = krakens.filter(k => k.st !== 2).map(k => [k.x, k.y]); if (kr.length) L.push({ k: 'kraken', ic: '🐙', pts: kr });
  const vo = volcanoes.filter(v => tick - v.er < 700).map(v => [v.x, v.y]); if (vo.length) L.push({ k: 'volcano', ic: '🌋', pts: vo });
  return L;
}
const alertsEl = el('div', 'awalerts'); let alertKey = '';
const alertIdx = {};
alertsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-al]'); if (!b) return;
  const cur = alertList().find(a => a.k === b.dataset.al); if (!cur) return;
  const i = (alertIdx[cur.k] || 0) % cur.pts.length; alertIdx[cur.k] = i + 1; jumpTo(cur.pts[i][0], cur.pts[i][1], 14);
});
function refreshAlerts() {
  if (editMode) return;
  const L = alertList(), key = L.map(a => a.k + a.pts.length).join(',');
  if (key === alertKey) return; alertKey = key;
  alertsEl.innerHTML = L.map(a => `<button class="al ${a.k}" data-al="${a.k}" aria-label="Jump to ${a.k}">${a.ic}${a.pts.length > 1 ? `<b>${a.pts.length}</b>` : ''}</button>`).join('');
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
  return { v: 8, z: sizeIdx, seed: currentSeed, xr: [...extinctRaces], jl: chronicle.map(e => [e.tick, e.icon, e.text]), go: [...completedGoals], wf: warsResolved, tiles: rleEncode(), bld: bl, bk, tick, bs: bestSent, dl: disasterLvl, sn: Snd.on ? 1 : 0, tu: tutSeen ? 1 : 0, mk: COMM.map(c => +market.p[c].toFixed(2)), mt: market.trades, mf: [+market.p.fin.toFixed(2), +market.p.hide.toFixed(2)], sv: seenVer, wk: wrecks.map(w => [w.x, w.y, kix.get(w.kid) || 0, tick - w.t0, w.why === 'kraken' ? 2 : w.why === 'shark' ? 1 : 0]), rs: nodes.filter(i => oreT[i]).map(i => i * 8 + oreT[i]), ra: nodes.filter(i => oreT[i]).map(i => oreA[i]),
    rl: [...rels].map(([key, r]) => [kix.get(Math.floor(key / 65536)) || 0, kix.get(key % 65536) || 0, r.s, r.t, r.until]).filter(x => x[0] && x[1]),
    kg: kl.map(k => [RACES[k.race].bi, Math.round(k.cx), Math.round(k.cy), k.level, k.food | 0, k.wood | 0, k.stone | 0, k.gold | 0, k.born, k.name, k.tech.length, k.ev ? EV_ID.indexOf(k.ev.type) : 0, k.ev ? k.ev.left : 0, Math.round(k.unrest), Math.max(0, k.immune - tick), k.silver | 0, k.bronze | 0, k.iron | 0, k.age | 0, k.chest.map(i => [i[0], i[1], RN.indexOf(i[2]), i[3] | 0]), Math.max(0, (k.voyageCd || 0) - tick), k.fin | 0, k.hide | 0]),
    cr: creatures.filter(c => !RACES[c.t].engine).map(c => { const s = c.boat ? ships.find(v => v.id === c.boat) : null, i = s ? s.sourceLand : c.y * W + c.x; return i * 10 + RN.indexOf(c.t); }),
    el: creatures.filter(c => !RACES[c.t].engine).reduce((a, c, j) => { if (c.elite) a.push(j); return a; }, []),
    ex: creatures.filter(c => !RACES[c.t].engine).reduce((a, c, j) => { if (RACES[c.t].civ) a.push([j, c.nid | 0, c.tr | 0, tick - c.age, c.kills | 0, c.eq ? c.eq[0] | c.eq[1] << 2 | c.eq[2] << 4 : 0, c.hist || [], c.pa | 0, c.pb | 0, c.sp | 0, c.ch | 0, c.ec ? c.ec[0] | c.ec[1] << 4 | c.ec[2] << 8 : 0, c.boat | 0]); return a; }, []),
    inv: inv.map(i => [i[0], i[1], RN.indexOf(i[2]), i[3] | 0]),
    vc: volcanoes.map(v => v.i),
    dr: drops.map(d => [d.x, d.y, d.s, d.t, RN.indexOf(d.r), tick - d.b, d.e | 0]),
    sh: shoals.map(v => [Math.round(v.x), Math.round(v.y), v.kind, Math.round(v.stock * 100)]), st: shoalTarget, sk: sharks.map(v => [Math.round(v.x), Math.round(v.y), Math.round(v.hp)]), skt: sharkTarget, kr: krakens.map(k => [Math.round(k.x), Math.round(k.y), Math.round(k.hp), k.st, k.t, k.life, k.manual ? 1 : 0, k.kills]), krc: krakenCd,
    sf: ships.map(s => [s.id, s.race, kix.get(s.kingdomId) || 0, s.x, s.y, s.path, s.step, s.move, s.phase, s.sourceLand, s.targetLand, s.targetComp, s.crew, s.landed | 0, s.wreckAt | 0, s.fishTimer | 0]) };      // one packed int per creature
}
const LEGACY_TEXT = [                                           // chronicle lines saved by older versions were written in Indonesian: show them in English
  [/^(.+) bergabung dengan (.+)$/, '$1 joined $2'], [/^(.+) ikut berperang melawan (.+)$/, '$1 joined the war against $2'], [/^(.+) menyatakan perang terhadap (.+)$/, '$1 declared war on $2'],
  [/^(.+) runtuh dalam perang$/, '$1 collapsed in the war'], [/^(.+) punah dalam perang$/, '$1 went extinct in the war'], [/^(.+) dan (.+) berdamai setelah perang$/, '$1 and $2 made peace after the war'],
  [/^(.+) memasuki Era Penjelajahan$/, '$1 entered the Age of Exploration'], [/^(.+) memberangkatkan kapal penjelajah$/, '$1 sent out an exploration ship'],
  [/^(.+) tidak menemukan pantai kosong; kapalnya menjadi kapal nelayan$/, '$1 found no empty shore, so its ship became a fishing boat'], [/^(.+) mendirikan koloni di pulau baru$/, '$1 founded a colony on a new island'],
  [/^Kapal nelayan (.*) karam; awaknya hilang$/, 'Fishing boat of $1 was lost at sea; its crew is gone'], [/^Kapal penjelajah (.*) karam; awaknya hilang$/, 'Exploration ship of $1 was lost at sea; its crew is gone'],
  [/^(.+) mulai mencari ikan di laut$/, '$1 began fishing at sea'], [/^(.+) membawa pulang hasil tangkapan$/, '$1 brought home a catch'], [/^(.+) menjadi pemimpin (.+)$/, '$1 became leader of $2'],
  [/^(.+) runtuh karena tidak memiliki permukiman$/, '$1 collapsed because it had no settlements'], [/^Wabah melanda (.+)$/, 'Plague struck $1'], [/^Kekeringan melanda (.+)$/, 'Drought struck $1'], [/^Zaman Kejayaan melanda (.+)$/, 'Golden age struck $1'],
  [/^Sambaran petir menghantam pulau$/, 'Lightning struck the island'], [/^Meteor menghantam pulau$/, 'A meteor struck the island'], [/^Gunung berapi meletus$/, 'A volcano erupted'], [/^Gempa mengguncang pulau$/, 'An earthquake shook the island'], [/^Gelombang banjir menyapu pesisir$/, 'A flood surged along the coast'],
  [/^Tujuan tercapai: Dunia berkembang$/, 'Goal reached: World grows'], [/^Tujuan tercapai: Kerajaan maju$/, 'Goal reached: Realm advances'], [/^Tujuan tercapai: Akhir konflik$/, 'Goal reached: End of conflict'],
];
const legacyText = t => { for (const [re, to] of LEGACY_TEXT) if (re.test(t)) return t.replace(re, to); return t; };
function restore(s) {
  if (!s || !(s.v >= 1 && s.v <= 8)) return false;
  ships = []; nextShipId = 1;
  setSize(s.v === 1 ? 0 : s.z);                                                 // v1 saves were always the small map
  if (!rleDecode(s.tiles)) return false;
  extinctRaces.clear(); for (const r of s.xr || []) if (['human','elf','dwarf','orc','werewolf'].includes(r)) extinctRaces.add(r);
  chronicle.length = 0; for (const e of s.jl || []) if (Array.isArray(e) && e.length >= 3) chronicle.push({ tick: Math.max(0, e[0] | 0), icon: String(e[1]), text: legacyText(String(e[2])) }); chronicle.length = Math.min(chronicle.length, CHRONICLE_MAX);
  completedGoals.clear(); for (const id of s.go || []) if (OBJECTIVES.some(g => g.id === id)) completedGoals.add(id); warsResolved = Math.max(0, s.wf | 0);
  currentSeed = s.seed || 0; tick = s.tick || 0; bestSent = s.bs || 0; disasterLvl = s.dl == null ? 1 : s.dl; pendingDis.length = 0; floods.length = 0; Snd.on = s.sn !== 0; tutSeen = !!s.tu;
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
    k.chest = (a[19] || []).filter(i => RN[i[2]]).map(i => [i[0], i[1], RN[i[2]], i[3] | 0]); k.voyageCd = tick + (a[20] || 0); k.fin = a[21] | 0; k.hide = a[22] | 0;
    ids.push(k.id);
  }
  if (s.rs) { nodes = []; s.rs.forEach((v, j) => { const i = v >> 3, t = v & 7; if (i < N && t >= 1 && t <= 5 && !oreT[i]) { oreT[i] = t; oreA[i] = (s.ra && s.ra[j]) || ORE_AMT[t]; nodes.push(i); } }); }
  else seedResources();
  if (s.sh) { computeShoreD(); shoals = s.sh.filter(v => shoalOk(v[2], v[0], v[1])).map(v => ({ x: v[0], y: v[1], kind: v[2], stock: Math.max(.15, (v[3] || 80) / 100), tx: v[0], ty: v[1], hd: 1, ph: ri(0, 63) })); shoalTarget = s.st || [0, 0, 0]; } else seedShoals();
  if (s.sk) { sharks = s.sk.filter(v => sharkOk(v[0], v[1])).map(v => ({ id: nextSharkId++, x: v[0], y: v[1], tx: v[0], ty: v[1], hd: 1, hp: v[2] || SHARK_HP, cd: 0, fl: 0, mode: 0, ph: ri(0, 63) })); sharkTarget = s.skt || 0; } else seedSharks();
  krakens = (s.kr || []).map(v => ({ id: nextKrakenId++, x: v[0], y: v[1], tx: v[0], ty: v[1], hd: 1, hp: v[2], st: v[3], t: v[4], life: v[5], manual: !!v[6], kills: v[7] || 0, cd: 120, atk: null, dock: !!v[6] || Math.random() < .6, ph: ri(0, 63) })).filter(k => krakenOk(Math.round(k.x), Math.round(k.y))); if (s.krc != null) krakenCd = s.krc;
  waterDirty = true;
  volcanoes.length = 0; if (s.vc) { for (const i of s.vc) if (i < N) volcanoes.push({ i, x: i % W, y: (i / W) | 0, er: -1e9 }); } else seedVolcanoes();
  for (const [ia, ib, st, t0, un] of s.rl || []) { const ka = ids[ia - 1], kb = ids[ib - 1]; if (ka && kb) rels.set(rkey(ka, kb), { s: st, t: t0, until: un }); }
  rebuildRelations();
  if (s.bk) hl.forEach((i, j) => { if (i >= 0) kid[i] = ids[(s.bk[j] || 0) - 1] || 0; });      // 0 -> the next tick founds/joins one
  const spawned = [];
  if (s.mk) COMM.forEach((c, j) => { if (s.mk[j]) market.p[c] = s.mk[j]; });
  market.trades = s.mt || 0; if (s.mf) { market.p.fin = s.mf[0] || 7; market.p.hide = s.mf[1] || 10; } seenVer = s.sv || '';
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
    c.life = Math.round(ri(R.life[0], R.life[1]) * (c.tr & 8 ? 1.3 : 1)); c.age = Math.max(0, Math.min(c.life - 50, tick - r[3])); c.boat = r[12] | 0;
  }
  for (const v of s.sf || []) {
    const race = v[1], path = Array.isArray(v[5]) ? v[5].filter(i => Number.isInteger(i) && i >= 0 && i < N) : [];
    if (!RACES[race] || !RACES[race].civ || extinctRaces.has(race) || path.length < 2 || path.some(i => tiles[i] > T.SHALLOW) || !['outbound','return','fishing_outbound','fishing','fishing_return'].includes(v[8])) continue;
    const id = v[0] | 0, ship = { id, race, kingdomId: ids[(v[2] | 0) - 1] || 0, x: +v[3], y: +v[4], path, step: Math.max(0, Math.min(path.length-1, v[6] | 0)), move: Math.max(0, Math.min(.99, +v[7] || 0)), phase: v[8], sourceLand: v[9] | 0, targetLand: v[10] | 0, targetComp: v[11] | 0, crew: Array.isArray(v[12]) ? v[12].map(n => n | 0) : [], landed: v[13] | 0, wreckAt: v[14] | 0, fishTimer: Math.max(0, v[15] | 0) };
    ships.push(ship); nextShipId = Math.max(nextShipId, id + 1);
  }
  wrecks = (s.wk || []).filter(v => inb(v[0], v[1]) && tiles[v[0] + v[1]*W] <= T.SHALLOW).map(v => { const kid = ids[(v[2] | 0) - 1] || 0, kg = kingdoms.get(kid); return { x: v[0], y: v[1], kid, race: kg ? kg.race : 'human', t0: tick - (v[3] | 0), why: ['storm', 'shark', 'kraken'][v[4] | 0] || 'storm' }; });
  const liveShips = new Map(ships.map(s => [s.id, s]));
  for (const c of spawned) if (c && c.boat) {
    const ship = liveShips.get(c.boat);
    if (!ship) c.boat = 0;
    else { c.x = c.dx = Math.round(ship.x); c.y = c.dy = Math.round(ship.y); }
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
  if (!started) { rafId = requestAnimationFrame(loop); return; }                       // title screen: the world waits
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
  if (now - statT > 250) { statT = now; updateStats(); refreshCreature(); if (Snd.ctx) sndAmbient(fireView); }
  if (now - saveT > 15000) { saveT = now; autosave(); }
  if (!editMode && tick > 1200 && now - lbT > 60000) { lbT = now; if (civScore() > bestSent * 1.1) submitScore(false); }
  rafId = requestAnimationFrame(loop);
}

/* ============================== START ============================== */
/* ============================== TITLE SCREEN + FIRST-RUN TOUR ============================== */
const titleEl = el('div', 'awtitle'), tutEl = el('div', 'awtut');
titleEl.style.display = 'none';
const loadEl = el('div', 'awload');
loadEl.innerHTML = '<div class="ldorb"><b>🌍</b><i>⛵</i></div><div class="ldname">ASTRO WORLD</div><div class="ldbar"><i></i></div><div class="ldtext">Preparing the world…</div>';
if (editMode) loadEl.style.display = 'none';
function coverUrl() { try { const a = lib.getAsset && lib.getAsset('cover'); return a && a.url; } catch (e) { return null; } }
/* Main-menu diorama: a living night scene (moon, stars, volcano island with a lit village, sailing ship, birds). Drawn at 360x640 and scaled 2x, pixel-crisp. */
function titleScene(cv2) {
  const W2 = 360, H2 = 640, HOR = 322, BASE = 342, c = cv2.getContext('2d'); cv2.width = W2; cv2.height = H2;
  let sd = 11; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 120 }, () => ({ x: R() * W2, y: R() * HOR * .86, p: R() * 6.28, sp: .5 + R() * 1.8, b: R() < .14 }));
  const clouds = Array.from({ length: 8 }, () => ({ x: R() * W2, y: 60 + R() * 250, w: 46 + R() * 80, sp: .04 + R() * .1, a: .1 + R() * .18, k: R() }));
  const birds = Array.from({ length: 5 }, (_, i) => ({ x: -40 - i * 26, y: 150 + R() * 70 + i * 6, sp: .3 + R() * .12, p: R() * 6 }));
  // ---- island (pre-rendered side view) ----
  const IW = 360, IH = 150, isl = document.createElement('canvas'); isl.width = IW; isl.height = IH; const g = isl.getContext('2d');
  const cx = 168, hw = 150, VX = 214, VH = 96, top = new Float32Array(IW).fill(IH);
  const hash = x => { const t = Math.sin(x * 12.9898 + 4.1) * 43758.5453; return t - Math.floor(t); };
  const noise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
  for (let x = 0; x < IW; x++) {
    const d = Math.abs(x - cx) / hw; if (d >= 1) continue;
    let h = Math.pow(1 - d * d, .8) * 34 + noise(x / 9) * 10 + noise(x / 3.2) * 3;
    const dv = Math.abs(x - VX); if (dv < 58) h += Math.pow(1 - dv / 58, 1.55) * (VH - 34);
    top[x] = IH - 18 - h;
  }
    for (let x = 0; x < IW; x++) {
    if (top[x] >= IH) continue; const y0 = Math.round(top[x]), h = IH - 18 - y0, dv = Math.abs(x - VX), rock = dv < 40 && h > 46;
    for (let y = y0; y < IH - 8; y++) {
      const dep = y - y0; let col;
      if (rock) col = dep < 2 ? (h > 88 ? '#e8e2d6' : '#8a8294') : dep < 9 ? '#5a5066' : dep < 26 ? '#463c52' : '#35293f';
      else if (h < 5) col = dep < 3 ? '#e8d28a' : '#c7a85a';
      else col = dep < 1 ? '#a6e060' : dep < 3 ? '#5fb83c' : dep < 7 ? '#4a8f34' : dep < 20 ? '#7a5a38' : '#5a4230';
      if (((x * 7 + y * 13) % 11 === 0) && dep > 3) col = '#00000022';
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    g.fillStyle = 'rgba(0,0,0,.18)'; if (x > VX + 4 && x < VX + 56 && h > 20) g.fillRect(x, y0 + 1, 1, Math.min(18, h - 3));   // shaded east flank
  }
  const cy = Math.round(top[VX]); g.fillStyle = '#2a1c30'; g.fillRect(VX - 7, cy, 15, 2); g.fillStyle = '#ff8a2a'; g.fillRect(VX - 5, cy + 1, 11, 2); g.fillStyle = '#ffd24a'; g.fillRect(VX - 3, cy + 1, 7, 1);
  for (let k = 0; k < 3; k++) { const lx = VX + (k - 1) * 3, ly0 = cy + 3; for (let y = 0; y < 26 + k * 6; y++) { g.fillStyle = (y % 5 < 3) ? '#ff7a1c' : '#ff4a14'; g.fillRect(lx + Math.round(Math.sin(y * .5 + k * 2) * 1.5) + (k - 1) * Math.floor(y / 5), ly0 + y, 1, 1); } }
  const trees = [], lights = [];
  for (let x = 14; x < IW - 14; x += 5 + Math.floor(R() * 4)) {
    const y0 = Math.round(top[x]), h = IH - 18 - y0; if (top[x] >= IH || h < 4 || Math.abs(x - VX) < 38 && h > 40 || (x > 70 && x < 128)) continue;
    if (h < 9) { g.fillStyle = '#6a4a28'; g.fillRect(x, y0 - 8, 1, 8); g.fillStyle = '#3fae5a'; g.fillRect(x - 3, y0 - 9, 7, 1); g.fillRect(x - 2, y0 - 10, 5, 1); g.fillRect(x - 1, y0 - 11, 3, 1); continue; }
    const th = 8 + Math.floor(R() * 6), pine = R() < .55;
    g.fillStyle = '#4a2f1c'; g.fillRect(x, y0 - 3, 1, 3);
    for (let r = 0; r < th; r++) { const w = pine ? Math.min(7, 1 + Math.floor(r * .9)) : Math.round(Math.sqrt(Math.max(0, 25 - (r - th * .5) ** 2) * .6)) + 1; g.fillStyle = r % 3 === 0 ? '#2e7a38' : '#3a9a44'; g.fillRect(x - Math.floor(w / 2), y0 - 3 - th + r + 1, w, 1); }
    trees.push(x);
  }
  for (const hx of [82, 94, 106, 118]) {                                     // village on the western slope
    const y0 = Math.round(top[hx]), w = 8;
    g.fillStyle = '#e8d6b0'; g.fillRect(hx, y0 - 6, w, 6); g.fillStyle = '#b84a3a'; for (let r = 0; r < 4; r++) g.fillRect(hx - 1 + r, y0 - 10 + r, w + 2 - r * 2, 1);
    g.fillStyle = '#7a4a28'; g.fillRect(hx + 3, y0 - 3, 2, 3); g.fillStyle = '#ffd86a'; g.fillRect(hx + 1, y0 - 5, 2, 2); lights.push([hx + 1, y0 - 5 + 190 - IH]);
  }
  g.fillStyle = '#5a3a1e'; for (let x = 38; x < 66; x++) if (x % 3 === 0) g.fillRect(x, IH - 14, 1, 6); g.fillRect(38, IH - 15, 28, 1);   // pier
  const wallY = Math.round(top[132]); g.fillStyle = '#9a9aa8'; g.fillRect(126, wallY - 5, 14, 5); for (let x = 126; x < 140; x += 3) g.fillRect(x, wallY - 7, 2, 2); g.fillStyle = '#b84a3a'; g.fillRect(131, wallY - 12, 4, 7); g.fillRect(132, wallY - 14, 2, 2);
  const IX = (W2 - IW) / 2 + 6, IY = BASE - IH + 8;
  const smoke = [], embers = []; let shoot = null;
  return function draw(t) {
    const sky = c.createLinearGradient(0, 0, 0, HOR); sky.addColorStop(0, '#070a24'); sky.addColorStop(.45, '#1a1650'); sky.addColorStop(.78, '#5a2a6a'); sky.addColorStop(1, '#e8703a');
    c.fillStyle = sky; c.fillRect(0, 0, W2, HOR + 1);
    for (const s of stars) { const a = .35 + .65 * Math.abs(Math.sin(t * s.sp + s.p)); c.globalAlpha = a * (s.y > HOR * .6 ? .4 : 1); c.fillStyle = s.b ? '#cfe6ff' : '#ffffff'; c.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1); if (s.b && a > .85) { c.fillRect(Math.floor(s.x) - 1, Math.floor(s.y), 3, 1); c.fillRect(Math.floor(s.x), Math.floor(s.y) - 1, 1, 3); } }
    c.globalAlpha = 1;
    if (!shoot && R() < .004) shoot = { x: 40 + R() * 200, y: 20 + R() * 80, l: 0 };
    if (shoot) { shoot.l += 1; for (let i = 0; i < 14; i++) { c.globalAlpha = (1 - i / 14) * (1 - shoot.l / 40); c.fillStyle = '#fff'; c.fillRect(Math.floor(shoot.x + shoot.l * 3 - i * 2), Math.floor(shoot.y + shoot.l * 1.4 - i), 1, 1); } c.globalAlpha = 1; if (shoot.l > 40) shoot = null; }
    const mx = 292, my = 214, mr = 24, mg = c.createRadialGradient(mx, my, mr * .6, mx, my, mr * 3.4); mg.addColorStop(0, 'rgba(255,236,190,.34)'); mg.addColorStop(1, 'rgba(255,236,190,0)'); c.fillStyle = mg; c.fillRect(mx - 90, my - 90, 180, 180);
    c.fillStyle = '#fff1cc'; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill(); c.fillStyle = '#e6d3a2'; for (const q of [[-8, -6, 5], [6, 4, 7], [-4, 10, 4], [10, -10, 3]]) { c.beginPath(); c.arc(mx + q[0], my + q[1], q[2], 0, 7); c.fill(); }
    c.fillStyle = 'rgba(40,30,90,.35)'; c.beginPath(); c.arc(mx + 8, my - 3, mr - 1, 0, 7); c.fill();
    for (const cl of clouds) {
      const x = ((cl.x + t * cl.sp * 60) % (W2 + 140)) - 70; c.globalAlpha = cl.a; c.fillStyle = cl.y > 250 ? '#ffb88a' : '#9aa6ff';
      for (let r = 0; r < 4; r++) c.fillRect(Math.floor(x + r * 4), Math.floor(cl.y + r * 3), Math.floor(cl.w - r * 8), 3);
      c.fillRect(Math.floor(x + cl.w * .2), Math.floor(cl.y - 3), Math.floor(cl.w * .36), 3);
    }
    c.globalAlpha = 1;
    for (const b of birds) { b.x += b.sp; if (b.x > W2 + 30) b.x = -40; const fl = Math.sin(t * 6 + b.p) > 0 ? 1 : -1, bx = Math.floor(b.x), by = Math.floor(b.y + Math.sin(t + b.p) * 4); c.fillStyle = '#1a1030'; c.fillRect(bx, by, 2, 1); c.fillRect(bx - 2, by - fl, 2, 1); c.fillRect(bx + 2, by - fl, 2, 1); c.fillRect(bx - 3, by - fl * 2, 1, 1); c.fillRect(bx + 4, by - fl * 2, 1, 1); }
    // sea
    const sea = c.createLinearGradient(0, HOR, 0, H2); sea.addColorStop(0, '#d8603c'); sea.addColorStop(.05, '#5a3a8a'); sea.addColorStop(.2, '#1a2f78'); sea.addColorStop(1, '#070d2a'); c.fillStyle = sea; c.fillRect(0, HOR, W2, H2 - HOR);
    for (let y = HOR + 2; y < 480; y += 3) { const k = (y - HOR) / 100, w = 8 + k * 70 + Math.sin(t * 1.4 + y) * 10; c.fillStyle = `rgba(255,236,190,${Math.max(0, .5 - k * .45)})`; c.fillRect(Math.floor(mx - w / 2 + Math.sin(t * 2 + y * .7) * 5), y, Math.floor(w), 1); }
    for (let y = HOR + 6; y < 480; y += 5) for (let x = (y * 17) % 23; x < W2; x += 23) { const xx = (x + t * (4 + (y - HOR) * .12)) % (W2 + 20) - 10, a = .1 + .22 * Math.abs(Math.sin(t * 1.2 + x + y)); c.fillStyle = `rgba(190,220,255,${a})`; c.fillRect(Math.floor(xx), y, 6 + ((y - HOR) >> 4), 1); }
    // island glow + reflection
    const pulse = .7 + .3 * Math.sin(t * 2.4) + .12 * Math.sin(t * 7), vx = IX + VX, vy = IY + cy;
    const lg = c.createRadialGradient(vx, vy, 2, vx, vy, 95); lg.addColorStop(0, `rgba(255,150,50,${.5 * pulse})`); lg.addColorStop(1, 'rgba(255,100,30,0)'); c.fillStyle = lg; c.fillRect(vx - 100, vy - 100, 200, 220);
    c.save(); c.globalAlpha = .22; c.translate(0, 2 * BASE); c.scale(1, -1); c.drawImage(isl, IX, IY); c.restore();
    c.globalAlpha = .22; c.fillStyle = '#ff8a2a'; for (let i = 0; i < 6; i++) c.fillRect(Math.floor(vx - 3 + Math.sin(t * 3 + i) * 3), BASE + 4 + i * 4, 6 - i, 1); c.globalAlpha = 1;
    c.drawImage(isl, IX, IY);
    for (const l of lights) { const on = .6 + .4 * Math.sin(t * 3 + l[0] * 3); c.fillStyle = `rgba(255,214,110,${on})`; c.fillRect(IX + l[0], IY + l[1] - 190 + IH, 2, 2); c.fillStyle = `rgba(255,190,80,${on * .18})`; c.fillRect(IX + l[0] - 3, IY + l[1] - 190 + IH - 3, 8, 8); }
    if (Math.floor(t * 20) % 2 === 0 && R() < .8) smoke.push({ x: vx + (R() - .5) * 6, y: vy, vx: .08 + R() * .1, vy: -.25 - R() * .15, a: .55, r: 2 });
    if (R() < .35) embers.push({ x: vx + (R() - .5) * 8, y: vy, vx: (R() - .5) * .8, vy: -.6 - R() * .8, a: 1 });
    for (let i = smoke.length - 1; i >= 0; i--) { const p = smoke[i]; p.x += p.vx + Math.sin(t + p.y * .1) * .05; p.y += p.vy; p.a -= .0042; p.r += .03; if (p.a <= 0) { smoke.splice(i, 1); continue; } c.globalAlpha = p.a; c.fillStyle = p.a > .35 ? '#7a6a86' : '#4a4060'; c.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.r), Math.ceil(p.r)); }
    for (let i = embers.length - 1; i >= 0; i--) { const p = embers[i]; p.x += p.vx; p.y += p.vy; p.vy += .015; p.a -= .014; if (p.a <= 0) { embers.splice(i, 1); continue; } c.globalAlpha = p.a; c.fillStyle = p.a > .5 ? '#ffd24a' : '#ff6a1c'; c.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1); }
    c.globalAlpha = 1;
    // ship
    const sx = ((t * 7) % (W2 + 80)) - 40, sy = 368 + Math.sin(t * 1.6) * 1.6, tilt = Math.sin(t * 1.6 + 1) * .04;
    c.save(); c.translate(Math.floor(sx), Math.floor(sy)); c.rotate(tilt);
    c.fillStyle = '#5a3418'; c.fillRect(-9, 0, 18, 3); c.fillRect(-7, 3, 14, 1); c.fillStyle = '#8a5a2c'; c.fillRect(-9, 0, 18, 1); c.fillStyle = '#3a2210'; c.fillRect(7, -2, 3, 2);
    c.fillStyle = '#3a2210'; c.fillRect(0, -17, 1, 17); c.fillStyle = '#f4ecd8'; for (let r = 0; r < 13; r++) c.fillRect(1, -16 + r, Math.max(1, 8 - Math.floor(r * .35)), 1); c.fillStyle = '#d8c8a8'; for (let r = 0; r < 13; r++) c.fillRect(-7 + Math.floor(r * .15), -14 + r, 6 - Math.floor(r * .2), 1);
    c.fillStyle = '#e8344a'; c.fillRect(1, -20, 5, 3); c.restore();
    c.globalAlpha = .4; c.fillStyle = '#d8ecff'; for (let i = 1; i < 9; i++) c.fillRect(Math.floor(sx - 9 - i * 3 - Math.sin(t * 4 + i)), Math.floor(sy + 3 + (i % 2)), 4 - (i >> 2), 1); c.globalAlpha = 1;
    // horizon haze + vignette
    const hz = c.createLinearGradient(0, HOR - 28, 0, HOR + 8); hz.addColorStop(0, 'rgba(255,140,80,0)'); hz.addColorStop(.7, 'rgba(255,140,80,.14)'); hz.addColorStop(1, 'rgba(255,140,80,0)'); c.fillStyle = hz; c.fillRect(0, HOR - 28, W2, 36);
  };
}
/* ============================== WHAT'S NEW: version popup ============================== */
const VERSION = '2.0';
let seenVer = '', hadSave = false;
const whatsEl = el('div', 'awnew');
const NEWS = [
  ['🌊', 'A living ocean', [
    '<b>Fish shoals</b> drift through the sea: sardines near the shore, grouper on reefs, tuna in the deep. Fishers and boats depend on them, and overfishing scatters a shoal.',
    '<b>Sharks</b> patrol the deep, chase ships and bite far-out fishers.',
    '<b>The Kraken</b> is a rare deep-sea terror that drags ships under and smashes harbors. Summon it with the new Kraken power, or slay it with Smite, lightning and meteors.',
    'Tap any shoal, shark or kraken with <b>Inspect</b> for details. New <b>Fish</b> and <b>Shark</b> tools sit in the Life tab.']],
  ['⛵', 'Life at sea', [
    'Fishing boats now <b>spear fish</b> at their shoal for bigger hauls.',
    'Boats <b>harpoon sharks</b>. Shark fins and hide are sold at the market for gold, and prices move with supply.',
    'Sunken ships leave <b>wrecks</b>. Kingdoms salvage them on their own, or use the new <b>Salvage</b> power to raise one at once.']],
  ['✨', 'Premium ocean visuals', [
    'Depth layers from turquoise shallows to the dark abyss, with rolling swell, shimmering caustics, glints, breakers rolling onto the beach, ripples and whitecaps. Storms make the sea rougher.']],
  ['🏝️', 'Islands to found your civilization', [
    '<b>7 empty island seeds</b>: Indonesia (200+ islands, 16 lakes, 30 volcanoes), Japan, Caribbean, Hawaiian Chain, Aegean Isles, Coral Atolls and Arctic Isles.']],
  ['🎬', 'Menu and polish', [
    'A new animated main menu, and this What\'s New panel (tap ✨ on the menu to reopen it).']],
  ['📜', 'Also in this build', [
    'Weather, day and night, procedural sound and music, and a guided tour.',
    'Creature panel with traits, equipment, family, bag, loot, enchanted items, the royal chest and item sales.',
    'Resources and ages, trade caravans, iron knights, walls and gates, sieges and engines, and automatic disasters.',
    'Pixel-art HUD icons, one-finger panning and a full English translation.']],
];
function showWhatsNew() {
  if (editMode) return;
  whatsEl.innerHTML = '<div class="card"><div class="hd"><span class="chip">UPDATE ' + VERSION + '</span><h1>Living Seas</h1><p>The ocean comes alive, and so do the islands.</p></div><div class="bd">'
    + NEWS.map(s => `<div class="sec"><h3>${s[0]} ${s[1]}</h3><ul>${s[2].map(t => `<li>${t}</li>`).join('')}</ul></div>`).join('')
    + '</div><div class="ft"><button class="awbig" data-act="gotit">Let\'s go!</button></div></div>';
  whatsEl.style.display = 'flex'; whatsEl.querySelector('.bd').scrollTop = 0;
}
whatsEl.addEventListener('click', e => {
  if (!e.target.closest('[data-act="gotit"]')) return;
  sndInit(); sndResume(); whatsEl.style.display = 'none';
  if (seenVer !== VERSION) { seenVer = VERSION; if (hadSave) dirty = true; const nb = titleEl.querySelector('[data-act="news"]'); if (nb) nb.classList.remove('new'); }
  if (Snd.on) SFX.ui();
});
let titleRaf = 0;
function showTitle(hasSave) {
  if (editMode) return;
  titleEl.innerHTML = '<canvas class="scene"></canvas><div class="vig"></div>'
    + '<div class="logo"><div class="tag">A GOD-SIM SANDBOX</div><div class="l1">ASTRO</div><div class="l2">WORLD</div><div class="sub">Shape a world. Watch it live.</div></div>'
    + '<div class="menuPanel"><div class="races"><span>🧑</span><span>🧝</span><span>🧔</span><span>👹</span><span></span></div>'
    + '<div class="feat"><b>🏰 Kingdoms</b><b>⚔️ Wars</b><b>⛵ Voyages</b><b>🌋 Disasters</b></div>'
    + `<div class="tb"><button class="awbig" data-act="play">▶ ${hasSave ? 'Continue' : 'Play'}</button><div class="row2"><button class="awb" data-act="help">❓</button><button class="awb${seenVer !== VERSION ? ' new' : ''}" data-act="news">✨</button><button class="awb" data-act="snd">${Snd.on ? '🔊' : '🔇'}</button></div><div class="ver">PIXEL WORLD · ${SIZES.filter(z => z.preset && !z.preset.hidden).length} ISLAND SEEDS</div></div></div>`;
  titleEl.style.display = 'block'; titleEl.style.opacity = 1;
  const draw = titleScene(titleEl.querySelector('canvas')), t0 = performance.now();
  cancelAnimationFrame(titleRaf);
  const frame = () => { if (titleEl.style.display === 'none') return; draw((performance.now() - t0) / 1000); titleRaf = requestAnimationFrame(frame); };
  frame();
}
async function finishLoading(hasSave) {
  showTitle(hasSave);
  const remain = Math.max(0, 950 - (performance.now() - loadingStartedAt));
  if (remain) await new Promise(resolve => setTimeout(resolve, remain));
  loadEl.classList.add('fade');
  await new Promise(resolve => setTimeout(resolve, 430));
  loadEl.style.display = 'none';
  hadSave = !!hasSave; if (!editMode && seenVer !== VERSION) showWhatsNew();
}
titleEl.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  sndInit(); sndResume();
  if (a.dataset.act === 'play') {
    cv.style.visibility = 'visible'; started = true; lastT = performance.now(); titleEl.style.opacity = 0; setTimeout(() => { titleEl.style.display = 'none'; if (!tutSeen) startTour(); }, 480);
    if (Snd.on) SFX.fanfare(1);
  } else if (a.dataset.act === 'news') { showWhatsNew(); }
  else if (a.dataset.act === 'help') { startTour(true); }
  else if (a.dataset.act === 'snd') { setSound(!Snd.on); a.textContent = Snd.on ? '🔊' : '🔇'; if (Snd.on) SFX.ui(); }
});
const TOUR = [
  { r: [150, 420, 420, 330], t: 'Tap a creature or house to see its info', f: 'tap', y: 790 },
  { r: [150, 420, 420, 330], t: 'Drag with one finger to move the map. Hold briefly, then drag, to paint with the tool.', f: 'drag', y: 790 },
  { r: [18, 1068, 448, 92], t: 'Pick a tool category here: terrain, life, powers, realm, world', y: 820 },
  { r: [18, 1166, 664, 92], t: 'Scroll this row for more tools. The chosen tool is named just above the dock.', y: 820 },
  { r: [614, 180, 96, 184], t: 'Zoom the map in and out', y: 400 },
  { r: [4, 170, 196, 150], t: 'Minimap: tap or drag to jump anywhere. The corner button hides it.', f: 'tap', y: 420 },
  { r: [10, 6, 186, 96], t: 'Pause and speed up time', y: 230 },
  { r: [614, 6, 96, 96], t: 'Sound on or off', y: 230 },
  { r: [206, 6, 308, 96], t: 'Tap the year and weather badge for the world chronicle and optional goals', f: 'tap', y: 230 },
  { r: [10, 114, 700, 46], t: 'Key numbers at a glance. Tap the strip for the full census.', f: 'tap', y: 240 },
];
let tourI = 0;
function startTour(force) { if (editMode) return; tourI = 0; tutEl.style.display = 'block'; if (force) { cv.style.visibility = 'visible'; titleEl.style.display = 'none'; started = true; lastT = performance.now(); } renderTour(); }
function renderTour() {
  const st = TOUR[tourI], last = tourI === TOUR.length - 1, [x, y, w, h] = st.r;
  tutEl.innerHTML = `<div class="spot" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`
    + (st.f ? `<img class="fing ${st.f === 'tap' ? 'tap' : ''}" src="${iconURL('hand')}" style="left:${x + w / 2 - 38}px;top:${y + h / 2 - 20}px" alt="">` : '')
    + `<div class="bub" style="top:${st.y}px">${st.t}<div class="tbn"><button class="awb" data-act="skip">✖</button><button class="awb" data-act="next">${last ? '▶' : 'Next'}</button></div></div>`;
}
tutEl.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'next' && tourI < TOUR.length - 1) { tourI++; renderTour(); if (Snd.on) SFX.ui(); }
  else { tutEl.style.display = 'none'; if (!tutSeen) { tutSeen = true; dirty = true; } }
});
document.addEventListener('pointerdown', e => {
  if (editMode) return;
  sndInit(); sndResume();
  if (Snd.ctx && Snd.on && e.target.closest && e.target.closest('#aw button') && can('ui', 60)) SFX.ui();
}, true);
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
    if (!editMode) { seedResources(); seedVolcanoes(); seedShoals(); seedSharks(); if (!SIZES[sizeIdx].empty) populate(); }
  }
  counts = {}; for (const c of creatures) counts[c.t] = (counts[c.t]||0) + 1;
  startCamera(); renderRow1(); renderRow2(); updateStats();
  if (sndBtn) sndBtn.textContent = Snd.on ? '🔊' : '🔇';
  if (!editMode) await finishLoading(restored);
  if (lib.showGameParameters) {
    try {
      lib.showGameParameters({ name: 'Astro World', params: {
        'Day-night cycle': { key: 'settings.dayNight', type: 'checkbox' },
        'Starting population': { key: 'settings.population', type: 'slider', min: 0, max: 3, step: 0.5 },
        'Character Size': { key: 'settings.charSize', type: 'slider', min: CHAR_SIZE_MIN, max: CHAR_SIZE_MAX, step: 0.1 },
        'Shipwreck Risk (%)': { key: 'settings.shipwreckRisk', type: 'slider', min: 0, max: 10, step: 1 },
      } });
    } catch (e) {}
  }
  lastT = performance.now();
  rafId = requestAnimationFrame(loop);
}
start();

window.__world = { get ox() { return ox; }, get oy() { return oy; }, cam: (x, y, z) => { sc = z; ox = VIEW.x + VIEW.w/2 - (x + .5)*sc; oy = VIEW.y + VIEW.h/2 - (y + .5)*sc; clampCam(); }, get tiles() { return tiles; }, get comp() { return comp; }, get own() { return own; }, get bld() { return bld; }, get fire() { return fire; }, get size() { return sizeIdx; }, get evolutions() { return evolutions; }, get kingdoms() { return kingdoms; }, get effects() { return effects; }, get rels() { return rels; }, civScore, submitScore, get bestSent() { return bestSent; }, warStats, declareWar, splitKingdom, absorbKingdom, startEvent, eventsTick, get tickNow() { return tick; }, computeComps, diplomacyTick, grantTech, recalcMods, get kid() { return kid; }, get lastEvolve() { return lastEvolve; }, get tick() { return tick; }, get creatures() { return creatures; }, get counts() { return counts; }, step, spawn, newWorld, get W() { return W; }, get H() { return H; }, Snd, weather, SFX, tone, startTour, get started() { return started; }, set started(v) { started = v; }, volcanoes, parts, emit, seedVolcanoes, drops, addDrop, shop, shopTick, itemValue, rollEnchant, ENCH, get inv() { return inv; }, setFamily, get selected() { return selected; }, get following() { return following; }, market, tradeTick, eliteTick, updateMarket, serialize, restore, get ships() { return ships; }, get shoals() { return shoals; }, get sharks() { return sharks; }, get wrecks() { return wrecks; }, raiseWreck, harpoon, sellCatch, showWhatsNew, get seenVer() { return seenVer; }, VERSION, get krakens() { return krakens; }, summonKraken, krakenTick, krakenHit, get krakenCd() { return krakenCd; }, set krakenCd(v) { krakenCd = v; }, computeShoreD, addShark, seedSharks, sharkTick, seedShoals, fishingPlan, shoalNear, SHOAL, launchVoyage, voyageTick, coastalLandNear, voyagePlan, get techs() { return TECHS; }, get nodes() { return nodes; }, get oreT() { return oreT; }, get oreA() { return oreA; }, get wallK() { return wallK; }, get wallG() { return wallG; }, applyTool, floods, disasterTick, pendingDis, get nextMajor() { return nextMajor; }, set nextMajor(v) { nextMajor = v; }, get disasterLvl() { return disasterLvl; }, set disasterLvl(v) { disasterLvl = v; }, setTool: id => { tool = id; }, get W() { return W; }, get H() { return H; }, T };
}

// The platform boots the game by calling window.run(mode); publishing bundles
// game.js into an IIFE, so run must be assigned to window explicitly.
window.run = run;
