// Midnight Breach 3D: low-poly found-phone mystery. Explore the house, read the AFTER app,
// follow its clues, and find Rani before the phone clock (and your memory) moves on.
import { T, loadThree } from './three-loader.mjs';
import { clockDisplayAt } from './logic.mjs';
import { ARCHIVE, CLUES, CLUES_TO_OPEN_STORAGE, ENDINGS, FINALE, NPC, PHOTO_LINES } from './story.mjs';
import { BOUNDS, NPC_SPOTS } from './neighborhood.mjs';
import { buildWorld, roomAt, SPOTS } from './world.mjs';
import { makeCharacter, LOOKS } from './actors.mjs';
import { createPhone, preloadPhotos } from './phone.mjs';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const lib = () => window.lib || {};
const safe = fn => { try { return fn(); } catch (_) { return undefined; } };
const PLAYER_R = 0.32;
const SPEED = 3.6;
const QUALITY_PR = { low: 1, mid: 1.5, high: 2 };
const CLUE_ENTRIES = ARCHIVE.filter(a => a.clue);
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function cfg() { return window.gameConfig?.settings || {}; }
function midnightSeconds() { return Math.min(600, Math.max(120, Number(cfg().midnightSeconds) || 360)); }

function registerParameters() {
  if (!lib().showGameParameters) return;
  safe(() => lib().showGameParameters({
    name: 'Midnight Breach',
    params: {
      'Durasi menuju tengah malam (detik)': { key: 'settings.midnightSeconds', type: 'slider', min: 120, max: 600, step: 30 },
      'Intensitas glitch': { key: 'settings.glitchIntensity', type: 'slider', min: 1, max: 5, step: 1 },
      'Nama pemilik ponsel': { key: 'settings.ownerName', type: 'string' },
    },
  }));
}

