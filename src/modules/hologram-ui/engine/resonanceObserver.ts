/**
 * Resonance Observer — Cybernetic Feedback Loop
 * ═══════════════════════════════════════════════
 *
 * Implements the cybernetic principle: observe → measure → adapt → observe.
 *
 * The observer watches each exchange between human and Lumen,
 * extracting signals about the user's communication style, expertise,
 * emotional register, and domain interests. These observations accumulate
 * into a Resonance Profile — a compact vector that modulates Lumen's
 * system prompt so responses increasingly match the user's natural frequency.
 *
 * Design principles:
 *   1. Silent observation — the user never sees this happening
 *   2. Negative feedback loop — if responses drift from resonance, correct
 *   3. Positive feedback loop — if responses resonate, reinforce the pattern
 *   4. Sacred attention — the profile exists to REDUCE cognitive load, never increase it
 *   5. Convergence — the system tends toward resonance, not toward verbose self-reference
 *
 * Storage: Hot (localStorage) + Cold (context graph via Supabase)
 *
 * @module hologram-ui/engine/resonanceObserver
 */

// ── Resonance Dimensions ──────────────────────────────────────────────

export interface ResonanceProfile {
  /** How technical/expert the user's language is (0 = beginner, 1 = expert) */
  expertiseLevel: number;
  /** Preferred response density (0 = brief/sparse, 1 = detailed/dense) */
  densityPreference: number;
  /** Formality register (0 = casual, 1 = formal/academic) */
  formalityRegister: number;
  /** Emotional warmth preference (0 = analytical/cool, 1 = warm/personal) */
  warmthPreference: number;
  /** Pace preference — how quickly they want to get to the point (0 = patient, 1 = direct) */
  pacePreference: number;
  /** Domain interests — weighted topic clusters */
  domainInterests: Record<string, number>;
  /** Total exchanges observed — determines confidence in the profile */
  observationCount: number;
  /** Rolling average of user message length (words) — calibrates response length */
  avgMessageLength: number;
  /** Correction frequency — negative feedback signal (higher = Lumen needs to adjust more) */
  correctionRate: number;
  /** Follow-up question rate — positive signal of engagement */
  followUpRate: number;
  /** Last updated timestamp */
  updatedAt: number;
}

// ── Signal Extraction ─────────────────────────────────────────────────

interface ExchangeSignals {
  userWordCount: number;
  avgWordLength: number;
  sentenceCount: number;
  questionCount: number;
  technicalTermDensity: number;
  formalityScore: number;
  emotionalMarkers: number;
  isCorrection: boolean;
  isFollowUp: boolean;
  topicTokens: string[];
}

/** Technical vocabulary indicators */
const TECHNICAL_TERMS = new Set([
  "algorithm", "api", "architecture", "async", "backend", "binary", "boolean",
  "cache", "callback", "cipher", "class", "closure", "compiler", "component",
  "concurrency", "config", "constructor", "container", "context", "cryptographic",
  "daemon", "database", "debug", "decrypt", "deploy", "dependency", "deterministic",
  "docker", "domain", "encrypt", "endpoint", "entropy", "enum", "exception",
  "factorial", "fibonacci", "firewall", "framework", "frontend", "function",
  "gradient", "graph", "hash", "heuristic", "http", "immutable", "index",
  "inference", "instance", "interface", "isomorphism", "iterator", "json",
  "kernel", "lambda", "latency", "linked", "malloc", "manifold", "matrix",
  "merkle", "middleware", "module", "monad", "morphism", "mutex", "namespace",
  "neural", "node", "object", "observable", "ontology", "optimization",
  "parameter", "parser", "pipeline", "pointer", "polynomial", "predicate",
  "primitive", "protocol", "proxy", "quantum", "query", "recursive",
  "redux", "regex", "render", "repository", "resolver", "runtime", "schema",
  "semaphore", "serialization", "server", "shader", "singleton", "socket",
  "stack", "state", "stream", "struct", "subnet", "subroutine", "sync",
  "syntax", "tensor", "thread", "token", "topology", "transaction", "tree",
  "tuple", "typescript", "variable", "vector", "virtual", "webhook", "widget",
  // Domain-specific
  "coherence", "hologram", "uor", "derivation", "isometry", "certificate",
  "attestation", "canonical", "epistemic", "morphism", "stratum", "substrate",
]);

/** Informal language markers */
const INFORMAL_MARKERS = new Set([
  "lol", "haha", "cool", "yeah", "yep", "nah", "gonna", "wanna", "gotta",
  "tbh", "imo", "btw", "ngl", "idk", "omg", "bruh", "dude", "hey", "yo",
  "kinda", "sorta", "stuff", "thingy", "whatnot", "anyways",
]);

