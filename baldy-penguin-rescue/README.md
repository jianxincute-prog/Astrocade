# Baldy's Penguin Rescue

A kid-friendly 3D third-person winter adventure for Astrocade. Baldy — a cheerful bald man in a puffy jacket —
explores a round snowy valley (about 224 m across), finds lost baby penguins under blue light beams, and leads
them home to the igloo under the orange beam. Penguins waddle behind him in a line (and belly-slide when he sleds).

- **Golden fish** add score/stars and refill sled power.
- **SLED** gives a speed boost (extra fast downhill) while the power ring lasts.
- **Snow whirlies** wander the valley. Touching one scatters the penguin line a few metres; jump over it to stay safe.
- There is no way to lose. When every penguin is home the level is done and the next one is generated: a new igloo spot,
  new hills and layout, a new sky mood, one more penguin, and every other level one more (slightly faster) whirly.
  Score (penguins, fish, time bonus) keeps adding up across levels; progress and best total are saved.

Fish picked up in levels also go into a saved wallet. The main menu has a **Sled Shop** (browse skins on a 3D turntable,
buy with fish, pick which one to use) and a **Top** leaderboard screen.

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
- `src/hud.js` — DOM HUD and the start / help / pause / win screens.
- `src/input.js` — thumbstick, buttons, keyboard and camera drag.
- `src/audio.js` — music from `asset_map.json` and synthesised sound effects.
- `game_config.json` — tunables (penguins, fish, walk speed, whirlies, snowfall, jacket colour, igloo spot) and the leaderboard declaration.
