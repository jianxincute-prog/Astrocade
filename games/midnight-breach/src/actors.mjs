import { T } from './three-loader.mjs';

// Low-poly chibi character built from a few flat-shaded primitives.
export function makeCharacter({ skin = 0xe8b894, shirt = 0x4a6cd4, pants = 0x2b2f4a, hair = 0x1c1620, ghost = false } = {}) {
  const mat = color => new T.MeshLambertMaterial({ color, flatShading: true, transparent: ghost, opacity: ghost ? 0.82 : 1, emissive: ghost ? 0x3a2a66 : 0x000000 });
  const root = new T.Group();
  const body = new T.Mesh(new T.BoxGeometry(0.52, 0.56, 0.32), mat(shirt));
  body.position.y = 0.72;
  const head = new T.Mesh(new T.IcosahedronGeometry(0.3, 1), mat(skin));
  head.position.y = 1.26;
  const hairCap = new T.Mesh(new T.IcosahedronGeometry(0.32, 1), mat(hair));
  hairCap.position.set(0, 1.33, -0.05);
  hairCap.scale.set(1, 0.85, 1);
  const eyeMat = new T.MeshBasicMaterial({ color: 0x14121c });
  for (const x of [-0.1, 0.1]) {
    const eye = new T.Mesh(new T.BoxGeometry(0.05, 0.07, 0.03), eyeMat);
    eye.position.set(x, 1.25, 0.28);
    root.add(eye);
  }
  const limb = (w, h, d, color, x, y) => {
    const pivot = new T.Group();
    pivot.position.set(x, y, 0);
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(color));
    m.position.y = -h / 2;
    pivot.add(m);
    return pivot;
  };
  const armL = limb(0.16, 0.5, 0.16, shirt, -0.36, 0.95);
  const armR = limb(0.16, 0.5, 0.16, shirt, 0.36, 0.95);
  const legL = limb(0.2, 0.46, 0.22, pants, -0.14, 0.46);
  const legR = limb(0.2, 0.46, 0.22, pants, 0.14, 0.46);
  root.add(body, head, hairCap, armL, armR, legL, legR);
  root.userData.walk = (t, speed) => {
    const s = Math.sin(t * 11) * Math.min(1, speed) * 0.8;
    legL.rotation.x = s; legR.rotation.x = -s;
    armL.rotation.x = -s * 0.8; armR.rotation.x = s * 0.8;
    body.position.y = 0.72 + Math.abs(Math.sin(t * 11)) * 0.04 * Math.min(1, speed);
  };
  root.userData.parts = { head, body };
  return root;
}
