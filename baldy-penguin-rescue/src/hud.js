// DOM HUD and menus (start, help, pause, win). Layout targets the fixed 720×1280 portrait frame.
const CSS = `
#pr-ui{position:fixed;inset:0;z-index:5;font-family:"Trebuchet MS",system-ui,-apple-system,sans-serif;color:#24405c;user-select:none;-webkit-user-select:none;touch-action:none;overflow:hidden}
#pr-ui button{font-family:inherit;border:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent}
.pr-top{position:absolute;left:20px;top:20px;display:flex;gap:12px;align-items:center}
.pr-pill{background:rgba(255,255,255,.92);border-radius:40px;padding:10px 22px;font-size:36px;font-weight:900;box-shadow:0 5px 0 rgba(36,64,92,.18);display:flex;align-items:center;gap:8px;min-height:60px}
.pr-pill small{font-size:24px;opacity:.6}
.pr-follow{background:#38d6ff;color:#fff;transition:transform .2s}
.pr-follow.hide{transform:scale(0)}
.pr-round{position:absolute;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.92);font-size:44px;box-shadow:0 5px 0 rgba(36,64,92,.18);color:#24405c}
#pr-pause{right:20px;top:20px}
#pr-stick{position:absolute;left:0;top:0;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.28);border:5px solid rgba(255,255,255,.7);transform:translate(50px,970px);box-sizing:border-box;pointer-events:none}
#pr-stick.live{background:rgba(255,255,255,.4)}
#pr-knob{position:absolute;left:55px;top:55px;width:100px;height:100px;border-radius:50%;background:#fff;box-shadow:0 5px 0 rgba(36,64,92,.25)}
.pr-act{position:absolute;border-radius:50%;color:#fff;font-weight:900;font-size:30px;letter-spacing:1px;box-shadow:0 8px 0 rgba(0,0,0,.2);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.pr-act span{font-size:56px;line-height:1.1}
.pr-act.down{transform:translateY(6px);box-shadow:0 2px 0 rgba(0,0,0,.2)}
#pr-jump{right:36px;bottom:110px;width:170px;height:170px;background:#ff8a3c}
#pr-sled{right:216px;bottom:60px;width:140px;height:140px;background:#3fa9f5;font-size:24px}
#pr-sled::before{content:"";position:absolute;inset:-9px;border-radius:50%;background:conic-gradient(#ffe14a calc(var(--e,1)*360deg),rgba(255,255,255,.35) 0);z-index:-1}
#pr-sled.empty{background:#8fb4cf}
#pr-toast{position:absolute;left:0;right:0;top:250px;text-align:center;font-size:58px;font-weight:900;color:#fff;text-shadow:0 5px 0 #24405c,0 0 18px rgba(36,64,92,.6);pointer-events:none;opacity:0}
#pr-toast.show{animation:prpop 1.5s ease-out}
@keyframes prpop{0%{opacity:0;transform:scale(.4)}15%{opacity:1;transform:scale(1.15)}25%{transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:translateY(-40px)}}
.pr-screen{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:26px;padding:40px;box-sizing:border-box;text-align:center}
.pr-screen.on{display:flex}
.pr-dim{background:rgba(30,60,95,.55)}
#pr-menu{justify-content:flex-start;padding-top:110px;background:linear-gradient(rgba(191,228,248,.0) 40%,rgba(30,60,95,.45))}
.pr-title{font-size:92px;line-height:.95;font-weight:900;color:#fff;text-shadow:0 7px 0 #2a6fb0,0 14px 0 rgba(36,64,92,.35);letter-spacing:1px}
.pr-title b{display:block;font-size:64px;color:#ffe14a;text-shadow:0 6px 0 #c97a12,0 12px 0 rgba(36,64,92,.35)}
.pr-big{min-width:380px;min-height:130px;border-radius:70px;background:#ff8a3c;color:#fff;font-size:60px;font-weight:900;box-shadow:0 12px 0 #c95f1a;letter-spacing:2px;padding:0 50px}
.pr-big:active{transform:translateY(8px);box-shadow:0 4px 0 #c95f1a}
.pr-mid{min-width:300px;min-height:100px;border-radius:55px;background:#fff;color:#24405c;font-size:38px;font-weight:900;box-shadow:0 8px 0 rgba(36,64,92,.3);padding:0 36px}
.pr-card{background:#fff;border-radius:44px;padding:36px 40px;width:580px;box-sizing:border-box;box-shadow:0 12px 0 rgba(36,64,92,.3);display:flex;flex-direction:column;gap:18px;align-items:center}
.pr-card h2{margin:0;font-size:54px;color:#2a6fb0}
.pr-row{display:flex;align-items:center;gap:22px;font-size:34px;font-weight:800;text-align:left;width:100%}
.pr-row i{font-style:normal;font-size:60px;width:84px;text-align:center;flex:none}
.pr-menu-bottom{margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:24px;padding-bottom:70px}
.pr-best{font-size:34px;font-weight:900;color:#fff;text-shadow:0 3px 0 #24405c;min-height:40px}
.pr-stars{font-size:110px;letter-spacing:8px;line-height:1}
.pr-stars span{display:inline-block;filter:grayscale(1);opacity:.3;transform:scale(.8);transition:all .4s}
.pr-stars span.on{filter:none;opacity:1;transform:scale(1)}
.pr-stat{display:flex;justify-content:space-around;width:100%;font-size:40px;font-weight:900}
.pr-score{font-size:76px;font-weight:900;color:#ff8a3c;line-height:1}
.pr-lb{width:100%;font-size:28px;font-weight:800;display:flex;flex-direction:column;gap:6px}
.pr-lb div{display:flex;justify-content:space-between;background:#eef6fd;border-radius:16px;padding:6px 18px}
.pr-lb div span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:340px}
#pr-edit{position:absolute;left:0;right:0;bottom:60px;text-align:center;font-size:34px;font-weight:900;color:#fff;text-shadow:0 3px 0 #24405c;pointer-events:none}
.pr-hud{display:none}.pr-hud.on{display:block}
`;

