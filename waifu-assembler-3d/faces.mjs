// Character face system data: 12 face presets and 10 expressions. Pure data (no Babylon), so it can be tested.
// Expressions drive real 3D geometry in statues.js: eyelid shells that close over the 3D eyeballs, a mouth cavity
// with teeth and tongue behind an opening in the face mesh, 3D tears, plus the painted brows/blush on the head mesh.

// The first six are the in-game statues; the last six are extra figures shown in the Character Studio.
export const FACE_PRESETS = [
  { id: 'office01', name: 'OFFICE-01', title: 'Office lady · glasses' },
  { id: 'nurse01', name: 'NURSE-01', title: 'Gentle nurse' },
  { id: 'ceo01', name: 'CEO-01', title: 'Elegant executive' },
  { id: 'student01', name: 'STUDENT-01', title: 'Schoolgirl · red bow' },
  { id: 'idol01', name: 'IDOL-01', title: 'Stage idol' },
  { id: 'janitor01', name: 'JANITOR-01', title: 'Hard-working caretaker' },
  { id: 'rin01', name: 'RIN-01', title: 'Cool kuudere · silver bob' },
  { id: 'aoi01', name: 'AOI-01', title: 'Sporty · high ponytail' },
  { id: 'mei01', name: 'MEI-01', title: 'Maid · twin tails' },
  { id: 'yuki01', name: 'YUKI-01', title: 'Snow princess' },
  { id: 'kana01', name: 'KANA-01', title: 'Gyaru · honey waves' },
  { id: 'sakura01', name: 'SAKURA-01', title: 'Shrine maiden · hime cut' },
];

export const EXPRESSIONS = ['neutral', 'smiling', 'happy', 'shy', 'angry', 'sad', 'surprised', 'wink', 'crying', 'smug'];

// lid: closure of each upper lid [figure-left, figure-right] (0 open … 1 closed); happy: closed lids curve up (^ ^)
// squeeze: tightly shut (crying); tilt: lid slant in degrees (+ inner corner down = angry); low: lower lid elevation
// mouth: closed | smile | small | smirk | open | o; smile: corner lift −1…1; open: mouth opening 0…1
// brow: [inner-end tilt (+ down), raise (head units)]; browRaise: extra lift of the figure-right brow (smug)
// look: gaze offset [x, y] −1…1; iris: iris scale; blush: extra blush; tears: 3D tear streaks
export const EXPR = {
  neutral: { lid: [0.1, 0.1], low: -40, mouth: 'closed', smile: 0.15, open: 0, brow: [0, 0], blush: 0 },
  smiling: { lid: [0.22, 0.22], low: -30, mouth: 'smile', smile: 0.85, open: 0, brow: [-0.1, 0.02], blush: 0.08 },
  happy: { lid: [1, 1], happy: [true, true], low: -40, mouth: 'open', smile: 1, open: 0.55, brow: [-0.2, 0.05], blush: 0.2 },
  shy: { lid: [0.38, 0.38], low: -34, mouth: 'small', smile: 0.25, open: 0, brow: [-0.7, 0.02], blush: 0.7, look: [0.3, -0.6], hatch: true },
  angry: { lid: [0.3, 0.3], tilt: 16, low: -32, mouth: 'open', smile: -0.8, open: 0.28, brow: [1, -0.02], blush: 0 },
  sad: { lid: [0.42, 0.42], tilt: -12, low: -36, mouth: 'closed', smile: -0.7, open: 0, brow: [-1, 0.03], blush: 0.05, look: [0, -0.35] },
  surprised: { lid: [-0.1, -0.1], low: -46, mouth: 'o', smile: 0, open: 0.8, brow: [-0.2, 0.14], blush: 0, iris: 0.84 },
  wink: { lid: [0.16, 1], happy: [false, true], low: -30, mouth: 'open', smile: 0.9, open: 0.25, brow: [0, 0.03], blush: 0.15 },
  crying: { lid: [1, 1], squeeze: true, low: -40, mouth: 'open', smile: -0.6, open: 0.6, brow: [-1, 0.04], blush: 0.35, tears: true },
  smug: { lid: [0.5, 0.5], low: -30, mouth: 'smirk', smile: 0.6, open: 0, brow: [0.2, 0], browRaise: 0.012, blush: 0.08, look: [-0.45, 0] },
};

// Each statue on display wears its own signature expression.
export const DEFAULT_EXPR = {
  office01: 'smiling', nurse01: 'happy', ceo01: 'smug', student01: 'shy', idol01: 'wink', janitor01: 'smiling',
  rin01: 'neutral', aoi01: 'happy', mei01: 'smiling', yuki01: 'neutral', kana01: 'wink', sakura01: 'smiling',
};

// Face shape per preset: jaw width, chin projection, nose and lip size (1 = base anatomy).
export const SHAPE = {
  office01: { jaw: 1, chin: 1, nose: 1, lips: 1 },
  nurse01: { jaw: 1.03, chin: 0.8, nose: 0.9, lips: 1 },
  ceo01: { jaw: 0.96, chin: 1.25, nose: 1.1, lips: 1.15 },
  student01: { jaw: 1.04, chin: 0.75, nose: 0.85, lips: 0.9 },
  idol01: { jaw: 1, chin: 0.9, nose: 0.9, lips: 1.05 },
  janitor01: { jaw: 1.03, chin: 1.1, nose: 1.1, lips: 1 },
  rin01: { jaw: 0.96, chin: 1.15, nose: 0.95, lips: 0.85 },
  aoi01: { jaw: 1.02, chin: 1, nose: 1, lips: 1 },
  mei01: { jaw: 1.05, chin: 0.7, nose: 0.85, lips: 0.95 },
  yuki01: { jaw: 0.97, chin: 1.05, nose: 0.9, lips: 0.95 },
  kana01: { jaw: 0.98, chin: 1.1, nose: 1, lips: 1.2 },
  sakura01: { jaw: 0.97, chin: 1.1, nose: 0.95, lips: 1 },
};
