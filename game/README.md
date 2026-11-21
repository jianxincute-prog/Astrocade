# Secret Recipe Lab

Blocky 3D cooking game: pick 3 of 12 ingredients, cook, serve. Design: `../docs/GDD_REVISI_V1.md`.

## Status
Step 4: playable loop (FSM, orders, scoring, unlock waves, tap-to-shine, flame surprise).
audio, particles. Save, leaderboard, recipe book, loading screen and menu are next.

## Code map
- `index.html` - 720x1280 frame (stage y 0-640, HUD y 640-1280), loads Three.js r128 from cdnjs, then `game.js`.
- `game.js` - `run(mode)`; edit mode shows the scene without the preview cycle. Ends with `window.run = run;`.
- `src/chef.js` - pivot-based character rig with poses: idle, walk, sautee, stir, plate, cheer.
- `src/kitchen.js` - diorama kitchen, anchors, lights.
- `src/camera.js` - OVERVIEW / COOKING_ZOOM (15% closer) / SERVING_FOCUS.
- `src/quality.js` - Low/Med/High + auto detection.
- `src/fsm.js` - CookingFSM (SELECTING, GRACE, LOCK_AND_TOSS, COOKING, SERVING_WALK, SERVING_EVALUATE, CLEANUP_RESET).
- `src/recipes.js` - 20 recipes, orders, scoring, unlock waves. `src/dish.js` - procedural dishes (all 220 combos).
- `src/hud.js` - slots, cards, order card, score, banner. `src/audio.js` - Web Audio SFX + haptics. `src/particles.js` - pooled particles.
- `src/ingredients.js`, `src/mathutils.js`.
- `game_config.json` - strings, colors, camera, quality, leaderboard declaration.
