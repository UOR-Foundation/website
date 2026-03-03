/**
 * Q-Disclosure — Selective Disclosure via Lens Morphisms
 * ═════════════════════════════════════════════════════
 *
 * Now derived from genesis/ axioms — zero external crypto deps.
 * All methods are synchronous.
 *
 * @module qkernel/q-disclosure
 */

import { toHex, encodeUtf8 } from "../../genesis/axiom-ring";
import { sha256 } from "../../genesis/axiom-hash";
import { createCid } from "../../genesis/axiom-cid";
import { canonicalEncode } from "../../genesis/axiom-codec";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export type AttributeVisibility = "public" | "selective" | "private" | "redacted";

export interface DisclosurePolicy {
  readonly policyId: string;
  readonly ownerCanonicalId: string;
  readonly rules: DisclosureRule[];
  readonly defaultVisibility: AttributeVisibility;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DisclosureRule {
  readonly attributeKey: string;
  readonly visibility: AttributeVisibility;
  readonly audienceCanonicalIds: string[];
  readonly expiresAt: string | null;
}

export interface DisclosureProjection {
  readonly "@type": "uor:DisclosureProjection";
  readonly projectionCid: string;
  readonly sourceCanonicalId: string;
  readonly recipientCanonicalId: string;
  readonly disclosedAttributes: DisclosedAttribute[];
  readonly redactedCount: number;
  readonly policyId: string;
  readonly createdAt: string;
  readonly proofHash: string;
}

export interface DisclosedAttribute {
  readonly key: string;
  readonly value: string;
  readonly visibility: AttributeVisibility;
}

export type DisclosureLayer = "three-word" | "canonical-id" | "network" | "glyph" | "attributes" | "full";

export interface DisclosureStats {
  readonly totalPolicies: number;
  readonly totalProjections: number;
  readonly totalRules: number;
  readonly disclosuresByLayer: Record<DisclosureLayer, number>;
  readonly redactedTotal: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Layer Definitions
// ═══════════════════════════════════════════════════════════════════════

const LAYER_ATTRIBUTES: Record<DisclosureLayer, string[]> = {
  "three-word":   ["threeWord"],
  "canonical-id": ["canonicalId"],
  "network":      ["ipv6", "cid"],
  "glyph":        ["glyph"],
  "attributes":   [],
  "full":         ["threeWord", "canonicalId", "ipv6", "cid", "glyph"],
};

// ═══════════════════════════════════════════════════════════════════════
// Q-Disclosure (all sync now)
// ═══════════════════════════════════════════════════════════════════════

export class QDisclosure {
  private policies = new Map<string, DisclosurePolicy>();
  private projections = new Map<string, DisclosureProjection>();
  private layerCounts: Record<DisclosureLayer, number> = {
    "three-word": 0, "canonical-id": 0, "network": 0,
    "glyph": 0, "attributes": 0, "full": 0,
  };
  private redactedTotal = 0;

  createPolicy(
    ownerCanonicalId: string,
    rules: DisclosureRule[],
    defaultVisibility: AttributeVisibility = "private"
  ): DisclosurePolicy {
    const policyPayload = canonicalEncode({
      owner: ownerCanonicalId,
      rules: rules.map(r => ({ k: r.attributeKey, v: r.visibility })),
      default: defaultVisibility, t: Date.now(),
    });
    const hashBytes = sha256(policyPayload);
    const policyId = createCid(hashBytes).string;

    const policy: DisclosurePolicy = {
      policyId, ownerCanonicalId, rules, defaultVisibility,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.policies.set(policyId, policy);
    return policy;
  }

  updatePolicy(policyId: string, newRules: DisclosureRule[]): DisclosurePolicy | null {
    const existing = this.policies.get(policyId);
    if (!existing) return null;
    return this.createPolicy(existing.ownerCanonicalId, newRules, existing.defaultVisibility);
  }

  project(
    policyId: string,
    identityAttributes: Record<string, string>,
    recipientCanonicalId: string,
    layer: DisclosureLayer = "three-word"
  ): DisclosureProjection {
    const policy = this.policies.get(policyId);
    if (!policy) throw new Error(`Policy ${policyId} not found`);

    const disclosed: DisclosedAttribute[] = [];
    let redactedCount = 0;

    const layerKeys = layer === "attributes"
      ? Object.keys(identityAttributes)
      : layer === "full"
        ? [...LAYER_ATTRIBUTES["full"], ...Object.keys(identityAttributes)]
        : LAYER_ATTRIBUTES[layer];

    for (const key of layerKeys) {
      const value = identityAttributes[key];
      if (value === undefined) continue;

      const rule = policy.rules.find(r => r.attributeKey === key);
      const visibility = rule?.visibility ?? policy.defaultVisibility;

      if (visibility === "selective" && rule) {
        if (rule.audienceCanonicalIds.length > 0 && !rule.audienceCanonicalIds.includes(recipientCanonicalId)) {
          redactedCount++; continue;
        }
      }
      if (visibility === "private" || visibility === "redacted") { redactedCount++; continue; }
      if (rule?.expiresAt && new Date(rule.expiresAt) < new Date()) { redactedCount++; continue; }

      disclosed.push({ key, value, visibility });
    }

    this.redactedTotal += redactedCount;
    this.layerCounts[layer]++;

    const projPayload = canonicalEncode({
      source: policy.ownerCanonicalId, recipient: recipientCanonicalId,
      disclosed: disclosed.map(d => d.key), redacted: redactedCount,
      policy: policyId, t: Date.now(),
    });
    const hashBytes = sha256(projPayload);
    const projectionCid = createCid(hashBytes).string;

    const proofPayload = canonicalEncode({
      policyId, attrs: disclosed.map(d => ({ k: d.key, v: d.value })),
    });
    const proofHashBytes = sha256(proofPayload);
    const proofHash = toHex(proofHashBytes);

    const projection: DisclosureProjection = {
      "@type": "uor:DisclosureProjection", projectionCid,
      sourceCanonicalId: policy.ownerCanonicalId, recipientCanonicalId,
      disclosedAttributes: disclosed, redactedCount, policyId,
      createdAt: new Date().toISOString(), proofHash,
    };
    this.projections.set(projectionCid, projection);
    return projection;
  }

  verifyProjection(projection: DisclosureProjection): boolean {
    const proofPayload = canonicalEncode({
      policyId: projection.policyId,
      attrs: projection.disclosedAttributes.map(d => ({ k: d.key, v: d.value })),
    });
    const proofHashBytes = sha256(proofPayload);
    return toHex(proofHashBytes) === projection.proofHash;
  }

  getPolicy(policyId: string): DisclosurePolicy | undefined { return this.policies.get(policyId); }
  getPoliciesFor(ownerCanonicalId: string): DisclosurePolicy[] {
    return Array.from(this.policies.values()).filter(p => p.ownerCanonicalId === ownerCanonicalId);
  }
  getProjectionsFor(recipientCanonicalId: string): DisclosureProjection[] {
    return Array.from(this.projections.values()).filter(p => p.recipientCanonicalId === recipientCanonicalId);
  }

  stats(): DisclosureStats {
    let totalRules = 0;
    for (const p of this.policies.values()) totalRules += p.rules.length;
    return {
      totalPolicies: this.policies.size, totalProjections: this.projections.size,
      totalRules, disclosuresByLayer: { ...this.layerCounts }, redactedTotal: this.redactedTotal,
    };
  }
}
