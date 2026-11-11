// Day-night cycle and dynamic weather. Owns the scene lights, sky/fog colour, sun + moon, stars, clouds and snowfall.
// Weather never touches skating physics or controls; it only changes light, fog and particles (kept cheap for mobile).
import { clamp, lerp, mulberry32 } from './util.js';
const T = THREE;

// hour, sky/fog colour, hemisphere sky, hemisphere ground, hemisphere intensity, sun/moon colour, sun/moon intensity
const KEYS = [
  [0, 0x0b1530, 0x2c3f6e, 0x1b2640, 0.46, 0x8fb0ff, 0.3],
  [5, 0x1a2548, 0x34487a, 0x202c48, 0.46, 0x8fb0ff, 0.28],
  [6.5, 0xf0b79c, 0xffd9c4, 0xb8c4d8, 0.5, 0xffb070, 0.42],
  [8, 0xcfe3f3, 0xdcecff, 0xcfdbe8, 0.55, 0xfff1d6, 0.55],
  [12, 0xbfd9ee, 0xdcecff, 0xcfdbe8, 0.58, 0xfff6e2, 0.62],
  [16.5, 0xc7dcee, 0xdcecff, 0xcfdbe8, 0.55, 0xfff0d0, 0.55],
  [18, 0xf2a77c, 0xffc7a0, 0xa9b0c8, 0.5, 0xff9a55, 0.42],
  [19.6, 0x4b5088, 0x6a74b0, 0x2a3050, 0.44, 0x8a8fd0, 0.3],
  [21, 0x0f1836, 0x2c3f6e, 0x1b2640, 0.46, 0x8fb0ff, 0.3],
  [24, 0x0b1530, 0x2c3f6e, 0x1b2640, 0.46, 0x8fb0ff, 0.3],
];
// snow = share of the flake pool, cloud = cloud cover, grey = how much the sky desaturates, sunK = light multiplier
export const WEATHER = [
  { name: 'Clear', snow: 0, cloud: 0.25, grey: 0, sunK: 1, fogNear: 120, fogFar: 430, flake: 0.2 },
  { name: 'Cloudy', snow: 0, cloud: 0.9, grey: 0.45, sunK: 0.55, fogNear: 90, fogFar: 380, flake: 0.2 },
  { name: 'Light snow', snow: 0.4, cloud: 0.75, grey: 0.3, sunK: 0.7, fogNear: 80, fogFar: 360, flake: 0.22 },
  { name: 'Heavy snow', snow: 1, cloud: 1, grey: 0.6, sunK: 0.45, fogNear: 22, fogFar: 150, flake: 0.3 },
];
const NFLAKE = 900, HALF_BOX = 32, TOP = 26;
const c1 = new T.Color(), c2 = new T.Color(), tmp = new T.Color();
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function blobTexture(core, edge) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, core); g.addColorStop(0.35, edge); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(c);
}

