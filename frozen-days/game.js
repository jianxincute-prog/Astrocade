/*
 * WINTER SKATE LIFE — Build 4: skating progression, town and NPCs, world layout v1 (organic lake, four districts, corner areas).
 * A beginner learns to skate on a frozen lake. Hold PUSH to build speed, steer, brake and ease off when you
 * wobble. Practice grows five skills (Balance, Control, Speed, Braking, Tricks), earns XP and levels, and
 * optional goals add short challenges. Progress and the chosen skater are saved between sessions.
 */
import { getCfg } from './src/config.js';
import { createWorld } from './src/world.js';
import { createCharacter, CHARACTERS, characterLabel, stepActions, startEat } from './src/character.js';
import { createSelect } from './src/select.js';
import { makeEnvironment } from './src/textures.js';
import { OUTLINE } from './src/anime.js';
import { createProgress } from './src/progress.js';
import { createNpcs, NPC_DEFS, TALK_RANGE, friendLabel, friendHearts } from './src/npc.js';
import { ZONE_LIST, HOME, lakePt } from './src/layout.js';
import { createSkater, updateSkater, respawn, SPAWN } from './src/skating.js';
import { createCameraRig } from './src/camera.js';
import { createInput } from './src/input.js';
import { createHud } from './src/hud.js';
import { createSpray } from './src/fx.js';
import { createSky } from './src/sky.js';
import { createLoading } from './src/loading.js';
import { createMenu } from './src/menu.js';
import { createIcons } from './src/icons.js';
import { createAudio } from './src/audio.js';
import { createShop } from './src/shop.js';
import { createEvents } from './src/events.js';
import { ROMANCEABLE, NEED_FRIEND, NEED_CONFESS, NEED_PROMISE, SPOTS, DATE_SPOT, TASTE, LINES, STAGE_LABEL, dateWindow } from './src/romance.js';
import { SHOPS, ITEM, SLOT_LABEL, WEAR_SLOTS, itemsFor, variantFor, isOpen, hourLabel, shopNear } from './src/shops.js';

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

