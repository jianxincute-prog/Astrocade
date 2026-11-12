// Web Audio SFX (decoded from asset map) + looping music element.
export class Audio {
  constructor(lib) {
    this.lib = lib;
    this.ctx = null; this.buffers = {}; this.music = null; this.musicOn = true;
  }

  url(id) {
    const a = this.lib && this.lib.getAsset ? this.lib.getAsset(id) : null;
    return a ? a.url : null;
  }

  /** Call from a user gesture. */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(this.ctx.destination);
      for (const id of ['sfx_punch', 'sfx_slam', 'sfx_whoosh']) {
        const u = this.url(id); if (!u) continue;
        fetch(u).then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b)).then((buf) => { this.buffers[id] = buf; }).catch(() => {});
      }
    } catch (e) { /* no audio */ }
  }

  play(id, vol = 1, rate = 1) {
    const buf = this.buffers[id];
    if (!this.ctx || !buf) return;
    const s = this.ctx.createBufferSource();
    s.buffer = buf; s.playbackRate.value = rate * (0.93 + Math.random() * 0.14);
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(this.master);
    s.start();
  }

  startMusic() {
    if (!this.musicOn) return;
    const u = this.url('music_street'); if (!u) return;
    if (!this.music) { this.music = new window.Audio(u); this.music.loop = true; this.music.volume = 0.35; }
    this.music.play().catch(() => {});
  }

  stopMusic() { if (this.music) this.music.pause(); }

  // ---- synthesized cutscene sounds (no assets needed) ----
  tone(freq, dur, vol = 0.15, type = 'sine', delay = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.setValueAtTime(vol, t0 + Math.max(0.01, dur - 0.03));
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  /** Classic double-trill phone ring (~0.9s). */
  ring() {
    for (let k = 0; k < 2; k++) for (let i = 0; i < 6; i++) {
      this.tone(i % 2 ? 1318 : 1046, 0.055, 0.1, 'square', k * 0.45 + i * 0.06);
    }
  }

  /** Tiny talking blip for the typewriter subtitles. */
  blip(pitch = 1) { this.tone(190 * pitch * (0.9 + Math.random() * 0.25), 0.045, 0.05, 'triangle'); }

  /** Low idling engine; call engineSet(0..1) every frame, engineStop() when done. */
  engineStart() {
    if (!this.ctx || this.eng) return;
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 48; f.type = 'lowpass'; f.frequency.value = 260; g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(this.master); o.start();
    this.eng = { o, g };
  }

  engineSet(k) {
    if (!this.eng || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.eng.o.frequency.setTargetAtTime(46 + k * 70, t, 0.1);
    this.eng.g.gain.setTargetAtTime(0.05 + k * 0.1, t, 0.1);
  }

  engineStop() {
    if (!this.eng) return;
    try { this.eng.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); this.eng.o.stop(this.ctx.currentTime + 0.5); } catch (e) { /* */ }
    this.eng = null;
  }

  dispose() {
    this.stopMusic();
    this.engineStop();
    if (this.ctx) { try { this.ctx.close(); } catch (e) { /* */ } this.ctx = null; }
  }
}
