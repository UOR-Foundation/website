/**
 * UorModule Base Class Tests — Generic Lifecycle Verification
 *
 * Tests the register→observe→certify→remediate pattern across
 * all four refactored modules: ring-core, morphism, trace, certificate.
 */
import { describe, it, expect } from "vitest";
import { UorModule, type OperationRecord, type ModuleCertificate } from "@/modules/core/uor-module";
import { RingCoreModule } from "@/modules/ring-core/ring-module";
import { MorphismModule } from "@/modules/morphism/morphism-module";
import { TraceModule } from "@/modules/trace/trace-module";
import { CertificateModule } from "@/modules/certificate/certificate-module";

// ── Generic Base Class Tests ────────────────────────────────────────────────

class TestModule extends UorModule<number> {
  verifySelf() { return { verified: true, failures: [] }; }
}

describe("UorModule<T> Base Class", () => {
  it("1. register() initializes to COHERENCE", () => {
    const mod = new TestModule("test", "Test Module");
    const health = mod.register();
    expect(health.zone).toBe("COHERENCE");
    expect(health.hScore).toBe(0);
    expect(health.phi).toBe(1);
    expect(mod.isRegistered).toBe(true);
  });

  it("2. observe() with isometric op stays COHERENCE", () => {
    const mod = new TestModule("test", "Test");
    mod.register();
    const rec = mod.observe("op", 42, 42, 1); // Hamming 0
    expect(rec.hammingDist).toBe(0);
    expect(rec.logosClass).toBe("isometry");
    expect(mod.zone).toBe("COHERENCE");
  });

  it("3. observe() with high-distance op → DRIFT/COLLAPSE", () => {
    const mod = new TestModule("test", "Test");
    mod.register({ low: 2, high: 5 });
    // Repeated high-distance operations
    for (let i = 0; i < 10; i++) {
      mod.observe("op", 0, 255, i); // Hamming 8
    }
    expect(mod.zone).toBe("COLLAPSE");
    expect(mod.hScore).toBeGreaterThan(5);
  });

  it("4. certify() issues certificate with verification", () => {
    const mod = new TestModule("test", "Test");
    mod.register();
    mod.observe("op", 10, 10, 1);
    const cert = mod.certify();
    expect(cert.verified).toBe(true);
    expect(cert.operationCount).toBe(1);
    expect(cert.zone).toBe("COHERENCE");
  });

  it("5. remediate() returns null in COHERENCE", () => {
    const mod = new TestModule("test", "Test");
    mod.register();
    mod.observe("op", 0, 0, 1);
    expect(mod.remediate()).toBeNull();
  });

  it("6. remediate() returns prescription in DRIFT", () => {
    const mod = new TestModule("test", "Test");
    mod.register({ low: 1, high: 5 });
    // Push into DRIFT
    for (let i = 0; i < 5; i++) mod.observe("op", 0, 7, i); // Hamming 3
    expect(mod.zone).toBe("DRIFT");
    const remedy = mod.remediate();
    expect(remedy).not.toBeNull();
    expect(["OIP", "EDP"]).toContain(remedy!.protocol);
  });

  it("7. remediate() returns CAP in COLLAPSE", () => {
    const mod = new TestModule("test", "Test");
    mod.register({ low: 1, high: 3 });
    for (let i = 0; i < 10; i++) mod.observe("op", 0, 255, i);
    expect(mod.zone).toBe("COLLAPSE");
    expect(mod.remediate()!.protocol).toBe("CAP");
    expect(mod.remediate()!.urgency).toBe("critical");
  });

  it("8. health() snapshot is complete", () => {
    const mod = new TestModule("test", "Test");
    mod.register();
    mod.observe("op", 10, 11, 1);
    const h = mod.health();
    expect(h.moduleId).toBe("test");
    expect(h.operationCount).toBe(1);
    expect(typeof h.epsilon).toBe("number");
    expect(typeof h.logosCompliance).toBe("number");
  });

  it("9. auto-registers on first observe if not registered", () => {
    const mod = new TestModule("test", "Test");
    mod.observe("op", 0, 0, 1);
    expect(mod.isRegistered).toBe(true);
    expect(mod.operationCount).toBe(1);
  });

  it("10. history caps at 100 entries", () => {
    const mod = new TestModule("test", "Test");
    mod.register();
    for (let i = 0; i < 120; i++) mod.observe("op", 0, 0, i);
    expect(mod.history.length).toBeLessThanOrEqual(100);
    expect(mod.operationCount).toBe(120);
  });
});

