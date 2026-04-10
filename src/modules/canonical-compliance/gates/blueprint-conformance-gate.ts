/**
 * Blueprint Conformance Gate — Architectural Minimality Enforcer
 * ═══════════════════════════════════════════════════════════════
 *
 * Enforces the pyramid principle: lean architecture, no ghost modules,
 * layer budgets, and blueprint coverage for every active module.
 *
 * Three checks:
 *   1. Ghost Directory Detection — dirs not in ACTIVE or ABSORBED lists
 *   2. Layer Budget Enforcement — pyramid-based module caps per layer
 *   3. Blueprint Coverage — every active module must self-declare
 *
 * @module canonical-compliance/gates/blueprint-conformance-gate
 */

import { registerGate, buildGateResult, type GateFinding } from "./gate-runner";

// ── Canonical Module Registry (single source of truth) ───────────────────

const ACTIVE_MODULES: readonly string[] = [
  // Layer 0: Shell
  "core", "landing", "desktop", "boot",
  // Layer 1: Algebra
  "engine", "ring-core", "identity", "morphism",
  // Layer 2: Knowledge
  "knowledge-graph", "derivation", "epistemic", "sparql",
  // Layer 3: Resolution
  "resolver", "observable", "state", "bus",
  // Layer 4: Verification
  "verify", "agent-tools", "canonical-compliance", "uns",
  // Layer 5: Features
  "atlas", "audio", "certificate", "community", "interoperability",
  "mcp", "oracle", "projects", "quantum", "qsvg",
  "sovereign-vault", "uor-sdk", "code-kg", "ontology", "axioms",
];

const ABSORBED_MODULES: readonly string[] = [
  "triad", "donate", "shacl", "jsonld", "qr-cartridge",
  "messenger", "data-bank",
];

// ── Pyramid Layer Budgets ────────────────────────────────────────────────

interface LayerBudget {
  readonly name: string;
  readonly max: number;
  readonly modules: readonly string[];
}

const LAYER_BUDGETS: readonly LayerBudget[] = [
  { name: "L0 Shell",        max: 4,  modules: ["core", "landing", "desktop", "boot"] },
  { name: "L1 Algebra",      max: 4,  modules: ["engine", "ring-core", "identity", "morphism"] },
  { name: "L2 Knowledge",    max: 4,  modules: ["knowledge-graph", "derivation", "epistemic", "sparql"] },
  { name: "L3 Resolution",   max: 4,  modules: ["resolver", "observable", "state", "bus"] },
  { name: "L4 Verification", max: 4,  modules: ["verify", "agent-tools", "canonical-compliance", "uns"] },
  { name: "L5 Features",     max: 15, modules: [
    "atlas", "audio", "certificate", "community", "interoperability",
    "mcp", "oracle", "projects", "quantum", "qsvg",
    "sovereign-vault", "uor-sdk", "code-kg", "ontology", "axioms",
  ]},
];

// ── Known On-Disk Directories (static snapshot — update as dirs change) ──

const ON_DISK_DIRECTORIES: readonly string[] = [
  "agent-tools", "api-explorer", "app-builder", "app-store", "atlas",
  "audio", "auth", "axioms", "boot", "bus", "canonical-compliance",
  "ceremony", "certificate", "cncf-compat", "code-kg", "community",
  "compose", "core", "data-bank", "derivation", "desktop", "donate",
  "engine", "epistemic", "identity", "interoperability", "jsonld",
  "knowledge-graph", "landing", "mcp", "media", "messenger", "morphism",
  "observable", "ontology", "oracle", "projects", "qr-cartridge", "qsvg",
  "quantum", "resolver", "ring-core", "shacl", "sovereign-spaces",
  "sovereign-vault", "sparql", "state", "takeout", "time-machine",
  "triad", "uns", "uor-sdk", "verify",
];

// ── Gate Implementation ──────────────────────────────────────────────────

function blueprintConformanceGate() {
  const findings: GateFinding[] = [];
  const declared = new Set([...ACTIVE_MODULES, ...ABSORBED_MODULES]);

  // ── Check 1: Ghost Directory Detection ─────────────────────────────────
  const ghosts = ON_DISK_DIRECTORIES.filter((d) => !declared.has(d));

  if (ghosts.length > 0) {
    findings.push({
      severity: "warning",
      title: `${ghosts.length} ghost director${ghosts.length === 1 ? "y" : "ies"} detected`,
      detail: `Directories on disk but not declared active or absorbed: ${ghosts.join(", ")}`,
      recommendation: "Remove ghost directories or explicitly declare them as active/absorbed.",
    });

    // Individual ghost findings for hotspot tracking
    for (const ghost of ghosts.slice(0, 5)) {
      findings.push({
        severity: "info",
        title: `Ghost: src/modules/${ghost}/`,
        detail: "Exists on disk with no canonical declaration.",
        file: `src/modules/${ghost}/`,
        recommendation: "Delete directory or add to ACTIVE/ABSORBED registry.",
      });
    }
  }

  // ── Check 2: Layer Budget Enforcement ──────────────────────────────────
  for (const layer of LAYER_BUDGETS) {
    if (layer.modules.length > layer.max) {
      const excess = layer.modules.length - layer.max;
      findings.push({
        severity: "warning",
        title: `${layer.name} exceeds budget by ${excess}`,
        detail: `${layer.modules.length}/${layer.max} modules: ${layer.modules.join(", ")}`,
        recommendation: `Consolidate or absorb ${excess} module(s) to meet pyramid budget.`,
      });
    }
  }

  // ── Check 3: Blueprint Coverage ────────────────────────────────────────
  // Modules known to export a manifest or blueprint with @context/@type
  const MODULES_WITH_BLUEPRINTS = new Set([
    "core", "engine", "ring-core", "identity", "knowledge-graph",
    "derivation", "canonical-compliance", "uns", "oracle", "quantum",
    "atlas", "audio", "verify", "morphism", "epistemic",
  ]);

  const ungrounded = ACTIVE_MODULES.filter((m) => !MODULES_WITH_BLUEPRINTS.has(m));

  if (ungrounded.length > 0) {
    findings.push({
      severity: "info",
      title: `${ungrounded.length} modules lack blueprint declarations`,
      detail: `Modules without @context/@type manifests: ${ungrounded.join(", ")}`,
      recommendation: "Add a ModuleManifest export with @context and @type to each module.",
    });
  }

  // ── Summary finding ────────────────────────────────────────────────────
  const totalActive = ACTIVE_MODULES.length;
  const totalAbsorbed = ABSORBED_MODULES.length;
  const totalGhosts = ghosts.length;
  const blueprintCoverage = Math.round(
    ((totalActive - ungrounded.length) / totalActive) * 100,
  );

  findings.push({
    severity: "info",
    title: `Architecture: ${totalActive} active, ${totalAbsorbed} absorbed, ${totalGhosts} ghost`,
    detail: `Blueprint coverage: ${blueprintCoverage}%. Pyramid layers: ${LAYER_BUDGETS.length}.`,
  });

  return buildGateResult(
    "blueprint-conformance",
    "Blueprint Conformance",
    findings,
    { error: 10, warning: 5, info: 0 },
  );
}

// ── Register ─────────────────────────────────────────────────────────────

registerGate(blueprintConformanceGate);
