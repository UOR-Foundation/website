/**
 * UNS Trust — TrustGraph: Social Attestation Layer
 * ═════════════════════════════════════════════════
 *
 * Implements a content-addressed, Dilithium-3 signed attestation graph
 * that adds the SOCIAL dimension to UOR's observer trust model.
 *
 * UOR's existing trust model tracks INDIVIDUAL coherence (H-score, Φ, ε).
 * TrustGraph adds SOCIAL coherence: peer attestations that compound
 * over time to create Sybil-resistant, behavior-based trust scores.
 *
 * Core formula:
 *   TrustScore = α·Φ_individual + β·Φ_social + γ·τ_temporal
 *
 *   Where:
 *     Φ_individual = observer integration capacity (God Conjecture)
 *     Φ_social     = PageRank-weighted attestation score
 *     τ_temporal   = temporal depth (time-weighted behavioral consistency)
 *
 * Inspired by TrustGraph.network — attestation-based governance.
 * Enhanced with UOR content-addressing and post-quantum signatures.
 *
 * @module uns/trust/trust-graph
 * @see https://trustgraph.network/
 */

import { singleProofHash } from "../core/identity";
import { signRecord, verifyRecord } from "../core/keypair";
import type { UnsKeypair, SignatureBlock, SignedRecord } from "../core/keypair";

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * A TrustAttestation is a content-addressed, signed endorsement
 * from one identity to another within a specific trust network.
 *
 * It is the social-layer analog of an observation in the observer model:
 * observations measure individual coherence; attestations measure social trust.
 */
export interface TrustAttestation {
  "@type": "cert:TrustAttestation";
  /** Content-addressed ID of this attestation */
  "u:canonicalId": string;
  /** Who is making the attestation */
  attesterCanonicalId: string;
  /** Who is being attested */
  subjectCanonicalId: string;
  /** Trust network this attestation belongs to */
  networkId: string;
  /** Confidence level (0–1) — maps to TrustGraph's slider */
  confidence: number;
  /** Domain-specific criteria being attested (e.g., "expertise", "integrity") */
  criteria: string[];
  /** When the attestation was made */
  createdAt: string;
  /** Dilithium-3 signature */
  "cert:signature": SignatureBlock;
  /** Grade A — cryptographically signed attestation */
  epistemic_grade: "A";
}

/**
 * A TrustNetwork defines a scoped domain of trust
 * (e.g., "Developer Network", "Research Collective").
 */
export interface TrustNetwork {
  "@type": "uns:TrustNetwork";
  networkId: string;
  name: string;
  description: string;
  /** The criteria members can be attested for */
  criteria: string[];
  /** Weight factors for trust score computation */
  weights: TrustWeights;
  createdAt: string;
  creatorCanonicalId: string;
}

/** Tunable weights for the three trust dimensions */
export interface TrustWeights {
  /** Weight for individual coherence (Φ from observer) — default 0.3 */
  individual: number;
  /** Weight for social attestations (graph PageRank) — default 0.4 */
  social: number;
  /** Weight for temporal depth (behavior over time) — default 0.3 */
  temporal: number;
}

const DEFAULT_WEIGHTS: TrustWeights = {
  individual: 0.3,
  social: 0.4,
  temporal: 0.3,
};

/**
 * Computed TrustScore for a member within a network.
 * This is the composite trust metric that fuses all three dimensions.
 */
export interface TrustScore {
  subjectCanonicalId: string;
  networkId: string;
  /** Composite score (0–1000, matching TrustGraph's scale) */
  score: number;
  /** Individual coherence component (0–1) */
  phiIndividual: number;
  /** Social attestation component (0–1) */
  phiSocial: number;
  /** Temporal depth component (0–1) */
  tauTemporal: number;
  /** Number of attestations received */
  attestationCount: number;
  /** Mean confidence across all attestations */
  meanConfidence: number;
  /** How long (ms) the member has been in the network */
  membershipDurationMs: number;
  computedAt: string;
}

/**
 * Member profile within a trust network.
 */
export interface TrustMember {
  canonicalId: string;
  networkId: string;
  joinedAt: string;
  /** Last computed trust score */
  trustScore: TrustScore | null;
  /** Number of attestations given */
  attestationsGiven: number;
  /** Number of attestations received */
  attestationsReceived: number;
}

// ── TrustGraph Engine ───────────────────────────────────────────────────────

/**
 * TrustGraph — Social attestation engine for the UOR trust layer.
 *
 * Manages trust networks, peer attestations, and composite trust
 * score computation. Integrates with UnsObserver for individual
 * coherence metrics and adds social + temporal dimensions.
 */
export class UnsTrustGraph {
  private networks = new Map<string, TrustNetwork>();
  private members = new Map<string, Map<string, TrustMember>>(); // networkId → (canonicalId → member)
  private attestations = new Map<string, TrustAttestation[]>(); // networkId → attestations[]

