# Fighting Doll

Portrait (720x1280) kids' fighting game. Pick one of 20 stitched-doll fighters, then win best-of-3 rounds vs. the CPU.
Controls: ◀ ▶ move, JUMP, PUNCH, spinning KICK, ★ SPECIAL (when the purple bar is full). Keyboard: A/D or arrows, W/Space, J, K, L.

Files
- `index.html` – canvas + loads `game.js`.
- `game.js` – scenes (title, select, fight, result), fighters/pose animation, combat, CPU AI, HUD, input, `run(mode)`.
- `characters.js` – roster data (name, color, special-move kind, speed/power).
- `stage.js` – procedural arena backgrounds (3 themes by win streak).
- `audio.js` – WebAudio synth sound effects and chiptune music (no files).
- `game_config.json` – tunables (round time, CPU level, damage, special charge speed) + leaderboard declaration.
- `asset_map.json` – 20 cut-out character sprites (`c00`..`c19`).

Edit mode shows a static preview of two fighters; all gameplay is play-mode only.
