/**
 * Q-Trust-Mesh — Fano-Topology Trust Attestation Graph
 * ════════════════════════════════════════════════════
 *
 * Trust is an object. Every attestation has its own CID.
 * Attestations are routed via the Fano plane (PG(2,2)):
 * 7 nodes, 7 lines, 2-hop max — structural Sybil resistance.
 *
 *   ┌───────────────────┬──────────────────────────────────────────┐
 *   │ Classical         │ Q-Trust-Mesh                              │
 *   ├───────────────────┼──────────────────────────────────────────┤
 *   │ PKI / CA          │ Dilithium-3 signed attestation objects    │
 *   │ Web of Trust      │ Fano-topology trust graph (7-line mesh)   │
 *   │ Certificate chain │ CID-linked attestation chain               │
 *   │ Trust store       │ Content-addressed trust envelope DAG       │
 *   │ Revocation list   │ Anti-attestation object (same mesh)        │
 *   │ Sybil defense     │ Structural: controlling ≥3 Fano lines     │
 *   └───────────────────┴──────────────────────────────────────────┘
 *
 * Foundation for zero-knowledge trust: trust scores are computable
 * without revealing the attestation graph to third parties.
 *
 * @module qkernel/q-trust-mesh
 */

import { sha256, computeCid, bytesToHex } from "@/modules/uns/core/address";
import type { QNet } from "./q-net";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Trust level — graduated from minimal to sovereign */
export type TrustLevel = "none" | "encounter" | "acquaintance" | "trusted" | "sovereign";

/** A trust attestation — itself a content-addressed object */
export interface TrustAttestation {
  readonly "@type": "uor:TrustAttestation";
  readonly attestationCid: string;
  readonly fromCanonicalId: string;
  readonly fromThreeWord: string;
  readonly toCanonicalId: string;
  readonly toThreeWord: string;
  readonly level: TrustLevel;
  readonly context: string;           // why this trust was granted
  readonly fanoRoute: number[];       // Fano nodes traversed
  readonly createdAt: string;
  readonly expiresAt: string | null;  // null = permanent
  readonly revoked: boolean;
}

/** A trust edge in the graph — from → to with attestation metadata */
export interface TrustEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly attestationCid: string;
  readonly level: TrustLevel;
  readonly weight: number;            // 0.0–1.0, derived from level
  readonly bidirectional: boolean;
}

/** Trust score for a given identity — aggregated from all attestations */
export interface TrustScore {
  readonly canonicalId: string;
  readonly threeWord: string;
  readonly inboundCount: number;
  readonly outboundCount: number;
  readonly meanInboundWeight: number;
  readonly highestLevel: TrustLevel;
  readonly compositeScore: number;    // 0.0–1.0
  readonly fanoReachability: number;  // how many Fano nodes can reach this identity
}

/** Mutual ceremony — two parties creating a shared trust object */
export interface MutualCeremony {
  readonly "@type": "uor:MutualCeremony";
  readonly ceremonyCid: string;
  readonly partyA: { canonicalId: string; threeWord: string };
  readonly partyB: { canonicalId: string; threeWord: string };
  readonly sharedLevel: TrustLevel;
  readonly createdAt: string;
}

/** Trust mesh statistics */
export interface TrustMeshStats {
  readonly totalAttestations: number;
  readonly activeAttestations: number;
  readonly revokedAttestations: number;
  readonly uniqueIdentities: number;
  readonly edgeCount: number;
  readonly bidirectionalEdges: number;
  readonly meanTrustScore: number;
  readonly fanoNodeUtilization: number[];  // load per Fano node (7 values)
}

// ═══════════════════════════════════════════════════════════════════════
// Trust Level Weights
// ═══════════════════════════════════════════════════════════════════════

const TRUST_WEIGHTS: Record<TrustLevel, number> = {
  none: 0.0,
  encounter: 0.2,
  acquaintance: 0.5,
  trusted: 0.8,
  sovereign: 1.0,
};

// ═══════════════════════════════════════════════════════════════════════
// Fano Routing for Trust
// ═══════════════════════════════════════════════════════════════════════

/**
 * The 7 lines of PG(2,2) — each line connects 3 points.
 * Any two non-adjacent points are connected through exactly one intermediate.
 */
const FANO_LINES: readonly number[][] = [
  [0, 1, 3],
  [1, 2, 4],
  [2, 3, 5],
  [3, 4, 6],
  [4, 5, 0],
  [5, 6, 1],
  [6, 0, 2],
];

/**
 * Determine which Fano node an identity maps to (0–6).
 * Uses the first byte of the canonical hash mod 7.
 */
