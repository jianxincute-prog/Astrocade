/* ===================== YOUKAI VALLEY: AIKO (Cursed Schoolgirl) / TEKE-TEKE and OBAA KIYO (Cane Granny) / TURBO GRANNY ===================== */
/* ---------- base: Aiko in a navy sailor uniform, red neckerchief, pleated skirt, long black hair ---------- */
function aikoBase(X){const {chest,spine,hips,head,M,armL,armR,legL,legR,cloth,root,jp}=X;root.scale.setScalar(0.93);
// sailor blouse body + navy collar flap at the back and a V at the front
const bl=at(shell(0.52,0.38,0.66,M.shirt,0.2),0,0.28,0);bl.scale.z=0.66;chest.add(bl);const bl2=at(shell(0.37,0.35,0.5,M.shirt,0.2),0,0.2,0);bl2.scale.z=0.74;spine.add(bl2);
const flap=at(box(0.62,0.42,0.03,M.collar),0,0.5,-0.25);flap.rotation.x=0.18;chest.add(flap);flap.add(at(box(0.6,0.025,0.035,M.trim),0,-0.16,0));flap.add(at(box(0.6,0.025,0.035,M.trim),0,-0.12,0));
[-1,1].forEach(s=>{const v=at(box(0.07,0.4,0.03,M.collar),s*0.11,0.46,0.25);v.rotation.z=s*0.5;v.rotation.x=-0.25;chest.add(v);const vs=at(box(0.02,0.38,0.035,M.trim),s*0.13,0.46,0.27);vs.rotation.z=s*0.5;vs.rotation.x=-0.25;chest.add(vs);});
const kn=at(ball(0.07,M.scarf,1.2,0.8,0.7),0,0.34,0.3);chest.add(kn);[-1,1].forEach(s=>{const t=at(cone(0.07,0.26,M.scarf,6),s*0.05,0.2,0.3);t.rotation.z=s*0.25;t.rotation.x=Math.PI;chest.add(t);});
for(const a of [armL,armR]){const cf=torus(0.1,0.025,M.collar);cf.rotation.x=Math.PI/2;cf.position.y=-0.5;a.el.add(cf);const cs=torus(0.104,0.008,M.trim);cs.rotation.x=Math.PI/2;cs.position.y=-0.47;a.el.add(cs);}
// pleated skirt
const sk=grp(0,0.02,0);hips.add(sk);const skc=at(cyl(0.36,0.56,0.66,M.skirt,28),0,-0.28,0);skc.scale.z=0.82;sk.add(skc);for(let i=0;i<16;i++){const a=i/16*Math.PI*2,p=at(box(0.11,0.64,0.02,M.skirt),Math.sin(a)*0.47,-0.3,Math.cos(a)*0.39);p.rotation.y=a;p.rotation.x=Math.cos(a)*0.22;p.rotation.z=-Math.sin(a)*0.22;sk.add(p);}
const skb=torus(0.36,0.03,M.skirt);skb.rotation.x=Math.PI/2;skb.scale.y=0.82;sk.add(at(skb,0,0.04,0));jp.skirt=sk;
// knee socks over dark tights + loafers
for(const l of [legL,legR]){const so=at(cyl(0.165,0.13,0.62,M.sock,18),0,-0.4,0);l.kn.add(so);const sr=torus(0.165,0.02,M.sock);sr.rotation.x=Math.PI/2;sr.position.y=-0.09;l.kn.add(sr);}
// long straight black hair with bangs
const hair=grp(0,0.12,0);head.add(hair);hair.add(hairCap(M.hair,Math.PI*0.6,-0.3,0.065,1.05,1.06));
const back=at(box(0.56,1.25,0.07,M.hair),0,-0.5,-0.25);back.rotation.x=0.08;hair.add(back);const bk2=at(box(0.42,0.3,0.06,M.hair),0,-1.2,-0.29);hair.add(bk2);
const bang=at(box(0.5,0.12,0.06,M.hair),0,0.08,0.27);bang.rotation.x=-0.25;hair.add(bang);for(let i=0;i<5;i++){const st=at(box(0.09,0.16,0.04,M.hair),(i-2)*0.1,0.0,0.285);st.rotation.x=-0.15;hair.add(st);}
[-1,1].forEach(s=>{const sl=at(box(0.08,0.7,0.1,M.hair),s*0.27,-0.24,0.05);sl.rotation.z=s*0.05;hair.add(sl);});
const pin=at(box(0.1,0.025,0.02,M.scarf),0.17,0.15,0.25);pin.rotation.z=0.4;hair.add(pin);
// school bag strap across the chest
const strap=at(box(0.06,1.0,0.03,M.bag),0,0.32,0.27);strap.rotation.z=0.85;chest.add(strap);const bag=at(box(0.42,0.3,0.12,M.bag),0.42,-0.05,-0.18);bag.rotation.y=-0.4;hips.add(bag);jp.bag=bag;}

