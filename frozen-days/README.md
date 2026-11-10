# Frozen Days

3D winter-town life sandbox about learning to ice skate. **Build 2** covers GDD Phases 1–4, 6 and 7:
third-person camera, ice-skating controller (momentum, grip, braking), beginner balance, falls and recovery,
Male/Female anime skaters, XP + levels + five skills, optional goals, a Spin trick (Lv 3), save, and a detailed lake shore.

## Controls
- Touch: left stick steers (up = push, down = brake), PUSH and BRAKE buttons on the right, drag the view to look around.
- Keyboard: W/↑ push, A/D steer, S/Space brake, E spin (Lv 3+), drag mouse to look, R respawn.

## Code structure
- `game.js` — `run(mode)`: scene setup, game loop, edit-mode preview, settings panel.
- `src/config.js` — reads `gameConfig`; `skillsFor(level)` maps one skill level to Balance/Control/Speed/Braking/Tricks.
- `src/progress.js` — XP, levels, five skills grown by practice, optional goals, personal bests, save format (v2).
- `src/skating.js` — skater state, ice physics (push strokes share a phase with the animation), balance/instability model, fall & recovery state machine, collisions.
- `src/world.js` — cel-shaded snowfield, frozen lake (canvas ice texture with skate trails), pines, dock, rowboat, boathouse cabin, signpost, rocks, snow banks, lamps, snowmen, mountains, snowfall.
- `src/anime.js`, `src/cloth.js` — toon materials with screen-space outlines; flat anime cloth/hair textures.
- `src/character.js` — detailed procedural Male/Female skaters (rigged capsule limbs, painted anime face, ears, hair, glasses, outfit) and pose animation.
- `src/face.js` — hand-painted anime faces (eyes, brows, nose, mouth, blush) projected onto the head texture; open and blink variants.
- `src/textures.js` — procedural canvas textures (quilted puffer, knit, twill, leather, hair, eyes) and the reflection environment.
- `src/select.js` — character select overlay (Male/Female, face close-up, start).
- `src/camera.js`, `src/input.js`, `src/hud.js`, `src/fx.js` — chase camera, keyboard/touch input, DOM HUD, spray particles.

## Roadmap (see GDD)
Next: Phase 5 town blockout (commercial, park, residential), Phase 8 NPCs, Phase 9 shops.
