/**
 * UNS Trust — Content-Addressed Access Control (Phase 4-A)
 *
 * AccessPolicy is a content-addressed UNS Record signed by Dilithium-3.
 * Policy tampering is cryptographically detectable.
 * No CA. No RBAC database. The policy IS its canonical ID.
 */

import { singleProofHash } from "../core/identity";
import { signRecord } from "../core/keypair";
import type { UnsKeypair, SignatureBlock } from "../core/keypair";
import type { UnsSession, UnsAuthServer } from "./auth";

// ── Types ───────────────────────────────────────────────────────────────────

export interface UnsAccessRule {
  "uns:principal": string; // canonical ID or '*'
  "uns:action": string[]; // ['read'] | ['write'] | ['read','write'] | ['admin']
  "uns:condition"?: {
    "uns:requireSessionNotExpired": boolean;
    "uns:requireMinPartitionDensity"?: number;
  };
}

export interface UnsAccessPolicy {
  "@type": "uns:AccessPolicy";
  "uns:resource": string;
  "uns:rules": UnsAccessRule[];
  "uns:defaultAction": "allow" | "deny";
  "uns:validFrom": string;
  "uns:validUntil": string;
  "cert:signature": SignatureBlock;
  "u:canonicalId"?: string;
}

export interface EvaluationResult {
  allowed: boolean;
  reason: string;
  policyCanonicalId?: string;
}

// ── Access Control ──────────────────────────────────────────────────────────

export class UnsAccessControl {
  private policies = new Map<string, UnsAccessPolicy>(); // resource → policy

  /** Define and sign an access policy. Returns the content-addressed policy. */
  async definePolicy(
    policy: Omit<UnsAccessPolicy, "cert:signature" | "u:canonicalId">,
    signer: UnsKeypair
  ): Promise<UnsAccessPolicy> {
    const signed = await signRecord(policy, signer);
    const identity = await singleProofHash(policy);
    const result: UnsAccessPolicy = {
      ...signed,
      "u:canonicalId": identity["u:canonicalId"],
    };
    this.policies.set(policy["uns:resource"], result);
    return result;
  }

  /** Evaluate whether a session is allowed to perform an action on a resource. */
  async evaluate(
    session: UnsSession,
    resourceCanonicalId: string,
    action: string
  ): Promise<EvaluationResult> {
    const policy = this.policies.get(resourceCanonicalId);
    if (!policy) {
      return { allowed: false, reason: "no-policy-found" };
    }

    // Check policy validity window
    const now = new Date();
    if (new Date(policy["uns:validFrom"]) > now) {
      return {
        allowed: false,
        reason: "policy-not-yet-valid",
        policyCanonicalId: policy["u:canonicalId"],
      };
    }
    if (new Date(policy["uns:validUntil"]) < now) {
      return {
        allowed: false,
        reason: "policy-expired",
        policyCanonicalId: policy["u:canonicalId"],
      };
    }

    // Check session expiry
    if (new Date(session.expiresAt) < now) {
      return {
        allowed: false,
        reason: "session-expired",
        policyCanonicalId: policy["u:canonicalId"],
      };
    }

    // Evaluate rules
    for (const rule of policy["uns:rules"]) {
      const principalMatch =
        rule["uns:principal"] === "*" ||
        rule["uns:principal"] === session.identityCanonicalId;

      if (!principalMatch) continue;

      const actionMatch = rule["uns:action"].includes(action);
      if (!actionMatch) continue;

      // Check conditions
      if (rule["uns:condition"]?.["uns:requireSessionNotExpired"]) {
        if (new Date(session.expiresAt) < now) {
          continue; // condition not met, try next rule
        }
      }

      return {
        allowed: true,
        reason: "rule-matched",
        policyCanonicalId: policy["u:canonicalId"],
      };
    }

    // No rule matched — fall through to default
    const allowed = policy["uns:defaultAction"] === "allow";
    return {
      allowed,
      reason: allowed ? "default-allow" : "default-deny",
      policyCanonicalId: policy["u:canonicalId"],
    };
  }
}

// ── Trust Middleware (conceptual — typed for Hono-style handler) ─────────────

export type MiddlewareHandler = (
  req: { headers: Record<string, string>; body?: unknown },
  next: () => Promise<unknown>
) => Promise<{ status: number; body?: unknown }>;

export function trustMiddleware(
  auth: UnsAuthServer,
  ac: UnsAccessControl,
  resource: string,
  action: string
): MiddlewareHandler {
  return async (req, next) => {
    // Extract session from header
    const sessionHeader = req.headers["x-uns-session"];
    if (!sessionHeader) {
      return { status: 401, body: { error: "no-session" } };
    }

    let session: UnsSession;
    try {
      session = JSON.parse(sessionHeader);
    } catch {
      return { status: 401, body: { error: "invalid-session" } };
    }

    // Verify session signature + expiry
    const valid = await auth.verifySession(session);
    if (!valid) {
      return { status: 401, body: { error: "session-invalid" } };
    }

    // Evaluate access
    const result = await ac.evaluate(session, resource, action);
    if (!result.allowed) {
      return { status: 403, body: { error: result.reason } };
    }

    return (await next()) as { status: number; body?: unknown };
  };
}
