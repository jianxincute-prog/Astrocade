import { SETS } from './logic.mjs';
import { EXPRESSIONS } from './faces.mjs';

// HUD markup, stylesheet, blueprint drawing and small canvas helpers shared by the Babylon.js renderer.
export function uiMarkup(editing) {
  return `
    <div class="hud ${editing ? 'edit-mode' : ''}">
      <header class="topbar">
        <div class="brand"><div class="brand-mark">✦</div><div><small>ATELIER K—07</small><strong>WAIFU <em>ASSEMBLER</em></strong></div></div>
        <div class="score"><small>${editing ? 'EDITOR PREVIEW' : 'RESTORATION RUN'}</small><b id="progress-count">0 <i>/ 60</i></b><span>PARTS PLACED</span></div>
      </header>
      <section class="status-card"><div class="status-icon">⌖</div><div id="status-message"><b>SEARCH THE HALL</b><span>60 fragments are waiting to be found</span></div><div class="status-target" id="target-info"><i class="target-dot"></i><span>Check the map for your next fragment</span></div></section>
      <section class="map-card"><div class="card-cap"><span>FIELD SCAN</span><span class="scan-live">● LIVE</span></div><canvas id="mini-map" width="158" height="188"></canvas><div class="map-legend"><i></i> FRAGMENT <span>◇ GALLERY</span></div></section>
      <section class="blueprint-card" id="blueprint-card"><div class="card-cap"><span>HOLOGRAM / 3D</span><span class="scan-live">● LINKED</span></div><b id="blueprint-title">OFFICE-01</b><div id="blueprint-drawing"><i class="holo-scan"></i><i class="holo-corner a"></i><i class="holo-corner b"></i><i class="holo-corner c"></i><i class="holo-corner d"></i></div><small id="blueprint-foot">HELD COMPONENT / HEAD</small></section>
      <div class="movement-hint"><span class="hint-key">DRAG</span> to look <i>·</i> <span class="hint-key">WASD</span> to walk <i>·</i> <span class="hint-key">E</span> to interact</div>
      <div class="mobile-controls">
        <div id="stick-zone" class="stick-zone" aria-label="Move"><div class="stick-ring"></div><div id="stick-nub" class="stick-nub"><span>✦</span></div><small>MOVE</small></div>
        <button id="mobile-action" class="mobile-action" aria-label="Collect or assemble"><span>✦</span><b id="action-label">SEARCH</b></button>
      </div>
      <div id="toast" class="toast"></div>
      <div id="finish-banner" class="finish-banner"><div class="finish-card"><div class="finish-spark">✦</div><small>RESTORATION COMPLETE</small><h2>Twelve figures.<br>One brilliant curator.</h2><p>All twelve statues stand restored in the sculpture gallery, from Office-01 to Sakura-01. The atelier looks rather pleased with itself.</p><div id="finish-time" class="finish-time"></div><button id="finish-close">BACK TO THE HALL</button><button id="finish-rank">RANKING</button></div></div>
      <section id="editor-panel" class="editor-panel">
        <div class="editor-head"><span>✦ &nbsp; SCULPTURE GALLERY</span><small>NORTH OF THE 120 × 120 HALL</small></div>
        <p>Choose a wall-side podium, then drag it. The spacious center stays open.</p>
        <canvas id="editor-map" width="320" height="276" aria-label="Drag a podium to reposition it"></canvas>
        <div class="editor-selected" id="editor-selected"></div>
        <div class="editor-bottom"><span id="editor-coords"></span><button id="editor-reset">RESET LAYOUT</button></div>
        <div class="editor-picks">${SETS.map((set) => `<button data-editor-set="${set.id}"><i style="--dot:${set.color}"></i>${set.name}</button>`).join('')}</div>
        <div class="editor-note">Drag a marker on the plan or select a podium to reposition it.</div>
      </section>
      <button id="studio-open" class="studio-open" aria-label="Open the character studio"><span>✦</span><b>STUDIO</b><small>12 FACES</small></button>
      <button id="sound-toggle" class="sound-toggle" aria-label="Turn music and sound off"><span>♪</span></button>
      <button id="menu-open" class="menu-open" aria-label="Open the main menu"><span>☰</span></button>
      <section id="studio" class="studio">
        <div id="studio-stage" class="studio-stage"></div>
        <header class="studio-top"><div><small>CHARACTER STUDIO · 3D FIGURES</small><b id="studio-name">OFFICE-01</b><span id="studio-title"></span></div><button id="studio-close" aria-label="Close the studio">✕</button></header>
        <button id="studio-prev" class="studio-arrow left" aria-label="Previous figure">‹</button>
        <button id="studio-next" class="studio-arrow right" aria-label="Next figure">›</button>
        <div class="studio-bottom"><span id="studio-count" class="studio-count">1 / 12</span><div class="studio-expr">${EXPRESSIONS.map((e) => `<button data-expr="${e}">${e}</button>`).join('')}</div></div>
      </section>
      ${editing ? '<div class="edit-badge">EDITOR MODE <span>· gameplay paused</span></div>' : ''}
    </div>
    <div id="gl-lost" class="gl-lost"><div><b>Restoring the gallery…</b><span>The graphics were interrupted. Your progress is saved.</span><button id="gl-reload">RELOAD</button></div></div>
    <div id="boot" class="boot">
      ${logoMarkup()}
      <div class="boot-foot"><div class="boot-bar"><i id="boot-fill"></i></div><div id="boot-status" class="boot-status">PREPARING THE ATELIER</div></div>
    </div>
    <div id="menu" class="menu">
      ${logoMarkup()}
      <div class="menu-foot">
        <div id="menu-meta" class="menu-meta"></div>
        <div class="menu-buttons">
          <button id="menu-play" class="menu-btn primary"><span>▶</span><b id="menu-play-label">PLAY</b></button>
          <div class="menu-row">
            <button id="menu-settings" class="menu-btn"><span>⚙</span><b>SETTINGS</b></button>
            <button id="menu-leaderboard" class="menu-btn"><span>♛</span><b>RANKING</b></button>
          </div>
        </div>
      </div>
      <section id="settings-panel" class="panel" aria-label="Settings">
        <h2>Settings <button class="panel-close" data-close aria-label="Close settings">✕</button></h2>
        <div class="set-row"><label>MUSIC <output id="set-music-val"></output></label><input id="set-music" type="range" min="0" max="1" step="0.05"></div>
        <div class="set-row"><label>SOUND EFFECTS <output id="set-sfx-val"></output></label><input id="set-sfx" type="range" min="0" max="1" step="0.05"></div>
        <div class="set-row"><label>AUDIO</label><div class="seg" id="set-audio"><button data-v="on">ON</button><button data-v="off">OFF</button></div></div>
        <div class="set-row"><label>LOOK SENSITIVITY <output id="set-look-val"></output></label><input id="set-look" type="range" min="0.4" max="2" step="0.1"></div>
        <div class="set-row"><label>GRAPHICS</label><div class="seg" id="set-quality"><button data-v="high">HIGH</button><button data-v="balanced">BALANCED</button></div></div>
        <button id="set-reset" class="danger">RESET PROGRESS</button>
      </section>
      <section id="leaderboard-panel" class="panel" aria-label="Leaderboard">
        <h2>Fastest Curators <button class="panel-close" data-close aria-label="Close leaderboard">✕</button></h2>
        <div id="lb-body" class="lb-body"></div>
      </section>
    </div>`;
}

