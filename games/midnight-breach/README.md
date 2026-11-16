# Midnight Breach (3D)

A low-poly (Three.js r186) found-phone mystery. Rani has stopped answering. The player explores their own house at night, reads the mysterious AFTER app on the phone, and follows its small clues to find her before midnight. Serious, non-graphic twist; two endings.

All people, celebrities and scandals are fictional. Gossip files are harmless comedy; the main plot is a quiet mystery. No gore, no sexual content.

## Story and flow (three acts)
Rani has stopped answering. AFTER, an app that stores what you want to forget, hides the truth: the player installed it after a fight with Rani and it erased her from everyone's memory. This is the 7th attempt.

1. **Act 1, the player's house (3 clues).** Read AFTER files, then find the ticket (bedroom desk), the cassette (old cabinet) and the fridge sticker. The ticket gives the address: Blok C-7, the west end of the complex.
2. **Act 2, the complex (4 clues, need 5 of 7 in total).** Bu Wati's letter (mailbox), Pak Darto's CCTV monitor (his terrace), the ronda logbook (pos ronda) and Bu Sari's receipt (warung at the junction). Neighbours talk and their lines change once their clue is found.
3. **Act 3, Rani's old house (west end).** The door's lock light turns green after 5 clues. Rani is inside; the player chooses to delete or keep AFTER (two endings). The finale is NOT in the player's house.

Gossip files about friends, family, neighbours and fictional celebrities stay readable before midnight; each of the seven clue-bearing files also hints where its clue is. At 00:00 the house turns cold, doors open by themselves and four unknown-source files unlock.

## Loop
1. Open the phone (button top-right, or `P`) and read AFTER files; the HUD goal and cyan markers point to each hinted object.
2. Walk there and press the action button (or `E` / Space).
3. Collect 5 of 7 notes to unlock Rani's house at the west end. Talk to Rani, then choose: delete AFTER or keep AFTER.

## Horror
A framed old photo hangs in every corner of the house (10 frames in the player's house). It always shows the same pale figure at the end of a dark hallway, and the figure's eyes follow the player. While the player is in another room the figure creeps closer (the cap grows with each clue found and at midnight). Photos that can see the player raise a red fear vignette and a haptic heartbeat. Inspect a frame for text that changes with how close the figure is. Non-graphic: silhouettes and eyes only.

## Audio
All sound is synthesised with the Web Audio API (no audio files). The AudioContext is created only after the first tap or key press (browser autoplay rule); there is a speaker button under the phone button, a switch in Settings and the `M` key, and the choice is saved.
- **Sound effects:** footsteps by surface (wood, tile, concrete, asphalt, grass), door creak/slam, locked door, three knocks, unlock clicks, clue chime, phone swipes, hint ping, midnight toll, creak, whisper, scare stinger, heartbeat, ending chords.
- **Speech blips** for Bu Wati, Pak Darto and Rani, in time with their moving mouths.
- **Ambience:** wind, indoor electric hum, crickets (they stop after midnight), passing cars.
- **Adaptive music:** pads plus a music-box melody that change with the mood (menu, explore, after midnight, finale, two endings) and get a tense layer as photos watch you.
- Offline render checks: `src/audio.mjs` takes an optional `ctx` (OfflineAudioContext), so every sound can be rendered and its level checked.

## Characters
The player, Rani and the neighbours have detailed faces and outfits. Neighbours turn their head to you; when Bu Wati, Pak Darto or Rani talk, the camera cuts to a close-up of their face (collision-aware, never blocked by the player) while their mouth moves.

## Doors
Seven hinged doors (bedroom, kitchen, living room, dining room, front door, storage, and the front door of Rani's house). Use the action button to open or close; a door will not close while you stand in it. Rani's door has a red/green lock light and unlocks when 5 clues are found.

## Files
- `index.html` / `game.js` — entry; `window.run = run`.
- `src/three-loader.mjs` — loads Three.js r186 as an ES module from jsDelivr (dynamic import).
- `src/main.mjs` — loading screen, menu, quality tiers, HUD, joystick/keyboard input, camera, interactions, dialog, finale and endings, save/load, leaderboard.
- `src/world.mjs` — procedural low-poly house shell, colliders, clue beacons, mood lighting, merge of static meshes into a few draw calls.
- `src/interior.mjs` — house detail: wainscot, framed windows, curtains, pendant lamps, rugs, furniture, kitchen, storage clutter, porch and plinth.
- `src/doors.mjs` — hinged door system (animation, colliders, locking, blocking check).
- `src/audio.mjs` — procedural sound engine (effects, ambience, adaptive music, speech blips).
- `src/watchers.mjs` — the watching photos: procedural photo textures per stage, tracking eyes, creeping, fear score.
- `src/neighborhood.mjs` — the housing complex: main road with zebra crossing, cross street, ~14 houses, parked and moving cars, street lamps, pos ronda, warung, fences; Rani's enterable old house at the west end; walkable bounds and zone names.
- `src/actors.mjs` — low-poly character factory with real faces (eyes with iris and highlight, brows, nose, mouth, ears, cheeks), hair styles (short, long, hijab, grey), outfits, hands and shoes. Each body part is baked into one vertex-coloured mesh (~9 draw calls per character). Animations: walk, breathing, blinking, head turning towards the player, mouth moving while talking. `LOOKS` holds the cast (player, Rani, Bu Wati, Pak Darto).
- `src/phone.mjs` — in-game phone overlay (Messages, Photos, Contacts, Notes, Phone, AFTER) with full-screen photo viewer.
- `src/story.mjs` — contacts, messages, notes, AFTER archive, clues, finale text and endings.
- `src/logic.mjs` — pure clock rules. `tests/*.test.mjs` — Node unit tests (`node --test tests/logic.test.mjs tests/neighborhood.test.mjs tests/audio.test.mjs`).
- `style.css` (phone UI), `game.css` (HUD/menu/dialog), `asset_map.json` (27 photorealistic images used inside the phone), `game_config.json`.

## Controls
Touch: virtual joystick (bottom-left), action button (bottom-right), phone button (top-right). PC: WASD / arrows, `E` or Space to inspect, `P` for phone, `Esc` to close it.

## Tunables (game_config.json)
`midnightSeconds` (play time until 00:00), `glitchIntensity`, `ownerName`. Leaderboard: fastest completion time (ascending).
