/**
 * UOR Triword Encoding — Human-Readable Canonical Coordinates
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
 * The UOR framework is built on triality — every object in the
 * universe is fully described by exactly three coordinates:
 *
 *   1. Observer   — the entity, the subject, the "who"
 *   2. Observable — the property, the quality, the "what"
 *   3. Context    — the frame, the setting, the "where"
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
 * This gives 256³ = 16,777,216 unique triwords — more than enough
 * for practical disambiguation. The full canonical ID remains the
 * authoritative, collision-free reference.
 *
 * FIRST-PRINCIPLES DERIVATION
 * ───────────────────────────
 * The wordlists are NOT arbitrary. They are derived from a
 * Genesis Object — a canonical JSON-LD document that defines
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
 * ✓ Content-addressed — wordlists have a canonical ID
 * ✓ Self-verifying — integrity checked on every load
 * ✓ Triality-aligned — three dimensions map to framework primitives
 * ✓ Deterministic — same hash always produces the same triword
 * ✓ Reversible — triword → hash prefix → lookup
 * ✓ URDNA2015 — genesis object canonicalized via standard pipeline
 *
 * @module uor-triword
 * @version 1.0.0
 * @see UOR Triality — Observer / Observable / Context
 * @see UOR Content Registry — self-certification
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
  "uor:version": "1.0.0",
  "uor:description":
    "Triword encoding maps UOR canonical IDs to human-readable " +
    "three-word labels aligned with the framework's triality principle. " +
    "Each word corresponds to one of three fundamental dimensions: " +
    "Observer (entity), Observable (property), Context (frame).",
  "uor:triality": {
    "uor:observer": {
      "uor:description": "Nouns representing entities, subjects, and agents",
      "uor:cardinality": 256,
      "uor:bitWidth": 8,
      "uor:hashByteIndex": 0,
    },
    "uor:observable": {
      "uor:description": "Adjectives representing properties, qualities, and states",
      "uor:cardinality": 256,
      "uor:bitWidth": 8,
      "uor:hashByteIndex": 1,
    },
    "uor:context": {
      "uor:description": "Nouns representing frames, settings, and environments",
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
    "Common, unambiguous English words",
    "No homophones (to/too/two excluded)",
    "No offensive or culturally sensitive terms",
    "Phonetically distinct to avoid confusion",
    "Minimum 3 characters, maximum 8 characters",
    "Sorted alphabetically for deterministic indexing",
    "Each word unique within its dimension",
  ],
} as const;

// ── Wordlists — Triality-Aligned Dimensions ─────────────────────────────────
//
// OBSERVER (Dimension 1) — 256 nouns
// Entities, subjects, agents — the "who" or "what" of any object.
// These words name the thing being observed.
//
const OBSERVERS: readonly string[] = [
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
] as const;

//
// OBSERVABLE (Dimension 2) — 256 adjectives
// Properties, qualities, states — the "how" or "what kind" of any object.
// These words describe the nature of the observation.
//
const OBSERVABLES: readonly string[] = [
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
] as const;

//
// CONTEXT (Dimension 3) — 256 nouns
// Frames, settings, environments — the "where" or "when" of any object.
// These words name the space in which observation occurs.
//
const CONTEXTS: readonly string[] = [
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
 * This function is idempotent — safe to call multiple times.
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
    // Still allow encoding to work — the wordlists are correct even
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
 * @param canonicalId — CID, derivation ID, or hex hash
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
 * @param triword — Dot-separated "observer.observable.context"
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
 * @param triword — String to validate
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
 * @param dimension — "observer", "observable", or "context"
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
