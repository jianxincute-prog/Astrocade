/*
 * DELUGE DRIFTER — 3D flood survival.
 * Concept: the whole 500x500 world is drowned. You wake on the roof of a skyscraper in the middle of a sunken city.
 * Before play you draw a random talent (Magic Angler / Master Diver / Iron Fists), scavenge floating debris, dive for
 * caches, craft a raft, and sail to far islands to collect 3 Beacon Parts and call for rescue.
 * What makes it different: one shared "talent" changes how you play water, loot and combat; day cycle limits daily casts.
 * Modules: src/util (i18n, state), src/world (map, props), src/ui (HUD + menus), src/audio (procedural sound).
 */
import { clamp, lerp, mulberry32, cfg, tune, t, itemName, itemIcon, setLang, getLang, freshState, mergeState, STACK_MAX, BAG_SLOTS, slotsUsed } from './src/util.js';
import { createWorld, props, waveAt, waveAmp, WORLD, HALF, SEABED, QUALITY } from './src/world.js';
import { createUI } from './src/ui.js';
import { initAudio, setMuted, setUnderwater, sfx } from './src/audio.js';

const THREE = window.THREE;
const PR = 0.45, PH = 1.7, EYE = 1.55, RAFT_TOP = 0.5, RAFT_R = 3.4, DOCK = { x: 24, z: 0 };
const hap = (e) => { try { window.lib.haptics.play(e); } catch (_) {} };
const log = (m) => { try { window.lib.log(m); } catch (_) {} };

let W, UI, S, mode, phase = 'loading', last = 0, fpsAcc = 0, fpsN = 0, autoTier = null, saveT = 0, subT = 0, hudT = 0;
const P = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, grounded: false, onRaft: false, swim: false, under: false, hp: 100, o2: 20, o2max: 20, hunger: 100, thirst: 100, punchCd: 0, hurt: 0, invuln: 0, helm: false, black: 0, depth: 0, bob: 0 };
const R = { x: DOCK.x, z: DOCK.z, yaw: 0, speed: 0, warn: 0 };
let ents = [], puffers = [], parts = [], orbs = [], fishing = null, bobber = null, view = null, fist = null, rodMesh = null, wantToastLoot = {}, lootT = 0;
let ctxPanel = null;
const rngDebris = mulberry32(4242);

const talent = () => S && S.talent;
const isDiver = () => talent() === 'diver', isBoxer = () => talent() === 'boxer', isAngler = () => talent() === 'fishing';
const tick = () => new Promise(r => setTimeout(r, 0));
const setBar = (p) => { const b = document.getElementById('loadbar'); if (b) b.style.width = Math.round(p * 100) + '%'; };

// ================= save / score =================
function saveNow() {
  if (!S || phase === 'loading') return;
  try {
    S.pos = { x: +P.x.toFixed(1), y: +P.y.toFixed(1), z: +P.z.toFixed(1), yaw: +P.yaw.toFixed(2) };
    S.raftPos = { x: +R.x.toFixed(1), z: +R.z.toFixed(1), yaw: +R.yaw.toFixed(2) };
    if (S.taken.length > 400) S.taken = S.taken.slice(-400);
    window.lib.saveUserGameState(S).catch(() => {});
  } catch (_) {}
}
function addScore(v) { S.score += v; if (S.score > S.best) S.best = S.score; }
function submitScore() {
  try { window.lib.addPlayerScoreToLeaderboard(Math.floor(S.score + (S.day - 1) * 50)).catch(() => {}); } catch (_) {}
}

// ================= entities =================
const LOOT = {
  plank: () => [['wood', 2 + (Math.random() * 3 | 0)], ...(Math.random() < 0.3 ? [['rope', 1]] : [])],
  barrel: () => [['barrel', 1], ...(Math.random() < 0.45 ? [[Math.random() < 0.5 ? 'can' : 'bottle', 1]] : [])],
  crate: () => { const pool = ['wood', 'rope', 'scrap', 'cloth', 'can', 'bottle'], o = []; for (let i = 0; i < 2; i++) o.push([pool[Math.random() * pool.length | 0], 1 + (Math.random() * 3 | 0)]); return o; },
  hardshell: () => [['scrap', 2 + (Math.random() * 3 | 0)], ['cloth', 2], ...(Math.random() < 0.4 ? [['gear', 1]] : []), ...(Math.random() < 0.25 ? [['battery', 1]] : [])],
  supply: () => [['can', 2], ['bottle', 2], ['rope', 3], ['wood', 4]],
  chest: () => [['scrap', 6], ['gear', 2], ['battery', 1], ['cloth', 3], ['rope', 3], ['wood', 6], ['can', 2], ['bottle', 2]],
  cache: (e) => { const d = clamp(Math.floor(-e.y / 15), 0, 4), o = [['scrap', 2 + d], [Math.random() < 0.5 ? 'cloth' : 'rope', 1 + (Math.random() * 2 | 0)], [Math.random() < 0.5 ? 'can' : 'bottle', 1]]; if (Math.random() < 0.15 + 0.1 * d) o.push(['gear', 1]); if (Math.random() < 0.1 * d) o.push(['battery', 1]); if (d >= 3 && Math.random() < 0.1) o.push(['gold', 1]); return o; }
};
const HP = { plank: 1, barrel: 2, crate: 3, hardshell: 6, supply: 1, chest: 5, cache: 3 };
const YOFS = { plank: 0.1, barrel: 0.35, crate: 0.35, hardshell: 0.5 };

