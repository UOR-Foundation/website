import { describe, it, expect, beforeAll } from "vitest";
import { generateKeypair } from "@/modules/uns/core/keypair";
import type { UnsKeypair } from "@/modules/uns/core/keypair";
import {
  UnsAuthServer,
  signChallenge,
  UnsAccessControl,
  trustMiddleware,
} from "@/modules/uns/trust";
import type { UnsSession } from "@/modules/uns/trust";

// @ts-ignore
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";

describe("UNS Trust — Zero Trust Authentication & Authorization", () => {
  let serverKp: UnsKeypair;
  let clientKp: UnsKeypair;
  let identityStore: Map<string, object>;
  let auth: UnsAuthServer;

  beforeAll(async () => {
    serverKp = await generateKeypair();
    clientKp = await generateKeypair();

    identityStore = new Map<string, object>();
    identityStore.set(clientKp.canonicalId, clientKp.publicKeyObject);

    auth = new UnsAuthServer(serverKp, identityStore);
  });

  // ── Authentication ──────────────────────────────────────────────────────

  it("1. issueChallenge returns 32-byte nonce and future expiresAt", async () => {
    const challenge = await auth.issueChallenge(clientKp.canonicalId);

    expect(challenge.challengeId).toBeTruthy();
    expect(challenge.nonce).toBeTruthy();
    // Decode nonce — should be 32 bytes
    const noncePadded = challenge.nonce.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(noncePadded);
    expect(decoded.length).toBe(32);
    // expiresAt in the future
    expect(new Date(challenge.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("2. verifyChallenge returns UnsSession for correct Dilithium-3 response", async () => {
    const challenge = await auth.issueChallenge(clientKp.canonicalId);
    const sig = await signChallenge(challenge, clientKp);
    const session = await auth.verifyChallenge(challenge.challengeId, sig);

    expect(session).not.toBeNull();
    expect(session!.identityCanonicalId).toBe(clientKp.canonicalId);
    expect(session!.sessionId).toBeTruthy();
    expect(session!["cert:signature"]["cert:algorithm"]).toBe("CRYSTALS-Dilithium-3");
  });

  it("3. verifyChallenge returns null for wrong signature", async () => {
    const challenge = await auth.issueChallenge(clientKp.canonicalId);
    const badSig = new Uint8Array(4627).fill(42); // wrong signature
    const session = await auth.verifyChallenge(challenge.challengeId, badSig);
    expect(session).toBeNull();
  });

  it("4. verifySession returns true for fresh session, false for expired", async () => {
    const challenge = await auth.issueChallenge(clientKp.canonicalId);
    const sig = await signChallenge(challenge, clientKp);
    const session = await auth.verifyChallenge(challenge.challengeId, sig);
    expect(session).not.toBeNull();

    // Fresh session → true
    const valid = await auth.verifySession(session!);
    expect(valid).toBe(true);

    // Expired session → false
    const expired: UnsSession = {
      ...session!,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    const invalidExpired = await auth.verifySession(expired);
    expect(invalidExpired).toBe(false);
  });

  // ── Access Control ────────────────────────────────────────────────────────

  const RESOURCE_ID = "urn:uor:derivation:sha256:abcd1234";

  it("5. definePolicy returns content-addressed, Dilithium-3 signed policy", async () => {
    const ac = new UnsAccessControl();
    const policy = await ac.definePolicy(
      {
        "@type": "uns:AccessPolicy",
        "uns:resource": RESOURCE_ID,
        "uns:rules": [
          {
            "uns:principal": clientKp.canonicalId,
            "uns:action": ["read", "write"],
          },
        ],
        "uns:defaultAction": "deny",
        "uns:validFrom": new Date(Date.now() - 60_000).toISOString(),
        "uns:validUntil": new Date(Date.now() + 3_600_000).toISOString(),
      },
      serverKp
    );

    expect(policy["u:canonicalId"]).toBeTruthy();
    expect(policy["cert:signature"]["cert:algorithm"]).toBe("CRYSTALS-Dilithium-3");
  });

  it("6. evaluate returns allowed:true for principal with matching action", async () => {
    const ac = new UnsAccessControl();
    await ac.definePolicy(
      {
        "@type": "uns:AccessPolicy",
        "uns:resource": RESOURCE_ID,
        "uns:rules": [
          { "uns:principal": clientKp.canonicalId, "uns:action": ["read"] },
        ],
        "uns:defaultAction": "deny",
        "uns:validFrom": new Date(Date.now() - 60_000).toISOString(),
        "uns:validUntil": new Date(Date.now() + 3_600_000).toISOString(),
      },
      serverKp
    );

    const challenge = await auth.issueChallenge(clientKp.canonicalId);
    const sig = await signChallenge(challenge, clientKp);
    const session = (await auth.verifyChallenge(challenge.challengeId, sig))!;

    const result = await ac.evaluate(session, RESOURCE_ID, "read");
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("rule-matched");
  });

  it("7. evaluate returns allowed:false for principal without permission", async () => {
    const ac = new UnsAccessControl();
    await ac.definePolicy(
      {
        "@type": "uns:AccessPolicy",
        "uns:resource": RESOURCE_ID,
        "uns:rules": [
          { "uns:principal": clientKp.canonicalId, "uns:action": ["read"] },
        ],
        "uns:defaultAction": "deny",
        "uns:validFrom": new Date(Date.now() - 60_000).toISOString(),
        "uns:validUntil": new Date(Date.now() + 3_600_000).toISOString(),
      },
      serverKp
    );

    const challenge = await auth.issueChallenge(clientKp.canonicalId);
    const sig = await signChallenge(challenge, clientKp);
    const session = (await auth.verifyChallenge(challenge.challengeId, sig))!;

    const result = await ac.evaluate(session, RESOURCE_ID, "write");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("default-deny");
  });

  it("8. evaluate returns allowed:false for expired session", async () => {
    const ac = new UnsAccessControl();
    await ac.definePolicy(
      {
        "@type": "uns:AccessPolicy",
        "uns:resource": RESOURCE_ID,
        "uns:rules": [
          { "uns:principal": "*", "uns:action": ["read"] },
        ],
        "uns:defaultAction": "deny",
        "uns:validFrom": new Date(Date.now() - 60_000).toISOString(),
        "uns:validUntil": new Date(Date.now() + 3_600_000).toISOString(),
      },
      serverKp
    );

    const expiredSession: UnsSession = {
      sessionId: "expired",
      identityCanonicalId: clientKp.canonicalId,
      issuedAt: new Date(Date.now() - 7_200_000).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      "cert:signature": {
        "@type": "cert:Signature",
        "cert:algorithm": "CRYSTALS-Dilithium-3",
        "cert:signatureBytes": "",
        "cert:signerCanonicalId": serverKp.canonicalId,
        "cert:signedAt": new Date().toISOString(),
      },
    };

    const result = await ac.evaluate(expiredSession, RESOURCE_ID, "read");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("session-expired");
  });

  it("9. evaluate returns allowed:false for expired policy (validUntil past)", async () => {
    const ac = new UnsAccessControl();
    await ac.definePolicy(
      {
        "@type": "uns:AccessPolicy",
        "uns:resource": "urn:expired-resource",
        "uns:rules": [
          { "uns:principal": "*", "uns:action": ["read"] },
        ],
        "uns:defaultAction": "allow",
        "uns:validFrom": new Date(Date.now() - 7_200_000).toISOString(),
        "uns:validUntil": new Date(Date.now() - 1000).toISOString(), // past
      },
      serverKp
    );

    const challenge = await auth.issueChallenge(clientKp.canonicalId);
    const sig = await signChallenge(challenge, clientKp);
    const session = (await auth.verifyChallenge(challenge.challengeId, sig))!;

    const result = await ac.evaluate(session, "urn:expired-resource", "read");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("policy-expired");
  });

  // ── Middleware ─────────────────────────────────────────────────────────────

  it("10. trustMiddleware rejects request with no session → 401", async () => {
    const ac = new UnsAccessControl();
    const mw = trustMiddleware(auth, ac, RESOURCE_ID, "read");

    const result = await mw(
      { headers: {} },
      async () => ({ status: 200 })
    );

    expect(result.status).toBe(401);
  });

  it("11. trustMiddleware allows request with valid session + permission", async () => {
    const ac = new UnsAccessControl();
    await ac.definePolicy(
      {
        "@type": "uns:AccessPolicy",
        "uns:resource": RESOURCE_ID,
        "uns:rules": [
          { "uns:principal": clientKp.canonicalId, "uns:action": ["read"] },
        ],
        "uns:defaultAction": "deny",
        "uns:validFrom": new Date(Date.now() - 60_000).toISOString(),
        "uns:validUntil": new Date(Date.now() + 3_600_000).toISOString(),
      },
      serverKp
    );

    const challenge = await auth.issueChallenge(clientKp.canonicalId);
    const sig = await signChallenge(challenge, clientKp);
    const session = (await auth.verifyChallenge(challenge.challengeId, sig))!;

    const mw = trustMiddleware(auth, ac, RESOURCE_ID, "read");
    const result = await mw(
      { headers: { "x-uns-session": JSON.stringify(session) } },
      async () => ({ status: 200, body: { ok: true } })
    );

    expect(result.status).toBe(200);
  });

  it("12. Tampered UnsSession (field modified) fails verifySession", async () => {
    const challenge = await auth.issueChallenge(clientKp.canonicalId);
    const sig = await signChallenge(challenge, clientKp);
    const session = (await auth.verifyChallenge(challenge.challengeId, sig))!;

    // Tamper: change the identity
    const tampered: UnsSession = {
      ...session,
      identityCanonicalId: "urn:uor:derivation:sha256:tampered",
    };

    const valid = await auth.verifySession(tampered);
    expect(valid).toBe(false);
  });
});
