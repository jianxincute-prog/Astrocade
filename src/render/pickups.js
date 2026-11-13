// Floating item bubbles + the player's shield dome. Everything is procedural (no assets):
//  - bubble: fresnel soap-bubble shell around a small 3D icon (cross / shield / bolt), a ground ring and a light column
//  - shield dome: bigger blue shell with panel lines and one orbiting orb per remaining charge
import { ITEMS } from '../logic/items.js';

const BUBBLE_VS = `
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  vN = normalize(normalMatrix * normal); vV = -mv.xyz; vP = normal;
  gl_Position = projectionMatrix * mv;
}`;
const BUBBLE_FS = `
uniform vec3 uTint; uniform float uAlpha; uniform float uTime; uniform float uHit; uniform float uPanels;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
  vec3 n = normalize(vN), v = normalize(vV);
  float f = pow(1.0 - abs(dot(n, v)), 1.9);
  vec3 L = normalize(vec3(-0.45, 0.75, 0.5));
  float spec = pow(max(dot(reflect(-L, n), v), 0.0), 38.0);
  float spec2 = pow(max(dot(reflect(-normalize(vec3(0.5,-0.2,0.6)), n), v), 0.0), 60.0) * 0.5;
  vec3 col = mix(uTint * 0.8, vec3(1.0), f * 0.45) + spec + spec2;
  float a = 0.24 + f * 0.62 + spec * 0.6;
  if (uPanels > 0.5) {
    vec3 p = normalize(vP);
    vec2 g = vec2(atan(p.z, p.x) * 3.0 / 3.14159, p.y * 6.0 + uTime * 0.6);
    vec2 w = abs(fract(g) - 0.5);
    float line = 1.0 - smoothstep(0.0, 0.07, min(w.x * 0.55, w.y));
    a += line * 0.18 * (0.4 + f); col += line * 0.25 * uTint;
    a += (0.5 + 0.5 * sin(uTime * 3.0)) * 0.03;
  }
  col += uHit * vec3(0.9, 0.95, 1.0); a += uHit * 0.55;
  gl_FragColor = vec4(col, clamp(a, 0.0, 0.95) * uAlpha);
}`;
const BEAM_FS = `
uniform vec3 uTint; uniform float uAlpha; varying vec2 vUv;
void main(){ float a = pow(1.0 - vUv.y, 1.4) * 0.2 * uAlpha; gl_FragColor = vec4(uTint, a); }`;
const BEAM_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

