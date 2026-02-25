/**
 * SignalRelevance — Privacy-Preserving Contextual Signal Scorer
 * ═════════════════════════════════════════════════════════════
 *
 * Scores inbound information against the user's private context
 * profile to derive a continuous relevance metric (0–1).
 *
 * PRIVACY GUARANTEE:
 *   The user's context profile NEVER leaves the browser.
 *   All scoring is performed locally via tag intersection.
 *   No context data is sent to any server or API.
 *
 * UOR Alignment:
 *   - User context = local UOR Frame (set of bindings in a private context)
 *   - Inbound signal = Observable with stratum/tags
 *   - Relevance score = morphism:Measure from signal space → user frame
 *   - SNR = Σ(relevant) / Σ(all) — observer's integration capacity (Φ)
 *
 * The scorer uses weighted Jaccard similarity between signal tags
 * and user interest tags, boosted by recency and source trust.
 *
 * @module hologram-ui/engine/signalRelevance
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface UserContextProfile {
  /** Interest tags with weights (0–1). Private, never transmitted. */
  interests: Record<string, number>;
  /** Active task/project tags */
  activeTasks: string[];
  /** Recent interaction domains (auto-populated) */
  recentDomains: string[];
  /** Triadic phase preference: learn | work | play */
  phaseAffinity: Record<string, number>;
  /** Last updated timestamp */
  updatedAt: number;
}

export interface InboundSignal {
  /** Unique identifier */
  id: string;
  /** Human-readable message */
  message: string;
  /** Source system (e.g., "chat", "notification", "system", "agent") */
  source: string;
  /** Tags describing the signal's domain */
  tags: string[];
  /** Triadic phase: learn | work | play | system */
  phase?: string;
  /** Timestamp */
  timestamp: number;
  /** Priority from the distraction system */
  priority: "critical" | "high" | "medium" | "low" | "ambient";
  /** Optional: source trust score (0–1) */
  sourceTrust?: number;
}

export interface ScoredSignal extends InboundSignal {
  /** Relevance to user context (0–1) */
  relevance: number;
  /** Whether this is signal (true) or noise (false) based on threshold */
  isSignal: boolean;
  /** Breakdown of how relevance was computed */
  relevanceBreakdown: {
    tagMatch: number;
    phaseAlignment: number;
    recencyBoost: number;
    trustWeight: number;
  };
}

// ── Constants ────────────────────────────────────────────────────────────

const CONTEXT_STORAGE_KEY = "hologram:user-context-profile";
const SIGNAL_THRESHOLD = 0.3; // Below this = noise

const PRIORITY_BOOST: Record<string, number> = {
  critical: 0.4,
  high: 0.2,
  medium: 0.0,
  low: -0.1,
  ambient: -0.2,
};

// ── Context Profile Management (localStorage only) ───────────────────

export function loadContextProfile(): UserContextProfile {
  try {
    const raw = localStorage.getItem(CONTEXT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return createDefaultProfile();
}

export function saveContextProfile(profile: UserContextProfile): void {
  profile.updatedAt = Date.now();
  localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(profile));
}

export function createDefaultProfile(): UserContextProfile {
  return {
    interests: {},
    activeTasks: [],
    recentDomains: [],
    phaseAffinity: { learn: 0.33, work: 0.33, play: 0.33 },
    updatedAt: Date.now(),
  };
}

/**
 * Learn from user interactions — updates interest weights.
 * Called when user clicks/engages with content.
 */
export function reinforceInterest(
  profile: UserContextProfile,
  tags: string[],
  strength: number = 0.1,
): UserContextProfile {
  const updated = { ...profile, interests: { ...profile.interests } };
  for (const tag of tags) {
    const current = updated.interests[tag] ?? 0;
    // Exponential moving average toward 1.0
    updated.interests[tag] = Math.min(1, current + strength * (1 - current));
  }
  // Decay all other interests slightly (attention is finite)
  const decayFactor = 0.995;
  for (const key of Object.keys(updated.interests)) {
    if (!tags.includes(key)) {
      updated.interests[key] *= decayFactor;
      if (updated.interests[key] < 0.01) delete updated.interests[key];
    }
  }
  updated.updatedAt = Date.now();
  return updated;
}

/**
 * Update recent domains from navigation/interaction.
 */
export function addRecentDomain(
  profile: UserContextProfile,
  domain: string,
): UserContextProfile {
  const domains = [domain, ...profile.recentDomains.filter((d) => d !== domain)].slice(0, 20);
  return { ...profile, recentDomains: domains, updatedAt: Date.now() };
}

// ── Scoring Engine ───────────────────────────────────────────────────────

/**
 * Score a signal against user context. Pure function, no side effects.
 * All computation happens locally — user context never leaves the browser.
 */
export function scoreSignal(
  signal: InboundSignal,
  profile: UserContextProfile,
): ScoredSignal {
  // 1. Tag match: weighted Jaccard between signal tags and user interests
  let tagMatch = 0;
  if (signal.tags.length > 0) {
    let matchSum = 0;
    let totalWeight = 0;
    for (const tag of signal.tags) {
      const weight = profile.interests[tag] ?? 0;
      const domainBoost = profile.recentDomains.includes(tag) ? 0.2 : 0;
      const taskBoost = profile.activeTasks.includes(tag) ? 0.3 : 0;
      matchSum += Math.min(1, weight + domainBoost + taskBoost);
      totalWeight += 1;
    }
    tagMatch = totalWeight > 0 ? matchSum / totalWeight : 0;
  }

  // 2. Phase alignment
  let phaseAlignment = 0.5; // neutral default
  if (signal.phase && profile.phaseAffinity[signal.phase] !== undefined) {
    phaseAlignment = profile.phaseAffinity[signal.phase];
  }

  // 3. Recency boost (signals about recently visited domains score higher)
  const recentOverlap = signal.tags.filter((t) =>
    profile.recentDomains.slice(0, 5).includes(t),
  ).length;
  const recencyBoost = Math.min(0.3, recentOverlap * 0.1);

  // 4. Source trust
  const trustWeight = signal.sourceTrust ?? 0.5;

  // 5. Priority boost
  const priorityAdj = PRIORITY_BOOST[signal.priority] ?? 0;

  // Composite relevance (weighted blend)
  const relevance = Math.max(0, Math.min(1,
    tagMatch * 0.4 +
    phaseAlignment * 0.15 +
    recencyBoost * 0.15 +
    trustWeight * 0.15 +
    priorityAdj +
    0.15, // base so even unknown signals have some floor
  ));

  return {
    ...signal,
    relevance,
    isSignal: relevance >= SIGNAL_THRESHOLD,
    relevanceBreakdown: {
      tagMatch,
      phaseAlignment,
      recencyBoost,
      trustWeight,
    },
  };
}

/**
 * Compute aggregate SNR for a batch of scored signals.
 * Returns a ratio: signalCount / totalCount.
 */
export function computeBatchSNR(signals: ScoredSignal[]): number {
  if (signals.length === 0) return 1; // No signals = perfect quiet
  const signalCount = signals.filter((s) => s.isSignal).length;
  return signalCount / signals.length;
}
