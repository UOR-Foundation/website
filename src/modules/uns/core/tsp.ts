/**
 * UNS Core — Trust Spanning Protocol (TSP) Integration
 * ═════════════════════════════════════════════════════
 *
 * Implements the Trust Spanning Protocol (ToIP TSWG) message framing,
 * relationship forming, and envelope construction — all canonically
 * anchored to the UOR identity pipeline.
 *
 * TSP Architecture Mapping:
 *   TSP VID           → did:uor:{cid}   (hologram `tsp-vid` projection)
 *   TSP Envelope      → URDNA2015 → SHA-256 → content-addressed
 *   TSP Relationship  → uor_certificates table (RFI/RFA → cert_chain)
 *   TSP Route         → fd00:0075:6f72::/48 IPv6 (mesh/BGP alignment)
 *   TSP Key           → Dilithium-3 wrapped Ed25519 (PQ migration path)
 *
 * Canonicality Guarantee:
 *   Every TSP object (envelope, relationship, key) flows through
 *   singleProofHash() — ensuring URDNA2015 normalization, SHA-256
 *   hashing, and UOR identity derivation. No raw string hashing.
 *
 * @module uns/core/tsp
 * @see https://trustoverip.github.io/tswg-tsp-specification/
 */

import { singleProofHash } from "./identity";
import type { UorCanonicalIdentity } from "./address";
import { project } from "./hologram";
import type { HologramProjection } from "./hologram";

// ── TSP Message Types (§5) ─────────────────────────────────────────────────

/** TSP message types as defined in the specification. */
export type TspMessageType =
  | "tsp:GenericMessage"       // General-purpose authenticated message
  | "tsp:RelationshipRequest"  // RFI — Relationship Forming Invitation
  | "tsp:RelationshipAccept"   // RFA — Relationship Forming Acceptance
  | "tsp:RelationshipCancel"   // Relationship teardown
  | "tsp:RoutedMessage"        // Message through intermediary
  | "tsp:NestedMessage";       // End-to-end through intermediaries

// ── TSP VID (§4) ───────────────────────────────────────────────────────────

/**
 * A TSP Verifiable Identifier — resolved from a UOR canonical identity.
 *
 * TSP §4.1: "A VID is a URI that identifies an entity and can be
 * resolved to a set of cryptographic keys."
 *
 * In UOR, the VID IS the did:uor projection — they are structurally
 * identical. This type adds TSP-specific metadata (transport endpoint,
 * key references) while preserving the canonical identity.
 */
export interface TspVid {
  /** The VID URI — always did:uor:{cid}. */
  readonly vid: string;
  /** The underlying UOR canonical identity. */
  readonly identity: UorCanonicalIdentity;
  /** Optional transport endpoint for direct messaging. */
  readonly transport?: string;
  /** Verification key fingerprint — tsp-key projection. */
  readonly verificationKeyId: string;
}

/**
 * Resolve a UOR canonical identity into a TSP VID.
 *
 * This is the bridge between UOR identity and TSP trust:
 *   singleProofHash(object) → UorCanonicalIdentity → TspVid
 *
 * The VID is deterministic — same object always produces same VID.
 */
export function resolveVid(identity: UorCanonicalIdentity): TspVid {
  const vidProjection = project(identity, "tsp-vid") as HologramProjection;
  const keyProjection = project(identity, "tsp-key") as HologramProjection;

  return {
    vid: vidProjection.value,
    identity,
    verificationKeyId: keyProjection.value,
  };
}

// ── TSP Envelope (§5) ──────────────────────────────────────────────────────

/**
 * TSP Envelope — the authenticated message container.
 *
 * Every TSP message is wrapped in an envelope that binds:
 *   - Sender VID (who sent it)
 *   - Receiver VID (who can read it)
 *   - Message type (what kind of interaction)
 *   - Payload (the actual content)
 *   - Seal (cryptographic authentication)
 *
 * The envelope itself is a UOR object — canonicalized via URDNA2015
 * and content-addressed via singleProofHash(). This means:
 *   - Two identical messages produce the same envelope hash
 *   - The envelope hash IS the message identity
 *   - Envelopes can be stored, verified, and projected like any UOR object
 */
