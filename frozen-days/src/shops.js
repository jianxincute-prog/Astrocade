// Shop data: opening hours, catalogue (clothes, skates, drinks, bakes), outfit -> character variant, skate perks.
// Pure data and helpers (no rendering), shared by the game loop, the shop panel and the save format.

export const SLOT_LABEL = { jacket: 'Jacket', scarf: 'Scarf', hat: 'Beanie', pants: 'Pants', gloves: 'Gloves', skates: 'Skates', drinks: 'Drinks', bakes: 'Bakes' };
export const WEAR_SLOTS = ['jacket', 'scarf', 'hat', 'pants', 'gloves', 'skates'];

// door = where the player stands to enter (just in front of the entrance)
export const SHOPS = [
  { id: 'skate', name: 'Blade & Edge', tabs: ['skates'], open: [8, 19], door: [-27, 121.3], line: 'Skates with real grip and glide' },
  { id: 'clothes', name: 'Warm Threads', tabs: ['jacket', 'scarf', 'hat', 'pants', 'gloves'], open: [9, 20], door: [27, 121.3], line: 'Jackets, scarves, beanies and more' },
  { id: 'cafe', name: 'Cocoa Corner', tabs: ['drinks'], open: [7, 22], door: [0, 124.3], line: 'Hot drinks keep you steady on the ice' },
  { id: 'bakery', name: 'Sweet Bakery', tabs: ['bakes'], open: [6, 17], door: [-19.3, 107], line: 'Fresh buns and tarts' },
  { id: 'library', name: 'Winter Library', tabs: [], open: [0, 0], door: [19.3, 107], soon: true, line: '' },
];

