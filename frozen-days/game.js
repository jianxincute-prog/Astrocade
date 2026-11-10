/*
 * FROZEN DAYS — Build 1 (Phases 1–3): core foundation, ice-skating controller, beginner balance & falls.
 * A beginner learns to skate on a frozen lake. Hold PUSH to build speed, steer, brake, and ease off when you
 * wobble — push past your comfort zone and you fall (then get back up). The "Skill level" slider in the
 * game settings previews how control improves as skills grow.
 */
import { getCfg } from './src/config.js';
import { createWorld } from './src/world.js';
import { createPlayerMesh } from './src/player.js';
import { createSkater, updateSkater, respawn, SPAWN } from './src/skating.js';
import { createCameraRig } from './src/camera.js';
import { createInput } from './src/input.js';
import { createHud } from './src/hud.js';
import { createSpray } from './src/fx.js';

let teardown = null;

const TIPS = {
  speed: 'Whoa, too fast! Ease off the push.',
  turn: 'Sharp turn at speed! Turn wider.',
  brake: 'Easy on the brake at high speed.',
  crash: 'Ouch! Watch out for trees.',
};
const FALL_MSG = {
  speed: 'You fell! Slow down a little and try again.',
  turn: 'You fell! Turn wider when you are fast.',
  brake: 'You fell! Brake gently, not suddenly.',
  crash: 'Bonk! Falling is part of learning.',
};

function run(mode) {
  if (teardown) teardown();
  const root = document.getElementById('app') || document.body;
  const touch = (typeof lib !== 'undefined' && lib.shouldUseTouchControls) ? lib.shouldUseTouchControls() : ('ontouchstart' in window);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  root.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 9 / 16, 0.5, 400);
  const world = createWorld(scene);
  const spray = createSpray(scene);
  const player = createPlayerMesh();
  scene.add(player.root);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), new THREE.MeshBasicMaterial({ color: 0x1a2a40, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

  const skater = createSkater();
  const rig = createCameraRig(camera);

  function resize() {
    const w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  if (typeof lib !== 'undefined' && lib.showGameParameters) {
    lib.showGameParameters({
      name: 'Frozen Days',
      params: {
        'Skill level (0 = beginner)': { key: 'skill.level', type: 'slider', min: 0, max: 1, step: 0.05 },
        'Push power': { key: 'skating.pushAccel', type: 'slider', min: 3, max: 14, step: 0.5 },
        'Ice slipperiness': { key: 'skating.iceFriction', type: 'slider', min: 0.02, max: 0.5, step: 0.01 },
        'Camera distance': { key: 'camera.distance', type: 'slider', min: 5, max: 14, step: 0.5 },
      },
    });
  }

  let raf = 0, last = performance.now(), clock = 0;
  let input = null, hud = null;
  const playing = mode !== 'edit';

  if (playing) {
    input = createInput(root, renderer.domElement, { touch });
    hud = createHud(root, { touch });
    hud.el.addEventListener('respawn', () => input.requestRespawn());
    skater.x = SPAWN.x; skater.z = SPAWN.z; skater.h = SPAWN.h;
    rig.snap(skater);
  }

  let px = skater.x, pz = skater.z, hasPrev = false;

  function handleEvents() {
    for (const ev of skater.events) {
      if (ev.type === 'wobble') {
        hud.toast(TIPS[ev.reason] || 'Wobbly!', 1.6);
        if (typeof lib !== 'undefined') lib.haptics.play('warning');
      } else if (ev.type === 'fall') {
        hud.toast(FALL_MSG[ev.reason] || 'You fell!', 2.4);
        spray.burst(skater.x, 0.2, skater.z, 28, 3 + Math.min(skater.speed, 12) * 0.3);
        world.scuff(skater.x, skater.z, 0.6);
        if (typeof lib !== 'undefined') lib.haptics.play('thud');
      } else if (ev.type === 'up') {
        hud.toast('Back on your feet!', 1.2);
        if (typeof lib !== 'undefined') lib.haptics.play('tick');
      }
    }
    skater.events.length = 0;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.11);
    last = now;
    if (dt <= 0) return;
    clock += dt;
    const c = getCfg();

    if (playing) {
      if (input.consumeRespawn()) { respawn(skater); rig.snap(skater); hasPrev = false; }
      const inp = input.read();
      if (inp.push > 0.1 || Math.abs(inp.steer) > 0.2) hud.hideHint();
      const steps = Math.max(1, Math.ceil(dt / (1 / 60))), h = dt / steps;
      for (let i = 0; i < steps; i++) updateSkater(skater, inp, h, c, world);

      // Blade trails on the ice + spray while braking hard.
      if (skater.mode === 'skate' && skater.speed > 0.8) {
        if (hasPrev) {
          const fx = Math.sin(skater.h), fz = Math.cos(skater.h);
          const sx = -fz * 0.18, sz = fx * 0.18;
          const a = 0.1 + Math.min(0.25, skater.brake * 0.25);
          world.trail(px + sx, pz + sz, skater.x + sx, skater.z + sz, a, 1.6);
          world.trail(px - sx, pz - sz, skater.x - sx, skater.z - sz, a, 1.6);
        }
        if (skater.brake > 0.2 && skater.speed > 3 && skater.state === 'ok') {
          const fx = Math.sin(skater.h), fz = Math.cos(skater.h);
          spray.emit(skater.x, 0.15, skater.z, -fz * (Math.random() - 0.5) * 6 - fx * 1, 1 + Math.random() * 1.5, fx * (Math.random() - 0.5) * 6 - fz * 1);
        }
      }
      px = skater.x; pz = skater.z; hasPrev = skater.mode === 'skate';

      handleEvents();
      player.pose(skater, clock);
      player.place(skater);
      shadow.position.set(skater.x, skater.mode === 'skate' ? 0.08 : 0.04, skater.z);
      rig.update(skater, dt, c, input.consumeLook());
      hud.update(skater, dt);
    } else {
      // Edit mode: static scene, slow orbit, no gameplay.
      player.pose({ ...skater, speed: 0, strideAmp: 0, b: 0, fallAmt: 0, steer: 0 }, clock);
      player.place(skater);
      const a = clock * 0.15;
      camera.position.set(Math.sin(a) * 28, 10, 34 + Math.cos(a) * 14);
      camera.lookAt(0, 1.5, 28);
    }
    spray.update(dt);
    world.update(dt, camera.position);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  teardown = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    if (input) input.destroy();
    if (hud) hud.destroy();
    renderer.dispose();
    renderer.domElement.remove();
    teardown = null;
  };
}

// The platform boots the game by calling window.run(mode); publishing bundles game.js into an IIFE,
// so run must be assigned to window explicitly.
window.run = run;
