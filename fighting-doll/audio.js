// Tiny WebAudio synth: sound effects + a looping chiptune background tune. No external files.
let ctx = null, master = null, sfxG = null, musG = null;
let muted = false, musicMode = null, timer = null, step = 0, nextT = 0, noiseBuf = null;

function init() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    sfxG = ctx.createGain(); sfxG.gain.value = 0.8; sfxG.connect(master);
    musG = ctx.createGain(); musG.gain.value = 0.22; musG.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  } catch (e) { ctx = null; return false; }
}
function resume() { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }

function tone(f, dur, type = 'square', vol = 0.3, slide = null, when = 0, dest = null) {
  if (!ctx) return;
  try {
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxG);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
function noise(dur, vol = 0.3, freq = 1800, when = 0) {
  if (!ctx) return;
  try {
    const t = ctx.currentTime + when;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxG);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  } catch (e) {}
}

const N = (semi) => 523.25 * Math.pow(2, semi / 12); // semitones above C5
const MENU = { bpm: 112, mel: [0,null,4,null,7,null,12,7, 9,null,5,null,9,null,12,null, 7,null,11,null,14,null,11,7, 4,null,7,null,4,null,2,null], bass: [-24,-24,-17,-24, -19,-19,-12,-19, -17,-17,-10,-17, -24,-24,-17,-24] };
const FIGHT = { bpm: 148, mel: [7,null,7,10,12,null,10,7, 5,null,5,8,12,null,8,5, 3,null,3,7,10,null,7,3, 2,null,5,7,null,5,7,null], bass: [-21,-21,-21,-14, -16,-16,-16,-9, -18,-18,-18,-11, -19,-19,-12,-19] };

function sched() {
  if (!ctx || !musicMode || muted) return;
  const P = musicMode === 'fight' ? FIGHT : MENU;
  const eighth = 60 / P.bpm / 2;
  while (nextT < ctx.currentTime + 0.25) {
    const when = Math.max(0, nextT - ctx.currentTime);
    const m = P.mel[step % P.mel.length];
    if (m !== null) tone(N(m), eighth * 1.4, 'square', 0.16, null, when, musG);
    if (step % 2 === 0) tone(N(P.bass[(step / 2) % P.bass.length | 0]), eighth * 1.6, 'triangle', 0.4, null, when, musG);
    if (musicMode === 'fight' && step % 2 === 1) noise(0.04, 0.1, 6000, when);
    step++; nextT += eighth;
  }
}
function music(mode) {
  if (!ctx) return;
  if (mode === musicMode) return;
  musicMode = mode; step = 0; nextT = ctx.currentTime + 0.05;
  if (timer) { clearInterval(timer); timer = null; }
  if (mode) timer = setInterval(sched, 60);
}

export const Audio = {
  init, resume, music,
  get muted() { return muted; },
  setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.9;
    if (!m && musicMode) { nextT = ctx ? ctx.currentTime + 0.05 : 0; }
  },
  punch() { noise(0.07, 0.35, 2200); tone(220, 0.1, 'square', 0.22, 70); },
  kick() { noise(0.14, 0.4, 1500); tone(280, 0.16, 'sawtooth', 0.22, 55); },
  hit(big) { tone(big ? 520 : 420, big ? 0.22 : 0.12, 'triangle', 0.4, big ? 90 : 130); noise(big ? 0.2 : 0.08, big ? 0.45 : 0.3, 3000); },
  whiff() { noise(0.09, 0.12, 5000); },
  jump() { tone(300, 0.14, 'sine', 0.28, 720); },
  land() { tone(140, 0.07, 'sine', 0.25, 60); },
  charge() { tone(180, 0.5, 'sawtooth', 0.14, 1000); tone(360, 0.5, 'sine', 0.12, 1500); },
  special() { noise(0.35, 0.4, 4000); tone(1000, 0.35, 'square', 0.2, 120); tone(500, 0.3, 'sawtooth', 0.15, 80); },
  ready() { tone(660, 0.08, 'square', 0.2); tone(990, 0.12, 'square', 0.2, null, 0.08); },
  tick() { tone(900, 0.04, 'sine', 0.25); },
  boing() { tone(300, 0.25, 'sine', 0.35, 760); tone(760, 0.2, 'sine', 0.25, 330, 0.12); },
  select() { tone(660, 0.07, 'square', 0.22); tone(880, 0.1, 'square', 0.22, null, 0.07); },
  ding() { tone(1318, 0.5, 'sine', 0.3); tone(1976, 0.4, 'sine', 0.15); },
  fight() { tone(220, 0.18, 'sawtooth', 0.3, 330); tone(330, 0.3, 'sawtooth', 0.3, 440, 0.15); noise(0.2, 0.25, 3000, 0.15); },
  ko() { tone(700, 0.9, 'sawtooth', 0.3, 60); noise(0.5, 0.45, 1200); tone(100, 0.5, 'sine', 0.5, 40, 0.1); },
  win() { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(N(s), 0.22, 'square', 0.22, null, i * 0.12)); },
  lose() { [7, 5, 2, -5].forEach((s, i) => tone(N(s), 0.3, 'triangle', 0.35, null, i * 0.2)); },
  cheer() { for (let i = 0; i < 6; i++) tone(500 + Math.random() * 900, 0.08, 'sine', 0.15, null, i * 0.05); },
};
