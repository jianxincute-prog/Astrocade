// Anime look: cel (toon) shading with a soft 3-step ramp, plus ink outlines drawn as inverted hulls
// pushed out in screen space so the line keeps a constant pixel width at any camera distance.
const T = THREE;

export const OUTLINE = { aspect: { value: 9 / 16 } };

const ramps = {};
function gradient(soft) {
  const key = soft ? 'soft' : 'hard';
  if (!ramps[key]) {
    const r = new T.DataTexture(new Uint8Array(soft ? [225, 242, 255] : [150, 205, 255]), 3, 1, T.LuminanceFormat);
    r.minFilter = r.magFilter = T.NearestFilter; r.generateMipmaps = false; r.needsUpdate = true;
    ramps[key] = r;
  }
  return ramps[key];
}

export function toonMat(o) {
  const m = new T.MeshToonMaterial({
    color: o.color !== undefined ? o.color : 0xffffff, map: o.map || null, vertexColors: !!o.vertexColors,
    side: o.side || T.FrontSide, gradientMap: gradient(o.soft),
  });
  if (o.transparent) { m.transparent = true; m.opacity = o.opacity; }
  m.userData.noOutline = !!o.noOutline;
  return m;
}

const outlineMats = {};
function getOutlineMat(thick, fade, smooth) {
  const key = thick + '_' + fade + (smooth ? '_s' : '');
  if (!outlineMats[key]) {
    outlineMats[key] = new T.ShaderMaterial({
      uniforms: { uColor: { value: new T.Color(0x2a2030) }, uThick: { value: thick }, uFade: { value: fade }, uAspect: OUTLINE.aspect },
      vertexShader: [
        'uniform float uThick; uniform float uAspect; uniform float uFade;',
        smooth ? 'attribute vec3 onormal;' : '',
        'void main() {',
        '  #ifdef USE_INSTANCING',
        '    mat4 im = instanceMatrix;',
        '  #else',
        '    mat4 im = mat4(1.0);',
        '  #endif',
        '  vec4 p = projectionMatrix * modelViewMatrix * im * vec4(position, 1.0);',
        smooth ? '  vec3 n = normalize(normalMatrix * mat3(im) * onormal);' : '  vec3 n = normalize(normalMatrix * mat3(im) * normal);',
        '  vec2 d = (projectionMatrix * vec4(n, 0.0)).xy; d = normalize(d + vec2(1e-5));',
        '  float t = uThick * (1.0 - uFade * smoothstep(40.0, 170.0, p.w));',
        '  p.xy += vec2(d.x / uAspect, d.y) * t * p.w;',
        '  gl_Position = p;',
        '}',
      ].join('\n'),
      fragmentShader: 'uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }',
      side: T.BackSide,
    });
  }
  return outlineMats[key];
}

// Adds an outline hull child to every sizeable toon mesh under root.
export function addOutlines(root, opt) {
  const thick = (opt && opt.thick) || 0.0034, fade = (opt && opt.fade) || 0;
  const list = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.isOutline || !o.material || !o.material.isMeshToonMaterial || o.material.userData.noOutline) return;
    o.geometry.computeBoundingSphere();
    if (o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) > 0.02) list.push(o);
  });
  list.forEach((o) => { const h = new T.Mesh(o.geometry, getOutlineMat(thick, fade, !!o.geometry.attributes.onormal)); h.userData.isOutline = true; o.add(h); });
}

// Smoothed per-position normals so outlines of merged, hard-edged meshes stay closed at the corners.
export function computeOutlineNormals(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, acc = new Map(), key = (i) => Math.round(p.getX(i) * 100) + ',' + Math.round(p.getY(i) * 100) + ',' + Math.round(p.getZ(i) * 100);
  for (let i = 0; i < p.count; i++) { const k = key(i); let a = acc.get(k); if (!a) { a = [0, 0, 0]; acc.set(k, a); } a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); }
  const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l; }
  geo.setAttribute('onormal', new T.BufferAttribute(out, 3));
}

// Outline for an InstancedMesh (shares the instance matrices; added to the same parent).
export function addInstancedOutline(mesh, parent, opt) {
  const h = new T.InstancedMesh(mesh.geometry, getOutlineMat((opt && opt.thick) || 0.0022, (opt && opt.fade) || 1), mesh.count);
  h.instanceMatrix = mesh.instanceMatrix; h.frustumCulled = false; h.userData.isOutline = true;
  parent.add(h);
  return h;
}
