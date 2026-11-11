// Game loop and rules: Baldy explores the valley, lost baby penguins follow him, and he leads them home.
import { WORLD, onIce, layoutWorld, clampHome, finalScore, starsFor, levelPlan, BIOMES } from './terrain.js';
import { buildScene, buildBeacon, buildFish, buildShadow, buildArrow, buildSparkles, buildSnowball, buildHeart } from './world.js';
import { SLEDS } from './sleds.js';
import { buildMan, setSled, animateMan, buildPenguin, animatePenguin, buildWhirly, animateWhirly } from './character.js';
import { createHud } from './hud.js';
import { showLoading } from './loading.js';
import { createInput } from './input.js';
import { unlockAudio, stopAudio, setMuted, isMuted, sfx } from './audio.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, d, a, b) => clamp(Number.isFinite(Number(v)) ? Number(v) : d, a, b);
function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function buzz(effect) { try { lib.haptics.play(effect); } catch (e) { /* no haptics here */ } }
function log(message) { try { lib.log(message); } catch (e) { console.log(message); } }

function readConfig() {
  const g = window.gameConfig || {};
  return {
    penguins: Math.round(num(g.penguinCount, 4, 3, 12)),
    fish: Math.round(num(g.fishCount, 24, 10, 40)),
    walkSpeed: num(g.walkSpeed, 9, 6, 12),
    whirlies: Math.round(num(g.whirlyCount, 1, 0, 3)),
    snowfall: g.snowfall !== false,
    jacketColor: typeof g.jacketColor === 'string' ? g.jacketColor : '#e8452c',
    home: clampHome(g.home || { x: 0, z: 10 }),
  };
}

let current = null, restartTimer = 0, savedBest = 0, bestLoaded = false, travelling = false;
const session = { level: 1, score: 0 };
const store = { fish: 0, owned: ['classic'], sled: 'classic' };   // fish wallet and bought sled skins              // carries on from level to level

export function startGame(mode, autoPlay = false) {
  if (current) current.dispose();
  if (mode === 'edit') stopAudio();
  current = createGame(mode, autoPlay);
}

export function registerParameters(mode) {
  const param = (key, extra) => ({
    key, ...extra,
    onChange(value) {
      if (window.gameConfig) window.gameConfig[key] = value;
      clearTimeout(restartTimer); restartTimer = setTimeout(() => startGame(mode), 350);
    },
  });
  try {
    lib.showGameParameters({
      name: "Baldy's Penguin Rescue",
      params: {
        'Penguins at level 1': param('penguinCount', { type: 'slider', min: 3, max: 12, step: 1 }),
        'Golden fish': param('fishCount', { type: 'slider', min: 10, max: 40, step: 1 }),
        'Walk speed': param('walkSpeed', { type: 'slider', min: 6, max: 12, step: 0.5 }),
        'Whirlies at level 1': param('whirlyCount', { type: 'slider', min: 0, max: 3, step: 1 }),
        'Snowfall': param('snowfall', { type: 'checkbox' }),
        'Jacket color': param('jacketColor', { type: 'color' }),
      },
    });
  } catch (e) { /* host without a settings panel */ }
}

