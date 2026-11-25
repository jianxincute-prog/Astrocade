// Shared helpers: math, seeded RNG, i18n (en/id/ar), game state container.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const cfg = () => window.gameConfig || {};
export const tune = (k) => (cfg().tuning || {})[k];

// ---------- i18n ----------
let LANG = 'en';
export const LANGS = [
  { id: 'en', name: 'English' },
  { id: 'id', name: 'Indonesia' },
  { id: 'ar', name: 'العربية' }
];
export function setLang(l) { LANG = LANGS.some(x => x.id === l) ? l : 'en'; }
export function getLang() { return LANG; }
export function isRTL() { return LANG === 'ar'; }
export function t(key, vars) {
  const S = cfg().strings || {};
  let s = (S[LANG] && S[LANG][key]);
  if (s === undefined) { s = S.en && S.en[key]; if (window.mode === 'edit') console.warn('missing string', LANG, key); }
  if (s === undefined) return key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
export const itemName = (id) => t('i_' + id);
export const itemIcon = (id) => (cfg().items[id] || {}).icon || '?';

// ---------- state ----------
export function freshState() {
  return {
    v: 1, lang: 'en', quality: 'auto', muted: false,
    talent: null, redrawUsed: false,
    inv: { wood: 0, rope: 0, scrap: 0, cloth: 0, barrel: 0, can: 2, bottle: 2, gear: 0, battery: 0, fish: 0, gold: 0, part: 0 },
    day: 1, tod: 0.3,
    raftBuilt: false, up: { sail: 0, hull: 0, rudder: 0, lantern: 0 },
    tools: { goggles: 0, tank: 0, wraps: 0 },
    rods: [0, 0, 0, 0, 0, 0], rodEq: 0, castsLeft: 5, castDay: 1,
    chapter: 0, found: [], partIsl: [], taken: [], score: 0, best: 0,
    ftueDone: false, ended: false
  };
}
export function mergeState(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  for (const k in base) {
    if (saved[k] === undefined) continue;
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) Object.assign(base[k], saved[k]);
    else base[k] = saved[k];
  }
  return base;
}
