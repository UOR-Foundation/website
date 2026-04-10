/**
 * lens-intelligence — Adaptive lens recommendation engine.
 *
 * Analyzes the user's attention profile (dwell time, scroll depth,
 * domain history, lens switches) to detect behavioral patterns and
 * generate personalized lens suggestions with transparent reasoning.
 */

import { loadProfile, type AttentionProfile } from "./attention-tracker";
import {
  type LensBlueprint,
  type LensParams,
  type RecommendedSource,
  PRESET_BLUEPRINTS,
  cloneBlueprint,
} from "./knowledge-lenses";

/* ── Domain → Source Recommendations ── */

const DOMAIN_SOURCES: Record<string, RecommendedSource[]> = {
  physics: [
    { domain: "arxiv.org", reason: "Preprint research papers in physics", qualityScore: 96, enabled: true },
    { domain: "nature.com", reason: "Peer-reviewed physics research", qualityScore: 97, enabled: true },
    { domain: "phys.org", reason: "Physics news and discoveries", qualityScore: 72, enabled: true },
  ],
  biology: [
    { domain: "pubmed.ncbi.nlm.nih.gov", reason: "Biomedical research database", qualityScore: 96, enabled: true },
    { domain: "nature.com", reason: "Top-tier biological sciences", qualityScore: 97, enabled: true },
    { domain: "cell.com", reason: "Molecular and cellular biology", qualityScore: 94, enabled: true },
  ],
  cs: [
    { domain: "arxiv.org", reason: "CS research preprints", qualityScore: 96, enabled: true },
    { domain: "acm.org", reason: "Computing research association", qualityScore: 89, enabled: true },
    { domain: "ieee.org", reason: "Engineering and technology standards", qualityScore: 90, enabled: true },
  ],
  math: [
    { domain: "arxiv.org", reason: "Mathematics preprints", qualityScore: 96, enabled: true },
    { domain: "mathworld.wolfram.com", reason: "Comprehensive math reference", qualityScore: 88, enabled: true },
  ],
  philosophy: [
    { domain: "plato.stanford.edu", reason: "Stanford Encyclopedia of Philosophy", qualityScore: 95, enabled: true },
    { domain: "iep.utm.edu", reason: "Internet Encyclopedia of Philosophy", qualityScore: 85, enabled: true },
  ],
  history: [
    { domain: "britannica.com", reason: "Authoritative historical reference", qualityScore: 95, enabled: true },
    { domain: "smithsonianmag.com", reason: "History and culture", qualityScore: 78, enabled: true },
  ],
  art: [
    { domain: "smithsonianmag.com", reason: "Arts and culture coverage", qualityScore: 78, enabled: true },
    { domain: "theatlantic.com", reason: "Arts criticism and essays", qualityScore: 74, enabled: true },
  ],
  economics: [
    { domain: "worldbank.org", reason: "Global economic data", qualityScore: 88, enabled: true },
    { domain: "economist.com", reason: "Economic analysis", qualityScore: 77, enabled: true },
    { domain: "oecd.org", reason: "Economic policy research", qualityScore: 88, enabled: true },
  ],
};

/* ── Dismissed suggestion tracking ── */

const DISMISSED_KEY = "uor:lens-dismissed";

function getDismissedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch { return []; }
}

export function dismissLensSuggestion(id: string): void {
  const dismissed = getDismissedIds();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed.slice(-50)));
  }
}

/* ── Pattern Detection ── */

interface DetectedPattern {
  type: "domain-depth" | "lens-preference" | "cross-domain" | "dwell-preference";
  domain: string;
  details: string;
  confidence: number;
}

function detectPatterns(profile: AttentionProfile, currentDomain: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // 1. Domain depth — user exploring same domain repeatedly
  const recentDomains = profile.domainHistory.slice(-15).map(d => d.domain);
  const domainCounts: Record<string, number> = {};
  for (const d of recentDomains) domainCounts[d] = (domainCounts[d] || 0) + 1;

  if (domainCounts[currentDomain] && domainCounts[currentDomain] >= 3) {
    patterns.push({
      type: "domain-depth",
      domain: currentDomain,
      details: `${domainCounts[currentDomain]} recent explorations in ${currentDomain}`,
      confidence: Math.min(0.95, 0.5 + domainCounts[currentDomain] * 0.1),
    });
  }

  // 2. Lens preference — user repeatedly switches to a specific lens for a domain
  if (profile.lensPreferences[currentDomain]) {
    const preferredLens = profile.lensPreferences[currentDomain];
    patterns.push({
      type: "lens-preference",
      domain: currentDomain,
      details: `Prefers "${preferredLens}" for ${currentDomain} topics`,
      confidence: 0.8,
    });
  }

  // 3. Cross-domain jumps — exploring connections
  const lastDomain = recentDomains[recentDomains.length - 1];
  if (lastDomain && lastDomain !== currentDomain) {
    const uniqueRecent = new Set(recentDomains.slice(-5));
    if (uniqueRecent.size >= 3) {
      patterns.push({
        type: "cross-domain",
        domain: currentDomain,
        details: `Cross-domain exploration: ${Array.from(uniqueRecent).join(" → ")}`,
        confidence: 0.6,
      });
    }
  }

  // 4. Dwell preference — user reads long articles deeply
  if (profile.avgScrollDepth > 0.7 && profile.totalDwellSeconds > 300) {
    patterns.push({
      type: "dwell-preference",
      domain: currentDomain,
      details: "Deep reader — high scroll depth and dwell time",
      confidence: 0.7,
    });
  }

  return patterns;
}

