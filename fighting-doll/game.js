/*
 * FIGHTING DOLL — portrait 9:16 (720x1280) kids' brawler.
 * Pick one of 20 stitched dolls, then win best-of-3 rounds against the CPU.
 * Move, jump, PUNCH, spinning KICK, and charge a SPECIAL (hearts, fire, stars, bolts...).
 * Win streaks raise the CPU level and change the arena. Score goes to the leaderboard.
 * Files: characters.js (roster) · audio.js (synth sfx/music) · stage.js (arena art) · game.js (everything else).
 */
import { CHARS } from './characters.js';
import { Audio } from './audio.js';
import { W, H, GROUND, PANEL_TOP, makeStage, drawStageBack, drawStageFront } from './stage.js';

const S = 1.5;                        // backing-canvas scale (crisper than 1x)
const GRAV = 3200, FONT = '"Arial Rounded MT Bold","Trebuchet MS","Segoe UI",Verdana,sans-serif';
const MOVES = {
  punch:   { dur: 0.36, hitAt: 0.10, reach: 178, dmg: 7,  kb: 280, stun: 0.42, freeze: 0.06 },
  kick:    { dur: 0.50, hitAt: 0.20, reach: 215, dmg: 11, kb: 560, stun: 0.55, freeze: 0.09 },
  special: { dur: 0.90, fireAt: 0.50, dmg: 22, kb: 800, stun: 0.85 },
};
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k = clamp(k, 0, 1), k * k * (3 - 2 * k));
const pick = (a) => a[(Math.random() * a.length) | 0];
const cfg = () => (window.gameConfig && window.gameConfig.settings) || {};

let canvas, ctx, loaded = false;
const SPR = [];                      // SPR[charIndex][pose] = { img, iw, ih, white } (poses: idle punch kick special hit win)
let stages = [];
const G = {
  scene: 'title', t: 0, fade: 1, paused: false, slow: 1, freeze: 0, shake: 0, zoom: 0, down: null,
  streak: 0, total: 0, best: 0, charIdx: 0, oppIdx: 1, level: 1, theme: 0,
  fighters: [], projs: [], parts: [], hits: [], actors: [], selActor: null, titleDolls: [],
  match: null, ctl: { l: false, r: false }, keys: {}, ptrs: {}, toast: null, mode: 'play', saved: null,
};

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

/* ------------------------------------------------------------ particles */
function fx(kind, x, y, o = {}) {
  G.parts.push(Object.assign({ kind, x, y, vx: 0, vy: 0, g: 0, life: 0.6, max: 0.6, size: 20, rot: 0, vr: 0, color: '#fff', drag: 0, front: true }, o, { max: o.life || 0.6 }));
  if (G.parts.length > 420) G.parts.splice(0, 40);
}
function burstAt(x, y, color, n = 10, spd = 520) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 7), v = rand(spd * 0.4, spd);
    fx(i % 3 ? 'star' : 'dot', x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, g: 900, life: rand(0.35, 0.7), size: rand(10, 24), color: i % 2 ? color : '#fff', vr: rand(-10, 10), drag: 2 });
  }
}
function comicText(s, x, y, color, size = 66) {
  fx('text', x, y, { s, life: 0.7, size, color, rot: rand(-0.2, 0.2), vy: -60 });
}
function impact(x, y, big, color) {
  fx('burst', x, y, { life: big ? 0.28 : 0.2, size: big ? 150 : 100, color: big ? '#ffe14d' : '#fff3a0', rot: rand(0, 6) });
  fx('ring', x, y, { life: 0.3, size: big ? 150 : 100, color: '#fff' });
  burstAt(x, y, color, big ? 14 : 8, big ? 700 : 480);
  comicText(pick(big ? ['BOOM!', 'WHAM!', 'KAPOW!', 'SMASH!'] : ['POW!', 'BAM!', 'BONK!', 'POP!', 'WHAP!']), x + rand(-30, 30), y - 70, pick(['#ff5d8f', '#ffd23f', '#4dd2ff', '#7dff7d']), big ? 78 : 62);
}
function updateParts(dt) {
  for (const p of G.parts) {
    p.life -= dt; p.vy += p.g * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  }
  G.parts = G.parts.filter((p) => p.life > 0);
}
function drawParts() {
  for (const p of G.parts) {
    const k = 1 - p.life / p.max, a = clamp(p.life / (p.max * 0.5), 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y);
    switch (p.kind) {
      case 'star': ctx.rotate(p.rot); starPath(0, 0, p.size, 5); ctx.fillStyle = p.color; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff8'; ctx.stroke(); break;
      case 'dot': ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0, 0, p.size * 0.4 * (1 - k * 0.5), 0, 7); ctx.fill(); break;
      case 'heart': ctx.rotate(Math.sin(p.rot) * 0.4); heartPath(0, 0, p.size); ctx.fillStyle = p.color; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); break;
      case 'confetti': ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(p.rot * 1.7)) + 0.15); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); break;
      case 'ring': ctx.strokeStyle = p.color; ctx.lineWidth = 12 * (1 - k); ctx.beginPath(); ctx.arc(0, 0, p.size * (0.2 + k), 0, 7); ctx.stroke(); break;
      case 'puff': ctx.fillStyle = p.color; ctx.globalAlpha = a * 0.7; ctx.beginPath(); ctx.arc(0, 0, p.size * (0.5 + k), 0, 7); ctx.fill(); break;
      case 'burst': {
        const s = p.size * (0.5 + ease(k * 2.5) * 0.7); ctx.rotate(p.rot); ctx.beginPath();
        for (let i = 0; i < 16; i++) { const r = i % 2 ? s * 0.55 : s; const an = (i / 16) * 6.283; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * r, Math.sin(an) * r); }
        ctx.closePath(); ctx.fillStyle = p.color; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#ff5d3d'; ctx.stroke(); break;
      }
      case 'text': { const pop = k < 0.2 ? ease(k / 0.2) * 1.3 : 1.3 - Math.min(0.3, (k - 0.2) * 0.5); txt(p.s, 0, 0, p.size, p.color, { rot: p.rot, sc: pop, stroke: '#2a114f' }); break; }
      case 'line': ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size, -3, p.size * 2, 6); break;
      case 'zzz': txt('★', 0, 0, p.size, '#ffe14d', { sw: 4 }); break;
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------ fighters */
function makeFighter(ci, side, opts = {}) {
  const c = CHARS[ci], base = SPR[ci] && SPR[ci].idle, img = base ? base.img : null;
  const iw = base ? base.iw : 300, ih = base ? base.ih : 400;
  const sc = Math.min((opts.h || 310) / ih, (opts.w || 320) / iw);
  const w = iw * sc, h = ih * sc;
  return {
    ci, c, img, side, w, h, sc, x: side < 0 ? 200 : 520, jump: 0, vy: 0, vx: 0, face: side < 0 ? 1 : -1,
    maxHp: opts.hp || 100, hp: opts.hp || 100, lag: opts.hp || 100, energy: 0, state: 'idle', st: 0, flash: 0, landT: 0,
    fired: false, struck: false, combo: 0, comboT: 0, ph: rand(0, 6), mv: 0, koRot: 0, koSpin: 0, wins: 0,
    buf: null, intent: { l: false, r: false }, ai: { t: 0.6, cool: 0 }, sp: { x: 0, v: 0, y: 0, vy: 0 }, ps: Object.assign({ tempo: 1, bob: 1, wob: 1, hop: 1, hover: 0, lunge: 1, stiff: 1 }, c.ps || {}), stepAcc: 0, idleT: rand(2, 5), isCpu: !!opts.cpu, display: !!opts.display, ready: false, armor: false,
  };
}
// Which pose image to show for the fighter's current state, scaled to match the idle image's height.
function spriteFor(f, st) {
  const set = SPR[f.ci]; if (!set || !set.idle) return null;
  const s = st === undefined ? f.st : st;
  let k = 'idle';
  switch (f.state) {
    case 'punch': if (s >= 0.07) k = 'punch'; break;
    case 'kick': if (s >= 0.1) k = 'kick'; break;
    case 'special': if (s >= 0.12) k = 'special'; break;
    case 'hit': case 'ko': case 'dizzy': k = 'hit'; break;
    case 'win': k = 'win'; break;
  }
  const e = set[k] || set.idle, idle = set.idle;
  let scale = f.sc * clamp(idle.ih / e.ih, 0.8, 1.25);
  scale = Math.min(scale, (1.7 * f.w) / e.iw);
  return { e, w: e.iw * scale, h: e.ih * scale };
}
// White silhouette of a pose image (hit flash); built once, lazily.
function whiteOf(e) {
  if (e.white === undefined) {
    e.white = null;
    try { const cv = document.createElement('canvas'); cv.width = e.iw; cv.height = e.ih; const x = cv.getContext('2d'); x.drawImage(e.img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, e.iw, e.ih); e.white = cv; } catch (err) {}
  }
  return e.white;
}
function setState(f, s) { f.state = s; f.st = 0; f.struck = false; f.fired = false; }

