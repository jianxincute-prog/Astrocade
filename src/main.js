/*
 * URBAN ENFORCER — 3D open-world street brawler.
 * A towering bald enforcer liberates a 300x300 city ruled by three gangs
 * (Red Wolves, Blue Dragons, Golden Cobras). An opening cutscene (taxi drop-off + phone call) hands out the
 * mission before play starts. Beat 8 members of a gang to summon its boss
 * at the gang HQ; defeat all three bosses to free the city. Joystick to move, attack combo
 * (jab-cross-uppercut), dodge roll with i-frames, three skills with cooldowns.
 * Logic lives in src/logic (pure, unit-tested); this module wires rendering, input and audio.
 */
import { generateCity, GANGS, territoryAt, groundHeight, randomPointInTerritory, mulberry32, blockedAt } from './logic/city.js';
import { MOVES, inHitSector, computeDamage, nearestTarget, angleDiff } from './logic/combat.js';
import { createPlayer, updatePlayer, damagePlayer, regen, applyDot, applyPoison, tickPoison } from './logic/player.js';
import { createEnemy, updateEnemy, damageEnemy, ENEMY_TYPES } from './logic/enemy.js';
import { BOSSES } from './logic/boss.js';
import { ITEMS, SPEED_TIME, createBag, bagAdd, bagCanTake, bagCount, bagFind, bagSort, useSlot } from './logic/items.js';
import { createPickups, addPickup, updatePickups, stepSpawner, dropsFor } from './logic/pickups.js';
import { createField, addProjectile, addZone, addMeteor, updateField, clearOwner, clearAll } from './logic/hazards.js';
import { buildGrid, moveCircle, separate } from './logic/physics.js';
import { cameraRelative, followYaw, thirdPersonRig, nextCameraMode, TOPDOWN_YAW } from './logic/camera.js';
import { createProgress, registerHit, registerKill, tickProgress, finalScore } from './logic/progress.js';
import { Character } from './render/character.js';
import { makeStudioEnv } from './render/env.js';
import { SkinnedCharacter } from './render/skinned.js';
import { buildWorld } from './render/world.js';
import { FX, makeEnemyAdornments } from './render/fx.js';
import { BossFX } from './render/bossfx.js';
import { ItemFX } from './render/pickups.js';
import { HUD, Controls, em } from './ui/hud.js';
import { Audio } from './ui/audio.js';
import { Cutscene } from './ui/cutscene.js';

const DEFAULTS = {
  player: { maxHp: 220, speed: 7.5, damageMult: 1, spawnX: 0, spawnZ: 12 },
  enemies: { perGang: 7, hpMult: 1, damageMult: 1, killsForBoss: 8, maxAttackers: 2 },
  skills: { cooldownMult: 1 },
  visual: { timeOfDay: 'sunset', cameraHeight: 13, cameraMode: 'topdown' },
  audio: { music: true },
  intro: { cutscene: true },
};

function readConfig() {
  const g = window.gameConfig || {};
  const out = {};
  for (const k in DEFAULTS) out[k] = { ...DEFAULTS[k], ...(g[k] || {}) };
  return out;
}

const PLAYER_LOOK = { skin: 0xb07650, top: 0x141416, pants: 0x2a3140, shoes: 0x1c140f, bulk: 1.3, beard: 0x1b130d, scar: true,
  detail: 'high', tattoo: true, wraps: true, rim: 0xffd7a0, xray: 0xe0a53a };
const GANG_LOOKS = [
  { top: 0x8e1d17, topSleeves: true, fullSleeves: true, accent: 0x161616, pants: 0x222222, hair: 0x15100c, bandana: 0xd8312a, skin: 0xc9936b },
  { top: 0x1f3f8c, topSleeves: true, fullSleeves: true, accent: 0xf2f2f2, pants: 0x1f3f8c, hair: 0x0c0c0c, skin: 0xd9a77e },
  { top: 0x262626, topSleeves: true, fullSleeves: true, accent: 0xe0a91f, pants: 0x3a2e1f, mohawk: 0xe0a91f, skin: 0x9c6a48 },
];
const BOSS_NAMES = ['Wolf King', 'Black Dragon', 'Giant Cobra'];

export class Game {
  constructor(mode, model = null) {
    this.mode = mode;
    this.model = model;
    this.T = window.THREE;
    this.lib = window.lib || null;
    this.cfg = readConfig();
    this.root = document.getElementById('game') || document.body;
    window.__game = this;
    this.disposed = false;
    this.setupSettings();
    this.setupRenderer();
    this.setupWorld();
    this.hud = new HUD(this.root);
    this.controls = new Controls(this.hud, [MOVES.skill1.label, MOVES.skill2.label, MOVES.skill3.label]);
    this.audio = new Audio(this.lib);
    this.audio.musicOn = !!this.cfg.audio.music;
    this.fx = new FX(this.T, this.scene);
    this.bossfx = new BossFX(this.T, this.scene, this.fx);   // boss telegraphs, projectiles, meteors, zones
    this.itemfx = new ItemFX(this.T, this.scene);           // item bubbles + shield dome (render/pickups.js)
    this.field = createField();                             // logic/hazards.js
    this.clock = 0; this.dotAcc = 0; this.lastDot = 0; this.lastHurt = 0;
    this.resetRun();
    this.setupCameraModes();
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.resize();
    if (mode === 'edit') this.setupEdit();
    else this.showStart();
  }

  // ------------------------------------------------------------------ setup
  setupSettings() {
    const lib = this.lib;
    if (!lib || !lib.showGameParameters) return;
    try {
      lib.showGameParameters({
        name: 'Urban Enforcer',
        params: {
          'Player HP': { key: 'player.maxHp', type: 'slider', min: 80, max: 500, step: 10 },
          'Player Speed': { key: 'player.speed', type: 'slider', min: 4, max: 12, step: 0.5 },
          'Punch Power': { key: 'player.damageMult', type: 'slider', min: 0.5, max: 3, step: 0.1 },
          'Members per Gang': { key: 'enemies.perGang', type: 'slider', min: 2, max: 12, step: 1 },
          'Enemy HP': { key: 'enemies.hpMult', type: 'slider', min: 0.5, max: 3, step: 0.1 },
          'Enemy Damage': { key: 'enemies.damageMult', type: 'slider', min: 0.3, max: 3, step: 0.1 },
          'Kills to Summon Boss': { key: 'enemies.killsForBoss', type: 'slider', min: 1, max: 20, step: 1 },
          'Simultaneous Attackers': { key: 'enemies.maxAttackers', type: 'slider', min: 1, max: 5, step: 1 },
          'Skill Cooldown': { key: 'skills.cooldownMult', type: 'slider', min: 0.2, max: 2, step: 0.1 },
          'Time of Day': { key: 'visual.timeOfDay', type: 'dropdown', options: [{ label: 'Sunset', value: 'sunset' }, { label: 'Day', value: 'day' }, { label: 'Night', value: 'night' }] },
          'Camera Mode': { key: 'visual.cameraMode', type: 'dropdown', options: [{ label: 'Top Down', value: 'topdown' }, { label: 'Third Person', value: 'third' }] },
          'Camera Height': { key: 'visual.cameraHeight', type: 'slider', min: 8, max: 40, step: 1 },
          'Music': { key: 'audio.music', type: 'checkbox' },
          'Opening Cutscene': { key: 'intro.cutscene', type: 'checkbox' },
        },
      });
    } catch (e) { /* ignore */ }
  }

