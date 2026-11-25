# Deluge Drifter

3D flood-survival game for Astrocade (Three.js r128, portrait 720x1280, touch + keyboard/mouse).

The whole 500x500 world is under deep water. You start on the roof of a skyscraper in the middle of a sunken city.
Before playing you draw a random talent, then scavenge floating debris, dive for caches, craft a raft and sail to far
islands to collect 3 Beacon Parts and build the Rescue Beacon.

## Talents (data in `game_config.json` -> `talents`)
- **Magic Angler** - every rod the player crafts fishes a random item, 5 casts per in-game day; all 5 rod blueprints always available.
- **Master Diver** - 3x oxygen, faster swimming, much clearer underwater vision, no eye-sting vignette, no depth pressure.
- **Iron Fists** - punches deal 3x damage (breaks hardshell crates / pops pufferfish quickly).

## Files
- `index.html` - loading screen markup + Three.js CDN + `game.js` module.
- `game.js` - entry (`run(mode)`), game loop, player physics, raft, entities, fishing, survival, chapters, save/score.
- `src/world.js` - world generation (sea, seabed, city, start tower + stairs, islands, sky, props, quality tiers).
- `src/ui.js` - HUD, touch/keyboard input, menus, talent draw, bag/craft, settings, language, leaderboard, ending.
- `src/audio.js` - procedural WebAudio (SFX, waves, pad music).
- `src/util.js` - math, i18n (`t()`), state defaults.
- `game_config.json` - tunables (`tuning`), talents, items, recipes, fishing table, islands, strings (en/id/ar), leaderboard declaration.

## Systems
- Languages: English (default), Indonesia, Arabic (RTL UI mirrored, world not mirrored). Saved in user game state.
- Quality: Auto/Low/Med/High (pixel ratio, shadows, water mesh density, draw distance, entity density).
- Save: `lib.saveUserGameState` (inventory, talent, raft, found islands, taken caches, settings). Leaderboard: salvage score.
- Edit mode: gameplay disabled, scene orbits; `lib.showGameParameters` exposes key tunables.