export class ItemFX {
  constructor(T, scene) {
    this.T = T; this.scene = scene; this.map = new Map(); this.t = 0;
    this.shellGeo = new T.SphereGeometry(0.56, 28, 20);
    this.iconGeo = this.buildIcons();
    this.ringGeo = new T.RingGeometry(0.62, 0.8, 40);
    this.beamGeo = new T.CylinderGeometry(0.06, 0.26, 3.0, 16, 1, true);
    this.beamGeo.translate(0, 1.5, 0);
    this.mats = {};
    for (const id in ITEMS) {
      const col = ITEMS[id].color;
      this.mats[id] = {
        shell: this.shellMat(col),
        icon: new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.85, roughness: 0.3, metalness: 0.25 }),
        ring: new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide, toneMapped: false }),
        beam: new T.ShaderMaterial({ uniforms: { uTint: { value: new T.Color(col) }, uAlpha: { value: 1 } }, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }),
      };
    }
    this.buildShield();
  }

  shellMat(col) {
    const T = this.T;
    return new T.ShaderMaterial({
      uniforms: { uTint: { value: new T.Color(col) }, uAlpha: { value: 1 }, uTime: { value: 0 }, uHit: { value: 0 }, uPanels: { value: 0 } },
      vertexShader: BUBBLE_VS, fragmentShader: BUBBLE_FS, transparent: true, depthWrite: false,
    });
  }

  buildIcons() {
    const T = this.T, ex = (shape, depth, bevel) => {
      const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14 });
      g.center(); return g;
    };
    // medical cross
    const c = new T.Shape(), a = 0.085, b = 0.27, r = 0.04;
    c.moveTo(-a + r, -b); c.lineTo(a - r, -b); c.quadraticCurveTo(a, -b, a, -b + r); c.lineTo(a, -a); c.lineTo(b - r, -a); c.quadraticCurveTo(b, -a, b, -a + r);
    c.lineTo(b, a - r); c.quadraticCurveTo(b, a, b - r, a); c.lineTo(a, a); c.lineTo(a, b - r); c.quadraticCurveTo(a, b, a - r, b); c.lineTo(-a + r, b);
    c.quadraticCurveTo(-a, b, -a, b - r); c.lineTo(-a, a); c.lineTo(-b + r, a); c.quadraticCurveTo(-b, a, -b, a - r); c.lineTo(-b, -a + r);
    c.quadraticCurveTo(-b, -a, -b + r, -a); c.lineTo(-a, -a); c.lineTo(-a, -b + r); c.quadraticCurveTo(-a, -b, -a + r, -b);
    // shield
    const s = new T.Shape();
    s.moveTo(0, 0.3); s.bezierCurveTo(0.1, 0.25, 0.2, 0.23, 0.26, 0.24); s.bezierCurveTo(0.27, 0.05, 0.2, -0.18, 0, -0.32);
    s.bezierCurveTo(-0.2, -0.18, -0.27, 0.05, -0.26, 0.24); s.bezierCurveTo(-0.2, 0.23, -0.1, 0.25, 0, 0.3);
    // lightning bolt
    const l = new T.Shape();
    l.moveTo(0.06, 0.32); l.lineTo(-0.2, -0.04); l.lineTo(-0.03, -0.04); l.lineTo(-0.1, -0.32); l.lineTo(0.2, 0.06); l.lineTo(0.03, 0.06); l.lineTo(0.06, 0.32);
    return { heal: ex(c, 0.07, 0.03), shield: ex(s, 0.07, 0.03), speed: ex(l, 0.07, 0.025) };
  }

  /** Create / update / remove the visuals so they mirror pickups.list. */
  sync(list, dt) {
    const T = this.T; this.t += dt;
    const seen = new Set();
    for (const b of list) {
      seen.add(b.id);
      let v = this.map.get(b.id);
      if (!v) {
        const m = this.mats[b.type];
        const g = new T.Group();
        const shell = new T.Mesh(this.shellGeo, m.shell.clone());   // clone() copies the uniforms per bubble
        shell.renderOrder = 6;
        const icon = new T.Mesh(this.iconGeo[b.type], m.icon); icon.scale.setScalar(1.35);
        const body = new T.Group(); body.add(icon, shell);
        const ring = new T.Mesh(this.ringGeo, m.ring); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.renderOrder = 5;
        const beam = new T.Mesh(this.beamGeo, m.beam); beam.renderOrder = 4;
        g.add(beam, ring, body);
        this.scene.add(g);
        v = { g, body, icon, shell, ring, beam, seed: b.id * 1.7 };
        this.map.set(b.id, v);
      }
      const k = Math.min(1, b.age / 0.4), pop = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);   // ease-out-back
      const blink = b.life < 6 ? (Math.sin(b.life * 14) > -0.2 ? 1 : 0.25) : 1;
      v.g.position.set(b.x, 0, b.z);
      const bob = 1.55 + Math.sin(this.t * 2.2 + v.seed) * 0.16;
      v.body.position.y = bob;
      v.body.scale.setScalar(Math.max(0.01, pop) * (1 + Math.sin(this.t * 3.1 + v.seed) * 0.03));
      v.icon.rotation.set(-0.6, Math.sin(this.t * 1.7 + v.seed) * 0.6, 0);   // sways, always facing the camera enough to read
      v.shell.material.uniforms.uTime.value = this.t;
      v.shell.material.uniforms.uAlpha.value = blink;
      v.ring.scale.setScalar(1 + Math.sin(this.t * 3 + v.seed) * 0.08);
      v.ring.material = this.mats[b.type].ring;
      v.beam.visible = blink > 0.5;
    }
    for (const [id, v] of this.map) {
      if (seen.has(id)) continue;
      this.scene.remove(v.g); v.shell.material.dispose();
      this.map.delete(id);
    }
  }

  // ------------------------------------------------------------------ shield dome
  buildShield() {
    const T = this.T;
    this.shield = new T.Group();
    this.shieldMat = this.shellMat(0x4aa8ff); this.shieldMat.uniforms.uPanels.value = 1;
    this.dome = new T.Mesh(new T.SphereGeometry(1.45, 32, 22), this.shieldMat);
    this.dome.position.y = 1.2; this.dome.renderOrder = 7;
    this.orbs = [];
    const og = new T.SphereGeometry(0.1, 12, 10), om = new T.MeshBasicMaterial({ color: 0x9fd4ff, toneMapped: false });
    for (let i = 0; i < 2; i++) { const o = new T.Mesh(og, om); this.orbs.push(o); this.shield.add(o); }
    this.shield.add(this.dome);
    this.shield.visible = false; this.scene.add(this.shield);
    this.shieldAmt = 0; this.shieldHit = 0;
  }

  /** Per frame: follow the player and show one orbiting orb per remaining charge. */
  updateShield(dt, x, z, y, charges) {
    this.shieldAmt += ((charges > 0 ? 1 : 0) - this.shieldAmt) * Math.min(1, dt * 10);
    this.shieldHit = Math.max(0, this.shieldHit - dt * 3);
    this.shield.visible = this.shieldAmt > 0.02;
    if (!this.shield.visible) return;
    this.shield.position.set(x, y, z);
    this.dome.scale.setScalar(0.4 + 0.6 * this.shieldAmt + Math.sin(this.t * 4) * 0.015);
    const u = this.shieldMat.uniforms;
    u.uTime.value = this.t; u.uHit.value = this.shieldHit; u.uAlpha.value = this.shieldAmt * (charges === 1 ? 0.8 + 0.2 * Math.sin(this.t * 9) : 1);
    this.orbs.forEach((o, i) => {
      o.visible = i < charges;
      const a = this.t * 2.4 + i * Math.PI;
      o.position.set(Math.cos(a) * 1.6, 1.2 + Math.sin(this.t * 3 + i) * 0.15, Math.sin(a) * 1.6);
    });
  }

  flashShield() { this.shieldHit = 1; }

  clear() {
    for (const v of this.map.values()) { this.scene.remove(v.g); v.shell.material.dispose(); }
    this.map.clear();
  }

  dispose() {
    this.clear();
    this.scene.remove(this.shield);
    this.shieldMat.dispose();
    this.shellGeo.dispose(); this.ringGeo.dispose(); this.beamGeo.dispose();
    for (const k in this.iconGeo) this.iconGeo[k].dispose();
  }
}
