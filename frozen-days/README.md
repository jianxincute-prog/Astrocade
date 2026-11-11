# Frozen Days

3D winter-town life sandbox about learning to ice skate. **Build 4 (world layout v1)** follows the World Layout Specification:
a 300 x 300 world (north = +Z) with an organic frozen lake in the centre, a lake-ring main road plus shore promenade and six ice access points,
and four districts around the lake: Commercial (north), Central Park (east), Residential (south), Community Plaza (west).
Corner areas: pine forest (NW), hilltop viewpoint (NE), wooded trail (SW), frozen creek with an arched bridge (SE). Terrain has
gentle rolls, a hill and a bridge deck, and characters follow the ground height. Earlier builds: skating controller, balance and falls,
anime Male/Female skaters, XP + levels + five skills, goals, Spin trick (Lv 3), save, five NPCs with routines and dialogue.

## Controls
- Camera: sweep (drag) the screen to rotate the view a full 360 degrees. The camera only follows the character's position; moving or steering never swings it.
- Touch: the left stick gives a direction relative to the camera. On snow you walk that way; on ice you steer toward it (tilt = glide and turn, push fully = stroke, pull hard behind while fast = brake). PUSH adds a stroke, BRAKE stops.
- Keyboard: WASD / arrows move relative to the camera, Space brake, E spin (Lv 3+), F talk, drag mouse to look, R respawn.

## Economy
Coins come from goals, level-ups, distance skated, new places and new friends. Shops open at set hours (Blade & Edge 08-19, Warm Threads 09-20, Cocoa Corner 07-22, Sweet Bakery 06-17): walk to the door and press ENTER. Clothes and skates are bought once and worn from the shop or from Skills > Wardrobe; drinks give temporary balance comfort and bakes give XP.

## Code structure
- `game.js` — `run(mode)`: scene setup, game loop, edit-mode preview, settings panel.
- `src/config.js` — reads `gameConfig`; `skillsFor(level)` maps one skill level to Balance/Control/Speed/Braking/Tricks.
- `src/progress.js` — XP, levels, five skills grown by practice, optional goals, personal bests, friendships, discovered places, save format (v2).
- `src/layout.js` — pure layout data/math shared by everything: lake shoreline `lakeR(angle)`, road/path network, docks, creek and bridge, terrain `groundH`/`heightAt`, district rectangles, zones (`zoneAt`), `onIce`.
- `src/town.js` — road/path ribbons, per-district merged meshes (plaza + clock-tower cafe, park gazebo + oak, residential houses/fences/mailboxes + big tree, community board/hall/bonfire, hill viewpoint, arched bridge, creek, docks, boathouse, lakeside benches/lamps/signs).
- `src/npc.js` — NPC definitions, routines (skate loop / walk route / stand and chat), dialogue and friendship tiers; far NPCs are hidden.
- `src/skating.js` — skater state, ice physics (push strokes share a phase with the animation), balance/instability model, fall & recovery state machine, collisions.
- `src/world.js` — displaced terrain mesh, organic lake fans (slush rim + canvas ice texture with skate trails), instanced pines/rocks/bushes/snow banks, snowmen, one Points object for all lamp glows, mountains, snowfall.
- `src/anime.js`, `src/cloth.js` — toon materials with screen-space outlines; flat anime cloth/hair textures.
- `src/character.js` — detailed procedural Male/Female skaters (rigged capsule limbs, painted anime face, ears, hair, glasses, outfit) and pose animation.
- `src/face.js` — hand-painted anime faces (eyes, brows, nose, mouth, blush) projected onto the head texture; open and blink variants.
- `src/textures.js` — procedural canvas textures (quilted puffer, knit, twill, leather, hair, eyes) and the reflection environment.
- `src/select.js` — character select overlay (Male/Female, face close-up, start).
- `src/sky.js` — day-night cycle (sun, moon, stars, sky/fog colour, lamp and window glow) and four weather states (clear, cloudy, light snow, heavy snow) that blend smoothly; settings `world.dayMinutes`, `world.weather`, `world.hour`.
- `src/shops.js` — shop hours and doors, the catalogue (jackets, scarves, beanies, pants, gloves, skates with grip/glide perks, drinks, bakes) and helpers that turn the worn items into a character variant and skate gear.
- `src/shop.js` — the shop/wardrobe bottom-sheet UI (tabs, tap to try on, buy / wear / eat).
- `src/camera.js`, `src/input.js`, `src/hud.js`, `src/fx.js` — chase camera, keyboard/touch input, DOM HUD, spray particles.

## Roadmap (see GDD)
Next: sitting and eating animations, friendship activities, settings and audio.
