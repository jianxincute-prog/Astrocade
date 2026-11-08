# Metamorphosis

A ~5-minute 3D garden story. Start as a cute but prickly caterpillar, grow through three chapters, spin a cocoon, defend it, then burst out as a butterfly and chase pollen combos at sunset.

## The run (about 4–5 minutes)
1. **Larva (~2 min, three chapters).** Eat leaves (+2), nectar (+3) and rare golden leaves (+8) to fill the growth bar.
   - **Chapter 1 – Tiny Tendril:** patrolling beetles.
   - **Chapter 2 – Leaf Lumberer** (33%): spiders that wind up and lunge, bird strikes (watch the red circle!), poison puddles.
   - **Chapter 3 – Plump & Prickly** (66%): night falls, predators get faster.
   - Every molt restores a heart, gives a free shockwave and a new ability: a bigger, quicker Fuzz Burst, then more speed and a wider snack magnet.
2. **Cocoon (20 s).** Spin your silk, then defend the chrysalis. Bugs chew it when they reach it – **PUFF** to stun them, or PUFF while a bird's shadow is on the ground to scare it away.
3. **Emerge.** The cocoon cracks and the wings unfold.
4. **Flight (90 s, up to +15 s from golden flowers).** Chain pollen for up to ×5 combos. Birds hunt you (a hit breaks the combo); PUFF scatters them. Score card with stars and a saved best score.

## Controls
- Touch: drag the **MOVE** stick, tap **PUFF**.
- Keyboard: WASD / arrows to move, Space or X to puff, M to mute.

## Editor
Edit mode disables gameplay. Tap an editable plant, snack, predator, or the starting caterpillar and drag to reposition it. Positions are stored in `gameConfig.editorPositions`. Food count, predator count, fuzz size, flight length and garden mood live in the Astrocade settings panel; **Rebuild garden from settings** previews count changes.

## Code structure
- `index.html` loads the game entry module.
- `game.js` – loading screen, audio manager, Three.js world, phases (larva → molt → spin → cocoon → emerge → fly → result), HUD, editor.
- `logic.mjs` – pure rules: growth stages, molt abilities, enemy pacing, cocoon drain, pollen combos, score and stars.
- `tests/logic.test.mjs` – deterministic tests for the rules (`node --test tests/logic.test.mjs`).
- `asset_map.json` – generated music (garden / tense / butterfly loops + win sting) and sound effects. If any file fails to load, short synthesized sounds take over, so the game never goes silent or stalls.
