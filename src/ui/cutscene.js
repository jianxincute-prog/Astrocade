// Opening cutscene (render + UI). A taxi pulls up, the Enforcer steps out, his phone rings and the
// caller gives him the mission: wipe out every thug in the three gang territories.
// All timing / motion comes from the pure script in src/logic/intro.js; this file builds the taxi and
// phone meshes, the letterbox / subtitle / mission-card DOM, the synthesized sounds and drives the
// game's player rig + camera while it runs. The player can skip at any time.
import {
  TL, STAGE, CALLER, HERO, CALL_END, CARD_START, TOTAL,
  taxiAt, heroAt, phoneAt, subtitleAt, cameraAt, fadeAt, ringStartsBetween, angleDelta,
} from '../logic/intro.js';
import { GANGS, groundHeight } from '../logic/city.js';
import { scaleCss } from './hud.js';

const CSS = `
.cs{position:absolute;inset:0;pointer-events:none;overflow:hidden;font-family:'Arial Black',Impact,system-ui,sans-serif;color:#fff}
.cs *{box-sizing:border-box}
.cs-bar{position:absolute;left:0;right:0;height:120em;background:#000;transition:transform .8s cubic-bezier(.2,.8,.2,1)}
.cs-bar.t{top:0;transform:translateY(-100%)}
.cs-bar.b{bottom:0;transform:translateY(100%)}
.cs.on .cs-bar{transform:none}
.cs-loc{position:absolute;left:0;right:0;top:230em;text-align:center;font-size:54em;letter-spacing:10em;text-shadow:0 4em 18em #000;opacity:0;transition:opacity .6s}
.cs-loc small{display:block;margin:12em auto 0;width:120em;height:4em;background:#ffcf3a;box-shadow:0 0 12em #ffcf3a}
.cs-call{position:absolute;left:50%;top:150em;width:460em;margin-left:-230em;display:flex;align-items:center;gap:18em;padding:14em 20em;border-radius:22em;background:rgba(10,14,12,.78);border:2em solid #7dff8a66;opacity:0;transform:translateY(-20em);transition:opacity .35s,transform .35s}
.cs-call.show{opacity:1;transform:none}
.cs-call .av{width:64em;height:64em;border-radius:50%;background:#1f8a3a;display:flex;align-items:center;justify-content:center;font-size:32em;flex:none}
.cs-call.ring .av{animation:csring .35s infinite alternate}
.cs-call .nm{font-size:26em;letter-spacing:1em}
.cs-call .st{font-family:system-ui,sans-serif;font-weight:800;font-size:20em;color:#7dff8a;margin-top:4em}
@keyframes csring{from{transform:rotate(-14deg) scale(1)}to{transform:rotate(14deg) scale(1.1)}}
.cs-sub{position:absolute;left:36em;right:36em;bottom:158em;min-height:130em;padding:18em 24em;border-radius:20em;background:rgba(0,0,0,.62);opacity:0;transition:opacity .25s}
.cs-sub.show{opacity:1}
.cs-sub .who{font-size:20em;letter-spacing:3em;margin-bottom:8em}
.cs-sub .tx{font-family:system-ui,sans-serif;font-weight:800;font-size:30em;line-height:1.3;text-shadow:0 2em 4em #000}
.cs-mission{position:absolute;left:0;right:0;top:380em;padding:46em 0 52em;background:linear-gradient(transparent,rgba(0,0,0,.72) 22%,rgba(0,0,0,.72) 78%,transparent);text-align:center;opacity:0;transform:scale(1.15);transition:opacity .5s,transform .5s}
.cs-mission.show{opacity:1;transform:none}
.cs-mission .mh{font-size:26em;letter-spacing:8em;color:#ff5a3a;text-shadow:0 3em 8em #000}
.cs-mission .mt{font-size:58em;line-height:1.05;margin:12em 40em 0;color:#ffcf3a;text-shadow:0 6em 0 #8a2a00,0 10em 30em #000}
.cs-mission .mg{margin:26em auto 0;width:520em;text-align:left;font-family:system-ui,sans-serif;font-weight:800;font-size:24em;line-height:1.7;text-shadow:0 2em 4em #000;background:rgba(0,0,0,.5);border-radius:16em;padding:12em 24em}
.cs-mission .mg b{float:right;opacity:.7;font-weight:700}
.cs-mission .dot{display:inline-block;width:16em;height:16em;border-radius:50%;margin-right:12em;vertical-align:-1px;border:2em solid #0008}
.cs-skip{position:absolute;right:24em;top:12em;width:190em;height:96em;border-radius:48em;border:2em solid #fff5;background:rgba(0,0,0,.55);color:#fff;font:inherit;font-size:24em;pointer-events:auto;touch-action:none}
.cs-skip:active{transform:scale(.94)}
.cs-fade{position:absolute;inset:0;background:#000;opacity:1}
`;

