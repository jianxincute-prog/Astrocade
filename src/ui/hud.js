// DOM HUD + touch controls (joystick, attack, dodge, 3 skills) + keyboard + the 3x3 backpack.
//
// Layout: every size is written in `em` and #ui's font-size is "1 design pixel" (see HUD.resize), so the whole
// interface scales with the screen (designed for a 720-wide canvas, works in portrait and landscape).
//   top row    : [player card + gang card]  [boss bar]  [minimap + tool buttons + combo]
//   bottom     : floating joystick (left half) and an arc of action buttons around ATTACK (right)
//   modal      : backpack (3x3 grid) — opened from the bag tool button or the B key
import { GANGS, HALF, territoryAt } from '../logic/city.js';
import { ITEMS, BAG_COLS, BAG_SLOTS, STACK_MAX } from '../logic/items.js';

/** Design-pixel helper: "22em" in the stylesheet means 22 design pixels = calc(22 * var(--u)). Values below 1 (letter-spacing) stay real ems. */
export const em = (n) => `calc(${n} * var(--u))`;
export const scaleCss = (css) => css.replace(/(?<![\d.])(-?[1-9]\d*(?:\.\d+)?)em(?![a-z\-])/g, (_, n) => em(n));

const PANEL = 'background:linear-gradient(rgba(30,35,48,.78),rgba(14,16,24,.78));border:1px solid rgba(255,255,255,.14);box-shadow:0 4em 16em rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)';

