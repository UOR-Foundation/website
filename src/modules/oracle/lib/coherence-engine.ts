/**
 * coherence-engine — The cybernetic core.
 *
 * Combines novelty scoring + attention tracking into actionable
 * adaptive behaviors: lens recommendations, session coherence,
 * and signal-to-noise optimization.
 *
 * All decisions are transparently logged in the user's context journal.
 */

import { computeNovelty, type NoveltyResult } from "./novelty-scorer";
import {
  loadProfile,
  recordEvent,
  recordDomainVisit,
  getPreferredLens,
  type AttentionProfile,
} from "./attention-tracker";
import type { SearchHistoryEntry } from "./search-history";

export interface CoherenceState {
  /** Session coherence: 0 = scattered, 1 = deeply focused */
  sessionCoherence: number;
  /** Novelty of the current topic */
  novelty: NoveltyResult;
  /** Suggested lens (null if no strong signal) */
  suggestedLens: string | null;
  /** Why the lens was suggested */
  suggestedLensReason: string | null;
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

  // Compute domain depth: how many recent searches are in the same domain
  const recentDomains = profile.domainHistory.slice(-10).map((d) => d.domain);
  const domainDepth = recentDomains.filter((d) => d === novelty.domain).length;

  // Session coherence: ratio of same-domain searches in last 10
  const sessionCoherence = recentDomains.length > 0
    ? recentDomains.filter((d) => d === novelty.domain).length / recentDomains.length
    : 0.5;

  // Lens suggestion based on domain preference
  const preferredLens = getPreferredLens(novelty.domain);
  let suggestedLens: string | null = null;
  let suggestedLensReason: string | null = null;

  if (preferredLens) {
    suggestedLens = preferredLens;
    suggestedLensReason = `You usually prefer this lens for ${novelty.domain} topics`;
  } else if (domainDepth >= 3) {
    // Going deep — suggest expert lens
    suggestedLens = "expert";
    suggestedLensReason = `You're going deep into ${novelty.domain} — expert view may help`;
  } else if (novelty.score >= 85) {
    // Very novel — suggest simple lens for first encounter
    suggestedLens = "encyclopedia";
    suggestedLensReason = "New territory — encyclopedia lens gives a solid overview";
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
