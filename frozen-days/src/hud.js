// DOM HUD: speed, level + XP, balance bar, optional goal card, toasts, first-run hint, skills panel.
const CSS = `
#hud{position:absolute;inset:0;pointer-events:none;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;text-shadow:0 2px 6px rgba(20,40,70,.55)}
#hud .chip{position:absolute;top:28px;padding:10px 20px;border-radius:22px;background:rgba(25,50,85,.45);font-size:28px;font-weight:700;backdrop-filter:blur(4px)}
#speed{left:24px}
#hud #clock{left:50%;top:22px;transform:translateX(-50%);padding:6px 16px 7px;font-size:16px;line-height:1.25;text-align:center;border-radius:18px;white-space:pre;font-weight:700}
#lvl{right:24px;width:236px;padding:8px 16px 10px;font-size:22px;text-align:left}
#xpTrack{margin-top:6px;height:12px;border-radius:7px;background:rgba(255,255,255,.28);overflow:hidden}
#xpFill{height:100%;width:0;background:linear-gradient(90deg,#ffd66b,#ffae3d);transition:width .3s}
#xpPop{position:absolute;right:30px;top:104px;font-size:24px;font-weight:800;color:#ffe08a;opacity:0;transition:opacity .3s,transform .6s;transform:translateY(0)}
#xpPop.show{opacity:1;transform:translateY(-8px)}
#bal{position:absolute;left:50%;top:92px;width:380px;margin-left:-190px;text-align:center;font-size:20px;font-weight:700;letter-spacing:2px;opacity:.95}
#balTrack{margin-top:6px;height:22px;border-radius:12px;background:rgba(25,50,85,.45);overflow:hidden;border:2px solid rgba(255,255,255,.7)}
#balFill{height:100%;width:0;background:#5fd38d;transition:background .15s}
#bal.shake{animation:sh .18s infinite}@keyframes sh{0%{transform:translateX(-3px)}50%{transform:translateX(3px)}100%{transform:translateX(-3px)}}
#goal{position:absolute;left:50%;top:216px;width:420px;margin-left:-210px;padding:8px 16px 10px;border-radius:20px;background:rgba(25,50,85,.45);font-size:21px;font-weight:700;text-align:center;pointer-events:auto;backdrop-filter:blur(4px)}
#goal small{display:block;font-size:15px;font-weight:600;opacity:.8;letter-spacing:1px;margin-bottom:2px}
#goalTrack{margin-top:6px;height:10px;border-radius:6px;background:rgba(255,255,255,.28);overflow:hidden}
#goalFill{height:100%;width:0;background:#7be0a8;transition:width .25s}
#toast{position:absolute;left:40px;right:40px;top:340px;text-align:center;font-size:36px;font-weight:800;opacity:0;transition:opacity .25s;line-height:1.25}
#toast.show{opacity:1}
#hint{position:absolute;left:50%;bottom:42%;width:560px;margin-left:-280px;padding:22px 26px;border-radius:26px;background:rgba(25,50,85,.58);text-align:center;font-size:28px;font-weight:600;line-height:1.35;transition:opacity .6s}
#hint.hide{opacity:0}
.hbtn{position:absolute;top:166px;pointer-events:auto;padding:8px 18px;border-radius:18px;background:rgba(25,50,85,.45);font-size:22px;font-weight:700;cursor:pointer}
#charBtn{left:24px}#skillBtn{right:24px}
#panel{position:absolute;inset:0;display:none;pointer-events:auto;background:rgba(15,30,55,.55);backdrop-filter:blur(6px)}
#panel .card{position:absolute;left:36px;right:36px;top:120px;padding:30px 30px 26px;border-radius:34px;background:rgba(235,244,252,.96);color:#1d3a5c;text-shadow:none}
#panel h2{margin:0 0 4px;font-size:40px}
#panel .sub{font-size:24px;font-weight:600;opacity:.8;margin-bottom:18px}
#panel .row{display:flex;align-items:center;margin:10px 0;font-size:26px;font-weight:700}
#panel .row .nm{width:170px}#panel .row .bar{flex:1;height:22px;border-radius:12px;background:#cbdcec;overflow:hidden}
#panel .row .bar i{display:block;height:100%;background:linear-gradient(90deg,#46b3ff,#2a7de1)}
#panel .row .pc{width:84px;text-align:right}
#panel .row.lock{opacity:.5}
#panel .bests{margin-top:16px;padding-top:14px;border-top:2px solid #c5d6e8;font-size:23px;font-weight:600;line-height:1.55}
#panel .btns{display:flex;gap:16px;margin-top:20px}
#panel button{flex:1;padding:18px;border-radius:22px;border:0;font-size:28px;font-weight:800;cursor:pointer;background:#3fa7ff;color:#fff}
#panel button.alt{background:#d6e3f1;color:#1d3a5c}
#touch{position:absolute;inset:0;pointer-events:none;font-family:system-ui,sans-serif}
#joyZone{position:absolute;left:0;bottom:0;width:380px;height:560px;pointer-events:auto;touch-action:none}
#joyBase{position:absolute;left:60px;bottom:110px;width:230px;height:230px;border-radius:50%;background:rgba(255,255,255,.28);border:3px solid rgba(255,255,255,.6)}
#joyKnob{position:absolute;left:70px;top:70px;width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.8);box-shadow:0 4px 10px rgba(0,0,0,.25)}
#touch .btn{position:absolute;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center;border-radius:50%;font-weight:800;color:#fff;background:rgba(40,110,180,.62);border:3px solid rgba(255,255,255,.75);text-shadow:none;letter-spacing:1px}
#touch .btn.on{background:rgba(70,150,230,.9);transform:scale(.95)}
#btnPush{right:40px;bottom:130px;width:200px;height:200px;font-size:34px}
#btnBrake{right:270px;bottom:110px;width:150px;height:150px;font-size:24px;background:rgba(190,80,70,.62)}
#btnBrake.on{background:rgba(220,100,90,.9)}
#touch #btnSpin{right:70px;bottom:360px;width:130px;height:130px;font-size:24px;background:rgba(150,90,200,.65)}
#touch #btnTalk{right:250px;bottom:300px;width:120px;height:120px;font-size:22px;background:rgba(60,160,110,.75)}
#talkTip{position:absolute;right:190px;bottom:440px;padding:10px 22px;border-radius:20px;background:rgba(25,50,85,.55);font-size:24px;font-weight:700;display:none;white-space:nowrap}
#zoneBanner{position:absolute;left:0;right:0;top:430px;text-align:center;font-size:44px;font-weight:800;opacity:0;transition:opacity .5s}
#zoneBanner.show{opacity:1}
#dlg{position:absolute;left:30px;right:30px;bottom:44px;padding:24px 28px 20px;border-radius:32px;background:rgba(235,244,252,.97);color:#1d3a5c;display:none;pointer-events:auto;text-shadow:none;cursor:pointer}
#dlg .who{font-size:32px;font-weight:800}#dlg .role{font-size:21px;font-weight:600;opacity:.65;margin-left:8px}
#dlg .hearts{font-size:24px;color:#e0507a;letter-spacing:4px;margin-top:2px}
#dlg .txt{font-size:30px;font-weight:600;line-height:1.35;margin:12px 0 8px;min-height:125px}
#dlg .nxt{text-align:right;font-size:22px;font-weight:700;opacity:.6}
`;

