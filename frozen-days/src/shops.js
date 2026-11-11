// Shop data: opening hours, catalogue (clothes, skates, drinks, bakes), outfit -> character variant, skate perks.
// Pure data and helpers (no rendering), shared by the game loop, the shop panel and the save format.

export const SLOT_LABEL = { jacket: 'Jacket', scarf: 'Scarf', hat: 'Headwear', pants: 'Bottoms', gloves: 'Hands', skates: 'Skates', drinks: 'Drinks', bakes: 'Bakes', gifts: 'Gifts' };
export const WEAR_SLOTS = ['jacket', 'scarf', 'hat', 'pants', 'gloves', 'skates'];

// door = where the player stands to enter (just in front of the entrance)
export const SHOPS = [
  { id: 'skate', name: 'Blade & Edge', tabs: ['skates'], open: [8, 19], door: [-27, 121.3], line: 'Skates with real grip and glide' },
  { id: 'clothes', name: 'Warm Threads', tabs: ['jacket', 'scarf', 'hat', 'pants', 'gloves', 'gifts'], open: [9, 20], door: [27, 121.3], line: 'Jackets, scarves, beanies and more' },
  { id: 'cafe', name: 'Cocoa Corner', tabs: ['drinks'], open: [7, 22], door: [0, 124.3], line: 'Hot drinks keep you steady on the ice' },
  { id: 'bakery', name: 'Sweet Bakery', tabs: ['bakes', 'gifts'], open: [6, 17], door: [-19.3, 107], line: 'Fresh buns and tarts' },
  { id: 'library', name: 'Winter Library', tabs: [], open: [0, 0], door: [19.3, 107], soon: true, line: '' },
];

