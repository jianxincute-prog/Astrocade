import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveIsUnlocked, clockAt, clockDisplayAt, DEFAULT_APP_ORDER, moveApp, normalizeAppOrder } from '../src/logic.mjs';
import { ARCHIVE, ARCHIVE_FILTERS, CLUES, CLUES_TO_OPEN_STORAGE, CONTACTS, FINALE, isMidnightOnly } from '../src/story.mjs';

test('the simulated phone starts at 11:48 PM and hits midnight at the configured duration', () => {
  assert.equal(clockAt(0, 80).display, '11:48');
  assert.equal(clockAt(79_999, 80).isMidnight, false);
  assert.equal(clockAt(80_000, 80).display, '12:00');
  assert.equal(archiveIsUnlocked(80_000, 80), true);
});

test('the clock keeps running after midnight', () => {
  assert.equal(clockDisplayAt(0, 360).display, '11:48');
  assert.equal(clockDisplayAt(359_000, 360).isMidnight, false);
  assert.equal(clockDisplayAt(360_000, 360).display, '12:00');
  assert.equal(clockDisplayAt(360_000 + 31_000, 360).display, '12:01');
  assert.equal(clockDisplayAt(360_000 + 31_000, 360).hour24, 0);
});

test('app layout helpers stay valid', () => {
  assert.equal(new Set(normalizeAppOrder(['photos', 'after', 'photos'])).size, DEFAULT_APP_ORDER.length);
  assert.deepEqual(moveApp(DEFAULT_APP_ORDER, 'after', 'messages').slice(0, 2), ['after', 'messages']);
});

test('AFTER has friend, family, neighbour and celebrity secrets readable before midnight', () => {
  const early = ARCHIVE.filter(item => !isMidnightOnly(item));
  for (const cat of ['TEMAN', 'KELUARGA', 'TETANGGA', 'ARTIS']) {
    assert.ok(early.some(item => item.category === cat), cat);
    assert.ok(ARCHIVE_FILTERS.includes(cat));
  }
  assert.equal(ARCHIVE.filter(isMidnightOnly).length, 4);
  for (const item of early) assert.ok(CONTACTS.some(c => `${c.id}-file` === item.id), item.id);
});

test('every clue is hinted by exactly one AFTER file and the storage can be opened', () => {
  assert.equal(CLUES.length, 5);
  for (const clue of CLUES) {
    const source = ARCHIVE.find(a => a.id === clue.from);
    assert.ok(source, clue.id);
    assert.equal(source.clue, clue.id);
    assert.ok(clue.note.title && clue.text && clue.teaser && clue.place);
  }
  assert.ok(CLUES_TO_OPEN_STORAGE <= CLUES.length);
  assert.ok(FINALE.length >= 4);
});
