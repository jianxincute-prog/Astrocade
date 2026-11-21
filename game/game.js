/**
 * Secret Recipe Lab - pick 3 ingredients, cook, serve (blocky 3D cooking game).
 * Flow: loading screen (real progress) -> themed main menu -> play (CookingFSM) -> pause/finish -> menu.
 * Step 5: loading, menu, pause, recipe book (3D thumbnails), leaderboard, save/load, background music.
 * Three.js comes from the cdnjs script tag in index.html (window.THREE).
 */
import { buildKitchen, buildLights, ANCHORS } from './src/kitchen.js';
import { createCharacter } from './src/chef.js';
import { CameraRig } from './src/camera.js';
import { Quality } from './src/quality.js';
import { createHud } from './src/hud.js';
import { CookingFSM } from './src/fsm.js';
import { Particles } from './src/particles.js';
import { createAudio, haptic } from './src/audio.js';
import { createScreens } from './src/screens.js';
import { createThumbs } from './src/thumbs.js';
import { INGREDIENTS, STARTER_IDS } from './src/ingredients.js';
import { newProfile } from './src/recipes.js';
import { loadSave, applySave, toSave, createSaver, resetSave, submitScore, fetchBoard } from './src/save.js';

const THREE = window.THREE;
const STAGE = { w: 720, h: 640 };
const QUALITY_CYCLE = ['auto', 'low', 'med', 'high'];
let active = null;

const DEFAULTS = {
  look: { chefApronColor: '#A8E6CF', chefHatColor: '#FFFFFF', wallColor: '#FFE8D6', floorColor: '#F6E7CB' },
  camera: { followSpeed: 4.5, cookZoom: 0.85 },
  gameplay: {
    graceSeconds: 0.35, tossSeconds: 0.7, fastSpeed: 2, shinePerTap: 10, surpriseChance: 0.15,
    goldenOrderEvery: 5, goldenOrderSeconds: 25,
    unlockWave2Matches: 3, unlockWave2Dishes: 6, unlockWave3Matches: 6, unlockWave3Dishes: 12,
  },
  scoring: { creation: 100, recipe: 150, orderMatch: 200, newRecipeBonus: 50, comboStep: 25, comboMax: 250, surprise: 100, perfect: 50, goldenMultiplier: 3 },
};

function withDefaults(raw) {
  const c = raw || {};
  const out = { ...c, quality: c.quality || 'auto' };
  Object.keys(DEFAULTS).forEach((k) => { out[k] = { ...DEFAULTS[k], ...(c[k] || {}) }; });
  return out;
}

const setLoad = (p) => { if (window.__setLoad) window.__setLoad(p); };
const hideLoad = () => { if (window.__hideLoad) window.__hideLoad(); };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

