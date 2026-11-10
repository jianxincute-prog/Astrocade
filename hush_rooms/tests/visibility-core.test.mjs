import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isOccludedByWalls, segmentIntersectsWall } from '../visibility-core.mjs';

const wall = { minX: 4.9, maxX: 5.1, minZ: -2, maxZ: 2, bottom: 0, top: 3 };

describe('visibility wall tests', () => {
  it('detects a sightline blocked by a wall', () => {
    assert.equal(segmentIntersectsWall({ x: 0, y: 1.5, z: 0 }, { x: 10, y: 1.5, z: 0 }, wall), true);
  });

  it('keeps a room visible when any doorway sample is clear', () => {
    const samples = [
      { x: 10, y: 1.5, z: 0 },
      { x: 10, y: 1.5, z: 5 }
    ];
    assert.equal(isOccludedByWalls({ x: 0, y: 1.5, z: 0 }, samples, [wall]), false);
  });

  it('does not treat a ray above a wall as occluded', () => {
    assert.equal(segmentIntersectsWall({ x: 0, y: 4, z: 0 }, { x: 10, y: 4, z: 0 }, wall), false);
  });

  it('ignores walls that do not cross the sightline', () => {
    assert.equal(isOccludedByWalls({ x: 0, y: 1.5, z: 0 }, [{ x: 10, y: 1.5, z: 0 }], []), false);
  });
});
