# Astro World

A WorldBox-style god-sim sandbox for mobile and desktop. Shape an island, drop humans, elves, dwarves,
orcs and animals, and watch kingdoms grow, trade, sail, fight and fall, then unleash disasters.
Portrait 720x1280, HTML canvas plus a DOM overlay, no external assets (art, sound and music are all generated in code).

**Current version: 4.0 "Rise of Empires".** See [What's new](#whats-new-in-40). Versions 3.5, 3.0 and 2.0 ("Living Seas") are described [below](#whats-new-in-35).

## Contents
1. [Files](#files)
2. [Modes and controls](#modes-and-controls)
3. [The HUD](#the-hud)
4. [Worlds and island seeds](#worlds-and-island-seeds)
5. [Civilization](#civilization)
6. [Individuals and equipment](#individuals-and-equipment)
7. [Pirates](#pirates-v40)
8. [Wildlife and sea life](#wildlife-and-sea-life)
9. [Voyages and the sea economy](#voyages-and-the-sea-economy)
10. [Disasters and weather](#disasters-and-weather)
11. [Presentation: menu, sound, tour, popup](#presentation-menu-sound-tour-popup)
12. [Save format](#save-format)
13. [Development notes](#development-notes)

## Files
| File | Purpose |
| --- | --- |
| `index.html` | Loads `game.js` as a module. |
| `game.js` | The whole game shell: world generation, creatures, kingdoms, economy, diplomacy, sea life, rendering, UI, sound, save/restore. Defines `run(mode)` (`window.run = run`). |
| `tech.js` | Pure tech tree: 15 techs per race in three branches, five ages, race-flavoured age names, research choice and knowledge-point gain (v3.0). |
| `buildings.js` | Pure rules for the production buildings (sawmill, bakery, smithy, library, academy, wonder) and their goods chains (v3.0). |
| `naval.js` | Pure naval rules: ship firepower, kraken odds model, warship stats (v3.0). |
| `seasons.js` | Pure seasons and royal decrees (v3.0). |
| `landscape.js` | Pure river tracing, road wear and run-length helpers for saving them (v3.0). |
| `scenarios.js` | Pure scenario definitions and progress rules (v3.0). |
| `diplomacy.js` | Pure diplomacy rules: trade pacts, alliances, breaks, betrayal and aid between partners (v3.5). |
| `reproduction.js` | Pure life-cycle rules: sexes, adulthood, breeding rates, parents and mixed crews (v3.0). |
| `pirates.js` | Pure pirate rules: mutiny chance, band size, island labelling and the hideout island and tile (v4.0). |
| `outfits.js` | Canvas drawing of the profession clothes over the race sprites (v4.0). |
| `professions.js` | Pure logic for lifelong professions: race liking, realm needs, share cap, mastery, builder and trader effects. |
| `jobs.js` | Pure logic for everyday jobs: chop, mine, hunt, farm, fish, gather (race weights, yields, work length, swing timing). |
| `work_anim.js` | Canvas drawing for the work animations (axes, pickaxes, hoes, spears, bows, claws, fishing rods) and carried goods. |
| `sizing.js` | Pure helper for the Character Size setting (0.6 to 2, default 1.2). |
| `sim_rules.js` | Pure birth-rate and war-outcome rules. |
| `objectives.js` | Pure definitions and progress maths for the optional goals. |
| `navigation.js` | Pure water-only route finder and shipwreck risk for sea voyages. |
| `game_config.json` | `settings` (day/night, starting population, character size, shipwreck risk), `world` (size, seed, RLE tiles painted in edit mode) and the leaderboard declaration. |
| `asset_map.json` | The `cover` image used as the store thumbnail. |
| `tests/` | Plain Node tests for the pure modules. |

Run the tests with `for t in tests/*.mjs; do node "$t"; done`.

## Modes and controls
- **Play mode:** full simulation, all tools, autosave through `lib.saveUserGameState`. The default tool is Inspect.
- **Edit mode:** simulation frozen. Sculpt terrain or regenerate the world; the result is written to `gameConfig.world` and becomes the play-mode start map.
- **One finger** pans the map with momentum. Tap uses the tool at that spot; hold still for about 0.25 s, then drag to paint. Two fingers also pan, the Hand tool pans immediately, and Inspect taps to inspect and drags to pan.
- **Zoom** with the zoom pill (or pinch). The minimum zoom is the whole map. Far out (tile under 5 px) the map draws dots instead of sprites.
- Destructive world actions (new world, clear, size change) need a second tap to confirm.
- Time controls: pause and a 1x / 3x / 8x speed button. Settings panel: Starting population, Character Size, Shipwreck Risk (%).

## The HUD
The HUD was redesigned in four stages (version 2.0). It shares the gold-and-navy look of the main menu.

- **Top bar (108 px):** time capsule (pause, speed), a status pill (weather, year, chronicle button) and a capsule with the Hand tool and sound.
- **Census strip:** population, kingdoms, houses and wars at a glance (plus plague when active). Numbers flash green or red and bump when they change. Tap it for the **Census** sheet (it names the season and year and scrolls): Civilizations, Wildlife, Life stages (adults, young, females, males), Sea life, Realm, Progress (highest age, techs known, buildings, wonders), Armies (knights, musketeers, heroes, warships) and Land (river and road tiles), each row with a comparison bar.
- **Zoom pill and minimap:** zoom sits on the right edge of the map. The minimap (top left) shows depth-shaded terrain with rivers and roads, kingdoms in race colours, ships, krakens and the current view; tap or drag to jump, and the corner button hides it.
- **Alert badges:** pulsing badges for wars, plague, a kraken and fresh eruptions; each shows a count and centres the camera on the event when tapped (tap again for the next one).
- **Dock (bottom):** a floating glass panel. A line above the tabs names the chosen tool with a one-line hint. Tabs are Terrain, Life, Powers, Realm and World. Tools sit in one scrollable row. The brush control shows a preview dot and dims when the tool ignores brush size. While an info sheet is open the dock shrinks to its tabs; tapping a tab closes the sheet.
- **Info sheet:** one shell for creature, kingdom, chronicle, market and seed panels: handle, header with close button, tabs. Tap the handle for half or full height, drag it down to dismiss.
- **Notifications:** small stacked toasts under the top bar (at most 3, colour-coded, repeats count up as x2, x3). Big banners announce eruptions, meteors, earthquakes, floods, wars, extinctions, fallen kingdoms and kraken events.
- **Icons:** the game shows no emoji. Strings use emoji as tokens; `EMOJI_ICON` maps each to a hand-drawn pixel icon (`ICON_ART`, creature portraits are cut from the sprite atlas) and a MutationObserver swaps them for images.
- Micro-animations: press squash, selection pop on tabs and tools, sliding tool name, counter flashes.

## Worlds and island seeds
- **Random worlds:** Small 120x148, Medium 200x246 (default), Large 240x296. Medium and Large use a multi-continent generator; population caps scale with size.
- **Terrain:** deep sea, shallow sea, sand, grass, forest, hills, mountains, snow, lava, burnt ground. Terrain is lit from the north-west, with relief, surf, wet sand and breathing lava. Mountains and snow-capped peaks use hand-made sprites, and each world has real volcanoes (one per ~17,000 tiles on big massifs) that smoke, erupt and leave lava.
- **Empty island seeds** (the island button in the World tab): terrain-only worlds with no creatures or houses; you found the first civilization yourself. Resources, volcanoes and weather work as usual.
  - **Indonesia (420x170, 8.5 tiles per degree):** 200+ islands (Kepulauan Seribu, Karimunjawa, Raja Ampat, Cenderawasih Bay, Maluku and Banda, Wakatobi, Komodo, Natuna and more), 16 lakes (Toba, Poso, Towuti, Sentani and others), about 30 volcano sites, and a small snow cap on the highest Papua peaks. The first, coarser Indonesia seed stays in the code but is hidden, so older saves of it still load.
  - **Japan** (Hokkaido to Kyushu with Fuji and Aso), **Caribbean**, **Hawaiian Chain** (tall shield volcanoes), **Aegean Isles**, **Coral Atolls** (sand rings around lagoons) and **Arctic Isles**.
  - Islands are described in lon/lat as polygons or ellipses with ridges, shelves and volcano sites (`PRESETS`, `genPreset`); presets can also set `lakes`, `ridgeK` and per-island `snowT`. Coasts are roughened with noise so every world differs a little. Presets are extra `SIZES` entries (index 3 and up), and `presetCamTile` picks the opening camera.
- **Ocean:** water is coloured by depth (distance to the nearest land, `shoreD`): turquoise shallows to a dark abyss, with a rolling swell, caustics over the shallows, glints, breakers rolling onto beaches and ripples and whitecaps up close. Storms make it rougher. Every animation loops on a sine table (`SN`).

## Civilization
- **Kingdoms:** houses of one race within 9 tiles form a kingdom with a generated name, a capital and a territory (toggle borders with the flag in the World tab). Each kingdom holds food, wood, stone, gold, bronze, iron and silver. Food limits births and famine kills; wood pays for houses. Kingdoms level up Tribe, Village, Town, Kingdom as population, houses and resources allow; the oldest member is crowned.
- **Houses and props:** one architectural style per race (human cottage, elf treehouse, dwarf stone hall, orc hide tent, werewolf moon lodge) with chimney smoke and lit windows at night. Every race has its own wall, corner tower, gate, well, field and granary art (`PROPS`). A wall ring with gates on all four sides surrounds the capital from level 2 (or with the human Walls tech).
- **Ages and technology (v3.0):** five ages: Stone, Bronze, Iron, Medieval and Gunpowder, each with a race-flavoured name (for example the human Feudal Age and Age of Sail and Powder, the dwarf Rune Age and Steam Age). Every race has a tree of 15 techs in three branches (Economy, Military, Lore) and five tiers; a tier needs the previous tier of its branch and enough age and kingdom level. Kingdoms earn **knowledge points** from population and houses (libraries, the academy, wonders and the Scholars decree multiply them), pay them with resources for each tech, and research on their own (a tier-1 tech takes 4 years, a tier-5 tech about 10, and the costs in knowledge points are 60, 200, 700, 2400 and 5000), leaning towards their race's favourite branch. Tap a branch in the kingdom's **Tech tree** panel to steer research. The sailing breakthrough is still the tier-3 Economy tech. The **Knowledge** power finishes the running research or grants the best available tech for free. Moving up an age needs the tier's techs, a level and a stock of metal; the metal requirement is waived when none exists within reach.
- **Resources:** ore nodes (stone, bronze, iron, silver, gold) sit on hills and mountains and slowly respawn. Dwarves mine twice as fast. Trees come in kinds (oak, pine, birch, fruit, palm) with different timber yield and race affinity.
- **Buildings and goods (v3.0):** a kingdom raises one of each building as its level and age allow, and the building appears near the capital. **Sawmill** (level 1) turns wood into planks, and a house costs one plank instead of four wood. **Bakery** (level 1) bakes surplus food into bread, which raises births by 25% and covers short famines. **Smithy** (level 2, Bronze Age) makes tools from spare metal or stone; tools speed up chopping and quarrying by 25% and wear out. **Library** (level 2, Bronze Age) multiplies knowledge by 1.3, the **Academy** (level 3, Medieval Age, needs a library) by 1.5, and the **Wonder** (Grand Cathedral, Moonwell Spire, Great Forge-Hall, Skull Citadel or Moon Obelisk) by 1.15 and calms unrest.
- **Rivers and roads (v3.5):** rivers are traced from the highlands to the sea (`traceRivers` in `landscape.js`): they are fords, so nobody is blocked; they add food to nearby kingdoms (+0.006 per river tile within about nine tiles) and stop fire. Every new house and building lays a footpath towards the capital (stopping at the first road), and very busy lines wear in too: a settler walking 150 times over a tile inside its own territory turns it into a road. Close up, roads are drawn as soft dirt paths that join their neighbours (`drawRoads`). Settlers and caravans walk one step faster on roads, and a kingdom earns a little gold from the roads in its land (capped at 40 tiles). Rivers and roads are saved (`rvr`, `rdr`); older saves regenerate their rivers.
- **Scenarios (v3.5):** the World tab lists five scenarios: First Light (Hawaiian Chain, a level-3 kingdom within 35 years), Age of Sail (Aegean Isles, four kingdoms within 200 years), Arctic Survival (Arctic Isles, 40 citizens within 70 years), Four Realms (random world, the Gunpowder Age within 140 years) and Long Peace (keep four races alive for 250 years). Progress shows at the top of the Goals tab; the result is announced by a banner and saved (`sc`).
- **Seasons and decrees (v3.0):** a year is 120 ticks and the seasons turn every year. Spring boosts food 10% and births 20%, summer food 15%, autumn food 30% and winter cuts food to 70% and births to 75%. The world takes a faint seasonal colour wash, and the year pill shows the season. In a kingdom panel the player can issue a **decree**: Harvest (food x1.5), Scholars (knowledge x2), Tax (gold x1.8) or Industry (wood and stone x1.4). Each lasts four years and then cools down.
- **Trade:** a world market prices food, wood, stone, bronze, iron and silver by world-wide stock. Kingdoms at peace send wagons to buy what they lack from a neighbour with a surplus (they pay up front; a lost wagon refunds). The Market board in the World tab shows prices with trend arrows, trades and the shop.
- **War and diplomacy (automatic):** aggression per race (orc high, human and dwarf low, elf very low, werewolves never declare war). Neighbours that are not at war sign **trade pacts** (friendly races and kin most often, orcs rarely): partners earn a little gold and send food or wood to each other in hard times. After about ten years a pact can become an **alliance** (allies also gain 10% knowledge each, up to three, and join each other's wars); pacts and alliances can break, and a greedy partner may betray a pact. A truce often turns into a pact when it runs out. With borders shown, green lines join allies and gold lines trade partners (`diplomacy.js`). Wars end when a side is beaten or from war weariness, followed by a truce. Soldiers (25 to 55% of a kingdom) march on the enemy capital; non-orcs capture adjacent houses, orcs raze and loot. The end of a war can collapse a kingdom or, very rarely, extinguish a race (`warOutcome`).
- **Walls are real barriers:** the ring blocks creatures of a kingdom at war with its owner; attackers detour to the nearest gate. Walls do not block in peace, for allies, neutral werewolves or wildlife.
- **Siege:** soldiers may hit a blocking wall (orc 70%, dwarf 40%, werewolf 30%, human 15%, elf 8% per blocked move). Wall segments take 60 damage and towers 120; broken segments leave rubble. **Defence:** intact corner towers shoot enemy soldiers in range; civilians repair damaged segments. **Engines:** orcs build battering rams, dwarves iron catapults and level-2 humans wooden catapults; they are real but temporary creatures.
- **Iron knights:** Iron Age kingdoms arm a few soldiers (+80% hp, +50% attack, +40% defence).
- **Musketeers and heroes (v3.0):** a Gunpowder Age level-3 kingdom can turn a soldier into a musketeer (2 iron and 40 gold, up to 6): range 4 and +35% attack. A soldier with 7 kills becomes a **hero** with a golden crest (up to 3 per kingdom). Both are saved.
- **Naval war (v3.0):** a Medieval Age level-2 coastal kingdom at war can launch a **warship** (40 wood, 15 iron, 20 gold; two in the Gunpowder Age). It sails a water route to an enemy coast, bombards houses within range, sinks enemy exploration ships and duels enemy warships, while shore batteries answer. It heads home after about 1100 ticks or when the war ends. Warships are not saved.
- **Events and realm powers:** plague, drought and golden age strike kingdoms. Unrest builds from famine, plague and long wars; at its peak a mature kingdom rebels and splits. Tiny kingdoms at peace are annexed by a bigger neighbour of their race. The Realm tab offers Grace, Plague, Rebellion, Peace, Unite, Split and Knowledge, acting once per touch.
- **Score and goals:** the Score button submits the **civilization score** (per kingdom: 2 x population + 3 x houses + 60 x level + 20 x techs + 80 x age + 15 x buildings, plus 120 for a wonder and half a point per bronze, iron or silver; then 25 per hero, 10 per musketeer, 40 per people with a kingdom, 300 for a won scenario, 2 per year and 3 per trade); higher is better. The Chronicle keeps the last 60 events, and 39 optional goals in eight groups (Civilization, Knowledge, Industry, Diplomacy, Military, The sea, Life and time, Pirates) are tracked in the Goals tab: population milestones, kingdom levels, ages, tech counts, wonders, roads, trade, decrees, pacts and alliances, unions, heroes and musketeers, warships, colonies, sharks, the kraken, births, wandering bands, years survived, scenarios, pirates and score. Each goal reached adds 50 score and shows a banner; progress is saved (`go`, `gs`).

## Individuals and equipment
- **Professions (v4.0):** every adult settler gets ONE lifelong profession from its kingdom, chosen once when they grow up and never changed: Farmer, Lumberjack, Miner, Hunter, Fisher, Gatherer, Builder, Soldier or Trader. The choice follows the people's liking for each trade (dwarves love the mine, elves forage, werewolves hunt), what the realm lacks (hunger makes farmers, an empty woodpile lumberjacks) and a 40% share cap per trade. Soldiers keep the old fixed share of each people and do random chores in peace. Practice earns **mastery** (Apprentice, Journeyman, Skilled, Expert, Master: +10% goods per level and 6% shorter work). Builders walk to the buildings of their realm and hammer them with a mallet (sparks, wood knocks), which raises the realm's labour and makes its next building up to 25% cheaper; traders wear a pack to the market square at the heart of the realm and haggle there, tossing a gold coin with a glint (each deal adds a little gold, more with mastery), on top of a steady income and a shorter trade-cart cooldown. The panel shows the profession (with an icon) and mastery, and the Census counts every profession. **Clothes:** each profession dresses its people in the same outfit on all five races, drawn over the race sprite (`outfits.js`): straw hat and overall straps (farmer), red plaid and wool cap (lumberjack), hard cap with a lamp and a leather vest (miner), green hood, strap and quiver (hunter), oilskin hat and blue vest (fisher), flower wreath, sash and basket (gatherer), orange hard hat, tool belt and hammer (builder), iron cap, breastplate and tabard (soldier), feathered cap, coin sash and pouch (trader). Every hat band, sash or tabard carries the race colour, so the people stay easy to tell apart. Leaders and iron knights keep their crowns and helmets. Old saves give their adults a profession on the first day.
- **Creature panel:** tap a creature to see a portrait, generated name, role (Citizen, Soldier, Leader, Iron knight, Hunter, Prey, Merchant, War machine), status, current activity, bars and tabs: Info, Family, Bag, Chest. A gold ring marks it; the target button follows it.
- **Traits:** 0 to 2 per creature (Brave, Sturdy, Swift, Long-lived, Frail, Gifted), inherited by children (50% per trait, 85% if both parents have it, plus a 12% mutation). Settlers keep a ten-line life history.
- **Equipment:** three slots (weapon, armour, shield) and three tiers that follow the kingdom's age, with race-specific items. Kingdoms arm their leader, knights and soldiers for wood, bronze or iron. Any race can use any item.
- **Bag, loot and chest:** a 12-slot universal bag; gear can lie on the ground and be picked up; the victor loots a fallen enemy; every kingdom keeps a royal chest (6 plus 4 per level slots). Items can be sold to the market (75% of their value) and bought from the shop.
- **Enchantments:** Flaming, Venomous, Vampiric, Storm (weapons); Thorned, Regenerating, Fireproof (armour); Warding, Guardian (shields). They come from crafting, loot and royal smiths. Enchantments live in `c.ec[slot]` (`c.en` is hunters' energy).
- **Unity and new islands (v3.5):** a people may hold a limited number of realms on one landmass, and the limit shrinks as the ages advance (`islandCap` in `diplomacy.js`): three in the Stone Age, two in the Bronze and Iron Ages, one from the Medieval Age on (two on a very large landmass). Villages are only founded next to an existing one or while the island is under its cap, a realm only builds houses within reach of its capital (8 tiles plus 3 per level), and when an island holds too many realms of one people the smallest joins the largest it is not at war with (`pickMerge`). Colony ships now head for islands where their people do not live yet, so a new village means a new island.
- **Harbors (v3.5):** a harbor is built only on land beside the open sea (lakes and ponds do not count) and its pier is drawn reaching out over the water.
- **Tidy towns (v3.5):** once a year trees, palms and loose stones are cleared from the tiles around every house and building (elves and werewolves keep their forests), new ore never appears inside a town, and houses that lack a path get one. Buildings are placed with a free tile around them, away from houses, walls and other buildings, and houses are not built on roads or right next to a building.
- **Wanderers (v3.5):** a people that is nearly gone (fewer than four left, and not erased by a war) is rescued every few years by a band of four adult wanderers (two of each sex) that settles far from other kingdoms. On the empty island seeds this only happens to peoples that were once there.
- **Animation and sound (v3.5):** children and young animals are drawn smaller (60% to 100% of adult size as they grow up) and a pixel heart floats up at each birth and new partnership. The production buildings animate in `landmarkLife`: a saw blade and sawdust, chimney smoke, forge glow with sparks, windows that light up at night, page flutters, a pulsing academy dome and the wonder's golden aura. Musketeers fire a `shot` effect (flash, ball, smoke) and ships and warships of the Medieval Age on fire a `cannon` effect with a heavier boom. `seasonFx` drifts petals (spring), fireflies at dusk (summer), leaves (autumn) and snow (winter) across the view. New sounds: saw, hammer, shot, cannon and birth, a chime when a building is finished, a fanfare for a new age, a horn when a warship sails, a short melody at each change of season, and birdsong on spring and summer days and crickets on warm nights.
- **Sexes and life stages (v3.5):** every creature is male or female (shown in its panel with its stage: newborn, young, adult or elder). A creature is an adult from 15% of its lifespan. **A birth needs a mature female and a mature male of the same kind close together**; peoples also need the pair to belong to the same kingdom, and the parents recorded are that couple (unmarried parents become partners). Sexes alternate when creatures are placed, so every group has both, a ship's crew always carries both sexes when it can, and the pack of wolves that evolves into werewolves is mixed. Placed creatures start as adults; newborns start at age 0.
- **Family:** settlers born in a house get two parents; spouses, children and parents are tracked and relatives are jump buttons.
- **Jobs:** non-leader settlers chop, mine, hunt, farm, fish or forage (soldiers only in peacetime), play the work animation and haul goods home.

## Pirates (v4.0)
- **A new, wicked kind of creature.** Pirates are not a fifth people. Rebels of restless kingdoms (humans, elves, dwarves and orcs; never werewolves) turn pirate: whatever their birth, they all belong to the one kind *Pirate*, with one uniform look (tricorn with a skull, eye patch, checkered shirt, red sash). Only the skin, pointed ears, beard or tusks tell which people they once belonged to, and the panel says so ("once a dwarf of Kazhold").
- **Born of chaos.** Every two seconds the world checks its kingdoms: one with a mature size (14+ settlers), unrest of 40% or more (hunger, plague, long wars) and a chance that grows with the unrest loses a crew of 3 to 5 adult rebels (soldiers first, never leaders, knights, heroes or musketeers, and a realm is never stripped bare). A mutiny banner and a chronicle line announce it, the realm calms a little, and at most one mutiny happens per 900 ticks, up to 24 living pirates.
- **A hideout on a small island.** The rebels hide on a small empty island (10 to 220 land tiles, no kingdom, house or other hideout on it, 12 to 110 tiles from their kingdom, around 30 preferred). A hideout is a black-flag tent with a barrel; there are at most two, and one that stays empty for 3000 ticks is abandoned. Pirates stay by it, never breed (only mutiny feeds them), fight any settler who comes close, and settlers who see them fight back. The first rebel of a band is its captain.
- **Raids.** Every two seconds a hideout with at least three idle pirates may send a ship (70 hp, black sails, a skull) with up to four of them. It picks one of the eight best coastal kingdoms within 120 tiles (richer and nearer is better) that it can reach by water in at most 220 steps, sails there, and plunders for up to 360 ticks: every 30 ticks it takes a little gold, food and wood, shells a house (12% to raze it) and wounds a settler on the shore. Soldiers near the coast and cannons (ages Iron and later) wear the ship down; at 20% hull it flees home. On the way it sinks any exploration or fishing ship within five tiles and fires at warships. A ship that returns with loot may bring a new recruit from any people (up to 24 pirates); a sunk ship takes its crew with it.
- **Kingdoms against pirates.** The raided kingdom and every ally and trade partner it has take note: partners send 6 gold (when they have 20 or more), and all of them may launch **hunter warships** (Iron Age or later, level 2) even with no war going. Hunters are faster than other ships, follow the nearest pirate ship wherever it goes, and sink it with their volleys.
- **Goals and score.** The Pirates goals group has six goals: watch a mutiny, a raid, an ally standing by a raided kingdom, sink a pirate ship, sink five, and see a hideout fall empty. Each pirate ship sunk adds 20 to the civilization score and each hideout that falls empty 60 (and every goal adds 50). The Census also counts pirate ships. Pirate ships are not saved (pirates aboard wait at their hideout on load); loot and the hideouts are (`pb` carries the loot).
- **Where to see them.** The Census has a Pirates group (pirates and hideouts) and the chronicle records mutinies and abandoned hideouts. Saves keep the hideouts and cooldown (`pb`, `pcd`) and each pirate's origin, former realm and rank (`pg`); the creature index 9 is the pirate.

## Wildlife and sea life
**Land:** sheep, rabbits and deer are prey (rabbits and deer flee). A mature female with a mature male within about ten tiles can give birth, then rests (sheep and deer about a year, rabbits less); breeding also slows as a kind nears its population cap (`ANIMAL_BREED` and `crowd` in `reproduction.js`). Without predators a kind needs roughly 8 to 12 years to fill the world, instead of the 1 to 4 years it took before; wolves hunt them and a small pack migrates in when wolves get scarce. When only two or three wolves remain they evolve into werewolves, a neutral, slow-growing civilization.

**Sea (version 2.0):**
- **Fish shoals** drift through the water: sardines near the shore, grouper on reefs, tuna in the deep (`SHOAL`). Shore fishers, fishing boats and sharks depend on them; catches deplete a shoal, overfishing scatters it, and it recovers slowly. Fishing without a nearby shoal gives almost nothing.
- **Sharks** (up to about 24) patrol the deep, chase ships and bite far-out fishers. They stalk shoals from about 3.6 tiles and never sit inside one; shoals flee from them.
- **The kraken** is a rare boss that the fleet fights, but never really beats (v3.0): every ship and warship within 7 tiles shoots at it (harpoons, then ballistae, then cannons), a wounded kraken lets go of its prey more often, and below half health it is driven off. It is only slain when a dying crew lands a last lucky shot (0.2% per lost ship), so the odds of killing it stay under 1% (about 0.2 to 0.5% for fleets of up to five ships; `simulateKraken` in `naval.js` models it and the tests check it). Otherwise it is a rare boss: it appears only when there is something at sea to menace, rises, hunts ships (45% plus 5% per risk point, up to 85% to sink one) and smashes harbors (-25 wood and a 3000-tick sailing delay). It has 320 health (Smite 40, lightning 110, meteor 200). The Kraken power summons it manually (always lethal to ships). With Shipwreck Risk 0 it never appears on its own.
- **Tools:** Fish and Shark in the Life tab; Kraken and Salvage in the Powers tab. Inspect any shoal, shark, kraken or wreck for a detail card.
- Sea life is saved (`sh`, `st`, `sk`, `skt`, `kr`, `krc`).

## Voyages and the sea economy
- **Era of Exploration:** a level-3 coastal kingdom in the Iron Age researches its fifth tech (Ocean Voyages, Star Navigation, Deep Keels, War Canoes or Moonwake Fleet). It builds a harbor, spends wood, gold and iron, boards three citizens and follows a water-only route to a distant empty shore, where the settlers found a new kingdom. If no empty shore is reachable the ship becomes a fishing boat.
- **Fishing boats** spear fish at their shoal (a bigger haul) and harpoon sharks that come within about 9 tiles (24 damage per throw). Killed sharks give 1 to 2 fins and 1 hide.
- **Fins and hide** are sold automatically at the market for gold (base 7 and 10). Selling pushes the price down 5% per item; it recovers over time (`sellCatch`, saved as `mf`).
- **Wrecks:** a ship lost to a storm, shark or kraken leaves a wreck (up to 30, saved as `wk`). After about 1500 ticks its kingdom may raise it for 15 wood; the **Salvage** power raises it at once. A raised ship sails home empty, the harbor is ready again and the kingdom gains 20 wood.
- **Shipwreck Risk** (0 to 10%, default 3) scales storm wrecks, shark attacks and natural kraken appearances; longer routes and active storms raise the risk. At 0 there are no wrecks.

## Disasters and weather
- **Natural disasters** (play mode, automatic): every ~10 s a check may schedule lightning (can start forest fires), a volcano eruption (smoke warning, then lava vent, streams and fires), a meteor (short warning), an earthquake (about a quarter of the houses near a 6+ house kingdom collapse) or a flood (the sea surges up to 6 tiles inland from a sandy coast, then recedes; flooded land is saved dry). Warnings show a dashed red ring. The disasters button in the World tab cycles Off, Rare (default, 1500-tick cooldown) and Frequent (600).
- **Day and night:** dusk, a starry night and dawn tint the world. **Weather** cycles clear, rain, storm and snow; rain and storms put out fires. Clouds drift and cast shadows.
- **Particles:** flames, smoke, embers, ash, sparks, debris and dust, with lightning branches, meteor impacts and quake cracks.

## Presentation: menu, sound, tour, popup
- **Loading screen and main menu:** a short loading screen, then a procedural pixel night scene (moon, stars, a volcano island with a lit village, a sailing ship, birds), the gold logo, race badges and a Play or Continue button with help, What's New and sound buttons.
- **What's New popup:** shown once per version right after loading (the version is stored in the save as `sv`); the sparkle button on the main menu reopens it, with a NEW badge until it has been seen.
- **Sound:** everything is synthesised with Web Audio (UI ticks, hits, thunder, explosions, horns, splashes, a kraken roar), with ambient beds for wind, rain and fire and a generative score that darkens at night and at war. Sound only plays for events in or near the view; the speaker button is saved (`sn`).
- **Tour:** a spotlight tour for first-time players (15 steps: tap, sexes and life stages, lifelong professions, kingdoms with the Tech tree and decrees, drag and paint, tool tabs, scenarios, tool row, zoom, minimap, time, sound, chronicle and season, pirates, census). It is remembered (`tu`) and can be replayed from the menu or the World tab.
- **Language:** all in-game text is English. Chronicle lines saved by older versions in Indonesian are translated when a save is loaded (`LEGACY_TEXT`).

## Save format
Save version 9 (v3.0) with optional fields (older saves load; missing parts are regenerated):

| Field | Content |
| --- | --- |
| `z`, `seed`, `tiles`, `bld`, `bk` | world size or preset, seed, RLE terrain, houses and their kingdoms |
| `kg`, `rl` | kingdom rows (resources, tech ids, events, unrest, age, chest, voyage cooldown, fins, hides, knowledge points, research focus, buildings, planks, bread, tools, decree) and relations; older saves stored a tech count and are migrated |
| `pf` | professions: [creature index, profession index, tasks done] |
| `pb`, `pcd`, `pg` | pirate hideouts [x, y, name], mutiny cooldown, pirates [creature index, origin people, persona, former realm, captain] |
| `cr`, `ex`, `el`, `gn`, `hr`, `fm`, `inv`, `dr` | creatures, personas, iron knights, musketeers, heroes, females, the bag and ground drops |
| `rs`, `ra`, `vc` | ore nodes and amounts, volcanoes |
| `mk`, `mt`, `mf` | market prices, trade count, fin and hide prices |
| `sf`, `wk` | ships and wrecks |
| `sh`, `st`, `sk`, `skt`, `kr`, `krc` | shoals, shark target, sharks, krakens and the kraken cooldown |
| `jl`, `go`, `gs`, `wf`, `xr` | chronicle, completed goals, goal counters, wars ended, extinct races |
| `rvr`, `rdr`, `sc` | river and road tile runs, the running scenario |
| `tick`, `bs`, `dl`, `sn`, `tu`, `sv` | clock, best score sent, disaster level, sound, tour seen, last seen version |

## Development notes
- `game.js` is one large module. Key entry points: `generate`/`genPreset` (worlds), `step` (simulation tick, 8 ticks per second, a year is 120 ticks), `draw`/`renderTerrain` (rendering), `updateStats` (HUD), `serialize`/`restore` (saves).
- Sea code lives together: `SHOAL`, `shoalTick`, `sharkTick`, `krakenTick`, `harpoon`, `sellCatch`, `raiseWreck`, plus `computeShoreD` for depth.
- `window.__world` exposes internals (kingdoms, ships, shoals, sharks, krakens, `step`, `serialize`, `restore`, `cam`, `applyTool` and more) for automated tests.
- Pure logic (`tech.js`, `buildings.js`, `naval.js`, `seasons.js` and the older modules) is kept in small modules with Node tests. Hand-drawn art is ASCII grids (`ICON_ART`) and generated sprites (`PROPS`, `ORE_SPR`, ship atlas).

## What's new in 4.0
**Rise of Empires, version 4.0**
- **Lifelong professions:** every adult gets one profession for life (Farmer, Lumberjack, Miner, Hunter, Fisher, Gatherer, Builder, Soldier or Trader), chosen by the people's taste, the realm's needs and a share cap. Mastery grows with practice; builders make the next building cheaper and traders bring gold from the market.
- **Clothes and animations:** an outfit for every profession on all five peoples (`outfits.js`), a builder's mallet and a trader's haggling with a tossed coin, profession icons in the creature panel and a Professions group in the Census.
- **Pirates:** a new wicked kind of creature born of restless kingdoms, with a uniform look, a hideout on a small empty island, ships that raid rich coasts, and kingdoms, allies and trade partners that send aid and hunter warships against them (`pirates.js`).
- **Goals and score:** 39 goals in eight groups (a Pirates group with six goals), and extra score for pirate ships sunk and hideouts emptied.
- Save format: still version 9, with the new optional fields `pf`, `pb`, `pcd` and `pg`; older saves load and their adults get a profession on the first day.

## What's new in 3.5
**Rise of Empires, version 3.5**
- 39 goals in eight groups, each worth +50 score.
- Rivers, roads that wear in where settlers walk, and five scenarios.
- A real life cycle: male and female creatures, adulthood, and births that need a pair; animals breed far more slowly; wanderers rescue a nearly extinct people.
- Livelier visuals and sound: smaller children and a heart for each birth, working buildings, gunpowder flashes and smoke, seasonal petals, fireflies, leaves and snow, and new sounds.
- A Census with life stages, progress, armies and land; a tour that covers the new systems; rivers and roads on the minimap; a new civilization score.
- A slower late game: research takes 4 to 10 years per tech and costs more at high tiers.
- Fewer, larger realms: one or two per island as the ages advance, new villages on new islands, and harbors on the real shore.
- Trade pacts and alliances that help in hard times, slightly fewer wars, and tidy towns joined by footpaths.

## What's new in 3.0
**Rise of Empires**
- Five ages and a branching tech tree (15 techs per race), with knowledge points and a Tech tree panel.
- Real buildings and goods chains: sawmill, bakery, smithy, library, academy and a wonder per race.
- Gunpowder musketeers, battle heroes and warships that fight naval wars.
- Ships that fight the kraken, with a slaying chance under 1%.
- Seasons that change food and births, and royal decrees.

## What's new in 2.0
**Living Seas**
- Fish shoals, sharks and the kraken, with tap-to-inspect cards and the Fish, Shark, Kraken and Salvage tools.
- Depth-shaded animated ocean with swell, caustics, breakers, ripples and whitecaps.
- Boats that spear fish and harpoon sharks, fins and hide sold at the market, and wrecks that can be salvaged.

**Islands:** seven empty island seeds, including a detailed Indonesia with 200+ islands, 16 lakes and about 30 volcanoes.

**Presentation and HUD:** the animated main menu, the What's New popup, and the four-stage HUD redesign (top bar, census, minimap, alerts, glass dock, unified sheets, toasts and banners).

**Also in this build:** weather, day and night, procedural sound and music, the guided tour; the creature panel with traits, equipment, family, bag, loot, enchantments, royal chest and item sales; resources and ages, trade caravans, iron knights, walls, sieges and engines; automatic disasters; pixel-art HUD icons, one-finger panning and a full English translation.