/* ---------- ult form: TEKE-TEKE (upper body only, crawls on her elbows, carries a sickle) ---------- */
function aikoForm(X){const {add,root,chest,hips,spine,head,armL,armR,legL,legR,points,eyeGlows,hideOnCurse,M,rings,jp}=X;
[legL.hip,legR.hip].forEach(l=>l.traverse(m=>{if(m.isMesh)hideOnCurse.push(m);}));hips.children.forEach(m=>{if(m.isMesh)hideOnCurse.push(m);});if(jp.skirt)jp.skirt.traverse(m=>{if(m.isMesh)hideOnCurse.push(m);});if(jp.bag)hideOnCurse.push(jp.bag);
const blood=stdMat(0x5a0008,0.35,0.1,{emissive:0x2a0004,emissiveIntensity:0.6}),flesh=stdMat(0x8a1020,0.3,0.1,{emissive:0x3a0008,emissiveIntensity:0.5}),rag=stdMat(0xe8e2d6,0.9,0,{side:THREE.DoubleSide}),blade=stdMat(0xd8dce6,0.2,0.9),wood=stdMat(0x3a2414,0.7),hairW=stdMat(0x050405,0.6);
// torn waist: ragged blouse hem, raw edge
const cut=add(spine,at(cyl(0.36,0.33,0.12,flesh,20),0,-0.02,0));cut.scale.z=0.75;for(let i=0;i<14;i++){const a=i/14*Math.PI*2,t=add(spine,cone(0.06,0.2+((i*7)%3)*0.06,i%3?rag:blood,5));t.position.set(Math.sin(a)*0.33,-0.1,Math.cos(a)*0.25);t.rotation.x=Math.PI+Math.cos(a)*0.4;t.rotation.z=Math.sin(a)*0.4;}
for(let i=0;i<5;i++){const d=add(spine,box(0.05,0.32+i*0.08,0.02,blood));d.position.set((i-2)*0.12,-0.28,0.2+((i%2)*0.05));}
// wild hair veil hanging over the face
const veil=add(head,grp(0,0.2,0));for(let i=0;i<9;i++){const s=box(0.06,0.75+((i*5)%3)*0.18,0.03,hairW);s.position.set((i-4)*0.065,-0.35,0.3+Math.abs(i-4)*-0.01);s.rotation.z=(i-4)*0.03;veil.add(s);}
for(let i=0;i<6;i++){const s=add(head,box(0.08,1.1,0.04,hairW));s.position.set((i-2.5)*0.11,-0.45,-0.3);s.rotation.x=0.25;}
// red glowing eyes peeking through the veil + bloody grin
[-1,1].forEach(s=>{const g=add(head,sprite(0xff2040,0.32,0.95));g.position.set(s*0.1,0.13,0.34);eyeGlows.push(g);});const grin=add(head,box(0.16,0.022,0.02,new THREE.MeshBasicMaterial({color:0x2a0004})));grin.position.set(0,-0.12,0.29);
// sickle (kama) in the right hand
const kama=add(armR.hand,grp(0,-0.1,0.05));kama.add(at(cyl(0.025,0.03,0.7,wood,8),0,-0.3,0));const bd=new THREE.Mesh(new THREE.TorusGeometry(0.28,0.03,6,20,Math.PI*0.9),blade);bd.position.set(0.0,-0.65,0.22);bd.rotation.set(Math.PI/2,0,Math.PI*0.55);kama.add(bd);kama.add(at(sprite(0xff3050,0.5,0.4),0,-0.7,0.2));jp.kama=kama;
const g1=add(root,new THREE.Mesh(new THREE.PlaneGeometry(5.4,5.4),addMat(0xff2847,0.75,TEX.ringRed)));g1.rotation.x=-Math.PI/2;g1.position.y=0.06;rings.push(g1);points.push(add(root,orbitPoints(60,0xff3050,0.18,0.5,1.8,2.2)));
return (on,c)=>{if(c&&c.rig)c.rig.root.position.y=0;};}

