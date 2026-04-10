/**
 * Master Gate — Coherence Analysis + Comprehensive System Health
 * ═══════════════════════════════════════════════════════════════
 *
 * Three-phase gate that aggregates all registered gates:
 *   Phase 1: Gate Coherence Analysis (categorical reasoning)
 *   Phase 2: Quality Threshold Check (coherence ≥ 70)
 *   Phase 3: Full Execution + Self-Reflection
 *
 * @ontology uor:MasterGate
 * @module canonical-compliance/gates/master-gate
 */

import type {
  GateResult,
  GateFinding,
  MasterGateReport,
  CoherenceAnalysis,
  OverlapPair,
  Contradiction,
  ConsolidationProposal,
  HotspotCluster,
  SelfImprovementProposal,
} from "./gate-runner";
import {
  getRegisteredGates,
  getRegisteredAsyncGates,
  scoreToStatus,
} from "./gate-runner";

// ── UOR Namespaces expected to have gate coverage ─────────────────────────

const UOR_NAMESPACES = [
  "op:",
  "proof:",
  "partition:",
  "resolver:",
  "cert:",
  "boot:",
  "bus:",
  "ontology:",
  "schema:",
  "skos:",
  "kg:",
] as const;

// ── Phase 1: Gate Coherence Analysis ──────────────────────────────────────

/** Extract the domain (set of files + finding titles) from a GateResult. */
function extractDomain(result: GateResult): Set<string> {
  const domain = new Set<string>();
  domain.add(`gate:${result.id}`);
  for (const f of result.findings) {
    if (f.file) domain.add(`file:${f.file}`);
    domain.add(`title:${f.title}`);
  }
  return domain;
}

/** Jaccard similarity between two sets. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Check if set A is a strict subset of set B. */
function isStrictSubset(a: Set<string>, b: Set<string>): boolean {
  if (a.size >= b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

/** Detect overlapping gate pairs (Pullback in categorical terms). */
function detectOverlaps(
  results: GateResult[],
  domains: Map<string, Set<string>>,
): OverlapPair[] {
  const pairs: OverlapPair[] = [];
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i];
      const b = results[j];
      const da = domains.get(a.id)!;
      const db = domains.get(b.id)!;
      const similarity = jaccard(da, db);
      if (similarity > 0.3) {
        pairs.push({
          gateA: a.id,
          gateB: b.id,
          nameA: a.name,
          nameB: b.name,
          jaccardSimilarity: Math.round(similarity * 100) / 100,
          sharedDomains: [...da].filter((x) => db.has(x)),
        });
      }
    }
  }
  return pairs.sort((a, b) => b.jaccardSimilarity - a.jaccardSimilarity);
}

/** Detect contradictions (Non-commutativity): opposing verdicts on shared domains. */
function detectContradictions(
  results: GateResult[],
  domains: Map<string, Set<string>>,
): Contradiction[] {
  const contradictions: Contradiction[] = [];
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i];
      const b = results[j];
      const da = domains.get(a.id)!;
      const db = domains.get(b.id)!;

      // Find shared file domains
      const sharedFiles = [...da]
        .filter((x) => x.startsWith("file:") && db.has(x));

      if (sharedFiles.length > 0) {
        // Check if one passes and the other fails on shared ground
        if (
          (a.status === "pass" && b.status === "fail") ||
          (a.status === "fail" && b.status === "pass")
        ) {
          contradictions.push({
            gateA: a.id,
            gateB: b.id,
            nameA: a.name,
            nameB: b.name,
            verdictA: a.status,
            verdictB: b.status,
            sharedDomains: sharedFiles,
            description: `"${a.name}" reports ${a.status.toUpperCase()} while "${b.name}" reports ${b.status.toUpperCase()} on shared files: ${sharedFiles.join(", ")}`,
          });
        }
      }
    }
  }
  return contradictions;
}

/** Detect redundancy (Epimorphism): one gate subsumed by another. */
function detectRedundancies(
  results: GateResult[],
  domains: Map<string, Set<string>>,
): ConsolidationProposal[] {
  const proposals: ConsolidationProposal[] = [];

  // Check strict subset relationships
  for (let i = 0; i < results.length; i++) {
    for (let j = 0; j < results.length; j++) {
      if (i === j) continue;
      const a = results[i];
      const b = results[j];
      const da = domains.get(a.id)!;
      const db = domains.get(b.id)!;

      if (isStrictSubset(da, db)) {
        proposals.push({
          type: "subsumption",
          sourceGates: [a.id],
          targetGate: b.id,
          description: `"${a.name}" is fully subsumed by "${b.name}" — consider removing ${a.id}`,
          overlapPercentage: 100,
        });
      }
    }
  }

  // Check high overlap for merge candidates (Coequalizer)
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i];
      const b = results[j];
      const da = domains.get(a.id)!;
      const db = domains.get(b.id)!;
      const sim = jaccard(da, db);

      if (sim > 0.6) {
        // Only add if not already a subsumption
        const alreadySubsumed = proposals.some(
          (p) =>
            p.type === "subsumption" &&
            (p.sourceGates.includes(a.id) || p.sourceGates.includes(b.id)),
        );
        if (!alreadySubsumed) {
          proposals.push({
            type: "merge",
            sourceGates: [a.id, b.id],
            targetGate: `${a.id}+${b.id}`,
            description: `Merge "${a.name}" + "${b.name}" (${Math.round(sim * 100)}% overlap)`,
            overlapPercentage: Math.round(sim * 100),
          });
        }
      }
    }
  }

  return proposals;
}

