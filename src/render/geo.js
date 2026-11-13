// Static-geometry merger: many small pieces (boxes, cylinders, roofs...) are baked into a few meshes, one per
// (material, 75 m chunk). A chunk is culled as a unit by the camera and by the shadow camera, so the city stays
// cheap to draw even though every building is assembled from dozens of details.
//
// Materials normally use vertex colours (`vertexColors: true`), so one material can serve every colour of a kind.

export class Mesher {
  constructor(T, chunk = 75) {
    this.T = T; this.chunk = chunk; this.buckets = new Map();
    this._m = new T.Matrix4(); this._n = new T.Matrix3(); this._v = new T.Vector3(); this._q = new T.Quaternion(); this._e = new T.Euler(); this._s = new T.Vector3();
    this._col = new T.Color();
  }

  bucket(mat, x, z) {
    const key = mat.uuid + ':' + Math.floor(x / this.chunk) + ':' + Math.floor(z / this.chunk);
    let b = this.buckets.get(key);
    if (!b) { b = { mat, pos: [], nor: [], uv: [], col: [], idx: [], n: 0, shadow: true, receive: true }; this.buckets.set(key, b); }
    return b;
  }

  /** Append a THREE geometry transformed by (x,y,z, rotY, scale). opts: { color, rx, rz, sx, sy, sz, uv:(u,v,i)=>[u,v] }. */
  geo(mat, g, x, y, z, rotY = 0, opts = {}) {
    const T = this.T, b = this.bucket(mat, x, z);
    this._e.set(opts.rx || 0, rotY, opts.rz || 0); this._q.setFromEuler(this._e);
    this._m.compose(this._v.set(x, y, z), this._q, this._s.set(opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1));
    this._n.getNormalMatrix(this._m);
    const p = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
    const c = this._col.set(opts.color ?? 0xffffff);
    const base = b.n;
    for (let i = 0; i < p.count; i++) {
      this._v.fromBufferAttribute(p, i).applyMatrix4(this._m);
      b.pos.push(this._v.x, this._v.y, this._v.z);
      this._v.fromBufferAttribute(nrm, i).applyMatrix3(this._n).normalize();
      b.nor.push(this._v.x, this._v.y, this._v.z);
      if (opts.uv) { const r = opts.uv(uv.getX(i), uv.getY(i), i); b.uv.push(r[0], r[1]); } else b.uv.push(uv.getX(i), uv.getY(i));
      b.col.push(c.r, c.g, c.b);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) b.idx.push(base + g.index.getX(i));
    else for (let i = 0; i < p.count; i++) b.idx.push(base + i);
    b.n += p.count;
  }

  /** Raw quad (counter-clockwise seen from the front): a,b,c,d are [x,y,z]; uv = [u0,v0,u1,v1] mapped a->c. */
  quad(mat, a, bb, c, d, uv = [0, 0, 1, 1], color = 0xffffff) {
    const bk = this.bucket(mat, (a[0] + c[0]) / 2, (a[2] + c[2]) / 2), col = this._col.set(color);
    const ux = bb[0] - a[0], uy = bb[1] - a[1], uz = bb[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const base = bk.n;
    const pts = [a, bb, c, d], uvs = [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]];
    for (let i = 0; i < 4; i++) { bk.pos.push(pts[i][0], pts[i][1], pts[i][2]); bk.nor.push(nx, ny, nz); bk.uv.push(uvs[i][0], uvs[i][1]); bk.col.push(col.r, col.g, col.b); }
    bk.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    bk.n += 4;
  }