function addEnt(kind, x, y, z, extra) {
  const m = props[kind === 'supply' ? 'supply' : kind](); m.position.set(x, y, z); W.scene.add(m);
  const e = Object.assign({ kind, mesh: m, x, y, z, hp: HP[kind], max: HP[kind], float: ['plank', 'barrel', 'crate', 'hardshell'].includes(kind), dead: false, squash: 0, rot: Math.random() * 6.28, dx: (Math.random() - 0.5) * 0.4, dz: (Math.random() - 0.5) * 0.4, r: kind === 'hardshell' || kind === 'chest' ? 1.3 : 0.9 }, extra || {});
  ents.push(e); return e;
}
function inDeadZone(x, z) {
  if (Math.abs(x) < 24 && Math.abs(z) < 24) return true;
  for (const d of W.discs) if (Math.hypot(x - d.x, z - d.z) < d.r + 4) return true;
  return false;
}
function randWater(lo, hi) {
  for (let i = 0; i < 20; i++) {
    const a = rngDebris() * 6.283, r = lo + rngDebris() * (hi - lo), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!inDeadZone(x, z) && Math.abs(x) < HALF - 8 && Math.abs(z) < HALF - 8) return { x, z };
  }
  return { x: 60, z: 60 };
}
function spawnDebris(n) {
  const kinds = ['plank', 'plank', 'plank', 'plank', 'barrel', 'barrel', 'crate', 'crate', 'crate', 'hardshell'];
  for (let i = 0; i < n; i++) {
    const p = i < 60 ? randWater(26, 120) : randWater(60, 230), k = kinds[rngDebris() * kinds.length | 0];
    const e = addEnt(k, p.x, 0, p.z, { id: 'd' + i + '_' + (Math.random() * 1e6 | 0) });
  }
}
function buildEntities() {
  ents.forEach(e => W.scene.remove(e.mesh)); ents = []; puffers.forEach(p => W.scene.remove(p.mesh)); puffers = []; orbs.forEach(o => W.scene.remove(o.mesh)); orbs = [];
  const Q = W.Q.density;
  // FTUE supply crate on the roof + starter ring of debris near the tower
  if (!S.taken.includes('supply')) addEnt('supply', 0, W.roofY + 0.6, 3, { id: 'supply', float: false });
  [['plank', 10, 30], ['barrel', -12, 28], ['crate', 26, 24], ['plank', -30, 8], ['plank', 32, -16], ['barrel', 0, -34], ['plank', -22, -28], ['crate', 12, -32]].forEach((s, i) => addEnt(s[0], s[1], 0, s[2], { id: 'start' + i }));
  spawnDebris(Math.round(70 * Q));
  // caches in the sunken city (only those not yet taken)
  const spots = W.cachesSpots.slice(), r = mulberry32(99);
  for (let i = spots.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0; [spots[i], spots[j]] = [spots[j], spots[i]]; }
  const want = Math.round(48 * Q);
  spots.slice(0, want).forEach((s, i) => { const id = 'c' + i; if (!S.taken.includes(id)) addEnt('cache', s.x, s.y + 0.5, s.z, { id, float: false }); });
  for (let i = 0; i < Math.round(14 * Q); i++) { const id = 'cs' + i, x = (r() - 0.5) * 140, z = (r() - 0.5) * 140; if (Math.abs(x) < 22 && Math.abs(z) < 22) continue; if (!S.taken.includes(id)) addEnt('cache', x, SEABED + 0.6, z, { id, float: false }); }
  // islands: chest + beacon part orbs
  W.islands.forEach(I => {
    const id = 'ch' + I.id; if (!S.taken.includes(id)) addEnt('chest', I.x - 2, I.top + 0.6, I.z + 1, { id, float: false });
    if (I.part && !S.partIsl.includes(I.id)) { const m = props.orb(); m.position.set(I.x + 3, I.top + 2.2, I.z + 2); W.scene.add(m); orbs.push({ mesh: m, x: I.x + 3, y: I.top + 2.2, z: I.z + 2, isl: I.id }); }
  });
  // puffers (cartoon, harmless-looking, bump only)
  const pc = Math.round(tune('pufferCount') * Q);
  for (let i = 0; i < pc; i++) spawnPuffer(i < 4);
}
function spawnPuffer(nearTower) {
  const p = nearTower ? { x: (Math.random() - 0.5) * 80, z: (Math.random() - 0.5) * 80 } : randWater(0, 200);
  const m = props.puffer(); m.position.set(p.x, -8, p.z); W.scene.add(m);
  puffers.push({ mesh: m, x: p.x, y: -4 - Math.random() * 20, z: p.z, hx: p.x, hz: p.z, tx: p.x, ty: -8, tz: p.z, hp: 3, cd: 0, kind: 'puffer', r: 1.0, squash: 0, retime: 0, respawn: 0, dead: false, vx: 0, vy: 0, vz: 0 });
}

// ================= particles =================
function initParticles() {
  const g = new THREE.SphereGeometry(0.12, 5, 4);
  for (let i = 0; i < 36; i++) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff })); m.visible = false; W.scene.add(m); parts.push({ m, life: 0, vx: 0, vy: 0, vz: 0 }); }
}
function burst(x, y, z, color, n) {
  let k = 0;
  for (const p of parts) { if (p.life > 0) continue; p.life = 0.6 + Math.random() * 0.3; p.m.visible = true; p.m.position.set(x, y, z); p.m.material.color.set(color); p.vx = (Math.random() - 0.5) * 6; p.vy = Math.random() * 5 + 1; p.vz = (Math.random() - 0.5) * 6; if (++k >= n) break; }
}
function updateParticles(dt) { for (const p of parts) { if (p.life <= 0) continue; p.life -= dt; p.vy -= 12 * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt; if (p.life <= 0) p.m.visible = false; } }

// ================= inventory / loot =================
let bagFullT = 0;
function roomFor(item) {   // how many more of this item fit: partial stack + free slots * 64
  const have = S.inv[item] || 0, partial = have % STACK_MAX === 0 ? 0 : STACK_MAX - have % STACK_MAX;
  return partial + Math.max(0, BAG_SLOTS - slotsUsed(S)) * STACK_MAX;
}
function bagFullToast() { if (W.time - bagFullT > 2.5) { bagFullT = W.time; UI.toast('🎒 ' + t('bag_full')); sfx.hurt(); } }
function give(item, n) {
  const add = Math.min(n, roomFor(item)); if (add < n) bagFullToast(); if (add <= 0) return 0;
  S.inv[item] = (S.inv[item] || 0) + add; addScore((cfg().items[item].value || 1) * add);
  wantToastLoot[item] = (wantToastLoot[item] || 0) + add; lootT = 0.25; return add;
}
function flushLoot(dt) {
  if (lootT > 0 && (lootT -= dt) <= 0) {
    Object.keys(wantToastLoot).forEach(k => UI.toast(t('loot', { n: wantToastLoot[k], item: itemIcon(k) + ' ' + itemName(k) })));
    wantToastLoot = {};
  }
}
function breakEnt(e) {
  e.dead = true; e.mesh.visible = false; sfx.pickup(); hap('success');
  burst(e.x, e.y + 0.5, e.z, e.kind === 'cache' || e.kind === 'chest' ? 0xffd166 : 0xd2a766, 12);
  (LOOT[e.kind](e)).forEach(([it, n]) => give(it, n));
  if (e.id && (e.id === 'supply' || e.id[0] === 'c')) S.taken.push(e.id);
  if (e.id === 'supply') { if (S.chapter === 0) S.chapter = 1; }
  if (e.float) setTimeout(() => { if (phase === 'play' || phase === 'menu') respawnDebris(e); }, 90000);
  saveT = Math.min(saveT, 18);
}
function respawnDebris(e) {
  const p = randWater(26, 200); e.x = p.x; e.z = p.z; e.hp = e.max; e.dead = false; e.mesh.visible = true; e.mesh.scale.set(1, 1, 1);
}
function punchDamage() { const base = isBoxer() ? tune('punchDamageBoxer') : tune('punchDamageBase'); return base * (S.tools.wraps ? 1.25 : 1); }
function forward3() { const c = Math.cos(P.pitch); return new THREE.Vector3(-Math.sin(P.yaw) * c, Math.sin(P.pitch), -Math.cos(P.yaw) * c); }
function doPunch() {
  if (P.punchCd > 0 || P.helm) return;
  P.punchCd = isBoxer() ? tune('punchCooldown') * 0.8 : tune('punchCooldown'); view.punch = 1;
  const eye = new THREE.Vector3(P.x, P.y + EYE, P.z), f = forward3(); let best = null, bd = 1e9; const reach = 3.4;
  const test = (e) => {
    if (e.dead) return; const to = new THREE.Vector3(e.x - eye.x, (e.kind === 'puffer' ? e.y : e.y + 0.4) - eye.y, e.z - eye.z), d = to.length();
    if (d > reach + e.r || d < 0.01) return; if (to.clone().normalize().dot(f) < 0.55 && d > e.r + 0.6) return; if (d < bd) { bd = d; best = e; }
  };
  ents.forEach(test); puffers.forEach(test);
  if (!best) { sfx.punch(); hap('tick'); return; }
  sfx.punch(); hap(isBoxer() ? 'thud' : 'tap'); best.hp -= punchDamage(); best.squash = 0.25;
  burst(best.x, best.y + 0.5, best.z, 0xffffff, 4);
  if (best.hp <= 0) { if (best.kind === 'puffer') popPuffer(best); else breakEnt(best); }
}
function popPuffer(p) {
  p.dead = true; p.mesh.visible = false; p.respawn = 45; burst(p.x, p.y, p.z, 0xffcf4a, 14); sfx.pop(); UI.toast(t('pop')); hap('success'); give('fish', 1);
}

