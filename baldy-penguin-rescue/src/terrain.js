// Pure world rules: valley shape, landmarks, seeded placement. No Three.js here.

export const WORLD = {
  radius: 112,          // playable radius (metres)
  size: 300,            // terrain mesh edge
  pond: { x: 58, z: -44, r: 17 },   // set per level by the biome
  amp: 1,               // hill height multiplier, set per level by the biome
  homeRadius: 9,        // penguins are delivered inside this distance of the igloo
};

/** Four different snowy places that rotate from level to level. */
export const BIOMES = [
  { id: 'valley', name: 'Pine Valley', theme: 0, pond: { x: 58, z: -44, r: 17 }, amp: 1, clumps: 16, rocks: 26 },
  { id: 'lake', name: 'Frozen Lake', theme: 2, pond: { x: 8, z: -6, r: 52 }, amp: 0.55, clumps: 7, rocks: 12 },
  { id: 'crystal', name: 'Crystal Fields', theme: 3, pond: { x: -52, z: 42, r: 13 }, amp: 1.25, clumps: 15, rocks: 18 },
  { id: 'hills', name: 'Snowman Hills', theme: 1, pond: { x: 62, z: 50, r: 12 }, amp: 1.9, clumps: 9, rocks: 22 },
];

export function smooth(a, b, v) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Ground height. Flat around the igloo and the pond, rising into a rim at the edge. */
export function heightAt(x, z, home) {
  const p = home.p || 0;                                   // per-level phase reshapes the hills
  let h = 2.4 * Math.sin(x * 0.045 + 1.3 + p) * Math.cos(z * 0.04 + p * 0.7)
        + 1.5 * Math.sin(x * 0.09 + z * 0.07 + p * 1.9)
        + 0.6 * Math.sin(z * 0.16 - x * 0.05 + p * 2.3);
  h *= WORLD.amp * smooth(10, 28, Math.hypot(x - home.x, z - home.z));
  h *= smooth(WORLD.pond.r + 1, WORLD.pond.r + 13, Math.hypot(x - WORLD.pond.x, z - WORLD.pond.z));
  const r = Math.hypot(x, z);
  if (r > WORLD.radius - 4) { const d = r - (WORLD.radius - 4); h += d * d * 0.09; }
  return h;
}

export function onIce(x, z) {
  return Math.hypot(x - WORLD.pond.x, z - WORLD.pond.z) < WORLD.pond.r - 0.5;
}

/** Small deterministic random generator so the valley is the same every visit. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Keep the igloo inside the valley and away from the pond. */
export function clampHome(home) {
  let x = Number(home?.x) || 0, z = Number(home?.z) || 0;
  const r = Math.hypot(x, z), max = WORLD.radius - 35;
  if (r > max) { x *= max / r; z *= max / r; }
  const dx = x - WORLD.pond.x, dz = z - WORLD.pond.z, d = Math.hypot(dx, dz), min = WORLD.pond.r + 16;
  if (d < min) { const k = min / (d || 1); x = WORLD.pond.x + (dx || 1) * k; z = WORLD.pond.z + dz * k; }
  return { x, z };
}

function freeSpot(rand, home, taken, minHome, minGap, maxR) {
  for (let i = 0; i < 80; i++) {
    const a = rand() * Math.PI * 2, r = 12 + Math.sqrt(rand()) * (maxR - 12);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - home.x, z - home.z) < minHome) continue;
    if (taken.some(t => Math.hypot(x - t.x, z - t.z) < minGap + (t.r || 0))) continue;
    return { x, z };
  }
  return { x: -home.x * 0.5 + rand() * 20, z: -home.z * 0.5 + rand() * 20 };
}

