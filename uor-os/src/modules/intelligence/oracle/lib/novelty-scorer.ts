/**
 * novelty-scorer — UOR-native information novelty scoring.
 *
 * Computes a 0–100 novelty score for a topic relative to the user's
 * exploration history. Grounded in the same Hamming-distance principle
 * as the H-score, but applied to the user's knowledge graph.
 *
 * Formula: novelty = semanticDistance × temporalDecay × crossDomainBonus
 */

import type { SearchHistoryEntry } from "./search-history";

/** Simple token-set similarity (Jaccard) between two keyword strings. */
function tokenSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

/** Compute temporal decay — recent explorations reduce novelty more. */
function temporalDecay(searchedAt: string): number {
  const age = Date.now() - new Date(searchedAt).getTime();
  const hours = age / (1000 * 60 * 60);
  // Half-life of 48 hours — after 48h, memory weight drops to 50%
  return Math.pow(0.5, hours / 48);
}

/** Detect the broad domain of a keyword (crude but effective). */
const DOMAIN_PATTERNS: Record<string, RegExp> = {
  physics: /quantum|relativity|particle|physics|atom|photon|gravity|wave|energy|entropy/i,
  biology: /biology|cell|gene|dna|evolution|species|organism|ecology|brain|neuro/i,
  cs: /algorithm|computer|software|programming|data|machine learning|neural|ai|code/i,
  math: /math|algebra|geometry|calculus|theorem|proof|topology|number|equation/i,
  philosophy: /philosophy|epistem|ontology|ethics|logic|consciousness|metaphys|moral/i,
  history: /history|century|empire|war|civilization|ancient|medieval|dynasty|revolution/i,
  art: /art|painting|sculpture|music|film|literature|poetry|dance|theater|renaissance/i,
  economics: /economic|market|finance|trade|capital|monetary|fiscal|supply|demand/i,
};

function detectDomain(keyword: string): string {
  for (const [domain, pattern] of Object.entries(DOMAIN_PATTERNS)) {
    if (pattern.test(keyword)) return domain;
  }
  return "general";
}

export interface NoveltyResult {
  /** 0–100 novelty score */
  score: number;
  /** What the score means in human terms */
  label: string;
  /** Closest prior exploration */
  closestMatch: string | null;
  /** Semantic distance from closest match (0–1) */
  semanticDistance: number;
  /** Whether this represents a cross-domain jump */
  crossDomain: boolean;
  /** The domain detected for this query */
  domain: string;
}

/**
 * Compute the novelty of a keyword given the user's exploration history.
 */
export function computeNovelty(
  keyword: string,
  history: SearchHistoryEntry[]
): NoveltyResult {
  if (history.length === 0) {
    return {
      score: 95,
      label: "Entirely new territory",
      closestMatch: null,
      semanticDistance: 1,
      crossDomain: false,
      domain: detectDomain(keyword),
    };
  }

  const domain = detectDomain(keyword);

  // Find the closest historical match (weighted by temporal recency)
  let maxWeightedSim = 0;
  let closestMatch: string | null = null;

  for (const entry of history) {
    const sim = tokenSimilarity(keyword, entry.keyword);
    const decay = temporalDecay(entry.searched_at || new Date().toISOString());
    const weighted = sim * decay;
    if (weighted > maxWeightedSim) {
      maxWeightedSim = weighted;
      closestMatch = entry.keyword;
    }
  }

  const semanticDistance = 1 - maxWeightedSim;

  // Cross-domain bonus: jumping to a new domain is more novel
  const recentDomains = history.slice(0, 5).map((h) => detectDomain(h.keyword));
  const crossDomain = !recentDomains.includes(domain);
  const crossDomainMultiplier = crossDomain ? 1.15 : 1;

  // Compute raw score
  const rawScore = semanticDistance * crossDomainMultiplier * 100;
  const score = Math.min(99, Math.max(1, Math.round(rawScore)));

  // Human-readable label
  let label: string;
  if (score >= 90) label = "Entirely new territory";
  else if (score >= 70) label = "Largely unexplored";
  else if (score >= 50) label = "Somewhat familiar";
  else if (score >= 30) label = "Related to prior research";
  else label = "Well-explored area";

  return { score, label, closestMatch, semanticDistance, crossDomain, domain };
}
