// Boss combat visuals (pooled, no per-frame allocation in the hot path):
//  - ground telegraphs: cone / circle / line that FILL while the attack winds up (so you can read the timing)
//  - projectiles (fire bolts, venom globs), falling meteors with a growing landing marker, lingering zones (poison / fire)
//  - flame stream for the dragon's breath, crescent slash flashes for claws and fangs
// logic/hazards.js owns the simulation; syncField() mirrors it into meshes by id.
const GROUND = 0.3;

export class BossFX {
  constructor(T, scene, fx) {
    this.T = T; this.scene = scene; this.fx = fx;
    this.tele = []; this.slashes = []; this.flames = []; this.proj = new Map(); this.met = new Map(); this.zones = new Map();
    this.time = 0;
    this.circleGeo = new T.CircleGeometry(1, 48); this.circleGeo.rotateX(-Math.PI / 2);
    this.ringGeo = new T.RingGeometry(0.94, 1, 56); this.ringGeo.rotateX(-Math.PI / 2);
    this.lineGeo = new T.PlaneGeometry(1, 1); this.lineGeo.rotateX(-Math.PI / 2); this.lineGeo.translate(0, 0, 0.5);
    this.lineEdge = new T.EdgesGeometry(this.lineGeo);
    this.coneGeos = new Map();
    this.sphere = new T.SphereGeometry(1, 14, 10);
    this.rock = new T.IcosahedronGeometry(1, 1);
    this.zoneTex = { poison: this.zoneTexture('poison'), fire: this.zoneTexture('fire') };
    // slash crescents
    for (let i = 0; i < 6; i++) {
      const m = new T.Mesh(new T.RingGeometry(0.55, 1, 28, 1, -0.5, 1), new T.MeshBasicMaterial({ color: 0xff6a4d, transparent: true, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; const g = new T.Group(); g.add(m); g.visible = false; scene.add(g);
      this.slashes.push({ g, m, life: 0, max: 1, arc: 1, range: 1 });
    }
    // flame particles
    for (let i = 0; i < 90; i++) {
      const m = new T.Mesh(this.sphere, new T.MeshBasicMaterial({ color: 0x3aa0ff, transparent: true, depthWrite: false, toneMapped: false }));
      const core = new T.Mesh(this.sphere, new T.MeshBasicMaterial({ color: 0xd8f6ff, transparent: true, depthWrite: false, toneMapped: false })); core.scale.setScalar(0.5); m.add(core);
      m.visible = false; scene.add(m);
      this.flames.push({ m, core, vx: 0, vy: 0, vz: 0, life: 0, max: 1, s: 1 });
    }
  }

  // ------------------------------------------------------------------ textures
  zoneTexture(kind) {
    const T = this.T, c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    if (kind === 'poison') { g.addColorStop(0, 'rgba(120,255,90,0.85)'); g.addColorStop(0.55, 'rgba(60,170,50,0.7)'); g.addColorStop(0.9, 'rgba(30,110,40,0.45)'); g.addColorStop(1, 'rgba(30,110,40,0)'); }
    else { g.addColorStop(0, 'rgba(255,240,170,0.9)'); g.addColorStop(0.45, 'rgba(255,140,40,0.75)'); g.addColorStop(0.85, 'rgba(180,50,20,0.4)'); g.addColorStop(1, 'rgba(180,50,20,0)'); }
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, r = Math.random() * 46, px = 64 + Math.cos(a) * r, py = 64 + Math.sin(a) * r, s = 3 + Math.random() * 8; x.fillStyle = kind === 'poison' ? `rgba(200,255,150,${0.12 + Math.random() * 0.2})` : `rgba(255,230,140,${0.12 + Math.random() * 0.25})`; x.beginPath(); x.arc(px, py, s, 0, 6.3); x.fill(); }
    const t = new T.CanvasTexture(c); if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; return t;
  }

  coneGeo(arcDeg) {
    const key = Math.round(arcDeg);
    if (!this.coneGeos.has(key)) {
      const T = this.T, n = 28, a = (arcDeg * Math.PI) / 180, pos = [0, 0, 0], idx = [];
      for (let i = 0; i <= n; i++) { const t = -a / 2 + (a * i) / n; pos.push(Math.sin(t), 0, Math.cos(t)); if (i) idx.push(0, i, i + 1); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const edge = []; edge.push(0, 0.001, 0); for (let i = 0; i <= n; i++) { const t = -a / 2 + (a * i) / n; edge.push(Math.sin(t), 0.001, Math.cos(t)); } edge.push(0, 0.001, 0);
      const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.Float32BufferAttribute(edge, 3));
      this.coneGeos.set(key, { g, eg });
    }
    return this.coneGeos.get(key);
  }

  // ------------------------------------------------------------------ telegraphs
  /** ev: boss 'telegraph' event; owner: the enemy it follows ('self' = boss pos/facing, 'aim' = locked aim line); color: hex. */
  telegraph(ev, owner, color) {
    const T = this.T;
    const base = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    const fill = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    const edgeMat = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    const grp = new T.Group(); grp.position.y = GROUND;
    let baseM, fillM, edgeM;
    if (ev.shape === 'circle') {
      baseM = new T.Mesh(this.circleGeo, base); fillM = new T.Mesh(this.circleGeo, fill); edgeM = new T.Mesh(this.ringGeo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide }));
    } else if (ev.shape === 'cone') {
      const { g, eg } = this.coneGeo(ev.arc);
      baseM = new T.Mesh(g, base); fillM = new T.Mesh(g, fill); edgeM = new T.Line(eg, edgeMat);
    } else {
      baseM = new T.Mesh(this.lineGeo, base); fillM = new T.Mesh(this.lineGeo, fill); edgeM = new T.LineSegments(this.lineEdge, edgeMat);
    }
    grp.add(baseM, fillM, edgeM); this.scene.add(grp);
    const t = { ev, owner, grp, baseM, fillM, edgeM, life: ev.dur, max: ev.dur, mats: [base, fill, edgeM.material] };
    edgeMat.dispose(); // only the line shapes use it; circles carry their own ring material (mats[2])
    this.tele.push(t);
    this.placeTele(t, 0);
    return t;
  }

