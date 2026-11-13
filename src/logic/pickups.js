// Pure floating-bubble pickups: spawning, drifting toward the player, collecting, expiring.
// A bubble holds one item type (see logic/items.js). No DOM / THREE.
import { ITEM_IDS } from './items.js';

export const PICK_RADIUS = 1.5;      // collect distance (centre to centre)
export const MAGNET_RADIUS = 3.2;    // bubbles drift toward the player inside this
export const BUBBLE_LIFE = 45;       // seconds before a bubble pops by itself
export const MAX_BUBBLES = 7;

export function createPickups() {
  return { list: [], nextId: 1, spawnT: 5, fullT: 0 };
}

export function addPickup(st, type, x, z, life = BUBBLE_LIFE) {
  const b = { id: st.nextId++, type, x, z, life, age: 0, vx: 0, vz: 0 };
  st.list.push(b);
  return b;
}

/** Random item type; heal gets likelier the lower the player's health is. */
export function randomType(rnd, hpFrac = 1) {
  const wHeal = 0.34 + (1 - hpFrac) * 0.4, wShield = 0.33, wSpeed = 0.3;
  let r = rnd() * (wHeal + wShield + wSpeed);
  if ((r -= wHeal) < 0) return 'heal';
  if ((r -= wShield) < 0) return 'shield';
  return 'speed';
}

/** Items a defeated enemy drops: a small chance for a normal enemy, a guaranteed pair for a boss. */
export function dropsFor(rnd, isBoss, hpFrac = 1) {
  if (isBoss) return ['heal', rnd() < 0.5 ? 'shield' : 'speed', randomType(rnd, hpFrac)];
  return rnd() < 0.22 ? [randomType(rnd, hpFrac)] : [];
}

/**
 * Advance the bubbles. `canTake(type)` says whether the bag has room.
 * Returns events: { type:'collect', pick } | { type:'expire', pick } | { type:'full', pick }.
 */
export function updatePickups(st, dt, px, pz, canTake) {
  const events = [];
  st.fullT = Math.max(0, st.fullT - dt);
  for (const b of st.list) {
    b.age += dt; b.life -= dt;
    const dx = px - b.x, dz = pz - b.z, d = Math.hypot(dx, dz);
    if (d < MAGNET_RADIUS && d > 1e-3 && (!canTake || canTake(b.type))) {
      const k = (1 - d / MAGNET_RADIUS) * 9 + 1.2;         // faster as it gets closer
      b.x += (dx / d) * k * dt; b.z += (dz / d) * k * dt;
    }
    if (d < PICK_RADIUS) {
      if (!canTake || canTake(b.type)) { b.life = -1; b.collected = true; events.push({ type: 'collect', pick: b }); }
      else if (st.fullT <= 0) { st.fullT = 1.5; events.push({ type: 'full', pick: b }); }
    } else if (b.life <= 0) events.push({ type: 'expire', pick: b });
  }
  st.list = st.list.filter((b) => b.life > 0);
  return events;
}

/**
 * Timed spawner: every 12-20 s (when under the cap) a bubble appears 10-26 m from the player.
 * ctx: { rnd, px, pz, hpFrac, free(x,z)->bool }
 */
export function stepSpawner(st, dt, ctx) {
  st.spawnT -= dt;
  if (st.spawnT > 0) return null;
  st.spawnT = 12 + ctx.rnd() * 8;
  if (st.list.length >= MAX_BUBBLES) return null;
  for (let t = 0; t < 10; t++) {
    const a = ctx.rnd() * Math.PI * 2, d = 10 + ctx.rnd() * 16;
    const x = ctx.px + Math.cos(a) * d, z = ctx.pz + Math.sin(a) * d;
    if (ctx.free(x, z)) return addPickup(st, randomType(ctx.rnd, ctx.hpFrac), x, z);
  }
  return null;
}

export { ITEM_IDS };
