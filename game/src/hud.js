// Static HUD skeleton for the 720x1280 layout (bottom half). Wiring to the game loop comes in step 4.
// Layout: 3 slots 150x150, 12 ingredient cards 96x96 in a 6x2 grid, all below y = 640.
import { INGREDIENTS, STARTER_IDS, ingredientName } from './ingredients.js';

export function buildHud(root, cfg) {
  root.innerHTML = '';
  const css = document.createElement('style');
  css.textContent = `
    .slot { position:absolute; top:24px; width:150px; height:150px; border-radius:24px; box-sizing:border-box;
            background:#fff7f0; border:4px dashed #ffb5a7; }
    .card { position:absolute; width:96px; height:96px; border-radius:20px; box-sizing:border-box;
            border:4px solid #fff; box-shadow:0 4px 0 rgba(0,0,0,.12); display:flex; flex-direction:column;
            align-items:center; justify-content:flex-end; padding-bottom:6px; color:#4a3b36; font:600 15px system-ui,sans-serif; }
    .card.locked { filter:grayscale(1); opacity:.45; }
    .card i { position:absolute; top:10px; left:50%; width:44px; height:44px; margin-left:-22px; border-radius:12px;
              border:3px solid rgba(0,0,0,.12); }
  `;
  root.appendChild(css);

  const slotLeft = (i) => 111 + i * (150 + 24);
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('div');
    s.className = 'slot'; s.style.left = slotLeft(i) + 'px';
    root.appendChild(s);
  }
  INGREDIENTS.forEach((ing, i) => {
    const col = i % 6, row = Math.floor(i / 6);
    const c = document.createElement('div');
    c.className = 'card' + (STARTER_IDS.includes(ing.id) ? '' : ' locked');
    c.style.left = 32 + col * (96 + 16) + 'px';
    c.style.top = 210 + row * (96 + 16) + 'px';
    c.style.background = '#fff3e6';
    c.dataset.id = ing.id;
    c.innerHTML = '<i style="background:' + ing.color + '"></i>' + ingredientName(cfg, ing.id);
    root.appendChild(c);
  });
}
