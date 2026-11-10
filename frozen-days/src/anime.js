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

let outlineMat = null;
function getOutlineMat() {
  if (!outlineMat) {
    outlineMat = new T.ShaderMaterial({
      uniforms: { uColor: { value: new T.Color(0x2a2030) }, uThick: { value: 0.0034 }, uAspect: OUTLINE.aspect },
      vertexShader: [
        'uniform float uThick; uniform float uAspect;',
        'void main() {',
        '  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '  vec3 n = normalize(normalMatrix * normal);',
        '  vec2 d = (projectionMatrix * vec4(n, 0.0)).xy; d = normalize(d + vec2(1e-5));',
        '  p.xy += vec2(d.x / uAspect, d.y) * uThick * p.w;',
        '  gl_Position = p;',
        '}',
      ].join('\n'),
      fragmentShader: 'uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }',
      side: T.BackSide,
    });
  }
  return outlineMat;
}

// Adds an outline hull child to every sizeable toon mesh under root.
export function addOutlines(root) {
  const list = [];
  root.traverse((o) => {
    if (!o.isMesh || o.userData.isOutline || !o.material || !o.material.isMeshToonMaterial || o.material.userData.noOutline) return;
    o.geometry.computeBoundingSphere();
    if (o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) > 0.02) list.push(o);
  });
  const mat = getOutlineMat();
  list.forEach((o) => { const h = new T.Mesh(o.geometry, mat); h.userData.isOutline = true; o.add(h); });
}
