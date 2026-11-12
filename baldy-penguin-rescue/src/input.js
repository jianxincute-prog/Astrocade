// Touch + keyboard + mouse input. The lower-left touch zone is a floating thumbstick; the rest drags the camera.
export function createInput(root, buttons) {
  const state = { mx: 0, my: 0, jump: false, sled: false, lookX: 0, lookY: 0, lookIdle: 9, enabled: false };
  const keys = {};
  let stickId = null, stickOrigin = null, lookId = null, lookLast = null, kx = 0, ky = 0;
  const base = buttons.stickBase, knob = buttons.stickKnob, R = 90;
  const off = [];
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); off.push(() => el.removeEventListener(ev, fn, opt)); };
  const pt = e => { const r = root.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 720, y: (e.clientY - r.top) / r.height * 1280 }; };

  function setStick(dx, dy) {
    const d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
    dx *= k; dy *= k;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    const dead = 0.12, m = Math.min(1, Math.hypot(dx, dy) / R);
    if (m < dead) { state.mx = state.my = 0; return; }
    state.mx = dx / R; state.my = -dy / R;
  }
  on(root, 'pointerdown', e => {
    if (!state.enabled || e.target.closest('button')) return;
    const p = pt(e);
    if (stickId === null && p.x < 270 && p.y > 520) {
      stickId = e.pointerId; stickOrigin = p;
      // Keep the floating stick in its left-side lane so it never covers the SLED button.
      const left = Math.max(0, Math.min(110, p.x - 110));
      const top = Math.max(0, Math.min(1060, p.y - 110));
      base.style.transform = `translate(${left}px,${top}px)`; base.classList.add('live'); setStick(0, 0);
    } else if (lookId === null) { lookId = e.pointerId; lookLast = p; }
  });
  on(window, 'pointermove', e => {
    if (e.pointerId === stickId) { const p = pt(e); setStick(p.x - stickOrigin.x, p.y - stickOrigin.y); }
    else if (e.pointerId === lookId) {
      const p = pt(e); state.lookX += p.x - lookLast.x; state.lookY += p.y - lookLast.y; lookLast = p; state.lookIdle = 0;
    }
  });
  const end = e => {
    if (e.pointerId === stickId) { stickId = null; setStick(0, 0); base.classList.remove('live'); base.style.transform = ''; }
    if (e.pointerId === lookId) lookId = null;
  };
  on(window, 'pointerup', end); on(window, 'pointercancel', end);

  const hold = (el, key) => {
    on(el, 'pointerdown', e => { e.preventDefault(); state[key] = true; el.classList.add('down'); });
    const up = () => { if (key === 'sled') state.sled = false; el.classList.remove('down'); };
    on(el, 'pointerup', up); on(el, 'pointercancel', up); on(el, 'pointerleave', up);
  };
  hold(buttons.jump, 'jump'); hold(buttons.sled, 'sled');

  const keyMove = () => {
    kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    ky = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    if (stickId === null) { const d = Math.hypot(kx, ky) || 1; state.mx = kx / d; state.my = ky / d; }
  };
  on(window, 'keydown', e => {
    if (!state.enabled) return;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (e.code === 'Space' && !keys.Space) state.jump = true;
    keys[e.code] = true; keyMove();
    state.sledKey = !!(keys.ShiftLeft || keys.ShiftRight);
  });
  on(window, 'keyup', e => { keys[e.code] = false; keyMove(); state.sledKey = !!(keys.ShiftLeft || keys.ShiftRight); });
  on(root, 'contextmenu', e => e.preventDefault());

  state.reset = () => { state.mx = state.my = 0; state.jump = state.sled = state.sledKey = false; stickId = lookId = null; for (const k in keys) keys[k] = false; setStick(0, 0); base.classList.remove('live'); base.style.transform = ''; };
  state.dispose = () => off.forEach(fn => fn());
  return state;
}
