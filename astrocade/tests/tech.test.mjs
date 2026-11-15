import assert from 'node:assert';
import { TECHS, BRANCHES, AGES, ageName, ageNeed, ageReady, availableTechs, chooseTech, kpGain, techById, legacyTechIds, LEGACY_ORDER, TIER_KP, techsOfTier } from '../tech.js';

const RACES = ['human', 'elf', 'dwarf', 'orc', 'werewolf'], KEYS = new Set(['wood', 'stone', 'gold', 'bronze', 'iron', 'silver', 'food']);
for (const r of RACES) {
  const list = TECHS[r];
  assert.strictEqual(list.length, 15, r + ' has 15 techs');
  assert.strictEqual(new Set(list.map(t => t.id)).size, 15, r + ' ids are unique');
  for (const b of BRANCHES) for (let tier = 1; tier <= 5; tier++) assert.strictEqual(list.filter(t => t.br === b && t.tier === tier).length, 1, `${r} ${b}${tier}`);
  for (const t of list) { assert.ok(t.n && t.ic && t.fx && t.cost, t.id); for (const k in t.cost) assert.ok(KEYS.has(k), t.id + ' cost ' + k); assert.ok(t.lv >= 0 && t.lv <= 3); }
  assert.ok(list.some(t => t.id === 'voyage' && t.br === 'E' && t.tier === 3 && t.lm === 'harbor'), r + ' keeps its sailing tech');
  for (const id of LEGACY_ORDER[r]) assert.ok(techById(r, id), r + ' legacy id ' + id);   // old saves must still map
}
// legacy migration: a count becomes the first n ids of the old order
assert.deepStrictEqual(legacyTechIds('human', 3), ['agri', 'walls', 'knight']);
assert.deepStrictEqual(legacyTechIds('orc', 0), []); assert.strictEqual(legacyTechIds('elf', 99).length, 5);
// ages
assert.strictEqual(AGES.length, 5);
assert.strictEqual(ageName(3, 'dwarf'), 'Rune Age'); assert.strictEqual(ageName(4, 'orc'), 'Blackpowder Age'); assert.strictEqual(ageName(1, 'elf'), 'Bronze Age');
assert.ok(ageNeed(0) && ageNeed(3) && ageNeed(4) === null);
assert.ok(ageNeed(3).cost.iron > ageNeed(2).cost.iron);
// tier gating: stone age offers tier 1 only; prerequisites are required
for (const r of RACES) {
  const a0 = availableTechs(r, [], 0, 3); assert.ok(a0.length === 3 && a0.every(t => t.tier === 1), r + ' stone age');
  const a4 = availableTechs(r, [], 4, 3, true); assert.ok(a4.every(t => t.tier === 1), r + ' needs tier 1 first');
}
// level gate
assert.strictEqual(availableTechs('human', [], 0, 0).length, 0);       // nothing at level 0 for humans (all tier 1 need level 1+)
assert.ok(availableTechs('werewolf', [], 0, 0).some(t => t.id === 'moon'));
// every tree can be researched to the end, in age order, without dead ends
for (const r of RACES) {
  const owned = []; let age = 0, guard = 0;
  while (owned.length < 15 && guard++ < 200) {
    const c = availableTechs(r, owned, age, 3);
    if (c.length) { owned.push(chooseTech(r, c, null, 0).id); continue; }
    assert.ok(ageReady(r, owned, age, 3), `${r} stuck at age ${age} with ${owned.length} techs`);
    age++;
  }
  assert.strictEqual(owned.length, 15, r + ' completes the tree'); assert.strictEqual(age, 4, r + ' ends in the last age');
}
// age readiness needs level and enough techs of the current tier
assert.strictEqual(ageReady('human', ['agri'], 0, 1), true);
assert.strictEqual(ageReady('human', [], 0, 1), false);
assert.strictEqual(ageReady('human', ['trade'], 1, 2), false);                   // needs two tier-2 techs
assert.strictEqual(ageReady('human', ['trade', 'phalanx'], 1, 2), true);
assert.strictEqual(ageReady('human', ['trade', 'phalanx'], 1, 1), false);
assert.strictEqual(techsOfTier('human', ['agri', 'walls', 'trade'], 1), 2);
// branch choice: a decree triples a branch; races lean towards theirs; lower tiers first
const c = availableTechs('orc', ['camp', 'raid', 'shaman'], 1, 3);
assert.ok(c.length >= 3);
let m = 0; for (let i = 0; i < 100; i++) if (chooseTech('orc', c, null, i / 100).br === 'M') m++; assert.ok(m > 40, 'orcs lean military ' + m);
let l0 = 0, l = 0; for (let i = 0; i < 100; i++) { if (chooseTech('orc', c, null, i / 100).br === 'L') l0++; if (chooseTech('orc', c, 'L', i / 100).br === 'L') l++; } assert.ok(l > l0 + 10, `decree shifts the pick ${l0} -> ${l}`);
assert.strictEqual(chooseTech('human', [], null, .5), null);
// knowledge
assert.ok(kpGain(30, 12, 2, 1) > kpGain(30, 12, 0, 1)); assert.ok(kpGain(30, 12, 2, 1.5) > kpGain(30, 12, 2, 1));
assert.deepStrictEqual(TIER_KP.length, 5); assert.ok(TIER_KP[4] > TIER_KP[0]);
console.log('tech tests ok');
