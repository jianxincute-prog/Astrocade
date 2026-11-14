/*
 * Worker animations — canvas drawing for settlers at work (axes, pickaxes, hoes, rods,
 * spears, bows, claws) and the goods they haul home. No globals: everything comes in as
 * arguments, so the world renderer in game.js stays the only owner of camera state.
 */
import { toolAngle } from './jobs.js';

// [handle, head light, head dark] per race
export const TOOL_PAL = {
  human:    ['#8a5a34', '#dfe5ee', '#7a8290'],
  elf:      ['#efe2b4', '#b6ffe0', '#4fbf98'],
  dwarf:    ['#5a3a20', '#ffd860', '#a07a20'],
  orc:      ['#4a3020', '#b8a890', '#6a5040'],
  werewolf: ['#3a3040', '#f4f6ff', '#9aa6c0'],
};

function R(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }

/* Tool shapes in local space: origin = hand, +x = along the handle. */
function shapeAxe(ctx, K, p, big) {
  const L = big ? 7 : 6;
  R(ctx, -K * .4, -K * .9, K * (L + 1), K * 1.8, '#1c1424');                // outline
  R(ctx, 0, -K * .5, K * L, K, p[0]);
  R(ctx, K * (L - 2), -K * (big ? 3.4 : 2.8), K * 2.2, K * (big ? 3.2 : 2.6), '#1c1424');
  R(ctx, K * (L - 1.8), -K * (big ? 3.1 : 2.5), K * 1.8, K * (big ? 2.6 : 2.0), p[1]);
  R(ctx, K * (L - 1.8), -K * (big ? 3.1 : 2.5), K * .6, K * (big ? 2.6 : 2.0), p[2]);
}
function shapePick(ctx, K, p) {
  R(ctx, -K * .4, -K * .9, K * 7.4, K * 1.8, '#1c1424');
  R(ctx, 0, -K * .5, K * 7, K, p[0]);
  R(ctx, K * 5.6, -K * 3.4, K * 1.8, K * 6.8, '#1c1424');
  R(ctx, K * 5.9, -K * 3.1, K * 1.2, K * 6.2, p[1]);
  R(ctx, K * 5.9, K * 1.6, K * 1.2, K * 1.5, p[2]);
  R(ctx, K * 4.9, -K * 3.1, K * 1, K * 1, p[2]);                       // curved tips
  R(ctx, K * 4.9, K * 2.1, K * 1, K * 1, p[2]);
}
function shapeHoe(ctx, K, p) {
  R(ctx, -K * .4, -K * .9, K * 8.4, K * 1.8, '#1c1424');
  R(ctx, 0, -K * .5, K * 8, K, p[0]);
  R(ctx, K * 7, -K * .5, K * 1.4, K * 3.2, '#1c1424');
  R(ctx, K * 7.2, -K * .2, K * 1, K * 2.8, p[1]);
}
function shapeSpear(ctx, K, p) {
  R(ctx, -K * 2.4, -K * .9, K * 11, K * 1.8, '#1c1424');
  R(ctx, -K * 2, -K * .5, K * 9, K, p[0]);
  R(ctx, K * 7, -K * 1.1, K * 2.4, K * 2.2, '#1c1424');
  R(ctx, K * 7, -K * .7, K * 2, K * 1.4, p[1]);
}
function shapeClaws(ctx, K, p) {
  for (let n = 0; n < 3; n++) { R(ctx, 0, -K * 1.6 + n * K * 1.1, K * 3, K * .7, p[1]); R(ctx, K * 2.2, -K * 1.6 + n * K * 1.1, K * .9, K * .7, p[2]); }
}
function shapeBasket(ctx, K) {
  R(ctx, -K * 1.8, -K * .2, K * 3.6, K * 2.6, '#1c1424');
  R(ctx, -K * 1.5, K * .1, K * 3, K * 2, '#c08a48');
  R(ctx, -K * 1.5, K * .9, K * 3, K * .4, '#8a5a2c');
  R(ctx, -K * 1.2, -K * .4, K * .7, K * .7, '#e8344a'); R(ctx, 0, -K * .6, K * .7, K * .7, '#b03aa8'); R(ctx, K * .6, -K * .3, K * .7, K * .7, '#e8344a');
}

function drawShape(ctx, kind, K, p, big) {
  if (kind === 'axe') shapeAxe(ctx, K, p, big);
  else if (kind === 'pick') shapePick(ctx, K, p);
  else if (kind === 'hoe') shapeHoe(ctx, K, p);
  else if (kind === 'spear') shapeSpear(ctx, K, p);
  else if (kind === 'claws') shapeClaws(ctx, K, p);
}

