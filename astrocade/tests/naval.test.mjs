import assert from 'node:assert';
import { KRAKEN_HP, firepower, sinkChance, warshipHp, warshipFire, simulateKraken } from '../naval.js';
assert.ok(firepower(4) > firepower(0)); assert.ok(firepower(0) > 0);
assert.strictEqual(sinkChance(3, true), .9);
assert.ok(sinkChance(3, false, KRAKEN_HP / 2) < sinkChance(3, false));                 // a wounded kraken lets go more often
assert.ok(warshipHp(4) > warshipHp(3)); assert.ok(warshipFire(4).dmg > warshipFire(3).dmg);
// seeded generator so the odds check is repeatable
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
for (const fleet of [[2], [4], [3, 3, 3], [4, 4, 4, 4, 4]]) {
  let wins = 0, hurt = 0; const N = 100000;
  for (let i = 0; i < N; i++) { const r = simulateKraken(fleet, rnd); if (r.won) wins++; if (r.hp < KRAKEN_HP) hurt++; }
  assert.ok(wins / N < .01, `${fleet} wins ${wins / N}`);                                // the kraken wins more than 99% of the time
  assert.ok(hurt / N > .9, 'the fleet always hurts it');                                 // but the crews do fight back
}
let wins = 0; for (let i = 0; i < 400000; i++) if (simulateKraken([4, 4, 4], rnd).won) wins++;
assert.ok(wins > 0, 'a lucky shot is possible');
console.log('naval tests ok');
