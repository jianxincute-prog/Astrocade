#!/usr/bin/env python3
"""Redesign loading screen + main menu (2D SVG fighter art, opaque backdrop, new button layout).
Usage: python3 menu_redesign.py <in.html> <out.html>   (in = game_code.html before the redesign)"""
import sys,re,os
src,dst=sys.argv[1],sys.argv[2]
A=os.path.join(os.path.dirname(os.path.abspath(__file__)),'art')
rd=lambda n:open(os.path.join(A,n)).read()
s=open(src).read()
assert 'mm-stage' not in s,'already applied'

# ---------- 1. SVG sprite (symbols + scene) right after <body>
sprite='<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'+rd('aiko.svg')+rd('obaa.svg')+rd('scene.svg')+'</defs></svg>\n'
s=s.replace('<body>\n','<body>\n'+sprite,1)

# ---------- 2. markup
petals=''.join('<i class="mm-petal" style="--x:%d%%;--d:%.1fs;--s:%.2f;--w:%.1fs;animation-delay:-%.1fs"></i>'%(x,d,sc,w,dl) for x,d,sc,w,dl in
 [(4,11,.7,3.1,1),(13,15,1,4.2,6),(22,12,.6,3.6,3),(31,17,.9,2.9,9),(40,13,.7,4.4,2),(49,16,1.1,3.3,11),(58,12,.6,3.9,5),(66,18,.9,3.0,8),(74,14,.8,4.1,0),(83,16,1,3.5,7),(91,12,.7,3.8,4),(97,17,.9,3.2,10)])
art='<div class="mm-art" aria-hidden="true"><svg class="mm-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><use href="#art-scene"/></svg><div class="mm-petals">'+petals+'</div><div class="mm-vig"></div></div>'

def char(side,sym,name,tag):
    return ('<div class="mm-char mm-%s"><div class="mm-fig"><svg viewBox="0 0 320 440"><use href="#%s"/></svg></div>'
            '<div class="mm-name"><b>%s</b><small>%s</small></div></div>')%(side,sym,name,tag)

menu=(art+'<div class="mm-stage">'
 +char('l','art-aiko','AIKO','TEKE-TEKE')
 +'<div class="mm-title"><div class="mm-kicker">HALLOWEEN FIGHT NIGHT</div><h1>RING<br><span>BRAWL</span></h1><div class="mm-badge">NEW AREA · YOUKAI VALLEY</div></div>'
 +'<div class="mm-btns"><div id="startBtn"><span>FIGHT!</span><small>ENTER THE CURSED ARENA</small></div>'
 +'<div class="mm-row"><button id="advBtn" type="button"><b><em>🗺️</em> ADVENTURE</b><small>2 AREAS</small></button>'
 +'<button id="missionBtn" type="button"><b><em>📜</em> MISSIONS</b><small>CHALLENGES</small></button></div>'
 +'<p class="mm-hint">WASD move · J punch · K dodge · U Ultimate · 1 / 2 skills</p></div>'
 +char('r','art-obaa','OBAA KIYO','TURBO GRANNY')
 +'</div>')
i=s.index('<div id="overlay">')+len('<div id="overlay">')
j=s.index('</div>\n</div>\n</div>\n<div id="select">')   # end of old menu-content + overlay + wrap
# old block: <div class="menu-content"> ... </div>\n</div>   (overlay close)  -> replace inner of overlay
k=s.index('<div class="menu-content">',i)
end_old=s.index('</div>\n</div>',k)   # menu-content close + overlay close
s=s[:i]+'\n'+menu+'\n'+s[end_old+len('</div>\n'):]  # keep overlay's own closing </div>

