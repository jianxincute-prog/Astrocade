/*
 * Character sprite scale — pure helper.
 * size = width of a 10-pixel sprite in map tiles (1.2 = default, the old look was ~1.7).
 * Below 2.5 px-per-pixel the scale snaps to whole numbers so the pixel art stays crisp;
 * above that it grows smoothly with the zoom.
 */
export const CHAR_SIZE_DEFAULT = 1.2, CHAR_SIZE_MIN = 0.6, CHAR_SIZE_MAX = 2;

export function charSize(v) {
  const n = +v;
  if (v == null || v === '' || !isFinite(n)) return CHAR_SIZE_DEFAULT;
  return Math.min(CHAR_SIZE_MAX, Math.max(CHAR_SIZE_MIN, n));
}

/** Screen pixels per sprite pixel for characters at tile size `sc`. */
export function charScale(sc, size) {
  const k = sc * charSize(size) / 10;
  return k < 2.5 ? Math.max(1, Math.round(k)) : k;
}
