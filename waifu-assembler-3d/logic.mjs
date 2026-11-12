// Pure game rules for Waifu Assembler 3D. This module has no browser or platform dependencies.
export const SETS = [
  { id: 'office01', name: 'OFFICE-01', label: 'Office-01', color: '#76d8ff', accent: '#263b72', cloth: '#dfe8f2', skin: '#f6c9b0', hair: '#49324a', hairLight: '#a17b9e', eyes: '#47a7d1', lip: '#cb667d' },
  { id: 'nurse01', name: 'NURSE-01', label: 'Nurse-01', color: '#ff83bf', accent: '#d84781', cloth: '#f5f3f2', skin: '#f6c9b0', hair: '#814c67', hairLight: '#e29abb', eyes: '#55aa9d', lip: '#d45f83' },
  { id: 'ceo01', name: 'CEO-01', label: 'CEO-01', color: '#f0c66f', accent: '#37435d', cloth: '#262f48', skin: '#f2c6a5', hair: '#3c2727', hairLight: '#9b755b', eyes: '#a78bda', lip: '#c97876' },
  { id: 'student01', name: 'STUDENT-01', label: 'Student-01', color: '#b9a3ff', accent: '#26306a', cloth: '#f6f6fa', skin: '#fadccd', hair: '#3a2622', hairLight: '#7a5040', eyes: '#7b5bd6', lip: '#e78a98' },
  { id: 'idol01', name: 'IDOL-01', label: 'Idol-01', color: '#ff5a7a', accent: '#ffd84d', cloth: '#ffffff', skin: '#fbdccf', hair: '#f0d9a0', hairLight: '#ffb7c8', eyes: '#2fa0e0', lip: '#f2708c' },
  { id: 'janitor01', name: 'JANITOR-01', label: 'Janitor-01', color: '#5fd8a8', accent: '#2f8a74', cloth: '#2f8a74', skin: '#efc8ab', hair: '#4a2f25', hairLight: '#8a5a40', eyes: '#3e7a5c', lip: '#c96f73' },
  { id: 'rin01', name: 'RIN-01', label: 'Rin-01', color: '#7fb4e8', accent: '#2a3050', cloth: '#f2f4fa', skin: '#f6dcd2', hair: '#b9b4d6', hairLight: '#e6e2ff', eyes: '#5fb4e6', lip: '#9c5a74' },
  { id: 'aoi01', name: 'AOI-01', label: 'Aoi-01', color: '#f2a03c', accent: '#2f6fd0', cloth: '#ffffff', skin: '#f3cdb2', hair: '#8a3a22', hairLight: '#d07a4a', eyes: '#3a9a5a', lip: '#f07f60' },
  { id: 'mei01', name: 'MEI-01', label: 'Mei-01', color: '#c46ad8', accent: '#1a1820', cloth: '#ffffff', skin: '#f8ddd0', hair: '#1a1420', hairLight: '#4a3a60', eyes: '#9a5ad8', lip: '#e02848' },
  { id: 'yuki01', name: 'YUKI-01', label: 'Yuki-01', color: '#8fc8f0', accent: '#9aa8c8', cloth: '#ffffff', skin: '#fbe6df', hair: '#eef0f6', hairLight: '#c8d8ff', eyes: '#d0384a', lip: '#eaa2b8' },
  { id: 'kana01', name: 'KANA-01', label: 'Kana-01', color: '#ff86b8', accent: '#ffd84d', cloth: '#ffffff', skin: '#e3b08a', hair: '#e8b86a', hairLight: '#fff0c0', eyes: '#e05aa0', lip: '#e07a8c' },
  { id: 'sakura01', name: 'SAKURA-01', label: 'Sakura-01', color: '#e0465a', accent: '#c8202e', cloth: '#ffffff', skin: '#f8e0d6', hair: '#120c14', hairLight: '#3a2440', eyes: '#8a4ac8', lip: '#c01c36' },
];

export const PARTS = [
  { id: 'head', label: 'Head', short: 'HEAD' },
  { id: 'torso', label: 'Torso', short: 'TORSO' },
  { id: 'armL', label: 'Left arm', short: 'ARM L' },
  { id: 'armR', label: 'Right arm', short: 'ARM R' },
  { id: 'legs', label: 'Legs', short: 'LEGS' },
];

// Restoration hall (fragments are scattered here): x and z within ±HALL_SIZE/2. The statue gallery opens north
// of it through a single doorway: a long sculpture nave with six plinths along each side of a central aisle.
export const HALL_SIZE = 120;
export const ANNEX = { minX: -20, maxX: 20, nearZ: -62, farZ: -152 };
export const GALLERY_DOOR = 7; // half-width of the doorway between hall and gallery
const ROW_X = 12.5;
const ROW_Z = [-75, -87.5, -100, -112.5, -125, -137.5];
export const INITIAL_PODIUMS = {
  office01: [-ROW_X, ROW_Z[0]], nurse01: [ROW_X, ROW_Z[0]],
  ceo01: [-ROW_X, ROW_Z[1]], student01: [ROW_X, ROW_Z[1]],
  idol01: [-ROW_X, ROW_Z[2]], janitor01: [ROW_X, ROW_Z[2]],
  rin01: [-ROW_X, ROW_Z[3]], aoi01: [ROW_X, ROW_Z[3]],
  mei01: [-ROW_X, ROW_Z[4]], yuki01: [ROW_X, ROW_Z[4]],
  kana01: [-ROW_X, ROW_Z[5]], sakura01: [ROW_X, ROW_Z[5]],
};