// ================= raft =================
function placeRaft(px, pz, yaw) {
  R.x = px; R.z = pz; R.yaw = yaw || 0; R.speed = 0; W.raftMesh.visible = true; syncRaftVisual();
}
function syncRaftVisual() {
  const m = W.raftMesh; m.position.set(R.x, 0, R.z); m.rotation.y = R.yaw;
  m.getObjectByName('sail').visible = !!S.up.sail; m.getObjectByName('rudder').visible = !!S.up.rudder;
  m.getObjectByName('lantern').visible = !!S.up.lantern; m.userData.lampLight.intensity = S.up.lantern ? 1.2 : 0;
  m.getObjectByName('hull').visible = !!S.up.hull;
}
const raftHW = () => (S.up.hull ? 4.6 : 3.5), raftHL = 4.5;
function toLocal(x, z) { const dx = x - R.x, dz = z - R.z, c = Math.cos(R.yaw), s = Math.sin(R.yaw); return { lx: dx * c - dz * s, lz: dx * s + dz * c }; }
function toWorld(lx, lz) { const c = Math.cos(R.yaw), s = Math.sin(R.yaw); return { x: R.x + lx * c + lz * s, z: R.z - lx * s + lz * c }; }
function updateRaft(dt) {
  if (!S.raftBuilt) return;
  const I = UI.input, f = P.helm ? clamp(-I.mz, -0.4, 1) : 0, s = P.helm ? I.mx : 0;
  const ox = R.x, oz = R.z, oyaw = R.yaw;
  const sp = S.up.sail ? tune('raftSpeedSail') : tune('raftSpeedBase');
  R.speed = lerp(R.speed, f * sp, Math.min(1, (f ? 0.9 : 1.6) * dt));
  const turn = 0.55 + S.up.rudder * 0.35; R.yaw -= s * turn * dt * clamp(Math.abs(R.speed) / 2.5 + 0.25, 0.25, 1);
  let nx = R.x - Math.sin(R.yaw) * R.speed * dt, nz = R.z - Math.cos(R.yaw) * R.speed * dt, hit = false;
  for (const b of W.solids) { if (b.y1 < 0.3 || b.y0 > 1) continue; const cx = clamp(nx, b.x0, b.x1), cz = clamp(nz, b.z0, b.z1), d = Math.hypot(nx - cx, nz - cz); if (d < RAFT_R) { hit = true; if (d > 0.001) { nx = cx + (nx - cx) / d * RAFT_R; nz = cz + (nz - cz) / d * RAFT_R; } else nx += RAFT_R; } }
  for (const d of W.discs) { const dd = Math.hypot(nx - d.x, nz - d.z), lim = d.r + RAFT_R; if (dd < lim) { hit = true; nx = d.x + (nx - d.x) / (dd || 1) * lim; nz = d.z + (nz - d.z) / (dd || 1) * lim; } }
  const lim = HALF - 7; if (Math.abs(nx) > lim || Math.abs(nz) > lim) { nx = clamp(nx, -lim, lim); nz = clamp(nz, -lim, lim); hit = true; if (R.warn <= 0) { UI.toast(t('storm_wall')); R.warn = 4; } }
  if (hit && Math.abs(R.speed) > 3) { R.speed *= 0.4; hap('thud'); }
  R.warn -= dt; R.x = nx; R.z = nz;
  if (P.onRaft || P.helm) { // carry the player with the raft
    const rel = { x: P.x - ox, z: P.z - oz }, yawDelta = R.yaw - oyaw, cc = Math.cos(yawDelta), ss = Math.sin(yawDelta);
    // three.js rotation.y = +a maps (x,z) -> (x cos a + z sin a, -x sin a + z cos a)
    P.x = R.x + rel.x * cc + rel.z * ss; P.z = R.z - rel.x * ss + rel.z * cc;
    P.yaw += yawDelta;
  }
  syncRaftVisual();
}
function helmWorld() { return toWorld(0, 3.2); }

// ================= player =================
function respawnPlayer(blackout) {
  P.vx = P.vy = P.vz = 0; P.helm = false; P.hp = Math.max(P.hp, 60); P.o2 = P.o2max;
  if (S.raftBuilt) { const w = toWorld(0, 1); P.x = w.x; P.z = w.z; P.y = RAFT_TOP; P.onRaft = true; }
  else { P.x = 0; P.y = W.deckY; P.z = 19.5; P.onRaft = false; }
  P.pitch = 0;
}
function lossOnBlackout() {
  const k = tune('blackoutLoss'); Object.keys(S.inv).forEach(i => { if (i === 'part') return; S.inv[i] = Math.floor(S.inv[i] * (1 - k)); });
}
function doBlackout() {
  if (P.black > 0) return; P.black = 2.2; UI.setFade(true); hap('error'); sfx.hurt();
}
function recomputeO2Max() { P.o2max = (isDiver() ? tune('oxygenDiver') : tune('oxygenBase')) + (S.tools.tank ? 25 : 0); }

