// World layout (pure data + math, no rendering): organic lake shoreline, road / path network, terrain height,
// district zones, docks, creek and bridge. World is 300 x 300 units centred on (0,0); north = +Z, east = +X.
// Everything that needs to agree about "where things are" (physics, NPCs, scenery, zones) reads from here.
import { clamp } from './util.js';

export const WORLD_HALF = 150;
export const MAP_HALF = 145; // walkable limit
const TAU = Math.PI * 2, D2R = Math.PI / 180;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ lake
// Irregular star-shaped shoreline: radius as a function of angle (0 = east, 90 = north).
const LAKE_A = 59.7, LAKE_B = 57.4;
const HARM = [[2, 0.065, 2.406], [3, 0.08, 3.967], [4, 0.028, 0.853], [5, 0.056, 1.777], [7, 0.018, 2.964]];
function lakeRaw(a) {
  const c = Math.cos(a), s = Math.sin(a);
  const r = (LAKE_A * LAKE_B) / Math.hypot(LAKE_B * c, LAKE_A * s);
  let m = 1;
  for (const [k, amp, ph] of HARM) m += amp * Math.sin(k * a + ph);
  return r * m;
}
const LN = 720, lakeTab = new Float32Array(LN + 1);
for (let i = 0; i <= LN; i++) lakeTab[i] = lakeRaw((i / LN) * TAU);
export function lakeR(a) {
  a = ((a % TAU) + TAU) % TAU;
  const f = (a / TAU) * LN, i = Math.floor(f), t = f - i;
  return lakeTab[i] * (1 - t) + lakeTab[Math.min(LN, i + 1)] * t;
}
export const lakeEdgeDist = (x, z) => Math.hypot(x, z) - lakeR(Math.atan2(z, x)); // > 0 outside the ice edge
export const lakePt = (deg, k = 0) => { const a = deg * D2R, r = lakeR(a) + k; return [Math.cos(a) * r, Math.sin(a) * r]; };
export const LAKE_BOX = { w: 140, h: 132 }; // ice texture covers this box, centred on the origin

