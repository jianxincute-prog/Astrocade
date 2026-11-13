# Astro World

WorldBox-style god-sim sandbox. Portrait 720x1280, canvas + DOM overlay, no assets.

- `game.js` — everything: procedural world, creature AI, fire/disasters, rendering, input, UI, edit/play modes.
- `game_config.json` — `settings` (day/night, starting population scale) and `world` (`size` 0/1/2 = S/M/L, seed, RLE tiles painted in edit mode).

Play mode: full sim + tools + autosave via `lib.saveUserGameState`.
Edit mode: sim frozen; sculpt terrain / regenerate world; changes are written to `gameConfig.world`.

World sizes: S 120x148, M 200x246 (default), L 240x296. M/L use a multi-continent generator; population caps scale with size.
Far zoom (tile < 5px) draws dots instead of sprites. Destructive world actions need a second tap.

Wildlife: sheep, rabbits and deer are prey (rabbits/deer flee); wolves hunt them, avoid settlements when fed, and a small pack migrates in from wild land when wolves get scarce so they never stay extinct.
