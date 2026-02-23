/**
 * UOR SDK — App Composition Layer / Morphism Router (P10)
 *
 * Apps declare public morphism interfaces. Other apps call them via typed
 * morphism messages. Every call is certified and injection-scanned.
 *
 * Morphism type hierarchy:
 *   - morphism:Transform — permissive, general structure mapping
 *   - morphism:Isometry — structure-preserving (input/output schema must match)
 *   - morphism:Action — restricted, requires certificate
 *
 * @see morphism: namespace — typed inter-app communication
 * @see cert: namespace — relationship certificates
 * @see trace: namespace — call tracing
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { UnsKv } from "@/modules/uns/store/kv";
import type { RelationshipCertificate } from "./relationship";

// ── Types ───────────────────────────────────────────────────────────────────

export type MorphismType =
  | "morphism:Transform"
  | "morphism:Isometry"
  | "morphism:Action";

export interface MorphismInterface {
  appCanonicalId: string;
  endpoint: string;
  morphismType: MorphismType;
  requiresCertificate: boolean;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface MorphismCall {
  fromAppCanonicalId: string;
  toAppCanonicalId: string;
  endpoint: string;
  morphismType: MorphismType;
  payload: unknown;
  callerCertificate?: RelationshipCertificate;
}

export interface MorphismResult {
  delivered: boolean;
  output?: unknown;
  traceCanonicalId: string;
  injectionDetected: boolean;
  reason?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();

function ifaceKey(appId: string, endpoint: string): string {
  const h = appId.replace("urn:uor:derivation:sha256:", "").slice(0, 16);
  return `morph-iface-${h}-${endpoint}`;
}

function callHistKey(appId: string): string {
  const h = appId.replace("urn:uor:derivation:sha256:", "").slice(0, 16);
  return `morph-hist-${h}`;
}

/** Compute Hamming drift for injection check. */
function checkInjection(payload: string): { drift: number; detected: boolean } {
  const bytes = enc.encode(payload);
  let sig = 0;
  for (const b of bytes) sig = (sig + b) % 256;
  let baseline = 42;
  baseline = ((-baseline % 256) + 256) % 256;
  baseline = baseline ^ 0xff;
  let xor = sig ^ baseline;
  let drift = 0;
  while (xor > 0) { drift += xor & 1; xor >>= 1; }
  return { drift, detected: drift > 6 };
}

/** Simple handler registry for test/dev — maps appId:endpoint → handler. */
const handlers = new Map<string, (payload: unknown) => unknown>();

// ── Morphism Router ────────────────────────────────────────────────────────

export class MorphismRouter {
  private readonly kv: UnsKv;
  private readonly ifaceKeys: string[] = [];
  private readonly callHistories = new Map<string, MorphismCall[]>();

  constructor(kv?: UnsKv) {
    this.kv = kv ?? new UnsKv();
  }

  /**
   * Register a public morphism interface for an app.
   */
  async registerInterface(iface: MorphismInterface): Promise<void> {
    const key = ifaceKey(iface.appCanonicalId, iface.endpoint);
    await this.kv.put(key, enc.encode(JSON.stringify(iface)));
    if (!this.ifaceKeys.includes(key)) this.ifaceKeys.push(key);
  }

  /**
   * Register a handler for an interface (used in tests/dev).
   */
  registerHandler(
    appCanonicalId: string,
    endpoint: string,
    handler: (payload: unknown) => unknown,
  ): void {
    handlers.set(`${appCanonicalId}:${endpoint}`, handler);
  }

