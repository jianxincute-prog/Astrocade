// Pure opening-cutscene script: timeline, taxi + hero motion, dialogue schedule and camera shots.
// Everything is a deterministic function of the cutscene clock `t` (seconds) so it can be unit-tested
// without DOM / THREE. src/ui/cutscene.js turns these numbers into meshes, UI and sound.
//
// Story: a taxi pulls up in the city plaza, the Enforcer steps out, his phone rings and the caller
// orders him to wipe out every thug in the three gang territories.

/** Where the scene is staged (central plaza, on the north-south road). The hero is moved to the
 *  configured spawn point afterwards. Facing convention: yaw 0 = +z, PI = north (-z). */
export const STAGE = { x: 1.0, z: 12 };

export const TAXI = { laneX: -1.4, startZ: 62, stopZ: 15, leaveZ: -60, swerveX: 0.6 };

export const CALLER = { name: 'PAK WIRAWAN', color: '#7dff8a' };
export const HERO = { name: 'THE ENFORCER', color: '#ffcf3a' };

export const LINES = [
  { who: 'caller', text: 'Enforcer, kau sudah di kota?' },
  { who: 'hero', text: 'Baru turun dari taksi. Apa tugasku?' },
  { who: 'caller', text: 'Tiga geng berandalan menguasai jalanan. Polisi tak berani turun tangan.' },
  { who: 'caller', text: 'Misimu: basmi semua berandalan di kota ini, sampai bos mereka tumbang.' },
  { who: 'hero', text: 'Anggap sudah selesai.' },
];

export const TL = {
  arriveDur: 5.2,        // taxi drives in (shot A, side pass-by)
  cut1: 5.2,             // cut to shot B (door side)
  doorOpen: [5.3, 5.9],
  walkStart: 6.0,        // hero steps out and walks to the stage
  doorClose: [7.3, 7.8],
  leaveStart: 8.0,       // taxi pulls away
  leaveDur: 4.5,
  cut2: 9.2,             // cut to shot C (hero close-up)
  pullStart: 9.4,        // phone comes out
  ringFirst: 9.9,
  ringPeriod: 2.0,
  answerAt: 12.6,        // hero lifts the phone to his ear
  talkStart: 13.2,
  cps: 38,               // typewriter speed (chars / second)
  hold: 0.9,             // pause after a finished line
  gap: 0.25,
  lower: 0.6,            // time to lower the phone after the call
  cardDelay: 1.3,        // mission card appears this long after the call ends (camera is mostly back up)
  cardDur: 3.2,
  riseDur: 2.6,          // camera rises back to the gameplay view
  fadeOut: 0.4,
};

// ------------------------------------------------------------------ math helpers
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const smoothstep = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const easeOutQuad = (x) => 1 - (1 - clamp01(x)) * (1 - clamp01(x));
export const easeInQuad = (x) => clamp01(x) * clamp01(x);
export const lerp = (a, b, k) => a + (b - a) * k;
export const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export function angleDelta(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }

/** Piecewise smooth interpolation through [[t, value], ...] keys. */
export function keyed(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], smoothstep((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  }
  return keys[keys.length - 1][1];
}

// ------------------------------------------------------------------ dialogue
/** Lays the dialogue out on the clock. Returns { lines: [{who,text,t0,tTyped,t1}], end }. */
export function dialogueSchedule(lines = LINES, start = TL.talkStart) {
  let t = start;
  const out = lines.map((l) => {
    const t0 = t, tTyped = t0 + l.text.length / TL.cps, t1 = tTyped + TL.hold;
    t = t1 + TL.gap;
    return { ...l, t0, tTyped, t1 };
  });
  return { lines: out, end: out[out.length - 1].t1 };
}
export const SCHEDULE = dialogueSchedule();
export const CALL_END = SCHEDULE.end;
export const CARD_START = CALL_END + TL.cardDelay;
export const FADE_START = CARD_START + TL.cardDur;
export const TOTAL = FADE_START + TL.fadeOut;

