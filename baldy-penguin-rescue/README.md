# Baldy's Penguin Rescue

A kid-friendly 3D third-person winter adventure for Astrocade. Baldy — a cheerful bald man in a puffy jacket —
explores a round snowy valley (about 224 m across), finds lost baby penguins under blue light beams, and leads
them home to the igloo under the orange beam. Penguins waddle behind him in a line (and belly-slide when he sleds).

- **Golden fish** add score/stars and refill sled power.
- **SLED** gives a speed boost (extra fast downhill) while the power ring lasts.
- **Snow whirlies** wander the valley. Touching one scatters the penguin line a few metres; jump over it to stay safe.
- There is no way to lose: the round ends when every penguin is home. Score = penguins, fish and a time bonus.

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
- `src/character.js` — procedural models and animation for Baldy, penguins and snow whirlies.
- `src/hud.js` — DOM HUD and the start / help / pause / win screens.
- `src/input.js` — thumbstick, buttons, keyboard and camera drag.
- `src/audio.js` — music from `asset_map.json` and synthesised sound effects.
- `game_config.json` — tunables (penguins, fish, walk speed, whirlies, snowfall, jacket colour, igloo spot) and the leaderboard declaration.
