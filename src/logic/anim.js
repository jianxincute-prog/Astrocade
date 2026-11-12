// Pure skeletal-pose animation: poses, blending, keyframe clips, procedural locomotion.
// A pose maps joint name -> [rx, ry, rz] (radians). 'root' holds [pitch, yaw, roll] of the
// whole body around its center of mass; 'rootPos' is [x, y, z] offset of that center.
// Left-side joints are authored in the character's own frame; the rig mirrors y/z for the right side.

export const JOINTS = [
  'root', 'rootPos', 'hips', 'spine', 'chest', 'neck', 'head',
  'lSh', 'lEl', 'rSh', 'rEl', 'lHip', 'lKn', 'lAn', 'rHip', 'rKn', 'rAn',
];

const TAU = Math.PI * 2;

export function zeroPose() {
  const p = {};
  for (const j of JOINTS) p[j] = [0, 0, 0];
  return p;
}

export function clonePose(src) {
  const p = {};
  for (const j of JOINTS) p[j] = src[j].slice();
  return p;
}

/** Full pose = base with overrides (partial joints). */
export function makePose(base, over = {}) {
  const p = clonePose(base);
  for (const k in over) p[k] = over[k].slice();
  return p;
}

export function wrapAngle(a) {
  a = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a;
}

/** Linear blend a->b by w into out (allocates if out omitted). */
export function blendPoses(a, b, w, out) {
  out = out || zeroPose();
  for (const j of JOINTS) {
    const pa = a[j], pb = b[j], po = out[j];
    po[0] = pa[0] + (pb[0] - pa[0]) * w;
    po[1] = pa[1] + (pb[1] - pa[1]) * w;
    po[2] = pa[2] + (pb[2] - pa[2]) * w;
  }
  return out;
}

const smooth = (t) => t * t * (3 - 2 * t);

export const IDLE_CYCLE = 12;

/** Idle gesture envelope: repeating bald-head scratch then a covered-mouth yawn. */
export function idleGestures(time) {
  const t = ((time % IDLE_CYCLE) + IDLE_CYCLE) % IDLE_CYCLE;
  const pulse = (start, dur, fade = 0.32) => {
    if (t < start || t > start + dur) return 0;
    return Math.min(1, smooth(Math.min(1, (t - start) / fade)), smooth(Math.min(1, (start + dur - t) / fade)));
  };
  return { scratch: pulse(2.2, 2.5), yawn: pulse(6.0, 2.8) };
}

/**
 * Sample a keyframe clip at normalized time u (0..1).
 * clip.keys = [{ t, pose, lin? }] sorted by t. Interpolation is smoothstep unless the
 * destination key has lin:true. Root rotations are wrapped so multi-turn spins end clean.
 */
