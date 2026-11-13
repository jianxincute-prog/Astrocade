// Pure boss AI: three bosses with their own skill kits, scripted cycles, telegraphs and an enrage phase.
// No DOM / THREE. updateBoss(e, dt, ctx) returns { dx, dz, events } like updateEnemy; main.js turns events into
// hit tests, projectiles / zones / meteors (logic/hazards.js), visuals and sound.
//
//  WOLF KING     (Red Wolves)     fast melee predator: Rending Claws combo, Blood Pounce (telegraphed charge), Blood Howl (shockwave + pack).
//  BLACK DRAGON  (Blue Dragons)   slow zoner: Inferno Breath (sweeping flame cone), Tail Sweep (close punish), Meteor Storm (falling fire).
//  GIANT COBRA   (Golden Cobras)  poison controller: Venom Spit (fan volleys), Coil Strike (long lunge, big punish window), Toxic Pools (zones).
//
// A boss walks a fixed CYCLE of skills (a different one in phase 2), with range gating: a gap-closer when the
// player is far, a punish skill when the player hugs it. After every skill it is vulnerable for `recover` seconds.
import { angleDiff } from './combat.js';

/**
 * Skill spec (times in seconds from cast start):
 *  tele:   [{ t0, t1, shape:'cone'|'circle'|'line', follow:'self'|'aim', ... }]  ground warnings
 *  events: [{ t, type:'strike'|'projectile'|'meteor'|'zone'|'summon'|'cue'|'buff'|'phase', ... }]
 *  ticks:  { t0, t1, every, ev, sweep:[a0,a1] }  repeated strike (flame beam) whose facing sweeps around the locked aim
 *  move:   [{ t0, t1, speed | 'aimLen/<s>' }]    forced movement along the locked aim (dashes)
 *  lockAt: when the aim direction / target point is locked (before that the boss keeps turning to the player)
 *  p2:     (skill) => modified copy used in phase 2
 */
const claw = (t, range, arc, dmg, kb, extra = {}) => ({ t, type: 'strike', shape: 'cone', range, arc, dmg, kb, fx: 'claw', ...extra });

const WOLF = {
  id: 'wolf', name: 'Wolf King', css: '#ff5a44', hp: 400, speed: 5.6, scale: 1.4, keepDist: 2.4, retreatDist: 0, aggro: 30,
  closer: { id: 'pounce', dist: 8 }, punish: null,
  cycle: ['claws', 'pounce', 'claws', 'howl'],
  cycle2: ['pounce', 'claws', 'pounce', 'claws', 'howl'],
  p2: { speed: 1.18, recover: 0.6 },
  skills: {
    claws: {
      name: 'RENDING CLAWS', clip: 'claw', dur: 2.0, recover: 0.9, cd: 0, range: [0, 5.5], lockAt: 99, track: 1.55,
      tele: [
        { t0: 0, t1: 0.52, shape: 'cone', range: 4.4, arc: 150, follow: 'self' },
        { t0: 0.6, t1: 0.84, shape: 'cone', range: 4.4, arc: 150, follow: 'self' },
        { t0: 0.94, t1: 1.18, shape: 'cone', range: 4.4, arc: 150, follow: 'self' },
        { t0: 1.3, t1: 1.58, shape: 'cone', range: 4.8, arc: 200, follow: 'self' },
      ],
      events: [claw(0.52, 4.4, 150, 15, 3), claw(0.84, 4.4, 150, 15, 3), claw(1.18, 4.4, 150, 16, 3), claw(1.58, 4.8, 200, 24, 9, { launch: true })],
      move: [{ t0: 0.44, t1: 0.56, speed: 7 }, { t0: 0.76, t1: 0.88, speed: 7 }, { t0: 1.1, t1: 1.22, speed: 8 }, { t0: 1.5, t1: 1.62, speed: 11 }],
      p2: (s) => ({
        ...s, dur: 2.45, track: 1.95,
        tele: [...s.tele, { t0: 1.66, t1: 1.9, shape: 'cone', range: 4.4, arc: 150, follow: 'self' }],
        events: [claw(0.52, 4.4, 150, 15, 3), claw(0.84, 4.4, 150, 15, 3), claw(1.18, 4.4, 150, 16, 3), claw(1.5, 4.4, 150, 16, 3), claw(1.9, 5.0, 220, 28, 10, { launch: true })],
        move: [...s.move, { t0: 1.82, t1: 1.94, speed: 12 }],
      }),
    },
    pounce: {
      name: 'BLOOD POUNCE', clip: 'pounce', dur: 2.2, recover: 1.2, cd: 4, range: [0, 22], lockAt: 0.42,
      tele: [{ t0: 0, t1: 0.9, shape: 'line', width: 2.6, follow: 'aim' }],
      events: [
        { t: 0.84, type: 'cue', name: 'leap' },
        { t: 1.0, type: 'strike', shape: 'line', width: 2.6, len: 'aim', dmg: 26, kb: 9, launch: true, fx: 'claw' },
        { t: 1.3, type: 'strike', shape: 'circle', r: 3.2, at: 'self', dmg: 18, kb: 10, launch: true, fx: 'slam' },
      ],
      move: [{ t0: 0.9, t1: 1.26, speed: 'aimLen/0.36' }],
    },
    howl: {
      name: 'BLOOD HOWL', clip: 'howl', dur: 2.5, recover: 1.1, cd: 14, range: [0, 60], lockAt: 99,
      tele: [{ t0: 0, t1: 1.05, shape: 'circle', r: 9, follow: 'self' }],
      events: [
        { t: 0.3, type: 'cue', name: 'howl' },
        { t: 1.05, type: 'strike', shape: 'circle', r: 9, at: 'self', dmg: 14, kb: 15, fx: 'howl' },
        { t: 1.2, type: 'summon', n: 2, unit: 'thug', max: 4 },
        { t: 1.2, type: 'buff', what: 'frenzy', dur: 6, p2only: true },
      ],
    },
  },
};

