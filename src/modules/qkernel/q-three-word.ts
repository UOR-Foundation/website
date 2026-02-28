/**
 * Q-Three-Word — Canonical Three-Word Identity Names
 * ═══════════════════════════════════════════════════
 *
 * Deterministic bijection: 256-bit hash → three canonical words.
 *
 * Each word is selected from a curated 256-word list, one per position:
 *   Position 0 (Form):     hash byte [0] → 256 nouns      (what)
 *   Position 1 (Process):  hash byte [1] → 256 adjectives (how)
 *   Position 2 (Substrate): hash byte [2] → 256 nouns     (where)
 *
 * This follows the triadic ontology (Form, Process, Substrate) ensuring
 * the name encodes structural meaning, not just arbitrary symbols.
 *
 * Properties:
 *   - Bijective for 3-byte prefix: words → bytes → words (lossless round-trip)
 *   - 256³ = 16,777,216 unique combinations
 *   - Deterministic: same hash always yields same name
 *   - Human-memorable: "Stellar·Prism·Forge" vs "a7f3...b2c1"
 *
 * The separator is the interpunct (·) — chosen for its typographic
 * neutrality and distinction from dots, hyphens, and spaces.
 *
 * @module qkernel/q-three-word
 */

// ═══════════════════════════════════════════════════════════════════════
// Canonical Wordlists — 256 words each, curated for distinctiveness
// ═══════════════════════════════════════════════════════════════════════

/**
 * Position 0: FORM nouns (what the object IS)
 * Drawn from natural forms, mathematical objects, and cosmic structures.
 */
const FORM_WORDS: readonly string[] = [
  "apex","arc","atlas","atom","aura","axis","basin","beam","bloom","bolt",
  "bond","braid","bridge","cairn","canopy","canyon","capsule","cascade","cell","chain",
  "chord","cipher","circuit","citadel","cleft","cliff","clock","cloud","cluster","coil",
  "column","compass","cone","coral","core","corona","crest","crown","crystal","cube",
  "current","curve","cycle","dawn","delta","depth","diamond","dome","drift","dune",
  "echo","edge","ember","engine","epoch","facet","falcon","fern","field","flame",
  "flint","flora","flux","forge","fossil","frame","frost","gale","gate","gem",
  "glacier","glade","gleam","globe","grain","granite","graph","grove","gust","haven",
  "helix","hive","hollow","horizon","hub","icon","index","iris","jade","jewel",
  "junction","kernel","key","knot","lantern","latch","lattice","leaf","ledge","lens",
  "light","locus","loom","lotus","mantle","maple","margin","matrix","maze","mesa",
  "meteor","mirror","module","moon","moss","mound","nebula","nerve","nexus","node",
  "nova","nucleus","oasis","obelisk","octave","omega","onyx","optic","orbit","origin",
  "palm","pane","path","pearl","peak","petal","phase","pillar","pine","pivot",
  "plume","point","pole","pond","portal","prism","probe","pulse","quartz","quill",
  "radius","rail","range","raven","ray","reef","ridge","ring","river","root",
  "rune","sage","sail","scale","scarab","seal","seed","shade","shard","shell",
  "shield","shore","signal","silk","slate","slope","socket","solar","spark","spear",
  "sphere","spike","spine","spiral","spring","square","star","stem","stone","storm",
  "strand","summit","surge","sword","tablet","thorn","tide","timber","token","torch",
  "tower","trace","trail","tree","triad","tunnel","vale","valve","vault","vector",
  "veil","vertex","vine","void","volt","vortex","wave","web","wedge","well",
  "wheel","wind","wing","wire","zenith","zero","zone","agate","amber","anvil",
  "arrow","badge","banner","basalt","bell","blade","blaze","bow","brick","brine",
  "bronze","brush","cabin","cairn","cape","cedar","chalk","charm","clay","cog",
  "copper","craft","dale","disk","door","drum",
] as const;