  placeTele(t, k) {
    const { ev, owner, grp, fillM, baseM, edgeM } = t;
    const aim = owner.boss ? owner.boss.aimInfo : null;
    const e = Math.min(1, k) ** 0.8;
    if (ev.shape === 'circle') {
      grp.position.set(owner.x, GROUND, owner.z); grp.rotation.y = 0;
      baseM.scale.set(ev.r, 1, ev.r); edgeM.scale.set(ev.r, 1, ev.r); fillM.scale.set(ev.r * e + 0.01, 1, ev.r * e + 0.01);
    } else if (ev.shape === 'cone') {
      grp.position.set(owner.x, GROUND, owner.z); grp.rotation.y = owner.facing;
      baseM.scale.set(ev.range, 1, ev.range); edgeM.scale.set(ev.range, 1, ev.range); fillM.scale.set(ev.range * e + 0.01, 1, ev.range * e + 0.01);
    } else {
      const len = aim ? aim.len : 8, ox = aim ? aim.ox : owner.x, oz = aim ? aim.oz : owner.z, f = aim ? aim.facing : owner.facing;
      grp.position.set(ox, GROUND, oz); grp.rotation.y = f;
      baseM.scale.set(ev.width, 1, len); edgeM.scale.set(ev.width, 1, len); fillM.scale.set(ev.width, 1, len * e + 0.01);
    }
  }

  // ------------------------------------------------------------------ one-shot effects
  /** Crescent flash (claws / fangs) in front of (x,z) facing `facing`. */
  slash(x, z, facing, range, arcDeg, color = 0xff6a4d) {
    const s = this.slashes.find((q) => q.life <= 0) || this.slashes[0];
    const arc = (arcDeg * Math.PI) / 180;
    s.m.geometry.dispose();
    s.m.geometry = new this.T.RingGeometry(0.5, 1, 32, 1, -arc / 2, arc);
    s.g.position.set(x, 1.1, z); s.g.rotation.y = facing - Math.PI / 2; s.range = range; s.arc = arc; s.life = s.max = 0.28;
    s.m.material.color.setHex(color); s.g.visible = true;
  }

  /** Emit n flame orbs along the facing (the dragon's breath). */
  flame(x, y, z, facing, range, n = 4, color = 0x8fdcff) {
    for (let k = 0; k < n; k++) {
      const f = this.flames.find((p) => p.life <= 0) || this.flames[(Math.random() * this.flames.length) | 0];
      const a = facing + (Math.random() - 0.5) * 0.3, sp = range * (1.2 + Math.random() * 0.6);
      f.vx = Math.sin(a) * sp; f.vz = Math.cos(a) * sp; f.vy = (Math.random() - 0.4) * 1.2;
      f.m.position.set(x + Math.sin(facing) * 1.6, y, z + Math.cos(facing) * 1.6);
      f.life = f.max = 0.5 + Math.random() * 0.25; f.s = 0.28 + Math.random() * 0.3;
      f.m.material.color.setHex(color); f.core.material.color.setHex(Math.random() < 0.5 ? 0xd8f6ff : 0xffffff); f.m.visible = true;
    }
  }

