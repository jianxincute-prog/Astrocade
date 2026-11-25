// DOM UI: HUD, touch/keyboard input, menus, talent draw, bag/craft, settings, language, leaderboard, ending.
import { t, itemName, itemIcon, cfg, LANGS, getLang, isRTL } from './util.js';
import { sfx } from './audio.js';

const CSS = `
#ui{font-weight:700;text-shadow:0 2px 0 rgba(0,0,0,.35)}
#ui .abs{position:absolute}
#ui .btn{pointer-events:auto;cursor:pointer;border:3px solid rgba(255,255,255,.55);background:rgba(10,60,95,.75);color:#fff;border-radius:22px;font:inherit;font-size:34px;min-width:96px;min-height:96px;display:flex;align-items:center;justify-content:center;gap:10px;padding:0 24px;touch-action:none;box-shadow:0 6px 0 rgba(0,0,0,.35)}
#ui .btn:active,#ui .btn.down{transform:translateY(4px);box-shadow:0 2px 0 rgba(0,0,0,.35);filter:brightness(1.2)}
#ui .btn.main{background:linear-gradient(#ffd166,#f59f1b);color:#3a2300;text-shadow:none;border-color:#fff3c4;font-size:48px;min-height:120px;min-width:420px;font-weight:900}
#ui .btn.round{border-radius:50%;padding:0;font-size:46px}
#ui .btn.off{opacity:.35;filter:grayscale(.8)}
#hud{display:none}
#bars{position:absolute;top:18px;inset-inline-start:18px;display:flex;flex-direction:column;gap:8px}
.bar{display:flex;align-items:center;gap:8px;font-size:26px}
.bar i{display:block;width:170px;height:18px;border-radius:10px;background:rgba(0,0,0,.4);overflow:hidden;border:2px solid rgba(255,255,255,.4)}
.bar b{display:block;height:100%;width:100%;transition:width .15s}
#topright{position:absolute;top:14px;inset-inline-end:14px;display:flex;gap:12px}
#chip{position:absolute;top:150px;left:50%;transform:translateX(-50%);max-width:560px;min-width:260px;background:rgba(10,60,95,.78);border:3px solid rgba(255,255,255,.5);border-radius:26px;padding:12px 22px;font-size:30px;text-align:center;pointer-events:auto;display:flex;gap:14px;align-items:center;justify-content:center}
#chip .skip{font-size:24px;opacity:.8;padding:6px 12px;border:2px solid rgba(255,255,255,.5);border-radius:14px;min-height:48px;display:flex;align-items:center}
#compass{position:absolute;top:262px;left:50%;width:70px;height:70px;margin-left:-35px;font-size:50px;text-align:center;line-height:70px;transition:transform .1s}
#toasts{position:absolute;top:350px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:8px}
.toast{background:rgba(0,0,0,.6);padding:10px 24px;border-radius:20px;font-size:32px;animation:tin .25s,tout .4s 1.6s forwards}
@keyframes tin{from{transform:translateY(20px) scale(.9);opacity:0}}
@keyframes tout{to{opacity:0;transform:translateY(-20px)}}
#stickBase{position:absolute;left:30px;bottom:130px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.12);border:4px solid rgba(255,255,255,.35);pointer-events:auto;touch-action:none}
#stickKnob{position:absolute;left:80px;top:80px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.5);border:4px solid #fff}
#bPunch{position:absolute;right:30px;bottom:130px;width:170px;height:170px;font-size:78px}
#bUse{position:absolute;right:225px;bottom:105px;width:130px;height:130px;font-size:58px}
#bJump{position:absolute;right:50px;bottom:340px;width:120px;height:120px;font-size:52px}
#bDive{position:absolute;right:195px;bottom:290px;width:120px;height:120px;font-size:52px}
.hintring{animation:pulse 1.1s infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,209,102,.9)}60%{box-shadow:0 0 0 24px rgba(255,209,102,0)}}
.panel{position:absolute;inset:0;background:rgba(2,18,32,.72);display:flex;align-items:center;justify-content:center;pointer-events:auto;z-index:20}
.card{width:620px;max-height:1100px;background:linear-gradient(#0f5d8f,#0a3d62);border:4px solid rgba(255,255,255,.55);border-radius:34px;padding:30px;display:flex;flex-direction:column;gap:18px;align-items:center;overflow-y:auto;touch-action:pan-y}
.card h2{margin:0;font-size:44px}
.menuwrap{position:absolute;inset:0;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:80px 0 120px}
.logo{font-size:96px;font-weight:900;text-align:center;line-height:.95;text-shadow:0 8px 0 #0a6aa3,0 14px 30px rgba(0,0,0,.5);letter-spacing:2px}
.logo small{display:block;font-size:30px;color:#ffd166;letter-spacing:7px;margin-top:14px}
.iconrow{display:flex;gap:18px;pointer-events:auto}
.stack{display:flex;flex-direction:column;gap:20px;align-items:center}
.seg{display:flex;gap:10px}.seg .btn{min-width:120px;padding:0 16px;font-size:30px}
.seg .btn.sel{background:linear-gradient(#ffd166,#f59f1b);color:#3a2300;text-shadow:none}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:100%}
.cell{background:rgba(0,0,0,.28);border-radius:20px;padding:10px;text-align:center;font-size:44px;border:2px solid rgba(255,255,255,.2)}
.cell small{display:block;font-size:22px;opacity:.85}.cell.zero{opacity:.35}
.tabs{display:flex;gap:12px}
.row{display:flex;align-items:center;gap:14px;background:rgba(0,0,0,.28);border-radius:22px;padding:12px 16px;width:100%;border:2px solid rgba(255,255,255,.18)}
.row .ic{font-size:56px;min-width:70px;text-align:center}.row .nm{font-size:30px;flex:1}
.cost{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:24px;margin-top:4px}.cost .no{color:#ff8b8b}.cost .ok{color:#9dffb0}
.row .btn{min-width:150px;font-size:28px;padding:0 14px}
.deck{display:flex;gap:16px}
.tcard{width:180px;height:260px;border-radius:24px;border:4px solid #fff;background:linear-gradient(#ffd166,#e8590c);display:flex;align-items:center;justify-content:center;font-size:90px;color:#3a2300;transition:transform .15s,opacity .3s}
.tcard.hl{transform:scale(1.12);filter:brightness(1.3)}.tcard.dim{opacity:.25}
.tinfo{text-align:center;font-size:30px;display:flex;flex-direction:column;gap:10px}.tinfo .big{font-size:120px}.tinfo h3{margin:0;font-size:46px;color:#ffd166}
.lbrow{display:flex;justify-content:space-between;width:100%;font-size:30px;padding:8px 14px;background:rgba(0,0,0,.25);border-radius:14px}
#equipbar{position:absolute;left:30px;bottom:400px;display:flex;gap:8px;font-size:40px;pointer-events:none}
#goggle{position:absolute;inset:0;pointer-events:none;display:none;background:radial-gradient(ellipse 62% 46% at 50% 50%,rgba(0,0,0,0) 62%,rgba(0,0,0,.7) 100%)}
.slots{display:grid;grid-template-columns:repeat(5,104px);gap:8px}
.slot{position:relative;width:104px;height:104px;border-radius:18px;background:rgba(0,0,0,.3);border:3px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:56px;cursor:pointer;touch-action:manipulation;color:#fff;font-family:inherit;padding:0}
.slot.empty{border-style:dashed;opacity:.3;cursor:default}.slot.sel{border-color:#ffd166;background:rgba(255,209,102,.22)}
.slot b{position:absolute;right:8px;bottom:2px;font-size:26px}.slot i{position:absolute;left:8px;top:2px;font-size:24px;font-style:normal}
.pop{font-size:34px;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:580px;background:linear-gradient(#0f6aa3,#0a3d62);border:4px solid #fff;border-radius:30px;padding:24px;z-index:5;display:flex;flex-direction:column;align-items:center;gap:14px;box-shadow:0 0 0 2000px rgba(0,0,0,.45)}
.pop .big{font-size:96px;line-height:1}.pop .acts{display:flex;gap:10px;width:100%;justify-content:center}
.pop .acts .btn{flex:1;min-width:0;flex-direction:column;font-size:26px;gap:0;padding:0 6px;min-height:110px}.pop .acts .btn span{font-size:42px}
.tabs .btn.sel{background:linear-gradient(#ffd166,#f59f1b);color:#3a2300;text-shadow:none}
#vig{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 200px 60px rgba(255,0,0,0);transition:box-shadow .2s}
#tint{position:absolute;inset:0;pointer-events:none;background:#06304f;opacity:0}
#fade{position:absolute;inset:0;pointer-events:none;background:#000;opacity:0;transition:opacity .6s;z-index:15}
`;
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