function pose(f, t, st) {
  const ps = f.ps, s = st === undefined ? f.st : st;
  const p = { ox: 0, oy: 0, rot: 0, sx: 1, sy: 1, spin: 0, shear: 0, wob: 0, wf: 5, bulge: 0, ghost: 0 };
  const air = f.jump > 2;
  switch (f.state) {
    case 'idle': case 'walk': {
      if (air) { p.sy = f.vy > 0 ? 1.1 : 1.04; p.sx = f.vy > 0 ? 0.92 : 0.97; p.rot = 0.05 * f.mv; p.wob = 3 * ps.wob; p.wf = 14; p.shear = -8 * f.mv; break; }
      if (f.landT > 0) { const k = f.landT / 0.12; p.sy = 1 - 0.22 * k; p.sx = 1 + 0.2 * k; p.bulge = 0.12 * k; p.shear = 10 * k * ps.wob; break; }
      if (f.state === 'walk' && Math.abs(f.vx) > 20) {
        const ph = t * 15 * ps.tempo + f.ph;
        p.oy = -Math.abs(Math.sin(ph)) * 16 * ps.hop; p.rot = 0.09 * f.mv + 0.06 * Math.sin(ph);
        p.sx = 1 + 0.03 * Math.cos(ph * 2); p.sy = 1 - 0.04 * Math.cos(ph * 2); p.shear = 10 * f.mv; p.wob = 3 * ps.wob; p.wf = 15;
      } else {
        const b = Math.sin(t * 5 * ps.tempo + f.ph);
        const bounce = f.display ? 0 : Math.abs(Math.sin(t * 6.2 * ps.tempo + f.ph)) * 5 * ps.bob;
        p.oy = -bounce - (ps.hover ? ps.hover * (6 + 6 * Math.sin(t * 2.6 + f.ph)) : 0);
        p.sy = 1 + 0.03 * b * ps.bob; p.sx = 1 - 0.022 * b * ps.bob; p.rot = 0.025 * Math.sin(t * 2.5 * ps.tempo + f.ph);
        p.shear = 7 * Math.sin(t * 2.3 * ps.tempo + f.ph) * ps.wob; p.wob = 2.5 * ps.wob; p.wf = 3.4; p.bulge = 0.02 * b * ps.bob;
      }
      break;
    }
    case 'punch': {
      if (s < 0.1) { const k = ease(s / 0.1); p.ox = -18 * k; p.rot = -0.14 * k; p.sx = 1 - 0.08 * k; p.sy = 1 + 0.07 * k; p.shear = -26 * k * ps.wob; p.bulge = 0.05 * k; }
      else if (s < 0.22) { const k = ease((s - 0.1) / 0.12); p.ox = lerp(-18, 74 * ps.lunge, k); p.rot = lerp(-0.14, 0.26, k); p.sx = 1.16; p.sy = 0.94; p.shear = lerp(-26, 44, k) * ps.wob; p.ghost = 1; }
      else { const k = ease((s - 0.22) / 0.14); p.ox = lerp(74 * ps.lunge, 0, k); p.rot = lerp(0.26, 0, k); p.sx = lerp(1.16, 1, k); p.sy = lerp(0.94, 1, k); p.shear = (lerp(44, 0, k) + Math.sin(k * 9) * 10 * (1 - k)) * ps.wob; p.wob = 5 * (1 - k) * ps.wob; p.wf = 20; }
      break;
    }
    case 'kick': {
      if (s < 0.14) { const k = ease(s / 0.14); p.ox = -24 * k; p.rot = -0.22 * k; p.sy = 1 - 0.12 * k; p.sx = 1 + 0.08 * k; p.shear = -30 * k * ps.wob; p.bulge = 0.08 * k; }
      else if (s < 0.34) { const k = (s - 0.14) / 0.2; p.ox = lerp(-24, 95 * ps.lunge, ease(k)); p.oy = -34 * Math.sin(k * Math.PI); p.rot = 0.14 * Math.sin(k * Math.PI); p.shear = 22 * Math.sin(k * Math.PI) * ps.wob; p.ghost = 1; }
      else { const k = ease((s - 0.34) / 0.16); p.ox = lerp(95 * ps.lunge, 0, k); p.sx = lerp(1.1, 1, k); p.sy = lerp(0.9, 1, k); p.shear = Math.sin(k * 9) * 12 * (1 - k) * ps.wob; p.wob = 5 * (1 - k) * ps.wob; p.wf = 20; }
      break;
    }
    case 'special': {
      if (s < MOVES.special.fireAt) {
        const k = s / MOVES.special.fireAt; const pul = Math.sin(s * 60);
        p.sx = 1 + 0.08 * k + 0.03 * pul; p.sy = 1 + 0.08 * k + 0.03 * Math.sin(s * 60 + 1); p.ox = Math.sin(s * 90) * 7 * k; p.oy = -Math.abs(Math.sin(s * 30)) * 6 * k; p.rot = -0.1 * k;
        p.wob = (4 + 12 * k) * ps.wob; p.wf = 24; p.bulge = 0.06 * pul * k; p.shear = Math.sin(s * 45) * 8 * k;
      } else {
        const k = ease((s - MOVES.special.fireAt) / 0.3);
        p.ox = lerp(50, 0, k); p.sx = lerp(1.26, 1, k); p.sy = lerp(0.82, 1, k); p.rot = lerp(0.22, 0, k); p.shear = lerp(50, 0, k) * ps.wob; p.wob = 6 * (1 - k) * ps.wob; p.wf = 18; p.ghost = k < 0.4 ? 1 : 0;
      }
      break;
    }
    case 'hit': {
      const dur = f.stunDur || 0.4, k = clamp(s / dur, 0, 1);
      p.ox = -22 * (1 - k) + Math.sin(s * 90) * 6 * (1 - k); p.rot = -0.32 * (1 - k); p.sx = 0.86 + 0.14 * k; p.sy = 1.12 - 0.12 * k;
      p.shear = -50 * (1 - k) * (1 - k) * ps.wob; p.wob = 6 * (1 - k) * ps.wob; p.wf = 22;
      break;
    }
    case 'ko': {
      p.spin = f.koRot; p.shear = 18 * Math.sin(s * 18) * Math.exp(-s * 2.5) * ps.wob; p.wob = 5 * ps.wob; p.wf = 12;
      if (f.jump <= 0) { const k = clamp(Math.abs(f.koRot) / (Math.PI / 2), 0, 1); p.oy = ((f.h - f.w) / 2) * k; }
      break;
    }
    case 'win': {
      const cy = t * 7 * ps.tempo + f.ph, b = Math.abs(Math.sin(cy)), n = Math.floor(cy / Math.PI), fr = (cy / Math.PI) % 1;
      p.oy = -b * 60 * ps.hop; p.sy = 1 + 0.14 * b - 0.16 * Math.pow(1 - b, 4); p.sx = 1 - (p.sy - 1) * 0.6; p.rot = 0.12 * Math.sin(cy);
      if (n % 3 === 2) p.spin = ease(fr) * Math.PI * 2;
      p.shear = 12 * Math.cos(cy) * ps.wob; p.wob = 4 * ps.wob; p.wf = 9;
      break;
    }
    case 'dizzy': { p.rot = 0.12 * Math.sin(t * 6); p.shear = 14 * Math.sin(t * 6) * ps.wob; p.wob = 5 * ps.wob; p.wf = 6; break; }
  }
  return p;
}

// Soft-body springs: head lags behind body motion, and vertical speed stretches/squashes the doll.
function updateSprings(f, p, ad) {
  const sxw = f.x + p.ox * f.face, gyn = GROUND - f.jump + p.oy;
  if (f.px === undefined) { f.px = sxw; f.py = gyn; }
  if (!(ad > 0)) return;
  const vx = clamp((sxw - f.px) / ad, -2500, 2500), vy = clamp((gyn - f.py) / ad, -3000, 3000); f.px = sxw; f.py = gyn;
  const sp = f.sp, st = f.ps.stiff, n = Math.ceil(ad / 0.012), h = ad / n, tgt = clamp(-vy / 1500, -0.22, 0.22);
  for (let i = 0; i < n; i++) {
    sp.v += (-170 * st * sp.x - 13 * sp.v - vx * 2.4) * h; sp.x = clamp(sp.x + sp.v * h, -60, 60);
    sp.vy += ((tgt - sp.y) * 320 * st - 20 * sp.vy) * h; sp.y = clamp(sp.y + sp.vy * h, -0.25, 0.25);
  }
}