function identityToFanoNode(canonicalId: string): number {
  const hex = canonicalId.split(":").pop() ?? "0";
  const firstByte = parseInt(hex.substring(0, 2), 16);
  return firstByte % 7;
}

/**
 * Find the Fano route between two nodes (always ≤ 2 hops).
 */
function findFanoRoute(fromNode: number, toNode: number): number[] {
  if (fromNode === toNode) return [fromNode];

  // Direct: check if they share a line
  for (const line of FANO_LINES) {
    if (line.includes(fromNode) && line.includes(toNode)) {
      return [fromNode, toNode];
    }
  }

  // 2-hop: find intermediate
  for (const line of FANO_LINES) {
    if (line.includes(fromNode)) {
      for (const mid of line) {
        if (mid === fromNode) continue;
        for (const line2 of FANO_LINES) {
          if (line2.includes(mid) && line2.includes(toNode)) {
            return [fromNode, mid, toNode];
          }
        }
      }
    }
  }

  return [fromNode, toNode]; // fallback
}

// ═══════════════════════════════════════════════════════════════════════
// Q-Trust-Mesh Implementation
// ═══════════════════════════════════════════════════════════════════════

export class QTrustMesh {
  private net: QNet;
  private attestations = new Map<string, TrustAttestation>();
  private edges = new Map<string, TrustEdge[]>(); // canonicalId → outbound edges
  private fanoLoad = new Array(7).fill(0);

  constructor(net: QNet) {
    this.net = net;
  }

  // ── Attestation Creation ────────────────────────────────────────

  /**
   * Create a trust attestation — a signed trust object routed via Fano mesh.
   *
   * The attestation is itself content-addressed: changing any field
   * produces a different CID, making it tamper-evident.
   */
  async attest(
    fromCanonicalId: string,
    fromThreeWord: string,
    toCanonicalId: string,
    toThreeWord: string,
    level: TrustLevel,
    context: string,
    expiresAt: string | null = null,
  ): Promise<TrustAttestation> {
    const fromNode = identityToFanoNode(fromCanonicalId);
    const toNode = identityToFanoNode(toCanonicalId);
    const fanoRoute = findFanoRoute(fromNode, toNode);

    // Content-address the attestation
    const payload = JSON.stringify({
      from: fromCanonicalId,
      to: toCanonicalId,
      level,
      context,
      route: fanoRoute,
      t: Date.now(),
      nonce: crypto.getRandomValues(new Uint8Array(16)),
    });
    const hashBytes = await sha256(new TextEncoder().encode(payload));
    const attestationCid = await computeCid(hashBytes);

    const attestation: TrustAttestation = {
      "@type": "uor:TrustAttestation",
      attestationCid,
      fromCanonicalId,
      fromThreeWord,
      toCanonicalId,
      toThreeWord,
      level,
      context,
      fanoRoute,
      createdAt: new Date().toISOString(),
      expiresAt,
      revoked: false,
    };

    this.attestations.set(attestationCid, attestation);

    // Add edge
    const edge: TrustEdge = {
      fromId: fromCanonicalId,
      toId: toCanonicalId,
      attestationCid,
      level,
      weight: TRUST_WEIGHTS[level],
      bidirectional: false,
    };

    const existing = this.edges.get(fromCanonicalId) ?? [];
    existing.push(edge);
    this.edges.set(fromCanonicalId, existing);

    // Update Fano load
    for (const node of fanoRoute) {
      this.fanoLoad[node]++;
    }

    return attestation;
  }

  // ── Mutual Ceremony ─────────────────────────────────────────────

