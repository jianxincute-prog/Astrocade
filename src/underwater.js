// Underwater effects (tiered): animated caustics on submerged geometry, sun shafts (god rays), drifting marine snow,
// and rising air bubbles. Level 0 (Low) = bubbles only, 1 (Med) = + caustics (3 iterations) + 300 particles + 8 shafts,
// 2 (High) = caustics (5 iterations) + 700 particles + 14 shafts. All procedural - no texture assets.
const THREE = window.THREE;

const CAUSTIC_FN = `
float causticPat(vec2 uv, float time) {
  vec2 p = mod(uv * 6.28318530718, 6.28318530718) - 250.0; vec2 i = p; float c = 1.0; float inten = 0.005;
  for (int n = 0; n < CAUSTIC_ITER; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
  }
  c /= float(CAUSTIC_ITER); c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}`;

const RAY_VERT = `
varying vec2 vUv; varying vec3 vW;
#include <fog_pars_vertex>
void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const RAY_FRAG = `
uniform float uTime; uniform float uInt; uniform vec3 uCol;
varying vec2 vUv; varying vec3 vW;
#include <fog_pars_fragment>
void main() {
  float side = pow(1.0 - abs(vUv.x * 2.0 - 1.0), 1.6);
  float top = pow(vUv.y, 1.3);
  float flick = 0.65 + 0.35 * sin(uTime * 0.7 + vW.x * 0.31 + vW.z * 0.17);
  float near = smoothstep(1.5, 7.0, distance(cameraPosition, vW));
  float fogF = exp(-fogDensity * fogDensity * fogDepth * fogDepth);
  float a = side * top * flick * near * fogF * uInt;
  gl_FragColor = vec4(uCol * a, 1.0);
}`;
const SNOW_VERT = `
attribute vec3 aSeed; uniform vec3 uCam; uniform float uTime; uniform float uScale; uniform vec3 uBox;
varying float vA;
void main() {
  vec3 p = aSeed * uBox + vec3(0.25 * sin(aSeed.x * 40.0 + uTime * 0.3), 0.12, 0.2 * cos(aSeed.z * 40.0 + uTime * 0.25)) * uTime * 0.6;
  vec3 rel = mod(p - uCam, uBox) - uBox * 0.5;
  vec4 mv = viewMatrix * vec4(uCam + rel, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = max(-mv.z, 0.1);
  gl_PointSize = clamp((0.05 + aSeed.y * 0.07) * uScale / d, 1.0, 12.0);
  vA = (1.0 - smoothstep(0.30, 0.5, length(rel.xz) / uBox.x)) * smoothstep(0.6, 3.0, d) * (1.0 - smoothstep(8.0, 30.0, d));
}`;
const SNOW_FRAG = `
uniform float uInt; varying float vA;
void main() { float r = length(gl_PointCoord - 0.5) * 2.0; float a = (1.0 - smoothstep(0.4, 1.0, r)) * vA * uInt; gl_FragColor = vec4(vec3(0.75, 0.92, 1.0) * a, 1.0); }`;
const BUB_VERT = `
attribute float aSize; attribute float aAlpha; uniform float uScale; varying float vA;
void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.1), 2.0, 48.0); vA = aAlpha; }`;
const BUB_FRAG = `
varying float vA;
void main() {
  vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0;
  float ring = smoothstep(0.62, 0.92, d) * (1.0 - smoothstep(0.92, 1.0, d));
  float hi = smoothstep(0.22, 0.0, length(q - vec2(-0.14, -0.14)));
  float a = (ring * 0.75 + hi * 0.8 + (1.0 - smoothstep(0.0, 0.95, d)) * 0.06) * vA;
  if (a < 0.01) discard; gl_FragColor = vec4(vec3(0.85, 0.97, 1.0), a);
}`;

export function createUnderwater(scene, camera, renderer) {
  const U = { level: 0 };
  const cu = { uCTime: { value: 0 }, uCI: { value: 0 } };
  const patched = [];
  // ---- caustics: patch a MeshLambertMaterial ----
  U.patch = (mat) => {
    mat.onBeforeCompile = (shader) => {
      shader.defines = Object.assign(shader.defines || {}, { CAUSTIC_ITER: U.level >= 2 ? 5 : 3 });
      shader.uniforms.uCTime = cu.uCTime; shader.uniforms.uCI = cu.uCI;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCW; varying vec3 vCN;')
        .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 cwp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          cwp = instanceMatrix * cwp;
        #endif
          cwp = modelMatrix * cwp; vCW = cwp.xyz; vCN = normalize(mat3(modelMatrix) * objectNormal); }`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uCTime; uniform float uCI; varying vec3 vCW; varying vec3 vCN;\n' + CAUSTIC_FN)
        .replace('#include <tonemapping_fragment>', `
        { float cm = smoothstep(0.4, -0.6, vCW.y) * uCI;
          if (cm > 0.001) { float depth = max(-vCW.y, 0.0); float att = exp(-depth * 0.035); float up = 0.3 + 0.7 * max(vCN.y, 0.0);
            float c = causticPat(vCW.xz * 0.045 + vCW.y * 0.01, uCTime);
            gl_FragColor.rgb += vec3(0.55, 0.85, 1.0) * c * att * up * cm * 1.7; } }
        #include <tonemapping_fragment>`);
    };
    mat.customProgramCacheKey = () => 'uwc' + (U.level >= 2 ? 5 : 3);
    mat.needsUpdate = true; patched.push(mat);
  };
  // ---- sun shafts ----
  const fogU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uInt: { value: 0 }, uCol: { value: new THREE.Color(0.55, 0.85, 0.95) } }]);
  const rayMat = new THREE.ShaderMaterial({ uniforms: fogU, vertexShader: RAY_VERT, fragmentShader: RAY_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true });
  const rays = [], rr = (() => { let a = 12345; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
  const SPAN = 90;
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group(), w = 5 + rr() * 11, h = 72;
    for (let k = 0; k < 2; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), rayMat); m.position.y = -h / 2; m.rotation.y = k * Math.PI / 2; m.frustumCulled = false; g.add(m); }
    g.userData = { ox: rr() * SPAN, oz: rr() * SPAN }; g.visible = false; scene.add(g); rays.push(g);
  }
  // ---- marine snow ----
  const SN = 700, seeds = new Float32Array(SN * 3); for (let i = 0; i < seeds.length; i++) seeds[i] = rr();
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SN * 3), 3)); sg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  const snowU = { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uScale: { value: 600 }, uBox: { value: new THREE.Vector3(60, 36, 60) }, uInt: { value: 0 } };
  const snow = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: snowU, vertexShader: SNOW_VERT, fragmentShader: SNOW_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  snow.frustumCulled = false; snow.visible = false; scene.add(snow);
  // ---- exhale / splash bubbles (CPU) ----
  const BN = 64, bpos = new Float32Array(BN * 3), bsize = new Float32Array(BN), balpha = new Float32Array(BN), bdata = [];
  for (let i = 0; i < BN; i++) { bdata.push({ life: 0, vy: 0, ph: 0, sz: 0 }); bpos[i * 3 + 1] = -9999; }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bpos, 3)); bg.setAttribute('aSize', new THREE.BufferAttribute(bsize, 1)); bg.setAttribute('aAlpha', new THREE.BufferAttribute(balpha, 1));
  const bubU = { uScale: { value: 600 } };
  const bubbles = new THREE.Points(bg, new THREE.ShaderMaterial({ uniforms: bubU, vertexShader: BUB_VERT, fragmentShader: BUB_FRAG, transparent: true, depthWrite: false }));
  bubbles.frustumCulled = false; scene.add(bubbles);
  U.bubble = (x, y, z, n) => {
    let k = 0;
    for (let i = 0; i < BN && k < n; i++) {
      const d = bdata[i]; if (d.life > 0) continue;
      d.life = 1; d.vy = 0.8 + Math.random() * 0.9; d.ph = Math.random() * 6.28; d.sz = 0.05 + Math.random() * 0.12;
      bpos[i * 3] = x + (Math.random() - 0.5) * 0.5; bpos[i * 3 + 1] = y + Math.random() * 0.3; bpos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.5; k++;
    }
  };
  U.setLevel = (l) => {
    U.level = l; rays.forEach((g, i) => g.userData.on = l >= 1 && i < (l >= 2 ? 14 : 8));
    sg.setDrawRange(0, l >= 2 ? 700 : l >= 1 ? 300 : 0); patched.forEach(m => { m.needsUpdate = true; });
  };
  let exhale = 0; const dir = new THREE.Vector3(), q = new THREE.Quaternion(), down = new THREE.Vector3(0, -1, 0), L = new THREE.Vector3();
  // s: { under, depth, day, sunDir }
  U.update = (t, dt, s) => {
    const px = renderer.getPixelRatio ? renderer.getPixelRatio() : 1, scale = (renderer.domElement.clientHeight || 1280) * px * 0.5;
    cu.uCTime.value = t; cu.uCI.value = U.level >= 1 ? (s.day || 0) : 0;
    snowU.uScale.value = scale * 0.9; bubU.uScale.value = scale;
    const under = !!s.under, depth = s.depth || 0, light = (s.day || 0) * Math.max(0, 1 - depth / 55);
    // shafts
    fogU.uTime.value = t; fogU.uInt.value = under ? light * 1.3 : 0;
    L.set(-(s.sunDir ? s.sunDir.x : 0) * 0.45, -Math.max(0.55, s.sunDir ? s.sunDir.y : 1), -(s.sunDir ? s.sunDir.z : 0) * 0.45).normalize();
    q.setFromUnitVectors(down, L);
    rays.forEach(g => {
      g.visible = under && !!g.userData.on && light > 0.02;
      if (!g.visible) return;
      let dx = g.userData.ox - camera.position.x, dz = g.userData.oz - camera.position.z;
      dx = ((dx + SPAN / 2) % SPAN + SPAN) % SPAN - SPAN / 2; dz = ((dz + SPAN / 2) % SPAN + SPAN) % SPAN - SPAN / 2;
      g.position.set(camera.position.x + dx + Math.sin(t * 0.15 + g.userData.ox) * 2, 0, camera.position.z + dz); g.quaternion.copy(q);
    });
    // snow
    snow.visible = under && U.level >= 1; snowU.uCam.value.copy(camera.position); snowU.uTime.value = t; snowU.uInt.value = under ? (0.35 + 0.65 * Math.min(1, depth / 15)) * (0.4 + 0.6 * (s.day || 0)) : 0;
    // bubbles
    if (under) { exhale -= dt; if (exhale <= 0) { exhale = 2 + Math.random() * 1.5; camera.getWorldDirection(dir); U.bubble(camera.position.x + dir.x * 0.5, camera.position.y - 0.3, camera.position.z + dir.z * 0.5, 3 + (Math.random() * 3 | 0)); } }
    for (let i = 0; i < BN; i++) {
      const d = bdata[i]; if (d.life <= 0) { balpha[i] = 0; continue; }
      bpos[i * 3 + 1] += d.vy * dt; bpos[i * 3] += Math.sin(t * 2 + d.ph) * 0.15 * dt; bpos[i * 3 + 2] += Math.cos(t * 1.7 + d.ph) * 0.15 * dt;
      bsize[i] = d.sz * (1 + (bpos[i * 3 + 1] < 0 ? 0 : 0)); balpha[i] = Math.min(1, d.life * 3) * 0.9;
      d.life -= dt * 0.12; if (bpos[i * 3 + 1] > 0.2 || d.life <= 0) { d.life = 0; balpha[i] = 0; bpos[i * 3 + 1] = -9999; }
    }
    bg.attributes.position.needsUpdate = true; bg.attributes.aSize.needsUpdate = true; bg.attributes.aAlpha.needsUpdate = true;
  };
  return U;
}
