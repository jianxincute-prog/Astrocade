# Frozen Days

3D winter-town life sandbox about learning to ice skate. **Build 1** covers GDD Phases 1–3:
third-person camera, ice-skating controller (momentum, grip, braking), beginner balance, falls and recovery.

## Controls
- Touch: left stick steers (up = push, down = brake), PUSH and BRAKE buttons on the right, drag the view to look around.
- Keyboard: W/↑ push, A/D steer, S/Space brake, drag mouse to look, R respawn.

## Code structure
- `game.js` — `run(mode)`: scene setup, game loop, edit-mode preview, settings panel.
- `src/config.js` — reads `gameConfig`; `skillsFor(level)` maps one skill level to Balance/Control/Speed/Braking/Tricks.
- `src/skating.js` — skater state, ice physics, balance/instability model, fall & recovery state machine, collisions.
- `src/world.js` — snowfield, frozen lake (canvas ice texture with skate trails), pines, lamps, snowmen, cones, snowfall.
- `src/player.js` — procedural placeholder skater mesh and pose animation.
- `src/camera.js`, `src/input.js`, `src/hud.js`, `src/fx.js` — chase camera, keyboard/touch input, DOM HUD, spray particles.

## Roadmap (see GDD)
Next: Phase 4 lake environment pass, Phase 6 character select (male/female), Phase 7 XP & skills + save.
