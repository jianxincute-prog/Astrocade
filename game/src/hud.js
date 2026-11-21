// HUD: stage overlay (order card, score, banner, shine meter) and the bottom half (3 slots, 12 cards, buttons).
// Every interactive element is at least 96x96 px. All text comes from cfg.strings (with English fallbacks).
import { INGREDIENTS, ingredientName } from './ingredients.js';

const DEFAULT_STRINGS = {
  order: 'ORDER', score: 'SCORE', tap: 'TAP!', flame: 'FLAME! TAP FAST!', golden: 'GOLDEN ORDER',
  tags: { new: 'NEW RECIPE!', order: 'ORDER DONE!', perfect: 'PERFECT!', surprise: 'FLAME BONUS!', golden: 'GOLDEN x3' },
  unlocked: 'NEW INGREDIENTS!',
  help: ['Pick 3 ingredients', 'Tap while it cooks', 'Serve and find secret recipes'],
};
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

const CSS = `
#hud .slot{position:absolute;top:24px;width:150px;height:150px;border-radius:24px;box-sizing:border-box;background:#fff7f0;
  border:4px dashed #ffb5a7;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;
  color:#4a3b36;font:700 18px system-ui,sans-serif;user-select:none;-webkit-tap-highlight-color:transparent}
#hud .slot.full{border-style:solid;border-color:#fff;background:#fff3e6;box-shadow:0 5px 0 rgba(0,0,0,.12)}
#hud .slot .sw{width:64px;height:64px;border-radius:16px;border:4px solid rgba(0,0,0,.14);margin-bottom:8px}
#hud .slot .x{position:absolute;top:6px;right:10px;font-size:26px;color:#e07a7a}
#hud .slot.pop{animation:pop .28s cubic-bezier(.3,1.8,.5,1)}
#hud .slot.glow{border-style:solid;border-color:#ffd24a;animation:glow 1s ease-in-out infinite}
#hud .card{position:absolute;width:96px;height:96px;border-radius:20px;box-sizing:border-box;border:4px solid #fff;background:#fff3e6;
  box-shadow:0 4px 0 rgba(0,0,0,.12);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:6px;
  color:#4a3b36;font:700 15px system-ui,sans-serif;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
#hud .card i{position:absolute;top:10px;left:50%;width:44px;height:44px;margin-left:-22px;border-radius:12px;border:3px solid rgba(0,0,0,.14)}
#hud .card .k{position:absolute;top:2px;left:6px;font-size:12px;opacity:.55}
#hud .card.locked{filter:grayscale(1);opacity:.4;cursor:default}
#hud .card.picked,#hud .card.off{opacity:.45;cursor:default}
#hud .card.fresh{animation:glow 0.6s ease-in-out 4}
#hud .card.guide{border-color:#ffd24a;animation:glow .9s ease-in-out infinite}
#hud .btn{position:absolute;top:460px;width:96px;height:96px;border-radius:24px;box-sizing:border-box;border:4px solid #fff;
  background:#ffe9d9;box-shadow:0 4px 0 rgba(0,0,0,.12);font-size:40px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
#hud .btn.on{background:#ffd24a}
#hud .btn.hidden{visibility:hidden}
#overlay{position:absolute;left:0;top:0;width:720px;height:640px;pointer-events:none;font-family:system-ui,sans-serif;color:#4a3b36}
#overlay .order{position:absolute;left:16px;top:14px;width:330px;box-sizing:border-box;background:rgba(255,255,255,.92);border-radius:20px;
  padding:10px 14px;box-shadow:0 4px 0 rgba(0,0,0,.1);border:4px solid #fff}
#overlay .order.golden{border-color:#ffd24a;background:#fff9dc}
#overlay .order .lab{font:700 13px system-ui;letter-spacing:.08em;opacity:.6}
#overlay .order .nm{font:800 22px/1.15 system-ui;margin:2px 0 8px}
#overlay .order .hints{display:flex;gap:8px}
#overlay .order .h{width:48px;height:48px;border-radius:12px;border:3px solid rgba(0,0,0,.14);display:flex;align-items:center;justify-content:center;
  font:800 24px system-ui;background:#f3e5da}
#overlay .order .bar{height:8px;border-radius:4px;background:#f0e2b0;margin-top:8px;overflow:hidden}
#overlay .order .bar b{display:block;height:100%;width:100%;background:#ffb300;transform-origin:left}
#overlay .score{position:absolute;right:16px;top:14px;text-align:right;font:800 30px system-ui;text-shadow:0 2px 0 #fff}
#overlay .score small{display:block;font:700 13px system-ui;letter-spacing:.08em;opacity:.6}
#overlay .combo{font:800 24px system-ui;color:#e8590c;min-height:30px}
#overlay .banner{position:absolute;left:50%;top:478px;transform:translateX(-50%) scale(.8);opacity:0;text-align:center;min-width:360px;
  background:rgba(255,255,255,.95);border-radius:24px;padding:14px 22px;box-shadow:0 6px 0 rgba(0,0,0,.12);transition:all .25s cubic-bezier(.3,1.6,.5,1)}
#overlay .banner.show{opacity:1;transform:translateX(-50%) scale(1)}
#overlay .banner .t{font:800 26px/1.1 system-ui}
#overlay .banner .p{font:800 40px system-ui;color:#2b9348}
#overlay .banner .g{font:800 17px system-ui;color:#e8590c;letter-spacing:.04em}
#overlay .shine{position:absolute;left:210px;top:572px;width:300px;opacity:0;transition:opacity .2s;text-align:center}
#overlay .shine.show{opacity:1}
#overlay .shine .tp{font:800 30px system-ui;color:#fff;text-shadow:0 3px 0 #e8590c;animation:bob .5s ease-in-out infinite}
#overlay .shine .meter{height:18px;border-radius:9px;background:rgba(255,255,255,.75);overflow:hidden;border:3px solid #fff}
#overlay .shine .meter b{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffd24a,#ff922b)}
#overlay .flame{position:absolute;left:0;width:720px;top:120px;text-align:center;font:800 34px system-ui;color:#fff;text-shadow:0 3px 0 #1c7ed6;
  opacity:0;transition:opacity .15s}
#overlay .flame.show{opacity:1;animation:bob .35s ease-in-out infinite}
#help{position:absolute;left:0;top:0;width:720px;height:1280px;background:rgba(43,36,48,.82);display:none;align-items:center;justify-content:center;
  flex-direction:column;gap:26px;z-index:10;color:#fff;font:800 34px system-ui;text-align:center;cursor:pointer}
#help.show{display:flex}
#help .st{background:rgba(255,255,255,.14);border-radius:24px;padding:22px 34px;min-width:480px}
@keyframes pop{0%{transform:scale(.6)}100%{transform:scale(1)}}
@keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(255,210,74,.0)}50%{box-shadow:0 0 22px 8px rgba(255,210,74,.9)}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
`;

