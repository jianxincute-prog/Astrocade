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
    // Same look as the game's own 2D loading screen, which takes over once Babylon.js is ready.
    splash.innerHTML = '<div class="wl-mark">✦</div><div class="wl-title">Waifu <em>Assembler</em></div><div class="wl-foot"><div class="wl-bar"><i></i></div><b>LOADING THE 3D ENGINE</b></div>';
    splash.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:0 48px;box-sizing:border-box;background:radial-gradient(ellipse at 50% 42%,#4f3a29,#2a1e15 62%,#1b130d);color:#fff6e6;text-align:center;';
    const spin = document.createElement('style');
    spin.textContent = '#waifu-loading .wl-mark{width:64px;height:64px;display:grid;place-items:center;border-radius:20px;border:1px solid rgba(243,201,120,.55);color:#f3c978;font-size:30px;animation:waifu-spin 2.4s linear infinite}#waifu-loading .wl-title{font:600 40px/1.05 Georgia,serif;color:#fff8ec}#waifu-loading .wl-title em{color:#f3c978}#waifu-loading .wl-foot{width:min(100%,420px)}#waifu-loading .wl-bar{height:6px;border-radius:8px;background:rgba(255,240,214,.24);overflow:hidden}#waifu-loading .wl-bar i{display:block;height:100%;width:30%;border-radius:8px;background:linear-gradient(90deg,#d79b45,#f6d38b);animation:waifu-slide 1.4s ease-in-out infinite}#waifu-loading .wl-foot b{display:block;margin-top:12px;text-align:left;font:700 11px system-ui;letter-spacing:2px;color:#d9c6a6}@keyframes waifu-spin{to{transform:rotate(360deg)}}@keyframes waifu-slide{0%{transform:translateX(-100%)}100%{transform:translateX(340%)}}';
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
