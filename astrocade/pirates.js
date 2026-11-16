/* Pirates - pure rules (no DOM / window / lib).
 * Pirates are not a fifth people: they are a separate, wicked kind of creature. Rebels of unhappy kingdoms (humans, elves, dwarves
 * and orcs alike) turn pirate and take a hideout on a small empty island. Whatever their birth, every pirate is one kind. */

export const PIRATE = {
  unrestMin: 40,          // a kingdom is restless enough to lose people to piracy
  minPop: 14,             // and big enough to spare a crew
  cooldown: 900,          // ticks between two mutinies in the world
  maxPirates: 24,         // living pirates at most
  maxBases: 2,
  band: [3, 5],           // rebels per mutiny
  isle: [10, 220],        // land tiles of an island that can hold a hideout
  dist: [12, 110],        // tiles between the mutinous kingdom and the hideout
  idleLimit: 3000,        // an empty hideout is abandoned after this many ticks
};
export const ORIGIN_RACES = ['human', 'elf', 'dwarf', 'orc'];      // werewolves never turn pirate
export const BASE_NAMES = ['Skull Cove', 'Rum Rock', 'Black Reef', "Dead Man's Isle", 'Cutthroat Bay', 'Gallows Point', 'Rotten Keel', 'Bone Harbor'];

/** A pirate raid: a ship of up to four pirates sails to a rich coastal kingdom, shells and plunders it for a while, then goes home. */
export const RAID = { minCrew: 3, maxCrew: 4, shipHp: 70, cooldown: 900, stay: 360, range: 120, maxRoute: 220, fleeFrac: .2, volley: 30, speed: .3, shootRange: 5 };
/** What one volley of plunder takes from a kingdom. */
export function raidLoot(k) { return { gold: Math.min(k.gold || 0, 1.5), food: Math.min(k.food || 0, 5), wood: Math.min(k.wood || 0, 3) }; }
/** Damage per 40 ticks that the shore does to a raiding ship: soldiers near the coast and the age of the realm (towers, cannons). */
export function raidDefence(soldiersNear, age) { return 2 * Math.min(6, soldiersNear) + (age >= 3 ? 4 : age >= 2 ? 2 : 0); }
/** Richer and closer kingdoms are better targets. */
export function raidTargetScore(k, dist) { return ((k.gold || 0) + (k.food || 0) * .3 + (k.wood || 0) * .2) / (30 + dist); }
/** Chance that a returning ship brings a new recruit: more loot, more pirates, up to the cap. */
export function recruitChance(loot, pirates) { return pirates >= PIRATE.maxPirates ? 0 : Math.min(.7, .25 + loot * .02); }
/** What an ally or trade partner sends to a raided kingdom (nothing when it is too poor). */
export function aidAmount(giverGold) { return giverGold >= 20 ? 6 : 0; }

/** Chance that a kingdom loses a crew in this check (0 when it is calm or too small). */
export function defectionChance(k) {
  if (!ORIGIN_RACES.includes(k.race) || k.pop < PIRATE.minPop || k.level < 1 || k.unrest < PIRATE.unrestMin) return 0;
  return Math.min(.6, (k.unrest - 35) / 80 + (k.food <= 0 ? .1 : 0));
}
/** How many rebels leave: a fifth of the people, 3 to 5. */
export function bandSize(pop, rnd = Math.random) {
  const n = Math.round(pop * .2); return Math.max(PIRATE.band[0], Math.min(PIRATE.band[1], n + (rnd < .3 ? 1 : 0)));
}

/** Label the land islands. isLand(tile) -> bool. Returns { label: Int32Array (0 = sea, 1.. = island), list: [{ id, size, cx, cy }] }. */
export function islandsOf(tiles, W, H, isLand) {
  const label = new Int32Array(W * H), list = [], st = [];
  for (let s = 0; s < W * H; s++) {
    if (label[s] || !isLand(tiles[s])) continue;
    const id = list.length + 1; let size = 0, sx = 0, sy = 0; st.length = 0; st.push(s); label[s] = id;
    while (st.length) {
      const i = st.pop(), x = i % W, y = (i / W) | 0; size++; sx += x; sy += y;
      if (x > 0 && !label[i - 1] && isLand(tiles[i - 1])) { label[i - 1] = id; st.push(i - 1); }
      if (x < W - 1 && !label[i + 1] && isLand(tiles[i + 1])) { label[i + 1] = id; st.push(i + 1); }
      if (y > 0 && !label[i - W] && isLand(tiles[i - W])) { label[i - W] = id; st.push(i - W); }
      if (y < H - 1 && !label[i + W] && isLand(tiles[i + W])) { label[i + W] = id; st.push(i + W); }
    }
    list.push({ id, size, cx: sx / size, cy: sy / size });
  }
  return { label, list };
}

/**
 * The island for a hideout: small, empty (no kingdom, house or hideout), neither the mutineers' own island nor too close or too far.
 * isles: [{ id, size, cx, cy, busy }] (busy = a kingdom, house or hideout stands on it), from: { x, y, isle }.
 * Prefers a distance around 30 tiles. Returns the island or null.
 */
export function pickIsle(isles, from, rnd = Math.random) {
  let best = null, bs = 1e9;
  for (const s of isles) {
    if (s.busy || s.id === from.isle || s.size < PIRATE.isle[0] || s.size > PIRATE.isle[1]) continue;
    const d = Math.hypot(s.cx - from.x, s.cy - from.y); if (d < PIRATE.dist[0] || d > PIRATE.dist[1]) continue;
    const sc = Math.abs(d - 30) + rnd * 12; if (sc < bs) { bs = sc; best = s; }
  }
  return best;
}

/** The hideout tile: land of the island with the most land neighbours close to its middle (ok(tile index) says it is flat and free). */
export function baseTile(label, id, W, H, cx, cy, ok) {
  let best = -1, bs = -1e9;
  const x0 = Math.max(1, Math.floor(cx) - 14), x1 = Math.min(W - 2, Math.ceil(cx) + 14), y0 = Math.max(1, Math.floor(cy) - 14), y1 = Math.min(H - 2, Math.ceil(cy) + 14);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = x + y * W; if (label[i] !== id || !ok(i)) continue;
    let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (label[i + dx + dy * W] === id) n++;
    const sc = n * 3 - Math.hypot(x - cx, y - cy); if (sc > bs) { bs = sc; best = i; }
  }
  return best;
}
