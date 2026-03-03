/**
 * Triword Vocabulary — Internalized Canonical Wordlists
 * ═════════════════════════════════════════════════════
 *
 * The three canonical wordlists (Observer, Observable, Context)
 * are embedded directly here — zero external dependencies.
 *
 * Each list has exactly 256 entries. Index 0 is the genesis word.
 * Remaining 255 sorted alphabetically.
 *
 * Encoding space: 256³ = 16,777,216 unique triwords.
 *
 * @module hologram/platform/triword
 */

// ── OBSERVER (Dimension 1) — 256 nouns ────────────────────────────
// Beings and forces: creatures, plants, minerals, cosmic entities.
// Index 0 = "theos" (genesis kernel).
const OBSERVERS: readonly string[] = [
  "theos","acorn","alder","alpaca","amber","ant","ape","ash",
  "aspen","aster","aurora","badger","bass","bat","bear","beaver",
  "bee","berry","birch","bird","bison","bloom","boa","bobcat",
  "bone","bough","brook","bud","bull","bunting","calf","camel",
  "canary","caribou","carp","cat","cedar","cheetah","chick","child",
  "cicada","clam","cloud","clover","cobra","cod","colt","comet",
  "condor","copper","coral","cougar","cow","coyote","crab","crane",
  "cricket","crow","crystal","cub","cuckoo","cypress","dahlia","daisy",
  "dawn","deer","dew","doe","dolphin","dove","drake","dune",
  "dusk","dust","eagle","eel","egret","elder","elk","elm",
  "ember","ewe","falcon","fawn","feather","fern","ferret","fig",
  "finch","firefly","flint","flora","flower","foal","fog","fox",
  "frog","frost","gale","gazelle","gem","ginger","glow","goat",
  "goose","grove","gull","hare","hart","hawk","hazel","heart",
  "hedge","hen","heron","hive","holly","horse","hound","human",
  "ibis","iris","ivy","jay","juniper","kelp","kite","koala",
  "lamb","larch","lark","leaf","lemur","lichen","light","lily",
  "linden","lion","llama","lotus","lynx","magpie","mantis","maple",
  "mare","marten","meadow","minnow","mist","mole","moon","moose",
  "moss","moth","mouse","mule","myrtle","nest","nettle","newt",
  "oak","oat","olive","orca","orchid","oriole","osprey","otter",
  "owl","ox","oyster","palm","panda","panther","parrot","pearl",
  "pelican","penguin","petal","pine","plover","plume","pollen","pony",
  "poppy","puma","pup","quail","rabbit","rain","ram","raven",
  "ray","reed","robin","root","rose","rowan","rush","rye",
  "sage","salmon","sand","seal","seed","shadow","sheep","shell",
  "silk","snail","snake","snow","soul","sparrow","spider","spore",
  "sprout","stag","star","stork","stream","sun","swan","swift",
  "tern","thistle","thorn","thrush","tide","tiger","toad","tree",
  "trout","tulip","turtle","vapor","vine","violet","viper","vole",
  "walrus","wasp","wave","weasel","web","whale","whelk","willow",
  "wind","wolf","worm","wren","yak","yarrow","yew","zebra",
] as const;

