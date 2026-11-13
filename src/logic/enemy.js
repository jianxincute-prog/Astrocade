// Pure gang-member AI: patrol -> chase -> windup/strike -> recover, stagger, death.
import { angleDiff } from './combat.js';
import { BOSSES, createBossState, updateBoss } from './boss.js';

export const ENEMY_TYPES = {
  thug: { hp: 40, speed: 4.6, dmg: 10, range: 1.9, windup: 0.5, dur: 0.9, hitT: 0.58, clip: 'swing', scale: 1.0, aggro: 16, weapon: 'none' },
  bat: { hp: 55, speed: 4.2, dmg: 15, range: 2.3, windup: 0.5, dur: 0.95, hitT: 0.58, clip: 'swing', scale: 1.04, aggro: 16, weapon: 'bat' },
  boss: { hp: 420, speed: 4.0, dmg: 28, range: 3.4, windup: 0.6, dur: 1.3, hitT: 0.62, clip: 'smash', scale: 1.45, aggro: 26, weapon: 'none', aoe: true },
};

export function createEnemy(type, gang, x, z, mult = 1) {
  const t = ENEMY_TYPES[type];
  const baseHp = type === 'boss' ? BOSSES[gang].hp : t.hp; // every boss has its own health pool and skill kit (logic/boss.js)
  return {
    type, gang, x, z, homeX: x, homeZ: z,
    hp: Math.round(baseHp * mult), maxHp: Math.round(baseHp * mult),
    facing: Math.random() * Math.PI * 2,
    state: 'patrol', t: 0, wanderX: x, wanderZ: z, wanderT: 0,
    moveSpeed: 0, knockX: 0, knockZ: 0, lift: 0, liftV: 0,
    dead: false, deadT: 0, hitDone: false, cool: Math.random(),
    isBoss: type === 'boss',
    boss: type === 'boss' ? createBossState(gang) : null, cast: null,
  };
}

/**
 * ctx: { px, pz, playerDead, attackSlots (shared counter {used,max}), rnd }
 * Returns { dx, dz, events } — events: { type:'strike' } when the attack connects frame.
 */
