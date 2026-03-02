/**
 * Attention-Driven Compression — Tests
 * ═════════════════════════════════════
 *
 * Verifies that the compression schedule correctly maps
 * aperture → detail levels, and that compressed proofs/traces
 * maintain integrity.
 */

import { describe, it, expect } from "vitest";
import {
  computeCompression,
  compressProofSummary,
  compressTrace,
  shouldShowElement,
  type CompressionSchedule,
} from "@/modules/hologram-ui/engine/attention-compression";

describe("Attention-Driven Compression", () => {
  // ── computeCompression ──────────────────────────────────────────

  it("should return 'expanded' for low aperture (diffuse attention)", () => {
    const c = computeCompression(0.1);
    expect(c.label).toBe("expanded");
    expect(c.proofDetail).toBeGreaterThan(0.7);
    expect(c.traceDetail).toBeGreaterThan(0.7);
    expect(c.autoCollapse).toBe(false);
  });

  it("should return 'balanced' for mid aperture", () => {
    const c = computeCompression(0.4);
    expect(c.label).toBe("balanced");
  });

  it("should return 'compressed' for high aperture", () => {
    const c = computeCompression(0.65);
    expect(c.label).toBe("compressed");
    expect(c.proofDetail).toBeLessThan(0.5);
  });

  it("should return 'minimal' for extreme focus", () => {
    const c = computeCompression(0.9);
    expect(c.label).toBe("minimal");
    expect(c.proofDetail).toBeLessThan(0.15);
    expect(c.traceDetail).toBeLessThan(0.15);
    expect(c.autoCollapse).toBe(true);
    expect(c.responseEmphasis).toBeGreaterThan(1.05);
  });

  it("should clamp aperture to [0, 1]", () => {
    const cLow = computeCompression(-0.5);
    const cHigh = computeCompression(1.5);
    expect(cLow.aperture).toBe(0);
    expect(cHigh.aperture).toBe(1);
  });

  it("trust arc scale should range between 0.5 and 1.0", () => {
    const expanded = computeCompression(0.0);
    const minimal = computeCompression(1.0);
    expect(expanded.trustArcScale).toBeCloseTo(1.0, 1);
    expect(minimal.trustArcScale).toBeCloseTo(0.5, 1);
  });

  it("should be monotonic: more focus → less detail", () => {
    const steps = [0.0, 0.25, 0.5, 0.75, 1.0].map(computeCompression);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].proofDetail).toBeLessThanOrEqual(steps[i - 1].proofDetail + 0.001);
      expect(steps[i].traceDetail).toBeLessThanOrEqual(steps[i - 1].traceDetail + 0.001);
    }
  });

  // ── compressProofSummary ────────────────────────────────────────

  it("should produce a summary with grade and phase", () => {
    const proof = {
      spectralGrade: "A",
      driftDelta0: 0.012,
      triadicPhase: 9 as const,
      fidelity: 0.95,
      eigenvaluesLocked: 4,
      converged: true,
      verified: true,
      zk: true,
    };
    const s = compressProofSummary(proof);
    expect(s.healthy).toBe(true);
    expect(s.indicator).toBe("✦");
    expect(s.summary).toContain("A");
    expect(s.summary).toContain("ZK");
  });

  it("should mark unhealthy proofs correctly", () => {
    const proof = {
      spectralGrade: "D",
      driftDelta0: 5.0,
      triadicPhase: 3 as const,
      fidelity: 0.3,
      eigenvaluesLocked: 0,
      converged: false,
      verified: false,
      zk: false,
    };
    const s = compressProofSummary(proof);
    expect(s.healthy).toBe(false);
    expect(s.indicator).toBe("△");
  });

  // ── compressTrace ───────────────────────────────────────────────

  it("should return full trace at detail = 1.0", () => {
    const trace = ["Step 1", "Step 2", "Step 3", "Step 4"];
    expect(compressTrace(trace, 1.0)).toEqual(trace);
  });

  it("should return single line at detail = 0.0", () => {
    const trace = ["Step 1", "Step 2", "Step 3", "Step 4"];
    const meta = { grade: "A", converged: true, iterations: 3 };
    const result = compressTrace(trace, 0.0, meta);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("Grade A");
    expect(result[0]).toContain("Converged");
  });

  it("should return first + ellipsis + last at medium detail", () => {
    const trace = ["First", "Second", "Third", "Fourth", "Fifth"];
    const result = compressTrace(trace, 0.5);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("First");
    expect(result[1]).toContain("…");
    expect(result[2]).toBe("Fifth");
  });

  // ── shouldShowElement ───────────────────────────────────────────

  it("critical elements should always show", () => {
    const minimal = computeCompression(1.0);
    expect(shouldShowElement("critical", minimal)).toBe(true);
  });

  it("ambient elements should only show when expanded", () => {
    const expanded = computeCompression(0.1);
    const compressed = computeCompression(0.8);
    expect(shouldShowElement("ambient", expanded)).toBe(true);
    expect(shouldShowElement("ambient", compressed)).toBe(false);
  });

  it("medium elements should hide when focused", () => {
    const focused = computeCompression(0.85);
    expect(shouldShowElement("medium", focused)).toBe(false);
  });
});
