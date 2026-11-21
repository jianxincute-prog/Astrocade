// Smooth camera presets. COOKING_ZOOM is `cookZoom` x the overview distance (0.85 = 15% closer).
const THREE = window.THREE;

export class CameraRig {
  constructor(camera, cfg = {}) {
    this.camera = camera;
    this.followSpeed = cfg.followSpeed ?? 4.5;
    const overview = { look: new THREE.Vector3(0, 1.15, -0.7), pos: new THREE.Vector3(0, 4.7, 5.5) };
    this.offset = overview.pos.clone().sub(overview.look); // overview direction and distance
    this.presets = { OVERVIEW: overview };
    this.setCookZoom(cfg.cookZoom ?? 0.85);
    this.mode = 'OVERVIEW';
    this.pos = overview.pos.clone();
    this.look = overview.look.clone();
    this.apply();
  }

  setCookZoom(zoom) {
    const mk = (look, k, dx = 0) => ({
      look, pos: look.clone().addScaledVector(this.offset, k).add(new THREE.Vector3(dx, 0, 0)),
    });
    this.presets.COOKING_ZOOM = mk(new THREE.Vector3(-0.1, 1.0, -0.7), zoom);
    this.presets.SERVING_FOCUS = mk(new THREE.Vector3(1.2, 0.95, 0.1), 0.92, 0.3);
  }

  setMode(key, instant = false) {
    if (!this.presets[key]) return;
    this.mode = key;
    if (instant) {
      this.pos.copy(this.presets[key].pos);
      this.look.copy(this.presets[key].look);
      this.apply();
    }
  }

  update(dt) {
    const p = this.presets[this.mode];
    const t = 1 - Math.exp(-this.followSpeed * dt);
    this.pos.lerp(p.pos, t);
    this.look.lerp(p.look, t);
    this.apply();
  }

  apply() {
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }
}
