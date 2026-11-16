// Procedural audio for Midnight Breach: sound effects, ambience, adaptive music and speech blips,
// all synthesised with the Web Audio API (no audio assets, nothing to download).
//
// createAudio() makes no AudioContext until unlock() is called from a user gesture (browser
// autoplay rule). Tests can pass { ctx } (e.g. an OfflineAudioContext) to render sounds to a buffer.

const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Music moods: chords as MIDI notes, pad length (s), gap range between melody notes, melody scale.
const MOODS = {
  menu: { chords: [[45, 52, 57, 60], [41, 48, 52, 57]], len: 14, gap: [3.5, 7], scale: [69, 72, 74, 76, 79] },
  explore: { chords: [[45, 52, 57, 60], [41, 48, 52, 57], [38, 45, 50, 53], [40, 47, 52, 57]], len: 12, gap: [2.6, 6], scale: [69, 72, 74, 76, 79, 81] },
  late: { chords: [[45, 52, 57, 60], [46, 53, 58, 62], [45, 52, 56, 60], [44, 51, 56, 59]], len: 9, gap: [1.8, 4.5], scale: [69, 70, 73, 75, 76, 82], dark: true },
  finale: { chords: [[45, 52, 57, 60], [41, 48, 53, 57], [48, 55, 60, 64], [43, 50, 55, 59]], len: 8, gap: [1.1, 2.2], scale: [69, 72, 76, 79, 81, 84], arp: true },
  'end-delete': { chords: [[48, 55, 60, 64], [53, 60, 64, 69], [48, 55, 60, 64]], len: 7, gap: [1.4, 2.6], scale: [72, 74, 76, 79, 81] },
  'end-keep': { chords: [[45, 52, 57, 60], [46, 53, 57, 62], [45, 52, 57, 60]], len: 8, gap: [1.8, 3.4], scale: [69, 70, 72, 76, 77], dark: true },
};

