// Sprite particles for the 3D scene: stars, dots, rings, bursts, hearts, puffs, comic text, glows.
const THREE = window.THREE;
const cache = {};
function tex(name, draw, w = 128, h = 128) {
  if (cache[name]) return cache[name];
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  return (cache[name] = new THREE.CanvasTexture(c));
}
function star(x, cx, cy, r, n, inner) { x.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rad = i % 2 ? r * inner : r; x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } x.closePath(); }
const TEX = {
  star: () => tex('star', (x, w) => { star(x, w / 2, w / 2 + 4, 56, 5, 0.46); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 8; x.strokeStyle = 'rgba(40,10,80,0.9)'; x.stroke(); }),
  dot: () => tex('dot', (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 2); g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }),
  glow: () => tex('glow', (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }),
  ring: () => tex('ring', (x, w) => { x.lineWidth = 10; x.strokeStyle = '#fff'; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 8, 0, 7); x.stroke(); }),
  burst: () => tex('burst', (x, w) => { x.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 36 : 62, a = (i / 16) * 6.283; x[i ? 'lineTo' : 'moveTo'](w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r); } x.closePath(); x.fillStyle = '#ffe14d'; x.fill(); x.lineWidth = 7; x.strokeStyle = '#ff5d3d'; x.stroke(); }),
  heart: () => tex('heart', (x, w) => { x.beginPath(); x.moveTo(64, 104); x.bezierCurveTo(10, 66, 24, 18, 64, 44); x.bezierCurveTo(104, 18, 118, 66, 64, 104); x.closePath(); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 7; x.strokeStyle = 'rgba(120,20,60,0.9)'; x.stroke(); }),
  puff: () => tex('puff', (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 8, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }),
  shadow: () => tex('shadow', (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(20,8,50,0.55)'); g.addColorStop(1, 'rgba(20,8,50,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }),
};
export function shadowTexture() { return TEX.shadow(); }
export function glowTexture() { return TEX.glow(); }
function textTex(s) {
  return tex('t:' + s, (x, w, h) => { x.font = '900 84px "Arial Rounded MT Bold","Trebuchet MS",Verdana,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = 16; x.strokeStyle = '#2a114f'; x.strokeText(s, w / 2, h / 2); x.fillStyle = '#fff'; x.fillText(s, w / 2, h / 2); }, 384, 128);
}

export class FX {
  constructor(scene) {
    this.scene = scene; this.list = []; this.pool = [];
  }
  _sprite(map) {
    let sp = this.pool.pop();
    if (!sp) { sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: true })); }
    sp.material.map = map; sp.material.needsUpdate = true; this.scene.add(sp); return sp;
  }
  spawn(kind, x, y, z, o = {}) {
    const sp = this._sprite(TEX[kind]());
    const { vx = 0, vy = 0, vz = 0, g = 0, life = 0.6, size = 0.6, color = 0xffffff, spin = 0, drag = 0, grow = 0, add = false, depth = true } = o;
    sp.position.set(x, y, z); sp.material.color.setHex(color); sp.material.rotation = o.rot || 0; sp.material.opacity = 1;
    sp.material.blending = add ? THREE.AdditiveBlending : THREE.NormalBlending; sp.material.depthTest = depth; sp.renderOrder = depth ? 0 : 10;
    sp.scale.set(size, size, 1);
    this.list.push({ sp, vx, vy, vz, g, life, max: life, size, spin, drag, grow, kind });
    if (this.list.length > 320) this.kill(this.list.shift());
    return sp;
  }
  text(s, x, y, z, o = {}) {
    const sp = this._sprite(textTex(s));
    const size = o.size || 1.6;
    sp.position.set(x, y, z); sp.material.color.setHex(o.color || 0xffffff); sp.material.opacity = 1; sp.material.rotation = o.rot || 0; sp.material.depthTest = false; sp.renderOrder = 12; sp.material.blending = THREE.NormalBlending;
    sp.scale.set(size * 3, size, 1);
    this.list.push({ sp, vx: 0, vy: o.vy === undefined ? 1.2 : o.vy, vz: 0, g: 0, life: o.life || 0.8, max: o.life || 0.8, size, spin: 0, drag: 1.5, grow: 0, kind: 'text' });
  }
  kill(p) { this.scene.remove(p.sp); this.pool.push(p.sp); }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.life -= dt;
      if (p.life <= 0) { this.kill(p); this.list.splice(i, 1); continue; }
      const k = 1 - p.life / p.max, d = Math.exp(-p.drag * dt);
      p.vy += p.g * dt; p.vx *= d; p.vy *= (p.kind === 'text' ? 1 : d); p.vz *= d;
      p.sp.position.x += p.vx * dt; p.sp.position.y += p.vy * dt; p.sp.position.z += p.vz * dt;
      p.sp.material.rotation += p.spin * dt;
      p.sp.material.opacity = Math.min(1, p.life / (p.max * 0.45));
      if (p.kind === 'text') { const pop = k < 0.18 ? (k / 0.18) * 1.3 : 1.3 - Math.min(0.3, (k - 0.18) * 0.5); p.sp.scale.set(p.size * 3 * pop, p.size * pop, 1); }
      else if (p.kind === 'ring') { const s = p.size * (0.2 + k * 1.1); p.sp.scale.set(s, s, 1); }
      else if (p.kind === 'burst') { const s = p.size * (0.5 + ease(k * 2.5) * 0.7); p.sp.scale.set(s, s, 1); }
      else if (p.kind === 'puff') { const s = p.size * (0.5 + k); p.sp.scale.set(s, s, 1); }
      else if (p.grow) { const s = p.size * (1 + p.grow * k); p.sp.scale.set(s, s, 1); }
    }
  }
  clear() { for (const p of this.list) this.kill(p); this.list.length = 0; }
}
function ease(k) { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); }
