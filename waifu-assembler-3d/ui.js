import { SETS } from './logic.mjs';

// HUD markup, stylesheet, blueprint drawing and small canvas helpers shared by the Babylon.js renderer.
export function uiMarkup(editing) {
  return `
    <div class="hud ${editing ? 'edit-mode' : ''}">
      <header class="topbar">
        <div class="brand"><div class="brand-mark">✦</div><div><small>ATELIER K—07</small><strong>WAIFU <em>ASSEMBLER</em></strong></div></div>
        <div class="score"><small>${editing ? 'EDITOR PREVIEW' : 'RESTORATION RUN'}</small><b id="progress-count">0 <i>/ 30</i></b><span>PARTS PLACED</span></div>
      </header>
      <section class="status-card"><div class="status-icon">⌖</div><div id="status-message"><b>SEARCH THE HALL</b><span>30 fragments are waiting to be found</span></div><div class="status-target" id="target-info"><i class="target-dot"></i><span>Check the map for your next fragment</span></div></section>
      <section class="map-card"><div class="card-cap"><span>FIELD SCAN</span><span class="scan-live">● LIVE</span></div><canvas id="mini-map" width="158" height="188"></canvas><div class="map-legend"><i></i> FRAGMENT <span>◇ ANNEX</span></div></section>
      <section class="blueprint-card" id="blueprint-card"><div class="card-cap"><span>HOLOGRAM / 3D</span><span class="scan-live">● LINKED</span></div><b id="blueprint-title">OFFICE-01</b><div id="blueprint-drawing"></div><small id="blueprint-foot">HELD COMPONENT / HEAD</small></section>
      <div class="movement-hint"><span class="hint-key">DRAG</span> to look <i>·</i> <span class="hint-key">WASD</span> to walk <i>·</i> <span class="hint-key">E</span> to interact</div>
      <div class="mobile-controls">
        <div id="stick-zone" class="stick-zone" aria-label="Move"><div class="stick-ring"></div><div id="stick-nub" class="stick-nub"><span>✦</span></div><small>MOVE</small></div>
        <button id="mobile-action" class="mobile-action" aria-label="Collect or assemble"><span>✦</span><b id="action-label">SEARCH</b></button>
      </div>
      <div id="toast" class="toast"></div>
      <div id="finish-banner" class="finish-banner"><div class="finish-card"><div class="finish-spark">✦</div><small>RESTORATION COMPLETE</small><h2>Six figures.<br>One brilliant curator.</h2><p>Office-01, Nurse-01, CEO-01, Student-01, Idol-01 and Janitor-01 are all back on display. The atelier looks rather pleased with itself.</p><button id="finish-close">BACK TO THE HALL</button></div></div>
      <section id="editor-panel" class="editor-panel">
        <div class="editor-head"><span>✦ &nbsp; RESTORATION ANNEX</span><small>OUTSIDE THE 150 × 150 HALL</small></div>
        <p>Choose a wall-side podium, then drag it. The spacious center stays open.</p>
        <canvas id="editor-map" width="320" height="276" aria-label="Drag a podium to reposition it"></canvas>
        <div class="editor-selected" id="editor-selected"></div>
        <div class="editor-bottom"><span id="editor-coords"></span><button id="editor-reset">RESET LAYOUT</button></div>
        <div class="editor-picks">${SETS.map((set) => `<button data-editor-set="${set.id}"><i style="--dot:${set.color}"></i>${set.name}</button>`).join('')}</div>
        <div class="editor-note">Drag a marker on the plan or select a podium to reposition it.</div>
      </section>
      ${editing ? '<div class="edit-badge">EDITOR MODE <span>· gameplay paused</span></div>' : ''}
    </div>`;
}