// Draws the sprite as 18 horizontal strips so the body can bend, wobble and bulge like stuffed fabric.
const STRIPS = 18;
function drawStrips(src, iw, ih, w, h, off, ws) {
  const sh = ih / STRIPS, dh = h / STRIPS;
  for (let k = 0; k < STRIPS; k++) {
    const tn = 1 - (k + 0.5) / STRIPS, wk = w * ws(tn);
    ctx.drawImage(src, 0, k * sh, iw, sh + 0.6, -wk / 2 + off(tn), -h + k * dh, wk, dh + 0.8);
  }
}
function renderBody(f, p, t, alpha, st) {
  const sp = spriteFor(f, st); if (!sp) return;
  const gy = GROUND - f.jump, dirL = f.face * f.c.nat, nat = f.c.nat;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(f.x + p.ox * f.face, gy + p.oy);
  ctx.rotate(p.rot * f.face);
  if (p.spin) { ctx.translate(0, -sp.h / 2); ctx.rotate(p.spin * f.face); ctx.translate(0, sp.h / 2); }
  const sy = p.sy * (1 + f.sp.y), sx = p.sx * (1 - f.sp.y * 0.6);
  ctx.scale(sx * dirL, sy);
  const spx = f.sp.x * dirL;
  const off = (tn) => p.shear * nat * Math.pow(tn, 1.5) + spx * Math.pow(tn, 1.8) + p.wob * Math.sin(t * p.wf + tn * 3.2 + f.ph) * tn;
  const ws = (tn) => 1 + p.bulge * Math.sin(tn * Math.PI);
  drawStrips(sp.e.img, sp.e.iw, sp.e.ih, sp.w, sp.h, off, ws);
  if (alpha >= 1 && f.flash > 0) { const wc = whiteOf(sp.e); if (wc) { ctx.globalAlpha = clamp(f.flash / 0.08, 0, 1); drawStrips(wc, sp.e.iw, sp.e.ih, sp.w, sp.h, off, ws); } }
  ctx.restore();
}