/* ---------- base: Obaa Kiyo, hunched granny in a muted kimono and haori, grey bun, round glasses, wooden cane ---------- */
function obaaBase(X){const {chest,spine,hips,head,M,armL,armR,legL,legR,cloth,root,jp}=X;root.scale.setScalar(0.9);
const ki=at(shell(0.54,0.4,0.68,M.shirt,0.35),0,0.28,0);ki.scale.z=0.68;chest.add(ki);const ki2=at(shell(0.38,0.36,0.52,M.shirt,0.35),0,0.2,0);ki2.scale.z=0.76;spine.add(ki2);
[-1,1].forEach(s=>{const lap=at(box(0.06,0.7,0.03,M.trim),s*0.1,0.32,0.27);lap.rotation.z=s*0.45;chest.add(lap);});
const obi=at(cyl(0.42,0.42,0.26,M.obi,24),0,0.04,0);obi.scale.z=0.78;spine.add(obi);spine.add(at(box(0.3,0.2,0.12,M.obi),0,0.05,-0.36));const cord=torus(0.425,0.018,M.cord);cord.rotation.x=Math.PI/2;cord.scale.y=0.78;spine.add(at(cord,0,0.04,0));
// haori jacket
const ha=at(shell(0.58,0.46,0.8,M.jacket,0.6),0,0.22,0);ha.scale.z=0.7;chest.add(ha);[-1,1].forEach(s=>{const tie=at(ball(0.03,M.cord),s*0.08,0.36,0.33);chest.add(tie);});
// long kimono skirt to the ankles (legs stay inside)
const sk=at(cyl(0.38,0.5,1.55,M.shirt,24),0,-0.72,0);sk.scale.z=0.8;hips.add(sk);const hem=torus(0.5,0.025,M.trim);hem.rotation.x=Math.PI/2;hem.scale.y=0.8;hips.add(at(hem,0,-1.48,0));jp.skirt=sk;
for(const l of [legL,legR]){l.an.add(at(box(0.3,0.08,0.5,M.geta),0,-0.2,0.08));}
// grey hair bun + kanzashi, round glasses
const hair=grp(0,0.12,0);head.add(hair);hair.add(hairCap(M.hair,Math.PI*0.54,-0.25,0.05,1.03,1.04));hair.add(at(ball(0.15,M.hair,1,0.85,0.9),0,0.12,-0.32));const kz=at(cyl(0.012,0.012,0.36,M.cord,6),0.05,0.16,-0.36);kz.rotation.z=1.2;hair.add(kz);hair.add(at(ball(0.03,M.gold),0.21,0.22,-0.36));
[-1,1].forEach(s=>{const lens=torus(0.06,0.008,M.glass);lens.position.set(s*0.1,0.12,0.285);head.add(lens);});head.add(at(box(0.06,0.008,0.008,M.glass),0,0.12,0.29));jp.glasses=head.children.slice(-3);
[-1,1].forEach(s=>{const w=at(box(0.06,0.006,0.01,M.brow),s*0.17,0.03,0.25);w.rotation.z=s*0.3;head.add(w);});
// wooden cane in the right hand
const cane=grp(0,-0.08,0.04);armR.hand.add(cane);cane.add(at(cyl(0.032,0.036,1.55,M.cane,10),0,-0.72,0.08));const hk=torus(0.09,0.03,M.cane,Math.PI);hk.position.set(0.09,0.05,0.08);cane.add(hk);jp.cane=cane;}

/* ---------- ult form: TURBO GRANNY (wild hair streaming back, grin, glowing eyes, wind aura) ---------- */
function obaaForm(X){const {add,root,chest,hips,spine,head,armL,armR,legL,legR,points,eyeGlows,hideOnCurse,M,rings,ribbons,jp}=X;
if(jp.glasses)jp.glasses.forEach(g=>hideOnCurse.push(g));
const wild=stdMat(0xf2f2ee,0.85),teeth=stdMat(0xfaf6e8,0.4),gum=new THREE.MeshBasicMaterial({color:0x3a0610}),wind=stdMat(0x9af8ff,0.3,0,{emissive:0x2a8aa0,emissiveIntensity:0.7,transparent:true,opacity:0.7,side:THREE.DoubleSide});
for(let i=0;i<14;i++){const a=(i/13-0.5)*2.6,c=add(head,cone(0.07,0.6+((i*7)%3)*0.2,wild,6));c.position.set(Math.sin(a)*0.22,0.2+Math.cos(a)*0.12,-0.2);c.rotation.x=-1.9-((i*3)%3)*0.15;c.rotation.z=Math.sin(a)*0.5;}
const mo=add(head,box(0.2,0.07,0.04,gum));mo.position.set(0,-0.12,0.27);for(let i=0;i<6;i++){const t=add(head,box(0.025,0.03,0.02,teeth));t.position.set((i-2.5)*0.03,-0.1,0.29);}
[-1,1].forEach(s=>{const so=add(head,ball(0.06,gum,1.2,0.8,0.4));so.position.set(s*0.1,0.13,0.27);const g=add(head,sprite(0x7cf6ff,0.34,0.95));g.position.set(s*0.1,0.13,0.33);eyeGlows.push(g);});
// speed ribbons trailing from the arms and the obi
[armL,armR].forEach(a=>{const rb=add(a.el,ribbon(wind,1.4,0.12));rb.position.set(0,-0.3,-0.1);ribbons.push(rb);});const rb2=add(spine,ribbon(wind,1.8,0.18));rb2.position.set(0,0.05,-0.42);ribbons.push(rb2);
if(jp.cane){const glow=add(jp.cane,sprite(0x7cf6ff,0.6,0.7));glow.position.set(0,-1.4,0.08);}
const g1=add(root,new THREE.Mesh(new THREE.PlaneGeometry(6,6),addMat(0x7cf6ff,0.6,TEX.ringGreen)));g1.rotation.x=-Math.PI/2;g1.position.y=0.06;rings.push(g1);points.push(add(root,orbitPoints(90,0x9af8ff,0.18,0.6,2.4,3.6)));
return ()=>{};}

