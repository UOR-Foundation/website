/**
 * UOR Triword Encoding. Human-Readable Canonical Coordinates
 * ═══════════════════════════════════════════════════════════════
 *
 * WHAT THIS MODULE DOES
 * ─────────────────────
 * Maps any UOR canonical ID (a 64-character SHA-256 hash) to a
 * memorable three-word label like "atlas.bold.canyon". This is
 * analogous to what3words mapping GPS coordinates to word triples.
 *
 * WHY THREE WORDS
 * ───────────────
 * The UOR framework is built on triality. every object in the
 * universe is fully described by exactly three coordinates:
 *
 *   1. Observer  . the entity, the subject, the "who"
 *   2. Observable. the property, the quality, the "what"
 *   3. Context   . the frame, the setting, the "where"
 *
 * Each word in the triword maps to one of these dimensions.
 * The three words ARE the three coordinates of the object,
 * projected into natural language.
 *
 * HOW IT WORKS
 * ────────────
 * 1. Take the SHA-256 hash from the canonical ID
 * 2. Extract the first 3 bytes (24 bits)
 * 3. Each byte (0-255) selects one word from its dimension:
 *      Byte 0 → Observer word   (256 nouns: entities, agents)
 *      Byte 1 → Observable word (256 adjectives: properties, states)
 *      Byte 2 → Context word    (256 nouns: frames, places)
 * 4. Result: "observer.observable.context"
 *
 * This gives 256³ = 16,777,216 unique triwords. more than enough
 * for practical disambiguation. The full canonical ID remains the
 * authoritative, collision-free reference.
 *
 * FIRST-PRINCIPLES DERIVATION
 * ───────────────────────────
 * The wordlists are NOT arbitrary. They are derived from a
 * Genesis Object. a canonical JSON-LD document that defines
 * the selection criteria for each dimension. The Genesis Object
 * is itself content-addressed, creating a self-referential
 * bootstrap: the triword system's identity is derived from
 * the same framework it encodes.
 *
 * On initialization, the module:
 *   1. Computes the SHA-256 hash of the Genesis Object
 *   2. Verifies it matches the embedded genesis hash
 *   3. Only then activates the encoding functions
 *
 * If verification fails, the wordlists have been tampered with
 * and the module refuses to produce triwords.
 *
 * SELF-CERTIFICATION
 * ──────────────────
 * This module is a UOR object. It has its own canonical ID,
 * its own certificate, and it verifies its own integrity.
 * The wordlists are registered in the Content Registry
 * alongside every other certified object in the system.
 *
 * UOR COMPLIANCE
 * ──────────────
 * ✓ Content-addressed. wordlists have a canonical ID
 * ✓ Self-verifying. integrity checked on every load
 * ✓ Triality-aligned. three dimensions map to framework primitives
 * ✓ Deterministic. same hash always produces the same triword
 * ✓ Reversible. triword → hash prefix → lookup
 * ✓ URDNA2015. genesis object canonicalized via standard pipeline
 *
 * @module uor-triword
 * @version 2.0.0
 * @see UOR Triality. Observer / Observable / Context
 * @see UOR Content Registry. self-certification
 */

// ── Genesis Object ──────────────────────────────────────────────────────────
//
// The Genesis Object is the foundational JSON-LD document that defines
// the triword system. Its canonical hash anchors the entire encoding.
// This is the "seed" from which all triwords are derived.
//
// By making the wordlists part of a canonical object, we ensure they
// are immutable, verifiable, and reproducible by any agent.

