// Shop / wardrobe panel: a bottom sheet with tabs, item cards (tap = try on) and one action button.
// The panel only renders and reports choices; the game owns coins, inventory and the character.
const CSS = `
#shop{position:absolute;left:0;right:0;bottom:0;height:640px;display:none;pointer-events:auto;z-index:60;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1d3a5c;
 background:rgba(236,244,252,.97);border-radius:36px 36px 0 0;box-shadow:0 -10px 40px rgba(10,25,50,.35);padding:22px 26px 24px;box-sizing:border-box;touch-action:pan-y}
#shop .hd{display:flex;align-items:center;gap:12px}
#shop .ttl{flex:1;font-size:36px;font-weight:800;line-height:1.05}#shop .ttl small{display:block;font-size:20px;font-weight:600;opacity:.7;margin-top:2px}
#shop .coin{font-size:28px;font-weight:800;padding:8px 18px;border-radius:20px;background:#fff3cf;color:#8a5a00}
#shop .x{width:56px;height:56px;border-radius:28px;border:0;background:#d6e3f1;color:#1d3a5c;font-size:28px;font-weight:800;cursor:pointer}
#shop .tabs{display:flex;gap:8px;margin:14px 0 10px;overflow-x:auto}
#shop .tab{flex:none;padding:8px 18px;border-radius:18px;border:0;background:#d6e3f1;color:#1d3a5c;font-size:22px;font-weight:700;cursor:pointer}
#shop .tab.on{background:#3fa7ff;color:#fff}
#shop .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;height:292px;overflow-y:auto;padding:2px}
#shop .card{border-radius:20px;background:#fff;border:3px solid transparent;padding:10px 6px 8px;text-align:center;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:128px}
#shop .card.on{border-color:#3fa7ff;background:#eaf5ff}
#shop .sw{width:46px;height:46px;border-radius:50%;border:3px solid rgba(29,58,92,.25);margin-bottom:6px}
#shop .nm{font-size:19px;font-weight:700;line-height:1.1}
#shop .pr{font-size:19px;font-weight:800;margin-top:4px;color:#8a5a00}#shop .pr.st{color:#2a8a55}
#shop .ft{margin-top:12px;display:flex;align-items:center;gap:14px}
#shop .ds{flex:1;font-size:21px;font-weight:600;line-height:1.25;min-height:54px}
#shop .go{flex:none;min-width:210px;padding:16px 20px;border-radius:22px;border:0;background:#3fa7ff;color:#fff;font-size:26px;font-weight:800;cursor:pointer}
#shop .go[disabled]{background:#b9c8d8;color:#eef3f8;cursor:default}
#shop .msg{height:26px;font-size:21px;font-weight:700;color:#2a8a55;margin-top:6px}
`;