const SK = [['balance', 'Balance'], ['control', 'Control'], ['speed', 'Speed'], ['braking', 'Braking'], ['tricks', 'Tricks']];

export function createHud(root, { touch }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = document.createElement('div'); el.id = 'hud';
  const hintText = touch
    ? 'Move the stick to head that way.<br>Push it fully to stroke, <b>BRAKE</b> to stop.<br>Drag the screen to look around.'
    : '<b>WASD / arrows</b> move (push fully to stroke) &nbsp; <b>Space</b> brake<br>Drag the screen to look around.<br>Falling is part of learning!';
  el.innerHTML =
    '<div id="speed" class="chip">0 km/h</div><div id="clock" class="chip"></div>' +
    '<div id="lvl" class="chip"><div id="lvlTxt">Lv 1 · Beginner</div><div id="xpTrack"><div id="xpFill"></div></div></div><div id="xpPop"></div>' +
    '<div id="bal"><div>BALANCE</div><div id="balTrack"><div id="balFill"></div></div></div>' +
    '<div id="goal"><small>GOAL · tap to skip</small><span id="goalTxt"></span><div id="goalTrack"><div id="goalFill"></div></div></div>' +
    '<div id="toast"></div><div id="hint">' + hintText + '</div>' +
    '<div id="talkTip"></div><div id="zoneBanner"></div>' +
    '<div id="dlg"><div class="who"><span id="dName"></span><span class="role" id="dRole"></span></div><div class="hearts" id="dHearts"></div><div class="txt" id="dTxt"></div><div class="nxt">Tap to continue ▶</div></div>' +
    '<div id="charBtn" class="hbtn">☺ Character</div><div id="skillBtn" class="hbtn">★ Skills</div>' +
    '<div id="panel"><div class="card"><h2 id="pTitle"></h2><div class="sub" id="pSub"></div><div id="pRows"></div><div class="bests" id="pBests"></div>' +
    '<div class="btns"><button class="alt" id="pRespawn">Respawn</button><button id="pClose">Continue</button></div></div></div>';
  root.appendChild(el);
  const $ = (id) => el.querySelector('#' + id);
  const speedEl = $('speed'), lvlTxt = $('lvlTxt'), xpFill = $('xpFill'), xpPop = $('xpPop'), balEl = $('bal'), fillEl = $('balFill'),
    goalTxt = $('goalTxt'), goalFill = $('goalFill'), toastEl = $('toast'), hintEl = $('hint'), panel = $('panel');
  const talkTip = $('talkTip'), bannerEl = $('zoneBanner'), dlg = $('dlg');
  let dlgState = null, bannerTimer = 0;
  let toastTimer = 0, hintTimer = 9, hintHidden = false, popTimer = 0, popAcc = 0, popGather = 0, panelOpen = false;
  $('charBtn').addEventListener('click', () => el.dispatchEvent(new CustomEvent('character')));
  $('goal').addEventListener('click', () => el.dispatchEvent(new CustomEvent('skipgoal')));
  $('skillBtn').addEventListener('click', () => el.dispatchEvent(new CustomEvent('panel')));
  $('pClose').addEventListener('click', () => hidePanel());
  $('pRespawn').addEventListener('click', () => { hidePanel(); el.dispatchEvent(new CustomEvent('respawn')); });

  function setClock(t) { const e = $('clock'); if (e && e.textContent !== t) e.textContent = t; }
  function hideHint() { if (!hintHidden) { hintHidden = true; hintEl.classList.add('hide'); } }
  function toast(text, secs = 2.2) { toastEl.textContent = text; toastEl.classList.add('show'); toastTimer = secs; }
  function showPanel(prog, extra) {
    const info = prog.info(), sk = prog.rawSkills(), st = prog.stats(), ex = extra || {};
    $('pTitle').textContent = 'Lv ' + info.level + ' · ' + info.name;
    $('pSub').textContent = info.level >= 10 ? 'Max level reached' : Math.round(info.need - info.into) + ' XP to the next level';
    $('pRows').innerHTML = SK.map(([k, label]) => {
      const locked = k === 'tricks' && !prog.spinUnlocked();
      return '<div class="row' + (locked ? ' lock' : '') + '"><div class="nm">' + label + '</div><div class="bar"><i style="width:' + Math.round(sk[k] * 100) + '%"></i></div><div class="pc">' +
        (locked ? 'Lv 3' : Math.round(sk[k] * 100) + '%') + '</div></div>';
    }).join('');
    $('pBests').innerHTML = 'Best clean run: <b>' + Math.round(st.best.run) + ' m</b> · Top speed: <b>' + Math.round(st.best.speed * 2.4) + ' km/h</b><br>' +
      'Total distance: <b>' + (st.totals.dist / 1000).toFixed(2) + ' km</b> · Falls: <b>' + st.totals.falls + '</b> · Spins: <b>' + st.totals.spins + '</b> · Goals: <b>' + st.totals.goals + '</b><br>' +
      'Places found: <b>' + st.zones + (ex.zones ? '/' + ex.zones : '') + '</b> · Friends met: <b>' + st.friends + (ex.npcs ? '/' + ex.npcs : '') + '</b>';
    panel.style.display = 'block'; panelOpen = true;
  }
  function hidePanel() { panel.style.display = 'none'; panelOpen = false; }
  function setTalk(name, touchUi) {
    if (!name || dlgState) { talkTip.style.display = 'none'; return; }
    talkTip.textContent = (touchUi ? 'Talk to ' : 'F · Talk to ') + name; talkTip.style.display = 'block';
  }
  function banner(text) { bannerEl.textContent = text; bannerEl.classList.add('show'); bannerTimer = 2.8; }
  function renderDialog() {
    $('dTxt').textContent = dlgState.lines[dlgState.i];
  }
  function showDialog(d) {
    dlgState = { lines: d.lines, i: 0 };
    $('dName').textContent = d.name; $('dRole').textContent = d.role + ' · ' + d.label;
    $('dHearts').textContent = '♥'.repeat(d.hearts) + '♡'.repeat(3 - d.hearts);
    talkTip.style.display = 'none'; dlg.style.display = 'block'; renderDialog();
  }
  dlg.addEventListener('click', () => {
    if (!dlgState) return;
    dlgState.i++;
    if (dlgState.i >= dlgState.lines.length) { dlgState = null; dlg.style.display = 'none'; el.dispatchEvent(new CustomEvent('dialogend')); } else renderDialog();
  });
  function update(p, dt, prog) {
    speedEl.textContent = Math.round(p.speed * 2.4) + ' km/h';
    const info = prog.info();
    lvlTxt.textContent = 'Lv ' + info.level + ' · ' + info.name;
    xpFill.style.width = Math.round(info.frac * 100) + '%';
    const g = prog.goal(p);
    goalTxt.textContent = g.text; goalFill.style.width = Math.round(g.frac * 100) + '%';
    const gain = prog.popXp(); popAcc += gain; popGather += dt;
    if (popAcc >= 1 && popGather > 0.8) { xpPop.textContent = '+' + Math.round(popAcc) + ' XP'; xpPop.classList.add('show'); popTimer = 1.1; popAcc = 0; popGather = 0; }
    if (popTimer > 0) { popTimer -= dt; if (popTimer <= 0) xpPop.classList.remove('show'); }
    const b = p.b;
    fillEl.style.width = Math.round((1 - b) * 100) + '%';
    fillEl.style.background = b < 0.4 ? '#5fd38d' : b < 0.7 ? '#f2c94c' : '#eb5757';
    balEl.classList.toggle('shake', b > 0.7 && p.state === 'ok');
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toastEl.classList.remove('show'); }
    if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) bannerEl.classList.remove('show'); }
    if (!hintHidden) { hintTimer -= dt; if (hintTimer <= 0) hideHint(); }
  }
  function destroy() { el.remove(); style.remove(); }
  return { el, update, toast, hideHint, setClock, showPanel, hidePanel, setTalk, banner, showDialog, get panelOpen() { return panelOpen; }, get dialogOpen() { return !!dlgState; }, destroy };
}
