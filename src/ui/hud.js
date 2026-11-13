// DOM HUD + touch controls (joystick, attack, dodge, 3 skills) + keyboard.
import { GANGS, HALF, territoryAt } from '../logic/city.js';

const CSS = `
#ui{position:absolute;inset:0;pointer-events:none;font-family:'Arial Black',Impact,system-ui,sans-serif;color:#fff;user-select:none;-webkit-user-select:none;overflow:hidden}
#ui *{box-sizing:border-box}
.hpwrap{position:absolute;left:24px;top:24px;width:360px}
.hpname{font-size:22px;letter-spacing:2px;text-shadow:0 2px 4px #000}
.hpbar{height:26px;background:rgba(0,0,0,.6);border:2px solid #fff3;border-radius:6px;overflow:hidden;margin-top:6px}
.hpfill{height:100%;width:100%;background:linear-gradient(#ff6a4d,#c81e1e);transform-origin:left;transition:transform .15s}
.score{font-size:30px;margin-top:10px;text-shadow:0 2px 6px #000}
.gangs{margin-top:10px;font-size:17px;line-height:26px;text-shadow:0 2px 4px #000;font-family:system-ui,sans-serif;font-weight:800}
.gangs .dot{display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:8px;vertical-align:-1px;border:2px solid #0008}
.gangs .done{opacity:.6;text-decoration:line-through}
#minimap{position:absolute;right:20px;top:20px;width:210px;height:210px;border-radius:50%;border:3px solid #fff6;background:#0009;box-shadow:0 4px 14px #0008}
.combo{position:absolute;right:30px;top:450px;text-align:right;font-size:64px;line-height:1;color:#ffd23a;text-shadow:0 4px 0 #a23c00,0 6px 12px #000;opacity:0;transition:opacity .2s}
.combo small{display:block;font-size:22px;color:#fff;text-shadow:0 2px 4px #000}
.banner{position:absolute;left:0;right:0;top:360px;text-align:center;font-size:40px;text-shadow:0 3px 10px #000;opacity:0;transition:opacity .4s;padding:0 30px}
.banner small{display:block;font-size:22px;font-family:system-ui;font-weight:800;opacity:.9}
.bossbar{position:absolute;left:110px;right:110px;top:250px;display:none;text-align:center;font-size:20px;text-shadow:0 2px 4px #000}
.bossbar .hpbar{height:18px}
.bossbar .hpfill{background:linear-gradient(#c56cff,#6a1ea8)}
#joy{position:absolute;left:0;bottom:0;width:50%;height:48%;pointer-events:auto;touch-action:none}
.jbase{position:absolute;width:230px;height:230px;margin:-115px 0 0 -115px;border-radius:50%;background:radial-gradient(#ffffff22,#ffffff0a);border:3px solid #ffffff44}
.jknob{position:absolute;width:100px;height:100px;margin:-50px 0 0 -50px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#bbb);opacity:.85;box-shadow:0 4px 10px #0007}
.btn{position:absolute;border-radius:50%;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center;flex-direction:column;border:4px solid #ffffff66;box-shadow:0 6px 14px #0009;overflow:hidden;transition:transform .06s}
.btn.down{transform:scale(.9)}
.btn .ic{font-size:44px;line-height:1;filter:drop-shadow(0 2px 2px #0008)}
.btn .lb{font-size:13px;font-family:system-ui;font-weight:900;margin-top:2px;text-shadow:0 1px 3px #000;white-space:nowrap}
.btn .cd{position:absolute;inset:0;background:conic-gradient(#000b var(--p,0turn),transparent 0);border-radius:50%}
.btn .cdt{position:absolute;font-size:34px;text-shadow:0 2px 4px #000}
.overlay{position:absolute;inset:0;pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(#000a,#000d);text-align:center;padding:40px}
.overlay h1{font-size:76px;margin:0;line-height:1;color:#ffcf3a;text-shadow:0 6px 0 #8a2a00,0 10px 30px #000;letter-spacing:2px}
.overlay h2{font-size:30px;margin:14px 0 0;color:#fff}
.overlay p{font-family:system-ui;font-weight:700;font-size:22px;line-height:1.45;opacity:.92;max-width:560px}
.overlay .go{margin-top:30px;font-size:40px;padding:26px 70px;border-radius:60px;border:0;background:linear-gradient(#ffcf3a,#ff8a1a);color:#3a1600;font-family:inherit;box-shadow:0 8px 0 #9a4a00,0 12px 30px #000;pointer-events:auto}
.overlay .go:active{transform:translateY(4px)}
.dmg{position:absolute;left:0;top:0;font-size:30px;color:#fff;text-shadow:0 2px 0 #000,0 0 8px #000;will-change:transform,opacity;pointer-events:none}
.vign{position:absolute;inset:0;box-shadow:inset 0 0 160px 40px #c00;opacity:0;transition:opacity .25s;pointer-events:none}
#ui.cine .hpwrap,#ui.cine #minimap,#ui.cine .combo,#ui.cine .bossbar,#ui.cine .banner,#ui.cine .vign{display:none}
`;

