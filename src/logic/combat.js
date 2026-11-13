// Pure combat data + math: player moves, hit queries, damage.

/**
 * Player moves. Times (hits[].t, move windows, iframes, cancel) are normalized 0..1 of dur.
 * range/arc define the hit sector in front of the attacker (arc in degrees, 360 = all around).
 */
export const MOVES = {
  attack1: { clip: 'jab', dur: 0.36, hits: [{ t: 0.32, range: 2.4, arc: 110, dmg: 10, kb: 2.5 }], move: [0.05, 0.4, 3.5], cancel: 0.55, sfx: 'whoosh' },
  attack2: { clip: 'cross', dur: 0.42, hits: [{ t: 0.38, range: 2.5, arc: 110, dmg: 13, kb: 3.5 }], move: [0.1, 0.45, 4], cancel: 0.6, sfx: 'whoosh' },
  attack3: { clip: 'uppercut', dur: 0.64, hits: [{ t: 0.44, range: 2.6, arc: 120, dmg: 24, kb: 8, launch: true }], move: [0.25, 0.5, 5], cancel: 0.8, sfx: 'whoosh' },
  dodge: { clip: 'dodge', dur: 0.55, hits: [], move: [0.0, 0.8, 13], iframes: [0.0, 0.8], cancel: 0.82 },
  skill1: { clip: 'slam', dur: 1.1, hits: [{ t: 0.56, range: 5.5, arc: 360, dmg: 38, kb: 11, launch: true, fx: 'slam' }], move: [0.2, 0.5, 4], cd: 6, iframes: [0.25, 0.56], label: 'Earth Slam' },
  skill2: { clip: 'spin', dur: 1.3, hits: [0.22, 0.36, 0.5, 0.64, 0.78].map((t) => ({ t, range: 3.4, arc: 360, dmg: 9, kb: 3.5, fx: 'spin' })), move: [0.1, 0.9, 0], steer: 5, cd: 8, label: 'Storm Spin' },
  skill3: { clip: 'rush', dur: 1.0, hits: [
    { t: 0.3, range: 2.4, arc: 160, dmg: 14, kb: 6 },
    { t: 0.46, range: 2.4, arc: 160, dmg: 14, kb: 6 },
    { t: 0.72, range: 3.0, arc: 120, dmg: 32, kb: 13, launch: true, fx: 'burst' },
  ], move: [0.12, 0.58, 20], cd: 10, label: 'Bull Rush' },
};

export const COMBO = ['attack1', 'attack2', 'attack3'];

/** Shortest signed angle difference. */
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Facing angle convention: facing 0 looks along +z; x = sin(f), z = cos(f). */
export function facingTo(fromX, fromZ, toX, toZ) {
  return Math.atan2(toX - fromX, toZ - fromZ);
}

/** Is target (with radius tr) inside attacker's hit sector? */
export function inHitSector(ax, az, facing, tx, tz, range, arcDeg, tr = 0.5) {
  const dx = tx - ax, dz = tz - az;
  const d = Math.hypot(dx, dz);
  if (d > range + tr) return false;
  if (arcDeg >= 360 || d < 0.6) return true;
  const ang = Math.atan2(dx, dz);
  return Math.abs(angleDiff(facing, ang)) <= (arcDeg * Math.PI) / 360;
}

/** Damage with combo scaling: up to +50% at a 20 hit combo. */
export function computeDamage(base, mult, combo) {
  const comboBonus = 1 + Math.min(combo, 20) * 0.025;
  return Math.round(base * mult * comboBonus);
}

/** Nearest living target within radius, for auto-aim. */
export function nearestTarget(x, z, targets, radius) {
  let best = null, bd = radius;
  for (const t of targets) {
    if (t.dead) continue;
    const d = Math.hypot(t.x - x, t.z - z);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}

/** Score for defeating an enemy. */
export function killScore(isBoss, combo) {
  return (isBoss ? 2500 : 100) + Math.min(combo, 50) * 10;
}
