# Fighting Doll (3D)

Portrait (720x1280) kids' 3D fighting game in a square boxing ring. Pick one of 10 chibi dolls, then win best-of-3 rounds vs. the CPU.
Controls: joystick moves (relative to the camera), JUMP, PUNCH, spinning KICK, STAR SPECIAL (when the purple bar is full). Keyboard: WASD/arrows, Space, J, K, L.
Fighters always face each other; the camera swings to keep a side-on view. Win streaks raise the CPU level and change the arena (day, sunset, night).

Files
- `index.html` - 3D canvas + transparent UI canvas; loads Three.js r128 from cdnjs, then `game.js`.
- `game.js` - scenes (title, select, fight, result), 3D fighters and combat on the ring floor, camera, CPU AI, HUD/menus (2D overlay), input, `run(mode)`.
- `characters.js` - roster data (name, colors/features for the 3D build, special-move kind, speed/power).
- `model.js` - builds each chibi doll from primitives with cartoon outlines, and animates poses (idle, walk, punch, kick, special, hit, KO, win).
- `arena.js` - ring, stands with crowd, light towers, sky (3 themes).
- `fx3d.js` - sprite particles (stars, rings, bursts, comic text).
- `audio.js` - WebAudio synth sound effects and chiptune music (no files).
- `game_config.json` - tunables (round time, CPU level, damage, special charge speed) + leaderboard declaration.
- `asset_map.json` - 10 portrait icons (`<id>_idle`) used in the HUD and the character cards.

Edit mode shows a static 3D preview of two fighters; all gameplay is play-mode only.
