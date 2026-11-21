// Persistence through lib.saveUserGameState / getUserGameState only (no localStorage in the sandbox).
// Every call is wrapped: the game must work when lib is missing, offline, or the player is not signed in.
import { INGREDIENTS, STARTER_IDS } from './ingredients.js';
import { RECIPES } from './recipes.js';

const VALID_ING = new Set(INGREDIENTS.map((i) => i.id));
const VALID_REC = new Set(RECIPES.map((r) => r.id));
const QUALITIES = ['auto', 'low', 'med', 'high'];

export async function loadSave() {
  try {
    if (!(window.lib && window.lib.getUserGameState)) return null;
    const r = await window.lib.getUserGameState();
    return (r && r.state) || null;
  } catch (e) { return null; }
}

const num = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

// Copies saved progress into the profile and settings, ignoring anything unknown or malformed.
export function applySave(profile, settings, st) {
  if (!st || typeof st !== 'object') return;
  profile.completed = num(st.completed); profile.matched = num(st.matched); profile.best = num(st.best);
  profile.wave = [1, 2, 3].includes(st.wave) ? st.wave : 1;
  (Array.isArray(st.unlocked) ? st.unlocked : []).forEach((id) => { if (VALID_ING.has(id)) profile.unlocked.add(id); });
  (Array.isArray(st.discovered) ? st.discovered : []).forEach((id) => { if (VALID_REC.has(id)) profile.discovered.add(id); });
  STARTER_IDS.forEach((id) => profile.unlocked.add(id));
  if (st.settings) {
    if (QUALITIES.includes(st.settings.quality)) settings.quality = st.settings.quality;
    settings.muted = !!st.settings.muted;
  }
}

// Compact and bounded: ids only, at most 12 + 20 entries.
export const toSave = (profile, settings) => ({
  v: 1, best: profile.best || 0, wave: profile.wave, completed: profile.completed, matched: profile.matched,
  unlocked: [...profile.unlocked], discovered: [...profile.discovered],
  settings: { quality: settings.quality, muted: settings.muted },
});

// Debounced saver. queue() after changes, flush() when leaving.
export function createSaver(getState) {
  let timer = 0;
  async function flush() {
    clearTimeout(timer); timer = 0;
    try { if (window.lib && window.lib.saveUserGameState) await window.lib.saveUserGameState(getState()); } catch (e) { /* ignore */ }
  }
  return { queue() { clearTimeout(timer); timer = setTimeout(flush, 800); }, flush };
}

export async function resetSave() {
  try { if (window.lib && window.lib.deleteUserGameState) await window.lib.deleteUserGameState(); } catch (e) { /* ignore */ }
}

// Leaderboard helpers.
export async function submitScore(score) {
  try {
    if (score > 0 && window.lib && window.lib.addPlayerScoreToLeaderboard) { await window.lib.addPlayerScoreToLeaderboard(score); return true; }
  } catch (e) { /* not signed in or offline */ }
  return false;
}
export async function fetchBoard(n = 10) {
  try {
    if (window.lib && window.lib.getTopNEntriesFromLeaderboard) return await window.lib.getTopNEntriesFromLeaderboard(n);
  } catch (e) { /* ignore */ }
  return null;
}