/** Line that is on screen at t with how many characters are revealed, or null. */
export function subtitleAt(t, sched = SCHEDULE) {
  for (const l of sched.lines) {
    if (t >= l.t0 && t < l.t1) return { who: l.who, text: l.text, chars: Math.min(l.text.length, Math.floor((t - l.t0) * TL.cps)) };
  }
  return null;
}

// ------------------------------------------------------------------ taxi
export function taxiAt(t) {
  let z, speed;
  if (t < TL.leaveStart) {
    const u = clamp01(t / TL.arriveDur);
    z = TAXI.startZ + (TAXI.stopZ - TAXI.startZ) * easeOutQuad(u);
    speed = 2 * (1 - u) * (TAXI.startZ - TAXI.stopZ) / TL.arriveDur;
  } else {
    // pulls out and keeps driving north (its heading), swerving a little clear of the hero
    const u = clamp01((t - TL.leaveStart) / TL.leaveDur);
    z = TAXI.stopZ + (TAXI.leaveZ - TAXI.stopZ) * easeInQuad(u);
    speed = 2 * u * (TAXI.stopZ - TAXI.leaveZ) / TL.leaveDur;
  }
  const x = TAXI.laneX - TAXI.swerveX * smoothstep((TAXI.stopZ - z) / 5);
  const open = smoothstep((t - TL.doorOpen[0]) / (TL.doorOpen[1] - TL.doorOpen[0]));
  const close = smoothstep((t - TL.doorClose[0]) / (TL.doorClose[1] - TL.doorClose[0]));
  return { x, z, speed, door: open * (1 - close), brake: t < TL.leaveStart + 0.1 };
}

// ------------------------------------------------------------------ hero
const PATH = [[-0.05, 15.3], [1.6, 15.5], [1.7, 13.3], [STAGE.x, STAGE.z]];
const WALK_SPEED = 2.1;
const SEG = PATH.slice(1).map((p, i) => {
  const a = PATH[i], dx = p[0] - a[0], dz = p[1] - a[1];
  return { a, len: Math.hypot(dx, dz), yaw: Math.atan2(dx, dz) };
});
const PATH_LEN = SEG.reduce((s, g) => s + g.len, 0);
export const WALK_END = TL.walkStart + PATH_LEN / WALK_SPEED;

/** Hero position / target yaw / locomotion speed. Hidden (inside the taxi) before the walk starts. */
export function heroAt(t) {
  if (t < TL.walkStart) return { visible: false, x: PATH[0][0], z: PATH[0][1], facing: SEG[0].yaw, speed: 0 };
  const s = (t - TL.walkStart) * WALK_SPEED;
  if (s >= PATH_LEN) {
    const last = SEG[SEG.length - 1].yaw;
    return { visible: true, x: STAGE.x, z: STAGE.z, facing: last + angleDelta(last, Math.PI) * smoothstep((t - WALK_END) / 0.6), speed: 0 };
  }
  let d = s;
  for (const g of SEG) {
    if (d <= g.len) return { visible: true, x: g.a[0] + Math.sin(g.yaw) * d, z: g.a[1] + Math.cos(g.yaw) * d, facing: g.yaw, speed: WALK_SPEED };
    d -= g.len;
  }
  return { visible: true, x: STAGE.x, z: STAGE.z, facing: Math.PI, speed: 0 };
}

/** Phone prop + arm pose. u drives CLIPS.phone (0 guard, .2 phone held low, .4-.85 at the ear). */
export function phoneAt(t) {
  const pull = smoothstep((t - TL.pullStart) / 0.6);
  const raise = smoothstep((t - TL.answerAt) / (TL.talkStart - TL.answerAt));
  const lower = smoothstep((t - CALL_END) / TL.lower);
  let u = 0.2 * pull + 0.2 * raise;           // 0 -> .2 -> .4
  if (t >= CALL_END) u = 0.4 + 0.6 * lower;   // ear -> guard
  const ringing = t >= TL.ringFirst && t < TL.answerAt && ((t - TL.ringFirst) % TL.ringPeriod) < 0.9;
  return { visible: t >= TL.pullStart && t < CALL_END + TL.lower, u, ringing, answered: t >= TL.answerAt && t < CALL_END, atEar: raise > 0.5 && t < CALL_END };
}

