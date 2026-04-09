/**
 * Resurfacing Engine — Spaced Repetition for Knowledge.
 *
 * Scores nodes for rediscovery based on:
 *   (backlink_count × recency_decay) + attention_dwell_time
 *
 * Surfaces 1–3 suggestions of important but neglected nodes.
 * Respects attention aperture: suppresses when focus is high.
 */

import { localGraphStore } from "@/modules/knowledge-graph/local-store";
import { getBacklinkCount } from "@/modules/knowledge-graph/backlinks";
import { getAttentionProfile } from "./attention-tracker";
import type { KGNode } from "@/modules/knowledge-graph/types";

export interface ResurfacingSuggestion {
  address: string;
  label: string;
  nodeType: string;
  backlinkCount: number;
  daysSinceVisit: number;
  score: number;
  reason: string;
}

// ── Scoring ─────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

function recencyDecay(daysSince: number): number {
  // Sigmoid decay: peaks around 7-14 days, drops off after 30
  if (daysSince < 3) return 0; // Too recent — no need to resurface
  if (daysSince > 90) return 0.3; // Very old — still worth mentioning
  return 1 / (1 + Math.exp(-0.15 * (daysSince - 10)));
}

function computeScore(backlinkCount: number, daysSinceVisit: number, dwellSeconds: number): number {
  const linkWeight = Math.min(backlinkCount, 20) / 20; // 0–1, capped at 20 links
  const decay = recencyDecay(daysSinceVisit);
  const dwellWeight = Math.min(dwellSeconds, 300) / 300; // 0–1, capped at 5 min
  return (linkWeight * 0.5 + decay * 0.3 + dwellWeight * 0.2);
}

function generateReason(backlinkCount: number, daysSinceVisit: number): string {
  if (daysSinceVisit > 30 && backlinkCount > 5) {
    return `${backlinkCount} linked references · unseen for ${daysSinceVisit} days`;
  }
  if (backlinkCount > 3) {
    return `${backlinkCount} linked references — a well-connected idea`;
  }
  if (daysSinceVisit > 14) {
    return `Haven't visited in ${daysSinceVisit} days`;
  }
  return `${backlinkCount} references · ${daysSinceVisit}d ago`;
}

// ── Main function ───────────────────────────────────────────────────────────

/**
 * Get resurfacing suggestions — nodes worth revisiting.
 * Returns 0–3 suggestions, respecting attention aperture.
 */
export async function getResurfacingSuggestions(limit = 3): Promise<ResurfacingSuggestion[]> {
  // Check attention aperture — suppress when deeply focused
  const profile = getAttentionProfile();
  const recentDwells = Object.values(profile.sessionDwells);
  const totalRecentDwell = recentDwells.reduce((a, b) => a + b, 0);
  
  // If user is deeply focused (>5 min on current topic), suppress suggestions
  if (totalRecentDwell > 300) {
    return [];
  }

  // Get all nodes
  const allNodes: KGNode[] = await localGraphStore.getAllNodes();
  
  // Filter: only content nodes (not entity/column stubs)
  const candidates = allNodes.filter(n =>
    n.nodeType !== "entity" &&
    n.nodeType !== "column" &&
    n.label &&
    n.label.length > 2
  );

  // Score each candidate
  const scored: ResurfacingSuggestion[] = [];
  const now = Date.now();

  for (const node of candidates.slice(0, 100)) { // Cap at 100 for perf
    const daysSinceVisit = Math.floor((now - node.updatedAt) / DAY_MS);
    if (daysSinceVisit < 3) continue; // Too recent

    const backlinkCount = await getBacklinkCount(node.uorAddress);
    if (backlinkCount === 0 && daysSinceVisit < 14) continue; // No links, too recent

    const dwellSeconds = profile.sessionDwells[node.label.toLowerCase()] || 0;
    const score = computeScore(backlinkCount, daysSinceVisit, dwellSeconds);

    if (score > 0.15) {
      scored.push({
        address: node.uorAddress,
        label: node.label,
        nodeType: node.nodeType,
        backlinkCount,
        daysSinceVisit,
        score,
        reason: generateReason(backlinkCount, daysSinceVisit),
      });
    }
  }

  // Sort by score descending, return top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
