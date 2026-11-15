/*
 * Technology tree and ages — pure data and rules (no DOM / window / lib).
 *
 * Every race has 15 techs: three branches (E = Economy, M = Military, L = Lore) of five tiers.
 * Tier n opens in age n (1 Stone, 2 Bronze, 3 Iron, 4 Medieval, 5 Gunpowder) and needs the previous tier of the same branch.
 * Techs cost resources plus knowledge points (kp); kingdoms earn kp from their people and houses.
 * fx keys: food/wood/stone/gold/birth/atk/def/kp multiply; houses/radius add; range/night/loot/steal/regen/fire/farms/walls/grow are flags or maxima.
 */
export const BRANCHES = ['E', 'M', 'L'];
export const BRANCH_NAME = { E: 'Economy', M: 'Military', L: 'Lore' };
export const BRANCH_IC = { E: '🪙', M: '⚔️', L: '📖' };
export const TIER_KP = [60, 200, 700, 2400, 5000];                 // knowledge points a tier-n tech costs

export const AGES = [
  { id: 'stone',    name: 'Stone Age',    race: {} },
  { id: 'bronze',   name: 'Bronze Age',   race: {} },
  { id: 'iron',     name: 'Iron Age',     race: {} },
  { id: 'medieval', name: 'Medieval Age', race: { human: 'Feudal Age', elf: 'Arcane Age', dwarf: 'Rune Age', orc: 'Warlord Age', werewolf: 'Pack Age' } },
  { id: 'powder',   name: 'Gunpowder Age', race: { human: 'Age of Sail and Powder', elf: 'Starfire Age', dwarf: 'Steam Age', orc: 'Blackpowder Age', werewolf: 'Eclipse Age' } },
];
export function ageName(age, race) { const a = AGES[Math.max(0, Math.min(AGES.length - 1, age | 0))]; return a.race[race] || a.name; }

/** What it takes to advance from `age` to `age + 1` (null at the last age). */
export function ageNeed(age) {
  return [
    { lv: 1, cost: { bronze: 20 }, techs: 1 },
    { lv: 2, cost: { iron: 25 }, techs: 2 },
    { lv: 3, cost: { iron: 40, silver: 20, gold: 25 }, techs: 2 },
    { lv: 3, cost: { iron: 60, silver: 30, gold: 50 }, techs: 2 },
  ][age] || null;
}

const T = (id, br, tier, ic, n, lv, cost, fx, lm) => Object.assign({ id, br, tier, ic, n, lv, cost, fx }, lm ? { lm } : {});

