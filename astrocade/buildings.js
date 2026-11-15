/* Production buildings and goods chains - pure rules (no DOM / window / lib).
 * A kingdom builds one of each building as its level and age allow. Buildings turn raw goods into
 * processed goods that feed back into the economy:
 *   sawmill: wood -> planks   (a house costs 1 plank instead of 4 wood)
 *   bakery : food -> bread    (bread boosts births and covers famine)
 *   smithy : wood + ore -> tools (tools speed up chopping and quarrying; they wear out)
 *   library / academy: raise knowledge points
 */
export const BUILDINGS = [
  { id: 'sawmill', n: 'Sawmill', ic: '🪵', lv: 1, age: 0, cost: { wood: 30, stone: 10 }, info: 'Wood to planks' },
  { id: 'bakery', n: 'Bakery', ic: '🍞', lv: 1, age: 0, cost: { wood: 25, stone: 15 }, info: 'Food to bread' },
  { id: 'smithy', n: 'Smithy', ic: '🔨', lv: 2, age: 1, cost: { wood: 20, stone: 30, bronze: 10 }, info: 'Ore to tools' },
  { id: 'library', n: 'Library', ic: '📖', lv: 2, age: 1, cost: { wood: 40, stone: 30, gold: 15 }, info: 'Knowledge x1.3', kp: 1.3 },
  { id: 'academy', n: 'Academy', ic: '🔬', lv: 3, age: 3, cost: { stone: 60, gold: 40, silver: 10 }, info: 'Knowledge x1.5', kp: 1.5, needs: 'library' },
];
export const BUILDING_BY = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
export const GOODS_CAP = { plank: 80, bread: 60, tool: 40 };

/** Buildings a kingdom may build right now (not owned, age/level met, prerequisite owned). */
export function buildable(owned, age, level) {
  return BUILDINGS.filter(b => !owned.includes(b.id) && level >= b.lv && age >= b.age && (!b.needs || owned.includes(b.needs)));
}
/** Knowledge-point multiplier from the owned buildings. */
export function kpBonus(owned) { return BUILDINGS.reduce((m, b) => owned.includes(b.id) && b.kp ? m * b.kp : m, 1); }

/** One production step (once per second). Returns what to subtract from / add to the kingdom, as a delta object. */
export function produce(k) {
  const o = k.bld || [], d = { wood: 0, food: 0, ore: 0, plank: 0, bread: 0, tool: 0 };
  if (o.includes('sawmill') && k.wood > 40 && (k.plank || 0) < GOODS_CAP.plank) { d.wood -= 3; d.plank += 1.5; }
  if (o.includes('bakery') && k.food > 160 && (k.bread || 0) < GOODS_CAP.bread) { d.food -= 6; d.bread += 1; }
  if (o.includes('smithy') && k.wood > 12 && (k.tool || 0) < GOODS_CAP.tool && ((k.iron || 0) >= 1 || (k.bronze || 0) >= 1 || (k.stone || 0) >= 4)) { d.wood -= 2; d.ore = 1; d.tool += .4; }   // ore, or stone when there is no metal
  return d;
}
/** Tool wear and the work boost they give. */
export function toolBoost(k) { return (k.tool || 0) >= 1 ? 1.25 : 1; }