function logoMarkup() {
  return '<div class="logo"><small>ATELIER K—07 · RESTORATION</small><h1>Waifu <em>Assembler</em></h1><p>Twelve statues · one gallery</p></div>';
}

export function installStyles() {
  if (document.getElementById('waifu-assembler-css')) return;
  const style = document.createElement('style');
  style.id = 'waifu-assembler-css';
  style.textContent = `
    #waifu-assembler-root { position:fixed; inset:0; overflow:hidden; width:100%; height:100%; background:#2b2016; color:#fdf9f1; font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; -webkit-user-select:none; user-select:none; }
    #waifu-assembler-root * { box-sizing:border-box; }
    .game-canvas { position:absolute; inset:0; display:block; width:100%; height:100%; touch-action:none; outline:none; }
    .hud { position:absolute; inset:0; pointer-events:none; overflow:hidden; background:linear-gradient(180deg,rgba(21,16,12,.74),transparent 18%,transparent 70%,rgba(20,16,12,.25)); }
    .topbar { position:absolute; top:20px; left:23px; right:23px; height:69px; display:flex; align-items:center; justify-content:space-between; }
    .brand { display:flex; align-items:center; gap:12px; filter:drop-shadow(0 3px 10px #120d09); }
    .brand-mark { width:42px; height:42px; border:1px solid rgba(231,194,120,.58); border-radius:14px; display:grid; place-items:center; color:#eccf95; font-size:24px; background:linear-gradient(145deg,rgba(143,108,39,.37),rgba(61,48,37,.72)); box-shadow:inset 0 0 18px rgba(225,177,82,.12); }
    .brand small,.score small { display:block; color:#c8ba9e; letter-spacing:2px; font-size:9px; font-weight:800; }
    .brand strong { display:block; margin-top:3px; font-size:18px; line-height:1.05; letter-spacing:1.1px; font-weight:850; }
    .brand em { font-style:normal; color:#e9c887; }
    .score { min-width:112px; text-align:right; padding:9px 13px; border:1px solid rgba(237,219,184,.16); background:rgba(25,19,14,.74); border-radius:14px; backdrop-filter:blur(14px); box-shadow:0 8px 22px rgba(10,7,4,.18); }
    .score small { letter-spacing:1.35px; font-size:8px; }
    .score b { display:block; font-size:21px; line-height:23px; letter-spacing:.5px; }
    .score b i { color:#beae8f; font-style:normal; font-size:13px; }
    .score b.pop { animation:count-pop .45s cubic-bezier(.2,1.6,.4,1); }
    @keyframes count-pop { 0% { transform:scale(1); } 40% { transform:scale(1.28); color:#ffe08a; } 100% { transform:scale(1); } }
    .score b { transform-origin:right center; }
    .score span { color:#a19789; font-size:8px; letter-spacing:1.8px; font-weight:800; }
    .status-card { position:absolute; top:106px; left:22px; right:22px; min-height:73px; display:grid; grid-template-columns:40px 1fr auto; align-items:center; gap:12px; padding:12px 15px; border:1px solid rgba(237,217,177,.16); border-radius:17px; background:rgba(26,21,16,.82); backdrop-filter:blur(16px); box-shadow:0 12px 30px rgba(0,0,0,.17); }
    .status-icon { width:36px; height:36px; display:grid; place-items:center; color:#eccf96; font-size:23px; border-radius:12px; background:rgba(226,182,93,.12); }
    #status-message b { display:block; color:#fcf8f0; font-size:11px; letter-spacing:1.5px; }
    #status-message span { display:block; margin-top:4px; color:#cabfa9; font-size:11px; }
    .status-target { display:flex; align-items:center; gap:7px; max-width:185px; padding-left:10px; color:#e1d7c2; font-size:10px; line-height:1.35; border-left:1px solid rgba(230,213,178,.15); }
    .status-target b { color:#fff; }
    .target-dot,.editor-selected i,.editor-picks i { width:8px; height:8px; flex:none; display:inline-block; border-radius:50%; background:var(--dot,#e7c175); box-shadow:0 0 12px var(--dot,#e7c175); }
    .map-card { position:absolute; left:22px; top:193px; width:158px; padding:9px 8px 7px; border:1px solid rgba(237,217,177,.17); border-radius:16px; background:rgba(25,19,14,.76); backdrop-filter:blur(12px); box-shadow:0 12px 32px rgba(0,0,0,.2); }
    .card-cap { display:flex; justify-content:space-between; align-items:center; color:#afa081; letter-spacing:1.7px; font-size:8px; font-weight:900; padding:1px 4px 6px; }
    .scan-live { color:#e0bf7d; letter-spacing:1px; font-size:7px; }
    #mini-map { display:block; width:142px; height:169px; border-radius:11px; }
    .map-legend { padding:4px 3px 0; color:#b8afa2; font-size:7px; font-weight:800; letter-spacing:1px; }
    .map-legend i { width:5px;height:5px;border-radius:50%;display:inline-block;background:#eed39e; margin:0 3px 1px 0; box-shadow:0 0 6px #eed39e; }
    .map-legend span { float:right; color:#dfbe7d; }
    .blueprint-card { --holo:#e7c175; display:none; position:absolute; right:21px; top:193px; width:180px; padding:10px 9px 10px; border:1px solid color-mix(in srgb,var(--holo) 55%,transparent); border-radius:17px; background:linear-gradient(180deg,rgba(26,20,15,.82) 0,rgba(26,20,15,.82) 52px,rgba(18,14,10,.5) 70px,rgba(18,14,10,.5) calc(100% - 26px),rgba(26,20,15,.82) calc(100% - 14px)); box-shadow:0 0 28px rgba(217,159,42,.15),0 12px 30px rgba(0,0,0,.22); }
    .blueprint-card.shown { display:block; animation:card-in .22s ease-out; }
    @keyframes card-in { from { transform:translateY(8px);opacity:0 } to { transform:translateY(0);opacity:1 } }
    .blueprint-card>.card-cap { padding-bottom:3px; }
    #blueprint-title { color:#f9efdb; font-size:15px; letter-spacing:1.3px; padding:3px 4px; display:block; }
    #blueprint-drawing { position:relative; height:224px; overflow:hidden; border-radius:10px; background:radial-gradient(ellipse at 50% 92%,color-mix(in srgb,var(--holo) 22%,transparent),transparent 55%),repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 4px); }
    .holo-scan { position:absolute; left:0; right:0; height:38px; top:-40px; background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--holo) 28%,transparent),transparent); animation:holo-scan 2.6s linear infinite; }
    @keyframes holo-scan { to { top:230px } }
    .holo-corner { position:absolute; width:14px; height:14px; border:2px solid var(--holo); opacity:.75; }
    .holo-corner.a { left:4px; top:4px; border-right:0; border-bottom:0; } .holo-corner.b { right:4px; top:4px; border-left:0; border-bottom:0; }
    .holo-corner.c { left:4px; bottom:4px; border-right:0; border-top:0; } .holo-corner.d { right:4px; bottom:4px; border-left:0; border-top:0; }
    .blueprint-card>small { display:block; text-align:center; color:#c8b388; font-size:7px; letter-spacing:1.15px; }
    .movement-hint { position:absolute; left:50%; top:292px; transform:translateX(-50%); color:rgba(247,242,231,.7); white-space:nowrap; font-size:9px; letter-spacing:.25px; text-shadow:0 2px 8px #16100b; }
    .hint-key { color:#f4ead7; font-weight:900; letter-spacing:1px; }
    .movement-hint i { color:#e0bd77; font-style:normal; margin:0 4px; }
    .mobile-controls { position:absolute; left:21px; right:21px; bottom:37px; display:flex; justify-content:space-between; align-items:flex-end; }
    .stick-zone { position:relative; width:151px; height:151px; pointer-events:auto; touch-action:none; display:flex; justify-content:center; align-items:center; }
    .stick-ring { position:absolute; width:136px; height:136px; border-radius:50%; border:1px solid rgba(235,219,187,.27); background:radial-gradient(circle,rgba(73,61,51,.25),rgba(20,16,12,.32)); box-shadow:inset 0 0 22px rgba(228,185,99,.05),0 6px 22px rgba(0,0,0,.2); }
    .stick-nub { position:absolute; width:61px; height:61px; border-radius:50%; display:grid; place-items:center; color:#f0d8a9; font-size:19px; border:1px solid rgba(237,209,153,.56); background:linear-gradient(145deg,rgba(169,138,75,.62),rgba(55,44,35,.93)); box-shadow:0 5px 16px rgba(0,0,0,.36),inset 0 0 15px rgba(232,197,126,.12); will-change:transform; }
    .stick-zone>small { position:absolute; bottom:2px; color:#c6bba4; font-size:8px; letter-spacing:2px; font-weight:900; text-shadow:0 2px 7px #0e0a06; }
    .mobile-action { pointer-events:auto; touch-action:manipulation; width:124px; height:124px; margin-bottom:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border-radius:50%; border:1.5px solid rgba(230,196,128,.5); color:#faf3e4; background:radial-gradient(circle at 38% 30%,rgba(137,109,53,.88),rgba(37,28,20,.96) 72%); box-shadow:0 0 22px rgba(222,171,69,.14),0 8px 26px rgba(0,0,0,.4),inset 0 0 20px rgba(224,180,92,.14); cursor:pointer; }
    .mobile-action span { color:#efd7a7; font-size:21px; line-height:24px; }
    .mobile-action b { font-size:9px; letter-spacing:1.6px; }
    .mobile-action.ready { border-color:rgba(255,118,124,.78); box-shadow:0 0 24px rgba(255,87,101,.22),0 8px 26px rgba(0,0,0,.38),inset 0 0 20px rgba(236,100,110,.12); }
    .mobile-action:disabled { opacity:.76; }
    .toast { position:absolute; left:50%; bottom:220px; transform:translate(-50%,12px); opacity:0; padding:12px 17px; max-width:85%; border-radius:14px; border:1px solid rgba(229,204,153,.34); background:rgba(24,18,13,.92); color:#fdf9f1; text-align:center; font-size:12px; letter-spacing:.25px; box-shadow:0 9px 25px rgba(0,0,0,.28); transition:opacity .18s,transform .18s; }
    .toast.visible { opacity:1; transform:translate(-50%,0); }
    .toast[data-tone="success"] { border-color:rgba(230,191,112,.51); }
    .finish-banner { position:absolute; inset:0; display:none; pointer-events:auto; align-items:center; justify-content:center; background:rgba(16,12,8,.68); backdrop-filter:blur(9px); }
    .finish-banner.shown { display:flex; }
    .finish-card { width:min(88%,390px); padding:31px 28px 26px; text-align:center; border:1px solid rgba(225,185,105,.46); border-radius:26px; background:linear-gradient(150deg,#34291f,#241d16 68%); box-shadow:0 0 70px rgba(221,168,63,.19); }
    .finish-spark { margin:auto auto 12px; width:54px;height:54px;display:grid;place-items:center;border-radius:17px;background:rgba(227,185,102,.1);color:#eed39c;font-size:28px; }
    .finish-card small { color:#e2c384;letter-spacing:2px;font-size:9px;font-weight:900; }
    .finish-card h2 { margin:12px 0 9px;font-size:29px;line-height:1.12; }
    .finish-card p { color:#d1c7b2;font-size:13px;line-height:1.6; }
    .finish-card button { min-height:52px;margin-top:8px;padding:0 18px;border:1px solid rgba(227,194,127,.5);border-radius:14px;color:white;background:#1b5860;font-weight:850;letter-spacing:1px; }
    .editor-panel { display:none; pointer-events:auto; position:absolute; left:20px; top:190px; width:340px; padding:13px; border:1px solid rgba(229,192,119,.31); border-radius:19px; background:rgba(24,19,13,.94); box-shadow:0 12px 32px rgba(0,0,0,.36); backdrop-filter:blur(16px); }
    .editor-panel.shown { display:block; }
    .editor-head { display:flex; align-items:center; justify-content:space-between; color:#f9efdb; font-size:11px; font-weight:900; letter-spacing:1px; }
    .editor-head small { color:#b9a886;font-size:7px;letter-spacing:.5px; }
    .editor-panel>p { margin:7px 0 9px;color:#c9bfaa;font-size:10px;line-height:1.4; }
    #editor-map { display:block;width:100%;height:auto;max-height:276px;border:1px solid rgba(204,180,131,.16);border-radius:13px;touch-action:none; }
    .editor-selected { display:flex;align-items:center;gap:7px;margin:8px 2px 4px;color:#c1b59e;font-size:9px;letter-spacing:1px; }
    .editor-selected b { color:#faf4e7; }
    .editor-bottom { display:flex;align-items:center;justify-content:space-between;color:#c8bca3;font-size:9px;letter-spacing:1px; }
    .editor-bottom button { min-height:36px;padding:0 10px;border:1px solid rgba(218,204,176,.22);border-radius:10px;color:#e4dbc9;background:rgba(65,55,47,.54);font-size:8px;font-weight:850;letter-spacing:1px; }
    .editor-picks { display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-top:7px; }
    .editor-picks button { flex:1;min-width:0;min-height:42px;padding:3px;border:1px solid rgba(217,203,174,.15);border-radius:10px;color:#d5cbb8;background:rgba(43,35,28,.76);font-size:7px;letter-spacing:.3px;font-weight:850; }
    .editor-picks button.active { border-color:rgba(229,192,117,.58);color:#fdfbf6;background:rgba(102,81,39,.34); }
    .editor-picks i { width:6px;height:6px;margin-right:4px;vertical-align:1px; }
    .editor-note { margin-top:6px;text-align:center;color:#93897a;font-size:8px; }
    .hud.offstage > * { visibility:hidden !important; }
    .gl-lost { display:none; position:absolute; inset:0; z-index:60; align-items:center; justify-content:center; background:rgba(30,22,14,.88); color:#fff3dd; text-align:center; pointer-events:auto; }
    .gl-lost.shown { display:flex; }
    .gl-lost b { display:block; font:600 30px Georgia,serif; }
    .gl-lost span { display:block; margin:12px 40px 0; color:#f2dfc0; font:500 16px system-ui; }
    .gl-lost button { display:none; margin:26px auto 0; width:220px; height:88px; border-radius:24px; border:1px solid #ffe8b8; background:linear-gradient(180deg,#f6d690,#d59c48); color:#3a2310; font:700 24px Georgia,serif; letter-spacing:3px; }
    .gl-lost.stuck button { display:block; }
    .menu-open { pointer-events:auto; position:absolute; left:96px; top:494px; width:64px; height:64px; display:grid; place-items:center; border-radius:16px; border:1px solid rgba(255,214,150,.45); background:linear-gradient(150deg,rgba(58,46,36,.82),rgba(28,24,22,.88)); color:#ffe2b0; font-size:26px; box-shadow:0 6px 18px rgba(0,0,0,.25); }
    .studio-on .menu-open, .edit-mode .menu-open, .edit-mode .studio-open, .edit-mode .sound-toggle { display:none; }
    #finish-rank { margin-left:10px; background:#6a4a22; border-color:rgba(243,201,120,.6); }
    .finish-time { margin:4px 0 6px; color:#f3d38e; font:600 22px Georgia,serif; letter-spacing:1px; }
    /* ---------- loading screen + main menu: warm museum styling over the live 3D gallery ---------- */
    .boot, .menu { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:space-between; padding:92px 44px 96px; color:#fff6e6;
      background:linear-gradient(180deg,rgba(38,26,16,.62),rgba(38,26,16,.08) 30%,rgba(38,26,16,0) 52%,rgba(30,20,12,.78)); }
    .boot { pointer-events:auto; transition:opacity .9s ease, visibility .9s; }
    .boot.done { opacity:0; visibility:hidden; pointer-events:none; }
    .menu { display:none; pointer-events:auto; animation:menu-in .7s ease-out; }
    .menu.shown { display:flex; }
    @keyframes menu-in { from { opacity:0 } to { opacity:1 } }
    .logo { text-align:center; text-shadow:0 4px 26px rgba(50,25,8,.55); }
    .logo small { display:block; color:#f2d49c; font:800 13px system-ui; letter-spacing:4px; }
    .logo h1 { margin:14px 0 8px; font:600 66px/0.98 Georgia,"Times New Roman",serif; letter-spacing:1px; color:#fff8ec; }
    .logo h1 em { display:block; color:#f3c978; font-style:italic; }
    .logo p { margin:0; color:#f8e8cf; font:italic 500 19px Georgia,serif; letter-spacing:1px; }
    .boot-foot { padding:0 12px; }
    .boot-bar { height:8px; border-radius:8px; background:rgba(255,240,214,.24); overflow:hidden; box-shadow:inset 0 1px 3px rgba(0,0,0,.25); }
    .boot-bar i { display:block; height:100%; width:4%; border-radius:8px; background:linear-gradient(90deg,#d79b45,#f6d38b,#fff3d6); transition:width .45s ease; }
    .boot-status { margin-top:16px; text-align:center; color:#fbeedb; font:700 14px system-ui; letter-spacing:2.5px; text-shadow:0 2px 10px rgba(40,20,5,.6); }
    .menu-meta { min-height:24px; margin-bottom:16px; text-align:center; color:#fbe7c8; font:600 15px system-ui; letter-spacing:1.5px; text-shadow:0 2px 10px rgba(40,20,5,.6); }
    .menu-buttons { display:flex; flex-direction:column; gap:16px; }
    .menu-row { display:flex; gap:16px; }
    .menu-btn { flex:1; height:100px; display:flex; align-items:center; justify-content:center; gap:14px; border-radius:26px; border:1px solid rgba(255,226,172,.55);
      background:rgba(44,31,21,.62); backdrop-filter:blur(12px); color:#fff2db; font:700 22px Georgia,serif; letter-spacing:3px; box-shadow:0 10px 26px rgba(30,15,5,.3); cursor:pointer; touch-action:manipulation; }
    .menu-btn span { font-size:24px; color:#f3c978; }
    .menu-btn.primary { height:118px; background:linear-gradient(180deg,#f6d690,#d59c48); color:#3a2310; border-color:#ffe8b8; font-size:32px; box-shadow:0 14px 34px rgba(110,62,18,.45); }
    .menu-btn.primary span { color:#5a3412; font-size:28px; }
    .menu-btn:active { transform:scale(.98); }
    .panel { display:none; position:absolute; left:36px; right:36px; top:50%; transform:translateY(-50%); max-height:84%; overflow:auto; padding:26px 28px 30px; border-radius:30px;
      background:rgba(251,246,236,.97); color:#3b2a1c; box-shadow:0 30px 90px rgba(40,20,5,.5); border:1px solid #e8d4b0; }
    .panel.shown { display:block; animation:card-in .25s ease-out; }
    .panel h2 { margin:0 0 10px; display:flex; justify-content:space-between; align-items:center; font:600 32px Georgia,serif; color:#4a3220; }
    .panel-close { width:72px; height:72px; border-radius:22px; border:1px solid #dcc59f; background:#fff8ec; color:#6a4a2a; font-size:26px; }
    .set-row { padding:16px 0; border-bottom:1px solid #eadcc4; }
    .set-row label { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font:800 15px system-ui; letter-spacing:1.5px; color:#5a4029; }
    .set-row output { font:600 17px Georgia,serif; color:#a46c25; letter-spacing:0; }
    .set-row input[type=range] { width:100%; height:44px; accent-color:#c98c3a; }
    .seg { display:flex; gap:12px; }
    .seg button { flex:1; height:68px; border-radius:18px; border:1px solid #dcc59f; background:#fff8ec; color:#6a4a2a; font:800 16px system-ui; letter-spacing:1.5px; }
    .seg button.on { background:linear-gradient(180deg,#e9b763,#c98c3a); border-color:#b97b2b; color:#fff; }
    .danger { width:100%; height:76px; margin-top:22px; border-radius:20px; border:1px solid #e0a796; background:#fff1ec; color:#a3402c; font:800 16px system-ui; letter-spacing:1.5px; }
    .danger.armed { background:#c0503a; color:#fff; border-color:#a83e2a; }
    .lb-body { min-height:240px; }
    .lb-row { display:grid; grid-template-columns:44px 52px 1fr auto; align-items:center; gap:12px; padding:12px 8px; border-bottom:1px solid #eadcc4; font:600 18px system-ui; color:#4a3220; }
    .lb-row.me { background:#fbe9c8; border-radius:16px; border-bottom-color:transparent; }
    .lb-rank { font:700 22px Georgia,serif; color:#b07a2c; text-align:center; }
    .lb-avatar { width:48px; height:48px; border-radius:50%; background:#ead6b2; display:grid; place-items:center; overflow:hidden; font:800 18px system-ui; color:#6a4a2a; }
    .lb-avatar img { width:100%; height:100%; object-fit:cover; }
    .lb-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .lb-time { font:700 20px Georgia,serif; color:#3b2a1c; }
    .lb-note { margin:18px 4px; text-align:center; color:#8a7055; font:500 16px/1.5 system-ui; }
    .hud.studio-on > *:not(.studio) { visibility:hidden; }
    .studio-open { pointer-events:auto; position:absolute; left:22px; top:420px; width:158px; height:64px; display:grid; grid-template-columns:34px 1fr; grid-template-rows:1fr 1fr; align-items:center; padding:0 12px; border-radius:16px; border:1px solid rgba(255,156,207,.45); background:linear-gradient(135deg,rgba(60,30,70,.85),rgba(28,24,20,.85)); color:#ffe2f2; text-align:left; box-shadow:0 0 22px rgba(255,120,190,.18); }
    .sound-toggle { pointer-events:auto; position:absolute; left:22px; top:494px; width:64px; height:64px; display:grid; place-items:center; border-radius:16px; border:1px solid rgba(255,214,150,.45); background:linear-gradient(150deg,rgba(58,46,36,.82),rgba(28,24,22,.88)); color:#ffe2b0; font-size:26px; box-shadow:0 6px 18px rgba(0,0,0,.25); }
    .sound-toggle.off { color:rgba(255,226,176,.45); } .sound-toggle.off span { position:relative; } .sound-toggle.off span::after { content:''; position:absolute; left:-6px; right:-6px; top:50%; height:2px; background:currentColor; transform:rotate(-40deg); }
    .studio-on .sound-toggle { display:none; }
    .studio-open span { grid-row:span 2; font-size:22px; color:#ffb0dc; } .studio-open b { font-size:13px; letter-spacing:2px; align-self:end; } .studio-open small { font-size:8px; letter-spacing:1.6px; color:#c7a8d8; align-self:start; }
    .studio { display:none; position:absolute; inset:0; pointer-events:auto; z-index:30; }
    .studio.shown { display:block; }
    .studio-stage { position:absolute; inset:0; touch-action:none; cursor:grab; }
    .studio-top { position:absolute; top:22px; left:22px; right:22px; display:flex; justify-content:space-between; align-items:flex-start; pointer-events:none; }
    .studio-top small { display:block; color:#c6a8dc; font-size:9px; font-weight:900; letter-spacing:2.2px; } .studio-top b { display:block; margin-top:4px; font-size:30px; letter-spacing:2px; color:#fff; text-shadow:0 0 18px rgba(255,140,200,.45); } .studio-top span { display:block; color:#d9c8e6; font-size:13px; margin-top:2px; }
    .studio-top button, .studio-arrow, .studio-expr button { pointer-events:auto; }
    #studio-close { width:64px; height:64px; border-radius:18px; border:1px solid rgba(255,255,255,.25); background:rgba(23,19,15,.7); color:#fff; font-size:24px; }
    .studio-arrow { position:absolute; top:46%; width:72px; height:120px; border-radius:22px; border:1px solid rgba(255,190,225,.35); background:rgba(23,19,15,.55); color:#ffd7ee; font-size:54px; line-height:1; }
    .studio-arrow.left { left:16px; } .studio-arrow.right { right:16px; }
    .studio-bottom { position:absolute; left:16px; right:16px; bottom:26px; text-align:center; }
    .studio-count { display:inline-block; margin-bottom:12px; padding:6px 14px; border-radius:20px; background:rgba(23,19,15,.7); color:#e9d6f4; font-size:12px; letter-spacing:2px; font-weight:800; }
    .studio-expr { display:grid; grid-template-columns:repeat(5,1fr); gap:9px; }
    .studio-expr button { min-height:64px; border-radius:16px; border:1px solid rgba(255,190,225,.3); background:rgba(28,23,18,.78); color:#f3e6fb; font-size:13px; font-weight:800; letter-spacing:.8px; text-transform:uppercase; }
    .studio-expr button.active { background:linear-gradient(135deg,#ff7ab8,#9a6cff); border-color:transparent; color:#fff; box-shadow:0 0 18px rgba(255,120,190,.45); }
    .edit-badge { position:absolute; right:22px; bottom:55px; padding:10px 13px;border-radius:12px;border:1px solid rgba(228,191,116,.32);background:rgba(24,19,13,.82);color:#e7c98d;font-size:9px;letter-spacing:1.2px;font-weight:900; }
    .edit-badge span { color:#aea598;font-weight:600;letter-spacing:.3px; }
    .edit-mode .mobile-controls,.edit-mode .movement-hint,.edit-mode .map-card,.edit-mode .status-card { display:none; }
    .fatal { position:absolute;inset:0;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;padding:32px;color:white;text-align:center;background:#211b16; }
    .fatal b { font-size:24px; }.fatal span{color:#d1c8b7}.fatal small{color:#887f71;font-size:10px}
    @media (max-width:520px) {
      .topbar{left:16px;right:16px;top:14px}.brand strong{font-size:15px}.brand-mark{width:38px;height:38px}
      .status-card{top:94px;left:14px;right:14px;grid-template-columns:32px 1fr;gap:8px;padding:10px 11px;min-height:65px}
      .status-icon{width:31px;height:31px}.status-target{display:none}
      .map-card{top:169px;left:14px;transform:scale(.9);transform-origin:top left}
      .studio-open{top:378px;left:14px}.sound-toggle{top:452px;left:14px}.menu-open{top:452px;left:88px}.studio-expr button{font-size:11px;min-height:58px}
      .blueprint-card{top:169px;right:12px;transform:scale(.9);transform-origin:top right}
      .movement-hint{top:340px;font-size:8px}
      .mobile-controls{left:11px;right:11px;bottom:28px}.stick-zone{width:135px;height:145px}.stick-ring{width:124px;height:124px}.stick-nub{width:56px;height:56px}.mobile-action{width:111px;height:111px;margin-bottom:9px}
      .toast{bottom:185px;font-size:11px}.editor-panel{left:12px;top:167px;width:min(340px,calc(100vw - 24px))}.edit-badge{right:12px;bottom:24px;font-size:8px}
    }
  `;
  document.head.appendChild(style);
}

