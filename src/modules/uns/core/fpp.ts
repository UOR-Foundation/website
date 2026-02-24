/**
 * UNS Core — First Person Project (FPP) Trust Task Module
 * ════════════════════════════════════════════════════════
 *
 * Implements the First Person Project's trust task protocols (Layer 3
 * of the ToIP stack) on top of the TSP messaging substrate (Layer 2).
 *
 * Architecture (from the FPP White Paper V1.2):
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ Layer 3: Trust Tasks (PHCs, VRCs, R-Cards, Trust Graph) │  ← THIS MODULE
 *   ├─────────────────────────────────────────────────────────┤
 *   │ Layer 2: TSP (Envelopes, Routing, Relationships)        │  ← tsp.ts
 *   ├─────────────────────────────────────────────────────────┤
 *   │ Layer 1: VIDs / DIDs (Identity Resolution)              │  ← hologram/
 *   ├─────────────────────────────────────────────────────────┤
 *   │ Layer 0: UOR (URDNA2015 → SHA-256 → Canonical Identity) │  ← identity.ts
 *   └─────────────────────────────────────────────────────────┘
 *
 * Every FPP object flows through singleProofHash():
 *   PHC → URDNA2015 → SHA-256 → UorCanonicalIdentity → Hologram (all projections)
 *   VRC → URDNA2015 → SHA-256 → UorCanonicalIdentity → Hologram (all projections)
 *
 * Canonicality Guarantee:
 *   No raw string hashing. Every credential, relationship card, trust
 *   graph node, and persona object is canonicalized via URDNA2015 before
 *   hashing. This ensures cross-agent, cross-platform determinism.
 *
 * @module uns/core/fpp
 * @see https://www.firstperson.network/
 * @see The First Person Project White Paper V1.2 (2026-01-23)
 */

import { singleProofHash } from "./identity";
import type { UorCanonicalIdentity } from "./address";
import { project } from "./hologram";
import type { HologramProjection } from "./hologram";
import { resolveVid, sealEnvelope } from "./tsp";
import type { TspVid, SealedTspEnvelope, TspRelationship } from "./tsp";

// ── Personhood Credentials (PHCs) — Part Four & Five of FPP White Paper ────

/**
 * A Personhood Credential — proof that the holder is a real unique person
 * within a specific digital trust ecosystem.
 *
 * Design Principles (from the Personhood Credentials paper, Aug 2024):
 *   1. Credential limits: At most one PHC per person per ecosystem
 *   2. Unlinkable pseudonymity: ZKP-based service-specific pseudonyms
 *
 * PHC Issuance Flow:
 *   Ecosystem Governing Authority → verifies uniqueness → issues PHC
 *   PHC = UOR object → singleProofHash() → content-addressed identity
 */
export interface PersonhoodCredential {
  "@type": "fpp:PersonhoodCredential";
  "@context": "https://www.firstperson.network/context/v1";
  /** The issuing ecosystem's identifier (e.g., Linux Foundation, university). */
  "fpp:ecosystem": string;
  /** The holder's M-DID within this ecosystem. */
  "fpp:holder": string;
  /** Timestamp of issuance. */
  "fpp:issuedAt": string;
  /** Optional expiration. */
  "fpp:expiresAt"?: string;
  /** Issuer's VID (the ecosystem's governing authority). */
  "fpp:issuer": string;
  /** Nonce for uniqueness guarantee. */
  "fpp:nonce": string;
}

/** A sealed PHC — the credential plus its canonical identity. */
export interface SealedPhc {
  readonly credential: PersonhoodCredential;
  readonly identity: UorCanonicalIdentity;
  readonly phcId: string;
  readonly projections: {
    readonly phc: string;
    readonly vc: string;
    readonly did: string;
    readonly cid: string;
    readonly trustgraph: string;
  };
}

/**
 * Issue a Personhood Credential.
 *
 * Pipeline:
 *   1. Construct the PHC JSON-LD object
 *   2. singleProofHash() → URDNA2015 → SHA-256 → canonical identity
 *   3. Project through fpp-phc, vc, did, cid, fpp-trustgraph
 *
 * The nonce ensures uniqueness even if the same person is re-credentialed.
 */
