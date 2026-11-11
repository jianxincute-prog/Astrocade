// Loading screen shown before the main menu: dusk sky, drifting snow (CSS only, so it keeps moving while the world builds),
// the game logo, a progress bar and a rotating tip. Created before the heavy setup work starts.
const CSS = `
#loading{position:absolute;inset:0;z-index:100;overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;text-align:center;
 background:linear-gradient(180deg,#26385f 0%,#5a5f8f 38%,#d98f94 72%,#f6c09a 100%);transition:opacity .7s ease}
#loading.out{opacity:0;pointer-events:none}
#loading .hills{position:absolute;left:-10%;right:-10%;bottom:0;height:30%;background:radial-gradient(120% 100% at 30% 100%,#dfe8f4 0 55%,transparent 56%),radial-gradient(120% 100% at 80% 100%,#c6d4e8 0 50%,transparent 51%)}
#loading .pines{position:absolute;left:0;right:0;bottom:22%;height:90px;opacity:.9;background:
 linear-gradient(135deg,transparent 50%,#27405d 50%) 0 0/46px 70px repeat-x,linear-gradient(225deg,transparent 50%,#27405d 50%) 23px 0/46px 70px repeat-x;-webkit-mask-image:linear-gradient(180deg,#000,transparent);mask-image:linear-gradient(180deg,#000,transparent)}
#loading .flake{position:absolute;top:-20px;border-radius:50%;background:#fff;opacity:.85;animation:fall linear infinite;will-change:transform}
@keyframes fall{from{transform:translate3d(0,-30px,0)}to{transform:translate3d(var(--dx),1340px,0)}}
#loading .logo{position:absolute;left:0;right:0;top:220px}
#loading .kick{font-size:24px;font-weight:700;letter-spacing:6px;opacity:.85;margin-bottom:10px}
#loading .t1{font-size:84px;font-weight:300;letter-spacing:14px;line-height:1;text-transform:uppercase;text-shadow:0 4px 24px rgba(20,30,70,.45)}
#loading .t2{font-size:112px;font-weight:900;line-height:.95;letter-spacing:-1px;background:linear-gradient(180deg,#fff 30%,#cfe8ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 6px 0 #3b5f95) drop-shadow(0 10px 24px rgba(20,30,70,.45))}
#loading .bar{position:absolute;left:110px;right:110px;bottom:190px;height:18px;border-radius:10px;background:rgba(20,35,70,.45);overflow:hidden;box-shadow:inset 0 2px 6px rgba(0,0,0,.3)}
#loading .fill{height:100%;width:0;border-radius:10px;background:linear-gradient(90deg,#8fd3ff,#fff);transition:width .5s ease}
#loading .msg{position:absolute;left:0;right:0;bottom:228px;font-size:28px;font-weight:700;text-shadow:0 2px 8px rgba(20,30,70,.5)}
#loading .tip{position:absolute;left:70px;right:70px;bottom:96px;font-size:24px;font-weight:600;line-height:1.35;opacity:.92;text-shadow:0 2px 8px rgba(20,30,70,.5);min-height:66px}
`;
const TIPS = [
  'Tip: hold PUSH to build speed, ease off when you wobble.',
  'Tip: shops and the library have opening hours. Check the clock.',
  'Tip: friends give shop discounts as your friendship grows.',
  'Tip: a hot drink keeps you steady on the ice for a few minutes.',
  'Tip: every few days the town holds a market, and some nights a festival.',
  'Tip: sit on a bench next to a neighbour to make friends.',
];

export function createLoading(root) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = document.createElement('div'); el.id = 'loading';
  let flakes = '';
  for (let i = 0; i < 36; i++) {
    const s = 3 + Math.random() * 6, x = Math.random() * 100, d = 7 + Math.random() * 9, dl = -Math.random() * 14, dx = (Math.random() - 0.4) * 140;
    flakes += '<div class="flake" style="left:' + x.toFixed(1) + '%;width:' + s.toFixed(1) + 'px;height:' + s.toFixed(1) + 'px;animation-duration:' + d.toFixed(1) + 's;animation-delay:' + dl.toFixed(1) + 's;--dx:' + dx.toFixed(0) + 'px;opacity:' + (0.45 + s / 12).toFixed(2) + '"></div>';
  }
  el.innerHTML = flakes + '<div class="pines"></div><div class="hills"></div>' +
    '<div class="logo"><div class="kick">❄ A COZY ICE-SKATING LIFE ❄</div><div class="t1">Winter</div><div class="t2">Skate Life</div></div>' +
    '<div class="msg" id="ldMsg">Loading…</div><div class="bar"><div class="fill" id="ldFill"></div></div><div class="tip" id="ldTip"></div>';
  root.appendChild(el);
  const fill = el.querySelector('#ldFill'), msg = el.querySelector('#ldMsg'), tip = el.querySelector('#ldTip');
  let ti = Math.floor(Math.random() * TIPS.length); tip.textContent = TIPS[ti];
  const tipTimer = setInterval(() => { ti = (ti + 1) % TIPS.length; tip.textContent = TIPS[ti]; }, 3200);
  let gone = false;
  return {
    el,
    set(frac, text) { if (gone) return; fill.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%'; if (text) msg.textContent = text; },
    done() { if (gone) return; gone = true; clearInterval(tipTimer); fill.style.width = '100%'; msg.textContent = 'Ready!'; setTimeout(() => el.classList.add('out'), 250); setTimeout(() => { el.remove(); style.remove(); }, 1100); },
    destroy() { gone = true; clearInterval(tipTimer); el.remove(); style.remove(); },
  };
}
