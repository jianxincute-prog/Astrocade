// Visual effects: hit sparks, shockwave rings, dust puffs, enemy telegraph rings, floating HP bars.
export class FX {
  constructor(T, scene) {
    this.T = T; this.scene = scene;
    this.sparks = [];
    const sg = new T.SphereGeometry(0.09, 6, 4);
    for (let i = 0; i < 70; i++) {
      const m = new T.Mesh(sg, new T.MeshBasicMaterial({ color: 0xffe08a, transparent: true }));
      m.visible = false; scene.add(m);
      this.sparks.push({ m, vx: 0, vy: 0, vz: 0, life: 0, max: 1 });
    }
    this.rings = [];
    const rg = new T.RingGeometry(0.8, 1, 48);
    for (let i = 0; i < 8; i++) {
      const m = new T.Mesh(rg, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: T.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m);
      this.rings.push({ m, life: 0, max: 1, size: 1 });
    }
    this.dust = [];
    const dg = new T.SphereGeometry(0.4, 8, 6);
    for (let i = 0; i < 40; i++) {
      const m = new T.Mesh(dg, new T.MeshStandardMaterial({ color: 0xb9ad9a, transparent: true, roughness: 1, depthWrite: false }));
      m.visible = false; scene.add(m);
      this.dust.push({ m, vx: 0, vy: 0, vz: 0, life: 0, max: 1 });
    }
  }

  burst(x, y, z, color = 0xffe08a, n = 12, speed = 7) {
    for (let k = 0; k < n; k++) {
      const s = this.sparks.find((p) => p.life <= 0) || this.sparks[(Math.random() * this.sparks.length) | 0];
      const a = Math.random() * Math.PI * 2, b = Math.random() * 1.2 - 0.2;
      const sp = speed * (0.4 + Math.random() * 0.8);
      s.vx = Math.cos(a) * Math.cos(b) * sp; s.vz = Math.sin(a) * Math.cos(b) * sp; s.vy = Math.sin(b) * sp + 2;
      s.m.position.set(x, y, z); s.life = s.max = 0.25 + Math.random() * 0.25;
      s.m.material.color.setHex(color); s.m.visible = true;
    }
  }

  ring(x, z, size, color = 0xffffff, dur = 0.45, y = 0.35) {
    const r = this.rings.find((p) => p.life <= 0) || this.rings[0];
    r.m.position.set(x, y, z); r.size = size; r.life = r.max = dur;
    r.m.material.color.setHex(color); r.m.visible = true;
  }

  puff(x, z, n = 5, spread = 1) {
    for (let k = 0; k < n; k++) {
      const d = this.dust.find((p) => p.life <= 0) || this.dust[0];
      const a = Math.random() * Math.PI * 2;
      d.vx = Math.cos(a) * 2 * spread; d.vz = Math.sin(a) * 2 * spread; d.vy = 0.8 + Math.random();
      d.m.position.set(x + Math.cos(a) * 0.3, 0.4, z + Math.sin(a) * 0.3);
      d.life = d.max = 0.5 + Math.random() * 0.3; d.m.visible = true;
    }
  }

  update(dt) {
    for (const s of this.sparks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      s.vy -= 18 * dt;
      s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt;
      const k = Math.max(0, s.life / s.max);
      s.m.material.opacity = k; s.m.scale.setScalar(0.5 + k);
      if (s.life <= 0) s.m.visible = false;
    }
    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      const k = 1 - Math.max(0, r.life / r.max);
      const s = r.size * (0.3 + 0.7 * Math.sqrt(k));
      r.m.scale.set(s, s, s);
      r.m.material.opacity = (1 - k) * 0.9;
      if (r.life <= 0) r.m.visible = false;
    }
    for (const d of this.dust) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt;
      d.vx *= 0.92; d.vz *= 0.92;
      const k = Math.max(0, d.life / d.max);
      d.m.material.opacity = k * 0.6; d.m.scale.setScalar(1.6 - k);
      if (d.life <= 0) d.m.visible = false;
    }
  }
}

/** Ground telegraph + HP bar attached to an enemy. */
export function makeEnemyAdornments(T, scene, gangColor) {
  const tele = new T.Mesh(new T.CircleGeometry(1, 32), new T.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0, depthWrite: false }));
  tele.rotation.x = -Math.PI / 2; tele.position.y = 0.27; scene.add(tele);
  const marker = new T.Mesh(new T.RingGeometry(0.55, 0.7, 24), new T.MeshBasicMaterial({ color: gangColor, transparent: true, opacity: 0.8, depthWrite: false }));
  marker.rotation.x = -Math.PI / 2; marker.position.y = 0.26; scene.add(marker);
  const bar = new T.Group();
  const bg = new T.Mesh(new T.PlaneGeometry(1.2, 0.14), new T.MeshBasicMaterial({ color: 0x111111, depthTest: false, transparent: true, opacity: 0.8 }));
  const fill = new T.Mesh(new T.PlaneGeometry(1.14, 0.09), new T.MeshBasicMaterial({ color: 0xff3b30, depthTest: false }));
  fill.position.z = 0.001;
  bg.renderOrder = 10; fill.renderOrder = 11;
  bar.add(bg, fill); scene.add(bar);
  return { tele, marker, bar, fill };
}
