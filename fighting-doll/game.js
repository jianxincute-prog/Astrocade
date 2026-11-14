/*
 * FIGHTING DOLL 3D — portrait 9:16 (720x1280) kids' brawler in a square boxing ring.
 * Pick one of 10 chibi 3D dolls, then win best-of-3 rounds against the CPU.
 * Move with the joystick, JUMP, PUNCH, spinning KICK, and charge a SPECIAL (stars, hearts, fire, bolts...).
 * Win streaks raise the CPU level and change the arena. Score goes to the leaderboard.
 * Files: characters.js (roster) · model.js (3D dolls + pose animation) · arena.js (ring/stands/sky) ·
 *        fx3d.js (sprite particles) · audio.js (synth sfx/music) · game.js (logic, camera, UI).
 * Three.js (r128) is loaded from cdnjs in index.html. A transparent 2D canvas on top draws HUD/menus.
 */
import { CHARS } from './characters.js';
import { Audio } from './audio.js';
import { buildChar, poseChar, setFlash } from './model.js';
import { buildArena, HALF, BOUND } from './arena.js';
import { FX, shadowTexture, glowTexture } from './fx3d.js';
const THREE = window.THREE;

const W = 720, H = 1280, S = 1.5, GLH = 935;     // UI canvas size, backing scale, height of the 3D viewport
const GRAV = 28, JUMP_V = 10.5, FONT = '"Arial Rounded MT Bold","Trebuchet MS","Segoe UI",Verdana,sans-serif';
const MOVES = {
  punch:   { dur: 0.36, hitAt: 0.12, reach: 2.3, arc: 0.8,  dmg: 7,  kb: 5,  stun: 0.42, freeze: 0.06, lunge: 5.5 },
  kick:    { dur: 0.50, hitAt: 0.22, reach: 2.8, arc: 1.0,  dmg: 11, kb: 9,  stun: 0.55, freeze: 0.09, lunge: 6.5 },
  special: { dur: 0.90, fireAt: 0.50, dmg: 22, kb: 13, stun: 0.85 },
};
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k = clamp(k, 0, 1), k * k * (3 - 2 * k));
const pick = (a) => a[(Math.random() * a.length) | 0];
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const cfg = () => (window.gameConfig && window.gameConfig.settings) || {};

let ctx, uiCanvas, glCanvas, loaded = false, failed = null;
let renderer, scene, camera, fx, arenas = [], viewH = GLH;
const MODELS = [], PORT = [];
const G = {
  scene: 'title', t: 0, ad: 0, fade: 1, paused: false, slow: 1, freeze: 0, shake: 0, zoom: 0, down: null,
  streak: 0, total: 0, best: 0, charIdx: 0, oppIdx: 1, level: 1, theme: 0,
  fighters: [], projs: [], hits: [], match: null, ctl: { sx: 0, sz: 0, stick: null }, keys: {}, ptrs: {}, toast: null, mode: 'play',
  dolls: [], resultT: 0,
};
const CAM = { px: 0, py: 6, pz: 12, lx: 0, ly: 1, lz: 0, snap: true };

/* ------------------------------------------------------------ 3D helpers */
function setView(h) { if (h !== viewH && camera) { viewH = h; camera.aspect = W / h; camera.updateProjectionMatrix(); } }
function useArena(i) { arenas.forEach((a, k) => { a.group.visible = k === i; }); arenas[i].apply(scene); G.theme = i; G.arena = arenas[i]; }
function render3D() {
  renderer.setScissorTest(false); renderer.clear();
  renderer.setViewport(0, GLH - viewH, W, viewH); renderer.setScissor(0, GLH - viewH, W, viewH); renderer.setScissorTest(true);
  renderer.render(scene, camera);
}
function placeCamera(px, py, pz, lx, ly, lz, dt, rate = 6) {
  const k = CAM.snap ? 1 : 1 - Math.exp(-rate * dt);
  CAM.px = lerp(CAM.px, px, k); CAM.py = lerp(CAM.py, py, k); CAM.pz = lerp(CAM.pz, pz, k);
  CAM.lx = lerp(CAM.lx, lx, k); CAM.ly = lerp(CAM.ly, ly, k); CAM.lz = lerp(CAM.lz, lz, k); CAM.snap = false;
  const sh = G.shake * 0.02;
  camera.position.set(CAM.px + (sh ? rand(-sh, sh) : 0), CAM.py + (sh ? rand(-sh, sh) : 0), CAM.pz);
  camera.lookAt(CAM.lx, CAM.ly, CAM.lz);
  const fov = 48 - G.zoom * 55; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
function projectToScreen(x, y, z) { const v = new THREE.Vector3(x, y, z).project(camera); return { x: (v.x * 0.5 + 0.5) * W, y: (1 - (v.y * 0.5 + 0.5)) * viewH }; }

/* ------------------------------------------------------------ models */
function getModel(ci) {
  if (!MODELS[ci]) {
    const h = buildChar(CHARS[ci]);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03;
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(CHARS[ci].color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); aura.visible = false;
    MODELS[ci] = { h, sh, aura };
  }
  return MODELS[ci];
}
function mount(f) { scene.add(f.m.h.root); scene.add(f.m.sh); scene.add(f.m.aura); }
function unmount(f) { scene.remove(f.m.h.root); scene.remove(f.m.sh); scene.remove(f.m.aura); f.m.aura.visible = false; setFlash(f.m.h, 0); }
function unmountAll() { for (const f of G.fighters.concat(G.dolls)) unmount(f); G.fighters = []; G.dolls = []; }

function makeFighter(ci, opts = {}) {
  const c = CHARS[ci], m = getModel(ci), hp = opts.hp || 100;
  Object.assign(m.h.act, { aLx: -0.9, aLz: 0.4, aRx: -0.9, aRz: -0.4, lLx: 0, lRx: 0, tRx: 0.05, tRy: 0, hRx: 0, hipY: 0, sY: 1, sXZ: 1, rRx: 0, rRy: 0, rRz: 0, rigY: 0, rigZ: 0, eye: 1, mouth: 0 });
  const f = {
    ci, c, m, img: PORT[ci], x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, yaw: 0, scale: opts.scale || 1,
    maxHp: hp, hp, lag: hp, energy: 0, state: 'idle', st: 0, flash: 0, fired: false, struck: false, combo: 0, comboT: 0,
    ph: rand(0, 6), mvAmt: 0, wins: 0, buf: null, intent: { x: 0, z: 0 }, ai: { t: 0.6, cool: 0 }, isCpu: !!opts.cpu, display: !!opts.display,
    ready: false, armor: false, side: 0, stunDur: 0.4, koLanded: false, stepAcc: 0, idleT: rand(2, 5), lastFlash: -1,
  };
  m.h.root.scale.setScalar(0.85 * f.scale); mount(f);
  return f;
}
function setState(f, s) { f.state = s; f.st = 0; f.struck = false; f.fired = false; }
function foe(f) { return G.fighters[0] === f ? G.fighters[1] : G.fighters[0]; }
function faceFoe(f) { const o = f.display ? null : foe(f); if (o) f.yaw = Math.atan2(o.x - f.x, o.z - f.z); }

function syncFighter(f, t, dt) {
  const h = f.m.h, mv = (f.state === 'walk' || f.state === 'idle') && f.y <= 0.05 ? clamp(Math.hypot(f.vx, f.vz) / (5.4 * f.c.spd), 0, 1) : 0;
  h.root.position.set(f.x, f.y, f.z); h.root.rotation.y = f.yaw;
  poseChar(h, { state: f.state, st: f.st, mv, air: f.y > 0.15 && f.state !== 'ko', vy: f.vy, side: f.side, ph: f.ph, stun: f.stunDur }, t, dt);
  const fl = f.flash > 0 ? clamp(f.flash / 0.1, 0, 1) * 0.9 : 0;
  if (Math.abs(fl - f.lastFlash) > 0.02) { setFlash(h, fl); f.lastFlash = fl; }
  const sh = f.m.sh, s = clamp(1 - f.y * 0.12, 0.45, 1) * f.scale;
  sh.position.set(f.x, 0.03, f.z); sh.scale.set(s, s, 1); sh.material.opacity = clamp(1 - f.y * 0.15, 0.3, 1);
  const au = f.m.aura, charging = f.state === 'special' && f.st < 0.62;
  au.visible = charging;
  if (charging) { const k = f.st / 0.5, r = (3.2 + 2.2 * k) * f.scale + Math.sin(t * 30) * 0.2; au.position.set(f.x, 1.3 + f.y, f.z); au.scale.set(r, r, 1); au.material.opacity = 0.95; }
}

/* ------------------------------------------------------------ fx helpers */
function burst3(x, y, z, color, n = 10, spd = 6) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.283), e = rand(-0.3, 1), v = rand(spd * 0.4, spd);
    fx.spawn(i % 3 ? 'star' : 'dot', x, y, z, { vx: Math.cos(a) * v, vy: e * v + 1.5, vz: Math.sin(a) * v, g: -12, life: rand(0.35, 0.7), size: rand(0.25, 0.55), color: i % 2 ? color : 0xffffff, spin: rand(-8, 8), drag: 2 });
  }
}
function hex(c) { return typeof c === 'string' ? parseInt(c.slice(1), 16) : c; }
function impact3(x, y, z, big, color) {
  const col = hex(color);
  fx.spawn('burst', x, y, z, { life: big ? 0.28 : 0.2, size: big ? 3.4 : 2.4, color: 0xffffff, rot: rand(0, 6), depth: false });
  fx.spawn('ring', x, y, z, { life: 0.3, size: big ? 4.2 : 3, color: 0xffffff, depth: false });
  burst3(x, y, z, col, big ? 14 : 8, big ? 9 : 6);
  fx.text(pick(big ? ['BOOM!', 'WHAM!', 'KAPOW!', 'SMASH!'] : ['POW!', 'BAM!', 'BONK!', 'POP!', 'WHAP!']), x + rand(-0.3, 0.3), y + 1.1, z, { color: pick([0xff5d8f, 0xffd23f, 0x4dd2ff, 0x7dff7d]), size: big ? 1.25 : 0.95, rot: rand(-0.15, 0.15), life: 0.75 });
}
function puff(x, z, size = 0.9, n = 1) { for (let i = 0; i < n; i++) fx.spawn('puff', x + rand(-0.2, 0.2), 0.15, z + rand(-0.2, 0.2), { vy: 0.6, vx: rand(-0.6, 0.6), vz: rand(-0.6, 0.6), life: 0.45, size, color: 0xffffff }); }

