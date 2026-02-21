/**
 * UOR Client-Side Ring Engine — Z/(2^n)Z arithmetic in the browser.
 *
 * Ports the pure functions from supabase/functions/uor-api/index.ts
 * so ring computations can run locally without API calls.
 *
 * Pure functions, zero dependencies, identical semantics to the edge function.
 */

import type {
  ByteTuple,
  Quantum,
  RingConfig,
  Triad,
  Datum,
  PartitionComponent,
  PartitionClassification,
  ExtendedOperationName,
} from "@/types/uor";

// ── Ring configuration ──────────────────────────────────────────────────────

/** Compute the modulus 2^n for a given bit width. */
export function modulus(n: number): number {
  return Math.pow(2, n);
}

/** Build a RingConfig for quantum level q (width = q + 1, bits = 8 × width). */
export function ringConfig(quantum: Quantum): RingConfig {
  const width = quantum + 1;
  const bits = 8 * width;
  const cycle = BigInt(1) << BigInt(bits);
  const mask = cycle - BigInt(1);
  return { quantum, width, bits, cycle, mask };
}

/** Default ring: R_8 = Z/256Z (quantum 0, 1 byte, 8 bits). */
export const DEFAULT_RING = ringConfig(0);

// ── Unary operations ────────────────────────────────────────────────────────

/** Additive inverse: neg(x) = (-x) mod 2^n. */
export function neg(x: number, n = 8): number {
  const m = modulus(n);
  return ((-x) % m + m) % m;
}

/** Bitwise complement: bnot(x) = x XOR (2^n - 1). */
export function bnot(x: number, n = 8): number {
  return x ^ (modulus(n) - 1);
}

/** Successor: succ(x) = (x + 1) mod 2^n. */
export function succ(x: number, n = 8): number {
  return (x + 1) % modulus(n);
}

/** Predecessor: pred(x) = (x - 1) mod 2^n. */
export function pred(x: number, n = 8): number {
  return (x - 1 + modulus(n)) % modulus(n);
}

// ── Binary operations ───────────────────────────────────────────────────────

/** Modular addition: (x + y) mod 2^n. */
export function add(x: number, y: number, n = 8): number {
  return (x + y) % modulus(n);
}

/** Modular subtraction: (x - y) mod 2^n. */
export function sub(x: number, y: number, n = 8): number {
  return ((x - y) % modulus(n) + modulus(n)) % modulus(n);
}

/** Modular multiplication: (x × y) mod 2^n. */
export function mul(x: number, y: number, n = 8): number {
  return (x * y) % modulus(n);
}

/** Bitwise XOR. */
export function xor(x: number, y: number): number {
  return x ^ y;
}

/** Bitwise AND. */
export function and(x: number, y: number): number {
  return x & y;
}

/** Bitwise OR. */
export function or(x: number, y: number): number {
  return x | y;
}

// ── Dispatch ────────────────────────────────────────────────────────────────

/**
 * Execute any named operation with given operands in ring R_n.
 * Unary ops use only `x`; binary ops use `x` and `y`.
 */
export function compute(
  op: ExtendedOperationName,
  x: number,
  y: number | undefined,
  n = 8
): number {
  switch (op) {
    case "neg":  return neg(x, n);
    case "bnot": return bnot(x, n);
    case "succ": return succ(x, n);
    case "pred": return pred(x, n);
    case "add":  return add(x, y ?? 0, n);
    case "sub":  return sub(x, y ?? 0, n);
    case "mul":  return mul(x, y ?? 0, n);
    case "xor":  return xor(x, y ?? 0);
    case "and":  return and(x, y ?? 0);
    case "or":   return or(x, y ?? 0);
  }
}

// ── Critical identity verification ──────────────────────────────────────────

/**
 * Verify the foundational theorem: neg(bnot(x)) ≡ succ(x) for a given x in R_n.
 * Returns true if and only if the identity holds.
 */
