/* Pure, optional sandbox objectives. */
export const OBJECTIVES = [
  { id: 'population', icon: '👥', title: 'Dunia berkembang', detail: 'Capai 50 penghuni peradaban', target: 50 },
  { id: 'realm', icon: '🏰', title: 'Kerajaan maju', detail: 'Bawa satu kerajaan ke level 3', target: 3 },
  { id: 'peace', icon: '🕊️', title: 'Akhir konflik', detail: 'Saksikan satu perang berakhir', target: 1 },
];

/** Current progress values for the three goals. */
export function objectiveValues(counts = {}, kingdomLevels = [], warsEnded = 0) {
  const population = ['human', 'elf', 'dwarf', 'orc', 'werewolf'].reduce((n, r) => n + (counts[r] || 0), 0);
  return {
    population,
    realm: kingdomLevels.length ? Math.max(0, ...kingdomLevels) : 0,
    peace: Math.max(0, Number(warsEnded) || 0),
  };
}

export function objectiveRatio(value, target) {
  return Math.max(0, Math.min(1, (Number(value) || 0) / Math.max(1, Number(target) || 1)));
}