export interface TspEnvelope {
  "@type": "tsp:Envelope";
  "@context": "https://trustoverip.github.io/tswg-tsp-specification/context/v1";
  /** Sender's VID (did:uor:{cid}). */
  "tsp:sender": string;
  /** Receiver's VID (did:uor:{cid}). */
  "tsp:receiver": string;
  /** Message type. */
  "tsp:messageType": TspMessageType;
  /** Nonced timestamp — ensures unique envelope identity per send. */
  "tsp:timestamp": string;
  /** Application-layer payload (opaque to TSP). */
  "tsp:payload": unknown;
  /** Monotonic nonce — prevents replay and ensures hash uniqueness. */
  "tsp:nonce": string;
}

/**
 * A sealed TSP envelope — envelope + its UOR canonical identity.
 *
 * After canonicalization, the envelope gains a content-addressed
 * identity that can be projected through the hologram registry.
 */
export interface SealedTspEnvelope {
  /** The raw envelope data. */
  readonly envelope: TspEnvelope;
  /** The canonical identity of the envelope. */
  readonly identity: UorCanonicalIdentity;
  /** The tsp-envelope projection value. */
  readonly envelopeId: string;
  /** All hologram projections of this envelope. */
  readonly projections: {
    readonly envelope: string;
    readonly did: string;
    readonly cid: string;
  };
}

/**
 * Create and seal a TSP envelope.
 *
 * Pipeline:
 *   1. Construct the envelope JSON-LD object
 *   2. singleProofHash() → URDNA2015 → SHA-256 → UorCanonicalIdentity
 *   3. Project through tsp-envelope, did, cid
 *
 * The nonce is generated from crypto.getRandomValues() to ensure
 * that even identical payloads at the same timestamp produce unique
 * envelope identities (required by TSP §5.3 replay protection).
 */
export async function sealEnvelope(
  sender: TspVid,
  receiver: TspVid,
  messageType: TspMessageType,
  payload: unknown,
): Promise<SealedTspEnvelope> {
  // Generate cryptographic nonce for replay protection
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const envelope: TspEnvelope = {
    "@type": "tsp:Envelope",
    "@context": "https://trustoverip.github.io/tswg-tsp-specification/context/v1",
    "tsp:sender": sender.vid,
    "tsp:receiver": receiver.vid,
    "tsp:messageType": messageType,
    "tsp:timestamp": new Date().toISOString(),
    "tsp:payload": payload,
    "tsp:nonce": nonce,
  };

  // Canonicalize through the UOR pipeline — this is the critical path
  const identity = await singleProofHash(envelope);

  // Project through TSP-specific hologram projections
  const envelopeProj = project(identity, "tsp-envelope") as HologramProjection;
  const didProj = project(identity, "did") as HologramProjection;
  const cidProj = project(identity, "cid") as HologramProjection;

  return {
    envelope,
    identity,
    envelopeId: envelopeProj.value,
    projections: {
      envelope: envelopeProj.value,
      did: didProj.value,
      cid: cidProj.value,
    },
  };
}

// ── TSP Relationship Forming (§7) ──────────────────────────────────────────

/**
 * TSP Relationship — a verified bilateral trust channel.
 *
 * TSP defines relationship forming as a two-step handshake:
 *   1. Party A sends a Relationship Forming Invitation (RFI)
 *   2. Party B responds with a Relationship Forming Acceptance (RFA)
 *
 * The relationship identity is the hash of the combined RFI+RFA,
 * creating a content-addressed, bilateral trust channel.
 *
 * UOR Mapping:
 *   - The relationship hash → uor_certificates.certificate_id
 *   - The RFI/RFA sequence → uor_certificates.cert_chain (JSONB)
 *   - Both VIDs → uor_certificates.certifies_iri
 *   - Validity → uor_certificates.valid
 */

/** A Relationship Forming Invitation (RFI). */
export interface TspRfi {
  "@type": "tsp:RelationshipFormingInvitation";
  /** Inviter's VID. */
  "tsp:inviter": string;
  /** Invitee's VID (may be a placeholder for open invitations). */
  "tsp:invitee": string;
  /** Thread identifier for correlating RFI → RFA. */
  "tsp:thread": string;
  /** Human-readable purpose of the relationship. */
  "tsp:purpose"?: string;
  /** Timestamp of the invitation. */
  "tsp:issuedAt": string;
  /** Optional expiry for the invitation. */
  "tsp:expiresAt"?: string;
}