  /**
   * Axis-aligned (optionally yaw-rotated) box. opts: { color, rotY, top:false, bottom:false, noShadow,
   * ku, kv: texture repeats per metre on the side faces, uv0: [u,v] start offset, roofMat: material for the top face }.
   */
  box(mat, cx, cy, cz, w, h, d, opts = {}) {
    const rot = opts.rotY || 0, cs = Math.cos(rot), sn = Math.sin(rot);
    const P = (lx, ly, lz) => [cx + lx * cs + lz * sn, cy + ly, cz - lx * sn + lz * cs];
    const hw = w / 2, hh = h / 2, hd = d / 2, ku = opts.ku ?? 1, kv = opts.kv ?? 1, col = opts.color ?? 0xffffff;
    const [u0, v0] = opts.uv0 || [0, 0];
    const y0 = opts.vy0 ?? 0;                       // texture v origin (so a stacked tier keeps its floors aligned)
    const vA = v0 + y0 * kv, vB = vA + h * kv;
    // sides: +z, -z, +x, -x (viewed from outside)
    this.quad(mat, P(-hw, -hh, hd), P(hw, -hh, hd), P(hw, hh, hd), P(-hw, hh, hd), [u0, vA, u0 + w * ku, vB], col);
    this.quad(mat, P(hw, -hh, -hd), P(-hw, -hh, -hd), P(-hw, hh, -hd), P(hw, hh, -hd), [u0, vA, u0 + w * ku, vB], col);
    this.quad(mat, P(hw, -hh, hd), P(hw, -hh, -hd), P(hw, hh, -hd), P(hw, hh, hd), [u0, vA, u0 + d * ku, vB], col);
    this.quad(mat, P(-hw, -hh, -hd), P(-hw, -hh, hd), P(-hw, hh, hd), P(-hw, hh, -hd), [u0, vA, u0 + d * ku, vB], col);
    if (opts.top !== false) this.quad(opts.roofMat || mat, P(-hw, hh, hd), P(hw, hh, hd), P(hw, hh, -hd), P(-hw, hh, -hd), opts.roofMat ? [0, 0, w * 0.25, d * 0.25] : [u0, 0, u0 + w * ku, d * kv], opts.roofColor ?? col);
    if (opts.bottom) this.quad(mat, P(-hw, -hh, -hd), P(hw, -hh, -hd), P(hw, -hh, hd), P(-hw, -hh, hd), [0, 0, 1, 1], col);
  }

  /** Four-sided hip / pyramid roof with overhang, optional upturned eave tips (pagoda). */
  hipRoof(mat, cx, y, cz, w, d, h, over = 0.8, opts = {}) {
    const hw = w / 2 + over, hd = d / 2 + over, tw = (w / 2) * (opts.ridge ?? 0.0), td = (d / 2) * (opts.ridge ?? 0.0), lift = opts.tip ?? 0;
    const y1 = y + h, col = opts.color ?? 0xffffff;
    const c = [[cx - hw, y + lift, cz + hd], [cx + hw, y + lift, cz + hd], [cx + hw, y + lift, cz - hd], [cx - hw, y + lift, cz - hd]];
    const t = [[cx - tw, y1, cz + td], [cx + tw, y1, cz + td], [cx + tw, y1, cz - td], [cx - tw, y1, cz - td]];
    const rep = [hw * 0.6, h * 0.9];
    // front (+z), right (+x), back (-z), left (-x)
    this.quad(mat, c[0], c[1], t[1], t[0], [0, 0, rep[0], rep[1]], col);
    this.quad(mat, c[1], c[2], t[2], t[1], [0, 0, rep[0], rep[1]], col);
    this.quad(mat, c[2], c[3], t[3], t[2], [0, 0, rep[0], rep[1]], col);
    this.quad(mat, c[3], c[0], t[0], t[3], [0, 0, rep[0], rep[1]], col);
    // underside so the eaves are not see-through
    this.quad(mat, c[3], c[2], c[1], c[0], [0, 0, 1, 1], opts.underColor ?? 0x3a2a22);
  }

  /** Build the merged meshes. */
  build(scene) {
    const T = this.T, out = [];
    for (const b of this.buckets.values()) {
      if (!b.n) continue;
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new T.Float32BufferAttribute(b.col, 3));
      g.setIndex(b.n > 65535 ? new T.Uint32BufferAttribute(b.idx, 1) : new T.Uint16BufferAttribute(b.idx, 1));
      g.computeBoundingSphere();
      const m = new T.Mesh(g, b.mat);
      m.castShadow = b.shadow && !b.mat.transparent && !(b.mat.isMeshBasicMaterial); m.receiveShadow = true;
      scene.add(m); out.push(m);
    }
    this.buckets.clear();
    return out;
  }
}