function drawFighter(f, t) {
  if (!f.img) return;
  const p = pose(f, t), gy = GROUND - f.jump;
  updateSprings(f, p, G.ad || 0);
  // soft shadow (squashes with the doll)
  ctx.save(); ctx.globalAlpha = 0.28 * (1 - clamp(f.jump / 380, 0, 0.7)); ctx.fillStyle = '#1b0d3a';
  ctx.beginPath(); ctx.ellipse(f.x + p.ox * f.face * 0.5, GROUND + 8, f.w * 0.36 * p.sx * (1 - clamp(f.jump / 600, 0, 0.5)), 15, 0, 0, 7); ctx.fill(); ctx.restore();
  // special aura
  if (f.state === 'special' && f.st < MOVES.special.fireAt + 0.1) {
    const k = f.st / MOVES.special.fireAt, r = 120 + 90 * k + 14 * Math.sin(t * 30);
    glow(f.x, gy - f.h * 0.5, r * 1.3, f.c.color, 1); glow(f.x, gy - f.h * 0.5, r * 0.8, '#ffffff', 0.55);
    for (let i = 0; i < 5; i++) { const a = t * 6 + i * 1.256; starPath(f.x + Math.cos(a) * (140 + 30 * k), gy - f.h * 0.5 + Math.sin(a) * (110 + 30 * k), 16, 5, 0.45, a); ctx.fillStyle = '#fff'; ctx.fill(); }
    ctx.save(); ctx.strokeStyle = f.c.color; ctx.lineWidth = 8; ctx.globalAlpha = 0.8 * (1 - (k * 3) % 1);
    ctx.beginPath(); ctx.arc(f.x, gy - f.h * 0.5, 240 * (1 - (k * 3) % 1) + 30, 0, 7); ctx.stroke(); ctx.restore();
  } else if (f.ready && f.state !== 'ko' && !f.display) {
    glow(f.x, gy - f.h * 0.5, 160 + 12 * Math.sin(t * 8), f.c.color, 0.28);
  }
  // motion-smear afterimages during fast attack frames
  if (p.ghost) for (let g = 3; g >= 1; g--) renderBody(f, pose(f, t, Math.max(0, f.st - g * 0.03)), t, 0.2 - g * 0.04, Math.max(0, f.st - g * 0.03));
  renderBody(f, p, t, 1);
  // dizzy stars
  if (f.state === 'dizzy' || (f.state === 'ko' && f.jump <= 0 && f.st > 0.4)) {
    for (let i = 0; i < 4; i++) { const a = t * 4 + i * 1.57; starPath(f.x + Math.cos(a) * 60, GROUND - f.w * 0.9 + Math.sin(a) * 14, 14, 5); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
  }
}

/* ------------------------------------------------------------ combat */
function actionStart(f, a) {
  if (f.state === 'ko' || f.state === 'hit' || f.state === 'win' || f.state === 'dizzy') return false;
  const busy = f.state === 'punch' || f.state === 'kick' || f.state === 'special';
  if (busy) return false;
  if (a === 'jump') {
    if (f.jump > 2) return false;
    f.vy = 1180; f.jump = 1; f.landT = 0; Audio.jump();
    fx('puff', f.x, GROUND + 4, { size: 40, life: 0.3, color: '#fff' });
    return true;
  }
  if (a === 'special') {
    if (f.energy < 100) { if (!f.isCpu) { G.toast = { t: 0.6 }; Audio.tick(); } return false; }
    setState(f, 'special'); f.armor = true; Audio.charge();
    if (!f.isCpu) lib.haptics && lib.haptics.play({ intensity: 0.5, sharpness: 0.3, duration: 400 });
    return true;
  }
  setState(f, a); f.vx = 0;
  if (a === 'punch') Audio.punch(); else Audio.kick();
  return true;
}

function foe(f) { return G.fighters[0] === f ? G.fighters[1] : G.fighters[0]; }

function updateFighter(f, dt) {
  const o = foe(f), m = G.match, active = m && m.phase === 'fight';
  f.st += dt; f.flash = Math.max(0, f.flash - dt); f.landT = Math.max(0, f.landT - dt); f.comboT -= dt; if (f.comboT <= 0) f.combo = 0;
  f.ready = f.energy >= 100;
  // input intents
  let l = false, r = false;
  if (active && !f.isCpu) { l = G.ctl.l || G.keys.ArrowLeft || G.keys.KeyA; r = G.ctl.r || G.keys.ArrowRight || G.keys.KeyD; }
  else if (active && f.isCpu) { aiThink(f, o, dt); l = f.intent.l; r = f.intent.r; }
  if (f.buf) { f.buf.t -= dt; if (f.buf.t <= 0) f.buf = null; }
  const canAct = f.state === 'idle' || f.state === 'walk';
  if (active && canAct && f.buf) { if (actionStart(f, f.buf.a)) f.buf = null; }
  // movement
  const spd = 330 * f.c.spd;
  if (canAct && active) {
    const dir = (r ? 1 : 0) - (l ? 1 : 0);
    f.vx = lerp(f.vx, dir * spd, clamp(dt * 14, 0, 1));
    f.mv = dir ? (dir === f.face ? 1 : -1) : 0;
    f.state = Math.abs(f.vx) > 40 && f.jump <= 0 ? 'walk' : 'idle';
  } else if (f.state === 'idle' || f.state === 'walk') { f.vx = lerp(f.vx, 0, clamp(dt * 10, 0, 1)); f.mv = 0; }
  else { f.vx *= Math.exp(-(f.state === 'ko' ? 1.5 : 7) * dt); }
  const mg = f.state === 'ko' ? 150 : 72;
  f.x = clamp(f.x + f.vx * dt, mg, W - mg);
  if (f.state === 'walk' && f.jump <= 0 && Math.abs(f.vx) > 150) { f.stepAcc += Math.abs(f.vx) * dt; if (f.stepAcc > 80) { f.stepAcc = 0; fx('puff', f.x - Math.sign(f.vx) * 24, GROUND + 6, { size: 16, life: 0.28, color: '#fff', front: false }); } }
  // gravity
  if (f.jump > 0 || f.vy > 0) {
    f.vy -= GRAV * dt; f.jump += f.vy * dt;
    if (f.jump <= 0) {
      f.jump = 0; const hard = f.vy; f.vy = 0;
      if (f.state === 'ko') { f.koRot = -Math.PI * 2.5; G.shake = Math.max(G.shake, 14); Audio.land(); fx('puff', f.x, GROUND, { size: 80, life: 0.5, color: '#fff' }); burstAt(f.x, GROUND - 20, f.c.color, 8, 400); }
      else if (hard < -600) { f.landT = 0.12; Audio.land(); fx('puff', f.x - 30, GROUND + 4, { size: 30, life: 0.3, color: '#fff' }); fx('puff', f.x + 30, GROUND + 4, { size: 30, life: 0.3, color: '#fff' }); }
    }
  }
  if (f.state === 'ko' && f.jump > 0) f.koRot -= f.koSpin * dt;
  // face the opponent on the ground
  if (f.state !== 'ko' && f.state !== 'hit' && f.state !== 'win' && f.state !== 'dizzy' && Math.abs(o.x - f.x) > 12 && f.state !== 'kick') f.face = o.x > f.x ? 1 : -1;
  // attack resolution
  if (f.state === 'punch' || f.state === 'kick') {
    const mv = MOVES[f.state];
    if (!f.struck && f.st >= mv.hitAt) { f.struck = true; tryHit(f, o, f.state); }
    if (f.st >= mv.dur) { setState(f, 'idle'); if (f.buf && active) { if (actionStart(f, f.buf.a)) f.buf = null; } }
  } else if (f.state === 'special') {
    if (!f.fired && f.st >= MOVES.special.fireAt) { f.fired = true; fireSpecial(f); }
    if (f.st >= MOVES.special.dur) { f.armor = false; setState(f, 'idle'); }
    if (f.st < MOVES.special.fireAt && Math.random() < 0.5) fx('dot', f.x + rand(-90, 90), GROUND - rand(0, 280), { vy: -260, life: 0.5, size: rand(14, 26), color: f.c.color, vx: rand(-20, 20) });
  } else if (f.state === 'hit') {
    if (f.st >= (f.stunDur || 0.4)) setState(f, 'idle');
  }
  // passive energy
  if (active && f.energy < 100 && f.state !== 'ko') { f.energy = Math.min(100, f.energy + 2.2 * (cfg().specialRate || 1) * dt); if (f.energy >= 100 && !f.isCpu) { Audio.ready(); fx('ring', f.x, GROUND - 150, { size: 200, life: 0.5, color: f.c.color }); } }
  f.lag = f.lag > f.hp ? Math.max(f.hp, f.lag - 28 * dt) : f.hp;
}

function tryHit(a, d, kind) {
  const mv = MOVES[kind], dx = d.x - a.x, front = dx * a.face > -40, dist = Math.abs(dx);
  const dead = d.state === 'ko', airD = d.jump > (kind === 'punch' ? 110 : 170) && a.jump < 60;
  if (!front || dist > mv.reach || dead || airD) { Audio.whiff(); return; }
  applyHit(a, d, mv, kind === 'kick');
}

function applyHit(a, d, mv, big, isSpecial = false) {
  const m = G.match;
  a.combo = (a.comboT > 0 ? a.combo : 0) + 1; a.comboT = 1.1;
  if (m && a.combo > m.maxCombo[a.isCpu ? 1 : 0]) m.maxCombo[a.isCpu ? 1 : 0] = a.combo;
  const scale = Math.pow(0.92, Math.max(0, a.combo - 1)) * a.c.pow * (cfg().damageScale || 1) * (a.isCpu ? 0.7 + 0.1 * G.level : 1);
  const dmg = mv.dmg * scale;
  d.hp = Math.max(0, d.hp - dmg);
  const ix = (a.x + d.x) / 2 + a.face * 30, iy = GROUND - 150 - Math.min(d.jump, 120) * 0.6;
  impact(ix, iy, big, a.c.color);
  d.flash = 0.12; d.energy = Math.min(100, d.energy + (big ? 9 : 6)); a.energy = Math.min(100, a.energy + (big ? 10 : 7));
  Audio.hit(big);
  G.freeze = Math.max(G.freeze, mv.freeze || 0.08); G.shake = Math.max(G.shake, big ? 16 : 9); G.zoom = Math.max(G.zoom, big ? 0.05 : 0.025);
  if (!d.isCpu || !a.isCpu) lib.haptics && lib.haptics.play(big ? 'thud' : 'tap');
  if (a.combo >= 2) { fx('text', a.x + a.face * 20, GROUND - 400, { s: a.combo + ' HIT COMBO!', size: 46, color: '#7dff7d', life: 0.9, vy: -40, rot: rand(-0.1, 0.1) }); }
  if (d.hp <= 0) { knockOut(a, d); return; }
  if (d.armor && !isSpecial) return;
  d.armor = false; setState(d, 'hit'); d.stunDur = mv.stun; d.vx = a.face * mv.kb; d.buf = null;
  if (isSpecial) { d.vy = 600; d.jump = 1; }
}

function knockOut(a, d) {
  const m = G.match; if (!m || m.phase !== 'fight') return;
  d.armor = false; setState(d, 'ko'); d.vy = 950; d.jump = 1; d.vx = a.face * 520; d.koSpin = (Math.PI * 2.5) / (2 * 950 / GRAV);
  d.koRot = 0; a.buf = null;
  m.phase = 'ko'; m.phaseT = 0; m.winner = a; G.slow = 0.28; G.freeze = 0.18; G.shake = 30; G.zoom = 0.1;
  Audio.ko(); lib.haptics && lib.haptics.play('error');
  fx('text', 360, 440, { s: 'K.O.!', size: 170, color: '#ff4d6d', life: 1.6, vy: 0, rot: -0.08 });
  for (let i = 0; i < 24; i++) fx('star', d.x, GROUND - 160, { vx: rand(-700, 700), vy: rand(-800, 100), g: 900, size: rand(12, 30), color: pick(['#ffe14d', '#fff', a.c.color]), life: rand(0.6, 1.2), vr: rand(-12, 12) });
}

function fireSpecial(f) {
  const o = foe(f); Audio.special();
  G.shake = Math.max(G.shake, 12); G.zoom = Math.max(G.zoom, 0.04);
  lib.haptics && lib.haptics.play({ intensity: 0.9, sharpness: 0.5, duration: 120 });
  f.energy = 0;
  G.projs.push({ x: f.x + f.face * 70, h: 140, vx: f.face * 820, owner: f, kind: f.c.kind, color: f.c.color, t: 0, dead: false, face: f.face, dmg: 0 });
  fx('ring', f.x + f.face * 60, GROUND - 140, { size: 180, life: 0.4, color: f.c.color });
  fx('text', f.x, GROUND - 380, { s: f.c.name.toUpperCase() + '!', size: 44, color: '#fff', life: 1.0, vy: -50 });
  for (let i = 0; i < 10; i++) fx('line', f.x - f.face * rand(40, 300), GROUND - rand(40, 280), { vx: -f.face * 300, size: rand(40, 100), life: 0.3, color: '#fff8', rot: 0 });
}

function updateProjs(dt) {
  for (const p of G.projs) {
    p.t += dt; p.x += p.vx * dt;
    if (Math.random() < 0.7) fx(p.kind === 'heart' ? 'heart' : 'dot', p.x - p.face * 30, GROUND - p.h + rand(-30, 30), { vx: -p.face * rand(40, 140), vy: rand(-60, 60), life: 0.4, size: rand(14, 26), color: Math.random() < 0.5 ? p.color : '#fff', front: false });
    if (p.x < -120 || p.x > W + 120) p.dead = true;
    const d = foe(p.owner);
    if (!p.dead && G.match && G.match.phase === 'fight' && d && d.state !== 'ko' && !p.display) {
      if (Math.abs(p.x - d.x) < 78 && d.jump < 120) { p.dead = true; applyHit(p.owner, d, MOVES.special, true, true); G.freeze = 0.14; burstAt(p.x, GROUND - p.h, p.color, 22, 900); fx('ring', p.x, GROUND - p.h, { size: 260, life: 0.5, color: p.color }); }
    }
    for (const q of G.projs) if (q !== p && !q.dead && !p.dead && q.owner !== p.owner && Math.abs(q.x - p.x) < 60) { p.dead = q.dead = true; burstAt(p.x, GROUND - p.h, '#fff', 20, 700); fx('ring', p.x, GROUND - p.h, { size: 240, life: 0.5, color: '#fff' }); Audio.hit(true); G.shake = 14; }
  }
  G.projs = G.projs.filter((p) => !p.dead);
}
function drawProj(p, t) {
  const y = GROUND - p.h; ctx.save(); ctx.translate(p.x, y);
  glow(0, 0, 130, p.color, 0.8);
  ctx.scale(p.face, 1);
  switch (p.kind) {
    case 'fire': { const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 60); g.addColorStop(0, '#fff7c2'); g.addColorStop(0.4, '#ffb52e'); g.addColorStop(1, '#ff3b1f'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 58 + 6 * Math.sin(t * 40), 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-40, -30); ctx.quadraticCurveTo(-120, 0, -40, 30); ctx.fillStyle = '#ff7a1a'; ctx.fill(); break; }
    case 'heart': ctx.rotate(Math.sin(t * 14) * 0.2); heartPath(0, 0, 70); ctx.fillStyle = '#ff5d9e'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.stroke(); break;
    case 'bolt': ctx.beginPath(); ctx.moveTo(40, -70); ctx.lineTo(-10, -8); ctx.lineTo(20, -8); ctx.lineTo(-40, 70); ctx.lineTo(0, 6); ctx.lineTo(-24, 6); ctx.closePath(); ctx.fillStyle = '#ffe94d'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#fff'; ctx.stroke(); break;
    case 'shuriken': ctx.rotate(t * 22); starPath(0, 0, 66, 4, 0.32, 0); ctx.fillStyle = '#34344f'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill(); break;
    case 'wave': ctx.beginPath(); ctx.arc(-20, 0, 80, -1.15, 1.15); ctx.arc(10, 0, 62, 1.15, -1.15, true); ctx.closePath(); ctx.fillStyle = '#e8f8ff'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = p.color; ctx.stroke(); break;
    default: ctx.rotate(t * 10); starPath(0, 0, 74, 5); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.stroke(); break;
  }
  ctx.restore();
}

