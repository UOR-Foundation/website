/**
 * Resonance Observer — Multi-Loop Cybernetic Feedback Engine
 * ═══════════════════════════════════════════════════════════
 *
 * Implements Wiener's cybernetic principle across four timescales:
 *
 *   μ-loop  (within exchange)  →  Did this response land? Response coherence.
 *   σ-loop  (per session)      →  Session rhythm, temporal patterns, engagement arc.
 *   Σ-loop  (across sessions)  →  Long-term profile evolution, encrypted cloud persistence.
 *   Ω-loop  (self-reflection)  →  Meta-evaluation: is the feedback loop itself improving?
 *
 * The optimization function is RESONANCE — the state where Lumen's responses
 * match the user's natural frequency so precisely that understanding feels
 * effortless. Every dimension converges toward this attractor.
 *
 * Constitutional constraint: the user's time and attention are sacred.
 * The profile exists to REDUCE cognitive load, never increase it.
 *
 * Storage architecture:
 *   L1 (localStorage) — hot cache, instant reads
 *   L2 (Data Bank)    — AES-256-GCM encrypted, cloud-synced, sovereign
 *
 * The user can view their profile at any time (sovereignty).
 * The server never sees plaintext (zero-knowledge).
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

  // ── σ-loop: Session-level signals ─────────────────────────────────
  /** Session count — how many distinct sessions the user has had */
  sessionCount: number;
  /** Average session duration in minutes */
  avgSessionDuration: number;
  /** Time-of-day preference distribution [morning, afternoon, evening, night] */
  temporalPreference: [number, number, number, number];
  /** Average exchanges per session */
  avgExchangesPerSession: number;
  /** Session engagement arc — does user ask more/fewer questions over time? (0=declining, 1=increasing) */
  engagementArc: number;

  // ── μ-loop: Response coherence tracking ───────────────────────────
  /** How often the user's next message continues the thread (vs. topic change) */
  threadContinuityRate: number;
  /** How often the user expresses explicit satisfaction signals */
  satisfactionRate: number;
  /** Response-to-reply latency ratio — if they reply quickly, response resonated */
  replyVelocityTrend: number;

  // ── Ω-loop: Self-reflection meta-signals ──────────────────────────
  /** Rolling resonance score — overall quality of the feedback loop itself */
  resonanceScore: number;
  /** Rate of improvement — is the loop converging? (positive = improving) */
  convergenceRate: number;
  /** Number of self-reflections performed */
  reflectionCount: number;
  /** Last reflection timestamp */
  lastReflectionAt: number;

  // ── Cloud sync metadata ───────────────────────────────────────────
  /** Last cloud sync timestamp */
  lastCloudSyncAt: number;
  /** Profile version for conflict resolution */
  profileVersion: number;

  // ── History snapshots (recorded on each Ω-loop reflection) ────────
  /** Rolling history of resonance snapshots — max 60 entries */
  history: ResonanceSnapshot[];
}

/** A point-in-time snapshot recorded during Ω-loop self-reflection */
export interface ResonanceSnapshot {
  /** Timestamp of the snapshot */
  t: number;
  /** Resonance score at this point */
  r: number;
  /** Convergence rate (delta) */
  c: number;
  /** Satisfaction rate */
  s: number;
  /** Correction rate */
  x: number;
  /** Observation count at time of snapshot */
  n: number;
  /** Per-dimension values at this point */
  d?: {
    expertise: number;
    density: number;
    formality: number;
    warmth: number;
    pace: number;
  };
}

// ── Session Tracking ──────────────────────────────────────────────────

interface SessionState {
  startedAt: number;
  exchangeCount: number;
  lastExchangeAt: number;
  replyLatencies: number[];
  satisfactionSignals: number;
  correctionSignals: number;
  topicChanges: number;
  lastUserTopic: string[];
}

let currentSession: SessionState | null = null;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity = new session

