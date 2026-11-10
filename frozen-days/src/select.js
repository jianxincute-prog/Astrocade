// Character select overlay: pick Male / Female, toggle face close-up, start skating.
const CSS = `
#sel{position:absolute;inset:0;pointer-events:none;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;text-shadow:0 2px 8px rgba(15,35,65,.6)}
#sel .title{position:absolute;left:0;right:0;top:48px;text-align:center;font-size:44px;font-weight:800;letter-spacing:1px}
#sel .sub{position:absolute;left:0;right:0;top:108px;text-align:center;font-size:24px;font-weight:600;opacity:.9}
#sel .panel{position:absolute;left:30px;right:30px;bottom:44px;padding:24px;border-radius:34px;background:rgba(20,45,80,.55);backdrop-filter:blur(8px);pointer-events:auto;text-align:center;text-shadow:none}
#sel .row{display:flex;gap:18px;justify-content:center}
#sel .pick{flex:1;padding:22px 8px;border-radius:26px;font-size:32px;font-weight:800;background:rgba(255,255,255,.16);border:3px solid rgba(255,255,255,.35);color:#fff;cursor:pointer}
#sel .pick.on{background:#fff;color:#1d4a75;border-color:#fff}
#sel .small{margin-top:16px;display:inline-block;padding:12px 26px;border-radius:22px;font-size:24px;font-weight:700;background:rgba(255,255,255,.16);border:2px solid rgba(255,255,255,.35);cursor:pointer}
#sel .go{margin-top:18px;padding:26px;border-radius:30px;font-size:38px;font-weight:900;background:#3fa7ff;color:#fff;border:0;width:100%;cursor:pointer;letter-spacing:1px}
.selecting #hud,.selecting #touch{display:none !important}
`;
export function createSelect(root, { kinds, labels, current, onPick, onZoom, onStart }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = document.createElement('div'); el.id = 'sel';
  el.innerHTML =
    '<div class="title">Choose your skater</div><div class="sub">Pick a look, then hit the ice</div>' +
    '<div class="panel"><div class="row">' + kinds.map((k) => '<button class="pick" data-k="' + k + '">' + labels[k] + '</button>').join('') +
    '</div><div class="small" id="zoomBtn">Face close-up</div><button class="go" id="goBtn">Start Skating</button></div>';
  root.appendChild(el);
  const picks = [...el.querySelectorAll('.pick')];
  const mark = (k) => picks.forEach((b) => b.classList.toggle('on', b.dataset.k === k));
  mark(current);
  picks.forEach((b) => b.addEventListener('click', () => { mark(b.dataset.k); onPick(b.dataset.k); }));
  let zoom = false; const zb = el.querySelector('#zoomBtn');
  zb.addEventListener('click', () => { zoom = !zoom; zb.textContent = zoom ? 'Full body' : 'Face close-up'; onZoom(zoom); });
  el.querySelector('#goBtn').addEventListener('click', () => onStart());
  return {
    el, mark,
    show() { el.style.display = 'block'; root.classList.add('selecting'); zoom = false; zb.textContent = 'Face close-up'; },
    hide() { el.style.display = 'none'; root.classList.remove('selecting'); },
    destroy() { el.remove(); style.remove(); root.classList.remove('selecting'); },
  };
}
