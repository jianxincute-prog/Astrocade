/*
 * FROZEN DAYS — Build 4: skating progression, town and NPCs, world layout v1 (organic lake, four districts, corner areas).
 * A beginner learns to skate on a frozen lake. Hold PUSH to build speed, steer, brake and ease off when you
 * wobble. Practice grows five skills (Balance, Control, Speed, Braking, Tricks), earns XP and levels, and
 * optional goals add short challenges. Progress and the chosen skater are saved between sessions.
 */
import { getCfg } from './src/config.js';
import { createWorld } from './src/world.js';
import { createCharacter, CHARACTERS, characterLabel } from './src/character.js';
import { createSelect } from './src/select.js';
import { makeEnvironment } from './src/textures.js';
import { OUTLINE } from './src/anime.js';
import { createProgress } from './src/progress.js';
import { createNpcs, NPC_DEFS, TALK_RANGE, friendLabel, friendHearts } from './src/npc.js';
import { ZONE_LIST } from './src/layout.js';
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
  spin: 'Wobbly landing! Spin when you feel steady.',
};
const FALL_MSG = {
  speed: 'You fell! Slow down a little and try again.',
  turn: 'You fell! Turn wider when you are fast.',
  brake: 'You fell! Brake gently, not suddenly.',
  crash: 'Bonk! Falling is part of learning.',
  spin: 'You fell! Get steadier before spinning.',
};
const hasLib = () => typeof lib !== 'undefined';