/* ------------------------------------------------------------ helpers */
/* ------------------------------------------------------------ helpers */
function txt(s, x, y, size, fill = '#fff', o = {}) {
  const { stroke = '#3a1a6e', sw = size * 0.2, align = 'center', rot = 0, sc = 1, alpha = 1, grad = null } = o;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sc !== 1) ctx.scale(sc, sc);
  ctx.globalAlpha *= alpha; ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  if (stroke && sw > 0) { ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.strokeText(s, 0, 0); }
  if (grad) { const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2); grad.forEach(([k, c]) => g.addColorStop(k, c)); ctx.fillStyle = g; } else ctx.fillStyle = fill;
  ctx.fillText(s, 0, 0); ctx.restore();
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function starPath(x, y, r, n = 5, inner = 0.45, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, rad = i % 2 ? r * inner : r; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  ctx.closePath();
}
function heartPath(x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.3, x - s * 0.5, y - s * 1.0, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 1.0, x + s * 1.1, y - s * 0.3, x, y + s * 0.35); ctx.closePath();
}
function glow(x, y, r, color, a = 0.8) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
}
const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/* ------------------------------------------------------------ combat */
function actionStart(f, a) {
  if (f.state === 'ko' || f.state === 'hit' || f.state === 'win' || f.state === 'dizzy') return false;
  if (f.state === 'punch' || f.state === 'kick' || f.state === 'special') return false;
  if (a === 'jump') {
    if (f.y > 0.05) return false;
    f.vy = JUMP_V; f.y = 0.02; Audio.jump(); puff(f.x, f.z, 0.9, 2);
    return true;
  }
  if (a === 'special') {
    if (f.energy < 100) { if (!f.isCpu && !f.display) { G.toast = { t: 0.6 }; Audio.tick(); } return false; }
    faceFoe(f); setState(f, 'special'); f.armor = true; f.vx = f.vz = 0; Audio.charge();
    if (!f.isCpu && !f.display && lib.haptics) lib.haptics.play({ intensity: 0.5, sharpness: 0.3, duration: 400 });
    return true;
  }
  faceFoe(f); setState(f, a);
  if (a === 'punch') f.side ^= 1;
  const k = MOVES[a].lunge; f.vx = Math.sin(f.yaw) * k; f.vz = Math.cos(f.yaw) * k;
  if (a === 'punch') Audio.punch(); else Audio.kick();
  return true;
}

function updateFighter(f, dt) {
  const o = foe(f), m = G.match, active = m && m.phase === 'fight';
  f.st += dt; f.flash = Math.max(0, f.flash - dt); f.comboT -= dt; if (f.comboT <= 0) f.combo = 0;
  f.ready = f.energy >= 100;
  let ix = 0, iz = 0;
  if (active && !f.isCpu) {
    const K = G.keys;
    const sx = G.ctl.sx + ((K.ArrowRight || K.KeyD) ? 1 : 0) - ((K.ArrowLeft || K.KeyA) ? 1 : 0);
    const sy = G.ctl.sz + ((K.ArrowDown || K.KeyS) ? 1 : 0) - ((K.ArrowUp || K.KeyW) ? 1 : 0);
    const th = G.camTheta || 0;                       // stick is relative to the camera: up = into the screen
    ix = Math.cos(th) * sx + Math.sin(th) * sy; iz = -Math.sin(th) * sx + Math.cos(th) * sy;
  } else if (active && f.isCpu) { aiThink(f, o, dt); ix = f.intent.x; iz = f.intent.z; }
  const im = Math.hypot(ix, iz); if (im > 1) { ix /= im; iz /= im; }
  if (f.buf) { f.buf.t -= dt; if (f.buf.t <= 0) f.buf = null; }
  const canAct = f.state === 'idle' || f.state === 'walk';
  if (active && canAct && f.buf) { if (actionStart(f, f.buf.a)) f.buf = null; }
  const spd = 5.4 * f.c.spd;
  if (canAct && active) {
    const k = clamp(dt * 12, 0, 1); f.vx = lerp(f.vx, ix * spd, k); f.vz = lerp(f.vz, iz * spd, k);
    const mv = Math.hypot(f.vx, f.vz); f.state = mv > 0.7 && f.y <= 0.05 ? 'walk' : 'idle';
    if (f.state === 'walk') { f.stepAcc += mv * dt; if (f.stepAcc > 1.1) { f.stepAcc = 0; puff(f.x, f.z, 0.5); } }
  } else if (canAct) { const d = Math.exp(-10 * dt); f.vx *= d; f.vz *= d; }
  else { const d = Math.exp(-(f.state === 'ko' ? 1.3 : f.state === 'hit' ? 5 : 8) * dt); f.vx *= d; f.vz *= d; }
  f.x += f.vx * dt; f.z += f.vz * dt;
  const b = f.state === 'ko' ? BOUND - 0.7 : BOUND; f.x = clamp(f.x, -b, b); f.z = clamp(f.z, -b, b);
  if (f.y > 0 || f.vy > 0) {
    f.vy -= GRAV * dt; f.y += f.vy * dt;
    if (f.y <= 0) {
      const hard = f.vy; f.y = 0; f.vy = 0;
      if (f.state === 'ko') { if (!f.koLanded) { f.koLanded = true; G.shake = Math.max(G.shake, 14); Audio.land(); puff(f.x, f.z, 1.6, 4); burst3(f.x, 0.3, f.z, hex(f.c.color), 8, 5); } }
      else if (hard < -6) { Audio.land(); puff(f.x, f.z, 0.9, 3); }
    }
  }
  if (canAct && o) f.yaw += angDiff(f.yaw, Math.atan2(o.x - f.x, o.z - f.z)) * (1 - Math.exp(-16 * dt));
  else if (f.state === 'win' || f.state === 'dizzy') f.yaw += angDiff(f.yaw, Math.atan2(CAM.px - f.x, CAM.pz - f.z)) * (1 - Math.exp(-6 * dt));
  if (f.state === 'punch' || f.state === 'kick') {
    const mv = MOVES[f.state];
    if (!f.struck && f.st >= mv.hitAt) { f.struck = true; tryHit(f, o, f.state); }
    if (f.st >= mv.dur) { setState(f, 'idle'); if (f.buf && active) { if (actionStart(f, f.buf.a)) f.buf = null; } }
  } else if (f.state === 'special') {
    if (!f.fired && f.st >= MOVES.special.fireAt) { f.fired = true; fireSpecial(f); }
    if (f.st >= MOVES.special.dur) { f.armor = false; setState(f, 'idle'); }
    if (f.st < MOVES.special.fireAt && Math.random() < 0.6) fx.spawn('dot', f.x + rand(-1.2, 1.2), rand(0.1, 2.4), f.z + rand(-1.2, 1.2), { vy: 3, life: 0.5, size: rand(0.25, 0.45), color: hex(f.c.color), add: true });
  } else if (f.state === 'hit') {
    if (f.st >= f.stunDur) setState(f, 'idle');
  }
  if (active && f.energy < 100 && f.state !== 'ko') {
    f.energy = Math.min(100, f.energy + 2.2 * (cfg().specialRate || 1) * dt);
    if (f.energy >= 100 && !f.isCpu) { Audio.ready(); fx.spawn('ring', f.x, 1.2, f.z, { size: 3.6, life: 0.5, color: hex(f.c.color), depth: false }); }
  }
  f.lag = f.lag > f.hp ? Math.max(f.hp, f.lag - 28 * dt) : f.hp;
}