function findLedge(px, pz) {
  for (const b of W.solids) { if (px > b.x0 - 0.3 && px < b.x1 + 0.3 && pz > b.z0 - 0.3 && pz < b.z1 + 0.3 && b.y1 > P.y + 0.3 && b.y1 < P.y + 3.9 && b.y0 < P.y + 1) return true; }
  for (const d of W.discs) { if (Math.hypot(px - d.x, pz - d.z) < d.r + 0.4 && d.top < P.y + 3.9 && d.top > P.y + 0.3) return true; }
  if (S.raftBuilt) { const l = toLocal(px, pz); if (Math.abs(l.lx) < raftHW() + 0.4 && Math.abs(l.lz) < raftHL + 0.4 && RAFT_TOP < P.y + 3.9 && RAFT_TOP > P.y + 0.3) return true; }
  return false;
}
function updatePlayer(dt) {
  const I = UI.input; UI.pollKeys();
  if (P.black > 0) { I.punch = I.use = false; I.lookX = I.lookY = 0; P.vx = P.vz = 0; return; }
  P.yaw -= I.lookX; P.pitch = clamp(P.pitch - I.lookY, -1.45, 1.45); I.lookX = I.lookY = 0;
  P.punchCd -= dt; P.hurt = Math.max(0, P.hurt - dt); P.invuln -= dt;
  if (I.punch) { I.punch = false; doPunch(); }
  const prevY = P.y; let wasUnder = P.under;
  const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw), fwd = { x: -sin, z: -cos }, right = { x: cos, z: -sin };
  const sick = (P.hunger <= 0 || P.thirst <= 0) ? 0.75 : 1;
  if (P.helm) { // steering: locked at the helm
    const h = helmWorld(); P.x = h.x; P.z = h.z; P.y = RAFT_TOP; P.vx = P.vz = P.vy = 0; P.onRaft = true; P.swim = false;
    if (I.jump) { P.helm = false; UI.toast(t('helm_off')); }
  } else {
    const wishF = -I.mz, wishR = I.mx; const mag = Math.min(1, Math.hypot(wishF, wishR));
    P.swim = P.y < -0.7;
    if (!P.swim) {
      const sp = tune('walkSpeed') * sick, wx = (fwd.x * wishF + right.x * wishR), wz = (fwd.z * wishF + right.z * wishR), wl = Math.hypot(wx, wz) || 1;
      const tx = wx / wl * sp * mag, tz = wz / wl * sp * mag;
      P.vx = lerp(P.vx, tx, Math.min(1, 12 * dt)); P.vz = lerp(P.vz, tz, Math.min(1, 12 * dt));
      P.vy -= 22 * dt;
      if (I.jump && P.grounded) { P.vy = 8.2; P.grounded = false; }
    } else {
      const sp = tune('swimSpeed') * (isDiver() ? tune('diverSwimMul') : 1) * sick, use3 = P.y < -2.6 || (P.pitch < -0.35 && wishF > 0.3 && !I.jump);
      let wx = fwd.x * wishF + right.x * wishR, wz = fwd.z * wishF + right.z * wishR, wy = 0;
      if (use3) { const c = Math.cos(P.pitch); wx = fwd.x * c * wishF + right.x * wishR; wz = fwd.z * c * wishF + right.z * wishR; wy = Math.sin(P.pitch) * wishF; }
      const k = Math.min(1, 5 * dt); P.vx = lerp(P.vx, wx * sp, k); P.vz = lerp(P.vz, wz * sp, k);
      let ty = wy * sp;
      if (I.dive) ty = -sp * 0.9; else if (I.jump) ty = sp * 0.9;
      else if (!use3 && P.y > -2.6) ty = clamp((-1.0 - P.y) * 2.5, -2, 2); else if (!use3) ty += 0.5;
      P.vy = lerp(P.vy, ty, Math.min(1, 6 * dt));
      if (I.jump && P.y > -1.9 && findLedge(P.x + fwd.x * 0.9, P.z + fwd.z * 0.9)) P.vy = 9.5;
    }
    // integrate with collisions
    P.grounded = false; P.vy = Math.max(P.vy, -40);
    P.x += P.vx * dt; collideH('x'); P.z += P.vz * dt; collideH('z');
    const oy = P.y; P.y += P.vy * dt; collideV(oy);
    P.onRaft = false;
    if (S.raftBuilt) { // raft deck support
      const l = toLocal(P.x, P.z);
      if (Math.abs(l.lx) < raftHW() && Math.abs(l.lz) < raftHL && P.vy <= 0 && oy >= RAFT_TOP - 0.15 && P.y <= RAFT_TOP) { P.y = RAFT_TOP; P.vy = 0; P.grounded = true; P.onRaft = true; }
    }
    const lim = HALF - 1.5; P.x = clamp(P.x, -lim, lim); P.z = clamp(P.z, -lim, lim); P.y = Math.max(P.y, SEABED + 0.1);
  }
  // water state
  const surf = waveAt(P.x, P.z, W.time);
  P.under = P.y + EYE < surf - 0.05; P.depth = Math.max(0, -P.y);
  if (P.under !== wasUnder) { setUnderwater(P.under); sfx.splash(); hap('thud'); burst(P.x, surf + 0.3, P.z, 0xbfefff, 10); }
  else if (prevY >= -0.3 && P.y < -0.3 && P.vy < -3) { sfx.splash(); hap('thud'); burst(P.x, surf + 0.3, P.z, 0xbfefff, 10); }
  if (S.chapter === 1 && P.y < -0.7) { S.chapter = 2; saveNow(); }
}
function collideH(axis) {
  for (const b of W.solids) {
    if (P.x + PR > b.x0 && P.x - PR < b.x1 && P.z + PR > b.z0 && P.z - PR < b.z1 && P.y + PH > b.y0 + 0.01 && P.y < b.y1 - 0.01) {
      const up = b.y1 - P.y;
      if (!P.swim && up > 0 && up <= 1.05 && P.vy <= 0.5) { P.y = b.y1; P.vy = 0; continue; }
      if (axis === 'x') { if (P.vx > 0) P.x = b.x0 - PR; else if (P.vx < 0) P.x = b.x1 + PR; else P.x += (P.x < (b.x0 + b.x1) / 2 ? -1 : 1) * 0.05; P.vx = 0; }
      else { if (P.vz > 0) P.z = b.z0 - PR; else if (P.vz < 0) P.z = b.z1 + PR; else P.z += (P.z < (b.z0 + b.z1) / 2 ? -1 : 1) * 0.05; P.vz = 0; }
    }
  }
  for (const d of W.discs) {
    const dd = Math.hypot(P.x - d.x, P.z - d.z), lim = d.r + PR;
    if (dd < lim && P.y < d.top - 0.02) {
      const up = d.top - P.y;
      if (!P.swim && up <= 1.05) { P.y = d.top; P.vy = 0; continue; }
      P.x = d.x + (P.x - d.x) / (dd || 1) * lim; P.z = d.z + (P.z - d.z) / (dd || 1) * lim;
    }
  }
}
function collideV(oy) {
  for (const b of W.solids) {
    if (P.x + PR > b.x0 && P.x - PR < b.x1 && P.z + PR > b.z0 && P.z - PR < b.z1) {
      if (P.vy <= 0 && oy >= b.y1 - 0.02 && P.y < b.y1) { P.y = b.y1; P.vy = 0; P.grounded = true; }
      else if (P.vy > 0 && oy + PH <= b.y0 + 0.02 && P.y + PH > b.y0) { P.y = b.y0 - PH; P.vy = 0; }
    }
  }
  for (const d of W.discs) { if (Math.hypot(P.x - d.x, P.z - d.z) < d.r && P.vy <= 0 && oy >= d.top - 0.02 && P.y < d.top) { P.y = d.top; P.vy = 0; P.grounded = true; } }
}

// ================= survival =================
function updateSurvival(dt) {
  recomputeO2Max();
  if (P.under) {
    let rate = 1; if (!isDiver() && P.depth > 25) rate += (P.depth - 25) / 15;
    P.o2 -= rate * dt;
    if (P.o2 / P.o2max < 0.25 && Math.floor(W.time * 2) % 2 === 0 && !P._w) { P._w = true; sfx.warn(); hap('warning'); UI.toast(t('oxy_low')); } if (Math.floor(W.time * 2) % 2 === 1) P._w = false;
    if (P.o2 <= 0) { P.o2 = 0; doBlackout(); }
  } else P.o2 = Math.min(P.o2max, P.o2 + dt * P.o2max / 2.5);
  P.hunger = Math.max(0, P.hunger - 100 / tune('hungerSeconds') * dt); P.thirst = Math.max(0, P.thirst - 100 / tune('thirstSeconds') * dt);
  if (P.hunger < 25 && S.inv.can > 0) { S.inv.can--; P.hunger = Math.min(100, P.hunger + 55); UI.toast('🥫 ' + t('ate')); sfx.pickup(); }
  else if (P.hunger < 25 && S.inv.fish > 0) { S.inv.fish--; P.hunger = Math.min(100, P.hunger + 40); UI.toast('🐟 ' + t('ate')); sfx.pickup(); }
  if (P.thirst < 25 && S.inv.bottle > 0) { S.inv.bottle--; P.thirst = Math.min(100, P.thirst + 60); UI.toast('💧 ' + t('drank')); sfx.pickup(); }
  if ((P.hunger <= 0 || P.thirst <= 0) && P.hp > 15) P.hp -= 1.0 * dt;
  else if (P.hunger > 30 && P.thirst > 30 && P.hurt <= 0) P.hp = Math.min(100, P.hp + 2 * dt);
  if (P.hp <= 0) { P.hp = 1; doBlackout(); }
}
function updateBlackout(dt) {
  if (P.black <= 0) return; P.black -= dt;
  if (P.black < 1.2 && !P._bo) { P._bo = true; lossOnBlackout(); respawnPlayer(true); UI.toast(t('blackout')); }
  if (P.black <= 0) { P._bo = false; UI.setFade(false); P.hp = 60; }
}

