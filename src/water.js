// Realistic ocean + sky dome (GPU shaders, no texture assets).
// - Waves: same 3-sine height field as waveAt() in world.js, evaluated on the GPU so gameplay (floating props) matches visuals.
// - Look: Fresnel sky reflection, sun/moon glitter, depth-like body colour, crest scattering, whitecaps, shoreline foam,
//   Snell's-window view from below, distance fade. Detail ripples scale with the quality tier (Q_LEVEL 0 low / 1 med / 2 high).
// - Colour pipeline: ACES filmic tone mapping on the renderer; the sky dome and water use the same curve, and the fog /
//   clear colour is pre-tonemapped in JS (acesJS) so the horizon seam stays invisible.
const THREE = window.THREE;

export function acesJS(c, exposure) {
  const e = exposure / 0.6, r = c.r * e, g = c.g * e, b = c.b * e;
  let x = 0.59719 * r + 0.35458 * g + 0.04823 * b, y = 0.07600 * r + 0.90834 * g + 0.01566 * b, z = 0.02840 * r + 0.13383 * g + 0.83777 * b;
  const fit = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.4329510) + 0.238081);
  x = fit(x); y = fit(y); z = fit(z);
  const o = (a, b2, c2) => Math.min(1, Math.max(0, a));
  return new THREE.Color(o(1.60475 * x - 0.53108 * y - 0.07367 * z), o(-0.10208 * x + 1.10813 * y - 0.00605 * z), o(-0.00327 * x - 0.07276 * y + 1.07602 * z));
}

