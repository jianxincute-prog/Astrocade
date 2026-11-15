/* Rivers and roads - pure rules (no DOM / window / lib).
 * Rivers run downhill (towards the sea) from the high ground; roads grow where settlers keep walking. */
export const ROAD_STEPS = 36;

/** Distance (in steps over non-lava tiles) from every tile to the nearest water tile. Unreachable tiles get 65535. */
export function distToWater(tiles, W, H) {
  const N = W * H, d = new Uint16Array(N).fill(65535), q = new Int32Array(N); let h = 0, t = 0;
  for (let i = 0; i < N; i++) if (tiles[i] <= 1) { d[i] = 0; q[t++] = i; }
  while (h < t) {
    const i = q[h++], x = i % W, y = (i / W) | 0, nd = d[i] + 1;
    const add = j => { if (d[j] === 65535 && tiles[j] !== 8) { d[j] = nd; q[t++] = j; } };
    if (x > 0) add(i - 1); if (x + 1 < W) add(i + 1); if (y > 0) add(i - W); if (y + 1 < H) add(i + W);
  }
  return d;
}

/**
 * Trace rivers from far inland highlands down to the sea. rnd() is a uniform [0,1) generator.
 * Returns { mask (1 on river land tiles), rivers (arrays of tile indices) }.
 */
export function traceRivers(tiles, W, H, rnd, count) {
  const N = W * H, d = distToWater(tiles, W, H), mask = new Uint8Array(N), rivers = [];
  const want = count == null ? Math.min(12, Math.max(2, Math.round(N / 7000))) : count;
  const cand = [];
  for (let i = 0; i < N; i++) if (d[i] >= 9 && d[i] < 65535 && tiles[i] >= 5 && tiles[i] <= 7) cand.push(i);
  if (cand.length < 20) for (let i = 0; i < N; i++) if (d[i] >= 8 && d[i] < 65535 && tiles[i] >= 3 && tiles[i] <= 6) cand.push(i);
  const near = (i, r) => { const x = i % W, y = (i / W) | 0; for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) if (mask[xx + yy * W]) return true; return false; };
  for (let tries = 0; tries < 60 && rivers.length < want && cand.length; tries++) {
    const src = cand[Math.floor(rnd() * cand.length)];
    if (mask[src] || near(src, 14)) continue;
    const path = [], seen = new Set(); let cur = src, ok = false;
    for (let step = 0; step < 600; step++) {
      if (tiles[cur] <= 1) { ok = true; break; }
      path.push(cur); seen.add(cur);
      const x = cur % W, y = (cur / W) | 0, opts = [], side = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = nx + ny * W; if (seen.has(j) || tiles[j] === 8 || d[j] === 65535) continue;
        if (d[j] < d[cur]) opts.push(j); else if (d[j] === d[cur] && dx * dy === 0) side.push(j);
      }
      if (!opts.length && !side.length) break;
      cur = side.length && rnd() < .3 ? side[Math.floor(rnd() * side.length)] : opts.length ? opts[Math.floor(rnd() * opts.length)] : side[0];
    }
    if (!ok || path.length < 14) continue;
    for (const i of path) if (tiles[i] >= 2) mask[i] = 1;
    rivers.push(path);
  }
  return { mask, rivers };
}

/** Tiles where a worn trail can become a road (not mountains, snow, lava or water). */
export function roadable(tile) { return tile >= 2 && tile <= 5 || tile === 9; }
/** Count a footstep on tile i; returns true when it just turned into a road. `trail` is a Uint8Array. */
export function stepTrail(trail, i, tile, inTerritory) {
  if (!inTerritory || !roadable(tile)) return false;
  if (trail[i] < 255) trail[i]++;
  return trail[i] === ROAD_STEPS;
}

/** Flat run encoding of a 0/1 mask: [start, length, start, length, ...]. */
export function runsEncode(mask) {
  const out = []; let s = -1;
  for (let i = 0; i <= mask.length; i++) {
    const on = i < mask.length && mask[i];
    if (on && s < 0) s = i; else if (!on && s >= 0) { out.push(s, i - s); s = -1; }
  }
  return out;
}
export function runsDecode(runs, mask) {
  mask.fill(0);
  if (!Array.isArray(runs)) return false;
  for (let k = 0; k + 1 < runs.length; k += 2) { const s = runs[k] | 0, n = runs[k + 1] | 0; for (let i = s; i < s + n && i < mask.length; i++) if (i >= 0) mask[i] = 1; }
  return true;
}