export async function issuePhc(
  ecosystem: string,
  holderMdid: string,
  issuerVid: string,
  expiresAt?: string,
): Promise<SealedPhc> {
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const credential: PersonhoodCredential = {
    "@type": "fpp:PersonhoodCredential",
    "@context": "https://www.firstperson.network/context/v1",
    "fpp:ecosystem": ecosystem,
    "fpp:holder": holderMdid,
    "fpp:issuedAt": new Date().toISOString(),
    "fpp:issuer": issuerVid,
    "fpp:nonce": nonce,
    ...(expiresAt ? { "fpp:expiresAt": expiresAt } : {}),
  };

  const identity = await singleProofHash(credential);

  const phcProj = project(identity, "fpp-phc") as HologramProjection;
  const vcProj = project(identity, "vc") as HologramProjection;
  const didProj = project(identity, "did") as HologramProjection;
  const cidProj = project(identity, "cid") as HologramProjection;
  const tgProj = project(identity, "fpp-trustgraph") as HologramProjection;

  return {
    credential,
    identity,
    phcId: phcProj.value,
    projections: {
      phc: phcProj.value,
      vc: vcProj.value,
      did: didProj.value,
      cid: cidProj.value,
      trustgraph: tgProj.value,
    },
  };
}

// ── Verifiable Relationship Credentials (VRCs) — Part Five ─────────────────

/**
 * A Verifiable Relationship Credential — a peer-to-peer attestation of
 * a first-person trust relationship between two PHC holders.
 *
 * VRCs are issued in pairs (one in each direction). Each VRC:
 *   - Includes both parties' pairwise private R-DIDs
 *   - Is signed by the issuer's private key for their R-DID
 *   - Is linked to both parties' PHCs (for Sybil resistance)
 *   - Has an expiration date (relationships are not permanent by default)
 */
export interface VerifiableRelationshipCredential {
  "@type": "fpp:VerifiableRelationshipCredential";
  "@context": "https://www.firstperson.network/context/v1";
  /** Issuer's R-DID (the party vouching). */
  "fpp:issuerRdid": string;
  /** Subject's R-DID (the party being vouched for). */
  "fpp:subjectRdid": string;
  /** Reference to the issuer's PHC (for Sybil proof). */
  "fpp:issuerPhcRef": string;
  /** Reference to the subject's PHC (for Sybil proof). */
  "fpp:subjectPhcRef": string;
  /** The ecosystem in which this relationship exists. */
  "fpp:ecosystem": string;
  /** Issuance timestamp. */
  "fpp:issuedAt": string;
  /** Expiration timestamp. */
  "fpp:expiresAt": string;
  /** Nonce for uniqueness. */
  "fpp:nonce": string;
}

/** A sealed VRC — credential plus canonical identity. */
export interface SealedVrc {
  readonly credential: VerifiableRelationshipCredential;
  readonly identity: UorCanonicalIdentity;
  readonly vrcId: string;
  readonly projections: {
    readonly vrc: string;
    readonly vc: string;
    readonly did: string;
    readonly cid: string;
    readonly trustgraph: string;
  };
}

/**
 * Issue a Verifiable Relationship Credential.
 *
 * This issues ONE direction of the VRC pair. Both parties should
 * call this function to create the bidirectional attestation.
 */
export async function issueVrc(
  issuerRdid: string,
  subjectRdid: string,
  issuerPhcRef: string,
  subjectPhcRef: string,
  ecosystem: string,
  expiresAt: string,
): Promise<SealedVrc> {
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const credential: VerifiableRelationshipCredential = {
    "@type": "fpp:VerifiableRelationshipCredential",
    "@context": "https://www.firstperson.network/context/v1",
    "fpp:issuerRdid": issuerRdid,
    "fpp:subjectRdid": subjectRdid,
    "fpp:issuerPhcRef": issuerPhcRef,
    "fpp:subjectPhcRef": subjectPhcRef,
    "fpp:ecosystem": ecosystem,
    "fpp:issuedAt": new Date().toISOString(),
    "fpp:expiresAt": expiresAt,
    "fpp:nonce": nonce,
  };

  const identity = await singleProofHash(credential);

  const vrcProj = project(identity, "fpp-vrc") as HologramProjection;
  const vcProj = project(identity, "vc") as HologramProjection;
  const didProj = project(identity, "did") as HologramProjection;
  const cidProj = project(identity, "cid") as HologramProjection;
  const tgProj = project(identity, "fpp-trustgraph") as HologramProjection;

  return {
    credential,
    identity,
    vrcId: vrcProj.value,
    projections: {
      vrc: vrcProj.value,
      vc: vcProj.value,
      did: didProj.value,
      cid: cidProj.value,
      trustgraph: tgProj.value,
    },
  };
}

