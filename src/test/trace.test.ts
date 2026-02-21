/**
 * Tests for the UOR Trace Module (trace: namespace).
 */

import { describe, it, expect } from "vitest";
import { recordTrace, getTrace, getRecentTraces } from "@/modules/trace";
import type { TraceStep } from "@/modules/trace";

describe("trace module", () => {
  const steps: TraceStep[] = [
    { index: 0, operation: "parse", input: "neg(42)", output: "neg(42)", durationMs: 1 },
    { index: 1, operation: "derive", input: "neg(42)", output: 214, durationMs: 2 },
  ];

  it("recordTrace produces valid ComputationTrace with certifiedBy link", async () => {
    const trace = await recordTrace(
      "urn:uor:derivation:test123",
      "uor_derive:neg(42)",
      steps,
      0,
      "urn:uor:cert:self:test123"
    );

    expect(trace["@type"]).toBe("trace:ComputationTrace");
    expect(trace.traceId).toMatch(/^urn:uor:trace:/);
    expect(trace.derivationId).toBe("urn:uor:derivation:test123");
    expect(trace.certifiedBy).toBe("urn:uor:cert:self:test123");
    expect(trace.steps).toHaveLength(2);
    expect(trace.quantum).toBe(0);
  });

  it("auto-generates certifiedBy if not provided", async () => {
    const trace = await recordTrace(
      "urn:uor:derivation:abc",
      "test",
      [],
      0
    );

    expect(trace.certifiedBy).toMatch(/^urn:uor:cert:self:/);
  });

  it("content-addresses trace IDs deterministically", async () => {
    const t1 = await recordTrace("urn:uor:d:1", "op", steps, 0);
    const t2 = await recordTrace("urn:uor:d:1", "op", steps, 0);
    // Same inputs → same trace ID
    expect(t1.traceId).toBe(t2.traceId);
  });
});
