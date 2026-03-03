/**
 * Q-Trust-Mesh — Fano-Topology Trust Attestation Graph
 * ════════════════════════════════════════════════════
 *
 * Now derived from genesis/ axioms — zero external crypto deps.
 * All methods are synchronous (sha256 is sync from axiom-hash).
 *
 * @module qkernel/q-trust-mesh
 */

import { toHex, encodeUtf8 } from "@/hologram/genesis/axiom-ring";
import { sha256 } from "@/hologram/genesis/axiom-hash";
import { createCid } from "@/hologram/genesis/axiom-cid";
import { canonicalEncode } from "@/hologram/genesis/axiom-codec";
import type { QNet } from "./q-net";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export type TrustLevel = "none" | "encounter" | "acquaintance" | "trusted" | "sovereign";

export interface TrustAttestation {
  readonly "@type": "uor:TrustAttestation";
  readonly attestationCid: string;
  readonly fromCanonicalId: string;
  readonly fromThreeWord: string;
  readonly toCanonicalId: string;
  readonly toThreeWord: string;
  readonly level: TrustLevel;
  readonly context: string;
  readonly fanoRoute: number[];
  readonly createdAt: string;
  readonly expiresAt: string | null;
  readonly revoked: boolean;
}

export interface TrustEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly attestationCid: string;
  readonly level: TrustLevel;
  readonly weight: number;
  readonly bidirectional: boolean;
}

export interface TrustScore {
  readonly canonicalId: string;
  readonly threeWord: string;
  readonly inboundCount: number;
  readonly outboundCount: number;
  readonly meanInboundWeight: number;
  readonly highestLevel: TrustLevel;
  readonly compositeScore: number;
  readonly fanoReachability: number;
}

export interface MutualCeremony {
  readonly "@type": "uor:MutualCeremony";
  readonly ceremonyCid: string;
  readonly partyA: { canonicalId: string; threeWord: string };
  readonly partyB: { canonicalId: string; threeWord: string };
  readonly sharedLevel: TrustLevel;
  readonly createdAt: string;
}

export interface TrustMeshStats {
  readonly totalAttestations: number;
  readonly activeAttestations: number;
  readonly revokedAttestations: number;
  readonly uniqueIdentities: number;
  readonly edgeCount: number;
  readonly bidirectionalEdges: number;
  readonly meanTrustScore: number;
  readonly fanoNodeUtilization: number[];
}

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const TRUST_WEIGHTS: Record<TrustLevel, number> = {
  none: 0.0, encounter: 0.2, acquaintance: 0.5, trusted: 0.8, sovereign: 1.0,
};

const FANO_LINES: readonly number[][] = [
  [0, 1, 3], [1, 2, 4], [2, 3, 5], [3, 4, 6], [4, 5, 0], [5, 6, 1], [6, 0, 2],
];

function identityToFanoNode(canonicalId: string): number {
  const hex = canonicalId.split(":").pop() ?? "0";
  const firstByte = parseInt(hex.substring(0, 2), 16);
  return firstByte % 7;
}

function findFanoRoute(fromNode: number, toNode: number): number[] {
  if (fromNode === toNode) return [fromNode];
  for (const line of FANO_LINES) {
    if (line.includes(fromNode) && line.includes(toNode)) return [fromNode, toNode];
  }
  for (const line of FANO_LINES) {
    if (line.includes(fromNode)) {
      for (const mid of line) {
        if (mid === fromNode) continue;
        for (const line2 of FANO_LINES) {
          if (line2.includes(mid) && line2.includes(toNode)) return [fromNode, mid, toNode];
        }
      }
    }
  }
  return [fromNode, toNode];
}

// ═══════════════════════════════════════════════════════════════════════
// Q-Trust-Mesh (all sync now)
// ═══════════════════════════════════════════════════════════════════════

export class QTrustMesh {
  private net: QNet;
  private attestations = new Map<string, TrustAttestation>();
  private edges = new Map<string, TrustEdge[]>();
  private fanoLoad = new Array(7).fill(0);

  constructor(net: QNet) { this.net = net; }

  attest(
    fromCanonicalId: string, fromThreeWord: string,
    toCanonicalId: string, toThreeWord: string,
    level: TrustLevel, context: string, expiresAt: string | null = null,
  ): TrustAttestation {
    const fromNode = identityToFanoNode(fromCanonicalId);
    const toNode = identityToFanoNode(toCanonicalId);
    const fanoRoute = findFanoRoute(fromNode, toNode);

    const payload = canonicalEncode({
      from: fromCanonicalId, to: toCanonicalId, level, context,
      route: fanoRoute, t: Date.now(), nonce: Math.random(),
    });
    const hashBytes = sha256(payload);
    const attestationCid = createCid(hashBytes).string;

    const attestation: TrustAttestation = {
      "@type": "uor:TrustAttestation", attestationCid,
      fromCanonicalId, fromThreeWord, toCanonicalId, toThreeWord,
      level, context, fanoRoute,
      createdAt: new Date().toISOString(), expiresAt, revoked: false,
    };

    this.attestations.set(attestationCid, attestation);

    const edge: TrustEdge = {
      fromId: fromCanonicalId, toId: toCanonicalId,
      attestationCid, level, weight: TRUST_WEIGHTS[level], bidirectional: false,
    };
    const existing = this.edges.get(fromCanonicalId) ?? [];
    existing.push(edge);
    this.edges.set(fromCanonicalId, existing);

    for (const node of fanoRoute) this.fanoLoad[node]++;
    return attestation;
  }