function run(mode) {
  if (active) { active.dispose(); active = null; }
  const cfg = withDefaults(window.gameConfig);
  const isEdit = mode === 'edit';
  const touch = !!(window.lib && window.lib.shouldUseTouchControls && window.lib.shouldUseTouchControls());

  const appEl = document.getElementById('app');
  const stageEl = document.getElementById('stage');
  stageEl.innerHTML = '';

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  stageEl.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff1e6);
  const camera = new THREE.PerspectiveCamera(45, STAGE.w / STAGE.h, 0.1, 100);
  const { sun } = buildLights(scene);
  const kitchen = buildKitchen(scene, cfg.look);
  const camRig = new CameraRig(camera, cfg.camera);
  const quality = new Quality(renderer, sun, scene, { w: STAGE.w, h: STAGE.h }, cfg.quality);
  const fx = new Particles(scene);
  const sfx = createAudio();
  const thumbs = createThumbs(renderer);

  const chef = createCharacter({ apron: cfg.look.chefApronColor, hatColor: cfg.look.chefHatColor });
  chef.root.position.copy(ANCHORS.prepPos);
  scene.add(chef.root);
  const customer = createCharacter({
    hat: false, bun: false, apronOn: false, spatula: false,
    shirt: 0xf6bd60, hair: 0x2b2d42, skin: 0xf1c6a0, pants: 0x6d6875, cheek: 0xf4a6a6,
  });
  customer.root.position.copy(ANCHORS.customerPos);
  scene.add(customer.root);
  setLoad(0.35);

  const profile = newProfile(STARTER_IDS);
  profile.best = 0;
  const settings = { quality: cfg.quality, muted: false };
  const saver = createSaver(() => toSave(profile, settings));

  let fsm = null, started = false, paused = false, lastSubmitted = 0, stopped = false;
  const gesture = () => { sfx.unlock(); sfx.music(true); };

  async function submit() {
    const s = profile.score; // capture now: the score may change while the request is in flight
    if (s > lastSubmitted && (await submitScore(s))) lastSubmitted = Math.max(lastSubmitted, s);
  }

  const handlers = {
    onPick: (id) => { gesture(); if (fsm && started && !paused) fsm.pick(id); },
    onUndo: (i) => { gesture(); if (fsm && started && !paused) fsm.undo(i); },
    onTap: () => { gesture(); if (fsm && started && !paused) fsm.tap(); },
    onFast: () => { gesture(); if (fsm && started && !paused) fsm.setFast(!fsm.fast); },
    onMute: () => { gesture(); setMuted(!sfx.muted); },
    onHelp: () => ui.showHelp(),
    onAgain: () => { gesture(); if (fsm && started && !paused) fsm.repeatLast(); },
    onPause: () => { gesture(); if (started && !paused) openPause(); },
  };
  const ui = createHud({ hudEl: document.getElementById('hud'), stageEl, appEl, cfg, touch, handlers });

  function setMuted(m) {
    sfx.setMuted(m); settings.muted = m; ui.setMuted(m); screens.setMuted(m); saver.queue();
  }
  function setQuality(q) { settings.quality = q; quality.set(q); screens.setQuality(q); saver.queue(); }

  const screens = createScreens({
    appEl, cfg, thumbs,
    handlers: {
      onPlay: () => { gesture(); startPlay(); },
      onBook: () => { gesture(); screens.openBook(profile); },
      onBoard: () => { gesture(); screens.openBoard(() => fetchBoard(10), profile.best); },
      onHelp: () => { gesture(); ui.showHelp(); },
      onMute: () => { gesture(); setMuted(!sfx.muted); },
      onQuality: () => { gesture(); setQuality(QUALITY_CYCLE[(QUALITY_CYCLE.indexOf(settings.quality) + 1) % QUALITY_CYCLE.length]); },
      onReset: async () => {
        await resetSave();
        const fresh = newProfile(STARTER_IDS); fresh.best = 0;
        Object.assign(profile, fresh);
        lastSubmitted = 0;
        screens.showMenu(0);
      },
      onResume: () => closePause(),
      onFinish: () => finishRun(),
    },
  });

  // ---- flow -----------------------------------------------------------------------------------
  function openPause() { paused = true; screens.showPause(); submit(); saver.flush(); }
  function closePause() { paused = false; screens.hidePause(); }

  function startPlay() {
    screens.hideMenu();
    ui.show(true);
    if (!fsm) {
      fsm = new CookingFSM({
        chef, customer, camRig, scene, kitchen, ui, sfx, haptic, fx, cfg, profile,
        onServed: () => { saver.queue(); if (profile.completed % 5 === 0) submit(); },
      });
    }
    started = true; paused = false;
    fsm.resetSession();
  }

  async function finishRun() {
    paused = false; screens.hidePause();
    started = false;
    await submit();          // before the session reset zeroes the score
    await saver.flush();
    if (fsm) fsm.resetSession(); // clears the stage; the next Play starts a fresh session
    ui.show(false);
    screens.showMenu(profile.best);
  }

  const onKey = (e) => {
    gesture();
    if (e.key === 'Escape') { if (started) { if (paused) closePause(); else openPause(); } return; }
    if (!fsm || !started || paused) return;
    const idx = ui.cardIndexForKey(e.key);
    if (idx >= 0) { fsm.pick(INGREDIENTS[idx].id); e.preventDefault(); return; }
    if (e.key === 'Backspace') { fsm.undoLast(); e.preventDefault(); }
    else if (e.key === ' ') { fsm.setFast(!fsm.fast); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') { fsm.repeatLast(); }
    else if (e.key === 'h' || e.key === 'H') ui.showHelp();
    else if (e.key === 'm' || e.key === 'M') setMuted(!sfx.muted);
  };
  window.addEventListener('keydown', onKey);
  const onHide = () => { if (document.hidden && started && !paused) openPause(); };
  document.addEventListener('visibilitychange', onHide);

  if (window.lib && window.lib.showGameParameters) {
    window.lib.showGameParameters({
      name: 'Secret Recipe Lab',
      params: {
        'Apron color': { key: 'look.chefApronColor', type: 'color', onChange: (v) => { chef.mats.apron.color.set(v); } },
        'Hat color': { key: 'look.chefHatColor', type: 'color', onChange: (v) => { chef.mats.hat.color.set(v); } },
        'Wall color': { key: 'look.wallColor', type: 'color', onChange: (v) => { kitchen.mats.wall.color.set(v); } },
        'Floor color': { key: 'look.floorColor', type: 'color', onChange: (v) => { kitchen.mats.floor.color.set(v); } },
        'Cook zoom': { key: 'camera.cookZoom', type: 'slider', min: 0.6, max: 1, step: 0.05, onChange: (v) => { camRig.setCookZoom(v); } },
        'Fast speed': { key: 'gameplay.fastSpeed', type: 'slider', min: 1, max: 3, step: 0.25 },
        'Flame chance': { key: 'gameplay.surpriseChance', type: 'slider', min: 0, max: 1, step: 0.05 },
        'Golden every N orders': { key: 'gameplay.goldenOrderEvery', type: 'slider', min: 0, max: 10, step: 1 },
        'Golden seconds': { key: 'gameplay.goldenOrderSeconds', type: 'slider', min: 10, max: 60, step: 1 },
      },
    });
  }

  // ---- loop -----------------------------------------------------------------------------------
  let raf = 0, last = performance.now();
  function frame(now) {
    if (stopped) return;
    raf = requestAnimationFrame(frame);
    const raw = Math.max(0, (now - last) / 1000);
    last = now;
    if (!window.__labPause) {
      const dt = Math.min(raw, 0.11);
      quality.sample(raw);
      if (fsm && started) { if (!paused) fsm.update(dt); } else { chef.update(dt); customer.update(dt); }
      fx.update(dt);
      camRig.update(dt);
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  // ---- boot (play mode): warm up, load save, measure quality, then show the menu --------------------
  async function boot() {
    ui.show(false);
    ui.setMuted(false);
    ui.setCards({ unlocked: profile.unlocked, picked: new Set(), enabled: true });
    await nextFrame();
    try { renderer.compile(scene, camera); } catch (e) { /* optional */ }
    await nextFrame();
    setLoad(0.55);
    applySave(profile, settings, await loadSave());
    quality.set(settings.quality);
    sfx.setMuted(settings.muted); ui.setMuted(settings.muted); screens.setMuted(settings.muted); screens.setQuality(settings.quality);
    setLoad(0.7);
    const t0 = performance.now();
    while (!stopped && !quality.done && performance.now() - t0 < 6000) { setLoad(0.7 + 0.3 * quality.progress); await nextFrame(); }
    setLoad(1);
    if (stopped) return;
    hideLoad();
    screens.showMenu(profile.best);
  }

  if (isEdit) {
    ui.setCards({ unlocked: profile.unlocked, picked: new Set(), enabled: false });
    hideLoad();
  } else {
    boot();
  }

  active = {
    dispose() {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onHide);
      sfx.music(false);
      thumbs.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
  window.__lab = { chef, customer, camRig, get fsm() { return fsm; }, profile, settings, quality, renderer, scene, fx, ui, screens, startPlay, finishRun, submit, get lastSubmitted() { return lastSubmitted; } };
}

window.run = run;
