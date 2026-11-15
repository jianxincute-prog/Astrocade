import assert from 'node:assert';
import { DEFAULT_BIRTH_RATE, WEREWOLF_BIRTH_RATE, birthProbability, warOutcome } from '../sim_rules.js';

// Births are five times slower than the previous 0.005-per-house, per-tick rate.
assert.strictEqual(DEFAULT_BIRTH_RATE, 0.001);
assert.strictEqual(birthProbability(undefined), 0.001);
assert.strictEqual(birthProbability(WEREWOLF_BIRTH_RATE), 0.00008);
assert.strictEqual(birthProbability(undefined, 0, 1, 1), 0.001);
assert.ok(Math.abs(birthProbability(undefined, 2, 1.5, 1.2) - 0.00324) < 1e-12);
assert.strictEqual(birthProbability(0), 0);

// Close wars can still fell a kingdom; crushing defeats have higher kingdom/race risk.
assert.strictEqual(warOutcome(0, 1), 'race');
assert.strictEqual(warOutcome(0.005, 1), 'kingdom');
assert.strictEqual(warOutcome(0.05, 1), 'survive');
assert.strictEqual(warOutcome(0.006, 0), 'race');
assert.strictEqual(warOutcome(0.15, 0), 'kingdom');
assert.strictEqual(warOutcome(0.25, 0), 'survive');
console.log('sim_rules tests ok');