function run(mode, loader) {
  if (teardown) teardown();
  const t0 = performance.now();
  const root = document.getElementById('app') || document.body;
  const touch = (hasLib() && lib.shouldUseTouchControls) ? lib.shouldUseTouchControls() : ('ontouchstart' in window);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  root.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 9 / 16, 0.5, 450);
  const world = createWorld(scene);
  const sky = createSky(scene, world);
  const spray = createSpray(scene);
  try { scene.environment = makeEnvironment(renderer); } catch (e) { /* reflections are optional */ }
  let kind = 'male', outfit = {}, player = createCharacter(kind);
  scene.add(player.root);
  function rebuildPlayer() { scene.remove(player.root); player.dispose(); player = createCharacter(kind, { outfit }); scene.add(player.root); }
  function setCharacter(k) { kind = k; rebuildPlayer(); }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), new THREE.MeshBasicMaterial({ color: 0x1a2a40, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

  const npcs = createNpcs(scene, world.heightAt, world.onIce);
  const events = createEvents(scene, world, {
    onBurst: () => audio.play('firework'),
    onChange: (k, on) => { if (!hud || phase !== 'play') return; const i = events.info[k]; if (on) audio.play('event'); hud.toast(on ? i.name + ' has begun!\n' + i.hint : i.name + ' has ended', on ? 3.8 : 2); },
    onLantern: (n, total) => {
      const fest = events.on('festival'), gain = fest ? 6 : 3;
      progress.addCoins(gain); audio.play('lantern'); hud && hud.toast(n >= total ? 'All lanterns lit!  +' + (fest ? 50 : 25) + ' coins' : 'Lantern ' + n + '/' + total + '  +' + gain + ' coins', n >= total ? 3 : 1.2);
      if (n >= total) { progress.addCoins(fest ? 50 : 25); handleUi(progress.addXp(20)); saveState(true); }
      buzz(n >= total ? 'success' : 'tick');
    },
  });
  // date marker: a soft pink beam above the destination
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 70, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff9ec8, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
  beam.visible = false; scene.add(beam);
  // story marker: a golden beam over the next place to go
  const qbeam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 90, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd66b, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
  qbeam.visible = false; scene.add(qbeam);
  const lastLand = { x: HOME.spawn.x, z: HOME.spawn.z }; let iceWarn = -99;
  const skater = createSkater();
  const rig = createCameraRig(camera);
  let talkNpc = null, curZone = null, zoneTimer = 0;
  const actCool = {}; // per NPC: clock time when its friendship activity is available again
  let act = null, date = null, dateCool = {}, sitBench = null, coSit = { id: null, t: 0 }, sitHinted = false;
  const lastTalk = {};
  let progress = createProgress(null);
  // ---- Settings (saved with the game) and audio
  const settings = { music: 0.5, sfx: 0.8, amb: 0.6, sens: 1, haptics: true };
  const audio = createAudio();
  const buzz = (p) => { if (settings.haptics && hasLib() && lib.haptics) lib.haptics.play(p); };
  function applySettings() { audio.setVolumes({ music: settings.music, sfx: settings.sfx, amb: settings.amb }); if (input) input.setLookGain(settings.sens); }
  const unlockAudio = () => { audio.unlock(); };
  window.addEventListener('pointerdown', unlockAudio); window.addEventListener('keydown', unlockAudio);
  let stepT = 0;
  const icons = createIcons(176);

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
      name: 'Winter Skate Life',
      params: {
        'Skill boost (0 = earn it)': { key: 'skill.level', type: 'slider', min: 0, max: 1, step: 0.05 },
        'Push power': { key: 'skating.pushAccel', type: 'slider', min: 3, max: 14, step: 0.5 },
        'Ice slipperiness': { key: 'skating.iceFriction', type: 'slider', min: 0.02, max: 0.5, step: 0.01 },
        'Camera distance': { key: 'camera.distance', type: 'slider', min: 5, max: 14, step: 0.5 },
        'Day length (minutes)': { key: 'world.dayMinutes', type: 'slider', min: 2, max: 30, step: 1 },
        'Weather (0 auto, 1 clear, 2 cloudy, 3 light snow, 4 heavy)': { key: 'world.weather', type: 'slider', min: 0, max: 4, step: 1 },
        'Hour (-1 = time flows)': { key: 'world.hour', type: 'slider', min: -1, max: 23, step: 1 },
      },
    });
  }


  if (loader) loader.set(0.6, 'Warming up the ice…');
  let raf = 0, last = performance.now(), clock = 0, clockT = 1;
  let input = null, hud = null, sel = null, shop = null, menu = null;
  const buff = { mul: 1, t: 0, label: '' };
  let shopView = null;
  const playing = mode !== 'edit';
  if (!playing && loader) loader.done();
  let phase = 'loading'; // loading -> select -> play (character button returns to select)
  const pv = { d: 4.4, y: 1.0, zoom: false };

  // ---- Save / load (one slot per player)
  let lastSave = 0, lastScore = 0, lastScoreAt = 0;
  function saveState(force) {
    if (phase === 'loading' || phase === 'menu') return; // nothing to save before the player has chosen to continue
    const now = performance.now();
    if (!force && now - lastSave < 10000) return;
    lastSave = now; progress.clearDirty();
    try { if (hasLib() && lib.saveUserGameState) lib.saveUserGameState(Object.assign({ character: kind, tod: sky.hour(), day: sky.day(), settings }, progress.serialize())).catch(() => {}); } catch (e) { /* save is optional */ }
  }
  // Leaderboard: players are ranked by level, then XP. One number carries both: level * 100000 + XP (XP capped at 99999).
  const LB_STEP = 100000;
  function maybeSubmitScore(force) {
    const now = performance.now(), i = progress.info(), score = i.level * LB_STEP + Math.min(LB_STEP - 1, Math.floor(i.xp));
    if (i.xp < 1 || score <= lastScore || (!force && now - lastScoreAt < 30000)) return;
    lastScore = score; lastScoreAt = now;
    try { if (hasLib() && lib.addPlayerScoreToLeaderboard) lib.addPlayerScoreToLeaderboard(score).catch(() => {}); } catch (e) { /* leaderboard is optional */ }
  }
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function leaderboardHtml(r) {
    const list = ((r && r.entries) || []).slice(0, 10);
    if (!list.length) return '<p>No scores yet. Reach a new level to be the first on the board!</p>';
    const rows = list.map((e, n) => {
      const lv = Math.floor(e.score / LB_STEP), xp = Math.round(e.score % LB_STEP), name = esc(e.username || 'Skater');
      const pic = e.profilePicture ? '<img src="' + esc(e.profilePicture) + '" alt="">' : '<i>' + esc(name.charAt(0).toUpperCase()) + '</i>';
      return '<div class="lbr' + (r.userRank === n + 1 ? ' me' : '') + '"><b>' + (n + 1) + '</b>' + pic + '<span class="nm">' + name + '</span><span class="lv">Lv ' + lv + '<small>' + xp + ' XP</small></span></div>';
    }).join('');
    return '<div class="lb">' + rows + '</div>' + (r.userRank && r.userRank > 10 ? '<p class="mine">Your rank: #' + r.userRank + '</p>' : '');
  }
  async function showLeaderboard() {
    hud.showCard({ kicker: 'LEADERBOARD', title: 'Top 10 skaters', button: 'Close', html: '<p>Loading…</p>' });
    try {
      if (!hasLib() || !lib.getTopNEntriesFromLeaderboard) throw new Error('no leaderboard');
      hud.updateCard(leaderboardHtml(await lib.getTopNEntriesFromLeaderboard(10)));
    } catch (e) { hud.updateCard('<p>The leaderboard is not available right now.</p>'); }
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
    saveState(true); maybeSubmitScore(true);
    if (!progress.introSeen()) {
      progress.markIntro();
      hud.showCard({ kicker: 'DAY 1', title: 'A new home by the frozen lake', button: "Let's go!", html: "<p>You've just moved into this little house at the quiet end of town. The big frozen lake is calling, but your old skates didn't survive the move.</p><p>You saved <span class='coin'>● " + progress.coins() + "</span> for a fresh pair. Walk north along the main street to <b>Blade &amp; Edge</b> in the Town Plaza and buy the cheapest skates.</p><p>Follow the golden beam!</p>" });
      saveState(true);
    }
  }
  function openSelect() {
    phase = 'select'; skater.vx = skater.vz = 0; skater.speed = 0;
    pv.zoom = false; sel.show(); sel.mark(kind);
  }

  if (playing) {
    input = createInput(root, renderer.domElement, { touch });
    hud = createHud(root, { touch });
    shop = createShop(root);
    hud.el.addEventListener('opensettings', () => { hud.hidePanel(); hud.showSettings(settings); });
    hud.el.addEventListener('setting', (e) => { settings[e.detail.key] = e.detail.value; applySettings(); audio.play('tap'); });
    hud.el.addEventListener('settingsclose', () => { saveState(true); });
    hud.el.addEventListener('wardrobe', () => openShop(null));
    hud.el.addEventListener('respawn', () => input.requestRespawn());
    hud.el.addEventListener('character', () => openSelect());
    hud.el.addEventListener('panel', () => hud.showPanel(progress, { zones: ZONE_LIST.length, npcs: NPC_DEFS.length, day: sky.day(), partnerName: (npcs.list.find((q) => q.id === progress.partner()) || {}).name }));
    hud.el.addEventListener('dialogchoice', (e) => { if (talkNpc) friendActivity(talkNpc, e.detail); });
    hud.el.addEventListener('dialogend', () => {
      if (talkNpc) {
        if (clock - (lastTalk[talkNpc.id] === undefined ? -999 : lastTalk[talkNpc.id]) > 40) { progress.addFriend(talkNpc.id); lastTalk[talkNpc.id] = clock; hud.toast('♥ Your friendship with ' + talkNpc.name + ' grew', 2); audio.play('heart'); }
        talkNpc = null; saveState(true);
      }
    });
    hud.el.addEventListener('skipgoal', () => { progress.skipGoal(); hud.toast('New goal!', 1.2); });
    sel = createSelect(root, {
      kinds: CHARACTERS, labels: Object.fromEntries(CHARACTERS.map((k) => [k, characterLabel(k)])), current: kind,
      onPick: (k) => setCharacter(k), onZoom: (z) => { pv.zoom = z; }, onStart: () => startPlay(),
    });
    sel.hide(); root.classList.add('selecting');
    const menuLine = () => 'Lv ' + progress.info().level + ' · Day ' + sky.day() + ' · ● ' + progress.coins();
    let hasSave = false;
    menu = createMenu(root, {
      onPlay: () => { audio.play('tap'); if (hasSave) { menu.hide(); startPlay(); } else { menu.hide(); phase = 'select'; sel.show(); sel.mark(kind); } },
      onNew: () => {
        audio.play('tap'); progress = createProgress(null); outfit = {}; rebuildPlayer(); buff.mul = 1; buff.t = 0; hud.setBuff(null);
        sky.setHour(9); sky.setDay(1); respawn(skater, HOME.spawn); lastLand.x = skater.x; lastLand.z = skater.z; hasSave = false;
        input.setSpinVisible(false); menu.hide(); phase = 'select'; sel.show(); sel.mark(kind);
      },
      onSettings: () => { audio.play('tap'); hud.showSettings(settings); },
      onBoard: () => { audio.play('tap'); showLeaderboard(); },
      onHow: () => {
        audio.play('tap');
        hud.showCard({ kicker: 'HOW TO PLAY', title: 'Your winter life', button: 'Got it', html: (touch
          ? '<p><b>Left stick</b> moves you. On the ice push it fully to stroke, ease off to glide.<br><b>PUSH</b> builds speed, <b>BRAKE</b> stops. Drag the screen to look around.</p>'
          : '<p><b>WASD / arrows</b> move (push fully to stroke on the ice), <b>Space</b> brakes. Drag the screen to look around.</p>') +
          '<p>Buy skates, learn tricks, earn coins and XP, shop for outfits, make friends and fall in love. Watch the clock: shops close and events come and go.</p>' });
      },
    });
    hud.el.addEventListener('mainmenu', () => {
      hud.hidePanel(); saveState(true); skater.vx = skater.vz = 0; skater.speed = 0; hasSave = true;
      phase = 'menu'; menu.show({ hasSave: true, line: menuLine() });
    });
    skater.x = SPAWN.x; skater.z = SPAWN.z; skater.h = SPAWN.h;
    rig.snap(skater);
    const onHide = () => { if (document.hidden) saveState(true); };
    document.addEventListener('visibilitychange', onHide);
    root._frozenOnHide = onHide;
    loadState().then((saved) => {
      progress = createProgress(saved);
      if (saved && saved.settings) for (const k of Object.keys(settings)) if (saved.settings[k] !== undefined && typeof saved.settings[k] === typeof settings[k]) settings[k] = saved.settings[k];
      applySettings();
      if (progress.story() === 'buy') { skater.x = HOME.spawn.x; skater.z = HOME.spawn.z; skater.h = HOME.spawn.h; skater.mode = 'walk'; lastLand.x = skater.x; lastLand.z = skater.z; if (!saved) sky.setHour(9); }
      outfit = progress.outfit(); rebuildPlayer();
      if (saved && typeof saved.tod === 'number') sky.setHour(saved.tod);
      if (saved && typeof saved.day === 'number') sky.setDay(saved.day);
      input.setSpinVisible(progress.spinUnlocked());
      hasSave = !!(saved && CHARACTERS.includes(saved.character));
      if (hasSave) { setCharacter(saved.character); sel.mark(saved.character); }
      if (loader) loader.set(0.9, 'Ready to skate…');
      setTimeout(() => { // keep the loading screen up long enough to read, then open the main menu
        if (loader) loader.done();
        root.classList.remove('selecting'); phase = 'menu'; menu.show({ hasSave, line: hasSave ? menuLine() : '' });
      }, Math.max(300, 2300 - (performance.now() - t0)));
    });
  }

  let px = skater.x, pz = skater.z, hasPrev = false;
  let spinWasUnlocked = false;

  function handleEvents(evs) {
    for (const ev of evs) {
      if (ev.type === 'wobble') {
        hud.toast(TIPS[ev.reason] || 'Wobbly!', 1.6); audio.play('wobble');
        buzz('warning');
      } else if (ev.type === 'fall') {
        hud.toast(FALL_MSG[ev.reason] || 'You fell!', 2.4); audio.play('fall');
        spray.burst(skater.x, skater.y + 0.2, skater.z, 28, 3 + Math.min(skater.speed, 12) * 0.3);
        world.scuff(skater.x, skater.z, 0.6);
        buzz('thud');
        saveState(false); maybeSubmitScore(false);
      } else if (ev.type === 'up') {
        hud.toast('Back on your feet!', 1.2); audio.play('up');
        buzz('tick');
      } else if (ev.type === 'stroke') {
        if (skater.speed > 1.5) { buzz({ intensity: 0.2, sharpness: 0.7 }); audio.play('stroke'); }
        const fx = Math.sin(skater.h), fz = Math.cos(skater.h), side = ev.leg === 0 ? 1 : -1;
        for (let k = 0; k < 3; k++) {
          spray.emit(skater.x - fx * 0.3 + fz * side * 0.25, 0.12, skater.z - fz * 0.3 - fx * side * 0.25,
            -fx * 1.4 + fz * side * 1.1 + (Math.random() - 0.5), 0.8 + Math.random() * 1.2, -fz * 1.4 - fx * side * 1.1 + (Math.random() - 0.5));
        }
      } else if (ev.type === 'spin') {
        hud.toast('Nice spin!', 1.2); audio.play('spin');
        buzz('success');
      } else if (ev.type === 'spinfail') {
        audio.play('err'); hud.toast(ev.reason === 'locked' ? 'Spin unlocks at Level 3' : ev.reason === 'land' ? 'Spin on the ice!' : 'Pick up some speed to spin', 1.4);
      }
    }
  }
  // ---- Shops and wardrobe
  const WEARABLE = (slot) => WEAR_SLOTS.includes(slot);
  function openShop(def) {
    audio.play('door'); // def = a SHOPS entry, or null for the wardrobe (owned items, anywhere)
    const tabs = (def ? def.tabs : WEAR_SLOTS).map((slot) => ({ label: SLOT_LABEL[slot], slot, consumable: !WEARABLE(slot), items: (WEARABLE(slot) && slot !== 'skates' ? [{ id: null, name: 'Standard', slot }] : []).concat(itemsFor(slot)) }));
    if (def) { // frame the character in front of the door, facing the camera
      const dx = 0 - def.door[0], dz = 104 - def.door[1], l = Math.hypot(dx, dz) || 1;
      shopView = { dx: dx / l, dz: dz / l }; skater.h = Math.atan2(shopView.dx, shopView.dz); skater.vx = skater.vz = 0;
    } else shopView = { dx: Math.sin(skater.h), dz: Math.cos(skater.h) };
    const setOutfit = (w) => { outfit = variantFor(w); rebuildPlayer(); };
    shop.open({
      title: def ? def.name : 'Wardrobe', sub: def ? def.line : 'Change what you wear', tabs, wardrobe: !def,
      coins: () => progress.coins(), price: (it) => progress.priceOf(it), count: (id) => progress.giftCount(id), owns: (id) => progress.owns(id), worn: (slot) => progress.worn()[slot] || null,
      icon: (it) => icons.get(it, kind),
      preview: (slot, id) => { const w = progress.worn(); if (slot) { if (id === null) delete w[slot]; else w[slot] = id; } setOutfit(w); },
      equip: (slot, id) => { progress.wear(slot, id); setOutfit(progress.worn()); saveState(true); },
      buy: (it) => { if (!progress.buy(it.id)) { audio.play('err'); return { ok: false, msg: 'Not enough coins' }; } audio.play('coin'); buzz('success'); saveState(true); return { ok: true, msg: 'Bought ' + it.name + '!' }; },
      consume: (it) => {
        if (!progress.buy(it.id)) { audio.play('err'); return { ok: false, msg: 'Not enough coins' }; } audio.play('coin');
        if (it.gift) { buzz('success'); saveState(true); return { ok: true, msg: 'Bought ' + it.name + ' (×' + progress.giftCount(it.id) + ')' }; }
        if (it.food.xp) { handleUi(progress.addXp(it.food.xp)); }
        if (it.food.comfort) { buff.mul = it.food.comfort; buff.t = it.food.secs; buff.label = it.name.split(' ').pop(); }
        startEat(skater, it.id); audio.play('eat');
        buzz('success');
        saveState(true); return { ok: true, msg: it.food.xp ? 'Yum! +' + it.food.xp + ' XP' : 'Ahh, so warm!' };
      },
      onClose: () => { shopView = null; root.classList.remove('shopping'); saveState(true); },
    });
    if (hud) hud.hideHint();
    root.classList.add('shopping');
  }
  const openHint = (s) => (s.soon ? 'Opening soon' : 'Opens ' + hourLabel(s.open[0]));
  // ---- Friendship activities, sitting on benches
  const rewardTag = (n, pts) => (pts >= 6 ? 'Close friends!' : pts >= 2 ? 'Good friends!' : 'Nice to meet you!');
  function friendActivity(n, id) {
    if (id === 'gift') { openGiftPicker(n); return; }
    if (id === 'date') { startDate(n); return; }
    if (id.startsWith('d_')) { dateChoice(n, id); return; }
    const pts = Math.max(0, progress.friendPoints(n.id));
    if (id === 'skate' || id === 'walk') {
      if (id === 'skate' && !progress.canSkate()) { hud.toast('You need skates first!', 2.2); return; }
      if (id === 'skate' && skater.mode !== 'skate') { hud.toast('Get on the ice first, then ask ' + n.name + ' again', 2.4); return; }
      act = { npc: n, name: n.name, skate: id === 'skate', t: 0, goal: id === 'skate' ? 40 : 30, range: id === 'skate' ? 11 : 7, away: 0 };
      hud.toast(id === 'skate' ? 'Skate with ' + n.name + '!\nStay close for 40 seconds' : 'Walk with ' + n.name + '!\nStay close for 30 seconds', 2.6);
    } else if (id === 'treat') {
      if (!progress.spendCoins(12)) { hud.toast('Not enough coins', 1.6); return; }
      startEat(skater, 'dr_cocoa'); startEat(n.s, 'dr_cocoa');
      progress.addFriend(n.id, 2); handleUi(progress.addXp(10)); actCool[n.id] = clock + 120;
      hud.toast('Cocoa with ' + n.name + '!  ♥♥  +10 XP', 2.6);
    } else if (id === 'browse') {
      const sh = SHOPS.find((s) => s.id === 'skate');
      if (isOpen(sh, sky.hour())) openShop(sh); else hud.toast('Blade & Edge opens at ' + hourLabel(sh.open[0]), 2.2);
    }
  }
  function finishActivity(ok) {
    const a = act; act = null; hud.setActivity(null); if (!a) return;
    actCool[a.npc.id] = clock + 150;
    if (!ok) { hud.toast('You lost track of ' + a.name, 2); return; }
    const pts = Math.max(0, progress.friendPoints(a.npc.id));
    progress.addFriend(a.npc.id, 2); progress.addCoins(20 + Math.min(10, pts)); handleUi(progress.addXp(15));
    hud.toast((a.skate ? 'Great skate with ' : 'Lovely walk with ') + a.name + '!\n♥♥  +15 XP  +' + (20 + Math.min(10, pts)) + ' coins', 3);
    buzz('success'); saveState(true);
  }
  function sitOn(b) {
    audio.play('sit');
    sitBench = b; skater.sitting = true; skater.h = b.yaw;
    // two seats per bench: take the free one if a neighbour is already sitting
    const rx = Math.cos(b.yaw), rz = -Math.sin(b.yaw), occ = npcs.list.find((q) => q.active && q.s.sitAmt > 0.5 && Math.hypot(q.s.x - b.x, q.s.z - b.z) < 1.4);
    const off = occ ? ((occ.s.x - b.x) * rx + (occ.s.z - b.z) * rz < 0 ? 0.5 : -0.5) : 0;
    skater.x = b.x + rx * off; skater.z = b.z + rz * off; skater.vx = skater.vz = 0; skater.speed = 0; skater.stroking = false; skater.strideAmp = 0; coSit = { id: null, t: 0 };
    if (!sitHinted) { sitHinted = true; hud.toast('Move the stick or tap STAND to get up', 2.4); }
  }
  function standUp() {
    if (!sitBench) return; const b = sitBench; sitBench = null; skater.sitting = false;
    skater.x = b.x + Math.sin(b.yaw) * 1.9 + Math.cos(b.yaw) * (skater.x - b.x > 0 ? 0 : 0); skater.z = b.z + Math.cos(b.yaw) * 1.9; coSit = { id: null, t: 0 };
  }
  function nearBench(x, z, r = 2.5) { let best = null, bd = r; for (const b of world.benches || []) { const d = Math.hypot(x - b.x, z - b.z); if (d < bd) { bd = d; best = b; } } return best; }
  // ---- Romance: gifts, dates, confession, promise
  function romanceChoices(n) {
    const out = [];
    if (!TASTE[n.id]) return out;
    out.push({ id: 'gift', label: 'Give a gift' });
    if (ROMANCEABLE.includes(n.id) && progress.friendPoints(n.id) >= NEED_FRIEND && (!progress.partner() || progress.partner() === n.id)) {
      const open = dateWindow(sky.hour()), cd = (dateCool[n.id] || 0) > clock;
      out.push({ id: 'date', rom: true, label: open ? 'Ask on a date ♥' : 'Date · after 16:00', off: !open || cd });
    }
    return out;
  }
  function openGiftPicker(n) {
    const gifts = itemsFor('gifts');
    if (!gifts.some((g) => g.id !== 'gf_charm' && progress.giftCount(g.id) > 0)) { hud.toast('You have no gifts yet.\nBuy some at Warm Threads or Sweet Bakery.', 2.8); return; }
    shopView = { dx: Math.sin(skater.h), dz: Math.cos(skater.h) };
    shop.open({
      title: 'Give ' + n.name + ' a gift', sub: 'One gift per day', mode: 'give', tabs: [{ label: 'Gifts', slot: 'gifts', consumable: true, items: gifts }],
      coins: () => progress.coins(), owns: () => false, worn: () => null, icon: (it) => icons.get(it, kind), preview: () => {}, equip: () => {}, count: (id) => progress.giftCount(id),
      give: (it) => giveGift(n, it), onClose: () => { shopView = null; root.classList.remove('shopping'); saveState(true); },
    });
    root.classList.add('shopping');
  }
  function giveGift(n, it) {
    const day = sky.day();
    if (progress.giftedOn(n.id) === day) return { ok: false, msg: n.name + ' already got a gift today' };
    if (!progress.useGift(it.id)) return { ok: false, msg: 'None left' };
    progress.markGift(n.id, day);
    const taste = TASTE[n.id], liked = taste.likes.includes(it.id), hate = taste.hates.includes(it.id), L = LINES[n.id] && LINES[n.id].gift;
    if (progress.friendPoints(n.id) >= 0) progress.addFriend(n.id, hate ? 0 : liked ? 2 : 1);
    let rom = 0;
    if (ROMANCEABLE.includes(n.id) && progress.friendPoints(n.id) >= NEED_FRIEND) { rom = hate ? 0 : liked ? 3 : 1; if (rom) progress.addRomance(n.id, rom); }
    const pool = L ? (hate ? L.hate : liked ? L.liked : L.ok) : ['Thank you!'];
    hud.toast(n.name + ': "' + pool[n.talks % pool.length] + '"\n' + (hate ? 'Not their taste...' : '♥ +' + (liked ? 2 : 1) + (rom ? '  ❤ +' + rom : '')), 4.2);
    buzz(hate ? 'warning' : 'success');
    return { ok: true, msg: hate ? 'Hmm, not a fan.' : liked ? 'They loved it!' : 'They liked it.' };
  }
  function startDate(n) {
    if (!dateWindow(sky.hour())) { hud.toast('Dates start at 16:00. Come back this evening.', 2.6); return; }
    const spot = SPOTS[DATE_SPOT[n.id]]; if (!spot) return;
    date = { npc: n, spot, t: 0, away: 0, d0: Math.max(10, Math.hypot(skater.x - spot.x, skater.z - spot.z)) };
    npcs.setFollow(n.id, true);
    beam.position.set(spot.x, world.heightAt(spot.x, spot.z) + 35, spot.z); beam.visible = true;
    hud.toast('Date with ' + n.name + '!\nWalk together to the ' + spot.name, 3.6);
  }
  function endDate(msg) { const d = date; date = null; beam.visible = false; if (d) { npcs.setFollow(d.npc.id, false); if (msg) hud.toast(msg, 2.4); } }
  function dateArrived(d) {
    const n = d.npc, L = LINES[n.id], stage = progress.romStage(n.id), pts = progress.romPts(n.id), partner = progress.partner();
    endDate(null);
    const choices = [{ id: 'd_view', label: 'Enjoy the view' }];
    if (stage < 2 && !partner && pts >= NEED_CONFESS) choices.push({ id: 'd_confess', rom: true, label: 'Confess ♥' });
    if (stage === 2 && partner === n.id && pts >= NEED_PROMISE && progress.giftCount('gf_charm') > 0) choices.push({ id: 'd_promise', rom: true, label: 'Give the Promise Charm' });
    talkNpc = n; dateCool[n.id] = clock + 240;
    hud.showDialog({ name: n.name, role: n.role, label: 'On a date', hearts: friendHearts(Math.max(0, progress.friendPoints(n.id))), rom: stage >= 1 ? '❤ ' + STAGE_LABEL[stage] : '', lines: L.date, choices });
  }
  function dateChoice(n, id) {
    const L = LINES[n.id];
    if (id === 'd_view') {
      const bonus = events.on('festival') || events.on('lantern') ? 2 : 0, before = progress.romStage(n.id);
      progress.addRomance(n.id, 4 + bonus); progress.addFriend(n.id, 1); handleUi(progress.addXp(15));
      hud.toast('What a lovely evening\n❤ +' + (4 + bonus) + (progress.romStage(n.id) > before ? '\n' + n.name + ' has a crush on you!' : ''), 3.4);
    } else if (id === 'd_confess') {
      progress.setStage(n.id, 2); progress.addRomance(n.id, 2); progress.addCoins(50); handleUi(progress.addXp(30));
      hud.toast('♥ You and ' + n.name + ' are now together!\n+50 coins  +30 XP', 4);
      hud.showDialog({ name: n.name, role: n.role, label: 'Dating', hearts: 3, rom: '❤ Dating', lines: L.accept, choices: [] });
    } else if (id === 'd_promise') {
      progress.useGift('gf_charm'); progress.setStage(n.id, 3); progress.addRomance(n.id, 3); progress.addCoins(100); handleUi(progress.addXp(50));
      hud.toast('❤ ' + n.name + ' is your Partner!\n+100 coins  +50 XP', 4.2);
      hud.showDialog({ name: n.name, role: n.role, label: 'Partner', hearts: 3, rom: '❤ Partner', lines: L.promise, choices: [] });
    }
    buzz('success'); saveState(true);
  }
  function startTalk(n) {
    const pts = progress.friendPoints(n.id), met = pts >= 0;
    if (!met) handleUi(progress.meet(n.id, n.name));
    const points = Math.max(0, pts);
    const lines = npcs.dialogue(n, { points, met, skills: progress.rawSkills(), spinUnlocked: progress.spinUnlocked() });
    const stage = progress.romStage(n.id), L = LINES[n.id];
    if (stage >= 2 && L && L.flirt) lines[lines.length - 1] = L.flirt[n.talks % L.flirt.length];
    if (n.id === progress.partner() && progress.claimPartnerGift(sky.day())) { progress.addCoins(25); hud.toast('♥ ' + n.name + ' left you a little gift\n+25 coins', 3); }
    const choices = npcs.choices(n, { points, coins: progress.coins(), cool: (id) => Math.max(0, (actCool[id] || 0) - clock) }).concat(romanceChoices(n));
    hud.showDialog({ name: n.name, role: n.role, label: friendLabel(points), hearts: friendHearts(points), rom: stage >= 1 ? '❤ ' + STAGE_LABEL[stage] : '', lines, choices });
    talkNpc = n;
    buzz('tap');
  }
  function handleUi(list) {
    for (const u of list) {
      if (u.type === 'met') { hud.toast('You met ' + u.name + '!  +10 XP', 2.4); continue; }
      if (u.type === 'zone') { audio.play('zone'); hud.toast('New place discovered!  +' + u.xp + ' XP', 2.4); continue; }
      if (u.type === 'level') {
        audio.play('level'); maybeSubmitScore(true); hud.toast('LEVEL UP!  Lv ' + u.level + ' · ' + u.name + (u.unlock ? '\n' + u.unlock : ''), 3);
        buzz('success');
        saveState(true);
      } else if (u.type === 'goal') {
        audio.play('goal'); hud.toast('Goal complete!  +' + u.xp + ' XP  +' + u.coins + ' coins', 2.2);
        buzz('success');
        saveState(true); maybeSubmitScore(true);
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
    c.skills = progress.skills(c.level); c.spinUnlocked = progress.spinUnlocked(); c.gear = progress.gear(); c.comfort = buff.mul;

    if (playing && phase !== 'play') {
      // Character preview: stand still, camera sways in front (or zooms to the face).
      player.pose({ ...skater, mode: 'walk', speed: 0, stride: 0, strideAmp: 0, b: 0, fallAmt: 0, steer: 0, state: 'ok', spin: null, spinAng: 0 }, clock);
      player.place({ ...skater, mode: 'walk', y: 0 });
      const k = 1 - Math.exp(-4 * dt);
      if (phase === 'menu' || phase === 'loading') { // slow cinematic sway around the skater
        const a = skater.h + Math.PI + Math.sin(clock * 0.22) * 0.9;
        camera.position.set(skater.x + Math.sin(a) * 6.6, skater.y + 1.7, skater.z + Math.cos(a) * 6.6);
        camera.lookAt(skater.x, skater.y + 1.25, skater.z);
        if (Math.abs(camera.fov - 42) > 0.05) { camera.fov += (42 - camera.fov) * k; camera.updateProjectionMatrix(); }
        input.consumeRespawn(); input.consumeLook(); input.consumeSpin();
        shadow.position.set(skater.x, 0.08, skater.z);
      } else {
      const tgtD = pv.zoom ? 1.15 : 4.4, tgtY = pv.zoom ? player.faceY - 0.075 : player.height * 0.36;
      pv.d += (tgtD - pv.d) * k; pv.y += (tgtY - pv.y) * k;
      const sw = Math.sin(clock * 0.5) * (pv.zoom ? 0.35 : 0.6);
      camera.position.set(skater.x + Math.sin(skater.h + sw) * pv.d, pv.y + (pv.zoom ? 0.02 : 0.3), skater.z + Math.cos(skater.h + sw) * pv.d);
      camera.lookAt(skater.x, pv.y, skater.z);
      const f = pv.zoom ? 30 : 40; if (Math.abs(camera.fov - f) > 0.05) { camera.fov += (f - camera.fov) * k; camera.updateProjectionMatrix(); }
      input.consumeRespawn(); input.consumeLook(); input.consumeSpin();
      shadow.position.set(skater.x, 0.08, skater.z);
      }
    } else if (playing) {
      if (input.consumeRespawn()) { respawn(skater, progress.canSkate() ? null : HOME.spawn); progress.resetRun(); rig.snap(skater); hasPrev = false; }
      const inp = input.read();
      inp.spin = input.consumeSpin();
      if (hud.panelOpen || hud.dialogOpen || shop.isOpen || hud.cardOpen) { inp.mx = 0; inp.my = 0; inp.push = 0; inp.brake = (hud.dialogOpen || shop.isOpen || hud.cardOpen) ? 1 : 0; inp.spin = false; }
      else if (inp.push > 0.1 || Math.hypot(inp.mx, inp.my) > 0.3) hud.hideHint();
      inp.mag = Math.hypot(inp.mx, inp.my);
      { const ya = rig.yaw; inp.tgtH = inp.mag > 0.01 ? Math.atan2(Math.sin(ya) * inp.my + Math.cos(ya) * inp.mx, Math.cos(ya) * inp.my - Math.sin(ya) * inp.mx) : null; }
      if (skater.sitting && (inp.mag > 0.4 || inp.push > 0)) standUp();
      const steps = Math.max(1, Math.ceil(dt / (1 / 60))), h = dt / steps;
      if (skater.sitting) { skater.vx = skater.vz = 0; skater.speed = 0; skater.mode = 'walk'; skater.events.length = 0; }
      else for (let i = 0; i < steps; i++) { inp.spin = i === 0 ? inp.spin : false; updateSkater(skater, inp, h, c, world); }
      stepActions(skater, dt);
      if (!progress.canSkate()) { // no skates yet: the lake edge is as far as you can go
        if (skater.mode === 'skate') {
          skater.x = lastLand.x; skater.z = lastLand.z; skater.vx = skater.vz = 0; skater.speed = 0; skater.mode = 'walk';
          if (clock - iceWarn > 3) { iceWarn = clock; hud.toast('You need skates to go on the ice.\nBuy a pair at Blade & Edge!', 2.8); audio.play('err'); }
        } else { lastLand.x = skater.x; lastLand.z = skater.z; }
      }
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
      rig.update(skater, dt, c, shop.isOpen ? 0 : input.consumeLook());
      if (shop.isOpen && shopView) { // side-on view of the character in the top half of the screen
        camera.position.set(skater.x + shopView.dx * 6.2, skater.y + 1.0, skater.z + shopView.dz * 6.2);
        camera.lookAt(skater.x, skater.y - 0.02, skater.z);
        if (Math.abs(camera.fov - 38) > 0.05) { camera.fov = 38; camera.updateProjectionMatrix(); }
        shop.update(dt);
      }
      audio.setMotion(skater.mode === 'skate' && !skater.sitting && skater.state === 'ok', skater.speed);
      if (skater.mode !== 'skate' && !skater.sitting && skater.speed > 1) { stepT -= dt * skater.speed / 5.6; if (stepT <= 0) { stepT = 0.36; audio.play('step'); } }
      { // story: buy skates -> wear them -> first glide
        const st = progress.story();
        if (st === 'buy' && progress.worn().skates) { progress.setStory('lake'); audio.play('goal'); hud.toast('Skates on! Now head to the lake\nand take your first glide', 3.6); saveState(true); }
        else if (st === 'lake' && skater.mode === 'skate') { progress.setStory('done'); handleUi(progress.addXp(25)); progress.addCoins(30); audio.play('level'); hud.toast('Your first glide!\n+25 XP  +30 coins', 3.4); saveState(true); }
        const s2 = progress.story();
        if (s2 === 'done') qbeam.visible = false;
        else {
          let tx, tz, txt, d0;
          if (s2 === 'buy') { const sh = SHOPS[0]; tx = sh.door[0]; tz = sh.door[1]; d0 = 230; txt = 'Buy your first skates at Blade & Edge' + (isOpen(sh, sky.hour()) ? '' : ' (opens ' + hourLabel(sh.open[0]) + ')'); }
          else { const lp = lakePt(84, -3); tx = lp[0]; tz = lp[1]; d0 = 90; txt = 'Take your first glide on the lake'; }
          const dd = Math.hypot(skater.x - tx, skater.z - tz);
          progress.setStoryHint(txt + ' · ' + Math.round(dd) + ' m', Math.max(0, Math.min(1, 1 - dd / d0)));
          qbeam.position.set(tx, world.heightAt(tx, tz) + 45, tz); qbeam.visible = !date && dd > 3; qbeam.material.opacity = 0.28 + Math.sin(clock * 3) * 0.08;
        }
      }
      hud.update(skater, dt, progress);
      hud.setCoins(progress.coins());
      npcs.pushCrumb(skater.x, skater.z);
      let actInfo = null;
      if (act) {
        const d = Math.hypot(skater.x - act.npc.s.x, skater.z - act.npc.s.z), ok = d < act.range && (!act.skate || skater.mode === 'skate');
        if (ok) { act.t += dt; act.away = 0; } else act.away += dt;
        actInfo = { text: (act.skate ? 'Skating with ' : 'Walking with ') + act.name + (ok ? '' : ' · stay close!'), frac: act.t / act.goal };
        if (act.t >= act.goal) finishActivity(true); else if (act.away > 7) finishActivity(false);
      } else if (date) {
        const dn = date.npc, pd = Math.hypot(skater.x - dn.s.x, skater.z - dn.s.z), sd = Math.hypot(skater.x - date.spot.x, skater.z - date.spot.z);
        date.away = pd > 22 ? date.away + dt : 0;
        actInfo = { text: '❤ ' + dn.name + ' · to the ' + date.spot.name + ' · ' + Math.round(sd) + ' m' + (pd > 10 ? ' · wait for ' + dn.name : ''), frac: 1 - sd / date.d0 };
        beam.material.opacity = 0.26 + Math.sin(clock * 3) * 0.08;
        if (sd < 5 && pd < 9 && !hud.dialogOpen && !shop.isOpen) dateArrived(date); else if (date.away > 10) endDate(dn.name + ' lost sight of you');
      } else if (events.on('lantern') && events.lanterns().got < events.lanterns().total) {
        const l = events.lanterns(); actInfo = { text: 'Lantern Skate ' + l.got + '/' + l.total, frac: l.got / l.total };
      }
      hud.setActivity(actInfo);
      if (skater.sitting) { // resting beside a sitting neighbour is a friendship activity too
        const mate = npcs.list.find((q) => q.active && q.s.sitAmt > 0.8 && Math.hypot(skater.x - q.s.x, skater.z - q.s.z) < 4.8);
        if (mate && clock > (actCool[mate.id] || 0)) {
          if (coSit.id !== mate.id) coSit = { id: mate.id, t: 0 };
          coSit.t += dt;
          if (coSit.t >= 14) {
            if (progress.friendPoints(mate.id) < 0) handleUi(progress.meet(mate.id, mate.name));
            progress.addFriend(mate.id, 2); handleUi(progress.addXp(12)); progress.addCoins(10); actCool[mate.id] = clock + 150; coSit = { id: null, t: 0 };
            hud.toast('You and ' + mate.name + ' enjoyed a quiet moment\n♥♥  +12 XP  +10 coins', 3.2); saveState(true);
          }
        } else coSit = { id: null, t: 0 };
      }
      if (buff.t > 0) { buff.t -= dt; if (buff.t <= 0) { buff.mul = 1; hud.setBuff(null); hud.toast(buff.label + ' wore off', 1.6); } else hud.setBuff('♨ ' + buff.label + ' ' + Math.floor(buff.t / 60) + ':' + ('0' + Math.floor(buff.t % 60)).slice(-2)); }

      // Town: discovering places and talking to neighbours.
      zoneTimer += dt;
      if (zoneTimer > 0.4) {
        zoneTimer = 0;
        const zn = world.zoneAt(skater.x, skater.z);
        if (zn && zn.id !== curZone) { curZone = zn.id; hud.banner(zn.name); handleUi(progress.discoverZone(zn.id, zn.name, zn.xp)); }
        else if (!zn) curZone = null;
      }
      const wantTalk = input.consumeTalk();
      const busy = hud.panelOpen || hud.dialogOpen || shop.isOpen, calm = skater.speed < 4.5 && skater.state === 'ok';
      const seated = skater.sitting;
      const near = !busy ? npcs.nearest(skater.x, skater.z, TALK_RANGE) : null;
      const bench = !busy && !seated && skater.mode === 'walk' ? nearBench(skater.x, skater.z, 2.2) : null, canSit = !!bench && calm;
      const canTalk = !!near && calm && !canSit;
      const door = !busy && !near && !seated ? shopNear(skater.x, skater.z) : null, canEnter = !!door && calm;
      if (canSit) { hud.setTalk('here', touch, 'Sit '); input.setTalkLabel('SIT'); }
      else if (canTalk) { hud.setTalk(near.name, touch); input.setTalkLabel('TALK'); }
      else if (canEnter) { const op = isOpen(door, sky.hour()); hud.setTalk(op ? door.name : door.name + ' · ' + openHint(door), touch, op ? 'Enter ' : ''); input.setTalkLabel('ENTER'); }
      else if (seated) { hud.setTalk('', touch, 'Stand up'); input.setTalkLabel('STAND'); }
      else hud.setTalk(null, touch);
      input.setTalkVisible(canTalk || canEnter || canSit || seated);
      if (wantTalk && canSit) sitOn(bench);
      else if (wantTalk && canTalk) startTalk(near);
      else if (wantTalk && seated) standUp();
      else if (wantTalk && canEnter) { if (isOpen(door, sky.hour())) openShop(door); else hud.toast(door.name + (door.soon ? ' is opening soon' : ' is closed.\nOpen ' + hourLabel(door.open[0]) + ' - ' + hourLabel(door.open[1])), 2.2); }
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
    sky.update(dt, camera.position, c);
    { const ss = sky.state(); audio.setWorld(ss.dark > 0.5 ? 1 : 0, /snow|storm/i.test(ss.weather) ? (/heavy|storm/i.test(ss.weather) ? 1 : 0.6) : 0.15); audio.update(); }
    if (playing && phase === 'play') { events.update(dt, sky.hour(), sky.day(), { x: skater.x, z: skater.z, onIce: skater.mode === 'skate' }); progress.setExtraDiscount(events.on('market') ? 0.15 : 0); }
    clockT += dt;
    if (hud && clockT > 0.5) {
      clockT = 0; let lab = sky.label(); const ev = events.active();
      if (ev.length && Math.floor(clock / 4) % 2 === 1) lab = lab.split('\n')[0] + '\n' + events.info[ev[Math.floor(clock / 8) % ev.length]].name;
      hud.setClock(lab);
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  teardown = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    if (root._frozenOnHide) { document.removeEventListener('visibilitychange', root._frozenOnHide); root._frozenOnHide = null; }
    if (playing) saveState(true);
    window.removeEventListener('pointerdown', unlockAudio); window.removeEventListener('keydown', unlockAudio); audio.dispose(); icons.dispose();
    if (input) input.destroy();
    if (hud) hud.destroy();
    if (sel) sel.destroy();
    if (menu) menu.destroy();
    if (loader) loader.destroy();
    if (shop) shop.destroy();
    npcs.dispose();
    player.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    teardown = null;
  };
}

// The platform boots the game by calling window.run(mode); publishing bundles game.js into an IIFE,
// so run must be assigned to window explicitly.
window.run = function (mode) {
  const root = document.getElementById('app') || document.body, loader = createLoading(root);
  loader.set(0.1, 'Preparing…');
  setTimeout(() => { try { run(mode, loader); } catch (e) { loader.destroy(); throw e; } }, 60); // let the loading screen paint before the heavy setup
};
