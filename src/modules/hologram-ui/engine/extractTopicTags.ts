/**
 * extractTopicTags — Lightweight Client-Side Tag Extraction
 * ═══════════════════════════════════════════════════════════
 *
 * Extracts topic tags from conversation text using frequency-weighted
 * keyword extraction. No AI call needed — this is a pure O(n) scan
 * that runs in <1ms for typical chat messages.
 *
 * The holographic principle: compress the high-dimensional semantic
 * content of a message onto a low-dimensional tag surface.
 *
 * @module hologram-ui/engine/extractTopicTags
 */

// ── Stop words (common English words to ignore) ─────────────────────────

const STOP = new Set([
  "a","an","the","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","shall","should","may","might","can","could",
  "i","me","my","we","our","you","your","he","him","his","she","her","it","its",
  "they","them","their","this","that","these","those","what","which","who","whom",
  "how","when","where","why","if","then","else","so","but","and","or","not","no",
  "yes","all","any","each","every","both","few","more","most","other","some","such",
  "than","too","very","just","about","above","after","before","between","into","through",
  "during","for","from","in","of","on","to","with","at","by","up","out","off","over",
  "under","again","further","also","here","there","now","well","still","even","back",
  "only","also","like","get","got","make","made","know","think","want","need","use",
  "tell","say","said","see","look","come","go","take","give","let","try","keep",
  "help","show","please","thank","thanks","much","really","thing","things","way",
  "something","anything","nothing","everything","one","two","don","doesn","didn",
  "won","wouldn","shouldn","couldn","isn","aren","wasn","weren","hasn","haven","hadn",
]);

// ── Domain boost: words that indicate strong topical signal ─────────────

const DOMAIN_INDICATORS: Record<string, string> = {
  // Tech & CS
  algorithm: "algorithms", api: "apis", database: "databases", machine: "machine-learning",
  learning: "machine-learning", neural: "neural-networks", model: "ai-models",
  blockchain: "blockchain", crypto: "cryptography", encryption: "cryptography",
  quantum: "quantum", graph: "graph-theory", network: "networking",
  // Science
  physics: "physics", mathematics: "mathematics", biology: "biology",
  chemistry: "chemistry", astronomy: "astronomy", ecology: "ecology",
  // Creative
  design: "design", music: "music", art: "art", writing: "writing",
  photography: "photography", architecture: "architecture",
  // Business
  strategy: "strategy", finance: "finance", marketing: "marketing",
  startup: "startups", product: "product-design",
  // UOR-specific
  uor: "uor-framework", hologram: "hologram", canonical: "canonicalization",
  derivation: "derivations", morphism: "morphisms", coherence: "coherence",
  identity: "digital-identity", projection: "projections", observer: "observer-theory",
};

/**
 * Extract topic tags from a text string.
 * Returns tags sorted by weight (highest first), capped at maxTags.
 */
export function extractTopicTags(
  text: string,
  maxTags = 5,
): Array<{ tag: string; weight: number }> {
  // Tokenize: lowercase, strip punctuation, split on whitespace
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

  if (words.length === 0) return [];

  // Count word frequencies
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  // Map to domain tags where possible, otherwise use raw word
  const tagWeights: Record<string, number> = {};
  for (const [word, count] of Object.entries(freq)) {
    const tag = DOMAIN_INDICATORS[word] || word;
    const weight = count / words.length;
    tagWeights[tag] = (tagWeights[tag] || 0) + weight;
  }

  // Sort by weight, take top N
  return Object.entries(tagWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxTags)
    .map(([tag, weight]) => ({ tag, weight: Math.min(1, weight * 3) })); // scale up for salience
}
