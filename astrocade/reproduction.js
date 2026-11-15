/* Life cycle rules - pure (no DOM / window / lib).
 * Every creature is male or female. A birth needs a mature female and a mature male of the same kind close together;
 * animals also rest between births and breed less as their kind approaches its population cap. */
export const MATURE_FRAC = .15;                    // a creature is an adult from 15% of its lifespan on
export const ELDER_FRAC = .8;

export const isAdult = (age, life) => age >= life * MATURE_FRAC;
export function lifeStage(age, life) { return age < life * .05 ? 'Newborn' : age < life * MATURE_FRAC ? 'Young' : age > life * ELDER_FRAC ? 'Elder' : 'Adult'; }

/** Wild breeding: p = chance per roll for a ready female with a mate; cd = rest between births (ticks). */
export const ANIMAL_BREED = {
  sheep: { p: .1, cd: 100 },
  rabbit: { p: .08, cd: 80 },
  deer: { p: .1, cd: 110 },
  wolf: { p: .006, cd: 400 },
};
/** 1 when the kind is rare, falling to 0 at its cap: crowded animals breed less. */
export const crowd = (count, cap) => cap > 0 ? Math.max(0, Math.min(1, 1 - count / cap)) : 0;

/** A female that may give birth now. */
export const canBreed = (c, now) => !!c.f && c.hp > 0 && isAdult(c.age, c.life) && now >= (c.bcd | 0);
/** Can `b` be the mate of the female `a`? */
export const isMate = (a, b) => a !== b && b.hp > 0 && a.t === b.t && !b.f && isAdult(b.age, b.life);

/**
 * Parents of a human-like birth from a pool of living adults (each has f, nid, sp). Returns [mother, father] or null.
 * Existing couples are preferred.
 */
export function pickPair(pool, rnd = Math.random) {
  const females = pool.filter(o => o.f), males = pool.filter(o => !o.f);
  if (!females.length || !males.length) return null;
  const couples = [];
  for (const m of females) { const f = males.find(o => o.nid === m.sp); if (f) couples.push([m, f]); }
  if (couples.length) return couples[Math.floor(rnd() * couples.length)];
  const single = females.filter(o => !o.sp), singleM = males.filter(o => !o.sp);
  const mm = (single.length ? single : females), ff = (singleM.length ? singleM : males);
  return [mm[Math.floor(rnd() * mm.length)], ff[Math.floor(rnd() * ff.length)]];
}

/** A ship's crew of up to n: one of each sex first (so a new colony can grow), then anyone. Adults come first. */
export function pickCrew(list, n = 3) {
  const adults = list.filter(c => isAdult(c.age, c.life)), rest = list.filter(c => !isAdult(c.age, c.life));
  const ordered = adults.concat(rest), out = [];
  const f = ordered.find(c => c.f), m = ordered.find(c => !c.f);
  if (f) out.push(f); if (m) out.push(m);
  for (const c of ordered) if (out.length < n && !out.includes(c)) out.push(c);
  return out.slice(0, n);
}