function createGame(mode, autoPlay) {
  const cfg = readConfig(), plan = levelPlan(mode === 'edit' ? 1 : session.level, cfg), home = plan.home;
  const layout = layoutWorld(home, plan.penguins, plan.fish, plan.seed, { clumps: plan.biome.clumps, rocks: plan.biome.rocks, snowmen: plan.snowmen, huts: plan.huts, spikes: plan.spikes, holes: plan.holes });
  const world = buildScene(home, layout, cfg.snowfall, plan.theme, plan.biome.id), scene = world.scene, H = world.H;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none';
  document.body.appendChild(canvas);
  const camera = new THREE.PerspectiveCamera(62, 720 / 1280, 0.3, 700);
  function resize() {
    const w = window.innerWidth || 720, h = window.innerHeight || 1280;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);

  // ---------- actors ----------
  const man = buildMan(cfg.jacketColor, store.sled); scene.add(man.root);
  const manShadow = buildShadow(0.6); scene.add(manShadow);
  const player = { x: home.x, z: home.z + 18, y: 0, vx: 0, vz: 0, vy: 0, yaw: 0, grounded: true, sled: false, energy: 1, spin: 0, safe: 0 };
  player.y = H(player.x, player.z);

  const solids = [
    ...layout.trees.map(t => ({ x: t.x, z: t.z, r: 0.75 * t.s })),
    ...layout.rocks.map(r => ({ x: r.x, z: r.z, r: r.r })),
    ...layout.snowmen.map(m => ({ x: m.x, z: m.z, r: m.r * m.s })), ...layout.huts.map(h => ({ x: h.x, z: h.z, r: h.r })),
    { x: home.x, z: home.z, r: 4.3 }, { x: home.x, z: home.z + 4.4, r: 1.9 }, { x: home.x + 3.4, z: home.z + 6.6, r: 0.9 },
  ];

  const penguins = layout.penguins.map((spot, i) => {
    const model = buildPenguin(i + 1); scene.add(model.root);
    const beacon = buildBeacon(); scene.add(beacon);
    const shadow = buildShadow(0.36); scene.add(shadow);
    return { model, beacon, shadow, x: spot.x, z: spot.z, y: H(spot.x, spot.z), yaw: Math.random() * 6, state: 'lost', fly: null, slot: null, moving: false };
  });
  let chain = [], delivered = 0, deliverT = 0;

  const fishes = layout.fish.map((spot, i) => {
    const mesh = buildFish(); scene.add(mesh);
    return { mesh, x: spot.x, z: spot.z, y: H(spot.x, spot.z) + 1.15, taken: false, phase: i };
  });
  let fishCount = 0;

  const whirlies = [];
  for (let i = 0; i < plan.whirlies; i++) {
    const model = buildWhirly(); scene.add(model.root);
    const a = i * 2.1 + 1, w = { model, x: Math.cos(a) * 60, z: Math.sin(a) * 60, tx: 0, tz: 0 };
    pickWhirlyTarget(w); whirlies.push(w);
  }
  function pickWhirlyTarget(w) {
    for (let k = 0; k < 20; k++) {
      const a = Math.random() * 6.283, r = 15 + Math.random() * 80;
      w.tx = Math.cos(a) * r; w.tz = Math.sin(a) * r;
      if (Math.hypot(w.tx - home.x, w.tz - home.z) > 30) return;
    }
  }

  // rolling snowballs: cross the valley in straight lines and burst on anything solid
  const BALL_R = 1.35, balls = [];
  function launchBall(b) {
    for (let k = 0; k < 20; k++) {
      const a = Math.random() * 6.283, edge = WORLD.radius - 6, tx = (Math.random() - 0.5) * 120, tz = (Math.random() - 0.5) * 120;
      b.x = Math.cos(a) * edge; b.z = Math.sin(a) * edge;
      const d = Math.hypot(tx - b.x, tz - b.z) || 1; b.dx = (tx - b.x) / d; b.dz = (tz - b.z) / d;
      if (Math.hypot(b.x - player.x, b.z - player.z) > 30) break;
    }
    b.grow = 0;
  }
  for (let i = 0; i < plan.balls; i++) {
    const model = buildSnowball(BALL_R); scene.add(model);
    const shadow = buildShadow(1.2); scene.add(shadow);
    const b = { model, shadow, x: 0, z: 0, dx: 1, dz: 0, grow: 0 }; launchBall(b); balls.push(b);
  }
  const heartPickup = layout.heart ? { mesh: buildHeart(), x: layout.heart.x, z: layout.heart.z, taken: false } : null;
  if (heartPickup) scene.add(heartPickup.mesh);

  const arrow = buildArrow(); arrow.visible = false; arrow.scale.setScalar(0.7); scene.add(arrow);
  const sparkles = buildSparkles(scene);
  const snowBase = world.snow ? world.snow.geometry.attributes.position.array.slice() : null;

  // ---------- state ----------
  let phase = mode === 'edit' ? 'edit' : 'menu';
  let hearts = 3, timeLeft = plan.timeLimit, shownTime = -1, overT = -1, overWhy = '';
  let time = 0, clock = 0, winT = -1, raf = 0, last = performance.now(), disposed = false, stepT = 0;
  let camYaw = Math.PI, camPitch = 0.36, camDist = 9.5;

  const hud = createHud({
    tap() { unlockAudio(); sfx.tap(); },
    play() { begin(); },
    pause() { if (phase === 'play') { phase = 'paused'; input.reset(); hud.show('paused'); saveProgress(); } },
    shop() { phase = 'shop'; shopIndex = Math.max(0, SLEDS.findIndex(s => s.id === store.sled)); showShop(); hud.show('shop'); },
    shopNav(d) { shopIndex = (shopIndex + d + SLEDS.length) % SLEDS.length; showShop(); },
    shopAct() {
      const item = SLEDS[shopIndex];
      if (!store.owned.includes(item.id)) {
        if (store.fish < item.price) { hud.shopShake(); buzz('error'); return; }
        store.fish -= item.price; store.owned.push(item.id);
        sfx.win(); buzz('success'); sparkles.burst('star', player.x, player.y + 1.4, player.z, 14, 4);
      }
      store.sled = item.id; saveProgress(); showShop();
    },
    shopBack() { setSled(man, store.sled); phase = 'menu'; hud.show('menu'); hud.setWallet(store.fish); },
    board() {
      hud.showBoard(null);
      try {
        Promise.resolve(lib.getTopNEntriesFromLeaderboard(10)).then(r => { if (!disposed) hud.showBoard(r?.entries || [], r?.userRank); }).catch(() => { if (!disposed) hud.showBoard([]); });
      } catch (e) { hud.showBoard([]); }
    },
    resume() { if (phase === 'paused') { phase = 'play'; hud.show('play'); last = performance.now(); } },
    mute() { setMuted(!isMuted()); hud.setMute(isMuted()); },
    next() { session.level++; travel(); },
    restart() { session.level = 1; session.score = 0; saveProgress(); travel(); },
  });
  const input = createInput(hud.root, hud.buttons);
  hud.setCounts(0, penguins.length, 0); hud.setFish(0); hud.setMute(isMuted()); hud.setBest(savedBest, session.level);
  hud.setLevel(plan.level, session.score); hud.setWallet(store.fish); hud.setHearts(hearts); hud.setTime(timeLeft);
  let shopIndex = 0;
  function showShop() {
    const item = SLEDS[shopIndex], owned = store.owned.includes(item.id);
    setSled(man, item.id);
    hud.setShop({ name: item.name, price: item.price, owned, active: store.sled === item.id, fish: store.fish, index: shopIndex, count: SLEDS.length });
  }

  function saveProgress() {
    try { Promise.resolve(lib.saveUserGameState({ best: savedBest, level: session.level, score: session.score, fish: store.fish, owned: store.owned, sled: store.sled })).catch(() => {}); } catch (e) { /* no saves here */ }
  }

  /** Slide to the next level: the loading screen covers the rebuild, then play starts as it fades. */
  function travel() {
    if (travelling) return;
    travelling = true; input.enabled = false;
    showLoading({
      title: false, label: `LEVEL ${session.level}`, sub: BIOMES[(session.level - 1) % BIOMES.length].name, sled: store.sled, jacket: cfg.jacketColor, duration: 1.9,
      onMid: () => startGame(mode, 'hold'),
      onDone: () => { travelling = false; current?.begin(); },
    });
  }

  function begin() {
    phase = 'play'; input.enabled = true; input.reset(); hud.show('play'); camYaw = Math.PI; camPitch = 0.36; player.yaw = 0;
    hud.banner(`LEVEL ${plan.level}`, `${plan.biome.name} · 🐧 ×${penguins.length}`);
  }

  if (phase === 'edit') { hud.editMode(); scene.fog = null; setupEditor(); }
  else if (autoPlay === 'hold') hud.show('hold');
  else if (autoPlay) begin();
  else hud.show('menu');

  if (!bestLoaded && mode !== 'edit') {
    bestLoaded = true;
    try {
      Promise.resolve(lib.getUserGameState()).then(r => {
        const st = r?.state || {}, level = Math.floor(Number(st.level)) || 1;
        savedBest = Number(st.best) || 0;
        store.fish = Math.max(store.fish, Math.floor(Number(st.fish)) || 0);
        if (Array.isArray(st.owned)) store.owned = SLEDS.map(s => s.id).filter(id => id === 'classic' || st.owned.includes(id));
        if (store.owned.includes(st.sled)) store.sled = st.sled;
        if (level > 1 && current && current.inMenu() && session.level === 1) {       // pick up where the player left off
          session.level = level; session.score = Number(st.score) || 0; startGame(mode);
        } else if (current) current.applyStore();
      }).catch(() => {});
    } catch (e) { /* no saves here */ }
  }

  // ---------- player ----------
  function updatePlayer(dt) {
    const p = player;
    camYaw -= input.lookX * 0.006; camPitch = clamp(camPitch + input.lookY * 0.004, 0.08, 1.15);
    input.lookX = input.lookY = 0; input.lookIdle += dt;
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let dx = fx * input.my + rx * input.mx, dz = fz * input.my + rz * input.mx;
    const wantSled = (input.sled || input.sledKey) && p.spin <= 0;
    const wasSled = p.sled;
    p.sled = wantSled && p.energy > 0 && (p.sled || p.energy > 0.15);
    if (p.sled && !wasSled) { sfx.sled(); buzz('tick'); }
    p.energy = clamp(p.energy + (p.sled ? -0.2 : 0.14) * dt, 0, 1);
    if (p.sled && Math.hypot(dx, dz) < 0.1) { dx = Math.sin(p.yaw); dz = Math.cos(p.yaw); }   // SLED alone slides straight ahead
    const ground0 = H(p.x, p.z), ice = p.grounded && onIce(p.x, p.z);
    const speed = cfg.walkSpeed * (p.sled ? 1.75 : 1), accel = ice ? 1.6 : p.sled ? 4 : 11;
    const k = Math.min(1, accel * dt);
    if (p.spin > 0) { p.spin -= dt; dx = dz = 0; }
    p.vx += (dx * speed - p.vx) * k; p.vz += (dz * speed - p.vz) * k;
    if (p.sled && p.grounded) {                                    // sleds love going downhill
      p.vx -= (H(p.x + 0.6, p.z) - H(p.x - 0.6, p.z)) * 12 * dt;
      p.vz -= (H(p.x, p.z + 0.6) - H(p.x, p.z - 0.6)) * 12 * dt;
    }
    if (input.jump) {
      input.jump = false;
      if (p.grounded && p.spin <= 0) { p.vy = 9.5; p.grounded = false; sfx.jump(); buzz('tick'); }
    }
    p.x += p.vx * dt; p.z += p.vz * dt;
    for (const s of solids) {
      const ox = p.x - s.x, oz = p.z - s.z, d = Math.hypot(ox, oz), min = s.r + 0.45;
      if (d < min && d > 0.0001) { p.x = s.x + ox / d * min; p.z = s.z + oz / d * min; }
    }
    const r = Math.hypot(p.x, p.z);
    if (r > WORLD.radius) { p.x *= WORLD.radius / r; p.z *= WORLD.radius / r; }
    const ground = H(p.x, p.z);
    if (p.grounded) { p.y = ground; p.vy = 0; }
    else {
      p.vy -= 26 * dt; p.y += p.vy * dt;
      if (p.y <= ground) {
        p.y = ground; p.vy = 0; p.grounded = true;
        sparkles.burst('snow', p.x, p.y + 0.2, p.z, 6, 2.5); buzz({ intensity: 0.5, sharpness: 0.3 });
      }
    }
    void ground0;
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > 0.5) p.yaw = lerpAngle(p.yaw, Math.atan2(p.vx, p.vz), Math.min(1, dt * 10));
    if (sp > 2 && input.lookIdle > 1.2) {                          // camera drifts behind Baldy when he walks away from it
      const want = Math.atan2(-p.vx, -p.vz), w = Math.max(0, Math.cos(want - camYaw));
      camYaw = lerpAngle(camYaw, want, dt * 0.9 * w);
    }
    if (p.sled && p.grounded && sp > 4) { stepT -= dt; if (stepT <= 0) { stepT = 0.08; sparkles.burst('snow', p.x, p.y + 0.15, p.z, 1, 1.5); } }
    p.safe -= dt;
    animateMan(man, dt, { speed: sp, grounded: p.grounded, sled: p.sled });
    hud.setEnergy(p.energy, p.sled || p.energy > 0.15);
  }

  function placeMan(dt) {
    const p = player;
    man.root.position.set(p.x, p.y, p.z);
    man.root.rotation.y = p.yaw + (p.spin > 0 ? (0.8 - p.spin) * 16 : 0);
    man.root.visible = !(phase === 'play' && p.safe > 0 && p.safe < 2.6 && Math.floor(clock * 14) % 2);
    manShadow.position.set(p.x, H(p.x, p.z) + 0.06, p.z);
    manShadow.scale.setScalar(clamp(1 - (p.y - H(p.x, p.z)) * 0.25, 0.4, 1));
    void dt;
  }

  // ---------- penguins ----------
  function joinChain(pg) {
    pg.state = 'follow'; chain.push(pg);
    sfx.peep(); buzz('tap'); sparkles.burst('heart', pg.x, pg.y + 1.2, pg.z, 7);
    hud.toast(chain.length > 1 ? `🐧 ×${chain.length}` : '🐧 Follow me!');
    hud.setCounts(delivered, penguins.length, chain.length);
  }

  function updatePenguins(dt) {
    const p = player, playing = phase === 'play';
    if (playing) deliverT -= dt;
    if (playing && chain.length && deliverT <= 0 && Math.hypot(p.x - home.x, p.z - home.z) < WORLD.homeRadius + 2) {
      const pg = chain.shift(), n = penguins.length, a = n > 1 ? -1.35 + delivered * (2.7 / (n - 1)) : 0;
      pg.state = 'homing'; pg.slot = { x: home.x + Math.sin(a) * 8.6, z: home.z + Math.cos(a) * 8.6 };
      delivered++; deliverT = 0.4;
      sfx.home(); buzz('tap'); sparkles.burst('star', pg.x, pg.y + 1.2, pg.z, 8);
      hud.setCounts(delivered, n, chain.length);
      if (delivered === n) winT = 1.8; else hud.toast(`🏠 ${delivered}/${n}`);
    }
    penguins.forEach(pg => {
      let animMode = 'idle', speed = 0;
      if (pg.state === 'lost') {
        if (pg.fly) {
          const f = pg.fly; f.t = Math.min(1, f.t + dt / 0.8);
          pg.x = f.fx + (f.tx - f.fx) * f.t; pg.z = f.fz + (f.tz - f.fz) * f.t;
          pg.y = H(pg.x, pg.z) + Math.sin(f.t * Math.PI) * 3.5; pg.yaw += dt * 14;
          if (f.t >= 1) pg.fly = null;
          animMode = 'call';
        } else {
          pg.y = H(pg.x, pg.z);
          const d = Math.hypot(p.x - pg.x, p.z - pg.z);
          if (d < 26) { animMode = 'call'; pg.yaw = lerpAngle(pg.yaw, Math.atan2(p.x - pg.x, p.z - pg.z), Math.min(1, dt * 5)); }
          if (playing && d < 2.8 && p.spin <= 0) joinChain(pg);
        }
      } else if (pg.state === 'follow') {
        const i = chain.indexOf(pg), lead = i === 0 ? p : chain[i - 1], gap = i === 0 ? 1.5 : 1.15;
        const ox = lead.x - pg.x, oz = lead.z - pg.z, d = Math.hypot(ox, oz);
        pg.moving = d > gap + 0.05;
        if (pg.moving) {
          const step = Math.min(d - gap, 26 * dt); pg.x += ox / d * step; pg.z += oz / d * step; speed = step / Math.max(dt, 0.001);
          pg.yaw = lerpAngle(pg.yaw, Math.atan2(ox, oz), Math.min(1, dt * 12));
        }
        pg.y = H(pg.x, pg.z);
        animMode = pg.moving ? (p.sled ? 'slide' : 'walk') : 'idle';
      } else if (pg.state === 'homing') {
        const ox = pg.slot.x - pg.x, oz = pg.slot.z - pg.z, d = Math.hypot(ox, oz);
        if (d < 0.25) { pg.state = 'home'; }
        else { const step = Math.min(d, 8 * dt); pg.x += ox / d * step; pg.z += oz / d * step; pg.yaw = Math.atan2(ox, oz); speed = 8; }
        pg.y = H(pg.x, pg.z); animMode = 'walk';
      } else {
        pg.yaw = lerpAngle(pg.yaw, Math.atan2(pg.x - home.x, pg.z - home.z), Math.min(1, dt * 6)); animMode = 'dance';
      }
      animatePenguin(pg.model, dt, animMode, speed);
      pg.model.root.position.set(pg.x, pg.y, pg.z); pg.model.root.rotation.y = pg.yaw;
      const gy = H(pg.x, pg.z);
      pg.shadow.position.set(pg.x, gy + 0.05, pg.z);
      pg.beacon.visible = pg.state === 'lost' && phase !== 'win';
      if (pg.beacon.visible) { pg.beacon.position.set(pg.x, gy + 31, pg.z); pg.beacon.material.opacity = 0.26 + Math.sin(clock * 3 + pg.x) * 0.08; }
    });
    animatePenguin(world.igloo.userData.mama, dt, delivered === penguins.length ? 'dance' : chain.length ? 'call' : 'idle');
  }

  function scatterChain() {
    chain.forEach(pg => {
      const a = Math.random() * 6.283, d = 7 + Math.random() * 6;
      let tx = pg.x + Math.cos(a) * d, tz = pg.z + Math.sin(a) * d;
      const r = Math.hypot(tx, tz), max = WORLD.radius - 6;
      if (r > max) { tx *= max / r; tz *= max / r; }
      const hx = tx - home.x, hz = tz - home.z, hd = Math.hypot(hx, hz) || 1;
      if (hd < 14) { tx = home.x + hx / hd * 14; tz = home.z + hz / hd * 14; }
      for (const s of solids) {
        const ox = tx - s.x, oz = tz - s.z, sd = Math.hypot(ox, oz) || 1;
        if (sd < s.r + 1) { tx = s.x + ox / sd * (s.r + 1); tz = s.z + oz / sd * (s.r + 1); }
      }
      pg.state = 'lost'; pg.fly = { fx: pg.x, fz: pg.z, tx, tz, t: 0 };
    });
    chain = [];
    hud.setCounts(delivered, penguins.length, 0);
  }

  function updateWhirlies(dt) {
    const p = player;
    whirlies.forEach(w => {
      const ox = w.tx - w.x, oz = w.tz - w.z, d = Math.hypot(ox, oz);
      if (d < 2) pickWhirlyTarget(w);
      else { w.x += ox / d * plan.whirlySpeed * dt; w.z += oz / d * plan.whirlySpeed * dt; }
      const gy = H(w.x, w.z);
      w.model.root.position.set(w.x, gy, w.z);
      w.model.face.rotation.y = Math.atan2(camera.position.x - w.x, camera.position.z - w.z);
      animateWhirly(w.model, dt);
      if (phase === 'play' && p.safe <= 0 && winT < 0 && Math.hypot(p.x - w.x, p.z - w.z) < 2.3 && p.y - gy < 1.0) {
        const ox2 = p.x - w.x, oz2 = p.z - w.z, d2 = Math.hypot(ox2, oz2) || 1;
        hurt(ox2 / d2, oz2 / d2, 6); p.spin = 0.8;
        sfx.whoosh(); sparkles.burst('snow', p.x, p.y + 1, p.z, 12, 5);
        if (chain.length) { scatterChain(); hud.toast('🌪️ Whoosh!'); buzz('warning'); } else buzz('tap');
      }
    });
  }

  function updateFish(dt) {
    const p = player;
    fishes.forEach(f => {
      if (f.taken) return;
      f.phase += dt;
      f.mesh.position.set(f.x, f.y + Math.sin(f.phase * 2.2) * 0.2, f.z); f.mesh.rotation.y = f.phase * 1.8;
      if (phase === 'play' && Math.hypot(p.x - f.x, p.z - f.z) < 1.9 && Math.abs(p.y + 1 - f.y) < 2.6) {
        f.taken = true; f.mesh.visible = false; fishCount++; store.fish++; timeLeft += 2;
        p.energy = Math.min(1, p.energy + 0.3);
        sfx.fish(); buzz('tick'); sparkles.burst('star', f.x, f.y, f.z, 5, 2);
        hud.setFish(fishCount);
      }
    });
  }

  function updateArrow() {
    const p = player;
    let target = null, best = Infinity, toHome = false;
    penguins.forEach(pg => {
      if (pg.state !== 'lost' || pg.fly) return;
      const d = Math.hypot(pg.x - p.x, pg.z - p.z); if (d < best) { best = d; target = pg; }
    });
    if (!target && chain.length) { target = home; best = Math.hypot(home.x - p.x, home.z - p.z); toHome = true; }
    arrow.visible = phase === 'play' && !!target && best > 6;
    if (!arrow.visible) return;
    const dx = (target.x - p.x) / best, dz = (target.z - p.z) / best, ax = p.x + dx * 2.8, az = p.z + dz * 2.8;
    arrow.position.set(ax + dx * Math.sin(clock * 5) * 0.25, Math.max(H(ax, az), p.y) + 0.3, az + dz * Math.sin(clock * 5) * 0.25);
    arrow.rotation.y = Math.atan2(dx, dz);
    arrow.material.color.setHex(toHome ? 0xffa53a : 0x38d6ff);
  }

  // ---------- camera ----------
  const look = new THREE.Vector3();
  function updateCamera(dt) {
    const p = player;
    const shop = phase === 'shop';
    if (phase === 'menu' || phase === 'win') camYaw += dt * 0.25; else if (shop) camYaw += dt * 0.6;
    const won = phase === 'win', tx = won ? home.x : p.x, tz = won ? home.z + 7 : p.z, ty = won ? H(tx, tz) : p.y;
    const dist = shop ? 5.4 : phase === 'menu' ? 6.5 : won ? 17 : camDist, pitch = shop ? 0.34 : phase === 'menu' ? 0.2 : won ? 0.5 : camPitch;
    const cx = tx + Math.sin(camYaw) * Math.cos(pitch) * dist, cz = tz + Math.cos(camYaw) * Math.cos(pitch) * dist;
    const cy = Math.max(ty + 1.7 + Math.sin(pitch) * dist, H(cx, cz) + 0.9);
    const k = phase === 'play' ? Math.min(1, dt * 14) : won ? Math.min(1, dt * 3) : 1;
    camera.position.x += (cx - camera.position.x) * k; camera.position.y += (cy - camera.position.y) * k; camera.position.z += (cz - camera.position.z) * k;
    look.set(tx, ty + (shop ? 0.75 : phase === 'menu' ? 1.5 : 1.9), tz); camera.lookAt(look);
  }

  function updateSnow(dt) {
    if (!world.snow) return;
    const arr = world.snow.geometry.attributes.position.array, cx = camera.position.x, cz = camera.position.z;
    for (let i = 0; i < arr.length; i += 3) {
      snowBase[i + 1] -= (2.2 + (i % 7) * 0.2) * dt; if (snowBase[i + 1] < 0) snowBase[i + 1] += 30;
      snowBase[i] += Math.sin(clock + i) * 0.4 * dt;
      arr[i] = ((snowBase[i] - cx) % 70 + 105) % 70 - 35; arr[i + 1] = snowBase[i + 1]; arr[i + 2] = ((snowBase[i + 2] - cz) % 70 + 105) % 70 - 35;
    }
    world.snow.position.set(cx, camera.position.y - 12, cz);
    world.snow.geometry.attributes.position.needsUpdate = true;
  }

  // ---------- hearts, hazards and the clock ----------
  function hurt(dx, dz, power = 9) {
    const p = player;
    if (p.safe > 0 || phase !== 'play' || winT > 0 || overT > 0) return false;
    hearts--; p.safe = 2.6; p.spin = 0.55; p.sled = false; p.vx = dx * power; p.vz = dz * power;
    sfx.ouch(); buzz('error'); hud.setHearts(hearts); hud.flash();
    sparkles.burst('snow', p.x, p.y + 1, p.z, 10, 4);
    if (hearts <= 0) { overT = 0.9; overWhy = 'hearts'; }
    return true;
  }

  function updateHazards(dt) {
    const p = player, playing = phase === 'play', ground = H(p.x, p.z), low = p.y - ground < 1.0;
    if (playing && low) {
      for (const sp of layout.spikes) {
        const ox = p.x - sp.x, oz = p.z - sp.z, d = Math.hypot(ox, oz);
        if (d < sp.r + 0.35) { hurt(ox / (d || 1), oz / (d || 1), 10); p.x = sp.x + ox / (d || 1) * (sp.r + 0.5); p.z = sp.z + oz / (d || 1) * (sp.r + 0.5); break; }
      }
    }
    if (playing && p.grounded) {
      for (const hole of layout.holes) {
        const ox = p.x - hole.x, oz = p.z - hole.z, d = Math.hypot(ox, oz);
        if (d < hole.r - 0.3) {                                    // splash! climb out on the side you came from
          const sp = Math.hypot(p.vx, p.vz), bx = sp > 0.5 ? -p.vx / sp : ox / (d || 1), bz = sp > 0.5 ? -p.vz / sp : oz / (d || 1);
          const wasSafe = p.safe > 0;
          sfx.splash(); sparkles.burst('snow', hole.x, 0.6, hole.z, 12, 4);
          p.x = hole.x + bx * (hole.r + 1.6); p.z = hole.z + bz * (hole.r + 1.6);
          if (wasSafe) { p.vx = p.vz = 0; } else hurt(bx, bz, 3);
          break;
        }
      }
    }
    balls.forEach(b => {
      b.grow = Math.min(1, b.grow + dt * 2);
      b.x += b.dx * plan.ballSpeed * dt; b.z += b.dz * plan.ballSpeed * dt;
      const gy = H(b.x, b.z);
      let burst = Math.hypot(b.x, b.z) > WORLD.radius - 3 || Math.hypot(b.x - home.x, b.z - home.z) < 13;
      if (!burst) for (const s of solids) if (Math.hypot(b.x - s.x, b.z - s.z) < s.r + BALL_R * 0.7) { burst = true; break; }
      if (!burst && playing && Math.hypot(b.x - p.x, b.z - p.z) < BALL_R + 0.45 && p.y - gy < BALL_R * 1.7) {
        if (hurt(b.dx, b.dz, 12)) burst = true;
      }
      if (burst) {
        if (Math.hypot(b.x - p.x, b.z - p.z) < 45) { sparkles.burst('snow', b.x, gy + 1, b.z, 10, 5); if (Math.hypot(b.x - p.x, b.z - p.z) < 18) sfx.pop(); }
        launchBall(b);
      }
      const r = BALL_R * (0.3 + 0.7 * b.grow);
      b.model.position.set(b.x, H(b.x, b.z) + r, b.z); b.model.scale.setScalar(0.3 + 0.7 * b.grow);
      b.model.userData.ball.rotateOnWorldAxis(rollAxis.set(b.dz, 0, -b.dx), plan.ballSpeed * dt / BALL_R);
      b.shadow.position.set(b.x, H(b.x, b.z) + 0.06, b.z);
    });
    if (heartPickup && !heartPickup.taken) {
      const m = heartPickup.mesh, hy = H(heartPickup.x, heartPickup.z) + 1.3;
      m.position.set(heartPickup.x, hy + Math.sin(clock * 2.5) * 0.2, heartPickup.z); m.rotation.y = clock * 2; m.scale.setScalar(1 + Math.sin(clock * 5) * 0.08);
      if (playing && hearts < 3 && Math.hypot(p.x - heartPickup.x, p.z - heartPickup.z) < 1.9) {
        heartPickup.taken = true; m.visible = false; hearts++;
        sfx.heart(); buzz('success'); hud.setHearts(hearts); sparkles.burst('heart', heartPickup.x, hy, heartPickup.z, 10, 3);
      }
    }
  }
  const rollAxis = new THREE.Vector3();

  function updateClock(dt) {
    if (winT > 0 || overT > 0) return;
    timeLeft = Math.max(0, timeLeft - dt);
    const s = Math.ceil(timeLeft);
    if (s !== shownTime) { shownTime = s; hud.setTime(timeLeft); if (s <= 15 && s > 0) { sfx.tick(); if (s === 15) buzz('warning'); } }
    if (timeLeft <= 0) { overT = 0.6; overWhy = 'time'; player.sled = false; }
  }

  function gameOver() {
    phase = 'over'; input.enabled = false; input.reset(); player.vx = player.vz = 0; player.sled = false; arrow.visible = false;
    sfx.lose(); buzz('error');
    const total = session.score + delivered * 100 + fishCount * 10;     // what was rescued this level still counts
    savedBest = Math.max(savedBest, total);
    hud.showOver({ why: overWhy, level: plan.level, total });
    try {
      Promise.resolve(lib.addPlayerScoreToLeaderboard(total, 3)).then(r => { if (!disposed && r?.entries) hud.setLeaderboard(r.entries, 'pr-olb'); }).catch(() => {});
    } catch (e) { /* no leaderboard here */ }
    session.level = 1; session.score = 0; saveProgress();              // the next run starts fresh; the fish wallet is kept
    log(`Game over on level ${plan.level} (${overWhy}): total ${total}`);
  }

  // ---------- win ----------
  function win() {
    phase = 'win'; input.enabled = false; input.reset(); player.vx = player.vz = 0; player.sled = false; arrow.visible = false;
    const score = finalScore(delivered, fishCount, timeLeft, hearts), stars = starsFor(hearts, fishCount, fishes.length);
    sfx.win(); buzz('success');
    session.score += score;
    hud.showWin({ level: plan.level, stars, time: timeLeft, hearts, fish: fishCount, fishTotal: fishes.length, score, total: session.score });
    hud.setLevel(plan.level, session.score);
    savedBest = Math.max(savedBest, session.score);
    session.level++; saveProgress(); session.level--;               // a returning player starts at the next level
    try {
      Promise.resolve(lib.addPlayerScoreToLeaderboard(session.score, 3)).then(r => { if (!disposed && r?.entries) hud.setLeaderboard(r.entries); }).catch(() => {});
    } catch (e) { /* no leaderboard here */ }
    log(`Level ${plan.level} complete: total ${session.score}, level score ${score}, time ${Math.round(time)}s, fish ${fishCount}`);
  }

  // ---------- edit mode: tap the snow to move the igloo ----------
  function setupEditor() {
    camera.position.set(0, 300, 175); camera.lookAt(0, 0, 6);
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let dragging = false, spot = null;
    const pick = e => {
      const r = hud.root.getBoundingClientRect();
      ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(world.ground)[0];
      if (!hit) return;
      spot = clampHome({ x: hit.point.x, z: hit.point.z });
      world.igloo.position.set(spot.x, H(spot.x, spot.z), spot.z);
    };
    hud.root.addEventListener('pointerdown', e => { dragging = true; pick(e); });
    hud.root.addEventListener('pointermove', e => { if (dragging) pick(e); });
    const up = () => {
      if (!dragging) return; dragging = false;
      if (spot && window.gameConfig) { window.gameConfig.home = { x: Math.round(spot.x), z: Math.round(spot.z) }; startGame('edit'); }
    };
    hud.root.addEventListener('pointerup', up); hud.root.addEventListener('pointercancel', up);
  }

  // ---------- loop ----------
  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (phase === 'paused') { renderer.render(scene, camera); return; }
    clock += dt;
    if (phase === 'play') {
      time += dt; updatePlayer(dt); updateClock(dt);
      if (winT > 0) { winT -= dt; if (winT <= 0) win(); }
      else if (overT > 0) { overT -= dt; if (overT <= 0) gameOver(); }
    } else if (phase !== 'edit') {
      animateMan(man, dt, { speed: phase === 'shop' ? 6 : 0, grounded: true, sled: phase === 'shop', cheer: phase === 'win' });
      if (phase === 'menu') player.yaw = lerpAngle(player.yaw, camYaw, Math.min(1, dt * 2));
    }
    placeMan(dt);
    updatePenguins(dt); updateWhirlies(dt); updateHazards(dt); updateFish(dt); updateArrow();
    sparkles.update(dt);
    world.igloo.userData.flag.rotation.y = Math.sin(clock * 3) * 0.3;
    if (phase !== 'edit') updateCamera(dt);
    updateSnow(dt);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    setBest(best) { hud.setBest(best, session.level); },
    applyStore() { hud.setBest(savedBest, session.level); hud.setWallet(store.fish); setSled(man, store.sled); },
    inMenu() { return phase === 'menu'; },
    begin() { if (phase === 'menu') begin(); },
    debug: { player, penguins, fishes, whirlies, home, layout, balls, plan, get hearts() { return hearts; }, set timeLeft(v) { timeLeft = v; }, get timeLeft() { return timeLeft; }, get phase() { return phase; }, get chain() { return chain; }, get delivered() { return delivered; } },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); clearTimeout(restartTimer);
      window.removeEventListener('resize', resize);
      input.dispose(); hud.dispose();
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove();
    },
  };
}

export function debugState() { return current?.debug; }
