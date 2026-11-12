import {
  ANNEX, FRAGMENTS, GALLERY_DOOR, HALL_SIZE, INITIAL_PODIUMS, PARTS, SETS,
  countPlaced, createInitialState, formatTime, getFragment, getSet, isGameComplete,
  pickup, placeCarried, restoreState, serializeState,
  DAILY_STARS, EXPRESSION_UNLOCKS, HIDDEN_FRAGMENTS, betterMedal, countStars, dailyChallenge, dailyMet,
  isExpressionUnlocked, medalFor, puzzleSolved, puzzleStart, reveal, statuePar,
} from './logic.mjs';
import { escapeHtml, installStyles, roundRect, uiMarkup } from './ui.js';
import { PART_OFFSET, buildBust, buildStatuePart, createStatueKit } from './statues.js';
import { COSTUMES, DEFAULT_EXPR, FACE_PRESETS } from './faces.mjs';
import { STATUE_POSES } from './poses.mjs';
import { buildContainer, buildFragment, buildPodium, buildWorld, makeLabel, petalTexture, starTexture } from './world.js';
import { createAudio } from './audio.js';

// Babylon.js presentation, input, and Astrocade shell. Play is first-person; Edit is a touch-friendly overhead gallery layout editor.
// The statues stand about 5 units tall on their plinths, so the visitor's eye sits at EYE_HEIGHT to meet them at chest height.
const EYE_HEIGHT = 3.2;
const PLAY_FOV = 74 * Math.PI / 180;
// Statue LOD: a 35%-resolution copy (≈5× fewer triangles) replaces each statue beyond LOD_DIST; eyelashes,
// corneas, tears, teeth and tongue are not drawn beyond DETAIL_DIST.
const LOW_DETAIL = 0.35; const LOD_DIST = 22; const DETAIL_DIST = 16;
const DETAIL_KINDS = new Set(['lash', 'cornea', 'tear', 'teeth', 'tongue']);
const SPAWN = { x: 0, z: HALL_SIZE / 2 - 10 };
// Plinths may be moved anywhere inside the gallery, keeping clear of its walls and doorway.
const POD_X = ANNEX.maxX - 5; const POD_NEAR = ANNEX.nearZ - 8; const POD_FAR = ANNEX.farZ + 6;
// Right-handed scene so the gameplay maths (yaw, +Z toward the player) are unchanged from the original renderer.