const HTML = `
<div class="pr-hud" id="pr-hud">
  <div class="pr-top">
    <div class="pr-pill">🏠 <span id="pr-home">0</span><small>/<span id="pr-total">0</span></small></div>
    <div class="pr-pill">🐟 <span id="pr-fish">0</span></div>
    <div class="pr-pill pr-follow hide" id="pr-follow">🐧×<span id="pr-chain">0</span></div>
  </div>
  <button class="pr-round" id="pr-pause" aria-label="Pause">⏸</button>
  <div id="pr-stick"><div id="pr-knob"></div></div>
  <button class="pr-act" id="pr-sled"><span>🛷</span>SLED</button>
  <button class="pr-act" id="pr-jump"><span>⬆</span>JUMP</button>
  <div id="pr-toast"></div>
</div>
<div class="pr-screen" id="pr-menu">
  <div class="pr-title">BALDY'S<b>PENGUIN RESCUE</b></div>
  <div class="pr-menu-bottom">
    <div class="pr-best" id="pr-best"></div>
    <button class="pr-big" id="pr-play">▶ PLAY</button>
    <button class="pr-mid" id="pr-how">❓ HOW TO PLAY</button>
  </div>
</div>
<div class="pr-screen pr-dim" id="pr-help">
  <div class="pr-card">
    <h2>How to play</h2>
    <div class="pr-row"><i>🐧</i>Find the lost baby penguins under the blue lights.</div>
    <div class="pr-row"><i>🏠</i>Lead them home to the igloo with the orange light.</div>
    <div class="pr-row"><i>🐟</i>Grab golden fish for more stars and sled power.</div>
    <div class="pr-row"><i>🌪️</i>Jump over snow whirlies or the penguins scatter!</div>
    <button class="pr-big" id="pr-help-ok">OK!</button>
  </div>
</div>
<div class="pr-screen pr-dim" id="pr-paused">
  <div class="pr-card">
    <h2>Paused</h2>
    <button class="pr-big" id="pr-resume">▶ PLAY</button>
    <button class="pr-mid" id="pr-mute">🔊 SOUND ON</button>
    <button class="pr-mid" id="pr-how2">❓ HOW TO PLAY</button>
    <button class="pr-mid" id="pr-restart">↻ START OVER</button>
  </div>
</div>
<div class="pr-screen pr-dim" id="pr-win">
  <div class="pr-card">
    <h2>Everyone is home!</h2>
    <div class="pr-stars" id="pr-stars"><span>⭐</span><span>⭐</span><span>⭐</span></div>
    <div class="pr-stat"><div>⏱ <span id="pr-wtime"></span></div><div>🐟 <span id="pr-wfish"></span></div></div>
    <div class="pr-score" id="pr-wscore"></div>
    <div class="pr-lb" id="pr-lb"></div>
    <button class="pr-big" id="pr-again">↻ AGAIN</button>
  </div>
</div>
<div id="pr-edit" style="display:none">Tap the snow to move the igloo</div>
`;

