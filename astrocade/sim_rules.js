/* Pure simulation balance rules: creature birth pace and war-end consequences. */
export const DEFAULT_BIRTH_RATE = 0.001;       // was 0.005 per house / world tick (five times faster)
export const WEREWOLF_BIRTH_RATE = 0.00008;    // remain rarer than the other civilizations

export function birthProbability(spawnP, level = 0, birthMod = 1, eventMod = 1) {
  const base = spawnP == null ? DEFAULT_BIRTH_RATE : Math.max(0, Number(spawnP) || 0);
  return base * (1 + Math.max(0, Number(level) || 0) * 0.4) * Math.max(0, Number(birthMod) || 0) * Math.max(0, Number(eventMod) || 0);
}

/**
 * End-of-war outcome, based on relative strength of the weaker side.
 * A close war can still erase a kingdom; a crushing defeat raises the risks.
 * `roll` is uniform [0,1), ratio = defeated strength / victorious strength.
 */
export function warOutcome(roll, strengthRatio) {
  const ratio = Math.max(0, Math.min(1, Number(strengthRatio) || 0));
  const severity = 1 - ratio;
  const raceChance = 0.001 + severity * 0.006;       // 0.1–0.7%: a rare, devastating extinction
  const kingdomChance = 0.04 + severity * 0.16;     // 4–20%: the defeated realm may collapse
  const r = Math.max(0, Math.min(0.999999999, Number(roll) || 0));
  if (r < raceChance) return 'race';
  if (r < raceChance + kingdomChance) return 'kingdom';
  return 'survive';
}
