/**
 * UOR Semantic Web Agentic Infrastructure — Shared Type System
 *
 * Foundational types for the 4-layer architecture:
 *   Layer 0: Ring Arithmetic Core
 *   Layer 1: Knowledge Graph (triplestore + IPFS)
 *   Layer 2: Semantic Index (entity resolution)
 *   Layer 3: Agent Interface (tool functions + epistemic grading)
 *
 * These types are consumed by all modules and never import from UI code.
 * All types align with the UOR ontology namespaces and the live API at
 * https://api.uor.foundation/v1.
 */

// ── Layer 0: Ring Arithmetic Primitives ─────────────────────────────────────

/** Big-endian byte tuple representing a value in Z/(2^n)Z. */
export type ByteTuple = number[];

/** Quantum level q where width = q + 1 bytes and bits = 8 × width. */
export type Quantum = number;

/** The 5 primitive signature operations (UOR ontology op: namespace). */
export type OperationName = "neg" | "bnot" | "xor" | "and" | "or";

/** Extended operation set including derived operations available in the ring engine. */
export type ExtendedOperationName =
  | OperationName
  | "succ"
  | "pred"
  | "add"
  | "sub"
  | "mul";

/** Configuration for a specific ring R_n = Z/(2^n)Z. */
export interface RingConfig {
  /** Quantum level: width - 1. */
  quantum: Quantum;
  /** Number of bytes: quantum + 1. */
  width: number;
  /** Number of bits: 8 × width. */
  bits: number;
  /** Ring cycle 2^bits as bigint for large-ring safety. */
  cycle: bigint;
  /** Bit mask (cycle - 1) for modular reduction. */
  mask: bigint;
}

/**
 * Triad positional vector — the canonical decomposition of a datum.
 * Aligns with schema:Triad in the UOR ontology.
 */
export interface Triad {
  /** Big-endian byte tuple. */
  datum: ByteTuple;
  /** Popcount per byte position. */
  stratum: number[];
  /** LSB-indexed basis elements per byte. */
  spectrum: number[][];
  /** Sum of stratum values. */
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
 * Aligns with partition: namespace.
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

/** UOR address — Braille bijection of content bytes. */
export interface UorAddress {
  "u:glyph": string;
  "u:length": number;
}

// ── Layer 3: Epistemic Grading ──────────────────────────────────────────────

/**
 * Epistemic grade for every fact in the knowledge graph.
 *   A = algebraically proven (ring identity, exhaustive proof)
 *   B = certified (content-addressed, CID-verified)
 *   C = attributed (sourced claim, not independently verified)
 *   D = unverified (raw input, no provenance)
 */
export type EpistemicGrade = "A" | "B" | "C" | "D";

// ── Cross-cutting: Receipts & Health ────────────────────────────────────────

/**
 * Derivation record — an auditable step in a computation chain.
 * Aligns with derivation: namespace in the API.
 */
export interface Derivation {
  derivationId: string;
  resultIri: string;
  resultDatum: ByteTuple;
  epistemicGrade: EpistemicGrade;
  canonicalTerm: string;
  timestamp: string;
}

/**
 * Canonical receipt — self-verifying proof that a computation was performed.
 * Every ring operation and triplestore mutation produces one.
 */
export interface CanonicalReceipt {
  receiptId: string;
  moduleId: string;
  operation: string;
  inputHash: string;
  outputHash: string;
  selfVerified: boolean;
  timestamp: string;
}

/**
 * Module health check — coherence verification for any module.
 */
export interface ModuleHealth {
  moduleId: string;
  status: "healthy" | "failed";
  coherenceVerified: boolean;
  timestamp: string;
}
