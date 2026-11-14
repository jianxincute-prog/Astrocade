// Roster of 10 chibi Fighting Dolls. Sprite ids in asset_map: <id>_idle / _punch / _kick / _special / _hit / _win (all drawn facing right).
// `kind` = look of the special-move projectile. spd/pow = small playstyle tweaks.
// `ps` = animation personality (tempo, bob, wob=jelly wobble, hop, hover, lunge, stiff) - defaults are 1 / 0.
export const CHARS = [
  { id: 'panda',   name: 'Bao',    color: '#ff4d4d', kind: 'star',     spd: 1.0,  pow: 1.05, nat: 1, ps: { tempo: 1.15, bob: 1.4, hop: 1.2 } },
  { id: 'bunny',   name: 'Mochi',  color: '#ff7fb6', kind: 'heart',    spd: 1.1,  pow: 0.95, nat: 1, ps: { tempo: 1.25, bob: 1.5, hop: 1.3 } },
  { id: 'lion',    name: 'Leo',    color: '#ffb400', kind: 'fire',     spd: 0.95, pow: 1.15, nat: 1, ps: { tempo: 0.85, bob: 0.8, lunge: 1.2, stiff: 0.8 } },
  { id: 'kitty',   name: 'Kuro',   color: '#6f86ff', kind: 'shuriken', spd: 1.15, pow: 0.95, nat: 1, ps: { tempo: 1.3, hop: 1.2, wob: 1.2 } },
  { id: 'fox',     name: 'Foxy',   color: '#ff7a1a', kind: 'fire',     spd: 1.05, pow: 1.05, nat: 1, ps: { tempo: 1.2 } },
  { id: 'penguin', name: 'Pengu',  color: '#5b7cff', kind: 'wave',     spd: 1.0,  pow: 1.0,  nat: 1, ps: { tempo: 0.9, wob: 1.2, hop: 0.9 } },
  { id: 'frog',    name: 'Froggo', color: '#4fd35f', kind: 'shuriken', spd: 1.15, pow: 0.92, nat: 1, ps: { tempo: 1.3, hop: 1.5, bob: 1.3 } },
  { id: 'robo',    name: 'Sparky', color: '#34c8ff', kind: 'bolt',     spd: 1.0,  pow: 1.08, nat: 1, ps: { wob: 0.3, stiff: 2 } },
  { id: 'witch',   name: 'Luna',   color: '#a56bff', kind: 'star',     spd: 1.0,  pow: 1.05, nat: 1, ps: { hover: 1, wob: 1.4 } },
  { id: 'duck',    name: 'Ducky',  color: '#ffcf33', kind: 'star',     spd: 1.08, pow: 1.0,  nat: 1, ps: { tempo: 1.25, bob: 1.4, hop: 1.3 } },
];