export function installStyles() {
  if (document.getElementById('waifu-assembler-css')) return;
  const style = document.createElement('style');
  style.id = 'waifu-assembler-css';
  style.textContent = `
    #waifu-assembler-root { position:fixed; inset:0; overflow:hidden; width:100%; height:100%; background:#111426; color:#eff6ff; font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; -webkit-user-select:none; user-select:none; }
    #waifu-assembler-root * { box-sizing:border-box; }
    .game-canvas { position:absolute; inset:0; display:block; width:100%; height:100%; touch-action:none; outline:none; }
    .hud { position:absolute; inset:0; pointer-events:none; overflow:hidden; background:linear-gradient(180deg,rgba(8,12,25,.74),transparent 18%,transparent 70%,rgba(8,12,24,.25)); }
    .topbar { position:absolute; top:20px; left:23px; right:23px; height:69px; display:flex; align-items:center; justify-content:space-between; }
    .brand { display:flex; align-items:center; gap:12px; filter:drop-shadow(0 3px 10px #060915); }
    .brand-mark { width:42px; height:42px; border:1px solid rgba(114,224,237,.58); border-radius:14px; display:grid; place-items:center; color:#91edf0; font-size:24px; background:linear-gradient(145deg,rgba(39,117,143,.37),rgba(28,41,70,.72)); box-shadow:inset 0 0 18px rgba(75,223,232,.12); }
    .brand small,.score small { display:block; color:#9eb3c8; letter-spacing:2px; font-size:9px; font-weight:800; }
    .brand strong { display:block; margin-top:3px; font-size:18px; line-height:1.05; letter-spacing:1.1px; font-weight:850; }
    .brand em { font-style:normal; color:#87e3e9; }
    .score { min-width:112px; text-align:right; padding:9px 13px; border:1px solid rgba(184,218,237,.16); background:rgba(10,16,29,.74); border-radius:14px; backdrop-filter:blur(14px); box-shadow:0 8px 22px rgba(2,5,12,.18); }
    .score small { letter-spacing:1.35px; font-size:8px; }
    .score b { display:block; font-size:21px; line-height:23px; letter-spacing:.5px; }
    .score b i { color:#8fa7be; font-style:normal; font-size:13px; }
    .score span { color:#8195a9; font-size:8px; letter-spacing:1.8px; font-weight:800; }
    .status-card { position:absolute; top:106px; left:22px; right:22px; min-height:73px; display:grid; grid-template-columns:40px 1fr auto; align-items:center; gap:12px; padding:12px 15px; border:1px solid rgba(177,220,237,.16); border-radius:17px; background:rgba(11,17,31,.82); backdrop-filter:blur(16px); box-shadow:0 12px 30px rgba(0,0,0,.17); }
    .status-icon { width:36px; height:36px; display:grid; place-items:center; color:#94e8ee; font-size:23px; border-radius:12px; background:rgba(93,214,226,.12); }
    #status-message b { display:block; color:#f0f8fc; font-size:11px; letter-spacing:1.5px; }
    #status-message span { display:block; margin-top:4px; color:#a9bbca; font-size:11px; }
    .status-target { display:flex; align-items:center; gap:7px; max-width:185px; padding-left:10px; color:#c2d4e1; font-size:10px; line-height:1.35; border-left:1px solid rgba(178,216,230,.15); }
    .status-target b { color:#fff; }
    .target-dot,.editor-selected i,.editor-picks i { width:8px; height:8px; flex:none; display:inline-block; border-radius:50%; background:var(--dot,#73e4e9); box-shadow:0 0 12px var(--dot,#73e4e9); }
    .map-card { position:absolute; left:22px; top:193px; width:158px; padding:9px 8px 7px; border:1px solid rgba(177,220,237,.17); border-radius:16px; background:rgba(10,16,29,.76); backdrop-filter:blur(12px); box-shadow:0 12px 32px rgba(0,0,0,.2); }
    .card-cap { display:flex; justify-content:space-between; align-items:center; color:#819caf; letter-spacing:1.7px; font-size:8px; font-weight:900; padding:1px 4px 6px; }
    .scan-live { color:#7de0d0; letter-spacing:1px; font-size:7px; }
    #mini-map { display:block; width:142px; height:169px; border-radius:11px; }
    .map-legend { padding:4px 3px 0; color:#9bb0bf; font-size:7px; font-weight:800; letter-spacing:1px; }
    .map-legend i { width:5px;height:5px;border-radius:50%;display:inline-block;background:#9cecf0; margin:0 3px 1px 0; box-shadow:0 0 6px #9cecf0; }
    .map-legend span { float:right; color:#7dd9df; }
    .blueprint-card { display:none; position:absolute; right:21px; top:193px; width:180px; padding:10px 9px 10px; border:1px solid rgba(89,228,237,.42); border-radius:17px; background:linear-gradient(160deg,rgba(11,28,43,.9),rgba(13,16,32,.85)); backdrop-filter:blur(13px); box-shadow:0 0 28px rgba(36,205,223,.15),0 12px 30px rgba(0,0,0,.22); }
    .blueprint-card.shown { display:block; animation:card-in .22s ease-out; }
    @keyframes card-in { from { transform:translateY(8px);opacity:0 } to { transform:translateY(0);opacity:1 } }
    .blueprint-card>.card-cap { padding-bottom:3px; }
    #blueprint-title { color:#d5fbff; font-size:15px; letter-spacing:1.3px; padding:3px 4px; display:block; }
    #blueprint-drawing { height:224px; overflow:hidden; }
    #blueprint-drawing svg { width:100%; height:100%; filter:drop-shadow(0 0 5px rgba(74,222,240,.22)); }
    .blueprint-card>small { display:block; text-align:center; color:#88b9c8; font-size:7px; letter-spacing:1.15px; }
    .movement-hint { position:absolute; left:50%; top:292px; transform:translateX(-50%); color:rgba(231,240,247,.7); white-space:nowrap; font-size:9px; letter-spacing:.25px; text-shadow:0 2px 8px #07111a; }
    .hint-key { color:#d7edf4; font-weight:900; letter-spacing:1px; }
    .movement-hint i { color:#77dbe0; font-style:normal; margin:0 4px; }
    .mobile-controls { position:absolute; left:21px; right:21px; bottom:37px; display:flex; justify-content:space-between; align-items:flex-end; }
    .stick-zone { position:relative; width:151px; height:151px; pointer-events:auto; touch-action:none; display:flex; justify-content:center; align-items:center; }
    .stick-ring { position:absolute; width:136px; height:136px; border-radius:50%; border:1px solid rgba(187,222,235,.27); background:radial-gradient(circle,rgba(42,63,82,.25),rgba(8,13,24,.32)); box-shadow:inset 0 0 22px rgba(96,218,231,.05),0 6px 22px rgba(0,0,0,.2); }
    .stick-nub { position:absolute; width:61px; height:61px; border-radius:50%; display:grid; place-items:center; color:#a9eff0; font-size:19px; border:1px solid rgba(153,230,237,.56); background:linear-gradient(145deg,rgba(75,150,169,.62),rgba(27,42,63,.93)); box-shadow:0 5px 16px rgba(0,0,0,.36),inset 0 0 15px rgba(114,244,241,.12); will-change:transform; }
    .stick-zone>small { position:absolute; bottom:2px; color:#a4b7c6; font-size:8px; letter-spacing:2px; font-weight:900; text-shadow:0 2px 7px #030711; }
    .mobile-action { pointer-events:auto; touch-action:manipulation; width:124px; height:124px; margin-bottom:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border-radius:50%; border:1.5px solid rgba(128,219,230,.5); color:#dffbff; background:radial-gradient(circle at 38% 30%,rgba(53,116,137,.88),rgba(13,25,44,.96) 72%); box-shadow:0 0 22px rgba(68,207,223,.14),0 8px 26px rgba(0,0,0,.4),inset 0 0 20px rgba(92,206,224,.14); cursor:pointer; }
    .mobile-action span { color:#a6edf0; font-size:21px; line-height:24px; }
    .mobile-action b { font-size:9px; letter-spacing:1.6px; }
    .mobile-action.ready { border-color:rgba(255,118,124,.78); box-shadow:0 0 24px rgba(255,87,101,.22),0 8px 26px rgba(0,0,0,.38),inset 0 0 20px rgba(236,100,110,.12); }
    .mobile-action:disabled { opacity:.76; }
    .toast { position:absolute; left:50%; bottom:220px; transform:translate(-50%,12px); opacity:0; padding:12px 17px; max-width:85%; border-radius:14px; border:1px solid rgba(153,228,229,.34); background:rgba(8,15,29,.92); color:#efffff; text-align:center; font-size:12px; letter-spacing:.25px; box-shadow:0 9px 25px rgba(0,0,0,.28); transition:opacity .18s,transform .18s; }
    .toast.visible { opacity:1; transform:translate(-50%,0); }
    .toast[data-tone="success"] { border-color:rgba(112,230,186,.51); }
    .finish-banner { position:absolute; inset:0; display:none; pointer-events:auto; align-items:center; justify-content:center; background:rgba(5,8,19,.68); backdrop-filter:blur(9px); }
    .finish-banner.shown { display:flex; }
    .finish-card { width:min(88%,390px); padding:31px 28px 26px; text-align:center; border:1px solid rgba(105,225,220,.46); border-radius:26px; background:linear-gradient(150deg,#17283c,#111629 68%); box-shadow:0 0 70px rgba(63,206,221,.19); }
    .finish-spark { margin:auto auto 12px; width:54px;height:54px;display:grid;place-items:center;border-radius:17px;background:rgba(102,227,220,.1);color:#99f1e6;font-size:28px; }
    .finish-card small { color:#84e2d1;letter-spacing:2px;font-size:9px;font-weight:900; }
    .finish-card h2 { margin:12px 0 9px;font-size:29px;line-height:1.12; }
    .finish-card p { color:#b2c4d1;font-size:13px;line-height:1.6; }
    .finish-card button { min-height:52px;margin-top:8px;padding:0 18px;border:1px solid rgba(127,227,218,.5);border-radius:14px;color:white;background:#1b5860;font-weight:850;letter-spacing:1px; }
    .editor-panel { display:none; pointer-events:auto; position:absolute; left:20px; top:190px; width:340px; padding:13px; border:1px solid rgba(119,223,229,.31); border-radius:19px; background:rgba(9,15,29,.94); box-shadow:0 12px 32px rgba(0,0,0,.36); backdrop-filter:blur(16px); }
    .editor-panel.shown { display:block; }
    .editor-head { display:flex; align-items:center; justify-content:space-between; color:#d8fbfc; font-size:11px; font-weight:900; letter-spacing:1px; }
    .editor-head small { color:#86abb9;font-size:7px;letter-spacing:.5px; }
    .editor-panel>p { margin:7px 0 9px;color:#aabac9;font-size:10px;line-height:1.4; }
    #editor-map { display:block;width:100%;height:auto;max-height:276px;border:1px solid rgba(131,190,204,.16);border-radius:13px;touch-action:none; }
    .editor-selected { display:flex;align-items:center;gap:7px;margin:8px 2px 4px;color:#9eb2c1;font-size:9px;letter-spacing:1px; }
    .editor-selected b { color:#e7f5fa; }
    .editor-bottom { display:flex;align-items:center;justify-content:space-between;color:#a3bac8;font-size:9px;letter-spacing:1px; }
    .editor-bottom button { min-height:36px;padding:0 10px;border:1px solid rgba(176,203,218,.22);border-radius:10px;color:#c9d8e4;background:rgba(40,52,72,.54);font-size:8px;font-weight:850;letter-spacing:1px; }
    .editor-picks { display:flex;gap:4px;margin-top:7px; }
    .editor-picks button { flex:1;min-width:0;min-height:42px;padding:3px;border:1px solid rgba(174,203,217,.15);border-radius:10px;color:#b8c8d5;background:rgba(22,32,49,.76);font-size:7px;letter-spacing:.3px;font-weight:850; }
    .editor-picks button.active { border-color:rgba(117,222,229,.58);color:#f4fdff;background:rgba(39,92,102,.34); }
    .editor-picks i { width:6px;height:6px;margin-right:4px;vertical-align:1px; }
    .editor-note { margin-top:6px;text-align:center;color:#718c9c;font-size:8px; }
    .edit-badge { position:absolute; right:22px; bottom:55px; padding:10px 13px;border-radius:12px;border:1px solid rgba(116,228,224,.32);background:rgba(9,17,29,.82);color:#8de7df;font-size:9px;letter-spacing:1.2px;font-weight:900; }
    .edit-badge span { color:#91a8b5;font-weight:600;letter-spacing:.3px; }
    .edit-mode .mobile-controls,.edit-mode .movement-hint,.edit-mode .map-card,.edit-mode .status-card { display:none; }
    .fatal { position:absolute;inset:0;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;padding:32px;color:white;text-align:center;background:#111426; }
    .fatal b { font-size:24px; }.fatal span{color:#b7c6d1}.fatal small{color:#697f90;font-size:10px}
    @media (max-width:520px) {
      .topbar{left:16px;right:16px;top:14px}.brand strong{font-size:15px}.brand-mark{width:38px;height:38px}
      .status-card{top:94px;left:14px;right:14px;grid-template-columns:32px 1fr;gap:8px;padding:10px 11px;min-height:65px}
      .status-icon{width:31px;height:31px}.status-target{display:none}
      .map-card{top:169px;left:14px;transform:scale(.9);transform-origin:top left}
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