function getOrCreateSession(): SessionState {
  const now = Date.now();
  if (currentSession && (now - currentSession.lastExchangeAt) < SESSION_TIMEOUT_MS) {
    return currentSession;
  }
  // New session — finalize old one if exists
  if (currentSession) {
    finalizeSession(currentSession);
  }
  currentSession = {
    startedAt: now,
    exchangeCount: 0,
    lastExchangeAt: now,
    replyLatencies: [],
    satisfactionSignals: 0,
    correctionSignals: 0,
    topicChanges: 0,
    lastUserTopic: [],
  };
  return currentSession;
}

function finalizeSession(session: SessionState): void {
  const profile = loadResonanceProfile();
  const duration = (session.lastExchangeAt - session.startedAt) / 60000; // minutes
  const n = profile.sessionCount;

  profile.sessionCount = n + 1;
  profile.avgSessionDuration = ema(profile.avgSessionDuration, duration, n);
  profile.avgExchangesPerSession = ema(profile.avgExchangesPerSession, session.exchangeCount, n);

  // Engagement arc: ratio of exchanges in 2nd half vs 1st half
  // Simplified: if they sent more in the session than avg, engagement is up
  const engagementSignal = session.exchangeCount > profile.avgExchangesPerSession ? 0.7 : 0.3;
  profile.engagementArc = ema(profile.engagementArc, engagementSignal, n);

  saveResonanceProfile(profile);
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
  isSatisfaction: boolean;
  isTopicChange: boolean;
  topicTokens: string[];
  replyLatencyMs: number;
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

/** Satisfaction indicators */
const SATISFACTION_PATTERNS = [
  /^(great|perfect|exactly|wonderful|excellent|brilliant|awesome)/i,
  /that'?s (exactly|precisely) (what|right)/i,
  /thank(s| you)/i,
  /this (is|was) (very )?helpful/i,
  /^(yes|yep|yeah),? (that|this)/i,
  /well (said|put|explained)/i,
  /makes? (perfect )?sense/i,
  /^love (this|it|that)/i,
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

function extractSignals(
  userMessage: string,
  assistantResponse: string,
  previousUserMessage?: string,
  lastExchangeTimestamp?: number,
): ExchangeSignals {
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

  // Satisfaction detection (μ-loop signal)
  const isSatisfaction = SATISFACTION_PATTERNS.some(p => p.test(userMessage));

  // Topic change detection — compare current topic tokens with previous
  const topicTokens: string[] = [];
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const hits = lowerWords.filter(w => keywords.includes(w)).length;
    if (hits > 0) topicTokens.push(domain);
  }

  // Topic change: if current topics don't overlap with previous user's topics
  let isTopicChange = false;
  if (previousUserMessage) {
    const prevWords = previousUserMessage.toLowerCase().split(/\s+/);
    const prevTopics: string[] = [];
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      if (prevWords.some(w => keywords.includes(w))) prevTopics.push(domain);
    }
    if (prevTopics.length > 0 && topicTokens.length > 0) {
      isTopicChange = !topicTokens.some(t => prevTopics.includes(t));
    }
  }

  // Reply latency (time between last exchange and this one)
  const replyLatencyMs = lastExchangeTimestamp ? Date.now() - lastExchangeTimestamp : 0;

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
    isSatisfaction,
    isTopicChange,
    topicTokens,
    replyLatencyMs,
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
const DATA_BANK_SLOT = "resonance:profile:v2";

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
    // σ-loop
    sessionCount: 0,
    avgSessionDuration: 0,
    temporalPreference: [0.25, 0.25, 0.25, 0.25],
    avgExchangesPerSession: 0,
    engagementArc: 0.5,
    // μ-loop
    threadContinuityRate: 0.5,
    satisfactionRate: 0,
    replyVelocityTrend: 0.5,
    // Ω-loop
    resonanceScore: 0.5,
    convergenceRate: 0,
    reflectionCount: 0,
    lastReflectionAt: 0,
    // Cloud sync
    lastCloudSyncAt: 0,
    profileVersion: 1,
    // History
    history: [],
  };
}

// ── Public API ─────────────────────────────────────────────────────────

