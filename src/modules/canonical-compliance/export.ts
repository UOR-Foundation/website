/**
 * Canonical Compliance — Export Formats
 * ═════════════════════════════════════════════════════════════════
 *
 * Generate machine-readable audit artifacts:
 *   1. Markdown — human-readable provenance tables with firmware version
 *   2. JSON-LD  — RDF-compatible linked data
 *   3. N-Quads  — SPARQL-queryable triples
 *
 * @version 2.0.0
 */

import { type AuditReport } from "./audit";
import { buildProvenanceTriples } from "./provenance-graph";
import { PROVENANCE_REGISTRY } from "./provenance-map";
import { ALL_ATOMS, FIRMWARE_VERSION } from "./atoms";
import { CRATE_MANIFEST } from "@/modules/engine/crate-manifest";

// ── Markdown Export ─────────────────────────────────────────────

export function exportMarkdown(report: AuditReport): string {
  const lines: string[] = [
    "# UOR Canonical Compliance Audit",
    "",
    "## Firmware",
    "",
    `| Property | Value |`,
    `|----------|-------|`,
    `| **Crate** | \`uor-foundation\` |`,
    `| **Version** | \`${FIRMWARE_VERSION}\` |`,
    `| **Namespaces** | ${CRATE_MANIFEST.namespaceCount} |`,
    `| **Classes** | ${CRATE_MANIFEST.classCount} |`,
    `| **Properties** | ${CRATE_MANIFEST.propertyCount} |`,
    `| **Atoms Synced** | ${ALL_ATOMS.length} |`,
    "",
    "---",
    "",
    `**Generated**: ${report.timestamp}`,
    `**Grounding Score**: ${report.groundingScore}%`,
    `**Total Exports**: ${report.totalExports}`,
    `**Grounded**: ${report.groundedCount} | **Partial**: ${report.partialCount} | **Ungrounded**: ${report.ungroundedCount}`,
    "",
    "---",
    "",
    "## Atom Registry",
    "",
    "| ID | Label | Category | Rust Type | TS Projection | Referenced By |",
    "|-----|-------|----------|-----------|---------------|---------------|",
  ];

  for (const ac of report.atomCoverage) {
    const a = ac.atom;
    lines.push(
      `| \`${a.id}\` | ${a.label} | ${a.category} | \`${a.crateNamespace}::${a.rustType}\` | \`${a.tsProjection}\` | ${ac.referencedBy} |`,
    );
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Module Provenance");
  lines.push("");

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

  lines.push("## Findings");
  lines.push("");
  for (const f of report.findings) {
    if (f.status !== "grounded") {
      lines.push(
        `- **${f.status.toUpperCase()}**: \`${f.module}/${f.export}\` — invalid atoms: ${f.invalidAtoms.map((a) => `\`${a}\``).join(", ") || "none (empty chain)"}`,
      );
    }
  }

  lines.push("");
  lines.push("---");
  lines.push(`*Firmware: uor-foundation v${FIRMWARE_VERSION} | Generated: ${new Date().toISOString()}*`);

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
    "uor:firmwareVersion": FIRMWARE_VERSION,
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
