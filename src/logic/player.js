// Pure player controller: movement, combo chain, dodge i-frames, skills & cooldowns.
import { MOVES, COMBO, angleDiff } from './combat.js';
import { SPEED_MULT } from './items.js';

export function createPlayer(opts = {}) {
  return {
    x: opts.x || 0, z: opts.z || 0, facing: Math.PI, // face north (-z) toward the first gang
    hp: opts.maxHp || 200, maxHp: opts.maxHp || 200,
    speed: opts.speed || 7.5,
    vx: 0, vz: 0, moveSpeed: 0,
    action: null, actionT: 0, hitsDone: 0,
    comboIdx: 0, comboTimer: 0, queued: null,
    cd: { skill1: 0, skill2: 0, skill3: 0 },
    stun: 0, dead: false, invuln: 0,
    knockX: 0, knockZ: 0,
    sinceHurt: 99, poison: null,
    shield: 0, speedT: 0,            // bubble items: shield = hits it still blocks, speedT = seconds of speed boost left
  };
}

/** Current normalized time of action (0..1). */
export function actionU(p) {
  return p.action ? p.actionT / MOVES[p.action].dur : 0;
}

export function isInvulnerable(p) {
  if (p.invuln > 0) return true;
  if (!p.action) return false;
  const m = MOVES[p.action];
  if (!m.iframes) return false;
  const u = actionU(p);
  return u >= m.iframes[0] && u <= m.iframes[1];
}

function startAction(p, name, input, events) {
  const m = MOVES[name];
  p.action = name;
  p.actionT = 0;
  p.hitsDone = 0;
  p.queued = null;
  // choose facing: joystick direction, else auto-aim target, else keep
  const mag = Math.hypot(input.mx || 0, input.mz || 0);
  if (name !== 'dodge' && input.aimX !== undefined && input.aimX !== null) {
    p.facing = Math.atan2(input.aimX - p.x, input.aimZ - p.z);
  } else if (mag > 0.2) {
    p.facing = Math.atan2(input.mx, input.mz);
  }
  if (m.cd) p.cd[name] = m.cd * (input.cdMult || 1);
  events.push({ type: 'start', move: name });
}

function tryStart(p, name, input, events) {
  if (name.startsWith('skill') && p.cd[name] > 0) return false;
  if (name === 'attack') {
    if (p.comboTimer <= 0) p.comboIdx = 0;
    const move = COMBO[p.comboIdx % COMBO.length];
    p.comboIdx = (p.comboIdx + 1) % COMBO.length;
    p.comboTimer = 0.9;
    startAction(p, move, input, events);
    return true;
  }
  startAction(p, name, input, events);
  return true;
}

/** Requested action from input flags; skills/dodge have priority over attack. */
function requested(input) {
  if (input.dodge) return 'dodge';
  if (input.skill1) return 'skill1';
  if (input.skill2) return 'skill2';
  if (input.skill3) return 'skill3';
  if (input.attack) return 'attack';
  return null;
}

/**
 * Advance the player. input: {mx, mz (-1..1 world dir), attack, dodge, skill1..3 (pressed this frame),
 * aimX/aimZ (auto-aim target or null), cdMult}. Returns events: start / hit {hit} / end.
 * Position integration (desired dx,dz) is returned; collision is applied by the caller.
 */
