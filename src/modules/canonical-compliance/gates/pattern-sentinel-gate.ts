/**
 * Pattern Sentinel Gate — Self-Discovering Anti-Pattern Detector
 * ══════════════════════════════════════════════════════════════
 *
 * Meta-gate that scans the codebase for recurring anti-patterns
 * and surfaces clusters that warrant their own dedicated gates.
 *
 * Creates a self-improving feedback loop:
 *   Sentinel discovers pattern → you promote → new atomic gate
 *   → Sentinel stops reporting it → system evolves
 *
 * @module canonical-compliance/gates/pattern-sentinel-gate
 */

import { registerGate, buildGateResult, type GateFinding } from "./gate-runner";
import { getActivePatterns, PATTERN_REGISTRY } from "./pattern-registry";
import { scanPatterns, getKnownFiles } from "./pattern-scanner";

const HOTSPOT_THRESHOLD = 3; // 3+ distinct anti-patterns in one file = hotspot

function patternSentinelGate() {
  const activePatterns = getActivePatterns();
  const knownFiles = getKnownFiles();
  const scan = scanPatterns(activePatterns, knownFiles);
  const findings: GateFinding[] = [];

  // ── Pattern findings ──────────────────────────────────────────
  for (const pattern of activePatterns) {
    const totalHits = scan.patternTotals.get(pattern.id) ?? 0;
    const fileCount = scan.patternFileCount.get(pattern.id) ?? 0;

    if (totalHits >= pattern.threshold) {
      findings.push({
        severity: pattern.severity,
        title: `"${pattern.label}" appears ${totalHits} times across ${fileCount} file(s)`,
        detail: pattern.description,
        recommendation: pattern.recommendation,
      });
    }
  }

  // ── Hotspot findings ──────────────────────────────────────────
  for (const [file, distinctPatterns] of scan.filePatternCounts) {
    if (distinctPatterns >= HOTSPOT_THRESHOLD) {
      findings.push({
        severity: "warning",
        title: `Hotspot: ${file}`,
        detail: `${distinctPatterns} distinct anti-patterns co-occur in this file.`,
        file,
        recommendation: "Prioritize this file for refactoring — multiple concerns overlap.",
      });
    }
  }

  // ── Summary info ──────────────────────────────────────────────
  const promotedCount = PATTERN_REGISTRY.filter((p) => p.promotedToGate).length;
  findings.push({
    severity: "info",
    title: `Sentinel tracking ${activePatterns.length} patterns (${promotedCount} promoted to dedicated gates)`,
    detail: `Scanned ${knownFiles.length} known files. ${findings.length} actionable findings.`,
    recommendation: "Promote high-frequency patterns to dedicated atomic gates for enforcement.",
  });

  return buildGateResult(
    "pattern-sentinel",
    "Pattern Sentinel Gate",
    findings,
    { error: 8, warning: 3, info: 0 },
  );
}

registerGate(patternSentinelGate);

export { patternSentinelGate };