export function sampleClip(clip, u, out) {
  out = out || zeroPose();
  const keys = clip.keys;
  if (clip.loop) u = ((u % 1) + 1) % 1;
  else u = Math.max(0, Math.min(1, u));
  let i = 0;
  while (i < keys.length - 2 && u > keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[Math.min(i + 1, keys.length - 1)];
  const span = k1.t - k0.t;
  let w = span > 0 ? (u - k0.t) / span : 0;
  w = Math.max(0, Math.min(1, w));
  if (!k1.lin) w = smooth(w);
  blendPoses(k0.pose, k1.pose, w, out);
  out.root[0] = wrapAngle(out.root[0]);
  out.root[1] = wrapAngle(out.root[1]);
  return out;
}

/** Blend that takes the short way around for root angles (for crossfading wrapped clips). */
export function blendPosesAngular(a, b, w, out) {
  blendPoses(a, b, w, out);
  for (let c = 0; c < 2; c++) {
    const d = wrapAngle(b.root[c] - a.root[c]);
    out.root[c] = wrapAngle(a.root[c] + d * w);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Authored poses
// ---------------------------------------------------------------------------
const Z = zeroPose();

export const GUARD = makePose(Z, {
  rootPos: [0, -0.07, 0],
  spine: [0.12, 0.15, 0], chest: [0.05, 0.1, 0], neck: [-0.1, 0, 0], head: [-0.05, -0.2, 0],
  lSh: [-0.75, -0.45, 0.32], lEl: [-2.05, 0, 0],
  rSh: [-0.45, -0.5, 0.35], rEl: [-2.15, 0, 0],
  lHip: [-0.32, 0.2, 0.06], lKn: [0.42, 0, 0], lAn: [-0.1, 0, 0],
  rHip: [0.12, 0.25, 0.06], rKn: [0.38, 0, 0], rAn: [-0.4, 0, 0],
  hips: [0, -0.25, 0],
});

const P = (over) => makePose(GUARD, over);
const K = (t, over, lin) => ({ t, pose: P(over), lin });

export const CLIPS = {
  jab: { keys: [
    K(0, {}),
    K(0.3, { hips: [0, -0.4, 0], chest: [0.05, -0.45, 0], lSh: [-1.55, 0.05, 0.08], lEl: [-0.08, 0, 0], head: [-0.05, 0.1, 0] }),
    K(0.55, { hips: [0, -0.4, 0], chest: [0.05, -0.45, 0], lSh: [-1.5, 0.05, 0.08], lEl: [-0.2, 0, 0], head: [-0.05, 0.1, 0] }),
    K(1, {}),
  ] },
  cross: { keys: [
    K(0, {}),
    K(0.18, { chest: [0.05, -0.2, 0], rSh: [-0.3, -0.4, 0.4], rEl: [-2.2, 0, 0] }),
    K(0.4, { hips: [0, 0.25, 0], spine: [0.15, 0.25, 0], chest: [0.08, 0.5, 0], rSh: [-1.58, 0, 0.02], rEl: [-0.05, 0, 0], rHip: [0.15, 0.2, 0.06], rAn: [-0.6, 0, 0], head: [-0.05, -0.4, 0] }),
    K(0.62, { hips: [0, 0.25, 0], spine: [0.15, 0.25, 0], chest: [0.08, 0.45, 0], rSh: [-1.5, 0, 0.05], rEl: [-0.25, 0, 0], head: [-0.05, -0.4, 0] }),
    K(1, {}),
  ] },
  uppercut: { keys: [
    K(0, {}),
    K(0.3, { rootPos: [0, -0.28, 0], spine: [0.35, -0.1, 0], chest: [0.1, -0.35, 0], rSh: [0.25, -0.2, 0.25], rEl: [-1.7, 0, 0],
      lHip: [-0.7, 0.2, 0.1], lKn: [1.0, 0, 0], lAn: [-0.3, 0, 0], rHip: [-0.2, 0.25, 0.1], rKn: [0.9, 0, 0] }),
    K(0.46, { rootPos: [0, 0.08, 0], spine: [-0.2, 0.3, 0], chest: [-0.1, 0.5, 0], rSh: [-2.7, 0, 0.1], rEl: [-0.9, 0, 0], head: [-0.25, -0.3, 0],
      lHip: [-0.2, 0.2, 0.06], lKn: [0.15, 0, 0], rHip: [0.2, 0.25, 0.06], rKn: [0.1, 0, 0], rAn: [-0.6, 0, 0] }),
    K(0.7, { rootPos: [0, 0.02, 0], spine: [-0.15, 0.25, 0], chest: [-0.05, 0.4, 0], rSh: [-2.5, 0, 0.12], rEl: [-1.0, 0, 0], head: [-0.2, -0.3, 0] }),
    K(1, {}),
  ] },
  dodge: { keys: [
    K(0, {}),
    K(0.14, { rootPos: [0, -0.55, 0.2], root: [0.6, 0, 0], spine: [0.8, 0, 0], neck: [0.5, 0, 0], lSh: [-1.3, -0.3, 0.3], lEl: [-1.6, 0, 0], rSh: [-1.3, -0.3, 0.3], rEl: [-1.6, 0, 0],
      lHip: [-1.5, 0, 0.1], lKn: [2.0, 0, 0], rHip: [-1.1, 0, 0.1], rKn: [1.9, 0, 0] }),
    K(0.45, { rootPos: [0, -0.85, 0], root: [Math.PI, 0, 0], spine: [0.9, 0, 0], neck: [0.6, 0, 0], lSh: [-1.4, -0.3, 0.3], lEl: [-1.8, 0, 0], rSh: [-1.4, -0.3, 0.3], rEl: [-1.8, 0, 0],
      lHip: [-1.9, 0, 0.1], lKn: [2.3, 0, 0], rHip: [-1.9, 0, 0.1], rKn: [2.3, 0, 0] }, true),
    K(0.76, { rootPos: [0, -0.55, 0], root: [TAU * 0.97, 0, 0], spine: [0.6, 0, 0], neck: [0.3, 0, 0], lSh: [-1.0, -0.3, 0.4], lEl: [-1.6, 0, 0], rSh: [-1.0, -0.3, 0.4], rEl: [-1.6, 0, 0],
      lHip: [-1.4, 0, 0.1], lKn: [2.0, 0, 0], rHip: [-0.6, 0, 0.1], rKn: [1.6, 0, 0] }, true),
    K(1, { root: [TAU, 0, 0] }),
  ] },
  slam: { keys: [
    K(0, {}),
    K(0.2, { rootPos: [0, -0.4, 0], spine: [0.45, 0, 0], chest: [0.1, 0, 0], lSh: [0.7, 0, 0.35], lEl: [-0.4, 0, 0], rSh: [0.7, 0, 0.35], rEl: [-0.4, 0, 0],
      lHip: [-0.9, 0.1, 0.2], lKn: [1.4, 0, 0], lAn: [-0.4, 0, 0], rHip: [-0.9, 0.1, 0.2], rKn: [1.4, 0, 0], rAn: [-0.4, 0, 0], hips: [0, 0, 0] }),
    K(0.42, { rootPos: [0, 1.5, 0], spine: [-0.25, 0, 0], chest: [-0.1, 0, 0], head: [-0.2, 0, 0], lSh: [-3.0, 0, 0.25], lEl: [-0.6, 0, 0], rSh: [-3.0, 0, 0.25], rEl: [-0.6, 0, 0],
      lHip: [-1.0, 0, 0.1], lKn: [1.5, 0, 0], rHip: [-0.4, 0, 0.1], rKn: [1.2, 0, 0], hips: [0, 0, 0] }),
    K(0.56, { rootPos: [0, -0.5, 0], spine: [0.95, 0, 0], chest: [0.2, 0, 0], head: [-0.5, 0, 0], lSh: [-1.0, 0, 0.15], lEl: [-0.1, 0, 0], rSh: [-1.0, 0, 0.15], rEl: [-0.1, 0, 0],
      lHip: [-1.0, 0, 0.35], lKn: [1.5, 0, 0], lAn: [-0.5, 0, 0], rHip: [-0.9, 0, 0.35], rKn: [1.5, 0, 0], rAn: [-0.5, 0, 0], hips: [0, 0, 0] }, true),
    K(0.8, { rootPos: [0, -0.45, 0], spine: [0.85, 0, 0], chest: [0.2, 0, 0], head: [-0.5, 0, 0], lSh: [-1.0, 0, 0.2], lEl: [-0.15, 0, 0], rSh: [-1.0, 0, 0.2], rEl: [-0.15, 0, 0],
      lHip: [-1.0, 0, 0.35], lKn: [1.5, 0, 0], lAn: [-0.5, 0, 0], rHip: [-0.9, 0, 0.35], rKn: [1.5, 0, 0], rAn: [-0.5, 0, 0], hips: [0, 0, 0] }),
    K(1, {}),
  ] },
  spin: { keys: [
    K(0, {}),
    K(0.1, { rootPos: [0, -0.12, 0], hips: [0, 0, 0], spine: [0.05, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], lSh: [-0.15, 0, 1.5], lEl: [-0.25, 0, 0], rSh: [-0.15, 0, 1.5], rEl: [-0.25, 0, 0],
      lHip: [-0.1, 0, 0.25], lKn: [0.5, 0, 0], rHip: [-0.1, 0, 0.25], rKn: [0.5, 0, 0], rAn: [-0.1, 0, 0] }),
    K(0.9, { root: [0, TAU * 3, 0], rootPos: [0, -0.12, 0], hips: [0, 0, 0], spine: [0.05, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], lSh: [-0.15, 0, 1.45], lEl: [-0.25, 0, 0], rSh: [-0.15, 0, 1.45], rEl: [-0.25, 0, 0],
      lHip: [-0.1, 0, 0.25], lKn: [0.5, 0, 0], rHip: [-0.1, 0, 0.25], rKn: [0.5, 0, 0], rAn: [-0.1, 0, 0] }, true),
    K(1, { root: [0, TAU * 3, 0] }),
  ] },
  rush: { keys: [
    K(0, {}),
    K(0.14, { rootPos: [0, -0.2, 0], spine: [0.6, -0.2, 0], chest: [0.1, -0.6, 0], head: [-0.6, 0.4, 0], lSh: [-0.4, -0.3, 0.55], lEl: [-2.0, 0, 0], rSh: [0.3, -0.3, 0.3], rEl: [-1.6, 0, 0],
      lHip: [-0.9, 0, 0.05], lKn: [0.9, 0, 0], rHip: [0.5, 0, 0.05], rKn: [0.6, 0, 0], hips: [0, -0.3, 0] }),
    K(0.3, { rootPos: [0, -0.12, 0], spine: [0.6, -0.2, 0], chest: [0.1, -0.6, 0], head: [-0.6, 0.4, 0], lSh: [-0.4, -0.3, 0.55], lEl: [-2.0, 0, 0], rSh: [0.3, -0.3, 0.3], rEl: [-1.6, 0, 0],
      lHip: [0.5, 0, 0.05], lKn: [0.7, 0, 0], rHip: [-0.9, 0, 0.05], rKn: [0.9, 0, 0], hips: [0, -0.3, 0] }),
    K(0.46, { rootPos: [0, -0.2, 0], spine: [0.6, -0.2, 0], chest: [0.1, -0.6, 0], head: [-0.6, 0.4, 0], lSh: [-0.4, -0.3, 0.55], lEl: [-2.0, 0, 0], rSh: [0.3, -0.3, 0.3], rEl: [-1.6, 0, 0],
      lHip: [-0.9, 0, 0.05], lKn: [0.9, 0, 0], rHip: [0.5, 0, 0.05], rKn: [0.6, 0, 0], hips: [0, -0.3, 0] }),
    K(0.6, { rootPos: [0, -0.15, 0], spine: [0.3, -0.3, 0], chest: [0.05, -0.7, 0], lSh: [-1.0, -0.4, 0.3], lEl: [-1.9, 0, 0], rSh: [0.45, -0.3, 0.35], rEl: [-1.9, 0, 0] }),
    K(0.72, { rootPos: [0, -0.2, 0], hips: [0, 0.35, 0], spine: [0.3, 0.3, 0], chest: [0.1, 0.6, 0], rSh: [-1.6, 0, 0.0], rEl: [-0.02, 0, 0], lSh: [-0.6, -0.4, 0.4], lEl: [-2.1, 0, 0],
      lHip: [-0.7, 0.2, 0.06], lKn: [0.7, 0, 0], rHip: [0.35, 0.25, 0.06], rKn: [0.2, 0, 0], rAn: [-0.6, 0, 0], head: [-0.15, -0.5, 0] }),
    K(0.86, { rootPos: [0, -0.18, 0], hips: [0, 0.35, 0], spine: [0.3, 0.3, 0], chest: [0.1, 0.55, 0], rSh: [-1.55, 0, 0.05], rEl: [-0.15, 0, 0], lSh: [-0.6, -0.4, 0.4], lEl: [-2.1, 0, 0],
      lHip: [-0.7, 0.2, 0.06], lKn: [0.7, 0, 0], rHip: [0.35, 0.25, 0.06], rKn: [0.2, 0, 0], head: [-0.15, -0.5, 0] }),
    K(1, {}),
  ] },
  hit: { keys: [
    K(0, {}),
    K(0.22, { spine: [-0.4, 0.2, 0.1], chest: [-0.15, 0, 0], head: [-0.45, 0.2, 0], neck: [-0.2, 0, 0], lSh: [-0.3, 0, 0.6], lEl: [-1.2, 0, 0], rSh: [-0.2, 0, 0.7], rEl: [-1.0, 0, 0],
      lHip: [0.1, 0.2, 0.06], lKn: [0.6, 0, 0], rootPos: [0, -0.12, -0.15] }),
    K(1, {}),
  ] },
  death: { keys: [
    K(0, {}),
    K(0.25, { spine: [-0.5, 0.2, 0.1], head: [-0.5, 0.3, 0], lSh: [-0.5, 0, 0.9], lEl: [-0.6, 0, 0], rSh: [-0.6, 0, 1.0], rEl: [-0.5, 0, 0], lKn: [0.9, 0, 0], rKn: [0.7, 0, 0], rootPos: [0, -0.25, -0.2] }),
    K(0.62, { root: [-1.5, 0, 0.1], rootPos: [0, -1.12, -0.9], spine: [-0.1, 0, 0], head: [-0.2, 0.6, 0], lSh: [-0.3, 0, 1.4], lEl: [-0.3, 0, 0], rSh: [-2.2, 0, 0.8], rEl: [-0.4, 0, 0],
      lHip: [-0.3, 0, 0.15], lKn: [0.6, 0, 0], rHip: [-0.1, 0, 0.1], rKn: [0.2, 0, 0], hips: [0, 0, 0], chest: [0, 0, 0] }),
    K(1, { root: [-1.57, 0, 0.12], rootPos: [0, -1.18, -0.95], spine: [0, 0, 0], head: [-0.1, 0.9, 0], lSh: [-0.2, 0, 1.3], lEl: [-0.2, 0, 0], rSh: [-2.4, 0, 0.7], rEl: [-0.3, 0, 0],
      lHip: [-0.2, 0, 0.15], lKn: [0.3, 0, 0], rHip: [0, 0, 0.1], rKn: [0.1, 0, 0], hips: [0, 0, 0], chest: [0, 0, 0] }),
  ] },
  // opening cutscene: check the phone held low, then take the call beside the head, head tilted into it (u driven by the cutscene)
  phone: { keys: [
    K(0, {}),
    K(0.2, { spine: [0.18, 0.1, 0], head: [0.3, -0.1, 0], neck: [0.1, 0, 0], rSh: [-0.8, -0.35, 0.3], rEl: [-1.75, 0, 0], lSh: [-0.2, 0, 0.12], lEl: [-0.5, 0, 0] }),
    K(0.4, { head: [-0.02, -0.5, -0.3], rSh: [-0.5, 1.3, 1.05], rEl: [-2.9, 0, 0], lSh: [-0.2, 0, 0.12], lEl: [-0.5, 0, 0] }),
    K(0.85, { head: [-0.02, -0.5, -0.3], rSh: [-0.5, 1.3, 1.05], rEl: [-2.9, 0, 0], lSh: [-0.2, 0, 0.12], lEl: [-0.5, 0, 0] }),
    K(1, {}),
  ] },
  // enemy overhead swing (bat / pipe / hammer fist)
  swing: { keys: [
    K(0, {}),
    K(0.45, { spine: [-0.15, -0.3, 0], chest: [-0.1, -0.4, 0], rSh: [-2.9, 0, 0.35], rEl: [-0.9, 0, 0], lSh: [-0.9, -0.3, 0.3], lEl: [-1.6, 0, 0], rHip: [0.3, 0.2, 0.06], rootPos: [0, -0.02, 0] }),
    K(0.58, { spine: [0.45, 0.2, 0], chest: [0.15, 0.45, 0], rSh: [-1.0, 0, 0.05], rEl: [-0.05, 0, 0], lSh: [-0.4, -0.3, 0.4], lEl: [-1.5, 0, 0], lHip: [-0.6, 0.2, 0.06], lKn: [0.7, 0, 0], rootPos: [0, -0.15, 0] }, true),
    K(0.8, { spine: [0.4, 0.2, 0], chest: [0.15, 0.4, 0], rSh: [-0.9, 0, 0.1], rEl: [-0.15, 0, 0], lSh: [-0.4, -0.3, 0.4], lEl: [-1.5, 0, 0], lHip: [-0.6, 0.2, 0.06], lKn: [0.7, 0, 0], rootPos: [0, -0.15, 0] }),
    K(1, {}),
  ] },
  // boss two-handed hammer smash
  smash: { keys: [
    K(0, {}),
    K(0.5, { rootPos: [0, 0.05, 0], spine: [-0.3, 0, 0], chest: [-0.1, 0, 0], head: [-0.2, 0, 0], lSh: [-3.0, -0.4, 0.15], lEl: [-0.9, 0, 0], rSh: [-3.0, -0.4, 0.15], rEl: [-0.9, 0, 0] }),
    K(0.62, { rootPos: [0, -0.35, 0], spine: [0.9, 0, 0], chest: [0.2, 0, 0], head: [-0.5, 0, 0], lSh: [-1.1, -0.3, 0.1], lEl: [-0.1, 0, 0], rSh: [-1.1, -0.3, 0.1], rEl: [-0.1, 0, 0],
      lHip: [-0.8, 0, 0.3], lKn: [1.2, 0, 0], rHip: [-0.5, 0, 0.3], rKn: [1.1, 0, 0] }, true),
    K(0.85, { rootPos: [0, -0.3, 0], spine: [0.8, 0, 0], chest: [0.2, 0, 0], head: [-0.5, 0, 0], lSh: [-1.1, -0.3, 0.15], lEl: [-0.15, 0, 0], rSh: [-1.1, -0.3, 0.15], rEl: [-0.15, 0, 0],
      lHip: [-0.8, 0, 0.3], lKn: [1.2, 0, 0], rHip: [-0.5, 0, 0.3], rKn: [1.1, 0, 0] }),
    K(1, {}),
  ] },
};

/** Idle: fighting stance with breathing bob and slight sway. Loops every ~1.6s. */
export function idlePose(time, out) {
  out = out || zeroPose();
  const p = clonePose(GUARD);
  const phaseTime = ((time % IDLE_CYCLE) + IDLE_CYCLE) % IDLE_CYCLE;
  const b = Math.sin(phaseTime * Math.PI / 2);
  p.rootPos[1] += b * 0.018;
  p.chest[0] += b * 0.025;
  p.lSh[0] += b * 0.035;
  p.rSh[0] -= b * 0.035;
  p.lKn[0] += (b + 1) * 0.03;
  p.rKn[0] += (b + 1) * 0.03;
  p.head[1] += Math.sin(phaseTime * Math.PI / 3) * 0.05;

  const g = idleGestures(time);
  if (g.scratch > 0) {
    // Right hand reaches the bald crown; little elbow pulses sell the scratching motion.
    const itch = Math.sin((phaseTime - 2.2) * 22) * 0.13 * g.scratch;
    const s = makePose(p, {
      rSh: [-1.35 - itch * 0.4, -0.28, 1.05],
      rEl: [-2.6 + itch, 0.0, 0.0],
      spine: [0.1, 0.04, 0], head: [-0.14, 0.12, 0],
    });
    blendPoses(p, s, g.scratch, out);
    for (const j of JOINTS) p[j] = out[j].slice();
  }
  if (g.yawn > 0) {
    // Left fist covers the mouth as the head tilts back; the opposite elbow opens slightly.
    const breath = Math.sin((phaseTime - 6) * 4) * 0.06 * g.yawn;
    const y = makePose(p, {
      lSh: [-0.9 - breath, 0.1, 0.88], lEl: [-1.8, 0, 0],
      rSh: [-0.12, -0.38, 0.52], rEl: [-1.35, 0, 0],
      chest: [-0.08 - breath, 0, 0], neck: [-0.24, 0, 0], head: [-0.3, -0.04, 0],
      rootPos: [0, 0.015, 0],
    });
    blendPoses(p, y, g.yawn, out);
    for (const j of JOINTS) p[j] = out[j].slice();
  }
  for (const j of JOINTS) out[j] = p[j];
  return out;
}

/**
 * Locomotion cycle. phase in radians (one stride per 2π), run 0..1 (walk->run).
 * Legs swing opposite, knees fold during swing, arms counter-swing, torso bobs twice a cycle.
 */
export function locomotionPose(phase, run, out) {
  out = out || zeroPose();
  const p = zeroPose();
  const s = Math.sin(phase), c = Math.cos(phase);
  const legAmp = 0.45 + 0.35 * run;
  p.lHip[0] = -s * legAmp - 0.1 * run;
  p.rHip[0] = s * legAmp - 0.1 * run;
  p.lKn[0] = 0.15 + (0.5 + 0.9 * run) * Math.max(0, c);
  p.rKn[0] = 0.15 + (0.5 + 0.9 * run) * Math.max(0, -c);
  p.lAn[0] = -0.15 * s;
  p.rAn[0] = 0.15 * s;
  p.lHip[2] = 0.04; p.rHip[2] = 0.04;
  const armAmp = 0.35 + 0.45 * run;
  p.lSh[0] = s * armAmp - 0.2 * run;
  p.rSh[0] = -s * armAmp - 0.2 * run;
  p.lSh[2] = 0.18; p.rSh[2] = 0.18;
  p.lEl[0] = -0.5 - 0.9 * run;
  p.rEl[0] = -0.5 - 0.9 * run;
  p.lSh[1] = -0.2; p.rSh[1] = -0.2;
  p.spine[0] = 0.05 + 0.2 * run;
  p.chest[1] = 0.12 * s;
  p.hips[1] = -0.1 * s;
  p.head[0] = -0.05 - 0.12 * run;
  p.rootPos[1] = -0.04 - 0.05 * run + (0.035 + 0.05 * run) * Math.abs(c);
  p.root[2] = 0.03 * s;
  for (const j of JOINTS) out[j] = p[j];
  return out;
}

/** Phase advance for a given ground speed (units/s) and stride length. */
export function stridePhaseRate(speed, strideLen = 2.6) {
  return (TAU * speed) / strideLen;
}