export function updatePlayer(p, input, dt) {
  const events = [];
  for (const k in p.cd) p.cd[k] = Math.max(0, p.cd[k] - dt);
  p.comboTimer -= dt;
  p.invuln = Math.max(0, p.invuln - dt);
  p.speedT = Math.max(0, (p.speedT || 0) - dt);
  p.sinceHurt += dt;
  let dx = 0, dz = 0;

  // knockback decays
  dx += p.knockX * dt; dz += p.knockZ * dt;
  const kd = Math.exp(-8 * dt);
  p.knockX *= kd; p.knockZ *= kd;

  if (p.dead) return { events, dx: 0, dz: 0 };

  const req = requested(input);

  if (p.stun > 0) {
    p.stun -= dt;
    if (req === 'dodge' && p.stun < 0.2) { p.stun = 0; tryStart(p, 'dodge', input, events); }
    p.moveSpeed = 0;
    return { events, dx, dz };
  }

  if (p.action) {
    const m = MOVES[p.action];
    const u0 = actionU(p);
    p.actionT += dt;
    const u = actionU(p);
    if (req && req !== p.action) p.queued = req;
    else if (req === 'attack' && p.action.startsWith('attack')) p.queued = 'attack';
    // hits
    while (p.hitsDone < m.hits.length && u >= m.hits[p.hitsDone].t) {
      events.push({ type: 'hit', move: p.action, hit: m.hits[p.hitsDone], index: p.hitsDone });
      p.hitsDone++;
    }
    // movement window
    const [a, b, spd] = m.move;
    if (u > a && u0 < b && spd > 0) {
      const overlap = Math.min(u, b) - Math.max(u0, a);
      const dist = spd * overlap * m.dur;
      dx += Math.sin(p.facing) * dist;
      dz += Math.cos(p.facing) * dist;
    }
    if (m.steer) {
      dx += (input.mx || 0) * m.steer * dt;
      dz += (input.mz || 0) * m.steer * dt;
    }
    p.moveSpeed = 0;
    // cancel into queued action
    if (p.queued && u >= (m.cancel || 1)) {
      const q = p.queued;
      p.queued = null;
      if (!(q.startsWith('skill') && p.cd[q] > 0)) {
        events.push({ type: 'end', move: p.action });
        p.action = null;
        tryStart(p, q, input, events);
        return { events, dx, dz };
      }
    }
    if (u >= 1) {
      events.push({ type: 'end', move: p.action });
      p.action = null;
      const q = p.queued; p.queued = null;
      if (q && !(q.startsWith('skill') && p.cd[q] > 0)) tryStart(p, q, input, events);
    }
    return { events, dx, dz };
  }

  if (req) {
    tryStart(p, req, input, events);
    return { events, dx, dz };
  }

  // free movement
  const mag = Math.min(1, Math.hypot(input.mx || 0, input.mz || 0));
  if (mag > 0.08) {
    const target = Math.atan2(input.mx, input.mz);
    const turn = angleDiff(p.facing, target);
    p.facing += turn * Math.min(1, dt * 14);
    const sp = p.speed * mag * (p.speedT > 0 ? SPEED_MULT : 1);
    const h = Math.hypot(input.mx, input.mz);
    dx += (input.mx / h) * sp * dt;
    dz += (input.mz / h) * sp * dt;
    p.moveSpeed = sp;
  } else {
    p.moveSpeed = 0;
  }
  return { events, dx, dz };
}

/**
 * Apply damage to player. Returns true if it landed, 'blocked' if a shield charge absorbed it
 * (no damage, no flinch, a small shove), false if it missed (dead / dodge i-frames).
 */
export function damagePlayer(p, dmg, fromX, fromZ, kb = 6) {
  if (p.dead || isInvulnerable(p)) return false;
  if (p.shield > 0) {
    p.shield--;
    p.invuln = 0.45;                    // a brief grace so one swing can't pop both charges
    const a = Math.atan2(p.x - fromX, p.z - fromZ);
    p.knockX = Math.sin(a) * kb * 0.3; p.knockZ = Math.cos(a) * kb * 0.3;
    return 'blocked';
  }
  p.hp = Math.max(0, p.hp - dmg);
  p.sinceHurt = 0;
  const a = Math.atan2(p.x - fromX, p.z - fromZ);
  p.knockX = Math.sin(a) * kb;
  p.knockZ = Math.cos(a) * kb;
  // super armor during skills: no flinch
  const armored = p.action && p.action.startsWith('skill');
  if (!armored) {
    p.action = null;
    p.queued = null;
    p.stun = 0.35;
  }
  p.invuln = 0.25;
  if (p.hp <= 0) { p.dead = true; p.action = null; }
  return true;
}

/** Damage over time (poison / burning ground): no flinch, but a dodge roll's i-frames still protect. Returns damage dealt. */
export function applyDot(p, dmg) {
  if (p.dead || dmg <= 0 || isInvulnerable(p)) return 0;
  const d = Math.min(p.hp, dmg);
  p.hp -= d; p.sinceHurt = 0;
  if (p.hp <= 0) { p.hp = 0; p.dead = true; p.action = null; }
  return d;
}

/** Venom: refreshes a poison that deals dps damage per second for `dur` seconds. */
export function applyPoison(p, dur = 4, dps = 5) {
  if (p.dead) return;
  p.poison = { t: Math.max(p.poison ? p.poison.t : 0, dur), dps: Math.max(p.poison ? p.poison.dps : 0, dps), acc: p.poison ? p.poison.acc : 0 };
}

/** Tick the poison; damage lands every half second. Returns damage dealt this call. */
export function tickPoison(p, dt) {
  if (!p.poison || p.dead) return 0;
  p.poison.t -= dt; p.poison.acc += dt;
  let dealt = 0;
  while (p.poison.acc >= 0.5) { p.poison.acc -= 0.5; dealt += applyDot(p, p.poison.dps * 0.5); }
  if (p.poison.t <= 0) p.poison = null;
  return dealt;
}

/** Out of combat regeneration. */
export function regen(p, dt, rate = 6) {
  if (!p.dead && p.sinceHurt > 4) p.hp = Math.min(p.maxHp, p.hp + rate * dt);
}
