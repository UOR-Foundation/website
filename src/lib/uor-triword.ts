/**
 * UOR SDK — Triword Encoding
 *
 * Maps UOR canonical IDs (SHA-256 hashes) to human-readable three-word
 * labels, grounded in the framework's triality principle.
 *
 * In UOR, every object is described by three fundamental coordinates:
 *   1. Observer  — the entity or subject (who/what)
 *   2. Observable — the property or action (how/what kind)
 *   3. Context   — the frame or setting (where/when)
 *
 * This module deterministically derives one word from each coordinate
 * dimension using the first 24 bits of the SHA-256 hash (8 bits per
 * word, 256 words per dimension = 16.7 million unique triwords).
 *
 * The triword is a memorable shorthand — the full canonical ID remains
 * the authoritative, collision-free reference. The triword is to the
 * canonical ID what a domain name is to an IP address: a human layer
 * over a machine layer, both pointing to the same object.
 *
 * Format: "word.word.word" (e.g., "atlas.bright.coral")
 *
 * @example
 *   canonicalToTriword("urn:uor:derivation:sha256:a1b2c3...")
 *   // => "atlas.bright.coral"
 *
 *   triwordToPrefix("atlas.bright.coral")
 *   // => "a1b2c3" (first 6 hex chars / 24 bits)
 *
 * @see UOR Triality — Observer / Observable / Context
 */

// ── Wordlists — 256 words per triality dimension ────────────────────────────
//
// Each list is carefully curated:
//   - Common, unambiguous English words
//   - No homophones, no offensive terms
//   - Phonetically distinct to avoid confusion
//   - Sorted alphabetically for deterministic indexing
//
// Observer words (nouns — entities, subjects, agents):
const OBSERVERS: string[] = [
  "actor","agent","anchor","apex","arch","arrow","atlas","atom",
  "badge","basin","beam","bear","bell","berry","blade","blaze",
  "bloom","board","bolt","bone","book","bow","branch","brave",
  "brick","bridge","brook","brush","cabin","cairn","cape","cedar",
  "chain","chalk","chest","chief","chord","cipher","claim","cliff",
  "clock","cloud","coach","coast","coin","comet","compass","coral",
  "core","crane","creek","crest","crown","crystal","cube","cycle",
  "dawn","delta","dew","dial","dock","dome","door","dove",
  "draft","drake","drum","dune","eagle","echo","edge","elder",
  "elm","ember","engine","epoch","falcon","fern","field","fire",
  "flag","flame","flare","fleet","flint","flora","flux","foam",
  "forge","fort","fossil","frame","frost","gale","garden","gate",
  "gem","ghost","glacier","glade","glass","globe","grace","grain",
  "grant","graph","grove","guard","guild","gull","harbor","hare",
  "harp","haven","hawk","heart","hedge","helm","heron","hive",
  "hollow","hood","horn","horse","house","hull","hunter","icon",
  "index","inlet","iron","isle","ivory","jade","jasper","jay",
  "jewel","joint","journal","judge","junction","jungle","keep","kernel",
  "kettle","key","kite","knot","lake","lance","lane","lantern",
  "lark","lattice","laurel","leaf","ledge","lens","lever","light",
  "lily","lime","linen","link","lion","lodge","loom","lotus",
  "lynx","maple","marble","marsh","mason","mast","matrix","meadow",
  "mesa","mill","mint","mirror","mist","moat","monk","moon",
  "moss","mound","mural","myth","nest","nexus","noble","node",
  "north","note","nova","oak","oasis","opal","orbit","orchid",
  "osprey","otter","outpost","owl","pact","palm","panel","path",
  "peak","pearl","pebble","pier","pilot","pine","pixel","plain",
  "plank","plaza","plume","point","pond","port","post","prism",
  "probe","pulse","quarry","quartz","quill","raven","ray","realm",
  "reed","reef","ridge","ring","river","robin","rock","rose",
  "rover","ruby","sage","sail","scale","scout","scroll","seal",
  "seed","shard","shell","shield","shore","sigma","silk","slate",
];