const WATER_VERT = `
uniform float uTime; uniform float uAmp; uniform float uNS;
varying vec3 vWorld; varying float vH; varying vec3 vNL;
#include <fog_pars_vertex>
void main() {
  vec3 p = position;
#ifndef FLAT
  float t = uTime, A = uAmp;
  float a1 = p.x * 0.07 + t * 0.9, a2 = p.z * 0.09 + t * 1.3, a3 = (p.x + p.z) * 0.15 + t * 1.8;
  float h = (sin(a1) + sin(a2) * 0.7 + sin(a3) * 0.3) * A;
  p.y = h; vH = h / (A * 2.0 + 0.0001);
  float dx = (cos(a1) * 0.07 + cos(a3) * 0.045) * A;
  float dz = (cos(a2) * 0.063 + cos(a3) * 0.045) * A;
  vNL = vec3(-dx * uNS, 1.0, -dz * uNS);
#else
  vH = 0.0; vNL = vec3(0.0, 1.0, 0.0);
#endif
  vWorld = p;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;

const WATER_FRAG = `
uniform float uTime; uniform float uAmp; uniform float uDay;
uniform vec3 uSkyH; uniform vec3 uSkyZ; uniform vec3 uSunDir; uniform vec3 uSunCol;
uniform vec4 uObs[11];
varying vec3 vWorld; varying float vH; varying vec3 vNL;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 skyCol(vec3 d) {
  float h = clamp(d.y, 0.0, 1.0);
  vec3 c = mix(uSkyH, uSkyZ, pow(h, 0.45));
  float sd = max(dot(d, uSunDir), 0.0);
  c += uSunCol * (pow(sd, 10.0) * 0.22 + pow(sd, 1200.0) * 14.0);
  return c;
}
vec2 wv(vec2 p, vec2 d, float k, float s, float a, float t) { return d * (k * a * cos(dot(d, p) * k + t * s)); }
vec2 detail(vec2 p, float t, float dist) {
  vec2 g = vec2(0.0);
#if Q_LEVEL >= 1
#if Q_LEVEL >= 2
  p += (vec2(vnoise(p * 0.15 + t * 0.04), vnoise(p * 0.15 - t * 0.05 + 7.0)) - 0.5) * 3.0;
#endif
  g += wv(p, vec2(0.8, 0.6), 0.55, 1.1, 0.05, t);
  g += wv(p, vec2(-0.6, 0.8), 0.9, 1.5, 0.035, t);
  g += wv(p, vec2(0.3, -0.95), 1.6, 2.0, 0.022, t);
#endif
#if Q_LEVEL >= 2
  g += wv(p, vec2(-0.95, -0.3), 2.7, 2.6, 0.012, t);
  g += wv(p, vec2(0.7, -0.7), 4.2, 3.4, 0.006, t);
  g += wv(p, vec2(-0.2, 0.98), 6.5, 4.2, 0.003, t);
#endif
  return g * (1.0 - smoothstep(35.0, 240.0, dist));
}
float shoreFoam(vec2 p, float t) {
  float f = 0.0;
  for (int i = 0; i < 11; i++) {
    vec4 o = uObs[i]; float d;
    if (o.w > 0.5) { vec2 q = abs(p - o.xy) - vec2(o.z); d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
    else d = length(p - o.xy) - o.z;
    if (d < 5.0) {
      float n = vnoise(p * 0.6 + t * 0.1);
      float band = smoothstep(0.55, 0.95, sin(d * 2.4 - t * 1.3 + n * 4.0) * 0.5 + 0.5);
      float edge = 1.0 - smoothstep(0.0, 3.2, d + n * 0.8);
      f = max(f, edge * (0.4 + 0.6 * band));
      f = max(f, 1.0 - smoothstep(0.0, 0.7, d));
    }
  }
  return f;
}
void main() {
  vec3 Vv = cameraPosition - vWorld; float dist = length(Vv); vec3 V = Vv / dist;
  bool below = cameraPosition.y < vWorld.y;
  vec2 g = detail(vWorld.xz, uTime, dist);
  vec3 N = normalize(vec3(vNL.x - g.x * 2.6, vNL.y, vNL.z - g.y * 2.6));
  if (below) N = -N;
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  vec3 col; float alpha;
  if (!below) {
    float F = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
    vec3 R = reflect(-V, N); R.y = abs(R.y);
    vec3 refl = skyCol(R);
    vec3 shallow = vec3(0.04, 0.30, 0.38), deep = vec3(0.004, 0.05, 0.12);
    vec3 body = mix(deep, shallow, ndv * ndv) * (0.3 + 0.7 * uDay);
    float crest = clamp(vH * 1.2 + 0.5, 0.0, 1.0);
    body += vec3(0.03, 0.22, 0.20) * crest * crest * (0.2 + 0.8 * uDay);
    col = mix(body, refl, F);
#if Q_LEVEL >= 1
    vec3 H = normalize(V + uSunDir);
    col += uSunCol * pow(max(dot(N, H), 0.0), 260.0) * 1.8;
    float foam = shoreFoam(vWorld.xz, uTime);
    float cf = smoothstep(0.84, 1.0, vH + (vnoise(vWorld.xz * 0.8 + uTime * 0.3) - 0.5) * 0.3) * smoothstep(0.22, 0.5, uAmp) * 0.55;
    foam = clamp(foam + cf, 0.0, 1.0) * (1.0 - smoothstep(60.0, 260.0, dist));
    col = mix(col, vec3(0.92, 0.96, 0.98) * (0.3 + 0.7 * uDay), foam * 0.85);
#else
    float foam = 0.0;
#endif
    alpha = clamp(mix(0.66, 1.0, F) + foam, 0.0, 1.0);
    alpha = max(alpha, smoothstep(70.0, 320.0, dist) * 0.9);
  } else {
    vec3 r = refract(-V, N, 1.33);
    vec3 under = fogColor;
    if (dot(r, r) < 0.001) col = under * 0.55;
    else col = mix(under, skyCol(normalize(r)) * 0.9, 0.7 * clamp(r.y * 2.0, 0.0, 1.0) + 0.1);
    alpha = 0.93;
  }
  gl_FragColor = vec4(col, alpha);
#include <tonemapping_fragment>
#include <fog_fragment>
}`;

const DOME_VERT = `
varying vec3 vDir;
void main() { vDir = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w * 0.999999; }`;
const DOME_FRAG = `
uniform vec3 uSkyH; uniform vec3 uSkyZ; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uDay;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 c = mix(uSkyH, uSkyZ, pow(h, 0.45));
  float sd = max(dot(d, uSunDir), 0.0);
  c += uSunCol * (pow(sd, 10.0) * 0.22 + pow(sd, 700.0) * 10.0);
  float night = 1.0 - smoothstep(0.1, 0.45, uDay);
  if (night > 0.01 && d.y > 0.0) { vec3 q = floor(d * 260.0); float s = step(0.9975, hash(q.xy + q.z * 1.7)); c += vec3(s) * night * 0.9; }
  gl_FragColor = vec4(c, 1.0);
#include <tonemapping_fragment>
}`;

export function createWaterSystem(scene, renderer) {
  const S = {};
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uAmp: { value: 0.3 }, uNS: { value: 5.0 }, uDay: { value: 1 },
    uSkyH: { value: new THREE.Color(0x8fd3ff) }, uSkyZ: { value: new THREE.Color(0x2a6fd0) },
    uSunDir: { value: new THREE.Vector3(0.5, 0.7, 0.4).normalize() }, uSunCol: { value: new THREE.Color(1, 0.93, 0.8) },
    uObs: { value: Array.from({ length: 11 }, () => new THREE.Vector4(99999, 99999, 0, 0)) }
  }]);
  S.uniforms = uniforms;
  const mk = (level, flat) => new THREE.ShaderMaterial({ uniforms, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, transparent: true, side: THREE.DoubleSide, fog: true, defines: Object.assign({ Q_LEVEL: level }, flat ? { FLAT: 1 } : {}) });
  S.near = null; S.far = null; S.seg = 0; S.level = -1;
  S.rebuild = (seg, level, size, hole) => {
    [S.near, S.far].forEach(m => { if (m) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); } });
    const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
    S.near = new THREE.Mesh(geo, mk(level, false)); S.near.frustumCulled = false; scene.add(S.near);
    const shape = new THREE.Shape(); const B = 4000, hh = size / 2;
    shape.moveTo(-B, -B); shape.lineTo(B, -B); shape.lineTo(B, B); shape.lineTo(-B, B); shape.lineTo(-B, -B);
    const hole2 = new THREE.Path(); hole2.moveTo(-hh, -hh); hole2.lineTo(-hh, hh); hole2.lineTo(hh, hh); hole2.lineTo(hh, -hh); hole2.lineTo(-hh, -hh); shape.holes.push(hole2);
    const fg = new THREE.ShapeGeometry(shape); fg.rotateX(-Math.PI / 2);
    S.far = new THREE.Mesh(fg, mk(0, true)); S.far.frustumCulled = false; scene.add(S.far);
    S.seg = seg; S.level = level;
  };
  S.update = (t, amp) => { uniforms.uTime.value = t; uniforms.uAmp.value = amp; };
  S.setObstacles = (list) => { list.slice(0, 11).forEach((o, i) => uniforms.uObs.value[i].set(o.x, o.z, o.r, o.box ? 1 : 0)); };
  // sky dome (follows the camera)
  S.dome = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.ShaderMaterial({ uniforms: { uSkyH: uniforms.uSkyH, uSkyZ: uniforms.uSkyZ, uSunDir: uniforms.uSunDir, uSunCol: uniforms.uSunCol, uDay: uniforms.uDay }, vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: THREE.BackSide, depthWrite: false, fog: false }));
  S.dome.renderOrder = -10; S.dome.frustumCulled = false; scene.add(S.dome);
  return S;
}
