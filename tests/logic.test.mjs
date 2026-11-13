import assert from 'node:assert/strict';
import { generateCity, territoryAt, gangHQ, blockedAt, randomPointInTerritory, mulberry32, groundHeight } from '../src/logic/city.js';
import { CLIPS, sampleClip, GUARD, locomotionPose, wrapAngle, JOINTS, idlePose, idleGestures, IDLE_CYCLE } from '../src/logic/anim.js';
import { MOVES, inHitSector, computeDamage } from '../src/logic/combat.js';
import { createPlayer, updatePlayer, damagePlayer, isInvulnerable } from '../src/logic/player.js';
import { createEnemy, updateEnemy, damageEnemy } from '../src/logic/enemy.js';
import { buildGrid, moveCircle, groundCorrection } from '../src/logic/physics.js';
import { createProgress, registerKill } from '../src/logic/progress.js';
import { cameraRelative, thirdPersonRig, nextCameraMode, followYaw } from '../src/logic/camera.js';
import * as intro from '../src/logic/intro.js';
import { BOSSES, createBossState, updateBoss, forceSkill } from '../src/logic/boss.js';
import { createField, addProjectile, addZone, addMeteor, updateField, clearOwner } from '../src/logic/hazards.js';
import { applyDot, applyPoison, tickPoison } from '../src/logic/player.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };
const idle = { mx: 0, mz: 0 };
const stepN = (p, input, secs, dt = 1 / 60) => {
  const evs = [];
  for (let t = 0; t < secs; t += dt) {
    const r = updatePlayer(p, input, dt); p.x += r.dx; p.z += r.dz; evs.push(...r.events);
    input = { ...input, attack: false, dodge: false, skill1: false, skill2: false, skill3: false };
  }
  return evs;
};

