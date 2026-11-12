// 3D loading screen: Baldy and a line of penguins sliding down a mountain slope while the level is built.
import { buildPenguin, animatePenguin, buildMan, animateMan } from './character.js';

const SKY = 0xa9dcf7, SPEED = 26, TILT = 0.42;
const TIPS = ['Glittering snow hides a trap', 'Cracked ice breaks, so keep moving', 'Blue lights mark lost penguins', 'Jump over ice spikes', 'Fish buy new sleds in the shop', 'A spare heart hides in every level', 'Fish add time to the clock'];
const CSS = `
#ld-canvas{position:fixed;inset:0;width:100%;height:100%;z-index:20;display:block;transition:opacity .45s}
#ld-ui{position:fixed;inset:0;z-index:21;pointer-events:none;font-family:"Trebuchet MS",system-ui,sans-serif;text-align:center;transition:opacity .45s;overflow:hidden}
#ld-ui.out,#ld-canvas.out{opacity:0}
.ld-title{position:absolute;left:0;right:0;top:96px;font-size:88px;line-height:.95;font-weight:900;color:#fff;text-shadow:0 7px 0 #2a6fb0,0 14px 0 rgba(36,64,92,.35);letter-spacing:1px}
.ld-title b{display:block;font-size:60px;color:#ffe14a;text-shadow:0 6px 0 #c97a12,0 12px 0 rgba(36,64,92,.35)}
.ld-bottom{position:absolute;left:0;right:0;bottom:120px}
.ld-tip{display:inline-block;font-size:30px;font-weight:900;color:#fff;background:rgba(42,111,176,.92);border-radius:30px;padding:10px 28px;margin-bottom:64px;box-shadow:0 5px 0 rgba(36,64,92,.25)}
.ld-bar{position:relative;width:520px;height:34px;margin:0 auto;border-radius:20px;background:rgba(255,255,255,.55);box-shadow:0 5px 0 rgba(36,64,92,.25)}
.ld-fill{position:absolute;left:5px;top:5px;bottom:5px;width:0;border-radius:14px;background:linear-gradient(90deg,#ffb23c,#ff8a3c)}
.ld-rider{position:absolute;top:-56px;left:0;font-size:60px;line-height:1;transform:translateX(-50%) scaleX(-1)}
`;

function tree(parent, x, z, s) {
  const g = new THREE.Group();
  const green = new THREE.MeshLambertMaterial({ color: 0x2f7d5b }), white = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.6, 7), new THREE.MeshLambertMaterial({ color: 0x7a5236 })); trunk.position.y = 0.7; g.add(trunk);
  [[2.2, 2.6, 2.2], [1.7, 2.3, 3.7], [1.15, 2.0, 5.1]].forEach(([r, h, y]) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), green); c.position.y = y; g.add(c);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.72, h * 0.6, 9), white); cap.position.y = y + h * 0.24; g.add(cap);
  });
  g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.x = -TILT;      // trees stand upright on the tilted slope
  parent.add(g); return g;
}

/**
 * Show the loading screen.
 * onMid runs once the slide is under way (do the heavy building there); onDone runs as it starts to fade.
 */