const W = (slot, id, name, price, v, desc) => ({ id, slot, name, price, v, desc, color: Object.values(v)[0] && Object.values(v)[0].color !== undefined ? Object.values(v)[0].color : Object.values(v)[0] });
export const ITEMS = [
  // jackets (each with its own silhouette)
  W('jacket', 'jk_forest', 'Forest Parka', 90, { jacket: 0x2f7a55, jacketStyle: 'parka' }, 'Long quilted parka with a fluffy fur collar.'),
  W('jacket', 'jk_sunset', 'Varsity Jacket', 90, { jacket: 0xe8833a, jacketStyle: 'varsity', jacketAccent: 0xf4efe6 }, 'Short varsity jacket with ribbed trim and cream sleeves.'),
  W('jacket', 'jk_plum', 'Plum Poncho', 110, { jacket: 0x7a4aa8, jacketStyle: 'poncho' }, 'A wide knitted poncho with a fringed hem.'),
  W('jacket', 'jk_char', 'Charcoal Peacoat', 110, { jacket: 0x3b4150, jacketStyle: 'peacoat' }, 'Long double-breasted wool coat with lapels.'),
  W('jacket', 'jk_snow', 'Snow Hoodie', 130, { jacket: 0xe9eef4, jacketStyle: 'hoodie' }, 'Soft fleece hoodie with a hood, pocket and drawstrings.'),
  W('jacket', 'jk_crim', 'Crimson Down Vest', 130, { jacket: 0xc23b3b, jacketStyle: 'vest', jacketAccent: 0xf1e8d6 }, 'Puffy down vest over knitted sleeves.'),
  // scarves
  W('scarf', 'sc_mustard', 'Striped Muffler', 25, { scarf: 0xe3a53a, scarfStyle: 'muffler' }, 'Two long striped tails hanging down the front.'),
  W('scarf', 'sc_cream', 'Cream Snood', 25, { scarf: 0xf1e8d6, scarfStyle: 'snood' }, 'A chunky infinity snood, no loose ends.'),
  W('scarf', 'sc_berry', 'Berry Bow', 35, { scarf: 0xb02c5a, scarfStyle: 'bow' }, 'A big ribbon bow at the collar.'),
  W('scarf', 'sc_teal', 'Teal Bandana', 35, { scarf: 0x2aa5a0, scarfStyle: 'bandana' }, 'A triangular neckerchief with polka dots.'),
  W('scarf', 'sc_navy', 'Cloud Collar', 35, { scarf: 0x28406e, scarfStyle: 'fur' }, 'A fluffy faux-fur collar.'),
  // headwear
  W('hat', 'ht_red', 'Red Ushanka', 40, { hat: { color: 0xd94f4f }, hatStyle: 'ushanka' }, 'Trapper hat with fur band and ear flaps.'),
  W('hat', 'ht_navy', 'Navy Newsboy Cap', 40, { hat: { color: 0x2a3f6a }, hatStyle: 'newsboy' }, 'A flat cap with a short brim and button.'),
  W('hat', 'ht_pink', 'Pink Earmuffs', 45, { hat: { color: 0xff8fb1 }, hatStyle: 'earmuffs' }, 'Fluffy earmuffs on a slim band.'),
  W('hat', 'ht_mint', 'Mint Cat Beanie', 45, { hat: { color: 0x7ad1b0 }, hatStyle: 'cat' }, 'A beanie with little cat ears.'),
  W('hat', 'ht_char', 'Charcoal Beret', 45, { hat: { color: 0x3a3d48 }, hatStyle: 'beret' }, 'A tilted knit beret with a stalk.'),
  // bottoms
  W('pants', 'pn_black', 'Black Cargo Pants', 60, { pants: 0x1b1d26, pantsStyle: 'cargo' }, 'Baggy cargo pants with side pockets and cuffs.'),
  W('pants', 'pn_olive', 'Olive Snow Bibs', 60, { pants: 0x4a5a3a, pantsStyle: 'bibs' }, 'Puffy snow bibs with straps and knee pads.'),
  W('pants', 'pn_denim', 'Denim Pleated Skirt', 70, { pants: 0x3a5a86, pantsStyle: 'skirt' }, 'A flared pleated skirt over warm tights.'),
  W('pants', 'pn_burg', 'Burgundy Puff Shorts', 70, { pants: 0x5a2a3a, pantsStyle: 'shorts' }, 'Puffy shorts over warm tights.'),
  // hands
  W('gloves', 'gl_tan', 'Tan Mittens', 30, { glove: 0xd9c4a0, gloveStyle: 'mitten' }, 'Big round mittens.'),
  W('gloves', 'gl_red', 'Red Arm Warmers', 30, { glove: 0xc23b3b, gloveStyle: 'warmer' }, 'Long knitted arm warmers, fingerless.'),
  W('gloves', 'gl_black', 'Black Fur Cuffs', 30, { glove: 0x22242c, gloveStyle: 'furcuff' }, 'Gloves with fluffy fur cuffs.'),
  // skates: colour + a modest perk (grip multiplies blade grip, glide multiplies ice friction)
  { id: 'sk_club', slot: 'skates', name: 'Club Hockey Skates', price: 150, v: { boot: 0x2b3a55, bootAccent: 0x4aa8ff, laces: 0xffffff, skateStyle: 'hockey' }, color: 0x4aa8ff, perk: { grip: 1.1, glide: 0.92 }, desc: 'Chunky hockey boots with a short, rounded blade: a little more grip and glide.' },
  { id: 'sk_silver', slot: 'skates', name: 'Silver Figure Skates', price: 350, v: { boot: 0xdfe5ee, bootAccent: 0x8a93a6, laces: 0x555c6e, skateStyle: 'figure' }, color: 0xc4ccd8, perk: { grip: 1.18, glide: 0.85 }, desc: 'Tall leather figure boots with a toe pick: clearly better grip and glide.' },
  { id: 'sk_aurora', slot: 'skates', name: 'Aurora Speed Skates', price: 700, v: { boot: 0x1b1030, bootAccent: 0x7a5cff, laces: 0xa8ffe8, skateStyle: 'speed' }, color: 0x7a5cff, perk: { grip: 1.25, glide: 0.78 }, desc: 'Low-cut speed boots with a long carbon-plate blade: top grip and glide.' },
  // drinks: temporary balance comfort
  { id: 'dr_cocoa', slot: 'drinks', name: 'Hot Cocoa', price: 12, color: 0x7a4a2a, food: { comfort: 1.06, secs: 240 }, desc: 'Warm: +6% balance comfort for 4 min.' },
  { id: 'dr_latte', slot: 'drinks', name: 'Cinnamon Latte', price: 20, color: 0xc08a54, food: { comfort: 1.1, secs: 300 }, desc: 'Cosy: +10% balance comfort for 5 min.' },
  { id: 'dr_marsh', slot: 'drinks', name: 'Marshmallow Cocoa', price: 28, color: 0xf3e3d3, food: { comfort: 1.14, secs: 360 }, desc: 'Toasty: +14% balance comfort for 6 min.' },
  // bakes: instant XP
  { id: 'bk_bun', slot: 'bakes', name: 'Cinnamon Bun', price: 10, color: 0xd9a05a, food: { xp: 8 }, desc: 'A tasty treat: +8 XP.' },
  { id: 'bk_tart', slot: 'bakes', name: 'Berry Tart', price: 16, color: 0xc2415a, food: { xp: 14 }, desc: 'Sweet and tangy: +14 XP.' },
  { id: 'bk_loaf', slot: 'bakes', name: 'Honey Loaf', price: 26, color: 0xe3b94a, food: { xp: 25 }, desc: 'Hearty: +25 XP.' },
];
ITEMS.push(
  { id: 'gf_choc', slot: 'gifts', name: 'Chocolate Box', price: 20, color: 0x6a3f24, gift: true, desc: 'A box of fine chocolates. A lovely gift.' },
  { id: 'gf_flower', slot: 'gifts', name: 'Winter Rose', price: 30, color: 0xd94f6a, gift: true, desc: 'A rose that blooms in the snow.' },
  { id: 'gf_mug', slot: 'gifts', name: 'Ceramic Mug', price: 25, color: 0xe6e0d4, gift: true, desc: 'A hand-painted mug for warm drinks.' },
  { id: 'gf_skate', slot: 'gifts', name: 'Blade Charm', price: 35, color: 0x8ab4d8, gift: true, desc: 'A tiny silver skate charm.' },
  { id: 'gf_book', slot: 'gifts', name: 'Poetry Book', price: 28, color: 0x7a5a8a, gift: true, desc: 'Winter poems, beautifully bound.' },
  { id: 'gf_charm', slot: 'gifts', name: 'Promise Charm', price: 150, color: 0xff8fb1, gift: true, desc: 'A charm for the one you love. Give it to your partner.' },
);
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