export async function mountGame(mode) {
  window.__midnightBreachCleanup?.();
  const root = document.getElementById('app');
  if (!root) return;
  const isEditor = mode === 'edit';
  registerParameters();

  root.innerHTML = `<div class="game-root">
    <div class="gl-host" id="gl"></div>
    <div class="fear" id="fear"></div>
    <div class="hud" id="hud" hidden>
      <div class="hud-top"><div class="chip" id="hud-time">11:48 · Kamar</div><div class="chip chip-clue" id="hud-clues">✦ 0/${CLUES.length}</div></div>
      <div class="hud-goal" id="hud-goal"></div>
      <div class="hud-toast" id="hud-toast"></div>
    </div>
    <div class="controls" id="controls" hidden>
      <div class="joy" id="joy"><div class="joy-knob" id="joy-knob"></div></div>
      <button class="btn-phone" id="btn-phone" aria-label="Buka ponsel"><svg viewBox="0 0 24 24" width="34" height="34"><rect x="7" y="2.5" width="10" height="19" rx="2.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18.3" r="1" fill="currentColor"/></svg><i class="notif-dot" id="notif-dot"></i></button>
      <button class="btn-act" id="btn-act" hidden><span id="act-label">Periksa</span></button>
      <div class="key-hint" id="key-hint">WASD / panah: jalan · E: periksa · P: ponsel</div>
    </div>
    <div class="dialog" id="dialog" hidden></div>
    <div class="screen-layer menu" id="menu" hidden></div>
    <div class="screen-layer panel-layer" id="panel" hidden></div>
    <div class="screen-layer ending" id="ending" hidden></div>
    <div class="screen-layer loading" id="loading"><div class="load-logo">A<span>✦</span></div><h1>MIDNIGHT BREACH</h1><div class="load-bar"><i id="load-fill"></i></div><div class="load-tip" id="load-tip">Memuat dunia 3D…</div></div>
    <div id="phone-host"></div>
  </div>`;
  const $ = id => root.querySelector('#' + id);
  const setProgress = (p, tip) => { $('load-fill').style.width = `${Math.round(p * 100)}%`; if (tip) $('load-tip').textContent = tip; };

  // ---------------- Load Three.js ----------------
  setProgress(0.08, 'Memuat Three.js r186…');
  try {
    await loadThree();
  } catch (err) {
    $('load-tip').innerHTML = `Gagal memuat mesin 3D.<br><button class="big-btn" id="retry">COBA LAGI</button>`;
    $('retry').onclick = () => mountGame(mode);
    safe(() => lib().log?.('Three load failed: ' + (err?.message || err)));
    return;
  }
  setProgress(0.45, 'Membangun rumah…');
  await new Promise(r => setTimeout(r, 0));

  // ---------------- Scene ----------------
  const glHost = $('gl');
  const width = () => glHost.clientWidth || 720;
  const height = () => glHost.clientHeight || 1280;
  const renderer = new T.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
  glHost.appendChild(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color(0x070a18);
  scene.fog = new T.Fog(0x070a18, 22, 62);
  const camera = new T.PerspectiveCamera(48, width() / height(), 0.1, 160);
  const world = buildWorld();
  scene.add(world.group);
  const player = makeCharacter(LOOKS.player);
  scene.add(player);
  const rani = makeCharacter(LOOKS.rani);
  rani.position.set(SPOTS.rani.x, 0, SPOTS.rani.z);
  rani.visible = false;
  scene.add(rani);
  const npcs = {
    wati: makeCharacter(LOOKS.wati),
    darto: makeCharacter(LOOKS.darto),
  };
  for (const id in npcs) {
    npcs[id].position.set(NPC_SPOTS[id].x, 0, NPC_SPOTS[id].z);
    npcs[id].rotation.y = NPC_SPOTS[id].face;
    scene.add(npcs[id]);
  }

  // ---------------- State ----------------
  const state = {
    phase: 'loading', // loading | menu | play | ending | edit
    elapsed: 0, // play-time seconds (pauses with phone/dialog)
    read: new Set(),
    found: new Set(),
    storageOpen: false,
    midnightShown: false,
    quality: 'auto',
    autoTier: 'mid',
    best: null,
    endings: [],
    mood: 0,
    px: SPOTS.start.x, pz: SPOTS.start.z, facing: 0, speed: 0,
    dialog: null,
    phoneOpen: false,
    hadSave: false,
    savedProgress: null,
    doorTimer: 25, noticed: 0, lastBeat: -9,
  };
  const keys = new Set();
  const joy = { x: 0, y: 0, id: null };
  let raf = 0, lastT = 0, simTime = 0, frameCount = 0, frameSum = 0, saveTimer = 0, toastTimer = 0;
  let nearest = null;

  const tier = () => (state.quality === 'auto' ? state.autoTier : state.quality);
  function applyQuality() {
    const pr = Math.min(window.devicePixelRatio || 1, QUALITY_PR[tier()] || 1.5);
    renderer.setPixelRatio(pr);
    renderer.setSize(width(), height(), false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = width() / height();
    camera.updateProjectionMatrix();
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(applyQuality) : null;
  ro?.observe(glHost);
  applyQuality();

  // ---------------- Persistence ----------------
  function snapshot() {
    return { v: 2, quality: state.quality, best: state.best, endings: state.endings,
      progress: { read: [...state.read], found: [...state.found], elapsed: Math.round(state.elapsed), storageOpen: state.storageOpen } };
  }
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { safe(() => lib().saveUserGameState?.(snapshot())?.catch?.(() => {})); }, 600);
  }
  async function loadSaved() {
    try {
      const res = await lib().getUserGameState?.();
      const s = res?.state;
      if (!s) return;
      state.quality = ['auto', 'low', 'mid', 'high'].includes(s.quality) ? s.quality : 'auto';
      state.best = typeof s.best === 'number' ? s.best : null;
      state.endings = Array.isArray(s.endings) ? s.endings : [];
      const p = s.progress;
      if (p && (p.found?.length || p.read?.length)) { state.hadSave = true; state.savedProgress = p; }
    } catch (_) { /* no save yet */ }
  }

  // ---------------- Phone ----------------
  const clock = () => {
    const c = clockDisplayAt(state.elapsed * 1000, midnightSeconds());
    return { ...c, secondsLeft: Math.max(0, Math.ceil(midnightSeconds() - state.elapsed)) };
  };
  const haptic = name => safe(() => lib().haptics?.play?.(name));
  const phone = createPhone($('phone-host'), {
    getClock: clock,
    isRead: id => state.read.has(id),
    markRead(id) {
      if (state.read.has(id)) return;
      state.read.add(id);
      const entry = ARCHIVE.find(a => a.id === id);
      if (entry?.clue) {
        hudToast(`Petunjuk baru: ${CLUES.find(c => c.id === entry.clue).place}`);
        haptic('success');
      }
      syncWorldHints();
      saveSoon();
    },
    isFound: id => state.found.has(id),
    foundClues: () => CLUES.filter(c => state.found.has(c.id)),
    ownerName: () => cfg().ownerName || 'Pemilik perangkat',
    hasNewAfter: () => CLUE_ENTRIES.some(e => !state.read.has(e.id)),
    onClose: () => closePhone(),
    haptic,
  });
  function openPhone(opts) {
    if (state.phase !== 'play' || state.dialog) return;
    state.phoneOpen = true;
    phone.open(opts);
    joy.x = joy.y = 0; joy.id = null; $('joy-knob').style.transform = '';
    keys.clear();
  }
  function closePhone() {
    state.phoneOpen = false;
    phone.close();
    updateHud(true);
  }

  // ---------------- HUD ----------------
  function hudToast(text) {
    const el = $('hud-toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function goalText() {
    if (state.storageOpen) return 'Temui Rani di gudang';
    if (state.found.size >= CLUES_TO_OPEN_STORAGE) return 'Coba pintu gudang';
    const hinted = CLUES.find(c => state.read.has(c.from) && !state.found.has(c.id));
    if (hinted) return `Cari: ${hinted.place}`;
    if (!CLUE_ENTRIES.some(e => state.read.has(e.id))) return 'Buka ponsel › AFTER';
    return 'Baca berkas AFTER lain';
  }
  let lastHud = '';
  function updateHud(force) {
    const c = clock();
    const text = `${c.display} · ${roomAt(state.px, state.pz)}`;
    const unread = CLUE_ENTRIES.some(e => !state.read.has(e.id));
    const key = `${text}|${state.found.size}|${goalText()}|${unread}`;
    if (!force && key === lastHud) return;
    lastHud = key;
    $('hud-time').textContent = text;
    $('hud-clues').textContent = `✦ ${state.found.size}/${CLUES.length}`;
    $('hud-goal').textContent = goalText();
    $('notif-dot').style.display = unread ? 'block' : 'none';
  }
  function syncWorldHints() {
    for (const clue of CLUES) world.beacons[clue.id].visible = state.read.has(clue.from) && !state.found.has(clue.id);
    updateHud(true);
  }

  // ---------------- Dialog ----------------
  function say(lines, done) {
    state.dialog = { lines: [...lines], i: 0, done, choices: null };
    renderDialog();
  }
  function renderDialog() {
    const d = state.dialog, el = $('dialog');
    if (!d) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    if (d.choices) {
      const last = d.lines[d.lines.length - 1];
      el.innerHTML = `<div class="dlg-card"><div class="dlg-who">${esc(last.who)}</div><p>${esc(last.text)}</p><div class="dlg-choices">${d.choices.map(c => `<button class="big-btn ${c.tone || ''}" data-choice="${c.id}">${esc(c.label)}</button>`).join('')}</div></div>`;
      return;
    }
    const line = d.lines[d.i];
    el.innerHTML = `<button class="dlg-card" data-next="1"><div class="dlg-who">${esc(line.who || '')}</div><p>${esc(line.text)}</p><span class="dlg-next">Lanjut ›</span></button>`;
  }
  function advanceDialog() {
    const d = state.dialog;
    if (!d || d.choices) return;
    if (d.i < d.lines.length - 1) { d.i++; renderDialog(); haptic('tick'); return; }
    state.dialog = null;
    renderDialog();
    d.done?.();
  }
  $('dialog').addEventListener('click', e => {
    const choice = e.target.closest('[data-choice]');
    if (choice && state.dialog?.choices) {
      const c = state.dialog.choices.find(x => x.id === choice.dataset.choice);
      state.dialog = null; renderDialog(); c?.run();
      return;
    }
    if (e.target.closest('[data-next]')) advanceDialog();
  });

  // ---------------- Interactables ----------------
  function discover(clue) {
    state.found.add(clue.id);
    world.beacons[clue.id].visible = false;
    haptic('success');
    syncWorldHints();
    saveSoon();
    say([{ who: clue.title, text: clue.text }], () => {
      if (state.found.size === CLUES_TO_OPEN_STORAGE) hudToast('Dari gudang terdengar tiga ketukan…');
    });
  }
  const interactables = [
    ...CLUES.map(clue => ({
      id: clue.id, x: SPOTS[clue.id].x, z: SPOTS[clue.id].z, r: 1.5, label: SPOTS[clue.id].label,
      use() {
        if (state.found.has(clue.id)) return say([{ who: clue.title, text: clue.text }]);
        if (!state.read.has(clue.from)) return say([{ who: SPOTS[clue.id].label, text: 'Tidak ada yang aneh di sini. Mungkin ada petunjuk di AFTER.' }]);
        discover(clue);
      },
    })),
    ...Object.keys(NPC).map(id => ({
      id: 'npc-' + id, x: NPC_SPOTS[id].x, z: NPC_SPOTS[id].z, r: 1.9, label: NPC[id].label,
      use() {
        const n = NPC[id];
        say(state.found.has(n.afterClue) ? n.afterLines : n.lines);
      },
    })),
    ...world.doors.doors.map(d => ({
      id: 'door-' + d.id, x: d.x, z: d.z, r: 1.5, label: d.label,
      labelFn: () => (d.open ? 'Tutup pintu' : 'Buka pintu'),
      available: () => !d.locked,
      use() {
        const res = world.doors.toggle(d, state.px, state.pz);
        if (res === 'blocked') { haptic('error'); hudToast('Ada yang menghalangi pintu.'); }
        else haptic('tap');
      },
    })),
    ...world.watchers.frames.map(f => ({
      id: 'photo-' + f.i,
      x: f.spot.x + Math.sin(f.spot.rotY) * 0.9, z: f.spot.z + Math.cos(f.spot.rotY) * 0.9, r: 1.1, label: 'Foto di dinding',
      use() { haptic('warning'); say([{ who: 'Foto', text: PHOTO_LINES[f.stage] }]); },
    })),
    {
      id: 'gudang', x: SPOTS.gudangDoor.x, z: SPOTS.gudangDoor.z, r: 1.7, label: 'Pintu gudang',
      available: () => !state.storageOpen,
      use() {
        if (state.found.size < CLUES_TO_OPEN_STORAGE) {
          haptic('error');
          return say([{ who: 'Pintu gudang', text: `Terkunci. Aku belum cukup tahu. (${state.found.size}/${CLUES_TO_OPEN_STORAGE} catatan)` }]);
        }
        state.storageOpen = true;
        world.openStorageDoor();
        rani.visible = true;
        haptic('warning');
        saveSoon();
        say([{ who: 'Pintu gudang', text: 'Tiga ketukan. Pintunya terbuka sendiri.' }], () => updateHud(true));
      },
    },
    {
      id: 'rani', x: SPOTS.rani.x, z: SPOTS.rani.z, r: 1.8, label: 'Bicara pada Rani',
      available: () => state.storageOpen,
      use() { runFinale(); },
    },
  ];
  function updateNearest() {
    let best = null, bestD = Infinity;
    for (const it of interactables) {
      if (it.available && !it.available()) continue;
      const d = Math.hypot(it.x - state.px, it.z - state.pz);
      if (d < it.r && d < bestD) { best = it; bestD = d; }
    }
    const show = !!best && !state.dialog && !state.phoneOpen;
    if (best !== nearest || $('btn-act').hidden === show) {
      nearest = best;
      $('btn-act').hidden = !show;
    }
    if (best) {
      const text = best.labelFn ? best.labelFn() : best.label;
      const el = $('act-label');
      if (el.textContent !== text) el.textContent = text;
    }
  }
  function interact() {
    if (state.phase !== 'play' || state.phoneOpen) return;
    if (state.dialog) { advanceDialog(); return; }
    if (nearest) { haptic('tap'); nearest.use(); }
  }

  // ---------------- Finale & endings ----------------
  function runFinale() {
    const lines = FINALE;
    state.dialog = { lines: lines.slice(0, -1), i: 0, choices: null, done: () => {
      state.dialog = { lines: [lines[lines.length - 1]], i: 0, choices: [
        { id: 'delete', label: 'HAPUS AFTER', tone: 'tone-a', run: () => finish('delete') },
        { id: 'keep', label: 'SIMPAN AFTER', tone: 'tone-b', run: () => finish('keep') },
      ] };
      renderDialog();
    } };
    renderDialog();
  }
  function finish(choice) {
    state.phase = 'ending';
    const seconds = Math.max(1, Math.round(state.elapsed));
    if (state.best === null || seconds < state.best) state.best = seconds;
    if (!state.endings.includes(choice)) state.endings.push(choice);
    state.savedProgress = null; state.hadSave = false;
    safe(() => lib().saveUserGameState?.({ v: 2, quality: state.quality, best: state.best, endings: state.endings, progress: null })?.catch?.(() => {}));
    safe(() => lib().addPlayerScoreToLeaderboard?.(seconds)?.catch?.(() => {}));
    haptic('success');
    $('hud').hidden = true; $('controls').hidden = true;
    const e = ENDINGS[choice];
    const el = $('ending');
    el.hidden = false;
    el.innerHTML = `<div class="end-card"><span class="end-kicker">AKHIR ${state.endings.length}/2</span><h2>${esc(e.title)}</h2><p>${esc(e.text)}</p><div class="end-stats"><div><small>WAKTU</small><b>${fmt(seconds)}</b></div><div><small>TERBAIK</small><b>${fmt(state.best)}</b></div></div><button class="big-btn" id="again">MAIN LAGI</button><button class="ghost-btn" id="to-menu">MENU</button></div>`;
    $('again').onclick = () => { el.hidden = true; startNew(); };
    $('to-menu').onclick = () => { el.hidden = true; showMenu(); };
  }

  // ---------------- Menu / panels ----------------
  function resetWorld() {
    state.elapsed = 0; state.read = new Set(); state.found = new Set(); state.storageOpen = false;
    state.midnightShown = false; state.mood = 0;
    state.px = SPOTS.start.x; state.pz = SPOTS.start.z; state.facing = 0;
    state.dialog = null; renderDialog();
    world.doors.resetAll(); world.closeStorageDoor(); rani.visible = false;
    world.watchers.reset(); state.doorTimer = 25; state.noticed = 0; state.lastBeat = -9;
    syncWorldHints();
  }
  function startNew() { resetWorld(); beginPlay(); }
  function resume() {
    resetWorld();
    const p = state.savedProgress || {};
    state.read = new Set(p.read || []); state.found = new Set(p.found || []); state.elapsed = Number(p.elapsed) || 0;
    if (p.storageOpen) { state.storageOpen = true; world.openStorageDoor(); rani.visible = true; }
    state.midnightShown = clock().isMidnight;
    syncWorldHints();
    beginPlay();
  }
  function beginPlay() {
    state.phase = 'play';
    $('menu').hidden = true; $('panel').hidden = true;
    $('hud').hidden = false; $('controls').hidden = false;
    const touch = safe(() => lib().shouldUseTouchControls?.()) ?? ('ontouchstart' in window);
    $('joy').style.display = touch ? 'block' : 'none';
    $('key-hint').style.display = touch ? 'none' : 'block';
    updateHud(true);
    if (state.elapsed < 1) say([
      { who: '23:48', text: 'Rani tidak membalas sejak sore. Ada aplikasi baru di ponselku: AFTER.' },
      { who: '23:48', text: 'Pintu-pintu di rumah ini bisa dibuka dan ditutup. Foto-foto di dinding itu… sejak kapan ada di sana?' },
    ]);
  }
  function showMenu() {
    state.phase = 'menu';
    $('hud').hidden = true; $('controls').hidden = true; $('btn-act').hidden = true;
    const best = state.best ? `Terbaik ${fmt(state.best)}` : '';
    const el = $('menu');
    el.hidden = false;
    el.innerHTML = `<div class="menu-top"><div class="load-logo">A<span>✦</span></div><h1>MIDNIGHT<br>BREACH</h1><div class="menu-best">${esc(best)}</div></div>
      <div class="menu-bottom">${state.hadSave ? '<button class="big-btn" id="m-resume">LANJUT</button><button class="ghost-btn" id="m-new">MAIN BARU</button>' : '<button class="big-btn" id="m-play">MAIN</button>'}
      <div class="icon-row"><button class="icon-btn" id="m-settings" aria-label="Pengaturan">⚙</button><button class="icon-btn" id="m-help" aria-label="Bantuan">?</button></div></div>`;
    if (state.hadSave) { $('m-resume').onclick = resume; $('m-new').onclick = startNew; } else $('m-play').onclick = startNew;
    $('m-settings').onclick = showSettings; $('m-help').onclick = showHelp;
  }
  function showPanel(html) {
    const el = $('panel'); el.hidden = false;
    el.innerHTML = `<div class="panel-card">${html}<button class="ghost-btn" id="p-close">TUTUP</button></div>`;
    $('p-close').onclick = () => { el.hidden = true; };
  }
  function showSettings() {
    const names = { auto: 'Auto', low: 'Low', mid: 'Med', high: 'High' };
    showPanel(`<h3>Kualitas grafis</h3><div class="q-row">${Object.keys(names).map(o => `<button class="q-btn ${state.quality === o ? 'sel' : ''}" data-q="${o}">${names[o]}</button>`).join('')}</div><small class="q-note">Auto saat ini: ${names[state.autoTier]}</small>`);
    $('panel').querySelectorAll('[data-q]').forEach(b => { b.onclick = () => { state.quality = b.dataset.q; applyQuality(); saveSoon(); showSettings(); }; });
  }
  function showHelp() {
    showPanel(`<h3>Cara main</h3><p class="help">Jelajahi rumah. Buka ponsel › AFTER dan baca berkasnya: tiap rahasia teman, keluarga, dan tetangga membuka satu petunjuk. Temukan ${CLUES_TO_OPEN_STORAGE} catatan untuk membuka gudang.</p><p class="help">Sentuh: geser joystick, ketuk tombol periksa. PC: WASD / panah, E atau Spasi, P untuk ponsel.</p>`);
  }

  // ---------------- Input ----------------
  const joyEl = $('joy'), knob = $('joy-knob');
  const joyUpdate = e => {
    const r = joyEl.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    joy.x = Math.abs(dx) < 0.12 ? 0 : dx; joy.y = Math.abs(dy) < 0.12 ? 0 : dy;
    knob.style.transform = `translate(${dx * 52}px, ${dy * 52}px)`;
  };
  joyEl.addEventListener('pointerdown', e => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyUpdate(e); });
  joyEl.addEventListener('pointermove', e => { if (joy.id === e.pointerId) joyUpdate(e); });
  const joyEnd = e => { if (joy.id === e.pointerId) { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
  joyEl.addEventListener('pointerup', joyEnd);
  joyEl.addEventListener('pointercancel', joyEnd);
  $('btn-act').addEventListener('click', interact);
  $('btn-phone').addEventListener('click', () => openPhone());
  const onKeyDown = e => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (state.phoneOpen) { if (k === 'escape' || k === 'p') { if (!phone.closeViewer()) closePhone(); } return; }
    if (state.phase !== 'play') return;
    if (k === 'e' || k === ' ' || k === 'enter') interact();
    else if (k === 'p' || k === 'tab') { e.preventDefault(); openPhone(); }
    else keys.add(k);
  };
  const onKeyUp = e => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // ---------------- Simulation ----------------
  const hit = (x, z) => {
    for (const c of world.colliders) if (c.enabled && x + PLAYER_R > c.x1 && x - PLAYER_R < c.x2 && z + PLAYER_R > c.z1 && z - PLAYER_R < c.z2) return true;
    return false;
  };
  function movePlayer(dt) {
    let ix = joy.x, iz = joy.y;
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
    if (keys.has('d') || keys.has('arrowright')) ix += 1;
    if (keys.has('w') || keys.has('arrowup')) iz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) iz += 1;
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    state.speed = Math.min(1, len);
    if (len < 0.05) return;
    const nx = state.px + ix * SPEED * dt, nz = state.pz + iz * SPEED * dt;
    if (!hit(nx, state.pz) && nx > BOUNDS.x1 && nx < BOUNDS.x2) state.px = nx;
    if (!hit(state.px, nz) && nz > BOUNDS.z1 && nz < BOUNDS.z2) state.pz = nz;
    state.facing = Math.atan2(ix, iz);
  }
  function checkMidnight() {
    if (state.midnightShown || !clock().isMidnight) return;
    state.midnightShown = true;
    haptic('warning');
    openPhone({ event: true });
  }
  const camWant = new T.Vector3(), lookWant = new T.Vector3(), lookCur = new T.Vector3(0, 0.3, 0);
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.11, (now - (lastT || now)) / 1000);
    lastT = now;
    simTime += dt;
    // auto quality probe: average frame time over the first 150 frames after loading
    if (frameCount < 150) {
      frameCount++; frameSum += dt;
      if (frameCount === 150) {
        const avg = frameSum / frameCount;
        state.autoTier = avg > 0.034 ? 'low' : avg > 0.022 ? 'mid' : 'high';
        if (state.quality === 'auto') applyQuality();
      }
    }
    world.update(dt, state.px, state.pz);
    const playing = state.phase === 'play';
    const active = playing && !state.phoneOpen && !state.dialog;
    state.speed = 0;
    if (active) {
      state.elapsed += dt;
      movePlayer(dt);
      checkMidnight();
    }
    const targetMood = clock().isMidnight && (playing || state.phase === 'ending') ? 1 : 0;
    state.mood += (targetMood - state.mood) * Math.min(1, dt * 1.5);
    world.setMood(state.mood, simTime);
    const sky = state.mood > 0.5 ? 0x14081f : 0x070a18;
    scene.fog.color.setHex(sky);
    scene.background.setHex(sky);

    player.position.set(state.px, 0, state.pz);
    const turn = ((state.facing - player.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    player.rotation.y += turn * Math.min(1, dt * 14);
    player.userData.walk(simTime, state.speed);
    world.lamp.position.set(state.px, 2.2, state.pz + 0.6);
    for (const id in world.beacons) {
      const b = world.beacons[id];
      if (b.visible) { b.position.y = 1.9 + Math.sin(simTime * 3) * 0.12; b.rotation.y = simTime * 1.5; }
    }
    const wrap = a => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const dlg = state.dialog;
    const speaker = dlg ? (dlg.choices ? dlg.lines[dlg.lines.length - 1] : dlg.lines[dlg.i])?.who : null;
    for (const id in npcs) {
      const n = npcs[id], sp = NPC_SPOTS[id];
      const dist = Math.hypot(state.px - sp.x, state.pz - sp.z);
      const toPlayer = Math.atan2(state.px - sp.x, state.pz - sp.z);
      const want = dist < 6 ? toPlayer : sp.face;
      n.rotation.y += wrap(want - n.rotation.y) * Math.min(1, dt * 5);
      n.userData.look(dist < 10 ? wrap(toPlayer - n.rotation.y) : 0);
      n.userData.setTalking(speaker === NPC[id].label);
      n.userData.walk(simTime, 0);
    }
    if (rani.visible) {
      rani.position.y = Math.sin(simTime * 1.6) * 0.06;
      rani.rotation.y = Math.atan2(state.px - rani.position.x, state.pz - rani.position.z);
      rani.userData.look(0);
      rani.userData.setTalking(speaker === 'Rani');
      rani.userData.walk(simTime, 0);
    }

    // horror: photos watch from every corner, doors open by themselves after midnight
    {
      const room = roomAt(state.px, state.pz);
      const cap = Math.min(4, 1 + state.found.size + (clock().isMidnight ? 1 : 0));
      const w = world.watchers.update(dt, state.px, state.pz, room, cap, state.mood > 0.5, simTime);
      const fearEl = $('fear');
      const fear = playing && !state.phoneOpen ? w.fear : 0;
      fearEl.style.opacity = Math.min(0.75, fear * 0.2).toFixed(2);
      fearEl.classList.toggle('beat', fear >= 1.2);
      if (active) {
        if (w.newlyNoticed && state.noticed < 3) { state.noticed++; haptic('warning'); hudToast(state.noticed === 1 ? 'Foto di dinding itu… matanya mengikutimu.' : 'Mereka semua menatapmu.'); }
        if (fear >= 1.2 && simTime - state.lastBeat > 2.3) {
          state.lastBeat = simTime;
          safe(() => lib().haptics?.play?.([{ intensity: 0.55, sharpness: 0.2, duration: 70 }, { delay: 140, intensity: 0.85, sharpness: 0.2, duration: 90 }]));
        }
        if (state.mood > 0.5) {
          state.doorTimer -= dt;
          if (state.doorTimer <= 0) {
            state.doorTimer = 18 + Math.random() * 18;
            const far = world.doors.doors.filter(d => !d.open && !d.locked && Math.hypot(d.x - state.px, d.z - state.pz) > 4);
            if (far.length) { world.doors.setOpen(far[Math.floor(Math.random() * far.length)], true); haptic('thud'); }
          }
        }
      }
    }
    if (playing || state.phase === 'ending') {
      // Cinematic close-up on whoever is talking (Rani or a neighbour), otherwise the follow camera.
      let talker = playing ? (speaker === 'Rani' && rani.visible ? rani : speaker === 'Bu Wati' ? npcs.wati : speaker === 'Pak Darto' ? npcs.darto : null) : null;
      if (talker) {
        // pick a free spot beside the line of sight (so the player never blocks the face)
        const ry = talker.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry), rx = fz, rz = -fx;
        const tx = talker.position.x, tz = talker.position.z;
        // choose the free spot whose line of sight to the face stays farthest from the player
        let spot = null, bestClear = -1;
        const segDist = (px, pz, ax, az, bx, bz) => {
          const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
          return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
        };
        for (const [fa, ra] of [[1.9, 1.9], [1.9, -1.9], [2.7, 1.3], [2.7, -1.3], [3.3, 0.5], [3.3, -0.5]]) {
          const cx = tx + fx * fa + rx * ra, cz = tz + fz * fa + rz * ra;
          if (hit(cx, cz)) continue;
          const clear = segDist(state.px, state.pz, cx, cz, tx, tz);
          if (clear > bestClear) { bestClear = clear; spot = [cx, cz]; }
        }
        if (spot) { camWant.set(spot[0], 1.8, spot[1]); lookWant.set(tx, 1.32 + talker.position.y, tz); } else talker = null;
      }
      if (!talker) {
        camWant.set(state.px, 11.2, state.pz + 8.0);
        lookWant.set(state.px, 0.3, state.pz - 0.4);
      }
      const k = 1 - Math.exp(-(talker ? 4 : 5) * dt);
      camera.position.lerp(camWant, k);
      lookCur.lerp(lookWant, k);
      camera.lookAt(lookCur);
    } else {
      const a = simTime * 0.1;
      camera.position.set(Math.sin(a) * 34, 26, 8 + Math.cos(a) * 34);
      camera.lookAt(2, 0, 8);
    }
    if (window.__camHold) { camera.position.set(...window.__camHold.pos); camera.lookAt(...window.__camHold.look); }
    if (playing) {
      updateNearest();
      if (Math.floor(simTime * 4) !== Math.floor((simTime - dt) * 4)) { updateHud(); phone.tick(); }
    }
    renderer.render(scene, camera);
  }

  window.__midnightBreachCleanup = () => {
    cancelAnimationFrame(raf);
    clearTimeout(saveTimer); clearTimeout(toastTimer);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    ro?.disconnect();
    renderer.dispose();
  };

  // Debug hook so automated checks can drive the game deterministically.
  window.__mb = { chars: { player, rani, ...npcs }, state, interactables, doors: world.doors, watchers: world.watchers, openPhone, closePhone, interact, say, advanceDialog, clock, world, camera, scene, SPOTS };

  // ---------------- Boot ----------------
  setProgress(0.8, 'Menyiapkan ponsel…');
  preloadPhotos();
  await loadSaved();
  syncWorldHints();
  applyQuality();
  setProgress(1, 'Siap');
  raf = requestAnimationFrame(frame);
  await new Promise(r => setTimeout(r, 250));
  $('loading').hidden = true;
  if (isEditor) { state.phase = 'edit'; return; }
  showMenu();
}
