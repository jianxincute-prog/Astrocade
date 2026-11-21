// Renders recipe thumbnails (real 3D dishes, or flat silhouettes for undiscovered ones) with the main
// renderer into a small render target, then paints the pixels into a 2D canvas. No canvas export involved.
import { buildDish } from './dish.js';

const THREE = window.THREE;
const SIZE = 128;

export function createThumbs(renderer) {
  const rt = new THREE.WebGLRenderTarget(SIZE, SIZE);
  const buf = new Uint8Array(SIZE * SIZE * 4);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe4e7ea); // cool light gray so cream plates stand out
  scene.add(new THREE.AmbientLight(0xfff2e4, 0.25));
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0xa88c76, 0.28));
  const sun = new THREE.DirectionalLight(0xffe9cc, 0.62);
  sun.position.set(2, 4, 3);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  cam.position.set(0, 1.05, 1.25);
  cam.lookAt(0, 0.12, 0);
  const flat = new THREE.MeshBasicMaterial({ color: 0xb9a89d, side: THREE.DoubleSide }); // double-sided: bowl walls are open
  const cache = new Map();

  function render(ids, silhouette) {
    const { group } = buildDish(ids);
    scene.add(group);
    scene.overrideMaterial = silhouette ? flat : null;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, buf);
    renderer.setRenderTarget(prev);
    scene.overrideMaterial = null;
    scene.remove(group);

    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(SIZE, SIZE);
    for (let y = 0; y < SIZE; y++) { // WebGL rows are bottom-up
      const src = (SIZE - 1 - y) * SIZE * 4;
      img.data.set(buf.subarray(src, src + SIZE * 4), y * SIZE * 4);
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  return {
    // Returns a canvas element for the recipe. Cached per recipe and state.
    get(recipe, discovered) {
      const key = recipe.id + (discovered ? 'c' : 's');
      if (!cache.has(key)) cache.set(key, render(recipe.ids, !discovered));
      const src = cache.get(key);
      const c = document.createElement('canvas'); // fresh element each time so it can be re-attached
      c.width = c.height = SIZE;
      c.getContext('2d').drawImage(src, 0, 0);
      return c;
    },
    dispose() { rt.dispose(); },
  };
}
