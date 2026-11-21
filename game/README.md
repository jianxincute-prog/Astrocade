# Secret Recipe Lab

Blocky 3D cooking game: pick 3 of 12 ingredients, cook, serve. Design: `../docs/GDD_REVISI_V1.md`.

## Status
Step 3 (foundation) only: scene, fixed chef rig, kitchen, camera presets, quality tiers, HUD skeleton,
temporary looping preview. Gameplay FSM, audio, save and leaderboard are next.

## Code map
- `index.html` - 720x1280 frame (stage y 0-640, HUD y 640-1280), loads Three.js r128 from cdnjs, then `game.js`.
- `game.js` - `run(mode)`; edit mode shows the scene without the preview cycle. Ends with `window.run = run;`.
- `src/chef.js` - pivot-based character rig with poses: idle, walk, sautee, stir, plate, cheer.
- `src/kitchen.js` - diorama kitchen, anchors, lights.
- `src/camera.js` - OVERVIEW / COOKING_ZOOM (15% closer) / SERVING_FOCUS.
- `src/quality.js` - Low/Med/High + auto detection.
- `src/hud.js` - static HUD skeleton. `src/preview.js` - temporary demo loop (replaced in step 4).
- `src/ingredients.js`, `src/mathutils.js`.
- `game_config.json` - strings, colors, camera, quality, leaderboard declaration.
