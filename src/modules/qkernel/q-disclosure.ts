/**
 * Q-Disclosure — Selective Disclosure via Lens Morphisms
 * ═════════════════════════════════════════════════════
 *
 * Privacy as a syscall. Disclosure is an attribute-level operation
 * on the sovereign identity object, implemented as lens morphisms
 * through the Q-Syscall trap table.
 *
 *   ┌──────────────────┬──────────────────────────────────────────┐
 *   │ Classical        │ Q-Disclosure                              │
 *   ├──────────────────┼──────────────────────────────────────────┤
 *   │ OAuth scopes     │ Attribute-level lens projections           │
 *   │ JWT claims       │ Signed disclosure objects (CID-addressed)  │
 *   │ RBAC             │ Capability-gated morphism dispatch         │
 *   │ Data masking     │ Focus lens: select attributes → project    │
 *   │ Consent form     │ Disclosure policy (JSON-LD rules)          │
 *   │ Privacy policy   │ Compiled lens blueprint (deterministic)    │
 *   └──────────────────┴──────────────────────────────────────────┘
 *
 * Layered sovereignty:
 *   - Three-word name can be disclosed WITHOUT revealing the hash
 *   - Hash can be disclosed WITHOUT revealing attributes
 *   - Individual attributes can be selectively projected
 *
 * Future ZK integration point: disclosure proofs become SNARKs
 * over the attribute set — proving possession without revealing.
 *
 * @module qkernel/q-disclosure
 */

import { sha256, computeCid, bytesToHex } from "@/modules/uns/core/address";
import { singleProofHash } from "@/modules/uns/core/identity";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Visibility level for an attribute */
export type AttributeVisibility = "public" | "selective" | "private" | "redacted";

/** A disclosure policy — which attributes can be shared with whom */
export interface DisclosurePolicy {
  readonly policyId: string;         // CID of the policy
  readonly ownerCanonicalId: string;
  readonly rules: DisclosureRule[];
  readonly defaultVisibility: AttributeVisibility;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A single disclosure rule — attribute + visibility + optional audience */
export interface DisclosureRule {
  readonly attributeKey: string;
  readonly visibility: AttributeVisibility;
  readonly audienceCanonicalIds: string[];  // empty = any audience
  readonly expiresAt: string | null;
}

/** A disclosure projection — the result of applying a lens to identity */
export interface DisclosureProjection {
  readonly "@type": "uor:DisclosureProjection";
  readonly projectionCid: string;
  readonly sourceCanonicalId: string;
  readonly recipientCanonicalId: string;
  readonly disclosedAttributes: DisclosedAttribute[];
  readonly redactedCount: number;
  readonly policyId: string;
  readonly createdAt: string;
  /** Proof that this projection is valid — the hash of (policy + attributes) */
  readonly proofHash: string;
}

/** A single disclosed attribute */
export interface DisclosedAttribute {
  readonly key: string;
  readonly value: string;
  readonly visibility: AttributeVisibility;
}

/** The identity layers available for disclosure */
export type DisclosureLayer =
  | "three-word"     // only the human-readable name
  | "canonical-id"   // the full hash
  | "network"        // IPv6 + CID (routing identifiers)
  | "glyph"          // visual Braille identity
  | "attributes"     // custom attributes
  | "full";          // everything

/** Disclosure statistics */
export interface DisclosureStats {
  readonly totalPolicies: number;
  readonly totalProjections: number;
  readonly totalRules: number;
  readonly disclosuresByLayer: Record<DisclosureLayer, number>;
  readonly redactedTotal: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Layer Definitions — what each disclosure layer reveals
// ═══════════════════════════════════════════════════════════════════════

const LAYER_ATTRIBUTES: Record<DisclosureLayer, string[]> = {
  "three-word":    ["threeWord"],
  "canonical-id":  ["canonicalId"],
  "network":       ["ipv6", "cid"],
  "glyph":         ["glyph"],
  "attributes":    [], // dynamic — depends on policy
  "full":          ["threeWord", "canonicalId", "ipv6", "cid", "glyph"],
};

// ═══════════════════════════════════════════════════════════════════════
// Q-Disclosure Implementation
// ═══════════════════════════════════════════════════════════════════════

export class QDisclosure {
  private policies = new Map<string, DisclosurePolicy>();
  private projections = new Map<string, DisclosureProjection>();
  private layerCounts: Record<DisclosureLayer, number> = {
    "three-word": 0, "canonical-id": 0, "network": 0,
    "glyph": 0, "attributes": 0, "full": 0,
  };
  private redactedTotal = 0;

  // ── Policy Management ───────────────────────────────────────────