/* ---------- pose hook (called at the end of targetPose) ---------- */
const JP_CRAWL={hy:0.55,hrx:0,sx:1.22,sz:0,cx:0,cy:0,nx:-1.05,ny:0,lsx:-1.55,lsz:0.25,lex:-1.4,rsx:-1.55,rsz:-0.25,rex:-1.4,lhx:0,rhx:0,lkx:0,rkx:0};
function jpPose(c,p,t){if(c.form==='teketeke'&&c.ult>0){const keepHy=c.jpS&&c.jpS.kind==='tkB'&&c.jpS.phase===0;Object.assign(p,JP_CRAWL);const sp=Math.hypot(c.vel.x,c.vel.z),m=Math.min(1,sp/6),w=c.walkT*1.6;p.lsx+=Math.sin(w)*0.55*m;p.rsx-=Math.sin(w)*0.55*m;p.lex+=Math.cos(w)*0.35*m;p.rex-=Math.cos(w)*0.35*m;p.hry=Math.sin(w)*0.12*m;p.hy+=Math.sin(t*3)*0.02;
 if(c.advPose&&c.advPose.jp)Object.assign(p,c.advPose);if(c.atkT>0){const k=1-c.atkT/0.38;p.rsx=-2.4+k*1.6;p.rex=-0.3;p.lsx=-1.3;}
 const s=c.jpS;if(s&&s.kind==='tkA'){if(s.phase===0)Object.assign(p,{hy:0.95,sx:0.6,nx:-0.7,lsx:-2.6,rsx:-2.6,lex:-0.5,rex:-0.5});else if(s.phase===1){p.sx=1.35;p.lsx=-2.5;p.rsx=-2.5;p.lex=-0.2;p.rex=-0.2;}else if(s.phase===2){const k=Math.sin(s.t*20);p.hy=0.9;p.sx=0.7;p.rsx=-2.7+k*1.4;p.rex=-0.3;p.lsx=-1.9;}}
 if(s&&s.kind==='tkB'){if(s.phase===0)Object.assign(p,{hy:1.05,sx:0.25,nx:-0.4,lsx:-2.9,rsx:-2.9,lsz:-0.5,rsz:0.5,lex:-0.2,rex:-0.2});else if(s.phase===2){p.hy=0.9;p.sx=0.7;p.rsx=-2.6+Math.sin(s.t*18)*1.2;}}
 if(c.hp<=0){p.hy=0.4;p.sx=1.5;}
 return;}
if(c.form==='turbo'){if(c.ult<=0){p.sx+=0.32;p.nx-=0.28;p.hy-=0.08;p.rsx=-0.45;p.rex=-0.6;p.rsz=-0.2;return;}
 const sp=Math.hypot(c.vel.x,c.vel.z),m=Math.min(1,sp/7);p.sx+=0.25+0.45*m;p.nx-=0.3*m;p.lsx=mix(p.lsx,0.9,m);p.rsx=mix(p.rsx,0.9,m);p.lex=mix(p.lex,-0.25,m);p.rex=mix(p.rex,-0.25,m);
 if(c.advPose&&c.advPose.jp)Object.assign(p,c.advPose);
 const s=c.jpS;if(s&&s.kind==='tbA'){if(s.phase===0)Object.assign(p,{hy:1.2,sx:0.75,nx:-0.5,lsx:0.6,rsx:0.6,lhx:-1.0,rhx:0.6,lkx:1.4,rkx:1.0});else if(s.phase===1)Object.assign(p,{sx:0.9,nx:-0.6,lsx:1.0,rsx:1.0,lex:-0.2,rex:-0.2,lhx:Math.sin(t*40)*1.1,rhx:-Math.sin(t*40)*1.1,lkx:1.0,rkx:1.0});else if(s.phase===2)Object.assign(p,{hy:1.9,sx:-0.25,nx:-0.3,rsx:-3.0,rex:-0.1,lsx:-0.8,lhx:0.4,rhx:-0.6});}
 if(s&&s.kind==='tbB'){if(s.phase===0)Object.assign(p,{hy:1.15,sx:0.9,nx:-0.7,lsx:0.8,rsx:0.8,lhx:-1.2,rhx:0.7,lkx:1.6,rkx:0.9});else if(s.phase===1)Object.assign(p,{hy:1.4,sx:1.05,nx:-0.8,lsx:1.1,rsx:1.1,lex:-0.1,rex:-0.1,lhx:Math.sin(t*50)*1.2,rhx:-Math.sin(t*50)*1.2,lkx:1.1,rkx:1.1});else Object.assign(p,{hy:1.3,sx:0.4,lsx:-1.2,rsx:-0.4,lhx:-0.9,lkx:1.2});}}}

/* ---------- shared skill helpers ---------- */
function jpDispose(m){if(m){if(m.parent)m.parent.remove(m);disposeObject3D(m);}}
function jpEnd(c){const s=c.jpS;if(!s)return;c.jpS=null;(s.meshes||[]).forEach(jpDispose);if(s.grabbed&&s.foe){s.foe.grabbed=false;s.foe.y=0;s.foe.rig.root.rotation.x=0;}c.y=0;c.rig.root.rotation.x=0;closeLetterbox();}
function jpStart(c,foe,n,kind){if(c.ult<=0||c.stun>0||c.grabbed||c.cocoon>0||c.jpS||foe.hp<=0)return null;if(n===1?c.cd1>0:c.cd2>0)return null;const to=foe.pos.clone().sub(c.pos).setY(0);if(to.length()>24){if(n===1)c.cd1=2;else c.cd2=2;burst(centerPos(c),c.rig.extras.glowColor,10,6,0.9);sfx('whoosh');return null;}
 if(n===1)c.cd1=6;else c.cd2=6;c.atkT=0;c.vel.set(0,0,0);if(to.lengthSq()>0.001)c.facing=Math.atan2(to.x,to.z);c.jpS={kind,phase:0,t:0,foe,meshes:[],k:0,hit:false};setLetterbox(true);return c.jpS;}
