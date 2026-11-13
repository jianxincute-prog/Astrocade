# Urban Enforcer

3D open-world street brawler (Three.js r149, loaded via `<script>` in index.html). A towering, bald,
muscular enforcer liberates a 300x300 city controlled by three gangs: **Serigala Merah** (north),
**Naga Biru** (south-east) and **Kobra Emas** (south-west). Beat `killsForBoss` members of a gang to
summon its boss at the gang HQ; defeat all three bosses to win. Top-down third-person camera.

Controls: joystick (bottom-left), SERANG (jab → cross → uppercut combo, hold to chain), HINDAR (dodge
roll with i-frames), skills: Hantaman Bumi (ground slam AoE), Putaran Badai (spinning lariat),
Tinju Banteng (bull-rush dash + finisher). Keyboard: WASD, J, K/Space, 1/2/3.

## Code
- `game.js` – entry, `window.run(mode)`.
- `src/main.js` – Game shell: renderer, loop, hit resolution, HUD wiring, edit mode (drag the player to set spawn → `gameConfig.player.spawnX/Z`, drag to pan).
- `src/logic/` (pure, tested): `intro.js` opening-cutscene script (timeline, taxi/hero motion, dialogue, camera), `city.js` layout/territories, `anim.js` poses + keyframe clips + procedural idle/run cycles, `combat.js` move data & hit sectors, `player.js` state machine, `enemy.js` AI, `physics.js` collision, `progress.js` campaign/score.
- `src/render/` – `character.js` procedural rigged character: lathe-sculpted V-taper torso & tapered limbs, layered muscles, detailed face, fists with knuckles/wraps, boots, tattoo, fresnel rim light, x-ray silhouette behind walls (player = 'high' detail, enemies 'low'), crossfaded pose animation; `headmesh.js` + `sdf.js` sculpted smooth head, `bodymesh.js` smooth torso/limbs, `env.js` studio reflections, `world.js` city meshes, `fx.js` particles/rings/telegraphs.
- `src/ui/` – `hud.js` HUD, minimap, touch/keyboard controls; `audio.js` SFX + music + synthesized cutscene sounds (ring, blips, engine); `cutscene.js` opening cutscene (taxi mesh, phone prop, letterbox, subtitles, mission card, skip).
- `tests/logic.test.mjs` – run `node tests/logic.test.mjs`.

Leaderboard: score submitted at game over/victory.

Player readability: closer, tilted camera (`visual.cameraHeight`, default 13), pulsing gold ground ring + contact shadow, rim light, x-ray silhouette. Characters stand on sidewalk/plaza height via `groundHeight()`.

## Realistic player model
`src/render/skinned.js` loads the rigged glTF human (`model_fighter` in asset_map, Mixamo skeleton) and
retargets the hidden procedural driver rig onto its bones each frame (calibrated arms-down rest, auto fist curl),
blending in the model's motion-captured Run/Walk for locomotion. Armour texture recoloured to dark tactical; the
helmet head bone is collapsed and replaced by the sculpted bald head, pinned every frame to the final (post-mocap) Head bone transform (`pinHead`) so it never drifts while running. Falls back to the procedural fighter if the
model fails to load. three.js r147 + examples/js GLTFLoader & SkeletonUtils (index.html).

## Foot planting and idle life
`src/logic/anim.js` cycles a relaxed guard into a right-hand bald-crown scratch, then a covered-mouth yawn/head tilt, then back to guard (12-second periodic cycle; tiny dark mouth opens during the yawn). `src/render/skinned.js` samples the model's actual skinned shoe-sole vertices once, stores sole anchors in toe-bone space, and lifts the rig only by the amount the lowest sole penetrates the current road/sidewalk/plaza surface. Ground alignment follows the animated feet instead of relying on a single guessed character origin.

## Camera modes
`src/logic/camera.js` (pure, tested): Top Down (default, `visual.cameraMode`) and Third Person. Toggle with the
🎥/🗺️ button under the minimap or key C. Third person: joystick/WASD are camera-relative, camera eases behind the
hero while moving, drag empty screen to orbit, boom shortens in front of buildings.

## Opening cutscene
First press of MULAI in a session plays a ~30 s cutscene (`src/ui/cutscene.js`, script in `src/logic/intro.js`): a taxi pulls up in the
central plaza, the Enforcer steps out, his phone rings and *Pak Wirawan* orders him to wipe out every thug in the three gang
territories (mission card lists the gangs). Everything is a pure function of the cutscene clock, so it is unit-tested; the UI layer only
builds meshes/DOM and drives the player rig (`CLIPS.phone` arm pose, phone prop on the right fist) and camera. Skip: LEWATI button,
Enter/Esc/Space. Replays ("MAIN LAGI") skip it. Toggle with the "Cutscene Pembuka" setting (`intro.cutscene` in game_config.json).
The scene is staged at a fixed plaza spot and the hero is moved to `player.spawnX/Z` during the closing fade.

## Premium head
The hero's head is no longer a pile of spheres: `src/render/headmesh.js` melts ~25 ellipsoids (skull, heavy jaw, cheekbones, brow ridge,
nose, lips, eye pockets) into ONE surface with smooth-union SDFs (`src/render/sdf.js`), meshed at 220x165 with gradient normals, so there are
no seams. Brows, stubble, lips, nostrils, eye shading and the scar are painted as vertex colours; `aGloss` marks the bald crown so the
material (`Character.headMaterial`, MeshPhysical) drives roughness/clearcoat per vertex. `src/render/env.js` builds a PMREM "photo studio"
(softboxes + overhead strip + rim) applied per material (`Character.env`, set by the game) so the dome shows long soft highlights that slide
as he turns. Also: textured wet eyeballs, ears with a helix rim, pore bump + mottled skin texture, sheen. The rigged model's armour gets a
faint studio sheen too. Low-detail enemies reuse the same head at lower resolution.

## Smooth body
For the player (detail 'high', tank top) `src/render/bodymesh.js` replaces the lathe + overlapping muscle ellipsoids with one sculpted
surface per segment: chest (ribcage + pecs + lats + upper back + traps), abdomen + obliques, neck + SCM, upper arm (deltoid, biceps, triceps),
forearm (elbow, brachioradialis), thigh (quads, rounded hip cap) and shin (knee, calf). Each is a revolved profile with the muscle masses
melted in by smooth-union SDFs and swept into a mesh with gradient normals. The tank top's V-neck / traps / straps are skin-vs-knit zones
evaluated per pixel in the chest material (`addChestShader`), so there is no patch edge. Enemies now use the same smooth segments at half resolution (jacket zipper stripes are painted in the chest shader).

## Enemies, fists, shoes, hair
- Fists (`fistGeometry`, player + NPCs): palm, knuckles, folded fingers, tucked tips, thumb across the fingers and soft finger grooves melted into one mesh.
- Shoes (`shoeGeometry`): foot, toe cap, heel and sole slab as one shoe with a dark painted sole, resting on the ground.
- Enemy hair is a real cap (`buildHairGeometry`) whose thickness fades to nothing at the hairline; mohawk is a ridge of tapered spikes; bandana has a
  knot and tails; shades are glossy lenses with a bridge and temple arms. Enemy heads reuse the sculpted head at 120x90.