export function createHud(handlers) {
  document.getElementById('pr-ui')?.remove();
  document.getElementById('pr-css')?.remove();
  const style = document.createElement('style'); style.id = 'pr-css'; style.textContent = CSS; document.head.appendChild(style);
  const root = document.createElement('div'); root.id = 'pr-ui'; root.innerHTML = HTML; document.body.appendChild(root);
  const $ = id => root.querySelector('#' + id);
  const screens = ['pr-menu', 'pr-help', 'pr-paused', 'pr-win'];
  let helpBack = null, toastTimer = 0;
  const click = (id, fn) => $(id).addEventListener('click', () => { handlers.tap?.(); fn(); });

  const hud = {
    root,
    buttons: { jump: $('pr-jump'), sled: $('pr-sled'), stickBase: $('pr-stick'), stickKnob: $('pr-knob') },
    show(name) {
      screens.forEach(s => $(s).classList.toggle('on', s === 'pr-' + name));
      $('pr-hud').classList.toggle('on', name === 'play' || name === 'paused');
      hud.current = name;
    },
    editMode() { screens.forEach(s => $(s).classList.remove('on')); $('pr-edit').style.display = 'block'; },
    setCounts(home, total, chain) {
      $('pr-home').textContent = home; $('pr-total').textContent = total; $('pr-chain').textContent = chain;
      $('pr-follow').classList.toggle('hide', chain === 0);
    },
    setFish(n) { $('pr-fish').textContent = n; },
    setEnergy(e, canSled) { const b = $('pr-sled'); b.style.setProperty('--e', e.toFixed(2)); b.classList.toggle('empty', !canSled); },
    toast(text) {
      const t = $('pr-toast'); t.textContent = text; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1500);
    },
    setBest(best) { $('pr-best').textContent = best > 0 ? `🏆 BEST ${best}` : ''; },
    setMute(muted) { $('pr-mute').textContent = muted ? '🔇 SOUND OFF' : '🔊 SOUND ON'; },
    showWin({ stars, time, fish, fishTotal, score }) {
      const m = Math.floor(time / 60), s = Math.floor(time % 60);
      $('pr-wtime').textContent = `${m}:${String(s).padStart(2, '0')}`;
      $('pr-wfish').textContent = `${fish}/${fishTotal}`;
      $('pr-wscore').textContent = score;
      $('pr-lb').innerHTML = '';
      const spans = $('pr-stars').children;
      for (let i = 0; i < 3; i++) { spans[i].classList.remove('on'); if (i < stars) setTimeout(() => spans[i].classList.add('on'), 350 + i * 350); }
      hud.show('win');
    },
    setLeaderboard(entries) {
      const box = $('pr-lb'); box.innerHTML = '';
      (entries || []).slice(0, 3).forEach((e, i) => {
        const row = document.createElement('div'), a = document.createElement('span'), b = document.createElement('span');
        a.textContent = `${i + 1}. ${e.username || 'Player'}`; b.textContent = e.score; row.append(a, b); box.appendChild(row);
      });
    },
    dispose() { clearTimeout(toastTimer); root.remove(); style.remove(); },
  };

  click('pr-play', () => handlers.play());
  click('pr-how', () => { helpBack = 'menu'; hud.show('help'); });
  click('pr-how2', () => { helpBack = 'paused'; hud.show('help'); });
  click('pr-help-ok', () => hud.show(helpBack || 'menu'));
  click('pr-pause', () => handlers.pause());
  click('pr-resume', () => handlers.resume());
  click('pr-mute', () => handlers.mute());
  click('pr-restart', () => handlers.restart());
  click('pr-again', () => handlers.restart());
  return hud;
}
