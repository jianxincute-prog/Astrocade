import {
  FOOD_ENERGY, STAGE_STEPS, abilitiesForStage, addNourishment, burstEnemies, canBeginCocoon, clampPosition, cocoonDrain, comboAlive,
  comboMultiplier, enemySpeedFactor, finalScore, growthStage, movePlayer, predatorMinStage, registerPollen, starRating, takeHit, COMBO_WINDOW, FLIGHT_BONUS_CAP,
  BOSS, bossCanBeHit, bossShouldAppear, bossTimings, capEnergyForBoss, lashHits, pushOutOfCircles, slideAroundCircles,
} from './logic.mjs';

// Metamorphosis: a 5-minute garden story in four acts.
//   1. LARVA   - three chapters (Tiny -> Lumberer -> Plump). Predators wake chapter by chapter, birds strike from above,
//                poison puddles appear, night falls. Each molt makes you tougher.
//   2. COCOON  - spin silk, then defend the chrysalis for ~22 seconds with Fuzz Burst.
//   3. EMERGE  - the cocoon cracks and the wings unfold.
//   4. FLIGHT  - 90 seconds of sunset pollen-chaining with hunting birds, then a score card (best score is saved).
let activeCleanup = null;
let THREE = window.THREE;
let queuedMode = 'play';
let booting = false;
const DEFAULTS = { foodCount: 76, predatorCount: 12, caterpillarScale: 1, difficulty: 'Meadow', flightSeconds: 90 };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const CHAPTERS = ['TINY TENDRIL', 'LEAF LUMBERER', 'PLUMP & PRICKLY'];
const THREE_URLS = [
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
  'https://unpkg.com/three@0.160.0/build/three.min.js',
];

/* ------------------------------------------------------------------ audio (module level: survives soft restarts) */
const AUDIO_IDS = ['bgm_garden', 'bgm_tense', 'bgm_butterfly', 'sting_win', 'sfx_eat', 'sfx_nectar', 'sfx_golden', 'sfx_hit', 'sfx_burst', 'sfx_molt',
  'sfx_cocoon', 'sfx_emerge', 'sfx_pollen', 'sfx_warning', 'sfx_bird', 'sfx_click', 'sfx_toad', 'sfx_slam', 'sfx_tongue'];
const audio = { ctx: null, master: null, muted: false, raw: {}, bufs: {}, decoding: {}, total: 0, done: 0, started: false, music: null, musicId: null, wanted: null, listeners: [] };
function preloadAudio() {
  if (audio.started) return; audio.started = true;
  const lib = window.lib;
  for (const id of AUDIO_IDS) {
    try {
      const info = lib && lib.getAsset ? lib.getAsset(id) : null; if (!info || !info.url) continue;
      audio.total++;
      fetch(info.url).then((r) => { if (!r.ok) throw new Error('http'); return r.arrayBuffer(); })
        .then((ab) => { audio.raw[id] = ab; audio.done++; decodeOne(id); })
        .catch(() => { audio.done++; });
    } catch (e) { /* no asset: synth fallback */ }
  }
}
function decodeOne(id) {
  if (!audio.ctx || !audio.raw[id] || audio.bufs[id] || audio.decoding[id]) return; audio.decoding[id] = true;
  try { audio.ctx.decodeAudioData(audio.raw[id].slice(0), (b) => { audio.bufs[id] = b; if (audio.wanted === id && !audio.music) playMusic(id); }, () => {}); } catch (e) { /* ignore */ }
}
function ensureAudio() {
  try {
    if (!audio.ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      audio.ctx = new C(); audio.master = audio.ctx.createGain(); audio.master.gain.value = audio.muted ? 0 : 0.7; audio.master.connect(audio.ctx.destination);
      Object.keys(audio.raw).forEach(decodeOne);
    }
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
  } catch (e) { /* audio is optional */ }
}
function setMuted(m) { audio.muted = m; if (audio.master) audio.master.gain.value = m ? 0 : 0.7; }
function synthTone(f0, f1, dur, type = 'sine', vol = 0.18, delay = 0) {
  if (!audio.ctx || audio.muted) return;
  try {
    const t = audio.ctx.currentTime + delay, o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audio.master); o.start(t); o.stop(t + dur + 0.03);
  } catch (e) { /* ignore */ }
}
const SYNTH = {
  sfx_eat: () => synthTone(520, 780, 0.1, 'triangle'), sfx_nectar: () => { synthTone(700, 1100, 0.14, 'sine'); synthTone(1100, 1500, 0.12, 'sine', 0.12, 0.08); },
  sfx_golden: () => [660, 880, 1320, 1760].forEach((f, i) => synthTone(f, f * 1.02, 0.16, 'sine', 0.14, i * 0.07)),
  sfx_hit: () => synthTone(260, 90, 0.22, 'sawtooth', 0.2), sfx_burst: () => synthTone(180, 700, 0.3, 'triangle', 0.2),
  sfx_molt: () => [392, 523, 659, 784].forEach((f, i) => synthTone(f, f, 0.3, 'triangle', 0.16, i * 0.12)),
  sfx_cocoon: () => synthTone(120, 220, 1.2, 'sine', 0.14), sfx_emerge: () => [523, 659, 784, 1047, 1319].forEach((f, i) => synthTone(f, f, 0.3, 'triangle', 0.15, i * 0.1)),
  sfx_pollen: () => synthTone(1200, 1500, 0.1, 'sine', 0.13), sfx_warning: () => { synthTone(900, 900, 0.1, 'square', 0.1); synthTone(900, 900, 0.1, 'square', 0.1, 0.16); },
  sfx_bird: () => synthTone(1400, 300, 0.4, 'sawtooth', 0.12), sfx_click: () => synthTone(500, 400, 0.06, 'square', 0.1),
  sfx_toad: () => { synthTone(150, 95, 0.35, 'sawtooth', 0.16); synthTone(180, 110, 0.2, 'square', 0.08, 0.18); }, sfx_slam: () => synthTone(120, 34, 0.5, 'sine', 0.32), sfx_tongue: () => synthTone(950, 180, 0.18, 'square', 0.1),
  sting_win: () => [523, 659, 784, 1047].forEach((f, i) => synthTone(f, f, 0.4, 'triangle', 0.18, i * 0.12)),
};
function playSfx(id, vol = 1, rate = 1) {
  if (!audio.ctx || audio.muted) return;
  const b = audio.bufs[id];
  if (!b) { if (SYNTH[id]) SYNTH[id](); return; }
  try {
    const s = audio.ctx.createBufferSource(), g = audio.ctx.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol;
    s.connect(g); g.connect(audio.master); s.start();
  } catch (e) { /* ignore */ }
}
function playMusic(id, vol = 0.34) {
  audio.wanted = id;
  if (!audio.ctx || audio.musicId === id) return;
  const b = audio.bufs[id]; if (!b) return;       // started again once the file finishes decoding
  stopMusic(0.9);
  try {
    const s = audio.ctx.createBufferSource(), g = audio.ctx.createGain(); s.buffer = b; s.loop = true;
    g.gain.value = 0.0001; s.connect(g); g.connect(audio.master); s.start();
    g.gain.setTargetAtTime(vol, audio.ctx.currentTime, 0.6);
    audio.music = { s, g }; audio.musicId = id;
  } catch (e) { /* ignore */ }
}
function stopMusic(fade = 0.6) {
  const m = audio.music; audio.music = null; audio.musicId = null; if (!m || !audio.ctx) return;
  try { m.g.gain.setTargetAtTime(0.0001, audio.ctx.currentTime, fade / 3); setTimeout(() => { try { m.s.stop(); } catch (e) { /* done */ } }, fade * 1000 + 200); } catch (e) { /* ignore */ }
}

/* ------------------------------------------------------------------ loading screen + three.js loader (with fallback URL) */
function loadingEl() {
  let el = document.getElementById('meta-loading');
  if (!el) {
    el = document.createElement('div'); el.id = 'meta-loading';
    el.innerHTML = '<div class="ml-card"><div class="ml-icon">🐛</div><div class="ml-title">Metamor<span>phosis</span></div><div class="ml-bar"><div class="ml-fill" id="ml-fill"></div></div><div class="ml-pct" id="ml-pct">LOADING 0%</div><div class="ml-tip" id="ml-tip">Waking up the garden…</div></div>';
    const st = document.createElement('style');
    st.id = 'meta-loading-style';
    st.textContent = '#meta-loading{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:linear-gradient(180deg,#b9dda5,#6fae63);font-family:Inter,ui-rounded,system-ui,sans-serif;color:#173a2c}.ml-card{width:560px;max-width:90%;text-align:center;padding:44px 36px;border-radius:36px;background:rgba(248,255,238,.92);box-shadow:0 24px 70px #173e3255}.ml-icon{font-size:84px;animation:mlbob 1s ease-in-out infinite}@keyframes mlbob{50%{transform:translateY(-14px)}}.ml-title{font-size:54px;font-weight:1000;letter-spacing:-2px;color:#1d4e38;margin-top:6px}.ml-title span{color:#83b94c}.ml-bar{height:30px;margin:26px 8px 0;border-radius:18px;background:#dcebd4;overflow:hidden;box-shadow:inset 0 2px 6px #0002}.ml-fill{height:100%;width:0;background:linear-gradient(90deg,#85d957,#ffce57,#f39a49);border-radius:18px;transition:width .2s}.ml-pct{margin-top:14px;font-size:26px;font-weight:900;color:#3b7a4d;letter-spacing:1px}.ml-tip{margin-top:10px;font-size:22px;font-weight:700;color:#6b8a70}.ml-btn{margin-top:20px;padding:16px 30px;border:0;border-radius:18px;background:#367f4f;color:#fff;font-size:24px;font-weight:900}';
    document.head.appendChild(st); document.body.appendChild(el);
  }
  return el;
}
function setLoading(p, tip) {
  const f = document.getElementById('ml-fill'), t = document.getElementById('ml-pct'), l = document.getElementById('ml-tip');
  if (f) f.style.width = `${Math.round(clamp(p, 0, 1) * 100)}%`; if (t) t.textContent = `LOADING ${Math.round(clamp(p, 0, 1) * 100)}%`; if (l && tip) l.textContent = tip;
}
function removeLoading() { document.getElementById('meta-loading')?.remove(); document.getElementById('meta-loading-style')?.remove(); }
function loadThree() {
  return new Promise((resolve, reject) => {
    if (window.THREE) return resolve(window.THREE);
    let i = 0;
    const tryNext = () => {
      if (i >= THREE_URLS.length) return reject(new Error('three.js failed to load'));
      const s = document.createElement('script'); s.src = THREE_URLS[i++];
      s.onload = () => (window.THREE ? resolve(window.THREE) : tryNext());
      s.onerror = () => { s.remove(); tryNext(); };
      document.head.appendChild(s);
    };
    tryNext();
  });
}
const LOAD_TIPS = ['Fluffing up the caterpillar…', 'Planting wildflowers…', 'Teaching beetles to patrol…', 'Warming up the sunset…', 'Tuning the butterfly wings…'];
function run(mode) {
  queuedMode = mode;
  if (booting) return;
  booting = true;
  const el = loadingEl(); el.style.display = 'grid';
  if (mode !== 'edit') preloadAudio();
  const t0 = performance.now(); let three = !!window.THREE, failed = false, tipIdx = 0;
  loadThree().then(() => { three = true; THREE = window.THREE; }).catch(() => {
    failed = true;
    el.querySelector('.ml-card').insertAdjacentHTML('beforeend', '<button class="ml-btn" id="ml-retry">Try again</button>');
    document.getElementById('ml-tip').textContent = 'Could not load the 3D garden library. Check your connection.';
    document.getElementById('ml-retry').onclick = () => { booting = false; el.remove(); document.getElementById('meta-loading-style')?.remove(); run(queuedMode); };
  });
  const tick = () => {
    if (failed) return;
    const elapsed = (performance.now() - t0) / 1000;
    const audioFrac = mode === 'edit' || !audio.total ? 1 : audio.done / audio.total;
    const target = (three ? 0.5 : 0.15 + 0.2 * Math.min(1, elapsed / 4)) + 0.5 * audioFrac;
    setLoading(Math.min(target, elapsed / 1.2), LOAD_TIPS[Math.floor(elapsed / 1.1) % LOAD_TIPS.length]);
    if (three && (audioFrac >= 1 || elapsed > 8) && elapsed >= 1.2) { removeLoading(); booting = false; boot(queuedMode); return; }
    setTimeout(tick, 80);
  };
  tick();
}

