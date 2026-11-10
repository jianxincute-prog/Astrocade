// Third-person chase camera: eases behind the skater's heading; drag to look around.
import { angleDiff } from './util.js';
import { SPAWN } from './skating.js';

export function createCameraRig(camera) {
  let yaw = SPAWN.h, off = 0, idle = 0, fov = 60;
  return {
    update(p, dt, c, lookDx) {
      yaw += angleDiff(p.h, yaw) * (1 - Math.exp(-2.0 * dt));
      if (lookDx) { off = Math.max(-2.4, Math.min(2.4, off + lookDx)); idle = 0; }
      else { idle += dt; if (idle > 1.5) off *= Math.exp(-2.5 * dt); }
      const a = yaw + off;
      const gy = p.y || 0;
      camera.position.set(p.x - Math.sin(a) * c.camDist, gy + c.camHeight + 0.06, p.z - Math.cos(a) * c.camDist);
      camera.lookAt(p.x + Math.sin(a) * 3, gy + 1.3, p.z + Math.cos(a) * 3);
      const f = 58 + Math.min(p.speed, 18) * 0.9;
      if (Math.abs(f - fov) > 0.05) { fov += (f - fov) * Math.min(1, dt * 4); camera.fov = fov; camera.updateProjectionMatrix(); }
    },
    snap(p) { yaw = p.h; off = 0; fov = 58; camera.fov = 58; camera.updateProjectionMatrix(); },
  };
}
