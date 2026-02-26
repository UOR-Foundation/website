/**
 * Observer Companion — Unified Ambient Intelligence Feed
 * ═══════════════════════════════════════════════════════
 *
 * Fuses five existing observer layers into a single briefing
 * that Lumini.AI receives as ambient context in every system prompt.
 *
 * Layers fused:
 *   1. Screen Context   → what the user is viewing right now
 *   2. Context Projection → interest graph, tasks, phase affinity
 *   3. Observer Patch    → intersubjective signal consensus
 *   4. Signal Relevance  → SNR and signal quality metrics
 *   5. Focus Journal     → missed events during focus mode
 *
 * The output is a plain-text briefing injected into the AI system prompt,
 * enabling Lumini to naturally reference patterns, risks, and opportunities
 * without any explicit UI—pure ambient intelligence.
 *
 * @module hologram-ui/engine/observerCompanion
 */

import type { UserContextProfile } from "./signalRelevance";
import type { TLDR, JournalEntry } from "../hooks/useFocusJournal";

// ── Types ────────────────────────────────────────────────────────────────

export interface InterestTrend {
  tag: string;
  weight: number;
  direction: "rising" | "stable" | "fading";
}

export interface ObserverBriefing {
  /** Top interests with velocity */
  interestTrends: InterestTrend[];
  /** Dominant triadic phase */
  dominantPhase: string;
  /** Phase balance assessment */
  phaseBalance: string;
  /** Active tasks */
  activeTasks: string[];
  /** Focus debrief (if user recently exited focus) */
  focusDebrief: string | null;
  /** Session health: signal-to-noise ratio */
  snr: number | null;
  /** Risk signals */
  risks: string[];
  /** Assembled prompt text */
  promptText: string;
}

// ── Interest Velocity ─────────────────────────────────────────────────

const INTEREST_HISTORY_KEY = "hologram:interest-history";
const HISTORY_WINDOW = 7; // track last 7 snapshots

interface InterestSnapshot {
  interests: Record<string, number>;
  timestamp: number;
}