  // ── Network Management ─────────────────────────────────────────────────

  /**
   * Create a new trust network.
   */
  async createNetwork(opts: {
    name: string;
    description: string;
    criteria: string[];
    creatorCanonicalId: string;
    weights?: TrustWeights;
  }): Promise<TrustNetwork> {
    const identity = await singleProofHash({
      name: opts.name,
      creator: opts.creatorCanonicalId,
      t: Date.now(),
    });

    const network: TrustNetwork = {
      "@type": "uns:TrustNetwork",
      networkId: identity["u:canonicalId"],
      name: opts.name,
      description: opts.description,
      criteria: opts.criteria,
      weights: opts.weights ?? { ...DEFAULT_WEIGHTS },
      createdAt: new Date().toISOString(),
      creatorCanonicalId: opts.creatorCanonicalId,
    };

    this.networks.set(network.networkId, network);
    this.members.set(network.networkId, new Map());
    this.attestations.set(network.networkId, []);

    // Auto-join creator
    this.joinNetwork(network.networkId, opts.creatorCanonicalId);

    return network;
  }

  /** Get a network by ID */
  getNetwork(networkId: string): TrustNetwork | null {
    return this.networks.get(networkId) ?? null;
  }

  /** List all networks */
  listNetworks(): TrustNetwork[] {
    return [...this.networks.values()];
  }

  // ── Membership ─────────────────────────────────────────────────────────

  /**
   * Join a trust network.
   */
  joinNetwork(networkId: string, canonicalId: string): TrustMember | null {
    const memberMap = this.members.get(networkId);
    if (!memberMap) return null;

    if (memberMap.has(canonicalId)) return memberMap.get(canonicalId)!;

    const member: TrustMember = {
      canonicalId,
      networkId,
      joinedAt: new Date().toISOString(),
      trustScore: null,
      attestationsGiven: 0,
      attestationsReceived: 0,
    };

    memberMap.set(canonicalId, member);
    return member;
  }

  /** List members of a network */
  listMembers(networkId: string): TrustMember[] {
    return [...(this.members.get(networkId)?.values() ?? [])];
  }

  // ── Attestations ───────────────────────────────────────────────────────

  /**
   * Create a signed attestation from one member to another.
   *
   * @param attesterKeypair  The attester's Dilithium-3 keypair for signing.
   * @param subjectCanonicalId  Who is being attested.
   * @param networkId  Which trust network.
   * @param confidence  0–1 confidence level.
   * @param criteria  Which criteria are being attested.
   */
  async attest(opts: {
    attesterKeypair: UnsKeypair;
    subjectCanonicalId: string;
    networkId: string;
    confidence: number;
    criteria: string[];
  }): Promise<TrustAttestation | null> {
    const network = this.networks.get(opts.networkId);
    if (!network) return null;

    const memberMap = this.members.get(opts.networkId);
    if (!memberMap) return null;

    const attesterCanonicalId = opts.attesterKeypair.canonicalId;

    // Both must be members
    if (!memberMap.has(attesterCanonicalId) || !memberMap.has(opts.subjectCanonicalId)) {
      return null;
    }

    // Cannot self-attest
    if (attesterCanonicalId === opts.subjectCanonicalId) return null;

    // Clamp confidence
    const confidence = Math.max(0, Math.min(1, opts.confidence));

    // Build unsigned attestation
    const payload = {
      "@type": "cert:TrustAttestation" as const,
      attesterCanonicalId,
      subjectCanonicalId: opts.subjectCanonicalId,
      networkId: opts.networkId,
      confidence,
      criteria: opts.criteria,
      createdAt: new Date().toISOString(),
      epistemic_grade: "A" as const,
    };

    // Content-address it
    const identity = await singleProofHash(payload);

    // Sign with Dilithium-3
    const signed = await signRecord(payload, opts.attesterKeypair);

    const attestation: TrustAttestation = {
      ...payload,
      "u:canonicalId": identity["u:canonicalId"],
      "cert:signature": signed["cert:signature"],
    };

    // Store
    const networkAttestations = this.attestations.get(opts.networkId) ?? [];
    networkAttestations.push(attestation);
    this.attestations.set(opts.networkId, networkAttestations);

    // Update member counts
    const attester = memberMap.get(attesterCanonicalId);
    if (attester) attester.attestationsGiven++;
    const subject = memberMap.get(opts.subjectCanonicalId);
    if (subject) subject.attestationsReceived++;

    return attestation;
  }

  /** Get all attestations in a network */
  getAttestations(networkId: string): TrustAttestation[] {
    return this.attestations.get(networkId) ?? [];
  }

  /** Get attestations received by a specific member */
  getAttestationsFor(networkId: string, canonicalId: string): TrustAttestation[] {
    return (this.attestations.get(networkId) ?? []).filter(
      a => a.subjectCanonicalId === canonicalId
    );
  }

  // ── Trust Score Computation ────────────────────────────────────────────

