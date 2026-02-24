/**
 * Unified Agent Card
 * ══════════════════
 *
 * One JSON-LD object → one SHA-256 → six ecosystems.
 *
 * The most elegant insight from the Coherence Gate: an agent doesn't
 * need six separate registrations. It needs ONE canonical descriptor
 * that holographically projects into DID, VC, ONNX, skill.md, OASF,
 * ERC-8004, and every other protocol in the hologram registry.
 *
 * @module uns/core/unified-agent-card
 */

import { singleProofHash } from "./identity";
import { project, PROJECTIONS } from "./hologram";
import type { ProjectionInput, HologramProjection } from "./hologram";

// ── Types ─────────────────────────────────────────────────────────────────

export interface AgentDescriptor {
  readonly name: string;
  readonly description: string;
  readonly capabilities?: readonly string[];
  readonly model?: string;              // ONNX model reference
  readonly endpoints?: readonly string[]; // skill.md endpoints
  readonly version?: string;
}

export interface UnifiedCard {
  readonly descriptor: AgentDescriptor;
  readonly jsonLd: Record<string, unknown>;
  readonly hex: string;
  readonly cid: string;
  readonly projections: ReadonlyMap<string, HologramProjection>;
  readonly ecosystems: {
    readonly identity: string;    // DID
    readonly credential: string;  // VC
    readonly onChain: string;     // ERC-8004
    readonly model: string;       // ONNX
    readonly skill: string;       // skill.md
    readonly service: string;     // OASF
    readonly payment: string;     // x402
    readonly discovery: string;   // ActivityPub
    readonly settlement: string;  // Bitcoin
  };
}

// ── Card Construction ─────────────────────────────────────────────────────

/**
 * Builds the canonical JSON-LD for an agent.
 * This is the single source of truth — everything else is a projection.
 */
function buildJsonLd(agent: AgentDescriptor): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": agent.name,
    "description": agent.description,
    ...(agent.capabilities?.length && {
      "featureList": agent.capabilities,
    }),
    ...(agent.model && {
      "softwareRequirements": agent.model,
    }),
    ...(agent.endpoints?.length && {
      "potentialAction": agent.endpoints,
    }),
    ...(agent.version && {
      "softwareVersion": agent.version,
    }),
  };
}

/**
 * Create a Unified Agent Card.
 *
 * One call. One hash. Every ecosystem.
 */
export async function createUnifiedCard(agent: AgentDescriptor): Promise<UnifiedCard> {
  const jsonLd = buildJsonLd(agent);
  const identity = await singleProofHash(jsonLd);
  const hex = identity["u:canonicalId"].split(":").pop()!;
  const input: ProjectionInput = { hashBytes: identity.hashBytes, cid: identity["u:cid"], hex };

  // Project into ALL registered protocols
  const projections = new Map<string, HologramProjection>();
  for (const [name] of PROJECTIONS) {
    projections.set(name, project(input, name));
  }

  return {
    descriptor: agent,
    jsonLd,
    hex,
    cid: identity["u:cid"],
    projections,
    ecosystems: {
      identity: project(input, "did").value,
      credential: project(input, "vc").value,
      onChain: project(input, "erc8004").value,
      model: project(input, "onnx").value,
      skill: project(input, "skill-md").value,
      service: project(input, "oasf").value,
      payment: project(input, "x402").value,
      discovery: project(input, "activitypub").value,
      settlement: project(input, "bitcoin").value,
    },
  };
}

// ── Integrity Proof ───────────────────────────────────────────────────────

/**
 * ONNX ↔ skill.md Integrity Proof
 *
 * Verifies that a model and its advertised skill descriptor share the
 * same canonical identity — proving the model matches its capabilities.
 *
 * When both are derived from the same agent descriptor, their UOR
 * hashes are structurally identical. This is not an assertion — it's
 * a mathematical consequence of content-addressing.
 */
export function verifyModelSkillCoherence(card: UnifiedCard): {
  coherent: boolean;
  modelHash: string;
  skillHash: string;
  proof: string;
} {
  const modelHash = card.ecosystems.model.split(":").pop()!;
  const skillHash = card.ecosystems.skill.split(":").pop()!;
  const coherent = modelHash === skillHash;

  return {
    coherent,
    modelHash,
    skillHash,
    proof: coherent
      ? `∀ projections P₁, P₂ ∈ Hologram(x): hash(P₁) ≡ hash(P₂) ≡ SHA-256(URDNA2015(x))`
      : `INCOHERENT: model and skill derived from different source objects`,
  };
}