export function verifyCriticalIdentity(x: number, n = 8): boolean {
  return neg(bnot(x, n), n) === succ(x, n);
}

/**
 * Exhaustively verify the critical identity for all elements of R_n.
 * Returns { verified: boolean; failures: number[] }.
 */
export function verifyAllCriticalIdentity(n = 8): {
  verified: boolean;
  failures: number[];
  ringSize: number;
} {
  const m = modulus(n);
  const failures: number[] = [];
  for (let x = 0; x < m; x++) {
    if (!verifyCriticalIdentity(x, n)) failures.push(x);
  }
  return { verified: failures.length === 0, failures, ringSize: m };
}

// ── Byte-level helpers (Triad construction) ─────────────────────────────────

/** Convert a value to its big-endian byte tuple of the given bit width. */
export function toBytesTuple(value: number, n: number): ByteTuple {
  const width = Math.ceil(n / 8) || 1;
  const bytes: number[] = [];
  let v = value & (modulus(n) - 1);
  for (let i = width - 1; i >= 0; i--) {
    bytes[i] = v & 0xff;
    v = v >>> 8;
  }
  return bytes;
}

/** Count set bits in a byte. */
export function bytePopcount(b: number): number {
  let count = 0;
  for (let i = 0; i < 8; i++) if (b & (1 << i)) count++;
  return count;
}

/** LSB-indexed basis elements of a byte. */
export function byteBasis(b: number): number[] {
  const bits: number[] = [];
  for (let i = 0; i < 8; i++) if (b & (1 << i)) bits.push(i);
  return bits;
}

/** Dot notation (1-indexed basis). */
export function byteDots(b: number): number[] {
  return byteBasis(b).map((i) => i + 1);
}

// ── Triad & Datum construction ──────────────────────────────────────────────

/** Build the Triad positional vector for a value in R_n. */
export function buildTriad(value: number, n: number): Triad {
  const bytes = toBytesTuple(value, n);
  const stratum = bytes.map(bytePopcount);
  const spectrum = bytes.map(byteBasis);
  const totalStratum = stratum.reduce((a, b) => a + b, 0);
  return { datum: bytes, stratum, spectrum, totalStratum };
}

/** Construct the full schema:Datum JSON-LD object, identical to the API response. */
export function makeDatum(value: number, n: number): Datum {
  const bytes = toBytesTuple(value, n);
  const triad = buildTriad(value, n);
  const quantum: Quantum = Math.ceil(n / 8) - 1;
  const glyph = bytes.map((b) => String.fromCodePoint(0x2800 + b)).join("");

  return {
    "@type": "schema:Datum",
    "schema:value": value,
    "schema:quantum": quantum,
    "schema:width": bytes.length,
    "schema:bits": n,
    "schema:bytes": bytes,
    "schema:triad": { "@type": "schema:Triad", ...triad },
    "schema:stratum": triad.totalStratum,
    "schema:spectrum": value.toString(2).padStart(n, "0"),
    "schema:glyph": { "@type": "u:Address", "u:glyph": glyph, "u:length": bytes.length },
    "schema:dots": bytes.map(byteDots),
  };
}

// ── Partition classification ────────────────────────────────────────────────

/** Classify a value within R_n into its partition component. */
export function classifyByte(b: number, n: number): PartitionClassification {
  const m = modulus(n);
  if (b === 0)
    return { component: "partition:ExteriorSet", reason: "Additive identity (zero)" };
  if (b === 1 || b === m - 1)
    return { component: "partition:UnitSet", reason: `Ring unit — multiplicative inverse exists in R_${n}` };
  if (b % 2 !== 0)
    return { component: "partition:IrreducibleSet", reason: `Odd, not a unit — irreducible in R_${n}` };
  if (b === m / 2)
    return { component: "partition:ExteriorSet", reason: `Even generator (${m / 2}) — exterior in R_${n}` };
  return { component: "partition:ReducibleSet", reason: `Even — decomposes in R_${n}` };
}