export function updateEnemy(e, dt, ctx) {
  const T = ENEMY_TYPES[e.type];
  const events = [];
  let dx = e.knockX * dt, dz = e.knockZ * dt;
  const kd = Math.exp(-6 * dt);
  e.knockX *= kd; e.knockZ *= kd;
  // airborne launch
  if (e.lift > 0 || e.liftV > 0) {
    e.liftV -= 30 * dt;
    e.lift = Math.max(0, e.lift + e.liftV * dt);
    if (e.lift === 0) e.liftV = 0;
  }
  e.t += dt;
  e.cool -= dt;
  if (e.dead) { e.deadT += dt; e.moveSpeed = 0; e.cast = null; return { dx, dz, events }; }
  if (e.isBoss) { const r = updateBoss(e, dt, ctx); return { dx: dx + r.dx, dz: dz + r.dz, events: r.events }; }

  const ddx = ctx.px - e.x, ddz = ctx.pz - e.z;
  const dist = Math.hypot(ddx, ddz);
  const toP = Math.atan2(ddx, ddz);
  const turnTo = (ang, rate) => { e.facing += angleDiff(e.facing, ang) * Math.min(1, rate * dt); };
  e.moveSpeed = 0;

  switch (e.state) {
    case 'patrol': {
      e.wanderT -= dt;
      if (e.wanderT <= 0) {
        const r = ctx.rnd ? ctx.rnd() : Math.random();
        const r2 = ctx.rnd ? ctx.rnd() : Math.random();
        e.wanderX = e.homeX + (r - 0.5) * 14;
        e.wanderZ = e.homeZ + (r2 - 0.5) * 14;
        e.wanderT = 3 + r * 4;
      }
      const wx = e.wanderX - e.x, wz = e.wanderZ - e.z;
      const wd = Math.hypot(wx, wz);
      if (wd > 0.8) {
        const sp = T.speed * 0.35;
        dx += (wx / wd) * sp * dt; dz += (wz / wd) * sp * dt;
        turnTo(Math.atan2(wx, wz), 6);
        e.moveSpeed = sp;
      }
      if (!ctx.playerDead && dist < T.aggro) { e.state = 'chase'; events.push({ type: 'alert' }); }
      break;
    }
    case 'chase': {
      if (ctx.playerDead || dist > T.aggro * 2.2) { e.state = 'patrol'; break; }
      turnTo(toP, 10);
      const slots = ctx.attackSlots;
      if (dist <= T.range * 0.9) {
        if (e.cool <= 0 && (!slots || slots.used < slots.max)) {
          if (slots) slots.used++;
          e.state = 'attack'; e.t = 0; e.hitDone = false;
          events.push({ type: 'windup' });
        } else {
          // circle / hold distance while waiting for a slot
          const side = Math.sin(e.homeX * 7.3 + e.t * 0.8) > 0 ? 1 : -1;
          const sx = Math.cos(toP) * side, sz = -Math.sin(toP) * side;
          const sp = T.speed * 0.3;
          dx += sx * sp * dt; dz += sz * sp * dt;
          e.moveSpeed = sp;
        }
      } else {
        const sp = T.speed * (dist > 6 ? 1 : 0.7);
        dx += (ddx / dist) * sp * dt; dz += (ddz / dist) * sp * dt;
        e.moveSpeed = sp;
      }
      break;
    }
    case 'attack': {
      const u = e.t / T.dur;
      if (u < T.windup) turnTo(toP, 5);
      if (!e.hitDone && u >= T.hitT) {
        e.hitDone = true;
        events.push({ type: 'strike', range: T.range, dmg: T.dmg, aoe: !!T.aoe });
      }
      if (u >= 1) {
        e.state = 'chase';
        e.cool = 0.8 + (ctx.rnd ? ctx.rnd() : Math.random()) * 1.2;
        if (ctx.attackSlots) ctx.attackSlots.used = Math.max(0, ctx.attackSlots.used - 1);
      }
      break;
    }
    case 'stagger': {
      if (e.t >= (e.staggerDur || 0.4) && e.lift === 0) { e.state = 'chase'; e.cool = Math.max(e.cool, 0.3); }
      break;
    }
  }
  return { dx, dz, events };
}

/** Apply a player hit. Returns { killed }. Bosses have super armor except on launchers. */
export function damageEnemy(e, dmg, fromX, fromZ, kb, launch, ctx) {
  if (e.dead) return { killed: false };
  e.hp -= dmg;
  const a = Math.atan2(e.x - fromX, e.z - fromZ);
  const kbm = e.isBoss ? 0.3 : 1;
  e.knockX = Math.sin(a) * kb * kbm * 1.5;
  e.knockZ = Math.cos(a) * kb * kbm * 1.5;
  const wasAttacking = e.state === 'attack';
  const armor = e.isBoss && wasAttacking && !launch;
  if (!armor) {
    if (wasAttacking && !e.isBoss && ctx && ctx.attackSlots) ctx.attackSlots.used = Math.max(0, ctx.attackSlots.used - 1);
    e.state = 'stagger'; e.t = 0; e.staggerDur = e.isBoss ? 0.25 : 0.42;
    if (launch && !e.isBoss) { e.liftV = 9; e.lift = 0.01; e.staggerDur = 0.7; }
  }
  if (e.hp <= 0) {
    if (e.state === 'attack' && !e.isBoss && ctx && ctx.attackSlots) ctx.attackSlots.used = Math.max(0, ctx.attackSlots.used - 1);
    e.hp = 0; e.dead = true; e.state = 'dead'; e.deadT = 0;
    return { killed: true };
  }
  return { killed: false };
}
