/**
 * Canonical Pipeline Gate
 * ════════════════════════
 *
 * Detects modules that bypass the canonical URDNA2015 → SHA-256 → UOR
 * identity pipeline by using raw sha256hex() directly.
 *
 * This is a static registry — the list of known bypass files is maintained
 * here and checked against a "resolved" set of files that have been rewired.
 *
 * @module canonical-compliance/gates/canonical-pipeline-gate
 */

import { registerGate, buildGateResult, type GateFinding } from "./gate-runner";

// ── Known bypass files (source of truth from codebase audit) ──────────────

interface BypassEntry {
  file: string;
  usage: string;
  /** true if the file defines its own local hash function (worst case) */
  localDuplicate?: boolean;
  /** true if this bypass has been resolved (rewired to canonical pipeline) */
  resolved?: boolean;
}

const KNOWN_BYPASSES: BypassEntry[] = [
  // Local duplicate — worst offense
  { file: "uns/core/hologram/diffusion/compiler.ts",  usage: "local sha256Hex() function", localDuplicate: true, resolved: true },

  // Raw sha256hex usage (not through singleProofHash)
  { file: "certificate/boundary.ts",                   usage: "boundary key hashing" },
  { file: "code-kg/analyzer.ts",                       usage: "entity CID generation" },
  { file: "code-kg/analyzer-rust.ts",                  usage: "Rust entity hashing" },
  { file: "data-bank/lib/sync.ts",                     usage: "slot content-addressing" },
  { file: "knowledge-graph/lib/schema-templates.ts",    usage: "schema CID generation" },
  { file: "knowledge-graph/raw-store.ts",               usage: "audit record hashing" },
  { file: "boot/tech-stack.ts",                         usage: "stack fingerprint" },
  { file: "boot/reflection-chain.ts",                   usage: "reflection entry hashing" },
  { file: "sovereign-spaces/sync/change-dag.ts",        usage: "change CID generation" },
  { file: "uns/mesh/triple-dedup.ts",                   usage: "triple deduplication" },
  { file: "uns/mesh/sync-protocol.ts",                  usage: "mesh message CIDs" },
  { file: "time-machine/checkpoint-capture.ts",         usage: "checkpoint hashing" },
  { file: "donate/components/DonatePopup.tsx",          usage: "certificate hashing", resolved: true },
  { file: "community/components/DonatePopup.tsx",       usage: "certificate hashing" },
];

// ── Gate ──────────────────────────────────────────────────────────────────

function canonicalPipelineGate() {
  const findings: GateFinding[] = [];

  const active = KNOWN_BYPASSES.filter((b) => !b.resolved);
  const resolved = KNOWN_BYPASSES.filter((b) => b.resolved);
  const localDupes = active.filter((b) => b.localDuplicate);

  // Flag each active bypass
  for (const b of active) {
    findings.push({
      severity: b.localDuplicate ? "error" : "warning",
      title: b.localDuplicate
        ? `Local hash duplicate in ${b.file}`
        : `Raw sha256hex bypass in ${b.file}`,
      detail: `Usage: ${b.usage}. Should use singleProofHash() or canonical pipeline.`,
      file: `src/modules/${b.file}`,
      recommendation: b.localDuplicate
        ? "Delete local function, import from @/lib/crypto or use singleProofHash()"
        : "Replace sha256hex() with singleProofHash() for UOR-addressable content",
    });
  }

  // Summary finding
  if (active.length > 0) {
    findings.push({
      severity: "info",
      title: `${resolved.length}/${KNOWN_BYPASSES.length} bypasses resolved`,
      detail: `${active.length} remaining bypasses (${localDupes.length} local duplicates). Total tracked: ${KNOWN_BYPASSES.length}.`,
    });
  }

  return buildGateResult("canonical-pipeline", "Canonical Pipeline Gate", findings);
}

registerGate(canonicalPipelineGate);

export { canonicalPipelineGate };
