// Placeholder stylized skater (procedural meshes). Faces local +z.
import { clamp, lerp } from './util.js';
const T = THREE;

export function createPlayerMesh() {
  const root = new T.Group();
  const body = new T.Group();
  root.add(body);
  const mat = (c, r = 0.85) => new T.MeshStandardMaterial({ color: c, roughness: r });
  const skin = mat(0xe8b794, 0.7), jacket = mat(0xd9453d), pants = mat(0x2b3a55), boot = mat(0x4a3426);
  const blade = new T.MeshStandardMaterial({ color: 0xdfe5ec, metalness: 0.8, roughness: 0.25 });
  const white = mat(0xf2f2f2), hat = mat(0x2f6f8f), dark = mat(0x1d1d22, 0.5);

  function legPivot(side) {
    const g = new T.Group(); g.position.set(side * 0.11, 1.0, 0);
    const leg = new T.Mesh(new T.CylinderGeometry(0.085, 0.07, 0.8, 8), pants); leg.position.y = -0.4;
    const b = new T.Mesh(new T.BoxGeometry(0.15, 0.14, 0.3), boot); b.position.set(0, -0.87, 0.05);
    const bl = new T.Mesh(new T.BoxGeometry(0.03, 0.06, 0.38), blade); bl.position.set(0, -0.97, 0.05);
    g.add(leg, b, bl); body.add(g); return g;
  }
  function armPivot(side) {
    const g = new T.Group(); g.position.set(side * 0.29, 1.52, 0);
    const a = new T.Mesh(new T.CylinderGeometry(0.06, 0.05, 0.6, 8), jacket); a.position.y = -0.3;
    const m = new T.Mesh(new T.SphereGeometry(0.075, 8, 6), white); m.position.y = -0.64;
    g.add(a, m); body.add(g); return g;
  }
  const legL = legPivot(1), legR = legPivot(-1);
  const armL = armPivot(1), armR = armPivot(-1);

  const torso = new T.Mesh(new T.CylinderGeometry(0.2, 0.23, 0.64, 12), jacket);
  torso.scale.z = 0.72; torso.position.y = 1.3; body.add(torso);
  const scarf = new T.Mesh(new T.TorusGeometry(0.17, 0.06, 8, 16), white);
  scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.64; body.add(scarf);
  const head = new T.Mesh(new T.SphereGeometry(0.16, 16, 12), skin); head.position.y = 1.8; body.add(head);
  const cap = new T.Mesh(new T.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hat); cap.position.y = 1.82; body.add(cap);
  const band = new T.Mesh(new T.TorusGeometry(0.168, 0.025, 6, 16), white); band.rotation.x = Math.PI / 2; band.position.y = 1.83; body.add(band);
  const pom = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), white); pom.position.y = 2.0; body.add(pom);
  [-1, 1].forEach((s) => { const e = new T.Mesh(new T.SphereGeometry(0.02, 6, 6), dark); e.position.set(s * 0.06, 1.8, 0.142); body.add(e); });
  const nose = new T.Mesh(new T.SphereGeometry(0.03, 6, 6), mat(0xd9a07f)); nose.position.set(0, 1.77, 0.16); body.add(nose);

  root.scale.setScalar(0.92);

  // p = skater state, t = elapsed seconds
  function pose(p, t) {
    const onIce = p.mode === 'skate';
    const sf = clamp(p.speed / 14, 0, 1);
    const ok = p.state === 'ok';
    let swing = 0;
    if (ok && onIce) swing = Math.sin(p.stride) * 0.55 * clamp(p.strideAmp, 0, 1);
    else if (ok) swing = Math.sin(p.stride) * 0.7 * clamp(p.speed / 4.6, 0, 1);
    legL.rotation.x = swing; legR.rotation.x = -swing;
    legL.rotation.z = onIce ? 0.05 + sf * 0.05 : 0; legR.rotation.z = -legL.rotation.z;

    const f = p.fallAmt, calm = 1 - f;
    const wob = p.b * calm;
    const flail = Math.sin(t * 15) * wob * 0.5;
    armL.rotation.x = -swing * 0.8 + flail; armR.rotation.x = swing * 0.8 - flail;
    armL.rotation.z = 0.1 + wob * 1.1 + f * (0.9 + Math.sin(t * 20) * 0.3);
    armR.rotation.z = -armL.rotation.z;

    const lean = (onIce ? 0.1 + sf * 0.35 : 0.06) * calm;
    body.rotation.x = lean + Math.cos(t * 7) * wob * 0.14 + p.fallDir * f * 1.5;
    body.rotation.z = (Math.sin(t * 9) * wob * 0.35 + p.steer * sf * 0.3) * calm;
    body.position.y = f * 0.16;
  }

  function place(p) {
    root.position.set(p.x, p.mode === 'skate' ? 0.06 : 0, p.z);
    root.rotation.y = p.h;
  }
  return { root, pose, place };
}
