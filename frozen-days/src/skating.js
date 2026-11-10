// Skater state + physics: walking on snow, gliding on ice, balance, falling and getting up.
import { clamp, lerp, ease, approach } from './util.js';
import { skillsFor } from './config.js';
import { MAP_HALF } from './world.js';

export const SPAWN = { x: 0, z: 34, h: Math.PI };

export function createSkater() {
  return {
    x: SPAWN.x, z: SPAWN.z, h: SPAWN.h, vx: 0, vz: 0,
    speed: 0, vf: 0, vl: 0,
    mode: 'skate', state: 'ok', t: 0,
    b: 0, warned: false,
    stride: 0, strideAmp: 0, fallAmt: 0, fallDir: -1,
    steer: 0, steerS: 0, push: 0, brake: 0,
    falls: 0, dist: 0, events: [],
    spin: null, spinAng: 0,
  };
}

export function respawn(p) {
  const keep = { falls: p.falls, dist: p.dist, events: p.events };
  Object.assign(p, createSkater(), keep);
}

function startFall(p, reason) {
  p.state = 'falling'; p.t = 0; p.falls++; p.spin = null; p.spinAng = 0;
  p.fallDir = reason === 'turn' ? 1 : -1;
  p.events.push({ type: 'fall', reason, speed: p.speed });
}