// ================= puffers =================
function updatePuffers(dt) {
  for (const p of puffers) {
    if (p.dead) { if ((p.respawn -= dt) <= 0) { p.dead = false; p.hp = 3; p.mesh.visible = true; const q = randWater(10, 200); p.x = q.x; p.z = q.z; p.hx = q.x; p.hz = q.z; } continue; }
    p.cd -= dt; p.squash = Math.max(0, p.squash - dt);
    const dx = P.x - p.x, dy = P.y + 1 - p.y, dz = P.z - p.z, d = Math.hypot(dx, dy, dz), inWater = P.y < -0.4;
    if (inWater && d < 16) { const sp = 4.6; p.vx = lerp(p.vx, dx / d * sp, 3 * dt); p.vy = lerp(p.vy, dy / d * sp, 3 * dt); p.vz = lerp(p.vz, dz / d * sp, 3 * dt);
      if (d < 1.7 && p.cd <= 0 && P.invuln <= 0 && P.black <= 0) { P.hp -= tune('pufferDamage'); P.hurt = 0.5; P.invuln = 0.9; p.cd = 1.6; P.vx += dx / d * -7; P.vz += dz / d * -7; sfx.hurt(); hap('thud'); p.vx = -p.vx; p.vz = -p.vz; } }
    else { p.retime -= dt; if (p.retime <= 0) { p.retime = 3 + Math.random() * 3; p.tx = p.hx + (Math.random() - 0.5) * 40; p.tz = p.hz + (Math.random() - 0.5) * 40; p.ty = -2 - Math.random() * 26; }
      const tx = p.tx - p.x, ty = p.ty - p.y, tz = p.tz - p.z, td = Math.hypot(tx, ty, tz) || 1; p.vx = lerp(p.vx, tx / td * 1.6, 2 * dt); p.vy = lerp(p.vy, ty / td * 1.2, 2 * dt); p.vz = lerp(p.vz, tz / td * 1.6, 2 * dt); }
    p.x += p.vx * dt; p.y = Math.min(-1.0, p.y + p.vy * dt); p.z += p.vz * dt;
    p.x = clamp(p.x, -HALF + 3, HALF - 3); p.z = clamp(p.z, -HALF + 3, HALF - 3); p.y = Math.max(p.y, SEABED + 2);
    const s = 1 + Math.sin(W.time * 4 + p.hx) * 0.06 + p.squash * 1.2; p.mesh.position.set(p.x, p.y, p.z); p.mesh.scale.set(s, s, s);
    if (Math.hypot(p.vx, p.vz) > 0.2) p.mesh.rotation.y = Math.atan2(-p.vx, -p.vz);
  }
}

// ================= fishing =================
function aimWater() {
  const f = forward3(), eyeY = P.y + EYE; if (f.y > -0.08) return null; const tt = eyeY / -f.y, hx = P.x + f.x * tt, hz = P.z + f.z * tt, d = Math.hypot(hx - P.x, hz - P.z);
  if (d < 2 || d > 22) return null; return { x: hx, z: hz };
}
function rollFish(tier) {
  const pool = cfg().fishing.filter(f => f.tier <= tier).map(f => ({ f, w: f.weight * (1 + (tier - f.tier) * (f.tier > 1 ? 0.4 : 0)) }));
  let sum = pool.reduce((a, b) => a + b.w, 0), r = Math.random() * sum;
  for (const p of pool) { if ((r -= p.w) <= 0) return p.f; } return pool[0].f;
}
function useAction() {
  if (S.raftBuilt && P.onRaft && !P.helm) { const h = helmWorld(); if (Math.hypot(P.x - h.x, P.z - h.z) < 2.6) { P.helm = true; UI.toast(t('helm_on')); sfx.ui(); return; } }
  if (fishing) { if (fishing.state === 'bite') reel(true); return; }
  if (S.rodEq > 0 && !P.swim) {
    if (S.castsLeft <= 0) { UI.toast(t('no_casts')); return; }
    const a = aimWater(); if (!a) { UI.toast(t('look_water')); return; }
    S.castsLeft--; fishing = { x: a.x, z: a.z, time: 0, bite: 1.4 + Math.random() * 1.6, state: 'wait' }; bobber.visible = true; bobber.position.set(a.x, 0.2, a.z);
    UI.toast('🎣 ' + t('casts_left', { n: S.castsLeft })); sfx.cast(); hap('tap'); view.cast = 1;
  }
}
function reel(timed) {
  if (!fishing) return; const tier = S.rodEq, f = rollFish(tier);
  let n = f.min + Math.floor(Math.random() * (f.max - f.min + 1)) + (tier >= 3 ? 1 : 0) + (timed ? 1 : 0); n = Math.max(1, n);
  give(f.item, n); UI.toast('🎣 ' + t('caught', { item: itemIcon(f.item) + ' ' + itemName(f.item) })); sfx.pickup(); hap('success');
  burst(fishing.x, 0.5, fishing.z, 0xbfefff, 10); bobber.visible = false; fishing = null; saveT = Math.min(saveT, 15);
}
function updateFishing(dt) {
  if (!fishing) return;
  if (P.swim || phase !== 'play') { bobber.visible = false; fishing = null; return; }
  fishing.time += dt; bobber.position.y = 0.2 + waveAt(fishing.x, fishing.z, W.time);
  if (fishing.state === 'wait' && fishing.time > fishing.bite) { fishing.state = 'bite'; fishing.t2 = 0; sfx.pop(); hap('warning'); bobber.scale.set(2, 2, 2); }
  if (fishing.state === 'bite') { fishing.t2 += dt; bobber.position.y -= 0.35 * Math.abs(Math.sin(fishing.t2 * 14)); if (fishing.t2 > 1.4) { bobber.scale.set(1, 1, 1); reel(false); } }
}
const recipeOf = (id) => cfg().recipes.find(r => r.id === id);
function owned(r) { return S.gear[r.id] || 0; }   // 0 = not owned, 1 = in bag, 2 = equipped / installed
function craft(r) {
  if (S.gear[r.id]) return;
  for (const k in r.cost) if ((S.inv[k] || 0) < r.cost[k]) { UI.toast(t('need_more')); sfx.hurt(); return; }
  for (const k in r.cost) S.inv[k] -= r.cost[k];
  S.gear[r.id] = 1;
  if (slotsUsed(S) > BAG_SLOTS) { delete S.gear[r.id]; for (const k in r.cost) S.inv[k] += r.cost[k]; bagFullToast(); return; }
  addScore(25); sfx.craft(); hap('success');
  UI.toast(r.icon + ' ' + t('to_bag', { name: t('r_' + r.id) })); saveNow();
}
function raftFree(x, z) {
  if (Math.abs(x) > HALF - 9 || Math.abs(z) > HALF - 9) return false;
  for (const b of W.solids) { if (b.y1 < 0.3 || b.y0 > 1) continue; const cx = clamp(x, b.x0, b.x1), cz = clamp(z, b.z0, b.z1); if (Math.hypot(x - cx, z - cz) < RAFT_R + 0.8) return false; }
  for (const d of W.discs) if (Math.hypot(x - d.x, z - d.z) < d.r + RAFT_R + 0.8) return false;
  return true;
}
function findRaftSpot() {
  for (let dist = 12; dist <= 48; dist += 4) for (const off of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.7, -1.7, 2.4, -2.4, 3.14]) {
    const a = P.yaw + off, x = P.x - Math.sin(a) * dist, z = P.z - Math.cos(a) * dist; if (raftFree(x, z)) return { x, z };
  }
  return raftFree(DOCK.x, DOCK.z) ? { x: DOCK.x, z: DOCK.z } : { x: 60, z: 60 };
}
let raftBeamT = 0;
function equipItem(id) {   // returns true when the bag should close (so the player sees the result)
  const r = recipeOf(id), st = S.gear[id]; if (!r || !st) return false;
  const nm = t('r_' + id);
  if (r.kind === 'raft') {
    if (st === 2) return false;
    const sp = findRaftSpot(); S.raftBuilt = true; S.gear.raft = 2; placeRaft(sp.x, sp.z, P.yaw + Math.PI);
    P.yaw = Math.atan2(-(sp.x - P.x), -(sp.z - P.z)); P.pitch = clamp(Math.atan2(0.5 - (P.y + EYE), Math.hypot(sp.x - P.x, sp.z - P.z)), -1.2, 0.2); raftBeamT = 8; UI.toast('🛶 ' + t('raft_placed')); sfx.craft(); hap('success'); saveNow(); return true;
  }
  if (r.kind === 'upgrade') {
    if (!S.raftBuilt) { UI.toast(t('raft_first')); sfx.hurt(); return false; }
    if (st === 2) return false;
    S.gear[id] = 2; S.up[id] = 1; syncRaftVisual(); UI.toast(r.icon + ' ' + t('equipped_item', { name: nm })); sfx.craft(); hap('success'); raftBeamT = 4; saveNow(); return true;
  }
  if (r.kind === 'tool') {
    const on = st !== 2; S.gear[id] = on ? 2 : 1; S.tools[id] = on ? 1 : 0; recomputeO2Max(); P.o2 = Math.min(P.o2, P.o2max);
    UI.toast(r.icon + ' ' + t(on ? 'equipped_item' : 'unequipped_item', { name: nm })); sfx.ui(); hap('tap'); saveNow(); return false;
  }
  if (r.kind === 'rod') {
    const on = st !== 2;
    cfg().recipes.forEach(o => { if (o.kind === 'rod' && S.gear[o.id]) S.gear[o.id] = 1; });
    if (on) { S.gear[id] = 2; S.rodEq = r.tier; S.rods[r.tier] = 1; } else S.rodEq = 0;
    UI.toast(r.icon + ' ' + t(on ? 'equipped_item' : 'unequipped_item', { name: nm })); sfx.ui(); hap('tap'); saveNow(); return false;
  }
  if (r.kind === 'beacon') { S.gear.beacon = 2; S.ended = true; S.chapter = 6; addScore(2000); finishGame(); return false; }
  return false;
}
function eatItem(id) {
  if ((S.inv[id] || 0) < 1) return;
  if (id === 'can') { S.inv.can--; P.hunger = Math.min(100, P.hunger + 55); UI.toast('🥫 ' + t('ate')); }
  else if (id === 'fish') { S.inv.fish--; P.hunger = Math.min(100, P.hunger + 40); UI.toast('🐟 ' + t('ate')); }
  else return;
  sfx.pickup(); hap('tap'); saveNow();
}
function drinkItem(id) {
  if (id !== 'bottle' || (S.inv.bottle || 0) < 1) return;
  S.inv.bottle--; P.thirst = Math.min(100, P.thirst + 60); UI.toast('💧 ' + t('drank')); sfx.pickup(); hap('tap'); saveNow();
}
function finishGame() { sfx.win(); hap('success'); submitScore(); saveNow(); phase = 'paused'; ctxPanel = 'end'; UI.showEnding(S.score); }

