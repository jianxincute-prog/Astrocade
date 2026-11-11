// Pure game rules for Waifu Assembler 3D. This module has no browser or platform dependencies.
export const SETS = [
  { id: 'office01', name: 'OFFICE-01', label: 'Office-01', color: '#76d8ff', accent: '#263b72', cloth: '#dfe8f2', skin: '#f6c9b0', hair: '#49324a', hairLight: '#a17b9e', eyes: '#47a7d1', lip: '#cb667d' },
  { id: 'nurse01', name: 'NURSE-01', label: 'Nurse-01', color: '#ff83bf', accent: '#d84781', cloth: '#f5f3f2', skin: '#f6c9b0', hair: '#814c67', hairLight: '#e29abb', eyes: '#55aa9d', lip: '#d45f83' },
  { id: 'ceo01', name: 'CEO-01', label: 'CEO-01', color: '#f0c66f', accent: '#37435d', cloth: '#262f48', skin: '#f2c6a5', hair: '#3c2727', hairLight: '#9b755b', eyes: '#a78bda', lip: '#c97876' },
];

export const PARTS = [
  { id: 'head', label: 'Head', short: 'HEAD' },
  { id: 'torso', label: 'Torso', short: 'TORSO' },
  { id: 'armL', label: 'Left arm', short: 'ARM L' },
  { id: 'armR', label: 'Right arm', short: 'ARM R' },
  { id: 'legs', label: 'Legs', short: 'LEGS' },
];

export const HALL_SIZE = 150;
export const ANNEX = { minX: -58, maxX: 58, nearZ: -86, farZ: -145 };
export const INITIAL_PODIUMS = {
  office01: [-47, -101],
  nurse01: [47, -101],
  ceo01: [-47, -130],
};

// Three tidy, searchable fragment zones inside the 150 x 150 exhibition hall.
const ZONES = {
  office01: [-42, -28],
  nurse01: [42, 19],
  ceo01: [0, 20],
};
const FRAGMENT_OFFSETS = [[-26, -22], [22, -24], [-23, 24], [25, 23], [0, 0]];

export const FRAGMENTS = SETS.flatMap((set) => PARTS.map((part, index) => {
  const [zx, zz] = ZONES[set.id];
  const [ox, oz] = FRAGMENT_OFFSETS[index];
  return { key: `${set.id}:${part.id}`, setId: set.id, partId: part.id, x: zx + ox, z: zz + oz, index };
}));

export function createInitialState() {
  return { carried: null, collected: [], placed: Object.fromEntries(SETS.map((set) => [set.id, []])) };
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
    placed: Object.fromEntries(SETS.map((set) => [set.id, (state.placed[set.id] ?? []).slice()])),
  };
}
