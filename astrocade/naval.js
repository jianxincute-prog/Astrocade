/* Naval combat rules - pure (no DOM / window / lib).
 * Ships fire back at the kraken. The kraken is nearly unbeatable: the fleet wounds it, sometimes drives it off,
 * and only a very rare lucky shot into its eye slays it. simulateKraken() mirrors the in-game rules so the odds can be tested. */
export const KRAKEN_HP = 320, FLEE_FRAC = .5, LUCKY_SHOT = .002, VOLLEY_TICKS = 24, GUN_RANGE = 7, VOLLEYS_PER_ROUND = 6, MAX_KILLS = 3;

/** Damage of one volley by the age of the ship's kingdom (harpoons, then ballistae, then cannons). */
export function firepower(age) { return [1, 1, 2, 3, 4][Math.max(0, Math.min(4, age | 0))]; }
/** Chance that a seized ship goes under; a wounded kraken (hp below full) holds on less firmly. */
export function sinkChance(risk, manual, hp = KRAKEN_HP) {
  const base = manual ? .9 : Math.min(.85, .45 + (+risk || 0) * .05), hurt = 1 - Math.max(0, Math.min(1, hp / KRAKEN_HP));
  return base * (1 - .5 * hurt);
}
/** Hit points of a navy warship. */
export function warshipHp(age) { return 50 + 25 * Math.max(0, (age | 0) - 2); }
/** Bombardment damage and range of a warship. */
export function warshipFire(age) { return age >= 4 ? { dmg: 7, range: 8 } : { dmg: 4, range: 6 }; }

/**
 * One kraken encounter: `fleet` is a list of ship ages. Each round every living ship fires its volleys, then the kraken
 * seizes one ship (it may break free). Returns { won, fled, kills, hp }.
 */
export function simulateKraken(fleet, rnd = Math.random, risk = 3) {
  let hp = KRAKEN_HP, kills = 0; const ships = fleet.slice();
  for (let round = 0; round < 60 && ships.length && kills < MAX_KILLS; round++) {
    for (const age of ships) hp -= firepower(age) * VOLLEYS_PER_ROUND * (.6 + .8 * rnd());
    if (hp <= 0) return { won: true, fled: false, kills, hp };
    if (hp < KRAKEN_HP * FLEE_FRAC) return { won: false, fled: true, kills, hp };
    if (rnd() < sinkChance(risk, false, hp)) {
      ships.shift(); kills++;
      if (rnd() < LUCKY_SHOT) return { won: true, fled: false, kills, hp };     // the dying crew's last shot hits the eye
    }
  }
  return { won: false, fled: false, kills, hp };
}
