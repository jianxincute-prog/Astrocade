// CookingFSM: SELECTING -> GRACE -> LOCK_AND_TOSS -> COOKING -> SERVING_WALK -> SERVING_EVALUATE -> CLEANUP_RESET.
// Fast mode scales time for every phase after selection. Taps during cooking build "shine" (and win the Flame surprise).
import { clamp, easeOutBack, parabolaArc } from './mathutils.js';
import { ANCHORS, cratePos } from './kitchen.js';
import { INGREDIENTS } from './ingredients.js';
import { ING, evaluateDish, hintFor, makeOrder, checkUnlocks, scoreServe, recipeName } from './recipes.js';
import { buildDish, miniMesh } from './dish.js';

const THREE = window.THREE;

export const STATES = {
  SELECTING: 'SELECTING', GRACE: 'GRACE', LOCK_AND_TOSS: 'LOCK_AND_TOSS', COOKING: 'COOKING',
  SERVING_WALK: 'SERVING_WALK', SERVING_EVALUATE: 'SERVING_EVALUATE', CLEANUP_RESET: 'CLEANUP_RESET',
};
const S = STATES;
const WALK_SPEED = 2.7;
const FACE_CAMERA = { x: 0, z: 20 };

export class CookingFSM {
  constructor({ chef, customer, camRig, scene, kitchen, ui, sfx, haptic, fx, cfg, profile, onServed }) {
    Object.assign(this, { chef, customer, camRig, scene, kitchen, ui, sfx, haptic, fx, cfg, profile, onServed });
    this.g = cfg.gameplay; this.sc = cfg.scoring;
    this.state = null; this.timer = 0; this.sdt = 0;
    this.slots = [null, null, null];
    this.chips = []; this.dish = null; this.order = null;
    this.fast = false; this.glow = 0; this.surprise = false; this.tosses = 0; this.surpriseWon = false;
    this.dishSpawned = false; this.arrived = false; this.lastServe = null;
    this.panFlame = new THREE.Color(0x4cc9f0); this.panNormal = new THREE.Color(0x2f2f36);
  }

  start() { this.nextOrder(); this.enter(S.SELECTING); }

  // Clean everything a previous session left behind and begin a fresh one (progress is kept, score is not).
  resetSession() {
    this.chips.forEach((c) => this.scene.remove(c.mesh)); this.chips = [];
    if (this.dish) { this.dish.parent.remove(this.dish); this.dish = null; }
    this.sfx.play('STOP_SIZZLE');
    this.kitchen.panInner.material.color.copy(this.panNormal);
    this.slots = [null, null, null]; this.glow = 0; this.surprise = false; this.fast = false;
    this.ui.setFast(false); this.ui.showTap(false); this.ui.setSurprise(false); this.ui.hideBanner(); this.ui.setGolden(null);
    this.chef.root.position.copy(ANCHORS.prepPos); this.chef.root.rotation.y = 0; this.chef.setCarrying(false); this.chef.setPose('idle');
    this.customer.setPose('idle');
    this.profile.score = 0; this.profile.combo = 0; this.profile.ordersSpawned = 0;
    this.ui.setScore(0, 0);
    this.camRig.setMode('OVERVIEW', true);
    this.start();
  }

  get busy() { return this.state !== S.SELECTING && this.state !== S.GRACE; }

  // ---- Player actions -------------------------------------------------------------------------
  pick(id) {
    if (this.state !== S.SELECTING || !this.profile.unlocked.has(id) || this.slots.includes(id)) return false;
    const i = this.slots.indexOf(null);
    if (i < 0) return false;
    this.slots[i] = id;
    this.sfx.play('SLOT_POP', i); this.haptic('tick');
    this.refreshUi(i);
    if (this.slots.every(Boolean)) this.enter(S.GRACE);
    return true;
  }

