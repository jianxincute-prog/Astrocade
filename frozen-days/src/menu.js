// Main menu over the live 3D scene: logo, Play / Continue, New Game (with confirmation), Settings and How to Play.
// The game owns what each button does; the menu only renders and reports choices.
const CSS = `
#menu{position:absolute;inset:0;z-index:40;display:none;pointer-events:none;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;text-align:center}
#menu::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(18,30,62,.62) 0%,rgba(18,30,62,0) 34%,rgba(18,30,62,0) 52%,rgba(18,30,62,.72) 100%)}
#menu .logo{position:absolute;left:0;right:0;top:120px;animation:mfloat 5s ease-in-out infinite}
@keyframes mfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
#menu .kick{font-size:22px;font-weight:700;letter-spacing:6px;opacity:.9;margin-bottom:8px;text-shadow:0 2px 8px rgba(10,20,50,.6)}
#menu .t1{font-size:74px;font-weight:300;letter-spacing:13px;line-height:1;text-transform:uppercase;text-shadow:0 4px 20px rgba(10,20,50,.55)}
#menu .t2{font-size:100px;font-weight:900;line-height:.95;letter-spacing:-1px;background:linear-gradient(180deg,#fff 30%,#cfe8ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 6px 0 #3b5f95) drop-shadow(0 10px 22px rgba(10,20,50,.5))}
#menu .stack{position:absolute;left:70px;right:70px;bottom:84px;pointer-events:auto}
#menu button{font-family:inherit;cursor:pointer;border:0;color:#fff}
#menu .play{display:block;width:100%;padding:24px 10px 20px;border-radius:36px;font-size:48px;font-weight:900;letter-spacing:1px;background:linear-gradient(180deg,#58b8ff,#2f86e8);box-shadow:0 8px 0 #1f62b0,0 14px 30px rgba(10,25,60,.45);transition:transform .08s}
#menu .play:active{transform:translateY(5px);box-shadow:0 3px 0 #1f62b0,0 8px 18px rgba(10,25,60,.45)}
#menu .play small{display:block;font-size:22px;font-weight:700;opacity:.92;letter-spacing:0;margin-top:2px}
#menu .row{display:flex;flex-wrap:wrap;gap:14px;margin-top:26px}
#menu .sec{flex:1 1 calc(50% - 7px);padding:18px 6px;border-radius:26px;font-size:26px;font-weight:800;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.4);backdrop-filter:blur(6px)}
#menu .sec:active{background:rgba(255,255,255,.34)}
#menu .ver{position:absolute;left:0;right:0;bottom:34px;font-size:20px;font-weight:600;opacity:.7}
#menu .ask{position:absolute;inset:0;display:none;pointer-events:auto;background:rgba(10,20,45,.6);backdrop-filter:blur(5px)}
#menu .ask .card{position:absolute;left:60px;right:60px;top:430px;padding:34px 30px 28px;border-radius:34px;background:rgba(240,246,252,.97);color:#1d3a5c}
#menu .ask h3{margin:0 0 10px;font-size:40px}
#menu .ask p{margin:0 0 22px;font-size:26px;font-weight:600;line-height:1.35}
#menu .ask .b{display:flex;gap:14px}
#menu .ask button{flex:1;padding:20px;border-radius:24px;font-size:28px;font-weight:800}
body #app.menuing #hud>*:not(#setp):not(#story),body #app.menuing #touch{display:none !important}
#menu .ask .no{background:#d6e3f1;color:#1d3a5c}#menu .ask .yes{background:#e0584f}
`;

export function createMenu(root, { onPlay, onNew, onSettings, onHow, onBoard }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = document.createElement('div'); el.id = 'menu';
  el.innerHTML =
    '<div class="logo"><div class="kick">❄ A COZY ICE-SKATING LIFE ❄</div><div class="t1">Winter</div><div class="t2">Skate Life</div></div>' +
    '<div class="stack"><button class="play" id="mPlay">Play<small id="mSub"></small></button>' +
    '<div class="row"><button class="sec" id="mBoard">🏆 Leaderboard</button><button class="sec" id="mSet">Settings</button><button class="sec" id="mNew">New Game</button><button class="sec" id="mHow">How to Play</button></div></div>' +
    '<div class="ver">v1.0</div>' +
    '<div class="ask" id="mAsk"><div class="card"><h3>Start a new game?</h3><p>Your current progress, outfits and friendships will be erased.</p><div class="b"><button class="no" id="mNo">Keep playing</button><button class="yes" id="mYes">Erase and restart</button></div></div></div>';
  root.appendChild(el);
  const $ = (id) => el.querySelector('#' + id);
  $('mPlay').addEventListener('click', () => onPlay());
  $('mSet').addEventListener('click', () => onSettings());
  $('mBoard').addEventListener('click', () => onBoard());
  $('mHow').addEventListener('click', () => onHow());
  $('mNew').addEventListener('click', () => { $('mAsk').style.display = 'block'; });
  $('mNo').addEventListener('click', () => { $('mAsk').style.display = 'none'; });
  $('mYes').addEventListener('click', () => { $('mAsk').style.display = 'none'; onNew(); });
  return {
    el,
    show(info) {
      const has = !!(info && info.hasSave);
      $('mPlay').firstChild.textContent = has ? 'Continue' : 'Play';
      $('mSub').textContent = has ? (info.line || '') : 'Begin your first winter';
      $('mSub').style.display = (has ? info.line : true) ? 'block' : 'none';
      $('mNew').style.display = has ? '' : 'none';
      $('mAsk').style.display = 'none';
      el.style.display = 'block'; root.classList.add('menuing');
    },
    hide() { el.style.display = 'none'; root.classList.remove('menuing'); },
    destroy() { el.remove(); style.remove(); root.classList.remove('menuing'); },
  };
}