const flame = (extra = {}) => ({ type: 'strike', shape: 'cone', range: 14, arc: 34, dmg: 5, kb: 1.5, dot: true, fx: 'flame', ...extra });
const meteors = (n, from, gap, jitter) => Array.from({ length: n }, (_, i) => ({ t: from + i * gap, type: 'meteor', at: 'player', jitter, delay: 1.1, r: 2.7, dmg: 24, kb: 9, burn: { dur: 3, dps: 8, r: 2.4 } }));

const DRAGON = {
  id: 'dragon', name: 'Black Dragon', css: '#6fd0ff', hp: 480, speed: 3.7, scale: 1.62, keepDist: 8.5, retreatDist: 5, aggro: 34,
  closer: null, punish: { id: 'tail', dist: 4.6 },
  cycle: ['breath', 'meteor', 'breath', 'meteor'],
  cycle2: ['meteor', 'breath', 'tail', 'meteor', 'breath'],
  p2: { speed: 1.15, recover: 0.65 },
  skills: {
    breath: {
      name: 'INFERNO BREATH', clip: 'breath', dur: 3.1, recover: 1.5, cd: 0, range: [3.5, 16], lockAt: 0.95,
      tele: [{ t0: 0, t1: 1.0, shape: 'cone', range: 14, arc: 56, follow: 'self' }],
      ticks: { t0: 1.0, t1: 2.3, every: 0.1, ev: flame(), sweep: [-0.95, 0.95] },
      events: [{ t: 0.6, type: 'cue', name: 'roar' }, { t: 1.0, type: 'cue', name: 'breath' }],
      p2: (s) => ({ ...s, dur: 3.9, ticks: { t0: 1.0, t1: 3.1, every: 0.1, ev: flame({ dmg: 5 }), sweep: [-1.3, 1.3], pingpong: true } }),
    },
    tail: {
      name: 'TAIL SWEEP', clip: 'spin', dur: 1.7, recover: 1.0, cd: 7, range: [0, 6], lockAt: 99,
      tele: [{ t0: 0, t1: 0.8, shape: 'circle', r: 5.6, follow: 'self' }],
      events: [{ t: 0.8, type: 'strike', shape: 'circle', r: 5.6, at: 'self', dmg: 25, kb: 14, launch: true, fx: 'tail' }, { t: 0.82, type: 'cue', name: 'tail' }],
    },
    meteor: {
      name: 'METEOR STORM', clip: 'meteor', dur: 3.4, recover: 1.7, cd: 0, range: [5, 34], lockAt: 99,
      events: [{ t: 0.2, type: 'cue', name: 'roar' }, ...meteors(5, 0.9, 0.4, 0)],
      p2: (s) => ({ ...s, dur: 3.9, events: [{ t: 0.2, type: 'cue', name: 'roar' }, ...meteors(8, 0.9, 0.28, 2.6)] }),
    },
  },
};