/** Load the resonance profile from localStorage */
export function loadResonanceProfile(): ResonanceProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate shape + migrate from v1 if needed
      if (typeof parsed.expertiseLevel === "number" && typeof parsed.observationCount === "number") {
        return {
          ...createDefaultProfile(),
          ...parsed,
        };
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

// ── Cloud Persistence (Data Bank) ─────────────────────────────────────

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Sync the resonance profile to the encrypted Data Bank.
 * Debounced — batches rapid updates into a single cloud write.
 */
export async function syncProfileToCloud(userId: string): Promise<void> {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);

  syncDebounceTimer = setTimeout(async () => {
    try {
      const { writeSlot } = await import("@/modules/data-bank/lib/sync");
      const profile = loadResonanceProfile();
      profile.lastCloudSyncAt = Date.now();
      profile.profileVersion += 1;
      saveResonanceProfile(profile);
      await writeSlot(userId, DATA_BANK_SLOT, JSON.stringify(profile));
    } catch {
      // Silent failure — will retry on next exchange
    }
  }, 5000); // 5 second debounce
}

/**
 * Load the resonance profile from the encrypted Data Bank.
 * Used on boot to restore the long-term profile.
 */
export async function loadProfileFromCloud(userId: string): Promise<ResonanceProfile | null> {
  try {
    const { readSlot } = await import("@/modules/data-bank/lib/sync");
    const slot = await readSlot(userId, DATA_BANK_SLOT);
    if (!slot) return null;

    const cloudProfile = JSON.parse(slot.value) as ResonanceProfile;

    // Merge: take the higher-observation-count version
    const localProfile = loadResonanceProfile();
    if (cloudProfile.observationCount > localProfile.observationCount) {
      saveResonanceProfile(cloudProfile);
      return cloudProfile;
    }
    return localProfile;
  } catch {
    return null;
  }
}

// ── Time-of-Day Classification ────────────────────────────────────────

function getTimeSlot(): 0 | 1 | 2 | 3 {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 0;  // morning
  if (h >= 12 && h < 17) return 1; // afternoon
  if (h >= 17 && h < 21) return 2; // evening
  return 3; // night
}

// ── Self-Reflection (Ω-loop) ──────────────────────────────────────────

/**
 * Compute the overall resonance score — meta-evaluation of the feedback loop.
 *
 * A high resonance score means:
 *   - Low correction rate (Lumen is accurate)
 *   - High satisfaction rate (Lumen is helpful)
 *   - High thread continuity (responses are relevant)
 *   - Stable engagement (user keeps coming back)
 *
 * This is the system observing its own observation loop.
 */
function computeResonanceScore(profile: ResonanceProfile): number {
  if (profile.observationCount < 5) return 0.5; // not enough data

  const correctionPenalty = profile.correctionRate * 2; // corrections are expensive
  const satisfactionReward = profile.satisfactionRate * 1.5;
  const continuityReward = profile.threadContinuityRate * 1.0;
  const engagementReward = profile.engagementArc * 0.5;

  const raw = 0.5
    - correctionPenalty
    + satisfactionReward
    + continuityReward * 0.3
    + engagementReward * 0.2;

  return Math.max(0, Math.min(1, raw));
}

/**
 * Self-reflect: should the system adjust its own feedback sensitivity?
 * Called periodically (every ~10 exchanges) to prevent drift.
 */
function selfReflect(profile: ResonanceProfile): ResonanceProfile {
  const newScore = computeResonanceScore(profile);
  const previousScore = profile.resonanceScore;

  // Convergence rate: is the resonance improving?
  const delta = newScore - previousScore;
  profile.convergenceRate = ema(profile.convergenceRate, delta, profile.reflectionCount);
  profile.resonanceScore = ema(profile.resonanceScore, newScore, profile.reflectionCount);
  profile.reflectionCount += 1;
  profile.lastReflectionAt = Date.now();

  // ── Record history snapshot ──────────────────────────────────────
  if (!profile.history) profile.history = [];
  profile.history.push({
    t: Date.now(),
    r: profile.resonanceScore,
    c: profile.convergenceRate,
    s: profile.satisfactionRate,
    x: profile.correctionRate,
    n: profile.observationCount,
    d: {
      expertise: profile.expertiseLevel,
      density: profile.densityPreference,
      formality: profile.formalityRegister,
      warmth: profile.warmthPreference,
      pace: profile.pacePreference,
    },
  });
  // Cap at 60 entries (~600 exchanges of history)
  if (profile.history.length > 60) {
    profile.history = profile.history.slice(-60);
  }

  return profile;
}