/** Correction indicators */
const CORRECTION_PATTERNS = [
  /^no[,.]?\s/i, /^actually[,.]?\s/i, /^that'?s not/i, /^wrong/i,
  /^incorrect/i, /not what i/i, /i meant/i, /what i actually/i,
  /you misunderstood/i, /that'?s incorrect/i, /let me clarify/i,
  /^correction/i, /^wait,?\s/i,
];

/** Follow-up indicators */
const FOLLOWUP_PATTERNS = [
  /^and\s/i, /^also[,.]?\s/i, /^what about/i, /^how about/i,
  /^can you also/i, /^one more/i, /^additionally/i, /^furthermore/i,
  /tell me more/i, /^expand on/i, /^elaborate/i, /^go deeper/i,
  /^more on/i, /^continue/i,
];

/** Emotional warmth markers */
const WARMTH_MARKERS = new Set([
  "thanks", "thank", "please", "appreciate", "grateful", "love",
  "amazing", "wonderful", "beautiful", "lovely", "brilliant", "awesome",
  "excited", "happy", "enjoy", "feel", "heart", "care", "kind",
]);

/** Extract domain topic tokens from text */
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  technology: ["code", "programming", "software", "app", "web", "ai", "machine", "learning", "data", "cloud"],
  science: ["physics", "chemistry", "biology", "math", "experiment", "theory", "hypothesis", "research"],
  philosophy: ["meaning", "consciousness", "ethics", "existence", "truth", "knowledge", "reality", "mind"],
  creative: ["design", "art", "music", "write", "story", "creative", "color", "visual", "aesthetic"],
  business: ["strategy", "market", "revenue", "growth", "team", "product", "customer", "startup"],
  personal: ["life", "relationship", "health", "wellness", "habit", "goal", "meditation", "mindfulness"],
};

function extractSignals(userMessage: string, assistantResponse: string, previousUserMessage?: string): ExchangeSignals {
  const words = userMessage.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const avgWordLength = wordCount > 0 ? words.reduce((s, w) => s + w.replace(/[^a-zA-Z]/g, "").length, 0) / wordCount : 0;
  const sentences = userMessage.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const questions = (userMessage.match(/\?/g) || []).length;

  // Technical term density
  const lowerWords = words.map(w => w.toLowerCase().replace(/[^a-z]/g, ""));
  const techCount = lowerWords.filter(w => TECHNICAL_TERMS.has(w)).length;
  const technicalTermDensity = wordCount > 0 ? techCount / wordCount : 0;

  // Formality score (0-1)
  const informalCount = lowerWords.filter(w => INFORMAL_MARKERS.has(w)).length;
  const hasGreeting = /^(hi|hey|hello|yo|sup)\b/i.test(userMessage);
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(userMessage);
  const formalityScore = Math.max(0, Math.min(1,
    0.5
    + technicalTermDensity * 2
    - (informalCount / Math.max(wordCount, 1)) * 3
    - (hasGreeting ? 0.1 : 0)
    - (hasEmoji ? 0.15 : 0)
    + (avgWordLength > 5.5 ? 0.15 : 0)
  ));

  // Emotional warmth markers
  const emotionalMarkers = lowerWords.filter(w => WARMTH_MARKERS.has(w)).length;

  // Correction detection
  const isCorrection = CORRECTION_PATTERNS.some(p => p.test(userMessage));

  // Follow-up detection
  const isFollowUp = FOLLOWUP_PATTERNS.some(p => p.test(userMessage));

  // Topic extraction
  const topicTokens: string[] = [];
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const hits = lowerWords.filter(w => keywords.includes(w)).length;
    if (hits > 0) topicTokens.push(domain);
  }

  return {
    userWordCount: wordCount,
    avgWordLength,
    sentenceCount: sentences.length,
    questionCount: questions,
    technicalTermDensity,
    formalityScore,
    emotionalMarkers,
    isCorrection,
    isFollowUp,
    topicTokens,
  };
}

// ── Exponential Moving Average ────────────────────────────────────────

/** Smooth update with learning rate that decreases as confidence grows */
function ema(current: number, newValue: number, observationCount: number): number {
  // Learning rate: starts at 0.4 (responsive), decays to 0.08 (stable)
  const alpha = Math.max(0.08, 0.4 / Math.sqrt(Math.max(observationCount, 1)));
  return current * (1 - alpha) + newValue * alpha;
}

// ── Storage Keys ──────────────────────────────────────────────────────

