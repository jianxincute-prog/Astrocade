/* Pure, optional sandbox goals: a long list grouped by theme. A goal's progress comes from a world snapshot. */
export const GROUPS = [
  { id: 'civ', ic: '👥', n: 'Civilization' },
  { id: 'know', ic: '🔬', n: 'Knowledge' },
  { id: 'ind', ic: '🔨', n: 'Industry' },
  { id: 'dip', ic: '🤝', n: 'Diplomacy' },
  { id: 'war', ic: '⚔️', n: 'Military' },
  { id: 'sea', ic: '🌊', n: 'The sea' },
  { id: 'life', ic: '🌱', n: 'Life and time' },
];
const G = (group, id, icon, title, detail, target, v) => ({ group, id, icon, title, detail, target, v });
/** `v(s)` reads the progress from the snapshot `s` (see objectiveValues). */
export const OBJECTIVES = [
  G('civ', 'population', '👥', 'World grows', 'Reach 50 civilization residents', 50, s => s.pop),
  G('civ', 'pop200', '👥', 'Great nations', 'Reach 200 civilization residents', 200, s => s.pop),
  G('civ', 'realm', '🏰', 'Realm advances', 'Bring one kingdom to level 3', 3, s => s.maxLevel),
  G('civ', 'lv3x3', '🏰', 'Three capitals', 'Have three kingdoms of level 3 at once', 3, s => s.lv3),
  G('civ', 'kingdoms5', '🏘️', 'Many realms', 'Have five kingdoms at the same time', 5, s => s.kingdoms),
  G('civ', 'peoples5', '🧑', 'All peoples', 'Have all five peoples alive at once', 5, s => s.races),
  G('know', 'age2', '🔩', 'Iron Age', 'Bring one kingdom into the Iron Age', 2, s => s.maxAge),
  G('know', 'age3', '🔬', 'Medieval Age', 'Bring one kingdom into the Medieval Age', 3, s => s.maxAge),
  G('know', 'age4', '☄️', 'Gunpowder Age', 'Bring one kingdom into the Gunpowder Age', 4, s => s.maxAge),
  G('know', 'techs15', '📖', 'Master of lore', 'Research all 15 techs in one kingdom', 15, s => s.maxTechs),
  G('know', 'wonder', '🏰', 'A wonder of the world', 'Raise a wonder', 1, s => s.wonders),
  G('ind', 'bld6', '🔨', 'Full town', 'Have all six production buildings in one kingdom', 6, s => s.bldKinds),
  G('ind', 'roads200', '🏠', 'Roads everywhere', 'Wear in 200 road tiles', 200, s => s.roads),
  G('ind', 'trade20', '🪙', 'Merchants', 'Complete 20 market trades', 20, s => s.trades),
  G('ind', 'decree3', '📜', 'Royal decrees', 'Issue three decrees', 3, s => s.g.decrees),
  G('dip', 'peace', '🕊️', 'End of conflict', 'Watch one war end', 1, s => s.warsEnded),
  G('dip', 'ally1', '🤝', 'First alliance', 'Have two kingdoms allied', 1, s => s.allies),
  G('dip', 'pacts3', '📜', 'Open markets', 'Have three trade pacts at once', 3, s => s.pacts),
  G('dip', 'union', '🤝', 'One realm', 'Watch two kingdoms of one people unite', 1, s => s.g.unions),
  G('war', 'hero', '🎖️', 'A hero is born', 'Have a battle hero', 1, s => s.heroes),
  G('war', 'guns5', '☄️', 'Musket line', 'Field five musketeers at once', 5, s => s.guns),
  G('war', 'warship', '⚓', 'Fleet of war', 'Launch a warship', 1, s => s.g.warships),
  G('sea', 'colony1', '⛵', 'First colony', 'Found a colony on another island by ship', 1, s => s.g.colonies),
  G('sea', 'colony3', '🏝️', 'Island empire', 'Found three colonies by ship', 3, s => s.g.colonies),
  G('sea', 'sharks5', '🦈', 'Shark hunters', 'Harpoon five sharks', 5, s => s.g.sharks),
  G('sea', 'kraken', '🐙', 'Driven off', 'Drive the kraken away with cannon fire', 1, s => s.g.krakenDriven),
  G('sea', 'slayer', '🎯', 'Kraken slayer', 'Kill the kraken (fleets almost never can; god powers can)', 1, s => s.g.krakenSlain),
  G('life', 'births100', '🌱', 'A growing people', 'Welcome 100 newborn settlers', 100, s => s.g.births),
  G('life', 'wanderers', '🧑', 'Rescue', 'See wanderers save a nearly gone people', 1, s => s.g.bands),
  G('life', 'years100', '⏳', 'A century', 'Let the world run for 100 years', 100, s => s.years),
  G('life', 'years300', '⏳', 'Three centuries', 'Let the world run for 300 years', 300, s => s.years),
  G('life', 'scenario', '🎯', 'Scenario won', 'Win any scenario', 1, s => s.g.scnWins),
  G('life', 'score3000', '🏆', 'High score', 'Reach a civilization score of 3000', 3000, s => s.score),
];
export const GOAL_BONUS = 50;                       // civilization score per completed goal

/** Counters that survive saves (the `gs` field). */
export const newGoalStats = () => ({ decrees: 0, unions: 0, warships: 0, colonies: 0, sharks: 0, krakenDriven: 0, krakenSlain: 0, births: 0, bands: 0, scnWins: 0 });

/**
 * Progress values for every goal. snap = { counts, levels[], warsEnded, ages[], techs[], wonders, kingdoms: [{level, age, techs, bld:[ids], }], ... }
 * is built by the game; here the raw world facts are turned into the numbers the goals read.
 */
export function objectiveValues(w) {
  const kingdoms = w.kingdoms || [], counts = w.counts || {};
  const pop = ['human', 'elf', 'dwarf', 'orc', 'werewolf'].reduce((n, r) => n + (counts[r] || 0), 0);
  const s = {
    pop, kingdoms: kingdoms.length, maxLevel: Math.max(0, ...kingdoms.map(k => k.level)), lv3: kingdoms.filter(k => k.level >= 3).length,
    maxAge: Math.max(0, ...kingdoms.map(k => k.age)), maxTechs: Math.max(0, ...kingdoms.map(k => k.techs)),
    wonders: kingdoms.filter(k => (k.bld || []).includes('wonder')).length, bldKinds: Math.max(0, ...kingdoms.map(k => (k.bld || []).length)),
    races: new Set(kingdoms.map(k => k.race)).size, warsEnded: Math.max(0, Number(w.warsEnded) || 0), allies: w.allies | 0, pacts: w.pacts | 0,
    roads: w.roads | 0, trades: w.trades | 0, heroes: w.heroes | 0, guns: w.guns | 0, years: Math.floor(w.years || 0), score: w.score | 0,
    g: Object.assign(newGoalStats(), w.g || {}),
  };
  const out = {}; for (const o of OBJECTIVES) out[o.id] = Math.max(0, Number(o.v(s)) || 0);
  return out;
}

export function objectiveRatio(value, target) {
  return Math.max(0, Math.min(1, (Number(value) || 0) / Math.max(1, Number(target) || 1)));
}