export function createSky(scene, world) {
  const hemi = new T.HemisphereLight(0xdcecff, 0xcfdbe8, 0.55), sun = new T.DirectionalLight(0xfff1d6, 0.55);
  scene.add(hemi, sun);
  scene.background = new T.Color(0xbfd9ee); scene.fog = new T.Fog(0xcfe2f0, 80, 360);
  const rng = mulberry32(42);

  // sun + moon discs, stars
  const sunSpr = new T.Sprite(new T.SpriteMaterial({ map: blobTexture('rgba(255,250,225,1)', 'rgba(255,235,170,0.55)'), transparent: true, depthWrite: false, fog: false }));
  sunSpr.scale.setScalar(120);
  const moonSpr = new T.Sprite(new T.SpriteMaterial({ map: blobTexture('rgba(240,246,255,1)', 'rgba(190,210,255,0.5)'), transparent: true, depthWrite: false, fog: false }));
  moonSpr.scale.setScalar(80);
  const sp = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i++) { const a = rng() * Math.PI * 2, e = 0.12 + rng() * 0.88, r = 400; sp[i * 3] = Math.cos(a) * Math.sqrt(1 - e * e) * r; sp[i * 3 + 1] = e * r; sp[i * 3 + 2] = Math.sin(a) * Math.sqrt(1 - e * e) * r; }
  const starGeo = new T.BufferGeometry(); starGeo.setAttribute('position', new T.BufferAttribute(sp, 3));
  const starMat = new T.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const stars = new T.Points(starGeo, starMat); stars.frustumCulled = false;
  sunSpr.renderOrder = moonSpr.renderOrder = -1; stars.renderOrder = -2;
  scene.add(sunSpr, moonSpr, stars);

  // clouds: a handful of soft sprites on a ring that follows the camera
  const cloudTex = blobTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0.55)');
  const cloudMat = new T.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0 });
  const clouds = Array.from({ length: 10 }, (_, i) => {
    const s = new T.Sprite(cloudMat); s.userData = { a: (i / 10) * Math.PI * 2 + rng() * 0.4, r: 170 + rng() * 90, y: 80 + rng() * 40, sx: 130 + rng() * 80 };
    s.scale.set(s.userData.sx, s.userData.sx * 0.38, 1); scene.add(s); return s;
  });

  // snowfall (pool of flakes around the camera; the live count follows the weather)
  const fp = new Float32Array(NFLAKE * 3);
  for (let i = 0; i < NFLAKE; i++) { fp[i * 3] = (rng() - 0.5) * HALF_BOX * 2; fp[i * 3 + 1] = rng() * TOP; fp[i * 3 + 2] = (rng() - 0.5) * HALF_BOX * 2; }
  const flakeGeo = new T.BufferGeometry(); flakeGeo.setAttribute('position', new T.BufferAttribute(fp, 3));
  const flakeMat = new T.PointsMaterial({ color: 0xffffff, size: 0.22, map: blobTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.7)'), alphaTest: 0.05, transparent: true, opacity: 0.85, depthWrite: false });
  const flakes = new T.Points(flakeGeo, flakeMat); flakes.frustumCulled = false; scene.add(flakes);

  const st = { hour: 9.5, day: 1, w: { ...WEATHER[2] }, target: 2, timer: 60 + rng() * 60, wind: 0 };
  let dark = 0, sunElev = 0.5;

  function lerpKey(h) {
    let i = 0; while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = (h - a[0]) / (b[0] - a[0]);
    const col = (k) => new T.Color(a[k]).lerp(c2.set(b[k]), t);
    return { sky: col(1), hs: col(2), hg: col(3), hi: lerp(a[4], b[4], t), sc: col(5), si: lerp(a[6], b[6], t) };
  }

  function apply(camPos) {
    const w = st.w, h = st.hour, k = lerpKey(h);
    const th = ((h - 6) / 12) * Math.PI;
    sunElev = Math.sin(th);
    dark = 1 - sm(-0.12, 0.18, sunElev);
    // sky + fog: desaturate toward grey in bad weather
    const lum = k.sky.r * 0.3 + k.sky.g * 0.55 + k.sky.b * 0.15;
    tmp.setRGB(lum * 1.02, lum * 1.03, lum * 1.06);
    k.sky.lerp(tmp, w.grey);
    scene.background.copy(k.sky); scene.fog.color.copy(k.sky);
    scene.fog.near = w.fogNear; scene.fog.far = w.fogFar;
    // lights
    hemi.color.copy(k.hs); hemi.groundColor.copy(k.hg);
    hemi.intensity = k.hi * (1 - 0.08 * w.grey);
    sun.color.copy(k.sc);
    sun.intensity = k.si * (dark > 0.5 ? 0.7 + 0.3 * w.sunK : w.sunK);
    const useSun = sunElev > -0.05, e = useSun ? sunElev : -sunElev, x = useSun ? Math.cos(th) : -Math.cos(th);
    sun.position.set(x * 100, Math.max(0.3, e) * 100, 35);
    // discs follow the camera so they sit at infinity
    const vis = 1 - w.cloud * 0.85;
    sunSpr.position.set(camPos.x + Math.cos(th) * 380, camPos.y + sunElev * 380, camPos.z + 130);
    moonSpr.position.set(camPos.x - Math.cos(th) * 380, camPos.y - sunElev * 380, camPos.z - 130);
    sunSpr.material.opacity = sm(-0.12, 0.08, sunElev) * vis; moonSpr.material.opacity = sm(-0.05, 0.2, -sunElev) * (0.35 + 0.65 * vis);
    sunSpr.visible = sunSpr.material.opacity > 0.01; moonSpr.visible = moonSpr.material.opacity > 0.01;
    stars.position.set(camPos.x, camPos.y, camPos.z);
    starMat.opacity = dark * (1 - w.cloud * 0.9);
    // clouds: thicker + greyer in bad weather, dark at night, tinted by the sunset
    cloudMat.opacity = w.cloud * 0.85;
    tmp.copy(k.sky).lerp(c1.set(0xffffff), 0.55 - 0.25 * w.grey);
    cloudMat.color.setRGB(tmp.r * (1 - 0.7 * dark), tmp.g * (1 - 0.7 * dark), tmp.b * (1 - 0.6 * dark));
    // lamps and windows glow more at night
    if (world.glowMat) world.glowMat.opacity = 0.18 + 0.82 * dark;
    if (world.windowMat) world.windowMat.color.setScalar(0.66 + 0.34 * dark);
    // flakes get dimmer at night
    flakeMat.color.setRGB(1 - 0.35 * dark, 1 - 0.3 * dark, 1 - 0.1 * dark);
  }

  function update(dt, camPos, cfg) {
    // time
    if (cfg.hour >= 0) st.hour = cfg.hour % 24;
    else { const prev = st.hour; st.hour = (st.hour + dt * (24 / (Math.max(1, cfg.dayMinutes) * 60))) % 24; if (st.hour < prev) st.day++; }
    // weather: forced by settings, otherwise a slow random walk between neighbouring states
    if (cfg.weather >= 1) st.target = cfg.weather - 1;
    else {
      st.timer -= dt;
      if (st.timer <= 0) {
        st.timer = 100 + Math.random() * 120;
        const step = Math.random() < 0.5 ? -1 : 1; st.target = clamp(st.target + step, 0, 3);
        if (Math.random() < 0.18) st.target = 3 - st.target; // occasional jump (clear <-> heavy) for variety
      }
    }
    const tgt = WEATHER[st.target], k = Math.min(1, dt / 5);
    for (const key of ['snow', 'cloud', 'grey', 'sunK', 'fogNear', 'fogFar', 'flake']) st.w[key] += (tgt[key] - st.w[key]) * k;
    st.w.name = tgt.name;
    st.wind += (((st.target === 3 ? 1.6 : 0.3) - st.wind)) * Math.min(1, dt / 3);
    apply(camPos);

    // clouds drift around the camera
    for (const c of clouds) { const u = c.userData; u.a += dt * 0.006; c.position.set(camPos.x + Math.cos(u.a) * u.r, u.y + camPos.y * 0.2, camPos.z + Math.sin(u.a) * u.r); }
    // snowfall
    const n = Math.floor(NFLAKE * st.w.snow);
    flakes.visible = n > 4;
    if (flakes.visible) {
      flakeGeo.setDrawRange(0, n);
      flakeMat.size = st.w.flake; flakeMat.opacity = 0.55 + 0.35 * st.w.snow;
      flakes.position.set(camPos.x, Math.max(0, camPos.y - 12), camPos.z);
      const a = flakeGeo.attributes.position.array, fall = 1.6 + st.w.snow * 1.4;
      for (let i = 0; i < n; i++) {
        a[i * 3 + 1] -= (fall + (i % 5) * 0.35) * dt;
        a[i * 3] += (Math.sin(a[i * 3 + 1] * 0.7 + i) * 0.25 + st.wind * 0.8) * dt;
        if (a[i * 3] > HALF_BOX) a[i * 3] -= HALF_BOX * 2;
        if (a[i * 3 + 1] < 0) a[i * 3 + 1] += TOP;
      }
      flakeGeo.attributes.position.needsUpdate = true;
    }
  }
  const pad = (v) => (v < 10 ? '0' : '') + v;
  return {
    update,
    hour: () => st.hour, day: () => st.day, setDay(d) { if (typeof d === 'number' && isFinite(d) && d >= 1) st.day = Math.floor(d); },
    setHour(h) { if (typeof h === 'number' && isFinite(h)) st.hour = ((h % 24) + 24) % 24; },
    label() { const h = Math.floor(st.hour), m = Math.floor((st.hour - h) * 60); return pad(h) + ':' + pad(m) + '\n' + st.w.name; },
    state: () => ({ hour: st.hour, weather: st.w.name, dark, sunElev }),
  };
}