const STORAGE_KEY = "hologram:resonance-profile";

// ── Default Profile ───────────────────────────────────────────────────

function createDefaultProfile(): ResonanceProfile {
  return {
    expertiseLevel: 0.5,
    densityPreference: 0.5,
    formalityRegister: 0.5,
    warmthPreference: 0.5,
    pacePreference: 0.5,
    domainInterests: {},
    observationCount: 0,
    avgMessageLength: 20,
    correctionRate: 0,
    followUpRate: 0,
    updatedAt: Date.now(),
  };
}

// ── Public API ─────────────────────────────────────────────────────────

/** Load the resonance profile from localStorage */
export function loadResonanceProfile(): ResonanceProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate shape
      if (typeof parsed.expertiseLevel === "number" && typeof parsed.observationCount === "number") {
        return parsed;
      }
    }
  } catch { /* ignore corrupt storage */ }
  return createDefaultProfile();
}

/** Save the resonance profile to localStorage */
function saveResonanceProfile(profile: ResonanceProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch { /* storage full — degrade gracefully */ }
}

/**
 * Observe an exchange and update the resonance profile.
 * This is the core cybernetic feedback function.
 *
 * Called after each Lumen exchange completes.
 * Returns the updated profile.
 */
export function observeExchange(
  userMessage: string,
  assistantResponse: string,
  previousUserMessage?: string,
): ResonanceProfile {
  const profile = loadResonanceProfile();
  const signals = extractSignals(userMessage, assistantResponse, previousUserMessage);
  const n = profile.observationCount;

  // ── Update expertise level ──────────────────────────────────────
  // Technical term density + average word length → expertise signal
  const expertiseSignal = Math.min(1,
    signals.technicalTermDensity * 5 + (signals.avgWordLength > 5 ? 0.3 : 0),
  );
  profile.expertiseLevel = ema(profile.expertiseLevel, expertiseSignal, n);

  // ── Update density preference ───────────────────────────────────
  // Longer user messages → they're comfortable with density
  // Short messages → they prefer brevity
  const densitySignal = Math.min(1, signals.userWordCount / 80);
  profile.densityPreference = ema(profile.densityPreference, densitySignal, n);

  // ── Update formality register ───────────────────────────────────
  profile.formalityRegister = ema(profile.formalityRegister, signals.formalityScore, n);

  // ── Update warmth preference ────────────────────────────────────
  const warmthSignal = Math.min(1, signals.emotionalMarkers / 3);
  profile.warmthPreference = ema(profile.warmthPreference, warmthSignal, n);

  // ── Update pace preference ──────────────────────────────────────
  // Short messages with questions → direct/fast pace
  // Long messages → patient/exploratory
  const paceSignal = signals.userWordCount < 15 ? 0.8 :
                     signals.userWordCount < 40 ? 0.5 : 0.2;
  profile.pacePreference = ema(profile.pacePreference, paceSignal, n);

  // ── Update message length average ───────────────────────────────
  profile.avgMessageLength = ema(profile.avgMessageLength, signals.userWordCount, n);

  // ── Update correction rate (negative feedback) ──────────────────
  profile.correctionRate = ema(profile.correctionRate, signals.isCorrection ? 1 : 0, n);

  // ── Update follow-up rate (positive engagement) ─────────────────
  profile.followUpRate = ema(profile.followUpRate, signals.isFollowUp ? 1 : 0, n);

  // ── Update domain interests ─────────────────────────────────────
  for (const topic of signals.topicTokens) {
    profile.domainInterests[topic] = (profile.domainInterests[topic] || 0) + 1;
  }

  // ── Increment observation count ─────────────────────────────────
  profile.observationCount = n + 1;
  profile.updatedAt = Date.now();

  // Persist
  saveResonanceProfile(profile);

  return profile;
}

/**
 * Compile the resonance profile into a system prompt fragment.
 * This is injected into the AI's context so it naturally adapts.
 *
 * The prompt never references the profile directly — it translates
 * the measurements into behavioral guidance that feels natural.
 */