const volley = (t, n, spread) => [{ t, type: 'cue', name: 'spit' }, { t, type: 'projectile', kind: 'venom', n, spread, speed: 13, dmg: 9, r: 0.6, life: 1.7, poison: true }];

const COBRA = {
  id: 'cobra', name: 'Giant Cobra', css: '#f0b52a', hp: 450, speed: 4.7, scale: 1.5, keepDist: 6.5, retreatDist: 3.5, aggro: 30,
  closer: { id: 'coil', dist: 13 }, punish: null,
  cycle: ['spit', 'coil', 'pool', 'spit', 'coil'],
  cycle2: ['spit', 'pool', 'coil', 'spit', 'pool', 'coil'],
  p2: { speed: 1.15, recover: 0.65 },
  skills: {
    spit: {
      name: 'VENOM SPIT', clip: 'spit', dur: 1.9, recover: 1.0, cd: 0, range: [4, 20], lockAt: 0.55,
      tele: [{ t0: 0.1, t1: 0.68, shape: 'cone', range: 16, arc: 58, follow: 'self' }],
      events: volley(0.7, 5, 56),
      p2: (s) => ({ ...s, dur: 2.5, events: [...volley(0.7, 5, 56), ...volley(1.2, 7, 84)] }),
    },
    coil: {
      name: 'COIL STRIKE', clip: 'coil', dur: 2.3, recover: 1.6, cd: 5, range: [2, 14], lockAt: 0.55,
      tele: [{ t0: 0, t1: 0.95, shape: 'line', width: 2.3, follow: 'aim' }],
      events: [
        { t: 0.98, type: 'cue', name: 'hiss' },
        { t: 1.08, type: 'strike', shape: 'line', width: 2.3, len: 'aim', dmg: 26, kb: 8, poison: true, fx: 'fang' },
      ],
      move: [{ t0: 0.95, t1: 1.27, speed: 'aimLen/0.32' }],
      p2: (s) => ({
        ...s, dur: 2.7,
        tele: [...s.tele, { t0: 1.5, t1: 1.85, shape: 'cone', range: 4.4, arc: 100, follow: 'self' }],
        events: [...s.events, { t: 1.85, type: 'strike', shape: 'cone', range: 4.4, arc: 100, dmg: 16, kb: 6, poison: true, fx: 'fang' }],
      }),
    },
    pool: {
      name: 'TOXIC POOLS', clip: 'slam', dur: 2.6, recover: 1.1, cd: 9, range: [2, 18], lockAt: 0.8,
      events: [{ t: 0.9, type: 'cue', name: 'slam' }, { t: 0.9, type: 'zone', kind: 'poison', pattern: 'trail', n: 3, r: 2.9, arm: 0.9, dur: 7, dps: 9 }],
      p2: (s) => ({ ...s, events: [{ t: 0.9, type: 'cue', name: 'slam' }, { t: 0.9, type: 'zone', kind: 'poison', pattern: 'ring', n: 5, r: 2.9, arm: 0.9, dur: 8, dps: 10 }] }),
    },
  },
};

const ENRAGE = {
  name: 'ENRAGED!', clip: 'howl', dur: 1.5, recover: 0.3, cd: 0, range: [0, 99], lockAt: 99,
  tele: [{ t0: 0, t1: 0.6, shape: 'circle', r: 7, follow: 'self' }],
  events: [{ t: 0.2, type: 'cue', name: 'roar' }, { t: 0.6, type: 'strike', shape: 'circle', r: 7, at: 'self', dmg: 10, kb: 13, fx: 'howl' }, { t: 0.6, type: 'phase', phase: 2 }],
};

export const BOSSES = [WOLF, DRAGON, COBRA];

// ------------------------------------------------------------------ state
export function createBossState(gang) {
  return {
    gang, phase: 1, mode: 'approach', clock: 0, t: 0, idx: 0, waitT: 0, skill: null, skillId: null, ct: 0, fired: [], tickAcc: 0,
    lastUsed: {}, aim: 0, aimLocked: false, aimLen: 8, origin: { x: 0, z: 0 }, target: { x: 0, z: 0 },
    aimInfo: { ox: 0, oz: 0, facing: 0, len: 8, locked: false }, strafe: 1, queueEnrage: false, frenzyT: 0, recoverDur: 0.8, sweepDir: 1, forced: null,
  };
}