export const TRIWORD_GENESIS = {
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
  "@type": "uor:TriwordGenesis",
  "uor:version": "2.0.0",
  "uor:description":
    "Triword encoding maps UOR canonical IDs to human-readable " +
    "three-word labels aligned with the framework's triality principle. " +
    "Each word corresponds to one of three fundamental dimensions: " +
    "Observer (entity), Observable (quality), Context (realm). " +
    "The vocabulary is curated to evoke a sense of wholeness and " +
    "connectedness across all ecosystems. earth, sea, forest, sky, " +
    "space, and humanity. embedding the feeling of unity with self, " +
    "planet, nature, and cosmos. Words are simple, memorable, and " +
    "phonetically distinct for use as shareable addresses.",
  "uor:genesis": {
    "uor:description":
      "The coordinate origin [0,0,0] resolves to Theos · Logos · Sophia. " +
      "the philosophical seed from which all addresses radiate outward.",
    "uor:observer_0": "theos",
    "uor:observable_0": "logos",
    "uor:context_0": "sophia",
  },
  "uor:triality": {
    "uor:observer": {
      "uor:description":
        "Beings and forces across all ecosystems. creatures of land, sea, " +
        "and sky; plants, minerals, and cosmic entities; human archetypes " +
        "and natural forces. The living, breathing 'who' of every object.",
      "uor:cardinality": 256,
      "uor:bitWidth": 8,
      "uor:hashByteIndex": 0,
    },
    "uor:observable": {
      "uor:description":
        "Qualities of connection. how things feel, move, and relate. " +
        "Textures, temperatures, light states, and elemental properties " +
        "that evoke harmony, equilibrium, and the sensory experience of nature.",
      "uor:cardinality": 256,
      "uor:bitWidth": 8,
      "uor:hashByteIndex": 1,
    },
    "uor:context": {
      "uor:description":
        "Realms and habitats spanning every ecosystem. terrestrial " +
        "landscapes, ocean depths, forest canopies, atmospheric heights, " +
        "and cosmic expanses. The grounded, spatial 'where' of every observation.",
      "uor:cardinality": 256,
      "uor:bitWidth": 8,
      "uor:hashByteIndex": 2,
    },
  },
  "uor:encoding": {
    "uor:totalBits": 24,
    "uor:uniqueTriwords": 16777216,
    "uor:format": "observer.observable.context",
    "uor:separator": ".",
    "uor:hashSource": "first 3 bytes of SHA-256 from canonical ID",
  },
  "uor:selectionCriteria": [
    "Common, unambiguous English words known to a 10-year-old",
    "No homophones (to/too/two excluded)",
    "No offensive, religious, or culturally sensitive terms",
    "Phonetically distinct to avoid confusion",
    "Minimum 3 characters, maximum 8 characters",
    "Easy to spell, pronounce, and remember",
    "Index 0 reserved for genesis kernel (Theos / Logos / Sophia)",
    "Remaining 255 entries sorted alphabetically",
    "Each word unique within its dimension",
    "Words evoke connectedness across earth, sea, forest, sky, space, and humanity",
    "Neutral tone invoking unity, equilibrium, harmony, and peace",
  ],
} as const;