function tryHit(a, d, kind) {
  const mv = MOVES[kind], dx = d.x - a.x, dz = d.z - a.z, dist = Math.hypot(dx, dz);
  const ang = Math.abs(angDiff(a.yaw, Math.atan2(dx, dz)));
  const airD = d.y > (kind === 'punch' ? 1.1 : 1.7) && a.y < 0.5;
  if (dist > mv.reach || ang > mv.arc || d.state === 'ko' || airD) { Audio.whiff(); return; }
  applyHit(a, d, mv, kind === 'kick', false, dx / (dist || 1), dz / (dist || 1));
}

function applyHit(a, d, mv, big, isSpecial, dirx, dirz) {
  const m = G.match;
  a.combo = (a.comboT > 0 ? a.combo : 0) + 1; a.comboT = 1.1;
  if (m && a.combo > m.maxCombo[a.isCpu ? 1 : 0]) m.maxCombo[a.isCpu ? 1 : 0] = a.combo;
  const scale = Math.pow(0.92, Math.max(0, a.combo - 1)) * a.c.pow * (cfg().damageScale || 1) * (a.isCpu ? 0.7 + 0.1 * G.level : 1);
  d.hp = Math.max(0, d.hp - mv.dmg * scale);
  impact3((a.x + d.x) / 2, 1.3 + Math.min(d.y, 1.2) * 0.6, (a.z + d.z) / 2, big, a.c.color);
  d.flash = 0.12; d.energy = Math.min(100, d.energy + (big ? 9 : 6)); a.energy = Math.min(100, a.energy + (big ? 10 : 7));
  Audio.hit(big);
  G.freeze = Math.max(G.freeze, mv.freeze || 0.08); G.shake = Math.max(G.shake, big ? 16 : 9); G.zoom = Math.max(G.zoom, big ? 0.05 : 0.025);
  if ((!d.isCpu || !a.isCpu) && lib.haptics) lib.haptics.play(big ? 'thud' : 'tap');
  if (d.hp <= 0) { knockOut(a, d, dirx, dirz); return; }
  if (d.armor && !isSpecial) return;
  d.armor = false; setState(d, 'hit'); d.stunDur = mv.stun; d.vx = dirx * mv.kb; d.vz = dirz * mv.kb; d.buf = null;
  if (isSpecial) { d.vy = 6; d.y = 0.05; }
}

function knockOut(a, d, dirx, dirz) {
  const m = G.match; if (!m || m.phase !== 'fight') return;
  d.armor = false; setState(d, 'ko'); d.vy = 9; d.y = 0.05; d.vx = dirx * 6.5; d.vz = dirz * 6.5; d.koLanded = false; a.buf = null;
  m.phase = 'ko'; m.phaseT = 0; m.winner = a; G.slow = 0.28; G.freeze = 0.18; G.shake = 30; G.zoom = 0.1;
  Audio.ko(); if (lib.haptics) lib.haptics.play('error');
  for (let i = 0; i < 26; i++) fx.spawn('star', d.x, 1.4, d.z, { vx: rand(-9, 9), vy: rand(1, 9), vz: rand(-9, 9), g: -12, size: rand(0.3, 0.7), color: pick([0xffe14d, 0xffffff, hex(a.c.color)]), life: rand(0.6, 1.2), spin: rand(-12, 12), drag: 1 });
}

/* ------------------------------------------------------------ special-move projectiles */
const PGEO = {};
function shapeGeo(kind) {
  if (PGEO[kind]) return PGEO[kind];
  const sh = new THREE.Shape(); let geo;
  if (kind === 'heart') { sh.moveTo(0, -0.7); sh.bezierCurveTo(-1.1, 0, -0.7, 0.9, 0, 0.35); sh.bezierCurveTo(0.7, 0.9, 1.1, 0, 0, -0.7); }
  else if (kind === 'bolt') { [[0.35, 1], [-0.25, 0.1], [0.1, 0.1], [-0.4, -1], [0.2, -0.05], [-0.1, -0.05]].forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); }
  else if (kind === 'shuriken') { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 0.28 : 0.95; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } }
  else if (kind === 'wave') { geo = new THREE.TorusGeometry(0.7, 0.22, 8, 22, Math.PI); }
  else if (kind === 'fire') { geo = new THREE.SphereGeometry(0.62, 16, 12); }
  else { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.46 : 1; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } }
  if (!geo) { geo = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); geo.center(); }
  return (PGEO[kind] = geo);
}
const PCOL = { star: 0xffe14d, heart: 0xff5d9e, bolt: 0xffe94d, shuriken: 0x34344f, wave: 0xe8f8ff, fire: 0xff8a1f };
function makeProjMesh(kind, color) {
  const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
  const body = new THREE.Mesh(shapeGeo(kind), new THREE.MeshBasicMaterial({ color: PCOL[kind] || 0xffe14d })); spin.add(body);
  const ol = new THREE.Mesh(shapeGeo(kind), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide })); ol.scale.setScalar(1.14); spin.add(ol);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(hex(color)), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(3.6, 3.6, 1); g.add(glow);
  g.userData.spin = spin; g.scale.setScalar(1.15); return g;
}
function fireSpecial(f) {
  const o = f.display ? null : foe(f); Audio.special();
  G.shake = Math.max(G.shake, 12); G.zoom = Math.max(G.zoom, 0.04);
  if (!f.display && lib.haptics) lib.haptics.play({ intensity: 0.9, sharpness: 0.5, duration: 120 });
  f.energy = 0; if (o) f.yaw = Math.atan2(o.x - f.x, o.z - f.z);
  const dx = Math.sin(f.yaw), dz = Math.cos(f.yaw), mesh = makeProjMesh(f.c.kind, f.c.color); scene.add(mesh);
  G.projs.push({ x: f.x + dx * 1.1, z: f.z + dz * 1.1, vx: dx * 15, vz: dz * 15, owner: f, kind: f.c.kind, color: f.c.color, t: 0, dead: false, mesh, display: f.display });
  fx.spawn('ring', f.x + dx, 1.3, f.z + dz, { size: 3.4, life: 0.4, color: hex(f.c.color), depth: false });
}
function killProj(p) { scene.remove(p.mesh); p.dead = true; }
function updateProjs(dt) {
  for (const p of G.projs) {
    p.t += dt; p.x += p.vx * dt; p.z += p.vz * dt;
    const y = 1.3 + Math.sin(p.t * 14) * 0.08;
    p.mesh.position.set(p.x, y, p.z); p.mesh.quaternion.copy(camera.quaternion); p.mesh.userData.spin.rotation.z += dt * (p.kind === 'shuriken' ? 22 : 6);
    if (Math.random() < 0.8) fx.spawn(p.kind === 'heart' ? 'heart' : 'dot', p.x - p.vx * 0.05, y + rand(-0.3, 0.3), p.z - p.vz * 0.05, { vx: rand(-0.5, 0.5), vy: rand(-0.4, 0.4), vz: rand(-0.5, 0.5), life: 0.4, size: rand(0.3, 0.55), color: Math.random() < 0.5 ? hex(p.color) : 0xffffff, add: p.kind !== 'heart' });
    if (Math.abs(p.x) > HALF + 3 || Math.abs(p.z) > HALF + 3) { killProj(p); continue; }
    const d = p.display ? null : foe(p.owner);
    if (d && G.match && G.match.phase === 'fight' && d.state !== 'ko' && Math.hypot(p.x - d.x, p.z - d.z) < 1.0 && d.y < 1.5) {
      const L = Math.hypot(p.vx, p.vz) || 1; killProj(p); applyHit(p.owner, d, MOVES.special, true, true, p.vx / L, p.vz / L); G.freeze = 0.14;
      burst3(p.x, 1.3, p.z, hex(p.color), 24, 11); fx.spawn('ring', p.x, 1.3, p.z, { size: 5.5, life: 0.5, color: hex(p.color), depth: false }); continue;
    }
    for (const q of G.projs) if (q !== p && !q.dead && !p.dead && q.owner !== p.owner && Math.hypot(q.x - p.x, q.z - p.z) < 1.0) { killProj(p); killProj(q); burst3(p.x, 1.3, p.z, 0xffffff, 20, 9); fx.spawn('ring', p.x, 1.3, p.z, { size: 5, life: 0.5, color: 0xffffff, depth: false }); Audio.hit(true); G.shake = 14; }
  }
  G.projs = G.projs.filter((p) => !p.dead);
}
function clearProjs() { for (const p of G.projs) scene.remove(p.mesh); G.projs = []; }

