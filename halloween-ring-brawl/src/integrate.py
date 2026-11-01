# Applies the Youkai Valley update (2 fighters + Japan adventure area) on top of the pulled game_code.html.
# Usage: python3 src/integrate.py <base.html> <out.html>
import sys, os
base, out = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(base, encoding='utf-8').read()

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    assert n == cnt, 'expected %d, found %d: %s' % (cnt, n, a[:110])
    s = s.replace(a, b)

# ---------------- roster ----------------
rep("btnBg:'radial-gradient(#ffd070,#a04808)'}];const LOCKED_ICONS",
    "btnBg:'radial-gradient(#ffd070,#a04808)'},"
    "{id:'aiko',name:'AIKO',title:'Cursed Schoolgirl',form:'teketeke',formName:'TEKE-TEKE',icon:'👧',ultIcon:'🩸',skin:0xf2d3bd,color:'#ff6a88',bg:'linear-gradient(160deg,#5a1030,#12060c)',skills:['Elbow Rush','Phantom Train'],btn:['ELBOW<br>RUSH','PHANTOM<br>TRAIN'],btnBg:'radial-gradient(#ff9ab0,#8a0f2a)'},"
    "{id:'obaa',name:'OBAA KIYO',title:'Cane Granny',form:'turbo',formName:'TURBO GRANNY',icon:'👵',ultIcon:'💨',skin:0xd9b494,color:'#7cf6ff',bg:'linear-gradient(160deg,#1f4a5a,#081218)',skills:['Turbo Laps','100 KM/H Tackle'],btn:['TURBO<br>LAPS','100 KM/H<br>TACKLE'],btnBg:'radial-gradient(#c8fbff,#1a6a7a)'}];const LOCKED_ICONS")
rep("rimba:'rimba',ustadz:'ustadz'});", "rimba:'rimba',ustadz:'ustadz',aiko:'aiko',obaa:'obaa'});")

# ---------------- model ----------------
rep("Q=style==='rimba',Y=style==='ustadz';", "Q=style==='rimba',Y=style==='ustadz',J1=style==='aiko',J2=style==='obaa';")
rep("const M=Y?{skin,gold,shirt:stdMat(0xf4f1ea,0.7)",
    "const M=J1?{skin,gold,shirt:stdMat(0xf4f2ee,0.7,0,{side:THREE.DoubleSide}),trim:stdMat(0xf4f2ee,0.6),collar:stdMat(0x1a2244,0.7,0,{side:THREE.DoubleSide}),scarf:stdMat(0xc81e3a,0.55),skirt:stdMat(0x1c2340,0.8,0,{side:THREE.DoubleSide}),sock:stdMat(0x111318,0.7),bag:stdMat(0x2a1a12,0.6),glove:skin,fingers:skin,pants:stdMat(0x15161c,0.65),shoe:stdMat(0x3a1e10,0.45),sole:stdMat(0x140a06,0.8),hair:stdMat(0x07060a,0.4,0.1),brow:stdMat(0x07060a,0.7),eyeWhite:stdMat(0xf6f1ea,0.3),lip:stdMat(0xb04a5a,0.5),belt:stdMat(0x1c2340,0.8)}"
    ":J2?{skin,gold,shirt:stdMat(0x4a3a5a,0.85,0,{side:THREE.DoubleSide}),jacket:stdMat(0x2a2630,0.8,0,{side:THREE.DoubleSide}),trim:stdMat(0xd8cfc0,0.7),obi:stdMat(0x8a6a3a,0.6),cord:stdMat(0xc04a3a,0.5),geta:stdMat(0x6a4a2a,0.7),glass:stdMat(0xd8c070,0.3,0.8),cane:stdMat(0x5a3a1c,0.6),glove:skin,fingers:skin,pants:stdMat(0xf0ece0,0.8),shoe:stdMat(0xf0ece0,0.8),sole:stdMat(0x6a4a2a,0.7),hair:stdMat(0xb8b8b4,0.7),brow:stdMat(0xc8c8c4,0.7),eyeWhite:stdMat(0xf3eee6,0.3),lip:stdMat(0x8a5a50,0.7),belt:stdMat(0x8a6a3a,0.6)}"
    ":Y?{skin,gold,shirt:stdMat(0xf4f1ea,0.7)")
