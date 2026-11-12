// Sound: generated looping music from the asset map plus tiny synthesised effects (no downloads needed).
let ctx = null, master = null, music = null, muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
  return ctx;
}

/** Call from the first tap so the browser allows audio. */
export function unlockAudio() {
  const c = ensure(); if (c && c.state === 'suspended') c.resume();
  if (!music) {
    const asset = window.lib?.getAsset?.('music_bgm');
    if (asset?.url) {
      music = new Audio(asset.url); music.loop = true; music.volume = 0.32; music.muted = muted;
    }
  }
  if (music && music.paused) music.play().catch(() => {});
}

export function stopAudio() {
  if (music) { music.pause(); music = null; }
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.5;
  if (music) music.muted = muted;
}
export const isMuted = () => muted;

function tone(freq, start, dur, type = 'sine', vol = 0.3, slideTo) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + start, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
}

function noise(dur, vol, from, to) {
  if (!ctx || muted) return;
  const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, ctx.currentTime); f.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start();
}

export const sfx = {
  peep() { tone(1400, 0, 0.09, 'square', 0.12, 1900); tone(1700, 0.11, 0.1, 'square', 0.12, 2200); },
  fish() { tone(880, 0, 0.08, 'triangle', 0.3); tone(1320, 0.07, 0.14, 'triangle', 0.3); },
  jump() { tone(320, 0, 0.18, 'sine', 0.25, 640); },
  home() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.16, 'triangle', 0.3)); },
  whoosh() { noise(0.7, 0.5, 300, 2400); tone(500, 0, 0.5, 'sine', 0.12, 160); },
  sled() { noise(0.25, 0.2, 1800, 600); },
  ouch() { tone(520, 0, 0.16, 'square', 0.16, 180); tone(300, 0.14, 0.2, 'square', 0.14, 120); },
  splash() { noise(0.5, 0.5, 900, 250); tone(260, 0, 0.3, 'sine', 0.2, 90); },
  heart() { [660, 880, 1320].forEach((f, i) => tone(f, i * 0.07, 0.16, 'sine', 0.28)); },
  tick() { tone(980, 0, 0.07, 'square', 0.1); },
  pop() { noise(0.25, 0.35, 700, 200); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.2, 0.32, 'triangle', 0.3)); },
  crack() { noise(0.22, 0.5, 3200, 700); tone(180, 0, 0.12, 'square', 0.12, 90); },
  tink() { tone(2400, 0, 0.09, 'sine', 0.07); tone(3200, 0.06, 0.12, 'sine', 0.05); },
  tap() { tone(700, 0, 0.06, 'triangle', 0.2); },
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.13, 0.28, 'triangle', 0.32)); },
};
