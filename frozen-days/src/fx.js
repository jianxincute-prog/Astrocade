// Snow/ice spray particle pool.
const T = THREE;
export function createSpray(scene) {
  const N = 80;
  const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N);
  for (let i = 0; i < N; i++) pos[i * 3 + 1] = -100;
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const pts = new T.Points(geo, new T.PointsMaterial({ color: 0xffffff, size: 0.32, transparent: true, opacity: 0.9, depthWrite: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  let next = 0;
  function emit(x, y, z, vx, vy, vz) {
    const i = next; next = (next + 1) % N;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz; life[i] = 0.6 + Math.random() * 0.4;
  }
  function burst(x, y, z, n, power) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = (0.3 + Math.random()) * power;
      emit(x, y, z, Math.cos(a) * s, 1.5 + Math.random() * 2.5, Math.sin(a) * s);
    }
  }
  function update(dt) {
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) { pos[i * 3 + 1] = -100; continue; }
      life[i] -= dt;
      vel[i * 3 + 1] -= 9 * dt;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (pos[i * 3 + 1] < 0.05) { pos[i * 3 + 1] = 0.05; vel[i * 3 + 1] = 0; vel[i * 3] *= 0.8; vel[i * 3 + 2] *= 0.8; }
    }
    geo.attributes.position.needsUpdate = true;
  }
  return { emit, burst, update };
}
