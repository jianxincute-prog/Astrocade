# Astro World

WorldBox-style god-sim sandbox. Portrait 720x1280, canvas + DOM overlay, no assets.

- `game.js` — everything: procedural world, creature AI, fire/disasters, rendering, input, UI, edit/play modes.
- `game_config.json` — `settings` (day/night, starting population scale) and `world` (seed, RLE tiles painted in edit mode).

Play mode: full sim + tools + autosave via `lib.saveUserGameState`.
Edit mode: sim frozen; sculpt terrain / regenerate world; changes are written to `gameConfig.world`.