// ── OBSERVABLE (Dimension 2) — 256 adjectives ─────────────────────
// Qualities: textures, temperatures, light states, movements.
// Index 0 = "logos" (genesis kernel).
const OBSERVABLES: readonly string[] = [
  "logos","aglow","alive","alpine","amber","ancient","aqua","arctic",
  "ardent","arid","ashen","astral","auburn","autumn","azure","bare",
  "basalt","bitter","blazing","bleak","bold","boreal","bound","brazen",
  "bright","brisk","broad","bronze","calm","carved","chaste","chill",
  "clear","close","clouded","coarse","cobalt","cold","cool","copper",
  "coral","cosmic","crisp","dappled","dark","dawning","deep","dense",
  "dewy","dim","distant","dormant","dry","dusky","earthen","eastern",
  "edged","elder","emerald","empty","endless","eroded","eternal","even",
  "fading","faint","fallen","far","feral","ferric","fertile","fierce",
  "fiery","fine","firm","first","fleet","floral","flowing","fluid",
  "foggy","forged","fossil","fragile","free","fresh","frigid","frozen",
  "full","fused","gentle","gilded","glacial","gleaming","golden","gnarled",
  "granite","great","green","grey","growing","hale","hardy","hazy",
  "heavy","hewn","hidden","high","hollow","honest","humble","hushed",
  "icy","immense","inborn","inland","inner","iron","ivory","jade",
  "keen","kind","known","laced","large","last","late","lean",
  "leafy","level","light","limber","liquid","living","lone","long",
  "lost","lucid","lunar","lush","major","marine","matte","meek",
  "mellow","mere","mild","mineral","minor","misty","molten","moonlit",
  "mossy","muted","narrow","native","near","neat","new","nimble",
  "noble","north","noted","novel","ochre","old","olive","only",
  "opal","open","outer","oval","own","pale","past","peak",
  "pearly","plain","pliant","polar","primal","prime","prior","proud",
  "pure","quaint","quick","quiet","radiant","rapid","rare","raw",
  "ready","real","rich","rigid","risen","robust","rooted","rough",
  "round","royal","rugged","rural","russet","rustic","safe","scarce",
  "serene","shaded","shared","sharp","sheer","short","silent","silken",
  "silver","simple","sleek","slim","slow","small","smooth","snowy",
  "solar","solid","south","spare","sparse","stable","stark","steady",
  "steep","still","strong","sunlit","supple","swift","tawny","tender",
  "thick","thin","tidal","twilit","vast","verdant","vernal","violet",
  "vital","vivid","warm","whole","wide","wild","woven","young",
] as const;

// ── CONTEXT (Dimension 3) — 256 nouns ─────────────────────────────
// Realms and habitats: landscapes, ocean depths, cosmic expanses.
// Index 0 = "sophia" (genesis kernel).
const CONTEXTS: readonly string[] = [
  "sophia","abyss","acre","alcove","alley","alpine","arbor","arcade",
  "arch","atoll","attic","bank","bar","barn","basin","bay",
  "bayou","beach","bench","bend","bluff","bog","border","bower",
  "bridge","brink","burrow","butte","cabin","cairn","camp","canal",
  "canopy","canyon","cape","castle","cavern","cave","cellar","channel",
  "chase","chasm","circle","cirque","city","clearing","cliff","close",
  "coast","colony","common","copse","corner","corral","cosmos","court",
  "cove","cradle","crag","creek","crest","croft","cross","current",
  "dale","deck","dell","delta","den","depths","depot","desert",
  "ditch","dock","domain","downs","draw","drift","drive","dune",
  "earth","east","edge","estuary","expanse","falls","farm","fen",
  "fence","ferry","field","fjord","flat","flats","fold","ford",
  "forest","forge","forum","fringe","garden","gap","gate","glade",
  "glen","gorge","grange","gravel","green","grotto","grove","gulch",
  "gully","hamlet","harbor","haven","hearth","heath","height","helm",
  "highland","hill","hold","hollow","holt","horizon","house","hub",
  "inlet","island","isle","jetty","keep","knob","knoll","lagoon",
  "lake","landing","lane","lawn","lea","ledge","level","loch",
  "lodge","loft","lowland","manor","margin","market","marsh","meadow",
  "mere","mesa","mill","moor","mount","narrows","niche","nook",
  "north","notch","oasis","orbit","outcrop","outlet","palace","parish",
  "park","pass","patch","patio","peak","perch","pier","pitch",
  "plain","plinth","plaza","point","pool","porch","portal","port",
  "post","prairie","quarry","quay","ranch","range","rapids","ravine",
  "reach","reef","ridge","ring","rise","river","road","rock",
  "room","route","row","ruins","run","saddle","savanna","school",
  "shelf","shelter","shore","sierra","sky","slope","sound","south",
  "span","spring","spur","square","stand","station","steppe","strait",
  "strand","summit","swamp","terrace","thicket","tier","tower","trail",
  "trench","tundra","tunnel","vale","valley","vault","verge","villa",
  "village","vista","walk","ward","wash","watch","water","well",
  "west","wharf","wild","wing","wood","works","yard","zone",
] as const;

// ── Public API ────────────────────────────────────────────────────

export type TriwordDimension = "observer" | "observable" | "context";

/**
 * Get the wordlist for a specific dimension.
 */
export function getWordlist(dimension: TriwordDimension): readonly string[] {
  switch (dimension) {
    case "observer":   return OBSERVERS;
    case "observable": return OBSERVABLES;
    case "context":    return CONTEXTS;
  }
}