export function showLoading({ title = true, label = '', sub = '', sled = 'classic', jacket = '#e8452c', duration = 2.6, onMid, onDone } = {}) {
  document.getElementById('ld-css')?.remove();
  const style = document.createElement('style'); style.id = 'ld-css'; style.textContent = CSS; document.head.appendChild(style);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement; canvas.id = 'ld-canvas'; document.body.appendChild(canvas);
  const ui = document.createElement('div'); ui.id = 'ld-ui';
  ui.innerHTML = `<div class="ld-title"></div><div class="ld-bottom"><div class="ld-tip"></div><div class="ld-bar"><div class="ld-fill"></div><div class="ld-rider">🐧</div></div></div>`;
  const head = ui.querySelector('.ld-title');
  if (title) head.innerHTML = "BALDY'S<b>PENGUIN RESCUE</b>";
  else { head.textContent = label; const b = document.createElement('b'); b.textContent = sub; head.appendChild(b); }
  ui.querySelector('.ld-tip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  document.body.appendChild(ui);
  const fill = ui.querySelector('.ld-fill'), rider = ui.querySelector('.ld-rider');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY); scene.fog = new THREE.Fog(SKY, 70, 210);
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x9db7d6, 1.15));
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.5); sun.position.set(20, 40, 30); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(58, 720 / 1280, 0.3, 300);
  const resize = () => { const w = window.innerWidth || 720, h = window.innerHeight || 1280; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize(); window.addEventListener('resize', resize);

  // everything on the slope lives in one tilted group: +Z is downhill
  const slope = new THREE.Group(); slope.rotation.x = TILT; scene.add(slope);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 260, 1, 1), new THREE.MeshBasicMaterial({ color: 0xf6fbff }));
  ground.rotation.x = -Math.PI / 2; ground.position.z = -40; slope.add(ground);
  // mountain peaks at the top of the run
  const rockM = new THREE.MeshLambertMaterial({ color: 0xaec3df, flatShading: true }), snowM = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  [[-34, 52, 30], [-8, 70, 36], [20, 58, 30], [44, 44, 26], [-58, 40, 26]].forEach(([x, h, w], i) => {
    const peak = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.ConeGeometry(w, h, 7), rockM); rock.position.y = h / 2 - 4; peak.add(rock);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.5, h * 0.5, 7), snowM); cap.position.y = h * 0.76 - 4; peak.add(cap);
    peak.position.set(x, 0, -100 - (i % 2) * 14); peak.rotation.x = -TILT; peak.rotation.y = i; slope.add(peak);
  });
  // scenery that scrolls uphill past the sliders
  const LOOP = 150, scenery = [];
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1, x = side * (7 + Math.random() * 26), z = -110 + Math.random() * LOOP;
    scenery.push(tree(slope, x, z, 0.8 + Math.random() * 0.9));
  }
  const moundM = new THREE.MeshLambertMaterial({ color: 0xdcecfb });
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), moundM);
    m.position.set((Math.random() - 0.5) * 30, 0, -110 + Math.random() * LOOP); m.scale.set(1.2 + Math.random() * 2, 0.18 + Math.random() * 0.2, 1.4 + Math.random() * 2.4);
    slope.add(m); scenery.push(m);
  }
  const trackM = new THREE.MeshBasicMaterial({ color: 0xcfe1f3, transparent: true, opacity: 0.8 });
  [-0.3, 0.3].forEach(x => { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 120), trackM); t.rotation.x = -Math.PI / 2; t.position.set(x, 0.02, -52); slope.add(t); });

  // the sliders: Baldy on his sled out in front, penguins behind on their bellies
  const man = buildMan(jacket, sled); slope.add(man.root);
  const riders = [];
  for (let i = 0; i < 6; i++) {
    const p = buildPenguin(i + 1, 1.45); slope.add(p.root);
    riders.push({ p, baseX: (i % 2 ? 1 : -1) * (1.5 + (i % 3) * 1.1), z: -2.6 - i * 2.1, phase: i * 1.3 });
  }
  // snow spray
  const N = 150, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N);
  const sprayGeo = new THREE.BufferGeometry(); sprayGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 32;
  const dc = dot.getContext('2d'), gr = dc.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); dc.fillStyle = gr; dc.fillRect(0, 0, 32, 32);
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dot), size: 0.7, transparent: true, depthWrite: false }));
  spray.frustumCulled = false; slope.add(spray);
  let next = 0;
  const puff = (x, y, z) => {
    const i = next = (next + 1) % N;
    pos[i * 3] = x + (Math.random() - 0.5) * 0.6; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    vel[i * 3] = (Math.random() - 0.5) * 3; vel[i * 3 + 1] = 1.5 + Math.random() * 2.5; vel[i * 3 + 2] = -SPEED * (0.35 + Math.random() * 0.3); life[i] = 0.8;
  };
  for (let i = 0; i < N; i++) pos[i * 3 + 1] = -50;

  let t = 0, last = performance.now(), raf = 0, done = false, midDone = false, ended = false, puffT = 0;
  function frame(now) {
    if (ended) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    scenery.forEach(o => { o.position.z -= SPEED * dt; if (o.position.z < -110) o.position.z += LOOP; });
    // Baldy weaves and the line follows his curve a moment later
    const weave = s => Math.sin(s * 1.1) * 2.2 + Math.sin(s * 2.3) * 0.6;
    const mx = weave(t);
    man.root.position.set(mx, Math.max(0, Math.sin(t * 2.2)) ** 8 * 1.1, 2.5); man.root.rotation.y = (weave(t + 0.05) - mx) * 6;
    animateMan(man, dt, { sled: true, speed: 12, grounded: true });
    riders.forEach(r => {
      const s = t + r.z * 0.045, x = weave(s) * 0.8 + r.baseX, hop = Math.max(0, Math.sin(t * 2.2 + r.z * 0.25 + r.phase)) ** 10 * 1.3;
      r.p.root.position.set(x, hop, r.z); r.p.root.rotation.y = (weave(s + 0.05) - weave(s)) * 5; r.p.root.rotation.z = Math.sin(t * 5 + r.phase) * 0.08; r.p.root.rotation.x = -0.55;      // chins up so their faces show
      animatePenguin(r.p, dt, 'slide');
    });
    puffT -= dt;
    if (puffT <= 0) { puffT = 0.03; const r = riders[Math.floor(Math.random() * riders.length)]; if (r.p.root.position.y < 0.2) puff(r.p.root.position.x, 0.2, r.z - 0.6); puff(man.root.position.x, 0.2, 1.6); }
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt; vel[i * 3 + 1] -= 6 * dt;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (life[i] <= 0) pos[i * 3 + 1] = -50;
    }
    sprayGeo.attributes.position.needsUpdate = true;
    camera.position.set(4.6 + Math.sin(t * 0.5) * 1.0, 1.3 + Math.sin(t * 0.7) * 0.25, 11.5);
    camera.lookAt(mx * 0.3, 1.9, -6);
    renderer.render(scene, camera);
    // progress
    const k = Math.min(1, t / duration), eased = 1 - (1 - k) ** 2, w = 5 + eased * 510;
    fill.style.width = `${Math.max(0, w - 5)}px`; rider.style.left = `${w}px`;
    if (!midDone && t > duration * 0.4) { midDone = true; try { onMid?.(); } catch (e) { console.error(e); } last = performance.now(); }
    if (!done && k >= 1) { done = true; try { onDone?.(); } catch (e) { console.error(e); } canvas.classList.add('out'); ui.classList.add('out'); setTimeout(dispose, 480); }
  }
  function dispose() {
    if (ended) return;
    ended = true; cancelAnimationFrame(raf); window.removeEventListener('resize', resize);
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove(); ui.remove(); style.remove();
  }
  raf = requestAnimationFrame(frame);
  return { dispose };
}
