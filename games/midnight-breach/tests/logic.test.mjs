import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveIsUnlocked, clockAt, DEFAULT_APP_ORDER, moveApp, normalizeAppOrder } from '../src/logic.mjs';
import { ARCHIVE, ARCHIVE_FILTERS, CONTACTS, isMidnightOnly } from '../src/story.mjs';

test('the simulated phone starts at 11:48 PM and hits midnight at the configured duration', () => {
  assert.equal(clockAt(0, 80).display, '11:48');
  assert.equal(clockAt(0, 80).hour24, 23);
  assert.equal(clockAt(79_999, 80).isMidnight, false);
  assert.equal(clockAt(80_000, 80).display, '12:00');
  assert.equal(clockAt(200_000, 80).secondsLeft, 0);
  assert.equal(archiveIsUnlocked(80_000, 80), true);
});

test('app layout normalization removes duplicates and restores missing apps', () => {
  const order = normalizeAppOrder(['photos', 'after', 'photos', 'unknown']);
  assert.deepEqual(order.slice(0, 2), ['photos', 'after']);
  assert.equal(order.length, DEFAULT_APP_ORDER.length);
  assert.equal(new Set(order).size, DEFAULT_APP_ORDER.length);
});

test('drag reorder moves only the selected app and preserves all app ids', () => {
  const changed = moveApp(DEFAULT_APP_ORDER, 'after', 'messages');
  assert.deepEqual(changed, ['after', 'messages', 'photos', 'contacts', 'notes', 'phone']);
  assert.deepEqual(moveApp(changed, 'missing', 'messages'), changed);
});

test('AFTER has friend, family, neighbour and celebrity secrets readable before midnight', () => {
  const early = ARCHIVE.filter(item => !isMidnightOnly(item));
  for (const cat of ['TEMAN', 'KELUARGA', 'TETANGGA', 'ARTIS']) {
    assert.ok(early.some(item => item.category === cat), cat);
    assert.ok(ARCHIVE_FILTERS.includes(cat));
  }
  assert.equal(ARCHIVE.filter(isMidnightOnly).length, 3);
  for (const item of early) assert.ok(CONTACTS.some(c => `${c.id}-file` === item.id), item.id);
});