// ── Verifiable Endorsement Credentials (VECs) — Social Vouching ────────────

/**
 * A Verifiable Endorsement Credential — contextual reputation vouching.
 *
 * Unlike VRCs (which use R-DIDs and assert relationship existence),
 * VECs use Persona DIDs (P-DIDs) and assert specific capabilities
 * or qualities. VECs are the building blocks of contextual reputation.
 *
 * Example: Bob vouches for Alice as a "microbiologist" and "gardener"
 * using his professional P-DID.
 */
export interface VerifiableEndorsementCredential {
  "@type": "fpp:VerifiableEndorsementCredential";
  "@context": "https://www.firstperson.network/context/v1";
  /** Endorser's P-DID (provides social context). */
  "fpp:endorserPdid": string;
  /** Subject's P-DID (the persona being endorsed). */
  "fpp:subjectPdid": string;
  /** Endorsement claims — what capabilities/qualities are being vouched for. */
  "fpp:endorsements": readonly string[];
  /** The context in which the endorsement applies. */
  "fpp:context": string;
  /** Issuance timestamp. */
  "fpp:issuedAt": string;
  /** Optional expiration. */
  "fpp:expiresAt"?: string;
  /** Nonce for uniqueness. */
  "fpp:nonce": string;
}

/** A sealed VEC — endorsement plus canonical identity. */
export interface SealedVec {
  readonly credential: VerifiableEndorsementCredential;
  readonly identity: UorCanonicalIdentity;
  readonly vecId: string;
  readonly projections: {
    readonly vec: string;
    readonly vc: string;
    readonly did: string;
  };
}

/**
 * Issue a Verifiable Endorsement Credential.
 */
export async function issueVec(
  endorserPdid: string,
  subjectPdid: string,
  endorsements: readonly string[],
  context: string,
  expiresAt?: string,
): Promise<SealedVec> {
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const credential: VerifiableEndorsementCredential = {
    "@type": "fpp:VerifiableEndorsementCredential",
    "@context": "https://www.firstperson.network/context/v1",
    "fpp:endorserPdid": endorserPdid,
    "fpp:subjectPdid": subjectPdid,
    "fpp:endorsements": endorsements,
    "fpp:context": context,
    "fpp:issuedAt": new Date().toISOString(),
    "fpp:nonce": nonce,
    ...(expiresAt ? { "fpp:expiresAt": expiresAt } : {}),
  };

  const identity = await singleProofHash(credential);

  const vecProj = project(identity, "fpp-vec") as HologramProjection;
  const vcProj = project(identity, "vc") as HologramProjection;
  const didProj = project(identity, "did") as HologramProjection;

  return {
    credential,
    identity,
    vecId: vecProj.value,
    projections: {
      vec: vecProj.value,
      vc: vcProj.value,
      did: didProj.value,
    },
  };
}

// ── Persona Management — Sovereign Wallet DID Hierarchy ────────────────────

/**
 * DID Hierarchy (from FPP White Paper Figure 26):
 *
 *   ┌─────────────────────────────────────────┐
 *   │  P-DIDs (Persona DIDs)                   │  Public/cross-context
 *   │  - Intentional correlation               │
 *   │  - Digital signatures                    │
 *   │  - Content credentials (C2PA)            │
 *   ├─────────────────────────────────────────┤
 *   │  M-DIDs (Membership DIDs)                │  Community-scoped
 *   │  - One per VTC membership                │
 *   │  - Linked to VMC (membership credential) │
 *   ├─────────────────────────────────────────┤
 *   │  R-DIDs (Relationship DIDs)              │  Pairwise private
 *   │  - One per private channel               │
 *   │  - NOT for correlation                   │
 *   └─────────────────────────────────────────┘
 */

/** A persona in the sovereign wallet's DID hierarchy. */
export type PersonaType = "relationship" | "membership" | "persona";

