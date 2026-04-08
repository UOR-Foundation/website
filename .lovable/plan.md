

## Triword Vocabulary Refresh — Unified Ecosystem Words

### Goal
Replace all three 256-word lists (OBSERVERS, OBSERVABLES, CONTEXTS) with new vocabularies that are:
- Balanced equally across 5 domains: **humans, nature, animals & plants, space, ocean & fish**
- Super simple (a 10-year-old knows every word), easy to spell, easy to pronounce
- Delightful, crisp, and shareable as addresses like "Moon · Bright · Reef"

### Vocabulary Design

Each list has 256 slots. Slot 0 is reserved for the genesis kernel (theos/logos/sophia). The remaining 255 are distributed across 5 domains (~51 words each), sorted alphabetically within each domain.

**OBSERVERS (Dimension 1 — "Who/What")** — Beings, entities, forces:
- **Humans** (~51): baby, baker, boy, bride, chief, child, coach, cook, cousin, dad, dancer, doctor, diver, drummer, elder, farmer, friend, girl, guard, guide, healer, hero, human, hunter, king, knight, lady, maker, mama, mentor, miner, mom, nurse, padre, painter, papa, pilot, poet, prince, queen, rider, sage, sailor, scout, singer, sister, smith, soul, teacher, twin, woman
- **Animals & Plants** (~51): ant, bass, bear, bee, bird, bud, bull, cat, calf, cobra, colt, crab, crow, deer, dog, dove, duck, eagle, elk, fawn, finch, fish, fox, frog, goat, goose, hawk, hen, horse, lamb, lark, leaf, lion, moth, mouse, oak, orchid, otter, owl, palm, panda, pine, pony, pup, robin, rose, seal, shark, swan, whale, wolf
- **Nature** (~51): ash, bloom, breeze, brook, clay, cliff, cloud, coral, creek, dew, dune, dust, ember, fern, flame, flood, flower, fog, frost, gale, gem, grove, hail, heat, hill, ice, ivy, lake, leaf, light, marsh, mist, moon, moss, rain, reef, ridge, river, rock, root, sand, seed, shade, shell, snow, spring, stone, storm, stream, sun, vine, wave, wind
- **Space** (~51): comet, cosmos, crater, dawn, dusk, earth, eclipse, flare, galaxy, glow, mars, meteor, nebula, night, north, nova, orbit, planet, plasma, pluto, pulse, quasar, ray, ring, rocket, saturn, sky, solar, south, star, stellar, sun, twilight, uranus, venus, void, west, east, zenith
- **Ocean & Fish** (~51): anchovy, clam, cod, conch, coral, crab, current, delta, depth, dolphin, drift, eel, estuary, fin, flounder, foam, gulf, guppy, harbor, inlet, jelly, kelp, krill, lagoon, lobster, marlin, mussel, narwhal, oyster, pearl, perch, pike, plankton, reef, salmon, sardine, scallop, seahorse, shrimp, snail, sponge, squid, starfish, stingray, surf, tide, trout, tuna, turtle, urchin, walrus

**OBSERVABLES (Dimension 2 — "How/What quality")** — Simple adjectives balanced across domains:
- **Human qualities**: bold, brave, calm, clever, fair, fast, free, gentle, glad, good, grand, great, happy, honest, humble, keen, kind, loyal, merry, noble, patient, proud, pure, quick, quiet, ready, safe, simple, smart, steady, strong, sure, sweet, tender, true, warm, wise, young
- **Nature qualities**: arid, bare, bitter, blazing, bright, brisk, broad, clear, cold, cool, crisp, dark, deep, dense, dewy, dim, dry, dusky, earthy, fallen, faint, fierce, fine, flat, foggy, fresh, frigid, frozen, full, green, hardy, hazy, heavy, high, hot, hushed, icy, lush, mild, misty, mossy, pale, raw, rich, rough, rugged, serene, sharp, sheer, silent, sleek, slim, slow, smooth, snowy, soft, steep, still, stormy, sunny, thick, thin, vast, vivid, wet, wide, wild
- **Space qualities**: aglow, astral, cosmic, distant, endless, eternal, far, giant, lunar, massive, radiant, solar, stellar
- **Ocean qualities**: aqua, azure, briny, coral, fluid, marine, pearly, salty, tidal, wavy

**CONTEXTS (Dimension 3 — "Where")** — Places and habitats:
- **Human places**: barn, bridge, cabin, camp, castle, chapel, city, court, dock, farm, fence, forge, fort, garden, gate, hall, harbor, hearth, home, house, hut, inn, lane, lodge, manor, market, mill, palace, park, path, pier, plaza, port, ranch, road, room, school, shop, square, station, street, tower, trail, village, wall, ward, well, yard
- **Nature places**: bank, basin, bay, beach, bend, bluff, bog, cape, canyon, cave, clearing, cliff, coast, copse, cove, creek, crest, dale, dell, delta, desert, dune, edge, falls, fen, field, fjord, flat, forest, glade, glen, gorge, grove, heath, highland, hill, hollow, island, knoll, lake, ledge, lowland, marsh, meadow, mesa, moor, mount, oasis, pass, peak, plain, pond, prairie, quarry, range, ravine, ridge, river, rock, savanna, shore, slope, spring, steppe, summit, swamp, terrace, thicket, tundra, vale, valley, volcano, wood
- **Space places**: cosmos, crater, eclipse, galaxy, nebula, north, orbit, ring, sky, south, star, sun, void, west, east, zenith, horizon
- **Ocean places**: abyss, atoll, channel, coral, current, deep, depth, drift, estuary, gulf, inlet, isle, lagoon, narrows, pool, reef, sea, shelf, shoal, shore, sound, strait, surf, tide, trench, wake, wharf

### Implementation

**Single file change**: `src/lib/uor-triword.ts`

1. Replace the `OBSERVERS` array (lines 166–199) with the new 256-entry list
2. Replace the `OBSERVABLES` array (lines 207–240) with the new 256-entry list
3. Replace the `CONTEXTS` array (lines 248–281) with the new 256-entry list
4. Update the `TRIWORD_GENESIS` description (lines 86–157) to reflect the unified ecosystem theme
5. Ensure all three lists have exactly 256 unique entries, slot 0 = genesis kernel, rest sorted alphabetically

The genesis verification will automatically re-derive a new canonical hash on next load. All existing triword references will change (expected — this is a vocabulary update), but the system remains structurally sound.

### Result

Addresses become things like:
- **"Dove · Bright · Reef"**
- **"Moon · Gentle · Meadow"**
- **"Dolphin · Warm · Forest"**
- **"Star · Clear · Harbor"**

Simple, beautiful, shareable, and spanning a unified picture of all ecosystems.