  mutualCeremony(
    partyA: { canonicalId: string; threeWord: string },
    partyB: { canonicalId: string; threeWord: string },
    level: TrustLevel, context: string,
  ): { ceremony: MutualCeremony; attestationAB: TrustAttestation; attestationBA: TrustAttestation } {
    const attestationAB = this.attest(partyA.canonicalId, partyA.threeWord, partyB.canonicalId, partyB.threeWord, level, context);
    const attestationBA = this.attest(partyB.canonicalId, partyB.threeWord, partyA.canonicalId, partyA.threeWord, level, context);

    const edgesAB = this.edges.get(partyA.canonicalId) ?? [];
    const edgesBA = this.edges.get(partyB.canonicalId) ?? [];
    if (edgesAB.length > 0) edgesAB[edgesAB.length - 1] = { ...edgesAB[edgesAB.length - 1], bidirectional: true };
    if (edgesBA.length > 0) edgesBA[edgesBA.length - 1] = { ...edgesBA[edgesBA.length - 1], bidirectional: true };

    const ceremonyPayload = canonicalEncode({
      a: partyA.canonicalId, b: partyB.canonicalId, level,
      atAB: attestationAB.attestationCid, atBA: attestationBA.attestationCid, t: Date.now(),
    });
    const hashBytes = sha256(ceremonyPayload);
    const ceremonyCid = createCid(hashBytes).string;

    const ceremony: MutualCeremony = {
      "@type": "uor:MutualCeremony", ceremonyCid,
      partyA, partyB, sharedLevel: level, createdAt: new Date().toISOString(),
    };

    return { ceremony, attestationAB, attestationBA };
  }

  revoke(attestationCid: string): boolean {
    const att = this.attestations.get(attestationCid);
    if (!att || att.revoked) return false;
    this.attestations.set(attestationCid, { ...att, revoked: true });
    return true;
  }

  computeTrustScore(canonicalId: string, threeWord: string): TrustScore {
    let inboundCount = 0, outboundCount = 0, totalWeight = 0;
    let highestLevel: TrustLevel = "none";
    const fanoReachable = new Set<number>();

    for (const att of this.attestations.values()) {
      if (att.revoked) continue;
      if (att.expiresAt && new Date(att.expiresAt) < new Date()) continue;
      if (att.toCanonicalId === canonicalId) {
        inboundCount++;
        totalWeight += TRUST_WEIGHTS[att.level];
        if (TRUST_WEIGHTS[att.level] > TRUST_WEIGHTS[highestLevel]) highestLevel = att.level;
        for (const node of att.fanoRoute) fanoReachable.add(node);
      }
      if (att.fromCanonicalId === canonicalId) outboundCount++;
    }

    const meanInboundWeight = inboundCount > 0 ? totalWeight / inboundCount : 0;
    const compositeScore = Math.min(1.0, meanInboundWeight * Math.log2(inboundCount + 1) / 3);

    return { canonicalId, threeWord, inboundCount, outboundCount, meanInboundWeight, highestLevel, compositeScore, fanoReachability: fanoReachable.size };
  }

  getAttestationsFor(canonicalId: string): TrustAttestation[] {
    return Array.from(this.attestations.values()).filter(a => a.fromCanonicalId === canonicalId || a.toCanonicalId === canonicalId);
  }

  getEdgesFrom(canonicalId: string): TrustEdge[] { return this.edges.get(canonicalId) ?? []; }

  stats(): TrustMeshStats {
    let active = 0, revoked = 0;
    const identities = new Set<string>();
    let totalEdges = 0, biEdges = 0, totalScore = 0;

    for (const att of this.attestations.values()) {
      if (att.revoked) revoked++; else active++;
      identities.add(att.fromCanonicalId);
      identities.add(att.toCanonicalId);
    }
    for (const edges of this.edges.values()) {
      for (const e of edges) { totalEdges++; if (e.bidirectional) biEdges++; totalScore += e.weight; }
    }

    return {
      totalAttestations: this.attestations.size, activeAttestations: active,
      revokedAttestations: revoked, uniqueIdentities: identities.size,
      edgeCount: totalEdges, bidirectionalEdges: biEdges,
      meanTrustScore: totalEdges > 0 ? totalScore / totalEdges : 0,
      fanoNodeUtilization: [...this.fanoLoad],
    };
  }
}
