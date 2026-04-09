/**
 * UOR Engine Contract — Stable API Surface
 * ═══════════════════════════════════════════════════════════════
 *
 * This interface is the ONLY dependency upstream consumers hold.
 * It NEVER removes methods — only adds them via `extensions` first,
 * then promotes to the main interface in a minor version bump.
 *
 * When `uor-foundation` ships new exports, they appear in
 * `extensions` automatically. Existing callers are unaffected.
 *
 * @layer 0
 * @stability frozen (additive-only)
 */

// ── The Contract ──────────────────────────────────────────────────────────

export interface UorEngineContract {
  // ── Identity ────────────────────────────────────────────────────────────
  /** Crate version string (e.g. "0.2.0") */
  readonly version: string;
  /** Which backend is active */
  readonly engine: "wasm" | "typescript";

  // ── Ring R_8 = Z/256Z ──────────────────────────────────────────────────
  neg(x: number): number;
  bnot(x: number): number;
  succ(x: number): number;
  pred(x: number): number;
  add(a: number, b: number): number;
  sub(a: number, b: number): number;
  mul(a: number, b: number): number;
  xor(a: number, b: number): number;
  and(a: number, b: number): number;
  or(a: number, b: number): number;

  // ── Verification ───────────────────────────────────────────────────────
  verifyCriticalIdentity(x: number): boolean;
  verifyAllCriticalIdentity(): boolean;

  // ── Analysis ───────────────────────────────────────────────────────────
  bytePopcount(x: number): number;
  byteBasis(x: number): number[];
  classifyByte(x: number): string;
  factorize(x: number): number[];
  evaluateExpr(expr: string): number;

  // ── Ring dispatch by opcode ────────────────────────────────────────────
  constRingEvalQ0(op: number, a: number, b?: number): number;

  // ── Bulk Operations (worker-offloadable) ──────────────────────────────
  /**
   * Apply a named ring operation to every byte in the array.
   * Delegates to Web Worker when available for off-main-thread compute.
   */
  bulkApply?(op: string, data: Uint8Array, operand?: number): Promise<Uint8Array>;

  /**
   * Verify critical identity for all 256 byte values in parallel.
   * Returns per-value results and aggregate pass/fail.
   */
  bulkVerify?(): Promise<{ results: boolean[]; allPassed: boolean }>;

  // ── Meta ───────────────────────────────────────────────────────────────
  listNamespaces(): string[];
  listEnums(): string[];
  listEnforcementStructs(): string[];

  // ── Extension point ────────────────────────────────────────────────────
  /**
   * New crate exports land here automatically via the adapter.
   * Once stabilized, they get promoted to the main interface.
   * Consumers can probe: `engine.extensions["new_fn"]?.(args)`
   */
  readonly extensions: Record<string, (...args: any[]) => any>;
}

// ── Known WASM export names → contract method mapping ─────────────────────

/**
 * Maps WASM export names (snake_case from Rust) to contract method names.
 * Used by the adapter for auto-wiring. Only "known" exports are listed;
 * anything not listed goes to `extensions`.
 */
export const WASM_TO_CONTRACT: Record<string, keyof UorEngineContract> = {
  neg: "neg",
  bnot: "bnot",
  succ: "succ",
  pred: "pred",
  ring_add: "add",
  ring_sub: "sub",
  ring_mul: "mul",
  ring_xor: "xor",
  ring_and: "and",
  ring_or: "or",
  verify_critical_identity: "verifyCriticalIdentity",
  verify_all_critical_identity: "verifyAllCriticalIdentity",
  byte_popcount: "bytePopcount",
  byte_basis: "byteBasis",
  classify_byte: "classifyByte",
  factorize: "factorize",
  evaluate_expr: "evaluateExpr",
  const_ring_eval_q0: "constRingEvalQ0",
  list_namespaces: "listNamespaces",
  list_enums: "listEnums",
  list_enforcement_structs: "listEnforcementStructs",
  crate_version: "version",
};

/**
 * Internal WASM exports that are NOT part of the contract.
 * The adapter ignores these during auto-discovery.
 */
export const WASM_INTERNAL_EXPORTS = new Set([
  "__wbindgen_add_to_stack_pointer",
  "__wbindgen_export",
  "__wbindgen_export2",
  "__wbindgen_export3",
  "__wbindgen_externrefs",
  "__wbindgen_free",
  "__wbindgen_malloc",
  "__wbindgen_realloc",
  "__wbindgen_start",
  "memory",
  "default",
]);