export function updateSkater(p, inp, dt, c, world) {
  const sk = c.skills || skillsFor(c.level);
  const ok = p.state === 'ok';
  const steer = ok ? inp.steer : 0, push = ok ? inp.push : 0, brake = ok ? inp.brake : 0;
  p.push = push; p.brake = brake;
  // Steering has inertia on ice (edges take a moment to bite); snow turns respond faster.
  const onIce0 = world.onIce(p.x, p.z);
  p.steerS = approach(p.steerS, steer, (onIce0 ? lerp(4, 7, sk.control) : 12) * dt);
  p.steer = p.steerS;
  const onIce = world.onIce(p.x, p.z);
  p.mode = onIce ? 'skate' : 'walk';
  let speed = Math.hypot(p.vx, p.vz);
  if (inp.spin && ok && !p.spin) {
    if (onIce0 && c.spinUnlocked && speed > 2) { p.spin = { t: 0 }; p.events.push({ type: 'spinstart' }); }
    else p.events.push({ type: 'spinfail', reason: !c.spinUnlocked ? 'locked' : (onIce0 ? 'slow' : 'land') });
  }

  // Heading: wider turns at higher speed on ice, pivot-in-place on snow.
  if (ok) {
    if (onIce) p.h -= p.steerS * (lerp(2.0, 3.2, sk.control) / (1 + speed * 0.08)) * clamp(0.3 + speed / 3, 0, 1) * dt;
    else p.h -= p.steerS * 2.8 * dt;
  }
  const fx = Math.sin(p.h), fz = Math.cos(p.h);
  let vf = p.vx * fx + p.vz * fz;
  let vl = -p.vx * fz + p.vz * fx;
  let load = { over: 0, turn: 0, slip: 0, brake: 0 };

  if (onIce) {
    const vmax = lerp(9, 19, sk.speed);
    if (ok) {
      if (push > 0 && vf < vmax) {
        const kick = 0.45 + 0.55 * Math.max(0, Math.sin(p.stride * 2)) * 1.8; // each stroke gives a surge
        vf += c.pushAccel * push * (1 - clamp(vf / vmax, 0, 1) * 0.85) * clamp(kick, 0.3, 1.6) * dt;
        vf = Math.min(vf, vmax);
      }
      if (brake > 0) {
        const d = lerp(4, 11, sk.braking) * brake * dt;
        vf = vf > 0 ? Math.max(0, vf - d) : Math.min(0, vf + d);
      }
    }
    vf *= Math.exp(-c.iceFriction * 0.8 * dt);
    if (!ok) vf *= Math.exp(-(p.state === 'falling' ? 1.6 : 3.2) * dt);
    // Blade grip: lateral slip is converted to forward motion (carving) and partly lost.
    const grip = ok ? lerp(2.2, 5.5, sk.control) * (1 + brake * 1.2) : 1.2;
    const mag0 = Math.hypot(vf, vl);
    const lost = vl * (1 - Math.exp(-grip * dt));
    vl -= lost;
    if (ok && mag0 > 0.01) {
      // Carving: slip is redirected into forward motion, losing only a little energy (never gaining any).
      const target = mag0 * (1 - 0.12 * Math.abs(lost) / (mag0 + 0.5));
      const fwd = Math.sqrt(Math.max(0, target * target - vl * vl));
      vf = vf < 0 ? -fwd : fwd;
    }
    p.vx = fx * vf - fz * vl;
    p.vz = fz * vf + fx * vl;
    speed = Math.hypot(p.vx, p.vz);

    if (ok) {
      // Balance model: instability grows with speed past your comfort zone, sharp turns at speed,
      // side-slipping and hard braking. It recovers when you ease off.
      const comfort = lerp(7.5, 15, sk.balance);
      load.over = Math.max(0, (speed - comfort) / comfort) * 1.4;
      load.turn = Math.max(0, Math.abs(p.steerS) * speed / (comfort + 3) * (1 - 0.5 * sk.control) - 0.7) * 2.2;
      load.slip = Math.max(0, Math.abs(vl) / (comfort * 0.55) - 0.9);
      load.brake = Math.max(0, brake * speed / (comfort + 3) * (1 - 0.5 * sk.braking) - 0.85) * 1.4;
      let spinLoad = 0;
      if (p.spin) {
        p.spin.t += dt;
        const u = clamp(p.spin.t / 0.9, 0, 1);
        p.spinAng = Math.PI * 2 * ease(u);
        spinLoad = 0.9 * (1 - sk.tricks * 0.7) * clamp(speed / Math.max(1, comfort), 0, 1.2);
        if (u >= 1) { p.spin = null; p.spinAng = 0; p.events.push({ type: 'spin' }); }
      }
      const total = load.over + load.turn + load.slip + load.brake + spinLoad;
      const floor = (1 - sk.balance) * 0.1 * clamp(speed / comfort, 0, 1);
      if (total > 0.02) p.b += total * 0.7 * dt;
      else p.b = Math.max(floor, p.b - 0.6 * dt);
      p.b = clamp(p.b, 0, 1);
      let reason = 'speed', best = load.over;
      if (load.turn + load.slip > best) { reason = 'turn'; best = load.turn + load.slip; }
      if (load.brake > best) { reason = 'brake'; best = load.brake; }
      if (spinLoad > best) reason = 'spin';
      if (p.b > 0.55 && !p.warned) { p.warned = true; p.events.push({ type: 'wobble', reason }); }
      if (p.b < 0.3) p.warned = false;
      if (p.b >= 1) startFall(p, reason);
    }
    const stridePush = ok && push > 0 && vf < vmax;
    p.strideAmp = approach(p.strideAmp, stridePush ? 1 : 0, 3 * dt);
    p.stride += (stridePush ? 4.5 + speed * 0.3 : 0) * dt;
  } else {
    // Walking on snow: direct control, strong friction, no balance loss.
    const walk = 4.6;
    const tx = ok ? fx * walk * push : 0, tz = ok ? fz * walk * push : 0;
    const acc = (ok ? 22 : 9) * dt;
    p.vx = approach(p.vx, tx, acc); p.vz = approach(p.vz, tz, acc);
    speed = Math.hypot(p.vx, p.vz);
    p.b = Math.max(0, p.b - 1.2 * dt); p.warned = false;
    p.strideAmp = 0;
    p.stride += speed * 2.3 * dt;
  }
  p.speed = speed; p.vf = vf; p.vl = vl;

  // Fall / recovery state machine (controlled animation, no ragdoll).
  if (p.state !== 'ok') {
    p.t += dt;
    if (p.state === 'falling') {
      p.fallAmt = clamp(p.t / 0.35, 0, 1);
      if (p.t >= 0.9) { p.state = 'down'; p.t = 0; }
    } else if (p.state === 'down') {
      p.fallAmt = 1;
      if (p.t >= 0.7) { p.state = 'rising'; p.t = 0; }
    } else if (p.state === 'rising') {
      p.fallAmt = 1 - ease(clamp(p.t / 0.9, 0, 1));
      if (p.t >= 0.9) { p.state = 'ok'; p.t = 0; p.b = 0.2; p.fallAmt = 0; p.events.push({ type: 'up' }); }
    }
  }

  // Integrate and collide.
  p.x += p.vx * dt; p.z += p.vz * dt;
  if (onIce && ok) p.dist += speed * dt;
  if (p.x > MAP_HALF) { p.x = MAP_HALF; p.vx = -Math.abs(p.vx) * 0.3; }
  if (p.x < -MAP_HALF) { p.x = -MAP_HALF; p.vx = Math.abs(p.vx) * 0.3; }
  if (p.z > MAP_HALF) { p.z = MAP_HALF; p.vz = -Math.abs(p.vz) * 0.3; }
  if (p.z < -MAP_HALF) { p.z = -MAP_HALF; p.vz = Math.abs(p.vz) * 0.3; }
  for (const o of world.colliders) {
    const dx = p.x - o.x, dz = p.z - o.z, rr = o.r + 0.45;
    const d2 = dx * dx + dz * dz;
    if (d2 >= rr * rr) continue;
    const d = Math.sqrt(d2) || 0.001, nx = dx / d, nz = dz / d;
    p.x = o.x + nx * rr; p.z = o.z + nz * rr;
    const vn = p.vx * nx + p.vz * nz;
    if (vn < 0) {
      p.vx -= vn * nx * 1.25; p.vz -= vn * nz * 1.25;
      if (-vn > 5.5 && p.state === 'ok' && onIce) startFall(p, 'crash');
    }
  }
}