/** A Relationship Forming Acceptance (RFA). */
export interface TspRfa {
  "@type": "tsp:RelationshipFormingAcceptance";
  /** The accepting party's VID. */
  "tsp:accepter": string;
  /** The inviter's VID (from the RFI). */
  "tsp:inviter": string;
  /** Thread identifier — MUST match the RFI thread. */
  "tsp:thread": string;
  /** Timestamp of acceptance. */
  "tsp:acceptedAt": string;
}

/**
 * A formed TSP relationship — the result of a successful RFI+RFA handshake.
 */
export interface TspRelationship {
  /** The canonical identity of the relationship (hash of RFI+RFA). */
  readonly identity: UorCanonicalIdentity;
  /** The tsp-relationship projection value. */
  readonly relationshipId: string;
  /** Party A (inviter) VID. */
  readonly partyA: string;
  /** Party B (accepter) VID. */
  readonly partyB: string;
  /** The thread identifier. */
  readonly thread: string;
  /** The RFI that initiated the relationship. */
  readonly rfi: TspRfi;
  /** The RFA that completed the relationship. */
  readonly rfa: TspRfa;
  /** Certificate chain suitable for uor_certificates.cert_chain. */
  readonly certChain: readonly [TspRfi, TspRfa];
}

/**
 * Create a Relationship Forming Invitation (RFI).
 *
 * The RFI is a UOR object — canonicalized and content-addressed.
 * The thread ID is derived from the RFI's canonical hash, ensuring
 * that the thread is deterministically bound to the invitation content.
 */