const CSS = `
#ui{position:absolute;inset:0;pointer-events:none;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:800;color:#fff;user-select:none;-webkit-user-select:none;overflow:hidden;font-size:calc(14 * var(--u,1px))}
#ui *{box-sizing:border-box}
#ui button{font-family:inherit}
.head{font-family:'Arial Black',Impact,system-ui,sans-serif;letter-spacing:.06em}
.card{${PANEL};border-radius:18em;padding:14em 16em}

/* ---- top row */
.top{position:absolute;left:16em;right:16em;top:16em;display:grid;grid-template-columns:minmax(0,350em) minmax(0,1fr) auto;grid-template-areas:"left . right" "boss boss boss";gap:12em 14em;align-items:start}
@media (min-aspect-ratio:1/1){.top{grid-template-areas:"left boss right"}}
.col-l{grid-area:left;display:flex;flex-direction:column;gap:10em}
.col-r{grid-area:right;position:relative;display:flex;flex-direction:column;align-items:flex-end;gap:10em}

.hp .row{display:flex;align-items:baseline;justify-content:space-between;gap:10em}
.hp-name{font-size:22em;text-shadow:0 2em 4em #000}
.hp-num{font-size:21em;opacity:.9;font-variant-numeric:tabular-nums}
.bar{position:relative;height:24em;margin-top:8em;border-radius:12em;background:rgba(0,0,0,.55);box-shadow:inset 0 2em 5em #000a;overflow:hidden}
.bar .ghost,.bar .fill{position:absolute;inset:0;transform-origin:left}
.bar .ghost{background:#ffd23a;opacity:.9;transition:transform .5s linear .3s}
.bar .fill{background:linear-gradient(#ff7b5c,#d12525 60%,#a31515);transition:transform .15s}
.bar .fill::after{content:'';position:absolute;left:0;right:0;top:0;height:42%;background:linear-gradient(rgba(255,255,255,.35),rgba(255,255,255,0))}
.bar.low .fill{animation:lowhp .6s infinite alternate}
@keyframes lowhp{to{filter:brightness(1.5)}}
.buffs{display:flex;gap:6em;margin-left:auto;align-self:center}
.chip{display:none;align-items:center;gap:5em;height:30em;padding:0 9em 0 6em;border-radius:15em;font-size:18em;background:rgba(0,0,0,.45);border:1px solid currentColor;position:relative;overflow:hidden;font-variant-numeric:tabular-nums}
.chip.on{display:flex;animation:pop .25s}
.chip svg{width:20em;height:20em;flex:none}
.chip .pips{display:flex;gap:4em}
.chip .pips i{width:10em;height:10em;border-radius:50%;background:currentColor;box-shadow:0 0 6em currentColor}
.chip .pips i.off{background:transparent;box-shadow:none;border:2em solid currentColor;opacity:.4}
.chip .t{position:absolute;left:0;bottom:0;height:3em;background:currentColor;transform-origin:left}
@keyframes pop{from{transform:scale(.6);opacity:0}}
.scoreRow{display:flex;align-items:center;gap:10em;margin-top:10em;padding-top:8em;border-top:1px solid rgba(255,255,255,.12)}
.scoreRow>span{font-size:22em;color:#ffd23a;opacity:.9}
.score{font-size:30em;font-family:'Arial Black',Impact,system-ui,sans-serif;text-shadow:0 2em 6em #000;font-variant-numeric:tabular-nums}

.gangs{display:flex;flex-direction:column;gap:7em;padding:12em 14em}
.gangs .g{display:flex;align-items:center;gap:8em;font-size:19em;height:30em}
.gangs .dot{flex:none;width:16em;height:16em;border-radius:50%;border:2em solid #0009;box-shadow:0 0 8em currentColor}
.gangs .n{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1em 3em #000}
.gangs .pb{flex:none;width:52em;height:10em;border-radius:5em;background:rgba(0,0,0,.55);overflow:hidden}
.gangs .pb div{height:100%;border-radius:5em}
.gangs .v{flex:none;width:70em;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;font-size:18em}
.gangs .g.done{opacity:.55}.gangs .g.done .v{color:#7dff8a}
.gangs .g.boss .v{animation:blink .8s infinite alternate;color:#ff8a6a}
@keyframes blink{to{opacity:.4}}

#minimap{width:190em;height:190em;border-radius:50%;background:#0009;border:3em solid rgba(255,255,255,.45);box-shadow:0 4em 16em #000a,inset 0 0 20em #000}
.tools{display:flex;gap:10em}
.tool{position:relative;width:88em;height:88em;border-radius:22em;pointer-events:auto;touch-action:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2em;${PANEL};cursor:pointer;transition:transform .06s}
.tool.down{transform:scale(.92)}
.tool .ic{font-size:36em;line-height:1}
.tool .lb{font-size:13em;letter-spacing:.06em;opacity:.8;white-space:nowrap}
.tool .badge{position:absolute;right:-6em;top:-6em;min-width:30em;height:30em;padding:0 7em;border-radius:15em;background:#ff4d3a;border:2em solid #fff;font-size:19em;display:none;align-items:center;justify-content:center;box-shadow:0 2em 6em #0008}
.tool .kh{position:absolute;left:6em;top:5em;font-size:13em;opacity:.55;display:none}
.combo{position:absolute;right:0;top:100%;margin-top:8em;text-align:right;font-family:'Arial Black',Impact,system-ui,sans-serif;font-size:62em;line-height:1;color:#ffd23a;text-shadow:0 4em 0 #a23c00,0 6em 12em #000;opacity:0;transition:opacity .2s;white-space:nowrap}
.combo small{display:block;font-size:20em;letter-spacing:.2em;color:#fff;text-shadow:0 2em 4em #000}

.bossbar{grid-area:boss;display:none;justify-self:center;width:100%;max-width:560em;text-align:center}
.bossbar .bn{font-size:23em;text-shadow:0 2em 4em #000}
.bossbar .bar{height:20em;margin-top:6em;border:2em solid rgba(255,255,255,.35)}
.bossbar .bar .fill{background:linear-gradient(#c56cff,#6a1ea8);transition:transform .2s}
.bossbar .bar::after{content:'';position:absolute;left:50%;top:0;bottom:0;width:2em;background:#fffa;box-shadow:0 0 6em #fff}
.bossbar .bc{height:34em;margin-top:6em;font-size:25em;letter-spacing:.1em;opacity:0;transition:opacity .25s;text-shadow:0 2em 6em #000,0 0 14em currentColor}
.bossbar .bc.on{opacity:1}

.banner{position:absolute;left:0;right:0;top:36%;text-align:center;font-family:'Arial Black',Impact,system-ui,sans-serif;font-size:42em;text-shadow:0 3em 10em #000;opacity:0;transition:opacity .4s;padding:0 30em}
.banner small{display:block;margin-top:6em;font-family:system-ui,sans-serif;font-weight:800;font-size:22em;opacity:.92}
.toast{z-index:10;position:absolute;left:50%;top:58%;transform:translate(-50%,0);padding:9em 20em;border-radius:24em;font-size:22em;white-space:nowrap;opacity:0;transition:opacity .2s,transform .3s;${PANEL}}
.toast.on{opacity:1;transform:translate(-50%,-8em)}
.pois{position:absolute;inset:0;box-shadow:inset 0 0 130em 36em #38d63a;opacity:0;transition:opacity .3s;pointer-events:none}
.vign{position:absolute;inset:0;box-shadow:inset 0 0 160em 40em #c00;opacity:0;transition:opacity .25s;pointer-events:none}
.dmg{position:absolute;left:0;top:0;font-family:'Arial Black',Impact,system-ui,sans-serif;font-size:30em;color:#fff;text-shadow:0 2em 0 #000,0 0 8em #000;will-change:transform,opacity;pointer-events:none}

/* ---- controls */
#joy{position:absolute;left:0;bottom:0;width:50%;height:46%;pointer-events:auto;touch-action:none}
.jbase{position:absolute;left:0;top:0;width:220em;height:220em;margin:-110em 0 0 -110em;border-radius:50%;background:radial-gradient(#ffffff1c,#ffffff08);border:3em solid #ffffff3d;box-shadow:inset 0 0 30em #0006}
.jknob{position:absolute;left:0;top:0;width:96em;height:96em;margin:-48em 0 0 -48em;border-radius:50%;background:radial-gradient(circle at 40% 32%,#fff,#b9bdc6);opacity:.88;box-shadow:0 4em 10em #0008}
.btn{position:absolute;border-radius:50%;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center;flex-direction:column;border:4em solid rgba(255,255,255,.55);box-shadow:0 6em 14em #0009,inset 0 -8em 16em rgba(0,0,0,.25),inset 0 6em 10em rgba(255,255,255,.28);overflow:hidden;transition:transform .06s}
.btn.down{transform:scale(.92)}
.btn .ic{line-height:1;filter:drop-shadow(0 2em 2em #0008)}
.btn .lb{font-size:13em;font-weight:900;margin-top:3em;max-width:90%;text-align:center;line-height:1.05;text-shadow:0 1em 3em #000;letter-spacing:.02em}
.btn .lb .kh{display:none;opacity:.75}
.btn .cd{position:absolute;inset:0;background:conic-gradient(rgba(0,0,0,.72) var(--p,0turn),transparent 0);border-radius:50%}
.btn .cdt{position:absolute;font-size:36em;text-shadow:0 2em 4em #000}
.tool .kh{display:none}
@media (hover:hover) and (pointer:fine){.btn .lb .kh{display:inline}.tool .kh{display:block}}

/* ---- backpack */
.bag{z-index:20;position:absolute;inset:0;display:none;align-items:center;justify-content:center;pointer-events:auto;background:rgba(6,8,14,.66);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.bag.on{display:flex}
.bag-card{width:min(560em,94%);padding:20em 22em 22em;border-radius:26em;${PANEL};animation:rise .22s}
@keyframes rise{from{transform:translateY(24em) scale(.96);opacity:0}}
.bag-head{display:flex;align-items:center;gap:12em}
.bag-head h3{margin:0;font-size:30em}
.bag-head .cap{margin-left:auto;font-size:19em;opacity:.7}
.bag-head .x{width:48em;height:48em;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:24em;cursor:pointer}
.bag-grid{display:grid;grid-template-columns:repeat(${BAG_COLS},1fr);gap:12em;margin-top:16em}
.slot{position:relative;aspect-ratio:1/1;border-radius:20em;border:2em solid rgba(255,255,255,.14);background:linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,.02));color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;transition:transform .08s,border-color .15s}
.slot svg{width:56%;height:56%;filter:drop-shadow(0 3em 5em #0009)}
.slot.empty{opacity:.55;cursor:default}
.slot.sel{border-color:#ffd23a;box-shadow:0 0 0 3em rgba(255,210,58,.3),0 0 22em rgba(255,210,58,.35)}
.slot:active:not(.empty){transform:scale(.95)}
.slot .sn{position:absolute;right:9em;bottom:7em;font-size:25em;font-family:'Arial Black',Impact,sans-serif;text-shadow:0 2em 4em #000}
.slot .sk{position:absolute;left:10em;top:7em;font-size:16em;opacity:.5;font-style:normal}
.slot .pipRow{position:absolute;left:0;right:0;bottom:8em;display:flex;justify-content:center;gap:5em}
.bag-info{margin-top:16em;min-height:82em;padding:12em 16em;border-radius:16em;background:rgba(0,0,0,.35)}
.bag-info .in{font-size:24em;font-family:'Arial Black',Impact,sans-serif}
.bag-info .id{font-size:20em;opacity:.8;margin-top:5em;line-height:1.3}
.bag-actions{display:flex;gap:12em;margin-top:14em}
.bag-actions button{flex:1;height:68em;border-radius:34em;border:0;font-size:26em;font-weight:900;letter-spacing:.06em;cursor:pointer;color:#fff;background:rgba(255,255,255,.14)}
.bag-actions button.use{flex:2;color:#2b1700;background:linear-gradient(#ffd23a,#ff9a1a);box-shadow:0 5em 0 #9a4a00}
.bag-actions button.use:disabled{opacity:.4;box-shadow:none}
.bag-actions button:active:not(:disabled){transform:translateY(3em)}

/* ---- full screen overlays (start / game over) */
.overlay{z-index:30;position:absolute;inset:0;pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(#000a,#000d);text-align:center;padding:40em}
.overlay h1{font-family:'Arial Black',Impact,system-ui,sans-serif;font-size:80em;margin:0;line-height:1;color:#ffcf3a;text-shadow:0 6em 0 #8a2a00,0 10em 30em #000;letter-spacing:2em}
.overlay h2{font-family:'Arial Black',Impact,system-ui,sans-serif;font-size:30em;margin:14em 0 0;color:#fff}
.overlay p{font-weight:700;font-size:23em;line-height:1.45;opacity:.92;max-width:600em}
.overlay .go{margin-top:30em;font-family:'Arial Black',Impact,system-ui,sans-serif;font-size:42em;padding:24em 72em;border-radius:70em;border:0;background:linear-gradient(#ffcf3a,#ff8a1a);color:#3a1600;box-shadow:0 8em 0 #9a4a00,0 12em 30em #000;pointer-events:auto;cursor:pointer}
.overlay .go:active{transform:translateY(4em)}

#ui.cine .top,#ui.cine .vign,#ui.cine .pois,#ui.cine .banner,#ui.cine .toast{display:none}
`;

