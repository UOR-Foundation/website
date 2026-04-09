/**
 * UOR Crate Manifest — Version Anchor
 * ═══════════════════════════════════════════════════════════════
 *
 * Records the expected state of the `uor-foundation` crate.
 * At boot, the adapter compares actual WASM exports against this
 * manifest to detect version drift, new exports, and removals.
 *
 * AUTO-UPDATED by `scripts/sync-crate.ts` — do not hand-edit
 * the expectedExports or exportHash fields.
 *
 * @layer 0
 */

export const CRATE_MANIFEST = {
  /** Expected crate version */
  version: "0.2.0",

  /** All expected WASM function exports (sorted, snake_case) */
  expectedExports: [
    "bnot",
    "byte_basis",
    "byte_popcount",
    "classify_byte",
    "const_ring_eval_q0",
    "const_ring_eval_unary_q0",
    "crate_version",
    "evaluate_expr",
    "factorize",
    "list_enums",
    "list_enforcement_structs",
    "list_namespaces",
    "neg",
    "pred",
    "ring_add",
    "ring_and",
    "ring_mul",
    "ring_or",
    "ring_sub",
    "ring_xor",
    "succ",
    "verify_all_critical_identity",
    "verify_critical_identity",
  ] as const,

  /** SHA-256 hex of sorted export names (for drift detection) */
  exportHash: "81da89de628abb229597ecc7dca184053f7d0c908983db3df38e53a93efaa206",

  /** Ontology counts (for type projection drift) */
  namespaceCount: 33,
  classCount: 441,
  propertyCount: 892,
} as const;

export type CrateExportName = (typeof CRATE_MANIFEST.expectedExports)[number];
