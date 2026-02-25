/**
 * UOR Semantic Web Agentic Infrastructure — Shared Type System
 *
 * BACKWARD COMPATIBILITY SHIM — All canonical types now live in
 * src/types/uor-foundation/ (v2.0.0 ontology). This file re-exports
 * them under the original names for zero-breakage migration.
 *
 * @see src/types/uor-foundation/index.ts — canonical source
 */

// ── Re-exports from v2.0.0 Foundation ──────────────────────────────────────

// v2 PrimitiveOp uses capitalized variants; legacy code uses lowercase.
// Keep both for backward compatibility.
export type { PrimitiveOp } from "./uor-foundation";

/** The 5 primitive signature operations (lowercase — legacy compat). */
export type OperationName = "neg" | "bnot" | "xor" | "and" | "or";

/** Extended operation set (lowercase — legacy compat). */
export type ExtendedOperationName =
  | OperationName
  | "succ"
  | "pred"
  | "add"
  | "sub"
  | "mul";

// Address replaces UorAddress
export type { Address as UorAddressV2 } from "./uor-foundation";

// ── Layer 0: Ring Arithmetic Primitives (unchanged — kept inline) ──────────

/** Big-endian byte tuple representing a value in Z/(2^n)Z. */
export type ByteTuple = number[];

/** Quantum level q where width = q + 1 bytes and bits = 8 × width. */
export type Quantum = number;

/** Configuration for a specific ring R_n = Z/(2^n)Z. */
export interface RingConfig {
  quantum: Quantum;
  width: number;
  bits: number;
  cycle: bigint;
  mask: bigint;
}

/**
 * Triad positional vector — the canonical decomposition of a datum.
 * Aligns with schema:Triad in the UOR ontology.
 */
export interface Triad {
  datum: ByteTuple;
  stratum: number[];
  spectrum: number[][];
  totalStratum: number;
}

/**
 * Full Datum object — corresponds to schema:Datum in the API.
 */
export interface Datum {
  "@type": "schema:Datum";
  "schema:value": number;
  "schema:quantum": Quantum;
  "schema:width": number;
  "schema:bits": number;
  "schema:bytes": ByteTuple;
  "schema:triad": Triad & { "@type": "schema:Triad" };
  "schema:stratum": number;
  "schema:spectrum": string;
  "schema:glyph": { "@type": "u:Address"; "u:glyph": string; "u:length": number };
  "schema:dots": number[][];
}

/**
 * Partition classification for a byte value within a ring.
 */
export type PartitionComponent =
  | "partition:ExteriorSet"
  | "partition:UnitSet"
  | "partition:IrreducibleSet"
  | "partition:ReducibleSet";

export interface PartitionClassification {
  component: PartitionComponent;
  reason: string;
}

// ── Layer 1: Identity & Content Addressing ──────────────────────────────────

export interface UorAddress {
  "u:glyph": string;
  "u:length": number;
}

// ── Layer 3: Epistemic Grading ──────────────────────────────────────────────

export type EpistemicGrade = "A" | "B" | "C" | "D";

// ── Cross-cutting: Receipts & Health ────────────────────────────────────────

export interface Derivation {
  derivationId: string;
  resultIri: string;
  resultDatum: ByteTuple;
  epistemicGrade: EpistemicGrade;
  canonicalTerm: string;
  timestamp: string;
}

export interface CanonicalReceipt {
  receiptId: string;
  moduleId: string;
  operation: string;
  inputHash: string;
  outputHash: string;
  selfVerified: boolean;
  timestamp: string;
}

export interface ModuleHealth {
  moduleId: string;
  status: "healthy" | "failed";
  coherenceVerified: boolean;
  timestamp: string;
}