# loading screen
li=s.index('<div id="loadingScreen"'); lj=s.index('</div>\n</div>\n<div id="overlay">',li)
load=('<div id="loadingScreen" aria-label="Loading Halloween Ring Brawl">'+art+'<div class="ld-stage">'
 '<div class="ld-char ld-l"><div class="mm-fig"><svg viewBox="0 0 320 440"><use href="#art-aiko"/></svg></div><div class="mm-name"><b>AIKO</b><small>TEKE-TEKE</small></div></div>'
 '<div class="ld-center"><div class="loading-eyebrow">HALLOWEEN FIGHT NIGHT</div><div class="loading-title">RING<br><span>BRAWL</span></div>'
 '<div class="ld-vs"><i></i><b>VS</b><i></i></div><div class="loading-subtitle">YOUKAI VALLEY AWAITS</div>'
 '<div class="loading-track"><div id="loadingProgress"></div></div><div id="loadingStatus">Preparing the cursed arena...</div></div>'
 '<div class="ld-char ld-r"><div class="mm-fig"><svg viewBox="0 0 320 440"><use href="#art-obaa"/></svg></div><div class="mm-name"><b>OBAA KIYO</b><small>TURBO GRANNY</small></div></div>'
 '</div>')
s=s[:li]+load+s[lj:]

