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

// Face shape per preset: jaw width, chin projection and nose size (1 = base anatomy).
export const SHAPE = {
  office01: { jaw: 1, chin: 1, nose: 1 },
  nurse01: { jaw: 1.03, chin: 0.8, nose: 0.9 },
  ceo01: { jaw: 0.96, chin: 1.25, nose: 1.1 },
  student01: { jaw: 1.04, chin: 0.75, nose: 0.85 },
  idol01: { jaw: 1, chin: 0.9, nose: 0.9 },
  janitor01: { jaw: 1.03, chin: 1.1, nose: 1.1 },
  rin01: { jaw: 0.96, chin: 1.15, nose: 0.95 },
  aoi01: { jaw: 1.02, chin: 1, nose: 1 },
  mei01: { jaw: 1.05, chin: 0.7, nose: 0.85 },
  yuki01: { jaw: 0.97, chin: 1.05, nose: 0.9 },
  kana01: { jaw: 0.98, chin: 1.1, nose: 1 },
  sakura01: { jaw: 0.97, chin: 1.1, nose: 0.95 },
};

// Lips per preset. w: half-width of the mouth (face-texture px) · top / bot: upper and lower lip fullness ·
// bow: cupid's bow (0.5 soft and rounded … 1.6 sharp) · peak: spacing of the bow peaks · corner: corner lift (px, + up)
// color: lipstick · finish: matte | satin | gloss | gradient | frost | bare | beni · liner: lip-liner colour · glitter
// The finish also sets how shiny the lips are in 3D (a roughness map on the face material).
export const LIP_FINISHES = ['matte', 'satin', 'gloss', 'gradient', 'frost', 'bare', 'beni'];
export const LIP_STYLE = {
  office01: { name: 'Rosewood satin', w: 104, top: 1.0, bot: 1.06, bow: 1.2, peak: 0.3, corner: 0, color: '#c24d68', finish: 'satin', liner: '#8e2f48' },
  nurse01: { name: 'Baby-pink gloss', w: 100, top: 1.05, bot: 1.32, bow: 0.65, peak: 0.26, corner: 2, color: '#f0879f', finish: 'gloss' },
  ceo01: { name: 'Classic red matte', w: 114, top: 1.2, bot: 1.25, bow: 1.6, peak: 0.34, corner: 4, color: '#b3122b', finish: 'matte', liner: '#7a0a1c' },
  student01: { name: 'Natural tint', w: 92, top: 0.72, bot: 1.0, bow: 0.8, peak: 0.24, corner: 0, color: '#e8909a', finish: 'bare' },
  idol01: { name: 'Gradient coral + shimmer', w: 100, top: 1.05, bot: 1.2, bow: 0.9, peak: 0.27, corner: 3, color: '#ff3d6c', finish: 'gradient', glitter: true },
  janitor01: { name: 'Bare lips', w: 108, top: 0.7, bot: 0.92, bow: 0.9, peak: 0.3, corner: -1, color: '#bd7468', finish: 'bare' },
  rin01: { name: 'Cool mauve matte', w: 96, top: 0.62, bot: 0.84, bow: 1.35, peak: 0.3, corner: -2, color: '#9c5a74', finish: 'matte' },
  aoi01: { name: 'Peach balm', w: 104, top: 0.9, bot: 1.05, bow: 1.0, peak: 0.28, corner: 1, color: '#f07f60', finish: 'satin' },
  mei01: { name: 'Cherry gloss', w: 88, top: 1.15, bot: 1.35, bow: 0.55, peak: 0.24, corner: 2, color: '#e02848', finish: 'gloss' },
  yuki01: { name: 'Icy pink frost', w: 96, top: 0.82, bot: 0.98, bow: 1.1, peak: 0.28, corner: 0, color: '#eaa2b8', finish: 'frost' },
  kana01: { name: 'Overlined nude gloss', w: 120, top: 1.35, bot: 1.45, bow: 0.8, peak: 0.3, corner: 2, color: '#e07a8c', finish: 'gloss', liner: '#9a4456' },
  sakura01: { name: 'Beni crimson', w: 98, top: 0.95, bot: 1.12, bow: 1.45, peak: 0.26, corner: 0, color: '#c01c36', finish: 'beni' },
};

// Gala costumes: an alternative colourway per figure for the Character Studio, unlocked by a gold medal on that statue.
export const COSTUMES = {
  office01: { name: 'Evening Gala', cloth: '#1d1b2c', suit: '#7a1f3d', suitDark: '#4a1026', accent: '#f2c35f', gold: '#f2c35f' },
  nurse01: { name: 'Mint Ward', cloth: '#f2fbf8', suit: '#f2fbf8', suitDark: '#9ad6c6', accent: '#3fae9a', gold: '#cfeee6' },
  ceo01: { name: 'Ivory Suit', cloth: '#1a1a22', suit: '#f1ece2', suitDark: '#c9bfae', accent: '#c9a466', gold: '#e8c87a' },
  student01: { name: 'Festival Blue', suit: '#2d4a7a', suitDark: '#1d3258', accent: '#f2c35f' },
  idol01: { name: 'Violet Stage', suit: '#6a4ae0', suitDark: '#4a2ab0', accent: '#7ff0ff', shoe: '#6a4ae0' },
  janitor01: { name: 'Coral Crew', suit: '#e8735a', suitDark: '#b8452c', accent: '#2f8a74' },
  rin01: { name: 'Wine Sailor', suit: '#7a1f2e', suitDark: '#4e1220', accent: '#f2c35f' },
  aoi01: { name: 'Night Match', cloth: '#1d2333', suit: '#ff7a3c', suitDark: '#c4501e', accent: '#ffffff' },
  mei01: { name: 'White Tea Party', suit: '#f6f2ff', suitDark: '#d8d0ee', cloth: '#22202a', accent: '#7fd0ff' },
  yuki01: { name: 'Frost Queen', suit: '#bfe6ff', suitDark: '#6aa8e0', accent: '#ffffff', gold: '#e0f4ff' },
  kana01: { name: 'Lime Pop', suit: '#a8dc72', suitDark: '#4f9a3c', accent: '#ff86b8' },
  sakura01: { name: 'Indigo Shrine', suit: '#2a3a7a', suitDark: '#1a2656', accent: '#f2c35f' },
};
