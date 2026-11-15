/* Seasons and decrees - pure rules (no DOM / window / lib).
 * A year is 120 ticks; the seasons turn every year (a full cycle lasts four years). */
export const YEAR = 120;
export const SEASONS = [
  { id: 'spring', n: 'Spring', food: 1.1, birth: 1.2, tint: null },
  { id: 'summer', n: 'Summer', food: 1.15, birth: 1, tint: [255, 205, 90, .035] },
  { id: 'autumn', n: 'Autumn', food: 1.3, birth: 1, tint: [255, 140, 40, .07] },
  { id: 'winter', n: 'Winter', food: .7, birth: .75, tint: [150, 185, 255, .1] },
];
export const seasonIndex = tick => Math.floor(Math.max(0, tick) / YEAR) % 4;
export const seasonOf = tick => SEASONS[seasonIndex(tick)];
/** 0..1 blend of the season tint: it fades in and out around each turn of the year. */
export function seasonTintK(tick) { const f = (Math.max(0, tick) % YEAR) / YEAR; return Math.min(1, f * 6, (1 - f) * 6); }

/** Royal decrees: a gold or food price buys a short boost; each has a cooldown. Durations are in ticks. */
export const DECREES = [
  { id: 'harvest', n: 'Harvest', ic: '🌾', cost: { gold: 20 }, dur: 480, cd: 1200, fx: { food: 1.5 }, info: 'Food x1.5' },
  { id: 'scholars', n: 'Scholars', ic: '📖', cost: { gold: 30 }, dur: 480, cd: 1200, fx: { kp: 2 }, info: 'Knowledge x2' },
  { id: 'tax', n: 'Tax', ic: '🪙', cost: { food: 30 }, dur: 480, cd: 1200, fx: { gold: 1.8 }, info: 'Gold x1.8' },
  { id: 'industry', n: 'Industry', ic: '🪵', cost: { gold: 20 }, dur: 480, cd: 1200, fx: { wood: 1.4, stone: 1.4 }, info: 'Wood and stone x1.4' },
];
export const DECREE_BY = Object.fromEntries(DECREES.map(d => [d.id, d]));
/** Multiplier of a decree effect (food, kp, gold, wood, stone) for a kingdom's decree state { id, until, cd }. */
export function decreeMult(dec, tick, key) {
  if (!dec || tick >= dec.until) return 1;
  const d = DECREE_BY[dec.id]; return d && d.fx[key] ? d.fx[key] : 1;
}
/** Can a decree be issued now? Returns the decree or null. */
export function decreeReady(dec, id, tick) {
  const d = DECREE_BY[id]; if (!d) return null;
  if (dec && tick < Math.max(dec.until, dec.cd || 0)) return null;
  return d;
}
export function issueDecree(id, tick) { const d = DECREE_BY[id]; return { id, until: tick + d.dur, cd: tick + d.cd }; }
