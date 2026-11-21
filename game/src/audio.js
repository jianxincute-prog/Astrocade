// Procedural Web Audio SFX (no asset files). The AudioContext is created on the first user gesture.
export function createAudio() {
  let ctx = null, master = null, muted = false, sizzle = null;

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination); }
    catch (e) { ctx = null; }
  }

  function tone(freq, dur, { type = 'sine', vol = 0.25, to = null, delay = 0 } = {}) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function startSizzle() {
    if (!ctx || sizzle) return;
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.3);
    src.connect(f); f.connect(g); g.connect(master); src.start();
    sizzle = { src, g };
  }
  function stopSizzle() {
    if (!ctx || !sizzle) return;
    const { src, g } = sizzle; sizzle = null;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    src.stop(ctx.currentTime + 0.3);
  }

  function play(name, arg = 0) {
    if (!ctx) return;
    switch (name) {
      case 'SLOT_POP': tone([440, 554, 659][arg % 3], 0.14, { vol: 0.28 }); break;
      case 'SLOT_UNDO': tone(440, 0.16, { to: 330, vol: 0.22 }); break;
      case 'SLOTS_LOCKED': tone(220, 0.12, { type: 'triangle' }); tone(330, 0.16, { type: 'triangle', delay: 0.08 }); break;
      case 'TAP': tone(700 + arg * 40, 0.07, { type: 'triangle', vol: 0.18 }); break;
      case 'PAN_SIZZLE': startSizzle(); break;
      case 'STOP_SIZZLE': stopSizzle(); break;
      case 'DISH_READY': tone(880, 0.3, { vol: 0.25 }); tone(1320, 0.3, { vol: 0.15, delay: 0.06 }); break;
      case 'SERVE_NORMAL': tone(660, 0.14, { vol: 0.22 }); tone(784, 0.22, { vol: 0.22, delay: 0.12 }); break;
      case 'ORDER_PERFECT': [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, 0.7, { vol: 0.2, delay: i * 0.02 })); break;
      case 'BONUS': [784, 988, 1175].forEach((f, i) => tone(f, 0.18, { vol: 0.2, delay: i * 0.07 })); break;
      case 'UNLOCK': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, { vol: 0.2, delay: i * 0.09 })); break;
      default: break;
    }
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.5;
    if (m) stopSizzle();
  }
  return { unlock, play, setMuted, get muted() { return muted; } };
}

// Phone vibration through lib.haptics only. Never throws.
export function haptic(effect) {
  try { if (window.lib && window.lib.haptics) window.lib.haptics.play(effect); } catch (e) { /* ignore */ }
}
