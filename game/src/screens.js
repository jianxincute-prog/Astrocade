// Full-screen layers on top of the game: main menu, pause, recipe book, leaderboard.
// Menu keeps the top 640 px transparent so the live 3D kitchen shows through. Buttons are >= 96x96.
import { RECIPES, recipeName } from './recipes.js';
import { INGREDIENTS } from './ingredients.js';

const T = {
  play: 'PLAY', best: 'BEST', recipes: 'RECIPES', board: 'TOP PLAYERS', paused: 'PAUSED', resume: 'RESUME', finish: 'FINISH',
  loading: 'Loading...', empty: 'No scores yet', offline: 'Leaderboard unavailable', you: 'YOU', reset: 'RESET', sure: 'TAP AGAIN',
};
const el = (tag, cls, parent, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
};
const press = (node, fn) => node.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
#screens{position:absolute;left:0;top:0;width:720px;height:1280px;z-index:20;pointer-events:none;font-family:system-ui,sans-serif;color:#4a3b36}
#screens .layer{position:absolute;left:0;top:0;width:720px;height:1280px;display:none}
#screens .layer.show{display:block;pointer-events:auto}
#screens .btn{position:absolute;width:96px;height:96px;border-radius:26px;box-sizing:border-box;border:4px solid #fff;background:#ffe9d9;
  box-shadow:0 5px 0 rgba(0,0,0,.13);font:800 34px system-ui;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;
  -webkit-tap-highlight-color:transparent}
#screens .btn small{font:800 15px system-ui;display:block}
#screens .btn.warn{background:#ffc9c9}
#screens .big{position:absolute;left:140px;width:440px;height:128px;border-radius:44px;border:6px solid #fff;
  background:linear-gradient(#ffb74d,#ff8a3d);box-shadow:0 8px 0 rgba(0,0,0,.18);font:900 54px system-ui;color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.2);
  display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent}
#screens .big.alt{background:linear-gradient(#a5d8ff,#74b9ff);font-size:40px;height:112px}
#screens .big.pulse{animation:pulse 1.1s ease-in-out infinite}
#screens .title{position:absolute;left:0;top:34px;width:720px;text-align:center;font:900 70px/0.95 system-ui;color:#ff7a45;
  text-shadow:0 5px 0 #fff,0 9px 0 rgba(0,0,0,.12);letter-spacing:.02em}
#screens .title small{display:block;font:900 52px system-ui;color:#4a8f6a}
#screens .menu-bottom{position:absolute;left:0;top:640px;width:720px;height:640px;background:linear-gradient(#ffe0cc,#ffd1b8);border-top:6px solid #ffb5a7;box-sizing:border-box}
#screens .bestline{position:absolute;left:0;top:30px;width:720px;text-align:center;font:800 28px system-ui;opacity:.75}
#screens .dim{background:rgba(43,36,48,.7)}
#screens .panel{position:absolute;left:60px;width:600px;top:330px;background:#fff3e6;border-radius:36px;padding:34px 0 150px;box-shadow:0 8px 0 rgba(0,0,0,.2);height:420px;box-sizing:border-box}
#screens .panel h2{margin:0;text-align:center;font:900 44px system-ui}
#screens .page{background:#fff1e6}
#screens .page h2{position:absolute;left:30px;top:24px;margin:0;font:900 40px system-ui}
#screens .page h2 small{font:800 24px system-ui;opacity:.6;margin-left:10px}
#screens .grid{position:absolute;left:0;top:130px;width:720px;height:1150px;overflow-y:auto;padding:0 24px 40px;box-sizing:border-box;display:grid;
  grid-template-columns:repeat(3,1fr);gap:16px;align-content:start}
