import test from 'node:test';
import assert from 'node:assert/strict';
import { BOUNDS, NPC_SPOTS, zoneAt } from '../src/neighborhood.mjs';
import { CLUES, NPC, FINALE } from '../src/story.mjs';
import { SPOTS, roomAt } from '../src/world.mjs';

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

const HOUSE_ROOMS = ['Kamar', 'Ruang tamu', 'Gudang', 'Dapur', 'Ruang makan'];

test('the finale happens in Rani\'s house, not in the player\'s house', () => {
  assert.equal(roomAt(SPOTS.rani.x, SPOTS.rani.z), 'Rumah Rani');
  assert.ok(!HOUSE_ROOMS.includes(roomAt(SPOTS.rani.x, SPOTS.rani.z)));
  assert.ok(!HOUSE_ROOMS.includes(roomAt(SPOTS.ranidoor.x, SPOTS.ranidoor.z)));
  assert.ok(FINALE[0].text.includes('rumahku'));
});

test('act 1 clues are in the player\'s house and act 2 clues are out in the complex', () => {
  for (const clue of CLUES) {
    const spot = SPOTS[clue.id];
    assert.ok(spot, clue.id);
    const room = roomAt(spot.x, spot.z);
    if (clue.act === 1) assert.ok(HOUSE_ROOMS.includes(room), `${clue.id} should be inside the house, got ${room}`);
    else assert.ok(!HOUSE_ROOMS.includes(room), `${clue.id} should be outside the house, got ${room}`);
  }
});
