# Midnight Breach

A suspenseful found-phone gossip mystery. Explore familiar fictional phone apps and open the AFTER app at any time: it already holds embarrassing-but-harmless secrets of the owner's friends, family and neighbours, plus fictional celebrity scandals. When the simulated clock reaches midnight, three locked unknown-source files unlock with uncanny, non-graphic images.

All people, celebrities and scandals are fictional; secrets are comedic gossip (no real people, nothing sexual or violent).

## Files
- `index.html` — mobile-first entry page and game root.
- `game.js` — explicit Astrocade `run(mode)` entry point.
- `src/interface.mjs` — phone UI, navigation, AFTER archive (open before midnight, unknown files locked until 00:00), editor interactions, timed reveal, photo preloading.
- `src/logic.mjs` — pure clock and editable app-order rules.
- `src/story.mjs` — fictional contacts, messages, notes and archive records (categories TEMAN, KELUARGA, TETANGGA, ARTIS, TIDAK DIKENAL).
- `style.css` — device frame, screen layouts, premium photo treatments.
- `asset_map.json` — ultra-realistic portraits (`portrait_<contactId>`), evidence photos (`aib_<contactId>`), everyday gallery photos (`photo_*`) and uncanny images (`entity_*`).
- `game_config.json` — creator-editable midnight duration, glitch intensity, owner label and app order.
- `tests/logic.test.mjs` — Node unit tests for clock, app layout and archive rules.

## Controls
Tap app icons to browse. The clock starts at 11:48 PM and accelerates toward midnight. AFTER opens immediately with gossip files; unknown-source files show a countdown and open at 00:00. Contact pages link straight to that person's secret. In Edit mode, drag app icons to rearrange the home screen.