export const TECHS = {
  human: [
    T('agri',    'E', 1, '🌾', 'Farming',        1, { wood: 30 }, { food: 1.4, birth: 1.1, farms: 1 }),
    T('trade',   'E', 2, '🪙', 'Trade',          2, { gold: 80, silver: 12 }, { gold: 2, food: 1.2, birth: 1.25 }),
    T('voyage',  'E', 3, '⛵', 'Ocean Voyages',  3, { wood: 90, gold: 30, iron: 12 }, {}, 'harbor'),
    T('bank',    'E', 4, '🏦', 'Banking',        3, { gold: 100, silver: 20 }, { gold: 1.8, food: 1.1 }),
    T('plant',   'E', 5, '🌿', 'Plantations',    3, { wood: 80, gold: 120 }, { food: 1.5, wood: 1.3, birth: 1.15 }),
    T('walls',   'M', 1, '🧱', 'Walls',          2, { stone: 60, wood: 30 }, { houses: 4, def: 1.25, radius: 2, walls: 1 }),
    T('phalanx', 'M', 2, '🛡', 'Phalanx',        2, { wood: 30, bronze: 10 }, { def: 1.15, atk: 1.1 }),
    T('knight',  'M', 3, '⚔️', 'Knighthood',     2, { gold: 40, stone: 50, iron: 12 }, { atk: 1.3, def: 1.3 }),
    T('castle',  'M', 4, '🏰', 'Castles',        3, { stone: 120, iron: 20 }, { def: 1.35, radius: 2, walls: 1 }),
    T('cannon',  'M', 5, '☄️', 'Cannons',        3, { iron: 40, gold: 60 }, { atk: 1.45, def: 1.15 }),
    T('write',   'L', 1, '📖', 'Writing',        1, { wood: 25 }, { gold: 1.1, kp: 1.25 }),
    T('math',    'L', 2, '🔬', 'Mathematics',    2, { gold: 30 }, { kp: 1.25, houses: 2 }),
    T('astro',   'L', 3, '⭐', 'Astronomy',      3, { gold: 40, silver: 10 }, { kp: 1.3, food: 1.1 }),
    T('univ',    'L', 4, '📖', 'Universities',   3, { gold: 90, silver: 20 }, { kp: 1.5, birth: 1.1 }),
    T('powder',  'L', 5, '☄️', 'Gunpowder',      3, { iron: 30, silver: 25 }, { atk: 1.2, kp: 1.2 }),
  ],
  elf: [
    T('forest',  'E', 1, '🌿', 'Living Forest',  1, { wood: 30 }, { wood: 1.3, food: 1.2, grow: 1 }),
    T('groves',  'E', 2, '🌳', 'Sacred Groves',  2, { wood: 60 }, { wood: 1.3, food: 1.15 }),
    T('voyage',  'E', 3, '⛵', 'Star Navigation', 3, { wood: 100, gold: 25, iron: 10, silver: 6 }, {}, 'harbor'),
    T('heart',   'E', 4, '🌲', 'Heartwood',      3, { wood: 120 }, { wood: 1.5, food: 1.2, grow: 1 }),
    T('worldtree', 'E', 5, '🌍', 'World Tree',   3, { wood: 150, gold: 80 }, { food: 1.5, birth: 1.4 }),
    T('archer',  'M', 1, '🏹', 'Archery',        1, { wood: 40, gold: 20, bronze: 8 }, { range: 3, atk: 1.1 }),
    T('ward',    'M', 2, '🔥', 'Fire Ward',      2, { wood: 60, stone: 20, silver: 8 }, { fire: 1, def: 1.15 }),
    T('longbow', 'M', 3, '🎯', 'Longbow Masters', 3, { wood: 70, iron: 10 }, { range: 4, atk: 1.2 }),
    T('moonblade', 'M', 4, '⚔️', 'Moonblades',    3, { iron: 20, silver: 15 }, { atk: 1.3, def: 1.2 }),
    T('starfire', 'M', 5, '✨', 'Starfire Arrows', 3, { iron: 30, silver: 30 }, { atk: 1.45, range: 5 }),
    T('starlore', 'L', 1, '⭐', 'Star Lore',     1, { wood: 25 }, { kp: 1.25, regen: .02 }),
    T('herbal',  'L', 2, '🌿', 'Herbalism',      2, { wood: 40, gold: 20 }, { birth: 1.15, regen: .03 }),
    T('treelife', 'L', 3, '🌳', 'Tree of Life',  3, { wood: 120, gold: 60 }, { regen: .08, birth: 1.3 }, 'lifetree'),
    T('arcane',  'L', 4, '🔮', 'Arcane Study',   3, { gold: 80, silver: 20 }, { kp: 1.5, regen: .05 }),
    T('ascend',  'L', 5, '🌙', 'Ascension',      3, { gold: 120, silver: 40 }, { kp: 1.4, regen: .1, def: 1.2 }),
  ],
  dwarf: [
    T('mining',  'E', 1, '⛏️', 'Mining',         1, { stone: 20 }, { stone: 2, gold: 1.5 }, 'mine'),
    T('vault',   'E', 2, '🏦', 'Vault',          2, { gold: 60, stone: 60, silver: 15 }, { gold: 2, houses: 4 }),
    T('voyage',  'E', 3, '⛵', 'Deep Keels',     3, { wood: 80, stone: 45, iron: 16 }, {}, 'harbor'),
    T('deepmine', 'E', 4, '🪨', 'Deep Mines',    3, { stone: 100, iron: 20 }, { stone: 1.8, gold: 1.4 }),
    T('steamworks', 'E', 5, '🔨', 'Steamworks',   3, { gold: 120, iron: 40 }, { stone: 2, gold: 1.6, food: 1.2 }),
    T('masonry', 'M', 1, '🧱', 'Masonry',        1, { stone: 30 }, { def: 1.15, walls: 1 }),
    T('forge',   'M', 2, '🔨', 'Forge',          2, { stone: 60, gold: 20, iron: 15 }, { def: 1.4, atk: 1.2 }),
    T('hold',    'M', 3, '🏯', 'Mountain Hold',  3, { gold: 100, stone: 120, iron: 20 }, { radius: 3, def: 1.5 }),
    T('ironbreak', 'M', 4, '🛡', 'Ironbreakers', 3, { iron: 30, gold: 40 }, { def: 1.3, atk: 1.2 }),
    T('ironcannon', 'M', 5, '☄️', 'Steam Cannons', 3, { iron: 50, gold: 60 }, { atk: 1.5, def: 1.2 }),
    T('runes',   'L', 1, '🔮', 'Rune Lore',      1, { stone: 20 }, { kp: 1.25 }),
    T('engrave', 'L', 2, '📖', 'Engraving',      2, { stone: 40, gold: 20 }, { kp: 1.25, gold: 1.1 }),
    T('runesmith', 'L', 3, '🔨', 'Runesmiths',   3, { gold: 60, silver: 15 }, { kp: 1.3, def: 1.1 }),
    T('runeforge', 'L', 4, '🔥', 'Runeforge',    3, { gold: 90, silver: 25 }, { kp: 1.5, def: 1.1 }),
    T('tinker',  'L', 5, '🔬', 'Tinkering',      3, { gold: 100, silver: 40 }, { kp: 1.4, houses: 3 }),
  ],
  orc: [
    T('raid',    'E', 1, '🩸', 'Raiding',        1, { stone: 20, gold: 10, bronze: 8 }, { loot: 1 }),
    T('plunder', 'E', 2, '🪙', 'Plunder',        2, { stone: 30, gold: 20 }, { loot: 1, gold: 1.3 }),
    T('voyage',  'E', 3, '⛵', 'War Canoes',     3, { wood: 90, gold: 18, iron: 10 }, {}, 'harbor'),
    T('tribute', 'E', 4, '👑', 'Tribute Lords',  3, { gold: 60 }, { gold: 1.5, food: 1.2, steal: .4 }),
    T('warforge', 'E', 5, '🔨', 'War Forges',    3, { iron: 40, gold: 40 }, { gold: 1.6, wood: 1.4 }),
    T('camp',    'M', 1, '🪓', 'War Camp',       1, { wood: 30 }, { atk: 1.25, birth: 1.2 }, 'warbanner'),
    T('cleaver', 'M', 2, '⚔️', 'Cleavers',       2, { wood: 30, bronze: 10 }, { atk: 1.2 }),
    T('horde',   'M', 3, '👹', 'The Horde',      3, { gold: 60, wood: 60, iron: 15 }, { birth: 1.5, houses: 4, def: 1.25 }),
    T('warlord', 'M', 4, '💀', 'Warlords',       3, { iron: 25, gold: 40 }, { atk: 1.35, birth: 1.15 }),
    T('blackpowder', 'M', 5, '☄️', 'Blackpowder', 3, { iron: 40, gold: 60 }, { atk: 1.5, range: 3 }),
    T('shaman',  'L', 1, '🔮', 'Shamanism',      1, { wood: 25 }, { kp: 1.2, regen: .02 }),
    T('totem',   'L', 2, '💀', 'Blood Totem',    2, { stone: 40, gold: 30, bronze: 10 }, { steal: .3, atk: 1.15 }, 'bloodtotem'),
    T('warlore', 'L', 3, '📖', 'War Lore',       3, { gold: 40, iron: 10 }, { kp: 1.25, atk: 1.1 }),
    T('bonemage', 'L', 4, '🔥', 'Bone Magi',     3, { gold: 80, silver: 20 }, { kp: 1.4, regen: .05 }),
    T('doom',    'L', 5, '☄️', 'Doom Prophecy',  3, { gold: 120, silver: 40 }, { kp: 1.3, atk: 1.25, def: 1.2 }),
  ],
  werewolf: [
    T('pack',    'E', 1, '🐾', 'The Pack',       1, { stone: 20, silver: 6 }, { birth: 1.4 }),
    T('forage',  'E', 2, '🌿', 'Pack Foraging',  1, { wood: 30 }, { food: 1.3 }),
    T('voyage',  'E', 3, '⛵', 'Moonwake Fleet', 3, { wood: 80, gold: 22, iron: 8 }, {}, 'harbor'),
    T('dens',    'E', 4, '🛖', 'Moon Dens',      3, { wood: 80, stone: 50 }, { houses: 3, food: 1.2 }),
    T('primal',  'E', 5, '🌕', 'Primal Bounty',  3, { gold: 100 }, { food: 1.5, birth: 1.3 }),
    T('claws',   'M', 1, '🐺', 'Sharp Claws',    1, { stone: 15 }, { atk: 1.15 }),
    T('ambush',  'M', 2, '🌙', 'Ambush',         2, { stone: 30, silver: 6 }, { atk: 1.15, night: 1.6 }),
    T('alpha',   'M', 3, '⚔️', 'Alpha Bloodline', 3, { gold: 30, silver: 10 }, { atk: 1.25, def: 1.15 }),
    T('dire',    'M', 4, '💀', 'Dire Packs',     3, { silver: 20, gold: 30 }, { atk: 1.35, birth: 1.2 }),
    T('fury',    'M', 5, '🔥', 'Lunar Fury',     3, { silver: 40, gold: 60 }, { atk: 1.5, regen: .08 }),
    T('moon',    'L', 1, '🌙', 'Moon Prayer',    0, { wood: 20 }, { night: 1.4, kp: 1.2 }),
    T('spirit',  'L', 2, '🔮', 'Spirit Totem',   2, { stone: 40, gold: 20, silver: 8 }, { radius: 3, regen: .05 }, 'spirittotem'),
    T('full',    'L', 3, '🌕', 'Full Moon',      3, { gold: 50, silver: 10 }, { night: 2, birth: 1.5 }),
    T('eclipse', 'L', 4, '🌙', 'Eclipse Rite',   3, { silver: 30, gold: 60 }, { kp: 1.4, night: 2.5 }),
    T('theeclipse', 'L', 5, '☄️', 'The Eclipse', 3, { silver: 50, gold: 100 }, { kp: 1.3, night: 3, def: 1.3 }),
  ],
};

