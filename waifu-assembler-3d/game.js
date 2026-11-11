import { createGame } from './renderer.js';

// Load Babylon.js as a global CDN library so the production IIFE bundler never tries to bundle a remote ES module.
const BABYLON_URL = 'https://cdn.jsdelivr.net/npm/babylonjs@9.35.0/babylon.js';
let loader;
let runSerial = 0;
function ensureBabylon() {
  if (window.BABYLON) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = BABYLON_URL;
      script.async = true;
      script.onload = () => window.BABYLON ? resolve() : reject(new Error('Babylon.js did not initialize'));
      script.onerror = () => { loader = null; reject(new Error('Could not load the 3D renderer')); };
      document.head.appendChild(script);
    });
  }
  return loader;
}

function showLoading() {
  let splash = document.getElementById('waifu-loading');
  if (!splash) {
    splash = document.createElement('div');
    splash.id = 'waifu-loading';
    splash.innerHTML = '<div class="spinner">✦</div><b>Opening the restoration atelier…</b><small>ASSEMBLER / 3D</small>';
    splash.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;background:radial-gradient(ellipse at 50% 43%,#3a2c5c,#111426 72%);color:#eefaff;font:700 15px system-ui;text-align:center;';
    const spin = document.createElement('style');
    spin.textContent = '#waifu-loading .spinner{width:62px;height:62px;display:grid;place-items:center;border:1px solid #ff9ccf;border-radius:19px;color:#ffd0e8;font-size:31px;animation:waifu-bob 1.2s ease-in-out infinite alternate;box-shadow:0 0 28px #ff8cc644}#waifu-loading small{font:800 9px system-ui;letter-spacing:2px;color:#b9a6d6}@keyframes waifu-bob{to{transform:translateY(-6px) rotate(18deg)}}';
    document.head.appendChild(spin);
    document.body.appendChild(splash);
  }
  return splash;
}

function run(mode) {
  const serial = ++runSerial;
  if (window.__waifuAssemblerCleanup) window.__waifuAssemblerCleanup();
  window.__waifuAssemblerCleanup = null;
  const splash = showLoading();
  ensureBabylon().then(() => {
    if (serial !== runSerial) return;
    splash.remove();
    window.__waifuAssemblerCleanup = createGame(mode);
  }).catch((error) => {
    if (serial !== runSerial) return;
    splash.innerHTML = `<b>3D atelier is taking a breather</b><small>${String(error.message || error)}</small>`;
    try { window.lib?.log?.(`Renderer load failed: ${error.message}`); } catch { /* optional */ }
  });
}

window.run = run;