/** Which tool a race uses for a job. */
export function toolFor(job, race) {
  if (race === 'werewolf') return 'claws';
  if (job === 'chop') return 'axe';
  if (job === 'mine') return 'pick';
  if (job === 'farm') return 'hoe';
  if (job === 'hunt') return race === 'elf' ? 'bow' : 'spear';
  return null;
}

function drawBow(ctx, K, hx, hy, hd, pull) {
  ctx.save(); ctx.translate(hx, hy); ctx.scale(hd, 1);
  ctx.strokeStyle = '#1c1424'; ctx.lineWidth = K * 1.4; ctx.beginPath(); ctx.arc(-K * 1.5, 0, K * 4, -1.1, 1.1); ctx.stroke();
  ctx.strokeStyle = '#efe2b4'; ctx.lineWidth = K * .8; ctx.beginPath(); ctx.arc(-K * 1.5, 0, K * 4, -1.1, 1.1); ctx.stroke();
  const ex = -K * 1.5 + Math.cos(1.1) * K * 4, ey = Math.sin(1.1) * K * 4, px = -K * pull;
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Math.max(1, K * .3);
  ctx.beginPath(); ctx.moveTo(ex, -ey); ctx.lineTo(px, 0); ctx.lineTo(ex, ey); ctx.stroke();
  if (pull > 0.5) { R(ctx, px, -K * .3, K * 5, K * .6, '#8a5a34'); R(ctx, px + K * 5, -K * .6, K * 1.2, K * 1.2, '#dfe5ee'); }
  ctx.restore();
}

/**
 * A settler at work (phase 1) or on the way (phase 0, tool resting on the shoulder).
 * o: { job, race, ph, phase, cx, fy, sw, sh, K, hd, tx, ty, frame, id }
 *    (tx, ty) = screen position of the work target (tree base, rock, water, prey).
 */
export function drawWorker(ctx, o) {
  const { job, race, K, hd, cx, fy, sw, sh } = o, p = TOOL_PAL[race] || TOOL_PAL.human;
  const hx = cx + hd * sw * .18, hy = fy - sh * .48;
  const tool = toolFor(job, race), big = race === 'dwarf' || race === 'orc';
  if (o.phase !== 1) {                                                // walking: tool on the shoulder / in hand
    if (job === 'fish') { drawRod(ctx, K, hx, hy, hd, null, o.frame, 0); return; }
    if (job === 'gather') { ctx.save(); ctx.translate(cx - hd * sw * .32, fy - sh * .36); shapeBasket(ctx, K * .8); ctx.restore(); return; }
    if (tool === 'bow') { drawBow(ctx, K, hx, hy, hd, 0); return; }
    if (!tool || tool === 'claws') return;
    ctx.save(); ctx.translate(cx - hd * sw * .1, fy - sh * .55); ctx.scale(hd, 1); ctx.rotate(tool === 'spear' ? -1.25 : -2.3); drawShape(ctx, tool, K * .85, p, big); ctx.restore();
    return;
  }
  if (job === 'fish') { drawRod(ctx, K, hx, hy, hd, [o.tx, o.ty], o.frame + o.id * 13, K); return; }
  if (job === 'gather') {
    ctx.save(); ctx.translate(cx - hd * sw * .32, fy - sh * .36); shapeBasket(ctx, K * .8); ctx.restore();
    const reachUp = Math.sin(o.ph * Math.PI * 2) * .5 + .5;                 // arm reaching into the branches
    ctx.save(); ctx.translate(hx, hy); ctx.scale(hd, 1); ctx.rotate(-.6 - reachUp * .9);
    R(ctx, 0, -K * .6, K * 3.4, K * 1.2, '#1c1424'); R(ctx, K * .2, -K * .3, K * 2.8, K * .7, '#f0c8a0'); ctx.restore();
    return;
  }
  if (tool === 'bow') { drawBow(ctx, K, hx, hy, hd, o.ph < .7 ? o.ph / .7 * 2.5 : 0); return; }
  const ang = tool === 'claws' ? toolAngle('chop', o.ph) * .7 : toolAngle(job === 'hunt' ? 'chop' : job, o.ph);
  ctx.save(); ctx.translate(hx, hy); ctx.scale(hd, 1); ctx.rotate(tool === 'spear' ? ang * .35 : ang);
  drawShape(ctx, tool, K * (tool === 'claws' ? 1 : .9), p, big);
  ctx.restore();
  if (tool === 'claws' && o.ph >= .6 && o.ph < .8) {                  // werewolf slash streaks
    const a = 1 - (o.ph - .6) / .2;
    ctx.strokeStyle = `rgba(220,250,255,${a * .9})`; ctx.lineWidth = Math.max(1, K * .6);
    for (let n = 0; n < 3; n++) { ctx.beginPath(); ctx.arc(o.tx - hd * K * 2, o.ty - K * 3 + n * K * 1.6, K * 3, hd > 0 ? -1.2 : 1.9, hd > 0 ? .4 : 3.5); ctx.stroke(); }
  }
}