rep("\nelse if(Y){M.sleeve=M.jacket;M.forearm=M.jacket;M.cuff=M.trim;}",
    "\nelse if(J1){M.sleeve=M.shirt;M.forearm=M.shirt;M.cuff=M.collar;}else if(J2){M.sleeve=M.shirt;M.forearm=M.shirt;M.cuff=M.trim;}else if(Y){M.sleeve=M.jacket;M.forearm=M.jacket;M.cuff=M.trim;}")
rep("bagas:0x2a1a40,rimba:0x4a2a10};", "bagas:0x2a1a40,rimba:0x4a2a10,aiko:0x1a0e08,obaa:0x2a2420};")
rep("const cloth=[];let amulet=null;", "const cloth=[],jp={};let amulet=null;")
rep("}else if(Y){ustadzBase({chest,spine,hips,head:H.head,M,armL,armR,legL,legR,cloth,root});}",
    "}else if(J1){aikoBase({chest,spine,hips,head:H.head,M,armL,armR,legL,legR,cloth,root,jp});}else if(J2){obaaBase({chest,spine,hips,head:H.head,M,armL,armR,legL,legR,cloth,root,jp});}else if(Y){ustadzBase({chest,spine,hips,head:H.head,M,armL,armR,legL,legR,cloth,root});}")
rep("bagas:0xb58cff,rimba:0xffa020}[id]||0xffc040)", "bagas:0xb58cff,rimba:0xffa020,aiko:0xff3050,obaa:0x7cf6ff}[id]||0xffc040)")
rep("}else if(Y){glowColor=0xffe08a;cursedSkin=0xb98a62;onCurse=()=>{};}",
    "}else if(J1){glowColor=0xff3050;cursedSkin=0xbfc6d2;onCurse=aikoForm({add,root,chest,hips,spine,head:H.head,armL,armR,legL,legR,points,eyeGlows,hideOnCurse,M,rings,jp});}else if(J2){glowColor=0x7cf6ff;cursedSkin=0xa9b8c4;onCurse=obaaForm({add,root,chest,hips,spine,head:H.head,armL,armR,legL,legR,points,eyeGlows,hideOnCurse,M,rings,ribbons,jp});}else if(Y){glowColor=0xffe08a;cursedSkin=0xb98a62;onCurse=()=>{};}")

# ---------------- skills, AI, locks ----------------
FL = "c.bgA||c.bgB||c.tgA||c.tgB"
rep("c.suB||c.suR||c.bgA||c.bgB||c.tgA||c.tgB)return;const S={", "c.suB||c.suR||c.bgA||c.bgB||c.tgA||c.tgB||c.jpS)return;const S={")
rep("harimau:[rimbaStance,rimbaPounce]}[c.form];", "harimau:[rimbaStance,rimbaPounce],teketeke:[tekeRush,tekeTrain],turbo:[turboLaps,turboTackle]}[c.form];")
rep("if((c.tgA||c.tgB)&&(c.grabbed||c.cocoon>0||c.throwFlight))endRimba(c);", "if((c.tgA||c.tgB)&&(c.grabbed||c.cocoon>0||c.throwFlight))endRimba(c);if(c.jpS&&(c.grabbed||c.cocoon>0||c.throwFlight))jpEnd(c);")
rep("if(c.tgB){updateRimbaPounce(c,dt);animateRig(c,dt);placeRig(c);return;}", "if(c.tgB){updateRimbaPounce(c,dt);animateRig(c,dt);placeRig(c);return;}if(c.jpS){jpUpdateSkill(c,foe,dt);animateRig(c,dt);placeRig(c);return;}")
rep("if(c.hp<=0)Object.assign(p,{hrx:-1.5,hry:0,hy:0.45", "jpPose(c,p,t);if(c.hp<=0)Object.assign(p,{hrx:-1.5,hry:0,hy:0.45")
rep("c.bgA||c.bgB||c.tgA||c.tgB||c.advPose)?24", "c.bgA||c.bgB||c.tgA||c.tgB||c.jpS||c.advPose)?24")
rep("e.bgA||e.bgB||e.tgA||e.tgB)return mv;", "e.bgA||e.bgB||e.tgA||e.tgB||e.jpS)return mv;")
rep("jelangkung:d<14&&d>2?1.0:0,harimau:d<8?1.0:0}[e.form];", "jelangkung:d<14&&d>2?1.0:0,harimau:d<8?1.0:0,teketeke:d<12&&d>2?1.0:0,turbo:d<9?1.0:0}[e.form];")
rep("jelangkung:d<12,harimau:d<18&&d>5}[e.form]", "jelangkung:d<12,harimau:d<18&&d>5,teketeke:d<14,turbo:d<20&&d>4}[e.form]")
rep("if(c.tgA||c.tgB)endRimba(c);if(c.spit)endSpit(c);", "if(c.tgA||c.tgB)endRimba(c);if(c.jpS)jpEnd(c);if(c.spit)endSpit(c);")
rep("if(c.tgA||c.tgB)endRimba(c);if(c.y>0)", "if(c.tgA||c.tgB)endRimba(c);if(c.jpS)jpEnd(c);if(c.y>0)")
rep("c.bgA||c.bgB||c.tgA||c.tgB||c.grabbed||c.cocoon>0||c.throwFlight));}", "c.bgA||c.bgB||c.tgA||c.tgB||c.jpS||c.grabbed||c.cocoon>0||c.throwFlight));}")
rep("c.bgA||c.bgB||c.tgA||c.tgB)return true;const o=c===player", "c.bgA||c.bgB||c.tgA||c.tgB||c.jpS)return true;const o=c===player")
rep("jelangkung:'JELANGKUNG RISES!',harimau:'WERETIGER AWAKENS!'}[c.form]", "jelangkung:'JELANGKUNG RISES!',harimau:'WERETIGER AWAKENS!',teketeke:'TEKE-TEKE CRAWLS OUT!',turbo:'TURBO GRANNY AWAKENS!'}[c.form]")