const DIRS = ['North', 'Southeast', 'Southwest'];
const PHONE_FIST = { pos: [0.0, -0.08, 0.07], rot: [-0.2, 0, 0] }; // phone prop in the right fist's space

export class Cutscene {
  /** @param game Game shell  @param spawn {x,z} where the hero ends up  @param onDone called once the scene finished */
  constructor(game, spawn, onDone) {
    this.g = game; this.T = game.T; this.spawn = spawn; this.onDone = onDone;
    this.t = 0; this.prevT = -1; this.active = true; this.pose = null;
    this.skipFade = 0; this.skipping = false;
    this.lastChars = 0; this.lastLine = null; this.cardShown = false; this.sounded = new Set();
    this.buildDom();
    this.buildTaxi();
    this.buildPhone();
    // take over the hero rig, HUD and camera
    const g = game, p = g.player;
    g.hud.el.classList.add('cine');
    g.controls.setVisible(false); g.controls.enabled = false; g.controls.consume();
    p.x = STAGE.x; p.z = STAGE.z; p.moveSpeed = 0; p.action = null;
    p.facing = heroAt(0).facing;
    g.playerChar.group.visible = false; g.playerRing.visible = false;
    g.camera.clearViewOffset(); g.camera.fov = 40; g.camera.updateProjectionMatrix();
    g.audio.engineStart();
    this.onKey = (e) => { if (['Enter', 'Escape', ' '].includes(e.key)) { e.preventDefault(); this.skip(); } };
    window.addEventListener('keydown', this.onKey);
    requestAnimationFrame(() => this.root.classList.add('on'));
    this.update(0);
  }

  // ------------------------------------------------------------------ DOM
  buildDom() {
    const g = this.g;
    this.style = document.createElement('style'); this.style.textContent = scaleCss(CSS); document.head.appendChild(this.style);
    const r = this.root = document.createElement('div'); r.className = 'cs';
    r.innerHTML = `
      <div class="cs-bar t"></div><div class="cs-bar b"></div>
      <div class="cs-loc">DOWNTOWN<small></small></div>
      <div class="cs-call"><div class="av">📞</div><div><div class="nm">${CALLER.name}</div><div class="st">Incoming call…</div></div></div>
      <div class="cs-sub"><div class="who"></div><div class="tx"></div></div>
      <div class="cs-mission"><div class="mh">NEW MISSION</div><div class="mt">WIPE OUT<br>ALL THUGS</div>
        <div class="mg">${GANGS.map((x, i) => `<div><span class="dot" style="background:${x.css}"></span>${x.name}<b>${DIRS[i]}</b></div>`).join('')}</div></div>
      <button class="cs-skip">SKIP ▸</button>
      <div class="cs-fade"></div>`;
    g.hud.el.appendChild(r);
    const q = (s) => r.querySelector(s);
    this.el = { loc: q('.cs-loc'), call: q('.cs-call'), callSt: q('.cs-call .st'), sub: q('.cs-sub'), who: q('.cs-sub .who'), tx: q('.cs-sub .tx'), mission: q('.cs-mission'), fade: q('.cs-fade') };
    q('.cs-skip').addEventListener('pointerdown', (e) => { e.preventDefault(); this.skip(); });
  }

