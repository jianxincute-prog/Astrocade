/* Profession outfits - canvas drawing only (no DOM / window / lib).
 * Drawn over the race sprite in SPRITE pixels (a human is 12 wide: head rows 0-6, torso rows 7-10), so every race wears the same
 * set of clothes and tells itself apart by its body and by the race colour on every hat band, sash or tabard. */

// Per race: s = horizontal scale of the clothes, ty/th = first row and height of the torso, dy = rows to lower the headwear (werewolf ears stand above the skull).
export const BODY = {
  human:    { s: 1,    ty: 7, th: 3.2 },
  elf:      { s: 1,    ty: 7, th: 3.2 },
  dwarf:    { s: 1,    ty: 7, th: 2.2 },
  orc:      { s: 1.22, ty: 7, th: 3.6 },
  werewolf: { s: 1.15, ty: 8, th: 3.6, dy: 2 },
};

// The main colour of each outfit (for the panel).
export const OUTFIT_COLOR = {
  farmer: '#e3c15a', lumberjack: '#2f5a3a', miner: '#e0b02e', hunter: '#3f6a3a', fisher: '#e8c030',
  gatherer: '#4aa84a', builder: '#ff8a2e', soldier: '#9aa4b0', trader: '#6a2a7a',
};

/**
 * o: { prof, race, cx, fy, sw, sh, spw, hd, col, frame, id }
 *    cx/fy = feet centre, sw/sh = drawn size of the sprite, spw = sprite width in sprite pixels, hd = 1 or -1 (facing), col = race colour.
 */
export function drawOutfit(ctx, o) {
  const b = BODY[o.race]; if (!b || !OUTFIT_COLOR[o.prof]) return false;
  const u = o.sw / o.spw, top = o.fy - o.sh, mid = o.spw / 2;
  const X = x => mid + (x - 6) * b.s;                                    // x in a 12-wide design, centred
  const R = (x, y, w, h, c) => {                                          // a rectangle in sprite pixels, mirrored with the sprite
    const x0 = o.cx + o.hd * (X(x) - mid) * u, ww = w * b.s * u;
    ctx.fillStyle = c; ctx.fillRect(o.hd > 0 ? x0 : x0 - ww, top + (y + (y < 5 ? (b.dy || 0) : 0)) * u, ww, h * u);
  };
  const ty = b.ty, th = b.th, rc = o.col;
  switch (o.prof) {
    case 'farmer':
      R(.6, 1.2, 10.8, 1, '#c9a640'); R(3, -.2, 6, 1.6, '#ecd078'); R(3, 1, 6, .5, rc);          // straw hat
      R(2.4, ty, .9, th, '#7a5a2a'); R(8.7, ty, .9, th, '#7a5a2a');                                // overall straps
      break;
    case 'lumberjack':
      R(2, -.1, 8, 1.7, '#2f5a3a'); R(2, 1.3, 8, .6, rc); R(5.4, -.9, 1.2, .9, '#d94a3a');         // wool cap with a bobble
      for (let i = 0; i < 4; i++) for (let j = 0; j < Math.ceil(th); j++) if ((i + j) % 2 === 0) R(2 + i * 2, ty + j, 2, 1, '#c0392b');   // red plaid
      break;
    case 'miner':
      R(2, -.2, 8, 1.8, '#e0b02e'); R(1.4, 1.5, 9.2, .6, '#a8801e'); R(5.3, .1, 1.4, 1, '#fff4a0'); R(2, 1.1, 8, .4, rc);   // hard cap with a lamp
      R(1.6, ty, 2.2, th, '#4a4a58'); R(8.2, ty, 2.2, th, '#4a4a58');                              // leather vest
      break;
    case 'hunter':
      R(1.6, -.2, 8.8, 2.3, '#3f6a3a'); R(1.6, 1.8, 8.8, .5, '#27472a'); R(2, 1.4, 1.2, .5, rc);   // forest hood
      for (let i = 0; i < 5; i++) R(2.6 + i * 1.3, ty + i * (th - 1) / 4, 1.1, 1, '#7a4a22');       // leather strap
      R(9.6, ty - .6, 1.4, th, '#6a4020'); R(9.8, ty - 1, .5, .5, '#f4f1e6'); R(10.3, ty - 1, .5, .5, '#f4f1e6');   // quiver
      break;
    case 'fisher':
      R(2, -.1, 8, 1.7, '#e8c030'); R(.8, 1.4, 10.4, .7, '#c89a20'); R(9.4, 1.9, 2, 1.4, '#e8c030'); R(2, 1.1, 8, .4, rc);   // oilskin hat
      R(2.4, ty + .6, 7.2, th - .6, '#2f6fa8'); R(2.4, ty + .6, 7.2, .4, '#6fb0e0');                // blue vest
      break;
    case 'gatherer':
      R(2, .7, 8, .9, '#4aa84a'); R(3, .3, .9, .9, '#ff6a8a'); R(6, .1, .9, .9, '#ffd23f'); R(8.4, .5, .9, .9, '#ffffff'); R(2, 1.3, 1.2, .5, rc);   // flower wreath
      for (let i = 0; i < 5; i++) R(2.6 + i * 1.3, ty + i * (th - 1) / 4, 1.1, 1, '#8a5a34');       // sash
      R(9.5, ty + 1, 2, 2, '#b88a44'); R(9.5, ty + 1, 2, .5, '#8a5a34');                            // basket on the back
      break;
    case 'builder':
      R(2, -.2, 8, 1.8, '#ff8a2e'); R(1.2, 1.5, 9.6, .6, '#d86a1a'); R(5.4, -.2, 1.2, 1.6, '#ffd8a0'); R(2, 1.2, 2, .4, rc);   // hard hat
      R(1.6, ty + th - 1, 8.8, .8, '#6a4020'); R(5.4, ty + th - 1, 1.2, .8, '#ffd23f');           // tool belt
      R(9.6, ty + th - 2, .8, 2, '#8a5a34'); R(9, ty + th - 2.4, 2, .8, '#aab2be');               // hammer
      break;
    case 'soldier':
      R(2, -.1, 8, 2, '#9aa4b0'); R(5.5, 1.6, 1, 2, '#7a828e'); R(2, 1.4, 8, .5, rc);              // iron cap with a nose guard
      R(2.4, ty + .2, 7.2, th - .6, '#aab2be'); R(5.2, ty + .2, 1.6, th, rc);                       // breastplate and a tabard stripe
      break;
    case 'trader':
      R(2, .1, 8, 1.5, '#6a2a7a'); R(1.4, 1.4, 9.2, .6, '#4a1a5a'); R(2, 1.1, 8, .4, rc); R(8.4, -1, .8, 1.9, '#ffffff');   // feathered cap
      for (let i = 0; i < 5; i++) R(2.6 + i * 1.3, ty + i * (th - 1) / 4, 1.1, 1, '#ffd23f');       // coin sash
      R(1.6, ty + th - 1.4, 1.8, 1.4, '#d8b050');                                                  // pouch
      break;
  }
  return true;
}
