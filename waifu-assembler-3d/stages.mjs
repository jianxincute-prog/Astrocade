// Endless stage rules and deterministic generated content. Pure ES module: no DOM, platform or Babylon dependency.
import { FRAGMENTS, HALL_SIZE, PARTS, SETS } from './logic.mjs';
const hash = (text) => { let h = 2166136261; for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const STAGE_ORDER = SETS.map((set) => set.id).sort((a, b) => hash(a) - hash(b) || (a < b ? -1 : 1));

// The five anatomical segments stay familiar; additional stages add collectible finishing pieces to the same statue.
export const EXTRA_ACCESSORIES = [
  { id: 'ornament01', label: 'Hair ribbon', short: 'RIBBON', kind: 'ribbon', visualPartId: 'head', slot: [0.34, 4.0, 0.08] },
  { id: 'ornament02', label: 'Crystal brooch', short: 'BROOCH', kind: 'gem', visualPartId: 'torso', slot: [0.12, 3.05, 0.34] },
  { id: 'ornament03', label: 'Wrist charm', short: 'WRIST CHARM', kind: 'cuff', visualPartId: 'armR', slot: [0.81, 2.35, 0.16] },
  { id: 'ornament04', label: 'Waist jewel', short: 'WAIST JEWEL', kind: 'jewel', visualPartId: 'torso', slot: [-0.12, 2.17, 0.32] },
  { id: 'ornament05', label: 'Shoulder pin', short: 'SHOULDER PIN', kind: 'star', visualPartId: 'torso', slot: [-0.36, 3.32, 0.22] },
  { id: 'ornament06', label: 'Shoe ornament', short: 'SHOE GEM', kind: 'gem', visualPartId: 'legs', slot: [0.31, 0.28, 0.2] },
  { id: 'ornament07', label: 'Crown detail', short: 'CROWN', kind: 'crown', visualPartId: 'head', slot: [-0.04, 4.23, 0.05] },
];
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
function randomPosition(rand, used) {
  const half = HALL_SIZE / 2;
  let x = 0, z = 0, tries = 0;
  do {
    x = Math.round((rand() * 2 - 1) * (half - 9));
    // Search strip spans the hall's width and the north half; the annex is close enough for several deliveries.
    z = Math.round(-half + 7 + rand() * 54);
    tries += 1;
  } while (tries < 100 && used.some((p) => Math.hypot(p.x - x, p.z - z) < 10));
  return { x, z };
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
  const used = [];
  const base = FRAGMENTS.filter((f) => f.setId === setId).map((f) => {
    const p = randomPosition(rand, used); used.push(p); return { ...f, ...p };
  });
  const extraCount = Math.min(EXTRA_ACCESSORIES.length, n - 1);
  const extras = EXTRA_ACCESSORIES.slice(0, extraCount).map((accessory, index) => {
    const p = randomPosition(rand, used); used.push(p);
    return { key: `${setId}:stage${n}:${accessory.id}`, setId, partId: accessory.id, label: accessory.label, short: accessory.short, ...p,
      index: PARTS.length + index, isAccessory: true, accessoryKind: accessory.kind, visualPartId: accessory.visualPartId, accessorySlot: accessory.slot };
  });
  const fragments = [...base, ...extras];
  const hiddenCount = n === 1 ? 0 : n === 2 ? 1 : n === 3 ? 2 : Math.min(extraCount, Math.ceil(fragments.length * 0.5));
  const kinds = lockedKinds(n); const hiddenByKey = {}; const secretRand = random(`stage-${n}-${setId}-secrets`);
  const hiddenPool = [...fragments].sort((a, b) => hash(`${n}:${a.key}`) - hash(`${n}:${b.key}`));
  const kindOffset = Math.floor(secretRand() * kinds.length);
  for (let i = 0; i < Math.min(hiddenCount, hiddenPool.length); i += 1) hiddenByKey[hiddenPool[i].key] = kinds[(i + kindOffset) % kinds.length];
  const baseClock = Math.max(CLOCK_MIN, CLOCK_START - CLOCK_STEP * (n - 1));
  return { stage: n, setId, fragments, hiddenByKey, pieceCount: fragments.length, extraCount, hiddenCount,
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