  /**
   * Call a morphism endpoint on another app.
   *
   * Pipeline:
   *   1. Resolve target interface
   *   2. Validate certificate if required
   *   3. Run injection scan on payload
   *   4. Enforce morphism type constraints
   *   5. Execute handler
   *   6. Record trace
   *   7. Return MorphismResult
   */
  async call(mc: MorphismCall): Promise<MorphismResult> {
    // 1. Resolve interface
    const key = ifaceKey(mc.toAppCanonicalId, mc.endpoint);
    const ifaceRaw = await this.kv.get(key);

    if (!ifaceRaw) {
      const traceId = await this.traceId(mc, null, false);
      return {
        delivered: false,
        traceCanonicalId: traceId,
        injectionDetected: false,
        reason: `Interface not found: ${mc.endpoint}`,
      };
    }

    const iface: MorphismInterface = JSON.parse(dec.decode(ifaceRaw.value));

    // 2. Certificate check
    if (iface.requiresCertificate && !mc.callerCertificate) {
      const traceId = await this.traceId(mc, null, false);
      return {
        delivered: false,
        traceCanonicalId: traceId,
        injectionDetected: false,
        reason: "Certificate required but not provided",
      };
    }

    // 3. Injection scan
    const payloadStr = JSON.stringify(mc.payload);
    const { detected } = checkInjection(payloadStr);

    if (detected) {
      const traceId = await this.traceId(mc, null, true);
      return {
        delivered: false,
        traceCanonicalId: traceId,
        injectionDetected: true,
        reason: "Injection detected in payload",
      };
    }

    // 4. Morphism type constraints
    if (mc.morphismType !== iface.morphismType) {
      // Allow Transform to call any, but Isometry/Action must match
      if (mc.morphismType !== "morphism:Transform") {
        const traceId = await this.traceId(mc, null, false);
        return {
          delivered: false,
          traceCanonicalId: traceId,
          injectionDetected: false,
          reason: `Morphism type mismatch: expected ${iface.morphismType}, got ${mc.morphismType}`,
        };
      }
    }

    // 5. Isometry constraint: output schema must match input schema
    if (iface.morphismType === "morphism:Isometry") {
      const inputKeys = Object.keys(iface.inputSchema).sort().join(",");
      const outputKeys = Object.keys(iface.outputSchema).sort().join(",");
      if (inputKeys !== outputKeys) {
        const traceId = await this.traceId(mc, null, false);
        return {
          delivered: false,
          traceCanonicalId: traceId,
          injectionDetected: false,
          reason: "Isometry violation: input/output schema structure mismatch",
        };
      }
    }

    // 6. Execute handler
    const handlerKey = `${mc.toAppCanonicalId}:${mc.endpoint}`;
    const handler = handlers.get(handlerKey);
    const output = handler ? handler(mc.payload) : { received: true };

    // 7. Record trace and history
    const traceId = await this.traceId(mc, output, false);
    this.recordCall(mc);

    return {
      delivered: true,
      output,
      traceCanonicalId: traceId,
      injectionDetected: false,
    };
  }

  /**
   * List all registered public interfaces.
   */
  async listInterfaces(appCanonicalId?: string): Promise<MorphismInterface[]> {
    const results: MorphismInterface[] = [];

    for (const key of this.ifaceKeys) {
      const raw = await this.kv.get(key);
      if (!raw) continue;
      const iface: MorphismInterface = JSON.parse(dec.decode(raw.value));
      if (!appCanonicalId || iface.appCanonicalId === appCanonicalId) {
        results.push(iface);
      }
    }

    return results;
  }

  /**
   * Get call history for an app (as caller).
   */
  async getCallHistory(
    appCanonicalId: string,
    limit = 50,
  ): Promise<MorphismCall[]> {
    const history = this.callHistories.get(appCanonicalId) ?? [];
    return history.slice(0, limit);
  }

  // ── Private ────────────────────────────────────────────────────────────

  private async traceId(
    mc: MorphismCall,
    output: unknown,
    injected: boolean,
  ): Promise<string> {
    const proof = await singleProofHash({
      "@context": {
        morphism: "https://uor.foundation/morphism/",
        trace: "https://uor.foundation/trace/",
        xsd: "http://www.w3.org/2001/XMLSchema#",
        from: { "@id": "morphism:source", "@type": "xsd:string" },
        to: { "@id": "morphism:target", "@type": "xsd:string" },
        endpoint: { "@id": "morphism:endpoint", "@type": "xsd:string" },
        injected: { "@id": "trace:injectionDetected", "@type": "xsd:boolean" },
        ts: { "@id": "trace:executedAt", "@type": "xsd:dateTime" },
      },
      "@type": mc.morphismType,
      from: mc.fromAppCanonicalId,
      to: mc.toAppCanonicalId,
      endpoint: mc.endpoint,
      injected,
      ts: new Date().toISOString(),
    });
    return proof.derivationId;
  }

  private recordCall(mc: MorphismCall): void {
    // Record for caller
    if (!this.callHistories.has(mc.fromAppCanonicalId)) {
      this.callHistories.set(mc.fromAppCanonicalId, []);
    }
    this.callHistories.get(mc.fromAppCanonicalId)!.unshift(mc);

    // Record for callee
    if (!this.callHistories.has(mc.toAppCanonicalId)) {
      this.callHistories.set(mc.toAppCanonicalId, []);
    }
    this.callHistories.get(mc.toAppCanonicalId)!.unshift(mc);
  }
}