# ---------------- adventure: two worlds ----------------
rep("const ADV_AREAS=[\n", "const ADV_AREAS_NUSA=[\n")
rep("css:'#8affa0'}];\nconst ADV_HOME=", "css:'#8affa0'}];\nlet ADV_AREAS=ADV_AREAS_NUSA;\nconst ADV_HOME=")
rep("['rimba','bagas','surya'].forEach(k=>{if(o[k])advBossCache[k]=true;});", "['rimba','bagas','surya','aiko','obaa'].forEach(k=>{if(o[k])advBossCache[k]=true;});")
rep("function advStart(){if(ADV.on||!initialized)return;", "function advStart(wid){if(ADV.on||!initialized)return;wid=ADV_WORLDS[wid]?wid:'nusa';const AW=ADV_WORLDS[wid];")
rep("if(!ADV.world){ADV.world=advBuildWorld();ADV.kroco=advSpawnKroco(ADV.world);}",
    "ADV.wid=wid;ADV_AREAS=AW.areas;ADV.worlds=ADV.worlds||{};ADV.krocoBy=ADV.krocoBy||{};if(!ADV.worlds[wid]){const w=AW.build();w.userData.treePos=ADV.treePos;ADV.worlds[wid]=w;ADV.world=w;ADV.krocoBy[wid]=advSpawnKroco(w);}ADV.world=ADV.worlds[wid];ADV.kroco=ADV.krocoBy[wid];ADV.treePos=ADV.world.userData.treePos;")
