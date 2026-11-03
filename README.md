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
- Wide floating island (camera zoomed out to 0.76x so everything fits) that gently bobs, waterfall, butterflies, drifting far clouds, glowing crystals,
  vines, lighting/vignette overlay; canvas rendered at 1.5x for crisp visuals
- No score / fail state / reading; RESET button, sound toggle, hint hand + idle discovery cue
- Busy-lock per object, capped particle pool, safe fallback if a draw/reaction throws, reset cancels all timers

Portrait 720x1280; works with touch and mouse. Outside Astrocade (no `lib`) it auto-starts for local testing:
just open `game_code.html` in a browser.