// ------------------------------------------------------------------ geometry helpers
function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
export function spline(pts, closed = false, per = 6) { // Catmull-Rom through the points
  const n = pts.length, out = [], get = (i) => (closed ? pts[((i % n) + n) % n] : pts[clamp(i, 0, n - 1)]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(closed ? out[0].slice() : pts[n - 1].slice());
  return out;
}
const sdRect = (x, z, r) => Math.hypot(Math.max(r[0] - x, 0, x - r[1]), Math.max(r[2] - z, 0, z - r[3]));

// ------------------------------------------------------------------ road + path network
// kind: road (8 wide main streets), path (3.6 footpaths), shore (variable 3-4.4 lake-side promenade).
export const RING_DEG = Array.from({ length: 24 }, (_, i) => i * 15);
const RING_OFF = 26;
export const ringPt = (deg) => lakePt(deg, RING_OFF);
export const ACCESS = [84, 8, 264, 188, 40, 228]; // angles (deg) of the shore access points onto the ice
export const DOCKS = [
  { id: 'east', deg: -24, len: 17, w: 4.4 },
  { id: 'south', deg: 252, len: 15, w: 4 },
  { id: 'west', deg: 152, len: 12, w: 3.4 },
];
export const dockPose = (d) => { const a = d.deg * D2R, r = lakeR(a); return { x0: Math.cos(a) * (r + 7), z0: Math.sin(a) * (r + 7), dx: -Math.cos(a), dz: -Math.sin(a), len: d.len, w: d.w }; };
const dockPoses = DOCKS.map(dockPose);
export function onDock(x, z) {
  for (const d of dockPoses) {
    const rx = x - d.x0, rz = z - d.z0, u = rx * d.dx + rz * d.dz, v = -rx * d.dz + rz * d.dx;
    if (u > -0.4 && u < d.len && Math.abs(v) < d.w / 2) return true;
  }
  return false;
}

const ringCtrl = RING_DEG.map((dg) => ringPt(dg));
const shoreCtrl = Array.from({ length: 36 }, (_, i) => lakePt(i * 10, 8.5 + 1.5 * Math.sin(i * 0.9)));
const shoreLine = spline(shoreCtrl, true, 4);
const shoreWidth = shoreLine.map((_, i) => 3.0 + 0.7 * (1 + Math.sin(i * 0.23)) + 0.4 * Math.sin(i * 0.071));

function bridgeFrame() { // creek crossing: centre, walking direction u (across the creek), creek direction
  const c = [111, -113], cd = [-0.26, -0.966];
  return { cx: c[0], cz: c[1], ux: -cd[1], uz: cd[0], len: 11, w: 3.6, arch: 0.85 };
}
export const BRIDGE = bridgeFrame();
const bu = (k) => [BRIDGE.cx + BRIDGE.ux * k, BRIDGE.cz + BRIDGE.uz * k];

export const CREEK = { pts: spline([[136, -76], [127, -92], [118, -103], [111, -113], [109, -126], [115, -138], [121, -151]], false, 5), half: 2.5, pond: [137, -73, 7.5] };

const nwStart = ringPt(135), neStart = ringPt(45), swStart = ringPt(225), seStart = ringPt(315);
const defs = [
  { kind: 'road', w: 8, pts: spline(ringCtrl, true, 6) },
  { kind: 'road', w: 8, pts: [[0, 82], [0, 92]] }, // main street to the commercial plaza
  { kind: 'road', w: 8, pts: spline([[0, -80], [0, -110], [0, -141]], false, 4) }, // residential spine
  { kind: 'road', w: 8, pts: spline([[-60, -116], [-30, -115.5], [0, -115], [30, -115.5], [60, -116]], false, 4) }, // cross street
  { kind: 'road', w: 8, pts: [[RING_OFF + lakeR(0) - 4, 12], [105, 12]] }, // park entrance
  { kind: 'road', w: 8, pts: [[-(RING_OFF + lakeR(Math.PI) - 4), 14], [-98, 14]] }, // community entrance
  // footpaths between districts, lake and corner areas
  { kind: 'path', w: 3.6, pts: spline([[118, 25], [118, 38], [118, 49]], false, 4) },
  { kind: 'path', w: 3.6, pts: Array.from({ length: 25 }, (_, i) => [118 + Math.cos((i / 24) * TAU) * 13, 12 + Math.sin((i / 24) * TAU) * 13]) }, // park loop
  { kind: 'path', w: 3.6, pts: Array.from({ length: 25 }, (_, i) => [-118 + Math.cos((i / 24) * TAU) * 22, 14 + Math.sin((i / 24) * TAU) * 22]) }, // community plaza loop
  { kind: 'path', w: 3.6, pts: [[-118, 35], [-118, 44]] },
  { kind: 'path', w: 3.6, pts: spline([[-109, -5], [-104, -9], [-102, -14]], false, 3) },
  { kind: 'path', w: 3.6, pts: spline([nwStart, [-70, 84], [-90, 103], [-112, 122], [-128, 117], [-121, 100], [-100, 90], [-88, 74], nwStart], false, 5) },
  { kind: 'path', w: 3.6, pts: spline([neStart, [72, 76], [86, 92], [97, 101], [105, 108], [112, 113]], false, 5) },
  { kind: 'path', w: 3.6, pts: spline([swStart, [-76, -82], [-98, -96], [-120, -106], [-133, -124], [-116, -135], [-98, -120], [-84, -100]], false, 5) },
  { kind: 'path', w: 3.6, pts: spline([seStart, [82, -84], [94, -101], bu(-9), bu(-5.8)], false, 5) },
  { kind: 'path', w: 3.6, pts: spline([bu(5.8), bu(9), [130, -122], [139, -131]], false, 4) },
];
// access spurs from the ring road down to the shore, plus the shore promenade
ACCESS.forEach((dg) => { const a = ringPt(dg), b = lakePt(dg, 2.5); defs.push({ kind: 'path', w: 3.6, pts: [a, b] }); });
defs.push({ kind: 'shore', w: 3.6, pts: shoreLine, widths: shoreWidth });
// dock landings
dockPoses.forEach((d) => defs.push({ kind: 'path', w: 3.6, pts: [lakePt(Math.atan2(d.z0, d.x0) / D2R, 14), [d.x0, d.z0]] }));
export const NETWORK = defs.map((d) => {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  d.pts.forEach((p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
  return { ...d, box: [x0 - d.w, x1 + d.w, z0 - d.w, z1 + d.w] };
});
// Distance from (x,z) beyond the edge of the nearest road/path (<= 0 on it). `cut` bounds the search.
export function pathEdgeDist(x, z, cut = 14, kinds = null) {
  let best = 1e9;
  for (const p of NETWORK) {
    if (kinds && !kinds.includes(p.kind)) continue;
    const b = p.box;
    if (x < b[0] - cut || x > b[1] + cut || z < b[2] - cut || z > b[3] + cut) continue;
    const n = p.pts.length;
    for (let i = 0; i < n - 1; i++) {
      const hw = (p.widths ? (p.widths[i] + p.widths[i + 1]) / 4 : p.w / 2);
      const d = distSeg(x, z, p.pts[i][0], p.pts[i][1], p.pts[i + 1][0], p.pts[i + 1][1]) - hw;
      if (d < best) best = d;
    }
  }
  return best;
}

// ------------------------------------------------------------------ districts and zones
export const RECT = {
  commercial: [-65, 65, 90, 145], park: [85, 145, -40, 65], residential: [-65, 65, -145, -90], community: [-145, -85, -40, 65],
  nw: [-145, -85, 85, 145], ne: [85, 145, 85, 145], sw: [-145, -85, -145, -85], se: [85, 145, -145, -85],
};
export const HILL = { x: 116, z: 116, R: 36, H: 5.5 };
const flatRects = [RECT.commercial, RECT.park, RECT.residential, RECT.community];
const creekDist = (x, z) => { // distance to the creek centreline / pond
  let b = Math.hypot(x - CREEK.pond[0], z - CREEK.pond[1]) - CREEK.pond[2] + CREEK.half;
  if (x < 88 || z > -58) return b;
  const P = CREEK.pts;
  for (let i = 0; i < P.length - 1; i++) b = Math.min(b, distSeg(x, z, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]));
  return b;
};
export const creekD = creekDist;

// Terrain only (what the ground mesh is built from).
export function groundH(x, z) {
  let h = 0;
  const hd = Math.hypot(x - HILL.x, z - HILL.z);
  if (hd < HILL.R) h += HILL.H * (1 - smooth((hd - 0.32 * HILL.R) / (0.68 * HILL.R)));
  // gentle rolling snow, kept flat near the lake, the districts and every road
  const lake = smooth((lakeEdgeDist(x, z) - 9) / 14);
  if (lake > 0) {
    let dr = 99; for (const r of flatRects) dr = Math.min(dr, sdRect(x, z, r));
    const m = lake * smooth((dr - 2) / 12);
    if (m > 0) {
      const pm = smooth((pathEdgeDist(x, z, 9) - 1.2) / 6) * (x > 88 && z < -55 ? smooth((creekDist(x, z) - 4.5) / 5) : 1);
      h += m * pm * (0.26 * Math.sin(x * 0.085 + 1.3) * Math.cos(z * 0.07 + 0.4) + 0.12 * Math.sin(x * 0.2 + z * 0.16));
    }
  }
  return h;
}

// Height a character stands at: terrain, plus the arched bridge deck and the dock planks.
export function heightAt(x, z) {
  const rx = x - BRIDGE.cx, rz = z - BRIDGE.cz, u = rx * BRIDGE.ux + rz * BRIDGE.uz, v = -rx * BRIDGE.uz + rz * BRIDGE.ux;
  if (Math.abs(v) < BRIDGE.w / 2 && Math.abs(u) < BRIDGE.len / 2) return BRIDGE.arch * (1 - (2 * u / BRIDGE.len) ** 2) + 0.1;
  if (onDock(x, z)) return 0.12;
  return groundH(x, z);
}

export const ZONES = [
  { id: 'bridge', name: 'Creek Bridge', rect: RECT.se, xp: 15 },
  { id: 'hill', name: 'Hilltop Viewpoint', rect: RECT.ne, xp: 15 },
  { id: 'forest', name: 'Pine Forest', rect: RECT.nw, xp: 15 },
  { id: 'trail', name: 'Wooded Trail', rect: RECT.sw, xp: 15 },
  { id: 'plaza', name: 'Town Plaza', rect: RECT.commercial, xp: 15 },
  { id: 'park', name: 'Central Park', rect: RECT.park, xp: 15 },
  { id: 'community', name: 'Community Plaza', rect: RECT.community, xp: 15 },
  { id: 'residential', name: 'Residential Area', rect: RECT.residential, xp: 15 },
  { id: 'boathouse', name: 'Boathouse', circle: [...lakePt(252, 14), 15], xp: 15 },
  { id: 'scenic', name: 'Scenic Shoreline', circle: [...lakePt(-24, 4), 15], xp: 5 },
  { id: 'beginner', name: 'Beginner Ice', circle: [-8, 33, 15], xp: 5 },
  { id: 'social', name: 'Social Ice', circle: [-45, 6, 14], xp: 5 },
  { id: 'free', name: 'Free Skate Zone', circle: [26, -8, 22], xp: 5 },
  { id: 'lake', name: 'Frozen Lake', lake: true, xp: 15 },
];
export const ZONE_LIST = ZONES.map((z) => ({ id: z.id, name: z.name }));
export function zoneAt(x, z) {
  for (const zn of ZONES) {
    let inside;
    if (zn.rect) inside = x > zn.rect[0] && x < zn.rect[1] && z > zn.rect[2] && z < zn.rect[3];
    else if (zn.circle) inside = Math.hypot(x - zn.circle[0], z - zn.circle[1]) < zn.circle[2];
    else inside = lakeEdgeDist(x, z) < 0;
    if (inside) return { id: zn.id, name: zn.name, xp: zn.xp };
  }
  return null;
}
export const onIce = (x, z) => lakeEdgeDist(x, z) < 0 && !onDock(x, z);