/* ------------------------------------------------------------ CPU brain */
function aiThink(f, o, dt) {
  const a = f.ai, lvl = G.level; a.t -= dt; a.cool -= dt;
  if (f.state !== 'idle' && f.state !== 'walk') return;
  if (a.t > 0) return;
  a.t = rand(0.16, 0.42) * (1.25 - 0.1 * lvl);
  const dx = o.x - f.x, dist = Math.abs(dx), dir = Math.sign(dx);
  f.intent = { l: false, r: false };
  const incoming = G.projs.find((p) => p.owner === o && Math.abs(p.x - f.x) < 340 && Math.sign(f.x - p.x) === p.face);
  if (incoming && f.jump <= 0 && Math.random() < 0.18 + 0.11 * lvl) { actionStart(f, 'jump'); return; }
  if (f.energy >= 100 && dist > 220 && Math.random() < 0.55) { actionStart(f, 'special'); return; }
  if (f.energy >= 100 && dist < 220 && Math.random() < 0.25) { actionStart(f, 'special'); return; }
  const oAtk = o.state === 'punch' || o.state === 'kick';
  if (dist > 175) {
    if (dir > 0) f.intent.r = true; else f.intent.l = true;
    if (Math.random() < 0.03 + 0.012 * lvl) actionStart(f, 'jump');
  } else if (a.cool <= 0 && !oAtk && Math.random() < 0.42 + 0.09 * lvl) {
    actionStart(f, Math.random() < 0.58 ? 'punch' : 'kick'); a.cool = rand(0.2, 0.55) * (1.2 - 0.1 * lvl);
  } else if (oAtk && Math.random() < 0.08 * lvl) {
    if (dir > 0) f.intent.l = true; else f.intent.r = true;
  } else if (Math.random() < 0.18) { if (dir > 0) f.intent.l = true; else f.intent.r = true; }
}

/* ------------------------------------------------------------ match flow */
function startMatch() {
  G.theme = G.streak % 3;
  G.level = clamp((cfg().cpuLevel || 2) + G.streak * 0.5, 1, 7);
  G.match = { round: 1, pw: 0, cw: 0, phase: 'intro', phaseT: 0, time: cfg().roundTime || 60, maxCombo: [0, 0], result: null, winner: null, score: 0, announced: 0, hpTotal: 0 };
  G.projs = []; G.parts = [];
  startRound(true);
  G.scene = 'fight'; Audio.music('fight');
}
function startRound(first) {
  const m = G.match, hp = cfg().startHp || 100;
  const p = makeFighter(G.charIdx, -1, { hp }), c = makeFighter(G.oppIdx, 1, { hp, cpu: true });
  p.wins = m.pw; c.wins = m.cw;
  if (!first && G.fighters.length) { p.energy = Math.min(60, G.fighters[0].energy * 0.4); c.energy = Math.min(60, G.fighters[1].energy * 0.4); }
  p.jump = 520; p.vy = 0; c.jump = 520; c.vy = 0; p.face = 1; c.face = -1;
  G.fighters = [p, c]; G.projs = []; G.slow = 1;
  m.phase = 'intro'; m.phaseT = 0; m.time = cfg().roundTime || 60; m.winner = null; m.announced = 0; G.ctl.l = G.ctl.r = false;
}
function endMatch() {
  const m = G.match, p = G.fighters[0], won = m.pw >= 2;
  const timeBonus = 0;
  let sc = 0;
  if (won) sc = 1000 + Math.round(p.hp * 10) + m.maxCombo[0] * 60 + G.streak * 200 + timeBonus;
  else sc = Math.round(m.pw * 250 + m.maxCombo[0] * 30);
  m.score = sc; m.won = won; G.total += sc;
  if (won) G.streak++;
  const finalTotal = G.total;
  if (finalTotal > G.best) G.best = finalTotal;
  if (!won) { /* streak resets when the player taps retry/menu */ }
  submitScore(finalTotal);
  saveProgress();
  G.scene = 'result'; G.resultT = 0;
  const [fp, fc] = G.fighters, wf = won ? fp : fc, lf = won ? fc : fp;
  setState(wf, 'win'); wf.armor = false; if (lf.state !== 'ko') setState(lf, 'dizzy');
  if (won) { Audio.win(); for (let i = 0; i < 60; i++) fx('confetti', rand(0, W), rand(-300, 0), { vx: rand(-60, 60), vy: rand(120, 360), size: rand(14, 26), color: pick(['#ff5d8f', '#ffd23f', '#4dd2ff', '#7dff7d', '#c58bff']), life: rand(2.5, 4), vr: rand(-10, 10), g: 40 }); lib.haptics && lib.haptics.play('success'); }
  else Audio.lose();
}
async function submitScore(v) { try { if (v > 0) await lib.addPlayerScoreToLeaderboard(v); } catch (e) {} }
let saveTimer = 0;
function saveProgress() { try { const r = lib.saveUserGameState({ best: G.best, char: G.charIdx, sound: !Audio.muted }); if (r && r.catch) r.catch(() => {}); } catch (e) {} }

function updateMatch(dt) {
  const m = G.match; if (!m) return;
  m.phaseT += dt;
  if (m.phase === 'intro') {
    const [p, c] = G.fighters;
    for (const f of [p, c]) { if (f.jump > 0) { f.vy -= GRAV * 0.6 * dt; f.jump += f.vy * dt; if (f.jump <= 0) { f.jump = 0; f.vy = 0; f.landT = 0.14; Audio.land(); G.shake = 8; fx('puff', f.x, GROUND, { size: 70, life: 0.4, color: '#fff' }); } } f.st += dt; }
    if (m.announced === 0 && m.phaseT > 0.25) { m.announced = 1; Audio.ding(); }
    if (m.announced === 1 && m.phaseT > 1.25) { m.announced = 2; Audio.fight(); G.shake = 10; }
    if (m.phaseT > 1.9) { m.phase = 'fight'; m.phaseT = 0; }
    return;
  }
  if (m.phase === 'fight') {
    m.time -= dt;
    if (m.time <= 0) { // time up: more HP wins (tie goes to the player)
      m.time = 0; const [p, c] = G.fighters;
      const pw = p.hp >= c.hp; m.phase = 'timeup'; m.phaseT = 0; m.winner = pw ? p : c;
      fx('text', 360, 440, { s: 'TIME UP!', size: 120, color: '#ffd23f', life: 1.8, vy: 0 });
      Audio.ding();
    }
  }
  if (m.phase === 'ko' || m.phase === 'timeup') {
    if (m.phase === 'ko' && m.phaseT > 1.0) G.slow = lerp(G.slow, 1, clamp(dt * 3, 0, 1));
    const wait = m.phase === 'ko' ? 2.6 : 2.2;
    if (m.phaseT > 0.5 && m.winner && m.winner.state !== 'win' && m.winner.state !== 'ko') { setState(m.winner, 'win'); m.winner.armor = false; }
    if (m.phaseT > wait && !m.decided) {
      m.decided = true; G.slow = 1;
      if (m.winner === G.fighters[0]) m.pw++; else m.cw++;
      if (m.pw >= 2 || m.cw >= 2) { endMatch(); }
      else { m.round++; m.decided = false; startRound(false); }
    }
  }
}