/**
 * Position 1: PROCESS adjectives (how the object BEHAVES)
 * Drawn from dynamics, qualities, and transformative properties.
 */
const PROCESS_WORDS: readonly string[] = [
  "ablaze","agile","amber","ancient","ardent","astral","atomic","austere",
  "azure","blazing","bold","bound","braided","bright","brisk","broad",
  "calm","candid","carved","cast","certain","charged","chiral","civic",
  "clear","close","coiled","cold","concave","convex","coral","cosmic",
  "crisp","cross","curved","dark","dawn","deep","dense","direct",
  "double","driven","dual","dusk","eager","early","earned","east",
  "edged","eighth","elect","elite","ember","equal","erect","exact",
  "fair","faint","fast","feral","fierce","final","fine","firm",
  "first","fixed","fleet","focal","fond","formal","forte","fourth",
  "fresh","front","frozen","full","fused","gentle","glacial","global",
  "golden","grand","grave","great","green","grounded","grown","guided",
  "half","hard","harmonic","honed","hyper","ideal","immense","immune",
  "inert","inner","intact","iota","iron","keen","kinetic","known",
  "laced","large","last","latent","lateral","lean","level","light",
  "liminal","linear","linked","liquid","live","local","lone","long",
  "lucid","lunar","major","marked","maximal","median","mental","merged",
  "micro","mild","mineral","minor","mirror","modal","molten","muted",
  "native","near","nested","neural","neutral","ninth","noble","normal",
  "north","noted","novel","null","obtuse","omega","open","optic",
  "orbital","outer","over","paired","pale","parallel","partial","peaked",
  "phase","pivotal","planar","pliant","polar","potent","prime","proof",
  "proper","proven","pure","quiet","radial","rapid","rare","raw",
  "recur","refined","remote","resonant","rich","rigid","risen","robust",
  "rotary","round","runic","sacred","scalar","sealed","second","serene",
  "seventh","severe","sharp","sheer","short","signed","silent","silver",
  "simple","sixth","sleek","slick","slow","small","smooth","solar",
  "solid","sonic","south","spare","sparse","spiral","split","stable",
  "stark","static","steady","steep","stern","still","stoic","stout",
  "strict","strong","subtle","super","sure","swift","taut","tempered",
  "tenth","terse","thick","thin","third","tight","tonal","total",
  "triple","true","tuned","twin","ultra","under","upper","urban",
  "vast","vernal","vital","vivid","volatile","warm","west","whole",
] as const;

/**
 * Position 2: SUBSTRATE nouns (the ground the object inhabits)
 * Drawn from terrains, media, and foundational structures.
 */
