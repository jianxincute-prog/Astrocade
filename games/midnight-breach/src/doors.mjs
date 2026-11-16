import { T } from './three-loader.mjs';

// Interior doors. axis 'x' = wall runs along X at z = fixed; axis 'z' = wall runs along Z at x = fixed.
// The door is hinged at `a` and fills the gap [a, b]. swing = +1 opens towards +z (axis x) / +x (axis z).
export const DOOR_DEFS = [
  { id: 'kamar', label: 'Pintu kamar', axis: 'z', fixed: -2, a: -3.9, b: -2.1, swing: -1 },
  { id: 'dapur', label: 'Pintu dapur', axis: 'x', fixed: 0, a: -5.9, b: -4.1, swing: 1 },
  { id: 'tamu', label: 'Pintu ruang tamu', axis: 'x', fixed: 0, a: 0.2, b: 2.2, swing: 1 },
  { id: 'makan', label: 'Pintu ruang makan', axis: 'z', fixed: -2, a: 2.2, b: 4.0, swing: 1 },
  { id: 'depan', label: 'Pintu depan', axis: 'x', fixed: 6, a: 0.1, b: 1.9, swing: -1 },
  { id: 'gudang', label: 'Pintu gudang', axis: 'z', fixed: 4, a: -3.9, b: -2.1, swing: 1 },
  // Rani's old house at the west end of the complex: locked until enough clues are found.
  { id: 'rani', label: 'Pintu rumah Rani', axis: 'x', fixed: 5, a: -29.9, b: -28.1, swing: -1, locked: true },
];

const ease = t => t * t * (3 - 2 * t);

/** Builds all doors with frames. `box` is world.mjs's static box helper (frames get merged). */
export function buildDoors({ group, colliders, box, M }) {
  const doors = [];
  for (const def of DOOR_DEFS) {
    const { axis, fixed, a, b } = def;
    const len = b - a, w = len - 0.08;
    const isX = axis === 'x';
    const pos = (along, across, y) => (isX ? [a + along, y, fixed + across] : [fixed + across, y, a + along]);
    const dims = (alongSize, ySize, acrossSize) => (isX ? [alongSize, ySize, acrossSize] : [acrossSize, ySize, alongSize]);

    // static frame: two posts and a lintel
    const frameColor = def.id === 'rani' ? 0x3a2e28 : 0x4a3022;
    for (const edge of [a - 0.05, b + 0.05]) {
      const [fw, fh, fd] = dims(0.14, 1.7, 0.34);
      box(fw, fh, fd, isX ? edge : fixed, isX ? fixed : edge, frameColor);
    }
    {
      const [fw, fh, fd] = dims(len + 0.24, 0.16, 0.34);
      box(fw, fh, fd, isX ? (a + b) / 2 : fixed, isX ? fixed : (a + b) / 2, frameColor, { y0: 1.54 });
    }

    // moving panel on a hinge
    const pivot = new T.Group();
    const [px, , pz] = pos(0, 0, 0);
    pivot.position.set(px, 0, pz);
    pivot.userData.keep = true;
    const woodMat = M(def.id === 'rani' ? 0x5a4636 : 0x7c4a2e, {});
    const insetMat = M(def.id === 'rani' ? 0x4c3a2c : 0x92603c, {});
    const handleMat = M(0xd8b860, {});
    const part = (alongSize, ySize, acrossSize, along, y, across, mat) => {
      const [sw, sh, sd] = dims(alongSize, ySize, acrossSize);
      const m = new T.Mesh(new T.BoxGeometry(sw, sh, sd), mat);
      const [mx, my, mz] = isX ? [along, y, across] : [across, y, along];
      m.position.set(mx, my, mz);
      pivot.add(m);
      return m;
    };
    part(w, 1.5, 0.1, w / 2, 0.75, 0, woodMat);
    for (const side of [-1, 1]) {
      part(w * 0.38, 0.55, 0.03, w * 0.27, 1.05, side * 0.06, insetMat);
      part(w * 0.38, 0.55, 0.03, w * 0.73, 1.05, side * 0.06, insetMat);
      part(w * 0.38, 0.5, 0.03, w * 0.27, 0.42, side * 0.06, insetMat);
      part(w * 0.38, 0.5, 0.03, w * 0.73, 0.42, side * 0.06, insetMat);
      part(0.1, 0.06, 0.1, w - 0.14, 0.78, side * 0.1, handleMat);
    }
    let lockLight = null;
    if (def.locked) {
      lockLight = new T.MeshBasicMaterial({ color: 0xff3a4a });
      part(0.12, 0.12, 0.05, w - 0.14, 1.12, 0.09, lockLight);
      part(0.12, 0.12, 0.05, w - 0.14, 1.12, -0.09, lockLight);
    }
    group.add(pivot);

    const cx = isX ? (a + b) / 2 : fixed, cz = isX ? fixed : (a + b) / 2;
    const col = isX
      ? { x1: a, x2: b, z1: fixed - 0.1, z2: fixed + 0.1, enabled: true }
      : { x1: fixed - 0.1, x2: fixed + 0.1, z1: a, z2: b, enabled: true };
    colliders.push(col);
    const openAngle = (isX ? -1 : 1) * def.swing * (Math.PI / 2);
    doors.push({ ...def, x: cx, z: cz, pivot, col, lockLight, openAngle, open: false, t: 0, locked: !!def.locked, startsLocked: !!def.locked });
  }

  const api = {
    doors,
    byId: id => doors.find(d => d.id === id),
    /** True if the player (or a point) stands in the swing/closing zone of the doorway. */
    blocked(d, px, pz) {
      const across = d.axis === 'x' ? Math.abs(pz - d.fixed) : Math.abs(px - d.fixed);
      const along = d.axis === 'x' ? px : pz;
      return across < 0.8 && along > d.a - 0.45 && along < d.b + 0.45;
    },
    /** Returns 'locked' | 'blocked' | 'opened' | 'closed'. */
    toggle(d, px, pz) {
      if (d.locked) return 'locked';
      if (d.open && api.blocked(d, px, pz)) return 'blocked';
      d.open = !d.open;
      return d.open ? 'opened' : 'closed';
    },
    setOpen(d, open) { d.open = open; },
    unlock(d) {
      d.locked = false;
      d.lockLight?.color.setHex(0x4aff8a);
    },
    lock(d) {
      d.locked = true;
      d.open = false;
      d.t = 0;
      d.pivot.rotation.y = 0;
      d.col.enabled = true;
      d.lockLight?.color.setHex(0xff3a4a);
    },
    resetAll() {
      for (const d of doors) {
        if (d.startsLocked) { api.lock(d); continue; }
        d.open = false; d.t = 0; d.pivot.rotation.y = 0; d.col.enabled = true;
      }
    },
    update(dt) {
      for (const d of doors) {
        const target = d.open ? 1 : 0;
        if (d.t !== target) {
          d.t += Math.sign(target - d.t) * Math.min(Math.abs(target - d.t), dt * 3.2);
          d.pivot.rotation.y = d.openAngle * ease(d.t);
        }
        d.col.enabled = d.t < 0.55;
      }
    },
  };
  return api;
}