/** How each race leans when it picks a branch on its own. */
export const BRANCH_W = {
  human: { E: 1.2, M: 1, L: 1 }, elf: { E: 1, M: .8, L: 1.6 }, dwarf: { E: 1.3, M: 1.1, L: .9 },
  orc: { E: .7, M: 1.8, L: .7 }, werewolf: { E: 1, M: 1.3, L: 1.2 },
};

/** Tech order of save versions 5 to 8 (a save only stored how many techs a kingdom had). */
export const LEGACY_ORDER = {
  human: ['agri', 'walls', 'knight', 'trade', 'voyage'], elf: ['forest', 'archer', 'ward', 'treelife', 'voyage'],
  dwarf: ['mining', 'forge', 'vault', 'hold', 'voyage'], orc: ['camp', 'raid', 'totem', 'horde', 'voyage'],
  werewolf: ['moon', 'pack', 'spirit', 'full', 'voyage'],
};
export function legacyTechIds(race, n) { return (LEGACY_ORDER[race] || []).slice(0, Math.max(0, Math.min(5, n | 0))); }

const BY = {}; for (const r in TECHS) for (const t of TECHS[r]) BY[r + ':' + t.id] = t;
export function techById(race, id) { return BY[race + ':' + id] || null; }

/** Is a tech researchable? Needs its age, its level (unless ignored) and the previous tier of its branch. */
export function isAvailable(t, race, owned, age, level, ignoreLevel) {
  const has = owned instanceof Set ? owned : new Set(owned);
  if (has.has(t.id) || t.tier > (age | 0) + 1) return false;
  if (!ignoreLevel && (level | 0) < t.lv) return false;
  if (t.tier > 1) { const prev = TECHS[race].find(o => o.br === t.br && o.tier === t.tier - 1); if (prev && !has.has(prev.id)) return false; }
  return true;
}
export function availableTechs(race, owned, age, level, ignoreLevel) { return TECHS[race].filter(t => isAvailable(t, race, owned, age, level, ignoreLevel)); }

/** Weighted pick: races lean towards a branch, a decree triples a branch, lower tiers come first. `rnd` in [0, 1). */
export function chooseTech(race, cands, focus, rnd) {
  if (!cands.length) return null;
  const w = cands.map(t => (BRANCH_W[race][t.br] || 1) * (focus === t.br ? 3 : 1) / t.tier);
  let r = rnd * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cands.length; i++) { r -= w[i]; if (r < 0) return cands[i]; }
  return cands[cands.length - 1];
}

/** Knowledge points a kingdom earns per second. */
export function kpGain(pop, houses, level, kpMod) { return (pop * .02 + houses * .04) * (1 + level * .3) * (kpMod || 1); }

/** Techs a kingdom owns of a given tier. */
export function techsOfTier(race, owned, tier) { const has = new Set(owned); return TECHS[race].filter(t => t.tier === tier && has.has(t.id)).length; }

/** Can the kingdom move from its age to the next, ignoring the resource cost? */
export function ageReady(race, owned, age, level) {
  const need = ageNeed(age); if (!need) return false;
  return (level | 0) >= need.lv && techsOfTier(race, owned, (age | 0) + 1) >= need.techs;
}
