/**
 * Trace — UorModule<ComputationTrace> Implementation
 * ═══════════════════════════════════════════════════
 *
 * The computation trace module using the generic lifecycle base.
 * Every recorded trace is automatically observed for coherence.
 *
 * @module trace/trace-module
 */

import { UorModule } from "@/modules/core/uor-module";
import type { ComputationTrace, TraceStep } from "./trace";

export class TraceModule extends UorModule<ComputationTrace> {
  private _traces: ComputationTrace[] = [];

  constructor() {
    super("trace", "Computation Trace");
    this.register();
  }

  /**
   * Record a trace with automatic lifecycle observation.
   *
   * This is a lightweight in-memory version that doesn't require
   * Supabase or URDNA2015 — suitable for coherence tracking.
   * For full persistence, use the original recordTrace() function.
   */
  record(
    derivationId: string,
    operation: string,
    steps: TraceStep[],
    quantum: number,
  ): ComputationTrace {
    const now = new Date().toISOString();
    const traceId = `urn:uor:trace:local:${this.operationCount}`;

    const trace: ComputationTrace = {
      "@type": "trace:ComputationTrace",
      traceId,
      derivationId,
      operation,
      steps,
      certifiedBy: `urn:uor:cert:self:${this.moduleId}`,
      quantum,
      timestamp: now,
    };

    this._traces.push(trace);
    if (this._traces.length > 100) this._traces = this._traces.slice(-100);

    // Observe: use first step's input/output bytes for coherence
    const inByte = steps.length > 0 ? (hashish(JSON.stringify(steps[0].input)) & 0xff) : 0;
    const outByte = steps.length > 0 ? (hashish(JSON.stringify(steps[steps.length - 1].output)) & 0xff) : 0;
    this.observe(`trace:${operation}`, inByte, outByte, trace);

    return trace;
  }

  get traces(): readonly ComputationTrace[] { return this._traces; }

  protected verifySelf(): { verified: boolean; failures: string[] } {
    const failures: string[] = [];
    // Verify all traces have valid structure
    for (const t of this._traces.slice(-10)) {
      if (!t.traceId || !t.operation) {
        failures.push(`Invalid trace: missing traceId or operation`);
      }
    }
    return { verified: failures.length === 0, failures };
  }
}

/** Simple deterministic hash for observation (not cryptographic). */
function hashish(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
