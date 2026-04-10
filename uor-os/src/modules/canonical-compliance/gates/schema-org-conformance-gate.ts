/**
 * Schema.org Conformance Gate
 * ═════════════════════════════════════════════════════════════════
 *
 * Enforces schema.org interoperability across all JSON-LD emitters,
 * hologram projections, and the SKOS vocabulary bridge.
 *
 * Six checks:
 *   1. Type validity — all emitted @types are in the registry
 *   2. Property domain — emitted properties belong to declared type
 *   3. Dual context — both schema.org and UOR contexts present
 *   4. Required properties — mandatory fields per type
 *   5. SKOS→Schema.org bridge — root concepts have closeMatch
 *   6. UOR mapping coverage — every UOR namespace has a schema.org type
 *
 * Reference: https://schema.org/docs/full.html
 *
 * @module canonical-compliance/gates/schema-org-conformance-gate
 */

import { registerGate, buildGateResult } from "./gate-runner";
import type { GateFinding } from "./gate-runner";
import {
  recordToSchemaOrg,
  functionToSchemaOrg,
  objectToSchemaOrg,
  nodeToSchemaOrg,
} from "../../knowledge-graph/schema-org";
import {
  SCHEMA_ORG_TYPE_INDEX,
  getAllProperties,
} from "../../knowledge-graph/schema-org-types";
import { ALL_CONCEPTS } from "../../ontology/vocabulary";

// ── Test Fixtures ────────────────────────────────────────────────────────

const VALID_DERIV = "urn:uor:derivation:sha256:" + "ab".repeat(32);

const TEST_EMITTERS: Array<{
  name: string;
  fn: () => object;
}> = [
  {
    name: "recordToSchemaOrg",
    fn: () =>
      recordToSchemaOrg({
        "uns:name": "test.uns",
        "uns:canonicalId": VALID_DERIV,
        "u:ipv6": "fd00::1",
        "derivation:derivationId": VALID_DERIV,
        "partition:density": 0.5,
      }),
  },
  {
    name: "functionToSchemaOrg",
    fn: () =>
      functionToSchemaOrg({
        canonicalId: VALID_DERIV,
        name: "test-fn",
        deployedAt: "2025-01-01T00:00:00Z",
      }),
  },
  {
    name: "objectToSchemaOrg (JSON)",
    fn: () =>
      objectToSchemaOrg(
        { canonicalId: VALID_DERIV, byteLength: 1024, createdAt: "2025-01-01T00:00:00Z" },
        "application/json"
      ),
  },
  {
    name: "objectToSchemaOrg (binary)",
    fn: () =>
      objectToSchemaOrg(
        { canonicalId: VALID_DERIV, byteLength: 2048 },
        "application/octet-stream"
      ),
  },
  {
    name: "nodeToSchemaOrg",
    fn: () => nodeToSchemaOrg(VALID_DERIV, "Test Node"),
  },
];

// ── UOR namespaces that should have schema.org coverage ──────────────────

const CORE_UOR_NAMESPACES = [
  "u:", "op:", "query:", "store:", "compute:", "morphism:",
  "proof:", "partition:", "observable:", "trace:", "conduit:",
  "bus/", "schema:",
];

// ── Schema.org concepts that root SKOS concepts should bridge to ─────────

const EXPECTED_SCHEMA_ORG_BRIDGES: ReadonlyMap<string, string> = new Map([
  ["uor:ServiceMesh", "https://schema.org/SoftwareApplication"],
  ["uor:ContainerRuntime", "https://schema.org/SoftwareApplication"],
  ["uor:StorageVolume", "https://schema.org/Dataset"],
  ["uor:ServiceDiscovery", "https://schema.org/SearchAction"],
  ["uor:HealthProbe", "https://schema.org/CheckAction"],
  ["uor:ConfigMap", "https://schema.org/PropertyValue"],
  ["uor:Secret", "https://schema.org/PropertyValue"],
  ["uor:Operator", "https://schema.org/SoftwareApplication"],
  ["uor:Ingress", "https://schema.org/EntryPoint"],
  ["uor:APIGateway", "https://schema.org/EntryPoint"],
]);

