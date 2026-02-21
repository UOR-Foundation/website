/**
 * UOR Coherence Verification Engine.
 *
 * Implements exhaustive algebraic verification for Q0 (Z/256Z).
 * All 8 coherence laws are checked for every element of the ring.
 *
 * Throws CoherenceError on any failure — no computation should proceed
 * until verify() passes (UOR specification requirement R4).
 *
 * Delegates to UORRing for all operations to ensure consistency.
 */

import { UORRing, Q0, fromBytes } from "./ring";

// ── Error type ──────────────────────────────────────────────────────────────

export class CoherenceError extends Error {
  readonly failures: string[];
  readonly law: string;
  readonly value: number;

  constructor(law: string, value: number, message: string, failures: string[] = []) {
    super(`Coherence violation [${law}] at x=${value}: ${message}`);
    this.name = "CoherenceError";
    this.law = law;
    this.value = value;
    this.failures = failures;
  }
}

// ── Verification result ─────────────────────────────────────────────────────

export interface CoherenceResult {
  verified: boolean;
  lawsChecked: number;
  totalChecks: number;
  failures: string[];
  fullCycleVerified: boolean;
  timestamp: string;
}

// ── Exhaustive Q0 verification ──────────────────────────────────────────────

/**
 * For ALL 256 values in Q0, verify every algebraic law.
 * Returns a CoherenceResult or throws CoherenceError on first failure
 * if throwOnFailure is true.
 */
export function verifyQ0Exhaustive(throwOnFailure = false): CoherenceResult {
  const ring = Q0();
  const failures: string[] = [];
  let totalChecks = 0;
  const MASK = [0xff]; // single-byte mask for Q0

  for (let x = 0; x < 256; x++) {
    const bx = ring.toBytes(x);

    // Law 1: bnot(bnot(x)) === x (involution)
    const bnot_bnot = ring.bnot(ring.bnot(bx));
    totalChecks++;
    if (fromBytes(bnot_bnot) !== x) {
      const msg = `bnot(bnot(${x})) = ${fromBytes(bnot_bnot)}, expected ${x}`;
      failures.push(msg);
      if (throwOnFailure) throw new CoherenceError("bnot-involution", x, msg, failures);
    }

    // Law 2: neg(neg(x)) === x (involution)
    const neg_neg = ring.neg(ring.neg(bx));
    totalChecks++;
    if (fromBytes(neg_neg) !== x) {
      const msg = `neg(neg(${x})) = ${fromBytes(neg_neg)}, expected ${x}`;
      failures.push(msg);
      if (throwOnFailure) throw new CoherenceError("neg-involution", x, msg, failures);
    }

    // Law 3: neg(bnot(x)) === succ(x) (critical identity)
    const neg_bnot = ring.neg(ring.bnot(bx));
    const succ_x = ring.succ(bx);
    totalChecks++;
    if (fromBytes(neg_bnot) !== fromBytes(succ_x)) {
      const msg = `neg(bnot(${x})) = ${fromBytes(neg_bnot)}, succ(${x}) = ${fromBytes(succ_x)}`;
      failures.push(msg);
      if (throwOnFailure) throw new CoherenceError("critical-identity", x, msg, failures);
    }

    // Law 4: bnot(neg(x)) === pred(x)
    const bnot_neg = ring.bnot(ring.neg(bx));
    const pred_x = ring.pred(bx);
    totalChecks++;
    if (fromBytes(bnot_neg) !== fromBytes(pred_x)) {
      const msg = `bnot(neg(${x})) = ${fromBytes(bnot_neg)}, pred(${x}) = ${fromBytes(pred_x)}`;
      failures.push(msg);
      if (throwOnFailure) throw new CoherenceError("pred-derivation", x, msg, failures);
    }

    // Law 5: succ(pred(x)) === x and pred(succ(x)) === x
    const succ_pred = ring.succ(ring.pred(bx));
    totalChecks++;
    if (fromBytes(succ_pred) !== x) {
      const msg = `succ(pred(${x})) = ${fromBytes(succ_pred)}, expected ${x}`;
      failures.push(msg);
      if (throwOnFailure) throw new CoherenceError("succ-pred-inverse", x, msg, failures);
    }

    const pred_succ = ring.pred(ring.succ(bx));
    totalChecks++;
    if (fromBytes(pred_succ) !== x) {
      const msg = `pred(succ(${x})) = ${fromBytes(pred_succ)}, expected ${x}`;
      failures.push(msg);
      if (throwOnFailure) throw new CoherenceError("pred-succ-inverse", x, msg, failures);
    }

    // Law 6: xor(x, bnot(x)) === 0xFF
    const xor_bnot = ring.xor(bx, ring.bnot(bx));
    totalChecks++;
    if (fromBytes(xor_bnot) !== 0xff) {
      const msg = `xor(${x}, bnot(${x})) = ${fromBytes(xor_bnot)}, expected 255`;
      failures.push(msg);
      if (throwOnFailure) throw new CoherenceError("xor-complement", x, msg, failures);
    }

    // Law 7: xor(x, x) === 0
    const xor_self = ring.xor(bx, bx);
    totalChecks++;
    if (fromBytes(xor_self) !== 0) {
      const msg = `xor(${x}, ${x}) = ${fromBytes(xor_self)}, expected 0`;
      failures.push(msg);
      if (throwOnFailure) throw new CoherenceError("xor-self-cancel", x, msg, failures);
    }

    // Law 8: neg(x) + x === 0 (mod 256)
    const neg_plus = ring.add(ring.neg(bx), bx);
    totalChecks++;
    if (fromBytes(neg_plus) !== 0) {
      const msg = `neg(${x}) + ${x} = ${fromBytes(neg_plus)}, expected 0`;
      failures.push(msg);
      if (throwOnFailure) throw new CoherenceError("additive-inverse", x, msg, failures);
    }
  }

  // Full cycle verification: starting from 0, applying succ 256 times returns to 0
  let current = ring.toBytes(0);
  for (let i = 0; i < 256; i++) {
    current = ring.succ(current);
  }
  totalChecks++;
  const fullCycleVerified = fromBytes(current) === 0;
  if (!fullCycleVerified) {
    const msg = `Full cycle: succ^256(0) = ${fromBytes(current)}, expected 0`;
    failures.push(msg);
    if (throwOnFailure) throw new CoherenceError("full-cycle", 0, msg, failures);
  }

  return {
    verified: failures.length === 0,
    lawsChecked: 8,
    totalChecks,
    failures,
    fullCycleVerified,
    timestamp: new Date().toISOString(),
  };
}
