import {
  ANNEX, FRAGMENTS, INITIAL_PODIUMS, PARTS, SETS,
  countPlaced, createInitialState, getFragment, getSet, isGameComplete,
  pickup, placeCarried, restoreState, serializeState,
} from './logic.mjs';
import { blueprintSvg, escapeHtml, installStyles, roundRect, uiMarkup } from './ui.js';
import { buildStatuePart, createStatueKit } from './statues.js';
import { buildFragment, buildPodium, buildWorld, petalTexture, starTexture } from './world.js';

// Babylon.js presentation, input, and Astrocade shell. Play is first-person; Edit is a touch-friendly overhead annex layout editor.
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
  const podiumPositions = {};
  for (const set of SETS) {
    const raw = config.podiumPositions?.[set.id] || INITIAL_PODIUMS[set.id];
    podiumPositions[set.id] = [clamp(Number(raw[0]) || 0, -52, 52), clamp(Number(raw[1]) || -100, -140, -92)];
  }
  if (editing) {
    window.gameConfig ||= {};
    window.gameConfig.settings ||= { walkSpeed: 9, interactRange: 3.6 };
    window.gameConfig.podiumPositions = clonePositions(podiumPositions);
  }
  try {
    window.lib?.showGameParameters?.({
      name: 'Restoration Atelier',
      params: {
        'Walk speed': { key: 'settings.walkSpeed', type: 'slider', min: 4, max: 14, step: 1 },
        'Pickup range': { key: 'settings.interactRange', type: 'slider', min: 2.5, max: 5.5, step: 0.5 },
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
  scene.clearColor = new BAB.Color4(0.075, 0.07, 0.15, 1);
  scene.fogMode = BAB.Scene.FOGMODE_EXP2;
  scene.fogColor = new BAB.Color3(0.13, 0.12, 0.25);
  scene.fogDensity = 0.0027;

  const camera = new BAB.FreeCamera('eye', new BAB.Vector3(0, 1.65, 32), scene);
  camera.inputs.clear();
  camera.minZ = 0.08; camera.maxZ = 260;
  camera.fov = BAB.Tools.ToRadians(editing ? 102 : 74);
  scene.activeCamera = camera;

  // ---------- lighting ----------
  const hemi = new BAB.HemisphericLight('hemi', new BAB.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.55; hemi.diffuse = BAB.Color3.FromHexString('#cdd6ff'); hemi.groundColor = BAB.Color3.FromHexString('#6b5a86'); hemi.specular = BAB.Color3.Black();
  const key = new BAB.DirectionalLight('key', new BAB.Vector3(-0.35, -1, -0.5).normalize(), scene);
  key.position = new BAB.Vector3(14, 46, -96);
  key.diffuse = BAB.Color3.FromHexString('#ffe4cc'); key.intensity = 1.55;
  key.autoUpdateExtends = false; key.orthoLeft = -66; key.orthoRight = 66; key.orthoBottom = -42; key.orthoTop = 42; key.shadowMinZ = 4; key.shadowMaxZ = 120;
  const rim = new BAB.DirectionalLight('rim', new BAB.Vector3(-0.25, -0.5, 1).normalize(), scene);
  rim.diffuse = BAB.Color3.FromHexString('#ff9fd0'); rim.intensity = 1.1;
  const shadows = new BAB.ShadowGenerator(2048, key);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = BAB.ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.0006; shadows.normalBias = 0.02; shadows.setDarkness(0.38);

  const studio = setupStudioReflections(scene, BAB);

  // ---------- cinematic post-processing ----------
  let pipeline = null;
  try {
    pipeline = new BAB.DefaultRenderingPipeline('cinema', true, scene, [camera]);
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = true; pipeline.bloomThreshold = 0.72; pipeline.bloomWeight = 0.42; pipeline.bloomKernel = 56; pipeline.bloomScale = 0.5;
    pipeline.imageProcessingEnabled = true;
  } catch (error) { window.lib?.log?.(`Post-processing unavailable: ${error.message}`); }
  const ip = scene.imageProcessingConfiguration;
  ip.toneMappingEnabled = true; ip.toneMappingType = BAB.ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 1.05; ip.contrast = 1.18;
  ip.vignetteEnabled = true; ip.vignetteWeight = 1.7; ip.vignetteStretch = 0.4; ip.vignetteColor = new BAB.Color4(0.06, 0.02, 0.14, 0); ip.vignetteBlendMode = BAB.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
  scene.setRenderingAutoClearDepthStencil(1, true, true, true);

  // ---------- world ----------
  const kit = createStatueKit(scene);
  const world = buildWorld(scene, shadows);
  if (editing) for (const ceiling of world.ceilings) ceiling.setEnabled(false); // overhead layout view must see the annex floor
  const fragments = new Map();
  for (const fragment of FRAGMENTS) fragments.set(fragment.key, buildFragment(scene, kit, fragment));
  const podiums = new Map();
  for (const set of SETS) podiums.set(set.id, buildPodium(scene, kit, set, podiumPositions[set.id], shadows));
  for (const model of fragments.values()) for (const m of model.root.getChildMeshes()) m.isPickable = false;

  // Soft mirror on the annex floor
  const mirror = new BAB.MirrorTexture('annexMirror', 1024, scene, true);
  mirror.mirrorPlane = new BAB.Plane(0, -1, 0, -0.055);
  mirror.level = 0.34; mirror.adaptiveBlurKernel = 28; mirror.refreshRate = 2;
  for (const podium of podiums.values()) for (const m of podium.group.getChildMeshes()) if (m !== podium.cone && m !== podium.group) mirror.renderList.push(m);
  world.annexFloor.reflectionTexture = mirror;
  scene.onDisposeObservable.add(() => mirror.dispose());

  // Ambient sakura petals + one reusable sparkle burst
  const petals = new BAB.ParticleSystem('petals', 240, scene);
  petals.particleTexture = petalTexture(scene);
  const petalEmitter = new BAB.Vector3(0, 0, 32);
  petals.emitter = petalEmitter;
  petals.minEmitBox = new BAB.Vector3(-36, 7, -36); petals.maxEmitBox = new BAB.Vector3(36, 9.5, 36);
  petals.direction1 = new BAB.Vector3(-0.5, -1, -0.2); petals.direction2 = new BAB.Vector3(0.2, -1, 0.5);
  petals.minEmitPower = 0.5; petals.maxEmitPower = 1.0; petals.minLifeTime = 9; petals.maxLifeTime = 14; petals.emitRate = 17;
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
  const player = { x: 0, z: 32, yaw: 0, pitch: 0 };
  const eye = { y: 1.65 };
  const forwardVec = () => new BAB.Vector3(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch));
  const aimCamera = (y = 1.65) => {
    camera.position.set(player.x, y, player.z);
    camera.setTarget(camera.position.add(forwardVec()));
  };
  if (editing) {
    camera.position.set(0, 72, -116);
    camera.setTarget(new BAB.Vector3(0, 0, -116.01));
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
    try { Promise.resolve(save({ waifuAssembler: serializeState(state) })).catch(() => {}); } catch { /* local play remains available */ }
  };
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
      podium.motes.emitRate = 6 + placed.length * 6;
      podium.floorGlow.alpha = 0.45 + placed.length * 0.1;
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
    ui.blueprintBody.innerHTML = blueprintSvg(fragment.partId, set.color);
  }
  refreshPodiums();
  refreshFragments();

  if (!editing) {
    try {
      const getSave = window.lib?.getUserGameState;
      if (getSave) Promise.resolve(getSave()).then((response) => {
        if (disposed) return;
        const saved = response?.state?.waifuAssembler || (response?.state?.placed ? response.state : null);
        if (saved && !hasInteracted) {
          Object.assign(state, restoreState(saved)); refreshFragments(); updateHUD();
          if (isGameComplete(state)) { finishedShown = true; root.querySelector('#finish-banner').classList.add('shown'); }
        }
      }).catch(() => {});
    } catch { /* a first-time player has a clean statue atelier */ }
  }

  const updateHUD = () => {
    ui.progress.textContent = `${countPlaced(state)} / 15`;
    const nearest = nearestAvailable();
    if (state.carried) {
      const fragment = getFragment(state.carried);
      const set = getSet(fragment.setId);
      const podium = podiums.get(set.id);
      const dist = distance2(player.x, player.z, podium.group.position.x, podium.group.position.z);
      const inRange = dist <= 5.2;
      ui.status.innerHTML = `<b>${inRange ? 'PODIUM IN RANGE' : 'RESTORATION ROUTE'}</b><span>${set.name} &nbsp;·&nbsp; ${Math.ceil(dist)}m to display</span>`;
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
      ui.status.innerHTML = `<b>RESTORATION COMPLETE</b><span>All three figures are ready for display</span>`;
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
    const hallLeft = 18, hallTop = 32, hallWidth = w - 36, hallHeight = 124;
    ctx.strokeStyle = 'rgba(143,192,218,.23)'; ctx.lineWidth = 1; ctx.strokeRect(hallLeft, hallTop, hallWidth, hallHeight);
    ctx.fillStyle = 'rgba(115,155,188,.045)'; ctx.fillRect(hallLeft + 1, hallTop + 1, hallWidth - 2, hallHeight - 2);
    const px = (x) => hallLeft + (x + 75) / 150 * hallWidth;
    const pz = (z) => hallTop + (z + 75) / 150 * hallHeight;
    // A separate, true annex mini-plan is drawn north of the 150 x 150 hall map.
    const annexLeft = 22, annexTop = 6, annexWidth = w - 44, annexHeight = 22;
    ctx.fillStyle = 'rgba(71,204,213,.09)'; ctx.fillRect(annexLeft, annexTop, annexWidth, annexHeight);
    ctx.strokeStyle = 'rgba(91,228,237,.65)'; ctx.setLineDash([3, 3]); ctx.strokeRect(annexLeft, annexTop, annexWidth, annexHeight); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(91,228,237,.5)'; ctx.beginPath(); ctx.moveTo(w / 2, annexTop + annexHeight); ctx.lineTo(w / 2, hallTop); ctx.stroke();
    for (const set of SETS) {
      const podium = podiums.get(set.id).group.position;
      const x = annexLeft + (podium.x - ANNEX.minX) / (ANNEX.maxX - ANNEX.minX) * annexWidth;
      const y = annexTop + (-86 - podium.z) / (145 - 86) * annexHeight;
      ctx.fillStyle = set.color; ctx.globalAlpha = 0.95; ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
    }
    for (const f of FRAGMENTS) {
      if (state.collected.includes(f.key) || state.placed[f.setId]?.includes(f.partId)) continue;
      const set = getSet(f.setId);
      ctx.beginPath(); ctx.arc(px(f.x), pz(f.z), 2.25, 0, Math.PI * 2);
      ctx.fillStyle = set.color; ctx.globalAlpha = 0.93; ctx.fill();
    }
    ctx.globalAlpha = 1;
    const x = px(player.x), y = pz(player.z);
    ctx.save(); ctx.translate(x, y); ctx.rotate(player.yaw);
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 3); ctx.lineTo(-5, 5); ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#7beaff'; ctx.shadowBlur = 9; ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(208,229,246,.7)'; ctx.font = '700 9px system-ui'; ctx.fillText('HALL · 150 × 150', 20, h - 10);
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
      // Annex footprints are 116 x 59 units; the open central floor is intentionally left clear.
      const left = 20, top = 18, rw = w - 40, rh = h - 36;
      ctx.fillStyle = '#131d31'; ctx.fillRect(left, top, rw, rh);
      ctx.strokeStyle = 'rgba(91,228,237,.55)'; ctx.lineWidth = 2; ctx.strokeRect(left, top, rw, rh);
      ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(120,175,196,.15)'; ctx.beginPath(); ctx.moveTo(w / 2, top + 12); ctx.lineTo(w / 2, top + rh - 12); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(196,220,234,.42)'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('OPEN DISPLAY FLOOR', w / 2, h / 2 + 3);
      ctx.font = '700 8px system-ui'; ctx.fillStyle = 'rgba(139,182,201,.54)'; ctx.fillText('OUTSIDE THE 150 × 150 HALL', w / 2, h - 5);
      for (const set of SETS) {
        const pos = podiumPositions[set.id];
        const x = left + (pos[0] - ANNEX.minX) / (ANNEX.maxX - ANNEX.minX) * rw;
        const y = top + (-pos[1] - 86) / (145 - 86) * rh;
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
    drawEditorMap();
    refreshEditorMap = drawEditorMap;
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
        const y = top + (-pos[1] - 86) / (145 - 86) * rh;
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
      const z = -(86 + (my - top) / rh * (145 - 86));
      podiumPositions[selectedEditorSet] = [clamp(x, -52, 52), clamp(z, -140, -92)];
      movePodium(selectedEditorSet, podiumPositions[selectedEditorSet]);
      writeEditorConfig();
    }
  }
  function movePodium(setId, position) {
    const podium = podiums.get(setId);
    podium.group.position.set(position[0], 0, position[1]);
    podium.motes.emitter = new BAB.Vector3(position[0], 0.8, position[1]);
  }

  function updateAction() {
    if (editing) return;
    if (!state.carried) {
      const target = nearestAvailable();
      if (!target || target.distance > useRange) return;
      const next = pickup(state, target.fragment.key);
      if (next === state) return;
      hasInteracted = true;
      Object.assign(state, next);
      const model = fragments.get(target.fragment.key);
      sparkle(new BAB.Vector3(target.fragment.x, 1.4, target.fragment.z), getSet(target.fragment.setId).color, 60);
      void model;
      refreshFragments(); saveProgress(); updateHUD();
      const set = getSet(target.fragment.setId);
      toast(`${target.part.label} recovered · ${set.name}`, 'success');
      return;
    }
    const fragment = getFragment(state.carried);
    const podium = podiums.get(fragment.setId);
    if (distance2(player.x, player.z, podium.group.position.x, podium.group.position.z) > 5.2) {
      toast(`Follow the annex marker to ${getSet(fragment.setId).name}`, 'normal');
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
    if (isGameComplete(state) && !finishedShown) {
      finishedShown = true;
      root.querySelector('#finish-banner').classList.add('shown');
      safeHaptic('success');
      try { window.lib?.log?.('All three Waifu Assembler statues restored.'); } catch { /* optional */ }
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
    toast('Display layout reset to the wall-side arrangement');
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
    player.x = clamp(nx, -71.4, 71.4);
    let proposedZ = clamp(nz, -142.5, 72.5);
    // Partition between the 150x150 hall and the separate annex, with a single central doorway.
    if (proposedZ < -75 && proposedZ > -86 && Math.abs(player.x) > 12) proposedZ = player.z < -75 ? -86 : -75;
    player.z = proposedZ;
    aimCamera(eye.y + Math.sin(performance.now() * 0.008) * Math.min(0.028, magnitude * 0.018));
  }
  const tmpRight = new BAB.Vector3();
  function updateCarried(now) {
    if (!carriedVisual) return;
    const fwd = forwardVec();
    tmpRight.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const up = BAB.Vector3.Cross(tmpRight, fwd);
    carriedVisual.position.copyFrom(camera.position).addInPlace(tmpRight.scale(0.38)).addInPlace(up.scale(-0.22 + Math.sin(now * 0.003) * 0.012)).addInPlace(fwd.scale(1.55));
    carriedVisual.rotation.set(-0.12, player.yaw - 0.28 + Math.sin(now * 0.0022) * 0.07, 0);
  }
  function updateObjects(now, dt) {
    for (const model of fragments.values()) {
      if (!model.root.isEnabled()) continue;
      model.spin.rotation.y += 0.26 * dt;
      model.root.position.y = model.baseY + Math.sin(now * 0.0018 + model.phase) * 0.13;
      model.floorGlow.position.y = 0.02 - model.root.position.y;
    }
    for (const podium of podiums.values()) {
      if (podium.finished.isEnabled()) {
        podium.finished.rotation.y += dt * 1.1;
        podium.finished.position.y = 5.4 + Math.sin(now * 0.002) * 0.08;
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
        model.ringMat.alpha = best === fragment.key ? 0.8 + Math.sin(now * 0.006) * 0.16 : 0.26;
      }
      const elapsed = now - stateChangedAt;
      if (elapsed > 190) { stateChangedAt = now; updateHUD(); }
    }
    if (ui.toast.classList.contains('visible') && now > toastUntil) ui.toast.classList.remove('visible');
  }
  let envFrames = 0;
  function render() {
    if (disposed) return;
    const now = performance.now();
    const dt = Math.min(0.11, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    if (!editing) movePlayer(dt);
    updateObjects(now, dt);
    updateCarried(now);
    scene.render();
    if (envFrames < 4 && ++envFrames === 4) studio.release();
  }
  engine.runRenderLoop(render);

  function resize() { engine.resize(); }
  function pointerDown(event) {
    if (event.target !== canvas) return;
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
      player.yaw -= dx * 0.0042;
      player.pitch = clamp(player.pitch - dy * 0.0032, -1.18, 1.18);
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
  updateHUD();

  // Test/debug hook: lets automated checks pose the camera and state without touching gameplay rules.
  window.__waifuDebug = { scene, camera, player, eye, state, podiums, fragments, aimCamera, refreshFragments, updateHUD };

  return () => {
    disposed = true;
    engine.stopRenderLoop();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', pointerMove);
    window.removeEventListener('pointerup', pointerUp);
    window.removeEventListener('pointercancel', pointerUp);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('keydown', keyDown);
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
function setupStudioReflections(scene, BAB) {
  const tex = new BAB.DynamicTexture('studioSky', { width: 1024, height: 512 }, scene, true);
  const ctx = tex.getContext();
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#9084d8'); g.addColorStop(0.32, '#d08cb8'); g.addColorStop(0.5, '#e0b9a2'); g.addColorStop(0.68, '#463a76'); g.addColorStop(1, '#120d26');
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
  probe.position = new BAB.Vector3(0, 3, -115);
  probe.renderList.push(dome);
  probe.refreshRate = BAB.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  scene.environmentTexture = probe.cubeTexture;
  scene.environmentIntensity = 0.5;
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