// Twelve searchable fragment zones (4 x 3) inside the restoration hall, one per statue.
const ZONES = {
  office01: [-39, -36], nurse01: [13, 36], ceo01: [39, -2], student01: [-13, -2],
  idol01: [-39, 36], janitor01: [13, -36], rin01: [39, 36], aoi01: [-13, 36],
  mei01: [13, -2], yuki01: [-39, -2], kana01: [39, -36], sakura01: [-13, -36],
};
const FRAGMENT_OFFSETS = [[-8, -7], [7, -8], [-7, 8], [8, 7], [0, 0]];

export const FRAGMENTS = SETS.flatMap((set) => PARTS.map((part, index) => {
  const [zx, zz] = ZONES[set.id];
  const [ox, oz] = FRAGMENT_OFFSETS[index];
  return { key: `${set.id}:${part.id}`, setId: set.id, partId: part.id, x: zx + ox, z: zz + oz, index };
}));

// Two fragments per statue are hidden: in a wooden chest or behind a curtained booth. They must be opened first.
export const HIDDEN_FRAGMENTS = Object.fromEntries(FRAGMENTS.flatMap((fragment) => {
  const setIndex = SETS.findIndex((set) => set.id === fragment.setId);
  const slot = (setIndex + fragment.index) % 5;
  return slot === 0 || slot === 3 ? [[fragment.key, (setIndex + fragment.index) % 2 ? 'curtain' : 'chest']] : [];
}));
export const isHidden = (key) => Boolean(HIDDEN_FRAGMENTS[key]);

export function createInitialState() {
  return { carried: null, collected: [], revealed: [], placed: Object.fromEntries(SETS.map((set) => [set.id, []])) };
}

export function reveal(state, key) {
  if (!isHidden(key) || state.revealed.includes(key)) return state;
  return { ...state, revealed: [...state.revealed, key] };
}

export function getSet(setId) {
  return SETS.find((set) => set.id === setId) ?? null;
}

export function getFragment(key) {
  return FRAGMENTS.find((fragment) => fragment.key === key) ?? null;
}

export function pickup(state, key) {
  const fragment = getFragment(key);
  if (!fragment || state.carried || state.collected.includes(key) || state.placed[fragment.setId]?.includes(fragment.partId)) return state;
  if (isHidden(key) && !state.revealed?.includes(key)) return state; // still inside its chest / behind its curtain
  return { ...state, carried: key, collected: [...state.collected, key] };
}

export function placeCarried(state, setId) {
  const fragment = getFragment(state.carried);
  if (!fragment || fragment.setId !== setId || state.placed[setId]?.includes(fragment.partId)) return state;
  return {
    ...state,
    carried: null,
    placed: { ...state.placed, [setId]: [...(state.placed[setId] ?? []), fragment.partId] },
  };
}

export function isSetComplete(state, setId) {
  return (state.placed[setId]?.length ?? 0) === PARTS.length;
}

export function isGameComplete(state) {
  return SETS.every((set) => isSetComplete(state, set.id));
}

export function countPlaced(state) {
  return SETS.reduce((total, set) => total + (state.placed[set.id]?.length ?? 0), 0);
}

export function restoreState(saved) {
  const clean = createInitialState();
  if (!saved || typeof saved !== 'object') return clean;
  for (const set of SETS) {
    const valid = Array.isArray(saved.placed?.[set.id])
      ? saved.placed[set.id].filter((partId) => PARTS.some((part) => part.id === partId))
      : [];
    clean.placed[set.id] = [...new Set(valid)];
  }
  const alreadyPlaced = new Set(SETS.flatMap((set) => clean.placed[set.id].map((partId) => `${set.id}:${partId}`)));
  clean.collected = Array.isArray(saved.collected)
    ? [...new Set(saved.collected.filter((key) => getFragment(key) && !alreadyPlaced.has(key)))]
    : [];
  clean.revealed = Array.isArray(saved.revealed) ? [...new Set(saved.revealed.filter((key) => isHidden(key)))] : [];
  const carried = getFragment(saved.carried);
  clean.carried = carried && !alreadyPlaced.has(carried.key) ? carried.key : null;
  if (clean.carried && !clean.collected.includes(clean.carried)) clean.collected.push(clean.carried);
  if (clean.carried && clean.collected.length > 0) clean.collected = clean.collected.filter((key) => key !== clean.carried);
  return clean;
}

