# Baldy's Penguin Rescue

A kid-friendly 3D third-person winter adventure for Astrocade. Baldy — a cheerful bald man in a puffy jacket —
explores a round snowy valley (about 224 m across), finds lost baby penguins under blue light beams, and leads
them home to the igloo under the orange beam. Penguins waddle behind him in a line (and belly-slide when he sleds).

- **Golden fish** add score, two seconds on the clock and sled power, and fill a saved wallet for the shop.
- **SLED** gives a speed boost (extra fast downhill) while the power ring lasts.
- **Three hearts and a countdown.** Every level has a time limit (70 s + 40 s per penguin). Hazards cost a heart:
  snow whirlies (also scatter the penguin line), ice spikes (jump over them), rolling snowballs (step aside; they burst on
  trees and rocks) and fishing holes in the lake ice (jump over them). One spare heart floats somewhere in each level.
  No hearts or no time left means game over: the total goes to the leaderboard and the next run starts at level 1.
- **Endless levels in four places** that rotate: Pine Valley, Frozen Lake (a huge slippery lake with huts and ice holes),
  Crystal Fields (giant ice crystals, extra spikes) and Snowman Hills (tall hills, snowmen, extra snowballs). Each level
  has a new igloo spot, hills and layout, one more penguin and steadily more hazards. Score keeps adding up.
- The main menu has a **Sled Shop** (six differently shaped sleds on a 3D turntable, bought with fish) and a **Top** screen.

## Controls
- Touch: left thumbstick moves, drag elsewhere to look, JUMP and SLED buttons on the right.
- Keyboard: WASD / arrows move, Space jumps, Shift sleds, drag the mouse to look.
- Edit mode: tap or drag on the snow to move the igloo (saved to `gameConfig.home`); sliders tune counts and speed.

## Files
- `index.html` — boot overlay, loads `game.js`.
- `game.js` — `run(mode)`: loads Three.js from the CDN, registers settings, starts the game.
- `src/main.js` — game loop and rules: player movement, chase camera, penguin line, delivery, whirlies, fish, win, edit mode.
- `src/terrain.js` — pure rules: valley height, pond, seeded layout of trees/rocks/penguins/fish, score and stars.
- `src/world.js` — Three.js scene: terrain, pond, instanced pines and rocks, mountains, igloo, snowfall, beacons, fish, sparkles.
- `src/sleds.js` — the six sled skins (wooden sled, snow tube, penguin glider, rocket, dragon boat, golden fish), each its own shape.
- `src/character.js` — procedural models and animation for Baldy, penguins and snow whirlies.
- `src/loading.js` — 3D loading screen (Baldy and the penguins sliding down a mountain) shown at start and between levels.
- `src/hud.js` — DOM HUD and the start / help / pause / win screens.
- `src/input.js` — thumbstick, buttons, keyboard and camera drag.
- `src/audio.js` — music from `asset_map.json` and synthesised sound effects.
- `game_config.json` — tunables (penguins, fish, walk speed, whirlies, snowfall, jacket colour, igloo spot) and the leaderboard declaration.