# ---------- 3. CSS (appended to the first <style> block)
css=r'''
/* ===== Redesign: loading screen + main menu ===== */
#loadingScreen::before,#loadingScreen::after{display:none!important}
#loadingScreen{background:#07021a!important;justify-content:center}
#overlay:has(.mm-art){background:#07021a;padding:clamp(8px,2vh,22px) clamp(8px,2vw,28px)}
#overlay:has(.mm-art)::before,#overlay:has(.mm-art)::after{display:none}
.mm-art{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:#07021a}
.mm-bg{position:absolute;inset:0;width:100%;height:100%;display:block;animation:mmBreath 7s ease-in-out infinite alternate}
.mm-vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 46%,rgba(7,2,26,0) 36%,rgba(7,2,26,.78) 100%),linear-gradient(180deg,rgba(7,2,26,.35),rgba(7,2,26,0) 24%,rgba(7,2,26,0) 70%,rgba(7,2,26,.55))}
.mm-petals{position:absolute;inset:0}
.mm-petal{position:absolute;top:-6%;left:var(--x);width:calc(11px*var(--s));height:calc(8px*var(--s));border-radius:70% 0 70% 0;background:radial-gradient(circle at 30% 30%,#ffd1de,#ff7aa0);opacity:.85;animation:mmFall var(--d) linear infinite,mmSway var(--w) ease-in-out infinite alternate}
@keyframes mmFall{to{top:106%}}
@keyframes mmSway{from{margin-left:-24px;transform:rotate(-30deg)}to{margin-left:24px;transform:rotate(60deg)}}
@keyframes mmBreath{from{transform:scale(1)}to{transform:scale(1.045)}}
@keyframes mmFloat{from{transform:translateY(0)}to{transform:translateY(-10px)}}
@keyframes mmIn{from{opacity:0;transform:translateX(var(--fx,-60px))}to{opacity:1;transform:none}}
@keyframes mmShine{0%,55%{transform:translateX(-130%) skewX(-20deg)}100%{transform:translateX(230%) skewX(-20deg)}}
@keyframes mmPulse{from{box-shadow:0 7px 0 #3a0a00,0 0 22px rgba(255,140,40,.35)}to{box-shadow:0 7px 0 #3a0a00,0 0 46px rgba(255,140,40,.7)}}
.mm-stage{position:relative;z-index:1;width:min(1280px,100%);max-height:100%;margin:auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,480px) minmax(0,1fr);grid-template-areas:"L T R" "L B R";align-items:center;column-gap:clamp(6px,2vw,34px);row-gap:clamp(6px,1.6vh,16px)}
.mm-l{grid-area:L;--fx:-70px}.mm-r{grid-area:R;--fx:70px}
.mm-char{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;animation:mmIn .7s cubic-bezier(.2,.9,.3,1) both}
.mm-r{animation-delay:.12s}
.mm-fig{height:clamp(190px,64vh,600px);aspect-ratio:320/440;max-width:100%}
.mm-fig svg{width:100%;height:100%;display:block;overflow:visible;filter:drop-shadow(0 14px 18px rgba(0,0,0,.55));animation:mmFloat 3.4s ease-in-out infinite alternate}
.mm-r .mm-fig svg{animation-duration:2.6s;animation-delay:-1.1s}
.mm-name{margin-top:clamp(2px,1vh,10px);padding:6px 16px 7px;text-align:center;border-radius:12px;background:linear-gradient(180deg,rgba(26,10,44,.86),rgba(10,4,20,.9));border:1px solid rgba(255,122,149,.5);box-shadow:0 6px 18px rgba(0,0,0,.45)}
.mm-r .mm-name{border-color:rgba(154,248,255,.5)}
.mm-name b{display:block;font-size:clamp(14px,2.6vh,21px);letter-spacing:3px;color:#ffd5de;font-weight:1000;text-shadow:0 0 12px rgba(255,77,109,.6)}
.mm-r .mm-name b{color:#d9fdff;text-shadow:0 0 12px rgba(124,246,255,.6)}
.mm-name small{display:block;margin-top:2px;font-size:clamp(9px,1.5vh,12px);letter-spacing:2px;color:#cdb3e6;font-weight:800}
.mm-title{grid-area:T;text-align:center;align-self:end}
.mm-kicker{text-shadow:0 1px 4px #000;display:inline-block;padding:6px 16px;border:1px solid rgba(255,190,120,.5);border-radius:99px;background:rgba(20,8,34,.7);color:#ffd9a8;font-size:clamp(10px,1.8vh,14px);font-weight:900;letter-spacing:4px}
#overlay .mm-title h1{margin:clamp(2px,1vh,10px) 0 clamp(4px,1vh,10px);font-size:clamp(46px,12vh,92px);line-height:.84;letter-spacing:2px;color:#ffb02e;text-shadow:0 0 28px rgba(255,80,0,.6),0 5px 0 #4a1000,0 0 3px #4a1000;-webkit-text-stroke:1.5px #5a1700;paint-order:stroke fill}
#overlay .mm-title h1 span{display:block;font-size:clamp(38px,9.6vh,74px);letter-spacing:clamp(4px,1.2vh,11px);color:#fff1d6;-webkit-text-stroke:1.5px #5a1c14;text-shadow:0 4px 0 #541d12,0 0 22px rgba(255,200,120,.5)}
.mm-badge{display:inline-block;padding:5px 14px;border-radius:8px;background:linear-gradient(90deg,#c01b49,#7a2dd6);color:#fff;font-size:clamp(10px,1.8vh,13px);font-weight:900;letter-spacing:3px;box-shadow:0 0 18px rgba(214,70,140,.45)}
.mm-btns{grid-area:B;align-self:start}
#overlay .mm-btns #startBtn{position:relative;overflow:hidden;margin:0;min-height:clamp(66px,13vh,104px);font-size:clamp(26px,5.4vh,38px);animation:mmPulse 1.4s ease-in-out infinite alternate}
#overlay .mm-btns #startBtn::after{content:'';position:absolute;top:0;bottom:0;width:36%;left:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:mmShine 2.8s ease-in-out infinite;pointer-events:none}
#overlay .mm-btns #startBtn small{font-size:clamp(10px,1.7vh,13px)}
.mm-row{display:grid;grid-template-columns:1fr 1fr;gap:clamp(8px,1.6vh,14px);margin-top:clamp(10px,1.8vh,16px)}
#overlay .mm-row #advBtn,#overlay .mm-row #missionBtn{width:100%;margin:0;min-height:clamp(54px,10vh,78px);padding:8px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:16px;cursor:pointer;font-family:'Trebuchet MS',Arial,sans-serif;color:#fff}
#overlay .mm-row b{display:block;font-size:clamp(14px,2.7vh,21px);letter-spacing:2px;font-weight:1000}
#overlay .mm-row b em{font-style:normal;font-size:1.1em}
#overlay .mm-row small{display:block;font-size:clamp(9px,1.5vh,12px);letter-spacing:2px;font-weight:800;opacity:.85}
#overlay .mm-row #advBtn{background:linear-gradient(180deg,#3fb478,#14573a)!important;border:3px solid #8affb8!important;box-shadow:0 5px 0 #08200f,0 0 22px rgba(90,255,160,.28)!important}
#overlay .mm-row #missionBtn{background:linear-gradient(180deg,#6a4a9a,#2e1d4a);border:3px solid #c9a4ff;box-shadow:0 5px 0 #120a1a,0 0 22px rgba(166,105,220,.3)}
#overlay .mm-row button:active{transform:translateY(3px)}
.mm-hint{margin-top:clamp(8px,1.6vh,14px)!important;font-size:clamp(10px,1.7vh,13px)!important;color:#c3accf!important;letter-spacing:1px;max-width:none!important;text-shadow:0 1px 3px #000}
/* loading screen */
.ld-stage{position:relative;z-index:1;width:min(1280px,100%);display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,500px) minmax(0,1fr);align-items:center;column-gap:clamp(6px,2vw,34px);padding:0 clamp(8px,2vw,28px)}
.ld-char{display:flex;flex-direction:column;align-items:center;min-width:0;animation:mmIn .9s cubic-bezier(.2,.9,.3,1) both}
.ld-l{--fx:-110px}.ld-r{--fx:110px;animation-delay:.15s}
.ld-char .mm-fig{height:clamp(180px,60vh,560px)}
.ld-center{text-align:center}
#loadingScreen .loading-title{font-size:clamp(44px,12vh,88px);line-height:.84;color:#ffb02e;letter-spacing:2px;-webkit-text-stroke:1.5px #5a1700;paint-order:stroke fill;text-shadow:0 0 28px rgba(255,80,0,.6),0 5px 0 #4a1000}
#loadingScreen .loading-title span{display:block;font-size:.8em;letter-spacing:clamp(4px,1.2vh,11px);color:#fff1d6;-webkit-text-stroke:1.5px #5a1c14;text-shadow:0 4px 0 #541d12,0 0 22px rgba(255,200,120,.5)}
#loadingScreen .loading-eyebrow{color:#ffe3b8;text-shadow:0 1px 5px #000,0 0 12px rgba(0,0,0,.8);font-size:clamp(10px,1.9vh,15px);margin-bottom:clamp(2px,1vh,8px)}
.ld-vs{display:flex;align-items:center;justify-content:center;gap:12px;margin:clamp(6px,1.6vh,14px) 0 4px}
.ld-vs i{flex:1;max-width:90px;height:3px;background:linear-gradient(90deg,transparent,#ff9b2a,transparent)}
.ld-vs b{font-size:clamp(22px,4.4vh,34px);font-style:italic;font-weight:1000;color:#fff;text-shadow:0 0 14px #ff5b18,0 0 4px #ff9b2a;animation:loadPulse .8s ease-in-out infinite alternate}
#loadingScreen .loading-subtitle{margin-top:6px;font-size:clamp(11px,2vh,16px);letter-spacing:4px;color:#ffd5de}
#loadingScreen .loading-track{margin:clamp(14px,3vh,28px) 0 10px;border-color:rgba(255,190,105,.45);box-shadow:inset 0 2px 5px #000,0 0 22px rgba(255,120,40,.25)}
#loadingScreen #loadingStatus{font-size:clamp(11px,2vh,15px);letter-spacing:2px}
@media (max-aspect-ratio:1/1){
 .mm-stage{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"T T" "L R" "B B";align-content:center}
 .mm-title{align-self:center}
 .mm-fig{height:clamp(130px,30vh,340px)}
 .mm-name{padding:4px 10px 5px}
 .ld-stage{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"C C" "L R"}
 .ld-center{grid-area:C;margin-bottom:12px}.ld-l{grid-area:L}.ld-r{grid-area:R}
 .ld-char .mm-fig{height:clamp(130px,32vh,340px)}
 #overlay .mm-title h1{font-size:clamp(40px,8.5vh,70px)}
 #overlay .mm-title h1 span{font-size:clamp(32px,7vh,56px)}
}
@media (prefers-reduced-motion:reduce){.mm-bg,.mm-fig svg,.mm-petal,#startBtn,#startBtn::after{animation:none!important}}
'''
ci=s.index('</style>'); s=s[:ci]+css+s[ci:]

# ---------- 4. skip 3D rendering while the loading screen / main menu covers the scene
old="updateParticles(dt);renderer.render(scene,camera);}\nfunction startLoadingScreen"
assert old in s
new=("updateParticles(dt);{const _ls=document.getElementById('loadingScreen'),_ov=document.getElementById('overlay');"
     "if(!(_ls.style.display!=='none'||(_ov.style.display==='flex'&&_ov.querySelector('.mm-art'))))renderer.render(scene,camera);}}\nfunction startLoadingScreen")
s=s.replace(old,new,1)
open(dst,'w').write(s)
print('ok',len(s))