  undo(i) {
    if ((this.state !== S.SELECTING && this.state !== S.GRACE) || !this.slots[i]) return false;
    this.slots[i] = null;
    this.sfx.play('SLOT_UNDO'); this.haptic('tick');
    if (this.state === S.GRACE) this.enter(S.SELECTING); else this.refreshUi();
    return true;
  }

  undoLast() { for (let i = 2; i >= 0; i--) if (this.slots[i]) return this.undo(i); return false; }

  repeatLast() {
    const ids = this.profile.lastIds;
    if (this.state !== S.SELECTING || !ids || this.slots.some(Boolean)) return false;
    if (!ids.every((id) => this.profile.unlocked.has(id))) return false;
    ids.forEach((id) => this.pick(id));
    return true;
  }

  setFast(v) { this.fast = !!v; this.ui.setFast(this.fast); }

  // A tap on the stage while cooking: builds shine; three taps during the toss beat win the Flame surprise.
  tap() {
    if (this.state !== S.COOKING || this.timer >= 2.6) return;
    this.glow = clamp(this.glow + this.g.shinePerTap, 0, 100);
    this.ui.setGlow(this.glow);
    this.sfx.play('TAP', Math.min(this.glow / 20, 5)); this.haptic('tick');
    this.fx.emit('sparkle', this.chips.length ? this.chips[0].mesh.position : ANCHORS.panCenter, 3);
    if (this.surprise && !this.surpriseWon && this.timer < 1.2) {
      this.tosses++;
      if (this.tosses >= 3) {
        this.surpriseWon = true;
        this.fx.emit('flash', ANCHORS.panCenter, 14);
        this.sfx.play('BONUS'); this.haptic('success');
        this.ui.setSurprise(false);
      }
    }
  }

  // ---- UI sync --------------------------------------------------------------------------------
  refreshUi(popIndex = -1) {
    const filled = this.slots.filter(Boolean);
    const glow = filled.length === 2 && hintFor(this.profile, filled) ? this.slots.indexOf(null) : -1;
    this.ui.setSlots(this.slots.map((id) => (id ? ING[id] : null)), glow, popIndex);
    this.ui.setCards({ unlocked: this.profile.unlocked, picked: new Set(this.slots.filter(Boolean)), enabled: this.state === S.SELECTING });
    this.ui.setArrow(this.arrowTarget());
    this.ui.setAgain(this.state === S.SELECTING && !this.slots.some(Boolean) && !!this.profile.lastIds
      && this.profile.lastIds.every((id) => this.profile.unlocked.has(id)));
  }

  // Guide the very first order with a bouncing arrow over the next ingredient to pick.
  arrowTarget() {
    if (this.profile.completed > 0 || this.state !== S.SELECTING || !this.order) return null;
    return this.order.recipe.ids.find((id) => !this.slots.includes(id)) || null;
  }

  nextOrder() {
    this.order = makeOrder(this.profile, this.g);
    this.order.name = recipeName(this.cfg, this.order.recipe);
    this.ui.setOrder(this.order);
  }