  // ------------------------------------------------------------------ taxi + phone meshes
  buildTaxi() {
    const T = this.T;
    const std = (color, o = {}) => new T.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25, ...o });
    const paint = std(0xf2b705), dark = std(0x15181c, { roughness: 0.7 }), tyre = std(0x0c0c0c, { roughness: 0.95, metalness: 0 });
    const glass = std(0x1b2733, { roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.88 });
    const head = new T.MeshBasicMaterial({ color: 0xfff2c4, toneMapped: false });
    this.tailMat = new T.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false });
    // roof sign: lit "TAXI" plate
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 48;
    const x = cv.getContext('2d'); x.fillStyle = '#fff6b0'; x.fillRect(0, 0, 128, 48);
    x.fillStyle = '#111'; x.font = '900 34px Arial Black, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('TAXI', 64, 26);
    const signTex = new T.CanvasTexture(cv);
    const signFace = new T.MeshBasicMaterial({ map: signTex, toneMapped: false }), signSide = new T.MeshBasicMaterial({ color: 0xfff6b0, toneMapped: false });

    const grp = this.taxi = new T.Group();
    const box = (w, h, d, mat, px, py, pz, parent = grp, shadow = true) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
      m.position.set(px, py, pz); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
    };
    box(1.9, 0.62, 4.3, paint, 0, 0.69, 0);                 // lower body
    box(1.84, 0.16, 1.2, paint, 0, 1.06, 1.55);             // hood
    box(1.84, 0.14, 0.9, paint, 0, 1.05, -1.7);             // trunk
    box(1.68, 0.46, 2.14, glass, 0, 1.25, -0.15);           // cabin glass
    for (const sx of [-0.84, 0.84]) box(0.06, 0.48, 0.1, paint, sx, 1.25, -0.2);   // B pillars
    box(1.72, 0.06, 2.24, paint, 0, 1.51, -0.15);           // roof
    box(0.56, 0.17, 0.2, [signSide, signSide, signSide, signSide, signFace, signFace], 0, 1.64, -0.15, grp, false);
    box(1.96, 0.14, 0.14, dark, 0, 0.5, 2.2); box(1.96, 0.14, 0.14, dark, 0, 0.5, -2.2);   // bumpers
    box(1.5, 0.05, 0.05, dark, 0, 0.82, 2.17);              // grille
    for (const sx of [-0.62, 0.62]) {
      box(0.32, 0.14, 0.06, head, sx, 0.86, 2.17, grp, false);
      box(0.32, 0.14, 0.06, this.tailMat, sx, 0.88, -2.17, grp, false);
    }
    box(0.01, 0.5, 1.2, dark, -0.953, 0.72, 0.1, grp, false);   // seat shadow revealed by the open door
    // wheels (pivot spins about x)
    this.wheels = []; this.hubMats = [];
    for (const sx of [-0.93, 0.93]) for (const sz of [-1.35, 1.35]) {
      const piv = new T.Group(); piv.position.set(sx, 0.38, sz);
      const w = new T.Mesh(new T.CylinderGeometry(0.38, 0.38, 0.26, 18), tyre); w.rotation.z = Math.PI / 2; w.castShadow = true;
      const hubMat = std(0x9aa0a6, { metalness: 0.8 }); this.hubMats.push(hubMat);
      const hub = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.28, 12), hubMat); hub.rotation.z = Math.PI / 2;
      piv.add(w, hub); grp.add(piv); this.wheels.push(piv);
    }
    // passenger door, hinged at its front edge on the -x side
    this.door = new T.Group(); this.door.position.set(-0.97, 0, 0.75);
    box(0.07, 0.62, 1.3, paint, 0, 0.69, -0.65, this.door);
    box(0.09, 0.05, 0.22, dark, -0.01, 0.92, -1.0, this.door, false);
    grp.add(this.door);
    grp.rotation.y = Math.PI; // faces north (-z)
    this.g.scene.add(grp);
    this.taxiMats = [paint, dark, tyre, glass, head, this.tailMat, signFace, signSide];
    this.signTex = signTex;
  }

  buildPhone() {
    const T = this.T, c = this.g.playerChar;
    this.fist = c.fistR || (c.driver && c.driver.fistR) || null;
    const grp = this.phone = new T.Group();
    this.phoneBodyMat = new T.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.3, metalness: 0.6 });
    this.screenMat = new T.MeshBasicMaterial({ color: 0x223044, toneMapped: false });
    const body = new T.Mesh(new T.BoxGeometry(0.075, 0.155, 0.012), this.phoneBodyMat);
    const screen = new T.Mesh(new T.PlaneGeometry(0.065, 0.14), this.screenMat); screen.position.z = 0.0066;
    grp.add(body, screen);
    grp.position.set(...PHONE_FIST.pos); grp.rotation.set(...PHONE_FIST.rot);
    grp.visible = false;
    if (this.fist) this.fist.add(grp); else this.g.scene.add(grp);
  }

  // ------------------------------------------------------------------ run
  skip() { if (this.active && !this.skipping) this.skipping = true; }

  crossed(a) { return this.prevT < a && this.t >= a; }

  update(dt) {
    if (!this.active) return;
    const g = this.g, T = this.T;
    this.prevT = this.t;
    this.t = Math.min(TOTAL, this.t + dt);
    const t = this.t;

    // --- taxi
    const tx = taxiAt(t);
    this.taxi.position.set(tx.x, groundHeight(tx.x, tx.z), tx.z);
    this.door.rotation.y = 1.15 * tx.door;
    for (const w of this.wheels) w.rotation.x += (tx.speed * dt) / 0.38;
    this.tailMat.color.setHex(tx.brake ? 0xff2a1a : 0x6a1a14);
    g.audio.engineSet(Math.min(1, tx.speed / 18));

    // --- hero
    const h = heroAt(t), p = g.player;
    p.x = h.x; p.z = h.z; p.moveSpeed = h.speed;
    p.facing += angleDelta(p.facing, h.facing) * Math.min(1, dt * 10);
    g.playerChar.group.visible = h.visible;
    g.playerRing.visible = false;
    const ph = phoneAt(t);
    this.pose = ph.u > 0 ? { clip: 'phone', u: ph.u } : null;
    this.phone.visible = ph.visible;
    if (ph.visible) {
      const blink = ph.ringing ? (Math.floor(t * 8) % 2 ? 0x9dffb8 : 0x2a6a44) : ph.answered ? 0x3a7dff : 0x223044;
      this.screenMat.color.setHex(blink);
    }

    // --- camera + sun
    const cam = cameraAt(t, { h: +g.cfg.visual.cameraHeight || 13 });
    g.camera.position.set(...cam.pos);
    g.camera.lookAt(...cam.look);
    if (Math.abs(g.camera.fov - cam.fov) > 0.01) { g.camera.fov = cam.fov; g.camera.updateProjectionMatrix(); }
    const fz = t < TL.cut1 ? tx.z : STAGE.z, fx = t < TL.cut1 ? tx.x : STAGE.x;
    g.sun.position.set(fx + g.sunOffset.x, g.sunOffset.y, fz + g.sunOffset.z);
    g.sun.target.position.set(fx, 0, fz);

    // --- sound + haptics, once per event
    for (const _ of ringStartsBetween(this.prevT, t)) { g.audio.ring(); g.haptic([{ intensity: 0.8, sharpness: 0.6, duration: 120 }, { delay: 90, intensity: 0.8, sharpness: 0.6, duration: 120 }, { delay: 90, intensity: 0.8, sharpness: 0.6, duration: 120 }]); }
    if (this.crossed(TL.doorOpen[0])) g.audio.play('sfx_whoosh', 0.25, 1.6);
    if (this.crossed(TL.doorClose[1])) { g.audio.play('sfx_slam', 0.35, 1.8); g.haptic('thud'); }
    if (this.crossed(TL.answerAt)) g.haptic('tap');
    if (this.crossed(CARD_START)) g.haptic('success');

    this.updateDom(t, ph);

    // --- end / skip
    let fade = fadeAt(t);
    if (this.skipping) { this.skipFade = Math.min(1, this.skipFade + dt / 0.3); fade = Math.max(fade, this.skipFade); }
    this.el.fade.style.opacity = fade;
    if (t >= TOTAL || (this.skipping && this.skipFade >= 1)) this.finish();
  }

  updateDom(t, ph) {
    const E = this.el;
    E.loc.style.opacity = t > 0.7 && t < 3.4 ? 1 : 0;
    const inCall = t >= TL.ringFirst && t < CALL_END;
    E.call.classList.toggle('show', inCall);
    E.call.classList.toggle('ring', ph.ringing);
    if (inCall) {
      if (t < TL.answerAt) E.callSt.textContent = 'Incoming call…';
      else { const s = Math.floor(t - TL.answerAt); E.callSt.textContent = 'Connected  0:' + String(s).padStart(2, '0'); }
    }
    const sub = subtitleAt(t);
    E.sub.classList.toggle('show', t >= TL.talkStart && t < CALL_END); // stays up between lines (no flicker)
    if (sub) {
      const hero = sub.who === 'hero';
      if (sub.text !== this.lastLine) { this.lastLine = sub.text; this.lastChars = 0; E.who.textContent = hero ? HERO.name : CALLER.name; E.who.style.color = hero ? HERO.color : CALLER.color; }
      if (sub.chars !== this.lastChars) {
        E.tx.textContent = sub.text.slice(0, sub.chars);
        if (sub.chars - this.lastChars >= 3 || sub.chars === 1) { this.g.audio.blip(hero ? 0.62 : 1); this.lastChars = sub.chars; }
      }
    }
    E.mission.classList.toggle('show', t >= CARD_START);
  }

  finish() {
    if (!this.active) return;
    const g = this.g, p = g.player;
    this.cleanup();
    // hero starts the fight at the configured spawn, facing the first gang
    p.x = this.spawn.x; p.z = this.spawn.z; p.facing = Math.PI; p.moveSpeed = 0;
    g.playerChar.group.visible = true; g.playerRing.visible = true;
    g.playerY = undefined; g.camPos = null;
    g.setCameraMode(g.camMode, true);
    g.hud.el.classList.remove('cine');
    // fade back in from black
    const f = document.createElement('div');
    f.style.cssText = 'position:absolute;inset:0;background:#000;opacity:1;transition:opacity .45s;pointer-events:none';
    g.hud.el.appendChild(f);
    requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity = 0; }));
    setTimeout(() => f.remove(), 600);
    if (this.onDone) this.onDone();
  }

  /** Remove everything the cutscene added (also used when the game is disposed mid-scene). */
  cleanup() {
    if (!this.cleaned) {
      this.cleaned = true; this.active = false; this.pose = null;
      window.removeEventListener('keydown', this.onKey);
      this.g.audio.engineStop();
      this.g.scene.remove(this.taxi);
      this.taxi.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      for (const m of [...this.taxiMats, ...this.hubMats]) m.dispose();
      this.signTex.dispose();
      if (this.phone.parent) this.phone.parent.remove(this.phone);
      this.phone.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      this.phoneBodyMat.dispose(); this.screenMat.dispose();
      this.root.remove(); this.style.remove();
    }
  }

  dispose() { this.cleanup(); }
}
