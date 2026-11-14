/* Pure water-only route finder and age gate for the sea voyage system. */
export function canResearchVoyage(age, kingdomLevel, hasCoast) { return Number(age) >= 2 && Number(kingdomLevel) >= 3 && !!hasCoast; }

/** Settings value is a base percentage; longer routes and storms make it riskier. */
export function shipwreckProbability(distance, riskPercent = 3, storm = false) {
  const base = Math.max(0, Math.min(10, Number(riskPercent) || 0)) / 100;
  const range = Math.max(0, Math.min(1, (Number(distance) || 0) / 120));
  return Math.min(.25, base * (.7 + .8 * range) * (storm ? 2 : 1));
}

export function findWaterRoute(tiles, width, height, start, targetLandByWater) {
  const n = width * height;
  if (!tiles || tiles.length < n || !targetLandByWater || targetLandByWater.length < n || !Number.isInteger(start) || start < 0 || start >= n || tiles[start] > 1) return null;
  const prev = new Int32Array(n); prev.fill(-2);
  const queue = new Int32Array(n); let head = 0, tail = 0;
  queue[tail++] = start; prev[start] = -1;
  let end = -1;
  while (head < tail) {
    const i = queue[head++];
    if (targetLandByWater[i] >= 0) { end = i; break; }
    const x = i % width, y = (i / width) | 0;
    const add = j => { if (prev[j] === -2 && tiles[j] <= 1) { prev[j] = i; queue[tail++] = j; } };
    if (x > 0) add(i - 1);
    if (x + 1 < width) add(i + 1);
    if (y > 0) add(i - width);
    if (y + 1 < height) add(i + width);
  }
  if (end < 0) return null;
  const path = []; for (let i = end; i >= 0; i = prev[i]) path.push(i);
  path.reverse();
  return { path, landIndex: targetLandByWater[end] };
}
