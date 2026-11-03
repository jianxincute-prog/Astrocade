# THE WORLD IS YOUR PLAYGROUND

Interactive toy-diorama game for Astrocade, built from the GDD (v1.0).
Tap anything on a tiny floating island and watch it do something weird.

- `game_code.html` — the whole game (single file, Canvas 2D, WebAudio synth, no external assets)
- `game_config.json`, `asset_map.json` — empty; everything is drawn/synthesised in code

## What's in it
- 14 tappable objects: sun (fried egg), 2 clouds (rain monster), mountain (rainbow sneeze), windmill (whirlwind),
  house (grows legs), tree (face + giant fruit), pond (leaping fish), bridge (noodle), flower (giant boop),
  Pip the character, **cow** (moo + backflip), **rocket** (launch, bonks the sun, parachutes home),
  **mushrooms** (boing + spores), **treasure chest** (mimic, coin burst, burp)
- 10 curated chain reactions, depth-limited to 3 linked reactions (sun->pond, cloud->pond, mountain->tree,
  windmill->both clouds, flower->house, Pip->flower/bridge/house, rocket->sun, cow->Pip, mushroom->Pip bounce,
  chest->pond). Mode-specific (chained) reactions never chain further.
- Two-tier floating island (raised plateau with cliff and stone stairs at the back, meadow in front; camera zoomed out to 0.76x) that gently bobs; objects use a depth scale (back smaller, front larger), waterfall, butterflies, drifting far clouds, glowing crystals,
  vines, lighting/vignette overlay; canvas rendered at 1.5x for crisp visuals
- No score / fail state / reading; RESET button, sound toggle, hint hand + idle discovery cue
- Busy-lock per object, capped particle pool, safe fallback if a draw/reaction throws, reset cancels all timers

Portrait 720x1280; works with touch and mouse. Outside Astrocade (no `lib`) it auto-starts for local testing:
just open `game_code.html` in a browser.

## Audio
- Music: looping ukulele track (`music_bgm`), generated with Astrocade, starts on PLAY
- 24 sound effects (`sfx_*`), generated with Astrocade; trimmed/normalised at load time (crystal chime is pitch-shifted to do-mi-sol)
- One sound toggle mutes music and effects together
- If an audio file fails to load, the original WebAudio synth sounds play instead (and when running outside Astrocade)

## Interactive scenery (added later)
- Berry bushes (x3): shake, then pelt the nearest object with berries (chain)
- Butterflies (x3): tap one and it bursts into a rainbow swarm
- Waterfall (flows off the plateau cliff into the pond): geyser + rainbow, then fills the pond (chain)
- Crystals (x3, hanging under the meadow): a tiny xylophone; tap left to right for a confetti surprise

## Loading screen
- Shown immediately on open (sun mascot, title, striped progress bar); real progress = island art build + audio file downloads
- PLAY becomes available once everything is ready; hard cap of 9 s so a slow connection never blocks the game
  (late audio still joins in; missing audio falls back to the synth sounds)