export function createGame(mode = 'play') {
  const BAB = window.BABYLON;
  if (!BAB) throw new Error('Babylon.js failed to load');
  const editing = mode === 'edit';
  const previousRoot = document.getElementById('waifu-assembler-root');
  if (previousRoot) previousRoot.remove();

  const root = document.createElement('div');
  root.id = 'waifu-assembler-root';
  root.innerHTML = uiMarkup(editing);
  document.body.appendChild(root);
  installStyles();

  const config = window.gameConfig || {};
  const speed = clamp(Number(config.settings?.walkSpeed) || 9, 3, 18);
  const useRange = clamp(Number(config.settings?.interactRange) || 3.6, 2.2, 6);
  const volumeOf = (value, fallback) => clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, 0, 1);
  // Theme music and sound effects; edit mode stays silent.
  // Player preferences (Settings panel), saved with progress; the creator's config gives the defaults.
  const prefs = { music: volumeOf(config.settings?.musicVolume, 0.35), sfx: volumeOf(config.settings?.sfxVolume, 0.8), muted: false, look: 1, quality: 'high' };
  const audio = createAudio({ enabled: !editing, musicVolume: prefs.music, sfxVolume: prefs.sfx });
  const podiumPositions = {};
  for (const set of SETS) {
    const raw = config.podiumPositions?.[set.id] || INITIAL_PODIUMS[set.id];
    podiumPositions[set.id] = [clamp(Number(raw[0]) || 0, -POD_X, POD_X), clamp(Number(raw[1]) || -100, POD_FAR, POD_NEAR)];
  }
  if (editing) {
    window.gameConfig ||= {};
    window.gameConfig.settings ||= { walkSpeed: 9, interactRange: 3.6, musicVolume: 0.35, sfxVolume: 0.8 };
    window.gameConfig.podiumPositions = clonePositions(podiumPositions);
  }
  function setSetting(key, value) { window.gameConfig ||= {}; window.gameConfig.settings ||= {}; window.gameConfig.settings[key] = value; }
  try {
    window.lib?.showGameParameters?.({
      name: 'Restoration Atelier',
      params: {
        'Walk speed': { key: 'settings.walkSpeed', type: 'slider', min: 4, max: 14, step: 1 },
        'Pickup range': { key: 'settings.interactRange', type: 'slider', min: 2.5, max: 5.5, step: 0.5 },
        'Music volume': { key: 'settings.musicVolume', type: 'slider', min: 0, max: 1, step: 0.05, onChange: (v) => { setSetting('musicVolume', v); audio.setVolumes({ music: volumeOf(v, 0.35) }); } },
        'Sound volume': { key: 'settings.sfxVolume', type: 'slider', min: 0, max: 1, step: 0.05, onChange: (v) => { setSetting('sfxVolume', v); audio.setVolumes({ sfx: volumeOf(v, 0.8) }); } },
      },
    });
  } catch (error) { window.lib?.log?.(`Settings panel: ${error.message}`); }

  // ---------- engine, scene, camera ----------
  const canvas = document.createElement('canvas');
  canvas.className = 'game-canvas';
  root.prepend(canvas);
  let engine;
  try {
    engine = new BAB.Engine(canvas, true, { stencil: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }, false);
  } catch (error) {
    root.innerHTML = `<div class="fatal"><b>3D atelier is taking a breather</b><span>This device could not start its 3D view. Please try again.</span><small>${escapeHtml(error.message)}</small></div>`;
    return () => root.remove();
  }
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new BAB.Scene(engine);
  scene.useRightHandedSystem = true;
  scene.skipPointerMovePicking = true;
  scene.clearColor = BAB.Color4.FromHexString('#d6cdbfff');
  scene.fogMode = BAB.Scene.FOGMODE_EXP2;
  scene.fogColor = BAB.Color3.FromHexString('#d3c9b9');
  scene.fogDensity = 0.0028;
  scene.ambientColor = BAB.Color3.FromHexString('#3a352e');

  const camera = new BAB.FreeCamera('eye', new BAB.Vector3(SPAWN.x, EYE_HEIGHT, SPAWN.z), scene);
  camera.inputs.clear();
  camera.minZ = 0.08; camera.maxZ = 320;
  camera.fov = BAB.Tools.ToRadians(editing ? 102 : 74);
  scene.activeCamera = camera;

  // ---------- lighting: soft daylight from skylights and tall windows ----------
  const hemi = new BAB.HemisphericLight('hemi', new BAB.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.56; hemi.diffuse = BAB.Color3.FromHexString('#fbefdc'); hemi.groundColor = BAB.Color3.FromHexString('#7d705e'); hemi.specular = BAB.Color3.FromHexString('#1a1712');
  // the sun falls through the gallery skylight; its shadow map covers the plinths
  const key = new BAB.DirectionalLight('key', new BAB.Vector3(-0.32, -1, -0.22).normalize(), scene);
  key.position = new BAB.Vector3(20, 60, -100);
  key.diffuse = BAB.Color3.FromHexString('#ffe6c4'); key.intensity = 1.1;
  key.autoUpdateExtends = false; key.orthoLeft = -32; key.orthoRight = 32; key.orthoBottom = -56; key.orthoTop = 56; key.shadowMinZ = 4; key.shadowMaxZ = 130;
  const fill = new BAB.DirectionalLight('fill', new BAB.Vector3(0.4, -0.45, 0.8).normalize(), scene);
  fill.diffuse = BAB.Color3.FromHexString('#d8e0ee'); fill.intensity = 0.28; fill.specular = BAB.Color3.Black();
  const shadows = new BAB.ShadowGenerator(2048, key);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = BAB.ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.0006; shadows.normalBias = 0.02; shadows.setDarkness(0.35);
  // The plinths and statues only change when a part is placed, so the shadow map is redrawn on demand, not every frame.
  shadows.getShadowMap().refreshRate = BAB.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  const refreshShadows = () => shadows.getShadowMap().resetRefreshCounter();

  let hallEnv = setupStudioReflections(scene, BAB, 'daylight', new BAB.Vector3(0, 4, -100));

  // ---------- cinematic post-processing ----------
  let pipeline = null;
  try {
    pipeline = new BAB.DefaultRenderingPipeline('cinema', true, scene, [camera]);
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = true; pipeline.bloomThreshold = 0.96; pipeline.bloomWeight = 0.1; pipeline.bloomKernel = 48; pipeline.bloomScale = 0.5;
    pipeline.imageProcessingEnabled = true;
  } catch (error) { window.lib?.log?.(`Post-processing unavailable: ${error.message}`); }
  const ip = scene.imageProcessingConfiguration;
  ip.toneMappingEnabled = true; ip.toneMappingType = BAB.ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 0.92; ip.contrast = 1.08;
  ip.vignetteEnabled = true; ip.vignetteWeight = 1.1; ip.vignetteStretch = 0.5; ip.vignetteColor = new BAB.Color4(0.25, 0.18, 0.1, 0); ip.vignetteBlendMode = BAB.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
  scene.setRenderingAutoClearDepthStencil(1, true, true, true);

  // ---------- world ----------
  // In-game statues are seen from a few metres away: their painted faces use a 1024 x 512 texture (the studio keeps 2048).
  const kit = createStatueKit(scene, { faceScale: 0.5 });
  const world = buildWorld(scene, shadows, SETS);
  if (editing) for (const ceiling of world.ceilings) ceiling.setEnabled(false); // overhead layout view must see the gallery floor
  // Statues and fragments are built in stages by boot() (one statue per frame) behind the 3D loading screen.
  const podiums = new Map(); const niches = new Map();
  const fragments = new Map();
  // one museum card floats over the fragment the visitor is looking for
  const nearLabel = makeLabel(scene, '', '#c9a466', 3.6, 0.9); nearLabel.mesh.setEnabled(false);

  // The polished gallery marble relies on its specular sheen and the daylight probe instead of a mirror pass:
  // re-rendering twelve statues every other frame would double the gallery's draw calls on phones.

  // Ambient sakura petals + one reusable sparkle burst
  const petals = new BAB.ParticleSystem('petals', 240, scene);
  petals.particleTexture = petalTexture(scene);
  const petalEmitter = new BAB.Vector3(0, 0, 32);
  petals.emitter = petalEmitter;
  petals.minEmitBox = new BAB.Vector3(-30, 9, -30); petals.maxEmitBox = new BAB.Vector3(30, 13, 30);
  petals.direction1 = new BAB.Vector3(-0.5, -1, -0.2); petals.direction2 = new BAB.Vector3(0.2, -1, 0.5);
  petals.minEmitPower = 0.5; petals.maxEmitPower = 1.0; petals.minLifeTime = 10; petals.maxLifeTime = 15; petals.emitRate = 9;
  petals.minSize = 0.14; petals.maxSize = 0.3; petals.minAngularSpeed = -2.2; petals.maxAngularSpeed = 2.2;
  petals.color1 = new BAB.Color4(1, 0.88, 0.94, 0.95); petals.color2 = new BAB.Color4(1, 0.66, 0.82, 0.95); petals.colorDead = new BAB.Color4(1, 0.8, 0.9, 0);
  petals.gravity = new BAB.Vector3(0.12, -0.25, 0.08); petals.preWarmCycles = 120; petals.preWarmStepOffset = 8; petals.updateSpeed = 0.016;
  petals.blendMode = BAB.ParticleSystem.BLENDMODE_STANDARD;
  if (!editing) petals.start();

  const burst = new BAB.ParticleSystem('burst', 220, scene);
  burst.particleTexture = starTexture(scene);
  const burstEmitter = new BAB.Vector3();
  burst.emitter = burstEmitter; burst.createSphereEmitter(0.35);
  burst.minEmitPower = 2.5; burst.maxEmitPower = 6.5; burst.minLifeTime = 0.6; burst.maxLifeTime = 1.4; burst.emitRate = 0;
  burst.minSize = 0.14; burst.maxSize = 0.4; burst.gravity = new BAB.Vector3(0, -5, 0);
  burst.color1 = new BAB.Color4(1, 1, 1, 1); burst.color2 = new BAB.Color4(1, 0.8, 0.95, 1); burst.colorDead = new BAB.Color4(1, 1, 1, 0);
  burst.blendMode = BAB.ParticleSystem.BLENDMODE_ADD; burst.updateSpeed = 0.016;
  burst.start();
  const sparkle = (position, color, count = 70) => {
    burstEmitter.copyFrom(position);
    const c = BAB.Color3.FromHexString(color);
    burst.color1 = new BAB.Color4(c.r, c.g, c.b, 1);
    burst.manualEmitCount = count;
  };

  const state = createInitialState();
  const player = { x: SPAWN.x, z: SPAWN.z, yaw: 0, pitch: -0.06 };
  const eye = { y: EYE_HEIGHT };
  const fwdTmp = new BAB.Vector3(); const aimTmp = new BAB.Vector3();
  const forwardVec = () => fwdTmp.set(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch));
  const aimCamera = (y = EYE_HEIGHT) => {
    camera.position.set(player.x, y, player.z);
    camera.setTarget(camera.position.addToRef(forwardVec(), aimTmp));
  };
  if (editing) {
    camera.position.set(0, 88, (ANNEX.nearZ + ANNEX.farZ) / 2);
    camera.setTarget(new BAB.Vector3(0, 0, (ANNEX.nearZ + ANNEX.farZ) / 2 - 0.01));
  } else aimCamera();

  const ui = {
    progress: root.querySelector('#progress-count'), status: root.querySelector('#status-message'),
    target: root.querySelector('#target-info'), action: root.querySelector('#mobile-action'),
    actionLabel: root.querySelector('#action-label'), toast: root.querySelector('#toast'),
    blueprint: root.querySelector('#blueprint-card'), blueprintTitle: root.querySelector('#blueprint-title'),
    blueprintBody: root.querySelector('#blueprint-drawing'), blueprintFoot: root.querySelector('#blueprint-foot'),
    map: root.querySelector('#mini-map'), editorMap: root.querySelector('#editor-map'), clock: root.querySelector('#statue-clock'),
    selected: root.querySelector('#editor-selected'), editorCoords: root.querySelector('#editor-coords'),
  };
  const miniCtx = ui.map.getContext('2d');
  const editorCtx = ui.editorMap?.getContext('2d');
  let refreshEditorMap = () => {};
  let carriedVisual = null;
  let selectedEditorSet = SETS[0].id;
  let stateChangedAt = 0;
  let toastUntil = 0;
  let hasInteracted = false;
  let finishedShown = false;
  let disposed = false;
  let ready = false; // the gallery and fragments exist
  let phase = 'loading'; // loading → menu ⇄ play (edit mode: loading → edit)
  let playSeconds = 0; // restoration time, counted only while playing
  let bestSeconds = null;
  // Meta progress outlives a NEW RUN: the best medal per statue, the statues ever restored (Studio portraits),
  // stars from daily challenges and the daily streak. statueTimes is this run's medal clock per statue.
  const freshMeta = () => ({ medals: {}, restored: [], dailyStars: 0, daily: null, streak: 0, lastDailyDay: null, tutorialDone: false });
  const meta = freshMeta();
  let statueTimes = {};
  let clocking = []; // statues whose clock is running: a piece collected, not yet whole
  const pars = Object.fromEntries(SETS.map((set) => [set.id, statuePar(set.id, podiumPositions[set.id], speed)]));
  const containers = new Map(); // fragment key → chest / curtained alcove hiding it
  let puzzle = null; // the turn-and-fit puzzle in progress
  let lastFrame = performance.now();
  let lookPointer = null;
  let editPointer = null;
  let stickPointer = null;
  const stick = { x: 0, y: 0 };
  const keys = new Set();

  const toast = (message, tone = 'normal', ms = 2300) => {
    ui.toast.textContent = message;
    ui.toast.dataset.tone = tone;
    ui.toast.classList.add('visible');
    toastUntil = performance.now() + ms;
    if (tone === 'success') safeHaptic('success');
    else if (tone === 'normal') safeHaptic('tap');
  };
  const safeHaptic = (effect) => { try { window.lib?.haptics?.play?.(effect); } catch { /* optional on the host */ } };
  let saveTimer = 0;
  // Coalesces bursts of pickups/placements into one save; `now` flushes immediately (menu, completion, settings).
  const saveProgress = (now = false) => {
    clearTimeout(saveTimer);
    if (!now) { saveTimer = setTimeout(() => saveProgress(true), 1500); return; }
    const save = window.lib?.saveUserGameState;
    if (!save) return;
    prefs.muted = audio.muted;
    const times = Object.fromEntries(Object.entries(statueTimes).map(([id, t]) => [id, Math.round(t * 10) / 10]));
    const payload = { waifuAssembler: serializeState(state), playSeconds: Math.round(playSeconds), bestSeconds, prefs: { ...prefs }, audioMuted: audio.muted, meta: { ...meta }, statueTimes: times };
    try { return Promise.resolve(save(payload)).catch(() => {}); } catch { return null; /* local play remains available */ }
  };
  // ---------- 3D hologram projection inside the HUD card ----------
  // The real statue, rebuilt with the hologram material, floats in front of the camera exactly behind the card's
  // transparent window; the component being carried glows red so the player sees where it belongs.
  const holo = { root: null, spin: null, key: null, base: Math.PI, sway: 0.6, rect: null, crect: null, rectAt: -1 };
  let layoutVersion = 0; // bumped on resize / HUD card changes so cached DOM rects are re-measured
  const heldMat = new BAB.StandardMaterial('holoHeld', scene);
  heldMat.disableLighting = true; heldMat.backFaceCulling = false; heldMat.alphaMode = BAB.Engine.ALPHA_COMBINE; heldMat.alpha = 0.85; heldMat.needDepthPrePass = true;
  heldMat.emissiveColor = BAB.Color3.FromHexString('#ff3d5e');
  heldMat.emissiveFresnelParameters = new BAB.FresnelParameters({ bias: 0.25, power: 1.6, leftColor: BAB.Color3.FromHexString('#ffd0da'), rightColor: BAB.Color3.FromHexString('#ff2a50') });
  const holoCache = new Map(); // setId → low-poly hologram statue, reused between carries
  const holoRingMat = new BAB.StandardMaterial('holoRing', scene); holoRingMat.disableLighting = true; holoRingMat.alpha = 0.9;
  const holoBeamMat = new BAB.StandardMaterial('holoBeamMat', scene); holoBeamMat.disableLighting = true; holoBeamMat.alpha = 0.08; holoBeamMat.backFaceCulling = false;
  function holoFigure(setId) {
    if (holoCache.has(setId)) return holoCache.get(setId);
    const pose = STATUE_POSES[setId];
    const root = new BAB.TransformNode('holoRoot', scene); const spin = new BAB.TransformNode('holoSpin', scene); spin.parent = root;
    const fig = new BAB.TransformNode('holoFig', scene); fig.parent = spin; fig.position.y = -2.15; // centre the 4.3-unit figure
    const parts = new Map();
    for (const part of PARTS) {
      const anchor = new BAB.TransformNode('holoAnchor', scene); anchor.parent = fig; anchor.position.set(...PART_OFFSET[part.id]);
      if (part.id === 'head' && pose.head) anchor.rotation.set(...pose.head);
      const mesh = buildStatuePart(kit, scene, part.id, setId, true, undefined, LOW_DETAIL); mesh.parent = anchor; // small on screen: low-poly is plenty
      parts.set(part.id, mesh.getChildMeshes());
    }
    for (const [d, y, t] of [[2.2, -2.15, 0.05], [1.5, -2.1, 0.03]]) {
      const ring = BAB.MeshBuilder.CreateTorus('holoRing', { diameter: d, thickness: t, tessellation: 48 }, scene); ring.parent = spin; ring.position.y = y; ring.material = holoRingMat;
    }
    const beam = BAB.MeshBuilder.CreateCylinder('holoBeam', { height: 4.4, diameterTop: 1.6, diameterBottom: 2.1, tessellation: 32, cap: BAB.Mesh.NO_CAP }, scene);
    beam.material = holoBeamMat; beam.parent = spin;
    for (const m of root.getChildMeshes()) { m.renderingGroupId = 1; m.isPickable = false; }
    root.setEnabled(false);
    const entry = { root, spin, parts }; holoCache.set(setId, entry); return entry;
  }
  function rebuildHologram() {
    const key = state.carried;
    if (key === holo.key) return;
    holo.root?.setEnabled(false); holo.root = null;
    holo.key = key;
    if (!key) return;
    const fragment = getFragment(key); const h = holoFigure(fragment.setId);
    const ghostMat = kit.holoMaterial(fragment.setId);
    for (const [partId, meshes] of h.parts) for (const m of meshes) m.material = partId === fragment.partId ? heldMat : ghostMat;
    const c = BAB.Color3.FromHexString(getSet(fragment.setId).color);
    holoRingMat.emissiveColor = c.scale(1.1); holoBeamMat.emissiveColor = c;
    holo.root = h.root; holo.spin = h.spin;
  }
  function updateHologram(now) {
    if (!holo.root) return;
    if (!holo.rect || holo.rectAt < layoutVersion) { holo.rect = ui.blueprintBody.getBoundingClientRect(); holo.crect = canvas.getBoundingClientRect(); holo.rectAt = layoutVersion; }
    const rect = holo.rect; const crect = holo.crect; // measured once per layout change, not every frame
    if (!rect.height) { holo.root.setEnabled(false); holo.rectAt = -1; return; }
    holo.root.setEnabled(true);
    const dist = 4;
    const ray = scene.createPickingRay(rect.left + rect.width / 2 - crect.left, rect.top + rect.height / 2 - crect.top, BAB.Matrix.Identity(), camera);
    holo.root.position.copyFrom(ray.origin.add(ray.direction.scale(dist)));
    const worldPerPx = (2 * dist * Math.tan(camera.fov / 2)) / crect.height;
    holo.root.scaling.setAll((rect.height * 0.92 * worldPerPx) / 4.4);
    if (!holo.root.rotationQuaternion) holo.root.rotationQuaternion = new BAB.Quaternion();
    holo.root.rotationQuaternion.copyFrom(camera.absoluteRotation);
    holo.spin.rotation.y = holo.base + Math.sin(now * 0.0007) * holo.sway;
    heldMat.alpha = 0.7 + Math.sin(now * 0.008) * 0.25;
  }
  const refreshPodiums = () => {
    for (const set of SETS) {
      const podium = podiums.get(set.id);
      const placed = state.placed[set.id] || [];
      const medal = placed.length === PARTS.length && meta.medals[set.id];
      podium.label.setText(medal ? `${set.name}  ·  ${medal.toUpperCase()}` : `${set.name}  ·  ${placed.length}/5`);
      if (!podium.merged) for (const part of PARTS) {
        const built = placed.includes(part.id);
        const entry = podium.figureParts.get(part.id);
        entry.ghost.setEnabled(!built);
        entry.solid.setEnabled(built);
      }
      podium.finished.setEnabled(placed.length === PARTS.length);
      podium.motes.emitRate = placed.length ? 2 + placed.length * 3 : 0;
      refreshShadows();
    }
  };
  const refreshFragments = () => {
    for (const fragment of FRAGMENTS) {
      const model = fragments.get(fragment.key);
      model.absent = model.gone || state.collected.includes(fragment.key) || state.placed[fragment.setId]?.includes(fragment.partId);
      model.locked = Boolean(model.container) && !state.revealed.includes(fragment.key);
      if (!model.gone) { model.root.setEnabled(!model.absent); model.shown = !model.absent; model.spin.setEnabled(!model.locked); }
      const box = model.container;
      if (box && !model.locked && !box.opened && !box.opening) { box.animate(1); box.opened = true; } // opened in an earlier session
    }
    clocking = SETS.filter((set) => (state.placed[set.id]?.length || 0) < PARTS.length && state.collected.some((k) => k.startsWith(`${set.id}:`))).map((set) => set.id);
    nearestCache.at = -1;
    if (carriedVisual) {
      carriedVisual.dispose(false, false);
      carriedVisual = null;
    }
    if (state.carried) {
      const fragment = getFragment(state.carried);
      const source = fragments.get(state.carried)?.spin.getChildren()[0];
      carriedVisual = source ? source.clone('carried', null) : buildStatuePart(kit, scene, fragment.partId, fragment.setId, false);
      carriedVisual.setEnabled(true); for (const m of carriedVisual.getChildMeshes()) m.setEnabled(true);
      carriedVisual.position.setAll(0); carriedVisual.scaling.setAll(0.19);
      for (const m of carriedVisual.getChildMeshes()) m.renderingGroupId = 1;
    }
    refreshPodiums();
    updateBlueprint();
  };
  function updateBlueprint() {
    rebuildHologram();
    if (!state.carried) {
      ui.blueprint.classList.remove('shown');
      return;
    }
    const fragment = getFragment(state.carried);
    const set = getSet(fragment.setId);
    const part = PARTS.find((item) => item.id === fragment.partId);
    ui.blueprint.classList.add('shown'); layoutVersion += 1; setTimeout(() => { layoutVersion += 1; }, 260); // after the card's slide-in
    ui.blueprintTitle.textContent = set.name;
    ui.blueprintFoot.textContent = `HELD COMPONENT  /  ${part.short}`;
    ui.blueprint.style.setProperty('--holo', set.color);
  }
  // Saved progress and preferences are requested right away and applied once the gallery is built.
  const savedGame = (async () => {
    if (editing) return null;
    try {
      const getSave = window.lib?.getUserGameState;
      if (!getSave) return null;
      const response = await Promise.race([Promise.resolve(getSave()), new Promise((resolve) => setTimeout(() => resolve(null), 6000))]);
      return response?.state || null;
    } catch { return null; } // a first-time player has a clean statue atelier
  })();

  const setHTML = (el, html) => { if (el.__html !== html) { el.innerHTML = html; el.__html = html; } }; // skip identical DOM writes
  let shownCount = -1;
  const updateHUD = () => {
    const count = countPlaced(state);
    if (count !== shownCount) { // the counter pops whenever a part is placed
      ui.progress.textContent = `${count} / ${FRAGMENTS.length}`;
      if (shownCount >= 0 && count > shownCount) { ui.progress.classList.remove('pop'); void ui.progress.offsetWidth; ui.progress.classList.add('pop'); }
      shownCount = count;
    }
    const nearest = nearestAvailable();
    if (state.carried) {
      const fragment = getFragment(state.carried);
      const set = getSet(fragment.setId);
      const podium = podiums.get(set.id);
      const dist = distance2(player.x, player.z, podium.group.position.x, podium.group.position.z);
      const inRange = dist <= 5.2;
      setHTML(ui.status, `<b>${inRange ? 'PLINTH IN RANGE' : 'TO THE GALLERY'}</b><span>${set.name} &nbsp;·&nbsp; ${Math.ceil(dist)}m to its plinth</span>`);
      setHTML(ui.target, `<i class="target-dot" style="--dot:${set.color}"></i><span>Carry <b>${fragment.partId.replace('armL', 'left arm').replace('armR', 'right arm')}</b> to its matching plinth</span>`);
      const t = statueTimes[set.id] || 0; const pace = medalFor(t, pars[set.id]);
      setHTML(ui.clock, `⏱ ${formatTime(t)} &nbsp;·&nbsp; GOLD ≤ ${formatTime(pars[set.id])}<i class="${pace}">${pace.toUpperCase()}</i>`);
      ui.action.disabled = !inRange;
      ui.action.classList.toggle('ready', inRange);
      ui.actionLabel.textContent = inRange ? 'ASSEMBLE' : 'RESTORE';
      ui.action.setAttribute('aria-label', inRange ? 'Place part on its matching podium' : 'Carry part to its podium');
    } else if (nearest) {
      const set = getSet(nearest.fragment.setId);
      const dist = Math.hypot(nearest.distance, 0);
      const angle = Math.atan2(nearest.fragment.x - player.x, -(nearest.fragment.z - player.z)) - player.yaw;
      const arrow = Math.abs(angle) < .35 ? '↑' : Math.abs(angle) < 1.15 ? (angle > 0 ? '↗' : '↖') : Math.abs(angle) < 2.35 ? (angle > 0 ? '→' : '←') : '↓';
      const close = dist <= useRange;
      const hidden = nearest.locked ? HIDDEN_FRAGMENTS[nearest.fragment.key] : null;
      const where = hidden === 'chest' ? 'locked in a chest' : 'behind a velvet curtain';
      setHTML(ui.status, `<b>${close ? (hidden ? 'SOMETHING IS HIDDEN HERE' : 'FRAGMENT NEARBY') : 'SEARCH THE HALL'}</b><span>${set.name} &nbsp;·&nbsp; ${Math.ceil(dist)}m away</span>`);
      setHTML(ui.target, `<i class="target-dot" style="--dot:${set.color}"></i><span>${arrow} &nbsp;${set.name} / ${hidden ? `<b>?</b> ${where}` : nearest.part.label}</span>`);
      ui.action.disabled = !close;
      ui.action.classList.toggle('ready', close);
      ui.actionLabel.textContent = close ? (hidden ? 'OPEN' : 'COLLECT') : 'SEARCH';
      ui.action.setAttribute('aria-label', close ? (hidden ? `Open the ${hidden === 'chest' ? 'chest' : 'curtain'}` : `Collect ${nearest.part.label}`) : 'Find the highlighted statue fragment');
    } else {
      setHTML(ui.status, `<b>RESTORATION COMPLETE</b><span>All ${SETS.length} figures are ready for display</span>`);
      setHTML(ui.target, `<i class="target-dot" style="--dot:#80e8ce"></i><span>Every piece has found its home. Lovely work.</span>`);
      ui.action.disabled = true;
      ui.actionLabel.textContent = 'COMPLETE';
    }
    drawMiniMap();
  };
  const nearestCache = { at: -1, x: 0, z: 0, value: null };
  function nearestAvailable() { // cached per position; fragments only change through refreshFragments()
    if (nearestCache.at >= 0 && nearestCache.x === player.x && nearestCache.z === player.z) return nearestCache.value;
    nearestCache.value = findNearest(); nearestCache.at = 1; nearestCache.x = player.x; nearestCache.z = player.z;
    return nearestCache.value;
  }
  function findNearest() {
    let best = null;
    for (const fragment of FRAGMENTS) {
      if (fragments.get(fragment.key)?.absent) continue;
      const distance = Math.hypot(player.x - fragment.x, player.z - fragment.z);
      if (!best || distance < best.distance) best = { fragment, distance, part: PARTS.find((part) => part.id === fragment.partId), locked: Boolean(fragments.get(fragment.key)?.locked) };
    }
    return best;
  }
  function drawMiniMap() {
    const ctx = miniCtx;
    const w = ui.map.width;
    const h = ui.map.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(24,19,14,.86)';
    roundRect(ctx, 1, 1, w - 2, h - 2, 18); ctx.fill();
    // true-scale plan: the gallery north of the hall, joined by its doorway
    const half = HALL_SIZE / 2; const north = ANNEX.farZ; const span = half - north;
    const k = Math.min((w - 24) / HALL_SIZE, (h - 30) / span);
    const ox = w / 2; const oy = 8 - north * k;
    const px = (x) => ox + x * k; const pz = (z) => oy + z * k;
    ctx.fillStyle = 'rgba(236,226,206,.13)'; ctx.strokeStyle = 'rgba(232,214,180,.55)'; ctx.lineWidth = 1;
    ctx.fillRect(px(-half), pz(-half), HALL_SIZE * k, HALL_SIZE * k); ctx.strokeRect(px(-half), pz(-half), HALL_SIZE * k, HALL_SIZE * k);
    ctx.fillStyle = 'rgba(244,238,226,.2)'; ctx.fillRect(px(ANNEX.minX), pz(north), (ANNEX.maxX - ANNEX.minX) * k, (-half - north) * k);
    ctx.strokeRect(px(ANNEX.minX), pz(north), (ANNEX.maxX - ANNEX.minX) * k, (-half - north) * k);
    ctx.fillStyle = 'rgba(24,19,14,1)'; ctx.fillRect(px(-GALLERY_DOOR), pz(-half) - 1.5, GALLERY_DOOR * 2 * k, 3);
    for (const set of SETS) {
      const p = podiums.get(set.id).group.position; const done = (state.placed[set.id]?.length || 0) === PARTS.length;
      ctx.beginPath(); ctx.arc(px(p.x), pz(p.z), 2.6, 0, Math.PI * 2);
      ctx.fillStyle = set.color; ctx.globalAlpha = done ? 1 : 0.55; ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = done ? '#ffe2a8' : 'rgba(255,255,255,.5)'; ctx.stroke();
    }
    for (const f of FRAGMENTS) {
      if (state.collected.includes(f.key) || state.placed[f.setId]?.includes(f.partId)) continue;
      if (fragments.get(f.key)?.locked) { // secrets show as a "?" until their chest or curtain is opened
        ctx.globalAlpha = 1; ctx.fillStyle = '#f2c35f'; ctx.font = '900 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', px(f.x), pz(f.z)); ctx.textBaseline = 'alphabetic'; continue;
      }
      ctx.beginPath(); ctx.arc(px(f.x), pz(f.z), 1.8, 0, Math.PI * 2);
      ctx.fillStyle = getSet(f.setId).color; ctx.globalAlpha = 0.93; ctx.fill();
    }
    ctx.globalAlpha = 1;
    const x = px(player.x), y = pz(player.z);
    ctx.save(); ctx.translate(x, y); ctx.rotate(player.yaw);
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 3); ctx.lineTo(-5, 5); ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffd98a'; ctx.shadowBlur = 8; ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(232,222,204,.75)'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`HALL ${HALL_SIZE}×${HALL_SIZE}`, 10, h - 7);
    ctx.textAlign = 'right'; ctx.fillText('GALLERY ▲', w - 10, h - 7); ctx.textAlign = 'left';
  }

  const editorPanel = root.querySelector('#editor-panel');
  if (editing) {
    editorPanel.classList.add('shown');
    const drawEditorMap = () => {
      const ctx = editorCtx;
      const w = ui.editorMap.width, h = ui.editorMap.height;
      ctx.clearRect(0, 0, w, h);
      roundRect(ctx, 1, 1, w - 2, h - 2, 18);
      ctx.fillStyle = 'rgba(24,19,13,.97)'; ctx.fill();
      // The gallery is ANNEX wide x long; plinths line both sides of the central aisle.
      const left = 20, top = 18, rw = w - 40, rh = h - 36;
      ctx.fillStyle = '#2a211a'; ctx.fillRect(left, top, rw, rh);
      ctx.strokeStyle = 'rgba(228,185,100,.55)'; ctx.lineWidth = 2; ctx.strokeRect(left, top, rw, rh);
      ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(196,171,120,.15)'; ctx.beginPath(); ctx.moveTo(w / 2, top + 12); ctx.lineTo(w / 2, top + rh - 12); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(234,221,196,.42)'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('CENTRAL AISLE', w / 2, h / 2 + 3);
      ctx.font = '700 8px system-ui'; ctx.fillStyle = 'rgba(201,180,139,.54)'; ctx.fillText('SCULPTURE GALLERY · ENTRANCE AT THE TOP', w / 2, h - 5);
      for (const set of SETS) {
        const pos = podiumPositions[set.id];
        const x = left + (pos[0] - ANNEX.minX) / (ANNEX.maxX - ANNEX.minX) * rw;
        const y = top + (ANNEX.nearZ - pos[1]) / (ANNEX.nearZ - ANNEX.farZ) * rh;
        const isSelected = selectedEditorSet === set.id;
        ctx.beginPath(); ctx.arc(x, y, isSelected ? 25 : 21, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? `${set.color}42` : 'rgba(33,26,20,.96)'; ctx.fill();
        ctx.lineWidth = isSelected ? 3 : 2; ctx.strokeStyle = set.color; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(isSelected ? '↕' : '✦', x, y);
        ctx.textBaseline = 'alphabetic';
      }
      const selected = getSet(selectedEditorSet);
      ui.selected.innerHTML = `<i class="target-dot" style="--dot:${selected.color}"></i> SELECTED: <b>${selected.name}</b>`;
      ui.editorCoords.textContent = `X ${Math.round(podiumPositions[selected.id][0])}  /  Z ${Math.round(podiumPositions[selected.id][1])}`;
      root.querySelectorAll('[data-editor-set]').forEach((button) => button.classList.toggle('active', button.dataset.editorSet === selected.id));
      for (const set of SETS) podiums.get(set.id).selection.setEnabled(set.id === selected.id);
    };
    const setEditorSelected = (setId) => { selectedEditorSet = setId; drawEditorMap(); };
    root.querySelectorAll('[data-editor-set]').forEach((button) => button.addEventListener('click', () => setEditorSelected(button.dataset.editorSet)));
    const writeEditorConfig = () => {
      window.gameConfig.podiumPositions = clonePositions(podiumPositions);
    };
    refreshEditorMap = drawEditorMap; // first drawn by boot() once the plinths exist
    ui.editorMap.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const rect = ui.editorMap.getBoundingClientRect();
      const mx = (event.clientX - rect.left) * (ui.editorMap.width / rect.width);
      const my = (event.clientY - rect.top) * (ui.editorMap.height / rect.height);
      const w = ui.editorMap.width, h = ui.editorMap.height;
      const left = 20, top = 18, rw = w - 40, rh = h - 36;
      let nearest = null;
      for (const set of SETS) {
        const pos = podiumPositions[set.id];
        const x = left + (pos[0] - ANNEX.minX) / (ANNEX.maxX - ANNEX.minX) * rw;
        const y = top + (ANNEX.nearZ - pos[1]) / (ANNEX.nearZ - ANNEX.farZ) * rh;
        const d = Math.hypot(mx - x, my - y);
        if (!nearest || d < nearest.distance) nearest = { id: set.id, distance: d };
      }
      if (nearest && nearest.distance < 39) {
        selectedEditorSet = nearest.id;
        editPointer = event.pointerId;
        ui.editorMap.setPointerCapture(event.pointerId);
        dragEditorPodium(event);
        drawEditorMap();
      }
    });
    ui.editorMap.addEventListener('pointermove', (event) => { if (editPointer === event.pointerId) { dragEditorPodium(event); drawEditorMap(); } });
    ui.editorMap.addEventListener('pointerup', (event) => { if (editPointer === event.pointerId) { editPointer = null; writeEditorConfig(); } });
    ui.editorMap.addEventListener('pointercancel', () => { editPointer = null; });
    function dragEditorPodium(event) {
      const rect = ui.editorMap.getBoundingClientRect();
      const mx = (event.clientX - rect.left) * (ui.editorMap.width / rect.width);
      const my = (event.clientY - rect.top) * (ui.editorMap.height / rect.height);
      const left = 20, top = 18, rw = ui.editorMap.width - 40, rh = ui.editorMap.height - 36;
      const x = ANNEX.minX + (mx - left) / rw * (ANNEX.maxX - ANNEX.minX);
      const z = ANNEX.nearZ - (my - top) / rh * (ANNEX.nearZ - ANNEX.farZ);
      podiumPositions[selectedEditorSet] = [clamp(x, -POD_X, POD_X), clamp(z, POD_FAR, POD_NEAR)];
      movePodium(selectedEditorSet, podiumPositions[selectedEditorSet]);
      writeEditorConfig();
    }
  }
  function movePodium(setId, position) {
    const podium = podiums.get(setId);
    podium.group.position.set(position[0], 0, position[1]);
    podium.face(); refreshShadows();
    podium.motes.emitter = new BAB.Vector3(position[0], 0.8, position[1]);
    niches.get(setId)?.dispose(false, true);
    niches.set(setId, world.niche(getSet(setId), position[0], position[1]));
  }

  function updateAction() {
    if (editing || phase !== 'play' || puzzle) return;
    if (!state.carried) {
      const target = nearestAvailable();
      if (!target || target.distance > useRange) return;
      if (target.locked) { openContainer(target.fragment, target.part); return; }
      const next = pickup(state, target.fragment.key);
      if (next === state) return;
      hasInteracted = true;
      Object.assign(state, next);
      const model = fragments.get(target.fragment.key);
      const from = model.spin.getAbsolutePosition().clone();
      sparkle(from, getSet(target.fragment.setId).color, 60);
      refreshFragments(); saveProgress(); updateHUD();
      carriedFly = { start: performance.now(), from, scale: 0.8 }; // the part lifts off its plinth into the visitor's hand
      kick(0.035); safeHaptic('tap');
      const set = getSet(target.fragment.setId);
      toast(`${target.part.label} recovered · ${set.name}`, 'success');
      audio.play('pickup', { rate: 0.94 + Math.random() * 0.12 });
      return;
    }
    const fragment = getFragment(state.carried);
    const podium = podiums.get(fragment.setId);
    if (distance2(player.x, player.z, podium.group.position.x, podium.group.position.z) > 5.2) {
      toast(`Take it to ${getSet(fragment.setId).name}'s plinth in the gallery`, 'normal');
      audio.play('notHere', { volume: 0.7 });
      return;
    }
    startPuzzle(fragment); // the part must be turned to match its socket before it can be assembled
  }
  // ---------- hidden pieces: chests and curtained alcoves ----------
  function openContainer(fragment, part) {
    const box = containers.get(fragment.key); const model = fragments.get(fragment.key);
    const next = reveal(state, fragment.key);
    if (!box || next === state) return;
    hasInteracted = true; Object.assign(state, next);
    const start = performance.now(); box.opening = true;
    effects.push((now) => { const t = Math.min(1, (now - start) / 820); box.animate(t); if (t >= 1) { box.opening = false; box.opened = true; return false; } return true; });
    model.rise = { start: start + 260 };
    refreshFragments(); updateHUD();
    const set = getSet(fragment.setId);
    sparkle(new BAB.Vector3(fragment.x, box.kind === 'chest' ? 1.3 : 2.2, fragment.z), '#ffe2a6', 90);
    setTimeout(() => sparkle(new BAB.Vector3(fragment.x, model.baseY, fragment.z), set.color, 70), 650);
    audio.play(box.kind === 'chest' ? 'chest' : 'curtain'); kick(0.03);
    toast(`Secret found · ${set.name} ${part.label}`, 'success');
    ensureDaily().reveals += 1; checkDaily(); saveProgress();
  }
  // ---------- turn-and-fit puzzle ----------
  // The carried part floats in front of the camera, turned away from its true orientation; a glowing outline shows
  // how it must sit. Turn it in 45° steps (buttons, swipe left/right, A/D) and flip it (swipe up/down, W/S) to fit.
  const fitEl = { panel: root.querySelector('#fit-panel'), title: root.querySelector('#fit-title'), target: root.querySelector('#fit-target') };
  // a dim velvet backdrop behind the puzzle keeps the part readable against the busy gallery
  const fitBackdrop = BAB.MeshBuilder.CreatePlane('fitBackdrop', { size: 14 }, scene);
  const fitBackdropMat = new BAB.StandardMaterial('fitBackdropMat', scene);
  Object.assign(fitBackdropMat, { disableLighting: true, backFaceCulling: false, fogEnabled: false, alpha: 0.86 }); fitBackdropMat.emissiveColor = BAB.Color3.FromHexString('#1e150e');
  fitBackdrop.material = fitBackdropMat; fitBackdrop.renderingGroupId = 1; fitBackdrop.isPickable = false; fitBackdrop.setEnabled(false);
  const qTmp = { base: new BAB.Quaternion(), flip: new BAB.Quaternion(), yaw: new BAB.Quaternion() };
  const AXIS_X = new BAB.Vector3(1, 0, 0); const AXIS_Y = new BAB.Vector3(0, 1, 0);
  function startPuzzle(fragment) {
    if (!carriedVisual) { placeNow(fragment); return; }
    const p = puzzleStart(`${fragment.key}:${Math.floor(playSeconds)}`);
    const hand = carriedVisual.getAbsolutePosition().clone();
    // centre the part on its own bounds so it turns in place, then size it to fill the middle of the screen
    carriedVisual.parent = null; carriedVisual.position.setAll(0); carriedVisual.rotation.setAll(0); carriedVisual.scaling.setAll(1);
    carriedVisual.computeWorldMatrix(true); for (const m of carriedVisual.getChildMeshes()) m.computeWorldMatrix(true);
    const { min, max } = carriedVisual.getHierarchyBoundingVectors(true);
    const centre = min.add(max).scale(0.5); const size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z, 0.3);
    const rig = new BAB.TransformNode('fitRig', scene); rig.rotationQuaternion = new BAB.Quaternion();
    const inner = new BAB.TransformNode('fitInner', scene); inner.parent = rig; inner.position.copyFrom(centre.negate());
    carriedVisual.parent = inner;
    const ghostRig = new BAB.TransformNode('fitGhostRig', scene); ghostRig.rotationQuaternion = new BAB.Quaternion();
    const ghostInner = new BAB.TransformNode('fitGhostInner', scene); ghostInner.parent = ghostRig; ghostInner.position.copyFrom(inner.position);
    const ghost = carriedVisual.clone('fitGhost', ghostInner);
    const holoMat = kit.holoMaterial(fragment.setId);
    for (const m of ghost.getChildMeshes()) { m.material = holoMat; m.renderingGroupId = 1; m.isPickable = false; }
    puzzle = { fragment, yaw: p.yaw, flip: p.flip, vy: p.yaw * Math.PI / 4, vf: p.flip * Math.PI / 2, start: performance.now(), last: performance.now(), hand, rig, ghostRig, scale: 1.3 / size, solvedAt: 0, moves: 0 };
    fitBackdrop.setEnabled(true);
    keys.clear(); stick.x = 0; stick.y = 0; stickPointer = null; lookPointer = null; root.querySelector('#stick-nub').style.transform = 'translate(0,0)';
    hudEl.classList.add('fitting'); fitEl.panel.classList.remove('solved'); fitEl.panel.classList.add('shown');
    fitEl.title.textContent = `${getSet(fragment.setId).name} · ${PARTS.find((x) => x.id === fragment.partId).label}`;
    audio.play('rotate', { duration: 0.3, rate: 0.9 }); safeHaptic('tap');
    updatePuzzle(performance.now());
  }
  function turnPuzzle(dYaw, dFlip) {
    if (!puzzle || puzzle.solvedAt) return;
    puzzle.yaw += dYaw; puzzle.flip += dFlip; puzzle.moves += 1;
    audio.play('rotate', { duration: 0.24, rate: 0.92 + Math.random() * 0.16, volume: 0.8 }); safeHaptic('tap');
    if (puzzleSolved(puzzle)) {
      puzzle.solvedAt = performance.now();
      fitEl.panel.classList.add('solved'); fitEl.title.textContent = 'PERFECT FIT';
      setTimeout(() => {
        if (!puzzle || disposed) return;
        audio.play('fit'); safeHaptic('success'); kick(0.04);
        sparkle(puzzle.rig.getAbsolutePosition(), getSet(puzzle.fragment.setId).color, 80);
      }, 160);
      setTimeout(() => { if (puzzle && !disposed) placeNow(puzzle.fragment); }, 560);
    }
  }
  function endPuzzle() { // put the part back in the hand (cancel) or let placeNow take it
    if (!puzzle) return;
    if (carriedVisual) { carriedVisual.parent = null; carriedVisual.scaling.setAll(0.19); }
    puzzle.rig.dispose(false, false); puzzle.ghostRig.dispose(false, false);
    puzzle = null; hudEl.classList.remove('fitting'); fitEl.panel.classList.remove('shown', 'solved'); lastFrame = performance.now();
    fitBackdrop.setEnabled(false);
  }
  function cancelPuzzle() { if (!puzzle || puzzle.solvedAt) return; endPuzzle(); audio.play('tap', { volume: 0.5 }); }
  const fitPos = new BAB.Vector3(); const fitTarget = new BAB.Vector3(); const fitRight = new BAB.Vector3(); const fitUp = new BAB.Vector3(); const fitScreen = new BAB.Vector3();
  function updatePuzzle(now) {
    const dt = Math.min(0.1, (now - puzzle.last) / 1000); puzzle.last = now;
    const k = 1 - Math.exp(-dt * 13);
    puzzle.vy += (puzzle.yaw * Math.PI / 4 - puzzle.vy) * k; puzzle.vf += (puzzle.flip * Math.PI / 2 - puzzle.vf) * k;
    const fwd = forwardVec();
    fitRight.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw)); BAB.Vector3.CrossToRef(fitRight, fwd, fitUp);
    // the part sits low in the middle of the view; a small hologram of how it must sit floats at the upper right
    const halfW = Math.min(1.05, 2.5 * Math.tan(camera.fov / 2) * engine.getAspectRatio(camera));
    fitPos.copyFrom(camera.position).addInPlace(fwd.scale(2.5)).addInPlace(fitUp.scale(-0.3));
    fitTarget.copyFrom(camera.position).addInPlace(fwd.scale(2.5)).addInPlace(fitUp.scale(0.62)).addInPlace(fitRight.scale(halfW * 0.6));
    fitBackdrop.position.copyFrom(camera.position).addInPlace(fwd.scale(4.5));
    if (!fitBackdrop.rotationQuaternion) fitBackdrop.rotationQuaternion = new BAB.Quaternion();
    fitBackdrop.rotationQuaternion.copyFrom(camera.absoluteRotation);
    const intro = ease(Math.min(1, (now - puzzle.start) / 320)); // glides from the hand to the middle of the view
    fitBackdropMat.alpha = 0.86 * intro;
    BAB.Vector3.LerpToRef(puzzle.hand, fitPos, intro, puzzle.rig.position);
    const sc = 0.19 + (puzzle.scale - 0.19) * intro;
    BAB.Quaternion.RotationYawPitchRollToRef(player.yaw + 0.42, -0.12, 0, qTmp.base);
    BAB.Quaternion.RotationAxisToRef(AXIS_X, puzzle.vf, qTmp.flip); BAB.Quaternion.RotationAxisToRef(AXIS_Y, puzzle.vy, qTmp.yaw);
    qTmp.base.multiplyToRef(qTmp.flip, puzzle.rig.rotationQuaternion); puzzle.rig.rotationQuaternion.multiplyInPlace(qTmp.yaw);
    const pop = puzzle.solvedAt ? 1 + 0.12 * Math.sin(Math.min(1, (now - puzzle.solvedAt) / 300) * Math.PI) : 1;
    puzzle.rig.scaling.setAll(sc * pop);
    // once it fits, the target hologram swoops onto the part and melts into it
    const merge = puzzle.solvedAt ? ease(Math.min(1, (now - puzzle.solvedAt) / 260)) : 0;
    BAB.Vector3.LerpToRef(fitTarget, fitPos, merge, puzzle.ghostRig.position);
    puzzle.ghostRig.rotationQuaternion.copyFrom(qTmp.base);
    puzzle.ghostRig.scaling.setAll(puzzle.scale * (0.42 + 0.62 * merge) * intro);
    puzzle.ghostRig.setEnabled(!puzzle.solvedAt || now - puzzle.solvedAt < 280);
    if (carriedVisual) carriedVisual.position.setAll(0);
    // "TARGET" caption under the hologram
    BAB.Vector3.ProjectToRef(fitTarget, BAB.Matrix.IdentityReadOnly, scene.getTransformMatrix(), camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()), fitScreen);
    const kx = canvas.clientWidth / engine.getRenderWidth(); const ky = canvas.clientHeight / engine.getRenderHeight();
    fitEl.target.style.transform = `translate(${Math.round(fitScreen.x * kx)}px, ${Math.round(fitScreen.y * ky + puzzle.scale * 0.42 * 0.55 * canvas.clientHeight / (2 * 2.5 * Math.tan(camera.fov / 2)))}px) translate(-50%, 0)`;
    fitEl.target.style.opacity = puzzle.solvedAt ? '0' : String(intro);
  }
  // ---------- assembly, per-statue medals, daily challenge ----------
  const pad2 = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const dayBefore = (day) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() - 1); return dayKey(d); };
  function ensureDaily() {
    const day = dayKey();
    if (!meta.daily || meta.daily.day !== day) meta.daily = { day, done: false, reveals: 0, completions: [] };
    return meta.daily;
  }
  function checkDaily() {
    const daily = ensureDaily(); const challenge = dailyChallenge(daily.day);
    if (daily.done || !dailyMet(challenge, daily)) return;
    daily.done = true; meta.dailyStars += DAILY_STARS;
    meta.streak = meta.lastDailyDay === dayBefore(daily.day) ? meta.streak + 1 : 1; meta.lastDailyDay = daily.day;
    saveProgress(true);
    setTimeout(() => { if (disposed) return; toast(`Daily challenge complete · +${DAILY_STARS}★ · ${meta.streak}-day streak`, 'success', 3600); audio.play('medal', { volume: 0.8 }); }, 2600);
  }
  const MEDAL_COLOURS = { gold: '#f2c35f', silver: '#d4d9e1', bronze: '#c88a5a' };
  const medalMats = Object.fromEntries(Object.entries(MEDAL_COLOURS).map(([medal, hex]) => {
    const m = new BAB.PBRMaterial(`medal-${medal}`, scene); m.albedoColor = BAB.Color3.FromHexString(hex); m.metallic = 0.9; m.roughness = 0.28;
    m.emissiveColor = BAB.Color3.FromHexString(hex).scale(0.12); return [medal, m];
  }));
  function setMedalBadge(setId) { // a medal stands on the plinth's front edge once the statue has earned one
    const podium = podiums.get(setId); const medal = meta.medals[setId];
    if (!podium || !medal || podium.badgeMedal === medal) return;
    podium.badge?.dispose(false, false);
    const disc = BAB.MeshBuilder.CreateCylinder('medalBadge', { height: 0.06, diameter: 0.56, tessellation: 32 }, scene);
    const rim = BAB.MeshBuilder.CreateTorus('medalRim', { diameter: 0.56, thickness: 0.05, tessellation: 32 }, scene);
    rim.parent = disc; disc.material = medalMats[medal]; rim.material = medalMats[medal];
    disc.parent = podium.facing; disc.rotation.x = Math.PI / 2; disc.position.set(0, 1.1, 1.78);
    for (const m of [disc, rim]) { m.isPickable = false; m.computeWorldMatrix(true); m.freezeWorldMatrix(); }
    podium.badge = disc; podium.badgeMedal = medal;
  }
  const medalEl = { pop: root.querySelector('#medal-pop'), disc: root.querySelector('#medal-disc'), kind: root.querySelector('#medal-kind'), name: root.querySelector('#medal-name'), time: root.querySelector('#medal-time') };
  let medalTimer = 0;
  function showMedal(set, medal, seconds, improved) {
    medalEl.disc.className = `medal-disc ${medal}`;
    medalEl.kind.textContent = `${medal.toUpperCase()} MEDAL${improved ? ' · NEW BEST' : ''}`;
    medalEl.name.textContent = set.name;
    medalEl.time.textContent = `${formatTime(seconds)}  ·  gold ≤ ${formatTime(pars[set.id])}  ·  ★ ${countStars(meta)}`;
    medalEl.pop.classList.remove('shown'); void medalEl.pop.offsetWidth; medalEl.pop.classList.add('shown');
    clearTimeout(medalTimer); medalTimer = setTimeout(() => medalEl.pop.classList.remove('shown'), 3400);
    audio.play('medal', { volume: medal === 'gold' ? 1 : 0.8 });
  }
  function placeNow(fragment) {
    const podium = podiums.get(fragment.setId);
    const next = placeCarried(state, fragment.setId);
    if (next === state) return;
    hasInteracted = true;
    const hand = carriedVisual ? carriedVisual.getAbsolutePosition().clone() : null;
    endPuzzle();
    Object.assign(state, next);
    const set = getSet(fragment.setId);
    refreshFragments(); updateHUD();
    const count = state.placed[set.id].length; const done = count === PARTS.length;
    let medal = null; let improved = false; const seconds = Math.max(1, Math.round(statueTimes[set.id] || 0));
    if (done) { // the statue's clock stops: award its medal, remember the portrait, count it for today's challenge
      medal = medalFor(seconds, pars[set.id]); const prev = meta.medals[set.id];
      meta.medals[set.id] = betterMedal(prev, medal); improved = Boolean(prev) && meta.medals[set.id] !== prev;
      if (!meta.restored.includes(set.id)) meta.restored.push(set.id);
      ensureDaily().completions.push({ setId: set.id, seconds, medal }); checkDaily();
    }
    const allDone = isGameComplete(state) && !finishedShown;
    let final = 0; let isBest = false;
    if (allDone) { // lock the time now; the banner waits for the last part to land
      finishedShown = true; final = Math.max(1, Math.round(playSeconds)); isBest = !bestSeconds || final < bestSeconds;
      if (isBest) bestSeconds = final;
      submitScore(final);
    }
    saveProgress(allDone);
    flyIn(podium.figureParts.get(fragment.partId), hand, () => { // effects fire when the part lands on the statue
      const offset = ({ legs: 1.6, torso: 3.0, head: 4.3, armL: 3.2, armR: 3.2 })[fragment.partId] || 2.4;
      sparkle(new BAB.Vector3(podium.group.position.x, offset, podium.group.position.z), set.color, 110);
      kick(done ? 0.09 : 0.045); safeHaptic(done ? 'success' : 'tap');
      toast(done ? `${set.name} restored · display complete!` : `${set.name} · ${count}/5 pieces assembled`, 'success');
      if (allDone) { audio.play('place', { volume: 0.8 }); audio.play('finale'); audio.duck(6); }
      else if (done) { audio.play('place', { volume: 0.8 }); audio.play('complete'); audio.duck(4); }
      else audio.play('place', { rate: 0.96 + count * 0.02 });
      if (done) {
        sparkle(new BAB.Vector3(podium.group.position.x, 5, podium.group.position.z), '#ffffff', 200); celebrate(podium, set); setTimeout(() => mergeStatue(set.id), 1800);
        setTimeout(() => { if (disposed) return; setMedalBadge(set.id); refreshPodiums(); showMedal(set, medal, seconds, improved); }, allDone ? 300 : 900);
      }
      if (allDone) setTimeout(() => {
        if (disposed) return;
        root.querySelector('#finish-time').textContent = `${formatTime(final)}${isBest ? '  ·  NEW BEST' : ''}`;
        root.querySelector('#finish-medals').innerHTML = SETS.map((x) => `<i class="${meta.medals[x.id] || ''}" title="${x.name}"></i>`).join('') + `<b class="finish-stars">★ ${countStars(meta)}</b>`;
        root.querySelector('#finish-banner').classList.add('shown');
        try { window.lib?.log?.('All Waifu Assembler statues restored.'); } catch { /* optional */ }
      }, 1400);
    });
  }
  // ---------- juice: flights, camera kick, celebration ----------
  let carriedFly = null; const flights = []; const effects = []; let fovKick = 0;
  const ease = (t) => 1 - (1 - t) ** 3;
  const kick = (amount) => { fovKick = Math.min(0.14, fovKick + amount); };
  const anchorInv = new BAB.Matrix(); const localTmp = new BAB.Vector3();
  function flyIn(entry, hand, onLand) {
    if (!hand || !entry) { onLand(); return; }
    entry.anchor.computeWorldMatrix(true).invertToRef(anchorInv);
    const from = BAB.Vector3.TransformCoordinates(hand, anchorInv);
    entry.solid.position.copyFrom(from); entry.solid.scaling.setAll(0.2);
    flights.push({ node: entry.solid, from, start: performance.now(), dur: 520, onLand, landed: false });
  }
  function updateFlights(now) {
    for (let i = flights.length - 1; i >= 0; i -= 1) {
      const f = flights[i]; const t = Math.min(1, (now - f.start) / f.dur);
      if (t < 1) {
        const e = ease(t);
        BAB.Vector3.LerpToRef(f.from, BAB.Vector3.ZeroReadOnly, e, localTmp); localTmp.y += Math.sin(Math.PI * t) * 0.9;
        f.node.position.copyFrom(localTmp); f.node.scaling.setAll(0.2 + 0.8 * e);
        continue;
      }
      if (!f.landed) { f.landed = true; f.node.position.setAll(0); refreshShadows(); f.onLand(); }
      const p = Math.min(1, (now - f.start - f.dur) / 220); // landing pop: 1.08 → 1
      f.node.scaling.setAll(1 + 0.08 * Math.sin(Math.PI * p) * (1 - p));
      if (p >= 1) { f.node.scaling.setAll(1); flights.splice(i, 1); }
    }
    for (let i = effects.length - 1; i >= 0; i -= 1) if (!effects[i](now)) effects.splice(i, 1);
  }
  // a column of warm light and a ring sweeping across the floor when a statue is whole again
  const celebrateMats = { pillar: new BAB.StandardMaterial('celebratePillarMat', scene), ring: new BAB.StandardMaterial('celebrateRingMat', scene) };
  Object.assign(celebrateMats.pillar, { disableLighting: true, backFaceCulling: false, fogEnabled: false, alpha: 0.4 }); celebrateMats.pillar.emissiveColor = BAB.Color3.FromHexString('#ffe2a6');
  Object.assign(celebrateMats.ring, { disableLighting: true, alpha: 0.9 });
  function celebrate(podium, set) {
    const start = performance.now(); const p = podium.group.position;
    const pillar = BAB.MeshBuilder.CreateCylinder('celebratePillar', { height: 16, diameterTop: 2.2, diameterBottom: 3.6, tessellation: 32, cap: BAB.Mesh.NO_CAP }, scene);
    const ring = BAB.MeshBuilder.CreateTorus('celebrateRing', { diameter: 2, thickness: 0.12, tessellation: 64 }, scene);
    const pm = celebrateMats.pillar; const rm = celebrateMats.ring; rm.emissiveColor = BAB.Color3.FromHexString(set.color);
    pillar.material = pm; ring.material = rm; pillar.position.set(p.x, 8, p.z); ring.position.set(p.x, 0.08, p.z);
    for (const m of [pillar, ring]) m.isPickable = false;
    effects.push((now) => {
      const t = (now - start) / 2200;
      if (t >= 1) { pillar.dispose(); ring.dispose(); return false; }
      pm.alpha = 0.4 * (1 - t) * Math.min(1, t * 6); pillar.scaling.set(1 + t * 0.6, 1, 1 + t * 0.6);
      const r = 1 + ease(Math.min(1, t * 1.4)) * 5; ring.scaling.set(r, 1, r); rm.alpha = 0.9 * (1 - t);
      return true;
    });
  }
  root.querySelector('#finish-close').addEventListener('click', () => root.querySelector('#finish-banner').classList.remove('shown'));
  root.querySelector('#editor-reset').addEventListener('click', () => {
    for (const set of SETS) {
      podiumPositions[set.id] = [...INITIAL_PODIUMS[set.id]];
      movePodium(set.id, INITIAL_PODIUMS[set.id]);
    }
    selectedEditorSet = SETS[0].id;
    window.gameConfig.podiumPositions = clonePositions(podiumPositions);
    refreshEditorMap();
    toast('Gallery layout reset: six plinths along each side');
  });

  let stepDistance = 0;
  function movePlayer(dt) {
    const kx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    const ky = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
    let mx = stick.x + kx, my = stick.y + ky;
    const magnitude = Math.hypot(mx, my);
    if (magnitude > 1) { mx /= magnitude; my /= magnitude; }
    const rightX = Math.cos(player.yaw), rightZ = -Math.sin(player.yaw);
    const forwardX = -Math.sin(player.yaw), forwardZ = -Math.cos(player.yaw);
    const nx = player.x + (rightX * mx + forwardX * my) * speed * dt;
    const nz = player.z + (rightZ * mx + forwardZ * my) * speed * dt;
    const half = HALL_SIZE / 2; const pad = 1.4;
    let x = clamp(nx, -half + pad, half - pad);
    let z = clamp(nz, ANNEX.farZ + pad, half - pad);
    // The hall and the gallery meet at one doorway in the wall at z = -half.
    const band = z < -half + pad && z > -half - 1.2 - pad;
    if (z <= -half - 1.2 - pad) x = clamp(x, ANNEX.minX + pad, ANNEX.maxX - pad);
    if (band && Math.abs(x) > GALLERY_DOOR - 0.6) {
      if (player.z >= -half) z = -half + pad; else { z = Math.min(z, -half - 1.2 - pad); x = clamp(x, ANNEX.minX + pad, ANNEX.maxX - pad); }
    }
    // walk around plinths, statues, trees and benches instead of through them
    const R = 0.55;
    const push = (cx, cz, r) => { const dx = x - cx; const dz = z - cz; const d = Math.hypot(dx, dz); const min = r + R; if (d < min && d > 1e-4) { x = cx + (dx / d) * min; z = cz + (dz / d) * min; } };
    for (const [cx, cz, r] of world.colliders) push(cx, cz, r);
    for (const podium of podiums.values()) push(podium.group.position.x, podium.group.position.z, 2.45);
    for (const model of fragments.values()) if (!model.absent) push(model.root.position.x, model.root.position.z, 0.75);
    const moved = Math.hypot(x - player.x, z - player.z);
    player.x = x; player.z = z;
    stepDistance += moved; if (tutorial) tutorial.walk += moved;
    if (stepDistance > 2.4) { stepDistance = 0; audio.play('step', { volume: 0.4, rate: 0.9 + Math.random() * 0.2 }); }
    aimCamera(eye.y + Math.sin(performance.now() * 0.008) * Math.min(0.028, magnitude * 0.018));
  }
  const tmpRight = new BAB.Vector3();
  function updateCarried(now) {
    if (puzzle) { updatePuzzle(now); return; }
    if (!carriedVisual) return;
    const fwd = forwardVec();
    tmpRight.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const up = BAB.Vector3.Cross(tmpRight, fwd);
    carriedVisual.position.copyFrom(camera.position).addInPlace(tmpRight.scale(0.42)).addInPlace(up.scale(-0.3 + Math.sin(now * 0.003) * 0.012)).addInPlace(fwd.scale(1.6));
    carriedVisual.rotation.set(-0.12, player.yaw - 0.28 + Math.sin(now * 0.0022) * 0.07, 0);
    if (carriedFly) { // pickup flight from the plinth into the hand
      const t = Math.min(1, (now - carriedFly.start) / 380); const e = ease(t);
      BAB.Vector3.LerpToRef(carriedFly.from, carriedVisual.position, e, carriedVisual.position);
      carriedVisual.position.y += Math.sin(Math.PI * t) * 0.5;
      carriedVisual.scaling.setAll(carriedFly.scale + (0.19 - carriedFly.scale) * e);
      if (t >= 1) carriedFly = null;
    }
  }
  const FRAGMENT_VIEW = 46; const STATUE_VIEW = 92;
  let beaconKey = null;
  function updateObjects(now, dt) {
    for (const fragment of FRAGMENTS) { // only fragments near the visitor are drawn; fog hides the rest anyway
      const model = fragments.get(fragment.key);
      const near = editing || Math.abs(player.x - fragment.x) + Math.abs(player.z - fragment.z) < FRAGMENT_VIEW * 1.3 && Math.hypot(player.x - fragment.x, player.z - fragment.z) < FRAGMENT_VIEW;
      const show = !model.absent && near;
      if (show !== model.shown) { model.root.setEnabled(show); model.shown = show; }
      const box = model.container;
      if (box && box.shown !== near) { box.root.setEnabled(near); box.shown = near; }
    }
    for (const podium of podiums.values()) {
      const d = Math.hypot(player.x - podium.group.position.x, player.z - podium.group.position.z);
      const show = editing || d < STATUE_VIEW;
      if (show !== podium.figure.isEnabled(false)) { podium.figure.setEnabled(show); refreshShadows(); }
      podium.labelMesh.setEnabled(editing || (d > 7 && d < 30)); // name cards for nearby statues, hidden when standing right at one
    }
    for (const model of fragments.values()) {
      if (!model.root.isEnabled() || model.locked) continue;
      model.spin.rotation.y += 0.26 * dt;
      model.spin.position.y = model.baseY + Math.sin(now * 0.0018 + model.phase) * 0.13;
      if (model.rise) { // a freshly revealed piece floats up out of its chest or alcove
        const t = clamp((now - model.rise.start) / 750, 0, 1); const e = ease(t);
        model.spin.position.y -= 1.3 * (1 - e); model.spin.scaling.setAll(0.8 * (0.12 + 0.88 * e)); model.spin.rotation.y += dt * 6 * (1 - e);
        if (t >= 1) { model.rise = null; model.spin.scaling.setAll(0.8); }
      }
    }
    for (const podium of podiums.values()) {
      if (podium.finished.isEnabled()) {
        podium.finished.rotation.y += dt * 1.1;
        podium.finished.position.y = 5.7 + Math.sin(now * 0.002) * 0.08;
      }
    }
    if (!editing) {
      petalEmitter.set(player.x, 0, player.z);
      const best = state.carried ? null : nearestAvailable()?.fragment.key || null;
      if (best !== beaconKey) { // only the target fragment carries a beacon and a halo
        const prev = beaconKey && fragments.get(beaconKey);
        if (prev) { prev.beacon.setEnabled(false); prev.ring.setEnabled(false); }
        const next = best && fragments.get(best);
        if (next) { next.beacon.setEnabled(true); next.ring.setEnabled(true); }
        beaconKey = best;
      }
      if (best) fragments.get(best).ringMat.alpha = 0.75 + Math.sin(now * 0.006) * 0.2;
      const target = best ? getFragment(best) : null;
      const showLabel = target && Math.hypot(player.x - target.x, player.z - target.z) < 18;
      nearLabel.mesh.setEnabled(Boolean(showLabel));
      if (showLabel) {
        const set = getSet(target.setId); const part = PARTS.find((p) => p.id === target.partId);
        const hidden = fragments.get(best).locked ? HIDDEN_FRAGMENTS[best] : null;
        nearLabel.setText(hidden ? `${set.name} · ${hidden === 'chest' ? 'LOCKED CHEST' : 'CURTAINED ALCOVE'}` : `${set.name} · ${part.short}`, hidden ? '#c9a466' : set.color);
        nearLabel.mesh.position.set(target.x, HIDDEN_FRAGMENTS[best] === 'curtain' ? 5.2 : 4.35, target.z);
      }
      const elapsed = now - stateChangedAt;
      if (elapsed > 190) { stateChangedAt = now; updateHUD(); }
    }
    if (ui.toast.classList.contains('visible') && now > toastUntil) ui.toast.classList.remove('visible');
  }
  let envFrames = 0;
  // ---------- Character Studio: 12 figures × 10 expressions in their own studio-lit scene ----------
  const studio = { open: false, scene: null, kit: null, holder: null, bust: null, index: 0, expr: 'neutral', yaw: 0, pitch: 0, drag: null, idleAt: 0, env: null, envFrames: 0, fx: null, costumes: new Set() };
  const studioEl = root.querySelector('#studio');
  function ensureStudio() {
    if (studio.scene) return;
    const s = new BAB.Scene(engine); s.useRightHandedSystem = true; s.skipPointerMovePicking = true;
    s.clearColor = new BAB.Color4(0.07, 0.06, 0.12, 1);
    const cam = new BAB.FreeCamera('studioCam', new BAB.Vector3(0, 3.86, 2.35), s);
    cam.inputs.clear(); cam.fov = 0.52; cam.minZ = 0.05; cam.setTarget(new BAB.Vector3(0, 3.74, 0)); s.activeCamera = cam;
    // soft cyclorama backdrop
    const bg = new BAB.DynamicTexture('studioBg', { width: 512, height: 512 }, s, true); const bctx = bg.getContext();
    const grd = bctx.createRadialGradient(256, 230, 20, 256, 256, 330); grd.addColorStop(0, '#5a4a74'); grd.addColorStop(0.55, '#2a2240'); grd.addColorStop(1, '#0e0c18');
    bctx.fillStyle = grd; bctx.fillRect(0, 0, 512, 512); bg.update(true);
    const back = BAB.MeshBuilder.CreatePlane('studioBack', { width: 9, height: 9 }, s); back.position.set(0, 3.7, -3.2);
    const bm = new BAB.StandardMaterial('studioBackMat', s); bm.disableLighting = true; bm.emissiveTexture = bg; back.material = bm; back.isPickable = false;
    // three-point studio lighting + a soft beauty light on the face
    const hemi = new BAB.HemisphericLight('sFill', new BAB.Vector3(0, 1, 0.3), s); hemi.intensity = 0.55; hemi.groundColor = BAB.Color3.FromHexString('#6a5a80');
    const keyL = new BAB.DirectionalLight('sKey', new BAB.Vector3(0.45, -0.5, -1).normalize(), s); keyL.intensity = 1.9; keyL.diffuse = BAB.Color3.FromHexString('#fff0e4');
    const rimL = new BAB.DirectionalLight('sRim', new BAB.Vector3(-0.6, -0.25, 1).normalize(), s); rimL.intensity = 2.2; rimL.diffuse = BAB.Color3.FromHexString('#ffb0dc');
    const beauty = new BAB.PointLight('sBeauty', new BAB.Vector3(0.1, 4.0, 1.6), s); beauty.intensity = 2.4; beauty.range = 4; beauty.diffuse = BAB.Color3.FromHexString('#fff4ee');
    studio.env = setupStudioReflections(s, BAB); studio.envFrames = 0;
    try {
      const fx = new BAB.DefaultRenderingPipeline('studioFx', true, s, [cam]);
      fx.fxaaEnabled = true; fx.bloomEnabled = true; fx.bloomThreshold = 0.82; fx.bloomWeight = 0.28; fx.bloomKernel = 48; fx.bloomScale = 0.5;
      studio.fx = fx;
    } catch { /* optional on weak devices */ }
    const ipc = s.imageProcessingConfiguration; ipc.toneMappingEnabled = true; ipc.toneMappingType = BAB.ImageProcessingConfiguration.TONEMAPPING_ACES;
    ipc.exposure = 1.08; ipc.contrast = 1.14; ipc.vignetteEnabled = true; ipc.vignetteWeight = 1.4; ipc.vignetteColor = new BAB.Color4(0.05, 0.02, 0.1, 0);
    studio.scene = s; studio.kit = createStatueKit(s);
    studio.holder = new BAB.TransformNode('studioHolder', s); studio.holder.position.set(0, 3.8, 0);
  }
  // Rewards: a statue's portrait unlocks once it has been restored, expressions unlock with stars (medals and daily
  // challenges), and a gold medal unlocks that figure's gala outfit. The creator's editor preview shows everything.
  const portraitUnlocked = (id) => editing || meta.restored.includes(id);
  const exprUnlocked = (id, expr) => editing || expr === (DEFAULT_EXPR[id] || 'neutral') || isExpressionUnlocked(expr, countStars(meta));
  const studioLock = root.querySelector('#studio-lock'); const studioLockText = root.querySelector('#studio-lock-text');
  const costumeButton = root.querySelector('#studio-costume');
  let noticeTimer = 0;
  function studioNotice(text) {
    studioLockText.textContent = text; studioLock.classList.add('shown');
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => refreshStudioLock(), 2600);
  }
  function refreshStudioLock() {
    const preset = FACE_PRESETS[studio.index];
    const locked = !portraitUnlocked(preset.id);
    studioLock.classList.toggle('shown', locked);
    studioLockText.textContent = `Restore ${preset.name} in the gallery to unlock this portrait, her expressions and outfits.`;
  }
  function showStudioFigure() {
    const preset = FACE_PRESETS[studio.index]; const id = preset.id;
    const unlocked = portraitUnlocked(id); const stars = countStars(meta);
    if (!exprUnlocked(id, studio.expr)) studio.expr = DEFAULT_EXPR[id] || 'neutral';
    const gold = meta.medals[id] === 'gold' || editing;
    const wear = unlocked && gold && studio.costumes.has(id);
    studio.kit.setCostume(id, wear ? COSTUMES[id] : null);
    if (studio.bust) { const { id: oldId, expr } = studio.bustInfo; studio.bust.dispose(false, false); studio.kit.releaseFace(oldId, expr); }
    studio.bust = buildBust(studio.kit, studio.scene, id, studio.expr);
    studio.bustInfo = { id, expr: studio.expr };
    studio.bust.parent = studio.holder; studio.bust.position.set(0, -3.8, 0);
    if (!unlocked) { const ghost = studio.kit.holoMaterial(id); for (const m of studio.bust.getChildMeshes()) m.material = ghost; } // a hologram until restored
    root.querySelector('#studio-name').textContent = preset.name;
    root.querySelector('#studio-title').textContent = preset.title;
    root.querySelector('#studio-count').textContent = `${studio.index + 1} / ${FACE_PRESETS.length}`;
    root.querySelector('#studio-stars').textContent = `★ ${stars}  ·  ${meta.restored.length}/${FACE_PRESETS.length} PORTRAITS`;
    root.querySelectorAll('[data-expr]').forEach((b) => {
      const e = b.dataset.expr; const open = unlocked && exprUnlocked(id, e);
      b.classList.toggle('active', e === studio.expr); b.classList.toggle('locked', !open);
      b.querySelector('i').textContent = open ? '' : unlocked ? `🔒 ${EXPRESSION_UNLOCKS[e]}★` : '🔒';
    });
    const costume = COSTUMES[id];
    costumeButton.classList.toggle('shown', unlocked && Boolean(costume));
    costumeButton.classList.toggle('on', wear); costumeButton.classList.toggle('locked', !gold);
    root.querySelector('#studio-costume-label').textContent = gold ? (wear ? costume.name.toUpperCase() : `WEAR ${costume?.name.toUpperCase()}`) : `🔒 GOLD · ${costume?.name.toUpperCase()}`;
    refreshStudioLock();
    studio.idleAt = performance.now();
  }
  function openStudio() {
    ensureStudio(); studio.open = true; studioEl.classList.add('shown'); root.querySelector('.hud').classList.add('studio-on');
    if (!studio.bust) studio.expr = DEFAULT_EXPR[FACE_PRESETS[studio.index].id] || 'neutral';
    showStudioFigure(); // rewards may have changed since it was last open
  }
  function closeStudio() { studio.open = false; studioEl.classList.remove('shown'); root.querySelector('.hud').classList.remove('studio-on'); lastFrame = performance.now(); }
  // UI sounds, the music toggle, and the first gesture that is allowed to start audio
  const soundButton = root.querySelector('#sound-toggle');
  function refreshSoundButton() { soundButton.classList.toggle('off', audio.muted); soundButton.setAttribute('aria-label', audio.muted ? 'Turn music and sound on' : 'Turn music and sound off'); }
  soundButton.addEventListener('click', () => { audio.unlock(); audio.setMuted(!audio.muted); prefs.muted = audio.muted; refreshSoundButton(); if (!audio.muted) audio.play('tap', { volume: 0.6 }); saveProgress(); });
  refreshSoundButton();
  if (editing) soundButton.style.display = 'none';
  const unlockAudio = () => audio.unlock();
  for (const type of ['pointerdown', 'pointerup', 'click']) root.addEventListener(type, unlockAudio, { capture: true }); // touch activation counts on release
  window.addEventListener('keydown', unlockAudio, { capture: true });
  for (const sel of ['#studio-open', '#studio-close', '#studio-prev', '#studio-next', '#finish-close', '#finish-rank', '[data-expr]', '#menu-open', '#menu-settings', '#menu-leaderboard', '[data-close]', '.seg button', '#set-reset']) root.querySelectorAll(sel).forEach((b) => b.addEventListener('click', () => audio.play('tap', { volume: 0.55 })));
  root.querySelector('#studio-open').addEventListener('click', openStudio);
  root.querySelector('#studio-close').addEventListener('click', closeStudio);
  root.querySelector('#studio-prev').addEventListener('click', () => { studio.index = (studio.index + FACE_PRESETS.length - 1) % FACE_PRESETS.length; studio.expr = DEFAULT_EXPR[FACE_PRESETS[studio.index].id] || 'neutral'; showStudioFigure(); });
  root.querySelector('#studio-next').addEventListener('click', () => { studio.index = (studio.index + 1) % FACE_PRESETS.length; studio.expr = DEFAULT_EXPR[FACE_PRESETS[studio.index].id] || 'neutral'; showStudioFigure(); });
  root.querySelectorAll('[data-expr]').forEach((b) => b.addEventListener('click', () => {
    const id = FACE_PRESETS[studio.index].id; const e = b.dataset.expr;
    if (!portraitUnlocked(id)) { refreshStudioLock(); return; }
    if (!exprUnlocked(id, e)) { studioNotice(`“${e}” unlocks at ${EXPRESSION_UNLOCKS[e]}★ — you have ${countStars(meta)}★. Medals give 1–3★, daily challenges +${DAILY_STARS}★.`); return; }
    studio.expr = e; showStudioFigure();
  }));
  costumeButton.addEventListener('click', () => {
    const id = FACE_PRESETS[studio.index].id; audio.play('tap', { volume: 0.6 });
    if (meta.medals[id] !== 'gold' && !editing) { studioNotice(`Earn a gold medal on ${FACE_PRESETS[studio.index].name} to unlock her ${COSTUMES[id].name} outfit.`); return; }
    if (studio.costumes.has(id)) studio.costumes.delete(id); else studio.costumes.add(id);
    showStudioFigure();
  });
  const stage = root.querySelector('#studio-stage');
  stage.addEventListener('pointerdown', (e) => { studio.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', (e) => {
    if (!studio.drag || studio.drag.id !== e.pointerId) return;
    studio.yaw += (e.clientX - studio.drag.x) * 0.008; studio.pitch = clamp(studio.pitch + (e.clientY - studio.drag.y) * 0.004, -0.35, 0.35);
    studio.drag.x = e.clientX; studio.drag.y = e.clientY; studio.idleAt = performance.now();
  });
  const endDrag = (e) => { if (studio.drag?.id === e.pointerId) studio.drag = null; };
  stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);
  function renderStudio(now) {
    const idle = now - studio.idleAt > 2500 && !studio.drag;
    if (idle) { studio.yaw += 0.004; studio.pitch *= 0.97; }
    studio.holder.rotation.set(studio.pitch, studio.yaw, 0);
    studio.scene.render();
    if (studio.envFrames < 4 && ++studio.envFrames === 4) studio.env.release();
  }
  function render() {
    if (disposed || contextLost) return;
    const now = performance.now();
    const rawDt = Math.max(0, (now - lastFrame) / 1000);
    const dt = Math.min(0.11, Math.max(0.001, rawDt));
    lastFrame = now;
    adaptResolution(rawDt);
    if (studio.open) { renderStudio(now); return; }
    updateFlights(now);
    if (phase === 'loading') return; // the simple 2D loading screen covers everything: no 3D frames while the gallery is built
    pumpLOD();
    if (phase === 'menu') { renderShowcase(now, dt); return; }
    if (phase === 'play') { fovKick *= Math.exp(-dt * 5); camera.fov = PLAY_FOV + fovKick; }
    if (phase === 'play') {
      if (!puzzle) movePlayer(dt);
      const step = Math.min(rawDt, 1); // real time, not the capped step
      if (!isGameComplete(state)) playSeconds += step;
      for (const id of clocking) statueTimes[id] = (statueTimes[id] || 0) + step; // per-statue medal clocks
      if (tutorial) updateTutorial();
    }
    updateObjects(now, dt);
    updateCarried(now);
    updateHologram(now);
    scene.render();
    if (envFrames < 4 && ++envFrames === 4) hallEnv.release();
  }
  engine.runRenderLoop(render);

  function resize() { engine.resize(); layoutVersion += 1; }
  function pointerDown(event) {
    if (event.target !== canvas || !ready || (!editing && phase !== 'play')) return;
    event.preventDefault();
    if (editing) {
      const rect = canvas.getBoundingClientRect();
      const pick = scene.pick(event.clientX - rect.left, event.clientY - rect.top, (mesh) => Boolean(mesh.metadata?.podiumSet) && mesh.isEnabled());
      if (pick?.hit && pick.pickedMesh?.metadata?.podiumSet) {
        const id = pick.pickedMesh.metadata.podiumSet;
        selectedEditorSet = id;
        refreshEditorMap();
        lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, isDrag: true };
      } else lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, isDrag: false };
    } else if (puzzle) fitSwipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
    else lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, isDrag: false };
    canvas.setPointerCapture?.(event.pointerId);
  }
  let fitSwipe = null;
  function pointerMove(event) {
    if (!lookPointer || lookPointer.id !== event.pointerId) return;
    const dx = event.clientX - lookPointer.x, dy = event.clientY - lookPointer.y;
    if (!editing || !lookPointer.isDrag) {
      player.yaw -= dx * 0.0042 * prefs.look;
      player.pitch = clamp(player.pitch - dy * 0.0032 * prefs.look, -1.18, 1.18);
      if (tutorial) tutorial.look += Math.abs(dx) * 0.0042 + Math.abs(dy) * 0.0032;
    }
    lookPointer.x = event.clientX; lookPointer.y = event.clientY;
  }
  function pointerUp(event) {
    if (lookPointer?.id === event.pointerId) lookPointer = null;
    if (fitSwipe?.id === event.pointerId) { // swipe left/right turns the part, up/down flips it
      const dx = event.clientX - fitSwipe.x; const dy = event.clientY - fitSwipe.y; fitSwipe = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 36) return;
      if (Math.abs(dx) > Math.abs(dy)) turnPuzzle(dx > 0 ? 1 : -1, 0); else turnPuzzle(0, dy > 0 ? 1 : -1);
    }
  }
  canvas.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointermove', pointerMove, { passive: false });
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerUp);
  window.addEventListener('resize', resize);
  const keyDown = (event) => {
    const k = event.key.toLowerCase();
    if (puzzle && phase === 'play') { // the fit puzzle has the keyboard to itself
      if (event.repeat) return;
      if (k === 'escape') cancelPuzzle();
      else if (k === 'a' || k === 'arrowleft' || k === 'q') turnPuzzle(-1, 0);
      else if (k === 'd' || k === 'arrowright') turnPuzzle(1, 0);
      else if (k === 'w' || k === 'arrowup') turnPuzzle(0, -1);
      else if (k === 's' || k === 'arrowdown' || k === 'f') turnPuzzle(0, 1);
      else return;
      event.preventDefault(); return;
    }
    if (k === 'escape' && phase === 'play' && !studio.open) { openMenu(); return; }
    if (!editing && phase !== 'play') return;
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) event.preventDefault();
    keys.add(k);
    if ((k === 'e' || k === ' ') && !event.repeat && !editing) updateAction();
  };
  window.addEventListener('keydown', keyDown);
  const keyUp = (event) => keys.delete(event.key.toLowerCase());
  window.addEventListener('keyup', keyUp);

  const stickZone = root.querySelector('#stick-zone');
  const stickNub = root.querySelector('#stick-nub');
  const updateStick = (event) => {
    const rect = stickZone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx, dy = event.clientY - cy;
    const max = Math.min(rect.width, rect.height) * 0.31;
    const d = Math.hypot(dx, dy), s = d > max ? max / d : 1;
    const sx = dx * s, sy = dy * s;
    stick.x = sx / max; stick.y = -sy / max;
    stickNub.style.transform = `translate(${sx}px,${sy}px)`;
  };
  stickZone.addEventListener('pointerdown', (event) => {
    event.preventDefault(); event.stopPropagation(); stickPointer = event.pointerId;
    stickZone.setPointerCapture(event.pointerId); updateStick(event);
  });
  stickZone.addEventListener('pointermove', (event) => { if (stickPointer === event.pointerId) updateStick(event); });
  const clearStick = (event) => {
    if (stickPointer !== event.pointerId) return;
    stickPointer = null; stick.x = 0; stick.y = 0; stickNub.style.transform = 'translate(0,0)';
  };
  stickZone.addEventListener('pointerup', clearStick);
  stickZone.addEventListener('pointercancel', clearStick);
  ui.action.addEventListener('click', updateAction);
  root.querySelector('#fit-left').addEventListener('click', () => turnPuzzle(-1, 0));
  root.querySelector('#fit-right').addEventListener('click', () => turnPuzzle(1, 0));
  root.querySelector('#fit-flip').addEventListener('click', () => turnPuzzle(0, 1));
  root.querySelector('#fit-cancel').addEventListener('click', cancelPuzzle);

  // ---------- 3D loading screen, main menu, settings and ranking ----------
  const hudEl = root.querySelector('.hud');
  const bootEl = root.querySelector('#boot'); const bootFill = root.querySelector('#boot-fill'); const bootStatus = root.querySelector('#boot-status'); const bootPct = root.querySelector('#boot-pct');
  const menuEl = root.querySelector('#menu');
  const panels = { settings: root.querySelector('#settings-panel'), leaderboard: root.querySelector('#leaderboard-panel') };
  hudEl.classList.add('offstage');
  if (!editing) camera.fov = 1.02;
  const nextFrame = () => new Promise((resolve) => { requestAnimationFrame(() => resolve()); setTimeout(resolve, 200); });
  // Plinths show their finished statue (solid) or the hologram of what is still missing.
  function showcase(podium, on) {
    if (!podium.merged) for (const { ghost, solid } of podium.figureParts.values()) { ghost.setEnabled(!on); solid.setEnabled(on); }
    if (on) { podium.finished.setEnabled(false); podium.labelMesh.setEnabled(false); podium.figure.setEnabled(true); }
  }
  function showcaseAll(on) { for (const podium of podiums.values()) showcase(podium, on); refreshShadows(); }
  async function boot() {
    const steps = SETS.length + 1; let step = 0;
    const progress = (label, advance = true) => {
      if (advance) step += 1;
      const pct = Math.max(4, Math.round((step / steps) * 100));
      bootFill.style.width = `${pct}%`; bootPct.textContent = `${pct}%`; bootStatus.textContent = label;
    };
    // Each statue part is sculpted once: the plinth keeps the original (and a merged hologram copy of it), and the
    // fragment waiting in the hall is a clone that shares its geometry and materials.
    for (const set of SETS) {
      progress(`SCULPTING ${set.name}`, false);
      await nextFrame(); if (disposed) return;
      const parts = new Map(PARTS.map((part) => [part.id, buildStatuePart(kit, scene, part.id, set.id, false)]));
      const podium = buildPodium(scene, kit, set, podiumPositions[set.id], shadows, parts);
      podiums.set(set.id, podium);
      niches.set(set.id, world.niche(set, ...podiumPositions[set.id]));
      for (const fragment of FRAGMENTS) if (fragment.setId === set.id) { // its five fragments: clones sharing the plinth's geometry
        const part = parts.get(fragment.partId).clone(`frag-part-${fragment.key}`, null);
        part.setEnabled(true); for (const m of part.getChildMeshes()) m.setEnabled(true);
        const model = buildFragment(scene, kit, fragment, part);
        for (const m of model.root.getChildMeshes()) m.isPickable = false;
        fragments.set(fragment.key, model);
        const kind = HIDDEN_FRAGMENTS[fragment.key];
        if (kind) { // a secret piece waits inside a chest or behind a curtain until the visitor opens it
          const box = buildContainer(scene, fragment, kind);
          containers.set(fragment.key, box); world.colliders.push(box.collider); model.container = box;
          if (kind === 'chest') { // it floats up out of the chest instead of standing on a plinth
            for (const m of model.floorGlow.getChildMeshes()) if (m !== model.beacon && m !== model.ring) m.setEnabled(false);
            model.baseY = 1.95; model.spin.position.y = model.baseY;
          }
        }
      }
      queueLOD(podium); // after the fragment clones, so they don't inherit the LOD levels
      if (set === SETS[0]) attachLOD(podium); // one statue's LODs now, so their shaders are compiled with the rest
      if (!editing) showcase(podium, true);
      progress(`${set.name} · RESTORED`);
    }
    refreshShadows(); progress('OPENING THE GALLERY');
    applySave(await savedGame); if (disposed) return;
    if (!editing) for (const set of SETS) { mergeStatue(set.id); setMedalBadge(set.id); } // statues already finished in the save
    bootStatus.textContent = 'PREPARING SHADERS';
    await precompileShaders(); if (disposed) return;
    ready = true;
    refreshFragments(); updateHUD();
    scene.onAfterRenderObservable.addOnce(freezeStatics); // after the first full frame has compiled every effect
    if (editing) { phase = 'edit'; refreshEditorMap(); hudEl.classList.remove('offstage'); bootEl.classList.add('done'); return; }
    showcaseAll(true);
    bootEl.classList.add('done');
    openMenu();
  }
  // ---------- statue LOD, merging and shader warm-up ----------
  // Far LOD: the low-poly copy of each part is melted into ONE vertex-coloured mesh (one shared material) plus the
  // low-poly face, so a distant statue costs ~2 draw calls instead of ~15. The high meshes hand over to it at LOD_DIST.
  const farMat = new BAB.PBRMaterial('statueFar', scene); farMat.albedoColor = BAB.Color3.White(); farMat.metallic = 0; farMat.roughness = 0.55;
  const colourCache = new Map();
  function averageColour(mat) { // material albedo × average of its painted texture (hair strands, sclera…)
    if (colourCache.has(mat)) return colourCache.get(mat);
    let c = (mat.albedoColor || mat.diffuseColor || BAB.Color3.White()).clone();
    const ctx = mat.albedoTexture?.getContext?.();
    if (ctx) {
      const { width, height } = ctx.canvas; const px = ctx.getImageData(0, 0, width, height).data; let r = 0, g = 0, bl = 0, n = 0;
      for (let i = 0; i < px.length; i += 4 * 97) { r += px[i]; g += px[i + 1]; bl += px[i + 2]; n += 1; }
      c = c.multiply(new BAB.Color3(r / n / 255, g / n / 255, bl / n / 255));
    }
    if (mat.emissiveColor) c = c.add(mat.emissiveColor.scale(0.6));
    colourCache.set(mat, c); return c;
  }
  function paint(mesh, colour) {
    const n = mesh.getTotalVertices(); const cols = new Float32Array(n * 4);
    for (let i = 0; i < n; i += 1) { cols[i * 4] = colour.r; cols[i * 4 + 1] = colour.g; cols[i * 4 + 2] = colour.b; cols[i * 4 + 3] = 1; }
    mesh.setVerticesData(BAB.VertexBuffer.ColorKind, cols, false);
  }
  const FAR_SKIP = new Set(['face', 'lens', ...DETAIL_KINDS]); // face keeps its texture; glasses stay transparent
  // LODs take most of the build time, so only the first statue gets them during loading (which also warms their
  // shaders); the rest are added part by part in the background once the menu is up. A statue is always completed
  // before it is merged.
  const lodQueue = [];
  function attachLOD(podium) { for (const partId of [...(podium.lodPending || [])]) attachPartLOD(podium, partId); }
  function queueLOD(podium) { podium.lodPending = new Set(PARTS.map((p) => p.id)); for (const p of PARTS) lodQueue.push([podium, p.id]); }
  let lodTick = 0;
  function pumpLOD() { // one part every few frames: small steps, so the menu and play stay smooth
    if (!lodQueue.length || ++lodTick % (phase === 'play' ? 4 : 2)) return;
    while (lodQueue.length) {
      const [podium, partId] = lodQueue.shift();
      if (podium.lodPending?.has(partId) && !podium.merged) { attachPartLOD(podium, partId); return; }
    }
  }
  function attachPartLOD(podium, partId) {
    podium.lodPending?.delete(partId);
    const entry = podium.figureParts.get(partId);
    {
      const low = buildStatuePart(kit, scene, partId, podium.setId, false, undefined, LOW_DETAIL);
      low.parent = entry.anchor;
      const highs = entry.solid.getChildMeshes(); const lows = low.getChildMeshes();
      const master = highs.filter((m) => !FAR_SKIP.has(m.metadata?.kind)).sort((x, y) => y.getTotalVertices() - x.getTotalVertices())[0];
      const melt = lows.filter((m) => !FAR_SKIP.has(m.metadata?.kind));
      for (const m of melt) paint(m, averageColour(m.material));
      let far = null;
      if (master && melt.length) {
        far = BAB.Mesh.MergeMeshes(melt, true, true, undefined, false, false); // world space…
        far.computeWorldMatrix(true);
        far.bakeTransformIntoVertices(master.computeWorldMatrix(true).clone().invert()); // …into the master's frame
        far.parent = master.parent; far.position.copyFrom(master.position); far.material = farMat; far.isPickable = false;
        far.metadata = { kind: 'far' }; podium.portrait.includedOnlyMeshes.push(far);
      }
      const faceLow = lows.find((m) => m.metadata?.kind === 'face');
      for (const m of highs) {
        const kind = m.metadata?.kind;
        if (DETAIL_KINDS.has(kind)) m.addLODLevel(DETAIL_DIST, null);
        else if (kind === 'face' && faceLow) { m.addLODLevel(LOD_DIST, faceLow); podium.portrait.includedOnlyMeshes.push(faceLow); }
        else if (kind === 'lens') continue;
        else if (m === master && far) m.addLODLevel(LOD_DIST, far);
        else m.addLODLevel(LOD_DIST, null);
      }
      for (const m of lows) if (m !== faceLow && !m.isDisposed()) m.dispose();
      entry.low = low; entry.far = far; entry.faceLow = faceLow;
      // the hologram of a missing part gets a low-poly LOD too (its vertices are baked into the part's frame)
      const ghostMesh = entry.ghost.getChildMeshes()[0];
      if (ghostMesh) {
        const lowGhostRoot = buildStatuePart(kit, scene, partId, podium.setId, true, undefined, LOW_DETAIL);
        const lowGhost = lowGhostRoot.getChildMeshes()[0];
        lowGhost.parent = entry.ghost; lowGhost.bakeCurrentTransformIntoVertices(); lowGhostRoot.dispose(true);
        ghostMesh.addLODLevel(LOD_DIST, lowGhost); podium.portrait.includedOnlyMeshes.push(lowGhost);
      }
    }
  }
  // A finished statue becomes one mesh per material (≈26 → ≈15 draw calls) with a merged low-poly LOD; its parts,
  // hologram copies and the fragments it was built from are released.
  function mergeStatue(setId) {
    const podium = podiums.get(setId);
    if (!podium || podium.merged || editing || (state.placed[setId]?.length || 0) < PARTS.length) return;
    attachLOD(podium); // any parts whose low-poly copy is still queued
    if (flights.some((f) => [...podium.figureParts.values()].some((e) => e.solid === f.node))) { setTimeout(() => mergeStatue(setId), 600); return; }
    const groups = new Map(); const fars = []; const faces = [];
    for (const entry of podium.figureParts.values()) {
      if (entry.far) fars.push(entry.far); if (entry.faceLow) faces.push(entry.faceLow);
      for (const m of entry.solid.getChildMeshes()) {
        if (m === entry.far || m.metadata?.kind === 'far') continue;
        const kind = m.metadata?.kind; const key = `${m.material.uniqueId}`;
        if (!groups.has(key)) groups.set(key, { mat: m.material, kind, high: [] });
        groups.get(key).high.push(m);
      }
    }
    podium.figure.computeWorldMatrix(true);
    const node = new BAB.TransformNode(`merged-${setId}`, scene); node.parent = podium.figure;
    const bake = (list, mat) => { const m = BAB.Mesh.MergeMeshes(list, false, true, undefined, false, false); m.material = mat; m.setParent(node); m.isPickable = false; podium.portrait.includedOnlyMeshes.push(m); return m; };
    let master = null; let masterVerts = -1; let faceHigh = null;
    for (const g of groups.values()) {
      const high = bake(g.high, g.mat); shadows.addShadowCaster(high); g.merged = high;
      if (DETAIL_KINDS.has(g.kind)) { high.addLODLevel(DETAIL_DIST, null); continue; }
      if (g.kind === 'face') { faceHigh = high; continue; }
      if (g.kind === 'lens') continue;
      if (high.getTotalVertices() > masterVerts) { master = high; masterVerts = high.getTotalVertices(); }
    }
    for (const g of groups.values()) if (g.merged !== master && g.merged !== faceHigh && !DETAIL_KINDS.has(g.kind) && g.kind !== 'lens') g.merged.addLODLevel(LOD_DIST, null);
    if (master && fars.length) master.addLODLevel(LOD_DIST, bake(fars, farMat));
    if (faceHigh && faces.length) faceHigh.addLODLevel(LOD_DIST, bake(faces, faces[0].material));
    for (const entry of podium.figureParts.values()) { entry.solid.dispose(false, false); entry.ghost.dispose(false, false); entry.low?.dispose(false, false); }
    for (const part of PARTS) { const model = fragments.get(`${setId}:${part.id}`); if (model && !model.gone) { model.root.dispose(false, false); model.gone = true; model.absent = true; } }
    podium.merged = node;
    for (const m of node.getChildMeshes()) { m.computeWorldMatrix(true); m.freezeWorldMatrix(); }
    refreshShadows();
  }
  // Compile every shader variant the game can show (statue parts with their portrait light, LODs, fragments, held
  // hologram, celebrations, shadow depth) while the loading screen is up, so no part placement stalls a frame.
  async function precompileShaders() {
    const seen = new Set(); const jobs = [];
    const temp = [];
    const ghostSample = scene.meshes.find((m) => m.material && m.material.name.endsWith(':holo'));
    if (ghostSample) jobs.push(heldMat.forceCompilationAsync(ghostSample).catch(() => {}));
    const sample = fragments.values().next().value?.spin.getChildMeshes() || []; // the fit puzzle's outline: part meshes in hologram
    const sampleHolo = kit.holoMaterial(SETS[0].id); const kindsSeen = new Set();
    for (const m of sample) { const k = m.getVerticesDataKinds().join(','); if (kindsSeen.has(k) || !m.getTotalVertices()) continue; kindsSeen.add(k); jobs.push(sampleHolo.forceCompilationAsync(m).catch(() => {})); }
    for (const mat of [celebrateMats.pillar, celebrateMats.ring, holoRingMat, holoBeamMat, ...Object.values(medalMats)]) {
      const t = BAB.MeshBuilder.CreateBox('warm', { size: 0.01 }, scene); t.material = mat; t.setEnabled(false); temp.push(t);
      jobs.push(mat.forceCompilationAsync(t).catch(() => {}));
    }
    const meshes = [...scene.meshes];
    for (const m of [...meshes]) for (const level of m.getLODLevels?.() || []) if (level.mesh) meshes.push(level.mesh);
    for (const m of meshes) {
      if (!m.material || !m.getTotalVertices?.()) continue;
      const key = `${m.material.uniqueId}|${m.getVerticesDataKinds().join(',')}|${m.receiveShadows}|${(m.lightSources || []).map((l) => l.uniqueId).join(',')}|${m.renderingGroupId}`;
      if (seen.has(key)) continue; seen.add(key);
      jobs.push(m.material.forceCompilationAsync(m, { clipPlane: false }).catch(() => {}));
      if (jobs.length % 24 === 0) { await Promise.all(jobs.splice(0)); await nextFrame(); if (disposed) return; }
    }
    try { await shadows.forceCompilationAsync(); } catch { /* compiles on first use instead */ }
    await Promise.all(jobs);
    for (const t of temp) t.dispose();
  }
  function applySave(saved) {
    if (!saved) return;
    const progress = saved.waifuAssembler || (saved.placed ? saved : null);
    if (progress) Object.assign(state, restoreState(progress));
    playSeconds = Math.max(0, Number(saved.playSeconds) || 0);
    bestSeconds = Number(saved.bestSeconds) > 0 ? Math.round(Number(saved.bestSeconds)) : null;
    const p = saved.prefs || {};
    if (Number.isFinite(p.music)) prefs.music = clamp(p.music, 0, 1);
    if (Number.isFinite(p.sfx)) prefs.sfx = clamp(p.sfx, 0, 1);
    if (Number.isFinite(p.look)) prefs.look = clamp(p.look, 0.4, 2);
    if (p.quality === 'high' || p.quality === 'balanced') prefs.quality = p.quality;
    prefs.muted = Boolean(p.muted ?? saved.audioMuted);
    const m = saved.meta || {}; const ids = new Set(SETS.map((set) => set.id)); const MEDALS = ['gold', 'silver', 'bronze'];
    meta.medals = Object.fromEntries(Object.entries(m.medals || {}).filter(([id, medal]) => ids.has(id) && MEDALS.includes(medal)));
    meta.restored = Array.isArray(m.restored) ? [...new Set(m.restored.filter((id) => ids.has(id)))] : [];
    for (const set of SETS) if ((state.placed[set.id]?.length || 0) === PARTS.length && !meta.restored.includes(set.id)) meta.restored.push(set.id);
    meta.dailyStars = Math.max(0, Math.round(Number(m.dailyStars) || 0));
    meta.streak = Math.max(0, Math.round(Number(m.streak) || 0));
    meta.lastDailyDay = typeof m.lastDailyDay === 'string' ? m.lastDailyDay.slice(0, 10) : null;
    meta.tutorialDone = Boolean(m.tutorialDone);
    const d = m.daily;
    meta.daily = d && typeof d.day === 'string' ? { day: d.day.slice(0, 10), done: Boolean(d.done), reveals: Math.max(0, Number(d.reveals) || 0), completions: Array.isArray(d.completions) ? d.completions.filter((c) => ids.has(c?.setId)).slice(-24) : [] } : null;
    statueTimes = Object.fromEntries(Object.entries(saved.statueTimes || {}).filter(([id, t]) => ids.has(id) && Number.isFinite(Number(t))).map(([id, t]) => [id, Math.max(0, Number(t))]));
    audio.setVolumes({ music: prefs.music, sfx: prefs.sfx }); audio.setMuted(prefs.muted);
    refreshSoundButton(); applyQuality();
    finishedShown = isGameComplete(state);
  }
  function applyQuality() {
    engine.setHardwareScalingLevel(hardwareLevel());
    if (key.shadowEnabled !== (prefs.quality === 'high')) {
      key.shadowEnabled = prefs.quality === 'high';
      for (const m of frozenMaterials) m.unfreeze(); // shadow defines change: recompile once, then freeze again
      scene.onAfterRenderObservable.addOnce(() => { for (const m of frozenMaterials) m.freeze(); });
    }
    refreshShadows();
  }
  // Dynamic resolution: render fewer pixels while the frame rate is under ~50 fps, and creep back up when it is steady.
  const perf = { scale: 1, frames: 0, time: 0 };
  function hardwareLevel() { return 1 / (Math.min(window.devicePixelRatio || 1, prefs.quality === 'high' ? 1.5 : 1) * perf.scale); }
  function adaptResolution(rawDt) {
    if ((phase !== 'play' && phase !== 'menu') || studio.open || window.__waifuFixedResolution) return;
    if (rawDt > 0.5) { perf.frames = 0; perf.time = 0; return; } // app switch or a one-off hitch
    perf.frames += 1; perf.time += rawDt;
    if (perf.time < 2) return;
    const fps = perf.frames / perf.time; perf.frames = 0; perf.time = 0;
    let next = perf.scale;
    if (fps < 50) next = Math.max(0.55, perf.scale * 0.88);
    else if (fps > 58 && perf.scale < 1) next = Math.min(1, perf.scale * 1.05);
    if (next !== perf.scale) { perf.scale = next; engine.setHardwareScalingLevel(hardwareLevel()); }
  }
  // Static materials and plinths are frozen once the gallery exists: no per-frame uniform/define/matrix checks.
  const frozenMaterials = [];
  function freezeStatics() {
    if (window.__waifuNoFreeze) return;
    for (const m of scene.materials) {
      // animated ones stay live, and fresnel holograms do not survive freezing (they render black)
      if (m === heldMat || m === fitBackdropMat || m.isFrozen || m.name.startsWith('halo-') || m.name === 'labelMat' || m.name.endsWith(':holo') || m.emissiveFresnelParameters) continue;
      m.freeze(); frozenMaterials.push(m);
    }
    if (editing) return; // the layout editor moves plinths
    for (const podium of podiums.values()) for (const m of podium.facing.getChildMeshes(true)) { m.computeWorldMatrix(true); m.freezeWorldMatrix(); }
    for (const n of niches.values()) for (const m of n.getChildMeshes()) { m.computeWorldMatrix(true); m.freezeWorldMatrix(); }
  }
  // Cinematic glide down the gallery aisle: it follows the statues as they are sculpted, then keeps drifting behind the menu.
  const cine = { t: Math.PI / 2 / 0.045 };
  const cineTarget = new BAB.Vector3();
  function renderShowcase(now, dt) {
    if (!editing) {
      cine.t += dt;
      const t = cine.t;
      const z = -100 + 28 * Math.sin(t * 0.045);
      camera.position.set(1.4 * Math.sin(t * 0.09), 4.3 + 0.3 * Math.sin(t * 0.07), z);
      cineTarget.set(8 * Math.sin(t * 0.11), 3.6, z - 12); // down the aisle, turning toward one row then the other
      camera.setTarget(cineTarget);
      petalEmitter.set(0, 0, z);
      for (const podium of podiums.values()) podium.figure.rotation.y = podium.poseTurn + Math.sin(now * 0.0005 + podium.group.position.x) * 0.06;
    }
    scene.render();
    if (envFrames < 4 && ++envFrames === 4) hallEnv.release();
  }
  function updateMenuMeta() {
    const placed = countPlaced(state); const complete = isGameComplete(state);
    const parts = [];
    if (placed) parts.push(`${placed} / ${FRAGMENTS.length} RESTORED`);
    if (placed) parts.push(formatTime(playSeconds));
    if (bestSeconds) parts.push(`BEST ${formatTime(bestSeconds)}`);
    const stars = countStars(meta); if (stars || Object.keys(meta.medals).length) parts.push(`★ ${stars}`);
    root.querySelector('#menu-meta').textContent = parts.join('  ·  ');
    root.querySelector('#menu-play-label').textContent = complete ? 'EXPLORE' : placed ? 'CONTINUE' : 'PLAY';
    menuEl.classList.toggle('complete', placed > 0); disarmNewRun();
    // today's challenge
    const daily = ensureDaily(); const c = dailyChallenge(daily.day);
    let status;
    if (daily.done) status = `✓ COMPLETE · +${DAILY_STARS}★ earned · ${meta.streak}-day streak`;
    else if (c.kind === 'secrets') status = `${Math.min(daily.reveals, c.count)} / ${c.count} opened today · reward +${DAILY_STARS}★`;
    else if (c.kind === 'speed' && (state.placed[c.setId]?.length || 0) === PARTS.length) status = `Already restored this run · start a NEW RUN to try · +${DAILY_STARS}★`;
    else status = `Reward +${DAILY_STARS}★${meta.streak && meta.lastDailyDay === dayBefore(daily.day) ? ` · keep your ${meta.streak}-day streak` : ''}`;
    root.querySelector('#daily-text').textContent = c.text; root.querySelector('#daily-status').textContent = status;
    root.querySelector('#daily-card').classList.toggle('done', daily.done);
  }
  function openMenu() {
    if (editing) return;
    if (puzzle && !puzzle.solvedAt) endPuzzle();
    phase = 'menu'; keys.clear(); lookPointer = null; stick.x = 0; stick.y = 0; stickPointer = null;
    root.querySelector('#stick-nub').style.transform = 'translate(0,0)';
    root.querySelector('#finish-banner').classList.remove('shown');
    hudEl.classList.add('offstage'); nearLabel.mesh.setEnabled(false);
    carriedVisual?.setEnabled(false); holo.root?.setEnabled(false);
    camera.fov = 1.02; showcaseAll(true); updateMenuMeta(); closePanels();
    menuEl.classList.add('shown');
    saveProgress(true);
  }
  function startPlay() {
    closePanels(); menuEl.classList.remove('shown'); hudEl.classList.remove('offstage');
    phase = 'play'; refreshPodiums(); carriedVisual?.setEnabled(true);
    camera.fov = PLAY_FOV; fovKick = 0; lastFrame = performance.now();
    aimCamera(); updateHUD();
    if (!tutorial && !meta.tutorialDone && !countPlaced(state) && !state.carried) startTutorial();
    else if (tutorial) showTutorialStep();
  }
  // ---------- interactive tutorial: five short steps that advance as the player actually does each thing ----------
  const TUTORIAL = [
    { icon: '☝', title: 'Look around', text: 'Drag anywhere on the screen to look around the hall.', hl: null,
      done: (t) => t.look > 0.9 },
    { icon: '✥', title: 'Take a walk', text: 'Use the stick at the bottom left (or WASD) to walk.', hl: '#stick-zone',
      done: (t) => t.walk > 5 },
    { icon: '✦', title: 'Find a fragment', text: 'Follow the beam of light to the nearest fragment and tap COLLECT. Some hide in chests or behind curtains: tap OPEN first.', hl: '#mobile-action',
      done: (t) => Boolean(state.carried) || countPlaced(state) > t.placed },
    { icon: '⌖', title: 'Bring it home', text: 'Carry it north into the sculpture gallery, to the plinth with the same name. The map shows where it is.', hl: '.map-card',
      done: (t) => Boolean(puzzle) || countPlaced(state) > t.placed || (state.carried && carriedInRange()) },
    { icon: '⟳', title: 'Turn & fit', text: 'Tap ASSEMBLE, then turn the piece until it matches the glowing TARGET.', hl: '#mobile-action',
      done: (t) => countPlaced(state) > t.placed },
  ];
  let tutorial = null;
  const coach = { card: root.querySelector('#coach'), icon: root.querySelector('#coach-icon'), step: root.querySelector('#coach-step'), title: root.querySelector('#coach-title'), text: root.querySelector('#coach-text') };
  function carriedInRange() {
    const podium = podiums.get(getFragment(state.carried).setId);
    return distance2(player.x, player.z, podium.group.position.x, podium.group.position.z) <= 5.2;
  }
  function startTutorial() {
    // with nothing left to collect (a finished run) only the look and walk steps can be shown
    tutorial = { index: 0, look: 0, walk: 0, placed: countPlaced(state), last: isGameComplete(state) ? 1 : TUTORIAL.length - 1 };
    showTutorialStep();
  }
  function showTutorialStep() {
    const step = TUTORIAL[tutorial.index];
    coach.icon.textContent = step.icon; coach.title.textContent = step.title; coach.text.textContent = step.text;
    coach.step.textContent = `TUTORIAL · ${tutorial.index + 1} / ${tutorial.last + 1}`;
    coach.card.classList.remove('shown'); void coach.card.offsetWidth; coach.card.classList.add('shown');
    root.querySelectorAll('.coach-hl').forEach((el) => el.classList.remove('coach-hl'));
    if (step.hl) root.querySelector(step.hl)?.classList.add('coach-hl');
  }
  function endTutorial(completed) {
    coach.card.classList.remove('shown');
    root.querySelectorAll('.coach-hl').forEach((el) => el.classList.remove('coach-hl'));
    tutorial = null; meta.tutorialDone = true; saveProgress();
    if (completed) { toast('Tutorial complete · now restore all twelve statues!', 'success', 3400); audio.play('complete', { volume: 0.6 }); }
  }
  function updateTutorial() {
    // jump past every step whose goal is already met, including later ones (picking up a fragment also proves walking)
    let next = tutorial.index;
    for (let j = tutorial.last; j >= tutorial.index; j -= 1) if (TUTORIAL[j].done(tutorial)) { next = j + 1; break; }
    if (next === tutorial.index) return;
    if (next > tutorial.last) { endTutorial(true); return; }
    tutorial.index = next; showTutorialStep(); audio.play('tap', { volume: 0.7 }); safeHaptic('tap');
  }
  root.querySelector('#coach-skip').addEventListener('click', () => { audio.play('tap', { volume: 0.5 }); endTutorial(false); });
  root.querySelector('#set-tutorial').addEventListener('click', () => { // replay from Settings
    audio.play('tap', { volume: 0.6 }); meta.tutorialDone = false; closePanels(); startPlay(); if (!tutorial) startTutorial();
  });
  function closePanels() { for (const panel of Object.values(panels)) panel.classList.remove('shown'); disarmReset(); }
  function openPanel(name) { closePanels(); panels[name].classList.add('shown'); if (name === 'settings') syncSettings(); else loadLeaderboard(); }
  root.querySelector('#menu-play').addEventListener('click', () => { audio.play('tap', { volume: 0.7 }); startPlay(); });
  root.querySelector('#menu-settings').addEventListener('click', () => openPanel('settings'));
  root.querySelector('#menu-leaderboard').addEventListener('click', () => openPanel('leaderboard'));
  root.querySelector('#menu-open').addEventListener('click', () => { if (phase === 'play') openMenu(); });
  root.querySelector('#finish-rank').addEventListener('click', () => { openMenu(); openPanel('leaderboard'); });
  root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closePanels));
  // settings
  const setInputs = { music: root.querySelector('#set-music'), sfx: root.querySelector('#set-sfx'), look: root.querySelector('#set-look') };
  const pct = (v) => `${Math.round(v * 100)}%`;
  function syncSettings() {
    setInputs.music.value = prefs.music; setInputs.sfx.value = prefs.sfx; setInputs.look.value = prefs.look;
    root.querySelector('#set-music-val').textContent = pct(prefs.music); root.querySelector('#set-sfx-val').textContent = pct(prefs.sfx);
    root.querySelector('#set-look-val').textContent = `${prefs.look.toFixed(1)}×`;
    root.querySelectorAll('#set-audio button').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'off') === audio.muted));
    root.querySelectorAll('#set-quality button').forEach((b) => b.classList.toggle('on', b.dataset.v === prefs.quality));
  }
  setInputs.music.addEventListener('input', () => { prefs.music = Number(setInputs.music.value); audio.setVolumes({ music: prefs.music }); syncSettings(); });
  setInputs.sfx.addEventListener('input', () => { prefs.sfx = Number(setInputs.sfx.value); audio.setVolumes({ sfx: prefs.sfx }); syncSettings(); });
  setInputs.look.addEventListener('input', () => { prefs.look = Number(setInputs.look.value); syncSettings(); });
  for (const input of Object.values(setInputs)) input.addEventListener('change', () => { if (input === setInputs.sfx) audio.play('pickup', { volume: 0.8 }); saveProgress(); });
  root.querySelectorAll('#set-audio button').forEach((b) => b.addEventListener('click', () => { audio.unlock(); audio.setMuted(b.dataset.v === 'off'); prefs.muted = audio.muted; refreshSoundButton(); syncSettings(); saveProgress(); }));
  root.querySelectorAll('#set-quality button').forEach((b) => b.addEventListener('click', () => { prefs.quality = b.dataset.v; applyQuality(); syncSettings(); saveProgress(); }));
  // NEW RUN: a fresh restoration (new times, closed chests) that keeps medals, portraits, stars and the streak
  const newRunButton = root.querySelector('#menu-newrun'); let newRunTimer = 0;
  function disarmNewRun() { clearTimeout(newRunTimer); newRunButton.classList.remove('armed'); newRunButton.querySelector('b').textContent = 'NEW RUN'; }
  newRunButton.addEventListener('click', () => {
    audio.play('tap', { volume: 0.6 });
    if (!isGameComplete(state) && !newRunButton.classList.contains('armed')) { // unfinished run: confirm first
      newRunButton.classList.add('armed'); newRunButton.querySelector('b').textContent = 'TAP AGAIN · RESTART THIS RUN';
      clearTimeout(newRunTimer); newRunTimer = setTimeout(disarmNewRun, 3500); return;
    }
    Object.assign(state, createInitialState()); playSeconds = 0; statueTimes = {}; finishedShown = false;
    newRunButton.querySelector('b').textContent = 'STARTING…';
    Promise.resolve(saveProgress(true)).finally(() => { if (window.run) window.run(mode); else window.location.reload(); });
  });
  const resetButton = root.querySelector('#set-reset'); let resetTimer = 0;
  function disarmReset() { clearTimeout(resetTimer); resetButton.classList.remove('armed'); resetButton.textContent = 'RESET PROGRESS'; }
  resetButton.addEventListener('click', () => {
    if (!resetButton.classList.contains('armed')) { // irreversible: ask for a second tap
      resetButton.classList.add('armed'); resetButton.textContent = 'TAP AGAIN TO ERASE ALL PROGRESS';
      clearTimeout(resetTimer); resetTimer = setTimeout(disarmReset, 3500); return;
    }
    disarmReset();
    const opened = state.revealed.length > 0 || Object.keys(meta.medals).length > 0;
    Object.assign(state, createInitialState()); playSeconds = 0; finishedShown = false; statueTimes = {};
    Object.assign(meta, freshMeta());
    if (opened || [...podiums.values()].some((p) => p.merged)) { // merged statues, open chests and medal badges: rebuild
      resetButton.textContent = 'RESETTING…';
      Promise.resolve(saveProgress(true)).finally(() => { if (window.run) window.run(mode); else window.location.reload(); });
      return;
    }
    refreshFragments(); showcaseAll(true); updateMenuMeta(); updateHUD(); saveProgress();
    resetButton.textContent = 'PROGRESS RESET'; resetTimer = setTimeout(disarmReset, 1800);
  });
  // ranking: fastest full restoration (lower time is better)
  async function submitScore(seconds) {
    try { await window.lib?.addPlayerScoreToLeaderboard?.(seconds, 10); } catch (error) { try { window.lib?.log?.(`Leaderboard: ${error.message}`); } catch { /* optional */ } }
  }
  async function loadLeaderboard() {
    const body = root.querySelector('#lb-body');
    body.innerHTML = '<div class="lb-note">Loading the ranking…</div>';
    let res = null;
    try { res = await window.lib?.getTopNEntriesFromLeaderboard?.(10); } catch { res = null; }
    if (disposed || !panels.leaderboard.classList.contains('shown')) return;
    const mine = bestSeconds
      ? `<div class="lb-note">Your best: <b>${formatTime(bestSeconds)}</b>${res?.userRank ? `  ·  rank #${res.userRank}` : ''}</div>`
      : '<div class="lb-note">Restore all twelve statues to set your time.</div>';
    const entries = Array.isArray(res?.entries) ? res.entries : [];
    if (!res) { body.innerHTML = `<div class="lb-note">The ranking is unavailable right now.</div>${mine}`; return; }
    if (!entries.length) { body.innerHTML = `<div class="lb-note">No restorations recorded yet. Be the first curator!</div>${mine}`; return; }
    body.innerHTML = entries.map((e, i) => {
      const name = escapeHtml(e.username || 'Curator');
      const avatar = e.profilePicture ? `<img src="${escapeHtml(e.profilePicture)}" alt="">` : escapeHtml(name.slice(0, 1).toUpperCase());
      return `<div class="lb-row${res.userRank === i + 1 ? ' me' : ''}"><span class="lb-rank">${i + 1}</span><span class="lb-avatar">${avatar}</span><span class="lb-name">${name}</span><span class="lb-time">${formatTime(e.score)}</span></div>`;
    }).join('') + mine;
  }
  // ---------- WebGL context loss (phone backgrounded, GPU reset): pause, save, rebuild, or offer a reload ----------
  const glLost = root.querySelector('#gl-lost'); let contextLost = false; let lostTimer = 0;
  engine.onContextLostObservable.add(() => {
    contextLost = true; glLost.classList.add('shown'); glLost.classList.remove('stuck');
    saveProgress(true);
    clearTimeout(lostTimer); lostTimer = setTimeout(() => { if (contextLost) glLost.classList.add('stuck'); }, 6000);
  });
  engine.onContextRestoredObservable.add(() => {
    contextLost = false; clearTimeout(lostTimer); glLost.classList.remove('shown', 'stuck');
    // the reflection probes' studio domes were released after their first render: build them again
    try { hallEnv.dispose?.(); } catch { /* already gone */ }
    hallEnv = setupStudioReflections(scene, BAB, 'daylight', new BAB.Vector3(0, 4, -100)); envFrames = 0;
    if (studio.scene) { try { studio.env.dispose?.(); } catch { /* already gone */ } studio.env = setupStudioReflections(studio.scene, BAB); studio.envFrames = 0; }
    refreshShadows(); lastFrame = performance.now(); layoutVersion += 1;
  });
  root.querySelector('#gl-reload').addEventListener('click', () => { Promise.resolve(saveProgress(true)).finally(() => { if (window.run) window.run(mode); else window.location.reload(); }); });
  boot().catch((error) => { bootStatus.textContent = 'THE ATELIER COULD NOT OPEN'; try { window.lib?.log?.(`Boot failed: ${error.stack || error}`); } catch { /* optional */ } });

  // Test/debug hook: lets automated checks pose the camera and state without touching gameplay rules.
  window.__waifuDebug = {
    holo, scene, camera, player, eye, state, podiums, fragments, containers, meta, pars, aimCamera, refreshFragments, updateHUD, studio, startPlay, openMenu, openPanel, updateAction, turnPuzzle,
    solvePuzzle() { if (!puzzle) return false; puzzle.yaw = 1; puzzle.flip = 0; turnPuzzle(-1, 0); return true; },
    showMedal: (setId, medal, seconds) => showMedal(getSet(setId), medal, seconds, false),
    get statueTimes() { return statueTimes; }, get lodLeft() { return lodQueue.length; }, get tutorial() { return tutorial; }, get puzzle() { return puzzle; }, get ready() { return ready; }, get phase() { return phase; },
  };

  return () => {
    disposed = true;
    engine.stopRenderLoop();
    try { studio.fx?.dispose(); studio.kit?.dispose(); studio.scene?.dispose(); } catch { /* no-op */ }
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', pointerMove);
    window.removeEventListener('pointerup', pointerUp);
    window.removeEventListener('pointercancel', pointerUp);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keydown', unlockAudio, { capture: true });
    audio.dispose();
    try { window.lib?.haptics?.stop?.(); } catch { /* no-op */ }
    delete window.__waifuDebug;
    try { pipeline?.dispose(); } catch { /* no-op */ }
    kit.dispose();
    scene.dispose();
    engine.dispose();
    root.remove();
  };
}

