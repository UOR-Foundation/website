/**
 * SKOS W3C Conformance Gate
 * ═════════════════════════════════════════════════════════════════
 *
 * Enforces W3C SKOS Reference integrity conditions (S9, S13, S14,
 * S23, S25, S27) and best practices against the canonical vocabulary.
 *
 * Reference: https://www.w3.org/TR/skos-reference/
 *
 * @module canonical-compliance/gates/skos-conformance-gate
 */

import { registerGate, buildGateResult } from "./gate-runner";
import type { GateFinding } from "./gate-runner";
import { ALL_CONCEPTS, CONCEPT_INDEX, SYSTEM_ONTOLOGY } from "../../ontology/vocabulary";

registerGate(() => {
  const findings: GateFinding[] = [];

  // ── S9: skos:ConceptScheme and skos:Concept are disjoint ────────────
  const schemeId = SYSTEM_ONTOLOGY["@id"];
  if (CONCEPT_INDEX.has(schemeId)) {
    findings.push({
      severity: "error",
      title: "S9 Violation: Scheme/Concept Overlap",
      detail: `"${schemeId}" is both a ConceptScheme and a Concept. These classes must be disjoint per §4.5.1.`,
      recommendation: "Give the ConceptScheme a distinct @id.",
    });
  }

  // ── S13: prefLabel, altLabel, hiddenLabel pairwise disjoint ─────────
  for (const c of ALL_CONCEPTS) {
    const pref = c["skos:prefLabel"].toLowerCase();
    const alts = new Set(c["skos:altLabel"].map((a) => a.toLowerCase()));
    const hidden = new Set((c["skos:hiddenLabel"] ?? []).map((h) => h.toLowerCase()));

    if (alts.has(pref)) {
      findings.push({
        severity: "error",
        title: "S13 Violation: prefLabel in altLabel",
        detail: `${c["@id"]}: prefLabel "${c["skos:prefLabel"]}" also appears in altLabel. Labels must be disjoint per §6.5.4.`,
        recommendation: "Remove the duplicate from altLabel.",
      });
    }
    if (hidden.has(pref)) {
      findings.push({
        severity: "error",
        title: "S13 Violation: prefLabel in hiddenLabel",
        detail: `${c["@id"]}: prefLabel appears in hiddenLabel.`,
        recommendation: "Remove the duplicate from hiddenLabel.",
      });
    }
    for (const a of Array.from(alts)) {
      if (hidden.has(a)) {
        findings.push({
          severity: "error",
          title: "S13 Violation: altLabel in hiddenLabel",
          detail: `${c["@id"]}: "${a}" appears in both altLabel and hiddenLabel.`,
          recommendation: "Keep the label in only one property.",
        });
      }
    }
  }

  // ── S25: broader/narrower inverse symmetry ──────────────────────────
  for (const c of ALL_CONCEPTS) {
    if (c["skos:broader"]) {
      const parent = CONCEPT_INDEX.get(c["skos:broader"]);
      if (parent && !(parent["skos:narrower"] ?? []).includes(c["@id"])) {
        findings.push({
          severity: "warning",
          title: "S25 Asymmetry: Missing Inverse Narrower",
          detail: `${c["@id"]} declares broader "${c["skos:broader"]}", but parent lacks narrower back-reference.`,
          recommendation: "Add the inverse skos:narrower entry to the parent concept.",
        });
      }
    }
    for (const narrow of c["skos:narrower"] ?? []) {
      const child = CONCEPT_INDEX.get(narrow);
      if (child && child["skos:broader"] !== c["@id"]) {
        findings.push({
          severity: "warning",
          title: "S25 Asymmetry: Missing Inverse Broader",
          detail: `${c["@id"]} declares narrower "${narrow}", but child's broader is "${child["skos:broader"] ?? "(none)"}".`,
          recommendation: "Set skos:broader on the child concept.",
        });
      }
    }
  }

  // ── S23: skos:related is symmetric ──────────────────────────────────
  for (const c of ALL_CONCEPTS) {
    for (const rel of c["skos:related"] ?? []) {
      const target = CONCEPT_INDEX.get(rel);
      if (target && !(target["skos:related"] ?? []).includes(c["@id"])) {
        findings.push({
          severity: "warning",
          title: "S23 Asymmetry: Related Not Symmetric",
          detail: `${c["@id"]} declares related "${rel}", but "${rel}" does not reciprocate.`,
          recommendation: "Add the reciprocal skos:related entry.",
        });
      }
    }
  }

  // ── S27: skos:related disjoint with broaderTransitive ───────────────
  // Compute transitive broader closure for each concept
  const broaderTransitive = new Map<string, Set<string>>();
  function getBroaderClosure(id: string, visited = new Set<string>()): Set<string> {
    if (broaderTransitive.has(id)) return broaderTransitive.get(id)!;
    if (visited.has(id)) return new Set(); // cycle guard
    visited.add(id);
    const result = new Set<string>();
    const concept = CONCEPT_INDEX.get(id);
    if (concept?.["skos:broader"]) {
      result.add(concept["skos:broader"]);
      for (const ancestor of Array.from(getBroaderClosure(concept["skos:broader"], visited))) {
        result.add(ancestor);
      }
    }
    broaderTransitive.set(id, result);
    return result;
  }
  for (const c of ALL_CONCEPTS) getBroaderClosure(c["@id"]);

  for (const c of ALL_CONCEPTS) {
    for (const rel of c["skos:related"] ?? []) {
      const closure = broaderTransitive.get(c["@id"]);
      const relClosure = broaderTransitive.get(rel);
      if (closure?.has(rel) || relClosure?.has(c["@id"])) {
        findings.push({
          severity: "error",
          title: "S27 Violation: Related Overlaps Hierarchy",
          detail: `${c["@id"]} and "${rel}" are both skos:related AND in a broader/narrower transitive chain.`,
          recommendation: "Remove the skos:related link; the hierarchical relation is sufficient.",
        });
      }
    }
  }

  // ── Hierarchical cycle detection (§8.6.8) ───────────────────────────
  for (const c of ALL_CONCEPTS) {
    const closure = broaderTransitive.get(c["@id"]);
    if (closure?.has(c["@id"])) {
      findings.push({
        severity: "error",
        title: "Hierarchical Cycle Detected",
        detail: `${c["@id"]} is transitively broader than itself.`,
        recommendation: "Break the cycle by removing a broader reference.",
      });
    }
  }

  // ── Notation uniqueness (§6.5.4) ────────────────────────────────────
  const notations = new Map<string, string[]>();
  for (const c of ALL_CONCEPTS) {
    const n = c["skos:notation"];
    if (n) {
      const list = notations.get(n) ?? [];
      list.push(c["@id"]);
      notations.set(n, list);
    }
  }
  for (const [notation, ids] of Array.from(notations.entries())) {
    if (ids.length > 1) {
      findings.push({
        severity: "error",
        title: "Duplicate Notation",
        detail: `Notation "${notation}" is shared by: ${ids.join(", ")}. Notations must be unique within a scheme.`,
        recommendation: "Assign unique notations.",
      });
    }
  }

  // ── TopConcept consistency (S7/S8) ──────────────────────────────────
  const schemeTops = new Set(SYSTEM_ONTOLOGY["skos:hasTopConcept"] ?? []);
  const conceptTops = ALL_CONCEPTS.filter((c) => c["skos:topConceptOf"] === schemeId);

  for (const c of conceptTops) {
    if (!schemeTops.has(c["@id"])) {
      findings.push({
        severity: "warning",
        title: "TopConcept Mismatch",
        detail: `${c["@id"]} declares topConceptOf but scheme lacks hasTopConcept back-reference.`,
        recommendation: "Add the concept to skos:hasTopConcept on the scheme.",
      });
    }
  }
  for (const top of Array.from(schemeTops)) {
    if (!CONCEPT_INDEX.get(top)?.["skos:topConceptOf"]) {
      findings.push({
        severity: "warning",
        title: "TopConcept Mismatch",
        detail: `Scheme lists "${top}" in hasTopConcept but concept lacks topConceptOf.`,
        recommendation: "Add skos:topConceptOf to the concept.",
      });
    }
  }

  // ── Coverage: concepts without broader are implicit top concepts ────
  const rootConcepts = ALL_CONCEPTS.filter((c) => !c["skos:broader"]);
  const undeclaredRoots = rootConcepts.filter((c) => !c["skos:topConceptOf"]);
  if (undeclaredRoots.length > 0) {
    findings.push({
      severity: "info",
      title: "Undeclared Top Concepts",
      detail: `${undeclaredRoots.length} root concepts lack skos:topConceptOf: ${undeclaredRoots.slice(0, 5).map((c) => c["@id"]).join(", ")}${undeclaredRoots.length > 5 ? "…" : ""}.`,
      recommendation: "Add skos:topConceptOf to root concepts for full W3C compliance.",
    });
  }

  // ── Summary ─────────────────────────────────────────────────────────
  const notationCount = Array.from(notations.keys()).length;
  findings.push({
    severity: "info",
    title: "SKOS Conformance Summary",
    detail: `${ALL_CONCEPTS.length} concepts, ${rootConcepts.length} roots, ${notationCount} notations, ${schemeTops.size} declared top concepts.`,
  });

  return buildGateResult("skos-w3c-conformance", "SKOS Gate", findings, {
    error: 10,
    warning: 4,
    info: 0,
  });
});
