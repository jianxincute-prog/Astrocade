/*
 * Worker jobs — pure logic (no DOM / window / lib).
 *
 * Settlers of every race pick everyday jobs when they are not fighting:
 *   chop   – swing an axe (claws for werewolves) at a tree, haul a log home   -> wood
 *   mine   – hack at an ore node or hill rock with a pickaxe, haul the rock   -> stone / ore
 *   hunt   – chase a rabbit / deer / sheep, kill it with spear, bow or claws  -> food
 *   farm   – hoe a kingdom field, carry a wheat sheaf                         -> food
 *   fish   – cast a rod into the water, reel in a fish                        -> food
 *   gather – pick berries and fruit in the forest (elves love it)             -> food
 * A job has three phases: 0 = walk to the spot, 1 = work there, 2 = carry the goods home.
 */

export const JOBS = ['chop', 'mine', 'hunt', 'farm', 'fish', 'gather'];

// How much each race likes each job (relative weights).
export const JOB_W = {
  human:    { chop: 2,   mine: 1.2, hunt: 1,   farm: 3,   fish: 2,   gather: .5 },
  elf:      { chop: .4,  mine: .3,  hunt: 3,   farm: 1,   fish: 1.2, gather: 3 },
  dwarf:    { chop: 1.6, mine: 5,   hunt: .6,  farm: 1,   fish: .6,  gather: .2 },
  orc:      { chop: 2.5, mine: 1.2, hunt: 3,   farm: .5,  fish: 1,   gather: .3 },
  werewolf: { chop: .8,  mine: 1,   hunt: 5,   farm: 0,   fish: 1.2, gather: .6 },
};

// What a finished job brings home: resource key and amount.
export const JOB_YIELD = {
  chop: ['wood', 3], mine: ['stone', 2], hunt: ['food', 8], farm: ['food', 4], fish: ['food', 5], gather: ['food', 3],
};

// The thing a worker carries back for each job.
export const CARRY = { chop: 'log', mine: 'rock', hunt: 'meat', farm: 'wheat', fish: 'fish', gather: 'berries' };

export const STATUS = {
  chop: ['Going to chop', 'Chopping wood', 'Hauling logs'],
  mine: ['Going to mine', 'Mining', 'Hauling stone'],
  hunt: ['Tracking prey', 'Hunting', 'Bringing meat'],
  farm: ['Going to the fields', 'Farming', 'Bringing wheat'],
  fish: ['Going fishing', 'Fishing', 'Bringing fish'],
  gather: ['Going foraging', 'Foraging', 'Bringing berries'],
};

/** Weighted pick among the jobs that are available right now. `avail` maps job -> bool. */
export function pickJob(race, avail, rnd) {
  const w = JOB_W[race]; if (!w) return null;
  let tot = 0;
  for (const j of JOBS) if (avail[j]) tot += w[j] || 0;
  if (tot <= 0) return null;
  let r = rnd * tot;
  for (const j of JOBS) if (avail[j] && (w[j] || 0) > 0) { r -= w[j]; if (r < 0) return j; }
  for (let i = JOBS.length - 1; i >= 0; i--) if (avail[JOBS[i]] && (w[JOBS[i]] || 0) > 0) return JOBS[i];
  return null;
}

/** Number of move-steps spent working on the spot. */
export function workLen(job, rnd) { return job === 'fish' ? 22 + Math.floor(rnd * 14) : 14 + Math.floor(rnd * 10); }

/** How close the worker must stand to the target tile to start working. */
export function reach(job, race) { return job === 'farm' || job === 'fish' ? 0 : job === 'hunt' ? (race === 'elf' ? 3 : 1) : 1; }

/** Swing period in render frames per job (fishing has no swing). */
export const PERIOD = { chop: 34, mine: 38, farm: 42, gather: 30, fish: 90, hunt: 24 };

/** 0..1 position in the current swing cycle. */
export function swingPhase(frame, id, job) { const p = PERIOD[job] || 36; return ((frame + id * 7) % p) / p; }

/** Index of the current swing cycle (to fire impact effects once per swing). */
export function swingCycle(frame, id, job) { const p = PERIOD[job] || 36; return Math.floor((frame + id * 7) / p); }

/** Moment of impact inside a cycle. */
export const IMPACT = .62;

/**
 * Tool angle (radians, 0 = pointing forward / horizontal, negative = raised up behind)
 * Slow wind-up, fast strike, short recovery.
 */
export function toolAngle(job, ph) {
  const up = job === 'chop' ? -1.9 : job === 'gather' ? -1.2 : -2.3, down = job === 'chop' ? .15 : job === 'gather' ? -.5 : .75;
  if (ph < .5) { const e = ph / .5; return down + (up - down) * (1 - (1 - e) * (1 - e)); }       // wind-up (ease out)
  if (ph < IMPACT) { const e = (ph - .5) / (IMPACT - .5); return up + (down - up) * e * e; }       // strike (ease in)
  const e = (ph - IMPACT) / (1 - IMPACT); return down - Math.sin(e * Math.PI) * .12;              // recoil
}

/** Is the swing at (or just past) its impact moment? */
export function isStrikeFrame(ph) { return ph >= IMPACT && ph < IMPACT + .08; }

/** Clamp a resource gain to the kingdom caps used by the economy. */
export function addYield(k, key, amt) {
  const cap = key === 'food' ? 400 : 250;
  k[key] = Math.min(cap, (k[key] || 0) + amt);
  return k[key];
}
