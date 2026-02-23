/**
 * UNS Agent Gateway — Morphism-Typed AI Agent Routing (Phase 5-A)
 *
 * All agent-to-agent messages are typed as UOR morphisms:
 *   Transform  — arbitrary structure-changing (most permissive)
 *   Isometry   — structure-preserving (skill sharing)
 *   Embedding  — injective, structure-preserving
 *   Action     — side-effect-inducing (most restricted, requires session)
 *
 * Injection detection via derivation trace Hamming drift.
 * Agent identity is a canonical ID. No impersonation possible.
 *
 * @see morphism: namespace — UOR Framework
 * @see trace: namespace — derivation trace discontinuity detection
 */

import { singleProofHash } from "../core/identity";
import { canonicalizeToNQuads } from "../core/canonicalize";
import { signRecord, verifyRecord, registerPublicKey } from "../core/keypair";
import type { UnsKeypair, SignatureBlock, SignedRecord, PublicKeyObject } from "../core/keypair";
import { buildDerivationTrace, detectInjection } from "../shield/derivation-trace";
import type { DerivationTrace } from "../shield/derivation-trace";

// ── Types ───────────────────────────────────────────────────────────────────

export type MorphismType =
  | "morphism:Transform"
  | "morphism:Isometry"
  | "morphism:Embedding"
  | "morphism:Action";

export interface AgentMessage {
  "@type": MorphismType;
  "morphism:from": string;
  "morphism:to": string;
  "morphism:payload": unknown;
  "morphism:messageCanonicalId": string;
  "cert:signature": SignatureBlock;
}

export interface AgentRegistration {
  canonicalId: string;
  publicKey: PublicKeyObject;
  model?: string;
  baselineDrift: number;
  messageCount: number;
}

export interface RouteResult {
  delivered: boolean;
  injectionDetected: boolean;
  traceCanonicalId: string;
  reason?: string;
}

export interface InjectionAlert {
  messageCanonicalId: string;
  senderCanonicalId: string;
  drift: number;
  threshold: number;
  detectedAt: string;
}

// ── Gateway ─────────────────────────────────────────────────────────────────

const BASELINE_WINDOW = 100;
const DRIFT_MULTIPLIER = 3;

export class UnsAgentGateway {
  private agents = new Map<string, AgentRegistration>();
  private history = new Map<string, AgentMessage[]>();
  private alerts: InjectionAlert[] = [];
  private driftAccumulator = new Map<string, number[]>();
  private activeSessions = new Set<string>(); // canonical IDs with active trust sessions

  /** Grant an agent a trust session (for morphism:Action routing). */
  grantSession(agentCanonicalId: string): void {
    this.activeSessions.add(agentCanonicalId);
  }

  /** Register an agent by its IdentityObject. */
  async register(identityObject: PublicKeyObject): Promise<AgentRegistration> {
    const identity = await singleProofHash(identityObject);
    const canonicalId = identity["u:canonicalId"];

    // Register public key for signature verification
    registerPublicKey(canonicalId, identityObject);

    const reg: AgentRegistration = {
      canonicalId,
      publicKey: identityObject,
      baselineDrift: 0,
      messageCount: 0,
    };

    this.agents.set(canonicalId, reg);
    this.history.set(canonicalId, []);
    this.driftAccumulator.set(canonicalId, []);
    return reg;
  }

