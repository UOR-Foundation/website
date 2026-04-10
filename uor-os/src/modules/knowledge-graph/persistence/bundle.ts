/**
 * Sovereign Bundle — Export/Import.
 * ══════════════════════════════════
 *
 * A SovereignBundle is a single `.uor.json` file that captures
 * the entire knowledge space. Like `docker save` — portable to
 * ANY system that reads JSON-LD.
 *
 * Export: GrafeoDB → JSON-LD + metadata envelope → file
 * Import: file → validate seal → GrafeoDB
 *
 * Security: Seal verification routes through singleProofHash()
 * ensuring the integrity check is a proper UOR identity, not raw SHA-256.
 */

import { grafeoStore } from "../grafeo-store";
import { getProvider } from "./index";
import { singleProofHash } from "@/lib/uor-canonical";
import type { SovereignBundle } from "./types";

// ── Import Options ──────────────────────────────────────────────────────────

export interface ImportBundleOptions {
  /** Allow import even if the seal hash doesn't match (dev only) */
  allowUntrusted?: boolean;
}

// ── Seal Computation ────────────────────────────────────────────────────────

/**
 * Compute a UOR-rooted seal from N-Quads payload.
 * Uses singleProofHash for canonical content-addressing.
 */
async function computeSeal(nquads: string): Promise<string> {
  const identity = await singleProofHash({
    "@type": "uor:SovereignSeal",
    "uor:payload": nquads,
  });
  return identity["u:canonicalId"] ?? identity.derivationId;
}

// ── Export ───────────────────────────────────────────────────────────────────

/**
 * Export the entire knowledge graph as a portable sovereign bundle.
 */
export async function exportSovereignBundle(): Promise<SovereignBundle> {
  const provider = getProvider();
  return provider.exportBundle();
}

// ── Import ──────────────────────────────────────────────────────────────────

/**
 * Import a sovereign bundle into the local knowledge graph.
 * Validates the seal hash before importing — rejects tampered bundles by default.
 * Returns the number of nodes imported.
 */
export async function importSovereignBundle(
  bundle: SovereignBundle,
  opts: ImportBundleOptions = {},
): Promise<number> {
  // Validate version
  if (bundle.version !== "1.0.0") {
    throw new Error(`Unsupported bundle version: ${bundle.version}`);
  }

  // Recompute seal from graph payload using UOR canonical identity
  const graphPayload = JSON.stringify(bundle.graph);
  const computedSeal = await computeSeal(graphPayload);

  // Strict seal enforcement — reject tampered bundles
  if (computedSeal !== bundle.sealHash) {
    if (opts.allowUntrusted) {
      console.warn(
        "[Bundle] ⚠ Seal mismatch — importing in untrusted mode. " +
        `Expected: ${bundle.sealHash.slice(0, 16)}… Got: ${computedSeal.slice(0, 16)}…`
      );
    } else {
      throw new Error(
        `[Bundle] Seal verification failed — bundle has been tampered with or was exported by a different version. ` +
        `Expected seal: ${bundle.sealHash.slice(0, 16)}… Computed: ${computedSeal.slice(0, 16)}…`
      );
    }
  }

  // Import the graph
  const graph = bundle.graph as { "@graph"?: Array<Record<string, unknown>> };
  const count = await grafeoStore.importFromJsonLd(graph);

  console.log(`[Bundle] ✓ Imported ${count} nodes from sealed bundle (exported ${bundle.exportedAt})`);
  return count;
}

// ── Download ────────────────────────────────────────────────────────────────

/**
 * Download a sovereign bundle as a file.
 */
export async function downloadBundle(filename?: string): Promise<void> {
  const bundle = await exportSovereignBundle();
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `sovereign-space-${new Date().toISOString().slice(0, 10)}.uor.json`;
  a.click();
  URL.revokeObjectURL(url);
}