export function createShop(root) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = document.createElement('div'); el.id = 'shop';
  el.innerHTML = '<div class="hd"><div class="ttl"><span id="shT"></span><small id="shS"></small></div><div class="coin" id="shC"></div><button class="x" id="shX">✕</button></div>' +
    '<div class="tabs" id="shTabs"></div><div class="grid" id="shGrid"></div><div class="msg" id="shM"></div><div class="ft"><div class="ds" id="shD"></div><button class="go" id="shGo"></button></div>';
  root.appendChild(el);
  const $ = (id) => el.querySelector('#' + id);
  let cfg = null, tab = 0, sel = null, msgTimer = 0;
  const price = (it) => (cfg.price ? cfg.price(it) : it.price);
  const hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0');

  function items() { const t = cfg.tabs[tab]; return cfg.wardrobe ? t.items.filter((i) => i.id === null || cfg.owns(i.id)) : t.items; }
  function state(it) {
    if (it.id === null) return cfg.worn(cfg.tabs[tab].slot) ? 'equip' : 'worn';
    if (it.food) return 'eat';
    if (cfg.worn(it.slot) === it.id) return 'worn';
    return cfg.owns(it.id) ? 'equip' : 'buy';
  }
  function render() {
    $('shC').textContent = '● ' + cfg.coins();
    $('shTabs').innerHTML = cfg.tabs.length > 1 ? cfg.tabs.map((t, i) => '<button class="tab' + (i === tab ? ' on' : '') + '" data-t="' + i + '">' + t.label + '</button>').join('') : '';
    const list = items();
    if (sel === null || !list.some((i) => i.id === sel)) sel = list.length ? (list.find((i) => i.id !== null && cfg.worn(i.slot) === i.id) || list[0]).id : null;
    $('shGrid').innerHTML = list.map((it) => {
      const st = it.id === null ? '' : state(it), tag = it.id === null ? '<div class="pr st">Standard</div>' : st === 'worn' ? '<div class="pr st">Worn</div>' : st === 'equip' ? '<div class="pr st">Owned</div>' : '<div class="pr">● ' + price(it) + '</div>';
      return '<div class="card' + (it.id === sel ? ' on' : '') + '" data-i="' + (it.id === null ? '' : it.id) + '"><div class="sw" style="background:' + (it.id === null ? 'repeating-linear-gradient(45deg,#cfd8e3,#cfd8e3 6px,#e9eef4 6px,#e9eef4 12px)' : hex(it.color)) + '"></div><div class="nm">' + it.name + '</div>' + tag + '</div>';
    }).join('') || '<div style="grid-column:1/4;font-size:22px;font-weight:600;opacity:.7;padding:30px;text-align:center">Nothing here yet. Visit the shops to buy something.</div>';
    const it = list.find((i) => i.id === sel), go = $('shGo');
    if (!it) { $('shD').textContent = ''; go.style.display = 'none'; return; }
    go.style.display = '';
    $('shD').textContent = it.id === null ? 'Your standard ' + cfg.tabs[tab].label.toLowerCase() + '.' : (it.desc || it.name) + (it.price && price(it) < it.price ? '  (friend discount −' + Math.round((1 - price(it) / it.price) * 100) + '%)' : '');
    const st = it.id === null ? (cfg.worn(cfg.tabs[tab].slot) ? 'equip' : 'worn') : state(it);
    go.disabled = false;
    if (st === 'worn') { go.textContent = 'Worn ✓'; go.disabled = true; }
    else if (st === 'equip') go.textContent = it.id === null ? 'Wear standard' : 'Wear';
    else { go.textContent = 'Buy · ● ' + price(it); go.disabled = cfg.coins() < price(it); }
  }
  function say(t) { $('shM').textContent = t; msgTimer = 2.4; }
  function pick(id) {
    sel = id; render();
    const t = cfg.tabs[tab]; if (t.slot && !t.consumable) cfg.preview(t.slot, id);
  }
  $('shGrid').addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) pick(c.dataset.i === '' ? null : c.dataset.i); });
  $('shTabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) { cfg.preview(null, null); tab = +b.dataset.t; sel = null; render(); const t = cfg.tabs[tab]; if (t.slot && !t.consumable) cfg.preview(t.slot, sel); } });
  $('shGo').addEventListener('click', () => {
    const t = cfg.tabs[tab], list = items(), it = list.find((i) => i.id === sel); if (!it) return;
    const st = it.id === null ? 'equip' : state(it);
    if (st === 'equip') { cfg.equip(t.slot, it.id); say(it.id === null ? 'Standard look restored' : 'Looking good!'); }
    else if (st === 'buy') { const r = cfg.buy(it); say(r.msg); if (r.ok) cfg.equip(it.slot, it.id); }
    else if (st === 'eat') say(cfg.consume(it).msg);
    render();
  });
  $('shX').addEventListener('click', () => close());
  const onKey = (e) => { if (cfg && e.key === 'Escape') close(); };
  window.addEventListener('keydown', onKey);

  function open(c) { cfg = c; tab = 0; sel = null; $('shT').textContent = c.title || ''; $('shS').textContent = c.sub || ''; el.style.display = 'block'; render(); const t = cfg.tabs[0]; if (t && t.slot && !t.consumable && sel !== undefined) cfg.preview(t.slot, sel); cfg.onOpen && cfg.onOpen(); }
  function close() { if (!cfg) return; el.style.display = 'none'; const c = cfg; cfg = null; c.preview(null, null); c.onClose && c.onClose(); }
  function update(dt) { if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) $('shM').textContent = ''; } if (cfg) $('shC').textContent = '● ' + cfg.coins(); }
  return { open, close, update, get isOpen() { return !!cfg; }, destroy() { window.removeEventListener('keydown', onKey); el.remove(); style.remove(); } };
}