export function serializeState(state) {
  return {
    carried: state.carried,
    collected: state.collected.slice(),
    revealed: (state.revealed || []).slice(),
    placed: Object.fromEntries(SETS.map((set) => [set.id, (state.placed[set.id] ?? []).slice()])),
  };
}

// Restoration time for the leaderboard (whole seconds, lower is better) shown as m:ss or h:mm:ss.
export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const r = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

// ---------- medals, stars and unlocks ----------
// A statue's clock runs from the moment its first fragment is collected until its fifth part is placed.
// Medals are timed per statue from its first collected piece to its fifth placement. Routes differ a lot (a
// statue's pieces may lie near the doorway or at the far corners of the hall), so each statue has its own par:
// the walk from its plinth to every piece and back through the gallery door, plus a few seconds per fit puzzle.
export const PUZZLE_SECONDS = 5;
export const MEDAL_RATIO = { gold: 1, silver: 1.5 }; // gold within par, silver within 1.5 × par, otherwise bronze
export const MEDAL_STARS = { gold: 3, silver: 2, bronze: 1 };
const MEDAL_RANK = { bronze: 1, silver: 2, gold: 3 };
export function statuePar(setId, podium = INITIAL_PODIUMS[setId], speed = 9) {
  const door = [0, -HALL_SIZE / 2];
  const via = (x, z) => Math.hypot(x - door[0], z - door[1]) + Math.hypot(podium[0] - door[0], podium[1] - door[1]);
  const pieces = FRAGMENTS.filter((f) => f.setId === setId);
  const walk = pieces.reduce((sum, f) => sum + 2 * via(f.x, f.z), 0) / Math.max(1, speed);
  const secrets = pieces.filter((f) => isHidden(f.key)).length * 2;
  return Math.round(walk + pieces.length * PUZZLE_SECONDS + secrets);
}
export function medalFor(seconds, par = 100) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s < 0) return 'bronze';
  return s <= par * MEDAL_RATIO.gold ? 'gold' : s <= par * MEDAL_RATIO.silver ? 'silver' : 'bronze';
}
export const betterMedal = (a, b) => ((MEDAL_RANK[a] || 0) >= (MEDAL_RANK[b] || 0) ? a : b);
export const DAILY_STARS = 3;
export function countStars(meta) {
  const medals = Object.values(meta?.medals || {}).reduce((sum, m) => sum + (MEDAL_STARS[m] || 0), 0);
  return medals + Math.max(0, Number(meta?.dailyStars) || 0);
}
// Studio expressions unlock with stars; neutral and smiling are always available.
export const EXPRESSION_UNLOCKS = { neutral: 0, smiling: 0, happy: 2, shy: 4, wink: 7, surprised: 10, smug: 14, sad: 18, angry: 22, crying: 27 };
export const isExpressionUnlocked = (expr, stars) => stars >= (EXPRESSION_UNLOCKS[expr] ?? Infinity);

// ---------- daily challenge: one per calendar day, the same for everyone ----------
function hashString(text) { let h = 2166136261; for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function dailyChallenge(date) {
  const day = String(date).slice(0, 10); const h = hashString(day); const set = SETS[h % SETS.length];
  const kind = ['speed', 'gold', 'secrets'][(h >>> 8) % 3];
  if (kind === 'speed') { // a little slower than gold for that statue: reachable by a focused run
    const seconds = Math.round(statuePar(set.id) * [1.3, 1.2, 1.1][(h >>> 12) % 3] / 5) * 5;
    return { day, kind, setId: set.id, seconds, text: `Restore ${set.name} within ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` };
  }
  if (kind === 'gold') return { day, kind, text: 'Earn a gold medal on any statue' };
  const count = [3, 4, 5][(h >>> 12) % 3];
  return { day, kind, count, text: `Open ${count} hidden chests or curtains` };
}
// Progress for today's challenge from what happened this session: completed statues (with their times) and reveals.
export function dailyMet(challenge, { completions = [], reveals = 0 } = {}) {
  if (challenge.kind === 'speed') return completions.some((c) => c.setId === challenge.setId && c.seconds <= challenge.seconds);
  if (challenge.kind === 'gold') return completions.some((c) => c.medal === 'gold');
  return reveals >= challenge.count;
}

// ---------- the "turn and fit" placement puzzle ----------
// A part arrives turned by a few 45° yaw steps (and sometimes flipped upside down); it fits when both are back at 0.
export function puzzleStart(seed) {
  const h = hashString(seed);
  const yaw = 2 + (h % 5); // 2…6 eighth-turns away
  const flip = (h >>> 5) % 3 === 0 ? 2 : 0; // a third of the parts also arrive upside down (two quarter-turns)
  return { yaw, flip };
}
export const puzzleSolved = (p) => ((p.yaw % 8) + 8) % 8 === 0 && ((p.flip % 4) + 4) % 4 === 0;