/* ------------------------------------------------------------ CPU brain */
function aiThink(f, o, dt) {
  const a = f.ai, lvl = G.level; a.t -= dt; a.cool -= dt;
  if (f.state !== 'idle' && f.state !== 'walk') return;
  if (a.t > 0) return;
  a.t = rand(0.16, 0.42) * (1.25 - 0.1 * lvl);
  const dx = o.x - f.x, dz = o.z - f.z, dist = Math.hypot(dx, dz) || 1, ux = dx / dist, uz = dz / dist, px = -uz, pz = ux;
  f.intent = { x: 0, z: 0 };
  const inc = G.projs.find((p) => p.owner === o && Math.hypot(p.x - f.x, p.z - f.z) < 7 && ((f.x - p.x) * p.vx + (f.z - p.z) * p.vz) > 0);
  if (inc) {
    const L = Math.hypot(inc.vx, inc.vz), nx = inc.vx / L, nz = inc.vz / L, lat = (f.x - inc.x) * -nz + (f.z - inc.z) * nx;
    if (Math.abs(lat) < 1.6 && Math.random() < 0.2 + 0.12 * lvl) {
      if (f.y <= 0.05 && Math.random() < 0.35) { actionStart(f, 'jump'); return; }
      const sg = lat >= 0 ? 1 : -1; f.intent = { x: -nz * sg, z: nx * sg }; a.t = 0.4; return;
    }
  }
  if (f.energy >= 100 && dist > 3.6 && Math.random() < 0.55) { actionStart(f, 'special'); return; }
  if (f.energy >= 100 && dist <= 3.6 && Math.random() < 0.25) { actionStart(f, 'special'); return; }
  const oAtk = o.state === 'punch' || o.state === 'kick';
  if (dist > 2.5) {
    const sg = Math.random() < 0.5 ? 1 : -1, st = Math.random() < 0.3 ? 0.5 * sg : 0;
    f.intent = { x: ux + px * st, z: uz + pz * st };
    if (Math.random() < 0.03 + 0.012 * lvl) actionStart(f, 'jump');
  } else if (a.cool <= 0 && !oAtk && Math.random() < 0.42 + 0.09 * lvl) {
    actionStart(f, Math.random() < 0.58 ? 'punch' : 'kick'); a.cool = rand(0.2, 0.55) * (1.2 - 0.1 * lvl);
  } else if (oAtk && Math.random() < 0.08 * lvl) { f.intent = { x: -ux, z: -uz }; }
  else if (Math.random() < 0.25) { const sg = Math.random() < 0.5 ? 1 : -1; f.intent = { x: -ux * 0.4 + px * sg, z: -uz * 0.4 + pz * sg }; }
}