/* ------------------------------------------------------------------ the game */
function boot(mode) {
  if (activeCleanup) activeCleanup();
  const editMode = mode === 'edit';
  const lib = window.lib || { log: console.log, showGameParameters() {}, haptics: { play() {} } };
  const cfg = window.gameConfig || {};
  const savedSettings = { ...DEFAULTS, ...(cfg.settings || {}) };
  if (editMode) {
    window.gameConfig = window.gameConfig || {};
    window.gameConfig.settings = { ...savedSettings };
    window.gameConfig.editorPositions = { ...(window.gameConfig.editorPositions || {}) };
  }
  if (lib.showGameParameters) {
    lib.showGameParameters({
      name: 'Metamorphosis Garden',
      params: {
        'Food patches': { key: 'settings.foodCount', type: 'slider', min: 48, max: 120, step: 4 },
        'Predators': { key: 'settings.predatorCount', type: 'slider', min: 4, max: 18, step: 1 },
        'Fuzz size': { key: 'settings.caterpillarScale', type: 'slider', min: 0.8, max: 1.25, step: 0.05 },
        'Flight seconds': { key: 'settings.flightSeconds', type: 'slider', min: 60, max: 120, step: 10 },
        'Garden mood': { key: 'settings.difficulty', type: 'dropdown', options: [{ label: 'Gentle Meadow', value: 'Meadow' }, { label: 'Wild Garden', value: 'Wild' }] },
      },
    });
  }
  const wild = savedSettings.difficulty === 'Wild';
  const flightSeconds = clamp(Number(savedSettings.flightSeconds) || 90, 45, 150);
  lib.log?.(`Metamorphosis booted in ${editMode ? 'edit' : 'play'} mode.`);

  /* ---------- DOM */
  const root = document.createElement('div');
  root.id = 'metamorphosis-root'; root.dataset.phase = editMode ? 'edit' : 'start';
  root.innerHTML = `
    <div class="game-canvas"></div><div class="shade-top"></div><div class="vignette" id="vignette"></div><div class="flash" id="flash"></div>
    <section class="hud">
      <div class="card objective" id="objective"><div class="chapter" id="chapter-label">CHAPTER 1 · TINY TENDRIL</div><div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div><div class="obj-row"><span id="energy-label">0 / 100</span><span id="food-count">0 NIBBLES</span></div></div>
      <div class="card flightbar" id="flightbar"><div class="fb-top"><div class="score-big" id="score-big">0</div><div class="timer" id="timer-label">90</div></div><div class="fb-row"><span id="combo-label">COMBO ×1</span><span class="fb-sub">chain pollen!</span></div><div class="combo-track"><div class="combo-fill" id="combo-fill"></div></div></div>
      <div class="card cocoonbar" id="cocoonbar"><div class="cb-head"><span>COCOON</span><span id="cocoon-time">22s</span></div><div class="progress-track big"><div class="cocoon-fill" id="cocoon-fill"></div></div><div class="cb-sub" id="cocoon-sub">Puff the bugs away!</div></div>
      <div class="card minimap"><canvas id="minimap" width="180" height="180"></canvas><div class="map-coord" id="map-coord">0 · 0</div></div>
      <button class="sound-btn" id="sound-btn" aria-label="Sound">🔊</button>
      <div class="card health" id="health"><span class="hearts" id="hearts">♥ ♥ ♥</span></div>
      <div class="card bossbar" id="bossbar"><div class="bb-head"><span>🐸 GIANT TOAD</span><span id="boss-hits">3 ♥</span></div><div class="boss-track"><div class="boss-fill" id="boss-fill"></div></div><div class="bb-sub" id="boss-sub">Dodge, then PUFF it while it is dizzy!</div></div>
      <div class="danger-alert" id="danger-alert">⚠ DANGER NEARBY</div>
      <div class="status-toast" id="status-toast"></div>
      <div class="chapter-banner" id="chapter-banner"><div class="cb-title" id="cb-title"></div><div class="cb-text" id="cb-text"></div></div>
      <div class="control-hint" id="control-hint">WASD / arrows to wiggle · SPACE to puff</div>
      <div class="stick" id="stick"><div class="stick-rim"></div><div class="stick-center"><div class="stick-knob" id="stick-knob"></div></div><div class="stick-caption">MOVE</div></div>
      <button class="burst-button" id="burst-button" aria-label="Fuzz burst"><span class="burst-icon">✺</span><span class="burst-name">PUFF</span><span class="burst-cooldown" id="burst-cooldown">READY!</span></button>
    </section>
    <div class="float-layer" id="float-layer"></div>
    <div class="start-overlay" id="start-overlay"><div class="intro-card"><div class="intro-kicker">A TINY LIFE, A VERY BIG GARDEN</div><div class="intro-title">Metamor<span>phosis</span></div><div class="intro-creature">🐛</div><div class="intro-copy" id="intro-copy">Grow through three chapters, spin your cocoon, then burst out as a butterfly. Birds, spiders and beetles think you look like lunch.</div><div class="intro-chips"><span>🌱 EAT &amp; GROW</span><span>✨ PUFF TO DEFEND</span><span>🦋 FLY FOR POLLEN</span></div><button id="start-button" class="main-button">Wiggle into the garden <span>➜</span></button><div class="intro-footer" id="intro-footer">Best score: 0</div></div></div>
    <div class="editor-panel card" id="editor-panel"><div class="editor-kicker">GARDEN EDITOR</div><div class="editor-heading">Shape your little world</div><div class="editor-copy" id="editor-copy">Tap an object, then drag it wherever you like. Every move is saved to your game config.</div><div class="editor-selected" id="editor-selected">Selected: none</div><button class="rebuild-button" id="rebuild-button">↻ Rebuild garden from settings</button></div>
    <div class="editor-badge" id="editor-badge">EDITOR · DRAG OBJECTS</div>
    <div class="finish-overlay" id="finish-overlay"><div class="finish-card"><div class="finish-sparkle">🦋</div><div class="finish-title">WINGS, AT LAST!</div><div class="stars" id="stars">☆☆☆</div><div class="res-score" id="res-score">0</div><div class="res-grid" id="res-grid"></div><div class="res-best" id="res-best"></div><div class="res-board" id="res-board"></div><button class="main-button" id="again-button">Fly again <span>➜</span></button></div></div>
    <div class="gameover-overlay" id="gameover-overlay"><div class="finish-card"><div class="finish-sparkle">🌼</div><div class="finish-title" id="go-title">BACK TO THE BURROW</div><div class="finish-text" id="go-text">The garden got a little too wild. Your next run starts with a fresh wiggle.</div><button class="main-button" id="retry-button">Try again <span>➜</span></button></div></div>`;
  document.body.appendChild(root);

  const style = document.createElement('style');
  style.textContent = `
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#9fc787;font-family:Inter,ui-rounded,system-ui,-apple-system,"Segoe UI",sans-serif;touch-action:none}
    #metamorphosis-root{position:fixed;inset:0;width:100%;height:100%;overflow:hidden;background:#a8d19a;color:#173a2c;isolation:isolate}.game-canvas{position:absolute;inset:0}.game-canvas canvas{display:block;width:100%;height:100%;touch-action:none}
    .shade-top{position:absolute;inset:0 0 auto;height:420px;background:linear-gradient(180deg,rgba(19,52,41,.5),rgba(24,60,40,.12) 72%,transparent);pointer-events:none}
    .vignette{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .4s;background:radial-gradient(ellipse at center,transparent 45%,rgba(190,40,40,.62))}.flash{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(circle,#fffbe0,#ffe9a0 60%,#ffd27a);transition:opacity .5s}
    .hud{position:absolute;inset:0;pointer-events:none}.card{background:rgba(248,255,238,.9);border:2px solid rgba(255,255,255,.8);box-shadow:0 10px 30px rgba(23,55,38,.2);backdrop-filter:blur(10px);border-radius:26px}
    .objective{position:absolute;top:20px;left:20px;width:450px;padding:14px 20px 12px}.chapter{font-size:22px;font-weight:900;letter-spacing:.5px;color:#2d6a43}.progress-track{height:24px;margin-top:9px;background:#dcebd4;border-radius:14px;overflow:hidden;position:relative}.progress-track.big{height:30px}.progress-fill{width:0;height:100%;background:linear-gradient(90deg,#85d957,#ffce57,#f39a49);border-radius:14px;transition:width .25s}.obj-row{display:flex;justify-content:space-between;margin-top:8px;font-size:22px;font-weight:900;color:#3b7a4d}
    .flightbar,.cocoonbar{position:absolute;top:20px;left:20px;width:450px;padding:12px 20px 12px;display:none}.fb-top{display:flex;justify-content:space-between;align-items:baseline}.score-big{font-size:58px;font-weight:1000;color:#b0541a;line-height:1;text-shadow:0 2px 0 #fff}.timer{font-size:46px;font-weight:1000;color:#2d6a43}.fb-row{display:flex;justify-content:space-between;margin-top:6px;font-size:26px;font-weight:900;color:#d6641c}.fb-sub{font-size:20px;color:#7a8f7a;font-weight:800}.combo-track{height:16px;margin-top:8px;background:#ead9b6;border-radius:10px;overflow:hidden}.combo-fill{width:0;height:100%;background:linear-gradient(90deg,#ffd45c,#ff7d3d);border-radius:10px}.cb-head{display:flex;justify-content:space-between;font-size:28px;font-weight:1000;color:#8a5a14}.cocoon-fill{width:100%;height:100%;background:linear-gradient(90deg,#f6c453,#ffe58a);border-radius:14px;transition:width .2s}.cb-sub{margin-top:8px;font-size:22px;font-weight:800;color:#7b6a3a}
    .minimap{position:absolute;right:20px;top:20px;width:210px;padding:11px 11px 8px;border-radius:26px}.minimap canvas{display:block;width:100%;height:188px;border-radius:15px;background:#a8cf8d}.map-coord{text-align:center;font-size:18px;font-weight:800;color:#6c876f;margin-top:5px}
    .sound-btn{position:absolute;right:20px;top:282px;width:96px;height:96px;border:2px solid #fff;border-radius:50%;background:rgba(248,255,238,.9);font-size:44px;pointer-events:auto;touch-action:manipulation;box-shadow:0 8px 20px #1b4a3033}
    .health{position:absolute;top:150px;left:20px;padding:8px 22px;border-radius:24px}.hearts{color:#ea5f4a;font-size:40px;letter-spacing:4px;font-weight:900}
    .danger-alert{position:absolute;top:152px;left:215px;border-radius:18px;background:#bc4332;color:#fff;font-weight:1000;font-size:24px;letter-spacing:.5px;padding:14px 20px;opacity:0;transform:translateY(-6px);transition:.2s;white-space:nowrap}.danger-alert.show{opacity:1;transform:translateY(0)}
    .status-toast{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(.92);max-width:92%;padding:16px 28px;border-radius:22px;background:#fff7ce;color:#547137;font-size:30px;font-weight:1000;box-shadow:0 12px 35px #1e4a3633;opacity:0;transition:.2s;text-align:center}.status-toast.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
    .chapter-banner{position:absolute;left:50%;top:21%;transform:translate(-50%,-30%);width:92%;text-align:center;opacity:0;transition:.4s;text-shadow:0 3px 14px #173a2c}.chapter-banner.show{opacity:1;transform:translate(-50%,0)}.cb-title{font-size:62px;font-weight:1000;color:#fff;letter-spacing:3px}.cb-text{margin-top:6px;font-size:30px;font-weight:900;color:#fff7b0}
    .control-hint{position:absolute;left:50%;bottom:290px;transform:translateX(-50%);padding:10px 20px;border-radius:24px;background:#153c3099;color:#fff;font-size:22px;font-weight:800;white-space:nowrap;transition:opacity .6s}
    .stick{position:absolute;left:30px;bottom:40px;width:200px;height:200px;pointer-events:auto;touch-action:none;display:grid;place-items:center}.stick-rim{position:absolute;inset:0;border-radius:50%;background:rgba(17,58,41,.25);border:3px solid rgba(255,255,255,.55);box-shadow:inset 0 3px 15px #133e2d3d,0 12px 27px #163f2d31;backdrop-filter:blur(4px)}.stick-center{position:absolute;inset:28px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(24,70,48,.16);display:grid;place-items:center}.stick-knob{width:78px;height:78px;border-radius:50%;background:linear-gradient(145deg,#f4ffda,#b9e993);border:3px solid #fff;box-shadow:0 7px 17px #153c2d55;transform:translate(0,0);transition:transform .04s}.stick-caption{position:absolute;bottom:12px;color:#f4ffe9;font-weight:950;font-size:18px;letter-spacing:2px;text-shadow:0 2px 5px #194832}
    .burst-button{position:absolute;right:30px;bottom:44px;width:176px;height:176px;border:4px solid rgba(255,255,255,.85);border-radius:50%;background:radial-gradient(circle at 35% 25%,#fff5aa,#ffce64 52%,#ef9b46);box-shadow:0 10px 24px #86492555,inset 0 -6px 11px #b35e2930;color:#754520;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;touch-action:manipulation;font:inherit}.burst-button:active{transform:scale(.95)}.burst-button.cooling{filter:saturate(.5);opacity:.82}.burst-icon{font-size:46px;line-height:44px;color:#e77b39;text-shadow:0 1px white}.burst-name{font-size:26px;line-height:26px;font-weight:1000;letter-spacing:1.5px}.burst-cooldown{margin-top:5px;font-size:20px;font-weight:950;letter-spacing:1px;color:#9a6235}
    .float-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden}.ftxt{position:absolute;font-size:38px;font-weight:1000;color:#fff;text-shadow:0 3px 0 #b0541a,0 0 12px #ffcf5a;transform:translate(-50%,-50%);opacity:0;white-space:nowrap}.ftxt.go{animation:ftxt .95s ease-out forwards}.ftxt.bad{color:#ffd0c8;text-shadow:0 3px 0 #8a2a1e}@keyframes ftxt{0%{opacity:0;transform:translate(-50%,-30%) scale(.6)}15%{opacity:1;transform:translate(-50%,-60%) scale(1.15)}100%{opacity:0;transform:translate(-50%,-190%) scale(1)}}
    .start-overlay,.finish-overlay,.gameover-overlay{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(180deg,#173a2c36,#173a2c80);pointer-events:auto;backdrop-filter:blur(3px);opacity:0;visibility:hidden;transition:.28s}.start-overlay.show,.finish-overlay.show,.gameover-overlay.show{opacity:1;visibility:visible}
    .intro-card,.finish-card{position:relative;width:600px;max-width:94%;padding:40px 42px 32px;border-radius:36px;text-align:center;background:linear-gradient(160deg,#f8ffe9,#e9f8d8);box-shadow:0 28px 75px #173e3266;border:3px solid #ffffffb8;overflow:hidden}.intro-card:before,.finish-card:before{content:"";position:absolute;width:240px;height:240px;right:-80px;top:-130px;border-radius:50%;background:#d6f2bb}
    .intro-kicker{position:relative;color:#5f9250;font-size:20px;font-weight:950;letter-spacing:2px}.intro-title{position:relative;margin-top:8px;color:#1d4e38;font-size:62px;font-weight:1000;letter-spacing:-2px}.intro-title span{color:#83b94c}.intro-creature{position:relative;display:grid;place-items:center;margin:12px auto 10px;width:120px;height:120px;border-radius:40px;background:#e0f5c7;font-size:68px;box-shadow:inset 0 0 0 2px white}.intro-copy{position:relative;font-size:24px;line-height:1.4;color:#4f6c55;font-weight:700;max-width:500px;margin:0 auto}.intro-chips{position:relative;display:flex;justify-content:center;gap:10px;margin:18px 0 22px;flex-wrap:wrap}.intro-chips span{padding:10px 14px;border-radius:16px;background:#edf6e3;color:#4a7646;font-size:19px;font-weight:950}
    .main-button{position:relative;width:100%;height:84px;border:0;border-radius:24px;background:linear-gradient(90deg,#367f4f,#69aa57);box-shadow:0 9px 20px #397b4a44;color:#fff;font-size:30px;font-weight:950;pointer-events:auto;touch-action:manipulation}.main-button span{float:right;margin-right:22px;font-size:30px}.main-button:active{transform:translateY(2px)}.intro-footer{position:relative;margin-top:16px;color:#6f8a68;font-size:22px;font-weight:900}
    .finish-card{width:600px;padding:34px 36px 30px}.finish-sparkle{position:relative;font-size:60px}.finish-title{position:relative;font-size:46px;font-weight:1000;letter-spacing:1px;color:#23553b;margin-top:2px}.finish-text{position:relative;color:#5d7a5e;font-size:26px;line-height:1.4;font-weight:700;margin:14px 0 24px}.stars{position:relative;font-size:64px;color:#f2a93b;letter-spacing:8px;margin-top:4px;text-shadow:0 3px 0 #fff}.res-score{position:relative;font-size:84px;font-weight:1000;color:#b0541a;line-height:1;margin-top:2px}.res-grid{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin:16px 0 8px;font-size:24px;font-weight:800;color:#4f6c55;text-align:left}.res-grid b{float:right;color:#1d4e38}.res-best{position:relative;font-size:26px;font-weight:950;color:#8a5a14;margin:8px 0 18px}
    .editor-panel{position:absolute;left:25px;bottom:26px;width:420px;padding:17px 18px;pointer-events:auto}.editor-kicker{font-size:14px;font-weight:950;letter-spacing:2px;color:#77a852}.editor-heading{font-size:24px;font-weight:950;color:#224b36;margin-top:2px}.editor-copy{font-size:18px;line-height:1.4;font-weight:600;color:#68806a;margin-top:5px}.editor-selected{font-size:18px;color:#477649;font-weight:900;margin-top:7px}.rebuild-button{margin-top:11px;width:100%;height:52px;border:0;border-radius:14px;background:#4d9258;color:#fff;font-weight:900;font-size:20px;pointer-events:auto}.editor-badge{position:absolute;left:26px;top:26px;padding:12px 16px;background:#24543ddd;color:white;border-radius:14px;font-size:18px;font-weight:950;letter-spacing:1px}
    .bossbar{position:absolute;top:228px;left:20px;width:450px;padding:10px 18px 12px;display:none}.bossbar.show{display:block}.bb-head{display:flex;justify-content:space-between;font-size:24px;font-weight:1000;color:#2c6b2a}.boss-track{height:24px;margin-top:6px;background:#d3e6c7;border-radius:14px;overflow:hidden}.boss-fill{width:100%;height:100%;background:linear-gradient(90deg,#4caf50,#a8e063);border-radius:14px;transition:width .35s}.bb-sub{margin-top:5px;font-size:20px;font-weight:800;color:#6b8a5a}.res-board{position:relative;margin:0 0 14px;font-size:22px;font-weight:800;color:#4f6c55;text-align:left}.res-board div{display:flex;justify-content:space-between;padding:2px 8px}.res-board b{color:#1d4e38}.res-board .bh{justify-content:center;font-size:20px;letter-spacing:1px;color:#8a5a14}.res-board .yr{margin-top:4px;border-top:2px solid #cfe0bd;padding-top:5px;color:#b0541a}.editor-panel,.editor-badge{display:none}body.edit-mode .editor-panel,body.edit-mode .editor-badge{display:block}body.edit-mode .stick,body.edit-mode .burst-button,body.edit-mode .control-hint,body.edit-mode .objective,body.edit-mode .health,body.edit-mode .danger-alert,body.edit-mode .status-toast,body.edit-mode .start-overlay,body.edit-mode .finish-overlay,body.edit-mode .gameover-overlay,body.edit-mode .sound-btn{display:none}body.edit-mode .minimap{top:98px}body.edit-mode .editor-badge{top:26px}
    [data-phase=molt] .health,[data-phase=spin] .health,[data-phase=cocoon] .health,[data-phase=emerge] .health,[data-phase=fly] .health{display:none}[data-phase=spin] .objective,[data-phase=cocoon] .objective,[data-phase=emerge] .objective,[data-phase=fly] .objective{display:none}[data-phase=cocoon] .cocoonbar,[data-phase=spin] .cocoonbar{display:block}[data-phase=fly] .flightbar{display:block}[data-phase=spin] .control-hint,[data-phase=emerge] .control-hint,[data-phase=cocoon] .control-hint,[data-phase=fly] .control-hint,[data-phase=result] .control-hint,[data-phase=start] .stick,[data-phase=start] .burst-button,[data-phase=start] .health,[data-phase=start] .objective,[data-phase=start] .control-hint{display:none}[data-phase=spin] .stick,[data-phase=cocoon] .stick,[data-phase=emerge] .stick{opacity:.3}[data-phase=emerge] .burst-button,[data-phase=spin] .burst-button,[data-phase=molt] .burst-button{opacity:.3}`;
  document.head.appendChild(style);
  document.body.classList.toggle('edit-mode', editMode);

  /* ---------- renderer / scene */
  const canvasSlot = root.querySelector('.game-canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    root.querySelector('.start-overlay').classList.add('show');
    root.querySelector('#intro-copy').textContent = 'This garden needs a device with WebGL turned on. Try reopening the game in a modern browser.';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  canvasSlot.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b9dda5');
  scene.fog = new THREE.Fog('#b9dda5', 92, 238);
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 420);
  camera.position.set(0, 45, 39);
  const hemi = new THREE.HemisphereLight('#e9ffd2', '#47683c', 2.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1c3', 2.3); sun.position.set(-45, 75, 35); scene.add(sun);

  const PAL = {
    day: { bg: new THREE.Color('#b9dda5'), hs: new THREE.Color('#e9ffd2'), hg: new THREE.Color('#47683c'), hi: 2.0, sun: new THREE.Color('#fff1c3'), si: 2.3, ex: 1.13 },
    night: { bg: new THREE.Color('#2a3860'), hs: new THREE.Color('#8da4ff'), hg: new THREE.Color('#1f2b45'), hi: 1.2, sun: new THREE.Color('#9db4ff'), si: 0.95, ex: 1.0 },
    sunset: { bg: new THREE.Color('#f6b27c'), hs: new THREE.Color('#ffd2a1'), hg: new THREE.Color('#6a5340'), hi: 1.75, sun: new THREE.Color('#ff9d57'), si: 2.0, ex: 1.1 },
  };
  const atmo = { night: 0, sunset: 0 };
  const mixColor = (out, key, wD, wN, wS) => { out.r = PAL.day[key].r * wD + PAL.night[key].r * wN + PAL.sunset[key].r * wS; out.g = PAL.day[key].g * wD + PAL.night[key].g * wN + PAL.sunset[key].g * wS; out.b = PAL.day[key].b * wD + PAL.night[key].b * wN + PAL.sunset[key].b * wS; };
  function applyAtmosphere() {
    const wN = clamp(atmo.night, 0, 1), wS = clamp(atmo.sunset, 0, 1 - wN), wD = Math.max(0, 1 - wN - wS);
    mixColor(scene.background, 'bg', wD, wN, wS); scene.fog.color.copy(scene.background);
    mixColor(hemi.color, 'hs', wD, wN, wS); mixColor(hemi.groundColor, 'hg', wD, wN, wS); mixColor(sun.color, 'sun', wD, wN, wS);
    hemi.intensity = PAL.day.hi * wD + PAL.night.hi * wN + PAL.sunset.hi * wS; sun.intensity = PAL.day.si * wD + PAL.night.si * wN + PAL.sunset.si * wS;
    renderer.toneMappingExposure = PAL.day.ex * wD + PAL.night.ex * wN + PAL.sunset.ex * wS;
  }

  const mats = {
    tree1: new THREE.MeshStandardMaterial({ color: '#579d53', roughness: 0.95 }), tree2: new THREE.MeshStandardMaterial({ color: '#77b85d', roughness: 0.95 }), tree3: new THREE.MeshStandardMaterial({ color: '#3e8448', roughness: 1 }),
    trunk: new THREE.MeshStandardMaterial({ color: '#876042', roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#a8e65e', roughness: 0.68, emissive: '#314d12', emissiveIntensity: .12 }), leafLight: new THREE.MeshStandardMaterial({ color: '#dcf88d', roughness: 0.64 }),
    golden: new THREE.MeshStandardMaterial({ color: '#ffe36b', roughness: .4, emissive: '#f5b21a', emissiveIntensity: .55 }),
    nectar: new THREE.MeshStandardMaterial({ color: '#fff6ce', roughness: .45, emissive: '#f0ad37', emissiveIntensity: .3 }),
    petalPink: new THREE.MeshStandardMaterial({ color: '#ff8b9a', roughness: .72 }), petalYellow: new THREE.MeshStandardMaterial({ color: '#ffe075', roughness: .72 }),
    petalViolet: new THREE.MeshStandardMaterial({ color: '#b78bff', roughness: .72 }), petalOrange: new THREE.MeshStandardMaterial({ color: '#ffa65a', roughness: .72 }),
    beetle: new THREE.MeshStandardMaterial({ color: '#d75e49', roughness: .4, metalness: .15 }), beetleDark: new THREE.MeshStandardMaterial({ color: '#613e36', roughness: .62 }),
    spider: new THREE.MeshStandardMaterial({ color: '#72507f', roughness: .7 }), eye: new THREE.MeshStandardMaterial({ color: '#fffefa', roughness: .35 }), pupil: new THREE.MeshStandardMaterial({ color: '#213629', roughness: .25 }),
    cocoon: new THREE.MeshStandardMaterial({ color: '#efc75f', roughness: .8, emissive: '#7a5410', emissiveIntensity: .15 }),
    butterfly: new THREE.MeshStandardMaterial({ color: '#ffbd67', roughness: .55, side: THREE.DoubleSide }), wing2: new THREE.MeshStandardMaterial({ color: '#f77f81', roughness: .55, side: THREE.DoubleSide }),
    water: new THREE.MeshStandardMaterial({ color: '#77c8c2', roughness: .23, metalness: .05 }), stone: new THREE.MeshStandardMaterial({ color: '#9aab80', roughness: 1 }),
    bird: new THREE.MeshStandardMaterial({ color: '#5a4468', roughness: .7 }), birdLight: new THREE.MeshStandardMaterial({ color: '#d9c4e8', roughness: .6 }), beak: new THREE.MeshStandardMaterial({ color: '#ffae42', roughness: .5 }),
    puddle: new THREE.MeshBasicMaterial({ color: '#7d4fa3', transparent: true, opacity: .62, depthWrite: false }),
    glowLeaf: new THREE.MeshBasicMaterial({ color: '#ddf870', transparent: true, opacity: .27, depthWrite: false }), glowNectar: new THREE.MeshBasicMaterial({ color: '#ffbd64', transparent: true, opacity: .27, depthWrite: false }),
    glowGold: new THREE.MeshBasicMaterial({ color: '#ffe36b', transparent: true, opacity: .42, depthWrite: false }), glowFlower: new THREE.MeshBasicMaterial({ color: '#fff3a8', transparent: true, opacity: .3, depthWrite: false }),
    shadow: new THREE.MeshBasicMaterial({ color: '#102016', transparent: true, opacity: .3, depthWrite: false }),
    toad: new THREE.MeshStandardMaterial({ color: '#5fa84a', roughness: .75 }), toadBelly: new THREE.MeshStandardMaterial({ color: '#d4e8a2', roughness: .8 }),
    wart: new THREE.MeshStandardMaterial({ color: '#467f38', roughness: .9 }), tongue: new THREE.MeshStandardMaterial({ color: '#ff7aa0', roughness: .5 }),
  };
  const geo = {
    sphere: new THREE.SphereGeometry(1, 16, 12), leaf: new THREE.SphereGeometry(1, 12, 8), cylinder: new THREE.CylinderGeometry(.5, .62, 1, 9), thin: new THREE.CylinderGeometry(.045, .055, 1, 6),
    cone: new THREE.ConeGeometry(.15, .42, 7), circle: new THREE.CircleGeometry(1, 28),
  };
  function makeGroundTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    x.fillStyle = '#78ae60'; x.fillRect(0, 0, 512, 512); let seed = 731;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 2100; i++) { const r = 1 + rnd() * 5; x.fillStyle = rnd() > .48 ? 'rgba(222,244,157,.12)' : 'rgba(41,96,50,.12)'; x.beginPath(); x.ellipse(rnd() * 512, rnd() * 512, r * 1.6, r, rnd() * 3, 0, TAU); x.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(14, 14); if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace; return tex;
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300, 1, 1), new THREE.MeshStandardMaterial({ map: makeGroundTexture(), color: '#d7efc4', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.16; scene.add(ground);
  const pond = new THREE.Group();
  const water = new THREE.Mesh(new THREE.CircleGeometry(17, 48), mats.water); water.rotation.x = -Math.PI / 2; water.position.y = -.04; pond.add(water);
  const pondRim = new THREE.Mesh(new THREE.TorusGeometry(17.3, .7, 6, 48), mats.stone); pondRim.rotation.x = Math.PI / 2; pondRim.position.y = .05; pond.add(pondRim);
  pond.position.set(-57, 0, -44); scene.add(pond);

  let seed = 82931;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const rrange = (a, b) => a + rand() * (b - a);
  let liveSeed = (Date.now() % 100000) + 17;   // gameplay randomness differs run to run; the garden layout stays fixed
  const lrand = () => { liveSeed = (liveSeed * 1664525 + 1013904223) >>> 0; return liveSeed / 4294967296; };
  const lrange = (a, b) => a + lrand() * (b - a);
  const editorPositions = cfg.editorPositions || {};
  function applyEditorPosition(object, id, x, z) {
    const pos = editorPositions[id];
    object.position.set(Array.isArray(pos) ? pos[0] : x, 0, Array.isArray(pos) ? pos[1] : z);
    object.userData.editorId = id; object.userData.baseX = object.position.x; object.userData.baseZ = object.position.z;
  }
  const editorPickables = [], food = [], enemies = [], obstacles = [];
  const unblock = (x, z, pad = 1.6) => { const q = pushOutOfCircles(x, z, obstacles, pad); return [q.x, q.z]; };
  const freezeStatic = (g) => { if (!editMode) { g.matrixAutoUpdate = false; g.updateMatrix(); g.traverse((c) => { c.matrixAutoUpdate = false; c.updateMatrix(); }); } };

  function makeTree(id, x, z, size = 1) {
    const g = new THREE.Group(); applyEditorPosition(g, id, x, z);
    const trunk = new THREE.Mesh(geo.cylinder, mats.trunk); trunk.scale.set(.88 * size, 5.3 * size, .88 * size); trunk.position.y = 2.65 * size; g.add(trunk);
    for (const [dx, dy, dz, r, mat] of [[0, 6.2, 0, 3.6, mats.tree1], [2.25, 5.6, .4, 2.5, mats.tree2], [-2.1, 5.4, .2, 2.7, mats.tree3], [.2, 5.3, -2.0, 2.4, mats.tree2]]) {
      const crown = new THREE.Mesh(geo.sphere, mat); crown.position.set(dx * size, dy * size, dz * size); crown.scale.set(r * size, r * .7 * size, r * size); g.add(crown);
    }
    obstacles.push({ x: g.position.x, z: g.position.z, r: 1.5 * size });
    scene.add(g); editorPickables.push(g); freezeStatic(g); return g;
  }
  function makeBush(id, x, z, size = 1) {
    const g = new THREE.Group(); applyEditorPosition(g, id, x, z);
    for (const [dx, dy, dz, s, m] of [[0, 1.0, 0, 1.65, mats.tree3], [1.15, .85, .1, 1.2, mats.tree2], [-1.0, .9, .15, 1.18, mats.tree1]]) {
      const m0 = new THREE.Mesh(geo.sphere, m); m0.position.set(dx * size, dy * size, dz * size); m0.scale.set(s * size, s * .74 * size, s * size); g.add(m0);
    }
    obstacles.push({ x: g.position.x, z: g.position.z, r: 1.95 * size });
    scene.add(g); editorPickables.push(g); freezeStatic(g); return g;
  }
  for (let i = 0; i < 25; i++) {
    const side = i % 4, t = -139 + (Math.floor(i / 4) / 6) * 278;
    const x = side === 0 ? t : side === 1 ? t : side === 2 ? -140 : 140, z = side === 0 ? -140 : side === 1 ? 140 : t;
    makeTree(`tree-border-${i}`, x + rrange(-4, 4), z + rrange(-4, 4), rrange(.75, 1.18));
  }
  for (let i = 0; i < 32; i++) {
    let x, z; do { x = rrange(-132, 132); z = rrange(-132, 132); } while (Math.hypot(x, z) < 22 || (Math.hypot(x + 57, z + 44) < 20));
    (i % 3 === 0 ? makeTree : makeBush)(`plant-${i}`, x, z, rrange(.75, 1.28));
  }
  const dummy = new THREE.Object3D();
  function instanced(geometry, material, count) { const m = new THREE.InstancedMesh(geometry, material, count); m.frustumCulled = false; scene.add(m); return m; }
  const stones = instanced(geo.sphere, mats.stone, 23);
  for (let i = 0; i < 23; i++) { dummy.position.set(rrange(-145, 145), .12, rrange(-145, 145)); dummy.scale.set(rrange(.45, 1.1), rrange(.22, .55), rrange(.4, .85)); dummy.rotation.set(0, rand() * Math.PI, 0); dummy.updateMatrix(); stones.setMatrixAt(i, dummy.matrix); }
  const BLOOMS = 80, stems = instanced(geo.thin, mats.tree3, BLOOMS), heads = instanced(geo.sphere, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .72 }), BLOOMS);
  const bloomColors = ['#ff8b9a', '#ffe075', '#ffffff', '#c9a6ff'];
  for (let i = 0; i < BLOOMS; i++) {
    let x = rrange(-143, 143), z = rrange(-143, 143); if (Math.hypot(x, z) < 10) { x += 14; z += 14; }
    dummy.rotation.set(0, 0, 0); dummy.position.set(x, .35, z); dummy.scale.set(.55, .7, .55); dummy.updateMatrix(); stems.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, .73, z); dummy.scale.set(.17, .11, .17); dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix); heads.setColorAt(i, new THREE.Color(bloomColors[i % 4]));
  }
  const shrubs = instanced(geo.sphere, mats.tree3, 148); let si = 0;
  for (let i = -145; i <= 145; i += 8) for (const side of [-1, 1]) {
    dummy.rotation.set(0, 0, 0); dummy.scale.set(4.5, 2.7, 4.5);
    dummy.position.set(i, 1.15, side * 149); dummy.updateMatrix(); shrubs.setMatrixAt(si++, dummy.matrix);
    dummy.position.set(side * 149, 1.15, i); dummy.updateMatrix(); shrubs.setMatrixAt(si++, dummy.matrix);
  }
  shrubs.count = si;

  /* ---------- food */
  function makeFoodPickup(id, x, z, kind) {
    [x, z] = unblock(x, z, 2.2);
    const g = new THREE.Group(); applyEditorPosition(g, id, x, z); g.userData.kind = kind;
    const glow = new THREE.Mesh(geo.circle, kind === 'nectar' ? mats.glowNectar : kind === 'golden' ? mats.glowGold : mats.glowLeaf);
    glow.rotation.x = -Math.PI / 2; glow.position.y = .05; glow.scale.setScalar(kind === 'nectar' ? 1.7 : kind === 'golden' ? 2.4 : 1.25); g.add(glow);
    if (kind === 'nectar') {
      const stem = new THREE.Mesh(geo.thin, mats.tree3); stem.scale.set(.72, 1.25, .72); stem.position.y = .64; g.add(stem);
      for (let k = 0; k < 5; k++) { const petal = new THREE.Mesh(geo.sphere, mats.petalPink); const a = k * TAU / 5; petal.position.set(Math.cos(a) * .65, 1.35, Math.sin(a) * .65); petal.scale.set(.48, .22, .34); petal.rotation.y = -a; g.add(petal); }
      const center = new THREE.Mesh(geo.sphere, mats.nectar); center.position.y = 1.42; center.scale.set(.32, .26, .32); g.add(center);
    } else {
      const lm = kind === 'golden' ? mats.golden : mats.leaf, sc = kind === 'golden' ? 1.35 : 1;
      for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(geo.leaf, k === 1 ? (kind === 'golden' ? mats.golden : mats.leafLight) : lm); l.position.set((k - 1) * .48 * sc, .34 + (k === 1 ? .1 : 0), (k % 2 ? -.1 : .2)); l.scale.set(.72 * sc, .15 * sc, .43 * sc); l.rotation.y = (k - 1) * .48; g.add(l); }
      const stem = new THREE.Mesh(geo.thin, mats.tree3); stem.scale.set(.2, .72, .2); stem.rotation.z = Math.PI / 2; stem.position.set(0, .34, .02); g.add(stem);
    }
    g.userData.floatSeed = rand() * 7; scene.add(g); editorPickables.push(g);
    food.push({ id, mesh: g, x: g.position.x, z: g.position.z, spawnX: g.position.x, spawnZ: g.position.z, kind, active: true, respawnAt: 0 });
  }
  const foodCount = Math.max(20, Math.floor(savedSettings.foodCount));
  for (let i = 0; i < foodCount; i++) {
    let x, z;
    if (i < 8) { const a = rand() * TAU, r = 10 + rand() * 20; x = Math.cos(a) * r; z = Math.sin(a) * r; } else { x = rrange(-143, 143); z = rrange(-143, 143); }
    if (Math.hypot(x + 57, z + 44) < 19) { x += 35; z += 35; }
    makeFoodPickup(`food-${i}`, x, z, i % 20 === 7 ? 'golden' : i % 7 === 4 ? 'nectar' : 'leaf');
  }

  /* ---------- player */
  const playerStart = editorPositions.player_start;
  const startX = Array.isArray(playerStart) ? playerStart[0] : 0, startZ = Array.isArray(playerStart) ? playerStart[1] : 0;
  const player = new THREE.Group(); applyEditorPosition(player, 'player_start', startX, startZ); scene.add(player); editorPickables.push(player);
  const playerVisual = new THREE.Group(); player.add(playerVisual);
  let caterpillarParts = [], butterflyParts = [];
  const CATER_COLORS = [['#8cdf54', '#70c947', '#59b84d'], ['#a6e25a', '#7cc94a', '#e9c84f'], ['#9ee24c', '#ffb64d', '#f27d52']];
  function buildCaterpillar(stage) {
    playerVisual.clear(); caterpillarParts = [];
    const cols = CATER_COLORS[Math.min(2, stage)].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: .74 }));
    const n = 4 + Math.min(2, stage), segments = [];
    for (let i = 0; i < n; i++) segments.push({ x: 0, y: .89 - i * .05, z: -1.12 + i * (2.77 / (n - 1)), r: .83 - i * (.27 / (n - 1)) });
    segments.forEach((p, i) => {
      const s = new THREE.Mesh(geo.sphere, cols[(i + stage) % 3]); s.position.set(p.x, p.y, p.z); s.scale.set(p.r, p.r * .91, p.r * 1.03); playerVisual.add(s); caterpillarParts.push({ mesh: s, y: p.y });
      for (let q = 0; q < 4; q++) {
        const a = q * Math.PI / 2 + (i % 2) * .5;
        const spine = new THREE.Mesh(geo.cone, mats.leafLight); spine.position.set(Math.cos(a) * p.r * .65, p.y + p.r * .7, p.z + Math.sin(a) * p.r * .55); spine.rotation.z = Math.cos(a) * -.35; spine.rotation.x = Math.sin(a) * .3; spine.scale.set(.78 + stage * .22, .88 + stage * .35, .78 + stage * .22); playerVisual.add(spine);
      }
    });
    for (const x of [-.37, .37]) {
      const white = new THREE.Mesh(geo.sphere, mats.eye); white.scale.set(.27, .3, .18); white.position.set(x, 1.55, -1.52); playerVisual.add(white);
      const pupil = new THREE.Mesh(geo.sphere, mats.pupil); pupil.scale.set(.12, .15, .09); pupil.position.set(x + (x > 0 ? .03 : -.03), 1.64, -1.63); playerVisual.add(pupil);
      const glint = new THREE.Mesh(geo.sphere, mats.eye); glint.scale.set(.045, .05, .035); glint.position.set(pupil.position.x - .035, 1.73, -1.69); playerVisual.add(glint);
    }
    for (let i = 0; i < 6 + stage * 2; i++) for (const side of [-1, 1]) { const foot = new THREE.Mesh(geo.sphere, mats.tree3); foot.scale.set(.14, .13, .24); foot.position.set(side * .46, .22, -.05 + i * (2.3 / (5 + stage * 2))); playerVisual.add(foot); }
  }
  function buildButterfly() {
    playerVisual.clear(); butterflyParts = [];
    const body = new THREE.Mesh(geo.sphere, mats.pupil); body.scale.set(.25, .22, .9); body.position.y = .6; playerVisual.add(body);
    const head = new THREE.Mesh(geo.sphere, mats.eye); head.scale.set(.34, .28, .32); head.position.set(0, .66, -.84); playerVisual.add(head);
    for (const side of [-1, 1]) {
      const upper = new THREE.Mesh(geo.sphere, mats.butterfly); upper.position.set(side * .72, .73, -.3); const us = [.85, .2, .83]; upper.scale.set(...us); playerVisual.add(upper); butterflyParts.push({ mesh: upper, side, phase: 0, base: us, px: side * .72 });
      const lower = new THREE.Mesh(geo.sphere, mats.wing2); lower.position.set(side * .62, .68, .55); const ls = [.65, .16, .68]; lower.scale.set(...ls); playerVisual.add(lower); butterflyParts.push({ mesh: lower, side, phase: 1.5, base: ls, px: side * .62 });
    }
    const antenna = new THREE.Mesh(geo.thin, mats.pupil); antenna.scale.set(.18, .7, .18); antenna.rotation.x = -.65; antenna.position.set(-.2, .95, -1.1); playerVisual.add(antenna);
    const antenna2 = antenna.clone(); antenna2.position.x = .2; playerVisual.add(antenna2);
  }
  buildCaterpillar(0);
  player.rotation.y = Math.PI;
  const cocoon = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mats.cocoon); cocoon.scale.set(.82, 1.24, .78); cocoon.position.y = .62; cocoon.visible = false; const cocoonWrap = new THREE.Group(); cocoonWrap.scale.setScalar(1.8); cocoonWrap.add(cocoon); player.add(cocoonWrap);
  const burstWave = new THREE.Mesh(new THREE.TorusGeometry(1, .18, 7, 50), new THREE.MeshBasicMaterial({ color: '#ebff8e', transparent: true, opacity: .8, depthWrite: false })); burstWave.rotation.x = Math.PI / 2; burstWave.position.y = .25; burstWave.visible = false; player.add(burstWave);

  /* ---------- birds, telegraphs, puddles, particles */
  function makeBirdMesh() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(geo.sphere, mats.bird); body.scale.set(.9, .65, 1.5); g.add(body);
    const belly = new THREE.Mesh(geo.sphere, mats.birdLight); belly.scale.set(.7, .4, 1.1); belly.position.set(0, -.2, .1); g.add(belly);
    const head = new THREE.Mesh(geo.sphere, mats.bird); head.scale.set(.55, .5, .55); head.position.set(0, .35, -1.35); g.add(head);
    const beak = new THREE.Mesh(geo.cone, mats.beak); beak.scale.set(1.4, 1.6, 1.4); beak.rotation.x = -Math.PI / 2; beak.position.set(0, .3, -1.85); g.add(beak);
    for (const x of [-.2, .2]) { const e = new THREE.Mesh(geo.sphere, mats.eye); e.scale.set(.12, .12, .1); e.position.set(x, .5, -1.62); g.add(e); const p = new THREE.Mesh(geo.sphere, mats.pupil); p.scale.set(.06, .07, .05); p.position.set(x, .5, -1.7); g.add(p); }
    g.userData.wings = [];
    for (const side of [-1, 1]) { const w = new THREE.Mesh(geo.sphere, mats.bird); w.scale.set(2.3, .1, 1.0); w.position.set(side * 1.9, .15, 0); g.add(w); g.userData.wings.push({ mesh: w, side }); }
    const tail = new THREE.Mesh(geo.sphere, mats.bird); tail.scale.set(.5, .1, 1.0); tail.position.set(0, .1, 1.8); g.add(tail);
    g.scale.setScalar(1.25); return g;
  }
  const strikeBird = makeBirdMesh(); strikeBird.visible = false; scene.add(strikeBird);
  const strikeMark = new THREE.Mesh(geo.circle, new THREE.MeshBasicMaterial({ color: '#e0412c', transparent: true, opacity: .3, depthWrite: false })); strikeMark.rotation.x = -Math.PI / 2; strikeMark.position.y = .12; strikeMark.visible = false; scene.add(strikeMark);
  const strikeRing = new THREE.Mesh(new THREE.TorusGeometry(1, .06, 6, 40), new THREE.MeshBasicMaterial({ color: '#ff6a4d', transparent: true, opacity: .9, depthWrite: false })); strikeRing.rotation.x = Math.PI / 2; strikeRing.position.y = .16; strikeRing.visible = false; scene.add(strikeRing);
  const strike = { active: false, t: 0, x: 0, z: 0, r: 6.5, resolved: false, cd: 3, target: 'player' };

  const puddles = [];
  for (let i = 0; i < 9; i++) {
    let x, z; do { x = rrange(-125, 125); z = rrange(-125, 125); } while (Math.hypot(x, z) < 28 || Math.hypot(x + 57, z + 44) < 24);
    const m = new THREE.Mesh(geo.circle, mats.puddle); m.rotation.x = -Math.PI / 2; m.position.set(x, .1, z); const r = rrange(5, 7.2); m.scale.setScalar(r); m.visible = false; scene.add(m);
    const bub = new THREE.Mesh(geo.sphere, new THREE.MeshBasicMaterial({ color: '#c9a4f0', transparent: true, opacity: .7 })); bub.scale.setScalar(.35); bub.position.set(x, .3, z); bub.visible = false; scene.add(bub);
    puddles.push({ mesh: m, bub, x, z, r, shown: false });
  }

  const pMats = {}; const pMat = (c) => pMats[c] || (pMats[c] = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .95, depthWrite: false }));
  const parts = [];
  for (let i = 0; i < 80; i++) { const m = new THREE.Mesh(geo.sphere, pMat('#ffffff')); m.visible = false; scene.add(m); parts.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: .3 }); }
  function spawnParts(x, y, z, n, color, speed = 6, life = .9, size = .28, up = 4) {
    let k = 0;
    for (const p of parts) {
      if (k >= n) break; if (p.life > 0) continue;
      const a = lrand() * TAU, s = speed * (.35 + lrand() * .65);
      p.mesh.material = pMat(color); p.mesh.position.set(x + Math.cos(a) * .4, y, z + Math.sin(a) * .4); p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = up * (.4 + lrand()); p.life = p.max = life * (.7 + lrand() * .6); p.size = size * (.7 + lrand() * .6);
      p.mesh.visible = true; p.mesh.scale.setScalar(p.size); k++;
    }
  }
  const rings = [];
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, .2, 7, 44), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = Math.PI / 2; m.visible = false; scene.add(m); rings.push({ mesh: m, t: 0, dur: 1, max: 10, on: false }); }
  function ringFx(x, z, color, max = 12, dur = .9, y = .3) {
    const r = rings.find((q) => !q.on) || rings[0]; r.on = true; r.t = 0; r.dur = dur; r.max = max; r.mesh.material.color.set(color); r.mesh.position.set(x, y, z); r.mesh.visible = true;
  }

  /* ---------- mini-boss: the Giant Toad */
  const toad = new THREE.Group(); toad.visible = false; scene.add(toad);
  (function buildToad() {
    const add = (m) => { toad.add(m); return m; };
    const body = add(new THREE.Mesh(geo.sphere, mats.toad)); body.scale.set(3.6, 2.4, 4.0); body.position.y = 2.3;
    const belly = add(new THREE.Mesh(geo.sphere, mats.toadBelly)); belly.scale.set(3.0, 1.5, 3.3); belly.position.set(0, 1.5, -.3);
    const head = add(new THREE.Mesh(geo.sphere, mats.toad)); head.scale.set(2.5, 1.9, 2.3); head.position.set(0, 3.2, -2.8);
    for (const sd of [-1, 1]) {
      const w = add(new THREE.Mesh(geo.sphere, mats.eye)); w.scale.setScalar(.85); w.position.set(sd * 1.35, 4.6, -3.1);
      const pu = add(new THREE.Mesh(geo.sphere, mats.pupil)); pu.scale.set(.42, .45, .3); pu.position.set(sd * 1.35, 4.65, -3.85);
      const leg = add(new THREE.Mesh(geo.sphere, mats.toad)); leg.scale.set(1.2, 1.1, 1.8); leg.position.set(sd * 3.0, 1.0, 1.8);
      const fr = add(new THREE.Mesh(geo.sphere, mats.toad)); fr.scale.set(.8, 1, 1.1); fr.position.set(sd * 2.4, .9, -2.9);
    }
    const mouth = add(new THREE.Mesh(geo.thin, mats.pupil)); mouth.scale.set(1.4, 5.0, 1.4); mouth.rotation.z = Math.PI / 2; mouth.position.set(0, 2.55, -4.65);
    for (let i = 0; i < 9; i++) { const wt = add(new THREE.Mesh(geo.sphere, mats.wart)); const a = i * 2.4; wt.scale.setScalar(.34 + (i % 3) * .08); wt.position.set(Math.cos(a) * 2.2, 4.1 + Math.sin(a * 1.7) * .3, Math.sin(a) * 2.6 + 1.0); }
    const tongue = add(new THREE.Mesh(geo.thin, mats.tongue)); tongue.rotation.x = Math.PI / 2; tongue.visible = false;
    const stars = []; for (let i = 0; i < 3; i++) { const st = add(new THREE.Mesh(geo.sphere, mats.golden)); st.scale.setScalar(.38); st.visible = false; stars.push(st); }
    toad.userData = { tongue, stars };
  })();
  const lashGeo = new THREE.PlaneGeometry(1, 1); lashGeo.rotateX(-Math.PI / 2); lashGeo.translate(0, 0, -.5);
  const lashMark = new THREE.Mesh(lashGeo, new THREE.MeshBasicMaterial({ color: '#e0412c', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); lashMark.position.y = .14; lashMark.visible = false; scene.add(lashMark);
  const landMark = new THREE.Mesh(geo.circle, new THREE.MeshBasicMaterial({ color: '#e0412c', transparent: true, opacity: 0, depthWrite: false })); landMark.rotation.x = -Math.PI / 2; landMark.position.y = .13; landMark.visible = false; scene.add(landMark);
  const boss = { active: false, done: false, hp: BOSS.hp, x: 0, z: 0, tx: 0, tz: 0, sx: 0, sz: 0, ry: 0, mode: 'idle', t: 0, life: 0, pop: 0, tele: false, early: false };

  function makeEnemy(id, x, z, kind, minStage) {
    const g = new THREE.Group(); applyEditorPosition(g, id, x, z); g.userData.kind = kind;
    const bodyMat = kind === 'spider' ? mats.spider : mats.beetleDark;
    const body = new THREE.Mesh(geo.sphere, bodyMat); body.scale.set(kind === 'spider' ? .88 : 1.03, .57, kind === 'spider' ? .83 : 1.22); body.position.y = .52; g.add(body);
    const shell = new THREE.Mesh(geo.sphere, kind === 'spider' ? mats.spider : mats.beetle); shell.scale.set(kind === 'spider' ? .75 : .9, .48, kind === 'spider' ? .72 : .87); shell.position.set(0, .84, .12); g.add(shell);
    for (let i = 0; i < (kind === 'spider' ? 4 : 3); i++) for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(geo.thin, bodyMat); leg.scale.set(.6, kind === 'spider' ? 2.3 : 1.7, .6); leg.position.set(side * .78, .31, -.62 + i * (kind === 'spider' ? .42 : .55)); leg.rotation.z = side * -.62; g.add(leg);
    }
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(geo.sphere, mats.eye); eye.scale.set(.15, .16, .12); eye.position.set(side * .28, .73, -.85); g.add(eye);
      const pupil = new THREE.Mesh(geo.sphere, mats.pupil); pupil.scale.set(.08, .09, .07); pupil.position.set(side * .28, .74, -.96); g.add(pupil);
    }
    if (kind === 'beetle') { const line = new THREE.Mesh(geo.thin, mats.beetleDark); line.scale.set(.25, 1.3, .25); line.position.set(0, .87, .17); g.add(line); }
    let tele = null;
    if (kind === 'spider') { tele = new THREE.Mesh(geo.circle, new THREE.MeshBasicMaterial({ color: '#ff5a3c', transparent: true, opacity: 0, depthWrite: false })); tele.rotation.x = -Math.PI / 2; tele.position.y = .14; tele.scale.setScalar(4.2); g.add(tele); }
    g.userData.phase = rand() * 9; scene.add(g); editorPickables.push(g); g.visible = false;
    enemies.push({ id, mesh: g, x: g.position.x, z: g.position.z, homeX: g.position.x, homeZ: g.position.z, kind, minStage, stun: 0, phase: g.userData.phase, active: false, mode: 'wander', modeT: 0, dirX: 0, dirZ: 1, tele, pop: 1, hold: 0 });
  }
  const predatorCount = Math.max(0, Math.floor(savedSettings.predatorCount));
  let nBeetle = 0, nSpider = 0;
  for (let i = 0; i < predatorCount; i++) {
    const a = rand() * TAU, r = 42 + rand() * 80, kind = i % 3 === 2 ? 'spider' : 'beetle';
    makeEnemy(`predator-${i}`, Math.cos(a) * r, Math.sin(a) * r, kind, predatorMinStage(kind, kind === 'spider' ? nSpider++ : nBeetle++));
  }

  /* ---------- pollen flowers + hunter birds (butterfly phase) */
  const flowers = [], hunters = [];
  const flowerMats = [mats.petalPink, mats.petalYellow, mats.petalViolet, mats.petalOrange];
  function makeFlower(x, z, golden) {
    [x, z] = unblock(x, z, 2.2);
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const stem = new THREE.Mesh(geo.thin, mats.tree3); stem.scale.set(1.1, 2.2, 1.1); stem.position.y = 1.0; g.add(stem);
    const head = new THREE.Mesh(geo.sphere, golden ? mats.golden : flowerMats[Math.floor(lrand() * 4)]); head.scale.set(golden ? 1.25 : .85, .32, golden ? 1.25 : .85); head.position.y = 2.15; g.add(head);
    const core = new THREE.Mesh(geo.sphere, mats.nectar); core.scale.set(.32, .3, .32); core.position.y = 2.3; g.add(core);
    const glow = new THREE.Mesh(geo.circle, golden ? mats.glowGold : mats.glowFlower); glow.rotation.x = -Math.PI / 2; glow.position.y = .08; glow.scale.setScalar(golden ? 2.6 : 1.6); g.add(glow);
    g.userData.seed = lrand() * 7; scene.add(g);
    return { mesh: g, x, z, golden, active: true, respawnAt: 0 };
  }
  const flowerSpot = (px, pz) => { let x, z, tries = 0; do { x = lrange(-138, 138); z = lrange(-138, 138); tries++; } while ((Math.hypot(x - px, z - pz) < 26 || Math.hypot(x + 57, z + 44) < 19) && tries < 20); return unblock(x, z, 2.2); };
  function spawnFlowers() {
    clearFlowers();
    for (let c = 0; c < 8; c++) {
      const [cx, cz] = flowerSpot(playerState.x, playerState.z);
      for (let k = 0; k < 7; k++) { const a = lrand() * TAU, r = lrange(2, 10); flowers.push(makeFlower(clamp(cx + Math.cos(a) * r, -140, 140), clamp(cz + Math.sin(a) * r, -140, 140), false)); }
    }
    for (let k = 0; k < 6; k++) { const [x, z] = flowerSpot(playerState.x, playerState.z); flowers.push(makeFlower(x, z, true)); }
  }
  function clearFlowers() { for (const f of flowers) scene.remove(f.mesh); flowers.length = 0; }
  function spawnHunters(n) { for (let i = hunters.length; i < n; i++) { const m = makeBirdMesh(); scene.add(m); const sh = new THREE.Mesh(geo.circle, mats.shadow); sh.rotation.x = -Math.PI / 2; sh.position.y = .09; sh.scale.setScalar(3); scene.add(sh); const a = lrand() * TAU; hunters.push({ mesh: m, shadow: sh, x: clamp(playerState.x + Math.cos(a) * 70, -140, 140), z: clamp(playerState.z + Math.sin(a) * 70, -140, 140), mode: 'chase', fleeT: 0, dirX: 0, dirZ: 1, wing: lrand() * 6 }); } }
  function clearHunters() { for (const h of hunters) { scene.remove(h.mesh); scene.remove(h.shadow); } hunters.length = 0; }

  /* ---------- state */
  const playerState = { x: player.position.x, z: player.position.z, energy: 0, foodEaten: 0, stage: 0, health: 3, invulnerable: 0, burstCooldown: 0, cocooning: false, cocoonTimer: 0, complete: false, alive: true, shielded: false };
  const ui = {};
  for (const id of ['progress-fill', 'energy-label', 'food-count', 'chapter-label', 'hearts', 'burst-button', 'burst-cooldown', 'danger-alert', 'status-toast', 'minimap', 'map-coord', 'vignette', 'flash', 'chapter-banner', 'cb-title', 'cb-text', 'control-hint', 'score-big', 'timer-label', 'combo-label', 'combo-fill', 'cocoon-fill', 'cocoon-time', 'cocoon-sub', 'float-layer', 'sound-btn', 'start-overlay', 'finish-overlay', 'gameover-overlay', 'stars', 'res-score', 'res-grid', 'res-best', 'go-title', 'go-text', 'intro-footer', 'bossbar', 'boss-fill', 'boss-hits', 'boss-sub', 'res-board']) ui[id] = root.querySelector(`#${id}`);
  const stick = root.querySelector('#stick'), knob = root.querySelector('#stick-knob');
  const input = { x: 0, z: 0, keys: new Set(), pointerId: null, pointerOrigin: null };
  let phase = editMode ? 'edit' : 'start', phaseT = 0, abilities = abilitiesForStage(0), cocoonIntegrity = 100, flyT = 0, bestScore = 0, runStats = null;
  let toastTimer = 0, simTime = 0, mapTimer = 0, burstWaveTimer = 0, selectedId = null, dragId = null, lastFrame = performance.now(), bannerTimer = 0, shake = 0, toxic = 0, inPuddle = false, poisonWarned = false;
  let moltStage = 0, moltBuilt = false, camH = 43, camBack = 31, hintHidden = false, timeScale = 1, floatIdx = 0, lastMove = { x: 0, z: 0 };
  let score = { combo: 0, score: 0, maxCombo: 0, lastPollenAt: null }, butterflyStun = 0, flyWarned = false, flyBonus = 0, stuns = 0;
  const raycaster = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pointerNdc = new THREE.Vector2();
  let animationId = 0, paused = false;
  const listeners = [];
  const listen = (target, event, handler, options) => { target.addEventListener(event, handler, options); listeners.push(() => target.removeEventListener(event, handler, options)); };
  const setPhase = (p) => { phase = p; phaseT = 0; root.dataset.phase = p; };
  const toast = (text, duration = 1.9) => { ui['status-toast'].textContent = text; ui['status-toast'].classList.add('show'); toastTimer = duration; };
  const banner = (title, text, dur = 3.2) => { ui['cb-title'].textContent = title; ui['cb-text'].textContent = text; ui['chapter-banner'].classList.add('show'); bannerTimer = dur; };
  const addShake = (v) => { shake = Math.max(shake, v); };
  const hap = (p) => { try { lib.haptics?.play?.(p); } catch (e) { /* optional */ } };
  const vec = new THREE.Vector3();
  function floatText(text, x, z, bad = false) {
    const el = ui['float-layer'].children[floatIdx++ % 10] || (() => { const d = document.createElement('div'); d.className = 'ftxt'; ui['float-layer'].appendChild(d); return d; })();
    vec.set(x, 2.5, z).project(camera); const r = renderer.domElement.getBoundingClientRect();
    el.className = 'ftxt'; el.textContent = text; el.style.left = `${(vec.x * .5 + .5) * r.width}px`; el.style.top = `${(-vec.y * .5 + .5) * r.height}px`;
    void el.offsetWidth; el.className = `ftxt go${bad ? ' bad' : ''}`;
  }
  const flash = (v = 1, ms = 500) => { ui.flash.style.opacity = String(v); setTimeout(() => { ui.flash.style.opacity = '0'; }, ms); };

  function loadBest() {
    try { Promise.resolve(lib.getUserGameState?.()).then((r) => { const b = r && r.state && Number(r.state.best); if (b) { bestScore = b; ui['intro-footer'].textContent = `Best score: ${bestScore}`; } }).catch(() => {}); } catch (e) { /* offline */ }
  }
  function saveBest() { try { Promise.resolve(lib.saveUserGameState?.({ best: bestScore })).catch(() => {}); } catch (e) { /* offline */ } }
  function refreshSoundBtn() { ui['sound-btn'].textContent = audio.muted ? '🔇' : '🔊'; }

  function updateHud() {
    ui['progress-fill'].style.width = `${playerState.energy}%`;
    ui['energy-label'].textContent = `${Math.floor(playerState.energy)} / 100`;
    ui['food-count'].textContent = `${playerState.foodEaten} NIBBLES`;
    const ch = Math.min(2, playerState.stage);
    ui['chapter-label'].textContent = `CHAPTER ${ch + 1} · ${CHAPTERS[ch]}`;
    ui.hearts.textContent = `${'♥'.repeat(Math.max(0, playerState.health))}${'♡'.repeat(Math.max(0, 3 - playerState.health))}`.split('').join(' ');
    const ready = playerState.burstCooldown <= 0;
    ui['burst-button'].classList.toggle('cooling', !ready);
    ui['burst-cooldown'].textContent = ready ? 'READY!' : `${playerState.burstCooldown.toFixed(1)}s`;
    ui.vignette.style.opacity = phase === 'larva' && playerState.health === 1 ? '1' : '0';
  }
  function drawMinimap() {
    const c = ui.minimap, ctx = c.getContext('2d'), w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#a9d48c'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(59,111,65,.26)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2);
    const xy = (x, z) => [((x + 150) / 300) * w, ((z + 150) / 300) * h];
    ctx.fillStyle = 'rgba(81,158,163,.72)'; ctx.beginPath(); ctx.arc(...xy(-57, -44), w * .056, 0, TAU); ctx.fill();
    for (const p of puddles) if (p.shown && phase !== 'fly') { const [x, y] = xy(p.x, p.z); ctx.fillStyle = 'rgba(125,79,163,.75)'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
    if (phase === 'fly') {
      for (const f of flowers) if (f.active) { const [x, y] = xy(f.x, f.z); ctx.fillStyle = f.golden ? '#ffd23f' : '#ff9ac0'; ctx.beginPath(); ctx.arc(x, y, f.golden ? 4.6 : 2.6, 0, TAU); ctx.fill(); }
      for (const hh of hunters) { const [x, y] = xy(hh.x, hh.z); ctx.fillStyle = '#7b4fa0'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); }
    } else {
      for (const f of food) if (f.active) { const [x, y] = xy(f.x, f.z); ctx.fillStyle = f.kind === 'nectar' ? '#ee9a5a' : f.kind === 'golden' ? '#ffcf1f' : '#f4dc69'; ctx.beginPath(); ctx.arc(x, y, f.kind === 'leaf' ? 2.5 : 4, 0, TAU); ctx.fill(); }
      for (const e of enemies) if (e.active) { const [x, y] = xy(e.x, e.z); ctx.fillStyle = e.kind === 'spider' ? '#9a58c8' : '#d96658'; ctx.beginPath(); ctx.arc(x, y, 3.8, 0, TAU); ctx.fill(); }
      if (boss.active) { const [x, y] = xy(boss.x, boss.z); ctx.fillStyle = '#3f9d3a'; ctx.beginPath(); ctx.arc(x, y, 7.5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
      if (strike.active) { const [x, y] = xy(strike.x, strike.z); ctx.strokeStyle = '#ff3b2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.stroke(); }
    }
    const [px, py] = xy(playerState.x, playerState.z); ctx.fillStyle = '#fff678'; ctx.beginPath(); ctx.arc(px, py, 5.6, 0, TAU); ctx.fill(); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
    ui['map-coord'].textContent = `${Math.round(playerState.x)} · ${Math.round(playerState.z)}`;
  }
  function updateSelectedUI() {
    const selected = selectedId || 'none';
    root.querySelector('#editor-selected').textContent = `Selected: ${selected.replaceAll('-', ' ')}`;
    root.querySelector('#editor-copy').textContent = selectedId ? 'Drag the selected garden piece on the map. Its position is written to gameConfig.editorPositions.' : 'Tap an object, then drag it wherever you like. Every move is saved to your game config.';
  }

  /* ---------- run lifecycle */
  function activateEnemies(stage, fresh = true) {
    for (const e of enemies) {
      if (e.active || e.minStage > stage) continue;
      e.active = true; e.mesh.visible = true; e.stun = 0; e.mode = 'wander'; e.pop = fresh ? 0 : 1;
      if (fresh) { const a = lrand() * TAU, r = lrange(50, 75); e.x = clamp(playerState.x + Math.cos(a) * r, -142, 142); e.z = clamp(playerState.z + Math.sin(a) * r, -142, 142); e.mesh.position.set(e.x, 0, e.z); }
    }
  }
  function showPuddles(on) { for (const p of puddles) { p.shown = on; p.mesh.visible = on; p.bub.visible = on; } }
  function newRun(showIntro = false) {
    clearFlowers(); clearHunters();
    Object.assign(playerState, { x: startX, z: startZ, energy: 0, foodEaten: 0, stage: 0, health: 3, invulnerable: 0, burstCooldown: 0, cocooning: false, cocoonTimer: 0, complete: false, alive: true, shielded: false });
    player.position.set(startX, 0, startZ); player.rotation.y = Math.PI; buildCaterpillar(0); playerVisual.visible = true; playerVisual.scale.set(savedSettings.caterpillarScale * 1.8, savedSettings.caterpillarScale, savedSettings.caterpillarScale); playerVisual.position.y = 0;
    cocoon.visible = false; cocoon.rotation.z = 0; mats.cocoon.color.set('#efc75f'); mats.cocoon.emissiveIntensity = .15; playerVisual.userData.born = false; strike.flying = false; abilities = abilitiesForStage(0); cocoonIntegrity = 100; score = { combo: 0, score: 0, maxCombo: 0, lastPollenAt: null }; butterflyStun = 0; strike.active = false; strike.cd = 6; strike.t = 0; strikeBird.visible = false; strikeMark.visible = false; strikeRing.visible = false;
    moltStage = 0; boss.active = false; boss.done = false; boss.hp = BOSS.hp; toad.visible = false; toad.rotation.z = 0; landMark.visible = false; lashMark.visible = false; ui.bossbar.classList.remove('show');
    for (const f of food) { f.active = true; f.x = f.spawnX; f.z = f.spawnZ; f.mesh.position.set(f.x, 0, f.z); f.mesh.visible = true; }
    for (const e of enemies) { e.hold = 0; e.active = false; e.mesh.visible = false; e.x = e.homeX; e.z = e.homeZ; e.mesh.position.set(e.x, 0, e.z); e.stun = 0; e.mode = 'wander'; e.pop = 1; e.mesh.scale.setScalar(1); }
    activateEnemies(0, false); showPuddles(false); atmo.night = 0; atmo.sunset = 0; applyAtmosphere();
    camH = 43; camBack = 31; camera.position.set(startX, 45, startZ + 33); input.x = 0; input.z = 0; runStats = { start: performance.now() };
    ['finish-overlay', 'gameover-overlay'].forEach((k) => ui[k].classList.remove('show')); ui['start-overlay'].classList.toggle('show', showIntro);
    setPhase(showIntro ? 'start' : 'larva'); updateHud(); hintHidden = false; ui['control-hint'].style.opacity = '1';
    if (!showIntro) { playMusic('bgm_garden'); banner('CHAPTER 1', 'Tiny Tendril — find leaves & nectar'); }
  }
  function startGame() {
    if (editMode || phase !== 'start') return;
    ensureAudio(); playSfx('sfx_click'); ui['start-overlay'].classList.remove('show'); setPhase('larva'); playMusic('bgm_garden');
    banner('CHAPTER 1', 'Tiny Tendril — find leaves & nectar'); toast('Wiggle out there, little fuzzball!', 2.4);
  }
  function gameOver(why) {
    setPhase('dead'); stopMusic(0.5); hap('error');
    ui['go-title'].textContent = why === 'cocoon' ? 'THE COCOON CRACKED' : 'BACK TO THE BURROW';
    ui['go-text'].textContent = why === 'cocoon' ? 'The bugs got to your chrysalis. Next time, puff them away sooner!' : 'The garden got a little too wild. Your next run starts with a fresh wiggle.';
    ui['gameover-overlay'].classList.add('show');
  }

  /* ---------- molt / cocoon / emerge / fly transitions */
  function startMolt(stage) {
    setPhase('molt'); moltStage = stage; moltBuilt = false; playerState.shielded = true; input.x = 0; input.z = 0; knob.style.transform = 'translate(0,0)';
    playSfx('sfx_molt'); hap('success'); ringFx(playerState.x, playerState.z, '#fff3a0', 14, 1.2); spawnParts(playerState.x, 1.2, playerState.z, 22, '#e9ff9a', 9, 1.1, .34, 6);
  }
  function startSpin() {
    setPhase('spin'); playerState.shielded = true; playerState.cocooning = true; input.x = 0; input.z = 0; knob.style.transform = 'translate(0,0)'; strike.active = false; strikeMark.visible = false; strikeRing.visible = false; strikeBird.visible = false;
    cocoon.visible = true; cocoon.scale.set(.05, .05, .05); playSfx('sfx_cocoon'); toast('Spinning silk…', 2.4); hap('success');
    banner('COCOON TIME', 'Spin tight — then defend it!', 2.6); playMusic('bgm_tense');
  }
  function startCocoonDefense() {
    setPhase('cocoon'); playerState.shielded = false; cocoonIntegrity = 100; playerVisual.visible = false; playerState.burstCooldown = 0;
    for (const e of enemies) {
      if (!e.active) { e.active = true; e.mesh.visible = true; e.pop = 0; }
      if (Math.hypot(e.x - playerState.x, e.z - playerState.z) < 42) { const a = lrand() * TAU, r = lrange(40, 58); e.x = clamp(playerState.x + Math.cos(a) * r, -142, 142); e.z = clamp(playerState.z + Math.sin(a) * r, -142, 142); e.mesh.position.set(e.x, 0, e.z); }
      e.stun = 0; e.mode = 'wander'; e.hold = lrange(0, 7);
    }
    strike.cd = 3; banner('DEFEND!', 'Puff the bugs away from your cocoon', 3); toast('Tap PUFF when they get close!', 2.6);
  }
  function startEmerge() {
    setPhase('emerge'); playerState.shielded = true; playSfx('sfx_emerge'); hap('success'); strike.active = false; strikeMark.visible = false; strikeRing.visible = false; strikeBird.visible = false;
    for (const e of enemies) { e.stun = 4; }
  }
  function startFly() {
    setPhase('fly'); playerState.shielded = false; playerState.cocooning = false; playerState.complete = true; flyT = 0; flyBonus = 0; stuns = 0; score = { combo: 0, score: 0, maxCombo: 0, lastPollenAt: null }; butterflyStun = 0; flyWarned = false;
    for (const e of enemies) { e.active = false; e.mesh.visible = false; } showPuddles(false);
    spawnFlowers(); spawnHunters(2); playMusic('bgm_butterfly'); banner('WINGS!', 'Chain pollen for combos — dodge the birds', 3.4); toast('Fly through the flowers!', 2.2);
    ui['score-big'].textContent = '0'; ui['combo-label'].textContent = 'COMBO ×1'; ui['combo-fill'].style.width = '0%';
  }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function renderBoard(r) {
    if (!r || !r.entries || !r.entries.length) { ui['res-board'].innerHTML = ''; return; }
    const rows = r.entries.slice(0, 5).map((e, i) => `<div><span>${i + 1}. ${esc(e.username || 'Gardener')}</span><b>${Number(e.score) || 0}</b></div>`).join('');
    ui['res-board'].innerHTML = `<div class="bh">🌍 TOP GARDENERS</div>${rows}${r.userRank ? `<div class="yr"><span>Your rank</span><b>#${r.userRank}</b></div>` : ''}`;
  }
  function postScore(final) {
    ui['res-board'].innerHTML = '<div class="bh">Posting your score…</div>';
    try { Promise.resolve(lib.addPlayerScoreToLeaderboard?.(final, 5)).then(renderBoard).catch(() => { ui['res-board'].innerHTML = ''; }); } catch (e) { ui['res-board'].innerHTML = ''; }
  }
  function finishRun() {
    setPhase('result'); stopMusic(0.5); playSfx('sting_win'); hap('success');
    const final = finalScore({ pollen: score.score, health: playerState.health, integrity: cocoonIntegrity }), stars = starRating(final), isBest = final > bestScore;
    if (isBest) { bestScore = final; saveBest(); }
    ui.stars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars); ui['res-score'].textContent = String(final);
    ui['res-grid'].innerHTML = `<div>Pollen <b>${score.score}</b></div><div>Best combo <b>×${comboMultiplier(score.maxCombo)}</b></div><div>Nibbles <b>${playerState.foodEaten}</b></div><div>Hearts <b>${playerState.health}</b></div><div>Cocoon <b>${Math.round(cocoonIntegrity)}%</b></div><div>Streak <b>${score.maxCombo}</b></div>`;
    ui['res-best'].textContent = isBest ? '🏆 NEW BEST SCORE!' : `Best: ${bestScore}`;
    postScore(final);
    ui['finish-overlay'].classList.add('show');
  }

  /* ---------- actions */
  function spawnBurst() {
    if (editMode || playerState.burstCooldown > 0) return;
    const inCocoon = phase === 'cocoon', inFly = phase === 'fly';
    if (!(phase === 'larva' || inCocoon || inFly)) return;
    const radius = inFly ? 22 : inCocoon ? 21 : abilities.burstRadius, push = inCocoon ? 14 : abilities.burstPush;
    playerState.burstCooldown = inFly ? 6 : inCocoon ? 2.6 : abilities.burstCooldown;
    if (inCocoon && strike.active && !strike.resolved) { strike.active = false; strike.flying = false; strike.cd = 4.5; strikeMark.visible = false; strikeRing.visible = false; strikeBird.visible = false; toast('Bird scared off!', 1.2); }
    if (inFly) {
      for (const h of hunters) if (Math.hypot(h.x - playerState.x, h.z - playerState.z) < radius * 1.4) { h.mode = 'flee'; h.fleeT = 3.2; }
    } else {
      const act = enemies.filter((e) => e.active), pushed = burstEnemies({ x: playerState.x, z: playerState.z }, act.map((e) => ({ x: e.x, z: e.z, stun: e.stun })), radius, push, inCocoon ? 3.6 : 2.1);
      if (boss.active && phase === 'larva') { const bd = Math.hypot(boss.x - playerState.x, boss.z - playerState.z); if (bossCanBeHit(boss.mode, bd)) setTimeout(() => { if (boss.active && boss.mode === 'rest') bossHit(); }, 0); else if (bd < 24 && !boss.early) { boss.early = true; toast('Too early! Puff it when it is dizzy ★', 1.8); } }
      act.forEach((e, i) => { const n = pushed[i]; if (n.knocked) { e.x = clamp(n.x, -144, 144); e.z = clamp(n.z, -144, 144); e.stun = n.stun; e.mode = 'recover'; e.modeT = 0; e.mesh.position.set(e.x, 0, e.z); } });
    }
    burstWave.visible = true; burstWave.scale.setScalar(1.2); burstWave.material.opacity = .86; burstWaveTimer = .52; burstWave.userData.max = radius;
    playSfx('sfx_burst'); hap('tap'); spawnParts(playerState.x, 1, playerState.z, 14, '#f6ffa6', 10, .8, .3, 3); updateHud();
    toast(inFly ? 'Puff! Birds scattered!' : 'FUZZ BURST! Shove those snack thieves!', 1.3);
  }
  function onTouchStart(e) {
    e.preventDefault(); ensureAudio(); stick.setPointerCapture?.(e.pointerId); input.pointerId = e.pointerId;
    const rect = stick.getBoundingClientRect(); input.pointerOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; updateStick(e.clientX, e.clientY);
  }
  function updateStick(cx, cy) {
    if (!input.pointerOrigin) return;
    const max = 58; let dx = cx - input.pointerOrigin.x, dy = cy - input.pointerOrigin.y; const len = Math.hypot(dx, dy); if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; const magnitude = Math.min(1, Math.hypot(dx, dy) / max);
    input.x = Math.abs(dx / max) < .12 ? 0 : dx / max * magnitude; input.z = Math.abs(dy / max) < .12 ? 0 : dy / max * magnitude;
  }
  const onTouchMove = (e) => { if (input.pointerId !== e.pointerId) return; e.preventDefault(); updateStick(e.clientX, e.clientY); };
  const onTouchEnd = (e) => { if (input.pointerId !== e.pointerId) return; input.pointerId = null; input.pointerOrigin = null; input.x = 0; input.z = 0; knob.style.transform = 'translate(0,0)'; };
  function getPointerWorld(e) {
    const rect = renderer.domElement.getBoundingClientRect(); pointerNdc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointerNdc, camera); const hit = new THREE.Vector3(); return raycaster.ray.intersectPlane(groundPlane, hit) ? hit : null;
  }
  const findEditorRoot = (object) => { let n = object; while (n && n !== scene) { if (n.userData?.editorId) return n; n = n.parent; } return null; };
  function onEditorDown(e) {
    if (!editMode || e.target !== renderer.domElement) return;
    const rect = renderer.domElement.getBoundingClientRect(); pointerNdc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1); raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.intersectObjects(editorPickables, true).find((item) => findEditorRoot(item.object)); if (!hit) return;
    const group = findEditorRoot(hit.object); selectedId = group.userData.editorId; dragId = selectedId; updateSelectedUI(); renderer.domElement.setPointerCapture?.(e.pointerId); e.preventDefault();
  }
  function onEditorMove(e) {
    if (!editMode || !dragId) return; const pos = getPointerWorld(e); if (!pos) return;
    const group = editorPickables.find((g) => g.userData.editorId === dragId); if (!group) return;
    const x = clamp(pos.x, -144, 144), z = clamp(pos.z, -144, 144);
    if (!group.matrixAutoUpdate) group.matrixAutoUpdate = true; group.position.x = x; group.position.z = z; window.gameConfig.editorPositions[dragId] = [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
    if (dragId === 'player_start') { playerState.x = x; playerState.z = z; }
  }
  const onEditorUp = () => { dragId = null; };
  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(e.key)) e.preventDefault();
    ensureAudio(); input.keys.add(e.key.toLowerCase());
    if ((e.key === ' ' || e.key.toLowerCase() === 'x') && !e.repeat) { if (phase === 'start') startGame(); else spawnBurst(); }
    if (e.key === 'Enter' && !e.repeat) { if (phase === 'start') startGame(); else if (phase === 'result') newRun(false); else if (phase === 'dead') newRun(false); }
    if (e.key.toLowerCase() === 'm' && !e.repeat) { setMuted(!audio.muted); refreshSoundBtn(); }
  }
  listen(stick, 'pointerdown', onTouchStart); listen(stick, 'pointermove', onTouchMove); listen(stick, 'pointerup', onTouchEnd); listen(stick, 'pointercancel', onTouchEnd);
  listen(ui['burst-button'], 'click', () => { ensureAudio(); spawnBurst(); });
  listen(root.querySelector('#start-button'), 'click', startGame);
  listen(root.querySelector('#again-button'), 'click', () => { ensureAudio(); playSfx('sfx_click'); newRun(false); });
  listen(root.querySelector('#retry-button'), 'click', () => { ensureAudio(); playSfx('sfx_click'); newRun(false); });
  listen(root.querySelector('#rebuild-button'), 'click', () => window.run('edit'));
  listen(ui['sound-btn'], 'click', () => { ensureAudio(); setMuted(!audio.muted); refreshSoundBtn(); if (!audio.muted) playSfx('sfx_click'); });
  listen(window, 'keydown', onKeyDown); listen(window, 'keyup', (e) => input.keys.delete(e.key.toLowerCase()));
  listen(renderer.domElement, 'pointerdown', onEditorDown); listen(renderer.domElement, 'pointermove', onEditorMove); listen(renderer.domElement, 'pointerup', onEditorUp); listen(renderer.domElement, 'pointercancel', onEditorUp);
  // The UI is designed for Astrocade's 720px-wide frame; on anything narrower, scale the HUD and overlays down to fit.
  function applyUiScale() {
    const k = Math.min(1, window.innerWidth / 720);
    for (const el of root.querySelectorAll('.hud,.start-overlay,.finish-overlay,.gameover-overlay')) {
      el.style.inset = 'auto'; el.style.left = '0'; el.style.top = '0'; el.style.width = `${window.innerWidth / k}px`; el.style.height = `${window.innerHeight / k}px`;
      el.style.transformOrigin = '0 0'; el.style.transform = k < 1 ? `scale(${k})` : 'none';
    }
  }
  applyUiScale();
  listen(window, 'resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); applyUiScale(); });
  if (!editMode) { ui['start-overlay'].classList.add('show'); loadBest(); } else { root.querySelector('#editor-badge').textContent = 'EDITOR · TAP & DRAG OBJECTS'; updateSelectedUI(); }
  refreshSoundBtn();

  /* ---------- per-frame systems */
  function readKeys() {
    if (input.keys.has('a') || input.keys.has('arrowleft')) input.x = -1; else if (input.keys.has('d') || input.keys.has('arrowright')) input.x = 1; else if (input.pointerId === null && !testInput) input.x = 0;
    if (input.keys.has('w') || input.keys.has('arrowup')) input.z = -1; else if (input.keys.has('s') || input.keys.has('arrowdown')) input.z = 1; else if (input.pointerId === null && !testInput) input.z = 0;
    if ((input.x || input.z) && !hintHidden) { hintHidden = true; ui['control-hint'].style.opacity = '0'; }
  }
  function moveHero(dt, speed, allow = true, solid = false) {
    const prevX = playerState.x, prevZ = playerState.z;
    if (!allow) { playerState.invulnerable = Math.max(0, playerState.invulnerable - dt); playerState.burstCooldown = Math.max(0, playerState.burstCooldown - dt); return; }
    Object.assign(playerState, movePlayer(playerState, { x: input.x, z: input.z }, dt, speed, 144));
    if (solid) { const q = slideAroundCircles({ x: prevX, z: prevZ }, { x: playerState.x, z: playerState.z }, obstacles, .9); playerState.x = clamp(q.x, -144, 144); playerState.z = clamp(q.z, -144, 144); }
    player.position.set(playerState.x, 0, playerState.z);
    const vx = playerState.x - prevX, vz = playerState.z - prevZ; lastMove = { x: vx / Math.max(dt, .001), z: vz / Math.max(dt, .001) };
    if (Math.hypot(vx, vz) > .001) player.rotation.y = Math.atan2(-vx, -vz);
  }
  function animateCaterpillar() {
    playerVisual.position.y = Math.sin(simTime * 5) * .07;
    for (let i = 0; i < caterpillarParts.length; i++) caterpillarParts[i].mesh.position.y = caterpillarParts[i].y + Math.sin(simTime * 6 - i * .7) * .055;
    const sizeFactor = savedSettings.caterpillarScale * (1 + playerState.energy / 100 * .22 + playerState.stage * .06);
    playerVisual.scale.set(sizeFactor * 1.8, sizeFactor, sizeFactor);
  }
  function updateFood(dt, allowEat) {
    for (const p of food) {
      if (!p.active) { if (simTime >= p.respawnAt && p.respawnAt > 0) { const [x, z] = flowerSpot(playerState.x, playerState.z); p.x = x; p.z = z; p.mesh.position.set(x, 0, z); p.mesh.visible = true; p.active = true; p.mesh.scale.setScalar(.01); p.pop = 0; } continue; }
      if (p.pop !== undefined && p.pop < 1) { p.pop = Math.min(1, p.pop + dt * 2.5); p.mesh.scale.setScalar(Math.max(.01, p.pop)); } else if (p.mesh.scale.x !== 1) p.mesh.scale.setScalar(1);
      p.mesh.position.y = .02 + Math.sin(simTime * 2.3 + p.mesh.userData.floatSeed) * .08; p.mesh.rotation.y += dt * .36;
      if (!allowEat) continue;
      if (Math.hypot(p.x - playerState.x, p.z - playerState.z) < abilities.magnet) {
        p.active = false; p.mesh.visible = false; p.respawnAt = simTime + 26;
        const before = playerState.stage, amount = FOOD_ENERGY[p.kind];
        Object.assign(playerState, addNourishment(playerState, amount)); hap('success');
        playSfx(p.kind === 'golden' ? 'sfx_golden' : p.kind === 'nectar' ? 'sfx_nectar' : 'sfx_eat', 1, 0.95 + lrand() * .12);
        floatText(`+${Math.round(amount)}`, p.x, p.z); spawnParts(p.x, .8, p.z, p.kind === 'golden' ? 12 : 6, p.kind === 'nectar' ? '#ffbd64' : p.kind === 'golden' ? '#ffe36b' : '#c8f26b', 5, .7, .22, 3);
        playerState.energy = capEnergyForBoss(playerState.energy, boss.done); playerState.stage = growthStage(playerState.energy);
        updateHud();
        if (bossShouldAppear(playerState, boss.active, boss.done)) { startBoss(); return; }
        if (canBeginCocoon(playerState)) { startSpin(); return; }
        if (playerState.stage > before && playerState.stage <= 2) { startMolt(playerState.stage); return; }
      }
    }
  }
  function enemyBrain(e, dt, target, dangerMul, chaseAll) {
    const d = Math.hypot(target.x - e.x, target.z - e.z), sf = enemySpeedFactor(playerState.stage) * (wild ? 1.25 : 1) * dangerMul;
    e.phase += dt; e.stun = Math.max(0, e.stun - dt); e.modeT += dt;
    if (e.pop < 1) { e.pop = Math.min(1, e.pop + dt * 1.6); e.mesh.scale.setScalar(Math.max(.01, e.pop)); }
    let dx = 0, dz = 0, speed = 0;
    if (e.stun > 0) { if (e.tele) e.tele.material.opacity = 0; return d; }
    if (e.hold > 0) { e.hold -= dt; e.x = clamp(e.x + Math.sin(e.phase * .75) * .42 * dt, -143, 143); e.z = clamp(e.z + Math.cos(e.phase * .61) * .42 * dt, -143, 143); e.mesh.position.set(e.x, 0.04, e.z); return d; }
    if (e.kind === 'spider') {
      const aggro = chaseAll ? 200 : 20 + playerState.stage * 3;
      if (e.mode === 'wander') {
        if (chaseAll && d > 5) { dx = (target.x - e.x) / d; dz = (target.z - e.z) / d; speed = 6.4 * sf; }
        else if (d < aggro && !playerState.shielded) { e.mode = 'windup'; e.modeT = 0; e.dirX = (target.x - e.x) / Math.max(d, .01); e.dirZ = (target.z - e.z) / Math.max(d, .01); playSfx('sfx_warning', .5); }
        else { dx = Math.sin(e.phase * .75) * .42; dz = Math.cos(e.phase * .61) * .42; speed = 1.0; }
      } else if (e.mode === 'windup') {
        if (e.tele) e.tele.material.opacity = .25 + Math.sin(e.modeT * 30) * .15; dx = 0; dz = 0;
        e.dirX = lerp(e.dirX, (target.x - e.x) / Math.max(d, .01), .08); e.dirZ = lerp(e.dirZ, (target.z - e.z) / Math.max(d, .01), .08);
        if (e.modeT > .6) { e.mode = 'lunge'; e.modeT = 0; if (e.tele) e.tele.material.opacity = 0; }
      } else if (e.mode === 'lunge') { dx = e.dirX; dz = e.dirZ; speed = 20 * Math.min(1.2, sf); if (e.modeT > .8) { e.mode = 'recover'; e.modeT = 0; } }
      else if (e.mode === 'recover') { if (e.tele) e.tele.material.opacity = 0; speed = 0; if (e.modeT > 1.7) { e.mode = 'wander'; e.modeT = 0; } }
    } else {
      const aggro = chaseAll ? 200 : 24 + playerState.stage * 6;
      if (d < aggro && !playerState.shielded && d > (chaseAll ? 3 : 0)) { dx = (target.x - e.x) / Math.max(d, .01); dz = (target.z - e.z) / Math.max(d, .01); speed = 7.4 * sf; }
      else if (!chaseAll) { dx = Math.sin(e.phase * .75) * .42; dz = Math.cos(e.phase * .61) * .42; speed = .9; }
    }
    if (speed > 0) {
      const prevEX = e.x, prevEZ = e.z;
      e.x += dx * speed * dt; e.z += dz * speed * dt; const edge = clampPosition(e.x, e.z, 143); e.x = edge.x; e.z = edge.z;
      const bump = slideAroundCircles({ x: prevEX, z: prevEZ }, { x: e.x, z: e.z }, obstacles, .8); e.x = bump.x; e.z = bump.z;
      if (Math.hypot(dx, dz) > .1) e.mesh.rotation.y = Math.atan2(-dx, -dz);
    }
    e.mesh.position.set(e.x, Math.abs(Math.sin(simTime * 8 + e.phase)) * .08, e.z);
    return d;
  }
  function updateStrike(dt, interval, target) {
    if (!strike.active) {
      strike.cd -= dt;
      if (strike.cd <= 0) {
        const aim = phase === 'cocoon' ? { x: playerState.x + lrange(-3, 3), z: playerState.z + lrange(-3, 3) } : { x: playerState.x + lastMove.x * 1.0 + lrange(-2.5, 2.5), z: playerState.z + lastMove.z * 1.0 + lrange(-2.5, 2.5) };
        const p = clampPosition(aim.x, aim.z, 142); strike.x = p.x; strike.z = p.z; strike.active = true; strike.t = 0; strike.resolved = false; strike.r = phase === 'cocoon' ? 7 : 6.3;
        strikeMark.visible = true; strikeRing.visible = true; strikeMark.position.set(strike.x, .12, strike.z); strikeRing.position.set(strike.x, .16, strike.z); strikeMark.scale.setScalar(strike.r); strikeRing.scale.setScalar(strike.r);
        playSfx('sfx_warning', .7); strike.cd = interval;
      }
      return false;
    }
    strike.t += dt; const warn = 1.7, t = strike.t;
    strikeMark.material.opacity = .18 + .22 * Math.min(1, t / warn) + Math.sin(t * 22) * .05; strikeRing.scale.setScalar(strike.r * (1.15 - .15 * Math.min(1, t / warn)));
    let hit = false;
    if (t > warn - .35 && t < warn + .7) { strikeBird.visible = true; const q = t < warn ? (t - (warn - .35)) / .35 : 1 - (t - warn) / .7; strikeBird.position.set(strike.x, lerp(34, 1.5, clamp(q, 0, 1)), strike.z); strikeBird.rotation.set(t < warn ? .9 : -.6, 0, 0); strikeBird.userData.wings.forEach((w) => { w.mesh.rotation.z = Math.sin(t * 30) * .5 * w.side; }); if (t >= warn - .35 && !strike.flying) { strike.flying = true; playSfx('sfx_bird', .8); } }
    if (!strike.resolved && t >= warn) {
      strike.resolved = true; ringFx(strike.x, strike.z, '#ffb27a', strike.r * 1.1, .6); spawnParts(strike.x, .6, strike.z, 12, '#c9a46b', 9, .7, .3, 5); addShake(.7);
      if (Math.hypot(target.x - strike.x, target.z - strike.z) < strike.r) hit = true;
    }
    if (t > warn + .7) { strike.active = false; strike.flying = false; strikeMark.visible = false; strikeRing.visible = false; strikeBird.visible = false; }
    return hit;
  }
  function hurtPlayer(srcX, srcZ, label) {
    const hit = takeHit(playerState); if (!hit.hit) return;
    Object.assign(playerState, hit); const d = Math.hypot(playerState.x - srcX, playerState.z - srcZ), n = d > .01 ? 1 / d : 1;
    playerState.x = clamp(playerState.x + (playerState.x - srcX) * n * 3, -144, 144); playerState.z = clamp(playerState.z + (playerState.z - srcZ) * n * 3, -144, 144); player.position.set(playerState.x, 0, playerState.z);
    hap('thud'); playSfx('sfx_hit'); addShake(1.2); spawnParts(playerState.x, 1, playerState.z, 8, '#ff9a8a', 7, .6, .26, 3); floatText('-1 ♥', playerState.x, playerState.z, true); toast(label || 'Ouch! Puff them away!', 1.25); updateHud();
    if (playerState.health <= 0) gameOver('hp');
  }

  /* ---------- boss fight */
  const bossBar = () => { ui['boss-fill'].style.width = `${boss.hp / BOSS.hp * 100}%`; ui['boss-hits'].textContent = `${'♥'.repeat(boss.hp)}`; };
  function startBoss() {
    boss.active = true; boss.done = false; boss.hp = BOSS.hp; boss.life = 0; boss.mode = 'enter'; boss.t = 0; boss.pop = 0; boss.tele = false; boss.early = false;
    const a = lrand() * TAU, c = clampPosition(playerState.x + Math.cos(a) * 42, playerState.z + Math.sin(a) * 42, 138); boss.x = c.x; boss.z = c.z;
    for (const e of enemies) if (e.active) { spawnParts(e.x, 1, e.z, 4, '#ffffff', 6, .6, .25, 3); e.active = false; e.mesh.visible = false; }
    strike.active = false; strike.cd = 7; strikeMark.visible = false; strikeRing.visible = false; strikeBird.visible = false;
    toad.visible = true; toad.position.set(boss.x, 0, boss.z); toad.scale.setScalar(.01);
    ui.bossbar.classList.add('show'); ui['boss-sub'].textContent = 'Dodge, then PUFF it while it is dizzy!'; bossBar();
    banner('BOSS', 'The Giant Toad guards the last leaves!', 3.8); toast('Dodge the red zones. PUFF when it is dizzy!', 3.2);
    playSfx('sfx_toad'); hap('thud'); ringFx(boss.x, boss.z, '#7bd95a', 22, 1.2); playMusic('bgm_tense');
  }
  function bossPick(d) {
    boss.t = 0; boss.tele = true;
    if (d > 22 || lrand() < .55) {
      let tx = playerState.x + lastMove.x * .6, tz = playerState.z + lastMove.z * .6; const dd = Math.hypot(tx - boss.x, tz - boss.z);
      if (dd > 28) { tx = boss.x + (tx - boss.x) / dd * 28; tz = boss.z + (tz - boss.z) / dd * 28; }
      const c = clampPosition(tx, tz, 140); boss.tx = c.x; boss.tz = c.z; boss.sx = boss.x; boss.sz = boss.z; boss.mode = 'hop-wind';
      landMark.position.set(boss.tx, .13, boss.tz); landMark.scale.setScalar(BOSS.hopRadius); landMark.visible = true;
    } else { boss.mode = 'lash-wind'; lashMark.visible = true; }
    playSfx('sfx_warning', .6);
  }
  function bossDefeat(fought) {
    boss.mode = 'dead'; boss.t = 0; boss.tele = false; boss.done = true; landMark.visible = false; lashMark.visible = false; toad.userData.tongue.visible = false; toad.userData.stars.forEach((st) => { st.visible = false; });
    playerState.shielded = true; ui.bossbar.classList.remove('show');
    if (fought) {
      playSfx('sfx_golden'); playSfx('sfx_molt', .7); hap('success'); flash(.5, 320); addShake(2);
      spawnParts(boss.x, 3, boss.z, 34, '#ffe36b', 14, 1.4, .42, 9); ringFx(boss.x, boss.z, '#ffe36b', 26, 1.1); banner('TOAD DEFEATED', 'The last leaves are yours!', 3);
    } else { toast('The toad got bored and hopped away…', 2.6); }
  }
  function bossHit() {
    boss.hp = Math.max(0, boss.hp - 1); bossBar(); playSfx('sfx_hit'); playSfx('sfx_toad', .5, 1.25); hap('thud'); addShake(1.6);
    spawnParts(boss.x, 4, boss.z, 16, '#fff3a0', 10, .8, .34, 6); floatText(boss.hp > 0 ? `TOAD HIT! ${boss.hp} left` : 'FINAL HIT!', boss.x, boss.z);
    const dx = boss.x - playerState.x, dz = boss.z - playerState.z, d = Math.hypot(dx, dz) || 1; boss.x = clamp(boss.x + dx / d * 7, -140, 140); boss.z = clamp(boss.z + dz / d * 7, -140, 140);
    if (boss.hp <= 0) bossDefeat(true);
    else {
      boss.mode = 'hurt'; boss.t = 0;
      if (boss.hp === 1) { ui['boss-sub'].textContent = 'It is ENRAGED! One more puff!'; if (playerState.health < 3) { playerState.health++; updateHud(); toast('Toad enraged! +1 heart', 2); } else toast('Toad enraged! Faster attacks!', 2); }
      else ui['boss-sub'].textContent = 'Nice! Dodge again…';
    }
  }
  function updateBoss(dt) {
    boss.life += dt; boss.t += dt;
    const P = playerState, tm = bossTimings(boss.hp), dx = P.x - boss.x, dz = P.z - boss.z, d = Math.hypot(dx, dz) || .01, ud = toad.userData;
    const face = () => { boss.ry = Math.atan2(-dx, -dz); };
    let y = 0, sq = 1;
    ud.stars.forEach((st) => { st.visible = boss.mode === 'rest'; });
    switch (boss.mode) {
      case 'enter': boss.pop = Math.min(1, boss.pop + dt * 1.3); face(); if (boss.t > 1.5) { boss.mode = 'idle'; boss.t = 0; } break;
      case 'idle': face(); sq = 1 + Math.sin(simTime * 4) * .03; if (boss.t > .85) { if (boss.life > BOSS.giveUpAfter) bossDefeat(false); else bossPick(d); } break;
      case 'hop-wind': { face(); const w = Math.min(1, boss.t / tm.windup); y = -w * .5; sq = 1 - w * .22; landMark.material.opacity = .32 + .26 * w + Math.sin(boss.t * 24) * .06; if (boss.t >= tm.windup) { boss.mode = 'hop-air'; boss.t = 0; playSfx('sfx_toad', .7); } break; }
      case 'hop-air': {
        const u = Math.min(1, boss.t / .7); boss.x = lerp(boss.sx, boss.tx, u); boss.z = lerp(boss.sz, boss.tz, u); y = Math.sin(Math.PI * u) * 11; sq = 1 + Math.sin(Math.PI * u) * .14;
        boss.ry = Math.atan2(-(boss.tx - boss.sx), -(boss.tz - boss.sz));
        if (u >= 1) {
          landMark.visible = false; boss.tele = false; ringFx(boss.x, boss.z, '#c9a46b', BOSS.hopRadius * 1.2, .7); spawnParts(boss.x, .6, boss.z, 14, '#c9a46b', 10, .8, .34, 6); addShake(2.4); playSfx('sfx_slam'); hap('thud');
          boss.mode = 'rest'; boss.t = 0; if (Math.hypot(P.x - boss.x, P.z - boss.z) < BOSS.hopRadius) hurtPlayer(boss.x, boss.z, 'Toad slam!');
        }
        break;
      }
      case 'lash-wind': {
        const w = Math.min(1, boss.t / tm.lash); if (boss.t < tm.lash - .25) face(); sq = 1 + w * .1;
        lashMark.position.set(boss.x, .14, boss.z); lashMark.rotation.y = boss.ry; lashMark.scale.set(BOSS.lashWidth, 1, BOSS.lashLength); lashMark.material.opacity = .34 + .3 * w + Math.sin(boss.t * 26) * .06;
        if (boss.t >= tm.lash) { boss.mode = 'lash'; boss.t = 0; lashMark.visible = false; boss.tele = false; playSfx('sfx_tongue'); if (lashHits({ x: boss.x, z: boss.z }, boss.ry, P)) hurtPlayer(boss.x, boss.z, 'Tongue lash!'); }
        break;
      }
      case 'lash': { const len = BOSS.lashLength * Math.min(1, boss.t / .1); ud.tongue.visible = true; ud.tongue.scale.set(10, len, 10); ud.tongue.position.set(0, 2.5, -4.6 - len / 2); if (boss.t > .35) { ud.tongue.visible = false; boss.mode = 'rest'; boss.t = 0; } break; }
      case 'rest': {
        sq = .92 + Math.sin(simTime * 10) * .02;
        ud.stars.forEach((st, i) => { const a = simTime * 4 + i * 2.1; st.position.set(Math.cos(a) * 2, 6.3 + Math.sin(simTime * 6 + i) * .2, Math.sin(a) * 2 - 2.8); });
        if (boss.t > tm.rest) { boss.mode = 'idle'; boss.t = 0; }
        break;
      }
      case 'hurt': sq = 1 + Math.sin(boss.t * 40) * .1; if (boss.t > 1.0) { boss.mode = 'idle'; boss.t = 0; } break;
      case 'dead': {
        const u = Math.min(1, boss.t / 1.6); sq = 1 - u * .6; y = u * 3; boss.pop = Math.max(.01, 1 - u); toad.rotation.z = u * .8;
        if (Math.floor(boss.t * 10) !== Math.floor((boss.t - dt) * 10)) spawnParts(boss.x, 3, boss.z, 3, '#ffe36b', 8, .8, .3, 6);
        if (boss.t >= 1.8) { boss.active = false; toad.visible = false; toad.rotation.z = 0; playerState.energy = 100; playerState.stage = 3; updateHud(); startSpin(); }
        break;
      }
      default: break;
    }
    toad.position.set(boss.x, y, boss.z); toad.rotation.y = boss.ry; toad.scale.set(boss.pop, boss.pop * sq, boss.pop);
  }

  /* ---------- phases */
  function updateLarva(dt) {
    readKeys();
    inPuddle = false;
    for (const p of puddles) if (p.shown && Math.hypot(playerState.x - p.x, playerState.z - p.z) < p.r) inPuddle = true;
    moveHero(dt, abilities.speed * (inPuddle ? .5 : 1), true, true); animateCaterpillar();
    if (inPuddle) { toxic += dt; if (!poisonWarned) { poisonWarned = true; toast('Poison puddle! Get out!', 1.6); } if (toxic > 2.2) { toxic = 0; hurtPlayer(playerState.x + 1, playerState.z, 'Poisoned!'); } } else toxic = Math.max(0, toxic - dt * .5);
    updateFood(dt, !boss.active); if (phase !== 'larva') return;
    if (boss.active) updateBoss(dt);
    if (phase !== 'larva') return;
    let danger = false;
    for (const e of enemies) {
      if (!e.active) continue;
      const d = enemyBrain(e, dt, playerState, 1, false); if (d < 30) danger = true;
      if (d < 2.85 && e.stun <= 0) { const before = playerState.health; hurtPlayer(e.x, e.z); if (playerState.health < before) { e.x = clamp(e.x - (playerState.x - e.x) * .8, -144, 144); e.z = clamp(e.z - (playerState.z - e.z) * .8, -144, 144); if (e.kind === 'spider') { e.mode = 'recover'; e.modeT = 0; } } }
      if (phase !== 'larva') return;
    }
    if (playerState.stage >= 1) { if (updateStrike(dt, boss.active ? 9 : playerState.stage >= 2 ? 4.3 : 6.8, playerState)) hurtPlayer(strike.x, strike.z, 'Bird strike!'); if (strike.active) danger = true; }
    ui['danger-alert'].textContent = strike.active && strike.t < 1.7 ? '⚠ BIRD ABOVE! MOVE!' : boss.active && boss.tele ? '⚠ TOAD ATTACK! MOVE!' : inPuddle ? '☠ POISON!' : '⚠ DANGER NEARBY'; ui['danger-alert'].classList.toggle('show', danger || inPuddle || (boss.active && boss.tele));
    updateHud();
  }
  function updateMolt(dt) {
    phaseT += dt; playerVisual.rotation.y += dt * 9; const k = 1 + Math.sin(phaseT * 6) * .08; playerVisual.scale.multiplyScalar(k);
    for (const e of enemies) if (e.active) e.phase += dt;
    if (!moltBuilt && phaseT > .9) {
      moltBuilt = true; buildCaterpillar(moltStage); abilities = abilitiesForStage(moltStage); showPuddles(moltStage >= 1);
      spawnParts(playerState.x, 1.4, playerState.z, 26, '#fff3a0', 10, 1.1, .36, 7); ringFx(playerState.x, playerState.z, '#c8f26b', 18, 1.0); flash(.35, 260); playSfx('sfx_molt', .6);
    }
    if (phaseT >= 2.0) {
      playerVisual.rotation.y = 0; playerState.shielded = false; playerState.invulnerable = 1.6; playerState.health = Math.min(3, playerState.health + 1); updateHud(); activateEnemies(moltStage);
      const act = enemies.filter((e) => e.active), pushed = burstEnemies({ x: playerState.x, z: playerState.z }, act.map((e) => ({ x: e.x, z: e.z, stun: e.stun })), 18, 14, 1.6);
      act.forEach((e, i) => { if (pushed[i].knocked) { e.x = clamp(pushed[i].x, -144, 144); e.z = clamp(pushed[i].z, -144, 144); e.stun = pushed[i].stun; e.mesh.position.set(e.x, 0, e.z); } });
      setPhase('larva'); strike.cd = 3; hintHidden = true;
      if (moltStage === 1) { banner('CHAPTER 2', 'Leaf Lumberer — spiders wake, birds circle', 3.6); toast('MOLT! +1 heart · bigger puff', 2.4); playMusic('bgm_tense'); }
      else { banner('CHAPTER 3', 'Plump & Prickly — night falls', 3.6); toast('MOLT! +1 heart · faster · wider magnet', 2.6); }
    }
  }
  function updateSpin(dt) {
    phaseT += dt; const p = clamp(phaseT / 2.6, 0, 1);
    player.rotation.y += dt * (6 + p * 8); const sc = Math.max(0.001, 1 - p * 1.3); playerVisual.scale.setScalar(Math.max(.001, sc * 1.4)); playerVisual.visible = p < .75;
    cocoon.scale.set((.82 + Math.sin(phaseT * 7) * .03) * Math.min(1, p * 1.5), (1.24 + Math.sin(phaseT * 7) * .05) * Math.min(1, p * 1.5), (.78 + Math.sin(phaseT * 7) * .03) * Math.min(1, p * 1.5));
    if (Math.floor(phaseT * 5) !== Math.floor((phaseT - dt) * 5)) { ringFx(playerState.x, playerState.z, '#fff2b0', 4 + p * 4, .7, .9); spawnParts(playerState.x, 1.2, playerState.z, 3, '#fff2b0', 4, .8, .2, 2); }
    for (const e of enemies) if (e.active) enemyBrain(e, dt, playerState, .6, false);
    moveHero(dt, 0, false);
    if (phaseT >= 2.6) { player.rotation.y = 0; startCocoonDefense(); }
  }
  const COCOON_SECONDS = 20;
  function updateCocoon(dt) {
    phaseT += dt; moveHero(dt, 0, false);
    const wob = Math.sin(simTime * 3) * .04 + (cocoonIntegrity < 45 ? Math.sin(simTime * 25) * .03 : 0);
    cocoon.scale.set(.82 + wob, 1.24 + wob * 1.5, .78 + wob); cocoon.rotation.z = Math.sin(simTime * 2.4) * .04;
    mats.cocoon.emissiveIntensity = .15 + (1 - cocoonIntegrity / 100) * .5; mats.cocoon.color.set(cocoonIntegrity > 55 ? '#efc75f' : cocoonIntegrity > 25 ? '#e0a64a' : '#c97a42');
    let drained = 0;
    for (const e of enemies) {
      if (!e.active) continue;
      const d = enemyBrain(e, dt, playerState, 1.15, true), stunned = e.stun > 0;
      if (d < 4.4 && !stunned) { drained += cocoonDrain(e.kind, false); }
    }
    if (drained > 0) { cocoonIntegrity = Math.max(0, cocoonIntegrity - drained * dt); if (Math.random() < dt * 3) spawnParts(playerState.x, 1.3, playerState.z, 2, '#ffb27a', 5, .5, .2, 2); }
    if (updateStrike(dt, 5.5, playerState)) { cocoonIntegrity = Math.max(0, cocoonIntegrity - 8); hap('thud'); playSfx('sfx_hit'); addShake(1.2); floatText('-8%', playerState.x, playerState.z, true); toast('The cocoon shook!', 1.1); }
    ui['danger-alert'].classList.toggle('show', drained > 0 || strike.active);
    ui['danger-alert'].textContent = strike.active && strike.t < 1.7 ? '⚠ BIRD ABOVE!' : '⚠ BUGS AT THE COCOON!';
    ui['cocoon-fill'].style.width = `${cocoonIntegrity}%`; ui['cocoon-time'].textContent = `${Math.max(0, Math.ceil(COCOON_SECONDS - phaseT))}s`;
    ui['cocoon-sub'].textContent = strike.active && !strike.resolved ? 'PUFF now to scare the bird!' : drained > 0 ? 'Bugs are chewing! PUFF!' : 'Puff the bugs away!';
    updateHud();
    if (cocoonIntegrity <= 0) { ui['danger-alert'].classList.remove('show'); gameOver('cocoon'); return; }
    if (phaseT >= COCOON_SECONDS) { ui['danger-alert'].classList.remove('show'); startEmerge(); }
  }
  function updateEmerge(dt) {
    phaseT += dt; moveHero(dt, 0, false);
    for (const e of enemies) if (e.active) { e.stun = 5; }
    if (phaseT < 1.3) { cocoon.rotation.z = Math.sin(phaseT * 40) * .09 * phaseT; cocoon.scale.set(.82 + phaseT * .07, 1.24 + phaseT * .05, .78 + phaseT * .07); mats.cocoon.emissiveIntensity = .3 + phaseT * .8; if (Math.floor(phaseT * 8) !== Math.floor((phaseT - dt) * 8)) spawnParts(playerState.x, 1.2, playerState.z, 3, '#fff2b0', 6, .7, .2, 3); }
    if (phaseT >= 1.3 && !playerVisual.userData.born) {
      playerVisual.userData.born = true; cocoon.visible = false; cocoon.rotation.z = 0; mats.cocoon.emissiveIntensity = .15; mats.cocoon.color.set('#efc75f'); buildButterfly(); playerVisual.visible = true; playerVisual.scale.setScalar(1.25);
      flash(.8, 420); spawnParts(playerState.x, 1.2, playerState.z, 40, '#fff0a0', 14, 1.4, .4, 8); ringFx(playerState.x, playerState.z, '#ffe58a', 22, 1.2); ringFx(playerState.x, playerState.z, '#ffffff', 14, .8); banner('WINGS!', 'Metamorphosis complete', 2.6); hap('success');
    }
    if (playerVisual.userData.born) {
      const u = clamp((phaseT - 1.3) / 1.6, 0, 1), eo = 1 - Math.pow(1 - u, 3);
      for (const p of butterflyParts) { p.mesh.scale.set(Math.max(.02, p.base[0] * eo), p.base[1], p.base[2]); p.mesh.position.x = p.side * lerp(.12, Math.abs(p.px), eo); p.mesh.rotation.z = Math.sin(phaseT * 12 + p.phase) * .35 * p.side * (1 - u * .4); }
      playerVisual.position.y = eo * .5 + Math.sin(phaseT * 8) * .12;
    }
    if (phaseT >= 3.3) { playerVisual.userData.born = false; startFly(); }
  }
  function updateFly(dt) {
    readKeys(); flyT += dt; butterflyStun = Math.max(0, butterflyStun - dt);
    const speed = 17 * (butterflyStun > 0 ? .4 : 1); moveHero(dt, speed);
    playerVisual.position.y = .5 + Math.sin(simTime * 8) * .17;
    for (const p of butterflyParts) p.mesh.rotation.z = Math.sin(simTime * 11 + p.phase) * .5 * p.side;
    if (butterflyStun > 0) playerVisual.visible = Math.floor(simTime * 14) % 2 === 0; else playerVisual.visible = true;
    atmo.night = Math.max(0, atmo.night - dt * .5); atmo.sunset = clamp(flyT / flightSeconds, 0, 1) * .95;
    if (score.combo > 0 && !comboAlive(score, flyT)) { score.combo = 0; }
    for (const f of flowers) {
      if (!f.active) { if (flyT >= f.respawnAt) { const [x, z] = flowerSpot(playerState.x, playerState.z); f.x = x; f.z = z; f.mesh.position.set(x, 0, z); f.golden = lrand() < .08; f.mesh.visible = true; f.active = true; f.mesh.scale.setScalar(.01); f.pop = 0; } continue; }
      if (f.pop !== undefined && f.pop < 1) { f.pop = Math.min(1, f.pop + dt * 2.4); f.mesh.scale.setScalar(Math.max(.01, f.pop)); }
      f.mesh.children[1].position.y = 2.15 + Math.sin(simTime * 3 + f.mesh.userData.seed) * .12; f.mesh.rotation.y += dt * .5;
      if (Math.hypot(f.x - playerState.x, f.z - playerState.z) < 3.7) {
        f.active = false; f.mesh.visible = false; f.respawnAt = flyT + 9;
        score = registerPollen(score, f.golden ? 50 : 10, flyT); playSfx(f.golden ? 'sfx_golden' : 'sfx_pollen', 1, 0.9 + Math.min(.5, score.combo * .035));
        floatText(`+${score.gained}${comboMultiplier(score.combo) > 1 ? ` ×${comboMultiplier(score.combo)}` : ''}`, f.x, f.z); spawnParts(f.x, 2, f.z, f.golden ? 14 : 7, f.golden ? '#ffe36b' : '#ffd1e6', 6, .8, .24, 4); hap('tap');
        if (f.golden) { const shift = Math.min(3, flyT, FLIGHT_BONUS_CAP - flyBonus); if (shift > 0) { flyBonus += shift; flyT -= shift; if (score.lastPollenAt != null) score.lastPollenAt -= shift; toast('Golden flower! +3 seconds', 1.3); } else toast('Golden flower! +50', 1.1); }
      }
    }
    let near = false; const targetN = flyT > flightSeconds * .45 ? 3 : 2; spawnHunters(targetN);
    for (const h of hunters) {
      h.wing += dt * 14; let tx = playerState.x + lastMove.x * .45, tz = playerState.z + lastMove.z * .45, sp = 12.2 + (flyT / flightSeconds) * 3.2;
      if (h.mode === 'flee') { h.fleeT -= dt; tx = h.x + (h.x - playerState.x); tz = h.z + (h.z - playerState.z); sp *= 1.05; if (h.fleeT <= 0) h.mode = 'chase'; }
      const dx = tx - h.x, dz = tz - h.z, d = Math.max(.01, Math.hypot(dx, dz)); h.x = clamp(h.x + dx / d * sp * dt, -144, 144); h.z = clamp(h.z + dz / d * sp * dt, -144, 144);
      h.mesh.position.set(h.x, 4.2 + Math.sin(simTime * 3 + h.wing * .05) * .7, h.z); h.mesh.rotation.y = Math.atan2(-dx, -dz); h.shadow.position.set(h.x, .09, h.z);
      h.mesh.userData.wings.forEach((w) => { w.mesh.rotation.z = Math.sin(h.wing) * .55 * w.side; });
      const pd = Math.hypot(h.x - playerState.x, h.z - playerState.z); if (pd < 30 && h.mode === 'chase') near = true;
      if (pd < 3.5 && h.mode === 'chase' && butterflyStun <= 0) {
        stuns++; butterflyStun = 1.0; h.mode = 'flee'; h.fleeT = 3; playSfx('sfx_hit'); hap('thud'); addShake(1.1);
        if (score.combo > 0) floatText('COMBO LOST!', playerState.x, playerState.z, true); score.combo = 0; score.lastPollenAt = null; toast('A bird got you! Combo lost', 1.3);
      }
    }
    ui['danger-alert'].textContent = '⚠ BIRD CHASING!'; ui['danger-alert'].classList.toggle('show', near);
    const left = Math.max(0, flightSeconds - flyT);
    ui['score-big'].textContent = String(score.score); ui['timer-label'].textContent = `${Math.ceil(left)}`; ui['combo-label'].textContent = `COMBO ×${comboMultiplier(Math.max(1, score.combo))}${score.combo > 0 ? `  (${score.combo})` : ''}`;
    ui['combo-fill'].style.width = score.combo > 0 && score.lastPollenAt != null ? `${clamp(1 - (flyT - score.lastPollenAt) / COMBO_WINDOW, 0, 1) * 100}%` : '0%';
    if (left <= 0) { ui['danger-alert'].classList.remove('show'); finishRun(); }
  }

  function updateAtmosphere(dt) {
    if (phase === 'larva' || phase === 'molt') { atmo.night += ((playerState.stage >= 2 ? 1 : 0) - atmo.night) * Math.min(1, dt * .35); atmo.sunset = Math.max(0, atmo.sunset - dt); }
    else if (phase === 'spin' || phase === 'cocoon') atmo.night += (1 - atmo.night) * Math.min(1, dt * .6);
    else if (phase === 'emerge') atmo.night = Math.max(0, atmo.night - dt * .45);
    applyAtmosphere();
  }
  function updateEffects(dt) {
    for (const p of parts) { if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { p.mesh.visible = false; continue; } p.vy -= 9 * dt; p.mesh.position.x += p.vx * dt; p.mesh.position.y = Math.max(.05, p.mesh.position.y + p.vy * dt); p.mesh.position.z += p.vz * dt; p.mesh.scale.setScalar(Math.max(.01, p.size * (p.life / p.max))); }
    for (const r of rings) { if (!r.on) continue; r.t += dt; const u = r.t / r.dur; if (u >= 1) { r.on = false; r.mesh.visible = false; continue; } r.mesh.scale.setScalar(1 + r.max * u); r.mesh.material.opacity = (1 - u) * .8; }
    if (burstWaveTimer > 0) { burstWaveTimer -= dt; burstWave.scale.setScalar(1.2 + (0.52 - burstWaveTimer) * ((burstWave.userData.max || 19) * 1.6)); burstWave.material.opacity = Math.max(0, burstWaveTimer * 1.6); if (burstWaveTimer <= 0) burstWave.visible = false; }
    for (const p of puddles) if (p.shown) { p.bub.position.y = .3 + Math.abs(Math.sin(simTime * 2 + p.x)) * .5; p.mesh.scale.setScalar(p.r * (1 + Math.sin(simTime * 1.5 + p.z) * .03)); }
    shake = Math.max(0, shake - dt * 2.4);
  }
  function updateCamera(dt) {
    const bossCam = boss.active && phase === 'larva'; const tH = bossCam ? 52 : phase === 'spin' ? 30 : phase === 'cocoon' ? 38 : phase === 'molt' ? 36 : phase === 'fly' || phase === 'emerge' ? 52 : 43;
    const tB = bossCam ? 38 : phase === 'spin' ? 21 : phase === 'cocoon' ? 27 : phase === 'molt' ? 25 : phase === 'fly' || phase === 'emerge' ? 38 : 31;
    camH += (tH - camH) * Math.min(1, dt * 1.8); camBack += (tB - camBack) * Math.min(1, dt * 1.8);
    const sx = shake > 0 ? (Math.random() - .5) * shake * 1.6 : 0, sz = shake > 0 ? (Math.random() - .5) * shake * 1.6 : 0;
    camera.position.x += (playerState.x - camera.position.x) * Math.min(1, dt * 2.7); camera.position.z += (playerState.z + camBack - camera.position.z) * Math.min(1, dt * 2.7); camera.position.y += (camH - camera.position.y) * Math.min(1, dt * 2.1);
    camera.position.x += sx; camera.position.z += sz; camera.lookAt(playerState.x, 0, playerState.z - 1.5); camera.position.x -= sx; camera.position.z -= sz;
  }

  let testInput = false;
  function updateGame(dt) {
    simTime += dt;
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) ui['status-toast'].classList.remove('show'); }
    if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) ui['chapter-banner'].classList.remove('show'); }
    if (phase === 'larva') updateLarva(dt); else if (phase === 'molt') updateMolt(dt); else if (phase === 'spin') updateSpin(dt); else if (phase === 'cocoon') updateCocoon(dt); else if (phase === 'emerge') updateEmerge(dt); else if (phase === 'fly') updateFly(dt);
    else if (phase === 'start') { animateCaterpillar(); for (const f of food) if (f.active) f.mesh.position.y = .02 + Math.sin(simTime * 2.3 + f.mesh.userData.floatSeed) * .08; }
    else if (phase === 'result') { for (const p of butterflyParts) p.mesh.rotation.z = Math.sin(simTime * 6 + p.phase) * .4 * p.side; }
    updateEffects(dt); updateAtmosphere(dt); updateCamera(dt);
    mapTimer += dt; if (mapTimer > .13) { drawMinimap(); mapTimer = 0; if (phase === 'larva' || phase === 'fly') updateHud(); }
  }
  function frame(now) {
    animationId = requestAnimationFrame(frame);
    const dt = Math.min(.11, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
    if (!editMode && !paused) { const steps = Math.max(1, Math.round(timeScale)); for (let i = 0; i < steps; i++) updateGame(steps > 1 ? Math.min(dt, .05) : dt); }
    else if (editMode) {
      camera.position.x += (player.position.x - camera.position.x) * Math.min(1, dt * 2.7); camera.position.z += (player.position.z + 31 - camera.position.z) * Math.min(1, dt * 2.7); camera.lookAt(player.position.x, 0, player.position.z - 1.5);
      for (const f of food) f.mesh.position.y = .02 + Math.sin(now / 1000 * 2.3 + f.mesh.userData.floatSeed) * .07;
    }
    renderer.render(scene, camera);
  }
  for (const e of enemies) { e.mesh.visible = false; }
  if (!editMode) activateEnemies(0, false); else for (const e of enemies) { e.active = true; e.mesh.visible = true; }
  if (editMode) for (const p of puddles) { p.shown = false; }
  applyAtmosphere(); updateHud(); drawMinimap(); animationId = requestAnimationFrame(frame);

  if (window.__META_TEST) {
    window.__meta = {
      phase: () => phase, state: () => ({ ...playerState, phase, flyT, stuns, t: simTime, bossHp: boss.hp, bossMode: boss.mode, bossActive: boss.active, bossDone: boss.done, score: score.score, combo: score.combo, integrity: cocoonIntegrity, strikeActive: strike.active }),
      setScale: (n) => { timeScale = n; }, setInput: (x, z) => { testInput = x !== null; if (x !== null) { input.x = x; input.z = z; } },
      burst: () => spawnBurst(), start: () => startGame(), restart: () => newRun(false),
      give: (n) => { Object.assign(playerState, addNourishment(playerState, n)); playerState.energy = capEnergyForBoss(playerState.energy, boss.done); playerState.stage = growthStage(playerState.energy); const b = playerState.stage; if (bossShouldAppear(playerState, boss.active, boss.done)) startBoss(); else if (canBeginCocoon(playerState)) startSpin(); else if (b >= 1 && phase === 'larva' && moltStage < b) startMolt(b); },
      snapshot: () => ({ food: food.filter((f) => f.active).map((f) => ({ x: f.x, z: f.z, kind: f.kind })), enemies: enemies.filter((e) => e.active).map((e) => ({ x: e.x, z: e.z, kind: e.kind, stun: e.stun, mode: e.mode })), flowers: flowers.filter((f) => f.active).map((f) => ({ x: f.x, z: f.z, golden: f.golden })), hunters: hunters.map((h) => ({ x: h.x, z: h.z })), strike: { ...strike }, puddles: puddles.filter((p) => p.shown).map((p) => ({ x: p.x, z: p.z, r: p.r })), player: { x: playerState.x, z: playerState.z }, boss: { active: boss.active, x: boss.x, z: boss.z, mode: boss.mode, hp: boss.hp, tx: boss.tx, tz: boss.tz, ry: boss.ry, tele: boss.tele, r: BOSS.hopRadius, len: BOSS.lashLength, w: BOSS.lashWidth }, obstacles: obstacles.map((o) => ({ x: o.x, z: o.z, r: o.r })) }),
      pause: (v) => { paused = v; }, bossDone: (v) => { boss.done = v; }, calls: () => renderer.info.render.calls, mute: (m) => setMuted(m), audio: () => ({ bufs: Object.keys(audio.bufs).length, raw: Object.keys(audio.raw).length, music: audio.musicId, ctx: !!audio.ctx }),
    };
  }

  activeCleanup = () => {
    cancelAnimationFrame(animationId); listeners.forEach((off) => off());
    try { renderer.dispose(); } catch (e) { /* ignore */ }
    root.remove(); style.remove(); document.body.classList.remove('edit-mode'); stopMusic(0.1);
  };
}

window.run = run;