export function createUI(root, H) {
  const style = el('style'); style.textContent = CSS; document.head.appendChild(style);
  const ui = { input: { mx: 0, mz: 0, jump: false, dive: false, punch: false, use: false, bag: false, pause: false, lookX: 0, lookY: 0 }, hudOn: false, panelOpen: false };
  const inp = ui.input;
  root.innerHTML = '';
  const vig = el('div'); vig.id = 'vig'; const tint = el('div'); tint.id = 'tint'; const fade = el('div'); fade.id = 'fade';
  const goggle = el('div'); goggle.id = 'goggle'; root.append(tint, goggle, vig);
  // ---- HUD ----
  const hud = el('div'); hud.id = 'hud'; hud.className = 'abs'; hud.style.cssText = 'position:absolute;inset:0';
  const bars = el('div'); bars.id = 'bars';
  const mkBar = (icon, color) => { const r = el('div', 'bar', `<span>${icon}</span><i><b style="background:${color}"></b></i>`); bars.appendChild(r); return { row: r, fill: r.querySelector('b') }; };
  const bHp = mkBar('❤️', '#ff5c6c'), bO2 = mkBar('🫧', '#5ce1ff'), bFood = mkBar('🥫', '#ffb347'), bWater = mkBar('💧', '#4da3ff');
  const tr = el('div'); tr.id = 'topright';
  const dayChip = el('div', 'btn', ''); dayChip.style.cssText = 'pointer-events:none;font-size:26px;min-width:120px';
  const bBag = el('button', 'btn round', '🎒'), bPause = el('button', 'btn round', '⏸');
  tr.append(dayChip, bBag, bPause);
  const chip = el('div'); chip.id = 'chip'; const chipText = el('span'); const chipSkip = el('span', 'skip'); chip.append(chipText, chipSkip);
  const equipbar = el('div'); equipbar.id = 'equipbar'; const compass = el('div'); compass.id = 'compass'; compass.textContent = '🧭';
  const toasts = el('div'); toasts.id = 'toasts';
  hud.append(bars, tr, chip, compass, toasts, equipbar);
  // ---- controls ----
  const ctr = el('div'); ctr.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  const stickBase = el('div'); stickBase.id = 'stickBase'; const knob = el('div'); knob.id = 'stickKnob'; stickBase.appendChild(knob);
  const bPunch = el('button', 'btn round', '🥊'); bPunch.id = 'bPunch';
  const bUse = el('button', 'btn round', '✋'); bUse.id = 'bUse';
  const bJump = el('button', 'btn round', '⬆️'); bJump.id = 'bJump';
  const bDive = el('button', 'btn round', '⬇️'); bDive.id = 'bDive';
  ctr.append(stickBase, bPunch, bUse, bJump, bDive);
  hud.appendChild(ctr);
  root.append(hud, fade);
  const layer = el('div'); layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:20'; root.appendChild(layer);

  // ---- input handling ----
  let stickId = null, sbx = 0, sby = 0;
  const setStick = (e) => {
    const r = stickBase.getBoundingClientRect(), s = r.width / stickBase.offsetWidth || 1, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / s, dy = (e.clientY - cy) / s; const m = Math.hypot(dx, dy), lim = 90;
    if (m > lim) { dx *= lim / m; dy *= lim / m; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; inp.mx = dx / lim; inp.mz = dy / lim;
  };
  stickBase.addEventListener('pointerdown', e => { stickId = e.pointerId; stickBase.setPointerCapture(e.pointerId); setStick(e); e.preventDefault(); });
  stickBase.addEventListener('pointermove', e => { if (e.pointerId === stickId) setStick(e); });
  const endStick = e => { if (e.pointerId === stickId) { stickId = null; knob.style.transform = ''; inp.mx = inp.mz = 0; } };
  stickBase.addEventListener('pointerup', endStick); stickBase.addEventListener('pointercancel', endStick);
  const hold = (b, key) => {
    b.addEventListener('pointerdown', e => { inp[key] = true; b.classList.add('down'); b.setPointerCapture(e.pointerId); e.preventDefault(); });
    const up = () => { inp[key] = false; b.classList.remove('down'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  };
  hold(bJump, 'jump'); hold(bDive, 'dive');
  const tap = (b, key) => b.addEventListener('pointerdown', e => { inp[key] = true; b.classList.add('down'); e.preventDefault(); });
  const untap = (b) => { const f = () => b.classList.remove('down'); b.addEventListener('pointerup', f); b.addEventListener('pointercancel', f); b.addEventListener('pointerleave', f); };
  tap(bPunch, 'punch'); tap(bUse, 'use'); untap(bPunch); untap(bUse);
  bBag.addEventListener('click', () => { H.openBag(); });
  bPause.addEventListener('click', () => { H.pause(); });
  chipSkip.addEventListener('click', () => { H.skipFtue(); });
  // look drag on canvas
  const canvas = document.getElementById('view'); let lookId = null, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', e => { if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); } H.userGesture(); });
  canvas.addEventListener('pointermove', e => { if (e.pointerId === lookId) { const k = e.pointerType === 'mouse' ? 0.0035 : 0.0055; inp.lookX += (e.clientX - lx) * k; inp.lookY += (e.clientY - ly) * k; lx = e.clientX; ly = e.clientY; } });
  const endLook = e => { if (e.pointerId === lookId) lookId = null; };
  canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook);
  const keys = {};
  const keyMap = () => {
    const f = (keys.KeyW || keys.ArrowUp ? -1 : 0) + (keys.KeyS || keys.ArrowDown ? 1 : 0), s = (keys.KeyD || keys.ArrowRight ? 1 : 0) + (keys.KeyA || keys.ArrowLeft ? -1 : 0);
    if (stickId === null) { inp.mx = s; inp.mz = f; }
    inp.jump = !!keys.Space || bJump.classList.contains('down'); inp.dive = !!(keys.ShiftLeft || keys.ShiftRight || keys.KeyC) || bDive.classList.contains('down');
  };
  window.addEventListener('keydown', e => {
    if (e.repeat) return; keys[e.code] = true; H.userGesture();
    if (ui.panelOpen) { if (e.code === 'Escape') H.escape(); return; }
    if (e.code === 'KeyF' || e.code === 'KeyJ') inp.punch = true;
    if (e.code === 'KeyE' || e.code === 'Enter') inp.use = true;
    if (e.code === 'KeyB' || e.code === 'Tab') { H.openBag(); e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyP') H.pause();
    if (e.code === 'Space') e.preventDefault();
    keyMap();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; keyMap(); });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; inp.mx = inp.mz = 0; inp.jump = inp.dive = false; H.blur(); });
  ui.pollKeys = keyMap;

  // ---- HUD API ----
  let toastN = 0;
  ui.toast = (txt) => { const d = el('div', 'toast', txt); toasts.appendChild(d); if (++toastN > 3 && toasts.firstChild) toasts.removeChild(toasts.firstChild); setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); toastN = Math.max(0, toastN - 1); }, 2100); };
  ui.showHud = (on) => { hud.style.display = on ? 'block' : 'none'; ui.hudOn = on; };
  ui.setHud = (s) => {
    bHp.fill.style.width = s.hp + '%'; bO2.fill.style.width = (s.o2 * 100) + '%'; bFood.fill.style.width = s.hunger + '%'; bWater.fill.style.width = s.thirst + '%';
    bO2.row.style.opacity = s.o2 >= 0.999 && !s.under ? 0.35 : 1;
    dayChip.textContent = t('day', { n: s.day }) + ' · ⭐' + s.score;
    chipText.textContent = s.objective; chipSkip.style.display = s.ftue ? 'flex' : 'none';
    if (s.compass === null) compass.style.display = 'none'; else { compass.style.display = 'block'; compass.style.transform = `rotate(${s.compass}rad)`; compass.textContent = '⬆️'; }
    bUse.style.display = s.useIcon ? 'flex' : 'none'; if (s.useIcon) bUse.textContent = s.useIcon;
    bUse.classList.toggle('hintring', !!s.useIcon);
    bDive.style.display = s.swim ? 'flex' : 'none';
    bPunch.classList.toggle('hintring', !!s.punchHint);
  };
  ui.setVignette = (stingAmt, lowO2, hurt) => {
    const a = Math.min(0.9, stingAmt + (lowO2 ? 0.5 : 0) + hurt);
    vig.style.boxShadow = `inset 0 0 200px 60px rgba(255,${hurt > 0 || lowO2 ? 20 : 90},${hurt > 0 || lowO2 ? 20 : 60},${a})`;
  };
  ui.setTint = (a) => { tint.style.opacity = a; };
  let lastEq = null; ui.setEquip = (txt, gog) => { if (txt !== lastEq) { lastEq = txt; equipbar.textContent = txt; } goggle.style.display = gog ? 'block' : 'none'; };
  ui.setFade = (v) => { fade.style.opacity = v ? 1 : 0; };
  ui.setStaticText = () => { root.dir = isRTL() ? 'rtl' : 'ltr'; chipSkip.textContent = t('skip'); };

  // ---- panels ----
  let current = null;
  ui.closePanel = () => { ui._sel = null; if (current) { current.remove(); current = null; } ui.panelOpen = false; layer.style.pointerEvents = 'none'; };
  const open = (card, bare) => {
    ui.closePanel(); const p = el('div', bare ? '' : 'panel'); if (bare) p.style.cssText = 'position:absolute;inset:0;z-index:20;pointer-events:none';
    p.appendChild(card); layer.appendChild(p); layer.style.pointerEvents = bare ? 'none' : 'auto'; current = p; ui.panelOpen = !bare; p.dir = isRTL() ? 'rtl' : 'ltr';
    return p;
  };
  const btn = (txt, fn, cls) => { const b = el('button', 'btn ' + (cls || ''), txt); b.addEventListener('click', () => { sfx.ui(); fn(); }); return b; };
  const langBtn = (cls) => btn('🌐', () => ui.showLanguage(), 'round ' + (cls || ''));

  ui.showMenu = (hasSave, best) => {
    ui.showHud(false);
    const w = el('div', 'menuwrap'); w.dir = isRTL() ? 'rtl' : 'ltr';
    w.appendChild(el('div', 'logo', 'DELUGE<br>DRIFTER<small>RAFT · DIVE · SURVIVE</small>'));
    const mid = el('div', 'stack');
    if (best) mid.appendChild(el('div', '', '⭐ ' + best));
    mid.appendChild(btn(hasSave ? t('continue') : t('play'), () => (hasSave ? H.continueGame() : H.newGame()), 'main'));
    if (hasSave) mid.appendChild(btn(t('newgame'), () => ui.confirm(t('confirm_new'), () => H.newGame()), ''));
    w.appendChild(mid);
    const row = el('div', 'iconrow');
    row.append(btn('⚙️', () => ui.showSettings(() => ui.showMenu(hasSave, best)), 'round'), langBtn(), btn('🏆', () => H.showLeaderboard(), 'round'), btn('❓', () => ui.showHelp(), 'round'),
      btn(H.isMuted() ? '🔇' : '🔊', () => { H.toggleMute(); ui.showMenu(hasSave, best); }, 'round'));
    w.appendChild(row); open(w, true);
    w.querySelectorAll('.btn, .iconrow, .stack').forEach(x => x.style.pointerEvents = 'auto');
  };
  ui.confirm = (msg, yes) => {
    const c = el('div', 'card'); c.append(el('div', '', msg)); c.style.fontSize = '34px'; c.style.textAlign = 'center';
    const r = el('div', 'seg'); r.append(btn(t('yes'), () => { ui.closePanel(); yes(); }, 'sel'), btn(t('no'), () => ui.closePanel())); c.appendChild(r); open(c);
  };
  ui.showLanguage = (back) => {
    const c = el('div', 'card'); c.append(el('h2', '', '🌐 ' + t('language')));
    LANGS.forEach(l => c.append(btn((getLang() === l.id ? '✓ ' : '') + l.name, () => H.setLanguage(l.id), 'main')));
    c.append(btn(t('close'), () => H.afterPanel()));
    open(c);
  };
  ui.showSettings = (back) => {
    const c = el('div', 'card'); c.append(el('h2', '', '⚙️ ' + t('settings')));
    c.append(el('div', '', t('quality')));
    const seg = el('div', 'seg');
    ['auto', 'low', 'med', 'high'].forEach(q => seg.append(btn(t('q_' + q), () => { H.setQuality(q); ui.showSettings(back); }, H.getQuality() === q ? 'sel' : '')));
    c.append(seg);
    c.append(el('div', '', t('sound')), btn(H.isMuted() ? '🔇' : '🔊', () => { H.toggleMute(); ui.showSettings(back); }, 'round'));
    c.append(langBtn()); c.append(btn(t('back'), back || (() => H.afterPanel())));
    open(c);
  };
  ui.showHelp = () => {
    const c = el('div', 'card'); c.append(el('h2', '', '❓ ' + t('help')));
    ['🕹️ ' + t('help1'), '🥊 ' + t('help2'), '🤿 ' + t('help3'), '🛶 ' + t('help4')].forEach(x => { const r = el('div', 'row'); r.innerHTML = `<div class="nm">${x}</div>`; c.append(r); });
    c.append(btn(t('close'), () => H.afterPanel())); open(c);
  };
  ui.showLeaderboard = (entries, rank) => {
    const c = el('div', 'card'); c.append(el('h2', '', '🏆 ' + t('leaderboard')));
    if (!entries || !entries.length) c.append(el('div', '', t('empty_lb')));
    else entries.slice(0, 10).forEach((e, i) => c.append(el('div', 'lbrow', `<span>${i + 1}. ${String(e.username || '?').replace(/[<>&]/g, '')}</span><span>⭐ ${e.score}</span>`)));
    if (rank) c.append(el('div', '', t('you') + ': #' + rank));
    c.append(btn(t('close'), () => H.afterPanel())); open(c);
  };
  ui.showPause = () => {
    const c = el('div', 'card'); c.append(el('h2', '', '⏸ ' + t('paused')));
    c.append(btn(t('resume'), () => H.resume(), 'main'), btn('⚙️ ' + t('settings'), () => ui.showSettings(() => ui.showPause())), langBtn(), btn('🏠 ' + t('menu'), () => H.toMenu()));
    open(c);
  };
  ui.showEnding = (score) => {
    const c = el('div', 'card'); c.style.textAlign = 'center';
    c.append(el('div', '', '<div style="font-size:120px">🚁</div>'), el('h2', '', t('end_title')), el('div', '', t('end_text')), el('div', '', '⭐ ' + t('end_score', { n: score })));
    c.append(btn(t('end_continue'), () => H.resume(), 'main'), btn('🏠 ' + t('menu'), () => H.toMenu())); open(c);
  };
  ui.showBag = (tab) => {
    tab = tab || 'items';
    const S = H.state(), c = el('div', 'card'); c.style.width = '640px';
    const tabs = el('div', 'tabs');
    tabs.append(btn('🎒 ' + t('items'), () => { ui._sel = null; ui.showBag('items'); }, tab === 'items' ? 'sel' : ''), btn('🛠️ ' + t('craft'), () => { ui._sel = null; ui.showBag('craft'); }, tab === 'craft' ? 'sel' : ''));
    c.append(tabs);
    let pop = null;
    if (tab === 'items') {
      // build the 5x5 slot list: raw resources first, then crafted gear that is still in the bag / worn
      const list = [];
      Object.keys(cfg().items).forEach(id => { if ((S.inv[id] || 0) > 0) list.push({ type: 'res', id, icon: itemIcon(id), count: S.inv[id], name: itemName(id) }); });
      cfg().recipes.forEach(r => { const st = S.gear[r.id] || 0; if (!st || ((r.kind === 'raft' || r.kind === 'upgrade') && st === 2)) return; list.push({ type: 'gear', id: r.id, r, st, icon: r.icon, name: t('r_' + r.id) }); });
      const g = el('div', 'slots');
      for (let i = 0; i < 25; i++) {
        const it = list[i];
        if (!it) { g.append(el('div', 'slot empty')); continue; }
        const b = el('button', 'slot' + (ui._sel && ui._sel.id === it.id ? ' sel' : ''), it.icon);
        if (it.type === 'res') b.append(el('b', '', String(it.count))); else if (it.st === 2) b.append(el('i', '', '✓'));
        if (it.type === 'gear' && it.r.kind === 'rod') b.append(el('b', '', 'T' + it.r.tier));
        b.addEventListener('click', () => { sfx.ui(); ui._sel = { id: it.id }; ui.showBag('items'); });
        g.append(b);
      }
      c.append(g);
      if (!list.length) c.append(el('div', '', t('bag_empty')));
      const sel = ui._sel && list.find(x => x.id === ui._sel.id);
      if (sel) {
        pop = el('div', 'pop');
        const sub = sel.type === 'res' ? '×' + sel.count : (sel.st === 2 ? '✓ ' + t('equipped') : t('in_bag'));
        pop.append(el('div', 'big', sel.icon), el('div', '', `<b>${sel.name}</b> · ${sub}`));
        const acts = el('div', 'acts');
        const canEat = sel.type === 'res' && (sel.id === 'can' || sel.id === 'fish'), canDrink = sel.type === 'res' && sel.id === 'bottle', canEquip = sel.type === 'gear';
        const mk = (ic, label, on, fn) => { const b = el('button', 'btn' + (on ? '' : ' off'), `<span>${ic}</span>${label}`); b.addEventListener('click', () => { if (!on) return; fn(); }); return b; };
        acts.append(
          mk('🍖', t('eat'), canEat, () => { H.eat(sel.id); ui.showBag('items'); }),
          mk('💧', t('drink'), canDrink, () => { H.drink(sel.id); ui.showBag('items'); }),
          mk('🛠️', sel.type === 'gear' && sel.st === 2 && sel.r.kind !== 'beacon' ? t('unequip') : t('equip'), canEquip, () => { const close = H.equip(sel.id); if (close) H.afterPanel(); else ui.showBag('items'); }));
        pop.append(acts, btn(t('close'), () => { ui._sel = null; ui.showBag('items'); }));
      }
    } else {
      cfg().recipes.forEach(r => {
        if (r.kind === 'rod' && S.talent !== 'fishing') return;
        if (r.kind === 'beacon' && !(S.inv.part > 0 || S.chapter >= 4 || S.gear.beacon)) return;
        const st = H.owned(r), row = el('div', 'row'), info = el('div', 'nm');
        info.innerHTML = `${t('r_' + r.id)}`;
        const cost = el('div', 'cost'); Object.keys(r.cost).forEach(k => { const have = S.inv[k] || 0, ok = have >= r.cost[k]; cost.append(el('span', ok ? 'ok' : 'no', `${itemIcon(k)} ${have}/${r.cost[k]}`)); });
        info.append(cost); row.append(el('div', 'ic', r.icon), info);
        const b = st ? btn('✓ ' + (st === 2 ? t('equipped') : t('in_bag')), () => {}, 'off') : btn('🛠️ ' + t('craft'), () => { H.craft(r); ui.showBag('craft'); });
        row.append(b); c.append(row);
      });
    }
    c.append(btn(t('close'), () => H.afterPanel()));
    const p = open(c);
    if (pop) p.appendChild(pop);
    const k = p.firstChild; if (k && tab === 'craft') { if (ui._bagScroll && ui._bagTab === tab) k.scrollTop = ui._bagScroll; k.addEventListener('scroll', () => ui._bagScroll = k.scrollTop); }
    ui._bagTab = tab;
  };
  ui.showDraw = (talentId, redrawUsed, onStart, onRedraw) => {
    const c = el('div', 'card'); c.style.cssText += ';min-height:760px;justify-content:center;text-align:center';
    c.append(el('h2', '', t('draw_title')));
    const deck = el('div', 'deck'); const cards = [];
    cfg().talents.forEach(() => { const k = el('div', 'tcard', '❓'); cards.push(k); deck.append(k); });
    const info = el('div', 'tinfo'); info.style.minHeight = '220px';
    const act = el('div', 'stack'); c.append(deck, info, act);
    const drawBtn = btn('🎲 ' + t('draw'), () => run(), 'main'); act.append(drawBtn);
    function run() {
      drawBtn.remove(); const idx = cfg().talents.findIndex(x => x.id === talentId); let step = 0, total = 12 + ((idx - (11 % 3) + 3) % 3), delay = 90;
      const go = () => {
        cards.forEach((k, i) => k.classList.toggle('hl', i === step % 3)); sfx.ui(); step++;
        if (step > total) {
          const tIdx = (step - 1) % 3; // ensure landing on idx
          cards.forEach((k, i) => { k.classList.remove('hl'); k.classList.toggle('dim', i !== idx); });
          cards[idx].classList.add('hl'); cards[idx].textContent = cfg().talents[idx].icon; reveal(); void tIdx; return;
        }
        delay *= 1.12; setTimeout(go, delay);
      };
      go();
    }
    function reveal() {
      sfx.win(); H.hapticWin();
      info.innerHTML = `<h3>${t('t_' + talentId)}</h3><div>${t('t_' + talentId + '_1')}</div><div>${t('t_' + talentId + '_2')}</div>`;
      act.append(btn(t('start'), () => onStart(), 'main'));
      if (!redrawUsed) act.append(btn('🔄 ' + t('redraw'), () => onRedraw()));
    }
    open(c);
  };
  return ui;
}