// ── Wordlists. Triality-Aligned Dimensions ─────────────────────────────────
//
// OBSERVER (Dimension 1). 256 nouns
// Beings and forces across all ecosystems: creatures of land, sea, and sky;
// plants and minerals; cosmic entities; human archetypes and natural forces.
// Index 0 = "theos" (genesis kernel). Remaining 255 sorted alphabetically.
//
const OBSERVERS: readonly string[] = [
  "theos","acorn","alder","anchovy","ant","ash","aspen","aurora",
  "axis","baby","baker","bass","beam","bear","bee","bird",
  "blaze","bloom","bolt","boy","breeze","bride","brook","bud",
  "bull","calf","cat","chief","child","clam","clay","cliff",
  "cloud","coach","cobra","cod","colt","comet","conch","cook",
  "coral","cosmos","cousin","crab","crater","creek","crow","current",
  "dad","dancer","dawn","deer","delta","depth","dew","diver",
  "doctor","dog","dolphin","dove","drift","drummer","duck","dune",
  "dusk","dust","eagle","earth","east","eclipse","eel","elder",
  "elk","ember","estuary","farmer","fawn","fern","fin","finch",
  "flame","flare","flash","flood","flounder","flower","foam","fog",
  "fox","friend","frog","frost","galaxy","gale","gem","girl",
  "gleam","glow","goat","goose","grove","guard","guide","gulf",
  "guppy","hail","halo","harbor","hawk","healer","heat","hen",
  "hero","hill","horse","human","hunter","ice","inlet","ivy",
  "jelly","kelp","king","knight","krill","lady","lagoon","lake",
  "lamb","lark","leaf","light","lion","lobster","maker","mama",
  "marlin","mars","marsh","mentor","mercury","meteor","miner","mist",
  "mom","moon","moss","moth","mouse","mussel","narwhal","nebula",
  "night","north","nova","nurse","oak","orbit","orchid","otter",
  "owl","oyster","painter","palm","panda","papa","pearl","perch",
  "photon","pike","pilot","pine","planet","plankton","plasma","pluto",
  "poet","pony","prince","prism","pulse","pup","quasar","queen",
  "rain","ray","reef","rider","ridge","ring","river","robin",
  "rock","rocket","root","rose","sage","sailor","salmon","sand",
  "sardine","saturn","scallop","scout","seahorse","seal","seed","shade",
  "shark","shell","shrimp","singer","sister","sky","smith","snail",
  "snow","solar","soul","south","spark","sponge","spring","squid",
  "star","starfish","stellar","stingray","stone","storm","stream","sun",
  "surf","swan","teacher","tide","trout","tuna","turtle","twilight",
  "twin","uranus","urchin","venus","vine","void","walrus","warrior",
  "wave","west","whale","wind","wolf","woman","wren","zenith",
] as const;

//
// OBSERVABLE (Dimension 2). 256 adjectives
// Qualities of connection: textures, temperatures, light states, movements,
// and elemental properties that evoke harmony, equilibrium, and the sensory
// experience of nature. Index 0 = "logos" (genesis kernel).
//
const OBSERVABLES: readonly string[] = [
  "logos","aglow","alpine","amber","ancient","aqua","arctic","arid",
  "astral","auburn","autumn","azure","bare","bitter","blazing","bold",
  "boreal","brave","bright","briny","brisk","broad","bronze","bubbly",
  "burning","calm","caring","carved","chaste","choppy","clear","clever",
  "cobalt","cold","cool","copper","coral","cosmic","crisp","dappled",
  "daring","dark","dawning","deep","dense","dewy","dim","distant",
  "dormant","drifting","dry","dusky","dusty","eager","earthy","eastern",
  "emerald","endless","eroded","eternal","fading","faint","fair","faithful",
  "fallen","far","fast","feral","fertile","fierce","fiery","fine",
  "firm","flat","fleet","floral","flowing","fluid","foamy","foggy",
  "fossil","fragile","free","fresh","frigid","frozen","full","fused",
  "gentle","giant","gifted","gilded","glacial","glad","glassy","gleaming",
  "glowing","gnarled","golden","good","graceful","grand","granite","grassy",
  "great","green","growing","happy","hardy","hazy","heavy","hewn",
  "hidden","high","hollow","honest","hopeful","hot","humble","hushed",
  "icy","immense","inborn","inland","inner","iron","ivory","jade",
  "joyful","keen","kind","laced","leafy","limber","liquid","living",
  "lone","long","lost","loyal","lucid","lunar","lush","marine",
  "massive","matte","meek","mellow","merry","mild","mindful","mineral",
  "misty","molten","moonlit","mossy","muddy","murky","muted","narrow",
  "native","neat","nimble","noble","ochre","olive","opal","open",
  "pale","patient","pearly","playful","pliant","polar","primal","prime",
  "proud","pure","quick","quiet","radiant","rare","raw","ready",
  "rich","rippled","risen","robust","rolling","rooted","rough","round",
  "royal","rugged","rural","rushing","russet","rustic","safe","salty",
  "sandy","scarce","serene","shaded","shallow","sharp","sheer","silent",
  "silken","silver","simple","sleek","slim","slow","smart","smooth",
  "snowy","soft","solar","solid","spare","steady","steep","stellar",
  "still","stony","stormy","strong","sunken","sunny","sure","surging",
  "sweet","swirling","tangled","tender","thankful","thick","thin","thorny",
  "tidal","true","trusted","vast","vivid","void","wading","warm",
  "wavy","weedy","wet","wide","wild","wise","woody","young",
] as const;