  // ---- State transitions ----------------------------------------------------------------------
  enter(next) {
    this.state = next; this.timer = 0; this.arrived = false;
    const { chef, camRig, ui, sfx } = this;
    switch (next) {
      case S.SELECTING:
        camRig.setMode('OVERVIEW'); chef.setCarrying(false); chef.setPose('idle');
        this.refreshUi();
        break;
      case S.GRACE:
        this.refreshUi();
        break;
      case S.LOCK_AND_TOSS:
        sfx.play('SLOTS_LOCKED'); this.haptic('tap');
        this.profile.lastIds = [...this.slots];
        this.refreshUi();
        camRig.setMode('COOKING_ZOOM');
        this.chips = this.slots.map((id) => {
          const mesh = miniMesh(id);
          const start = cratePos(INGREDIENTS.findIndex((x) => x.id === id));
          mesh.position.copy(start); this.scene.add(mesh);
          return { mesh, start };
        });
        break;
      case S.COOKING:
        this.glow = 0; this.tosses = 0; this.dishSpawned = false; this.surpriseWon = false;
        this.surprise = Math.random() < this.g.surpriseChance;
        sfx.play('PAN_SIZZLE');
        ui.setGlow(0); ui.showTap(true); ui.setSurprise(this.surprise);
        if (this.surprise) this.kitchen.panInner.material.color.copy(this.panFlame);
        break;
      case S.SERVING_WALK:
        camRig.setMode('SERVING_FOCUS'); chef.setCarrying(true);
        if (this.dish) { chef.carryAnchor.add(this.dish); this.dish.position.set(0, 0, 0); this.dish.rotation.set(0, 0, 0); }
        break;
      case S.SERVING_EVALUATE:
        chef.setCarrying(false);
        this.serve();
        break;
      case S.CLEANUP_RESET:
        if (this.dish) { this.dish.parent.remove(this.dish); this.dish = null; }
        this.slots = [null, null, null];
        ui.hideBanner();
        this.customer.setPose('idle');
        camRig.setMode('OVERVIEW');
        const fresh = checkUnlocks(this.profile, this.g);
        if (fresh.length) { ui.flashUnlock(fresh); sfx.play('UNLOCK'); this.haptic('success'); }
        this.nextOrder();
        ui.setSlots([null, null, null], -1, -1);
        ui.setScore(this.profile.score, this.profile.combo);
        break;
      default: break;
    }
  }

  // ---- Per-frame update -----------------------------------------------------------------------
  update(rawDt) {
    const dt = Math.min(rawDt, 0.11);
    this.sdt = this.busy ? dt * (this.fast ? this.g.fastSpeed : 1) : dt;
    this.timer += this.sdt;

    const o = this.order;
    if (o && o.golden && o.timeLeft !== null && this.state !== S.SERVING_EVALUATE && this.state !== S.CLEANUP_RESET) {
      o.timeLeft = Math.max(0, o.timeLeft - dt);
      this.ui.setGolden(o.timeLeft / o.total);
    }

    switch (this.state) {
      case S.SELECTING: this.chef.faceToward(FACE_CAMERA, this.sdt, 6); break;
      case S.GRACE:
        this.chef.faceToward(FACE_CAMERA, this.sdt, 6);
        if (this.timer >= this.g.graceSeconds) this.enter(S.LOCK_AND_TOSS);
        break;
      case S.LOCK_AND_TOSS: this.updateToss(); break;
      case S.COOKING: this.updateCooking(); break;
      case S.SERVING_WALK:
        if (this.chef.moveToward(ANCHORS.servePos, WALK_SPEED, this.sdt)) this.enter(S.SERVING_EVALUATE);
        break;
      case S.SERVING_EVALUATE: this.updateEvaluate(); break;
      case S.CLEANUP_RESET:
        if (this.chef.moveToward(ANCHORS.prepPos, WALK_SPEED, this.sdt)) { this.chef.setPose('idle'); this.enter(S.SELECTING); }
        break;
      default: break;
    }
    this.chef.update(this.sdt);
    this.customer.update(this.sdt);
  }

  updateToss() {
    const dur = this.g.tossSeconds;
    const p = clamp(this.timer / dur, 0, 1);
    this.chips.forEach((c, i) => {
      const t = clamp((p - i * 0.12) / 0.76, 0, 1);
      parabolaArc(c.start, ANCHORS.panCenter, 1.35, t, c.mesh.position);
      c.mesh.rotation.x += this.sdt * 9; c.mesh.rotation.z += this.sdt * 7;
    });
    this.arrived = this.chef.moveToward(ANCHORS.cookPos, WALK_SPEED, this.sdt);
    if (this.arrived) { this.chef.faceToward(ANCHORS.panCenter, this.sdt); this.chef.setPose('idle'); }
    if (p >= 1 && (this.arrived || this.timer > dur + 0.8)) this.enter(S.COOKING);
  }

