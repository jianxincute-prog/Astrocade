/* Scenarios - pure definitions and progress rules (no DOM / window / lib).
 * A scenario starts a prepared world with a goal and a time limit (in years). */
export const SCENARIOS = [
  { id: 'dawn', n: 'First Light', ic: '🏰', world: 'Hawaiian Chain', setup: [{ race: 'human', n: 8 }], goal: { type: 'level', v: 3 }, years: 35,
    desc: 'Eight settlers wake on a volcanic chain. Grow a level-3 kingdom within 35 years.' },
  { id: 'sail', n: 'Age of Sail', ic: '🌊', world: 'Aegean Isles', setup: [{ race: 'human', n: 6 }, { race: 'dwarf', n: 4 }], goal: { type: 'kingdoms', v: 5 }, years: 100,
    desc: 'Humans and dwarves share the Aegean. Colonise the isles until five kingdoms stand, within 100 years.' },
  { id: 'north', n: 'Arctic Survival', ic: '❄️', world: 'Arctic Isles', setup: [{ race: 'human', n: 10 }], goal: { type: 'pop', v: 80 }, years: 60,
    desc: 'Ten settlers face the long winters of the Arctic. Reach 80 citizens within 60 years.' },
  { id: 'four', n: 'Four Realms', ic: '🔬', world: null, setup: [{ race: 'human', n: 6 }, { race: 'elf', n: 6 }, { race: 'dwarf', n: 6 }, { race: 'orc', n: 6 }], goal: { type: 'age', v: 4 }, years: 40,
    desc: 'Four races on one world. Bring any kingdom into the Gunpowder Age within 40 years.' },
  { id: 'peace', n: 'Long Peace', ic: '🕊️', world: null, setup: [{ race: 'human', n: 6 }, { race: 'elf', n: 6 }, { race: 'dwarf', n: 6 }, { race: 'orc', n: 6 }], goal: { type: 'hold', v: 4 }, years: 250,
    desc: 'Keep four races alive for 250 years. Wars, plagues and disasters will test you.' },
];
export const SCENARIO_BY = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));

/**
 * Judge a scenario. snap = { years (since the start), pop (civilization citizens), maxLevel, maxAge, kingdoms, races (races with a kingdom) }.
 * Returns { status: 'run' | 'win' | 'lose', value, target } where value/target feed the progress bar.
 */
export function evalScenario(def, snap) {
  const g = def.goal, years = Math.max(0, snap.years || 0);
  const value = g.type === 'level' ? snap.maxLevel : g.type === 'age' ? snap.maxAge : g.type === 'kingdoms' ? snap.kingdoms : g.type === 'pop' ? snap.pop : snap.races;
  if (g.type === 'hold') {
    if (years >= 20 && snap.races < g.v) return { status: 'lose', value, target: g.v };
    return { status: years >= def.years ? 'win' : 'run', value, target: g.v };
  }
  if (value >= g.v) return { status: 'win', value, target: g.v };
  return { status: years >= def.years ? 'lose' : 'run', value, target: g.v };
}