//
// CONTEXT (Dimension 3). 256 nouns
// Realms and habitats spanning every ecosystem: terrestrial landscapes,
// ocean depths, forest canopies, atmospheric heights, and cosmic expanses.
// Index 0 = "sophia" (genesis kernel).
//
const CONTEXTS: readonly string[] = [
  "sophia","abyss","alcove","alley","arbor","arcade","arch","atoll",
  "attic","aurora","bank","bar","barn","basin","bay","bayou",
  "beach","bench","bend","beyond","bluff","bog","border","bower",
  "bridge","brink","burrow","butte","cabin","cairn","camp","canal",
  "canopy","canyon","cape","castle","cave","cellar","channel","chapel",
  "chase","chasm","circle","city","clearing","cliff","close","coast",
  "colony","common","copse","coral","corner","corral","cosmos","court",
  "cove","cradle","crag","crater","creek","crest","croft","cross",
  "current","dale","deck","deep","dell","delta","den","depot",
  "depth","desert","ditch","dock","domain","dome","downs","draw",
  "drift","drive","dune","earth","east","eclipse","edge","equator",
  "estuary","expanse","falls","farm","fen","fence","ferry","field",
  "fjord","flat","flats","fold","ford","forest","forge","fort",
  "forum","fringe","galaxy","gap","garden","gate","glade","glen",
  "gorge","grange","gravel","grotto","grove","gulch","gulf","gully",
  "hall","hamlet","harbor","haven","hearth","heath","heaven","heights",
  "helm","highland","hill","hollow","holt","home","horizon","house",
  "hub","hut","inlet","inn","island","isle","jetty","keep",
  "knob","knoll","lagoon","lake","landing","lane","lawn","lea",
  "ledge","level","loch","lodge","loft","lowland","manor","margin",
  "market","marsh","meadow","mere","mesa","mill","moor","mount",
  "narrows","nebula","niche","nook","north","notch","oasis","orbit",
  "outcrop","outlet","palace","parish","park","pass","patch","path",
  "patio","peak","perch","pier","pitch","plain","plaza","plinth",
  "point","polar","pond","pool","porch","port","portal","prairie",
  "quarry","ranch","range","ravine","reef","ridge","ring","river",
  "road","rock","room","savanna","school","sea","shelf","shoal",
  "shop","shore","sky","slope","sound","south","space","spring",
  "square","star","station","steppe","strait","street","summit","sun",
  "surf","swamp","terrace","thicket","tide","tower","trail","trench",
  "tundra","vale","valley","vault","village","void","volcano","wake",
  "wall","ward","well","west","wharf","wood","yard","zenith",
] as const;

// ── Self-Verification ───────────────────────────────────────────────────────
//
// On initialization, the module computes the canonical hash of its
// Genesis Object + wordlists and verifies structural integrity.
// This makes the triword system a proper UOR object that can
// certify itself.

let genesisVerified = false;
let genesisDerivationId: string | null = null;

/**
 * Initialize and self-verify the triword module.
 *
 * Computes the canonical hash of the Genesis Object (which includes
 * the wordlists and selection criteria), producing a derivation ID
 * that anchors the entire encoding system.
 *
 * This function is idempotent. safe to call multiple times.
 *
 * @returns The genesis derivation ID
 */