  /**
   * Compute trust scores for all members of a network.
   *
   * Uses a simplified PageRank-inspired algorithm where:
   *   1. Each attestation transfers trust weighted by the attester's own score
   *   2. Confidence level modulates the transfer
   *   3. Temporal depth multiplies the result (longer membership = higher weight)
   *
   * @param individualPhi  Map of canonicalId → individual Φ from observer.
   *                       If not provided, defaults to 0.5 for all.
   */
  computeScores(
    networkId: string,
    individualPhi?: Map<string, number>
  ): TrustScore[] {
    const network = this.networks.get(networkId);
    if (!network) return [];

    const memberMap = this.members.get(networkId);
    if (!memberMap) return [];

    const attestations = this.attestations.get(networkId) ?? [];
    const now = Date.now();
    const weights = network.weights;

    // ── Step 1: Compute social Φ via iterative trust propagation ──

    // Initialize social scores uniformly
    const socialScores = new Map<string, number>();
    const memberIds = [...memberMap.keys()];
    const n = memberIds.length;
    if (n === 0) return [];

    for (const id of memberIds) {
      socialScores.set(id, 1 / n);
    }

    // Build adjacency: subject → [{attester, weight}]
    const inbound = new Map<string, { attester: string; confidence: number }[]>();
    for (const a of attestations) {
      const list = inbound.get(a.subjectCanonicalId) ?? [];
      list.push({ attester: a.attesterCanonicalId, confidence: a.confidence });
      inbound.set(a.subjectCanonicalId, list);
    }

    // Iterative propagation (3 rounds — converges fast for small networks)
    const DAMPING = 0.85;
    const ITERATIONS = 3;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const newScores = new Map<string, number>();

      for (const id of memberIds) {
        const edges = inbound.get(id) ?? [];
        let weightedSum = 0;

        for (const edge of edges) {
          const attesterScore = socialScores.get(edge.attester) ?? 0;
          weightedSum += attesterScore * edge.confidence;
        }

        // PageRank formula with damping
        newScores.set(id, (1 - DAMPING) / n + DAMPING * weightedSum);
      }

      // Normalize
      let total = 0;
      for (const s of newScores.values()) total += s;
      if (total > 0) {
        for (const [id, s] of newScores) {
          newScores.set(id, s / total);
        }
      }

      // Update
      for (const [id, s] of newScores) {
        socialScores.set(id, s);
      }
    }

    // ── Step 2: Compute composite scores ──

    const results: TrustScore[] = [];

    for (const [id, member] of memberMap) {
      // Individual Φ (from observer, or default 0.5)
      const phiInd = individualPhi?.get(id) ?? 0.5;

      // Social Φ: normalized PageRank score → 0–1
      const phiSoc = Math.min(1, (socialScores.get(id) ?? 0) * n);

      // Temporal depth: logarithmic membership duration
      // τ = log2(1 + durationDays) / log2(365) — 1 year = 1.0
      const durationMs = now - new Date(member.joinedAt).getTime();
      const durationDays = Math.max(0, durationMs / 86_400_000);
      const tauTemp = Math.min(1, Math.log2(1 + durationDays) / Math.log2(365));

      // Attestation statistics
      const receivedAttestations = attestations.filter(
        a => a.subjectCanonicalId === id
      );
      const meanConfidence = receivedAttestations.length > 0
        ? receivedAttestations.reduce((sum, a) => sum + a.confidence, 0) / receivedAttestations.length
        : 0;

      // Composite: weighted sum scaled to 0–1000
      const composite =
        weights.individual * phiInd +
        weights.social * phiSoc +
        weights.temporal * tauTemp;

      const score: TrustScore = {
        subjectCanonicalId: id,
        networkId,
        score: Math.round(composite * 1000),
        phiIndividual: phiInd,
        phiSocial: phiSoc,
        tauTemporal: tauTemp,
        attestationCount: receivedAttestations.length,
        meanConfidence,
        membershipDurationMs: durationMs,
        computedAt: new Date().toISOString(),
      };

      // Update member
      member.trustScore = score;
      results.push(score);
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  // ── Network Summary ────────────────────────────────────────────────────

  networkSummary(networkId: string): {
    memberCount: number;
    attestationCount: number;
    meanTrustScore: number;
    topMember: string | null;
  } | null {
    const memberMap = this.members.get(networkId);
    if (!memberMap) return null;

    const attestations = this.attestations.get(networkId) ?? [];
    const members = [...memberMap.values()];

    let totalScore = 0;
    let topScore = -1;
    let topMember: string | null = null;

    for (const m of members) {
      const s = m.trustScore?.score ?? 0;
      totalScore += s;
      if (s > topScore) {
        topScore = s;
        topMember = m.canonicalId;
      }
    }

    return {
      memberCount: members.length,
      attestationCount: attestations.length,
      meanTrustScore: members.length > 0 ? totalScore / members.length : 0,
      topMember,
    };
  }
}
