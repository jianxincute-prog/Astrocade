// TEMPORARY foundation preview: loops one full dish cycle with placeholder food so the rig, kitchen
// and camera can be checked. The real CookingFSM (step 4) replaces this file.
import { ANCHORS } from './kitchen.js';
import { easeOutBack } from './mathutils.js';

const THREE = window.THREE;

function makePlate() {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.06, 16),
    new THREE.MeshLambertMaterial({ color: 0xf8f9fa }));
  plate.castShadow = true;
  const food = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.4),
    new THREE.MeshLambertMaterial({ color: 0xe6a756 }));
  food.position.y = 0.1; food.castShadow = true;
  g.add(plate, food);
  return g;
}

export function createPreview({ scene, chef, customer, camera }) {
  const chips = [0xffffff, 0xc0651a, 0xe74c3c].map((c) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshLambertMaterial({ color: c }));
    m.castShadow = true; m.visible = false; scene.add(m); return m;
  });
  const plate = makePlate();
  plate.visible = false;
  scene.add(plate);

  const pan = ANCHORS.panCenter;
  let step = 0, t = 0, entered = false;
  const reset = () => {
    chef.root.position.copy(ANCHORS.prepPos); chef.root.rotation.y = 0;
    chef.setCarrying(false); chef.setPose('idle');
    plate.visible = false; chips.forEach((c) => (c.visible = false));
    camera.setMode('OVERVIEW');
  };
  reset();
  customer.root.position.copy(ANCHORS.customerPos);
  customer.root.rotation.y = 0;

  const steps = [
    { name: 'idle', run(dt) { chef.setPose('idle'); chef.faceToward({ x: 0, z: 9 }, dt); return t > 2.2; } },
    { name: 'toCook', enter() { camera.setMode('COOKING_ZOOM'); },
      run(dt) { return chef.moveToward(ANCHORS.cookPos, 2.7, dt); } },
    { name: 'sautee', enter() { chips.forEach((c) => (c.visible = true)); },
      run(dt) {
        chef.setPose('sautee'); chef.faceToward(pan, dt);
        chips.forEach((c, i) => c.position.set(pan.x + (i - 1) * 0.14, pan.y + Math.abs(Math.sin(t * 14 + i * 1.5)) * 0.22, pan.z));
        return t > 1.2;
      } },
    { name: 'stir',
      run(dt) {
        chef.setPose('stir'); chef.faceToward(pan, dt);
        const a = t * 7.5;
        chips.forEach((c, i) => {
          const ang = a + (i * Math.PI * 2) / 3;
          c.position.set(pan.x + Math.cos(ang) * 0.12, pan.y + 0.03, pan.z + Math.sin(ang) * 0.12);
        });
        return t > 1.4;
      } },
    { name: 'plate', enter() { chips.forEach((c) => (c.visible = false)); plate.visible = true; scene.add(plate); },
      run(dt) {
        chef.setPose('plate'); chef.faceToward(pan, dt);
        plate.position.set(pan.x, pan.y + 0.18, pan.z);
        plate.scale.setScalar(Math.max(0.01, easeOutBack(Math.min(t / 0.55, 1))));
        return t > 0.9;
      } },
    { name: 'toServe',
      enter() { chef.setCarrying(true); chef.carryAnchor.add(plate); plate.position.set(0, 0, 0); camera.setMode('SERVING_FOCUS'); },
      run(dt) { return chef.moveToward(ANCHORS.servePos, 2.7, dt); } },
    { name: 'cheer',
      enter() { chef.setCarrying(false); scene.add(plate); plate.position.copy(ANCHORS.tableTop); customer.setPose('cheer'); },
      run(dt) {
        chef.setPose('cheer'); chef.faceToward(ANCHORS.tableTop, dt);
        return t > 1.6;
      } },
    { name: 'back',
      enter() { plate.visible = false; customer.setPose('idle'); camera.setMode('OVERVIEW'); },
      run(dt) { return chef.moveToward(ANCHORS.prepPos, 2.7, dt); } },
  ];

  return {
    get stepName() { return steps[step].name; },
    update(dt) {
      const s = steps[step];
      if (!entered) { entered = true; t = 0; if (s.enter) s.enter(); }
      t += dt;
      if (s.run(dt)) { step = (step + 1) % steps.length; entered = false; if (step === 0) reset(); }
    },
    jumpTo(name) { // for testing
      const i = steps.findIndex((s) => s.name === name);
      if (i >= 0) { step = i; entered = false; }
    },
  };
}
