/**
 * Secret Recipe Lab - pick 3 ingredients, cook, serve (blocky 3D cooking game).
 * Step 4: playable loop. CookingFSM drives selecting, tossing, cooking (tap for shine), serving and reset.
 * Orders, scoring, combo, golden orders, flame surprise, ingredient unlock waves and a first-order guide arrow.
 * Not yet: save/leaderboard, recipe book, loading/menu screens (step 5+).
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
import { INGREDIENTS, STARTER_IDS } from './src/ingredients.js';
import { newProfile } from './src/recipes.js';

const THREE = window.THREE;
const STAGE = { w: 720, h: 640 };
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

  const chef = createCharacter({ apron: cfg.look.chefApronColor, hatColor: cfg.look.chefHatColor });
  chef.root.position.copy(ANCHORS.prepPos);
  scene.add(chef.root);
  const customer = createCharacter({
    hat: false, bun: false, apronOn: false, spatula: false,
    shirt: 0xf6bd60, hair: 0x2b2d42, skin: 0xf1c6a0, pants: 0x6d6875, cheek: 0xf4a6a6,
  });
  customer.root.position.copy(ANCHORS.customerPos);
  scene.add(customer.root);

  const profile = newProfile(STARTER_IDS);
  let fsm = null;
  const handlers = {
    onPick: (id) => { sfx.unlock(); if (fsm) fsm.pick(id); },
    onUndo: (i) => { sfx.unlock(); if (fsm) fsm.undo(i); },
    onTap: () => { sfx.unlock(); if (fsm) fsm.tap(); },
    onFast: () => { sfx.unlock(); if (fsm) fsm.setFast(!fsm.fast); },
    onMute: () => { sfx.setMuted(!sfx.muted); ui.setMuted(sfx.muted); },
    onHelp: () => ui.showHelp(),
    onAgain: () => { sfx.unlock(); if (fsm) fsm.repeatLast(); },
  };
  const ui = createHud({ hudEl: document.getElementById('hud'), stageEl, appEl, cfg, touch, handlers });
  ui.setMuted(false);
  ui.setCards({ unlocked: profile.unlocked, picked: new Set(), enabled: !isEdit });

  if (!isEdit) {
    fsm = new CookingFSM({ chef, customer, camRig, scene, kitchen, ui, sfx, haptic, fx, cfg, profile });
    fsm.start();
  }

  // Keyboard: 1-9,0,-,= pick; Backspace undo; Space fast; Enter/R repeat; H help.
  const onKey = (e) => {
    sfx.unlock();
    if (!fsm) return;
    const idx = ui.cardIndexForKey(e.key);
    if (idx >= 0) { fsm.pick(INGREDIENTS[idx].id); e.preventDefault(); return; }
    if (e.key === 'Backspace') { fsm.undoLast(); e.preventDefault(); }
    else if (e.key === ' ') { fsm.setFast(!fsm.fast); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') { fsm.repeatLast(); }
    else if (e.key === 'h' || e.key === 'H') ui.showHelp();
  };
  window.addEventListener('keydown', onKey);

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
        'Quality': { key: 'quality', type: 'dropdown',
          options: [{ label: 'Auto', value: 'auto' }, { label: 'Low', value: 'low' }, { label: 'Medium', value: 'med' }, { label: 'High', value: 'high' }],
          onChange: (v) => { quality.set(v); } },
      },
    });
  }

  let raf = 0, last = performance.now(), stopped = false;
  function frame(now) {
    if (stopped) return;
    raf = requestAnimationFrame(frame);
    const raw = Math.max(0, (now - last) / 1000);
    last = now;
    if (!window.__labPause) {
      const dt = Math.min(raw, 0.11);
      quality.sample(raw);
      if (fsm) fsm.update(dt); else { chef.update(dt); customer.update(dt); }
      fx.update(dt);
      camRig.update(dt);
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  active = {
    dispose() {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
  window.__lab = { chef, customer, camRig, fsm, profile, quality, renderer, scene, fx, ui };
}

window.run = run;