const rnd = (ctx) => (ctx && ctx.rnd ? ctx.rnd() : Math.random());
const ready = (st, def, id) => st.clock - (st.lastUsed[id] ?? -1e9) >= (def.skills[id].cd || 0);
const speedOf = (st, def) => def.speed * (st.phase === 2 ? def.p2.speed : 1) * (st.frenzyT > 0 ? 1.3 : 1);
/** Recovery (vulnerable) time after a skill: shorter in phase 2 and while frenzied. */
const recoverOf = (st, def, sk) => sk.recover * (st.phase === 2 ? def.p2.recover : 1) * (st.frenzyT > 0 ? 0.7 : 1);

/** Force the boss to cast `id` next (debug / tests). */
export function forceSkill(e, id) { e.boss.forced = id; }

function resolve(def, st, id) {
  const base = id === 'enrage' ? ENRAGE : def.skills[id];
  return st.phase === 2 && base.p2 ? base.p2(base) : base;
}

function startCast(e, def, ctx, id, events) {
  const st = e.boss, sk = resolve(def, st, id);
  st.skill = sk; st.skillId = id; st.ct = 0; st.fired = new Array(sk.events ? sk.events.length : 0).fill(false); st.tickAcc = 0; st.mode = 'cast';
  st.aimLocked = false; st.origin = { x: e.x, z: e.z }; st.lastUsed[id] = st.clock;
  st.aim = Math.atan2(ctx.px - e.x, ctx.pz - e.z);
  st.sweepDir = -st.sweepDir;
  st.teleDone = new Array(sk.tele ? sk.tele.length : 0).fill(false);
  e.state = 'attack'; e.t = 0; e.hitDone = false;
  e.cast = { id, name: sk.name, clip: sk.clip, dur: sk.dur, t: 0 };
  events.push({ type: 'cast', id, name: sk.name, dur: sk.dur, gang: e.gang });
}

function pickSkill(e, def, ctx, st) {
  if (st.forced) { const f = st.forced; st.forced = null; return { id: f, advance: false }; }
  const dist = Math.hypot(ctx.px - e.x, ctx.pz - e.z);
  const cycle = st.phase === 2 ? def.cycle2 : def.cycle;
  const id = cycle[st.idx % cycle.length];
  if (def.punish && dist < def.punish.dist && ready(st, def, def.punish.id)) return { id: def.punish.id, advance: false };
  if (def.closer && dist > def.closer.dist && ready(st, def, def.closer.id) && id !== def.closer.id) return { id: def.closer.id, advance: false };
  const sk = def.skills[id], r = sk.range;
  const inRange = dist >= r[0] - 0.5 && dist <= r[1] + 0.5;
  if (!inRange && st.waitT < 2.2) return null;           // keep repositioning for a moment
  if (!ready(st, def, id)) {                              // on cooldown: take the next one in the cycle
    st.idx++;
    return null;
  }
  return { id, advance: true };
}

