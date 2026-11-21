// The 12 ingredients. Names come from gameConfig.strings so they can be translated.
export const INGREDIENTS = [
  { id: 'carb_1', category: 'carb', color: '#FFFFFF', edge: '#D9D9D9' },
  { id: 'carb_2', category: 'carb', color: '#F4D03F' },
  { id: 'carb_3', category: 'carb', color: '#D9A066' },
  { id: 'carb_4', category: 'carb', color: '#E5C158' },
  { id: 'prot_5', category: 'prot', color: '#C0651A' },
  { id: 'prot_6', category: 'prot', color: '#6E2C00' },
  { id: 'prot_7', category: 'prot', color: '#FF7675' },
  { id: 'prot_8', category: 'prot', color: '#FFF4D6', edge: '#F1C40F' },
  { id: 'garn_9', category: 'garn', color: '#2ECC71' },
  { id: 'garn_10', category: 'garn', color: '#E74C3C' },
  { id: 'garn_11', category: 'garn', color: '#FFD84D' },
  { id: 'garn_12', category: 'garn', color: '#795548' },
];

// Starting unlock wave (see docs/GDD_REVISI_V1.md section 5.2).
export const STARTER_IDS = ['carb_1', 'carb_3', 'prot_5', 'prot_8', 'garn_10', 'garn_11'];

const FALLBACK_NAMES = {
  carb_1: 'Rice', carb_2: 'Noodles', carb_3: 'Bread', carb_4: 'Potato',
  prot_5: 'Chicken', prot_6: 'Beef', prot_7: 'Shrimp', prot_8: 'Egg',
  garn_9: 'Veggies', garn_10: 'Tomato', garn_11: 'Cheese', garn_12: 'Mushroom',
};

export function ingredientName(cfg, id) {
  const names = (cfg && cfg.strings && cfg.strings.ingredients) || {};
  return names[id] || FALLBACK_NAMES[id] || id;
}
