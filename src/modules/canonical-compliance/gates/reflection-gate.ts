/**
 * Reflection Gate — LLM Feedback Pattern Recognizer
 * ══════════════════════════════════════════════════
 *
 * Reads the reflection chain (IndexedDB) and applies pattern detectors
 * to surface recurring themes in LLM output: verbosity, redundancy,
 * clutter, security gaps, imprecise output, performance concerns.
 *
 * Activates passively on every health check and actively after every
 * Oracle conversation via the auto-injection hook in stream-oracle.
 *
 * @module canonical-compliance/gates/reflection-gate
 */

import { getAllReflections, type ReflectionEntry } from "@/modules/boot/reflection-chain";
import { registerAsyncGate, buildGateResult, type GateFinding } from "./gate-runner";

// ── Pattern Detectors ────────────────────────────────────────────────────

interface PatternDetector {
  readonly id: string;
  readonly label: string;
  readonly severity: "error" | "warning" | "info";
  readonly patterns: RegExp;
  readonly threshold: number; // min hits to become a finding
}

const DETECTORS: readonly PatternDetector[] = [
  {
    id: "verbosity",
    label: "Verbosity",
    severity: "warning",
    patterns: /\b(verbose|too long|wordy|unnecessary text|wall of text|lengthy|bloated response)\b/i,
    threshold: 3,
  },
  {
    id: "redundancy",
    label: "Redundancy",
    severity: "warning",
    patterns: /\b(redundant|duplicate|already exists|repeated|repetitive|overlapping)\b/i,
    threshold: 3,
  },
  {
    id: "clutter",
    label: "Clutter",
    severity: "warning",
    patterns: /\b(clutter|noisy|too many|overwhelming|crowded|overloaded)\b/i,
    threshold: 3,
  },
  {
    id: "precision",
    label: "Precision Gaps",
    severity: "warning",
    patterns: /\b(imprecise|vague|unclear|ambiguous|hand-?wav|generic|unspecific)\b/i,
    threshold: 3,
  },
  {
    id: "security",
    label: "Security Concerns",
    severity: "error",
    patterns: /\b(unsafe|vulnerab|exposed|leak|injection|xss|privilege escalation)\b/i,
    threshold: 2,
  },
  {
    id: "performance",
    label: "Performance Issues",
    severity: "warning",
    patterns: /\b(slow|laggy|memory leak|timeout|heavy|bottleneck|render block)\b/i,
    threshold: 3,
  },
  {
    id: "ux-friction",
    label: "UX Friction",
    severity: "info",
    patterns: /\b(confusing|unintuitive|hard to find|scroll|buried|hidden|discoverability)\b/i,
    threshold: 3,
  },
  {
    id: "code-bloat",
    label: "Code Bloat",
    severity: "info",
    patterns: /\b(too much code|overengineered|simpler|leaner|dead code|unused|could be removed)\b/i,
    threshold: 3,
  },
];

// ── Scoring ──────────────────────────────────────────────────────────────

/** Weight recent reflections higher (newest = 1.0, oldest ≈ 0.3). */
function recencyWeight(index: number, total: number): number {
  if (total <= 1) return 1;
  return 0.3 + 0.7 * ((total - 1 - index) / (total - 1));
}

function analyzeReflections(reflections: ReflectionEntry[]): GateFinding[] {
  const findings: GateFinding[] = [];

  for (const detector of DETECTORS) {
    let weightedHits = 0;
    const hitFiles: string[] = [];

    for (let i = 0; i < reflections.length; i++) {
      const text = reflections[i].content + (reflections[i].promptsEvolved ?? "");
      if (detector.patterns.test(text)) {
        weightedHits += recencyWeight(i, reflections.length);
        hitFiles.push(reflections[i].id.slice(0, 8));
      }
    }

    if (weightedHits >= detector.threshold) {
      findings.push({
        severity: detector.severity,
        title: `"${detector.label}" detected in ${hitFiles.length}/${reflections.length} reflections`,
        detail: `Weighted score ${weightedHits.toFixed(1)} exceeds threshold ${detector.threshold}. Recent reflections weighed more heavily.`,
        recommendation:
          detector.severity === "error"
            ? "Investigate immediately — this pattern indicates a systemic risk."
            : `Consider creating a dedicated gate or adjusting system prompts to reduce ${detector.label.toLowerCase()}.`,
      });
    }
  }

  // Hotspot: if 3+ detectors fired, flag the overall trend
  if (findings.length >= 3) {
    findings.push({
      severity: "warning",
      title: `${findings.length} pattern clusters active — systemic quality drift`,
      detail: `Multiple anti-patterns co-occurring across reflections suggests compound quality issues.`,
      recommendation: "Review recent LLM interactions holistically. Consider prompt tightening or gate promotion.",
    });
  }

  return findings;
}

// ── Gate Registration ────────────────────────────────────────────────────

registerAsyncGate(async () => {
  let reflections: ReflectionEntry[] = [];
  try {
    reflections = await getAllReflections();
  } catch {
    return buildGateResult("reflection-sentinel", "Reflection Gate", [
      {
        severity: "info",
        title: "Reflection chain unavailable",
        detail: "Could not read IndexedDB. This is expected in server-side or incognito contexts.",
      },
    ]);
  }

  if (reflections.length === 0) {
    return buildGateResult("reflection-sentinel", "Reflection Gate", [
      {
        severity: "info",
        title: "No reflections yet",
        detail: "The reflection chain is empty. Converse with the Oracle to populate it.",
      },
    ]);
  }

  const findings = analyzeReflections(reflections);

  // Always add a summary info finding
  findings.push({
    severity: "info",
    title: `Tracking ${reflections.length} reflection entries`,
    detail: `${findings.filter((f) => f.severity !== "info").length} patterns above threshold. System is self-monitoring conversation quality.`,
  });

  return buildGateResult("reflection-sentinel", "Reflection Gate", findings);
});
