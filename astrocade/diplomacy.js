/* Diplomacy rules - pure (no DOM / window / lib).
 * Relations between two kingdoms: war (1), alliance (2), truce (3) and trade pact (4).
 * Neighbours that are not at war may sign a trade pact; an old pact can grow into an alliance; pacts and alliances can
 * also break. Partners help each other through famine and shortage, and pacts bring a little gold. */
export const REL = { WAR: 1, ALLY: 2, TRUCE: 3, PACT: 4 };
export const PACT_GOLD = 2;                     // gold each partner earns per diplomacy round
export const PACT_AGE_FOR_ALLIANCE = 1200;       // ticks (10 years) before a pact can become an alliance

/** Chance per round that two neighbours with no relation sign a trade pact. */
export function pactChance(ra, rb, friends) {
  if (ra === 'werewolf' || rb === 'werewolf') return .006;
  if (friends) return .05;
  if (ra === rb) return ra === 'orc' ? .02 : .04;
  if (ra === 'orc' || rb === 'orc') return .01;
  return .025;
}
/** Chance per round that an old pact becomes an alliance. */
export function allyChance(ra, rb, friends, pactAge) {
  if (pactAge < PACT_AGE_FOR_ALLIANCE || ra === 'werewolf' || rb === 'werewolf') return 0;
  return friends ? .06 : ra === rb ? .05 : .015;
}
/** Chance per round that a pact or an alliance breaks; a lopsided alliance breaks more easily. */
export function breakChance(state, powerRatio) {
  const r = Math.max(powerRatio, 1 / Math.max(.01, powerRatio));
  if (state === REL.ALLY) return .003 + (r > 3 ? .01 : 0);
  if (state === REL.PACT) return .004 + (r > 4 ? .006 : 0);
  return 0;
}
/** Chance per round that a pact partner turns on the other (a fraction of the race's usual aggression). */
export const betrayalChance = aggr => aggr * .12;
/** Aid between partners: what `giver` sends to `taker` this round, or null. Allies give more than pact partners. */
export function aid(giver, taker, ally) {
  const share = ally ? 1 : .6;
  if (taker.food < 40 && giver.food > 180) return { key: 'food', amt: Math.round(Math.min(60, giver.food - 150) * share) };
  if (taker.wood < 15 && giver.wood > 120) return { key: 'wood', amt: Math.round(Math.min(40, giver.wood - 100) * share) };
  return null;
}
/** Knowledge bonus from alliances: +10% per ally, up to three. */
export const allyKp = allies => 1 + .1 * Math.min(3, allies);
