/**
 * UNS Trust — Zero Trust Authentication (Phase 4-A)
 *
 * Challenge-response authentication using Dilithium-3.
 * No CA. No certificate chain. The ring arithmetic is the CA.
 *
 * Protocol:
 *   1. Client sends identityCanonicalId
 *   2. Server issues nonce + challengeId
 *   3. Client signs SHA-256(nonce || identityCanonicalId)
 *   4. Server verifies via public key lookup → issues UnsSession
 *   5. Session is Dilithium-3 signed — tamper-evident
 */

import { singleProofHash } from "../core/identity";
import { sha256 } from "../core/address";
import type { UnsKeypair, SignatureBlock } from "../core/keypair";
// @ts-ignore — noble/post-quantum uses .js exports
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";

// ── Types ───────────────────────────────────────────────────────────────────

export interface UnsChallenge {
  challengeId: string;
  nonce: string; // base64url
  expiresAt: string; // ISO
  identityCanonicalId: string;
}

export interface UnsSession {
  sessionId: string;
  identityCanonicalId: string;
  issuedAt: string;
  expiresAt: string;
  "cert:signature": SignatureBlock;
  /** P22: Epistemic grade — 'A' for Dilithium-3 authenticated sessions. */
  epistemic_grade: "A";
  epistemic_grade_label: string;
  "derivation:derivationId": string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

/** Compute challenge bytes: SHA-256(nonce || identityCanonicalId as UTF-8). */
async function computeChallengeBytes(
  nonceB64: string,
  identityCanonicalId: string
): Promise<Uint8Array> {
  const nonce = fromBase64url(nonceB64);
  const idBytes = new TextEncoder().encode(identityCanonicalId);
  const combined = new Uint8Array(nonce.length + idBytes.length);
  combined.set(nonce);
  combined.set(idBytes, nonce.length);
  return sha256(combined);
}

// ── Auth Server ─────────────────────────────────────────────────────────────

const DEFAULT_CHALLENGE_TTL_MS = 5 * 60_000; // 5 minutes
const DEFAULT_SESSION_TTL_MS = 60 * 60_000; // 1 hour

export class UnsAuthServer {
  private serverKeypair: UnsKeypair;
  private identityStore: Map<string, object>;
  private challenges = new Map<string, UnsChallenge>();

  constructor(serverKeypair: UnsKeypair, identityStore: Map<string, object>) {
    this.serverKeypair = serverKeypair;
    this.identityStore = identityStore;
  }

  /** Step 1: Issue a challenge for the given identity. */
  async issueChallenge(identityCanonicalId: string): Promise<UnsChallenge> {
    const nonce = toBase64url(randomBytes(32));
    const idObj = { nonce, identityCanonicalId, t: Date.now() };
    const identity = await singleProofHash(idObj);
    const challengeId = identity["u:canonicalId"];

    const challenge: UnsChallenge = {
      challengeId,
      nonce,
      expiresAt: new Date(Date.now() + DEFAULT_CHALLENGE_TTL_MS).toISOString(),
      identityCanonicalId,
    };

    this.challenges.set(challengeId, challenge);
    return challenge;
  }

  /** Step 2: Verify a signed challenge response → issue session or null. */
  async verifyChallenge(
    challengeId: string,
    signatureBytes: Uint8Array
  ): Promise<UnsSession | null> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return null;

    // Expired?
    if (new Date(challenge.expiresAt) < new Date()) {
      this.challenges.delete(challengeId);
      return null;
    }

    // Look up identity's public key
    const keyObj = this.identityStore.get(challenge.identityCanonicalId) as
      | { "cert:keyBytes": string }
      | undefined;
    if (!keyObj) return null;

    // Recompute challenge bytes
    const challengeBytes = await computeChallengeBytes(
      challenge.nonce,
      challenge.identityCanonicalId
    );

    // Verify Dilithium-3 signature
    const publicKeyBytes = fromBase64url(keyObj["cert:keyBytes"]);
    try {
      const valid = ml_dsa65.verify(signatureBytes, challengeBytes, publicKeyBytes);
      if (!valid) return null;
    } catch {
      return null;
    }

    // Consume challenge (one-time use)
    this.challenges.delete(challengeId);

    // Issue session
    return this.createSession(challenge.identityCanonicalId);
  }

  /** Verify a session is valid: signature intact + not expired. */
  async verifySession(session: UnsSession): Promise<boolean> {
    // Check expiry
    if (new Date(session.expiresAt) < new Date()) return false;

    // Verify server signature on session
    const sessionPayload = {
      sessionId: session.sessionId,
      identityCanonicalId: session.identityCanonicalId,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
    };

    const identity = await singleProofHash(sessionPayload);
    const canonicalBytes = new TextEncoder().encode(identity["u:canonicalId"]);

    try {
      const sigBytes = fromBase64url(session["cert:signature"]["cert:signatureBytes"]);
      return ml_dsa65.verify(
        sigBytes,
        canonicalBytes,
        this.serverKeypair.publicKeyBytes
      );
    } catch {
      return false;
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private async createSession(identityCanonicalId: string): Promise<UnsSession> {
    const now = new Date();
    const sessionPayload = {
      sessionId: bytesToHex(randomBytes(16)),
      identityCanonicalId,
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + DEFAULT_SESSION_TTL_MS).toISOString(),
    };

    // Sign the session with the server's key
    const identity = await singleProofHash(sessionPayload);
    const canonicalBytes = new TextEncoder().encode(identity["u:canonicalId"]);
    const sig = ml_dsa65.sign(canonicalBytes, this.serverKeypair.privateKeyBytes);

    return {
      ...sessionPayload,
      "cert:signature": {
        "@type": "cert:Signature",
        "cert:algorithm": "CRYSTALS-Dilithium-3",
        "cert:signatureBytes": toBase64url(sig),
        "cert:signerCanonicalId": this.serverKeypair.canonicalId,
        "cert:signedAt": now.toISOString(),
      },
      // P22: Dilithium-3 authenticated session is Grade A
      epistemic_grade: "A",
      epistemic_grade_label: "Algebraically Proven — ring-arithmetic with derivation:derivationId",
      "derivation:derivationId": identity["u:canonicalId"],
    };
  }
}

// ── Utility ─────────────────────────────────────────────────────────────────

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** Sign challenge bytes with a client keypair — used by authenticating clients. */
export async function signChallenge(
  challenge: UnsChallenge,
  clientKeypair: UnsKeypair
): Promise<Uint8Array> {
  const challengeBytes = await computeChallengeBytes(
    challenge.nonce,
    challenge.identityCanonicalId
  );
  return ml_dsa65.sign(challengeBytes, clientKeypair.privateKeyBytes);
}