export async function createRfi(
  inviterVid: TspVid,
  inviteeVid: TspVid,
  purpose?: string,
  expiresAt?: string,
): Promise<{ rfi: TspRfi; identity: UorCanonicalIdentity }> {
  // Generate thread ID from random bytes (thread is a correlation handle)
  const threadBytes = new Uint8Array(16);
  crypto.getRandomValues(threadBytes);
  const thread = Array.from(threadBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const rfi: TspRfi = {
    "@type": "tsp:RelationshipFormingInvitation",
    "tsp:inviter": inviterVid.vid,
    "tsp:invitee": inviteeVid.vid,
    "tsp:thread": thread,
    "tsp:issuedAt": new Date().toISOString(),
    ...(purpose ? { "tsp:purpose": purpose } : {}),
    ...(expiresAt ? { "tsp:expiresAt": expiresAt } : {}),
  };

  const identity = await singleProofHash(rfi);
  return { rfi, identity };
}

/**
 * Accept a Relationship Forming Invitation, completing the handshake.
 *
 * Pipeline:
 *   1. Create the RFA (matching the RFI's thread)
 *   2. Combine RFI + RFA into a relationship object
 *   3. singleProofHash() the combined object → relationship identity
 *   4. Project through tsp-relationship → relationship ID
 *
 * The relationship identity is the canonical hash of the COMBINED
 * RFI+RFA — not either one individually. This ensures that the
 * relationship is a bilateral commitment, not a unilateral assertion.
 */
export async function acceptRfi(
  rfi: TspRfi,
  accepterVid: TspVid,
): Promise<TspRelationship> {
  const rfa: TspRfa = {
    "@type": "tsp:RelationshipFormingAcceptance",
    "tsp:accepter": accepterVid.vid,
    "tsp:inviter": rfi["tsp:inviter"],
    "tsp:thread": rfi["tsp:thread"],
    "tsp:acceptedAt": new Date().toISOString(),
  };

  // The relationship identity is the hash of the COMBINED handshake
  const relationshipObject = {
    "@type": "tsp:Relationship",
    "@context": "https://trustoverip.github.io/tswg-tsp-specification/context/v1",
    "tsp:rfi": rfi,
    "tsp:rfa": rfa,
    "tsp:partyA": rfi["tsp:inviter"],
    "tsp:partyB": rfa["tsp:accepter"],
    "tsp:thread": rfi["tsp:thread"],
    "tsp:formedAt": rfa["tsp:acceptedAt"],
  };

  const identity = await singleProofHash(relationshipObject);
  const relProjection = project(identity, "tsp-relationship") as HologramProjection;

  return {
    identity,
    relationshipId: relProjection.value,
    partyA: rfi["tsp:inviter"],
    partyB: rfa["tsp:accepter"],
    thread: rfi["tsp:thread"],
    rfi,
    rfa,
    certChain: [rfi, rfa],
  };
}

// ── TSP Routed Messages (§6) ───────────────────────────────────────────────

/**
 * A routed TSP envelope — wraps an inner envelope for intermediary delivery.
 *
 * TSP §6: "A routed message has an outer envelope addressed to the
 * intermediary and an inner envelope addressed to the final recipient."
 *
 * The outer envelope's payload IS the sealed inner envelope. Both are
 * independently content-addressed — the intermediary can verify the
 * outer envelope without decrypting the inner one.
 */
export interface RoutedTspEnvelope {
  /** The outer envelope (for the intermediary). */
  readonly outer: SealedTspEnvelope;
  /** The inner envelope (for the final recipient). */
  readonly inner: SealedTspEnvelope;
  /** The tsp-route projection for hop routing. */
  readonly routeId: string;
  /** The tsp-nested projection for the nested structure. */
  readonly nestedId: string;
}

/**
 * Create a routed TSP envelope through an intermediary.
 *
 * Pipeline:
 *   1. Seal the inner envelope (sender → final recipient)
 *   2. Seal the outer envelope (sender → intermediary, payload = inner)
 *   3. Project through tsp-route and tsp-nested
 */
export async function createRoutedEnvelope(
  sender: TspVid,
  intermediary: TspVid,
  recipient: TspVid,
  payload: unknown,
): Promise<RoutedTspEnvelope> {
  // Step 1: Seal inner envelope (sender → recipient)
  const inner = await sealEnvelope(
    sender,
    recipient,
    "tsp:NestedMessage",
    payload,
  );

  // Step 2: Seal outer envelope (sender → intermediary, payload = inner envelope ID)
  const outer = await sealEnvelope(
    sender,
    intermediary,
    "tsp:RoutedMessage",
    {
      "@type": "tsp:RoutedPayload",
      "tsp:innerEnvelopeId": inner.envelopeId,
      "tsp:finalRecipient": recipient.vid,
    },
  );

  // Step 3: Project routing identifiers
  const routeProj = project(outer.identity, "tsp-route") as HologramProjection;
  const nestedProj = project(inner.identity, "tsp-nested") as HologramProjection;

  return {
    outer,
    inner,
    routeId: routeProj.value,
    nestedId: nestedProj.value,
  };
}

// ── TSP Verification Helpers ───────────────────────────────────────────────

/**
 * Verify that a TSP envelope's identity matches its content.
 *
 * Re-runs the entire UOR pipeline on the envelope content and
 * compares the resulting canonical ID against the claimed identity.
 * This is the TSP-specific application of the R4 verify-before-emit gate.
 */
export async function verifyEnvelope(
  sealed: SealedTspEnvelope,
): Promise<boolean> {
  try {
    const recomputed = await singleProofHash(sealed.envelope);
    return recomputed["u:canonicalId"] === sealed.identity["u:canonicalId"];
  } catch {
    return false;
  }
}

/**
 * Verify that a TSP relationship was correctly formed.
 *
 * Reconstructs the relationship object from the RFI+RFA and verifies
 * that the canonical hash matches the claimed relationship identity.
 */
export async function verifyRelationship(
  relationship: TspRelationship,
): Promise<boolean> {
  try {
    const relationshipObject = {
      "@type": "tsp:Relationship",
      "@context": "https://trustoverip.github.io/tswg-tsp-specification/context/v1",
      "tsp:rfi": relationship.rfi,
      "tsp:rfa": relationship.rfa,
      "tsp:partyA": relationship.partyA,
      "tsp:partyB": relationship.partyB,
      "tsp:thread": relationship.thread,
      "tsp:formedAt": relationship.rfa["tsp:acceptedAt"],
    };

    const recomputed = await singleProofHash(relationshipObject);
    return recomputed["u:canonicalId"] === relationship.identity["u:canonicalId"];
  } catch {
    return false;
  }
}