export function compileResonanceDirective(profile: ResonanceProfile): string {
  // Don't inject anything until we have enough observations for confidence
  if (profile.observationCount < 3) return "";

  const parts: string[] = [];
  const confidence = Math.min(1, profile.observationCount / 20);

  parts.push("═══ RESONANCE CALIBRATION (silent behavioral tuning) ═══");
  parts.push("The following calibration reflects observed communication patterns. Apply silently and naturally. Never reference these observations.");

  // Expertise adaptation
  if (profile.expertiseLevel > 0.7) {
    parts.push("This person communicates with technical precision. Match their register: use domain-specific language, skip basic explanations, go deeper on nuance. They value density over simplicity.");
  } else if (profile.expertiseLevel < 0.3) {
    parts.push("This person prefers accessible language. Use clear analogies, avoid jargon, explain concepts from first principles. They value clarity over comprehensiveness.");
  } else {
    parts.push("This person blends technical and accessible language. Mirror their register: be precise when they are, be casual when they are. Meet them exactly where they stand.");
  }

  // Density/length calibration
  const targetWords = Math.round(profile.avgMessageLength * 2.5);
  if (profile.densityPreference > 0.65) {
    parts.push(`They engage with substantial depth. Your responses can be thorough (aim for roughly ${Math.max(targetWords, 80)}-${targetWords + 60} words when the topic warrants it). They appreciate completeness.`);
  } else if (profile.densityPreference < 0.35) {
    parts.push(`They prefer conciseness. Keep responses tight and focused (aim for roughly ${Math.min(targetWords, 60)}-${targetWords + 30} words). Every sentence must earn its place. Brevity is respect for their time.`);
  }

  // Formality
  if (profile.formalityRegister > 0.65) {
    parts.push("Their tone is measured and precise. Maintain a thoughtful, composed register. Structured reasoning over casual banter.");
  } else if (profile.formalityRegister < 0.35) {
    parts.push("Their tone is relaxed and conversational. Be warm, natural, and approachable. It's okay to be slightly playful. No stiffness.");
  }

  // Warmth
  if (profile.warmthPreference > 0.6) {
    parts.push("They express appreciation and warmth naturally. Reciprocate with genuine care and encouragement. They value emotional connection alongside information.");
  } else if (profile.warmthPreference < 0.3) {
    parts.push("They prefer a clean, analytical exchange. Focus on substance over sentiment. Be helpful without being effusive.");
  }

  // Pace
  if (profile.pacePreference > 0.65) {
    parts.push("They prefer directness. Lead with the answer, then context. Don't build up — deliver.");
  } else if (profile.pacePreference < 0.35) {
    parts.push("They enjoy the journey of understanding. It's fine to unfold reasoning gradually. Context and nuance are valued.");
  }

  // Negative feedback correction
  if (profile.correctionRate > 0.15) {
    parts.push("CALIBRATION NOTE: Recent exchanges show a higher correction rate. This means your responses may be drifting from what they need. Listen more carefully. Be more precise. Match their intent exactly before elaborating.");
  }

  // Domain awareness
  const topDomains = Object.entries(profile.domainInterests)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);
  if (topDomains.length > 0) {
    parts.push(`Their primary areas of interest: ${topDomains.join(", ")}. Draw connections to these domains when it genuinely adds value.`);
  }

  // Confidence qualifier
  if (confidence < 0.5) {
    parts.push("(Low confidence calibration — these patterns are still forming. Adjust gently, don't over-commit to any single signal.)");
  }

  parts.push("═══ END RESONANCE CALIBRATION ═══");

  return "\n\n" + parts.join("\n");
}

/**
 * Get a compact diagnostic summary of the resonance state.
 * For internal display in the Pro Mode panel, not for the AI.
 */
export function getResonanceDiagnostic(profile: ResonanceProfile): {
  label: string;
  confidence: number;
  dimensions: { name: string; value: number; label: string }[];
} {
  const confidence = Math.min(1, profile.observationCount / 20);

  const dimLabel = (v: number, low: string, mid: string, high: string) =>
    v < 0.35 ? low : v > 0.65 ? high : mid;

  return {
    label: confidence < 0.3 ? "Calibrating…" : confidence < 0.7 ? "Adapting" : "Resonant",
    confidence,
    dimensions: [
      { name: "Expertise", value: profile.expertiseLevel, label: dimLabel(profile.expertiseLevel, "Accessible", "Balanced", "Technical") },
      { name: "Density", value: profile.densityPreference, label: dimLabel(profile.densityPreference, "Concise", "Balanced", "Thorough") },
      { name: "Register", value: profile.formalityRegister, label: dimLabel(profile.formalityRegister, "Casual", "Balanced", "Formal") },
      { name: "Warmth", value: profile.warmthPreference, label: dimLabel(profile.warmthPreference, "Analytical", "Balanced", "Warm") },
      { name: "Pace", value: profile.pacePreference, label: dimLabel(profile.pacePreference, "Exploratory", "Balanced", "Direct") },
    ],
  };
}

/** Reset the resonance profile (for testing or user request) */
export function resetResonanceProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}
