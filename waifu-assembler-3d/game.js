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
    // Same logo and progress bar as the 3D loading screen that takes over once Babylon.js is ready.
    splash.innerHTML = '<div class="wl-logo"><small>ATELIER K—07 · RESTORATION</small><h1>Waifu <em>Assembler</em></h1><p>Twelve statues · one gallery</p></div><div class="wl-spark">✦</div><div class="wl-foot"><div class="wl-bar"><i></i></div><b>WARMING UP THE 3D ENGINE</b></div>';
    splash.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:92px 56px 96px;box-sizing:border-box;background:radial-gradient(ellipse at 50% 46%,#6b5138,#3a2a1c 58%,#21170f);color:#fff6e6;text-align:center;';
    const spin = document.createElement('style');
    spin.textContent = '#waifu-loading .wl-logo small{display:block;color:#f2d49c;font:800 13px system-ui;letter-spacing:4px}#waifu-loading h1{margin:14px 0 8px;font:600 66px/0.98 Georgia,serif;color:#fff8ec}#waifu-loading h1 em{display:block;color:#f3c978}#waifu-loading p{margin:0;color:#f8e8cf;font:italic 500 19px Georgia,serif}#waifu-loading .wl-spark{width:84px;height:84px;display:grid;place-items:center;border:1px solid rgba(243,201,120,.6);border-radius:26px;color:#f3c978;font-size:40px;animation:waifu-bob 1.4s ease-in-out infinite alternate;box-shadow:0 0 40px rgba(243,201,120,.25)}#waifu-loading .wl-foot{width:100%}#waifu-loading .wl-bar{height:8px;border-radius:8px;background:rgba(255,240,214,.24);overflow:hidden}#waifu-loading .wl-bar i{display:block;height:100%;width:30%;border-radius:8px;background:linear-gradient(90deg,#d79b45,#f6d38b);animation:waifu-slide 1.6s ease-in-out infinite}#waifu-loading .wl-foot b{display:block;margin-top:16px;font:700 14px system-ui;letter-spacing:2.5px;color:#fbeedb}@keyframes waifu-bob{to{transform:translateY(-8px) rotate(18deg)}}@keyframes waifu-slide{0%{transform:translateX(-100%)}100%{transform:translateX(340%)}}';
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
