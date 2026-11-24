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

## Silly traps (funny hit animations)
- Laughing fog (green maps A and C): drifting smiley cloud; touching it makes the hero laugh uncontrollably (shaking, tears, "HAHAHA!") for a few seconds and he cannot jump.
- Rocket launcher: googly-eyed cannon warns with a red "!" and an aim line, then fires a rocket. A hit straps the hero to the rocket (ropes) and flies him backward before it explodes into confetti.
- Boxing glove: spring-loaded glove punches out of a wall; the hero spins away with orbiting stars ("BONK!").
- Banana peel: slip, backflip, "WHEEE!".
- Falling anvil (Fire Mountain): flattens the hero into a pancake, then he pops back up ("PLOP!"). Green Slopes still has falling boulders, Snowy Peak falling icicles.
Traps never react to the player: the rocket launcher and boxing glove run on a fixed timer (telegraphed warning first), so they can be read and dodged. At most 5 traps are placed per run (`traps.max`); kinds and platforms are re-rolled for every new run (CONTINUE keeps the saved layout). Everything can be switched off with `traps.on` in the config.

## Sounds
Generated sound effects (asset_map.json): mocking laugh after falls and hits, big belly laugh for the laughing fog, crowd laugh after anvils / bananas / rockets and when returning from the abyss, and a falling scream. Synth fallbacks play if an asset fails to load. `audio.laughReact` turns the post-hit laugh off.
Falling into a pit is silent for a few seconds (`abyss.screamDelay`, default 1.3 s), then the scream plays, the screen fades and the hero returns to the last checkpoint.

## Shop
Main menu > Shop sells 8 clothing skins (classic tee, red jersey, blue hoodie, sailor stripes, island shirt, pajamas, jungle camo, gold tracksuit).
Skins are drawn procedurally for the same torso / arm / leg sprite parts, so they fit every pose and the ragdoll. Coins picked up during runs go into a saved wallet;
owned skins and the equipped skin are saved with the player state (`shop` key).

## Controls (mobile and PC never overlap)
The UI follows the last input device. Touch devices show the on-screen left / right / jump buttons (multi-touch, and a finger can slide between buttons); PC shows a keycap legend instead and hides the touch buttons. Touch and keyboard are tracked as separate sources and merged, so releasing a key never cancels a held button and vice versa; switching device releases everything the other one was holding.
- Touch: hold a button; hold jump = higher.
- Keyboard: A/D or arrows to run, Space/W/Up to jump, Esc/P to pause. Menus: Enter/Space = confirm, Esc = back, C continue, S shop, L language, H help, 1/2/3 pick a language; map gacha: Space skips the spin, R spins again; shop: arrows move, Enter buys/equips.
- Mouse: click any menu button.

## Code structure
- `index.html`: skeleton, UI CSS (incl. RTL rules), loading screen, CSS effect layers (tilt-shift, glow, vignette).
- `game.js`: all logic - i18n table, three.js loader (CDN), procedural pixel textures, `MAPS` + `buildLevel(mapId)`, `buildWorld`,
  character, player physics (AABB), ragdoll, per-map hazards, gacha carousel, UI, WebAudio sound, quality tiers, save, leaderboard.
- `game_config.json`: tunable numbers (run speed, jump, gravity, hazard toggles, tilt-shift) and the leaderboard declaration.

## Score
`score = max height x 10 + coins x 25 (+ time bonus at the summit)`. Submitted at the summit or when leaving a run.