test('three gang territories, neutral center and HQs', () => {
  assert.equal(territoryAt(0, 0), -1);
  for (let g = 0; g < 3; g++) { const h = gangHQ(g); assert.equal(territoryAt(h.x, h.z), g); }
  assert.equal(territoryAt(0, -100), 0);
});
test('generated city buildings / HQ clearances / safe gang spawn points', () => {
  const c = generateCity(1337); assert.ok(c.buildings.length > 60);
  for (const h of c.hqs) assert.equal(blockedAt(c.buildings, h.x, h.z, 1), false);
  const rnd = mulberry32(3);
  for (let g = 0; g < 3; g++) { const p = randomPointInTerritory(rnd, c.buildings, g); assert.equal(territoryAt(p.x, p.z), g); }
});
test('all animation clips start/end at guard', () => {
  for (const name of ['jab','cross','uppercut','dodge','slam','spin','rush','hit','swing','smash']) {
    const a=sampleClip(CLIPS[name],0), b=sampleClip(CLIPS[name],1);
    for (const j of JOINTS) for(let i=0;i<3;i++) {
      assert.ok(Math.abs(wrapAngle(a[j][i]-GUARD[j][i]))<1e-6,`${name} start ${j}`);
      assert.ok(Math.abs(wrapAngle(b[j][i]-GUARD[j][i]))<1e-6,`${name} end ${j}`);
    }
  }
  assert.ok(Math.abs(Math.abs(sampleClip(CLIPS.dodge,.45).root[0])-Math.PI)<.05);
});
test('locomotion cycle repeats',()=>{
  const a=locomotionPose(.3,1), b=locomotionPose(.3+Math.PI*2,1);
  for(const j of JOINTS) for(let i=0;i<3;i++) assert.ok(Math.abs(a[j][i]-b[j][i])<1e-9);
});
test('idle repeats scratch and yawn with relaxed intervals',()=>{
  const scratch=idleGestures(3.45), yawn=idleGestures(7.4), rest=idleGestures(10);
  assert.ok(scratch.scratch>.99 && scratch.yawn===0); assert.ok(yawn.yawn>.99 && yawn.scratch===0);
  assert.equal(rest.scratch,0); assert.equal(rest.yawn,0);
  const a=idlePose(3.45), b=idlePose(3.45+IDLE_CYCLE);
  assert.ok(Math.abs(a.rSh[0]-GUARD.rSh[0])>.2); assert.ok(Math.abs(a.rSh[0]-b.rSh[0])<1e-9);
  const y=idlePose(7.4); assert.ok(Math.abs(y.lSh[2]-GUARD.lSh[2])>.4); assert.ok(Math.abs(y.head[0]-GUARD.head[0])>.1);
  assert.ok(Math.abs(idlePose(10).rSh[0]-GUARD.rSh[0])<1e-9);
});
test('ground height road, curb and plaza surfaces',()=>{
  assert.equal(groundHeight(0,12),.26);
  assert.equal(groundHeight(-150+37.5,100),0);
  assert.equal(groundHeight(-150+37.5*1.5,-150+37.5*.5),.22);
});
test('ground correction only lifts soles that penetrate a surface',()=>{
  assert.ok(Math.abs(groundCorrection(.22,.18)-.038)<1e-9); assert.equal(groundCorrection(.22,.24),0);
  assert.ok(Math.abs(groundCorrection(0,-.1)-.098)<1e-9);
});
test('hit sector respects distance, facing and full circle',()=>{
  assert.ok(inHitSector(0,0,0,0,2,2.4,110)); assert.ok(!inHitSector(0,0,0,0,-2,2.4,110));
  assert.ok(inHitSector(0,0,0,0,-2,2.4,360)); assert.ok(!inHitSector(0,0,0,0,5,2.4,360));
  assert.equal(computeDamage(10,1,0),10);
});
test('attack combo jab cross uppercut with hits',()=>{
  const p=createPlayer(), evs=[]; for(let k=0;k<3;k++) evs.push(...stepN(p,{...idle,attack:true},.7));
  assert.deepEqual(evs.filter(e=>e.type==='start').map(e=>e.move),['attack1','attack2','attack3']);
  assert.equal(evs.filter(e=>e.type==='hit').length,3);
});
test('dodge moves forward and grants i-frames',()=>{
  const p=createPlayer(); p.facing=0; updatePlayer(p,{mx:0,mz:1,dodge:true},1/60); stepN(p,idle,.1);
  assert.ok(isInvulnerable(p)); assert.equal(damagePlayer(p,50,0,-1),false); stepN(p,idle,.6);
  assert.ok(p.z>4); assert.ok(!p.action);
});
test('skill cooldown and hit schedule',()=>{
  const p=createPlayer(), evs=stepN(p,{...idle,skill2:true},1.4);
  assert.equal(evs.filter(e=>e.type==='hit').length,MOVES.skill2.hits.length); assert.ok(p.cd.skill2>0);
  assert.equal(stepN(p,{...idle,skill2:true},.1).filter(e=>e.type==='start').length,0);
});
test('enemy AI chases and strikes with attack slot accounting',()=>{
  const e=createEnemy('thug',0,0,0); e.cool=0; const slots={used:0,max:2}; let strikes=0;
  const ctx={px:6,pz:0,playerDead:false,attackSlots:slots,rnd:()=>.5};
  for(let t=0;t<5;t+=1/60){const r=updateEnemy(e,1/60,ctx);e.x+=r.dx;e.z+=r.dz;strikes+=r.events.filter(x=>x.type==='strike').length;}
  assert.ok(strikes>=1); assert.ok(slots.used<=2&&slots.used>=0);
});
test('enemy kill frees attack slot',()=>{
  const e=createEnemy('thug',1,0,0), slots={used:1,max:2};e.state='attack';
  assert.ok(damageEnemy(e,999,0,1,3,false,{attackSlots:slots}).killed); assert.equal(slots.used,0);
});
test('circle collision blocks buildings and map edges',()=>{
  const w=buildGrid([{x:0,z:0,w:4,d:4}]);
  assert.ok(moveCircle(w,-4,0,3,0,.5).x<=-2.5+1e-9); assert.ok(moveCircle(w,148,0,10,0,.5).x<150);
});
test('boss summons and three liberated gangs wins',()=>{
  const p=createProgress(2); assert.deepEqual(registerKill(p,0,false),[]); assert.deepEqual(registerKill(p,0,false),['bossSummon']);
  registerKill(p,0,true);registerKill(p,1,true);assert.ok(registerKill(p,2,true).includes('victory'));
});
test('camera relative controls, cycling and one-way follow guard',()=>{
  let a=cameraRelative(.5,-.7,Math.PI); assert.ok(Math.abs(a.x-.5)<1e-9&&Math.abs(a.z+.7)<1e-9);
  a=cameraRelative(0,-1,0);assert.ok(Math.abs(a.z-1)<1e-9);a=cameraRelative(1,0,0);assert.ok(Math.abs(a.x+1)<1e-9);
  assert.equal(nextCameraMode('topdown'),'third');assert.equal(nextCameraMode('third'),'topdown');
  assert.equal(followYaw(0,1,.1,true,1),0);
  let yaw=0;for(let t=0;t<5;t+=1/60)yaw=followYaw(yaw,Math.PI,1/60,true,0);assert.ok(Math.abs(yaw)<1e-9);
  assert.ok(followYaw(0,.5,.1,true,0)>.05);
});
test('third person camera boom avoids walls',()=>{
  assert.ok(Math.abs(thirdPersonRig(0,0,0).eye.z+6.2)<1e-9);
  const hit=thirdPersonRig(0,0,0,{},(x,z)=>z< -2.5);assert.ok(hit.dist<3&&hit.eye.z> -2.5);
});
test('intro: taxi arrives, stops at the curb, then drives off north without clipping the hero', () => {
  assert.ok(intro.taxiAt(0).z > 55);
  const stop = intro.taxiAt(intro.TL.arriveDur);
  assert.ok(Math.abs(stop.z - intro.TAXI.stopZ) < 1e-6 && stop.speed < 1e-6);
  let prev = 1e9;
  for (let t = 0; t < intro.TL.leaveStart; t += 1 / 30) { const z = intro.taxiAt(t).z; assert.ok(z <= prev + 1e-9); prev = z; }
  assert.equal(intro.taxiAt(intro.TL.doorOpen[1] + 0.2).door > 0.99, true);
  assert.equal(intro.taxiAt(intro.TL.doorClose[1] + 0.1).door < 0.01, true);
  for (let t = intro.TL.leaveStart; t < intro.TOTAL; t += 1 / 30) {
    const tx = intro.taxiAt(t);
    if (Math.abs(tx.z - intro.STAGE.z) < 2.5) assert.ok(tx.x + 0.95 < intro.STAGE.x - 0.5, 'taxi clears hero at t=' + t);
  }
});
test('intro: hero is hidden in the taxi, walks out, ends on the stage facing north', () => {
  assert.equal(intro.heroAt(1).visible, false);
  const mid = intro.heroAt(intro.TL.walkStart + 1);
  assert.ok(mid.visible && mid.speed > 1.5);
  const end = intro.heroAt(intro.CALL_END);
  assert.ok(Math.hypot(end.x - intro.STAGE.x, end.z - intro.STAGE.z) < 1e-6 && end.speed === 0);
  assert.ok(Math.abs(Math.abs(intro.angleDelta(end.facing, Math.PI))) < 1e-3);
  assert.ok(intro.WALK_END < intro.TL.cut2, 'hero has arrived before the close-up');
  for (let t = intro.TL.walkStart; t < intro.WALK_END; t += 1 / 30) {
    const h = intro.heroAt(t), tx = intro.taxiAt(t);
    assert.ok(h.x > tx.x + 0.95 + 0.3 || h.z < tx.z - 2.2 || h.z > tx.z + 2.2 || t < intro.TL.doorOpen[1], 'hero outside the taxi body');
  }
});
test('intro: dialogue is ordered, typed at a steady speed and ends before the mission card', () => {
  const { lines, end } = intro.SCHEDULE;
  assert.equal(lines.length, intro.LINES.length);
  for (let i = 0; i < lines.length; i++) {
    assert.ok(lines[i].tTyped > lines[i].t0 && lines[i].t1 > lines[i].tTyped);
    if (i) assert.ok(lines[i].t0 >= lines[i - 1].t1);
  }
  assert.ok(lines[0].t0 >= intro.TL.answerAt, 'nobody talks before the call is answered');
  assert.ok(intro.CARD_START > end && intro.TOTAL > intro.CARD_START);
  assert.equal(intro.subtitleAt(lines[0].t0 - 0.01), null);
  const half = intro.subtitleAt(lines[0].t0 + 0.5);
  assert.ok(half.chars > 0 && half.chars < lines[0].text.length);
  assert.equal(intro.subtitleAt(lines[0].tTyped + 0.1).chars, lines[0].text.length);
  assert.ok(intro.LINES.some((l) => /wipe out every thug/i.test(l.text)), 'the mission line is spoken');
});
test('intro: phone rings before it is answered, pose returns to guard, rings fire once each', () => {
  assert.equal(intro.phoneAt(intro.TL.pullStart - 0.1).visible, false);
  assert.equal(intro.phoneAt(intro.TL.ringFirst + 0.2).ringing, true);
  assert.equal(intro.phoneAt(intro.TL.answerAt + 0.1).ringing, false);
  const ear = intro.phoneAt(intro.TL.talkStart + 1);
  assert.ok(ear.u >= 0.4 && ear.u <= 0.85 && ear.atEar);
  assert.equal(intro.phoneAt(intro.CALL_END + intro.TL.lower + 0.01).visible, false);
  assert.ok(Math.abs(intro.phoneAt(intro.CALL_END + intro.TL.lower).u - 1) < 1e-6);
  let total = 0; for (let t = 0; t < intro.TOTAL; t += 1 / 60) total += intro.ringStartsBetween(t, t + 1 / 60).length;
  assert.equal(total, 2);
  assert.ok(CLIPS.phone && Math.abs(sampleClip(CLIPS.phone, 0.2).rEl[0] - -1.75) < 1e-6);
});
test('intro: camera is finite every frame, fades from/to black and lands on the gameplay view', () => {
  for (let t = 0; t <= intro.TOTAL; t += 1 / 30) {
    const c = intro.cameraAt(t, { h: 13 });
    for (const v of [...c.pos, ...c.look, c.fov]) assert.ok(Number.isFinite(v), 'finite camera at t=' + t);
    assert.ok(c.pos[1] > 0.5, 'camera above ground at t=' + t);
  }
  assert.ok(intro.fadeAt(0) > 0.99 && intro.fadeAt(2) < 0.01 && intro.fadeAt(intro.TOTAL) > 0.99);
  const last = intro.cameraAt(intro.TOTAL, { h: 13 });
  assert.ok(Math.abs(last.pos[1] - 13) < 0.2 && Math.abs(last.look[2] - intro.STAGE.z) < 0.2);
  assert.ok(intro.TOTAL < 40, 'cutscene stays short');
});

