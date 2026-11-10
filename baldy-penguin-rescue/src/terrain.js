// Pure world rules: valley shape, landmarks, seeded placement. No Three.js here.

export const WORLD = {
  radius: 112,          // playable radius (metres)
  size: 300,            // terrain mesh edge
  pond: { x: 58, z: -44, r: 17 },
  homeRadius: 9,        // penguins are delivered inside this distance of the igloo
};

export function smooth(a, b, v) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Ground height. Flat around the igloo and the pond, rising into a rim at the edge. */
export function heightAt(x, z, home) {
  let h = 2.4 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.04)
        + 1.5 * Math.sin(x * 0.09 + z * 0.07)
        + 0.6 * Math.sin(z * 0.16 - x * 0.05);
  h *= smooth(10, 28, Math.hypot(x - home.x, z - home.z));
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
  const dx = x - WORLD.pond.x, dz = z - WORLD.pond.z, d = Math.hypot(dx, dz), min = WORLD.pond.r + 32;
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
export function layoutWorld(home, penguinCount, fishCount, seed = 20261) {
  const rand = rng(seed);
  const solid = [{ x: home.x, z: home.z, r: 12 }];          // keep-clear zones while placing
  const pond = { x: WORLD.pond.x, z: WORLD.pond.z, r: WORLD.pond.r + 3 };
  const trees = [], rocks = [];
  // forest clumps
  const clumps = [];
  for (let i = 0; i < 16; i++) clumps.push(freeSpot(rand, home, [pond], 26, 6, WORLD.radius - 8));
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
  for (let i = 0; i < 26; i++) {
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
  return { trees, rocks, penguins, fish };
}

/** Score: every penguin and fish counts, and a quick rescue adds a time bonus. */
export function finalScore(penguins, fish, seconds) {
  return penguins * 100 + fish * 10 + Math.max(0, 600 - Math.floor(seconds)) ;
}

export function starsFor(fish, fishTotal, seconds, penguins) {
  let stars = 1;
  if (fish >= Math.ceil(fishTotal * 0.5) || seconds < penguins * 40) stars = 2;
  if (fish >= Math.ceil(fishTotal * 0.8) || seconds < penguins * 25) stars = 3;
  return stars;
}