#screens .tile{background:#fff;border-radius:22px;padding:10px;text-align:center;box-shadow:0 4px 0 rgba(0,0,0,.1);min-height:236px;box-sizing:border-box}
#screens .tile canvas{width:128px;height:128px;border-radius:14px;display:block;margin:0 auto 6px}
#screens .tile .n{font:800 17px/1.15 system-ui;min-height:40px}
#screens .tile.lock .n{opacity:.45}
#screens .sw{display:inline-block;width:22px;height:22px;border-radius:6px;border:2px solid rgba(0,0,0,.15);margin:0 2px}
#screens .rows{position:absolute;left:30px;top:130px;width:660px}
#screens .row{display:flex;align-items:center;background:#fff;border-radius:20px;padding:0 24px;height:84px;margin-bottom:12px;font:800 28px system-ui;box-shadow:0 4px 0 rgba(0,0,0,.1)}
#screens .row.me{background:#fff2b3}
#screens .row .r{width:70px;opacity:.6}
#screens .row .u{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#screens .msg{position:absolute;left:0;top:420px;width:720px;text-align:center;font:800 30px system-ui;opacity:.6}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
`;

export function createScreens({ appEl, cfg, handlers, thumbs }) {
  const st = { ...T, ...(cfg.strings || {}) };
  const old = document.getElementById('screens'); if (old) old.remove();
  const root = el('div', '', appEl); root.id = 'screens';
  el('style', '', root).textContent = CSS;

  // ---------- main menu ----------
  const menu = el('div', 'layer', root);
  el('div', 'title', menu, 'SECRET RECIPE<small>LAB</small>');
  const mb = el('div', 'menu-bottom', menu);
  const bestEl = el('div', 'bestline', mb, '');
  const play = el('div', 'big pulse', mb, st.play); play.style.top = '86px'; press(play, handlers.onPlay);
  const mkIcon = (parent, left, top, html, fn, cls = '') => { const b = el('div', 'btn ' + cls, parent, html); b.style.left = left + 'px'; b.style.top = top + 'px'; press(b, fn); return b; };
  mkIcon(mb, 120, 270, '&#128214;', handlers.onBook);
  mkIcon(mb, 312, 270, '&#127942;', handlers.onBoard);
  mkIcon(mb, 504, 270, '&#10067;', handlers.onHelp);
  const bSound = mkIcon(mb, 120, 410, '&#128266;', handlers.onMute);
  const bQual = mkIcon(mb, 312, 410, '<small>AUTO</small>', handlers.onQuality);
  let resetArmed = 0;
  const bReset = mkIcon(mb, 504, 410, '&#128465;', () => {
    if (resetArmed) { resetArmed = 0; bReset.innerHTML = '&#128465;'; bReset.classList.remove('warn'); handlers.onReset(); }
    else { resetArmed = 1; bReset.innerHTML = '<small>' + st.sure + '</small>'; bReset.classList.add('warn'); setTimeout(() => { resetArmed = 0; bReset.innerHTML = '&#128465;'; bReset.classList.remove('warn'); }, 2500); }
  });

  // ---------- pause ----------
  const pause = el('div', 'layer dim', root);
  const pp = el('div', 'panel', pause, '<h2>' + st.paused + '</h2>');
  pp.style.height = '470px'; pp.style.top = '310px';
  const resume = el('div', 'big', pp, st.resume); resume.style.left = '80px'; resume.style.top = '110px'; resume.style.width = '440px'; press(resume, handlers.onResume);
  const finish = el('div', 'big alt', pp, st.finish); finish.style.left = '80px'; finish.style.top = '260px'; press(finish, handlers.onFinish);
  const pSound = mkIcon(pp, 252, 410, '&#128266;', handlers.onMute); pSound.style.top = '395px'; pSound.style.display = 'none';

  // ---------- recipe book ----------
  const book = el('div', 'layer page', root);
  const bookTitle = el('h2', '', book, '');
  const grid = el('div', 'grid', book);
  mkIcon(book, 600, 16, '&#10005;', () => hide(book));

  // ---------- leaderboard ----------
  const board = el('div', 'layer page', root);
  el('h2', '', board, st.board);
  const rows = el('div', 'rows', board);
  const msg = el('div', 'msg', board, '');
  mkIcon(board, 600, 16, '&#10005;', () => hide(board));

  const show = (l) => l.classList.add('show');
  const hide = (l) => l.classList.remove('show');

  return {
    showMenu(best) { bestEl.textContent = best > 0 ? st.best + ' ' + String(best).padStart(5, '0') : ''; show(menu); },
    hideMenu() { hide(menu); },
    showPause() { show(pause); }, hidePause() { hide(pause); },
    isOverlayOpen() { return [pause, book, board].some((l) => l.classList.contains('show')); },
    setMuted(m) { const g = m ? '&#128263;' : '&#128266;'; bSound.innerHTML = g; pSound.innerHTML = g; },
    setQuality(q) { bQual.innerHTML = '<small>' + q.toUpperCase() + '</small>'; },

    openBook(profile) {
      grid.innerHTML = '';
      bookTitle.innerHTML = st.recipes + '<small>' + profile.discovered.size + '/' + RECIPES.length + '</small>';
      RECIPES.forEach((r) => {
        const found = profile.discovered.has(r.id);
        const t = el('div', 'tile' + (found ? '' : ' lock'), grid);
        try { t.appendChild(thumbs.get(r, found)); } catch (e) { /* thumbnails are optional */ }
        el('div', 'n', t, found ? esc(recipeName(cfg, r)) : '???');
        el('div', '', t, r.ids.map((id) => '<span class="sw" style="background:' + (found ? INGREDIENTS.find((i) => i.id === id).color : '#d8cbc2') + '"></span>').join(''));
      });
      grid.scrollTop = 0;
      show(book);
    },

    async openBoard(fetcher, myScore) {
      rows.innerHTML = ''; msg.textContent = st.loading; show(board);
      const res = await fetcher();
      if (!board.classList.contains('show')) return;
      if (!res || !res.entries) { msg.textContent = st.offline; return; }
      if (!res.entries.length) { msg.textContent = st.empty; return; }
      msg.textContent = '';
      res.entries.slice(0, 10).forEach((e, i) => {
        const me = res.userRank === i + 1;
        el('div', 'row' + (me ? ' me' : ''), rows, '<span class="r">' + (i + 1) + '</span><span class="u">' + esc(e.username || '-') + (me ? ' (' + st.you + ')' : '') + '</span><span>' + e.score + '</span>');
      });
      if (res.userRank && res.userRank > 10) el('div', 'row me', rows, '<span class="r">' + res.userRank + '</span><span class="u">' + st.you + '</span><span>' + (myScore || '') + '</span>');
    },
  };
}