// ================= islands / orbs / chapters =================
function updateWorldLogic(dt) {
  for (const I of W.islands) if (!S.found.includes(I.id) && Math.hypot(P.x - I.x, P.z - I.z) < I.r + 14) { S.found.push(I.id); addScore(200); UI.toast('🏝️ ' + t('island_found', { name: t('isl' + I.id) })); sfx.pickup(); }
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i]; o.mesh.rotation.y += dt * 2; o.mesh.position.y = o.y + Math.sin(W.time * 2) * 0.25;
    if (Math.hypot(P.x - o.x, P.y + 1 - o.y, P.z - o.z) < 2.8) {
      if (roomFor('part') < 1) { bagFullToast(); continue; }
      W.scene.remove(o.mesh); orbs.splice(i, 1); S.partIsl.push(o.isl); give('part', 1); UI.toast('📡 ' + t('part_found', { n: S.inv.part })); sfx.win(); hap('success'); saveNow();
    }
  }
  // chapter progression
  if (S.chapter === 2) { const need = cfg().recipes[0].cost; if (Object.keys(need).every(k => (S.inv[k] || 0) >= need[k]) || S.gear.raft) S.chapter = 3; }
  if (S.chapter === 3 && S.raftBuilt) S.chapter = 4;
  if (S.chapter === 4 && S.inv.part >= 3) S.chapter = 5;
}
function objective() {
  const c = S.chapter; let txt = t('obj' + Math.min(c, 6));
  if (c === 2) { const need = cfg().recipes[0].cost; let have = 0, tot = 0; for (const k in need) { have += Math.min(S.inv[k] || 0, need[k]); tot += need[k]; } txt += ` ${have}/${tot}`; }
  if (c === 4) txt += ` ${S.inv.part}/3`;
  return txt;
}
function objectiveTarget() {
  const c = S.chapter;
  if (c === 0) { const e = ents.find(x => x.id === 'supply' && !x.dead); return e ? { x: e.x, y: e.y, z: e.z } : null; }
  if (c === 1) return { x: 0, y: 0, z: -25 };
  if (c === 2) { let b = null, bd = 1e9; for (const e of ents) { if (e.dead || !e.float) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; b = e; } } return b ? { x: b.x, y: 0, z: b.z } : null; }
  if (c === 3) return { x: DOCK.x, y: 0, z: DOCK.z };
  if (c === 4) { let b = null, bd = 1e9; for (const o of orbs) { const d = Math.hypot(o.x - P.x, o.z - P.z); if (d < bd) { bd = d; b = o; } } return b ? { x: b.x, y: 0, z: b.z } : null; }
  return null;
}

// ================= time / day =================
function updateDay(dt) {
  S.tod += dt / tune('dayLength');
  if (S.tod >= 1) { S.tod -= 1; S.day++; S.castsLeft = tune('castsPerDay'); UI.toast('🌅 ' + t('day_new', { n: S.day })); saveNow(); ents.forEach(e => { if (e.float && e.dead) respawnDebris(e); }); }
  waveAmp.v = 0.3 + 0.12 * Math.sin(W.time * 0.05) + (W.dayness < 0.3 ? 0.08 : 0);
}