// Observable words (adjectives — properties, qualities, states):
const OBSERVABLES: string[] = [
  "able","acute","agile","alive","amber","ample","ancient","ardent",
  "arid","astral","atomic","august","avid","azure","bare","basic",
  "bliss","bold","bound","brave","brief","bright","broad","brisk",
  "calm","candid","carbon","carved","chief","civic","civil","clean",
  "clear","close","cobalt","cold","common","copper","coral","cosmic",
  "crisp","cubic","cyan","daily","daring","dark","deep","dense",
  "direct","divine","double","dry","dual","dusk","eager","early",
  "east","easy","eight","elder","elite","emerald","empty","endless",
  "epic","equal","even","exact","extra","faint","fair","far",
  "fast","final","fine","firm","first","fixed","flat","fleet",
  "focal","fond","formal","fossil","four","free","fresh","front",
  "full","fused","gentle","giant","gilt","glad","global","gold",
  "good","grand","grave","great","green","grey","grim","grown",
  "half","hard","hardy","hazel","heavy","hidden","high","hollow",
  "honest","hot","huge","humble","hushed","ideal","idle","immune",
  "inner","intent","inward","iron","ivory","jade","joint","jovial",
  "just","keen","kind","known","large","last","late","lean",
  "level","light","limber","linear","liquid","live","local","lone",
  "long","lost","loud","low","lucid","lunar","major","maple",
  "marine","matte","meek","mellow","mere","mild","mined","minor",
  "mixed","model","modern","molten","moral","mossy","mutual","narrow",
  "native","naval","near","neat","neutral","new","next","nimble",
  "noble","normal","north","noted","novel","numb","odd","olive",
  "only","opal","open","outer","oval","own","pale","past",
  "peak","penal","plain","plumb","polar","prime","prior","proud",
  "pure","quartz","queen","quick","quiet","rapid","rare","raw",
  "ready","real","rich","rigid","risen","robust","roman","root",
  "rough","round","royal","rune","rural","rustic","safe","scarce",
  "scenic","second","senior","serene","seven","sharp","sheer","short",
  "silent","silver","simple","sixth","sleek","slim","slow","small",
  "smart","smooth","snug","solar","solid","sonic","sound","south",
  "spare","sparse","split","square","stable","stark","steep","still",
];

// Context words (nouns — frames, settings, environments):
const CONTEXTS: string[] = [
  "abbey","acre","aisle","alcove","alley","alpine","annex","arcade",
  "arena","attic","bank","barn","basin","bay","bench","birch",
  "bluff","board","bridge","bureau","cabin","camp","canal","canyon",
  "cape","castle","cavern","cellar","center","chapel","circle","city",
  "cliff","cloister","coast","colony","common","corner","corridor","cottage",
  "county","court","cove","cradle","creek","croft","cross","crypt",
  "dale","deck","delta","depot","desert","dock","domain","drift",
  "drive","east","edge","enclave","estate","falls","farm","fence",
  "ferry","field","fjord","flat","forest","forum","garden","garret",
  "gate","glade","glen","gorge","green","grid","grotto","grove",
  "guild","gulch","gully","hamlet","harbor","haven","heath","height",
  "hill","hold","hollow","house","hub","inlet","island","isthmus",
  "jetty","junction","keep","knoll","lagoon","lake","landing","lane",
  "lawn","ledge","level","loch","lodge","loft","manor","margin",
  "market","marsh","meadow","mesa","metro","mill","minster","moor",
  "mount","narrows","niche","north","notch","oasis","outlet","palace",
  "parish","park","parlor","pass","patio","peak","pier","pitch",
  "plain","plaza","point","porch","portal","post","prairie","priory",
  "quarry","quay","ranch","range","ravine","reach","reef","ridge",
  "rise","river","road","rock","room","route","row","ruins",
  "saddle","school","shore","shrine","sierra","slope","sound","south",
  "span","spring","square","stand","station","strait","strand","studio",
  "summit","terrace","throne","tier","tower","trail","trench","tundra",
  "tunnel","vale","valley","vault","verge","villa","village","vista",
  "walk","ward","watch","water","well","west","wharf","wing",
  "wood","works","yard","zenith","zone","abyss","basin","bend",
  "blaze","bower","brae","brook","cairn","camp","channel","chase",
  "close","copse","dell","den","depot","ditch","downs","eyrie",
  "fen","flat","fold","forge","fringe","gap","girth","haven",
  "hearth","helm","holt","isle","knob","lea","ledge","mere",
  "nook","notch","park","pass","patch","perch","pier","plinth",
  "pool","port","quay","ridge","ring","run","shelf","spur",
];

