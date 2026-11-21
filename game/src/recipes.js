// Recipe data, dish naming, orders, scoring and unlock progression. No rendering code here.
import { INGREDIENTS, ingredientName } from './ingredients.js';

const CAT_RANK = { carb: 0, prot: 1, garn: 2 };
export const ING = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

// 20 signature recipes (ingredient sets are unordered). Names can be overridden by cfg.strings.recipes[id].
export const RECIPES = [
  { id: 'r1', ids: ['carb_1', 'prot_5', 'prot_8'], name: 'Chicken Egg Fried Rice' },
  { id: 'r2', ids: ['carb_2', 'prot_7', 'garn_9'], name: 'Seafood Noodle Stir-Fry' },
  { id: 'r3', ids: ['carb_3', 'prot_6', 'garn_11'], name: 'Double Melt Cheeseburger' },
  { id: 'r4', ids: ['carb_4', 'prot_6', 'garn_10'], name: 'Classic Steak & Fries' },
  { id: 'r5', ids: ['carb_1', 'prot_7', 'garn_12'], name: 'Shrimp Mushroom Risotto' },
  { id: 'r6', ids: ['carb_3', 'prot_5', 'garn_11'], name: 'Crispy Chicken Sandwich' },
  { id: 'r7', ids: ['carb_2', 'prot_6', 'garn_9'], name: 'Beef Noodle Soup' },
  { id: 'r8', ids: ['carb_4', 'prot_5', 'garn_11'], name: 'Loaded Chicken Potato Bake' },
  { id: 'r9', ids: ['carb_1', 'prot_6', 'garn_10'], name: 'Beef Bolognese Rice Bowl' },
  { id: 'r10', ids: ['carb_3', 'prot_8', 'garn_11'], name: 'Fluffy Egg & Cheese Toast' },
  { id: 'r11', ids: ['carb_2', 'prot_8', 'garn_10'], name: 'Tomato Egg Noodles' },
  { id: 'r12', ids: ['carb_4', 'prot_7', 'garn_9'], name: 'Seafood Potato Skillet' },
  { id: 'r13', ids: ['carb_1', 'garn_9', 'garn_12'], name: 'Veggie Mushroom Fried Rice' },
  { id: 'r14', ids: ['prot_5', 'garn_11', 'garn_10'], name: 'Chicken Parmigiana Plate' },
  { id: 'r15', ids: ['prot_6', 'garn_12', 'garn_11'], name: 'Beef Mushroom Melt Steak' },
  { id: 'r16', ids: ['carb_3', 'prot_5', 'garn_10'], name: 'Chicken Tomato Club Sandwich' },
  { id: 'r17', ids: ['carb_2', 'prot_5', 'garn_12'], name: 'Mushroom Chicken Noodles' },
  { id: 'r18', ids: ['carb_4', 'prot_8', 'garn_11'], name: 'Cheesy Potato Frittata' },
  { id: 'r19', ids: ['prot_7', 'prot_8', 'garn_9'], name: 'Shrimp Scramble Plate' },
  { id: 'r20', ids: ['carb_1', 'prot_5', 'garn_11'], name: 'Cheesy Chicken Rice Bake' },
];

const key = (ids) => [...ids].sort().join('|');
const RECIPE_BY_KEY = new Map(RECIPES.map((r) => [key(r.ids), r]));

export const recipeName = (cfg, r) => (cfg && cfg.strings && cfg.strings.recipes && cfg.strings.recipes[r.id]) || r.name;

// Layer order for building a dish: carb, then protein, then garnish. Never repeats an ingredient.
export function layerOrder(ids) {
  return [...new Set(ids)].sort((a, b) => CAT_RANK[ING[a].category] - CAT_RANK[ING[b].category] || (a < b ? -1 : 1));
}

// bowl (rice/noodles), stack (bread = sandwich), otherwise plate.
export function dishForm(ids) {
  if (ids.includes('carb_3')) return 'stack';
  if (ids.includes('carb_1') || ids.includes('carb_2')) return 'bowl';
  return 'plate';
}
const FORM_WORD = { bowl: 'Bowl', stack: 'Stack', plate: 'Plate' };

