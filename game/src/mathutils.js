// Small math helpers shared by every module.
export const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
export const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

// Frame-rate independent smoothing: moves a toward b, `rate` is 1/seconds.
export const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));

// Same as damp, but takes the short way around the circle (no spin at +/-PI).
export function dampAngle(a, b, rate, dt) {
  const d = ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return a + d * (1 - Math.exp(-rate * dt));
}

export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1, x = clamp(t, 0, 1);
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// P(t) = lerp(start, end, t) + (0, sin(pi t) * height, 0). Writes into `out`.
export function parabolaArc(start, end, height, t, out) {
  const x = clamp(t, 0, 1);
  out.lerpVectors(start, end, x);
  out.y += Math.sin(x * Math.PI) * height;
  return out;
}

// Yaw (rotation.y) that makes a rig that faces +Z look from `from` toward `to`.
export const yawToward = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
