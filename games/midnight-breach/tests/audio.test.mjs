import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/audio.mjs';

test('audio is inert without a Web Audio context and never throws', () => {
  const a = createAudio();
  assert.equal(a.unlock(), false); // no AudioContext in Node
  for (const name of ['step', 'door', 'locked', 'unlockDoor', 'knock', 'clue', 'ping', 'phone', 'buzz', 'click', 'blip', 'error', 'creak', 'heartbeat', 'whisper', 'stinger', 'midnight', 'ending', 'stopSpeech']) {
    assert.doesNotThrow(() => a[name]('x'), name);
  }
  assert.doesNotThrow(() => a.speak('Rani', 'halo'));
  assert.doesNotThrow(() => a.update({ indoor: true, late: false, fear: 1, mood: 'explore', carDist: 5 }));
  assert.doesNotThrow(() => a.schedule(10, 0));
  assert.doesNotThrow(() => a.dispose());
});

test('mute state is remembered even before the context exists', () => {
  const a = createAudio();
  a.setMuted(true);
  assert.equal(a.isMuted(), true);
  a.setMuted(false);
  assert.equal(a.isMuted(), false);
});