const ICON = {
  heal: (c = '#ff4d6a', u = 0) => `<svg viewBox="0 0 64 64"><defs><linearGradient id="g${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><path d="M25 8h14a4 4 0 0 1 4 4v13h13a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H43v13a4 4 0 0 1-4 4H25a4 4 0 0 1-4-4V39H8a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4h13V12a4 4 0 0 1 4-4z" fill="url(#g${u})" stroke="${c}" stroke-width="2.5"/></svg>`,
  shield: (c = '#4aa8ff', u = 0) => `<svg viewBox="0 0 64 64"><defs><linearGradient id="g${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f3ff"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><path d="M32 5l22 8v15c0 14-9 25-22 31C19 53 10 42 10 28V13z" fill="url(#g${u})" stroke="#1d5fa8" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 12l15 5.5V28c0 9.5-6 17.5-15 22z" fill="#fff" opacity=".25"/></svg>`,
  speed: (c = '#ffd23a', u = 0) => `<svg viewBox="0 0 64 64"><defs><linearGradient id="g${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7c8"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><path d="M37 4L13 36h15l-4 24 27-34H36z" fill="url(#g${u})" stroke="#b87400" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
};
let iconUid = 0;
/** Item icon as inline SVG (each call gets its own gradient id, so icons keep rendering when another copy is display:none). */
export const itemIcon = (type) => (ICON[type] ? ICON[type](ITEMS[type].css, ++iconUid) : '');

export class HUD {
  constructor(root) {
    const st = document.createElement('style'); st.textContent = scaleCss(CSS); document.head.appendChild(st);
    this.style = st;
    this.el = document.createElement('div'); this.el.id = 'ui'; root.appendChild(this.el);
    this.el.innerHTML = `
      <div class="vign"></div><div class="pois"></div>
      <div class="top">
        <div class="col-l">
          <div class="card hp">
            <div class="row"><span class="hp-name head">THE ENFORCER</span><span class="hp-num">220 / 220</span></div>
            <div class="bar"><div class="ghost"></div><div class="fill"></div></div>
            <div class="scoreRow"><span>★</span><b class="score">0</b>
              <div class="buffs">
                <div class="chip bshield" style="color:${ITEMS.shield.css}">${itemIcon('shield')}<span class="pips"><i></i><i></i></span></div>
                <div class="chip bspeed" style="color:${ITEMS.speed.css}">${itemIcon('speed')}<span class="tt">0s</span><div class="t"></div></div>
              </div>
            </div>
          </div>
          <div class="card gangs"></div>
        </div>
        <div class="bossbar"><div class="bn head">BOSS</div><div class="bar"><div class="fill"></div></div><div class="bc head"></div></div>
        <div class="col-r">
          <canvas id="minimap" width="300" height="300"></canvas>
          <div class="tools"></div>
          <div class="combo"><span class="cn">0</span><small>COMBO</small></div>
        </div>
      </div>
      <div class="banner"></div><div class="toast"></div>
      <div class="bag"><div class="bag-card">
        <div class="bag-head"><h3 class="head">BACKPACK</h3><span class="cap"></span><button class="x" aria-label="Close">✕</button></div>
        <div class="bag-grid"></div>
        <div class="bag-info"><div class="in"></div><div class="id"></div></div>
        <div class="bag-actions"><button class="sort">SORT</button><button class="use">USE</button></div>
      </div></div>`;
    this.q = (s) => this.el.querySelector(s);
    this.hpBar = this.q('.hp .bar'); this.hpFill = this.q('.hp .fill'); this.hpGhost = this.q('.hp .ghost'); this.hpNum = this.q('.hp-num'); this.hpRatio = 1;
    this.chipShield = this.q('.bshield'); this.chipSpeed = this.q('.bspeed');
    this.scoreEl = this.q('.score');
    this.gangsEl = this.q('.gangs');
    this.comboEl = this.q('.combo'); this.comboN = this.q('.cn');
    this.banner = this.q('.banner'); this.toastEl = this.q('.toast'); this.toastT = 0;
    this.bossbar = this.q('.bossbar'); this.bossFill = this.q('.bossbar .fill'); this.bossName = this.q('.bn');
    this.vign = this.q('.vign'); this.pois = this.q('.pois'); this.bossCast = this.q('.bossbar .bc'); this.bossCastT = 0;
    this.mmCanvas = this.q('#minimap'); this.mm = this.mmCanvas.getContext('2d');
    this.tools = this.q('.tools');
    this.dmgPool = [];
    this.lastGangHtml = '';
    this.bannerT = 0;
    this.u = 1;
    this.buildBag();
  }

  /** Scale the interface: 1 design pixel (em) = u CSS pixels. */
  resize(w, h) {
    this.u = Math.max(0.5, Math.min(1.3, Math.min(w / 720, h / 760)));
    this.el.style.setProperty('--u', this.u + 'px');
  }

  /** Square tool button in the top-right column. Returns the element. */
  addTool(id, key) {
    const b = document.createElement('div');
    b.className = 'tool'; b.dataset.tool = id;
    b.innerHTML = `<div class="ic"></div><div class="lb"></div><div class="badge"></div><div class="kh">${key || ''}</div>`;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); });
    const rel = () => b.classList.remove('down');
    b.addEventListener('pointerup', rel); b.addEventListener('pointercancel', rel); b.addEventListener('pointerleave', rel);
    this.tools.appendChild(b);
    return b;
  }
  setTool(b, icon, label) { b.querySelector('.ic').innerHTML = icon; b.querySelector('.lb').textContent = label; }
  setBadge(b, n) { const e = b.querySelector('.badge'); e.textContent = n; e.style.display = n > 0 ? 'flex' : 'none'; }

  setPlayerHp(hp, max) {
    const r = Math.max(0, hp / max);
    this.hpFill.style.transform = `scaleX(${r})`;
    if (r >= this.hpRatio) { this.hpGhost.style.transition = 'none'; this.hpGhost.style.transform = `scaleX(${r})`; void this.hpGhost.offsetWidth; this.hpGhost.style.transition = ''; }
    else this.hpGhost.style.transform = `scaleX(${r})`;
    this.hpRatio = r;
    this.hpNum.textContent = `${Math.ceil(Math.max(0, hp))} / ${Math.round(max)}`;
    this.hpBar.classList.toggle('low', r > 0 && r < 0.3);
  }
  /** Buff chips under the health bar. shield = charges left (0..2), speedT = seconds left. */
  setBuffs(shield, speedT, speedMax = 10) {
    const s = this.chipShield, sp = this.chipSpeed;
    s.classList.toggle('on', shield > 0);
    if (shield !== this.lastShield) { this.lastShield = shield; s.querySelectorAll('.pips i').forEach((i, k) => i.classList.toggle('off', k >= shield)); }
    sp.classList.toggle('on', speedT > 0);
    if (speedT > 0) { sp.querySelector('.tt').textContent = Math.ceil(speedT) + 's'; sp.querySelector('.t').style.transform = `scaleX(${Math.min(1, speedT / speedMax)})`; }
  }
  setScore(s) { this.scoreEl.textContent = s.toLocaleString('en-US'); }
  setCombo(n) {
    if (n >= 2) { this.comboEl.style.opacity = 1; this.comboN.textContent = n + 'x'; } else this.comboEl.style.opacity = 0;
  }
  setGangs(progress, killsForBoss) {
    const html = progress.gangs.map((g, i) => {
      const G = GANGS[i];
      const cls = g.liberated ? 'done' : g.bossSpawned ? 'boss' : '';
      const v = g.liberated ? '✔ FREED' : g.bossSpawned ? '☠ BOSS' : `${g.kills}/${killsForBoss}`;
      const pct = g.liberated || g.bossSpawned ? 100 : Math.min(100, (g.kills / killsForBoss) * 100);
      return `<div class="g ${cls}"><span class="dot" style="background:${G.css};color:${G.css}"></span><span class="n">${G.name}</span><span class="pb"><div style="width:${pct}%;background:${G.css}"></div></span><span class="v">${v}</span></div>`;
    }).join('');
    if (html !== this.lastGangHtml) { this.gangsEl.innerHTML = html; this.lastGangHtml = html; }
  }
  showBanner(title, sub = '', dur = 2.4, color = '#fff') {
    this.banner.innerHTML = `<span style="color:${color}">${title}</span><small>${sub}</small>`;
    this.banner.style.opacity = 1; this.bannerT = dur;
  }
  /** Small pill message (item pickups, "bag full"...). */
  toast(text, color = '#fff', dur = 1.5) {
    this.toastEl.textContent = text; this.toastEl.style.color = color; this.toastEl.classList.add('on'); this.toastT = dur;
  }
  setBoss(name, hp, max, color = '#c56cff', phase = 1) {
    if (!name) { this.bossbar.style.display = 'none'; return; }
    this.bossbar.style.display = 'block';
    this.bossName.textContent = phase > 1 ? name + '  ☠ ENRAGED' : name;
    this.bossName.style.color = color;
    this.bossFill.style.background = `linear-gradient(${color},#2a0a40)`;
    this.bossFill.style.transform = `scaleX(${Math.max(0, hp / max)})`;
  }
  /** Name of the skill the boss is casting, shown under its health bar for a moment. */
  setBossCast(text, color = '#fff') {
    this.bossCast.textContent = text; this.bossCast.style.color = color; this.bossCast.classList.add('on'); this.bossCastT = 1.6;
  }
  setPoison(on) { this.pois.style.opacity = on ? 0.55 : 0; }
  hurt() { this.vign.style.opacity = 0.55; clearTimeout(this.vt); this.vt = setTimeout(() => (this.vign.style.opacity = 0), 180); }

  damageNumber(sx, sy, text, color = '#fff', big = false) {
    let d = this.dmgPool.find((x) => x.life <= 0);
    if (!d) {
      if (this.dmgPool.length > 24) return;
      const el = document.createElement('div'); el.className = 'dmg'; this.el.appendChild(el);
      d = { el, life: 0 }; this.dmgPool.push(d);
    }
    d.el.textContent = text; d.el.style.color = color; d.el.style.fontSize = em(big ? 44 : 30);
    d.x = sx + (Math.random() - 0.5) * 30 * this.u; d.y = sy; d.life = 0.8; d.el.style.opacity = 1;
  }

  update(dt) {
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.banner.style.opacity = 0; }
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.toastEl.classList.remove('on'); }
    if (this.bossCastT > 0) { this.bossCastT -= dt; if (this.bossCastT <= 0) this.bossCast.classList.remove('on'); }
    for (const d of this.dmgPool) {
      if (d.life <= 0) continue;
      d.life -= dt; d.y -= 70 * this.u * dt;
      d.el.style.transform = `translate(${d.x}px,${d.y}px) translate(-50%,-50%) scale(${1 + Math.max(0, d.life - 0.6) * 3})`;
      d.el.style.opacity = Math.min(1, d.life * 3);
      if (d.life <= 0) d.el.style.opacity = 0;
    }
  }

  drawMinimap(px, pz, facing, enemies, progress, hqs, bubbles = []) {
    const c = this.mm, S = this.mmCanvas.width, R = S / 2, range = 70, k = R / range;
    c.clearRect(0, 0, S, S);
    c.save();
    c.beginPath(); c.arc(R, R, R, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#1b1e22'; c.fillRect(0, 0, S, S);
    // territory tint
    for (let gx = -range; gx < range; gx += 10) for (let gz = -range; gz < range; gz += 10) {
      const wx = px + gx + 5, wz = pz + gz + 5;
      if (Math.abs(wx) > HALF || Math.abs(wz) > HALF) continue;
      const t = territoryAt(wx, wz);
      if (t < 0) c.fillStyle = '#3a3f46';
      else c.fillStyle = progress.gangs[t].liberated ? '#2f5a3a' : GANGS[t].css + '55';
      c.fillRect(R + gx * k, R + gz * k, 10 * k + 1, 10 * k + 1);
    }
    hqs.forEach((h, i) => {
      if (progress.gangs[i].liberated) return;
      let hx = (h.x - px) * k, hz = (h.z - pz) * k;
      const d = Math.hypot(hx, hz);
      if (d > R - 14) { hx *= (R - 14) / d; hz *= (R - 14) / d; }
      c.fillStyle = GANGS[i].css; c.strokeStyle = '#fff'; c.lineWidth = 3;
      c.beginPath(); c.rect(R + hx - 10, R + hz - 10, 20, 20); c.fill(); c.stroke();
    });
    for (const e of enemies) {
      if (e.dead || !e.active) continue;
      const ex = (e.x - px) * k, ez = (e.z - pz) * k;
      if (Math.hypot(ex, ez) > R) continue;
      c.fillStyle = e.isBoss ? '#c56cff' : GANGS[e.gang].css;
      c.beginPath(); c.arc(R + ex, R + ez, e.isBoss ? 10 : 5.5, 0, Math.PI * 2); c.fill();
    }
    // item bubbles: coloured rings (clamped to the edge so you can follow them)
    for (const b of bubbles) {
      let bx = (b.x - px) * k, bz = (b.z - pz) * k;
      const d = Math.hypot(bx, bz), edge = d > R - 12;
      if (edge) { bx *= (R - 12) / d; bz *= (R - 12) / d; }
      c.strokeStyle = ITEMS[b.type].css; c.fillStyle = '#fff'; c.lineWidth = 3.5;
      c.beginPath(); c.arc(R + bx, R + bz, edge ? 6 : 8, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(R + bx, R + bz, 2.6, 0, Math.PI * 2); c.fill();
    }
    c.translate(R, R); c.rotate(-facing + Math.PI);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -14); c.lineTo(10, 11); c.lineTo(-10, 11); c.closePath(); c.fill();
    c.restore();
  }

  // ------------------------------------------------------------------ backpack
  buildBag() {
    this.bagEl = this.q('.bag');
    this.bagGrid = this.q('.bag-grid');
    this.bagSel = -1;
    this.bagHandlers = {};
    for (let i = 0; i < BAG_SLOTS; i++) {
      const s = document.createElement('button');
      s.className = 'slot empty'; s.dataset.i = i;
      s.innerHTML = `<i class="sk">${i + 1}</i><span class="si"></span><b class="sn"></b>`;
      s.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const now = performance.now();
        const dbl = this.bagSel === i && now - (this.lastSlotTap || 0) < 380;
        this.lastSlotTap = now;
        this.selectSlot(i);
        if (dbl && this.bagData && this.bagData.slots[i] && this.bagHandlers.use) this.bagHandlers.use(i);
      });
      this.bagGrid.appendChild(s);
    }
    const tap = (sel, fn) => this.q(sel).addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
    tap('.bag .x', () => this.bagHandlers.close && this.bagHandlers.close());
    tap('.bag .sort', () => this.bagHandlers.sort && this.bagHandlers.sort());
    tap('.bag .use', () => { if (this.bagSel >= 0 && this.bagHandlers.use) this.bagHandlers.use(this.bagSel); });
    this.bagEl.addEventListener('pointerdown', (e) => { if (e.target === this.bagEl && this.bagHandlers.close) this.bagHandlers.close(); });
  }
  setBagHandlers(h) { this.bagHandlers = h; }
  get bagOpen() { return this.bagEl.classList.contains('on'); }
  openBag(bag) { this.bagEl.classList.add('on'); this.refreshBag(bag); if (this.bagSel < 0 || !bag.slots[this.bagSel]) this.selectSlot(bag.slots.findIndex((s) => s) );  }
  closeBag() { this.bagEl.classList.remove('on'); }
  selectSlot(i) {
    this.bagSel = i;
    this.bagGrid.querySelectorAll('.slot').forEach((el, k) => el.classList.toggle('sel', k === i));
    this.renderBagInfo();
  }
  refreshBag(bag) {
    this.bagData = bag;
    const els = this.bagGrid.children;
    let used = 0;
    bag.slots.forEach((s, i) => {
      const el = els[i];
      el.classList.toggle('empty', !s);
      el.querySelector('.si').innerHTML = s ? itemIcon(s.type) : '';
      el.querySelector('.sn').textContent = s && s.n > 1 ? '×' + s.n : '';
      if (s) used++;
    });
    this.q('.bag .cap').textContent = `${used} / ${BAG_SLOTS} slots • stack ${STACK_MAX}`;
    this.renderBagInfo();
  }
  renderBagInfo() {
    const s = this.bagData && this.bagSel >= 0 ? this.bagData.slots[this.bagSel] : null;
    const it = s ? ITEMS[s.type] : null;
    this.q('.bag-info .in').textContent = it ? `${it.name}  ×${s.n}` : 'Backpack';
    this.q('.bag-info .in').style.color = it ? it.css : '#fff';
    this.q('.bag-info .id').textContent = it ? it.desc : 'Walk into floating bubbles to collect items. Tap an item, then USE.';
    this.q('.bag .use').disabled = !it;
  }

  overlay(html) {
    this.closeOverlay();
    const o = document.createElement('div'); o.className = 'overlay'; o.innerHTML = html;
    this.el.appendChild(o); this.ov = o;
    return o;
  }
  closeOverlay() { if (this.ov) { this.ov.remove(); this.ov = null; } }

  dispose() {
    clearTimeout(this.vt);
    this.el.remove();
    if (this.style) this.style.remove();
  }
}