  // ------------------------------------------------------------------ hazard field mirror
  syncField(field, colors = {}) {
    const T = this.T;
    // projectiles
    const seen = new Set();
    for (const p of field.projectiles) {
      seen.add(p.id);
      let o = this.proj.get(p.id);
      if (!o) {
        const venom = p.kind === 'venom';
        const mat = new T.MeshBasicMaterial({ color: venom ? 0x52e81c : 0x4aa8ff, transparent: true, opacity: 0.96, toneMapped: false, depthWrite: false });
        const m = new T.Mesh(this.sphere, mat); const s = venom ? 0.5 : 0.6; m.scale.setScalar(s);
        const halo = new T.Mesh(this.sphere, new T.MeshBasicMaterial({ color: venom ? 0x9dff5a : 0x8fdcff, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false })); halo.scale.setScalar(1.6); m.add(halo);
        this.scene.add(m); o = { m, mats: [mat, halo.material], venom }; this.proj.set(p.id, o);
      }
      o.m.position.set(p.x, 1.4 + Math.sin(this.time * 14 + p.id) * 0.08, p.z);
      o.m.scale.setScalar((o.venom ? 0.5 : 0.6) * (1 + 0.12 * Math.sin(this.time * 20 + p.id)));
      if (Math.random() < 0.5) this.fx.burst(p.x, 1.3, p.z, o.venom ? 0x8dff5a : 0x9fe4ff, 1, 1.5);
    }
    for (const [id, o] of this.proj) if (!seen.has(id)) { this.scene.remove(o.m); for (const m of o.mats) m.dispose(); this.proj.delete(id); }
    // meteors: rock falling from the sky + landing marker that fills
    seen.clear();
    for (const m of field.meteors) {
      seen.add(m.id);
      let o = this.met.get(m.id);
      if (!o) {
        const rock = new T.Mesh(this.rock, new T.MeshStandardMaterial({ color: 0x14243a, emissive: 0x2a9cff, emissiveIntensity: 1.1, roughness: 0.55 }));
        rock.scale.set(1.0, 1.15, 1.0);
        const glow = new T.Mesh(this.sphere, new T.MeshBasicMaterial({ color: 0x4fb8ff, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false })); glow.scale.setScalar(1.55); rock.add(glow);
        const mk = this.telegraph({ shape: 'circle', r: m.r, dur: m.delay }, { x: m.x, z: m.z, facing: 0 }, colors.meteor || 0xff7a2a);
        this.scene.add(rock); o = { rock, glow, mk, mats: [rock.material, glow.material] }; this.met.set(m.id, o);
      }
      const k = Math.min(1, m.age / m.delay), h = 11 * (1 - k) ** 1.5 + 1.1;     // short, readable fall that stays inside the camera view
      o.rock.position.set(m.x + (1 - k) * 5, h, m.z - (1 - k) * 7); o.rock.rotation.x += 0.12; o.rock.rotation.z += 0.07;
      if (Math.random() < 0.7) this.fx.burst(o.rock.position.x, o.rock.position.y, o.rock.position.z, 0x6fc8ff, 2, 3);
    }
    for (const [id, o] of this.met) if (!seen.has(id)) { this.scene.remove(o.rock); for (const mm of o.mats) mm.dispose(); if (o.mk) o.mk.life = 0; this.met.delete(id); }
    // zones
    seen.clear();
    for (const z of field.zones) {
      seen.add(z.id);
      let o = this.zones.get(z.id);
      if (!o) {
        const tex = this.zoneTex[z.kind] || this.zoneTex.poison;
        const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
        const disc = new T.Mesh(this.circleGeo, mat); disc.position.y = GROUND - 0.01;
        const rimMat = new T.MeshBasicMaterial({ color: z.kind === 'poison' ? 0xb8ff7a : 0xffc060, transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide, toneMapped: false });
        const rim = new T.Mesh(this.ringGeo, rimMat); rim.position.y = GROUND;
        const g = new T.Group(); g.position.set(z.x, 0, z.z); g.add(disc, rim); this.scene.add(g);
        o = { g, disc, rim, mats: [mat, rimMat], tele: z.arm > 0 ? this.telegraph({ shape: 'circle', r: z.r, dur: z.arm }, { x: z.x, z: z.z, facing: 0 }, z.kind === 'poison' ? 0x7dff4a : 0xff8a2a) : null };
        this.zones.set(z.id, o);
      }
      const active = z.age >= z.arm, left = z.arm + z.dur - z.age;
      const grow = active ? Math.min(1, (z.age - z.arm) / 0.25) : 0, fade = Math.min(1, left / 0.6);
      o.disc.scale.set(z.r * grow, 1, z.r * grow); o.rim.scale.set(z.r * grow * (1 + 0.025 * Math.sin(this.time * 6)), 1, z.r * grow * (1 + 0.025 * Math.sin(this.time * 6)));
      o.mats[0].opacity = 0.9 * grow * fade; o.mats[1].opacity = 0.85 * grow * fade;
      if (active && Math.random() < 0.35) { const a = Math.random() * 6.28, r = Math.random() * z.r; this.fx.burst(z.x + Math.cos(a) * r, 0.4, z.z + Math.sin(a) * r, z.kind === 'poison' ? 0x9dff6a : 0xffb347, 1, 2.2); }
    }
    for (const [id, o] of this.zones) if (!seen.has(id)) { this.scene.remove(o.g); for (const m of o.mats) m.dispose(); this.zones.delete(id); }
  }

