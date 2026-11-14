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

Technology (phase 2): each race has 4 sequential techs researched automatically once the kingdom has the level and resources (30 s of research): human farming/walls/knighthood/trade, elf living forest/archery/fire ward/tree of life, dwarf mining/forge/vault/mountain hold, orc war camp/raiding/blood totem/horde, werewolf moon prayer/pack/spirit totem/full moon. Effects are multipliers and flags on the kingdom (`k.mod`): production, births, attack/defence, range (elf arrows), fire immunity, loot, lifesteal, night strength, regeneration, bigger territory/house cap. Visible results: farm fields, stone wall ring, mine, war banner, blood totem, spirit totem and tree of life landmarks, floating tech icons. The 📖 Ilmu power (👑 tab) grants the next tech instantly. Save format v6 stores how many techs each kingdom has (v5 still loads).

War & diplomacy (phase 3, fully automatic): every ~10 s kingdoms on the same landmass and within reach evaluate each other. Aggression per race (orc high, human/dwarf low, elf very low, **werewolves never declare war**); a kingdom starts at most one war itself, needs enough population (and level 1 unless orc), and picks fights more readily against weaker or overlapping neighbours. Friendly races (human/elf/dwarf) may sign alliances and allies join defensive wars; wars end when a side is beaten (<=1 house or <=2 people) or from war weariness, followed by a 4000-tick truce. Soldiers (25-55% of a kingdom, plus its leader) march on the enemy capital and fight kingdom enemies instead of race enemies; non-orc races capture adjacent enemy houses, orcs raze and loot them. A werewolf kingdom stays neutral until attacked: once at war its soldiers fight back, and peace returns it to neutrality. Visible: red war-cry rings, crossed swords over capitals at war, dashed red lines between warring capitals (with borders on), peace/war toasts, and enemies/allies in the kingdom panel. Save format v7 stores relations.

Events & realm powers (phase 4): kingdoms suffer or enjoy random events: ☠️ plague (kills people, cuts births, spreads to touching neighbours, then 4000 ticks of immunity), 🥀 drought (food x0.4) and ✨ golden age (births and food up). Unrest builds from famine, plague and long wars and fades in peace; when it maxes out in a mature kingdom (level 2+, 8+ houses, 6000-tick cooldown) one side of the realm **rebels** as a new kingdom already at war with its parent. Tiny kingdoms (<=3 houses) at peace are annexed by a bigger neighbour of their race, which keeps fragmentation in check. The 👑 tab gives the player 🙏 Anugerah (resources, cures plague, golden age, calms unrest), ☠️ Wabah, 🔥 Pemberontakan (incite a rebellion), 🕊️ Damaikan (end all wars of the kingdoms touched), 🤝 Satukan (merge with the nearest kingdom of the same race), ✂️ Pecah (peaceful split) and 📖 Ilmu; they act once per touch. Events show as an icon and aura over the capital, the panel lists the event and unrest. Save format v8 stores events and unrest.

Wildlife: sheep, rabbits and deer are prey (rabbits/deer flee); wolves hunt them, avoid settlements when fed, and a small pack migrates in from wild land when wolves get scarce so they never stay extinct.

Forced evolution: when only 2-3 wolves remain they all evolve into werewolves (cooldown 1200 ticks). Werewolves are a neutral civilization: nobody is their foe, they fight nobody, and they grow slowly (rare births, few houses scaled to population, long lives, small cap).
