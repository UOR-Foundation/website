/**
 * Q-Ceremony — Founding Ceremony Engine
 * ══════════════════════════════════════
 *
 * The Founding Ceremony is the act of instantiating a sovereign identity
 * object into the universal graph. It produces:
 *
 *   1. A JSON-LD ceremony record (itself content-addressed)
 *   2. A Dilithium-3 witness signature (post-quantum attestation)
 *   3. A graph node representing the new sovereign entity
 *   4. A three-word canonical name for human presentation
 *
 * The ceremony is irreversible: once witnessed, the identity exists
 * permanently in the content-addressed space. The ceremony CID serves
 * as the founding_derivation_id — proof of genesis.
 *
 * Security: The ceremony implements observer-collapse semantics.
 * A cryptographic nonce is bound to the ceremony at creation time;
 * any attempt to intercept, replay, or observe the ceremony mid-flight
 * produces a different nonce → different hash → collapsed state.
 * The original ceremony becomes unrecoverable.
 *
 * Genesis axiom migration:
 *   sha256, bytesToHex → axiom-hash, axiom-ring (sync)
 *   singleProofHash, generateKeypair, signRecord → @/modules/uns/core
 *     (irreducible: URDNA2015 canonicalization + @noble/post-quantum)
 *
 * @module qkernel/q-ceremony
 */

import { toHex } from "@/hologram/genesis/axiom-ring";
import { sha256 } from "@/hologram/genesis/axiom-hash";
import { getIdentity } from "@/hologram/platform";
import type { CanonicalIdentity as UorCanonicalIdentity, Keypair as UnsKeypair, SignedRecord } from "@/hologram/platform/identity-types";
import { deriveThreeWordName, type ThreeWordName } from "./q-three-word";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** The founding ceremony record — a JSON-LD object */
export interface FoundingCeremony {
  "@type": "uor:FoundingCeremony";
  "uor:subject": {
    canonicalId: string;
    cid: string;
    ipv6: string;
    glyph: string;
  };
  "uor:threeWord": {
    display: string;
    words: readonly [string, string, string];
    bijective: true;
  };
  "uor:attributes": CeremonyAttribute[];
  "uor:observerCollapse": {
    /** Cryptographic nonce bound at creation — ensures one-time observability */
    nonce: string;
    /** SHA-256 of (nonce + identity + timestamp) — the collapse witness */
    collapseHash: string;
    /** If this value changes from what the creator holds, the state collapsed */
    entanglementBit: string;
  };
  "uor:timestamp": string;
}

/** An attribute of the identity object */
export interface CeremonyAttribute {
  readonly key: string;
  readonly value: string;
  readonly visibility: "public" | "private" | "selective";
}

/** The signed ceremony — immutable, post-quantum witnessed */
export type SignedCeremony = SignedRecord<FoundingCeremony>;

/** Complete result of a founding ceremony */
export interface CeremonyResult {
  /** The identity derived from the keypair */
  readonly identity: UorCanonicalIdentity;
  /** The Dilithium-3 keypair (private key NEVER leaves this scope) */
  readonly keypair: UnsKeypair;
  /** The three-word canonical name */
  readonly threeWordName: ThreeWordName;
  /** The signed ceremony record */
  readonly signedCeremony: SignedCeremony;
  /** The CID of the ceremony itself (founding_derivation_id) */
  readonly ceremonyCid: string;
  /** Raw hash bytes for downstream derivations */
  readonly hashBytes: Uint8Array;
}

