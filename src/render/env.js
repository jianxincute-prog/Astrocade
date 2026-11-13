// Procedural "photo studio" environment for the hero's glossy skin: a dim warm dome lit by a few
// bright softboxes (key, overhead strip, crown light, rim, fill). Prefiltered with PMREM and applied
// per material (never as scene.environment, so the city keeps its look). The bald head reflects the
// softboxes as long, soft highlights that slide over the dome when he turns.

/** Returns a PMREM texture (call .dispose() when the renderer goes away). */
export function makeStudioEnv(T, renderer) {
  const sc = new T.Scene();
  const R = 50, dome = new T.SphereGeometry(R, 32, 20), pos = dome.attributes.position, cols = [];
  const lerpC = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / R;
    const c = y < 0 ? lerpC([0.3, 0.22, 0.17], [0.05, 0.035, 0.03], Math.min(1, -y * 1.6)) : lerpC([0.3, 0.22, 0.17], [0.5, 0.45, 0.42], Math.min(1, y * 1.3));
    cols.push(c[0], c[1], c[2]);
  }
  dome.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
  const mats = [new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })];
  sc.add(new T.Mesh(dome, mats[0]));
  const geos = [dome];
  const panel = (w, h, rgb, k, x, y, z) => {
    const g = new T.PlaneGeometry(w, h), m = new T.MeshBasicMaterial({ color: new T.Color(rgb[0] * k, rgb[1] * k, rgb[2] * k), side: T.DoubleSide });
    const p = new T.Mesh(g, m); p.position.set(x, y, z); p.lookAt(0, 0, 0); sc.add(p); geos.push(g); mats.push(m);
  };
  panel(18, 13, [1.0, 0.92, 0.8], 9, -18, 22, 24);   // key softbox (warm, upper left front)
  panel(34, 6, [1.0, 0.97, 0.92], 12, 0, 40, 4);     // overhead strip
  panel(22, 9, [1.0, 0.95, 0.88], 10, 0, 30, 20);    // crown light, in the view of a top-down camera
  panel(6, 26, [0.75, 0.85, 1.0], 8, 24, 12, -26);   // cool rim strip behind
  panel(14, 10, [0.85, 0.9, 1.0], 2.6, 28, 6, 18);   // fill from the right
  panel(22, 4, [1.0, 0.8, 0.6], 1.4, 0, -10, 26);    // warm ground bounce
  const pm = new T.PMREMGenerator(renderer);
  const rt = pm.fromScene(sc, 0.02);
  pm.dispose();
  for (const g of geos) g.dispose();
  for (const m of mats) m.dispose();
  return rt.texture;
}
