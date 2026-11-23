/*
 * RAGDOLL SUMMIT RUSH  -  HD-2D style 2.5D meme platformer (three.js)
 *
 * Concept: a pixel-art 2D character (billboard, built from ragdoll-style body parts) runs and jumps through a
 * 3D voxel world. Three random maps (picked by a gacha-style carousel): Green Slopes, Snowy Peak, Fire Mountain,
 * each with its own obstacles. Big falls and hits turn the hero into a floppy ragdoll, then he gets back up.
 * HD-2D look: nearest-filter sprites and voxel textures, CSS tilt-shift, fake bloom, swaying grass and trees.
 * UI languages: English (default), Indonesian, Arabic (RTL) - see the I18N table below.
 *
 * Files: game.js (all logic), index.html (skeleton + CSS), game_config.json (tunable numbers).
 */

/* ====================================================================================== */
/* i18n: every UI string lives here (en = default, id = Indonesian, ar = Arabic / RTL).   */
const LANGS = ['en', 'id', 'ar'];
let LANG = 'en';
const I18N = {
  en: {
    play: 'PLAY', continue: 'CONTINUE', tagline: 'The summit awaits!', checkpoint: 'CHECKPOINT!', paused: 'PAUSED', resume: 'RESUME',
    toCheckpoint: 'TO CHECKPOINT', menu: 'MENU', summit: 'SUMMIT!', height: 'Height', coins: 'Coins', falls: 'Falls', time: 'Time', score: 'SCORE',
    again: 'PLAY AGAIN', leaderboard: 'LEADERBOARD', close: 'CLOSE', lbEmpty: 'No scores yet - be the first!', lbUnavail: 'Leaderboard unavailable',
    help: 'HOW TO PLAY', h_run: 'Run (A/D or arrows)', h_jump: 'Jump (Space) - hold to jump higher', h_rock: 'Watch the warning marks!', h_flag: 'Flags are checkpoints', h_summit: 'Reach the summit!',
    ok: 'OK', randomMap: 'RANDOM MAP', go: 'GO!', spinAgain: 'SPIN AGAIN', aduh: 'OUCH!', wow: 'WHOA!', aaah: 'AAAAH!', ouch: 'OW!', hot: 'HOT!',
    map_a: 'Green Slopes', map_b: 'Snowy Peak', map_c: 'Fire Mountain', language: 'LANGUAGE',
    hintTouch: '◀ ▶  run   ⬆  jump', hintKey: 'A/D run · Space jump',
    loadEngine: 'Loading 3D engine...', loadSprites: 'Painting pixel sprites...', loadVoxel: 'Building voxel mountains...', loadClouds: 'Hanging clouds...', loadAlmost: 'Almost at the summit...',
    shop: 'SHOP', buy: 'BUY', equip: 'EQUIP', equipped: 'EQUIPPED', noCoins: 'Not enough coins!', unlocked: 'Unlocked!', coinsLabel: 'Coins',
    skin_classic: 'Classic Tee', skin_jersey: 'Red Jersey', skin_hoodie: 'Blue Hoodie', skin_sailor: 'Sailor Stripes', skin_hawaii: 'Island Shirt', skin_pajama: 'Cozy Pajamas', skin_camo: 'Jungle Camo', skin_gold: 'Gold Tracksuit',
    loadFail: 'Failed to load: ', noWebgl: 'WebGL is not available', threeFail: 'Could not load the 3D engine', loading: 'Preparing the mountain...',
  },
  id: {
    play: 'MAIN', continue: 'LANJUT', tagline: 'Puncak menantimu!', checkpoint: 'CHECKPOINT!', paused: 'JEDA', resume: 'LANJUT',
    toCheckpoint: 'KE CHECKPOINT', menu: 'MENU', summit: 'PUNCAK!', height: 'Tinggi', coins: 'Koin', falls: 'Jatuh', time: 'Waktu', score: 'SKOR',
    again: 'MAIN LAGI', leaderboard: 'PERINGKAT', close: 'TUTUP', lbEmpty: 'Belum ada skor - jadilah yang pertama!', lbUnavail: 'Peringkat belum tersedia',
    help: 'CARA MAIN', h_run: 'Lari (A/D atau panah)', h_jump: 'Lompat (spasi) - tahan = lebih tinggi', h_rock: 'Awas tanda peringatan!', h_flag: 'Bendera = checkpoint', h_summit: 'Sampai puncak!',
    ok: 'OK', randomMap: 'PETA ACAK', go: 'MAIN!', spinAgain: 'PUTAR LAGI', aduh: 'ADUH!', wow: 'WADUH!', aaah: 'AAAAH!', ouch: 'AUW!', hot: 'PANAS!',
    map_a: 'Lereng Hijau', map_b: 'Puncak Salju', map_c: 'Gunung Api', language: 'BAHASA',
    hintTouch: '◀ ▶  lari   ⬆  lompat', hintKey: 'A/D lari · Spasi lompat',
    loadEngine: 'Memuat mesin 3D...', loadSprites: 'Melukis sprite pixel...', loadVoxel: 'Membangun gunung voxel...', loadClouds: 'Memasang awan...', loadAlmost: 'Hampir sampai puncak...',
    shop: 'TOKO', buy: 'BELI', equip: 'PAKAI', equipped: 'DIPAKAI', noCoins: 'Koin tidak cukup!', unlocked: 'Terbuka!', coinsLabel: 'Koin',
    skin_classic: 'Kaos Klasik', skin_jersey: 'Jersey Merah', skin_hoodie: 'Hoodie Biru', skin_sailor: 'Kaos Pelaut', skin_hawaii: 'Kemeja Pantai', skin_pajama: 'Piyama Nyaman', skin_camo: 'Loreng Hutan', skin_gold: 'Training Emas',
    loadFail: 'Gagal memuat: ', noWebgl: 'WebGL tidak tersedia', threeFail: 'Tidak bisa memuat mesin 3D', loading: 'Menyiapkan gunung...',
  },
  ar: {
    play: 'العب', continue: 'متابعة', tagline: 'القمة في انتظارك!', checkpoint: 'نقطة حفظ!', paused: 'إيقاف مؤقت', resume: 'استمرار',
    toCheckpoint: 'إلى نقطة الحفظ', menu: 'القائمة', summit: 'القمة!', height: 'الارتفاع', coins: 'العملات', falls: 'السقطات', time: 'الوقت', score: 'النتيجة',
    again: 'العب مجددًا', leaderboard: 'المتصدرون', close: 'إغلاق', lbEmpty: 'لا توجد نتائج بعد - كن الأول!', lbUnavail: 'قائمة المتصدرين غير متاحة',
    help: 'طريقة اللعب', h_run: 'اركض (A/D أو الأسهم)', h_jump: 'اقفز (مسافة) - اضغط مطولًا للقفز أعلى', h_rock: 'احذر علامات التحذير!', h_flag: 'الأعلام نقاط حفظ', h_summit: 'اصعد إلى القمة!',
    ok: 'حسنًا', randomMap: 'خريطة عشوائية', go: 'انطلق!', spinAgain: 'أدِر مجددًا', aduh: 'آخ!', wow: 'واو!', aaah: 'آآآه!', ouch: 'آه!', hot: 'حار!',
    map_a: 'المنحدرات الخضراء', map_b: 'القمة الثلجية', map_c: 'جبل النار', language: 'اللغة',
    hintTouch: 'اركض ◀ ▶   اقفز ⬆', hintKey: 'A/D للركض · مسافة للقفز',
    loadEngine: 'جارٍ تحميل المحرك ثلاثي الأبعاد...', loadSprites: 'جارٍ رسم الشخصيات...', loadVoxel: 'جارٍ بناء الجبال...', loadClouds: 'جارٍ تعليق الغيوم...', loadAlmost: 'اقتربنا من القمة...',
    shop: 'المتجر', buy: 'شراء', equip: 'ارتداء', equipped: 'مرتدى', noCoins: 'العملات غير كافية!', unlocked: 'تم الفتح!', coinsLabel: 'العملات',
    skin_classic: 'تيشيرت كلاسيكي', skin_jersey: 'قميص رياضي أحمر', skin_hoodie: 'سترة زرقاء', skin_sailor: 'قميص البحّارة', skin_hawaii: 'قميص الجزيرة', skin_pajama: 'بيجامة مريحة', skin_camo: 'تمويه الغابة', skin_gold: 'بدلة رياضية ذهبية',
    loadFail: 'فشل التحميل: ', noWebgl: 'WebGL غير متاح', threeFail: 'تعذر تحميل المحرك ثلاثي الأبعاد', loading: 'جارٍ تجهيز الجبل...',
  },
};
const tr = (k) => (I18N[LANG] && I18N[LANG][k]) || I18N.en[k] || k;

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
let threeLoader = null;
let runSerial = 0;

function loadThree() {
  if (window.THREE) return Promise.resolve();
  if (!threeLoader) {
    threeLoader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = THREE_URL; s.async = true;
      s.onload = () => (window.THREE ? resolve() : reject(new Error('three.js failed to load')));
      s.onerror = () => { threeLoader = null; reject(new Error(tr('threeFail'))); };
      document.head.appendChild(s);
    });
  }
  return threeLoader;
}

function setLoad(p, tip) {
  const b = document.getElementById('lbar'); if (b) b.style.width = Math.round(p * 100) + '%';
  if (tip) { const t = document.getElementById('ltip'); if (t) t.textContent = tip; }
}

function run(mode) {
  const serial = ++runSerial;
  if (window.__bbCleanup) { try { window.__bbCleanup(); } catch (e) { /* ignore */ } }
  window.__bbCleanup = null;
  const ld = document.getElementById('loading'); if (ld) ld.classList.remove('off');
  setLoad(0.08, tr('loadEngine'));
  loadThree().then(() => {
    if (serial !== runSerial) return;
    setLoad(0.3, tr('loadSprites'));
    return new Promise((r) => setTimeout(r, 30)).then(() => {
      if (serial !== runSerial) return;
      window.__bbCleanup = boot(mode, serial);
    });
  }).catch((e) => {
    const t = document.getElementById('ltip'); if (t) t.textContent = tr('loadFail') + (e && e.message);
    try { window.lib && window.lib.log && window.lib.log('load fail ' + e); } catch (x) { /* ignore */ }
  });
}

