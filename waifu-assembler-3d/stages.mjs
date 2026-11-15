// Endless stage rules and deterministic generated content. Pure ES module: no DOM, platform or Babylon dependency.
import { FRAGMENTS, HALL_SIZE, PARTS, SETS } from './logic.mjs';
const hash = (text) => { let h = 2166136261; for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const STAGE_ORDER = SETS.map((set) => set.id).sort((a, b) => hash(a) - hash(b) || (a < b ? -1 : 1));

export const CLOCK_START = 90;
export const CLOCK_MIN = 45;
export const CLOCK_STEP = 4;
export const PIECE_SECONDS = 8; // generous but earned time bonus for each assembled fragment
export const REVEAL_SECONDS = 8; // opening a hiding spot also buys time
export const COMBO_MIN_LEFT = 5;

function random(seed) {
  let value = hash(seed) || 1;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 0x100000000; };
}
// Stage layout: the stage's statue stands on the medallion in the middle of the hall and its five pieces wait on
// evenly spaced stations on a ring around it. The ring widens a little each stage (stage 6 and later use the widest)
// and the whole pattern turns by a stage-specific angle.
export const STAGE_CENTER = [0, 0];
export const STAGE_SPAWN = { x: 0, z: 9, yaw: 0 }; // just in front of the statue, facing it
export const RING_RADIUS = 13; export const RING_GROWTH = 1; export const RING_GROWTH_STAGES = 5;
export function stageRadius(stage) {
  const n = Math.max(1, Math.floor(Number(stage) || 1));
  return RING_RADIUS + RING_GROWTH * Math.min(n - 1, RING_GROWTH_STAGES);
}
export function stageStations(stage, count) {
  const n = Math.max(1, Math.floor(Number(stage) || 1)); const r = stageRadius(n);
  const turn = (hash(`stage-${n}-turn`) % 12) * (Math.PI / 6) / 2; // a multiple of 15°
  return Array.from({ length: count }, (_, i) => {
    const a = turn + (i * 2 * Math.PI) / count;
    return { x: Math.round(STAGE_CENTER[0] + Math.sin(a) * r * 2) / 2, z: Math.round(STAGE_CENTER[1] + Math.cos(a) * r * 2) / 2 };
  });
}
export function lockedKinds(stage) {
  if (stage === 1) return [];
  if (stage === 2) return ['curtain'];
  if (stage === 3) return ['chest'];
  return ['chest', 'curtain'];
}

export function stageSpec(stage) {
  const n = Math.max(1, Math.floor(Number(stage) || 1));
  const setId = STAGE_ORDER[(n - 1) % STAGE_ORDER.length];
  const rand = random(`stage-${n}-${setId}-layout`);
  // every piece gets a station; which piece stands where is shuffled per stage so the walk is never the same
  const stations = stageStations(n, PARTS.length);
  for (let i = stations.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [stations[i], stations[j]] = [stations[j], stations[i]]; }
  const spot = (i) => ({ x: stations[i].x, z: stations[i].z });
  const fragments = FRAGMENTS.filter((f) => f.setId === setId).map((f, i) => ({ ...f, ...spot(i) }));
  // difficulty comes from the hiding places and the clock: none, 1 curtain, 2 chests, then 3, and 4 from stage 5
  const hiddenCount = n === 1 ? 0 : n === 2 ? 1 : n === 3 ? 2 : Math.min(4, n - 1);
  const kinds = lockedKinds(n); const hiddenByKey = {}; const secretRand = random(`stage-${n}-${setId}-secrets`);
  const hiddenPool = [...fragments].sort((a, b) => hash(`${n}:${a.key}`) - hash(`${n}:${b.key}`));
  const kindOffset = Math.floor(secretRand() * kinds.length);
  for (let i = 0; i < Math.min(hiddenCount, hiddenPool.length); i += 1) hiddenByKey[hiddenPool[i].key] = kinds[(i + kindOffset) % kinds.length];
  const baseClock = Math.max(CLOCK_MIN, CLOCK_START - CLOCK_STEP * (n - 1));
  return { stage: n, setId, fragments, hiddenByKey, pieceCount: fragments.length, hiddenCount,
    obstacle: n === 1 ? 'open' : n === 2 ? 'curtains' : n === 3 ? 'chests' : 'mixed', lockedKinds: kinds, baseClock, clock: baseClock };
}
export function createRun() { return { stage: 1, score: 0, combo: 0, clock: stageSpec(1).clock, opened: 0, status: 'between' }; }
export function startStage(run) { return { ...run, clock: stageSpec(run.stage).clock, opened: 0, status: 'running' }; }
export function tickRun(run, seconds) {
  if (run.status !== 'running') return run;
  const clock = Math.max(0, run.clock - Math.max(0, Number(seconds) || 0));
  return clock > 0 ? { ...run, clock } : { ...run, clock: 0, status: 'over' };
}
export function pieceAssembled(run) { return run.status === 'running' ? { ...run, clock: run.clock + PIECE_SECONDS } : run; }
export function pieceRevealed(run) { return run.status === 'running' ? { ...run, clock: run.clock + REVEAL_SECONDS, opened: run.opened + 1 } : run; }
export function stageScore(stage, secondsLeft, opened = 0, combo = 0) {
  return 100 * stage + Math.floor(Math.max(0, secondsLeft)) * 10 + 50 * opened + 25 * combo;
}
export function clearStage(run) {
  if (run.status !== 'running') return { run, points: 0 };
  const left = Math.floor(run.clock); const combo = left >= COMBO_MIN_LEFT ? run.combo + 1 : 0;
  const points = stageScore(run.stage, left, run.opened, combo);
  return { run: { ...run, stage: run.stage + 1, score: run.score + points, combo, opened: 0, clock: 0, status: 'between' }, points };
}