/* ------------------------------------------------------------ actors for menus */
function makeActor(ci, x, y, h, w) {
  const f = makeFighter(ci, 1, { display: true, h, w }); f.x = x; f.ground = y; f.face = x > 360 ? -1 : 1; f.pending = 0; return f;
}
function showOff(f, a) {
  if (f.state !== 'idle') return;
  const act = a || pick(['punch', 'kick', 'special', 'jump']);
  if (act === 'jump') { f.vy = 1100; f.jump = 1; Audio.boing(); fx('heart', f.x, GROUND - f.h, { vy: -200, g: -50, size: 22, life: 1, color: '#ff7fb0', vr: 5 }); return; }
  setState(f, act); f.armor = false;
  if (act === 'punch') Audio.punch(); else if (act === 'kick') Audio.kick(); else Audio.charge();
}
function updateActor(f, dt) {
  f.st += dt;
  if (f.state === 'idle' && f.jump <= 0) { f.idleT -= dt; if (f.idleT < 0) { f.idleT = rand(2.5, 6); if (Math.random() < 0.6) { f.vy = 700 * f.ps.hop; f.jump = 1; } } } f.flash = Math.max(0, f.flash - dt); f.landT = Math.max(0, f.landT - dt);
  if (f.jump > 0 || f.vy > 0) { f.vy -= GRAV * dt; f.jump += f.vy * dt; if (f.jump <= 0) { f.jump = 0; f.vy = 0; f.landT = 0.12; Audio.land(); } }
  const mv = MOVES[f.state];
  if (f.state === 'punch' || f.state === 'kick') {
    if (!f.struck && f.st >= mv.hitAt) { f.struck = true; const x = f.x + f.face * 150; impact(x, GROUND - 160, f.state === 'kick', f.c.color); }
    if (f.st >= mv.dur) setState(f, 'idle');
  } else if (f.state === 'special') {
    if (!f.fired && f.st >= mv.fireAt) { f.fired = true; Audio.special(); G.projs.push({ x: f.x + f.face * 70, h: 140, vx: f.face * 820, owner: f, kind: f.c.kind, color: f.c.color, t: 0, dead: false, face: f.face, display: true }); fx('ring', f.x + f.face * 60, GROUND - 140, { size: 180, life: 0.4, color: f.c.color }); }
    if (f.st < mv.fireAt && Math.random() < 0.5) fx('dot', f.x + rand(-90, 90), GROUND - rand(0, 280), { vy: -260, life: 0.5, size: rand(14, 26), color: f.c.color });
    if (f.st >= mv.dur) setState(f, 'idle');
  }
}
function updateProjsDisplay(dt) {
  for (const p of G.projs) { p.t += dt; p.x += p.vx * dt; if (Math.random() < 0.7) fx('dot', p.x - p.face * 30, GROUND - p.h + rand(-30, 30), { vx: -p.face * 80, life: 0.4, size: rand(14, 26), color: Math.random() < 0.5 ? p.color : '#fff', front: false }); if (p.x < -120 || p.x > W + 120) p.dead = true; }
  G.projs = G.projs.filter((p) => !p.dead);
}

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

/* ------------------------------------------------------------ scenes: title */
let titleActors = [];
function enterTitle() {
  G.scene = 'title'; G.fade = 1; G.parts = []; G.projs = []; G.theme = 0; G.paused = false;
  const ids = CHARS.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 5);
  const xs = [95, 235, 360, 485, 625], hs = [260, 285, 330, 285, 260];
  titleActors = ids.map((ci, i) => makeActor(ci, xs[i], GROUND, hs[i], hs[i] * 1.1));
  titleActors[2].x = 360;
  Audio.music('menu');
}
function drawTitle(dt) {
  drawWorldBack();
  for (const f of titleActors.slice().sort((a, b) => a.h - b.h)) { updateActor(f, dt); drawFighter(f, G.t); }
  for (const f of titleActors) addHit('act' + f.ci, f.x - 90, GROUND - f.h, 180, f.h, () => { showOff(f); G.zoom = 0.02; }, true);
  drawProjs(); drawParts();
  // logo
  const wob = (i) => Math.sin(G.t * 3 + i * 0.7) * 8;
  const l1 = 'FIGHTING', l2 = 'DOLL';
  ctx.save(); ctx.translate(360, 215); ctx.rotate(-0.04);
  let x = -250; for (let i = 0; i < l1.length; i++) { ctx.font = `900 112px ${FONT}`; const w = ctx.measureText(l1[i]).width; txt(l1[i], x + w / 2, wob(i), 112, '#fff', { grad: [[0, '#fff7a8'], [1, '#ffb52e']], stroke: '#43186e', sw: 22 }); x += w + 2; }
  ctx.restore();
  ctx.save(); ctx.translate(360, 365); ctx.rotate(0.03);
  const sc = 1 + 0.03 * Math.sin(G.t * 4);
  x = -215 * sc; for (let i = 0; i < l2.length; i++) { ctx.font = `900 200px ${FONT}`; const w = ctx.measureText(l2[i]).width * sc; txt(l2[i], x + w / 2, wob(i + 3), 200, '#fff', { grad: [[0, '#ffd6f2'], [1, '#ff5db1']], stroke: '#43186e', sw: 30, sc }); x += w; }
  ctx.restore();
  for (let i = 0; i < 6; i++) { const a = G.t * 1.2 + i * 1.05; starPath(360 + Math.cos(a) * 330, 290 + Math.sin(a * 1.3) * 140, 14 + (i % 2) * 6, 5); ctx.fillStyle = '#ffe14d'; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1; }
  // play
  button('play', 'PLAY', 130, 985, 460, 150, '#5dff8a', '#16b84a', () => { Audio.select(); go('select'); }, { size: 78, pulse: true });
  if (G.best > 0) {
    txt('★ ' + fmt(G.best), 360, 1195, 46, '#ffe14d', { sw: 10 });
  }
  soundBtn(610, 14);
}

/* ------------------------------------------------------------ scenes: select */
let selActor = null, selBounce = 0;
function enterSelect() {
  G.scene = 'select'; G.parts = []; G.projs = []; G.theme = 0;
  setSelActor(G.charIdx);
}
function setSelActor(i) { G.charIdx = i; selActor = makeActor(i, 360, GROUND, 340, 340); selActor.face = 1; selBounce = 0.3; }
function drawSelect(dt) {
  // backdrop: sky + panel, preview floor
  drawStageBack(ctx, stages[0], G.t);
  ctx.save(); const pg = ctx.createLinearGradient(0, 540, 0, H); pg.addColorStop(0, '#3b1f7a'); pg.addColorStop(1, '#1d0f45'); ctx.fillStyle = pg; ctx.fillRect(0, 540, W, H - 540); ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 540, W, 6); ctx.restore();
  // preview
  const c = CHARS[G.charIdx];
  glow(360, 360, 260 + 12 * Math.sin(G.t * 3), c.color, 0.85);
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(360, 518, 190, 28, 0, 0, 7); ctx.fill(); ctx.restore();
  // actor drawn on its own ground line (shifted up so feet sit on the pedestal)
  ctx.save(); ctx.translate(0, 518 - GROUND); selBounce = Math.max(0, selBounce - dt);
  const bs = 1 + selBounce * 0.5 * Math.sin(selBounce * 40);
  ctx.translate(360, GROUND); ctx.scale(bs, bs); ctx.translate(-360, -GROUND);
  updateActor(selActor, dt); drawFighter(selActor, G.t); drawProjs(); drawPartsFront();
  ctx.restore();
  addHit('prev', 120, 110, 480, 420, () => { showOff(selActor); }, true);
  txt(c.name, 360, 64, 52, '#fff', { sw: 12 });
  // stat bars
  const bar = (label, v, y, col) => { ctx.save(); txt(label, 36, y, 22, '#fff', { align: 'left', sw: 6 }); rr(130, y - 9, 130, 18, 9); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill(); rr(130, y - 9, 130 * clamp((v - 0.8) / 0.4, 0.1, 1), 18, 9); ctx.fillStyle = col; ctx.fill(); ctx.restore(); };
  bar('SPD', c.spd, 140, '#4dd2ff'); bar('POW', c.pow, 172, '#ff6a6a');
  // grid (4 columns, last row centered)
  const cw = 150, ch = 150, gap = 12, gy = 566, cols = 4, n = CHARS.length;
  CHARS.forEach((ch2, i) => {
    const row = (i / cols) | 0, inRow = Math.min(cols, n - row * cols), col = i % cols;
    const x = (W - (inRow * cw + (inRow - 1) * gap)) / 2 + col * (cw + gap), y = gy + row * (ch + gap), sel = i === G.charIdx;
    const base = SPR[i] && SPR[i].idle;
    const bump = sel ? 1.05 + 0.02 * Math.sin(G.t * 8) : 1;
    ctx.save(); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale((G.down === 'card' + i ? 0.94 : 1) * bump, (G.down === 'card' + i ? 0.94 : 1) * bump);
    rr(-cw / 2, -ch / 2, cw, ch, 24); const g = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2); g.addColorStop(0, sel ? '#fff7b0' : '#ffffff'); g.addColorStop(1, sel ? '#ffd23f' : '#d9d2ff'); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = sel ? 8 : 4; ctx.strokeStyle = sel ? ch2.color : '#6a4ad6'; ctx.stroke();
    if (base) { const s2 = Math.min(122 / base.ih, 128 / base.iw); const iw = base.iw * s2, ih = base.ih * s2; ctx.drawImage(base.img, -iw / 2, -ih / 2 + 2, iw, ih); }
    ctx.restore();
    addHit('card' + i, x, y, cw, ch, () => { if (i !== G.charIdx) { Audio.boing(); } else Audio.select(); setSelActor(i); selBounce = 0.3; burstAt(360, 340, CHARS[i].color, 10, 500); }, true);
  });
  button('fight', 'FIGHT!', 130, 1160, 460, 100, '#ff7a7a', '#e0243f', () => { Audio.select(); G.streak = 0; G.total = 0; pickOpponent(); saveProgress(); go('fight'); }, { size: 56, pulse: true });
  button('back', '', 14, 10, 96, 96, '#7b5cff', '#4a35c9', () => { Audio.select(); go('title'); }, { icon: iconBack });
  soundBtn(610, 14);
}
function pickOpponent() {
  let i; do { i = (Math.random() * CHARS.length) | 0; } while (i === G.charIdx); G.oppIdx = i;
}
function drawPartsFront() { drawParts(); }