function jpSlash(pos,ang,col,tilt,size){const sl=new THREE.Mesh(new THREE.TorusGeometry(size||1.5,0.07,6,24,Math.PI*0.85),addMat(col,0.95));sl.position.copy(pos);sl.rotation.order='YXZ';sl.rotation.set(0,ang,tilt);scene.add(sl);effects.push({type:'ktrail',mesh:sl,life:0.3,max:0.3});}
function jpGhost(c,col,life){const g=sprite(col,3.4,0.45);g.position.set(c.pos.x,c.y+2.2,c.pos.z);g.scale.set(1.7,3.6,1);scene.add(g);effects.push({type:'cone',mesh:g,life:life||0.35,max:life||0.35});}
function jpTrainMesh(len){const g=new THREE.Group(),body=addMat(0x9af0ff,0.32),edge=addMat(0xffffff,0.6),win=addMat(0xfff2b0,0.85);for(let i=0;i<3;i++){const car=new THREE.Mesh(new THREE.BoxGeometry(len/3-0.3,2.6,2.2),body);car.position.set((i-1)*len/3,1.5,0);g.add(car);const tr=new THREE.Mesh(new THREE.BoxGeometry(len/3-0.3,0.08,2.25),edge);tr.position.set((i-1)*len/3,2.82,0);g.add(tr);for(let k=0;k<4;k++){const w=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.6),win);w.position.set((i-1)*len/3+(k-1.5)*1.25,1.9,1.12);g.add(w);const w2=w.clone();w2.position.z=-1.12;g.add(w2);}}const head=sprite(0xffffff,4.5,0.9);head.position.set(len/2+0.4,1.4,0);g.add(head);const glow=sprite(0x9af0ff,9,0.35);glow.position.set(0,1.5,0);g.add(glow);return g;}
function jpLine(a,b,w,col){const dx=b.x-a.x,dz=b.z-a.z,L=Math.hypot(dx,dz)||1;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,L),addMat(col||0xff3040,0.35));m.rotation.order='YXZ';m.rotation.x=-Math.PI/2;m.rotation.y=Math.atan2(dx,dz);m.position.set((a.x+b.x)/2,0.12,(a.z+b.z)/2);scene.add(m);return m;}

/* ---------- AIKO skill 1: ELBOW RUSH — scrape forward at terrifying speed, pin the foe and slash with the sickle (10+10+25 = 45) ---------- */
function tekeRush(c,foe){const s=jpStart(c,foe,1,'tkA');if(!s)return;s.lock=foe.pos.clone();s.line=jpLine(c.pos,s.lock,1.4,0xff3050);s.meshes.push(s.line);sfx('wrap');if(c.isPlayer)showBanner('ELBOW RUSH!','#ff7a95');}
/* ---------- AIKO skill 2: PHANTOM TRAIN — crossing bells ring and a ghost train tears across the ring (35), then she pounces (15) = 50 ---------- */
function tekeTrain(c,foe){const s=jpStart(c,foe,2,'tkB');if(!s)return;const ax=new THREE.Vector3(Math.cos(c.facing),0,-Math.sin(c.facing));s.ax=ax;s.mid=foe.pos.clone();s.a=s.mid.clone().addScaledVector(ax,-26);s.b=s.mid.clone().addScaledVector(ax,26);s.line=jpLine(s.a,s.b,3.2,0xff2a40);s.meshes.push(s.line);
 s.lamps=[];[-1,1].forEach(k=>{const lp=sprite(0xff2030,1.6,0.9);lp.position.copy(s.mid).addScaledVector(new THREE.Vector3(ax.z,0,-ax.x),k*4.2);lp.position.y=3.4;scene.add(lp);s.meshes.push(lp);s.lamps.push(lp);});sfx('wrap');if(c.isPlayer)showBanner('PHANTOM TRAIN!','#ff7a95');}
