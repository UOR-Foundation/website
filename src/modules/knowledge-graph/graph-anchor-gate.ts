/**
 * Graph Anchor Compliance Gate
 * ═══════════════════════════════════════════════════════════════════
 *
 * Audits Knowledge Graph-first coverage across the system.
 * Every user-facing module MUST anchor interactions into the
 * Sovereign Knowledge Graph. This gate reports coverage.
 *
 * @module knowledge-graph/graph-anchor-gate
 */

import {
  registerGate,
  buildGateResult,
  type GateFinding,
} from "@/modules/canonical-compliance/gates/gate-runner";
import { getAnchoredModules } from "./anchor";

// ── User-Facing Modules That MUST Anchor ─────────────────────────────────────

const REQUIRED_ANCHORED_MODULES = [
  "messenger",
  "media",
  "projects",
  "app-store",
  "data-bank",
  "api-explorer",
  "observable",
  "auth",
  "ceremony",
  "qr-cartridge",
  "mcp",
  "audio",
  "oracle",
  "desktop",
  "app-builder",
  "time-machine",
  "sovereign-spaces",
  "sovereign-vault",
  "takeout",
  "community",
] as const;

// ── Exempt Modules (algebraic primitives, infrastructure) ────────────────────

const EXEMPT_MODULES = new Set([
  "ring-core",
  "identity",
  "derivation",
  "certificate",
  "triad",
  "jsonld",
  "shacl",
  "state",
  "engine",
  "interoperability",
  "quantum",
  "uor-sdk",
  "ontology",
  "axioms",
  "cncf-compat",
  "donate",
]);

// ── KG Substrate Layers ──────────────────────────────────────────────────────

const SUBSTRATE_LAYERS = [
  { id: "seed", label: "Static Data Seed", sentinel: "urn:uor:seed:sentinel" },
  { id: "boot", label: "Boot Seal Anchor", anchorModule: "boot" },
  { id: "bus", label: "Bus Registry Sync", anchorModule: "bus" },
  { id: "ontology", label: "Ontology Materialization", anchorModule: "ontology" },
] as const;

// ── Gate Implementation ──────────────────────────────────────────────────────

function graphAnchorGate() {
  const findings: GateFinding[] = [];
  const anchored = getAnchoredModules();

  // ── Check 1: User-facing module anchor coverage ────────────────────────
  let requiredCount = 0;
  let coveredCount = 0;

  for (const mod of REQUIRED_ANCHORED_MODULES) {
    requiredCount++;
    if (anchored.has(mod)) {
      coveredCount++;
    } else {
      findings.push({
        severity: "warning",
        title: `Module "${mod}" not anchored to Knowledge Graph`,
        detail: `User-facing module "${mod}" has not called anchor() to record interactions in the Sovereign Knowledge Graph. All user-facing modules must be graph-first.`,
        recommendation: `Import { anchor } from "@/modules/knowledge-graph" and call anchor("${mod}", "event:name", { label: "..." }) at key interaction points.`,
      });
    }
  }

  const coverage = requiredCount > 0 ? coveredCount / requiredCount : 1;
  const coveragePct = Math.round(coverage * 100);

  if (coveragePct === 100) {
    findings.push({
      severity: "info",
      title: "Full KG-first coverage achieved",
      detail: `All ${requiredCount} user-facing modules are anchored into the Sovereign Knowledge Graph.`,
    });
  }

  // ── Check 2: KG Substrate Coverage ─────────────────────────────────────
  let substrateCovered = 0;

  for (const layer of SUBSTRATE_LAYERS) {
    const isPresent = layer.anchorModule
      ? anchored.has(layer.anchorModule)
      : anchored.has("knowledge-graph"); // seed triggers a KG anchor

    if (isPresent) {
      substrateCovered++;
    } else {
      findings.push({
        severity: "warning",
        title: `KG Substrate: "${layer.label}" not materialized`,
        detail: `The ${layer.label} layer has not been written to the Knowledge Graph. The OS should be projected entirely from the graph substrate.`,
        recommendation: `Ensure ${layer.id} initialization writes to the KG via anchor() or grafeoStore.putNode().`,
      });
    }
  }

  const substratePct = Math.round((substrateCovered / SUBSTRATE_LAYERS.length) * 100);

  if (substratePct === 100) {
    findings.push({
      severity: "info",
      title: "Full KG substrate coverage",
      detail: `All ${SUBSTRATE_LAYERS.length} substrate layers (seed, boot, bus, ontology) are materialized in the Knowledge Graph.`,
    });
  } else {
    findings.push({
      severity: "info",
      title: `KG substrate coverage: ${substratePct}%`,
      detail: `${substrateCovered}/${SUBSTRATE_LAYERS.length} substrate layers are materialized.`,
    });
  }

  // Score: base 100, lose 4 points per missing module, 5 per missing substrate layer
  return buildGateResult(
    "graph-anchor-coverage",
    "Knowledge Graph-First OS Conformance",
    findings,
    { error: 10, warning: 4, info: 0 },
  );
}

registerGate(graphAnchorGate);