export function createAudio(opts = {}) {
  const rnd = mulberry(opts.seed ?? 7);
  let ctx = opts.ctx || null;
  let built = false, muted = false, ambienceOn = false;
  let master, comp, sfx, mus, amb, verbIn, noiseBuf, pinkBuf;
  const eng = {};
  const m = { mood: 'menu', intensity: 0, nextChord: -1, chord: 0, nextNote: 0, noteIdx: 2, arpIdx: 0 };
  let cricketAt = 0, outdoor = 0, late = false, speech = null;

  const g = v => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const now = () => ctx.currentTime + 0.005;

  function build() {
    if (built || !ctx) return;
    built = true;
    master = g(muted ? 0 : 0.9);
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 4; comp.attack.value = 0.006; comp.release.value = 0.25;
    master.connect(comp); comp.connect(ctx.destination);
    sfx = g(0.9); mus = g(0.5); amb = g(0.55);
    sfx.connect(master); mus.connect(master); amb.connect(master);
    // reverb: decaying stereo noise impulse
    const len = Math.floor(ctx.sampleRate * 2.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    verbIn = g(opts.reverb === false ? 0 : 1);
    const verbOut = g(0.55);
    verbIn.connect(conv); conv.connect(verbOut); verbOut.connect(master);
    // noise sources
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
    pinkBuf = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
    const pd = pinkBuf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < pd.length; i++) { const w = rnd() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; pd[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
  }

  // ---------- building blocks ----------
  function env(gn, t, a, peak, d) {
    const p = gn.gain; p.cancelScheduledValues(t);
    p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(peak, t + a); p.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function out(node, dest, send = 0, pan = 0) {
    let n = node;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); n.connect(p); n = p; }
    n.connect(dest);
    if (send > 0) { const s = g(send); n.connect(s); s.connect(verbIn); }
  }
  function tone({ type = 'sine', f, f2 = null, t, a = 0.005, d = 0.3, peak = 0.2, dest = sfx, send = 0, pan = 0, detune = 0 }) {
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    env(gn, t, a, peak, d); o.connect(gn); out(gn, dest, send, pan);
    o.start(t); o.stop(t + a + d + 0.05);
    return gn;
  }
  function noise({ t, d = 0.1, type = 'lowpass', f = 800, f2 = null, q = 1, peak = 0.2, a = 0.003, dest = sfx, send = 0, pan = 0, buf = null }) {
    const s = ctx.createBufferSource(); s.buffer = buf || noiseBuf; s.loop = true;
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    const gn = ctx.createGain(); env(gn, t, a, peak, d);
    s.connect(flt); flt.connect(gn); out(gn, dest, send, pan);
    s.start(t, rnd() * 1.5); s.stop(t + a + d + 0.05);
  }
  const ok = () => !!ctx && built;

  // ---------- sound effects ----------
  const SURFACES = {
    wood: { type: 'lowpass', f: 700, d: 0.09, peak: 0.2, thump: 110 },
    tile: { type: 'bandpass', f: 2200, d: 0.05, peak: 0.14, thump: 230 },
    concrete: { type: 'bandpass', f: 1400, d: 0.07, peak: 0.18, thump: 150 },
    asphalt: { type: 'bandpass', f: 1100, d: 0.07, peak: 0.16, thump: 130 },
    grass: { type: 'lowpass', f: 950, d: 0.15, peak: 0.1, thump: 0 },
  };
  const api = {
    get ctx() { return ctx; },
    isMuted: () => muted,

    /** Call from a user gesture. Creates the context, resumes it and starts the ambience. */
    unlock() {
      if (!ctx) {
        const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return false;
        try { ctx = new AC(); } catch (_) { return false; }
      }
      build();
      if (ctx.state === 'suspended') ctx.resume?.().catch?.(() => {});
      api.startAmbience();
      return true;
    },
    /** Builds the graph on a provided context (tests); unlock() does this for the real one. */
    prepare() { build(); },
    setMuted(v) {
      muted = !!v;
      if (ok()) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
    },
    setPaused(v) { if (ctx?.state) { try { v ? ctx.suspend() : (!muted && ctx.resume()); } catch (_) { /* ignore */ } } },

    step(surface = 'wood') {
      if (!ok()) return;
      const s = SURFACES[surface] || SURFACES.wood, t = now(), v = 0.85 + rnd() * 0.3, pan = (rnd() - 0.5) * 0.3;
      noise({ t, d: s.d, type: s.type, f: s.f * v, q: 0.8, peak: s.peak * 3.2, pan });
      if (s.thump) tone({ f: s.thump * v, f2: s.thump * 0.6, t, a: 0.003, d: 0.06, peak: 0.26, pan });
    },
    door(open, far = false) {
      if (!ok()) return;
      const t = now(), k = far ? 0.45 : 1;
      const dest = sfx;
      if (open) {
        noise({ t, d: 0.04, type: 'highpass', f: 1800, peak: 0.25 * k });                         // latch
        const o = ctx.createOscillator(), flt = ctx.createBiquadFilter(), gn = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(105, t + 0.04); o.frequency.linearRampToValueAtTime(205, t + 0.7); o.frequency.linearRampToValueAtTime(170, t + 0.9);
        lfo.frequency.value = 22; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency);
        flt.type = 'bandpass'; flt.frequency.value = far ? 450 : 650; flt.Q.value = 7;
        env(gn, t + 0.04, 0.12, 0.6 * k, 0.8);
        o.connect(flt); flt.connect(gn); out(gn, dest, 0.25);
        o.start(t + 0.04); lfo.start(t + 0.04); o.stop(t + 1.05); lfo.stop(t + 1.05);
      } else {
        const o = ctx.createOscillator(), flt = ctx.createBiquadFilter(), gn = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t); o.frequency.linearRampToValueAtTime(115, t + 0.5);
        flt.type = 'bandpass'; flt.frequency.value = far ? 420 : 600; flt.Q.value = 7;
        env(gn, t, 0.06, 0.42 * k, 0.5); o.connect(flt); flt.connect(gn); out(gn, dest, 0.2);
        o.start(t); o.stop(t + 0.7);
        tone({ f: 80, f2: 45, t: t + 0.5, a: 0.004, d: 0.2, peak: 0.45 * k });                  // thud
        noise({ t: t + 0.5, d: 0.12, type: 'lowpass', f: 500, peak: 0.25 * k });
      }
    },
    locked() {
      if (!ok()) return;
      const t = now();
      for (let i = 0; i < 2; i++) { tone({ f: 150, f2: 95, t: t + i * 0.12, a: 0.003, d: 0.09, peak: 0.3 }); noise({ t: t + i * 0.12, d: 0.05, type: 'bandpass', f: 500, peak: 0.18 }); }
      noise({ t: t + 0.28, d: 0.18, type: 'highpass', f: 2500, peak: 0.07 });                  // rattle
    },
    unlockDoor() {
      if (!ok()) return;
      const t = now();
      noise({ t, d: 0.04, type: 'highpass', f: 3000, peak: 0.16 }); noise({ t: t + 0.11, d: 0.05, type: 'highpass', f: 2200, peak: 0.18 });
      tone({ f: 120, f2: 70, t: t + 0.2, a: 0.004, d: 0.25, peak: 0.4 });
    },
    knock(n = 3) {
      if (!ok()) return;
      const t = now();
      for (let i = 0; i < n; i++) { const at = t + i * 0.34; tone({ f: 150, f2: 85, t: at, a: 0.002, d: 0.14, peak: 0.5, send: 0.2 }); noise({ t: at, d: 0.06, type: 'bandpass', f: 420, peak: 0.3, send: 0.15 }); }
    },
    clue() {
      if (!ok()) return;
      const t = now();
      [[1, 1, 1.6], [2.76, 0.4, 0.9], [5.4, 0.15, 0.5]].forEach(([r, v, d]) => tone({ f: 659 * r, t, a: 0.004, d, peak: 0.16 * v, send: 0.5 }));
      tone({ f: 330, t, a: 0.5, d: 0.9, peak: 0.05, send: 0.4 });
    },
    ping() {
      if (!ok()) return;
      const t = now();
      tone({ type: 'triangle', f: 880, t, a: 0.004, d: 0.18, peak: 0.2, send: 0.2 }); tone({ type: 'triangle', f: 1320, t: t + 0.09, a: 0.004, d: 0.25, peak: 0.18, send: 0.25 });
    },
    phone(open) {
      if (!ok()) return;
      const t = now();
      noise({ t, d: 0.2, type: 'bandpass', f: open ? 400 : 1800, f2: open ? 1800 : 400, q: 1.2, peak: 0.3 });
      tone({ type: 'triangle', f: open ? 1000 : 700, t: t + 0.12, a: 0.003, d: 0.08, peak: 0.12 });
    },
    buzz() {
      if (!ok()) return;
      const t = now();
      for (let i = 0; i < 2; i++) { const gn = tone({ type: 'square', f: 150, t: t + i * 0.22, a: 0.01, d: 0.12, peak: 0.12 }); void gn; }
    },
    click() { if (ok()) tone({ type: 'triangle', f: 1400, t: now(), a: 0.002, d: 0.03, peak: 0.16 }); },
    blip() { if (ok()) tone({ f: 900, f2: 1200, t: now(), a: 0.003, d: 0.05, peak: 0.16 }); },
    error() { if (ok()) tone({ type: 'sawtooth', f: 120, f2: 80, t: now(), a: 0.004, d: 0.14, peak: 0.28 }); },
    creak() {
      if (!ok()) return;
      const t = now(), o = ctx.createOscillator(), flt = ctx.createBiquadFilter(), gn = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(78, t); o.frequency.linearRampToValueAtTime(96, t + 0.45); o.frequency.linearRampToValueAtTime(70, t + 0.8);
      flt.type = 'bandpass'; flt.frequency.value = 300; flt.Q.value = 9; env(gn, t, 0.2, 0.3, 0.6);
      o.connect(flt); flt.connect(gn); out(gn, sfx, 0.3); o.start(t); o.stop(t + 1);
    },
    heartbeat(p = 1) {
      if (!ok()) return;
      const t = now(), k = clamp(p, 0.3, 1.3);
      tone({ f: 62, f2: 40, t, a: 0.004, d: 0.12, peak: 0.55 * k }); tone({ f: 52, f2: 36, t: t + 0.15, a: 0.004, d: 0.14, peak: 0.42 * k });
    },
    whisper() {
      if (!ok()) return;
      const t = now() + 0.02, pan = (rnd() - 0.5) * 1.4, dur = 0.9 + rnd() * 0.7;
      noise({ t, d: dur, a: 0.35, type: 'bandpass', f: 650, f2: 950, q: 7, peak: 0.4, pan, send: 0.6 });
      noise({ t, d: dur, a: 0.35, type: 'bandpass', f: 2300, f2: 2900, q: 9, peak: 0.27, pan, send: 0.6 });
      noise({ t: t + dur * 0.55, d: 0.3, a: 0.05, type: 'highpass', f: 5200, peak: 0.1, pan, send: 0.5 });
    },
    stinger() {
      if (!ok()) return;
      const t = now();
      tone({ type: 'sawtooth', f: 440, t, a: 0.06, d: 1.3, peak: 0.07, send: 0.5, detune: -8 }); tone({ type: 'sawtooth', f: 466, t, a: 0.06, d: 1.3, peak: 0.07, send: 0.5, detune: 8 });
      tone({ f: 55, f2: 45, t, a: 0.01, d: 1.0, peak: 0.3 });
    },
    midnight() {
      if (!ok()) return;
      const t = now();
      tone({ f: 70, f2: 38, t, a: 0.01, d: 3.2, peak: 0.6 });
      [233, 247].forEach(f => [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([r, v]) => tone({ f: f * r, t: t + 0.05, a: 0.01, d: 3.4, peak: 0.12 * v, send: 0.7 })));
      noise({ t, d: 1.9, a: 1.7, type: 'bandpass', f: 200, f2: 3200, q: 2, peak: 0.25, send: 0.3 });
      for (let i = 0; i < 6; i++) tone({ type: 'square', f: 300 + rnd() * 2400, t: t + 1.9 + i * 0.045, a: 0.002, d: 0.03, peak: 0.05 });
    },
    ending(kind) {
      if (!ok()) return;
      const t = now(), notes = kind === 'delete' ? [72, 76, 79, 83, 84] : [69, 72, 76, 77, 69];
      notes.forEach((n, i) => [[1, 1], [2.76, 0.25]].forEach(([r, v]) => tone({ f: midi(n) * r, t: t + i * 0.32, a: 0.004, d: 2.4, peak: 0.12 * v, send: 0.6 })));
      tone({ f: kind === 'delete' ? 65.4 : 55, t, a: 0.4, d: 4, peak: 0.25 });
    },

    /** Talking blips in time with the mouth: kind = 'Rani' | 'Bu Wati' | 'Pak Darto' | other. */
    speak(kind, text) {
      api.stopSpeech();
      if (!ok() || !text) return;
      const base = { 'Bu Wati': 330, 'Pak Darto': 150, Rani: 250, 'Bu Sari': 290 }[kind] || 0;
      if (!base) return;
      const type = kind === 'Pak Darto' ? 'square' : kind === 'Rani' ? 'sine' : 'triangle';
      const bus = g(1); out(bus, sfx, kind === 'Rani' ? 0.5 : 0.1);
      speech = bus;
      let t = now() + 0.03, count = 0;
      for (const ch of text) {
        if (count > 34) break;
        if (ch === ' ') { t += 0.08; continue; }
        if (!/[a-zA-Z]/.test(ch)) { t += 0.13; continue; }
        const f = base * (1 + ((ch.toLowerCase().charCodeAt(0) % 7) - 3) * 0.07);
        const gn = tone({ type, f, f2: f * (1 + (rnd() - 0.5) * 0.1), t, a: 0.006, d: 0.05, peak: kind === 'Pak Darto' ? 0.1 : 0.15, dest: bus });
        void gn; t += 0.062; count++;
      }
    },
    stopSpeech() {
      if (speech && ctx) { try { speech.gain.setTargetAtTime(0, ctx.currentTime, 0.015); const s = speech; setTimeout(() => { try { s.disconnect(); } catch (_) { /* ignore */ } }, 120); } catch (_) { /* ignore */ } }
      speech = null;
    },

    // ---------- ambience, music, per-frame update ----------
    startAmbience() {
      if (!ok() || ambienceOn) return;
      ambienceOn = true;
      const loop = (buf, dest) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
      // wind
      const wind = loop(pinkBuf), wf = ctx.createBiquadFilter(), wg = g(0);
      wf.type = 'bandpass'; wf.frequency.value = 380; wf.Q.value = 0.6;
      const lfo = ctx.createOscillator(), lg = g(130); lfo.frequency.value = 0.07; lfo.connect(lg); lg.connect(wf.frequency); lfo.start();
      wind.connect(wf); wf.connect(wg); wg.connect(amb); eng.windGain = wg; eng.windFilter = wf;
      // electric hum (indoors)
      const hg = g(0); [50, 100].forEach((f, i) => { const o = ctx.createOscillator(); o.frequency.value = f; const v = g(i ? 0.5 : 1); o.connect(v); v.connect(hg); o.start(); });
      hg.connect(amb); eng.humGain = hg;
      // passing cars (low rumble)
      const car = loop(pinkBuf), cf = ctx.createBiquadFilter(), cg = g(0);
      cf.type = 'lowpass'; cf.frequency.value = 230; car.connect(cf); cf.connect(cg); cg.connect(amb); eng.carGain = cg;
      // tension layer: beating saws + shimmer
      const tg = g(0); [82.4, 87.3].forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 280; o.connect(lp); lp.connect(tg); o.start(); });
      tg.connect(mus); eng.tensGain = tg;
      const sg = g(0), tr = g(0.6); [3520, 3729].forEach(f => { const o = ctx.createOscillator(); o.frequency.value = f; const v = g(0.5); o.connect(v); v.connect(tr); o.start(); });
      const trem = ctx.createOscillator(), tdepth = g(0.35); trem.frequency.value = 6; trem.connect(tdepth); tdepth.connect(tr.gain); trem.start();
      tr.connect(sg); sg.connect(mus); eng.shimGain = sg;
    },
    /** s = { indoor, late, fear, mood, carDist } — call ~10 times a second. */
    update(s) {
      if (!ok() || !ambienceOn) return;
      const T = ctx.currentTime;
      outdoor = s.indoor ? 0 : 1; late = !!s.late;
      eng.windGain.gain.setTargetAtTime((s.indoor ? 0.05 : 0.2) * (s.late ? 1.5 : 1), T, 0.4);
      eng.humGain.gain.setTargetAtTime(s.indoor ? 0.012 : 0, T, 0.5);
      eng.carGain.gain.setTargetAtTime(s.indoor ? 0 : Math.pow(Math.max(0, 1 - (s.carDist ?? 99) / 26), 2) * 0.14, T, 0.3);
      const fear = clamp(s.fear || 0, 0, 1.5);
      eng.tensGain.gain.setTargetAtTime(Math.min(1, fear) * 0.07 + (s.late ? 0.02 : 0), T, 0.6);
      eng.shimGain.gain.setTargetAtTime(Math.min(1, fear) * 0.012, T, 0.6);
      m.intensity = Math.min(1, fear);
      if (s.mood && s.mood !== m.mood) { m.mood = s.mood; m.nextNote = Math.max(m.nextNote, T + 1.2); }
    },
    /** Schedules pads, melody and crickets up to `until`. Call every ~250 ms. */
    schedule(until, t0 = ctx ? ctx.currentTime : 0) {
      if (!ok()) return;
      const cfg = MOODS[m.mood] || MOODS.explore;
      if (m.nextChord < 0) { m.nextChord = t0 + 0.2; m.nextNote = t0 + 2.5; }
      while (m.nextChord < until) {
        const chord = cfg.chords[m.chord % cfg.chords.length]; m.chord++;
        const t = m.nextChord, len = cfg.len;
        for (const n of chord) for (const dc of [-7, 7]) {
          const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), gn = ctx.createGain();
          o.type = 'triangle'; o.frequency.value = midi(n); o.detune.value = dc + (cfg.dark ? (rnd() - 0.5) * 20 : 0);
          lp.type = 'lowpass'; lp.frequency.value = 800;
          const p = gn.gain; p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(0.026, t + len * 0.35); p.setValueAtTime(0.026, t + len * 0.8); p.exponentialRampToValueAtTime(0.0001, t + len + 3);
          o.connect(lp); lp.connect(gn); out(gn, mus, 0.3); o.start(t); o.stop(t + len + 3.1);
        }
        m.nextChord += len;
      }
      while (m.nextNote < until) {
        const t = m.nextNote, chordNotes = cfg.chords[(m.chord - 1 + cfg.chords.length) % cfg.chords.length];
        let note;
        if (cfg.arp) { note = chordNotes[m.arpIdx++ % chordNotes.length] + 12 + (m.arpIdx % 3 === 0 ? 12 : 0); }
        else { m.noteIdx = clamp(m.noteIdx + Math.floor(rnd() * 3) - 1, 0, cfg.scale.length - 1); note = cfg.scale[m.noteIdx]; }
        if (rnd() > 0.18) {
          const f = midi(note), dc = cfg.dark ? (rnd() - 0.5) * 50 : 0;
          [[1, 0.09], [2, 0.03], [3, 0.012]].forEach(([r, v]) => tone({ f: f * r, t, a: 0.004, d: 1.7 / r + 0.3, peak: v, dest: mus, send: 0.55, detune: dc }));
          if (m.mood === 'late' && rnd() < 0.25) tone({ f: midi(33), t, a: 0.01, d: 3, peak: 0.12, dest: mus, send: 0.7 });
        }
        const gap = cfg.gap[0] + rnd() * (cfg.gap[1] - cfg.gap[0]);
        m.nextNote += gap * (1 - m.intensity * 0.35);
      }
      // crickets only outdoors and only before midnight; their silence after midnight is the point
      if (outdoor > 0.5 && !late) {
        while (cricketAt < until) {
          const t = Math.max(cricketAt, t0), f = 4100 + rnd() * 600, pan = (rnd() - 0.5) * 1.2;
          for (let k = 0; k < 3; k++) tone({ f, t: t + k * 0.09, a: 0.004, d: 0.045, peak: 0.012 + rnd() * 0.01, dest: amb, pan });
          cricketAt = t + 0.6 + rnd() * 1.6;
        }
      } else cricketAt = until;
    },
    dispose() {
      api.stopSpeech();
      try { ctx?.close?.(); } catch (_) { /* ignore */ }
      ctx = null; built = false; ambienceOn = false;
    },
  };
  return api;
}