export function blueprintSvg(held, color) {
  const styleFor = (id) => id === held ? 'active' : 'ghost';
  const paths = {
    head: `<g class="part ${styleFor('head')}" stroke-linejoin="round"><path d="M73 49 Q73 27 91 24 Q110 27 109 48 L105 70 Q102 81 91 82 Q79 80 76 68Z"/><path d="M74 45 Q77 23 95 23 Q112 24 112 42 L105 37 Q97 40 91 33 Q84 41 75 43Z"/><path d="M82 54h2m15 0h2" stroke-width="3"/></g>`,
    torso: `<g class="part ${styleFor('torso')}" stroke-linejoin="round"><path d="M75 84 Q79 78 90 78 Q102 78 107 84 L117 97 L109 105 L105 100 L108 134 Q91 141 74 134 L77 100 L71 105 L64 98Z"/><path d="M87 84l4 8 5-8"/><path d="M92 94v27" stroke-dasharray="2 4"/></g>`,
    armL: `<g class="part ${styleFor('armL')}" stroke-linecap="round" stroke-linejoin="round"><path d="M71 91 Q62 87 58 97 L49 119 Q46 127 53 130 Q59 132 63 123 L75 105"/><path d="M52 122l-2 7"/></g>`,
    armR: `<g class="part ${styleFor('armR')}" stroke-linecap="round" stroke-linejoin="round"><path d="M109 91 Q118 87 122 97 L131 119 Q134 127 127 130 Q121 132 117 123 L105 105"/><path d="M128 122l2 7"/></g>`,
    legs: `<g class="part ${styleFor('legs')}" stroke-linejoin="round"><path d="M77 134 Q91 138 105 134 L103 157 L101 177 L88 177 L87 155 L84 177 L71 177 L74 154Z"/><path d="M71 177h16m14 0h13"/></g>`,
  };
  return `<svg viewBox="0 0 180 212" role="img" aria-label="Blueprint, held piece highlighted in red"><defs><filter id="redglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="3 5" opacity=".42"><path d="M90 15v173"/><path d="M42 89h96"/><path d="M90 70v7M90 142v8"/></g><g fill="rgba(63,213,230,.055)" stroke="${color}" stroke-width="2">${paths.head}${paths.torso}${paths.armL}${paths.armR}${paths.legs}</g><path d="M53 187h74" stroke="${color}" opacity=".45" stroke-width="2"/><text x="90" y="202" fill="${color}" font-size="7" text-anchor="middle" letter-spacing="2" opacity=".7">ASSEMBLY GUIDE / 01</text><style>.part{transition:all .2s}.part.ghost{stroke-dasharray:2 4;opacity:.78}.part.active{stroke:#ff5269;stroke-width:3.2;fill:rgba(255,53,82,.24);filter:url(#redglow);transform:translateY(-2px)}</style></svg>`;
}

export function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.arcTo(x + width, y, x + width, y + height, radius); ctx.arcTo(x + width, y + height, x, y + height, radius); ctx.arcTo(x, y + height, x, y, radius); ctx.arcTo(x, y, x + width, y, radius); ctx.closePath();
}
export function escapeHtml(text) { return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