/** Fishing rod; `bob` = [x, y] of the bobber in the water, or null when carried. */
function drawRod(ctx, K, hx, hy, hd, bob, t, on) {
  const tipX = hx + hd * K * 7, tipY = hy - K * 7;
  ctx.strokeStyle = '#1c1424'; ctx.lineWidth = K * 1.2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.strokeStyle = '#a8743c'; ctx.lineWidth = K * .6; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tipX, tipY); ctx.stroke();
  if (!bob) return;
  const dip = (t % 140) > 118 ? K * 1.2 : Math.sin(t * .08) * K * .4;      // bobber bobs, then dips when a fish bites
  const bx = bob[0], by = bob[1] + dip;
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo((tipX + bx) / 2, Math.max(tipY, by) + K * 2, bx, by); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(bx, bob[1] + K * .8, K * (1.6 + (t % 40) / 20), K * .6, 0, 0, 7); ctx.stroke();
  R(ctx, bx - K * .8, by - K * .8, K * 1.6, K * 1.6, '#ff3b3b'); R(ctx, bx - K * .8, by - K * .8, K * 1.6, K * .6, '#ffffff');
}

/** Goods carried above the head on the way home. */
export function drawCarry(ctx, item, x, y, K, frame, id) {
  const b = Math.sin((frame + id * 9) * .3) * K * .4, Y = y + b;
  if (item === 'log') {
    R(ctx, x - K * 4.4, Y - K * 2.4, K * 8.8, K * 2.8, '#1c1424'); R(ctx, x - K * 4, Y - K * 2, K * 8, K * 2, '#9a6436');
    R(ctx, x - K * 4, Y - K * 2, K * 8, K * .6, '#c08a50'); R(ctx, x + K * 3, Y - K * 2, K * 1, K * 2, '#e8c890');
  } else if (item === 'rock') {
    R(ctx, x - K * 2.4, Y - K * 3, K * 4.8, K * 3.4, '#1c1424'); R(ctx, x - K * 2, Y - K * 2.6, K * 4, K * 2.6, '#9aa0aa'); R(ctx, x - K * 2, Y - K * 2.6, K * 2, K * 1, '#c8ced6');
  } else if (item === 'meat') {
    R(ctx, x - K * 2.8, Y - K * 2.8, K * 5, K * 3.2, '#1c1424'); R(ctx, x - K * 2.4, Y - K * 2.4, K * 4.2, K * 2.4, '#c8424a'); R(ctx, x - K * 2, Y - K * 2.2, K * 1.6, K * .8, '#ff8a8a');
    R(ctx, x + K * 1.8, Y - K * 1.6, K * 2.2, K * .8, '#f4ecd8'); R(ctx, x + K * 3.4, Y - K * 2.2, K * .9, K * 2, '#f4ecd8');
  } else if (item === 'fish') {
    R(ctx, x - K * 3.4, Y - K * 2.2, K * 6, K * 2.6, '#1c1424'); R(ctx, x - K * 3, Y - K * 1.8, K * 4.6, K * 1.8, '#8ec8f0'); R(ctx, x - K * 3, Y - K * 1.8, K * 4.6, K * .6, '#e4f4ff');
    R(ctx, x + K * 1.6, Y - K * 2.2, K * 1.4, K * 2.6, '#5a9ad0'); R(ctx, x - K * 2.4, Y - K * 1.4, K * .6, K * .6, '#1c1424');
  } else if (item === 'wheat') {
    R(ctx, x - K * 2.4, Y - K * 4.4, K * 4.8, K * 4.8, '#1c1424');
    for (let n = 0; n < 4; n++) R(ctx, x - K * 2 + n * K * 1.1, Y - K * 4, K * .8, K * 4, n % 2 ? '#f0c848' : '#ffe27a');
    R(ctx, x - K * 2, Y - K * 1.6, K * 4.2, K * .7, '#a0702c');
  } else if (item === 'berries') {
    ctx.save(); ctx.translate(x, Y - K * 2.4); shapeBasket(ctx, K); ctx.restore();
  }
}