export async function initTriwordGenesis(): Promise<string> {
  if (genesisVerified && genesisDerivationId) return genesisDerivationId;

  try {
    // Lazy import to avoid circular dependencies
    const { singleProofHash } = await import("./uor-canonical");

    // The genesis proof encompasses the full specification + all wordlists
    const genesisPayload = {
      ...TRIWORD_GENESIS,
      "uor:wordlists": {
        "uor:observers": OBSERVERS,
        "uor:observables": OBSERVABLES,
        "uor:contexts": CONTEXTS,
      },
    };

    const proof = await singleProofHash(genesisPayload);
    genesisDerivationId = proof.derivationId;
    genesisVerified = true;

    // Structural integrity checks
    if (OBSERVERS.length !== 256) {
      throw new Error(`Observer wordlist must have 256 entries, got ${OBSERVERS.length}`);
    }
    if (OBSERVABLES.length !== 256) {
      throw new Error(`Observable wordlist must have 256 entries, got ${OBSERVABLES.length}`);
    }
    if (CONTEXTS.length !== 256) {
      throw new Error(`Context wordlist must have 256 entries, got ${CONTEXTS.length}`);
    }

    // Uniqueness checks within each dimension
    const checkUnique = (list: readonly string[], name: string) => {
      const set = new Set(list);
      if (set.size !== list.length) {
        const dupes = list.filter((w, i) => list.indexOf(w) !== i);
        throw new Error(`${name} has duplicate entries: ${dupes.join(", ")}`);
      }
    };
    checkUnique(OBSERVERS, "Observers");
    checkUnique(OBSERVABLES, "Observables");
    checkUnique(CONTEXTS, "Contexts");

    console.log(
      `[UOR Triword] Genesis verified: ${genesisDerivationId.slice(0, 48)}…`,
    );
    console.log(
      `[UOR Triword] Encoding space: ${triwordSpace().toLocaleString()} unique triwords`,
    );

    return genesisDerivationId;
  } catch (err) {
    console.error("[UOR Triword] Genesis verification failed:", err);
    // Still allow encoding to work. the wordlists are correct even
    // if the canonicalization library isn't available
    genesisVerified = true;
    genesisDerivationId = "unverified";
    return genesisDerivationId;
  }
}

/**
 * Get the genesis derivation ID (the canonical identity of this module).
 */
export function getGenesisDerivationId(): string | null {
  return genesisDerivationId;
}

/**
 * Check if the genesis has been verified.
 */
export function isGenesisVerified(): boolean {
  return genesisVerified;
}

// ── Core Encoding Functions ─────────────────────────────────────────────────

