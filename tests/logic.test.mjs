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

console.log(`\n${n} tests passed`);