// ── Core Observation ──────────────────────────────────────────────────

/**
 * Observe an exchange and update the resonance profile.
 * This is the core cybernetic feedback function — the beating heart.
 *
 * Called after each Lumen exchange completes.
 * Runs all four loops simultaneously:
 *   μ-loop: response coherence within this exchange
 *   σ-loop: session-level patterns
 *   Σ-loop: long-term profile evolution
 *   Ω-loop: self-reflection (every 10 exchanges)
 *
 * Returns the updated profile.
 */
export function observeExchange(
  userMessage: string,
  assistantResponse: string,
  previousUserMessage?: string,
  lastExchangeTimestamp?: number,
  userId?: string,
): ResonanceProfile {
  const profile = loadResonanceProfile();
  const session = getOrCreateSession();
  const signals = extractSignals(userMessage, assistantResponse, previousUserMessage, lastExchangeTimestamp);
  const n = profile.observationCount;

  // ═══ Σ-loop: Long-term dimension updates ═══════════════════════

  // Expertise level
  const expertiseSignal = Math.min(1,
    signals.technicalTermDensity * 5 + (signals.avgWordLength > 5 ? 0.3 : 0),
  );
  profile.expertiseLevel = ema(profile.expertiseLevel, expertiseSignal, n);

  // Density preference
  const densitySignal = Math.min(1, signals.userWordCount / 80);
  profile.densityPreference = ema(profile.densityPreference, densitySignal, n);

  // Formality register
  profile.formalityRegister = ema(profile.formalityRegister, signals.formalityScore, n);

  // Warmth preference
  const warmthSignal = Math.min(1, signals.emotionalMarkers / 3);
  profile.warmthPreference = ema(profile.warmthPreference, warmthSignal, n);

  // Pace preference
  const paceSignal = signals.userWordCount < 15 ? 0.8 :
                     signals.userWordCount < 40 ? 0.5 : 0.2;
  profile.pacePreference = ema(profile.pacePreference, paceSignal, n);

  // Message length average
  profile.avgMessageLength = ema(profile.avgMessageLength, signals.userWordCount, n);

  // Correction rate (negative feedback)
  profile.correctionRate = ema(profile.correctionRate, signals.isCorrection ? 1 : 0, n);

  // Follow-up rate (positive engagement)
  profile.followUpRate = ema(profile.followUpRate, signals.isFollowUp ? 1 : 0, n);

  // Domain interests
  for (const topic of signals.topicTokens) {
    profile.domainInterests[topic] = (profile.domainInterests[topic] || 0) + 1;
  }

  // ═══ μ-loop: Response coherence tracking ═══════════════════════

  // Satisfaction tracking
  profile.satisfactionRate = ema(profile.satisfactionRate, signals.isSatisfaction ? 1 : 0, n);

  // Thread continuity (inverse of topic change)
  profile.threadContinuityRate = ema(
    profile.threadContinuityRate,
    signals.isTopicChange ? 0.2 : 0.8,
    n,
  );

  // Reply velocity — fast replies suggest resonance
  if (signals.replyLatencyMs > 0 && signals.replyLatencyMs < 600000) { // within 10 min
    const velocitySignal = signals.replyLatencyMs < 30000 ? 0.9 : // < 30s = very engaged
                           signals.replyLatencyMs < 120000 ? 0.6 : // < 2min = engaged
                           0.3; // slower = thinking or disengaged
    profile.replyVelocityTrend = ema(profile.replyVelocityTrend, velocitySignal, n);
  }

  // ═══ σ-loop: Session tracking ══════════════════════════════════

  session.exchangeCount += 1;
  session.lastExchangeAt = Date.now();
  if (signals.isCorrection) session.correctionSignals += 1;
  if (signals.isSatisfaction) session.satisfactionSignals += 1;
  if (signals.isTopicChange) session.topicChanges += 1;
  if (signals.replyLatencyMs > 0) session.replyLatencies.push(signals.replyLatencyMs);
  session.lastUserTopic = signals.topicTokens;

  // Temporal preference update
  const timeSlot = getTimeSlot();
  const tempPref = [...profile.temporalPreference] as [number, number, number, number];
  for (let i = 0; i < 4; i++) {
    tempPref[i] = ema(tempPref[i], i === timeSlot ? 1 : 0, n);
  }
  profile.temporalPreference = tempPref;

  // ═══ Ω-loop: Self-reflection (every 10 exchanges) ═════════════

  profile.observationCount = n + 1;
  profile.updatedAt = Date.now();

  if (profile.observationCount % 10 === 0) {
    selfReflect(profile);
    // Project to context graph on self-reflection
    if (userId) {
      import("./contextGraphBridge").then(({ projectProfileToGraph }) => {
        projectProfileToGraph(userId, profile).catch(() => {});
      }).catch(() => {});
    }
  }

  // Persist to L1
  saveResonanceProfile(profile);

  // Persist to L2 (encrypted cloud) — debounced
  if (userId) {
    syncProfileToCloud(userId).catch(() => {});
  }

  return profile;
}