/** Detect coverage gaps: UOR namespaces with no gate covering them. */
function detectCoverageGaps(results: GateResult[]): string[] {
  const allText = results
    .flatMap((r) => [
      r.id,
      r.name,
      ...r.findings.map((f) => `${f.title} ${f.detail} ${f.file ?? ""}`),
    ])
    .join(" ")
    .toLowerCase();

  return UOR_NAMESPACES.filter((ns) => !allText.includes(ns.replace(":", "")));
}

/** Run Phase 1: Coherence Analysis. */
function analyzeCoherence(results: GateResult[]): CoherenceAnalysis {
  // Build domain matrix
  const domains = new Map<string, Set<string>>();
  for (const r of results) {
    domains.set(r.id, extractDomain(r));
  }

  const overlaps = detectOverlaps(results, domains);
  const contradictions = detectContradictions(results, domains);
  const consolidationProposals = detectRedundancies(results, domains);
  const coverageGaps = detectCoverageGaps(results);

  // Score: 100 minus deductions
  let score = 100;
  score -= contradictions.length * 10;
  score -= overlaps.filter((o) => o.jaccardSimilarity > 0.6).length * 3;
  score -= coverageGaps.length * 5;
  score = Math.max(0, Math.min(100, score));

  return {
    coherenceScore: score,
    status: scoreToStatus(score),
    overlaps,
    contradictions,
    consolidationProposals,
    coverageGaps,
    gateCount: results.length,
    domainMatrix: Object.fromEntries(
      [...domains.entries()].map(([k, v]) => [k, [...v]]),
    ),
  };
}

// ── Phase 3: Self-Reflection ──────────────────────────────────────────────

/** Cluster findings by file to find systemic hotspots. */
function findHotspots(results: GateResult[]): HotspotCluster[] {
  const fileMap = new Map<string, { gate: string; finding: GateFinding }[]>();

  for (const r of results) {
    for (const f of r.findings) {
      const key = f.file ?? "(no file)";
      if (!fileMap.has(key)) fileMap.set(key, []);
      fileMap.get(key)!.push({ gate: r.id, finding: f });
    }
  }

  return [...fileMap.entries()]
    .filter(([, items]) => items.length >= 3)
    .map(([file, items]) => ({
      file,
      findingCount: items.length,
      gates: [...new Set(items.map((i) => i.gate))],
      severities: {
        error: items.filter((i) => i.finding.severity === "error").length,
        warning: items.filter((i) => i.finding.severity === "warning").length,
        info: items.filter((i) => i.finding.severity === "info").length,
      },
    }))
    .sort((a, b) => b.findingCount - a.findingCount);
}