  setupRenderer() {
    const T = this.T;
    const r = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    r.outputEncoding = T.sRGBEncoding;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    this.root.appendChild(r.domElement);
    this.renderer = r;
    // studio reflections for the hero's glossy skin (applied per material, not to the whole city)
    try { this.env = makeStudioEnv(T, r); Character.env = this.env; } catch (e) { this.env = null; Character.env = null; }
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(42, 720 / 1280, 0.5, 400);
    const tod = this.cfg.visual.timeOfDay;
    const sky = { sunset: 0xe8a77a, day: 0xa9c8e8, night: 0x0d1424 }[tod] || 0xe8a77a;
    this.scene.background = new T.Color(sky);
    this.scene.fog = new T.Fog(sky, 55, 150);
    const hemi = new T.HemisphereLight(
      { sunset: 0xffd9b8, day: 0xdbeaff, night: 0x4a5a88 }[tod] || 0xffd9b8,
      { sunset: 0x3d3540, day: 0x4a4a4a, night: 0x10121a }[tod] || 0x3d3540,
      { sunset: 0.55, day: 0.65, night: 0.45 }[tod] || 0.55);
    this.scene.add(hemi);
    const sun = new T.DirectionalLight({ sunset: 0xffb27a, day: 0xffffff, night: 0x9fb4ff }[tod] || 0xffb27a,
      { sunset: 1.5, day: 1.7, night: 0.5 }[tod] || 1.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 160;
    sun.shadow.bias = -0.0015;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    this.sunOffset = tod === 'sunset' ? new T.Vector3(-45, 38, 20) : new T.Vector3(-25, 60, 25);
  }

  setupWorld() {
    this.city = generateCity(1337);
    this.world = buildWorld(this.T, this.scene, this.city, { timeOfDay: this.cfg.visual.timeOfDay });
    this.obstacles = this.world.obstacles;
    this.phys = buildGrid(this.obstacles);
    // player character
    this.playerChar = this.model
      ? new SkinnedCharacter(this.T, { model: this.model, look: 'player', rim: 0xffd7a0, xray: 0xe0a53a, scale: 1.1,
        head: { skin: PLAYER_LOOK.skin, beard: PLAYER_LOOK.beard, scar: true, bulk: 1.3 } })
      : new Character(this.T, PLAYER_LOOK);
    this.scene.add(this.playerChar.group);
    this.playerRing = this.makePlayerRing();
    // enemy pool
    this.enemyChars = [];
    this.rnd = mulberry32(7);
  }

  /** Soft contact shadow + pulsing gold ring so the hero reads instantly. */
  makePlayerRing() {
    const T = this.T;
    const g = new T.Group();
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const grd = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = grd; x.fillRect(0, 0, 128, 128);
    const shadow = new T.Mesh(new T.PlaneGeometry(1.9, 1.9), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    const ring = new T.Mesh(new T.RingGeometry(0.62, 0.72, 48), new T.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005;
    g.add(shadow, ring);
    this.scene.add(g);
    return g;
  }

  makeEnemyChar(gang, type) {
    const look = { ...GANG_LOOKS[gang] };
    if (type === 'bat') { look.weapon = gang === 1 ? 'pipe' : 'bat'; look.nails = gang === 2; } // Golden Cobras swing nailed bats
    if (type === 'boss') {
      // every boss gets its own silhouette (see render/bossgear.js)
      Object.assign(look, { bulk: 1.35, topSleeves: true, fullSleeves: false, flair: ['wolf', 'dragon', 'cobra'][gang] });
      if (gang === 0) Object.assign(look, { top: 0x8e1d17, accent: 0x161616, shades: false, scar: true, beard: 0x1b130d, gloves: undefined, bandana: undefined, hair: undefined });
      if (gang === 1) Object.assign(look, { top: 0x14304f, accent: 0x66d4ff, shades: false, gloves: 0x0e1822, bandana: undefined, hair: undefined, bulk: 1.45 });
      if (gang === 2) Object.assign(look, { top: 0x1f5a2e, accent: 0xe0a91f, shades: true, gloves: 0x111111, mohawk: undefined, bulk: 1.3 });
    }
    look.rim = GANGS[gang].color;
    look.scale = type === 'boss' ? BOSSES[gang].scale : ENEMY_TYPES[type].scale * (0.9 + this.rnd() * 0.06);
    const c = false
      ? new SkinnedCharacter(this.T, { model: this.model, look: 'gang', tint: GANGS[gang].color, weapon: look.weapon, rim: GANGS[gang].color, scale: look.scale * (type === 'boss' ? 1 : 1.04) })
      : new Character(this.T, look);
    this.scene.add(c.group);
    const ad = makeEnemyAdornments(this.T, this.scene, GANGS[gang].color);
    return { char: c, ad };
  }

  resetRun() {
    // clear previous enemies
    if (this.enemies) for (const e of this.enemies) this.removeEnemyVisual(e);
    const c = this.cfg;
    const spawn = { x: +c.player.spawnX || 0, z: +c.player.spawnZ || 0 };
    if (blockedAt(this.obstacles, spawn.x, spawn.z, 0.6)) { spawn.x = 0; spawn.z = 12; }
    this.player = createPlayer({ x: spawn.x, z: spawn.z, maxHp: c.player.maxHp, speed: c.player.speed });
    this.player.radius = 0.55;
    this.progress = createProgress(Math.max(1, Math.round(c.enemies.killsForBoss)));
    this.slots = { used: 0, max: Math.max(1, Math.round(c.enemies.maxAttackers)) };
    this.enemies = [];
    const per = Math.max(1, Math.round(c.enemies.perGang));
    for (let g = 0; g < 3; g++) {
      for (let k = 0; k < per; k++) {
        const pt = randomPointInTerritory(this.rnd, this.obstacles, g, 45, 140);
        this.spawnEnemy(k % 3 === 2 ? 'bat' : 'thug', g, pt.x, pt.z);
      }
    }
    clearAll(this.field); if (this.bossfx) this.bossfx.clear();
    // items: empty backpack and a few starter bubbles around the spawn point
    this.bag = createBag(); this.pickups = createPickups(); this.speedFxT = 0;
    if (this.itemfx) this.itemfx.clear();
    // within the narrow strip of screen the HUD and thumb controls leave free
    [['heal', -2.3, 2.4], ['shield', 2.6, -2.4], ['speed', 0.2, -4.4]].forEach(([type, ox, oz]) => {
      for (let t = 0; t < 12; t++) {
        const x = spawn.x + ox + (t ? (this.rnd() - 0.5) * 3 : 0), z = spawn.z + oz + (t ? (this.rnd() - 0.5) * 3 : 0);
        if (!blockedAt(this.obstacles, x, z, 1.2)) { addPickup(this.pickups, type, x, z, 90); break; }
      }
    });
    if (this.hud) { this.refreshBagUI(); if (this.hud.bagOpen) this.closeBag(true); }
    this.playerActionId = 0;
    this.shake = 0; this.hitstop = 0; this.state = 'ready';
    this.lastTerritory = -2; this.deadT = 0; this.endT = 0;
    this.camPos = null;
  }

  spawnEnemy(type, gang, x, z) {
    const e = createEnemy(type, gang, x, z, this.cfg.enemies.hpMult);
    e.radius = type === 'boss' ? 0.65 * BOSSES[gang].scale : 0.5;
    e.visual = this.makeEnemyChar(gang, type);
    e.visual.char.group.position.set(x, 0, z);
    e.actionId = 0; e.prevState = e.state;
    e.active = true;
    this.enemies.push(e);
    return e;
  }

  removeEnemyVisual(e) {
    const v = e.visual; if (!v) return;
    this.scene.remove(v.char.group, v.ad.tele, v.ad.marker, v.ad.bar);
    for (const m of v.char.mats) m.dispose();
  }

  // ------------------------------------------------------------------ camera modes
  setupCameraModes() {
    this.camMode = this.cfg.visual.cameraMode === 'third' ? 'third' : 'topdown';
    this.camYaw = this.player ? this.player.facing : TOPDOWN_YAW;
    this.camHold = 0;
    const b = this.hud.addTool('cam', 'C');
    this.camBtn = b;
    this.controls.btns.cam = b;
    this.bagBtn = this.hud.addTool('bag', 'B');
    this.hud.setTool(this.bagBtn, '🎒', 'BACKPACK');
    this.bagBtn.addEventListener('pointerdown', () => { if (this.state === 'play' || this.state === 'bag') this.toggleBag(); });
    this.hud.setBagHandlers({ use: (i) => this.useBagSlot(i), sort: () => { bagSort(this.bag); this.refreshBagUI(); }, close: () => this.closeBag() });
    this.onItemKey = (e) => this.handleItemKey(e);
    window.addEventListener('keydown', this.onItemKey);
    this.refreshBagUI();
    const toggle = (e) => { if (e) e.preventDefault(); this.setCameraMode(nextCameraMode(this.camMode)); };
    b.addEventListener('pointerdown', toggle);
    this.onCamKey = (e) => { if (e.key && e.key.toLowerCase() === 'c' && this.mode === 'play') this.setCameraMode(nextCameraMode(this.camMode)); };
    window.addEventListener('keydown', this.onCamKey);
    // third person: drag the empty screen to orbit the camera
    const cv = this.renderer.domElement;
    this.orbit = null;
    this.onOrbitDown = (e) => { if (this.mode === 'play' && this.camMode === 'third') this.orbit = { id: e.pointerId, x: e.clientX }; };
    this.onOrbitMove = (e) => {
      if (!this.orbit || e.pointerId !== this.orbit.id) return;
      const r = cv.getBoundingClientRect();
      this.camYaw -= ((e.clientX - this.orbit.x) / r.width) * Math.PI * 1.4;
      this.orbit.x = e.clientX; this.camHold = 1.5;
    };
    this.onOrbitUp = (e) => { if (this.orbit && e.pointerId === this.orbit.id) this.orbit = null; };
    cv.addEventListener('pointerdown', this.onOrbitDown);
    window.addEventListener('pointermove', this.onOrbitMove);
    window.addEventListener('pointerup', this.onOrbitUp);
    this.setCameraMode(this.camMode, true);
  }

  setCameraMode(mode, silent) {
    this.camMode = mode;
    const third = mode === 'third';
    if (third) this.camYaw = this.player.facing;
    this.camera.fov = third ? 58 : 42;
    // third person: frame the hero above the thumb controls
    if (third) this.camera.setViewOffset(720, 1280, 0, 170, 720, 1280); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.hud.setTool(this.camBtn, third ? '🎥' : '🗺️', third ? '3RD PERSON' : 'TOP DOWN');
    this.camPos = null;
    if (!silent) {
      this.hud.showBanner(third ? 'THIRD-PERSON CAMERA' : 'TOP-DOWN CAMERA', third ? 'Drag the empty screen to rotate the camera' : 'View from above', 1.6);
      this.haptic('tick');
    }
  }

  /** Forward direction of the active camera (facing convention). */
  viewYaw() { return this.mode === 'play' && this.camMode === 'third' ? this.camYaw : TOPDOWN_YAW; }

  // ------------------------------------------------------------------ flow
  showStart() {
    this.controls.setVisible(false);
    const o = this.hud.overlay(`
      <h1>URBAN<br>ENFORCER</h1>
      <h2>Free the city from 3 gangs!</h2>
      <p>Defeat ${this.progress.killsForBoss} members of each gang to lure their <b>BOSS</b> out of the hideout.
      Take down all three bosses to take back the city.</p>
      <p style="font-size:${em(19)};opacity:.78">🕹 Left joystick to move • 👊 combo • 💨 dodge (brief invulnerability) • 💥🌀🐂 skills<br>
      🫧 Walk into floating bubbles to collect Medkits, Shields and Swift Boots, then use them from the 🎒 backpack.<br>
      Keyboard: WASD • J attack • K/Space dodge • 1 2 3 skills • B backpack • Q/E/R quick-use items</p>
      <button class="go">START</button>`);
    o.querySelector('.go').addEventListener('pointerdown', (e) => { e.preventDefault(); this.startPlay(); });
  }

  startPlay() {
    this.audio.unlock();
    this.hud.closeOverlay();
    if (this.state !== 'ready') this.resetRun();
    // first run of this session: opening cutscene (taxi drop-off + phone call), then the fight
    if (!this.introSeen && this.cfg.intro.cutscene) {
      this.introSeen = true;
      this.state = 'cutscene';
      this.cut = new Cutscene(this, { x: this.player.x, z: this.player.z }, () => { this.cut = null; this.beginPlay(); });
      return;
    }
    this.beginPlay();
  }

  beginPlay() {
    this.audio.startMusic();
    this.state = 'play';
    this.controls.enabled = true;
    this.controls.setVisible(true);
    this.controls.consume();
    this.hud.showBanner('CITY UNDER GANG CONTROL', 'Head into gang territory and take them down!', 3);
  }

  endGame(victory) {
    if (this.state === 'over') return;
    this.state = 'over';
    this.controls.enabled = false;
    const score = finalScore(this.progress, victory);
    try { this.lib && this.lib.haptics && this.lib.haptics.play(victory ? 'success' : 'error'); } catch (e) { /* */ }
    try { this.lib && this.lib.addPlayerScoreToLeaderboard && this.lib.addPlayerScoreToLeaderboard(score).catch(() => {}); } catch (e) { /* */ }
    setTimeout(() => {
      if (this.disposed) return;
      this.controls.setVisible(false);
      const o = this.hud.overlay(`
        <h1>${victory ? 'CITY<br>FREED!' : 'KO!'}</h1>
        <h2>${victory ? 'All three gangs have fallen.' : 'The Enforcer has fallen in the streets...'}</h2>
        <p style="font-size:${em(30)}">Score: <b style="color:#ffcf3a">${score.toLocaleString('en-US')}</b><br>
        Enemies defeated: ${this.progress.totalKills} • Best combo: ${this.progress.bestCombo}x<br>
        Territories liberated: ${this.progress.gangs.filter((g) => g.liberated).length}/3</p>
        <button class="go">PLAY AGAIN</button>`);
      o.querySelector('.go').addEventListener('pointerdown', (e) => { e.preventDefault(); this.resetRun(); this.state = 'ready'; this.startPlay(); });
    }, victory ? 1200 : 1800);
  }

  // ------------------------------------------------------------------ edit mode
  setupEdit() {
    this.controls.setVisible(false);
    this.hud.el.querySelector('.top').style.display = 'none';
    this.hud.showBanner('EDIT MODE', 'Drag the Enforcer to move the starting point • drag the screen to pan the camera', 9999);
    this.editCam = { x: this.player.x, z: this.player.z };
    const canvas = this.renderer.domElement;
    const T = this.T;
    const ray = new T.Raycaster(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0), hit = new T.Vector3(), ndc = new T.Vector2();
    const groundAt = (e) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
    };
    let drag = null;
    this.editDown = (e) => {
      const g = groundAt(e); if (!g) return;
      if (Math.hypot(g.x - this.player.x, g.z - this.player.z) < 3) drag = { kind: 'player' };
      else drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, cx: this.editCam.x, cz: this.editCam.z };
    };
    this.editMove = (e) => {
      if (!drag) return;
      if (drag.kind === 'player') {
        const g = groundAt(e); if (!g) return;
        if (!blockedAt(this.obstacles, g.x, g.z, 0.6)) { this.player.x = g.x; this.player.z = g.z; }
      } else {
        const r = canvas.getBoundingClientRect(), s = 60 / r.width;
        this.editCam.x = drag.cx - (e.clientX - drag.sx) * s;
        this.editCam.z = drag.cz - (e.clientY - drag.sy) * s;
      }
    };
    this.editUp = () => {
      if (drag && drag.kind === 'player') {
        const gc = window.gameConfig || (window.gameConfig = {});
        gc.player = gc.player || {};
        gc.player.spawnX = Math.round(this.player.x * 10) / 10;
        gc.player.spawnZ = Math.round(this.player.z * 10) / 10;
      }
      drag = null;
    };
    canvas.addEventListener('pointerdown', this.editDown);
    window.addEventListener('pointermove', this.editMove);
    window.addEventListener('pointerup', this.editUp);
  }

  // ------------------------------------------------------------------ loop
  loop(now) {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    let dt = Math.min(0.11, (now - this.last) / 1000);
    this.last = now;
    if (this.hitstop > 0) { this.hitstop -= dt; dt *= 0.08; }
    if (this.mode === 'play' && (this.state === 'play' || this.state === 'over')) this.step(dt);
    if (this.cut) this.cut.update(dt);
    this.animate(dt);
    this.updateCamera(dt);
    this.fx.update(dt);
    this.bossfx.syncField(this.field);
    this.bossfx.update(dt);
    this.itemfx.sync(this.pickups.list, dt);
    this.hud.update(dt);
    this.world.update(now / 1000);
    if (this.world.sky) this.world.sky.dome.position.copy(this.camera.position);
    if (this.world.setFocus) { const fp = this.player; if (this.state === 'cutscene') this.world.setFocus(this.camera.position, this.camera.position.x, this.camera.position.y, this.camera.position.z); else this.world.setFocus(this.camera.position, fp.x, 1.3, fp.z); }
    this.renderer.render(this.scene, this.camera);
  }

  step(dt) {
    const p = this.player, c = this.cfg;
    const input = this.controls.poll();
    { const w = cameraRelative(input.mx, input.mz, this.viewYaw()); input.mx = w.x; input.mz = w.z; }
    if (this.state !== 'play') { input.mx = input.mz = 0; this.controls.consume(); }
    if (input.attackHold && !p.action) input.attack = true;
    // auto aim
    const near = nearestTarget(p.x, p.z, this.enemies.filter((e) => e.active), 4.5);
    input.aimX = null; input.aimZ = null;
    if (near) {
      const mag = Math.hypot(input.mx, input.mz);
      const ang = Math.atan2(near.x - p.x, near.z - p.z);
      if (mag < 0.2 || Math.abs(angleDiff(Math.atan2(input.mx, input.mz), ang)) < 1.0) { input.aimX = near.x; input.aimZ = near.z; }
    }
    input.cdMult = c.skills.cooldownMult;
    const res = updatePlayer(p, input, dt);
    this.controls.consume();
    const np = moveCircle(this.phys, p.x, p.z, res.dx, res.dz, p.radius);
    p.x = np.x; p.z = np.z;
    for (const ev of res.events) this.onPlayerEvent(ev);
    regen(p, dt);
    this.clock += dt;
    {
      const pd = tickPoison(p, dt);
      if (pd > 0) this.dotFeedback(pd, '#7dff5a');
      this.hud.setPoison(!!p.poison);
    }
    tickProgress(this.progress, dt);
    this.stepItems(dt);

    // enemies
    const ctx = { px: p.x, pz: p.z, playerDead: p.dead, attackSlots: this.slots, rnd: this.rnd, minions: 0 };
    const minions = [0, 0, 0];
    for (const e of this.enemies) if (e.summoned && !e.dead) minions[e.gang]++;
    for (const e of this.enemies) {
      ctx.minions = minions[e.gang];
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      e.active = d < 70 || e.isBoss;
      if (!e.active && !e.dead) { e.visual.char.group.visible = false; e.visual.ad.marker.visible = false; continue; }
      const r = updateEnemy(e, dt, ctx);
      const n = moveCircle(this.phys, e.x, e.z, r.dx, r.dz, e.radius);
      e.x = n.x; e.z = n.z;
      for (const ev of r.events) this.onEnemyEvent(e, ev);
      if (e.state !== e.prevState) { e.actionId++; e.prevState = e.state; }
      if (e.dead) this.handleDead(e, dt);
    }
    if (this.enemies.some((q) => q.remove)) this.enemies = this.enemies.filter((q) => !q.remove);
    this.stepField(dt);
    separate([p, ...this.enemies.filter((e) => e.active && !e.dead)]);

    // territory banner
    const t = territoryAt(p.x, p.z);
    if (t !== this.lastTerritory) {
      if (this.lastTerritory !== -2) {
        if (t < 0) this.hud.showBanner('CITY PLAZA', 'Neutral zone', 2);
        else this.hud.showBanner(GANGS[t].name.toUpperCase() + ' TERRITORY', this.progress.gangs[t].liberated ? `${GANGS[t].district} — already liberated` : `${GANGS[t].district} — careful, gang members are roaming!`, 2.4, GANGS[t].css);
      }
      this.lastTerritory = t;
    }

    // death
    if (p.dead) {
      this.deadT += dt;
      if (this.deadT > 0.1) this.endGame(false);
    }

    // HUD
    this.hud.setPlayerHp(p.hp, p.maxHp);
    this.hud.setBuffs(p.shield, p.speedT, SPEED_TIME);
    this.hud.setScore(this.progress.score);
    this.hud.setCombo(this.progress.combo);
    this.hud.setGangs(this.progress, this.progress.killsForBoss);
    for (const k of ['skill1', 'skill2', 'skill3']) this.controls.setCooldown(k, p.cd[k], MOVES[k].cd * c.skills.cooldownMult);
    const boss = this.enemies.find((e) => e.isBoss && !e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 35);
    if (boss) this.hud.setBoss(BOSS_NAMES[boss.gang], boss.hp, boss.maxHp, BOSSES[boss.gang].css, boss.boss.phase); else this.hud.setBoss(null);
    this.mmT = (this.mmT || 0) - dt;
    if (this.mmT <= 0) { this.mmT = 0.1; this.hud.drawMinimap(p.x, p.z, p.facing, this.enemies, this.progress, this.city.hqs, this.pickups.list); }
  }

  // ------------------------------------------------------------------ items & backpack
  /** Bubbles (spawn / drift / collect), the shield dome, and the speed-boost trail. */
  stepItems(dt) {
    const p = this.player;
    stepSpawner(this.pickups, dt, { rnd: this.rnd, px: p.x, pz: p.z, hpFrac: p.hp / p.maxHp, free: (x, z) => !blockedAt(this.obstacles, x, z, 1.2) });
    for (const ev of updatePickups(this.pickups, dt, p.x, p.z, p.dead ? () => false : (t) => bagCanTake(this.bag, t))) {
      const b = ev.pick, it = ITEMS[b.type];
      if (ev.type === 'collect') {
        bagAdd(this.bag, b.type);
        this.fx.ring(b.x, b.z, 2.2, it.color, 0.45); this.fx.burst(b.x, 1.5, b.z, it.color, 16, 6); this.fx.burst(b.x, 1.5, b.z, 0xffffff, 6, 4);
        this.chime(); this.haptic('tick');
        this.hud.toast(`+ ${it.name}`, it.css, 1.3);
        this.refreshBagUI();
      } else if (ev.type === 'full') this.hud.toast('Backpack is full!', '#ff8a6a', 1.2);
      else if (ev.type === 'expire') { this.fx.burst(b.x, 1.5, b.z, it.color, 6, 3); }
    }
    this.speedFxT -= dt;
    if (p.speedT > 0 && p.moveSpeed > 0.5 && this.speedFxT <= 0) {
      this.speedFxT = 0.07;
      this.fx.burst(p.x - Math.sin(p.facing) * 0.4, 0.25, p.z - Math.cos(p.facing) * 0.4, 0xffd23a, 2, 2.5);
    }
  }

  chime() { const a = this.audio; a.tone(660, 0.09, 0.1, 'sine', 0); a.tone(880, 0.1, 0.1, 'sine', 0.07); a.tone(1320, 0.18, 0.09, 'sine', 0.14); }

  onShieldBlock() {
    const p = this.player;
    this.itemfx.flashShield();
    this.fx.ring(p.x, p.z, 2.6, 0x4aa8ff, 0.4, 1.0); this.fx.burst(p.x, 1.4, p.z, 0x9fd4ff, 14, 8);
    this.audio.tone(1180, 0.09, 0.12, 'triangle', 0); this.audio.tone(760, 0.14, 0.1, 'triangle', 0.05);
    this.shake = Math.max(this.shake, 0.3); this.haptic({ intensity: 0.5, sharpness: 0.9, duration: 50 });
    const sp = this.toScreen(p.x, 2.6, p.z);
    if (sp) this.hud.damageNumber(sp.x, sp.y, p.shield > 0 ? 'BLOCKED!' : 'SHIELD BROKEN!', '#7cc4ff', p.shield <= 0);
    if (p.shield <= 0) { this.fx.burst(p.x, 1.2, p.z, 0x4aa8ff, 30, 11); this.audio.sweep(900, 200, 0.4, 0.1, 'triangle'); }
  }

  refreshBagUI() {
    if (!this.hud || !this.bag || !this.bagBtn) return;
    this.hud.setBadge(this.bagBtn, bagCount(this.bag));
    this.hud.refreshBag(this.bag);
  }

  toggleBag() { if (this.hud.bagOpen) this.closeBag(); else this.openBag(); }

  openBag() {
    if (this.state !== 'play' || this.hud.bagOpen) return;
    this.state = 'bag';
    this.controls.enabled = false; this.controls.jx = this.controls.jy = 0; this.controls.attackHeld = false; this.controls.consume();
    this.controls.relayout();
    this.hud.openBag(this.bag);
  }

  closeBag(silent) {
    this.hud.closeBag();
    if (this.state === 'bag') { this.state = 'play'; this.controls.enabled = true; this.controls.consume(); }
    void silent;
  }

  /** Use the item in a backpack slot (from the bag UI). */
  useBagSlot(i) {
    const p = this.player, s = this.bag.slots[i];
    if (!s) return;
    const type = s.type, it = ITEMS[type];
    const r = useSlot(this.bag, p, i);
    if (!r.ok) {
      this.hud.toast(r.reason === 'full' ? (type === 'heal' ? 'Health is already full' : 'Shield is already full') : 'Cannot use that now', '#ffb347', 1.3);
      return;
    }
    this.fx.ring(p.x, p.z, 2.4, it.color, 0.5); this.fx.burst(p.x, 1.4, p.z, it.color, 22, 8);
    this.chime(); this.haptic('success');
    const sp = this.toScreen(p.x, 2.7, p.z);
    if (type === 'heal') { if (sp) this.hud.damageNumber(sp.x, sp.y, '+' + r.healed, '#6dff9a', true); this.hud.toast(`${it.name}  +${r.healed} HP`, it.css); }
    else if (type === 'shield') { this.itemfx.flashShield(); this.hud.toast('Shield up — blocks 2 hits', it.css); }
    else { this.hud.toast(`Swift Boots — ${SPEED_TIME}s of speed`, it.css); this.fx.puff(p.x, p.z, 6, 1.4); }
    this.refreshBagUI();
    if (this.hud.bagOpen && this.hud.bagData && !this.bag.slots[i]) this.hud.selectSlot(this.bag.slots.findIndex((q) => q) );
  }

  /** B toggles the backpack, Esc closes it, 1-9 use a slot while it is open, Q/E/R quick-use during play. */
  handleItemKey(e) {
    if (this.mode !== 'play' || !e.key || e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { this.toggleBag(); return; }
    if (this.state === 'bag') {
      if (k === 'escape') this.closeBag();
      else if (k >= '1' && k <= '9') { this.hud.selectSlot(+k - 1); this.useBagSlot(+k - 1); }
      else if (k === 'enter' && this.hud.bagSel >= 0) this.useBagSlot(this.hud.bagSel);
      return;
    }
    if (this.state !== 'play') return;
    const quick = { q: 'heal', e: 'shield', r: 'speed' }[k];
    if (!quick) return;
    const i = bagFind(this.bag, quick);
    if (i < 0) this.hud.toast(`No ${ITEMS[quick].name} in the backpack`, '#ffb347', 1.1); else this.useBagSlot(i);
  }

  haptic(effect) { try { this.lib && this.lib.haptics && this.lib.haptics.play(effect); } catch (e) { /* */ } }

  onPlayerEvent(ev) {
    const p = this.player;
    if (ev.type === 'start') {
      this.playerActionId++;
      const m = MOVES[ev.move];
      if (ev.move === 'dodge') { this.fx.puff(p.x, p.z, 6); this.audio.play('sfx_whoosh', 0.6, 1.2); this.haptic({ intensity: 0.3, sharpness: 0.4, duration: 40 }); }
      else if (m.sfx) this.audio.play('sfx_whoosh', 0.5, 1.1);
      if (ev.move === 'skill2') this.audio.play('sfx_whoosh', 0.8, 0.8);
      if (ev.move === 'skill3') { this.audio.play('sfx_whoosh', 0.9, 0.7); this.fx.puff(p.x, p.z, 8, 1.4); }
      if (ev.move === 'skill1') this.fx.puff(p.x, p.z, 5);
      return;
    }
    if (ev.type !== 'hit') return;
    const h = ev.hit;
    const fx = h.fx;
    if (fx === 'slam') {
      const cx = p.x + Math.sin(p.facing) * 0.8, cz = p.z + Math.cos(p.facing) * 0.8;
      this.fx.ring(cx, cz, h.range * 1.15, 0xffd28a, 0.5); this.fx.ring(cx, cz, h.range * 0.7, 0xffffff, 0.35);
      this.fx.puff(cx, cz, 14, 2.2); this.fx.burst(cx, 0.4, cz, 0xc9b79a, 18, 9);
      this.shake = Math.max(this.shake, 0.9); this.audio.play('sfx_slam', 1); this.haptic('thud');
    } else if (fx === 'spin') {
      this.fx.ring(p.x, p.z, h.range, 0xc58bff, 0.25, 1.2);
      this.audio.play('sfx_whoosh', 0.5, 1.3);
    } else if (ev.move === 'skill3' && ev.index < 2) {
      this.fx.puff(p.x, p.z, 3, 1);
    }
    let landed = 0;
    for (const e of this.enemies) {
      if (e.dead || !e.active) continue;
      if (!inHitSector(p.x, p.z, p.facing, e.x, e.z, h.range, h.arc, e.radius)) continue;
      const dmg = computeDamage(h.dmg, this.cfg.player.damageMult, this.progress.combo);
      const r = damageEnemy(e, dmg, p.x, p.z, h.kb, !!h.launch, { attackSlots: this.slots });
      registerHit(this.progress);
      landed++;
      e.visual.char.hitFlash();
      const s = e.visual.char.group.scale.x;
      this.fx.burst(e.x, 1.5 * s + e.lift, e.z, h.dmg >= 24 ? 0xffb347 : 0xffe9a8, h.dmg >= 24 ? 18 : 9, h.dmg >= 24 ? 10 : 7);
      const sp = this.toScreen(e.x, 2.4 * s + e.lift, e.z);
      if (sp) this.hud.damageNumber(sp.x, sp.y, dmg, h.dmg >= 24 ? '#ffcf3a' : '#fff', h.dmg >= 24);
      if (r.killed) this.onKill(e);
    }
    if (landed) {
      this.audio.play('sfx_punch', Math.min(1, 0.6 + landed * 0.15), h.dmg >= 24 ? 0.85 : 1.05);
      this.hitstop = h.dmg >= 24 ? 0.09 : 0.05;
      this.shake = Math.max(this.shake, h.dmg >= 24 ? 0.55 : 0.25);
      this.haptic({ intensity: Math.min(1, 0.45 + h.dmg / 60), sharpness: 0.8, duration: 35 });
    }
  }

  onKill(e) {
    const evs = registerKill(this.progress, e.gang, e.isBoss);
    if (!e.summoned) {
      const drops = dropsFor(this.rnd, e.isBoss, this.player.hp / this.player.maxHp);
      drops.forEach((t, i) => {
        const a = e.facing + (i - (drops.length - 1) / 2) * 1.2 + Math.PI;
        const dist = e.isBoss ? 3 : 0.8;
        let x = e.x + Math.sin(a) * dist, z = e.z + Math.cos(a) * dist;
        if (blockedAt(this.obstacles, x, z, 0.8)) { x = e.x; z = e.z; }
        addPickup(this.pickups, t, x, z, 60);
        this.fx.ring(x, z, 1.8, ITEMS[t].color, 0.5);
      });
    }
    e.respawnT = e.isBoss || e.summoned ? Infinity : 10;
    if (e.isBoss) this.onBossDeath(e);
    for (const ev of evs) {
      if (ev === 'bossSummon') {
        const hq = this.city.hqs[e.gang];
        this.spawnEnemy('boss', e.gang, hq.x, hq.z);
        this.hud.showBanner(BOSS_NAMES[e.gang].toUpperCase() + ' APPEARS!', `The ${GANGS[e.gang].name} boss is waiting at their hideout (see the map)`, 3.2, GANGS[e.gang].css);
        this.haptic('warning');
      }
      if (ev === 'liberated') {
        this.hud.showBanner('TERRITORY LIBERATED!', `The ${GANGS[e.gang].name} have fallen`, 3, '#7dff8a');
        this.shake = 1;
        this.haptic('success');
      }
      if (ev === 'victory') this.endGame(true);
    }
  }

  onEnemyEvent(e, ev) {
    if (e.isBoss) return this.onBossEvent(e, ev);
    const p = this.player;
    if (ev.type === 'strike') {
      const ok = ev.aoe
        ? Math.hypot(p.x - e.x, p.z - e.z) < ev.range + p.radius
        : inHitSector(e.x, e.z, e.facing, p.x, p.z, ev.range, 110, p.radius);
      if (ev.aoe) {
        const cx = e.x + Math.sin(e.facing) * 1.2, cz = e.z + Math.cos(e.facing) * 1.2;
        this.fx.ring(cx, cz, ev.range * 1.2, 0xff6a3a, 0.4); this.fx.puff(cx, cz, 10, 1.8);
        this.audio.play('sfx_slam', 0.7, 1.15); this.shake = Math.max(this.shake, 0.5);
      } else this.audio.play('sfx_whoosh', 0.35, 0.9);
      if (ok) {
        const dmg = Math.round(ev.dmg * this.cfg.enemies.damageMult);
        const res = damagePlayer(p, dmg, e.x, e.z, ev.aoe ? 12 : 6);
        if (res === 'blocked') this.onShieldBlock();
        else if (res) {
          this.playerChar.hitFlash();
          this.fx.burst(p.x, 1.6, p.z, 0xff5a3a, 10, 6);
          this.audio.play('sfx_punch', 0.8, 0.8);
          this.hud.hurt();
          this.shake = Math.max(this.shake, 0.45);
          this.haptic({ intensity: 0.9, sharpness: 0.35, duration: 70 });
          const sp = this.toScreen(p.x, 2.5, p.z);
          if (sp) this.hud.damageNumber(sp.x, sp.y, '-' + dmg, '#ff5a4a');
          this.progress.combo = 0;
          if (p.dead) this.deadT = 0;
        } else if (Math.hypot(p.x - e.x, p.z - e.z) < ev.range + 1.5) {
          const sp = this.toScreen(p.x, 2.6, p.z);
          if (sp) this.hud.damageNumber(sp.x, sp.y, 'DODGED!', '#6fd0ff');
        }
      }
    }
  }

  // ------------------------------------------------------------------ boss combat
  bossColor(gang) { return [0xff3a2a, 0x2f8cff, 0x8cff2a][gang]; }

  /** Small floating damage + soft vignette for damage-over-time (poison, flames, burning ground). */
  dotFeedback(d, color) {
    const p = this.player;
    this.dotAcc += d;
    if (this.clock - this.lastDot > 0.45) {
      const sp = this.toScreen(p.x, 2.5, p.z);
      if (sp) this.hud.damageNumber(sp.x, sp.y, '-' + Math.max(1, Math.round(this.dotAcc)), color);
      this.dotAcc = 0; this.lastDot = this.clock;
    }
    if (this.clock - this.lastHurt > 0.35) { this.hud.hurt(); this.lastHurt = this.clock; }
    if (p.dead) this.deadT = 0;
  }

  /** Apply a boss attack to the player (flinch + knockback), or only DoT damage when dot = true. Returns 'hit' | 'dodged' | 'none'. */
  hurtPlayer(dmg, fromX, fromZ, kb, { dot = false, color = '#ff5a4a' } = {}) {
    const p = this.player, real = Math.round(dmg * this.cfg.enemies.damageMult);
    if (dot) {
      const d = applyDot(p, real);
      if (d > 0) { this.dotFeedback(d, color); return 'hit'; }
      return 'none';
    }
    const res = damagePlayer(p, real, fromX, fromZ, kb);
    if (res === 'blocked') { this.onShieldBlock(); return 'blocked'; }
    if (!res) {
      const sp = this.toScreen(p.x, 2.6, p.z);
      if (sp) this.hud.damageNumber(sp.x, sp.y, 'DODGED!', '#6fd0ff');
      return 'dodged';
    }
    this.playerChar.hitFlash();
    this.fx.burst(p.x, 1.6, p.z, 0xff5a3a, 10, 6);
    this.audio.play('sfx_punch', 0.8, 0.8);
    this.hud.hurt();
    this.shake = Math.max(this.shake, kb > 8 ? 0.7 : 0.45);
    this.haptic({ intensity: 0.9, sharpness: 0.35, duration: 70 });
    const sp = this.toScreen(p.x, 2.5, p.z);
    if (sp) this.hud.damageNumber(sp.x, sp.y, '-' + real, color);
    this.progress.combo = 0;
    if (p.dead) this.deadT = 0;
    return 'hit';
  }

  onBossEvent(e, ev) {
    const p = this.player, def = BOSSES[e.gang], col = this.bossColor(e.gang);
    switch (ev.type) {
      case 'alert': this.audio.sweep(180, 90, 0.6, 0.14); break;
      case 'cast': e.actionId++; this.hud.setBossCast(ev.name, def.css); break;
      case 'telegraph': this.bossfx.telegraph(ev, e, col); this.haptic('tick'); break;
      case 'strike': this.bossStrike(e, ev, col); break;
      case 'projectile': addProjectile(this.field, { owner: e.gang, kind: ev.kind, x: ev.x, z: ev.z, vx: ev.vx, vz: ev.vz, r: ev.r, dmg: ev.dmg, life: ev.life, poison: ev.poison }); break;
      case 'meteor': addMeteor(this.field, { owner: e.gang, x: ev.x, z: ev.z, delay: ev.delay, r: ev.r, dmg: ev.dmg, kb: ev.kb, burn: ev.burn }); break;
      case 'zone': addZone(this.field, { owner: e.gang, kind: ev.kind, x: ev.x, z: ev.z, r: ev.r, arm: ev.arm, dur: ev.dur, dps: ev.dps, poison: ev.poison }); break;
      case 'summon': {
        const alive = this.enemies.filter((q) => q.summoned && !q.dead && q.gang === e.gang).length;
        const n = Math.min(ev.n, Math.max(0, ev.max - alive));
        for (let i = 0; i < n; i++) {
          const a = e.facing + (i % 2 ? 1 : -1) * (1.1 + i * 0.35);
          let x = e.x + Math.sin(a) * 4.2, z = e.z + Math.cos(a) * 4.2;
          if (blockedAt(this.obstacles, x, z, 0.8)) { x = e.x; z = e.z + 1.5; }
          const m = this.spawnEnemy(ev.unit, e.gang, x, z);
          m.summoned = true; m.state = 'chase'; m.respawnT = Infinity;
          this.fx.ring(x, z, 2.6, col, 0.5); this.fx.puff(x, z, 8, 1.4); this.fx.burst(x, 0.5, z, col, 12, 7);
        }
        break;
      }
      case 'buff':
        this.hud.showBanner('FRENZY!', `${def.name} is faster for a few seconds`, 2, def.css);
        this.fx.ring(e.x, e.z, 6, col, 0.6); this.haptic('warning');
        break;
      case 'phase':
        this.hud.showBanner(`${def.name.toUpperCase()} IS ENRAGED!`, 'Faster attacks, deadlier skills!', 3.2, def.css);
        this.shake = 1; this.haptic('warning');
        for (let k = 0; k < 3; k++) this.fx.ring(e.x, e.z, 5 + k * 3, col, 0.5 + k * 0.15);
        this.fx.burst(e.x, 2, e.z, col, 30, 12);
        break;
      case 'cue': this.bossCue(ev.name); break;
      default: break;
    }
    void p;
  }

  bossCue(name) {
    const a = this.audio;
    switch (name) {
      case 'howl': a.sweep(260, 640, 0.8, 0.18); a.sweep(640, 300, 1.0, 0.18, 'sawtooth', 0.8); this.shake = Math.max(this.shake, 0.5); this.haptic('warning'); break;
      case 'roar': a.noise(1.0, 0.2, 450); a.sweep(150, 70, 1.0, 0.2); this.shake = Math.max(this.shake, 0.4); break;
      case 'breath': a.noise(1.5, 0.17, 1700); this.haptic({ intensity: 0.4, sharpness: 0.3, duration: 400 }); break;
      case 'tail': a.sweep(520, 200, 0.5, 0.1, 'triangle'); a.play('sfx_whoosh', 0.7, 0.7); break;
      case 'leap': a.play('sfx_whoosh', 0.8, 0.65); a.sweep(420, 160, 0.4, 0.1); break;
      case 'spit': a.sweep(1100, 320, 0.15, 0.12, 'square'); a.noise(0.18, 0.08, 2600); break;
      case 'hiss': a.noise(0.7, 0.14, 3600); break;
      case 'slam': a.play('sfx_slam', 0.9, 0.8); this.shake = Math.max(this.shake, 0.6); break;
      default: break;
    }
  }

  /** Hit test + visuals for one boss strike (cone / circle / line). */
  bossStrike(e, ev, col) {
    const p = this.player, s = e.visual.char.group.scale.x;
    // visuals
    switch (ev.fx) {
      case 'claw': {
        if (ev.shape === 'line') { for (let i = 1; i <= 6; i++) this.fx.puff(ev.x + Math.sin(ev.facing) * ev.len * i / 6, ev.z + Math.cos(ev.facing) * ev.len * i / 6, 2, 1); this.bossfx.slash(e.x, e.z, ev.facing, 4.5, 170, col); }
        else this.bossfx.slash(ev.x, ev.z, ev.facing, ev.range, ev.arc, col);
        this.audio.play('sfx_whoosh', 0.55, 1.15); break;
      }
      case 'fang': this.bossfx.slash(e.x, e.z, ev.facing ?? e.facing, 4.5, 120, col); this.audio.play('sfx_whoosh', 0.5, 1.5); break;
      case 'slam': this.fx.ring(ev.x, ev.z, ev.r * 1.2, col, 0.45); this.fx.puff(ev.x, ev.z, 12, 2); this.fx.burst(ev.x, 0.4, ev.z, 0xc9b79a, 18, 9); this.shake = Math.max(this.shake, 0.7); this.audio.play('sfx_slam', 0.9, 0.9); break;
      case 'howl': for (let k = 0; k < 3; k++) this.fx.ring(ev.x, ev.z, ev.r * (1 - k * 0.28), k === 1 ? 0xffffff : col, 0.45 + k * 0.1); this.fx.puff(ev.x, ev.z, 14, 3); this.shake = Math.max(this.shake, 0.9); this.haptic('thud'); this.audio.play('sfx_slam', 0.7, 0.7); break;
      case 'tail': this.fx.ring(ev.x, ev.z, ev.r, col, 0.5); this.fx.ring(ev.x, ev.z, ev.r * 0.6, 0xffffff, 0.35); this.fx.puff(ev.x, ev.z, 14, 2.4); this.shake = Math.max(this.shake, 0.6); this.audio.play('sfx_slam', 0.8, 1.1); break;
      case 'flame': this.bossfx.flame(e.x, 2.1 * s, e.z, ev.facing, ev.range, 6, col); break;
      default: break;
    }
    // hit test
    let hit = false;
    if (ev.shape === 'cone') hit = inHitSector(ev.x, ev.z, ev.facing, p.x, p.z, ev.range, ev.arc, p.radius);
    else if (ev.shape === 'circle') hit = Math.hypot(p.x - ev.x, p.z - ev.z) < ev.r + p.radius;
    else if (ev.shape === 'line') {
      const dx = p.x - ev.x, dz = p.z - ev.z, ux = Math.sin(ev.facing), uz = Math.cos(ev.facing);
      const along = dx * ux + dz * uz, across = Math.abs(dx * uz - dz * ux);
      hit = along > -0.5 && along < ev.len + 0.5 && across < ev.width / 2 + p.radius;
    }
    if (!hit) return;
    const r = this.hurtPlayer(ev.dmg, ev.shape === 'line' ? e.x : ev.x, ev.shape === 'line' ? e.z : ev.z, ev.kb, { dot: ev.dot, color: ev.fx === 'flame' ? '#8fdcff' : '#ff5a4a' });
    if (r === 'hit' && ev.poison) applyPoison(p, 4, 5);
  }

  /** Projectiles / meteors / zones simulated by logic/hazards.js. */
  stepField(dt) {
    const p = this.player;
    const evs = updateField(this.field, dt, p, { blocked: (x, z) => blockedAt(this.city.buildings, x, z, 0.1) });
    for (const f of evs) {
      switch (f.type) {
        case 'projectileHit': {
          const venom = f.kind === 'venom';
          this.fx.burst(f.x, 1.3, f.z, venom ? 0x8dff5a : 0x9fe4ff, 12, 6); this.audio.play('sfx_punch', 0.5, venom ? 1.4 : 1.0);
          const r = this.hurtPlayer(f.dmg, f.x - f.vx * 0.2, f.z - f.vz * 0.2, 4, { color: venom ? '#9dff6a' : '#ff5a4a' });
          if (r === 'hit' && f.poison) applyPoison(p, 4, 5);
          break;
        }
        case 'projectileEnd': this.fx.burst(f.x, 0.5, f.z, f.kind === 'venom' ? 0x8dff5a : 0x9fe4ff, 6, 4); this.fx.puff(f.x, f.z, 2, 0.8); break;
        case 'meteorLand':
          this.fx.ring(f.x, f.z, f.r * 1.6, 0x8fdcff, 0.5); this.fx.ring(f.x, f.z, f.r, 0xffffff, 0.35); this.fx.puff(f.x, f.z, 10, 2); this.fx.burst(f.x, 0.5, f.z, 0x8fdcff, 26, 11);
          this.shake = Math.max(this.shake, 0.8); this.audio.play('sfx_slam', 0.85, 1.05); this.haptic('thud');
          if (f.hit) this.hurtPlayer(f.dmg, f.x, f.z, f.kb || 8);
          break;
        case 'zoneStart': this.fx.ring(f.x, f.z, f.r * 1.1, f.kind === 'poison' ? 0x9dff6a : 0xffb347, 0.4); this.audio.noise(0.3, 0.07, 3000); break;
        case 'zoneTick': {
          const d = applyDot(p, f.dmg * this.cfg.enemies.damageMult);
          if (f.poison) applyPoison(p, 2.5, 4);
          if (d > 0) this.dotFeedback(d, f.kind === 'poison' ? '#7dff5a' : '#ffb347');
          break;
        }
        default: break;
      }
    }
  }

  onBossDeath(e) {
    clearOwner(this.field, e.gang);
    for (const t of this.bossfx.tele) if (t.owner === e) t.life = 0;
    const col = this.bossColor(e.gang);
    for (let k = 0; k < 4; k++) this.fx.ring(e.x, e.z, 4 + k * 3, k % 2 ? 0xffffff : col, 0.6 + k * 0.15);
    this.fx.burst(e.x, 2, e.z, col, 40, 14); this.fx.puff(e.x, e.z, 16, 3);
    this.shake = 1.2; this.haptic('success'); this.audio.sweep(300, 40, 1.4, 0.2);
    this.hud.setBossCast('', '#fff');
  }

  handleDead(e, dt) {
    if (e.deadT > 2.4) e.visual.char.setOpacity(Math.max(0, 1 - (e.deadT - 2.4)));
    if (e.deadT > 3.5) {
      e.visual.char.group.visible = false;
      if (e.isBoss) return;
      if (e.summoned) { e.remove = true; this.removeEnemyVisual(e); return; }
      e.respawnT -= dt;
      if (e.respawnT <= 0 && !this.progress.gangs[e.gang].liberated) {
        // respawn far from player
        let pt;
        for (let k = 0; k < 10; k++) {
          pt = randomPointInTerritory(this.rnd, this.obstacles, e.gang, 45, 145);
          if (Math.hypot(pt.x - this.player.x, pt.z - this.player.z) > 40) break;
        }
        Object.assign(e, createEnemy(e.type, e.gang, pt.x, pt.z, this.cfg.enemies.hpMult), { radius: e.radius, visual: e.visual, actionId: e.actionId + 1, prevState: 'patrol' });
        e.visual.char.setOpacity(1);
        e.visual.char.group.visible = true;
      }
    }
  }

  // ------------------------------------------------------------------ visuals
  animate(dt) {
    const p = this.player;
    const pc = this.playerChar;
    const gy = groundHeight(p.x, p.z);
    this.playerY = this.playerY === undefined ? gy : this.playerY + (gy - this.playerY) * Math.min(1, dt * 18);
    pc.group.position.set(p.x, this.playerY, p.z);
    this.playerRing.position.set(p.x, this.playerY + 0.03, p.z);
    this.playerRing.children[1].material.opacity = 0.55 + Math.sin(performance.now() / 300) * 0.2;
    pc.group.rotation.y = p.facing;
    let clip = null, u = 0, key = this.playerActionId;
    if (p.dead) { clip = 'death'; u = Math.min(1, (this.deadT || 0) / 1.3); key = 'dead'; }
    else if (p.stun > 0) { clip = 'hit'; u = 1 - p.stun / 0.35; key = 'stun' + this.playerActionId; }
    else if (p.action) { clip = MOVES[p.action].clip; u = p.actionT / MOVES[p.action].dur; }
    if (this.cut && this.cut.pose) { clip = this.cut.pose.clip; u = this.cut.pose.u; key = 'cut'; }
    pc.update(dt, { moveSpeed: p.moveSpeed, clip, u, key, groundY: this.playerY });
    this.itemfx.updateShield(dt, p.x, p.z, this.playerY || 0, p.shield || 0);

    for (const e of this.enemies) {
      const v = e.visual, ch = v.char;
      if (!e.active && !e.dead) continue;
      if (e.dead && e.deadT > 3.5) { v.ad.marker.visible = false; v.ad.bar.visible = false; v.ad.tele.material.opacity = 0; continue; }
      ch.group.visible = true;
      e.gy = e.gy === undefined ? groundHeight(e.x, e.z) : e.gy + (groundHeight(e.x, e.z) - e.gy) * Math.min(1, dt * 18);
      ch.group.position.set(e.x, e.gy + e.lift, e.z);
      ch.group.rotation.y = e.facing;
      const T = ENEMY_TYPES[e.type];
      let c = null, eu = 0;
      if (e.dead) { c = 'death'; eu = Math.min(1, e.deadT / 1.2); }
      else if (e.isBoss && e.cast) { c = e.cast.clip; eu = Math.min(1, e.cast.t / e.cast.dur); }
      else if (e.state === 'attack') { c = T.clip; eu = e.t / T.dur; }
      else if (e.state === 'stagger') { c = 'hit'; eu = Math.min(1, e.t / (e.staggerDur || 0.4)); }
      ch.update(dt, { moveSpeed: e.moveSpeed, clip: c, u: eu, key: e.actionId });
      // telegraph
      const tele = v.ad.tele;
      if (!e.isBoss && e.state === 'attack' && e.t / T.dur < T.hitT) {
        const k = (e.t / T.dur) / T.hitT;
        tele.material.opacity = 0.15 + 0.35 * k;
        const r = T.range * (T.aoe ? 1.15 : 0.9);
        tele.scale.set(r * k, r * k, 1);
        const off = T.aoe ? 1.2 : T.range * 0.45;
        tele.position.set(e.x + Math.sin(e.facing) * off, (e.gy || 0) + 0.05, e.z + Math.cos(e.facing) * off);
      } else tele.material.opacity = Math.max(0, tele.material.opacity - dt * 4);
      v.ad.marker.visible = !e.dead;
      v.ad.marker.position.set(e.x, (e.gy || 0) + 0.04, e.z);
      const ms = e.radius * 1.4; v.ad.marker.scale.set(ms, ms, 1);
      // hp bar
      const bar = v.ad.bar;
      bar.visible = !e.dead && e.hp < e.maxHp && !e.isBoss;
      if (bar.visible) {
        bar.position.set(e.x, 2.55 * ch.group.scale.x + e.lift, e.z);
        bar.quaternion.copy(this.camera.quaternion);
        const k = e.hp / e.maxHp;
        v.ad.fill.scale.x = Math.max(0.001, k); v.ad.fill.position.x = -(1 - k) * 0.57;
      }
    }
  }

  updateCamera(dt) {
    if (this.cut && this.cut.active) return; // the cutscene drives the camera
    const T = this.T;
    if (this.mode === 'play' && this.camMode === 'third') return this.updateThirdPerson(dt);
    const h = this.mode === 'edit' ? 40 : +this.cfg.visual.cameraHeight || 13;
    const fx = this.mode === 'edit' ? this.editCam.x : this.player.x;
    const fz = this.mode === 'edit' ? this.editCam.z : this.player.z;
    const tilt = this.mode === 'edit' ? 0.62 : 0.8;
    const target = new T.Vector3(fx, h, fz + h * tilt);
    if (!this.camPos) this.camPos = target.clone();
    this.camPos.lerp(target, Math.min(1, dt * 6));
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * this.shake * 0.6;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.camera.position.z += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(this.camPos.x, 1.1, this.camPos.z - h * tilt);
    // sun follows focus so shadows stay crisp
    this.sun.position.set(fx + this.sunOffset.x, this.sunOffset.y, fz + this.sunOffset.z);
    this.sun.target.position.set(fx, 0, fz);
  }

  updateThirdPerson(dt) {
    const T = this.T, p = this.player;
    this.camHold = Math.max(0, this.camHold - dt);
    this.camYaw = followYaw(this.camYaw, p.facing, dt, p.moveSpeed > 0.5, this.camHold + (this.orbit ? 1 : 0));
    const blds = this.city.tall;
    const rig = thirdPersonRig(p.x, p.z, this.camYaw, {}, (x, z) => blockedAt(blds, x, z, 0.4));
    const gy = this.playerY || 0;
    const target = new T.Vector3(rig.eye.x, rig.eye.y + gy, rig.eye.z);
    if (!this.camPos) this.camPos = target.clone();
    this.camPos.lerp(target, Math.min(1, dt * 8));
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * this.shake * 0.35;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(rig.look.x, rig.look.y + gy, rig.look.z);
    this.sun.position.set(p.x + this.sunOffset.x, this.sunOffset.y, p.z + this.sunOffset.z);
    this.sun.target.position.set(p.x, 0, p.z);
  }

  toScreen(x, y, z) {
    const v = new this.T.Vector3(x, y, z).project(this.camera);
    if (v.z > 1) return null;
    const el = this.renderer.domElement;
    return { x: (v.x + 1) / 2 * el.clientWidth, y: (1 - v.y) / 2 * el.clientHeight };
  }

  resize() {
    const w = this.root.clientWidth || window.innerWidth, h = this.root.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.hud.resize(w, h); this.controls.relayout();
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onCamKey);
    window.removeEventListener('keydown', this.onItemKey);
    this.itemfx.dispose();
    window.removeEventListener('pointermove', this.onOrbitMove);
    window.removeEventListener('pointerup', this.onOrbitUp);
    if (this.editMove) { window.removeEventListener('pointermove', this.editMove); window.removeEventListener('pointerup', this.editUp); }
    if (this.cut) { this.cut.dispose(); this.cut = null; }
    this.bossfx.dispose();
    this.audio.dispose();
    this.controls.dispose();
    try { this.lib && this.lib.haptics && this.lib.haptics.stop(); } catch (e) { /* */ }
    if (this.env) { if (Character.env === this.env) Character.env = null; this.env.dispose(); this.env = null; }
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.hud.dispose();
  }
}
