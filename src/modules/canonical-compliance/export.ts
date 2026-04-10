/**
 * Canonical Compliance — Export Formats
 * ═════════════════════════════════════════════════════════════════
 *
 * Generate machine-readable audit artifacts:
 *   1. Markdown — human-readable provenance tables
 *   2. JSON-LD  — RDF-compatible linked data
 *   3. N-Quads  — SPARQL-queryable triples
 *
 * @version 1.0.0
 */

import { type AuditReport } from "./audit";
import { buildProvenanceTriples } from "./provenance-graph";
import { PROVENANCE_REGISTRY } from "./provenance-map";

// ── Markdown Export ─────────────────────────────────────────────

export function exportMarkdown(report: AuditReport): string {
  const lines: string[] = [
    "# UOR Canonical Compliance Audit",
    "",
    `**Generated**: ${report.timestamp}`,
    `**Grounding Score**: ${report.groundingScore}%`,
    `**Total Exports**: ${report.totalExports}`,
    `**Grounded**: ${report.groundedCount} | **Partial**: ${report.partialCount} | **Ungrounded**: ${report.ungroundedCount}`,
    "",
    "---",
    "",
    "## Module Provenance",
    "",
  ];

  for (const mod of PROVENANCE_REGISTRY) {
    lines.push(`### ${mod.module}`);
    lines.push(`> ${mod.description}`);
    lines.push("");
    lines.push("| Export | Atoms | Pipeline |");
    lines.push("|--------|-------|----------|");
    for (const exp of mod.exports) {
      lines.push(
        `| \`${exp.export}\` | ${exp.atoms.map((a) => `\`${a}\``).join(", ")} | ${exp.pipeline} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Atom Coverage");
  lines.push("");
  lines.push("| Atom | Category | Referenced By |");
  lines.push("|------|----------|---------------|");
  for (const ac of report.atomCoverage) {
    lines.push(
      `| \`${ac.atom.id}\` | ${ac.atom.category} | ${ac.referencedBy} |`,
    );
  }

  lines.push("");
  lines.push("## Findings");
  lines.push("");
  for (const f of report.findings) {
    if (f.status !== "grounded") {
      lines.push(
        `- **${f.status.toUpperCase()}**: \`${f.module}/${f.export}\` — invalid atoms: ${f.invalidAtoms.map((a) => `\`${a}\``).join(", ") || "none (empty chain)"}`,
      );
    }
  }

  return lines.join("\n");
}

// ── JSON-LD Export ──────────────────────────────────────────────

export function exportJsonLd(report: AuditReport): string {
  const triples = buildProvenanceTriples();

  const doc = {
    "@context": {
      uor: "https://uor.foundation/ns/",
      rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    },
    "@type": "uor:ComplianceAudit",
    "uor:groundingScore": report.groundingScore,
    "uor:timestamp": report.timestamp,
    "@graph": triples.map((t) => ({
      "@id": t.subject,
      [t.predicate]: t.object,
    })),
  };

  return JSON.stringify(doc, null, 2);
}

// ── N-Quads Export ──────────────────────────────────────────────

export function exportNQuads(): string {
  const triples = buildProvenanceTriples();
  const graph = "<https://uor.foundation/provenance>";

  return triples
    .map(
      (t) =>
        `<${t.subject}> <${t.predicate}> "${t.object}" ${graph} .`,
    )
    .join("\n");
}