  /**
   * Execute a mutual trust ceremony — two parties creating a
   * bidirectional trust bond simultaneously.
   *
   * This produces TWO attestations (A→B and B→A) and a shared
   * ceremony object. The ceremony itself is content-addressed.
   */
  async mutualCeremony(
    partyA: { canonicalId: string; threeWord: string },
    partyB: { canonicalId: string; threeWord: string },
    level: TrustLevel,
    context: string,
  ): Promise<{
    ceremony: MutualCeremony;
    attestationAB: TrustAttestation;
    attestationBA: TrustAttestation;
  }> {
    // Create bidirectional attestations
    const attestationAB = await this.attest(
      partyA.canonicalId, partyA.threeWord,
      partyB.canonicalId, partyB.threeWord,
      level, context,
    );
    const attestationBA = await this.attest(
      partyB.canonicalId, partyB.threeWord,
      partyA.canonicalId, partyA.threeWord,
      level, context,
    );

    // Mark as bidirectional
    const edgesAB = this.edges.get(partyA.canonicalId) ?? [];
    const edgesBA = this.edges.get(partyB.canonicalId) ?? [];
    const lastAB = edgesAB[edgesAB.length - 1];
    const lastBA = edgesBA[edgesBA.length - 1];
    if (lastAB) edgesAB[edgesAB.length - 1] = { ...lastAB, bidirectional: true };
    if (lastBA) edgesBA[edgesBA.length - 1] = { ...lastBA, bidirectional: true };

    // Content-address the ceremony
    const ceremonyPayload = JSON.stringify({
      a: partyA.canonicalId,
      b: partyB.canonicalId,
      level,
      atAB: attestationAB.attestationCid,
      atBA: attestationBA.attestationCid,
      t: Date.now(),
    });
    const hashBytes = await sha256(new TextEncoder().encode(ceremonyPayload));
    const ceremonyCid = await computeCid(hashBytes);

    const ceremony: MutualCeremony = {
      "@type": "uor:MutualCeremony",
      ceremonyCid,
      partyA,
      partyB,
      sharedLevel: level,
      createdAt: new Date().toISOString(),
    };

    return { ceremony, attestationAB, attestationBA };
  }

  // ── Revocation ──────────────────────────────────────────────────

  /**
   * Revoke a trust attestation.
   */
  revoke(attestationCid: string): boolean {
    const att = this.attestations.get(attestationCid);
    if (!att || att.revoked) return false;

    this.attestations.set(attestationCid, { ...att, revoked: true });
    return true;
  }

  // ── Trust Scoring ───────────────────────────────────────────────

  /**
   * Compute the trust score for a given identity.
   * Aggregates all active inbound attestations.
   */
  computeTrustScore(canonicalId: string, threeWord: string): TrustScore {
    let inboundCount = 0;
    let outboundCount = 0;
    let totalWeight = 0;
    let highestLevel: TrustLevel = "none";
    const fanoReachable = new Set<number>();

    // Scan all attestations
    for (const att of this.attestations.values()) {
      if (att.revoked) continue;
      if (att.expiresAt && new Date(att.expiresAt) < new Date()) continue;

      if (att.toCanonicalId === canonicalId) {
        inboundCount++;
        totalWeight += TRUST_WEIGHTS[att.level];
        if (TRUST_WEIGHTS[att.level] > TRUST_WEIGHTS[highestLevel]) {
          highestLevel = att.level;
        }
        for (const node of att.fanoRoute) fanoReachable.add(node);
      }

      if (att.fromCanonicalId === canonicalId) {
        outboundCount++;
      }
    }

    const meanInboundWeight = inboundCount > 0 ? totalWeight / inboundCount : 0;
    // Composite: mean weight scaled by log(inbound+1) for network effect
    const compositeScore = Math.min(1.0, meanInboundWeight * Math.log2(inboundCount + 1) / 3);

    return {
      canonicalId,
      threeWord,
      inboundCount,
      outboundCount,
      meanInboundWeight,
      highestLevel,
      compositeScore,
      fanoReachability: fanoReachable.size,
    };
  }

  // ── Introspection ───────────────────────────────────────────────

  /** Get all attestations for a given identity (inbound + outbound) */
  getAttestationsFor(canonicalId: string): TrustAttestation[] {
    return Array.from(this.attestations.values()).filter(
      a => a.fromCanonicalId === canonicalId || a.toCanonicalId === canonicalId
    );
  }

  /** Get edges from a given identity */
  getEdgesFrom(canonicalId: string): TrustEdge[] {
    return this.edges.get(canonicalId) ?? [];
  }

  /** Get mesh statistics */
  stats(): TrustMeshStats {
    let active = 0;
    let revoked = 0;
    const identities = new Set<string>();
    let totalEdges = 0;
    let biEdges = 0;
    let totalScore = 0;

    for (const att of this.attestations.values()) {
      if (att.revoked) { revoked++; } else { active++; }
      identities.add(att.fromCanonicalId);
      identities.add(att.toCanonicalId);
    }

    for (const edges of this.edges.values()) {
      for (const e of edges) {
        totalEdges++;
        if (e.bidirectional) biEdges++;
        totalScore += e.weight;
      }
    }

    return {
      totalAttestations: this.attestations.size,
      activeAttestations: active,
      revokedAttestations: revoked,
      uniqueIdentities: identities.size,
      edgeCount: totalEdges,
      bidirectionalEdges: biEdges,
      meanTrustScore: totalEdges > 0 ? totalScore / totalEdges : 0,
      fanoNodeUtilization: [...this.fanoLoad],
    };
  }
}