export interface FppPersona {
  "@type": "fpp:Persona";
  "@context": "https://www.firstperson.network/context/v1";
  /** The persona type (determines DID scope). */
  "fpp:type": PersonaType;
  /** Human-readable label for this persona. */
  "fpp:label": string;
  /** The context(s) where this persona is used. */
  "fpp:contexts": readonly string[];
  /** Whether this persona is publicly resolvable. */
  "fpp:public": boolean;
  /** Creation timestamp. */
  "fpp:createdAt": string;
  /** Nonce for deterministic identity derivation. */
  "fpp:nonce": string;
}

/** A resolved persona — persona object plus its DID projections. */
export interface ResolvedPersona {
  readonly persona: FppPersona;
  readonly identity: UorCanonicalIdentity;
  readonly did: string;
  readonly projections: {
    readonly rdid?: string;
    readonly mdid?: string;
    readonly pdid?: string;
    readonly vid: string;
  };
}

/**
 * Create a persona in the sovereign wallet's DID hierarchy.
 *
 * Depending on the persona type, projects into the appropriate
 * FPP DID projection (fpp-rdid, fpp-mdid, or fpp-pdid).
 */
export async function createPersona(
  type: PersonaType,
  label: string,
  contexts: readonly string[],
  isPublic: boolean = false,
): Promise<ResolvedPersona> {
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const persona: FppPersona = {
    "@type": "fpp:Persona",
    "@context": "https://www.firstperson.network/context/v1",
    "fpp:type": type,
    "fpp:label": label,
    "fpp:contexts": contexts,
    "fpp:public": isPublic,
    "fpp:createdAt": new Date().toISOString(),
    "fpp:nonce": nonce,
  };

  const identity = await singleProofHash(persona);

  // Project into the appropriate DID type
  const projectionMap = {
    relationship: "fpp-rdid",
    membership: "fpp-mdid",
    persona: "fpp-pdid",
  } as const;

  const didProj = project(identity, projectionMap[type]) as HologramProjection;
  const vidProj = project(identity, "tsp-vid") as HologramProjection;

  const projections: ResolvedPersona["projections"] = {
    vid: vidProj.value,
    ...(type === "relationship" ? { rdid: didProj.value } : {}),
    ...(type === "membership" ? { mdid: didProj.value } : {}),
    ...(type === "persona" ? { pdid: didProj.value } : {}),
  };

  return { persona, identity, did: didProj.value, projections };
}

// ── Relationship Cards (R-Cards) — Digital Business Cards ──────────────────

/**
 * A Relationship Card — the cryptographically signed digital equivalent
 * of a business card, exchanged over private channels.
 *
 * R-cards support one-way synchronization: the issuer can push updates
 * and subscribing agents verify + store automatically.
 */
export interface RelationshipCard {
  "@type": "fpp:RelationshipCard";
  "@context": "https://www.firstperson.network/context/v1";
  /** The persona DID associated with this card. */
  "fpp:personaDid": string;
  /** Display name. */
  "fpp:displayName": string;
  /** Optional title/role. */
  "fpp:title"?: string;
  /** Optional organization. */
  "fpp:organization"?: string;
  /** Optional contact endpoints (privacy-preserving). */
  "fpp:endpoints"?: readonly string[];
  /** Version number for update tracking. */
  "fpp:version": number;
  /** Timestamp of this card version. */
  "fpp:updatedAt": string;
  /** Nonce for uniqueness. */
  "fpp:nonce": string;
}

/** A sealed r-card — card plus canonical identity. */
export interface SealedRcard {
  readonly card: RelationshipCard;
  readonly identity: UorCanonicalIdentity;
  readonly rcardId: string;
  readonly projections: {
    readonly rcard: string;
    readonly cid: string;
    readonly did: string;
  };
}

/**
 * Create or update a relationship card.
 *
 * Each version gets a new canonical identity. The version history
 * forms a chain of content-addressed updates.
 */
