import {
  ANNEX, FRAGMENTS, GALLERY_DOOR, HALL_SIZE, INITIAL_PODIUMS, PARTS, SETS,
  countPlaced, createInitialState, formatTime, getFragment, getSet, isGameComplete,
  pickup, placeCarried, restoreState, serializeState,
} from './logic.mjs';
import { escapeHtml, installStyles, roundRect, uiMarkup } from './ui.js';
import { PART_OFFSET, buildBust, buildStatuePart, createStatueKit } from './statues.js';
import { DEFAULT_EXPR, FACE_PRESETS } from './faces.mjs';
import { STATUE_POSES } from './poses.mjs';
import { buildFragment, buildPodium, buildWorld, makeLabel, petalTexture, starTexture } from './world.js';
import { createAudio } from './audio.js';

// Babylon.js presentation, input, and Astrocade shell. Play is first-person; Edit is a touch-friendly overhead gallery layout editor.
// The statues stand about 5 units tall on their plinths, so the visitor's eye sits at EYE_HEIGHT to meet them at chest height.
const EYE_HEIGHT = 3.2;
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

  const hallEnv = setupStudioReflections(scene, BAB, 'daylight', new BAB.Vector3(0, 4, -100));

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
  const forwardVec = () => new BAB.Vector3(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch));
  const aimCamera = (y = EYE_HEIGHT) => {
    camera.position.set(player.x, y, player.z);
    camera.setTarget(camera.position.add(forwardVec()));
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
    map: root.querySelector('#mini-map'), editorMap: root.querySelector('#editor-map'),
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
  let lastFrame = performance.now();
  let lookPointer = null;
  let editPointer = null;
  let stickPointer = null;
  const stick = { x: 0, y: 0 };
  const keys = new Set();

  const toast = (message, tone = 'normal') => {
    ui.toast.textContent = message;
    ui.toast.dataset.tone = tone;
    ui.toast.classList.add('visible');
    toastUntil = performance.now() + 2300;
    if (tone === 'success') safeHaptic('success');
    else if (tone === 'normal') safeHaptic('tap');
  };
  const safeHaptic = (effect) => { try { window.lib?.haptics?.play?.(effect); } catch { /* optional on the host */ } };
  const saveProgress = () => {
    const save = window.lib?.saveUserGameState;
    if (!save) return;
    prefs.muted = audio.muted;
    const payload = { waifuAssembler: serializeState(state), playSeconds: Math.round(playSeconds), bestSeconds, prefs: { ...prefs }, audioMuted: audio.muted };
    try { Promise.resolve(save(payload)).catch(() => {}); } catch { /* local play remains available */ }
  };
  // ---------- 3D hologram projection inside the HUD card ----------
  // The real statue, rebuilt with the hologram material, floats in front of the camera exactly behind the card's
  // transparent window; the component being carried glows red so the player sees where it belongs.
  const holo = { root: null, spin: null, key: null, base: Math.PI, sway: 0.6 };
  const heldMat = new BAB.StandardMaterial('holoHeld', scene);
  heldMat.disableLighting = true; heldMat.backFaceCulling = false; heldMat.alphaMode = BAB.Engine.ALPHA_COMBINE; heldMat.alpha = 0.85; heldMat.needDepthPrePass = true;
  heldMat.emissiveColor = BAB.Color3.FromHexString('#ff3d5e');
  heldMat.emissiveFresnelParameters = new BAB.FresnelParameters({ bias: 0.25, power: 1.6, leftColor: BAB.Color3.FromHexString('#ffd0da'), rightColor: BAB.Color3.FromHexString('#ff2a50') });
  function rebuildHologram() {
    const key = state.carried;
    if (key === holo.key) return;
    if (holo.root) { holo.root.dispose(false, false); holo.root = null; }
    holo.key = key;
    if (!key) return;
    const fragment = getFragment(key); const pose = STATUE_POSES[fragment.setId];
    const root = new BAB.TransformNode('holoRoot', scene); const spin = new BAB.TransformNode('holoSpin', scene); spin.parent = root;
    const fig = new BAB.TransformNode('holoFig', scene); fig.parent = spin; fig.position.y = -2.15; // centre the 4.3-unit figure
    for (const part of PARTS) {
      const anchor = new BAB.TransformNode('holoAnchor', scene); anchor.parent = fig; anchor.position.set(...PART_OFFSET[part.id]);
      if (part.id === 'head' && pose.head) anchor.rotation.set(...pose.head);
      const mesh = buildStatuePart(kit, scene, part.id, fragment.setId, true); mesh.parent = anchor;
      if (part.id === fragment.partId) for (const m of mesh.getChildMeshes()) m.material = heldMat;
    }
    const set = getSet(fragment.setId); const c = BAB.Color3.FromHexString(set.color);
    const ringMat = new BAB.StandardMaterial('holoRing', scene); ringMat.disableLighting = true; ringMat.emissiveColor = c.scale(1.1); ringMat.alpha = 0.9;
    for (const [d, y, t] of [[2.2, -2.15, 0.05], [1.5, -2.1, 0.03]]) {
      const ring = BAB.MeshBuilder.CreateTorus('holoRing', { diameter: d, thickness: t, tessellation: 48 }, scene); ring.parent = spin; ring.position.y = y; ring.material = ringMat;
    }
    const beam = BAB.MeshBuilder.CreateCylinder('holoBeam', { height: 4.4, diameterTop: 1.6, diameterBottom: 2.1, tessellation: 32, cap: BAB.Mesh.NO_CAP }, scene);
    const beamMat = new BAB.StandardMaterial('holoBeamMat', scene); beamMat.disableLighting = true; beamMat.emissiveColor = c; beamMat.alpha = 0.08; beamMat.backFaceCulling = false;
    beam.material = beamMat; beam.parent = spin;
    for (const m of root.getChildMeshes()) { m.renderingGroupId = 1; m.isPickable = false; }
    root.onDisposeObservable.add(() => { ringMat.dispose(); beamMat.dispose(); });
    holo.root = root; holo.spin = spin;
  }
  function updateHologram(now) {
    if (!holo.root) return;
    const rect = ui.blueprintBody.getBoundingClientRect(); const crect = canvas.getBoundingClientRect();
    if (!rect.height) { holo.root.setEnabled(false); return; }
    holo.root.setEnabled(true);
    const dist = 4;
    const ray = scene.createPickingRay(rect.left + rect.width / 2 - crect.left, rect.top + rect.height / 2 - crect.top, BAB.Matrix.Identity(), camera);
    holo.root.position.copyFrom(ray.origin.add(ray.direction.scale(dist)));
    const worldPerPx = (2 * dist * Math.tan(camera.fov / 2)) / crect.height;
    holo.root.scaling.setAll((rect.height * 0.92 * worldPerPx) / 4.4);
    holo.root.rotationQuaternion = camera.absoluteRotation.clone();
    holo.spin.rotation.y = holo.base + Math.sin(now * 0.0007) * holo.sway;
    heldMat.alpha = 0.7 + Math.sin(now * 0.008) * 0.25;
  }
  const refreshPodiums = () => {
    for (const set of SETS) {
      const podium = podiums.get(set.id);
      const placed = state.placed[set.id] || [];
      podium.label.setText(`${set.name}  ·  ${placed.length}/5`);
      for (const part of PARTS) {
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
      const absent = state.collected.includes(fragment.key) || state.placed[fragment.setId]?.includes(fragment.partId);
      model.root.setEnabled(!absent);
    }
    if (carriedVisual) {
      carriedVisual.dispose(false, false);
      carriedVisual = null;
    }
    if (state.carried) {
      const fragment = getFragment(state.carried);
      carriedVisual = buildStatuePart(kit, scene, fragment.partId, fragment.setId, false);
      carriedVisual.scaling.setAll(0.19);
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
    ui.blueprint.classList.add('shown');
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

  const updateHUD = () => {
    ui.progress.textContent = `${countPlaced(state)} / ${FRAGMENTS.length}`;
    const nearest = nearestAvailable();
    if (state.carried) {
      const fragment = getFragment(state.carried);
      const set = getSet(fragment.setId);
      const podium = podiums.get(set.id);
      const dist = distance2(player.x, player.z, podium.group.position.x, podium.group.position.z);
      const inRange = dist <= 5.2;
      ui.status.innerHTML = `<b>${inRange ? 'PLINTH IN RANGE' : 'TO THE GALLERY'}</b><span>${set.name} &nbsp;·&nbsp; ${Math.ceil(dist)}m to its plinth</span>`;
      ui.target.innerHTML = `<i class="target-dot" style="--dot:${set.color}"></i><span>Carry <b>${fragment.partId.replace('armL', 'left arm').replace('armR', 'right arm')}</b> to its matching plinth</span>`;
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
      ui.status.innerHTML = `<b>${close ? 'FRAGMENT NEARBY' : 'SEARCH THE HALL'}</b><span>${set.name} &nbsp;·&nbsp; ${Math.ceil(dist)}m away</span>`;
      ui.target.innerHTML = `<i class="target-dot" style="--dot:${set.color}"></i><span>${arrow} &nbsp;${set.name} / ${nearest.part.label}</span>`;
      ui.action.disabled = !close;
      ui.action.classList.toggle('ready', close);
      ui.actionLabel.textContent = close ? 'COLLECT' : 'SEARCH';
      ui.action.setAttribute('aria-label', close ? `Collect ${nearest.part.label}` : 'Find the highlighted statue fragment');
    } else {
      ui.status.innerHTML = `<b>RESTORATION COMPLETE</b><span>All ${SETS.length} figures are ready for display</span>`;
      ui.target.innerHTML = `<i class="target-dot" style="--dot:#80e8ce"></i><span>Every piece has found its home. Lovely work.</span>`;
      ui.action.disabled = true;
      ui.actionLabel.textContent = 'COMPLETE';
    }
    drawMiniMap();
  };
  function nearestAvailable() {
    let best = null;
    for (const fragment of FRAGMENTS) {
      if (state.collected.includes(fragment.key) || state.placed[fragment.setId]?.includes(fragment.partId)) continue;
      const distance = Math.hypot(player.x - fragment.x, player.z - fragment.z);
      if (!best || distance < best.distance) best = { fragment, distance, part: PARTS.find((part) => part.id === fragment.partId) };
    }
    return best;
  }
  function drawMiniMap() {
    const ctx = miniCtx;
    const w = ui.map.width;
    const h = ui.map.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(10,15,28,.86)';
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
    ctx.fillStyle = 'rgba(10,15,28,1)'; ctx.fillRect(px(-GALLERY_DOOR), pz(-half) - 1.5, GALLERY_DOOR * 2 * k, 3);
    for (const set of SETS) {
      const p = podiums.get(set.id).group.position; const done = (state.placed[set.id]?.length || 0) === PARTS.length;
      ctx.beginPath(); ctx.arc(px(p.x), pz(p.z), 2.6, 0, Math.PI * 2);
      ctx.fillStyle = set.color; ctx.globalAlpha = done ? 1 : 0.55; ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = done ? '#ffe2a8' : 'rgba(255,255,255,.5)'; ctx.stroke();
    }
    for (const f of FRAGMENTS) {
      if (state.collected.includes(f.key) || state.placed[f.setId]?.includes(f.partId)) continue;
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
      ctx.fillStyle = 'rgba(9,15,29,.97)'; ctx.fill();
      // The gallery is ANNEX wide x long; plinths line both sides of the central aisle.
      const left = 20, top = 18, rw = w - 40, rh = h - 36;
      ctx.fillStyle = '#131d31'; ctx.fillRect(left, top, rw, rh);
      ctx.strokeStyle = 'rgba(91,228,237,.55)'; ctx.lineWidth = 2; ctx.strokeRect(left, top, rw, rh);
      ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(120,175,196,.15)'; ctx.beginPath(); ctx.moveTo(w / 2, top + 12); ctx.lineTo(w / 2, top + rh - 12); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(196,220,234,.42)'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('CENTRAL AISLE', w / 2, h / 2 + 3);
      ctx.font = '700 8px system-ui'; ctx.fillStyle = 'rgba(139,182,201,.54)'; ctx.fillText('SCULPTURE GALLERY · ENTRANCE AT THE TOP', w / 2, h - 5);
      for (const set of SETS) {
        const pos = podiumPositions[set.id];
        const x = left + (pos[0] - ANNEX.minX) / (ANNEX.maxX - ANNEX.minX) * rw;
        const y = top + (ANNEX.nearZ - pos[1]) / (ANNEX.nearZ - ANNEX.farZ) * rh;
        const isSelected = selectedEditorSet === set.id;
        ctx.beginPath(); ctx.arc(x, y, isSelected ? 25 : 21, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? `${set.color}42` : 'rgba(15,24,38,.96)'; ctx.fill();
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
    if (editing || phase !== 'play') return;
    if (!state.carried) {
      const target = nearestAvailable();
      if (!target || target.distance > useRange) return;
      const next = pickup(state, target.fragment.key);
      if (next === state) return;
      hasInteracted = true;
      Object.assign(state, next);
      const model = fragments.get(target.fragment.key);
      sparkle(new BAB.Vector3(target.fragment.x, 2.3, target.fragment.z), getSet(target.fragment.setId).color, 60);
      void model;
      refreshFragments(); saveProgress(); updateHUD();
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
    const next = placeCarried(state, fragment.setId);
    if (next === state) return;
    hasInteracted = true;
    Object.assign(state, next);
    const set = getSet(fragment.setId);
    const offset = ({ legs: 1.6, torso: 3.0, head: 4.3, armL: 3.2, armR: 3.2 })[fragment.partId] || 2.4;
    sparkle(new BAB.Vector3(podium.group.position.x, offset, podium.group.position.z), set.color, 110);
    refreshFragments(); saveProgress(); updateHUD();
    const done = state.placed[set.id].length === PARTS.length;
    if (done) sparkle(new BAB.Vector3(podium.group.position.x, 5, podium.group.position.z), '#ffffff', 200);
    toast(done ? `${set.name} restored · display complete!` : `${set.name} · ${state.placed[set.id].length}/5 pieces assembled`, 'success');
    if (isGameComplete(state) && !finishedShown) { audio.play('place', { volume: 0.8 }); audio.play('finale'); audio.duck(6); }
    else if (done) { audio.play('place', { volume: 0.8 }); audio.play('complete'); audio.duck(4); }
    else audio.play('place', { rate: 0.96 + state.placed[set.id].length * 0.02 });
    if (isGameComplete(state) && !finishedShown) {
      finishedShown = true;
      const final = Math.max(1, Math.round(playSeconds)); const isBest = !bestSeconds || final < bestSeconds;
      if (isBest) bestSeconds = final;
      root.querySelector('#finish-time').textContent = `${formatTime(final)}${isBest ? '  ·  NEW BEST' : ''}`;
      root.querySelector('#finish-banner').classList.add('shown');
      saveProgress(); submitScore(final);
      safeHaptic('success');
      try { window.lib?.log?.('All Waifu Assembler statues restored.'); } catch { /* optional */ }
    }
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
    player.x = x; player.z = z;
    aimCamera(eye.y + Math.sin(performance.now() * 0.008) * Math.min(0.028, magnitude * 0.018));
  }
  const tmpRight = new BAB.Vector3();
  function updateCarried(now) {
    if (!carriedVisual) return;
    const fwd = forwardVec();
    tmpRight.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const up = BAB.Vector3.Cross(tmpRight, fwd);
    carriedVisual.position.copyFrom(camera.position).addInPlace(tmpRight.scale(0.42)).addInPlace(up.scale(-0.3 + Math.sin(now * 0.003) * 0.012)).addInPlace(fwd.scale(1.6));
    carriedVisual.rotation.set(-0.12, player.yaw - 0.28 + Math.sin(now * 0.0022) * 0.07, 0);
  }
  const FRAGMENT_VIEW = 46; const STATUE_VIEW = 92;
  function updateObjects(now, dt) {
    for (const fragment of FRAGMENTS) { // only fragments near the visitor are drawn; fog hides the rest anyway
      const model = fragments.get(fragment.key);
      const absent = state.collected.includes(fragment.key) || state.placed[fragment.setId]?.includes(fragment.partId);
      const near = editing || Math.hypot(player.x - fragment.x, player.z - fragment.z) < FRAGMENT_VIEW;
      model.root.setEnabled(!absent && near);
    }
    for (const podium of podiums.values()) {
      const d = Math.hypot(player.x - podium.group.position.x, player.z - podium.group.position.z);
      const show = editing || d < STATUE_VIEW;
      if (show !== podium.figure.isEnabled(false)) { podium.figure.setEnabled(show); refreshShadows(); }
      podium.labelMesh.setEnabled(editing || d < 30); // only nearby name cards, so the gallery isn't cluttered
    }
    for (const model of fragments.values()) {
      if (!model.root.isEnabled()) continue;
      model.spin.rotation.y += 0.26 * dt;
      model.root.position.y = model.baseY + Math.sin(now * 0.0018 + model.phase) * 0.13;
      model.floorGlow.position.y = 0.02 - model.root.position.y;
    }
    for (const podium of podiums.values()) {
      if (podium.finished.isEnabled()) {
        podium.finished.rotation.y += dt * 1.1;
        podium.finished.position.y = 5.7 + Math.sin(now * 0.002) * 0.08;
      }
      podium.figure.rotation.y = podium.poseTurn + Math.sin(now * 0.0005 + podium.group.position.x) * 0.06;
    }
    if (!editing) {
      petalEmitter.set(player.x, 0, player.z);
      let best = null;
      if (!state.carried) best = nearestAvailable()?.fragment.key;
      for (const fragment of FRAGMENTS) {
        const model = fragments.get(fragment.key);
        model.beacon.setEnabled(Boolean(best === fragment.key));
        model.ringMat.alpha = best === fragment.key ? 0.75 + Math.sin(now * 0.006) * 0.2 : 0;
      }
      const target = best ? getFragment(best) : null;
      const showLabel = target && Math.hypot(player.x - target.x, player.z - target.z) < 18;
      nearLabel.mesh.setEnabled(Boolean(showLabel));
      if (showLabel) {
        const set = getSet(target.setId); const part = PARTS.find((p) => p.id === target.partId);
        nearLabel.setText(`${set.name} · ${part.short}`, set.color);
        nearLabel.mesh.position.set(target.x, 4.35, target.z);
      }
      const elapsed = now - stateChangedAt;
      if (elapsed > 190) { stateChangedAt = now; updateHUD(); }
    }
    if (ui.toast.classList.contains('visible') && now > toastUntil) ui.toast.classList.remove('visible');
  }
  let envFrames = 0;
  // ---------- Character Studio: 12 figures × 10 expressions in their own studio-lit scene ----------
  const studio = { open: false, scene: null, kit: null, holder: null, bust: null, index: 0, expr: 'neutral', yaw: 0, pitch: 0, drag: null, idleAt: 0, env: null, envFrames: 0, fx: null };
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
  function showStudioFigure() {
    const preset = FACE_PRESETS[studio.index];
    if (studio.bust) { const { id, expr } = studio.bustInfo; studio.bust.dispose(false, false); studio.kit.releaseFace(id, expr); }
    studio.bust = buildBust(studio.kit, studio.scene, preset.id, studio.expr);
    studio.bustInfo = { id: preset.id, expr: studio.expr };
    studio.bust.parent = studio.holder; studio.bust.position.set(0, -3.8, 0);
    root.querySelector('#studio-name').textContent = preset.name;
    root.querySelector('#studio-title').textContent = preset.title;
    root.querySelector('#studio-count').textContent = `${studio.index + 1} / ${FACE_PRESETS.length}`;
    root.querySelectorAll('[data-expr]').forEach((b) => b.classList.toggle('active', b.dataset.expr === studio.expr));
    studio.idleAt = performance.now();
  }
  function openStudio() {
    ensureStudio(); studio.open = true; studioEl.classList.add('shown'); root.querySelector('.hud').classList.add('studio-on');
    if (!studio.bust) { studio.expr = DEFAULT_EXPR[FACE_PRESETS[studio.index].id] || 'neutral'; showStudioFigure(); }
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
  root.querySelectorAll('[data-expr]').forEach((b) => b.addEventListener('click', () => { studio.expr = b.dataset.expr; showStudioFigure(); }));
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
    if (disposed) return;
    const now = performance.now();
    const dt = Math.min(0.11, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    if (studio.open) { renderStudio(now); return; }
    if (phase === 'loading' || phase === 'menu') { renderShowcase(now, dt); return; }
    if (phase === 'play') { movePlayer(dt); if (!isGameComplete(state)) playSeconds += dt; }
    updateObjects(now, dt);
    updateCarried(now);
    updateHologram(now);
    scene.render();
    if (envFrames < 4 && ++envFrames === 4) hallEnv.release();
  }
  engine.runRenderLoop(render);

  function resize() { engine.resize(); }
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
    } else lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, isDrag: false };
    canvas.setPointerCapture?.(event.pointerId);
  }
  function pointerMove(event) {
    if (!lookPointer || lookPointer.id !== event.pointerId) return;
    const dx = event.clientX - lookPointer.x, dy = event.clientY - lookPointer.y;
    if (!editing || !lookPointer.isDrag) {
      player.yaw -= dx * 0.0042 * prefs.look;
      player.pitch = clamp(player.pitch - dy * 0.0032 * prefs.look, -1.18, 1.18);
    }
    lookPointer.x = event.clientX; lookPointer.y = event.clientY;
  }
  function pointerUp(event) { if (lookPointer?.id === event.pointerId) lookPointer = null; }
  canvas.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointermove', pointerMove, { passive: false });
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerUp);
  window.addEventListener('resize', resize);
  const keyDown = (event) => {
    const k = event.key.toLowerCase();
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

  // ---------- 3D loading screen, main menu, settings and ranking ----------
  const hudEl = root.querySelector('.hud');
  const bootEl = root.querySelector('#boot'); const bootFill = root.querySelector('#boot-fill'); const bootStatus = root.querySelector('#boot-status');
  const menuEl = root.querySelector('#menu');
  const panels = { settings: root.querySelector('#settings-panel'), leaderboard: root.querySelector('#leaderboard-panel') };
  hudEl.classList.add('offstage');
  if (!editing) camera.fov = 1.02;
  const nextFrame = () => new Promise((resolve) => { requestAnimationFrame(() => resolve()); setTimeout(resolve, 200); });
  // Plinths show their finished statue (solid) or the hologram of what is still missing.
  function showcase(podium, on) {
    for (const { ghost, solid } of podium.figureParts.values()) { ghost.setEnabled(!on); solid.setEnabled(on); }
    if (on) { podium.finished.setEnabled(false); podium.labelMesh.setEnabled(false); podium.figure.setEnabled(true); }
  }
  function showcaseAll(on) { for (const podium of podiums.values()) showcase(podium, on); refreshShadows(); }
  async function boot() {
    const steps = SETS.length + 2; let step = 0;
    const progress = (label, advance = true) => { if (advance) step += 1; bootFill.style.width = `${Math.max(4, Math.round((step / steps) * 100))}%`; bootStatus.textContent = label; };
    // Each statue part is sculpted once: the plinth keeps the original (and a merged hologram copy of it), and the
    // fragment waiting in the hall is a clone that shares its geometry and materials.
    for (const set of SETS) {
      progress(`SCULPTING ${set.name}`, false);
      await nextFrame(); if (disposed) return;
      const parts = new Map(PARTS.map((part) => [part.id, buildStatuePart(kit, scene, part.id, set.id, false)]));
      const podium = buildPodium(scene, kit, set, podiumPositions[set.id], shadows, parts);
      podiums.set(set.id, podium);
      niches.set(set.id, world.niche(set, ...podiumPositions[set.id]));
      if (!editing) showcase(podium, true);
      refreshShadows(); progress(`${set.name} · RESTORED`);
    }
    progress('SCATTERING THE FRAGMENTS', false);
    await nextFrame(); if (disposed) return;
    for (const fragment of FRAGMENTS) {
      const source = podiums.get(fragment.setId).figureParts.get(fragment.partId).solid;
      const part = source.clone(`frag-part-${fragment.key}`, null);
      part.setEnabled(true); for (const m of part.getChildMeshes()) m.setEnabled(true);
      const model = buildFragment(scene, kit, fragment, part);
      for (const m of model.root.getChildMeshes()) m.isPickable = false;
      fragments.set(fragment.key, model);
    }
    progress('OPENING THE GALLERY');
    applySave(await savedGame); if (disposed) return;
    ready = true;
    refreshFragments(); updateHUD();
    if (editing) { phase = 'edit'; refreshEditorMap(); hudEl.classList.remove('offstage'); bootEl.classList.add('done'); return; }
    showcaseAll(true);
    await new Promise((resolve) => setTimeout(resolve, 450)); if (disposed) return;
    bootEl.classList.add('done');
    openMenu();
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
    audio.setVolumes({ music: prefs.music, sfx: prefs.sfx }); audio.setMuted(prefs.muted);
    refreshSoundButton(); applyQuality();
    finishedShown = isGameComplete(state);
  }
  function applyQuality() {
    engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, prefs.quality === 'high' ? 1.5 : 1));
    key.shadowEnabled = prefs.quality === 'high'; refreshShadows();
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
    root.querySelector('#menu-meta').textContent = parts.join('  ·  ');
    root.querySelector('#menu-play-label').textContent = complete ? 'EXPLORE' : placed ? 'CONTINUE' : 'PLAY';
  }
  function openMenu() {
    if (editing) return;
    phase = 'menu'; keys.clear(); lookPointer = null; stick.x = 0; stick.y = 0; stickPointer = null;
    root.querySelector('#stick-nub').style.transform = 'translate(0,0)';
    root.querySelector('#finish-banner').classList.remove('shown');
    hudEl.classList.add('offstage'); nearLabel.mesh.setEnabled(false);
    carriedVisual?.setEnabled(false); holo.root?.setEnabled(false);
    camera.fov = 1.02; showcaseAll(true); updateMenuMeta(); closePanels();
    menuEl.classList.add('shown');
    saveProgress();
  }
  function startPlay() {
    closePanels(); menuEl.classList.remove('shown'); hudEl.classList.remove('offstage');
    phase = 'play'; refreshPodiums(); carriedVisual?.setEnabled(true);
    camera.fov = BAB.Tools.ToRadians(74); lastFrame = performance.now();
    aimCamera(); updateHUD();
  }
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
  const resetButton = root.querySelector('#set-reset'); let resetTimer = 0;
  function disarmReset() { clearTimeout(resetTimer); resetButton.classList.remove('armed'); resetButton.textContent = 'RESET PROGRESS'; }
  resetButton.addEventListener('click', () => {
    if (!resetButton.classList.contains('armed')) { // irreversible: ask for a second tap
      resetButton.classList.add('armed'); resetButton.textContent = 'TAP AGAIN TO ERASE ALL PROGRESS';
      clearTimeout(resetTimer); resetTimer = setTimeout(disarmReset, 3500); return;
    }
    disarmReset();
    Object.assign(state, createInitialState()); playSeconds = 0; finishedShown = false;
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
  boot().catch((error) => { bootStatus.textContent = 'THE ATELIER COULD NOT OPEN'; try { window.lib?.log?.(`Boot failed: ${error.stack || error}`); } catch { /* optional */ } });

  // Test/debug hook: lets automated checks pose the camera and state without touching gameplay rules.
  window.__waifuDebug = { holo, scene, camera, player, eye, state, podiums, fragments, aimCamera, refreshFragments, updateHUD, studio, startPlay, openMenu, openPanel, get ready() { return ready; }, get phase() { return phase; } };

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
  };
}

function distance2(x1, z1, x2, z2) { return Math.hypot(x1 - x2, z1 - z2); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function clonePositions(positions) { return Object.fromEntries(SETS.map((set) => [set.id, [...positions[set.id]]])); }