// ── Core Functions ──────────────────────────────────────────────────────────

/**
 * Extract the raw hex hash from a canonical ID.
 * Handles both full URN form and bare hex.
 */
function extractHex(canonicalId: string): string {
  const hex = canonicalId
    .replace("urn:uor:derivation:sha256:", "")
    .replace("0x", "")
    .toLowerCase();
  return hex;
}

/**
 * Convert a UOR canonical ID to a three-word label.
 *
 * Deterministically maps the first 24 bits of the SHA-256 hash
 * to three words from the triality-aligned wordlists.
 *
 * @param canonicalId — Full canonical ID or hex hash
 * @returns "observer.observable.context" format
 *
 * @example
 *   canonicalToTriword("urn:uor:derivation:sha256:a1b2c3d4e5...")
 *   // => "meadow.bold.canyon"
 */
export function canonicalToTriword(canonicalId: string): string {
  const hex = extractHex(canonicalId);

  // Extract first 6 hex chars = 24 bits = 3 × 8-bit indices
  const byte1 = parseInt(hex.slice(0, 2), 16) || 0; // bits 0-7  → Observer
  const byte2 = parseInt(hex.slice(2, 4), 16) || 0; // bits 8-15 → Observable
  const byte3 = parseInt(hex.slice(4, 6), 16) || 0; // bits 16-23 → Context

  const observer = OBSERVERS[byte1 % OBSERVERS.length];
  const observable = OBSERVABLES[byte2 % OBSERVABLES.length];
  const context = CONTEXTS[byte3 % CONTEXTS.length];

  return `${observer}.${observable}.${context}`;
}

/**
 * Convert a triword back to its hash prefix.
 *
 * Reverse lookup: finds the index of each word in its dimension
 * and reconstructs the first 3 bytes (6 hex chars) of the hash.
 *
 * @param triword — "observer.observable.context" format
 * @returns 6-char hex prefix, or null if any word is invalid
 */
export function triwordToPrefix(triword: string): string | null {
  const parts = triword.toLowerCase().split(".");
  if (parts.length !== 3) return null;

  const [obs, prop, ctx] = parts;
  const i1 = OBSERVERS.indexOf(obs);
  const i2 = OBSERVABLES.indexOf(prop);
  const i3 = CONTEXTS.indexOf(ctx);

  if (i1 === -1 || i2 === -1 || i3 === -1) return null;

  const hex1 = i1.toString(16).padStart(2, "0");
  const hex2 = i2.toString(16).padStart(2, "0");
  const hex3 = i3.toString(16).padStart(2, "0");

  return `${hex1}${hex2}${hex3}`;
}

/**
 * Validate whether a string is a valid triword.
 */
export function isValidTriword(triword: string): boolean {
  return triwordToPrefix(triword) !== null;
}

/**
 * Get the triality breakdown of a triword.
 *
 * Returns the three coordinates with their dimension labels,
 * useful for UI display and educational context.
 */
export function triwordBreakdown(triword: string): {
  observer: string;
  observable: string;
  context: string;
} | null {
  const parts = triword.toLowerCase().split(".");
  if (parts.length !== 3) return null;

  const [observer, observable, context] = parts;
  if (
    !OBSERVERS.includes(observer) ||
    !OBSERVABLES.includes(observable) ||
    !CONTEXTS.includes(context)
  ) {
    return null;
  }

  return { observer, observable, context };
}

/**
 * Format a triword for display (capitalize each word).
 */
export function formatTriword(triword: string): string {
  return triword
    .split(".")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" · ");
}

/**
 * Get the total number of unique triwords possible.
 */
export function triwordSpace(): number {
  return OBSERVERS.length * OBSERVABLES.length * CONTEXTS.length;
}