// ── RingCoreModule Tests ────────────────────────────────────────────────────

describe("RingCoreModule (UorModule<ByteTuple>)", () => {
  it("neg() is observed and tracked", () => {
    const ring = new RingCoreModule(0);
    const result = ring.neg([42]);
    expect(result).toBeDefined();
    expect(ring.operationCount).toBe(1);
    expect(ring.zone).toBe("COHERENCE");
  });

  it("certify() runs exhaustive Q0 verification", () => {
    const ring = new RingCoreModule(0);
    ring.neg([1]);
    ring.succ([0]);
    const cert = ring.certify();
    expect(cert.verified).toBe(true);
    expect(cert.failures).toEqual([]);
  });

  it("multiple ops track correctly", () => {
    const ring = new RingCoreModule(0);
    ring.neg([10]);
    ring.bnot([20]);
    ring.succ([30]);
    ring.add([5], [10]);
    expect(ring.operationCount).toBe(4);
    expect(ring.phi).toBeGreaterThan(0);
  });
});

// ── MorphismModule Tests ────────────────────────────────────────────────────

describe("MorphismModule (UorModule<TransformRecord>)", () => {
  it("transform is observed", () => {
    const { UORRing } = require("@/modules/ring-core/ring");
    const morph = new MorphismModule();
    const r0 = new UORRing(0);
    const r1 = new UORRing(1);
    const { targetValue, record } = morph.transform(r0, r1, 42, [
      { label: "embed", operation: "embed", sourceQuantum: 0, targetQuantum: 1 },
    ], "Embedding");
    expect(targetValue).toBe(42);
    expect(record.kind).toBe("Embedding");
    expect(morph.operationCount).toBe(1);
  });
});

// ── TraceModule Tests ───────────────────────────────────────────────────────

describe("TraceModule (UorModule<ComputationTrace>)", () => {
  it("record() creates and observes a trace", () => {
    const trace = new TraceModule();
    const result = trace.record("deriv:1", "neg", [
      { index: 0, operation: "neg", input: 42, output: 214, durationMs: 1 },
    ], 0);
    expect(result.traceId).toContain("trace");
    expect(trace.operationCount).toBe(1);
    expect(trace.traces.length).toBe(1);
  });

  it("certify() passes with valid traces", () => {
    const trace = new TraceModule();
    trace.record("d:1", "neg", [{ index: 0, operation: "neg", input: 1, output: 255, durationMs: 0 }], 0);
    const cert = trace.certify();
    expect(cert.verified).toBe(true);
  });
});

// ── CertificateModule Tests ─────────────────────────────────────────────────

describe("CertificateModule (UorModule<CertEvent>)", () => {
  it("recordEvent() tracks verification success", () => {
    const certs = new CertificateModule();
    const event = certs.recordEvent("cert:abc", "subject:1", true);
    expect(event.verified).toBe(true);
    expect(certs.operationCount).toBe(1);
    // Verified event = isometric (input matches output)
    expect(certs.zone).toBe("COHERENCE");
  });

  it("failed verifications increase H-score", () => {
    const certs = new CertificateModule();
    for (let i = 0; i < 10; i++) {
      certs.recordEvent(`cert:${i}`, `subj:${i}`, false);
    }
    expect(certs.hScore).toBeGreaterThan(0);
  });

  it("certify() detects high failure rate", () => {
    const certs = new CertificateModule();
    for (let i = 0; i < 20; i++) {
      certs.recordEvent(`cert:${i}`, `subj:${i}`, false);
    }
    const cert = certs.certify();
    expect(cert.verified).toBe(false);
    expect(cert.failures.length).toBeGreaterThan(0);
  });
});
