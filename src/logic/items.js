// Pure item + inventory rules (no DOM / THREE).
//  - ITEMS: the three bubble items (heal, shield, speed boost).
//  - Bag: a 3x3 grid (9 slots). Every slot holds one item type, stacked up to STACK_MAX.
//  - applyItem(): what an item does to the player (logic/player.js reads p.shield / p.speedT).

export const ITEMS = {
  heal:   { id: 'heal',   name: 'Medkit',      icon: '✚', color: 0xff4d6a, css: '#ff4d6a', desc: 'Restores 40% of your health.' },
  shield: { id: 'shield', name: 'Guard Shield', icon: '🛡', color: 0x4aa8ff, css: '#4aa8ff', desc: 'Blocks the next 2 hits.' },
  speed:  { id: 'speed',  name: 'Swift Boots', icon: '⚡', color: 0xffd23a, css: '#ffd23a', desc: 'Move 50% faster for 10 seconds.' },
};
export const ITEM_IDS = Object.keys(ITEMS);

export const BAG_COLS = 3;
export const BAG_ROWS = 3;
export const BAG_SLOTS = BAG_COLS * BAG_ROWS;
export const STACK_MAX = 3;

export const HEAL_FRAC = 0.4;
export const SHIELD_HITS = 2;
export const SPEED_TIME = 10;
export const SPEED_MULT = 1.5;

export function createBag() {
  return { slots: Array.from({ length: BAG_SLOTS }, () => null) };   // null | { type, n }
}

/** Free room for one more `type`? (an unfull stack of that type, or an empty slot) */
export function bagCanTake(bag, type) {
  return bag.slots.some((s) => s === null || (s.type === type && s.n < STACK_MAX));
}

/** Add one item. Fills an existing stack first, otherwise the first empty slot. Returns the slot index, or -1 if full. */
export function bagAdd(bag, type) {
  if (!ITEMS[type]) return -1;
  let i = bag.slots.findIndex((s) => s && s.type === type && s.n < STACK_MAX);
  if (i < 0) i = bag.slots.findIndex((s) => s === null);
  if (i < 0) return -1;
  if (bag.slots[i]) bag.slots[i].n++; else bag.slots[i] = { type, n: 1 };
  return i;
}

/** Remove one item from slot `i`. Returns its type, or null when the slot is empty. */
export function bagTake(bag, i) {
  const s = bag.slots[i];
  if (!s) return null;
  s.n--;
  const type = s.type;
  if (s.n <= 0) bag.slots[i] = null;
  return type;
}

export function bagCount(bag) {
  return bag.slots.reduce((a, s) => a + (s ? s.n : 0), 0);
}

/** Index of the first slot holding `type` (-1 if none). */
export function bagFind(bag, type) {
  return bag.slots.findIndex((s) => s && s.type === type);
}

/** Swap two slots (used by the bag's "move" gesture). */
export function bagSwap(bag, a, b) {
  if (a === b || a < 0 || b < 0 || a >= BAG_SLOTS || b >= BAG_SLOTS) return;
  const t = bag.slots[a]; bag.slots[a] = bag.slots[b]; bag.slots[b] = t;
}

/** Group equal items together (stack merge + stable order heal / shield / speed). */
export function bagSort(bag) {
  const totals = {};
  for (const s of bag.slots) if (s) totals[s.type] = (totals[s.type] || 0) + s.n;
  bag.slots.fill(null);
  let i = 0;
  for (const type of ITEM_IDS) {
    let n = totals[type] || 0;
    while (n > 0) { const k = Math.min(STACK_MAX, n); bag.slots[i++] = { type, n: k }; n -= k; }
  }
}

/**
 * Apply an item to the player. Returns { ok, ...info } — ok is false when it would be wasted
 * (a heal at full health), so the caller keeps the item.
 */
export function applyItem(p, type) {
  if (p.dead) return { ok: false, reason: 'dead' };
  switch (type) {
    case 'heal': {
      if (p.hp >= p.maxHp) return { ok: false, reason: 'full' };
      const before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * HEAL_FRAC));
      return { ok: true, type, healed: Math.round(p.hp - before) };
    }
    case 'shield': {
      if ((p.shield || 0) >= SHIELD_HITS) return { ok: false, reason: 'full' };
      p.shield = SHIELD_HITS;
      return { ok: true, type, hits: p.shield };
    }
    case 'speed': {
      p.speedT = SPEED_TIME;
      return { ok: true, type, time: SPEED_TIME };
    }
    default: return { ok: false, reason: 'unknown' };
  }
}

/** Use the item in slot `i`: only consumed when applyItem succeeds. */
export function useSlot(bag, p, i) {
  const s = bag.slots[i];
  if (!s) return { ok: false, reason: 'empty' };
  const r = applyItem(p, s.type);
  if (r.ok) bagTake(bag, i);
  return r;
}