function eventAt(e, def, ctx, st, ev, events) {
  const sk = st.skill;
  const facing = e.facing;
  switch (ev.type) {
    case 'strike': {
      const o = { type: 'strike', gang: e.gang, shape: ev.shape, dmg: ev.dmg, kb: ev.kb || 0, launch: !!ev.launch, poison: !!ev.poison, dot: !!ev.dot, fx: ev.fx };
      if (ev.shape === 'cone') Object.assign(o, { x: e.x, z: e.z, facing, range: ev.range, arc: ev.arc });
      else if (ev.shape === 'circle') Object.assign(o, { x: e.x, z: e.z, r: ev.r });
      else if (ev.shape === 'line') Object.assign(o, { x: st.origin.x, z: st.origin.z, facing: st.aim, len: ev.len === 'aim' ? st.aimLen : ev.len, width: ev.width });
      events.push(o);
      break;
    }
    case 'projectile': {
      const n = ev.n || 1, spread = ((ev.spread || 0) * Math.PI) / 180;
      for (let i = 0; i < n; i++) {
        const a = st.aim + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
        events.push({ type: 'projectile', gang: e.gang, kind: ev.kind, x: e.x + Math.sin(a) * 1.4, z: e.z + Math.cos(a) * 1.4, vx: Math.sin(a) * ev.speed, vz: Math.cos(a) * ev.speed, r: ev.r, dmg: ev.dmg, life: ev.life, poison: !!ev.poison });
      }
      break;
    }
    case 'meteor': {
      const j = ev.jitter || 0, a = rnd(ctx) * Math.PI * 2, d = rnd(ctx) * j;
      events.push({ type: 'meteor', gang: e.gang, x: ctx.px + Math.cos(a) * d, z: ctx.pz + Math.sin(a) * d, delay: ev.delay, r: ev.r, dmg: ev.dmg, kb: ev.kb || 0, burn: ev.burn });
      break;
    }
    case 'zone': {
      const n = ev.n, dx = ctx.px - e.x, dz = ctx.pz - e.z, dist = Math.hypot(dx, dz) || 1;
      for (let i = 0; i < n; i++) {
        let x, z;
        if (ev.pattern === 'trail') { const f = n === 1 ? 1 : (i + 1) / n; x = e.x + dx * f; z = e.z + dz * f; }
        else { const a = (i / n) * Math.PI * 2 + rnd(ctx) * 0.4; const rr = i === 0 ? 0 : 3.4; x = ctx.px + Math.cos(a) * rr; z = ctx.pz + Math.sin(a) * rr; }
        events.push({ type: 'zone', gang: e.gang, kind: ev.kind, x, z, r: ev.r, arm: ev.arm, dur: ev.dur, dps: ev.dps, poison: ev.kind === 'poison' });
      }
      void dist;
      break;
    }
    case 'summon': events.push({ type: 'summon', gang: e.gang, n: ev.n, unit: ev.unit, max: ev.max, x: e.x, z: e.z }); break;
    case 'buff': if (!ev.p2only || st.phase === 2) { st.frenzyT = ev.dur; events.push({ type: 'buff', gang: e.gang, what: ev.what, dur: ev.dur }); } break;
    case 'phase': events.push({ type: 'phase', gang: e.gang, phase: ev.phase }); break;
    case 'cue': events.push({ type: 'cue', gang: e.gang, name: ev.name, x: e.x, z: e.z }); break;
    default: break;
  }
  void sk; void def;
}

/**
 * Advance a boss. e.boss holds the AI state. Returns { dx, dz, events }.
 * ctx: { px, pz, playerDead, rnd, minions (alive summoned units) }
 */
