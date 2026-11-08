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
