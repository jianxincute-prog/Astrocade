// Pure camera math: view modes, camera-relative input, third-person placement with wall avoidance.
import { angleDiff } from './combat.js';

export const CAMERA_MODES = ['topdown', 'third'];
export const TOPDOWN_YAW = Math.PI; // top-down camera always looks north (-z)

export function nextCameraMode(mode) {
  const i = CAMERA_MODES.indexOf(mode);
  return CAMERA_MODES[(i + 1) % CAMERA_MODES.length];
}

/**
 * Converts stick input (mx right+, mz down+ on screen) to world space for a camera whose
 * forward is (sin yaw, cos yaw). With yaw = π this is the identity (top-down convention).
 */
export function cameraRelative(mx, mz, yaw) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const rx = -Math.cos(yaw), rz = Math.sin(yaw);
  return { x: rx * mx - fx * mz, z: rz * mx - fz * mz };
}

/** Third-person auto-follow: ease the camera behind the hero while he moves (not while the player drags). */
export function followYaw(yaw, facing, dt, moving, manualHold) {
  if (!moving || manualHold > 0) return yaw;
  const d = angleDiff(yaw, facing);
  // Only swing behind the hero when he runs forward/sideways. Running toward the camera
  // (stick down) must not rotate it, or the camera keeps flipping behind him and he spins forever.
  const k = Math.max(0, Math.min(1, (Math.cos(d) + 0.3) / 1.3));
  return yaw + d * Math.min(1, dt * 1.6) * k;
}

/**
 * Third-person eye/target. blocked(x,z) reports walls; the boom shortens so the camera never
 * ends up inside a building.
 */
export function thirdPersonRig(px, pz, yaw, opts = {}, blocked = null) {
  const dist = opts.dist || 6.2, height = opts.height || 3.7, minDist = 1.8;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  let d = dist;
  if (blocked) {
    for (let s = 0.6; s <= dist; s += 0.4) {
      if (blocked(px - fx * s, pz - fz * s)) { d = Math.max(minDist, s - 0.6); break; }
    }
  }
  const lift = height * (0.55 + 0.45 * (d / dist));
  return {
    eye: { x: px - fx * d, y: lift, z: pz - fz * d },
    look: { x: px + fx * 1.2, y: 1.05, z: pz + fz * 1.2 },
    dist: d,
  };
}
