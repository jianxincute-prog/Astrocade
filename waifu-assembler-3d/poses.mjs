// Rest poses are data, deliberately separate from rendering so the three silhouettes can be tested and tuned.
// Arms are posed by joint directions, not by rotating a rigid mesh: the sculptor walks shoulder → elbow → wrist
// with fixed bone lengths, so every pose keeps the arm attached at the shoulder and bends only at the elbow.
// Vectors are figure space (+X right of the figure, +Y up, +Z toward the viewer). Directions need not be unit length.
//   upper: shoulder → elbow    fore: elbow → wrist    hand: wrist → fingertips
//   palm: the way the palm faces    curl: 0 open … 1 fist
export const ARM_LENGTHS = { upper: 0.6, fore: 0.53 };
export const SHOULDER = { x: 0.355, y: 3.36, z: 0 };

export const STATUE_POSES = {
  office01: {
    turn: -0.08,
    head: [0.02, 0.12, -0.025],
    gesture: 'clipboard',
    arms: {
      // carries a clipboard against her hip: elbow back, forearm forward, hand gripping the board's front edge
      L: { upper: [-0.12, -1, -0.07], fore: [-0.02, -0.1, 1], hand: [0, -0.3, 1], palm: [1, 0, 0], curl: 0.55, prop: 'clipboard' },
      R: { upper: [0.1, -1, -0.03], fore: [0.03, -1, 0.2], hand: [-0.02, -1, 0.14], palm: [-1, 0, 0.12], curl: 0.35 },
    },
  },
  nurse01: {
    turn: 0.02,
    head: [0.02, -0.1, 0.055],
    gesture: 'wave',
    arms: {
      L: { upper: [-0.08, -1, 0.06], fore: [0.12, -1, 0.3], hand: [0.16, -1, 0.3], palm: [0.7, 0, -0.35], curl: 0.4 },
      // friendly wave: upper arm out to the side, elbow bent, open palm facing the visitor at shoulder height
      R: { upper: [0.5, -0.86, 0.12], fore: [0.04, 1, 0.22], hand: [0.06, 1, 0.08], palm: [0, 0, 1], curl: 0.08 },
    },
  },
  ceo01: {
    turn: -0.11,
    head: [0, 0.16, -0.03],
    gesture: 'presentation',
    arms: {
      // confident hand on hip
      L: { upper: [-0.62, -0.78, -0.1], fore: [0.6, -0.8, 0.12], hand: [0.35, -0.55, 0.55], palm: [1, 0, 0], curl: 0.25 },
      // presents forward with an open, palm-up hand
      R: { upper: [0.22, -0.93, 0.3], fore: [0.42, 0.08, 0.9], hand: [0.45, 0.05, 0.9], palm: [-0.15, 1, 0], curl: 0.18 },
    },
  },
  student01: {
    turn: 0.05,
    head: [0.03, -0.12, 0.07], // playful head tilt
    gesture: 'schoolbag',
    arms: {
      // carries her school bag by the handle at her side
      L: { upper: [-0.1, -1, 0.02], fore: [-0.04, -1, 0.1], hand: [0, -1, 0.12], palm: [1, 0, 0], curl: 0.75, prop: 'bag' },
      // small cheerful wave beside her face
      R: { upper: [0.35, -0.9, 0.2], fore: [-0.15, 1, 0.25], hand: [-0.08, 1, 0.12], palm: [0, 0, 1], curl: 0.08 },
    },
  },
  janitor01: {
    turn: -0.05,
    head: [0.0, 0.08, -0.02],
    gesture: 'mop',
    arms: {
      L: { upper: [-0.08, -1, 0.04], fore: [0.05, -1, 0.2], hand: [0.05, -1, 0.2], palm: [1, 0, 0], curl: 0.45 },
      // grips an upright mop handle in front of her right hip
      R: { upper: [0.1, -1, 0.15], fore: [-0.05, -0.3, 1], hand: [-0.6, 0, 0.8], palm: [-0.7, 0, -0.5], curl: 0.9, prop: 'mop' },
    },
  },
};

const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
// Joint positions in figure space for one arm (side -1 = left, +1 = right).
export function armJoints(setId, side) {
  const arm = STATUE_POSES[setId].arms[side < 0 ? 'L' : 'R'];
  const S = [side * SHOULDER.x, SHOULDER.y, SHOULDER.z];
  const u = unit(arm.upper); const f = unit(arm.fore);
  const E = [S[0] + u[0] * ARM_LENGTHS.upper, S[1] + u[1] * ARM_LENGTHS.upper, S[2] + u[2] * ARM_LENGTHS.upper];
  const W = [E[0] + f[0] * ARM_LENGTHS.fore, E[1] + f[1] * ARM_LENGTHS.fore, E[2] + f[2] * ARM_LENGTHS.fore];
  return { S, E, W, arm };
}
