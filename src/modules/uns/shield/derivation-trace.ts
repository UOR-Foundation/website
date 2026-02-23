/**
 * UNS Shield — Derivation Trace & Injection Detection
 *
 * Detects payload injection by analyzing Hamming distance drift
 * across ring operation chains. Legitimate content produces smooth
 * drift patterns; injected bytes create sharp spikes.
 *
 * ALGORITHM:
 *   1. Apply alternating ring ops (neg/bnot) to each payload byte
 *   2. Record Hamming distance between consecutive step outputs
 *   3. Compute mean and max drift
 *   4. Flag injection if any step exceeds 3× baseline mean drift
 *
 * This is a UOR-native intrusion detection signal — no signatures,
 * no pattern databases, pure algebraic analysis.
 *
 * @see trace: namespace — UOR Framework spec/src/namespaces/trace.rs
 */

import { neg, bnot, succ } from "../core/ring";

// ── Types ───────────────────────────────────────────────────────────────────

/** A single step in a derivation trace. */
export interface TraceStep {
  op: "neg" | "bnot" | "succ";
  input: number;
  output: number;
}

/** A complete derivation trace with drift analysis. */
export interface DerivationTrace {
  /** Ordered operation steps applied to the payload. */
  steps: TraceStep[];
  /** Hamming distances between consecutive step outputs. */
  hammingDrift: number[];
  /** Mean Hamming drift across all consecutive pairs. */
  meanDrift: number;
  /** Maximum single-step Hamming drift. */
  maxDrift: number;
}

// ── Hamming Distance ────────────────────────────────────────────────────────

/**
 * Hamming distance between two 8-bit values.
 *
 * Counts the number of bit positions where the two values differ.
 * Range: [0, 8].
 */
function hamming8(a: number, b: number): number {
  let xor = (a ^ b) & 0xff;
  let count = 0;
  while (xor) {
    count += xor & 1;
    xor >>= 1;
  }
  return count;
}

// ── Op Dispatch ─────────────────────────────────────────────────────────────

const OPS: Record<"neg" | "bnot" | "succ", (x: number) => number> = {
  neg,
  bnot,
  succ,
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Build a derivation trace by applying ring operations to each byte.
 *
 * For each byte in the payload, applies the operations in sequence
 * (cycling through the ops array), recording each step's input/output
 * and the Hamming distance to the previous step's output.
 *
 * @param bytes  Payload bytes to trace.
 * @param ops    Ring operations to apply (cycled over bytes).
 * @returns      Complete derivation trace with drift metrics.
 */
export function buildDerivationTrace(
  bytes: Uint8Array,
  ops: ("neg" | "bnot")[]
): DerivationTrace {
  if (ops.length === 0 || bytes.length === 0) {
    return { steps: [], hammingDrift: [], meanDrift: 0, maxDrift: 0 };
  }

  const steps: TraceStep[] = [];
  const hammingDrift: number[] = [];

  for (let i = 0; i < bytes.length; i++) {
    const op = ops[i % ops.length];
    const input = bytes[i];
    const output = OPS[op](input);

    steps.push({ op, input, output });

    // Compute Hamming drift from previous step's output
    if (i > 0) {
      const prevOutput = steps[i - 1].output;
      hammingDrift.push(hamming8(prevOutput, output));
    }
  }

  const meanDrift =
    hammingDrift.length > 0
      ? hammingDrift.reduce((s, d) => s + d, 0) / hammingDrift.length
      : 0;

  const maxDrift =
    hammingDrift.length > 0 ? Math.max(...hammingDrift) : 0;

  return { steps, hammingDrift, meanDrift, maxDrift };
}

/**
 * Detect injection via Hamming drift spike analysis.
 *
 * Returns true if ANY step has drift > 3× the baseline mean drift.
 * A spike indicates an injected or anomalous byte that breaks the
 * expected algebraic continuity of the payload.
 *
 * @param trace              The derivation trace to analyze.
 * @param baselineMeanDrift  Expected mean drift for legitimate traffic.
 * @returns                  true if injection detected.
 */
export function detectInjection(
  trace: DerivationTrace,
  baselineMeanDrift: number
): boolean {
  if (trace.hammingDrift.length === 0 || baselineMeanDrift <= 0) return false;

  const threshold = 3 * baselineMeanDrift;
  return trace.hammingDrift.some((d) => d > threshold);
}