/* ── Dynamic Lens Generation ── */

function generateLensFromPatterns(
  patterns: DetectedPattern[],
  currentDomain: string
): LensBlueprint | null {
  if (patterns.length === 0) return null;

  const dismissed = getDismissedIds();

  // Sort patterns by confidence
  const sorted = [...patterns].sort((a, b) => b.confidence - a.confidence);
  const primary = sorted[0];

  // Generate lens based on primary pattern
  let blueprint: LensBlueprint;

  switch (primary.type) {
    case "domain-depth": {
      const id = `${currentDomain}-researcher`;
      if (dismissed.includes(id)) return null;

      // Find the base lens closest to what user prefers
      const preferredId = patterns.find(p => p.type === "lens-preference")?.details.match(/"([^"]+)"/)?.[1];
      const base = preferredId
        ? PRESET_BLUEPRINTS.find(b => b.id === preferredId) || PRESET_BLUEPRINTS[3]
        : PRESET_BLUEPRINTS[3]; // default to expert

      blueprint = cloneBlueprint(base);
      blueprint.id = id;
      blueprint.label = `${capitalize(currentDomain)} Researcher`;
      blueprint.icon = "Sparkles";
      blueprint.isPreset = false;
      blueprint.description = `Deep-dive lens tailored for ${currentDomain} exploration`;
      blueprint.generatedReason = `You've explored ${currentDomain} topics ${(sorted[0] as any).details.match(/\d+/)?.[0] || "several"} times recently — this lens prioritizes depth and technical sources`;
      blueprint.params = {
        ...blueprint.params,
        depth: "deep",
        audience: "informed",
        focusAreas: [...blueprint.params.focusAreas, `${currentDomain}-specific insights`],
      };
      blueprint.recommendedSources = DOMAIN_SOURCES[currentDomain] || [];
      break;
    }

    case "cross-domain": {
      const id = `interdisciplinary-bridge`;
      if (dismissed.includes(id)) return null;

      blueprint = cloneBlueprint(PRESET_BLUEPRINTS[1]); // magazine as base
      blueprint.id = id;
      blueprint.label = "Interdisciplinary";
      blueprint.icon = "Sparkles";
      blueprint.isPreset = false;
      blueprint.description = "Connects ideas across domains with vivid cross-references";
      blueprint.generatedReason = "You've been jumping between domains — this lens highlights unexpected connections";
      blueprint.params = {
        ...blueprint.params,
        tone: "vivid",
        depth: "standard",
        audience: "curious",
        structure: "narrative",
        focusAreas: ["cross-domain connections", "analogies between fields", "interdisciplinary insights"],
      };
      break;
    }

    case "dwell-preference": {
      const id = `deep-reader`;
      if (dismissed.includes(id)) return null;

      blueprint = cloneBlueprint(PRESET_BLUEPRINTS[3]); // expert base
      blueprint.id = id;
      blueprint.label = "Deep Reader";
      blueprint.icon = "Sparkles";
      blueprint.isPreset = false;
      blueprint.description = "Maximum depth and detail for thorough exploration";
      blueprint.generatedReason = "Your reading patterns show deep engagement — this lens provides exhaustive coverage";
      blueprint.params = {
        ...blueprint.params,
        depth: "exhaustive",
        citationDensity: "thorough",
        focusAreas: ["comprehensive analysis", "edge cases", "historical context"],
      };
      break;
    }

    case "lens-preference": {
      // Don't generate a new lens for simple preference — just suggest the existing one
      return null;
    }

    default:
      return null;
  }

  return blueprint;
}

/* ── Public API ── */

/**
 * Generate a lens suggestion based on the user's attention profile
 * and the current topic domain.
 */
export function generateLensSuggestion(
  currentDomain: string
): LensBlueprint | null {
  const profile = loadProfile();
  const patterns = detectPatterns(profile, currentDomain);
  return generateLensFromPatterns(patterns, currentDomain);
}

/**
 * Get recommended sources for a domain, with quality scores.
 */
export function getRecommendedSources(domain: string): RecommendedSource[] {
  return DOMAIN_SOURCES[domain] || [];
}

/**
 * Explain a blueprint's parameters in plain English.
 */
export function explainBlueprint(bp: LensBlueprint): string {
  const parts: string[] = [];
  parts.push(`Written in a ${bp.params.tone} tone`);
  parts.push(`at ${bp.params.depth} depth`);
  parts.push(`for a ${bp.params.audience}-level audience`);
  parts.push(`using a ${bp.params.structure} structure`);
  parts.push(`with ${bp.params.citationDensity} citations`);

  if (bp.params.focusAreas.length > 0) {
    parts.push(`\nFocuses on: ${bp.params.focusAreas.join(", ")}`);
  }
  if (bp.params.excludeAreas.length > 0) {
    parts.push(`\nExcludes: ${bp.params.excludeAreas.join(", ")}`);
  }

  return parts.join(" ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
