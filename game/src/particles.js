// Pooled blocky particles (steam, sparkles, hearts). Fixed pool: no allocation after construction.
const THREE = window.THREE;

const KINDS = {
  steam: { color: 0xffffff, size: 0.12, life: 0.9, grow: 2.2, opacity: 0.55, gravity: 0 },
  sparkle: { color: 0xffe066, size: 0.07, life: 0.6, grow: 0, opacity: 1, gravity: -3 },
  flash: { color: 0xfff3b0, size: 0.1, life: 0.7, grow: 0, opacity: 1, gravity: -2.5 },
  heart: { color: 0xff7aa2, size: 0.11, life: 1.1, grow: 0.3, opacity: 1, gravity: 0 },
};

export class Particles {
  constructor(scene, count = 90) {
    this.pool = [];
    this.next = 0;
    this.steamAcc = 0;
    const g = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
      m.visible = false;
      m.userData = { life: 0, max: 1, vx: 0, vy: 0, vz: 0, grow: 0, g: 0, base: 0.1, op: 1, kind: 'steam' };
      scene.add(m);
      this.pool.push(m);
    }
  }

  emit(kind, pos, count = 1) {
    const k = KINDS[kind];
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.next]; this.next = (this.next + 1) % this.pool.length;
      const u = p.userData;
      u.kind = kind; u.life = u.max = k.life * (0.8 + Math.random() * 0.4);
      u.base = k.size; u.grow = k.grow; u.g = k.gravity; u.op = k.opacity;
      p.material.color.setHex(k.color);
      p.position.set(pos.x + (Math.random() - 0.5) * 0.15, pos.y, pos.z + (Math.random() - 0.5) * 0.15);
      if (kind === 'steam') { u.vx = (Math.random() - 0.5) * 0.15; u.vy = 0.45 + Math.random() * 0.25; u.vz = (Math.random() - 0.5) * 0.15; }
      else if (kind === 'heart') { u.vx = (Math.random() - 0.5) * 0.5; u.vy = 0.8 + Math.random() * 0.4; u.vz = (Math.random() - 0.5) * 0.3; }
      else { const a = Math.random() * 6.283, s = 1.2 + Math.random() * 1.2; u.vx = Math.cos(a) * s; u.vy = 1.5 + Math.random() * 1.5; u.vz = Math.sin(a) * s; }
      p.scale.setScalar(u.base);
      p.visible = true;
    }
  }

  // Steam at `rate` particles per second, frame-rate independent.
  steam(pos, dt, rate = 14) {
    this.steamAcc += dt * rate;
    const n = Math.floor(this.steamAcc);
    if (n > 0) { this.steamAcc -= n; this.emit('steam', pos, n); }
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.visible) continue;
      const u = p.userData;
      u.life -= dt;
      if (u.life <= 0) { p.visible = false; continue; }
      u.vy += u.g * dt;
      p.position.x += u.vx * dt; p.position.y += u.vy * dt; p.position.z += u.vz * dt;
      const t = 1 - u.life / u.max;
      p.scale.setScalar(u.base * (1 + u.grow * t));
      p.material.opacity = u.op * (1 - t);
    }
  }
}
