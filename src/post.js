// Optional High-tier post pipeline: HDR scene target (4x MSAA) -> soft-knee bright pass -> 3-level gaussian bloom ->
// composite with ACES filmic tone mapping + slight vignette. Falls back to direct rendering when float render targets
// are not available. When enabled the renderer's own tone mapping is switched off (the composite does it).
const THREE = window.THREE;

const ACES = `
vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 acesTone(vec3 color, float ex) {
  const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color *= ex / 0.6; color = I * color; color = RRTAndODTFit(color); color = O * color; return clamp(color, 0.0, 1.0);
}`;
const VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const mk = (frag, uniforms) => new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false, toneMapped: false });

export function createPost(renderer, scene, camera, exposure) {
  const P = { enabled: false, supported: false, exposure: exposure || 1.3, strength: 0.5 };
  const ext = renderer.extensions;
  P.supported = !!(renderer.capabilities.isWebGL2 && (ext.get('EXT_color_buffer_float') || ext.get('EXT_color_buffer_half_float')));
  if (!P.supported) { P.setEnabled = () => {}; P.resize = () => {}; P.render = () => renderer.render(scene, camera); return P; }

  const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); quad.frustumCulled = false; quadScene.add(quad);
  const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
  let rtScene = null; const A = [], B = [];
  const U = {
    bright: { tex: { value: null }, texel: { value: new THREE.Vector2() }, thr: { value: 1.5 }, knee: { value: 0.6 }, ex: { value: P.exposure } },
    copy: { tex: { value: null }, texel: { value: new THREE.Vector2() } },
    blur: { tex: { value: null }, dir: { value: new THREE.Vector2() } },
    comp: { tScene: { value: null }, b0: { value: null }, b1: { value: null }, b2: { value: null }, str: { value: P.strength }, ex: { value: P.exposure }, vig: { value: 0.18 } }
  };
  const matBright = mk(`uniform sampler2D tex; uniform vec2 texel; uniform float thr; uniform float knee; uniform float ex; varying vec2 vUv;
    vec3 fetch(vec2 o) { return texture2D(tex, vUv + o * texel).rgb; }
    void main() { vec3 c = (fetch(vec2(-1.0, -1.0)) + fetch(vec2(1.0, -1.0)) + fetch(vec2(-1.0, 1.0)) + fetch(vec2(1.0, 1.0))) * 0.25;
      float l = max(c.r, max(c.g, c.b)) * ex; float soft = clamp(l - thr + knee, 0.0, 2.0 * knee); soft = soft * soft / (4.0 * knee + 0.0001);
      float w = max(soft, l - thr) / max(l, 0.0001); gl_FragColor = vec4(c * w, 1.0); }`, U.bright);
  const matCopy = mk(`uniform sampler2D tex; uniform vec2 texel; varying vec2 vUv;
    void main() { vec3 c = texture2D(tex, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, -1.0)).rgb + texture2D(tex, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, 1.0)).rgb; gl_FragColor = vec4(c * 0.25, 1.0); }`, U.copy);
  const matBlur = mk(`uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
    void main() { vec3 c = texture2D(tex, vUv).rgb * 0.227027; c += texture2D(tex, vUv + dir * 1.3846).rgb * 0.316216; c += texture2D(tex, vUv - dir * 1.3846).rgb * 0.316216; c += texture2D(tex, vUv + dir * 3.2308).rgb * 0.070270; c += texture2D(tex, vUv - dir * 3.2308).rgb * 0.070270; gl_FragColor = vec4(c, 1.0); }`, U.blur);
  const matComp = mk(`${ACES}
    uniform sampler2D tScene; uniform sampler2D b0; uniform sampler2D b1; uniform sampler2D b2; uniform float str; uniform float ex; uniform float vig; varying vec2 vUv;
    void main() { vec3 c = texture2D(tScene, vUv).rgb; vec3 b = texture2D(b0, vUv).rgb * 0.5 + texture2D(b1, vUv).rgb * 0.35 + texture2D(b2, vUv).rgb * 0.25; c += b * str;
      c = acesTone(c, ex); vec2 q = vUv - 0.5; c *= 1.0 - vig * dot(q, q) * 2.2; gl_FragColor = vec4(c, 1.0); }`, U.comp);

  const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); };
  const size = new THREE.Vector2();
  P.resize = () => {
    renderer.getDrawingBufferSize(size); const w = Math.max(2, size.x | 0), h = Math.max(2, size.y | 0);
    if (rtScene) { rtScene.dispose(); A.forEach(t => t.dispose()); B.forEach(t => t.dispose()); A.length = 0; B.length = 0; }
    rtScene = THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(w, h, Object.assign({}, opts, { depthBuffer: true })) : new THREE.WebGLRenderTarget(w, h, Object.assign({}, opts, { depthBuffer: true }));
    if (rtScene.samples !== undefined) rtScene.samples = 4;
    for (let i = 0; i < 3; i++) { const d = 2 << i, bw = Math.max(2, (w / d) | 0), bh = Math.max(2, (h / d) | 0); A.push(new THREE.WebGLRenderTarget(bw, bh, opts)); B.push(new THREE.WebGLRenderTarget(bw, bh, opts)); }
  };
  P.setEnabled = (on) => {
    on = !!on && P.supported; if (on === P.enabled) return;
    P.enabled = on; renderer.toneMapping = on ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    if (on) P.resize(); else if (rtScene) { rtScene.dispose(); A.forEach(t => t.dispose()); B.forEach(t => t.dispose()); rtScene = null; A.length = 0; B.length = 0; }
    scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); } });
  };
  P.render = () => {
    if (!P.enabled || !rtScene) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
    U.bright.tex.value = rtScene.texture; U.bright.texel.value.set(1 / rtScene.width, 1 / rtScene.height); U.bright.ex.value = P.exposure;
    pass(matBright, A[0]);
    for (let i = 0; i < 3; i++) {
      if (i > 0) { U.copy.tex.value = A[i - 1].texture; U.copy.texel.value.set(1 / A[i - 1].width, 1 / A[i - 1].height); pass(matCopy, A[i]); }
      U.blur.tex.value = A[i].texture; U.blur.dir.value.set(1 / A[i].width, 0); pass(matBlur, B[i]);
      U.blur.tex.value = B[i].texture; U.blur.dir.value.set(0, 1 / A[i].height); pass(matBlur, A[i]);
    }
    U.comp.tScene.value = rtScene.texture; U.comp.b0.value = A[0].texture; U.comp.b1.value = A[1].texture; U.comp.b2.value = A[2].texture; U.comp.ex.value = P.exposure; U.comp.str.value = P.strength;
    pass(matComp, null);
  };
  return P;
}