/* ------------------------------------------------------------ scenes: fight */
function drawWorldBack() {
  const st = stages[G.theme % 3];
  drawStageBack(ctx, st, G.t); drawStageFront(ctx, st);
}
function drawProjs() { for (const p of G.projs) drawProj(p, G.t); }

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

const CTL = {
  l: { cx: 90, cy: 1160, r: 76 }, r: { cx: 250, cy: 1160, r: 76 }, jump: { cx: 170, cy: 1010, r: 66 },
  special: { cx: 548, cy: 995, r: 80 }, punch: { cx: 410, cy: 1160, r: 80 }, kick: { cx: 590, cy: 1160, r: 80 },
};
function drawControls() {
  const f = G.fighters[0];
  const held = (k) => (k === 'l' ? G.ctl.l || G.keys.ArrowLeft || G.keys.KeyA : k === 'r' ? G.ctl.r || G.keys.ArrowRight || G.keys.KeyD : G.pressed && G.pressed[k] > 0);
  const circ = (k, c1, c2, label, icon) => {
    const b = CTL[k], on = held(k), s = on ? 0.92 : 1, rdy = k === 'special' && f.energy >= 100;
    ctx.save(); ctx.translate(b.cx, b.cy); ctx.scale(s * (rdy ? 1 + 0.05 * Math.sin(G.t * 12) : 1), s * (rdy ? 1 + 0.05 * Math.sin(G.t * 12) : 1));
    if (rdy) glow(0, 0, b.r * 1.9, '#ffe14d', 0.9);
    ctx.beginPath(); ctx.arc(0, 8, b.r, 0, 7); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    const g = ctx.createLinearGradient(0, -b.r, 0, b.r); g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = rdy ? '#fff48a' : '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -b.r * 0.45, b.r * 0.62, b.r * 0.32, 0, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
    icon && icon(b.r);
    if (label) txt(label, 0, b.r * 0.5, b.r * 0.3, '#fff', { sw: 6 });
    if (k === 'special') { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(0, 0, b.r + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (f.energy / 100)); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  };
  const arrow = (dir) => (r) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a114f'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(dir * r * 0.4, 0); ctx.lineTo(-dir * r * 0.3, -r * 0.45); ctx.lineTo(-dir * r * 0.3, r * 0.45); ctx.closePath(); ctx.stroke(); ctx.fill(); };
  circ('l', '#4dd2ff', '#2a7de1', '', arrow(-1)); circ('r', '#4dd2ff', '#2a7de1', '', arrow(1));
  circ('jump', '#7dff7d', '#27ae60', '', (r) => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.15); ctx.lineTo(0, -r * 0.25); ctx.lineTo(r * 0.4, r * 0.15); ctx.stroke(); });
  circ('punch', '#ff8a8a', '#e0243f', 'PUNCH', (r) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a114f'; ctx.lineWidth = 5; rr(-r * 0.36, -r * 0.5, r * 0.72, r * 0.5, r * 0.15); ctx.fill(); ctx.stroke(); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-r * 0.27 + i * r * 0.18, -r * 0.5, r * 0.1, 0, 7); ctx.fill(); ctx.stroke(); } });
  circ('kick', '#ffd23f', '#f08a00', 'KICK', (r) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a114f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.55); ctx.lineTo(r * 0.05, -r * 0.55); ctx.lineTo(r * 0.08, -r * 0.2); ctx.lineTo(r * 0.38, -r * 0.1); ctx.quadraticCurveTo(r * 0.45, r * 0.05, r * 0.3, r * 0.05); ctx.lineTo(-r * 0.22, r * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke(); });
  circ('special', '#d28bff', '#7a3cf0', f.energy >= 100 ? 'GO!' : '', (r) => { starPath(0, -r * 0.18, r * 0.5, 5); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#2a114f'; ctx.stroke(); });
  if (G.toast && G.toast.t > 0) txt('Charge the ★ bar!', 360, 905, 34, '#ffe14d', { sw: 8, alpha: clamp(G.toast.t * 3, 0, 1) });
}

function ctlHit(x, y) {
  let best = null, bd = 1e9;
  for (const k in CTL) { const b = CTL[k], d = Math.hypot(x - b.cx, y - b.cy); if (d < b.r + 18 && d < bd) { best = k; bd = d; } }
  return best;
}
function ctlPress(k) {
  const f = G.fighters[0]; if (!f) return;
  G.pressed = G.pressed || {}; G.pressed[k] = 0.12;
  if (k === 'l' || k === 'r') return;
  const m = G.match; if (!m || m.phase !== 'fight') return;
  if (!actionStart(f, k)) f.buf = { a: k, t: 0.2 };
}

function drawBanner() {
  const m = G.match;
  if (m.phase === 'intro') {
    if (m.announced <= 1) { const k = clamp((m.phaseT - 0.25) / 0.35, 0, 1), s = ease(k) * 1.15 - 0.15 * k; txt('ROUND ' + m.round, 360, 480, 118, '#fff', { grad: [[0, '#fff'], [1, '#aee4ff']], sc: Math.max(0.01, s), sw: 26 }); }
    else { const k = clamp((m.phaseT - 1.25) / 0.25, 0, 1), s = 0.4 + ease(k) * 1.0 + Math.sin(m.phaseT * 30) * 0.02; txt('FIGHT!', 360, 480, 170, '#fff', { grad: [[0, '#ffe14d'], [1, '#ff5d3d']], sc: s, sw: 30, alpha: m.phaseT > 1.7 ? clamp((1.9 - m.phaseT) * 5, 0, 1) : 1 }); }
  }
}

function drawFight(dt) {
  const f0 = G.fighters[0];
  ctx.save();
  const sh = G.shake, zx = 360, zy = 640, z = 1 + G.zoom;
  ctx.translate(zx + (sh ? rand(-sh, sh) : 0), zy + (sh ? rand(-sh, sh) : 0)); ctx.scale(z, z); ctx.translate(-zx, -zy);
  drawWorldBack();
  const order = G.fighters.slice().sort((a, b) => (a.state === 'ko' ? -1 : 0) - (b.state === 'ko' ? -1 : 0));
  for (const f of order) drawFighter(f, G.t);
  drawProjs();
  drawParts();
  ctx.restore();
  // special vignette
  const sp = G.fighters.find((f) => f.state === 'special' && f.st < MOVES.special.fireAt);
  if (sp) { const g = ctx.createRadialGradient(360, 640, 200, 360, 640, 800); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,0,80,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, PANEL_TOP); }
  drawHud();
  if (G.scene === 'fight') {
    drawControls();
    button('pause', '', 312, 150, 96, 96, '#7b5cff', '#4a35c9', () => { G.paused = true; Audio.select(); }, { icon: iconPause });
    drawBanner();
  }
}