  updateCooking() {
    const t = this.timer, pan = ANCHORS.panCenter, chef = this.chef;
    chef.faceToward(pan, this.sdt);
    this.fx.steam(pan, this.sdt, t > 1.2 ? 16 : 6);
    if (t < 1.2) { // beat 1: fast toss
      chef.setPose('sautee');
      this.chips.forEach((c, i) => {
        c.mesh.position.set(pan.x + (i - 1) * 0.14, pan.y + Math.abs(Math.sin(t * 14 + i * 1.5)) * 0.22, pan.z);
        c.mesh.rotation.y += this.sdt * 6;
      });
    } else if (t < 2.6) { // beat 2: stir
      if (t - this.sdt < 1.2) this.ui.setSurprise(false);
      chef.setPose('stir');
      const a = (t - 1.2) * 7.5;
      this.chips.forEach((c, i) => {
        const ang = a + (i * Math.PI * 2) / 3;
        c.mesh.position.set(pan.x + Math.cos(ang) * 0.12, pan.y + 0.03, pan.z + Math.sin(ang) * 0.12);
      });
    } else { // beat 3: plating
      chef.setPose('plate');
      if (!this.dishSpawned) {
        this.dishSpawned = true;
        this.chips.forEach((c) => this.scene.remove(c.mesh)); this.chips = [];
        const { group } = buildDish(this.slots);
        group.position.set(pan.x, pan.y + 0.18, pan.z); group.scale.setScalar(0.01);
        this.scene.add(group); this.dish = group;
        this.fx.emit('flash', group.position, 12);
        this.sfx.play('STOP_SIZZLE'); this.sfx.play('DISH_READY'); this.haptic('tap');
        this.ui.showTap(false);
        this.kitchen.panInner.material.color.copy(this.panNormal);
      }
      this.dish.scale.setScalar(Math.max(0.01, easeOutBack(Math.min((t - 2.6) / 0.55, 1))));
    }
    if (t >= 3.5) this.enter(S.SERVING_WALK);
  }

  serve() {
    const { profile: p } = this;
    const ids = [...this.slots];
    const result = evaluateDish(this.cfg, ids);
    const isNew = !!(result.recipe && !p.discovered.has(result.recipe.id));
    if (result.recipe) p.discovered.add(result.recipe.id);
    const perfect = this.glow >= 100;
    const sc = scoreServe(this.sc, { result, order: this.order, perfect, surprise: this.surpriseWon, isNew, combo: p.combo });
    p.combo = sc.combo; p.score += sc.points; p.completed++; if (sc.match) p.matched++;
    p.best = Math.max(p.best || 0, p.score);
    this.lastServe = { result, ...sc };

    if (this.dish) { this.scene.add(this.dish); this.dish.position.copy(ANCHORS.tableTop); this.dish.rotation.set(0, 0, 0); this.dish.scale.setScalar(1); }
    this.customer.setPose('cheer');
    this.chef.setPose('cheer');
    if (sc.match) { this.fx.emit('heart', ANCHORS.tableTop, 12); this.sfx.play('ORDER_PERFECT'); this.haptic('success'); }
    else { this.fx.emit('flash', ANCHORS.tableTop, 10); this.sfx.play('SERVE_NORMAL'); this.haptic('tap'); }
    this.ui.showBanner({ name: result.name, points: sc.points, tags: sc.tags });
    this.ui.setScore(p.score, p.combo);
    this.ui.setGolden(null);
    if (this.onServed) this.onServed(this.lastServe);
  }

  updateEvaluate() {
    this.chef.faceToward(ANCHORS.tableTop, this.sdt);
    if (this.timer > 1.1 && this.dish) this.dish.scale.setScalar(Math.max(0.01, 1 - (this.timer - 1.1) / 0.5));
    if (this.timer >= 1.6) this.enter(S.CLEANUP_RESET);
  }
}
