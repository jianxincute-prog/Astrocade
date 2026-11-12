// Background theme and sound effects for the restoration atelier, played with Web Audio.
// The clips are Astrocade assets (asset_map.json) looked up with lib.getAsset; nothing plays until the
// player's first tap or key press (browser autoplay rules), and a missing asset or audio API is simply silent.
const MUSIC = 'music_atelier_theme';
const SFX = {
  pickup: 'sfx_pickup', // a fragment is collected
  place: 'sfx_place', // a part snaps onto its plinth
  complete: 'sfx_statue_complete', // a statue is whole again
  finale: 'sfx_all_complete', // all twelve statues restored
  tap: 'sfx_ui_tap', // studio and menu buttons
  notHere: 'sfx_not_here', // the plinth is out of reach
  step: 'sfx_footstep', // footsteps on stone
  chest: 'sfx_chest_open', // a hidden chest is opened
  curtain: 'sfx_curtain_open', // a curtained alcove is drawn open
  rotate: 'sfx_rotate_tick', // one notch of the turn-and-fit puzzle
  fit: 'sfx_fit_lock', // the part lines up with its socket
  medal: 'sfx_medal', // a statue earns its medal
};

export function createAudio({ enabled = true, musicVolume = 0.35, sfxVolume = 0.8, muted = false } = {}) {
  let ctx = null; let master = null; let musicGain = null; let sfxGain = null;
  let musicSource = null; let started = false; let isMuted = muted; let ducked = false;
  const buffers = new Map();
  const vol = { music: musicVolume, sfx: sfxVolume };

  function context() {
    if (ctx || !enabled) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
    master = ctx.createGain(); master.gain.value = isMuted ? 0 : 1; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = vol.sfx; sfxGain.connect(master);
    return ctx;
  }
  function load(id) {
    if (buffers.has(id)) return buffers.get(id);
    let asset = null;
    try { asset = window.lib?.getAsset?.(id); } catch { asset = null; }
    const job = asset?.url && ctx
      ? fetch(asset.url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
        .catch((error) => { try { window.lib?.log?.(`Audio ${id} unavailable: ${error.message || error}`); } catch { /* optional */ } return null; })
      : Promise.resolve(null);
    buffers.set(id, job);
    return job;
  }
  const musicLevel = () => (ducked ? vol.music * 0.45 : vol.music);
  async function startMusic() {
    const buffer = await load(MUSIC);
    if (!buffer || musicSource || !ctx) return;
    musicSource = ctx.createBufferSource(); musicSource.buffer = buffer; musicSource.loop = true;
    musicSource.connect(musicGain); musicSource.start();
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(0, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(musicLevel(), ctx.currentTime + 4); // gentle fade-in
  }
  // Call from any user gesture: creates/resumes the audio context and starts the theme the first time.
  function unlock() {
    if (!context()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (started) return;
    started = true;
    for (const id of Object.values(SFX)) load(id);
    startMusic();
  }
  function play(name, { volume = 1, rate = 1, duration = 0 } = {}) {
    if (!ctx || !started || isMuted) return;
    load(SFX[name]).then((buffer) => {
      if (!buffer || !ctx) return;
      const src = ctx.createBufferSource(); src.buffer = buffer; src.playbackRate.value = rate;
      const g = ctx.createGain(); g.gain.value = volume;
      src.connect(g); g.connect(sfxGain); src.start();
      if (duration > 0) { // clip long takes (e.g. the rotate tick) with a short fade so they stay snappy
        const end = ctx.currentTime + duration;
        g.gain.setValueAtTime(volume, end - 0.05); g.gain.linearRampToValueAtTime(0, end); src.stop(end + 0.02);
      }
    });
  }
  function setMuted(next) {
    isMuted = next;
    if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.12);
  }
  // Big moments (statue complete, finale) briefly lower the theme so the flourish is heard clearly.
  function duck(seconds = 3) {
    if (!ctx || !musicGain) return;
    ducked = true; musicGain.gain.setTargetAtTime(musicLevel(), ctx.currentTime, 0.15);
    setTimeout(() => { ducked = false; if (ctx) musicGain.gain.setTargetAtTime(musicLevel(), ctx.currentTime, 0.6); }, seconds * 1000);
  }
  function setVolumes({ music, sfx }) {
    if (typeof music === 'number') vol.music = music;
    if (typeof sfx === 'number') vol.sfx = sfx;
    if (ctx) { musicGain.gain.setTargetAtTime(musicLevel(), ctx.currentTime, 0.2); sfxGain.gain.setTargetAtTime(vol.sfx, ctx.currentTime, 0.1); }
  }
  // Pause everything while the game is hidden (app switched away, tab in the background).
  const onVisibility = () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => {}); else if (started) ctx.resume().catch(() => {}); };
  document.addEventListener('visibilitychange', onVisibility);
  function dispose() {
    document.removeEventListener('visibilitychange', onVisibility);
    try { musicSource?.stop(); } catch { /* already stopped */ }
    try { ctx?.close(); } catch { /* no-op */ }
    ctx = null;
  }
  return { unlock, play, duck, setMuted, setVolumes, dispose, get muted() { return isMuted; } };
}