/* ====================================================================================== */
function boot(mode, serial) {
  const THREE = window.THREE;
  const lib = window.lib || {};
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
  function C(path, def) {
    let o = window.gameConfig || {};
    for (const k of path.split('.')) { if (o == null) return def; o = o[k]; }
    return o == null ? def : o;
  }
  function rngMaker(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const cleanups = [];
  const listen = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); cleanups.push(() => el.removeEventListener(ev, fn, opt)); };

  /* ---------------------------------------------------------------- config / texts ---- */
  const T = (k) => tr(k);
  const CFG = {
    run: () => C('player.runSpeed', 6.5), jump: () => C('player.jumpSpeed', 13.5), grav: () => C('player.gravity', 32),
    air: () => C('player.airControl', 0.85), coyote: () => C('player.coyoteTime', 0.1), buf: () => C('player.jumpBuffer', 0.12),
    bigFall: () => C('ragdoll.bigFallHeight', 9), smallFall: () => C('ragdoll.staggerHeight', 4.5),
    rockEvery: () => C('hazards.rockInterval', 4.5), rockFall: () => C('hazards.rockFallSpeed', 16),
    crumble: () => C('hazards.crumbleDelay', 0.6), ts: () => C('visual.tiltShift', 4),
  };

  /* ---------------------------------------------------------------- pixel art helpers ---- */
  const mkC = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
  function ell(g, col, cx, cy, rx, ry, y0, y1) {
    g.fillStyle = col;
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.ceil(cy + ry - 1); y++) {
      if (y0 !== undefined && y < y0) continue; if (y1 !== undefined && y > y1) continue;
      const dy = (y + 0.5 - cy) / ry; if (Math.abs(dy) > 1) continue;
      const dx = Math.sqrt(1 - dy * dy) * rx;
      const x0 = Math.round(cx - dx), x1 = Math.round(cx + dx);
      g.fillRect(x0, y, Math.max(1, x1 - x0), 1);
    }
  }
  function tex(canvas, repeat) {
    const t = new THREE.CanvasTexture(canvas);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    if (repeat) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; }
    return t;
  }
  const OL = '#1d1626', SK = '#f0b48c', SKS = '#d58f69', SKL = '#fad2ae', HR = '#17151d', HRH = '#3b4260', NV = '#27325a';

  function drawHead(expr) {
    const c = mkC(40, 37), g = c.getContext('2d');
    const BR = '#8a4040';
    // ears
    ell(g, OL, 3.5, 23, 3.6, 5.2); ell(g, SK, 4, 23, 2.6, 4.2); ell(g, SKS, 4.6, 23, 1.1, 2.4);
    ell(g, OL, 36.5, 23, 3.6, 5.2); ell(g, SK, 36, 23, 2.6, 4.2); ell(g, SKS, 35.4, 23, 1.1, 2.4);
    // broad face with heavy jowls
    ell(g, OL, 20, 21.5, 17.6, 15.8); ell(g, SK, 20, 21.5, 16.6, 14.8);
    ell(g, SKS, 20, 21.5, 16.6, 14.8, 31, 35); ell(g, SK, 20, 20.5, 15, 13.6, 31, 35);
    R(g, SKS, 12, 34, 16, 1);
    ell(g, SKL, 13, 26, 3.2, 2.2); ell(g, SKL, 27, 26, 3.2, 2.2);
    ell(g, '#ea8f80', 10, 28, 2.6, 1.6); ell(g, '#ea8f80', 30, 28, 2.6, 1.6);
    // glossy black side-parted hair
    ell(g, HR, 20, 21.5, 17.2, 15.4, 6, 13);
    R(g, HR, 4, 13, 4, 9); R(g, HR, 32, 13, 4, 9);
    R(g, HR, 8, 14, 22, 1); R(g, HR, 9, 15, 6, 1); R(g, HR, 25, 15, 5, 1);
    R(g, HRH, 9, 8, 12, 1); R(g, HRH, 13, 10, 9, 1); R(g, HRH, 24, 9, 6, 1); R(g, HRH, 10, 12, 5, 1);
    R(g, '#0a090f', 14, 7, 1, 5);
    // nose (broad)
    R(g, SKS, 17, 25, 6, 5); R(g, SKL, 19, 24, 1, 4); R(g, OL, 17, 29, 2, 1); R(g, OL, 21, 29, 2, 1);
    R(g, SKS, 13, 27, 1, 4); R(g, SKS, 26, 27, 1, 4);
    if (expr === 'neutral') {
      R(g, '#fff', 11, 21, 6, 3); R(g, OL, 13, 21, 3, 3); R(g, '#fff', 14, 21, 1, 1);
      R(g, '#fff', 23, 21, 6, 3); R(g, OL, 25, 21, 3, 3); R(g, '#fff', 26, 21, 1, 1);
      R(g, SKS, 10, 20, 8, 1); R(g, SKS, 22, 20, 8, 1); R(g, SKS, 11, 25, 6, 1); R(g, SKS, 23, 25, 6, 1);
      for (let i = 0; i < 9; i++) { R(g, HR, 9 + i, 17 + (i >> 2), 1, 2); R(g, HR, 30 - i, 17 + (i >> 2), 1, 2); }
      R(g, BR, 15, 32, 10, 1); R(g, BR, 14, 33, 1, 1); R(g, BR, 25, 33, 1, 1); R(g, '#d98a7a', 17, 33, 6, 1);
    } else if (expr === 'effort') {
      R(g, OL, 11, 22, 6, 2); R(g, OL, 23, 22, 6, 2); R(g, '#fff', 12, 22, 1, 1); R(g, '#fff', 24, 22, 1, 1);
      for (let i = 0; i < 9; i++) { R(g, HR, 9 + i, 16 + (i >> 1), 1, 2); R(g, HR, 30 - i, 16 + (i >> 1), 1, 2); }
      R(g, OL, 14, 31, 12, 5); R(g, '#fff', 15, 32, 10, 3); R(g, OL, 15, 33, 10, 1);
    } else if (expr === 'hurt') {
      [[11, 19], [12, 20], [13, 21], [14, 22], [13, 23], [12, 24], [11, 25]].forEach(([x, y]) => R(g, OL, x, y, 2, 1));
      [[27, 19], [26, 20], [25, 21], [24, 22], [25, 23], [26, 24], [27, 25]].forEach(([x, y]) => R(g, OL, x, y, 2, 1));
      R(g, HR, 9, 16, 8, 1); R(g, HR, 23, 16, 8, 1); R(g, HR, 8, 17, 3, 1); R(g, HR, 29, 17, 3, 1);
      ell(g, OL, 20, 33, 5.5, 3.6); ell(g, '#e0556a', 20, 34.5, 3.6, 1.8); R(g, '#7fd0ff', 8, 24, 2, 5); R(g, '#7fd0ff', 30, 24, 2, 5);
    } else { // dizzy
      for (let i = 0; i < 5; i++) { R(g, OL, 11 + i, 20 + i, 1, 1); R(g, OL, 15 - i, 20 + i, 1, 1); R(g, OL, 24 + i, 20 + i, 1, 1); R(g, OL, 28 - i, 20 + i, 1, 1); }
      R(g, HR, 9, 17, 8, 1); R(g, HR, 23, 17, 8, 1);
      R(g, OL, 14, 32, 12, 1); R(g, '#e0556a', 18, 33, 4, 3); R(g, OL, 17, 36, 6, 1);
    }
    return c;
  }
  /* ---- clothing skins (fit the same torso / arm / leg sprite parts) ---- */
  const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mulHex = (h, k) => { const c = rgbOf(h).map((v) => Math.max(0, Math.min(255, Math.round(v * k)))); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); };
  function paintPx(g, w, h, fn) {
    const im = g.getImageData(0, 0, w, h), d = im.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (d[i + 3] === 0) continue;
      const hex = fn(x, y, d[i], d[i + 1], d[i + 2]); if (hex) { const c = rgbOf(hex); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
    }
    g.putImageData(im, 0, 0);
  }
  const SKINS = [
    { id: 'classic', price: 0, shirt: '#f3f4f8', sh: '#c9cfdd', hi: '#ffffff', fold: '#d5dae6', collar: '#e5e8f0', pants: '#27325a', pHi: '#3a4a78', pSh: '#1a2240', shoe: '#17151d', shoeHi: '#3a3a48', sole: '#b8bac5', pat: 'plain', sleeve: 'short', legs: 'long' },
    { id: 'jersey', price: 100, shirt: '#e23b3b', sh: '#a82828', hi: '#ff8a7a', fold: '#c43030', collar: '#ffffff', pants: '#1d1f2b', pHi: '#34384a', pSh: '#101118', shoe: '#f3f4f8', shoeHi: '#ffffff', sole: '#c9cfdd', pat: 'jersey', sleeve: 'short', legs: 'shorts', stripe: '#ffffff' },
    { id: 'hoodie', price: 150, shirt: '#3f6fd8', sh: '#2c4fa6', hi: '#7fa3f0', fold: '#3560c0', collar: '#2c4fa6', hood: true, pants: '#6b7282', pHi: '#8a92a2', pSh: '#4c5262', shoe: '#f3f4f8', shoeHi: '#ffffff', sole: '#9aa0b0', pat: 'hoodie', sleeve: 'long', legs: 'long' },
    { id: 'sailor', price: 200, shirt: '#f3f4f8', sh: '#c9cfdd', hi: '#ffffff', fold: '#d5dae6', collar: '#e23b3b', pants: '#f3f4f8', pHi: '#ffffff', pSh: '#c9cfdd', shoe: '#27325a', shoeHi: '#4a5a8a', sole: '#e5e8f0', pat: 'stripes', sleeve: 'short', legs: 'long', stripe: '#27325a' },
    { id: 'hawaii', price: 250, shirt: '#ffd34d', sh: '#d9a92a', hi: '#fff0a0', fold: '#e0b43a', collar: '#ffefb0', pants: '#c9a36a', pHi: '#dfbd86', pSh: '#9a7a46', shoe: '#8a5a2c', shoeHi: '#b57a3e', sole: '#e8d2a8', pat: 'flowers', sleeve: 'short', legs: 'shorts' },
    { id: 'pajama', price: 300, shirt: '#9fd3ff', sh: '#6fa8dc', hi: '#d4ecff', fold: '#86bde8', collar: '#d4ecff', pants: '#9fd3ff', pHi: '#c4e4ff', pSh: '#6fa8dc', shoe: '#ff9ec7', shoeHi: '#ffc4de', sole: '#e27aa5', pat: 'stars', sleeve: 'long', legs: 'long' },
    { id: 'camo', price: 400, shirt: '#6b8f4a', sh: '#4e6e34', hi: '#8fb36a', fold: '#4e6e34', collar: '#4e6e34', pants: '#5d7d40', pHi: '#7fa05c', pSh: '#3e5a2a', shoe: '#4a3a22', shoeHi: '#6a5636', sole: '#2a2012', pat: 'camo', sleeve: 'long', legs: 'long', c1: '#3f5a2a', c1s: '#30461f', c2: '#a3a06a', c2s: '#80804f' },
    { id: 'gold', price: 600, shirt: '#ffcf3f', sh: '#d9a21a', hi: '#fff0a0', fold: '#e0b020', collar: '#1d1f2b', pants: '#1d1f2b', pHi: '#34384a', pSh: '#101118', shoe: '#f3f4f8', shoeHi: '#ffffff', sole: '#ffcf3f', pat: 'track', sleeve: 'long', legs: 'long', stripe: '#1d1f2b', pStripe: '#ffcf3f' },
  ];
  const skinById = (id) => SKINS.find((k) => k.id === id) || SKINS[0];
  function shirtPat(K, x, y, lit) {
    if (K.pat === 'stripes') return (y % 6 < 2) ? (lit ? K.stripe : mulHex(K.stripe, 0.8)) : null;
    if (K.pat === 'camo') { const v = Math.sin(x * 0.55 + 1.3) + Math.sin(y * 0.7 + x * 0.2) + Math.sin((x + y) * 0.4); return v > 0.9 ? (lit ? K.c1 : K.c1s) : v < -0.7 ? (lit ? K.c2 : K.c2s) : null; }
    if (K.pat === 'track') return (x === 19 || x === 20 || x <= 4 || x >= 35) ? K.stripe : null;
    return null;
  }
  const BIGSEVEN = ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'];
  function torsoDeco(g, K) {
    const r = rngMaker(K.id.length * 31 + 5), inEll = (x, y) => { const dx = (x + 0.5 - 20) / 17, dy = (y + 0.5 - 15) / 12; return dx * dx + dy * dy < 1; };
    if (K.pat === 'jersey') { BIGSEVEN.forEach((row, ry) => { for (let rx = 0; rx < 5; rx++) if (row[rx] === '#') R(g, '#ffffff', 15 + rx * 2, 8 + ry * 2, 2, 2); }); R(g, '#ffffff', 3, 12, 2, 14); R(g, '#ffffff', 35, 12, 2, 14); }
    else if (K.pat === 'hoodie') { R(g, K.fold, 11, 21, 18, 1); R(g, K.sh, 11, 22, 1, 6); R(g, K.sh, 28, 22, 1, 6); R(g, K.sh, 12, 27, 16, 1); R(g, '#f3f4f8', 17, 5, 1, 8); R(g, '#f3f4f8', 22, 5, 1, 8); }
    else if (K.pat === 'flowers') { for (let i = 0, n = 0; i < 80 && n < 9; i++) { const x = 6 + Math.floor(r() * 28), y = 6 + Math.floor(r() * 21); if (!inEll(x, y)) continue; n++; const c = ['#ff5a8a', '#ffffff', '#ff7a3a'][n % 3]; R(g, c, x, y - 1, 1, 3); R(g, c, x - 1, y, 3, 1); R(g, '#ffe14d', x, y, 1, 1); } R(g, '#c78a10', 20, 6, 1, 21); }
    else if (K.pat === 'stars') { for (let i = 0, n = 0; i < 80 && n < 8; i++) { const x = 7 + Math.floor(r() * 26), y = 7 + Math.floor(r() * 18); if (!inEll(x, y)) continue; n++; R(g, '#ffffff', x, y - 1, 1, 3); R(g, '#ffffff', x - 1, y, 3, 1); } ell(g, '#fff4b0', 29, 12, 3, 3); ell(g, K.shirt, 30.5, 11.2, 2.6, 2.6); }
    else if (K.pat === 'track') { R(g, '#fff4d6', 20, 4, 1, 23); R(g, '#fff4d6', 19, 26, 3, 1); }
    else if (K.pat === 'stripes') { R(g, '#e23b3b', 16, 3, 8, 2); R(g, '#e23b3b', 18, 5, 4, 3); }
  }
  function drawTorso(K) {
    K = K || SKINS[0];
    const c = mkC(40, 34), g = c.getContext('2d');
    ell(g, OL, 20, 17.5, 19.5, 16.5); ell(g, K.sh, 20, 17.5, 18.5, 15.5); ell(g, K.shirt, 18, 16, 17, 14.5);
    const lit = (x, y) => { const dx = (x + 0.5 - 18) / 17, dy = (y + 0.5 - 16) / 14.5; return dx * dx + dy * dy <= 1; };
    if (K.pat !== 'plain') paintPx(g, 40, 34, (x, y, r, gg, b) => { if (y > 28 || (r === 29 && gg === 22 && b === 38)) return null; return shirtPat(K, x, y, lit(x, y)); });
    ell(g, OL, 20, 17.5, 19.5, 16.5, 29, 33); ell(g, K.pants, 20, 17.5, 18.5, 15.5, 29, 32); R(g, K.pHi, 8, 29, 4, 1);
    R(g, K.fold, 5, 28, 30, 1);
    if (K.pat === 'plain') { R(g, K.fold, 12, 19, 6, 1); R(g, K.fold, 22, 22, 7, 1); R(g, K.hi, 10, 8, 6, 2); }
    torsoDeco(g, K);
    if (K.hood) { ell(g, OL, 20, 3, 9.5, 4.2, 0, 6); ell(g, K.sh, 20, 3.4, 8.5, 3.4, 0, 6); ell(g, SK, 20, 4.2, 4.6, 1.8, 0, 6); }
    else { ell(g, OL, 20, 2.5, 7, 3.2, 0, 4); ell(g, SK, 20, 3, 5.5, 2.2, 0, 4); R(g, K.collar, 14, 1, 12, 1); }
    return c;
  }
  function drawArm(K) {
    K = K || SKINS[0];
    const c = mkC(14, 28), g = c.getContext('2d');
    ell(g, OL, 7, 14, 5.8, 10.5); ell(g, SK, 7, 14, 4.8, 9.5); ell(g, SKS, 9, 14, 1.5, 7);
    ell(g, OL, 7, 23, 6, 5); ell(g, SK, 7, 23, 5, 4); R(g, SKS, 4, 25, 6, 1); R(g, OL, 5, 22, 1, 3); R(g, OL, 8, 22, 1, 3);
    if (K.sleeve === 'long') { ell(g, OL, 7, 11, 6.5, 9, 0, 19); ell(g, K.shirt, 7, 11, 5.5, 8, 0, 18); ell(g, K.sh, 9.5, 11, 2.2, 7, 0, 18); R(g, K.sh, 2, 18, 10, 1); }
    else { ell(g, OL, 7, 6, 6.5, 6); ell(g, K.shirt, 7, 6, 5.5, 5); R(g, K.sh, 3, 10, 8, 1); }
    if (K.pat !== 'plain' && K.pat !== 'jersey' && K.pat !== 'hoodie' && K.pat !== 'flowers') {
      const A = rgbOf(K.shirt), B = rgbOf(K.sh), same = (r, gg, b, q) => r === q[0] && gg === q[1] && b === q[2];
      paintPx(g, 14, 28, (x, y, r, gg, b) => {
        const l = same(r, gg, b, A); if (!l && !same(r, gg, b, B)) return null;
        if (K.pat === 'stripes') return (y % 6 < 2) ? K.stripe : null;
        if (K.pat === 'camo') { const v = Math.sin(x * 0.9 + 1.3) + Math.sin(y * 0.8 + x * 0.3); return v > 0.7 ? (l ? K.c1 : K.c1s) : v < -0.9 ? (l ? K.c2 : K.c2s) : null; }
        if (K.pat === 'track') return (x === 3 || x === 4) ? K.stripe : null;
        if (K.pat === 'stars') return ((x === 5 && y === 6) || (x === 9 && y === 12) || (x === 6 && y === 15)) ? '#ffffff' : null;
        return null;
      });
    }
    if (K.pat === 'jersey') R(g, '#ffffff', 3, 9, 8, 1);
    return c;
  }
  function drawLeg(K) {
    K = K || SKINS[0];
    const c = mkC(16, 30), g = c.getContext('2d');
    if (K.legs === 'shorts') {
      R(g, OL, 3, 8, 10, 14); R(g, SK, 4, 8, 8, 13); R(g, SKS, 10, 8, 2, 13);
      ell(g, OL, 8, 7, 6.8, 7.4, 0, 13); ell(g, K.pants, 8, 7, 5.8, 6.4, 0, 12); R(g, K.pHi, 5, 3, 2, 8); R(g, K.pSh, 11, 4, 2, 8); R(g, K.pSh, 2, 13, 12, 1);
    } else {
      ell(g, OL, 8, 10, 6.5, 10); ell(g, K.pants, 8, 10, 5.5, 9); R(g, K.pHi, 5, 3, 2, 12); R(g, K.pSh, 11, 4, 2, 14);
    }
    ell(g, OL, 9, 24.5, 7, 5); ell(g, K.shoe, 9, 24.5, 6, 4); R(g, K.sole, 3, 27, 12, 2); R(g, K.shoeHi, 10, 22, 3, 1);
    if (K.pat === 'camo' || K.pat === 'track' || K.pat === 'stars') {
      const A = rgbOf(K.pants), B = rgbOf(K.pHi), C2 = rgbOf(K.pSh), same = (r, gg, b, q) => r === q[0] && gg === q[1] && b === q[2];
      paintPx(g, 16, 30, (x, y, r, gg, b) => {
        if (y > 20) return null; const l = same(r, gg, b, A) || same(r, gg, b, B); if (!l && !same(r, gg, b, C2)) return null;
        if (K.pat === 'camo') { const v = Math.sin(x * 0.9 + 1.3) + Math.sin(y * 0.6 + x * 0.3); return v > 0.7 ? (l ? K.c1 : K.c1s) : v < -0.9 ? (l ? K.c2 : K.c2s) : null; }
        if (K.pat === 'track') return (x === 10 || x === 11) ? K.pStripe : null;
        return ((x === 6 && y === 5) || (x === 9 && y === 11) || (x === 5 && y === 15)) ? '#ffffff' : null;
      });
    }
    return c;
  }
  const skinCache = {};
  function skinCanvases(K) { return skinCache[K.id] || (skinCache[K.id] = { torso: drawTorso(K), arm: drawArm(K), leg: drawLeg(K), tex: null }); }
  function skinTex(K) { const s = skinCanvases(K); if (!s.tex) s.tex = { torso: tex(s.torso), arm: tex(s.arm), leg: tex(s.leg) }; return s.tex; }
  let headNeutral = null;
  function composeSkin(K) {
    const s = skinCanvases(K), c = mkC(84, 92), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (!headNeutral) headNeutral = drawHead('neutral');
    const base = 88, cx = 42, put = (cv, px, py, X, Y) => g.drawImage(cv, Math.round(X - px), Math.round(Y - py));
    put(s.leg, 7, 3, cx - 6, base - 27); put(s.arm, 7, 4, cx - 15, base - 49); put(s.torso, 20, 17, cx, base - 39); put(s.leg, 7, 3, cx + 6, base - 27);
    g.drawImage(headNeutral, 0, 0, 40, 37, Math.round(cx + 1 - 17.2), Math.round(base - 67.5 - 15.9), 34, 32);
    put(s.arm, 7, 4, cx + 15, base - 49);
    return c;
  }
  function drawCoin() {
    const c = mkC(16, 16), g = c.getContext('2d');
    ell(g, OL, 8, 8, 7.5, 7.5); ell(g, '#ffcf33', 8, 8, 6.5, 6.5); ell(g, '#ffe98a', 7, 7, 4, 4); R(g, '#c78a10', 7, 4, 2, 8); R(g, '#fff', 4, 4, 2, 1);
    return c;
  }
  function drawRock() {
    const c = mkC(36, 36), g = c.getContext('2d');
    ell(g, OL, 18, 18, 17.5, 17); ell(g, '#8a8fa3', 18, 18, 16.5, 16); ell(g, '#aab0c4', 15, 14, 12, 11); ell(g, '#8a8fa3', 22, 22, 9, 9, 24, 34);
    R(g, '#6c7186', 6, 26, 24, 2); R(g, '#6c7186', 9, 8, 3, 1);
    R(g, '#fff', 9, 14, 6, 6); R(g, '#fff', 20, 14, 6, 6); R(g, OL, 11, 16, 3, 4); R(g, OL, 22, 16, 3, 4);
    R(g, OL, 8, 11, 8, 1); R(g, OL, 9, 12, 2, 1); R(g, OL, 20, 11, 8, 1); R(g, OL, 25, 12, 2, 1);
    ell(g, OL, 18, 27, 5, 3.5); R(g, '#fff', 14, 25, 8, 2);
    return c;
  }
  function drawIcicle() {
    const c = mkC(36, 36), g = c.getContext('2d');
    for (let y = 0; y < 35; y++) { const hw = Math.max(1, Math.round(15 * (1 - y / 35))); R(g, OL, 18 - hw - 1, y, 2 * hw + 2, 1); }
    for (let y = 1; y < 34; y++) { const hw = Math.max(0, Math.round(15 * (1 - y / 35))); R(g, '#8fdcff', 18 - hw, y, 2 * hw, 1); if (hw > 2) R(g, '#d8f6ff', 18 - hw, y, Math.max(1, Math.floor(hw * 0.5)), 1); }
    R(g, '#fff', 10, 6, 6, 6); R(g, '#fff', 20, 6, 6, 6); R(g, OL, 12, 8, 3, 4); R(g, OL, 22, 8, 3, 4);
    R(g, OL, 9, 4, 8, 1); R(g, OL, 10, 5, 2, 1); R(g, OL, 19, 4, 8, 1); R(g, OL, 24, 5, 2, 1);
    R(g, OL, 14, 16, 8, 2); R(g, '#fff', 16, 16, 4, 1);
    return c;
  }
  function drawCloud() {
    const c = mkC(48, 20), g = c.getContext('2d');
    ell(g, 'rgba(255,255,255,.95)', 12, 13, 11, 6); ell(g, 'rgba(255,255,255,.95)', 26, 10, 13, 8); ell(g, 'rgba(255,255,255,.95)', 38, 14, 9, 5);
    ell(g, 'rgba(255,225,200,.9)', 26, 16, 20, 3, 15, 18);
    return c;
  }
  function drawFlag(on) {
    const c = mkC(20, 12), g = c.getContext('2d');
    R(g, OL, 0, 0, 20, 12); R(g, on ? '#ff5a3c' : '#8d8aa8', 1, 1, 18, 10); R(g, on ? '#ff8a6a' : '#a9a6c0', 1, 1, 18, 2);
    ell(g, '#fff4d6', 10, 6, 3, 3);
    return c;
  }
  const signCv = mkC(64, 20);
  function drawSign() {
    const g = signCv.getContext('2d'); g.clearRect(0, 0, 64, 20);
    R(g, OL, 0, 0, 64, 20); R(g, '#c98a4a', 2, 2, 60, 16); R(g, '#e7b06c', 2, 2, 60, 3);
    g.fillStyle = OL; g.font = 'bold 12px Tahoma,Verdana,Arial,sans-serif'; g.textAlign = 'center'; g.fillText(tr('summit'), 32, 15);
    return signCv;
  }
  // 16x16 voxel textures
  function noiseTex(base, speck, seed, extra, density) {
    const c = mkC(16, 16), g = c.getContext('2d'), r = rngMaker(seed);
    R(g, base, 0, 0, 16, 16);
    for (let i = 0; i < (density || 36); i++) R(g, speck[Math.floor(r() * speck.length)], Math.floor(r() * 16), Math.floor(r() * 16), 1 + (r() < 0.3 ? 1 : 0), 1);
    if (extra) extra(g, r);
    return c;
  }
  const texDefs = {
    grassTop: () => noiseTex('#63c43a', ['#7fe04c', '#4fa82e', '#8ee85a'], 11, (g, r) => { for (let i = 0; i < 3; i++) { R(g, ['#ffe14d', '#ff8fb8', '#fff'][i], Math.floor(r() * 15), Math.floor(r() * 15), 1, 1); } }),
    dirtSide: () => noiseTex('#8c5a32', ['#6f4524', '#a36c3e', '#5b371c'], 12, (g, r) => { R(g, '#63c43a', 0, 0, 16, 3); for (let x = 0; x < 16; x++) { if (r() < 0.5) R(g, '#63c43a', x, 3, 1, 1 + Math.floor(r() * 2)); } R(g, '#4fa82e', 0, 2, 16, 1); }),
    stoneTop: () => noiseTex('#8d94a8', ['#a7aec3', '#767d92', '#b9c0d3'], 13, (g, r) => { for (let i = 0; i < 6; i++) R(g, '#6fae5a', Math.floor(r() * 16), Math.floor(r() * 16), 2, 1); }),
    stoneSide: () => noiseTex('#7a8196', ['#656c82', '#8d94a8', '#565c70'], 14, (g) => { R(g, '#4b5166', 3, 5, 6, 1); R(g, '#4b5166', 8, 6, 1, 4); R(g, '#4b5166', 10, 11, 5, 1); R(g, '#9aa1b6', 0, 0, 16, 1); }),
    woodTop: () => noiseTex('#c98a4a', ['#b57a3e', '#dba064'], 15, (g) => { R(g, '#8a5a2c', 0, 5, 16, 1); R(g, '#8a5a2c', 0, 11, 16, 1); }, 14),
    woodSide: () => noiseTex('#a8703a', ['#8f5c2c', '#c28650'], 16, (g) => { R(g, '#6e4422', 0, 7, 16, 1); R(g, '#6e4422', 0, 15, 16, 1); R(g, '#d9a46a', 0, 0, 16, 1); R(g, OL, 2, 3, 1, 1); R(g, OL, 13, 3, 1, 1); R(g, OL, 2, 11, 1, 1); R(g, OL, 13, 11, 1, 1); }, 10),
    crate: () => noiseTex('#d9954a', ['#c48238', '#e8ad62'], 17, (g) => { R(g, '#6e4422', 0, 0, 16, 2); R(g, '#6e4422', 0, 14, 16, 2); R(g, '#6e4422', 0, 0, 2, 16); R(g, '#6e4422', 14, 0, 2, 16); for (let i = 2; i < 14; i++) { R(g, '#8a5a2c', i, i, 1, 1); R(g, '#8a5a2c', 15 - i, i, 1, 1); } }, 12),
    leaf: () => noiseTex('#3fae3a', ['#58cc4a', '#2e8f33', '#6ee05a'], 18, null, 50),
    trunk: () => noiseTex('#7a4a28', ['#5e3819', '#8f5a32'], 19, (g) => { for (let x = 0; x < 16; x += 4) R(g, '#4b2c14', x, 0, 1, 16); }, 20),
    pine: () => noiseTex('#2f8a4a', ['#25703b', '#3da35a', '#1d5c32'], 20, null, 50),
    tuft: () => { const c = mkC(16, 16), g = c.getContext('2d'); const r = rngMaker(21); for (let x = 1; x < 15; x += 2) { const h = 6 + Math.floor(r() * 9); R(g, '#4fa82e', x, 16 - h, 2, h); R(g, '#7fe04c', x, 16 - h, 1, Math.max(1, h - 3)); } for (let i = 0; i < 2; i++) { R(g, i ? '#ff8fb8' : '#ffe14d', 3 + i * 8, 3 + i * 2, 2, 2); R(g, '#fff', 3 + i * 8, 3 + i * 2, 1, 1); } return c; },
  };
  Object.assign(texDefs, {
    snowTop: () => noiseTex('#f4fbff', ['#dcecf7', '#ffffff', '#c9def0'], 31, null, 30),
    snowSide: () => noiseTex('#8d94a8', ['#767d92', '#a7aec3', '#656c82'], 32, (g, r) => { R(g, '#f4fbff', 0, 0, 16, 4); for (let x = 0; x < 16; x++) { if (r() < 0.5) R(g, '#f4fbff', x, 4, 1, 1 + Math.floor(r() * 3)); } R(g, '#c9def0', 0, 3, 16, 1); }),
    iceTop: () => noiseTex('#aee6ff', ['#d8f6ff', '#8fd3f5', '#ffffff'], 33, (g) => { R(g, '#ffffff', 2, 3, 5, 1); R(g, '#ffffff', 9, 10, 4, 1); }, 22),
    iceSide: () => noiseTex('#6fc3ee', ['#9ae0ff', '#4fa8d8', '#d8f6ff'], 34, (g) => { R(g, '#d8f6ff', 0, 0, 16, 2); R(g, '#3f8fc4', 4, 6, 1, 6); R(g, '#3f8fc4', 11, 8, 1, 5); }, 26),
    ashTop: () => noiseTex('#4a4350', ['#5d5565', '#383240', '#6a6272'], 35, (g, r) => { R(g, '#ff7a2a', Math.floor(r() * 15), Math.floor(r() * 15), 1, 1); }, 30),
    ashSide: () => noiseTex('#3c3544', ['#4d4558', '#2e2836', '#554d62'], 36, (g, r) => { R(g, '#4a4350', 0, 0, 16, 3); R(g, '#ff7a2a', 3, 9, 1, 1); R(g, '#ff7a2a', 11, 12, 1, 1); R(g, '#ffb347', 11, 11, 1, 1); }, 28),
    obsTop: () => noiseTex('#2a2233', ['#3a3048', '#1e1826', '#4a3c5c'], 37, (g) => { R(g, '#ff6a1a', 2, 7, 7, 1); R(g, '#ff6a1a', 8, 8, 1, 5); R(g, '#ffb347', 3, 7, 2, 1); }, 24),
    obsSide: () => noiseTex('#241d2d', ['#322a40', '#18121f', '#3d334f'], 38, (g) => { R(g, '#3d334f', 0, 0, 16, 2); R(g, '#ff6a1a', 4, 5, 1, 7); R(g, '#ff6a1a', 5, 11, 5, 1); R(g, '#ffb347', 4, 6, 1, 2); R(g, '#ff6a1a', 12, 3, 1, 5); }, 26),
    snowLeaf: () => noiseTex('#eef6ff', ['#ffffff', '#cfe2f5', '#a9c8e8'], 40, null, 50),
    lava: () => noiseTex('#ff5a1a', ['#ffb347', '#ff8a2a', '#ffe27a', '#d63a0a'], 39, null, 70),
    fire: () => { const c = mkC(16, 32), g = c.getContext('2d'), r = rngMaker(41); for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) { const edge = Math.min(x, 15 - x); if (edge < 3 && r() < (3 - edge) * 0.3) continue; const k = r(); g.fillStyle = k < 0.25 ? '#ffe27a' : k < 0.6 ? '#ff9a2a' : k < 0.85 ? '#ff6a1a' : '#d63a0a'; g.fillRect(x, y, 1, 1); } return c; },
  });
  const TX = {};

  /* ---------------------------------------------------------------- audio ---- */
  const Snd = (() => {
    let ac = null, master = null, mg = null, muted = false, timer = null, step = 0, musicOn = false;
    const mel = [0, 659, 0, 784, 880, 0, 784, 0, 659, 0, 523, 0, 587, 659, 0, 0, 523, 0, 587, 0, 659, 0, 784, 880, 988, 0, 880, 0, 784, 0, 0, 0];
    const bas = [131, 0, 131, 0, 175, 0, 175, 0, 196, 0, 196, 0, 131, 0, 165, 0];
    function init() {
      if (!ac) {
        try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination); mg = ac.createGain(); mg.gain.value = 0.16; mg.connect(master); } catch (e) { ac = null; }
      }
      if (ac && ac.state === 'suspended') ac.resume();
    }
    function tone(f, d, type, v, slide, when, dest) {
      if (!ac) return; const t = ac.currentTime + (when || 0); const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
      g.gain.setValueAtTime(v || 0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + d + 0.03);
    }
    function noise(d, v, lp) {
      if (!ac) return; const n = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, n, ac.sampleRate), a = b.getChannelData(0);
      for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; f.type = 'lowpass'; f.frequency.value = lp || 800; g.gain.value = v || 0.25; s.connect(f); f.connect(g); g.connect(master); s.start();
    }
    const fx = {
      jump: () => tone(330, 0.16, 'square', 0.12, 380), land: () => noise(0.1, 0.18, 500), coin: () => { tone(988, 0.07, 'square', 0.1); tone(1319, 0.14, 'square', 0.1, 0, 0.06); },
      hit: () => { tone(320, 0.4, 'sawtooth', 0.16, -240); noise(0.25, 0.25, 700); }, boing: () => tone(180, 0.35, 'sine', 0.3, 520),
      cp: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.18, 0, i * 0.08)), rock: () => noise(0.3, 0.3, 320),
      warn: () => tone(880, 0.06, 'square', 0.05), win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'square', 0.14, 0, i * 0.11)),
      crumble: () => noise(0.25, 0.18, 400), ui: () => tone(660, 0.05, 'square', 0.08),
    };
    function tick() {
      if (!ac || !musicOn || muted) return;
      const m = mel[step % mel.length]; if (m) tone(m, 0.2, 'triangle', 0.9, 0, 0, mg);
      const b = bas[(step >> 1) % bas.length]; if ((step & 1) === 0 && b) tone(b, 0.4, 'sine', 1.2, 0, 0, mg);
      step++;
    }
    return {
      init, fx: (n) => { if (!muted && fx[n]) { try { fx[n](); } catch (e) { /* ignore */ } } },
      music(on) { musicOn = on; if (on && !timer) timer = setInterval(tick, 235); },
      setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.8; }, isMuted: () => muted,
      stop() { if (timer) clearInterval(timer); timer = null; try { ac && ac.close(); } catch (e) { /* ignore */ } },
    };
  })();
  cleanups.push(() => Snd.stop());
  const hap = (n) => { try { lib.haptics && lib.haptics.play(n); } catch (e) { /* ignore */ } };

  /* ---------------------------------------------------------------- renderer / scene ---- */
  const canvas = $('gl'), app = $('app'), sky = $('sky'), ui = $('ui');
  ui.innerHTML = '';
  const state = { tierPref: 'auto', tier: 'high', muted: false };
  const SHOP = { wallet: 0, owned: ['classic'], eq: 'classic' };
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) {
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true }); } catch (e2) { $('ltip').textContent = tr('noWebgl'); return () => {}; }
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(720, 1280, false);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffc89a, 38, 150);
  const camera = new THREE.PerspectiveCamera(38, 720 / 1280, 0.5, 400);
  const hemi = new THREE.HemisphereLight(0xfff0d8, 0x7a5f9a, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd29a, 0.85); sun.position.set(-0.5, 0.9, 0.7); scene.add(sun);
  const U = { time: { value: 0 } };

  /* ---------------------------------------------------------------- textures build ---- */
  Object.keys(texDefs).forEach((k) => { TX[k] = tex(texDefs[k](), k !== 'tuft' && k !== 'fire'); });
  TX.fire.wrapT = THREE.RepeatWrapping;
  TX.heads = { neutral: tex(drawHead('neutral')), effort: tex(drawHead('effort')), hurt: tex(drawHead('hurt')), dizzy: tex(drawHead('dizzy')) };
  TX.torso = tex(drawTorso()); TX.arm = tex(drawArm()); TX.leg = tex(drawLeg());
  TX.coin = tex(drawCoin()); TX.rock = tex(drawRock()); TX.cloud = tex(drawCloud());
  TX.icicle = tex(drawIcicle()); TX.flagOff = tex(drawFlag(false)); TX.flagOn = tex(drawFlag(true)); TX.sign = tex(drawSign());
  setLoad(0.45, tr('loadVoxel'));

  /* ---------------------------------------------------------------- merged voxel geometry ---- */
  function Geo() { return { p: [], n: [], u: [], c: [], s: [], i: [], vc: 0 }; }
  function quad(G, a, b, c, d, n, uv, cols, sw) {
    const base = G.vc, vs = [a, b, c, d];
    for (let k = 0; k < 4; k++) {
      G.p.push(vs[k][0], vs[k][1], vs[k][2]); G.n.push(n[0], n[1], n[2]); G.u.push(uv[k * 2], uv[k * 2 + 1]);
      const cc = cols[k]; G.c.push(cc[0], cc[1], cc[2]); G.s.push(sw ? sw[k] : 0);
    }
    G.i.push(base, base + 1, base + 2, base, base + 2, base + 3); G.vc += 4;
  }
  let GEO = {};
  const geoFor = (k) => (GEO[k] || (GEO[k] = Geo()));
  function addBox(style, x0, y0, z0, x1, y1, z1, tint, o) {
    o = o || {};
    const t = o.tile || 1, sideG = geoFor(style + ':side'), topG = geoFor(style + ':top'), allSide = o.allSide;
    const h = y1 - y0, dark = o.flat ? 1 : clamp(1 - h / 16, 0.55, 1);
    const ct = [tint[0], tint[1], tint[2]], cb = [tint[0] * dark, tint[1] * dark, tint[2] * dark * 1.04];
    const sw = o.sway ? [0, 0, 1, 1] : null;
    quad(sideG, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [x0 / t, y0 / t, x1 / t, y0 / t, x1 / t, y1 / t, x0 / t, y1 / t], [cb, cb, ct, ct], sw);
    quad(sideG, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [z1 / t, y0 / t, z0 / t, y0 / t, z0 / t, y1 / t, z1 / t, y1 / t], [cb, cb, ct, ct], sw);
    quad(sideG, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [z0 / t, y0 / t, z1 / t, y0 / t, z1 / t, y1 / t, z0 / t, y1 / t], [cb, cb, ct, ct], sw);
    const tg = allSide ? sideG : topG;
    quad(tg, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [x0 / t, z1 / t, x1 / t, z1 / t, x1 / t, z0 / t, x0 / t, z0 / t], [ct, ct, ct, ct], o.sway ? [1, 1, 1, 1] : null);
  }
  function geoToMesh(G, map, sway, extra) {
    if (!G.vc) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(G.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(G.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(G.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(G.c, 3));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(G.s, 1));
    g.setIndex(G.vc > 65000 ? new THREE.Uint32BufferAttribute(G.i, 1) : new THREE.Uint16BufferAttribute(G.i, 1));
    const m = new THREE.MeshLambertMaterial(Object.assign({ map, vertexColors: true }, extra || {}));
    if (sway) {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = U.time;
        sh.vertexShader = 'attribute float aSway;\nuniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.x += sin(uTime*1.7 + position.x*0.9 + position.y*0.4)*0.10*aSway; transformed.z += cos(uTime*1.3 + position.x)*0.04*aSway;');
      };
    }
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; return mesh;
  }
  const STYLE_TEX = { grass: ['dirtSide', 'grassTop'], rock: ['stoneSide', 'stoneTop'], wood: ['woodSide', 'woodTop'], crate: ['crate', 'crate'], snow: ['snowSide', 'snowTop'], ice: ['iceSide', 'iceTop'], ash: ['ashSide', 'ashTop'], obs: ['obsSide', 'obsTop'] };
  function boxGroup(style, w, h, d, tint) {
    const g = new THREE.Group(), st = STYLE_TEX[style] || STYLE_TEX.wood, side = TX[st[0]], top = TX[st[1]];
    const GS = Geo(), GT = Geo();
    const save = { a: GEO[style + ':side'], b: GEO[style + ':top'] };
    GEO[style + ':side'] = GS; GEO[style + ':top'] = GT;
    addBox(style, -w / 2, -h / 2, -d / 2, w / 2, h / 2, d / 2, tint || [1, 1, 1]);
    GEO[style + ':side'] = save.a; GEO[style + ':top'] = save.b;
    const a = geoToMesh(GS, side), b = geoToMesh(GT, top); g.add(a); g.add(b); return g;
  }

  /* ---------------------------------------------------------------- maps ---- */
  const MAP_IDS = ['a', 'b', 'c'];
  const MAPS = {
    a: { id: 'a', icon: '🌿', hillStyle: 'grass', bodyStyle: 'rock', bodyTint: [1.0, 0.95, 1.2], rockTex: 'rock', rockMark: 0xff3b3b, cloud: 0xffffff, cloudOp: 0.9, fog: 0xffc89a, hemi: [0xfff0d8, 0x7a5f9a, 1.0], sunC: 0xffd29a, decor: 'green',
      sky: [[0, [255, 214, 165], [255, 142, 107]], [30, [255, 226, 170], [110, 190, 255]], [60, [140, 205, 255], [70, 120, 230]], [95, [120, 110, 220], [40, 40, 120]]],
      ridges: [[3, '#b9a6dc', 90, 38], [8, '#8f86c8', 100, 28], [12, '#6f8fbf', 105, 22, '#4f6f9f'], [21, '#4f9a5a', 112, 16, '#3a7a48']],
      pet: { dir: -1, spd: 1.1, cols: [0xffb7d5, 0xffffff, 0xffe27a, 0xffa0a0] },
      pv: { top: '#ff8e6b', bot: '#ffd6a5', sun: '#fff3b0', r1: '#8f86c8', r2: '#4f9a5a', ground: '#63c43a', side: '#8c5a32' } },
    b: { id: 'b', icon: '❄', hillStyle: 'snow', bodyStyle: 'ice', bodyTint: [1.1, 1.15, 1.3], rockTex: 'icicle', rockMark: 0x3bb7ff, cloud: 0xffffff, cloudOp: 0.95, fog: 0xdcecff, hemi: [0xe8f4ff, 0x8aa0c8, 1.05], sunC: 0xe6f2ff, decor: 'snow',
      sky: [[0, [240, 248, 255], [150, 200, 245]], [30, [230, 242, 255], [110, 170, 235]], [60, [205, 228, 255], [90, 140, 225]], [95, [190, 200, 255], [70, 90, 190]]],
      ridges: [[5, '#d9e6f7', 90, 40], [9, '#b3c8e8', 100, 30], [14, '#8fb0dc', 105, 22, '#e8f2ff'], [22, '#e6f1ff', 112, 14, '#9ec2ea']],
      pet: { dir: -1, spd: 2.4, cols: [0xffffff, 0xeaf6ff, 0xd0e8ff, 0xffffff] },
      pv: { top: '#8fc4f4', bot: '#eaf6ff', sun: '#ffffff', r1: '#b3c8e8', r2: '#e6f1ff', ground: '#f4fbff', side: '#6fc3ee' } },
    c: { id: 'c', icon: '🌋', hillStyle: 'ash', bodyStyle: 'obs', bodyTint: [1.2, 1.0, 1.15], rockTex: 'rock', rockMark: 0xff3b3b, cloud: 0x7a5566, cloudOp: 0.85, fog: 0x6a2a3a, hemi: [0xffb080, 0x502040, 1.0], sunC: 0xff9a5a, decor: 'ash',
      sky: [[0, [255, 120, 60], [70, 22, 52]], [30, [255, 150, 70], [95, 32, 62]], [60, [235, 110, 70], [62, 20, 62]], [95, [205, 90, 85], [30, 10, 50]]],
      ridges: [[4, '#7a3a52', 90, 38], [9, '#5a2a4a', 100, 28], [13, '#3f2040', 105, 22, '#2a1530'], [23, '#2a1a30', 112, 16, '#ff6a1a']],
      pet: { dir: 1, spd: 1.0, cols: [0xff7a2a, 0xffb347, 0xffe27a, 0xff5a1a] },
      pv: { top: '#3a1438', bot: '#ff7a3a', sun: '#ffd25a', r1: '#5a2a4a', r2: '#2a1a30', ground: '#2a2233', side: '#241d2d' } },
  };
  let CUR = MAPS.a;
  const mapName = (id) => tr('map_' + id);

  /* ---------------------------------------------------------------- level ---- */
  const THICK = { wood: 0.7, rock: 2.2, ice: 2.2, obs: 2.2 };
  function buildLevel(mapId) {
    const L = { solids: [], coins: [], flags: [], movers: [], crumbles: [], springs: [], route: [], summit: null, rocksFromY: 0, rows: [], winds: [], geysers: [], lava: null };
    const BASE = -60;
    let cx = -14, cy = 0, dir = 1;
    function P(type, w, gap, dy, o) {
      o = o || {};
      const near = cx + dir * gap, far = near + dir * w, top = cy + dy;
      const x0 = Math.min(near, far), x1 = Math.max(near, far);
      const thick = o.thick || THICK[type] || (top - BASE);
      const s = { type, x0, x1, y1: top, y0: top - thick, dir, idx: L.route.length, near, far, z0: -1.6, z1: 1.6, slip: type === 'ice' };
      L.solids.push(s); L.route.push(s); cx = far; cy = top; return s;
    }
    const at = (s, f) => (s.dir === 1 ? s.x0 + (s.x1 - s.x0) * f : s.x1 - (s.x1 - s.x0) * f);
    const stackCrate = (x0, base, size) => { const c = { type: 'crate', x0, x1: x0 + size, y1: base + size, y0: base, z0: -0.7, z1: 0.7 }; L.solids.push(c); };
    const flag = (s, f) => { const x = at(s, f); L.flags.push({ x, y: s.y1, id: L.flags.length + 1 }); };
    const spring = (s, f) => { const x = at(s, f); const sp = { type: 'spring', spring: true, x0: x - 0.6, x1: x + 0.6, y0: s.y1, y1: s.y1 + 0.4, z0: -0.6, z1: 0.6 }; L.solids.push(sp); L.springs.push(sp); return sp; };
    const coinArc = (ax, ay, bx, by, n, peak) => { for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); L.coins.push({ x: lerp(ax, bx, t), y: lerp(ay, by, t) + Math.sin(t * Math.PI) * peak, got: false, id: L.coins.length }); } };
    const coinLine = (s, f0, f1, n, lift) => { for (let i = 0; i < n; i++) { const f = lerp(f0, f1, n === 1 ? 0.5 : i / (n - 1)); L.coins.push({ x: at(s, f), y: s.y1 + (lift || 1.0), got: false, id: L.coins.length }); } };
    const mover = (w, mx, my, ax, ay, sp, style) => { const m = { type: 'mover', w, h: 0.6, cx: mx, cy: my, ax, ay, sp, ph: 0, z0: -1.4, z1: 1.4, style, slip: style === 'ice' }; m.x0 = mx - w / 2; m.x1 = mx + w / 2; m.y1 = my + 0.3; m.y0 = my - 0.3; L.movers.push(m); L.solids.push(m); return m; };
    const crumbleMark = (s, style) => { s.crumble = true; s.cstyle = style; L.crumbles.push(s); };
    const wind = (a, b, v, on, off, ph) => L.winds.push({ x0: a.x1 - 0.5, x1: b.x0 + 0.5, y0: Math.min(a.y1, b.y1) - 3, y1: Math.max(a.y1, b.y1) + 7, v, on, off, ph: ph || 0, act: false, pre: false });
    const geyser = (a, b, ph, period) => { const base = Math.min(a.y1, b.y1) - 9, top = Math.max(a.y1, b.y1) + 1.8; L.geysers.push({ x: (a.x1 + b.x0) / 2, y0: base, h: top - base, period: period || 4.5, warn: 1.2, erupt: 1.0, ph: ph || 0, state: 'idle' }); };
    const rowsRun = (rows, types, thickRest, restType, hook) => {
      let rest = rows.start;
      rows.list.forEach((row, ri) => {
        dir = 1; cx = rest.x1; const startX = cx; let pv = rest, y0s = 0;
        for (let i = 0; i < 4; i++) {
          const ty = types(i), s = P(ty, row.w[i], row.g[i], row.d[i], ty === 'snow' ? { thick: 2.2 } : undefined);
          coinArc(pv.far, pv.y1 + 1.4, s.near, s.y1 + 1.2, 3, 1.4); if (i === 0) y0s = s.y1;
          if (hook) hook(ri, i, pv, s); pv = s;
        }
        const rs = P(restType, 9, 2.4, 2.0, { thick: thickRest }); flag(rs, 0.5); coinLine(rs, 0.25, 0.75, 3, 1.1);
        L.rows.push({ x0: Math.min(startX, rs.x0) - 2, x1: Math.max(startX, rs.x1) + 2, top: rs.y1, bot: y0s - 4 }); rest = rs;
      });
      return rest;
    };

    if (mapId === 'b') {
      /* PETA 2 - PUNCAK SALJU: lantai licin, angin, es jatuh */
      const g0 = P('snow', 26, 0, 0); L.start = { x: 0, y: 0 };
      stackCrate(6.6, 0, 1.2); stackCrate(7.8, 0, 1.2); stackCrate(7.2, 1.2, 1.2);
      coinArc(3, 1.2, 7.2, 3.4, 5, 0.9); L.hintX = 11;
      const g1 = P('snow', 8, 3.4, 0); coinArc(g0.x1 + 0.5, 2.4, g1.x0 + 2, 1.6, 4, 1.8);
      const g2 = P('snow', 5, 0, 1.4); coinLine(g2, 0.2, 0.8, 3, 1.1);
      const g3 = P('snow', 5, 3.0, 1.2); coinArc(g2.x1, g2.y1 + 1.6, g3.x0, g3.y1 + 1.2, 3, 1.4);
      const g4 = P('snow', 5, 3.4, 0.6); coinArc(g3.x1, g3.y1 + 1.4, g4.x0, g4.y1 + 1.2, 3, 1.6);
      const g5 = P('snow', 9, 3.0, -1.8); flag(g5, 0.4); coinLine(g5, 0.5, 0.8, 3, 1.1);
      L.rocksFromY = g5.y1 + 0.5;
      let pv = g5;
      [[4.2, 3.0, 1.0], [4.0, 3.2, 0.8], [3.8, 3.4, 1.2], [4.2, 3.0, 0.6], [3.6, 3.6, 1.4], [4.0, 3.2, 0.8]].forEach((c, i) => {
        const s = P('ice', c[0], c[1], c[2]); coinArc(pv.x1, pv.y1 + 1.4, s.x0, s.y1 + 1.2, 3, 1.6);
        if (i === 1 || i === 4) wind(pv, s, -4.2, 2.2, 2.8, i); pv = s;
      });
      const isl = P('snow', 8, 3.2, 0.8, { thick: 2.6 }); flag(isl, 0.5);
      mover(3.2, cx + 4.5, cy - 0.3, 2.6, 0, 0.8, 'ice'); coinArc(cx + 1, cy + 1.6, cx + 8, cy + 1.6, 6, 1.2);
      P('ice', 4, 9.0, 0); P('ice', 3.4, 3.4, 0.8);
      const r0 = P('snow', 9, 3.0, 1.2, { thick: 2.6 }); flag(r0, 0.5);
      const rest = rowsRun({ start: r0, list: [
        { w: [4, 3.6, 4, 3.6], g: [2.4, 2.8, 2.6, 3.0], d: [1.8, 1.9, 1.8, 1.9] },
        { w: [3.6, 3.4, 3.6, 3.4], g: [3.0, 3.2, 3.0, 3.2], d: [1.9, 2.0, 1.9, 2.0] },
        { w: [3.4, 3.2, 3.4, 3.2], g: [3.2, 3.4, 3.2, 3.4], d: [2.0, 2.0, 2.0, 2.0] }] },
      (i) => (i % 2 === 0 ? 'ice' : 'snow'), 2.6, 'snow', (ri, i, p, s) => { if (ri >= 1 && (i === 1 || i === 3)) wind(p, s, ri % 2 ? -4.2 : 4.2, 2.0, 2.6, i * 1.1); });
      dir = 1; cx = rest.x1; pv = rest;
      [['ice', 2.8, 3.4, 1.6], ['ice', 2.6, 3.6, 1.2], ['crack', 2.6, 3.2, 2.0], ['ice', 2.8, 3.6, 0.8], ['ice', 2.6, 3.2, 1.8], ['crack', 3, 3.4, 1.4], ['snow', 3, 3.6, 1.0]].forEach((c, i) => {
        const isC = c[0] === 'crack'; const s = P(isC ? 'ice' : c[0], c[1], c[2], c[3], { thick: isC ? 1.2 : 2.2 }); if (isC) crumbleMark(s, 'ice');
        coinArc(pv.far, pv.y1 + 1.4, s.near, s.y1 + 1.8, 3, 1.8); if (i === 3) wind(pv, s, 4.2, 2.0, 2.4, 0.5); pv = s;
      });
      const sm = P('snow', 12, 3.4, 1.8, { thick: 3.2 });
      L.summit = { x: at(sm, 0.55), y: sm.y1, s: sm }; coinLine(sm, 0.2, 0.9, 5, 1.1); L.topY = sm.y1;
      return L;
    }

    if (mapId === 'c') {
      /* PETA 3 - GUNUNG API: geyser lava, platform ambruk */
      const g0 = P('ash', 24, 0, 0); L.start = { x: 0, y: 0 };
      stackCrate(6.5, 0, 1.2); stackCrate(7.7, 0, 2.2); coinArc(3, 1.2, 6, 1.2, 4, 0.9); L.hintX = 11;
      const g1 = P('ash', 7, 3.4, 0); geyser(g0, g1, 0.4, 4.5); coinArc(g0.x1 + 0.6, 2.6, g1.x0 + 2, 1.6, 4, 1.8);
      const g2 = P('ash', 5, 0, 1.5); coinLine(g2, 0.2, 0.8, 3, 1.1);
      const g3 = P('ash', 5, 3.0, 1.3); geyser(g2, g3, 1.9, 4.5); coinArc(g2.x1, g2.y1 + 1.6, g3.x0, g3.y1 + 1.2, 3, 1.4);
      const g4 = P('ash', 10, 3.0, -1.5); flag(g4, 0.35); coinLine(g4, 0.5, 0.8, 3, 1.1); spring(g4, 0.92);
      const w0 = P('obs', 4.6, 1.6, 5.5, { thick: 1.2 }); coinArc(at(g4, 0.92), 3.5, at(w0, 0.5), w0.y1 + 1.4, 5, 3.4);
      let pv = w0;
      [['obs', 3.4, 3.6, 0.8], ['obs', 3.2, 3.8, 0.6], ['crumble', 3.2, 3.4, -0.4], ['obs', 3.4, 3.4, 1.0], ['crumble', 3, 3.2, 0.4], ['obs', 3.4, 3.6, 0.8], ['obs', 4, 3.4, 0.6]].forEach((c, i) => {
        const isC = c[0] === 'crumble'; const s = P('obs', c[1], c[2], c[3], { thick: 1.2 }); if (isC) crumbleMark(s, 'obs');
        coinArc(pv.x1, pv.y1 + 1.4, s.x0, s.y1 + 1.2, 3, 1.6); if (i === 0 || i === 2 || i === 4) geyser(pv, s, i * 1.3, 4.5); pv = s;
      });
      const isl = P('obs', 8, 3.4, 0.8, { thick: 2.6 }); flag(isl, 0.5);
      mover(3.2, cx + 4.5, cy - 0.3, 2.6, 0, 0.8, 'obs'); coinArc(cx + 1, cy + 1.6, cx + 8, cy + 1.6, 6, 1.2);
      P('obs', 4, 9.0, 0, { thick: 1.2 }); P('obs', 3.6, 3.4, 0.8, { thick: 1.2 });
      const r0 = P('obs', 9, 3.2, 1.2, { thick: 2.6 }); flag(r0, 0.5);
      L.lava = { y: -5, x0: -40, x1: isl.x1 + 12 };
      const rest = rowsRun({ start: r0, list: [
        { w: [4, 3.6, 4, 3.4], g: [2.6, 3.0, 2.8, 3.2], d: [1.9, 2.0, 1.9, 2.0] },
        { w: [3.6, 3.4, 3.6, 3.2], g: [3.0, 3.2, 3.0, 3.2], d: [2.0, 2.0, 1.9, 2.1] },
        { w: [3.4, 3.2, 3.4, 3.0], g: [3.2, 3.2, 3.2, 3.4], d: [2.0, 2.1, 2.0, 2.0] }] },
      () => 'obs', 2.6, 'obs', (ri, i, p, s) => { if ((ri + i) % 2 === 1 && i > 0) geyser(p, s, ri * 0.9 + i * 1.7, 4.5); });
      dir = 1; cx = rest.x1; pv = rest;
      [['obs', 2.8, 3.6, 1.6], ['crumble', 2.6, 3.2, 1.2], ['obs', 2.6, 3.2, 1.6], ['crumble', 2.8, 3.4, 1.0], ['obs', 2.6, 3.2, 1.8], ['obs', 2.6, 3.3, 1.6], ['crumble', 3, 3.4, 1.4], ['obs', 3, 3.6, 1.0]].forEach((c, i) => {
        const isC = c[0] === 'crumble'; const s = P('obs', c[1], c[2], c[3], { thick: isC ? 1.2 : 2.2 }); if (isC) crumbleMark(s, 'obs');
        coinArc(pv.far, pv.y1 + 1.4, s.near, s.y1 + 1.8, 3, 1.8); if (i % 2 === 0) geyser(pv, s, i * 0.8, 4.2); pv = s;
      });
      const sm = P('obs', 12, 3.4, 1.8, { thick: 3.2 });
      L.summit = { x: at(sm, 0.55), y: sm.y1, s: sm }; coinLine(sm, 0.2, 0.9, 5, 1.1); L.topY = sm.y1;
      L.rocksFromY = 1e9;
      return L;
    }

    /* PETA 1 - LERENG HIJAU: batu jatuh, papan ambruk, platform bergerak */
    const g0 = P('grass', 28, 0, 0);
    L.start = { x: 0, y: 0 };
    stackCrate(7.4, 0, 1.2); stackCrate(8.6, 0, 2.2);
    coinArc(3, 1.2, 6.5, 1.2, 4, 0.9); coinArc(7.4, 3.9, 10.4, 1.4, 4, 1.0);
    L.hintX = 12.5;
    coinLine(g0, 0.88, 0.99, 2, 1.0);
    const g1 = P('grass', 9, 3.2, 0); coinArc(14.2, 2.6, 17.6, 1.6, 4, 1.8);
    const g2 = P('grass', 5, 0, 1.6); coinLine(g2, 0.2, 0.8, 3, 1.1);
    const g3 = P('grass', 4, 2.4, 1.4); coinArc(at(g2, 1), g2.y1 + 1.6, at(g3, 0), g3.y1 + 1.2, 3, 1.4);
    const g4 = P('grass', 4, 3.4, -1.0); coinArc(at(g3, 1), g3.y1 + 1.4, at(g4, 0), g4.y1 + 1.2, 4, 1.6);
    const g5 = P('grass', 10, 2.8, -2.0); flag(g5, 0.35); coinLine(g5, 0.5, 0.8, 3, 1.1);
    spring(g5, 0.92);
    const w0 = P('wood', 4.6, 1.6, 5.5); coinArc(at(g5, 0.92), 3.5, at(w0, 0.5), w0.y1 + 1.4, 5, 3.4);
    const chain = [['wood', 3.4, 3.6, 0.8], ['wood', 3, 3.8, 0.6], ['wood', 3, 3.9, -0.4], ['wood', 3.4, 3.4, 1.2], ['crumble', 3, 3.0, 0.4], ['crumble', 3, 3.0, 0], ['wood', 4, 3.4, 0.6]];
    let prev = w0;
    chain.forEach((c) => {
      const isC = c[0] === 'crumble';
      const s = P(isC ? 'wood' : c[0], c[1], c[2], c[3]);
      if (isC) crumbleMark(s);
      coinArc(at(prev, 1), prev.y1 + 1.4, at(s, 0), s.y1 + 1.2, 3, 1.6); prev = s;
    });
    const isl = P('grass', 8, 3.4, 0.8, { thick: 2.6 }); flag(isl, 0.5);
    mover(3.2, cx + 4.5, cy - 0.3, 2.6, 0, 0.8, 'wood');
    coinArc(cx + 1, cy + 1.6, cx + 8, cy + 1.6, 6, 1.2);
    P('wood', 4, 9.0, 0);
    P('wood', 3.2, 3.6, 0.8);
    const lx = cx + 1.9 + 1.5;
    const mv2 = mover(3, lx, cy + 2.7, 0, 3.0, 0.7, 'wood');
    cx = lx + 1.5;
    const z3 = P('rock', 9, 2.4, 5.6, { thick: 2.6 }); flag(z3, 0.5);
    L.rocksFromY = z3.y1 - 0.5;
    const rest = rowsRun({ start: z3, list: [
      { w: [4, 3.6, 4, 3.4], g: [2.2, 2.6, 2.2, 2.8], d: [1.9, 2.0, 1.9, 2.0] },
      { w: [3.6, 4, 3.4, 3.6], g: [2.8, 2.4, 3.0, 2.6], d: [2.0, 1.8, 2.0, 2.1] },
      { w: [3.4, 3.2, 3.6, 3.2], g: [3.0, 3.2, 2.8, 3.2], d: [2.0, 2.1, 1.9, 2.1] },
      { w: [3.2, 3.0, 3.2, 3.0], g: [3.2, 3.4, 3.2, 3.4], d: [2.1, 2.0, 2.2, 2.0] }] },
    () => 'rock', 2.6, 'rock', (ri, i, p, s) => { if (i === 2 && ri === 2) spring(s, 0.5); });
    dir = 1; cx = rest.x1;
    const pk = [['rock', 2.8, 3.6, 1.6], ['rock', 2.6, 3.9, 1.2], ['crumble', 2.6, 3.2, 2.0], ['rock', 2.8, 3.8, 0.8], ['rock', 2.6, 3.2, 1.8], ['rock', 2.6, 3.3, 2.0], ['crumble', 3, 3.4, 1.4], ['rock', 3, 3.6, 1.0]];
    let pv = rest;
    pk.forEach((c) => {
      const isC = c[0] === 'crumble';
      const s = P('rock', c[1], c[2], c[3], { thick: isC ? 1.2 : 2.2 });
      if (isC) crumbleMark(s);
      coinArc(pv.far, pv.y1 + 1.4, s.near, s.y1 + 1.2, 3, 1.8); pv = s;
    });
    const sm = P('rock', 12, 3.4, 1.8, { thick: 3.2 });
    L.summit = { x: at(sm, 0.55), y: sm.y1, s: sm }; coinLine(sm, 0.2, 0.9, 5, 1.1);
    L.topY = sm.y1;
    return L;
  }
  let LV = null;
  const PLAYERH = 1.75, PLAYERW = 0.72;

  /* ---------------------------------------------------------------- build world meshes (per map) ---- */
  const world = new THREE.Group(); scene.add(world); // persistent: character, shadow, falling hazards
  let levelGroup = null, coinMesh = null, tuftMesh = null, coinGot = new Uint8Array(1);
  const dummy = new THREE.Object3D();
  function disposeGroup(grp) {
    grp.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
    if (grp.parent) grp.parent.remove(grp);
  }
  function buildWorld(mapId) {
    if (levelGroup) disposeGroup(levelGroup);
    levelGroup = new THREE.Group(); world.add(levelGroup);
    CUR = MAPS[mapId]; LV = buildLevel(mapId); window.__level = LV; coinGot = new Uint8Array(LV.coins.length);
    GEO = {};
    const rr = rngMaker(555 + mapId.charCodeAt(0));
    LV.solids.forEach((s) => {
      if (s.type === 'mover' || s.crumble || s.spring) return;
      const k = 0.93 + rr() * 0.1, tint = [k, k, k];
      addBox(s.type, s.x0, s.y0, s.z0, s.x1, s.y1, s.z1, tint, { tile: s.type === 'crate' ? 1.2 : 1 });
    });
    LV.rows.forEach((row) => { addBox(CUR.bodyStyle, row.x0, row.bot - 40, -34, row.x1, row.top - 1, -18, CUR.bodyTint, { tile: 3, flat: true }); });
    addBox(CUR.hillStyle, -40, -60, -30, 60, -2, -9, [0.9, 1.0, 1.0], { tile: 3, flat: true });
    Object.keys(STYLE_TEX).forEach((st) => {
      if (!GEO[st + ':side'] && !GEO[st + ':top']) return;
      const a = geoToMesh(GEO[st + ':side'] || Geo(), TX[STYLE_TEX[st][0]]), b = geoToMesh(GEO[st + ':top'] || Geo(), TX[STYLE_TEX[st][1]]);
      if (a) levelGroup.add(a); if (b) levelGroup.add(b);
    });
    // decor
    const LEAF = { side: Geo(), top: Geo() }, TRUNK = { side: Geo(), top: Geo() }, PINE = { side: Geo(), top: Geo() }, TUFT = Geo();
    const decor = CUR.decor;
    function addTree(x, y, z, sc, pine, tn, dead) {
      tn = tn || [1, 1, 1];
      const tr = pine ? 0.4 * sc : 0.5 * sc, th = (pine ? 1.6 : 2.4) * sc;
      GEO['trunk:side'] = TRUNK.side; GEO['trunk:top'] = TRUNK.top;
      const tt = dead ? [0.55, 0.45, 0.5] : [1, 1, 1];
      addBox('trunk', x - tr / 2, y, z - tr / 2, x + tr / 2, y + th * (dead ? 1.5 : 1), z + tr / 2, tt, { tile: 1 });
      if (dead) return;
      const k = pine ? 'pine' : 'leaf', tgt = pine ? PINE : LEAF;
      GEO[k + ':side'] = tgt.side; GEO[k + ':top'] = tgt.top;
      const tints = () => { const v = 0.9 + rr() * 0.2; return [v * tn[0], v * tn[1], v * tn[2]]; };
      if (pine) {
        [[2.6, 1.4, 0], [2.0, 1.3, 1.2], [1.4, 1.2, 2.3]].forEach(([w, h, o]) => addBox(k, x - w * sc / 2, y + th * 0.55 + o * sc, z - w * sc / 2, x + w * sc / 2, y + th * 0.55 + (o + h) * sc, z + w * sc / 2, tints(), { tile: 1, sway: true, allSide: true }));
      } else {
        [[3.4, 1.3, 0], [2.8, 1.2, 1.1], [1.8, 1.0, 2.1]].forEach(([w, h, o]) => addBox(k, x - w * sc / 2, y + th + o * sc - 0.6, z - w * sc / 2, x + w * sc / 2, y + th + (o + h) * sc - 0.6, z + w * sc / 2, tints(), { tile: 1, sway: true, allSide: true }));
      }
    }
    function addTuft(x, y, z, w, h, tint) {
      const t = tint || [1, 1, 1]; quad(TUFT, [x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y + h, z], [x - w / 2, y + h, z], [0, 0, 1], [0, 0, 1, 0, 1, 1, 0, 1], [t, t, t, t], [0, 0, 1, 1]);
    }
    const SNOWT = [1, 1, 1];
    LV.solids.forEach((s) => {
      const wdt = s.x1 - s.x0;
      if (decor === 'green') {
        if (s.type === 'grass') {
          for (let x = s.x0 + 1.2; x < s.x1 - 1; x += 1.6 + rr() * 2.2) { if (rr() < 0.6) addTuft(x, s.y1, 1.2 + rr() * 2, 1.1, 0.8 + rr() * 0.7, [0.9 + rr() * 0.2, 1, 0.9 + rr() * 0.2]); }
          if (wdt > 8 && s.y1 < 6) { const n = Math.floor(wdt / 11); for (let i = 0; i < n; i++) addTree(s.x0 + 2 + (i + rr() * 0.6) * (wdt - 4) / n, s.y1, -2.2 - rr() * 3.5, 0.75 + rr() * 0.35, false); }
        }
        if (s.type === 'rock' && wdt > 8) { addTree(s.x0 + 1.3, s.y1, -1.4, 0.7, true); addTree(s.x1 - 1.3, s.y1, -1.9, 0.8, true); }
        if (s.type === 'rock') { for (let x = s.x0 + 0.8; x < s.x1 - 0.5; x += 1.5 + rr() * 2) if (rr() < 0.45) addTuft(x, s.y1, 1.4, 0.7, 0.5, [0.7, 0.85, 0.9]); }
      } else if (decor === 'snow') {
        if (s.type === 'snow' && wdt > 6 && s.y1 < 8) { const n = Math.max(1, Math.floor(wdt / 9)); for (let i = 0; i < n; i++) addTree(s.x0 + 2 + (i + rr() * 0.6) * (wdt - 4) / n, s.y1, -2.2 - rr() * 3, 0.8 + rr() * 0.4, true, SNOWT); }
        else if (s.type === 'snow' && wdt > 8) { addTree(s.x0 + 1.3, s.y1, -1.6, 0.7, true, SNOWT); addTree(s.x1 - 1.3, s.y1, -2.0, 0.8, true, SNOWT); }
      } else {
        if (s.type === 'ash' && wdt > 6) { const n = Math.max(1, Math.floor(wdt / 8)); for (let i = 0; i < n; i++) addTree(s.x0 + 2 + (i + rr() * 0.6) * (wdt - 4) / n, s.y1, -2.0 - rr() * 3, 0.9 + rr() * 0.5, true, null, true); }
        else if (s.type === 'obs' && wdt > 8) { addTree(s.x0 + 1.3, s.y1, -1.6, 0.8, true, null, true); addTree(s.x1 - 1.3, s.y1, -2.0, 0.7, true, null, true); }
      }
    });
    for (let i = 0; i < 12; i++) {
      const x = -14 + i * 8 + rr() * 3, z = -7 - rr() * 8, sc = 0.9 + rr() * 0.6;
      if (decor === 'green') addTree(x, -1, z, sc, rr() < 0.4); else if (decor === 'snow') addTree(x, -1, z, sc + 0.3, true, SNOWT); else addTree(x, -1, z, sc + 0.3, true, null, true);
    }
    [['trunk', TRUNK, 'trunk'], ['leaf', LEAF, 'leaf'], ['pine', PINE, decor === 'snow' ? 'snowLeaf' : 'pine']].forEach(([k, Gx, t]) => {
      const a = geoToMesh(Gx.side, TX[t], k !== 'trunk'), b = geoToMesh(Gx.top, TX[t], k !== 'trunk'); if (a) levelGroup.add(a); if (b) levelGroup.add(b);
    });
    tuftMesh = geoToMesh(TUFT, TX.tuft, true, { transparent: false, alphaTest: 0.5, side: THREE.DoubleSide }); if (tuftMesh) levelGroup.add(tuftMesh);

    // dynamic platforms
    LV.movers.forEach((m) => { m.mesh = boxGroup(m.style || 'wood', m.w, m.h, 2.8); levelGroup.add(m.mesh); m.mesh.position.set(m.cx, m.cy, 0); m.px = m.cx; m.py = m.cy; });
    LV.crumbles.forEach((s) => {
      s.mesh = boxGroup(s.cstyle || 'rock', s.x1 - s.x0, s.y1 - s.y0, 3.2, [1.1, 0.95, 0.85]); s.mesh.position.set((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, 0); levelGroup.add(s.mesh); s.t = 0; s.state = 'ok'; s.home = s.mesh.position.clone();
    });
    LV.springs.forEach((s) => {
      const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 1), new THREE.MeshLambertMaterial({ color: 0x7a4a28 }));
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.9), new THREE.MeshLambertMaterial({ color: 0xff4f6e })); top.position.y = 0.2; g.add(b); g.add(top);
      g.position.set((s.x0 + s.x1) / 2, s.y0 + 0.09, 0); levelGroup.add(g); s.mesh = g; s.top = top; s.sq = 0;
    });
    LV.flags.forEach((f) => {
      const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.14), new THREE.MeshLambertMaterial({ color: 0xe8e0d0 })); pole.position.y = 1.6; g.add(pole);
      const mat = new THREE.MeshBasicMaterial({ map: TX.flagOff, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 });
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), mat); cloth.geometry.translate(0.75, 0, 0); cloth.position.set(0.07, 2.7, 0.05); g.add(cloth);
      g.position.set(f.x, f.y, -0.8); levelGroup.add(g); f.mesh = g; f.cloth = cloth; f.on = false;
    });
    {
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.3), new THREE.MeshBasicMaterial({ map: TX.sign, transparent: true }));
      sg.position.set(LV.summit.x, LV.summit.y + 4.2, -0.8); levelGroup.add(sg);
      const pl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 0.2), new THREE.MeshLambertMaterial({ color: 0x7a4a28 })); pl.position.set(LV.summit.x - 1.6, LV.summit.y + 1.7, -0.8); levelGroup.add(pl);
      const pl2 = pl.clone(); pl2.position.x = LV.summit.x + 1.6; levelGroup.add(pl2);
    }
    // geysers (lava columns) + lava lake
    LV.geysers.forEach((gy) => {
      gy.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, gy.h), new THREE.MeshBasicMaterial({ map: TX.fire.clone(), transparent: true, alphaTest: 0.3, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide }));
      gy.mesh.material.map.needsUpdate = true; gy.mesh.material.map.wrapT = THREE.RepeatWrapping; gy.mesh.material.map.repeat.set(1, Math.max(1, gy.h / 6));
      gy.mesh.position.set(gy.x, gy.y0 + gy.h / 2, 0.2); gy.mesh.visible = false; levelGroup.add(gy.mesh);
    });
    if (LV.lava) {
      const lt = TX.lava.clone(); lt.needsUpdate = true; lt.wrapS = lt.wrapT = THREE.RepeatWrapping; lt.repeat.set((LV.lava.x1 - LV.lava.x0) / 4, 10);
      const lm = new THREE.Mesh(new THREE.PlaneGeometry(LV.lava.x1 - LV.lava.x0, 40), new THREE.MeshBasicMaterial({ map: lt, fog: false }));
      lm.position.set((LV.lava.x0 + LV.lava.x1) / 2, LV.lava.y - 20, -2.2); levelGroup.add(lm); LV.lava.mesh = lm;
    }
    coinMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: TX.coin, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }), LV.coins.length);
    coinMesh.frustumCulled = false; levelGroup.add(coinMesh);
    applyMapSkin();
  }
  setLoad(0.65, tr('loadClouds'));

  /* ---------------------------------------------------------------- background layers ---- */
  function ridgeTex(seed, col, base, amp, treeCol) {
    const W = 512, H = 160, c = mkC(W, H), g = c.getContext('2d'), r = rngMaker(seed);
    const ks = [1, 2, 3, 5, 8], ph = ks.map(() => r() * 6.28), am = ks.map((k, i) => amp / (1 + i * 0.9));
    g.fillStyle = col;
    for (let x = 0; x < W; x += 4) {
      let y = base; ks.forEach((k, i) => { y += Math.sin((x / W) * 6.2832 * k + ph[i]) * am[i]; });
      y = Math.round(y / 4) * 4; g.fillRect(x, y, 4, H - y);
      if (treeCol && r() < 0.35) { g.fillStyle = treeCol; g.fillRect(x, y - 8, 4, 8); g.fillRect(x + 4 - 4, y - 12, 4, 4); g.fillStyle = col; }
    }
    const t = tex(c, true); t.repeat.set(2.4, 1); return t;
  }
  const bgDefs = [
    { z: -135, f: 0.93, h: 120, w: 420, y: 6 }, { z: -95, f: 0.86, h: 100, w: 340, y: -2 },
    { z: -66, f: 0.78, h: 84, w: 280, y: -8 }, { z: -46, f: 0.68, h: 72, w: 240, y: -14 },
  ];
  const bgGroup = new THREE.Group(); scene.add(bgGroup);
  bgDefs.forEach((d) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), new THREE.MeshBasicMaterial({ transparent: true, fog: false, depthWrite: false }));
    m.renderOrder = -10; m.position.z = d.z; d.mesh = m; bgGroup.add(m);
  });
  const clouds = [];
  { const rc = rngMaker(77);
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(12 + rc() * 10, 5 + rc() * 3), new THREE.MeshBasicMaterial({ map: TX.cloud, transparent: true, fog: false, depthWrite: false, opacity: 0.9 }));
      m.renderOrder = -8; m.userData = { ox: (rc() - 0.5) * 220, oy: rc() * 90 - 25, sp: 0.4 + rc() * 0.8, z: -40 - rc() * 40 }; m.position.z = m.userData.z; scene.add(m); clouds.push(m);
    }
  }

  /* ---------------------------------------------------------------- particles ---- */
  function makePoints(n, size, color) {
    const g = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3 + 1] = -9999; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 1; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false }));
    m.frustumCulled = false; scene.add(m); return { m, pos, col, n };
  }
  const PS = makePoints(220, 7); const PSd = []; for (let i = 0; i < PS.n; i++) PSd.push({ vx: 0, vy: 0, vz: 0, life: 0, g: 0 });
  let psHead = 0;
  function emit(x, y, z, vx, vy, hex, life, g) {
    const i = psHead; psHead = (psHead + 1) % PS.n; const d = PSd[i];
    PS.pos[i * 3] = x; PS.pos[i * 3 + 1] = y; PS.pos[i * 3 + 2] = z; d.vx = vx; d.vy = vy; d.vz = 0; d.life = life; d.g = g === undefined ? -8 : g;
    PS.col[i * 3] = ((hex >> 16) & 255) / 255; PS.col[i * 3 + 1] = ((hex >> 8) & 255) / 255; PS.col[i * 3 + 2] = (hex & 255) / 255;
  }
  function burst(x, y, n, hex, spd, up) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (0.4 + Math.random()) * spd; emit(x, y, 0.6, Math.cos(a) * s, Math.sin(a) * s + (up || 0), hex, 0.5 + Math.random() * 0.5); } }
  const PET = makePoints(70, 6); const petD = [];
  for (let i = 0; i < PET.n; i++) { petD.push({ ox: (Math.random() - 0.5) * 16, oy: Math.random() * 24 - 4, z: 2 + Math.random() * 12, sp: 0.6 + Math.random() * 1.2, ph: Math.random() * 6 }); const hx = [0xffb7d5, 0xffffff, 0xffe27a, 0xffa0a0][i % 4]; PET.col[i * 3] = ((hx >> 16) & 255) / 255; PET.col[i * 3 + 1] = ((hx >> 8) & 255) / 255; PET.col[i * 3 + 2] = (hx & 255) / 255; }

  /* ---------------------------------------------------------------- character ---- */
  const US = 0.024;
  const charGroup = new THREE.Group(); world.add(charGroup);
  function mkPart(map, w, h, px, py, z, k) {
    k = k || 1;
    const geo = new THREE.PlaneGeometry(w * US * k, h * US * k); geo.translate((w / 2 - px) * US * k, (py - h / 2) * US * k, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, fog: false }));
    m.position.z = z; charGroup.add(m); return m;
  }
  const part = {
    legB: mkPart(TX.leg, 16, 30, 7, 3, -0.03), armB: mkPart(TX.arm, 14, 28, 7, 4, -0.05), torso: mkPart(TX.torso, 40, 34, 20, 17, 0),
    legF: mkPart(TX.leg, 16, 30, 7, 3, -0.02), head: mkPart(TX.heads.neutral, 40, 37, 20, 18.5, 0.07, 0.86), armF: mkPart(TX.arm, 14, 28, 7, 4, 0.05),
  };
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16), new THREE.MeshBasicMaterial({ color: 0x1a0f2a, transparent: true, opacity: 0.35, depthWrite: false, fog: false }));
  shadow.rotation.x = -Math.PI / 2; world.add(shadow);
  const REST = { hipX: 0.15, hipY: 0.64, torsoY: 0.93, shX: 0.4, shY: 1.18, headY: 1.62, neckY: 1.28 };

  function applySkin(id) {
    const K = skinById(id), t = skinTex(K); SHOP.eq = K.id;
    part.torso.material.map = t.torso; part.armB.material.map = t.arm; part.armF.material.map = t.arm; part.legB.material.map = t.leg; part.legF.material.map = t.leg;
    [part.torso, part.armB, part.armF, part.legB, part.legF].forEach((m) => { m.material.needsUpdate = true; });
  }
  const PL = {
    x: 0, y: 0, vx: 0, vy: 0, face: 1, grounded: false, on: null, state: 'idle', st: 0, phase: 0, peakY: 0, coyote: 0, jbuf: 0, jumping: false,
    squash: 0, inv: 0, cp: 0, head: 'neutral', rag: null, stun: 0,
  };
  const inp = { left: false, right: false, jump: false, jumpPressed: false };
  const RG = {}; // ragdoll
  function poseParams() {
    const t = PL.st, s = PL.state; const o = { la: 0, ra: 0, ll: 0, rl: 0, tilt: 0, bob: 0, head: 'neutral', rot: 0, lift: 0, headTilt: 0 };
    if (s === 'idle') { const b = Math.sin(performance.now() / 400); o.la = 0.16 + b * 0.04; o.ra = -0.12 - b * 0.04; o.bob = b * 0.015; o.ll = 0.05; o.rl = -0.05; }
    else if (s === 'run') { const w = Math.sin(PL.phase); o.ll = w * 0.95; o.rl = -w * 0.95; o.la = -w * 0.95; o.ra = w * 0.95; o.bob = Math.abs(Math.cos(PL.phase)) * 0.09; o.tilt = -0.14; o.head = 'effort'; }
    else if (s === 'jump') { o.la = 2.55; o.ra = 2.3; o.ll = 0.7; o.rl = -0.35; o.head = 'effort'; o.tilt = -0.06; }
    else if (s === 'fall') { const f = Math.sin(PL.st * 20); o.la = 2.2 + f * 0.5; o.ra = 2.5 - f * 0.5; o.ll = Math.sin(PL.st * 16) * 0.8; o.rl = -Math.sin(PL.st * 16) * 0.8; o.head = 'hurt'; o.tilt = 0.1; }
    else if (s === 'hit') { o.la = 2.9; o.ra = 0.4; o.tilt = 0.22; o.head = 'hurt'; o.ll = 0.3; o.rl = -0.2; o.bob = Math.sin(t * 30) * 0.02; }
    else if (s === 'lie') { o.rot = -Math.PI / 2; o.lift = 0.44; o.la = 2.6; o.ra = 2.9; o.ll = 0.2; o.rl = -0.1; o.head = 'dizzy'; }
    else if (s === 'getup') { const k = clamp(t / 0.9, 0, 1); o.rot = -Math.PI / 2 * (1 - k) * (1 - k); o.lift = 0.44 * (1 - k); o.la = lerp(2.6, 0.4, k) + Math.sin(t * 14) * 0.3 * (1 - k); o.ra = lerp(2.9, -0.3, k); o.ll = lerp(0.2, 0, k); o.rl = lerp(-0.1, 0, k); o.head = k < 0.6 ? 'hurt' : 'effort'; o.bob = Math.abs(Math.sin(t * 12)) * 0.04 * (1 - k); }
    else if (s === 'win') { o.la = 2.7 + Math.sin(PL.st * 10) * 0.3; o.ra = 2.7 - Math.sin(PL.st * 10) * 0.3; o.head = 'effort'; o.bob = Math.abs(Math.sin(PL.st * 8)) * 0.18; o.ll = Math.sin(PL.st * 8) * 0.4; o.rl = -o.ll; }
    return o;
  }
  function setPartAnim(P, px, py) {
    const f = PL.face, sq = 1 - PL.squash * 0.3;
    charGroup.position.set(px, py + P.lift, 0); charGroup.rotation.z = P.rot * f; charGroup.scale.set(1 / sq, sq, 1);
    const place = (m, lx, ly, rot) => { m.position.x = f * lx; m.position.y = ly; m.scale.x = f; m.rotation.z = f * rot; };
    place(part.torso, 0, REST.torsoY + P.bob, P.tilt);
    // lean pivots roughly around hips
    const lean = (lx, ly) => [lx * Math.cos(P.tilt) - (ly - REST.hipY) * Math.sin(P.tilt), (ly - REST.hipY) * Math.cos(P.tilt) + lx * Math.sin(P.tilt) + REST.hipY + P.bob];
    const sB = lean(-REST.shX * 0.9, REST.shY), sF = lean(REST.shX * 0.9, REST.shY), hd = lean(0.03, REST.headY);
    place(part.legB, -REST.hipX, REST.hipY + P.bob * 0.3, P.rl); place(part.legF, REST.hipX, REST.hipY + P.bob * 0.3, P.ll);
    place(part.armB, sB[0], sB[1], P.ra + P.tilt); place(part.armF, sF[0], sF[1], P.la + P.tilt);
    place(part.head, hd[0], hd[1], P.tilt * 1.2 + P.headTilt);
    if (PL.head !== P.head) { part.head.material.map = TX.heads[P.head]; part.head.material.needsUpdate = true; PL.head = P.head; }
  }

  /* ---------------------------------------------------------------- ragdoll physics ---- */
  const solidsActive = () => LV.solids.filter((s) => !s.gone);
  function circleVsSolids(b, r, bounce, fric) {
    let hit = null;
    for (const s of LV.solids) {
      if (s.gone) continue;
      if (b.x + r <= s.x0 || b.x - r >= s.x1 || b.y + r <= s.y0 || b.y - r >= s.y1) continue;
      const cx = clamp(b.x, s.x0, s.x1), cy = clamp(b.y, s.y0, s.y1); let dx = b.x - cx, dy = b.y - cy, nx, ny, pen;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); if (d >= r) continue; nx = dx / d; ny = dy / d; pen = r - d; }
      else {
        const l = b.x - s.x0, rg = s.x1 - b.x, bt = b.y - s.y0, tp = s.y1 - b.y, m = Math.min(l, rg, bt, tp);
        if (m === tp) { nx = 0; ny = 1; pen = tp + r; } else if (m === bt) { nx = 0; ny = -1; pen = bt + r; } else if (m === l) { nx = -1; ny = 0; pen = l + r; } else { nx = 1; ny = 0; pen = rg + r; }
      }
      b.x += nx * pen; b.y += ny * pen;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + bounce) * vn * nx; b.vy -= (1 + bounce) * vn * ny;
        const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty; b.vx -= vt * fric * tx; b.vy -= vt * fric * ty;
        hit = { nx, ny, vn, vt }; if (s.vxm) b.x += s.vxm;
      }
    }
    return hit;
  }
  function startRagdoll(kind, lx, ly) {
    if (PL.state === 'ragdoll') return;
    const f = PL.face, x = PL.x, y = PL.y;
    PL.state = 'ragdoll'; PL.st = 0; PL.rag = { kind, t: 0, still: 0, void: kind === 'void' || kind === 'burn', sounded: false };
    const T0 = { x, y: y + REST.torsoY, vx: lx, vy: ly, a: 0, w: -f * (3 + Math.random() * 3), r: 0.42, vn: 0 };
    RG.torso = T0;
    const mk = (ax, ay, len, r) => ({ x: x + ax, y: y + ay - len * 0.5, vx: lx * 0.7 + (Math.random() - 0.5) * 5, vy: ly * 0.7 + Math.random() * 4, len, r });
    RG.head = mk(0, REST.headY - 0.1, 0.36, 0.28); RG.head.y = y + REST.headY;
    RG.aL = mk(-REST.shX, REST.shY, 0.55, 0.15); RG.aR = mk(REST.shX, REST.shY, 0.55, 0.15);
    RG.lL = mk(-REST.hipX, REST.hipY, 0.62, 0.17); RG.lR = mk(REST.hipX, REST.hipY, 0.62, 0.17);
    PL.head = 'x'; part.head.material.map = TX.heads.hurt; PL.head = 'hurt';
    charGroup.position.set(0, 0, 0); charGroup.rotation.z = 0; charGroup.scale.set(1, 1, 1);
    pop(kind === 'rock' ? T('wow') : kind === 'void' ? T('aaah') : (kind === 'lava' || kind === 'burn') ? T('hot') : T('aduh'));
    Snd.fx('hit'); hap('thud'); shake = 0.9; PL.falls = (PL.falls || 0) + 1; hudDirty = true;
  }
  function anchorOf(lx, ly) { const T0 = RG.torso, c = Math.cos(T0.a), s = Math.sin(T0.a); return [T0.x + lx * c - ly * s, T0.y + lx * s + ly * c]; }
  function stepRagdoll(dt) {
    const g = CFG.grav() * 0.9, T0 = RG.torso, rg = PL.rag; rg.t += dt;
    T0.vy -= g * dt; T0.x += T0.vx * dt; T0.y += T0.vy * dt; T0.a += T0.w * dt; T0.w *= (1 - 0.35 * dt);
    const h = circleVsSolids(T0, T0.r, 0.38, 0.12);
    let touching = false;
    if (h) { touching = h.ny > 0.5; T0.w += (-h.vt / T0.r) * 0.35; T0.w = clamp(T0.w, -14, 14); if (-h.vn > 4) { if (!rg.sounded || -h.vn > 9) { Snd.fx('land'); if (-h.vn > 6) hap('tap'); } rg.sounded = true; burst(T0.x, T0.y - T0.r, 5, 0xe8d6b0, 3, 1.5); } }
    const link = (p, ax, ay, rest, damp) => {
      p.vy -= g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= (1 - damp * dt); p.vy *= (1 - damp * dt);
      circleVsSolids(p, p.r, 0.3, 0.3);
      let dx = p.x - ax, dy = p.y - ay; const d = Math.hypot(dx, dy) || 1e-5;
      if (d > p.len) { const k = p.len / d, nx = ax + dx * k, ny = ay + dy * k; const cvx = (nx - p.x) / dt, cvy = (ny - p.y) / dt; p.x = nx; p.y = ny; p.vx += cvx * 0.5; p.vy += cvy * 0.5; }
      const dvx = p.vx - T0.vx, dvy = p.vy - T0.vy; if (d >= p.len * 0.98) { T0.vx += dvx * 0.012; T0.vy += dvy * 0.012; }
    };
    let a;
    a = anchorOf(-REST.shX, REST.shY - REST.torsoY); link(RG.aL, a[0], a[1], 0.55, 1.5);
    a = anchorOf(REST.shX, REST.shY - REST.torsoY); link(RG.aR, a[0], a[1], 0.55, 1.5);
    a = anchorOf(-REST.hipX, REST.hipY - REST.torsoY); link(RG.lL, a[0], a[1], 0.62, 1.5);
    a = anchorOf(REST.hipX, REST.hipY - REST.torsoY); link(RG.lR, a[0], a[1], 0.62, 1.5);
    a = anchorOf(0, REST.neckY - REST.torsoY); link(RG.head, a[0], a[1], 0.36, 1.0);
    const sp = Math.hypot(T0.vx, T0.vy);
    if (touching && sp < 1.0 && Math.abs(T0.w) < 2.2) rg.still += dt; else rg.still = 0;
    PL.x = T0.x; PL.y = T0.y;
    if (rg.void) { if (rg.t > 1.25) respawn(); return; }
    if (rg.still > 0.35 || rg.t > 5) {
      // settle: find ground under torso
      let gy = null; for (const s of LV.solids) { if (s.gone) continue; if (T0.x > s.x0 - 0.1 && T0.x < s.x1 + 0.1 && s.y1 <= T0.y + 0.6) { if (gy === null || s.y1 > gy) gy = s.y1; } }
      PL.x = T0.x; PL.y = gy === null ? T0.y - T0.r : gy; PL.vx = PL.vy = 0; PL.state = 'lie'; PL.st = 0; PL.grounded = true; PL.rag = null; PL.peakY = PL.y;
    }
  }
  function renderRagdoll() {
    const T0 = RG.torso;
    const setP = (m, x, y, rot, sx) => { m.position.set(x, y, m.position.z); m.rotation.z = rot; m.scale.set(sx || 1, 1, 1); };
    const f = PL.face;
    setP(part.torso, T0.x, T0.y, T0.a, f);
    const limb = (m, p, ax, ay) => setP(m, ax, ay, Math.atan2(p.x - ax, -(p.y - ay)), f);
    let a = anchorOf(-REST.shX, REST.shY - REST.torsoY); limb(part.armB, RG.aL, a[0], a[1]);
    a = anchorOf(REST.shX, REST.shY - REST.torsoY); limb(part.armF, RG.aR, a[0], a[1]);
    a = anchorOf(-REST.hipX, REST.hipY - REST.torsoY); limb(part.legB, RG.lL, a[0], a[1]);
    a = anchorOf(REST.hipX, REST.hipY - REST.torsoY); limb(part.legF, RG.lR, a[0], a[1]);
    a = anchorOf(0, REST.neckY - REST.torsoY);
    setP(part.head, RG.head.x, RG.head.y, Math.atan2(-(RG.head.x - a[0]), RG.head.y - a[1]), f);
  }

  /* ---------------------------------------------------------------- game state ---- */
  const G = { mode: 'menu', time: 0, coins: 0, maxH: 0, score: 0, best: 0, save: null, hasSave: false, paused: false, won: false, rockT: 6, rocks: [], hintShown: false, firstJump: false };
  let shake = 0, hudDirty = true, saveTimer = 0, lastSaveJson = '', fadeT = 0;

  function pop(text) {
    const d = document.createElement('div'); d.className = 'pop'; d.textContent = text;
    const v = new THREE.Vector3(PL.x, PL.y + 2.4, 0).project(camera); d.style.left = clamp((v.x * 0.5 + 0.5) * 720, 120, 600) + 'px'; d.style.top = clamp((-v.y * 0.5 + 0.5) * 1280, 160, 1100) + 'px';
    ui.appendChild(d); setTimeout(() => d.remove(), 1200);
  }
  let toastT = 0;
  function toast(txt, sec) { const t = $('toast'); if (!t) return; t.textContent = txt; t.classList.add('on'); toastT = sec || 1.6; }

  function respawn() {
    const f = LV.flags[PL.cp - 1]; const p = f ? { x: f.x, y: f.y } : LV.start;
    PL.x = p.x; PL.y = p.y; PL.vx = PL.vy = 0; PL.state = 'getup'; PL.st = 0; PL.rag = null; PL.grounded = true; PL.peakY = p.y; PL.inv = 1.2; PL.stun = 0;
    $('fade').style.opacity = '1'; fadeT = 0.25; camSnap = true;
    LV.crumbles.forEach((s) => { s.state = 'ok'; s.gone = false; s.mesh.visible = true; s.mesh.position.copy(s.home); s.t = 0; });
  }
  let camSnap = true;

  /* ---------------------------------------------------------------- player update ---- */
  function movers(dt, t) {
    LV.movers.forEach((m) => {
      const nx = m.cx + Math.sin(t * m.sp + m.ph) * m.ax, ny = m.cy + Math.sin(t * m.sp + m.ph) * m.ay;
      const dx = nx - m.px, dy = ny - m.py; m.px = nx; m.py = ny; m.x0 = nx - m.w / 2; m.x1 = nx + m.w / 2; m.y1 = ny + m.h / 2; m.y0 = ny - m.h / 2; m.mesh.position.set(nx, ny, 0); m.vxm = dx;
      if (PL.on === m && PL.grounded) { PL.x += dx; PL.y += dy; }
    });
  }
  const overlap = (s) => PL.x - PLAYERW / 2 < s.x1 - 0.0005 && PL.x + PLAYERW / 2 > s.x0 + 0.0005 && PL.y < s.y1 - 0.001 && PL.y + PLAYERH > s.y0 + 0.001;
  function windV(p) {
    if (!LV.winds.length || !C('hazards.windOn', true)) return 0; let v = 0;
    for (const w of LV.winds) { if (w.act && p.x > w.x0 && p.x < w.x1 && p.y + 1.0 > w.y0 && p.y < w.y1) v += w.v; }
    return v;
  }
  function updateHazards(dt, t) {
    const live = G.mode === 'play' && !G.paused && PL.inv <= 0 && PL.state !== 'ragdoll' && PL.state !== 'lie' && PL.state !== 'getup' && PL.state !== 'win';
    LV.winds.forEach((w) => {
      const cyc = w.on + w.off, ph = (t + w.ph) % cyc; w.act = ph < w.on; w.pre = !w.act && ph > cyc - 0.9;
      if ((w.act || w.pre) && Math.abs(cam.x - (w.x0 + w.x1) / 2) < 16 && Math.random() < (w.act ? 0.7 : 0.2)) emit(lerp(w.x0, w.x1, Math.random()), lerp(w.y0, w.y1, Math.random()), 0.8, (w.v > 0 ? 1 : -1) * (w.act ? 9 : 3), 0, 0xffffff, 0.6, 0);
    });
    const gon = C('hazards.geyserOn', true);
    LV.geysers.forEach((g) => {
      const near = Math.abs(g.x - cam.x) < 14 && Math.abs(g.y0 + g.h - cam.y) < 22;
      const ph = (t + g.ph) % g.period; let st = 'idle'; if (gon) { if (ph < g.warn) st = 'warn'; else if (ph < g.warn + g.erupt) st = 'erupt'; }
      g.state = st; const m = g.mesh; m.visible = st !== 'idle' && near;
      if (st === 'warn') { m.material.opacity = 0.22 + 0.12 * Math.sin(t * 28); m.scale.x = 0.3; }
      else if (st === 'erupt') { m.material.opacity = 0.95; m.scale.x = 1; m.material.map.offset.y -= dt * 2.5; if (near && Math.random() < 0.5) emit(g.x + (Math.random() - 0.5), g.y0 + g.h, 0.6, (Math.random() - 0.5) * 3, 3 + Math.random() * 3, 0xffb347, 0.7, -8); }
      if (live && st === 'erupt' && Math.abs(PL.x - g.x) < 0.7 + PLAYERW / 2 && PL.y < g.y0 + g.h && PL.y + PLAYERH > g.y0) {
        PL.face = PL.x >= g.x ? -1 : 1; startRagdoll('lava', (PL.x >= g.x ? 1 : -1) * 4, 15); burst(PL.x, PL.y + 1, 14, 0xff8a2a, 6, 3);
      }
    });
    if (LV.lava) LV.lava.mesh.material.map.offset.x += dt * 0.04;
  }
  function stepPlayer(dt) {
    const p = PL; const control = p.state === 'idle' || p.state === 'run' || p.state === 'jump' || p.state === 'fall';
    const ax = control ? (inp.right ? 1 : 0) - (inp.left ? 1 : 0) : 0;
    const target = ax * CFG.run();
    const slip = p.grounded && p.on && p.on.slip && C('hazards.iceSlip', true);
    const acc = slip ? (ax === 0 ? 4.5 : 15) : (p.grounded ? 70 : 44 * CFG.air());
    p.vx = approach(p.vx, target, acc * dt * (p.grounded && ax === 0 && !slip ? 1.1 : 1));
    if (ax) p.face = ax;
    if (inp.jumpPressed) { p.jbuf = CFG.buf(); inp.jumpPressed = false; }
    p.jbuf -= dt; p.coyote = p.grounded ? CFG.coyote() : p.coyote - dt;
    if (control && p.jbuf > 0 && p.coyote > 0) { p.vy = CFG.jump(); p.grounded = false; p.coyote = 0; p.jbuf = 0; p.jumping = true; p.squash = -0.5; Snd.fx('jump'); hap('tick'); G.firstJump = true; burst(p.x, p.y, 4, 0xf3e3c0, 2, 0.5); }
    if (p.jumping && !inp.jump && p.vy > 4) { p.vy *= 0.55; p.jumping = false; }
    if (p.vy <= 0) p.jumping = false;
    p.vy -= CFG.grav() * (p.vy < 0 ? 1.2 : 1) * dt; p.vy = Math.max(p.vy, -38);
    const was = p.grounded;
    // move X
    p.x += (p.vx + windV(p)) * dt;
    for (const s of LV.solids) {
      if (s.gone || !overlap(s)) continue;
      const rise = s.y1 - p.y;
      if (rise > 0 && rise <= 0.42 && p.vy <= 0.5 && !LV.solids.some((o) => o !== s && !o.gone && o.x0 < p.x + PLAYERW / 2 && o.x1 > p.x - PLAYERW / 2 && o.y0 < s.y1 + PLAYERH && o.y1 > s.y1 + 0.2 && o.y0 >= s.y1 - 0.01 && o.y0 < s.y1 + PLAYERH)) { p.y = s.y1; continue; }
      if (p.vx > 0 || (p.vx === 0 && p.x < (s.x0 + s.x1) / 2)) p.x = s.x0 - PLAYERW / 2; else p.x = s.x1 + PLAYERW / 2;
      p.vx = 0;
    }
    // move Y
    p.y += p.vy * dt; p.grounded = false; p.on = null;
    for (const s of LV.solids) {
      if (s.gone || !overlap(s)) continue;
      if (p.vy <= 0.001 && p.y + 0.0001 >= s.y1 - Math.max(0.35, -p.vy * dt + 0.05)) { p.y = s.y1; p.grounded = true; p.on = s; }
      else if (p.vy > 0) { p.y = s.y0 - PLAYERH; p.vy = 0; p.jumping = false; }
    }
    if (p.grounded) {
      const imp = p.vy; p.vy = 0;
      if (!was) onLand(imp);
      if (p.on && p.on.spring) { p.vy = CFG.jump() * 1.55; p.grounded = false; p.on.sq = 1; p.squash = 0.4; Snd.fx('boing'); hap('tap'); burst(p.x, p.y, 6, 0xff7a9a, 3, 1); p.peakY = p.y; p.on = null; }
      else if (p.on && p.on.crumble && p.on.state === 'ok') { p.on.state = 'shake'; p.on.t = 0; }
      p.peakY = p.y;
    } else {
      p.peakY = Math.max(p.peakY, p.y);
      // probe ground slightly below for moving platforms
    }
    // state
    if (control) {
      if (p.grounded) { p.state = Math.abs(p.vx) > 0.6 ? 'run' : 'idle'; p.phase += Math.abs(p.vx) * dt * 2.4; }
      else p.state = p.vy > 1 ? 'jump' : 'fall';
    }
    if (p.stun > 0) { p.stun -= dt; if (p.stun <= 0 && p.state === 'hit') p.state = 'idle'; }
  }
  function onLand(imp) {
    const p = PL, drop = p.peakY - p.y;
    p.squash = clamp(-imp / 40, 0.15, 0.6); p.vx *= 0.6;
    if (drop >= CFG.bigFall() && p.inv <= 0) { startRagdoll('fall', p.face * 3.5, 6); return; }
    if (drop >= CFG.smallFall() && p.inv <= 0) { p.state = 'hit'; p.st = 0; p.stun = 0.4; p.vx = 0; Snd.fx('hit'); hap('thud'); shake = 0.4; burst(p.x, p.y, 8, 0xe8d6b0, 3, 1.5); pop(T('ouch')); return; }
    if (drop > 0.4) { Snd.fx('land'); burst(p.x, p.y, 4, 0xe8d6b0, 2, 0.8); if (drop > 2) hap('tap'); }
  }

  /* ---------------------------------------------------------------- hazards & pickups ---- */
  const rockSprites = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: TX.rock, transparent: true, alphaTest: 0.4, fog: false })); m.visible = false; world.add(m);
    const mk = new THREE.Mesh(new THREE.CircleGeometry(1.0, 20), new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.45, depthWrite: false, fog: false })); mk.rotation.x = -Math.PI / 2; mk.visible = false; world.add(mk);
    rockSprites.push({ m, mk, on: false, x: 0, y: 0, ly: 0, vy: 0, spin: 0, warn: 0 });
  }
  function groundBelow(x, fromY) { let best = null; for (const s of LV.solids) { if (s.gone || s.type === 'mover') continue; if (x > s.x0 && x < s.x1 && s.y1 <= fromY) { if (best === null || s.y1 > best) best = s.y1; } } return best; }
  function spawnRock() {
    const rk = rockSprites.find((r) => !r.on); if (!rk) return;
    for (let tries = 0; tries < 6; tries++) {
      const x = PL.x + PL.vx * 0.55 + (Math.random() - 0.5) * 5; const ly = groundBelow(x, PL.y + 12); if (ly === null || ly < PL.y - 10) continue;
      rk.on = true; rk.x = x; rk.ly = ly + 0.85; rk.y = rk.ly + 15; rk.vy = 0; rk.warn = 0; rk.m.visible = true; rk.mk.visible = true; rk.mk.position.set(x, ly + 0.05, 0.3); Snd.fx('warn'); return;
    }
  }
  function updateRocks(dt) {
    const active = PL.y > LV.rocksFromY && G.mode === 'play' && !G.won && PL.state !== 'ragdoll' && PL.state !== 'lie' && PL.state !== 'getup';
    if (active) { G.rockT -= dt; if (G.rockT <= 0) { G.rockT = CFG.rockEvery() * (0.75 + Math.random() * 0.5) * (PL.y > LV.topY * 0.7 ? 0.8 : 1); spawnRock(); } }
    rockSprites.forEach((rk) => {
      if (!rk.on) return;
      rk.warn += dt; rk.vy = Math.min(CFG.rockFall() * 1.3, rk.vy + 28 * dt); rk.y -= rk.vy * dt; rk.spin += dt * 4;
      rk.m.position.set(rk.x, rk.y, 0.2); rk.m.rotation.z = Math.sin(rk.spin) * 0.5;
      const pulse = 0.35 + Math.abs(Math.sin(rk.warn * 10)) * 0.35; rk.mk.material.opacity = pulse; const sc = clamp(1.4 - (rk.y - rk.ly) / 14, 0.5, 1.2); rk.mk.scale.set(sc, sc, sc);
      if (PL.inv <= 0 && PL.state !== 'ragdoll' && PL.state !== 'lie' && PL.state !== 'getup' && Math.abs(rk.x - PL.x) < 0.85 && rk.y - 0.8 < PL.y + PLAYERH && rk.y + 0.8 > PL.y) {
        const d = PL.x >= rk.x ? 1 : -1; PL.face = -d; startRagdoll('rock', d * 7, 11); Snd.fx('rock'); burst(rk.x, rk.y, 12, 0x9aa0b8, 6, 3); rk.on = false; rk.m.visible = false; rk.mk.visible = false; return;
      }
      if (rk.y <= rk.ly) { rk.on = false; rk.m.visible = false; rk.mk.visible = false; Snd.fx('rock'); burst(rk.x, rk.ly - 0.6, 10, 0xb9b0a0, 4, 2); shake = Math.max(shake, 0.25); if (Math.abs(PL.x - rk.x) < 14) hap('tap'); }
    });
  }
  function updateCoins(dt, t) {
    for (let i = 0; i < LV.coins.length; i++) {
      const c = LV.coins[i];
      if (!coinGot[i] && PL.state !== 'ragdoll' && Math.abs(c.x - PL.x) < 0.8 && c.y > PL.y - 0.4 && c.y < PL.y + PLAYERH + 0.4) { coinGot[i] = 1; G.coins++; SHOP.wallet++; hudDirty = true; Snd.fx('coin'); hap('tick'); burst(c.x, c.y, 6, 0xffe27a, 3, 1.5); }
      const vis = coinGot[i] ? 0 : 1, sx = Math.cos(t * 4 + i) * 0.9 + 0.1 * Math.sign(Math.cos(t * 4 + i) || 1);
      dummy.position.set(c.x, c.y + Math.sin(t * 3 + i) * 0.08, 0.3); dummy.scale.set(vis * sx, vis, vis); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); coinMesh.setMatrixAt(i, dummy.matrix);
    }
    coinMesh.instanceMatrix.needsUpdate = true;
  }
  function updateFlags(t) {
    LV.flags.forEach((f) => {
      f.cloth.rotation.y = Math.sin(t * 4 + f.id) * 0.25; f.cloth.scale.x = 0.85 + Math.sin(t * 5 + f.id) * 0.12;
      if (!f.on && G.mode === 'play' && PL.state !== 'ragdoll' && Math.abs(PL.x - f.x) < 1.2 && Math.abs(PL.y - f.y) < 2.5) {
        f.on = true; f.cloth.material.map = TX.flagOn; f.cloth.material.needsUpdate = true;
        if (f.id > PL.cp) { PL.cp = f.id; saveNow(); toast(T('checkpoint'), 1.4); Snd.fx('cp'); hap('success'); burst(f.x, f.y + 2.5, 22, 0xffd25a, 5, 2); }
      }
    });
  }
  function updateCrumbles(dt) {
    LV.crumbles.forEach((s) => {
      if (s.state === 'shake') { s.t += dt; s.mesh.position.x = s.home.x + Math.sin(s.t * 60) * 0.06; if (s.t > CFG.crumble()) { s.state = 'fall'; s.t = 0; s.gone = true; Snd.fx('crumble'); burst(s.home.x, s.home.y, 12, 0x9aa0b8, 4, 1); } }
      else if (s.state === 'fall') { s.t += dt; s.mesh.position.y = s.home.y - s.t * s.t * 20; if (s.t > 0.9) s.mesh.visible = false; if (s.t > 3.2 && !overlap(s)) { s.state = 'ok'; s.gone = false; s.mesh.visible = true; s.mesh.position.copy(s.home); s.t = 0; } }
    });
    LV.springs.forEach((s) => { s.sq = Math.max(0, s.sq - dt * 4); s.top.scale.y = 1 - s.sq * 0.6; s.top.position.y = 0.2 - s.sq * 0.1; });
  }

  /* ---------------------------------------------------------------- UI ---- */
  const h = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
  const scr = {};
  function mkScreen(id, html) { const d = h('<div class="scr" id="s-' + id + '">' + html + '</div>'); ui.appendChild(d); scr[id] = d; return d; }
  function show(id) { Object.keys(scr).forEach((k) => scr[k].classList.toggle('on', k === id || (Array.isArray(id) && id.includes(k)))); }
  function showMany(list) { Object.keys(scr).forEach((k) => scr[k].classList.toggle('on', list.includes(k))); }

  mkScreen('menu', `<div class="title" id="title1">RAGDOLL</div><div class="title" id="title2">SUMMIT RUSH</div>
    <div class="chip" id="m-best" style="left:50%;transform:translateX(-50%);top:36px"></div>
    <div class="btn" id="b-play" style="left:110px;width:500px;height:150px;top:790px">▶ PLAY</div>
    <div class="btn sec" id="b-new" style="left:40px;width:320px;height:90px;top:970px;font-size:34px;display:none">CONTINUE</div>
    <div class="btn sec" id="b-shop" style="left:380px;width:300px;height:90px;top:970px;font-size:34px">🛍 SHOP</div>
    <div class="ico" id="i-snd" style="left:36px;top:1110px">🔊</div><div class="ico" id="i-lang" style="left:170px;top:1110px;font-size:36px">EN</div>
    <div class="ico" id="i-q" style="left:304px;top:1110px;font-size:34px">AUTO</div><div class="ico" id="i-help" style="left:438px;top:1110px">❓</div>
    <div class="ico" id="i-lb" style="left:572px;top:1110px">🏆</div>`);
  mkScreen('hud', `<div class="chip" id="hud-m">⛰ <span id="v-m">0</span>m</div><div class="chip" id="hud-c">🪙 <span id="v-c">0</span></div>
    <div class="chip" id="hud-f">💥 <span id="v-f">0</span></div>
    <div class="ico" id="b-pause" style="right:24px;top:24px">⏸</div>
    <div id="rail"><div id="knob"></div></div>
    <div id="toast"></div>
    <div class="ctl" id="c-l" style="left:24px">◀</div><div class="ctl" id="c-r" style="left:196px">▶</div>
    <div class="ctl" id="c-j" style="right:28px;width:200px;height:200px;border-radius:60px;font-size:80px;bottom:30px">⬆</div>`);
  mkScreen('pause', `<div class="dim"></div><div class="panel" style="top:320px"><h2><span data-t="paused"></span></h2>
    <div class="btn" id="p-resume" style="position:relative;height:120px;margin:10px 0 30px;font-size:52px">▶ <span data-t="resume"></span></div>
    <div class="btn sec" id="p-cp" style="position:relative;height:96px;margin:0 0 26px;font-size:36px">↺ <span data-t="toCheckpoint"></span></div>
    <div class="btn sec" id="p-menu" style="position:relative;height:96px;font-size:36px">⌂ <span data-t="menu"></span></div></div>`);
  mkScreen('win', `<div class="dim"></div><div class="panel" style="top:240px"><h2>🏔 <span data-t="summit"></span></h2>
    <div class="row3"><span>⛰ <span data-t="height"></span></span><b id="w-h">0</b></div><div class="row3"><span>🪙 <span data-t="coins"></span></span><b id="w-c">0</b></div><div class="row3"><span>💥 <span data-t="falls"></span></span><b id="w-f">0</b></div><div class="row3"><span>⏱ <span data-t="time"></span></span><b id="w-t">0</b></div>
    <div class="row3" style="font-size:54px;color:var(--gold);margin:22px 0"><span data-t="score"></span><b id="w-s">0</b></div>
    <div class="btn" id="w-again" style="position:relative;height:120px;margin:10px 0 24px;font-size:48px">↻ <span data-t="again"></span></div>
    <div class="btn sec" id="w-menu" style="position:relative;height:90px;font-size:34px">⌂ <span data-t="menu"></span></div></div>`);
  mkScreen('lb', `<div class="dim"></div><div class="panel" style="top:150px;bottom:150px"><h2>🏆 <span data-t="leaderboard"></span></h2><div id="lb-list" style="height:760px;overflow:hidden"></div>
    <div class="btn sec" id="lb-close" style="position:absolute;left:30px;right:30px;bottom:26px;height:96px;font-size:40px">✕ <span data-t="close"></span></div></div>`);
  mkScreen('help', `<div class="dim"></div><div class="panel" style="top:170px"><h2>❓ <span data-t="help"></span></h2>
    <div class="help"><i>◀ ▶</i><span data-t="h_run"></span></div><div class="help"><i>⬆</i><span data-t="h_jump"></span></div>
    <div class="help"><i>🪨</i><span data-t="h_rock"></span></div><div class="help"><i>🚩</i><span data-t="h_flag"></span></div><div class="help"><i>🏔</i><span data-t="h_summit"></span></div>
    <div class="btn" id="h-close" style="position:relative;height:100px;margin-top:20px;font-size:44px"><span data-t="ok"></span></div></div>`);
  mkScreen('lang', `<div class="dim" id="lang-dim"></div><div class="panel" style="top:300px"><h2>🌐 <span data-t="language"></span></h2>
    <div class="btn sec lg" data-l="en" style="position:relative;height:110px;margin:0 0 24px;font-size:44px">English</div>
    <div class="btn sec lg" data-l="id" style="position:relative;height:110px;margin:0 0 24px;font-size:44px">Bahasa Indonesia</div>
    <div class="btn sec lg" data-l="ar" style="position:relative;height:110px;font-size:48px">العربية</div></div>`);

  mkScreen('shop', `<div class="dim" style="background:rgba(18,8,32,.95)"></div>
    <div class="title" id="s-title" style="top:44px;font-size:76px;-webkit-text-stroke:10px var(--ink)">🛍 <span data-t="shop"></span></div>
    <div class="ico" id="s-back" style="left:24px;top:24px">⌂</div>
    <div class="chip" id="s-wallet" style="right:24px;top:24px;height:70px;font-size:32px;padding:0 18px">🪙 <span id="s-coins">0</span></div>
    <div id="s-prev"><canvas id="s-pv" width="84" height="92"></canvas></div>
    <div class="title" id="s-name" style="top:665px;font-size:50px;-webkit-text-stroke:9px var(--ink);color:#ffcf3f"></div>
    <div class="btn" id="s-act" style="left:140px;width:440px;height:100px;top:755px;font-size:42px"></div>
    <div id="s-grid"></div>`);
  mkScreen('gacha', `<div class="dim"></div>
    <div class="title" id="g-title" style="top:120px;font-size:92px;-webkit-text-stroke:12px var(--ink)" data-t="randomMap"></div>
    <div id="g-win"><div id="g-strip"></div><div id="g-frame"></div></div>
    <div class="title" id="g-name" style="top:800px;font-size:58px;-webkit-text-stroke:10px var(--ink);color:#ffcf3f"></div>
    <div class="btn" id="g-go" style="left:110px;width:500px;height:130px;top:915px;display:none">▶ <span data-t="go"></span></div>
    <div class="btn sec" id="g-again" style="left:150px;width:420px;height:96px;top:1075px;font-size:38px;display:none">🎲 <span data-t="spinAgain"></span></div>
    <div class="ico" id="g-back" style="left:30px;top:30px">⌂</div>`);
  const press = (el, fn) => { el.addEventListener('click', (e) => { e.stopPropagation(); Snd.init(); Snd.fx('ui'); fn(e); }); };
  function holdBtn(el, key) {
    const on = (e) => { e.preventDefault(); inp[key] = true; if (key === 'jump') inp.jumpPressed = true; el.classList.add('dn'); try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } };
    const off = () => { inp[key] = false; el.classList.remove('dn'); };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off); el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  holdBtn($('c-l'), 'left'); holdBtn($('c-r'), 'right'); holdBtn($('c-j'), 'jump');
  const keymap = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump' };
  listen(window, 'keydown', (e) => {
    const k = keymap[e.code]; if (k) { e.preventDefault(); if (k === 'jump' && !inp.jump) inp.jumpPressed = true; inp[k] = true; }
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { if (G.mode === 'play') doPause(!G.paused); }
    if ((e.code === 'Enter') && G.mode === 'menu' && !scr.lb.classList.contains('on') && !scr.help.classList.contains('on')) openGacha();
  });
  listen(window, 'keyup', (e) => { const k = keymap[e.code]; if (k) { inp[k] = false; } });
  listen(window, 'blur', () => { inp.left = inp.right = inp.jump = false; if (G.mode === 'play' && !G.won) doPause(true); });
  listen(document, 'visibilitychange', () => { if (document.hidden && G.mode === 'play' && !G.won) doPause(true); });

  function refreshMenu() {
    const bst = G.save && G.save.best ? G.save.best : 0;
    $('m-best').textContent = bst ? '🏆 ' + bst : '⛰ ' + tr('tagline');
    $('b-play').innerHTML = '▶ ' + tr('play');
    $('i-lang').textContent = LANG.toUpperCase();
    $('b-new').innerHTML = '↻ ' + tr('continue') + ' ' + ((G.save && MAPS[G.save.map]) ? MAPS[G.save.map].icon : '');
    $('b-new').style.display = G.hasSave ? 'flex' : 'none';
    $('b-shop').innerHTML = '🛍 ' + tr('shop'); $('b-shop').style.left = G.hasSave ? '380px' : '210px';
    $('i-snd').textContent = Snd.isMuted() ? '🔇' : '🔊';
    $('i-q').textContent = state.tierPref === 'auto' ? 'AUTO' : state.tierPref === 'low' ? 'LOW' : state.tierPref === 'mid' ? 'MED' : 'HIGH';
  }
  function applyLang() {
    document.documentElement.lang = LANG; app.classList.toggle('ar', LANG === 'ar');
    ui.querySelectorAll('[data-t]').forEach((el) => { el.textContent = tr(el.dataset.t); });
    ui.querySelectorAll('.lg').forEach((el) => el.classList.toggle('sel', el.dataset.l === LANG));
    ui.querySelectorAll('#g-strip .gl').forEach((el) => { el.textContent = MAPS[el.dataset.m].icon + ' ' + mapName(el.dataset.m); });
    drawSign(); TX.sign.needsUpdate = true; refreshMenu(); if (SHOPSEL.built) renderShop();
    if (GACHA.landed) $('g-name').textContent = MAPS[GACHA.target].icon + ' ' + mapName(GACHA.target);
  }
  function setLang(l) { LANG = I18N[l] ? l : 'en'; applyLang(); saveNow(); }
  function setMenu() { G.mode = 'menu'; Snd.music(false); showMany(['menu']); refreshMenu(); app.classList.remove('playing'); }
  press($('b-play'), () => openGacha()); press($('b-new'), () => startGame(false));
  press($('i-snd'), () => { Snd.setMuted(!Snd.isMuted()); state.muted = Snd.isMuted(); refreshMenu(); saveNow(); });
  press($('i-q'), () => { const o = ['auto', 'low', 'mid', 'high']; state.tierPref = o[(o.indexOf(state.tierPref) + 1) % 4]; applyTier(); refreshMenu(); saveNow(); });
  press($('i-lang'), () => showMany(['menu', 'lang'])); ui.querySelectorAll('.lg').forEach((b) => press(b, () => { setLang(b.dataset.l); showMany(['menu']); }));
  $('lang-dim').addEventListener('click', () => showMany(['menu']));
  press($('i-help'), () => showMany(['menu', 'help'])); press($('h-close'), () => showMany(G.mode === 'menu' ? ['menu'] : ['hud']));
  press($('i-lb'), () => openLb('menu')); press($('lb-close'), () => showMany(G.mode === 'menu' ? ['menu'] : G.won ? ['win'] : ['hud']));
  press($('b-pause'), () => doPause(true)); press($('p-resume'), () => doPause(false));
  press($('p-cp'), () => { doPause(false); respawnNow(); }); press($('p-menu'), () => { endRun(); G.paused = false; setMenu(); });
  press($('w-again'), () => openGacha()); press($('w-menu'), () => { G.paused = false; setMenu(); });

  /* ---- gacha: 3 peta berputar kiri ke kanan ---- */
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mixc = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; };
  function drawPreview(id) {
    const M = MAPS[id], pv = M.pv, c = mkC(100, 147), g = c.getContext('2d'), r = rngMaker(id.charCodeAt(0) * 7);
    for (let y = 0; y < 147; y++) R(g, mixc(pv.top, pv.bot, y / 147), 0, y, 100, 1);
    ell(g, 'rgba(255,255,255,.3)', 74, 30, 15, 15); ell(g, pv.sun, 74, 30, 10, 10);
    if (id === 'c') { for (let y = 60; y < 100; y++) { const hw = Math.round((y - 56) * 0.9); R(g, '#2a1a30', 38 - hw, y, hw * 2, 1); } R(g, '#ff6a1a', 34, 58, 8, 2); R(g, '#7a5566', 30, 40, 16, 8); R(g, '#7a5566', 36, 32, 14, 8); }
    const ridge = (col, base, amp, seed) => { for (let x = 0; x < 100; x += 2) { const y = Math.round(base + Math.sin(x * 0.09 + seed) * amp + Math.sin(x * 0.23 + seed * 2) * amp * 0.4); R(g, col, x, y, 2, 147 - y); } };
    ridge(pv.r1, 80, 9, 1); ridge(pv.r2, 96, 6, 3);
    const plat = (x, y, w, h) => { R(g, pv.side, x, y, w, h); R(g, pv.ground, x, y, w, 3); R(g, OL, x, y + h, w, 1); };
    plat(0, 118, 46, 30); plat(52, 104, 22, 44); plat(78, 90, 22, 58);
    if (id === 'a') { [[8, 118], [88, 90]].forEach(([x, y]) => { R(g, '#7a4a28', x, y - 8, 2, 8); ell(g, '#3fae3a', x + 1, y - 11, 6, 5); }); R(g, '#ffcf33', 58, 96, 3, 3); R(g, '#ffcf33', 66, 92, 3, 3); }
    if (id === 'b') { for (let i = 0; i < 26; i++) R(g, '#fff', Math.floor(r() * 100), Math.floor(r() * 120), 1, 1); [[10, 148], [56, 148]].forEach(([x]) => { R(g, '#d8f6ff', x, 119, 2, 6); R(g, '#d8f6ff', x + 4, 119, 2, 9); }); R(g, '#fff', 6, 108, 3, 10); ell(g, '#fff', 8, 106, 5, 4); }
    if (id === 'c') { R(g, '#ff7a2a', 0, 134, 100, 13); for (let i = 0; i < 12; i++) R(g, '#ffe27a', Math.floor(r() * 100), 134 + Math.floor(r() * 12), 3, 1); R(g, '#ff9a2a', 49, 70, 4, 64); R(g, '#ffe27a', 50, 72, 2, 60); }
    R(g, '#f3f4f8', 20, 107, 9, 6); R(g, '#27325a', 20, 113, 9, 5); R(g, OL, 20, 118, 3, 1); R(g, '#f0b48c', 21, 100, 7, 7); R(g, HR, 21, 99, 7, 3);
    R(g, OL, 0, 0, 100, 1); return c;
  }
  const GACHA = { landed: false, raf: 0, spinning: false, skip: false, target: 'a', built: false };
  const PITCH = 324, NCARD = 30;
  function buildStrip() {
    if (GACHA.built) return; GACHA.built = true; const strip = $('g-strip'); strip.innerHTML = '';
    const srcs = {}; MAP_IDS.forEach((id) => { srcs[id] = drawPreview(id); });
    for (let i = 0; i < NCARD; i++) {
      const id = MAP_IDS[i % 3], card = document.createElement('div'); card.className = 'gcard';
      const cv = mkC(100, 147); cv.getContext('2d').drawImage(srcs[id], 0, 0); card.appendChild(cv);
      const lb = document.createElement('div'); lb.className = 'gl'; lb.dataset.m = id; lb.textContent = MAPS[id].icon + ' ' + mapName(id); card.appendChild(lb); strip.appendChild(card);
    }
    $('g-win').addEventListener('click', () => { if (GACHA.spinning) GACHA.skip = true; });
  }
  function openGacha() { Snd.init(); G.mode = 'gacha'; Snd.music(false); showMany(['gacha']); buildStrip(); spinGacha(); }
  function spinGacha() {
    cancelAnimationFrame(GACHA.raf); GACHA.landed = false; $('g-go').style.display = 'none'; $('g-again').style.display = 'none'; $('g-name').textContent = '🎲'; $('g-frame').classList.remove('land');
    const ti = Math.floor(Math.random() * 3); GACHA.target = MAP_IDS[ti];
    const sIdx = 24, tIdx = 6 + ti, strip = $('g-strip'), cards = strip.children;
    const offS = 360 - (sIdx * PITCH + 150), offE = 360 - (tIdx * PITCH + 150), dur = 4300, t0 = performance.now(); let lastC = -1, lastTick = 0;
    GACHA.spinning = true; GACHA.skip = false;
    const step = (now) => {
      let p = clamp((now - t0) / dur, 0, 1); if (GACHA.skip) p = 1;
      const off = lerp(offS, offE, 1 - Math.pow(1 - p, 3.2)); strip.style.transform = 'translate3d(' + off + 'px,0,0)';
      const ci = clamp(Math.round((360 - off - 150) / PITCH), 0, NCARD - 1);
      if (ci !== lastC) { if (lastC >= 0 && cards[lastC]) cards[lastC].classList.remove('cen'); if (cards[ci]) cards[ci].classList.add('cen'); lastC = ci; if (now - lastTick > 45) { lastTick = now; Snd.fx('ui'); hap('tick'); } }
      if (p < 1) GACHA.raf = requestAnimationFrame(step); else { GACHA.spinning = false; landGacha(); }
    };
    GACHA.raf = requestAnimationFrame(step);
  }
  function landGacha() {
    GACHA.landed = true; const id = GACHA.target; $('g-name').textContent = MAPS[id].icon + ' ' + mapName(id);
    $('g-frame').classList.add('land'); Snd.fx('cp'); hap('success'); $('g-go').style.display = 'flex'; $('g-again').style.display = 'flex';
  }
  press($('g-go'), () => { cancelAnimationFrame(GACHA.raf); startGame(true, GACHA.target); });
  press($('g-again'), () => spinGacha());
  press($('g-back'), () => { cancelAnimationFrame(GACHA.raf); GACHA.spinning = false; setMenu(); });
  cleanups.push(() => cancelAnimationFrame(GACHA.raf));

  /* ---- shop: clothing skins ---- */
  const SHOPSEL = { id: 'classic', built: false };
  function buildShopGrid() {
    if (SHOPSEL.built) return; SHOPSEL.built = true; const grid = $('s-grid'); grid.innerHTML = '';
    SKINS.forEach((K) => {
      const card = document.createElement('div'); card.className = 'scard'; card.dataset.id = K.id;
      const cv = mkC(84, 92); cv.getContext('2d').drawImage(composeSkin(K), 0, 0); card.appendChild(cv);
      const pl = document.createElement('div'); pl.className = 'pl'; card.appendChild(pl); grid.appendChild(card);
      press(card, () => { SHOPSEL.id = K.id; renderShop(); });
    });
  }
  function renderShop() {
    const K = skinById(SHOPSEL.id), owned = SHOP.owned.includes(K.id), eq = SHOP.eq === K.id;
    $('s-coins').textContent = SHOP.wallet;
    const pv = $('s-pv'), g = pv.getContext('2d'); g.clearRect(0, 0, 84, 92); g.drawImage(composeSkin(K), 0, 0);
    $('s-name').textContent = tr('skin_' + K.id);
    const act = $('s-act'); act.classList.toggle('off', eq || (!owned && SHOP.wallet < K.price));
    act.innerHTML = eq ? '✓ ' + tr('equipped') : owned ? tr('equip') : tr('buy') + '  🪙 ' + K.price;
    ui.querySelectorAll('.scard').forEach((el) => {
      const k = skinById(el.dataset.id), o = SHOP.owned.includes(k.id);
      el.classList.toggle('sel', k.id === K.id); el.classList.toggle('lock', !o);
      el.querySelector('.pl').textContent = SHOP.eq === k.id ? '★' : o ? '✓' : '🪙 ' + k.price;
    });
  }
  function openShop() { Snd.init(); buildShopGrid(); SHOPSEL.id = SHOP.eq; showMany(['shop']); renderShop(); }
  function shopAct() {
    const K = skinById(SHOPSEL.id);
    if (SHOP.eq === K.id) return;
    if (!SHOP.owned.includes(K.id)) {
      if (SHOP.wallet < K.price) { Snd.fx('hit'); hap('error'); const w = $('s-wallet'); w.animate([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }], { duration: 260 }); toastShop(tr('noCoins')); return; }
      SHOP.wallet -= K.price; SHOP.owned.push(K.id); Snd.fx('cp'); hap('success'); toastShop(tr('unlocked'));
    }
    applySkin(K.id); renderShop(); saveNow();
  }
  function toastShop(txt) { const d = document.createElement('div'); d.className = 'pop'; d.textContent = txt; d.style.left = '360px'; d.style.top = '600px'; ui.appendChild(d); setTimeout(() => d.remove(), 1200); }
  press($('b-shop'), () => openShop()); press($('s-back'), () => { saveNow(); showMany(['menu']); }); press($('s-act'), () => shopAct());
  async function openLb(from) {
    showMany([from === 'win' ? 'win' : 'menu', 'lb']); const el = $('lb-list'); el.innerHTML = '<div class="lbrow"><span>...</span></div>';
    try {
      const res = await lib.getTopNEntriesFromLeaderboard(8);
      const es = (res && res.entries) || [];
      el.innerHTML = es.length ? es.map((e, i) => '<div class="lbrow"><b>' + (i + 1) + '</b><span>' + String(e.username || '???').replace(/[<>&]/g, '') + '</span><b style="width:auto">' + e.score + '</b></div>').join('') : '<div class="lbrow"><span>' + tr('lbEmpty') + '</span></div>';
    } catch (err) { el.innerHTML = '<div class="lbrow"><span>' + tr('lbUnavail') + '</span></div>'; }
  }

  /* ---------------------------------------------------------------- run flow & save ---- */
  function currentScore() { return Math.round(G.maxH * 10 + G.coins * 25 + (G.won ? Math.max(0, 3000 - G.time * 5) : 0)); }
  function snapshot() {
    return { v: 1, map: CUR.id, cp: PL.cp, maxH: Math.round(G.maxH * 10) / 10, coins: G.coins, got: Array.from(coinGot).reduce((a, v, i) => (v ? (a.push(i), a) : a), []), falls: PL.falls || 0, time: Math.round(G.time), best: Math.max(G.best, G.won ? currentScore() : G.best), done: !!G.won, settings: { tier: state.tierPref, muted: state.muted, lang: LANG }, shop: { w: SHOP.wallet, own: SHOP.owned, eq: SHOP.eq } };
  }
  async function saveNow() {
    try { const s = snapshot(); const j = JSON.stringify(s); G.best = s.best; if (G.save) { G.save.best = s.best; G.save.settings = s.settings; } else G.save = s; if (j === lastSaveJson) return; lastSaveJson = j; if (lib.saveUserGameState) await lib.saveUserGameState(s); } catch (e) { /* ignore */ }
  }
  async function submitScore() {
    const sc = currentScore(); if (sc <= 0) return;
    try { if (sc > G.best) G.best = sc; if (lib.addPlayerScoreToLeaderboard) await lib.addPlayerScoreToLeaderboard(sc); } catch (e) { /* ignore */ }
  }
  function endRun() { if (G.mode === 'play' && G.maxH > 2) { submitScore(); } saveNow(); }

  function startGame(fresh, mapId) {
    Snd.init(); Snd.music(true);
    if (!fresh && G.hasSave && G.save && G.save.map) mapId = G.save.map;
    mapId = mapId || CUR.id || 'a';
    if (CUR.id !== mapId || !LV) buildWorld(mapId); else applyMapSkin();
    G.hintShown = false; G.firstJump = false;
    if (fresh || !G.hasSave) {
      PL.cp = 0; PL.falls = 0; G.coins = 0; G.maxH = 0; G.time = 0; coinGot.fill(0); LV.flags.forEach((f) => { f.on = false; f.cloth.material.map = TX.flagOff; });
      PL.x = LV.start.x; PL.y = 0;
    } else {
      const s = G.save; PL.cp = s.cp || 0; PL.falls = s.falls || 0; G.coins = s.coins || 0; G.maxH = s.maxH || 0; G.time = s.time || 0; coinGot.fill(0); (s.got || []).forEach((i) => { coinGot[i] = 1; });
      LV.flags.forEach((f) => { f.on = f.id <= PL.cp; f.cloth.material.map = f.on ? TX.flagOn : TX.flagOff; });
      const f = LV.flags[PL.cp - 1]; if (f) { PL.x = f.x; PL.y = f.y; } else { PL.x = LV.start.x; PL.y = 0; }
    }
    G.hasSave = true; G.won = false; G.paused = false; G.rockT = 6; PL.vx = PL.vy = 0; PL.state = 'idle'; PL.st = 0; PL.grounded = true; PL.peakY = PL.y; PL.inv = 1; PL.rag = null; PL.face = 1; camSnap = true;
    rockSprites.forEach((r) => { r.on = false; r.m.visible = false; r.mk.visible = false; });
    LV.crumbles.forEach((s) => { s.state = 'ok'; s.gone = false; s.mesh.visible = true; s.mesh.position.copy(s.home); });
    G.mode = 'play'; showMany(['hud']); hudDirty = true; app.classList.add('playing');
    if (!G.save || !G.save.tut) { showHint(); }
  }
  function showHint() { toast(lib.shouldUseTouchControls && lib.shouldUseTouchControls() ? tr('hintTouch') : tr('hintKey'), 4.5); }
  function doPause(on) { if (G.mode !== 'play' || G.won) return; G.paused = on; showMany(on ? ['hud', 'pause'] : ['hud']); Snd.music(!on); if (on) { inp.left = inp.right = inp.jump = false; saveNow(); } }
  function respawnNow() { const f = LV.flags[PL.cp - 1]; const p = f ? { x: f.x, y: f.y } : LV.start; PL.x = p.x; PL.y = p.y; PL.vx = PL.vy = 0; PL.state = 'idle'; PL.rag = null; PL.grounded = true; PL.peakY = p.y; PL.inv = 1; camSnap = true; }
  function win() {
    if (G.won) return; G.won = true; PL.state = 'win'; PL.st = 0; PL.vx = 0; G.maxH = Math.max(G.maxH, LV.topY); Snd.fx('win'); hap('success'); Snd.music(false);
    for (let i = 0; i < 80; i++) emit(LV.summit.x + (Math.random() - 0.5) * 6, LV.summit.y + 5 + Math.random() * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 6, Math.random() * 3, [0xff5a5a, 0xffd25a, 0x5ad0ff, 0x7aff7a, 0xff8ad8][i % 5], 2.5 + Math.random(), -3);
    submitScore(); saveNow();
    setTimeout(() => { if (!G.won) return; $('w-h').textContent = '\u200E' + Math.round(LV.topY) + ' m'; $('w-c').textContent = G.coins; $('w-f').textContent = PL.falls || 0; $('w-t').textContent = Math.floor(G.time / 60) + ':' + String(Math.floor(G.time % 60)).padStart(2, '0'); $('w-s').textContent = currentScore(); showMany(['win']); }, 1800);
  }

  /* ---------------------------------------------------------------- quality tiers ---- */
  function applyTier() {
    let t = state.tierPref === 'auto' ? (state.autoTier || 'mid') : state.tierPref; state.tier = t;
    const dpr = Math.min(window.devicePixelRatio || 1, t === 'low' ? 1 : t === 'mid' ? 1.5 : 2);
    renderer.setPixelRatio(dpr); renderer.setSize(720, 1280, false);
    app.classList.toggle('low', t === 'low'); app.style.setProperty('--tsb', CFG.ts() + 'px');
    if (tuftMesh) tuftMesh.visible = t !== 'low'; PET.m.visible = t !== 'low'; clouds.forEach((c, i) => { c.visible = t !== 'low' || i < 5; });
    PS.m.material.size = 7 * (t === 'low' ? 1 : 1); const vig = $('fx-vig'); if (vig) vig.style.display = '';
  }
  function applyMapSkin() {
    const M = CUR;
    bgDefs.forEach((d, i) => { const r = M.ridges[i]; if (d.mesh.material.map) d.mesh.material.map.dispose(); d.mesh.material.map = ridgeTex(r[0], r[1], r[2], r[3], r[4]); d.mesh.material.needsUpdate = true; });
    clouds.forEach((c) => { c.material.color.setHex(M.cloud); c.material.opacity = M.cloudOp; });
    hemi.color.setHex(M.hemi[0]); hemi.groundColor.setHex(M.hemi[1]); hemi.intensity = M.hemi[2]; sun.color.setHex(M.sunC); scene.fog.color.setHex(M.fog);
    for (let i = 0; i < PET.n; i++) { const hx = M.pet.cols[i % M.pet.cols.length]; PET.col[i * 3] = ((hx >> 16) & 255) / 255; PET.col[i * 3 + 1] = ((hx >> 8) & 255) / 255; PET.col[i * 3 + 2] = (hx & 255) / 255; }
    PET.m.geometry.attributes.color.needsUpdate = true;
    rockSprites.forEach((rk) => { rk.m.material.map = TX[M.rockTex]; rk.m.material.needsUpdate = true; rk.mk.material.color.setHex(M.rockMark); rk.on = false; rk.m.visible = false; rk.mk.visible = false; });
    app.classList.remove('mapa', 'mapb', 'mapc'); app.classList.add('map' + M.id);
    lastSky = ''; applyTier();
  }
  state.autoTier = 'mid'; applyTier();
  let fpsFrames = 0, fpsAcc = 0, fpsDone = false;

  /* ---------------------------------------------------------------- camera ---- */
  const cam = { x: 0, y: 3, lx: 0 };
  const SKY = [[0, [255, 214, 165], [255, 142, 107]], [30, [255, 226, 170], [110, 190, 255]], [60, [140, 205, 255], [70, 120, 230]], [95, [120, 110, 220], [40, 40, 120]]];
  function skyColor(y) {
    const SKY = CUR.sky;
    let a = SKY[0], b = SKY[SKY.length - 1];
    for (let i = 0; i < SKY.length - 1; i++) { if (y >= SKY[i][0] && y <= SKY[i + 1][0]) { a = SKY[i]; b = SKY[i + 1]; break; } }
    const k = a === b ? 0 : clamp((y - a[0]) / (b[0] - a[0]), 0, 1), m = (u, v) => Math.round(lerp(u, v, k));
    const hz = a[1].map((v, i) => m(v, b[1][i])), tp = a[2].map((v, i) => m(v, b[2][i]));
    return { hz: 'rgb(' + hz.join(',') + ')', tp: 'rgb(' + tp.join(',') + ')', hzv: hz };
  }
  let lastSky = '';
  function updateCamera(dt) {
    const f = PL.face; const tx = PL.x + f * 1.6; const cpF = PL.cp ? LV.flags[PL.cp - 1] : null;
    const ty = Math.max(PL.y + (G.mode === 'menu' ? 2.2 : 3.4), (cpF ? cpF.y : 0) + 2.0);
    if (camSnap) { cam.x = tx; cam.y = ty; camSnap = false; }
    const kx = 1 - Math.exp(-4.5 * dt), ky = 1 - Math.exp(-(PL.vy < -8 ? 9 : 4.5) * dt);
    cam.x += (tx - cam.x) * kx; cam.y += (ty - cam.y) * ky;
    let sx = 0, sy = 0; if (shake > 0) { shake = Math.max(0, shake - dt * 2.5); sx = (Math.random() - 0.5) * shake * 0.6; sy = (Math.random() - 0.5) * shake * 0.6; }
    camera.position.set(cam.x + sx, cam.y + 3.2 + sy, 26); camera.lookAt(cam.x + sx, cam.y - 0.4 + sy, 0);
    bgDefs.forEach((d) => { d.mesh.position.x = cam.x * d.f; d.mesh.position.y = cam.y * d.f * 0.55 + d.y + 22; });
    clouds.forEach((c) => { const u = c.userData; u.ox += u.sp * dt; if (u.ox > 130) u.ox = -130; c.position.set(cam.x * 0.7 + u.ox, cam.y * 0.5 + u.oy + 25, u.z); });
    const sc = skyColor(cam.y); const key = sc.hz + sc.tp; if (key !== lastSky) { lastSky = key; sky.style.background = 'linear-gradient(180deg,' + sc.tp + ' 0%,' + sc.hz + ' 78%)'; scene.fog.color.setRGB(sc.hzv[0] / 255, sc.hzv[1] / 255, sc.hzv[2] / 255); }
  }

  /* ---------------------------------------------------------------- main loop ---- */
  let last = performance.now(), simT = 0, raf = 0, dead = false;
  function frame(now) {
    if (dead) return; raf = requestAnimationFrame(frame);
    let dt = Math.min((now - last) / 1000, 0.11); last = now; if (dt <= 0) return;
    if (!fpsDone && now > 1500) { fpsFrames++; fpsAcc += dt; if (fpsFrames >= 90) { fpsDone = true; const fps = fpsFrames / fpsAcc; state.autoTier = fps < 38 ? 'low' : fps < 54 ? 'mid' : 'high'; if (state.tierPref === 'auto') applyTier(); refreshMenu(); } }
    simT += dt; U.time.value = simT;
    if (fadeT > 0) { fadeT -= dt; if (fadeT <= 0) $('fade').style.opacity = '0'; }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
    const playing = G.mode === 'play' && !G.paused;
    if (playing) {
      G.time += dt; PL.st += dt; PL.inv = Math.max(0, PL.inv - dt); PL.squash = approach(PL.squash, 0, dt * 3);
      let n = Math.ceil(dt / (1 / 90)), sdt = dt / n;
      for (let i = 0; i < n; i++) {
        if (PL.state === 'ragdoll') { stepRagdoll(sdt); if (PL.state !== 'ragdoll') break; } else if (PL.state === 'lie') { PL.vx = 0; } else if (PL.state === 'getup') { PL.vx = 0; } else if (PL.state === 'win') { PL.vy -= CFG.grav() * sdt; stepWin(sdt); } else { movers(sdt, simT); stepPlayer(sdt); }
      }
      if (PL.state === 'lie' && PL.st > 1.1) { PL.state = 'getup'; PL.st = 0; }
      if (PL.state === 'getup' && PL.st > 0.9) { PL.state = 'idle'; PL.st = 0; PL.inv = Math.max(PL.inv, 0.6); }
      if (PL.state !== 'ragdoll' && PL.state !== 'win' && PL.y < (PL.cp ? LV.flags[PL.cp - 1].y : 0) - 16) { startRagdoll('void', 0, 0); }
      if (!G.won && PL.state !== 'ragdoll' && LV.summit && PL.grounded && PL.on === LV.summit.s && PL.x > LV.summit.s.x0 + 2) win();
      G.maxH = Math.max(G.maxH, PL.state === 'ragdoll' ? G.maxH : PL.y);
      updateRocks(dt); updateCrumbles(dt);
      if (LV.lava && PL.state !== 'ragdoll' && PL.state !== 'win' && PL.y < LV.lava.y + 0.3 && PL.x > LV.lava.x0 && PL.x < LV.lava.x1) startRagdoll('burn', 0, 0);
      saveTimer += dt; if (saveTimer > 6 && G.mode === 'play') { saveTimer = 0; saveNow(); }
      if (!G.firstJump && !G.hintShown && PL.x > LV.hintX - 3 && G.mode === 'play') { G.hintShown = true; showHint(); }
    } else if (G.mode === 'menu' || G.mode === 'gacha') { movers(dt, simT); updateCrumbles(dt); PL.st += dt; PL.state = 'idle'; PL.x = LV.start.x - 2; PL.y = 0; PL.grounded = true; PL.face = 1; }
    if (!G.paused) updateHazards(dt, simT);
    // pose
    if (PL.state === 'ragdoll') renderRagdoll(); else { const P = poseParams(); setPartAnim(P, PL.x, PL.y); }
    // shadow
    let gy = groundBelow(PL.x, (PL.state === 'ragdoll' ? RG.torso.y : PL.y) + 0.3); shadow.visible = gy !== null && PL.state !== 'ragdoll';
    if (gy !== null) { const hh = Math.max(0, PL.y - gy); shadow.position.set(PL.x, gy + 0.04, 0.2); const k = clamp(1 - hh / 8, 0.35, 1); shadow.scale.set(k * 1.1, k * 1.1, k); }
    updateCoins(dt, simT); updateFlags(simT);
    // particles
    for (let i = 0; i < PS.n; i++) { const d = PSd[i]; if (d.life > 0) { d.life -= dt; d.vy += d.g * dt; PS.pos[i * 3] += d.vx * dt; PS.pos[i * 3 + 1] += d.vy * dt; if (d.life <= 0) PS.pos[i * 3 + 1] = -9999; } }
    PS.m.geometry.attributes.position.needsUpdate = true; PS.m.geometry.attributes.color.needsUpdate = true;
    if (PET.m.visible) { for (let i = 0; i < PET.n; i++) { const d = petD[i]; const yy = ((d.oy + CUR.pet.dir * simT * d.sp * CUR.pet.spd) % 26 + 26) % 26 - 4; PET.pos[i * 3] = cam.x + d.ox + Math.sin(simT * d.sp + d.ph) * 1.6; PET.pos[i * 3 + 1] = cam.y - 8 + yy; PET.pos[i * 3 + 2] = d.z - 8; } PET.m.geometry.attributes.position.needsUpdate = true; }
    updateCamera(dt);
    // hud
    if (hudDirty || G.mode === 'play') {
      const m = Math.max(0, Math.round(Math.max(G.maxH, 0))); const el = $('v-m'); if (el && el.textContent !== String(m)) el.textContent = m;
      if (hudDirty) { $('v-c').textContent = G.coins; $('v-f').textContent = PL.falls || 0; hudDirty = false; }
      const kb = $('knob'); if (kb) kb.style.bottom = (clamp(G.maxH / LV.topY, 0, 1) * 600) + 'px';
    }
    renderer.render(scene, camera);
  }
  function stepWin(dt) { PL.st += 0; }

  /* ---------------------------------------------------------------- init & edit mode ---- */
  if (lib.showGameParameters) {
    try {
      lib.showGameParameters({ name: 'Bang Bulat', params: {
        'Run speed': { key: 'player.runSpeed', type: 'slider', min: 4, max: 9, step: 0.1 },
        'Jump power': { key: 'player.jumpSpeed', type: 'slider', min: 10, max: 17, step: 0.1 },
        'Gravity': { key: 'player.gravity', type: 'slider', min: 20, max: 45, step: 1 },
        'Ragdoll fall height (m)': { key: 'ragdoll.bigFallHeight', type: 'slider', min: 5, max: 16, step: 0.5 },
        'Falling rock interval (s)': { key: 'hazards.rockInterval', type: 'slider', min: 1.5, max: 10, step: 0.5 },
        'Rock fall speed': { key: 'hazards.rockFallSpeed', type: 'slider', min: 8, max: 28, step: 1 },
        'Tilt-shift blur (px)': { key: 'visual.tiltShift', type: 'slider', min: 0, max: 8, step: 0.5, onChange: (v) => { window.gameConfig.visual.tiltShift = v; app.style.setProperty('--tsb', v + 'px'); } },
      } });
    } catch (e) { /* ignore */ }
  }
  buildWorld('a');
  applyLang();
  setLoad(0.85, tr('loadAlmost'));
  (async () => {
    try {
      if (mode !== 'edit' && lib.getUserGameState) {
        const r = await lib.getUserGameState(); const s = r && r.state;
        if (s) { G.save = s; G.best = s.best || 0; G.hasSave = !!(s.cp > 0 || s.maxH > 3) && !s.done; if (s.settings) { state.tierPref = s.settings.tier || 'auto'; Snd.setMuted(!!s.settings.muted); state.muted = !!s.settings.muted; if (I18N[s.settings.lang]) LANG = s.settings.lang; applyTier(); }
        if (s.shop) { SHOP.wallet = Math.max(0, s.shop.w | 0); SHOP.owned = Array.isArray(s.shop.own) && s.shop.own.length ? s.shop.own.filter((id) => SKINS.some((k) => k.id === id)) : ['classic']; if (!SHOP.owned.includes('classic')) SHOP.owned.unshift('classic'); SHOP.eq = SHOP.owned.includes(s.shop.eq) ? s.shop.eq : 'classic'; } }
      }
    } catch (e) { /* ignore */ }
    if (serial !== runSerial || dead) return;
    PL.x = LV.start.x - 2; PL.y = 0; applySkin(SHOP.eq); applyLang();
    if (mode === 'edit') { showMany([]); G.mode = 'edit'; } else setMenu();
    requestAnimationFrame(() => { setLoad(1); setTimeout(() => { const ld = $('loading'); if (ld) ld.classList.add('off'); }, 250); });
  })();
  last = performance.now(); raf = requestAnimationFrame(frame);
  window.__bb = { SHOP, openShop, applySkin, SKINS, setLang, showMany, MAPS, buildWorld, openGacha, GACHA, get LV() { return LV; }, get CUR() { return CUR; }, G, PL, inp, startGame, cam, state, camera, scene, renderer, startRagdoll, spawnRock, doPause, win, openLb, showMany };

  return function cleanup() {
    dead = true; cancelAnimationFrame(raf); cleanups.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
    try { endRun(); } catch (e) { /* ignore */ }
    ui.innerHTML = ''; try { renderer.dispose(); } catch (e) { /* ignore */ }
  };
}

window.run = run;
