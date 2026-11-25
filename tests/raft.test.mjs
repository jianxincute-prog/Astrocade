import assert from 'node:assert/strict';
import { raftTracker, canCallRaft, stepRaftMotion } from '../src/util.js';

// Hidden when raft is not built or player is already on the raft / at helm
assert.equal(raftTracker(false, false, false, 0, 0, 0, 20, 0), null);
assert.equal(raftTracker(true, true, false, 0, 0, 0, 20, 0), null);
assert.equal(raftTracker(true, false, true, 0, 0, 0, 20, 0), null);

// Computes rounded distance and relative angle when off-raft
const t1 = raftTracker(true, false, false, 0, 0, 0, 0, -25);
assert.equal(t1.dist, 25);
assert.ok(Math.abs(t1.ang) < 1e-6);

const t2 = raftTracker(true, false, false, 3, 4, 0, 6, 8);
assert.equal(t2.dist, 5);

// canCallRaft gating
assert.equal(canCallRaft(false, false, false), false);
assert.equal(canCallRaft(true, true, false), false);
assert.equal(canCallRaft(true, false, true), false);
assert.equal(canCallRaft(true, false, false), true);

// stepRaftMotion: responsive acceleration and standstill turning
const m1 = stepRaftMotion(0, 0, 1, 0, 9, false, 0.2);
assert.ok(m1.speed > 5, 'raft should accelerate briskly from standstill');
const mTurn = stepRaftMotion(0, 0, 0, 1, 9, false, 0.5);
assert.ok(Math.abs(mTurn.yaw) > 0.4, 'raft should turn responsively even at low speed');
const mRudder = stepRaftMotion(5, 0, 1, 1, 9, true, 0.5);
assert.ok(Math.abs(mRudder.yaw) > Math.abs(mTurn.yaw), 'rudder upgrade should turn faster');
const mRev = stepRaftMotion(0, 0, -0.7, 0, 9, false, 0.2);
assert.ok(mRev.speed < 0, 'negative input should move raft in reverse');
assert.ok(mTurn.yaw < 0, 'right turn input (s>0) should decrease yaw so (-sin, -cos) points right');

console.log('raft.test.mjs passed');
