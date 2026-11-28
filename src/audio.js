// Procedural WebAudio: SFX, wave ambience (muffled underwater) and a soft looping pad. No asset files needed.
let ctx = null, master = null, ambGain = null, ambFilter = null, musicGain = null, muted = false, musicTimer = 0;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
    // ambience: looped noise through a lowpass
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + (Math.random() * 2 - 1) * 0.06) * 0.985; d[i] = last * 3; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    ambFilter = ctx.createBiquadFilter(); ambFilter.type = 'lowpass'; ambFilter.frequency.value = 900;
    ambGain = ctx.createGain(); ambGain.gain.value = 0.35;
    src.connect(ambFilter); ambFilter.connect(ambGain); ambGain.connect(master); src.start();
    musicGain = ctx.createGain(); musicGain.gain.value = 0.10; musicGain.connect(master);
    scheduleMusic();
  } catch (e) { ctx = null; }
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.8; }
export function setUnderwater(u) {
  if (!ctx) return;
  const tt = ctx.currentTime;
  ambFilter.frequency.setTargetAtTime(u ? 260 : 900, tt, 0.15);
  ambGain.gain.setTargetAtTime(u ? 0.5 : 0.3, tt, 0.15);
  musicGain.gain.setTargetAtTime(u ? 0.06 : 0.10, tt, 0.2);
}
const CHORDS = [[196, 247, 294], [175, 220, 262], [147, 185, 220], [165, 196, 247]];
function scheduleMusic() {
  if (!ctx) return;
  const chord = CHORDS[musicTimer++ % CHORDS.length], now = ctx.currentTime;
  chord.forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f * (i === 2 ? 2 : 1);
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.5, now + 1.5); g.gain.linearRampToValueAtTime(0, now + 5.5);
    o.connect(g); g.connect(musicGain); o.start(now); o.stop(now + 5.6);
  });
  setTimeout(scheduleMusic, 4500);
}
function tone(freq, dur, type, vol, slide) {
  if (!ctx) return;
  const now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, now);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), now + dur);
  g.gain.setValueAtTime(vol || 0.3, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  o.connect(g); g.connect(master); o.start(now); o.stop(now + dur + 0.02);
}
function noise(dur, vol, freq) {
  if (!ctx) return;
  const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1500;
  const g = ctx.createGain(); g.gain.value = vol || 0.4;
  s.connect(f); f.connect(g); g.connect(master); s.start();
}
export const sfx = {
  ui: () => tone(660, 0.08, 'triangle', 0.2),
  splash: () => noise(0.5, 0.6, 1800),
  punch: () => { noise(0.12, 0.5, 700); tone(140, 0.12, 'square', 0.25, 0.5); },
  hit: () => tone(300, 0.1, 'square', 0.2, 0.6),
  pickup: (r) => { const k = r || 1; tone(660 * k, 0.1, 'triangle', 0.3); setTimeout(() => tone(990 * k, 0.14, 'triangle', 0.3), 70); },
  thud: () => { tone(80, 0.28, 'sine', 0.55, 0.45); noise(0.18, 0.5, 500); },
  crunch: () => { noise(0.22, 0.6, 2400); tone(220, 0.14, 'square', 0.2, 0.4); },
  craft: () => { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.3), i * 90)); },
  hurt: () => tone(180, 0.25, 'sawtooth', 0.25, 0.5),
  warn: () => { tone(440, 0.15, 'square', 0.2); setTimeout(() => tone(440, 0.15, 'square', 0.2), 200); },
  cast: () => { tone(500, 0.3, 'sine', 0.25, 2.2); },
  pop: () => { tone(800, 0.12, 'triangle', 0.3, 0.3); },
  win: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.35), i * 140)); }
};