function updateTekeRush(c,foe,dt){const s=c.jpS,R=c.rig.root;s.t+=dt;const fwd=new THREE.Vector3(Math.sin(c.facing),0,Math.cos(c.facing)),sd=new THREE.Vector3(fwd.z,0,-fwd.x),fc=centerPos(foe);cineExtras.push(fc.clone());
 if(s.phase===0){c.vel.set(0,0,0);const u=Math.min(1,s.t/0.5);timeTarget=0.65;if(u<0.75)s.lock.copy(foe.pos);const to=s.lock.clone().sub(c.pos).setY(0);if(to.lengthSq()>0.001)c.facing=Math.atan2(to.x,to.z);jpDispose(s.line);s.line=jpLine(c.pos,s.lock,1.3,0xff3050);s.meshes.push(s.line);s.line.material.opacity=0.25+0.3*Math.abs(Math.sin(s.t*24));
  if(Math.random()<0.8)burst(new THREE.Vector3(c.pos.x+fwd.x*0.8,0.15,c.pos.z+fwd.z*0.8),0xffd0d0,1,4,0.7);shake=Math.max(shake,0.05);cineSet(c.pos.x-fwd.x*4.6+sd.x*2.2,1.1,c.pos.z-fwd.z*4.6+sd.z*2.2,s.lock.x,0.9,s.lock.z);
  if(u>=1){s.phase=1;s.t=0;s.from=c.pos.clone();const d=s.lock.clone().sub(c.pos).setY(0),L=Math.min(14,d.length()+2);d.normalize();s.to=clampRing(c.pos.clone().addScaledVector(d,L));s.T=Math.max(0.18,L/34);sfx('ult');jpDispose(s.line);}}
 else if(s.phase===1){const u=Math.min(1,s.t/s.T);timeTarget=0.8;c.pos.lerpVectors(s.from,s.to,u);jpGhost(c,0xff3050,0.3);burst(new THREE.Vector3(c.pos.x,0.2,c.pos.z),0x8a0010,2,3,0.9);if(Math.random()<0.6)burst(new THREE.Vector3(c.pos.x,0.1,c.pos.z),0xffe0a0,1,5,0.6);
  const mid=s.from.clone().lerp(s.to,0.5);cineSet(mid.x+sd.x*10,2.4,mid.z+sd.z*10,mid.x,0.8,mid.z);
  const dist=Math.hypot(foe.pos.x-c.pos.x,foe.pos.z-c.pos.z);if(dist<2.4&&foe.hp>0&&!foe.grabbed&&foe.cocoon<=0&&foe.iframes<=0){s.phase=2;s.t=0;s.k=0;s.grabbed=true;foe.grabbed=true;foe.vel.set(0,0,0);hitStop=Math.max(hitStop,0.12);shake=Math.max(shake,0.6);sfx('slam');burst(fc,0xff2040,18,8,1.1);}
  else if(u>=1){s.phase=4;s.t=0;if(c.isPlayer)showBanner('MISSED!','#aaaaaa');}}
 else if(s.phase===2){c.vel.set(0,0,0);foe.vel.set(0,0,0);foe.stun=Math.max(foe.stun,0.6);const dd=foe.pos.clone().sub(c.pos).setY(0);if(dd.lengthSq()>0.001)c.facing=Math.atan2(dd.x,dd.z);foe.rig.root.rotation.x=-0.5;timeTarget=s.k>=2?0.35:0.7;
  const times=[0.22,0.48,0.85];if(s.k<3&&s.t>=times[s.k]){const k=s.k++,last=k===2;if(foe.hp>0)dealDamage(c,foe,last?25:10,last?18:0);jpSlash(fc,c.facing+1.57,last?0xffffff:0xff3050,k%2?0.9:-0.9,last?2.3:1.5);burst(fc,0xff2040,16,9,1.2);shake=Math.max(shake,last?0.9:0.4);hitStop=Math.max(hitStop,last?0.16:0.06);sfx(last?'ult':'hit');if(last){shockRing(foe.pos,0xff3050);s.grabbed=false;foe.grabbed=false;}}
  cineSet(foe.pos.x+sd.x*4.8,1.4+s.k*0.2,foe.pos.z+sd.z*4.8,foe.pos.x,1.0,foe.pos.z);if(s.k>=3&&s.t>=1.15){s.phase=3;s.t=0;foe.rig.root.rotation.x=0;}if(foe.hp<=0&&s.k<3){s.phase=3;s.t=0;}}
 else if(s.phase===3){timeTarget=1;foe.rig.root.rotation.x+=(0-foe.rig.root.rotation.x)*Math.min(1,dt*8);cineSet(foe.pos.x+sd.x*8,2.4,foe.pos.z+sd.z*8,foe.pos.x,1.2,foe.pos.z);if(s.t>=0.45)jpEnd(c);}
 else{timeTarget=1;cineSet(c.pos.x+sd.x*8,2.6,c.pos.z+sd.z*8,c.pos.x,0.8,c.pos.z);if(s.t>=0.8)jpEnd(c);}}
