# Midnight Breach (3D)

A low-poly (Three.js r186) found-phone mystery. Rani has stopped answering. The player explores their own house at night, reads the mysterious AFTER app on the phone, and follows its small clues to find her before midnight. Serious, non-graphic twist; two endings.

All people, celebrities and scandals are fictional. Gossip files are harmless comedy; the main plot is a quiet mystery. No gore, no sexual content.

## Loop
1. Open the phone (button top-right, or `P`) and read AFTER files. Friend/family/neighbour files each hint one clue place; celebrity files are flavour.
2. A cyan marker appears over the hinted object in the house. Walk there and press the action button (or `E` / Space).
3. Collect 4 of 5 notes to open the storage-room door. Talk to Rani, then choose: delete AFTER or keep AFTER.
4. At 00:00 the phone clock hits midnight: the house turns cold and purple, and three unknown-source files unlock.

## Files
- `index.html` / `game.js` — entry; `window.run = run`.
- `src/three-loader.mjs` — loads Three.js r186 as an ES module from jsDelivr (dynamic import).
- `src/main.mjs` — loading screen, menu, quality tiers, HUD, joystick/keyboard input, camera, interactions, dialog, finale and endings, save/load, leaderboard.
- `src/world.mjs` — procedural low-poly house, colliders, clue beacons, mood lighting, per-material mesh merge.
- `src/neighborhood.mjs` — the housing complex: main road with zebra crossing, cross street, ~14 houses, parked and moving cars, street lamps, pos ronda, warung, fences; walkable bounds and zone names.
- `src/actors.mjs` — low-poly character builder (player and Rani).
- `src/phone.mjs` — in-game phone overlay (Messages, Photos, Contacts, Notes, Phone, AFTER) with full-screen photo viewer.
- `src/story.mjs` — contacts, messages, notes, AFTER archive, clues, finale text and endings.
- `src/logic.mjs` — pure clock rules. `tests/logic.test.mjs` — Node unit tests (`node --test tests/logic.test.mjs tests/neighborhood.test.mjs`).
- `style.css` (phone UI), `game.css` (HUD/menu/dialog), `asset_map.json` (24 photorealistic images used inside the phone), `game_config.json`.

## Controls
Touch: virtual joystick (bottom-left), action button (bottom-right), phone button (top-right). PC: WASD / arrows, `E` or Space to inspect, `P` for phone, `Esc` to close it.

## Tunables (game_config.json)
`midnightSeconds` (play time until 00:00), `glitchIntensity`, `ownerName`. Leaderboard: fastest completion time (ascending).
