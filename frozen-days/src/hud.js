// Minimal DOM HUD: speed, balance bar, stats, toasts, first-run hint, touch-control styling.
const CSS = `
#hud{position:absolute;inset:0;pointer-events:none;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;text-shadow:0 2px 6px rgba(20,40,70,.55)}
#hud .chip{position:absolute;top:28px;padding:10px 20px;border-radius:22px;background:rgba(25,50,85,.45);font-size:28px;font-weight:700;backdrop-filter:blur(4px)}
#speed{left:24px}#stats{right:24px;font-size:24px;text-align:right;line-height:1.3}
#bal{position:absolute;left:50%;top:92px;width:420px;margin-left:-210px;text-align:center;font-size:20px;font-weight:700;letter-spacing:2px;opacity:.95}
#balTrack{margin-top:6px;height:22px;border-radius:12px;background:rgba(25,50,85,.45);overflow:hidden;border:2px solid rgba(255,255,255,.7)}
#balFill{height:100%;width:0;background:#5fd38d;transition:background .15s}
#bal.shake{animation:sh .18s infinite}@keyframes sh{0%{transform:translateX(-3px)}50%{transform:translateX(3px)}100%{transform:translateX(-3px)}}
#toast{position:absolute;left:40px;right:40px;top:300px;text-align:center;font-size:36px;font-weight:800;opacity:0;transition:opacity .25s;line-height:1.25}
#toast.show{opacity:1}
#hint{position:absolute;left:50%;bottom:42%;width:560px;margin-left:-280px;padding:22px 26px;border-radius:26px;background:rgba(25,50,85,.58);text-align:center;font-size:28px;font-weight:600;line-height:1.35;transition:opacity .6s}
#hint.hide{opacity:0}
#charBtn{position:absolute;left:24px;top:160px;pointer-events:auto;padding:8px 18px;border-radius:18px;background:rgba(25,50,85,.45);font-size:22px;font-weight:700}
#respawn{position:absolute;right:24px;top:160px;pointer-events:auto;padding:8px 18px;border-radius:18px;background:rgba(25,50,85,.45);font-size:22px;font-weight:700}
#touch{position:absolute;inset:0;pointer-events:none;font-family:system-ui,sans-serif}
#joyZone{position:absolute;left:0;bottom:0;width:380px;height:560px;pointer-events:auto;touch-action:none}
#joyBase{position:absolute;left:60px;bottom:110px;width:230px;height:230px;border-radius:50%;background:rgba(255,255,255,.28);border:3px solid rgba(255,255,255,.6)}
#joyKnob{position:absolute;left:70px;top:70px;width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.8);box-shadow:0 4px 10px rgba(0,0,0,.25)}
#touch .btn{position:absolute;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center;border-radius:50%;font-weight:800;color:#fff;background:rgba(40,110,180,.62);border:3px solid rgba(255,255,255,.75);text-shadow:none;letter-spacing:1px}
#touch .btn.on{background:rgba(70,150,230,.9);transform:scale(.95)}
#btnPush{right:40px;bottom:130px;width:200px;height:200px;font-size:34px}
#btnBrake{right:270px;bottom:110px;width:150px;height:150px;font-size:24px;background:rgba(190,80,70,.62)}
#btnBrake.on{background:rgba(220,100,90,.9)}
`;

export function createHud(root, { touch }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = document.createElement('div'); el.id = 'hud';
  const hintText = touch
    ? 'Hold <b>PUSH</b> to skate.<br>Steer with the stick.<br>Falling is part of learning!'
    : '<b>W / ↑</b> push &nbsp; <b>A D</b> steer &nbsp; <b>S / Space</b> brake<br>Drag to look around.<br>Falling is part of learning!';
  el.innerHTML =
    '<div id="speed" class="chip">0 km/h</div><div id="stats" class="chip"></div>' +
    '<div id="bal"><div>BALANCE</div><div id="balTrack"><div id="balFill"></div></div></div>' +
    '<div id="toast"></div><div id="hint">' + hintText + '</div><div id="respawn">↺ Respawn</div><div id="charBtn">☺ Character</div>';
  root.appendChild(el);
  const $ = (id) => el.querySelector('#' + id);
  const speedEl = $('speed'), statsEl = $('stats'), balEl = $('bal'), fillEl = $('balFill'), toastEl = $('toast'), hintEl = $('hint');
  let toastTimer = 0, hintTimer = 9, hintHidden = false;
  $('charBtn').addEventListener('click', () => el.dispatchEvent(new CustomEvent('character')));
  $('respawn').addEventListener('click', () => el.dispatchEvent(new CustomEvent('respawn')));

  function hideHint() { if (!hintHidden) { hintHidden = true; hintEl.classList.add('hide'); } }
  function toast(text, secs = 2.2) { toastEl.textContent = text; toastEl.classList.add('show'); toastTimer = secs; }
  function update(p, dt) {
    speedEl.textContent = Math.round(p.speed * 2.4) + ' km/h';
    statsEl.innerHTML = 'Falls ' + p.falls + '<br>' + Math.round(p.dist) + ' m';
    const b = p.b;
    fillEl.style.width = Math.round((1 - b) * 100) + '%';
    fillEl.style.background = b < 0.4 ? '#5fd38d' : b < 0.7 ? '#f2c94c' : '#eb5757';
    balEl.classList.toggle('shake', b > 0.7 && p.state === 'ok');
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toastEl.classList.remove('show'); }
    if (!hintHidden) { hintTimer -= dt; if (hintTimer <= 0) hideHint(); }
  }
  function destroy() { el.remove(); style.remove(); }
  return { el, update, toast, hideHint, destroy };
}