function updateTekeTrain(c,foe,dt){const s=c.jpS;s.t+=dt;c.vel.set(0,0,0);const fc=centerPos(foe),sd=new THREE.Vector3(s.ax.z,0,-s.ax.x);cineExtras.push(fc.clone(),s.mid.clone().setY(1));
 if(s.phase===0){timeTarget=0.75;if(s.t<0.7){const dm=foe.pos.clone().sub(s.mid).setY(0);if(dm.lengthSq()>0.01){s.mid.add(dm);s.a.add(dm);s.b.add(dm);s.line.position.add(dm);s.lamps.forEach(l=>l.position.add(dm));}}const blink=Math.sin(s.t*14)>0;s.lamps[0].material.opacity=blink?1:0.15;s.lamps[1].material.opacity=blink?0.15:1;s.line.material.opacity=0.2+0.35*Math.abs(Math.sin(s.t*12));if(Math.floor(s.t*6)!==Math.floor((s.t-dt)*6))sfx('hit');
  cineSet(s.mid.x+sd.x*13,4.2,s.mid.z+sd.z*13,s.mid.x,1.2,s.mid.z);if(s.t>=1.1){s.phase=1;s.t=0;s.train=jpTrainMesh(18);s.train.rotation.y=Math.atan2(-s.ax.z,s.ax.x);s.train.position.copy(s.a);scene.add(s.train);s.meshes.push(s.train);sfx('ult');shake=Math.max(shake,0.5);}}
 else if(s.phase===1){timeTarget=0.85;const u=Math.min(1,s.t/0.7);s.train.position.lerpVectors(s.a,s.b,u);s.train.position.y=0;shake=Math.max(shake,0.35);if(Math.random()<0.8)burst(new THREE.Vector3(s.train.position.x,0.4,s.train.position.z),0x9af0ff,3,6,1);s.line.material.opacity=0.5;
  const rel=foe.pos.clone().sub(s.mid);const lat=Math.abs(rel.dot(sd)),along=rel.dot(s.ax),front=s.train.position.clone().sub(s.mid).dot(s.ax)+9;
  if(!s.hit&&lat<2.6&&front>=along&&foe.hp>0&&foe.iframes<=0&&foe.cocoon<=0){s.hit=true;dealDamage(c,foe,35,22);foe.stun=Math.max(foe.stun,1.4);hitStop=Math.max(hitStop,0.14);burst(fc,0x9af0ff,24,10,1.3);shockRing(foe.pos,0x9af0ff);sfx('slam');}
  cineSet(s.mid.x+sd.x*11,3.0,s.mid.z+sd.z*11,s.train.position.x,1.3,s.train.position.z);if(u>=1){jpDispose(s.train);s.phase=s.hit&&foe.hp>0?2:3;s.t=0;if(s.phase===2){s.from=c.pos.clone();}}}
 else if(s.phase===2){timeTarget=0.7;const u=Math.min(1,s.t/0.3);if(u<1){c.pos.lerpVectors(s.from,foe.pos.clone().addScaledVector(foe.pos.clone().sub(s.from).setY(0).normalize(),-1.4),u);jpGhost(c,0xff3050,0.25);}else if(!s.done){s.done=true;if(foe.hp>0)dealDamage(c,foe,15,16);jpSlash(fc,c.facing+1.57,0xffffff,0.6,2.2);burst(fc,0xff2040,20,10,1.2);shake=Math.max(shake,0.8);hitStop=Math.max(hitStop,0.15);sfx('ult');}const dd=foe.pos.clone().sub(c.pos).setY(0);if(dd.lengthSq()>0.001)c.facing=Math.atan2(dd.x,dd.z);cineSet(foe.pos.x+sd.x*6,2.0,foe.pos.z+sd.z*6,foe.pos.x,1.1,foe.pos.z);if(s.t>=0.9){s.phase=3;s.t=0;}}
 else{timeTarget=1;cineSet(c.pos.x+sd.x*9,3,c.pos.z+sd.z*9,c.pos.x,1,c.pos.z);if(s.t>=0.6)jpEnd(c);}}

/* ---------- OBAA skill 1: TURBO LAPS — orbit the foe at blinding speed (5 x 3 wind cuts), then a cane uppercut (30) = 45 ---------- */
function turboLaps(c,foe){const s=jpStart(c,foe,1,'tbA');if(!s)return;s.center=foe.pos.clone();sfx('wrap');if(c.isPlayer)showBanner('TURBO LAPS!','#9af8ff');}
/* ---------- OBAA skill 2: 100 KM/H TACKLE — back off, rev up and blast straight through the foe (50) ---------- */
function turboTackle(c,foe){const s=jpStart(c,foe,2,'tbB');if(!s)return;const d=foe.pos.clone().sub(c.pos).setY(0).normalize();s.dir=d;s.from=c.pos.clone();s.back=clampRing(c.pos.clone().addScaledVector(d,-4));sfx('wrap');if(c.isPlayer)showBanner('100 KM/H TACKLE!','#9af8ff');}
function updateTurboLaps(c,foe,dt){const s=c.jpS,R=c.rig.root;s.t+=dt;const fc=centerPos(foe),fwd=new THREE.Vector3(Math.sin(c.facing),0,Math.cos(c.facing)),sd=new THREE.Vector3(fwd.z,0,-fwd.x);cineExtras.push(fc.clone());
 if(s.phase===0){c.vel.set(0,0,0);timeTarget=0.7;s.center.copy(foe.pos);if(Math.random()<0.8)burst(new THREE.Vector3(c.pos.x,0.3,c.pos.z),0x9af8ff,1,4,0.8);cineSet(c.pos.x-fwd.x*5+sd.x*2,1.6,c.pos.z-fwd.z*5+sd.z*2,foe.pos.x,1.3,foe.pos.z);if(s.t>=0.45){s.phase=1;s.t=0;s.a0=Math.atan2(c.pos.x-foe.pos.x,c.pos.z-foe.pos.z);s.k=0;sfx('ult');foe.stun=Math.max(foe.stun,1.6);}}
 else if(s.phase===1){timeTarget=0.85;const T=1.2,u=Math.min(1,s.t/T),a=s.a0+u*Math.PI*4,r=3.4;c.pos.set(foe.pos.x+Math.sin(a)*r,0,foe.pos.z+Math.cos(a)*r);c.facing=a+Math.PI/2;foe.vel.set(0,0,0);foe.stun=Math.max(foe.stun,0.5);jpGhost(c,0x9af8ff,0.32);if(Math.random()<0.7)burst(new THREE.Vector3(c.pos.x,0.4,c.pos.z),0xffffff,1,5,0.7);
  const ticks=[0.18,0.42,0.66];if(s.k<3&&u>=ticks[s.k]){s.k++;if(foe.hp>0){dealDamage(c,foe,5,0);}for(let i=0;i<3;i++)jpSlash(fc.clone().add(new THREE.Vector3(0,(i-1)*0.5,0)),a+i,0x9af8ff,(i-1)*0.6,1.6);sfx('hit');shake=Math.max(shake,0.3);}
  cineSet(foe.pos.x+Math.sin(a*0.3)*9,4.5,foe.pos.z+Math.cos(a*0.3)*9,foe.pos.x,1.4,foe.pos.z);if(u>=1){s.phase=2;s.t=0;const dd=foe.pos.clone().sub(c.pos).setY(0);c.facing=Math.atan2(dd.x,dd.z);}}
 else if(s.phase===2){c.vel.set(0,0,0);timeTarget=s.t<0.3?0.35:1;if(!s.done&&s.t>=0.18){s.done=true;if(foe.hp>0){dealDamage(c,foe,30,10);foe.stun=Math.max(foe.stun,0.8);}jpSlash(fc,c.facing,0xffffff,1.4,2.4);burst(fc,0x9af8ff,26,11,1.3);shockRing(foe.pos,0x9af8ff);shake=Math.max(shake,0.9);hitStop=Math.max(hitStop,0.16);sfx('ult');}cineSet(c.pos.x+sd.x*6,1.4,c.pos.z+sd.z*6,foe.pos.x,2.2,foe.pos.z);if(s.t>=0.9)jpEnd(c);}}