rep("scene.background.setHex(0x0a0818);if(scene.fog){scene.fog.color.setHex(0x0a0818);", "scene.background.setHex(AW.sky);if(scene.fog){scene.fog.color.setHex(AW.sky);")
rep("advBanner('USTADZ\\'S ADVENTURE','#ffe08a','Defeat spirits, grow stronger, conquer three regions');}", "advBanner(AW.banner,AW.css,AW.sub);}")
rep("if(!t)return;ev.preventDefault();advStart();});", "if(!t)return;ev.preventDefault();advChooseWorld();});")
rep("const def=ADV_BOSS[id],a=ADV_AREAS[def.area];if(advBossDone(id))continue;", "const def=ADV_BOSS[id];if((def.world||'nusa')!==ADV.wid)continue;const a=ADV_AREAS[def.area];if(advBossDone(id))continue;")
rep("if(id==='rimba')advRimbaSetup(b);else if(id==='bagas')advBagasSetup(b);else advSuryaSetup(b);", "if(id==='rimba')advRimbaSetup(b);else if(id==='bagas')advBagasSetup(b);else if(id==='aiko')advAikoSetup(b);else if(id==='obaa')advObaaSetup(b);else advSuryaSetup(b);")
rep("if(b.bid==='rimba')brainRimba(b,dt,h);else if(b.bid==='bagas')brainBagas(b,dt,h);else brainSurya(b,dt,h);", "if(b.bid==='rimba')brainRimba(b,dt,h);else if(b.bid==='bagas')brainBagas(b,dt,h);else if(b.bid==='aiko')brainAiko(b,dt,h);else if(b.bid==='obaa')brainObaa(b,dt,h);else brainSurya(b,dt,h);")
rep("function advBossReset(full){const b=ADV.boss;if(!b)return;ADV.boss=null;", "function advBossReset(full){const b=ADV.boss;if(!b)return;ADV.boss=null;if(b.jpFree)b.jpFree(b);")
rep("const m=(b.vuln>0?1.6:1);const d=dmg*m;", "const m=(b.vuln>0?1.6:(b.dmgTake||1));const d=dmg*m;")
# minions
rep("if(type==='pocong'){P.body=at(cyl(0.36,0.27,1.5,M.shroud,14)", "if(jpKrocoBuild(type,g,P,{ball,cyl,cone,torus})){}else if(type==='pocong'){P.body=at(cyl(0.36,0.27,1.5,M.shroud,14)")
rep("sh.scale.set(type==='gender'?1.5:0.95,type==='gender'?1.5:0.95,1);", "const hv=type==='gender'||type==='oni';sh.scale.set(hv?1.5:0.95,hv?1.5:0.95,1);")
rep("if(k.type==='pocong'){yy=mvs>0.5?Math.abs(Math.sin(t*6+k.ph))*0.55:0;", "if(JP_KROCO_TYPES.includes(k.type)){yy=jpKrocoAnim(k,mvs,t);}else if(k.type==='pocong'){yy=mvs>0.5?Math.abs(Math.sin(t*6+k.ph))*0.55:0;")
rep("const make=(type,lvl,x,z)=>{const b=advBuildKroco(type),def=KROCO[type];b.g.position.set(x,0,z);b.g.scale.setScalar(type==='gender'?1.45:1.3);",
    "const JPW=ADV.wid==='jp';const make=(type,lvl,x,z)=>{if(JPW)lvl=Math.min(7,lvl+2);const hv=type==='gender'||type==='oni';const b=advBuildKroco(type),def=KROCO[type];b.g.position.set(x,0,z);b.g.scale.setScalar(hv?1.45:1.3);")
rep("rad:type==='gender'?1.9:1.2,sc:type==='gender'?1.45:1.3,", "rad:hv?1.9:1.2,sc:hv?1.45:1.3,")
rep("const pick=(lvl)=>{const r=rnd();if(lvl>=3&&r<0.12)return 'gender';return r<0.4?'pocong':r<0.72?'tuyul':'kuyang';};",
    "const pick=(lvl)=>{const r=rnd();if(lvl>=3&&r<0.12)return JPW?'oni':'gender';if(JPW)return r<0.4?'chochin':r<0.72?'kasa':'onibi';return r<0.4?'pocong':r<0.72?'tuyul':'kuyang';};")
rep("c.fillStyle=k.type==='gender'?'#ff9a30':'#ff4a5a';c.beginPath();c.arc(X(k.pos.x),X(k.pos.z),k.type==='gender'?3.4:2.4,0,7);",
    "const hv=k.type==='gender'||k.type==='oni';c.fillStyle=hv?'#ff9a30':'#ff4a5a';c.beginPath();c.arc(X(k.pos.x),X(k.pos.z),hv?3.4:2.4,0,7);")

# ---------------- modules ----------------
mods = open(os.path.join(here, 'jp_fighters.js'), encoding='utf-8').read() + '\n' + open(os.path.join(here, 'jp_adventure.js'), encoding='utf-8').read() + '\n'
rep("/* ===== Balance layer: every Skill 1", mods + "/* ===== Balance layer: every Skill 1")
open(out, 'w', encoding='utf-8').write(s)
print('ok', len(s))
