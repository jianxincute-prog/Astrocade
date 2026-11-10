// Keyboard + touch input. Output: steer (-1 left .. +1 right), push (0..1), brake (0..1).
import { clamp } from './util.js';

export function createInput(root, canvas, { touch }) {
  const keys = new Set();
  let joy = { x: 0, y: 0 }, btnPush = false, btnBrake = false, lookDx = 0, respawnReq = false, spinReq = false;

  const onKeyDown = (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === 'r' && !e.repeat) respawnReq = true;
    if (k === 'e' && !e.repeat) spinReq = true;
    keys.add(k);
  };
  const onKeyUp = (e) => keys.delete(e.key.toLowerCase());
  const onBlur = () => keys.clear();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  // Camera drag (mouse or finger on the 3D view).
  let dragId = null, lastX = 0;
  const onDown = (e) => { if (dragId === null) { dragId = e.pointerId; lastX = e.clientX; } };
  const onMove = (e) => { if (e.pointerId === dragId) { lookDx += (e.clientX - lastX) * 0.006; lastX = e.clientX; } };
  const onUp = (e) => { if (e.pointerId === dragId) dragId = null; };
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  let ui = null;
  if (touch) {
    ui = document.createElement('div');
    ui.id = 'touch';
    ui.innerHTML =
      '<div id="joyZone"><div id="joyBase"><div id="joyKnob"></div></div></div>' +
      '<div id="btnSpin" class="btn" style="display:none">SPIN</div><div id="btnBrake" class="btn">BRAKE</div><div id="btnPush" class="btn big">PUSH</div>';
    root.appendChild(ui);
    const zone = ui.querySelector('#joyZone'), base = ui.querySelector('#joyBase'), knob = ui.querySelector('#joyKnob');
    let joyId = null;
    const setJoy = (e) => {
      const r = base.getBoundingClientRect();
      const sx = r.width / base.offsetWidth || 1;
      const R = (base.offsetWidth / 2) * sx;
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy), m = Math.min(len, R);
      if (len > 0) { dx = (dx / len) * m; dy = (dy / len) * m; }
      joy = { x: dx / R, y: -dy / R };
      knob.style.transform = 'translate(' + (dx / sx) + 'px,' + (dy / sx) + 'px)';
    };
    zone.addEventListener('pointerdown', (e) => { if (joyId === null) { joyId = e.pointerId; zone.setPointerCapture(e.pointerId); setJoy(e); } });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) setJoy(e); });
    const endJoy = (e) => { if (e.pointerId === joyId) { joyId = null; joy = { x: 0, y: 0 }; knob.style.transform = 'translate(0,0)'; } };
    zone.addEventListener('pointerup', endJoy); zone.addEventListener('pointercancel', endJoy);
    const hold = (el, set) => {
      el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); set(true); el.classList.add('on'); });
      const off = () => { set(false); el.classList.remove('on'); };
      el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
    };
    hold(ui.querySelector('#btnPush'), (v) => { btnPush = v; });
    hold(ui.querySelector('#btnBrake'), (v) => { btnBrake = v; });
    ui.querySelector('#btnSpin').addEventListener('pointerdown', (e) => { e.preventDefault(); spinReq = true; });
  }

  function read() {
    const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    let jx = Math.abs(joy.x) < 0.12 ? 0 : Math.sign(joy.x) * (Math.abs(joy.x) - 0.12) / 0.88;
    const steer = clamp(kx + jx, -1, 1);
    const jPush = joy.y > 0.35 ? clamp((joy.y - 0.35) / 0.4, 0, 1) : 0;
    const jBrake = joy.y < -0.35 ? clamp((-joy.y - 0.35) / 0.4, 0, 1) : 0;
    const push = Math.max(keys.has('w') || keys.has('arrowup') ? 1 : 0, btnPush ? 1 : 0, jPush);
    const brake = Math.max(keys.has('s') || keys.has('arrowdown') || keys.has(' ') ? 1 : 0, btnBrake ? 1 : 0, jBrake);
    return { steer, push, brake };
  }
  function consumeLook() { const d = lookDx; lookDx = 0; return d; }
  function consumeRespawn() { const r = respawnReq; respawnReq = false; return r; }
  function requestRespawn() { respawnReq = true; }
  function consumeSpin() { const r = spinReq; spinReq = false; return r; }
  function setSpinVisible(v) { const b = ui && ui.querySelector('#btnSpin'); if (b) b.style.display = v ? 'flex' : 'none'; }
  function destroy() {
    window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
    if (ui) ui.remove();
  }
  return { read, consumeLook, consumeRespawn, requestRespawn, consumeSpin, setSpinVisible, destroy };
}