/** Ring bursts that start inside (t0, t1] — used to trigger sound and haptics once each. */
export function ringStartsBetween(t0, t1) {
  const n = [];
  for (let k = 0; ; k++) {
    const s = TL.ringFirst + k * TL.ringPeriod;
    if (s >= TL.answerAt) break;
    if (s > t0 && s <= t1) n.push(s);
  }
  return n;
}

// ------------------------------------------------------------------ camera
/** gp: { h } gameplay top-down camera height. Returns { pos, look, fov }. */
export function cameraAt(t, gp = { h: 13 }) {
  const hero = heroAt(t);
  const sway = (k) => Math.sin(t * 1.3 + k) * 0.03;
  // shot A: roadside pass-by, camera tracks the taxi
  if (t < TL.cut1) {
    const tx = taxiAt(t);
    return { pos: [7.5, 1.3 + sway(0), 34], look: [tx.x, 0.9, tx.z], fov: 44 };
  }
  // shot B: low three-quarter view of the open door, then follows the hero
  const bEnd = [3.7, 1.7, 8.0];
  const bPos = (tt) => lerp3([4.6, 1.5, 9.2], bEnd, clamp01((tt - TL.cut1) / (TL.cut2 - TL.cut1)));
  const bLook = (tt) => { const h = heroAt(tt); return lerp3([-0.3, 1.1, 14.8], [h.x, 1.3, h.z], smoothstep((tt - TL.walkStart) / 0.8)); };
  if (t < TL.cut2) return { pos: bPos(t), look: bLook(t), fov: 38 };
  // shot C: slow orbit + push-in on the hero's face during the call
  const ang = keyed(t, [[TL.cut2, 0.65], [TL.talkStart, 0.35], [CALL_END, 0.1]]);
  const rad = keyed(t, [[TL.cut2, 5.2], [TL.talkStart, 4.3], [CALL_END, 3.5]]);
  const camY = keyed(t, [[TL.cut2, 2.0], [TL.talkStart, 2.05], [CALL_END, 2.1]]);
  const lookY = keyed(t, [[TL.cut2, 1.6], [TL.talkStart, 1.85], [CALL_END, 1.85]]);
  const lookX = STAGE.x + keyed(t, [[TL.cut2, 0], [TL.talkStart, 0.3], [CALL_END, 0.3]]); // frame the phone hand
  const orbit = { pos: [STAGE.x + Math.sin(ang) * rad, camY + sway(2), STAGE.z - Math.cos(ang) * rad], look: [lookX, lookY, STAGE.z], fov: keyed(t, [[TL.cut2, 38], [CALL_END, 35]]) };
  // the cut into shot C is a glide so the move does not jump
  if (t < TL.cut2 + 1.0) {
    const k = smoothstep((t - TL.cut2) / 1.0);
    return { pos: lerp3(bEnd, orbit.pos, k), look: lerp3(bLook(TL.cut2), orbit.look, k), fov: lerp(38, orbit.fov, k) };
  }
  // shot D: rise back to the top-down gameplay view while the mission card shows
  const rise = smoothstep((t - (CALL_END + 0.3)) / TL.riseDur);
  if (rise <= 0) return orbit;
  const h = gp.h, endPos = [STAGE.x, h, STAGE.z + h * 0.8];
  const from = cameraAt(CALL_END + 0.3, gp);
  return { pos: lerp3(from.pos, endPos, rise), look: lerp3(from.look, [STAGE.x, 1.1, STAGE.z], rise), fov: lerp(from.fov, 42, rise) };
}

/** 0 (clear) .. 1 (black): fade in at the start, fade to black at the end. */
export function fadeAt(t) {
  return Math.max(1 - smoothstep(t / 0.9), smoothstep((t - FADE_START) / TL.fadeOut));
}