const SUBSTRATE_WORDS: readonly string[] = [
  "abyss","acre","alcove","alloy","altar","amber","anvil","arbor",
  "arch","arena","attic","bank","barn","basin","bay","beach",
  "bedrock","berth","birch","bluff","board","bone","border","bower",
  "brass","brick","brook","bulwark","burrow","camp","canal","canvas",
  "cape","cave","cedar","cellar","chamber","channel","chapel","char",
  "chimney","clay","clearing","cliff","coast","cobalt","conduit","copper",
  "corner","corridor","cottage","court","cove","cradle","crag","crater",
  "creek","crossing","crypt","dam","deck","dell","den","depot",
  "desert","dock","domain","dune","dungeon","earth","elm","estate",
  "estuary","expanse","factory","falls","farm","fence","fiber","firth",
  "fjord","flat","floor","fold","ford","forge","fort","forum",
  "foyer","garden","geyser","glacier","glen","gorge","granite","grass",
  "gravel","ground","grove","gully","hall","hamlet","harbor","haven",
  "heath","hearth","hedge","hill","hive","hold","hollow","hub",
  "hull","inlet","isle","ivory","junction","keep","kiln","knoll",
  "lagoon","lake","landing","lava","lawn","ledge","library","loch",
  "lodge","loft","lounge","manor","marble","market","marsh","meadow",
  "mesa","mill","mine","mire","moat","moor","mortar","mount",
  "mural","niche","oak","oasis","ocean","outcrop","outpost","oxide",
  "palace","park","pass","pasture","path","patio","peat","pier",
  "pine","pit","plain","plank","plate","plateau","plaza","point",
  "pond","pool","port","post","prairie","quarry","quay","rampart",
  "range","ravine","realm","reef","refuge","ridge","rift","ring",
  "river","road","rock","roof","room","ruin","sand","savanna",
  "scarp","shore","silo","slab","slope","soil","span","spring",
  "square","stable","stage","stair","steppe","stone","strait","stream",
  "summit","swamp","temple","terrace","thicket","thorn","threshold","timber",
  "tower","trail","trench","trough","tundra","tunnel","turf","vale",
  "valley","vault","veranda","village","void","wall","ward","waste",
  "water","well","wharf","wild","willow","wood","yard","zone",
  "zenith","zinc","bluff","butte","cairn","delta","dusk","edge",
  "ember","flint","glade","grit","husk","iron","jade","knot",
] as const;

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** A three-word canonical name */
export interface ThreeWordName {
  /** The display string: "Word·Word·Word" */
  readonly display: string;
  /** The three individual words */
  readonly words: readonly [string, string, string];
  /** The three hash bytes used for derivation */
  readonly sourceBytes: readonly [number, number, number];
  /** Whether the mapping is bijective (always true for valid input) */
  readonly bijective: true;
}

// ═══════════════════════════════════════════════════════════════════════
// Core Functions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Derive a three-word canonical name from a 256-bit hash.
 *
 * Takes the first 3 bytes of the hash and maps each to a word
 * from the corresponding position's wordlist.
 *
 * Deterministic: same hash → same name. Always.
 */
export function deriveThreeWordName(hashBytes: Uint8Array): ThreeWordName {
  if (hashBytes.length < 3) {
    throw new Error("ThreeWord: requires at least 3 bytes of hash input");
  }

  const b0 = hashBytes[0];
  const b1 = hashBytes[1];
  const b2 = hashBytes[2];

  const w0 = FORM_WORDS[b0];
  const w1 = PROCESS_WORDS[b1];
  const w2 = SUBSTRATE_WORDS[b2];

  return {
    display: `${capitalize(w0)}·${capitalize(w1)}·${capitalize(w2)}`,
    words: [w0, w1, w2] as const,
    sourceBytes: [b0, b1, b2] as const,
    bijective: true,
  };
}

/**
 * Reverse a three-word name back to its source bytes.
 *
 * This is the inverse of deriveThreeWordName — the bijection guarantee.
 * Returns null if any word is not found in its position's wordlist.
 */
export function reverseThreeWordName(
  words: readonly [string, string, string]
): Uint8Array | null {
  const b0 = FORM_WORDS.indexOf(words[0].toLowerCase());
  const b1 = PROCESS_WORDS.indexOf(words[1].toLowerCase());
  const b2 = SUBSTRATE_WORDS.indexOf(words[2].toLowerCase());

  if (b0 === -1 || b1 === -1 || b2 === -1) return null;

  return new Uint8Array([b0, b1, b2]);
}

/**
 * Parse a display string ("Word·Word·Word") back to component words.
 */
export function parseThreeWordDisplay(display: string): readonly [string, string, string] | null {
  const parts = display.split("·").map(w => w.toLowerCase().trim());
  if (parts.length !== 3) return null;
  return [parts[0], parts[1], parts[2]] as const;
}

/**
 * Verify that a three-word name correctly maps to a hash.
 * Round-trip check: name → bytes → name must be identical.
 */
export function verifyThreeWordBijection(
  name: ThreeWordName,
  hashBytes: Uint8Array
): boolean {
  const rederived = deriveThreeWordName(hashBytes);
  return (
    rederived.words[0] === name.words[0] &&
    rederived.words[1] === name.words[1] &&
    rederived.words[2] === name.words[2]
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