// ================= view model / camera =================
function buildViewModel() {
  view = { punch: 0, cast: 0, bob: 0 };
  const g = new THREE.Group(); const skin = new THREE.MeshLambertMaterial({ color: 0xf2c29b }), red = new THREE.MeshLambertMaterial({ color: 0xd62828 });
  fist = new THREE.Group(); const hand = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), red); hand.scale.set(1, 0.9, 1.2); const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.8, 6), skin); arm.rotation.x = Math.PI / 2; arm.position.z = 0.4; const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 8), new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x442200 })); wrap.rotation.x = Math.PI / 2; wrap.position.z = 0.12; fist.add(hand, arm, wrap); fist.userData.wrap = wrap;
  fist.position.set(0.32, -0.3, -0.55); g.add(fist);
  rodMesh = new THREE.Group(); const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 1.5, 5), new THREE.MeshLambertMaterial({ color: 0x8b5a2b })); rod.rotation.x = 1.0; rod.position.set(0, 0.2, -0.2); rodMesh.add(rod);
  rodMesh.position.set(-0.3, -0.3, -0.55); g.add(rodMesh); W.camera.add(g); view.group = g;
  bobber = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); bobber.visible = false; W.scene.add(bobber);
}
function updateView(dt) {
  view.punch = Math.max(0, view.punch - dt * 4); view.cast = Math.max(0, view.cast - dt * 2.5);
  const moving = Math.hypot(P.vx, P.vz) > 0.5 && P.grounded; view.bob += dt * (moving ? 9 : 2);
  fist.position.z = -0.55 - Math.sin(view.punch * Math.PI) * 0.7; fist.position.y = -0.3 + Math.sin(view.bob) * (moving ? 0.02 : 0.006); fist.position.x = 0.32 - Math.sin(view.punch * Math.PI) * 0.12;
  rodMesh.visible = S.rodEq > 0 && !P.swim && !P.helm; fist.userData.wrap.visible = !!S.tools.wraps; if (rodMesh.userData.tier !== S.rodEq) { rodMesh.userData.tier = S.rodEq; rodMesh.children[0].material.color.set([0x8b5a2b, 0x8b5a2b, 0xc9a45c, 0x9aa7b4, 0x2b2b2b, 0xb85cff][S.rodEq] || 0x8b5a2b); } rodMesh.rotation.x = -view.cast * 0.9;
  view.group.visible = !P.under || true;
  W.camera.position.set(P.x, P.y + EYE + (moving ? Math.sin(view.bob) * 0.04 : 0), P.z); W.camera.rotation.set(P.pitch, P.yaw, 0);
}
function updateEntitiesVisual(dt) {
  for (const e of ents) {
    if (e.dead) continue;
    if (e.float) { e.x += e.dx * dt; e.z += e.dz * dt; if (Math.abs(e.x) > HALF - 6) e.dx *= -1; if (Math.abs(e.z) > HALF - 6) e.dz *= -1; e.y = waveAt(e.x, e.z, W.time) + (YOFS[e.kind] || 0.3); e.rot += dt * 0.2; e.mesh.rotation.y = e.rot; e.mesh.rotation.z = Math.sin(W.time * 1.4 + e.x) * 0.1; }
    else if (e.kind === 'cache' || e.kind === 'chest') { e.mesh.rotation.y = Math.sin(W.time * 0.7 + e.x) * 0.2; }
    e.squash = Math.max(0, e.squash - dt); const s = 1 + e.squash * 1.2; e.mesh.scale.set(s, s, s); e.mesh.position.set(e.x, e.y, e.z);
  }
}

// ================= HUD =================
function updateHud(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = 0.08;
  const tg = objectiveTarget(); let comp = null;
  if (tg) comp = P.yaw - Math.atan2(-(tg.x - P.x), -(tg.z - P.z));
  let useIcon = null; const h = helmWorld();
  if (S.raftBuilt && P.onRaft && !P.helm && Math.hypot(P.x - h.x, P.z - h.z) < 2.6) useIcon = '⛵';
  else if (fishing) useIcon = fishing.state === 'bite' ? '❗' : '🎣';
  else if (S.rodEq > 0 && !P.swim && !P.helm) useIcon = '🎣';
  else if (P.helm) useIcon = null;
  const supply = ents.find(e => e.id === 'supply' && !e.dead);
  UI.setHud({ hp: P.hp, o2: P.o2 / P.o2max, under: P.under, hunger: P.hunger, thirst: P.thirst, day: S.day, score: S.score, objective: objective(), ftue: !S.ftueDone && S.chapter < 2, compass: comp, useIcon, swim: P.swim, punchHint: S.chapter === 0 && supply && Math.hypot(supply.x - P.x, supply.z - P.z) < 6 });
  const sting = !isDiver() && P.under ? (0.12 + 0.35 * clamp(P.depth / 40, 0, 1)) * (S.tools.goggles ? 0.35 : 1) * (0.8 + 0.2 * Math.sin(W.time * 5)) : 0;
  UI.setEquip(cfg().recipes.filter(r => (r.kind === 'tool' || r.kind === 'rod') && S.gear[r.id] === 2).map(r => r.icon).join(' '), !!S.tools.goggles && P.under);
  UI.setVignette(sting, P.under && P.o2 / P.o2max < 0.25, P.hurt > 0 ? 0.5 : 0);
  UI.setTint(P.under ? (isDiver() ? 0.05 : 0.18) + clamp(P.depth / 80, 0, 0.3) : 0);
}
function updateMarker() {
  if (raftBeamT > 0) { raftBeamT -= 0.016; W.beam.visible = true; W.beam.position.set(R.x, 0, R.z); return; }
  const tg = !S.ftueDone && S.chapter < 2 ? objectiveTarget() : (S.chapter === 4 ? objectiveTarget() : null);
  if (tg) { W.beam.visible = true; W.beam.position.set(tg.x, S.chapter === 0 ? tg.y - 1 : 0, tg.z); } else W.beam.visible = false;
}

// ================= game flow =================
function applyAuto() {
  const q = S.quality === 'auto' ? (autoTier || (window.lib.shouldUseTouchControls && window.lib.shouldUseTouchControls() ? 'med' : 'high')) : S.quality;
  W.applyQuality(q);
}
function startPlay(fromSave) {
  phase = 'play'; UI.closePanel(); UI.showHud(true); UI.setStaticText();
  recomputeO2Max(); buildEntities();
  if (fromSave && S.pos) { P.x = S.pos.x; P.y = S.pos.y; P.z = S.pos.z; P.yaw = S.pos.yaw || 0; } else { P.x = 0; P.y = W.roofY; P.z = 11; P.yaw = 0; P.pitch = -0.12; }
  P.vx = P.vy = P.vz = 0; P.helm = false; P.black = 0; P._bo = false; UI.setFade(false); P.hp = fromSave ? Math.max(P.hp, 60) : 100; P.o2 = P.o2max; P.hunger = P.hunger || 100; P.thirst = P.thirst || 100;
  if (S.raftBuilt) { const rp = S.raftPos || { x: DOCK.x, z: DOCK.z, yaw: 0 }; placeRaft(rp.x, rp.z, rp.yaw); if (!fromSave) respawnPlayer(); } else W.raftMesh.visible = false;
  if (fromSave && S.raftBuilt) { const l = toLocal(P.x, P.z); P.onRaft = Math.abs(l.lx) < raftHW() && Math.abs(l.lz) < raftHL && Math.abs(P.y - RAFT_TOP) < 0.3; }
  if (S.castDay !== S.day) { S.castDay = S.day; S.castsLeft = tune('castsPerDay'); }
  if (!S.ftueDone && S.chapter === 0) { setTimeout(() => { if (phase === 'play') { UI.toast('🕹️ ' + t('ftue_move')); setTimeout(() => UI.toast('👆 ' + t('ftue_look')), 700); } }, 800); }
  initAudio(); saveNow();
}
function showMenu() {
  phase = 'menu'; UI.closePanel(); UI.showHud(false); UI.setStaticText(); UI.setFade(false);
  UI.showMenu(!!(S.talent), S.best);
}
function newGame() {
  const keep = { lang: S.lang, quality: S.quality, muted: S.muted, best: S.best };
  S = Object.assign(freshState(), keep); S.pos = null; S.raftPos = null; P.hunger = P.thirst = 100; P.hp = 100;
  const tl = cfg().talents, sum = tl.reduce((a, b) => a + b.weight, 0); let r = Math.random() * sum, pick = tl[0].id; for (const x of tl) { if ((r -= x.weight) <= 0) { pick = x.id; break; } }
  S.talent = null; drawTalent(pick); initAudio();
}
function drawTalent(pick) {
  phase = 'draw'; UI.closePanel(); S.pendingTalent = pick;
  UI.showDraw(pick, S.redrawUsed, () => { S.talent = pick; delete S.pendingTalent; S.castsLeft = tune('castsPerDay'); startPlay(false); },
    () => { S.redrawUsed = true; const tl = cfg().talents.filter(x => x.id !== pick), np = tl[Math.random() * tl.length | 0].id; drawTalent(np); });
}
function pause() { if (phase !== 'play') return; phase = 'paused'; ctxPanel = 'pause'; UI.showPause(); saveNow(); }
function resume() { UI.closePanel(); phase = 'play'; }
function toMenu() { saveNow(); submitScore(); showMenu(); }