function run(mode) {
  if (teardown) teardown();
  const root = document.getElementById('app') || document.body;
  const touch = (hasLib() && lib.shouldUseTouchControls) ? lib.shouldUseTouchControls() : ('ontouchstart' in window);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  root.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 9 / 16, 0.5, 450);
  const world = createWorld(scene);
  const spray = createSpray(scene);
  try { scene.environment = makeEnvironment(renderer); } catch (e) { /* reflections are optional */ }
  let kind = 'male', player = createCharacter(kind);
  scene.add(player.root);
  function setCharacter(k) {
    kind = k;
    scene.remove(player.root); player.dispose();
    player = createCharacter(k); scene.add(player.root);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), new THREE.MeshBasicMaterial({ color: 0x1a2a40, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

  const npcs = createNpcs(scene, world.heightAt);
  const skater = createSkater();
  const rig = createCameraRig(camera);
  let talkNpc = null, curZone = null, zoneTimer = 0;
  const lastTalk = {};
  let progress = createProgress(null);

  function resize() {
    const w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    OUTLINE.aspect.value = w / h;
  }
  resize();
  window.addEventListener('resize', resize);

  if (hasLib() && lib.showGameParameters) {
    lib.showGameParameters({
      name: 'Frozen Days',
      params: {
        'Skill boost (0 = earn it)': { key: 'skill.level', type: 'slider', min: 0, max: 1, step: 0.05 },
        'Push power': { key: 'skating.pushAccel', type: 'slider', min: 3, max: 14, step: 0.5 },
        'Ice slipperiness': { key: 'skating.iceFriction', type: 'slider', min: 0.02, max: 0.5, step: 0.01 },
        'Camera distance': { key: 'camera.distance', type: 'slider', min: 5, max: 14, step: 0.5 },
      },
    });
  }

  // Developer hook (only when gameConfig.dev is set): jump to a spot to inspect the town.
  if (window.gameConfig && window.gameConfig.dev) window.__frozen = { cam: null, scene, world, teleport(x, z, h) { skater.x = x; skater.z = z; skater.h = h; skater.vx = skater.vz = 0; rig.snap(skater); }, skater, npcs, renderer, get player() { return player; } };

  let raf = 0, last = performance.now(), clock = 0;
  let input = null, hud = null, sel = null;
  const playing = mode !== 'edit';
  let phase = 'loading'; // loading -> select -> play (character button returns to select)
  const pv = { d: 4.4, y: 1.0, zoom: false };

  // ---- Save / load (one slot per player)
  let lastSave = 0, lastScore = 0, lastScoreAt = 0;
  function saveState(force) {
    const now = performance.now();
    if (!force && now - lastSave < 10000) return;
    lastSave = now; progress.clearDirty();
    try { if (hasLib() && lib.saveUserGameState) lib.saveUserGameState(Object.assign({ character: kind }, progress.serialize())).catch(() => {}); } catch (e) { /* save is optional */ }
  }
  function maybeSubmitScore() {
    const now = performance.now(), run = Math.round(progress.bestRun());
    if (run < 20 || run <= lastScore || now - lastScoreAt < 30000) return;
    lastScore = run; lastScoreAt = now;
    try { if (hasLib() && lib.addPlayerScoreToLeaderboard) lib.addPlayerScoreToLeaderboard(run).catch(() => {}); } catch (e) { /* leaderboard is optional */ }
  }
  function loadState() {
    return new Promise((res) => {
      let done = false; const fin = (v) => { if (!done) { done = true; res(v); } };
      setTimeout(() => fin(null), 1500);
      try {
        if (hasLib() && lib.getUserGameState) lib.getUserGameState().then((r) => fin(r && r.state ? r.state : null)).catch(() => fin(null));
        else fin(null);
      } catch (e) { fin(null); }
    });
  }
  function startPlay() {
    phase = 'play'; sel.hide(); rig.snap(skater); hasPrev = false;
    saveState(true);
  }
  function openSelect() {
    phase = 'select'; skater.vx = skater.vz = 0; skater.speed = 0;
    pv.zoom = false; sel.show(); sel.mark(kind);
  }

  if (playing) {
    input = createInput(root, renderer.domElement, { touch });
    hud = createHud(root, { touch });
    hud.el.addEventListener('respawn', () => input.requestRespawn());
    hud.el.addEventListener('character', () => openSelect());
    hud.el.addEventListener('panel', () => hud.showPanel(progress, { zones: ZONE_LIST.length, npcs: NPC_DEFS.length }));
    hud.el.addEventListener('dialogend', () => {
      if (talkNpc) {
        if (clock - (lastTalk[talkNpc.id] === undefined ? -999 : lastTalk[talkNpc.id]) > 40) { progress.addFriend(talkNpc.id); lastTalk[talkNpc.id] = clock; hud.toast('♥ Your friendship with ' + talkNpc.name + ' grew', 2); }
        talkNpc = null; saveState(true);
      }
    });
    hud.el.addEventListener('skipgoal', () => { progress.skipGoal(); hud.toast('New goal!', 1.2); });
    sel = createSelect(root, {
      kinds: CHARACTERS, labels: Object.fromEntries(CHARACTERS.map((k) => [k, characterLabel(k)])), current: kind,
      onPick: (k) => setCharacter(k), onZoom: (z) => { pv.zoom = z; }, onStart: () => startPlay(),
    });
    sel.hide(); root.classList.add('selecting');
    skater.x = SPAWN.x; skater.z = SPAWN.z; skater.h = SPAWN.h;
    rig.snap(skater);
    const onHide = () => { if (document.hidden) saveState(true); };
    document.addEventListener('visibilitychange', onHide);
    root._frozenOnHide = onHide;
    loadState().then((saved) => {
      progress = createProgress(saved);
      input.setSpinVisible(progress.spinUnlocked());
      if (saved && CHARACTERS.includes(saved.character)) { setCharacter(saved.character); sel.mark(saved.character); startPlay(); }
      else { phase = 'select'; sel.show(); }
    });
  }

  let px = skater.x, pz = skater.z, hasPrev = false;
  let spinWasUnlocked = false;

  function handleEvents(evs) {
    for (const ev of evs) {
      if (ev.type === 'wobble') {
        hud.toast(TIPS[ev.reason] || 'Wobbly!', 1.6);
        if (hasLib()) lib.haptics.play('warning');
      } else if (ev.type === 'fall') {
        hud.toast(FALL_MSG[ev.reason] || 'You fell!', 2.4);
        spray.burst(skater.x, skater.y + 0.2, skater.z, 28, 3 + Math.min(skater.speed, 12) * 0.3);
        world.scuff(skater.x, skater.z, 0.6);
        if (hasLib()) lib.haptics.play('thud');
        saveState(false); maybeSubmitScore();
      } else if (ev.type === 'up') {
        hud.toast('Back on your feet!', 1.2);
        if (hasLib()) lib.haptics.play('tick');
      } else if (ev.type === 'stroke') {
        if (skater.speed > 1.5 && hasLib()) lib.haptics.play({ intensity: 0.2, sharpness: 0.7 });
        const fx = Math.sin(skater.h), fz = Math.cos(skater.h), side = ev.leg === 0 ? 1 : -1;
        for (let k = 0; k < 3; k++) {
          spray.emit(skater.x - fx * 0.3 + fz * side * 0.25, 0.12, skater.z - fz * 0.3 - fx * side * 0.25,
            -fx * 1.4 + fz * side * 1.1 + (Math.random() - 0.5), 0.8 + Math.random() * 1.2, -fz * 1.4 - fx * side * 1.1 + (Math.random() - 0.5));
        }
      } else if (ev.type === 'spin') {
        hud.toast('Nice spin!', 1.2);
        if (hasLib()) lib.haptics.play('success');
      } else if (ev.type === 'spinfail') {
        hud.toast(ev.reason === 'locked' ? 'Spin unlocks at Level 3' : ev.reason === 'land' ? 'Spin on the ice!' : 'Pick up some speed to spin', 1.4);
      }
    }
  }
  function startTalk(n) {
    const pts = progress.friendPoints(n.id), met = pts >= 0;
    if (!met) handleUi(progress.meet(n.id, n.name));
    const points = Math.max(0, pts);
    const lines = npcs.dialogue(n, { points, met, skills: progress.rawSkills(), spinUnlocked: progress.spinUnlocked() });
    hud.showDialog({ name: n.name, role: n.role, label: friendLabel(points), hearts: friendHearts(points), lines });
    talkNpc = n;
    if (hasLib()) lib.haptics.play('tap');
  }
  function handleUi(list) {
    for (const u of list) {
      if (u.type === 'met') { hud.toast('You met ' + u.name + '!  +10 XP', 2.4); continue; }
      if (u.type === 'zone') { hud.toast('New place discovered!  +' + u.xp + ' XP', 2.4); continue; }
      if (u.type === 'level') {
        hud.toast('LEVEL UP!  Lv ' + u.level + ' · ' + u.name + (u.unlock ? '\n' + u.unlock : ''), 3);
        if (hasLib()) lib.haptics.play('success');
        saveState(true);
      } else if (u.type === 'goal') {
        hud.toast('Goal complete!  +' + u.xp + ' XP', 2.2);
        if (hasLib()) lib.haptics.play('success');
        saveState(true); maybeSubmitScore();
      }
    }
    if (progress.spinUnlocked() !== spinWasUnlocked) { spinWasUnlocked = progress.spinUnlocked(); input.setSpinVisible(spinWasUnlocked); }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.11);
    last = now;
    if (dt <= 0) return;
    clock += dt;
    const c = getCfg();
    c.skills = progress.skills(c.level); c.spinUnlocked = progress.spinUnlocked();

    if (playing && phase !== 'play') {
      // Character preview: stand still, camera sways in front (or zooms to the face).
      player.pose({ ...skater, mode: 'walk', speed: 0, stride: 0, strideAmp: 0, b: 0, fallAmt: 0, steer: 0, state: 'ok', spin: null, spinAng: 0 }, clock);
      player.place({ ...skater, mode: 'walk', y: 0 });
      const tgtD = pv.zoom ? 1.15 : 4.4, tgtY = pv.zoom ? player.faceY - 0.075 : player.height * 0.36;
      const k = 1 - Math.exp(-4 * dt);
      pv.d += (tgtD - pv.d) * k; pv.y += (tgtY - pv.y) * k;
      const sw = Math.sin(clock * 0.5) * (pv.zoom ? 0.35 : 0.6);
      camera.position.set(skater.x + Math.sin(skater.h + sw) * pv.d, pv.y + (pv.zoom ? 0.02 : 0.3), skater.z + Math.cos(skater.h + sw) * pv.d);
      camera.lookAt(skater.x, pv.y, skater.z);
      const f = pv.zoom ? 30 : 40; if (Math.abs(camera.fov - f) > 0.05) { camera.fov += (f - camera.fov) * k; camera.updateProjectionMatrix(); }
      input.consumeRespawn(); input.consumeLook(); input.consumeSpin();
      shadow.position.set(skater.x, 0.08, skater.z);
    } else if (playing) {
      if (input.consumeRespawn()) { respawn(skater); progress.resetRun(); rig.snap(skater); hasPrev = false; }
      const inp = input.read();
      inp.spin = input.consumeSpin();
      if (hud.panelOpen || hud.dialogOpen) { inp.steer = 0; inp.push = 0; inp.brake = hud.dialogOpen ? 1 : 0; inp.spin = false; }
      else if (inp.push > 0.1 || Math.abs(inp.steer) > 0.2) hud.hideHint();
      const steps = Math.max(1, Math.ceil(dt / (1 / 60))), h = dt / steps;
      for (let i = 0; i < steps; i++) { inp.spin = i === 0 ? inp.spin : false; updateSkater(skater, inp, h, c, world); }
      skater.y = world.heightAt(skater.x, skater.z);

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

      const evs = skater.events.splice(0);
      const ui1 = progress.onEvents(evs);
      handleEvents(evs);
      const ui2 = progress.update(skater, dt);
      handleUi(ui1.concat(ui2));
      if (progress.isDirty()) saveState(false);
      player.pose(skater, clock);
      player.place(skater);
      shadow.position.set(skater.x, skater.y + (skater.mode === 'skate' ? 0.08 : 0.06), skater.z);
      rig.update(skater, dt, c, input.consumeLook());
      hud.update(skater, dt, progress);

      // Town: discovering places and talking to neighbours.
      zoneTimer += dt;
      if (zoneTimer > 0.4) {
        zoneTimer = 0;
        const zn = world.zoneAt(skater.x, skater.z);
        if (zn && zn.id !== curZone) { curZone = zn.id; hud.banner(zn.name); handleUi(progress.discoverZone(zn.id, zn.name, zn.xp)); }
        else if (!zn) curZone = null;
      }
      const wantTalk = input.consumeTalk();
      const near = !hud.panelOpen && !hud.dialogOpen ? npcs.nearest(skater.x, skater.z, TALK_RANGE) : null;
      const canTalk = !!near && skater.speed < 4.5 && skater.state === 'ok';
      hud.setTalk(canTalk ? near.name : null, touch); input.setTalkVisible(canTalk);
      if (wantTalk && canTalk) startTalk(near);
    } else {
      // Edit mode: static scene, slow orbit, no gameplay.
      player.pose({ ...skater, speed: 0, strideAmp: 0, b: 0, fallAmt: 0, steer: 0, spin: null, spinAng: 0 }, clock);
      player.place(skater);
      const a = clock * 0.15;
      camera.position.set(Math.sin(a) * 28, 10, 34 + Math.cos(a) * 14);
      camera.lookAt(0, 1.5, 28);
    }
    npcs.update(dt, skater.x, skater.z, talkNpc ? talkNpc.id : null);
    spray.update(dt);
    world.update(dt, camera.position);
    if (window.__frozen && window.__frozen.cam) { const o = window.__frozen.cam; camera.position.set(o.x, o.y, o.z); camera.lookAt(o.tx, o.ty, o.tz); if ((o.fov && camera.fov !== o.fov) || camera.far !== 1500) { if (o.fov) camera.fov = o.fov; camera.far = 1500; camera.updateProjectionMatrix(); } }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  teardown = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    if (root._frozenOnHide) { document.removeEventListener('visibilitychange', root._frozenOnHide); root._frozenOnHide = null; }
    if (playing) saveState(true);
    if (input) input.destroy();
    if (hud) hud.destroy();
    if (sel) sel.destroy();
    npcs.dispose();
    player.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    teardown = null;
  };
}

// The platform boots the game by calling window.run(mode); publishing bundles game.js into an IIFE,
// so run must be assigned to window explicitly.
window.run = run;