/** Generate self-improvement proposals based on results. */
function generateProposals(
  results: GateResult[],
  hotspots: HotspotCluster[],
  coherence: CoherenceAnalysis,
): SelfImprovementProposal[] {
  const proposals: SelfImprovementProposal[] = [];

  // Flag always-perfect gates (possibly too lenient)
  for (const r of results) {
    if (r.score === 100 && r.findings.length === 0) {
      proposals.push({
        type: "lenient",
        target: r.id,
        description: `"${r.name}" always scores 100 with zero findings — may be too lenient or not checking enough`,
        priority: "low",
      });
    }
  }

  // Flag always-failing gates (possibly broken)
  for (const r of results) {
    if (r.score === 0) {
      proposals.push({
        type: "broken",
        target: r.id,
        description: `"${r.name}" scores 0/100 — may be broken or misconfigured`,
        priority: "high",
      });
    }
  }

  // Propose targeted gates for hotspot files
  for (const hs of hotspots) {
    proposals.push({
      type: "hotspot",
      target: hs.file,
      description: `File "${hs.file}" has ${hs.findingCount} findings across ${hs.gates.length} gates — consider a dedicated remediation pass`,
      priority: hs.severities.error > 0 ? "high" : "medium",
    });
  }

  // Propagate consolidation proposals
  for (const cp of coherence.consolidationProposals) {
    proposals.push({
      type: "consolidation",
      target: cp.sourceGates.join(", "),
      description: cp.description,
      priority: cp.type === "subsumption" ? "medium" : "low",
    });
  }

  return proposals.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

// ── Markdown Report ───────────────────────────────────────────────────────

/** Export a full master gate report as markdown. */
export function exportMasterGateMarkdown(report: MasterGateReport): string {
  const lines: string[] = [];

  // ── Executive Summary ──
  lines.push(`# 🏛️ Master Gate Report`);
  lines.push(``);
  lines.push(`**Generated**: ${report.timestamp}`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Composite Score | ${report.compositeScore}/100 |`);
  lines.push(`| Coherence Score | ${report.coherence.coherenceScore}/100 |`);
  lines.push(`| Gates Executed | ${report.gates.length} |`);
  lines.push(`| Systemic Hotspots | ${report.hotspots.length} |`);
  lines.push(`| Contradictions | ${report.coherence.contradictions.length} |`);
  lines.push(`| Improvement Proposals | ${report.selfImprovementProposals.length} |`);
  lines.push(``);

  // ── Phase 1: Coherence ──
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Phase 1: Gate Coherence Analysis`);
  lines.push(``);
  lines.push(
    `Coherence Score: **${report.coherence.coherenceScore}/100** (${report.coherence.status.toUpperCase()})`,
  );
  lines.push(``);

  // Overlap matrix
  lines.push(`### Overlap Matrix (Pullback Detection)`);
  lines.push(``);
  if (report.coherence.overlaps.length === 0) {
    lines.push(`No significant overlaps detected. Gates have orthogonal domains. ✅`);
  } else {
    lines.push(`| Gate A | Gate B | Jaccard | Shared Domains | Action |`);
    lines.push(`|---|---|---|---|---|`);
    for (const o of report.coherence.overlaps) {
      const action = o.jaccardSimilarity > 0.6 ? "⚠️ Consider merge" : "ℹ️ Monitor";
      lines.push(
        `| ${o.nameA} | ${o.nameB} | ${o.jaccardSimilarity} | ${o.sharedDomains.length} | ${action} |`,
      );
    }
  }
  lines.push(``);

  // Contradictions
  lines.push(`### Contradictions (Non-commutativity Detection)`);
  lines.push(``);
  if (report.coherence.contradictions.length === 0) {
    lines.push(`No contradictions found. All gates agree on shared domains. ✅`);
  } else {
    for (const c of report.coherence.contradictions) {
      lines.push(`- 🔴 ${c.description}`);
    }
  }
  lines.push(``);

  // Coverage gaps
  lines.push(`### Coverage Gaps (Missing Arrows)`);
  lines.push(``);
  if (report.coherence.coverageGaps.length === 0) {
    lines.push(`All UOR namespaces have gate coverage. ✅`);
  } else {
    for (const gap of report.coherence.coverageGaps) {
      lines.push(`- ⚠️ Namespace \`${gap}\` has no dedicated gate`);
    }
  }
  lines.push(``);

  // Consolidation proposals
  lines.push(`### Consolidation Proposals (Coequalizer)`);
  lines.push(``);
  if (report.coherence.consolidationProposals.length === 0) {
    lines.push(`No consolidation needed. Gate boundaries are clean. ✅`);
  } else {
    for (const cp of report.coherence.consolidationProposals) {
      const icon = cp.type === "subsumption" ? "🔶" : "🔷";
      lines.push(`- ${icon} **${cp.type}**: ${cp.description}`);
    }
  }
  lines.push(``);

  // ── Phase 2: Threshold ──
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Phase 2: Threshold Check`);
  lines.push(``);
  if (report.thresholdPassed) {
    lines.push(
      `✅ **PASSED** — Coherence score ${report.coherence.coherenceScore}/100 ≥ threshold ${report.thresholdUsed}/100`,
    );
  } else {
    lines.push(
      `❌ **FAILED** — Coherence score ${report.coherence.coherenceScore}/100 < threshold ${report.thresholdUsed}/100`,
    );
    lines.push(``);
    lines.push(`Gate execution was aborted due to incoherence. Resolve contradictions and coverage gaps before retrying.`);
  }
  lines.push(``);

  // ── Phase 3: Gate Results ──
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Phase 3: Gate Results`);
  lines.push(``);

  for (const gate of report.gates) {
    const icon =
      gate.status === "pass" ? "✅" : gate.status === "warn" ? "⚠️" : "❌";
    lines.push(
      `### ${icon} ${gate.name} — ${gate.score}/100 (${gate.status.toUpperCase()})`,
    );
    lines.push(``);

    if (gate.findings.length === 0) {
      lines.push(`No findings.`);
    } else {
      for (const f of gate.findings) {
        const sev =
          f.severity === "error" ? "🔴" : f.severity === "warning" ? "🟡" : "🔵";
        lines.push(`- ${sev} **${f.title}**`);
        lines.push(`  ${f.detail}`);
        if (f.file) lines.push(`  *File*: \`${f.file}\``);
        if (f.recommendation) lines.push(`  *Fix*: ${f.recommendation}`);
      }
    }
    lines.push(``);
  }

  // ── Systemic Analysis ──
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Systemic Analysis`);
  lines.push(``);

  // Hotspots
  lines.push(`### Hotspot Files (≥3 findings)`);
  lines.push(``);
  if (report.hotspots.length === 0) {
    lines.push(`No systemic hotspots detected. ✅`);
  } else {
    lines.push(`| File | Findings | Gates | Errors | Warnings |`);
    lines.push(`|---|---|---|---|---|`);
    for (const hs of report.hotspots) {
      lines.push(
        `| \`${hs.file}\` | ${hs.findingCount} | ${hs.gates.length} | ${hs.severities.error} | ${hs.severities.warning} |`,
      );
    }
  }
  lines.push(``);

  // Score distribution
  lines.push(`### Score Distribution`);
  lines.push(``);
  lines.push(`| Range | Count | Gates |`);
  lines.push(`|---|---|---|`);
  const ranges = [
    { label: "90-100 (Pass)", min: 90, max: 100 },
    { label: "60-89 (Warn)", min: 60, max: 89 },
    { label: "0-59 (Fail)", min: 0, max: 59 },
  ];
  for (const range of ranges) {
    const matching = report.gates.filter(
      (g) => g.score >= range.min && g.score <= range.max,
    );
    lines.push(
      `| ${range.label} | ${matching.length} | ${matching.map((g) => g.name).join(", ") || "—"} |`,
    );
  }
  lines.push(``);

  // Self-improvement proposals
  lines.push(`### Self-Improvement Proposals`);
  lines.push(``);
  if (report.selfImprovementProposals.length === 0) {
    lines.push(`No improvement proposals at this time. ✅`);
  } else {
    for (const p of report.selfImprovementProposals) {
      const icon =
        p.priority === "high" ? "🔴" : p.priority === "medium" ? "🟡" : "🔵";
      lines.push(`- ${icon} [${p.priority.toUpperCase()}] **${p.type}**: ${p.description}`);
    }
  }
  lines.push(``);

  // Footer
  lines.push(`---`);
  lines.push(``);
  lines.push(
    `*Report generated by Master Gate v1.0 · ${report.gates.length} gates · ${new Date().toISOString()}*`,
  );

  return lines.join("\n");
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Run the Master Gate.
 *
 * Sequence:
 *   1. Run all sync gates to gather domains (Phase 1 pre-flight)
 *   2. Analyze coherence using categorical reasoning
 *   3. Check threshold — abort if incoherent
 *   4. Run all async gates for the full report (Phase 3)
 *   5. Perform self-reflection and generate improvement proposals
 *
 * @param coherenceThreshold Minimum coherence score to proceed (default 70)
 */
export async function runMasterGate(
  coherenceThreshold = 70,
): Promise<MasterGateReport> {
  const timestamp = new Date().toISOString();

  // ── Phase 1: Gather all gate results for coherence analysis ──
  const syncGates = getRegisteredGates();
  const asyncGates = getRegisteredAsyncGates();

  // Run sync gates first for coherence pre-flight
  const syncResults = syncGates.map((g) => g());
  const asyncResults = await Promise.all(asyncGates.map((g) => g()));
  const allResults = [...syncResults, ...asyncResults];

  // Coherence analysis
  const coherence = analyzeCoherence(allResults);

  // ── Phase 2: Threshold check ──
  const thresholdPassed = coherence.coherenceScore >= coherenceThreshold;

  if (!thresholdPassed) {
    // Return early with coherence-only report
    const compositeScore = Math.round(
      allResults.reduce((s, g) => s + g.score, 0) / Math.max(allResults.length, 1),
    );
    return {
      timestamp,
      gates: allResults,
      compositeScore,
      coherence,
      thresholdPassed: false,
      thresholdUsed: coherenceThreshold,
      hotspots: [],
      selfImprovementProposals: [],
    };
  }

  // ── Phase 3: Full analysis + reflection ──
  const compositeScore = Math.round(
    allResults.reduce((s, g) => s + g.score, 0) / Math.max(allResults.length, 1),
  );
  const hotspots = findHotspots(allResults);
  const selfImprovementProposals = generateProposals(
    allResults,
    hotspots,
    coherence,
  );

  return {
    timestamp,
    gates: allResults,
    compositeScore,
    coherence,
    thresholdPassed: true,
    thresholdUsed: coherenceThreshold,
    hotspots,
    selfImprovementProposals,
  };
}
