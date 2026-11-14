# Astro World

WorldBox-style god-sim sandbox. Portrait 720x1280, canvas + DOM overlay, no external assets.

- `game.js` — everything: procedural world, creature AI, fire/disasters, rendering, input, UI, edit/play modes. Creature and house sprites are pixel art defined in code (walk A/B, attack C): sizes vary per species (rabbit 11x10 up to the 14x16 werewolf), lit from the upper left.
- `game_config.json` — `settings` (day/night, starting population scale) and `world` (`size` 0/1/2 = S/M/L, seed, RLE tiles painted in edit mode).

Play mode: full sim + tools + autosave via `lib.saveUserGameState`.
Edit mode: sim frozen; sculpt terrain / regenerate world; changes are written to `gameConfig.world`.
Zoom: + / − buttons only; minimum zoom is the full-map view.

World sizes: S 120x148, M 200x246 (default), L 240x296. M/L use a multi-continent generator; population caps scale with size.
Far zoom (tile < 5px) draws dots instead of sprites. Destructive world actions need a second tap.

Houses: one architectural style per race (human straw cottage, elf treehouse, dwarf stone hall, orc hide tent, werewolf moon lodge) with chimney smoke, lit windows at night and forge/moon glow.

Wildlife: sheep, rabbits and deer are prey (rabbits/deer flee); wolves hunt them, avoid settlements when fed, and a small pack migrates in from wild land when wolves get scarce so they never stay extinct.

Forced evolution: when only 2-3 wolves remain they all evolve into werewolves (cooldown 1200 ticks). Werewolves are a neutral civilization: nobody is their foe, they fight nobody, and they grow slowly (rare births, few houses scaled to population, long lives, small cap).
