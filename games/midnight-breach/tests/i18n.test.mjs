import test from 'node:test';
import assert from 'node:assert/strict';
import { allKeys, hasKey, setLang, t, LANGS } from '../src/i18n.mjs';
import { getStory, FILTER_IDS } from '../src/story.mjs';

test('every UI key exists in both languages', () => {
  for (const key of allKeys()) assert.ok(hasKey(key, 'en'), 'missing en: ' + key);
  setLang('en');
  assert.equal(t('act.open'), 'Open door');
  assert.equal(t('goal.find', { place: 'X' }), 'Find: X');
  setLang('id');
  assert.equal(t('act.open'), 'Buka pintu');
});

test('Indonesian and English stories have identical structure', () => {
  const id = getStory('id'), en = getStory('en');
  assert.deepEqual(en.CLUES.map(c => c.id), id.CLUES.map(c => c.id));
  assert.deepEqual(en.ARCHIVE.map(a => [a.id, a.category, a.scene, a.clue]), id.ARCHIVE.map(a => [a.id, a.category, a.scene, a.clue]));
  assert.deepEqual(en.CONTACTS.map(c => c.id), id.CONTACTS.map(c => c.id));
  assert.deepEqual(en.THREADS.map(c => [c.id, c.messages.length]), id.THREADS.map(c => [c.id, c.messages.length]));
  assert.equal(en.NOTES.length, id.NOTES.length);
  assert.equal(en.FINALE.length, id.FINALE.length);
  assert.equal(en.PHOTO_LINES.length, id.PHOTO_LINES.length);
  assert.deepEqual(Object.keys(en.NPC), Object.keys(id.NPC));
  for (const k of Object.keys(id.NPC)) assert.equal(en.NPC[k].lines.length, id.NPC[k].lines.length);
  assert.deepEqual(Object.keys(en.ENDINGS), Object.keys(id.ENDINGS));
  for (const f of FILTER_IDS) assert.ok(en.CATEGORY_NAMES[f] && id.CATEGORY_NAMES[f], f);
  assert.deepEqual(LANGS, ['id', 'en']);
});

test('English text contains no leftover Indonesian words', () => {
  const words = /\b(yang|dan|tidak|rumah|kamu|aku|dengan|untuk|sudah|ini|itu|tiket|pintu|rahasia|berkas|teman|tetangga|keluarga|ujung|malam|nak|tapi|akan|dari|ke|di)\b/i;
  const en = getStory('en');
  const walk = (v, path, out) => {
    if (typeof v === 'string') out.push([path, v]);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, out));
    else if (v && typeof v === 'object') for (const k in v) walk(v[k], `${path}.${k}`, out);
    return out;
  };
  for (const [path, text] of walk(en, 'EN', [])) {
    if (/\.(id|from|scene|clue|category|tint|initials|afterClue|act)$|\.who$/.test(path) && !/NPC/.test(path)) continue;
    assert.ok(!words.test(text), `${path}: ${text}`);
  }
});