export function createHud({ hudEl, stageEl, appEl, cfg, touch, handlers }) {
  const st = { ...DEFAULT_STRINGS, ...(cfg.strings || {}), tags: { ...DEFAULT_STRINGS.tags, ...((cfg.strings && cfg.strings.tags) || {}) } };
  hudEl.innerHTML = '';
  const old = document.getElementById('overlay'); if (old) old.remove();
  const oldHelp = document.getElementById('help'); if (oldHelp) oldHelp.remove();
  const css = el('style', '', hudEl); css.textContent = CSS;

  // ---- bottom half ----
  const slotEls = [0, 1, 2].map((i) => {
    const s = el('div', 'slot', hudEl);
    s.style.left = 111 + i * 174 + 'px';
    s.addEventListener('pointerdown', (e) => { e.preventDefault(); handlers.onUndo(i); });
    return s;
  });
  const cardEls = {};
  INGREDIENTS.forEach((ing, i) => {
    const c = el('div', 'card locked', hudEl, '<i style="background:' + ing.color + '"></i>' + ingredientName(cfg, ing.id)
      + (touch ? '' : '<span class="k">' + KEYS[i] + '</span>'));
    c.style.left = 32 + (i % 6) * 112 + 'px'; c.style.top = 210 + Math.floor(i / 6) * 112 + 'px';
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); handlers.onPick(ing.id); });
    cardEls[ing.id] = c;
  });
  let guideId = null;
  const mkBtn = (left, glyph, fn) => { const b = el('div', 'btn', hudEl, glyph); b.style.left = left + 'px'; b.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); }); return b; };
  const bSound = mkBtn(32, '&#128266;', handlers.onMute);
  const bFast = mkBtn(160, '&#9193;', handlers.onFast);
  const bHelp = mkBtn(288, '&#10067;', handlers.onHelp);
  const bAgain = mkBtn(592, '&#8635;', handlers.onAgain); bAgain.classList.add('hidden');

  // ---- stage overlay ----
  const ov = el('div', '', stageEl); ov.id = 'overlay';
  const orderEl = el('div', 'order', ov); orderEl.style.display = 'none';
  const scoreEl = el('div', 'score', ov, '<small>' + st.score + '</small><span class="v">0</span><div class="combo"></div>');
  const banner = el('div', 'banner', ov);
  const shine = el('div', 'shine', ov, '<div class="tp">' + st.tap + '</div><div class="meter"><b></b></div>');
  const flame = el('div', 'flame', ov, st.flame);
  stageEl.addEventListener('pointerdown', () => handlers.onTap());

  const help = el('div', '', appEl); help.id = 'help';
  st.help.forEach((t, i) => el('div', 'st', help, (i + 1) + '. ' + t));
  help.addEventListener('pointerdown', () => help.classList.remove('show'));

  let bannerTimer = 0;
  const ui = {
    setSlots(items, glowIdx, popIdx) {
      items.forEach((ing, i) => {
        const s = slotEls[i];
        s.className = 'slot' + (ing ? ' full' : '') + (i === glowIdx ? ' glow' : '');
        s.innerHTML = ing ? '<span class="x">&#10005;</span><div class="sw" style="background:' + ing.color + '"></div>' + ingredientName(cfg, ing.id) : '';
        if (i === popIdx) { void s.offsetWidth; s.classList.add('pop'); }
      });
    },
    setCards({ unlocked, picked, enabled }) {
      INGREDIENTS.forEach((ing) => {
        const c = cardEls[ing.id];
        const keepFresh = c.classList.contains('fresh');
        c.className = 'card' + (unlocked.has(ing.id) ? '' : ' locked') + (picked.has(ing.id) ? ' picked' : '') + (!enabled && unlocked.has(ing.id) ? ' off' : '') + (keepFresh ? ' fresh' : '') + (ing.id === guideId ? ' guide' : '');
      });
    },
    // First-order guide: pulse the card the player should pick next.
    setArrow(id) {
      guideId = id;
      INGREDIENTS.forEach((ing) => cardEls[ing.id].classList.toggle('guide', ing.id === id));
    },
    setAgain(on) { bAgain.classList.toggle('hidden', !on); },
    setOrder(o) {
      if (!o) { orderEl.style.display = 'none'; return; }
      orderEl.style.display = 'block';
      orderEl.className = 'order' + (o.golden ? ' golden' : '');
      const hints = o.shown.map((id) => '<div class="h" style="background:' + INGREDIENTS.find((x) => x.id === id).color + '"></div>').join('')
        + '<div class="h">?</div>'.repeat(o.hidden);
      orderEl.innerHTML = '<div class="lab">' + (o.golden ? '&#9733; ' + st.golden : st.order) + '</div><div class="nm">' + o.name + '</div><div class="hints">' + hints + '</div>'
        + (o.golden ? '<div class="bar"><b></b></div>' : '');
    },
    setGolden(frac) {
      const b = orderEl.querySelector('.bar b');
      if (b) b.style.transform = 'scaleX(' + (frac === null ? 0 : Math.max(0, frac)) + ')';
    },
    setGlow(v) { shine.querySelector('.meter b').style.width = v + '%'; },
    showTap(on) { shine.classList.toggle('show', on); if (!on) ui.setGlow(0); },
    setSurprise(on) { flame.classList.toggle('show', on); },
    showBanner({ name, points, tags }) {
      banner.innerHTML = '<div class="t">' + name + '</div><div class="p">+' + points + '</div>'
        + (tags.length ? '<div class="g">' + tags.map((t) => st.tags[t]).join(' &middot; ') + '</div>' : '');
      banner.classList.add('show');
      clearTimeout(bannerTimer);
    },
    hideBanner() { banner.classList.remove('show'); },
    flashUnlock(ids) {
      ids.forEach((id) => { cardEls[id].classList.add('fresh'); setTimeout(() => cardEls[id].classList.remove('fresh'), 2600); });
      banner.innerHTML = '<div class="t">' + st.unlocked + '</div>'; banner.classList.add('show');
      bannerTimer = setTimeout(() => banner.classList.remove('show'), 1800);
    },
    setScore(score, combo) {
      scoreEl.querySelector('.v').textContent = String(score).padStart(5, '0');
      scoreEl.querySelector('.combo').textContent = combo > 1 ? 'x' + combo + ' 🔥' : '';
    },
    setFast(on) { bFast.classList.toggle('on', on); },
    setMuted(m) { bSound.innerHTML = m ? '&#128263;' : '&#128266;'; },
    showHelp() { help.classList.add('show'); },
    cardIndexForKey(key) { return KEYS.indexOf(key); },
  };
  return ui;
}