/* ------------------------------------------------------------ result + pause overlays */
function drawResult(dt) {
  G.resultT += dt;
  drawFight(dt);
  const m = G.match, k = ease(G.resultT / 0.5);
  ctx.save(); ctx.fillStyle = `rgba(30,10,70,${0.35 * k})`; ctx.fillRect(0, 0, W, PANEL_TOP); ctx.restore();
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
  G.parts = []; G.projs = []; G.fade = 1; G.ctl.l = G.ctl.r = false; G.pressed = {};
  if (s === 'title') enterTitle();
  else if (s === 'select') { enterSelect(); Audio.music('menu'); }
  else if (s === 'fight') startMatch();
}

/* ------------------------------------------------------------ input */
function toLocal(e) { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; }
function uiAt(x, y) { for (let i = G.hits.length - 1; i >= 0; i--) { const h = G.hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; }
function onDown(e) {
  e.preventDefault(); Audio.init(); Audio.resume();
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  if (G.mode === 'edit') return;
  const { x, y } = toLocal(e);
  const ptr = { x, y, ctl: null, ui: null }; G.ptrs[e.pointerId] = ptr;
  if (G.scene === 'fight' && !G.paused) {
    const ui = uiAt(x, y); if (ui && ui.id === 'pause') { ptr.ui = ui; G.down = ui.id; return; }
    const k = ctlHit(x, y);
    if (k) { ptr.ctl = k; if (k === 'l') G.ctl.l = true; else if (k === 'r') G.ctl.r = true; else ctlPress(k); }
    return;
  }
  const ui = uiAt(x, y);
  if (ui) { if (ui.down) { ui.fn(); } else { ptr.ui = ui; G.down = ui.id; } }
}
function onMove(e) {
  const ptr = G.ptrs[e.pointerId]; if (!ptr) return;
  const { x, y } = toLocal(e);
  if (ptr.ctl === 'l' || ptr.ctl === 'r') {
    const k = ctlHit(x, y);
    if ((k === 'l' || k === 'r') && k !== ptr.ctl) { G.ctl[ptr.ctl] = false; ptr.ctl = k; G.ctl[k] = true; }
  }
  if (ptr.ui) G.down = (uiAt(x, y) === ptr.ui) ? ptr.ui.id : null;
}
function onUp(e) {
  const ptr = G.ptrs[e.pointerId]; delete G.ptrs[e.pointerId]; if (!ptr) return;
  if (ptr.ctl === 'l') G.ctl.l = Object.values(G.ptrs).some((p) => p.ctl === 'l');
  if (ptr.ctl === 'r') G.ctl.r = Object.values(G.ptrs).some((p) => p.ctl === 'r');
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
    else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') ctlPress('jump');
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
  // scene fades
  if (G.fadeOut !== undefined && G.fadeOut !== null) { G.fadeOut += real * 5; if (G.fadeOut >= 1) { const s = pendingScene; G.fadeOut = null; applyScene(s); } }
  else if (G.fade > 0) G.fade = Math.max(0, G.fade - real * 3);
  // decay fx
  G.shake = Math.max(0, G.shake - real * 60); G.zoom = Math.max(0, G.zoom - real * 0.2);

  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.clearRect(0, 0, W, H);
  G.ad = 0;
  if (!loaded) { drawLoading(); return; }

  if (G.mode === 'edit') { G.ad = real; drawEdit(real); return; }

  let dt = real;
  if (G.paused) dt = 0;
  else if (G.freeze > 0) { G.freeze -= real; dt = 0; }
  else dt = real * G.slow;
  G.ad = dt;

  if (G.scene === 'title') { updateParts(real); drawTitle(real); }
  else if (G.scene === 'select') { updateParts(real); drawSelect(real); }
  else if (G.scene === 'fight' || G.scene === 'result') {
    if (dt > 0) {
      updateMatch(dt);
      if (G.match.phase === 'fight' || G.match.phase === 'ko' || G.match.phase === 'timeup' || G.scene === 'result') { for (const f of G.fighters) updateFighter(f, dt); }
      if (G.scene === 'fight') updateProjs(dt);
      pushApart();
      updateParts(dt);
    }
    if (G.scene === 'result') { for (const f of G.fighters) f.st += 0; drawResult(real); }
    else drawFight(real);
    if (G.paused) drawPause();
  }
  if (G.fadeOut) { ctx.fillStyle = `rgba(20,6,50,${clamp(G.fadeOut, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
  else if (G.fade > 0) { ctx.fillStyle = `rgba(20,6,50,${G.fade})`; ctx.fillRect(0, 0, W, H); }
}
function pushApart() {
  const [a, b] = G.fighters; if (!a || !b) return;
  if (a.state === 'ko' || b.state === 'ko' || a.jump > 60 || b.jump > 60) return;
  const d = b.x - a.x, min = 100;
  if (Math.abs(d) < min) { const push = (min - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1); a.x = clamp(a.x - push, 72, W - 72); b.x = clamp(b.x + push, 72, W - 72); }
}
function drawLoading() {
  ctx.fillStyle = '#2a1260'; ctx.fillRect(0, 0, W, H);
  txt('FIGHTING DOLL', 360, 560, 76, '#fff', { sw: 16 });
  rr(160, 660, 400, 30, 15); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill();
  rr(160, 660, 400 * (G.loadK || 0), 30, 15); ctx.fillStyle = '#ffe14d'; ctx.fill();
}

/* ------------------------------------------------------------ edit mode (preview only) */
let editActors = null;
function drawEdit(dt) {
  if (!editActors) { editActors = [makeActor(G.charIdx, 200, GROUND, 300, 330), makeActor((G.charIdx + 1) % CHARS.length, 520, GROUND, 300, 330)]; editActors[1].face = -1; }
  G.theme = 0; drawWorldBack();
  for (const f of editActors) { f.st += dt; drawFighter(f, G.t); }
  const c = CHARS[G.charIdx]; txt(c.name + '  VS  ' + CHARS[(G.charIdx + 1) % CHARS.length].name, 360, 500, 30, '#fff', { sw: 8 });
}

/* ------------------------------------------------------------ boot */
const POSES = ['idle', 'punch', 'kick', 'special', 'hit', 'win'];
function loadPose(ci, pose) {
  return new Promise((res) => {
    const a = lib.getAsset(CHARS[ci].id + '_' + pose);
    if (!a) { res(false); return; }
    const img = new Image();
    img.onload = () => { if (img.naturalWidth > 0) SPR[ci][pose] = { img, iw: img.naturalWidth, ih: img.naturalHeight, white: undefined }; res(true); };
    img.onerror = () => res(false);
    img.src = a.url;
  });
}
// Idle poses block the start screen; the other poses stream in afterwards (idle is the fallback until they arrive).
async function loadImages() {
  CHARS.forEach((_, i) => { SPR[i] = {}; });
  await Promise.all(CHARS.map((_, i) => loadPose(i, 'idle').then(() => { G.loadK = (G.loadK || 0) + 1 / CHARS.length; })));
  (async () => { for (let i = 0; i < CHARS.length; i++) await Promise.all(POSES.slice(1).map((p) => loadPose(i, p))); })();
}
async function run(mode) {
  G.mode = mode || window.mode || 'play';
  if (!canvas) {
    canvas = document.getElementById('game'); ctx = canvas.getContext('2d');
    canvas.width = W * S; canvas.height = H * S;
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => onKey(e, true)); window.addEventListener('keyup', (e) => onKey(e, false));
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.scene === 'fight') G.paused = true; });
    requestAnimationFrame(frame);
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
  await loadImages();
  stages = [makeStage(0, S), makeStage(1, S), makeStage(2, S)];
  // restore saved progress (never block longer than 1.2s)
  if (G.mode === 'play') {
    try {
      const r = await Promise.race([lib.getUserGameState(), new Promise((res) => setTimeout(() => res(null), 1200))]);
      const s = r && r.state; if (s) { G.best = s.best || 0; if (typeof s.char === 'number' && s.char >= 0 && s.char < CHARS.length) G.charIdx = s.char; if (s.sound === false) Audio.setMuted(true); }
    } catch (e) {}
  }
  if (cfg().music === false) Audio.setMuted(true);
  loaded = true;
  if (G.mode === 'edit') { editActors = null; return; }
  enterTitle();
}
window.run = run;