const W = (slot, id, name, price, v, desc) => ({ id, slot, name, price, v, desc, color: Object.values(v)[0] && Object.values(v)[0].color !== undefined ? Object.values(v)[0].color : Object.values(v)[0] });
export const ITEMS = [
  // jackets
  W('jacket', 'jk_forest', 'Forest Puffer', 90, { jacket: 0x2f7a55 }), W('jacket', 'jk_sunset', 'Sunset Puffer', 90, { jacket: 0xe8833a }),
  W('jacket', 'jk_plum', 'Plum Puffer', 110, { jacket: 0x7a4aa8 }), W('jacket', 'jk_char', 'Charcoal Puffer', 110, { jacket: 0x3b4150 }),
  W('jacket', 'jk_snow', 'Snow Puffer', 130, { jacket: 0xe9eef4 }), W('jacket', 'jk_crim', 'Crimson Puffer', 130, { jacket: 0xc23b3b }),
  // scarves
  W('scarf', 'sc_mustard', 'Mustard Scarf', 25, { scarf: 0xe3a53a }), W('scarf', 'sc_cream', 'Cream Scarf', 25, { scarf: 0xf1e8d6 }),
  W('scarf', 'sc_berry', 'Berry Scarf', 35, { scarf: 0xb02c5a }), W('scarf', 'sc_teal', 'Teal Scarf', 35, { scarf: 0x2aa5a0 }),
  W('scarf', 'sc_navy', 'Navy Scarf', 35, { scarf: 0x28406e }),
  // beanies
  W('hat', 'ht_red', 'Red Beanie', 40, { hat: { color: 0xd94f4f } }), W('hat', 'ht_navy', 'Navy Beanie', 40, { hat: { color: 0x2a3f6a } }),
  W('hat', 'ht_pink', 'Pink Beanie', 45, { hat: { color: 0xff8fb1 } }), W('hat', 'ht_mint', 'Mint Beanie', 45, { hat: { color: 0x7ad1b0 } }),
  W('hat', 'ht_char', 'Charcoal Beanie', 45, { hat: { color: 0x3a3d48 } }),
  // pants
  W('pants', 'pn_black', 'Black Pants', 60, { pants: 0x1b1d26 }), W('pants', 'pn_olive', 'Olive Pants', 60, { pants: 0x4a5a3a }),
  W('pants', 'pn_denim', 'Denim Pants', 70, { pants: 0x3a5a86 }), W('pants', 'pn_burg', 'Burgundy Pants', 70, { pants: 0x5a2a3a }),
  // gloves
  W('gloves', 'gl_tan', 'Wool Gloves', 30, { glove: 0xd9c4a0 }), W('gloves', 'gl_red', 'Red Gloves', 30, { glove: 0xc23b3b }), W('gloves', 'gl_black', 'Black Gloves', 30, { glove: 0x22242c }),
  // skates: colour + a modest perk (grip multiplies blade grip, glide multiplies ice friction)
  { id: 'sk_club', slot: 'skates', name: 'Club Blades', price: 150, v: { boot: 0x2b3a55, bootAccent: 0x4aa8ff, laces: 0xffffff }, color: 0x4aa8ff, perk: { grip: 1.1, glide: 0.92 }, desc: 'Sharper edges: a little more grip and glide.' },
  { id: 'sk_silver', slot: 'skates', name: 'Silver Edge', price: 350, v: { boot: 0xdfe5ee, bootAccent: 0x8a93a6, laces: 0x555c6e }, color: 0xc4ccd8, perk: { grip: 1.18, glide: 0.85 }, desc: 'Tuned blades: clearly better grip and glide.' },
  { id: 'sk_aurora', slot: 'skates', name: 'Aurora Pro', price: 700, v: { boot: 0x1b1030, bootAccent: 0x7a5cff, laces: 0xa8ffe8 }, color: 0x7a5cff, perk: { grip: 1.25, glide: 0.78 }, desc: 'Competition blades: top grip and glide.' },
  // drinks: temporary balance comfort
  { id: 'dr_cocoa', slot: 'drinks', name: 'Hot Cocoa', price: 12, color: 0x7a4a2a, food: { comfort: 1.06, secs: 240 }, desc: 'Warm: +6% balance comfort for 4 min.' },
  { id: 'dr_latte', slot: 'drinks', name: 'Cinnamon Latte', price: 20, color: 0xc08a54, food: { comfort: 1.1, secs: 300 }, desc: 'Cosy: +10% balance comfort for 5 min.' },
  { id: 'dr_marsh', slot: 'drinks', name: 'Marshmallow Cocoa', price: 28, color: 0xf3e3d3, food: { comfort: 1.14, secs: 360 }, desc: 'Toasty: +14% balance comfort for 6 min.' },
  // bakes: instant XP
  { id: 'bk_bun', slot: 'bakes', name: 'Cinnamon Bun', price: 10, color: 0xd9a05a, food: { xp: 8 }, desc: 'A tasty treat: +8 XP.' },
  { id: 'bk_tart', slot: 'bakes', name: 'Berry Tart', price: 16, color: 0xc2415a, food: { xp: 14 }, desc: 'Sweet and tangy: +14 XP.' },
  { id: 'bk_loaf', slot: 'bakes', name: 'Honey Loaf', price: 26, color: 0xe3b94a, food: { xp: 25 }, desc: 'Hearty: +25 XP.' },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const itemsFor = (slot) => ITEMS.filter((i) => i.slot === slot);

// Character variant (colour overrides) for the worn items.
export function variantFor(worn) {
  const v = {};
  Object.keys(worn || {}).forEach((slot) => { const it = ITEM[worn[slot]]; if (it && it.v) Object.assign(v, it.v); });
  return v;
}
export function gearFor(worn) {
  const it = worn && ITEM[worn.skates], p = it && it.perk;
  return { grip: p ? p.grip : 1, glide: p ? p.glide : 1 };
}

const pad = (n) => (n < 10 ? '0' : '') + n;
export const hourLabel = (h) => pad(Math.floor(h)) + ':00';
export function isOpen(shop, hour) { return !shop.soon && hour >= shop.open[0] && hour < shop.open[1]; }
export function shopNear(x, z, r = 4.6) {
  let best = null, bd = r;
  for (const s of SHOPS) { const d = Math.hypot(x - s.door[0], z - s.door[1]); if (d < bd) { bd = d; best = s; } }
  return best;
}