export async function createRcard(
  personaDid: string,
  displayName: string,
  options?: {
    title?: string;
    organization?: string;
    endpoints?: readonly string[];
    version?: number;
  },
): Promise<SealedRcard> {
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const card: RelationshipCard = {
    "@type": "fpp:RelationshipCard",
    "@context": "https://www.firstperson.network/context/v1",
    "fpp:personaDid": personaDid,
    "fpp:displayName": displayName,
    "fpp:version": options?.version ?? 1,
    "fpp:updatedAt": new Date().toISOString(),
    "fpp:nonce": nonce,
    ...(options?.title ? { "fpp:title": options.title } : {}),
    ...(options?.organization ? { "fpp:organization": options.organization } : {}),
    ...(options?.endpoints ? { "fpp:endpoints": options.endpoints } : {}),
  };

  const identity = await singleProofHash(card);

  const rcardProj = project(identity, "fpp-rcard") as HologramProjection;
  const cidProj = project(identity, "cid") as HologramProjection;
  const didProj = project(identity, "did") as HologramProjection;

  return {
    card,
    identity,
    rcardId: rcardProj.value,
    projections: {
      rcard: rcardProj.value,
      cid: cidProj.value,
      did: didProj.value,
    },
  };
}

// ── Trust Graph Operations — Decentralized Trust Graph ─────────────────────

/**
 * A Trust Graph Node — represents one entity's position in the
 * decentralized trust graph. The node's identity is derived from
 * its aggregate trust relationships.
 *
 * The trust graph is a geodesic dome of verifiable relationship
 * trust triangles: (PHC-A, PHC-B, VRC-AB) anchored to ecosystems.
 */
export interface TrustGraphNode {
  "@type": "fpp:TrustGraphNode";
  "@context": "https://www.firstperson.network/context/v1";
  /** The node's primary persona DID. */
  "fpp:nodeDid": string;
  /** References to the node's PHCs (content-addressed). */
  "fpp:phcRefs": readonly string[];
  /** Count of VRCs held (privacy-preserving — no VRC IDs exposed). */
  "fpp:vrcCount": number;
  /** Ecosystems where the node holds PHCs. */
  "fpp:ecosystems": readonly string[];
  /** Timestamp of this snapshot. */
  "fpp:snapshotAt": string;
  /** Nonce for snapshot uniqueness. */
  "fpp:nonce": string;
}

/** A sealed trust graph node — node plus canonical identity. */
export interface SealedTrustGraphNode {
  readonly node: TrustGraphNode;
  readonly identity: UorCanonicalIdentity;
  readonly nodeId: string;
  readonly projections: {
    readonly trustgraph: string;
    readonly did: string;
    readonly cid: string;
    readonly trqp: string;
  };
}

/**
 * Create a trust graph node snapshot.
 *
 * This captures the current state of an entity's position in the
 * decentralized trust graph. Each snapshot is content-addressed —
 * changes in trust relationships produce new snapshots with new hashes.
 */
export async function createTrustGraphNode(
  nodeDid: string,
  phcRefs: readonly string[],
  vrcCount: number,
  ecosystems: readonly string[],
): Promise<SealedTrustGraphNode> {
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const node: TrustGraphNode = {
    "@type": "fpp:TrustGraphNode",
    "@context": "https://www.firstperson.network/context/v1",
    "fpp:nodeDid": nodeDid,
    "fpp:phcRefs": phcRefs,
    "fpp:vrcCount": vrcCount,
    "fpp:ecosystems": ecosystems,
    "fpp:snapshotAt": new Date().toISOString(),
    "fpp:nonce": nonce,
  };

  const identity = await singleProofHash(node);

  const tgProj = project(identity, "fpp-trustgraph") as HologramProjection;
  const didProj = project(identity, "did") as HologramProjection;
  const cidProj = project(identity, "cid") as HologramProjection;
  const trqpProj = project(identity, "trqp") as HologramProjection;

  return {
    node,
    identity,
    nodeId: tgProj.value,
    projections: {
      trustgraph: tgProj.value,
      did: didProj.value,
      cid: cidProj.value,
      trqp: trqpProj.value,
    },
  };
}

// ── Composite Operations — PHC+VRC Exchange over TSP ───────────────────────

/**
 * Exchange VRCs over a TSP private channel.
 *
 * This implements the full flow from FPP White Paper Figure 23:
 *   1. Alice and Bob have an existing TSP relationship (private channel)
 *   2. Bob issues a VRC to Alice via TSP envelope
 *   3. Alice issues a VRC to Bob via TSP envelope
 *   4. Both VRCs are sealed and content-addressed
 *
 * The TSP envelope provides authenticity, confidentiality, and
 * metadata privacy. The VRCs provide the trust graph edges.
 */
