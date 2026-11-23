# Ragdoll Summit Rush

HD-2D style 3D meme platformer (Octopath-like look): a 2D pixel-art character (billboard, built from ragdoll-style body parts)
runs and jumps through a 3D voxel world. Big falls and hits turn the hero into a floppy ragdoll, then he gets back up.

## Maps (random, picked by a gacha-style carousel that spins left to right)
- Green Slopes: falling boulders, crumbling planks, moving platforms, springs.
- Snowy Peak: slippery ice, wind gusts, falling icicles, cracking ice.
- Fire Mountain: lava geysers (bubble first, then erupt), crumbling platforms, lava pits.

## Languages
English (default), Indonesian, Arabic (right-to-left). Pick one with the globe button on the main menu; the choice is saved.
All UI strings live in the `I18N` table at the top of `game.js`.

## Shop
Main menu > Shop sells 8 clothing skins (classic tee, red jersey, blue hoodie, sailor stripes, island shirt, pajamas, jungle camo, gold tracksuit).
Skins are drawn procedurally for the same torso / arm / leg sprite parts, so they fit every pose and the ragdoll. Coins picked up during runs go into a saved wallet;
owned skins and the equipped skin are saved with the player state (`shop` key).

## Controls
Touch: on-screen left/right and jump buttons (hold jump = higher). Desktop: A/D or arrows, Space/W to jump, Esc/P to pause.

## Code structure
- `index.html`: skeleton, UI CSS (incl. RTL rules), loading screen, CSS effect layers (tilt-shift, glow, vignette).
- `game.js`: all logic - i18n table, three.js loader (CDN), procedural pixel textures, `MAPS` + `buildLevel(mapId)`, `buildWorld`,
  character, player physics (AABB), ragdoll, per-map hazards, gacha carousel, UI, WebAudio sound, quality tiers, save, leaderboard.
- `game_config.json`: tunable numbers (run speed, jump, gravity, hazard toggles, tilt-shift) and the leaderboard declaration.

## Score
`score = max height x 10 + coins x 25 (+ time bonus at the summit)`. Submitted at the summit or when leaving a run.
