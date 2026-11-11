// Shop thumbnails: every item is rendered once with the real 3D art, with its own small renderer.
// Goods (drinks, bakes, gifts) use their item model; clothes are shown on the actual character, framed on the body part.
// Results are cached as data URLs; if WebGL is unavailable the shop falls back to colour swatches.
import { createCharacter } from './character.js';
import { createSkater } from './skating.js';
import { buildItem, hasModel } from './items3d.js';
import { OUTLINE } from './anime.js';
const T = THREE;

// per slot: [look-at height, distance, fov, character yaw, camera height offset]
const FRAME = {
  hat: [1.64, 1.0, 30, 0.45, 0.03], scarf: [1.42, 1.05, 30, 0.4, 0.05], jacket: [1.1, 2.2, 30, 0.5, 0.0],
  pants: [0.7, 1.95, 30, 0.5, 0.0], gloves: [0.86, 1.4, 30, 1.05, 0.0], skates: [0.19, 1.1, 30, 0.7, 0.1],
};

export function createIcons(size = 160) {
  let r = null, scene = null, cam = null, ok = true;
  const cache = {};
  function init() {
    if (r || !ok) return ok;
    try {
      const cv = document.createElement('canvas'); cv.width = cv.height = size;
      r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1); r.setSize(size, size, false); r.setClearColor(0x000000, 0);
      scene = new T.Scene();
      scene.add(new T.HemisphereLight(0xffffff, 0xb8c8e0, 0.5));
      const key = new T.DirectionalLight(0xfff4e0, 0.5); key.position.set(-2, 3, 4); scene.add(key);
      const rim = new T.DirectionalLight(0xbfd8ff, 0.2); rim.position.set(3, 1, -2); scene.add(rim);
      cam = new T.PerspectiveCamera(28, 1, 0.05, 40);
    } catch (e) { ok = false; r = null; }
    return ok;
  }
  function shoot() {
    const keep = OUTLINE.aspect.value; OUTLINE.aspect.value = 1;
    r.render(scene, cam); OUTLINE.aspect.value = keep;
    return r.domElement.toDataURL('image/png');
  }
  function goods(id) {
    const m = buildItem(id, { steam: true, thick: 0.011 }); if (!m) return null;
    const g = new T.Group(); g.add(m); g.rotation.set(0.32, -0.6, 0); scene.add(g);
    cam.fov = 28; cam.aspect = 1; cam.position.set(0, 0.1, 2.5); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    const url = shoot(); scene.remove(g); m.userData.dispose(); return url;
  }
  function worn(it, kind) {
    const f = FRAME[it.slot]; if (!f) return null;
    const ch = createCharacter(kind, { outfit: it.v || {} });
    const base = createSkater(), sk = it.slot === 'skates';
    const p = { ...base, mode: sk ? 'skate' : 'walk', speed: 0, stride: 0, strideAmp: 0, b: 0, fallAmt: 0, steer: 0, state: 'ok', spin: null, spinAng: 0, h: f[3], x: 0, z: 0, y: 0 };
    ch.pose(p, 0.3); ch.place(p); scene.add(ch.root);
    cam.fov = f[2]; cam.aspect = 1; cam.position.set(0, f[0] + f[4], f[1]); cam.lookAt(0, f[0], 0); cam.updateProjectionMatrix();
    ch.root.position.set(0, 0, 0);
    const url = shoot(); scene.remove(ch.root); ch.dispose(); return url;
  }
  return {
    get(it, kind) {
      if (!it || !init()) return null;
      const key = it.id + '|' + (hasModel(it.id) ? '' : kind);
      if (cache[key] !== undefined) return cache[key];
      let url = null;
      try { url = hasModel(it.id) ? goods(it.id) : worn(it, kind); } catch (e) { url = null; }
      return (cache[key] = url);
    },
    dispose() { if (r) { r.dispose(); r.forceContextLoss && r.forceContextLoss(); r = null; } ok = false; },
  };
}