function loadHistory(): InterestSnapshot[] {
  try {
    const raw = localStorage.getItem(INTEREST_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSnapshot(profile: UserContextProfile): void {
  const history = loadHistory();
  const now = Date.now();
  // Only save if last snapshot is >1 hour old
  if (history.length > 0 && now - history[history.length - 1].timestamp < 3_600_000) return;
  history.push({ interests: { ...profile.interests }, timestamp: now });
  // Keep last N snapshots
  const trimmed = history.slice(-HISTORY_WINDOW);
  localStorage.setItem(INTEREST_HISTORY_KEY, JSON.stringify(trimmed));
}

function computeInterestTrends(profile: UserContextProfile): InterestTrend[] {
  saveSnapshot(profile);
  const history = loadHistory();

  const sorted = Object.entries(profile.interests)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return sorted.map(([tag, weight]) => {
    let direction: InterestTrend["direction"] = "stable";

    if (history.length >= 2) {
      const oldest = history[0].interests[tag] ?? 0;
      const delta = weight - oldest;
      if (delta > 0.08) direction = "rising";
      else if (delta < -0.05) direction = "fading";
    }

    return { tag, weight, direction };
  });
}

// ── Phase Balance ─────────────────────────────────────────────────────

function assessPhaseBalance(
  affinity: Record<string, number>,
): { dominant: string; assessment: string } {
  const entries = Object.entries(affinity).sort(([, a], [, b]) => b - a);
  const dominant = entries[0]?.[0] ?? "learn";
  const max = entries[0]?.[1] ?? 0.33;
  const min = entries[entries.length - 1]?.[1] ?? 0.33;
  const spread = max - min;

  let assessment: string;
  if (spread < 0.1) {
    assessment = "Well-balanced across Learn, Work, and Play";
  } else if (spread < 0.25) {
    assessment = `Leaning toward ${dominant} — consider spending time in ${entries[entries.length - 1][0]}`;
  } else {
    assessment = `Heavily focused on ${dominant} — your ${entries[entries.length - 1][0]} and ${entries[1][0]} modes may benefit from attention`;
  }

  return { dominant, assessment };
}

// ── Focus Debrief ─────────────────────────────────────────────────────

function formatFocusDebrief(tldr: TLDR): string {
  const mins = Math.round(tldr.duration / 60_000);
  const lines: string[] = [
    `You were in deep focus for ${mins} minute${mins !== 1 ? "s" : ""}.`,
    `${tldr.totalSuppressed} event${tldr.totalSuppressed !== 1 ? "s" : ""} were captured (${tldr.signalCount} relevant, ${tldr.noiseCount} noise).`,
  ];

  if (tldr.highlights.length > 0) {
    lines.push("Key items you missed:");
    for (const h of tldr.highlights.slice(0, 3)) {
      lines.push(`  • ${h.message} (from ${h.source}, relevance: ${(h.relevance * 100).toFixed(0)}%)`);
    }
  }

  if (tldr.groups.length > 0) {
    const topGroup = tldr.groups[0];
    lines.push(`Most active source: ${topGroup.label} (${topGroup.count} events)`);
  }

  return lines.join("\n");
}

// ── Risk Detection ────────────────────────────────────────────────────

function detectRisks(
  profile: UserContextProfile,
  trends: InterestTrend[],
  phaseBalance: { dominant: string; assessment: string },
): string[] {
  const risks: string[] = [];

  // Risk: too many active tasks
  if (profile.activeTasks.length > 5) {
    risks.push(`${profile.activeTasks.length} active tasks — consider prioritizing or completing some`);
  }

  // Risk: interest concentration (only 1-2 topics)
  const activeInterests = Object.keys(profile.interests).filter(
    (k) => profile.interests[k] > 0.2,
  );
  if (activeInterests.length === 1) {
    risks.push("Your interests are very narrowly focused — exploring adjacent topics could spark new connections");
  }

  // Risk: fading interests that were once strong
  const fadingStrong = trends.filter(
    (t) => t.direction === "fading" && t.weight > 0.3,
  );
  if (fadingStrong.length > 0) {
    risks.push(
      `Previously strong interest${fadingStrong.length > 1 ? "s" : ""} fading: ${fadingStrong.map((t) => t.tag).join(", ")}`,
    );
  }

  return risks;
}

// ── Main Assembly ─────────────────────────────────────────────────────

export function assembleObserverBriefing(
  profile: UserContextProfile,
  pendingTLDR: TLDR | null,
  sessionSNR: number | null,
): ObserverBriefing {
  const trends = computeInterestTrends(profile);
  const { dominant, assessment } = assessPhaseBalance(profile.phaseAffinity);
  const focusDebrief = pendingTLDR ? formatFocusDebrief(pendingTLDR) : null;
  const risks = detectRisks(profile, trends, { dominant, assessment });

  // Assemble prompt text
  const sections: string[] = [];

  // Interest landscape
  if (trends.length > 0) {
    const trendLines = trends
      .slice(0, 5)
      .map((t) => {
        const arrow = t.direction === "rising" ? "↑" : t.direction === "fading" ? "↓" : "—";
        return `${t.tag} (${(t.weight * 100).toFixed(0)}% ${arrow})`;
      });
    sections.push(`Interests: ${trendLines.join(", ")}`);
  }

  // Phase balance
  sections.push(`Phase: ${dominant} dominant. ${assessment}`);

  // Active tasks
  if (profile.activeTasks.length > 0) {
    sections.push(`Active tasks: ${profile.activeTasks.slice(0, 5).join(", ")}`);
  }

  // Focus debrief
  if (focusDebrief) {
    sections.push(`Focus debrief:\n${focusDebrief}`);
  }

  // SNR
  if (sessionSNR !== null) {
    sections.push(`Session signal quality: ${(sessionSNR * 100).toFixed(0)}%`);
  }

  // Risks
  if (risks.length > 0) {
    sections.push(`Observations:\n${risks.map((r) => `  • ${r}`).join("\n")}`);
  }

  const promptText = sections.length > 0 ? sections.join("\n") : "";

  return {
    interestTrends: trends,
    dominantPhase: dominant,
    phaseBalance: assessment,
    activeTasks: profile.activeTasks,
    focusDebrief,
    snr: sessionSNR,
    risks,
    promptText,
  };
}