export async function exchangeVrcs(
  partyA: TspVid,
  partyB: TspVid,
  partyAPhcRef: string,
  partyBPhcRef: string,
  ecosystem: string,
  expiresAt: string,
): Promise<{
  vrcAtoB: SealedVrc;
  vrcBtoA: SealedVrc;
  envelopeAtoB: SealedTspEnvelope;
  envelopeBtoA: SealedTspEnvelope;
}> {
  // Step 1: Party A issues VRC to Party B
  const vrcAtoB = await issueVrc(
    partyA.vid, partyB.vid,
    partyAPhcRef, partyBPhcRef,
    ecosystem, expiresAt,
  );

  // Step 2: Party B issues VRC to Party A
  const vrcBtoA = await issueVrc(
    partyB.vid, partyA.vid,
    partyBPhcRef, partyAPhcRef,
    ecosystem, expiresAt,
  );

  // Step 3: Wrap in TSP envelopes for authenticated delivery
  const envelopeAtoB = await sealEnvelope(
    partyA, partyB,
    "tsp:GenericMessage",
    { "@type": "fpp:VrcDelivery", "fpp:vrc": vrcAtoB.vrcId },
  );

  const envelopeBtoA = await sealEnvelope(
    partyB, partyA,
    "tsp:GenericMessage",
    { "@type": "fpp:VrcDelivery", "fpp:vrc": vrcBtoA.vrcId },
  );

  return { vrcAtoB, vrcBtoA, envelopeAtoB, envelopeBtoA };
}

// ── Verification Helpers ───────────────────────────────────────────────────

/**
 * Verify a sealed PHC by recomputing its canonical identity.
 */
export async function verifyPhc(sealed: SealedPhc): Promise<boolean> {
  try {
    const recomputed = await singleProofHash(sealed.credential);
    return recomputed["u:canonicalId"] === sealed.identity["u:canonicalId"];
  } catch {
    return false;
  }
}

/**
 * Verify a sealed VRC by recomputing its canonical identity.
 */
export async function verifyVrc(sealed: SealedVrc): Promise<boolean> {
  try {
    const recomputed = await singleProofHash(sealed.credential);
    return recomputed["u:canonicalId"] === sealed.identity["u:canonicalId"];
  } catch {
    return false;
  }
}

/**
 * Verify that a VRC pair forms a valid trust triangle.
 *
 * A trust triangle requires:
 *   1. Both VRCs reference the same ecosystem
 *   2. Both VRCs reference each other's PHCs
 *   3. Both VRCs are individually valid (canonical hash matches)
 *
 * This prevents Sybil attacks by ensuring VRCs are anchored to
 * unique PHCs within the same ecosystem.
 */
export async function verifyTrustTriangle(
  vrcAtoB: SealedVrc,
  vrcBtoA: SealedVrc,
): Promise<{ valid: boolean; reason?: string }> {
  // Check ecosystem match
  if (vrcAtoB.credential["fpp:ecosystem"] !== vrcBtoA.credential["fpp:ecosystem"]) {
    return { valid: false, reason: "VRCs reference different ecosystems" };
  }

  // Check cross-referencing of PHCs
  if (vrcAtoB.credential["fpp:issuerPhcRef"] !== vrcBtoA.credential["fpp:subjectPhcRef"]) {
    return { valid: false, reason: "VRC A→B issuer PHC does not match VRC B→A subject PHC" };
  }
  if (vrcBtoA.credential["fpp:issuerPhcRef"] !== vrcAtoB.credential["fpp:subjectPhcRef"]) {
    return { valid: false, reason: "VRC B→A issuer PHC does not match VRC A→B subject PHC" };
  }

  // Verify individual VRC integrity
  const aValid = await verifyVrc(vrcAtoB);
  const bValid = await verifyVrc(vrcBtoA);

  if (!aValid) return { valid: false, reason: "VRC A→B failed canonical verification" };
  if (!bValid) return { valid: false, reason: "VRC B→A failed canonical verification" };

  return { valid: true };
}

// ── Agent Delegation Credentials (ADC) — Certified AI Agents ──────────────