/* ------------------------------------------------------------ UI */
/* ------------------------------------------------------------ UI */
function addHit(id, x, y, w, h, fn, down) { G.hits.push({ id, x, y, w, h, fn, down }); }
function button(id, label, x, y, w, h, c1, c2, fn, o = {}) {
  const pressed = G.down === id, pulse = o.pulse ? 1 + 0.04 * Math.sin(G.t * 6) : 1;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale((pressed ? 0.92 : 1) * pulse, (pressed ? 0.92 : 1) * pulse);
  rr(-w / 2, -h / 2 + 8, w, h, h * 0.3); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, c1); g.addColorStop(1, c2);
  rr(-w / 2, -h / 2, w, h, h * 0.3); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke();
  rr(-w / 2 + 10, -h / 2 + 8, w - 20, h * 0.38, h * 0.2); ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fill();
  if (label) txt(label, 0, 2, o.size || h * 0.42, '#fff', { stroke: o.stroke || '#2a114f' });
  if (o.icon) o.icon(0, 0, h);
  ctx.restore();
  addHit(id, x, y, w, h, fn, o.onDown);
}
function iconSpeaker(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a114f'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-26, -12); ctx.lineTo(-10, -12); ctx.lineTo(8, -28); ctx.lineTo(8, 28); ctx.lineTo(-10, 12); ctx.lineTo(-26, 12); ctx.closePath(); ctx.stroke(); ctx.fill();
  if (!Audio.muted) { ctx.lineCap = 'round'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(10, 0, 16, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(10, 0, 30, -0.8, 0.8); ctx.stroke(); }
  else { ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(14, -16); ctx.lineTo(36, 16); ctx.moveTo(36, -16); ctx.lineTo(14, 16); ctx.stroke(); }
  ctx.restore();
}
function iconBack(x, y) { ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#fff'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(12, -26); ctx.lineTo(-14, 0); ctx.lineTo(12, 26); ctx.stroke(); ctx.restore(); }
function iconPause(x, y) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a114f'; ctx.lineWidth = 4; for (const dx of [-14, 6]) { rr(x + dx, y - 22, 14, 44, 5); ctx.fill(); ctx.stroke(); } }
function soundBtn(x, y) { button('snd', '', x, y, 96, 96, '#7b5cff', '#4a35c9', toggleSound, { icon: iconSpeaker }); }
function toggleSound() { Audio.init(); Audio.setMuted(!Audio.muted); if (!Audio.muted) { Audio.resume(); Audio.select(); } saveProgress(); }

/* ------------------------------------------------------------ match flow */
function startMatch() {
  useArena(G.streak % 3); setView(GLH);
  G.level = clamp((cfg().cpuLevel || 2) + G.streak * 0.5, 1, 7);
  G.match = { round: 1, pw: 0, cw: 0, phase: 'intro', phaseT: 0, time: cfg().roundTime || 60, maxCombo: [0, 0], winner: null, score: 0, announced: 0, decided: false };
  G.scene = 'fight'; Audio.music('fight');
  startRound(true);
}
function startRound(first) {
  const m = G.match, hp = cfg().startHp || 100, prev = G.fighters.slice();
  unmountAll(); clearProjs(); fx.clear();
  const p = makeFighter(G.charIdx, { hp }), c = makeFighter(G.oppIdx, { hp, cpu: true });
  p.wins = m.pw; c.wins = m.cw;
  if (!first && prev.length) { p.energy = Math.min(60, prev[0].energy * 0.4); c.energy = Math.min(60, prev[1].energy * 0.4); }
  p.x = -1.9; c.x = 1.9; p.yaw = Math.PI / 2; c.yaw = -Math.PI / 2; p.y = 7; c.y = 7; G.camTheta = 0;
  G.fighters = [p, c]; G.slow = 1;
  m.phase = 'intro'; m.phaseT = 0; m.time = cfg().roundTime || 60; m.winner = null; m.announced = 0; m.decided = false; G.ctl.sx = G.ctl.sz = 0;
  CAM.snap = true;
}
function endMatch() {
  const m = G.match, p = G.fighters[0], won = m.pw >= 2;
  let sc = 0;
  if (won) sc = 1000 + Math.round(p.hp * 10) + m.maxCombo[0] * 60 + G.streak * 200;
  else sc = Math.round(m.pw * 250 + m.maxCombo[0] * 30);
  m.score = sc; m.won = won; G.total += sc;
  if (won) G.streak++;
  if (G.total > G.best) G.best = G.total;
  submitScore(G.total); saveProgress();
  G.scene = 'result'; G.resultT = 0;
  const [fp, fc] = G.fighters, wf = won ? fp : fc, lf = won ? fc : fp;
  setState(wf, 'win'); wf.armor = false; if (lf.state !== 'ko') setState(lf, 'dizzy');
  if (won) {
    Audio.win();
    for (let i = 0; i < 70; i++) fx.spawn(i % 2 ? 'star' : 'dot', wf.x + rand(-6, 6), rand(6, 11), wf.z + rand(-4, 4), { vx: rand(-0.6, 0.6), vy: rand(-3, -1), vz: rand(-0.6, 0.6), g: -0.5, size: rand(0.3, 0.6), color: pick([0xff5d8f, 0xffd23f, 0x4dd2ff, 0x7dff7d, 0xc58bff]), life: rand(3, 4.5), spin: rand(-6, 6), drag: 0.2 });
    if (lib.haptics) lib.haptics.play('success');
  } else Audio.lose();
}
async function submitScore(v) { try { if (v > 0) await lib.addPlayerScoreToLeaderboard(v); } catch (e) {} }
function saveProgress() { try { const r = lib.saveUserGameState({ best: G.best, char: G.charIdx, sound: !Audio.muted }); if (r && r.catch) r.catch(() => {}); } catch (e) {} }

function updateMatch(dt) {
  const m = G.match; if (!m) return;
  m.phaseT += dt;
  if (m.phase === 'intro') {
    for (const f of G.fighters) {
      f.st += dt;
      if (f.y > 0 || f.vy > 0) { f.vy -= GRAV * 0.6 * dt; f.y += f.vy * dt; if (f.y <= 0) { f.y = 0; f.vy = 0; Audio.land(); G.shake = 8; puff(f.x, f.z, 1.4, 4); } }
    }
    if (m.announced === 0 && m.phaseT > 0.25) { m.announced = 1; Audio.ding(); }
    if (m.announced === 1 && m.phaseT > 1.25) { m.announced = 2; Audio.fight(); G.shake = 10; }
    if (m.phaseT > 1.9) { m.phase = 'fight'; m.phaseT = 0; }
    return;
  }
  if (m.phase === 'fight') {
    m.time -= dt;
    if (m.time <= 0) {
      m.time = 0; const [p, c] = G.fighters;
      m.phase = 'timeup'; m.phaseT = 0; m.winner = p.hp >= c.hp ? p : c; Audio.ding();
    }
  }
  if (m.phase === 'ko' || m.phase === 'timeup') {
    if (m.phase === 'ko' && m.phaseT > 1.0) G.slow = lerp(G.slow, 1, clamp(dt * 3, 0, 1));
    const wait = m.phase === 'ko' ? 2.6 : 2.2;
    if (m.phaseT > 0.5 && m.winner && m.winner.state !== 'win' && m.winner.state !== 'ko') { setState(m.winner, 'win'); m.winner.armor = false; }
    if (m.phaseT > wait && !m.decided) {
      m.decided = true; G.slow = 1;
      if (m.winner === G.fighters[0]) m.pw++; else m.cw++;
      if (m.pw >= 2 || m.cw >= 2) endMatch(); else { m.round++; startRound(false); }
    }
  }
}
function pushApart() {
  const [a, b] = G.fighters; if (!a || !b) return;
  if (a.state === 'ko' || b.state === 'ko' || a.y > 1.2 || b.y > 1.2) return;
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = 1.5;
  if (d < min && d > 0.001) { const p = (min - d) / 2, nx = dx / d, nz = dz / d; a.x = clamp(a.x - nx * p, -BOUND, BOUND); a.z = clamp(a.z - nz * p, -BOUND, BOUND); b.x = clamp(b.x + nx * p, -BOUND, BOUND); b.z = clamp(b.z + nz * p, -BOUND, BOUND); }
}
function pickOpponent() { let i; do { i = (Math.random() * CHARS.length) | 0; } while (i === G.charIdx); G.oppIdx = i; }

/* ------------------------------------------------------------ menu dolls (title / select / edit) */
function showOff(f, a) {
  if (f.state !== 'idle' || f.y > 0.05) return;
  const act = a || pick(['punch', 'kick', 'special', 'jump']);
  if (act === 'jump') { f.vy = 9; Audio.boing(); fx.spawn('heart', f.x, 3, f.z, { vy: 2.5, g: -1, size: 0.6, color: 0xff7fb0, life: 1, spin: 2 }); return; }
  f.baseYaw = f.baseYaw === undefined ? f.yaw : f.baseYaw;
  f.yaw = f.x < -0.5 ? Math.PI / 2 : f.x > 0.5 ? -Math.PI / 2 : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
  setState(f, act); f.armor = false;
  if (act === 'punch') { f.side ^= 1; Audio.punch(); } else if (act === 'kick') Audio.kick(); else { Audio.charge(); f.energy = 100; }
}
function updateDisplay(f, dt, spin) {
  f.st += dt; f.flash = Math.max(0, f.flash - dt);
  if (f.y > 0 || f.vy > 0) { f.vy -= GRAV * dt; f.y += f.vy * dt; if (f.y <= 0) { f.y = 0; f.vy = 0; Audio.land(); puff(f.x, f.z, 0.8, 2); } }
  const mv = MOVES[f.state];
  if (f.state === 'punch' || f.state === 'kick') {
    if (!f.struck && f.st >= mv.hitAt) { f.struck = true; impact3(f.x + Math.sin(f.yaw) * 2, 1.4, f.z + Math.cos(f.yaw) * 2, f.state === 'kick', f.c.color); }
    if (f.st >= mv.dur) setState(f, 'idle');
  } else if (f.state === 'special') {
    if (!f.fired && f.st >= mv.fireAt) { f.fired = true; fireSpecial(f); }
    if (f.st < mv.fireAt && Math.random() < 0.6) fx.spawn('dot', f.x + rand(-1.2, 1.2), rand(0.1, 2.4), f.z + rand(-1.2, 1.2), { vy: 3, life: 0.5, size: rand(0.25, 0.45), color: hex(f.c.color), add: true });
    if (f.st >= mv.dur) setState(f, 'idle');
  } else if (f.state === 'idle' && f.y <= 0) {
    const base = f.baseYaw === undefined ? f.yaw : f.baseYaw;
    f.yaw += angDiff(f.yaw, spin ? base + Math.sin(G.t * 0.9) * 0.65 : base) * (1 - Math.exp(-8 * dt));
    f.idleT -= dt; if (f.idleT < 0) { f.idleT = rand(2.5, 6); if (Math.random() < 0.6) f.vy = 6.5; }
  }
}

/* ------------------------------------------------------------ scenes: title */
function enterTitle() {
  G.scene = 'title'; unmountAll(); clearProjs(); fx.clear(); useArena(0); setView(GLH); G.paused = false;
  const ids = CHARS.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 3), pos = [[-2.9, 0.7], [0, -0.6], [2.9, 0.7]], sc = [1.1, 1.38, 1.1];
  G.dolls = ids.map((ci, i) => { const f = makeFighter(ci, { display: true, scale: sc[i] }); f.x = pos[i][0]; f.z = pos[i][1]; f.yaw = (1 - i) * 0.3; f.baseYaw = f.yaw; return f; });
  CAM.snap = true; Audio.music('menu');
}
function drawTitle(dt) {
  for (const f of G.dolls) { updateDisplay(f, dt, false); syncFighter(f, G.t, dt); }
  fx.update(dt); updateProjs(dt);
  placeCamera(Math.sin(G.t * 0.35) * 1.2, 4.6, 11.8, 0, 3.0, 0, dt);
  G.arena.crowdUpdate(G.t); G.arena.cloudUpdate(G.t); G.arena.ropeUpdate(camera.position.x, camera.position.z); render3D();
  for (const f of G.dolls) { const s = projectToScreen(f.x, 1.5 * f.scale, f.z); addHit('doll' + f.ci, s.x - 110, s.y - 190, 220, 380, () => showOff(f), true); }
  const wob = (i) => Math.sin(G.t * 3 + i * 0.7) * 8, l1 = 'FIGHTING', l2 = 'DOLL';
  ctx.save(); ctx.translate(360, 215); ctx.rotate(-0.04);
  let x = -250; for (let i = 0; i < l1.length; i++) { ctx.font = `900 112px ${FONT}`; const w = ctx.measureText(l1[i]).width; txt(l1[i], x + w / 2, wob(i), 112, '#fff', { grad: [[0, '#fff7a8'], [1, '#ffb52e']], stroke: '#43186e', sw: 22 }); x += w + 2; }
  ctx.restore();
  ctx.save(); ctx.translate(360, 365); ctx.rotate(0.03);
  const sc = 1 + 0.03 * Math.sin(G.t * 4);
  x = -215 * sc; for (let i = 0; i < l2.length; i++) { ctx.font = `900 200px ${FONT}`; const w = ctx.measureText(l2[i]).width * sc; txt(l2[i], x + w / 2, wob(i + 3), 200, '#fff', { grad: [[0, '#ffd6f2'], [1, '#ff5db1']], stroke: '#43186e', sw: 30, sc }); x += w; }
  ctx.restore();
  button('play', 'PLAY', 130, 985, 460, 150, '#5dff8a', '#16b84a', () => { Audio.select(); go('select'); }, { size: 78, pulse: true });
  if (G.best > 0) txt('★ ' + fmt(G.best), 360, 1195, 46, '#ffe14d', { sw: 10 });
  soundBtn(610, 14);
}

/* ------------------------------------------------------------ scenes: select */
let selDoll = null, selBounce = 0;
function enterSelect() {
  G.scene = 'select'; unmountAll(); clearProjs(); fx.clear(); useArena(0); setView(540); selDoll = null; setSel(G.charIdx);
  CAM.snap = true;
}
function setSel(i) {
  if (selDoll) unmount(selDoll);
  G.charIdx = i; selDoll = makeFighter(i, { display: true, scale: 1.5 }); selDoll.baseYaw = 0; G.dolls = [selDoll]; selBounce = 0.3;
}
function drawSelect(dt) {
  updateDisplay(selDoll, dt, true); selBounce = Math.max(0, selBounce - dt);
  selDoll.scale = 1.5 * (1 + selBounce * 0.4 * Math.sin(selBounce * 40)); selDoll.m.h.root.scale.setScalar(0.85 * selDoll.scale);
  syncFighter(selDoll, G.t, dt); fx.update(dt); updateProjs(dt);
  placeCamera(0, 2.9, 8.2, 0, 1.75, 0, dt);
  G.arena.crowdUpdate(G.t); G.arena.cloudUpdate(G.t); G.arena.ropeUpdate(camera.position.x, camera.position.z); render3D();
  const pg = ctx.createLinearGradient(0, 540, 0, H); pg.addColorStop(0, '#3b1f7a'); pg.addColorStop(1, '#1d0f45');
  ctx.save(); ctx.fillStyle = pg; ctx.fillRect(0, 540, W, H - 540); ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 540, W, 6); ctx.restore();
  const c = CHARS[G.charIdx];
  addHit('prev', 120, 110, 480, 420, () => showOff(selDoll), true);
  txt(c.name, 360, 64, 56, '#fff', { sw: 12 });
  const bar = (label, v, y, col) => { ctx.save(); txt(label, 36, y, 22, '#fff', { align: 'left', sw: 6 }); rr(130, y - 9, 130, 18, 9); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill(); rr(130, y - 9, 130 * clamp((v - 0.8) / 0.4, 0.1, 1), 18, 9); ctx.fillStyle = col; ctx.fill(); ctx.restore(); };
  bar('SPD', c.spd, 140, '#4dd2ff'); bar('POW', c.pow, 172, '#ff6a6a');
  const cw = 150, ch = 150, gap = 12, gy = 566, cols = 4, n = CHARS.length;
  CHARS.forEach((ch2, i) => {
    const row = (i / cols) | 0, inRow = Math.min(cols, n - row * cols), col = i % cols;
    const x = (W - (inRow * cw + (inRow - 1) * gap)) / 2 + col * (cw + gap), y = gy + row * (ch + gap), sel = i === G.charIdx, img = PORT[i];
    const bump = sel ? 1.05 + 0.02 * Math.sin(G.t * 8) : 1, pr = G.down === 'card' + i ? 0.94 : 1;
    ctx.save(); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(pr * bump, pr * bump);
    rr(-cw / 2, -ch / 2, cw, ch, 24); const g = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2); g.addColorStop(0, sel ? '#fff7b0' : '#ffffff'); g.addColorStop(1, sel ? '#ffd23f' : '#d9d2ff'); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = sel ? 8 : 4; ctx.strokeStyle = sel ? ch2.color : '#6a4ad6'; ctx.stroke();
    if (img && img.naturalWidth) { const s2 = Math.min(122 / img.naturalHeight, 128 / img.naturalWidth), iw = img.naturalWidth * s2, ih = img.naturalHeight * s2; ctx.drawImage(img, -iw / 2, -ih / 2 + 2, iw, ih); }
    ctx.restore();
    addHit('card' + i, x, y, cw, ch, () => { if (i !== G.charIdx) Audio.boing(); else Audio.select(); setSel(i); burst3(0, 1.6, 0, hex(CHARS[i].color), 12, 7); }, true);
  });
  button('fight', 'FIGHT!', 130, 1160, 460, 100, '#ff7a7a', '#e0243f', () => { Audio.select(); G.streak = 0; G.total = 0; pickOpponent(); saveProgress(); go('fight'); }, { size: 56, pulse: true });
  button('back', '', 14, 10, 96, 96, '#7b5cff', '#4a35c9', () => { Audio.select(); go('title'); }, { icon: iconBack });
  soundBtn(610, 14);
}