  // ------------------------------------------------------------------ frame update
  update(dt) {
    this.time += dt;
    for (let i = this.tele.length - 1; i >= 0; i--) {
      const t = this.tele[i];
      t.life -= dt;
      const k = 1 - Math.max(0, t.life) / t.max;
      if (t.owner && (t.owner.dead || t.owner.stale)) t.life = 0;
      if (t.life <= 0) { this.scene.remove(t.grp); for (const m of t.mats) m.dispose(); this.tele.splice(i, 1); continue; }
      this.placeTele(t, k);
      const warn = k > 0.7 ? 0.5 + 0.5 * Math.sin(this.time * 32) : 0;
      t.mats[0].opacity = 0.2 + 0.12 * k; t.mats[1].opacity = 0.4 + 0.3 * k + 0.2 * warn; t.mats[2].opacity = 0.6 + 0.4 * k;
    }
    for (const s of this.slashes) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const k = 1 - Math.max(0, s.life / s.max);
      const r = s.range * (0.55 + 0.45 * Math.sqrt(k));
      s.m.scale.set(r, r, r); s.m.material.opacity = (1 - k) * 0.95;
      if (s.life <= 0) s.g.visible = false;
    }
    for (const f of this.flames) {
      if (f.life <= 0) continue;
      f.life -= dt;
      f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt;
      f.vx *= 0.97; f.vz *= 0.97;
      const k = Math.max(0, f.life / f.max);
      f.m.scale.setScalar(f.s * (1.9 - k)); f.m.material.opacity = Math.min(1, k * 1.4) * 0.85; f.core.material.opacity = k * 0.95;
      if (f.life <= 0) f.m.visible = false;
    }
  }

  clear() {
    for (const t of this.tele) { this.scene.remove(t.grp); for (const m of t.mats) m.dispose(); }
    this.tele = [];
    for (const [, o] of this.proj) { this.scene.remove(o.m); for (const m of o.mats) m.dispose(); } this.proj.clear();
    for (const [, o] of this.met) { this.scene.remove(o.rock); for (const m of o.mats) m.dispose(); } this.met.clear();
    for (const [, o] of this.zones) { this.scene.remove(o.g); for (const m of o.mats) m.dispose(); } this.zones.clear();
    for (const s of this.slashes) { s.life = 0; s.g.visible = false; }
    for (const f of this.flames) { f.life = 0; f.m.visible = false; }
  }

  dispose() {
    this.clear();
    for (const s of this.slashes) { this.scene.remove(s.g); s.m.geometry.dispose(); s.m.material.dispose(); }
    for (const f of this.flames) { this.scene.remove(f.m); f.m.material.dispose(); f.core.material.dispose(); }
    for (const g of [this.circleGeo, this.ringGeo, this.lineGeo, this.lineEdge, this.sphere, this.rock]) g.dispose();
    for (const { g, eg } of this.coneGeos.values()) { g.dispose(); eg.dispose(); }
    for (const t of Object.values(this.zoneTex)) t.dispose();
  }
}