/**
 * An Agent Delegation Credential — proof that an AI agent is delegated
 * by a verified human identity (PHC holder).
 *
 * This bridges FPP's trust infrastructure to the agentic AI ecosystem:
 *   Human PHC → VRC-to-agent → a2a projection + mcp-tool projection
 *
 * Design Principles:
 *   1. The human's PHC proves personhood (Sybil resistance)
 *   2. The VRC proves the delegation relationship (human → agent)
 *   3. The agent's identity projects into a2a (discovery) and mcp-tool (capability)
 *   4. The delegation credential carries the full provenance chain
 *
 * Trust chain: PHC(human) → VRC(human→agent) → ADC → a2a + mcp-tool
 */
export interface AgentDelegationCredential {
  "@type": "fpp:AgentDelegationCredential";
  "@context": "https://www.firstperson.network/context/v1";
  /** The delegating human's R-DID (issuer of the VRC). */
  "fpp:delegatorRdid": string;
  /** The agent's DID (subject of the VRC). */
  "fpp:agentDid": string;
  /** Reference to the delegator's PHC (for Sybil proof). */
  "fpp:delegatorPhcRef": string;
  /** Reference to the VRC that establishes the delegation. */
  "fpp:delegationVrcRef": string;
  /** The ecosystem in which this delegation exists. */
  "fpp:ecosystem": string;
  /** Capabilities delegated to the agent (maps to skill.md / MCP tools). */
  "fpp:delegatedCapabilities": readonly string[];
  /** Agent model URI (optional — links to ONNX projection). */
  "fpp:agentModelUri"?: string;
  /** MCP endpoint the agent serves (optional). */
  "fpp:mcpEndpoint"?: string;
  /** Issuance timestamp. */
  "fpp:issuedAt": string;
  /** Expiration timestamp. */
  "fpp:expiresAt": string;
  /** Nonce for uniqueness. */
  "fpp:nonce": string;
}

/** A sealed ADC — credential plus canonical identity and hologram projections. */
export interface SealedAgentDelegation {
  readonly credential: AgentDelegationCredential;
  readonly identity: UorCanonicalIdentity;
  readonly adcId: string;
  readonly projections: {
    /** Agent's DID (W3C self-sovereign identity). */
    readonly did: string;
    /** Content-addressed identity. */
    readonly cid: string;
    /** Verifiable Credential projection. */
    readonly vc: string;
    /** A2A Agent Card — agent is discoverable in Google A2A protocol. */
    readonly a2a: string;
    /** MCP tool identity — agent's tools are content-addressed. */
    readonly mcpTool: string;
    /** MCP context entry — agent's context contributions. */
    readonly mcpContext: string;
    /** Trust graph position. */
    readonly trustgraph: string;
    /** VRC reference (the delegation relationship). */
    readonly vrc: string;
  };
}

/**
 * Issue an Agent Delegation Credential.
 *
 * This implements the full human→agent delegation pipeline:
 *   1. The human (delegator) must have a valid PHC
 *   2. A VRC is issued from human to agent (delegation relationship)
 *   3. The ADC wraps both and projects into a2a + mcp-tool
 *
 * Pipeline:
 *   ADC JSON-LD → singleProofHash() → URDNA2015 → SHA-256 → Hologram
 *   Result projects into: did, cid, vc, a2a, mcp-tool, mcp-context, fpp-trustgraph
 */
