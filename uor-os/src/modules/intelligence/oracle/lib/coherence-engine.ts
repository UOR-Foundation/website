/**
 * coherence-engine — The cybernetic core.
 *
 * Combines novelty scoring + attention tracking + lens intelligence
 * into actionable adaptive behaviors.
 */

import { computeNovelty, type NoveltyResult } from "./novelty-scorer";
import {
  loadProfile,
  recordEvent,
  recordDomainVisit,
  getPreferredLens,
  type AttentionProfile,
} from "./attention-tracker";
import { generateLensSuggestion, dismissLensSuggestion } from "./lens-intelligence";
import type { LensBlueprint } from "./knowledge-lenses";
import type { SearchHistoryEntry } from "./search-history";

export interface CoherenceState {
  /** Session coherence: 0 = scattered, 1 = deeply focused */
  sessionCoherence: number;
  /** Novelty of the current topic */
  novelty: NoveltyResult;
  /** Suggested lens (null if no strong signal) — legacy string for backward compat */
  suggestedLens: string | null;
  /** Why the lens was suggested */
  suggestedLensReason: string | null;
  /** Full blueprint suggestion from intelligence engine */
  suggestedBlueprint: LensBlueprint | null;
  /** Number of consecutive topics in the same domain */
  domainDepth: number;
  /** Current attention profile */
  profile: AttentionProfile;
}

/**
 * Compute the full coherence state for a new topic.
 */
export function computeCoherence(
  keyword: string,
  history: SearchHistoryEntry[]
): CoherenceState {
  const novelty = computeNovelty(keyword, history);

  // Record the domain visit
  recordDomainVisit(novelty.domain);

  // Record the search as an attention event
  recordEvent({
    type: "session_start",
    topic: keyword,
    value: novelty.score,
    description: `Explored "${keyword}" — novelty ${novelty.score}% (${novelty.label})${novelty.crossDomain ? " [cross-domain jump]" : ""}`,
  });

  const profile = loadProfile();

  // Compute domain depth
  const recentDomains = profile.domainHistory.slice(-10).map((d) => d.domain);
  const domainDepth = recentDomains.filter((d) => d === novelty.domain).length;

  // Session coherence
  const sessionCoherence = recentDomains.length > 0
    ? recentDomains.filter((d) => d === novelty.domain).length / recentDomains.length
    : 0.5;

  // ── Lens Intelligence: generate dynamic suggestion ──
  const suggestedBlueprint = generateLensSuggestion(novelty.domain);

  // Extract legacy fields from blueprint (or fall back to simple rules)
  let suggestedLens: string | null = null;
  let suggestedLensReason: string | null = null;

  if (suggestedBlueprint) {
    suggestedLens = suggestedBlueprint.label;
    suggestedLensReason = suggestedBlueprint.generatedReason || suggestedBlueprint.description;
  } else {
    // Fallback: simple preference-based suggestion
    const preferredLens = getPreferredLens(novelty.domain);
    if (preferredLens) {
      suggestedLens = preferredLens;
      suggestedLensReason = `You usually prefer this lens for ${novelty.domain} topics`;
    } else if (novelty.score >= 85) {
      suggestedLens = "encyclopedia";
      suggestedLensReason = "New territory — encyclopedia lens gives a solid overview";
    }
  }

  // Log the suggestion transparently
  if (suggestedLens) {
    recordEvent({
      type: "lens_switch",
      topic: keyword,
      value: suggestedLens,
      description: `Lens suggestion: "${suggestedLens}" — ${suggestedLensReason}`,
    });
  }

  return {
    sessionCoherence,
    novelty,
    suggestedLens,
    suggestedLensReason,
    suggestedBlueprint,
    domainDepth,
    profile,
  };
}

/**
 * Record that the user spent time reading a topic.
 */
export function recordDwell(topic: string, seconds: number): void {
  recordEvent({
    type: "dwell",
    topic,
    value: seconds,
    description: `Read "${topic}" for ${Math.round(seconds)}s`,
  });
}

/**
 * Record that the user switched lens on a topic.
 */
export function recordLensSwitch(topic: string, lensId: string, domain: string): void {
  recordEvent({
    type: "lens_switch",
    topic: domain,
    value: lensId,
    description: `Switched to "${lensId}" lens while reading "${topic}"`,
  });
}

/**
 * Record scroll depth.
 */
export function recordScrollDepth(topic: string, depth: number): void {
  recordEvent({
    type: "scroll",
    topic,
    value: depth,
    description: `Scrolled to ${Math.round(depth * 100)}% of "${topic}"`,
  });
}

/** Dismiss a dynamic lens suggestion */
export { dismissLensSuggestion };
