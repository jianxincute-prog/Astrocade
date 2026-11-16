/* Professions - pure logic (no DOM / window / lib).
 * An adult settler is given ONE lifelong profession by the kingdom. It is chosen once, from the race's liking for each trade,
 * what the realm needs right now, and a share cap so no single trade swamps the rest. Practice earns mastery.
 * Soldiers keep the old rule (a fixed share of every people); their peacetime chores stay random. */
export const PROFS = [
  { id: 'farmer', ic: '🌾', n: 'Farmer', job: 'farm', w: 'farm' },
  { id: 'lumberjack', ic: '🪓', n: 'Lumberjack', job: 'chop', w: 'chop' },
  { id: 'miner', ic: '⛏', n: 'Miner', job: 'mine', w: 'mine' },
  { id: 'hunter', ic: '🏹', n: 'Hunter', job: 'hunt', w: 'hunt' },
  { id: 'fisher', ic: '🐟', n: 'Fisher', job: 'fish', w: 'fish' },
  { id: 'gatherer', ic: '🌿', n: 'Gatherer', job: 'gather', w: 'gather' },
  { id: 'builder', ic: '🔨', n: 'Builder', job: 'build' },
  { id: 'soldier', ic: '🛡', n: 'Soldier', job: null },
  { id: 'trader', ic: '🪙', n: 'Trader', job: null },
];
export const PROF_IDS = PROFS.map(p => p.id);
export const PROF_BY = Object.fromEntries(PROFS.map(p => [p.id, p]));

// Liking of each race for the two trades that are not everyday jobs (the other six come from jobs.js JOB_W).
export const EXTRA_W = {
  human: { builder: 1.5, trader: 1.5 }, elf: { builder: .8, trader: 1 }, dwarf: { builder: 2.5, trader: 1 },
  orc: { builder: 1, trader: .4 }, werewolf: { builder: .2, trader: .1 },
};
export const SHARE_CAP = .4;                      // above this share of the workforce a trade is much less likely to be chosen

export function likeOf(race, prof, JOB_W) {
  const p = PROF_BY[prof]; if (!p || prof === 'soldier') return 0;
  return p.w ? ((JOB_W[race] || {})[p.w] || 0) : ((EXTRA_W[race] || {})[prof] || 0);
}

/** What the realm lacks: multipliers per trade from the kingdom's stocks (food, wood, stone, gold, labour = builder points). */
export function needBoost(k) {
  const food = k.food < 60 ? 2 : k.food < 120 ? 1.3 : k.food > 300 ? .6 : 1;
  const wood = k.wood < 25 ? 1.8 : k.wood > 180 ? .6 : 1, stone = k.stone < 25 ? 1.8 : k.stone > 180 ? .6 : 1;
  return { farmer: food, hunter: food, fisher: food, gatherer: food, lumberjack: wood, miner: stone, builder: (k.lab | 0) < 10 ? 1.3 : 1, trader: k.gold < 20 ? 1.6 : 1 };
}

/**
 * The profession for a new adult (never 'soldier': that is decided apart).
 * counts: current number of settlers per profession in the kingdom; avail: { farmer: bool, hunter: bool ... } trades that cannot work here.
 */
export function pickProfession(race, need, counts, avail, JOB_W, rnd) {
  const ids = PROF_IDS.filter(p => p !== 'soldier'), total = ids.reduce((n, p) => n + (counts[p] || 0), 0);
  const w = ids.map(p => {
    if (avail && avail[p] === false) return 0;
    let x = likeOf(race, p, JOB_W) * ((need && need[p]) || 1);
    if (total >= 6 && (counts[p] || 0) / total > SHARE_CAP) x *= .15;
    return x;
  });
  let tot = w.reduce((a, b) => a + b, 0); if (tot <= 0) return 'gatherer';
  let r = rnd * tot; for (let i = 0; i < ids.length; i++) { r -= w[i]; if (r < 0) return ids[i]; }
  return ids[ids.length - 1];
}

// Mastery: finished tasks of the lifelong trade.
export const MASTERY_XP = [0, 6, 16, 34, 64];
export const MASTERY_NAME = ['Apprentice', 'Journeyman', 'Skilled', 'Expert', 'Master'];
export function masteryLevel(xp) { let l = 0; for (let i = 1; i < MASTERY_XP.length; i++) if (xp >= MASTERY_XP[i]) l = i; return l; }
export const yieldMult = lvl => 1 + .1 * lvl;     // more goods per trip
export const speedMult = lvl => 1 - .06 * lvl;    // shorter work on the spot
export const BUILD_DISCOUNT_MAX = .25;
/** Builders' labour makes the realm's next building cheaper (labour 0..50). */
export const buildDiscount = lab => Math.min(BUILD_DISCOUNT_MAX, Math.max(0, lab) * .006);
/** Traders: gold per second and the trade-cart cooldown shortened. */
export const traderGold = n => Math.min(.3, n * .012);
export const traderCd = (base, n) => Math.max(80, base - n * 18);