registerGate(() => {
  const findings: GateFinding[] = [];

  // ── Check 1 & 2 & 3 & 4: Validate all emitters ────────────────────
  for (const emitter of TEST_EMITTERS) {
    let output: Record<string, unknown>;
    try {
      output = emitter.fn() as Record<string, unknown>;
    } catch (err) {
      findings.push({
        severity: "error",
        title: `Emitter Failure: ${emitter.name}`,
        detail: `${emitter.name}() threw: ${err}`,
        recommendation: "Fix the emitter function.",
      });
      continue;
    }

    // Check 1: Type validity
    const type = output["@type"] as string | undefined;
    if (!type) {
      findings.push({
        severity: "error",
        title: `Missing @type: ${emitter.name}`,
        detail: `${emitter.name}() output has no @type.`,
        recommendation: "Add a valid schema.org @type.",
      });
    } else if (!SCHEMA_ORG_TYPE_INDEX.has(type)) {
      findings.push({
        severity: "error",
        title: `Unregistered Type: ${type}`,
        detail: `${emitter.name}() emits @type "${type}" which is not in the schema.org type registry.`,
        recommendation: `Register "${type}" in schema-org-types.ts before using it.`,
      });
    } else {
      // Check 2: Property domain validation
      const validProps = getAllProperties(type);
      // Add known UOR extension properties that are always valid
      const uorExtensions = new Set([
        "@context", "@type", "epistemic_grade", "uor:canonicalId",
      ]);
      for (const key of Object.keys(output)) {
        if (uorExtensions.has(key)) continue;
        if (key.startsWith("schema:") && !validProps.has(key)) {
          findings.push({
            severity: "warning",
            title: `Property Domain Mismatch: ${key}`,
            detail: `${emitter.name}() emits "${key}" on type "${type}", but this property is not in ${type}'s domain.`,
            recommendation: `Check schema.org docs for valid properties of ${type}, or register the property.`,
          });
        }
      }

      // Check 4: Required properties
      const spec = SCHEMA_ORG_TYPE_INDEX.get(type);
      if (spec?.required) {
        for (const req of spec.required) {
          if (output[req] === undefined || output[req] === null) {
            findings.push({
              severity: "warning",
              title: `Missing Required Property: ${req}`,
              detail: `${emitter.name}() emits ${type} without required property "${req}".`,
              recommendation: `Add "${req}" to the emitter output.`,
            });
          }
        }
      }
    }

    // Check 3: Dual context
    const ctx = output["@context"];
    if (!Array.isArray(ctx)) {
      findings.push({
        severity: "error",
        title: `Missing Dual Context: ${emitter.name}`,
        detail: `${emitter.name}() @context is not an array. Must include both schema.org and UOR contexts.`,
        recommendation: "Use [\"https://schema.org\", \"https://uor.foundation/contexts/uns-v1.jsonld\"].",
      });
    } else {
      const hasSchemaOrg = ctx.some((c: string) =>
        typeof c === "string" && c.includes("schema.org")
      );
      const hasUor = ctx.some((c: string) =>
        typeof c === "string" && c.includes("uor.foundation")
      );
      if (!hasSchemaOrg) {
        findings.push({
          severity: "error",
          title: `Missing schema.org Context: ${emitter.name}`,
          detail: `@context lacks "https://schema.org".`,
          recommendation: "Add schema.org to the @context array.",
        });
      }
      if (!hasUor) {
        findings.push({
          severity: "error",
          title: `Missing UOR Context: ${emitter.name}`,
          detail: `@context lacks UOR foundation context.`,
          recommendation: "Add UOR context to the @context array.",
        });
      }
    }
  }

  // ── Check 5: SKOS→Schema.org bridge coverage ──────────────────────
  let bridgedCount = 0;
  let unbridgedCount = 0;
  const unbridgedConcepts: string[] = [];

  for (const [conceptId, expectedUrl] of Array.from(EXPECTED_SCHEMA_ORG_BRIDGES.entries())) {
    const concept = ALL_CONCEPTS.find((c) => c["@id"] === conceptId);
    if (!concept) continue;

    const closeMatches = concept["skos:closeMatch"] ?? [];
    const exactMatches = concept["skos:exactMatch"] ?? [];
    const allMatches = [...closeMatches, ...exactMatches];

    const hasSchemaOrgLink = allMatches.some((m) => m.includes("schema.org"));
    if (hasSchemaOrgLink) {
      bridgedCount++;
    } else {
      unbridgedCount++;
      unbridgedConcepts.push(conceptId);
    }
  }

  if (unbridgedCount > 0) {
    findings.push({
      severity: "warning",
      title: `SKOS→Schema.org Bridge Gaps: ${unbridgedCount}`,
      detail: `${unbridgedCount} root concepts lack skos:closeMatch to schema.org: ${unbridgedConcepts.slice(0, 5).join(", ")}${unbridgedConcepts.length > 5 ? "…" : ""}.`,
      recommendation: "Add skos:closeMatch entries pointing to schema.org type URIs.",
    });
  }

  // Also check all root concepts (no broader) for schema.org awareness
  const rootConcepts = ALL_CONCEPTS.filter((c) => !c["skos:broader"]);
  const rootsWithoutSchemaOrg = rootConcepts.filter((c) => {
    const all = [
      ...(c["skos:closeMatch"] ?? []),
      ...(c["skos:exactMatch"] ?? []),
      ...(c["skos:broadMatch"] ?? []),
    ];
    return !all.some((m) => m.includes("schema.org"));
  });

  if (rootsWithoutSchemaOrg.length > 0) {
    findings.push({
      severity: "info",
      title: `Root Concepts Without Schema.org Links: ${rootsWithoutSchemaOrg.length}`,
      detail: `${rootsWithoutSchemaOrg.length} root concepts have no schema.org mapping: ${rootsWithoutSchemaOrg.slice(0, 5).map((c) => c["@id"]).join(", ")}${rootsWithoutSchemaOrg.length > 5 ? "…" : ""}.`,
      recommendation: "Consider adding skos:closeMatch or skos:broadMatch to schema.org for full interoperability.",
    });
  }

  // ── Check 6: UOR namespace coverage ────────────────────────────────
  const coveredNamespaces = new Set<string>();
  for (const spec of Array.from(SCHEMA_ORG_TYPE_INDEX.values())) {
    if (spec.uorMapping) coveredNamespaces.add(spec.uorMapping);
  }

  const uncoveredNamespaces = CORE_UOR_NAMESPACES.filter(
    (ns) => !coveredNamespaces.has(ns)
  );

  if (uncoveredNamespaces.length > 0) {
    findings.push({
      severity: "warning",
      title: `UOR Namespaces Without Schema.org Mapping: ${uncoveredNamespaces.length}`,
      detail: `Namespaces lacking schema.org type coverage: ${uncoveredNamespaces.join(", ")}.`,
      recommendation: "Register schema.org types with uorMapping for these namespaces.",
    });
  }

  // ── Summary ────────────────────────────────────────────────────────
  findings.push({
    severity: "info",
    title: "Schema.org Conformance Summary",
    detail: `${TEST_EMITTERS.length} emitters validated, ${SCHEMA_ORG_TYPE_INDEX.size} types registered, ${bridgedCount}/${EXPECTED_SCHEMA_ORG_BRIDGES.size} SKOS bridges active, ${coveredNamespaces.size}/${CORE_UOR_NAMESPACES.length} UOR namespaces covered.`,
  });

  return buildGateResult("schema-org-conformance", "Schema.org Gate", findings, {
    error: 10,
    warning: 3,
    info: 0,
  });
});
