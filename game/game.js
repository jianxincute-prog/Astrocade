/**
 * Secret Recipe Lab - pick 3 ingredients, cook, serve (blocky 3D cooking game).
 * Step 3 (foundation): portrait 720x1280 layout, Three.js scene, fixed chef rig, kitchen, camera presets,
 * quality tiers, HUD skeleton, and a temporary looping preview. Gameplay (FSM) arrives in step 4.
 * Three.js comes from the cdnjs script tag in index.html (window.THREE).
 */
import { buildKitchen, buildLights, ANCHORS } from './src/kitchen.js';
import { createCharacter } from './src/chef.js';
import { CameraRig } from './src/camera.js';
import { Quality } from './src/quality.js';
import { createPreview } from './src/preview.js';
import { buildHud } from './src/hud.js';

const THREE = window.THREE;
const STAGE = { w: 720, h: 640 };
let active = null;

function cfgWithDefaults(raw) {
  const c = raw || {};
  return {
    ...c,
    look: { chefApronColor: '#A8E6CF', chefHatColor: '#FFFFFF', wallColor: '#FFE8D6', floorColor: '#F6E7CB', ...(c.look || {}) },
    camera: { followSpeed: 4.5, cookZoom: 0.85, ...(c.camera || {}) },
    preview: { autoCycle: true, ...(c.preview || {}) },
    quality: c.quality || 'auto',
  };
}

function run(mode) {
  if (active) { active.dispose(); active = null; }
  const cfg = cfgWithDefaults(window.gameConfig);
  const isEdit = mode === 'edit';

  const stage = document.getElementById('stage');
  stage.innerHTML = '';
  buildHud(document.getElementById('hud'), cfg);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff1e6);
  const camera = new THREE.PerspectiveCamera(45, STAGE.w / STAGE.h, 0.1, 100);
  const { sun } = buildLights(scene);
  const kitchen = buildKitchen(scene, cfg.look);
  const camRig = new CameraRig(camera, cfg.camera);
  const quality = new Quality(renderer, sun, scene, { w: STAGE.w, h: STAGE.h }, cfg.quality);

  const chef = createCharacter({ apron: cfg.look.chefApronColor, hatColor: cfg.look.chefHatColor });
  chef.root.position.copy(ANCHORS.prepPos);
  scene.add(chef.root);
  const customer = createCharacter({
    hat: false, bun: false, apronOn: false, spatula: false,
    shirt: 0xf6bd60, hair: 0x2b2d42, skin: 0xf1c6a0, pants: 0x6d6875, cheek: 0xf4a6a6,
  });
  customer.root.position.copy(ANCHORS.customerPos);
  scene.add(customer.root);

  const preview = createPreview({ scene, chef, customer, camera: camRig });
  const runPreview = !isEdit && cfg.preview.autoCycle;

  // Settings panel (both modes). Colors apply live.
  if (window.lib && window.lib.showGameParameters) {
    window.lib.showGameParameters({
      name: 'Secret Recipe Lab',
      params: {
        'Apron color': { key: 'look.chefApronColor', type: 'color', onChange: (v) => { chef.mats.apron.color.set(v); } },
        'Hat color': { key: 'look.chefHatColor', type: 'color', onChange: (v) => { chef.mats.hat.color.set(v); } },
        'Wall color': { key: 'look.wallColor', type: 'color', onChange: (v) => { kitchen.mats.wall.color.set(v); } },
        'Floor color': { key: 'look.floorColor', type: 'color', onChange: (v) => { kitchen.mats.floor.color.set(v); } },
        'Cook zoom': { key: 'camera.cookZoom', type: 'slider', min: 0.6, max: 1, step: 0.05,
          onChange: (v) => { camRig.setCookZoom(v); } },
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
    const dt = Math.min(raw, 0.11);
    quality.sample(raw);
    if (runPreview) preview.update(dt);
    chef.update(dt);
    customer.update(dt);
    camRig.update(dt);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  active = {
    dispose() {
      stopped = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
  // Handy for automated checks.
  window.__lab = { chef, customer, camRig, preview, quality, renderer, scene };
}

window.run = run;
