/**
 * UOR Knowledge Graph — Core Types
 * ═════════════════════════════════════════════════════════════════
 *
 * Canonical type definitions for the knowledge graph.
 * All graph implementations import types from here.
 */

export interface KGNode {
  /** UOR address — IPv6 ULA (fd00:0075:6f72::/48), content-addressed primary key */
  uorAddress: string;
  /** UOR CID (IPFS-compatible) */
  uorCid?: string;
  /** Human-readable label */
  label: string;
  /** Node type: file, paste, url, column, entity, workspace, folder */
  nodeType: string;
  /** JSON-LD @type */
  rdfType?: string;
  /** Triadic stratum level */
  stratumLevel?: "low" | "medium" | "high";
  /** Total stratum (popcount sum) */
  totalStratum?: number;
  /** Quality score 0.0–1.0 */
  qualityScore?: number;
  /** Serialized properties (filename, size, format, etc.) */
  properties: Record<string, unknown>;
  /** Canonical term serialization (for canonicalization-based compression) */
  canonicalForm?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified */
  updatedAt: number;
  /** Sync state: local-only, synced, pending */
  syncState: "local" | "synced" | "pending";
}

export interface KGEdge {
  /** Composite key: subject|predicate|object */
  id: string;
  subject: string;
  predicate: string;
  object: string;
  /** Named graph IRI */
  graphIri: string;
  /** Edge metadata */
  metadata?: Record<string, unknown>;
  createdAt: number;
  syncState: "local" | "synced" | "pending";
}

export interface KGDerivation {
  derivationId: string;
  resultIri: string;
  canonicalTerm: string;
  originalTerm: string;
  epistemicGrade: string;
  metrics: Record<string, unknown>;
  createdAt: number;
  syncState: "local" | "synced" | "pending";
}

export interface KGStats {
  nodeCount: number;
  edgeCount: number;
  derivationCount: number;
  lastUpdated: number;
}