// A hidden "photo studio" dome is rendered once into a cube map so PBR gold, hair clear-coat and shoes pick up soft, flattering reflections.
function setupStudioReflections(scene, BAB, palette = 'studio', probeAt = new BAB.Vector3(0, 3, -115)) {
  const tex = new BAB.DynamicTexture('studioSky', { width: 1024, height: 512 }, scene, true);
  const ctx = tex.getContext();
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  if (palette === 'daylight') { g.addColorStop(0, '#dfe4ea'); g.addColorStop(0.42, '#d9d8d2'); g.addColorStop(0.52, '#d6cbb9'); g.addColorStop(0.7, '#b3a58f'); g.addColorStop(1, '#7f725f'); }
  else { g.addColorStop(0, '#9084d8'); g.addColorStop(0.32, '#d08cb8'); g.addColorStop(0.5, '#e0b9a2'); g.addColorStop(0.68, '#463a76'); g.addColorStop(1, '#120d26'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
  const softbox = (x, y, w, h, color) => {
    const r = ctx.createRadialGradient(x, y, 4, x, y, Math.max(w, h));
    r.addColorStop(0, color); r.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = r; ctx.fillRect(x - w, y - h, w * 2, h * 2);
    ctx.fillStyle = color; ctx.fillRect(x - w * 0.45, y - h * 0.45, w * 0.9, h * 0.9);
  };
  softbox(130, 150, 90, 56, '#ffffff'); softbox(420, 130, 110, 50, '#fff4e6'); softbox(700, 160, 90, 60, '#ffe0f0'); softbox(930, 140, 80, 50, '#e3f6ff');
  tex.update(true);
  const dome = BAB.MeshBuilder.CreateSphere('studioDome', { diameter: 300, segments: 24, sideOrientation: BAB.Mesh.BACKSIDE }, scene);
  const dm = new BAB.StandardMaterial('studioDomeMat', scene);
  dm.disableLighting = true; dm.emissiveTexture = tex; dm.fogEnabled = false; dm.backFaceCulling = false;
  dome.material = dm; dome.isPickable = false; dome.infiniteDistance = true;
  const probe = new BAB.ReflectionProbe('studioProbe', 256, scene, true);
  probe.position = probeAt;
  probe.renderList.push(dome);
  probe.refreshRate = BAB.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  scene.environmentTexture = probe.cubeTexture;
  scene.environmentIntensity = palette === 'daylight' ? 0.55 : 0.5;
  return {
    release() {
      // Once the probe has rendered, the dome and its sky texture are no longer needed.
      dome.dispose(false, true);
    },
    dispose() { try { dome.dispose(false, true); } catch { /* released */ } probe.dispose(); },
  };
}

function distance2(x1, z1, x2, z2) { return Math.hypot(x1 - x2, z1 - z2); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function clonePositions(positions) { return Object.fromEntries(SETS.map((set) => [set.id, [...positions[set.id]]])); }
