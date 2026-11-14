/* Pure, optional sandbox objectives. */
export const OBJECTIVES = [
  { id: 'population', icon: '👥', title: 'World grows', detail: 'Reach 50 civilization residents', target: 50 },
  { id: 'realm', icon: '🏰', title: 'Realm advances', detail: 'Bring one kingdom to level 3', target: 3 },
  { id: 'peace', icon: '🕊️', title: 'End of conflict', detail: 'Watch one war end', target: 1 },
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