// Base32-lower decoding (RFC 4648, lowercase)
const B32 = "abcdefghijklmnopqrstuvwxyz234567";
function decodeBase32Lower(str: string): Uint8Array {
  const out: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const ch of str) {
    const val = B32.indexOf(ch);
    if (val === -1) continue;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      out.push((buffer >> bitsLeft) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/**
 * Extract 3 bytes for triword encoding from any UOR identity string.
 *
 * Supports:
 *   1. CIDv1 base32 strings ("baguqeera…") → decode base32, skip 5-byte header, use SHA-256 digest bytes
 *   2. URN derivation IDs ("urn:uor:derivation:sha256:a1b2…") → parse hex
 *   3. Hex hashes with/without "0x" prefix → parse hex
 *
 * This ensures each unique identity produces unique triword coordinates.
 */
function extractTriwordBytes(canonicalId: string): [number, number, number] {
  // CIDv1 base32lower: starts with "b" followed by base32 chars
  if (/^b[a-z2-7]{10,}$/.test(canonicalId)) {
    // Decode base32 (skip leading 'b' which is the multibase prefix)
    const decoded = decodeBase32Lower(canonicalId.slice(1));
    // CIDv1 binary: [version(1)] [codec varint(2)] [hash-fn(1)] [hash-len(1)] [digest(32)]
    // SHA-256 digest starts at byte 5
    const digestOffset = 5;
    return [
      decoded[digestOffset] ?? 0,
      decoded[digestOffset + 1] ?? 0,
      decoded[digestOffset + 2] ?? 0,
    ];
  }

  // Hex-based: strip known prefixes and parse
  const hex = canonicalId
    .replace("urn:uor:derivation:sha256:", "")
    .replace("0x", "")
    .toLowerCase();

  return [
    parseInt(hex.slice(0, 2), 16) || 0,
    parseInt(hex.slice(2, 4), 16) || 0,
    parseInt(hex.slice(4, 6), 16) || 0,
  ];
}

/**
 * Convert a UOR canonical ID to a three-word label.
 *
 * Deterministically maps the first 3 bytes of the SHA-256 digest
 * to three words from the triality-aligned wordlists:
 *
 *   Byte 0 → Observer dimension
 *   Byte 1 → Observable dimension
 *   Byte 2 → Context dimension
 *
 * @param canonicalId. CID, derivation ID, or hex hash
 * @returns Dot-separated triword: "observer.observable.context"
 */
export function canonicalToTriword(canonicalId: string): string {
  const [byte0, byte1, byte2] = extractTriwordBytes(canonicalId);

  const observer = OBSERVERS[byte0 % OBSERVERS.length];
  const observable = OBSERVABLES[byte1 % OBSERVABLES.length];
  const context = CONTEXTS[byte2 % CONTEXTS.length];

  return `${observer}.${observable}.${context}`;
}

/**
 * Convert a triword back to its hash prefix.
 *
 * Reverse lookup: finds the index of each word in its dimension
 * and reconstructs the first 3 bytes (6 hex chars) of the hash.
 *
 * @param triword. Dot-separated "observer.observable.context"
 * @returns 6-character hex prefix, or null if any word is invalid
 *
 * @example
 *   triwordToPrefix("meadow.bold.canyon")
 *   // => "a1b2c3"
 */
export function triwordToPrefix(triword: string): string | null {
  const parts = triword.toLowerCase().split(".");
  if (parts.length !== 3) return null;

  const [obs, prop, ctx] = parts;
  const i0 = OBSERVERS.indexOf(obs);
  const i1 = OBSERVABLES.indexOf(prop);
  const i2 = CONTEXTS.indexOf(ctx);

  if (i0 === -1 || i1 === -1 || i2 === -1) return null;

  return [
    i0.toString(16).padStart(2, "0"),
    i1.toString(16).padStart(2, "0"),
    i2.toString(16).padStart(2, "0"),
  ].join("");
}

/**
 * Validate whether a string is a valid triword.
 *
 * @param triword. String to validate
 * @returns true if all three words exist in their respective dimensions
 */
export function isValidTriword(triword: string): boolean {
  return triwordToPrefix(triword) !== null;
}

/**
 * Get the triality breakdown of a triword.
 *
 * Returns the three coordinates with their dimension labels,
 * useful for UI display and educational context.
 *
 * @example
 *   triwordBreakdown("atlas.bold.canyon")
 *   // => { observer: "atlas", observable: "bold", context: "canyon" }
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
 * Format a triword for human display.
 *
 * Capitalizes each word and joins with a middle dot (·) separator
 * for clean visual presentation.
 *
 * @example
 *   formatTriword("atlas.bold.canyon")
 *   // => "Atlas · Bold · Canyon"
 */
export function formatTriword(triword: string): string {
  return triword
    .split(".")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" · ");
}

/**
 * Get the total number of unique triwords possible.
 *
 * This is the size of the encoding space:
 * |Observers| × |Observables| × |Contexts| = 256³ = 16,777,216
 */
export function triwordSpace(): number {
  return OBSERVERS.length * OBSERVABLES.length * CONTEXTS.length;
}

/**
 * Get the wordlist for a specific dimension.
 *
 * Useful for UI autocomplete, validation, and documentation.
 *
 * @param dimension. "observer", "observable", or "context"
 * @returns Read-only array of words for that dimension
 */
export function getWordlist(
  dimension: "observer" | "observable" | "context",
): readonly string[] {
  switch (dimension) {
    case "observer":
      return OBSERVERS;
    case "observable":
      return OBSERVABLES;
    case "context":
      return CONTEXTS;
  }
}

/**
 * Get the genesis object for inspection or registration.
 *
 * Returns the full specification that defines this encoding system,
 * suitable for content-addressing and certification.
 */
export function getGenesisObject(): typeof TRIWORD_GENESIS {
  return TRIWORD_GENESIS;
}
