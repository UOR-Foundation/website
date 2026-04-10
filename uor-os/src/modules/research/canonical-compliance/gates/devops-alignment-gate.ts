/**
 * DevOps Alignment Gate — Terminology & Wiring Verification
 * ═════════════════════════════════════════════════════════════════
 *
 * Verifies that internal system components are correctly aligned with
 * standard DevOps/CNCF conventions:
 *   1. CNCF category maturity claims match actual module existence
 *   2. Health probe coverage for bus-registered modules
 *   3. Terminology consistency via the DevOps Glossary
 *
 * @module canonical-compliance/gates/devops-alignment-gate
 */

import { registerGate, buildGateResult } from "./gate-runner";
import type { GateFinding } from "./gate-runner";
import { CNCF_CATEGORIES } from "@/modules/interoperability/cncf-compat/categories";
import { DEVOPS_GLOSSARY } from "../devops-glossary";

// ── Known module path roots that exist in the codebase ───────────────────

const KNOWN_MODULE_ROOTS = new Set([
  "uns/core",
  "uns/build",
  "uns/store",
  "uns/ledger",
  "uns/trust",
  "uns/shield",
  "uns/compute",
  "uns/core/dht",
  "uns/core/resolver",
  "uns/core/address",
  "uns/core/ipv6",
  "uns/core/keypair",
  "uns/trust/auth",
  "uns/build/container",
  "uns/build/uorfile",
  "uns/build/docker-compat",
  "uns/build/registry",
  "uns/mesh",
  "bus/registry",
  "compose/orchestrator",
  "compose/reconciler",
  "compose/auto-scaler",
  "compose/rolling-update",
  "compose/app-kernel",
  "compose/static-blueprints",
  "observable/system-event-bus",
  "observable/stream-projection",
  "cncf-compat/cloudevents",
  "cncf-compat/otlp",
  "cncf-compat/pipeline",
  "cncf-compat/chaos",
  "cncf-compat/gateway",
  "canonical-compliance",
  "certificate",
]);

// ── Bus modules that should have health probes ──────────────────────────

const BUS_MODULES_REQUIRING_PROBES = [
  "kernel", "ring", "identity", "morphism", "verify",
  "graph", "cert", "uns", "resolver", "observable", "trace",
  "vault", "continuity", "local-llm",
  "data-engine", "blueprint", "oracle", "store", "scrape",
  "wolfram", "audio", "social", "sparql", "mcp",
  "mesh-sync", "clipboard",
];

const EXEMPT_FROM_PROBES = new Set(["clipboard", "trace"]);

// ── Gate Implementation ─────────────────────────────────────────────────

function devopsAlignmentGate() {
  const findings: GateFinding[] = [];

  // ── 1. CNCF Category Maturity Verification ──────────────────────────
  for (const cat of CNCF_CATEGORIES) {
    if (cat.uorMaturity === "planned") continue; // planned = not yet expected

    for (const mod of cat.uorModules) {
      if (!KNOWN_MODULE_ROOTS.has(mod)) {
        findings.push({
          severity: "warning",
          title: `Unresolved module reference: ${mod}`,
          detail: `CNCF category "${cat.category}" (maturity: ${cat.uorMaturity}) references module "${mod}" which is not in the known module registry.`,
          recommendation: `Add "${mod}" to the known module roots or update the category to reflect actual maturity.`,
        });
      }
    }
  }

  // ── 2. Maturity Accuracy ────────────────────────────────────────────
  const maturityMismatches = CNCF_CATEGORIES.filter((c) => {
    if (c.uorMaturity !== "complete") return false;
    return c.uorModules.some((m) => !KNOWN_MODULE_ROOTS.has(m));
  });

  for (const cat of maturityMismatches) {
    const missing = cat.uorModules.filter((m) => !KNOWN_MODULE_ROOTS.has(m));
    findings.push({
      severity: "error",
      title: `Maturity mismatch: ${cat.category}`,
      detail: `Marked "complete" but ${missing.length} module(s) unresolved: ${missing.join(", ")}`,
      recommendation: `Either implement the missing modules or downgrade maturity to "partial".`,
    });
  }

  // ── 3. Health Probe Coverage ────────────────────────────────────────
  const modulesWithoutProbes = BUS_MODULES_REQUIRING_PROBES.filter(
    (m) => !EXEMPT_FROM_PROBES.has(m),
  );

  // Static check: bus modules should ideally register a healthz operation.
  // Since we can't dynamically check at build time, we report coverage.
  const coveredCount = EXEMPT_FROM_PROBES.size;
  const totalCount = BUS_MODULES_REQUIRING_PROBES.length;
  const uncoveredCount = modulesWithoutProbes.length;

  findings.push({
    severity: "info",
    title: `Health probe coverage: ${coveredCount}/${totalCount} exempt`,
    detail: `${uncoveredCount} bus modules should register a "healthz" operation for K8s-style liveness/readiness probes.`,
    recommendation: `Add bus.register("module/healthz", healthFn) to each bus module for consistent health endpoint convention.`,
  });

  // ── 4. Glossary Coverage ────────────────────────────────────────────
  const glossarySize = DEVOPS_GLOSSARY.length;
  findings.push({
    severity: "info",
    title: `DevOps glossary: ${glossarySize} term mappings`,
    detail: `${glossarySize} internal terms mapped to standard DevOps/CNCF equivalents for developer orientation.`,
  });

  // ── 5. Connectivity probes not wired to SystemEventBus ─────────────
  const unwiredProbes = ["oracle", "kgSync", "dataBank", "webBridge", "voice", "auth"];
  findings.push({
    severity: "warning",
    title: `${unwiredProbes.length} connectivity probes not wired to event bus`,
    detail: `Probes [${unwiredProbes.join(", ")}] are computed client-side but do not emit health events to SystemEventBus, preventing reconciler action.`,
    recommendation: `Emit "probe.health" events from useConnectivity to SystemEventBus so the reconciler can act on degraded services.`,
  });

  return buildGateResult(
    "devops-alignment",
    "DevOps Gate",
    findings,
    { error: 8, warning: 4, info: 0 },
  );
}

registerGate(devopsAlignmentGate);