// ================= main loop =================
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.11, (ts - last) / 1000 || 0.016); last = ts; W.time += dt;
  if (autoTier === null && S && S.quality === 'auto' && phase !== 'loading' && fpsN < 120) { if (fpsN > 30) fpsAcc += dt; fpsN++; if (fpsN === 120) { const avg = fpsAcc / 90; autoTier = avg < 0.019 ? 'high' : avg < 0.03 ? 'med' : 'low'; if (window.lib.shouldUseTouchControls && window.lib.shouldUseTouchControls() && autoTier === 'high') autoTier = 'med'; applyAuto(); log('auto quality: ' + autoTier + ' avg ' + avg.toFixed(4)); } }
  W.updateWater(W.time);
  W.clouds.forEach((c, i) => { c.position.x += dt * (1 + i * 0.1); if (c.position.x > 480) c.position.x = -480; });
  if (mode === 'edit' || phase === 'menu' || phase === 'draw' || phase === 'loading') { orbitCamera(dt); W.updateSky(S ? S.tod : 0.4, false, 0); if (S && phase !== 'loading' && mode !== 'edit') S.tod += dt / 400; W.renderer.render(W.scene, W.camera); if (view) view.group.visible = false; return; }
  if (view) view.group.visible = true;
  if (phase === 'play' && !UI.panelOpen) {
    updateDay(dt); updatePlayer(dt); updateRaft(dt); updateSurvival(dt); updateBlackout(dt); updatePuffers(dt); updateFishing(dt); updateWorldLogic(dt);
    if (UI.input.use) { UI.input.use = false; if (P.black <= 0) useAction(); }
    saveT -= dt; if (saveT <= 0) { saveT = 20; saveNow(); } subT -= dt; if (subT <= 0) { subT = 120; submitScore(); }
  } else if (phase === 'paused') { UI.input.punch = UI.input.use = false; }
  updateEntitiesVisual(dt); updateParticles(dt); updateView(dt); flushLoot(dt); updateMarker(); updateHud(dt);
  W.updateSky(S.tod, P.under, P.depth, isDiver(), !!S.tools.goggles);
  if (P.under) W.sun.intensity *= 0.6; setUnderwater(P.under);
  W.sun.target.position.set(P.x, 0, P.z); W.sun.position.set(P.x + 80, 120, P.z + 40);
  W.renderer.render(W.scene, W.camera);
}
let orbitA = 0;
function orbitCamera(dt) {
  orbitA += dt * 0.06; const r = 95, a = orbitA;
  W.camera.position.set(Math.cos(a) * r, 30 + Math.sin(a * 0.7) * 4, Math.sin(a) * r); W.camera.lookAt(0, 8, 0);
}

// ================= handlers & boot =================
const handlers = {
  openBag() { if (phase === 'play') { phase = 'paused'; ctxPanel = 'bag'; UI.showBag('items'); } },
  pause, resume, toMenu, escape() { handlers.afterPanel(); },
  afterPanel() { UI.closePanel(); if (phase === 'paused') { if (ctxPanel === 'pause') UI.showPause(); else resume(); } else if (phase === 'menu') showMenu(); },
  skipFtue() { S.ftueDone = true; saveNow(); },
  userGesture() { initAudio(); }, blur() {},
  continueGame() { initAudio(); startPlay(true); },
  newGame,
  state: () => S, craft, owned, equip: equipItem, eat: eatItem, drink: drinkItem,
  isMuted: () => !!S.muted, toggleMute() { S.muted = !S.muted; setMuted(S.muted); saveNow(); },
  getQuality: () => S.quality, setQuality(q) { S.quality = q; applyAuto(); saveNow(); },
  setLanguage(l) { S.lang = l; setLang(l); UI.setStaticText(); saveNow(); document.documentElement.lang = l; document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'; UI.closePanel(); if (phase === 'menu') showMenu(); else if (phase === 'paused') UI.showPause(); },
  async showLeaderboard() { let ents = [], rank = null; try { const r = await window.lib.getTopNEntriesFromLeaderboard(10); ents = r.entries || []; rank = r.userRank; } catch (_) {} UI.showLeaderboard(ents, rank); },
  showLanguage() { UI.showLanguage(); }, hapticWin() { hap('success'); }
};
const resize = () => { const r = document.getElementById('root'); W && W.setSize(r.clientWidth, r.clientHeight); };

async function run(m) {
  mode = m || window.mode || 'play';
  const bar = (p) => setBar(p);
  const touch = !!(window.lib && window.lib.shouldUseTouchControls && window.lib.shouldUseTouchControls());
  try {
    window.lib.showGameParameters({ name: 'Deluge Drifter', params: {
      'Day length (s)': { key: 'tuning.dayLength', type: 'slider', min: 120, max: 600, step: 10 },
      'Oxygen (s)': { key: 'tuning.oxygenBase', type: 'slider', min: 10, max: 60, step: 1 },
      'Diver oxygen (s)': { key: 'tuning.oxygenDiver', type: 'slider', min: 20, max: 120, step: 5 },
      'Boxer punch damage': { key: 'tuning.punchDamageBoxer', type: 'slider', min: 1, max: 6, step: 0.5 },
      'Fishing casts / day': { key: 'tuning.castsPerDay', type: 'slider', min: 1, max: 10, step: 1 },
      'Pufferfish count': { key: 'tuning.pufferCount', type: 'slider', min: 0, max: 30, step: 1 },
      'Raft speed (sail)': { key: 'tuning.raftSpeedSail', type: 'slider', min: 6, max: 20, step: 1 }
    } });
  } catch (_) {}
  S = freshState();
  const canvas = document.getElementById('view');
  W = await createWorld(canvas, { touch }, (p) => bar(0.1 + p * 0.7));
  W.setSize(document.getElementById('root').clientWidth, document.getElementById('root').clientHeight); window.addEventListener('resize', resize);
  // saved game
  if (mode === 'play') { try { const r = await window.lib.getUserGameState(); if (r && r.state) S = mergeState(freshState(), r.state); } catch (_) {} }
  setLang(S.lang); setMuted(S.muted); bar(0.9);
  W.applyQuality(touch ? 'med' : 'high'); initParticles(); buildViewModel(); W.camera.position.set(60, 16, 0); bar(0.97);
  document.getElementById('loadtip').textContent = t('tip' + (1 + (Date.now() % 3)));
  if (mode === 'edit') { buildEntitiesEditOnly(); document.getElementById('loading').style.display = 'none'; requestAnimationFrame(frame); return; }
  UI = createUI(document.getElementById('ui'), handlers); UI.setStaticText();
  await tick(); bar(1); document.getElementById('loading').style.display = 'none';
  showMenu(); applyAuto(); requestAnimationFrame(frame);
}
function buildEntitiesEditOnly() { if (!S) S = freshState(); W.raftMesh.visible = true; syncRaftVisual(); }
window.run = run;
window.__dd = { get S() { return S; }, P, R, get ents() { return ents; }, get puffers() { return puffers; }, get W() { return W; }, get phase() { return phase; }, handlers, craft, get UI() { return UI; } };
