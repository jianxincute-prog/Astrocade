// Procedural audio (Web Audio, no asset files): sound effects, skating/footstep loops, wind ambience and a gentle
// generative music bed that follows the time of day. Everything is optional: if audio is unavailable the game runs silently.
const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;

export function createAudio() {
  let ctx = null, master = null, gMusic = null, gSfx = null, gAmb = null, noise = null, delay = null;
  let blade = null, wind = null, started = false, disposed = false;
  const vol = { master: 0.8, music: 0.5, sfx: 0.8, amb: 0.6 };
  const mood = { dark: 0, weather: 0.2 };
  let musicTimer = 0, nextNote = 0, beat = 0;
  const motion = { skate: false, speed: 0 };

  function ensure() {
    if (ctx || !AC || disposed) return !!ctx;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.connect(ctx.destination);
      gMusic = ctx.createGain(); gSfx = ctx.createGain(); gAmb = ctx.createGain();
      gMusic.connect(master); gSfx.connect(master); gAmb.connect(master);
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let b0 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.97 * b0 + 0.03 * w; d[i] = (w * 0.5 + b0 * 6) * 0.6; }
      noise = buf;
      // soft echo for the music
      delay = ctx.createDelay(1.2); delay.delayTime.value = 0.42;
      const fb = ctx.createGain(); fb.gain.value = 0.38; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(gMusic);
      applyVol();
      // continuous layers: skate blade scrape and wind
      blade = loop(2200, 'bandpass', 1.2); wind = loop(380, 'lowpass', 0.7);
      return true;
    } catch (e) { ctx = null; return false; }
  }
  function loop(freq, type, q) {
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(gAmb); src.start();
    return { f, g };
  }
  function applyVol() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(vol.master, t, 0.05); gMusic.gain.setTargetAtTime(vol.music * 0.55, t, 0.1);
    gSfx.gain.setTargetAtTime(vol.sfx, t, 0.05); gAmb.gain.setTargetAtTime(vol.amb, t, 0.1);
  }

  // ---------------------------------------------------------------- primitives
  function tone(freq, dur, type = 'sine', v = 0.2, when = 0, slide = 0, dest = null) {
    if (!ctx) return;
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.02, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || gSfx); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss(dur, type, f0, f1, v = 0.15, when = 0, q = 1) {
    if (!ctx) return;
    const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; s.loopStart = Math.random(); s.loop = true; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.03, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(gSfx); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const arp = (notes, step = 0.09, type = 'triangle', v = 0.16, len = 0.28) => notes.forEach((n, i) => tone(n, len, type, v, i * step));

  const SFX = {
    tap: () => tone(880, 0.06, 'sine', 0.12),
    stroke: () => hiss(0.2, 'bandpass', 2000, 900, 0.1, 0, 1.4),
    step: () => hiss(0.07, 'lowpass', 600, 300, 0.09),
    fall: () => { tone(110, 0.32, 'sine', 0.5, 0, 45); hiss(0.28, 'lowpass', 900, 200, 0.35); },
    wobble: () => { tone(340, 0.12, 'triangle', 0.14); tone(300, 0.14, 'triangle', 0.14, 0.14); },
    up: () => tone(520, 0.22, 'sine', 0.15, 0, 700),
    spin: () => hiss(0.55, 'bandpass', 500, 2600, 0.18, 0, 1.2),
    err: () => tone(190, 0.16, 'square', 0.08),
    coin: () => { tone(1320, 0.07, 'square', 0.07); tone(1760, 0.12, 'square', 0.07, 0.06); },
    level: () => arp([523, 659, 784, 1046, 1318], 0.1, 'triangle', 0.17, 0.4),
    goal: () => arp([784, 988, 1175], 0.09, 'triangle', 0.16, 0.3),
    zone: () => { tone(660, 0.5, 'sine', 0.12); tone(990, 0.6, 'sine', 0.1, 0.12); },
    door: () => { tone(784, 0.35, 'sine', 0.13); tone(1046, 0.45, 'sine', 0.1, 0.11); },
    eat: () => [0, 0.15, 0.3].forEach((w) => hiss(0.06, 'bandpass', 2600, 1800, 0.12, w, 2)),
    sit: () => { tone(130, 0.14, 'sine', 0.2, 0, 90); hiss(0.1, 'lowpass', 500, 250, 0.08); },
    event: () => { tone(659, 1.2, 'sine', 0.14); tone(988, 1.0, 'sine', 0.1, 0.18); tone(1318, 0.9, 'sine', 0.07, 0.36); },
    firework: () => { hiss(0.7, 'lowpass', 3500, 250, 0.22); tone(140, 0.4, 'sine', 0.22, 0, 60); },
    lantern: () => { tone(1046, 0.5, 'sine', 0.13); tone(1568, 0.6, 'sine', 0.09, 0.07); },
    heart: () => arp([523, 659, 784], 0.12, 'sine', 0.15, 0.5),
    dialog: () => tone(620, 0.07, 'sine', 0.1),
  };

  // ---------------------------------------------------------------- music: a slow generative pentatonic bed
  const DAY = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784];      // C major pentatonic
  const NIGHT = [220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];    // A minor pentatonic
  const CHORDS = [[0, 2, 4], [3, 5, 7], [1, 3, 5], [2, 4, 6]];
  function musicTick() {
    if (!ctx || vol.music <= 0.001 || ctx.state !== 'running') return;
    const spb = 60 / (mood.dark > 0.5 ? 46 : 62);
    while (nextNote < ctx.currentTime + 1.4) {
      const scale = mood.dark > 0.5 ? NIGHT : DAY, chord = CHORDS[Math.floor(beat / 4) % CHORDS.length], when = Math.max(0, nextNote - ctx.currentTime);
      if (beat % 4 === 0) { chord.forEach((c, i) => pad(scale[c] * (i ? 1 : 0.5), spb * 4.2, when + i * 0.03)); }
      if (Math.random() < 0.72) { const n = scale[chord[Math.floor(Math.random() * 3)] + (Math.random() < 0.4 ? 2 : 0)] || scale[2]; bell(n * (Math.random() < 0.3 ? 2 : 1), when); }
      beat++; nextNote += spb;
    }
  }
  function bell(f, when) { tone(f, 1.6, 'sine', 0.1, when, 0, gMusic); tone(f * 2.01, 0.8, 'sine', 0.03, when, 0, gMusic); }
  function pad(f, dur, when) {
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain(), o2 = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 1.004;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o2.connect(g); g.connect(gMusic); if (delay) g.connect(delay);
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  function startMusic() { if (started || !ctx) return; started = true; nextNote = ctx.currentTime + 0.3; musicTimer = setInterval(musicTick, 300); }

  return {
    unlock() { if (!ensure()) return; if (ctx.state === 'suspended') ctx.resume(); startMusic(); },
    play(name) { try { if (ctx && ctx.state === 'running' && SFX[name]) SFX[name](); } catch (e) { /* audio is optional */ } },
    setVolumes(v) { Object.assign(vol, v); applyVol(); },
    getVolumes: () => ({ ...vol }),
    // per-frame: skating scrape follows speed; wind follows the weather; music mood follows night
    setMotion(skate, speed) { motion.skate = skate; motion.speed = speed; },
    setWorld(dark, windAmt) { mood.dark = dark; mood.weather = windAmt; },
    update() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const bv = motion.skate ? Math.min(1, motion.speed / 14) : 0;
      blade.g.gain.setTargetAtTime(bv * 0.16, t, 0.08); blade.f.frequency.setTargetAtTime(1200 + bv * 2600, t, 0.1);
      wind.g.gain.setTargetAtTime(0.03 + mood.weather * 0.28, t, 0.5);
    },
    dispose() { disposed = true; clearInterval(musicTimer); try { if (ctx) ctx.close(); } catch (e) { /* ignore */ } },
  };
}