  /**
   * Route a message: verify → type-check → injection-scan → deliver/quarantine.
   */
  async route(message: AgentMessage): Promise<RouteResult> {
    const senderId = message["morphism:from"];

    // Build trace canonical ID from message content
    const traceObj = {
      "@type": "trace:AgentRoute",
      "morphism:from": senderId,
      "morphism:to": message["morphism:to"],
      "morphism:messageCanonicalId": message["morphism:messageCanonicalId"],
      timestamp: new Date().toISOString(),
    };
    const traceIdentity = await singleProofHash(traceObj);
    const traceCanonicalId = traceIdentity["u:canonicalId"];

    // 1. Verify Dilithium-3 signature
    const sigValid = await verifyRecord(message as unknown as SignedRecord<object>);
    if (!sigValid) {
      return {
        delivered: false,
        injectionDetected: false,
        traceCanonicalId,
        reason: "invalid-signature",
      };
    }

    // 2. Morphism type constraint enforcement
    if (message["@type"] === "morphism:Action") {
      if (!this.activeSessions.has(senderId)) {
        return {
          delivered: false,
          injectionDetected: false,
          traceCanonicalId,
          reason: "morphism:Action requires active session",
        };
      }
    }

    // 3. Injection detection via derivation trace
    const payloadBytes = new TextEncoder().encode(
      JSON.stringify(message["morphism:payload"])
    );
    const trace = buildDerivationTrace(payloadBytes, ["neg", "bnot"]);
    const injectionDetected = this.analyzeInjection(senderId, trace, message);

    if (injectionDetected) {
      const reg = this.agents.get(senderId);
      const threshold = (reg?.baselineDrift || trace.meanDrift) * DRIFT_MULTIPLIER;
      this.alerts.push({
        messageCanonicalId: message["morphism:messageCanonicalId"],
        senderCanonicalId: senderId,
        drift: trace.maxDrift,
        threshold,
        detectedAt: new Date().toISOString(),
      });

      return {
        delivered: false,
        injectionDetected: true,
        traceCanonicalId,
        reason: "injection-detected: Hamming drift exceeded threshold",
      };
    }

    // 4. Deliver — store in history
    const senderHistory = this.history.get(senderId) || [];
    senderHistory.push(message);
    this.history.set(senderId, senderHistory);

    // Update registration
    const reg = this.agents.get(senderId);
    if (reg) {
      reg.messageCount++;
    }

    return { delivered: true, injectionDetected: false, traceCanonicalId };
  }

  /** Get agent message history. */
  async getHistory(agentCanonicalId: string, limit = 100): Promise<AgentMessage[]> {
    const msgs = this.history.get(agentCanonicalId) || [];
    return msgs.slice(-limit);
  }

  /** Get injection alerts. */
  async getAlerts(): Promise<InjectionAlert[]> {
    return [...this.alerts];
  }

  // ── Private ─────────────────────────────────────────────────────────────

  /**
   * Analyze injection via Hamming drift.
   * Accumulates baseline over first BASELINE_WINDOW messages,
   * then flags if maxDrift > 3× baseline.
   */
  private analyzeInjection(
    senderId: string,
    trace: DerivationTrace,
    message: AgentMessage
  ): boolean {
    if (trace.hammingDrift.length === 0) return false;

    const drifts = this.driftAccumulator.get(senderId) || [];
    const reg = this.agents.get(senderId);

    if (drifts.length < BASELINE_WINDOW) {
      // Accumulating baseline — don't flag, just collect
      drifts.push(trace.meanDrift);
      this.driftAccumulator.set(senderId, drifts);

      // Once we hit the window, compute baseline
      if (drifts.length === BASELINE_WINDOW && reg) {
        reg.baselineDrift =
          drifts.reduce((s, d) => s + d, 0) / drifts.length;
      }
      return false;
    }

    // Baseline established — detect injection
    const baseline = reg?.baselineDrift || 0;
    if (baseline <= 0) return false;
    return detectInjection(trace, baseline);
  }
}

// ── Message Builder Helper ──────────────────────────────────────────────────

/**
 * Build and sign an agent message.
 */
export async function buildAgentMessage(
  type: MorphismType,
  from: UnsKeypair,
  to: string,
  payload: unknown
): Promise<AgentMessage> {
  const msgBody = {
    "@type": type,
    "morphism:from": from.canonicalId,
    "morphism:to": to,
    "morphism:payload": payload,
  };

  const identity = await singleProofHash(msgBody);
  const withId = {
    ...msgBody,
    "morphism:messageCanonicalId": identity["u:canonicalId"],
  };

  const signed = await signRecord(withId, from);
  return signed as unknown as AgentMessage;
}
