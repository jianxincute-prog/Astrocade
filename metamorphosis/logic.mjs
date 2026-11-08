// Pure rules for Metamorphosis. No browser or Astrocade globals live in this module.
export const WORLD_HALF = 150;
export const GROWTH_GOAL = 100;
export const STAGE_STEPS = [33, 66, 100];          // energy needed to reach stage 1, stage 2, cocoon
export const COMBO_WINDOW = 3.2;                   // seconds between pollen pickups to keep a combo alive
export const FOOD_ENERGY = { leaf: 1.6, nectar: 3.4, golden: 8 };
export const FLIGHT_BONUS_CAP = 15;                 // golden flowers can add at most this many seconds in total

export function clampPosition(x, z, bounds = WORLD_HALF - 6) {
  return { x: Math.max(-bounds, Math.min(bounds, x)), z: Math.max(-bounds, Math.min(bounds, z)) };
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// 0 = Tiny Tendril, 1 = Leaf Lumberer, 2 = Plump & Prickly, 3 = cocoon ready
export function growthStage(energy) {
  if (energy >= STAGE_STEPS[2]) return 3;
  if (energy >= STAGE_STEPS[1]) return 2;
  if (energy >= STAGE_STEPS[0]) return 1;
  return 0;
}

export function addNourishment(state, amount) {
  const energy = Math.min(GROWTH_GOAL, Math.max(0, state.energy + amount));
  return { ...state, energy, stage: growthStage(energy), foodEaten: (state.foodEaten || 0) + 1 };
}

export function movePlayer(state, direction, dt, speed = 13, bounds = WORLD_HALF - 6) {
  const step = Math.min(0.11, Math.max(0, dt));
  const length = Math.hypot(direction.x || 0, direction.z || 0);
  const scale = length > 1 ? 1 / length : 1;
  const dx = (direction.x || 0) * scale;
  const dz = (direction.z || 0) * scale;
  const pos = clampPosition(state.x + dx * speed * step, state.z + dz * speed * step, bounds);
  return {
    ...state,
    ...pos,
    invulnerable: Math.max(0, (state.invulnerable || 0) - step),
    burstCooldown: Math.max(0, (state.burstCooldown || 0) - step),
  };
}

// `shielded` is a separate flag (molt / spinning silk) so protection can never leak into later phases.
export function takeHit(state, damage = 1) {
  if ((state.invulnerable || 0) > 0 || state.shielded || state.health <= 0) return { ...state, hit: false };
  const health = Math.max(0, state.health - damage);
  return { ...state, health, invulnerable: 1.45, hit: true, alive: health > 0 };
}

export function burstEnemies(player, enemies, radius = 15, pushDistance = 12, stunSeconds = 2.1) {
  return enemies.map((enemy) => {
    const dx = enemy.x - player.x;
    const dz = enemy.z - player.z;
    const d = Math.hypot(dx, dz);
    if (d > radius) return { ...enemy };
    const nx = d > 0.001 ? dx / d : 1;
    const nz = d > 0.001 ? dz / d : 0;
    return {
      ...enemy,
      x: enemy.x + nx * pushDistance,
      z: enemy.z + nz * pushDistance,
      stun: Math.max(enemy.stun || 0, stunSeconds),
      knocked: true,
    };
  });
}

export function canBeginCocoon(state) {
  return state.energy >= GROWTH_GOAL && !state.cocooning && !state.complete;
}

// ---- molt abilities: each stage makes the little one a bit tougher
export function abilitiesForStage(stage) {
  return {
    burstRadius: stage >= 1 ? 24 : 19,
    burstPush: stage >= 1 ? 18 : 15,
    burstCooldown: stage >= 1 ? 4.5 : 5.5,
    speed: stage >= 2 ? 14.6 : 13,
    magnet: stage >= 2 ? 4.4 : 2.45,
  };
}

// ---- chapter pacing: predators wake up chapter by chapter and get quicker at night
export function enemySpeedFactor(stage) {
  return [1, 1.2, 1.45][Math.max(0, Math.min(2, stage))];
}

export function predatorMinStage(kind, indexOfKind) {
  if (kind === 'spider') return indexOfKind < 2 ? 1 : 2;
  return indexOfKind < 3 ? 0 : indexOfKind < 5 ? 1 : 2;
}

// ---- cocoon defence
export function cocoonDrain(enemyKind, stunned) {
  if (stunned) return 0;
  return enemyKind === 'spider' ? 4.8 : 3.6;
}

// ---- butterfly pollen scoring
export function comboMultiplier(combo) {
  return Math.min(5, 1 + Math.floor(combo / 3));
}

export function registerPollen(state, base, now) {
  const alive = state.lastPollenAt != null && now - state.lastPollenAt <= COMBO_WINDOW;
  const combo = alive ? state.combo + 1 : 1;
  const gained = base * comboMultiplier(combo);
  return { ...state, combo, maxCombo: Math.max(state.maxCombo || 0, combo), lastPollenAt: now, score: (state.score || 0) + gained, gained };
}

export function comboAlive(state, now) {
  return state.lastPollenAt != null && now - state.lastPollenAt <= COMBO_WINDOW && state.combo > 0;
}

export function finalScore({ pollen = 0, health = 0, integrity = 0 }) {
  return Math.round(pollen + health * 60 + integrity * 1.5);
}

export function starRating(score) {
  if (score >= 3000) return 3;
  if (score >= 1800) return 2;
  if (score >= 800) return 1;
  return 0;
}

// ---- P2: obstacles (trees and bushes block movement and make real cover)
export function pushOutOfCircles(x, z, circles, pad = 0) {
  let nx = x, nz = z;
  for (const c of circles) {
    const dx = nx - c.x, dz = nz - c.z, rr = c.r + pad, d2 = dx * dx + dz * dz;
    if (d2 < rr * rr) {
      const d = Math.sqrt(d2) || 0.001;
      nx = c.x + (dx / d || 1) * rr; nz = c.z + (dz / d || 0) * rr;
    }
  }
  return { x: nx, z: nz };
}

// ---- P2: the Giant Toad mini-boss that guards the end of chapter 3
export const BOSS = { hp: 3, gate: 95, hopRadius: 8, lashLength: 26, lashWidth: 3.4, hitReach: 17, giveUpAfter: 85 };

export function bossShouldAppear(state, bossActive, bossDone) {
  return state.stage === 2 && state.energy >= BOSS.gate && !bossActive && !bossDone;
}

// the growth bar stops at the gate until the toad has been dealt with
export function capEnergyForBoss(energy, bossDone) {
  return bossDone ? energy : Math.min(energy, BOSS.gate);
}

// the toad gets quicker once it is down to its last hit point
export function bossTimings(hp) {
  return hp <= 1 ? { windup: 0.8, lash: 0.65, rest: 2.0 } : { windup: 1.1, lash: 0.9, rest: 2.4 };
}

// forward is -z rotated by `ry` (same convention as every creature in the game)
export function lashHits(origin, ry, p, length = BOSS.lashLength, width = BOSS.lashWidth) {
  const fx = -Math.sin(ry), fz = -Math.cos(ry), dx = p.x - origin.x, dz = p.z - origin.z;
  const along = dx * fx + dz * fz, lateral = Math.abs(dx * fz - dz * fx);
  return along > 0 && along < length && lateral < width / 2 + 0.9;
}

export function bossCanBeHit(mode, distanceToPlayer) {
  return mode === 'rest' && distanceToPlayer < BOSS.hitReach;
}

// Slide along an obstacle instead of sticking to it: whatever pressed into the trunk is turned into sideways motion.
export function slideAroundCircles(prev, next, circles, pad = 0) {
  let x = next.x, z = next.z;
  for (const c of circles) {
    const rr = c.r + pad, dx = x - c.x, dz = z - c.z, d2 = dx * dx + dz * dz;
    if (d2 >= rr * rr) continue;
    const d = Math.sqrt(d2) || 0.001, nx = dx / d, nz = dz / d;
    const mx = next.x - prev.x, mz = next.z - prev.z, into = Math.max(0, -(mx * nx + mz * nz));
    const sign = (mx * -nz + mz * nx) >= 0 ? 1 : -1;
    x = c.x + nx * rr + -nz * sign * into * 0.9; z = c.z + nz * rr + nx * sign * into * 0.9;
  }
  return { x, z };
}
