# Astro World

A WorldBox-style god-sim sandbox: shape an island, drop humans, elves, dwarves, orcs and animals, and watch
kingdoms grow, trade, sail, fight and fall, then unleash disasters.

## Repository layout
| Path | What it is |
| --- | --- |
| [`astrocade/`](astrocade/) | **The current game** (version 3.0 "Rise of Empires"): the Astrocade build in portrait 720x1280, with its own [README](astrocade/README.md) covering features, controls, the HUD, save format and development notes. |
| `index.html` | The original single-file desktop prototype (HTML5 canvas, no dependencies). Kept for reference; open it in any browser. |
| `preview/` | Sprite preview page used while drawing the pixel art (`preview.html`, `sprites.js`, `sprite-preview.png`). |

## Play or run the current game
The game is a static module build: serve the `astrocade/` folder with any web server and open `index.html`.

```sh
cd astrocade
python3 -m http.server 8765
# then open http://localhost:8765/index.html
```

The game expects the Astrocade runtime object `window.lib` (saves, leaderboard, haptics) and `window.gameConfig`;
without them it still runs with sensible defaults. Run the unit tests for the pure modules with:

```sh
cd astrocade
for t in tests/*.mjs; do node "$t"; done
```

## Original prototype (`index.html` in this folder)
- Procedural world (sea, sand, grass, forest, hills, mountains, snow) generated at random each time.
- Terrain tools: raise or lower land, paint grass, forest, sand and lava.
- Creatures (humans, elves, dwarves, orcs, sheep, wolves) that walk, build houses, breed, hunt and fight.
- Powers: rain, fire (spreads through forests and houses), lightning, meteor, bless, smite and inspect.
- Day and night cycle, 1x / 3x / 8x speed, pause and a brush size control.
- Controls: drag to use the tool; right click, space plus drag or the hand button to pan; the + and - buttons zoom; `P` pauses; `[` and `]` change the brush size.
