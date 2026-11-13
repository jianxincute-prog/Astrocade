// Urban Enforcer — entry point. See src/main.js for the game shell, src/logic for pure rules.
import { Game } from './src/main.js';
import { loadFighterModel } from './src/render/skinned.js';

let game = null;
let modelPromise = null;
let runToken = 0;

function loadingScreen(show) {
  let el = document.getElementById('loading');
  if (show && !el) {
    el = document.createElement('div');
    el.id = 'loading';
    el.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#111;color:#ffcf3a;font:900 40px Arial Black,Impact,sans-serif;z-index:10';
    el.textContent = 'LOADING CITY...';
    document.body.appendChild(el);
  }
  if (!show && el) el.remove();
}

function getModel() {
  if (modelPromise) return modelPromise;
  const T = window.THREE;
  const a = window.lib && window.lib.getAsset ? window.lib.getAsset('model_fighter') : null;
  if (!a) return Promise.resolve(null);
  modelPromise = new Promise((resolve) => {
    // loader scripts may still be arriving; wait briefly for them
    const t0 = Date.now();
    const tryLoad = () => {
      if (!(T.GLTFLoader && T.SkeletonUtils)) {
        if (Date.now() - t0 < 8000) return setTimeout(tryLoad, 50);
        return resolve(null);
      }
      loadFighterModel(T, a.url).then(resolve, (e) => {
        try { window.lib && window.lib.log && window.lib.log('model load failed: ' + e); } catch (_) { /* */ }
        resolve(null);
      });
    };
    tryLoad();
  }).then((m) => { if (!m) modelPromise = null; return m; });
  return modelPromise;
}

function run(mode) {
  const token = ++runToken;
  if (game) { try { game.dispose(); } catch (e) { /* ignore */ } game = null; }
  const start = () => {
    loadingScreen(true);
    getModel().then((model) => {
      if (token !== runToken) return;
      loadingScreen(false);
      try { game = new Game(mode || window.mode || 'play', model); }
      catch (e) {
        // never leave the player with a blank screen: fall back to the procedural fighters
        try { window.lib && window.lib.log && window.lib.log('skinned init failed: ' + (e && e.stack || e)); } catch (_) { /* */ }
        document.querySelectorAll('#game > canvas, #ui').forEach((n) => n.remove());
        game = new Game(mode || window.mode || 'play', null);
      }
    });
  };
  if (window.THREE) start();
  else {
    // three.js is loaded by a classic <script> in index.html; wait if it is still arriving
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (window.THREE || Date.now() - t0 > 15000) { clearInterval(iv); if (window.THREE) start(); }
    }, 50);
  }
}

// The platform boots the game by calling window.run(mode); publishing bundles
// game.js into an IIFE, so run must be assigned to window explicitly.
window.run = run;