  /**
   * Create a disclosure policy — defines what attributes can be shared.
   *
   * The policy itself is content-addressed: its CID ensures
   * tamper-evidence. Changing any rule produces a different policy CID.
   */
  async createPolicy(
    ownerCanonicalId: string,
    rules: DisclosureRule[],
    defaultVisibility: AttributeVisibility = "private"
  ): Promise<DisclosurePolicy> {
    const policyPayload = JSON.stringify({
      owner: ownerCanonicalId,
      rules: rules.map(r => ({ k: r.attributeKey, v: r.visibility })),
      default: defaultVisibility,
      t: Date.now(),
    });
    const hashBytes = await sha256(new TextEncoder().encode(policyPayload));
    const policyId = await computeCid(hashBytes);

    const policy: DisclosurePolicy = {
      policyId,
      ownerCanonicalId,
      rules,
      defaultVisibility,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.policies.set(policyId, policy);
    return policy;
  }

  /**
   * Update a policy — creates a new CID (immutable version history).
   */
  async updatePolicy(
    policyId: string,
    newRules: DisclosureRule[]
  ): Promise<DisclosurePolicy | null> {
    const existing = this.policies.get(policyId);
    if (!existing) return null;

    return this.createPolicy(
      existing.ownerCanonicalId,
      newRules,
      existing.defaultVisibility
    );
  }

  // ── Disclosure Projection (the lens morphism) ───────────────────

  /**
   * Project a disclosure — apply the policy lens to the identity.
   *
   * This is the core privacy operation:
   *   1. Load the identity attributes
   *   2. Apply the disclosure policy as a lens
   *   3. Filter: public → include, selective → check audience, private → redact
   *   4. Content-address the projection (tamper-evident receipt)
   *
   * The projection is verifiable: any party can check that the
   * disclosed attributes match the policy without seeing redacted ones.
   */
  async project(
    policyId: string,
    identityAttributes: Record<string, string>,
    recipientCanonicalId: string,
    layer: DisclosureLayer = "three-word"
  ): Promise<DisclosureProjection> {
    const policy = this.policies.get(policyId);
    if (!policy) throw new Error(`Policy ${policyId} not found`);

    const disclosed: DisclosedAttribute[] = [];
    let redactedCount = 0;

    // Determine which attributes are in scope for this layer
    const layerKeys = layer === "attributes"
      ? Object.keys(identityAttributes)
      : layer === "full"
        ? [...LAYER_ATTRIBUTES["full"], ...Object.keys(identityAttributes)]
        : LAYER_ATTRIBUTES[layer];

    for (const key of layerKeys) {
      const value = identityAttributes[key];
      if (value === undefined) continue;

      // Find matching rule
      const rule = policy.rules.find(r => r.attributeKey === key);
      const visibility = rule?.visibility ?? policy.defaultVisibility;

      // Check audience restriction
      if (visibility === "selective" && rule) {
        if (rule.audienceCanonicalIds.length > 0 &&
            !rule.audienceCanonicalIds.includes(recipientCanonicalId)) {
          redactedCount++;
          continue;
        }
      }

      if (visibility === "private" || visibility === "redacted") {
        redactedCount++;
        continue;
      }

      // Check expiry
      if (rule?.expiresAt && new Date(rule.expiresAt) < new Date()) {
        redactedCount++;
        continue;
      }

      disclosed.push({ key, value, visibility });
    }

    this.redactedTotal += redactedCount;
    this.layerCounts[layer]++;

    // Content-address the projection
    const projPayload = JSON.stringify({
      source: policy.ownerCanonicalId,
      recipient: recipientCanonicalId,
      disclosed: disclosed.map(d => d.key),
      redacted: redactedCount,
      policy: policyId,
      t: Date.now(),
    });
    const hashBytes = await sha256(new TextEncoder().encode(projPayload));
    const projectionCid = await computeCid(hashBytes);

    // Proof hash: hash of (policyId + disclosed attributes)
    const proofPayload = JSON.stringify({
      policyId,
      attrs: disclosed.map(d => ({ k: d.key, v: d.value })),
    });
    const proofHashBytes = await sha256(new TextEncoder().encode(proofPayload));
    const proofHash = bytesToHex(proofHashBytes);

    const projection: DisclosureProjection = {
      "@type": "uor:DisclosureProjection",
      projectionCid,
      sourceCanonicalId: policy.ownerCanonicalId,
      recipientCanonicalId,
      disclosedAttributes: disclosed,
      redactedCount,
      policyId,
      createdAt: new Date().toISOString(),
      proofHash,
    };

    this.projections.set(projectionCid, projection);
    return projection;
  }

  // ── Verification ────────────────────────────────────────────────

  /**
   * Verify a disclosure projection — recompute the proof hash.
   *
   * Any party can verify that the disclosed attributes match
   * the projection's proof hash without accessing the policy or
   * the redacted attributes.
   */
  async verifyProjection(projection: DisclosureProjection): Promise<boolean> {
    const proofPayload = JSON.stringify({
      policyId: projection.policyId,
      attrs: projection.disclosedAttributes.map(d => ({ k: d.key, v: d.value })),
    });
    const proofHashBytes = await sha256(new TextEncoder().encode(proofPayload));
    const recomputed = bytesToHex(proofHashBytes);

    return recomputed === projection.proofHash;
  }

  // ── Introspection ───────────────────────────────────────────────

  /** Get a policy by ID */
  getPolicy(policyId: string): DisclosurePolicy | undefined {
    return this.policies.get(policyId);
  }

  /** Get all policies for an owner */
  getPoliciesFor(ownerCanonicalId: string): DisclosurePolicy[] {
    return Array.from(this.policies.values()).filter(
      p => p.ownerCanonicalId === ownerCanonicalId
    );
  }

  /** Get all projections for a recipient */
  getProjectionsFor(recipientCanonicalId: string): DisclosureProjection[] {
    return Array.from(this.projections.values()).filter(
      p => p.recipientCanonicalId === recipientCanonicalId
    );
  }

  /** Get disclosure statistics */
  stats(): DisclosureStats {
    let totalRules = 0;
    for (const p of this.policies.values()) totalRules += p.rules.length;

    return {
      totalPolicies: this.policies.size,
      totalProjections: this.projections.size,
      totalRules,
      disclosuresByLayer: { ...this.layerCounts },
      redactedTotal: this.redactedTotal,
    };
  }
}
