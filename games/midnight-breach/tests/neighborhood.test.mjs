import test from 'node:test';
import assert from 'node:assert/strict';
import { BOUNDS, NPC_SPOTS, zoneAt } from '../src/neighborhood.mjs';
import { CLUES, NPC } from '../src/story.mjs';

test('zones name the road, cross street, own yard and the rest of the complex', () => {
  assert.equal(zoneAt(0, 18), 'Jalan raya');
  assert.equal(zoneAt(29, 5), 'Jalan komplek');
  assert.equal(zoneAt(1, 10), 'Halaman');
  assert.equal(zoneAt(-25, 8), 'Komplek');
});

test('neighbours stand inside the walkable bounds and talk about real clues', () => {
  for (const id of Object.keys(NPC)) {
    const s = NPC_SPOTS[id];
    assert.ok(s.x > BOUNDS.x1 && s.x < BOUNDS.x2 && s.z > BOUNDS.z1 && s.z < BOUNDS.z2, id);
    assert.ok(CLUES.some(c => c.id === NPC[id].afterClue), id);
    assert.ok(NPC[id].lines.length >= 2 && NPC[id].afterLines.length >= 1);
  }
});
