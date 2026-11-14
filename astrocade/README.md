# Astro World

WorldBox-style god-sim sandbox. Portrait 720x1280, canvas + DOM overlay, no external assets.

- `game.js` — everything: procedural world, creature AI, fire/disasters, rendering, input, UI, edit/play modes. Creature and house sprites are pixel art defined in code (walk A/B, attack C): sizes vary per species (rabbit 11x10 up to the 14x16 werewolf), lit from the upper left.
- `game_config.json` — `settings` (day/night, starting population scale) and `world` (`size` 0/1/2 = S/M/L, seed, RLE tiles painted in edit mode).

Play mode: full sim + tools + autosave via `lib.saveUserGameState`.
Edit mode: sim frozen; sculpt terrain / regenerate world; changes are written to `gameConfig.world`.
Zoom: + / − buttons only; minimum zoom is the full-map view.

World sizes: S 120x148, M 200x246 (default), L 240x296. M/L use a multi-continent generator; population caps scale with size.
Far zoom (tile < 5px) draws dots instead of sprites. Destructive world actions need a second tap.

Houses: one architectural style per race (human straw cottage, elf treehouse, dwarf stone hall, orc hide tent, werewolf moon lodge) with chimney smoke, lit windows at night and forge/moon glow.

Kingdoms (phase 1 of civilization): houses of one race within 9 tiles form a kingdom with a generated name, a capital and a territory (tinted area with a border line; toggle with the flag button in the world tab). Each kingdom has food/wood/stone/gold: food limits births and famine kills, wood pays for new houses, and kingdoms level up Tribe -> Village -> Town -> Kingdom when population, houses and resources allow. Villages get a capital banner, Towns/Kingdoms a bigger per-race capital hall, Kingdoms a royal aura; the oldest member is crowned. Tap a house or territory with the inspect tool for a summary. Save format v5 stores kingdoms and each house's kingdom.

Technology (phase 2): each race has 4 sequential techs researched automatically once the kingdom has the level and resources (30 s of research): human farming/walls/knighthood/trade, elf living forest/archery/fire ward/tree of life, dwarf mining/forge/vault/mountain hold, orc war camp/raiding/blood totem/horde, werewolf moon prayer/pack/spirit totem/full moon. Effects are multipliers and flags on the kingdom (`k.mod`): production, births, attack/defence, range (elf arrows), fire immunity, loot, lifesteal, night strength, regeneration, bigger territory/house cap. Visible results: farm fields, stone wall ring, mine, war banner, blood totem, spirit totem and tree of life landmarks, floating tech icons. The 📖 Ilmu power grants the next tech instantly. Save format v6 stores how many techs each kingdom has (v5 still loads).

Wildlife: sheep, rabbits and deer are prey (rabbits/deer flee); wolves hunt them, avoid settlements when fed, and a small pack migrates in from wild land when wolves get scarce so they never stay extinct.

Forced evolution: when only 2-3 wolves remain they all evolve into werewolves (cooldown 1200 ticks). Werewolves are a neutral civilization: nobody is their foe, they fight nobody, and they grow slowly (rare births, few houses scaled to population, long lives, small cap).
