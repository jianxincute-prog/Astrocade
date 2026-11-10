// Skating progression: XP, level, five skills grown by relevant practice, optional goals, personal bests.
// Skills never gate basic controls — they only make balance, control, top speed and braking more forgiving.
import { clamp, angleDiff } from './util.js';

const K = { balance: 200, control: 170, speed: 2800, braking: 55, tricks: 70 }; // practice needed for ~63% of a skill
export const MAX_LEVEL = 10;
export const SPIN_LEVEL = 3;
const NAMES = [[1, 'Beginner'], [3, 'Novice'], [5, 'Intermediate'], [8, 'Advanced']];
const GOAL_SEQ = ['glide', 'speed', 'stop', 'turns', 'glide', 'spin', 'speed', 'turns'];

const xpForLevel = (L) => 50 * (L - 1) * (L - 1); // cumulative XP needed to reach level L
export function levelName(L) { let n = 'Beginner'; for (const [lv, name] of NAMES) if (L >= lv) n = name; return n; }
const levelFor = (xp) => { let L = 1; while (L < MAX_LEVEL && xp >= xpForLevel(L + 1)) L++; return L; };
const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : d);

export function createProgress(saved) {
  const s = {
    xp: 0, raw: { balance: 0, control: 0, speed: 0, braking: 0, tricks: 0 },
    best: { run: 0, speed: 0 }, totals: { dist: 0, falls: 0, spins: 0, goals: 0 }, goalIdx: 0,
    friends: {}, zones: {},
  };
  if (saved && saved.v === 2) {
    s.xp = num(saved.xp);
    Object.keys(s.raw).forEach((k) => { s.raw[k] = num(saved.raw && saved.raw[k]); });
    s.best.run = num(saved.best && saved.best.run); s.best.speed = num(saved.best && saved.best.speed);
    Object.keys(s.totals).forEach((k) => { s.totals[k] = num(saved.totals && saved.totals[k]); });
    s.goalIdx = Math.floor(num(saved.goalIdx));
    if (saved.friends && typeof saved.friends === 'object') Object.keys(saved.friends).slice(0, 40).forEach((k) => { s.friends[k] = Math.min(12, num(saved.friends[k])); });
    if (saved.zones && typeof saved.zones === 'object') Object.keys(saved.zones).slice(0, 40).forEach((k) => { if (saved.zones[k]) s.zones[k] = true; });
  }
  let level = levelFor(s.xp), dirty = false, pendingXp = 0;
  const run = { base: 0, hold: 0, dist: 0, turn: 0, lastH: null, brakeStart: 0, braking: false, wobbling: false, xpDist: 0, xpTime: 0 };

  const skillVal = (k) => 1 - Math.exp(-s.raw[k] / K[k]);
  function award(n, out) {
    s.xp += n; pendingXp += n; dirty = true;
    const nl = levelFor(s.xp);
    while (level < nl) { level++; out.push({ type: 'level', level, name: levelName(level), unlock: level === SPIN_LEVEL ? 'Spin trick unlocked!' : null }); }
  }

  function makeGoal() {
    let t = GOAL_SEQ[s.goalIdx % GOAL_SEQ.length];
    if (t === 'spin' && level < SPIN_LEVEL) t = 'speed';
    const L = level, reward = 16 + 3 * L;
    if (t === 'glide') { const target = Math.min(700, 100 + 40 * L); return { type: t, target, reward, text: 'Glide ' + target + ' m without falling' }; }
    if (t === 'speed') { const u = Math.min(16, 7.6 + 0.9 * L); return { type: t, target: u, reward, text: 'Reach ' + Math.round(u * 2.4) + ' km/h' }; }
    if (t === 'stop') { const u = Math.min(12, 5.5 + 0.5 * L); return { type: t, target: u, reward, text: 'Brake to a stop from ' + Math.round(u * 2.4) + ' km/h' }; }
    if (t === 'turns') { const n = Math.round(1 + 0.3 * L); return { type: t, target: n * Math.PI * 2, reward, text: 'Skate ' + n + ' full circle' + (n > 1 ? 's' : '') }; }
    return { type: 'spin', target: 1, reward: 30, text: 'Land a spin' };
  }
  let goal = makeGoal();

  function completeGoal(out) {
    const done = goal;
    award(done.reward, out); s.totals.goals++; s.goalIdx++; run.turn = 0; run.base = run.dist; run.hold = 0;
    out.push({ type: 'goal', text: done.text, xp: done.reward });
    goal = makeGoal();
  }
  function goalState(p) {
    let f = 0;
    if (goal.type === 'glide') f = (run.dist - run.base) / goal.target;
    else if (goal.type === 'speed') f = Math.min(p.speed / goal.target, 1) * 0.9 + run.hold / 1.2 * 0.1;
    else if (goal.type === 'stop') f = run.braking && run.brakeStart >= goal.target ? 0.5 : 0;
    else if (goal.type === 'turns') f = run.turn / goal.target;
    return { text: goal.text, frac: clamp(f, 0, 1) };
  }

  return {
    skills(boost = 0) {
      const o = {}; Object.keys(K).forEach((k) => { o[k] = Math.max(skillVal(k), boost); }); return o;
    },
    rawSkills() { const o = {}; Object.keys(K).forEach((k) => { o[k] = skillVal(k); }); return o; },
    spinUnlocked() { return level >= SPIN_LEVEL; },
    info() {
      const base = xpForLevel(level), need = level >= MAX_LEVEL ? 1 : xpForLevel(level + 1) - base;
      return { level, name: levelName(level), xp: Math.floor(s.xp), into: s.xp - base, need, frac: level >= MAX_LEVEL ? 1 : clamp((s.xp - base) / need, 0, 1) };
    },
    stats() { return { best: s.best, totals: s.totals, zones: Object.keys(s.zones).length, friends: Object.keys(s.friends).length }; },
    goal(p) { return goalState(p); },
    skipGoal() { s.goalIdx++; run.turn = 0; run.base = run.dist; run.hold = 0; run.braking = false; goal = makeGoal(); dirty = true; },
    resetRun() { run.dist = 0; run.base = 0; run.hold = 0; run.turn = 0; run.braking = false; run.wobbling = false; },
    popXp() { const n = pendingXp; pendingXp = 0; return n; },
    isDirty() { return dirty; }, clearDirty() { dirty = false; },
    bestRun() { return s.best.run; },
    serialize() { return { v: 2, xp: s.xp, raw: s.raw, best: s.best, totals: s.totals, goalIdx: s.goalIdx, friends: s.friends, zones: s.zones }; },

    // Town: friendship points per NPC (undefined = not met yet) and discovered places.
    friendPoints(id) { return s.friends[id] === undefined ? -1 : s.friends[id]; },
    meet(id, name) { const out = []; if (s.friends[id] === undefined) { s.friends[id] = 0; award(10, out); out.push({ type: 'met', name }); } return out; },
    addFriend(id) { if (s.friends[id] !== undefined) { s.friends[id] = Math.min(12, s.friends[id] + 1); dirty = true; } },
    discoverZone(id, name, xp = 15) { const out = []; if (!s.zones[id]) { s.zones[id] = true; award(xp, out); out.push({ type: 'zone', name, xp }); } return out; },
    zonesFound() { return Object.keys(s.zones).length; },
    friendsMet() { return Object.keys(s.friends).length; },

    // Discrete skater events (fall, wobble, up, spin...). Returns UI events.
    onEvents(evs) {
      const out = [];
      for (const ev of evs) {
        if (ev.type === 'fall') { s.totals.falls++; run.dist = 0; run.base = 0; run.hold = 0; run.turn = 0; run.braking = false; run.wobbling = false; dirty = true; }
        else if (ev.type === 'wobble') run.wobbling = true;
        else if (ev.type === 'up') { s.raw.balance += 2; }
        else if (ev.type === 'spin') {
          s.raw.tricks += 10; s.totals.spins++; award(4, out); dirty = true;
          if (goal.type === 'spin') completeGoal(out);
        }
      }
      return out;
    },

    // Per-frame accumulation from the skater state. Returns UI events (level ups, goals).
    update(p, dt) {
      const out = [], ok = p.state === 'ok', ice = p.mode === 'skate';
      if (run.lastH === null) run.lastH = p.h;
      const dh = Math.abs(angleDiff(p.h, run.lastH)); run.lastH = p.h;
      if (p.speed > s.best.speed) { s.best.speed = p.speed; dirty = true; }
      if (ok && ice && p.speed > 1) {
        const d = p.speed * dt;
        run.dist += d; s.raw.speed += d; s.totals.dist += d; run.xpDist += d; dirty = true;
        if (run.dist > s.best.run) s.best.run = run.dist;
        while (run.xpDist >= 20) { run.xpDist -= 20; award(1, out); }
        if (p.speed > 5 && p.b < 0.55) { s.raw.balance += dt; run.xpTime += dt; if (run.xpTime >= 8) { run.xpTime -= 8; award(1, out); } }
        if (p.speed > 3) { s.raw.control += dh * 2; run.turn += dh; }
      }
      if (run.wobbling && ok && p.b < 0.3) { run.wobbling = false; s.raw.balance += 3; award(2, out); }
      // Braking to a stop.
      if (ok && p.brake > 0.2 && p.speed > 1 && !run.braking) { run.braking = true; run.brakeStart = p.speed; }
      if (run.braking) {
        if (!ok) run.braking = false;
        else if (p.speed < 0.8) {
          const from = run.brakeStart; run.braking = false;
          if (from > 5) { s.raw.braking += 6; award(2, out); } else if (from > 3) s.raw.braking += 2;
          if (goal.type === 'stop' && from >= goal.target) completeGoal(out);
        } else if (p.brake < 0.05) run.braking = false;
      }
      if (ok) {
        if (goal.type === 'glide' && run.dist - run.base >= goal.target) completeGoal(out);
        else if (goal.type === 'speed') { run.hold = p.speed >= goal.target ? run.hold + dt : 0; if (run.hold >= 1.2) completeGoal(out); }
        else if (goal.type === 'turns' && run.turn >= goal.target) completeGoal(out);
      }
      return out;
    },
  };
}
