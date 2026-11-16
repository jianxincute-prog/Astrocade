# Midnight Breach (3D)

A low-poly (Three.js r186) found-phone mystery. Rani has stopped answering. The player explores their own house at night, reads the mysterious AFTER app on the phone, and follows its small clues to find her before midnight. Serious, non-graphic twist; two endings.

All people, celebrities and scandals are fictional. Gossip files are harmless comedy; the main plot is a quiet mystery. No gore, no sexual content.

## Loop
1. Open the phone (button top-right, or `P`) and read AFTER files. Friend/family/neighbour files each hint one clue place; celebrity files are flavour.
2. A cyan marker appears over the hinted object in the house. Walk there and press the action button (or `E` / Space).
3. Collect 4 of 5 notes to open the storage-room door. Talk to Rani, then choose: delete AFTER or keep AFTER.
4. At 00:00 the phone clock hits midnight: the house turns cold and purple, doors start opening by themselves, and four unknown-source files unlock.

## Horror
A framed old photo hangs in every corner of the house (10 frames). It always shows the same pale figure at the end of a dark hallway, and the figure's eyes follow the player. While the player is in another room the figure creeps closer (the cap grows with each clue found and at midnight). Photos that can see the player raise a red fear vignette and a haptic heartbeat. Inspect a frame for text that changes with how close the figure is. Non-graphic: silhouettes and eyes only.

## Doors
Six hinged doors (bedroom, kitchen, living room, dining room, front door, storage). Use the action button to open or close; a door will not close while you stand in it. The storage door has a red/green lock light and opens when enough clues are found.

## Files
- `index.html` / `game.js` — entry; `window.run = run`.
- `src/three-loader.mjs` — loads Three.js r186 as an ES module from jsDelivr (dynamic import).
- `src/main.mjs` — loading screen, menu, quality tiers, HUD, joystick/keyboard input, camera, interactions, dialog, finale and endings, save/load, leaderboard.
- `src/world.mjs` — procedural low-poly house shell, colliders, clue beacons, mood lighting, merge of static meshes into a few draw calls.
- `src/interior.mjs` — house detail: wainscot, framed windows, curtains, pendant lamps, rugs, furniture, kitchen, storage clutter, porch and plinth.
- `src/doors.mjs` — hinged door system (animation, colliders, locking, blocking check).
- `src/watchers.mjs` — the watching photos: procedural photo textures per stage, tracking eyes, creeping, fear score.
- `src/neighborhood.mjs` — the housing complex: main road with zebra crossing, cross street, ~14 houses, parked and moving cars, street lamps, pos ronda, warung, fences; walkable bounds and zone names.
- `src/actors.mjs` — low-poly character builder (player and Rani).
- `src/phone.mjs` — in-game phone overlay (Messages, Photos, Contacts, Notes, Phone, AFTER) with full-screen photo viewer.
- `src/story.mjs` — contacts, messages, notes, AFTER archive, clues, finale text and endings.
- `src/logic.mjs` — pure clock rules. `tests/logic.test.mjs` — Node unit tests (`node --test tests/logic.test.mjs tests/neighborhood.test.mjs`).
- `style.css` (phone UI), `game.css` (HUD/menu/dialog), `asset_map.json` (25 photorealistic images used inside the phone), `game_config.json`.

## Controls
Touch: virtual joystick (bottom-left), action button (bottom-right), phone button (top-right). PC: WASD / arrows, `E` or Space to inspect, `P` for phone, `Esc` to close it.

## Tunables (game_config.json)
`midnightSeconds` (play time until 00:00), `glitchIntensity`, `ownerName`. Leaderboard: fastest completion time (ascending).