// ── Directive Compilation ─────────────────────────────────────────────

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

  // ── μ-loop signals: Response coherence feedback ─────────────────
  if (profile.satisfactionRate > 0.4) {
    parts.push("Recent exchanges show strong resonance — maintain this approach. Your responses are landing well.");
  }

  if (profile.threadContinuityRate > 0.7) {
    parts.push("They tend to go deep on topics rather than jumping around. Stay focused and build on the thread.");
  } else if (profile.threadContinuityRate < 0.3) {
    parts.push("They explore many topics across exchanges. Be ready for context switches. Each response should be self-contained.");
  }

  // ── σ-loop signals: Session-level awareness ─────────────────────
  if (profile.sessionCount > 3) {
    const peakSlot = profile.temporalPreference.indexOf(Math.max(...profile.temporalPreference));
    const timeLabels = ["morning", "afternoon", "evening", "late night"];
    parts.push(`They frequently engage during the ${timeLabels[peakSlot]}. Calibrate energy and tone accordingly.`);
  }

  if (profile.avgSessionDuration > 0 && profile.avgSessionDuration < 5) {
    parts.push("Their sessions tend to be focused and brief. Maximize value per exchange. No preamble.");
  } else if (profile.avgSessionDuration > 20) {
    parts.push("They engage in extended sessions. It's okay to be more expansive and exploratory. They have the patience for depth.");
  }

  // ── Negative feedback correction ────────────────────────────────
  if (profile.correctionRate > 0.15) {
    parts.push("CALIBRATION NOTE: Recent exchanges show a higher correction rate. This means your responses may be drifting from what they need. Listen more carefully. Be more precise. Match their intent exactly before elaborating.");
  }

  // ── Ω-loop: Self-reflection signal ──────────────────────────────
  if (profile.resonanceScore < 0.35 && profile.observationCount > 15) {
    parts.push("META-CALIBRATION: The feedback loop indicates suboptimal resonance. Slow down. Ask clarifying questions before assuming. Precision over speed. The user's time is sacred.");
  } else if (profile.resonanceScore > 0.75 && profile.convergenceRate > 0) {
    parts.push("The communication loop is in strong resonance. Continue this pattern. Trust has been built through consistency.");
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

// ── Diagnostic API (for user-viewable Resonance Panel) ────────────────

/**
 * Get a comprehensive diagnostic of the resonance state.
 * For the sovereign user-viewable panel — full transparency.
 */
export function getResonanceDiagnostic(profile: ResonanceProfile): {
  label: string;
  confidence: number;
  resonanceScore: number;
  convergenceRate: number;
  dimensions: { name: string; value: number; label: string; description: string }[];
  sessionInsights: { label: string; value: string }[];
  loopHealth: { loop: string; status: "calibrating" | "adapting" | "resonant"; detail: string }[];
} {
  const confidence = Math.min(1, profile.observationCount / 20);

  const dimLabel = (v: number, low: string, mid: string, high: string) =>
    v < 0.35 ? low : v > 0.65 ? high : mid;

  const dimensions = [
    { name: "Expertise", value: profile.expertiseLevel, label: dimLabel(profile.expertiseLevel, "Accessible", "Balanced", "Technical"), description: "How technical your language tends to be" },
    { name: "Density", value: profile.densityPreference, label: dimLabel(profile.densityPreference, "Concise", "Balanced", "Thorough"), description: "Your preferred response depth" },
    { name: "Register", value: profile.formalityRegister, label: dimLabel(profile.formalityRegister, "Casual", "Balanced", "Formal"), description: "Your communication formality" },
    { name: "Warmth", value: profile.warmthPreference, label: dimLabel(profile.warmthPreference, "Analytical", "Balanced", "Warm"), description: "Emotional tone preference" },
    { name: "Pace", value: profile.pacePreference, label: dimLabel(profile.pacePreference, "Exploratory", "Balanced", "Direct"), description: "How directly you prefer answers" },
    { name: "Continuity", value: profile.threadContinuityRate, label: dimLabel(profile.threadContinuityRate, "Explorer", "Balanced", "Deep-diver"), description: "Topic focus pattern" },
    { name: "Satisfaction", value: profile.satisfactionRate, label: dimLabel(profile.satisfactionRate, "Calibrating", "Growing", "Resonant"), description: "Response alignment quality" },
  ];

  const timeLabels = ["Morning", "Afternoon", "Evening", "Night"];
  const peakSlot = profile.temporalPreference.indexOf(Math.max(...profile.temporalPreference));

  const sessionInsights = [
    { label: "Sessions", value: `${profile.sessionCount}` },
    { label: "Avg Duration", value: profile.avgSessionDuration > 0 ? `${Math.round(profile.avgSessionDuration)}m` : "—" },
    { label: "Peak Time", value: profile.sessionCount > 2 ? timeLabels[peakSlot] : "—" },
    { label: "Exchanges", value: `${profile.observationCount}` },
    { label: "Avg/Session", value: profile.avgExchangesPerSession > 0 ? `${Math.round(profile.avgExchangesPerSession)}` : "—" },
  ];

  const loopHealth: { loop: string; status: "calibrating" | "adapting" | "resonant"; detail: string }[] = [
    {
      loop: "μ Response",
      status: profile.satisfactionRate > 0.4 ? "resonant" : profile.observationCount > 5 ? "adapting" : "calibrating",
      detail: "Per-exchange coherence tracking",
    },
    {
      loop: "σ Session",
      status: profile.sessionCount > 5 ? "resonant" : profile.sessionCount > 1 ? "adapting" : "calibrating",
      detail: "Session rhythm and temporal patterns",
    },
    {
      loop: "Σ Long-term",
      status: confidence > 0.7 ? "resonant" : confidence > 0.3 ? "adapting" : "calibrating",
      detail: "Cross-session profile evolution",
    },
    {
      loop: "Ω Reflection",
      status: profile.reflectionCount > 3 && profile.convergenceRate > 0 ? "resonant" :
              profile.reflectionCount > 0 ? "adapting" : "calibrating",
      detail: "Meta-evaluation of the loop itself",
    },
  ];

  return {
    label: confidence < 0.3 ? "Calibrating…" : confidence < 0.7 ? "Adapting" : "Resonant",
    confidence,
    resonanceScore: profile.resonanceScore,
    convergenceRate: profile.convergenceRate,
    dimensions,
    sessionInsights,
    loopHealth,
  };
}

/** Reset the resonance profile (for testing or user request) */
export function resetResonanceProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}
