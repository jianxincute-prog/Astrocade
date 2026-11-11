// DOM HUD and menus (start, help, pause, win). Layout targets the fixed 720×1280 portrait frame.
const CSS = `
#pr-ui{position:fixed;inset:0;z-index:5;font-family:"Trebuchet MS",system-ui,-apple-system,sans-serif;color:#24405c;user-select:none;-webkit-user-select:none;touch-action:none;overflow:hidden}
#pr-ui button{font-family:inherit;border:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent}
.pr-top{position:absolute;left:20px;top:20px;display:flex;gap:12px;align-items:center}
.pr-pill{background:rgba(255,255,255,.92);border-radius:40px;padding:10px 22px;font-size:36px;font-weight:900;box-shadow:0 5px 0 rgba(36,64,92,.18);display:flex;align-items:center;gap:8px;min-height:60px}
.pr-pill small{font-size:24px;opacity:.6}
.pr-level{position:absolute;left:20px;top:96px;background:rgba(42,111,176,.9);color:#fff;border-radius:30px;padding:6px 20px;font-size:28px;font-weight:900;box-shadow:0 4px 0 rgba(36,64,92,.25)}
.pr-level b{color:#ffe14a;margin-left:10px}
#pr-banner{position:absolute;left:0;right:0;top:300px;text-align:center;pointer-events:none;opacity:0}
#pr-banner.show{animation:prbanner 2.4s ease-out}
#pr-banner div{font-size:120px;line-height:1;font-weight:900;color:#ffe14a;text-shadow:0 8px 0 #c97a12,0 16px 0 rgba(36,64,92,.4);letter-spacing:3px}
#pr-banner span{display:block;margin-top:14px;font-size:60px;font-weight:900;color:#fff;text-shadow:0 5px 0 #24405c}
@keyframes prbanner{0%{opacity:0;transform:scale(.3) rotate(-6deg)}14%{opacity:1;transform:scale(1.12)}24%{transform:scale(1)}78%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.25)}}
.pr-total{font-size:34px;font-weight:900;color:#2a6fb0}
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
.pr-wallet{position:absolute;left:20px;top:20px}
.pr-rowbtn{display:flex;gap:20px}
.pr-rowbtn .pr-mid{min-width:230px}
#pr-shop{justify-content:flex-end;padding-bottom:60px;gap:18px;background:linear-gradient(rgba(30,60,95,0) 55%,rgba(30,60,95,.6))}
.pr-shop-title{position:absolute;left:0;right:0;top:120px;font-size:64px;font-weight:900;color:#fff;text-shadow:0 6px 0 #2a6fb0,0 12px 0 rgba(36,64,92,.35)}
.pr-shop-nav{display:flex;align-items:center;gap:16px;width:100%;justify-content:center}
.pr-arrow{width:110px;height:110px;border-radius:50%;background:#fff;color:#2a6fb0;font-size:54px;font-weight:900;box-shadow:0 8px 0 rgba(36,64,92,.3);flex:none}
.pr-shop-name{flex:1;max-width:400px;background:rgba(255,255,255,.95);border-radius:36px;padding:14px 10px;font-size:40px;font-weight:900;box-shadow:0 8px 0 rgba(36,64,92,.3)}
.pr-shop-name small{display:block;font-size:24px;opacity:.55;margin-top:2px}
#pr-shop-act.locked{background:#9fb1c2;box-shadow:0 12px 0 #72879a}
#pr-shop-act.used{background:#39b56a;box-shadow:0 12px 0 #23854a}
#pr-shop-act.shake{animation:prshake .35s}
@keyframes prshake{25%{transform:translateX(-14px)}50%{transform:translateX(14px)}75%{transform:translateX(-8px)}}
.pr-you{font-size:30px;font-weight:900;color:#2a6fb0;min-height:36px}
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
  <div class="pr-level">LEVEL <span id="pr-lv">1</span><b>⭐ <span id="pr-sum">0</span></b></div>
  <button class="pr-round" id="pr-pause" aria-label="Pause">⏸</button>
  <div id="pr-stick"><div id="pr-knob"></div></div>
  <button class="pr-act" id="pr-sled"><span>🛷</span>SLED</button>
  <button class="pr-act" id="pr-jump"><span>⬆</span>JUMP</button>
  <div id="pr-toast"></div>
  <div id="pr-banner"><div id="pr-banner-t"></div><span id="pr-banner-s"></span></div>
</div>
<div class="pr-screen" id="pr-menu">
  <div class="pr-pill pr-wallet">🐟 <span id="pr-wallet">0</span></div>
  <div class="pr-title">BALDY'S<b>PENGUIN RESCUE</b></div>
  <div class="pr-menu-bottom">
    <div class="pr-best" id="pr-best"></div>
    <button class="pr-big" id="pr-play">▶ PLAY</button>
    <div class="pr-rowbtn">
      <button class="pr-mid" id="pr-shop-open">🛷 SHOP</button>
      <button class="pr-mid" id="pr-board-open">🏆 TOP</button>
    </div>
    <button class="pr-mid" id="pr-how">❓ HOW TO PLAY</button>
  </div>
</div>
<div class="pr-screen" id="pr-shop">
  <div class="pr-pill pr-wallet">🐟 <span id="pr-shop-fish">0</span></div>
  <div class="pr-shop-title">SLED SHOP</div>
  <div class="pr-shop-nav">
    <button class="pr-arrow" id="pr-shop-prev" aria-label="Previous">◀</button>
    <div class="pr-shop-name"><span id="pr-shop-name"></span><small id="pr-shop-pos"></small></div>
    <button class="pr-arrow" id="pr-shop-next" aria-label="Next">▶</button>
  </div>
  <button class="pr-big" id="pr-shop-act"></button>
  <button class="pr-mid" id="pr-shop-back">◀ BACK</button>
</div>
<div class="pr-screen pr-dim" id="pr-board">
  <div class="pr-card">
    <h2>🏆 Top rescuers</h2>
    <div class="pr-lb" id="pr-board-list"></div>
    <div class="pr-you" id="pr-board-you"></div>
    <button class="pr-big" id="pr-board-back">OK!</button>
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
    <h2 id="pr-wtitle">Level 1 done!</h2>
    <div class="pr-stars" id="pr-stars"><span>⭐</span><span>⭐</span><span>⭐</span></div>
    <div class="pr-stat"><div>⏱ <span id="pr-wtime"></span></div><div>🐟 <span id="pr-wfish"></span></div></div>
    <div class="pr-score" id="pr-wscore"></div>
    <div class="pr-total">TOTAL ⭐ <span id="pr-wtotal"></span></div>
    <div class="pr-lb" id="pr-lb"></div>
    <button class="pr-big" id="pr-next">NEXT ▶</button>
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
  const screens = ['pr-menu', 'pr-help', 'pr-paused', 'pr-win', 'pr-shop', 'pr-board'];
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
    setBest(best, level) {
      $('pr-best').textContent = best > 0 ? `🏆 BEST ${best}` : '';
      $('pr-play').textContent = level > 1 ? `▶ LEVEL ${level}` : '▶ PLAY';
    },
    setLevel(level, total) { $('pr-lv').textContent = level; $('pr-sum').textContent = total; },
    banner(title, sub) {
      const b = $('pr-banner'); $('pr-banner-t').textContent = title; $('pr-banner-s').textContent = sub;
      b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    },
    setMute(muted) { $('pr-mute').textContent = muted ? '🔇 SOUND OFF' : '🔊 SOUND ON'; },
    showWin({ level, stars, time, fish, fishTotal, score, total }) {
      $('pr-wtitle').textContent = `Level ${level} done!`; $('pr-wtotal').textContent = total;
      const m = Math.floor(time / 60), s = Math.floor(time % 60);
      $('pr-wtime').textContent = `${m}:${String(s).padStart(2, '0')}`;
      $('pr-wfish').textContent = `${fish}/${fishTotal}`;
      $('pr-wscore').textContent = `+${score}`;
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
    setWallet(fish) { $('pr-wallet').textContent = fish; $('pr-shop-fish').textContent = fish; },
    setShop({ name, price, owned, active, fish, index, count }) {
      $('pr-shop-name').textContent = name; $('pr-shop-pos').textContent = `${index + 1} / ${count}`; hud.setWallet(fish);
      const b = $('pr-shop-act');
      b.textContent = active ? '✔ IN USE' : owned ? 'USE' : `BUY 🐟 ${price}`;
      b.classList.toggle('used', active); b.classList.toggle('locked', !owned && fish < price);
    },
    shopShake() { const b = $('pr-shop-act'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); },
    showBoard(entries, rank) {
      const box = $('pr-board-list'); box.innerHTML = ''; $('pr-board-you').textContent = '';
      const line = (left, right) => { const row = document.createElement('div'), a = document.createElement('span'), b = document.createElement('span'); a.textContent = left; b.textContent = right; row.append(a, b); box.appendChild(row); };
      if (!entries) line('Loading…', '');
      else if (!entries.length) line('No scores yet', '');
      else entries.slice(0, 10).forEach((e, i) => line(`${i + 1}. ${e.username || 'Player'}`, e.score));
      if (rank) $('pr-board-you').textContent = `You: #${rank}`;
      hud.show('board');
    },
    dispose() { clearTimeout(toastTimer); root.remove(); style.remove(); },
  };

  click('pr-play', () => handlers.play());
  click('pr-shop-open', () => handlers.shop());
  click('pr-shop-prev', () => handlers.shopNav(-1));
  click('pr-shop-next', () => handlers.shopNav(1));
  click('pr-shop-act', () => handlers.shopAct());
  click('pr-shop-back', () => handlers.shopBack());
  click('pr-board-open', () => handlers.board());
  click('pr-board-back', () => hud.show('menu'));
  click('pr-how', () => { helpBack = 'menu'; hud.show('help'); });
  click('pr-how2', () => { helpBack = 'paused'; hud.show('help'); });
  click('pr-help-ok', () => hud.show(helpBack || 'menu'));
  click('pr-pause', () => handlers.pause());
  click('pr-resume', () => handlers.resume());
  click('pr-mute', () => handlers.mute());
  click('pr-restart', () => handlers.restart());
  click('pr-next', () => handlers.next());
  return hud;
}