export class HUD {
  constructor(root) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    this.style = st;
    this.el = document.createElement('div'); this.el.id = 'ui'; root.appendChild(this.el);
    this.el.innerHTML = `
      <div class="vign"></div>
      <div class="hpwrap"><div class="hpname">THE ENFORCER</div><div class="hpbar"><div class="hpfill"></div></div>
        <div class="score">0</div><div class="gangs"></div></div>
      <canvas id="minimap" width="210" height="210"></canvas>
      <div class="combo"><span class="cn">0</span><small>COMBO</small></div>
      <div class="bossbar"><div class="bn">BOSS</div><div class="hpbar"><div class="hpfill"></div></div></div>
      <div class="banner"></div>`;
    this.q = (s) => this.el.querySelector(s);
    this.hpFill = this.q('.hpwrap .hpfill');
    this.scoreEl = this.q('.score');
    this.gangsEl = this.q('.gangs');
    this.comboEl = this.q('.combo'); this.comboN = this.q('.cn');
    this.banner = this.q('.banner');
    this.bossbar = this.q('.bossbar'); this.bossFill = this.q('.bossbar .hpfill'); this.bossName = this.q('.bn');
    this.vign = this.q('.vign');
    this.mm = this.q('#minimap').getContext('2d');
    this.dmgPool = [];
    this.lastGangHtml = '';
    this.bannerT = 0;
  }

  setPlayerHp(hp, max) { this.hpFill.style.transform = `scaleX(${Math.max(0, hp / max)})`; }
  setScore(s) { this.scoreEl.textContent = s.toLocaleString('en-US'); }
  setCombo(n) {
    if (n >= 2) { this.comboEl.style.opacity = 1; this.comboN.textContent = n + 'x'; } else this.comboEl.style.opacity = 0;
  }
  setGangs(progress, killsForBoss) {
    const html = progress.gangs.map((g, i) => {
      const G = GANGS[i];
      const st = g.liberated ? '✔ FREED' : g.bossSpawned ? '☠ BOSS APPEARS!' : `${g.kills}/${killsForBoss}`;
      return `<div class="${g.liberated ? 'done' : ''}"><span class="dot" style="background:${G.css}"></span>${G.name} — ${st}</div>`;
    }).join('');
    if (html !== this.lastGangHtml) { this.gangsEl.innerHTML = html; this.lastGangHtml = html; }
  }
  showBanner(title, sub = '', dur = 2.4, color = '#fff') {
    this.banner.innerHTML = `<span style="color:${color}">${title}</span><small>${sub}</small>`;
    this.banner.style.opacity = 1; this.bannerT = dur;
  }
  setBoss(name, hp, max) {
    if (!name) { this.bossbar.style.display = 'none'; return; }
    this.bossbar.style.display = 'block';
    this.bossName.textContent = name;
    this.bossFill.style.transform = `scaleX(${Math.max(0, hp / max)})`;
  }
  hurt() { this.vign.style.opacity = 0.55; clearTimeout(this.vt); this.vt = setTimeout(() => (this.vign.style.opacity = 0), 180); }

  damageNumber(sx, sy, text, color = '#fff', big = false) {
    let d = this.dmgPool.find((x) => x.life <= 0);
    if (!d) {
      if (this.dmgPool.length > 24) return;
      const el = document.createElement('div'); el.className = 'dmg'; this.el.appendChild(el);
      d = { el, life: 0 }; this.dmgPool.push(d);
    }
    d.el.textContent = text; d.el.style.color = color; d.el.style.fontSize = big ? '44px' : '30px';
    d.x = sx + (Math.random() - 0.5) * 30; d.y = sy; d.life = 0.8; d.el.style.opacity = 1;
  }

  update(dt) {
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.banner.style.opacity = 0; }
    for (const d of this.dmgPool) {
      if (d.life <= 0) continue;
      d.life -= dt; d.y -= 70 * dt;
      d.el.style.transform = `translate(${d.x}px,${d.y}px) translate(-50%,-50%) scale(${1 + Math.max(0, d.life - 0.6) * 3})`;
      d.el.style.opacity = Math.min(1, d.life * 3);
      if (d.life <= 0) d.el.style.opacity = 0;
    }
  }

  drawMinimap(px, pz, facing, enemies, progress, hqs) {
    const c = this.mm, R = 105, range = 70, k = R / range;
    c.clearRect(0, 0, 210, 210);
    c.save();
    c.beginPath(); c.arc(R, R, R, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#1b1e22'; c.fillRect(0, 0, 210, 210);
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
      if (d > R - 10) { hx *= (R - 10) / d; hz *= (R - 10) / d; }
      c.fillStyle = GANGS[i].css; c.strokeStyle = '#fff'; c.lineWidth = 2;
      c.beginPath(); c.rect(R + hx - 7, R + hz - 7, 14, 14); c.fill(); c.stroke();
    });
    for (const e of enemies) {
      if (e.dead || !e.active) continue;
      const ex = (e.x - px) * k, ez = (e.z - pz) * k;
      if (Math.hypot(ex, ez) > R) continue;
      c.fillStyle = e.isBoss ? '#c56cff' : GANGS[e.gang].css;
      c.beginPath(); c.arc(R + ex, R + ez, e.isBoss ? 7 : 4, 0, Math.PI * 2); c.fill();
    }
    c.translate(R, R); c.rotate(-facing + Math.PI);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -10); c.lineTo(7, 8); c.lineTo(-7, 8); c.closePath(); c.fill();
    c.restore();
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
  constructor(ui, skills) {
    this.input = { mx: 0, mz: 0, attack: false, dodge: false, skill1: false, skill2: false, skill3: false };
    this.keys = new Set();
    this.enabled = false;
    const joy = document.createElement('div'); joy.id = 'joy';
    joy.innerHTML = '<div class="jbase"></div><div class="jknob"></div>';
    ui.appendChild(joy);
    this.joy = joy; this.base = joy.querySelector('.jbase'); this.knob = joy.querySelector('.jknob');
    this.restX = 170; this.restY = joy.clientHeight ? joy.clientHeight - 200 : 414;
    this.jid = null; this.jx = 0; this.jy = 0;
    this.placeJoy(this.restX, this.restY, 0, 0);
    joy.addEventListener('pointerdown', (e) => {
      if (this.jid !== null) return;
      e.preventDefault();
      this.jid = e.pointerId; joy.setPointerCapture && joy.setPointerCapture(e.pointerId);
      const r = joy.getBoundingClientRect(), s = r.width / joy.offsetWidth || 1;
      this.ox = (e.clientX - r.left) / s; this.oy = (e.clientY - r.top) / s; this.scale = s;
      this.placeJoy(this.ox, this.oy, 0, 0);
    });
    const move = (e) => {
      if (e.pointerId !== this.jid) return;
      const r = joy.getBoundingClientRect(), s = this.scale;
      let dx = (e.clientX - r.left) / s - this.ox, dy = (e.clientY - r.top) / s - this.oy;
      const d = Math.hypot(dx, dy), max = 95;
      if (d > max) { dx *= max / d; dy *= max / d; }
      this.jx = dx / max; this.jy = dy / max;
      this.placeJoy(this.ox, this.oy, dx, dy);
    };
    const up = (e) => {
      if (e.pointerId !== this.jid) return;
      this.jid = null; this.jx = this.jy = 0;
      this.restY = joy.clientHeight - 200;
      this.placeJoy(this.restX, this.restY, 0, 0);
    };
    joy.addEventListener('pointermove', move);
    joy.addEventListener('pointerup', up);
    joy.addEventListener('pointercancel', up);

    // buttons: [key, icon, label, size, right, bottom, bg]
    const defs = [
      ['attack', '👊', 'ATTACK', 170, 50, 150, 'radial-gradient(circle at 40% 35%,#ff7a4d,#b3200f)'],
      ['dodge', '💨', 'DODGE', 112, 240, 60, 'radial-gradient(circle at 40% 35%,#6fd0ff,#1b6ea8)'],
      ['skill1', '💥', skills[0], 110, 250, 210, 'radial-gradient(circle at 40% 35%,#ffcf5a,#b86d00)'],
      ['skill2', '🌀', skills[1], 110, 180, 345, 'radial-gradient(circle at 40% 35%,#c58bff,#5d22a6)'],
      ['skill3', '🐂', skills[2], 110, 40, 360, 'radial-gradient(circle at 40% 35%,#7dff8a,#1d8a2c)'],
    ];
    this.btns = {};
    for (const [k, ic, lb, size, right, bottom, bg] of defs) {
      const b = document.createElement('div');
      b.className = 'btn';
      b.style.cssText = `width:${size}px;height:${size}px;right:${right}px;bottom:${bottom}px;background:${bg}`;
      b.innerHTML = `<div class="ic" style="font-size:${size * 0.36}px">${ic}</div><div class="lb">${lb}</div>` + (k.startsWith('skill') ? '<div class="cd"></div><div class="cdt"></div>' : '');
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

  placeJoy(x, y, dx, dy) {
    this.base.style.transform = `translate(${x}px,${y}px)`;
    this.knob.style.transform = `translate(${x + dx}px,${y + dy}px)`;
  }

  setVisible(v) {
    this.joy.style.display = v ? 'block' : 'none';
    for (const k in this.btns) this.btns[k].style.display = v ? 'flex' : 'none';
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