// Evaluate 3 chosen ingredient ids -> dish identity.
export function evaluateDish(cfg, ids) {
  const recipe = RECIPE_BY_KEY.get(key(ids)) || null;
  if (recipe) return { recipe, signature: true, name: recipeName(cfg, recipe), form: dishForm(ids) };
  const form = dishForm(ids);
  const names = layerOrder(ids).map((id) => ingredientName(cfg, id));
  return { recipe: null, signature: false, name: names.join(' ') + ' ' + FORM_WORD[form], form };
}

// --- Profile (progress) -----------------------------------------------------------------------
export function newProfile(starterIds) {
  return {
    score: 0, combo: 0, completed: 0, matched: 0, wave: 1, ordersSpawned: 0,
    unlocked: new Set(starterIds), discovered: new Set(), lastIds: null,
  };
}
export const profileToSave = (p) => ({
  v: 1, wave: p.wave, completed: p.completed, matched: p.matched,
  unlocked: [...p.unlocked], discovered: [...p.discovered], best: p.best || 0,
});

const WAVE2 = ['prot_6', 'carb_4', 'garn_12']; // Beef, Potato, Mushroom -> 12 recipes
const WAVE3 = ['carb_2', 'prot_7', 'garn_9'];  // Noodles, Shrimp, Veggies -> all 20

// Returns the ingredient ids unlocked by this call (and updates the profile).
export function checkUnlocks(p, g) {
  const out = [];
  if (p.wave === 1 && (p.matched >= g.unlockWave2Matches || p.completed >= g.unlockWave2Dishes)) {
    p.wave = 2; WAVE2.forEach((id) => { p.unlocked.add(id); out.push(id); });
  }
  if (p.wave === 2 && (p.matched >= g.unlockWave3Matches || p.completed >= g.unlockWave3Dishes)) {
    p.wave = 3; WAVE3.forEach((id) => { p.unlocked.add(id); out.push(id); });
  }
  return out;
}

// True if two chosen ingredients can still lead to a recipe the player has not discovered yet.
export function hintFor(p, pairIds) {
  return RECIPES.some((r) => !p.discovered.has(r.id) && pairIds.every((id) => r.ids.includes(id))
    && r.ids.every((id) => p.unlocked.has(id)));
}

// --- Orders -----------------------------------------------------------------------------------
const pickRandom = (arr, n) => {
  const a = [...arr], out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
};

export function makeOrder(p, g) {
  const n = p.ordersSpawned++;
  const golden = g.goldenOrderEvery > 0 && (n + 1) % g.goldenOrderEvery === 0;
  const tutorial = n === 0 && p.completed === 0; // only a brand-new player gets the tutorial order
  let recipe;
  if (tutorial) recipe = RECIPES[0];
  else {
    const pool = RECIPES.filter((r) => r.ids.every((id) => p.unlocked.has(id)));
    const weighted = [];
    pool.forEach((r) => { for (let i = 0; i < (p.discovered.has(r.id) ? 1 : 3); i++) weighted.push(r); });
    recipe = weighted[Math.floor(Math.random() * weighted.length)];
  }
  const shown = tutorial ? recipe.ids.slice(0, 2) : pickRandom(recipe.ids, golden ? 1 : 2);
  return {
    recipe, golden, shown, hidden: 3 - shown.length,
    timeLeft: golden ? g.goldenOrderSeconds : null, total: golden ? g.goldenOrderSeconds : null,
  };
}

// --- Scoring ----------------------------------------------------------------------------------
export function scoreServe(s, { result, order, perfect, surprise, isNew, combo }) {
  const match = !!(order && result.recipe && result.recipe.id === order.recipe.id);
  const tags = [];
  let pts = match ? s.orderMatch : result.signature ? s.recipe : s.creation;
  if (isNew) { pts += s.newRecipeBonus; tags.push('new'); }
  const nextCombo = match ? combo + 1 : 0;
  if (match) { pts += Math.min(s.comboStep * nextCombo, s.comboMax); tags.push('order'); }
  if (perfect) { pts += s.perfect; tags.push('perfect'); }
  if (surprise) { pts += s.surprise; tags.push('surprise'); }
  if (match && order.golden && order.timeLeft > 0) { pts *= s.goldenMultiplier; tags.push('golden'); }
  return { points: pts, match, combo: nextCombo, tags };
}