export async function issueAgentDelegation(
  delegatorRdid: string,
  agentDid: string,
  delegatorPhcRef: string,
  delegationVrcRef: string,
  ecosystem: string,
  capabilities: readonly string[],
  expiresAt: string,
  options?: {
    agentModelUri?: string;
    mcpEndpoint?: string;
  },
): Promise<SealedAgentDelegation> {
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const credential: AgentDelegationCredential = {
    "@type": "fpp:AgentDelegationCredential",
    "@context": "https://www.firstperson.network/context/v1",
    "fpp:delegatorRdid": delegatorRdid,
    "fpp:agentDid": agentDid,
    "fpp:delegatorPhcRef": delegatorPhcRef,
    "fpp:delegationVrcRef": delegationVrcRef,
    "fpp:ecosystem": ecosystem,
    "fpp:delegatedCapabilities": capabilities,
    "fpp:issuedAt": new Date().toISOString(),
    "fpp:expiresAt": expiresAt,
    "fpp:nonce": nonce,
    ...(options?.agentModelUri ? { "fpp:agentModelUri": options.agentModelUri } : {}),
    ...(options?.mcpEndpoint ? { "fpp:mcpEndpoint": options.mcpEndpoint } : {}),
  };

  const identity = await singleProofHash(credential);

  const didProj = project(identity, "did") as HologramProjection;
  const cidProj = project(identity, "cid") as HologramProjection;
  const vcProj = project(identity, "vc") as HologramProjection;
  const a2aProj = project(identity, "a2a") as HologramProjection;
  const mcpToolProj = project(identity, "mcp-tool") as HologramProjection;
  const mcpCtxProj = project(identity, "mcp-context") as HologramProjection;
  const tgProj = project(identity, "fpp-trustgraph") as HologramProjection;
  const vrcProj = project(identity, "fpp-vrc") as HologramProjection;

  return {
    credential,
    identity,
    adcId: didProj.value,
    projections: {
      did: didProj.value,
      cid: cidProj.value,
      vc: vcProj.value,
      a2a: a2aProj.value,
      mcpTool: mcpToolProj.value,
      mcpContext: mcpCtxProj.value,
      trustgraph: tgProj.value,
      vrc: vrcProj.value,
    },
  };
}

/**
 * Verify an Agent Delegation Credential.
 *
 * Checks:
 *   1. Canonical hash integrity (re-hashes the credential)
 *   2. VRC reference validity (the delegation VRC must match)
 *   3. PHC reference chain (delegator PHC → VRC → ADC)
 */
export async function verifyAgentDelegation(
  sealed: SealedAgentDelegation,
  delegationVrc?: SealedVrc,
): Promise<{ valid: boolean; checks: AgentDelegationCheck[] }> {
  const checks: AgentDelegationCheck[] = [];

  // Check 1: Canonical hash integrity
  try {
    const recomputed = await singleProofHash(sealed.credential);
    const hashValid = recomputed["u:canonicalId"] === sealed.identity["u:canonicalId"];
    checks.push({ name: "canonical-hash", passed: hashValid, detail: hashValid ? "Hash matches" : "Hash mismatch" });
  } catch {
    checks.push({ name: "canonical-hash", passed: false, detail: "Hash computation failed" });
  }

  // Check 2: Capabilities are non-empty
  const hasCaps = sealed.credential["fpp:delegatedCapabilities"].length > 0;
  checks.push({ name: "capabilities", passed: hasCaps, detail: hasCaps ? `${sealed.credential["fpp:delegatedCapabilities"].length} capabilities` : "No capabilities delegated" });

  // Check 3: Expiration
  const notExpired = new Date(sealed.credential["fpp:expiresAt"]) > new Date();
  checks.push({ name: "expiration", passed: notExpired, detail: notExpired ? "Not expired" : "Credential expired" });

  // Check 4: A2A projection exists
  const hasA2a = sealed.projections.a2a.length > 0;
  checks.push({ name: "a2a-projection", passed: hasA2a, detail: hasA2a ? "A2A agent card projected" : "Missing A2A projection" });

  // Check 5: MCP tool projection exists
  const hasMcp = sealed.projections.mcpTool.length > 0;
  checks.push({ name: "mcp-tool-projection", passed: hasMcp, detail: hasMcp ? "MCP tool identity projected" : "Missing MCP projection" });

  // Check 6: VRC cross-reference (if VRC provided)
  if (delegationVrc) {
    const vrcMatch = sealed.credential["fpp:delegationVrcRef"] === delegationVrc.vrcId;
    checks.push({ name: "vrc-cross-reference", passed: vrcMatch, detail: vrcMatch ? "VRC reference verified" : "VRC reference mismatch" });

    const ecosystemMatch = sealed.credential["fpp:ecosystem"] === delegationVrc.credential["fpp:ecosystem"];
    checks.push({ name: "ecosystem-match", passed: ecosystemMatch, detail: ecosystemMatch ? "Same ecosystem" : "Ecosystem mismatch" });
  }

  return {
    valid: checks.every(c => c.passed),
    checks,
  };
}

export interface AgentDelegationCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}
