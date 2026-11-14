// Roster of 20 Fighting Dolls. `nat` = direction the artwork naturally faces (1 right, -1 left).
// `ps` = animation personality (tempo, bob, wob=jelly wobble, hop, hover, lunge, stiff) - defaults are 1 / 0.
// `kind` = look of the special-move projectile. spd/pow = small playstyle tweaks.
export const CHARS = [
  { id: 'c00', name: 'Hamster Champ', color: '#ff4d4d', kind: 'star',    spd: 0.95, pow: 1.12, nat: 1, ps: { bob: 1.2, lunge: 1.1 } },
  { id: 'c01', name: 'Fluffy Sheep',  color: '#7cc4ff', kind: 'wave',    spd: 1.0,  pow: 1.0,  nat: 1, ps: { wob: 1.6, bob: 1.1 } },
  { id: 'c02', name: 'Rocky Raccoon', color: '#3fd0ff', kind: 'bolt',    spd: 1.05, pow: 1.0,  nat: -1, ps: { tempo: 1.1, hop: 1.1 } },
  { id: 'c03', name: 'Duckie Kick',   color: '#ffcf33', kind: 'star',    spd: 1.08, pow: 0.98, nat: 1, ps: { tempo: 1.25, bob: 1.4, hop: 1.3 } },
  { id: 'c04', name: 'Penguin Sensei',color: '#5b7cff', kind: 'wave',    spd: 1.0,  pow: 1.0,  nat: 1, ps: { tempo: 0.9, wob: 1.2, hop: 0.9 } },
  { id: 'c05', name: 'Ninja Froggy',  color: '#4fd35f', kind: 'shuriken',spd: 1.15, pow: 0.92, nat: 1, ps: { tempo: 1.3, hop: 1.5, bob: 1.3 } },
  { id: 'c06', name: 'Pinky Fire',    color: '#ff6a3d', kind: 'fire',    spd: 1.0,  pow: 1.1,  nat: -1, ps: { tempo: 1.1 } },
  { id: 'c07', name: 'Bunny Boxer',   color: '#4aa3ff', kind: 'star',    spd: 1.1,  pow: 1.0,  nat: 1, ps: { tempo: 1.25, bob: 1.5, hop: 1.3 } },
  { id: 'c08', name: 'Leo Lion',      color: '#ffb400', kind: 'fire',    spd: 0.95, pow: 1.15, nat: 1, ps: { tempo: 0.85, bob: 0.8, lunge: 1.2, stiff: 0.8 } },
  { id: 'c09', name: 'Samurai Bear',  color: '#4a6fd8', kind: 'wave',    spd: 0.92, pow: 1.15, nat: 1, ps: { tempo: 0.8, bob: 0.6, wob: 0.6, stiff: 1.2 } },
  { id: 'c10', name: 'Unicorn Star',  color: '#ff7fe0', kind: 'heart',   spd: 1.1,  pow: 0.95, nat: 1, ps: { hover: 1, wob: 1.5 } },
  { id: 'c11', name: 'Ninja Kitty',   color: '#7a8cff', kind: 'shuriken',spd: 1.15, pow: 0.95, nat: -1, ps: { tempo: 1.3, hop: 1.2, wob: 1.2 } },
  { id: 'c12', name: 'Foxy Flame',    color: '#ff7a1a', kind: 'fire',    spd: 1.05, pow: 1.05, nat: 1, ps: { tempo: 1.2 } },
  { id: 'c13', name: 'Fluffy Berry',  color: '#b48cff', kind: 'heart',   spd: 1.0,  pow: 1.0,  nat: 1, ps: { wob: 1.8, bob: 1.2 } },
  { id: 'c14', name: 'Kung Fu Panda', color: '#e63946', kind: 'star',    spd: 1.0,  pow: 1.06, nat: -1, ps: { tempo: 1.15, bob: 1.4, hop: 1.2 } },
  { id: 'c15', name: 'Super Doll',    color: '#ffd800', kind: 'bolt',    spd: 1.05, pow: 1.1,  nat: 1, ps: { hover: 0.6, bob: 1.2, lunge: 1.15 } },
  { id: 'c16', name: 'Robo Bunny',    color: '#34c8ff', kind: 'bolt',    spd: 1.0,  pow: 1.06, nat: 1, ps: { wob: 0.3, stiff: 2 } },
  { id: 'c17', name: 'Sir Plushy',    color: '#6fa8ff', kind: 'wave',    spd: 0.92, pow: 1.1,  nat: 1, ps: { tempo: 0.8, bob: 0.6, wob: 0.6, stiff: 1.3 } },
  { id: 'c18', name: 'Witchy Luna',   color: '#a56bff', kind: 'star',    spd: 1.0,  pow: 1.05, nat: 1, ps: { hover: 1, wob: 1.4 } },
  { id: 'c19', name: 'Baby Karate',   color: '#ff9ec0', kind: 'heart',   spd: 1.1,  pow: 1.0,  nat: 1, ps: { tempo: 1.3, bob: 1.5, hop: 1.4, wob: 1.5 } },
];