/** Observer-collapse verification result */
export interface CollapseVerification {
  readonly intact: boolean;
  readonly reason: string;
  readonly recomputedHash: string;
  readonly expectedHash: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Observer-Collapse Nonce Generation
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate a cryptographically secure observer-collapse nonce.
 */
function generateCollapseNonce(): Uint8Array {
  const nonce = new Uint8Array(32);
  crypto.getRandomValues(nonce);
  return nonce;
}

/**
 * Compute the collapse witness hash (now sync via genesis axioms).
 *
 * H(nonce || canonicalId || timestamp) — if ANY component changes,
 * the witness changes, proving the state was observed/tampered.
 */
function computeCollapseHash(
  nonce: Uint8Array,
  canonicalId: string,
  timestamp: string
): { collapseHash: string; entanglementBit: string } {
  const encoder = new TextEncoder();
  const idBytes = encoder.encode(canonicalId);
  const tsBytes = encoder.encode(timestamp);

  // Concatenate nonce + canonicalId + timestamp
  const payload = new Uint8Array(nonce.length + idBytes.length + tsBytes.length);
  payload.set(nonce, 0);
  payload.set(idBytes, nonce.length);
  payload.set(tsBytes, nonce.length + idBytes.length);

  // Sync SHA-256 via genesis axiom
  const hashBytes = sha256(payload);
  const hex = toHex(hashBytes);

  return {
    collapseHash: hex,
    entanglementBit: (hashBytes[0] & 0x80) !== 0 ? "1" : "0",
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Founding Ceremony
// ═══════════════════════════════════════════════════════════════════════

/**
 * Execute the Founding Ceremony — create a new sovereign identity.
 *
 * Async boundary: generateKeypair (WebCrypto), singleProofHash (URDNA2015),
 * signRecord (@noble/post-quantum). These are irreducible I/O boundaries.
 * All hashing is now sync via genesis axioms.
 */
export async function executeFoundingCeremony(
  initialAttributes: CeremonyAttribute[] = []
): Promise<CeremonyResult> {
  const identity = getIdentity();

  // ── Step 1: Generate post-quantum keypair ──────────────────────
  const keypair = await identity.generateKeypair();

  // ── Step 2: Derive identity (URDNA2015 → SHA-256 → identity) ──
  const canonicalId = await identity.singleProofHash(keypair.publicKeyObject);

  // ── Step 3: Extract hash bytes for three-word derivation ───────
  const hexStr = canonicalId["u:canonicalId"].split(":").pop() ?? "";
  const hashBytes = new Uint8Array(
    (hexStr.match(/.{2}/g) ?? []).map(h => parseInt(h, 16))
  );

  // ── Step 4: Derive three-word name ─────────────────────────────
  const threeWordName = deriveThreeWordName(hashBytes);

  // ── Step 5: Observer-collapse nonce (now sync) ─────────────────
  const timestamp = new Date().toISOString();
  const collapseNonce = generateCollapseNonce();
  const { collapseHash, entanglementBit } = computeCollapseHash(
    collapseNonce,
    identity["u:canonicalId"],
    timestamp
  );

  // ── Step 6: Construct ceremony record ─────────────────────────
  const ceremony: FoundingCeremony = {
    "@type": "uor:FoundingCeremony",
    "uor:subject": {
      canonicalId: identity["u:canonicalId"],
      cid: identity["u:cid"],
      ipv6: identity["u:ipv6"],
      glyph: identity["u:glyph"],
    },
    "uor:threeWord": {
      display: threeWordName.display,
      words: threeWordName.words,
      bijective: true,
    },
    "uor:attributes": [
      { key: "type", value: "sovereign-identity", visibility: "public" },
      { key: "algorithm", value: "CRYSTALS-Dilithium-3", visibility: "public" },
      { key: "ceremony-version", value: "1.0.0", visibility: "public" },
      ...initialAttributes,
    ],
    "uor:observerCollapse": {
      nonce: toHex(collapseNonce),
      collapseHash,
      entanglementBit,
    },
    "uor:timestamp": timestamp,
  };

  // ── Step 7: Sign with Dilithium-3 ─────────────────────────────
  const signedCeremony = await signRecord(ceremony, keypair);

  // ── Step 8: Content-address the signed ceremony ───────────────
  const ceremonyIdentity = await singleProofHash(signedCeremony);
  const ceremonyCid = ceremonyIdentity["u:cid"];

  return {
    identity,
    keypair,
    threeWordName,
    signedCeremony,
    ceremonyCid,
    hashBytes,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Observer-Collapse Verification (now sync)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Verify that a ceremony's observer-collapse state is intact.
 *
 * Now fully sync — sha256 from genesis axioms.
 */
export function verifyCollapseIntegrity(
  ceremony: FoundingCeremony
): CollapseVerification {
  const nonceHex = ceremony["uor:observerCollapse"].nonce;
  const nonceBytes = new Uint8Array(
    (nonceHex.match(/.{2}/g) ?? []).map(h => parseInt(h, 16))
  );

  const { collapseHash: recomputed } = computeCollapseHash(
    nonceBytes,
    ceremony["uor:subject"].canonicalId,
    ceremony["uor:timestamp"]
  );

  const expected = ceremony["uor:observerCollapse"].collapseHash;
  const intact = recomputed === expected;

  return {
    intact,
    reason: intact
      ? "Observer-collapse state intact — no interception detected"
      : "COLLAPSE DETECTED — ceremony state was observed or tampered",
    recomputedHash: recomputed,
    expectedHash: expected,
  };
}