export function updateBoss(e, dt, ctx) {
  const def = BOSSES[e.gang], st = e.boss, events = [];
  let dx = 0, dz = 0;
  st.clock += dt;
  if (st.frenzyT > 0) st.frenzyT = Math.max(0, st.frenzyT - dt);
  e.moveSpeed = 0;
  const toP = Math.atan2(ctx.px - e.x, ctx.pz - e.z), dist = Math.hypot(ctx.px - e.x, ctx.pz - e.z);
  const turn = (ang, rate) => { e.facing += angleDiff(e.facing, ang) * Math.min(1, rate * dt); };

  if (st.phase === 1 && e.hp <= e.maxHp * 0.5) { st.phase = 2; st.queueEnrage = true; }

  // knocked down / flinched: the cast is cancelled, then a short recovery
  if (e.state === 'stagger') {
    if (st.mode === 'cast') { st.mode = 'recover'; st.skill = null; e.cast = null; st.t = 0; st.recoverDur = 0.5; }
    if (e.t >= (e.staggerDur || 0.4) && e.lift === 0) { e.state = 'chase'; st.mode = 'recover'; st.t = 0; st.recoverDur = 0.5; }
    return { dx, dz, events };
  }

  if (ctx.playerDead) { e.state = 'patrol'; st.mode = 'approach'; st.skill = null; e.cast = null; return { dx, dz, events }; }

  if (e.state === 'patrol') {
    if (dist < def.aggro) { e.state = 'chase'; st.mode = 'approach'; events.push({ type: 'alert', gang: e.gang }); }
    return { dx, dz, events };
  }

  if (st.mode === 'approach' || st.mode === 'recover') {
    e.state = 'chase';
    st.t += dt;
    turn(toP, 7);
    if (st.mode === 'recover') {
      if (st.t >= st.recoverDur) { st.mode = 'approach'; st.t = 0; st.waitT = 0; }
    } else {
      st.waitT += dt;
      // reposition: close in to keepDist, back off if hugged, otherwise strafe
      const sp = speedOf(st, def);
      let mx = 0, mz = 0;
      if (dist > def.keepDist + 0.6) { mx = Math.sin(toP); mz = Math.cos(toP); }
      else if (def.retreatDist && dist < def.retreatDist) { mx = -Math.sin(toP); mz = -Math.cos(toP); }
      else { mx = Math.cos(toP) * st.strafe * 0.45; mz = -Math.sin(toP) * st.strafe * 0.45; if (Math.floor(st.clock / 3) % 2) st.strafe = -st.strafe; }
      dx += mx * sp * dt; dz += mz * sp * dt; e.moveSpeed = Math.hypot(mx, mz) * sp;
      // cast: enrage first, then the cycle
      if (st.queueEnrage && st.skill === null) { st.queueEnrage = false; startCast(e, def, ctx, 'enrage', events); return { dx: 0, dz: 0, events }; }
      if (st.t > 0.35) {
        const pick = pickSkill(e, def, ctx, st);
        if (pick) { if (pick.advance) st.idx++; startCast(e, def, ctx, pick.id, events); return { dx: 0, dz: 0, events }; }
      }
    }
    return { dx, dz, events };
  }

  // ---- casting
  const sk = st.skill, prev = st.ct;
  st.ct += dt; e.t = st.ct;
  if (e.cast) e.cast.t = st.ct;
  // aim: keep turning to the player until locked (or until `track` for the claw combo)
  const lockAt = sk.lockAt ?? 99;
  if (!st.aimLocked) {
    if (st.ct < Math.min(lockAt, sk.track ?? lockAt)) turn(toP, 9);
    if (st.ct >= lockAt) {
      st.aimLocked = true; st.aim = e.facing; st.target = { x: ctx.px, z: ctx.pz };
      st.aimLen = Math.min(15, Math.max(6, dist + 2.5));
    } else st.aim = e.facing;
  } else if (!sk.ticks) e.facing = st.aim;
  else if (sk.ticks) { /* facing is driven by the sweep below */ }
  st.aimInfo = { ox: st.origin.x, oz: st.origin.z, facing: st.aimLocked ? st.aim : e.facing, len: st.aimLocked ? st.aimLen : Math.min(15, Math.max(6, dist + 2.5)), locked: st.aimLocked };
  if (!st.aimLocked) st.aimInfo.ox = e.x, st.aimInfo.oz = e.z;

  // telegraphs start on their t0
  if (sk.tele) sk.tele.forEach((tl, i) => {
    if (!st.teleDone[i] && st.ct >= tl.t0) {
      st.teleDone[i] = true;
      events.push({ type: 'telegraph', gang: e.gang, shape: tl.shape, follow: tl.follow, range: tl.range, arc: tl.arc, r: tl.r, width: tl.width, dur: tl.t1 - tl.t0, id: `${st.skillId}${i}` });
    }
  });

  // scripted events
  if (sk.events) sk.events.forEach((ev, i) => { if (!st.fired[i] && st.ct >= ev.t) { st.fired[i] = true; eventAt(e, def, ctx, st, ev, events); } });

  // repeated strikes with a sweeping facing (flame beam)
  if (sk.ticks) {
    const tk = sk.ticks;
    if (st.ct >= tk.t0 && st.ct <= tk.t1 + 1e-6) {
      const k = (st.ct - tk.t0) / (tk.t1 - tk.t0);
      const sw = tk.pingpong ? Math.sin(k * Math.PI * 2 - Math.PI / 2) : (k * 2 - 1);            // -1..1
      const ang = st.aim + sw * (tk.pingpong ? tk.sweep[1] : tk.sweep[1]) * st.sweepDir;
      e.facing = ang;
      st.tickAcc += dt;
      while (st.tickAcc >= tk.every) { st.tickAcc -= tk.every; eventAt(e, def, ctx, st, tk.ev, events); }
    } else if (st.ct > tk.t1) e.facing = st.aim + 0;
  }

  // forced movement (dashes)
  if (sk.move) for (const m of sk.move) {
    if (st.ct > m.t0 && prev < m.t1) {
      let sp = m.speed;
      if (typeof sp === 'string') { const dur = parseFloat(sp.split('/')[1]); sp = st.aimLen / dur; }
      const a = st.aimLocked ? st.aim : e.facing;
      const step = Math.min(dt, Math.min(st.ct, m.t1) - Math.max(prev, m.t0));
      dx += Math.sin(a) * sp * step; dz += Math.cos(a) * sp * step; e.moveSpeed = sp;
    }
  }

  if (st.ct >= sk.dur) {
    st.mode = 'recover'; st.t = 0; st.recoverDur = recoverOf(st, def, sk);
    st.skill = null; e.cast = null; e.state = 'chase'; e.t = 0;
  }
  return { dx, dz, events };
}
