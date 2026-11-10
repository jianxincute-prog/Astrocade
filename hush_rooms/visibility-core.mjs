// Pure reference helpers matching the self-contained runtime implementation; unit tested here.
// Wall records are axis-aligned bounds in world X/Z plus vertical extents.
export function segmentIntersectsWall(from, to, wall) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  let tMin = 0;
  let tMax = 1;

  const clipAxis = (origin, delta, min, max) => {
    if (Math.abs(delta) < 1e-8) return origin >= min && origin <= max;
    let a = (min - origin) / delta;
    let b = (max - origin) / delta;
    if (a > b) [a, b] = [b, a];
    tMin = Math.max(tMin, a);
    tMax = Math.min(tMax, b);
    return tMin <= tMax;
  };

  if (!clipAxis(from.x, dx, wall.minX, wall.maxX)) return false;
  if (!clipAxis(from.z, dz, wall.minZ, wall.maxZ)) return false;
  // Ignore contact right at the sample point inside the destination room.
  if (tMin >= 0.98 || tMax <= 0) return false;

  const y0 = from.y + (to.y - from.y) * tMin;
  const y1 = from.y + (to.y - from.y) * tMax;
  const rayLow = Math.min(y0, y1);
  const rayHigh = Math.max(y0, y1);
  return rayHigh >= wall.bottom && rayLow <= wall.top;
}

// A room stays visible when any sample point can be seen through a doorway.
export function isOccludedByWalls(from, targetSamples, walls) {
  if (!targetSamples || targetSamples.length === 0 || !walls || walls.length === 0) return false;
  return targetSamples.every(target => walls.some(wall => segmentIntersectsWall(from, target, wall)));
}
