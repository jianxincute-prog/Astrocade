// Rest poses are data, deliberately separate from rendering so the twelve silhouettes can be tested and tuned.
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
  idol01: {
    turn: 0.0,
    head: [0.02, -0.1, -0.08], // cute idol head tilt toward the mic hand
    gesture: 'microphone',
    arms: {
      // waves to the crowd with an open palm, arm raised out to the side
      L: { upper: [-0.55, -0.8, 0.15], fore: [-0.1, 1, 0.2], hand: [-0.05, 1, 0.1], palm: [0, 0, 1], curl: 0.06 },
      // holds a stage microphone just under her chin
      R: { upper: [0.25, -0.85, 0.45], fore: [-0.55, 0.75, 0.35], hand: [-0.35, 0.85, -0.3], palm: [-0.85, 0, -0.3], curl: 0.85, prop: 'mic' },
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
  rin01: {
    turn: 0.06,
    head: [-0.04, 0.14, 0.0], // cool, chin slightly raised, glancing aside
    gesture: 'book',
    arms: {
      // a closed book held flat against her hip
      L: { upper: [-0.12, -1, -0.06], fore: [-0.02, -0.12, 1], hand: [0, -0.3, 1], palm: [1, 0, 0], curl: 0.6, prop: 'book' },
      R: { upper: [0.1, -1, -0.02], fore: [0.02, -1, 0.15], hand: [-0.02, -1, 0.1], palm: [-1, 0, 0.1], curl: 0.4 },
    },
  },
  aoi01: {
    turn: -0.04,
    head: [-0.05, -0.06, 0.06],
    gesture: 'victory',
    arms: {
      // hand on hip
      L: { upper: [-0.62, -0.78, -0.1], fore: [0.6, -0.8, 0.12], hand: [0.35, -0.55, 0.55], palm: [1, 0, 0], curl: 0.3 },
      // victory fist punched up above her shoulder
      R: { upper: [0.8, 0.15, 0.12], fore: [0.05, 1, 0.12], hand: [0.02, 1, 0.05], palm: [0, 0, 1], curl: 0.95 },
    },
  },
  mei01: {
    turn: 0.04,
    head: [0.04, 0.08, 0.06], // polite, slightly bowed
    gesture: 'tray',
    arms: {
      // serving tray balanced on her palm in front of her
      L: { upper: [-0.16, -1, 0.04], fore: [0.05, 0.05, 1], hand: [0.05, 0.05, 1], palm: [0, 1, 0], curl: 0.15, prop: 'tray' },
      // pinches the side of her skirt
      R: { upper: [0.16, -1, 0.04], fore: [0.12, -1, 0.12], hand: [0.1, -1, 0.1], palm: [-1, 0, 0], curl: 0.6 },
    },
  },
  yuki01: {
    turn: -0.06,
    head: [0.06, -0.12, 0.0], // gazing down at the snowflake in her hand
    gesture: 'snowflake',
    arms: {
      L: { upper: [-0.15, -1, 0.0], fore: [-0.1, -1, 0.15], hand: [-0.05, -1, 0.25], palm: [1, 0, 0.3], curl: 0.3 },
      // open palm raised in front, a crystal snowflake hovering above it
      R: { upper: [0.25, -0.95, 0.2], fore: [-0.12, 0.35, 1], hand: [-0.05, 0.2, 1], palm: [0, 1, 0], curl: 0.2, prop: 'snow' },
    },
  },
  kana01: {
    turn: 0.08,
    head: [0.0, -0.14, -0.1], // selfie head tilt toward the phone
    gesture: 'selfie',
    arms: {
      // open hand near her cheek
      L: { upper: [-0.35, -0.9, 0.2], fore: [0.15, 1, 0.25], hand: [0.08, 1, 0.12], palm: [0, 0, 1], curl: 0.08 },
      // phone held up high to the side for a selfie
      R: { upper: [0.45, -0.35, 0.6], fore: [0.05, 0.95, 0.3], hand: [0.05, 0.95, -0.15], palm: [-0.6, 0, -0.8], curl: 0.75, prop: 'phone' },
    },
  },
  sakura01: {
    turn: -0.03,
    head: [0.03, 0.06, 0.03],
    gesture: 'broom',
    arms: {
      L: { upper: [-0.08, -1, 0.06], fore: [0.08, -1, 0.25], hand: [0.08, -1, 0.25], palm: [1, 0, 0], curl: 0.45 },
      // shrine broom held upright in front of her hip
      R: { upper: [0.1, -1, 0.15], fore: [-0.05, -0.3, 1], hand: [-0.6, 0, 0.8], palm: [-0.7, 0, -0.5], curl: 0.9, prop: 'broom' },
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