/** Lays out trees, rocks, lost penguins and fish. */
export function layoutWorld(home, penguinCount, fishCount, seed = 20261, opts = {}) {
  const rand = rng(seed);
  const solid = [{ x: home.x, z: home.z, r: 12 }];          // keep-clear zones while placing
  const pond = { x: WORLD.pond.x, z: WORLD.pond.z, r: WORLD.pond.r + 3 };
  const trees = [], rocks = [];
  // forest clumps
  const clumps = [];
  for (let i = 0; i < (opts.clumps ?? 16); i++) clumps.push(freeSpot(rand, home, [pond], 26, 6, WORLD.radius - 8));
  for (const c of clumps) {
    const n = 5 + Math.floor(rand() * 7);
    for (let i = 0; i < n; i++) {
      const a = rand() * 6.283, r = 2 + rand() * 11;
      const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
      if (Math.hypot(x, z) > WORLD.radius - 3) continue;
      if (Math.hypot(x - home.x, z - home.z) < 16) continue;
      if (Math.hypot(x - pond.x, z - pond.z) < pond.r) continue;
      if (trees.some(t => Math.hypot(x - t.x, z - t.z) < 3.2)) continue;
      trees.push({ x, z, s: 0.8 + rand() * 0.8, r: 0.8 });
    }
  }
  for (let i = 0; i < (opts.rocks ?? 26); i++) {
    const p = freeSpot(rand, home, [pond, ...trees], 16, 3, WORLD.radius - 6);
    const s = 0.8 + rand() * 1.6;
    rocks.push({ x: p.x, z: p.z, s, r: s * 0.95, rot: rand() * 6.283 });
  }
  const blockers = [...trees, ...rocks];
  // lost penguins: spread out by sectors so they are found all over the valley
  const penguins = [];
  for (let i = 0; i < penguinCount; i++) {
    let best = null;
    for (let k = 0; k < 40; k++) {
      const a = (i + rand() * 0.8) / penguinCount * 6.283 + 0.6, r = 34 + rand() * (WORLD.radius - 48);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x - home.x, z - home.z) < 30) continue;
      if (blockers.some(t => Math.hypot(x - t.x, z - t.z) < t.r + 2)) continue;
      if (penguins.some(t => Math.hypot(x - t.x, z - t.z) < 22)) continue;
      best = { x, z }; break;
    }
    penguins.push(best || freeSpot(rand, home, [...blockers, ...penguins], 30, 4, WORLD.radius - 14));
  }
  const fish = [];
  for (let i = 0; i < fishCount; i++) {
    fish.push(freeSpot(rand, home, [...blockers, ...fish.map(f => ({ ...f, r: 5 }))], 12, 1.5, WORLD.radius - 8));
  }
  // decorations that are also solid: snowmen on the hills, fishing huts round the lake
  const snowmen = [], huts = [];
  for (let i = 0; i < (opts.snowmen || 0); i++) {
    const p = freeSpot(rand, home, [pond, ...blockers, ...snowmen.map(m => ({ ...m, r: 6 }))], 18, 2, WORLD.radius - 10);
    snowmen.push({ x: p.x, z: p.z, r: 0.95, rot: rand() * 6.283, s: 0.9 + rand() * 0.5 });
  }
  for (let i = 0; i < (opts.huts || 0); i++) {
    const a = (i + rand() * 0.6) / opts.huts * 6.283, r = WORLD.pond.r - 7 - rand() * 14;
    const x = WORLD.pond.x + Math.cos(a) * r, z = WORLD.pond.z + Math.sin(a) * r;
    if (Math.hypot(x - home.x, z - home.z) < 20 || penguins.some(q => Math.hypot(x - q.x, z - q.z) < 6)) continue;
    huts.push({ x, z, r: 2.1, rot: rand() * 6.283, hue: i });
  }
  const solidAll = [...blockers, ...snowmen, ...huts];
  const clearOf = (x, z, gap) => !solidAll.some(t => Math.hypot(x - t.x, z - t.z) < t.r + gap) && !penguins.some(q => Math.hypot(x - q.x, z - q.z) < gap + 3);
  // hazards: ice spikes on the snow, fishing holes in the lake ice
  const spikes = [], holes = [];
  for (let i = 0, tries = 0; i < (opts.spikes || 0) && tries < 400; tries++) {
    const a = rand() * 6.283, r = 16 + Math.sqrt(rand()) * (WORLD.radius - 26), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - home.x, z - home.z) < 24 || onIce(x, z) || !clearOf(x, z, 2.5) || spikes.some(t => Math.hypot(x - t.x, z - t.z) < 14)) continue;
    spikes.push({ x, z, r: 1.25, rot: rand() * 6.283 }); i++;
  }
  for (let i = 0, tries = 0; i < (opts.holes || 0) && tries < 400; tries++) {
    const a = rand() * 6.283, r = Math.sqrt(rand()) * (WORLD.pond.r - 6), x = WORLD.pond.x + Math.cos(a) * r, z = WORLD.pond.z + Math.sin(a) * r;
    if (Math.hypot(x - home.x, z - home.z) < 22 || !clearOf(x, z, 3) || holes.some(t => Math.hypot(x - t.x, z - t.z) < 9)) continue;
    holes.push({ x, z, r: 2.1 }); i++;
  }
  // one spare heart per level
  let heart = null;
  for (let k = 0; k < 60 && !heart; k++) {
    const a = rand() * 6.283, r = 30 + rand() * (WORLD.radius - 45), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - home.x, z - home.z) > 28 && clearOf(x, z, 2) && !holes.some(t => Math.hypot(x - t.x, z - t.z) < 4) && !spikes.some(t => Math.hypot(x - t.x, z - t.z) < 4)) heart = { x, z };
  }
  return { trees, rocks, penguins, fish, snowmen, huts, spikes, holes, heart };
}

