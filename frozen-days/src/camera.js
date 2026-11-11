// Third-person camera that follows the character's position only. Its heading changes solely when the player
// sweeps the screen (a full 360 degrees); steering or walking never swings it around.
import { SPAWN } from './skating.js';

export function createCameraRig(camera) {
  let yaw = SPAWN.h, fov = 60;
  return {
    update(p, dt, c, lookDx) {
      if (lookDx) yaw += lookDx;
      const gy = p.y || 0;
      camera.position.set(p.x - Math.sin(yaw) * c.camDist, gy + c.camHeight + 0.06, p.z - Math.cos(yaw) * c.camDist);
      camera.lookAt(p.x + Math.sin(yaw) * 3, gy + 1.3, p.z + Math.cos(yaw) * 3);
      const f = 58 + Math.min(p.speed, 18) * 0.9;
      if (Math.abs(f - fov) > 0.05) { fov += (f - fov) * Math.min(1, dt * 4); camera.fov = fov; camera.updateProjectionMatrix(); }
    },
    get yaw() { return yaw; },
    snap(p) { yaw = p.h; fov = 58; camera.fov = 58; camera.updateProjectionMatrix(); },
  };
}
