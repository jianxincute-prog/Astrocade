const THREE = window.THREE;

// Low / Med / High tiers. "auto" measures the first frames and picks one.
export const TIERS = {
  low: { pixelRatio: 1, shadows: false, mapSize: 512 },
  med: { pixelRatio: 1.5, shadows: true, mapSize: 1024 },
  high: { pixelRatio: 2, shadows: true, mapSize: 2048 },
};

export class Quality {
  constructor(renderer, sun, scene, size, setting = 'auto') {
    this.renderer = renderer; this.sun = sun; this.scene = scene; this.size = size;
    this.setting = setting;
    this.tier = 'med';
    this.frames = 0; this.sum = 0; this.done = setting !== 'auto';
    this.apply(setting === 'auto' ? 'med' : setting);
  }

  apply(name) {
    const t = TIERS[name] || TIERS.med;
    this.tier = name;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, t.pixelRatio));
    this.renderer.setSize(this.size.w, this.size.h, false);
    this.renderer.shadowMap.enabled = t.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // softer, more natural shadow edges
    this.sun.castShadow = t.shadows;
    if (this.sun.shadow.mapSize.x !== t.mapSize) {
      this.sun.shadow.mapSize.set(t.mapSize, t.mapSize);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  }

  get progress() { return this.done ? 1 : Math.min(1, this.frames / 150); }

  // Call once per frame with the raw delta time (seconds).
  sample(dt) {
    if (this.done) return;
    this.frames++;
    if (this.frames <= 30) return; // warm-up
    this.sum += dt;
    if (this.frames >= 150) {
      const avg = this.sum / 120;
      this.done = true;
      this.apply(avg > 0.028 ? 'low' : avg > 0.019 ? 'med' : 'high');
    }
  }

  set(setting) {
    this.setting = setting;
    if (setting === 'auto') { this.frames = 0; this.sum = 0; this.done = false; }
    else { this.done = true; this.apply(setting); }
  }
}