/* ------------------------------------------------------------ scene: fight (3D camera, 2D overlay) */
function fightCamera(dt) {
  const [p, c] = G.fighters;
  const mx = (p.x + c.x) / 2, mz = (p.z + c.z) / 2, dx = c.x - p.x, dz = c.z - p.z, len = Math.hypot(dx, dz);
  // keep the camera perpendicular to the line between the fighters (side-on view), staying on the open side of the ring
  if (len > 0.8) {
    const px = -dz / len, pz = dx / len, w1 = Math.atan2(px, pz), w2 = Math.atan2(-px, -pz), cur = G.camTheta || 0;
    const want = Math.abs(angDiff(cur, w1)) <= Math.abs(angDiff(cur, w2)) ? w1 : w2;
    G.camTheta = cur + angDiff(cur, want) * (1 - Math.exp(-2.5 * dt));
  }
  const th = G.camTheta || 0;
  const ft = Math.tan(camera.fov * Math.PI / 360), visW = 2 * ft * camera.aspect;
  const D = clamp(Math.max((len * 0.92 + 3.4) / visW, 8.5), 8.5, 22), pitch = 0.5;
  placeCamera(mx * 0.85 + Math.sin(th) * D * Math.cos(pitch), 1.3 + D * Math.sin(pitch), mz * 0.85 + Math.cos(th) * D * Math.cos(pitch), mx * 0.9, 1.1, mz * 0.9, dt, 5);
}
function drawPanel() {
  const g = ctx.createLinearGradient(0, GLH, 0, H); g.addColorStop(0, '#3b1f7a'); g.addColorStop(1, '#1d0f45');
  ctx.fillStyle = g; ctx.fillRect(0, GLH, W, H - GLH);
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = GLH + 20; y < H; y += 36) for (let x = ((y / 36) % 2) * 18; x < W; x += 36) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, GLH, W, 6);
}
function drawBanner() {
  const m = G.match;
  if (m.phase === 'intro') {
    if (m.announced <= 1) { const k = clamp((m.phaseT - 0.25) / 0.35, 0, 1), s = ease(k) * 1.15 - 0.15 * k; txt('ROUND ' + m.round, 360, 480, 118, '#fff', { grad: [[0, '#fff'], [1, '#aee4ff']], sc: Math.max(0.01, s), sw: 26 }); }
    else { const k = clamp((m.phaseT - 1.25) / 0.25, 0, 1), s = 0.4 + ease(k) * 1.0 + Math.sin(m.phaseT * 30) * 0.02; txt('FIGHT!', 360, 480, 170, '#fff', { grad: [[0, '#ffe14d'], [1, '#ff5d3d']], sc: s, sw: 30, alpha: m.phaseT > 1.7 ? clamp((1.9 - m.phaseT) * 5, 0, 1) : 1 }); }
  } else if (m.phase === 'ko' || m.phase === 'timeup') {
    const k = clamp(m.phaseT / 0.35, 0, 1), s = ease(k) * 1.1;
    if (m.phaseT < 2.4) txt(m.phase === 'ko' ? 'K.O.!' : 'TIME UP!', 360, 470, m.phase === 'ko' ? 190 : 130, '#fff', { grad: m.phase === 'ko' ? [[0, '#ff9a9a'], [1, '#ff2d55']] : [[0, '#fff7a8'], [1, '#ffb52e']], sc: Math.max(0.01, s), sw: 30, rot: -0.06 });
  }
}
const CTL = { stick: { cx: 130, cy: 1130, r: 100 }, special: { cx: 450, cy: 1005, r: 72 }, jump: { cx: 612, cy: 1000, r: 66 }, punch: { cx: 428, cy: 1170, r: 78 }, kick: { cx: 600, cy: 1160, r: 78 } };
function drawControls() {
  const f = G.fighters[0];
  const held = (k) => G.pressed && G.pressed[k] > 0;
  // joystick
  const st = CTL.stick, s = G.ctl.stick, kx = s ? s.dx : 0, ky = s ? s.dy : 0;
  ctx.save(); ctx.beginPath(); ctx.arc(st.cx, st.cy, st.r, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 - Math.PI / 2; ctx.save(); ctx.translate(st.cx + Math.cos(a) * (st.r - 24), st.cy + Math.sin(a) * (st.r - 24)); ctx.rotate(a + Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(9, 7); ctx.lineTo(-9, 7); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill(); ctx.restore(); }
  const tx = st.cx + kx * st.r * 0.7, ty = st.cy + ky * st.r * 0.7;
  const g = ctx.createRadialGradient(tx - 10, ty - 14, 4, tx, ty, 50); g.addColorStop(0, '#9be7ff'); g.addColorStop(1, '#2a7de1');
  ctx.beginPath(); ctx.arc(tx, ty, 48, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();
  const circ = (k, c1, c2, label, icon) => {
    const b = CTL[k], on = held(k), sc = on ? 0.92 : 1, rdy = k === 'special' && f.energy >= 100, pu = rdy ? 1 + 0.05 * Math.sin(G.t * 12) : 1;
    ctx.save(); ctx.translate(b.cx, b.cy); ctx.scale(sc * pu, sc * pu);
    if (rdy) glow(0, 0, b.r * 1.9, '#ffe14d', 0.9);
    ctx.beginPath(); ctx.arc(0, 8, b.r, 0, 7); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    const gg = ctx.createLinearGradient(0, -b.r, 0, b.r); gg.addColorStop(0, c1); gg.addColorStop(1, c2);
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.fillStyle = gg; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = rdy ? '#fff48a' : '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -b.r * 0.45, b.r * 0.62, b.r * 0.32, 0, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
    icon && icon(b.r);
    if (label) txt(label, 0, b.r * 0.5, b.r * 0.3, '#fff', { sw: 6 });
    if (k === 'special') { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(0, 0, b.r + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (f.energy / 100)); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  };
  circ('jump', '#7dff7d', '#27ae60', '', (r) => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.15); ctx.lineTo(0, -r * 0.25); ctx.lineTo(r * 0.4, r * 0.15); ctx.stroke(); });
  circ('punch', '#ff8a8a', '#e0243f', 'PUNCH', (r) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a114f'; ctx.lineWidth = 5; rr(-r * 0.36, -r * 0.5, r * 0.72, r * 0.5, r * 0.15); ctx.fill(); ctx.stroke(); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-r * 0.27 + i * r * 0.18, -r * 0.5, r * 0.1, 0, 7); ctx.fill(); ctx.stroke(); } });
  circ('kick', '#ffd23f', '#f08a00', 'KICK', (r) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a114f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.55); ctx.lineTo(r * 0.05, -r * 0.55); ctx.lineTo(r * 0.08, -r * 0.2); ctx.lineTo(r * 0.38, -r * 0.1); ctx.quadraticCurveTo(r * 0.45, r * 0.05, r * 0.3, r * 0.05); ctx.lineTo(-r * 0.22, r * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke(); });
  circ('special', '#d28bff', '#7a3cf0', f.energy >= 100 ? 'GO!' : '', (r) => { starPath(0, -r * 0.18, r * 0.5, 5); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#2a114f'; ctx.stroke(); });
  if (G.toast && G.toast.t > 0) txt('Charge the ★ bar!', 360, 905, 34, '#ffe14d', { sw: 8, alpha: clamp(G.toast.t * 3, 0, 1) });
}
function drawFight(dt) {
  drawHud();
  const sp = G.fighters.find((f) => f.state === 'special' && f.st < MOVES.special.fireAt);
  if (sp) { const g = ctx.createRadialGradient(360, 470, 200, 360, 470, 700); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,0,80,0.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, GLH); }
  if (G.scene === 'fight') {
    drawControls();
    button('pause', '', 312, 150, 96, 96, '#7b5cff', '#4a35c9', () => { G.paused = true; Audio.select(); }, { icon: iconPause });
    drawBanner();
  } else drawBanner();
}

/* ------------------------------------------------------------ HUD */
function drawHud() {
  const [p, c] = G.fighters, m = G.match; if (!p) return;
  const side = (f, left) => {
    const px = left ? 52 : W - 52, bx = left ? 104 : W - 104 - 200;
    // portrait
    ctx.save(); ctx.beginPath(); ctx.arc(px, 62, 42, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.clip(); ctx.fillStyle = f.c.color; ctx.globalAlpha = 0.35; ctx.fillRect(px - 42, 20, 84, 84); ctx.globalAlpha = 1;
    if (f.img) { const iw = f.img.naturalWidth, ih = f.img.naturalHeight, sw = Math.min(iw, ih * 0.62); ctx.drawImage(f.img, (iw - sw) / 2, 0, sw, sw, px - 42, 20, 84, 84); }
    ctx.restore(); ctx.beginPath(); ctx.arc(px, 62, 42, 0, 7); ctx.lineWidth = 6; ctx.strokeStyle = left ? '#5dff8a' : '#ff7a7a'; ctx.stroke();
    // hp bar
    ctx.save(); rr(bx, 36, 200, 34, 17); ctx.fillStyle = 'rgba(20,8,50,0.75)'; ctx.fill();
    ctx.save(); rr(bx, 36, 200, 34, 17); ctx.clip();
    const hp = clamp(f.hp / f.maxHp, 0, 1), lag = clamp(f.lag / f.maxHp, 0, 1);
    const fillRect = (v, col) => { ctx.fillStyle = col; if (left) ctx.fillRect(bx, 36, 200 * v, 34); else ctx.fillRect(bx + 200 * (1 - v), 36, 200 * v, 34); };
    fillRect(lag, '#fff3a0'); fillRect(hp, hp > 0.5 ? '#4cff6a' : hp > 0.25 ? '#ffd23f' : (Math.sin(G.t * 16) > 0 ? '#ff4d4d' : '#ff9a9a'));
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(bx, 40, 200, 8);
    ctx.restore(); rr(bx, 36, 200, 34, 17); ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();
    // energy bar
    const e = f.energy / 100;
    ctx.save(); rr(bx, 78, 200, 16, 8); ctx.fillStyle = 'rgba(20,8,50,0.75)'; ctx.fill(); ctx.save(); rr(bx, 78, 200, 16, 8); ctx.clip();
    ctx.fillStyle = e >= 1 ? (Math.sin(G.t * 14) > 0 ? '#ffe14d' : '#fff') : '#c58bff'; if (left) ctx.fillRect(bx, 78, 200 * e, 16); else ctx.fillRect(bx + 200 * (1 - e), 78, 200 * e, 16);
    ctx.restore(); rr(bx, 78, 200, 16, 8); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();
    // round stars
    for (let i = 0; i < 2; i++) { const sx = left ? bx + 18 + i * 40 : bx + 200 - 18 - i * 40; starPath(sx, 122, 17, 5); ctx.fillStyle = i < f.wins ? '#ffe14d' : 'rgba(255,255,255,0.25)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke(); }
  };
  side(p, true); side(c, false);
  // timer
  const low = m.time <= 10 && m.phase === 'fight', sc = low ? 1 + 0.08 * Math.abs(Math.sin(G.t * 8)) : 1;
  ctx.save(); ctx.translate(360, 62); ctx.scale(sc, sc); ctx.beginPath(); ctx.arc(0, 0, 40, 0, 7); ctx.fillStyle = low ? '#ff4d6d' : '#7b5cff'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke();
  txt(String(Math.ceil(m.time)), 0, 3, 44, '#fff', { sw: 9 }); ctx.restore();
  // combo for player
  if (p.combo >= 2 && p.comboT > 0) txt('x' + p.combo, 66, 200, 54 + p.combo * 2, '#7dff7d', { sw: 10, rot: -0.1 });
}

/* ------------------------------------------------------------ result + pause overlays */
function drawResult(dt) {
  G.resultT += dt;
  drawFight(dt);
  const m = G.match, k = ease(G.resultT / 0.5);
  ctx.save(); ctx.fillStyle = `rgba(30,10,70,${0.35 * k})`; ctx.fillRect(0, 0, W, GLH); ctx.restore();
  const title = m.won ? 'YOU WIN!' : 'TRY AGAIN!';
  txt(title, 360, 250, m.won ? 130 : 110, '#fff', { grad: m.won ? [[0, '#fff7a8'], [1, '#ffb52e']] : [[0, '#ffd6e0'], [1, '#ff6b8b']], sc: Math.max(0.01, k * (1 + 0.04 * Math.sin(G.t * 6))), sw: 26, rot: -0.04 });
  const shown = Math.round(m.score * clamp((G.resultT - 0.5) / 1.0, 0, 1));
  if (G.resultT > 0.5) {
    ctx.save(); rr(160, 340, 400, 150, 36); ctx.fillStyle = 'rgba(30,10,70,0.8)'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();
    txt('+' + fmt(shown), 360, 395, 76, '#ffe14d', { sw: 14 });
    txt('★ ' + fmt(G.total), 360, 455, 38, '#fff', { sw: 9 });
    if (m.won && G.streak > 1) txt('STREAK x' + G.streak, 360, 535, 48, '#7dff7d', { sw: 10 });
  }
  if (G.resultT > 0.8) {
    if (m.won) button('next', 'NEXT!', 130, 975, 460, 140, '#5dff8a', '#16b84a', () => { Audio.select(); pickOpponent(); go('fight'); }, { size: 76, pulse: true });
    else button('retry', 'RETRY', 130, 975, 460, 140, '#ffd23f', '#f08a00', () => { Audio.select(); G.streak = 0; G.total = 0; go('fight'); }, { size: 76, pulse: true });
    button('menu', 'MENU', 210, 1150, 300, 100, '#7b5cff', '#4a35c9', () => { Audio.select(); G.streak = 0; G.total = 0; go('select'); }, { size: 48 });
  }
}
function drawPause() {
  ctx.save(); ctx.fillStyle = 'rgba(20,6,50,0.8)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  txt('PAUSE', 360, 330, 120, '#fff', { sw: 24, grad: [[0, '#fff'], [1, '#aee4ff']] });
  button('resume', 'GO!', 130, 480, 460, 140, '#5dff8a', '#16b84a', () => { G.paused = false; Audio.select(); }, { size: 76 });
  soundBtn(312, 680);
  button('quit', 'MENU', 210, 840, 300, 100, '#ff7a7a', '#e0243f', () => { G.paused = false; G.streak = 0; G.total = 0; Audio.select(); go('select'); }, { size: 48 });
}


/* ------------------------------------------------------------ scene control */
let pendingScene = null;
function go(s) { pendingScene = s; G.fadeOut = 0.0001; }
function applyScene(s) {
  fx.clear(); clearProjs(); G.fade = 1; G.ctl.sx = G.ctl.sz = 0; G.ctl.stick = null; G.pressed = {}; G.ptrs = {};
  if (s === 'title') enterTitle();
  else if (s === 'select') { enterSelect(); Audio.music('menu'); }
  else if (s === 'fight') startMatch();
}

/* ------------------------------------------------------------ input */
function ctlHit(x, y) {
  let best = null, bd = 1e9;
  for (const k in CTL) { if (k === 'stick') continue; const b = CTL[k], d = Math.hypot(x - b.cx, y - b.cy); if (d < b.r + 16 && d < bd) { best = k; bd = d; } }
  return best;
}
function ctlPress(k) {
  const f = G.fighters[0]; if (!f) return;
  G.pressed = G.pressed || {}; G.pressed[k] = 0.12;
  const m = G.match; if (!m || m.phase !== 'fight') return;
  if (!actionStart(f, k)) f.buf = { a: k, t: 0.2 };
}
function setStick(x, y) {
  const st = CTL.stick; let dx = (x - st.cx) / st.r, dy = (y - st.cy) / st.r; const m = Math.hypot(dx, dy);
  if (m > 1) { dx /= m; dy /= m; }
  const dz = m < 0.12 ? 0 : 1; G.ctl.stick = { dx, dy }; G.ctl.sx = dx * dz; G.ctl.sz = dy * dz;
}
function toLocal(e) { const r = uiCanvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; }
function uiAt(x, y) { for (let i = G.hits.length - 1; i >= 0; i--) { const h = G.hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; }
function onDown(e) {
  e.preventDefault(); Audio.init(); Audio.resume();
  try { uiCanvas.setPointerCapture(e.pointerId); } catch (_) {}
  if (G.mode === 'edit' || !loaded) return;
  const { x, y } = toLocal(e);
  const ptr = { x, y, ctl: null, ui: null }; G.ptrs[e.pointerId] = ptr;
  if (G.scene === 'fight' && !G.paused) {
    const ui = uiAt(x, y); if (ui && ui.id === 'pause') { ptr.ui = ui; G.down = ui.id; return; }
    const k = ctlHit(x, y);
    if (k) { ptr.ctl = k; ctlPress(k); }
    else if (y > GLH + 10 && x < 330) { ptr.ctl = 'stick'; setStick(x, y); }
    return;
  }
  const ui = uiAt(x, y);
  if (ui) { if (ui.down) ui.fn(); else { ptr.ui = ui; G.down = ui.id; } }
}
function onMove(e) {
  const ptr = G.ptrs[e.pointerId]; if (!ptr) return;
  const { x, y } = toLocal(e);
  if (ptr.ctl === 'stick') setStick(x, y);
  if (ptr.ui) G.down = (uiAt(x, y) === ptr.ui) ? ptr.ui.id : null;
}
function onUp(e) {
  const ptr = G.ptrs[e.pointerId]; delete G.ptrs[e.pointerId]; if (!ptr) return;
  if (ptr.ctl === 'stick') { G.ctl.stick = null; G.ctl.sx = G.ctl.sz = 0; }
  if (ptr.ui) { const { x, y } = toLocal(e); const same = uiAt(x, y); G.down = null; if (same && same.id === ptr.ui.id && e.type === 'pointerup') same.fn(); }
}
function onKey(e, down) {
  G.keys[e.code] = down;
  if (!down) return;
  Audio.init(); Audio.resume();
  if (G.scene === 'fight' && !G.paused) {
    if (e.code === 'KeyJ' || e.code === 'KeyZ') ctlPress('punch');
    else if (e.code === 'KeyK' || e.code === 'KeyX') ctlPress('kick');
    else if (e.code === 'KeyL' || e.code === 'KeyC') ctlPress('special');
    else if (e.code === 'Space') ctlPress('jump');
    else if (e.code === 'Escape' || e.code === 'KeyP') G.paused = true;
  } else if (G.paused && (e.code === 'Escape' || e.code === 'KeyP')) G.paused = false;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
}

/* ------------------------------------------------------------ main loop */
let last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (!ctx) return;
  const real = Math.min(0.11, ((ts - last) / 1000) || 0.016); last = ts;
  G.t += real; G.hits = [];
  if (G.toast) G.toast.t -= real;
  if (G.pressed) for (const k in G.pressed) G.pressed[k] -= real;
  if (G.fadeOut !== undefined && G.fadeOut !== null) { G.fadeOut += real * 5; if (G.fadeOut >= 1) { const s = pendingScene; G.fadeOut = null; applyScene(s); } }
  else if (G.fade > 0) G.fade = Math.max(0, G.fade - real * 3);
  G.shake = Math.max(0, G.shake - real * 60); G.zoom = Math.max(0, G.zoom - real * 0.2);
  ctx.setTransform(S, 0, 0, S, 0, 0); ctx.clearRect(0, 0, W, H);
  if (failed) { ctx.fillStyle = '#2a1260'; ctx.fillRect(0, 0, W, H); txt(failed, 360, 600, 40, '#fff', { sw: 8 }); return; }
  if (!loaded) { drawLoading(); return; }
  let dt = real;
  if (G.paused) dt = 0; else if (G.freeze > 0) { G.freeze -= real; dt = 0; } else dt = real * G.slow;
  G.ad = dt;
  if (G.mode === 'edit') { drawEdit(real); return; }

  if (G.scene === 'title') { drawPanel(); drawTitle(real); }
  else if (G.scene === 'select') { drawSelect(real); }
  else if (G.scene === 'fight' || G.scene === 'result') {
    if (dt > 0) {
      updateMatch(dt);
      const ph = G.match.phase;
      if (ph === 'fight' || ph === 'ko' || ph === 'timeup' || G.scene === 'result') for (const f of G.fighters) updateFighter(f, dt);
      updateProjs(dt); pushApart(); fx.update(dt);
    }
    for (const f of G.fighters) syncFighter(f, G.t, dt);
    if (G.scene === 'result') {
      const w = G.match.won ? G.fighters[0] : G.fighters[1];
      placeCamera(w.x, 1.9, w.z + 6.8, w.x, 1.5, w.z, real, 3);
    } else fightCamera(real);
    G.arena.crowdUpdate(G.t); G.arena.cloudUpdate(G.t); G.arena.ropeUpdate(camera.position.x, camera.position.z); render3D();
    drawPanel();
    if (G.scene === 'result') drawResult(real); else drawFight(real);
    if (G.paused) drawPause();
  }
  if (G.fadeOut) { ctx.fillStyle = `rgba(20,6,50,${clamp(G.fadeOut, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
  else if (G.fade > 0) { ctx.fillStyle = `rgba(20,6,50,${G.fade})`; ctx.fillRect(0, 0, W, H); }
}
function drawLoading() {
  ctx.fillStyle = '#2a1260'; ctx.fillRect(0, 0, W, H);
  txt('FIGHTING DOLL', 360, 560, 76, '#fff', { sw: 16 });
  rr(160, 660, 400, 30, 15); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
  rr(160, 660, 400 * (G.loadK || 0), 30, 15); ctx.fillStyle = '#ffe14d'; ctx.fill();
}

/* ------------------------------------------------------------ edit mode (preview only) */
function drawEdit(dt) {
  if (!G.dolls.length) {
    useArena(0); setView(GLH);
    const a = makeFighter(G.charIdx, { display: true }), b = makeFighter((G.charIdx + 1) % CHARS.length, { display: true });
    a.x = -2.4; b.x = 2.4; a.yaw = Math.PI / 2; b.yaw = -Math.PI / 2; G.dolls = [a, b]; CAM.snap = true;
  }
  for (const f of G.dolls) { f.st += dt; syncFighter(f, G.t, dt); }
  placeCamera(0, 1.3 + 12 * Math.sin(0.62), 12 * Math.cos(0.62), 0, 1.1, 0, dt);
  G.arena.crowdUpdate(G.t); G.arena.cloudUpdate(G.t); G.arena.ropeUpdate(camera.position.x, camera.position.z); render3D(); drawPanel();
}

/* ------------------------------------------------------------ boot */
function loadPortraits() {
  return Promise.all(CHARS.map((c, i) => new Promise((res) => {
    const a = lib.getAsset(c.id + '_idle'), img = new Image();
    const done = () => { G.loadK = (G.loadK || 0) + 1 / CHARS.length; res(); };
    img.onload = done; img.onerror = done; img.src = a ? a.url : ''; PORT[i] = img;
  })));
}
let booted = false;
async function run(mode) {
  G.mode = mode || window.mode || 'play';
  if (!booted) {
    booted = true;
    uiCanvas = document.getElementById('ui'); glCanvas = document.getElementById('gl'); ctx = uiCanvas.getContext('2d');
    uiCanvas.width = W * S; uiCanvas.height = H * S;
    uiCanvas.addEventListener('pointerdown', onDown); uiCanvas.addEventListener('pointermove', onMove);
    uiCanvas.addEventListener('pointerup', onUp); uiCanvas.addEventListener('pointercancel', onUp);
    uiCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => onKey(e, true)); window.addEventListener('keyup', (e) => onKey(e, false));
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.scene === 'fight') G.paused = true; });
    requestAnimationFrame(frame);
    if (!window.THREE) { failed = '3D engine failed to load'; return; }
    try {
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true }); renderer.setPixelRatio(1.25); renderer.setSize(W, GLH, false); renderer.autoClear = false; renderer.setClearColor(0x2a1260, 1);
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(48, W / GLH, 0.1, 300); fx = new FX(scene);
      arenas = [0, 1, 2].map((i) => { const a = buildArena(i); scene.add(a.group); a.group.visible = false; return a; });
      useArena(0);
    } catch (e) { failed = '3D is not available on this device'; return; }
  }
  try {
    lib.showGameParameters({
      name: 'Fighting Doll',
      params: {
        'Round time (sec)': { key: 'settings.roundTime', type: 'slider', min: 20, max: 99, step: 1 },
        'CPU level': { key: 'settings.cpuLevel', type: 'slider', min: 1, max: 5, step: 1 },
        'Damage': { key: 'settings.damageScale', type: 'slider', min: 0.5, max: 2, step: 0.1 },
        'Special charge speed': { key: 'settings.specialRate', type: 'slider', min: 0.5, max: 3, step: 0.1 },
      },
    });
  } catch (e) {}
  loaded = false; G.loadK = 0;
  await loadPortraits();
  if (G.mode === 'play') {
    try {
      const r = await Promise.race([lib.getUserGameState(), new Promise((res) => setTimeout(() => res(null), 1200))]);
      const s = r && r.state; if (s) { G.best = s.best || 0; if (typeof s.char === 'number' && s.char >= 0 && s.char < CHARS.length) G.charIdx = s.char; if (s.sound === false) Audio.setMuted(true); }
    } catch (e) {}
  }
  if (cfg().music === false) Audio.setMuted(true);
  loaded = true;
  if (G.mode === 'edit') { unmountAll(); return; }
  enterTitle();
}
window.run = run;