function updateTurboTackle(c,foe,dt){const s=c.jpS;s.t+=dt;const fc=centerPos(foe),sd=new THREE.Vector3(s.dir.z,0,-s.dir.x);cineExtras.push(fc.clone());
 if(s.phase===0){timeTarget=0.7;const u=Math.min(1,s.t/0.35);c.pos.lerpVectors(s.from,s.back,u);if(s.t>0.35){const d=foe.pos.clone().sub(c.pos).setY(0);if(d.lengthSq()>0.01){s.dir.copy(d.normalize());c.facing=Math.atan2(s.dir.x,s.dir.z);}}if(!s.line||Math.random()<0.3){jpDispose(s.line);s.end=clampRing(c.pos.clone().addScaledVector(s.dir,30));s.line=jpLine(c.pos,s.end,1.8,0x7cf6ff);s.meshes.push(s.line);}s.line.material.opacity=0.2+0.4*Math.abs(Math.sin(s.t*18));
  if(Math.random()<0.9)burst(new THREE.Vector3(c.pos.x-s.dir.x*0.6,0.2,c.pos.z-s.dir.z*0.6),0xbfefff,2,5,0.8);shake=Math.max(shake,0.08*s.t);cineSet(c.pos.x-s.dir.x*5+sd.x*2.5,1.4,c.pos.z-s.dir.z*5+sd.z*2.5,foe.pos.x,1.2,foe.pos.z);
  if(s.t>=1.0){s.phase=1;s.t=0;s.from=c.pos.clone();s.end=clampRing(c.pos.clone().addScaledVector(s.dir,30));s.T=Math.max(0.2,s.from.distanceTo(s.end)/55);sfx('ult');jpDispose(s.line);s.line=null;}}
 else if(s.phase===1){timeTarget=0.8;const u=Math.min(1,s.t/s.T);c.pos.lerpVectors(s.from,s.end,u);jpGhost(c,0x9af8ff,0.4);burst(new THREE.Vector3(c.pos.x,0.3,c.pos.z),0xffffff,2,6,0.8);
  const rel=foe.pos.clone().sub(c.pos);if(!s.hit&&Math.abs(rel.dot(sd))<1.9&&rel.dot(s.dir)<0.8&&rel.dot(s.dir)>-2&&foe.hp>0&&foe.iframes<=0&&foe.cocoon<=0){s.hit=true;dealDamage(c,foe,50,30);foe.stun=Math.max(foe.stun,1.5);hitStop=Math.max(hitStop,0.18);burst(fc,0x9af8ff,30,12,1.4);shockRing(foe.pos,0xffffff);shake=Math.max(shake,1);sfx('slam');}
  const mid=s.from.clone().lerp(s.end,0.5);cineSet(mid.x+sd.x*12,3.2,mid.z+sd.z*12,c.pos.x,1.2,c.pos.z);if(u>=1){s.phase=2;s.t=0;if(!s.hit&&c.isPlayer)showBanner('MISSED!','#aaaaaa');}}
 else{timeTarget=1;if(s.t<0.4&&Math.random()<0.9)burst(new THREE.Vector3(c.pos.x,0.15,c.pos.z),0xffd080,3,6,0.8);cineSet(c.pos.x+sd.x*8,2.6,c.pos.z+sd.z*8,c.pos.x,1.2,c.pos.z);if(s.t>=0.7)jpEnd(c);}}
function jpUpdateSkill(c,foe,dt){const s=c.jpS;if(!s)return;if(c.grabbed||c.cocoon>0||c.throwFlight){jpEnd(c);return;}if(s.kind==='tkA')updateTekeRush(c,foe,dt);else if(s.kind==='tkB')updateTekeTrain(c,foe,dt);else if(s.kind==='tbA')updateTurboLaps(c,foe,dt);else updateTurboTackle(c,foe,dt);}