// ---------------------------------------------------------------- bosses
/** Simulate a boss against a stationary player for `secs`; returns every event with its time. */
function simBoss(gang, secs, { px = 8, pz = 0, hpFrac = 1, dt = 1 / 60, rnd = mulberry32(5) } = {}) {
  const e = createEnemy('boss', gang, 0, 0, 1);
  e.hp = Math.round(e.maxHp * hpFrac); e.facing = 0;
  const out = []; let t = 0;
  const ctx = { px, pz, playerDead: false, rnd, minions: 0 };
  for (; t < secs; t += dt) {
    const r = updateEnemy(e, dt, ctx);
    e.x += r.dx; e.z += r.dz;
    for (const ev of r.events) out.push({ t, ...ev });
  }
  return { e, events: out };
}
test('bosses are three distinct kits with their own hp, speed and skills', () => {
  assert.equal(BOSSES.length, 3);
  const ids = BOSSES.map((b) => Object.keys(b.skills).sort().join());
  assert.equal(new Set(ids).size, 3, 'no two bosses share a skill list');
  assert.equal(new Set(BOSSES.map((b) => b.hp)).size, 3);
  for (const b of BOSSES) {
    for (const id of [...b.cycle, ...b.cycle2]) assert.ok(b.skills[id], b.id + ' cycle names a real skill: ' + id);
    for (const [id, s] of Object.entries(b.skills)) {
      assert.ok(s.dur > 0 && s.recover > 0 && s.name && s.clip, b.id + '.' + id);
      for (const ev of s.events || []) assert.ok(ev.t >= 0 && ev.t <= s.dur, b.id + '.' + id + ' event inside the cast');
      for (const tl of s.tele || []) assert.ok(tl.t1 > tl.t0 && tl.t1 <= s.dur);
      const tele = (s.tele || []).map((x) => x.t1), strikes = (s.events || []).filter((x) => x.type === 'strike' || x.type === 'projectile').map((x) => x.t);
      if (tele.length && strikes.length) assert.ok(Math.max(...tele) <= Math.max(...strikes) + 0.05, b.id + '.' + id + ' warns before it hits');
    }
  }
  assert.equal(createEnemy('boss', 1, 0, 0, 1).maxHp, BOSSES[1].hp);
  assert.equal(createEnemy('boss', 2, 0, 0, 2).maxHp, BOSSES[2].hp * 2);
});
test('boss cast cycles: each boss walks its own scripted order', () => {
  const casts = (g, secs, o) => simBoss(g, secs, o).events.filter((x) => x.type === 'cast').map((x) => x.id);
  // wolf: close player (claws), then pounce, claws, howl
  const w = casts(0, 30, { px: 3, pz: 0 }); assert.ok(w.includes('claws') && w.includes('pounce') && w.includes('howl'), 'wolf: ' + w);
  const d = casts(1, 40, { px: 9, pz: 0 }); assert.ok(d.includes('breath') && d.includes('meteor'), 'dragon: ' + d);
  assert.ok(d.indexOf('breath') < d.indexOf('meteor'), 'dragon opens with breath');
  const c = casts(2, 40, { px: 8, pz: 0 }); assert.ok(c.includes('spit') && c.includes('coil') && c.includes('pool'), 'cobra: ' + c);
  assert.equal(c[0], 'spit', 'cobra opens with venom spit');
  assert.notDeepEqual(w, d); assert.notDeepEqual(d, c);
});
test('range gating: gap closer when far, punish skill when hugged', () => {
  const far = simBoss(0, 6, { px: 25, pz: 0 }).events.filter((x) => x.type === 'cast').map((x) => x.id);
  assert.equal(far[0], 'pounce', 'wolf pounces to close a big gap');
  const near = simBoss(1, 6, { px: 3, pz: 0 }).events.filter((x) => x.type === 'cast').map((x) => x.id);
  assert.equal(near[0], 'tail', 'dragon punishes a player standing in its face with Tail Sweep');
  const cobraFar = simBoss(2, 6, { px: 22, pz: 0 }).events.filter((x) => x.type === 'cast').map((x) => x.id);
  assert.equal(cobraFar[0], 'coil', 'cobra lunges at a distant player');
});
test('skills telegraph first, then strike on schedule, with the right shapes', () => {
  // cobra coil: a line telegraph appears before the line strike + poison
  const r = simBoss(2, 8, { px: 8, pz: 0 }).events, coil = r.find((x) => x.type === 'cast' && x.id === 'coil');
  if (coil) { /* the first cast is spit; force coil instead */ }
  const e = createEnemy('boss', 2, 0, 0, 1); forceSkill(e, 'coil'); e.state = 'chase'; e.boss.mode = 'approach'; e.boss.t = 1;
  const evs = []; const ctx = { px: 9, pz: 0, playerDead: false, rnd: mulberry32(1), minions: 0 };
  for (let t = 0; t < 2.4; t += 1 / 60) { const o = updateEnemy(e, 1 / 60, ctx); e.x += o.dx; e.z += o.dz; for (const ev of o.events) evs.push({ t, ...ev }); }
  const tele = evs.find((x) => x.type === 'telegraph'), strike = evs.find((x) => x.type === 'strike');
  assert.ok(tele && strike && tele.t < strike.t, 'telegraph precedes the strike');
  assert.equal(tele.shape, 'line'); assert.equal(strike.shape, 'line'); assert.ok(strike.poison && strike.len >= 6 && strike.len <= 15);
  assert.ok(e.x > 5, 'the lunge actually moved the boss forward along the locked aim');
  assert.ok(strike.t - tele.t > 0.9, 'at least 0.9 s to react');
  // dragon breath: many sweeping dot ticks whose facing changes
  const d = createEnemy('boss', 1, 0, 0, 1); forceSkill(d, 'breath'); d.state = 'chase'; d.boss.mode = 'approach'; d.boss.t = 1;
  const ticks = []; const dc = { px: 9, pz: 0, playerDead: false, rnd: mulberry32(1), minions: 0 };
  for (let t = 0; t < 3.2; t += 1 / 60) { const o = updateEnemy(d, 1 / 60, dc); d.x += o.dx; d.z += o.dz; for (const ev of o.events) if (ev.type === 'strike') ticks.push(ev); }
  assert.ok(ticks.length >= 11 && ticks.every((x) => x.dot && x.shape === 'cone'));
  assert.ok(Math.abs(ticks[ticks.length - 1].facing - ticks[0].facing) > 1.2, 'the flame cone sweeps');
});
test('wolf howl: shockwave + summons capped by max; meteors target the player; zones form a trail', () => {
  const w = createEnemy('boss', 0, 0, 0, 1); forceSkill(w, 'howl'); w.state = 'chase'; w.boss.mode = 'approach'; w.boss.t = 1;
  const ev = []; for (let t = 0; t < 2.6; t += 1 / 60) { const o = updateEnemy(w, 1 / 60, { px: 4, pz: 0, playerDead: false, rnd: mulberry32(1), minions: 0 }); for (const x of o.events) ev.push(x); }
  assert.ok(ev.find((x) => x.type === 'strike' && x.shape === 'circle' && x.r === 9));
  const sm = ev.find((x) => x.type === 'summon'); assert.ok(sm && sm.n === 2 && sm.max === 4);
  const m = simBoss(1, 20, { px: 12, pz: 5 }).events.filter((x) => x.type === 'meteor');
  assert.ok(m.length >= 5 && m.every((x) => Math.hypot(x.x - 12, x.z - 5) < 0.01), 'phase 1 meteors fall exactly on the player');
  const z = simBoss(2, 40, { px: 12, pz: 0 }).events.filter((x) => x.type === 'zone');
  assert.ok(z.length >= 3 && z.every((x) => x.kind === 'poison' && x.arm > 0.5), 'pools arm before they hurt');
});
test('phase 2: enrage cast at 50% hp, phase event, faster recovery and bigger skills', () => {
  for (let g = 0; g < 3; g++) {
    const calm = simBoss(g, 30, { px: 7, pz: 0 }), hurt = simBoss(g, 30, { px: 7, pz: 0, hpFrac: 0.4 });
    assert.ok(!calm.events.some((x) => x.type === 'phase'));
    const ph = hurt.events.filter((x) => x.type === 'phase'); assert.equal(ph.length, 1, 'phase event fires once');
    assert.ok(hurt.events.some((x) => x.type === 'cast' && x.id === 'enrage'));
    assert.equal(hurt.e.boss.phase, 2);
    assert.ok(hurt.events.filter((x) => x.type === 'cast').length > calm.events.filter((x) => x.type === 'cast').length, 'phase 2 casts more often');
  }
  const m1 = simBoss(1, 40, { px: 12, pz: 0 }).events.filter((x) => x.type === 'meteor').length;
  const m2 = simBoss(1, 40, { px: 12, pz: 0, hpFrac: 0.3 }).events.filter((x) => x.type === 'meteor').length;
  assert.ok(m2 > m1, 'more meteors in phase 2');
});
test('armor and flinch: a launcher cancels a cast, ordinary hits do not; boss never takes attack slots', () => {
  const e = createEnemy('boss', 0, 0, 0, 1); const slots = { used: 0, max: 2 };
  forceSkill(e, 'claws'); e.state = 'chase'; e.boss.mode = 'approach'; e.boss.t = 1;
  for (let i = 0; i < 30; i++) updateEnemy(e, 1 / 60, { px: 2, pz: 0, playerDead: false, rnd: mulberry32(1), minions: 0, attackSlots: slots });
  assert.equal(e.state, 'attack'); assert.equal(slots.used, 0);
  damageEnemy(e, 5, 2, 0, 3, false, { attackSlots: slots }); assert.equal(e.state, 'attack', 'super armor while casting');
  damageEnemy(e, 5, 2, 0, 3, true, { attackSlots: slots }); assert.equal(e.state, 'stagger');
  updateEnemy(e, 1 / 60, { px: 2, pz: 0, playerDead: false, rnd: mulberry32(1), minions: 0, attackSlots: slots });
  assert.equal(e.boss.mode, 'recover'); assert.equal(e.cast, null); assert.equal(slots.used, 0);
});
test('hazards: projectiles hit and expire, meteors land after the delay, zones arm then tick', () => {
  const f = createField(), pl = { x: 10, z: 0, radius: 0.55, dead: false };
  addProjectile(f, { owner: 2, kind: 'venom', x: 0, z: 0, vx: 13, vz: 0, r: 0.6, dmg: 9, life: 2, poison: true });
  let evs = []; for (let t = 0; t < 1; t += 1 / 60) evs.push(...updateField(f, 1 / 60, pl));
  const hit = evs.find((x) => x.type === 'projectileHit'); assert.ok(hit && hit.poison && hit.dmg === 9); assert.equal(f.projectiles.length, 0);
  addProjectile(f, { owner: 2, kind: 'venom', x: 0, z: 5, vx: 13, vz: 0, r: 0.6, dmg: 9, life: 0.2 });
  evs = []; for (let t = 0; t < 0.5; t += 1 / 60) evs.push(...updateField(f, 1 / 60, pl)); assert.ok(evs.some((x) => x.type === 'projectileEnd'));
  addMeteor(f, { owner: 1, x: 10, z: 0, delay: 1.1, r: 2.7, dmg: 24, burn: { dur: 3, dps: 8, r: 2.4 } });
  evs = []; for (let t = 0; t < 1.0; t += 1 / 60) evs.push(...updateField(f, 1 / 60, pl)); assert.ok(!evs.some((x) => x.type === 'meteorLand'), 'not yet');
  for (let t = 0; t < 0.2; t += 1 / 60) evs.push(...updateField(f, 1 / 60, pl));
  const land = evs.find((x) => x.type === 'meteorLand'); assert.ok(land && land.hit); assert.equal(f.zones.length, 1, 'a burning zone is left behind');
  clearOwner(f, 1); assert.equal(f.zones.length, 0);
  addZone(f, { owner: 2, kind: 'poison', x: 10, z: 0, r: 2.9, arm: 0.9, dur: 2, dps: 9, poison: true });
  evs = []; for (let t = 0; t < 0.85; t += 1 / 60) evs.push(...updateField(f, 1 / 60, pl)); assert.ok(!evs.some((x) => x.type === 'zoneTick'), 'harmless while arming');
  for (let t = 0; t < 1.6; t += 1 / 60) evs.push(...updateField(f, 1 / 60, pl));
  const ticks = evs.filter((x) => x.type === 'zoneTick'); assert.ok(ticks.length >= 2 && ticks[0].dmg === 4.5);
  for (let t = 0; t < 2; t += 1 / 60) evs.push(...updateField(f, 1 / 60, pl)); assert.ok(evs.some((x) => x.type === 'zoneEnd'));
});
test('poison and damage over time: ticks, refreshes, ignores i-frames and never flinches', () => {
  const p = createPlayer({ maxHp: 100 }); applyPoison(p, 4, 6);
  let dealt = 0; for (let t = 0; t < 2; t += 1 / 60) dealt += tickPoison(p, 1 / 60);
  assert.ok(Math.abs(dealt - 12) < 3.1 && p.stun === 0); applyPoison(p, 4, 5); assert.ok(p.poison.t > 3.5 && p.poison.dps === 6);
  for (let t = 0; t < 5; t += 1 / 60) tickPoison(p, 1 / 60); assert.equal(p.poison, null);
  const q = createPlayer({ maxHp: 100 }); q.invuln = 1; assert.equal(applyDot(q, 10), 0);
  const r = createPlayer({ maxHp: 10 }); applyDot(r, 50); assert.ok(r.dead && r.hp === 0);
});

console.log(`\n${n} tests passed`);