/** Touch + keyboard controls. Read state via .input; pressed flags are one-shot (consume()). */
export class Controls {
  constructor(hud, skills) {
    const ui = hud.el;
    this.hud = hud;
    this.input = { mx: 0, mz: 0, attack: false, dodge: false, skill1: false, skill2: false, skill3: false };
    this.keys = new Set();
    this.enabled = false;
    const joy = document.createElement('div'); joy.id = 'joy';
    joy.innerHTML = '<div class="jbase"></div><div class="jknob"></div>';
    ui.appendChild(joy);
    this.joy = joy; this.base = joy.querySelector('.jbase'); this.knob = joy.querySelector('.jknob');
    this.jid = null; this.jx = 0; this.jy = 0;
    this.relayout();
    joy.addEventListener('pointerdown', (e) => {
      if (this.jid !== null) return;
      e.preventDefault();
      this.jid = e.pointerId; joy.setPointerCapture && joy.setPointerCapture(e.pointerId);
      const r = joy.getBoundingClientRect();
      this.ox = e.clientX - r.left; this.oy = e.clientY - r.top;
      this.placeJoy(this.ox, this.oy, 0, 0);
    });
    const move = (e) => {
      if (e.pointerId !== this.jid) return;
      const r = joy.getBoundingClientRect(), max = 90 * hud.u;
      let dx = e.clientX - r.left - this.ox, dy = e.clientY - r.top - this.oy;
      const d = Math.hypot(dx, dy);
      if (d > max) { dx *= max / d; dy *= max / d; }
      this.jx = dx / max; this.jy = dy / max;
      this.placeJoy(this.ox, this.oy, dx, dy);
    };
    const up = (e) => {
      if (e.pointerId !== this.jid) return;
      this.jid = null; this.jx = this.jy = 0;
      this.relayout();
    };
    joy.addEventListener('pointermove', move);
    joy.addEventListener('pointerup', up);
    joy.addEventListener('pointercancel', up);

    // Action buttons on an arc around ATTACK (bottom-right). Angle 0 = straight left of ATTACK, 90 = straight above it.
    const A = 150, edge = 26, cx = edge + A / 2, R = 218, S = 90;
    const arc = (deg, size) => { const a = (deg * Math.PI) / 180; return [cx + R * Math.cos(a) - size / 2, cx + R * Math.sin(a) - size / 2]; };
    const defs = [   // key, icon, label, size, [right,bottom], bg, hint
      ['attack', '👊', 'ATTACK', A, [edge, edge], 'radial-gradient(circle at 40% 30%,#ff8a5c,#b3200f)', 'J'],
      ['dodge', '💨', 'DODGE', S, arc(2, S), 'radial-gradient(circle at 40% 30%,#7fd8ff,#1b6ea8)', 'K'],
      ['skill1', '💥', skills[0], S, arc(31, S), 'radial-gradient(circle at 40% 30%,#ffd96b,#b86d00)', '1'],
      ['skill2', '🌀', skills[1], S, arc(60, S), 'radial-gradient(circle at 40% 30%,#cf9bff,#5d22a6)', '2'],
      ['skill3', '🐂', skills[2], S, arc(89, S), 'radial-gradient(circle at 40% 30%,#8dff98,#1d8a2c)', '3'],
    ];
    this.btns = {};
    for (const [k, ic, lb, size, [right, bottom], bg, hint] of defs) {
      const b = document.createElement('div');
      b.className = 'btn';
      b.style.cssText = `width:${em(size)};height:${em(size)};right:${em(right)};bottom:${em(bottom)};background:${bg}`;
      b.innerHTML = `<div class="ic" style="font-size:${em(size * 0.36)}">${ic}</div><div class="lb">${lb} <i class="kh">[${hint}]</i></div>` + (k.startsWith('skill') ? '<div class="cd"></div><div class="cdt"></div>' : '');
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.classList.add('down');
        if (this.enabled) this.input[k] = true;
        if (k === 'attack') this.attackHeld = true;
        this.onAnyPress && this.onAnyPress();
      });
      const rel = () => { b.classList.remove('down'); if (k === 'attack') this.attackHeld = false; };
      b.addEventListener('pointerup', rel); b.addEventListener('pointercancel', rel); b.addEventListener('pointerleave', rel);
      ui.appendChild(b);
      this.btns[k] = b;
    }

    this.onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (this.keys.has(k)) return;
      this.keys.add(k);
      if (!this.enabled) return;
      if (k === 'j' || k === 'enter') this.input.attack = true;
      if (k === 'k' || k === ' ' || k === 'shift') this.input.dodge = true;
      if (k === '1' || k === 'u') this.input.skill1 = true;
      if (k === '2' || k === 'i') this.input.skill2 = true;
      if (k === '3' || k === 'o') this.input.skill3 = true;
      this.onAnyPress && this.onAnyPress();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    };
    this.onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this.onBlur = () => this.keys.clear();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  /** Release the window-level listeners (the DOM goes away with the HUD). */
  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  /** Put the idle joystick back at its resting spot (call after a resize too). */
  relayout() {
    if (this.jid !== null) return;
    const u = this.hud.u, h = this.joy.clientHeight || 300 * u;
    this.placeJoy(150 * u, h - 140 * u, 0, 0);
  }

  placeJoy(x, y, dx, dy) {
    this.base.style.transform = `translate(${x}px,${y}px)`;
    this.knob.style.transform = `translate(${x + dx}px,${y + dy}px)`;
  }

  setVisible(v) {
    this.joy.style.display = v ? 'block' : 'none';
    for (const k in this.btns) this.btns[k].style.display = v ? 'flex' : 'none';
    for (const t of this.hud.tools.children) t.style.display = v ? 'flex' : 'none';
    if (v) this.relayout();
  }

  /** Movement in world space: screen up = world -z (camera looks north). */
  poll() {
    let kx = 0, kz = 0;
    const K = this.keys;
    if (K.has('a') || K.has('arrowleft')) kx -= 1;
    if (K.has('d') || K.has('arrowright')) kx += 1;
    if (K.has('w') || K.has('arrowup')) kz -= 1;
    if (K.has('s') || K.has('arrowdown')) kz += 1;
    if (kx || kz) { const d = Math.hypot(kx, kz); this.input.mx = kx / d; this.input.mz = kz / d; }
    else { this.input.mx = this.jx; this.input.mz = this.jy; }
    if (this.attackHeld && this.enabled) this.input.attackHold = true; else this.input.attackHold = false;
    return this.input;
  }

  consume() {
    const i = this.input;
    i.attack = i.dodge = i.skill1 = i.skill2 = i.skill3 = false;
  }

  setCooldown(k, remaining, total) {
    const b = this.btns[k]; if (!b) return;
    const cd = b.querySelector('.cd'), t = b.querySelector('.cdt');
    const p = total > 0 ? remaining / total : 0;
    cd.style.setProperty('--p', p + 'turn');
    t.textContent = remaining > 0 ? Math.ceil(remaining) : '';
  }
}
