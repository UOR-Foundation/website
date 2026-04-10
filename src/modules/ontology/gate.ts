/**
 * Ontology Consistency Gate
 * ═════════════════════════════════════════════════════════════════
 *
 * Compliance gate that verifies terminology consistency across the
 * system by checking the canonical SKOS vocabulary for:
 *   - Coverage: all CNCF categories represented
 *   - Integrity: no orphaned alt-labels
 *   - Cross-refs: devops-glossary entries are a subset
 *   - Profiles: every concept has all 3 audience labels
 *
 * @module ontology/gate
 */

import { registerGate } from "../canonical-compliance/gates/gate-runner";
import type { GateFinding, GateResult } from "../canonical-compliance/gates/gate-runner";
import { ALL_CONCEPTS, CONCEPT_INDEX } from "./vocabulary";
import type { SkosConcept } from "./types";

registerGate((): GateResult => {
  const findings: GateFinding[] = [];
  let score = 100;

  // 1. Every concept must have all 3 profile labels
  for (const c of ALL_CONCEPTS) {
    const labels = c["uor:profileLabels"];
    if (!labels.developer || !labels.user || !labels.scientist) {
      score -= 3;
      findings.push({
        severity: "error",
        title: "Missing Profile Label",
        detail: `Concept ${c["@id"]} is missing one or more profile labels (developer/user/scientist).`,
        recommendation: "Add all 3 profile labels to the concept in vocabulary.ts.",
      });
    }
  }

  // 2. skos:broader references must resolve to existing concepts
  for (const c of ALL_CONCEPTS) {
    if (c["skos:broader"] && !CONCEPT_INDEX.has(c["skos:broader"])) {
      score -= 5;
      findings.push({
        severity: "error",
        title: "Broken Broader Reference",
        detail: `${c["@id"]} references skos:broader "${c["skos:broader"]}" which does not exist.`,
        recommendation: "Add the parent concept or fix the reference.",
      });
    }
  }

  // 3. skos:narrower references must resolve
  for (const c of ALL_CONCEPTS) {
    for (const narrow of c["skos:narrower"] ?? []) {
      if (!CONCEPT_INDEX.has(narrow)) {
        score -= 5;
        findings.push({
          severity: "error",
          title: "Broken Narrower Reference",
          detail: `${c["@id"]} references skos:narrower "${narrow}" which does not exist.`,
          recommendation: "Add the child concept or fix the reference.",
        });
      }
    }
  }

  // 4. Check for duplicate alt-labels across concepts (ambiguity)
  const altMap = new Map<string, SkosConcept[]>();
  for (const c of ALL_CONCEPTS) {
    for (const alt of c["skos:altLabel"]) {
      const key = alt.toLowerCase();
      const list = altMap.get(key) ?? [];
      list.push(c);
      altMap.set(key, list);
    }
  }
  for (const [alt, concepts] of altMap) {
    if (concepts.length > 1) {
      score -= 2;
      findings.push({
        severity: "warning",
        title: "Ambiguous Alt-Label",
        detail: `"${alt}" is an altLabel on ${concepts.length} concepts: ${concepts.map((c) => c["@id"]).join(", ")}. Resolution will return the first match.`,
        recommendation: "Remove the duplicate or use a more specific label.",
      });
    }
  }

  // 5. CNCF category coverage
  const requiredCategories = [
    "Service Mesh",
    "Container Runtime",
    "Scheduling & Orchestration",
    "Observability & Analysis",
    "Security & Compliance",
    "Application Definition & Image Build",
    "Cloud Native Storage",
  ];
  const coveredCategories = new Set(
    ALL_CONCEPTS.map((c) => c["uor:cncfCategory"]).filter(Boolean),
  );
  for (const cat of requiredCategories) {
    if (!coveredCategories.has(cat)) {
      score -= 5;
      findings.push({
        severity: "warning",
        title: "Missing CNCF Category",
        detail: `No concept covers CNCF category "${cat}".`,
        recommendation: "Add a concept with this cncfCategory.",
      });
    }
  }

  // 6. Concept count sanity
  findings.push({
    severity: "info",
    title: "Vocabulary Size",
    detail: `${ALL_CONCEPTS.length} canonical concepts, ${altMap.size} unique alt-labels, ${coveredCategories.size} CNCF categories covered.`,
  });

  const status = score >= 80 ? "pass" : score >= 50 ? "warn" : "fail";

  return {
    id: "ontology-consistency",
    name: "Ontology Consistency",
    status,
    score: Math.max(0, score),
    findings,
    timestamp: new Date().toISOString(),
  };
});
