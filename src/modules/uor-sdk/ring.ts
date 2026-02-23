/**
 * UOR SDK — Local ring arithmetic re-exports.
 *
 * Delegates entirely to src/lib/uor-ring.ts — the single source of truth
 * for Z/(2^n)Z ring operations. No duplication.
 *
 * Use these for offline/unit-test scenarios where the live API is unnecessary.
 * For production verification, prefer the UorClient methods which hit the
 * live API and return full JSON-LD proofs.
 */

export {
  // Unary operations
  neg,
  bnot,
  succ,
  pred,

  // Binary operations
  add,
  sub,
  mul,
  xor,
  and,
  or,

  // Dispatch
  compute,

  // Critical identity
  verifyCriticalIdentity,
  verifyAllCriticalIdentity,

  // Ring configuration
  modulus,
  ringConfig,
  DEFAULT_RING,

  // Byte-level helpers
  toBytesTuple,
  bytePopcount,
  byteBasis,
  byteDots,

  // Triad & Datum
  buildTriad,
  makeDatum,

  // Partition
  classifyByte,
} from "@/lib/uor-ring";

export type { RingConfig, Quantum, Triad, Datum, ByteTuple } from "@/types/uor";
