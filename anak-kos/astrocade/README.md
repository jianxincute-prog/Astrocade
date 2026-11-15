# Kost Life: Broke Till Payday

A cozy life-sim for mobile portrait (720x1280). The player looks after one young renter in a
single boarding-house room ("kost") for 30 days, keeping 4 needs up (Hunger, Energy, Hygiene, Fun)
while working to save enough money for the rent due on day 30.

## Core loop
- Tap furniture (or action buttons / keys 1-6): Sleep, Cook noodles, Shower, Freelance, Watch TV, Work shift.
- Needs drain over time; soft failures (fainting, falling asleep on the floor, stinky, feeling down), no game over.
- A daily random event plays as an animated scene with NPCs (friend, landlady, courier, cat);
  the flying cockroach is a tap mini-game (3 hits in 4.5 s).
- Furniture shop (upgrades persist across months). Month score = money left after rent
  + average happiness x moodWeight, submitted to the leaderboard.

## Code structure
All code lives in `game.js` (canvas 2D + WebAudio, no external assets):
- Config: `CFG` defaults merged with `gameConfig.cfg` via `applyConfig()`; sliders in `showParams()`.
- Data: `NEEDS`, `FURN`, `SHOP`, `EVENTS`, `LOOKS`.
- Save: `loadSave()` / `writeSave()` via `lib.getUserGameState` / `lib.saveUserGameState`.
- Audio: `SFX`, music sequencer `TRACKS` + `musTick()` (menu/day/night/tense moods).
- Gameplay: `newGame`, `order`, `startAct`, `finishAct`, `update`, `endMonth`.
- Event scenes: generators in `SCENES` (helpers `moveTo`, `all`, `jump`, `choose`, `enter`, `leave`).
- Characters: 2D rig `drawPerson` + `POSES`, `drawHeadFull`, `drawItem`, `drawCat`, `drawRoach`.
- Room: cached static layer `buildRoomLayer()` + dynamic parts in `drawRoom()`.
- UI: vector `ICONS`, 3D buttons `btn3d`, `drawHUD`, `drawPanel`, `drawModal`, `drawMenu`, `drawEnd`.
- Entry: `run(mode)`. Edit mode shows the room without gameplay; play mode runs the full game.

## Quality
Auto/Low/Med/High (FPS probe while loading) controls pixel ratio, particles, shadows and lighting effects.