/**
 * Endless levels: each one is a new place (biome), with a new igloo spot, hills and layout,
 * one more penguin to find and steadily more hazards. Call this before building the level:
 * it also switches WORLD.pond / WORLD.amp to the level's biome.
 */
export function levelPlan(level, cfg) {
  const rand = rng(9001 + level * 131), n = level - 1, biome = BIOMES[n % BIOMES.length];
  WORLD.pond = { ...biome.pond }; WORLD.amp = biome.amp;
  let home = clampHome(cfg.home);
  if (level > 1) {
    const a = rand() * 6.283, r = rand() * 60;
    home = clampHome({ x: Math.cos(a) * r, z: Math.sin(a) * r });
    home.p = rand() * 6.283;
  }
  const penguins = Math.min(12, cfg.penguins + n);
  return {
    level, home, seed: 20261 + n * 977, theme: biome.theme, biome,
    penguins,
    fish: Math.min(40, cfg.fish + n * 2),
    whirlies: cfg.whirlies ? Math.min(4, cfg.whirlies + Math.floor(n / 3)) : 0,
    whirlySpeed: Math.min(6.5, 4.2 + n * 0.2),
    spikes: Math.min(16, 5 + n + (biome.id === 'crystal' ? 5 : 0)),
    holes: biome.id === 'lake' ? Math.min(14, 8 + Math.floor(n / 2)) : 0,
    balls: Math.min(6, Math.floor(level / 2) + (biome.id === 'hills' ? 2 : 0)),
    ballSpeed: Math.min(11, 6.5 + n * 0.3),
    snowmen: biome.id === 'hills' ? 12 : 0,
    huts: biome.id === 'lake' ? 6 : 0,
    timeLimit: 70 + penguins * 40,
  };
}

/** Level score: penguins and fish, plus the seconds and hearts you still have. */
export function finalScore(penguins, fish, secondsLeft, hearts) {
  return penguins * 100 + fish * 10 + Math.max(0, Math.floor(secondsLeft)) * 2 + hearts * 50;
}

export function starsFor(hearts, fish, fishTotal) {
  const greedy = fish >= Math.ceil(fishTotal * 0.5);
  return hearts >= 3 && greedy ? 3 : hearts >= 2 || greedy ? 2 : 1;
}
